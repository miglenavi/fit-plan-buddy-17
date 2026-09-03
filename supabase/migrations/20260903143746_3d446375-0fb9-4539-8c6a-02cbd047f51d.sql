CREATE OR REPLACE FUNCTION public.trainer_busy_slots(_trainer_id uuid, _from timestamptz, _to timestamptz)
RETURNS TABLE(start_at timestamptz, end_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.start_at, b.end_at
  FROM public.bookings b
  WHERE b.trainer_id = _trainer_id
    AND b.status = 'booked'
    AND b.start_at >= _from
    AND b.start_at < _to
    AND (
      b.trainer_id = auth.uid()
      OR public.is_trainer_of(_trainer_id, auth.uid())
    )
$$;

REVOKE ALL ON FUNCTION public.trainer_busy_slots(uuid, timestamptz, timestamptz) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.trainer_busy_slots(uuid, timestamptz, timestamptz) TO authenticated;
