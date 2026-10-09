
-- Add on-site/presence fields to offers
ALTER TABLE public.offers 
  ADD COLUMN IF NOT EXISTS presence_mode text NOT NULL DEFAULT 'remote',
  ADD COLUMN IF NOT EXISTS filming_by text NOT NULL DEFAULT 'creator',
  ADD COLUMN IF NOT EXISTS on_site_slots jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS on_site_city text,
  ADD COLUMN IF NOT EXISTS on_site_neighborhood text,
  ADD COLUMN IF NOT EXISTS on_site_store_name text;

-- Add comment for clarity
COMMENT ON COLUMN public.offers.presence_mode IS 'remote or on_site';
COMMENT ON COLUMN public.offers.filming_by IS 'creator or brand - who films/produces the content';
COMMENT ON COLUMN public.offers.on_site_slots IS 'Array of {date, start_time, end_time} for on-site availability';
