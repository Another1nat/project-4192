# Faction Expansion v4.3 — 550 Datasheets, Rules, Detachments & Review
**Project Codex: 4192 AD** · 2026-10-18 · status: **DRAFT (calculator-priced, sim-estimated, not yet table-tested)**

> **What this delivers**
> - **5 release factions: 20 → 30 datasheets** (+50).
> - **20 other factions: 20 datasheets each** (+400).
> - Every faction now has:
>   - **1 core rule** (low risk) and **1 gamble** (high risk, with a stated *cost type*);
>   - **3 detachments**, each with 1 rule, 2 enhancements and 3 stratagems;
>   - priced faction-wide abilities.
> - **572 unit abilities, 568 of them priced.** The 4 text-only ones are pre-existing release abilities.
> - Everything passes `unit_calculator.py validate`: envelopes, keywords, IP-safe names, 4192 vocabulary and army-wide caps.

---

## 1. How it is built (so you can change anything)

| File | Role |
| :-- | :-- |
| `scripts/faction_builder.py` | Holds the **ability library `AB`** (≈90 priced effects) and the generator. A unit is: archetype + faction Stat DNA + overrides + abilities. It clamps every stat to the Class envelope and prints each clamp. |
| `factions/specs/ga1_solis.py` … `ga5_voidborn_b.py` | The 20 new factions, written as compact specs (one line per unit). |
| `factions/specs/release_plus10.py` | +10 units per release faction and the v4.3 rule revisions. Runs in **append mode**: the hand-made files are kept. |
| `factions/NN_*.json` | Generated faction files, the same format as the release ones. `faction`, `validate`, `registry` and `battle_sim.py` all read them. |

```bash
python3 scripts/faction_builder.py                 # rebuild all (or: faction_builder.py 08 22)
python3 scripts/unit_calculator.py validate factions/08_prometheus_flesh_guilds.json
python3 scripts/unit_calculator.py faction  factions/08_prometheus_flesh_guilds.json   # priced .md datasheets
python3 scripts/unit_calculator.py registry        # FACTION_REGISTRY.md now reads every NN_*.json
python3 scripts/battle_sim.py gauntlet --iters 4 --games 1000   # drafts vs the 5 release factions
```

**Ability pricing types.** These are the honesty markers for each price.

| Type | Count | How it is priced | Confidence |
| :-- | --: | :-- | :-- |
| Dice modifiers (re-rolls, ±Hit/Wound, PEN, crits, WARD, UNYIELDING…) | 162 | Delta method on the unit itself (Lanchester √(EHP×DPA)) | High: it is pure maths |
| Leader buffs and auras | 92 | Delta on the reference squad × units affected × uptime | Medium: depends on n_eff and uptime |
| Keywords (Infiltrators, Strike First, Glide…) | 26 | UTILITY table (% of base price) | Medium |
| **Flat points** (drag, swaps, summons, heals, Plunder…) | **288** | **Designer estimate** in raw pts (×1.5 scale) | **Low: the sim cannot see these. Playtest first.** |

---

## 2. Decisions per faction: core, gamble and detachments

Gemini's 5 ideas per faction were the starting menu. **A** = adopted, **M** = modified (cap or rename), **R** = rejected, **D** = moved into a detachment, **S** = moved into a stratagem or datasheet.

### Gamble cost types (deliberately varied)
- **Durability:** voluntary self-damage, or dice that can backfire.
- **Exposure:** worse defence after the gamble.
- **Resource:** empties a bank, or burns a once-per-battle option.
- **Tempo:** lose mobility or actions.
- **Position:** stay put.
- **Objective:** CTRL 0, or a VP wager.
- **Opponent's choice:** the opponent picks the punishment.

**Not every faction is high-risk.** For most factions the core rule is low-risk; the gamble is optional and capped at once per round or once per battle.

