-- Drop the current INSERT policy that requires auth
DROP POLICY IF EXISTS "Users can insert own login attempts" ON public.login_attempts;

-- Create new INSERT policy allowing both authenticated and anonymous inserts
-- This is needed because failed login attempts happen before auth
CREATE POLICY "Anyone can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Also add anonymous insert capability for pre-auth logging
CREATE POLICY "Anon can insert login attempts"
ON public.login_attempts
FOR INSERT
TO anon
WITH CHECK (true);