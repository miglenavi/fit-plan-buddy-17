
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS primary_muscle_group public.muscle_group,
  ADD COLUMN IF NOT EXISTS secondary_muscle_groups public.muscle_group[] NOT NULL DEFAULT '{}';

-- Enforce max 3 secondary muscle groups
CREATE OR REPLACE FUNCTION public.validate_exercise_secondary_muscles()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.secondary_muscle_groups IS NOT NULL AND array_length(NEW.secondary_muscle_groups, 1) > 3 THEN
    RAISE EXCEPTION 'At most 3 secondary muscle groups are allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_exercise_secondary_muscles_trigger ON public.exercises;
CREATE TRIGGER validate_exercise_secondary_muscles_trigger
  BEFORE INSERT OR UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.validate_exercise_secondary_muscles();
