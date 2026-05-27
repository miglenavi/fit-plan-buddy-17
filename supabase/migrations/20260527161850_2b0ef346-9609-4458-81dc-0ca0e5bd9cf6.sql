
-- 1) Restrict client updates on assigned_workouts to status/completed_at only
DROP POLICY IF EXISTS "Client updates own assignment status" ON public.assigned_workouts;

CREATE POLICY "Client updates own assignment status"
ON public.assigned_workouts
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND trainer_id = (SELECT trainer_id FROM public.assigned_workouts WHERE id = assigned_workouts.id)
);

-- Trigger-based column guard for clients (defense in depth, already exists as function)
DROP TRIGGER IF EXISTS prevent_client_assignment_tampering_trg ON public.assigned_workouts;
CREATE TRIGGER prevent_client_assignment_tampering_trg
BEFORE UPDATE ON public.assigned_workouts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_assignment_tampering();

-- 2) Scope client-visible exercises to their own trainer
DROP POLICY IF EXISTS "Client views assigned exercises" ON public.exercises;

CREATE POLICY "Client views assigned exercises"
ON public.exercises
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.assigned_workouts aw
    JOIN public.workout_plan_exercises wpe ON wpe.workout_plan_id = aw.workout_plan_id
    JOIN public.trainer_clients tc ON tc.trainer_id = exercises.trainer_id AND tc.client_id = auth.uid()
    WHERE wpe.exercise_id = exercises.id
      AND aw.client_id = auth.uid()
  )
);
