-- Grant execute on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.can_initiate_contact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Recreate the INSERT policy with explicit function call
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND public.can_initiate_contact(auth.uid())
);

-- Also ensure conversation_participants INSERT works for the conversation creator
DROP POLICY IF EXISTS "Conversation creator can add participants" ON public.conversation_participants;

CREATE POLICY "Conversation creator can add participants"
ON public.conversation_participants
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND c.created_by = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Ensure messages INSERT policy is also correct
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_conversation_participant(conversation_id)
  AND auth.uid() = sender_id
);