# Enable Admin Access to All Profiles

By default, Supabase Row Level Security (RLS) usually only allows users to see their own profile. To let Admins see **all** registered users in the Admin Dashboard, you need to add a specific database policy.

### Step 1: Open SQL Editor
Go to your [Supabase Dashboard](https://supabase.com/dashboard/project/_/sql) and open the SQL Editor.

### Step 2: Run this SQL
Copy and run the following script to create a secure `is_admin()` function and the necessary policies.

```sql
-- 1. Create a secure function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create a policy to allow Admins to see ALL profiles
-- (First, drop it if it exists to avoid errors)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING ( public.is_admin() );

-- 3. Allow Admins to update user roles (optional but recommended for admin panel)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can update profiles"
  ON public.profiles
  FOR UPDATE
  USING ( public.is_admin() );
```

### Step 3: Verify
Refresh your Admin Dashboard page. You should now see all registered users in the "User Management" section.