| # | Faction | Verb | Core rule (low risk) | Gamble → cost | Detachments | Gemini ideas: A / M / R |
| :-: | :-- | :-- | :-- | :-- | :-- | :-- |
| 01 | Auric Solar-Host | STANCES | Martial Stances | Solar Overdrive → exposure | Gilded Host · Gene-Forged Host · Sunfall Spearhead | #1 A · #2 S · #3 S (1-CP) · #4 S · #5 D |
| 02 | Golgotha Trench-Legions | ORDERS | Chain of Command + Fire Mission | **Danger-Close** → friendly fire | Combined Arms · Siege Artillery · Grinder Brigade | #1 A · #2 A · #3 S (2 CP) · #4 D · #5 R (overwatch spam) |
| 03 | Sun-Pyre Witch-Courts | FAITH | Pyre-Dice (bank 3, one die per activation, never Damage) | Martyr's Pyre → resource | Burning Rose · Penitent Host · Witch-Hunter Tribunal | #1 M · #2 D · #3 D · #4 D · #5 S (aura) |
| 04 | Aegis Knight-Houses | FACING | Ion Bulwark WARD 5+ front arc + Thunderous Joust | Vent the Reactor → durability dice | Noble Lance · Squire Hunt · Feudal Muster | #1 M (4+→5+) · #2 D · #3 A · #4 D · #5 D |
| 05 | Abyssal Bathys-Corps | DRAG | Winch-Harpoons + public 4-round Tide | Anchor-Lock → position | Deep Trench · Leviathan Pod · Salvage Corps | #1 A · #2 M (Round 1 only) · #3 A · #4 D · #5 R (portal-like; user: no portals) |
| 06 | Sanguine Aristocracy | FEED | The Hunger (heal 2/3 on kills) | Red Thirst → objective/position | Blood Court · Grave Cavalcade · Midnight Court | #1 A · #2 D · #3 S · #4 D · #5 S |
| 07 | Mordant Ghoul-Courts | REPLENISH | Marrow-Feast (≤100%) + Feeding Frenzy | Delusional Crusade → durability | **Royal Hunt · Grand Feast · Dragon Court (each is a delusion)** | #1 M (delusions moved to detachments) · #2 A · #3 A · #4 D · #5 R |
| 08 | Prometheus Flesh-Guilds | GRAFT | Organ & Scrap Harvest (permanent upgrades) | Over-Graft → durability + resource | Surgeon-Cult · Forge-Legion · Galvanic Breach | #1 A · #2 D · #3 S · #4 D · **#5 R (Rad-Saturation)** |
| 09 | Frost-Skaer Blood-Raiders | SAGA | Sworn Sagas (public deeds → permanent runes) | Death-Saga Boast → tempo | Saga of the Hunt · Saga of the Storm · Mammoth Stampede | #1 A · #2 S · #3 D · #4 S (2 CP, no Move+Charge army-wide) · #5 S |
| 10 | Dread-Fleet Buccaneers | PLUNDER | Plunder CP (own pool, never stolen) + 3″ Cannonade slip | Ram & Board → durability | Sky-Raiders · Pirate Armada · Grapnel Crews | #1 M (3″) · #2 D · #3 A · #4 S · #5 D |
| 11 | Cinder-Gorged Legion | BLOOD CLOCK | Blood-Tithe + Surge | **Unleashed Cinder-Fury (voluntary) → durability** | Red Tide · Brass Host · Exalted Slaughter | #1 A · #2 A · #3 A (replaces involuntary Burning Vessels) · #4 S · #5 – |
| 12 | Black-Bile Congregation | CORRODE | Rust & Rot aura 3/6/9″ (no tokens) + UNYIELDING 5+ | Rupture the Blight-Sacs → permanent durability | Infected Ground · Death-Blister Brotherhood · Smog Engines | #1 A · #2 M (renamed) · #3 D · #4 D · #5 S |
| 13 | Moloch Iron-Forged | FUEL | Feed the Furnace + Siege-Masters | Red-Line the Boilers → durability dice | Grand Siege · Daemon-Forge · Iron Within | #1 A · #2 A · #3 S · #4 S (1 CP) · #5 D |
| 14 | Cabal of the Inverted Star | CAST | Inverted Rite: 6 spells (buff, debuff, damage, swap), 2D6 safe | Channel on 3D6 → backlash | Grand Coven · Automaton Legion · Geometry Weavers | #1 M (rolls, not points; renamed spells) · #2 A · #3 S · **#4 R (dice bank is Sun-Pyre's)** · #5 S |
| 15 | Velvet-Scourge Syndicate | TEMPT | Ecstasy of Pain | Temptation → opponent's choice | Sonic Choir · Masque of Blades · Carnival of Excess | #1 A · #2 A · #3 D · #4 D · #5 S |
| 16 | Starfire High-Court | DISENGAGE | Solar Grace glide (**escape capped 1/round**) + Dawnstones | Overcharged Dawnstone → tempo | Court of Blades · Prism Host · Wind-Rider Host | #1 M (escape cap) · #2 S (Sun-Crested Lancers) · #3 – · #4 A · #5 R |
| 17 | Sun-Scaled Temple-Host | SAVAGE | Predatory Jaws + Cold-Blooded crits | Apex Savagery → exposure | Sunclaw Hunt · **Starborne Prophecy (asterisms)** · Coalesced Scales | #1 A · #2 D · #3 D · #4 A · #5 S |
| 18 | Obsidian Forge-Tombs | ENDURE | Reanimation (4+, 1 per unit per round) + **one moving Grudge** | Burn the Ancestor-Spark → permanent resource | Immortal Shield-Wall · Grudge-Hunters · Rune-Forge | #1 M (capped) · **#2 M (one marker, re-roll 1s; see §3)** · #3 S · #4 D · #5 S |
| 19 | Skitter-Kin & Rad-Scavengers | SCURRY | Scurry 3″ react-move + Seething Swarm | More-More Rad-Power! → dice | Rad-Tech Clans · Burrowing Swarm · Skilled Manipulators | #1 M (3″) · #2 A · #3 M (no portals, capped refill) · #4 D · #5 S |
| 20 | Astral Shadow-Clans | AGONY | Agony Harvest (own bank, max 4) | All-In Assassination → resource | Skysplinter Raiders · Cyber-Ronin · Venom Cabal | #1 A (renamed) · #2 S · #3 M (no portals, no re-embark) · #4 S · #5 M (enhancement) |
| 21 | Rift-Stalker Menagerie | CONTRACT | 2 of 5 Mercenary Contracts; any archetype is legal | Objective Wager → objective | Free Company · Outcast Scavengers · Monster Hunters | All 5 contracts A, but the CP contract is capped to Rounds 1 and 3 |
| 22 | Radiant Concordat | SPOT | Spotters + Gilded Bulwark intercept | Blood-Offering → friendly durability | Patient Hunter · Killing Blow · Gore-Brute Retinue | #1 A · #2 M (intercept move, not damage transfer) · #3 D · #4 S · #5 S |
| 23 | Apex Bio-Swarm | ADAPTATION | Bio-Adaptations + Synapse | **Metabolic Overdrive** → durability dice | Invasion Swarm · Synaptic Vanguard · Bio-Titan Assault | #1 A · #2 A · #3 R (GW-adjacent name; global debuff) · #4 S · #5 S |
| 24 | Diesel-Skull War-Horde | RAMPAGE | Dakka + Scrap-Fury (once per battle) | Overcrank the Engine → dice | Speed-Cult · Bully Mobs · Tinker-Workshop | **#1 M (no Move+Charge, no army WARD)** · #2 M (crit 6s only) · #3 D · #4 D · #5 S |
| 25 | Eclipse Shadow-Fiends | HAUNT | Ethereal (WARD 5+ troops / 4+ elites, STEALTH >12″) + Wave of Terror | Phase-Walk → exposure | Midnight Procession · Soul-Reapers · Spectral Host | #1 M (STEALTH only >12″) · #2 A · #3 D · #4 S · #5 D |

