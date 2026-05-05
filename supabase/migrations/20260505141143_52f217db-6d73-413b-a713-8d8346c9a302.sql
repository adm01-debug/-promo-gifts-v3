-- Remove permissive policies from orders and order_items
DROP POLICY IF EXISTS "orders_select_v10" ON public.orders;
DROP POLICY IF EXISTS "order_items_select_v10" ON public.order_items;

-- Hardening functions: Set search_path and Security Definer
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_admin_strict(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::public.app_role
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_supervisor_or_above(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('dev'::public.app_role,
                   'supervisor'::public.app_role,
                   'admin'::public.app_role,
                   'manager'::public.app_role)
  )
$function$;

CREATE OR REPLACE FUNCTION public.can_view_all_sales(_user_id uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT public.is_admin_strict(_user_id)
      OR public.has_role(_user_id,'manager'::public.app_role)
      OR public.has_role(_user_id,'dev'::public.app_role)
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
 RETURNS TABLE(organization_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$function$;

CREATE OR REPLACE FUNCTION public.is_manager_or_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
  );
END;
$function$;

-- Revoke execute from public/anon for sensitive functions
REVOKE EXECUTE ON FUNCTION public.is_admin_strict(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.is_supervisor_or_above(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.can_view_all_sales(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_org_ids(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
