-- Política de leitura para audit_logs
CREATE POLICY "Admins e Devs podem visualizar logs de auditoria"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'dev')
);
