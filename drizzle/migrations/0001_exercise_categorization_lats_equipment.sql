-- Add Lats muscle group and equipment field to exercises (additive only)
ALTER TYPE public.muscle_group ADD VALUE IF NOT EXISTS 'lats';

CREATE TYPE public.equipment_type AS ENUM
  ('barbell', 'dumbbell', 'kettlebell', 'cable', 'machine', 'bodyweight', 'resistance_band');

ALTER TABLE public.exercises ADD COLUMN equipment public.equipment_type;

COMMENT ON COLUMN public.exercises.equipment IS 'Equipment used for the exercise; barbell covers EZ-bar and landmine. Required in the app; NOT NULL enforced later once every row has a value.';