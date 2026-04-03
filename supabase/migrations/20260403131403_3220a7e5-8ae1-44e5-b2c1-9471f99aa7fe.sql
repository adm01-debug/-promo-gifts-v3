-- Fix cleanup_old_notifications to use workspace_notifications
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.workspace_notifications
  WHERE created_at < NOW() - INTERVAL '90 days' AND is_read = TRUE;
END;
$$;

-- Fix get_unread_count to use workspace_notifications
CREATE OR REPLACE FUNCTION public.get_unread_count()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count_val INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO count_val
  FROM public.workspace_notifications
  WHERE user_id = auth.uid() AND is_read = FALSE;
  RETURN count_val;
END;
$$;

-- Fix mark_notification_read to use workspace_notifications
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workspace_notifications
  SET is_read = TRUE
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;

-- Fix mark_all_notifications_read to use workspace_notifications
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.workspace_notifications
  SET is_read = TRUE
  WHERE user_id = auth.uid() AND is_read = FALSE;
END;
$$;

-- Fix scheduled_reports: change policies from public to authenticated
DROP POLICY IF EXISTS "Users can create own scheduled reports" ON public.scheduled_reports;
DROP POLICY IF EXISTS "Users can delete own scheduled reports" ON public.scheduled_reports;
DROP POLICY IF EXISTS "Users can update own scheduled reports" ON public.scheduled_reports;
DROP POLICY IF EXISTS "Users can view own scheduled reports" ON public.scheduled_reports;

CREATE POLICY "Users can view own scheduled reports"
ON public.scheduled_reports FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own scheduled reports"
ON public.scheduled_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scheduled reports"
ON public.scheduled_reports FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own scheduled reports"
ON public.scheduled_reports FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Restrict admin_audit_log INSERT to admins only
DROP POLICY IF EXISTS "System can insert audit entries" ON public.admin_audit_log;

CREATE POLICY "Admins can insert audit entries"
ON public.admin_audit_log FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));