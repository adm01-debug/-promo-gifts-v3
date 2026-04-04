
-- Remove overly permissive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can upload supplier logos" ON storage.objects;
-- Remove overly permissive DELETE policy (duplicate of admin-only one)
DROP POLICY IF EXISTS "Authenticated users can manage supplier logos" ON storage.objects;

-- Create admin-only INSERT policy
CREATE POLICY "Only admins can upload supplier logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-logos'
  AND has_role(auth.uid(), 'admin'::app_role)
);
