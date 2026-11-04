-- Slovenski 2000-čaki · numbers for the side column of the leaderboard / friends / groups page.
-- Only totals over everybody on the leaderboard, plus recent climbs of PUBLIC profiles (as the public profile already shows them).
-- Run after 01–05 (SQL Editor → New query → paste → Run). Safe to run again.

create or replace function public.community_stats() returns json
language sql stable security definer set search_path = '' as $$
  select json_build_object(
    -- most climbed peaks (how many people on the leaderboard have them)
    'top_peaks', (select coalesce(json_agg(x), '[]'::json) from (
        select a.peak_id, count(*)::int as n from public.ascents a join public.profiles p on p.id = a.user_id
        where not a.deleted and p.listed group by a.peak_id order by 2 desc, 1 limit 10) x),
    -- most active this month
    'month_top', (select coalesce(json_agg(x), '[]'::json) from (
        select p.username, p.display_name, count(*)::int as n from public.ascents a join public.profiles p on p.id = a.user_id
        where not a.deleted and p.listed and a.climbed_on >= date_trunc('month', current_date)
        group by p.id, p.username, p.display_name order by 3 desc, 1 limit 5) x),
    -- latest climbs of public profiles
    'recent', (select coalesce(json_agg(x), '[]'::json) from (
        select p.username, p.display_name, a.peak_id, a.climbed_on from public.ascents a join public.profiles p on p.id = a.user_id
        where not a.deleted and p.public and p.listed and a.climbed_on is not null and a.climbed_on <= current_date
        order by a.climbed_on desc, a.updated_at desc limit 12) x),
    'new_users', (select count(*) from public.profiles where listed and username is not null and created_at > now() - interval '30 days'));
$$;
grant execute on function public.community_stats() to anon, authenticated;

-- upcoming plans of all my groups (needs 05_social.sql)
create or replace function public.my_plans() returns json
language sql stable security definer set search_path = '' as $$
  select coalesce(json_agg(x order by x.plan_on nulls last, x.title), '[]'::json) from (
    select pl.id, g.id as gid, g.name as "group", pl.title, pl.plan_on, pl.peak_ids,
           (select count(*) from public.plan_going v where v.plan_id = pl.id)::int as going,
           exists (select 1 from public.plan_going v where v.plan_id = pl.id and v.user_id = auth.uid()) as me
    from public.group_members m join public.groups g on g.id = m.group_id join public.group_plans pl on pl.group_id = g.id
    where m.user_id = auth.uid() and (pl.plan_on is null or pl.plan_on >= current_date)
    order by pl.plan_on nulls last limit 12) x;
$$;
revoke execute on function public.my_plans() from public, anon;
grant execute on function public.my_plans() to authenticated;
