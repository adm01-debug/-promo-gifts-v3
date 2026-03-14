
-- Tabela para persistir queries lentas detectadas pela telemetria
CREATE TABLE public.query_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  table_name text,
  rpc_name text,
  duration_ms integer NOT NULL,
  record_count integer,
  query_limit integer,
  query_offset integer,
  count_mode text,
  severity text NOT NULL DEFAULT 'slow', -- 'slow' or 'very_slow' or 'error'
  error_message text,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index para queries recentes e por severidade
CREATE INDEX idx_query_telemetry_created ON public.query_telemetry (created_at DESC);
CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry (severity, created_at DESC);

-- RLS: somente admins podem ler
ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read telemetry"
  ON public.query_telemetry
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-cleanup: não precisa de INSERT policy pois será feito via service_role no edge function
-- Permitir inserção sem auth (edge function usa service_role)
