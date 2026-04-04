CREATE POLICY "Only admins can update product videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-videos' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'product-videos' AND has_role(auth.uid(), 'admin'::app_role));