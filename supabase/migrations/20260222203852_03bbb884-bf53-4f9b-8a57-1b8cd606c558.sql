
-- Drop existing restrictive INSERT/UPDATE/DELETE policies for avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

-- Recreate policies: users can manage their own + admins can manage any
CREATE POLICY "Users or admins can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users or admins can update avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);

CREATE POLICY "Users or admins can delete avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
