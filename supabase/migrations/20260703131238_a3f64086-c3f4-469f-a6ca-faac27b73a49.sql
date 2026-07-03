
ALTER TABLE public.exercises DROP COLUMN IF EXISTS category_id;
DROP TABLE IF EXISTS public.exercise_categories CASCADE;
