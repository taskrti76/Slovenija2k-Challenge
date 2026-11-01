-- Slovenski 2000-čaki · friends, groups and group plans.
-- Friends are mutual (request -> accept) and see everything of each other (peaks with dates, routes, notes, drawn routes).
-- Groups are private: only members see them; a member can invite only their own friends. Members see each other's peaks + dates.
-- All tables are closed (RLS on, no policies); everything goes through the functions below.
-- Run after 01–04 (SQL Editor → New query → paste → Run). Safe to run again.

-- ---------- tables ----------
create table if not exists public.friendships (
  a            uuid not null references auth.users on delete cascade,   -- the smaller id of the pair
  b            uuid not null references auth.users on delete cascade,
  requested_by uuid not null,
  accepted     boolean not null default false,
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (a, b),
  check (a < b)
);
create index if not exists friendships_b on public.friendships (b);

create table if not exists public.groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 60),
  created_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id  uuid not null references public.groups on delete cascade,
  user_id   uuid not null references auth.users on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user on public.group_members (user_id);
create table if not exists public.group_invites (
  group_id   uuid not null references public.groups on delete cascade,
  user_id    uuid not null references auth.users on delete cascade,
  invited_by uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_invites_user on public.group_invites (user_id);
create table if not exists public.group_plans (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups on delete cascade,
  created_by uuid references auth.users on delete set null,
  title      text not null check (char_length(title) between 1 and 120),
  plan_on    date,
  note       text check (char_length(note) <= 1000),
  peak_ids   text[] not null default '{}' check (cardinality(peak_ids) <= 50),
  line       text check (octet_length(line) < 60000),
  km         real,
  created_at timestamptz not null default now()
);
create index if not exists group_plans_group on public.group_plans (group_id);
create table if not exists public.plan_going (
  plan_id uuid not null references public.group_plans on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  primary key (plan_id, user_id)
);

do $$ declare t text; begin
  foreach t in array array['friendships', 'groups', 'group_members', 'group_invites', 'group_plans', 'plan_going'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop; end $$;

-- when the owner leaves (or deletes the account) the longest member becomes owner; an empty group disappears
create or replace function public.group_after_leave() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members where group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
  elsif not exists (select 1 from public.group_members where group_id = old.group_id and role = 'owner') then
    update public.group_members set role = 'owner' where (group_id, user_id) =
      (select group_id, user_id from public.group_members where group_id = old.group_id order by joined_at, user_id limit 1);
  end if;
  return null;
end $$;
drop trigger if exists group_members_leave on public.group_members;
create trigger group_members_leave after delete on public.group_members for each row execute function public.group_after_leave();

-- ---------- helpers (internal) ----------
create or replace function public.me() returns uuid language plpgsql stable set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  return auth.uid();
end $$;
create or replace function public.uid_of(uname text) returns uuid language plpgsql stable security definer set search_path = '' as $$
declare u uuid;
begin
  select id into u from public.profiles where username = lower(trim(uname));
  if u is null then raise exception 'no such user' using errcode = 'P0002'; end if;
  return u;
end $$;
create or replace function public.is_friend(x uuid, y uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.friendships f where f.a = least(x, y) and f.b = greatest(x, y) and f.accepted);
$$;
create or replace function public.is_member(g uuid, u uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members m where m.group_id = g and m.user_id = u);
$$;
-- counts of climbed peaks per user (same boards as the leaderboard)
create or replace function public.user_counts(u uuid) returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'prom2000', count(k.id) filter (where k.tier = '2000' and k.prominent), 'all2000', count(k.id) filter (where k.tier = '2000'),
    'prom1500', count(k.id) filter (where k.tier = '1500' and k.prominent), 'all1500', count(k.id) filter (where k.tier = '1500'),
    'last_climb', max(a.climbed_on))
  from public.ascents a left join public.peaks k on k.id = a.peak_id where a.user_id = u and not a.deleted;
$$;
revoke execute on function public.me(), public.uid_of(text), public.is_friend(uuid, uuid), public.is_member(uuid, uuid), public.user_counts(uuid) from public, anon, authenticated;

-- ---------- friends ----------
-- returns 'sent' | 'accepted' (they had asked you already) | 'pending' (you asked before) | 'already'
create or replace function public.friend_request(uname text) returns text language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid := public.uid_of(uname); f public.friendships;
begin
  if o = m then raise exception 'that is you' using errcode = '22023'; end if;
  select * into f from public.friendships where a = least(m, o) and b = greatest(m, o);
  if found then
    if f.accepted then return 'already'; end if;
    if f.requested_by = m then return 'pending'; end if;
    update public.friendships set accepted = true, accepted_at = now() where a = f.a and b = f.b;
    return 'accepted';
  end if;
  if (select count(*) from public.friendships where m in (a, b)) >= 300 then raise exception 'too many friends' using errcode = '54000'; end if;
  if (select count(*) from public.friendships where requested_by = m and not accepted and created_at > now() - interval '1 day') >= 30
    then raise exception 'too many requests today' using errcode = '54000'; end if;
  insert into public.friendships (a, b, requested_by) values (least(m, o), greatest(m, o), m);
  return 'sent';
end $$;

create or replace function public.friend_respond(uname text, ok boolean) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid := public.uid_of(uname);
begin
  if ok then update public.friendships set accepted = true, accepted_at = now()
             where a = least(m, o) and b = greatest(m, o) and requested_by = o and not accepted;
  else delete from public.friendships where a = least(m, o) and b = greatest(m, o) and requested_by = o and not accepted; end if;
end $$;

-- remove a friend, or take back your own request
create or replace function public.friend_remove(uname text) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid := public.uid_of(uname);
begin
  delete from public.friendships where a = least(m, o) and b = greatest(m, o);
end $$;

-- friends + open requests, with their numbers
create or replace function public.my_friends() returns table (username text, display_name text, state text, since timestamptz, counts json)
language sql stable security definer set search_path = '' as $$
  select p.username, p.display_name,
         case when f.accepted then 'friend' when f.requested_by = public.me() then 'outgoing' else 'incoming' end,
         coalesce(f.accepted_at, f.created_at),
         case when f.accepted then public.user_counts(p.id) end
  from public.friendships f
  join public.profiles p on p.id = case when f.a = public.me() then f.b else f.a end
  where public.me() in (f.a, f.b) and p.username is not null
  order by 3, p.username;
$$;

-- everything of a friend (or yourself): peaks with date, route and note + drawn routes (without the line)
create or replace function public.friend_profile(uname text) returns json language plpgsql stable security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid := public.uid_of(uname);
begin
  if o <> m and not public.is_friend(m, o) then return null; end if;
  return (select json_build_object('username', p.username, 'display_name', p.display_name, 'since', p.created_at,
    'friends_since', (select accepted_at from public.friendships where a = least(m, o) and b = greatest(m, o)),
    'ascents', (select coalesce(json_agg(json_build_object('peak_id', a.peak_id, 'climbed_on', a.climbed_on, 'route_name', a.route_name, 'note', a.note)
                                         order by a.climbed_on desc nulls last, a.peak_id), '[]'::json)
                from public.ascents a where a.user_id = o and not a.deleted),
    'routes', (select coalesce(json_agg(json_build_object('id', r.id, 'name', r.name, 'km', r.km, 'peak_ids', r.peak_ids, 'note', r.note, 'updated_at', r.updated_at)
                                        order by r.updated_at desc), '[]'::json)
               from public.routes r where r.user_id = o and not r.deleted))
    from public.profiles p where p.id = o);
end $$;

-- one drawn route of a friend (or your own), with the line
create or replace function public.friend_route(rid uuid) returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('name', r.name, 'line', r.line, 'km', r.km, 'peak_ids', r.peak_ids, 'note', r.note, 'username', p.username)
  from public.routes r join public.profiles p on p.id = r.user_id
  where r.id = rid and not r.deleted and (r.user_id = public.me() or public.is_friend(public.me(), r.user_id));
$$;

-- climbs of all friends and of everybody in my groups (for the peak window and the map)
create or replace function public.circle_ascents() returns table (username text, display_name text, friend boolean, peak_id text, climbed_on date, route_name text, note text)
language sql stable security definer set search_path = '' as $$
  with ppl as (
    select case when f.a = public.me() then f.b else f.a end as u, true as fr from public.friendships f where public.me() in (f.a, f.b) and f.accepted
    union
    select o.user_id, false from public.group_members g join public.group_members o on o.group_id = g.group_id
    where g.user_id = public.me() and o.user_id <> public.me()),
  w as (select u, bool_or(fr) as fr from ppl group by u)
  select p.username, p.display_name, w.fr, a.peak_id, a.climbed_on,
         case when w.fr then a.route_name end, case when w.fr then a.note end   -- route + note only for friends
  from w join public.profiles p on p.id = w.u join public.ascents a on a.user_id = w.u and not a.deleted;
$$;

-- ---------- groups ----------
create or replace function public.group_create(gname text, invite text[] default '{}') returns uuid language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); g uuid;
begin
  if (select count(*) from public.group_members where user_id = m and role = 'owner') >= 10 then raise exception 'too many groups' using errcode = '54000'; end if;
  if (select count(*) from public.group_members where user_id = m) >= 30 then raise exception 'too many groups' using errcode = '54000'; end if;
  insert into public.groups (name) values (left(trim(gname), 60)) returning id into g;
  insert into public.group_members (group_id, user_id, role) values (g, m, 'owner');
  if coalesce(cardinality(invite), 0) > 0 then perform public.group_invite(g, invite); end if;
  return g;
