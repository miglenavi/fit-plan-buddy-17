
ALTER TABLE public.exercises
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-media', 'exercise-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Exercise media public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-media');

CREATE POLICY "Trainers upload own exercise media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'exercise-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND public.has_role(auth.uid(), 'trainer'::public.app_role)
);

CREATE POLICY "Trainers update own exercise media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'exercise-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Trainers delete own exercise media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'exercise-media'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
