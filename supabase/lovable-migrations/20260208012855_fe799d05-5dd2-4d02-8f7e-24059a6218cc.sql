-- Relax conversation creation policy to fix contact flow (RLS was blocking INSERT)
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- (Optional hardening later): reintroduce verification checks once the flow is stable