---

## 3. Research that changed decisions (checked 2026-10)

| Finding | Effect on 4192 |
| :-- | :-- |
| space-dwarf leagues **retired Judgement Tokens** ("bad feelings at the table") for objective-based **Yield Points**. [Frontline Gaming][votann1], [community review][votann2] | Gemini scored "Book of Grudges" 10/10 with toxicity 1.5. **The real-world evidence says the opposite.** Obsidian gets ONE public Grudge (re-roll 1s only), and the stronger version is a detachment. |
| ghost armies a fantasy wargame: **every unit has a 5+ ward**, with worse base saves. [community review][nh1], [Woehammer][nh2] | Eclipse uses WARD 5+ on troops (matching a live design) and 4+ only on elite/Leader datasheets, never army-wide. Its army-wide STEALTH applies only beyond 12″. |
| cannibal ghoul courts a fantasy wargame: **delusions come from the heroes you bring**, not a half-army rule. [community review][fec1], [Spikeybits][fec2] | Mordant delusions became the three **detachments**, so the core is not another pick-1-of-3. |
| plague legions: Contagion Range **3″ → 6″ → 9″** by round, an aura with no tokens. [other wargames Community][dg1], [community review][dg2] | Black-Bile's aura copies the *shape* (a growing radius) but uses −1 ARM, so it doesn't stack with the 4192 wound table. |
| rat-folk armies a fantasy wargame: speed from withdraw rules plus **gnawholes**. [community review][sk1], [Sprues & Brews][sk2] | Scurry is kept, capped at 3″ once per round. **Gnawholes are not used (user: no portals).** Burrowing arrives from table edges or a drill *unit*. |
| star-lizard armies a fantasy wargame: an asterism at deployment, a **second in Round 3**. [community review][sera1] | Became Sun-Scaled's *Starborne Prophecy* detachment, not its core. |
| excess legions: **Thrill Seekers** (Advance or Fall Back, then still shoot and charge). [community review][ec1] | Velvet's *Masque of Blades* detachment and several Velvet datasheets use Fall-Back-and-act. It is not army-wide in the core rule. |
| daemon-smith dwarves: **Smog and Smoke** (−1 to Hit infantry within 9″ of war machines). [other wargames Community][hh1], [Frontline Gaming][hh2] | Became a stratagem and a Black-Bile detachment rule. Not a Moloch core rule, so Moloch keeps FUEL as its one verb. |
| Sisters of Battle: Miracle Dice are the army's strength; best on hard Wound rolls and **Damage**. [community review][sob1] | Pyre-Dice **cannot replace Damage rolls**, max 3 banked, one die per activation. Controlled variance without the spike. |

