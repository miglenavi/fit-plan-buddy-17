
CREATE OR REPLACE FUNCTION public.link_client_by_email(_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _trainer uuid := auth.uid();
  _client uuid;
BEGIN
  IF _trainer IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_trainer, 'trainer') THEN RAISE EXCEPTION 'Only trainers can add clients'; END IF;

  SELECT id INTO _client FROM auth.users WHERE lower(email) = lower(_email) LIMIT 1;
  IF _client IS NULL THEN RAISE EXCEPTION 'No user found with that email'; END IF;
  IF NOT public.has_role(_client, 'client') THEN RAISE EXCEPTION 'That user is not a client'; END IF;

  INSERT INTO public.trainer_clients (trainer_id, client_id)
  VALUES (_trainer, _client)
  ON CONFLICT DO NOTHING;

  RETURN _client;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.link_client_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_client_by_email(text) TO authenticated;
