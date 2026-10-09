-- Tables offers et applications : elles existaient dans la base Lovable mais
-- n'ont jamais été créées par une migration. Reconstituées depuis types.ts ;
-- les colonnes ajoutées plus tard (images, delivery_mode, creative_brief,
-- presence_mode, on_site_*, selected_slot) viennent des migrations suivantes.

CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  content_type TEXT NOT NULL,
  budget_min INTEGER NOT NULL DEFAULT 0,
  budget_max INTEGER NOT NULL DEFAULT 0,
  deadline DATE,
  location TEXT,
  logo_url TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active offers are viewable by everyone"
ON public.offers FOR SELECT
USING (status = 'active' OR auth.uid() = brand_id);

CREATE POLICY "Brands can create their own offers"
ON public.offers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = brand_id);

CREATE POLICY "Brands can update their own offers"
ON public.offers FOR UPDATE TO authenticated
USING (auth.uid() = brand_id);

CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_offers_brand_id ON public.offers(brand_id);
CREATE INDEX idx_offers_status ON public.offers(status);

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (offer_id, creator_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators and offer owners can view applications"
ON public.applications FOR SELECT
USING (
  auth.uid() = creator_id
  OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.brand_id = auth.uid())
);

CREATE POLICY "Creators can apply to offers"
ON public.applications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators and offer owners can update applications"
ON public.applications FOR UPDATE TO authenticated
USING (
  auth.uid() = creator_id
  OR EXISTS (SELECT 1 FROM public.offers o WHERE o.id = offer_id AND o.brand_id = auth.uid())
);

CREATE TRIGGER update_applications_updated_at
BEFORE UPDATE ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_applications_offer_id ON public.applications(offer_id);
CREATE INDEX idx_applications_creator_id ON public.applications(creator_id);
