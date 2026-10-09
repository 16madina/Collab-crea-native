
CREATE OR REPLACE FUNCTION public.send_push_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'net'
AS $function$
DECLARE
  v_supabase_url text := 'https://qsbkwdtchhzclpxjrhnt.supabase.co';
  v_service_key text;
BEGIN
  v_service_key := current_setting('app.settings.service_role_key', true);

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title', p_title,
      'body', p_body,
      'data', p_data
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, ''),
      'X-Skip-Auth', 'true'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$function$;
