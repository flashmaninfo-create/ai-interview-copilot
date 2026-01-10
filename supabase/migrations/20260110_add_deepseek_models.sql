-- ============================================================================
-- ADD DEEPSEEK MODELS
-- Purpose: Fix "NO_MODEL_AVAILABLE" error by seeding DeepSeek models
-- ============================================================================

DO $$
DECLARE
    v_deepseek_id UUID;
BEGIN
    -- 1. Ensure DeepSeek provider exists (if user added via UI, strict slug match might vary, so we check or insert)
    -- The Admin UI uses slug='deepseek'
    
    SELECT id INTO v_deepseek_id FROM public.llm_providers WHERE slug = 'deepseek';
    
    -- If not found (user hasn't saved it yet?), insert it disabled
    IF v_deepseek_id IS NULL THEN
        INSERT INTO public.llm_providers (name, slug, enabled, config)
        VALUES ('DeepSeek', 'deepseek', false, '{}'::jsonb)
        RETURNING id INTO v_deepseek_id;
    END IF;

    -- 2. Insert Models
    -- DeepSeek Chat (V3)
    INSERT INTO public.llm_models (
        provider_id, 
        name, 
        model_id, 
        enabled, 
        is_default, 
        cost_per_1k_input_tokens, 
        cost_per_1k_output_tokens, 
        max_tokens
    ) VALUES (
        v_deepseek_id,
        'DeepSeek Chat',
        'deepseek-chat',
        true, -- Enable by default so RPC picks it up
        true,
        0.0005, -- Approx pricing
        0.0015,
        32000
    )
    ON CONFLICT (provider_id, model_id) DO UPDATE SET
        enabled = true; -- Ensure it's enabled if it already exists
        
    -- DeepSeek Reasoner (R1)
    INSERT INTO public.llm_models (
        provider_id, 
        name, 
        model_id, 
        enabled, 
        is_default, 
        cost_per_1k_input_tokens, 
        cost_per_1k_output_tokens, 
        max_tokens
    ) VALUES (
        v_deepseek_id,
        'DeepSeek Reasoner',
        'deepseek-reasoner',
        true,
        false,
        0.0005,
        0.0015,
        32000
    )
    ON CONFLICT (provider_id, model_id) DO UPDATE SET
        enabled = true;

END;
$$;
