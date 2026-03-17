-- Attach the existing prevent_profile_role_change function as a trigger
CREATE TRIGGER prevent_profile_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_role_change();