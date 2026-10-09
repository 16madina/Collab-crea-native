-- Make can_initiate_contact rely on has_role() to avoid any join ambiguity
CREATE OR REPLACE FUNCTION public.can_initiate_contact(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.email_verified = true
    )
    AND (
      -- Brands: email verification is enough
      public.has_role(_user_id, 'brand'::public.app_role)
      OR (
        -- Creators/Admins: require identity verification too
        (public.has_role(_user_id, 'creator'::public.app_role) OR public.has_role(_user_id, 'admin'::public.app_role))
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.user_id = _user_id
            AND p.identity_verified = true
        )
      )
    );
$$;

-- Recreate conversation insert policy with explicit schema-qualified function call
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND public.can_initiate_contact(auth.uid())
);

-- Recreate messages insert policy with explicit schema-qualified function call
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
ON public.messages
FOR INSERT
WITH CHECK (
  is_conversation_participant(conversation_id)
  AND auth.uid() = sender_id
  AND public.can_initiate_contact(auth.uid())
);