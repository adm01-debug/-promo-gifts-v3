-- 1) Garantir que authenticated possa executar o helper usado por RLS de user_roles
GRANT EXECUTE ON FUNCTION public.is_admin_strict(uuid) TO authenticated;

-- 2) Reescrever as policies de user_roles para que SELECT não dependa de
--    is_admin_strict (que era avaliado pela policy FOR ALL "Admins manage user_roles"
--    e quebrava a leitura quando o EXECUTE não estava concedido).
DROP POLICY IF EXISTS "Admins manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Supervisors can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

-- Leitura: o próprio usuário sempre vê suas roles
CREATE POLICY "Users read own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Leitura ampla: supervisor/dev veem todas
CREATE POLICY "Supervisors read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_supervisor_or_above(auth.uid()));

-- Escrita estrita: apenas admin estrito (dev) pode INSERIR/ALTERAR/DELETAR papéis
CREATE POLICY "Admins insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Admins update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_strict(auth.uid()))
  WITH CHECK (public.is_admin_strict(auth.uid()));

CREATE POLICY "Admins delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_admin_strict(auth.uid()));
