
CREATE OR REPLACE FUNCTION public.trigger_push_on_collaboration_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_offer_title text;
  v_brand_name text;
  v_creator_name text;
  v_target_user_id uuid;
  v_notification_title text;
  v_notification_body text;
  v_route text;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  SELECT o.title, pb.company_name, pc.full_name 
  INTO v_offer_title, v_brand_name, v_creator_name
  FROM offers o
  JOIN profiles pb ON pb.user_id = o.brand_id
  JOIN profiles pc ON pc.user_id = NEW.creator_id
  WHERE o.id = NEW.offer_id;
  
  CASE NEW.status
    WHEN 'accepted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '✅ Collaboration acceptée !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a accepté la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'rejected' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '❌ Collaboration refusée';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a refusé la collaboration pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'content_submitted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '📤 Contenu soumis !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a soumis le contenu pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/brand/collabs';
      
    WHEN 'revision_requested' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🔄 Révision demandée';
      v_notification_body := COALESCE(v_brand_name, 'La marque') || ' demande des modifications pour "' || COALESCE(v_offer_title, 'Offre') || '"';
      v_route := '/collabs';
      
    WHEN 'approved' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '🎉 Contenu approuvé !';
      v_notification_body := 'Votre contenu pour "' || COALESCE(v_offer_title, 'Offre') || '" a été approuvé ! Le paiement est en cours.';
      v_route := '/collabs';

    WHEN 'pending_publication' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '📢 Publiez votre contenu !';
      v_notification_body := 'Votre aperçu pour "' || COALESCE(v_offer_title, 'Offre') || '" a été validé. Publiez-le sur vos réseaux et soumettez le lien.';
      v_route := '/collabs';

    WHEN 'publication_submitted' THEN
      v_target_user_id := NEW.brand_id;
      v_notification_title := '🔗 Lien de publication soumis !';
      v_notification_body := COALESCE(v_creator_name, 'Le créateur') || ' a soumis le lien de publication pour "' || COALESCE(v_offer_title, 'Offre') || '". Vérifiez et confirmez.';
      v_route := '/brand/collabs';
      
    WHEN 'completed' THEN
      v_target_user_id := NEW.creator_id;
      v_notification_title := '💰 Paiement reçu !';
      v_notification_body := 'Votre paiement pour "' || COALESCE(v_offer_title, 'Offre') || '" a été crédité sur votre portefeuille.';
      v_route := '/creator/wallet';
      
    ELSE
      RETURN NEW;
  END CASE;
  
  -- In-app notification
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (v_target_user_id, v_notification_title, v_notification_body, 'info');

  -- Push notification
  PERFORM public.send_push_notification(
    v_target_user_id,
    v_notification_title,
    v_notification_body,
    jsonb_build_object('route', v_route, 'collaboration_id', NEW.id)
  );
  
  RETURN NEW;
END;
$function$;
