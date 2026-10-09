
-- Add delivery_mode to offers: 'private' (default, send file) or 'network' (publish on social networks)
ALTER TABLE public.offers
ADD COLUMN delivery_mode text NOT NULL DEFAULT 'private';

-- Add publication_url to collaborations for the "network" mode (link to the published post)
ALTER TABLE public.collaborations
ADD COLUMN publication_url text;

-- Add a new status 'pending_publication' for when brand approves preview but awaits network post link
-- (no migration needed, we just use this string value in status)
