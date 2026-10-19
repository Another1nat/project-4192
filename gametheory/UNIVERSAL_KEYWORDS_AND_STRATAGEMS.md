# PROJECT CODEX: IRON & WRATH — UNIVERSAL KEYWORDS, COMBAT TRAITS & TACTICAL REACTION CARDS

*The Master Official Lexicon for the 2-Action Alternating Skirmish Engine (1,000-Point Scale).*

---

## 1. CORE ENGINE DESIGN PILLARS & STAT TERMINOLOGY

Every profile, weapon, and tactical reaction card in *Iron & Wrath* adheres to the official locked-in vocabulary:

### THE CORE UNIT STATS (THE 6-STAT FRAME)
```
| MOV: Movement (Inches) | MS: Melee Skill (1d6) | RS: Ranged Skill (1d6) | SAVE: Save (1d6) | MIGHT: Health Pool | CTRL: Objective Control |
```
* **`MOV` (Movement):** Maximum distance in inches a unit can traverse with an Advance action.
* **`MS` (Melee Skill):** Target number needed on 1d6 to land hits in close combat (e.g., `3+`).
* **`RS` (Ranged Skill):** Target number needed on 1d6 to land hits with ranged weapons (e.g., `3+`).
* **`SAVE` (Save):** The baseline roll on 1d6 required to prevent damage (e.g., `3+`, `4+`). Subject to the **3+ Armor Cap** (no save can ever be modified better than 3+).
* **`MIGHT`:** The raw staying power and health/damage pool of the warrior or vehicle. When reduced to 0 Might, the model is slain.
* **`CTRL` (Control):** The objective control score contributed by each model in the unit to contest markers within 3".

### SPECIAL DAMAGE & RESILIENCE TERMS
* **`PEN -X` (Armor Penetration):** How brutally a weapon tears through steel and plate (e.g., `Pen -1`, `Pen -2`). Worsens the target's Save roll.
* **`FATAL WOUNDS` (True Damage / Mortal Wounds):** Unblockable damage that completely bypasses Save rolls; can only be prevented by `[UNYIELDING]` or `[WARD]`.
* **`[WARD X+]` (Invulnerable Save):** A fixed defensive save (e.g., `Ward 4+`, `Ward 5+`) that is **never modified by Pen**. Defender rolls Save OR Ward, whichever is better.
* **`[UNYIELDING X+]` (Feel No Pain):** Sheer muscular grit or necrotic resilience. Each time a model suffers lost Might (even from Fatal Wounds), roll 1d6: on an **X+**, that lost Might is ignored.

---

## 2. CRITICAL HIT & CRITICAL WOUND KEYWORDS

Critical results on natural 6s represent bone-snapping kinetic violence:

* **`[ONSLAUGHT X]` (Sustained Hits):**
  * *Tabletop Rule:* Each unmodified **Natural 6 on an Attack roll** scores **+X additional automatic hits** on the target.
* **`[IMPALING HITS]` (Lethal Hits):**
  * *Tabletop Rule:* An unmodified **Natural 6 on an Attack roll** automatically Wounds the target without rolling to Wound.
* **`[SHREDDING WOUNDS]` (Devastating Wounds):**
  * *Tabletop Rule:* An unmodified **Natural 6 on a Wound roll** inflicts **Fatal Wounds** equal to the weapon's Damage characteristic, completely bypassing Save rolls.
  * *The 1-Model Balance Cap:* Fatal Wounds from a single Critical Wound can damage a **maximum of ONE model**. Excess damage does not spill over to others in the squad.

---

## 3. UNIVERSAL WEAPON KEYWORDS

Weapons feature tactical brackets denoting specialized battlefield behaviors. Multiple instances of identical keywords do not stack.

### RANGED & MELEE WEAPON TRAITS
* **`[ANTI-X Y+]` (Anti-Tank / Anti-Brute):**
  * *Tabletop Rule:* When targeting units with the designated keyword (e.g., `[ANTI-VEHICLE 4+]`, `[ANTI-BEHEMOTH 2+]`, `[ANTI-INFANTRY 2+]`), any unmodified Wound roll of **Y+** automatically wounds regardless of target resilience.
* **`[ERADICATE X]` (Melta):**
  * *Tabletop Rule:* Add **+X Damage** to the weapon's profile when firing at a target within **half of its maximum range (Point-Blank)**.
* **`[CRASHING]` (Lance / Charge Bonus):**
  * *Tabletop Rule:* Add **+1 to Wound rolls** if the attacking unit executed a **Charge Action** this activation.
* **`[HAILFIRE X]` (Rapid Fire):**
  * *Tabletop Rule:* Add **+X Attack Dice** when firing at a target within **half of the weapon's maximum range**.
* **`[RELENTLESS]` (Twin-Linked):**
  * *Tabletop Rule:* Reroll failed Wound rolls made with this weapon.
* **`[SHRAPNEL X]` (Blast / Area Saturation):**
  * *Tabletop Rule:* Add **+1 Attack Die** per model in the target unit (up to a maximum bonus of **+X Attacks**, typically +3). Cannot be fired into or out of Melee combat.
* **`[REAPING X]` (Cleave / Melee Sweep):**
  * *Tabletop Rule:* In close combat, add **+1 Attack Die** per enemy model in the target unit within engagement range (up to a maximum of **+X Attacks**).
