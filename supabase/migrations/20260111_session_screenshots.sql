-- Migration: Add session_screenshots table for live coding feature
-- Stores screenshots captured during interview sessions for AI analysis

-- Create session_screenshots table
CREATE TABLE IF NOT EXISTS public.session_screenshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Image data
    image_url TEXT NOT NULL, -- Base64 data URL or storage URL
    thumbnail_url TEXT, -- Compressed thumbnail for gallery
    
    -- Metadata
    capture_method TEXT NOT NULL DEFAULT 'dom', -- 'dom', 'viewport', 'element', 'screen'
    platform_detected TEXT, -- 'leetcode', 'hackerrank', etc.
    element_selector TEXT, -- If captured specific element
    
    -- Ordering and importance
    display_order INTEGER NOT NULL DEFAULT 0,
    is_marked_important BOOLEAN NOT NULL DEFAULT false,
    is_selected_for_ai BOOLEAN NOT NULL DEFAULT true,
    
    -- OCR results (populated by vision preprocessor)
    extracted_text TEXT,
    ocr_status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    ocr_processed_at TIMESTAMPTZ,
    
    -- Dimensions
    width INTEGER,
    height INTEGER,
    size_bytes INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_screenshots_session_id ON public.session_screenshots(session_id);
CREATE INDEX IF NOT EXISTS idx_session_screenshots_user_id ON public.session_screenshots(user_id);
CREATE INDEX IF NOT EXISTS idx_session_screenshots_order ON public.session_screenshots(session_id, display_order);

-- RLS Policies
ALTER TABLE public.session_screenshots ENABLE ROW LEVEL SECURITY;

-- Users can only see their own screenshots
CREATE POLICY "Users can view own screenshots" ON public.session_screenshots
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own screenshots
CREATE POLICY "Users can insert own screenshots" ON public.session_screenshots
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own screenshots (reorder, mark important, etc.)
CREATE POLICY "Users can update own screenshots" ON public.session_screenshots
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own screenshots
CREATE POLICY "Users can delete own screenshots" ON public.session_screenshots
    FOR DELETE USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_screenshot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_screenshot_updated_at ON public.session_screenshots;
CREATE TRIGGER trigger_screenshot_updated_at
    BEFORE UPDATE ON public.session_screenshots
    FOR EACH ROW
    EXECUTE FUNCTION update_screenshot_updated_at();

-- RPC: Add screenshot to session
CREATE OR REPLACE FUNCTION add_session_screenshot(
    p_session_id UUID,
    p_image_url TEXT,
    p_capture_method TEXT DEFAULT 'dom',
    p_platform_detected TEXT DEFAULT NULL,
    p_element_selector TEXT DEFAULT NULL,
    p_width INTEGER DEFAULT NULL,
    p_height INTEGER DEFAULT NULL,
    p_size_bytes INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_max_order INTEGER;
    v_screenshot_id UUID;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Verify session belongs to user
    IF NOT EXISTS (
        SELECT 1 FROM public.interview_sessions 
        WHERE id = p_session_id AND user_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Session not found');
    END IF;
    
    -- Get max order for this session
    SELECT COALESCE(MAX(display_order), -1) + 1 INTO v_max_order
    FROM public.session_screenshots
    WHERE session_id = p_session_id;
    
    -- Insert screenshot
    INSERT INTO public.session_screenshots (
        session_id, user_id, image_url, capture_method,
        platform_detected, element_selector, display_order,
        width, height, size_bytes
    ) VALUES (
        p_session_id, v_user_id, p_image_url, p_capture_method,
        p_platform_detected, p_element_selector, v_max_order,
        p_width, p_height, p_size_bytes
    ) RETURNING id INTO v_screenshot_id;
    
    RETURN json_build_object(
        'success', true,
        'screenshot_id', v_screenshot_id,
        'display_order', v_max_order
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Get screenshots for session
CREATE OR REPLACE FUNCTION get_session_screenshots(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_screenshots JSON;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    SELECT json_agg(row_to_json(s) ORDER BY s.display_order)
    INTO v_screenshots
    FROM (
        SELECT id, image_url, thumbnail_url, capture_method, platform_detected,
               display_order, is_marked_important, is_selected_for_ai,
               extracted_text, ocr_status, width, height, created_at
        FROM public.session_screenshots
        WHERE session_id = p_session_id AND user_id = v_user_id
    ) s;
    
    RETURN json_build_object(
        'success', true,
        'screenshots', COALESCE(v_screenshots, '[]'::json),
        'count', (SELECT COUNT(*) FROM public.session_screenshots WHERE session_id = p_session_id)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Update screenshot metadata (reorder, mark important, select for AI)
CREATE OR REPLACE FUNCTION update_screenshot_metadata(
    p_screenshot_id UUID,
    p_display_order INTEGER DEFAULT NULL,
    p_is_marked_important BOOLEAN DEFAULT NULL,
    p_is_selected_for_ai BOOLEAN DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    UPDATE public.session_screenshots
    SET
        display_order = COALESCE(p_display_order, display_order),
        is_marked_important = COALESCE(p_is_marked_important, is_marked_important),
        is_selected_for_ai = COALESCE(p_is_selected_for_ai, is_selected_for_ai)
    WHERE id = p_screenshot_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Screenshot not found');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Delete screenshot
CREATE OR REPLACE FUNCTION delete_session_screenshot(p_screenshot_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    DELETE FROM public.session_screenshots
    WHERE id = p_screenshot_id AND user_id = v_user_id;
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Screenshot not found');
    END IF;
    
    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Clear all screenshots for a session
CREATE OR REPLACE FUNCTION clear_session_screenshots(p_session_id UUID)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_deleted_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    DELETE FROM public.session_screenshots
    WHERE session_id = p_session_id AND user_id = v_user_id;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN json_build_object('success', true, 'deleted_count', v_deleted_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
