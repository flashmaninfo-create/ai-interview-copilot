-- ============================================================================
-- COMPLETE SUPABASE SETUP SCRIPT
-- Interview Copilot / AI Interview Assistant
-- Generated: 2026-01-03
-- ============================================================================
-- 
-- Run this ENTIRE script in your new Supabase project's SQL Editor
-- This will set up all tables, RLS policies, functions, triggers, and seed data
--
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. HELPER FUNCTIONS (Must be created first for RLS policies)
-- ============================================================================

-- Fix for potential infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. TABLES
-- ============================================================================

-- 3.1 PROFILES (extends auth.users)
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
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 3.2 PLANS
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
    sort_order INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active) WHERE is_active = true;

-- 3.3 USER_PLANS (Subscriptions)
CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_active_unique ON public.user_plans(user_id) WHERE status IN ('active', 'trialing');
CREATE INDEX IF NOT EXISTS idx_user_plans_user ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON public.user_plans(status);

-- 3.4 CREDITS_LEDGER
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
CREATE INDEX IF NOT EXISTS idx_credits_ledger_user ON public.credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_created ON public.credits_ledger(created_at DESC);

-- 3.5 USER_CREDITS VIEW
CREATE OR REPLACE VIEW public.user_credits AS
SELECT 
    user_id, 
    COALESCE(SUM(amount), 0)::INTEGER AS balance, 
    MAX(created_at) AS last_transaction_at
FROM public.credits_ledger 
GROUP BY user_id;

-- 3.6 LLM_PROVIDERS
CREATE TABLE IF NOT EXISTS public.llm_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    api_key_encrypted TEXT,
    api_base_url TEXT,
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_llm_providers_slug ON public.llm_providers(slug);
CREATE INDEX IF NOT EXISTS idx_llm_providers_enabled ON public.llm_providers(enabled) WHERE enabled = true;

-- 3.7 LLM_MODELS
CREATE TABLE IF NOT EXISTS public.llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.llm_providers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_id TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    cost_per_1k_input_tokens NUMERIC(10, 6) DEFAULT 0,
    cost_per_1k_output_tokens NUMERIC(10, 6) DEFAULT 0,
    cost_per_token NUMERIC(10, 8),
    max_tokens INTEGER DEFAULT 4096,
    supports_vision BOOLEAN DEFAULT false,
    supports_function_calling BOOLEAN DEFAULT false,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_model_per_provider UNIQUE (provider_id, model_id)
);
CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON public.llm_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_enabled ON public.llm_models(enabled) WHERE enabled = true;

-- 3.8 LLM_ASSIGNMENTS
CREATE TABLE IF NOT EXISTS public.llm_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.llm_models(id) ON DELETE CASCADE,
    priority INTEGER NOT NULL DEFAULT 0,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT assignment_has_target CHECK (user_id IS NOT NULL OR plan_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_llm_assignments_user ON public.llm_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llm_assignments_plan ON public.llm_assignments(plan_id) WHERE plan_id IS NOT NULL;

-- 3.9 INTERVIEW_SESSIONS
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('technical', 'behavioral', 'mixed')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score NUMERIC(4, 1) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    summary TEXT,
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    console_token TEXT,
    extension_session_id TEXT,
    last_sync_at TIMESTAMPTZ,
    credit_deducted BOOLEAN NOT NULL DEFAULT false,
    credit_deducted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON public.interview_sessions(user_id, status);

-- 3.10 SESSION_EVENTS
CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_events_session ON public.session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON public.session_events(event_type);

-- 3.11 SESSION_COMMANDS
CREATE TABLE IF NOT EXISTS public.session_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    command TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'console' CHECK (source IN ('console', 'extension')),
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_session_commands_session ON public.session_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_session_commands_unprocessed ON public.session_commands(session_id, processed) WHERE processed = false;

-- 3.12 SYNC_MESSAGES (Realtime)
CREATE TABLE IF NOT EXISTS public.sync_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    source TEXT CHECK (source IN ('extension', 'console')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_messages_session ON public.sync_messages(session_id);

-- 3.13 APP_CONFIG
CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 3.14 AUDIT_LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ============================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- PROFILES
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_system" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PLANS
CREATE POLICY "plans_select_active" ON public.plans FOR SELECT USING (is_active = true);
CREATE POLICY "plans_admin_all" ON public.plans FOR ALL USING (public.is_admin());

-- USER_PLANS
CREATE POLICY "user_plans_select_own" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_plans_admin_all" ON public.user_plans FOR ALL USING (public.is_admin());

-- CREDITS_LEDGER
CREATE POLICY "credits_select_own" ON public.credits_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_select_admin" ON public.credits_ledger FOR SELECT USING (public.is_admin());
CREATE POLICY "credits_insert_admin" ON public.credits_ledger FOR INSERT WITH CHECK (public.is_admin());

-- INTERVIEW_SESSIONS
CREATE POLICY "sessions_select_own" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_admin" ON public.interview_sessions FOR ALL USING (public.is_admin());

-- SESSION_EVENTS
CREATE POLICY "session_events_own" ON public.session_events FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_events.session_id AND user_id = auth.uid()));

