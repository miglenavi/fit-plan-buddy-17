
-- Roles
CREATE TYPE public.app_role AS ENUM ('trainer', 'client');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Link clients to trainers
CREATE TABLE public.trainer_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trainer_id, client_id)
);
ALTER TABLE public.trainer_clients ENABLE ROW LEVEL SECURITY;

-- Security definer helpers
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_trainer_of(_trainer uuid, _client uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trainer_clients WHERE trainer_id = _trainer AND client_id = _client)
$$;

-- Profile auto-create trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client'::public.app_role);
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Exercises (trainer-owned library)
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  muscle_group TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Workout plans
CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.workout_plan_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  target_sets INT NOT NULL DEFAULT 3,
  target_reps INT NOT NULL DEFAULT 10,
  target_weight NUMERIC,
  order_index INT NOT NULL DEFAULT 0,
  notes TEXT
);
ALTER TABLE public.workout_plan_exercises ENABLE ROW LEVEL SECURITY;

-- Assigned workouts
CREATE TABLE public.assigned_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID NOT NULL REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.assigned_workouts ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_assigned_client_date ON public.assigned_workouts(client_id, scheduled_date);

-- Exercise logs (client actuals)
CREATE TABLE public.exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_workout_id UUID NOT NULL REFERENCES public.assigned_workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  actual_sets INT,
  actual_reps INT,
  actual_weight NUMERIC,
  notes TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assigned_workout_id, exercise_id)
);
ALTER TABLE public.exercise_logs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER exercise_logs_updated_at BEFORE UPDATE ON public.exercise_logs
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ POLICIES ============

-- profiles
CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Trainer views client profiles" ON public.profiles
  FOR SELECT USING (public.is_trainer_of(auth.uid(), id));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- user_roles
CREATE POLICY "Users view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Trainer views client roles" ON public.user_roles
  FOR SELECT USING (public.is_trainer_of(auth.uid(), user_id));

-- trainer_clients
CREATE POLICY "Trainer views own links" ON public.trainer_clients
  FOR SELECT USING (auth.uid() = trainer_id);
CREATE POLICY "Client views own link" ON public.trainer_clients
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Trainer creates link to client" ON public.trainer_clients
  FOR INSERT WITH CHECK (auth.uid() = trainer_id AND public.has_role(auth.uid(), 'trainer'));
CREATE POLICY "Trainer deletes own link" ON public.trainer_clients
  FOR DELETE USING (auth.uid() = trainer_id);

-- exercises
CREATE POLICY "Trainer manages own exercises" ON public.exercises
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "Client views assigned exercises" ON public.exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.assigned_workouts aw
      JOIN public.workout_plan_exercises wpe ON wpe.workout_plan_id = aw.workout_plan_id
      WHERE wpe.exercise_id = exercises.id AND aw.client_id = auth.uid()
    )
  );

-- workout_plans
CREATE POLICY "Trainer manages own plans" ON public.workout_plans
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id);
CREATE POLICY "Client views assigned plans" ON public.workout_plans
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assigned_workouts aw WHERE aw.workout_plan_id = workout_plans.id AND aw.client_id = auth.uid())
  );

-- workout_plan_exercises
CREATE POLICY "Trainer manages own plan exercises" ON public.workout_plan_exercises
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND wp.trainer_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.workout_plans wp WHERE wp.id = workout_plan_id AND wp.trainer_id = auth.uid())
  );
CREATE POLICY "Client views assigned plan exercises" ON public.workout_plan_exercises
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assigned_workouts aw WHERE aw.workout_plan_id = workout_plan_exercises.workout_plan_id AND aw.client_id = auth.uid())
  );

-- assigned_workouts
CREATE POLICY "Trainer manages own assignments" ON public.assigned_workouts
  FOR ALL USING (auth.uid() = trainer_id) WITH CHECK (auth.uid() = trainer_id AND public.is_trainer_of(auth.uid(), client_id));
CREATE POLICY "Client views own assignments" ON public.assigned_workouts
  FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Client updates own assignment status" ON public.assigned_workouts
  FOR UPDATE USING (auth.uid() = client_id);

-- exercise_logs
CREATE POLICY "Client manages own logs" ON public.exercise_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.assigned_workouts aw WHERE aw.id = assigned_workout_id AND aw.client_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.assigned_workouts aw WHERE aw.id = assigned_workout_id AND aw.client_id = auth.uid())
  );
CREATE POLICY "Trainer views client logs" ON public.exercise_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.assigned_workouts aw WHERE aw.id = assigned_workout_id AND aw.trainer_id = auth.uid())
  );
