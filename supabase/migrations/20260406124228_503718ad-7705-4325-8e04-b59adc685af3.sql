-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert web vitals" ON public.web_vitals;

-- Recreate with explicit NOT NULL check on auth.uid()
CREATE POLICY "Authenticated users can insert web vitals"
ON public.web_vitals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
);