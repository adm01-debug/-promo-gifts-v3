
CREATE TABLE public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_sku text,
  product_name text,
  old_price numeric,
  new_price numeric NOT NULL,
  price_change_percent numeric GENERATED ALWAYS AS (
    CASE WHEN old_price IS NOT NULL AND old_price > 0 
      THEN ROUND(((new_price - old_price) / old_price) * 100, 2)
      ELSE NULL 
    END
  ) STORED,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'sync',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_price_history_product ON public.product_price_history(product_id);
CREATE INDEX idx_price_history_created ON public.product_price_history(created_at DESC);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read price history"
  ON public.product_price_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert price history"
  ON public.product_price_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can delete price history"
  ON public.product_price_history FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
