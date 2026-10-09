
CREATE OR REPLACE FUNCTION public.trigger_push_on_new_withdrawal_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin record;
  v_creator_name text;
  v_method_label text;
BEGIN
  -- Get creator name
  SELECT full_name INTO v_creator_name
  FROM profiles
  WHERE user_id = NEW.user_id;

  -- Determine method label
  IF NEW.method = 'mobile_money' THEN
    v_method_label := COALESCE(NEW.mobile_provider, 'Mobile Money');
  ELSE
    v_method_label := 'Virement bancaire';
  END IF;

  -- Notify ALL admins
  FOR v_admin IN
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = 'admin'
  LOOP
    -- In-app notification
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '💸 Nouvelle demande de retrait',
      COALESCE(v_creator_name, 'Un créateur') || ' demande un retrait de ' || NEW.amount || ' FCFA via ' || v_method_label,
      'info'
    );

    -- Push notification
    PERFORM public.send_push_notification(
      v_admin.user_id,
      '💸 Nouvelle demande de retrait',
      COALESCE(v_creator_name, 'Un créateur') || ' demande un retrait de ' || NEW.amount || ' FCFA via ' || v_method_label,
      jsonb_build_object('route', '/admin', 'tab', 'withdrawals')
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger on withdrawal_requests table
CREATE TRIGGER on_new_withdrawal_request
  AFTER INSERT ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_push_on_new_withdrawal_request();
