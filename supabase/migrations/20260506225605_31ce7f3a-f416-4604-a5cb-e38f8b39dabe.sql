-- Update or Create RPC for recording vitals with correct column mapping
CREATE OR REPLACE FUNCTION public.record_app_vital(
  _name TEXT,
  _value DOUBLE PRECISION,
  _rating TEXT DEFAULT NULL,
  _req_id TEXT DEFAULT NULL,
  _url TEXT DEFAULT NULL,
  _ua TEXT DEFAULT NULL,
  _uid UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_vitals (
    metric_name, 
    metric_value, 
    rating, 
    request_id, 
    page_url, 
    user_agent, 
    user_id
  )
  VALUES (
    _name, 
    _value, 
    _rating, 
    _req_id, 
    _url, 
    _ua, 
    _uid
  );
END;
$$;

-- Correct indexes
CREATE INDEX IF NOT EXISTS idx_app_vitals_metric_name_created ON public.app_vitals(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_vitals_request_id ON public.app_vitals(request_id);
