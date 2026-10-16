-- Notifications push : les déclencheurs SQL appellent la fonction send-push-notification avec un secret partagé
-- généré ici, dans le coffre (vault) de la base. Plus besoin de copier la clé service à la main : la fonction
-- vérifie ce secret via check_push_secret (réservée au serveur).

do $$
begin
  if not exists (select 1 from vault.secrets where name = 'push_trigger_secret') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_trigger_secret',
      'Secret partagé : déclencheurs SQL -> fonction send-push-notification');
  end if;
end $$;

create or replace function public.check_push_secret(p_secret text) returns boolean
language sql security definer set search_path = public, vault as $$
  select coalesce(p_secret, '') <> '' and exists (
    select 1 from vault.decrypted_secrets where name = 'push_trigger_secret' and decrypted_secret = p_secret
  );
$$;
revoke execute on function public.check_push_secret(text) from public, anon, authenticated;
grant execute on function public.check_push_secret(text) to service_role;

create or replace function public.send_push_notification(p_user_id uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path to 'public', 'extensions', 'net', 'vault' as $$
declare
  v_supabase_url text := 'https://qsbkwdtchhzclpxjrhnt.supabase.co';
  v_secret text;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_trigger_secret' limit 1;
  if v_secret is null or v_secret = '' then
    raise warning 'send_push_notification: secret push_trigger_secret absent du vault';
    return;
  end if;
  perform net.http_post(
    url := v_supabase_url || '/functions/v1/send-push-notification',
    body := jsonb_build_object('user_id', p_user_id, 'title', p_title, 'body', p_body, 'data', p_data),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret)
  );
exception
  when others then
    raise warning 'Failed to send push notification: %', sqlerrm;
end;
$$;
