
-- Categories for exercises (managed by super admins)
CREATE TABLE public.exercise_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.exercise_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view categories"
  ON public.exercise_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin inserts categories"
  ON public.exercise_categories FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin updates categories"
  ON public.exercise_categories FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin deletes categories"
  ON public.exercise_categories FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trg_exercise_categories_updated
  BEFORE UPDATE ON public.exercise_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Link exercises to a category (nullable so existing rows stay valid)
ALTER TABLE public.exercises
  ADD COLUMN category_id uuid REFERENCES public.exercise_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_exercises_category_id ON public.exercises(category_id);

-- Seed a few starter categories
INSERT INTO public.exercise_categories (name) VALUES
  ('Chest'), ('Back'), ('Legs'), ('Shoulders'), ('Arms'), ('Core'), ('Cardio'), ('Full Body')
ON CONFLICT (name) DO NOTHING;
