# Iron & Wrath — Project Codex: 4192 AD

A model-agnostic, 1,000-point skirmish wargame with alternating 2-action activations, 25 original factions and
data-driven points. Play it with any miniatures you own.

> **Status:** open design draft. Rules, factions and points change often; table playtests are welcome.

## What is in this repository

| Folder | What it is |
| :-- | :-- |
| [`gametheory/`](gametheory/) | The game itself: core rules, missions, factions, lore, the points calculator, battle simulator and the reports that check them. |
| [`gametheory/factions/`](gametheory/factions/) | 25 factions: 550 datasheets, 75 detachments, priced (`NN_*.md` to read, `NN_*.json` for tools). |
| [`gametheory/scripts/`](gametheory/scripts/) | Python tools: `unit_calculator.py` (points), `battle_sim.py` (Monte Carlo games), `faction_builder.py`, `verify_all.py`, `trait_lab.py`, `role_lab.py`, `layout_gen.py` (terrain layouts). |
| [`website/`](website/) | The companion web app (army builder, game tracker, rules pages, terrain layouts). |

## Start here

- **Rules:** [`gametheory/CORE_RULES_MANUAL_4192.md`](gametheory/CORE_RULES_MANUAL_4192.md) and the
  [2-page reference](gametheory/CORE_RULES_REFERENCE_2PAGE.md)
- **Missions, maps and the Tactical deck:** [`gametheory/MISSIONS_AND_TACTICAL_DECK.md`](gametheory/MISSIONS_AND_TACTICAL_DECK.md)
- **Factions:** [`gametheory/FACTION_REGISTRY.md`](gametheory/FACTION_REGISTRY.md)
- **World lore (Spanish draft):** [`gametheory/LORE_MUNDO_4192.md`](gametheory/LORE_MUNDO_4192.md)
- **How the points are checked:** [`gametheory/VERIFICATION_REPORT.md`](gametheory/VERIFICATION_REPORT.md),
  [`gametheory/ROLE_REPORT.md`](gametheory/ROLE_REPORT.md)

## Run the tools

```bash
pip install shapely
cd gametheory/scripts
python3 unit_calculator.py faction ../factions/08_prometheus_flesh_guilds.json   # price a faction
python3 battle_sim.py matrix --all --games 100                                   # simulate all factions
python3 verify_all.py                                                            # check everything
python3 layout_gen.py                                                            # generate terrain layouts
```

## Licence

- **Game content** (rules, factions, lore, layouts): [CC BY-NC-SA 4.0](LICENSE-RULES.md): share and adapt with credit, non-commercially.
- **Software** (calculator, simulator, website code): [MIT](LICENSE).

## Legal

Iron & Wrath is an independent game. It is not affiliated with, endorsed by or connected to Games Workshop or
any other publisher. All faction names, rules and lore here are original. Mentions of other games in design
notes are for comparison only.
