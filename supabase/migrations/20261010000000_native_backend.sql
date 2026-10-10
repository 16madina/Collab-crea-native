-- Collab Créa native : compléments au schéma web + règles métier côté serveur.
-- Migration purement additive (aucun DROP de données).

-- ─────────────────────────── Colonnes manquantes ───────────────────────────
alter table public.offers
  add column if not exists content_types text[] not null default '{}',
  add column if not exists expectations text,
  add column if not exists restrictions text,
  add column if not exists deliverables text[] not null default '{}',
  add column if not exists criteria text[] not null default '{}';
alter table public.offers alter column content_type set default '';

alter table public.applications add column if not exists notes text;

alter table public.profiles
  add column if not exists tags text[] not null default '{}',
  add column if not exists brand_prefs jsonb,
  add column if not exists rating numeric;

alter table public.collaborations
  add column if not exists content_urls text[] not null default '{}',
  add column if not exists paid boolean not null default false,
  add column if not exists payout_status text,
  add column if not exists refund_reason text;

-- ─────────────────────────── Nouvelles tables ───────────────────────────
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (brand_id, creator_id)
);
alter table public.favorites enable row level security;
create policy "Own favorites - read" on public.favorites for select using (auth.uid() = brand_id);
create policy "Own favorites - add" on public.favorites for insert with check (auth.uid() = brand_id);
create policy "Own favorites - remove" on public.favorites for delete using (auth.uid() = brand_id);

create table if not exists public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users(id) on delete cascade,
  followed_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followed_id)
);
alter table public.follows enable row level security;
create policy "Follows are public" on public.follows for select using (true);
create policy "Follow - add" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Follow - remove" on public.follows for delete using (auth.uid() = follower_id);

create table if not exists public.offer_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_id uuid not null references public.offers(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, offer_id)
);
alter table public.offer_favorites enable row level security;
create policy "Own offer favorites - read" on public.offer_favorites for select using (auth.uid() = user_id);
create policy "Own offer favorites - add" on public.offer_favorites for insert with check (auth.uid() = user_id);
create policy "Own offer favorites - remove" on public.offer_favorites for delete using (auth.uid() = user_id);

