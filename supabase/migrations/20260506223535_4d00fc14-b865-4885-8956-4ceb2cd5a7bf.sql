-- 1. Renomear tabela atual
ALTER TABLE public.webhook_delivery_metrics RENAME TO webhook_delivery_metrics_old;

-- 2. Criar tabela particionada com o schema completo
CREATE TABLE public.webhook_delivery_metrics (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    request_id TEXT,
    event_type TEXT,
    source TEXT,
    direction TEXT DEFAULT 'inbound',
    endpoint TEXT,
    http_status INT,
    duration_ms INT,
    attempt INT DEFAULT 1,
    success BOOLEAN DEFAULT true,
    error_class TEXT,
    error_message TEXT,
    payload_bytes INT,
    metadata JSONB DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
) PARTITION BY RANGE (occurred_at);

-- 3. Criar partições iniciais
CREATE TABLE public.webhook_delivery_metrics_y2026m05 PARTITION OF public.webhook_delivery_metrics
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE public.webhook_delivery_metrics_y2026m06 PARTITION OF public.webhook_delivery_metrics
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

-- 4. Habilitar RLS
ALTER TABLE public.webhook_delivery_metrics ENABLE ROW LEVEL SECURITY;

-- 5. RPC para manutenção
CREATE OR REPLACE FUNCTION public.maintain_webhook_metrics()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    partition_name TEXT;
    next_month DATE := date_trunc('month', now() + interval '1 month');
    next_month_end DATE := date_trunc('month', now() + interval '2 month');
BEGIN
    DELETE FROM public.webhook_delivery_metrics WHERE occurred_at < now() - INTERVAL '90 days';

    partition_name := 'webhook_delivery_metrics_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = partition_name) THEN
        EXECUTE format('CREATE TABLE public.%I PARTITION OF public.webhook_delivery_metrics FOR VALUES FROM (%L) TO (%L)', 
            partition_name, next_month, next_month_end);
    END IF;
END;
$$;

-- 6. Migrar dados (limitado para evitar timeout)
INSERT INTO public.webhook_delivery_metrics 
SELECT id, request_id, event_type, source, direction, endpoint, http_status, duration_ms, attempt, success, error_class, error_message, payload_bytes, metadata, occurred_at 
FROM public.webhook_delivery_metrics_old 
WHERE occurred_at >= '2026-05-01';

-- DROP TABLE public.webhook_delivery_metrics_old;
