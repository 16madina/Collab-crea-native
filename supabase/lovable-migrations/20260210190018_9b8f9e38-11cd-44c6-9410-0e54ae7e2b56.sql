
-- Add selfie and identity method fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS selfie_url text,
ADD COLUMN IF NOT EXISTS identity_method text;

-- identity_method can be 'document' or 'selfie'
