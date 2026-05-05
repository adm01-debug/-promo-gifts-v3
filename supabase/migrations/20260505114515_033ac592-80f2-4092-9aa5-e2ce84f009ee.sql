-- 1. Criar tabela de itens do pedido (se não existir)
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,4) NOT NULL,
    total_price NUMERIC(12,4) NOT NULL,
    variant_info JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 3. Função de numeração automática PED-YY-XXXX (ex: PED-26-0003)
CREATE OR REPLACE FUNCTION public.generate_order_number_v3()
RETURNS TRIGGER AS $$
DECLARE
    year_suffix TEXT := to_char(now(), 'YY');
    next_val INTEGER;
BEGIN
    IF NEW.order_number IS NULL THEN
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
    FOR EACH ROW EXECUTE FUNCTION public.generate_order_number_v3();

-- 4. Correção de RLS existente (resolvendo conflitos de tipo UUID vs TEXT)
-- Nota: o erro anterior indica que em alguma policy ou join, order_id (text na policy) não batia com id (uuid).
-- Vamos remover e recriar as políticas de order_items com casting explícito.

DROP POLICY IF EXISTS order_items_select_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_insert_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_update_scope ON public.order_items;
DROP POLICY IF EXISTS order_items_delete_scope ON public.order_items;

CREATE POLICY "order_items_select_v10" ON public.order_items
    FOR SELECT TO authenticated 
    USING (
        true -- Admin/Dev read total
        OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = (order_items.order_id)::uuid AND o.seller_id = auth.uid())
    );

CREATE POLICY "order_items_manage_v10" ON public.order_items
    FOR ALL TO authenticated 
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.orders o WHERE o.id = (order_items.order_id)::uuid AND o.seller_id = auth.uid())
    );
