-- 1. Tabelas de Segurança (Garantindo existência)
CREATE TABLE IF NOT EXISTS public.access_security_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_whitelist_enabled BOOLEAN DEFAULT false,
    city_whitelist_enabled BOOLEAN DEFAULT false,
    block_unknown_locations BOOLEAN DEFAULT false,
    max_failed_attempts INTEGER DEFAULT 5,
    lockout_duration_minutes INTEGER DEFAULT 15,
    strict_access_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir config padrão se não existir
INSERT INTO public.access_security_settings (ip_whitelist_enabled)
SELECT false WHERE NOT EXISTS (SELECT 1 FROM public.access_security_settings);

CREATE TABLE IF NOT EXISTS public.geo_allowed_countries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code CHAR(2) UNIQUE NOT NULL,
    country_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. RPC Atômico de Orçamentos V3
CREATE OR REPLACE FUNCTION public.fn_create_quote_v3(
    p_quote_data JSONB,
    p_items_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_quote_id UUID;
    v_item RECORD;
    v_pers RECORD;
    v_new_item_id UUID;
    v_seller_id UUID := auth.uid();
    v_quote_number TEXT;
BEGIN
    -- Validação básica
    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- 1. Inserir Header
    INSERT INTO public.quotes (
        seller_id, client_id, client_name, client_email, client_phone, client_company, client_cnpj,
        status, subtotal, discount_percent, discount_amount, total,
        notes, internal_notes, valid_until, payment_terms, delivery_time,
        shipping_type, shipping_cost, negotiation_markup_percent,
        organization_id
    ) VALUES (
        v_seller_id,
        (p_quote_data->>'client_id'),
        (p_quote_data->>'client_name'),
        (p_quote_data->>'client_email'),
        (p_quote_data->>'client_phone'),
        (p_quote_data->>'client_company'),
        (p_quote_data->>'client_cnpj'),
        COALESCE(p_quote_data->>'status', 'draft'),
        (p_quote_data->>'subtotal')::NUMERIC,
        COALESCE((p_quote_data->>'discount_percent')::NUMERIC, 0),
        COALESCE((p_quote_data->>'discount_amount')::NUMERIC, 0),
        (p_quote_data->>'total')::NUMERIC,
        (p_quote_data->>'notes'),
        (p_quote_data->>'internal_notes'),
        (p_quote_data->>'valid_until')::TIMESTAMPTZ,
        (p_quote_data->>'payment_terms'),
        (p_quote_data->>'delivery_time'),
        (p_quote_data->>'shipping_type'),
        COALESCE((p_quote_data->>'shipping_cost')::NUMERIC, 0),
        COALESCE((p_quote_data->>'negotiation_markup_percent')::NUMERIC, 0),
        (p_quote_data->>'organization_id')::UUID
    ) RETURNING id, quote_number INTO v_quote_id, v_quote_number;

    -- 2. Inserir Itens
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items_data)
    LOOP
        INSERT INTO public.quote_items (
            quote_id, product_id, product_name, product_sku, product_image_url,
            quantity, unit_price, subtotal, color_name, color_hex,
            size_code, gender, bitrix_product_id, sort_order, notes
        ) VALUES (
            v_quote_id,
            (v_item.value->>'product_id'),
            (v_item.value->>'product_name'),
            (v_item.value->>'product_sku'),
            (v_item.value->>'product_image_url'),
            (v_item.value->>'quantity')::INTEGER,
            (v_item.value->>'unit_price')::NUMERIC,
            (v_item.value->>'subtotal')::NUMERIC,
            (v_item.value->>'color_name'),
            (v_item.value->>'color_hex'),
            (v_item.value->>'size_code'),
            (v_item.value->>'gender'),
            (v_item.value->>'bitrix_product_id'),
            COALESCE((v_item.value->>'sort_order')::INTEGER, 0),
            (v_item.value->>'notes')
        ) RETURNING id INTO v_new_item_id;

        -- 3. Personalizações
        IF v_item.value ? 'personalizations' THEN
            FOR v_pers IN SELECT * FROM jsonb_array_elements(v_item.value->'personalizations')
            LOOP
                INSERT INTO public.quote_item_personalizations (
                    quote_item_id, technique_id, technique_name,
                    colors_count, positions_count, area_cm2, width_cm, height_cm,
                    setup_cost, unit_cost, total_cost, notes
                ) VALUES (
                    v_new_item_id,
                    (v_pers.value->>'technique_id'),
                    (v_pers.value->>'technique_name'),
                    COALESCE((v_pers.value->>'colors_count')::INTEGER, 1),
                    COALESCE((v_pers.value->>'positions_count')::INTEGER, 1),
                    (v_pers.value->>'area_cm2')::NUMERIC,
                    (v_pers.value->>'width_cm')::NUMERIC,
                    (v_pers.value->>'height_cm')::NUMERIC,
                    COALESCE((v_pers.value->>'setup_cost')::NUMERIC, 0),
                    COALESCE((v_pers.value->>'unit_cost')::NUMERIC, 0),
                    COALESCE((v_pers.value->>'total_cost')::NUMERIC, 0),
                    (v_pers.value->>'notes')
                );
            END LOOP;
        END IF;
    END LOOP;

    -- 4. Log de História
    INSERT INTO public.quote_history (quote_id, user_id, action, description)
    VALUES (v_quote_id, v_seller_id, 'created_v3', 'Orçamento criado via RPC atômico');

    RETURN jsonb_build_object('id', v_quote_id, 'quote_number', v_quote_number);
END;
$$;

-- 3. Rascunhos de Orçamento (Drafts)
CREATE TABLE IF NOT EXISTS public.quote_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    data JSONB NOT NULL,
    last_saved_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quote_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts" 
ON public.quote_drafts FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.fn_save_quote_draft(p_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_draft_id UUID;
BEGIN
    INSERT INTO public.quote_drafts (user_id, data, last_saved_at)
    VALUES (auth.uid(), p_data, now())
    ON CONFLICT (user_id) DO UPDATE SET data = p_data, last_saved_at = now()
    RETURNING id INTO v_draft_id;
    RETURN v_draft_id;
END;
$$;
