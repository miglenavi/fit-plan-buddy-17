DROP POLICY IF EXISTS "Client updates own assignment status" ON public.assigned_workouts;

CREATE POLICY "Client updates own assignment status"
ON public.assigned_workouts
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (auth.uid() = client_id);

-- Column-level restriction: clients may only write status and completed_at.
-- The prevent_client_assignment_tampering trigger already enforces this at row level,
-- but we re-create it to ensure it is attached.
DROP TRIGGER IF EXISTS prevent_client_assignment_tampering_trg ON public.assigned_workouts;
CREATE TRIGGER prevent_client_assignment_tampering_trg
BEFORE UPDATE ON public.assigned_workouts
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_assignment_tampering();