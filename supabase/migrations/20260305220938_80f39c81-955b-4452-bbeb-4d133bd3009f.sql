
-- 1. category_icons
CREATE TABLE public.category_icons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name text NOT NULL,
  icon text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read category icons" ON public.category_icons FOR SELECT USING (true);

-- 2. product_views (analytics)
CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text,
  product_sku text,
  product_name text,
  seller_id uuid,
  view_type text DEFAULT 'detail',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own views" ON public.product_views FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());
CREATE POLICY "Users can read own views" ON public.product_views FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Admins can read all views" ON public.product_views FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 3. product_groups
CREATE TABLE public.product_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_code text NOT NULL,
  group_name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read groups" ON public.product_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage groups" ON public.product_groups FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. product_group_members
CREATE TABLE public.product_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_group_id uuid REFERENCES public.product_groups(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  use_group_rules boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read members" ON public.product_group_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage members" ON public.product_group_members FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 5. product_components
CREATE TABLE public.product_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  component_code text NOT NULL,
  component_name text NOT NULL,
  is_personalizable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read components" ON public.product_components FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage components" ON public.product_components FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 6. order_items (for recommendations/analytics)
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text,
  product_id text,
  product_sku text,
  product_name text,
  product_image_url text,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read order items" ON public.order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
