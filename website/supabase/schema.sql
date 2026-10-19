-- Iron & Wrath league — Supabase schema (free tier). Paste into: Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run. ALL-IN-ONE: tables, RLS, RPCs, leaderboard, 60-day archive job, cloud rosters, league v2-v4
-- (confirmations, calendar, live links, one league per user, disband), tournaments, and username login lookup.
-- The other .sql files in this folder are the same pieces split up; you only need this one.

-- ───────────── tables ─────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.leagues (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.league_members (
  league_id uuid not null references public.leagues(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  client_key text not null,                       -- stops the same game being sent twice
  played_at timestamptz not null default now(),
  p1_name text not null check (char_length(p1_name) between 1 and 40),
  p1_faction text,
  p1_score int not null check (p1_score between 0 and 200),
  p2_name text not null check (char_length(p2_name) between 1 and 40),
  p2_faction text,
  p2_score int not null check (p2_score between 0 and 200),
  mission text,
  detail jsonb check (detail is null or pg_column_size(detail) < 60000),   -- per-round log, for battle reports later
  created_at timestamptz not null default now(),
  unique (league_id, client_key)
);
create index if not exists games_league_played on public.games (league_id, played_at desc);

-- running totals of games older than 60 days (the detailed rows are deleted, the numbers are kept)
create table if not exists public.archive_stats (
  league_id uuid not null references public.leagues(id) on delete cascade,
  player_key text not null,
  display_name text not null,
  games bigint not null default 0,
  wins bigint not null default 0,
  losses bigint not null default 0,
  draws bigint not null default 0,
  vp_for bigint not null default 0,
  vp_against bigint not null default 0,
  primary key (league_id, player_key)
);

-- ───────────── security (row level security) ─────────────
alter table public.profiles enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.games enable row level security;
alter table public.archive_stats enable row level security;

create or replace function public.is_member(l uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.league_members where league_id = l and user_id = auth.uid())
$$;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (
  id = auth.uid() or exists (
    select 1 from public.league_members a join public.league_members b on a.league_id = b.league_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));
drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert with check (id = auth.uid());
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update using (id = auth.uid());

drop policy if exists leagues_select on public.leagues;
create policy leagues_select on public.leagues for select using (public.is_member(id));

drop policy if exists members_select on public.league_members;
create policy members_select on public.league_members for select using (public.is_member(league_id));
drop policy if exists members_leave on public.league_members;
create policy members_leave on public.league_members for delete using (user_id = auth.uid());

drop policy if exists games_select on public.games;
create policy games_select on public.games for select using (public.is_member(league_id));
drop policy if exists games_insert on public.games;
create policy games_insert on public.games for insert with check (public.is_member(league_id) and submitted_by = auth.uid());
drop policy if exists games_delete on public.games;
create policy games_delete on public.games for delete using (submitted_by = auth.uid());

drop policy if exists archive_select on public.archive_stats;
create policy archive_select on public.archive_stats for select using (public.is_member(league_id));

-- ───────────── API access (works whether or not "Automatically expose new tables" was ticked) ─────────────
-- Signed-in users get table privileges; row-level security above decides which rows. Anonymous visitors get nothing.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.leagues, public.league_members, public.games, public.archive_stats to authenticated;
revoke all on public.profiles, public.leagues, public.league_members, public.games, public.archive_stats from anon;

-- ───────────── new user → profile ─────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ───────────── RPCs the app calls ─────────────
create or replace function public.create_league(p_name text) returns public.leagues
language plpgsql security definer set search_path = public as $$
declare l public.leagues;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into public.leagues (name, created_by) values (trim(p_name), auth.uid()) returning * into l;
  insert into public.league_members (league_id, user_id, role) values (l.id, auth.uid(), 'owner');
  return l;
end $$;

create or replace function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare lid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into lid from public.leagues where invite_code = lower(trim(p_code));
  if lid is null then raise exception 'invalid invite code'; end if;
  insert into public.league_members (league_id, user_id) values (lid, auth.uid()) on conflict do nothing;
  return lid;
end $$;

-- leaderboard = live games + archived totals. 3 points per win, 1 per draw.
create or replace function public.league_leaderboard(p_league uuid)
returns table (player_key text, display_name text, games bigint, wins bigint, losses bigint, draws bigint,
               vp_for bigint, vp_against bigint, points bigint)
language sql security definer stable set search_path = public as $$
  with rows_ as (
    select lower(trim(p1_name)) k, p1_name n, 1::bigint g, (p1_score > p2_score)::int w, (p1_score < p2_score)::int l, (p1_score = p2_score)::int d, p1_score f, p2_score a
      from public.games where league_id = p_league and public.is_member(p_league)
    union all
    select lower(trim(p2_name)), p2_name, 1, (p2_score > p1_score)::int, (p2_score < p1_score)::int, (p1_score = p2_score)::int, p2_score, p1_score
      from public.games where league_id = p_league and public.is_member(p_league)
    union all
    select player_key, display_name, games, wins, losses, draws, vp_for, vp_against
      from public.archive_stats where league_id = p_league and public.is_member(p_league)
  )
  select k, max(n), sum(g)::bigint, sum(w)::bigint, sum(l)::bigint, sum(d)::bigint, sum(f)::bigint, sum(a)::bigint, (sum(w) * 3 + sum(d))::bigint
  from rows_ group by k
  order by 9 desc, (sum(f) - sum(a)) desc, 3 asc
$$;

-- ───────────── keep-alive ping (called every 5 days by the GitHub workflow) ─────────────
create or replace function public.ping() returns text language sql stable as $$ select 'ok ' || now()::text $$;
grant execute on function public.ping() to anon, authenticated;

-- ───────────── 60-day cleanup: fold old games into archive_stats, then delete them ─────────────
create or replace function public.archive_old_games(p_days int default 60) returns bigint
language plpgsql security definer set search_path = public as $$
declare cnt bigint;
begin
  with deleted as (
    delete from public.games where played_at < now() - make_interval(days => p_days) returning *
  ), rows_ as (
    select league_id, lower(trim(p1_name)) k, p1_name n, (p1_score > p2_score)::int w, (p1_score < p2_score)::int l, (p1_score = p2_score)::int d, p1_score f, p2_score a from deleted
    union all
    select league_id, lower(trim(p2_name)), p2_name, (p2_score > p1_score)::int, (p2_score < p1_score)::int, (p1_score = p2_score)::int, p2_score, p1_score from deleted
  ), agg as (
    select league_id, k, max(n) n, count(*) g, sum(w) w, sum(l) l, sum(d) d, sum(f) f, sum(a) a from rows_ group by league_id, k
  ), up as (
    insert into public.archive_stats (league_id, player_key, display_name, games, wins, losses, draws, vp_for, vp_against)
    select league_id, k, n, g, w, l, d, f, a from agg
    on conflict (league_id, player_key) do update set
      display_name = excluded.display_name,
      games = public.archive_stats.games + excluded.games,
      wins = public.archive_stats.wins + excluded.wins,
      losses = public.archive_stats.losses + excluded.losses,
      draws = public.archive_stats.draws + excluded.draws,
      vp_for = public.archive_stats.vp_for + excluded.vp_for,
      vp_against = public.archive_stats.vp_against + excluded.vp_against
    returning 1
  )
  select count(*) into cnt from deleted;
  return cnt;
end $$;
revoke all on function public.archive_old_games(int) from public, anon, authenticated;
grant execute on function public.create_league(text), public.join_league(text), public.league_leaderboard(uuid), public.is_member(uuid) to authenticated;

-- run it every day at 03:17 UTC (inside Supabase — nothing to host)
create extension if not exists pg_cron;
select cron.schedule('archive-old-games', '17 3 * * *', $$ select public.archive_old_games(60) $$);

-- ───────────── cloud rosters (max 3 per user) ─────────────
create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (1, 2, 3)),              -- only 3 slots exist → hard limit of 3 per user
  name text not null check (char_length(name) between 1 and 60),
  faction text not null check (char_length(faction) between 1 and 60),
  points_limit int not null check (points_limit between 0 and 10000),
  detachments jsonb not null default '[]' check (jsonb_typeof(detachments) = 'array'),
  units jsonb not null check (jsonb_typeof(units) = 'array' and jsonb_array_length(units) <= 80 and pg_column_size(units) < 20000),  -- [[datasheetId, name, pts, count], ...]
  updated_at timestamptz not null default now(),
  unique (owner, slot)
);

-- existing databases: widen the slot limit from 2 to 3
alter table public.rosters drop constraint if exists rosters_slot_check;
alter table public.rosters add constraint rosters_slot_check check (slot in (1, 2, 3));

alter table public.rosters enable row level security;
drop policy if exists rosters_select on public.rosters;
create policy rosters_select on public.rosters for select to authenticated using (owner = auth.uid());
drop policy if exists rosters_insert on public.rosters;
create policy rosters_insert on public.rosters for insert to authenticated with check (owner = auth.uid());
drop policy if exists rosters_update on public.rosters;
create policy rosters_update on public.rosters for update to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
drop policy if exists rosters_delete on public.rosters;
create policy rosters_delete on public.rosters for delete to authenticated using (owner = auth.uid());

