-- Sync order_items schema
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS color_name TEXT,
ADD COLUMN IF NOT EXISTS color_hex TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS size_code TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS kit_group_id UUID,
ADD COLUMN IF NOT EXISTS kit_name TEXT;

-- Create order_item_personalizations table
CREATE TABLE IF NOT EXISTS public.order_item_personalizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    technique_id UUID,
    technique_name TEXT,
    location_id UUID,
    location_name TEXT,
    image_url TEXT,
    personalization_text TEXT,
    price_adjustment DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.order_item_personalizations ENABLE ROW LEVEL SECURITY;

-- Policies for order_item_personalizations (match order_items logic)
CREATE POLICY "order_item_p_select_scope" ON public.order_item_personalizations
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_personalizations.order_item_id
        AND (o.seller_id = auth.uid() OR public.can_view_all_sales())
    )
);

-- Atomic conversion function
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(
    p_quote_id UUID,
    p_seller_id UUID,
    p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote RECORD;
    v_order_id UUID;
    v_order_number TEXT;
    v_item RECORD;
    v_new_item_id UUID;
BEGIN
    -- 1. Get quote data
    SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Orçamento não encontrado';
    END IF;

    IF v_quote.status != 'approved' THEN
        RAISE EXCEPTION 'Apenas orçamentos aprovados podem ser convertidos';
    END IF;

    -- 2. Check for existing order
    IF EXISTS (SELECT 1 FROM public.orders WHERE quote_id = p_quote_id) THEN
        RAISE EXCEPTION 'Este orçamento já foi convertido em pedido';
    END IF;

    -- 3. Create order
    INSERT INTO public.orders (
        seller_id, organization_id, quote_id, client_id, client_name, client_email,
        client_phone, client_company, subtotal, discount_amount, shipping_cost,
        shipping_type, total, payment_terms, delivery_time, notes, internal_notes,
        status, fulfillment_status
    ) VALUES (
        p_seller_id, COALESCE(p_organization_id, v_quote.organization_id), p_quote_id, 
        v_quote.client_id, v_quote.client_name, v_quote.client_email,
        v_quote.client_phone, v_quote.client_company, v_quote.subtotal, 
        v_quote.discount_amount, v_quote.shipping_cost,
        v_quote.shipping_type, v_quote.total, v_quote.payment_terms, 
        v_quote.delivery_time, v_quote.notes, v_quote.internal_notes,
        'confirmed', 'unfulfilled'
    ) RETURNING id, order_number INTO v_order_id, v_order_number;

    -- 4. Copy items
    FOR v_item IN SELECT * FROM public.quote_items WHERE quote_id = p_quote_id LOOP
        INSERT INTO public.order_items (
            order_id, organization_id, product_id, product_sku, product_name,
            product_image_url, quantity, unit_price, color_name, color_hex,
            notes, size_code, gender, kit_group_id, kit_name
        ) VALUES (
            v_order_id, COALESCE(p_organization_id, v_quote.organization_id), 
            v_item.product_id, v_item.product_sku, v_item.product_name,
            v_item.product_image_url, v_item.quantity, v_item.unit_price, 
            v_item.color_name, v_item.color_hex,
            v_item.notes, v_item.size_code, v_item.gender, 
            v_item.kit_group_id, v_item.kit_name
        ) RETURNING id INTO v_new_item_id;

        -- 5. Copy personalizations for each item
        INSERT INTO public.order_item_personalizations (
            order_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        )
        SELECT 
            v_new_item_id, technique_id, technique_name, location_id, 
            location_name, image_url, personalization_text, price_adjustment
        FROM public.quote_item_personalizations
        WHERE quote_item_id = v_item.id;
    END LOOP;

    -- 6. Update quote status
    UPDATE public.quotes SET status = 'converted' WHERE id = p_quote_id;

    RETURN jsonb_build_object(
        'id', v_order_id,
        'order_number', v_order_number,
        'status', 'confirmed'
    );
END;
$$;
