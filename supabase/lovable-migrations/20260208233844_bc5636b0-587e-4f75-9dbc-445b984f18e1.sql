-- Create trigger function for push notification on new proposal (new conversation with offer)
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_proposal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_participant record;
BEGIN
  -- Only trigger if the conversation has an offer_id (it's a proposal)
  IF NEW.offer_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Send push to all participants except the creator of the conversation
  FOR v_participant IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.id
      AND cp.user_id != NEW.created_by
  LOOP
    PERFORM public.send_push_notification(
      v_participant.user_id,
      '📩 Nouvelle proposition !',
      COALESCE(v_brand_name, 'Une marque') || ' vous propose une collaboration : "' || COALESCE(v_offer_title, 'Offre') || '"',
      jsonb_build_object('route', '/collabs', 'conversation_id', NEW.id, 'offer_id', NEW.offer_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on conversations table for new proposals
DROP TRIGGER IF EXISTS on_new_proposal ON public.conversations;
CREATE TRIGGER on_new_proposal
  AFTER INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_new_proposal();