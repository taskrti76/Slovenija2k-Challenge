-- Slovenski 2000-čaki · Supabase phase 1b: profile settings in the account, public profile + leaderboard, shared routes.
-- Run after 01_schema.sql (SQL Editor → New query → paste → Run), then 03_peaks.sql. Safe to run again.

-- ---------- profiles: settings (⚙ Moj profil) + public switch ----------
alter table public.profiles add column if not exists prefs jsonb check (pg_column_size(prefs) < 4000);
alter table public.profiles add column if not exists prefs_at timestamptz;
alter table public.profiles add column if not exists public boolean not null default false;   -- on the leaderboard / public profile
grant update (display_name, prefs, prefs_at, public) on public.profiles to authenticated;
-- a profile row (with settings) is readable only by its owner; others see public data only through the functions below
drop policy if exists "profiles: signed-in users can read" on public.profiles;
drop policy if exists "profiles: own row readable" on public.profiles;
create policy "profiles: own row readable" on public.profiles for select to authenticated using (id = (select auth.uid()));

-- ---------- peaks: which ids are prominent / 2000 m (filled by 03_peaks.sql, made by tools/build.py) ----------
create table if not exists public.peaks (
  id        text primary key,
  name      text not null,
  elev      real,
  tier      text not null,              -- '2000' or '1500'
  prominent boolean not null default false
);
alter table public.peaks enable row level security;
drop policy if exists "peaks: readable" on public.peaks;
create policy "peaks: readable" on public.peaks for select to anon, authenticated using (true);
grant select on public.peaks to anon, authenticated;

-- ---------- leaderboard (only users who switched "public" on) ----------
create or replace function public.leaderboard(lim integer default 100)
returns table (username text, display_name text, prominent integer, p2000 integer, total integer)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name,
         (count(*) filter (where k.prominent and k.tier = '2000'))::int,
         (count(*) filter (where k.tier = '2000'))::int,
         count(*)::int
  from public.profiles p
  join public.ascents a on a.user_id = p.id and not a.deleted
  join public.peaks k on k.id = a.peak_id
  where p.public and p.username is not null
  group by p.id, p.username, p.display_name
  order by 3 desc, 4 desc, 5 desc, p.username
  limit least(greatest(lim, 1), 500);
$$;
grant execute on function public.leaderboard(integer) to anon, authenticated;

-- public profile: name + climbed peaks (with date and route), only if the user made it public
create or replace function public.public_profile(uname text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('username', p.username, 'display_name', p.display_name, 'since', p.created_at,
    'ascents', (select coalesce(json_agg(json_build_object('peak_id', a.peak_id, 'climbed_on', a.climbed_on, 'route_name', a.route_name)
                                         order by a.climbed_on desc nulls last, a.peak_id), '[]'::json)
                from public.ascents a where a.user_id = p.id and not a.deleted))
  from public.profiles p where p.username = lower(uname) and p.public;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

-- ---------- shared routes ----------
-- one route by its secret link (link or public), with the author's username
create or replace function public.shared_route(token text) returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object('name', r.name, 'line', r.line, 'km', r.km, 'up_m', r.up_m, 'note', r.note, 'peak_ids', r.peak_ids,
                           'updated_at', r.updated_at, 'username', p.username, 'share_token', r.share_token)
  from public.routes r join public.profiles p on p.id = r.user_id
  where r.share_token = token and r.visibility in ('link', 'public') and not r.deleted;
$$;
grant execute on function public.shared_route(text) to anon, authenticated;

-- public routes that go over a peak (shown in the peak window)
create or replace function public.public_routes(peak text) returns table (name text, share_token text, km real, username text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.name, r.share_token, r.km, p.username, r.updated_at
  from public.routes r join public.profiles p on p.id = r.user_id
  where r.visibility = 'public' and not r.deleted and peak = any(r.peak_ids)
  order by r.updated_at desc limit 30;
$$;
grant execute on function public.public_routes(text) to anon, authenticated;
create index if not exists routes_peaks on public.routes using gin (peak_ids) where visibility = 'public' and not deleted;
