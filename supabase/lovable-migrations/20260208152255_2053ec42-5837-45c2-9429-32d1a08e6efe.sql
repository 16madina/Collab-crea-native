-- Update trigger function for new offers to notify ALL creators
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
  
  -- Notify ALL creators
  FOR v_creator IN
    SELECT p.user_id
    FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE ur.role = 'creator'
      AND p.user_id != NEW.brand_id
  LOOP
    PERFORM public.send_push_notification(
      v_creator.user_id,
      '🆕 Nouvelle offre !',
      COALESCE(v_brand_name, 'Une marque') || ' recherche des créateurs : "' || NEW.title || '"',
      jsonb_build_object('route', '/creator/offers', 'offer_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;