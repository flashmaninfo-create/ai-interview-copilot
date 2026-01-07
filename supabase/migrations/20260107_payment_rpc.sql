-- ============================================================================
-- PAYMENT & CREDIT PURCHASE SYSTEM
-- Generated: 2026-01-07
-- ============================================================================

-- 1. Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT DEFAULT 'USD',
    credits_purchased INTEGER NOT NULL,
    plan_id TEXT NOT NULL,           -- 'pro_monthly', 'starter', etc.
    provider TEXT DEFAULT 'mock',    -- 'stripe', 'mock'
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);

-- 2. Purchase RPC (Atomic Transaction)
CREATE OR REPLACE FUNCTION public.purchase_credits(
    p_plan_id TEXT,
    p_amount NUMERIC,
    p_credits INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_payment_id UUID;
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- 1. Record Payment
    INSERT INTO public.payments (user_id, amount, credits_purchased, plan_id)
    VALUES (v_user_id, p_amount, p_credits, p_plan_id)
    RETURNING id INTO v_payment_id;

    -- 2. Add Credits to Ledger
    SELECT COALESCE(SUM(amount), 0) INTO v_current_balance
    FROM public.credits_ledger
    WHERE user_id = v_user_id;

    v_new_balance := v_current_balance + p_credits;

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
        p_credits,
        v_new_balance,
        format('Purchase: %s Plan', p_plan_id),
        'payment',
        v_payment_id,
        v_user_id
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'payment_id', v_payment_id
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_credits TO authenticated;
