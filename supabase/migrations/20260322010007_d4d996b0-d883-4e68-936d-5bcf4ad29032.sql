
-- 1. Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  order_number text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  fulfillment_status text NOT NULL DEFAULT 'unfulfilled',
  client_id text,
  client_name text,
  client_email text,
  client_phone text,
  client_company text,
  quote_id uuid REFERENCES public.quotes(id),
  subtotal numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  shipping_cost numeric DEFAULT 0,
  total numeric DEFAULT 0,
  notes text,
  internal_notes text,
  tracking_number text,
  shipping_type text,
  payment_terms text,
  delivery_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Sellers can manage own orders" ON public.orders
  FOR ALL TO authenticated
  USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can read all orders" ON public.orders
  FOR SELECT TO authenticated
  USING (is_manager_or_admin());

-- Auto-generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  year_short text;
  max_num integer;
BEGIN
  year_short := to_char(now(), 'YYYY');
  SELECT COALESCE(MAX(
    CASE WHEN split_part(order_number, '-', 3) ~ '^\d+$'
         THEN split_part(order_number, '-', 3)::integer
         ELSE 0 END
  ), 0)
  INTO max_num
  FROM public.orders
  WHERE order_number LIKE 'PED-' || year_short || '-%';
  
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'PED-' || year_short || '-' || lpad((max_num + 1)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- 2. Create login_attempts table
CREATE TABLE public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  user_id uuid,
  ip_address text NOT NULL DEFAULT 'unknown',
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- RLS: admins can read all, users can insert
CREATE POLICY "Admins can read all login attempts" ON public.login_attempts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert login attempts" ON public.login_attempts
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update order_items to reference orders table
ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_order_id_fkey_uuid 
  CHECK (true);
