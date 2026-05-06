-- Revogar de authenticated funções estritamente administrativas com assinaturas exatas
REVOKE EXECUTE ON FUNCTION public.purge_old_audit_logs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.repair_ownership_orphans(uuid, boolean, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_rls_coverage() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_rls_matrix() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_ownership_orphans(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_role_migration_batch(text, text, jsonb, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_connections_auto_test_interval(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_hardening_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_platform_failure_metrics(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_app_health_summary(integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_request_id(text) FROM authenticated;
