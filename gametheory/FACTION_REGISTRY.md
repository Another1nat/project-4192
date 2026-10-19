# 4192 AD — The Faction Registry (all 25 factions · units · 3 detachments each)
**Project Codex: Iron & Wrath** · v1.0 · 2026-10-16

*This is the master registry. For every faction it covers:*
- *what it learns from its closest sci-fi wargames / fantasy wargames armies (what to take, what to avoid),*
- *how it plays,*
- *its complexity,*
- *its Stat DNA,*
- *its full unit roster with stat lines and points,*
- *its 3 detachments.*

> **How this file is built.** The prose is hand-written; edit it freely. Every **unit table** and **detachment block** is generated from data, so it never drifts from the maths:
> - The 5 release factions come from `factions/<nn>_<name>.json` (full datasheets: abilities priced, simulator-tested).
> - The other 20 come from `factions/registry_units.json` (universal unit type + faction Stat DNA + overrides; points are **base price**, and abilities get priced when the faction is fully drafted).
> - Pricing knobs: `catalogue/pricing_config.json`. Regenerate with:
>
> `python3 gametheory/scripts/unit_calculator.py registry`

**Read alongside:** [`FACTION_DESIGN_GUIDE.md`](FACTION_DESIGN_GUIDE.md) (the one-verb Ownership Matrix and Identity Cards) · [`GAME_SYSTEM_PLAN.md`](GAME_SYSTEM_PLAN.md) (CP, activations, suppression, game sizes) · [`UNIT_CATALOGUE.md`](UNIT_CATALOGUE.md) (the 29 universal unit types).

---

## How to read each entry

| Field | Meaning |
| :-- | :-- |
| **Verb** | The one engine mechanic this faction owns (no other faction may use it as a faction rule) |
| **Complexity** | ★ = learn in one game · ★★★★★ = expert. Aim: every alliance has at least one ★–★★ army for new players |
| **Learned from** | ✅ what we keep from the sci-fi wargames/fantasy wargames analog · ⛔ what we deliberately avoid (usually something the community complained about) |
| **Stat DNA** | How the faction shifts the universal unit types (▲ better / ▼ worse) |
| **Roster** | Every datasheet: stat line `MOV · MS · RS · ARM · MIGHT · CTRL`, weapons, key ability, points (×1.5 scale) |
| **Detachments** | 3 sub-playstyles. Each has 1 rule, 2 enhancements (points for release factions), and 3 stratagems |

**Detachment design rules (all 25):**
1. Each detachment is a **different way to play the same verb**. It never adds a second verb.
2. Rules are always on; enhancements go on Leaders, cost points, and are limited to 1 per Leader; stratagems are mostly 1 CP, each once per round.
3. Every faction has one **beginner detachment (D1)**. D2 and D3 are specialist builds.

**Release status:** 🟢 Release (full datasheets, simulator-balanced) · 🟡 Roster draft (base-priced) · 🔷 Toolkit.

---

# GRAND ALLIANCE 1 — THE CROWN OF SOLIS

## 1. The Auric Solar-Host 🟢 — MARTIAL STANCES · ★★ · *the flagship*
*Proxies: golden guardian elites / storm-forged paladin (Gilded, tier 3) and power-armoured super-soldiers of any chapter (Sworn, tier 2).*

**Learned from**
- ✅ **golden guardians' stance rule** (pick a fighting stance), which becomes army-wide Martial Stances each round.
- ✅ **power-armoured super-soldiers' simplicity and flexibility:** Sworn Battle-Brothers, Vanguard drops, tanks.
- ✅ **storm-forged paladin** reserve strikes, in the *Sunfall Spearhead* detachment.
- ⛔ **Elites hiding behind slaves:** the old Thrall-Chain is **removed**. Every Auric model is a hero, and the sacrifice mechanic moves to Moloch.
- ⛔ **Unkillable 4++/FNP stacking:** the 3+ cap applies, and WARD 3+ exists only on one enhanced Warlord.

**How it plays:**
- A pure-elite, melee-first army with specialised shooting: **17–28 models and 4–7 activations at 1,000 pts**, so you are out-activated every game.
- **Stances (low risk):** each Command Phase, read the board: *Aegis* (incoming PEN −1) to weather a gunline, *Vanguard* (+1 to Hit within 12″, [ASSAULT]) to advance, or *Executioner* ([ONSLAUGHT 1]) when the lines meet.
- **Solar Overdrive (high risk, tempo cost):** once per round, one unit gets +1 Attack and [SHREDDING WOUNDS], but stays exposed (ARM 1 worse) until it next activates.
- The enemy wins by trading cheap units for activations, contesting several objectives at once, and punishing an Overdriven unit.

**Stat DNA:** MOV ● · MS ▲▲ · RS ▲ · ARM ▲ · MIGHT ▲▲ · CTRL ● · Density 17–28 models.

<!--UNITS:01-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| High Aurarch Praetor | C2 Leader (Warlord) | 1 | 7" · 2+ · 2+ · 3+ · 7 · 2 · WARD 4+ | Bastion glaive (ranged), Bastion glaive | Golden Command; Master of Stances | **135** |
| Blade-Warden Champion | C2 Leader (Champion) | 1 | 7" · 2+ · 3+ · 3+ · 6 · 1 · WARD 4+ | Twin sun-blades | Duelist's Edge; Sworn to the Blade | **90** |
| Sworn Lieutenant | C1 Leader (Support) | 1 | 6" · 2+ · 3+ · 3+ · 4 · 1 · WARD 5+ | Heavy pistol, Power weapon | Bolter Doctrine | **65** |
| Eclipse Hunter | C1 Leader (Specialist) | 1 | 6" · 3+ · 2+ · 3+ · 4 · 1 | Longshot rail-rifle, Combat blade |  | **80** |
| Sworn Battle-Brothers | C1 Trooper | 5–10 | 6" · 3+ · 3+ · 3+ · 2 · 2 | Sol-bolter, Chain-blade | Oath of the Sun | **150** (+22/m) |
| Sworn Hellstorm Squad | C1 Trooper | 5–10 | 6" · 3+ · 3+ · 3+ · 2 · 1 | Storm-carbine, Combat blade |  | **140** (+20/m) |
| Sworn Assault Brothers | C1 Trooper | 5–10 | 7" · 3+ · 3+ · 3+ · 2 · 2 | Heavy pistol, Sun-chainsword | Shock Assault | **135** (+21/m) |
| Bastion Paladins | C2 Elite | 3–5 | 5" · 2+ · 3+ · 3+ · 6 · 1 · WARD 4+ | Sun-repeater, Solar hammer | Immovable | **240** (+61/m) |
| Gilded Phalanx | C2 Elite | 3–5 | 7" · 2+ · 3+ · 3+ · 5 · 2 · WARD 4+ | Sun-glaive (ranged), Sun-glaive | Shield-Wall | **215** (+59/m) |
| Sworn Pyre-Breachers | C1 Trooper (specialist) | 5 | 6" · 3+ · 3+ · 3+ · 2 · 1 | Breacher melta-carbine, Combat blade |  | **155** |
| Gilded Sagittarii | C2 Elite (ranged) | 3–5 | 7" · 3+ · 2+ · 3+ · 5 · 1 · WARD 4+ | Sagittarius rail-bow, Combat blade |  | **200** (+51/m) |
| Sworn Marksmen | C1 Trooper (specialist) | 2–3 | 6" · 4+ · 2+ · 3+ · 2 · 1 | Sniper rifle, Combat blade |  | **55** (+19/m) |
| Sun-Lancers | C3 Elite (cavalry) | 3 | 12" · 2+ · 3+ · 3+ · 5 · 2 · WARD 5+ | Solar carbine, Sun-lance |  | **205** |
| Sworn Vanguard | C1 Elite (fast) | 3–5 | 10" · 3+ · 4+ · 3+ · 2 · 1 | Heavy pistol, Power weapon | Sunfall Descent | **80** (+27/m) |
| Eclipse Scouts | C1 Trooper (recon) | 3–5 | 7" · 3+ · 3+ · 4+ · 2 · 1 | Carbine, Combat blade | Forward Observers | **65** (+15/m) |
| Reliquary-Sentry | C3 Brute | 1 | 6" · 3+ · 3+ · 3+ · 10 · 3 · WARD 5+ | Autocannon, Autocannon, Reliquary fist | Reliquary Fury | **115** |
| Aurum Dread-Bastion | C4 Behemoth (walker) | 1 | 8" · 3+ · 3+ · 3+ · 14 · 3 · WARD 5+ | Rotary cannon, Macro sun-plasma, Crusher fists |  | **180** |
| Rampart Carrier | C4 Behemoth (transport) | 1 | 10" · 5+ · 3+ · 3+ · 12 · 2 | Heavy stubber, Treads / hull ram |  | **120** |
| Solar Grav-Tank | C4 Behemoth | 1 | 10" · 5+ · 3+ · 3+ · 16 · 3 · WARD 5+ | Solar lance, Grav-repeaters, Treads / hull ram |  | **175** |
| Heliarch Grav-Cruiser | C5 Behemoth (transport) | 1 | 10" · 5+ · 3+ · 3+ · 26 · 5 · WARD 5+ | Titan cannon, Las-lance, Las-lance, Treads / hull ram |  | **345** |
| The Sun-Bound Exemplar | C2 Leader (Epic Warlord) | 1 | 7" · 2+ · 2+ · 3+ · 8 · 2 · WARD 4+ | Dawn-spear (ranged), Dawn-spear | Living Standard; Sun's Judgement; Unbowed | **145** |
| Sworn Apothecarion | C1 Leader (Support) | 1 | 6" · 3+ · 3+ · 3+ · 4 · 1 | Heavy pistol, Sun-chain blade | Gene-Seed Recovery; Combat Narthecium | **80** |
| Gilded Wardens | C2 Elite | 3–5 | 6" · 2+ · 3+ · 3+ · 4 · 2 · WARD 4+ | Warden halberd (ranged), Warden halberd | Vigil Unending; Throne-Guard | **185** (+45/m) |
| Sworn Shield-Veterans | C2 Elite | 3–5 | 6" · 2+ · 4+ · 3+ · 3 · 1 · WARD 5+ | Heavy pistol, Sun-forged sword | Storm Shields; Blade Discipline | **115** (+28/m) |
| Sworn Lumen-Blasters | C1 Trooper / Elite | 5–10 | 6" · 3+ · 3+ · 3+ · 2 · 1 | Lumen-plasma, Combat blade | Overcharged Coils | **125** (+16/m) |
| Sworn Gryph-Knights | C2 Elite (fast) | 3 | 12" · 2+ · 3+ · 3+ · 4 · 1 | Sol-carbine, Sun-lance | Diving Strike | **145** |
| Sworn Siege-walker | C3 Brute | 1 | 6" · 3+ · 3+ · 3+ · 10 · 2 | Heavy flamer, Siege-fist | Entombed Hero; Wall-Breaker | **125** |
| Sunhawk Interceptor | C4 Behemoth | 1 | 16" · 5+ · 3+ · 3+ · 14 · 0 | Sun-lance cannon, Sol-bolter battery | Strafing Run | **145** |
| Solar Lance-Tank | C4 Behemoth | 1 | 10" · 5+ · 3+ · 3+ · 16 · 2 | Las-lance, Las-lance, Treads / hull ram | Machine-Spirit | **185** |
| Aurum Sentinel-Colossus | C4 Brute / Behemoth | 1 | 8" · 2+ · 3+ · 3+ · 14 · 3 · WARD 5+ | Sun-fire cannon, Colossus fists | Guardian of the Gate | **200** |
<!--/UNITS:01-->

**Detachments**
<!--DETACH:01-->
**Core rule — Martial Stances & Solar Overdrive:** Command Phase: choose 1 Stance for the whole army this round: Aegis (incoming PEN −1) · Vanguard (ranged weapons gain [ASSAULT] and +1 to Hit within 12″) · Executioner (melee weapons gain [ONSLAUGHT 1]). HIGH RISK — Solar Overdrive (⟳ once per round, one unit, when it activates): +1 Attack on all weapons and [SHREDDING WOUNDS] this activation, but its ARM is 1 worse until it next activates.

**Gamble — Solar Overdrive** *(risk: exposure (durability))*: Once per round, one unit, when it activates: +1 Attack on all weapons and [SHREDDING WOUNDS] this activation, but its ARM is 1 worse until it next activates.

**D1. Gilded Host** — *golden guardians-style: golden elites hold the centre; every model a hero.*
- *Rule:* Unbroken Phalanx: Gilded units within 3″ of an objective count +1 CTRL per model; in Aegis Stance they also gain [WARD 5+] against ranged attacks.
- *Enhancement:* **Sunforged Aegis** (+20 pts, High Aurarch Praetor) — The bearer has [WARD 3+] (the best ward in the game; single model only).
- *Enhancement:* **Blade of the First Oath** (+45 pts, Blade-Warden Champion) — The bearer's blades: +2 Attacks, +1 Damage.
- *Stratagem:* **Alchemical Bloodline** (1 CP) — A Gilded unit is targeted: Incoming Damage −1 (min 1) for that attack.
- *Stratagem:* **Gilded Vigil** (1 CP) — A Gilded unit controls an objective at the End of Round: It keeps [SECURED] on that objective.
- *Stratagem:* **Golden Riposte** (1 CP) — A Gilded unit is declared as a Charge target: It gains [STRIKE FIRST] against that charger this round.

**D2. Gene-Forged Host** — *Space-Marine-style: Sworn Battle-Brothers in numbers, Vanguard drops, tanks.*
- *Rule:* Oath-Doctrines: Rounds 1–2 Devastator (+1 PEN on ranged when not moving), Round 3 Tactical (re-roll Wound 1s), Round 4 Assault (+1 Attack in melee). Sworn units only.
- *Enhancement:* **Artificer Plate** (+10 pts, Sworn Lieutenant) — The bearer has [WARD 4+].
- *Enhancement:* **Master-crafted Sol-bolter** (+10 pts, Sworn Lieutenant) — The bearer's pistol: +2 Attacks, +1 PEN.
- *Stratagem:* **Bolter Discipline** (1 CP) — A Sworn unit Shoots: Its [HAILFIRE] applies at full range.
- *Stratagem:* **Sunfall Assault** (1 CP) — Sworn Vanguard arrive from reserves: They may Charge this activation.
- *Stratagem:* **Contempt of Iron** (1 CP) — A Sworn unit is shot: Incoming PEN −1 for that attack.

**D3. Sunfall Spearhead** — *Drop-assault: Vanguard, Paladins and Lancers strike from orbit.*
- *Rule:* Comet Descent: [VANGUARD STRIKE] units may arrive 7″ from enemies (not 8″) and get +1 to Wound on the activation they arrive.
- *Enhancement:* **Comet Banner** (+10 pts, Sworn Lieutenant) — The bearer and its attached unit gain [VANGUARD STRIKE].
- *Enhancement:* **Sunfall Brand** (+20 pts, Blade-Warden Champion) — +1 Damage on the activation the bearer arrives or charges.
- *Stratagem:* **Orbital Lance** (1 CP) — A unit arrives from reserves: Pick an enemy unit within 12″ of it: D3 Fatal Wounds.
- *Stratagem:* **Thunderous Landing** (1 CP) — A unit arrives within 9″ of an enemy: That enemy gains 1 Suppression token.
- *Stratagem:* **Recall to Orbit** (2 CP) — End of Round: One unengaged [VANGUARD STRIKE] unit returns to Strategic Reserves.

<!--/DETACH:01-->

---

## 2. The Golgotha Trench-Legions 🟢 — ORDERS · ★★★
*Proxies: massed human armies / trench-soldier armies / Cadians, free-city armies, Trench Crusade, any WW1/WW2 range.*

**Learned from**
- ✅ **massed human armies Orders** (Take Aim!, Move! Move! Move!, First Rank Fire!): officers make mediocre troops excellent. This is the most loved part of Guard and becomes Golgotha's verb.
- ✅ **trench-soldier's grim attrition**, and free-city armies's combined arms.
- ✅ **Artillery** that matters (Fire Mission).
- ⛔ **9th-edition "officer spam"** (one order each, so players bought 6 officers): each officer issues exactly 1 Order and costs a real activation.
- ⛔ **Tank-only skew lists:** big units are capped at 3 per 1,000 pts.

**How it plays:**
- A thinking-player's gunline: many cheap units, so you usually have **more activations** than the enemy and get the last word each round.
- Each Officer activation is a decision: which squad do I make great this round?
- Line squads hold objectives with [SECURED]; artillery and tanks suppress.
- You lose if the officers die early, or if fast melee arrives before the artillery has softened it.
- *Expect 9–13 activations and to win on objectives, not kills.*

**Stat DNA:** MOV ● · MS ▼ · RS ● · ARM ▼ · MIGHT ● · CTRL ▲▲ · Density 30–40 models.

<!--UNITS:02-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Trench-Troopers | C1 Trooper | 10 | 6" · 5+ · 4+ · 5+ · 1 · 2 | Service rifle, Bayonet / CCW | Special weapons | **115** |
| Storm-Grenadiers | C1 Elite | 5–10 | 6" · 4+ · 3+ · 4+ · 1 · 2 | Hot-shot carbine, Combat blade | Breach and Clear | **95** (+12/m) |
| Heavy Weapon Battery | C2 Trooper (support) | 2–3 | 5" · 5+ · 4+ · 5+ · 2 · 1 | Autocannon, Bayonet / CCW | Dug-In | **50** (+12/m) |
| Mortar Pit | C2 Trooper (support) | 2–3 | 5" · 5+ · 4+ · 5+ · 2 · 1 | Trench mortar, Bayonet / CCW |  | **50** (+12/m) |
| Trench-Marshal | C1 Leader (Officer) | 1 | 6" · 4+ · 3+ · 4+ · 3 · 1 | Heavy pistol, Power weapon | Orders (Take Aim!) | **50** |
| Field Commissar | C1 Leader | 1 | 6" · 3+ · 3+ · 4+ · 3 · 1 | Pistol, Power weapon | Summary Execution | **45** |
| Trench Cavalry | C2 Elite (fast) | 3–5 | 10" · 4+ · 5+ · 5+ · 2 · 1 | Pistol, Explosive lance |  | **50** (+15/m) |
| Iron-Stalker Walker | C3 Brute | 1–2 | 8" · 4+ · 4+ · 4+ · 7 · 2 | Autocannon, Combat blade |  | **60** (+37/m) |
| Siege-Breaker Tank | C4 Behemoth | 1 | 10" · 5+ · 4+ · 3+ · 16 · 3 | Battle cannon, Sponson stubbers, Treads / hull ram |  | **150** |
| Quake-Cannon Battery | C4 Behemoth (support) | 1 | 8" · 6+ · 4+ · 3+ · 12 · 1 | Quake cannon, Heavy stubber |  | **115** |
| Lord-Marshal of the Front | C2 Leader (Warlord) | 1 | 6" · 3+ · 3+ · 4+ · 5 · 2 · WARD 5+ | Heavy pistol, Power weapon | Grand Battery Order | **60** |
| Field Chirurgeon-Priest | C1 Leader (Support) | 1 | 6" · 4+ · 4+ · 5+ · 3 · 1 | Pistol, Combat blade | Stitch and Pray | **50** |
| Forward Observer | C1 Leader (Specialist) | 1 | 6" · 4+ · 3+ · 5+ · 2 · 1 | Pistol, Combat blade | Call the Guns | **40** |
| Trench-Raider Squad | C1 Trooper | 5–10 | 6" · 4+ · 4+ · 5+ · 1 · 2 | Trench shotgun, Trench club | Over the Parapet | **70** (+11/m) |
| Bulwark Brutes | C2 Elite (brute) | 3–5 | 6" · 3+ · 5+ · 4+ · 4 · 1 | Ripper gun, Bulwark club | Slab-Shield | **100** (+29/m) |
| Flame-Trooper Squad | C1 Trooper (specialist) | 5 | 6" · 4+ · 4+ · 4+ · 1 · 1 | Trench flamer, Bayonet / CCW |  | **85** |
| Scout-Sniper Pair | C1 Trooper (specialist) | 2–3 | 6" · 5+ · 3+ · 5+ · 1 · 1 | Sniper rifle, Combat blade | Camo-Cloaks | **40** (+11/m) |
| Drop-Chute Troopers | C1 Elite (drop) | 5–10 | 6" · 4+ · 3+ · 4+ · 1 · 1 | Hot-shot carbine, Combat blade |  | **85** (+11/m) |
| Mole-Carrier APC | C4 Behemoth (transport) | 1 | 10" · 5+ · 4+ · 3+ · 12 · 2 | Heavy stubber, Treads / hull ram |  | **110** |
| Behemoth Siege-Tank | C5 Behemoth | 1 | 8" · 5+ · 4+ · 3+ · 26 · 5 | Titan cannon, Heavy stubber, Heavy stubber, Treads / hull ram |  | **230** |
| Marshal-General of the Iron Line | C2 Leader (Epic Warlord) | 1 | 6" · 4+ · 3+ · 4+ · 5 · 1 · WARD 5+ | Heavy pistol, Power weapon | Supreme Command; Grand Battery | **70** |
| Regimental Colour-Bearer | C1 Leader (Support) | 1 | 6" · 4+ · 4+ · 5+ · 3 · 2 | Pistol, Combat blade | Hold the Colours; Rally Point | **45** |
| Veteran Marksman | C1 Leader (Specialist) | 1 | 6" · 4+ · 2+ · 5+ · 3 · 1 | Long-las, Combat blade | Ghillie Cloak | **50** |
| Engineer Sappers | C1 Trooper (specialist) | 5 | 6" · 4+ · 4+ · 5+ · 1 · 1 | Demo-charges, Combat blade | Dig the Line | **50** |
| Penal Legion Breachers | C1 Trooper | 10 | 7" · 4+ · 5+ · 5+ · 1 · 1 | Pistol, Chain-blade | Last Chance | **100** |
| Cyber-Mastiff Pack | C1 Trooper | 5–10 | 10" · 4+ · 6+ · 5+ · 1 · 1 | Steel jaws | Run Ahead | **50** (+11/m) |
| Heavy Mortar Battery | C3 Brute (support) | 1 | 4" · 5+ · 4+ · 4+ · 6 · 1 | Heavy mortar, Bayonet / CCW | Pre-Sighted | **60** |
| Tank-Hunter Destroyer | C4 Behemoth | 1 | 10" · 5+ · 4+ · 3+ · 16 · 2 | Hunter las-cannon, Heavy stubber, Treads / hull ram | Ambush Position | **140** |
| Inferno-Crawler | C4 Behemoth | 1 | 10" · 5+ · 4+ · 3+ · 14 · 2 | Inferno cannon, Heavy stubber, Treads / hull ram | Burn Them Out | **135** |
| Raptor Drop-Gunship | C4 Behemoth (transport) | 1 | 16" · 5+ · 4+ · 3+ · 12 · 0 | Multi-laser, Hellstrike missiles, Treads / hull ram | Grav-Chute Drop | **110** |
<!--/UNITS:02-->

**Detachments**
<!--DETACH:02-->
**Core rule — Chain of Command:** When an Officer activates it issues 1 Order (⟳) to a friendly unit within 12″ that has not activated: Take Aim! (+1 to Hit, cannot Move) · Forward! (may Shoot after its 2nd Move) · Dig In! (Cover and Braced) · Fire Mission! (an [INDIRECT FIRE] unit hits on 4+ against any enemy a Golgotha unit can see). Orders are priced on the Officers.

**Gamble — Danger-Close** *(risk: durability (friendly fire))*: When an [INDIRECT FIRE] unit targets an enemy unit within 6″ of a friendly Golgotha unit, it re-rolls Hit rolls; each unmodified Hit roll of 1 inflicts 1 Fatal Wound on the friendly Golgotha unit closest to the target.

**D1. Combined Arms Regiment** — *The default: infantry hold, tanks and walkers punch.*
- *Rule:* Born Soldiers: Trooper units that issued no Order and received no Order this round get +1 to Hit with ranged weapons if they did not Move.
- *Enhancement:* **Grand Strategist** (+10 pts, Trench-Marshal) — This Officer issues 2 Orders per round.
- *Enhancement:* **Relic Lasgun** (+10 pts, Trench-Marshal) — The bearer's ranged weapon gets +1 Attack and +1 PEN.
- *Stratagem:* **Volley Fire** (1 CP) — A Trooper unit is selected to Shoot: Its rifles gain [HAILFIRE] at full range this activation.
- *Stratagem:* **Armoured Fist** (1 CP) — A unit disembarks from a Transport: It may Shoot this activation even after Rapid Disembark.
- *Stratagem:* **Fix Bayonets** (1 CP) — A Trooper unit is charged: Its retaliation strike gets +1 to Wound.

**D2. Siege Artillery Front** — *Static gunline: mortars, Quake-Cannons and spotters grind the enemy into the mud.*
- *Rule:* Pre-Registered Fire: [INDIRECT FIRE] weapons get +1 to Wound against units within 6″ of an objective. Fire Mission! may be issued at 24″.
- *Enhancement:* **Master of Ordnance** (+10 pts, Trench-Marshal) — Fire Mission! applies to 2 artillery units, and they re-roll Wound rolls of 1.
- *Enhancement:* **Vox-Relay Mast** (+10 pts, Trench-Marshal) — The Order range is 24″.
- *Stratagem:* **Creeping Barrage** (2 CP) — Start of the round: Pick a 6″ zone. Enemy units ending a Move in it gain 1 Suppression token.
- *Stratagem:* **Danger Close** (1 CP) — An [INDIRECT FIRE] unit targets an enemy engaged with friendlies: Allowed; each natural 1 to hit hits the friendly unit instead.
- *Stratagem:* **Counter-Battery** (1 CP) — An enemy [INDIRECT FIRE] unit shoots: After it resolves, one friendly artillery unit may shoot it.

**D3. Grinder Brigade** — *Horde: bodies on every objective, never give ground.*
- *Rule:* Endless Waves: once per round, when a Trench-Trooper unit is destroyed, set up a new 10-model unit of Trench-Troopers wholly within 6″ of your board edge (it counts as having activated). Max 2 per battle.
- *Enhancement:* **Iron Discipline** (+10 pts, Field Commissar) — Friendly Troopers within 6″ ignore Rattled.
- *Enhancement:* **Banner of the Unbroken** (+10 pts, Trench-Marshal) — The attached unit counts double CTRL while it has 5+ models.
- *Stratagem:* **Hold the Line** (1 CP) — A Trooper unit on an objective is targeted: It cannot become Pinned this round.
- *Stratagem:* **Over the Top** (1 CP) — A Trooper unit activates: It may Charge after a Move this activation.
- *Stratagem:* **Meat Shield** (1 CP) — A friendly vehicle within 3″ of a Trooper unit is targeted: The shooter must target the Troopers instead if they are visible.

<!--/DETACH:02-->

---

## 3. The Sun-Pyre Witch-Courts 🟡 — DICE BANKING · ★★★
*Proxies: battle-sister armies, Witch Hunters, Flagellants, Inquisition, any gothic zealots.*

**Learned from**
- ✅ **Sisters' Miracle Dice** (gained when units die, then swapped in for rolls): one of the most skill-expressive mechanics GW has made. Players love "saving the 6 for the melta".
- ⛔ **Unlimited substitution:** in sci-fi wargames it allowed guaranteed max-damage alpha strikes. Our pool is capped at **3**, only for Hit/Wound/Save (detachment D1 extends it to Charge/Damage on [SCORCH] only).
- ⛔ **Generating dice from too many sources:** only deaths and [SCORCH].

**How it plays:**
- Aggressive short-range fire: flamers, meltas, penitents.
- Every martyr and every burn banks a die. Rounds 3–4 are where the Witch-Courts become terrifying, because you spend banked 6s on the shots that matter.
- Weak to long-range gunlines that never let them burn anything.

**Stat DNA:** MOV ● · MS ▲ · RS ▲ · ARM ▲ (penitents ▼▼) · MIGHT ● · CTRL ● · Density 18–26.

