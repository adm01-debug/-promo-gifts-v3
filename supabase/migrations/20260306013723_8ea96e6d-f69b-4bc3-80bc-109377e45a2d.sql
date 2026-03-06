-- FIX 1: profiles - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- FIX 2: order_items - Remove open SELECT, keep admin-only
DROP POLICY IF EXISTS "Authenticated users can read order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

CREATE POLICY "Admins can manage order items"
  ON public.order_items FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- FIX 3: product_views - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Admins can read all views" ON public.product_views;
DROP POLICY IF EXISTS "Users can read own views" ON public.product_views;
DROP POLICY IF EXISTS "Users can insert own views" ON public.product_views;

CREATE POLICY "Users can view own views"
  ON public.product_views FOR SELECT
  TO authenticated
  USING (seller_id = auth.uid());

CREATE POLICY "Admins can read all views"
  ON public.product_views FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own views"
  ON public.product_views FOR INSERT
  TO authenticated
  WITH CHECK (seller_id = auth.uid());

-- FIX 4: seller_carts - Recreate as PERMISSIVE with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own carts" ON public.seller_carts;
CREATE POLICY "Users can manage own carts"
  ON public.seller_carts FOR ALL
  TO authenticated
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- FIX 5: seller_cart_items - Recreate as PERMISSIVE with WITH CHECK
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.seller_cart_items;
CREATE POLICY "Users can manage own cart items"
  ON public.seller_cart_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM seller_carts c
    WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM seller_carts c
    WHERE c.id = seller_cart_items.cart_id AND c.seller_id = auth.uid()
  ));

-- FIX 6: user_roles - Recreate as PERMISSIVE
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));