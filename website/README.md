# Iron & Wrath — website

The companion web app for **Iron & Wrath** (Project Codex: 4192 AD): army builder with points,
datasheets, live game tracker, rules and missions pages, league and live streaming tools.

It is a copy of the the original companion app app (design, layout, game tracker, live sync, offline/PWA) made on
2026-10-18 **without any other wargames content**: no datasheets, points, detachments, missions, faction
art, mission cards, terrain layouts, rules text or sci-fi wargames PDFs. What is left is the app plus small
EXAMPLE data that shows where your game's data goes. Your game design lives in `../gametheory/`.

## Run it on your computer

```bash
cd /Volumes/MacSSD/game/website
python3 -m http.server 8080
```
Then open http://localhost:8080 (a phone on the same Wi-Fi can open http://<your-mac-ip>:8080).

## Where your game's data goes

| What | File | Notes |
| :--- | :--- | :--- |
| Factions (name, group, colour, banner) | `app.js` → `const FACTIONS` | The whole UI takes on the faction colour. Banners go in `assets/banners/`. |
| Units, weapons, points, faction rule, detachments, enhancements, tactics | `data/factions/<Faction name>.json` | See `data/factions/Example Faction.json`: `rules`, `detachments` (rules, enhancements, stratagems), `datasheets` (stats, weapons, abilities, keywords, compositions = unit sizes + points, `leads` / `ledBy` for leaders). Stats are free-form: any keys you put in `stats` are shown. |
| Mission types + primary mission grid + core rules | `gdm_data.js` | `factions` = mission types picked in game setup, `matrix[mine][theirs]` = primary mission, `rules` = Core Rules page. |
| Mission card text | `mission_text.js` (+ `mission_text_es.js` for Spanish) | `MISSION_TEXT.primary[name]`, `MISSION_TEXT.secondary[name]`. |
| Points overrides (optional) | `mfm_overrides.js` | Unit name → `{ basePts, comp, options:[{comp, pts}] }`. Leave empty to use the points in the faction files. |
| Spanish translations | `i18n.js`, `rules_es.js`, `detachment_rules_es.js` | |
| Logo / icons | `assets/icons/` | Placeholder "I&W" icons: replace with your logo (same file names and sizes). |

## Online features (live games, league, cloud saves)

Off until you connect your **own** Supabase project: create one, run the SQL files in `supabase/`,
then put its URL and publishable key in `league_config.js`. Never use the original companion app's project.

## Deploy (Cloudflare Workers, like the original companion app)

`wrangler.jsonc` deploys as **`iron-and-wrath`** (not `battlelist`, so it can never overwrite the original companion app).
The build runs `node scripts/predeploy_check.js --stamp`, which blocks the deploy if a file is broken
or a faction in `FACTIONS` has no data file.

## Tests

```bash
python3 tests/smoke.py
```
Needs `pip install playwright && playwright install chromium`.

## Still shaped like other wargames (to adapt to Iron & Wrath's rules)

- **Game tracker:** rounds, CP, primary/secondary scoring and the "mission type" setup step follow the
  other wargames flow. Iron & Wrath scores differently (tiered primaries rounds 2–4, tactical cards), so
  this is the next thing to redesign.
- **Unit calculator (`calc.js`):** uses other wargames's hit / wound / save dice maths and weapon keywords.
  Swap in Iron & Wrath's 3-step combat.
- **Terrain layouts / AR:** the pages work but have no layouts (`data/ar_index.json`, `assets/ar/`,
  `assets/layouts_svg/`).
- **Army check (`army_check.js`), help and tutorial text:** written for other wargames roster rules.
- Some labels still use other wargames words (detachment, stratagem, enhancement, CP). Rename them in the
  UI text when the game's terms are final.