[votann1]: https://frontlinegaming.org/2025/07/18/fresh-ore-and-hot-bolts-every-new-release-for-the-revamped-leagues-of-votann/
[votann2]: https://www.goonhammer.com/goonhammer-reviews-codex-leagues-of-votann-10th-edition
[nh1]: https://www.goonhammer.com/goonhammer-reviews-nighthaunt-fourth-edition-battletome
[nh2]: https://woehammer.com/2024/07/20/4th-edition-faction-review-nighthaunt/
[fec1]: https://www.goonhammer.com/goonhammer-reviews-flesh-eater-courts-fourth-edition-battletome
[fec2]: https://spikeybits.com/aos-4th/flesh-eater-courts-faction-pack-battletome-review/
[dg1]: https://www.warhammer-community.com/en-gb/articles/tKUQbnR2/death-guard-rules-preview-part-5-contagions-of-nurgle/
[dg2]: https://goonhammer.com/the-goonhammer-review-the-10th-edition-death-guard-index
[sk1]: https://goonhammer.com/age-of-sigmar-skaven-battletome-goonhammer-review
[sk2]: https://spruesandbrews.com/2024/09/07/skaven-warhammer-age-of-sigmar-battletome-review-new-miniatures-unboxing-4th-edition/
[sera1]: https://goonhammer.com/faction-pack-overview-seraphon-age-of-sigmar-4th-edition
[ec1]: https://goonhammer.com/goonhammer-review-codex-emperors-children-10th-edition
[hh1]: https://www.warhammer-community.com/en-gb/articles/4mnabgwa/grotmas-calendar-day-2-the-helsmiths-of-hashut-join-the-battle-for-ghyran/
[hh2]: https://frontlinegaming.org/2025/09/05/harness-the-wrath-of-hashut-a-deep-dive-into-the-helsmiths-of-hashut/
[sob1]: https://goonhammer.com/codex-adepta-sororitas-10th-edition-the-goonhammer-review

---

## 4. Bias review: where this draft could be wrong

1. **Agreement bias toward Gemini.** Gemini's scores are self-assessed (most ideas 8.5–10 quality, 1.5–3 toxicity), and at least one is contradicted by real data (space-dwarf grudges).
   - I treated the scores as a menu, not a verdict.
   - **Changed or rejected: 27 of 125 ideas** at core level.
   - Most others were demoted to detachments or stratagems, so each faction has one clear verb.
2. **My own "pick 1 of 3" habit.**
   - Count of core rules that are an army-wide chooser:
     - **3**: Auric Stances, Apex Adaptations, Rift Contracts.
     - Golgotha's Orders are per-officer, so they don't count.
   - Mordant delusions, Sun-Scaled asterisms and Concordat pacing are all detachments now.
   - **Watch this when adding factions.**
3. **Flat-point abilities are guesses.** 288 of 572 abilities (50%) are priced by hand, not by dice maths.
   - They cluster in the most *distinctive* factions:
     - Bathys: harpoons.
     - Cabal: spells.
     - Aegis: facing.
     - Concordat: spotting.
     - Dread-Fleet: Plunder.
   - So those factions' prices are the **least** reliable.
4. **The simulator's blind spots.**
   - It is a 1-D battlefield, so drag, swap, facing, spells, sagas, grafts, Plunder and the Tide are invisible to it.
   - A draft faction near 50% in the gauntlet means its **dice** are fairly priced, not that its unique rules are.
5. **Filler risk at 20–30 datasheets.** Most factions have 4 Class-4 variants and 1 Class-5. These differ by weapon and ability, but some will feel samey on the table:
   - Aegis knights;
   - Golgotha tanks;
   - Bathys crawlers.
   - **Cut candidates:** Golgotha Inferno-Crawler, Aegis Warden-Class, Auric Solar Lance-Tank.
6. **Archetype sameness.** Every faction is built from the same 29 archetypes plus DNA. That keeps stat lines lawful, but a 20-unit faction can still read as "the template with new names." The specs mark where overrides and weapons were changed. Unchanged archetypes are the first place to add character.
7. **Release-faction drift.** Three rule changes alter the calibrated release five:
   - Cinder lost Burning Vessels (a −5% drawback);
   - Starfire's escape-glide is capped;
   - Golgotha and Apex gained priced gambles.
   - That is why the release balance was re-run before the gauntlet (§5).

---

## 5. Balance estimate (battle_sim)

<!--BALANCE-->
**Method.**
1. Re-balanced the release five (5 iterations × 1,500 games per pairing).
2. Ran each draft faction in a **gauntlet** against the five, which stay fixed (4 iterations × 1,000 games).
3. Ran a **fresh-seed check** that re-tunes nothing.

Lists are random legal-ish 1,000-pt armies. Terrain v2 and expected-value targeting are on.

**Release five (fresh seed 777, 1,500 games per pairing):**
- Auric 50.9%
- Golgotha 50.6%
- Cinder 50.3%
- Apex 49.6%
- Starfire 48.6%

