-- 1. Remover todas as políticas que dependem de order_id
DROP POLICY IF EXISTS "order_items_select_v10" ON public.order_items;
DROP POLICY IF EXISTS "order_items_manage_v10" ON public.order_items;
DROP POLICY IF EXISTS "order_items_select_scope" ON public.order_items;
DROP POLICY IF EXISTS "order_items_insert_scope" ON public.order_items;
DROP POLICY IF EXISTS "order_items_update_scope" ON public.order_items;
DROP POLICY IF EXISTS "order_items_delete_scope" ON public.order_items;

-- 2. Tratar a tabela order_items para garantir consistência de tipos
DO $$ 
BEGIN
    -- Se order_id for text, converter para uuid
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'order_id') = 'text' THEN
        ALTER TABLE public.order_items ALTER COLUMN order_id TYPE UUID USING order_id::uuid;
    END IF;

    -- Adicionar colunas de precificação se faltarem
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'total_price') THEN
        ALTER TABLE public.order_items ADD COLUMN total_price NUMERIC(12,4);
    END IF;
    
    -- Ajustar precisão de unit_price
    ALTER TABLE public.order_items ALTER COLUMN unit_price TYPE NUMERIC(12,4);
END $$;

-- 3. Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 4. Função de numeração automática PED-YY-XXXX (ex: PED-26-0005)
CREATE OR REPLACE FUNCTION public.generate_order_number_v5()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix TEXT := to_char(now(), 'YY');
    next_val INTEGER;
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        SELECT count(*) + 1 INTO next_val 
        FROM public.orders 
        WHERE order_number LIKE 'PED-' || year_suffix || '-%';
        
        NEW.order_number := 'PED-' || year_suffix || '-' || lpad(next_val::text, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_generate_order_number ON public.orders;
CREATE TRIGGER tr_generate_order_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number_v5();

-- 5. Restaurar Políticas RLS
DROP POLICY IF EXISTS "orders_select_v10" ON public.orders;
DROP POLICY IF EXISTS "orders_manage_v10" ON public.orders;

-- Pedidos (Orders)
CREATE POLICY "orders_select_v10" ON public.orders
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "orders_manage_v10" ON public.orders
    FOR ALL TO authenticated USING (seller_id = auth.uid()) WITH CHECK (seller_id = auth.uid());

-- Itens de Pedido (Order Items)
CREATE POLICY "order_items_select_v10" ON public.order_items
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "order_items_manage_v10" ON public.order_items
    FOR ALL TO authenticated 
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.seller_id = auth.uid())
    );