end $$;

-- invite friends (only your own friends); returns how many invites were made
create or replace function public.group_invite(gid uuid, unames text[]) returns integer language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid; u text; n integer := 0;
begin
  if not public.is_member(gid, m) then raise exception 'not a member' using errcode = '42501'; end if;
  foreach u in array coalesce(unames, '{}') loop
    o := public.uid_of(u);
    if not public.is_friend(m, o) then raise exception 'not your friend: %', u using errcode = '42501'; end if;
    if public.is_member(gid, o) then continue; end if;
    if (select count(*) from public.group_members where group_id = gid) + (select count(*) from public.group_invites where group_id = gid) >= 50
      then raise exception 'group is full' using errcode = '54000'; end if;
    insert into public.group_invites (group_id, user_id, invited_by) values (gid, o, m) on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

create or replace function public.group_respond(gid uuid, ok boolean) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me();
begin
  if not exists (select 1 from public.group_invites where group_id = gid and user_id = m) then return; end if;
  delete from public.group_invites where group_id = gid and user_id = m;
  if ok then
    if (select count(*) from public.group_members where user_id = m) >= 30 then raise exception 'too many groups' using errcode = '54000'; end if;
    insert into public.group_members (group_id, user_id) values (gid, m) on conflict do nothing;
  end if;
