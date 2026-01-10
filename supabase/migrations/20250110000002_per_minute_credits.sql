-- ============================================================================
-- Change credit deduction from per-session to per-minute
-- 1 credit = 1 minute spent in meeting
-- Credits deducted on BOTH disconnect (pause) and finish (complete)
-- ============================================================================

-- Update pause_session to deduct credits based on minutes used
DROP FUNCTION IF EXISTS public.pause_session(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.pause_session(
    p_session_id UUID,
    p_state JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
    v_new_balance INTEGER;
    v_minutes_used INTEGER;
    v_elapsed_seconds INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN 
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); 
    END IF;

    -- Get and lock the session
    SELECT * INTO v_session 
    FROM public.interview_sessions 
    WHERE id = p_session_id FOR UPDATE;
    
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;
    
    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    END IF;
    
    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
    END IF;

    -- Calculate minutes used (round up to nearest minute, minimum 1)
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_session.started_at, NOW())))::INTEGER;
    v_minutes_used := GREATEST(1, CEIL(v_elapsed_seconds / 60.0)::INTEGER);

    -- Deduct credits based on minutes used (1 credit per minute)
    IF NOT COALESCE(v_session.credit_deducted, false) THEN
        -- Get balance
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance 
        FROM public.credits_ledger WHERE user_id = v_user_id;
        
        -- Check if user has enough credits
        IF v_credit_balance < 1 THEN 
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS'); 
        END IF;
        
        -- Deduct based on minutes used (cap at available balance)
        v_minutes_used := LEAST(v_minutes_used, v_credit_balance);
        v_new_balance := v_credit_balance - v_minutes_used;
        
        INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type, reference_id, created_by)
        VALUES (v_user_id, -v_minutes_used, v_new_balance, 
                format('Interview: %s (%s) - %s min (paused)', v_session.role, v_session.type, v_minutes_used), 
                'session', p_session_id, v_user_id);
        
        -- Mark credit as deducted
        UPDATE public.interview_sessions
        SET 
            status = 'paused', 
            paused_at = NOW(),
            paused_state = p_state,
            credit_deducted = true,
            credit_deducted_at = NOW(),
            updated_at = NOW()
        WHERE id = p_session_id;
    ELSE
        -- Already deducted, just pause
        SELECT COALESCE(SUM(amount), 0) INTO v_new_balance 
        FROM public.credits_ledger WHERE user_id = v_user_id;
        
        UPDATE public.interview_sessions
        SET 
            status = 'paused', 
            paused_at = NOW(),
            paused_state = p_state,
            updated_at = NOW()
        WHERE id = p_session_id;
    END IF;
    
    RETURN jsonb_build_object(
        'success', true,
        'credits_deducted', v_minutes_used,
        'new_balance', v_new_balance,
        'minutes_used', v_minutes_used
    );
END;
$$;

-- Update complete_session to calculate minutes and deduct accordingly
CREATE OR REPLACE FUNCTION public.complete_session(
    p_session_id UUID,
    p_score NUMERIC DEFAULT NULL,
    p_summary TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
    v_new_balance INTEGER;
    v_mock_summary TEXT;
    v_mock_score INTEGER;
    v_transcript_count INTEGER;
    v_ai_response_count INTEGER;
    v_minutes_used INTEGER;
    v_elapsed_seconds INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

    -- Lock the session row for update
    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
    IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND'); END IF;
    IF v_session.user_id != v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN'); END IF;
    IF v_session.status NOT IN ('active', 'paused') THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION'); END IF;

    -- Calculate minutes used (round up to nearest minute, minimum 1)
    v_elapsed_seconds := EXTRACT(EPOCH FROM (NOW() - COALESCE(v_session.started_at, NOW())))::INTEGER;
    v_minutes_used := GREATEST(1, CEIL(v_elapsed_seconds / 60.0)::INTEGER);

    -- Generate mock results
    v_transcript_count := jsonb_array_length(COALESCE(v_session.transcript, '[]'::jsonb));
    v_ai_response_count := jsonb_array_length(COALESCE(v_session.ai_responses, '[]'::jsonb));
    v_mock_score := COALESCE(p_score::integer, LEAST(100, GREATEST(50, 60 + (v_transcript_count * 2) + (v_ai_response_count * 3) + (random() * 20)::integer)));
    v_mock_summary := COALESCE(p_summary, format('Interview session for %s position completed. %s dialogue exchanges and %s AI-assisted responses. Duration: %s minutes.', v_session.role, v_transcript_count, v_ai_response_count, v_minutes_used));

    -- Deduct credits based on minutes used (1 credit per minute)
    IF NOT COALESCE(v_session.credit_deducted, false) THEN
        -- Get balance
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
        
        -- Check if user has enough credits for at least 1 minute
        IF v_credit_balance < 1 THEN 
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS'); 
        END IF;
        
        -- Deduct based on minutes used (cap at available balance to avoid negative)
        v_minutes_used := LEAST(v_minutes_used, v_credit_balance);
        v_new_balance := v_credit_balance - v_minutes_used;
        
        INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type, reference_id, created_by)
        VALUES (v_user_id, -v_minutes_used, v_new_balance, 
                format('Interview: %s (%s) - %s min', v_session.role, v_session.type, v_minutes_used), 
                'session', p_session_id, v_user_id);
    ELSE
        -- Already deducted (e.g., resumed from paused), just get current balance
        SELECT COALESCE(SUM(amount), 0) INTO v_new_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    END IF;

    UPDATE public.interview_sessions
    SET status = 'completed', ended_at = NOW(), score = v_mock_score, summary = v_mock_summary, credit_deducted = true, credit_deducted_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true, 
        'session_id', p_session_id, 
        'status', 'completed', 
        'score', v_mock_score, 
        'summary', v_mock_summary, 
        'new_balance', v_new_balance,
        'credits_deducted', v_minutes_used,
        'minutes_used', v_minutes_used
    );
END;
$$;

COMMENT ON FUNCTION public.pause_session IS 'Pauses session and deducts 1 credit per minute used.';
COMMENT ON FUNCTION public.complete_session IS 'Completes session and deducts 1 credit per minute used.';
