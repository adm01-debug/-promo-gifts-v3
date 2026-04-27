-- 1. Atualizar limites dos buckets existentes
UPDATE storage.buckets 
SET 
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = '{image/jpeg,image/png,image/webp,application/pdf}'
WHERE id IN ('personalization-images', 'mockup-art-files', 'component-media');

UPDATE storage.buckets 
SET 
  file_size_limit = 2097152, -- 2MB para logos
  allowed_mime_types = '{image/jpeg,image/png,image/svg+xml,image/webp}'
WHERE id = 'supplier-logos';

-- 2. Habilitar RLS (já habilitado por padrão em buckets privados, mas vamos garantir as políticas)

-- Limpar políticas antigas para evitar conflitos (opcional, mas recomendado para hardening)
-- DROP POLICY IF EXISTS "Users can upload their own art" ON storage.objects;
-- ...

-- 3. Políticas para 'personalization-images' (Áreas de gravação e referências)
CREATE POLICY "Authenticated users can upload personalization images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'personalization-images');

CREATE POLICY "Authenticated users can view personalization images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'personalization-images');

CREATE POLICY "Admins can delete personalization images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'personalization-images' AND is_supervisor_or_above(auth.uid()));

-- 4. Políticas para 'mockup-art-files' (Arquivos de arte enviados por clientes/vendedores)
-- Padrão: path/id_usuario/arquivo.ext
CREATE POLICY "Users can upload their own art files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mockup-art-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own or shared art files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'mockup-art-files' 
  AND (
    (storage.foldername(name))[1] = auth.uid()::text 
    OR is_supervisor_or_above(auth.uid())
  )
);

CREATE POLICY "Users can delete their own art files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'mockup-art-files' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Políticas para 'supplier-logos' (Apenas administradores/devs)
CREATE POLICY "Public can view supplier logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'supplier-logos');

CREATE POLICY "Only admins can manage supplier logos"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'supplier-logos' AND is_supervisor_or_above(auth.uid()))
WITH CHECK (bucket_id = 'supplier-logos' AND is_supervisor_or_above(auth.uid()));
