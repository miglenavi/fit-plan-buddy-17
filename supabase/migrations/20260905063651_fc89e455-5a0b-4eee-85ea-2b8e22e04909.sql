ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;

CREATE INDEX IF NOT EXISTS bookings_reminder_pending_idx
  ON public.bookings (start_at)
  WHERE reminder_sent_at IS NULL;