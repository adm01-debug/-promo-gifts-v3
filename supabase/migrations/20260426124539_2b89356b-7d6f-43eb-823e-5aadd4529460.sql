-- Hardening RLS pós-migração de roles.

CREATE OR REPLACE FUNCTION public.is_admin_strict(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'::public.app_role
  )
$$;

COMMENT ON FUNCTION public.is_admin_strict(uuid) IS 'Verifica papel admin estrito (sem fallback dev/manager). Usar APENAS em policies de escrita em tabelas que controlam privilegios (user_roles, mcp_full_grantors). Para leitura/operacao rotineira, prefira is_admin().';

-- user_roles: escrita restrita a admin
DROP POLICY IF EXISTS "Supervisors can manage roles" ON public.user_roles;

CREATE POLICY "Admins manage user_roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Supervisors can read user_roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));

-- mcp_full_grantors: escrita admin, leitura dev
DROP POLICY IF EXISTS "Devs manage mcp_full_grantors" ON public.mcp_full_grantors;

CREATE POLICY "Admins manage mcp_full_grantors"
  ON public.mcp_full_grantors
  FOR ALL
  TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Devs read mcp_full_grantors"
  ON public.mcp_full_grantors
  FOR SELECT
  TO authenticated
  USING (public.is_dev(auth.uid()));
