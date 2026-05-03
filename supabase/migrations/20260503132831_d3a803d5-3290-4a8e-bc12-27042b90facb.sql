-- 1. admin_audit_log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_audit_log_select_policy" ON public.admin_audit_log;
CREATE POLICY "admin_audit_log_select_policy" ON public.admin_audit_log
FOR SELECT TO authenticated
USING (public.is_supervisor_or_above(auth.uid()));

-- 2. ai_usage_logs
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_usage_logs_select_policy" ON public.ai_usage_logs;
CREATE POLICY "ai_usage_logs_select_policy" ON public.ai_usage_logs
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id OR 
  public.is_supervisor_or_above(auth.uid())
);

-- 3. login_attempts
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "login_attempts_select_policy" ON public.login_attempts;
CREATE POLICY "login_attempts_select_policy" ON public.login_attempts
FOR SELECT TO authenticated
USING (public.is_supervisor_or_above(auth.uid()));

-- 4. rls_denial_log (Extremely sensitive)
ALTER TABLE public.rls_denial_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_denial_log_select_policy" ON public.rls_denial_log;
CREATE POLICY "rls_denial_log_select_policy" ON public.rls_denial_log
FOR SELECT TO authenticated
USING (public.is_supervisor_or_above(auth.uid()));
