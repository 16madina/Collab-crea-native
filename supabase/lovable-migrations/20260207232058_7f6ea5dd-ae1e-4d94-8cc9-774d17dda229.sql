-- Add images column to offers table for product photos
ALTER TABLE public.offers ADD COLUMN images text[] DEFAULT '{}';

-- Create storage bucket for offer images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('offer-images', 'offer-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view offer images
CREATE POLICY "Offer images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'offer-images');

-- Allow authenticated users to upload offer images
CREATE POLICY "Authenticated users can upload offer images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'offer-images' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own offer images
CREATE POLICY "Users can delete their own offer images"
ON storage.objects FOR DELETE
USING (bucket_id = 'offer-images' AND auth.uid()::text = (storage.foldername(name))[1]);