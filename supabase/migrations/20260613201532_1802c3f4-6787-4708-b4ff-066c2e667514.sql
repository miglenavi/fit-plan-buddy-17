DROP POLICY IF EXISTS "Trainer updates own exercises" ON public.exercises;
CREATE POLICY "Trainer updates own exercises"
ON public.exercises FOR UPDATE TO authenticated
USING (auth.uid() = trainer_id AND has_role(auth.uid(), 'trainer'::app_role))
WITH CHECK (auth.uid() = trainer_id AND has_role(auth.uid(), 'trainer'::app_role));

DROP POLICY IF EXISTS "Trainer deletes own exercises" ON public.exercises;
CREATE POLICY "Trainer deletes own exercises"
ON public.exercises FOR DELETE TO authenticated
USING (auth.uid() = trainer_id AND has_role(auth.uid(), 'trainer'::app_role));