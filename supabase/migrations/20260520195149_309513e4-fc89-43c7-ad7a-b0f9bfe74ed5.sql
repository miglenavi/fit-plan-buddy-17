
CREATE TABLE public.client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  client_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own programs" ON public.client_programs
  FOR ALL USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id AND public.is_trainer_of(auth.uid(), client_id));

CREATE POLICY "Client views own programs" ON public.client_programs
  FOR SELECT USING (auth.uid() = client_id);

CREATE TRIGGER set_client_programs_updated_at
  BEFORE UPDATE ON public.client_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.program_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES public.client_programs(id) ON DELETE CASCADE,
  workout_plan_id uuid NOT NULL,
  slot integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.program_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainer manages own program workouts" ON public.program_workouts
  FOR ALL USING (EXISTS (SELECT 1 FROM public.client_programs cp WHERE cp.id = program_workouts.program_id AND cp.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.client_programs cp WHERE cp.id = program_workouts.program_id AND cp.trainer_id = auth.uid()));

CREATE POLICY "Client views own program workouts" ON public.program_workouts
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.client_programs cp WHERE cp.id = program_workouts.program_id AND cp.client_id = auth.uid()));

ALTER TABLE public.assigned_workouts
  ADD COLUMN program_id uuid REFERENCES public.client_programs(id) ON DELETE SET NULL,
  ADD COLUMN week_start_date date,
  ALTER COLUMN scheduled_date DROP NOT NULL;

CREATE INDEX idx_assigned_workouts_program_week ON public.assigned_workouts(program_id, week_start_date);
CREATE INDEX idx_assigned_workouts_client_week ON public.assigned_workouts(client_id, week_start_date);
