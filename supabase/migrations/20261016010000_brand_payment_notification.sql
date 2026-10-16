-- Confirmation du paiement côté marque : en plus du créateur, la marque reçoit une notification
-- « Paiement confirmé » (visible même si elle a quitté l'écran de paiement avant la confirmation).

create or replace function public.confirm_collab_payment(p_collab uuid, p_reference text, p_gateway_amount int, p_method text default 'mobile_money')
returns text language plpgsql security definer set search_path = public as $$
declare c public.collaborations; total int;
begin
  select * into c from public.collaborations where id = p_collab for update;
  if not found then raise exception 'Collaboration introuvable'; end if;
  if c.paid then return 'already_paid'; end if;
  if c.status not in ('pending_payment', 'content_submitted') then raise exception 'Paiement impossible à ce stade (%)', c.status; end if;
  total := c.agreed_amount + round(c.agreed_amount * 0.10);
  if p_gateway_amount <> total then raise exception 'Montant payé incorrect : % au lieu de %', p_gateway_amount, total; end if;
  perform public._trusted();
  update public.collaborations
     set paid = true, status = case when c.status = 'pending_payment' then 'in_progress' else 'in_review' end, updated_at = now()
   where id = c.id;
  insert into public.transactions (collaboration_id, user_id, type, status, amount, fee, net_amount, gateway_amount, withdrawal_method, description, reference)
    values (c.id, c.brand_id, 'escrow', 'pending', c.agreed_amount, total - c.agreed_amount, c.agreed_amount, p_gateway_amount, p_method,
            'Paiement en séquestre (FedaPay)', p_reference)
    on conflict (reference) where reference is not null do nothing;
  insert into public.notifications (user_id, title, message, type)
    values (c.creator_id, '✅ Paiement sécurisé', 'La marque a versé le budget en séquestre. Vous pouvez commencer !', 'payment');
  insert into public.notifications (user_id, title, message, type)
    values (c.brand_id, '✅ Paiement confirmé', 'Votre paiement de ' || p_gateway_amount || ' FCFA est bien reçu et sécurisé en séquestre jusqu''à la validation du contenu.', 'payment');
  return 'ok';
end $$;
