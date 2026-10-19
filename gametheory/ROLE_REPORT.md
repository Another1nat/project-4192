# Role Report — every datasheet judged in its role

*`scripts/role_lab.py` · 550 datasheets · efficiency = points of the target destroyed per activation ÷ own points (calculator: cover, overkill cap, traits and abilities included)*

## Target types

| Target | Profile | Pts per MIGHT | Median efficiency |
| :-- | :-- | --: | --: |
| horde | 10× MIGHT 1, ARM 6+ | 12.0 | 0.400 |
| line | 10× MIGHT 1, ARM 4+ | 15.0 | 0.357 |
| elite | 5× MIGHT 2, ARM 3+ | 11.5 | 0.304 |
| heavy | 3× MIGHT 4, ARM 3+, WARD 4+ | 11.2 | 0.262 |
| monster | 1× MIGHT 14, ARM 4+, HARDENED | 8.6 | 0.246 |
| vehicle | 1× MIGHT 16, ARM 3+, HARDENED | 9.7 | 0.215 |

## Roles found

| Role | Datasheets | Example specialists (best in role) |
| :-- | --: | :-- |
| anti-horde | 151 | Penitent Flagellants (03, ×4.0); Blood-Leash Wardens (11, ×3.8); Dervish Blade-Dancers (15, ×3.6); Star-Wisps (14, ×3.4) |
| anti-infantry | 18 | Prism-Blade Dancers (16, ×4.1); Rend-Lurkers (23, ×3.6); Scrap-Gunner Mob (24, ×3.0); Flayed-Silk Initiates (15, ×2.9) |
| anti-elite | 105 | Sworn Shield-Veterans (01, ×3.3); Raptor-Knights (17, ×3.3); Swift-Steed Riders (15, ×3.2); Ronin Iron-Wardens (20, ×3.1) |
| anti-armour | 118 | Purgator Vanguard (03, ×5.2); Plasma-Welder Team (08, ×5.0); Hall-Guard Berserkers (09, ×4.7); Dawn Fusion-Lancers (16, ×4.4) |
| transport | 31 | walker Sky-Galleon (10, ×1.3); Bladed Sky-Skiff (20, ×1.2); Obsidian Tomb-Fortress (18, ×1.2); Heliarch Grav-Cruiser (01, ×1.2) |
| support | 8 | Rad-Arc Cannon Crawler (19, ×0.4); Altar of Ichor (06, ×0.4); Siege-Crawler Ram (13, ×0.4); Sun-Engine Shell-Beast (17, ×0.3) |

**Most versatile:** Reliquant Warsuits (0.92); Brass Hellsteed Riders (0.89); Cannonade Ironclad (0.89); Corsair Gun-Skiff (0.89); Ember-Gun Thunderers (0.86); Bio-Forge Tank (0.86)

**Purest specialists:** Gas-Lobber Squad → anti-horde (0.19); Powder Monkeys → anti-horde (0.22); Blood-Leash Wardens → anti-horde (0.24); Mortar Pit → anti-horde (0.25); Bone-Slingers → anti-horde (0.25); Depth-Charge Team → anti-horde (0.25)

## Weak in their own role (40): under 0.6× the role median

These units are not even good at the job their weapons point to. Fix the weapon or the price, not the role.

