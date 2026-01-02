-- ============================================================================
-- SETUP NEW DATABASE (FIXED RECURSION)
-- Run this script to fully initialize a fresh Supabase project for Interview Copilot
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. HELPER FUNCTIONS -- (Moved up to be available for policies)
-- ----------------------------------------------------------------------------
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


-- 3. TABLES & RLS
-- ----------------------------------------------------------------------------

-- PROFILES
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles; -- Explicitly drop bad policy
  DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
  DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles; -- Explicitly drop bad policy
  DROP POLICY IF EXISTS "profiles_insert_system" ON public.profiles;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_insert_system" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- PLANS
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "plans_select_active" ON public.plans;
  DROP POLICY IF EXISTS "plans_admin_all" ON public.plans;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "plans_select_active" ON public.plans FOR SELECT USING (is_active = true);
CREATE POLICY "plans_admin_all" ON public.plans FOR ALL USING (public.is_admin());

-- USER_PLANS
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_plans_select_own" ON public.user_plans;
  DROP POLICY IF EXISTS "user_plans_admin_all" ON public.user_plans;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "user_plans_select_own" ON public.user_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_plans_admin_all" ON public.user_plans FOR ALL USING (public.is_admin());

-- CREDITS_LEDGER
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "credits_select_own" ON public.credits_ledger;
  DROP POLICY IF EXISTS "credits_select_admin" ON public.credits_ledger;
  DROP POLICY IF EXISTS "credits_insert_admin" ON public.credits_ledger;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "credits_select_own" ON public.credits_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credits_select_admin" ON public.credits_ledger FOR SELECT USING (public.is_admin());
CREATE POLICY "credits_insert_admin" ON public.credits_ledger FOR INSERT WITH CHECK (public.is_admin());

-- USER_CREDITS VIEW
CREATE OR REPLACE VIEW public.user_credits AS
SELECT user_id, COALESCE(SUM(amount), 0)::INTEGER AS balance, MAX(created_at) AS last_transaction_at
FROM public.credits_ledger GROUP BY user_id;

-- LLM CONFIG
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

DO $$ BEGIN
  DROP POLICY IF EXISTS "llm_providers_admin" ON public.llm_providers;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "llm_providers_admin" ON public.llm_providers FOR ALL USING (public.is_admin());

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

DO $$ BEGIN
  DROP POLICY IF EXISTS "llm_models_select_enabled" ON public.llm_models;
  DROP POLICY IF EXISTS "llm_models_admin" ON public.llm_models;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "llm_models_select_enabled" ON public.llm_models FOR SELECT USING (enabled = true);
CREATE POLICY "llm_models_admin" ON public.llm_models FOR ALL USING (public.is_admin());

-- INTERVIEW SESSIONS
CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    type TEXT NOT NULL,
    difficulty TEXT DEFAULT 'medium',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    score NUMERIC(4, 1),
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
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sessions_select_own" ON public.interview_sessions;
  DROP POLICY IF EXISTS "sessions_insert_own" ON public.interview_sessions;
  DROP POLICY IF EXISTS "sessions_update_own" ON public.interview_sessions;
  DROP POLICY IF EXISTS "sessions_admin" ON public.interview_sessions;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "sessions_select_own" ON public.interview_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.interview_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.interview_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "sessions_admin" ON public.interview_sessions FOR ALL USING (public.is_admin());

-- SYNC MESSAGES
CREATE TABLE IF NOT EXISTS public.sync_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE NOT NULL,
    message_type TEXT NOT NULL,
    payload JSONB,
    source TEXT CHECK (source IN ('extension', 'console')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.sync_messages ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sync_messages_own" ON public.sync_messages;
EXCEPTION WHEN OTHERS THEN NULL; END $$;

CREATE POLICY "sync_messages_own" ON public.sync_messages FOR ALL USING (EXISTS (SELECT 1 FROM public.interview_sessions WHERE id = session_id AND user_id = auth.uid()));

-- 3.5 DATA REPAIR (Fix missing profiles)
-- ----------------------------------------------------------------------------
-- Backfill profiles for existing users who might have been created when triggers were broken
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
    id, 
    email, 
    raw_user_meta_data->>'full_name', 
    'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- 4. LOGIC & TRIGGERS
-- ----------------------------------------------------------------------------

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

-- Create Session Function
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

-- Start Session Function
CREATE OR REPLACE FUNCTION public.start_session(p_session_id UUID) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    UPDATE public.interview_sessions SET status = 'active', started_at = NOW()
    WHERE id = p_session_id AND user_id = v_user_id AND status = 'created';
    RETURN jsonb_build_object('success', true);
END;
$function$;

-- 5. REALTIME CONFIGURATION
-- ----------------------------------------------------------------------------
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
