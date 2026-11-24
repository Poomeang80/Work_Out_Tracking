-- Iron Home initial schema for Supabase
-- Safe to run through Supabase CLI, Supabase GitHub integration, or SQL Editor.

create table if not exists public.iron_home_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.iron_home_state enable row level security;

-- Re-runnable owner-only policies. Each authenticated user can access only their row.
drop policy if exists "Users can read their Iron Home state" on public.iron_home_state;
create policy "Users can read their Iron Home state"
on public.iron_home_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert their Iron Home state" on public.iron_home_state;
create policy "Users can insert their Iron Home state"
on public.iron_home_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their Iron Home state" on public.iron_home_state;
create policy "Users can update their Iron Home state"
on public.iron_home_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their Iron Home state" on public.iron_home_state;
create policy "Users can delete their Iron Home state"
on public.iron_home_state for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Public clients use the anon/publishable key for Auth, but table access requires
-- an authenticated session and is still constrained by the RLS policies above.
revoke all on table public.iron_home_state from anon;
grant select, insert, update, delete on table public.iron_home_state to authenticated;
