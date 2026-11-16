-- Slovenski 2000-čaki · home-screen widget "Potrdi vrh" (Android app). Run after 01–09 (SQL Editor → New query → paste → Run).
-- Safe to run again.
-- The widget runs without the web page, so it cannot use the page's login (that token expires every hour and refreshing it from
-- two places would log the page out). Instead the page asks for a widget key once (widget_key_create, signed in); the phone keeps
-- the key, the database only its SHA-256. widget_verify takes the key + one GPS fix, finds the nearest summit and confirms it with
-- the same rules as verify_ascent (07_verify.sql): fix ±60 m or better, at most 80 m from the summit, not older than 30 days.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.widget_keys (
  key_hash   text primary key,
  user_id    uuid not null references auth.users on delete cascade,
  device     text check (char_length(device) <= 80),
  created_at timestamptz not null default now(),
  used_at    timestamptz
);
alter table public.widget_keys enable row level security;
revoke all on public.widget_keys from anon, authenticated;   -- only through the functions below

-- new key for this phone (at most 5 per account: the oldest goes)
create or replace function public.widget_key_create(device text default null) returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); k text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  delete from public.widget_keys where key_hash in (
    select key_hash from public.widget_keys where user_id = uid order by coalesce(used_at, created_at) desc offset 4);
  k := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.widget_keys (key_hash, user_id, device) values (encode(extensions.digest(k, 'sha256'), 'hex'), uid, left(device, 80));
  return k;
end $$;

create or replace function public.widget_key_revoke(k text) returns void
language sql security definer set search_path = '' as $$
  delete from public.widget_keys where key_hash = encode(extensions.digest(k, 'sha256'), 'hex') and user_id = auth.uid(); $$;

-- one GPS fix from the widget -> {ok, why, id, name, elev, d (m), brg (°), n (prominent 2000ers confirmed / ticked)}
-- why: key (unknown / revoked key) · pos (outside Slovenia) · time · none (no peak within ~30 km) · acc (fix worse than ±60 m) · far (> 80 m)
create or replace function public.widget_verify(k text, lat double precision, lon double precision, acc real, at timestamptz) returns json
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare uid uuid; p record; n integer; b double precision;
begin
  select user_id into uid from public.widget_keys where key_hash = encode(extensions.digest(k, 'sha256'), 'hex');
  if uid is null then return json_build_object('ok', false, 'why', 'key'); end if;
  update public.widget_keys set used_at = now() where key_hash = encode(extensions.digest(k, 'sha256'), 'hex');
  if lat is null or lon is null or lat not between 45.2 and 47.0 or lon not between 13.2 and 16.7 then return json_build_object('ok', false, 'why', 'pos'); end if;
  if at is null or at > now() + interval '10 minutes' or at < now() - interval '30 days' then return json_build_object('ok', false, 'why', 'time'); end if;
  select q.id, q.name, q.elev, q.lat as plat, q.lon as plon,
         6371000 * 2 * asin(sqrt(power(sin(radians(lat - q.lat) / 2), 2) + cos(radians(lat)) * cos(radians(q.lat)) * power(sin(radians(lon - q.lon) / 2), 2))) as d
    into p from public.peaks q
   where q.lat is not null and q.lat between lat - 0.3 and lat + 0.3 and q.lon between lon - 0.4 and lon + 0.4
   order by d limit 1;
  if p is null then return json_build_object('ok', false, 'why', 'none'); end if;
  b := mod((degrees(atan2(sin(radians(p.plon - lon)) * cos(radians(p.plat)),
          cos(radians(lat)) * sin(radians(p.plat)) - sin(radians(lat)) * cos(radians(p.plat)) * cos(radians(p.plon - lon)))) + 360)::numeric, 360)::double precision;
  if acc is null or acc > 60 then return json_build_object('ok', false, 'why', 'acc', 'id', p.id, 'name', p.name, 'elev', p.elev, 'd', round(p.d), 'brg', round(b)); end if;
  if p.d > 80 then return json_build_object('ok', false, 'why', 'far', 'id', p.id, 'name', p.name, 'elev', p.elev, 'd', round(p.d), 'brg', round(b)); end if;
  insert into public.ascents (user_id, peak_id, climbed_on, deleted, verified_at)
    values (uid, p.id, (at at time zone 'Europe/Ljubljana')::date, false, at)
  on conflict (user_id, peak_id) do update set deleted = false, verified_at = coalesce(public.ascents.verified_at, excluded.verified_at),
    climbed_on = coalesce(public.ascents.climbed_on, excluded.climbed_on);
  select count(*) into n from public.ascents a join public.peaks q on q.id = a.peak_id
   where a.user_id = uid and not a.deleted and q.prominent and q.tier = '2000';
  return json_build_object('ok', true, 'id', p.id, 'name', p.name, 'elev', p.elev, 'd', round(p.d), 'n', n);
end $$;

revoke execute on function public.widget_key_create(text), public.widget_key_revoke(text) from public, anon;
grant execute on function public.widget_key_create(text), public.widget_key_revoke(text) to authenticated;
revoke execute on function public.widget_verify(text, double precision, double precision, real, timestamptz) from public;
grant execute on function public.widget_verify(text, double precision, double precision, real, timestamptz) to anon, authenticated;
