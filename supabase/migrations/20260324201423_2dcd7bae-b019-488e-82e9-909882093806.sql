
-- Tabela de locais/áreas de personalização do produto (CRUD local)
CREATE TABLE public.product_personalization_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  component_id uuid REFERENCES public.product_components(id) ON DELETE SET NULL,
  area_name text NOT NULL,
  technique_name text NOT NULL,
  technique_code text,
  location_name text,
  max_width_cm numeric,
  max_height_cm numeric,
  max_colors integer,
  setup_cost numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.product_personalization_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage personalization areas"
  ON public.product_personalization_areas
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can read personalization areas"
  ON public.product_personalization_areas
  FOR SELECT
  TO authenticated
  USING (true);

-- Index para busca por produto
CREATE INDEX idx_personalization_areas_product ON public.product_personalization_areas(product_id);
