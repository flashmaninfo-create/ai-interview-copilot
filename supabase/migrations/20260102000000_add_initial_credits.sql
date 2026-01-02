-- ============================================================================
-- MIGRATION: Add Initial Credits
-- Generated: 2026-01-02
-- ============================================================================
-- 1. Add 5 credits to existing user example@gmail.com
-- 2. Ensure handle_new_user trigger gives 5 credits to new users
-- ============================================================================

-- 1. Add credits to example@gmail.com user
INSERT INTO public.credits_ledger (user_id, amount, description, reference_type)
SELECT 
    p.id,
    5,
    'Welcome Bonus (Initial Setup)',
    'signup'
FROM public.profiles p
WHERE p.email = 'example@gmail.com'
AND NOT EXISTS (
    SELECT 1 FROM public.credits_ledger cl 
    WHERE cl.user_id = p.id AND cl.description LIKE 'Welcome%'
);

-- 2. Ensure the trigger gives 5 credits to new users (recreate if needed)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'user')
  ON CONFLICT (id) DO NOTHING;
  
  -- Give 5 welcome credits to new user
  INSERT INTO public.credits_ledger (user_id, amount, description, reference_type)
  VALUES (new.id, 5, 'Welcome Bonus', 'signup');
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================================
-- VERIFICATION QUERY (run this to check credits after migration)
-- SELECT p.email, COALESCE(SUM(cl.amount), 0) as balance 
-- FROM profiles p 
-- LEFT JOIN credits_ledger cl ON cl.user_id = p.id 
-- GROUP BY p.email;
-- ============================================================================
