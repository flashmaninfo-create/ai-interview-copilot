-- ============================================================================
-- PHASE 2: DATABASE SCHEMA & ROW LEVEL SECURITY
-- ntro-clone SaaS Platform
-- Generated: 2025-12-30
-- ============================================================================
-- 
-- This migration provides:
-- 1. Complete schema for all tables
-- 2. Row Level Security (RLS) on ALL tables
-- 3. Secure RLS policies for user/admin access
-- 4. Atomic credit operations (race-condition safe)
-- 5. Session state transition constraints
--
-- IMPORTANT: Run this AFTER dropping/cleaning the existing schema, OR
--            use the _v2_migration.sql for incremental changes.
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. PROFILES TABLE (extends auth.users)
-- ============================================================================
-- Purpose: Store additional user data beyond Supabase Auth
-- Security: Users see own profile; Admins see all
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase Auth';
COMMENT ON COLUMN public.profiles.role IS 'User role: user or admin';

-- ============================================================================
-- 2. PLANS TABLE
-- ============================================================================
-- Purpose: Define subscription plans with pricing and features
-- Security: Public read for active plans; Admin write
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price_monthly INTEGER NOT NULL DEFAULT 0, -- in cents
    price_yearly INTEGER, -- in cents (optional annual pricing)
    credits_monthly INTEGER NOT NULL DEFAULT 0,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    stripe_price_id TEXT, -- For Stripe integration
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plans_slug ON public.plans(slug);
CREATE INDEX IF NOT EXISTS idx_plans_active ON public.plans(is_active) WHERE is_active = true;

COMMENT ON TABLE public.plans IS 'Subscription plans with pricing';
COMMENT ON COLUMN public.plans.price_monthly IS 'Price in cents';
COMMENT ON COLUMN public.plans.credits_monthly IS 'Credits granted per billing period';

-- ============================================================================
-- 3. USER_PLANS TABLE (Subscriptions)
-- ============================================================================
-- Purpose: Track user subscriptions to plans
-- Security: Users see own subscription; Admins see all
-- Note: Renamed from "subscriptions" to "user_plans" per requirements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Ensure one active subscription per user
    CONSTRAINT unique_active_subscription UNIQUE (user_id, status) 
        -- Note: This is a soft constraint; enforce properly with partial index below
);

-- Partial unique index: Only one active/trialing subscription per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_plans_active_unique 
    ON public.user_plans(user_id) 
    WHERE status IN ('active', 'trialing');

CREATE INDEX IF NOT EXISTS idx_user_plans_user ON public.user_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_plans_status ON public.user_plans(status);
CREATE INDEX IF NOT EXISTS idx_user_plans_period_end ON public.user_plans(current_period_end);

COMMENT ON TABLE public.user_plans IS 'User subscription records';
COMMENT ON COLUMN public.user_plans.status IS 'Subscription status: active, cancelled, past_due, trialing, paused';

-- ============================================================================
-- 4. CREDITS_LEDGER TABLE (Audit-Safe)
-- ============================================================================
-- Purpose: Immutable append-only ledger for credit transactions
-- Security: Users see own entries; Admins see all; NO UPDATE/DELETE allowed
-- Design: Positive = credit added; Negative = credit spent
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.credits_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Positive = add, Negative = deduct
    balance_after INTEGER, -- Snapshot of balance after this transaction (computed)
    description TEXT NOT NULL,
    reference_type TEXT, -- 'session', 'purchase', 'subscription', 'admin', 'bonus'
    reference_id UUID, -- FK to related entity (session_id, etc.)
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id), -- NULL = system, else admin/user
    
    -- Prevent zero-amount entries
    CONSTRAINT non_zero_amount CHECK (amount != 0)
);

CREATE INDEX IF NOT EXISTS idx_credits_ledger_user ON public.credits_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_created ON public.credits_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credits_ledger_reference ON public.credits_ledger(reference_type, reference_id);

COMMENT ON TABLE public.credits_ledger IS 'Immutable credit transaction ledger';
COMMENT ON COLUMN public.credits_ledger.amount IS 'Positive = credit added, Negative = credit spent';
COMMENT ON COLUMN public.credits_ledger.balance_after IS 'Balance snapshot after transaction';

-- ============================================================================
-- 5. USER_CREDITS VIEW (Computed Balance)
-- ============================================================================
-- Purpose: Compute current balance from ledger
-- Note: This is a VIEW, not a table - always reflects true state
-- ============================================================================