end $$;

create or replace function public.group_leave(gid uuid) returns void language sql security definer set search_path = '' as $$
  delete from public.group_members where group_id = gid and user_id = public.me();
$$;

-- owner: remove a member or take back an invite / rename / delete
create or replace function public.group_kick(gid uuid, uname text) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); o uuid := public.uid_of(uname);
begin
  if not exists (select 1 from public.group_members where group_id = gid and user_id = m and role = 'owner') then raise exception 'only the owner can do that' using errcode = '42501'; end if;
  if o = m then raise exception 'that is you' using errcode = '22023'; end if;
  delete from public.group_invites where group_id = gid and user_id = o;
  delete from public.group_members where group_id = gid and user_id = o;
end $$;
create or replace function public.group_rename(gid uuid, gname text) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members where group_id = gid and user_id = public.me() and role = 'owner') then raise exception 'only the owner can do that' using errcode = '42501'; end if;
  update public.groups set name = left(trim(gname), 60) where id = gid;
end $$;
create or replace function public.group_delete(gid uuid) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.group_members where group_id = gid and user_id = public.me() and role = 'owner') then raise exception 'only the owner can do that' using errcode = '42501'; end if;
  delete from public.groups where id = gid;
end $$;

-- my groups + invites waiting for me
create or replace function public.my_groups() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'groups', (select coalesce(json_agg(json_build_object('id', g.id, 'name', g.name, 'role', m.role,
                 'members', (select count(*) from public.group_members x where x.group_id = g.id),
                 'plans', (select count(*) from public.group_plans pl where pl.group_id = g.id and (pl.plan_on is null or pl.plan_on >= current_date)))
               order by g.name), '[]'::json)
               from public.group_members m join public.groups g on g.id = m.group_id where m.user_id = public.me()),
    'invites', (select coalesce(json_agg(json_build_object('id', g.id, 'name', g.name, 'by', p.username, 'by_name', p.display_name,
                 'members', (select count(*) from public.group_members x where x.group_id = g.id)) order by i.created_at desc), '[]'::json)
                from public.group_invites i join public.groups g on g.id = i.group_id join public.profiles p on p.id = i.invited_by
                where i.user_id = public.me()));
$$;

