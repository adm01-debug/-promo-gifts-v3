
-- Create storage bucket for mockup assets (logos, generated mockups)
INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-assets', 'mockup-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view mockup assets (public bucket)
CREATE POLICY "Anyone can view mockup assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'mockup-assets');

-- Authenticated users can upload to their own folder
CREATE POLICY "Users can upload their own mockup assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'mockup-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own assets
CREATE POLICY "Users can update their own mockup assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'mockup-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own assets
CREATE POLICY "Users can delete their own mockup assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'mockup-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
