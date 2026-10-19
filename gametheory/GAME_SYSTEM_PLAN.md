# 4192 AD — Game System Plan
**Project Codex: Iron & Wrath** · v1.0 · 2026-10-16
*How a game is sized, sequenced, resourced and priced. This sits next to [`FACTION_DESIGN_GUIDE.md`](FACTION_DESIGN_GUIDE.md) (what factions are) and [`UNIT_CATALOGUE.md`](UNIT_CATALOGUE.md) (what units can be). Once approved, it gets folded into `CORE_RULES_MANUAL_4192.md`.*

---

## 0. Decisions in this plan

| Topic | Decision | Based on |
| :-- | :-- | :-- |
| Command resource | **3 CP per round, refreshed (no hoarding), +1 for the underdog** | a fantasy wargame (CP expire each round, underdog bonus), sci-fi wargames Exigence (underdog CP), Kill Team (extra CP to the player without initiative) |
| Exhaustible abilities | **Three layers:** CP Stratagems · ⟳ unit Command Abilities (exhaust, free, once per round) · ✦ once-per-battle abilities | Your "abilities you can exhaust like cards" idea + Kill Team ploys |
| Morale | **Suppression (Rattled → Pinned) plus Broken** | Your request; Bolt Action pins (any hit adds a pin; Rally clears them) |
| Activation | **Alternate 1 unit each. When one side runs out, the other activates its remaining units in a row. A catch-up Pass and initiative to whoever finished first keep it fair.** | Standard in Kill Team, OPR, Dystopian Wars; the "pass" fix is the community's usual answer to activation advantage |
| Game size | **Skirmish 500 / Standard 1,000 / Grand 1,500**, 5–15 units at 1,000 | Your 5–15 target; Kill-Team-to-sci-fi wargames range |
| Points scale | **×1.5 (`GAME_SCALE_4192 = 1.5`)**, so 1,000 pts ≈ ⅔ of a 1,000-pt sci-fi wargames army | Calculator test lists (§5) |
| Flagship | **Auric Solar-Host = golden guardians + power-armoured super-soldiers + Debt-Thralls** | Your call: the "portrait" faction |

---

## 1. Activation & initiative (your question answered)

**Your instinct is right.** Players alternate one unit at a time. When one player has no Ready units left, the other activates all remaining units one after another until everything is Exhausted. If the round ended when one side ran out, the side with more units would simply lose activations, which nobody would accept. Note that in 4192 **no unit ever activates twice in a round**, so elite armies don't "repeat" their best units either way.

The real problem goes the other way: **activation advantage**. The bigger army makes the last moves of every round and can feed cheap "chaff" units while the opponent is forced to commit its heavy hitters. Every alternating-activation game needs some answer to this. These four rules together cover it:

1. **Catch-up Pass.** When you would activate, if you have *fewer* Ready units than your opponent, you may Pass instead (max **2 Passes per round**). Your opponent must then activate. Only the smaller side can pass, so play can't stall.
2. **Initiative to the side that finished first.** Round 1: roll off. Rounds 2–4: the player who ran out of Ready units first in the previous round chooses who activates first. Small elite armies usually get this, which offsets the bigger army's last word. (This replaces the per-round initiative roll; the manual's Anti-Double-Tap rule stays.)
3. **Unit caps and floors.** 5–15 units at 1,000 pts. Squads have minimum sizes (C1 3–5, see the catalogue), and the cheapest legal unit costs about 55 pts, so chaff isn't free.
4. **Attached Leaders don't add activations.** A Leader joined to a bodyguard is one unit card and one activation.

> Example from the calculator (§5): the Gilded Host has **5 activations** against the Rift-Stalker horde's **9**. The Gilded player gets 2 Passes per round, usually chooses initiative, and every one of their activations is worth roughly twice as much.

---

## 2. Game sizes

| Size | Points | Units | Leaders | Big units | Max copies of one datasheet | CP / round | Board | Objectives | Target time |
| :-- | :-: | :-: | :-: | :-- | :-: | :-: | :-- | :-: | :-- |
| **Skirmish** (Kill-Team scale) | 500 | 3–8 | 1–2 | ≤ 1 Class 4, no Class 5 | 2 | 2 | 30"×22" | 3 | 30–45 min |
| **Standard** | **1,000** | **5–15** | 1–3 | Class 4+5 ≤ 3, Class 5 ≤ 1 | 3 | 3 | 44"×30" | 4–5 | **60–90 min** |
| **Grand** (sci-fi wargames-scale) | 1,500 | 7–20 | 1–4 | Class 4+5 ≤ 5, Class 5 ≤ 2 | 3 | 4 | 44"×60" | 5 | 2–2.5 h |

