# 4192 AD — Faction Design Guide (Permanent Reference)
**Project Codex: Iron & Wrath** · v1.0 · 2026-10-16
*The single source of truth for what every faction IS, how it FEELS, and which part of the engine it OWNS. Names are working titles.*

> **How to use this.** Before writing any unit, ability, reaction card or detachment, find the faction's **Identity Card** (§5). Every rule you write must touch that faction's **Owned Verb**. If a rule touches another faction's verb, it is wrong for this faction. Price everything with `gametheory/scripts/unit_calculator.py` (base stats) and the delta method (abilities), as described in `UNITS_CALCULATION_REFERENCE.md`.

---

## 0. Decisions to lock before designing (canon conflicts found)

Your files disagree in several places. These need one answer each; my recommendation is in **bold**.

| # | Conflict | Sources | Recommendation |
| :-: | :-- | :-- | :-- |
| 1 | **Currency:** CP (3 per round + Tactical Cards) vs "Fury" | Core manual §2 vs roster / Antigravity prompt | ✅ **DECIDED:** 3 CP per round (refreshed) + underdog CP, plus free ⟳/✦ exhaustible unit abilities. See `GAME_SYSTEM_PLAN.md` §4. |
| 2 | **What a Class is:** base size (C1 25–32mm … C5 130mm+) vs role (C3 = "Champion 32–50mm") | Manual §1.2 + Proxy Standard vs roster §2 | **Class = physical base only** (it drives LoS, screening and leader attachment). Role is a separate tag: *Trooper / Elite / Leader / Brute / Behemoth*. A Leader can sit on any class. |
| 3 | **Status effects:** `[RATTLED]` and `[PINNED DOWN]` | roster reaction cards, prompt | ✅ **DECIDED:** Suppression (Rattled → Pinned) is core, alongside Broken. See `GAME_SYSTEM_PLAN.md` §5. |
| 4 | **Action menu:** Advance/Rush/Snap Fire/Hunker | Antigravity prompt | **The manual's menu is canon** (Move, Shoot, Charge with no Move first, Fight, Rally/Brace). |
| 5 | **Armored keyword:** `[ARMORED HULL]` vs `[HARDENED]` | roster vs manual | **`[HARDENED]`**, standard on Class 4–5. Infantry get it only as a named faction exception. |
| 6 | **Battle length** | manual: 4 rounds | **4 rounds.** The calculator now averages One Shot weapons over 4 rounds. |
| 7 | **Points scale** | budgets vs calculator | ✅ **DECIDED: ×1.5.** 1,000 pts = 5–15 units (typically 6–11). See `GAME_SYSTEM_PLAN.md` §2–3. |
| 8 | **power-armoured super-soldiers have no clear home** (the most-owned army in the hobby) | proxy notes | ✅ **DECIDED:** Auric = golden guardians + power-armoured super-soldiers, the flagship faction. Drafted in `factions/01_auric_solar_host.md`. |
| 9 | **Antigravity's prompt** | prompt file | **Retire it.** Its maths, rules and faction levers disagree with the manual and the roster. This guide replaces it. |

---

## 1. The Design Constitution (rules for writing rules)

### 1.1 The Ownership Rule: one verb per faction
Each faction **owns exactly one engine verb** (§4). No other faction may use it as a faction rule. Others interact with it only through the 10 universal Core Tactics. This is what makes 25 armies feel like 25 different games.

### 1.2 The Ability Ladder: every army is built Feed → Exploit → Amplify → Payoff
| Role | Job in the faction's verb | Example (Auric, verb = MARTIAL STANCES) |
| :-- | :-- | :-- |
| **Trooper** (C1) | **Feeds** the verb (makes the resource, or *is* the resource) | Sworn Battle-Brothers hold objectives in any Stance |
| **Elite** (C1–C2) | **Exploits** it (gets the strongest benefit) | Gilded Phalanx fight on, protected by thralls |
| **Leader** | **Amplifies** it (range, efficiency, a once-per-game boost) | Praetor extends the chain range from 3" to 6" |
| **Brute** (C3) | **Payoff #1**: a big body that turns the verb into damage | Reliquary-Sentry gains power for each thrall spent |
| **Behemoth** (C4–C5) | **Payoff #2**: the army's centrepiece / win condition | Grav-Cruiser carries thralls; its hull redirects too |

### 1.3 Ability budget (stops rule bloat)
| Role | Unit abilities | Weapon traits per weapon | Notes |
| :-- | :-: | :-: | :-- |
| Trooper | 1 (must Feed) | ≤ 1 | Keep these simplest: they're the most-played cards |
| Elite | 1–2 | ≤ 2 | |
| Leader | 2 + 1 Leader aura/buff | ≤ 2 | The aura is priced as a leader buff (×1 squad) or aura (×2.2 units) |
| Brute / Behemoth | 2 | ≤ 3 | |

- **Keyword-first:** use the 38 keywords in the manual §5 before writing new text. Write new words only for the faction's verb.
- **Template:** every ability = **WHEN** (trigger) · **EFFECT** · **LIMIT** (once per activation / round / battle).
- **Every faction has one written Weakness.** It is part of the design. Never "fix" it with a later unit.

### 1.4 Shared tiers (so "fast" or "tough" means the same thing everywhere)
| Tier | Speed (MOV, foot) | Durability (C1 model) | Density (models per 1,000 pts) | Melee/Ranged skill |
| :-- | :-- | :-- | :-- | :-- |
| ▼▼ | 4" | MIGHT 1, ARM 6+ | Ultra-elite 6–10 | 5+ |
| ▼ | 5" | MIGHT 1, ARM 5+ | Elite 10–15 | 4+ |
| ● baseline | 6" | MIGHT 1, ARM 4+ | Standard 16–22 | 4+/3+ |
| ▲ | 7–8" | MIGHT 2, ARM 3+ | Horde 23–30 | 3+ |
| ▲▲ | 9"+ / FLY | MIGHT 2 + WARD/UNYIELDING | Swarm 30–40 | 2+ |

### 1.5 Pricing law
`Points = calculator base price (stat line) + delta-method ability price + utility surcharge`. **No flat percentages from Part 2.**

---

## 2. Collisions in the current roster (fixed by the Ownership Matrix)