New multipliers: Auric ×0.99, Golgotha ×0.99, **Cinder ×1.12** (was ×1.07; Burning Vessels removed, so it is stronger and pays for it), Apex ×0.99, Starfire ×0.91.

| # | Draft faction | Calculator only (iter 1) | Final FACTION_MULT | Fresh-seed check |
| :-: | :-- | --: | --: | --: |
| 03 | Sun-Pyre | 66.9% | ×1.090 | 47.8% |
| 04 | Aegis | 57.5% | ×1.025 | 52.3% |
| 05 | Bathys | 45.0% | ×0.972 | 49.2% |
| 06 | Sanguine | 61.0% | ×1.094 | 46.9% |
| 07 | Mordant | 69.0% | ×1.120 | 49.3% |
| 08 | Prometheus | 53.4% | ×1.027 | 47.1% |
| 09 | Frost-Skaer | 58.3% | ×1.055 | 50.6% |
| 10 | Dread-Fleet | **29.8%** | ×0.857 | 51.0% |
| 12 | Black-Bile | 49.7% | ×0.981 | 51.5% |
| 13 | Moloch | 60.9% | ×1.057 | 51.4% |
| 14 | Cabal | 47.2% | ×0.986 | 47.3% |
| 15 | Velvet | 61.2% | ×1.050 | 48.4% |
| 17 | Sun-Scaled | **69.2%** | ×1.154 | 48.9% |
| 18 | Obsidian | 42.0% | ×0.968 | 46.0% |
| 19 | Skitter-Kin | **31.9%** | ×0.868 | 50.3% |
| 20 | Shadow-Clans | **30.0%** | ×0.888 | 48.8% |
| 21 | Rift-Stalker | 56.0% | ×1.008 | 52.8% |
| 22 | Concordat | 62.3% | ×1.093 | 46.0% |
| 24 | Diesel-Skull | 37.9% | ×0.933 | 51.0% |
| 25 | Eclipse | 50.7% | ×0.984 | 50.7% |

**How to read this (the important part)**
- **Calculator alone** spread from 30% to 69%. **After the multipliers**, every draft faction lands at **46–53%** on a fresh seed.
- **Discounted factions (×0.86–0.93: Dread-Fleet, Skitter-Kin, Shadow-Clans, Diesel-Skull).** Their *dice* are weak. Their identity lives in rules the sim cannot see:
  - Plunder CP;
  - Scurry react-moves;
  - Agony;
  - Overcrank.
  - **Risk: these four may now be undercosted on the table.** Playtest them early and keep their multipliers at least ×0.90 until then.
- **Taxed factions (×1.09–1.15: Sun-Scaled, Mordant, Sanguine, Concordat, Sun-Pyre).** Their dice-level abilities are strong in melee or shooting:
  - free jaws;
  - Feeding Frenzy;
  - Hunger;
  - Spotting;
  - Pyre-Dice.
  - This is closer to real, but the sim gives every melee unit a strike-first charge, so melee factions may be slightly over-taxed.
- **Bathys, Cabal and Aegis** sit near ×1.0 because the sim ignores drag, spells and facing. **Their balance is unknown, not proven.**
<!--/BALANCE-->

---

## 6. Counts

<!--COUNTS-->
| | Before | Now |
| :-- | --: | --: |
| Release datasheets (5 factions) | 100 | **150** |
| Other factions, full datasheets with priced abilities | 0 (148 base-price drafts) | **400** |
| **Total datasheets** | 100 | **550** |
| Unit abilities (priced / text-only) | ~95 | **572 (568 / 4)** |
| Detachments / enhancements / stratagems | 15 / 30 / 45 + 57 sketched | **75 / 150 / 225** |
| Factions with core rule + gamble | 5 (gamble on 1) | **25 / 25** |

**What a random 1,000-pt army looks like** (300 random lists per faction; your target was 5–15 units):

