
-- Storage: require trainer role for update/delete on exercise-media
DROP POLICY IF EXISTS "Trainers update own exercise media" ON storage.objects;
DROP POLICY IF EXISTS "Trainers delete own exercise media" ON storage.objects;

CREATE POLICY "Trainers update own exercise media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'trainer'::public.app_role)
)
WITH CHECK (
  bucket_id = 'exercise-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'trainer'::public.app_role)
);

CREATE POLICY "Trainers delete own exercise media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-media'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'trainer'::public.app_role)
);

-- Helper: confirm a training belongs to a plan assigned to a client (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_training_assigned_to_client(_training_id uuid, _client_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.trainings t
    JOIN public.client_programs cp ON cp.plan_id = t.plan_id
    WHERE t.id = _training_id
      AND cp.client_id = _client_id
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_training_assigned_to_client(uuid, uuid) TO authenticated;

-- Tighten client insert on training_sessions: training must belong to an assigned plan
DROP POLICY IF EXISTS "Client inserts own sessions" ON public.training_sessions;

CREATE POLICY "Client inserts own sessions"
ON public.training_sessions FOR INSERT
WITH CHECK (
  auth.uid() = client_id
  AND trainer_id IS NULL
  AND public.is_training_assigned_to_client(training_id, auth.uid())
);
