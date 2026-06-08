
-- 1) Allow clients to view exercises referenced in their assigned plans
CREATE POLICY "Clients view exercises in their assigned plans"
ON public.exercises
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.training_exercises te
    JOIN public.trainings t ON t.id = te.training_id
    JOIN public.client_programs cp ON cp.plan_id = t.plan_id
    WHERE te.exercise_id = exercises.id
      AND cp.client_id = auth.uid()
  )
);

-- 2) Restrict client UPDATE on training_sessions to safe fields only.
-- Drop the overly broad ALL policy and replace with granular ones.
DROP POLICY IF EXISTS "Client manages own sessions" ON public.training_sessions;

CREATE POLICY "Client selects own sessions"
ON public.training_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = client_id);

CREATE POLICY "Client inserts own sessions"
ON public.training_sessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = client_id AND trainer_id IS NULL);

CREATE POLICY "Client deletes own sessions"
ON public.training_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = client_id);

-- UPDATE: client may only update their own row, must not change immutable fields.
-- Enforce immutability via the existing trigger prevent_client_assignment_tampering.
CREATE POLICY "Client updates own sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Ensure the tamper-prevention trigger is attached
DROP TRIGGER IF EXISTS prevent_client_assignment_tampering_trg ON public.training_sessions;
CREATE TRIGGER prevent_client_assignment_tampering_trg
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_assignment_tampering();
