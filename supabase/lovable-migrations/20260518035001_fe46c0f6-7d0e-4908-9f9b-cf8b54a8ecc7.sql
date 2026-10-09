
-- 1. Wallets: revoke direct user UPDATE on balance/pending_balance
DROP POLICY IF EXISTS "System can update wallets" ON public.wallets;
-- Only admins (or SECURITY DEFINER edge functions using service role) can update wallets
CREATE POLICY "Admins can update wallets"
ON public.wallets
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Transactions: remove user self-insert; only admins / SECURITY DEFINER server logic may insert
DROP POLICY IF EXISTS "Users can create transactions" ON public.transactions;

-- 3. user_roles: prevent self-assigning admin or moderator roles
DROP POLICY IF EXISTS "Users can insert their own role on signup" ON public.user_roles;
CREATE POLICY "Users can self-assign non-admin role on signup"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND role IN ('creator'::public.app_role, 'brand'::public.app_role)
);

-- 4. Storage: collaboration-content ownership on UPDATE/DELETE
DROP POLICY IF EXISTS "Authenticated users can update collaboration content" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete collaboration content" ON storage.objects;

CREATE POLICY "Owners can update their collaboration content"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'collaboration-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can delete their collaboration content"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'collaboration-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Also restrict INSERT to user's own folder
DROP POLICY IF EXISTS "Authenticated users can upload collaboration content" ON storage.objects;
CREATE POLICY "Owners can upload their collaboration content"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'collaboration-content'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Storage: offer-images folder ownership on INSERT and UPDATE
DROP POLICY IF EXISTS "Authenticated users can upload offer images" ON storage.objects;
CREATE POLICY "Brands can upload offer images to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'offer-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Brands can update their own offer images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'offer-images'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
