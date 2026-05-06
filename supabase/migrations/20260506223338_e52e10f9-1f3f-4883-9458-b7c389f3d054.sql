-- Tabela para rastrear tentativas de login
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    ip_address TEXT,
    success BOOLEAN NOT NULL DEFAULT false,
    failure_reason TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance nas consultas de throttling
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_email_created ON public.auth_login_attempts(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_ip_created ON public.auth_login_attempts(ip_address, created_at DESC);

-- Habilitar RLS (apenas leitura para admin, inserção via edge/service_role)
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

-- Revogar acesso público (apenas via service_role ou funções específicas)
REVOKE ALL ON public.auth_login_attempts FROM public;
REVOKE ALL ON public.auth_login_attempts FROM anon;
REVOKE ALL ON public.auth_login_attempts FROM authenticated;

-- Função SECURITY DEFINER para verificar se o login está bloqueado (rate limit)
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
    SELECT COUNT(*), MAX(created_at)
    INTO recent_failures, last_failure_at
    FROM auth_login_attempts
    WHERE (email = _email OR ip_address = _ip)
      AND success = false
      AND created_at > now() - INTERVAL '15 minutes';

    -- Se não houver falhas recentes, permite
    IF recent_failures < 5 THEN
        RETURN QUERY SELECT true, 0;
        RETURN;
    END IF;

    -- Bloqueio exponencial: 5 falhas = 5 min, 10 falhas = 15 min, >10 = 60 min
    IF recent_failures < 10 THEN
        lockout_duration := 300; -- 5 min
    ELSIF recent_failures < 15 THEN
        lockout_duration := 900; -- 15 min
    ELSE
        lockout_duration := 3600; -- 1h
    END IF;

    elapsed_since_last := EXTRACT(EPOCH FROM (now() - last_failure_at))::INT;

    IF elapsed_since_last >= lockout_duration THEN
        RETURN QUERY SELECT true, 0;
    ELSE
        RETURN QUERY SELECT false, (lockout_duration - elapsed_since_last);
    END IF;
END;
$$;

-- Função para registrar tentativa (usada pela edge function)
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

-- Cron para limpar logs antigos (> 30 dias)
-- (pg_cron deve estar habilitado na infra)
-- SELECT cron.schedule('cleanup-auth-logs', '0 3 * * *', 'DELETE FROM auth_login_attempts WHERE created_at < now() - INTERVAL ''30 days''');
