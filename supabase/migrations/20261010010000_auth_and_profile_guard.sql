-- Inscription : profil, rôle et portefeuille créés côté serveur depuis les métadonnées Supabase Auth.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role text := case when m->>'role' = 'brand' then 'brand' else 'creator' end;
  v_required boolean := coalesce((select (value)::text = 'true' from public.app_settings where key = 'invite_codes_required'), false);
  v_code text := upper(trim(coalesce(m->>'invite_code', '')));
begin
  if v_code <> '' then
    update public.invite_codes ic set used_by = new.id, used_at = now(), is_active = false
     where ic.code = v_code and ic.used_by is null and ic.is_active;
    if not found and v_required then raise exception 'Code d''invitation invalide ou déjà utilisé'; end if;
  elsif v_required then
    raise exception 'Code d''invitation requis';
  end if;

  perform set_config('app.trusted', 'on', true);
  insert into public.profiles (user_id, full_name, avatar_url, country, residence_country, company_name, sector, website, company_description, logo_url, brand_prefs, category, bio,
                               email_verified, instagram_followers, tiktok_followers, youtube_followers, snapchat_followers, facebook_followers)
  values (new.id, coalesce(nullif(m->>'full_name', ''), split_part(new.email, '@', 1)), m->>'avatar_url', m->>'country', m->>'residence_country',
          m->>'company_name', m->>'sector', m->>'website', m->>'company_description', m->>'logo_url', m->'brand_prefs', m->>'category', m->>'bio',
          new.email_confirmed_at is not null, m->>'instagram_followers', m->>'tiktok_followers', m->>'youtube_followers', m->>'snapchat_followers', m->>'facebook_followers')
  on conflict (user_id) do nothing;
  insert into public.user_roles (user_id, role) values (new.id, v_role::app_role);
  insert into public.wallets (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Email vérifié = email confirmé dans Supabase Auth.
create or replace function public.sync_email_verified() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    perform set_config('app.trusted', 'on', true);
    update public.profiles set email_verified = true where user_id = new.id;
  end if;
  return new;
end $$;
create trigger on_auth_user_email_confirmed after update of email_confirmed_at on auth.users for each row execute function public.sync_email_verified();

-- Champs sensibles du profil (vérifications, bannissement, note) : admins / fonctions serveur uniquement.
-- (Faille de la version web : un utilisateur pouvait se déclarer « identité vérifiée » ou se débannir.)
create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.trusted', true), '') = 'on' or auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.email_verified := false; new.identity_verified := false; new.is_banned := false; new.ban_reason := null; new.banned_at := null; new.rating := null;
    return new;
  end if;
  if new.email_verified is distinct from old.email_verified or new.identity_verified is distinct from old.identity_verified
     or new.is_banned is distinct from old.is_banned or new.ban_reason is distinct from old.ban_reason or new.banned_at is distinct from old.banned_at
     or new.rating is distinct from old.rating or new.user_id is distinct from old.user_id then
    raise exception 'Modification non autorisée';
  end if;
  return new;
end $$;
create trigger trg_guard_profile before insert or update on public.profiles for each row execute function public.guard_profile();

-- Un compte banni ne peut plus écrire de messages, d'offres ni de candidatures.
create or replace function public.is_banned(_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_banned from public.profiles where user_id = _user_id), false)
$$;
create policy "Banned users cannot send messages" on public.messages as restrictive for insert with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot post offers" on public.offers as restrictive for insert with check (not public.is_banned(auth.uid()));
create policy "Banned users cannot apply" on public.applications as restrictive for insert with check (not public.is_banned(auth.uid()));
