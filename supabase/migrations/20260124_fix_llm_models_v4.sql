-- ============================================================================
-- FIXED V4: System Repair & Debug
-- 1. DATA REPAIR: Automatically enables any model currently selected in app_config
-- 2. BETTER RPC: Returns debug info if model selection fails
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- 1. DATA REPAIR: Force enable selected models
DO $$
DECLARE
    r RECORD;
    v_model_id TEXT;
    v_count INTEGER;
BEGIN
    v_count := 0;
    -- Iterate over all model configurations
    FOR r IN SELECT * FROM public.app_config WHERE key LIKE '%_model' LOOP
        -- Extract clean text from JSONB
        v_model_id := r.value #>> '{}';
        
        IF v_model_id IS NOT NULL AND v_model_id <> '' THEN
            -- Enable the model
            UPDATE public.llm_models
            SET enabled = true
            WHERE model_id = v_model_id;
            
            GET DIAGNOSTICS v_count = ROW_COUNT;
            RAISE NOTICE 'Enabled model % (Rows updated: %)', v_model_id, v_count;
        END IF;
    END LOOP;
END
$$;


-- 2. UPDATED RPC WITH DEBUG INFO
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
    v_config_json JSONB;
BEGIN
    -- User must be authenticated
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- 1. Get the enabled provider
    -- Added ORDER BY updated_at to prefer recently modified provider if multiple are accidentally enabled
    SELECT * INTO v_provider
    FROM public.llm_providers
    WHERE enabled = true
    ORDER BY updated_at DESC
    LIMIT 1;

    IF v_provider IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_PROVIDER_ENABLED');
    END IF;

    -- 2. Check if a specific model is selected in app_config
    v_config_key := v_provider.slug || '_model';
    
    SELECT value INTO v_config_json
    FROM public.app_config
    WHERE key = v_config_key;
    
    v_selected_model_id := v_config_json #>> '{}';

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
        -- DEBUG: Return info about what provider was attempted
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'NO_MODEL_AVAILABLE',
            'debug', jsonb_build_object(
                'provider_name', v_provider.name,
                'provider_slug', v_provider.slug,
                'attempted_model_id', v_selected_model_id
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