-- SESSION_COMMANDS
CREATE POLICY "session_commands_own" ON public.session_commands FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_commands.session_id AND user_id = auth.uid()));

-- SYNC_MESSAGES
CREATE POLICY "sync_messages_own" ON public.sync_messages FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_id AND user_id = auth.uid()));

-- LLM_PROVIDERS
CREATE POLICY "llm_providers_admin" ON public.llm_providers FOR ALL USING (public.is_admin());

-- LLM_MODELS
CREATE POLICY "llm_models_select_enabled" ON public.llm_models FOR SELECT USING (enabled = true);
CREATE POLICY "llm_models_admin" ON public.llm_models FOR ALL USING (public.is_admin());

-- LLM_ASSIGNMENTS
CREATE POLICY "llm_assignments_select_own" ON public.llm_assignments FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.user_plans up
        WHERE up.plan_id = llm_assignments.plan_id 
        AND up.user_id = auth.uid()
        AND up.status = 'active'
    ));
CREATE POLICY "llm_assignments_admin_all" ON public.llm_assignments FOR ALL USING (public.is_admin());

-- APP_CONFIG
CREATE POLICY "app_config_select_all" ON public.app_config FOR SELECT USING (true);
CREATE POLICY "app_config_admin_write" ON public.app_config FOR ALL USING (public.is_admin());

-- AUDIT_LOG
CREATE POLICY "audit_log_select_admin" ON public.audit_log FOR SELECT USING (public.is_admin());

-- ============================================================================
-- 6. FUNCTIONS & TRIGGERS
-- ============================================================================

