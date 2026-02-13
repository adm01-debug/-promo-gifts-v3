-- Drop the restrictive delete policy
DROP POLICY "Sellers can delete their draft quotes" ON public.quotes;

-- Create a new policy allowing sellers to delete their own quotes (any status) and admins to delete any
CREATE POLICY "Sellers can delete their own quotes"
  ON public.quotes
  FOR DELETE
  USING ((seller_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));