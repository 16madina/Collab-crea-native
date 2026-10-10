-- Garde-fou collaborations v2 : la date de validation automatique est fixée par le serveur
-- (7 jours, 48 h si la marque a filmé) et approved_at / refund_reason sont réservés au serveur.
create or replace function public.guard_collaboration() returns trigger
language plpgsql set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_brand_films boolean;
begin
  if coalesce(current_setting('app.trusted', true), '') = 'on' or uid is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.agreed_amount < 200 then raise exception 'Montant minimum : 200 FCFA'; end if;
    new.status := 'pending_payment';
    new.paid := false;
    new.payout_status := null;
    new.auto_approve_at := null;
    new.platform_fee := round(new.agreed_amount * 0.10) + round(new.agreed_amount * 0.05);
    new.creator_amount := new.agreed_amount - round(new.agreed_amount * 0.05);
    return new;
  end if;

  if new.agreed_amount is distinct from old.agreed_amount or new.platform_fee is distinct from old.platform_fee
     or new.creator_amount is distinct from old.creator_amount or new.paid is distinct from old.paid
     or new.brand_id is distinct from old.brand_id or new.creator_id is distinct from old.creator_id
     or new.offer_id is distinct from old.offer_id or new.payout_status is distinct from old.payout_status
     or new.approved_at is distinct from old.approved_at or new.refund_reason is distinct from old.refund_reason then
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
      or (old.status = 'in_progress' and new.status = 'content_submitted')
    ) then
      null;
    else
      raise exception 'Transition de statut non autorisée (% → %)', old.status, new.status;
    end if;
  end if;

  if new.status = 'content_submitted' and old.status is distinct from 'content_submitted' then
    select o.filming_by = 'brand' into v_brand_films from public.offers o where o.id = new.offer_id;
    new.content_submitted_at := now();
    new.auto_approve_at := now() + case when coalesce(v_brand_films, false) then interval '48 hours' else interval '7 days' end;
  elsif new.auto_approve_at is distinct from old.auto_approve_at then
    new.auto_approve_at := old.auto_approve_at;
  end if;
  return new;
end $$;
