
-- Fix INSERT policy to handle NULL organization_id
DROP POLICY IF EXISTS "Order seller can insert items" ON public.order_items;
CREATE POLICY "Order seller can insert items"
ON public.order_items FOR INSERT TO authenticated
WITH CHECK (
  is_manager_or_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
    )
    AND (
      organization_id IS NULL
      OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  )
);

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Order seller can update items" ON public.order_items;
CREATE POLICY "Order seller can update items"
ON public.order_items FOR UPDATE TO authenticated
USING (
  is_manager_or_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
    )
    AND (
      organization_id IS NULL
      OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  )
);

-- Fix DELETE policy
DROP POLICY IF EXISTS "Order seller can delete items" ON public.order_items;
CREATE POLICY "Order seller can delete items"
ON public.order_items FOR DELETE TO authenticated
USING (
  is_manager_or_admin()
  OR (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id::uuid AND orders.seller_id = auth.uid()
    )
    AND (
      organization_id IS NULL
      OR organization_id IN (SELECT get_user_org_ids(auth.uid()))
    )
  )
);