- All sizes use **4 battle rounds**.
- The manual currently says 30"×30"/36"×36". Standard moves to 44"×30", the same board as Combat Patrol and the roster docs.
- `unit_calculator.py list <army.json>` checks all of these limits automatically.

---

## 3. Points scale (why ×1.5)

| Scale | 1,000 pts buys (typical) | Feels like |
| :-- | :-- | :-- |
| ×1.0 | 11–16 units, 35–55 models | a full sci-fi wargames 1,000-pt game: too slow for 2 actions per unit |
| **×1.5** | **6–11 units, 20–40 models** | **Combat Patrol-plus: your 5–15 window, under 90 min** |
| ×2.0 | 4–8 units, 14–25 models | close to Kill Team; elite lists drop below 5 units |

- At ×1.5, a 4192 unit costs about 1.5× the sci-fi wargames price for the same models, because 4192 squads are smaller and every unit acts twice per round.
- In practice: **a 1,000-pt 4192 army is about ⅔ of a 1,000-pt sci-fi wargames army**, which matches your "33–50% less than other wargames".
- The scale is one constant (`GAME_SCALE_4192`). Change it and every price in every file follows.

---

## 4. Command economy: CP, Stratagems, exhaustible abilities

### 4.1 CP
- **Command Phase:** set your pool to **3 CP** (2 in Skirmish, 4 in Grand). Unspent CP is lost at the end of the round. No hoarding keeps decisions quick.
- **Underdog:** from Round 2, the player with fewer VP gains **+1 CP**.
- **Objective push:** +1 CP if you control an objective outside your deployment zone. **Drop** the manual's "+1 CP for a melee kill": it snowballs and favours melee factions.
- **Cap:** 5 CP in a round.

### 4.2 What you spend CP on (Stratagems)
| Source | How many | Notes |
| :-- | :-: | :-- |
| Core Tactics (manual §6) | 10 | universal; each once per round per player |
| Faction Signature Card | 1 | the faction's reaction (FACTION_DESIGN_GUIDE §5) |
| Detachment Stratagems | 3 | added in phase 6 of the roadmap; one detachment per army |

**Rule:** a unit can be targeted by only 1 Stratagem per activation (manual).

### 4.3 Exhaustible abilities (free, on the unit card)
| Symbol | Frequency | How it's tracked | Who has them |
| :-: | :-- | :-- | :-- |
| ⟳ | once per round | place an **Exhaust token** on the ability; remove all in the Command Phase | Leaders (command abilities), some Elites |
| ✦ | once per battle | flip the ability marker face down | Warlords, Behemoths, relics |
| — | passive / always on | — | everything else |

**Budget per army:** about 2–4 ⟳ abilities, plus 1–2 ✦. Each is priced by the calculator with an uptime (⟳ ≈ 0.5–1.0 on its target, ✦ ≈ 0.25).

---

## 5. Suppression & morale (Rattled / Pinned / Broken)

| State | Gained when | Effect | Removed by |
| :-- | :-- | :-- | :-- |
| **Rattled** (1 token) | an enemy Shoot action inflicts ≥ 1 unsaved wound on the unit; `[SUPPRESSIVE]` weapons add a token on any hit | −1 to Hit (counts toward the ±1 cap), −2" Move | **Rally** (1 action) removes all; **End of Round** removes 1 token |
| **Pinned** (2 tokens) | a second token | the unit gets only **1 Action** when it activates and can't Charge | same |
| **Broken** (manual) | at the end of a round, at ≤ half models or MIGHT | CTRL 0; can't be targeted by Stratagems | Rally (1 action) or 1 CP *Insane Bravery* |

**Class 4–5 units cap at 1 token:** they can be Rattled but never Pinned.

**New weapon keyword `[SUPPRESSIVE]`:** heavy stubbers, rotary guns, mortars, sonic weapons. This gives Golgotha's volume fire a real job against elites, and gives Velvet-Scourge's sonics an identity. Apex Synapse now protects against **Suppression** (not Broken), which makes it a cleaner lever.

> Pricing status: suppression is *action denial*. The calculator doesn't price it yet; it's in roadmap phase 2 (expected wounds × the chance of reaching 2 tokens × the value of one Action).

---

## 6. What units can exist (summary of the catalogue)

**Class = the physical base.** It decides line of sight, screening and which Leaders can attach. **Role** (Trooper / Elite / Leader / Brute / Behemoth) is a separate tag. Every faction builds from these **29 universal archetypes**, each priced in [`UNIT_CATALOGUE.md`](UNIT_CATALOGUE.md):