| # | Faction | Units avg (range) | Models avg | Class 5 pts |
| :-: | :-- | :-: | --: | --: |
| 01 | Auric | 6.5 (5–9) | 17 | 425 |
| 02 | Golgotha | 10.0 (6–13) | 32 | 310 |
| 03 | Sun-Pyre | 7.1 (5–9) | 22 | 425 |
| 04 | Aegis | 6.9 (5–10) | 14 | 445 |
| 05 | Bathys | 7.5 (5–10) | 20 | 385 |
| 06 | Sanguine | 6.6 (5–9) | 22 | 345 |
| 07 | Mordant | 8.5 (5–11) | 28 | 305 |
| 08 | Prometheus | 8.1 (6–11) | 20 | 330 |
| 09 | Frost-Skaer | 8.0 (5–11) | 22 | 315 |
| 10 | Dread-Fleet | 11.4 (8–15) | 31 | 255 |
| 11 | Cinder | 6.2 (5–9) | 18 | 460 |
| 12 | Black-Bile | 6.7 (5–9) | 21 | 430 |
| 13 | Moloch | 7.2 (5–10) | 18 | 400 |
| 14 | Cabal | 7.8 (5–10) | 24 | 330 |
| 15 | Velvet | 7.8 (5–10) | 20 | 410 |
| 16 | Starfire | 8.6 (5–12) | 24 | 360 |
| 17 | Sun-Scaled | 6.5 (5–10) | 16 | 370 |
| 18 | Obsidian | 7.0 (5–9) | 17 | 355 |
| 19 | Skitter-Kin | 10.8 (8–14) | 39 | 255 |
| 20 | Shadow-Clans | 9.7 (7–13) | 25 | 220 |
| 21 | Rift-Stalker | 9.9 (7–13) | 33 | – |
| 22 | Concordat | 7.2 (5–10) | 19 | 415 |
| 23 | Apex | 7.6 (5–10) | 25 | 450 |
| 24 | Diesel-Skull | 8.6 (6–11) | 27 | 325 |
| 25 | Eclipse | 8.5 (6–11) | 26 | 290 |

**Per-faction composition** (C1/C2/C3/C4/C5 datasheets; "flat" = hand-priced abilities):

| # | Faction | Verb | Datasheets | Leaders | Battleline | C1/C2/C3/C4/C5 | Abilities | dice | buff/aura | keyword | flat |
| :-: | :-- | :-- | --: | --: | --: | :-: | --: | --: | --: | --: | --: |
| 01 | Auric Solar-Host | MARTIAL STANCES | 30 | 6 | 3 | 11/9/3/6/1 | 28 | 15 | 6 | 0 | 7 |
| 02 | Golgotha Trench-Legions | ORDERS | 30 | 8 | 1 | 15/6/2/6/1 | 23 | 8 | 5 | 3 | 6 |
| 03 | Sun-Pyre Witch-Courts | FAITH | 20 | 4 | 2 | 9/5/1/4/1 | 27 | 14 | 5 | 1 | 7 |
| 04 | Aegis Knight-Houses | FACING | 20 | 4 | 2 | 5/4/3/7/1 | 23 | 6 | 3 | 0 | 14 |
| 05 | Abyssal Bathys-Corps | DRAG | 20 | 4 | 2 | 7/6/2/4/1 | 26 | 6 | 3 | 0 | 17 |
| 06 | Sanguine Aristocracy | FEED | 20 | 5 | 2 | 8/6/2/3/1 | 28 | 11 | 5 | 1 | 11 |
| 07 | Mordant Ghoul-Courts | REPLENISH | 20 | 5 | 2 | 8/6/2/3/1 | 23 | 7 | 4 | 1 | 11 |
| 08 | Prometheus Flesh-Guilds | GRAFT | 20 | 4 | 2 | 6/6/3/4/1 | 23 | 8 | 3 | 0 | 12 |
| 09 | Frost-Skaer Blood-Raiders | SAGA | 20 | 5 | 2 | 9/4/3/3/1 | 22 | 6 | 3 | 1 | 12 |
| 10 | Dread-Fleet Buccaneers | PLUNDER | 20 | 4 | 2 | 9/4/3/3/1 | 21 | 3 | 3 | 1 | 14 |
| 11 | Cinder-Gorged Legion | BLOOD CLOCK | 30 | 7 | 2 | 11/8/4/6/1 | 20 | 5 | 7 | 1 | 6 |
| 12 | Black-Bile Congregation | CORRODE | 20 | 4 | 2 | 7/6/2/4/1 | 23 | 4 | 4 | 0 | 15 |
| 13 | Moloch Iron-Forged | FUEL | 20 | 4 | 2 | 7/5/3/4/1 | 22 | 6 | 3 | 0 | 13 |
| 14 | Cabal of the Inverted Star | CAST | 20 | 5 | 2 | 7/6/2/4/1 | 27 | 7 | 2 | 1 | 17 |
| 15 | Velvet-Scourge Syndicate | TEMPT | 20 | 4 | 2 | 6/6/3/4/1 | 25 | 5 | 2 | 7 | 11 |
| 16 | Starfire High-Court | DISENGAGE | 30 | 7 | 2 | 13/7/5/4/1 | 17 | 5 | 5 | 0 | 6 |
| 17 | Sun-Scaled Temple-Host | SAVAGE | 20 | 5 | 2 | 7/5/2/5/1 | 24 | 3 | 5 | 1 | 15 |
| 18 | Obsidian Forge-Tombs | ENDURE | 20 | 4 | 2 | 6/6/2/5/1 | 22 | 8 | 2 | 0 | 12 |
| 19 | Skitter-Kin & Rad-Scavengers | SCURRY | 20 | 4 | 2 | 8/5/2/4/1 | 26 | 9 | 4 | 0 | 13 |
| 20 | Astral Shadow-Clans | AGONY | 20 | 4 | 2 | 6/7/2/4/1 | 24 | 5 | 2 | 3 | 14 |
| 21 | Rift-Stalker Menagerie | CONTRACT | 20 | 4 | 2 | 11/5/2/2/0 | 4 | 0 | 2 | 0 | 2 |
| 22 | Radiant Concordat | SPOT | 20 | 4 | 2 | 7/7/1/4/1 | 27 | 7 | 3 | 0 | 17 |
| 23 | Apex Bio-Swarm | ADAPTATION | 30 | 6 | 2 | 8/11/3/7/1 | 22 | 2 | 5 | 4 | 10 |
| 24 | Diesel-Skull War-Horde | RAMPAGE | 20 | 4 | 2 | 7/6/2/4/1 | 23 | 6 | 3 | 0 | 14 |
| 25 | Eclipse Shadow-Fiends | HAUNT | 20 | 4 | 2 | 8/5/3/3/1 | 22 | 6 | 3 | 1 | 12 |
<!--/COUNTS-->

