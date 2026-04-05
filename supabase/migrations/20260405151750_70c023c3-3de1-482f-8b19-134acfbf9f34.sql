-- Create voice command analytics table
CREATE TABLE public.voice_command_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  transcript TEXT NOT NULL,
  action TEXT NOT NULL,
  response TEXT,
  data JSONB DEFAULT '{}'::jsonb,
  duration_ms INTEGER,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own voice logs"
ON public.voice_command_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert own voice logs"
ON public.voice_command_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Admins/managers can view all logs
CREATE POLICY "Admins can view all voice logs"
ON public.voice_command_logs
FOR SELECT
TO authenticated
USING (public.is_manager_or_admin());

-- Index for querying by user and date
CREATE INDEX idx_voice_command_logs_user_created 
ON public.voice_command_logs (user_id, created_at DESC);