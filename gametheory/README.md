# gametheory/ — the game

Everything that defines **Iron & Wrath (4192 AD)**: rules, missions, factions, lore, and the tools that price and
test them.

## Rules and play
| Document | What it is |
| :-- | :-- |
| [CORE_RULES_MANUAL_4192.md](CORE_RULES_MANUAL_4192.md) | The full core rules: activations, combat, terrain, Command Points, suppression. |
| [CORE_RULES_REFERENCE_2PAGE.md](CORE_RULES_REFERENCE_2PAGE.md) | Two-page quick reference for the table. |
| [MISSIONS_AND_TACTICAL_DECK.md](MISSIONS_AND_TACTICAL_DECK.md) | Scoring, the three deployment maps, terrain standard, the 12 Tactical cards. |
| [TERRAIN_LAYOUTS.md](TERRAIN_LAYOUTS.md) | The 12-piece terrain kit, how layouts are generated and checked, the 9 current layouts. |
| [UNIVERSAL_KEYWORDS_AND_STRATAGEMS.md](UNIVERSAL_KEYWORDS_AND_STRATAGEMS.md) | Keyword and tactic lexicon. |
| [STARTER_FORCES_1000PT.md](STARTER_FORCES_1000PT.md) | Ready-to-play 1,000-point armies. |

## Factions and world
| Document | What it is |
| :-- | :-- |
| [FACTION_REGISTRY.md](FACTION_REGISTRY.md) | All 25 factions: how they play, priced datasheets, 3 detachments each. |
| [factions/](factions/) | One file per faction: `NN_*.md` to read, `NN_*.json` for the tools. |
| [FACTION_DESIGN_GUIDE.md](FACTION_DESIGN_GUIDE.md) | The design rules every faction follows (one verb each, risk types, caps). |
| [UNIT_CATALOGUE.md](UNIT_CATALOGUE.md) | The 29 universal unit archetypes and the weapon library, priced. |
| [LORE_MUNDO_4192.md](LORE_MUNDO_4192.md) | World and faction lore (Spanish draft). |
| [WORLD_LORE_PRIMER.md](WORLD_LORE_PRIMER.md) | Short world primer. |

## How the points are made and checked
| Document | What it is |
| :-- | :-- |
| [GAME_SYSTEM_PLAN.md](GAME_SYSTEM_PLAN.md) | Game sizes, points scale, pricing method, simulator design. |
| [FACTION_EXPANSION_REVIEW.md](FACTION_EXPANSION_REVIEW.md) | How the 25 factions were built, balance results, open risks. |
| [VERIFICATION_REPORT.md](VERIFICATION_REPORT.md) | Dice maths vs brute force, price tests, every datasheet and enhancement, legal sample lists. |
| [ROLE_REPORT.md](ROLE_REPORT.md) | Every unit judged in its role (anti-horde, anti-armour…), and what range is worth. |

## Tools (`scripts/`)
```bash
pip install shapely
cd scripts
python3 unit_calculator.py faction ../factions/04_aegis_knight_houses.json   # price a faction -> .md datasheets
python3 unit_calculator.py validate ../factions/04_aegis_knight_houses.json  # design rules check
python3 faction_builder.py            # rebuild factions from factions/specs/
python3 battle_sim.py matrix --all --games 100   # simulated games between all factions
python3 verify_all.py                 # full verification -> ../VERIFICATION_REPORT.md
python3 trait_lab.py                  # weapon traits: calculator vs simulator
python3 role_lab.py                   # role report -> ../ROLE_REPORT.md
python3 layout_gen.py                 # terrain layouts -> ../../website/data + assets
```
Prices use `catalogue/pricing_config.json` and the fitted coefficients in `calc_output/calibration.json`.
Re-fitting them (`unit_calculator.py fit`) needs a private reference dataset that is not part of this repository.
