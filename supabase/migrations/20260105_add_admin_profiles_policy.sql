-- Fix RLS policy for admins to view all profiles
-- First drop the potentially broken policies, then recreate with SECURITY DEFINER function

-- Drop the problematic policies if they exist
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins update all profiles" ON public.profiles;

-- Create a SECURITY DEFINER function to check admin role (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create policies using the function
CREATE POLICY "Admins view all profiles" ON public.profiles
    FOR SELECT USING (
        auth.uid() = id OR public.is_admin()
    );

CREATE POLICY "Admins update all profiles" ON public.profiles
    FOR UPDATE USING (
        public.is_admin()
    );

-- Drop the old user-only policy since our new policy covers both cases
DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