| Class (base) | Archetypes | Price range (min size) |
| :-- | :-- | :-- |
| **1** (25–32mm) | Conscripts · Line · Battle-Brothers · Assault (melee) · Swarm · Scouts · Snipers · Jump Infantry · Officer (Leader) | 55–130 |
| **2** (40–50mm, 60×35 oval) | Elite Guard · Heavy Infantry (heavy-armour veterans) · Heavy Weapon Team · Brutes (Ogre) · Bikes/Cavalry · Battlesuits · Captain (Leader) | 60–170 |
| **3** (60–80mm) | Light Walker/walker · Greater Beast · Field Artillery · Mounted Warlord (Leader) | 70–110 |
| **4** (90–120mm / hull) | Battle Tank · Armoured Transport · Heavy Walker · Behemoth Beast · Self-Propelled Artillery | 135–180 |
| **5** (130mm+) | Super-Heavy Tank · War-Titan/Knight · Colossal Monster · Gunship/Flyer | 215–335 |

There is also a **38-weapon library** (rifles to doom-lances, bayonets to titan stomps). A faction unit = **archetype + the faction's Stat DNA + weapons from its palette + abilities that touch its verb**. Faction 21 (Rift-Stalker) plays the archetypes exactly as printed.

---

## 7. Flagship: Auric Solar-Host (golden guardians + power-armoured super-soldiers)

Draft datasheets, priced: [`factions/01_auric_solar_host.md`](factions/01_auric_solar_host.md) (source: `.json`).

| Datasheet | Class / role | Ladder | Pts (min) | Proxy |
| :-- | :-- | :-- | --: | :-- |
| Debt-Thralls | C1 Trooper | Feed | 75 (5) | cultists, flagellants, servitors |
| Sworn Battle-Brothers | C1 Trooper | Exploit | 135 (5) | line super-soldiers / Tacticals |
| Sworn Vanguard | C1 Elite (jump) | Exploit | 110 (3) | Assault Marines, Prosecutors |
| Sworn Lieutenant | C1 Leader | Amplify | 70 | Lieutenant, line super-soldier officer |
| Gilded Phalanx | C2 Elite | Exploit | 230 (3) | golden guardians, Liberators/Annihilators |
| Bastion Paladins | C2 Elite | Exploit | 275 (3) | Allarus, heavy-armour veterans |
| Sun-Lancers | C2 Elite (fast) | Exploit | 230 (3) | Vertus Praetors, Outriders, Dracothian Guard |
| High Aurarch Praetor | C2 Leader (Warlord) | Amplify | 145 | Shield-Captain, Lord-Celestant |
| Reliquary-Sentry | C3 Brute | Payoff | 125 | Contemptor / box walker |
| Solar Grav-Tank | C4 Behemoth | Payoff | 185 | Caladius, Predator, gunship |
| Heliarch Grav-Cruiser | C5 Behemoth (transport) | Payoff | 390 | heavy transport, Orion, Stormraven |

**Two ways to play it, both legal at 1,000** (`lists/`):

| List | Units | Activations | Models | Points |
| :-- | :-: | :-: | :-: | :-: |
| *Gilded Host* (golden guardians-style): Praetor + 2 Phalanx + 2 Thrall units + Sun-Lancers | 6 | 5 | 20 | 985 |
| *Gene-Forged Host* (power-armoured super-soldiers-style): Lieutenant + 3 Battle-Brothers + Vanguard + Thralls + Sentry + Grav-Tank | 8 | 7 | 26 | 970 |
| *Control:* Rift-Stalker trench horde (chassis only) | 11 | 9 | 40 | 925 |

---

## 8. The calculator (what it does now)

| Command | Does |
| :-- | :-- |
| `fit` | Calibrates base prices on 1,218 sci-fi wargames + 968 fantasy wargames datasheets |
| `unit "<name>"` | Breakdown of any sci-fi wargames/fantasy wargames unit, plus its auto-translated 4192 card |
| `custom <cards.json>` | Prices your own 4192 cards: base + each ability + utility + leader buffs |
| `catalogue` | Prices all 29 archetypes → `UNIT_CATALOGUE.md` |
| `faction <faction.json>` | Prices a faction's datasheets → `<faction>.md` |
| `list <army.json>` | Totals and validates an army against the game-size rules |

