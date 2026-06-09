
-- 1. client_programs: ensure plan belongs to trainer
DROP POLICY IF EXISTS "Trainer manages own client programs" ON public.client_programs;
CREATE POLICY "Trainer manages own client programs"
ON public.client_programs
FOR ALL
USING (
  auth.uid() = trainer_id
  AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = client_programs.plan_id AND p.trainer_id = auth.uid())
)
WITH CHECK (
  auth.uid() = trainer_id
  AND public.is_trainer_of(auth.uid(), client_id)
  AND EXISTS (SELECT 1 FROM public.plans p WHERE p.id = client_programs.plan_id AND p.trainer_id = auth.uid())
);

-- 2. session_exercises: clients can only insert exercises tied to a training in their assigned plans
DROP POLICY IF EXISTS "Client manages own session exercises" ON public.session_exercises;
CREATE POLICY "Client manages own session exercises"
ON public.session_exercises
FOR ALL
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
  AND EXISTS (
    SELECT 1
    FROM public.training_exercises te
    JOIN public.trainings t ON t.id = te.training_id
    JOIN public.client_programs cp ON cp.plan_id = t.plan_id
    WHERE te.exercise_id = session_exercises.exercise_id
      AND cp.client_id = auth.uid()
  )
);

-- 3. training_sessions: prevent clients from tampering with trainer-controlled fields
CREATE OR REPLACE FUNCTION public.prevent_session_client_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the updater is the client and not also the trainer of record
  IF auth.uid() = OLD.client_id AND (OLD.trainer_id IS NULL OR auth.uid() <> OLD.trainer_id) THEN
    IF NEW.training_id IS DISTINCT FROM OLD.training_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
       OR NEW.logged_by IS DISTINCT FROM OLD.logged_by
       OR NEW.trainer_notes IS DISTINCT FROM OLD.trainer_notes
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Clients can only update status, notes, started_at, and completed_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_session_client_tampering_trg ON public.training_sessions;
CREATE TRIGGER prevent_session_client_tampering_trg
BEFORE UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.prevent_session_client_tampering();
