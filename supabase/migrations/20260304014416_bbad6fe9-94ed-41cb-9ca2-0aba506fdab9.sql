
-- 1) user_onboarding
CREATE TABLE public.user_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  has_completed_tour boolean NOT NULL DEFAULT false,
  current_step integer NOT NULL DEFAULT 0,
  completed_steps jsonb DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own onboarding" ON public.user_onboarding FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own onboarding" ON public.user_onboarding FOR UPDATE USING (user_id = auth.uid());

-- 2) expert_conversations
CREATE TABLE public.expert_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text,
  title text NOT NULL DEFAULT 'Nova Conversa',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expert_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own conversations" ON public.expert_conversations FOR ALL USING (seller_id = auth.uid());

-- 3) expert_messages
CREATE TABLE public.expert_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.expert_conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expert_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON public.expert_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.expert_conversations c WHERE c.id = conversation_id AND c.seller_id = auth.uid()));

-- 4) seller_carts
CREATE TABLE public.seller_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id text NOT NULL,
  company_name text NOT NULL,
  company_location text,
  company_logo_url text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own carts" ON public.seller_carts FOR ALL USING (seller_id = auth.uid());

-- 5) seller_cart_items
CREATE TABLE public.seller_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.seller_carts(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_sku text,
  product_image_url text,
  product_price numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1,
  color_name text,
  color_hex text,
  notes text,
  sort_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seller_cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cart items" ON public.seller_cart_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.seller_carts c WHERE c.id = cart_id AND c.seller_id = auth.uid()));
