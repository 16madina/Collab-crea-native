-- Add verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS identity_document_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS identity_submitted_at timestamp with time zone DEFAULT NULL;

-- Create a function to check if user is fully verified
CREATE OR REPLACE FUNCTION public.is_user_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND email_verified = true
      AND identity_verified = true
  )
$$;

-- Update applications RLS policy to require verification for creators
DROP POLICY IF EXISTS "Creators can apply to offers" ON public.applications;
CREATE POLICY "Creators can apply to offers" 
ON public.applications 
FOR INSERT 
WITH CHECK (
  auth.uid() = creator_id 
  AND public.is_user_verified(auth.uid())
);

-- Update messages RLS policy to require verification for sending
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  is_conversation_participant(conversation_id) 
  AND auth.uid() = sender_id
  AND public.is_user_verified(auth.uid())
);

-- Update conversations RLS policy to require verification for creating
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by
  AND public.is_user_verified(auth.uid())
);