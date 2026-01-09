-- Tabela de Auditoria para rastrear todas as alterações
CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance nas consultas
CREATE INDEX idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem inserir logs
CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_log
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin pode ver todos os logs (usando app_role correto)
CREATE POLICY "Admin can view all audit logs"
ON public.audit_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Usuários podem ver logs das próprias ações
CREATE POLICY "Users can view their own audit logs"
ON public.audit_log
FOR SELECT
USING (auth.uid() = user_id);

COMMENT ON TABLE public.audit_log IS 'Registro de auditoria para todas as alterações no sistema';