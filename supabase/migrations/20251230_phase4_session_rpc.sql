-- ============================================================================
-- PHASE 4: SESSION LIFECYCLE RPC FUNCTIONS
-- Generated: 2025-12-30
-- ============================================================================
--
-- Provides server-controlled session state transitions:
-- - create_session: Creates new session (status = 'created')
-- - start_session: Transitions created → active
-- - complete_session: Transitions active → completed
-- - fail_session: Transitions created|active → failed
-- - cancel_session: Transitions created|active → cancelled
--
-- All transitions are server-controlled to prevent client manipulation.
-- Credit deduction is NOT handled here (Phase 5).
-- ============================================================================

-- ============================================================================
-- 1. CREATE SESSION
-- ============================================================================
-- Creates a new interview session for the authenticated user
-- Returns the created session or error

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

    -- Create the session
    INSERT INTO public.interview_sessions (
        user_id,
        role,
        type,
        difficulty,
        status,
        transcript,
        questions,
        ai_responses
    ) VALUES (
        v_user_id,
        p_role,
        p_type,
        p_difficulty,
        'created',
        '[]'::jsonb,
        '[]'::jsonb,
        '[]'::jsonb
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
        'ended_at', ended_at
    ) INTO v_session
    FROM public.interview_sessions
    WHERE id = v_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session', v_session
    );
END;
$$;

COMMENT ON FUNCTION public.create_session IS 'Creates a new interview session. Returns session object or error.';

-- ============================================================================
-- 2. START SESSION
-- ============================================================================
-- Transitions session from 'created' to 'active'
-- Sets started_at timestamp

CREATE OR REPLACE FUNCTION public.start_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
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

    -- Update status (trigger will set started_at)
    UPDATE public.interview_sessions
    SET status = 'active',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'active',
        'started_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION public.start_session IS 'Starts a session (created → active)';

-- ============================================================================
-- 3. COMPLETE SESSION
-- ============================================================================
-- Transitions session from 'active' to 'completed'
-- Sets ended_at timestamp
-- Does NOT deduct credits (Phase 5)

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

    -- Update status
    UPDATE public.interview_sessions
    SET status = 'completed',
        ended_at = NOW(),
        score = COALESCE(p_score, score),
        summary = COALESCE(p_summary, summary),
        updated_at = NOW()
    WHERE id = p_session_id;

    -- NOTE: Credit deduction will be added in Phase 5

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'completed',
        'ended_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION public.complete_session IS 'Completes a session (active → completed). Credit deduction in Phase 5.';

-- ============================================================================
-- 4. FAIL SESSION
-- ============================================================================
-- Transitions session from 'created' or 'active' to 'failed'
-- Used for error cases, timeouts, client disconnects

CREATE OR REPLACE FUNCTION public.fail_session(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
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

    -- Validate current status (can fail from created or active)
    IF v_session.status NOT IN ('created', 'active') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TRANSITION',
            'message', format('Cannot fail session in %s status', v_session.status)
        );
    END IF;

    -- Update status
    UPDATE public.interview_sessions
    SET status = 'failed',
        ended_at = NOW(),
        summary = COALESCE(p_reason, 'Session failed'),
        updated_at = NOW()
    WHERE id = p_session_id;

    -- Log the failure event
    INSERT INTO public.session_events (
        session_id,
        event_type,
        content,
        metadata
    ) VALUES (
        p_session_id,
        'error',
        COALESCE(p_reason, 'Session failed'),
        jsonb_build_object('previous_status', v_session.status)
    );

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'failed',
        'reason', COALESCE(p_reason, 'Session failed')
    );
END;
$$;

COMMENT ON FUNCTION public.fail_session IS 'Fails a session (created|active → failed)';

-- ============================================================================
-- 5. CANCEL SESSION
-- ============================================================================
-- Transitions session from 'created' or 'active' to 'cancelled'
-- User-initiated cancellation

CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
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
    IF v_session.status NOT IN ('created', 'active') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INVALID_TRANSITION',
            'message', format('Cannot cancel session in %s status', v_session.status)
        );
    END IF;

    -- Update status
    UPDATE public.interview_sessions
    SET status = 'cancelled',
        ended_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'status', 'cancelled'
    );
END;
$$;

COMMENT ON FUNCTION public.cancel_session IS 'Cancels a session (created|active → cancelled)';

-- ============================================================================
-- 6. GET SESSION (with ownership check)
-- ============================================================================
-- Fetches session details with ownership verification

CREATE OR REPLACE FUNCTION public.get_session(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_is_admin BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED',
            'message', 'You must be logged in'
        );
    END IF;

    -- Check if admin
    SELECT role = 'admin' INTO v_is_admin
    FROM public.profiles
    WHERE id = v_user_id;

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

    -- Verify ownership (admins can view any)
    IF v_session.user_id != v_user_id AND NOT v_is_admin THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'FORBIDDEN',
            'message', 'You do not own this session'
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'session', jsonb_build_object(
            'id', v_session.id,
            'user_id', v_session.user_id,
            'role', v_session.role,
            'type', v_session.type,
            'difficulty', v_session.difficulty,
            'status', v_session.status,
            'score', v_session.score,
            'summary', v_session.summary,
            'transcript', v_session.transcript,
            'questions', v_session.questions,
            'ai_responses', v_session.ai_responses,
            'created_at', v_session.created_at,
            'started_at', v_session.started_at,
            'ended_at', v_session.ended_at,
            'credit_deducted', v_session.credit_deducted
        )
    );
