# 4192 AD — Missions, Deployment Maps & the Tactical Deck
**Project Codex: Iron & Wrath** · v1.0 · 2026-10-17 · *pairs with CORE_RULES_MANUAL_4192 v4.2 (Sections 2, 7, 8)*

> **Design goals:**
> - The game is decided by **positions and decisions**, not just kill-count.
> - A player who is behind always has a realistic way back (underdog CP + Tactical cards).
> - **No dead cards:** every card can be **scored** for VP *or* **burned** for a small instant effect.

---

## 1. Scoring at a glance

| Source | When | VP |
| :-- | :-- | :-- |
| **Primary: hold objectives** | End of Rounds **2, 3 and 4** | +1 for holding ≥1 objective · +2 more for holding ≥2 · +2 more for holding **more than your opponent** (max 5 per round, **15 per game**) |
| **Tactical cards** | End of each round, Rounds **1–4** | Score **up to 2** cards per round (most give 2 VP, hard ones 3). Max **12 VP per game** from cards |
| **Tie-break** | End of battle | Points of enemy units destroyed |

- **Controlling an objective:** the highest total CTRL of models within 3″ horizontally / 5″ vertically. Broken units have CTRL 0. `[SECURED]` keeps control after the unit leaves, until the enemy out-controls it.
- **Why no Round-1 primary:** alternating activations make Round 1 a positioning round. Scoring starts once both armies have had a full round to react.

---

## 2. Deployment maps (Standard 44″ × 30″, 5 objectives, 40mm markers)

Coordinates are (x along the 44″ edge, y along the 30″ edge), measured from the bottom-left corner.

| Map | Deployment zones | Objectives | Plays like |
| :-- | :-- | :-- | :-- |
| **A. Frontline Clash** | Long edges, 8″ deep (14″ no-man's-land) | Home (22, 4) & (22, 26) · Centre (22, 15) · Flanks (8, 15) & (36, 15) | Straight fight for the middle; best for learning |
| **B. Broken Ground** | Opposite corners: triangles from (0,0)–(20,0)–(0,14) and (44,30)–(24,30)–(44,16) | Homes (6, 6) & (38, 24) · Centre (22, 15) · Off-diagonal (10, 24) & (34, 6) | Armies arrive at angles, so flanking and the off-diagonal objectives matter |
| **C. Pincer** | Short edges, 10″ deep (24″ gap) | Homes (5, 15) & (39, 15) · Centre (22, 15) · Wings (22, 5) & (22, 25) | Long approach: gunlines shine early, fast armies swing wings late |

**Skirmish (30″ × 22″):** use maps A or C scaled by ×0.7, with 3 objectives (homes + centre).
**Grand (44″ × 60″):** use map A with 7 objectives (add two at (11, 30) and (33, 30)).

### Terrain standard (every map)
The 12-piece kit and 9 ready-made layouts (3 per map) are in [TERRAIN_LAYOUTS.md](TERRAIN_LAYOUTS.md) (page: `website/terrain.html`).
- **6 Dense pieces:** 4 Large Ruins (8″ × 6″, 5″ tall) and 2 Small Ruins (6″ × 4″). At most one per side inside its deployment zone; the rest fill no-man's land.
- **4 Light pieces:** 2 Barricades (6″ × 1.5″) and 2 Low Walls (5″ × 2″).
- **2 Exposed pieces:** craters (4″), one in each deployment zone.
- **Checks every layout passes:**
  - 80–95 % of zone-to-zone sightlines blocked (Frontline Clash is the most open map, about 80 %);
  - 19–28 % of the table covered;
  - a 4″-wide route for big models to every objective;
  - cover 1.5–5″ from each objective;
  - 180° symmetric.

---

## 3. The Tactical deck

- **Hand:** start the battle with 2 cards, draw 1 each Command Phase, hand max 3. Once per round you may pay **1 CP** to discard a card and draw a new one.
- **Score it:** at the End of Round, reveal any cards whose condition you met this round (max 2 per round) and gain their VP. Then discard them.
- **Burn it:** during one of your activations, discard a card for its free effect. A unit can be affected by **only one Burn per activation**, and Burns don't count as Core Tactics.

| # | Card | SCORE IT (End of Round) | BURN IT (instant, 0 CP) |
| :-: | :-- | :-- | :-- |
| 1 | **Decapitation Order** | An enemy Leader was destroyed this round: **2 VP** (3 if it was the Warlord) | One unit's attacks gain `[PRECISION]` this activation |
| 2 | **Fell the Colossus** | An enemy Class 4–5 unit was destroyed this round: **2 VP** (3 if Class 5) | One weapon gains `[ANTI-VEHICLE 4+]` and `[ANTI-MONSTER 4+]` for one attack |
| 3 | **Take the High Ground** | You control an objective the opponent controlled at the start of the round: **2 VP** | One unit gets +1 CTRL per model until the End of Round |
| 4 | **Behind the Wire** | A friendly unit (not one that arrived from Reserves this round) is wholly within 6″ of the opponent's table edge: **2 VP** | +2″ to one Move action |
| 5 | **Purge the Field** | 2 or more enemy units were destroyed this round: **2 VP** | One unit re-rolls Hit rolls of 1 this activation |
| 6 | **Hold the Flanks** | You control both flank (or wing) objectives: **3 VP** | One Battleline unit gains `[SECURED]` for the rest of the battle |
| 7 | **Survey the Ruins** | A unit within 3″ of a no-man's-land objective spent 1 Action to *Survey* this round (it cannot Shoot in that activation): **2 VP** | One enemy unit cannot claim Cover against one attack |
| 8 | **Seize the Heart** | You control the centre objective and no enemy model is within 3″ of it: **2 VP** | +1″ to one Charge roll |
| 9 | **Shock and Awe** | An enemy unit that started the round at full strength was destroyed by Shooting this round: **2 VP** | One weapon gains `[HAILFIRE 1]` for this attack |
| 10 | **Thin the Herd** | An enemy unit with a starting strength of 5+ models was destroyed this round: **2 VP** | One weapon gains `[SHRAPNEL 1]` (ranged) or `[REAPING 1]` (melee) for this attack |
| 11 | **No Ground Given** | Rounds 2–4 only: no enemy models are wholly within your deployment zone: **2 VP** | One unit gets +1 ARM (to the 3+ cap) against one ranged attack |
| 12 | **Hunter's Wager** | When drawn, your opponent names 2 of their units. Destroy one of them, or end the round with one of them controlling no objective: **3 VP** | Heal D3 MIGHT on one friendly Leader or Class 4–5 model |

**Balance notes**
- Cards 1, 2, 5, 9 and 10 reward killing.
- Cards 3, 4, 6, 7, 8 and 11 reward positioning.
- Card 12 is a duel the opponent helps set up.
- A pure-melee army can still score 7 of the 12 cards.
- Burns are deliberately small (about one ⟳ ability), so card-cycling never beats the mission.

---

## 4. Narrative & campaign hooks (optional)
- **Grudge track:** after each campaign game, the loser picks one enemy datasheet as a Grudge. Next game, killing it scores +1 VP.
- **Veterancy:** a unit that survives 3 games gains one ⟳ ability from its faction's detachment enhancement list (no points cost, max 1 per army).

---

## 5. Simulator alignment
`battle_sim.py` scores a simplified version: 3 midfield objectives by CTRL share + 1 home objective, every round. Updating it to this exact primary scoring (rounds 2–4, tiered) and modelling cards 3, 6 and 8 is the next simulator task.