| Collision | Factions involved | Resolution |
| :-- | :-- | :-- |
| "Disengage after melee" ×3 | Starfire Sidestep, Buccaneer Boarding Hook, Shadow-Clan Strike & Fade | **Starfire owns it.** Buccaneers get Boarding; Shadow-Clans get activation timing. |
| Healing ×4 | Sanguine lifesteal, Mordant D3 heal, Apex regrowth card, Sun-Scaled −1 damage | **Sanguine owns healing.** Mordant **grows models**, Obsidian **revives**, Skitter **recycles units**, Apex adapts. |
| Sacrificing own models ×3 | Auric thralls, Moloch fuel, Concordat Ogre MIGHT | **Moloch owns consumption.** Auric *redirects* (thralls die defending). Concordat sacrifices **enemies** (Offerings). |
| Death-strike ×2 | Cinder "Blood for Blood", Prometheus "Emergency Overcharge" | Cinder keeps it. Prometheus gets a graft-salvage card. |
| Concealment ×2 | Bathys fog `[STEALTH]`, Frost-Skaer blizzard `[STEALTH]` | **Bathys owns fog.** Frost-Skaer runes buff might, not stealth. |
| Self-damage for power ×2 | Cinder sacrifice-MIGHT, Skitter Overcharge | **Skitter owns the gamble.** Cinder's self-burn becomes a round-end pressure clock. |
| Copies of Core Tactics | Shadow-Clans 3 actions (= Tactic 10), Diesel Ramming Speed (= Tactic 7) | Shadow-Clans → activation order. Diesel → velocity. Aegis may *upgrade* Tactic 7 (Joust), because impact is its signature. |
| "Ignore negative hit modifiers" ×2 | Sun-Scaled vs the `[PSYCHIC]` keyword | Cabal keeps it via `[PSYCHIC]`. Sun-Scaled owns **critical range**. |
| Spotting ×2 | Golgotha artillery spotters, Concordat Blood-Marks | Golgotha → **Orders** (fire missions are one order). Concordat owns **marks on enemies**. |
| −1 Damage ×2 | Black-Bile (prompt), Sun-Scaled card | Neither. −1 Damage stays a unit ability for very few big units. |

---

## 3. The Universal Chassis (= Faction 21's toolkit and every faction's starting point)

Every unit in every faction starts as one of these chassis plus the faction's **Stat DNA** (§5) and abilities. Prices come from `unit_calculator.py` (raw, before the scale). **The full, current list (29 archetypes at the ×1.5 scale) is [`UNIT_CATALOGUE.md`](UNIT_CATALOGUE.md); the table below is the original sketch.**

| Chassis | Class | Models | MOV | MS | RS | ARM | MIGHT | CTRL | Weapons (A / Wound / PEN / D) | Raw pts | ×2 |
| :-- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-- | :-: | :-: |
| Conscript Squad | 1 | 5 | 6" | 4+ | 4+ | 5+ | 1 | 2 | rifle 1/5+/0/1 `[HAILFIRE 1]`; bayonet 1/5+/0/1 | 40 | 80 |
| Line Squad | 1 | 5 | 6" | 4+ | 4+ | 4+ | 1 | 2 | rifle 2/4+/0/1; blade 2/4+/0/1 | 55 | 110 |
| Battle-Brother Squad | 1 | 5 | 6" | 3+ | 3+ | 3+ | 2 | 2 | heavy rifle 2/4+/−1/1 `[HAILFIRE 1]`; chain-blade 3/4+/−1/1 | 85 | 170 |
| Elite Squad | 2 | 3 | 6" | 3+ | 3+ | 3+ (WARD 5+) | 4 | 1 | storm gun 3/4+/−1/1; power maul 4/3+/−2/2 | 95 | 190 |
| Shock Cavalry | 2 | 3 | 10" | 3+ | 4+ | 4+ | 4 | 1 | lance 3/3+/−1/2 `[CRASHING]`; carbine 2/4+/0/1 | 75 | 150 |
| Leader | 2 | 1 | 6" | 2+ | 3+ | 3+ (WARD 5+) | 5 | 1 | sidearm 2/4+/−1/1; relic blade 5/3+/−2/2 | 55 | 110 |
| Brute / Light Walker | 3 | 1 | 7" | 3+ | 4+ | 3+ | 9 | 3 | autocannon 3/3+/−1/2; fists 4/2+/−2/3 | 75 | 150 |
| Battle Tank | 4 | 1 | 10" | 4+ | 4+ | 3+ `[HARDENED]` | 16 | 3 | cannon D6/2+/−1/3 `[SHRAPNEL 1]`; las-lance 1/2+/−3/D6+1 | 120 | 240 |
| Colossal Engine | 5 | 1 | 10" | 3+ | 3+ | 3+ `[HARDENED]` WARD 5+ | 28 | 6 | titan cannon 2D6/2+/−2/3; doom-lance 2/2+/−4/D6+2 | 260 | 520 |

**Reference forces at the chosen ×1.5 scale:** see the three validated 1,000-pt lists in `GAME_SYSTEM_PLAN.md` §7 (6, 8 and 11 units).

---

## 4. The Ownership Matrix (25 verbs, no repeats)

| # | Faction | **Owned verb** | One-line mechanic | Changed from current roster? |
| :-: | :-- | :-- | :-- | :-- |
| 1 | Auric Solar-Host | **MARTIAL STANCES** | Army-wide Stance each round + one Solar Overdrive gamble | Revised 2026-10-17: pure elite, Thrall-Chain removed (sacrifice moves to Moloch) |
| 2 | Golgotha Trench-Legions | **ORDERS** | Officers issue orders; fire missions; `[SECURED]` lines | Spotting folded into Orders |
| 3 | Sun-Pyre Witch-Courts | **DICE BANKING** | Martyrdom & fire bank dice that replace rolls | Pool cap 3 (not 6) |
| 4 | Aegis Knight-Houses | **FACING** | Front arc ward; rear is weak; free joust impact | Only faction with arcs |
| 5 | Abyssal Bathys-Corps | **DISPLACEMENT** | Harpoons drag, vents push; brine-fog fields | Owns `[STEALTH]` auras |
| 6 | Sanguine Aristocracy | **LIFESTEAL & DUELS** | Kills heal; free Epic Challenges | Loses "+2" vs wounded" (goes to Velvet's theme) |
| 7 | Mordant Ghoul-Courts | **GROWTH** | Feeding adds models beyond starting size | Healing replaced by growth |
| 8 | Prometheus Flesh-Guilds | **GRAFTING** | Harvest tokens → permanent upgrades, chosen by you | Keeps lever; death-card changed |
| 9 | Frost-Skaer Blood-Raiders | **OATHS** | Units swear deeds; fulfilled oaths ignite runes | Stealth chant removed |
| 10 | Dread-Fleet Buccaneers | **PLUNDER** | Steal CP, objectives and loot; shoot/move in any order | Disengage card replaced by Boarding |
| 11 | Cinder-Gorged Legion | **BLOOD CLOCK** | Every death on the table escalates the army | Self-sacrifice → round-end burn |
| 12 | Black-Bile Congregation | **CONTAGION** | Stacking Rot tokens on enemy units | Aura → persistent stacking tokens |
| 13 | Moloch Iron-Forged | **CONSUMPTION** | Feed friendly troops to engines; siegecraft | Sole owner of self-sacrifice |
| 14 | Cabal of the Inverted Star | **SPACE** | Teleport / swap positions with Fate | Keeps lever; dice tricks trimmed |
| 15 | Velvet-Scourge Syndicate | **PAIN = POWER** | Units get better once wounded; speed; sonic | Status effects reworded |
| 16 | Starfire High-Court | **DISENGAGE** | Glide away after acting; FLY | Sole owner of post-action movement |
| 17 | Sun-Scaled Temple-Host | **CRITICAL RANGE** | Crits on 5+ when predation conditions are met | Modifier immunity removed |
| 18 | Obsidian Forge-Tombs | **REVIVE** | Slain models stand back up at round end | Infantry lose `[HARDENED]` |
| 19 | Skitter-Kin & Rad-Scavengers | **GAMBLE & RECYCLE** | Overcharge with self-risk; dead units return | Adds unit recycling |
| 20 | Astral Shadow-Clans | **ACTIVATION ORDER** | Interrupt / delay / chain activations | 3-actions trait removed (= Core Tactic) |
| 21 | Rift-Stalker Menagerie | **CONTRACTS** | Pre-battle doctrine choice; any model, any chassis | Contracts get prices |
| 22 | Radiant Concordat | **MARKING** | Blood-Marks on enemies; kills on marked = Offerings | Ogre MIGHT sacrifice removed |
| 23 | Apex Bio-Swarm | **ADAPTATION** | Army-wide mutation chosen each round; synapse | Keeps lever |
| 24 | Diesel-Skull War-Horde | **VELOCITY** | Bonuses scale with distance moved; one RAMPAGE! | Ramming copy removed |
| 25 | Eclipse Shadow-Fiends | **INTANGIBILITY** | Phase through everything; untargetable at range | Keeps lever; CTRL penalty added |