**How abilities are written:** in the shared modifier vocabulary (`reroll_hit`, `hit_mod`, `pen_mod`, `crit_hit_on`, `incoming_hit_mod_ranged`, `incoming_dmg_mod`, `ward`, `unyielding`…), with a scope (ranged/melee/defense), an uptime, and `buff` + `n_eff` for leaders and auras.
- **Combat abilities** are priced by the Lanchester law: price × √(EHP change × DPA change) × mobility change, stacked multiplicatively.
- **Non-dice keywords** (Infiltrators, Scouts, Vanguard Strike, Unseen, Strike First, Secured, Transport…) use a utility table seeded from the GW residual study.
- **CTRL** has a design price (`CTRL_PTS_4192`).

**Knobs worth knowing:** `GAME_SCALE_4192` (1.5), `CTRL_PTS_4192` (0.5 raw per CTRL point), `UTILITY`, uptimes. All are at the top of `unit_calculator.py`.

---

## 9. Roadmap (updated)

| # | Phase | Status |
| :-: | :-- | :-- |
| 0 | Lock canon (this doc + FACTION_DESIGN_GUIDE §0) → update `CORE_RULES_MANUAL_4192.md`: CP/underdog, ⟳/✦ abilities, Suppression, activation/Pass/initiative, game sizes, Class vs Role | **next: needs your OK** |
| 1 | Universal toolkit: 29 archetypes + 38 weapons, priced | ✅ draft done |
| 2 | Ability engine: modifier vocabulary, Lanchester ability pricing, utility, buffs, CTRL | ✅ done · ⏳ add Suppression pricing and once-per-round helpers |
| 3 | Starter factions: **Auric** (✅ draft) → Golgotha → Cinder-Gorged → Apex → Starfire, plus Rift-Stalker contracts | in progress |
| 4 | Playtest: 15 pairings, log results, tune points (not verbs) | after 3 |
| 5 | Waves 2–5 (Prometheus, Concordat, Skitter-Kin, Sanguine, Obsidian first) | — |
| 6 | Detachments (3 Stratagems + 1 enhancement each), Tactical Card decks | — |

*Research references: Kill Team 2024 core rules (CP per turning point, extra CP to the player without initiative); fantasy wargames 4 (4 CP per round that expire, +1 CP underdog); sci-fi wargames Exigence CP (underdog bonus); Bolt Action pin markers & Rally; Star Wars Legion order tokens; community discussion of alternating-activation "chaff" and pass mechanics.*

---

## 10. Pricing & balance v2 (2026-10-16 update)

### 10.1 Final unit price = data + maths, all editable
`Points = [ fitted base (stat line) × Lanchester ability multipliers + utility + leader buffs + CTRL ] × scale × class mult × faction mult + designer adjust`