-- one group: members with numbers, open invites, every member's climbed peaks (+ date), plans
create or replace function public.group_detail(gid uuid) returns json language plpgsql stable security definer set search_path = '' as $$
declare m uuid := public.me();
begin
  if not public.is_member(gid, m) then return null; end if;
  return (select json_build_object('id', g.id, 'name', g.name, 'created_at', g.created_at,
    'role', (select role from public.group_members where group_id = gid and user_id = m),
    'members', (select json_agg(json_build_object('username', p.username, 'display_name', p.display_name, 'role', x.role, 'joined_at', x.joined_at,
                  'friend', public.is_friend(m, x.user_id), 'counts', public.user_counts(x.user_id)) order by x.joined_at)
                from public.group_members x join public.profiles p on p.id = x.user_id where x.group_id = gid),
    'invited', (select coalesce(json_agg(p.username order by p.username), '[]'::json)
                from public.group_invites i join public.profiles p on p.id = i.user_id where i.group_id = gid),
    'ascents', (select coalesce(json_agg(json_build_array(p.username, a.peak_id, a.climbed_on)), '[]'::json)
                from public.group_members x join public.profiles p on p.id = x.user_id
                join public.ascents a on a.user_id = x.user_id and not a.deleted where x.group_id = gid),
    'plans', (select coalesce(json_agg(json_build_object('id', pl.id, 'title', pl.title, 'plan_on', pl.plan_on, 'note', pl.note, 'peak_ids', pl.peak_ids,
                'km', pl.km, 'has_line', pl.line is not null, 'by', p.username, 'created_at', pl.created_at,
                'going', (select coalesce(json_agg(q.username order by q.username), '[]'::json) from public.plan_going pg join public.profiles q on q.id = pg.user_id where pg.plan_id = pl.id))
              order by pl.plan_on nulls last, pl.created_at), '[]'::json)
              from public.group_plans pl left join public.profiles p on p.id = pl.created_by
              where pl.group_id = gid and (pl.plan_on is null or pl.plan_on >= current_date - 30)))
    from public.groups g where g.id = gid);
end $$;

-- ---------- group plans (a date + a route / peaks; members say "I'm going") ----------
create or replace function public.plan_add(gid uuid, title text, plan_on date, note text, peak_ids text[], line text, km real) returns uuid
language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me(); v_id uuid;
begin
  if not public.is_member(gid, m) then raise exception 'not a member' using errcode = '42501'; end if;
  if (select count(*) from public.group_plans where group_id = gid) >= 300 then raise exception 'too many plans' using errcode = '54000'; end if;
  insert into public.group_plans (group_id, created_by, title, plan_on, note, peak_ids, line, km)
  values (gid, m, left(trim(title), 120), plan_on, nullif(left(trim(note), 1000), ''), coalesce(peak_ids, '{}'), line, km) returning group_plans.id into v_id;
  insert into public.plan_going (plan_id, user_id) values (v_id, m);
  return v_id;
end $$;
create or replace function public.plan_delete(pid uuid) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me();
begin
  delete from public.group_plans pl where pl.id = pid and (pl.created_by = m or exists
    (select 1 from public.group_members x where x.group_id = pl.group_id and x.user_id = m and x.role = 'owner'));
end $$;
create or replace function public.plan_go(pid uuid, going boolean) returns void language plpgsql security definer set search_path = '' as $$
declare m uuid := public.me();
begin
  if not exists (select 1 from public.group_plans pl where pl.id = pid and public.is_member(pl.group_id, m)) then raise exception 'not a member' using errcode = '42501'; end if;
  if going then insert into public.plan_going values (pid, m) on conflict do nothing;
  else delete from public.plan_going where plan_id = pid and user_id = m; end if;
end $$;
create or replace function public.plan_line(pid uuid) returns json language sql stable security definer set search_path = '' as $$
  select json_build_object('title', pl.title, 'line', pl.line, 'km', pl.km, 'plan_on', pl.plan_on, 'username', p.username)
  from public.group_plans pl left join public.profiles p on p.id = pl.created_by
  where pl.id = pid and public.is_member(pl.group_id, public.me());
$$;

-- how many things wait for me (red dot)
create or replace function public.social_badge() returns json language sql stable security definer set search_path = '' as $$
  select json_build_object(
    'requests', (select count(*) from public.friendships f where public.me() in (f.a, f.b) and not f.accepted and f.requested_by <> public.me()),
    'invites', (select count(*) from public.group_invites where user_id = public.me()));
$$;

do $$ declare f text; begin
  foreach f in array array['friend_request(text)', 'friend_respond(text, boolean)', 'friend_remove(text)', 'my_friends()', 'friend_profile(text)',
    'friend_route(uuid)', 'circle_ascents()', 'group_create(text, text[])', 'group_invite(uuid, text[])', 'group_respond(uuid, boolean)',
    'group_leave(uuid)', 'group_kick(uuid, text)', 'group_rename(uuid, text)', 'group_delete(uuid)', 'my_groups()', 'group_detail(uuid)',
    'plan_add(uuid, text, date, text, text[], text, real)', 'plan_delete(uuid)', 'plan_go(uuid, boolean)', 'plan_line(uuid)', 'social_badge()'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop; end $$;
