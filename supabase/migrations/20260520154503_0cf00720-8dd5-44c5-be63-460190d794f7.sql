-- Restrict trainer signup to a single trainer and enforce server-side
CREATE OR REPLACE FUNCTION public.trainer_exists()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'trainer')
$$;

GRANT EXECUTE ON FUNCTION public.trainer_exists() TO anon, authenticated;

-- Update handle_new_user to block new trainer signups and block self-service client signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role public.app_role;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client'::public.app_role);

  IF _role = 'trainer' AND EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'trainer') THEN
    RAISE EXCEPTION 'Trainer account already exists. Only one trainer is allowed.';
  END IF;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);
  RETURN NEW;
END;
$$;

-- Ensure the trigger is attached (in case it was missing)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();