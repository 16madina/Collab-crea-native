-- Enable pg_net extension for HTTP calls from database triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a function to send push notifications via edge function
CREATE OR REPLACE FUNCTION public.send_push_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_supabase_url text;
  v_service_key text;
BEGIN
  -- Get Supabase URL and service key from vault or use direct values
  v_supabase_url := 'https://qsbkwdtchhzclpxjrhnt.supabase.co';
  
  -- Make async HTTP call to edge function
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    )::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'X-Skip-Auth', 'true'
    )::jsonb
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;

-- Trigger function for new messages
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient_id uuid;
  v_sender_name text;
  v_conversation_subject text;
BEGIN
  -- Get all participants except the sender
  FOR v_recipient_id IN
    SELECT cp.user_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
  LOOP
    -- Get sender name
    SELECT full_name INTO v_sender_name
    FROM profiles
    WHERE user_id = NEW.sender_id;
    
    -- Get conversation subject
    SELECT COALESCE(c.subject, 'Nouvelle conversation') INTO v_conversation_subject
    FROM conversations c
    WHERE c.id = NEW.conversation_id;
    
    -- Send push notification
    PERFORM public.send_push_notification(
      v_recipient_id,
      COALESCE(v_sender_name, 'Nouveau message'),
      LEFT(NEW.content, 100),
      jsonb_build_object('route', '/collabs', 'conversation_id', NEW.conversation_id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger function for new applications (creator applies to offer)
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brand_id uuid;
  v_creator_name text;
  v_offer_title text;
BEGIN
  -- Get brand ID from offer
  SELECT o.brand_id, o.title INTO v_brand_id, v_offer_title
  FROM offers o
  WHERE o.id = NEW.offer_id;
  
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.creator_id;
  
  -- Send push to brand
  PERFORM public.send_push_notification(
    v_brand_id,
    '📩 Nouvelle candidature',
    COALESCE(v_creator_name, 'Un créateur') || ' a postulé à votre offre "' || COALESCE(v_offer_title, 'Offre') || '"',
    jsonb_build_object('route', '/brand/collabs', 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for application status changes
CREATE OR REPLACE FUNCTION public.trigger_push_on_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_notification_title text;
  v_notification_body text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'accepted' THEN
      v_notification_title := '🎉 Candidature acceptée !';
      v_notification_body := 'Votre candidature pour "' || COALESCE(v_offer_title, 'Offre') || '" a été acceptée par ' || COALESCE(v_brand_name, 'la marque');
    WHEN 'rejected' THEN
      v_notification_title := '❌ Candidature refusée';
      v_notification_body := 'Votre candidature pour "' || COALESCE(v_offer_title, 'Offre') || '" n''a pas été retenue';
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Send push to creator
  PERFORM public.send_push_notification(
    NEW.creator_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', '/collabs', 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for new collaborations
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_collaboration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
BEGIN
  -- Get offer and brand info
  SELECT o.title, p.company_name INTO v_offer_title, v_brand_name
  FROM offers o
  JOIN profiles p ON p.user_id = o.brand_id
  WHERE o.id = NEW.offer_id;
  
  -- Send push to creator
  PERFORM public.send_push_notification(
    NEW.creator_id,
    '🤝 Nouvelle collaboration !',
    COALESCE(v_brand_name, 'Une marque') || ' vous propose une collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"',
    jsonb_build_object('route', '/collabs', 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for collaboration status changes
CREATE OR REPLACE FUNCTION public.trigger_push_on_collaboration_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_creator_name text;
  v_target_user_id uuid;
  v_notification_title text;
  v_notification_body text;
  v_route text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get offer, brand and creator info
  SELECT o.title, pb.company_name, pc.full_name 
  INTO v_offer_title, v_brand_name, v_creator_name
  FROM offers o
  JOIN profiles pb ON pb.user_id = o.brand_id
  JOIN profiles pc ON pc.user_id = NEW.creator_id
  WHERE o.id = NEW.offer_id;
  
  -- Determine notification based on new status
  CASE NEW.status
    WHEN 'accepted' THEN
      -- Notify brand that creator accepted
      v_target_user_id := NEW.brand_id;
      v_notification_title := '✅ Collaboration acceptée !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a accepté la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'rejected' THEN
      -- Notify brand that creator rejected
      v_target_user_id := NEW.brand_id;
      v_notification_title := '❌ Collaboration refusée';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a refusé la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'content_submitted' THEN
      -- Notify brand that content was submitted
      v_target_user_id := NEW.brand_id;
      v_notification_title := '📤 Contenu soumis !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a soumis le contenu pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'revision_requested' THEN
      -- Notify creator that revision is requested
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🔄 Révision demandée';
      v_notification_body := COALESCE(v_brand_name, 'La marque') || ' demande des modifications pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/collabs';
      
    WHEN 'approved' THEN
      -- Notify creator that content was approved
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🎉 Contenu approuvé !';
      v_notification_body := 'Votre contenu pour "' || COALESCE(v_offer_title, 'Offre') || '" a été approuvé ! Le paiement est en cours.';
      v_route := '/collabs';
      
    WHEN 'completed' THEN
      -- Notify creator that collaboration is complete
      v_target_user_id := NEW.creator_id;
      v_notification_title := '💰 Paiement reçu !';
      v_notification_body := 'Votre paiement pour "' || COALESCE(v_offer_title, 'Offre') || '" a été crédité sur votre portefeuille.';
      v_route := '/creator/wallet';
      
    ELSE
      RETURN NEW;
  END CASE;
  
  -- Send push notification
  PERFORM public.send_push_notification(
    v_target_user_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', v_route, 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Trigger function for new offers (notify matching creators)
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_offer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_creator record;
  v_brand_name text;
BEGIN
  -- Only trigger for published offers
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Get brand name
  SELECT company_name INTO v_brand_name
  FROM profiles
  WHERE user_id = NEW.brand_id;
  
  -- Notify creators in the same category
  FOR v_creator IN
    SELECT p.user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'creator'
      AND p.category = NEW.category
      AND p.user_id != NEW.brand_id
    LIMIT 50 -- Limit to avoid too many notifications
  LOOP
    PERFORM public.send_push_notification(
      v_creator.user_id,
      '🆕 Nouvelle offre !',
      COALESCE(v_brand_name, 'Une marque') || ' recherche des créateurs ' || NEW.category || ' : "' || NEW.title || '"',
      jsonb_build_object('route', '/creator/offers', 'offer_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger function for withdrawal request status changes
CREATE OR REPLACE FUNCTION public.trigger_push_on_withdrawal_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_title text;
  v_notification_body text;
BEGIN
  -- Only trigger on status change
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  CASE NEW.status
    WHEN 'approved' THEN
      v_notification_title := '💸 Retrait approuvé !';
      v_notification_body := 'Votre demande de retrait de ' || NEW.amount || ' FCFA a été approuvée.';
    WHEN 'completed' THEN
      v_notification_title := '✅ Retrait effectué !';
      v_notification_body := 'Votre retrait de ' || NEW.amount || ' FCFA a été envoyé.';
    WHEN 'rejected' THEN
      v_notification_title := '❌ Retrait refusé';
      v_notification_body := 'Votre demande de retrait a été refusée. ' || COALESCE(NEW.rejection_reason, '');
    ELSE
      RETURN NEW;
  END CASE;
  
  PERFORM public.send_push_notification(
    NEW.user_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', '/creator/wallet')
  );
  
  RETURN NEW;
END;
$$;

-- Create the triggers

-- Trigger for new messages
DROP TRIGGER IF EXISTS trigger_push_new_message ON messages;
CREATE TRIGGER trigger_push_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_new_message();

-- Trigger for new applications
DROP TRIGGER IF EXISTS trigger_push_new_application ON applications;
CREATE TRIGGER trigger_push_new_application
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_new_application();

-- Trigger for application status changes
DROP TRIGGER IF EXISTS trigger_push_application_status ON applications;
CREATE TRIGGER trigger_push_application_status
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_application_status_change();

-- Trigger for new collaborations
DROP TRIGGER IF EXISTS trigger_push_new_collaboration ON collaborations;
CREATE TRIGGER trigger_push_new_collaboration
  AFTER INSERT ON collaborations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_new_collaboration();

-- Trigger for collaboration status changes
DROP TRIGGER IF EXISTS trigger_push_collaboration_status ON collaborations;
CREATE TRIGGER trigger_push_collaboration_status
  AFTER UPDATE ON collaborations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_collaboration_status_change();

-- Trigger for new offers
DROP TRIGGER IF EXISTS trigger_push_new_offer ON offers;
CREATE TRIGGER trigger_push_new_offer
  AFTER INSERT ON offers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_new_offer();

-- Trigger for withdrawal status changes
DROP TRIGGER IF EXISTS trigger_push_withdrawal_status ON withdrawal_requests;
CREATE TRIGGER trigger_push_withdrawal_status
  AFTER UPDATE ON withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_push_on_withdrawal_status_change();