<!--UNITS:03-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Grand Inquisitrix | C2 Leader (Warlord) | 1 | 6" · 2+ · 2+ · 3+ · 5 · 1 · WARD 4+ | Ember pistol, Relic blade | Witch-Mark; Lead the Purge | **95** |
| Canoness of the Pyre | C2 Leader (Champion) | 1 | 6" · 2+ · 2+ · 3+ · 5 · 1 · WARD 5+ | Ember pistol, Brazier-blade | Blessed Edge; Lead the Charge | **95** |
| Confessor-Firebrand | C1 Leader (Support) | 1 | 6" · 2+ · 2+ · 4+ · 3 · 1 | Ember pistol, Chain-scourge | Fiery Sermon; Kindle Faith | **70** |
| Null-Maiden Warden | C1 Leader (Specialist) | 1 | 6" · 2+ · 2+ · 4+ · 3 · 1 | Ember pistol, Blessed blade | Null Aura; Veil of Silence | **75** |
| Sisters of the Pyre | C1 Trooper / Elite | 5–10 | 6" · 2+ · 2+ · 3+ · 1 · 2 | Sacred bolter, Combat blade | Sacred Rites | **125** (+16/m) |
| Pilgrim Levy | C1 Trooper | 10 | 6" · 4+ · 3+ · 5+ · 1 · 2 | Pilgrim musket, Pitchfork & flail | Fodder for the Pyre | **95** |
| Penitent Flagellants | C1 Trooper | 5–10 | 7" · 3+ · 3+ · 7+ · 1 · 1 | Chain-scourge | Rapture of Pain; Frenzy of Contrition | **50** (+10/m) |
| Reliquant Warsuits | C2 Elite | 3 | 5" · 2+ · 2+ · 3+ · 4 · 1 | Pyre-cannon, Great weapon / fist | Sanctified Plate | **135** |
| Pyre-Justiciars | C2 Elite | 3–5 | 6" · 2+ · 2+ · 3+ · 4 · 2 · WARD 5+ | Sacred bolter, Justiciar halberd | Sworn Bodyguard; Shield-Sisters | **155** (+40/m) |
| Purgator Vanguard | C1 Trooper (specialist) | 5 | 7" · 3+ · 2+ · 3+ · 1 · 1 | Hand-pyre, Melta gun, Combat blade | Purge at Arm's Length | **120** |
| Ascendant Seraphs | C1 Elite (fast) | 3–5 | 10" · 2+ · 3+ · 3+ · 1 · 1 | Twin ember pistols, Blessed blade | Descend in Glory | **75** (+25/m) |
| Purifier Outriders | C2 Elite (fast) | 3–5 | 12" · 2+ · 3+ · 4+ · 3 · 1 | Sacred bolter, Hand-pyre, Chain-scourge | Cleansing Pass | **105** (+29/m) |
| Vindicant Squad | C1 Trooper / Elite | 5 | 6" · 2+ · 2+ · 3+ · 1 · 2 | Pyre-cannon, Missile launcher, Combat blade | Steady Faith | **150** |
| Acolyte Cell | C1 Trooper (specialist) | 3–5 | 7" · 3+ · 2+ · 5+ · 1 · 1 | Carbine, Combat blade | Informants | **55** (+10/m) |
| Mortification Engine | C3 Brute | 1–2 | 6" · 2+ · 5+ · 4+ · 9 · 3 | Hand-pyre, Penance flails | Endless Contrition; Agony Drives Them | **105** (+80/m) |
| Pyre-Altar Crawler | C4 Behemoth | 1 | 10" · 4+ · 3+ · 3+ · 16 · 3 | Pyre-cannon, Pyre-cannon, Hymn-stubber, Hull ram | Sacred Pyre | **175** |
| Scourging Tank | C4 Behemoth | 1 | 10" · 4+ · 3+ · 3+ · 16 · 3 | Penance cannon, Pyre-cannon, Hull ram | Litany of Ruin | **180** |
| Sanctum Carrier | C4 Behemoth (transport) | 1 | 10" · 4+ · 3+ · 3+ · 12 · 2 | Hymn-stubber, Hull ram | Mobile Shrine | **115** |
| Hymn-Organ Battery | C4 Behemoth (support) | 1 | 8" · 5+ · 3+ · 3+ · 12 · 1 | Hymn-organ missiles, Hymn-stubber, Hull ram | Psalm of Fire | **140** |
| Cathedral Colossus | C5 Behemoth | 1 | 10" · 2+ · 2+ · 3+ · 22 · 6 · WARD 5+ | Sun-spear lance, Pyre-mouths, Titan stomp | Bells of Judgement | **335** |
<!--/UNITS:03-->

**Detachments**
<!--DETACH:03-->
**Core rule — Pyre-Dice:** Command Phase: roll 1 D6 and bank it as a Pyre-Die (keep the result). Also bank 1 when a friendly unit is destroyed. Maximum 3 banked. Once per activation, before rolling, you may replace ONE of your own Hit, Wound, ARM-save or Charge dice with a banked die. Pyre-Dice are never used on the opponent's rolls.

**Gamble — Martyr's Pyre** *(risk: resource)*: Once per battle, when a unit activates, spend ALL banked Pyre-Dice (minimum 2): its weapons gain [SHREDDING WOUNDS] and +1 Damage this activation. The bank is empty afterwards.

**D1. Burning Rose** — *Flamers forward: close the distance, burn the objectives.*
- *Rule:* Searing Purgation: [SCORCH] weapons gain +1 PEN. Once per round, one [SCORCH] attack against a unit on an objective also inflicts D3 Fatal Wounds on a 5+.
- *Enhancement:* **Ember of the First Pyre** (+15 pts, Canoness of the Pyre) — +1 Damage to melee attacks on a round she charged.
- *Enhancement:* **Ash-Crown** (+10 pts, Grand Inquisitrix) — The attached unit gets +1 PEN with ranged weapons.
- *Stratagem:* **Purging Flame** (1 CP) — A unit with [SCORCH] weapons is selected to Shoot: Re-roll its Wound rolls this activation.
- *Stratagem:* **Wall of Fire** (1 CP) — An enemy unit declares a Charge against a unit with [SCORCH] weapons: That unit's Retaliation Strike is made with one [SCORCH] weapon instead (hits automatically).
- *Stratagem:* **Fan the Flames** (1 CP) — A friendly unit is destroyed: Bank 2 Pyre-Dice instead of 1 (max 3).

**D2. Penitent Host** — *Bleed for it: chipped squads get deadlier, so the opponent must finish what they start.*
- *Rule:* Blood of Martyrs: units below Starting Strength (or damaged, for single models) get +1 to Hit; below Half-Strength they also get +1 to Wound.
- *Enhancement:* **Scourge of Contrition** (+15 pts, Confessor-Firebrand) — Friendly units within 6″ get +1 to Wound in melee on a round they charged.
- *Enhancement:* **Martyr's Shroud** (+15 pts, Canoness of the Pyre) — The bearer has UNYIELDING 5+.
- *Stratagem:* **Final Absolution** (1 CP) — A friendly Class 1–2 unit is destroyed in melee: Before removal, its surviving models fight once more.
- *Stratagem:* **Unbroken Faith** (1 CP) — A unit would become Rattled: It is not Rattled.
- *Stratagem:* **Rush to Martyrdom** (1 CP) — A unit below Starting Strength declares a Charge: +2″ to the Charge roll.

**D3. Witch-Hunter Tribunal** — *Hunt the leaders and casters, ignore the rest.*
- *Rule:* Sentence of the Court: before the battle mark 2 enemy units (at least 1 must be a Leader or [PSYCHIC / ARCANE] unit if possible). Your attacks against Marked units re-roll Wound rolls of 1 and gain [PRECISION]. When a Marked unit is destroyed, bank 1 Pyre-Die.
- *Enhancement:* **Seal of the Tribunal** (+10 pts, Grand Inquisitrix) — The attached unit re-rolls Wound rolls of 1.
- *Enhancement:* **Null-Lantern** (+10 pts, Null-Maiden Warden) — Null Aura range becomes 9″ and also applies to Fatal Wounds from spells (ignored on 5+).
- *Stratagem:* **Interrogate** (1 CP) — A unit ends a Fight action engaged with a Marked unit: Gain 1 CP (once per battle).
- *Stratagem:* **Burn the Witch** (1 CP) — A unit targets a Marked [PSYCHIC / ARCANE] unit: Its weapons gain [SCORCH] and +1 Damage.
- *Stratagem:* **Sentence Passed** (2 CP) — Command Phase: Move one Mark to a new enemy unit.

<!--/DETACH:03-->

---

## 4. The Aegis Knight-Houses 🟡 — FACING · ★★
*Proxies: Imperial / daemonic Knights, knight-walker, Bretonnian conversions, any mech kit.*

