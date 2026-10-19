# League backend setup (Supabase free tier — no card, nothing to host)

Everything runs in the cloud: the database on Supabase, the 5-day keep-alive on GitHub Actions, the 60-day cleanup inside Supabase (pg_cron). Your computer can be off.

## 1. Create the project (≈5 min)
1. Go to <https://supabase.com> → **Start your project** → sign in with GitHub (no card asked on the free plan).
2. **New project**: any name (e.g. `project-4192`), pick a region near you, set a database password (save it somewhere), plan **Free**.
3. **Authentication → Providers → Email**: turn **OFF "Confirm email"** (so friends can sign up with email + password without waiting for emails; the free email sender is heavily rate-limited).
4. **SQL Editor → New query** → paste all of `supabase/schema.sql` → **Run**. (Safe to re-run later. It also schedules the daily 60-day cleanup.)
5. **Project Settings → API**: copy the **Project URL** and the **anon public** key.

## 2. Connect the site
Edit `league_config.js` in the repo root:
```js
window.LEAGUE_CONFIG = { url: 'https://xxxx.supabase.co', anonKey: 'eyJ...' };
```
The anon key is public by design (row-level security protects the data). **Never** paste the `service_role` key anywhere in this repo.
Commit + push; Cloudflare redeploys. Open the site → menu → **League**.

## 3. Keep-alive (stops free-tier pausing after 7 idle days)
GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:
- `SUPABASE_URL` = the Project URL
- `SUPABASE_ANON_KEY` = the anon public key

Then **Actions → supabase-keepalive → Run workflow** once to confirm it's green. After that it runs on days 1, 6, 11, 16, 21, 26, 31 of every month (gaps ≤ 6 days).

## 4. Using it
- Create an account (display name + email + password), **CREATE LEAGUE**, share the invite link (WhatsApp button included).
- After finishing a game in the Game Tracker, press **SEND TO LEAGUE** on it in the history list.
- Leaderboard: 3 points per win, 1 per draw. Games older than 60 days are folded into per-player totals (`archive_stats`) and the detailed rows are deleted — the ranking never changes, the free database stays small. Check the job in **Database → Cron** (`archive-old-games`).

## Free-tier limits to know (verify on supabase.com/pricing — they change)
~500 MB database, 50k monthly users, 2 free projects, email sender rate-limited (hence password sign-up).

## Known prototype limits
Players on the leaderboard are matched by the name typed in the tracker (case-insensitive), not by account; there is no two-player result confirmation yet.


## Updates (run these in the SQL Editor, in this order, if you set the project up before they existed)
1. `rosters.sql` — cloud rosters (2 per user)
2. `league_v2.sql` — invite preview + member list
3. `league_v3.sql` — two-player confirmation, accounts linked to games, rosters on games, league calendar, live shared games (viewable by link), delete-my-account

4. `league_v4.sql` — one league per user, owner can disband, league games shown live to members
5. `tournaments.sql` — tournaments (Swiss / round robin / elimination) inside a league

All are safe to re-run. `schema.sql` already contains all of them, so a brand-new project only needs `schema.sql`.

### How the pieces fit
- **Sending a game:** the sender picks which side they played and the opponent. An opponent who is a league member must confirm (it shows as ⏳ until then and does NOT count); a guest without an account counts immediately. Rejected games never count and can be deleted and re-sent.
- **Live links:** the owner needs an account to publish; anyone with the link can watch (read-only) without one. Links stop updating when the game ends and expire after 30 days idle (daily job `cleanup-shared-games`).
- **Delete my account:** removes login, memberships, cloud rosters and live links. Games stay in rankings under the typed names.

## v6 — admin panel, blocked accounts, live games with linked players
Run the whole `schema.sql` again (it is safe to re-run). It adds:
- **Admin panel** (menu → Admin, only for the e-mail in the `app_admins` table — `YOUR-EMAIL@example.com` by default; add another admin in the SQL editor with `insert into public.app_admins values ('x@y.com');`). The panel can list users (e-mail, last sign-in), send password-reset links, block/unblock or delete accounts, and see/delete leagues, games, live games, cloud rosters and tournaments. Every action is written to `admin_log`. Passwords cannot be read — Supabase only stores hashes.
- **Blocked accounts**: a blocked account cannot sign in and cannot create/change games, rosters, memberships or events.
- **Live games v2**: the host can invite a league member to play Player 2 on their own phone (they accept and pick an army list); each device writes only its own side; everyone else with the link or in the league is a spectator. Invitations last 24 h, a player can have 5 pending invitations and be in 3 live games, leaving the league ends the link.

## v7 — bug reports & suggestions
Run the whole `schema.sql` again (safe to re-run). It adds the `reports` table (no direct access — only the functions below), `submit_report` (anyone, with flood limits: 10/hour per signed-in user, 40/hour for visitors; blocked accounts refused), and the admin-only `admin_reports`, `admin_report_image`, `admin_report_set`, `admin_report_delete`. Screenshots are shrunk in the browser (≤ ~600 KB) and stored as a data URL in the row. The admin panel gets a **Reports** tab and a "new reports" counter.

## v8 — shared live games saved for 90 days (no account needed)
Run `supabase/live_rooms_v8.sql` in the SQL Editor (safe to re-run; also at the end of `schema.sql`). It adds `live_rooms`
(no direct access) with `live_room_save` / `live_room_get` (anyone) and `admin_live_rooms` (admin). A game shared with
**Share live game** is then saved on every change and stays viewable by its spectator link for 90 days after the last change,
even when nobody has the app open. Only the host and players who opened the player link can change it (the key is in the
player link only). Until this is run, live games still work phone-to-phone, they just are not saved.

## v9 — tournament games over several weeks
Run `supabase/tournament_plan_v9.sql` in the SQL Editor (safe to re-run; also at the end of `schema.sql`). Each tournament
match gets a date and the points for that game; the two players or the organizer set them (`plan_match`). Until it is run,
the tournament screen works as before, without dates and points.
