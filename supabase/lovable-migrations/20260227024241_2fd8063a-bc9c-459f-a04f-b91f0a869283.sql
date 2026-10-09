
INSERT INTO storage.buckets (id, name, public) VALUES ('withdrawal-proofs', 'withdrawal-proofs', false);

CREATE POLICY "Admins can upload proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'withdrawal-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can view proofs" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'withdrawal-proofs' AND public.has_role(auth.uid(), 'admin'::public.app_role));
