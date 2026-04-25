-- Restringir telemetria, logs e MCP apenas ao papel `dev`
-- Substitui has_role(uid, 'admin') (hoje = is_supervisor_or_above) por is_dev(uid)

-- admin_audit_log
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.admin_audit_log;
CREATE POLICY "Devs can read audit logs"
  ON public.admin_audit_log FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));

-- connection_test_history
DROP POLICY IF EXISTS "Admins read connection_test_history" ON public.connection_test_history;
DROP POLICY IF EXISTS "Admins delete connection_test_history" ON public.connection_test_history;
CREATE POLICY "Devs read connection_test_history"
  ON public.connection_test_history FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));
CREATE POLICY "Devs delete connection_test_history"
  ON public.connection_test_history FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- external_connections
DROP POLICY IF EXISTS "Admins manage external_connections" ON public.external_connections;
CREATE POLICY "Devs manage external_connections"
  ON public.external_connections FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- hardening_health_snapshots
DROP POLICY IF EXISTS "Admins read hardening snapshots" ON public.hardening_health_snapshots;
CREATE POLICY "Devs read hardening snapshots"
  ON public.hardening_health_snapshots FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));

-- mcp_api_keys
DROP POLICY IF EXISTS "Devs and supervisors read mcp_api_keys" ON public.mcp_api_keys;
CREATE POLICY "Devs read mcp_api_keys"
  ON public.mcp_api_keys FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));

-- mcp_full_grantors
DROP POLICY IF EXISTS "Admins manage mcp_full_grantors" ON public.mcp_full_grantors;
DROP POLICY IF EXISTS "Admins read mcp_full_grantors" ON public.mcp_full_grantors;
CREATE POLICY "Devs manage mcp_full_grantors"
  ON public.mcp_full_grantors FOR ALL TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- query_telemetry
DROP POLICY IF EXISTS "Admins can read telemetry" ON public.query_telemetry;
DROP POLICY IF EXISTS "Admins can delete telemetry" ON public.query_telemetry;
CREATE POLICY "Devs can read telemetry"
  ON public.query_telemetry FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));
CREATE POLICY "Devs can delete telemetry"
  ON public.query_telemetry FOR DELETE TO authenticated
  USING (public.is_dev(auth.uid()));

-- secret_rotation_log
DROP POLICY IF EXISTS "Admins read secret_rotation_log" ON public.secret_rotation_log;
CREATE POLICY "Devs read secret_rotation_log"
  ON public.secret_rotation_log FOR SELECT TO authenticated
  USING (public.is_dev(auth.uid()));