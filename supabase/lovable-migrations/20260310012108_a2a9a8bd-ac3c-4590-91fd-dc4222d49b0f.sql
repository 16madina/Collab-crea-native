
CREATE OR REPLACE FUNCTION public.trigger_notify_admins_on_block()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_admin record;
  v_blocker_name text;
  v_blocked_name text;
BEGIN
  -- Get blocker and blocked names
  SELECT full_name INTO v_blocker_name FROM profiles WHERE user_id = NEW.blocker_id;
  SELECT full_name INTO v_blocked_name FROM profiles WHERE user_id = NEW.blocked_id;

  -- Notify ALL admins
  FOR v_admin IN
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      v_admin.user_id,
      '🚫 Utilisateur bloqué',
      COALESCE(v_blocker_name, 'Un utilisateur') || ' a bloqué ' || COALESCE(v_blocked_name, 'un utilisateur'),
      'warning'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_user_blocked
  AFTER INSERT ON public.blocked_users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_notify_admins_on_block();