grant select, insert, update, delete on public.rosters to authenticated;
revoke all on public.rosters from anon;

create or replace function public.touch_roster() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists rosters_touch on public.rosters;
create trigger rosters_touch before update on public.rosters for each row execute function public.touch_roster();

-- ───────────── league v2: invite preview + members ─────────────
-- What an invited person sees BEFORE they have an account: just the league name, owner and size. Nothing else.
create or replace function public.league_preview(p_code text)
returns table (name text, owner_name text, members bigint)
language sql security definer stable set search_path = public as $$
  select l.name,
         (select p.display_name from public.profiles p where p.id = l.created_by),
         (select count(*) from public.league_members m where m.league_id = l.id)
  from public.leagues l where l.invite_code = lower(trim(p_code))
$$;
grant execute on function public.league_preview(text) to anon, authenticated;

-- Members of a league (only visible to members).
create or replace function public.league_members_list(p_league uuid)
returns table (user_id uuid, display_name text, role text, joined_at timestamptz)
language sql security definer stable set search_path = public as $$
  select m.user_id, coalesce(p.display_name, 'player'), m.role, m.joined_at
  from public.league_members m left join public.profiles p on p.id = m.user_id
  where m.league_id = p_league and public.is_member(p_league)
  order by (m.role = 'owner') desc, m.joined_at
$$;
grant execute on function public.league_members_list(uuid) to authenticated;

-- Tighten: signed-out visitors may only call ping() and league_preview().
revoke execute on function public.league_members_list(uuid), public.create_league(text), public.join_league(text), public.league_leaderboard(uuid), public.is_member(uuid) from public, anon;
grant execute on function public.league_members_list(uuid), public.create_league(text), public.join_league(text), public.league_leaderboard(uuid), public.is_member(uuid) to authenticated;

-- ───────────── league v3 ─────────────

-- ───────────── games: link players, status, rosters ─────────────
alter table public.games add column if not exists p1_user uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists p2_user uuid references auth.users(id) on delete set null;
alter table public.games add column if not exists status text not null default 'confirmed';
alter table public.games drop constraint if exists games_status_check;
alter table public.games add constraint games_status_check check (status in ('pending', 'confirmed', 'rejected'));
alter table public.games add column if not exists confirmed_at timestamptz;
alter table public.games add column if not exists p1_roster jsonb;
alter table public.games add column if not exists p2_roster jsonb;
alter table public.games drop constraint if exists games_rosters_size;
alter table public.games add constraint games_rosters_size check (
  (p1_roster is null or pg_column_size(p1_roster) < 20000) and (p2_roster is null or pg_column_size(p2_roster) < 20000));
-- keep games when a user deletes their account (their typed names stay in the ranking)
alter table public.games alter column submitted_by drop not null;
alter table public.games drop constraint if exists games_submitted_by_fkey;
alter table public.games add constraint games_submitted_by_fkey foreign key (submitted_by) references auth.users(id) on delete set null;
create index if not exists games_status on public.games (league_id, status);

-- games can no longer be inserted directly: only through submit_game() (so status can't be faked)
drop policy if exists games_insert on public.games;

create or replace function public.submit_game(
  p_league uuid, p_client_key text, p_played_at timestamptz,
  p_p1_name text, p_p1_faction text, p_p1_score int,
  p_p2_name text, p_p2_faction text, p_p2_score int,
  p_mission text, p_detail jsonb,
  p_my_side int, p_opponent uuid default null,
  p_p1_roster jsonb default null, p_p2_roster jsonb default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); gid uuid; st text;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not public.is_member(p_league) then raise exception 'not a member of this league'; end if;
  if p_my_side not in (1, 2) then raise exception 'pick which side you played'; end if;
  if p_opponent is not null then
    if p_opponent = me then raise exception 'opponent cannot be yourself'; end if;
    if not exists (select 1 from public.league_members where league_id = p_league and user_id = p_opponent) then raise exception 'opponent is not in this league'; end if;
    st := 'pending';
  else
    st := 'confirmed';   -- opponent without an account: counts right away
  end if;
  insert into public.games (league_id, submitted_by, client_key, played_at, p1_name, p1_faction, p1_score, p2_name, p2_faction, p2_score,
                            mission, detail, p1_user, p2_user, status, confirmed_at, p1_roster, p2_roster)
  values (p_league, me, p_client_key, coalesce(p_played_at, now()), p_p1_name, p_p1_faction, p_p1_score, p_p2_name, p_p2_faction, p_p2_score,
          p_mission, p_detail,
          case when p_my_side = 1 then me else p_opponent end, case when p_my_side = 2 then me else p_opponent end,
          st, case when st = 'confirmed' then now() end, p_p1_roster, p_p2_roster)
  on conflict (league_id, client_key) do nothing returning id into gid;
  if gid is null then raise exception 'already sent'; end if;
  return gid;
end $$;

create or replace function public.confirm_game(p_game uuid, p_accept boolean) returns text
language plpgsql security definer set search_path = public as $$
declare g public.games; me uuid := auth.uid();
begin
  select * into g from public.games where id = p_game;
  if g.id is null or me is null then raise exception 'game not found'; end if;
  if g.status <> 'pending' then raise exception 'already %', g.status; end if;
  if me is not distinct from g.submitted_by or not (me = g.p1_user or me = g.p2_user)
     then raise exception 'only the opponent can confirm this game'; end if;
  update public.games set status = case when p_accept then 'confirmed' else 'rejected' end, confirmed_at = now() where id = p_game;
  return case when p_accept then 'confirmed' else 'rejected' end;
end $$;

-- ───────────── leaderboard: confirmed games only; linked accounts count per person ─────────────
create or replace function public.league_leaderboard(p_league uuid)
returns table (player_key text, display_name text, games bigint, wins bigint, losses bigint, draws bigint,
               vp_for bigint, vp_against bigint, points bigint)
language sql security definer stable set search_path = public as $$
  with g as (select * from public.games where league_id = p_league and status = 'confirmed' and public.is_member(p_league)),
  rows_ as (
    select coalesce('u:' || p1_user::text, 'n:' || lower(trim(p1_name))) k, p1_name n, 1::bigint g, (p1_score > p2_score)::int w, (p1_score < p2_score)::int l, (p1_score = p2_score)::int d, p1_score f, p2_score a from g
    union all
    select coalesce('u:' || p2_user::text, 'n:' || lower(trim(p2_name))), p2_name, 1, (p2_score > p1_score)::int, (p2_score < p1_score)::int, (p1_score = p2_score)::int, p2_score, p1_score from g
    union all
    select player_key, display_name, games, wins, losses, draws, vp_for, vp_against
      from public.archive_stats where league_id = p_league and public.is_member(p_league)
  )
  select k,
         coalesce(case when k like 'u:%' then (select p.display_name from public.profiles p where p.id = substr(k, 3)::uuid) end, max(n)),
         sum(g)::bigint, sum(w)::bigint, sum(l)::bigint, sum(d)::bigint, sum(f)::bigint, sum(a)::bigint, (sum(w) * 3 + sum(d))::bigint
  from rows_ group by k
  order by 9 desc, (sum(f) - sum(a)) desc, 3 asc
$$;

-- 60-day archive: only confirmed games count; same keys as the leaderboard
create or replace function public.archive_old_games(p_days int default 60) returns bigint
language plpgsql security definer set search_path = public as $$
declare cnt bigint;
begin
  with deleted as (
    delete from public.games where played_at < now() - make_interval(days => p_days) returning *
  ), conf as (select * from deleted where status = 'confirmed'),
  rows_ as (
    select league_id, coalesce('u:' || p1_user::text, 'n:' || lower(trim(p1_name))) k, coalesce((select display_name from public.profiles where id = p1_user), p1_name) n, (p1_score > p2_score)::int w, (p1_score < p2_score)::int l, (p1_score = p2_score)::int d, p1_score f, p2_score a from conf
    union all
    select league_id, coalesce('u:' || p2_user::text, 'n:' || lower(trim(p2_name))), coalesce((select display_name from public.profiles where id = p2_user), p2_name), (p2_score > p1_score)::int, (p2_score < p1_score)::int, (p1_score = p2_score)::int, p2_score, p1_score from conf
  ), agg as (
    select league_id, k, max(n) n, count(*) g, sum(w) w, sum(l) l, sum(d) d, sum(f) f, sum(a) a from rows_ group by league_id, k
  ), up as (
    insert into public.archive_stats (league_id, player_key, display_name, games, wins, losses, draws, vp_for, vp_against)
    select league_id, k, n, g, w, l, d, f, a from agg
    on conflict (league_id, player_key) do update set
      display_name = excluded.display_name,
      games = public.archive_stats.games + excluded.games, wins = public.archive_stats.wins + excluded.wins,
      losses = public.archive_stats.losses + excluded.losses, draws = public.archive_stats.draws + excluded.draws,
      vp_for = public.archive_stats.vp_for + excluded.vp_for, vp_against = public.archive_stats.vp_against + excluded.vp_against
    returning 1
  )
  select count(*) into cnt from deleted;
  return cnt;
end $$;
revoke all on function public.archive_old_games(int) from public, anon, authenticated;

-- ───────────── league calendar ─────────────
create table if not exists public.league_events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  starts_at timestamptz not null,
  title text not null check (char_length(title) between 1 and 80),
  notes text check (notes is null or char_length(notes) <= 400),
  created_at timestamptz not null default now()
);
create index if not exists league_events_when on public.league_events (league_id, starts_at);
alter table public.league_events enable row level security;
drop policy if exists events_select on public.league_events;
create policy events_select on public.league_events for select to authenticated using (public.is_member(league_id));
drop policy if exists events_insert on public.league_events;
create policy events_insert on public.league_events for insert to authenticated with check (public.is_member(league_id) and created_by = auth.uid());
drop policy if exists events_delete on public.league_events;
create policy events_delete on public.league_events for delete to authenticated using (
  created_by = auth.uid() or exists (select 1 from public.league_members m where m.league_id = league_events.league_id and m.user_id = auth.uid() and m.role = 'owner'));
