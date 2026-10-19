-- Tournaments (inside a league): Swiss, round robin or single elimination.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run. (schema.sql already contains it.)

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
