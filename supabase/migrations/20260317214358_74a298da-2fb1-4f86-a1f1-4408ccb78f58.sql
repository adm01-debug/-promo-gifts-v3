
-- Tighten anon update policy to only allow response-related updates
DROP POLICY "Anyone can update response" ON public.quote_approval_tokens;

CREATE POLICY "Anon can update response fields only"
  ON public.quote_approval_tokens FOR UPDATE
  TO anon
  USING (status = 'active')
  WITH CHECK (status = 'active');
