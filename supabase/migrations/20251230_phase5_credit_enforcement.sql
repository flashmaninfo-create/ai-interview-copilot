-- ============================================================================
-- PHASE 5: CREDIT ENFORCEMENT
-- Generated: 2025-12-30
-- ============================================================================
--
-- CRITICAL: All credit operations are server-side enforced.
-- Frontend checks are NOT trusted.
--
-- Key changes:
-- 1. create_session now validates credit balance
-- 2. complete_session now deducts 1 credit atomically
-- 3. Failed/cancelled sessions do NOT deduct credits
-- 4. Admin credit adjustment APIs
-- ============================================================================

-- ============================================================================
-- 1. UPDATE CREATE_SESSION - Add Credit Check
-- ============================================================================
-- Block session creation if user has 0 credits

CREATE OR REPLACE FUNCTION public.create_session(
    p_role TEXT,
    p_type TEXT,
    p_difficulty TEXT DEFAULT 'medium'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session_id UUID;
    v_session JSONB;
    v_active_count INTEGER;
    v_max_concurrent INTEGER;
    v_credit_balance INTEGER;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'You must be logged in to create a session'
        );
    END IF;

    -- =========================================
    -- CREDIT CHECK - Server-side enforcement
    -- =========================================
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance
    FROM public.credits_ledger
    WHERE user_id = v_user_id;

    IF v_credit_balance < 1 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_CREDITS',
            'message', 'You need at least 1 credit to start an interview. Please purchase more credits.',
            'balance', v_credit_balance
        );
    END IF;
    -- =========================================

    -- Validate type
    IF p_type NOT IN ('technical', 'behavioral', 'mixed') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TYPE',
            'message', 'Session type must be technical, behavioral, or mixed'
        );
    END IF;

    -- Validate difficulty
    IF p_difficulty NOT IN ('easy', 'medium', 'hard') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_DIFFICULTY',
            'message', 'Difficulty must be easy, medium, or hard'
        );
    END IF;

    -- Check for concurrent session limit
    SELECT COALESCE((value::text)::integer, 1) INTO v_max_concurrent
    FROM public.app_config
    WHERE key = 'max_concurrent_sessions';
    
    v_max_concurrent := COALESCE(v_max_concurrent, 1);

    SELECT COUNT(*) INTO v_active_count
    FROM public.interview_sessions
    WHERE user_id = v_user_id
    AND status IN ('created', 'active');

    IF v_active_count >= v_max_concurrent THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'MAX_SESSIONS_REACHED',
            'message', format('You can only have %s active session(s) at a time', v_max_concurrent)
        );
    END IF;

    -- Create the session (credit NOT deducted yet - only on completion)
    INSERT INTO public.interview_sessions (
        user_id,
        role,
        type,
        difficulty,
        status,
        transcript,
        questions,
        ai_responses,
        credit_deducted
    ) VALUES (
        v_user_id,
        p_role,
        p_type,
        p_difficulty,
        'created',
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb,
        false  -- Credit not yet deducted
    )
    RETURNING id INTO v_session_id;

    -- Fetch the created session
    SELECT jsonb_build_object(
        'id', id,
        'user_id', user_id,
        'role', role,
        'type', type,
        'difficulty', difficulty,
        'status', status,
        'created_at', created_at,
        'started_at', started_at,
        'ended_at', ended_at,
        'credit_balance', v_credit_balance
    ) INTO v_session
    FROM public.interview_sessions
    WHERE id = v_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session', v_session
    );
END;
$$;

COMMENT ON FUNCTION public.create_session IS 'Creates session with credit validation. Requires >= 1 credit.';

-- ============================================================================
-- 2. UPDATE COMPLETE_SESSION - Atomic Credit Deduction
-- ============================================================================
-- Deducts EXACTLY 1 credit ONLY on successful completion
-- Uses row locking to prevent race conditions

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
    FOR UPDATE;  -- Lock the row

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
    -- ATOMIC CREDIT DEDUCTION
    -- Only deduct if not already deducted
    -- =========================================
    IF NOT v_session.credit_deducted THEN
        -- Lock credit rows for this user
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance
        FROM public.credits_ledger
        WHERE user_id = v_user_id
        FOR UPDATE;

        -- Safety check (should have been validated at session creation)
        IF v_credit_balance < 1 THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'INSUFFICIENT_CREDITS',
                'message', 'Insufficient credits to complete session'
            );
        END IF;

        v_new_balance := v_credit_balance - 1;

        -- Insert deduction record
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
            -1,  -- Deduct exactly 1 credit
            v_new_balance,
            format('Interview: %s (%s)', v_session.role, v_session.type),
            'session',
            p_session_id,
            v_user_id
        );
    END IF;
    -- =========================================

    -- Update session status
    UPDATE public.interview_sessions
    SET status = 'completed',
        ended_at = NOW(),
        score = COALESCE(p_score, score),
        summary = COALESCE(p_summary, summary),
        credit_deducted = true,
        credit_deducted_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'completed',
        'ended_at', NOW(),
        'credit_deducted', true,
        'new_balance', COALESCE(v_new_balance, v_credit_balance - 1)
    );
END;
$$;

COMMENT ON FUNCTION public.complete_session IS 'Completes session and deducts 1 credit atomically.';

-- ============================================================================
-- 3. GET CREDIT BALANCE
-- ============================================================================
-- Returns current credit balance for authenticated user

CREATE OR REPLACE FUNCTION public.get_my_credit_balance()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_balance INTEGER;
    v_last_transaction TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED'
        );
    END IF;

    SELECT 
        COALESCE(SUM(amount), 0),
        MAX(created_at)
    INTO v_balance, v_last_transaction
    FROM public.credits_ledger
    WHERE user_id = v_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'balance', v_balance,
        'last_transaction_at', v_last_transaction
    );
