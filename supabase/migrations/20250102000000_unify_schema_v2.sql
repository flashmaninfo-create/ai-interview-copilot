-- ============================================================================
-- COMPLETE PROJECT SCHEMA V2 (FIXED)
-- Merges:
-- 1. Main Project Schema (Profiles, Plans, Credits, Sessions, LLM, Config)
-- 2. External Project Requirements (Sync Messages, Console Token)
-- 3. Logic & RPCs for Session Lifecycle, Credits, and Results
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TABLES & RLS
-- ============================================================================

-- 1.1 PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_insert_system" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- 1.2 PLANS
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly INTEGER NOT NULL DEFAULT 0,
    price_yearly INTEGER,
    credits_monthly INTEGER NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plans_select_active" ON public.plans FOR SELECT USING (is_active = true);
CREATE POLICY "plans_admin_all" ON public.plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.3 USER_PLANS (Subscriptions)
CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active',
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_plans_select_own" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_plans_admin_all" ON public.user_plans FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.4 CREDITS_LEDGER
CREATE TABLE IF NOT EXISTS public.credits_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL CHECK (amount != 0),
    balance_after INTEGER,
    description TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "credits_select_own" ON public.credits_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_select_admin" ON public.credits_ledger FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "credits_insert_admin" ON public.credits_ledger FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.5 USER_CREDITS VIEW
CREATE OR REPLACE VIEW public.user_credits AS
SELECT user_id, COALESCE(SUM(amount), 0)::INTEGER AS balance, MAX(created_at) AS last_transaction_at
FROM public.credits_ledger GROUP BY user_id;

-- 1.6 LLM CONFIG
CREATE TABLE IF NOT EXISTS public.llm_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    api_key_encrypted TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "llm_providers_admin" ON public.llm_providers FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE TABLE IF NOT EXISTS public.llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.llm_providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    cost_per_token NUMERIC(10, 8),
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "llm_models_select_enabled" ON public.llm_models FOR SELECT USING (enabled = true);
CREATE POLICY "llm_models_admin" ON public.llm_models FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.7 INTERVIEW SESSIONS
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Results
    score NUMERIC(4, 1),
    summary TEXT,
    
    -- Data
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- External/Extension Support
    console_token TEXT, -- For console auth
    extension_session_id TEXT,
    last_sync_at TIMESTAMPTZ,
    
    -- Credit Tracking
    credit_deducted BOOLEAN NOT NULL DEFAULT false,
    credit_deducted_at TIMESTAMPTZ
);
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions_select_own" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_admin" ON public.interview_sessions FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.8 SESSION COMMANDS (Console -> Extension)
CREATE TABLE IF NOT EXISTS public.session_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'console',
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.session_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commands_own" ON public.session_commands FOR ALL USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_commands.session_id AND user_id = auth.uid()));

