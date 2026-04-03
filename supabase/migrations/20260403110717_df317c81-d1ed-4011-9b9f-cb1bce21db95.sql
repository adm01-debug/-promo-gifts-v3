
-- Fix supplier-logos: restrict UPDATE/DELETE to admins
DROP POLICY IF EXISTS "Authenticated users can update supplier logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete supplier logos" ON storage.objects;

CREATE POLICY "Only admins can update supplier logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'supplier-logos' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'supplier-logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete supplier logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-logos' AND public.has_role(auth.uid(), 'admin'));

-- Fix personalization-images: scope uploads to user's own path
DROP POLICY IF EXISTS "Authenticated users can upload personalization images" ON storage.objects;

CREATE POLICY "Users can upload own personalization images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'personalization-images' 
  AND (auth.uid())::text = split_part(name, '/', 1)
);

-- Enable leaked password protection
-- (This is handled via auth config, not SQL)