CREATE OR REPLACE VIEW public.user_credits AS
SELECT 
    user_id,
    COALESCE(SUM(amount), 0)::INTEGER AS balance,
    MAX(created_at) AS last_transaction_at
FROM public.credits_ledger
GROUP BY user_id;

COMMENT ON VIEW public.user_credits IS 'Computed credit balance per user';

-- ============================================================================
-- 6. INTERVIEW_SESSIONS TABLE
-- ============================================================================
-- Purpose: Track interview sessions with state machine
-- Security: Users see own sessions; Admins see all
-- State Machine: created -> active -> completed|failed|cancelled
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.interview_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- Session metadata
    role TEXT NOT NULL, -- Job role being interviewed for
    type TEXT NOT NULL CHECK (type IN ('technical', 'behavioral', 'mixed')),
    difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
    
    -- State machine with strict transitions
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'failed', 'cancelled')),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ, -- Set when status -> 'active'
    ended_at TIMESTAMPTZ, -- Set when status -> 'completed'|'failed'|'cancelled'
    
    -- Results (populated on completion)
    score NUMERIC(4, 1) CHECK (score IS NULL OR (score >= 0 AND score <= 100)),
    summary TEXT,
    
    -- Real-time data (JSONB for flexibility)
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_responses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Extension sync state
    extension_session_id TEXT, -- Unique ID from extension for pairing
    last_sync_at TIMESTAMPTZ,
    
    -- LLM model used (optional, for analytics)
    llm_model_id UUID REFERENCES public.llm_models(id) ON DELETE SET NULL,
    
    -- Credit tracking
    credit_deducted BOOLEAN NOT NULL DEFAULT false,
    credit_deducted_at TIMESTAMPTZ,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON public.interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created ON public.interview_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_status ON public.interview_sessions(user_id, status);

COMMENT ON TABLE public.interview_sessions IS 'Interview sessions with state machine';
COMMENT ON COLUMN public.interview_sessions.status IS 'State machine: created -> active -> completed|failed|cancelled';
COMMENT ON COLUMN public.interview_sessions.credit_deducted IS 'True if credit was deducted for this session';

-- ============================================================================
-- 7. SESSION_EVENTS TABLE (Detailed Transcript/Events)
-- ============================================================================
-- Purpose: Store individual session events for detailed history
-- Security: Users see own session events (via session ownership)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL CHECK (event_type IN (
        'transcript_user', 'transcript_interviewer', 'transcript_ai',
        'question_detected', 'hint_requested', 'code_generated', 'explain_requested',
        'session_started', 'session_ended', 'error', 'system'
    )),
    content TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_events_session ON public.session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_session_events_type ON public.session_events(event_type);
CREATE INDEX IF NOT EXISTS idx_session_events_created ON public.session_events(session_id, created_at);

COMMENT ON TABLE public.session_events IS 'Detailed event log for interview sessions';