grant select, insert, delete on public.league_events to authenticated;
revoke all on public.league_events from anon;

-- ───────────── live shared games (anyone with the link can VIEW; only the owner can publish) ─────────────
create table if not exists public.shared_games (
  code text primary key,
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 60000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.shared_games enable row level security;
drop policy if exists shared_owner_all on public.shared_games;
create policy shared_owner_all on public.shared_games for all to authenticated using (owner = auth.uid()) with check (owner = auth.uid());
grant select, insert, update, delete on public.shared_games to authenticated;
revoke all on public.shared_games from anon;

create or replace function public.publish_game(p_code text, p_state jsonb, p_status text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := p_code;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_status not in ('in_progress', 'finished') then raise exception 'bad status'; end if;
  if c is not null then
    update public.shared_games set state = p_state, status = p_status, updated_at = now() where code = c and owner = me;
    if found then return c; end if;
  end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.shared_games (code, owner, status, state) values (c, me, p_status, p_state);
  -- keep at most 10 live links per user (drop the oldest)
  delete from public.shared_games where owner = me and code not in (select code from public.shared_games where owner = me order by updated_at desc limit 10);
  return c;
end $$;

create or replace function public.get_shared_game(p_code text)
returns table (status text, state jsonb, updated_at timestamptz, owner_name text)
language sql security definer stable set search_path = public as $$
  select s.status, s.state, s.updated_at, (select p.display_name from public.profiles p where p.id = s.owner)
  from public.shared_games s where s.code = lower(trim(p_code))
$$;

-- stale live links disappear after 30 days without updates
select cron.schedule('cleanup-shared-games', '41 3 * * *', $$ delete from public.shared_games where updated_at < now() - interval '30 days' $$);

-- ───────────── delete my account and data ─────────────
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from auth.users where id = auth.uid();   -- cascades: profile, memberships, rosters, live links; games stay (names only)
end $$;

-- ───────────── delete my cloud data (rosters + live game links; keeps account, league membership, played games) ─────────────
create or replace function public.delete_my_cloud_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.rosters where owner = auth.uid();
  delete from public.shared_games where owner = auth.uid();
end $$;
revoke execute on function public.delete_my_cloud_data() from public, anon;
grant execute on function public.delete_my_cloud_data() to authenticated;

-- ───────────── grants ─────────────
revoke execute on function public.submit_game(uuid, text, timestamptz, text, text, int, text, text, int, text, jsonb, int, uuid, jsonb, jsonb), public.confirm_game(uuid, boolean),
  public.publish_game(text, jsonb, text), public.delete_my_account() from public, anon;
grant execute on function public.submit_game(uuid, text, timestamptz, text, text, int, text, text, int, text, jsonb, int, uuid, jsonb, jsonb), public.confirm_game(uuid, boolean),
  public.publish_game(text, jsonb, text), public.delete_my_account() to authenticated;
grant execute on function public.get_shared_game(text) to anon, authenticated;

-- ───────────── league v4 ─────────────

-- one league per user (if someone already joined several, keep the oldest membership)
delete from public.league_members a using public.league_members b
  where a.user_id = b.user_id and (a.joined_at, a.league_id) > (b.joined_at, b.league_id);
create unique index if not exists league_members_one_per_user on public.league_members (user_id);

create or replace function public.create_league(p_name text) returns public.leagues
language plpgsql security definer set search_path = public as $$
declare l public.leagues;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if exists (select 1 from public.league_members where user_id = auth.uid()) then raise exception 'You are already in a league. Leave or disband it first.'; end if;
  insert into public.leagues (name, created_by) values (trim(p_name), auth.uid()) returning * into l;
  insert into public.league_members (league_id, user_id, role) values (l.id, auth.uid(), 'owner');
  return l;
end $$;

create or replace function public.join_league(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare lid uuid; cur uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into lid from public.leagues where invite_code = lower(trim(p_code));
  if lid is null then raise exception 'invalid invite code'; end if;
  select league_id into cur from public.league_members where user_id = auth.uid();
  if cur is not null and cur <> lid then raise exception 'You are already in another league. Leave it first to join this one.'; end if;
  insert into public.league_members (league_id, user_id) values (lid, auth.uid()) on conflict do nothing;
  return lid;
end $$;

-- owner closes the league (members, games, events and live links are deleted with it)
create or replace function public.disband_league(p_league uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.league_members where league_id = p_league and user_id = auth.uid() and role = 'owner') then raise exception 'only the owner can disband the league'; end if;
  delete from public.leagues where id = p_league;
end $$;

-- live games can belong to a league, so every member sees them
alter table public.shared_games add column if not exists league_id uuid references public.leagues(id) on delete cascade;
drop function if exists public.publish_game(text, jsonb, text);
create or replace function public.publish_game(p_code text, p_state jsonb, p_status text, p_league uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := p_code;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_status not in ('in_progress', 'finished') then raise exception 'bad status'; end if;
  if p_league is not null and not public.is_member(p_league) then raise exception 'not a member of this league'; end if;
  if c is not null then
    update public.shared_games set state = p_state, status = p_status, updated_at = now(), league_id = coalesce(p_league, league_id) where code = c and owner = me;
    if found then return c; end if;
  end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.shared_games (code, owner, status, state, league_id) values (c, me, p_status, p_state, p_league);
  delete from public.shared_games where owner = me and code not in (select code from public.shared_games where owner = me order by updated_at desc limit 10);
  return c;
end $$;

create or replace function public.league_live_games(p_league uuid)
returns table (code text, status text, state jsonb, updated_at timestamptz, owner_name text)
language sql security definer stable set search_path = public as $$
  select s.code, s.status, s.state, s.updated_at, (select p.display_name from public.profiles p where p.id = s.owner)
  from public.shared_games s
  where s.league_id = p_league and public.is_member(p_league) and s.updated_at > now() - interval '7 days'
  order by s.updated_at desc limit 10
$$;

revoke execute on function public.disband_league(uuid), public.publish_game(text, jsonb, text, uuid), public.league_live_games(uuid) from public, anon;
grant execute on function public.disband_league(uuid), public.publish_game(text, jsonb, text, uuid), public.league_live_games(uuid) to authenticated;
revoke execute on function public.create_league(text), public.join_league(text) from public, anon;
grant execute on function public.create_league(text), public.join_league(text) to authenticated;

-- ───────────── tournaments ─────────────
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  format text not null check (format in ('swiss', 'roundrobin', 'elimination')),
  rounds_total int not null check (rounds_total between 1 and 15),
  status text not null default 'registration' check (status in ('registration', 'running', 'finished')),
  current_round int not null default 0,
  notes text check (notes is null or char_length(notes) <= 400),
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists tournaments_league on public.tournaments (league_id, created_at desc);

create table if not exists public.tournament_players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,   -- null = guest added by the organizer
  name text not null check (char_length(name) between 1 and 40),
  faction text check (faction is null or char_length(faction) <= 60),
  dropped boolean not null default false,
  seed int not null default 0,
  created_at timestamptz not null default now(),
  unique (tournament_id, user_id)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round int not null check (round >= 1),
  table_no int not null check (table_no >= 1),
  p1 uuid not null references public.tournament_players(id) on delete cascade,
  p2 uuid references public.tournament_players(id) on delete cascade,        -- null = bye
  p1_vp int check (p1_vp between 0 and 200),
  p2_vp int check (p2_vp between 0 and 200),
  status text not null default 'pending' check (status in ('pending', 'reported', 'bye')),
  reported_by uuid references auth.users(id) on delete set null,
  reported_at timestamptz,
  unique (tournament_id, round, table_no)
);
create index if not exists tmatches_t on public.tournament_matches (tournament_id, round);

-- league of a tournament (for read policies)
create or replace function public.t_league(tid uuid) returns uuid
language sql security definer stable set search_path = public as $$ select league_id from public.tournaments where id = tid $$;

alter table public.tournaments enable row level security;
alter table public.tournament_players enable row level security;
alter table public.tournament_matches enable row level security;
drop policy if exists t_select on public.tournaments;
create policy t_select on public.tournaments for select to authenticated using (public.is_member(league_id));
drop policy if exists tp_select on public.tournament_players;
create policy tp_select on public.tournament_players for select to authenticated using (public.is_member(public.t_league(tournament_id)));
drop policy if exists tm_select on public.tournament_matches;
create policy tm_select on public.tournament_matches for select to authenticated using (public.is_member(public.t_league(tournament_id)));
grant select on public.tournaments, public.tournament_players, public.tournament_matches to authenticated;
revoke all on public.tournaments, public.tournament_players, public.tournament_matches from anon;
-- all writes go through the functions below

create or replace function public.t_is_organizer(tid uuid) returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.tournaments t where t.id = tid and (t.created_by = auth.uid()
    or exists (select 1 from public.league_members m where m.league_id = t.league_id and m.user_id = auth.uid() and m.role = 'owner')))
$$;

create or replace function public.create_tournament(p_league uuid, p_name text, p_format text, p_rounds int, p_notes text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare tid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.is_member(p_league) then raise exception 'not a member of this league'; end if;
  insert into public.tournaments (league_id, name, format, rounds_total, notes, created_by) values (p_league, trim(p_name), p_format, greatest(1, least(15, coalesce(p_rounds, 3))), p_notes, auth.uid()) returning id into tid;
  return tid;
end $$;

create or replace function public.join_tournament(p_tournament uuid, p_faction text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare t public.tournaments; pid uuid; nm text;
begin
  select * into t from public.tournaments where id = p_tournament;
  if t.id is null or not public.is_member(t.league_id) then raise exception 'tournament not found'; end if;
  if t.status <> 'registration' then raise exception 'registration is closed'; end if;
  select display_name into nm from public.profiles where id = auth.uid();
  insert into public.tournament_players (tournament_id, user_id, name, faction, seed) values (t.id, auth.uid(), coalesce(nm, 'player'), p_faction,
    (select coalesce(max(seed), 0) + 1 from public.tournament_players where tournament_id = t.id))
  on conflict (tournament_id, user_id) do update set faction = excluded.faction returning id into pid;
  return pid;
end $$;

create or replace function public.leave_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
declare t public.tournaments;
begin
  select * into t from public.tournaments where id = p_tournament;
  if t.id is null then raise exception 'tournament not found'; end if;
  if t.status = 'registration' then delete from public.tournament_players where tournament_id = t.id and user_id = auth.uid();
  elsif t.status = 'running' then update public.tournament_players set dropped = true where tournament_id = t.id and user_id = auth.uid();
  end if;
end $$;

create or replace function public.add_tournament_guest(p_tournament uuid, p_name text, p_faction text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare t public.tournaments; pid uuid;
begin
  select * into t from public.tournaments where id = p_tournament;
  if t.id is null or not public.t_is_organizer(t.id) then raise exception 'only the organizer can add players'; end if;
  if t.status <> 'registration' then raise exception 'registration is closed'; end if;
  insert into public.tournament_players (tournament_id, user_id, name, faction, seed) values (t.id, null, trim(p_name), p_faction,
    (select coalesce(max(seed), 0) + 1 from public.tournament_players where tournament_id = t.id)) returning id into pid;
  return pid;
end $$;

create or replace function public.remove_tournament_player(p_player uuid) returns void
language plpgsql security definer set search_path = public as $$
declare tp public.tournament_players; t public.tournaments;
begin
  select * into tp from public.tournament_players where id = p_player;
  if tp.id is null then raise exception 'player not found'; end if;
  select * into t from public.tournaments where id = tp.tournament_id;
  if not public.t_is_organizer(t.id) then raise exception 'only the organizer can remove players'; end if;
  if t.status = 'registration' then delete from public.tournament_players where id = p_player;
  elsif t.status = 'running' then update public.tournament_players set dropped = true where id = p_player;
  end if;
end $$;

-- p_pairings: [{"p1":"<player id>","p2":"<player id or null>","table":1}, ...] built by the app (Swiss / round robin / bracket)
create or replace function public.start_round(p_tournament uuid, p_pairings jsonb, p_rounds int default null) returns int
language plpgsql security definer set search_path = public as $$
declare t public.tournaments; r int; x jsonb; n int; open_matches int;
begin
  select * into t from public.tournaments where id = p_tournament for update;
  if t.id is null or not public.t_is_organizer(t.id) then raise exception 'only the organizer can start a round'; end if;
  if t.status = 'finished' then raise exception 'tournament is finished'; end if;
  if t.status = 'registration' then
    select count(*) into n from public.tournament_players where tournament_id = t.id and not dropped;
    if n < 2 then raise exception 'need at least 2 players'; end if;
    update public.tournaments set status = 'running', rounds_total = coalesce(greatest(1, least(15, p_rounds)), rounds_total) where id = t.id;
  else
    select count(*) into open_matches from public.tournament_matches where tournament_id = t.id and round = t.current_round and status = 'pending';
    if open_matches > 0 then raise exception 'finish reporting the current round first'; end if;
    if t.current_round >= t.rounds_total then raise exception 'all rounds are played'; end if;
  end if;
  r := t.current_round + 1;
  for x in select * from jsonb_array_elements(p_pairings) loop
    if not exists (select 1 from public.tournament_players where id = (x->>'p1')::uuid and tournament_id = t.id) then raise exception 'bad pairing'; end if;
    if nullif(x->>'p2', '') is not null and not exists (select 1 from public.tournament_players where id = (x->>'p2')::uuid and tournament_id = t.id) then raise exception 'bad pairing'; end if;
    insert into public.tournament_matches (tournament_id, round, table_no, p1, p2, status)
    values (t.id, r, (x->>'table')::int, (x->>'p1')::uuid, nullif(x->>'p2', '')::uuid, case when nullif(x->>'p2', '') is null then 'bye' else 'pending' end);
  end loop;
  update public.tournaments set current_round = r where id = t.id;
  return r;
end $$;

create or replace function public.report_match(p_match uuid, p_p1_vp int, p_p2_vp int) returns void
language plpgsql security definer set search_path = public as $$
declare m public.tournament_matches; t public.tournaments; org boolean; mine boolean;
begin
  select * into m from public.tournament_matches where id = p_match;
  if m.id is null then raise exception 'match not found'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status <> 'running' then raise exception 'tournament is not running'; end if;
  if m.status = 'bye' then raise exception 'bye matches have no result'; end if;
  org := public.t_is_organizer(t.id);
  mine := exists (select 1 from public.tournament_players where id in (m.p1, m.p2) and user_id = auth.uid());
  if not (org or (mine and m.status = 'pending')) then raise exception 'only the organizer can change a reported result'; end if;
  if t.format = 'elimination' and p_p1_vp = p_p2_vp then raise exception 'elimination games need a winner'; end if;
  update public.tournament_matches set p1_vp = p_p1_vp, p2_vp = p_p2_vp, status = 'reported', reported_by = auth.uid(), reported_at = now() where id = p_match;
end $$;

create or replace function public.finish_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.t_is_organizer(p_tournament) then raise exception 'only the organizer can finish the tournament'; end if;
  update public.tournaments set status = 'finished' where id = p_tournament and current_round >= 1;
end $$;

create or replace function public.delete_tournament(p_tournament uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.t_is_organizer(p_tournament) then raise exception 'only the organizer can delete the tournament'; end if;
  delete from public.tournaments where id = p_tournament;
end $$;

revoke execute on function public.t_league(uuid), public.t_is_organizer(uuid), public.create_tournament(uuid, text, text, int, text), public.join_tournament(uuid, text), public.leave_tournament(uuid),
  public.add_tournament_guest(uuid, text, text), public.remove_tournament_player(uuid), public.start_round(uuid, jsonb, int), public.report_match(uuid, int, int),
  public.finish_tournament(uuid), public.delete_tournament(uuid) from public, anon;
grant execute on function public.t_league(uuid), public.t_is_organizer(uuid), public.create_tournament(uuid, text, text, int, text), public.join_tournament(uuid, text), public.leave_tournament(uuid),
  public.add_tournament_guest(uuid, text, text), public.remove_tournament_player(uuid), public.start_round(uuid, jsonb, int), public.report_match(uuid, int, int),
  public.finish_tournament(uuid), public.delete_tournament(uuid) to authenticated;
-- Login with username OR email + password reset support.
-- Run once in Supabase SQL editor. (Password reset itself needs no SQL: set Auth -> URL Configuration -> Site URL to your site.)
-- PRIVACY NOTE: this lets anyone who knows a username look up that account's email (needed to log in by username).
-- Ambiguous (duplicate) usernames return null, so those users must log in with their email.
create or replace function public.login_email(p_name text)
returns text language sql security definer set search_path = public, auth as $$
  select case when count(*) = 1 then max(u.email) else null end
  from public.profiles p join auth.users u on u.id = p.id
  where lower(p.display_name) = lower(trim(p_name));
$$;
revoke all on function public.login_email(text) from public;
grant execute on function public.login_email(text) to anon, authenticated;

-- ═════════════════════════════════════════════════════════════════════════════
-- v6: blocked accounts · super-admin panel · live games with linked players, invitations and spectators
-- Safe to re-run. (Already included at the end of schema.sql.)
-- ═════════════════════════════════════════════════════════════════════════════

-- ───────────── blocked accounts ─────────────
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.profiles add column if not exists blocked_reason text;

-- a blocked account cannot create or change anything (even through the security-definer functions)
create or replace function public.deny_blocked() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and exists (select 1 from public.profiles where id = auth.uid() and blocked) then
    raise exception 'This account is blocked.';
  end if;
  return coalesce(new, old);
end $$;
do $$ declare t text; begin
  foreach t in array array['games', 'rosters', 'shared_games', 'league_members', 'league_events'] loop
    execute format('drop trigger if exists deny_blocked_trg on public.%I', t);
    execute format('create trigger deny_blocked_trg before insert or update on public.%I for each row execute function public.deny_blocked()', t);
  end loop;
end $$;

-- ───────────── admins (identified by confirmed e-mail; edit this table only in the SQL editor) ─────────────
create table if not exists public.app_admins (email text primary key);
insert into public.app_admins (email) values ('vicastellanosb@gmail.com') on conflict do nothing;
alter table public.app_admins enable row level security;            -- no policies: nobody can read it directly
revoke all on public.app_admins from anon, authenticated;

create or replace function public.is_admin() returns boolean
language sql security definer stable set search_path = public, auth as $$
  select auth.uid() is not null and exists (
    select 1 from auth.users u join public.app_admins a on lower(a.email) = lower(u.email)
    where u.id = auth.uid() and u.email_confirmed_at is not null);
$$;
create or replace function public.admin_guard() returns void language plpgsql security definer stable set search_path = public as $$
begin if not public.is_admin() then raise exception 'forbidden'; end if; end $$;

create table if not exists public.admin_log (id bigserial primary key, at timestamptz not null default now(), admin uuid, action text not null, target text, detail jsonb);
alter table public.admin_log enable row level security;
revoke all on public.admin_log from anon, authenticated;
create or replace function public.admin_audit(p_action text, p_target text, p_detail jsonb default null) returns void
language sql security definer set search_path = public as $$ insert into public.admin_log (admin, action, target, detail) values (auth.uid(), p_action, p_target, p_detail) $$;

-- overview numbers
create or replace function public.admin_overview() returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return jsonb_build_object(
    'users', (select count(*) from auth.users), 'users_24h', (select count(*) from auth.users where created_at > now() - interval '24 hours'),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'blocked', (select count(*) from public.profiles where blocked), 'leagues', (select count(*) from public.leagues),
    'games', (select count(*) from public.games), 'live', (select count(*) from public.shared_games where status = 'in_progress' and updated_at > now() - interval '1 day'),
    'rosters', (select count(*) from public.rosters), 'tournaments', (select count(*) from public.tournaments),
    'pending_invites', (select count(*) from public.shared_games where invite_status = 'pending'),
    'reports_new', (select count(*) from public.reports where status = 'new'));
end $$;

-- users (e-mail, last login, status, counts). Passwords are hashed by Supabase and cannot be read — use a reset link instead.
create or replace function public.admin_users(p_q text default null, p_limit int default 300) returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r order by (r->>'created_at') desc) from (
    select jsonb_build_object('id', u.id, 'email', u.email, 'name', p.display_name, 'created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at,
      'confirmed', u.email_confirmed_at is not null, 'banned', coalesce(u.banned_until > now(), false), 'blocked', coalesce(p.blocked, false), 'blocked_reason', p.blocked_reason,
      'league', (select l.name from public.league_members m join public.leagues l on l.id = m.league_id where m.user_id = u.id limit 1),
      'rosters', (select count(*) from public.rosters r where r.owner = u.id),
      'games', (select count(*) from public.games g where g.submitted_by = u.id or g.p1_user = u.id or g.p2_user = u.id),
      'live', (select count(*) from public.shared_games s where s.owner = u.id), 'is_admin', exists (select 1 from public.app_admins a where lower(a.email) = lower(u.email))) as r
    from auth.users u left join public.profiles p on p.id = u.id
    where p_q is null or p_q = '' or u.email ilike '%' || p_q || '%' or p.display_name ilike '%' || p_q || '%'
    order by u.created_at desc limit greatest(1, least(p_limit, 1000))) x), '[]'::jsonb);
end $$;

create or replace function public.admin_set_block(p_user uuid, p_block boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.admin_guard();
  if p_user = auth.uid() then raise exception 'You cannot block your own account.'; end if;
  if exists (select 1 from auth.users u join public.app_admins a on lower(a.email) = lower(u.email) where u.id = p_user) then raise exception 'Admin accounts cannot be blocked.'; end if;
  update public.profiles set blocked = p_block, blocked_reason = case when p_block then left(p_reason, 200) else null end where id = p_user;
  update auth.users set banned_until = case when p_block then 'infinity'::timestamptz else null end where id = p_user;   -- no new sign-ins / token refreshes
  if p_block then
    if to_regclass('auth.refresh_tokens') is not null then execute 'delete from auth.refresh_tokens where user_id = $1::text' using p_user::text; end if;
    if to_regclass('auth.sessions') is not null then execute 'delete from auth.sessions where user_id = $1' using p_user; end if;
  end if;
  perform public.admin_audit(case when p_block then 'block_user' else 'unblock_user' end, p_user::text, jsonb_build_object('reason', p_reason));
end $$;

create or replace function public.admin_delete_user(p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare em text;
begin
  perform public.admin_guard();
  if p_user = auth.uid() then raise exception 'You cannot delete your own account here.'; end if;
  select email into em from auth.users where id = p_user;
  if em is null then raise exception 'user not found'; end if;
  if exists (select 1 from public.app_admins where lower(email) = lower(em)) then raise exception 'Admin accounts cannot be deleted.'; end if;
  perform public.admin_audit('delete_user', p_user::text, jsonb_build_object('email', em));
  delete from auth.users where id = p_user;      -- cascades: profile, memberships, rosters, live links; played games stay (names only)
end $$;

create or replace function public.admin_leagues() returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'name', l.name, 'invite_code', l.invite_code, 'created_at', l.created_at,
      'owner', (select p.display_name from public.profiles p where p.id = l.created_by), 'members', (select count(*) from public.league_members m where m.league_id = l.id),
      'games', (select count(*) from public.games g where g.league_id = l.id), 'tournaments', (select count(*) from public.tournaments t where t.league_id = l.id),
      'member_list', (select coalesce(jsonb_agg(jsonb_build_object('id', m.user_id, 'name', p.display_name, 'role', m.role)), '[]'::jsonb) from public.league_members m left join public.profiles p on p.id = m.user_id where m.league_id = l.id))
      order by l.created_at desc) from public.leagues l), '[]'::jsonb);
end $$;
create or replace function public.admin_disband_league(p_league uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('disband_league', p_league::text, null); delete from public.leagues where id = p_league; end $$;
create or replace function public.admin_remove_member(p_league uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('remove_member', p_user::text, jsonb_build_object('league', p_league)); delete from public.league_members where league_id = p_league and user_id = p_user; end $$;

create or replace function public.admin_games(p_limit int default 200) returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r) from (
    select jsonb_build_object('id', g.id, 'league', (select l.name from public.leagues l where l.id = g.league_id), 'played_at', g.played_at, 'mission', g.mission,
      'p1', g.p1_name, 'p1_faction', g.p1_faction, 'p1_score', g.p1_score, 'p2', g.p2_name, 'p2_faction', g.p2_faction, 'p2_score', g.p2_score, 'status', g.status,
      'submitted_by', (select p.display_name from public.profiles p where p.id = g.submitted_by), 'p1_roster', g.p1_roster, 'p2_roster', g.p2_roster) as r
    from public.games g order by g.played_at desc limit greatest(1, least(p_limit, 1000))) x), '[]'::jsonb);