---

## 5. Faction Identity Cards

**Card legend.** Stat DNA arrows are relative to the Universal Chassis: **MOV · MS · RS · ARM · MIGHT · CTRL**.

- **Density** = models per 1,000 pts.
- **Palette** = the weapon traits this faction leans on, and the ones it **never** gets.

### GRAND ALLIANCE 1 — THE CROWN OF SOLIS
*Industrial faith, brass, gas masks, holy fire, deep-sea pressure.*

#### 1. Auric Solar-Host — MARTIAL STANCES *(revised 2026-10-17: pure elite, no Thralls)*
- **Fantasy / proxy:** Gilded demigods (golden guardians / storm-forged paladin, tier 3) leading oath-sworn power-armoured Battle-Brothers (power-armoured super-soldiers, tier 2).
- **Core trait:** *Martial Stances* each Command Phase: Aegis / Vanguard / Executioner.
- **High-risk option:** *Solar Overdrive* (⟳ one unit per round: +1 Attack and [SHREDDING WOUNDS], but ARM 1 worse until it next activates).
- **Density:** 17–28 models. **Weakness:** few activations; out-scored on spread objectives; Overdriven units are exposed.
- **Full roster (20 datasheets) and 3 detachments:** `factions/01_auric_solar_host.md` and `FACTION_REGISTRY.md` §1.

#### 2. Golgotha Trench-Legions — ORDERS
- **Fantasy / proxy:** Faceless millions in greatcoats and gas masks behind wire and artillery. Proxies: massed human armies, trench-soldier, free-city armies, Trench Crusade.
- **Feels like:** you win the map, not the fight. Officers turn mediocre soldiers into a machine.
- **Core trait, Chain of Command:** When an Officer activates, it issues **1 Order** to a friendly unit within 12" that hasn't activated:
  - *Take Aim!* +1 to Hit; the unit can't Move.
  - *Forward!* The unit may Shoot after its second Move.
  - *Dig In!* Cover, and it counts as Braced.
  - *Fire Mission!* An `[INDIRECT FIRE]` unit hits on 4+ against any enemy a Golgotha unit can see.
- **Line squads** carry `[SECURED]` as a unit keyword.
- **Stat DNA:** MOV ● · MS ▼ · RS ● · ARM ▼ · MIGHT ● · CTRL ▲▲. **Density:** 26–34.
- **Palette:** `[HAILFIRE]`, `[INDIRECT FIRE]`, `[SHRAPNEL]`, `[HEAVY]`, flamers. **Never:** `[STRIKE FIRST]`, `[SHREDDING WOUNDS]`.
- **Weakness:** poor quality per model; units Break easily; killing Officers slows the whole army; weak in melee.
- **Signature card, Rolling Barrage (2 CP):** mark a 6" zone. Each enemy model that ends a move in it suffers a Fatal Wound on 1–2.
- **Abilities come from:** rank (officers, commissars), trench engineering (wire, sandbags), artillery.

#### 3. Sun-Pyre Witch-Courts — DICE BANKING
- **Fantasy / proxy:** Spiked-crown inquisitors, burning saints on poles, flamer zealots. Proxies: Sisters of Battle, Witch Hunters, Flagellants.
- **Feels like:** martyrdom becomes miracles. The more they burn and bleed, the more certain their fate.
- **Core trait, Pyre-Dice:**
  - **Bank a die:** each time a friendly unit is destroyed, or a `[SCORCH]` attack inflicts unsaved damage, roll a D6 and bank it. **Pool max 3.**
  - **Spend a die:** use one in place of any Hit, Wound or Save roll you are about to make.
- **Stat DNA:** MOV ● · MS ▲ · RS ▲ · ARM ▲ (sisters) / ▼▼ (penitents) · MIGHT ● · CTRL ●. **Density:** 18–24.
- **Palette:** `[SCORCH]`, `[ERADICATE]`, `[CRASHING]` (penitents). **Never:** `[INDIRECT FIRE]`, long-range sniping.
- **Weakness:** short range; the pool runs dry if nobody burns or dies; average durability.
- **Signature card, Cleansing Martyrdom (1 CP):** when a model dies in melee, roll 3D6. Each 4+ is a Fatal Wound on the attacker.
- **Abilities come from:** faith (miracles), fire, penance.

#### 4. Aegis Knight-Houses — FACING
- **Fantasy / proxy:** Feudal nobility on steam war-horses and gothic walkers. Proxies: Imperial/daemonic Knights, knight-walker, Bretonnia.
- **Feels like:** a tiny army of giants where **which way you face** matters as much as where you stand.
- **Core trait, Ion Shield & Joust:**
  - **Front arc:** each model has a front 180° arc. Ranged attacks from that arc face `[WARD 4+]`; attacks from the rear arc get +1 to Wound.
  - **Joust:** after a Charge, Aegis units resolve *Crushing Impact* for 0 CP (and suffer no self-damage on 1s).
