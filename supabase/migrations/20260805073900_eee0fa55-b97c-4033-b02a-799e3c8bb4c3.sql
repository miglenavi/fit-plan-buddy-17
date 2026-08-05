CREATE TABLE public.waitlist_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  role text,
  source text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX waitlist_signups_email_key ON public.waitlist_signups (lower(email));

GRANT INSERT ON public.waitlist_signups TO anon;
GRANT INSERT ON public.waitlist_signups TO authenticated;
GRANT SELECT ON public.waitlist_signups TO authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;

ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join the waitlist"
  ON public.waitlist_signups FOR INSERT TO anon, authenticated
  WITH CHECK (
    email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
    AND length(email) <= 255
    AND (role IS NULL OR role IN ('trainer','client','other'))
    AND (source IS NULL OR length(source) <= 100)
    AND (note IS NULL OR length(note) <= 500)
  );

CREATE POLICY "Super admins can read waitlist"
  ON public.waitlist_signups FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete waitlist entries"
  ON public.waitlist_signups FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));