-- League v2: invite preview + member list. Paste into Supabase → SQL Editor → Run. Safe to re-run.

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
