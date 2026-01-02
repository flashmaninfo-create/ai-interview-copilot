-- Create sync_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.sync_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    source TEXT NOT NULL CHECK (source IN ('extension', 'console')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.sync_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages for their own sessions
CREATE POLICY "Users can read sync messages for their sessions"
ON public.sync_messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.interview_sessions
        WHERE interview_sessions.id = sync_messages.session_id
        AND interview_sessions.user_id = auth.uid()
    )
);

-- Policy: Users can insert messages for their own sessions
CREATE POLICY "Users can insert sync messages for their sessions"
ON public.sync_messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.interview_sessions
        WHERE interview_sessions.id = sync_messages.session_id
        AND interview_sessions.user_id = auth.uid()
    )
);

-- Add to Realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'sync_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_messages;
  END IF;
END $$;
