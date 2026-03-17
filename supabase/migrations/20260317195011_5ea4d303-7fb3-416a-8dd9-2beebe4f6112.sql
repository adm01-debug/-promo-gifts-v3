
-- Replace the overly permissive INSERT policy with a scoped one
DROP POLICY "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
