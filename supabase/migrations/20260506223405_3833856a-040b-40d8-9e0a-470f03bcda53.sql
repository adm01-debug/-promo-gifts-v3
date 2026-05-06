-- Aplicar política de SECURITY DEFINER ACL conforme memorizado
REVOKE EXECUTE ON FUNCTION public.check_auth_throttling(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_auth_throttling(TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_auth_throttling(TEXT, TEXT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.record_auth_attempt(TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_auth_attempt(TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_auth_attempt(TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.clear_auth_attempts(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_auth_attempts(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.clear_auth_attempts(TEXT) FROM authenticated;