end $$;
create or replace function public.admin_delete_game(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('delete_game', p_game::text, null); delete from public.games where id = p_game; end $$;

create or replace function public.admin_live_games() returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r) from (
    select jsonb_build_object('code', s.code, 'status', s.status, 'updated_at', s.updated_at, 'created_at', s.created_at, 'version', s.version,
      'owner', (select p.display_name from public.profiles p where p.id = s.owner), 'owner_id', s.owner,
      'p2', (select p.display_name from public.profiles p where p.id = s.p2_user), 'invited', (select p.display_name from public.profiles p where p.id = s.invite_user), 'invite_status', s.invite_status,
      'league', (select l.name from public.leagues l where l.id = s.league_id), 'state', s.state, 'p2_roster', s.p2_roster) as r
    from public.shared_games s order by s.updated_at desc limit 200) x), '[]'::jsonb);
end $$;
create or replace function public.admin_delete_live(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('delete_live', p_code, null); delete from public.shared_games where code = p_code; end $$;

create or replace function public.admin_rosters(p_q text default null) returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r) from (
    select jsonb_build_object('id', r.id, 'owner', r.owner, 'email', u.email, 'owner_name', p.display_name, 'slot', r.slot, 'name', r.name, 'faction', r.faction,
      'points_limit', r.points_limit, 'units', r.units, 'detachments', r.detachments, 'updated_at', r.updated_at) as r
    from public.rosters r join auth.users u on u.id = r.owner left join public.profiles p on p.id = r.owner
    where p_q is null or p_q = '' or r.name ilike '%' || p_q || '%' or u.email ilike '%' || p_q || '%' or p.display_name ilike '%' || p_q || '%' or r.faction ilike '%' || p_q || '%'
    order by r.updated_at desc limit 300) x), '[]'::jsonb);
