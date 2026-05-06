REVOKE EXECUTE ON FUNCTION public.maintain_webhook_metrics() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.maintain_webhook_metrics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.maintain_webhook_metrics() FROM authenticated;

ALTER TABLE public.webhook_delivery_metrics_y2026m05 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_metrics_y2026m06 ENABLE ROW LEVEL SECURITY;

-- Limpar a tabela de backup para economizar espaço
DROP TABLE public.webhook_delivery_metrics_old;
