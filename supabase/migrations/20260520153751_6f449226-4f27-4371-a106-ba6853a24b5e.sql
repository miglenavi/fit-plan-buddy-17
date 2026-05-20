
ALTER TABLE public.trainer_clients
  ADD CONSTRAINT trainer_clients_client_profile_fk FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.assigned_workouts
  ADD CONSTRAINT assigned_workouts_client_profile_fk FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