end $$;
create or replace function public.admin_delete_roster(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('delete_roster', p_id::text, null); delete from public.rosters where id = p_id; end $$;

create or replace function public.admin_tournaments() returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'format', t.format, 'status', t.status, 'league', (select l.name from public.leagues l where l.id = t.league_id),
    'players', (select count(*) from public.tournament_players tp where tp.tournament_id = t.id), 'created_at', t.created_at) order by t.created_at desc) from public.tournaments t), '[]'::jsonb);
end $$;
create or replace function public.admin_delete_tournament(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('delete_tournament', p_id::text, null); delete from public.tournaments where id = p_id; end $$;

create or replace function public.admin_log_list(p_limit int default 100) returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(jsonb_build_object('at', l.at, 'action', l.action, 'target', l.target, 'detail', l.detail)) from (select * from public.admin_log order by id desc limit least(p_limit, 500)) l), '[]'::jsonb);
end $$;

-- ───────────── live games v2: linked players, invitations, spectators ─────────────
alter table public.shared_games add column if not exists p2_user uuid references auth.users(id) on delete set null;
alter table public.shared_games add column if not exists invite_user uuid references auth.users(id) on delete set null;
alter table public.shared_games add column if not exists invite_status text not null default 'none';
alter table public.shared_games add column if not exists invite_at timestamptz;
alter table public.shared_games add column if not exists p2_roster jsonb;
alter table public.shared_games add column if not exists version int not null default 0;
alter table public.shared_games drop constraint if exists shared_games_invite_status_check;
alter table public.shared_games add constraint shared_games_invite_status_check check (invite_status in ('none', 'pending', 'accepted', 'declined', 'cancelled'));
alter table public.shared_games drop constraint if exists shared_games_p2_roster_check;
alter table public.shared_games add constraint shared_games_p2_roster_check check (p2_roster is null or (jsonb_typeof(p2_roster) = 'object' and pg_column_size(p2_roster) < 20000));
alter table public.shared_games drop constraint if exists shared_games_distinct_players;
alter table public.shared_games add constraint shared_games_distinct_players check (p2_user is null or p2_user <> owner);
create index if not exists shared_games_invite_user on public.shared_games (invite_user) where invite_status = 'pending';
create index if not exists shared_games_p2_user on public.shared_games (p2_user);

