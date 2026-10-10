-- Contenus de collaboration privés : seuls le créateur et la marque concernés y accèdent (liens signés).
-- Chemin des fichiers : {creator_id}/{collaboration_id}/{fichier}
update storage.buckets set public = false where id = 'collaboration-content';
alter policy "Public read access to collaboration content" on storage.objects using (false);
create policy "Collab participants can read content" on storage.objects for select using (
  bucket_id = 'collaboration-content' and exists (
    select 1 from public.collaborations c
    where c.id::text = (storage.foldername(name))[2] and auth.uid() in (c.creator_id, c.brand_id)
  )
);
create policy "Brand uploads content when brand films" on storage.objects for insert with check (
  bucket_id = 'collaboration-content' and exists (
    select 1 from public.collaborations c
    where c.id::text = (storage.foldername(name))[2] and c.brand_id = auth.uid() and c.creator_id::text = (storage.foldername(name))[1]
  )
);
