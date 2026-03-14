
CREATE POLICY "Admins can delete telemetry"
ON public.query_telemetry FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert telemetry"
ON public.query_telemetry FOR INSERT
TO authenticated
WITH CHECK (true);