**Learned from**
- ✅ **knight-walker armies:** the fantasy of walking a giant across the table. knight-walker as the "small" option. Big objective control per model (Knights have huge OC in 10th).
- ⛔ **Damaged profiles** (stats dropping as wounds are lost): heavy bookkeeping. We use the **front arc** instead, which is a positional skill, not a table lookup.
- ⛔ **Skew** (an opponent's anti-infantry weapons doing nothing): Squires and Cavaliers give real infantry targets, and the 3-big-unit cap.

**How it plays:**
- 4–8 models.
- Which way your Knight faces matters as much as where it stands: the front arc carries [WARD 4+] against shooting, while the rear gives the enemy +1 to Wound.
- Charges are free Crushing Impacts.
- Easy to learn, hard to master: flanking units and tar-pits are your nightmare.

**Stat DNA:** MOV ▲ · MS ▲ · RS ● · ARM ▲ · MIGHT ▲▲ · CTRL ▲▲ · Density 6–14.

<!--UNITS:04-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| High Baron in Exalted Knight | C4 Leader (Warlord) | 1 | 10" · 2+ · 3+ · 3+ · 15 · 5 | Thunder cannon, Heavy stubber, Reaper chain-sword | Liege-Lord's Command; Lord of the House | **205** |
| Herald-Seneschal | C2 Leader (Champion) | 1 | 8" · 2+ · 3+ · 3+ · 6 · 3 · WARD 5+ | Heavy pistol, Household greatsword | Oath of the Household; Squire's Duty | **90** |
| Sacristan Forge-Wright | C1 Leader (Support) | 1 | 8" · 2+ · 3+ · 4+ · 3 · 3 | Heavy pistol, Servo-wrench | Field Repairs | **60** |
| Banner-Squire | C1 Leader (Specialist) | 1 | 8" · 2+ · 3+ · 4+ · 3 · 3 | Squire carbine, Combat blade | House Standard; Rally to the Colours | **65** |
| Feudal Squires | C1 Trooper | 5–10 | 8" · 3+ · 4+ · 4+ · 2 · 3 | Squire carbine, Combat blade | Bondsmen | **90** (+15/m) |
| Household Men-at-Arms | C1 Trooper / Elite | 5–10 | 8" · 2+ · 3+ · 4+ · 1 · 3 | Battle rifle, Halberd | Pike Wall | **70** (+14/m) |
| Steam-Cavaliers | C2 Elite (fast) | 3–5 | 14" · 2+ · 4+ · 4+ · 3 · 3 | Squire carbine, Steam-lance | Ride Down | **85** (+33/m) |
| Bondsmen Halberdiers | C2 Elite | 3–5 | 8" · 2+ · 3+ · 3+ · 4 · 3 | Battle rifle, Bond-halberd | Intercept | **135** (+39/m) |
| Retainer Gun-Team | C2 Trooper (support) | 2–3 | 7" · 4+ · 4+ · 4+ · 3 · 3 | Autocannon, Bayonet / CCW | Braced Tripods | **65** (+21/m) |
| Sworn Huntsmen | C1 Trooper (specialist) | 2–3 | 8" · 4+ · 3+ · 5+ · 2 · 3 | Sniper rifle, Combat blade | Mark the Quarry | **45** (+14/m) |
| Squire-Walker Strider | C3 Brute | 1 | 10" · 2+ · 3+ · 3+ · 8 · 4 | Autocannon, Chain-cleaver | Squire Bond | **100** |
| Squire-Walker Thermal-Lancer | C3 Brute | 1 | 10" · 2+ · 3+ · 3+ · 8 · 4 | Thermal lance, Strider claw | Squire Bond | **105** |
| Squire-Walker Warden | C3 Brute | 1 | 10" · 2+ · 3+ · 3+ · 8 · 4 | Missile launcher, Heavy stubber, Strider claw | Sky-Hunter Optics | **100** |
| Paladin-Class Knight | C4 Brute / Behemoth | 1 | 10" · 2+ · 3+ · 3+ · 15 · 5 | Thunder cannon, Heavy stubber, Reaper chain-sword | Rapid Cycling | **200** |
| Gallant-Class Knight | C4 Brute / Behemoth | 1 | 10" · 2+ · 3+ · 3+ · 15 · 5 | Heavy stubber, Thunder-hammer, Reaper chain-sword | Glory Seeker | **205** |
| Errant-Class Knight | C4 Brute / Behemoth | 1 | 10" · 2+ · 3+ · 3+ · 15 · 5 | Thermal cannon, Heavy stubber, Reaper chain-sword | Fusion Lance | **195** |
| Warden-Class Knight | C4 Brute / Behemoth | 1 | 10" · 2+ · 3+ · 3+ · 15 · 5 | Avenger rotary, Gatling-flamer, Reaper chain-sword | Shield the Squires | **195** |
| Baronial Bombard | C4 Behemoth (support) | 1 | 10" · 5+ · 4+ · 3+ · 13 · 3 | Siege howitzer, Heavy stubber, Armoured stomp | House Ordnance | **140** |
| Iron Destrier Carriage | C4 Behemoth (transport) | 1 | 12" · 4+ · 4+ · 3+ · 13 · 4 | Heavy stubber, Armoured stomp | Squires Aboard | **130** |
| Bastion-Class Siege-Lord | C5 Behemoth | 1 | 12" · 2+ · 3+ · 3+ · 24 · 6 · WARD 5+ | Volcano-ion cannon, Missile launcher, Titan stomp | Towering Bulwark | **410** |
<!--/UNITS:04-->

**Detachments**
<!--DETACH:04-->
**Core rule — Ion Bulwark & Thunderous Joust:** Class 3–5 units have WARD 5+ against ranged attacks from models whose bases are in their front 180° arc (mark the front of the base). Class 3–5 units that charged trigger Crushing Impact for 0 CP and their melee weapons gain [CRASHING] that activation.

**Gamble — Vent the Reactor** *(risk: durability (dice))*: When a Class 3–5 unit activates: its front-arc WARD becomes 4+ and its weapons get +1 Attack until the End of Round. At the End of Round roll a D6: on 1–2 it suffers D3 Fatal Wounds.

**D1. Noble Lance** — *Big knights, few retainers: win the duels and the joust.*
- *Rule:* Chivalric Code: before the battle pick 1 Oath (Slay the Warlord · Hold the Line · Lay Low the Tyrant [a Class 4–5 unit]). When it is fulfilled your army becomes Honoured: +1 CP each Command Phase and Class 4–5 units get UNYIELDING 6+.
- *Enhancement:* **Mantle of the Liege** (+20 pts, High Baron in Exalted Knight) — The bearer has UNYIELDING 6+ from the start.
- *Enhancement:* **Heirloom Lance** (+10 pts, Gallant-Class Knight) — +1 Damage in melee on a round it charged.
- *Stratagem:* **Rotate Ion-Shields** (1 CP) — An enemy unit is selected to Shoot a Class 3–5 unit: Treat the attacker as in the front arc for this attack.
- *Stratagem:* **Trophy Kill** (1 CP) — A Class 4–5 unit destroys an enemy Leader: Fulfil any Oath that targets Leaders; heal D3 MIGHT.
- *Stratagem:* **Knightly Challenge** (1 CP) — A Class 4–5 unit is selected to Fight: Choose one enemy model: all its attacks target that model (precision).

**D2. Squire Hunt** — *Packs of squire-walkers bonded to a parent knight.*
- *Rule:* Bondsman Hunt: Squire-Walkers within 9″ of a Knight they are Bonded to (pick at deployment, up to 2 per Knight) get +1 to Hit against the last enemy unit that Knight attacked.
- *Enhancement:* **Huntmaster's Horn** (+10 pts, Paladin-Class Knight) — Bonded Squire-Walkers within 9″ get +1 to Hit with ranged weapons.
- *Enhancement:* **Fleet-Footed Strider** (+10 pts, Squire-Walker Strider) — +2″ MOV.
- *Stratagem:* **Pincer Strike** (1 CP) — Two Squire-Walkers attack the same target this round: The second gets +1 PEN.
- *Stratagem:* **Flushed from Cover** (1 CP) — A Squire-Walker hits an enemy unit in Cover: That unit loses Cover until the End of Round.
- *Stratagem:* **Covering Advance** (1 CP) — A Squire-Walker activates: It may make a 3″ move after shooting.

**D3. Feudal Muster** — *The whole household marches: retainers screen the knights.*
- *Rule:* Towering Bulwark: friendly Class 1–2 units within 3″ of a Class 4–5 Knight claim Cover; Knights may move over Class 1–2 enemy models.
- *Enhancement:* **Banner of the House** (+15 pts, Banner-Squire) — Friendly Class 1–2 units within 6″ get +1 ARM (to 3+ cap).
- *Enhancement:* **Veteran Sergeant-at-Arms** (+10 pts, Herald-Seneschal) — The attached unit gets +1 to Hit with ranged weapons.
- *Stratagem:* **Hold the Line, Squires!** (1 CP) — A Class 1–2 unit is charged: It is not Rattled and its Retaliation Strike gets +1 to Wound.
- *Stratagem:* **Close the Gap** (1 CP) — A Class 1–2 unit is destroyed within 6″ of a Knight: That Knight may make a 3″ move.
- *Stratagem:* **Muster Call** (2 CP) — Command Phase, once per battle: Return a destroyed Feudal Squires unit at half strength within 6″ of your table edge.

<!--/DETACH:04-->

---

## 5. The Abyssal Bathys-Corps 🟡 — DISPLACEMENT · ★★★
*Proxies: BioShock-style divers, sea-elf raiders conversions, airship-dwarf, Cthulhu/diving-suit kits, sea-monster models.*

**Learned from**
- ✅ **sea-elf raiders:** the "army from the deep" fantasy and the sea beasts.
- ✅ **airship-dwarf:** brass-and-rivet engineering.
- ✅ **Kill Team / Necromunda grapples:** dragging enemies is memorable.
- ⛔ **sea-elf's Tides of Death:** a fixed round-by-round timetable felt scripted. Our **Brine-Fog** is placed by the player each round.
- ⛔ **Too many "move the enemy" effects** (feels bad): only [HARPOON] weapons displace, roughly 1 in 4 units.

**How it plays:**
- Slow, heavy divers that control space.
- Fog hides your advance from long-range guns; harpoons drag enemy units off objectives and into Drill Brutes and abyssal beasts.
- Strong against static gunlines.
- Struggles against fast armies that never stand still to be harpooned.

**Stat DNA:** MOV ▼ · MS ▲ · RS ● · ARM ▲ · MIGHT ▲ · CTRL ● · Density 14–20.

<!--UNITS:05-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Trench-Lord Commodore | C2 Leader (Warlord) | 1 | 5" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Harpoon pistol, Anchor-blade | Tide-Reader; Coordinated Volleys | **95** |
| Abyssal Harpoon-Master | C2 Leader (Champion) | 1 | 5" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Grand harpoon, Gaff-hook | Reel Them In; Gaff Drill | **95** |
| Tide-Caller Oracle | C1 Leader (Support) | 1 | 5" · 2+ · 3+ · 3+ · 3 · 1 | Brine-bolt, Power weapon | Pressure-Fog; Undertow | **75** |
| Sonar-Spotter | C1 Leader (Specialist) | 1 | 5" · 2+ · 3+ · 3+ · 3 · 1 | Carbine, Combat blade | Echo-Ping | **60** |
| Trench-Dredge Divers | C1 Trooper | 5–10 | 5" · 3+ · 4+ · 3+ · 2 · 2 | Rivet gun, Combat blade | Pressure Seal | **105** (+18/m) |
| Hydraulic Harpooners | C1 Trooper / Elite | 5–10 | 5" · 2+ · 3+ · 3+ · 2 · 2 | Harpoon rifle, Drill-claw | Winch-Drag | **120** (+21/m) |
| Hull-Breacher Divers | C1 Trooper | 5–10 | 6" · 2+ · 4+ · 3+ · 2 · 1 | Rivet pistol, Breaching drill | Crack the Hull | **105** (+20/m) |
| Leviathan-Plate Divers | C2 Elite | 3–5 | 4" · 2+ · 3+ · 3+ · 4 · 1 | Harpoon-gatling, Hydraulic hammer | Crushing Hull-Plating; Winch-Drag | **130** (+39/m) |
| Pressure-Hammer Brutes | C2 Elite (brute) | 3–5 | 5" · 2+ · 5+ · 3+ · 4 · 1 | Pressure-hammer | Implosion Strike | **125** (+38/m) |
| Lantern-Eel Swarm | C1 Trooper | 5–10 | 8" · 3+ · 6+ · 5+ · 2 · 1 | Lamprey bites | Lure-Light | **65** (+14/m) |
| Depth-Charge Team | C2 Trooper (support) | 2–3 | 4" · 4+ · 4+ · 3+ · 3 · 1 | Depth-charge mortar, Bayonet / CCW | Pressure Burst | **60** (+23/m) |
| Reef-Skimmer Outriders | C2 Elite (fast) | 3–5 | 11" · 2+ · 4+ · 3+ · 3 · 1 | Harpoon carbine, Cavalry lance | Running Drag | **100** (+40/m) |
| Snapper Snipers | C1 Trooper (specialist) | 2–3 | 5" · 4+ · 3+ · 4+ · 2 · 1 | Barbed long-harpoon, Combat blade | Pluck from the Ledge | **50** (+15/m) |
| Bathys-Drill Brute | C3 Brute | 1 | 5" · 2+ · 3+ · 3+ · 10 · 3 | Steam-vent, Abyssal drill | Tunnel Approach | **115** |
| Pressure-Squid Horror | C3 Brute | 1 | 7" · 2+ · 6+ · 3+ · 9 · 3 | Crushing tentacles | Tentacle Grab; Boneless | **95** |
| Diving-Bell Crawler | C4 Behemoth (transport) | 1 | 9" · 4+ · 4+ · 3+ · 13 · 2 | Bolt-caster, Crawler ram | Bell Drop | **110** |
| Torpedo-Ram Crawler | C4 Behemoth | 1 | 9" · 4+ · 4+ · 3+ · 18 · 3 | Torpedo tubes, Bolt-caster, Crawler ram | Pressure Warheads | **170** |
| Leviathan Diving-Walker | C4 Brute / Behemoth | 1 | 7" · 2+ · 3+ · 3+ · 15 · 3 | Harpoon-battery, Crusher fists | Winch-Drag; Hull Redundancy | **200** |
| Abyssal Kraken | C4 Behemoth | 1 | 8" · 2+ · 6+ · 3+ · 15 · 3 | Kraken arms, Colossal jaws | Drag to the Depths | **165** |
| Abyssal Mega-Leviathan | C5 Behemoth | 1 | 8" · 2+ · 6+ · 3+ · 22 · 6 · UNY 6+ | Titan stomp, Colossal jaws, Bile-geyser | Tidal Wave | **315** |
<!--/UNITS:05-->

**Detachments**
<!--DETACH:05-->
**Core rule — Winch-Harpoons & the Rising Tide:** Weapons with [HARPOON] that hit a Class 1–4 unit drag it 3″ straight toward the shooter (stop 1″ away; not out of engagement). The Tide is public: Round 1 Low Tide — units more than 15″ from the shooter cannot be targeted (the Hidden cap); Round 2 Flood — +2″ MOV and ranged weapons gain [ASSAULT]; Round 3 High Tide — [STRIKE FIRST]; Round 4 Ebb — units may Fall Back and still Shoot or Charge.

**Gamble — Anchor-Lock** *(risk: position)*: When a unit with [HARPOON] activates: it cannot Move for the rest of the round, but its [HARPOON] weapons get +1 PEN and drag 6″ instead of 3″.

**D1. Deep Trench** — *Advance under the fog and spring at High Tide.*
- *Rule:* Benthic Fog: the Low Tide 15″ targeting cap also applies in Round 2.
- *Enhancement:* **Pressure-Lantern** (+15 pts, Tide-Caller Oracle) — Friendly units within 6″ get +1 ARM (to 3+ cap) against ranged attacks.
- *Enhancement:* **Abyssal Patience** (+10 pts, Trench-Lord Commodore) — The attached unit has WARD 5+.
- *Stratagem:* **Dive!** (1 CP) — An enemy unit targets a friendly Class 1–2 unit: That unit counts as [STEALTH] for the attack.
- *Stratagem:* **Rise from the Deep** (1 CP) — High Tide (Round 3): One unit makes a free 3″ move before the first activation.
- *Stratagem:* **Silent Running** (1 CP) — A unit activates in Round 1–2: It is [UNSEEN 12″] until the End of Round if it does not Shoot.

**D2. Leviathan Pod** — *Beasts and walkers anchor the line, divers fill the gaps.*
- *Rule:* Pod-Bond: Class 3–5 units within 6″ of each other get UNYIELDING 6+.
- *Enhancement:* **Elder Leviathan** (+50 pts, Abyssal Kraken) — UNYIELDING 5+.
- *Enhancement:* **Harpoon-Master's Claim** (+15 pts, Abyssal Harpoon-Master) — +1 Damage in melee on a round it charged.
- *Stratagem:* **Feeding Frenzy** (1 CP) — A beast destroys an enemy unit: Heal D3 MIGHT.
- *Stratagem:* **Crushing Deep** (1 CP) — A Class 3–5 unit fights a dragged unit: +1 to Wound.
- *Stratagem:* **Ink Cloud** (1 CP) — A Class 3 unit is targeted: Attacks against it suffer −1 to Hit until the End of Round.

**D3. Salvage Corps** — *Heavy suits and crawlers that take objectives and refuse to leave.*
- *Rule:* Hull-Plating: Class 1–2 units reduce incoming PEN by 1 while within 3″ of an objective.
- *Enhancement:* **Salvage Rights** (+10 pts, Trench-Lord Commodore) — Objectives this model controls stay controlled ([SECURED]).
- *Enhancement:* **Rivet-Master** (+10 pts, Hydraulic Harpooners) — +1 PEN with ranged weapons.
- *Stratagem:* **Weld the Breach** (1 CP) — A unit within 3″ of an objective activates: Heal 1 MIGHT on every model.
- *Stratagem:* **Claim the Wreck** (1 CP) — An enemy Class 4–5 unit is destroyed within 6″: Place an objective marker where it died (counts for Tactical cards only).
- *Stratagem:* **Pressure Lock** (1 CP) — A unit is charged on an objective: It cannot be moved by enemy abilities until the End of Round.

<!--/DETACH:05-->

---

# GRAND ALLIANCE 2 — THE NOCTURNE COVENANTS

## 6. The Sanguine Aristocracy 🟡 — LIFESTEAL & DUELS · ★★
*Proxies: vampire armies, Vampire Counts, Blood Knights, blood-thirsting super-soldiers conversions.*

**Learned from**
- ✅ **vampire:** vampire heroes healing and duelling (Deathly Invocation), and Blood Knights' thunderous charge.
- ⛔ **Unkillable regenerating heroes** (fantasy wargames 3 vampire lords): healing **only from kills**, max 2 MIGHT per kill, and Fatal Wounds still work.
- ⛔ **Summoning mid-game:** that belongs to Mordant (Growth), not here.

**How it plays:**
- Hero-hammer: 2–3 vampire Leaders do most of the work, protected by frail Thrall-Levies.
- A lord that keeps killing stays at full MIGHT. A lord that gets stuck in a tar-pit or shot from range fades.
- Free Epic Challenges make duels a core decision.

**Stat DNA:** MOV ▲ · MS ▲▲ · RS ▼▼ · ARM ● · MIGHT ▲▲ (lords) · CTRL ● · Density 14–22.

<!--UNITS:06-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Count Palatine Blood-Lord | C2 Leader (Warlord) | 1 | 7" · 2+ · 4+ · 3+ · 6 · 1 · WARD 4+ | Duelling pistol, Blood-forged blade | Lord of the Night; Dominate | **125** |
| Crimson Duelist-Countess | C2 Leader (Champion) | 1 | 7" · 2+ · 4+ · 3+ · 6 · 1 · WARD 5+ | Duelling pistol, Twin sabres | Aristocratic Duellist; Riposte | **120** |
| Blood-Sorcerer | C1 Leader (Mystic) | 1 | 7" · 2+ · 4+ · 4+ · 4 · 1 | Blood-bolt, Power weapon | Gravesite Summoning; Unholy Vigour | **90** |
| Night-Shade Assassin | C1 Leader (Assassin) | 1 | 7" · 2+ · 4+ · 4+ · 4 · 1 | Duelling pistol, Blood-dagger | Strike from the Mist | **90** |
| Thrall-Levies | C1 Trooper | 10 | 7" · 3+ · 5+ · 5+ · 1 · 2 | Bayonet / CCW | Blood Cattle | **110** |
| Deathless Levy | C1 Trooper | 5–10 | 5" · 2+ · 5+ · 5+ · 1 · 2 | Grave-spear | Deathless; Raised Again | **70** (+11/m) |
| Blood-Sworn Courtiers | C1 Trooper / Elite | 5–10 | 7" · 2+ · 4+ · 3+ · 2 · 2 | Courtly blade, Courtly pistol | Thirst for Glory | **145** (+21/m) |
| Crimson Guard Duelists | C2 Elite | 3–5 | 7" · 2+ · 4+ · 3+ · 5 · 2 · WARD 5+ | Crimson halberd | Courtly Fencing; Sworn Guard | **215** (+52/m) |
| Grave-Knights | C2 Elite (fast) | 3–5 | 13" · 2+ · 5+ · 3+ · 4 · 1 | Grave-lance | Deathly Charge; Deathless Steeds | **175** (+45/m) |
| Bat-Swarm Hosts | C1 Trooper | 5–10 | 8" · 2+ · 6+ · 6+ · 2 · 1 | Fangs & talons | Cloud of Wings | **100** (+16/m) |
| Dire Blood-Hounds | C1 Trooper | 5–10 | 10" · 2+ · 6+ · 6+ · 1 · 1 | Fangs & talons | Scent of Blood | **60** (+12/m) |
| Night-Ghast Brutes | C2 Elite (brute) | 3–5 | 7" · 2+ · 6+ · 4+ · 5 · 1 | Ghast talons | Blood-Frenzy | **145** (+38/m) |
| Crypt Arbalests | C1 Trooper | 5–10 | 7" · 2+ · 4+ · 4+ · 1 · 2 | Heavy crossbow, Rusted blade | Patient Aim | **95** (+12/m) |
| Grave-Ward Sentinels | C2 Elite | 3–5 | 6" · 2+ · 4+ · 3+ · 5 · 1 · WARD 5+ | Grave-glaive | Cursed Edge | **180** (+49/m) |
| Night-Ghast Horror | C3 Brute | 1 | 9" · 2+ · 6+ · 4+ · 10 · 3 | Rending talons | Shriek | **120** |
| Altar of Ichor | C3 Brute (support) | 1 | 5" · 3+ · 5+ · 4+ · 7 · 1 | Ichor-lash, Bayonet / CCW | Blood-Tide; Ichor Reservoir | **85** |
| Midnight Coach | C4 Behemoth (transport) | 1 | 12" · 3+ · 5+ · 3+ · 14 · 2 | Spectral lanterns, Trampling steeds | Mist-Form Relocation | **150** |
| Crimson Abomination | C4 Behemoth | 1 | 10" · 2+ · 6+ · 4+ · 17 · 3 | Rending talons, Corpse-maw | Gorge | **215** |
| Blood-Prince on Abyssal Drake | C4 Leader (Warlord) | 1 | 10" · 2+ · 6+ · 4+ · 17 · 3 | Blood-forged lance, Corpse-maw | Terror of the Skies; Unholy Resilience | **195** |
| Abyssal Blood-Wyrm | C5 Behemoth | 1 | 11" · 2+ · 6+ · 4+ · 22 · 6 · UNY 6+ | Titan stomp, Corpse-maw | Blood-Storm | **305** |
<!--/UNITS:06-->

**Detachments**
<!--DETACH:06-->
**Core rule — The Hunger:** At the end of a Fight action in which a Sanguine unit destroyed 1+ enemy models, it heals 2 MIGHT (3 if it destroyed the whole enemy unit). For a multi-model unit, healing goes to its most damaged model first, then returns 1 slain model per 2 points left (never above Starting Strength).

**Gamble — The Red Thirst** *(risk: objective / position)*: When a unit activates: +1 Attack in melee and +2″ to Charge rolls this activation, but it must declare a Charge against the closest visible enemy unit if able, and its CTRL is 0 until it next activates.

**D1. Blood Court** — *Lords and duelists hunting the enemy's heroes.*
- *Rule:* Court of Duellists: Sanguine Leaders gain [PRECISION] in melee; each enemy Leader destroyed by a Sanguine Leader heals that Leader fully.
- *Enhancement:* **Heart-Seeker Blade** (+10 pts, Crimson Duelist-Countess) — Melee critical wounds become Fatal Wounds.
- *Enhancement:* **Crimson Mantle** (+25 pts, Count Palatine Blood-Lord) — UNYIELDING 5+.
- *Stratagem:* **Issue the Challenge** (1 CP) — A Leader ends a Charge: Choose an enemy Leader within 3″: both must fight each other this activation.
- *Stratagem:* **Blood-Quickened** (1 CP) — A Leader heals from The Hunger: It may make a 3″ move.
- *Stratagem:* **Noble Disdain** (1 CP) — A Leader is targeted by a ranged attack: −1 to Wound against it for the attack.

**D2. Grave Cavalcade** — *Grave-Knights and hounds running down the wounded.*
- *Rule:* Scent of Blood: +2″ to Move and Charge toward an enemy unit below Starting Strength.
- *Enhancement:* **Night-Mare Steed** (+10 pts, Count Palatine Blood-Lord) — +2″ MOV.
- *Enhancement:* **Banner of the Cavalcade** (+15 pts, Blood-Sorcerer) — Friendly units within 6″ get +1 to Hit in melee on a round they charged.
- *Stratagem:* **Ride Them Down** (1 CP) — A Class 2 cavalry unit ends a Charge: Crushing Impact for 0 CP.
- *Stratagem:* **Hunt the Weak** (1 CP) — A unit targets a unit below Half-Strength: Re-roll Wound rolls.
- *Stratagem:* **Spectral Steeds** (1 CP) — A cavalry unit moves: It may move over terrain and models.

**D3. Midnight Court** — *Mist, summoning and the deathless levy that will not stay down.*
- *Rule:* Endless Night: once per round, at the End of Round, one unengaged Sanguine unit more than 6″ from enemies may redeploy wholly within 6″ of a table edge, more than 8″ from enemies. Gravesite Summoning costs 1 CP instead of 2.
- *Enhancement:* **Grimoire of the Grave** (+10 pts, Blood-Sorcerer) — Raised Again returns D3+1 models.
- *Enhancement:* **Shroud of Night** (+10 pts, Night-Shade Assassin) — [STEALTH].
- *Stratagem:* **Rise, Rise!** (1 CP) — A Class 1 Deathless or Levy unit activates: Return D3 slain models.
- *Stratagem:* **Fog of the Crypt** (1 CP) — An enemy unit targets a unit within 6″ of a table edge: −1 to Hit.
- *Stratagem:* **Blood Tithe** (1 CP) — A Levy model is removed by Blood Cattle: Heal 2 MIGHT instead of 1.

<!--/DETACH:06-->

---

## 7. The Mordant Ghoul-Courts 🟡 — GROWTH · ★★
*Proxies: cannibal ghoul courts, crypt ghouls, fast zombies, feral mutant kits.*

**Learned from**
- ✅ **cannibal ghoul courts:** the **Delusion** (pick one army-wide quirk) is pure flavour, and Feeding Frenzy aggression.
- ⛔ **FEC's unlimited summoning:** extra bodies slowed games to a crawl. Growth is capped at **150% of starting size** and only comes from melee kills.

**How it plays:**
- A fast, armourless swarm that **gets bigger by eating**.
- Every enemy model killed in melee adds a ghoul to a nearby unit, so a won combat snowballs into the next.
- No shooting at all. Massed fire before contact is your enemy, so use terrain and speed.

**Stat DNA:** MOV ▲ · MS ● · RS — · ARM ▼▼ · MIGHT ● + [UNYIELDING 6+] · CTRL ● · Density 30–45.

<!--UNITS:07-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Ghoul-King of the Carrion Throne | C2 Leader (Warlord) | 1 | 7" · 2+ · 5+ · 5+ · 5 · 1 · WARD 5+ | Bone sceptre | Royal Decree; Summon the Court | **80** |
| Ghoul-King on Royal Corpse-Drake | C4 Leader (Warlord) | 1 | 10" · 3+ · 6+ · 5+ · 14 · 3 | Rending claws, Rotting maw | Royal Feeding Frenzy; Noxious Breath | **155** |
| Crypt-Seneschal | C1 Leader (Champion) | 1 | 7" · 3+ · 5+ · 6+ · 4 · 1 | Bone halberd | Herald of the King | **60** |
| Carrion-Surgeon | C1 Leader (Support) | 1 | 7" · 3+ · 5+ · 6+ · 3 · 1 | Bone shiv | Stitch the Courtiers | **55** |
| Court Poisoner | C1 Leader (Assassin) | 1 | 7" · 3+ · 5+ · 6+ · 3 · 1 | Bone darts, Envenomed claw | Tainted Feast | **70** |
| Crypt-Scullions | C1 Trooper | 10–15 | 8" · 4+ · 6+ · 7+ · 1 · 1 | Filthy claws | Deranged Endurance | **110** (+9/m) |
| Delusional Pike-Levy | C1 Trooper | 5–10 | 7" · 4+ · 6+ · 6+ · 1 · 2 | Splintered pike | Hold the Gate! | **75** (+10/m) |
| Crypt-Flayer Guard | C2 Elite (brute) | 3–5 | 7" · 3+ · 6+ · 6+ · 4 · 1 | Gnarled talons | Skreech | **110** (+23/m) |
| Ghoul-Knights | C2 Elite (fast) | 3–5 | 13" · 3+ · 6+ · 5+ · 3 · 1 | Femur-lance | Thundering Lance | **95** (+28/m) |
| Crypt-Horror Brutes | C2 Elite (brute) | 3–5 | 7" · 3+ · 6+ · 5+ · 4 · 1 | Gnarled talons | Gorged Flesh | **135** (+30/m) |
| Court Champions | C2 Elite | 3–5 | 7" · 2+ · 5+ · 5+ · 4 · 2 | Bone greatsword | Precision Duellists | **135** (+25/m) |
| Court Huntsmen | C1 Trooper (specialist) | 3–5 | 8" · 4+ · 5+ · 7+ · 1 · 1 | Bone javelins, Bone shiv | Flush the Quarry | **55** (+9/m) |
| Carrion Bat-Swarm | C1 Trooper | 5–10 | 8" · 4+ · 6+ · 7+ · 1 · 1 | Filthy claws | Flock | **65** (+11/m) |
| Feast-Hounds | C1 Trooper | 5–10 | 10" · 4+ · 6+ · 7+ · 1 · 1 | Filthy claws | Hunt Ahead | **65** (+10/m) |
| Bone-Slingers | C2 Trooper (support) | 2–3 | 6" · 5+ · 6+ · 6+ · 2 · 1 | Skull-catapult, Bayonet / CCW | Grisly Ammunition | **45** (+9/m) |
| Carrion Altar | C3 Brute (support) | 1 | 5" · 5+ · 6+ · 6+ · 6 · 1 | Bayonet / CCW | Dread Banquet; Royal Repast | **60** |
| Courtly Horror-Beast | C3 Brute | 1 | 9" · 3+ · 6+ · 6+ · 8 · 3 | Rending claws | Ravenous | **90** |
| Royal Corpse-Drake | C4 Behemoth | 1 | 10" · 3+ · 6+ · 5+ · 14 · 3 | Rending claws, Rotting maw | Noxious Breath | **165** |
| Mound-Giant of the Court | C4 Behemoth | 1 | 8" · 3+ · 6+ · 5+ · 14 · 3 | Tomb-stone club, Rotting maw | Rotting Bulk | **170** |
| The Carrion Colossus | C5 Behemoth | 1 | 11" · 2+ · 6+ · 5+ · 22 · 6 · UNY 6+ | Titan stomp, Rotting maw | Grand Feast | **275** |
<!--/UNITS:07-->

**Detachments**
<!--DETACH:07-->
**Core rule — Marrow-Feast & Feeding Frenzy:** Marrow-Feast: once per round, after a Mordant unit destroys 1+ enemy models in melee, it returns D3 slain models (Class 1) or heals D3 MIGHT (Class 2–5), never above Starting Strength. Feeding Frenzy: Class 1 Mordant units wholly within 9″ of a friendly Mordant Leader get +1 Attack in melee.

**Gamble — Delusional Crusade** *(risk: durability (voluntary))*: When a Leader activates, it may suffer 2 Fatal Wounds (cannot be saved or ignored): +2 Attacks and [CRASHING] on its melee weapons this activation.

**D1. The Royal Hunt** — *Delusion: the court is hunting a great beast. Monsters and knights chase big targets.*
- *Rule:* Royal Hunt: re-roll Wound rolls against Class 4–5 units. Class 2–4 Mordant units get +2″ MOV in Round 1.
- *Enhancement:* **Huntmaster's Horn** (+20 pts, Ghoul-King on Royal Corpse-Drake) — Re-roll all melee Wound rolls.
- *Enhancement:* **Trophy of the Beast** (+10 pts, Crypt-Seneschal) — +1 Damage on a round he charged.
- *Stratagem:* **Bring It Down!** (1 CP) — A Class 4–5 enemy is wounded: The next friendly unit to attack it gets +1 to Hit.
- *Stratagem:* **The Hunt Is On** (1 CP) — Command Phase: One Class 2–4 unit makes a free 3″ move.
- *Stratagem:* **Feast on the Kill** (1 CP) — A Class 4–5 enemy is destroyed: Every Mordant unit within 6″ triggers Marrow-Feast.

**D2. The Grand Feast** — *Delusion: a royal banquet. Leaders earn Deeds and the hordes grow frenzied.*
- *Rule:* Noble Deeds: each Leader gains 1 Deed per enemy model it destroys. At 3 Deeds, Feeding Frenzy from that Leader also gives +1 to Wound; at 6 Deeds it returns 1 slain Class 2 model to a unit within 6″ (once per round).
- *Enhancement:* **Gilded Goblet** (+15 pts, Ghoul-King of the Carrion Throne) — Friendly units within 9″ get +1 to Wound in melee on a round they charged.
- *Enhancement:* **Chef's Cleaver** (+10 pts, Carrion-Surgeon) — Stitch the Courtiers returns D3+1.
- *Stratagem:* **Second Helping** (1 CP) — A unit triggers Marrow-Feast: Trigger it again this round.
- *Stratagem:* **Cry of the Court** (1 CP) — A Leader gains a Deed: Gain 1 additional Deed.
- *Stratagem:* **Ravenous Rush** (1 CP) — A Class 1 unit within Frenzy range declares a Charge: +2″ to the Charge roll.

**D3. The Dragon Court** — *Delusion: a court of dragon-knights. Fewer models, more monsters, flying knights.*
- *Rule:* Dragon Lords: Class 4 Mordant units have UNYIELDING 6+ and +1 CTRL; [FLY] units may Charge after making a full Move over terrain.
- *Enhancement:* **Royal Scales** (+35 pts, Ghoul-King on Royal Corpse-Drake) — UNYIELDING 5+.
- *Enhancement:* **Dragon-Crested Helm** (+10 pts, Crypt-Seneschal) — +2″ MOV.
- *Stratagem:* **Wings of the Court** (1 CP) — A [FLY] unit activates: +3″ MOV this activation.
- *Stratagem:* **Plague-Breath Volley** (1 CP) — A Corpse-Drake uses Noxious Breath: Use it twice this round.
- *Stratagem:* **Guard the Lord** (1 CP) — A Leader is targeted within 3″ of a Class 2 unit: That unit suffers the attacks instead on a 3+.

<!--/DETACH:07-->

---

## 8. The Prometheus Flesh-Guilds 🟡 — GRAFTING · ★★★★
*Proxies: techno-priest armies, Dark Mechanicum, Haemonculus Covens, Necromunda Goliaths, any cyborg/Frankenstein kit.*

**Learned from**
- ✅ **AdMech's "all technology is sacred":** the widest weapon palette in the game (radium, arc, plasma, drills, welders).
- ✅ **Haemonculi:** grotesque surgery.
- ⛔ **AdMech's aura soup** (canticles, doctrinas, data-tethers and auras all at once), the community's #1 complaint. Prometheus has **one** resource: Graft Tokens, spent on permanent upgrades you can see on the unit card.

**How it plays:**
- A scaling army: modest in round 1, monstrous by round 4.
- You must fight close (enemy units dying within 6″) to harvest tokens, then decide which Golem or Strider becomes the monster.
- Punished by early pressure. Rewards planning.

**Stat DNA:** MOV ▼ · MS ▼ · RS ▲ · ARM ● · MIGHT ▲ · CTRL ● · Density 18–24.

<!--UNITS:08-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Arch-Chirurgeon Prime | C2 Leader (Warlord) | 1 | 5" · 3+ · 2+ · 3+ · 5 · 1 · WARD 5+ | Arc pistol, Surgeon's mechadendrites | Master of Flesh-Grafting; Harvest Protocol | **90** |
| Graft-Knight Paragon | C2 Leader (Champion) | 1 | 5" · 3+ · 2+ · 3+ · 6 · 1 · WARD 5+ | Arc pistol, Piston-hammer | Perfected Form | **100** |
| Rust-Priest Chirurgeon | C1 Leader (Support) | 1 | 5" · 4+ · 2+ · 4+ · 3 · 1 | Arc pistol, Power weapon | Field Surgery; Stitch as They Fight | **70** |
| Signal-Augur | C1 Leader (Specialist) | 1 | 5" · 4+ · 2+ · 4+ · 3 · 1 | Carbine, Combat blade | Target Uplink | **60** |
| Wire-Stitched Servitors | C1 Trooper | 5–10 | 5" · 5+ · 3+ · 4+ · 2 · 2 | Radium carbine, Bayonet / CCW | Pain-Suppressed | **125** (+15/m) |
| Galvanic Phalanx | C1 Trooper / Elite | 5–10 | 5" · 4+ · 2+ · 4+ · 1 · 2 | Galvanic rifle, Combat blade | Bionic Imperatives | **90** (+13/m) |
| Arc-Lancer Skirmishers | C1 Trooper (specialist) | 3–5 | 6" · 5+ · 2+ · 5+ · 2 · 1 | Arc-lance, Arc-goad | Lightning-Coil Overload | **60** (+15/m) |
| Stitched Brutes | C2 Elite (brute) | 3–5 | 5" · 4+ · 4+ · 4+ · 4 · 1 | Hydraulic fist | Grafted Hide | **100** (+30/m) |
| Bionic Praetorians | C2 Elite | 3–5 | 4" · 4+ · 2+ · 3+ · 4 · 1 · WARD 5+ | Plasma-welder, Piston-claw | Graft-Ready | **115** (+32/m) |
| Plasma-Welder Team | C2 Trooper (support) | 2–3 | 4" · 6+ · 3+ · 4+ · 3 · 1 | Fusion-torch, Bayonet / CCW | Calibrated | **80** (+25/m) |
| Galvanic Striders | C2 Elite (fast) | 3–5 | 10" · 4+ · 3+ · 4+ · 3 · 1 | Galvanic carbine, Arc-lance | Spider-Gait | **105** (+27/m) |
| Scrap-Mite Swarm | C1 Trooper | 5–10 | 6" · 5+ · 5+ · 6+ · 1 · 1 | Claws & teeth | Scavenge | **50** (+8/m) |
| Prometheus Flesh-Golem | C3 Brute | 1 | 7" · 4+ · 5+ · 4+ · 8 · 3 | Stitched fists | Patchwork Flesh; Galvanic Revival | **90** |
| Galvanic Strider-Walker | C3 Brute | 1 | 5" · 4+ · 2+ · 3+ · 9 · 3 | Autocannon, Arc-claws | Targeting Cogitator | **100** |
| Reclamation Engine | C3 Brute (support) | 1 | 4" · 6+ · 3+ · 4+ · 6 · 1 | Rendering vents, Bayonet / CCW | Salvage Crane | **65** |
| Tesla Pylon-Crawler | C4 Behemoth (support) | 1 | 7" · 6+ · 3+ · 3+ · 12 · 1 | Tesla discharge, Crushing tracks | Arc-Chain | **130** |
| Iron-Flesh Excavator-Walker | C4 Brute / Behemoth | 1 | 7" · 4+ · 2+ · 3+ · 14 · 3 | Rendering vents, Excavator drills | Redundant Organs | **180** |
| Gurney-Crawler | C4 Behemoth (transport) | 1 | 9" · 6+ · 3+ · 3+ · 12 · 2 | Heavy stubber, Crushing tracks | Mobile Surgery | **110** |
| Bio-Forge Tank | C4 Behemoth | 1 | 9" · 6+ · 3+ · 3+ · 16 · 3 | Battle cannon, Plasma-welder, Crushing tracks | Graft Lattice | **170** |
| Patchwork Colossus | C5 Behemoth | 1 | 9" · 3+ · 5+ · 4+ · 22 · 6 · UNY 6+ | Titan stomp, Grafted maw, Rendering vents | Living Graft-Bank | **275** |
<!--/UNITS:08-->

**Detachments**
<!--DETACH:08-->
**Core rule — Organ & Scrap Harvest:** When any unit (friend or foe) is destroyed within 6″ of a Prometheus unit, gain 1 Graft (max 3 banked). When a unit activates, spend 1 Graft to give it ONE permanent upgrade for the rest of the battle: +1 PEN on one weapon · +1 to Hit with one weapon · heal D3 MIGHT and +1 MIGHT maximum (once). Each unit can take each upgrade once.

**Gamble — Over-Graft** *(risk: durability + resource)*: Spend 2 Grafts on one unit at once for two different upgrades, then roll a D6: on a 1 the unit suffers D3 Fatal Wounds and loses one of the new upgrades (your choice).

**D1. Surgeon-Cult** — *Heal, rebuild and out-last.*
- *Rule:* Bloodied Instruments: Field Surgery and Master of Flesh-Grafting heal +1. Grafts may also be gained when a friendly unit loses its last model within 6″ of a Leader.
- *Enhancement:* **Bone-Saw of Prometheus** (+30 pts, Arch-Chirurgeon Prime) — The attached unit has UNYIELDING 5+.
- *Enhancement:* **Reserve Organs** (+10 pts, Rust-Priest Chirurgeon) — Field Surgery may be used twice per round.
- *Stratagem:* **Emergency Graft** (1 CP) — A unit is destroyed: Gain 2 Grafts instead of 1 (max 3).
- *Stratagem:* **Adrenal Shunt** (1 CP) — A unit is selected to Fight: +1 Attack; it suffers 1 Fatal Wound afterward.
- *Stratagem:* **Stitch Them Back** (2 CP) — End of Round: Return D3 slain models to a Class 1 unit within 6″ of a Leader.

**D2. Forge-Legion** — *Cyborg infantry phalanxes that switch protocols each round.*
- *Rule:* Bionic Imperatives: Command Phase, choose for the army: Protector (+1 ARM against attacks from more than 12″; ranged weapons gain [HEAVY]) or Conqueror (ranged weapons gain [ASSAULT] and +1 PEN within 9″).
- *Enhancement:* **Command Uplink** (+15 pts, Signal-Augur) — Friendly units within 9″ re-roll Hit rolls of 1.
- *Enhancement:* **Overclocked Servos** (+10 pts, Galvanic Phalanx) — +2″ MOV.
- *Stratagem:* **Override Protocol** (1 CP) — A unit activates: Use the other Imperative for this unit this activation.
- *Stratagem:* **Binharic Volley** (1 CP) — Two units target the same enemy: The second gets +1 to Wound.
- *Stratagem:* **Machine Resolve** (1 CP) — A unit would be Rattled: It is not.

**D3. Galvanic Breach** — *Lightning-coils and arc weapons: trade your own MIGHT for damage.*
- *Rule:* Lightning-Coil Overload: when a unit is selected to Shoot or Fight, it may suffer 1 Fatal Wound: its weapons gain [IMPALING HITS] this activation.
- *Enhancement:* **Capacitor Heart** (+10 pts, Graft-Knight Paragon) — Melee critical hits on 5+ (auto-wound).
- *Enhancement:* **Storm-Coil Mantle** (+10 pts, Arch-Chirurgeon Prime) — Units within 6″ ignore the Fatal Wound from Overload on a 4+.
- *Stratagem:* **Chain Lightning** (1 CP) — An Overloaded attack destroys a unit: Inflict D3 Fatal Wounds on another enemy unit within 6″.
- *Stratagem:* **Grounding Rods** (1 CP) — A unit is hit by an [PSYCHIC / ARCANE] attack: It gets WARD 5+ against that attack.
- *Stratagem:* **Discharge** (1 CP) — A unit is charged: The charging unit suffers D3 Fatal Wounds on a 4+.

<!--/DETACH:08-->

---

## 9. The Frost-Skaer Blood-Raiders 🟡 — OATHS · ★★★
*Proxies: wolf-warrior armies, Norsca / Old World, viking ranges, bears and mammoths.*

**Learned from**
- ✅ **wolf-warrior armies' Saga detachment:** complete a saga condition and the army unlocks a buff. Players loved earning power mid-game, so it becomes our per-unit **Oaths**.
- ✅ **Norsca:** monsters and berserkers.
- ⛔ **Tracking too many conditions:** max 1 Oath per unit, only 4 Oath types, each fulfilled Oath marked with a token.

**How it plays:**
- Heroic melee raiders with light armour.
- At deployment each unit swears a deed (slay a Leader, hold a line, first blood, fell a giant). Fulfilling it ignites a permanent rune.
- Shamans add small, flexible magic (no stealth: Bathys owns concealment).
- Weak shooting and armour make the oaths a race.

**Stat DNA:** MOV ▲ · MS ▲ · RS ▼ · ARM ▼ · MIGHT ▲ · CTRL ● · Density 16–22.

<!--UNITS:09-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Jarl Saga-Lord | C2 Leader (Warlord) | 1 | 7" · 2+ · 4+ · 4+ · 6 · 1 · WARD 5+ | Throwing axe, Frost-forged axe | Lord of the Long Hall; Saga-Keeper | **100** |
| Jarl on Frost-Bear | C3 Leader (Champion) | 1 | 11" · 2+ · 5+ · 4+ · 9 · 2 · WARD 5+ | Rune-axe, Bear claws | Bear-Rage | **95** |
| Runic Frost-Shaman | C1 Leader (Mystic) | 1 | 7" · 2+ · 4+ · 5+ · 3 · 1 | Frost-bolt, Rune-axe | Howling Blizzard | **75** |
| Skald of the Long Hall | C1 Leader (Support) | 1 | 7" · 2+ · 4+ · 5+ · 3 · 1 | Heavy pistol, Bearded axe | Battle-Chant | **70** |
| Wolf-Skin Huntress | C1 Leader (Assassin) | 1 | 7" · 2+ · 4+ · 5+ · 3 · 1 | Rune-bow, Rune-axe | Mark the Prey | **65** |
| Blood-Skaer Raiders | C1 Trooper | 5–10 | 8" · 3+ · 5+ · 5+ · 2 · 1 | Throwing axes, Bearded axe | Berserker Fury | **95** (+15/m) |
| Shield-Wall Huscarls | C1 Trooper / Elite | 5–10 | 7" · 2+ · 4+ · 3+ · 2 · 2 | Throwing spears, Axe & shield | Shield-Wall | **160** (+21/m) |
| Hall-Guard Berserkers | C1 Trooper | 5–10 | 8" · 3+ · 5+ · 6+ · 2 · 1 | Great axe | Trance of Fury; Berserker Fury | **115** (+12/m) |
| Wolf-Kin Pack | C1 Trooper | 5–10 | 10" · 3+ · 6+ · 7+ · 2 · 1 | Wolf-fangs | Lead the Raid | **70** (+13/m) |
| Hearth-Wardens | C2 Elite | 3–5 | 6" · 2+ · 4+ · 4+ · 4 · 1 · WARD 5+ | Rune-crossbows, Great axe | Oath-Bound Guard | **135** (+34/m) |
| Frost-Bear Riders | C2 Elite (fast) | 3–5 | 10" · 2+ · 5+ · 5+ · 4 · 1 | Bear claws & spear | Bear Charge | **120** (+29/m) |
| Long-Bow Skirmishers | C1 Trooper (specialist) | 3–5 | 8" · 3+ · 4+ · 6+ · 2 · 1 | Long-bow, Combat blade | Hunters' Eyes | **55** (+12/m) |
| Raven-Winged Seers | C1 Elite (fast) | 3–5 | 10" · 2+ · 5+ · 5+ · 1 · 1 | Raven-curse, Rune-axe | Omen | **65** (+17/m) |
| Harpoon-Ballista Crew | C2 Trooper (support) | 2–3 | 6" · 4+ · 5+ · 5+ · 3 · 1 | Whale-harpoon, Bayonet / CCW | Haul In | **50** (+16/m) |
| Frost-Wolf Chariot | C3 Brute | 1 | 10" · 2+ · 4+ · 4+ · 10 · 3 | Javelins, Scythed wheels & wolves | Scythed Wheels | **95** |
| Ice-Troll | C3 Brute | 1 | 9" · 2+ · 6+ · 5+ · 9 · 3 | Troll claws | Regeneration | **85** |
| Frost-Giant | C4 Behemoth | 1 | 8" · 2+ · 6+ · 5+ · 15 · 3 | Glacier club, Tusks & trunk | Hurl Raider | **175** |
| Armored War-Mammoth | C4 Behemoth | 1 | 10" · 2+ · 6+ · 5+ · 15 · 3 | Howdah archers, Tusks, Tusks & trunk | Glacial Trample | **170** |
| Longship Ice-Sled | C4 Behemoth (transport) | 1 | 11" · 4+ · 5+ · 4+ · 13 · 2 | Rune-ballista, Prow-ram | Raid Landing | **110** |
| Ancient Elder Mammoth | C5 Behemoth | 1 | 11" · 2+ · 6+ · 5+ · 22 · 6 · UNY 6+ | Mammoth stomp, Tusks & trunk, War-tower archers | Stampede | **265** |
<!--/UNITS:09-->

**Detachments**
<!--DETACH:09-->
**Core rule — Sworn Sagas:** Three public Sagas; each unlocks a permanent army-wide rune the moment it is completed: Saga of the Warrior-Born (destroy an enemy Leader) → melee [STRIKE FIRST] on a round your unit charged; Saga of the Beast-Slayer (destroy a Class 4–5 unit) → melee weapons gain [IMPALING HITS]; Saga of the Bear (a unit below Half-Strength survives a round) → UNYIELDING 6+.

**Gamble — Death-Saga Boast** *(risk: tempo)*: Command Phase: one Leader boasts a deed for this round (destroy a named enemy unit, or control a named objective). Success: +1 CP and that Leader gets +1 Attack for the rest of the battle. Failure: the Leader and its attached unit are Rattled.

**D1. Saga of the Hunt** — *Fast packs and riders hunting leaders.*
- *Rule:* Berserker Fury: units below Starting Strength (or damaged) get +1 Attack in melee; Leaders get +2.
- *Enhancement:* **Wolf-Pelt Cloak** (+10 pts, Wolf-Skin Huntress) — [STEALTH].
- *Enhancement:* **Hunter's Torc** (+15 pts, Jarl Saga-Lord) — The attached unit gets +1 Attack in melee.
- *Stratagem:* **Runic Brand of the Wolf** (2 CP) — A unit activates (once per battle): It may Move and then Charge this activation.
- *Stratagem:* **Blood in the Snow** (1 CP) — An enemy unit is destroyed: One friendly unit within 6″ heals D3 MIGHT.
- *Stratagem:* **Saga-Seeker** (1 CP) — A Saga is completed: Gain 1 CP.

**D2. Saga of the Storm** — *Shamans and shield-walls advancing under the blizzard.*
- *Rule:* Blizzard: Frost-Shaman Howling Blizzard range is 9″; enemy units more than 18″ away cannot target Frost-Skaer Class 1–2 units.
- *Enhancement:* **Storm-Rune Staff** (+10 pts, Runic Frost-Shaman) — The attached unit has WARD 5+.
- *Enhancement:* **Ice-Rimed Shields** (+10 pts, Shield-Wall Huscarls) — +1 ARM (to 3+ cap).
- *Stratagem:* **Whiteout** (1 CP) — Command Phase: Until the End of Round, enemy ranged attacks beyond 12″ suffer −1 to Hit.
- *Stratagem:* **Frozen Ground** (1 CP) — An enemy unit within 9″ of a Shaman declares a Charge: −2″ to the Charge roll.
- *Stratagem:* **Hail of Spears** (1 CP) — A unit shoots at a unit within 8″: Its weapons gain [HAILFIRE 1].

**D3. Mammoth Stampede** — *Giants, mammoths and chariots in a single crushing wave.*
- *Rule:* Stampede: Class 3–5 Frost-Skaer units get +1″ MOV and their Crushing Impact rolls get +1.
- *Enhancement:* **Elder's Rune-Harness** (+15 pts, Armored War-Mammoth) — UNYIELDING 6+.
- *Enhancement:* **Beast-Caller's Horn** (+10 pts, Skald of the Long Hall) — Friendly Class 3–5 units within 9″ get +2″ to Charge rolls.
- *Stratagem:* **Trumpeting Charge** (1 CP) — A Class 4–5 unit declares a Charge: Re-roll the Charge roll.
- *Stratagem:* **Crushing Weight** (1 CP) — A Class 3–5 unit triggers Crushing Impact: Inflict +D3 Fatal Wounds.
- *Stratagem:* **Thick Hide** (1 CP) — A Class 4–5 unit is targeted: Incoming Damage −1 for the attack.

<!--/DETACH:09-->

---

## 10. The Dread-Fleet Buccaneers 🟡 — PLUNDER · ★★★★
*Proxies: airship-dwarf corsairs, dark-raider elves Corsairs, pirate ranges, skiffs/airships.*

**Learned from**
- ✅ **airship-dwarf:** transports you shoot out of, and the aether-gold "spend it once" economy.
- ✅ **dark-raider elves raiders:** hit-and-run boarding.
- ⛔ **Feel-bad resource denial:** Plunder steals **1 CP**, and only for a visible action (taking an objective or killing a Leader), at most once per round per unit.

**How it plays:**
- Tempo opportunists: Move and Shoot in either order, Firing-Deck skiffs, boarding actions against vehicles.
- Every objective you grab from the enemy also takes their CP, so they get fewer stratagems as you get more.
- Fragile and gimmicky: the skiffs are big targets.

**Stat DNA:** MOV ● (jet-boots/skiffs ▲▲) · MS ● · RS ● · ARM ▼ · MIGHT ● · CTRL ● · Density 18–24.

<!--UNITS:10-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Dread-Commodore | C2 Leader (Warlord) | 1 | 6" · 2+ · 3+ · 4+ · 5 · 1 · WARD 5+ | Brace of pistols, Captain's sabre | Pieces of Eight; Volley on My Mark | **75** |
| Cutlass Captain | C1 Leader (Champion) | 1 | 6" · 3+ · 3+ · 5+ · 4 · 1 | Brace of pistols, Duelling cutlass | Board 'Em! | **50** |
| Ship's Sawbones | C1 Leader (Support) | 1 | 6" · 3+ · 3+ · 5+ · 3 · 1 | Flintlock, Combat blade | Grog & Stitches | **45** |
| Gunnery Master | C1 Leader (Specialist) | 1 | 6" · 3+ · 3+ · 5+ · 3 · 1 | Long musket, Combat blade | Lay the Guns | **45** |
| Deck-Hand Swashbucklers | C1 Trooper | 5–10 | 6" · 4+ · 4+ · 5+ · 1 · 2 | Flintlock, Cutlass | Boarding Frenzy | **50** (+11/m) |
| Deck-Musketeers | C1 Trooper | 5–10 | 6" · 4+ · 4+ · 5+ · 1 · 2 | Long musket, Combat blade | Grape-Shot | **60** (+10/m) |
| Jet-Boot Boarders | C1 Elite (fast) | 3–5 | 10" · 3+ · 4+ · 4+ · 1 · 1 | Flintlock, Cutlass | Swing Aboard | **50** (+15/m) |
| Powder Monkeys | C1 Trooper | 5–10 | 6" · 5+ · 4+ · 6+ · 1 · 2 | Powder-kegs, Bayonet / CCW | Lit Fuse | **55** (+8/m) |
| Swivel-Gun Crew | C2 Trooper (support) | 2–3 | 5" · 5+ · 4+ · 5+ · 2 · 1 | Swivel-gun, Bayonet / CCW | Pivot Mount | **45** (+10/m) |
| Grapnel Skyriggers | C1 Trooper (specialist) | 3–5 | 7" · 4+ · 3+ · 6+ · 1 · 1 | Blunderbuss, Cutlass | Grapnel-Shot Hitch | **45** (+11/m) |
| Bosun Brawlers | C2 Elite (brute) | 3–5 | 6" · 3+ · 5+ · 5+ · 4 · 1 | Anchor & chain | Shove Overboard | **80** (+22/m) |
| Sky-Cutter Riders | C2 Elite (fast) | 3–5 | 12" · 3+ · 4+ · 5+ · 3 · 1 | Blunderbuss, Boarding pike | Strafing Run | **65** (+26/m) |
| Crow's Nest Sharpshooters | C1 Trooper (specialist) | 2–3 | 6" · 5+ · 3+ · 6+ · 1 · 1 | Long rifle, Combat blade | Spot the Prize | **35** (+9/m) |
| Corsair Gun-Skiff | C3 Brute (support) | 1 | 12" · 5+ · 4+ · 4+ · 6 · 1 | Swivel-gun, Chaser-cannon, Bayonet / CCW | Boarding Ramps | **60** |
| Clockwork Bosun | C3 Brute | 1 | 6" · 3+ · 3+ · 4+ · 9 · 3 | Rivet-cannon, Anchor-fists | Steam Winch | **65** |
| Sky-Shark Mascot | C3 Brute | 1 | 8" · 3+ · 6+ · 5+ · 8 · 3 | Shark jaws | Blood in the Air | **60** |
| Sky-Frigate | C4 Behemoth (transport) | 1 | 10" · 5+ · 4+ · 4+ · 12 · 2 | Cannonade cannons, Swivel-gun, Ram-prow | Cannonade Slip | **110** |
| Cannonade Ironclad | C4 Behemoth | 1 | 10" · 5+ · 4+ · 4+ · 16 · 3 | Cannonade cannons, Swivel-gun, Ram-prow | Full Cannonade | **120** |
| Mortar Ketch | C4 Behemoth (support) | 1 | 8" · 6+ · 4+ · 4+ · 12 · 1 | Ketch-mortars, Ram-prow | Overhead Barrage | **110** |
| walker Sky-Galleon | C5 Behemoth (flyer) | 1 | 14" · 6+ · 3+ · 4+ · 18 · 0 | Grand cannonade, Swivel-gun, Swivel-gun | Flagship | **215** |
<!--/UNITS:10-->

**Detachments**
<!--DETACH:10-->
**Core rule — Plunder & Cannonades:** Plunder: once per round, when you destroy an enemy unit that was within 3″ of an objective, or an enemy Leader, gain 1 CP (your own pool cap still applies). Cannonades: [FLY] or [TRANSPORT] units may make a free 3″ move after they Shoot (not into engagement).

**Gamble — Ram & Board** *(risk: durability)*: A [TRANSPORT] skiff may Charge; units aboard may disembark within 3″ of it after the Charge and Charge the same target in their own activation this round. The skiff suffers D3 Fatal Wounds.

**D1. Sky-Raiders** — *Skiffs and frigates darting in and out.*
- *Rule:* Hit-and-Run: Cannonades slip is 4″ and may be made after a Fight action that destroyed the enemy unit.
- *Enhancement:* **Clockwork Compass** (+10 pts, Dread-Commodore) — +2″ MOV.
- *Enhancement:* **Lucky Doubloon** (+10 pts, Cutlass Captain) — WARD 5+.
- *Stratagem:* **Hard to Port** (1 CP) — A skiff is targeted: −1 to Hit it for the attack.
- *Stratagem:* **Cut and Run** (1 CP) — A unit is engaged: It may Fall Back and still Shoot.
- *Stratagem:* **Smoke on the Water** (1 CP) — Command Phase: One skiff counts as [STEALTH] until the End of Round.

**D2. Pirate Armada** — *A gunline of ships and musket-crews.*
- *Rule:* Grape-Shot Point-Blank: ranged weapons gain [CLOSE-QUARTERS] and +1 PEN within 6″.
- *Enhancement:* **Master Gunner's Glass** (+15 pts, Gunnery Master) — Friendly units within 9″ re-roll Hit rolls of 1.
- *Enhancement:* **Chain-Shot** (+20 pts, Cannonade Ironclad) — +1 PEN.
- *Stratagem:* **Fire as She Bears** (1 CP) — A Class 4–5 unit Shoots: Its weapons gain [HAILFIRE 1].
- *Stratagem:* **Load the Grape** (1 CP) — A unit shoots a unit within 9″: +1 to Wound.
- *Stratagem:* **Prize Crew** (1 CP) — An enemy Class 4–5 unit is destroyed: Gain 1 CP.

**D3. Grapnel Crews** — *Boarding parties that leap from skiff to skiff.*
- *Rule:* Boarding Ramps: units that disembark may Charge even if their transport moved; units that charged this round get +1 to Hit in melee.
- *Enhancement:* **Grappling Gun** (+10 pts, Cutlass Captain) — The Captain and attached unit may disembark after the transport made a 3″ slip.
- *Enhancement:* **Boarding Axe** (+10 pts, Deck-Hand Swashbucklers) — +1 PEN in melee.
- *Stratagem:* **Swing Across** (1 CP) — A unit within 3″ of a skiff activates: It moves 6″ ignoring terrain.
- *Stratagem:* **Repel Boarders** (1 CP) — A transport is charged: Embarked units may make a Retaliation Strike.
- *Stratagem:* **Grapnel Hitch** (1 CP) — A skiff moves: Two units within 3″ (instead of one) are towed.

<!--/DETACH:10-->

---

# GRAND ALLIANCE 3 — THE HELLBREACH LEGIONS

## 11. The Cinder-Gorged Legion 🟢 — BLOOD CLOCK · ★
*Proxies: berserker legions, the blood god Daemons, Blades of the blood god / Bloodbound, any berserker kit.*

**Learned from**
- ✅ **Blades of the blood god's Blood Tithe:** deaths on the table fuel the army. That becomes our deterministic Tithe track.
- ✅ **berserker legions' pure aggression:** no guns at all.
- ⛔ **berserker legions' Blessings of the blood god** (rolling 8 dice every round for buffs): fun but swingy luck. Our clock is **deterministic**, so you can plan around it.
- ⛔ **Zero counterplay:** no guns means kiting and screening genuinely work against them. (v4.3: Burning Vessels removed; self-damage is now the voluntary Cinder-Fury gamble.)

**How it plays:**
- The simplest army to pick up: run forward, kill, repeat.
- The bloodier the game (for either side!), the faster, nastier and tougher they get.
- Units that hang back burn, so the army must commit.
- Best into hordes (cheap deaths feed the clock). Worst into gliding elites and screens.

**Stat DNA:** MOV ▲ · MS ▲ · RS — · ARM ▼ · MIGHT ▲ · CTRL ● · Density 22–30.

<!--UNITS:11-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Ash-Zealots | C1 Trooper | 10 | 7" · 4+ · 6+ · 6+ · 1 · 1 | Jagged cleaver | Blood Offering | **90** |
| Cinder-Berserkers | C1 Elite | 5–10 | 7" · 3+ · 6+ · 4+ · 2 · 1 · UNY 6+ | Chain-axe | Blood Surge | **150** (+20/m) |
| Ember-Blade Daemons | C1 Trooper | 5–10 | 8" · 3+ · 6+ · 6+ · 1 · 2 · WARD 5+ | Hell-blade |  | **100** (+16/m) |
| Blood-Hounds | C2 Elite (fast) | 3–5 | 10" · 3+ · 6+ · 6+ · 2 · 1 · WARD 5+ | Gore-fangs |  | **80** (+22/m) |
| Skull-Cleaver Champion | C1 Leader | 1 | 7" · 2+ · 6+ · 4+ · 4 · 1 · WARD 5+ | Executioner axe | Lead the Slaughter | **100** |
| Herald of the Cinder | C2 Leader | 1 | 8" · 2+ · 6+ · 5+ · 5 · 1 · WARD 5+ | Blade of blood | Murderous Tide | **110** |
| Brass Hellsteed Riders | C2 Elite (cavalry) | 3–5 | 9" · 3+ · 6+ · 3+ · 4 · 1 | Hell-axe, Brass hooves |  | **235** (+35/m) |
| Gore-Beast Slaughterer | C3 Brute | 1 | 9" · 3+ · 6+ · 3+ · 10 · 3 | Monster talons | Gorged | **150** |
| Brass Crusher Engine | C4 Behemoth | 1 | 9" · 3+ · 6+ · 3+ · 15 · 3 | Monster talons, Crusher fists |  | **230** |
| Brass Hell-Titan | C5 Behemoth | 1 | 9" · 3+ · 6+ · 3+ · 26 · 6 · WARD 5+ | Titan stomp, Hell-cleaver |  | **390** |
| Slaughter-Lord on Hellsteed | C3 Leader (Warlord) | 1 | 10" · 2+ · 6+ · 3+ · 8 · 2 · WARD 5+ | Hell-axe | Lord of Slaughter | **145** |
| Skull-Hunter | C1 Leader (Specialist) | 1 | 7" · 2+ · 6+ · 4+ · 4 · 1 | Head-taker blade |  | **90** |
| Brass Exalted Guard | C2 Elite | 3–5 | 6" · 2+ · 6+ · 3+ · 4 · 1 · WARD 5+ | Exalted great-axe |  | **220** (+35/m) |
| Ember Fiends of the Pit | C2 Elite (blender) | 3–5 | 8" · 3+ · 6+ · 5+ · 4 · 1 · WARD 5+ | Ember talons |  | **145** (+33/m) |
| Gore-Champion Coterie | C2 Elite (duelists) | 3 | 7" · 2+ · 6+ · 4+ · 3 · 1 | Duelling cleaver |  | **125** |
| Blood-Leash Wardens | C1 Trooper | 5–10 | 7" · 3+ · 6+ · 5+ · 1 · 1 | Barbed whip |  | **80** (+11/m) |
| Rift-Spawn Butchers | C1 Elite (ambush) | 5–10 | 8" · 3+ · 6+ · 5+ · 2 · 1 · WARD 5+ | Rift-cleaver |  | **145** (+20/m) |
| Brass Harpies | C1 Trooper (winged) | 5–10 | 10" · 3+ · 6+ · 6+ · 1 · 1 · WARD 5+ | Brass talons |  | **90** (+17/m) |
| Skull-Altar Engine | C4 Behemoth (shrine) | 1 | 7" · 3+ · 6+ · 3+ · 14 · 3 | Crusher fists | Altar of Rage | **220** |
| Furnace-Fiend Behemoth | C4 Behemoth | 1 | 9" · 3+ · 6+ · 4+ · 15 · 3 | Monster talons, Colossal jaws |  | **205** |
| Cinder-Prince Ascendant | C4 Leader (Warlord) | 1 | 10" · 2+ · 6+ · 3+ · 14 · 3 · WARD 5+ | Hellforged greataxe, Brass talons | Lord of Slaughter; Skull-Throne Favour | **290** |
| Gorethane the Unchained | C2 Leader (Epic Champion) | 1 | 7" · 2+ · 6+ · 3+ · 6 · 1 · WARD 5+ | Bone-splitter | Unstoppable; The Betrayer's Rage | **145** |
| Blood-Priest of the Tithe | C1 Leader (Support) | 1 | 7" · 3+ · 6+ · 4+ · 4 · 1 · WARD 5+ | Sacrificial cleaver | Offer the Skulls; Blood-Chant | **95** |
| Skull-Takers | C1 Trooper (specialist) | 3–5 | 8" · 3+ · 6+ · 5+ · 1 · 1 | Trophy-blades | Head-Hunters | **70** (+14/m) |
| Eviscerator Packs | C1 Trooper / Elite | 5–10 | 7" · 3+ · 6+ · 4+ · 2 · 1 · UNY 6+ | Eviscerator | Blood-Rush | **170** (+17/m) |
| Pyre-Knights | C2 Elite (fast) | 3–5 | 12" · 3+ · 6+ · 3+ · 3 · 1 | Pyre-lance | Burning Charge | **175** (+41/m) |
| Skull-Chariot of the Pyre | C3 Brute | 1 | 10" · 3+ · 6+ · 4+ · 8 · 2 | Blade-wheels & riders | Scythed Run | **100** |
| Cinder-Spawn | C3 Brute | 1 | 8" · 3+ · 6+ · 5+ · 7 · 1 | Mutant maws | Tithe-Born | **85** |
| Brass Gore-Carrier | C4 Behemoth (transport) | 1 | 10" · 4+ · 6+ · 3+ · 12 · 2 | Gore-ram | Assault Ramp | **175** |
| Brass Gore-Wyrm | C4 Behemoth | 1 | 9" · 3+ · 6+ · 4+ · 14 · 3 | Monster talons, Furnace-maw | Molten Hide | **215** |
<!--/UNITS:11-->

**Detachments**
<!--DETACH:11-->
**Core rule — Blood-Tithe:** Every model destroyed (either side) adds 1 Tithe. Permanent army-wide unlocks: 5 → +1″ Move · 10 → melee [ONSLAUGHT 1] · 15 → [UNYIELDING 5+] · 20 → +1 Damage. No ranged weapons. When shot, a unit may [SURGE D6″] toward the shooter. Burning Vessels: at the end of each round, each unit that is not engaged suffers 1 Fatal Wound (it adds to the Tithe).

**Gamble — Unleashed Cinder-Fury** *(risk: durability (voluntary))*: When a unit activates, it may suffer D3 Fatal Wounds (they add to the Tithe): +1 Attack in melee and its melee weapons gain [CRASHING] this activation.

**D1. Red Tide** — *Horde rush: zealots and daemons flood forward and feed the clock fast.*
- *Rule:* Tide of Bodies: Trooper units may Charge after one Move (not after a Sprint).
- *Enhancement:* **Gorefather's Collar** (+25 pts, Skull-Cleaver Champion) — The bearer has [UNYIELDING 5+].
- *Enhancement:* **Banner of Rage** (+15 pts, Skull-Cleaver Champion) — The attached unit gets +2″ Move.
- *Stratagem:* **Blood Frenzy** (1 CP) — A unit is destroyed: Add 2 extra Tithe.
- *Stratagem:* **Unstoppable Momentum** (1 CP) — A unit fails a Charge: Re-roll the charge dice.
- *Stratagem:* **Trample the Weak** (1 CP) — A unit finishes a Charge: The target gains 1 Suppression token.

**D2. Brass Host** — *Armoured berserkers, juggernauts and engines: fewer bodies, harder hits.*
- *Rule:* Brass Armour: Elites and Behemoths ignore the Fatal Wounds from Unleashed Cinder-Fury on a 4+.
- *Enhancement:* **Brass Collar of Defiance** (+15 pts, Herald of the Cinder) — The bearer has [WARD 4+].
- *Enhancement:* **Hellsteed Harness** (+15 pts, Brass Hellsteed Riders) — +1 Damage on the charge.
- *Stratagem:* **Crushing Charge** (1 CP) — A Class 2+ unit finishes a Charge: Resolve Crushing Impact with no self-damage on 1s.
- *Stratagem:* **Hateful Endurance** (1 CP) — A unit is targeted by a Shoot action: Incoming Damage −1 (min 1) for that attack.
- *Stratagem:* **Skulls for the Pyre** (2 CP) — A Leader is destroyed by this unit: Add 5 Tithe.

**D3. Exalted Slaughter** — *Hero-hammer: Champions and Heralds duel and snowball.*
- *Rule:* Champion's Due: when a Leader destroys an enemy Leader or Brute, unlock the next Tithe tier immediately.
- *Enhancement:* **Axe of Ten Thousand Skulls** (+30 pts, Skull-Cleaver Champion) — The bearer's axe: +2 Attacks, +1 PEN.
- *Enhancement:* **Deathmark Brand** (+10 pts, Herald of the Cinder) — The bearer's critical wounds trigger on 5+.
- *Stratagem:* **Challenge Accepted** (1 CP) — A Leader fights: Its melee attacks gain [PRECISION] and +1 Damage against an enemy Leader this activation.
- *Stratagem:* **Rage Unbound** (1 CP) — A Leader activates: +2″ Move and +1 Attack this activation.
- *Stratagem:* **Gore-Drenched** (1 CP) — A Leader destroys a model: +1 to Hit for the rest of the round (healing belongs to the Sanguine Aristocracy).

<!--/DETACH:11-->

---

## 12. The Black-Bile Congregation 🟡 — CONTAGION · ★★★
*Proxies: plague legions, Maggotkin of the plague god, Poxwalkers, plague-zombie kits.*

**Learned from**
- ✅ **a fantasy wargame Maggotkin's disease points** on enemy units, which turn into damage: the cleanest version of "infection".
- ✅ **plague legions:** slow, tough walls.
- ⛔ **10th-edition plague legions's growing invisible aura ranges** (Contagion range per round): hard to track. Rot lives **as tokens on the enemy unit**, max 3.

**How it plays:**
- The slowest army (MOV 4–5) and one of the toughest.
- Each damaging hit stacks Rot: −1 ARM, then −1″ MOV, then Fatal Wounds every round.
- By round 3 the enemy is rotting wherever they stand.
- Distant objectives and fast scoring armies are the challenge.

**Stat DNA:** MOV ▼▼ · MS ● · RS ● · ARM ▲ · MIGHT ▲ + [UNYIELDING] · CTRL ● · Density 12–18.

<!--UNITS:12-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Lord of Black Bile | C2 Leader (Warlord) | 1 | 4" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Heavy pistol, Manreaper scythe | Lord of Decay; Spreading Rot | **115** |
| Rot-Herald Champion | C2 Leader (Champion) | 1 | 4" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Heavy pistol, Rot-maul | Herald of Pestilence | **110** |
| Pox-Physician | C1 Leader (Support) | 1 | 4" · 3+ · 3+ · 3+ · 4 · 1 | Heavy pistol, Bone-saw | Grotesque Surgery; Stitch the Bloat | **90** |
| Miasmic Hexer | C1 Leader (Mystic) | 1 | 4" · 3+ · 3+ · 3+ · 4 · 1 | Pox-curse, Plague-knife | Miasma | **90** |
| Pox-Carriers | C1 Trooper | 10–15 | 5" · 4+ · 6+ · 5+ · 2 · 1 | Rotting hands | Shamblers; Join the Host | **140** (+12/m) |
| Blight-Knights | C1 Trooper / Elite | 5–10 | 5" · 3+ · 3+ · 3+ · 2 · 2 | Blight-bolter, Rusted cleaver | Infected Ground | **145** (+25/m) |
| Blight-Lord Plate-Knights | C2 Elite | 3–5 | 4" · 3+ · 3+ · 3+ · 5 · 1 · WARD 5+ | Blight-combi, Bubotic axe | Bubotic Weapons | **185** (+57/m) |
| Blight-Spewer Squad | C1 Trooper / Elite | 5 | 5" · 3+ · 3+ · 3+ · 2 · 2 | Bile-spewer, Rusted cleaver | Clouds of Filth | **200** |
| Death-Blister Brethren | C1 Trooper | 5–10 | 5" · 3+ · 4+ · 3+ · 2 · 1 | Rot-blades | Spreaders of Filth | **115** (+21/m) |
| Pox-Mites | C1 Trooper | 5–10 | 5" · 4+ · 6+ · 5+ · 2 · 1 | Rotting hands | Underfoot | **80** (+11/m) |
| Bloat-Fly Riders | C2 Elite (fast) | 3–5 | 10" · 3+ · 4+ · 3+ · 3 · 1 | Bile-spitter, Plague-lance | Droning Swarm | **115** (+42/m) |
| Bile-Ogres | C2 Elite (brute) | 3–5 | 4" · 3+ · 5+ · 3+ · 5 · 1 | Bloated fists | Splitting Seams | **170** (+53/m) |
| Bile-Mortar Team | C2 Trooper (support) | 2–3 | 4" · 5+ · 4+ · 3+ · 3 · 1 | Bile-mortar, Bayonet / CCW | Pestilent Shells | **75** (+27/m) |
| Blight-Hauler Engine | C3 Brute | 1 | 4" · 3+ · 3+ · 3+ · 10 · 3 | Bile-cannon, Grinding jaws | Rotting Engine | **125** |
| Foetid Bloat-Drone | C3 Brute (support) | 1 | 8" · 5+ · 4+ · 3+ · 7 · 1 | Plaguespitters, Bayonet / CCW | Foul Downdraft | **100** |
| Necrotic Siege-Crawler | C4 Behemoth | 1 | 8" · 5+ · 4+ · 3+ · 18 · 3 | Battle cannon, Bile-spewer, Grinding tracks | Rust-Fumes | **220** |
| Blight-Furnace Bell-Tank | C4 Behemoth (support) | 1 | 6" · 6+ · 4+ · 3+ · 14 · 1 | Rot-mortar, Grinding tracks | Corrupting Smog | **175** |
| Bile-Hauler Transport | C4 Behemoth (transport) | 1 | 8" · 5+ · 4+ · 3+ · 14 · 2 | Heavy stubber, Grinding tracks | Seeping Hull | **135** |
| Bloated Rot-Behemoth | C4 Behemoth | 1 | 7" · 3+ · 6+ · 3+ · 16 · 3 | Monster talons, Colossal jaws | Spew | **190** |
| Great Unclean Engine | C5 Behemoth | 1 | 8" · 3+ · 3+ · 3+ · 20 · 6 · WARD 5+ | Pestilence cannon, Bile-geysers, Titan stomp | Rot-Bells | **420** |
<!--/UNITS:12-->

**Detachments**
<!--DETACH:12-->
**Core rule — Aura of Rust & Rot · Bloated Resilience:** Enemy units within Contagion Range of any Black-Bile unit have −1 ARM (not cumulative). Contagion Range: 3″ in Round 1, 6″ in Round 2, 9″ from Round 3. Black-Bile units (except [EXPENDABLE] ones) have UNYIELDING 5+.

**Gamble — Rupture the Blight-Sacs** *(risk: durability (permanent))*: When a unit activates: each enemy unit within 3″ suffers D3 Fatal Wounds on a 4+. That Black-Bile unit loses UNYIELDING for the rest of the battle.

**D1. Infected Ground** — *Take objectives, rot them, walk on.*
- *Rule:* Corrupted Objectives: objectives you control are [SECURED] and emit a 3″ Contagion aura (−1 ARM) until an enemy controls them.
- *Enhancement:* **Censer of Rot** (+30 pts, Lord of Black Bile) — The attached unit has UNYIELDING 5+ even if ruptured.
- *Enhancement:* **Pox-Banner** (+10 pts, Blight-Knights) — +1 CTRL per model.
- *Stratagem:* **Fester** (1 CP) — End of Round: An enemy unit within 3″ of a corrupted objective suffers D3 Fatal Wounds on a 4+.
- *Stratagem:* **Rot from Within** (1 CP) — An enemy unit takes an objective you corrupted: It is Rattled.
- *Stratagem:* **Seep** (1 CP) — Command Phase: Contagion Range is +3″ this round (max 9″).

**D2. Death-Blister Brotherhood** — *Melee hordes that punish anything that fights them.*
- *Rule:* Spreaders of Filth: every Black-Bile model destroyed in melee inflicts 1 Fatal Wound on the attacking unit on a 5+.
- *Enhancement:* **Blister-Mantle** (+25 pts, Rot-Herald Champion) — UNYIELDING 5+.
- *Enhancement:* **Plague-Bell** (+20 pts, Pox-Physician) — Friendly Class 1 units within 6″ get +1 Attack in melee on a round they charged.
- *Stratagem:* **Burst Open** (1 CP) — A unit is destroyed in melee: Every enemy unit within 3″ suffers D3 Fatal Wounds on a 4+.
- *Stratagem:* **Shambling Tide** (1 CP) — A Class 1 unit declares a Charge: +2″ to the roll.
- *Stratagem:* **Endless Pox** (2 CP) — Command Phase, once per battle: Return a destroyed Pox-Carriers unit at half strength within 6″ of your table edge.

**D3. Smog Engines** — *Daemon-engines and drones behind a curtain of filth.*
- *Rule:* Smog and Smoke: friendly Class 1–2 units within 9″ of a Black-Bile Class 3–5 unit are [STEALTH] against attacks from more than 12″.
- *Enhancement:* **Daemon-Furnace** (+10 pts, Blight-Furnace Bell-Tank) — Corrupting Smog range 9″.
- *Enhancement:* **Rot-Crew** (+55 pts, Necrotic Siege-Crawler) — UNYIELDING improves by 1 (5+).
- *Stratagem:* **Choking Clouds** (1 CP) — An enemy unit within 9″ of a Class 3–5 unit Shoots: −1 to Hit.
- *Stratagem:* **Grinding Advance** (1 CP) — A Class 3–5 unit activates: +2″ MOV.
- *Stratagem:* **Rusted Ram** (1 CP) — A Class 4 unit ends a Charge: Crushing Impact for 0 CP.

<!--/DETACH:12-->

---

## 13. The Moloch Iron-Forged 🟡 — CONSUMPTION · ★★★
*Proxies: Iron Warriors, daemonic power-armoured super-soldiers & daemon engines, daemon-smith dwarves, daemonic Dwarfs.*

**Learned from**
- ✅ **CSM Dark Pacts:** pay a price for power, a beloved risk/reward.
- ✅ **Iron Warriors:** siege identity, ignoring cover.
- ✅ **daemonic Dwarfs / daemon-smith:** machines fed by slaves.
- ⛔ **Free fodder:** Thralls are bought with points, and feeding them is a real trade.

**How it plays:**
- Siege-masters: heavy-weapon renegades and artillery crack units in terrain.
- Daemon-engines grow terrifying when fed Trench-Thralls (+Hit, re-roll Wounds, or repair).
- Position fodder next to engines. An engine with no fodder left is just a tank.

**Stat DNA:** MOV ▼ · MS ● · RS ▲ · ARM ▲ · MIGHT ▲ (engines ▲▲) · CTRL ● · Density 16–24 (half is fuel).

<!--UNITS:13-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Iron-Smith Forgemaster | C2 Leader (Warlord) | 1 | 5" · 2+ · 2+ · 3+ · 6 · 1 · WARD 5+ | Forge-pistol, Daemon-forged axe | Siege Doctrine; Master of the Forge | **90** |
| Iron-Warden Champion | C2 Leader (Champion) | 1 | 5" · 2+ · 2+ · 3+ · 6 · 1 · WARD 5+ | Heavy pistol, Siege-hammer | Iron Discipline | **90** |
| Daemon-Smith Overseer | C1 Leader (Support) | 1 | 5" · 3+ · 2+ · 3+ · 4 · 1 | Heavy pistol, Daemon-anvil hammer | Demonic Anvil Repair | **65** |
| Hellfire Taskmaster | C1 Leader (Specialist) | 1 | 5" · 3+ · 2+ · 3+ · 3 · 1 | Fire-whip, Chain-blade | Drive the Dregs; Lash | **65** |
| Ash-Dreg Thralls | C1 Trooper | 10 | 5" · 5+ · 3+ · 4+ · 1 · 2 | Scrap-musket, Bayonet / CCW | Fuel | **90** |
| Iron-Forged Legionaries | C1 Trooper / Elite | 5–10 | 5" · 3+ · 2+ · 3+ · 2 · 2 | Hell-bolter, Chain-blade | Iron Within, Iron Without | **145** (+21/m) |
| Ash-Guard Blunderbussiers | C1 Trooper | 5–10 | 5" · 4+ · 3+ · 3+ · 1 · 2 | Fire-blunderbuss, Combat blade | Volley Ranks | **95** (+14/m) |
| Breacher Battery | C2 Trooper (support) | 2–3 | 4" · 5+ · 3+ · 3+ · 2 · 1 | Breaching cannon, Bayonet / CCW | Dug-In Battery | **65** (+20/m) |
| Iron-Clad Siege-Guard | C2 Elite | 3–5 | 4" · 3+ · 2+ · 3+ · 5 · 1 · WARD 5+ | Siege-flamer, Forge-hammer | Siege Plate | **180** (+50/m) |
| Brass-Bull Centaurs | C2 Elite (fast) | 3–5 | 10" · 3+ · 3+ · 3+ · 4 · 1 | Ash-carbine, Bull-glaive | Gore and Trample | **125** (+36/m) |
| Hellsmith Sappers | C1 Trooper (specialist) | 3–5 | 6" · 4+ · 2+ · 4+ · 1 · 1 | Demo-charges, Combat blade | Undermine | **50** (+11/m) |
| Iron-Devourer Heavy Squad | C1 Trooper / Elite | 5 | 5" · 3+ · 2+ · 3+ · 2 · 2 | Autocannon, Missile launcher, Combat blade | Bunker Gunners | **165** |
| Moloch Crab-Walker | C3 Brute | 1 | 5" · 3+ · 2+ · 3+ · 10 · 3 | Heavy flamer, Siege-claws | Wall-Climber | **105** |
| Forge-Hound | C3 Brute | 1 | 7" · 3+ · 5+ · 4+ · 9 · 3 | Brass jaws & claws | Hunting Engine | **75** |
| Furnace-Mortar Battery | C3 Brute (support) | 1 | 4" · 5+ · 3+ · 3+ · 7 · 1 | Hellfire mortar, Bayonet / CCW | Shattering Bombardment | **90** |
| Soul-Furnace Engine | C4 Brute / Behemoth | 1 | 7" · 3+ · 2+ · 3+ · 16 · 3 | Soul-furnace cannon, Furnace claws | Daemonic Engine | **220** |
| Siege-Crawler Ram | C4 Behemoth | 1 | 9" · 5+ · 3+ · 3+ · 18 · 3 | Hellfire vents, Siege-ram | Breach! | **190** |
| Infernal Bombard | C4 Behemoth (support) | 1 | 7" · 6+ · 3+ · 3+ · 14 · 1 | Hellfire mortar, Heavy stubber, Iron hooves | Siege Calculations | **175** |
| Ash-Hauler | C4 Behemoth (transport) | 1 | 9" · 5+ · 3+ · 3+ · 14 · 2 | Heavy stubber, Iron hooves | Furnace Hopper | **140** |
| Soul-Furnace Colossus | C5 Behemoth | 1 | 9" · 5+ · 2+ · 3+ · 24 · 5 | Magma colossus-cannon, Las-lance, Iron hooves | Grand Furnace | **325** |
<!--/UNITS:13-->

**Detachments**
<!--DETACH:13-->
**Core rule — Feed the Furnace · Siege-Masters:** Feed the Furnace: when a Class 4–5 Moloch unit activates, you may remove 1 model from a friendly [EXPENDABLE] Class 1 unit within 3″: this activation its weapons gain [RELENTLESS] (re-roll Wound rolls) and [ONSLAUGHT 1]. Siege-Masters: Moloch ranged weapons gain [IGNORES COVER] against units within 3″ of an objective or in Dense terrain.

**Gamble — Red-Line the Boilers** *(risk: durability (dice))*: When a Class 3–5 unit is selected to Shoot or Fight: its weapons get +2 Attacks; afterwards it suffers 1 Fatal Wound for each natural 1 rolled to Hit (max D3+1).

**D1. Grand Siege** — *Artillery and heavy squads grind fortified positions.*
- *Rule:* Bunker-Busters: Siege-Masters also applies to units in Light terrain; [INDIRECT FIRE] weapons do not suffer the −1 to Hit.
- *Enhancement:* **Siege-Lens** (+10 pts, Iron-Smith Forgemaster) — The attached unit gets +1 PEN with ranged weapons.
- *Enhancement:* **Daemon-Bound Shells** (+25 pts, Infernal Bombard) — +1 Damage against units in Cover.
- *Stratagem:* **Shattering Bombardment** (1 CP) — A [SHRAPNEL] weapon hits a Class 1–2 unit: It suffers −2″ MOV until the End of Round.
- *Stratagem:* **Creeping Barrage** (1 CP) — An artillery unit Shoots: Re-roll Hit rolls against units within 3″ of an objective.
- *Stratagem:* **Entrench** (1 CP) — A unit did not Move: +1 ARM (to 3+ cap) until the End of Round.

**D2. Daemon-Forge** — *Engines everywhere, smiths keeping them alive.*
- *Rule:* Anvil of the Daemon: Class 3–5 units within 6″ of a friendly Leader heal 1 MIGHT at the End of Round.
- *Enhancement:* **Bound Daemon-Heart** (+60 pts, Soul-Furnace Engine) — UNYIELDING 5+.
- *Enhancement:* **Hammer of Moloch** (+10 pts, Daemon-Smith Overseer) — Demonic Anvil Repair heals D3+1.
- *Stratagem:* **Stoke the Fires** (1 CP) — A Class 4–5 unit is fed to the Furnace: It also gets +2″ MOV this activation.
- *Stratagem:* **Emergency Weld** (1 CP) — A Class 3–5 unit is damaged: Heal 2 MIGHT.
- *Stratagem:* **Daemonic Fury** (1 CP) — A Class 3–5 unit is selected to Fight: +1 Damage on its melee weapons.

**D3. Iron Within** — *Iron legionaries and siege-guard holding the line.*
- *Rule:* Iron Within, Iron Without: once per round per unit, when targeted, incoming PEN −1 and re-roll ARM saves of 1 for that attack.
- *Enhancement:* **Bastion-Seal** (+10 pts, Iron-Warden Champion) — The attached unit has WARD 5+.
- *Enhancement:* **Ironclad Pauldrons** (+10 pts, Iron-Forged Legionaries) — +1 ARM (to 3+ cap) against PEN 0 and −1.
- *Stratagem:* **Hold the Breach** (1 CP) — A unit is charged: Its Retaliation Strike gets +1 Attack.
- *Stratagem:* **No Retreat** (1 CP) — A unit would be Rattled: It is not.
- *Stratagem:* **Smog and Smoke** (1 CP) — Command Phase: Friendly Class 1–2 units within 9″ of a Class 4–5 unit are [STEALTH] until the End of Round.

<!--/DETACH:13-->

---

## 14. The Cabal of the Inverted Star 🟡 — SPACE · ★★★★★
*Proxies: sorcerer legions, Disciples of the change god, ash-automata Marines, beast-kin, any sorcerer kit.*

**Learned from**
- ✅ **sorcerer legions' Cabal points** (sorcerers generate points for rituals such as a signature spell and a signature spell): scales with how many casters you protect.
- ✅ **Disciples' trickery.**
- ⛔ **Destiny dice / roll manipulation:** that's Sun-Pyre's. Cabal owns **space**: teleport and position swaps.
- ⛔ **Unlimited tricks:** one Fate pool, max 3.

**How it plays:**
- The expert army: the board belongs to you.
- Swap a Thrall unit with your Automata to take an objective, teleport flamers behind a gunline, bend an enemy's lascannon into another target.
- Kill the sorcerers and the magic stops.

**Stat DNA:** MOV ▼ (automata) / ▲▲ (discs) · MS ▼ · RS ▲ · ARM ▲ + WARD · MIGHT ● · CTRL ● · Density 14–20.

<!--UNITS:14-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Master of the Astral Geometry | C2 Leader (Warlord) | 1 | 5" · 3+ · 2+ · 3+ · 5 · 1 · WARD 5+ | Astral bolt, Force-stave | Grand Sorcerer; Geometry Unbound | **90** |
| Sorcerer-Adept | C1 Leader (Mystic) | 1 | 5" · 4+ · 2+ · 3+ · 3 · 1 | Warp-bolt, Force-stave | Sorcerer; Warded Robes | **65** |
| Hex-Blade Exalted | C2 Leader (Champion) | 1 | 5" · 3+ · 2+ · 3+ · 6 · 1 · WARD 5+ | Warp-bolt, Hex-sword | Battle-Sorcerer; Unmaking Edge | **90** |
| Seer of the Inverted Star | C1 Leader (Specialist) | 1 | 5" · 4+ · 2+ · 3+ · 3 · 1 | Fate-bolt, Combat blade | Fate-Weaver; Sorcerer | **65** |
| Warp-Touched Thralls | C1 Trooper | 10 | 5" · 6+ · 3+ · 4+ · 1 · 2 | Warp-flame pistols, Bayonet / CCW | Expendable Geometry | **100** |
| Hollow Automata | C1 Trooper / Elite | 5–10 | 5" · 4+ · 2+ · 3+ · 2 · 2 | Inferno-bolter, Chain-blade | All Is Ash; Bound Spirits | **155** (+21/m) |
| Hex-Plated Automata | C2 Elite | 3–5 | 4" · 4+ · 2+ · 3+ · 4 · 1 · WARD 5+ | Warp-flamer, Hex-axe | All Is Ash | **150** (+36/m) |
| Star-Cult Acolytes | C1 Trooper | 5–10 | 5" · 5+ · 3+ · 3+ · 1 · 2 | Battle rifle, Combat blade | Ritual Circle | **90** (+13/m) |
| Plume-Kin Raiders | C1 Trooper | 5–10 | 6" · 4+ · 3+ · 3+ · 1 · 1 | Bow, Avian blades | Ambush Flock; Hidden Paths | **75** (+15/m) |
| Astral Disc-Riders | C2 Elite (fast) | 3–5 | 11" · 4+ · 3+ · 3+ · 3 · 1 | Warp-glaives, Disc-blades | Skim | **95** (+32/m) |
| Star-Wisps | C1 Trooper | 5–10 | 6" · 5+ · 5+ · 5+ · 1 · 1 | Warp-fire, Mutant limbs | Unstable Form | **65** (+12/m) |
| Mutated Warp-Spawn | C2 Elite (brute) | 3–5 | 8" · 4+ · 4+ · 3+ · 4 · 1 | Mutant limbs | Gift of Mutation | **100** (+33/m) |
| Hexfire Battery | C2 Trooper (support) | 2–3 | 4" · 6+ · 3+ · 3+ · 2 · 1 | Hexfire cannon, Bayonet / CCW | Burning Hex | **65** (+18/m) |
| Rune-Plate Walker | C3 Brute | 1 | 5" · 4+ · 2+ · 3+ · 9 · 3 | Warp-flamer, Hex-fists | Sigil-Wards | **100** |
| Spawn-Horror | C3 Brute | 1 | 7" · 4+ · 5+ · 3+ · 8 · 3 | Writhing tentacles | Unpredictable | **75** |
| Cosmic Vortex-Beast | C4 Behemoth | 1 | 8" · 4+ · 5+ · 3+ · 14 · 3 | Vortex-tentacles, Colossal jaws | Warp-Vortex | **140** |
| Warp-Prism Engine | C4 Behemoth (support) | 1 | 7" · 6+ · 3+ · 3+ · 12 · 1 | Prism-beam, Treads / hull ram | Arcane Amplifier | **125** |
| Spire-Barge | C4 Behemoth (transport) | 1 | 9" · 6+ · 3+ · 3+ · 12 · 2 | Heavy stubber, Treads / hull ram | Floating Spire | **110** |
| Winged Star-Paragon | C4 Leader (Warlord) | 1 | 8" · 4+ · 5+ · 3+ · 14 · 3 | Star-fire, Astral stave | Greater Sorcerer; Astral Ward | **175** |
| Inverted Star Monolith | C5 Behemoth | 1 | 6" · 4+ · 2+ · 3+ · 22 · 6 · WARD 5+ | Star-lance, Warp-flare, Titan stomp | Living Ritual | **285** |
<!--/UNITS:14-->

**Detachments**
<!--DETACH:14-->
**Core rule — The Inverted Rite (spells):** Each Sorcerer (a Leader with a [PSYCHIC / ARCANE] weapon) may cast 1 spell per activation without spending an Action; each spell once per round for the army. Roll 2D6 (safe) or 3D6 (channel: the effect is doubled where marked ×2; if 2+ dice show a 1, the Sorcerer suffers D3 Fatal Wounds). Spells: Hex-Bolt (6+) D3 Fatal Wounds to an enemy unit within 18″ ×2 · Veil of Mirrors (6+) a friendly unit within 12″ is −1 to be Hit until the End of Round · Warp-Breach (7+) a friendly unit's weapons get +1 PEN this round · Withering Gaze (7+) an enemy unit within 18″ gets −1 to Hit until the End of Round · Chrono-Step (8+) a friendly unit within 12″ makes a 3″ move ×2 · Inverted Geometry (9+) swap two friendly unengaged units within 18″ of the Sorcerer (counts as their move).

**Gamble — Channel the Star** *(risk: durability (dice))*: Built into every cast: roll 3D6 instead of 2D6 — marked effects are doubled; if two or more dice show a 1, the Sorcerer suffers D3 Fatal Wounds.

**D1. Grand Coven** — *Three or four sorcerers, a wall of automata, spells every activation.*
- *Rule:* Coven: Sorcerers within 6″ of another friendly Sorcerer get +1 to casting rolls; Hex-Bolt can be cast twice per round.
- *Enhancement:* **Grimoire of the Inverted Star** (+10 pts, Master of the Astral Geometry) — Knows one extra spell: Unmaking (9+): an enemy unit within 18″ loses WARD until the End of Round.
- *Enhancement:* **Familiar** (+10 pts, Sorcerer-Adept) — Re-roll one casting die per round.
- *Stratagem:* **Arcane Surge** (1 CP) — A spell is cast: +2 to the casting roll.
- *Stratagem:* **Dispel** (1 CP) — An enemy [PSYCHIC / ARCANE] effect targets a unit within 12″ of a Sorcerer: Roll 2D6: on 7+ it is cancelled.
- *Stratagem:* **Siphon the Warp** (1 CP) — A Sorcerer suffers backlash: Ignore it.

**D2. Automaton Legion** — *Hollow automata advance under arcane fire.*
- *Rule:* All Is Ash: Hollow and Hex-Plated Automata have WARD 5+; their ranged weapons gain [SHREDDING WOUNDS] while within 6″ of a Sorcerer.
- *Enhancement:* **Soul-Binding** (+15 pts, Hex-Blade Exalted) — The attached unit has UNYIELDING 6+.
- *Enhancement:* **Inferno Rounds** (+10 pts, Hollow Automata) — +1 PEN with ranged weapons.
- *Stratagem:* **Warp-Flame Volley** (1 CP) — An Automata unit Shoots: Weapons gain [IGNORES COVER].
- *Stratagem:* **March of the Dead Souls** (1 CP) — An Automata unit activates: It may Move and Shoot without the [HEAVY] penalty.
- *Stratagem:* **Dust Reforms** (2 CP) — Command Phase: Return D3 slain models to an Automata unit within 6″ of a Sorcerer.

**D3. Geometry Weavers** — *Board control: swap, step and confuse.*
- *Rule:* Inverted Geometry costs 1 CP instead of a cast (still once per round). Units that were swapped get [STEALTH] until the End of Round.
- *Enhancement:* **Tesseract Key** (+10 pts, Seer of the Inverted Star) — Inverted Geometry range is 24″.
- *Enhancement:* **Mirror-Shard Robe** (+15 pts, Master of the Astral Geometry) — The attached unit is [STEALTH].
- *Stratagem:* **Fold Space** (1 CP) — A unit is targeted by a Charge: It makes a 3″ move before the roll.
- *Stratagem:* **Doubled Geometry** (2 CP) — Inverted Geometry is cast: Cast it a second time this round.
- *Stratagem:* **Lost in the Maze** (1 CP) — An enemy unit within 12″ of a Sorcerer activates: −2″ to its moves this activation.

<!--/DETACH:14-->

---

## 15. The Velvet-Scourge Syndicate 🟡 — PAIN = POWER · ★★★
*Proxies: excess legions, Noise Marines, Hedonites of the excess god, Daemonettes.*

**Learned from**
- ✅ **Hedonites' Depravity** (power generated by being hurt): "pain = power".
- ✅ **excess legions:** sonic weapons and duelists.
- ⛔ **Perverse incentives** (feeding your own models to the enemy for points): the frenzy is a **one-time switch** (once damaged, +1 to Hit and Onslaught), not something that grows.

**How it plays:**
- The fastest foot army (MOV 8).
- Sonics ignore cover and suppress. Duelists strike first.
- Getting hurt makes every unit better, so they want the first exchange.
- A big alpha strike that deletes units outright beats them.

**Stat DNA:** MOV ▲▲ · MS ▲ · RS ▲ · ARM ▼ · MIGHT ● · CTRL ● · Density 18–24.

<!--UNITS:15-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Maestro of Excess | C2 Leader (Warlord) | 1 | 8" · 2+ · 2+ · 4+ · 5 · 1 · WARD 5+ | Sonic pistol, Whisper-blade | Grand Temptation; Exquisite Swordplay | **95** |
| Blade-Diva Champion | C2 Leader (Champion) | 1 | 8" · 2+ · 2+ · 4+ · 5 · 1 · WARD 5+ | Heavy pistol, Twin rapture-blades | Quicksilver Grace; Perfect Duellist | **95** |
| Siren-Choirmistress | C1 Leader (Support) | 1 | 8" · 2+ · 2+ · 5+ · 3 · 1 | Siren-song, Rapture-blade | Cacophony; Deafening Note | **65** |
| Silk-Veil Assassin | C1 Leader (Specialist) | 1 | 8" · 2+ · 2+ · 5+ · 3 · 1 | Heavy pistol, Envenomed silk | Thrill-Seeker | **70** |
| Flayed-Silk Initiates | C1 Trooper | 5–10 | 9" · 3+ · 3+ · 5+ · 1 · 1 | Sonic pistol, Rapture-blade | Thrill-Seekers | **80** (+13/m) |
| Sonic-Blaster Cultists | C1 Trooper | 5–10 | 8" · 3+ · 3+ · 5+ · 1 · 2 | Sonic blaster, Combat blade | Discordant Volley | **85** (+12/m) |
| Maestro Duelists | C2 Elite | 3–5 | 8" · 2+ · 2+ · 4+ · 4 · 2 · WARD 5+ | Silken glaive | Elegant Parry; Lightning Reflexes | **145** (+40/m) |
| Cacophony Paladins | C2 Elite | 3–5 | 6" · 2+ · 2+ · 4+ · 4 · 1 · WARD 5+ | Blastmaster, Great weapon / fist | Wall of Sound | **160** (+36/m) |
| Swift-Steed Riders | C2 Elite (fast) | 3–5 | 14" · 2+ · 3+ · 5+ · 2 · 1 | Sonic blaster, Barbed lance | Thrill-Seekers | **75** (+24/m) |
| Rapture-Hounds | C1 Trooper | 5–10 | 9" · 3+ · 5+ · 7+ · 1 · 1 | Lashing claws | Scent of Excess | **60** (+11/m) |
| Dervish Blade-Dancers | C1 Trooper | 5–10 | 9" · 2+ · 3+ · 6+ · 1 · 1 | Whirling blades | Dervish; Euphoric Strike | **70** (+14/m) |
| Resonance Cannon Team | C2 Trooper (support) | 2–3 | 7" · 4+ · 3+ · 5+ · 2 · 1 | Resonance cannon, Bayonet / CCW | Shatter | **60** (+14/m) |
| Velvet-Strider | C3 Brute | 1 | 9" · 2+ · 2+ · 4+ · 9 · 3 | Shrieker cannon, Lash-claws | Rapturous Pain | **95** |
| Silk-Chariot of Rapture | C3 Brute | 1 | 12" · 2+ · 2+ · 4+ · 8 · 3 | Bladed wheels & riders | Fly-By Slashes | **70** |
| Rapture-Beast | C3 Brute | 1 | 10" · 2+ · 5+ · 5+ · 8 · 3 | Monster talons | Hypnotic Musk | **85** |
| Sonic Organ-Engine | C4 Behemoth (support) | 1 | 10" · 5+ · 3+ · 4+ · 12 · 1 | Pipe-organ shriek, Treads / hull ram | Crescendo | **125** |
| Pleasure-Barge | C4 Behemoth (transport) | 1 | 12" · 4+ · 3+ · 4+ · 12 · 2 | Shrieker cannon, Treads / hull ram | Grand Entrance | **110** |
| Rapture-Engine | C4 Brute / Behemoth | 1 | 10" · 2+ · 2+ · 4+ · 14 · 3 | Shrieker array, Bladed limbs | Ecstatic Overdrive | **170** |
| Exalted Rapture-Fiend | C4 Behemoth | 1 | 10" · 2+ · 5+ · 5+ · 14 · 3 | Rapture-claws, Colossal jaws | Unnatural Speed | **135** |
| Cathedral of Agony | C5 Behemoth | 1 | 12" · 2+ · 2+ · 4+ · 22 · 6 · WARD 5+ | Agony-organ, Titan stomp | Symphony of Pain | **395** |
<!--/UNITS:15-->

**Detachments**
<!--DETACH:15-->
**Core rule — Ecstasy of Pain:** A Velvet-Scourge unit that is below Starting Strength (or damaged), or that destroyed an enemy model this round, gets +1 to Hit and +1″ MOV.

**Gamble — Temptation** *(risk: opponent's choice)*: Once per round, when a unit is selected to Shoot or Fight, offer the opponent a Temptation. The OPPONENT chooses: the target unit suffers D3 Fatal Wounds now, OR your unit's weapons gain [ONSLAUGHT 2] for this attack.

**D1. Sonic Choir** — *Sonic gunline that strips cover and shuts down reactions.*
- *Rule:* Cacophony of Sonic Blasters: ranged weapons have [IGNORES COVER] and [ASSAULT]; units hit by them cannot make ranged Retaliation Strikes until the End of Round.
- *Enhancement:* **Siren's Throat** (+10 pts, Siren-Choirmistress) — Cacophony range 9″.
- *Enhancement:* **Doom-Siren** (+10 pts, Cacophony Paladins) — +1 PEN with ranged weapons.
- *Stratagem:* **Shattering Chord** (1 CP) — A unit Shoots: Its weapons gain [SHRAPNEL 1].
- *Stratagem:* **Overwhelming Noise** (1 CP) — An enemy unit within 12″ activates: It suffers −1 to Hit this activation.
- *Stratagem:* **Encore** (1 CP) — A unit destroys an enemy unit by Shooting: It may make a 3″ move.

**D2. Masque of Blades** — *Duelists and dancers that slip in and out of melee.*
- *Rule:* Quicksilver Grace: all Velvet-Scourge units may Fall Back and still Shoot or Charge. Leaders have [STRIKE FIRST].
- *Enhancement:* **Mask of Ten Faces** (+10 pts, Silk-Veil Assassin) — WARD 5+.
- *Enhancement:* **Duelist's Garter** (+15 pts, Blade-Diva Champion) — +1 Damage in melee on a round she charged.
- *Stratagem:* **Euphoric Kill-High** (1 CP) — A unit destroys an enemy unit in melee: It may consolidate 6″.
- *Stratagem:* **Feint** (1 CP) — A unit is targeted by a Charge: It makes a 3″ move; if the Charge then fails, the charger is Rattled.
- *Stratagem:* **Exquisite Agony** (1 CP) — A unit is selected to Fight: Count it as below Starting Strength.

**D3. Carnival of Excess** — *Rapture-engines, chariots and beasts in a gaudy charge.*
- *Rule:* Grand Spectacle: Class 3–5 units get +2″ MOV in Round 1 and +1 Attack in melee while below Starting Strength.
- *Enhancement:* **Gilded Engine-Heart** (+20 pts, Rapture-Engine) — UNYIELDING 6+.
- *Enhancement:* **Ringmaster's Whip** (+20 pts, Maestro of Excess) — Friendly units within 6″ get +1 Attack on a round they charged.
- *Stratagem:* **Showstopper** (1 CP) — A Class 3–5 unit charges: Crushing Impact for 0 CP.
- *Stratagem:* **Gaudy Distraction** (1 CP) — An enemy unit targets a Class 1–2 unit within 6″ of a Class 3–5 unit: It must target the Class 3–5 unit if visible.
- *Stratagem:* **Rapture-Rush** (1 CP) — A Class 3–5 unit is below half: +1 to Hit and +2″ MOV until the End of Round.

<!--/DETACH:15-->

---

# GRAND ALLIANCE 4 — THE CELESTIAL DOMINION

## 16. The Starfire High-Court 🟢 — DISENGAGE · ★★★★
*Proxies: space elves Craftworlds, light-elf Realm-lords, High Elves, Harlequins.*

**Learned from**
- ✅ **space elves Battle Focus** (move after shooting): the most iconic "elf" mechanic.
- ⛔ **What Battle Focus became in early 10th:** shoot, then move out of sight every turn was oppressive and GW nerfed it. Our glide is **3″, only after the action, never into engagement**, and it is the *only* post-action movement in the game.

**How it plays:**
- Strike, then step away.
- Few fragile models with excellent skill. Every activation is "act, then glide to safety".
- Rewards precise measuring.
- Massed fire and Strike-First melee punish mistakes hard.

**Stat DNA:** MOV ▲ · MS ▲ · RS ▲ · ARM ● + WARD (elites) · MIGHT ▼ · CTRL ▼ · Density 14–20.

<!--UNITS:16-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Starlight Archers | C1 Trooper | 5–10 | 7" · 4+ · 3+ · 4+ · 1 · 2 | Star-bow, Combat blade | Prism Focus | **100** (+14/m) |
| Solar Sentinels | C1 Trooper | 5–10 | 7" · 3+ · 4+ · 4+ · 1 · 2 · WARD 6+ | Carbine, Sun-glaive |  | **85** (+16/m) |
| Prism-Blade Dancers | C1 Elite | 5–10 | 8" · 2+ · 4+ · 5+ · 1 · 1 · WARD 5+ | Pistol, Dancer blades | Blade-Storm | **75** (+16/m) |
| Sky-Lancer Riders | C2 Elite (fast) | 3–5 | 14" · 3+ · 3+ · 4+ · 2 · 1 | Twin star-carbines, Cavalry lance |  | **90** (+29/m) |
| Star-Seer | C1 Leader (psyker) | 1 | 7" · 3+ · 3+ · 5+ · 3 · 1 · WARD 4+ | Star-bolt, Witch-spear | Fortune | **60** |
| High Star-Regent | C2 Leader (Warlord) | 1 | 8" · 2+ · 2+ · 3+ · 5 · 1 · WARD 4+ | Starfire pistol, Star-blade | Path of Command | **95** |
| Astral Phoenix-Construct | C3 Brute | 1 | 8" · 3+ · 3+ · 3+ · 8 · 3 | Las-lance, Wraith-talons |  | **85** |
| Prism Grav-Skiff | C4 Behemoth (transport) | 1 | 12" · 6+ · 3+ · 3+ · 13 · 2 · WARD 5+ | Prism cannon, Heavy stubber |  | **155** |
| Star-Barge Colossus | C5 Behemoth | 1 | 12" · 3+ · 3+ · 3+ · 22 · 5 · WARD 5+ | Doom-lance, Solar scythe |  | **285** |
| Blade-Master of the Dawn | C1 Leader (Champion) | 1 | 7" · 2+ · 3+ · 4+ · 4 · 1 · WARD 5+ | Pistol, Dawn-blade | Perfect Strike | **80** |
| Moon-Shadow Ranger | C1 Leader (Specialist) | 1 | 7" · 3+ · 2+ · 5+ · 3 · 1 | Moon long-rifle, Combat blade |  | **55** |
| Sun-Spear Skirmishers | C1 Trooper | 5–10 | 8" · 3+ · 4+ · 4+ · 1 · 2 | Light sun-spear, Carbine |  | **80** (+15/m) |
| Prism Guardians | C2 Elite | 3–5 | 7" · 3+ · 3+ · 3+ · 3 · 2 · WARD 4+ | Prism halberd |  | **115** (+43/m) |
| Dawn Fusion-Lancers | C1 Trooper (specialist) | 5 | 7" · 3+ · 3+ · 4+ · 1 · 1 | Fusion lance, Combat blade |  | **90** |
| Star-Lance Platform | C2 Trooper (support) | 2–3 | 6" · 5+ · 3+ · 4+ · 2 · 1 | Star-lance, Bayonet / CCW |  | **65** (+19/m) |
| Moon-Eye Snipers | C1 Trooper (specialist) | 2–3 | 7" · 5+ · 2+ · 5+ · 1 · 1 | Sniper rifle, Combat blade |  | **40** (+12/m) |
| Sun-Wing Skyblades | C1 Elite (jump) | 3–5 | 10" · 3+ · 3+ · 4+ · 1 · 1 | Carbine, Sky-grenades |  | **60** (+14/m) |
| Veil-Walkers | C1 Trooper (recon) | 3–5 | 7" · 4+ · 3+ · 5+ · 1 · 1 | Carbine, Combat blade |  | **45** (+11/m) |
| Prism Strider | C3 Brute (walker) | 1–2 | 8" · 4+ · 3+ · 4+ · 6 · 2 | Strider prism-cannon, Combat blade |  | **75** (+48/m) |
| Starfire Prism-Tank | C4 Behemoth | 1 | 12" · 6+ · 3+ · 3+ · 13 · 2 · WARD 5+ | Twin prism-lance, Heavy stubber |  | **160** |
| Aelira Dawnspear, Sun-Herald | C3 Leader (Epic Warlord) | 1 | 14" · 2+ · 2+ · 3+ · 8 · 2 · WARD 4+ | Sun-spear throw, Dawnspear, Griffon talons | Herald of Dawn; Second Dawn | **125** |
| Prism Herald | C2 Leader (Support) | 1 | 8" · 3+ · 2+ · 4+ · 4 · 1 · WARD 5+ | Prism-light, Power weapon | Refracting Aegis | **65** |
| Dawn Sorceress | C1 Leader (Mystic) | 1 | 7" · 4+ · 3+ · 5+ · 3 · 1 · WARD 4+ | Sunburst, Power weapon | Blinding Flare | **60** |
| Sun-Crested Lancers | C1 Trooper / Elite | 5–10 | 7" · 3+ · 4+ · 4+ · 1 · 2 | Throwing spears, Sun-lance | Shining Phalanx | **80** (+17/m) |
| Dawnblade Swordmasters | C2 Elite | 3–5 | 7" · 2+ · 4+ · 4+ · 3 · 1 · WARD 5+ | Greatblade | Perfect Strikes; Deflecting Blades | **105** (+39/m) |
| Sun-Forged Wardens | C2 Elite | 3–5 | 6" · 3+ · 3+ · 3+ · 3 · 1 · WARD 5+ | Sun-repeater, Great weapon / fist | Prism Plate | **115** (+39/m) |
| Light-Weaver Battery | C3 Brute (support) | 1 | 6" · 5+ · 3+ · 4+ · 6 · 1 | Light-weave array, Bayonet / CCW | Dazzle | **65** |
| Zephyr Elemental | C3 Brute | 1 | 12" · 3+ · 4+ · 5+ · 8 · 2 · WARD 5+ | Cutting winds | Tailwind | **70** |
| Dawn-Wing Gunship | C4 Behemoth | 1 | 16" · 5+ · 3+ · 4+ · 12 · 0 | Sunfire lance, Star-repeaters | Strafing Run | **115** |
| Mountain-Spirit Colossus | C4 Behemoth | 1 | 7" · 3+ · 4+ · 3+ · 15 · 3 · WARD 5+ | Avalanche fists, Hurled boulders | Stone Ward | **180** |
<!--/UNITS:16-->

**Detachments**
<!--DETACH:16-->
**Core rule — Solar Grace:** Every unit has [FLY]. After a unit finishes its Shoot or Fight action it may glide 3″, ending outside Engagement Range. This is the only post-action movement in the game.

**Gamble — Overcharged Dawnstone** *(risk: tempo / mobility)*: Shatter a unit's gem for TWO effects at once; that unit can no longer glide for the rest of the battle.

**D1. Court of Blades** — *Melee aristocracy: Dancers and raid lord dive, kill and glide away.*
- *Rule:* Dance of Blades: units that glided last activation get +1 to Hit in melee this activation.
- *Enhancement:* **Starsteel Edge** (+10 pts, High Star-Regent) — The bearer's melee critical wounds trigger on 5+.
- *Enhancement:* **Mantle of Dawn** (+10 pts, Star-Seer) — Melee attacks against the bearer get −1 to Hit.
- *Stratagem:* **Lightning Riposte** (1 CP) — A unit is charged: It gains [STRIKE FIRST] against that charger.
- *Stratagem:* **Starlight Sidestep** (1 CP) — A unit is declared as a Charge target: Glide 3″ backward; the charge may fail.
- *Stratagem:* **Perfect Form** (1 CP) — A Leader fights: Its attacks gain [PRECISION].

**D2. Prism Host** — *Ranged precision: Archers mark, the Phoenix and Skiffs delete.*
- *Rule:* Prismatic Link: if 2+ Starfire units shoot the same target in a round, the later ones get +1 PEN against it.
- *Enhancement:* **Focusing Crystal** (+10 pts, Star-Seer) — The attached unit gets +1 PEN with ranged weapons.
- *Enhancement:* **Eye of the Dawn** (+10 pts, High Star-Regent) — The bearer re-rolls ranged Hit rolls.
- *Stratagem:* **Overcharged Prisms** (1 CP) — A vehicle shoots: +1 Damage this attack.
- *Stratagem:* **Hunting Light** (1 CP) — A unit shoots a Rattled target: Re-roll Wound rolls.
- *Stratagem:* **Fade from Sight** (1 CP) — After a unit glides: It gains [UNSEEN 12″] until it next activates.

**D3. Wind-Rider Host** — *Speed: jetbike swarms and skiffs grab objectives and never stay in reach.*
- *Rule:* Wind of Stars: Sky-Lancers and vehicles glide 6″ instead of 3″.
- *Enhancement:* **Windrunner Sigil** (+20 pts, High Star-Regent) — The bearer gets +4″ Move (can join jetbikes).
- *Enhancement:* **Star-Map** (+10 pts, Star-Seer) — The attached unit gains [SCOUTS 6″].
- *Stratagem:* **Lightning Raid** (1 CP) — A fast unit ends a Move on an objective: It counts double CTRL until the end of the round.
- *Stratagem:* **Hit and Fade** (2 CP) — A unit finishes its activation: It may glide 3″ again.
- *Stratagem:* **Contrails** (1 CP) — A unit is shot after Moving ≥10″: −1 to Hit against it for that attack.

<!--/DETACH:16-->

---

## 17. The Sun-Scaled Temple-Host 🟡 — CRITICAL RANGE · ★★
*Proxies: star-lizard armies, Lizardmen, dinosaur ranges.*

**Learned from**
- ✅ **star-lizard armies:** saurus jaws as a free extra attack, cold-blooded discipline, giant dinosaurs.
- ⛔ **fantasy wargames star-lizard armies's teleport and spell spam:** teleport belongs to Cabal (only one detachment gets a small priestly teleport). Saurians own **crit range**: crits on 5+ against wounded prey.

**How it plays:**
- Predators. First soften a target (wound it or suppress it), then saurians and dinosaurs crit on 5+ and tear it apart.
- Straightforward and strong in melee, weak at range.

**Stat DNA:** MOV ● (skinks ▲▲) · MS ▲ · RS ▼ · ARM ● · MIGHT ▲ · CTRL ● · Density 18–26.

<!--UNITS:17-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Star-Sage Elder | C3 Leader (Warlord) | 1 | 6" · 2+ · 5+ · 3+ · 9 · 2 · WARD 5+ | Star-light, Palanquin guards | The Great Plan; Celestial Ward | **125** |
| Scar-Veteran Old-Blood | C2 Leader (Champion) | 1 | 6" · 2+ · 4+ · 3+ · 6 · 1 · WARD 5+ | Sun-stone blade, Predatory jaws | Primal Fury | **95** |
| Sun-Priest Astromancer | C1 Leader (Mystic) | 1 | 6" · 2+ · 4+ · 4+ · 3 · 1 | Solar bolt, Power weapon | Shrouding Light; Read the Stars | **85** |
| Chameleon Stalker | C1 Leader (Specialist) | 1 | 6" · 2+ · 4+ · 4+ · 3 · 1 | Poison blowpipe, Combat blade | Vanish | **75** |
| Saurian Spawn-Warriors | C1 Trooper / Elite | 5–10 | 6" · 3+ · 5+ · 3+ · 2 · 2 | Javelins, Obsidian club, Predatory jaws | Shield-Phalanx | **175** (+20/m) |
| Scaleling Javelin-Scouts | C1 Trooper (specialist) | 5–10 | 9" · 3+ · 4+ · 5+ · 1 · 1 | Dart-pipes, Combat blade | Chameleon Skin | **75** (+11/m) |
| Raptor Pack | C1 Trooper | 5–10 | 10" · 3+ · 6+ · 5+ · 2 · 1 | Sickle claws, Predatory jaws | Pack Hunters | **100** (+15/m) |
| Temple-Guard Saurians | C2 Elite | 3–5 | 6" · 2+ · 4+ · 3+ · 4 · 2 · WARD 5+ | Temple halberd, Predatory jaws | Sworn Guardians; Unshakeable | **180** (+34/m) |
| Raptor-Knights | C2 Elite (fast) | 3–5 | 11" · 2+ · 5+ · 4+ · 3 · 1 | Javelins, Raptor-spear, Predatory jaws | Blood-Frenzied Mounts | **120** (+27/m) |
| Wing-Lizard Riders | C1 Elite (fast) | 3–5 | 10" · 2+ · 5+ · 4+ · 2 · 1 | Star-darts, Raking talons | Dropping Rocks | **85** (+21/m) |
| Horned Brute-Saurians | C2 Elite (brute) | 3–5 | 6" · 2+ · 6+ · 4+ · 5 · 1 | Stone maul, Predatory jaws | Sweeping Blows | **175** (+30/m) |
| Chameleon Snipers | C1 Trooper (specialist) | 2–3 | 6" · 4+ · 4+ · 5+ · 2 · 1 | Poison blowpipe, Combat blade | Ambush Position | **60** (+14/m) |
| Fire-Spitter Handlers | C2 Trooper (support) | 2–3 | 5" · 4+ · 5+ · 4+ · 3 · 1 | Fire-spitter beast, Predatory jaws | Goad the Beast | **65** (+22/m) |
| Feathered Sky-Serpent | C3 Brute | 1 | 8" · 2+ · 6+ · 4+ · 9 · 3 | Sun-breath, Raking claws, Predatory jaws | Sky-Strike | **105** |
| Horned Shell-Bastion | C4 Behemoth | 1 | 6" · 2+ · 6+ · 3+ · 15 · 3 | Solar engine-beam, Tail-club | Scaly Carapace | **225** |
| Thunder-Lizard Howdah | C4 Behemoth | 1 | 9" · 2+ · 6+ · 4+ · 15 · 3 | Howdah dart-pipes, Horns & stomp, Predatory jaws | Unstoppable Stampede | **210** |
| Sun-Engine Shell-Beast | C4 Behemoth (support) | 1 | 8" · 5+ · 5+ · 3+ · 13 · 1 | Sun-engine, Tail-club | Light of the Sun | **165** |
| Old-Blood on Tyrant-Lizard | C4 Leader (Warlord) | 1 | 9" · 2+ · 6+ · 4+ · 15 · 3 | Sunbolt gauntlet & blade, Predatory jaws, Thunder-lizard maw | Blood-Roar; Monstrous Rampage | **180** |
| Wild Tyrant-Lizard | C4 Behemoth | 1 | 9" · 2+ · 6+ · 4+ · 15 · 3 | Raking claws, Thunder-lizard maw, Predatory jaws | Monstrous Rampage | **205** |
| Elder Thunder-Titan | C5 Behemoth | 1 | 10" · 2+ · 6+ · 4+ · 22 · 6 · UNY 6+ | Titan stomp, Thunder-lizard maw, Howdah war-crew | Monstrous Rampage | **305** |
<!--/UNITS:17-->

**Detachments**
<!--DETACH:17-->
**Core rule — Predatory Jaws · Cold-Blooded:** Saurian Class 1–2 units and every Class 3–5 beast carry Predatory jaws ([EXTRA ATTACKS], [SHREDDING WOUNDS]). Cold-Blooded: melee Hit rolls of 5+ are critical against enemy units that are below Starting Strength or damaged, and Sun-Scaled units ignore negative modifiers to their melee Hit rolls.

**Gamble — Apex Savagery** *(risk: exposure (durability))*: When a unit is selected to Fight: +1 Damage on its melee weapons this activation, but it has −1 ARM until it next activates.

**D1. Sunclaw Hunt** — *Beasts and raptors running down the wounded.*
- *Rule:* Rampage: Monstrous Rampage applies to all Class 4–5 Sun-Scaled units; Class 2–5 units get +1″ to Charge rolls against units below Starting Strength.
- *Enhancement:* **Ancient Scar** (+15 pts, Old-Blood on Tyrant-Lizard) — UNYIELDING 6+.
- *Enhancement:* **Blood-Crest** (+15 pts, Scar-Veteran Old-Blood) — +1 Damage on a round he charged.
- *Stratagem:* **Savage Bite** (1 CP) — A unit is selected to Fight: Its Predatory jaws get +1 Attack.
- *Stratagem:* **Scent of Prey** (1 CP) — An enemy unit is damaged: One friendly unit within 12″ makes a 3″ move toward it.
- *Stratagem:* **Primal Roar** (1 CP) — A Class 4–5 unit ends a Charge: Engaged enemy units are Rattled on a 4+.

**D2. Starborne Prophecy** — *The plan of the elders: a cosmic asterism shapes the battle.*
- *Rule:* Asterisms: at deployment pick 1; in Round 3 pick a second (both active). Great Drake (+1 to Wound in melee on a round the unit charged) · Hunter's Steed (+2″ MOV) · Sage's Staff (+1 ARM to 3+ cap against ranged attacks).
- *Enhancement:* **Starstone Cartouche** (+10 pts, Sun-Priest Astromancer) — Pick the second asterism in Round 2.
- *Enhancement:* **Comet-Fragment Blade** (+10 pts, Star-Sage Elder) — The attached unit has WARD 5+.
- *Stratagem:* **Celestial Alignment** (1 CP) — Command Phase: One unit benefits from all three asterisms until the End of Round.
- *Stratagem:* **Predestined Strike** (1 CP) — A unit is selected to Shoot or Fight: Re-roll Hit rolls of 1.
- *Stratagem:* **Sky-Fire Comet** (2 CP) — Command Phase, once per battle: An enemy unit within 24″ of a Leader suffers D6 Fatal Wounds on a 3+.

**D3. Coalesced Scales** — *Armoured saurians and shell-beasts holding the temple.*
- *Rule:* Scaly Skin: Saurian Class 2 units and Class 4–5 beasts reduce incoming PEN by 1 (min 0).
- *Enhancement:* **Obsidian Scale-Plate** (+10 pts, Temple-Guard Saurians) — +1 ARM (to 3+ cap).
- *Enhancement:* **Thick-Scaled Hide** (+15 pts, Horned Shell-Bastion) — UNYIELDING 6+.
- *Stratagem:* **Cold Endurance** (1 CP) — A unit is targeted: Incoming Damage −1 (min 1) for the attack.
- *Stratagem:* **Unbreakable Line** (1 CP) — A unit within 3″ of an objective is charged: It is not Rattled; +1 to Wound on its Retaliation Strike.
- *Stratagem:* **Temple Stand** (1 CP) — Command Phase: One unit gets [SECURED] until the End of Round.

<!--/DETACH:17-->

---

## 18. The Obsidian Forge-Tombs 🟡 — REVIVE · ★★
*Proxies: undying machine armies, rune-berserker dwarves, dwarf ranges, Tomb Kings, airship-dwarf.*

**Learned from**
- ✅ **undying machine armies Reanimation Protocols:** "they won't stay dead" is iconic.
- ✅ **rune-berserker dwarves:** runes and grudges.
- ⛔ **Early-10th reanimation healing wounds on big models** (oppressive, then nerfed): we revive **whole infantry models only, max 2 per unit per round, and only if the unit survives**.

**How it plays:**
- The slow wall. Revival rewards the opponent for **finishing units off** and punishes spreading damage.
- Gunlines and hammers both work.
- The game is about grinding the centre.

**Stat DNA:** MOV ▼▼ · MS ▲ · RS ● · ARM ▲ · MIGHT ▲ · CTRL ● · Density 14–20.

<!--UNITS:18-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| High Thane of the Gate | C2 Leader (Warlord) | 1 | 4" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Rune-pistol, Gate-axe | Thane's Oath; Keeper of the Book | **95** |
| Grudge-Thane Champion | C2 Leader (Champion) | 1 | 4" · 2+ · 3+ · 3+ · 6 · 1 · WARD 5+ | Heavy pistol, Grudge-hammer | Settle the Score | **90** |
| Tomb-Priest | C1 Leader (Support) | 1 | 4" · 2+ · 3+ · 3+ · 4 · 1 | Heavy pistol, Ancestor-staff | Rites of Return; Ancestral Ward | **75** |
| Rune-Seer | C1 Leader (Mystic) | 1 | 4" · 2+ · 3+ · 3+ · 4 · 1 | Rune-bolt, Power weapon | Master-Rune | **70** |
| Obsidian Hearth-Guard | C1 Trooper | 5–10 | 4" · 3+ · 4+ · 3+ · 2 · 2 | Throwing hammers, Rune-axe | Shield-Wall | **105** (+20/m) |
| Rune-Gunner Line | C1 Trooper / Elite | 5–10 | 5" · 2+ · 3+ · 3+ · 2 · 2 | Rune-gun, Combat blade | Measured Volleys | **125** (+21/m) |
| Magma-Rune Hammerers | C2 Elite | 3–5 | 4" · 2+ · 3+ · 3+ · 4 · 2 · WARD 5+ | Magma-hammer | King's Guard | **115** (+37/m) |
| Tomb-Warden Ironbreakers | C2 Elite | 3–5 | 4" · 2+ · 3+ · 3+ · 4 · 1 · WARD 4+ | Drake-fire pistol, Gromhammer | Unbreakable | **140** (+45/m) |
| Ember-Gun Thunderers | C1 Trooper / Elite | 5 | 5" · 2+ · 3+ · 3+ · 2 · 2 | Autocannon, Rune-gun, Combat blade | Drilled Crews | **160** |
| Obsidian Gyro-Wardens | C2 Elite (fast) | 3–5 | 10" · 2+ · 4+ · 3+ · 3 · 1 | Rotor-gun, Rotor blades | Bomb-Bay | **90** (+33/m) |
| Tomb-Delvers | C1 Trooper (specialist) | 3–5 | 5" · 3+ · 3+ · 4+ · 2 · 1 | Mining charges, Pick-axes | Up from the Deep | **60** (+17/m) |
| Magma-Cannon Battery | C2 Trooper (support) | 2–3 | 4" · 4+ · 4+ · 3+ · 3 · 1 | Magma cannon, Bayonet / CCW | Anchored | **85** (+34/m) |
| Liquid-Gold Rune-Golem | C3 Brute | 1 | 4" · 2+ · 3+ · 3+ · 10 · 3 | Molten-gold spray, Gold-forged fists | Reform | **110** |
| Basalt Tomb-Sentinel | C3 Brute | 1 | 5" · 2+ · 3+ · 3+ · 10 · 3 | Basalt fists | Living Stone | **115** |
| Ancestor-Engine | C4 Brute / Behemoth | 1 | 6" · 2+ · 3+ · 3+ · 15 · 3 | Rune-gatling, Gold-forged fists | Ancestral Core | **180** |
| Magma-Crawler | C4 Behemoth | 1 | 8" · 4+ · 4+ · 3+ · 18 · 3 | Magma cannon, Magma-spout, Obsidian treads | Rune-Sighted | **175** |
| Tomb-Barge | C4 Behemoth (transport) | 1 | 8" · 4+ · 4+ · 3+ · 13 · 2 | Heavy stubber, Obsidian treads | Ancestor Vault | **110** |
| Rune-Organ Battery | C4 Behemoth (support) | 1 | 6" · 5+ · 4+ · 3+ · 13 · 1 | Organ-gun, Obsidian treads | Rolling Volley | **120** |
| Magma-Wyrm Construct | C4 Behemoth | 1 | 7" · 2+ · 6+ · 3+ · 15 · 3 | Magma-breath, Monster talons | Obsidian Coils | **175** |
| Obsidian Tomb-Fortress | C5 Behemoth | 1 | 6" · 4+ · 3+ · 3+ · 24 · 5 | Magma-ordnance, Las-lance, Obsidian treads | Ancestor Shrine | **265** |
<!--/UNITS:18-->

**Detachments**
<!--DETACH:18-->
**Core rule — Grudge-Reanimation · The Grudge:** Reanimation: at the End of Round, each Obsidian unit that is still on the battlefield rolls a D6: on a 4+ it returns 1 slain model (Class 1–2) or heals D3 MIGHT (Class 3–5). The Grudge: before the battle name 1 enemy unit as the Grudge. Obsidian units re-roll Wound rolls of 1 against it. When the Grudge is destroyed, or an enemy unit destroys an Obsidian unit, move the Grudge to that enemy unit (only one Grudge at a time).

**Gamble — Burn the Ancestor-Spark** *(risk: resource (permanent))*: When a unit is selected to Shoot or Fight: +1 Damage and [IMPALING HITS] on its weapons this activation; that unit can never reanimate again.

**D1. Immortal Shield-Wall** — *Slow, unbreakable infantry blocks around objectives.*
- *Rule:* Gromril Shield-Wall: enemies cannot re-roll Wound rolls against Obsidian Class 1–2 units; units within 3″ of an objective reanimate on a 3+.
- *Enhancement:* **Ancestor's Shield** (+10 pts, High Thane of the Gate) — The attached unit has WARD 5+.
- *Enhancement:* **Oath-Stone** (+10 pts, Obsidian Hearth-Guard) — +1 CTRL per model and cannot be moved by enemy abilities.
- *Stratagem:* **Lock Shields** (1 CP) — A unit is targeted: Incoming PEN −1 for the attack.
- *Stratagem:* **Stand of the Ancients** (1 CP) — A unit is charged: It is not Rattled and gets +1 to Hit on its Retaliation Strike.
- *Stratagem:* **Magma-Tunnel Relocation** (1 CP) — Command Phase, once per round: An unengaged unit within 6″ of a table edge is placed within 6″ of another point on the same table edge, >8″ from enemies.

**D2. Grudge-Hunters** — *Thunderers and hammerers marching on the Grudge.*
- *Rule:* Book of Grudges: against the Grudge, Obsidian units re-roll all Wound rolls (not just 1s) and get +2″ MOV toward it.
- *Enhancement:* **Grudge-Rune** (+10 pts, Grudge-Thane Champion) — Re-roll all melee Wound rolls.
- *Enhancement:* **Marked in Gold** (+10 pts, Rune-Seer) — The Grudge cannot gain Cover.
- *Stratagem:* **Unforgiven** (1 CP) — The Grudge is destroyed: Gain 1 CP and heal D3 MIGHT on the unit that destroyed it.
- *Stratagem:* **Grudge Volley** (1 CP) — A unit Shoots the Grudge: Its weapons gain [HAILFIRE 1].
- *Stratagem:* **Write It Down** (1 CP) — An Obsidian unit is destroyed: The killer becomes the Grudge AND is Rattled.

**D3. Rune-Forge** — *Golems, engines and master-runes for one decisive round.*
- *Rule:* Forge-Runes: Class 3–5 Obsidian units reanimate on a 3+; the Master-Rune can be struck twice per battle (different runes).
- *Enhancement:* **Anvil of Ages** (+10 pts, Tomb-Priest) — Once per round, heal D3 MIGHT on a Class 3–5 unit within 3″.
- *Enhancement:* **Rune of Fury** (+15 pts, Liquid-Gold Rune-Golem) — +1 Attack in melee.
- *Stratagem:* **Strike the Rune** (1 CP) — A unit activates: It gains one Master-Rune effect this activation.
- *Stratagem:* **Molten Flow** (1 CP) — A Class 3–5 unit is damaged: Heal 1 MIGHT.
- *Stratagem:* **Rune of Wrath** (1 CP) — A Class 3–5 unit is destroyed: Each enemy unit within 6″ suffers D3 Fatal Wounds on a 4+.

<!--/DETACH:18-->

---

## 19. The Skitter-Kin & Rad-Scavengers 🟡 — GAMBLE & RECYCLE · ★★★★
*Proxies: rat-folk armies, infiltrator cults, Ash Waste Nomads, Necromunda hazmat gangs, any mutant kit.*

**Learned from**
- ✅ **rat-folk armies:** warp-tech overcharge (more power, risk of blowing up), endless rats.
- ✅ **infiltrator cults:** Cult Ambush (units come back).
- ⛔ **GSC's ambush-marker bookkeeping:** a destroyed unit returns **once**, at half strength, from a board edge.

**How it plays:**
- Cheap, chaotic, explosive.
- Push your luck with Overcharge on welders and warp-guns; throw cheap swarms at objectives knowing they'll come back.
- Lots of activations and lots of dice. Very low quality per model.

**Stat DNA:** MOV ▲ · MS ▼ · RS ▼ · ARM ▼▼ · MIGHT ● · CTRL ● · Density 30–45.

<!--UNITS:19-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Under-Chief Warlock-Engineer | C2 Leader (Warlord) | 1 | 7" · 3+ · 4+ · 4+ · 5 · 1 · WARD 5+ | Rad-pistol, Rad-blade | Skilled Manipulator; Tinker-Tinker | **75** |
| Clan-Lord Clawmaster | C2 Leader (Champion) | 1 | 7" · 3+ · 4+ · 4+ · 6 · 1 · WARD 5+ | Heavy pistol, Warp-claws | Cornered Rat; Bullying Commands | **85** |
| Rad-Prophet | C1 Leader (Mystic) | 1 | 7" · 4+ · 4+ · 5+ · 3 · 1 | Rad-bolt, Power weapon | Pestilent Blessing; Rad-Spark | **60** |
| Gutter-Assassin | C1 Leader (Assassin) | 1 | 7" · 4+ · 4+ · 5+ · 3 · 1 | Poison darts, Rad-dagger | Hidden in the Ranks | **65** |
| Clan-Scavengers | C1 Trooper | 10–15 | 8" · 5+ · 5+ · 7+ · 1 · 1 | Scrap-gun, Rusty blades & teeth | Strength in Numbers | **65** (+7/m) |
| Clan-Spearkin | C1 Trooper | 10–15 | 7" · 5+ · 5+ · 5+ · 1 · 2 | Scrap-sling, Rusty spear | Shieldwall of Bodies | **85** (+9/m) |
| Iron-Tail Guard | C1 Trooper / Elite | 5–10 | 7" · 4+ · 4+ · 4+ · 1 · 2 | Heavy rifle, Serrated halberd | Chieftain's Guard | **85** (+13/m) |
| Gutter-Stalkers | C1 Trooper (specialist) | 3–5 | 8" · 5+ · 4+ · 6+ · 1 · 1 | Pistol, Paired rad-blades | Ambush | **45** (+10/m) |
| Rad-Fire Thrower Team | C2 Trooper (support) | 2–3 | 6" · 6+ · 5+ · 5+ · 2 · 1 | Rad-fire thrower, Bayonet / CCW | Overcharge; Hidden Weapon Team | **45** (+13/m) |
| Rotary Scrap-Gun Team | C2 Trooper (support) | 2–3 | 6" · 6+ · 5+ · 5+ · 2 · 1 | Rotary scrap-gun, Bayonet / CCW | Overcharge; Hidden Weapon Team | **45** (+11/m) |
| Rad-Brute Packs | C2 Elite (brute) | 3–5 | 7" · 4+ · 6+ · 5+ · 4 · 1 | Rad-grafted claws | Cornered Ferocity | **80** (+23/m) |
| Gas-Lobber Squad | C1 Trooper (specialist) | 3–5 | 8" · 5+ · 4+ · 6+ · 1 · 1 | Choke-gas globes, Combat blade | Choking Cloud | **45** (+9/m) |
| Vermin Tide | C1 Trooper | 10–15 | 8" · 5+ · 6+ · 7+ · 1 · 1 | Rusty blades & teeth | Endless Vermin | **70** (+7/m) |
| Rad-Wheel | C3 Brute | 1 | 10" · 4+ · 4+ · 4+ · 9 · 3 | Rad-arcs, Crushing wheel | Erratic Rolling; Overcharge | **75** |
| Rad-Brute Monstrosity | C3 Brute | 1 | 9" · 4+ · 6+ · 5+ · 8 · 3 | Rad-cannon arms, Mutant claws | Overcharge | **65** |
| Doom-Gong Engine | C4 Behemoth (support) | 1 | 9" · 6+ · 5+ · 4+ · 11 · 1 | Sonic gong-wave, Grinding wheels | Peal of Doom | **110** |
| Subterranean Rad-Drill | C4 Behemoth (transport) | 1 | 11" · 6+ · 5+ · 4+ · 11 · 2 | Drill-vents, Drill-head | Burrow | **110** |
| Rad-Arc Cannon Crawler | C4 Behemoth | 1 | 11" · 6+ · 5+ · 4+ · 15 · 3 | Rad-arc cannon, Heavy stubber, Grinding wheels | Overcharge | **110** |
| Mutant Pit-Abomination | C4 Behemoth | 1 | 10" · 4+ · 6+ · 5+ · 13 · 3 | Mutant claws, Colossal jaws | Too Horrible to Die | **110** |
| Rad-Colossus Engine | C5 Behemoth | 1 | 11" · 4+ · 4+ · 4+ · 22 · 6 | Rad-storm cannon, Titan stomp | Overcharge | **225** |
<!--/UNITS:19-->

**Detachments**
<!--DETACH:19-->
**Core rule — Scurry · Seething Swarm:** Scurry: once per round, after an enemy unit finishes an activation, one unengaged Skitter-Kin unit may make a free 3″ move (not toward the enemy that just activated). Skitter-Kin units may Fall Back without being Rattled. Seething Swarm: once per round, at the End of Round, one Class 1 [FRAIL] unit returns D3 slain models (never above Starting Strength).

**Gamble — More-More Rad-Power!** *(risk: durability (dice))*: When a unit with an [OVERLOAD] weapon is selected to Shoot, you may Overcharge: roll a D6 — 1 KABOOM: the unit suffers D3 Fatal Wounds and does not Shoot · 2–5: +1 to Wound and +1 Damage · 6: also +1 PEN and +2 Attacks.

**D1. Rad-Tech Clans** — *Weapon-teams and engines overcharging every activation.*
- *Rule:* Tinker-Tinker: Overcharge rolls of 1 may be re-rolled once per round (army-wide); Weapon Teams within 3″ of a Class 1 unit are [UNSEEN 12″].
- *Enhancement:* **Rad-Stone Amulet** (+10 pts, Under-Chief Warlock-Engineer) — Units within 6″ ignore Overcharge KABOOM on a 4+.
- *Enhancement:* **Overclocked Barrels** (+10 pts, Rotary Scrap-Gun Team) — +1 Attack.
- *Stratagem:* **Rad-Surge** (1 CP) — A unit Overcharges: Roll two dice and pick one.
- *Stratagem:* **Duck Behind the Slaves** (1 CP) — A Weapon Team is targeted within 3″ of a Class 1 unit: The Class 1 unit takes the attack instead.
- *Stratagem:* **Burn-Out** (1 CP) — A unit suffers KABOOM: Each enemy unit within 3″ also suffers D3 Fatal Wounds.

**D2. Burrowing Swarm** — *Hordes appearing from table edges and drills (no portals).*
- *Rule:* Underhive Ambush: up to 3 Class 1 units may start in Reserves and arrive from Round 2 wholly within 6″ of any table edge or within 3″ of a friendly Subterranean Rad-Drill, more than 8″ from enemies.
- *Enhancement:* **Tunnel-Map** (+10 pts, Gutter-Assassin) — One unit arriving from Reserves may arrive 6″ from enemies instead of 8″.
- *Enhancement:* **Swarm-Master's Whip** (+15 pts, Clan-Lord Clawmaster) — Friendly Class 1 units within 6″ get +1 to Hit in melee.
- *Stratagem:* **Endless Tide** (2 CP) — Command Phase, once per battle: Return a destroyed Class 1 [FRAIL] unit at half strength from a table edge.
- *Stratagem:* **Scurry Away** (1 CP) — An enemy unit finishes an activation: Scurry a second unit this round.
- *Stratagem:* **Overwhelm** (1 CP) — A unit with 10+ models declares a Charge: +2″ to the Charge roll.

**D3. Skilled Manipulators** — *Leaders hide behind the horde while it soaks the damage.*
- *Rule:* Expendable Kin: Leaders within 3″ of a friendly Class 1 unit have WARD 4+ against ranged attacks; any saved damage is inflicted on that Class 1 unit instead (1 Fatal Wound per save).
- *Enhancement:* **Cowardly Cunning** (+10 pts, Under-Chief Warlock-Engineer) — [STEALTH].
- *Enhancement:* **Crown of the Gutter-King** (+15 pts, Clan-Lord Clawmaster) — The attached unit has UNYIELDING 6+.
- *Stratagem:* **Sacrifice the Slaves** (1 CP) — A Leader is targeted in melee within 3″ of a Class 1 unit: Remove D3 models from that unit: the Leader is −1 to be Hit.
- *Stratagem:* **Fleeing Fury** (1 CP) — A unit Falls Back: It may Shoot this activation.
- *Stratagem:* **Kin-Shield** (1 CP) — A Class 2–3 unit is targeted within 3″ of a Class 1 unit: It is [STEALTH] for the attack.

<!--/DETACH:19-->

---

## 20. The Astral Shadow-Clans 🟡 — ACTIVATION ORDER · ★★★★★
*Proxies: dark-raider elves, Dark Elves / free-city armies dark-elf models, cyber-ronin kits.*

**Learned from**
- ✅ **dark-raider elves:** pain-token rule (pain tokens as currency), raiders and wyches.
- ✅ **Alternating-activation games** (Kill Team's counteract, Malifaux-style passing): **acting out of sequence** is the strongest effect such games have.
- ⛔ **Unbounded action economy:** 1 out-of-sequence activation per round, with 1 Action only. The old "3 actions" trait was cut because it duplicated a Core Tactic.

**How it plays:**
- You control when things happen. Strike from the Dark right after the enemy commits; hold activations with Pain; ride skiffs to wherever the gap opens.
- Paper-thin, so every mistimed activation costs a unit.

**Stat DNA:** MOV ▲▲ · MS ▲ · RS ▲ · ARM ▼ + WARD (lords) · MIGHT ▼ · CTRL ▼ · Density 16–22.

<!--UNITS:20-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Master of the Astral Edge | C2 Leader (Warlord) | 1 | 8" · 2+ · 2+ · 4+ · 4 · 0 | Blast-pistol, Void-katana | Lord of Agony; Blade-Masters | **75** |
| Cyber-Ronin Sword-Saint | C2 Leader (Champion) | 1 | 8" · 2+ · 2+ · 4+ · 4 · 0 · WARD 5+ | Splinter pistol, Monomolecular nodachi | Iaijutsu; Perfect Cut | **75** |
| Flesh-Sculptor | C1 Leader (Support) | 1 | 8" · 2+ · 2+ · 5+ · 3 · 0 | Venom injector, Monomolecular katana | Grafted Resilience; Harvest | **70** |
| Void-Veil Assassin | C1 Leader (Specialist) | 1 | 8" · 2+ · 2+ · 5+ · 3 · 0 | Splinter pistol, Shadow-blades | Fade | **65** |
| Shadow-Kabar Raiders | C1 Trooper | 5–10 | 8" · 3+ · 3+ · 5+ · 1 · 1 | Splinter rifle, Combat blade | Raid Strike | **70** (+10/m) |
| Arena-Blade Cultists | C1 Trooper | 5–10 | 9" · 3+ · 3+ · 5+ · 1 · 0 | Pistol, Hydra-gauntlets | Arena Dodge | **60** (+12/m) |
| Cyber-Ronin Duelists | C2 Elite | 3–5 | 8" · 2+ · 2+ · 4+ · 4 · 1 | Monomolecular katana | Blade Discipline; Killing Edge | **120** (+34/m) |
| Umbral Stalkers | C1 Trooper (specialist) | 3–5 | 9" · 3+ · 2+ · 6+ · 1 · 0 | Shadow-fire, Monomolecular katana | Shadow-Step | **55** (+15/m) |
| Sky-Board Reavers | C2 Elite (fast) | 3–5 | 14" · 2+ · 3+ · 5+ · 2 · 0 | Splinter pistol, Bladed vanes | Eviscerating Fly-By | **55** (+18/m) |
| Void-Wing Scourges | C1 Elite (fast) | 3–5 | 10" · 2+ · 3+ · 5+ · 1 · 0 | Void-lance, Combat blade | Strike and Soar | **70** (+16/m) |
| Pain-Sculpted Brutes | C2 Elite (brute) | 3–5 | 8" · 2+ · 4+ · 5+ · 5 · 0 | Flesh-gauntlets | Sculpted Flesh | **105** (+39/m) |
| Ronin Iron-Wardens | C2 Elite | 3–5 | 7" · 2+ · 2+ · 4+ · 4 · 0 · WARD 5+ | Splinter pistols, Klaive-glaive | Bodyguard Oath | **120** (+29/m) |
| Void-Lance Team | C2 Trooper (support) | 2–3 | 7" · 4+ · 3+ · 5+ · 2 · 0 | Void-lance, Bayonet / CCW | Grav-Platform | **55** (+15/m) |
| Bladed Sky-Skiff | C3 Brute (support) | 1 | 14" · 4+ · 3+ · 5+ · 5 · 0 | Void-lance, Bladed hull | Skysplinter Assault | **60** |
| Agony-Engine Construct | C3 Brute | 1 | 10" · 2+ · 5+ · 4+ · 7 · 2 | Agony-flamer, Surgical blades | Sculpted Engine | **85** |
| Void-Ravager Gunship | C4 Behemoth | 1 | 14" · 4+ · 3+ · 4+ · 14 · 2 | Void-lance, Void-lance, Treads / hull ram | Hit and Fade | **160** |
| Shadow-Barge | C4 Behemoth (transport) | 1 | 14" · 4+ · 3+ · 4+ · 11 · 1 | Splinter-cannon, Bladed keel | Raider Deck | **110** |
| Agony-Colossus | C4 Behemoth | 1 | 11" · 2+ · 5+ · 5+ · 13 · 2 | Flesh-scythes, Colossal jaws | Feeds on Pain | **135** |
| Void-Bomber | C4 Behemoth (support) | 1 | 16" · 5+ · 3+ · 4+ · 11 · 0 | Void-bombs, Splinter-cannon | Bombing Run | **110** |
| Umbral Dread-Cruiser | C5 Behemoth (flyer) | 1 | 16" · 5+ · 2+ · 4+ · 18 · 0 | Void-lance, Void-lance, Splinter-cannon, Splinter-cannon | Pain-Amplifier | **200** |
<!--/UNITS:20-->

**Detachments**
<!--DETACH:20-->
**Core rule — Agony Harvest:** Start the battle with 2 Agony (max 4). Gain 1 each time an enemy unit is destroyed. When a unit activates, spend 1 Agony to Empower it until the end of the activation: re-roll Hit rolls, +1 PEN in melee and +2″ to Charge rolls. Agony is your own resource; it is never placed on enemy units.

**Gamble — All-In Assassination** *(risk: resource)*: Once per battle, spend ALL Agony (minimum 2) when a unit activates: its weapons gain [PRECISION] and [SHREDDING WOUNDS] this activation; you cannot gain Agony again until the End of Round.

**D1. Skysplinter Raiders** — *Skiffs and barges deliver strike teams, then fly on.*
- *Rule:* Skysplinter Assault: units that disembarked this round get +1 to Wound and [CRASHING].
- *Enhancement:* **Umbral Veil** (+20 pts, Master of the Astral Edge) — WARD 3+ until the first time a WARD roll of 1 is made, then no WARD.
- *Enhancement:* **Agony-Tap** (+10 pts, Flesh-Sculptor) — Start the battle with 3 Agony.
- *Stratagem:* **Lightning Raid** (1 CP) — A transport moves: Embarked units may disembark after its move and still Charge.
- *Stratagem:* **Splinter Storm** (1 CP) — A unit Shoots: Weapons gain [ANTI-INFANTRY 3+].
- *Stratagem:* **Skiff Dive** (1 CP) — A [FLY] unit is targeted: −1 to Hit.

**D2. Cyber-Ronin** — *Sword-saints and duelists in the open, no transports.*
- *Rule:* Way of the Blade: melee weapons gain [STRIKE FIRST] on a round the unit charged; units that spend Agony also gain [PRECISION].
- *Enhancement:* **Ancestral Blade** (+15 pts, Cyber-Ronin Sword-Saint) — +1 Damage in melee on a round he charged.
- *Enhancement:* **Duelist's Discipline** (+10 pts, Cyber-Ronin Duelists) — Enemies get −1 to Hit them in melee.
- *Stratagem:* **Draw and Cut** (1 CP) — A unit is charged: Its Retaliation Strike resolves before the charger fights.
- *Stratagem:* **Kensei** (1 CP) — A unit destroys an enemy Leader: Gain 2 Agony.
- *Stratagem:* **Bladestorm** (1 CP) — A unit is selected to Fight: Its melee weapons gain [REAPING 1].

**D3. Venom Cabal** — *Poison gunlines and flesh-sculptors.*
- *Rule:* Venom: ranged weapons with [IMPALING HITS] also gain [ANTI-INFANTRY 4+]; Flesh-Sculptors heal D3 MIGHT on the attached unit at the End of Round.
- *Enhancement:* **Elixir of Agony** (+15 pts, Flesh-Sculptor) — Friendly units within 6″ get +1 to Wound in melee on a round they charged.
- *Enhancement:* **Hex-Venom Rounds** (+10 pts, Shadow-Kabar Raiders) — +1 PEN with ranged weapons.
- *Stratagem:* **Toxin Cloud** (1 CP) — A unit Shoots: Units hit suffer −1″ MOV until the End of Round.
- *Stratagem:* **Pain-Fuelled** (1 CP) — An Agony is spent: Heal 1 MIGHT on the empowered unit.
- *Stratagem:* **Lethal Dose** (1 CP) — A unit targets a Class 1 unit: Re-roll Wound rolls.

<!--/DETACH:20-->

---

# GRAND ALLIANCE 5 — THE VOIDBORN CONVERGENCE

## 21. The Rift-Stalker Menagerie 🔷 — CONTRACTS · ★★★ (list-building)
*Proxies: **anything**: 3D prints, old ranges, toys, kitbashes. Pick the unit type by base size and bulk.*

**Learned from**
- ✅ **One Page Rules' Army Forge and "build your own" warbands:** total hobby freedom.
- ✅ **Imperial Agents / allied "soup":** flexible.
- ⛔ **Custom armies that out-optimise real factions:** the Rift-Stalker has **no verb**. It pays a flexibility tax and is the **control group** every faction is balanced against (target 50%).

**How it plays:** Build any force from the 29 universal unit types below, then pick **2 Contracts** before each battle. It wins through list-building and generalist play, never through a synergy engine.

<!--UNITS:21-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Wasteland Warboss | C2 Leader (Warlord) | 1 | 6" · 2+ · 3+ · 3+ · 5 · 1 · WARD 5+ | Heavy pistol, Relic blade | Paid in Full | **80** |
| Hired Duelist | C1 Leader (Champion) | 1 | 6" · 3+ · 3+ · 4+ · 4 · 1 | Heavy pistol, Relic blade | Sword for Hire | **65** |
| Field Medic | C1 Leader (Support) | 1 | 6" · 3+ · 3+ · 4+ · 3 · 1 | Pistol, Combat blade | Patch Up | **50** |
| Bounty Hunter | C1 Leader (Specialist) | 1 | 6" · 3+ · 3+ · 4+ · 3 · 1 | Sniper rifle, Power weapon | Wanted Poster | **60** |
| Conscript Rabble | C1 Trooper | 5–10 | 6" · 5+ · 4+ · 5+ · 1 · 2 | Service rifle, Bayonet / CCW |  | **55** (+7/m) |
| Line Mercenaries | C1 Trooper | 5–10 | 6" · 4+ · 4+ · 4+ · 1 · 2 | Battle rifle, Combat blade |  | **75** (+11/m) |
| Veteran Free-Blades | C1 Trooper / Elite | 5–10 | 6" · 3+ · 3+ · 3+ · 2 · 2 | Heavy rifle, Chain-blade |  | **135** (+20/m) |
| Shock Troopers | C1 Trooper | 5–10 | 7" · 3+ · 4+ · 4+ · 1 · 1 | Pistol, Chain-blade |  | **65** (+12/m) |
| Feral Pack | C1 Trooper | 5–10 | 7" · 4+ · 6+ · 6+ · 1 · 1 | Claws & teeth |  | **40** (+9/m) |
| Pathfinders | C1 Trooper (specialist) | 3–5 | 7" · 4+ · 3+ · 5+ · 1 · 1 | Carbine, Combat blade |  | **40** (+10/m) |
| Long-Rifles | C1 Trooper (specialist) | 2–3 | 6" · 5+ · 3+ · 5+ · 1 · 1 | Sniper rifle, Combat blade |  | **40** (+10/m) |
| Jump-Raiders | C1 Elite (fast) | 3–5 | 10" · 3+ · 4+ · 4+ · 2 · 1 | Heavy pistol, Power weapon |  | **60** (+21/m) |
| Heavy Exo-Suits | C2 Elite | 3–5 | 5" · 3+ · 3+ · 3+ · 4 · 1 · WARD 4+ | Rotary cannon, Great weapon / fist |  | **165** (+42/m) |
| Weapon Crew | C2 Trooper (support) | 2–3 | 5" · 5+ · 4+ · 4+ · 2 · 1 | Autocannon, Bayonet / CCW |  | **50** (+14/m) |
| Brute Mercenaries | C2 Elite (brute) | 3–5 | 6" · 3+ · 5+ · 4+ · 4 · 1 | Power maul |  | **90** (+25/m) |
| Outriders | C2 Elite (fast) | 3–5 | 12" · 3+ · 4+ · 4+ · 3 · 1 | Carbine, Cavalry lance |  | **75** (+29/m) |
| Salvaged Walker | C3 Brute | 1 | 6" · 3+ · 3+ · 3+ · 9 · 3 | Autocannon, Crusher fists |  | **95** |
| Tamed Beast | C3 Brute | 1 | 8" · 3+ · 6+ · 4+ · 8 · 3 | Monster talons |  | **70** |
| Scavenged Battle-Tank | C4 Behemoth | 1 | 10" · 5+ · 4+ · 3+ · 16 · 3 | Battle cannon, Las-lance, Treads / hull ram |  | **150** |
| Armoured Hauler | C4 Behemoth (transport) | 1 | 10" · 5+ · 4+ · 3+ · 12 · 2 | Heavy stubber, Treads / hull ram |  | **110** |
<!--/UNITS:21-->

<!--DETACH:21-->
**Core rule — Mercenary Contracts (pick 2 of 5):** Bounty Hunters: mark 2 enemy units; re-roll Hit and Wound rolls of 1 against them; +1 CP when one is destroyed · Guerrilla Infiltrators: 2 units gain [INFILTRATORS] and [SCOUTS 6″]; your units count as in Cover against attacks from more than 15″ · Shock & Awe: melee weapons gain [CRASHING], ranged weapons gain [ASSAULT] · Scavenged Grit: UNYIELDING 6+; Class 4–5 units heal 1 MIGHT at the End of Round · Master Tacticians: +1 CP in the Command Phase of Rounds 1 and 3. Any universal archetype (catalogue/unit_archetypes.json) is a legal datasheet at its catalogue price.

**Gamble — Objective Wager** *(risk: objective)*: Before deployment, secretly note one no-man's-land objective. Reveal at the end of Round 4: if you control it, +3 VP; if your opponent does, they score +2 VP.

**D1. Free Company** — *Balanced mercenaries: take the contracts that fit the mission.*
- *Rule:* Professional Soldiers: sign a third contract (3 of 5).
- *Enhancement:* **Veteran's Contract** (+15 pts, Wasteland Warboss) — The attached unit has UNYIELDING 6+.
- *Enhancement:* **Hazard Pay** (+10 pts, Veteran Free-Blades) — Re-roll Hit rolls of 1.
- *Stratagem:* **Renegotiate** (1 CP) — Command Phase, once per battle: Swap one contract for another.
- *Stratagem:* **Covering Fire** (1 CP) — A friendly unit within 6″ is charged: This unit makes a ranged Retaliation Strike against the charger.
- *Stratagem:* **Pay the Bonus** (1 CP) — A unit destroys an enemy unit: It may make a 3″ move.

**D2. Outcast Scavengers** — *Salvage crews that strip wrecks and objectives.*
- *Rule:* Salvage: when a Class 3–5 unit (either side) is destroyed, place a Salvage marker; a unit that ends a move on it gains +1 PEN on one weapon for the rest of the battle (remove the marker).
- *Enhancement:* **Scrap-Plate** (+10 pts, Line Mercenaries) — +1 ARM (to 3+ cap) against PEN 0 and −1.
- *Enhancement:* **Jury-Rigged Engine** (+10 pts, Armoured Hauler) — +2″ MOV.
- *Stratagem:* **Strip It Bare** (1 CP) — A unit ends on a Salvage marker: Also heal D3 MIGHT.
- *Stratagem:* **Makeshift Barricade** (1 CP) — A unit did not Move: It claims Cover until the End of Round.
- *Stratagem:* **Scav-Rush** (1 CP) — A unit moves toward a Salvage marker: +2″ MOV.

**D3. Monster Hunters** — *Specialists who bring down big things.*
- *Rule:* Big Game: re-roll Wound rolls of 1 against Class 3–5 units; Fell the Colossus Tactical card scores +1 VP.
- *Enhancement:* **Harpoon-Gun** (+10 pts, Bounty Hunter) — +1 PEN with ranged weapons; [HARPOON].
- *Enhancement:* **Monster-Slayer Charm** (+10 pts, Hired Duelist) — +1 Damage on a round he charged.
- *Stratagem:* **Bait the Beast** (1 CP) — An enemy Class 3–5 unit declares a Charge: The target may make a 3″ move first.
- *Stratagem:* **Hamstring** (1 CP) — A Class 3–5 enemy is wounded: It suffers −2″ MOV until the End of Round.
- *Stratagem:* **Trophy** (1 CP) — A Class 3–5 enemy is destroyed: Gain 1 CP.

<!--/DETACH:21-->

**Detachments = Contract packages** (choose 1 package, then 2 contracts from it, or the full menu with the *Free Company* package):
- **D1. Free Company** (beginner): pick any 2 of the 6 Contracts (Forward Infiltrators · Hardened Plates · High-Velocity Loads · Adrenaline Stims · Relentless Aggression · Targeting Arrays). *Stratagems:* Renegotiation (1 CP, swap one contract at the start of a round) · Hired Steel (1 CP, one unit re-rolls Hit 1s) · Cut Your Losses (1 CP, a Broken unit clears Broken).
- **D2. Beast-Trappers:** Class 3–4 beasts get +1 Attack, and Contracts are limited to Adrenaline Stims + Relentless Aggression. *Enhancement:* Trapper's Goad (beasts within 6″ ignore Suppression). *Stratagems:* Unleash (1 CP, a beast charges after a Move) · Feeding Time (1 CP, +1 Damage vs Broken units) · Tranquilizer Net (1 CP, an enemy beast gets −2″ Move).
- **D3. Gun-for-Hire:** infantry gunlines; Contracts limited to High-Velocity Loads + Targeting Arrays. *Enhancement:* Mercenary Scope (the attached unit ignores Cover). *Stratagems:* Professional Volley (1 CP, re-roll Wound 1s) · Paid in Advance (0 CP, once per battle +1 CP) · Fall Back to the Ship (1 CP, a unit Moves 6″ after shooting).

---

## 22. The Radiant Concordat 🟡 — MARKING · ★★★★
*Proxies: railgun empire battlesuits, Kroot (as priests), Ogor Mawtribes (Gore-Brutes), any "porcelain sci-fi" kit.*

**Learned from**
- ✅ **10th-edition railgun empire "For the Greater Good"** (one Observer guides one shooter): much cleaner than 9th's markerlight token piles, so one Blood-Mark per action.
- ✅ **Ogor bodyguards.**
- ⛔ **Long-range shooting with no counterplay:** the porcelain caste is helpless in melee, and the marks need Priests alive with line of sight.

**How it plays:**
- Mark, then delete. Priests and Pathfinders paint the target; rail weapons gain +1 to Hit and ignore cover against it.
- Marked kills feed Offerings for bigger shots.
- Gore-Brutes are the only melee and the bodyguards. Lose them and anything that reaches your gunline wins.

**Stat DNA:** MOV ▲ · MS ▼▼ (Ogres ▲) · RS ▲ · ARM ▲ · MIGHT ● · CTRL ● · Density 14–20.

<!--UNITS:22-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Concordat Strategos | C2 Leader (Warlord) | 1 | 7" · 4+ · 2+ · 3+ · 5 · 1 · WARD 5+ | Ion rifle, Seeker missiles, Bayonet / CCW | Coordinated Strike; Patient Hunter | **80** |
| Blood-Lotus Caste Prior | C1 Leader (Support) | 1 | 7" · 5+ · 2+ · 3+ · 3 · 1 | Lotus-pistol, Sacrificial knife | Offering Rite; Lotus Sacrament | **75** |
| Gore-Brute Chieftain | C2 Leader (Champion) | 1 | 7" · 4+ · 2+ · 4+ · 7 · 1 · WARD 5+ | Hand-cannon, Gore-cleaver | Gut-Roar; Bulwark Captain | **100** |
| Lotus Pathfinder-Priest | C1 Leader (Specialist) | 1 | 7" · 5+ · 2+ · 3+ · 3 · 1 | Pulse carbine, Combat blade | Free Spot | **65** |
| Porcelain Strike-Infantry | C1 Trooper | 5–10 | 7" · 6+ · 3+ · 3+ · 1 · 2 | Pulse rail-rifle, Bayonet / CCW | Volley Discipline | **105** (+13/m) |
| Porcelain Breacher Team | C1 Trooper | 5–10 | 7" · 6+ · 3+ · 3+ · 1 · 2 | Pulse blaster, Bayonet / CCW | Point-Blank | **110** (+15/m) |
| Lotus Pathfinders | C1 Trooper (specialist) | 3–5 | 8" · 6+ · 2+ · 4+ · 1 · 1 | Pulse carbine, Combat blade | Spotter Uplink | **55** (+10/m) |
| Crimson Stealth-Suits | C2 Elite (ranged) | 3 | 9" · 6+ · 2+ · 3+ · 4 · 1 | Burst cannon, Bayonet / CCW | Stealth Fields; Silent Spotters | **100** |
| Vanguard Rail-Suits | C2 Elite (ranged) | 3 | 9" · 6+ · 2+ · 3+ · 4 · 1 | Ion rifle, Seeker missiles, Bayonet / CCW | Jump-Jets | **140** |
| Siege Rail-Suits | C2 Elite | 3–5 | 5" · 5+ · 2+ · 3+ · 4 · 1 | Heavy rail-rifle, Seeker missiles, Bayonet / CCW | Locked Stance | **160** (+26/m) |
| Gilded Gore-Brutes | C2 Elite (brute) | 3–5 | 6" · 5+ · 4+ · 3+ · 5 · 1 | Gut-cannons, Gore-cleaver | Bulwark; Combat-Nectar | **145** (+42/m) |
| Gore-Ogre Bulwark Guard | C2 Elite | 3–5 | 7" · 3+ · 2+ · 4+ · 5 · 2 | Hand-cannons, Iron-gut halberds | Bulwark; Wall of Gut | **145** (+43/m) |
| Lotus Drone Flight | C1 Trooper | 4–8 | 10" · 6+ · 4+ · 5+ · 1 · 1 | Drone pulse-guns, Bayonet / CCW | Shield-Drones | **55** (+9/m) |
| Lotus Marksmen | C1 Trooper (specialist) | 2–3 | 7" · 6+ · 2+ · 4+ · 1 · 1 | Long rail-rifle, Combat blade | Self-Spotting | **45** (+11/m) |
| Bulwark Rail-Mech | C3 Brute | 1 | 10" · 5+ · 2+ · 3+ · 9 · 3 · WARD 5+ | Heavy rail-cannon, Burst cannon, Battlesuit fists | Nova Charge | **115** |
| Lotus Sky-Gunship | C4 Behemoth | 1 | 12" · 6+ · 3+ · 3+ · 16 · 3 | Rail-cannon, Burst cannon, Treads / hull ram | Targeting Array | **165** |
| Lotus Transport Skimmer | C4 Behemoth (transport) | 1 | 12" · 6+ · 3+ · 3+ · 12 · 2 | Burst cannon, Treads / hull ram | Drop-Off | **115** |
| Gore-Mammoth Rider | C4 Behemoth | 1 | 10" · 5+ · 5+ · 3+ · 14 · 3 | Chain-harpoon, Monster talons, Colossal jaws | Bulwark Beast; Thick Hide | **135** |
| Lotus Rail-Battery | C4 Behemoth (support) | 1 | 9" · 6+ · 3+ · 3+ · 12 · 1 | Seeker-missile rack, Burst cannon | Guided Fire | **135** |
| Lotus Colossus-Suit | C5 Behemoth | 1 | 10" · 5+ · 2+ · 3+ · 22 · 6 · WARD 5+ | Pulse-driver cannon, Seeker missiles, Titan stomp | Command Uplink | **365** |
<!--/UNITS:22-->

**Detachments**
<!--DETACH:22-->
**Core rule — Crimson-Lotus Spotters · Gilded Bulwark:** Spot: an unengaged Concordat unit may use 1 Action to Spot a visible enemy unit; the next friendly unit to Shoot that enemy this round gets +1 to Hit and [IGNORES COVER] (one Spot per enemy unit per round). Bulwark: once per round, when an enemy unit declares a Charge against a Concordat Class 1–2 unit within 3″ of Gore-Brutes or Gore-Ogres, those ogres may make a 3″ move to engage the charger before the Charge roll.

**Gamble — Blood-Offering** *(risk: durability (friendly))*: When a unit Spots within 6″ of a Blood-Lotus Prior, the Prior may inflict D3 Fatal Wounds on a friendly ogre unit within 3″: the spotted attack also gains [SHREDDING WOUNDS].

**D1. Patient Hunter** — *Hold back, spot, and break them late.*
- *Rule:* Patient Hunter: in Rounds 3–4, ranged weapons gain [ONSLAUGHT 1] against spotted units. Units that did not Move get +1 ARM (to 3+ cap) against ranged attacks.
- *Enhancement:* **Hunter's Patience** (+10 pts, Concordat Strategos) — The attached unit's ranged weapons gain [IMPALING HITS].
- *Enhancement:* **Recon Uplink** (+10 pts, Lotus Pathfinder-Priest) — Free Spot twice per round.
- *Stratagem:* **Ambush Volley** (1 CP) — A unit that did not Move Shoots: Re-roll Wound rolls of 1.
- *Stratagem:* **Spring the Trap** (1 CP) — An enemy unit ends a move within 12″ of two Concordat units: One of them Shoots it now (once per round).
- *Stratagem:* **Fall Back to Cover** (1 CP) — A unit is charged: It may make a 3″ move before the Charge roll.

**D2. Killing Blow** — *Go early: rapid advance and close-range volleys.*
- *Rule:* Killing Blow: in Rounds 1–2, ranged weapons gain [ASSAULT] and +1 PEN within 12″.
- *Enhancement:* **Strike-Leader's Blade** (+10 pts, Concordat Strategos) — +2″ MOV.
- *Enhancement:* **Breacher Shield-Drone** (+10 pts, Porcelain Breacher Team) — +1 ARM (to 3+ cap).
- *Stratagem:* **Advance Volley** (1 CP) — A unit Moves and Shoots: Ignore the [HEAVY] penalty.
- *Stratagem:* **Close the Net** (1 CP) — Two units Shoot the same target: The second gets +1 to Wound.
- *Stratagem:* **Jump-Jet Strike** (1 CP) — A battlesuit unit Shoots: It may make a 5″ move afterward.

**D3. Gore-Brute Retinue** — *Ogres in front, porcelain behind, blood-priests feeding both.*
- *Rule:* Gilded Bulwark: Gore units within 3″ of a Porcelain unit get +1 Attack in melee; Porcelain units within 3″ of a Gore unit are [STEALTH].
- *Enhancement:* **Gut-Plate of the Retinue** (+20 pts, Gore-Brute Chieftain) — UNYIELDING 5+.
- *Enhancement:* **Nectar-Censer** (+20 pts, Blood-Lotus Caste Prior) — Friendly ogre units within 6″ get +1 Attack on a round they charged.
- *Stratagem:* **Meat-Shield** (1 CP) — A Porcelain unit within 3″ of ogres is targeted: The ogres take the attack instead.
- *Stratagem:* **Gore-Charge** (1 CP) — An ogre unit declares a Charge: +2″ to the roll and Crushing Impact for 0 CP.
- *Stratagem:* **Blood-Tithe** (1 CP) — An ogre unit suffers a Blood-Offering: It heals D3 MIGHT at the End of Round.

<!--/DETACH:22-->

---

## 23. The Apex Bio-Swarm 🟢 — ADAPTATION · ★★★
*Proxies: bio-swarm armies, Xenomorph kits, Zerg-likes, any bug ranges.*

**Learned from**
- ✅ **bio-swarm armies:** Synapse (the swarm holds together near its brain creatures) and Hyper-Adaptations. 10th picks them *before* the game; we pick **every round** to counter the opponent.
- ⛔ **Synapse "aura soup":** Synapse only grants immunity to Suppression.
- ⛔ **Pre-game choices you can't adapt:** adaptations are reactive.

**How it plays:**
- Endless gaunts and brutal monsters.
- Each Command Phase you read the board and choose Scythes (+PEN), Chitin (+ARM) or Adrenal (+Move).
- Kill the Synapse creatures and the swarm gets Pinned in a cascade.

**Stat DNA:** MOV ▲ · MS ● · RS ▼ · ARM ▼ (warriors ●) · MIGHT ● (monsters ▲▲) · CTRL ● · Density 28–40.

<!--UNITS:23-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Chitter-Swarm | C1 Trooper | 10–15 | 6" · 4+ · 4+ · 5+ · 1 · 2 | Flesh-borer, Chitin claws | Endless Swarm | **100** (+8/m) |
| Slasher-Brood | C1 Trooper | 10–15 | 9" · 4+ · 6+ · 5+ · 1 · 2 | Scything talons |  | **90** (+10/m) |
| Bio-Warrior Brood | C2 Elite (synapse) | 3–5 | 6" · 3+ · 4+ · 4+ · 3 · 2 | Devourer, Rending talons | Synapse Node | **110** (+27/m) |
| Tunnel-Wyrm Brood | C2 Elite (ambush) | 3–5 | 8" · 3+ · 6+ · 4+ · 3 · 1 | Burrower claws |  | **90** (+27/m) |
| Shade-Stalker | C2 Elite (hunter) | 1 | 8" · 2+ · 4+ · 4+ · 5 · 1 | Grasping talons |  | **65** |
| Psy-Node Brood | C2 Elite (synapse) | 3 | 5" · 5+ · 3+ · 5+ · 3 · 1 · WARD 4+ | Warp lance | Synapse Node | **125** |
| Carno-Brute | C3 Brute | 1–2 | 7" · 3+ · 4+ · 3+ · 9 · 3 | Monster talons, Bio-plasma |  | **110** (+93/m) |
| Hive-Sovereign Synapse-Alpha | C4 Leader (Warlord) | 1 | 8" · 2+ · 3+ · 3+ · 14 · 3 · WARD 5+ | Monster talons, Venom cannon | Will of the Hive; Synapse Node | **205** |
| Titanic Bio-Horror | C5 Behemoth | 1 | 9" · 2+ · 3+ · 3+ · 26 · 6 · UNY 6+ | Titan stomp, Colossal jaws, Acid-mortar |  | **380** |
| Brood-Prime | C2 Leader (Champion) | 1 | 6" · 2+ · 4+ · 4+ · 5 · 2 | Prime talons | Alpha Instinct | **75** |
| Brood-Mother | C2 Leader (Spawner) | 1 | 5" · 4+ · 4+ · 4+ · 5 · 2 | Spawn-whips | Spawn the Swarm | **65** |
| Chitin-Guard Brutes | C2 Elite (bodyguard) | 3–5 | 6" · 3+ · 6+ · 3+ · 4 · 1 | Bone-crusher claws | Living Shield | **155** (+44/m) |
| Spore-Mortar Brood | C2 Trooper (support) | 2–3 | 5" · 5+ · 4+ · 4+ · 3 · 1 | Spore mortar, Bayonet / CCW |  | **65** (+19/m) |
| Skyshrike Brood | C1 Trooper (winged) | 5–10 | 10" · 4+ · 4+ · 6+ · 1 · 1 | Flesh-dart, Claws & teeth |  | **60** (+10/m) |
| Rend-Lurkers | C1 Elite (skirmish) | 5–10 | 8" · 3+ · 6+ · 5+ · 1 · 1 | Rending claws |  | **60** (+13/m) |
| Bone-Runner Pack | C2 Elite (fast) | 3–5 | 12" · 3+ · 6+ · 4+ · 3 · 1 | Runner talons |  | **90** (+28/m) |
| Horned Rampager | C3 Brute | 1–2 | 8" · 3+ · 6+ · 3+ · 9 · 3 | Monster talons | Battering Horns | **130** (+92/m) |
| Siege-Maw Monstrosity | C4 Behemoth | 1 | 7" · 4+ · 3+ · 3+ · 15 · 3 | Acid siege-maw, Monster talons |  | **180** |
| Spore-Pod Carrier | C4 Behemoth (transport) | 1 | 8" · 5+ · 5+ · 4+ · 12 · 2 | Spore-spines, Claws & teeth |  | **110** |
| Crusher-Queen Behemoth | C4 Behemoth | 1 | 8" · 2+ · 6+ · 3+ · 16 · 3 | Monster talons, Colossal jaws |  | **205** |
| Devourer Prime | C2 Leader (Epic Champion) | 1 | 8" · 2+ · 4+ · 4+ · 6 · 1 · WARD 5+ | Bone-scythes, Flesh-hooks | Lightning Predator; Alpha Instinct | **110** |
| Winged Hive-Sovereign | C4 Leader (Warlord) | 1 | 12" · 2+ · 3+ · 4+ · 12 · 3 · WARD 5+ | Bio-cannon, Monstrous scythes | Will of the Swarm; Synaptic Overlord | **195** |
| Neuro-Node Lord | C1 Leader (Synapse) | 1 | 6" · 3+ · 4+ · 4+ · 4 · 1 | Spine-fist, Bone-sword | Neural Shield; Relay Node | **75** |
| Acid-Spitter Brood | C1 Trooper | 5–10 | 6" · 4+ · 4+ · 5+ · 1 · 2 | Acid-spitter, Chitin claws | Corrosive | **70** (+10/m) |
| Ripper-Maw Swarm | C1 Trooper | 10–15 | 6" · 5+ · 6+ · 6+ · 1 · 1 | Ripper-maws | Living Carpet | **75** (+6/m) |
| Pyro-Spore Swarm | C1 Trooper | 3–6 | 6" · 6+ · 6+ · 7+ · 1 · 0 | Drifting tendrils | Floating Mines | **30** (+4/m) |
| Venom-Lash Brood | C2 Elite (brute) | 3–5 | 7" · 3+ · 5+ · 4+ · 4 · 1 | Venom-lashes | Entangle | **130** (+32/m) |
| Neuro-Shrieker | C3 Brute | 1 | 6" · 5+ · 3+ · 4+ · 7 · 1 · WARD 5+ | Psychic shriek, Claws & teeth | Shriek | **80** |
| Bio-Artillery Beast | C4 Behemoth (support) | 1 | 7" · 5+ · 4+ · 4+ · 13 · 1 | Bio-plasma mortar, Monster talons | Living Ammunition | **140** |
| Deep-Burrow Worm | C4 Behemoth (transport) | 1 | 9" · 4+ · 6+ · 4+ · 12 · 1 | Grinding maw | Erupt | **140** |
<!--/UNITS:23-->

**Detachments**
<!--DETACH:23-->
**Core rule — Synapse & Evolution:** Command Phase: choose 1 Bio-Adaptation for the whole army this round: Scythes (+1 PEN in melee) · Chitin (+1 ARM to the 3+ cap) · Adrenal (+2″ Move). Units within 9″ of a [SYNAPSE] model ignore Suppression.

**Gamble — Metabolic Overdrive** *(risk: durability (dice))*: When a unit activates: +2″ MOV and +1 Attack in melee this activation. At the End of Round, roll a D6: on 1–2 it suffers D3 Fatal Wounds (models die of exhaustion).

**D1. Invasion Swarm** — *Endless gaunts: drown objectives in bodies, recycle them through Synapse.*
- *Rule:* Hunger of the Hive: Trooper units within 9″ of Synapse get +1 Attack in melee if they outnumber their target.
- *Enhancement:* **Adaptive Neural Lattice** (+10 pts, Hive-Sovereign Synapse-Alpha) — Synapse range is 12″.
- *Enhancement:* **Bio-Spawning Sac** (+15 pts, Bio-Warrior Brood) — Endless Swarm returns 2 Chitter-swarm models per round near this unit.
- *Stratagem:* **Overrun** (1 CP) — A Trooper unit destroys a unit: Consolidate 6″ instead of 3″.
- *Stratagem:* **Swarm Wave** (2 CP) — A Trooper unit is destroyed: Set up a new 10-model Chitter-Swarm at your board edge (once per battle).
- *Stratagem:* **Chitin Wall** (1 CP) — A Trooper unit is shot: +1 ARM for that attack (stacks with the Chitin adaptation to the cap).

**D2. Synaptic Vanguard** — *Ambush hunters: Shade-Stalkers and Tunnel-Wyrms strike leaders from hiding.*
- *Rule:* Lurking Death: [VANGUARD STRIKE] and [INFILTRATORS] units get +1 to Wound on the activation they arrive or first attack.
- *Enhancement:* **Chameleonic Mutation** (+10 pts, Shade-Stalker) — Ranged attacks against the bearer get −1 to Hit.
- *Enhancement:* **Pheromone Trail** (+10 pts, Shade-Stalker) — Vanguard Strike units may arrive within 6″ of the bearer (still >8″ from enemies).
- *Stratagem:* **Ambush Predators** (1 CP) — A unit arrives from reserves: It may Charge this activation.
- *Stratagem:* **Feeding Frenzy** (1 CP) — A unit attacks a Leader: Its attacks gain [PRECISION].
- *Stratagem:* **Vanish into Burrows** (2 CP) — End of the round: One unit not engaged returns to Strategic Reserves.

**D3. Bio-Titan Assault** — *Monster mash: Tyrant, Carno-Brutes and a Bio-Horror walk through the enemy.*
- *Rule:* Primal Evolution: Class 3+ units benefit from the round's Bio-Adaptation twice over (Scythes +2 PEN · Chitin +1 ARM and −1 Damage · Adrenal +4″ Move).
- *Enhancement:* **Monstrous Musculature** (+15 pts, Carno-Brute) — +2 melee Attacks.
- *Enhancement:* **Regenerating Chitin** (+20 pts, Hive-Sovereign Synapse-Alpha) — The bearer has [UNYIELDING 6+].
- *Stratagem:* **Rapid Regrowth** (1 CP) — A Brute/Behemoth suffers damage: Ignore up to 3 MIGHT from that attack (mitigation, not healing).
- *Stratagem:* **Rampaging Beast** (1 CP) — A Class 3+ unit charges: Crushing Impact with no self-damage.
- *Stratagem:* **Bio-Acid Spray** (1 CP) — A monster is engaged: Engaged enemies suffer D3 Fatal Wounds.

<!--/DETACH:23-->

---

## 24. The Diesel-Skull War-Horde 🟡 — VELOCITY · ★★
*Proxies: greenskins, Speed Freeks, armoured greenskins/Kruleboyz, Gorkamorka, Mad Max kits.*

**Learned from**
- ✅ **greenskins' once-per-game Rampage** (advance and charge, more attacks): the most memorable "army moment" in sci-fi wargames.
- ✅ **Speed Freeks:** vehicles and bikes. Mob rule.
- ⛔ **Too much randomness** (old greenskins shooting): bad aim stays, but **velocity bonuses are deterministic**. Move your full MOV and you get [HAILFIRE] and +1 Attack.

**How it plays:**
- Loud and fast; never stand still.
- Every unit wants to move its full distance each activation.
- One RAMPAGE! round where everything hits at once.
- Scrap-Imp screens are the cheapest chaff in the game.

**Stat DNA:** MOV ● (vehicles ▲▲) · MS ▲ · RS ▼▼ · ARM ▼ · MIGHT ▲ · CTRL ▲ · Density 26–36.

<!--UNITS:24-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| War-Boss Speed-King | C2 Leader (Warlord) | 1 | 6" · 2+ · 4+ · 4+ · 7 · 2 · WARD 5+ | Kustom shoota, Power-klaw | Call the Scrap-Fury; Biggest an' Meanest | **115** |
| Iron-Jaw Brute Boss | C2 Leader (Champion) | 1 | 6" · 2+ · 4+ · 3+ · 7 · 2 · WARD 5+ | Heavy pistol, Smash-hammer | Too Tough; Head-Butt Discipline | **115** |
| Scrap-Surgeon | C1 Leader (Support) | 1 | 6" · 3+ · 4+ · 5+ · 4 · 2 | Slugger, Saw-blades | Bolt It Back On; Kustom Job | **70** |
| Skull-Shaman | C1 Leader (Mystic) | 1 | 6" · 3+ · 4+ · 5+ · 4 · 2 | Head-bang zap, Power weapon | Rampage Energy | **60** |
| Scrap-Gunner Mob | C1 Trooper | 10–15 | 7" · 3+ · 5+ · 5+ · 1 · 2 | Slugger, Choppa | Strength in Numbers | **125** (+11/m) |
| Dakka-Gun Mob | C1 Trooper | 10–15 | 6" · 4+ · 5+ · 5+ · 1 · 3 | Shoota, Choppa | More Dakka | **115** (+12/m) |
| Scrap-Imps | C1 Trooper | 10 | 6" · 5+ · 5+ · 7+ · 1 · 3 | Scrap-blasta, Bayonet / CCW | Imp Shields | **75** |
| Iron-Hide Krushas | C2 Elite | 3–5 | 5" · 3+ · 4+ · 3+ · 4 · 2 | Kustom rattler, Power-klaw | Scrap-Plate | **150** (+40/m) |
| Big-Brute Bullies | C2 Elite (brute) | 3–5 | 6" · 3+ · 6+ · 5+ · 4 · 2 | Power-klaw | Bully Charge | **105** (+25/m) |
| War-Biker Speed-Maniacs | C2 Elite (fast) | 3–5 | 14" · 3+ · 5+ · 4+ · 3 · 2 | Dakka-guns, Spiked wheels | Speed Freaks | **85** (+27/m) |
| Rocket-Scrap Crew | C2 Trooper (support) | 2–3 | 5" · 5+ · 5+ · 5+ · 2 · 2 | Rocket launcha, Bayonet / CCW | Lucky Rockets | **50** (+16/m) |
| Sneaky Scrap-Commandos | C1 Trooper (specialist) | 3–5 | 7" · 4+ · 4+ · 6+ · 1 · 2 | Slugger, Choppa | Ambush | **55** (+11/m) |
| Jump-Rocket Stormers | C1 Elite (fast) | 3–5 | 10" · 3+ · 5+ · 5+ · 1 · 2 | Slugger, Choppa | Uncontrolled Landing | **55** (+13/m) |
| Scrap-Walker Brute | C3 Brute | 1 | 6" · 3+ · 4+ · 4+ · 9 · 4 | Big shoota, Crusher-klaws | Unhinged | **95** |
| War-Buggy | C3 Brute | 1 | 14" · 3+ · 4+ · 4+ · 6 · 4 | Twin big shoota, Spiked ram | Ramming Speed | **75** |
| Tusk-Beast Hauler | C4 Behemoth | 1 | 9" · 3+ · 6+ · 5+ · 14 · 4 | Howdah shootas, Monster talons, Colossal jaws | Stampede | **145** |
| War-Rig Scrap-Hauler | C4 Behemoth (transport) | 1 | 10" · 5+ · 5+ · 4+ · 12 · 3 | Big shootas, Spiked ram | Ramshackle | **110** |
| Gun-Wagon | C4 Behemoth | 1 | 10" · 5+ · 5+ · 4+ · 16 · 4 | Kannon, Big shootas, Spiked ram | Ramming Speed | **120** |
| Scrap-Lobba Battery | C4 Behemoth (support) | 1 | 8" · 6+ · 5+ · 4+ · 12 · 2 | Scrap-lobbas, Big shoota, Spiked ram | Imp Spotters | **110** |
| Scrap-Titan Colossus | C5 Behemoth | 1 | 10" · 3+ · 4+ · 4+ · 24 · 7 | Supa-kannon, Big shootas, Titan stomp | Wreck Run | **350** |
<!--/UNITS:24-->

**Detachments**
<!--DETACH:24-->
**Core rule — Dakka & Scrap-Fury:** Dakka: Diesel-Skull ranged weapons have [ASSAULT]; unmodified Hit rolls of 6 with them are critical and score 1 extra hit ([ONSLAUGHT 1]). Scrap-Fury (once per battle): declare in the Command Phase — until the End of Round, Diesel-Skull units get +1 Attack in melee and +2″ to Charge rolls.

**Gamble — Overcrank the Engine** *(risk: durability (dice))*: When a Class 2–5 vehicle or bike unit activates, roll a D6: 1 the engine seizes (D3 Fatal Wounds, no Move this activation) · 2–3 +2″ MOV · 4–5 +4″ MOV · 6 +4″ MOV and +1 Attack in melee.

**D1. Speed-Cult** — *Bikes, buggies and wagons: everything fast, everything ramming.*
- *Rule:* Ramming Speed: Class 2–5 vehicles and bikes get +2″ MOV and trigger Crushing Impact for 0 CP on the charge.
- *Enhancement:* **Red-Hot Exhaust** (+10 pts, War-Boss Speed-King) — +2″ MOV.
- *Enhancement:* **Nitro-Tank** (+10 pts, War-Buggy) — +2″ MOV.
- *Stratagem:* **Full Throttle** (1 CP) — A vehicle or bike unit activates: Overcrank without rolling a 1 (re-roll a result of 1).
- *Stratagem:* **Wreck Run** (1 CP) — A vehicle is destroyed: Before removal it moves 6″ and explodes: D3 Fatal Wounds on a 4+ to every unit within 6″.
- *Stratagem:* **Drive-By** (1 CP) — A vehicle or bike unit Shoots: It may make a 3″ move after shooting.

**D2. Bully Mobs** — *Big mobs and brutes in a single shouting wave.*
- *Rule:* Mob Rule: Class 1 units with 10+ models get +1 to Hit in melee and cannot be Rattled.
- *Enhancement:* **Boss-Pole** (+15 pts, Iron-Jaw Brute Boss) — Friendly Class 1 units within 6″ get +1 to Hit in melee.
- *Enhancement:* **Big Choppa** (+20 pts, Scrap-Gunner Mob) — +1 PEN in melee.
- *Stratagem:* **Get In There!** (1 CP) — A Class 1 unit declares a Charge: Re-roll the Charge roll.
- *Stratagem:* **Stompy Feet** (1 CP) — A unit is charged: Its Retaliation Strike gets +1 Attack.
- *Stratagem:* **More Lads** (2 CP) — Command Phase, once per battle: Return D6 slain models to a Class 1 unit within 6″ of your table edge.

**D3. Tinker-Workshop** — *Scrap-walkers, artillery and surgeons bolting things on.*
- *Rule:* Kustom Jobs: at deployment, give up to 3 Class 2–5 units one upgrade each: +1 Attack on one weapon · +1 PEN on one weapon · UNYIELDING 6+.
- *Enhancement:* **Kustom Force-Field** (+15 pts, Scrap-Surgeon) — Friendly units within 6″ get +1 ARM (to 3+ cap) against ranged attacks.
- *Enhancement:* **Shokk-Barrel** (+15 pts, Scrap-Lobba Battery) — +1 Damage.
- *Stratagem:* **Bolt It On** (1 CP) — A Class 3–5 unit is damaged: Heal D3 MIGHT.
- *Stratagem:* **Overcharged Kannon** (1 CP) — A unit Shoots: +1 Damage; on a natural 1 to Hit it suffers 1 Fatal Wound.
- *Stratagem:* **Scrap-Shield** (1 CP) — A Class 3–5 unit is targeted: Incoming PEN −1.

<!--/DETACH:24-->

---

## 25. The Eclipse Shadow-Fiends 🟡 — INTANGIBILITY · ★★
*Proxies: ghost armies, Shadow daemons, C'tan shards, any ghost/spectre kit.*

**Learned from**
- ✅ **ghost armies's ethereal bodies** (fantasy wargames: rend didn't matter, so they were durable against elite weapons and fragile against volume). That becomes our **[WARD 4+]**: the same counterplay, and an easy rule.
- ✅ **Flying through walls.**
- ⛔ **Untargetable everything:** [UNSEEN] works only beyond 12″, CTRL is halved, and damage against armour is low.

**How it plays:**
- The only phantom army: drift through ruins, appear inside the enemy line, terrify.
- Strong against elite single-shot weapons.
- Weak against massed close-range fire and Fatal Wounds (which ignore ward).
- Weak at holding objectives.

**Stat DNA:** MOV ● + phasing · MS ● · RS ▼▼ · ARM ▼▼ (WARD 4+) · MIGHT ● · CTRL ▼▼ · Density 16–22.

<!--UNITS:25-->
| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |
| :-- | :-- | :-: | :-- | :-- | :-- | --: |
| Phantasm Lord on Spectral Steed | C3 Leader (Warlord) | 1 | 10" · 2+ · 6+ · 7+ · 7 · 1 · WARD 4+ | Reaper-lance, Spectral hooves | Lord of Dread; Umbral Command | **95** |
| Knight-Phantasm | C2 Leader (Champion) | 1 | 6" · 2+ · 5+ · 7+ · 4 · 0 · WARD 4+ | Sword of the Eclipse | Frightful Touch; Soul-Cleaver | **75** |
| Lantern-Warden | C1 Leader (Support) | 1 | 6" · 3+ · 5+ · 7+ · 3 · 0 · WARD 4+ | Soul-lantern, Soul-blade | Soul-Tethered Summons | **70** |
| Banshee Wailer-Queen | C1 Leader (Mystic) | 1 | 6" · 3+ · 5+ · 7+ · 3 · 0 · WARD 4+ | Keening wail, Soul-blade | Soul-Shriek | **70** |
| Void-Shades | C1 Trooper | 10–15 | 7" · 4+ · 6+ · 7+ · 1 · 0 · WARD 5+ | Spectral claws | Phase | **100** (+12/m) |
| Eclipse Reapers | C1 Trooper | 5–10 | 7" · 3+ · 6+ · 7+ · 1 · 0 · WARD 5+ | Grave-scythe | Reaping Charge | **60** (+14/m) |
| Wailing Spirit-Host | C2 Elite (brute) | 3–5 | 6" · 3+ · 6+ · 7+ · 4 · 0 · WARD 5+ | Spectral claws | Frightful Touch | **95** (+30/m) |
| Grave-Riders | C2 Elite (fast) | 3–5 | 12" · 3+ · 6+ · 7+ · 3 · 0 · WARD 4+ | Wraith-lance | Deathly Charge | **130** (+40/m) |
| Gloom-Blade Guard | C2 Elite | 3–5 | 6" · 2+ · 5+ · 7+ · 4 · 1 · WARD 4+ | Gloom-blade | Executioner's Edge | **175** (+32/m) |
| Banshee Choir | C1 Trooper (specialist) | 3–5 | 7" · 4+ · 5+ · 7+ · 1 · 0 · WARD 5+ | Wail, Spectral claws | Dirge | **55** (+13/m) |
| Shroud-Hounds | C1 Trooper | 5–10 | 10" · 4+ · 6+ · 7+ · 1 · 0 · WARD 5+ | Spectral claws | Hunt from the Dark | **60** (+13/m) |
| Grave-Arbalest Shades | C1 Trooper | 5–10 | 6" · 4+ · 6+ · 7+ · 1 · 1 · WARD 5+ | Spectral crossbow, Combat blade | Ghost-Bolts | **80** (+11/m) |
| Gheist-Flitters | C1 Elite (fast) | 3–5 | 10" · 3+ · 6+ · 7+ · 1 · 0 · WARD 5+ | Spectral claws | Flit | **50** (+14/m) |
| Soul-Lantern Bearers | C2 Trooper (support) | 2–3 | 5" · 5+ · 6+ · 7+ · 2 · 0 · WARD 5+ | Lantern-beam, Bayonet / CCW | Soul-Light | **70** (+12/m) |
| Haunted Armour Colossus | C3 Brute | 1 | 6" · 3+ · 5+ · 7+ · 8 · 2 · WARD 5+ | Possessed gauntlets | Bound Spirit | **105** |
| Shadow-Stalker Abomination | C3 Brute | 1 | 8" · 3+ · 6+ · 7+ · 7 · 2 · WARD 5+ | Spectral talons | Umbral Hunter | **100** |
| Shroud-Hearse | C4 Behemoth (transport) | 1 | 10" · 5+ · 6+ · 5+ · 11 · 1 · WARD 5+ | Spirit-wail, Phantom steeds | Deathly Procession | **125** |
| Soul-Reliquary Engine | C4 Behemoth (support) | 1 | 8" · 6+ · 6+ · 5+ · 11 · 0 · WARD 5+ | Soul-storm, Treads / hull ram | Reliquary Pulse | **110** |
| Eclipse Void-Leviathan | C4 Behemoth | 1 | 9" · 3+ · 6+ · 5+ · 13 · 2 · WARD 5+ | Spectral talons, Void-maw | Swallow Souls | **180** |
| Umbral Titan-Wraith | C5 Behemoth | 1 | 10" · 2+ · 6+ · 5+ · 20 · 5 · WARD 5+ | Titan stomp, Void-maw | Eclipse | **280** |
<!--/UNITS:25-->

**Detachments**
<!--DETACH:25-->
**Core rule — Ethereal Phase-Form · Wave of Terror:** Ethereal: Eclipse units have no ARM save; instead they have the WARD shown on their datasheet (5+ troops, 4+ elites/Leaders, 5+ for Class 4–5), which no PEN can worsen, and they are [STEALTH] against attacks from more than 12″. Wave of Terror: when an Eclipse unit ends a Charge, pick 1 engaged enemy unit: it gets −1 to Hit in melee until the End of Round.

**Gamble — Phase-Walk** *(risk: exposure)*: When a unit activates: it moves through models and terrain and gets +2″ to its Charge roll this activation, but it loses its WARD until it next activates.

**D1. Midnight Procession** — *Disappear and reappear: the umbra army.*
- *Rule:* Vanishing into the Umbra: at the End of Round, pick 1 unengaged Eclipse unit: remove it and set it up anywhere more than 8″ from all enemies.
- *Enhancement:* **Shroud of Midnight** (+15 pts, Phantasm Lord on Spectral Steed) — The attached unit is [STEALTH] at all ranges.
- *Enhancement:* **Void-Lantern** (+10 pts, Lantern-Warden) — Units set up by the Umbra within 6″ of him heal D3 MIGHT.
- *Stratagem:* **Fade from Sight** (1 CP) — A unit is targeted: It is [STEALTH] at all ranges for the attack.
- *Stratagem:* **Return from the Umbra** (1 CP) — A unit is set up by the Umbra: It may Charge in Round order as if it had moved.
- *Stratagem:* **Grasp of the Dead** (1 CP) — An enemy unit Falls Back from an Eclipse unit: It suffers D3 Fatal Wounds on a 4+.

**D2. Soul-Reapers** — *Scythes and blades: kill fast before the WARD fails.*
- *Rule:* Frightful Touch: Eclipse melee Hit rolls of 6 auto-wound ([IMPALING HITS]).
- *Enhancement:* **Harvester's Scythe** (+15 pts, Knight-Phantasm) — +1 Damage on a round he charged.
- *Enhancement:* **Reaper's Mark** (+30 pts, Eclipse Reapers) — Melee Hit rolls of 5+ auto-wound.
- *Stratagem:* **Reap** (1 CP) — A unit is selected to Fight: Its melee weapons gain [REAPING 1].
- *Stratagem:* **Terror Incarnate** (1 CP) — A unit ends a Charge: Wave of Terror applies to every engaged enemy unit.
- *Stratagem:* **Spectral Fury** (1 CP) — A unit is below Starting Strength: +1 Attack in melee until the End of Round.

**D3. Spectral Host** — *The dead keep coming: lanterns, choirs and endless shades.*
- *Rule:* Endless Dead: Soul-Tethered Summons can be used twice per round; Void-Shades return D3 slain models at the End of Round within 9″ of a Leader.
- *Enhancement:* **Lantern of Endless Night** (+10 pts, Lantern-Warden) — Summons range 12″.
- *Enhancement:* **Wailing Crown** (+20 pts, Banshee Wailer-Queen) — Friendly units within 6″ are [STEALTH] at all ranges.
- *Stratagem:* **Rise Again** (2 CP) — Command Phase, once per battle: Return a destroyed Class 1 unit at half strength within 6″ of a Leader.
- *Stratagem:* **Chill of the Grave** (1 CP) — An enemy unit within 6″ of a Leader activates: −1″ to its moves this activation.
- *Stratagem:* **Wail of the Host** (1 CP) — A unit is charged: The charging unit suffers −1 to Hit until the End of Round.

<!--/DETACH:25-->

---

## Appendix — Release roadmap

| Wave | Factions | Status |
| :-- | :-- | :-- |
| **Release (Wave 1)** | Auric · Golgotha · Cinder-Gorged · Apex · Starfire + Rift-Stalker toolkit | 🟢 full datasheets, simulator-balanced (44–54% faction win rates) |
| Wave 2 | Prometheus · Radiant Concordat · Skitter-Kin · Sanguine · Obsidian | 🟡 next: promote to full datasheets (abilities priced, sim-tested) |
| Wave 3 | Sun-Pyre · Aegis · Black-Bile · Velvet · Diesel-Skull | 🟡 |
| Wave 4 | Bathys · Mordant · Frost-Skaer · Moloch · Eclipse | 🟡 |
| Wave 5 | Dread-Fleet · Cabal · Sun-Scaled · Shadow-Clans | 🟡 (the expert factions ship last) |