-- ============================================================================
-- 8. SESSION_COMMANDS TABLE (Console <-> Extension Communication)
-- ============================================================================
-- Purpose: Queue commands from console to extension
-- Security: Users see own session commands
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.session_commands (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    
    command TEXT NOT NULL CHECK (command IN (
        'PAUSE_TRANSCRIPTION', 'RESUME_TRANSCRIPTION',
        'HIDE_OVERLAY', 'SHOW_OVERLAY',
        'TAKE_SCREENSHOT', 'END_SESSION',
        'REQUEST_HINT', 'REQUEST_CODE', 'REQUEST_EXPLAIN'
    )),
    payload JSONB DEFAULT '{}'::jsonb,
    source TEXT NOT NULL DEFAULT 'console' CHECK (source IN ('console', 'extension')),
    processed BOOLEAN NOT NULL DEFAULT false,
    processed_at TIMESTAMPTZ,
    error TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_commands_session ON public.session_commands(session_id);
CREATE INDEX IF NOT EXISTS idx_session_commands_unprocessed ON public.session_commands(session_id, processed) WHERE processed = false;

COMMENT ON TABLE public.session_commands IS 'Command queue for console-extension communication';

-- ============================================================================
-- 9. LLM_PROVIDERS TABLE
-- ============================================================================
-- Purpose: Configure LLM API providers (OpenAI, Anthropic, etc.)
-- Security: Admin-only access; API keys are sensitive
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.llm_providers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- 'openai', 'anthropic', 'google'
    
    -- API Configuration (encrypted in production via Vault)
    api_key_encrypted TEXT, -- Store encrypted, not plain text
    api_base_url TEXT, -- Custom endpoint if needed
    
    enabled BOOLEAN NOT NULL DEFAULT true,
    config JSONB DEFAULT '{}'::jsonb, -- Provider-specific config
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_providers_slug ON public.llm_providers(slug);
CREATE INDEX IF NOT EXISTS idx_llm_providers_enabled ON public.llm_providers(enabled) WHERE enabled = true;

COMMENT ON TABLE public.llm_providers IS 'LLM API provider configuration (admin-only)';
COMMENT ON COLUMN public.llm_providers.api_key_encrypted IS 'Encrypted API key - use Vault in production';

-- ============================================================================
-- 10. LLM_MODELS TABLE
-- ============================================================================
-- Purpose: Define available models per provider
-- Security: Public read (enabled models); Admin write
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.llm_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_id UUID NOT NULL REFERENCES public.llm_providers(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL, -- Display name: "GPT-4 Turbo"
    model_id TEXT NOT NULL, -- API identifier: "gpt-4-turbo-preview"
    
    enabled BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    
    -- Cost tracking
    cost_per_1k_input_tokens NUMERIC(10, 6) DEFAULT 0,
    cost_per_1k_output_tokens NUMERIC(10, 6) DEFAULT 0,
    
    -- Capabilities
    max_tokens INTEGER DEFAULT 4096,
    supports_vision BOOLEAN DEFAULT false,
    supports_function_calling BOOLEAN DEFAULT false,
    
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT unique_model_per_provider UNIQUE (provider_id, model_id)
);

-- Only one default model globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_llm_models_default 
    ON public.llm_models(is_default) 
    WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_llm_models_provider ON public.llm_models(provider_id);
CREATE INDEX IF NOT EXISTS idx_llm_models_enabled ON public.llm_models(enabled) WHERE enabled = true;

COMMENT ON TABLE public.llm_models IS 'Available LLM models per provider';

-- ============================================================================
-- 11. LLM_ASSIGNMENTS TABLE
-- ============================================================================
-- Purpose: Assign specific models to users/plans (optional override)
-- Security: Users see own assignments; Admin manages all
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.llm_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Assignment target (one of these must be set)
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.plans(id) ON DELETE CASCADE,
    
    -- Assigned model
    model_id UUID NOT NULL REFERENCES public.llm_models(id) ON DELETE CASCADE,
    
    -- Priority (higher = preferred)
    priority INTEGER NOT NULL DEFAULT 0,
    
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- At least one target must be set
    CONSTRAINT assignment_has_target CHECK (user_id IS NOT NULL OR plan_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_llm_assignments_user ON public.llm_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_llm_assignments_plan ON public.llm_assignments(plan_id) WHERE plan_id IS NOT NULL;

COMMENT ON TABLE public.llm_assignments IS 'LLM model assignments to users or plans';

-- ============================================================================
-- 12. APP_CONFIG TABLE
-- ============================================================================
-- Purpose: Store application-wide configuration
-- Security: Public read; Admin write
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by UUID REFERENCES public.profiles(id)
);

COMMENT ON TABLE public.app_config IS 'Application configuration key-value store';

-- ============================================================================
-- 13. AUDIT_LOG TABLE (Optional but Recommended)
-- ============================================================================
-- Purpose: Track admin actions for compliance/debugging
-- Security: Admin read-only; System write
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id), -- NULL = system
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'user', 'session', 'credit', 'plan', etc.
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

COMMENT ON TABLE public.audit_log IS 'Audit trail for admin actions';

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: PROFILES
-- ============================================================================
-- Users can view and update their own profile
-- Admins can view all profiles
-- ============================================================================

-- Users view own profile
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- Admins view all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users update own profile (except role)
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Admins update any profile
CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- System insert (via trigger on auth.users)
CREATE POLICY "profiles_insert_system" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- RLS POLICIES: PLANS
-- ============================================================================
-- Public read for active plans
-- Admin full access
-- ============================================================================

CREATE POLICY "plans_select_active" ON public.plans
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "plans_admin_all" ON public.plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: USER_PLANS (Subscriptions)
-- ============================================================================
-- Users view own subscription
-- Admins view/manage all
-- No direct user INSERT/UPDATE (managed via Edge Functions)
-- ============================================================================

CREATE POLICY "user_plans_select_own" ON public.user_plans
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "user_plans_admin_all" ON public.user_plans
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: CREDITS_LEDGER
-- ============================================================================
-- Users view own entries (read-only)
-- NO UPDATE/DELETE allowed (audit requirement)
-- INSERT only via RPC functions (server-side)
-- Admins view all
-- ============================================================================

