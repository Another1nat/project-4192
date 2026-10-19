# Project 4192 — website

A ready-to-fill companion web app for a tabletop game: army builder with points, datasheets, live game
tracker, rules and missions pages, league, live sync between phones, and streaming (camera + OBS overlay +
spectator page). Works offline and installs on phones.

It contains **no game content**: only small EXAMPLE data that shows where yours goes.

## 1. Name it

```bash
python3 scripts/rename_game.py "Your Real Name"
```
Then replace the icons in `assets/icons/` with your logo (same file names and sizes).

## 2. Run it on your computer

```bash
python3 -m http.server 8080
```
Open http://localhost:8080 (a phone on the same Wi-Fi can open http://<your-computer-ip>:8080).

## 3. Add your game

See **[data/SCHEMA.md](data/SCHEMA.md)** for the exact format of factions, units (datasheets), detachments,
enhancements, tactics, missions and core rules. Start by copying `data/factions/Example Faction.json`.

| What | File |
| :--- | :--- |
| Factions (name, colour, banner) | `app.js` → `const FACTIONS` |
| Units, weapons, points, faction rules, detachments | `data/factions/<Faction name>.json` |
| Mission types, primary mission grid, secondaries, core rules | `gdm_data.js` |
| Mission card text | `mission_text.js` (+ `mission_text_es.js`) |
| Spanish text | `i18n.js`, `rules_es.js`, `detachment_rules_es.js` |
| Faction banners / logo | `assets/banners/`, `assets/icons/` |

## 4. Online features: live games, streaming, league, accounts

These need a free Supabase project of **your own**:
1. Create a project at supabase.com and run the SQL files in `supabase/` (see `supabase/README.md`).
2. In the SQL, replace `YOUR-EMAIL@example.com` with your e-mail (that account sees the Admin panel).
3. Put the project URL and its publishable key in `league_config.js`.

Until then `LEAGUE_CONFIG` is `null` and the app works fully offline (rosters, datasheets, game tracker).

| Feature | Files |
| :--- | :--- |
| Live game sync between phones | `live_sync.js`, `live.js` |
| Camera stream + OBS overlay | `broadcast_studio.js`, `overlay.html` |
| Spectator page | `watch.html` |
| League, accounts, cloud saves | `league.js`, `tournament.js`, `admin.js` |

## 5. Deploy (Cloudflare Workers)

```bash
npx wrangler deploy
```
`wrangler.jsonc` deploys as `project-4192` (renamed by the script). The build runs
`node scripts/predeploy_check.js --stamp`, which stops the deploy if a file is broken or a faction in
`FACTIONS` has no data file.

## 6. Tests

```bash
python3 tests/smoke.py
```
Needs `pip install playwright && playwright install chromium`.

## Rules the app still assumes (change them to your game's)

- **Game tracker:** rounds, command points, primary + secondary scoring per round, mission type picked in setup.
- **Unit calculator (`calc.js`):** hit → wound → save → damage dice maths with the weapon keywords it knows.
- **Army check (`army_check.js`):** points limit, detachment points, copies of a unit, enhancements on characters.
- **Words in the UI:** detachment, stratagem, enhancement, CP… rename them in the text when your terms are final.
- **Terrain layouts / AR:** pages work but have no layouts (`data/ar_index.json`, `assets/ar/`, `assets/layouts_svg/`).
