-- ============================================================================
-- SEED DEFAULT PRICING PLANS
-- Run this SQL in your Supabase SQL Editor to seed the 3 original pricing plans
-- ============================================================================

-- Delete existing plans if needed (optional - uncomment if you want to replace)
-- DELETE FROM public.plans;

-- Insert the 3 original pricing plans from the landing page
INSERT INTO public.plans (name, slug, description, price_monthly, credits_monthly, features, is_active, sort_order) VALUES
    (
        'Free Trial',
        'free-trial',
        'Perfect for testing the platform',
        0,
        20,
        '["20 credits to start", "Basic AI assistance", "Chrome Extension access", "Single device mode", "Email support"]'::jsonb,
        true,
        1
    ),
    (
        'Professional Pack',
        'professional',
        'Most popular choice for serious job seekers',
        1299,
        180,
        '["180 minutes of interview time", "3 hours of practice time", "Advanced analytics", "Priority email support", "10% savings vs starter", "All features included"]'::jsonb,
        true,
        2
    ),
    (
        'Premium Pack',
        'premium',
        'Best value for comprehensive interview preparation',
        2399,
        360,
        '["360 minutes of interview time", "6 hours of practice time", "Premium analytics dashboard", "24/7 chat support", "20% savings vs starter", "Career coaching session", "Priority AI processing"]'::jsonb,
        true,
        3
    )
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    credits_monthly = EXCLUDED.credits_monthly,
    features = EXCLUDED.features,
    is_active = EXCLUDED.is_active,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

-- Verify the plans were inserted
SELECT id, name, slug, price_monthly, credits_monthly, is_active FROM public.plans ORDER BY sort_order;
