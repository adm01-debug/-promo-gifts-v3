-- Ajustar search_path para segurança
ALTER FUNCTION public.limit_recently_viewed_products() SET search_path = public;

-- Revogar execução pública da função SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.limit_recently_viewed_products() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.limit_recently_viewed_products() FROM anon;
REVOKE EXECUTE ON FUNCTION public.limit_recently_viewed_products() FROM authenticated;
