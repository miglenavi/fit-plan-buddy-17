
-- 1) Harden handle_new_user against self-supplied invited_as metadata
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
  _invited_by uuid;
  _is_admin_invite boolean;
BEGIN
  _name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, _name);

  _invited_as := NEW.raw_user_meta_data->>'invited_as';
  _invited_by := NULLIF(NEW.raw_user_meta_data->>'invited_by', '')::uuid;
  -- invited_at is only set by Supabase when the admin invite API is used
  _is_admin_invite := NEW.invited_at IS NOT NULL;

  -- Only honor invited_as when this account was actually created via admin invite
  IF _is_admin_invite AND _invited_as = 'trainer' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'trainer')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  IF _is_admin_invite AND _invited_as = 'client' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
    ON CONFLICT DO NOTHING;
    -- Only auto-link to a trainer if the inviter is in fact a trainer
    IF _invited_by IS NOT NULL AND public.has_role(_invited_by, 'trainer') THEN
      INSERT INTO public.trainer_clients (trainer_id, client_id)
      VALUES (_invited_by, NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  -- Self-signup path: never trust client-supplied role metadata.
  -- Optional 'role' = 'trainer' => create a pending application; otherwise default to client.
  _role := COALESCE(NULLIF(NEW.raw_user_meta_data->>'role',''), 'client')::public.app_role;

  IF _role = 'trainer' THEN
    INSERT INTO public.trainer_applications (user_id, full_name, email, note, status)
    VALUES (NEW.id, _name, NEW.email, NEW.raw_user_meta_data->>'note', 'pending');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'client')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2) Allow any authenticated user to read the shared built-in exercise catalog
DROP POLICY IF EXISTS "Trainers view built-in exercises" ON public.exercises;
CREATE POLICY "Authenticated view built-in exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (trainer_id IS NULL);

-- 3) Tighten client UPDATE policy on training_sessions
DROP POLICY IF EXISTS "Client updates own sessions" ON public.training_sessions;
CREATE POLICY "Client updates own sessions"
ON public.training_sessions
FOR UPDATE
TO authenticated
USING (
  auth.uid() = client_id
  AND logged_by = 'client'
  AND trainer_id IS NULL
)
WITH CHECK (
  auth.uid() = client_id
  AND logged_by = 'client'
  AND trainer_id IS NULL
  AND trainer_notes IS NULL
  AND status IN ('in_progress','completed','abandoned')
);
