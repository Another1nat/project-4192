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
