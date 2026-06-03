
-- Drop old workout/logging tables (wipes data)
DROP TABLE IF EXISTS public.exercise_logs CASCADE;
DROP TABLE IF EXISTS public.assigned_workouts CASCADE;
DROP TABLE IF EXISTS public.program_workouts CASCADE;
DROP TABLE IF EXISTS public.workout_plan_exercises CASCADE;
DROP TABLE IF EXISTS public.workout_plans CASCADE;
DROP TABLE IF EXISTS public.client_programs CASCADE;

-- Extend exercises
DO $$ BEGIN
  CREATE TYPE public.muscle_group AS ENUM (
    'chest','back','shoulders','biceps','triceps',
    'quads','hamstrings','glutes','calves','core','full_body'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS muscle_groups public.muscle_group[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_rest_seconds integer;

-- PLANS
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own plans" ON public.plans
  USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE TRIGGER set_plans_updated_at BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- TRAININGS
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own trainings" ON public.trainings
  USING (EXISTS (SELECT 1 FROM public.plans p WHERE p.id = trainings.plan_id AND p.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.plans p WHERE p.id = trainings.plan_id AND p.trainer_id = auth.uid()));
CREATE TRIGGER set_trainings_updated_at BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_trainings_plan ON public.trainings(plan_id, order_index);

-- TRAINING_EXERCISES
CREATE TABLE public.training_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  target_sets integer NOT NULL DEFAULT 3,
  target_reps_min integer NOT NULL DEFAULT 8,
  target_reps_max integer NOT NULL DEFAULT 10,
  target_weight numeric,
  rest_seconds integer,
  coach_notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_exercises TO authenticated;
GRANT ALL ON public.training_exercises TO service_role;
ALTER TABLE public.training_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own training exercises" ON public.training_exercises
  USING (EXISTS (
    SELECT 1 FROM public.trainings t JOIN public.plans p ON p.id = t.plan_id
    WHERE t.id = training_exercises.training_id AND p.trainer_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trainings t JOIN public.plans p ON p.id = t.plan_id
    WHERE t.id = training_exercises.training_id AND p.trainer_id = auth.uid()));
CREATE INDEX idx_training_exercises_training ON public.training_exercises(training_id, order_index);

-- CLIENT_PROGRAMS (now points to plans)
CREATE TABLE public.client_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_programs TO authenticated;
GRANT ALL ON public.client_programs TO service_role;
ALTER TABLE public.client_programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Trainer manages own client programs" ON public.client_programs
  USING (auth.uid() = trainer_id)
  WITH CHECK (auth.uid() = trainer_id AND public.is_trainer_of(auth.uid(), client_id));
CREATE POLICY "Client views own programs" ON public.client_programs FOR SELECT
  USING (auth.uid() = client_id);
CREATE TRIGGER set_client_programs_updated_at BEFORE UPDATE ON public.client_programs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_client_programs_client ON public.client_programs(client_id, status);
CREATE INDEX idx_client_programs_plan ON public.client_programs(plan_id);

-- Now that client_programs exists, add client-view policies on plans/trainings/training_exercises
CREATE POLICY "Client views assigned plans" ON public.plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_programs cp
    WHERE cp.plan_id = plans.id AND cp.client_id = auth.uid()
  ));
CREATE POLICY "Client views trainings of assigned plans" ON public.trainings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.client_programs cp
    WHERE cp.plan_id = trainings.plan_id AND cp.client_id = auth.uid()
  ));
CREATE POLICY "Client views training exercises of assigned plans" ON public.training_exercises FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trainings t
    JOIN public.client_programs cp ON cp.plan_id = t.plan_id
    WHERE t.id = training_exercises.training_id AND cp.client_id = auth.uid()
  ));

-- TRAINING_SESSIONS
CREATE TABLE public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trainer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','abandoned')),
  logged_by text NOT NULL DEFAULT 'client' CHECK (logged_by IN ('client','trainer')),
  client_notes text,
  trainer_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_sessions TO authenticated;
GRANT ALL ON public.training_sessions TO service_role;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client manages own sessions" ON public.training_sessions
  USING (auth.uid() = client_id) WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Trainer manages client sessions" ON public.training_sessions
  USING (public.is_trainer_of(auth.uid(), client_id))
  WITH CHECK (public.is_trainer_of(auth.uid(), client_id));
CREATE TRIGGER set_training_sessions_updated_at BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_sessions_client ON public.training_sessions(client_id, started_at DESC);
CREATE INDEX idx_sessions_training_client ON public.training_sessions(training_id, client_id, completed_at DESC);

-- SESSION_EXERCISES
CREATE TABLE public.session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  training_exercise_id uuid REFERENCES public.training_exercises(id) ON DELETE SET NULL,
  exercise_id uuid NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  target_sets integer,
  target_reps_min integer,
  target_reps_max integer,
  target_weight numeric,
  notes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_exercises TO authenticated;
GRANT ALL ON public.session_exercises TO service_role;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client manages own session exercises" ON public.session_exercises
  USING (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_exercises.session_id AND s.client_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_exercises.session_id AND s.client_id = auth.uid()));
CREATE POLICY "Trainer manages client session exercises" ON public.session_exercises
  USING (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_exercises.session_id AND public.is_trainer_of(auth.uid(), s.client_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions s WHERE s.id = session_exercises.session_id AND public.is_trainer_of(auth.uid(), s.client_id)));
CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id, order_index);

-- SET_LOGS
CREATE TABLE public.set_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id uuid NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_index integer NOT NULL,
  reps integer,
  weight numeric,
  rpe numeric,
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_exercise_id, set_index)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.set_logs TO authenticated;
GRANT ALL ON public.set_logs TO service_role;
ALTER TABLE public.set_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Client manages own set logs" ON public.set_logs
  USING (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id AND s.client_id = auth.uid()))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id AND s.client_id = auth.uid()));
CREATE POLICY "Trainer manages client set logs" ON public.set_logs
  USING (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id AND public.is_trainer_of(auth.uid(), s.client_id)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions s ON s.id = se.session_id
    WHERE se.id = set_logs.session_exercise_id AND public.is_trainer_of(auth.uid(), s.client_id)));
CREATE TRIGGER set_set_logs_updated_at BEFORE UPDATE ON public.set_logs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_set_logs_session_exercise ON public.set_logs(session_exercise_id, set_index);
