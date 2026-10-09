-- Create storage bucket for collaboration content (videos and files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('collaboration-content', 'collaboration-content', true)
ON CONFLICT (id) DO NOTHING;

-- Allow creators to upload content for their collaborations
CREATE POLICY "Creators can upload collaboration content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collaboration-content' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]::text
);

-- Allow creators to update their own content
CREATE POLICY "Creators can update their collaboration content"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'collaboration-content' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]::text
);

-- Allow creators to delete their own content
CREATE POLICY "Creators can delete their collaboration content"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collaboration-content' 
  AND auth.uid()::text = (string_to_array(name, '/'))[1]::text
);

-- Allow public read access to collaboration content
CREATE POLICY "Public read access to collaboration content"
ON storage.objects
FOR SELECT
USING (bucket_id = 'collaboration-content');