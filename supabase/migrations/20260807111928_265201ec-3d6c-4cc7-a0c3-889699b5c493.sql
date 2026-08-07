CREATE POLICY "Trainer views requesting client profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trainer_requests r
    WHERE r.trainer_id = auth.uid()
      AND r.client_id = profiles.id
      AND r.status = 'pending'
  ));