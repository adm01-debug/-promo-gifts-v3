CREATE TABLE public.app_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    rating TEXT, -- good, needs-improvement, poor
    request_id TEXT,
    page_url TEXT,
    user_agent TEXT,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para análise temporal e por métrica
CREATE INDEX idx_app_vitals_name_created ON public.app_vitals(metric_name, created_at DESC);
CREATE INDEX idx_app_vitals_created ON public.app_vitals(created_at DESC);

-- RLS
ALTER TABLE public.app_vitals ENABLE ROW LEVEL SECURITY;

-- Revogar acesso direto
REVOKE ALL ON public.app_vitals FROM public;
REVOKE ALL ON public.app_vitals FROM anon;
REVOKE ALL ON public.app_vitals FROM authenticated;

-- Função para registrar vitals (usada pela edge)
CREATE OR REPLACE FUNCTION public.record_app_vital(_name TEXT, _value NUMERIC, _rating TEXT, _req_id TEXT, _url TEXT, _ua TEXT, _uid UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.app_vitals (metric_name, metric_value, rating, request_id, page_url, user_agent, user_id)
    VALUES (_name, _value, _rating, _req_id, _url, _ua, _uid);
$$;

REVOKE EXECUTE ON FUNCTION public.record_app_vital(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_app_vital(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_app_vital(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT, UUID) FROM authenticated;

-- Cleanup automático (> 30 dias de métricas brutas é suficiente)
-- SELECT cron.schedule('cleanup-app-vitals', '0 4 * * *', 'DELETE FROM app_vitals WHERE created_at < now() - INTERVAL ''30 days''');
