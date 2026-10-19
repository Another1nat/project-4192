-- Cloud rosters: each user can keep at most 2 (two fixed slots). Paste into Supabase → SQL Editor → Run. Safe to re-run.
create table if not exists public.rosters (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slot smallint not null check (slot in (1, 2)),                 -- only 2 slots exist → hard limit of 2 per user
  name text not null check (char_length(name) between 1 and 60),
  faction text not null check (char_length(faction) between 1 and 60),
  points_limit int not null check (points_limit between 0 and 10000),
  detachments jsonb not null default '[]' check (jsonb_typeof(detachments) = 'array'),
  units jsonb not null check (jsonb_typeof(units) = 'array' and jsonb_array_length(units) <= 80 and pg_column_size(units) < 20000),  -- [[datasheetId, name, pts, count], ...]
  updated_at timestamptz not null default now(),
  unique (owner, slot)
);

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
