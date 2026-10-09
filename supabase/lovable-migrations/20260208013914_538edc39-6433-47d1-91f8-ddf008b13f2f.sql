-- Fix: allow the conversation creator to SELECT the row they just INSERTed.
-- Without this, PostgREST "return=representation" (used by supabase-js when calling .select())
-- fails because the user isn't yet in conversation_participants at insert time.

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

CREATE POLICY "Users can view conversations they participate in"
ON public.conversations
FOR SELECT
TO public
USING (
  public.is_conversation_participant(id)
  OR created_by = auth.uid()
);
