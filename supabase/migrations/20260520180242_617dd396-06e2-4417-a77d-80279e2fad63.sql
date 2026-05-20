
-- 1. Add explicit deny INSERT policies (and explicit user-scoped insert for trainer_applications via trigger only)
-- trainer_applications: inserts happen only via SECURITY DEFINER trigger handle_new_user.
-- Add explicit restrictive policy to make intent clear.
CREATE POLICY "Block direct inserts to trainer_applications"
  ON public.trainer_applications FOR INSERT TO authenticated, anon
  WITH CHECK (false);

-- user_roles: writes only via SECURITY DEFINER functions (handle_new_user, approve_trainer).
CREATE POLICY "Block direct inserts to user_roles"
  ON public.user_roles FOR INSERT TO authenticated, anon
  WITH CHECK (false);
CREATE POLICY "Block direct updates to user_roles"
  ON public.user_roles FOR UPDATE TO authenticated, anon
  USING (false);
CREATE POLICY "Block direct deletes from user_roles"
  ON public.user_roles FOR DELETE TO authenticated, anon
  USING (false);

-- 2. assigned_workouts: tighten client update to status/completed_at only
DROP POLICY IF EXISTS "Client updates own assignment status" ON public.assigned_workouts;

CREATE POLICY "Client updates own assignment status"
  ON public.assigned_workouts FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE OR REPLACE FUNCTION public.prevent_client_assignment_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when the updater is the client (not the trainer)
  IF auth.uid() = OLD.client_id AND auth.uid() <> OLD.trainer_id THEN
    IF NEW.trainer_id IS DISTINCT FROM OLD.trainer_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.workout_plan_id IS DISTINCT FROM OLD.workout_plan_id
       OR NEW.scheduled_date IS DISTINCT FROM OLD.scheduled_date
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Clients can only update status and completed_at';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_client_assignment_tampering ON public.assigned_workouts;
CREATE TRIGGER trg_prevent_client_assignment_tampering
  BEFORE UPDATE ON public.assigned_workouts
  FOR EACH ROW EXECUTE FUNCTION public.prevent_client_assignment_tampering();

-- 3. Lock down SECURITY DEFINER function EXECUTE grants.
-- Functions used inside RLS policies still work (definer runs as owner regardless of caller grants
-- for the policy evaluation context handled by Postgres' policy machinery). Revoke from public/anon
-- and only grant EXECUTE to authenticated for the ones meant to be called as RPCs.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_trainer_of(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.reapply_trainer(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reapply_trainer(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.approve_trainer(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_trainer(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reject_trainer(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_trainer(uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.link_client_by_email(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_client_by_email(text) TO authenticated;

-- 4. Storage: prevent listing of exercise-media bucket while still allowing public URL fetch.
-- Public bucket access via signed/public URL does not require the broad SELECT policy.
DROP POLICY IF EXISTS "Exercise media public read" ON storage.objects;
