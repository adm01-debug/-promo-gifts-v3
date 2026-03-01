
-- Add UPDATE policy for generated_mockups so layout capture can update layout_url
CREATE POLICY "Sellers can update their own mockups"
ON public.generated_mockups
FOR UPDATE
USING (seller_id = auth.uid())
WITH CHECK (seller_id = auth.uid());
