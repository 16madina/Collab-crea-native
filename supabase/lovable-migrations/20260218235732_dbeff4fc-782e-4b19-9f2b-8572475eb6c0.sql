
-- Function to auto-expire offers and notify brands
CREATE OR REPLACE FUNCTION public.expire_overdue_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_offer record;
  v_brand_name text;
BEGIN
  -- Find active offers whose deadline has passed
  FOR v_offer IN
    SELECT o.id, o.title, o.brand_id
    FROM offers o
    WHERE o.status = 'active'
      AND o.deadline IS NOT NULL
      AND o.deadline < CURRENT_DATE
  LOOP
    -- Update status to expired
    UPDATE offers SET status = 'expired', updated_at = now()
    WHERE id = v_offer.id;

    -- Create in-app notification for the brand
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_offer.brand_id,
      '⏰ Offre expirée',
      'Votre offre "' || v_offer.title || '" a expiré. Renouvelez-la ou supprimez-la depuis votre espace offres.',
      'info'
    );

    -- Send push notification
    PERFORM public.send_push_notification(
      v_offer.brand_id,
      '⏰ Offre expirée',
      'Votre offre "' || v_offer.title || '" a expiré. Renouvelez-la pour continuer à recevoir des candidatures.',
      jsonb_build_object('route', '/brand/offers', 'offer_id', v_offer.id)
    );
  END LOOP;
END;
$function$;
