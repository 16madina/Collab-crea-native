
-- Add creative brief to offers (contact info, hashtags, texts visible to all applicants)
ALTER TABLE public.offers
ADD COLUMN creative_brief jsonb DEFAULT '{}'::jsonb;

-- Add brand assets URLs to collaborations (logos/photos sent after acceptance)
ALTER TABLE public.collaborations
ADD COLUMN brand_assets text[] DEFAULT '{}'::text[];

COMMENT ON COLUMN public.offers.creative_brief IS 'Brand creative brief: phone, address, hashtags, mentions, guidelines';
COMMENT ON COLUMN public.collaborations.brand_assets IS 'Brand asset URLs (logos, photos) uploaded for the creator';
