# Role Report — every datasheet judged in its role

*`scripts/role_lab.py` · 550 datasheets · efficiency = points of the target destroyed per activation ÷ own points (calculator: cover, overkill cap, traits and abilities included)*

## Target types

| Target | Profile | Pts per MIGHT | Median efficiency |
| :-- | :-- | --: | --: |
| horde | 10× MIGHT 1, ARM 6+ | 12.0 | 0.400 |
| line | 10× MIGHT 1, ARM 4+ | 15.0 | 0.354 |
| elite | 5× MIGHT 2, ARM 3+ | 11.5 | 0.307 |
| heavy | 3× MIGHT 4, ARM 3+, WARD 4+ | 11.2 | 0.268 |
| monster | 1× MIGHT 14, ARM 4+, HARDENED | 8.9 | 0.263 |
| vehicle | 1× MIGHT 16, ARM 3+, HARDENED | 10.0 | 0.225 |

## Roles found

| Role | Datasheets | Example specialists (best in role) |
| :-- | --: | :-- |
| anti-horde | 150 | Penitent Flagellants (03, ×4.0); Star-Wisps (14, ×3.8); Blood-Leash Wardens (11, ×3.8); Dervish Blade-Dancers (15, ×3.6) |
| anti-infantry | 17 | Prism-Blade Dancers (16, ×4.1); Rend-Lurkers (23, ×3.7); Scrap-Gunner Mob (24, ×3.0); Flayed-Silk Initiates (15, ×2.9) |
| anti-elite | 113 | Sworn Shield-Veterans (01, ×3.3); Raptor-Knights (17, ×3.2); Swift-Steed Riders (15, ×3.1); Ronin Iron-Wardens (20, ×3.1) |
| anti-armour | 113 | Purgator Vanguard (03, ×5.8); Plasma-Welder Team (08, ×5.2); Dawn Fusion-Lancers (16, ×4.9); Hall-Guard Berserkers (09, ×4.6) |
| transport | 31 | Bladed Sky-Skiff (20, ×1.4); Deep-Burrow Worm (23, ×1.2); walker Sky-Galleon (10, ×1.2); Obsidian Tomb-Fortress (18, ×1.2) |
| support | 7 | Siege-Crawler Ram (13, ×0.4); Altar of Ichor (06, ×0.4); Sun-Engine Shell-Beast (17, ×0.3); Soul-Lantern Bearers (25, ×0.3) |

**Most versatile:** Brass Hellsteed Riders (0.89); Great Unclean Engine (0.89); Cannonade Ironclad (0.88); Soul-Furnace Engine (0.88); Corsair Gun-Skiff (0.88); Ember-Gun Thunderers (0.87)

**Purest specialists:** Gas-Lobber Squad → anti-horde (0.18); Powder Monkeys → anti-horde (0.22); Sworn Pyre-Breachers → anti-armour (0.23); Magma-Cannon Battery → anti-armour (0.23); Dawn Fusion-Lancers → anti-armour (0.23); Blood-Leash Wardens → anti-horde (0.24)

## Weak in their own role (43): under 0.6× the role median

These units are not even good at the job their weapons point to. Fix the weapon or the price, not the role.

| # | Unit | Role | Score in role | Pts |
| :-: | :-- | :-- | --: | --: |
| 02 | Iron-Stalker Walker | anti-elite | 0.29 | 60 |
| 19 | Doom-Gong Engine | anti-elite | 0.32 | 110 |
| 02 | Trench-Troopers | anti-horde | 0.34 | 115 |
| 19 | Rad-Arc Cannon Crawler | anti-armour | 0.35 | 110 |
| 21 | Conscript Rabble | anti-horde | 0.36 | 55 |
| 06 | Thrall-Levies | anti-horde | 0.38 | 110 |
| 17 | Horned Shell-Bastion | anti-elite | 0.38 | 225 |
| 23 | Chitter-Swarm | anti-horde | 0.39 | 100 |
| 12 | Blight-Furnace Bell-Tank | anti-elite | 0.40 | 175 |
| 18 | Rune-Organ Battery | anti-horde | 0.41 | 120 |
| 23 | Siege-Maw Monstrosity | anti-elite | 0.42 | 180 |
| 17 | Chameleon Snipers | anti-armour | 0.43 | 60 |
| 13 | Soul-Furnace Engine | anti-armour | 0.47 | 225 |
| 01 | Solar Grav-Tank | anti-armour | 0.47 | 175 |
| 07 | Bone-Slingers | anti-horde | 0.49 | 45 |
| 22 | Gilded Gore-Brutes | anti-armour | 0.49 | 145 |
| 23 | Bio-Artillery Beast | anti-elite | 0.50 | 140 |
| 12 | Necrotic Siege-Crawler | anti-horde | 0.51 | 225 |
| 24 | War-Buggy | anti-horde | 0.51 | 75 |
| 02 | Siege-Breaker Tank | anti-horde | 0.52 | 150 |
| 24 | Scrap-Imps | anti-horde | 0.52 | 75 |
| 11 | Brass Crusher Engine | anti-elite | 0.53 | 230 |
| 05 | Torpedo-Ram Crawler | anti-armour | 0.53 | 170 |
| 14 | Astral Disc-Riders | anti-infantry | 0.53 | 95 |
| 15 | Sonic Organ-Engine | anti-elite | 0.54 | 130 |
| 12 | Great Unclean Engine | anti-armour | 0.54 | 420 |
| 08 | Iron-Flesh Excavator-Walker | anti-armour | 0.54 | 180 |
| 23 | Bio-Warrior Brood | anti-infantry | 0.55 | 110 |
| 01 | Sunhawk Interceptor | anti-armour | 0.55 | 145 |
| 04 | Baronial Bombard | anti-elite | 0.55 | 140 |
| 05 | Snapper Snipers | anti-elite | 0.55 | 50 |
| 14 | Warp-Prism Engine | anti-elite | 0.56 | 125 |
| 22 | Lotus Drone Flight | anti-horde | 0.57 | 55 |
| 03 | Pilgrim Levy | anti-horde | 0.58 | 95 |
| 01 | Eclipse Scouts | anti-horde | 0.58 | 65 |
| 22 | Lotus Sky-Gunship | anti-armour | 0.58 | 165 |
| 01 | Aurum Dread-Bastion | anti-armour | 0.58 | 180 |
| 09 | Shield-Wall Huscarls | anti-horde | 0.59 | 160 |
| 25 | Grave-Arbalest Shades | anti-horde | 0.59 | 80 |
| 22 | Lotus Rail-Battery | anti-elite | 0.59 | 135 |
| 05 | Trench-Dredge Divers | anti-horde | 0.60 | 105 |
| 11 | Skull-Altar Engine | anti-armour | 0.60 | 220 |
| 01 | Sworn Marksmen | anti-elite | 0.60 | 55 |

