-- ============================================================================
-- PHASE 2: INCREMENTAL MIGRATION (v2)
-- For existing databases with the original schema.sql
-- Generated: 2025-12-30
-- ============================================================================
--
-- This migration adds ONLY the missing components to an existing database.
-- Run this if you already have the base schema from schema.sql
--
-- ============================================================================

-- Enable pgcrypto if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Profiles: Add updated_at if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Plans: Add missing columns
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS price_yearly INTEGER,
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Interview Sessions: Add missing columns
ALTER TABLE public.interview_sessions
ADD COLUMN IF NOT EXISTS extension_session_id TEXT,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS credit_deducted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS credit_deducted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Credits Ledger: Add missing columns
ALTER TABLE public.credits_ledger
ADD COLUMN IF NOT EXISTS balance_after INTEGER,
ADD COLUMN IF NOT EXISTS reference_type TEXT,
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- LLM Providers: Add missing columns
ALTER TABLE public.llm_providers
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS api_base_url TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- LLM Models: Add missing columns
ALTER TABLE public.llm_models
ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cost_per_1k_input_tokens NUMERIC(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_1k_output_tokens NUMERIC(10, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 4096,
ADD COLUMN IF NOT EXISTS supports_vision BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS supports_function_calling BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================================================
-- 2. RENAME TABLES (if needed)
-- ============================================================================

-- Rename subscriptions to user_plans if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions' AND table_schema = 'public') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_plans' AND table_schema = 'public') THEN
            ALTER TABLE public.subscriptions RENAME TO user_plans;
        END IF;
    END IF;
END $$;

-- Add missing columns to user_plans (formerly subscriptions)
ALTER TABLE public.user_plans
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update status check constraint if needed
ALTER TABLE public.user_plans 
DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE public.user_plans 
ADD CONSTRAINT user_plans_status_check 
CHECK (status IN ('active', 'cancelled', 'past_due', 'trialing', 'paused'));

-- ============================================================================
-- 3. CREATE NEW TABLES
-- ============================================================================

-- Session Commands (for console <-> extension communication)
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

-- LLM Assignments
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

-- Audit Log
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
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
-- 4. ENABLE RLS ON NEW TABLES
-- ============================================================================

ALTER TABLE public.session_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. ADD MISSING RLS POLICIES
-- ============================================================================

-- Session Commands Policies
DROP POLICY IF EXISTS "session_commands_select_own" ON public.session_commands;
CREATE POLICY "session_commands_select_own" ON public.session_commands
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.interview_sessions 
                WHERE id = session_commands.session_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "session_commands_insert_own" ON public.session_commands;
CREATE POLICY "session_commands_insert_own" ON public.session_commands
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.interview_sessions 
                WHERE id = session_commands.session_id AND user_id = auth.uid())
    );

DROP POLICY IF EXISTS "session_commands_update_own" ON public.session_commands;
CREATE POLICY "session_commands_update_own" ON public.session_commands
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.interview_sessions 
                WHERE id = session_commands.session_id AND user_id = auth.uid())
    );

-- LLM Assignments Policies
DROP POLICY IF EXISTS "llm_assignments_select_own" ON public.llm_assignments;
CREATE POLICY "llm_assignments_select_own" ON public.llm_assignments
    FOR SELECT USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_plans up
            WHERE up.plan_id = llm_assignments.plan_id 
            AND up.user_id = auth.uid()
            AND up.status = 'active'
        )
    );

DROP POLICY IF EXISTS "llm_assignments_admin_all" ON public.llm_assignments;
CREATE POLICY "llm_assignments_admin_all" ON public.llm_assignments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Audit Log Policies
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
CREATE POLICY "audit_log_select_admin" ON public.audit_log
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================================================
-- 6. UPDATE EXISTING POLICIES FOR BETTER SECURITY
-- ============================================================================

