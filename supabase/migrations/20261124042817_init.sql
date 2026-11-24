-- Initial schema for Iron Home. Run once in Supabase SQL Editor or with Supabase CLI.
create table if not exists public.iron_home_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.iron_home_state enable row level security;

drop policy if exists "iron_home_select_own" on public.iron_home_state;
create policy "iron_home_select_own" on public.iron_home_state for select using (auth.uid() = user_id);
drop policy if exists "iron_home_insert_own" on public.iron_home_state;
create policy "iron_home_insert_own" on public.iron_home_state for insert with check (auth.uid() = user_id);
drop policy if exists "iron_home_update_own" on public.iron_home_state;
create policy "iron_home_update_own" on public.iron_home_state for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "iron_home_delete_own" on public.iron_home_state;
create policy "iron_home_delete_own" on public.iron_home_state for delete using (auth.uid() = user_id);
