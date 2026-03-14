
-- Tighten the INSERT policy to require admin role instead of any authenticated user
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
CREATE POLICY "Admins can upload videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));

-- Tighten the DELETE policy similarly
DROP POLICY IF EXISTS "Authenticated users can delete videos" ON storage.objects;
CREATE POLICY "Admins can delete videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-videos' AND public.has_role(auth.uid(), 'admin'));
