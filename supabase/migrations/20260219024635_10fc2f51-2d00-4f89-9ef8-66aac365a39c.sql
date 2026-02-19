
-- Allow authenticated users to upload PDFs to art-files bucket (quotes folder)
CREATE POLICY "Authenticated users can upload to art-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'art-files');

CREATE POLICY "Authenticated users can update art-files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'art-files');

CREATE POLICY "Authenticated users can read art-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'art-files');