* **`[OVERLOAD]` (Hazardous / Supercharged):**
  * *Tabletop Rule:* After resolving all attacks, roll one 1d6 Overload check: on a **1**, the firing model suffers **1 Fatal Wound** (or **3 Fatal Wounds** if a Class 4/5 Behemoth).
* **`[SCORCH]` (Torrent / Flame Stream):**
  * *Tabletop Rule:* Automatically hits the target. Skip the Hit roll and proceed directly to rolling to Wound.
* **`[CLOSE-QUARTERS]` (Sidearms & Pistols):**
  * *Tabletop Rule:* Can be fired while **Engaged in Melee**, targeting the locked enemy unit.
* **`[IGNORES COVER]` (Thermal / Bunker-Buster):**
  * *Tabletop Rule:* Targets cannot claim the +1 Save or -1 Hit penalty provided by Cover against attacks made with this weapon.
* **`[INDIRECT]` (Curved Artillery Arc):**
  * *Tabletop Rule:* Can target enemies outside of Line of Sight. Firing blind hits only on **Natural 6s**. If a friendly unit has direct Line of Sight to the target (acting as a Spotter), attacks hit on **Natural 4+**.

---

## 4. UNIVERSAL UNIT DEPLOYMENT & DEFENSIVE TRAITS

These passive traits appear on Unit Cards to define specialized battlefield roles:

* **`[VANGUARD STRIKE]` (Reserve Deployment / Deep Strike):**
  * *Tabletop Rule:* Unit starts in Strategic Reserves. Starting on Round 2, deploy anywhere on the battlefield more than **8" horizontally from all enemy models**.
* **`[UNSEEN 12"]` (Lone Operative):**
  * *Tabletop Rule:* Unless attached to a bodyguard squad, this model cannot be targeted by ranged attacks from more than **12" away**.
* **`[DETONATE X]` (Deadly Demise):**
  * *Tabletop Rule:* When this model is destroyed, roll 1d6: on a **5+**, its engine core or ammo magazine detonates, dealing **X Fatal Wounds** to every unit within 3".
* **`[STRIKE FIRST]` (Fights First):**
  * *Tabletop Rule:* This unit always strikes first in Melee combat, even when charged by an enemy unit.
* **`[VENGEANCE SURGE]` (Blood Surge):**
  * *Tabletop Rule:* When a friendly model in this unit is destroyed by ranged attacks, after the attack resolves, the survivors immediately make a free **1d6" Surge Move** directly toward the firing enemy.
* **`[ARMORED HULL]` (Heavy Vehicle / Behemoth Resilience):**
  * *Tabletop Rule:* Small-arms fire with Pen 0 cannot damage this vehicle, and incoming enemy Wound rolls suffer **-1 to Wound** (e.g. 3+ becomes 4+).
* **`[VOID INTERFERENCE 12"]` (Omni-Scramblers):**
  * *Tabletop Rule:* Enemy Reserve or Flanking units **cannot deploy within 12"** of this unit under any circumstances.
* **`[TACTICAL REPOSITION]` (Hit-and-Run):**
  * *Tabletop Rule:* Immediately after resolving ranged attacks, this unit may make a free **1d6" Move**. Cannot enter engagement range.

---

## 5. THE 10-CARD TACTICAL REACTION DECK

Both players hold an identical 10-card deck. **Limit:** Maximum 1 Reaction Card per player per activation. Costs paid from your Fury Pool.

| Card Name | Fury Cost | Trigger Window | Tactical Effect |
| :--- | :---: | :--- | :--- |
| **1. Command Reroll** | 1 | Any dice roll you make | Reroll any single d6 roll (Hit, Wound, Save, Hazard, or Distance). |
| **2. Defensive Overwatch** | 1 | Enemy moves or charges within 12" | Target unactivated friendly unit fires Snap Fire (hits on unmodified 6s; `[SCORCH]` autohits). |
| **3. Smoke Screen** | 1 | Friendly unit is declared as ranged target | Target unit and allies within 3" gain Cover (-1 to be hit, cancels 1 Pen) until end of activation. |
| **4. Counter-Charge** | 2 | Enemy completes charge within 6" of friendly unit | Unengaged friendly unit makes an immediate 6" Counter-Charge into combat. |
| **5. Melee Riposte** | 2 | Enemy unit finishes melee attacks | Interrupt! Target engaged friendly unit strikes next with `[STRIKE FIRST]` before other enemies. |
| **6. Honor Duel** | 1 | Champion/Hero attacks in melee | Champion's melee attacks gain `[PRECISION]` to allocate damage directly into the enemy Leader. |
| **7. Frag Grenade** | 1 | Friendly infantry unit activates within 8" of enemy | Roll 6d6 at target enemy: each 4+ inflicts 1 Fatal Wound (ignores cover). |
| **8. Ramming Momentum** | 1 | Class 3/4 Behemoth finishes a Charge | Roll d6s equal to remaining Might: each 5+ deals 1 Fatal Wound (max 5); 1s deal 1 damage to charger. |
| **9. Flanking Ambush** | 2 | End of opponent activation (Round 2+) | Deploy 1 Reserve unit within 6" of any table edge and >8" from enemies. |
| **10. Iron Will** | 1 | Friendly unit becomes Rattled/Pinned (Once/battle) | Automatically clear suppression; unit is immune to Rattled/Pinned for the rest of the round. |