- **Stat DNA:** MOV ▲ (8–10) · MS ▲ · RS ● · ARM ▲ · MIGHT ▲▲ (walkers 12–24, HARDENED) · CTRL ▼ (few models). **Density:** 4–8.
- **Palette:** `[CRASHING]`, lances, `[ERADICATE]` thermal spears, ion cannons. **Never:** `[SHRAPNEL]` swarm weapons.
- **Weakness:** flanks and rear; can't hold many objectives; tarpits neutralise them.
- **Signature card, Pivot to Face (1 CP):** when targeted, rotate the model up to 90° before the attack.
- **Abilities come from:** heraldry and oaths, the steeds, the ion shields.

#### 5. Abyssal Bathys-Corps — DISPLACEMENT
- **Fantasy / proxy:** An underwater civilization surfacing in brass diving suits (BioShock Big Daddies), with tamed abyssal beasts (anglerfish, pressure-squid). Proxies: sea-elf and airship-dwarf conversions, Cthulhu divers.
- **Feels like:** slow, unstoppable divers that **move the enemy** into the claw and smother the field in fog.
- **Core trait, Pressure & Cable:**
  - **Harpoon drag:** `[HARPOON]` weapons drag a hit unit 3" toward the shooter after damage.
  - **Brine-Fog:** Bathys Leaders vent a 6" Brine-Fog field (`[STEALTH]` against shooters more than 12" away) that lasts until your next activation.
- **Stat DNA:** MOV ▼ (5) · MS ▲ · RS ● · ARM ▲ · MIGHT ▲ (C1 = 2) · CTRL ●. **Density:** 12–16.
- **Palette:** harpoons (new keyword), drills `[RELENTLESS]`, rivet guns, pressure claws. **Never:** `[FLY]`.
- **Weakness:** slow; short weapon range; a small model count to trade.
- **Signature card, Pressure Breach (1 CP):** when charged, the charger gets −2" to the charge and pushes the attacker 2" back on a failed charge.
- **Abilities come from:** pressure (vents, ballast), cables/harpoons, abyssal creatures.

### GRAND ALLIANCE 2 — THE NOCTURNE COVENANTS
*Cursed blood, flesh-vats, frost raiders, corsairs.*

#### 6. Sanguine Aristocracy — LIFESTEAL & DUELS
- **Fantasy / proxy:** Baroque vampire duelists on skeletal nightmares. Proxies: vampire, Blood Knights, Vampire Counts.
- **Feels like:** hero-hammer. A few lords snowball by killing, backed by frail mortal cattle.
- **Core trait, Crimson Hunger:**
  - **Lifesteal:** when a Sanguine model destroys an enemy model in melee, it heals 2 MIGHT (up to its starting value). **This is the only healing in the game.**
  - **Duels:** Sanguine Leaders use *Epic Challenge* for 0 CP.
- **Stat DNA:** MOV ▲ (nightmares/bats 10) · MS ▲▲ · RS ▼▼ · ARM ● · MIGHT ▲▲ on lords · CTRL ●. **Density:** 12–18.
- **Palette:** rapiers `[PRECISION]`, `[CRASHING]` on nightmares. **Never:** heavy ranged weapons, `[INDIRECT FIRE]`.
- **Weakness:** no real shooting; thralls are poor; a lord that can't kill can't heal.
- **Signature card, Sanguine Feint (1 CP):** a Leader attacked in melee steps 3" away; the remaining attacks are lost.
- **Abilities come from:** bloodlines (a lord picks one), the thralls, the hunt.

#### 7. Mordant Ghoul-Courts — GROWTH
- **Fantasy / proxy:** Feral cannibal ghouls who believe they are a shining royal court. Proxies: cannibal ghoul courts, crypt ghouls, fast zombies.
- **Feels like:** a swarm that **gets bigger** by eating. Aggressive and relentless.
- **Core trait, The Court Grows:**
  - **Feeding:** for every enemy model a Mordant unit destroys in melee, add 1 model to any Mordant C1 unit within 6", up to 150% of its starting size.
  - **Delusion:** the Ghoul-King picks 1 **Delusion** each game as an army-wide quirk.
- **Stat DNA:** MOV ▲ (7) · MS ● · RS — (no guns) · ARM ▼▼ · MIGHT ● + `[UNYIELDING 6+]` · CTRL ●. **Density:** 30–40.
- **Palette:** claws `[REAPING]`, `[IMPALING HITS]` on flayers. **Never:** ranged weapons above 8".
- **Weakness:** no shooting; no armor; growth needs melee kills; massed fire before contact ruins them.
- **Signature card, Feast on the Slain (1 CP):** after a kill, the unit clears Broken and adds 1 extra model.
- **Abilities come from:** the delusion (courtly titles), hunger, the corpse-pile.

#### 8. Prometheus Flesh-Guilds — GRAFTING
- **Fantasy / proxy:** The tech-priesthood *and* the flesh-surgeons. All technology is sacred and all flesh is obsolete. Proxies: techno-priest armies, Dark Mechanicum, Haemonculi.
- **Feels like:** start modest and **become monsters** as the game goes on. You choose where every upgrade lands.
- **Core trait, Cyber-Graft Harvesting:**
  - **Harvest:** gain 1 Graft Token when an enemy unit dies within 6" of a Prometheus unit.
  - **Spend** on your activation (permanent):
    - 1 token: +1 PEN on one weapon.
    - 2 tokens: +1 Attack.
    - 3 tokens: +2 MIGHT and `[UNYIELDING 5+]`.
- **Stat DNA:** MOV ▼ · MS ▼ · RS ▲ · ARM ● · MIGHT ● (C1 servitors 2) · CTRL ●. **Density:** 16–22.
- **Palette:** the widest tech palette in the game: plasma `[OVERLOAD]`, arc `[ANTI-VEHICLE]`, drills `[RELENTLESS]`, welders `[SCORCH]`. **Never:** `[FLY]` (except a C4 construct).
- **Weakness:** slow start; must fight near the enemy to harvest; early pressure kills them.
- **Signature card, Salvage Protocol (1 CP):** when a friendly Brute dies, gain 2 Graft Tokens immediately.
- **Abilities come from:** grafts, machine-spirits (data-tethers), surgery.

#### 9. Frost-Skaer Blood-Raiders — OATHS
- **Fantasy / proxy:** Runic northern raiders, frost shamans, bears and mammoths. Proxies: wolf-warrior armies, Norsca, vikings.
- **Feels like:** a saga. Each unit has a personal quest, and heroes who fulfil it become legends mid-battle.
- **Core trait, Saga Oaths:**
  - **Swear:** at deployment, each unit swears 1 Oath: *Slay a Leader / Hold the Line (an objective for 2 rounds) / First Blood / Fell a Giant (C4+)*.
  - **Fulfil:** its rune ignites permanently. The unit picks +1 Attack, +2" MOV or `[UNYIELDING 5+]`.
  - **Shamans:** cast 1 free Rune-Chant per activation: +1 to Wound, heal 1 model, or +1 Save in melee.
