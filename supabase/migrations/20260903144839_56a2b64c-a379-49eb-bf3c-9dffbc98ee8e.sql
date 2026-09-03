CREATE TABLE public.booking_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_series TO authenticated;
GRANT ALL ON public.booking_series TO service_role;

ALTER TABLE public.booking_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage their own series"
  ON public.booking_series FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid() AND public.is_trainer_of(auth.uid(), client_id));

CREATE POLICY "Clients can view their series"
  ON public.booking_series FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE TRIGGER set_booking_series_updated_at
  BEFORE UPDATE ON public.booking_series
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.bookings
  ADD COLUMN series_id uuid REFERENCES public.booking_series(id) ON DELETE SET NULL;

CREATE INDEX idx_bookings_series_id ON public.bookings(series_id);