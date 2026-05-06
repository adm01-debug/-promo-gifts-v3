-- Revogar explicitamente de anon
REVOKE EXECUTE ON FUNCTION public.revoke_all_user_tokens(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.purge_old_audit_logs() FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_quote_to_order(uuid, uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_save_quote_draft(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.fn_create_quote_v3(jsonb, jsonb) FROM anon;

-- O linter também recomenda revogar de authenticated se não for necessário para todos os usuários logados
-- Por enquanto, mantemos authenticated para as que os vendedores usam (convert, save_quote, create_quote).
