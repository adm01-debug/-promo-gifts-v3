
-- Table: ai_usage_logs
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  model text,
  input_tokens integer DEFAULT 0,
  output_tokens integer DEFAULT 0,
  total_tokens integer DEFAULT 0,
  estimated_cost_usd numeric(10,6) DEFAULT 0,
  duration_ms integer,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);
CREATE INDEX idx_ai_usage_logs_function ON public.ai_usage_logs(function_name);
CREATE INDEX idx_ai_usage_logs_user_month ON public.ai_usage_logs(user_id, created_at);

-- RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own AI usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all AI usage logs"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert AI usage logs"
  ON public.ai_usage_logs FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Table: ai_usage_quotas
CREATE TABLE public.ai_usage_quotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL UNIQUE,
  monthly_limit integer NOT NULL DEFAULT 100,
  is_unlimited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read quotas"
  ON public.ai_usage_quotas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage quotas"
  ON public.ai_usage_quotas FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed default quotas
INSERT INTO public.ai_usage_quotas (role, monthly_limit, is_unlimited) VALUES
  ('admin', 0, true),
  ('manager', 500, false),
  ('vendedor', 100, false);

-- Function: check_ai_quota
CREATE OR REPLACE FUNCTION public.check_ai_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _monthly_limit integer;
  _is_unlimited boolean;
  _used integer;
  _month_start timestamptz;
BEGIN
  -- Get user role
  SELECT role INTO _role FROM public.user_roles WHERE user_id = _user_id LIMIT 1;
  IF _role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', 0, 'remaining', 0, 'reason', 'no_role');
  END IF;

  -- Get quota for role
  SELECT monthly_limit, is_unlimited INTO _monthly_limit, _is_unlimited
  FROM public.ai_usage_quotas WHERE role = _role;

  IF _is_unlimited THEN
    SELECT count(*) INTO _used FROM public.ai_usage_logs
    WHERE user_id = _user_id AND created_at >= date_trunc('month', now()) AND status = 'success';
    RETURN jsonb_build_object('allowed', true, 'used', _used, 'limit', -1, 'remaining', -1, 'unlimited', true);
  END IF;

  -- Count usage this month
  SELECT count(*) INTO _used FROM public.ai_usage_logs
  WHERE user_id = _user_id AND created_at >= date_trunc('month', now()) AND status = 'success';

  RETURN jsonb_build_object(
    'allowed', _used < _monthly_limit,
    'used', _used,
    'limit', _monthly_limit,
    'remaining', GREATEST(_monthly_limit - _used, 0),
    'unlimited', false
  );
END;
$$;
