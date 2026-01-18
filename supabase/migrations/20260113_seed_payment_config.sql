-- ============================================================================
-- SEED PAYMENT CONFIGURATION
-- Generated: 2026-01-13
-- ============================================================================

-- Insert default Razorpay configuration
-- Note: You should replace 'rzp_test_YOUR_KEY_HERE' with your actual Razorpay Test Key ID
INSERT INTO public.app_config (key, value) VALUES
    (
        'payment_config_v2',
        '{
            "razorpay": {
                "keyId": "rzp_test_YOUR_KEY_HERE", 
                "keySecret": "YOUR_KEY_SECRET_HERE",
                "enabled": true
            },
            "stripe": {
                "enabled": false
            }
        }'::jsonb
    )
ON CONFLICT (key) DO NOTHING;
