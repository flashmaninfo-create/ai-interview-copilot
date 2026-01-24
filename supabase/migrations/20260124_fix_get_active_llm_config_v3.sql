-- ============================================================================
-- FIXED V3: Get Active LLM Configuration (Robust JSON & Debugging)
-- This version correctly handles JSONB string values by unquoting them
-- AND returns detailed debug info if no model is found.
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
    v_app_config_value JSONB;
    v_raw_value TEXT;
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
    v_config_key := v_provider.slug || '_model';
    
    -- Robustly fetch and parse the config value
    -- We assume app_config table exists and has key/value columns where value is JSONB
    BEGIN
        SELECT value INTO v_app_config_value
        FROM public.app_config
        WHERE key = v_config_key;
        
        -- Extract text explicitly using #>> operator which unquotes JSON strings
        -- If v_app_config_value is "gpt-4o" (jsonb string), this returns gpt-4o (text)
        v_selected_model_id := v_app_config_value #>> '{}';
        v_raw_value := v_app_config_value::text;
    EXCEPTION WHEN OTHERS THEN
        -- If table doesn't exist or other error, ignore and fall back
        v_selected_model_id := NULL;
        v_raw_value := 'Error accessing app_config';
    END;

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
        -- Return helpful debug info so the UI can tell the user what's wrong
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'NO_MODEL_AVAILABLE',
            'debug', jsonb_build_object(
                'provider_name', v_provider.name,
                'provider_slug', v_provider.slug,
                'lookup_key', v_config_key,
                'attempted_model_id', v_selected_model_id,
                'raw_config_value', v_raw_value
            )
        );
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
            'max_tokens', 1000,
            'config', '{}'::jsonb
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_llm_config TO authenticated;
