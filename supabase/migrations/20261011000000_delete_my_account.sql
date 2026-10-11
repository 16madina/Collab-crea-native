-- Suppression de compte (exigence App Store / Google Play) : données personnelles effacées, connexion
-- impossible, historique financier conservé de façon anonyme. Les fichiers sont supprimés par l'app
-- via l'API Storage (la suppression directe en SQL est interdite par Supabase).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.collaborations where uid in (creator_id, brand_id)
             and status in ('in_progress','content_submitted','in_review','revision_requested','pending_publication','publication_submitted') and paid) then
    raise exception 'Une collaboration payée est en cours : termine-la ou contacte le support avant de supprimer ton compte';
  end if;
  if exists (select 1 from public.wallets where user_id = uid and (balance > 0 or pending_balance > 0)) then
    raise exception 'Retire d''abord le solde de ton portefeuille avant de supprimer ton compte';
  end if;
  perform set_config('app.trusted', 'on', true);
  update public.profiles set full_name = 'Compte supprimé', avatar_url = null, banner_url = null, logo_url = null, bio = null,
    company_name = null, company_description = null, website = null, tags = '{}', pricing = '[]'::jsonb,
    instagram_followers = null, tiktok_followers = null, youtube_followers = null, snapchat_followers = null, facebook_followers = null,
    identity_document_url = null, selfie_url = null, is_banned = true, ban_reason = 'Compte supprimé par l''utilisateur', banned_at = now()
  where user_id = uid;
  update public.offers set status = 'closed' where brand_id = uid and status = 'active';
  delete from public.push_tokens where user_id = uid;
  delete from public.portfolio_items where user_id = uid;
  delete from public.follows where uid in (follower_id, followed_id);
  delete from public.favorites where uid in (brand_id, creator_id);
  delete from public.offer_favorites where user_id = uid;
  delete from public.social_verifications where user_id = uid;
  delete from auth.identities where user_id = uid;
  delete from auth.sessions where user_id = uid;
  update auth.users set email = 'supprime-' || uid || '@deleted.collabcrea.app', encrypted_password = '', phone = null,
    raw_user_meta_data = '{}'::jsonb, banned_until = 'infinity' where id = uid;
end $$;
grant execute on function public.delete_my_account() to authenticated;
