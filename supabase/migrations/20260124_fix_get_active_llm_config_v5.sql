-- ============================================================================
-- FIX V5: Respect custom model selection and improve debug output
-- - Honors {provider}_custom_model from app_config (works even if not in llm_models)
-- - Falls back to selected dropdown model, then first enabled model
-- - Returns detailed debug info when no model is available
-- Run this in Supabase SQL editor or via migrations
-- ============================================================================

-- Optional safety: enable any model explicitly selected in app_config (dropdown)
DO $$
DECLARE
    r RECORD;
    v_model_id TEXT;
BEGIN
    FOR r IN SELECT * FROM public.app_config WHERE key LIKE '%_model' LOOP
        v_model_id := r.value #>> '{}';
        IF v_model_id IS NOT NULL AND v_model_id <> '' THEN
            UPDATE public.llm_models
            SET enabled = true
            WHERE model_id = v_model_id;
        END IF;
    END LOOP;
END$$;

-- Replace function
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
    v_custom_model_id TEXT;
    v_config_key TEXT;
    v_custom_key TEXT;
    v_app_config_value JSONB;
    v_custom_config JSONB;
BEGIN
    -- Require authenticated user
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- Pick the most recently updated enabled provider
    SELECT * INTO v_provider
    FROM public.llm_providers
    WHERE enabled = true
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;

    IF v_provider IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_PROVIDER_ENABLED');
    END IF;

    -- Read saved selections
    v_config_key := v_provider.slug || '_model';
    v_custom_key := v_provider.slug || '_custom_model';

    -- Selected dropdown model
    SELECT value INTO v_app_config_value
    FROM public.app_config
    WHERE key = v_config_key;
    v_selected_model_id := v_app_config_value #>> '{}';

    -- Custom free-form model (takes precedence)
    SELECT value INTO v_custom_config
    FROM public.app_config
    WHERE key = v_custom_key;
    v_custom_model_id := v_custom_config #>> '{}';

    -- 1) If custom model provided, honor it even if not in llm_models
    IF v_custom_model_id IS NOT NULL AND v_custom_model_id <> '' THEN
        -- Try to fetch an existing row (enabled or not) for metadata; otherwise synthesize
        SELECT * INTO v_model
        FROM public.llm_models
        WHERE provider_id = v_provider.id
          AND model_id = v_custom_model_id
        LIMIT 1;

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
                'id', COALESCE(v_model.id, 'custom-' || v_provider.slug),
                'name', COALESCE(v_model.name, 'Custom: ' || v_custom_model_id),
                'model_id', v_custom_model_id,
                'max_tokens', COALESCE(v_model.max_tokens, 100000),
                'config', COALESCE(v_model.config, '{}'::jsonb)
            )
        );
    END IF;

    -- 2) Try the specifically selected dropdown model (must be enabled)
    IF v_selected_model_id IS NOT NULL AND v_selected_model_id <> '' THEN
        SELECT * INTO v_model
        FROM public.llm_models
        WHERE provider_id = v_provider.id
          AND model_id = v_selected_model_id
          AND enabled = true
        LIMIT 1;
    END IF;

    -- 3) Fallback to first enabled model
    IF v_model IS NULL THEN
        SELECT * INTO v_model
        FROM public.llm_models
        WHERE provider_id = v_provider.id
          AND enabled = true
        ORDER BY name ASC
        LIMIT 1;
    END IF;

    IF v_model IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'NO_MODEL_AVAILABLE',
            'debug', jsonb_build_object(
                'provider_name', v_provider.name,
                'provider_slug', v_provider.slug,
                'attempted_model_id', v_selected_model_id,
                'custom_model_id', v_custom_model_id,
                'lookup_key', v_config_key,
                'custom_key', v_custom_key
            )
        );
    END IF;

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
            'max_tokens', COALESCE(v_model.max_tokens, 100000),
            'config', COALESCE(v_model.config, '{}'::jsonb)
        )
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_active_llm_config TO authenticated;
