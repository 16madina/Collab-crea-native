-- Create a function to check if user can initiate contact
-- Brands only need email verification, creators need full verification
CREATE OR REPLACE FUNCTION public.can_initiate_contact(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    LEFT JOIN public.user_roles r ON r.user_id = p.user_id
    WHERE p.user_id = _user_id
      AND p.email_verified = true
      AND (
        -- Brands only need email verification
        r.role = 'brand'
        -- Creators and admins need full verification
        OR (r.role IN ('creator', 'admin') AND p.identity_verified = true)
      )
  )
$$;

-- Drop and recreate the conversation insert policy with the new function
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() = created_by 
  AND can_initiate_contact(auth.uid())
);

-- Also update the messages policy to allow brands to send without full verification
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;

CREATE POLICY "Users can send messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  is_conversation_participant(conversation_id) 
  AND auth.uid() = sender_id 
  AND can_initiate_contact(auth.uid())
);