| Layer | Where it comes from | Where you edit it |
| :-- | :-- | :-- |
| Base stat line | Regression on 1,218 40k datasheets, translated to 4192 dice | `fit` (data) |
| Inherent abilities (every unit's own rules, like sci-fi wargames/fantasy wargames datasheet abilities) | Delta method: price × √(EHP change × DPA change) | the unit's `abilities` in its faction file |
| Army-wide rules | Same; applied to every unit (`faction_abilities`) | faction file |
| Enhancements (optional upgrades) | Priced **on the bearer**, delta method, shown as "+X pts" | detachment `enhancements` |
| Utility keywords, CTRL, retaliation, scale | Design knobs | `catalogue/pricing_config.json` |
| Class / faction corrections | **Battle simulator** (`battle_sim.py balance`) | `pricing_config.json` |
| Hand override | You | `"points_adjust": ±N` on any unit |

### 10.2 What the battle simulator found (2,000+ simulated games)
1. **Core-rule loophole:** the manual lets a unit Charge (which includes a free Fight) **and** then Fight again, or Fight twice in ongoing melee. **Fix: FIGHT max once per activation (the charge's free Fight counts).** Shooting already has this limit.
2. **Retaliation makes melee worth more in 4192 than in sci-fi wargames.** Every engaged unit also strikes back once per round. Melee damage is now valued ×1.5 (`MELEE_RETALIATION_BONUS = 0.5`).
3. **Class 4–5 units were over-priced** (about −44% value per point in the sim). Corrected by half (×0.9 Class 4, ×0.85 Class 5), because the sim has no terrain to hide big models.
4. **Faction balance:** auto-tuned multipliers (Auric ×0.91, Golgotha ×0.95, Cinder ×1.11, Apex ×1.09, Starfire ×0.92) bring all 5 release factions to **44–54%** with random 1,000-pt lists, and reproduce the designed counter-cycle (Golgotha beats Auric, Apex beats Golgotha, Auric and Starfire beat Cinder…).
5. **Big squads still slightly out-perform** (+21% value per log-model). This is the next calibration target.

### 10.3 Chaff (goblin chaff, swarm beasts, slaves) — why not 30 for 10
| Unit | sci-fi wargames | 4192 ×1.0 | 4192 ×1.5 (current) |
| :-- | :-: | :-: | :-: |
| 10 goblin chaff-style (MIGHT 1, FRAIL) | 45 | 60 | 90 |
| 10 goblin chaff, **[EXPENDABLE]** profile (no save, CTRL 0) | — | 45 | **70** |
| 10 swarm beasts-style Gaunts | 55 | 85 | 130 |
| 3 golden guardian-style Gilded Phalanx | 240 | 140 | 215 |

- **Bodies are worth more in 4192 than in sci-fi wargames.** A rifle wounds a 1-MIGHT model on 4+ (sci-fi wargames goblin chaff are wounded on 2+), and objectives are scored by CTRL. The simulator confirms it: big chaff units returned up to 2.8× their points before CTRL was priced.
- **Chaff at 30 for 10 would be the best unit in the game.** In alternating-activation games, cheap activations are the classic exploit.
- **Recommendation:** keep ×1.5, and make the true throwaways weaker instead of cheaper:
  - **New keyword `[FRAIL]`:** +1 to Wound rolls against the unit. It mirrors `[HARDENED]`.
  - **New keyword `[EXPENDABLE]`:** CTRL 0, never Broken, can't be targeted by friendly Stratagems; −10% price.
  - That puts 10 grots at about **70** (about 45 in sci-fi wargames-equivalent points).
- **If you want the printed number lower:** scale ×1.0 gives grots about 45–60, but 1,000 pts then buys about 50% more army (13–20 units), which is outside your 5–15.

### 10.4 Commands
```
python3 gametheory/scripts/battle_sim.py matrix  --games 200   # faction vs faction win rates
python3 gametheory/scripts/battle_sim.py units   --games 2000  # per-datasheet value per point + what explains it
python3 gametheory/scripts/battle_sim.py balance --iters 6     # re-tune FACTION_MULT after changing any faction
python3 gametheory/scripts/unit_calculator.py registry         # regenerate FACTION_REGISTRY.md tables
```

---

## 11. Simulator v2 & data-driven calibration (2026-10-17, 100 release datasheets)

**What changed in `battle_sim.py`**
- **Terrain:** each round half of all Class 1–3 units are in cover (−1 to be hit at range, unless [IGNORES COVER]/[INDIRECT FIRE]). Ruins hide Class 1–3 targets beyond 12″ (60% of the time in round 1, 35% after). Class 4–5 are too tall to hide. [INDIRECT FIRE] shoots hidden targets at −1.
- **Expected-value targeting:** shooters pick the target where they expect to destroy the most points. Before, they always shot the most expensive model, and that bias produced the old "vehicles are 44% over-priced" result.
- **Rule switches** for testing proposals: `--move-charge`, `--double-fight`, `--defender-first`, `--open-field`.
- **`calibrate`:**
  1. Measures value per point **per Class** (non-Leaders) and for **melee-only** units, within factions.
  2. Writes damped `CLASS_MULT` and `SIM_CORRECTION` to `pricing_config.json`.
  3. Repeats, then re-balances `FACTION_MULT`.

**Final calibration (3 iterations × 2,500 games, then 6 balance rounds)**

| Setting | Value | Meaning |
| :-- | :-- | :-- |
| `CLASS_MULT` | C1 0.83 · C2 0.88 · C3 0.96 · C4 1.00 · C5 1.14 | Big centrepieces were slightly under-priced; infantry slightly over-priced |
| `SIM_CORRECTION.melee_only` | −0.075 | Units with no ranged weapon are worth ~7% less (they must cross the table) |
| `FACTION_MULT` | Auric 1.02 · Golgotha 0.98 · Cinder 1.07 · Apex 1.00 · Starfire 0.92 | All close to 1.0, so the base maths is now doing the work |
| Result | **49–51%** in calibration · **49–52%** on a fresh 3,000-game seed | Counters remain (e.g. Cinder vs Apex 68%, Starfire vs Cinder 63%), as designed |

**Caveats**
- Leaders are priced by formula only. The sim under-models auras, duels and orders, so it would call them "over-priced"; they are deliberately excluded.
- FLY over terrain and Starfire's glide are not modelled, so Starfire's ×0.92 may be generous.
- The sim's objective scoring is still simplified; aligning it to `MISSIONS_AND_TACTICAL_DECK.md` is the next task.

**Re-run after any faction change** (≈10 min):
`python3 gametheory/scripts/battle_sim.py calibrate --iters 3 --balance-iters 6 --games 2500`
