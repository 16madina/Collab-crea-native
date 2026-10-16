-- Retraits réels des créateurs via FeexPay (payout Mobile Money).
-- L'admin valide un retrait dans l'app -> la fonction serveur feexpay-payout appelle ces fonctions,
-- réservées au serveur (rôle service), autour de l'envoi FeexPay :
--   withdrawal_payout_start  : verrouille la demande et la passe « en cours » (processing)
--   withdrawal_payout_done   : FeexPay a confirmé l'envoi -> retrait effectué
--   withdrawal_payout_failed : FeexPay a refusé / échoué -> retrait refusé et solde recrédité

create or replace function public.withdrawal_payout_start(p_id uuid, p_admin uuid)
returns public.withdrawal_requests language plpgsql security definer set search_path = public as $$
declare r public.withdrawal_requests;
begin
  if not public.has_role(p_admin, 'admin') then raise exception 'Réservé aux administrateurs'; end if;
  select * into r from public.withdrawal_requests where id = p_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if r.status not in ('pending', 'approved') then raise exception 'Demande déjà traitée ou en cours (%)', r.status; end if;
  if r.method <> 'mobile_money' then raise exception 'Seuls les retraits Mobile Money partent via FeexPay'; end if;
  update public.withdrawal_requests set status = 'processing', reviewed_by = p_admin, reviewed_at = now(), updated_at = now()
   where id = p_id returning * into r;
  return r;
end $$;

create or replace function public.withdrawal_payout_set_ref(p_id uuid, p_ref text) returns void
language sql security definer set search_path = public as $$
  update public.withdrawal_requests set transaction_id = p_ref, updated_at = now() where id = p_id and status = 'processing';
$$;

create or replace function public.withdrawal_payout_done(p_id uuid, p_ref text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.withdrawal_requests;
begin
  select * into r from public.withdrawal_requests where id = p_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if r.status = 'completed' then return 'already_done'; end if;
  if r.status <> 'processing' then raise exception 'Demande pas en cours d''envoi (%)', r.status; end if;
  update public.withdrawal_requests set status = 'completed', transaction_id = coalesce(p_ref, transaction_id), updated_at = now() where id = p_id;
  update public.wallets set pending_balance = greatest(0, pending_balance - r.amount), updated_at = now() where id = r.wallet_id;
  update public.transactions set status = 'completed', updated_at = now() where reference = p_id::text and type = 'withdrawal';
  insert into public.notifications (user_id, title, message, type)
    values (r.user_id, '💸 Retrait effectué', 'Ton retrait de ' || r.amount || ' FCFA a été envoyé sur ton Mobile Money.', 'payment');
  insert into public.admin_logs (admin_id, action_type, target_user_id, details)
    values (r.reviewed_by, 'withdrawal_payout_feexpay', r.user_id, jsonb_build_object('id', p_id, 'amount', r.amount, 'reference', p_ref));
  return 'ok';
end $$;

create or replace function public.withdrawal_payout_failed(p_id uuid, p_reason text) returns text
language plpgsql security definer set search_path = public as $$
declare r public.withdrawal_requests;
begin
  select * into r from public.withdrawal_requests where id = p_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if r.status in ('completed', 'rejected') then return 'already_closed'; end if;
  update public.withdrawal_requests set status = 'rejected', rejection_reason = 'Échec du virement : ' || coalesce(p_reason, 'refusé par FeexPay'), updated_at = now() where id = p_id;
  update public.wallets set balance = balance + r.amount, pending_balance = greatest(0, pending_balance - r.amount), updated_at = now() where id = r.wallet_id;
  update public.transactions set status = 'cancelled', updated_at = now() where reference = p_id::text and type = 'withdrawal';
  insert into public.notifications (user_id, title, message, type)
    values (r.user_id, 'Retrait non abouti', 'Le virement de ' || r.amount || ' FCFA a échoué. Ton solde a été recrédité, tu peux refaire une demande.', 'warning');
  insert into public.admin_logs (admin_id, action_type, target_user_id, details)
    values (r.reviewed_by, 'withdrawal_payout_failed', r.user_id, jsonb_build_object('id', p_id, 'amount', r.amount, 'reason', p_reason));
  return 'ok';
end $$;

revoke execute on function public.withdrawal_payout_start(uuid, uuid), public.withdrawal_payout_set_ref(uuid, text),
  public.withdrawal_payout_done(uuid, text), public.withdrawal_payout_failed(uuid, text) from public, anon, authenticated;
grant execute on function public.withdrawal_payout_start(uuid, uuid), public.withdrawal_payout_set_ref(uuid, text),
  public.withdrawal_payout_done(uuid, text), public.withdrawal_payout_failed(uuid, text) to service_role;
