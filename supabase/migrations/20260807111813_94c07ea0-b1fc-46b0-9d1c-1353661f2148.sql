CREATE TABLE public.trainer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'pending',
  decline_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX trainer_requests_unique_pending
  ON public.trainer_requests (client_id, trainer_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_requests TO authenticated;
GRANT ALL ON public.trainer_requests TO service_role;

ALTER TABLE public.trainer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Client creates own request" ON public.trainer_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = client_id AND status = 'pending' AND public.has_role(trainer_id, 'trainer'));

CREATE POLICY "Client views own requests" ON public.trainer_requests
  FOR SELECT TO authenticated USING (auth.uid() = client_id);

CREATE POLICY "Client cancels own pending request" ON public.trainer_requests
  FOR DELETE TO authenticated USING (auth.uid() = client_id AND status = 'pending');

CREATE POLICY "Trainer views requests to them" ON public.trainer_requests
  FOR SELECT TO authenticated USING (auth.uid() = trainer_id);

CREATE POLICY "Super admin views all requests" ON public.trainer_requests
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trainer_requests_updated_at
  BEFORE UPDATE ON public.trainer_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.list_trainers()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.id AND ur.role = 'trainer'
  WHERE auth.uid() IS NOT NULL
  ORDER BY p.full_name
$$;

REVOKE ALL ON FUNCTION public.list_trainers() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.list_trainers() TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_trainer_request(_request_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _req public.trainer_requests;
BEGIN
  SELECT * INTO _req FROM public.trainer_requests WHERE id = _request_id;
  IF _req IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF _req.trainer_id <> auth.uid() THEN RAISE EXCEPTION 'Not your request'; END IF;
  IF _req.status <> 'pending' THEN RAISE EXCEPTION 'Request already handled'; END IF;

  IF _approve THEN
    INSERT INTO public.trainer_clients (trainer_id, client_id)
    VALUES (_req.trainer_id, _req.client_id)
    ON CONFLICT DO NOTHING;
    UPDATE public.trainer_requests
      SET status = 'approved', decline_reason = NULL
      WHERE id = _request_id;
  ELSE
    UPDATE public.trainer_requests
      SET status = 'declined', decline_reason = _reason
      WHERE id = _request_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_trainer_request(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_trainer_request(uuid, boolean, text) TO authenticated;