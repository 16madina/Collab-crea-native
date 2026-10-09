
-- Allow brands to also DELETE their own offers (needed for expired cleanup)
CREATE POLICY "Brands can delete their own offers"
ON public.offers
FOR DELETE
USING (auth.uid() = brand_id);