---

## 7. Next steps (recommended order)
1. **Playtest the three least-certain factions first:** Cabal (spells), Bathys (drag) and Aegis (facing). Their flat-point abilities carry the most pricing risk.
2. Write 1,000-pt sample lists for each new faction (`lists/`). Check that each reaches 5–15 units and passes muster.
3. Teach the simulator Danger-Close, Overcharge and Temptation. These have dice outcomes it can model, which would move about 30 flat-priced abilities into the measured group.
4. Do a filler pass: cut or merge the weakest Class-4 variants (§4.5) before writing prose for the registry.


---

## 8. v4.3.1 — Full verification pass (2026-10-18)

`scripts/verify_all.py` → [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md). Every check re-runs in about 10 seconds.

**Found and fixed**
| Finding | Fix |
| :-- | :-- |
| **Damage formula off by −33% to +27%** for random-Damage weapons against multi-MIGHT models, and for UNYIELDING against big hits. Found by comparing the calculator to brute-force dice. | The formula is now exact: MIGHT removed per wound = W ÷ E[wounds to kill one model], with UNYIELDING rolled per damage point. Residual error is −6% to +8% (dice noise). Re-fitted on the 1,218 40k datasheets (R² 0.798, unchanged). |
| 5 abilities priced at 0. Crit-on-5+ without a crit trait; a +1 to Hit already at the 2+ cap; a name collision. | Rewritten so each one does something, and priced. |
| 1 stratagem at 0 CP (Cinder *Challenge Accepted*) | Now 1 CP with a real effect. |
| 48 enhancements measured under 5 pts | Design floor of **10 pts** (`ENHANCEMENT_MIN_PTS`). |
| 14 Class 3–4 vehicles priced 55–105. The sim cannot value transports or line-of-sight blocking. | Design floor per Class: C3 ≥ 60, C4 ≥ 110, C5 ≥ 200 (`CLASS_MIN_PTS`). |

**Recalibration (the damage fix changed every price)**
1. **Class multipliers and the melee correction** were re-learned (3 iterations).
2. **The 5 release factions** were re-balanced.
3. **Per-datasheet correction** (`scripts/unit_fix.py`, two rounds):
   - only *dice-pure* non-Leader units (flat-priced rules under 12% of the price);
   - the square root of the measured value-per-point gap, capped at ±25%;
   - **222 entries** in `UNIT_MULT`.
4. **All 25 factions** were balanced jointly on the full round robin.

**Results on fresh seeds**
| Measure | Before | After |
| :-- | :-- | :-- |
| 25×25 round robin, faction average win rate | 46.0% – 55.9% | **47.4% – 52.1%** (200 games per pairing); **46.0% – 52.8%** after the Class price floor (120 games per pairing, ±1% noise) |
| Datasheets within 0.75–1.33× median value per point | 51% | **77%** |
| Datasheets above 1.6× (clearly underpriced) | 47 | **3** |
| Datasheets below 0.6× | 62 | 42 (support, aura and rule-heavy units; left alone on purpose) |

**What still needs a table (the simulator cannot judge it)**
- **The 42 low-measuring units** are almost all Leaders with auras or heals, snipers, spotters, transports and infiltrators. Their value lives in rules the 1-D simulator ignores.
- **Melee-heavy factions carry the largest taxes:**
  - Cinder ×1.25;
  - Sun-Scaled ×1.21;
  - Mordant ×1.20;
  - Sanguine ×1.16.
  - The simulator gives every charge a free first strike and has no terrain to charge through. If table games show these armies struggling, lower their multipliers first.
- **Discounted factions (×0.84–0.88):** Dread-Fleet, Astral Shadow-Clans, Skitter-Kin, Starfire, Obsidian. Their identity rules are partly invisible to the simulator. Watch for them over-performing.
- **Known 1–3% inconsistency** (B in the report): abilities are priced by the Lanchester rule but base stats by the fitted formula. So improving a stat that makes an ability redundant can lower the price slightly. Only 2 datasheets show it after rounding (−5 pts each).


