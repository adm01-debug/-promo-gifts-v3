
-- Block non-admin INSERT on user_roles to prevent privilege escalation
-- The existing ALL policy only covers admins; we need an explicit restrictive INSERT
CREATE POLICY "Only admins can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
);
