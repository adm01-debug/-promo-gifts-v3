
DROP POLICY "Authenticated users can insert price history" ON public.product_price_history;
CREATE POLICY "Users can insert own price records"
  ON public.product_price_history FOR INSERT
  TO authenticated
  WITH CHECK (recorded_by = auth.uid());
