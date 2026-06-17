
-- session_exercises: restrict client writes to client-logged sessions
DROP POLICY IF EXISTS "Client manages own session exercises" ON public.session_exercises;

CREATE POLICY "Client reads own session exercises"
ON public.session_exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id
      AND s.client_id = auth.uid()
  )
);

CREATE POLICY "Client writes own session exercises (client-logged only)"
ON public.session_exercises
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

CREATE POLICY "Client updates own session exercises (client-logged only)"
ON public.session_exercises
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

CREATE POLICY "Client deletes own session exercises (client-logged only)"
ON public.session_exercises
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.training_sessions s
    WHERE s.id = session_exercises.session_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

-- set_logs: restrict client writes to client-logged sessions
DROP POLICY IF EXISTS "Client manages own set logs" ON public.set_logs;

CREATE POLICY "Client reads own set logs"
ON public.set_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id
      AND s.client_id = auth.uid()
  )
);

CREATE POLICY "Client writes own set logs (client-logged only)"
ON public.set_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

CREATE POLICY "Client updates own set logs (client-logged only)"
ON public.set_logs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

CREATE POLICY "Client deletes own set logs (client-logged only)"
ON public.set_logs
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id
      AND s.client_id = auth.uid()
      AND s.logged_by = 'client'
      AND s.trainer_id IS NULL
  )
);

-- training_sessions: restrict client DELETE to client-logged sessions
DROP POLICY IF EXISTS "Client deletes own sessions" ON public.training_sessions;

CREATE POLICY "Client deletes own sessions (client-logged only)"
ON public.training_sessions
FOR DELETE
TO authenticated
USING (
  auth.uid() = client_id
  AND logged_by = 'client'
  AND trainer_id IS NULL
);
