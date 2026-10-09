
CREATE POLICY "Users can view their own withdrawal proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'withdrawal-proofs' AND (EXISTS (SELECT 1 FROM public.withdrawal_requests wr WHERE wr.proof_url LIKE '%' || name AND wr.user_id = auth.uid())));
