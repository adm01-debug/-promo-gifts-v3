
-- P1 #5: Profiles INSERT policy (for edge cases beyond trigger)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- P2 #6: category_icons admin write policies
CREATE POLICY "Admins can insert category icons"
  ON public.category_icons FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update category icons"
  ON public.category_icons FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete category icons"
  ON public.category_icons FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- P2 #7: user_onboarding DELETE policy
CREATE POLICY "Users can delete own onboarding"
  ON public.user_onboarding FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- P2 #8: quote_comments — add manager visibility
CREATE POLICY "Managers can read all comments"
  ON public.quote_comments FOR SELECT
  TO authenticated
  USING (is_manager_or_admin());

-- P3 #12: product_price_history UPDATE for admins
CREATE POLICY "Admins can update price history"
  ON public.product_price_history FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
