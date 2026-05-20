
CREATE TABLE public.client_temp_passwords (
  client_id uuid PRIMARY KEY,
  trainer_id uuid NOT NULL,
  temp_password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_temp_passwords ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer views own client temp passwords"
ON public.client_temp_passwords FOR SELECT
USING (auth.uid() = trainer_id);

CREATE POLICY "Trainer inserts own client temp passwords"
ON public.client_temp_passwords FOR INSERT
WITH CHECK (auth.uid() = trainer_id AND public.has_role(auth.uid(), 'trainer'));

CREATE POLICY "Trainer updates own client temp passwords"
ON public.client_temp_passwords FOR UPDATE
USING (auth.uid() = trainer_id);

CREATE POLICY "Trainer deletes own client temp passwords"
ON public.client_temp_passwords FOR DELETE
USING (auth.uid() = trainer_id);

CREATE TRIGGER client_temp_passwords_set_updated_at
BEFORE UPDATE ON public.client_temp_passwords
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