---

## 9. v4.3.2: Roles, range and weapon traits (2026-10-18)

The question this round answered: *a flamer should be judged against chaff and a lance against tanks, not against one average.*
New tools:
- `scripts/trait_lab.py` → `python3 scripts/trait_lab.py` (writes calc_output/trait_lab.md)
- `scripts/role_lab.py` → [ROLE_REPORT.md](ROLE_REPORT.md)

### Weapon traits: calculator vs simulator, one by one
Each trait was fired with and without the trait at a target and distance where it should matter, plus a control where it should not.

**26 / 26 pass**: both tools agree on the effect within a few percent.

| Gap found | Fix |
| :-- | :-- |
| `[OVERLOAD]` self-damage (1–2 on a D6 → 1 Fatal Wound; 3 for Class 4–5) was neither priced nor simulated, so plasma-type units looked better than they are | Simulated per firing model. Priced as a drawback scaled by how much the unit relies on that weapon. |
| Cover (−1 to Hit at range) existed in the simulator but not in the calculator, so `[IGNORES COVER]` and `[INDIRECT FIRE]` were free | The calculator blends Cover at 50% vs Class 1–3 targets, the same as the simulator. |
| `[PSYCHIC / ARCANE]` (ignore negative Hit modifiers) was not modelled anywhere | Both tools now apply it. |
| **Overkill**: the calculator could "kill" 13 MIGHT out of a 10-MIGHT horde | Damage per Shoot/Fight is capped at the target unit's MIGHT. |
| `[PRECISION]` (snipe Leaders) was unpriced | Small utility (3%, minimum 2 pts). |

### Roles: what each unit is for
- Every unit gets a profile against 6 target types (horde, line, elite, heavy, monster, vehicle).
- Its role is its best matchup relative to all units: anti-horde 151, anti-infantry 18, anti-elite 105, anti-armour 118, plus transport 31 and support 8.
- It is then ranked only against its role peers.

**The target mix was wrong.**
- The calculator assumed enemy armies were 35% horde / 45% elite / 20% tank.
- Measured:
  - random armies: 16 / 45 / 39 %;
  - legal lists: 23 / 51 / 27 %.
- **Now 20 / 47 / 33 %.** This also improved the fit to GW's own sci-fi wargames points (R² 0.798 → 0.804).

| Role | Value per point in played games, before | After |
| :-- | --: | --: |
| anti-horde | 0.95 | 0.97 |
| anti-infantry | 0.70 | 0.92 |
| anti-elite | 1.06 | 1.03 |
| anti-armour | 1.08 | 1.03 |

**Specialists do their job in played games.** Damage per point against each target type, ×median unit (bold = the role's own target):

| Role | vs horde | vs line | vs elite / Class 2 | vs Class 3–5 |
| :-- | --: | --: | --: | --: |
| anti-horde (flamers, swarms, berserkers) | **1.21** | 1.20 | 0.76 | 0.64 |
| anti-infantry | 1.15 | **1.07** | 0.81 | 0.79 |
| anti-elite | 1.06 | 1.02 | **1.25** | 1.21 |
| anti-armour (melta, lances, rail) | 0.80 | 0.94 | 1.23 | **1.65** |

**Design flag: some specialists are squad-wide.** Their efficiency in role is very high because *every* model carries the special weapon:
- Purgator Vanguard (melta + flamer ×5);
- Plasma-Welder Team;
- Vindicant Squad;
- Iron-Devourer Heavy Squad.

They are priced correctly now (per-unit corrections), but a "1 special weapon per 5 models" loadout would feel more like the source games. The builder would need mixed-loadout support; that is a recommended next step.

### Range
- The simulator now plays all three maps (14″ / 18″ / 24″ no-man's-land), with deployment up to 6″ deep. Before, every weapon beyond 24″ looked the same.
- Measured value of range: about +11–15% value per point for doubling range.
- The calculator now prices it: ranged damage × (range / 24″)^0.15, so a 12″ gun is ×0.90 and a 48″ gun ×1.11.
- A residual of about +0.19 remains, almost all from >36″ artillery. Part of it is a simulator artefact (long-range units hang back and survive, and surviving counts as value), so it is not chased further. **Table playtests should judge artillery.**

### Final numbers (fresh seeds)
| Measure | Result |
| :-- | :-- |
| Weapon-trait agreement, calculator vs simulator | 26 / 26 |
| 25×25 faction average win rate | **46.9% – 52.1%** |
| Datasheets within 0.75–1.33× median value per point | 70% |
| Clearly underpriced (>1.6×) | 2 |
| Below 0.6× | 76: transports, aura/heal Leaders, spotters, support engines. Their value is in rules the 1-D simulator cannot see. |
| verify_all: errors / out-of-band prices / legal sample lists | 0 / 0 / 25 of 25 |