-- Credits Ledger: Ensure no UPDATE/DELETE, add admin INSERT
DROP POLICY IF EXISTS "credits_insert_admin" ON public.credits_ledger;
CREATE POLICY "credits_insert_admin" ON public.credits_ledger
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Profiles: Prevent role self-escalation
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- ============================================================================
-- 7. CREATE ATOMIC CREDIT FUNCTIONS
-- ============================================================================

-- Deduct credits with race-condition protection
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
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    -- Lock rows for atomic operation
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    v_new_balance := v_current_balance - p_amount;
    
    INSERT INTO public.credits_ledger (
        user_id, amount, balance_after, description, 
        reference_type, reference_id, created_by
    ) VALUES (
        p_user_id, -p_amount, v_new_balance, p_description,
        p_reference_type, p_reference_id, auth.uid()
    );
    
    RETURN TRUE;
END;
$$;

-- Grant credits (admin/system only)
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
    SELECT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) INTO v_is_admin;
    
    IF auth.uid() IS NOT NULL AND NOT v_is_admin THEN
        RAISE EXCEPTION 'Only admins can grant credits';
    END IF;
    
    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger WHERE user_id = p_user_id;
    
    v_new_balance := v_current_balance + p_amount;
    
    INSERT INTO public.credits_ledger (
        user_id, amount, balance_after, description,
        reference_type, reference_id, created_by
    ) VALUES (
        p_user_id, p_amount, v_new_balance, p_description,
        p_reference_type, p_reference_id, auth.uid()
    );
    
    RETURN TRUE;
END;
$$;

-- Get balance function
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(amount), 0)::INTEGER
    FROM public.credits_ledger WHERE user_id = p_user_id;
$$;

-- ============================================================================
-- 8. SESSION STATE TRANSITION TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_session_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    CASE OLD.status
        WHEN 'created' THEN
            IF NEW.status NOT IN ('active', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid transition: created can only go to active or cancelled';
            END IF;
            IF NEW.status = 'active' THEN
                NEW.started_at := COALESCE(NEW.started_at, NOW());
            END IF;
            
        WHEN 'active' THEN
            IF NEW.status NOT IN ('completed', 'failed', 'cancelled') THEN
                RAISE EXCEPTION 'Invalid transition: active can only go to completed, failed, or cancelled';
            END IF;
            NEW.ended_at := COALESCE(NEW.ended_at, NOW());
            
        WHEN 'completed' THEN
            RAISE EXCEPTION 'Cannot change status of completed session';
            
        WHEN 'failed' THEN
            RAISE EXCEPTION 'Cannot change status of failed session';
            
        WHEN 'cancelled' THEN
            RAISE EXCEPTION 'Cannot change status of cancelled session';
    END CASE;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_session_transition ON public.interview_sessions;
CREATE TRIGGER trigger_validate_session_transition
    BEFORE UPDATE ON public.interview_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_session_transition();

-- ============================================================================
-- 9. UPDATE HANDLE_NEW_USER TO USE NEW LEDGER COLUMNS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'user'
    );
    
    INSERT INTO public.credits_ledger (
        user_id, amount, balance_after, description, reference_type
    ) VALUES (
        NEW.id, 1, 1, 'Welcome Bonus - Thank you for signing up!', 'bonus'
    );
    
    RETURN NEW;
END;
$$;

-- ============================================================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

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
-- 11. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON public.session_commands TO authenticated;
GRANT SELECT ON public.llm_assignments TO authenticated;
GRANT SELECT ON public.audit_log TO authenticated;

GRANT EXECUTE ON FUNCTION public.deduct_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.grant_credits TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_credit_balance TO authenticated;

-- ============================================================================
-- 12. CREATE PARTIAL UNIQUE INDEX FOR ACTIVE SUBSCRIPTIONS
-- ============================================================================

DROP INDEX IF EXISTS idx_user_plans_active_unique;
CREATE UNIQUE INDEX idx_user_plans_active_unique 
    ON public.user_plans(user_id) 
    WHERE status IN ('active', 'trialing');

-- ============================================================================
-- END OF INCREMENTAL MIGRATION
-- ============================================================================
