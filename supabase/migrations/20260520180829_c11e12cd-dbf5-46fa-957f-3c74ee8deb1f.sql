-- Restore execute permissions required by RLS policies that evaluate signed-in users' roles.
-- Anonymous users remain blocked; these helpers are needed for authenticated role-based access checks.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_trainer_of(uuid, uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of(uuid, uuid) FROM anon;