- **Stat DNA:** MOV ▲ · MS ▲ · RS ▼ · ARM ▼ · MIGHT ▲ (C1 = 2) · CTRL ●. **Density:** 16–20.
- **Palette:** great-axes `[CRASHING]`, throwing axes (short range), mammoth `[REAPING]`. **Never:** `[STEALTH]`, `[INDIRECT FIRE]`.
- **Weakness:** light armor; weak shooting; oaths can fail and leave units plain.
- **Signature card, Frost-Bite Counter (1 CP):** a charger suffers −2" to the charge and 1 Fatal Wound per 1 rolled.
- **Abilities come from:** sagas (oaths), runes (shaman magic), the beasts.

#### 10. Dread-Fleet Buccaneers — PLUNDER
- **Fantasy / proxy:** Sky, sea and land pirates on skiff-galleons with jet-boots and swivel guns. Proxies: airship-dwarf, Corsairs, pirate kits.
- **Feels like:** opportunist tempo raiders who **take your stuff** and leave.
- **Core trait, Plunder & heavy rail-suit:**
  - **Plunder:** when a Buccaneer unit takes an objective the enemy controlled, or kills an enemy Leader, **steal 1 CP** (they lose it, you gain it).
  - **heavy rail-suit:** Buccaneer units may Move and Shoot in either order.
- **Stat DNA:** MOV ● (jet-boots 10) · MS ● · RS ● · ARM ▼ · MIGHT ● · CTRL ●. **Density:** 16–22.
- **Palette:** blunderbusses `[SHRAPNEL]`, swivel guns `[HEAVY]`, cutlasses, `[FIRING DECK]` skiffs. **Never:** `[HARDENED]` infantry.
- **Weakness:** fragile; the skiffs are big targets; weak in long fights.
- **Signature card, Swing Aboard! (1 CP):** after an enemy C4–C5 model ends a move within 6", a Buccaneer unit moves into engagement with it.
- **Abilities come from:** loot, rigging and grapples, the crew.

### GRAND ALLIANCE 3 — THE HELLBREACH LEGIONS
*Boiling blood, rot, siege-iron, sorcery, sonic excess.*

#### 11. Cinder-Gorged Legion — BLOOD CLOCK
- **Fantasy / proxy:** Brass blood-demons and berserkers who kill or die. Proxies: berserker legions, the blood god, Bloodbound.
- **Feels like:** all-or-nothing. The game gets **bloodier, and they get scarier**, every turn.
- **Core trait, Blood-Tithe:**
  - **The clock:** every model destroyed, on either side, adds 1 Tithe. These unlock permanently, for the whole army:
    - 5 Tithe: +1" MOV.
    - 10 Tithe: melee `[ONSLAUGHT 1]`.
    - 15 Tithe: `[UNYIELDING 5+]`.
    - 20 Tithe: +1 Damage.
  - **No guns:** the army has zero ranged weapons.
  - **Surge:** when shot, a unit makes a `[SURGE D6"]` toward the shooter.
  - **Unleashed Cinder-Fury (gamble, v4.3):** a unit may *choose* to suffer D3 Fatal Wounds (they feed the clock) for +1 Attack and `[CRASHING]` this activation. Replaced the involuntary Burning Vessels.
- **Stat DNA:** MOV ▲ · MS ▲ · RS — · ARM ▼ (berserkers ●) · MIGHT ▲ (daemons 2) · CTRL ●. **Density:** 18–26.
- **Palette:** chain-axes `[ONSLAUGHT]`, `[CRASHING]`, `[REAPING]`. **Never:** any ranged weapon.
- **Weakness:** gunlines and screens kite them; they have no guns to answer back.
- **Signature card, Blood for Blood! (1 CP):** a model slain in melee strikes back before it's removed.
- **Abilities come from:** blood (the clock), brass (armor), rage.

#### 12. Black-Bile Congregation — CONTAGION
- **Fantasy / proxy:** Bloated plague knights, fly swarms, rusted censers (bells are optional). Proxies: plague legions, the plague god.
- **Feels like:** inevitability. Once they touch you, **you're already dying**.
- **Core trait, Rot:**
  - **Spread:** each time a Black-Bile attack damages an enemy unit, or an enemy ends its activation within 3", it gains 1 Rot token (max 3).
  - **Effects stack:**
    - 1 Rot: −1 ARM.
    - 2 Rot: also −1" MOV.
    - 3 Rot: also 1 Fatal Wound at the end of each round.
  - **Clearing:** a unit loses 1 Rot when it takes the Rally action.
- **Stat DNA:** MOV ▼▼ (4) · MS ● · RS ● · ARM ▲ · MIGHT ▲ + `[UNYIELDING 5+]` · CTRL ●. **Density:** 10–14.
- **Palette:** plague-spewers `[SCORCH]`, bile-mortars `[INDIRECT FIRE]`, scythes. **Never:** `[FLY]`, `[ASSAULT]`.
- **Weakness:** the slowest army; few bodies; the contagion takes rounds to bite; distant objectives.
- **Signature card, Fly-Swarm Veil (1 CP):** a shooter gets −1 to Hit and can't reroll.
- **Abilities come from:** disease (tokens), decay (armor rot), flies.

#### 13. Moloch Iron-Forged — CONSUMPTION
- **Fantasy / proxy:** Iron Warriors-style siege masters who bind daemons into furnace-engines. Proxies: Iron Warriors, heavy-weapon renegades, daemon-engine.
- **Feels like:** cold industrial arithmetic. **Bodies are fuel**, and fuel wins sieges.
- **Core trait, Feed the Furnace:**
  - **Fuel:** when a Moloch Engine (C3–5) activates, it may destroy up to 2 friendly C1 models within 3".
  - **Overdrive:** each model fed grants one effect: +1 to Hit, `[RELENTLESS]`, or repair 2 MIGHT.
  - **Siegecraft:** Moloch weapons ignore Cover against units in terrain.
- **Stat DNA:** MOV ▼ · MS ● · RS ▲ · ARM ▲ · MIGHT ▲ (engines very high) · CTRL ●. **Density:** 14–20 (half of it fuel).
- **Palette:** `[SHRAPNEL]`, `[ANTI-VEHICLE]`, `[INDIRECT FIRE]`, quad-autocannons. **Never:** `[STEALTH]`, `[STRIKE FIRST]`.
- **Weakness:** engines starve without nearby fodder; slow; mediocre melee infantry.
- **Signature card, Fortify Breach (1 CP):** a unit in cover that is charged cancels the charger's Strike First.
- **Abilities come from:** furnaces (fuel), siege doctrine, bound daemons.

#### 14. Cabal of the Inverted Star — SPACE
- **Fantasy / proxy:** Floating sorcerers and dust-automata. Proxies: sorcerer legions, the change god.
- **Feels like:** the board is **theirs to rearrange**.
- **Core trait, Inverted Geometry:**
  - **Fate:** each round, gain 1 Fate per living Sorcerer (max 3).
  - **Spend Fate** to either swap the positions of two friendly units (same Class or smaller), or teleport a unit 6" (not into engagement).
