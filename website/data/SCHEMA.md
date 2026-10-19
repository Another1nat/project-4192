# Data format

Everything the app shows comes from these files. The examples in `data/factions/Example Faction.json`
follow this format exactly; copy that file to start a faction.

## 1. Factions list — `app.js` → `const FACTIONS`

```js
{ id: 1, group: 'Alliance name', name: 'Faction name', banner: 'assets/banners/0.jpg', color: '#c8a24a' }
```
- `name` must match the file name `data/factions/<name>.json`.
- `color` is the faction colour: the whole UI (buttons, headings, army rules) takes it on.
- `group` groups factions on the faction picker.

## 2. One faction — `data/factions/<name>.json`

```json
{
  "name": "Faction name",
  "factionKeyword": "Faction name",
  "sources": ["where this data comes from"],
  "rules": [ { "name": "Army rule name", "description": "Text. **Bold** words are shown as keywords." } ],
  "detachments": [ ... ],
  "datasheets": [ ... ],
  "faq": [ { "header": null, "errata": null, "q": "Question?", "a": "Answer." } ]
}
```

### Detachment

```json
{
  "id": "unique-id", "name": "Detachment name", "cost": 1,
  "rules": [ { "id": "r1", "name": "Rule name", "description": "What it does." } ],
  "enhancements": [ { "id": "e1", "name": "Enhancement name", "cost": 15, "description": "...", "lore": "",
                      "requires": [ { "keywords": [], "faction": ["Faction name"], "datasheet": "Unit name" } ] } ],
  "stratagems": [ { "id": "s1", "name": "Tactic name", "cost": "1", "category": null,
                    "when": "yourTurn | opponentsTurn | eitherPlayer", "turn": "When it is used.",
                    "target": "Who it targets.", "effect": "What happens.", "restriction": "", "lore": "" } ]
}
```
- `cost` = detachment points. `requires` is optional (who may take the enhancement).

### Datasheet (one unit)

```json
{
  "id": "unique-id",
  "name": "Unit name",
  "role": "Battleline",                     // groups the unit in the sidebar (EPIC HERO, CHARACTER, BATTLELINE…): any text works
  "composition": "■ **5-10 Troopers**",
  "lore": "",
  "stats": { "M": "6\"", "T": "4", "Sv": "4+", "W": "1", "Ld": "7+", "OC": "2" },   // ANY keys: each one becomes a stat box
  "invuln": "-",
  "keywords": ["Infantry", "Battleline", "Unit name"],
  "factionKeywords": ["Faction name"],
  "abilities": [ { "name": "Ability", "description": "Text.", "type": "datasheet | faction | core" } ],
  "weapons": [ { "name": "Rifle", "type": "Ranged | Melee", "range": "24\"", "A": "1", "BS": "4+", "S": "4", "AP": "0", "D": "1",
                 "keywords": ["Assault"], "models": ["Trooper"],
                 "optional": true, "optionalFor": ["Trooper"] } ],          // optional/optionalFor only for swap-in weapons
  "points": 60,
  "compositions": [ { "default": true, "points": 60,  "models": [ { "name": "Trooper", "min": 5, "max": 5 } ] },
                    { "default": true, "points": 120, "models": [ { "name": "Trooper", "min": 6, "max": 10 } ] } ],   // = unit sizes + points
  "models": [ { "name": "Trooper", "M": "6\"", "T": "4", "Sv": "4+", "W": "1", "Ld": "7+", "OC": "2",
                "equipped": [ { "item": "Rifle", "count": 1 } ], "optional": ["Plasma rifle"] } ],               // one entry per model type
  "options": [ { "model": "Trooper", "text": "Any model can replace its rifle with 1 plasma rifle." } ],
  "ledBy": ["Commander name"],                                   // leaders that can join this unit
  "leads": [ { "type": "leader", "units": ["Unit name"] } ],     // on a leader: the units it can join
  "damage": [ { "name": "Damaged: 1-5 wounds left", "rules": "..." } ],   // optional
  "rules":  [ { "name": "Datasheet rule", "description": "..." } ],       // optional
  "faq": []
}
```
- **Unit sizes and points** come from `compositions` (one entry per size). Enhancement costs come from the detachment.
- A `models` entry per model type is used when the unit mixes profiles (e.g. a sergeant with different stats).
- Weapon stat names (`A`, `BS`, `S`, `AP`, `D`) are what the datasheet table and the unit calculator read.

## 3. Missions and core rules — `gdm_data.js`

```js
window.GDM_DATA = {
  factions: ['Hold Ground', 'Break Through'],          // mission types, picked by each player in game setup
  matrix:   [ ['Mission A', 'Mission B'],               // primary mission = matrix[my type][opponent's type]
              ['Mission C', 'Mission D'] ],
  secondaryMissions: ['Secondary 1', 'Secondary 2'],
  rules: [ { id: '01', title: 'Core Concepts', rules: [ { id: '01.01', title: 'RULE NAME', html: '<p>Text</p>' } ] } ]
};
```
Mission card text: `mission_text.js` → `MISSION_TEXT.primary['Mission A']`, `MISSION_TEXT.secondary['Secondary 1']`.
Card pictures (optional): `assets/primary/mission-a.png`, `assets/secondary/attacker|defender/secondary-1.png`.

## 4. Optional points table — `mfm_overrides.js`

`MFM_OVERRIDES['Unit name'] = { basePts: 60, comp: '5 models', options: [ { comp: '10 models', pts: 120 } ] }` overrides
the points in the faction file (handy when points change more often than datasheets). Leave it empty otherwise.

## Names in the code

Some internal names come from the app this was copied from and only mean "data": `MFM_*` = points table,
`GDM_DATA` = missions and core rules, `d39` / `39k` = the faction file data, `trackerState.pN.forceDisp` = the
player's mission type, `BL_*` / `bl_*` = app settings. They are safe to keep.
