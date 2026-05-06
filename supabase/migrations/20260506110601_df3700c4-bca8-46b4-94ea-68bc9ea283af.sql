-- Habilitar RLS
ALTER TABLE public.access_security_settings ENABLE ROW LEVEL SECURITY;

-- Política de leitura para admin e dev
CREATE POLICY "Admins e Devs podem visualizar configurações de segurança"
ON public.access_security_settings
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dev')
);

-- Política de atualização para admin e dev
CREATE POLICY "Admins e Devs podem atualizar configurações de segurança"
ON public.access_security_settings
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dev')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dev')
);
