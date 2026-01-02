-- ============================================================================
-- PHASE 6: RESULT GENERATION
-- Generated: 2025-12-30
-- ============================================================================
--
-- Adds AI summary generation (mock) to complete_session
-- ============================================================================

-- ============================================================================
-- UPDATE COMPLETE_SESSION - Add Mock AI Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION public.complete_session(
    p_session_id UUID,
    p_score NUMERIC DEFAULT NULL,
    p_summary TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
    v_new_balance INTEGER;
    v_mock_summary TEXT;
    v_mock_score INTEGER;
    v_insights JSONB;
    v_transcript_count INTEGER;
    v_ai_response_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'You must be logged in'
        );
    END IF;

    -- Get session with row lock
    SELECT * INTO v_session
    FROM public.interview_sessions
    WHERE id = p_session_id
    FOR UPDATE;

    IF v_session IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SESSION_NOT_FOUND',
            'message', 'Session not found'
        );
    END IF;

    -- Verify ownership
    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN',
            'message', 'You do not own this session'
        );
    END IF;

    -- Validate current status
    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TRANSITION',
            'message', format('Cannot complete session in %s status', v_session.status)
        );
    END IF;

    -- Validate score if provided
    IF p_score IS NOT NULL AND (p_score < 0 OR p_score > 100) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_SCORE',
            'message', 'Score must be between 0 and 100'
        );
    END IF;

    -- =========================================
    -- GENERATE MOCK AI SUMMARY (Placeholder)
    -- In production, this would call an AI API
    -- =========================================
    v_transcript_count := jsonb_array_length(COALESCE(v_session.transcript, '[]'::jsonb));
    v_ai_response_count := jsonb_array_length(COALESCE(v_session.ai_responses, '[]'::jsonb));
    
    -- Generate mock score based on activity (placeholder logic)
    v_mock_score := COALESCE(
        p_score::integer,
        LEAST(100, GREATEST(50, 60 + (v_transcript_count * 2) + (v_ai_response_count * 3) + (random() * 20)::integer))
    );

    -- Generate mock summary
    v_mock_summary := COALESCE(p_summary, format(
        'Interview session for %s position completed. The candidate demonstrated familiarity with %s concepts. '
        'The session included %s dialogue exchanges and %s AI-assisted responses. '
        'Areas of strength: Technical communication, problem-solving approach. '
        'Areas for improvement: Could elaborate more on implementation details.',
        v_session.role,
        v_session.type,
        v_transcript_count,
        v_ai_response_count
    ));

    -- Generate mock insights
    v_insights := jsonb_build_object(
        'duration_minutes', EXTRACT(EPOCH FROM (NOW() - v_session.started_at)) / 60,
        'transcript_entries', v_transcript_count,
        'ai_assists_used', v_ai_response_count,
        'engagement_score', LEAST(100, 70 + (v_transcript_count * 2)),
        'strengths', jsonb_build_array(
            'Clear communication style',
            'Structured problem-solving approach',
            'Good use of AI assistance'
        ),
        'improvements', jsonb_build_array(
            'Elaborate more on implementation details',
            'Provide concrete examples from experience',
            'Consider edge cases earlier'
        )
    );
    -- =========================================

    -- =========================================
    -- ATOMIC CREDIT DEDUCTION
    -- =========================================
    IF NOT v_session.credit_deducted THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance
        FROM public.credits_ledger
        WHERE user_id = v_user_id
        FOR UPDATE;

        IF v_credit_balance < 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'INSUFFICIENT_CREDITS',
                'message', 'Insufficient credits to complete session'
            );
        END IF;

        v_new_balance := v_credit_balance - 1;

        INSERT INTO public.credits_ledger (
            user_id,
            amount,
            balance_after,
            description,
            reference_type,
            reference_id,
            created_by
        ) VALUES (
            v_user_id,
            -1,
            v_new_balance,
            format('Interview: %s (%s)', v_session.role, v_session.type),
            'session',
            p_session_id,
            v_user_id
        );
    END IF;
    -- =========================================

    -- Update session with results
    UPDATE public.interview_sessions
    SET status = 'completed',
        ended_at = NOW(),
        score = v_mock_score,
        summary = v_mock_summary,
        credit_deducted = true,
        credit_deducted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'completed',
        'ended_at', NOW(),
        'score', v_mock_score,
        'summary', v_mock_summary,
        'insights', v_insights,
        'credit_deducted', true,
        'new_balance', COALESCE(v_new_balance, v_credit_balance - 1)
    );
END;
$$;

COMMENT ON FUNCTION public.complete_session IS 'Completes session with AI summary generation and credit deduction.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
