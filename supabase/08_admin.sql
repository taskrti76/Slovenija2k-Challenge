-- Slovenski 2000-čaki · admin fixes: corrections an admin makes in the app (peak position / height / name, route grade / name /
-- note / hidden, closed paths). Everybody reads them (the page applies them on load), only admins write.
-- Run after 01–07 (SQL Editor → New query → paste → Run). Safe to run again.
-- Make yourself admin (once; change the username if yours is different):
--   update public.profiles set role = 'admin' where username = 'taskrti';

create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'); $$;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.fixes (
  kind       text not null check (kind in ('peak', 'route', 'closed')),
  key        text not null check (char_length(key) between 1 and 200),   -- peak id · peak|start|route name · way id
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 4000),
  note       text check (char_length(note) <= 500),
  updated_by uuid default auth.uid() references auth.users on delete set null,
  updated_at timestamptz not null default now(),
  primary key (kind, key)
);
alter table public.fixes enable row level security;
drop policy if exists "fixes: everyone reads" on public.fixes;
create policy "fixes: everyone reads" on public.fixes for select to anon, authenticated using (true);
drop policy if exists "fixes: admins write" on public.fixes;
create policy "fixes: admins write" on public.fixes for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
grant select on public.fixes to anon, authenticated;
grant insert, update, delete on public.fixes to authenticated;
drop trigger if exists fixes_touch on public.fixes;
create trigger fixes_touch before insert or update on public.fixes for each row execute function public.touch_updated_at();

-- a moved peak also moves in the peaks table (the GPS summit check uses it)
create or replace function public.fixes_peak_sync() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.kind = 'peak' and (new.data ? 'lat') and (new.data ? 'lon') then
    update public.peaks set lat = (new.data->>'lat')::double precision, lon = (new.data->>'lon')::double precision where id = new.key;
  end if;
  return new;
end $$;
drop trigger if exists fixes_peak on public.fixes;
create trigger fixes_peak after insert or update on public.fixes for each row execute function public.fixes_peak_sync();
