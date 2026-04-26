
-- ============================================================
-- Corrige RLS legada que ainda exige has_role(uid,'admin') literal
-- Após a migração da hierarquia (dev > supervisor > vendedor) ninguém
-- mais tem role 'admin' no banco — então essas policies bloqueavam
-- 100% das operações (UPDATE em user_roles, INSERT em audit log etc).
-- Trocamos por is_supervisor_or_above() que reconhece supervisor E dev
-- (e ainda inclui 'admin' legado por compatibilidade).
-- ============================================================

-- user_roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;

CREATE POLICY "Supervisors can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_supervisor_or_above(auth.uid()))
WITH CHECK (public.is_supervisor_or_above(auth.uid()));

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can insert audit entries" ON public.admin_audit_log;

CREATE POLICY "Supervisors can insert audit entries"
ON public.admin_audit_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_supervisor_or_above(auth.uid()));
