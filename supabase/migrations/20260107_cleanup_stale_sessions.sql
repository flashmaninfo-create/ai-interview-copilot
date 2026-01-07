-- ============================================================================
-- CLEANUP STALE SESSIONS
-- Generated: 2026-01-07
-- ============================================================================

-- Modify get_user_sessions to passively cleanup stale active sessions
-- This ensures users don't see "Active" sessions that are abandoned.

CREATE OR REPLACE FUNCTION public.get_user_sessions(
    p_status TEXT DEFAULT NULL,
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
    v_sessions JSONB;
    v_total INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'You must be logged in'
        );
    END IF;

    -- ========================================================================
    -- AUTO-CLEANUP STALE SESSIONS
    -- ========================================================================
    -- If a session is 'active' but hasn't had any updates/syncs in > 1 hour, 
    -- mark it as 'failed' (Abandoned).
    -- We use GREATEST to find the last activity time.
    
    UPDATE public.interview_sessions
    SET status = 'failed',
        ended_at = NOW(),
        summary = 'Session abandoned (timeout)',
        updated_at = NOW()
    WHERE user_id = v_user_id
    AND status = 'active'
    AND GREATEST(
        COALESCE(last_sync_at, '-infinity'::timestamptz), 
        COALESCE(updated_at, '-infinity'::timestamptz), 
        COALESCE(started_at, '-infinity'::timestamptz),
        created_at
    ) < NOW() - INTERVAL '5 minutes'; -- Reduced to 5 mins for current testing/responsiveness

    -- ========================================================================
    -- STANDARD FETCH LOGIC
    -- ========================================================================

    -- Validate status if provided
    IF p_status IS NOT NULL AND p_status NOT IN ('created', 'active', 'completed', 'failed', 'cancelled') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_STATUS',
            'message', 'Invalid status filter'
        );
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total
    FROM public.interview_sessions
    WHERE user_id = v_user_id
    AND (p_status IS NULL OR status = p_status);

    -- Get sessions
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', s.id,
            'role', s.role,
            'type', s.type,
            'difficulty', s.difficulty,
            'status', s.status,
            'score', s.score,
            'created_at', s.created_at,
            'started_at', s.started_at,
            'ended_at', s.ended_at
        ) ORDER BY s.created_at DESC
    ), '[]'::jsonb) INTO v_sessions
    FROM (
        SELECT *
        FROM public.interview_sessions
        WHERE user_id = v_user_id
        AND (p_status IS NULL OR status = p_status)
        ORDER BY created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    ) s;

    RETURN jsonb_build_object(
        'success', true,
        'sessions', v_sessions,
        'total', v_total,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;
