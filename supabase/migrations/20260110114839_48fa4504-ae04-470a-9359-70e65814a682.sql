-- Step 2: Update policies to include manager role
DROP POLICY IF EXISTS "Managers and admins can view all requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Managers and admins can update requests" ON public.password_reset_requests;

CREATE POLICY "Managers and admins can view all requests"
ON public.password_reset_requests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);

CREATE POLICY "Managers and admins can update requests"
ON public.password_reset_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
);