-- 6.1 Handle New User (Create Profile + Welcome Credits)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  
  -- Give 5 welcome credits to new user
  INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type)
  VALUES (new.id, 5, 5, 'Welcome Bonus', 'signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6.2 Updated At Trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_plans_updated_at ON public.plans;
CREATE TRIGGER trigger_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_user_plans_updated_at ON public.user_plans;
CREATE TRIGGER trigger_user_plans_updated_at BEFORE UPDATE ON public.user_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_providers_updated_at ON public.llm_providers;
CREATE TRIGGER trigger_llm_providers_updated_at BEFORE UPDATE ON public.llm_providers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_models_updated_at ON public.llm_models;
CREATE TRIGGER trigger_llm_models_updated_at BEFORE UPDATE ON public.llm_models FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 6.3 Validate User Role
CREATE OR REPLACE FUNCTION public.validate_user_role(p_required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    SELECT role INTO v_user_role FROM public.profiles WHERE id = auth.uid();
    IF v_user_role IS NULL THEN RETURN FALSE; END IF;
    
    CASE p_required_role
        WHEN 'user' THEN RETURN v_user_role IN ('user', 'admin');
        WHEN 'admin' THEN RETURN v_user_role = 'admin';
        ELSE RETURN FALSE;
    END CASE;
END;
$$;

-- 6.4 Get My Role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 6.5 Create Session (With Credit Check)
CREATE OR REPLACE FUNCTION public.create_session(
    p_role TEXT,
    p_type TEXT,
    p_difficulty TEXT DEFAULT 'medium'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID;
    v_session_id UUID;
    v_credit_balance INTEGER;
    v_active_count INTEGER;
    v_max_concurrent INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- Credit Check
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    IF v_credit_balance < 1 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', v_credit_balance);
    END IF;

    -- Check concurrent session limit
    SELECT COALESCE((value::text)::integer, 1) INTO v_max_concurrent FROM public.app_config WHERE key = 'max_concurrent_sessions';
    v_max_concurrent := COALESCE(v_max_concurrent, 1);

    SELECT COUNT(*) INTO v_active_count FROM public.interview_sessions WHERE user_id = v_user_id AND status IN ('created', 'active');
    IF v_active_count >= v_max_concurrent THEN
        RETURN jsonb_build_object('success', false, 'error', 'MAX_SESSIONS_REACHED');
    END IF;

    INSERT INTO public.interview_sessions (user_id, role, type, difficulty, status, credit_deducted, console_token)
    VALUES (v_user_id, p_role, p_type, p_difficulty, 'created', false, replace(uuid_generate_v4()::text, '-', ''))
    RETURNING id INTO v_session_id;

    RETURN jsonb_build_object('success', true, 'session', (SELECT row_to_json(s) FROM public.interview_sessions s WHERE id = v_session_id));
END;
$$;

-- 6.6 Start Session
CREATE OR REPLACE FUNCTION public.start_session(p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user_id UUID;
    v_session RECORD;
    v_credit_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id;
    IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND'); END IF;
    IF v_session.user_id != v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN'); END IF;
    IF v_session.status != 'created' THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION'); END IF;

    -- Credit Check
    SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id;
    IF v_credit_balance < 1 THEN
        UPDATE public.interview_sessions SET status = 'cancelled', summary = 'Cancelled: Insufficient credits', updated_at = NOW() WHERE id = p_session_id;
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS', 'balance', 0);
    END IF;

    UPDATE public.interview_sessions SET status = 'active', started_at = NOW(), updated_at = NOW() WHERE id = p_session_id;
    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'status', 'active', 'started_at', NOW());
END;
$$;

-- 6.7 Complete Session (With Credit Deduction & AI Summary)
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

    SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
    IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'SESSION_NOT_FOUND'); END IF;
    IF v_session.user_id != v_user_id THEN RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN'); END IF;
    IF v_session.status != 'active' THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION'); END IF;

    -- Generate mock results
    v_transcript_count := jsonb_array_length(COALESCE(v_session.transcript, '[]'::jsonb));
    v_ai_response_count := jsonb_array_length(COALESCE(v_session.ai_responses, '[]'::jsonb));
    v_mock_score := COALESCE(p_score::integer, LEAST(100, GREATEST(50, 60 + (v_transcript_count * 2) + (v_ai_response_count * 3) + (random() * 20)::integer)));
    v_mock_summary := COALESCE(p_summary, format('Interview session for %s position completed. %s dialogue exchanges and %s AI-assisted responses.', v_session.role, v_transcript_count, v_ai_response_count));

    -- Deduct credit atomically
    IF NOT v_session.credit_deducted THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_credit_balance FROM public.credits_ledger WHERE user_id = v_user_id FOR UPDATE;
        IF v_credit_balance < 1 THEN RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_CREDITS'); END IF;
        v_new_balance := v_credit_balance - 1;
        INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type, reference_id, created_by)
        VALUES (v_user_id, -1, v_new_balance, format('Interview: %s (%s)', v_session.role, v_session.type), 'session', p_session_id, v_user_id);
    END IF;

    UPDATE public.interview_sessions
    SET status = 'completed', ended_at = NOW(), score = v_mock_score, summary = v_mock_summary, credit_deducted = true, credit_deducted_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id;

    RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'status', 'completed', 'score', v_mock_score, 'summary', v_mock_summary);
END;
$$;

