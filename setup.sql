-- OR Analysis : configuration Supabase (à exécuter une seule fois dans SQL Editor)
-- 1) Espace de stockage privé pour les matchs
insert into storage.buckets (id, name, public)
values ('matches', 'matches', false)
on conflict (id) do nothing;

-- 2) Chaque utilisateur ne peut lire / écrire / supprimer QUE son propre dossier (<id utilisateur>/...)
create policy "or_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'matches' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "or_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'matches' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "or_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'matches' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'matches' and (storage.foldername(name))[1] = (select auth.uid()::text));

create policy "or_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'matches' and (storage.foldername(name))[1] = (select auth.uid()::text));