-- all writes go through the functions below (nobody can write link/player columns directly)
drop policy if exists shared_owner_all on public.shared_games;
drop policy if exists shared_owner_select on public.shared_games;
create policy shared_owner_select on public.shared_games for select to authenticated using (owner = auth.uid() or p2_user = auth.uid());
revoke insert, update, delete on public.shared_games from authenticated;
grant select on public.shared_games to authenticated;

-- when the league membership ends, the player link / invitation ends too (they stay a spectator through the link)
create or replace function public.live_unlink_member() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.shared_games set p2_user = null, p2_roster = null, version = version + 1, updated_at = now(), invite_status = 'none'
    where league_id = old.league_id and p2_user = old.user_id;
  update public.shared_games set invite_user = null, invite_status = 'cancelled' where league_id = old.league_id and invite_user = old.user_id and invite_status = 'pending';
  return old;
end $$;
drop trigger if exists live_unlink_member_trg on public.league_members;
create trigger live_unlink_member_trg after delete on public.league_members for each row execute function public.live_unlink_member();

-- owner publishes the whole game (as before) — but never overwrites the linked player's side
drop function if exists public.publish_game(text, jsonb, text, uuid);
create or replace function public.publish_game(p_code text, p_state jsonb, p_status text, p_league uuid default null) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); c text := p_code; g public.shared_games; st jsonb := p_state;
begin
  if me is null then raise exception 'not signed in'; end if;
  if p_status not in ('in_progress', 'finished') then raise exception 'bad status'; end if;
  if p_league is not null and not public.is_member(p_league) then raise exception 'not a member of this league'; end if;
  if c is not null then
    select * into g from public.shared_games where code = c and owner = me for update;
    if found then
      if g.status = 'finished' and p_status = 'in_progress' and g.p2_user is not null then raise exception 'this game is already finished'; end if;
      if g.p2_user is not null and g.status = 'in_progress' then   -- the linked player's own device controls their side
        st := jsonb_set(coalesce(p_state, '{}'::jsonb), '{p2}', coalesce(g.state->'p2', '{}'::jsonb));
        st := jsonb_set(st, '{m2}', coalesce(g.state->'m2', 'null'::jsonb));
      end if;
      update public.shared_games set state = st, status = p_status, updated_at = now(), version = version + 1, league_id = coalesce(p_league, league_id) where code = c;
      return c;
    end if;
  end if;
  c := substr(replace(gen_random_uuid()::text, '-', ''), 1, 10);
  insert into public.shared_games (code, owner, status, state, league_id) values (c, me, p_status, p_state, p_league);
  delete from public.shared_games where owner = me and code not in (select code from public.shared_games where owner = me order by updated_at desc limit 10);
  return c;
end $$;

-- owner invites a league member to play (the invitee must accept)
create or replace function public.live_invite(p_code text, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.shared_games;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from public.shared_games where code = lower(trim(p_code)) for update;
  if not found or g.owner <> auth.uid() then raise exception 'game not found'; end if;
  if g.status <> 'in_progress' then raise exception 'this game is already finished'; end if;
  if g.league_id is null then raise exception 'only league games can invite a player'; end if;
  if p_user = g.owner then raise exception 'you cannot invite yourself'; end if;
  if not exists (select 1 from public.league_members where league_id = g.league_id and user_id = p_user) then raise exception 'that player is not in your league'; end if;
  if exists (select 1 from public.profiles where id = p_user and blocked) then raise exception 'that account is not available'; end if;
  if g.p2_user is not null then raise exception 'this game already has a linked player — remove them first'; end if;
  if (select count(*) from public.shared_games where invite_user = p_user and invite_status = 'pending' and code <> g.code and invite_at > now() - interval '24 hours') >= 5 then
    raise exception 'that player already has too many pending invitations'; end if;
  update public.shared_games set invite_user = p_user, invite_status = 'pending', invite_at = now(), version = version + 1, updated_at = now() where code = g.code;
end $$;

create or replace function public.live_cancel_invite(p_code text) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.shared_games set invite_user = null, invite_status = 'cancelled', version = version + 1, updated_at = now()
    where code = lower(trim(p_code)) and owner = auth.uid() and invite_status = 'pending';
  if not found then raise exception 'no pending invitation'; end if;
end $$;

-- owner removes the linked player, or the player leaves: the game goes back to one device (everyone else stays a spectator)
create or replace function public.live_unlink(p_code text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.shared_games;
begin
  select * into g from public.shared_games where code = lower(trim(p_code)) for update;
  if not found or (g.owner <> auth.uid() and g.p2_user is distinct from auth.uid()) then raise exception 'game not found'; end if;
  update public.shared_games set p2_user = null, p2_roster = null, invite_status = 'none', invite_user = null, version = version + 1, updated_at = now() where code = g.code;
end $$;

create or replace function public.my_game_invites() returns jsonb
language plpgsql security definer stable set search_path = public as $$
begin
  if auth.uid() is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('code', s.code, 'from', (select p.display_name from public.profiles p where p.id = s.owner), 'from_id', s.owner,
      'league', (select l.name from public.leagues l where l.id = s.league_id), 'at', s.invite_at, 'p1', s.state->'p1'->>'name', 'p1_faction', s.state->'p1'->>'faction', 'round', s.state->'round') order by s.invite_at desc)
    from public.shared_games s
    where s.invite_user = auth.uid() and s.invite_status = 'pending' and s.status = 'in_progress' and s.invite_at > now() - interval '24 hours'
      and s.league_id is not null and public.is_member(s.league_id)), '[]'::jsonb);
end $$;

