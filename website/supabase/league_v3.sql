-- League v3: two-player confirmation, accounts linked to games, rosters on games, calendar,
-- live shared games (link anyone can open), delete-my-account. Paste into Supabase → SQL Editor → Run. Safe to re-run.

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

-- ───────────── grants ─────────────
revoke execute on function public.submit_game(uuid, text, timestamptz, text, text, int, text, text, int, text, jsonb, int, uuid, jsonb, jsonb), public.confirm_game(uuid, boolean),
  public.publish_game(text, jsonb, text), public.delete_my_account() from public, anon;
grant execute on function public.submit_game(uuid, text, timestamptz, text, text, int, text, text, int, text, jsonb, int, uuid, jsonb, jsonb), public.confirm_game(uuid, boolean),
  public.publish_game(text, jsonb, text), public.delete_my_account() to authenticated;
grant execute on function public.get_shared_game(text) to anon, authenticated;
