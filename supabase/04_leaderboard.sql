-- Slovenski 2000-čaki · leaderboard v2: everybody with an account is listed (name + numbers), unless they switch it off.
-- The detailed list of climbed peaks (dates, routes) stays visible only for users with a public profile.
-- Run after 01–03 (SQL Editor → New query → paste → Run). Safe to run again.

alter table public.profiles add column if not exists listed boolean not null default true;   -- on the leaderboard (name + counts)
grant update (display_name, prefs, prefs_at, public, listed) on public.profiles to authenticated;

-- board: p2000 = prominent 2000 m peaks (98) · a2000 = all above 2000 m · p1500 = prominent 1500–2000 m · all = every peak
-- q filters by username / display name; the rank is computed over everybody first, so a search still shows the real rank
create or replace function public.leaderboard2(board text default 'p2000', q text default '', lim integer default 50, off integer default 0)
returns table (rnk bigint, username text, display_name text, is_public boolean, n integer,
               prom2000 integer, all2000 integer, prom1500 integer, all1500 integer, last_climb date, joined date, total_users bigint)
language sql stable security definer set search_path = '' as $$
  with c as (
    select p.id, p.username, p.display_name, p.public, p.created_at::date as joined,
           (count(k.id) filter (where k.tier = '2000' and k.prominent))::int as prom2000,
           (count(k.id) filter (where k.tier = '2000'))::int as all2000,
           (count(k.id) filter (where k.tier = '1500' and k.prominent))::int as prom1500,
           (count(k.id) filter (where k.tier = '1500'))::int as all1500,
           max(a.climbed_on) as last_climb
    from public.profiles p
    left join public.ascents a on a.user_id = p.id and not a.deleted
    left join public.peaks k on k.id = a.peak_id
    where p.listed and p.username is not null
    group by p.id, p.username, p.display_name, p.public, p.created_at),
  s as (select c.*, case board when 'a2000' then c.all2000 when 'p1500' then c.prom1500 when 'all' then c.all2000 + c.all1500 else c.prom2000 end as n from c),
  r as (select s.*, rank() over (order by s.n desc) as rnk, count(*) over () as tot from s)
  select r.rnk, r.username, r.display_name, r.public, r.n, r.prom2000, r.all2000, r.prom1500, r.all1500, r.last_climb, r.joined, r.tot
  from r
  where coalesce(q, '') = '' or r.username ilike '%' || q || '%' or r.display_name ilike '%' || q || '%'
  order by r.rnk, r.username
  limit least(greatest(lim, 1), 200) offset greatest(off, 0);
$$;
grant execute on function public.leaderboard2(text, text, integer, integer) to anon, authenticated;

-- a few numbers for the top of the leaderboard
create or replace function public.leaderboard_stats() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'users', (select count(*) from public.profiles where listed and username is not null),
    'ascents', (select count(*) from public.ascents a join public.profiles p on p.id = a.user_id join public.peaks k on k.id = a.peak_id
                where not a.deleted and p.listed),
    'month', (select count(*) from public.ascents a join public.profiles p on p.id = a.user_id
              where not a.deleted and p.listed and a.climbed_on >= date_trunc('month', current_date)));
$$;
grant execute on function public.leaderboard_stats() to anon, authenticated;