## Dominant in their role (40): over 1.8× the role median

| # | Unit | Role | Score in role | Pts |
| :-: | :-- | :-- | --: | --: |
| 03 | Purgator Vanguard | anti-armour | 4.33 | 120 |
| 08 | Plasma-Welder Team | anti-armour | 3.86 | 85 |
| 16 | Dawn Fusion-Lancers | anti-armour | 3.64 | 90 |
| 09 | Hall-Guard Berserkers | anti-armour | 3.41 | 115 |
| 18 | Magma-Cannon Battery | anti-armour | 3.08 | 85 |
| 03 | Penitent Flagellants | anti-horde | 3.00 | 50 |
| 14 | Star-Wisps | anti-horde | 2.88 | 65 |
| 03 | Vindicant Squad | anti-armour | 2.84 | 150 |
| 11 | Blood-Leash Wardens | anti-horde | 2.81 | 80 |
| 15 | Dervish Blade-Dancers | anti-horde | 2.68 | 70 |
| 19 | Rad-Fire Thrower Team | anti-horde | 2.67 | 45 |
| 20 | Void-Wing Scourges | anti-armour | 2.60 | 70 |
| 13 | Iron-Devourer Heavy Squad | anti-armour | 2.56 | 165 |
| 22 | Siege Rail-Suits | anti-armour | 2.54 | 160 |
| 24 | Rocket-Scrap Crew | anti-armour | 2.50 | 50 |
| 25 | Eclipse Reapers | anti-horde | 2.50 | 60 |
| 01 | Sworn Gryph-Knights | anti-armour | 2.38 | 145 |
| 06 | Dire Blood-Hounds | anti-horde | 2.34 | 60 |
| 02 | Penal Legion Breachers | anti-horde | 2.25 | 100 |
| 10 | Deck-Hand Swashbucklers | anti-horde | 2.25 | 50 |
| 20 | Void-Lance Team | anti-armour | 2.21 | 55 |
| 16 | Dawnblade Swordmasters | anti-armour | 2.21 | 105 |
| 21 | Feral Pack | anti-horde | 2.11 | 40 |
| 02 | Flame-Trooper Squad | anti-horde | 2.08 | 90 |
| 01 | Sworn Pyre-Breachers | anti-armour | 2.05 | 160 |
| 07 | Crypt-Scullions | anti-horde | 2.05 | 110 |
| 01 | Sworn Shield-Veterans | anti-elite | 2.03 | 115 |
| 17 | Raptor-Knights | anti-elite | 2.00 | 120 |
| 15 | Exalted Rapture-Fiend | anti-armour | 2.00 | 140 |
| 20 | Agony-Colossus | anti-armour | 2.00 | 140 |
| 15 | Swift-Steed Riders | anti-elite | 1.96 | 75 |
| 20 | Ronin Iron-Wardens | anti-elite | 1.94 | 120 |
| 20 | Cyber-Ronin Duelists | anti-armour | 1.93 | 120 |
| 16 | Sun-Wing Skyblades | anti-horde | 1.91 | 60 |
| 15 | Rapture-Hounds | anti-horde | 1.88 | 60 |
| 20 | Arena-Blade Cultists | anti-horde | 1.88 | 60 |
| 16 | Star-Lance Platform | anti-armour | 1.87 | 65 |
| 11 | Gore-Champion Coterie | anti-elite | 1.87 | 125 |
| 17 | Fire-Spitter Handlers | anti-horde | 1.85 | 65 |
| 10 | Sky-Cutter Riders | anti-elite | 1.81 | 65 |

## Name promises a different job than the weapons deliver (6)

| # | Unit | Name suggests | Weapons deliver | Best ×median |
| :-: | :-- | :-- | :-- | --: |
| 05 | Hydraulic Harpooners | anti-armour / anti-elite | anti-horde (horde) | 1.56 |
| 08 | Arc-Lancer Skirmishers | anti-armour / anti-elite | anti-horde (horde) | 1.38 |
| 15 | Sonic-Blaster Cultists | anti-armour / anti-elite | anti-horde (horde) | 0.98 |
| 16 | Sun-Crested Lancers | anti-armour / anti-elite | anti-horde (horde) | 1.67 |
| 17 | Chameleon Snipers | anti-elite / anti-infantry | anti-armour (vehicle) | 0.58 |
| 23 | Slasher-Brood | anti-armour / anti-elite | anti-horde (horde) | 1.85 |