create table if not exists public.conversation_archives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, conversation_id)
);
alter table public.conversation_archives enable row level security;
create policy "Own archives - read" on public.conversation_archives for select using (auth.uid() = user_id);
create policy "Own archives - add" on public.conversation_archives for insert with check (auth.uid() = user_id);
create policy "Own archives - remove" on public.conversation_archives for delete using (auth.uid() = user_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  collaboration_id uuid not null unique references public.collaborations(id) on delete cascade,
  brand_id uuid not null references auth.users(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
alter table public.reviews enable row level security;
create policy "Reviews are public" on public.reviews for select using (true);
-- Une marque ne peut noter que ses propres collaborations terminées.
create policy "Brand reviews own completed collab" on public.reviews for insert with check (
  auth.uid() = brand_id and exists (
    select 1 from public.collaborations c
    where c.id = collaboration_id and c.brand_id = auth.uid() and c.creator_id = reviews.creator_id and c.status = 'completed'
  )
);

-- Note moyenne recalculée côté serveur.
create or replace function public.refresh_creator_rating() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set rating = (select round(avg(rating)::numeric, 2) from public.reviews where creator_id = new.creator_id)
  where user_id = new.creator_id;
  return new;
end $$;
create trigger trg_refresh_creator_rating after insert on public.reviews for each row execute function public.refresh_creator_rating();

-- Les marques doivent pouvoir voir le rôle « brand » (le web n'exposait que les créateurs).
create policy "Anyone can view brand roles" on public.user_roles for select using (role = 'brand'::app_role);

-- ─────────────── Garde-fou sur les collaborations (anti-triche) ───────────────
-- Les montants et les statuts « argent » ne se modifient que via les fonctions serveur ci-dessous.
create or replace function public.guard_collaboration() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if coalesce(current_setting('app.trusted', true), '') = 'on' or uid is null then
    return new; -- fonctions serveur / service role
  end if;

  if tg_op = 'INSERT' then
    -- Montants calculés côté serveur : marque +10 %, créateur −5 %, minimum 200 FCFA.
    if new.agreed_amount < 200 then raise exception 'Montant minimum : 200 FCFA'; end if;
    new.status := 'pending_payment';
    new.paid := false;
    new.platform_fee := round(new.agreed_amount * 0.10) + round(new.agreed_amount * 0.05);
    new.creator_amount := new.agreed_amount - round(new.agreed_amount * 0.05);
    return new;
  end if;

  if new.agreed_amount is distinct from old.agreed_amount or new.platform_fee is distinct from old.platform_fee
     or new.creator_amount is distinct from old.creator_amount or new.paid is distinct from old.paid
     or new.brand_id is distinct from old.brand_id or new.creator_id is distinct from old.creator_id
     or new.offer_id is distinct from old.offer_id or new.payout_status is distinct from old.payout_status then
    raise exception 'Modification non autorisée';
  end if;

  if new.status is distinct from old.status then
    if uid = old.creator_id and (
         (old.status in ('in_progress', 'revision_requested') and new.status = 'content_submitted')
      or (old.status = 'pending_publication' and new.status = 'publication_submitted')
      or (old.status = 'pending_payment' and new.status = 'refused')
    ) then
      null;
    elsif uid = old.brand_id and (
         (old.status in ('content_submitted', 'in_review', 'publication_submitted') and new.status = 'revision_requested')
      or (old.status = 'pending_payment' and new.status = 'cancelled')
      or (old.status = 'in_progress' and new.status = 'content_submitted') -- la marque filme elle-même
    ) then
      null;
    else
      raise exception 'Transition de statut non autorisée (% → %)', old.status, new.status;
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_collaboration before insert or update on public.collaborations
  for each row execute function public.guard_collaboration();

-- ─────────────────────────── Fonctions serveur ───────────────────────────
create or replace function public._trusted() returns void language sql as $$ select set_config('app.trusted', 'on', true) $$;

create or replace function public._wallet_of(p_user uuid) returns public.wallets
language plpgsql security definer set search_path = public as $$
declare w public.wallets;
begin
  select * into w from public.wallets where user_id = p_user;
  if not found then insert into public.wallets (user_id) values (p_user) returning * into w; end if;
  return w;
end $$;

-- Verse la part du créateur sur son portefeuille (une seule fois).
create or replace function public._release_payment(c public.collaborations) returns void
language plpgsql security definer set search_path = public as $$
declare w public.wallets;
begin
  if exists (select 1 from public.transactions where collaboration_id = c.id and type = 'release') then return; end if;
  w := public._wallet_of(c.creator_id);
  update public.transactions set status = 'completed', updated_at = now() where collaboration_id = c.id and type = 'escrow' and status = 'pending';
  insert into public.transactions (collaboration_id, wallet_id, user_id, type, status, amount, fee, net_amount, description)
    values (c.id, w.id, c.creator_id, 'release', 'completed', c.creator_amount, 0, c.creator_amount, 'Paiement pour collaboration');
  update public.wallets set balance = balance + c.creator_amount, updated_at = now() where id = w.id;
  insert into public.notifications (user_id, title, message, type)
    values (c.creator_id, '💰 Paiement reçu !', c.creator_amount || ' FCFA ont été crédités sur votre portefeuille.', 'payment');
end $$;

-- ⚠️ PROVISOIRE : paiement simulé tant que FedaPay/Stripe ne sont pas branchés.
-- À remplacer par les webhooks des prestataires de paiement.
create or replace function public.pay_collaboration(p_collab uuid, p_method text) returns text
language plpgsql security definer set search_path = public as $$
declare c public.collaborations; total int;
begin
  select * into c from public.collaborations where id = p_collab for update;
  if not found or c.brand_id <> auth.uid() then raise exception 'Collaboration introuvable'; end if;
  if c.paid then raise exception 'Déjà payée'; end if;
  if c.status not in ('pending_payment', 'content_submitted') then raise exception 'Paiement impossible à ce stade'; end if;
  total := c.agreed_amount + round(c.agreed_amount * 0.10);
  if p_method = 'card' then total := total + round(total * 0.05); end if;
  perform public._trusted();
  update public.collaborations
     set paid = true, status = case when c.status = 'pending_payment' then 'in_progress' else 'in_review' end, updated_at = now()
   where id = c.id;
  insert into public.transactions (collaboration_id, user_id, type, status, amount, fee, net_amount, gateway_amount, withdrawal_method, description)
    values (c.id, c.brand_id, 'escrow', 'pending', c.agreed_amount, total - c.agreed_amount, c.agreed_amount, total, p_method, 'Paiement en séquestre');
  insert into public.notifications (user_id, title, message, type)
    values (c.creator_id, '✅ Paiement sécurisé', 'La marque a versé le budget en séquestre. Vous pouvez commencer !', 'payment');
  return 'ok';
end $$;

-- Validation du contenu (port de la fonction web approve-content).
-- p_mode : 'approve_preview' (réseau) | 'final' | 'creator_approve' (la marque a filmé)
create or replace function public.approve_content(p_collab uuid, p_mode text default 'final', p_feedback text default null) returns text
language plpgsql security definer set search_path = public as $$
declare c public.collaborations; o public.offers;
begin
  select * into c from public.collaborations where id = p_collab for update;
  if not found then raise exception 'Collaboration introuvable'; end if;
  select * into o from public.offers where id = c.offer_id;
  perform public._trusted();

  if p_mode = 'creator_approve' then
    if c.creator_id <> auth.uid() then raise exception 'Seul le créateur peut valider'; end if;
    if c.status not in ('content_submitted', 'in_review') then raise exception 'Rien à valider'; end if;
  else
    if c.brand_id <> auth.uid() then raise exception 'Seule la marque peut valider'; end if;
    if not c.paid then raise exception 'Le paiement en séquestre est requis avant validation'; end if;
    if o.delivery_mode = 'network' and c.status in ('content_submitted', 'in_review') then
      update public.collaborations set status = 'pending_publication', brand_feedback = p_feedback, updated_at = now() where id = c.id;
      insert into public.notifications (user_id, title, message, type)
        values (c.creator_id, '📱 Aperçu validé', 'Publiez maintenant le contenu sur vos réseaux puis soumettez le lien.', 'success');
      return 'pending_publication';
    end if;
    if c.status not in ('content_submitted', 'in_review', 'publication_submitted') then raise exception 'Rien à valider'; end if;
  end if;

  update public.collaborations set status = 'completed', approved_at = now(), brand_feedback = p_feedback, payout_status = 'completed', updated_at = now() where id = c.id;
  perform public._release_payment(c);
  return 'completed';
end $$;

-- Validation automatique (7 jours, 48 h si la marque filme) : exécutée par pg_cron.
create or replace function public.auto_approve_due() returns int
language plpgsql security definer set search_path = public as $$
declare c public.collaborations; o public.offers; n int := 0;
begin
  perform public._trusted();
  for c in select * from public.collaborations where status in ('content_submitted', 'in_review') and paid and auto_approve_at is not null and auto_approve_at <= now() for update skip locked loop
    select * into o from public.offers where id = c.offer_id;
    if o.delivery_mode = 'network' then
      update public.collaborations set status = 'pending_publication', updated_at = now() where id = c.id;
    else
      update public.collaborations set status = 'completed', approved_at = now(), payout_status = 'completed', updated_at = now() where id = c.id;
      perform public._release_payment(c);
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function public.auto_approve_due() from public, anon, authenticated;

-- Remboursement (admin) : rend le séquestre à la marque.
create or replace function public.refund_collaboration(p_collab uuid, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare c public.collaborations;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Réservé aux administrateurs'; end if;
  select * into c from public.collaborations where id = p_collab for update;
  if not found then raise exception 'Collaboration introuvable'; end if;
  if c.status in ('completed', 'refunded') then raise exception 'Collaboration déjà clôturée'; end if;
  perform public._trusted();
  update public.collaborations set status = 'refunded', refund_reason = p_reason, updated_at = now() where id = c.id;
  if c.paid then
    update public.transactions set status = 'cancelled', updated_at = now() where collaboration_id = c.id and type = 'escrow' and status = 'pending';
    insert into public.transactions (collaboration_id, user_id, type, status, amount, fee, net_amount, description)
      values (c.id, c.brand_id, 'refund', 'completed', c.agreed_amount, 0, c.agreed_amount, 'Remboursement : ' || coalesce(p_reason, ''));
  end if;
  insert into public.notifications (user_id, title, message, type) values
    (c.brand_id, 'Collaboration remboursée', coalesce(p_reason, ''), 'info'),
    (c.creator_id, 'Collaboration annulée', coalesce(p_reason, ''), 'warning');
  return 'refunded';
end $$;

-- Demande de retrait (port de request-withdrawal, avec correction du pending_balance cumulé).
create or replace function public.request_withdrawal(p_amount int, p_method text, p_details jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare w public.wallets; p public.profiles; rid uuid;
begin
  select * into p from public.profiles where user_id = auth.uid();
  if not found then raise exception 'Profil introuvable'; end if;
  if not coalesce(p.identity_verified, false) then raise exception 'Vérifiez votre identité avant de retirer'; end if;
  if p_method = 'paypal' and p_amount < 3000 then raise exception 'Le montant minimum pour PayPal est de 3 000 FCFA'; end if;
  if p_method <> 'paypal' and p_amount < 1000 then raise exception 'Le montant minimum est de 1 000 FCFA'; end if;
  select * into w from public.wallets where user_id = auth.uid() for update;
  if not found or w.balance < p_amount then raise exception 'Solde insuffisant'; end if;
  insert into public.withdrawal_requests (user_id, wallet_id, amount, method, mobile_provider, mobile_number, paypal_email, payout_currency, bank_name, account_number, account_holder)
    values (auth.uid(), w.id, p_amount, p_method, p_details->>'mobile_provider', p_details->>'mobile_number', p_details->>'paypal_email',
            coalesce(p_details->>'payout_currency', 'XOF'), p_details->>'bank_name', p_details->>'account_number', p_details->>'account_holder')
    returning id into rid;
  update public.wallets set balance = balance - p_amount, pending_balance = pending_balance + p_amount, updated_at = now() where id = w.id;
  insert into public.transactions (wallet_id, user_id, type, status, amount, fee, net_amount, withdrawal_method, withdrawal_details, reference, description)
    values (w.id, auth.uid(), 'withdrawal', 'pending', p_amount, 0, p_amount, p_method, p_details, rid::text, 'Demande de retrait');
  return rid;
end $$;

create or replace function public.admin_finalize_withdrawal(p_id uuid, p_transaction_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
declare r public.withdrawal_requests;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Réservé aux administrateurs'; end if;
  select * into r from public.withdrawal_requests where id = p_id for update;
  if not found or r.status in ('completed', 'rejected') then raise exception 'Demande déjà traitée'; end if;
  update public.withdrawal_requests set status = 'completed', reviewed_by = auth.uid(), reviewed_at = now(), transaction_id = p_transaction_ref, updated_at = now() where id = p_id;
  update public.wallets set pending_balance = greatest(0, pending_balance - r.amount), updated_at = now() where id = r.wallet_id;
  update public.transactions set status = 'completed', updated_at = now() where reference = p_id::text and type = 'withdrawal';
  insert into public.notifications (user_id, title, message, type) values (r.user_id, '💸 Retrait effectué', r.amount || ' FCFA ont été envoyés.', 'payment');
  insert into public.admin_logs (admin_id, action_type, target_user_id, details) values (auth.uid(), 'withdrawal_finalized', r.user_id, jsonb_build_object('id', p_id, 'amount', r.amount));
end $$;

create or replace function public.admin_reject_withdrawal(p_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare r public.withdrawal_requests;
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'Réservé aux administrateurs'; end if;
  select * into r from public.withdrawal_requests where id = p_id for update;
  if not found or r.status in ('completed', 'rejected') then raise exception 'Demande déjà traitée'; end if;
  update public.withdrawal_requests set status = 'rejected', rejection_reason = p_reason, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now() where id = p_id;
  update public.wallets set balance = balance + r.amount, pending_balance = greatest(0, pending_balance - r.amount), updated_at = now() where id = r.wallet_id;
  update public.transactions set status = 'cancelled', updated_at = now() where reference = p_id::text and type = 'withdrawal';
  insert into public.notifications (user_id, title, message, type) values (r.user_id, 'Retrait refusé', coalesce(p_reason, ''), 'warning');
  insert into public.admin_logs (admin_id, action_type, target_user_id, details) values (auth.uid(), 'withdrawal_rejected', r.user_id, jsonb_build_object('id', p_id, 'reason', p_reason));
end $$;

-- Notification envoyée à un autre utilisateur (la RLS n'autorise pas l'insertion directe).
create or replace function public.notify_user(p_user uuid, p_title text, p_message text, p_type text default 'info') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non authentifié'; end if;
  insert into public.notifications (user_id, title, message, type, created_by) values (p_user, left(p_title, 200), left(p_message, 1000), p_type, auth.uid());
end $$;

grant execute on function public.pay_collaboration(uuid, text), public.approve_content(uuid, text, text), public.refund_collaboration(uuid, text),
  public.request_withdrawal(int, text, jsonb), public.admin_finalize_withdrawal(uuid, text), public.admin_reject_withdrawal(uuid, text),
  public.notify_user(uuid, text, text, text) to authenticated;
revoke execute on function public._release_payment(public.collaborations), public._wallet_of(uuid), public._trusted() from public, anon, authenticated;

-- Temps réel sur les nouvelles tables utiles.
alter publication supabase_realtime add table public.reviews;

-- ─────────────────────────── Tâches planifiées ───────────────────────────
-- (appliqué séparément : migration « cron_auto_approve »)
-- create extension if not exists pg_cron;
-- select cron.schedule('collab-auto-approve', '*/15 * * * *', $$select public.auto_approve_due()$$);
-- select cron.schedule('offers-expire', '5 * * * *', $$select public.expire_overdue_offers()$$);
