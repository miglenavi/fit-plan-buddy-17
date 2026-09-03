-- Additive only: two new tables, no changes to existing objects.

CREATE TABLE public.trainer_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_recurring boolean NOT NULL DEFAULT true,
  day_of_week smallint,
  specific_date date,
  start_time time NOT NULL,
  end_time time NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trainer_availability_time_order CHECK (end_time > start_time),
  CONSTRAINT trainer_availability_dow_range CHECK (day_of_week IS NULL OR (day_of_week BETWEEN 0 AND 6)),
  CONSTRAINT trainer_availability_shape CHECK (
    (is_recurring AND day_of_week IS NOT NULL AND specific_date IS NULL)
    OR (NOT is_recurring AND specific_date IS NOT NULL)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainer_availability TO authenticated;
GRANT ALL ON public.trainer_availability TO service_role;

ALTER TABLE public.trainer_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own availability"
  ON public.trainer_availability FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Linked clients can view trainer availability"
  ON public.trainer_availability FOR SELECT TO authenticated
  USING (public.is_trainer_of(trainer_id, auth.uid()));

CREATE TRIGGER set_trainer_availability_updated_at
  BEFORE UPDATE ON public.trainer_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX trainer_availability_trainer_idx ON public.trainer_availability (trainer_id);

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'booked',
  training_id uuid REFERENCES public.trainings(id) ON DELETE SET NULL,
  training_session_id uuid REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  client_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_order CHECK (end_at > start_at),
  CONSTRAINT bookings_status_check CHECK (status IN ('booked', 'cancelled', 'completed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage bookings for their clients"
  ON public.bookings FOR ALL TO authenticated
  USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Clients can view own bookings"
  ON public.bookings FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Clients can book with their trainer"
  ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND public.is_trainer_of(trainer_id, auth.uid()));

CREATE POLICY "Clients can update own bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

CREATE TRIGGER set_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX bookings_trainer_start_idx ON public.bookings (trainer_id, start_at);
CREATE INDEX bookings_client_start_idx ON public.bookings (client_id, start_at);

CREATE OR REPLACE FUNCTION public.prevent_booking_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status <> 'booked' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.trainer_id = NEW.trainer_id
      AND b.id <> NEW.id
      AND b.status = 'booked'
      AND b.start_at < NEW.end_at
      AND b.end_at > NEW.start_at
  ) THEN
    RAISE EXCEPTION 'That time slot is already booked';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_booking_overlap_trg
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_overlap();
