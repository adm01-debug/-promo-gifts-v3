-- 1. Garantir que todos os buckets sejam privados
UPDATE storage.buckets SET public = false;

-- 2. Remover explicitamente políticas que possam ser muito permissivas para o bucket de quarentena
-- Como não podemos deletar diretamente de storage.policies, usamos DROP POLICY nominalmente
DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Public access to quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read quarantine" ON storage.objects;

-- 3. Recriar apenas as políticas necessárias e seguras
-- Apenas sistema pode fazer tudo
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;
CREATE POLICY "Sistema pode gerenciar quarentena"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'quarantine')
WITH CHECK (bucket_id = 'quarantine');

-- Apenas admins podem ler
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;
CREATE POLICY "Admins podem visualizar quarentena"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'quarantine' 
  AND (auth.jwt() ->> 'email' LIKE '%admin%' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
);