END;
$$;

COMMENT ON FUNCTION public.get_my_credit_balance IS 'Returns credit balance for authenticated user';

-- ============================================================================
-- 4. GET CREDIT HISTORY
-- ============================================================================
-- Returns paginated credit transaction history

CREATE OR REPLACE FUNCTION public.get_my_credit_history(
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_history JSONB;
    v_total INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED'
        );
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM public.credits_ledger
    WHERE user_id = v_user_id;

    -- Get paginated history
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', cl.id,
            'amount', cl.amount,
            'balance_after', cl.balance_after,
            'description', cl.description,
            'reference_type', cl.reference_type,
            'reference_id', cl.reference_id,
            'created_at', cl.created_at
        ) ORDER BY cl.created_at DESC
    ), '[]'::jsonb) INTO v_history
    FROM (
        SELECT *
        FROM public.credits_ledger
        WHERE user_id = v_user_id
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) cl;

    RETURN jsonb_build_object(
        'success', true,
        'history', v_history,
        'total', v_total,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;

COMMENT ON FUNCTION public.get_my_credit_history IS 'Returns paginated credit history for authenticated user';

-- ============================================================================
-- 5. ADMIN: GET USER CREDITS
-- ============================================================================
-- Admin can view any user's credit balance

CREATE OR REPLACE FUNCTION public.admin_get_user_credits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_balance INTEGER;
    v_user_email TEXT;
BEGIN
    -- Check if caller is admin
    SELECT role = 'admin' INTO v_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN',
            'message', 'Admin access required'
        );
    END IF;

    -- Get user info and balance
    SELECT 
        p.email,
        COALESCE(SUM(cl.amount), 0)
    INTO v_user_email, v_balance
    FROM public.profiles p
    LEFT JOIN public.credits_ledger cl ON cl.user_id = p.id
    WHERE p.id = p_user_id
    GROUP BY p.email;

    IF v_user_email IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'email', v_user_email,
        'balance', v_balance
    );
END;
$$;

COMMENT ON FUNCTION public.admin_get_user_credits IS 'Admin: Get any user credit balance';

-- ============================================================================
-- 6. ADMIN: ADJUST USER CREDITS
-- ============================================================================
-- Admin can add or remove credits from any user

CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_is_admin BOOLEAN;
    v_admin_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    v_admin_id := auth.uid();

    -- Check if caller is admin
    SELECT role = 'admin' INTO v_is_admin
    FROM public.profiles
    WHERE id = v_admin_id;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN',
            'message', 'Admin access required'
        );
    END IF;

    -- Validate amount
    IF p_amount = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_AMOUNT',
            'message', 'Amount cannot be zero'
        );
    END IF;

    -- Check user exists
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'USER_NOT_FOUND'
        );
    END IF;

    -- Get current balance
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger
    WHERE user_id = p_user_id;

    v_new_balance := v_current_balance + p_amount;

    -- Prevent negative balance
    IF v_new_balance < 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BALANCE',
            'message', format('Cannot deduct %s credits. Current balance: %s', -p_amount, v_current_balance)
        );
    END IF;

    -- Insert adjustment record
    INSERT INTO public.credits_ledger (
        user_id,
        amount,
        balance_after,
        description,
        reference_type,
        created_by
    ) VALUES (
        p_user_id,
        p_amount,
        v_new_balance,
        p_description,
        'admin',
        v_admin_id
    );

    -- Log to audit
    INSERT INTO public.audit_log (
        actor_id,
        action,
        entity_type,
        entity_id,
        old_value,
        new_value
    ) VALUES (
        v_admin_id,
        'CREDIT_ADJUSTMENT',
        'user',
        p_user_id,
        jsonb_build_object('balance', v_current_balance),
        jsonb_build_object('balance', v_new_balance, 'adjustment', p_amount, 'description', p_description)
    );

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'adjustment', p_amount,
        'new_balance', v_new_balance,
        'description', p_description
    );
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_credits IS 'Admin: Adjust user credits (positive or negative)';

-- ============================================================================
-- 7. CHECK CREDIT BEFORE SESSION START
-- ============================================================================
-- Validates credit before starting (extra safety)

CREATE OR REPLACE FUNCTION public.start_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'You must be logged in'
        );
    END IF;

    -- Get session
    SELECT * INTO v_session
    FROM public.interview_sessions
    WHERE id = p_session_id;

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
    IF v_session.status != 'created' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TRANSITION',
            'message', format('Cannot start session in %s status', v_session.status)
        );
    END IF;

    -- =========================================
    -- CREDIT CHECK - Extra safety on start
    -- =========================================
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance
    FROM public.credits_ledger
    WHERE user_id = v_user_id;

    IF v_credit_balance < 1 THEN
        -- Cancel the session since user no longer has credits
        UPDATE public.interview_sessions
        SET status = 'cancelled',
            summary = 'Cancelled: Insufficient credits',
            updated_at = NOW()
        WHERE id = p_session_id;

        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_CREDITS',
            'message', 'Your credit balance is 0. Please purchase credits to continue.',
            'balance', 0
        );
    END IF;
    -- =========================================

    -- Update status
    UPDATE public.interview_sessions
    SET status = 'active',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'active',
        'started_at', NOW(),
        'credit_balance', v_credit_balance
    );
END;
$$;

COMMENT ON FUNCTION public.start_session IS 'Starts session with credit validation';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.get_my_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_credit_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_user_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