create or replace function public.live_respond(p_code text, p_accept boolean, p_roster jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.shared_games; me uuid := auth.uid(); dn text; st jsonb; p2 jsonb;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into g from public.shared_games where code = lower(trim(p_code)) for update;
  if not found or g.invite_user is distinct from me or g.invite_status <> 'pending' then raise exception 'this invitation is no longer available'; end if;
  if g.invite_at < now() - interval '24 hours' then
    update public.shared_games set invite_status = 'cancelled', invite_user = null where code = g.code; raise exception 'this invitation expired';
  end if;
  if g.status <> 'in_progress' then raise exception 'this game is already finished'; end if;
  if not p_accept then
    update public.shared_games set invite_status = 'declined', invite_user = null, version = version + 1, updated_at = now() where code = g.code;
    return jsonb_build_object('accepted', false);
  end if;
  if g.league_id is null or not exists (select 1 from public.league_members where league_id = g.league_id and user_id = me) then raise exception 'you are not in this league'; end if;
  if me = g.owner then raise exception 'you cannot play yourself'; end if;
  if (select count(*) from public.shared_games where p2_user = me and status = 'in_progress' and updated_at > now() - interval '24 hours') >= 3 then raise exception 'you are already playing 3 live games'; end if;
  if p_roster is not null and (jsonb_typeof(p_roster) <> 'object' or pg_column_size(p_roster) >= 20000) then raise exception 'roster is too large'; end if;
  select coalesce(p.display_name, 'Player 2') into dn from public.profiles p where p.id = me;
  p2 := coalesce(g.state->'p2', '{}'::jsonb) || jsonb_build_object('name', upper(dn), 'linkedUser', me::text);
  if p_roster is not null and p_roster ? 'faction' then p2 := p2 || jsonb_build_object('faction', p_roster->>'faction'); end if;
  st := jsonb_set(coalesce(g.state, '{}'::jsonb), '{p2}', p2);
  update public.shared_games set p2_user = me, p2_roster = p_roster, invite_status = 'accepted', state = st, version = version + 1, updated_at = now() where code = g.code;
  return jsonb_build_object('accepted', true, 'code', g.code);
end $$;

-- a linked player or the owner pushes THEIR side (the other side belongs to the other device)
create or replace function public.live_push(p_code text, p_side int, p_patch jsonb, p_shared jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.shared_games; me uuid := auth.uid(); st jsonb; key text; allowed text[]; shared jsonb := '{}'::jsonb;
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into g from public.shared_games where code = lower(trim(p_code)) for update;
  if not found then raise exception 'game not found'; end if;
  if g.status <> 'in_progress' then raise exception 'game finished'; end if;
  if me = g.owner then allowed := case when g.p2_user is null then array['round', 'started', 'm1', 'm2', 'v'] else array['round', 'started', 'm1', 'v'] end;
  elsif me = g.p2_user then allowed := array['m2'];
  else raise exception 'you are not a player in this game'; end if;
  if p_patch is not null and (jsonb_typeof(p_patch) <> 'object' or pg_column_size(p_patch) >= 30000) then raise exception 'bad patch'; end if;
  st := coalesce(g.state, '{}'::jsonb);
  if p_patch is not null then
    if p_side = 1 and me = g.owner then st := jsonb_set(st, '{p1}', coalesce(st->'p1', '{}'::jsonb) || (p_patch - 'linkedUser'));
    elsif p_side = 2 and me = g.p2_user then st := jsonb_set(st, '{p2}', coalesce(st->'p2', '{}'::jsonb) || (p_patch - 'linkedUser'));
    elsif p_side = 2 and me = g.owner and g.p2_user is null then st := jsonb_set(st, '{p2}', coalesce(st->'p2', '{}'::jsonb) || (p_patch - 'linkedUser'));
    else raise exception 'that side is controlled by the other player''s device'; end if;
  end if;
  if p_shared is not null then
    if jsonb_typeof(p_shared) <> 'object' then raise exception 'bad shared data'; end if;
    for key in select jsonb_object_keys(p_shared) loop
      if key = any(allowed) then shared := shared || jsonb_build_object(key, p_shared->key); end if;
    end loop;
    st := st || shared;
  end if;
  update public.shared_games set state = st, version = version + 1, updated_at = now() where code = g.code;
  return jsonb_build_object('version', g.version + 1);
end $$;

-- anyone with the code can watch; players get their role and the linked player's roster is only shown to participants and league members
create or replace function public.live_get(p_code text) returns jsonb
language plpgsql security definer stable set search_path = public as $$
declare g public.shared_games; me uuid := auth.uid(); role text := 'spectator';
begin
  select * into g from public.shared_games where code = lower(trim(p_code));
  if not found then return null; end if;
  if me is not null and me = g.owner then role := 'owner'; elsif me is not null and me = g.p2_user then role := 'p2'; end if;
  return jsonb_build_object('status', g.status, 'state', g.state, 'version', g.version, 'updated_at', g.updated_at, 'league_id', g.league_id,
    'owner_id', g.owner, 'owner_name', (select p.display_name from public.profiles p where p.id = g.owner),
    'p2_user', g.p2_user, 'p2_name', (select p.display_name from public.profiles p where p.id = g.p2_user), 'invite_status', g.invite_status,
    'invite_user', case when role = 'owner' then g.invite_user end, 'invite_name', case when role = 'owner' then (select p.display_name from public.profiles p where p.id = g.invite_user) end,
    'role', role,
    'p2_roster', case when role in ('owner', 'p2') or (me is not null and g.league_id is not null and public.is_member(g.league_id)) then g.p2_roster end);
end $$;

-- grants
revoke execute on function public.live_invite(text, uuid), public.live_cancel_invite(text), public.live_unlink(text), public.my_game_invites(), public.live_respond(text, boolean, jsonb), public.live_push(text, int, jsonb, jsonb), public.publish_game(text, jsonb, text, uuid) from public, anon;
grant execute on function public.live_invite(text, uuid), public.live_cancel_invite(text), public.live_unlink(text), public.my_game_invites(), public.live_respond(text, boolean, jsonb), public.live_push(text, int, jsonb, jsonb), public.publish_game(text, jsonb, text, uuid) to authenticated;
grant execute on function public.live_get(text) to anon, authenticated;
revoke execute on function public.is_admin(), public.admin_guard(), public.admin_audit(text, text, jsonb), public.admin_overview(), public.admin_users(text, int), public.admin_set_block(uuid, boolean, text), public.admin_delete_user(uuid),
  public.admin_leagues(), public.admin_disband_league(uuid), public.admin_remove_member(uuid, uuid), public.admin_games(int), public.admin_delete_game(uuid), public.admin_live_games(), public.admin_delete_live(text),
  public.admin_rosters(text), public.admin_delete_roster(uuid), public.admin_tournaments(), public.admin_delete_tournament(uuid), public.admin_log_list(int) from public, anon;
grant execute on function public.is_admin(), public.admin_overview(), public.admin_users(text, int), public.admin_set_block(uuid, boolean, text), public.admin_delete_user(uuid),
  public.admin_leagues(), public.admin_disband_league(uuid), public.admin_remove_member(uuid, uuid), public.admin_games(int), public.admin_delete_game(uuid), public.admin_live_games(), public.admin_delete_live(text),
  public.admin_rosters(text), public.admin_delete_roster(uuid), public.admin_tournaments(), public.admin_delete_tournament(uuid), public.admin_log_list(int) to authenticated;

-- ============================================================================
-- v7: bug reports & suggestions (burger menu -> "Report a bug / suggest an idea"); read by the admin panel only
-- ============================================================================
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  kind text not null check (kind in ('bug', 'idea')),
  message text not null check (char_length(message) between 3 and 4000),
  contact text check (contact is null or char_length(contact) <= 200),
  image text check (image is null or char_length(image) <= 900000),      -- one small screenshot, stored as a data URL (the app shrinks it first)
  page text, app_version text, user_agent text, extra jsonb,
  status text not null default 'new' check (status in ('new', 'seen', 'done'))
);
create index if not exists reports_created_idx on public.reports (created_at desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;     -- no direct access at all: only the functions below

create or replace function public.submit_report(p_kind text, p_message text, p_image text default null, p_contact text default null, p_meta jsonb default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); msg text := btrim(coalesce(p_message, '')); n int; new_id uuid;
begin
  if me is not null and exists (select 1 from public.profiles where id = me and blocked) then raise exception 'This account is blocked.'; end if;
  if p_kind not in ('bug', 'idea') then raise exception 'Choose bug or idea.'; end if;
  if char_length(msg) < 3 then raise exception 'Please write a short description.'; end if;
  if char_length(msg) > 4000 then raise exception 'That message is too long (4000 characters max).'; end if;
  if p_image is not null and p_image !~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$' then raise exception 'Unsupported image.'; end if;
  if p_image is not null and char_length(p_image) > 900000 then raise exception 'The image is too large.'; end if;
  -- flood control: 10 per hour per signed-in user, 40 per hour for everyone not signed in
  if me is not null then select count(*) into n from public.reports where user_id = me and created_at > now() - interval '1 hour'; if n >= 10 then raise exception 'You sent a lot of reports — please try again later.'; end if;
  else select count(*) into n from public.reports where user_id is null and created_at > now() - interval '1 hour'; if n >= 40 then raise exception 'Too many reports right now — please try again later.'; end if; end if;
  insert into public.reports (user_id, kind, message, contact, image, page, app_version, user_agent, extra)
  values (me, p_kind, msg, nullif(left(btrim(coalesce(p_contact, '')), 200), ''), p_image, left(p_meta->>'page', 200), left(p_meta->>'v', 40), left(p_meta->>'ua', 300), case when p_meta is null then null else p_meta - 'page' - 'v' - 'ua' end)
  returning id into new_id;
  return jsonb_build_object('id', new_id);
end $$;

create or replace function public.admin_reports(p_status text default null, p_limit int default 200) returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r order by (r->>'created_at') desc) from (
    select jsonb_build_object('id', x.id, 'created_at', x.created_at, 'kind', x.kind, 'message', x.message, 'contact', x.contact, 'has_image', x.image is not null,
      'page', x.page, 'app_version', x.app_version, 'user_agent', x.user_agent, 'extra', x.extra, 'status', x.status,
      'user_id', x.user_id, 'name', (select p.display_name from public.profiles p where p.id = x.user_id), 'email', (select u.email from auth.users u where u.id = x.user_id)) as r
    from public.reports x where p_status is null or p_status = '' or x.status = p_status
    order by x.created_at desc limit greatest(1, least(p_limit, 500))) q), '[]'::jsonb);
