-- Create supplier-logos storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('supplier-logos', 'supplier-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to supplier-logos
CREATE POLICY "Authenticated users can upload supplier logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'supplier-logos');

-- Allow public read access
CREATE POLICY "Public read access for supplier logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'supplier-logos');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can manage supplier logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'supplier-logos');

CREATE POLICY "Authenticated users can update supplier logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'supplier-logos');