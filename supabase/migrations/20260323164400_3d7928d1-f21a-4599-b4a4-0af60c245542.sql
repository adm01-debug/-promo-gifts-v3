-- Remove insecure INSERT policies from login_attempts
DROP POLICY IF EXISTS "Anon can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;

-- Add policy allowing only service_role to insert (Edge Function uses service_role)
CREATE POLICY "Service role can insert login attempts"
ON public.login_attempts
FOR INSERT
TO service_role
WITH CHECK (true);