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
