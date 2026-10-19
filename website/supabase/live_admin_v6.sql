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
insert into public.app_admins (email) values ('YOUR-EMAIL@example.com') on conflict do nothing;
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
    'pending_invites', (select count(*) from public.shared_games where invite_status = 'pending'));
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
