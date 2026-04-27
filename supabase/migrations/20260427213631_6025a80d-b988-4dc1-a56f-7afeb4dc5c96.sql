-- Garantir que os buckets existam com as configurações corretas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('personalization-images', 'personalization-images', false, 5242880, '{"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}')
ON CONFLICT (id) DO UPDATE SET public = false;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('quarantine', 'quarantine', false, 5242880, '{"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}')
ON CONFLICT (id) DO UPDATE SET public = false;

-- Nota: Pastas no S3/Supabase Storage são virtuais (prefixos). 
-- A lógica de prefixo será aplicada na Edge Function:
-- 'personalization-images/verified/...' para arquivos limpos.
-- 'quarantine/suspect/...' para arquivos bloqueados.

-- Atualizar políticas RLS para garantir acesso granular se necessário
DROP POLICY IF EXISTS "Acesso de leitura para usuários autenticados em personalization-images" ON storage.objects;
CREATE POLICY "Acesso de leitura para usuários autenticados em personalization-images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'personalization-images');

DROP POLICY IF EXISTS "Acesso de inserção para usuários autenticados em personalization-images" ON storage.objects;
CREATE POLICY "Acesso de inserção para usuários autenticados em personalization-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'personalization-images');
