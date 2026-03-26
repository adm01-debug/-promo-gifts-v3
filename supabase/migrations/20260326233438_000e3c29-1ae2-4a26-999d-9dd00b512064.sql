CREATE POLICY "Users can read own web vitals"
ON public.web_vitals
FOR SELECT
TO authenticated
USING (user_id = auth.uid());