| # | Unit | Role | Score in role | Pts |
| :-: | :-- | :-- | --: | --: |
| 19 | Doom-Gong Engine | anti-elite | 0.28 | 110 |
| 02 | Iron-Stalker Walker | anti-elite | 0.28 | 60 |
| 02 | Trench-Troopers | anti-horde | 0.34 | 115 |
| 21 | Conscript Rabble | anti-horde | 0.36 | 55 |
| 12 | Blight-Furnace Bell-Tank | anti-elite | 0.37 | 175 |
| 17 | Horned Shell-Bastion | anti-elite | 0.37 | 225 |
| 06 | Thrall-Levies | anti-horde | 0.38 | 110 |
| 23 | Siege-Maw Monstrosity | anti-elite | 0.39 | 180 |
| 23 | Chitter-Swarm | anti-horde | 0.39 | 100 |
| 18 | Rune-Organ Battery | anti-horde | 0.41 | 120 |
| 07 | Bone-Slingers | anti-horde | 0.45 | 45 |
| 23 | Bio-Artillery Beast | anti-elite | 0.46 | 140 |
| 17 | Chameleon Snipers | anti-armour | 0.46 | 60 |
| 12 | Necrotic Siege-Crawler | anti-horde | 0.47 | 220 |
| 01 | Solar Grav-Tank | anti-armour | 0.48 | 175 |
| 02 | Siege-Breaker Tank | anti-horde | 0.49 | 150 |
| 14 | Warp-Prism Engine | anti-elite | 0.50 | 125 |
| 15 | Sonic Organ-Engine | anti-elite | 0.50 | 125 |
| 16 | Prism Strider | anti-infantry | 0.51 | 75 |
| 04 | Baronial Bombard | anti-elite | 0.51 | 140 |
| 11 | Brass Crusher Engine | anti-elite | 0.51 | 230 |
| 24 | War-Buggy | anti-horde | 0.51 | 75 |
| 24 | Scrap-Imps | anti-horde | 0.52 | 75 |
| 13 | Soul-Furnace Engine | anti-armour | 0.52 | 220 |
| 05 | Torpedo-Ram Crawler | anti-armour | 0.53 | 170 |
| 14 | Astral Disc-Riders | anti-infantry | 0.53 | 95 |
| 22 | Gilded Gore-Brutes | anti-armour | 0.53 | 145 |
| 22 | Lotus Rail-Battery | anti-elite | 0.54 | 135 |
| 23 | Bio-Warrior Brood | anti-infantry | 0.55 | 110 |
| 01 | Sunhawk Interceptor | anti-armour | 0.55 | 145 |
| 22 | Lotus Drone Flight | anti-horde | 0.57 | 55 |
| 03 | Pilgrim Levy | anti-horde | 0.58 | 95 |
| 22 | Lotus Sky-Gunship | anti-armour | 0.58 | 165 |
| 01 | Sworn Marksmen | anti-elite | 0.58 | 55 |
| 01 | Eclipse Scouts | anti-horde | 0.58 | 65 |
| 10 | Mortar Ketch | anti-elite | 0.58 | 110 |
| 09 | Shield-Wall Huscarls | anti-horde | 0.59 | 160 |
| 25 | Grave-Arbalest Shades | anti-horde | 0.59 | 80 |
| 08 | Iron-Flesh Excavator-Walker | anti-armour | 0.59 | 180 |
| 05 | Trench-Dredge Divers | anti-horde | 0.60 | 105 |

## Dominant in their role (41): over 1.8× the role median

| # | Unit | Role | Score in role | Pts |
| :-: | :-- | :-- | --: | --: |
| 03 | Purgator Vanguard | anti-armour | 4.16 | 120 |
| 08 | Plasma-Welder Team | anti-armour | 3.94 | 80 |
| 09 | Hall-Guard Berserkers | anti-armour | 3.70 | 115 |
| 16 | Dawn Fusion-Lancers | anti-armour | 3.50 | 90 |
| 03 | Penitent Flagellants | anti-horde | 3.00 | 50 |
| 18 | Magma-Cannon Battery | anti-armour | 2.97 | 85 |
| 11 | Blood-Leash Wardens | anti-horde | 2.81 | 80 |
| 03 | Vindicant Squad | anti-armour | 2.68 | 150 |
| 15 | Dervish Blade-Dancers | anti-horde | 2.68 | 70 |
| 22 | Siege Rail-Suits | anti-armour | 2.62 | 160 |
| 01 | Sworn Gryph-Knights | anti-armour | 2.60 | 145 |
| 20 | Void-Wing Scourges | anti-armour | 2.55 | 70 |
| 13 | Iron-Devourer Heavy Squad | anti-armour | 2.55 | 165 |
| 14 | Star-Wisps | anti-horde | 2.52 | 65 |
| 25 | Eclipse Reapers | anti-horde | 2.50 | 60 |
| 16 | Dawnblade Swordmasters | anti-armour | 2.39 | 105 |
| 24 | Rocket-Scrap Crew | anti-armour | 2.36 | 50 |
| 06 | Dire Blood-Hounds | anti-horde | 2.34 | 60 |
| 19 | Rad-Fire Thrower Team | anti-horde | 2.33 | 45 |
| 02 | Penal Legion Breachers | anti-horde | 2.25 | 100 |
| 10 | Deck-Hand Swashbucklers | anti-horde | 2.25 | 50 |
| 20 | Void-Lance Team | anti-armour | 2.17 | 55 |
| 21 | Feral Pack | anti-horde | 2.11 | 40 |
| 20 | Cyber-Ronin Duelists | anti-armour | 2.09 | 120 |
| 07 | Crypt-Scullions | anti-horde | 2.05 | 110 |
| 01 | Sworn Pyre-Breachers | anti-armour | 2.03 | 155 |
| 01 | Sworn Shield-Veterans | anti-elite | 1.96 | 115 |
| 17 | Raptor-Knights | anti-elite | 1.95 | 120 |
| 15 | Exalted Rapture-Fiend | anti-armour | 1.95 | 135 |
| 20 | Agony-Colossus | anti-armour | 1.95 | 135 |
| 04 | Gallant-Class Knight | anti-armour | 1.94 | 205 |
| 02 | Flame-Trooper Squad | anti-horde | 1.93 | 85 |
| 15 | Swift-Steed Riders | anti-elite | 1.92 | 75 |
| 16 | Sun-Wing Skyblades | anti-horde | 1.91 | 60 |
| 25 | Gloom-Blade Guard | anti-armour | 1.91 | 175 |
| 20 | Ronin Iron-Wardens | anti-elite | 1.88 | 120 |
| 15 | Rapture-Hounds | anti-horde | 1.88 | 60 |
| 20 | Arena-Blade Cultists | anti-horde | 1.88 | 60 |
| 16 | Star-Lance Platform | anti-armour | 1.83 | 65 |
| 17 | Horned Brute-Saurians | anti-armour | 1.82 | 175 |
| 11 | Gore-Champion Coterie | anti-elite | 1.80 | 125 |

