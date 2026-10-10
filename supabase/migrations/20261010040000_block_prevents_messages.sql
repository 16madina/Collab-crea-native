-- Un utilisateur bloqué ne peut plus écrire à la personne qui l'a bloqué.
create or replace function public.is_blocked_in_conversation(_conv uuid, _sender uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversation_participants cp
    join public.blocked_users b on b.blocker_id = cp.user_id and b.blocked_id = _sender
    where cp.conversation_id = _conv and cp.user_id <> _sender
  )
$$;
create policy "Blocked senders cannot message" on public.messages as restrictive for insert
  with check (not public.is_blocked_in_conversation(conversation_id, auth.uid()));
