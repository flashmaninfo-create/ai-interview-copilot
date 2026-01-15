-- Fix RLS for sync_messages and interview_sessions
-- Ensure authenticated users can INSERT into sync_messages

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."sync_messages";
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON "public"."sync_messages";

CREATE POLICY "Enable all access for authenticated users" ON "public"."sync_messages"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Also ensure interview_sessions policies are permissive
DROP POLICY IF EXISTS "Enable insert for interview sessions" ON "public"."interview_sessions";
DROP POLICY IF EXISTS "Enable select for interview sessions" ON "public"."interview_sessions";
DROP POLICY IF EXISTS "Enable update for interview sessions" ON "public"."interview_sessions";

CREATE POLICY "Enable all access for own sessions" ON "public"."interview_sessions"
AS PERMISSIVE FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Check if session_screenshots needs policy
ALTER TABLE session_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated" ON "public"."session_screenshots";

CREATE POLICY "Enable all access for authenticated" ON "public"."session_screenshots"
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
