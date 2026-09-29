ALTER TABLE public.training_sessions ALTER COLUMN training_id DROP NOT NULL;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS custom_name text;
COMMENT ON COLUMN public.training_sessions.custom_name IS 'Name for an improvised/ad-hoc session started without a plan training day. Null for plan-based sessions.';