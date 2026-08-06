CREATE TYPE public.muscle_group_new AS ENUM (
  'chest','upper_back','lower_back','shoulders','biceps','triceps',
  'quads','hamstrings','glutes','calves','core','full_body'
);

ALTER TABLE public.exercises
  ALTER COLUMN primary_muscle_group TYPE public.muscle_group_new
  USING (CASE WHEN primary_muscle_group::text = 'back' THEN 'upper_back' ELSE primary_muscle_group::text END)::public.muscle_group_new;

ALTER TABLE public.exercises
  ALTER COLUMN secondary_muscle_groups DROP DEFAULT;

ALTER TABLE public.exercises
  ALTER COLUMN secondary_muscle_groups TYPE public.muscle_group_new[]
  USING array_replace(secondary_muscle_groups::text[], 'back', 'upper_back')::public.muscle_group_new[];

ALTER TABLE public.exercises
  ALTER COLUMN secondary_muscle_groups SET DEFAULT '{}'::public.muscle_group_new[];

ALTER TABLE public.exercises
  ALTER COLUMN muscle_groups DROP DEFAULT;

ALTER TABLE public.exercises
  ALTER COLUMN muscle_groups TYPE public.muscle_group_new[]
  USING array_replace(muscle_groups::text[], 'back', 'upper_back')::public.muscle_group_new[];

ALTER TABLE public.exercises
  ALTER COLUMN muscle_groups SET DEFAULT '{}'::public.muscle_group_new[];

DROP TYPE public.muscle_group;
ALTER TYPE public.muscle_group_new RENAME TO muscle_group;