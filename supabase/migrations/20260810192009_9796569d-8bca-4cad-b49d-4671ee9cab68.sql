CREATE TABLE public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  email text,
  full_name text,
  status text NOT NULL DEFAULT 'pending',
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_invites TO authenticated;
GRANT ALL ON public.client_invites TO service_role;

ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own invites" ON public.client_invites
  FOR ALL TO authenticated
  USING (trainer_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (trainer_id = auth.uid() AND public.has_role(auth.uid(), 'trainer'));

CREATE TRIGGER client_invites_updated_at BEFORE UPDATE ON public.client_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX client_invites_trainer_idx ON public.client_invites (trainer_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_invite_info(_token text)
RETURNS TABLE(trainer_name text, valid boolean, full_name text, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name,
         (ci.status = 'pending' AND ci.expires_at > now()),
         ci.full_name,
         ci.email
  FROM public.client_invites ci
  JOIN public.profiles p ON p.id = ci.trainer_id
  WHERE ci.token = _token
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_info(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.accept_client_invite(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inv public.client_invites;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _inv FROM public.client_invites WHERE token = _token;
  IF _inv IS NULL THEN RAISE EXCEPTION 'Invite not found'; END IF;
  IF _inv.expires_at <= now() THEN RAISE EXCEPTION 'This invite link has expired'; END IF;
  IF _inv.status <> 'pending' THEN RAISE EXCEPTION 'This invite link has already been used'; END IF;
  IF _inv.trainer_id = _uid THEN RAISE EXCEPTION 'You cannot accept your own invite'; END IF;

  INSERT INTO public.user_roles (user_id, role)
  SELECT _uid, 'client'
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _uid)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.trainer_clients (trainer_id, client_id)
  VALUES (_inv.trainer_id, _uid)
  ON CONFLICT DO NOTHING;

  UPDATE public.trainer_clients
    SET archived_at = NULL
    WHERE trainer_id = _inv.trainer_id AND client_id = _uid;

  UPDATE public.client_invites
    SET status = 'accepted', accepted_by = _uid, accepted_at = now()
    WHERE id = _inv.id;

  RETURN _inv.trainer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_client_invite(text) TO authenticated;