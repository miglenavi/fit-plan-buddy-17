
CREATE POLICY "Super admin views all client programs" ON public.client_programs FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all exercises" ON public.exercises FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all plans" ON public.plans FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all session exercises" ON public.session_exercises FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all set logs" ON public.set_logs FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all trainer clients" ON public.trainer_clients FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all training exercises" ON public.training_exercises FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all training sessions" ON public.training_sessions FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin views all trainings" ON public.trainings FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
