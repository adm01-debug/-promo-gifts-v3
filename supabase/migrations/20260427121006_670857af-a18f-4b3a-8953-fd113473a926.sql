
-- Hardening: torna explícita a política de "deny all" para anon/authenticated
-- na tabela e2e_cleanup_rate_limit. Acesso real continua sendo via RPC
-- public.e2e_cleanup_check_rate_limit (SECURITY DEFINER, executável apenas
-- pelo owner / service_role). service_role bypassa RLS, portanto o RPC
-- segue funcionando normalmente.
--
-- Por que policies explícitas em vez de só "RLS enabled, no policy"?
--   - Sem policies, o efeito padrão do RLS já é "negar tudo" para roles
--     não-superuser. Mas o linter Supabase (lint 0008) emite INFO porque
--     tabelas nesse estado normalmente são esquecimentos. Tornar a
--     intenção explícita:
--       1) elimina o ruído do lint
--       2) documenta no schema que a omissão é deliberada
--       3) facilita a auditoria por testes RLS automatizados

-- SELECT
DROP POLICY IF EXISTS "deny_all_select_anon" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_select_anon"
  ON public.e2e_cleanup_rate_limit
  FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "deny_all_select_authenticated" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_select_authenticated"
  ON public.e2e_cleanup_rate_limit
  FOR SELECT
  TO authenticated
  USING (false);

-- INSERT
DROP POLICY IF EXISTS "deny_all_insert_anon" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_insert_anon"
  ON public.e2e_cleanup_rate_limit
  FOR INSERT
  TO anon
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_insert_authenticated" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_insert_authenticated"
  ON public.e2e_cleanup_rate_limit
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE
DROP POLICY IF EXISTS "deny_all_update_anon" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_update_anon"
  ON public.e2e_cleanup_rate_limit
  FOR UPDATE
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "deny_all_update_authenticated" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_update_authenticated"
  ON public.e2e_cleanup_rate_limit
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

-- DELETE
DROP POLICY IF EXISTS "deny_all_delete_anon" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_delete_anon"
  ON public.e2e_cleanup_rate_limit
  FOR DELETE
  TO anon
  USING (false);

DROP POLICY IF EXISTS "deny_all_delete_authenticated" ON public.e2e_cleanup_rate_limit;
CREATE POLICY "deny_all_delete_authenticated"
  ON public.e2e_cleanup_rate_limit
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE public.e2e_cleanup_rate_limit IS
  'Rate limit interno do edge e2e-cleanup. Acesso exclusivo via service_role / RPC SECURITY DEFINER. Policies explícitas negam anon/authenticated por defesa em profundidade.';
