-- Add context column to interview_sessions if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'interview_sessions' AND column_name = 'context') THEN 
        ALTER TABLE interview_sessions ADD COLUMN context JSONB DEFAULT '{}'::jsonb; 
    END IF; 
END $$;

-- Fix RLS for sync_messages
-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."sync_messages";
DROP POLICY IF EXISTS "Enable insert for users based on session ownership" ON "public"."sync_messages";

-- Create permissive policy for INSERT for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON "public"."sync_messages"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Ensure interview_sessions allows update/select for owner
CREATE POLICY "Enable insert for users based on user_id" ON "public"."interview_sessions"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE interview_sessions TO authenticated;
GRANT ALL ON TABLE sync_messages TO authenticated;
GRANT ALL ON TABLE interview_sessions TO service_role;
GRANT ALL ON TABLE sync_messages TO service_role;
