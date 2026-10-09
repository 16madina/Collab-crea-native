
-- Helper RPC: upsert service role key into vault (callable only by service role via edge function)
CREATE OR REPLACE FUNCTION public.vault_upsert_service_role_key(p_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM vault.secrets WHERE name = 'service_role_key';
  IF v_id IS NULL THEN
    PERFORM vault.create_secret(p_value, 'service_role_key');
  ELSE
    PERFORM vault.update_secret(v_id, p_value);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.vault_upsert_service_role_key(text) FROM PUBLIC, anon, authenticated;

-- Update push notification function to read key from vault
CREATE OR REPLACE FUNCTION public.send_push_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  v_supabase_url text := 'https://qsbkwdtchhzclpxjrhnt.supabase.co';
  v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'send_push_notification: vault secret service_role_key not set';
    RETURN;
  END IF;

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
      'Authorization', 'Bearer ' || v_service_key
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to send push notification: %', SQLERRM;
END;
$$;
