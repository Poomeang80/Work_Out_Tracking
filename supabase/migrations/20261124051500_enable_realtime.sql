-- Enable Postgres Changes for cross-device updates. Safe to run more than once.
alter table public.iron_home_state replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'iron_home_state'
  ) then
    alter publication supabase_realtime add table public.iron_home_state;
  end if;
end $$;
