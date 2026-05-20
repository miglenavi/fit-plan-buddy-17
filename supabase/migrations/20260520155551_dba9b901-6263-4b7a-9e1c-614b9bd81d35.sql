-- 2) trainer_applications table
CREATE TABLE IF NOT EXISTS public.trainer_applications (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trainer_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Applicant views own application" ON public.trainer_applications;
CREATE POLICY "Applicant views own application"
  ON public.trainer_applications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Super admin views all applications" ON public.trainer_applications;
CREATE POLICY "Super admin views all applications"
  ON public.trainer_applications FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin updates applications" ON public.trainer_applications;
CREATE POLICY "Super admin updates applications"
  ON public.trainer_applications FOR UPDATE
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER trainer_applications_updated_at
  BEFORE UPDATE ON public.trainer_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) Replace handle_new_user: route trainer signups to applications
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
  _name text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name);

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client'::public.app_role);

  IF _role = 'trainer' THEN
    INSERT INTO public.trainer_applications (user_id, full_name, email, note, status)
    VALUES (NEW.id, _name, NEW.email, NEW.raw_user_meta_data->>'note', 'pending');
  ELSIF _role = 'super_admin' THEN
    -- ignore: super_admin must be seeded manually
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4) Drop the now-obsolete trainer_exists() RPC
DROP FUNCTION IF EXISTS public.trainer_exists();

-- 5) Approve / Reject / Reapply RPCs
CREATE OR REPLACE FUNCTION public.approve_trainer(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can approve trainers';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_user_id, 'trainer')
  ON CONFLICT DO NOTHING;

  UPDATE public.trainer_applications
  SET status = 'approved',
      rejection_reason = NULL,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_trainer(_user_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Only super admins can reject trainers';
  END IF;

  UPDATE public.trainer_applications
  SET status = 'rejected',
      rejection_reason = _reason,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  WHERE user_id = _user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reapply_trainer(_note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.trainer_applications
  SET status = 'pending',
      rejection_reason = NULL,
      note = COALESCE(_note, note),
      reviewed_by = NULL,
      reviewed_at = NULL
  WHERE user_id = _uid AND status = 'rejected';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No rejected application to re-apply';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_trainer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_trainer(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reapply_trainer(text) TO authenticated;

-- 6) Let super_admin view all user_roles and profiles for the admin UI
DROP POLICY IF EXISTS "Super admin views all roles" ON public.user_roles;
CREATE POLICY "Super admin views all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Super admin views all profiles" ON public.profiles;
CREATE POLICY "Super admin views all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'super_admin'));