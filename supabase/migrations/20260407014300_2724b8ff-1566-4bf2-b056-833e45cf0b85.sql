
-- Add UPDATE policy for service_role on ai_usage_logs
-- This documents the existing behavior where updateAiLog() uses service_role
CREATE POLICY "Service role can update AI usage logs"
ON public.ai_usage_logs
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);
