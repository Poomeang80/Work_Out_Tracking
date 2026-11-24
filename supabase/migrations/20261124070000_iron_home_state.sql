create table if not exists public.iron_home_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.iron_home_state enable row level security;

drop policy if exists "users_select_own_iron_home_state" on public.iron_home_state;
drop policy if exists "users_insert_own_iron_home_state" on public.iron_home_state;
drop policy if exists "users_update_own_iron_home_state" on public.iron_home_state;
drop policy if exists "users_delete_own_iron_home_state" on public.iron_home_state;

create policy "users_select_own_iron_home_state"
on public.iron_home_state for select
to authenticated using (auth.uid() = user_id);

create policy "users_insert_own_iron_home_state"
on public.iron_home_state for insert
to authenticated with check (auth.uid() = user_id);

create policy "users_update_own_iron_home_state"
on public.iron_home_state for update
to authenticated using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users_delete_own_iron_home_state"
on public.iron_home_state for delete
to authenticated using (auth.uid() = user_id);

alter table public.iron_home_state replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'iron_home_state'
  ) then
    alter publication supabase_realtime add table public.iron_home_state;
  end if;
end $$;
