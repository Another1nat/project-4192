# Terrain Layouts — plan, kit and checks

**Project Codex: 4192 AD** · v1.0 · 2026-10-19 · pairs with [CORE_RULES_MANUAL_4192.md](CORE_RULES_MANUAL_4192.md) §6 (terrain) and
[MISSIONS_AND_TACTICAL_DECK.md](MISSIONS_AND_TACTICAL_DECK.md) §2 (maps).

- **Tool:** `scripts/layout_gen.py`.
- **Output:**
  - data: `website/data/layouts_4192.json`;
  - maps: `website/assets/layouts_4192/<CODE>.svg`;
  - page: `website/terrain.html`.

---

## 1. Design targets (where the numbers come from)

**Reference data.** We measured 45 published tournament layouts for a larger 60″ × 44″ game, using statistics only (no layout was copied):
- 16 pieces per table;
- **24 %** of the table covered by terrain;
- **95 %** of deployment-zone-to-zone sightlines crossing tall terrain (range 83–100 %);
- about 20 % of each deployment zone covered;
- every objective inside or touching terrain.

**Targets for our 44″ × 30″ table (half the area):**

| Measure | Target | Why |
| :-- | :-- | :-- |
| Table covered | 19–28 % | Same density as the reference, so movement and cover feel familiar |
| Sightlines zone → zone blocked by Dense terrain | 80–95 % (aim 88 %) | Gunlines cannot shoot everything from deployment, but a few lanes stay open for long guns |
| Route for Class 4–5 (4″ wide) | to both zones and every objective | Big models must be able to play the objectives |
| Terrain near each objective | 1.5–5″ away, never on the marker | Holders get cover; the 3″ control circle stays playable |
| Safe deployment ground | 15–60 % of each zone | Somewhere to hide on Round 1, but not a fortress |
| Centre objective | 30–70 % of lines from each zone blocked | The centre is contested, not hidden |
| Fairness | 180° rotation about the centre | Both players get the identical table |

---

## 2. The kit (12 pieces, ~300 sq in)

| # | Piece | Footprint | Height | Rules (§6) |
| :-: | :-- | :-- | :-- | :-- |
| 4 | Large Ruin | 8″ × 6″ | 5″ | **Dense:** blocks line of sight through its footprint; Class 4–5 cannot cross walls |
| 2 | Small Ruin | 6″ × 4″ | 4″ | **Dense** |
| 2 | Barricade | 6″ × 1.5″ | 1.5″ | **Light:** cover (−1 to Hit) behind it, crossed freely |
| 2 | Low Wall | 5″ × 2″ | 2″ | **Light** |
| 2 | Crater | 4″ diameter | flat | **Exposed:** infantry wholly inside claim cover |

Build it from anything: card, foam, ruins you already own. Only the footprint size matters for the rules.

---

## 3. How a layout is generated

1. **Place half the kit at random** on one side:
   - 2 Large Ruins, 1 Small Ruin, 1 Crater (inside your own deployment zone), 1 Barricade, 1 Low Wall;
   - angles of 0°, 30°, 45°, 60° or 90°.
2. **Add the twin** of every piece, rotated 180° around the table centre.
3. **Hard rules** (otherwise the layout is rejected):
   - pieces stay 0.5″ inside the table edge;
   - gaps: 3″ around Dense pieces, 2.5″ between Light pieces;
   - at least 2.3″ from every objective marker;
   - **at most one Dense piece per side inside its deployment zone**, so the big ruins fill no-man's land.
4. **Score** every valid candidate against the targets in §1 (2,500 tries per map).
5. **Pick the 3 best layouts per map** that look different from each other. Each finalist is re-measured with 600 sightlines and must block at least 78 % and keep the big-model route.

```bash
cd gametheory/scripts
python3 layout_gen.py                        # 9 layouts (3 maps x 3), about 4 minutes
python3 layout_gen.py --tries 6000 --seed 7  # more search, different layouts
python3 layout_gen.py --variants 5           # 5 per map
```

---

## 4. Current layouts (v1.0)

| Code | Map | Sightlines blocked | Covered | Big-model route | Character |
| :-- | :-- | --: | --: | :-: | :-- |
| FC-1 / FC-2 / FC-3 | A · Frontline Clash | 79 % / 87 % / 80 % | 23 % | ✅ | The most open map: zones span both long edges 14″ apart. Gunlines are strongest here. |
| BG-1 / BG-2 / BG-3 | B · Broken Ground | 85 % / 80 % / 82 % | 23 % | ✅ | Diagonal approach: flank objectives decide the game. |
| PI-1 / PI-2 / PI-3 | C · Pincer | 82 % / 82 % / 82 % | 23 % | ✅ | Long approach across 24″; zones are well hidden, so melee armies arrive intact. |

Each layout's own numbers (shelter, centre, objective cover) are on its page in `website/terrain.html` and in
`website/data/layouts_4192.json → checks`.

---

## 5. Data format (`layouts_4192.json`)

```json
{ "FC-1": { "code": "FC-1", "map": "FC", "variant": "1", "title": "...", "title_es": "...",
   "table": {"width_in": 44, "depth_in": 30},
   "deployment_zones": [{"role": "attacker", "points_in": [[x, y], ...]}, {"role": "defender", ...}],
   "objectives": [{"n": 1, "type": "home|central|flank", "owner": "attacker|defender|", "x_in": 0, "y_in": -11, "control_radius_in": 3}],
   "pieces": [{"code": "A", "type": "RL|RS|BL|LW|CR", "kind": "Large Ruin", "terrain": "dense|light|exposed", "blocks_los": true,
               "size_in": [8, 6], "height_in": 5, "centre_in": [x, y], "from_left_in": 12.5, "from_front_in": 7.0,
               "rotation_deg": 45, "corners_in": [[x, y], ...]}],
   "checks": {"sightlines_blocked": 0.79, "coverage": 0.23, "shelter": [0.55, 0.53], "centre_blocked": [0.42, 0.43],
              "big_model_route": true, "objective_cover_in": [2.5, ...], "score": 0.74} } }
```
- Coordinates are in inches from the table centre (x along the 44″ edge, y along the 30″ edge, +y towards the defender).
- `from_left_in` / `from_front_in` are what players measure on the table.

---

## 6. Next steps

1. **3D and phone AR:** adapt the existing model builder (`tools/ar/build_ar_models.py`, written for 60″ × 44″ and
   scraped art) to the 44″ × 30″ table and these simple footprints. That gives the same "View on my table (AR)" button as before.
2. **Simulator from real layouts:** `battle_sim.py` still assumes 50 % of units in cover and 35 % hidden beyond 12″.
   Measuring those two numbers on these 9 layouts and feeding them back would make the balance numbers table-accurate.
3. **Skirmish (30″ × 22″) and Grand (44″ × 60″) sizes:** the same generator with a scaled kit (8 and 18 pieces).
4. **Mission-specific layouts:** e.g. more open lanes for artillery missions, denser cities for close-quarters missions.
