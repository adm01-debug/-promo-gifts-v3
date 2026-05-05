-- 1. Recriar função Geo com hardening
CREATE OR REPLACE FUNCTION public.fn_check_geo_access(p_country_code TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_enabled BOOLEAN;
    v_is_allowed BOOLEAN;
BEGIN
    SELECT (setting_value->>'enabled')::BOOLEAN INTO v_enabled FROM public.security_settings WHERE setting_key = 'geo_blocking';
    IF v_enabled IS NOT TRUE THEN RETURN true; END IF;
    
    SELECT EXISTS(SELECT 1 FROM public.geo_allowed_countries WHERE country_code = UPPER(p_country_code) AND is_active = true) INTO v_is_allowed;
    RETURN v_is_allowed;
EXCEPTION WHEN OTHERS THEN
    RETURN true; -- Fail-open se a tabela security_settings ainda não existir ou falhar
END;
$$;

-- 2. Hardening orçamentos
ALTER FUNCTION public.fn_create_quote_v3(JSONB, JSONB) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.fn_create_quote_v3(JSONB, JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_create_quote_v3(JSONB, JSONB) TO authenticated;

-- 3. Hardening rascunhos
ALTER TABLE public.quote_drafts ADD CONSTRAINT quote_drafts_user_id_key UNIQUE (user_id);
CREATE OR REPLACE FUNCTION public.fn_save_quote_draft(p_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_draft_id UUID;
BEGIN
    INSERT INTO public.quote_drafts (user_id, data, last_saved_at)
    VALUES (auth.uid(), p_data, now())
    ON CONFLICT (user_id) DO UPDATE SET data = EXCLUDED.data, last_saved_at = now()
    RETURNING id INTO v_draft_id;
    RETURN v_draft_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.fn_save_quote_draft(JSONB) FROM public;
GRANT EXECUTE ON FUNCTION public.fn_save_quote_draft(JSONB) TO authenticated;

-- 4. RLS Geo
ALTER TABLE public.geo_allowed_countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view allowed countries" ON public.geo_allowed_countries;
CREATE POLICY "Users can view allowed countries" ON public.geo_allowed_countries FOR SELECT USING (true);
