# Terrain Layouts — plan, kit and checks

**Project Codex: 4192 AD** · v2.0 · 2026-10-19 · pairs with [CORE_RULES_MANUAL_4192.md](CORE_RULES_MANUAL_4192.md) §6 (terrain) and
[MISSIONS_AND_TACTICAL_DECK.md](MISSIONS_AND_TACTICAL_DECK.md) §2 (maps).

- **Tool:** `scripts/layout_gen.py`.
- **Output:**
  - data: `website/data/layouts_4192.json` (standard kit) and `layouts_4192_custom.json` (v1 kit);
  - maps: `website/assets/layouts_4192/`;
  - page: `website/terrain.html`.

**What changed in v2**
1. **Standard footprint sizes:** the layouts now use pieces from the common 16-piece tournament footprint set, so players can reuse footprints they already own.
2. **Three objectives:** no home objectives.
3. **Mirror symmetry on Frontline and Pincer:** it lets the left/right wedge pair be used fairly.

The v1 custom kit is kept as an alternative (switch on the Terrain page).

---

## 1. Why a 44″ × 30″ table

| | Typical large sci-fi wargame (60″ × 44″) | 4192 AD (44″ × 30″) |
| :-- | :-- | :-- |
| Units per army | ~12–18 | 6–15, about 8 on average (7,500 simulated 1,000-pt lists) |
| Models per army | ~40–60 | ~23 on average |
| Table area | 2,640 sq in | 1,320 sq in, exactly half a 60″ × 44″ mat |
| Models per square inch | ~0.019 | ~0.017 |

**Result:**
- 40–50 % fewer units on half the area, so the **same crowding** and **faster games**.
- Players can use half of the mat they already own.

---

## 2. The standard kit

**The source set:** 4 large rectangles, a left/right wedge pair, 4 medium rectangles, 2 long lines and 4 short lines.
- On the larger table those 16 pieces cover **24 %**.
- On ours that share means about 315 sq in, **8–10 pieces**.

| Piece | Footprint | Height | Rules (§6) | Used |
| :-- | :-- | :-- | :-- | :-- |
| Large Ruin | 11.5″ × 7″ | 5″ | **Dense:** blocks line of sight through its footprint; Class 4–5 cannot cross walls | 2 of 4 |
| Large Wedge (left + right) | 11.5″ × 8″, 2″ narrow end | 5″ | **Dense** | the pair |
| Medium Ruin | 6″ × 4″ | 3″ | **Dense** | 2 of 4 |
| Long Wall | 10″ × 2.5″ | 5″ | **Dense** | 2 of 2 |
| Short Wall | 6″ × 2″ | 3″ | **Light:** cover (−1 to Hit) behind it | 4 of 4 |

**All 9 layouts together need 12 of the 16 pieces.** A single layout uses 8–10.

### Which pieces each map uses (chosen by testing, not by hand)
The generator tried 6 half-sets on the mirror maps and 4 on Broken Ground (about 3,000 layouts per map), then compared their best scores:

| Map | Best half-set | Full layout | Why |
| :-- | :-- | :-- | :-- |
| A · Frontline Clash | Large Ruin + Wedge + 2 Short Walls | 2 LR, wedge pair, 4 SW = **8 pieces, 24 %** | Only 14″ of no-man's land: more Dense pieces leave no room to move. Medium ruins and long walls scored 3–4× worse. |
| B · Broken Ground | Large Ruin + Medium Ruin + Long Wall (+ 1–2 Short Walls) | 2 LR, 2 MR, 2 LW, 2–4 SW = **8–10 pieces, 21–23 %** | The diagonal zones need several mid-sized blockers. Wedges can't be used here (see §3). |
| C · Pincer | Large Ruin + Wedge + 2 Short Walls (one layout swaps a wall for a Medium Ruin) | **8 pieces, 24–26 %** | Same reason as Frontline, on the other axis. |

---

## 3. Symmetry and the wedge pair

- **Frontline Clash** (zones on the long edges) is **mirrored across the long centre line**.
- **Pincer** (zones on the short edges) is **mirrored across the short centre line**.
  - A mirror turns a left wedge into a right wedge, so each map uses exactly the left/right pair.
