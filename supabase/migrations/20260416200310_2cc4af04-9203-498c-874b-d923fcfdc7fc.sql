-- ========== product_sync_logs ==========
CREATE TABLE IF NOT EXISTS public.product_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_inserted INTEGER NOT NULL DEFAULT 0,
  records_updated INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  payload JSONB,
  error_message TEXT,
  triggered_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sync_logs_created ON public.product_sync_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sync_logs_source ON public.product_sync_logs(source, status);

ALTER TABLE public.product_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view product sync logs"
  ON public.product_sync_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert product sync logs"
  ON public.product_sync_logs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ========== product_component_locations ==========
CREATE TABLE IF NOT EXISTS public.product_component_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES public.product_components(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  location_name TEXT NOT NULL,
  description TEXT,
  max_width_cm NUMERIC(6,2),
  max_height_cm NUMERIC(6,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(component_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_product_comp_loc_component ON public.product_component_locations(component_id);

ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view component locations"
  ON public.product_component_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage component locations"
  ON public.product_component_locations FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_comp_loc_updated_at
  BEFORE UPDATE ON public.product_component_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();