
ALTER TABLE public.training_exercises
  ADD COLUMN alt_target_sets integer,
  ADD COLUMN alt_target_reps_min integer,
  ADD COLUMN alt_target_reps_max integer,
  ADD COLUMN alt_target_weight numeric,
  ADD COLUMN alt_rest_seconds integer,
  ADD COLUMN alt_coach_notes text;

ALTER TABLE public.session_exercises
  ADD COLUMN alt_target_sets integer,
  ADD COLUMN alt_target_reps_min integer,
  ADD COLUMN alt_target_reps_max integer,
  ADD COLUMN alt_target_weight numeric;