- **Broken Ground** (zones in opposite corners) can only be **rotated 180°**.
  - A rotated left wedge is still a left wedge, so this map would need two left wedges.
  - It uses Medium Ruins and Long Walls instead, still from the same 16-piece set.

---

## 4. Objectives: three, no home objectives

| Map | Objectives (from the bottom-left corner) |
| :-- | :-- |
| A · Frontline Clash | Centre (22, 15) · Flanks (8, 15) and (36, 15) |
| B · Broken Ground | Centre (22, 15) · Off-diagonal (10, 24) and (34, 6) |
| C · Pincer | Centre (22, 15) · Wings (22, 5) and (22, 25) |

**Why drop home objectives at 1,000 points:**
1. **Units are spread thin otherwise.** With 6–15 units, 5 objectives ask for too much.
2. **They reward sitting back.** A unit parked on its home objective scores without playing, which slows the game down.
3. **Three is a good fit for the scoring tiers:** +1 for holding one, +2 for holding two, +2 for holding more than the opponent. Holding 2 of 3 is a clear majority.

**Home objectives stay available:**
- `layout_gen.py --homes` puts them back;
- the v1 custom kit keeps 5 objectives;
- a Grand game (1,500 pts) can add them.

---

## 5. Targets and checks (unchanged from v1)

Measured on 45 published tournament layouts for the larger table (statistics only, nothing copied):
- 24 % covered;
- 95 % of zone-to-zone sightlines crossing tall terrain;
- every objective in or touching terrain.

| Check | Target |
| :-- | :-- |
| Sightlines zone → zone blocked by Dense terrain | 80–95 % (hard minimum 78 %) |
| Table covered | 19–28 % |
| 4″-wide route (Class 4–5) to both zones and every objective | required |
| Nearest terrain to each objective | 1.5–5.5″ (required), never on the marker |
| Safe deployment ground per zone | 15–60 % |
| Lines from each zone to the centre objective blocked | 30–70 % |

Hard placement rules:
- pieces stay 0.5″ inside the table edge;
- 3″ gap around Dense pieces, 2.5″ between Light pieces;
- at least 2.3″ from objective markers;
- a limit on Dense pieces mostly inside a deployment zone: 2 per side on Frontline (its no-man's land is only 14″), 1 elsewhere.

---

## 6. Current layouts (v2, standard kit)

| Code | Pieces | Sightlines blocked | Covered | Route | Objective cover |
| :-- | :-- | --: | --: | :-: | :-- |
| FC-1 · FC-2 · FC-3 | 8 | 79–82 % | 24–25 % | ✅ | 2.4–4.9″ |
| BG-1 · BG-2 · BG-3 | 8–10 | 78–85 % | 21–23 % | ✅ | 2.3–3.9″ |
| PI-1 · PI-2 · PI-3 | 8 | 78–86 % | 24–26 % | ✅ | 2.5–5.5″ |

The page shows each layout's own numbers and a setup table, giving every piece's centre in inches from the left and front edges plus its rotation. For wedges it also says which side the wide end points to.

```bash
cd gametheory/scripts
python3 layout_gen.py                          # standard kit, 3 objectives, 9 layouts (~4 min)
python3 layout_gen.py --maps PI --tries 8000   # search one map harder; the others in the file are kept
python3 layout_gen.py --homes                  # put the home objectives back
python3 layout_gen.py --kit custom             # the v1 custom kit (5 objectives) -> layouts_4192_custom.json
```

---

## 7. Next steps
1. **3D and phone AR:** adapt `tools/ar/build_ar_models.py` (built for the larger table) to 44″ × 30″ and these footprints.
2. **Simulator:** `battle_sim.py` still scores a home objective per side and assumes 50 % cover / 35 % hidden. Switching it to these
   3-objective maps and to cover/hidden rates measured on these layouts would make the balance numbers table-accurate.
3. **Skirmish (30″ × 22″):** about 5 pieces (1 Large Ruin, the wedge pair, 2 Short Walls) and the same 3 objectives scaled by 0.7.
