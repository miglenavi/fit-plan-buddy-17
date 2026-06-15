
-- 1) trainer_applications: scope SELECT policies to authenticated only
DROP POLICY IF EXISTS "Applicant views own application" ON public.trainer_applications;
CREATE POLICY "Applicant views own application"
ON public.trainer_applications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin views all applications" ON public.trainer_applications;
CREATE POLICY "Super admin views all applications"
ON public.trainer_applications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));

DROP POLICY IF EXISTS "Super admin updates applications" ON public.trainer_applications;
CREATE POLICY "Super admin updates applications"
ON public.trainer_applications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

-- 2) training_sessions: tighten client INSERT — force safe initial column values
DROP POLICY IF EXISTS "Client inserts own sessions" ON public.training_sessions;
CREATE POLICY "Client inserts own sessions"
ON public.training_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id
  AND trainer_id IS NULL
  AND trainer_notes IS NULL
  AND status = 'in_progress'
  AND logged_by = 'client'
  AND public.is_training_assigned_to_client(training_id, auth.uid())
);

-- 3) training_sessions: tighten client UPDATE — block writing trainer-owned fields
DROP POLICY IF EXISTS "Client updates own sessions" ON public.training_sessions;
CREATE POLICY "Client updates own sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (auth.uid() = client_id AND trainer_id IS NULL)
WITH CHECK (
  auth.uid() = client_id
  AND trainer_id IS NULL
  AND trainer_notes IS NULL
);
