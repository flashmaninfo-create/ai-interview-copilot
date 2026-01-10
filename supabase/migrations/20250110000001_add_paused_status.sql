-- ============================================================================
-- Add 'paused' status for resumable sessions
-- ============================================================================

-- 1. Drop the existing CHECK constraint on status column
ALTER TABLE public.interview_sessions DROP CONSTRAINT IF EXISTS interview_sessions_status_check;

-- 2. Add new CHECK constraint including 'paused' status
ALTER TABLE public.interview_sessions 
ADD CONSTRAINT interview_sessions_status_check 
CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled', 'paused'));

-- 3. Add paused_at timestamp column
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- 4. Add paused_state JSONB column to store session state for resume
-- This stores: elapsed_time, interview_context, meeting_data
ALTER TABLE public.interview_sessions 
ADD COLUMN IF NOT EXISTS paused_state JSONB DEFAULT NULL;

-- 5. Create index for finding paused sessions
CREATE INDEX IF NOT EXISTS idx_sessions_status_paused 
ON public.interview_sessions(status) 
WHERE status = 'paused';

-- 6. Add RPC function to pause a session
DROP FUNCTION IF EXISTS public.pause_session(UUID, JSONB);
CREATE OR REPLACE FUNCTION public.pause_session(
    p_session_id UUID,
    p_state JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.interview_sessions
    SET 
        status = 'paused', 
        paused_at = NOW(),
        paused_state = p_state,
        updated_at = NOW()
    WHERE id = p_session_id 
    AND user_id = auth.uid() 
    AND status = 'active';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or not active');
    END IF;
    
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 7. Add RPC function to resume a paused session
DROP FUNCTION IF EXISTS public.resume_session(UUID);
CREATE OR REPLACE FUNCTION public.resume_session(
    p_session_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_session RECORD;
    v_credit_balance INTEGER;
BEGIN
    -- Get session with paused state
    SELECT * INTO v_session 
    FROM public.interview_sessions 
    WHERE id = p_session_id 
    AND user_id = auth.uid();
    
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found');
    END IF;
    
    IF v_session.status != 'paused' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session is not paused');
    END IF;
    
    -- Credit check (session already started so don't deduct again)
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance 
    FROM public.credits_ledger 
    WHERE user_id = auth.uid();
    
    IF v_credit_balance < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    END IF;
    
    -- Resume the session
    UPDATE public.interview_sessions
    SET 
        status = 'active',
        updated_at = NOW()
    WHERE id = p_session_id;
    
    RETURN jsonb_build_object(
        'success', true, 
        'paused_state', v_session.paused_state,
        'console_token', v_session.console_token
    );
END;
$function$;

-- 8. Update get_session to include paused_state
-- (Already included in row_to_json so no change needed)

COMMENT ON COLUMN public.interview_sessions.paused_at IS 'Timestamp when session was paused';
COMMENT ON COLUMN public.interview_sessions.paused_state IS 'Session state saved at pause time for resume: {elapsed_time, interview_context, meeting_data}';
