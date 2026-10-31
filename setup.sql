-- =====================================================================
-- OR Analysis : configuration Supabase
-- À exécuter dans Supabase > SQL Editor (peut être relancé sans risque)
-- =====================================================================

-- 1) Espace de stockage privé (non public) pour les matchs
insert into storage.buckets (id, name, public)
values ('matches', 'matches', false)
on conflict (id) do nothing;

-- 2) Liste des comptes Master
create table if not exists public.masters (
  user_id  uuid primary key references auth.users(id) on delete cascade,
  added_at timestamptz not null default now()
);
alter table public.masters enable row level security;
drop policy if exists "masters_read_self" on public.masters;
create policy "masters_read_self" on public.masters
  for select to authenticated using (user_id = (select auth.uid()));
-- (aucune règle d'écriture : la liste ne se modifie que depuis le tableau de bord Supabase)

-- 3) Fonction « l'utilisateur connecté est-il Master ? »
create or replace function public.or_is_master()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.masters where user_id = (select auth.uid()));
$$;
revoke execute on function public.or_is_master() from public, anon;
grant execute on function public.or_is_master() to authenticated;

-- 4) Règles d'accès aux matchs
--    Lecture : tout compte connecté.  Ajout / modification / suppression : Master uniquement.
drop policy if exists "or_read_all"      on storage.objects;
drop policy if exists "or_master_insert" on storage.objects;
drop policy if exists "or_master_update" on storage.objects;
drop policy if exists "or_master_delete" on storage.objects;

create policy "or_read_all" on storage.objects for select to authenticated
  using (bucket_id = 'matches');

create policy "or_master_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'matches' and (select public.or_is_master()));

create policy "or_master_update" on storage.objects for update to authenticated
  using (bucket_id = 'matches' and (select public.or_is_master()))
  with check (bucket_id = 'matches' and (select public.or_is_master()));

create policy "or_master_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'matches' and (select public.or_is_master()));

-- =====================================================================
-- 5) Donner l'accès Master à un compte (à faire APRÈS avoir créé l'utilisateur
--    dans Authentication > Users). Remplacer l'e-mail puis exécuter :
--
--   insert into public.masters (user_id)
--   select id from auth.users where email = 'email-du-master@exemple.fr'
--   on conflict do nothing;
--
-- Retirer l'accès Master (le compte redevient Lecture) :
--
--   delete from public.masters
--   where user_id = (select id from auth.users where email = 'email-du-master@exemple.fr');
--
-- Voir la liste des Masters :
--
--   select u.email, m.added_at from public.masters m join auth.users u on u.id = m.user_id;
-- =====================================================================
