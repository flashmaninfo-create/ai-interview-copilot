-- Enable Realtime for interview_sessions and sync_messages
-- This allows the dashboard to receive instant updates when a session starts or changes

-- 1. Enable replication (required for Realtime)
ALTER TABLE public.interview_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.sync_messages REPLICA IDENTITY FULL;

-- 2. Add tables to the supabase_realtime publication
-- Note: 'supabase_realtime' is the default publication created by Supabase
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'interview_sessions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_sessions;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sync_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_messages;
  END IF;
END $$;
