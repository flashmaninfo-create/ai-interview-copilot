-- ============================================================================
-- FIXED: Get Active LLM Configuration (Respecting User Selection)
-- This version checks app_config for the selected model before falling back
-- Run this in your Supabase SQL Editor
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_active_llm_config();

CREATE OR REPLACE FUNCTION public.get_active_llm_config()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_provider RECORD;
    v_model RECORD;
    v_selected_model_id TEXT;
    v_config_key TEXT;
BEGIN
    -- User must be authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- 1. Get the enabled provider
    SELECT * INTO v_provider
    FROM public.llm_providers
    WHERE enabled = true
    LIMIT 1;

    IF v_provider IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_PROVIDER_ENABLED');
    END IF;

    -- 2. Check if a specific model is selected in app_config
    -- Key format: "{slug}_model", e.g. "openai_model"
    v_config_key := v_provider.slug || '_model';
    
    SELECT value INTO v_selected_model_id
    FROM public.app_config
    WHERE key = v_config_key;

    -- Remove quotes if jsonb extracted string has them (shouldn't if using text column, but safety check)
    -- If value is like "gpt-4o", it's fine.

    -- 3. Try to get the SELECTED model (must be enabled)
    IF v_selected_model_id IS NOT NULL AND v_selected_model_id <> '' THEN
        SELECT * INTO v_model
        FROM public.llm_models
        WHERE provider_id = v_provider.id
        AND model_id = v_selected_model_id
        AND enabled = true
        LIMIT 1;
    END IF;

    -- 4. Fallback: Get first enabled model if selected one not found/disabled
    IF v_model IS NULL THEN
        SELECT * INTO v_model
        FROM public.llm_models
        WHERE provider_id = v_provider.id
        AND enabled = true
        ORDER BY name ASC
        LIMIT 1;
    END IF;

    IF v_model IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_MODEL_AVAILABLE');
    END IF;

    -- Return the configuration
    RETURN jsonb_build_object(
        'success', true,
        'provider', jsonb_build_object(
            'id', v_provider.id,
            'name', v_provider.name,
            'slug', v_provider.slug,
            'api_key', v_provider.api_key_encrypted,
            'api_base_url', COALESCE(v_provider.api_base_url, ''),
            'config', COALESCE(v_provider.config, '{}'::jsonb)
        ),
        'model', jsonb_build_object(
            'id', v_model.id,
            'name', v_model.name,
            'model_id', v_model.model_id,
            'max_tokens', 1000, -- Default or fetch if column exists
            'config', '{}'::jsonb
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_llm_config TO authenticated;