-- 6.8 Fail Session
CREATE OR REPLACE FUNCTION public.fail_session(p_session_id UUID, p_reason TEXT DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.interview_sessions SET status = 'failed', ended_at = NOW(), summary = COALESCE(p_reason, 'Session failed'), updated_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status IN ('created', 'active');
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6.9 Cancel Session
CREATE OR REPLACE FUNCTION public.cancel_session(p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.interview_sessions SET status = 'cancelled', ended_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status IN ('created', 'active');
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6.10 Get Session
CREATE OR REPLACE FUNCTION public.get_session(p_session_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_session JSONB;
BEGIN
    SELECT row_to_json(s) INTO v_session FROM public.interview_sessions s
    WHERE id = p_session_id AND (user_id = auth.uid() OR public.is_admin());
    IF v_session IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND'); END IF;
    RETURN jsonb_build_object('success', true, 'session', v_session);
END;
$$;

-- 6.11 Get User Sessions
CREATE OR REPLACE FUNCTION public.get_user_sessions(p_status TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sessions JSONB; v_total INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.interview_sessions WHERE user_id = auth.uid() AND (p_status IS NULL OR status = p_status);
    SELECT jsonb_agg(row_to_json(s)) INTO v_sessions FROM (
        SELECT * FROM public.interview_sessions WHERE user_id = auth.uid() AND (p_status IS NULL OR status = p_status) ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset
    ) s;
    RETURN jsonb_build_object('success', true, 'sessions', COALESCE(v_sessions, '[]'::jsonb), 'total', v_total);
END;
$$;

-- 6.12 Update Session Data
CREATE OR REPLACE FUNCTION public.update_session_data(p_session_id UUID, p_transcript JSONB DEFAULT NULL, p_questions JSONB DEFAULT NULL, p_ai_responses JSONB DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    UPDATE public.interview_sessions
    SET transcript = COALESCE(p_transcript, transcript), questions = COALESCE(p_questions, questions), ai_responses = COALESCE(p_ai_responses, ai_responses), last_sync_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    RETURN jsonb_build_object('success', true);
END;
$$;

-- 6.13 Append Transcript
CREATE OR REPLACE FUNCTION public.append_transcript(p_session_id UUID, p_speaker TEXT, p_text TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry JSONB;
BEGIN
    v_entry := jsonb_build_object('id', gen_random_uuid(), 'timestamp', NOW(), 'speaker', p_speaker, 'text', p_text);
    UPDATE public.interview_sessions SET transcript = transcript || v_entry, last_sync_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$$;

-- 6.14 Append AI Response
CREATE OR REPLACE FUNCTION public.append_ai_response(p_session_id UUID, p_type TEXT, p_text TEXT, p_question_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry JSONB;
BEGIN
    v_entry := jsonb_build_object('id', gen_random_uuid(), 'timestamp', NOW(), 'type', p_type, 'text', p_text, 'question_id', p_question_id);
    UPDATE public.interview_sessions SET ai_responses = ai_responses || v_entry, last_sync_at = NOW(), updated_at = NOW()
    WHERE id = p_session_id AND user_id = auth.uid() AND status = 'active';
    RETURN jsonb_build_object('success', true, 'entry', v_entry);
END;
$$;

-- 6.15 Get My Credit Balance
CREATE OR REPLACE FUNCTION public.get_my_credit_balance()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_balance INTEGER; v_last TIMESTAMPTZ;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;
    SELECT COALESCE(SUM(amount), 0), MAX(created_at) INTO v_balance, v_last FROM public.credits_ledger WHERE user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'balance', v_balance, 'last_transaction_at', v_last);
END;
$$;

-- 6.16 Get Credit History
CREATE OR REPLACE FUNCTION public.get_my_credit_history(p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID; v_history JSONB; v_total INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;
    SELECT COUNT(*) INTO v_total FROM public.credits_ledger WHERE user_id = v_user_id;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', cl.id, 'amount', cl.amount, 'balance_after', cl.balance_after, 'description', cl.description, 'reference_type', cl.reference_type, 'created_at', cl.created_at) ORDER BY cl.created_at DESC), '[]'::jsonb) INTO v_history
    FROM (SELECT * FROM public.credits_ledger WHERE user_id = v_user_id ORDER BY created_at DESC LIMIT p_limit OFFSET p_offset) cl;
    RETURN jsonb_build_object('success', true, 'history', v_history, 'total', v_total);
END;
$$;

-- 6.17 Admin Adjust Credits
CREATE OR REPLACE FUNCTION public.admin_adjust_credits(p_user_id UUID, p_amount INTEGER, p_description TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin_id UUID; v_current_balance INTEGER; v_new_balance INTEGER;
BEGIN
    v_admin_id := auth.uid();
    IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN'); END IF;
    IF p_amount = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT'); END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND'); END IF;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance FROM public.credits_ledger WHERE user_id = p_user_id;
    v_new_balance := v_current_balance + p_amount;
    IF v_new_balance < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE'); END IF;
    
    INSERT INTO public.credits_ledger (user_id, amount, balance_after, description, reference_type, created_by)
    VALUES (p_user_id, p_amount, v_new_balance, p_description, 'admin', v_admin_id);
    
    INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, old_value, new_value)
    VALUES (v_admin_id, 'CREDIT_ADJUSTMENT', 'user', p_user_id, jsonb_build_object('balance', v_current_balance), jsonb_build_object('balance', v_new_balance, 'adjustment', p_amount));
    
    RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'adjustment', p_amount, 'new_balance', v_new_balance);
END;
$$;

-- 6.18 Get Credit Balance (Helper)
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(SUM(amount), 0)::INTEGER FROM public.credits_ledger WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- 7. REALTIME CONFIGURATION
-- ============================================================================
ALTER TABLE public.interview_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.sync_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'interview_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sync_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_messages;
  END IF;
END $$;

-- ============================================================================
-- 8. SEED DATA
-- ============================================================================

-- Default Plans
INSERT INTO public.plans (name, slug, description, price_monthly, credits_monthly, features, sort_order) VALUES
    ('Free', 'free', 'Get started with basic features', 0, 1, '["1 interview per month", "Basic AI hints", "Email support"]'::jsonb, 1),
    ('Pro', 'pro', 'For serious interview preparation', 1999, 10, '["10 interviews per month", "Advanced AI assistance", "Code generation", "Priority support", "Session recordings"]'::jsonb, 2),
    ('Enterprise', 'enterprise', 'For teams and organizations', 4999, 50, '["50 interviews per month", "All Pro features", "Custom AI models", "Dedicated support", "Analytics dashboard", "Team management"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- Default App Config
INSERT INTO public.app_config (key, value, description) VALUES
    ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode'),
    ('signup_enabled', 'true'::jsonb, 'Allow new user signups'),
    ('default_credits', '5'::jsonb, 'Credits granted to new users'),
    ('session_timeout_minutes', '120'::jsonb, 'Auto-fail sessions after this duration'),
    ('max_concurrent_sessions', '1'::jsonb, 'Max active sessions per user')
ON CONFLICT (key) DO NOTHING;

-- Default LLM Providers
INSERT INTO public.llm_providers (name, slug, enabled, config) VALUES
    ('OpenAI', 'openai', true, '{"default_model": "gpt-4-turbo-preview"}'::jsonb),
    ('Anthropic', 'anthropic', true, '{"default_model": "claude-3-sonnet-20240229"}'::jsonb),
    ('Google AI', 'google', false, '{"default_model": "gemini-pro"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Default LLM Models
DO $$
DECLARE
    v_openai_id UUID;
    v_anthropic_id UUID;
    v_google_id UUID;
BEGIN
    SELECT id INTO v_openai_id FROM public.llm_providers WHERE slug = 'openai';
    SELECT id INTO v_anthropic_id FROM public.llm_providers WHERE slug = 'anthropic';
    SELECT id INTO v_google_id FROM public.llm_providers WHERE slug = 'google';
    
    IF v_openai_id IS NOT NULL THEN
        INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, max_tokens) VALUES
            (v_openai_id, 'GPT-4 Turbo', 'gpt-4-turbo-preview', true, true, 0.01, 0.03, 128000),
            (v_openai_id, 'GPT-4', 'gpt-4', true, false, 0.03, 0.06, 8192),
            (v_openai_id, 'GPT-3.5 Turbo', 'gpt-3.5-turbo', true, false, 0.0005, 0.0015, 16385)
        ON CONFLICT (provider_id, model_id) DO NOTHING;
    END IF;
    
    IF v_anthropic_id IS NOT NULL THEN
        INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, max_tokens) VALUES
            (v_anthropic_id, 'Claude 3 Opus', 'claude-3-opus-20240229', true, false, 0.015, 0.075, 200000),
            (v_anthropic_id, 'Claude 3 Sonnet', 'claude-3-sonnet-20240229', true, false, 0.003, 0.015, 200000),
            (v_anthropic_id, 'Claude 3 Haiku', 'claude-3-haiku-20240307', true, false, 0.00025, 0.00125, 200000)
        ON CONFLICT (provider_id, model_id) DO NOTHING;
    END IF;
    
    IF v_google_id IS NOT NULL THEN
        INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, max_tokens) VALUES
            (v_google_id, 'Gemini Pro', 'gemini-pro', false, false, 32000),
            (v_google_id, 'Gemini Pro Vision', 'gemini-pro-vision', false, false, 16000)
        ON CONFLICT (provider_id, model_id) DO NOTHING;
    END IF;
END;
$$;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.user_plans TO authenticated;
GRANT SELECT ON public.credits_ledger TO authenticated;
GRANT SELECT ON public.user_credits TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.interview_sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.session_commands TO authenticated;
GRANT SELECT, INSERT ON public.sync_messages TO authenticated;
GRANT SELECT ON public.llm_providers TO authenticated;
GRANT SELECT ON public.llm_models TO anon, authenticated;
GRANT SELECT ON public.llm_assignments TO authenticated;
GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
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
GRANT EXECUTE ON FUNCTION public.get_my_credit_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_credit_history TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated;

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================
-- After running this script:
-- 1. Update your .env file with the new Supabase credentials
-- 2. Update extension/config.js with the new Supabase URL and anon key
-- 3. Test user signup to verify the welcome credits are granted
-- ============================================================================
