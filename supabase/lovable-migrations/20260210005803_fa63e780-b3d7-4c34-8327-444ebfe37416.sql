-- Add collaborations and conversations to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Enable full replica identity for proper UPDATE tracking
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.collaborations REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;