- **Stat DNA:** MOV ▼ (automata) / ▲▲ (discs) · MS ▼ · RS ▲ · ARM ▲ + WARD 5+ · MIGHT ● · CTRL ●. **Density:** 12–16.
- **Palette:** `[PSYCHIC / ARCANE]`, warp-flame `[SCORCH]`, `[SHREDDING WOUNDS]` sorcery. **Never:** `[REAPING]`, heavy melee.
- **Weakness:** few bodies; killing the Sorcerers starves Fate; automata are slow and weak in melee.
- **Signature card, Bend Trajectory (1 CP):** retarget an enemy heavy shot to another legal unit within 3" of you.
- **Abilities come from:** geometry (space), fate (prediction), automata.

#### 15. Velvet-Scourge Syndicate — PAIN = POWER
- **Fantasy / proxy:** Hedonist duelists with sonic blasters. Proxies: excess legions, the excess god.
- **Feels like:** fast, fragile and **better when bleeding**. Hurting them is a risk.
- **Core trait, Ecstasy of Pain:**
  - **Frenzy:** a Velvet unit that has lost MIGHT or models gains +1 to Hit, and its melee weapons gain `[ONSLAUGHT 1]`.
  - **Sonic:** sonic weapons have `[IGNORES COVER]`.
  - **Duelists:** Duelist units have `[STRIKE FIRST]`.
- **Stat DNA:** MOV ▲▲ (8) · MS ▲ · RS ▲ · ARM ▼ · MIGHT ● · CTRL ●. **Density:** 16–22.
- **Palette:** sonic `[IGNORES COVER]` + `[SHRAPNEL]`, rapiers `[PRECISION]`. **Never:** `[HARDENED]`, `[UNYIELDING]`.
- **Weakness:** fragile; the buff only arrives after taking damage; a big alpha strike deletes them.
- **Signature card, Sensory Overload (1 CP):** an attacker within 12" gets −1 to Hit.
- **Abilities come from:** excess (pain), sound, artistry.

### GRAND ALLIANCE 4 — THE CELESTIAL DOMINION
*Starlight, saurian prophecy, obsidian ancestors, rad-tunnels, shadow raiders.*

#### 16. Starfire High-Court — DISENGAGE
- **Fantasy / proxy:** Angelic starlight elves. Proxies: space elves, light-elf, High Elves.
- **Feels like:** **strike, then step away**. Precise, elegant, never where you want them.
- **Core trait, Solar Grace:**
  - **Glide:** after a Starfire unit finishes its Shoot or Fight action, it may glide 3", ending outside Engagement Range. **This is the only post-action movement in the game.**
  - **FLY:** every Starfire unit has `[FLY]`.
- **Stat DNA:** MOV ▲ · MS ▲ · RS ▲ · ARM ● + WARD 5+ (elites only) · MIGHT ▼ · CTRL ▼. **Density:** 12–16.
- **Palette:** plasma-glaives `[PRECISION]`, star-bows `[HEAVY]`, lances `[ERADICATE]`. **Never:** `[SHRAPNEL]`, `[REAPING]`.
- **Weakness:** little MIGHT; expensive; Strike First enemies and Overwatch catch them; poor at holding ground.
- **Signature card, Starlight Sidestep (1 CP):** when charged, glide 3" back; the charge may fail.
- **Abilities come from:** starlight (glide/fly), arrogance (duels), prisms.

#### 17. Sun-Scaled Temple-Host — CRITICAL RANGE
- **Fantasy / proxy:** Saurian warriors, skinks and dinosaurs carrying out a cosmic plan. Proxies: star-lizard armies, Lizardmen.
- **Feels like:** predators. When prey is weak, **every bite becomes a critical**.
- **Core trait, Predatory Instinct:**
  - **Critical range:** Saurian melee attacks score Critical Hits on 5+ against enemy units that are Broken or below their starting strength.
  - **Bite:** every Saurian has a free `[EXTRA ATTACKS]` Bite with `[IMPALING HITS]`.
- **Stat DNA:** MOV ● (skinks ▲▲) · MS ▲ · RS ▼ · ARM ● · MIGHT ▲ (saurus 2) · CTRL ●. **Density:** 18–24, with plenty of monsters.
- **Palette:** macuahuitls `[IMPALING HITS]`, skink darts, solar beams `[ERADICATE]`, horns `[CRASHING]`. **Never:** `[INDIRECT FIRE]`.
- **Weakness:** weak ranged; the saurus are slow; skinks are fragile; the bonus needs a damaged target first.
- **Signature card, Cold-Blooded Defiance (1 CP):** a unit ignores Broken for the rest of the round.
- **Abilities come from:** predation (crits), prophecy (priests), the beasts.

#### 18. Obsidian Forge-Tombs — REVIVE
- **Fantasy / proxy:** Undead ancestor-dwarves in obsidian with liquid-gold runes, plus magma golems. Proxies: dwarves, undying machine armies, rune-berserker dwarves, airship-dwarf.
- **Feels like:** a slow wall **that won't stay down**. You must wipe whole units or they come back.
- **Core trait, Grudge-Reanimation:** at the end of each round, roll a D6 for each model slain this round from a unit that still has models. On 4+, it returns with full MIGHT (max 2 per unit per round).
- **Stat DNA:** MOV ▼▼ (4) · MS ▲ · RS ● · ARM ▲ · MIGHT ▲ (C1 = 2) · CTRL ●. **Density:** 12–16.
- **Palette:** grudge-axes `[CRASHING]`, rune-guns `[HEAVY]`, magma `[SCORCH]`. **Never:** `[FLY]`, `[ASSAULT]`.
- **Weakness:** the slowest army alongside Black-Bile; wiping a unit prevents revival; few models.
- **Signature card, Settling the Grudge (1 CP):** against the unit that killed a Forge-Dwarf, friendly units get +1 to Wound for the rest of the battle.
- **Abilities come from:** grudges, runes, the forge.

#### 19. Skitter-Kin & Rad-Scavengers — GAMBLE & RECYCLE
- **Fantasy / proxy:** Ratmen and hazmat mutants with plasma welders and warp-tech. Proxies: rat-folk armies, infiltrator cults, Ash Waste Nomads.
- **Feels like:** cheap, chaotic and explosive. **Push your luck**, and the dead come back through tunnels.
- **Core trait, Overcharge & Endless Swarm:**
  - **Overcharge:** before attacking, a unit may Overcharge for +1 Attack on each weapon and `[SHREDDING WOUNDS]`. Every natural 1 rolled to hit costs 1 Fatal Wound.
  - **Recycle:** a destroyed C1 unit may return once, at half strength, from a table edge in a later round.
