-- ============================================================================
-- FIX: complete_session function - FOR UPDATE error with aggregate
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Drop and recreate the function with fixed credit deduction logic
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
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

    -- Lock the session row for update
    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
    IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND'); END IF;
    IF v_session.user_id != v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN'); END IF;
    IF v_session.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION'); END IF;

    -- Generate mock results
    v_transcript_count := jsonb_array_length(COALESCE(v_session.transcript, '[]'::jsonb));
    v_ai_response_count := jsonb_array_length(COALESCE(v_session.ai_responses, '[]'::jsonb));
    v_mock_score := COALESCE(p_score::integer, LEAST(100, GREATEST(50, 60 + (v_transcript_count * 2) + (v_ai_response_count * 3) + (random() * 20)::integer)));
    v_mock_summary := COALESCE(p_summary, format('Interview session for %s position completed. %s dialogue exchanges and %s AI-assisted responses.', v_session.role, v_transcript_count, v_ai_response_count));

    -- Deduct credit atomically (FIXED: removed FOR UPDATE from aggregate query)
    IF NOT v_session.credit_deducted THEN
        -- Get balance without FOR UPDATE (aggregate queries don't support it)
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
        IF v_credit_balance < 1 THEN RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS'); END IF;
        v_new_balance := v_credit_balance - 1;
        INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type, reference_id, created_by)
        VALUES (v_user_id, -1, v_new_balance, format('Interview: %s (%s)', v_session.role, v_session.type), 'session', p_session_id, v_user_id);
    ELSE
        -- Already deducted, just get current balance for response
        SELECT COALESCE(SUM(amount), 0) INTO v_new_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    END IF;

    UPDATE public.interview_sessions
    SET status = 'completed', ended_at = NOW(), score = v_mock_score, summary = v_mock_summary, credit_deducted = true, credit_deducted_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'status', 'completed', 'score', v_mock_score, 'summary', v_mock_summary, 'new_balance', v_new_balance);
END;
$$;

-- ============================================================================
-- ALSO RUN: Add more credits to your account (replace YOUR_USER_ID)
-- ============================================================================
-- To find your user ID, run: SELECT id, email FROM profiles;
-- Then run: SELECT * FROM admin_adjust_credits('YOUR_USER_ID', 10, 'Test credits');
-- Or use the admin panel to add credits.
-- ============================================================================
