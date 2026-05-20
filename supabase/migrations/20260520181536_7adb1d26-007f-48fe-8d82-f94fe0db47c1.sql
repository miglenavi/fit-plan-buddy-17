
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _role public.app_role;
  _name text;
  _invited_as text;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name);

  _invited_as := NEW.raw_user_meta_data->>'invited_as';

  -- Super-admin invitation flow: auto-assign role, no application needed
  IF _invited_as = 'trainer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'trainer')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  _role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'client'::public.app_role);

  IF _role = 'trainer' THEN
    INSERT INTO public.trainer_applications (user_id, full_name, email, note, status)
    VALUES (NEW.id, _name, NEW.email, NEW.raw_user_meta_data->>'note', 'pending');
  ELSIF _role = 'super_admin' THEN
    NULL;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client');
  END IF;

  RETURN NEW;
END;
$function$;
