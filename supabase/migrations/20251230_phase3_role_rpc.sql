-- ============================================================================
-- PHASE 3: Role Validation RPC Function
-- Add this to your Supabase database
-- ============================================================================

-- Validate user role server-side
-- Returns TRUE if user has the required role or higher
CREATE OR REPLACE FUNCTION public.validate_user_role(p_required_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_role TEXT;
BEGIN
    -- Get the current user's role
    SELECT role INTO v_user_role
    FROM public.profiles
    WHERE id = auth.uid();
    
    -- If no profile found, deny access
    IF v_user_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Role hierarchy: admin > user
    CASE p_required_role
        WHEN 'user' THEN
            -- Both 'user' and 'admin' satisfy 'user' requirement
            RETURN v_user_role IN ('user', 'admin');
        WHEN 'admin' THEN
            -- Only 'admin' satisfies 'admin' requirement
            RETURN v_user_role = 'admin';
        ELSE
            -- Unknown role, deny
            RETURN FALSE;
    END CASE;
END;
$$;

COMMENT ON FUNCTION public.validate_user_role IS 'Server-side role validation. Returns TRUE if user meets role requirement.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.validate_user_role TO authenticated;

-- ============================================================================
-- Get current user's role (helper function)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_role IS 'Returns the current authenticated user role';

GRANT EXECUTE ON FUNCTION public.get_my_role TO authenticated;
