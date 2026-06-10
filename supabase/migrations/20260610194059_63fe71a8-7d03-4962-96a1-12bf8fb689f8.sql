
-- Helper functions bypass RLS to break recursion between plans <-> client_programs
CREATE OR REPLACE FUNCTION public.is_plan_assigned_to_client(_plan_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_programs
    WHERE plan_id = _plan_id AND client_id = _client_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_plan_owned_by_trainer(_plan_id uuid, _trainer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.plans
    WHERE id = _plan_id AND trainer_id = _trainer_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_plan_assigned_to_client(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_plan_owned_by_trainer(uuid, uuid) TO authenticated;

-- Replace recursive policy on plans
DROP POLICY IF EXISTS "Client views assigned plans" ON public.plans;
CREATE POLICY "Client views assigned plans"
ON public.plans
FOR SELECT
USING (public.is_plan_assigned_to_client(id, auth.uid()));

-- Replace recursive policy on client_programs
DROP POLICY IF EXISTS "Trainer manages own client programs" ON public.client_programs;
CREATE POLICY "Trainer manages own client programs"
ON public.client_programs
FOR ALL
USING (
  auth.uid() = trainer_id
  AND public.is_plan_owned_by_trainer(plan_id, auth.uid())
)
WITH CHECK (
  auth.uid() = trainer_id
  AND public.is_trainer_of(auth.uid(), client_id)
  AND public.is_plan_owned_by_trainer(plan_id, auth.uid())
);
