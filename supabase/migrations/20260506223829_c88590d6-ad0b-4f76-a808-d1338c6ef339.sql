-- Garantir que a tabela exista com os campos necessários (já verificado via query)
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices otimizados
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_created ON public.auth_login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_ip_created ON public.auth_login_attempts(ip_address, created_at DESC);

-- Função SECURITY DEFINER para verificar se o login está bloqueado (rate limit persistente)
CREATE OR REPLACE FUNCTION public.check_auth_throttling(_email TEXT, _ip TEXT)
RETURNS TABLE(allowed BOOLEAN, remaining_seconds INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    recent_failures INT;
    last_failure_at TIMESTAMP WITH TIME ZONE;
    lockout_duration INT; -- em segundos
    elapsed_since_last INT;
BEGIN
    -- Contar falhas consecutivas nos últimos 15 minutos para este email OU IP
    -- Usamos 15 minutos como janela de observação
    SELECT COUNT(*), MAX(created_at)
    INTO recent_failures, last_failure_at
    FROM auth_login_attempts
    WHERE (email = _email OR ip_address = _ip)
      AND success = false
      AND created_at > now() - INTERVAL '15 minutes';

    -- Se não houver falhas suficientes para bloqueio, permite (limite de 5 falhas)
    IF recent_failures < 5 THEN
        RETURN QUERY SELECT true, 0;
        RETURN;
    END IF;

    -- Bloqueio exponencial: 
    -- 5-9 falhas = 5 min
    -- 10-14 falhas = 15 min
    -- >=15 falhas = 60 min
    IF recent_failures < 10 THEN
        lockout_duration := 300; 
    ELSIF recent_failures < 15 THEN
        lockout_duration := 900;
    ELSE
        lockout_duration := 3600;
    END IF;

    elapsed_since_last := EXTRACT(EPOCH FROM (now() - last_failure_at))::INT;

    IF elapsed_since_last >= lockout_duration THEN
        RETURN QUERY SELECT true, 0;
    ELSE
        RETURN QUERY SELECT false, (lockout_duration - elapsed_since_last);
    END IF;
END;
$$;

-- Função para registrar tentativa
CREATE OR REPLACE FUNCTION public.record_auth_attempt(_email TEXT, _ip TEXT, _success BOOLEAN, _reason TEXT DEFAULT NULL, _ua TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    INSERT INTO public.auth_login_attempts (email, ip_address, success, failure_reason, user_agent)
    VALUES (_email, _ip, _success, _reason, _ua);
$$;

-- Função para limpar tentativas após sucesso
CREATE OR REPLACE FUNCTION public.clear_auth_attempts(_email TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM public.auth_login_attempts
    WHERE email = _email;
$$;

-- Revogar permissões diretas de execução
REVOKE EXECUTE ON FUNCTION public.check_auth_throttling(TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_auth_attempt(TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.clear_auth_attempts(TEXT) FROM PUBLIC;
