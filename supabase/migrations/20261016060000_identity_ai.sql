-- Rapport de la vérification automatique (Amazon Rekognition + Textract, fonction verify-identity) :
-- % de ressemblance du visage, nom, bande MRZ, expiration, décision. Écrit uniquement par le serveur.
alter table public.profiles add column if not exists identity_ai jsonb;

-- Le garde-fou des profils interdit aussi à un utilisateur de modifier ce rapport lui-même.
create or replace function public.guard_profile() returns trigger
language plpgsql set search_path = public as $$
begin
  if coalesce(current_setting('app.trusted', true), '') = 'on' or auth.uid() is null or public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.email_verified := false; new.identity_verified := false; new.is_banned := false; new.ban_reason := null; new.banned_at := null; new.rating := null;
    new.identity_ai := null;
    return new;
  end if;
  if new.email_verified is distinct from old.email_verified or new.identity_verified is distinct from old.identity_verified
     or new.is_banned is distinct from old.is_banned or new.ban_reason is distinct from old.ban_reason or new.banned_at is distinct from old.banned_at
     or new.rating is distinct from old.rating or new.user_id is distinct from old.user_id
     or new.identity_ai is distinct from old.identity_ai then
    raise exception 'Modification non autorisée';
  end if;
  return new;
end $$;