- **Stat DNA:** MOV ▲ · MS ▼ · RS ▼ · ARM ▼▼ (mutants ▼) · MIGHT ● · CTRL ●. **Density:** 30–40.
- **Palette:** plasma welders `[OVERLOAD]`, sludge hoses `[SCORCH]`, drill-engines, `[VANGUARD STRIKE]` burrows. **Never:** `[HARDENED]` infantry.
- **Weakness:** dreadful quality; self-damage; Break easily.
- **Signature card, Scurry! (1 CP):** when targeted, the unit moves D6" toward cover.
- **Abilities come from:** risk (overcharge), tunnels, mutation.

#### 20. Astral Shadow-Clans — ACTIVATION ORDER
- **Fantasy / proxy:** Dark-tech raiders, cyber-ronin and portal ambushers. Proxies: dark-raider elves, dark elves.
- **Feels like:** **they control when things happen**. They strike out of turn and vanish into the sequence.
- **Core trait, Shadow Timing:**
  - **Strike from the Dark:** once per round, right after an enemy activation, a Shadow-Clan unit may activate out of sequence with 1 Action, then it is Exhausted.
  - **Pain:** when a Shadow-Clan unit destroys an enemy unit, gain 1 Pain. Spend 1 Pain to **pass** your turn once, holding your activation.
- **Stat DNA:** MOV ▲▲ (skyboards 12) · MS ▲ · RS ▲ · ARM ▼ + WARD 5+ on lords · MIGHT ▼ · CTRL ▼. **Density:** 14–20.
- **Palette:** splinter rifles `[IMPALING HITS]`, katanas `[PRECISION]`, `[FIRING DECK]` skiffs. **Never:** `[HARDENED]`, `[UNYIELDING]`.
- **Weakness:** paper-thin; few models; Pain needs kills.
- **Signature card, Fade (1 CP):** after its activation, a unit gains `[UNSEEN 12"]` until it next activates.
- **Abilities come from:** timing (ambush), pain, portals.

### GRAND ALLIANCE 5 — THE VOIDBORN CONVERGENCE
*Cosmic wildcards, porcelain rail-cults, chitin, speed-freaks, phantoms.*

#### 21. Rift-Stalker Menagerie — CONTRACTS (see §6)
- **Fantasy / proxy:** Displaced mercenaries and beasts from any reality. Proxies: **every model ever made**.
- **Feels like:** your own army, your rules, a different build every game.

#### 22. Radiant Concordat — MARKING
- **Fantasy / proxy:** Porcelain-and-gold rail battlesuits, a Crimson Lotus blood-priesthood, and armored Ogre bodyguards. Proxies: railgun empire, Aztec priests, Ogors.
- **Feels like:** precise ritual gunfire. **Mark the offering, then harvest it.** Melee is beneath them, so the Ogres handle it.
- **Core trait, Blood-Mark & Offerings:**
  - **Mark:** a Priest or Spotter may spend 1 Action to Blood-Mark a visible enemy unit. Concordat rail weapons get +1 to Hit and `[IGNORES COVER]` against it.
  - **Offerings:** each marked enemy model destroyed gives 1 Offering. Spend 1 Offering to give a rail shot +1 Damage, or heal 1 MIGHT on an Ogre.
  - **Bodyguard:** Ogres intercept melee attacks aimed at an adjacent battlesuit on 3+.
- **Stat DNA:** MOV ▲ (suits jump 8) · MS ▼▼ (Ogres ▲) · RS ▲ · ARM ▲ (suits) · MIGHT ● (Ogres ▲▲) · CTRL ●. **Density:** 12–18.
- **Palette:** rail-rifles `[HEAVY]` + `[ERADICATE]`, lotus pistols, Ogre maces `[CRASHING]`. **Never:** `[SCORCH]`, `[REAPING]` on the porcelain caste.
- **Weakness:** the porcelain caste is helpless in melee; marking needs Priests alive with line of sight.
- **Signature card, Coordinated Rail-Salvo (1 CP):** when an enemy moves into view, Snap Fire hitting on 5+ (4+ if marked).
- **Abilities come from:** ritual (marks/offerings), beauty (porcelain tech), the Ogre caste.

