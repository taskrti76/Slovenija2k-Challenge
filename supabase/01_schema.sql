-- Slovenski 2000-čaki · Supabase schema, phase 1: accounts, climbed peaks (with the route used), saved routes.
-- Login = username + password (+ Turnstile human check). Supabase needs an email, so the page signs up
-- <username>@uporabnik.dvatisocaki.invalid (the .invalid ending can never receive mail; "Confirm email" must be OFF).
-- Run once: Supabase dashboard → SQL Editor → New query → paste all → Run. Safe to run again (drops nothing with data).
-- Every table has row-level security: a user can only touch their own rows; others see only what is shared.
-- Phase 2 (friends, groups, trips) comes as 02_social.sql.

create extension if not exists pgcrypto;

-- ---------- profiles: one per account (made automatically at sign-up) ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users on delete cascade,
  username     text unique check (username ~ '^[a-z0-9_.-]{3,24}$'),   -- login name, fixed (it is part of the login)
  display_name text check (char_length(display_name) <= 40),
  role         text not null default 'user' check (role in ('user', 'editor', 'admin')),
  created_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "profiles: signed-in users can read" on public.profiles;
create policy "profiles: signed-in users can read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles: own row can be edited" on public.profiles;
create policy "profiles: own row can be edited" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- the role can only be changed here in the dashboard, never from the page
revoke update on public.profiles from authenticated, anon;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u text := case when new.email like '%@uporabnik.dvatisocaki.invalid' then split_part(new.email, '@', 1) end;
begin
  -- username comes only from the login address (not from data the browser sends), so nobody can take someone else's name
  insert into public.profiles (id, username, display_name)
  values (new.id, u, left(coalesce(nullif(new.raw_user_meta_data->>'display_name', ''), u, new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 40))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- ascents: which peaks a user has climbed, when and by which route ----------
-- one row per (user, peak); "deleted" instead of removing the row, so an offline phone and a PC agree on un-ticking
create table if not exists public.ascents (
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  peak_id    text not null check (char_length(peak_id) between 1 and 60),
  climbed_on date,
  route_name text check (char_length(route_name) <= 160),
  note       text check (char_length(note) <= 1000),
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, peak_id)
);
alter table public.ascents enable row level security;
drop policy if exists "ascents: own rows" on public.ascents;
create policy "ascents: own rows" on public.ascents for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant select, insert, update, delete on public.ascents to authenticated;
create index if not exists ascents_updated on public.ascents (user_id, updated_at);

-- ---------- routes: planned / drawn routes ----------
-- visibility: private (only me) · link (anyone with the secret link, via get_shared_route) · public (everyone)
create table if not exists public.routes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  peak_ids    text[] not null default '{}' check (cardinality(peak_ids) <= 50),
  stops       jsonb not null default '[]' check (pg_column_size(stops) < 20000),   -- [[lon, lat], …] the points you set
  line        text check (octet_length(line) < 60000),                              -- simplified line (encoded polyline)
  km          real, up_m integer, down_m integer, hours real,
  note        text check (char_length(note) <= 2000),
  visibility  text not null default 'private' check (visibility in ('private', 'link', 'public')),
  share_token text not null unique default encode(gen_random_bytes(12), 'hex'),
  deleted     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.routes enable row level security;
drop policy if exists "routes: own rows" on public.routes;
create policy "routes: own rows" on public.routes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "routes: public ones readable" on public.routes;
create policy "routes: public ones readable" on public.routes for select to anon, authenticated
  using (visibility = 'public' and not deleted);
grant select, insert, update, delete on public.routes to authenticated;
grant select on public.routes to anon;
create index if not exists routes_user on public.routes (user_id, updated_at);
create index if not exists routes_public on public.routes (updated_at) where visibility = 'public' and not deleted;

-- a route shared by secret link: readable only by whoever has the token (link routes cannot be listed)
create or replace function public.get_shared_route(token text) returns setof public.routes
language sql stable security definer set search_path = '' as $$
  select * from public.routes where share_token = token and visibility in ('link', 'public') and not deleted;
$$;
grant execute on function public.get_shared_route(text) to anon, authenticated;

-- ---------- housekeeping ----------
create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists ascents_touch on public.ascents;
create trigger ascents_touch before insert or update on public.ascents for each row execute function public.touch_updated_at();
drop trigger if exists routes_touch on public.routes;
create trigger routes_touch before insert or update on public.routes for each row execute function public.touch_updated_at();

-- limits per account (abuse guard on the free plan): 2000 ascents, 1000 routes
create or replace function public.limit_rows() returns trigger language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if tg_table_name = 'ascents' then select count(*) into n from public.ascents where user_id = new.user_id;
    if n >= 2000 then raise exception 'too many ascents'; end if;
  else select count(*) into n from public.routes where user_id = new.user_id;
    if n >= 1000 then raise exception 'too many routes'; end if;
  end if;
  return new;
end $$;
drop trigger if exists ascents_limit on public.ascents;
create trigger ascents_limit before insert on public.ascents for each row execute function public.limit_rows();
drop trigger if exists routes_limit on public.routes;
create trigger routes_limit before insert on public.routes for each row execute function public.limit_rows();

-- delete my account and everything in it (GDPR) - called from the page
create or replace function public.delete_me() returns void
language plpgsql security definer set search_path = '' as $$
begin delete from auth.users where id = auth.uid(); end $$;
revoke execute on function public.delete_me() from anon, public;
grant execute on function public.delete_me() to authenticated;

-- keep-alive for the free plan (projects pause after 7 days without requests): a GitHub Action calls this daily
create or replace function public.ping() returns text language sql stable as $$ select 'ok' $$;
grant execute on function public.ping() to anon, authenticated;
