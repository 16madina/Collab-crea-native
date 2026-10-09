-- Add social media fields to profiles
ALTER TABLE public.profiles
ADD COLUMN youtube_followers TEXT,
ADD COLUMN instagram_followers TEXT,
ADD COLUMN tiktok_followers TEXT,
ADD COLUMN snapchat_followers TEXT;

-- Add pricing as JSONB for flexible tariff storage
-- Format: [{"type": "Story Instagram", "price": 25000, "description": "1 story avec mention"}, ...]
ALTER TABLE public.profiles
ADD COLUMN pricing JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.pricing IS 'Array of pricing items: [{type, price (in FCFA), description}]';