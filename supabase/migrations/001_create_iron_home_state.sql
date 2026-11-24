-- Run in Supabase SQL Editor once.
create table if not exists public.iron_home_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.iron_home_state enable row level security;

drop policy if exists "Users can read their Iron Home state" on public.iron_home_state;
create policy "Users can read their Iron Home state"
on public.iron_home_state for select
using (auth.uid() = user_id);

drop policy if exists "Users can insert their Iron Home state" on public.iron_home_state;
create policy "Users can insert their Iron Home state"
on public.iron_home_state for insert
with check (auth.uid() = user_id);

drop policy if exists "Users can update their Iron Home state" on public.iron_home_state;
create policy "Users can update their Iron Home state"
on public.iron_home_state for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their Iron Home state" on public.iron_home_state;
create policy "Users can delete their Iron Home state"
on public.iron_home_state for delete
using (auth.uid() = user_id);

grant select, insert, update, delete on public.iron_home_state to authenticated;
