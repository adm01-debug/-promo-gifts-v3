-- Substitui a policy ALL por policies separadas, removendo INSERT do cliente.
-- A emissão passa a ser exclusiva da edge function mcp-keys-issue (service_role).
DROP POLICY IF EXISTS "Admins manage mcp_api_keys" ON public.mcp_api_keys;

CREATE POLICY "Admins read mcp_api_keys"
  ON public.mcp_api_keys
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins update mcp_api_keys"
  ON public.mcp_api_keys
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins delete mcp_api_keys"
  ON public.mcp_api_keys
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Sem CREATE POLICY ... FOR INSERT: clientes autenticados não podem mais
-- inserir diretamente, fechando o vetor de XSS/sessão sequestrada.