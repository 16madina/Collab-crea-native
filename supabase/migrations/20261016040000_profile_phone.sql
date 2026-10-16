-- Numéro de téléphone des utilisateurs, au format international (+2250701234567).
-- Les profils sont lisibles par tous : le numéro est donc dans une table privée, lisible seulement
-- par la personne elle-même et par les admins (retraits Mobile Money). Rempli à l'inscription par
-- handle_new_user à partir des métadonnées du compte (phone).

create table if not exists public.profile_private (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{6,14}$'),
  updated_at timestamptz not null default now()
);
alter table public.profile_private enable row level security;

drop policy if exists "Lecture de son propre numéro" on public.profile_private;
drop policy if exists "Les admins lisent les numéros" on public.profile_private;
drop policy if exists "Ajout de son propre numéro" on public.profile_private;
drop policy if exists "Modification de son propre numéro" on public.profile_private;
create policy "Lecture de son propre numéro" on public.profile_private for select using (auth.uid() = user_id);
create policy "Les admins lisent les numéros" on public.profile_private for select using (public.has_role(auth.uid(), 'admin'));
create policy "Ajout de son propre numéro" on public.profile_private for insert with check (auth.uid() = user_id);
create policy "Modification de son propre numéro" on public.profile_private for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Numéro de téléphone (format international) : table privée, jamais dans le profil public.
  if coalesce(m->>'phone', '') ~ '^\+[1-9][0-9]{6,14}$' then
    insert into public.profile_private (user_id, phone) values (new.id, m->>'phone')
      on conflict (user_id) do update set phone = excluded.phone, updated_at = now();
  end if;
  return new;
end $function$;
