-- Enable replica identity full on messages so realtime sends old values on UPDATE
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- Allow participants to mark messages as read (update read_at)
CREATE POLICY "Participants can mark messages as read"
  ON public.messages
  FOR UPDATE
  USING (
    public.is_conversation_participant(conversation_id)
  )
  WITH CHECK (
    public.is_conversation_participant(conversation_id)
  );