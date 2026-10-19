-- League v4: one league per user, owner can disband, league games shown live to members.
-- Paste into Supabase → SQL Editor → Run. Safe to re-run.

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
