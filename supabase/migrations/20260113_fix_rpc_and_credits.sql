-- 1. Add missing columns to session_screenshots
ALTER TABLE session_screenshots 
ADD COLUMN IF NOT EXISTS extracted_text TEXT,
ADD COLUMN IF NOT EXISTS code_text TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Update add_session_screenshot RPC signature and logic
CREATE OR REPLACE FUNCTION public.add_session_screenshot(
    p_session_id UUID,
    p_image_url TEXT,
    p_capture_method TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb,
    p_extracted_text TEXT DEFAULT '',
    p_code_text TEXT DEFAULT '',
    p_element_selector TEXT DEFAULT NULL,
    p_width INTEGER DEFAULT NULL,
    p_height INTEGER DEFAULT NULL,
    p_size_bytes INTEGER DEFAULT NULL,
    p_platform_detected TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    screenshot_id UUID,
    display_order INTEGER,
    error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Use owner privileges to bypass strict RLS if needed, but safe here
AS $$
DECLARE
    v_order INTEGER;
    v_id UUID;
BEGIN
    -- Get next order
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_order
    FROM session_screenshots
    WHERE session_id = p_session_id;

    -- Insert
    INSERT INTO session_screenshots (
        session_id,
        image_url,
        capture_method,
        metadata,
        extracted_text,
        code_text,
        element_selector,
        width,
        height,
        size_bytes,
        platform_detected,
        display_order
    ) VALUES (
        p_session_id,
        p_image_url,
        p_capture_method,
        p_metadata,
        p_extracted_text,
        p_code_text,
        p_element_selector,
        p_width,
        p_height,
        p_size_bytes,
        p_platform_detected,
        v_order
    ) RETURNING id INTO v_id;

    RETURN QUERY SELECT true, v_id, v_order, NULL::TEXT;
EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::INTEGER, SQLERRM;
END;
$$;

-- 3. Fix credits_ledger RLS
ALTER TABLE credits_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."credits_ledger";

CREATE POLICY "Enable all access for authenticated users" ON "public"."credits_ledger"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Fix interview_sessions RLS (to prevent FK errors if session wasn't created)
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- Ensure users can insert their own sessions
DROP POLICY IF EXISTS "Enable insert for own sessions" ON "public"."interview_sessions";
CREATE POLICY "Enable insert for own sessions" ON "public"."interview_sessions"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure users can select/update their own sessions
DROP POLICY IF EXISTS "Enable all for own sessions" ON "public"."interview_sessions";
CREATE POLICY "Enable all for own sessions" ON "public"."interview_sessions"
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. Fix sync_messages RLS (Permissive)
ALTER TABLE sync_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable insert for sync_messages" ON "public"."sync_messages";
CREATE POLICY "Enable insert for sync_messages" ON "public"."sync_messages"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);
