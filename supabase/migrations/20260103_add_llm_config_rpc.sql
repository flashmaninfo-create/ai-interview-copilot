-- ============================================================================
-- FIXED: Get Active LLM Configuration
-- This version matches the actual database schema
-- Run this in your Supabase SQL Editor to replace the buggy version
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
BEGIN
    -- User must be authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- Get the enabled provider
    SELECT * INTO v_provider
    FROM public.llm_providers
    WHERE enabled = true
    LIMIT 1;

    IF v_provider IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_PROVIDER_ENABLED');
    END IF;

    -- Get the first enabled model for this provider
    -- NOTE: Using only columns that actually exist in the table
    SELECT * INTO v_model
    FROM public.llm_models
    WHERE provider_id = v_provider.id
    AND enabled = true
    ORDER BY name ASC
    LIMIT 1;

    IF v_model IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_MODEL_AVAILABLE');
    END IF;

    -- Return the configuration (only using columns that exist)
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_llm_config TO authenticated;

-- ============================================================================
-- DONE! Run this to fix the NO_MODEL_AVAILABLE error
-- ============================================================================
