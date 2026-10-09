-- Allow creators to also create collaborations (when accepting proposals)
CREATE POLICY "Creators can create collaborations"
ON public.collaborations
FOR INSERT
WITH CHECK (auth.uid() = creator_id);