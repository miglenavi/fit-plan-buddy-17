
-- 1) Archive flag on trainer_clients
ALTER TABLE public.trainer_clients
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- 2) Trigger: enforce one active client_programs row per client
CREATE OR REPLACE FUNCTION public.deactivate_other_active_programs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE public.client_programs
      SET status = 'archived',
          end_date = COALESCE(end_date, CURRENT_DATE),
          updated_at = now()
      WHERE client_id = NEW.client_id
        AND id <> NEW.id
        AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_one_active_program ON public.client_programs;
CREATE TRIGGER trg_one_active_program
AFTER INSERT OR UPDATE OF status ON public.client_programs
FOR EACH ROW EXECUTE FUNCTION public.deactivate_other_active_programs();