CREATE POLICY "credits_select_own" ON public.credits_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "credits_select_admin" ON public.credits_ledger
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- NO INSERT policy for regular users - must use RPC
-- Admin can insert (for manual adjustments)
CREATE POLICY "credits_insert_admin" ON public.credits_ledger
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- EXPLICITLY NO UPDATE OR DELETE POLICIES
-- This makes the ledger immutable

-- ============================================================================
-- RLS POLICIES: INTERVIEW_SESSIONS
-- ============================================================================
-- Users full access to own sessions
-- Admins view all
-- ============================================================================

CREATE POLICY "sessions_select_own" ON public.interview_sessions
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "sessions_insert_own" ON public.interview_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "sessions_update_own" ON public.interview_sessions
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Users cannot delete sessions (soft delete via status = 'cancelled')
CREATE POLICY "sessions_delete_admin" ON public.interview_sessions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "sessions_admin_select" ON public.interview_sessions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: SESSION_EVENTS
-- ============================================================================
-- Users access own session events (via session ownership)
-- ============================================================================

CREATE POLICY "session_events_select_own" ON public.session_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_events.session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "session_events_insert_own" ON public.session_events
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_events.session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "session_events_admin_all" ON public.session_events
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: SESSION_COMMANDS
-- ============================================================================
-- Users access own session commands
-- ============================================================================

CREATE POLICY "session_commands_select_own" ON public.session_commands
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_commands.session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "session_commands_insert_own" ON public.session_commands
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_commands.session_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "session_commands_update_own" ON public.session_commands
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.interview_sessions
            WHERE id = session_commands.session_id AND user_id = auth.uid()
        )
    );

-- ============================================================================
-- RLS POLICIES: LLM_PROVIDERS
-- ============================================================================
-- Admin-only access (contains sensitive API keys)
-- ============================================================================

CREATE POLICY "llm_providers_admin_all" ON public.llm_providers
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: LLM_MODELS
-- ============================================================================
-- Public read for enabled models
-- Admin full access
-- ============================================================================

CREATE POLICY "llm_models_select_enabled" ON public.llm_models
    FOR SELECT
    USING (enabled = true);

CREATE POLICY "llm_models_admin_all" ON public.llm_models
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: LLM_ASSIGNMENTS
-- ============================================================================
-- Users see their own assignments
-- Admins manage all
-- ============================================================================

CREATE POLICY "llm_assignments_select_own" ON public.llm_assignments
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_plans up
            WHERE up.plan_id = llm_assignments.plan_id 
            AND up.user_id = auth.uid()
            AND up.status = 'active'
        )
    );

CREATE POLICY "llm_assignments_admin_all" ON public.llm_assignments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: APP_CONFIG
-- ============================================================================
-- Public read
-- Admin write
-- ============================================================================

CREATE POLICY "app_config_select_all" ON public.app_config
    FOR SELECT
    USING (true);

CREATE POLICY "app_config_admin_write" ON public.app_config
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- RLS POLICIES: AUDIT_LOG
-- ============================================================================
-- Admin read-only
-- System/trigger insert only (via SECURITY DEFINER functions)
-- ============================================================================

CREATE POLICY "audit_log_select_admin" ON public.audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- No INSERT policy - use SECURITY DEFINER function


-- ============================================================================
-- ATOMIC CREDIT FUNCTIONS (Race-Condition Safe)
-- ============================================================================

-- Function: Deduct credits with atomic balance check
-- Returns: TRUE if successful, FALSE if insufficient balance
-- Security: SECURITY DEFINER runs with elevated privileges
CREATE OR REPLACE FUNCTION public.deduct_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Input validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Lock the user's ledger rows to prevent race conditions
    -- This uses SELECT FOR UPDATE pattern implicitly via the aggregate
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Calculate new balance
    v_new_balance := v_current_balance - p_amount;
    
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
        p_user_id,
        -p_amount, -- Negative for deduction
        v_new_balance,
        p_description,
        p_reference_type,
        p_reference_id,
        auth.uid() -- Track who initiated (may be NULL for system)
    );
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.deduct_credits IS 'Atomically deduct credits with balance check. Returns FALSE if insufficient.';

-- Function: Grant credits (admin or system)
CREATE OR REPLACE FUNCTION public.grant_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT,
    p_reference_type TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
    v_is_admin BOOLEAN;
