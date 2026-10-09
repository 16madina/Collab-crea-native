-- Add residence_country column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN residence_country TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.residence_country IS 'Country of residence (for dual-flag display). The existing country column stores the origin country for creators.';