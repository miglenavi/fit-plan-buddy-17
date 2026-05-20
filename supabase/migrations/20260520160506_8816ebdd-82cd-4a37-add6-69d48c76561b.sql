GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_trainer_of(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.approve_trainer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_trainer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reapply_trainer(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_client_by_email(text) TO authenticated;