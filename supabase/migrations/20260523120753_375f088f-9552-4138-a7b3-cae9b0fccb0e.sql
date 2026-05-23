DROP POLICY IF EXISTS "Trainers view all exercises" ON public.exercises;

CREATE POLICY "Trainer views own exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (auth.uid() = trainer_id);