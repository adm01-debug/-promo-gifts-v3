-- Revogar EXECUTE de PUBLIC (que inclui anon e authenticated) para todas as funções SECURITY DEFINER identificadas
REVOKE EXECUTE ON FUNCTION public.revoke_all_user_tokens(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.purge_old_audit_logs() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_order(uuid, uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_save_quote_draft(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_create_quote_v3(jsonb, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_user_logout() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.limit_recently_viewed_items() FROM PUBLIC;

-- Permitir EXECUTE apenas para authenticated para funções que fazem sentido para usuários logados
GRANT EXECUTE ON FUNCTION public.revoke_all_user_tokens(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_quote_to_order(uuid, uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_save_quote_draft(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_create_quote_v3(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_user_logout() TO authenticated;
GRANT EXECUTE ON FUNCTION public.limit_recently_viewed_items() TO authenticated;

-- Funções que devem ser restritas a admin/service_role não recebem GRANT para authenticated
-- purge_old_audit_logs() permanece restrita.
