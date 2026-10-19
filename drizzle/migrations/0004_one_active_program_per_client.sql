-- Existing trigger wrote status 'archived', which the status CHECK rejects. Use the allowed 'completed'
-- and never push an end_date later than today.
CREATE OR REPLACE FUNCTION public.deactivate_other_active_programs()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.client_programs
      SET status = 'completed',
          end_date = CASE WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN CURRENT_DATE ELSE end_date END,
          updated_at = now()
      WHERE client_id = NEW.client_id
        AND id <> NEW.id
        AND status = 'active';
  END IF;
  RETURN NEW;
END;
$function$;

-- Hard guarantee: at most one active assignment per client.
CREATE UNIQUE INDEX IF NOT EXISTS client_programs_one_active_per_client
  ON public.client_programs (client_id) WHERE status = 'active';

-- Single, race-safe way to assign/replace a client's program.
CREATE OR REPLACE FUNCTION public.assign_client_program(_client_id uuid, _plan_id uuid, _start_date date, _end_date date DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _existing public.client_programs;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'trainer') THEN RAISE EXCEPTION 'Only trainers can assign programs'; END IF;
  IF NOT public.is_trainer_of(_uid, _client_id) THEN RAISE EXCEPTION 'Not your client'; END IF;
  IF NOT public.is_plan_owned_by_trainer(_plan_id, _uid) THEN RAISE EXCEPTION 'Not your plan'; END IF;
  IF _start_date IS NULL THEN RAISE EXCEPTION 'Start date is required'; END IF;
  IF _start_date > CURRENT_DATE THEN RAISE EXCEPTION 'Start date can''t be in the future'; END IF;
  IF _end_date IS NOT NULL AND _end_date < _start_date THEN RAISE EXCEPTION 'End date must be on or after the start date'; END IF;
  IF _end_date IS NOT NULL AND _end_date < CURRENT_DATE THEN RAISE EXCEPTION 'End date can''t be in the past'; END IF;

  -- Serialize concurrent assignments for the same client.
  PERFORM pg_advisory_xact_lock(hashtextextended('client_programs:' || _client_id::text, 0));

  SELECT * INTO _existing FROM public.client_programs
    WHERE client_id = _client_id AND status = 'active' LIMIT 1;
  IF _existing.id IS NOT NULL AND _existing.plan_id = _plan_id THEN
    RETURN _existing.id; -- same program already active: no-op
  END IF;

  UPDATE public.client_programs
    SET status = 'completed',
        end_date = CASE WHEN end_date IS NULL OR end_date > CURRENT_DATE THEN CURRENT_DATE ELSE end_date END
    WHERE client_id = _client_id AND status = 'active';

  INSERT INTO public.client_programs (trainer_id, client_id, plan_id, start_date, end_date, status)
    VALUES (_uid, _client_id, _plan_id, _start_date, _end_date, 'active')
    RETURNING id INTO _new_id;
  RETURN _new_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.assign_client_program(uuid, uuid, date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_client_program(uuid, uuid, date, date) TO authenticated;