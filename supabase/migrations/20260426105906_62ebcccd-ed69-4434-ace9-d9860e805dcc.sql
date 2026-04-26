-- ============================================================
-- Hardening: rotas técnicas (telemetria/segurança) → only dev
-- Alinha RLS com o RBAC do frontend (devOnly).
-- Edge functions usam service_role e continuam funcionando.
-- ============================================================

-- optimization_queue: era admin → dev
DROP POLICY IF EXISTS "Admins manage optimization queue" ON public.optimization_queue;
CREATE POLICY "Devs manage optimization queue"
  ON public.optimization_queue
  FOR ALL
  TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- bot_detection_log: SELECT era admin → dev (INSERT continua service_role)
DROP POLICY IF EXISTS "Admins can read bot log" ON public.bot_detection_log;
CREATE POLICY "Devs can read bot log"
  ON public.bot_detection_log
  FOR SELECT
  TO authenticated
  USING (public.is_dev(auth.uid()));

-- ip_access_control: ALL era admin → dev (service_role policy permanece)
DROP POLICY IF EXISTS "Admins can manage ip_access_control" ON public.ip_access_control;
CREATE POLICY "Devs can manage ip_access_control"
  ON public.ip_access_control
  FOR ALL
  TO authenticated
  USING (public.is_dev(auth.uid()))
  WITH CHECK (public.is_dev(auth.uid()));

-- request_rate_limits: SELECT era admin → dev
DROP POLICY IF EXISTS "Admins can read rate limits" ON public.request_rate_limits;
CREATE POLICY "Devs can read rate limits"
  ON public.request_rate_limits
  FOR SELECT
  TO authenticated
  USING (public.is_dev(auth.uid()));