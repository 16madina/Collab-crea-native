CREATE POLICY "Admins can view all identity documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-documents'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);