#### 23. Apex Bio-Swarm — ADAPTATION
- **Fantasy / proxy:** An evolving chitin hive with gaunts, warriors and bio-titans. Proxies: bio-swarm armies, Xenomorphs, Zerg.
- **Feels like:** an endless swarm that **re-evolves each round** to counter whatever you're doing.
- **Core trait, Synapse & Evolution:**
  - **Evolution:** each Command Phase, choose 1 Bio-Adaptation for the whole army: *Scythes* (+1 PEN in melee), *Chitin* (+1 ARM, up to the cap), or *Adrenal* (+2" MOV and charge).
  - **Synapse:** units within 9" of a Synapse creature ignore Suppression (they can't be Rattled or Pinned).
- **Stat DNA:** MOV ▲ · MS ● · RS ▼ · ARM ▼ (warriors ●) · MIGHT ● (monsters ▲▲) · CTRL ●. **Density:** 26–36.
- **Palette:** talons `[REAPING]`, bio-acid `[SHREDDING WOUNDS]`, spore mines `[INDIRECT FIRE]`. **Never:** `[PRECISION]`.
- **Weakness:** kill the Synapse and the swarm gets Pinned in a cascade; individual models are weak; only one adaptation at a time.
- **Signature card, Rapid Regrowth (1 CP):** a Brute or Behemoth ignores up to 3 MIGHT from one attack. *(This is mitigation, not healing.)*
- **Abilities come from:** the hive (synapse), evolution, biomass.

#### 24. Diesel-Skull War-Horde — VELOCITY
- **Fantasy / proxy:** Greenskin speed-freaks, scrap buggies, rotary dakka. Proxies: greenskins, Speed Freeks, Mad Max kits.
- **Feels like:** loud, fast and random. **Never stop moving.**
- **Core trait, Full Throttle & RAMPAGE!:**
  - **Full Throttle:** a unit that moved at least its full MOV this activation gains `[HAILFIRE 1]` on its ranged weapons and +1 melee Attack. Vehicles that moved 8" or more may Ram: D6 per 2 MIGHT, each 5+ is a Fatal Wound.
  - **RAMPAGE!:** once per battle, every unit gets +2" MOV, +2" charge and +1 Attack for the round.
- **Stat DNA:** MOV ● (bikes/buggies ▲▲ 12) · MS ▲ · RS ▼▼ · ARM ▼ · MIGHT ▲ (greenskin mobs 2) · CTRL ▲. **Density:** 24–32.
- **Palette:** dakka `[HAILFIRE]`, rokkits, choppas `[CRASHING]`, `[OVERLOAD]` kustom guns. **Never:** `[PRECISION]`, `[HEAVY]`.
- **Weakness:** terrible aim; light armor; a standing-still Diesel army is a bad army.
- **Signature card, Tinker Patch-Up (1 CP):** a vehicle ignores the next Fatal Wound or the next hit that would destroy it, on 4+.
- **Abilities come from:** speed, scrap (ramshackle), the mob.

#### 25. Eclipse Shadow-Fiends — INTANGIBILITY
- **Fantasy / proxy:** **The only phantom army**: void-shades from dead stars. Proxies: ghost armies, shadow daemons, spectres.
- **Feels like:** they **drift through walls** and appear where you thought you were safe.
- **Core trait, True Intangibility:**
  - **Phase:** every unit has `[UNSEEN 12"]`, `[WARD 4+]`, and moves through terrain and models.
  - **Spectral:** their CTRL counts as half, rounded down.
- **Stat DNA:** MOV ● + phasing · MS ● · RS ▼▼ (few guns) · ARM ▼▼ (6+, but WARD 4+) · MIGHT ● · CTRL ▼▼ (half). **Density:** 14–20.
- **Palette:** soul-scythes `[SHREDDING WOUNDS]`, wails `[SHRAPNEL]` at 8". **Never:** `[HARDENED]`, long-range weapons.
- **Weakness:** Fatal Wounds ignore WARD; massed close-range fire; poor objective play; low damage against armor.
- **Signature card, Fade into the Dark (1 CP):** an attacker from beyond 6" gets −2 to Hit and can't score crits.
- **Abilities come from:** the void, terror, possession.

---

## 6. Faction 21 — Rift-Stalker Menagerie in detail (the toolkit faction)

**Principle: the Rift-Stalker *is* the Universal Chassis (§3) made playable.** It is the **control group** of the whole game: every other faction should win about 50% of the time against a well-built Rift-Stalker list. If one doesn't, that faction is off, not the Rift-Stalker.

- **Any model is valid:** pick the chassis by the model's base (Class) and bulk, then choose weapons from the **Universal Weapon Library** (about 24 weapons: rifle, carbine, heavy rifle, flamer, plasma, melta, autocannon, las-lance, mortar, blade, maul, axe, lance, claws…). Each weapon is priced by the calculator.
- **Contracts (pick 2 before battle).** Each one must be priced with the delta method, and they must cost about the same:
  1. *Forward Infiltrators:* up to 2 units gain `[INFILTRATORS]`.
  2. *Hardened Plates:* infantry get +1 ARM (up to the cap). *Probably too strong; needs pricing.*
  3. *High-Velocity Loads:* ranged weapons get +1 PEN at half range.
  4. *Adrenaline Stims:* +2" MOV.
  5. *Relentless Aggression:* melee weapons gain `[CRASHING]`.
  6. *Targeting Arrays:* once per round, one unit rerolls failed Hit rolls.
- **Signature card, Renegotiation (1 CP):** at the start of a round, swap one contract.
- **Weakness:** no faction verb, so no synergy engine. It wins by list-building, not by mechanics.

---

## 7. Starting wave: 5 factions + Rift-Stalker

**Pick: Golgotha · Auric · Cinder-Gorged · Apex Bio-Swarm · Starfire, plus Rift-Stalker as the control group.**

Why these five:
1. **They cover the five core playstyles:** gunline/board (Golgotha), elite wall (Auric), melee hammer (Cinder), swarm/adaptation (Apex), mobile skirmish (Starfire). Once these five balance against each other, every later faction is a variation of something already proven.
2. **They cover the biggest collections.** massed human armies/Cities, power-armoured super-soldiers/golden guardians/storm-forged paladin, berserker legions/the blood god, bio-swarm armies and space elves/light-elf are what most people already own, so playtesters can start this week.
3. **They stress-test the engine's main systems:**
   - Orders & objectives (Golgotha)
   - Wound allocation & ward (Auric)
   - Charges, Surge & Strike First (Cinder)
   - Broken & round-start choices (Apex)
   - Movement, FLY & engagement (Starfire)
4. **Designed counter-cycle.** Each faction is slightly favoured against two and slightly disfavoured against two. Aim for 45–55% between skilled players, with counters at most ±10%:

| ↓ beats → | Golgotha | Cinder | Auric | Starfire | Apex |
| :-- | :-: | :-: | :-: | :-: | :-: |
| **Golgotha** | — | ✗ | ✗ | ✓ volume vs low MIGHT | ✓ volume vs swarm |
| **Cinder** | ✓ cheap deaths feed the clock | — | ✓ burns through thralls | ✗ | ✗ |
| **Auric** | ✓ shrugs off lasguns | ✗ | — | ✗ | ✓ swarm can't crack WARD |
| **Starfire** | ✗ | ✓ kites the hammer | ✓ outplays on objectives | — | ✗ |
| **Apex** | ✗ | ✓ tarpits & adapts | ✗ | ✓ too many bodies | — |

**Next waves:** start Wave 2 with your favourites, which also cover new systems: **Prometheus (grafting), Radiant Concordat (marking), Skitter-Kin (gamble/recycle), Sanguine (lifesteal/duels), Obsidian (revive).** After that, one wave per remaining Grand Alliance.

---

## 8. Roadmap

| Phase | Output | How |
| :-- | :-- | :-- |
| **0. Lock canon** | Answers to §0 (CP, Class, statuses, scale) | One decision pass from you, then update the manual and `FACTION_25_DATABASE.json` |
| **1. Toolkit (Faction 21)** | Universal Chassis (≈10 profiles), Weapon Library (≈24), 6 priced Contracts | `unit_calculator.py custom` prices every entry |
| **2. Ability engine** | `Mods` in the calculator (re-rolls, ±hit/wound, PEN, damage, WARD/UNYIELDING) + uptime buckets | Delta-method pricing (`UNITS_CALCULATION_REFERENCE.md` §6) |
| **3. Starter 5** | Per faction: Core Trait (final wording), 6–8 datasheets (Ladder roles), 1 Signature Card, **1** detachment | Chassis + Stat DNA + verb abilities, all priced |
| **4. Playtest** | 15 pairings (5 factions + Rift-Stalker); win/loss log; the counter table checked | Tune points first, rules second, the verb never |
| **5. Waves 2–5** | 5 factions per wave | Same pipeline; check every new rule against the Ownership Matrix |
| **6. Depth** | 3 detachments per faction, enhancements, Tactical Card decks | Only after base factions are stable |

**The datasheet recipe for every unit (Phase 3 onward):**
1. Pick the role on the Ladder (Feed / Exploit / Amplify / Payoff).
2. Pick the chassis (§3) that matches the model's base.
3. Apply the faction's Stat DNA (§5).
4. Choose weapons from the faction Palette.
5. Write ≤ the ability budget (§1.3), and make sure it touches the verb.
6. Price it: base with the calculator, abilities with the delta method.
7. Check it against the Ownership Matrix and the faction Weakness.