end $$;
create or replace function public.admin_report_image(p_id uuid) returns text
language plpgsql security definer stable set search_path = public as $$
begin perform public.admin_guard(); return (select image from public.reports where id = p_id); end $$;
create or replace function public.admin_report_set(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.admin_guard();
  if p_status not in ('new', 'seen', 'done') then raise exception 'bad status'; end if;
  update public.reports set status = p_status where id = p_id;
  perform public.admin_audit('report_' || p_status, p_id::text, null);
end $$;
create or replace function public.admin_report_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin perform public.admin_guard(); perform public.admin_audit('delete_report', p_id::text, null); delete from public.reports where id = p_id; end $$;

revoke execute on function public.submit_report(text, text, text, text, jsonb), public.admin_reports(text, int), public.admin_report_image(uuid), public.admin_report_set(uuid, text), public.admin_report_delete(uuid) from public, anon, authenticated;
grant execute on function public.submit_report(text, text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_reports(text, int), public.admin_report_image(uuid), public.admin_report_set(uuid, text), public.admin_report_delete(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- v8: shared live games without an account ("Share live game" codes, links ?live= / ?obs=), kept 90 days
-- Safe to re-run. (Also appended to the end of schema.sql.)
--   • Anyone with the code can READ the game (spectator link), even after it ended, for 90 days after the last change.
--   • Only devices that hold the game's secret key can WRITE it: the host and players who opened the player link
--     (the key travels only in the player link, never to spectators). The table is stored as a hash of the key.
--   • Every save carries a revision; an older or equal one never overwrites a newer game.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

create table if not exists public.live_rooms (
  code text primary key check (code ~ '^[A-Z0-9]{5}$'),
  key_hash text not null,
  state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) < 300000),
  rev bigint not null default 0,
  finished boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days'
);
create index if not exists live_rooms_updated_idx on public.live_rooms (updated_at desc);
alter table public.live_rooms enable row level security;          -- no policies: only through the functions below
revoke all on public.live_rooms from anon, authenticated;

-- save (create on first save). Returns the revision now stored.
create or replace function public.live_room_save(p_code text, p_key text, p_state jsonb, p_rev bigint, p_finished boolean default false)
returns bigint language plpgsql security definer set search_path = public as $$
declare c text := upper(trim(p_code)); h text; r public.live_rooms;
begin
  if c is null or c !~ '^[A-Z0-9]{5}$' then raise exception 'bad code'; end if;
  if p_key is null or length(p_key) < 12 or length(p_key) > 64 then raise exception 'bad key'; end if;
  if p_state is null or jsonb_typeof(p_state) <> 'object' then raise exception 'bad state'; end if;
  h := encode(sha256(convert_to(p_key, 'UTF8')), 'hex');
  select * into r from public.live_rooms where code = c for update;
  if not found or r.expires_at < now() then
    if not found and (select count(*) from public.live_rooms where created_at > now() - interval '1 hour') >= 300 then
      raise exception 'too many new games right now, try again later';
    end if;
    insert into public.live_rooms as t (code, key_hash, state, rev, finished) values (c, h, p_state, coalesce(p_rev, 0), coalesce(p_finished, false))
      on conflict (code) do update set key_hash = excluded.key_hash, state = excluded.state, rev = excluded.rev, finished = excluded.finished,
        created_at = now(), updated_at = now(), expires_at = now() + interval '90 days';
    return coalesce(p_rev, 0);
  end if;
  if r.key_hash <> h then raise exception 'not allowed'; end if;
  if coalesce(p_rev, 0) <= r.rev then return r.rev; end if;        -- older or the same: keep what is stored
  update public.live_rooms set state = p_state, rev = p_rev, finished = r.finished or coalesce(p_finished, false),
    updated_at = now(), expires_at = now() + interval '90 days' where code = c;
  return p_rev;
end $$;

-- read (spectators, players, anyone with the code)
create or replace function public.live_room_get(p_code text) returns jsonb
language sql security definer stable set search_path = public as $$
  select jsonb_build_object('code', code, 'state', state, 'rev', rev, 'finished', finished, 'created_at', created_at, 'updated_at', updated_at, 'expires_at', expires_at)
  from public.live_rooms where code = upper(trim(p_code)) and expires_at > now()
$$;

revoke execute on function public.live_room_save(text, text, jsonb, bigint, boolean), public.live_room_get(text) from public;
grant execute on function public.live_room_save(text, text, jsonb, bigint, boolean), public.live_room_get(text) to anon, authenticated;

-- admin panel: list them, and let "Delete" remove them too
create or replace function public.admin_live_rooms() returns jsonb
language plpgsql security definer stable set search_path = public, auth as $$
begin
  perform public.admin_guard();
  return coalesce((select jsonb_agg(r) from (
    select jsonb_build_object('code', code, 'state', state, 'rev', rev, 'finished', finished, 'created_at', created_at, 'updated_at', updated_at, 'expires_at', expires_at) as r
    from public.live_rooms order by updated_at desc limit 300) x), '[]'::jsonb);
end $$;
create or replace function public.admin_delete_live(p_code text) returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  perform public.admin_guard(); perform public.admin_audit('delete_live', p_code, null);
  delete from public.shared_games where code = p_code;
  delete from public.live_rooms where code = upper(p_code);
end $$;
revoke execute on function public.admin_live_rooms() from public, anon;
grant execute on function public.admin_live_rooms() to authenticated;

-- games are kept 90 days after their last change
select cron.unschedule('cleanup-live-rooms') where exists (select 1 from cron.job where jobname = 'cleanup-live-rooms');
select cron.schedule('cleanup-live-rooms', '47 3 * * *', $$ delete from public.live_rooms where expires_at < now() $$);

-- ═══════════════════════════════════════════════════════════════════════════════════════════════
-- v9: tournament games spread over weeks ("like a season"): each match gets a date and the points for that game
-- (e.g. 1400–1600, whatever the two players agree on). Safe to re-run. (Also appended to the end of schema.sql.)
--   • The two players of a match, or the organizer, can set or change the date and the points.
--   • Bye matches have neither.
-- ═══════════════════════════════════════════════════════════════════════════════════════════════

alter table public.tournament_matches add column if not exists scheduled_on date;
alter table public.tournament_matches add column if not exists points int;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tournament_matches_points_check') then
    alter table public.tournament_matches add constraint tournament_matches_points_check check (points is null or points between 500 and 3000);
  end if;
end $$;

create or replace function public.plan_match(p_match uuid, p_date date, p_points int) returns void
language plpgsql security definer set search_path = public as $$
declare m public.tournament_matches; t public.tournaments; org boolean; mine boolean;
begin
  select * into m from public.tournament_matches where id = p_match;
  if m.id is null then raise exception 'match not found'; end if;
  select * into t from public.tournaments where id = m.tournament_id;
  if t.status = 'finished' then raise exception 'the tournament has finished'; end if;
  if m.status = 'bye' then raise exception 'a bye has no game to plan'; end if;
  if p_points is not null and (p_points < 500 or p_points > 3000) then raise exception 'points must be between 500 and 3000'; end if;
  org := public.t_is_organizer(t.id);
  mine := exists (select 1 from public.tournament_players where id in (m.p1, m.p2) and user_id = auth.uid());
  if not (org or mine) then raise exception 'only the two players or the organizer can plan this game'; end if;
  update public.tournament_matches set scheduled_on = p_date, points = p_points where id = p_match;
end $$;

revoke execute on function public.plan_match(uuid, date, int) from public, anon;
grant execute on function public.plan_match(uuid, date, int) to authenticated;
