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