## Name promises a different job than the weapons deliver (10)

| # | Unit | Name suggests | Weapons deliver | Best ×median |
| :-: | :-- | :-- | :-- | --: |
| 02 | Scout-Sniper Pair | anti-elite / anti-infantry | anti-armour (vehicle) | 1.13 |
| 05 | Hydraulic Harpooners | anti-armour / anti-elite | anti-horde (horde) | 1.56 |
| 05 | Snapper Snipers | anti-elite / anti-infantry | anti-armour (vehicle) | 0.90 |
| 08 | Arc-Lancer Skirmishers | anti-armour / anti-elite | anti-horde (horde) | 1.38 |
| 10 | Crow's Nest Sharpshooters | anti-elite / anti-infantry | anti-armour (vehicle) | 1.29 |
| 15 | Sonic-Blaster Cultists | anti-armour / anti-elite | anti-horde (horde) | 0.98 |
| 16 | Sun-Crested Lancers | anti-armour / anti-elite | anti-horde (horde) | 1.67 |
| 17 | Chameleon Snipers | anti-elite / anti-infantry | anti-armour (vehicle) | 0.59 |
| 21 | Long-Rifles | anti-elite / anti-infantry | anti-armour (vehicle) | 1.13 |
| 23 | Slasher-Brood | anti-armour / anti-elite | anti-horde (horde) | 1.85 |

## Simulator check: do specialists do their job in played games?

Points destroyed per own point against each target type in random games, relative to the median unit (>1 = better than a typical unit against that type). **Bold** = the role's own target.

| Role (calculator) | Units | vs horde | vs line inf. | vs elite / Class 2 | vs Class 3–5 |
| :-- | --: | --: | --: | --: | --: |
| anti-horde | 151 | **1.21** | 1.20 | 0.76 | 0.64 |
| anti-infantry | 18 | 1.15 | **1.07** | 0.81 | 0.79 |
| anti-elite | 105 | 1.06 | 1.02 | **1.25** | 1.21 |
| anti-armour | 118 | 0.80 | 0.94 | 1.23 | **1.65** |
| transport | 31 | 0.63 | 0.72 | 0.36 | 0.24 |
| support | 8 | 0.17 | 0.13 | 0.09 | 0.10 |

| Role | Median value per point (sim, 1.00 = all units) |
| :-- | --: |
| anti-horde | 0.97 |
| anti-infantry | 0.92 |
| anti-elite | 1.03 |
| anti-armour | 1.03 |
| transport | 0.83 |
| support | 0.41 |

## Range: what is it worth in played games?

Ranged-dominant, non-Leader units (≥70% of damage from guns), grouped by their longest weapon. Value per point from the simulator (maps of 14″/18″/24″ gaps, deployment up to 6″ deep).

| Longest range | Units | Median value per point |
| :-- | --: | --: |
| ≤12″ | 14 | 0.95 |
| 13–18″ | 8 | 0.88 |
| 19–24″ | 8 | 0.93 |
| 25–36″ | 22 | 0.90 |
| >36″ | 61 | 1.06 |
| melee-dominant (for reference) | 213 | 0.98 |

**Elasticity of value per point to range: +0.187** (+14% value per point for doubling range, if the price ignores range).
