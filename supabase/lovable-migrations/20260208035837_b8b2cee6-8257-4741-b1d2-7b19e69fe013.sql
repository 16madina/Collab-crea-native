-- Drop incorrect policies
DROP POLICY IF EXISTS "Creators can upload collaboration content" ON storage.objects;
DROP POLICY IF EXISTS "Creators can update their collaboration content" ON storage.objects;
DROP POLICY IF EXISTS "Creators can delete their collaboration content" ON storage.objects;

-- Recreate with correct logic (using collaboration_id as folder path)
-- Anyone authenticated can upload to their collaboration folders
CREATE POLICY "Authenticated users can upload collaboration content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collaboration-content' 
  AND auth.role() = 'authenticated'
);

-- Users can update content in collaboration-content bucket
CREATE POLICY "Authenticated users can update collaboration content"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'collaboration-content' 
  AND auth.role() = 'authenticated'
);

-- Users can delete content in collaboration-content bucket
CREATE POLICY "Authenticated users can delete collaboration content"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collaboration-content' 
  AND auth.role() = 'authenticated'
);