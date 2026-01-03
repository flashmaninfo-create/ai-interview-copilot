-- ============================================================================
-- RPC FUNCTION: Get Active LLM Configuration
-- Run this in your Supabase SQL Editor
-- ============================================================================

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

    -- Get the default model for this provider (or first enabled one)
    SELECT * INTO v_model
    FROM public.llm_models
    WHERE provider_id = v_provider.id
    AND enabled = true
    ORDER BY is_default DESC, name ASC
    LIMIT 1;

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
            'api_base_url', v_provider.api_base_url,
            'config', v_provider.config
        ),
        'model', jsonb_build_object(
            'id', v_model.id,
            'name', v_model.name,
            'model_id', v_model.model_id,
            'max_tokens', v_model.max_tokens,
            'config', v_model.config
        )
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_llm_config TO authenticated;

-- ============================================================================
-- DONE! Now users can call this RPC to get the active LLM configuration.
-- ============================================================================
