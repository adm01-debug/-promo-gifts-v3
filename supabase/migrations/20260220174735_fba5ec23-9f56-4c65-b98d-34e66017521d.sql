
-- Add signature_url column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- Create storage bucket for seller signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can view signatures (needed for PDF generation)
CREATE POLICY "Signatures are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'signatures');

-- RLS: users can upload their own signature
CREATE POLICY "Users can upload their own signature"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can update their own signature
CREATE POLICY "Users can update their own signature"
ON storage.objects FOR UPDATE
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can delete their own signature
CREATE POLICY "Users can delete their own signature"
ON storage.objects FOR DELETE
USING (bucket_id = 'signatures' AND auth.uid()::text = (storage.foldername(name))[1]);