END;
$$;

COMMENT ON FUNCTION public.get_session IS 'Fetches session with ownership verification';

-- ============================================================================
-- 7. GET USER SESSIONS
-- ============================================================================
-- Fetches all sessions for the current user with pagination

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

COMMENT ON FUNCTION public.get_user_sessions IS 'Fetches paginated sessions for current user';

-- ============================================================================
-- 8. UPDATE SESSION DATA (for extension to sync)
-- ============================================================================
-- Allows updating transcript, questions, ai_responses
-- Only when session is active

CREATE OR REPLACE FUNCTION public.update_session_data(
    p_session_id UUID,
    p_transcript JSONB DEFAULT NULL,
    p_questions JSONB DEFAULT NULL,
    p_ai_responses JSONB DEFAULT NULL,
    p_current_question TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
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

    -- Only allow updates on active sessions
    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'SESSION_NOT_ACTIVE',
            'message', 'Can only update active sessions'
        );
    END IF;

    -- Update session data
    UPDATE public.interview_sessions
    SET 
        transcript = COALESCE(p_transcript, transcript),
        questions = COALESCE(p_questions, questions),
        ai_responses = COALESCE(p_ai_responses, ai_responses),
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object(
        'success', true,
        'session_id', p_session_id,
        'synced_at', NOW()
    );
END;
$$;

COMMENT ON FUNCTION public.update_session_data IS 'Updates session data (transcript, questions, ai_responses)';

-- ============================================================================
-- 9. APPEND TRANSCRIPT ENTRY
-- ============================================================================
-- Atomically appends a single transcript entry

CREATE OR REPLACE FUNCTION public.append_transcript(
    p_session_id UUID,
    p_speaker TEXT,
    p_text TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_entry JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id;
    
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;

    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    END IF;

    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_ACTIVE');
    END IF;

    -- Build entry
    v_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'timestamp', NOW(),
        'speaker', p_speaker,
        'text', p_text
    );

    -- Append atomically
    UPDATE public.interview_sessions
    SET transcript = transcript || v_entry,
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$$;

COMMENT ON FUNCTION public.append_transcript IS 'Atomically appends transcript entry';

-- ============================================================================
-- 10. APPEND AI RESPONSE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.append_ai_response(
    p_session_id UUID,
    p_type TEXT,
    p_text TEXT,
    p_question_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_entry JSONB;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id;
    
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND');
    END IF;

    IF v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    END IF;

    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_ACTIVE');
    END IF;

    v_entry := jsonb_build_object(
        'id', gen_random_uuid(),
        'timestamp', NOW(),
        'type', p_type,
        'text', p_text,
        'question_id', p_question_id
    );

    UPDATE public.interview_sessions
    SET ai_responses = ai_responses || v_entry,
        last_sync_at = NOW(),
        updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$$;

COMMENT ON FUNCTION public.append_ai_response IS 'Atomically appends AI response';

-- ============================================================================
-- 11. CLEANUP STALE SESSIONS (Admin/Cron)
-- ============================================================================
-- Marks sessions that have been active for too long as failed

CREATE OR REPLACE FUNCTION public.cleanup_stale_sessions()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_timeout_minutes INTEGER;
    v_affected INTEGER;
BEGIN
    -- Get timeout from config (default 120 minutes)
    SELECT COALESCE((value::text)::integer, 120) INTO v_timeout_minutes
    FROM public.app_config
    WHERE key = 'session_timeout_minutes';

    -- Mark stale active sessions as failed
    WITH updated AS (
        UPDATE public.interview_sessions
        SET status = 'failed',
            ended_at = NOW(),
            summary = 'Session timed out due to inactivity',
            updated_at = NOW()
        WHERE status = 'active'
        AND started_at < NOW() - (v_timeout_minutes || ' minutes')::interval
        RETURNING id
    )
    SELECT COUNT(*) INTO v_affected FROM updated;

    -- Mark stale created sessions as failed
    WITH updated AS (
        UPDATE public.interview_sessions
        SET status = 'failed',
            ended_at = NOW(),
            summary = 'Session expired before starting',
            updated_at = NOW()
        WHERE status = 'created'
        AND created_at < NOW() - (v_timeout_minutes || ' minutes')::interval
        RETURNING id
    )
    SELECT v_affected + COUNT(*) INTO v_affected FROM updated;

    RETURN jsonb_build_object(
        'success', true,
        'cleaned_sessions', v_affected,
        'timeout_minutes', v_timeout_minutes
    );
END;
$$;

COMMENT ON FUNCTION public.cleanup_stale_sessions IS 'Cleans up sessions that exceeded timeout';

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.create_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.fail_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_sessions TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_session_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_transcript TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_ai_response TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stale_sessions TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
