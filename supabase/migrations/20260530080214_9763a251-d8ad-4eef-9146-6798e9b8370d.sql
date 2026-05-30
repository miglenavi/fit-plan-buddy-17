CREATE POLICY "Trainers view built-in exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (trainer_id IS NULL AND public.has_role(auth.uid(), 'trainer'::app_role));