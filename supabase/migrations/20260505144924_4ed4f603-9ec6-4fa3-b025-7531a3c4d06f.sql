-- Reforço de RLS para Itens de Pedido e Orçamento (Herança lógica)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso a itens via pedido" ON public.order_items;
CREATE POLICY "Acesso a itens via pedido"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id
  )
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Acesso a itens via orcamento" ON public.quote_items;
CREATE POLICY "Acesso a itens via orcamento"
ON public.quote_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_items.quote_id
  )
);

-- Índices para Performance de Busca e Paginação
CREATE INDEX IF NOT EXISTS idx_orders_number_search ON public.orders USING gin (order_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quotes_number_search ON public.quotes USING gin (quote_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created ON public.orders (seller_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_status_created ON public.quotes (seller_id, status, created_at DESC);
