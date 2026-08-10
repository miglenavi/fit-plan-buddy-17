CREATE OR REPLACE FUNCTION public.choose_session_exercise(_se_id uuid, _use_alternative boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _se public.session_exercises;
  _s public.training_sessions;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _se FROM public.session_exercises WHERE id = _se_id;
  IF _se IS NULL THEN RAISE EXCEPTION 'Exercise not found'; END IF;

  SELECT * INTO _s FROM public.training_sessions WHERE id = _se.session_id;
  IF _s IS NULL THEN RAISE EXCEPTION 'Session not found'; END IF;

  IF NOT (_s.client_id = _uid OR public.is_trainer_of(_uid, _s.client_id)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF _s.status = 'completed' THEN
    RAISE EXCEPTION 'This session is finished';
  END IF;

  IF NOT _use_alternative THEN
    RETURN;
  END IF;

  IF _se.alternative_exercise_id IS NULL THEN
    RAISE EXCEPTION 'No alternative exercise set';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.set_logs sl
    WHERE sl.session_exercise_id = _se_id
      AND (sl.completed OR sl.reps IS NOT NULL OR sl.weight IS NOT NULL OR sl.rpe IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Sets are already logged — clear them before switching exercise';
  END IF;

  UPDATE public.session_exercises
  SET exercise_id = _se.alternative_exercise_id,
      alternative_exercise_id = _se.exercise_id,
      target_sets = COALESCE(_se.alt_target_sets, _se.target_sets),
      target_reps_min = COALESCE(_se.alt_target_reps_min, _se.target_reps_min),
      target_reps_max = COALESCE(_se.alt_target_reps_max, _se.target_reps_max),
      target_weight = COALESCE(_se.alt_target_weight, _se.target_weight),
      alt_target_sets = _se.target_sets,
      alt_target_reps_min = _se.target_reps_min,
      alt_target_reps_max = _se.target_reps_max,
      alt_target_weight = _se.target_weight
  WHERE id = _se_id;
END;
$$;

REVOKE ALL ON FUNCTION public.choose_session_exercise(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.choose_session_exercise(uuid, boolean) TO authenticated;