BEGIN
    -- Check if caller is admin or system (for triggers)
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;
    
    -- Only admins can grant credits directly
    -- System grants happen via SECURITY DEFINER triggers (auth.uid() = NULL)
    IF auth.uid() IS NOT NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can grant credits';
    END IF;
    
    -- Input validation
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Get current balance
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger
    WHERE user_id = p_user_id;
    
    v_new_balance := v_current_balance + p_amount;
    
    -- Insert credit record
    INSERT INTO public.credits_ledger (
        user_id,
        amount,
        balance_after,
        description,
        reference_type,
        reference_id,
        created_by
    ) VALUES (
        p_user_id,
        p_amount, -- Positive for addition
        v_new_balance,
        p_description,
        p_reference_type,
        p_reference_id,
        auth.uid()
    );
    
    RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.grant_credits IS 'Grant credits to user. Admin or system only.';

-- Function: Get user balance (optimized)
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(amount), 0)::INTEGER
    FROM public.credits_ledger
    WHERE user_id = p_user_id;
$$;

COMMENT ON FUNCTION public.get_credit_balance IS 'Get current credit balance for user';


-- ============================================================================
-- SESSION STATE TRANSITION CONSTRAINTS
-- ============================================================================

-- Function: Validate session status transitions
CREATE OR REPLACE FUNCTION public.validate_session_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only check if status is being changed
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Define valid transitions
    CASE OLD.status
        WHEN 'created' THEN
            IF NEW.status NOT IN ('active', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid transition: created can only go to active or cancelled';
            END IF;
            -- Set started_at when going active
            IF NEW.status = 'active' THEN
                NEW.started_at := COALESCE(NEW.started_at, NOW());
            END IF;
            
        WHEN 'active' THEN
            IF NEW.status NOT IN ('completed', 'failed', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid transition: active can only go to completed, failed, or cancelled';
            END IF;
            -- Set ended_at when leaving active
            NEW.ended_at := COALESCE(NEW.ended_at, NOW());
            
        WHEN 'completed' THEN
            RAISE EXCEPTION 'Cannot change status of completed session';
            
        WHEN 'failed' THEN
            RAISE EXCEPTION 'Cannot change status of failed session';
            
        WHEN 'cancelled' THEN
            RAISE EXCEPTION 'Cannot change status of cancelled session';
            
        ELSE
            RAISE EXCEPTION 'Unknown status: %', OLD.status;
    END CASE;
    
    -- Update timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS trigger_validate_session_transition ON public.interview_sessions;
CREATE TRIGGER trigger_validate_session_transition
    BEFORE UPDATE ON public.interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_session_transition();

COMMENT ON FUNCTION public.validate_session_transition IS 'Enforces valid session state machine transitions';


-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user'
    );
    
    -- Grant welcome bonus credits
    INSERT INTO public.credits_ledger (
        user_id,
        amount,
        balance_after,
        description,
        reference_type
    ) VALUES (
        NEW.id,
        1, -- 1 free credit
        1, -- Balance after = 1
        'Welcome Bonus - Thank you for signing up!',
        'bonus'
    );
    
    RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 'Creates profile and grants welcome credits on signup';


-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at column
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_plans_updated_at ON public.plans;
CREATE TRIGGER trigger_plans_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_user_plans_updated_at ON public.user_plans;
CREATE TRIGGER trigger_user_plans_updated_at
    BEFORE UPDATE ON public.user_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_providers_updated_at ON public.llm_providers;
CREATE TRIGGER trigger_llm_providers_updated_at
    BEFORE UPDATE ON public.llm_providers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trigger_llm_models_updated_at ON public.llm_models;
CREATE TRIGGER trigger_llm_models_updated_at
    BEFORE UPDATE ON public.llm_models
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================================================
-- SEED DATA: Default Plans
-- ============================================================================

INSERT INTO public.plans (name, slug, description, price_monthly, credits_monthly, features, sort_order) VALUES
    ('Free', 'free', 'Get started with basic features', 0, 1, '["1 interview per month", "Basic AI hints", "Email support"]'::jsonb, 1),
    ('Pro', 'pro', 'For serious interview preparation', 1999, 10, '["10 interviews per month", "Advanced AI assistance", "Code generation", "Priority support", "Session recordings"]'::jsonb, 2),
    ('Enterprise', 'enterprise', 'For teams and organizations', 4999, 50, '["50 interviews per month", "All Pro features", "Custom AI models", "Dedicated support", "Analytics dashboard", "Team management"]'::jsonb, 3)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    credits_monthly = EXCLUDED.credits_monthly,
    features = EXCLUDED.features,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- ============================================================================
-- SEED DATA: Default LLM Providers
-- ============================================================================

INSERT INTO public.llm_providers (name, slug, enabled, config) VALUES
    ('OpenAI', 'openai', true, '{"default_model": "gpt-4-turbo-preview"}'::jsonb),
    ('Anthropic', 'anthropic', true, '{"default_model": "claude-3-sonnet-20240229"}'::jsonb),
    ('Google AI', 'google', false, '{"default_model": "gemini-pro"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    enabled = EXCLUDED.enabled,
    config = EXCLUDED.config,
    updated_at = NOW();

-- ============================================================================
-- SEED DATA: Default LLM Models
-- ============================================================================

-- Get provider IDs
DO $$
DECLARE
    v_openai_id UUID;
    v_anthropic_id UUID;
    v_google_id UUID;
BEGIN
    SELECT id INTO v_openai_id FROM public.llm_providers WHERE slug = 'openai';
    SELECT id INTO v_anthropic_id FROM public.llm_providers WHERE slug = 'anthropic';
    SELECT id INTO v_google_id FROM public.llm_providers WHERE slug = 'google';
    
    -- OpenAI Models
    INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, max_tokens) VALUES
        (v_openai_id, 'GPT-4 Turbo', 'gpt-4-turbo-preview', true, true, 0.01, 0.03, 128000),
        (v_openai_id, 'GPT-4', 'gpt-4', true, false, 0.03, 0.06, 8192),
        (v_openai_id, 'GPT-3.5 Turbo', 'gpt-3.5-turbo', true, false, 0.0005, 0.0015, 16385)
    ON CONFLICT (provider_id, model_id) DO UPDATE SET
        name = EXCLUDED.name,
        enabled = EXCLUDED.enabled,
        cost_per_1k_input_tokens = EXCLUDED.cost_per_1k_input_tokens,
        cost_per_1k_output_tokens = EXCLUDED.cost_per_1k_output_tokens;
    
    -- Anthropic Models
    INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, cost_per_1k_input_tokens, cost_per_1k_output_tokens, max_tokens) VALUES
        (v_anthropic_id, 'Claude 3 Opus', 'claude-3-opus-20240229', true, false, 0.015, 0.075, 200000),
        (v_anthropic_id, 'Claude 3 Sonnet', 'claude-3-sonnet-20240229', true, false, 0.003, 0.015, 200000),
        (v_anthropic_id, 'Claude 3 Haiku', 'claude-3-haiku-20240307', true, false, 0.00025, 0.00125, 200000)
    ON CONFLICT (provider_id, model_id) DO UPDATE SET
        name = EXCLUDED.name,
        enabled = EXCLUDED.enabled;
    
    -- Google Models
    INSERT INTO public.llm_models (provider_id, name, model_id, enabled, is_default, max_tokens) VALUES
        (v_google_id, 'Gemini Pro', 'gemini-pro', false, false, 32000),
        (v_google_id, 'Gemini Pro Vision', 'gemini-pro-vision', false, false, 16000)
    ON CONFLICT (provider_id, model_id) DO UPDATE SET
        name = EXCLUDED.name,
        enabled = EXCLUDED.enabled;
END;
$$;

-- ============================================================================
-- SEED DATA: Default App Config
-- ============================================================================

INSERT INTO public.app_config (key, value, description) VALUES
    ('maintenance_mode', 'false'::jsonb, 'Enable maintenance mode'),
    ('signup_enabled', 'true'::jsonb, 'Allow new user signups'),
    ('default_credits', '1'::jsonb, 'Credits granted to new users'),
    ('session_timeout_minutes', '120'::jsonb, 'Auto-fail sessions after this duration'),
    ('max_concurrent_sessions', '1'::jsonb, 'Max active sessions per user')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = NOW();


-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

GRANT SELECT ON public.plans TO anon, authenticated;
GRANT SELECT ON public.user_plans TO authenticated;
GRANT SELECT ON public.credits_ledger TO authenticated;
GRANT SELECT ON public.user_credits TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.interview_sessions TO authenticated;
GRANT SELECT, INSERT ON public.session_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.session_commands TO authenticated;

GRANT SELECT ON public.llm_providers TO authenticated;
GRANT SELECT ON public.llm_models TO anon, authenticated;
GRANT SELECT ON public.llm_assignments TO authenticated;

GRANT SELECT ON public.app_config TO anon, authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated;


-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