-- 1.9 SYNC MESSAGES (Realtime Transport for Console <-> Extension)
CREATE TABLE IF NOT EXISTS public.sync_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT NOT NULL,
    payload JSONB,
    source TEXT CHECK (source IN ('extension', 'console')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sync_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_messages_own" ON public.sync_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_id AND user_id = auth.uid()));

-- 1.10 APP CONFIG
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "config_read_public" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "config_write_admin" ON public.app_config FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.11 AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_admin" ON public.audit_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 1.12 SESSION EVENTS
CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_own" ON public.session_events FOR ALL USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_id AND user_id = auth.uid()));


-- ============================================================================
-- 2. FUNCTIONS & LOGIC
-- ============================================================================

-- 2.1 SIGNUP TRIGGER
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user');
  INSERT INTO public.credits_ledger (user_id, amount, description) VALUES (new.id, 5, 'Welcome Bonus');
  RETURN new;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 2.2 CREATE SESSION (With Credit Check)
DROP FUNCTION IF EXISTS public.create_session(TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.create_session(
    p_role TEXT,
    p_type TEXT,
    p_difficulty TEXT DEFAULT 'medium'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_user_id UUID;
    v_session_id UUID;
    v_credit_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

    -- Credit Check
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    IF v_credit_balance < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    END IF;

    INSERT INTO public.interview_sessions (user_id, role, type, difficulty, status, credit_deducted, console_token)
    VALUES (v_user_id, p_role, p_type, p_difficulty, 'created', false, replace(uuid_generate_v4()::text, '-', ''))
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('success', true, 'session', (SELECT row_to_json(s) FROM public.interview_sessions s WHERE id = v_session_id));
END;
$function$;

-- 2.3 COMPLETE SESSION (With Deduction & Mock AI)
DROP FUNCTION IF EXISTS public.complete_session(UUID, NUMERIC, TEXT);
CREATE OR REPLACE FUNCTION public.complete_session(
    p_session_id UUID,
    p_score NUMERIC DEFAULT NULL,
    p_summary TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
    v_mock_score INTEGER;
    v_mock_summary TEXT;
BEGIN
    v_user_id := auth.uid();
    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
    
    IF v_session IS NULL OR v_session.user_id != v_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_SESSION');
    END IF;

    IF v_session.status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_ACTIVE');
    END IF;

    -- Deduct Credit
    IF NOT v_session.credit_deducted THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id FOR UPDATE;
        IF v_credit_balance < 1 THEN
            RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
        END IF;
        
        INSERT INTO public.credits_ledger (user_id, amount, description, reference_type, reference_id)
        VALUES (v_user_id, -1, 'Interview Session', 'session', p_session_id);
    END IF;

    -- Generate Mock Results
    v_mock_score := COALESCE(p_score, floor(random() * (100-70+1) + 70)::int);
    v_mock_summary := COALESCE(p_summary, 'Session completed successfully. AI analysis pending.');

    UPDATE public.interview_sessions 
    SET status = 'completed', ended_at = NOW(), score = v_mock_score, summary = v_mock_summary, credit_deducted = true, credit_deducted_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'score', v_mock_score);
END;
$function$;

-- 2.4 START SESSION
DROP FUNCTION IF EXISTS public.start_session(UUID);
CREATE OR REPLACE FUNCTION public.start_session(p_session_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_user_id UUID;
    v_credit_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    -- Exta validaton
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    IF v_credit_balance < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS');
    END IF;

    UPDATE public.interview_sessions SET status = 'active', started_at = NOW()
    WHERE id = p_session_id AND user_id = v_user_id AND status = 'created';
    
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2.5 FAIL SESSION
DROP FUNCTION IF EXISTS public.fail_session(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.fail_session(
    p_session_id UUID,
    p_reason TEXT DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.interview_sessions
    SET status = 'failed', ended_at = NOW(), summary = COALESCE(p_reason, 'Session failed')
    WHERE id = p_session_id AND user_id = auth.uid() AND status IN ('created', 'active');
    
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2.6 CANCEL SESSION
DROP FUNCTION IF EXISTS public.cancel_session(UUID);
CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.interview_sessions
    SET status = 'cancelled', ended_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status IN ('created', 'active');
    
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2.7 GET SESSION
DROP FUNCTION IF EXISTS public.get_session(UUID);
CREATE OR REPLACE FUNCTION public.get_session(p_session_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_session JSONB;
BEGIN
    SELECT row_to_json(s) INTO v_session FROM public.interview_sessions s
    WHERE id = p_session_id AND (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
    
    IF v_session IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;
    
    RETURN jsonb_build_object('success', true, 'session', v_session);
END;
$function$;

-- 2.8 GET USER SESSIONS
DROP FUNCTION IF EXISTS public.get_user_sessions(TEXT, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION public.get_user_sessions(
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_sessions JSONB;
    v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.interview_sessions WHERE user_id = auth.uid() AND (p_status IS NULL OR status = p_status);
    
    SELECT jsonb_agg(row_to_json(s)) INTO v_sessions FROM (
        SELECT * FROM public.interview_sessions WHERE user_id = auth.uid() AND (p_status IS NULL OR status = p_status)
        ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset
    ) s;
    
    RETURN jsonb_build_object('success', true, 'sessions', COALESCE(v_sessions, '[]'::jsonb), 'total', v_total);
END;
$function$;

-- 2.9 UPDATE SESSION DATA
DROP FUNCTION IF EXISTS public.update_session_data(UUID, JSONB, JSONB, JSONB);
CREATE OR REPLACE FUNCTION public.update_session_data(
    p_session_id UUID,
    p_transcript JSONB DEFAULT NULL,
    p_questions JSONB DEFAULT NULL,
    p_ai_responses JSONB DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    UPDATE public.interview_sessions
    SET 
        transcript = COALESCE(p_transcript, transcript),
        questions = COALESCE(p_questions, questions),
        ai_responses = COALESCE(p_ai_responses, ai_responses),
        last_sync_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 2.10 APPEND TRANSCRIPT
DROP FUNCTION IF EXISTS public.append_transcript(UUID, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.append_transcript(
    p_session_id UUID,
    p_speaker TEXT,
    p_text TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_entry JSONB;
BEGIN
    v_entry := jsonb_build_object('id', uuid_generate_v4(), 'timestamp', NOW(), 'speaker', p_speaker, 'text', p_text);
    
    UPDATE public.interview_sessions
    SET transcript = transcript || v_entry
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    
    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$function$;

-- 2.11 APPEND AI RESPONSE
DROP FUNCTION IF EXISTS public.append_ai_response(UUID, TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION public.append_ai_response(
    p_session_id UUID,
    p_type TEXT,
    p_text TEXT,
    p_question_id UUID DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_entry JSONB;
BEGIN
    v_entry := jsonb_build_object('id', uuid_generate_v4(), 'timestamp', NOW(), 'type', p_type, 'text', p_text, 'question_id', p_question_id);
    
    UPDATE public.interview_sessions
    SET ai_responses = ai_responses || v_entry
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    
    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$function$;

-- 2.12 ADMIN ADJUST CREDITS
DROP FUNCTION IF EXISTS public.admin_adjust_credits(UUID, INTEGER, TEXT);
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN');
    END IF;
    
    INSERT INTO public.credits_ledger (user_id, amount, description, reference_type, created_by)
    VALUES (p_user_id, p_amount, p_description, 'admin', auth.uid());
    
    RETURN jsonb_build_object('success', true);
END;
$function$;
