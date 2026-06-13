DROP POLICY IF EXISTS "Client manages own session exercises" ON public.session_exercises;

CREATE POLICY "Client manages own session exercises"
ON public.session_exercises
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id AND s.client_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id AND s.client_id = auth.uid()
  )
);