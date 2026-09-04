CREATE TABLE public.client_notes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT ALL ON public.client_notes TO service_role;

ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own client notes"
ON public.client_notes
FOR ALL
TO authenticated
USING (trainer_id = auth.uid() AND public.is_trainer_of(auth.uid(), client_id))
WITH CHECK (trainer_id = auth.uid() AND public.is_trainer_of(auth.uid(), client_id));

CREATE TRIGGER update_client_notes_updated_at
BEFORE UPDATE ON public.client_notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_client_notes_trainer_client ON public.client_notes (trainer_id, client_id, created_at DESC);