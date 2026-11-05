-- Slovenski 2000-čaki · GPS-confirmed summits (Android app). Run after 01–06, then run 03_peaks.sql again (it now carries lat / lon).
-- SQL Editor → New query → paste → Run. Safe to run again.
-- The app checks the position on the phone; the server checks it again against the peak's coordinates and only then marks the
-- climb as confirmed. Nobody can set verified_at by hand (no insert / update right on that column).
alter table public.peaks add column if not exists lat double precision, add column if not exists lon double precision;
alter table public.ascents add column if not exists verified_at timestamptz;

-- normal writes may touch every column except verified_at
revoke insert, update on public.ascents from authenticated;
grant insert (user_id, peak_id, climbed_on, route_name, note, deleted, updated_at) on public.ascents to authenticated;
grant update (user_id, peak_id, climbed_on, route_name, note, deleted, updated_at) on public.ascents to authenticated;

-- un-ticking a peak also drops its confirmation
create or replace function public.ascent_unverify() returns trigger language plpgsql set search_path = '' as $$
begin if new.deleted then new.verified_at := null; end if; return new; end $$;
drop trigger if exists ascents_unverify on public.ascents;
create trigger ascents_unverify before update on public.ascents for each row execute function public.ascent_unverify();

-- pid = peak, lat / lon / acc (m) = the GPS fix, at = when (the phone may send it later, when it has signal again)
create or replace function public.verify_ascent(pid text, lat double precision, lon double precision, acc real, at timestamptz)
returns boolean language plpgsql security definer set search_path = '' as $$
declare p record; d double precision; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into p from public.peaks where id = pid;
  if p is null or p.lat is null then raise exception 'unknown peak'; end if;
  if acc is null or acc > 60 then raise exception 'gps too inaccurate'; end if;
  if at is null or at > now() + interval '10 minutes' or at < now() - interval '30 days' then raise exception 'bad time'; end if;
  d := 6371000 * 2 * asin(sqrt(power(sin(radians(lat - p.lat) / 2), 2) + cos(radians(lat)) * cos(radians(p.lat)) * power(sin(radians(lon - p.lon) / 2), 2)));
  if d > 80 then raise exception 'too far from the summit'; end if;
  insert into public.ascents (user_id, peak_id, climbed_on, deleted, verified_at)
    values (uid, pid, (at at time zone 'Europe/Ljubljana')::date, false, at)
  on conflict (user_id, peak_id) do update set deleted = false, verified_at = coalesce(public.ascents.verified_at, excluded.verified_at),
    climbed_on = coalesce(public.ascents.climbed_on, excluded.climbed_on);
  return true;
end $$;
revoke execute on function public.verify_ascent(text, double precision, double precision, real, timestamptz) from public, anon;
grant execute on function public.verify_ascent(text, double precision, double precision, real, timestamptz) to authenticated;
