-- Criar bucket de quarentena se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quarantine', 'quarantine', false, 5242880, '{"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}')
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 5242880;

-- Garantir que personalization-images não seja público
UPDATE storage.buckets SET public = false WHERE id = 'personalization-images';

-- Habilitar RLS (Storage utiliza RLS na tabela storage.objects)
-- Políticas para 'personalization-images'
CREATE POLICY "Acesso de leitura para usuários autenticados em personalization-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'personalization-images');

CREATE POLICY "Acesso de inserção para usuários autenticados em personalization-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'personalization-images');

-- Políticas para 'quarantine' (Apenas leitura/gestão por admins ou sistema)
CREATE POLICY "Acesso restrito ao bucket de quarentena"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'quarantine' AND (auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'email' LIKE '%admin%'));
