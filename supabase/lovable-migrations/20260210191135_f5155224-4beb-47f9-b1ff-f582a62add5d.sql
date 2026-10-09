
-- Create storage bucket for selfies
INSERT INTO storage.buckets (id, name, public)
VALUES ('selfies', 'selfies', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: users can upload their own selfie
CREATE POLICY "Users can upload their own selfie"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can view their own selfie
CREATE POLICY "Users can view their own selfie"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: users can update their own selfie
CREATE POLICY "Users can update their own selfie"
ON storage.objects FOR UPDATE
USING (bucket_id = 'selfies' AND auth.uid()::text = (storage.foldername(name))[1]);

-- RLS: admins can view all selfies
CREATE POLICY "Admins can view all selfies"
ON storage.objects FOR SELECT
USING (bucket_id = 'selfies' AND public.has_role(auth.uid(), 'admin'));
