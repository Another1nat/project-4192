#!/usr/bin/env python3
"""
batch_unit_generator.py
Unattended Batch Unit & Faction Generator for Project Codex: 4192 AD.

Takes the 25 Subfactions from gametheory/FACTION_25_DATABASE.json, their 40k proxies,
and uses either a Local LLM (Ollama) or the calibrated mathematical balance engine
to generate balanced, ready-to-play unit cards for all 25 factions.

Designed for unattended execution on Mac Mini:
- Saves checkpoint after every faction to gametheory/batch_checkpoint.json
- Emits clean JSON and Markdown dossiers to gametheory/generated_factions/
- Can be paused and resumed seamlessly without losing progress
"""

import argparse
import datetime
import json
import math
import os
import re
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)

from local_llm_client import LocalLLMClient

FACTION_DB_PATH = os.path.join(ROOT, 'gametheory', 'FACTION_25_DATABASE.json')
OUTPUT_DIR = os.path.join(ROOT, 'gametheory', 'generated_factions')
CHECKPOINT_PATH = os.path.join(ROOT, 'gametheory', 'batch_checkpoint.json')
MASTER_MD_PATH = os.path.join(ROOT, 'gametheory', 'PROJECT_CODEX_ALL_25_FACTIONS.md')

# Reference baseline stat envelopes per class in 4192 AD
CLASS_BENCHMARKS = {
    1: {
        "role": "Conscript / Line Infantry",
        "models": 5,
        "base": "25mm–32mm",
        "mov": 6, "ms": "3+", "rs": "4+", "arm": "4+", "might": 2, "ctrl": 2,
        "base_target_pts": 150 # total squad points (30 pts/model)
    },
    2: {
        "role": "Shock Elite / Veteran",
        "models": 3,
        "base": "40mm–50mm",
        "mov": 6, "ms": "3+", "rs": "3+", "arm": "3+", "might": 4, "ctrl": 2,
        "base_target_pts": 210 # total squad points (70 pts/model)
    },
    3: {
        "role": "Leader / Champion / Light Walker",
        "models": 1,
        "base": "60mm–80mm",
        "mov": 7, "ms": "2+", "rs": "3+", "arm": "3+", "might": 7, "ctrl": 3,
        "base_target_pts": 175
    },
    4: {
        "role": "Armored Behemoth / Tank",
        "models": 1,
        "base": "90mm–120mm",
        "mov": 8, "ms": "3+", "rs": "3+", "arm": "3+", "might": 12, "ctrl": 4,
        "hardened": True,
        "base_target_pts": 260
    },
    5: {
        "role": "Colossal / Super-Heavy Walker",
        "models": 1,
        "base": "130mm–160mm+",
        "mov": 10, "ms": "3+", "rs": "3+", "arm": "3+", "might": 20, "ctrl": 5,
        "hardened": True,
        "base_target_pts": 380
    }
}

def slugify(text):
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')

def load_checkpoint():
    if os.path.exists(CHECKPOINT_PATH):
        try:
            with open(CHECKPOINT_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    return {'completed_factions': [], 'last_updated': None}

def save_checkpoint(completed_ids):
    state = {
        'completed_factions': completed_ids,
        'last_updated': datetime.datetime.now().isoformat()
    }
    with open(CHECKPOINT_PATH, 'w', encoding='utf-8') as f:
        json.dump(state, f, indent=2)

def calculate_exact_4192_points(unit):
    # Prices with the calibrated 4192 dice engine in unit_calculator.py, so generated units use
    # exactly the same maths (MS/RS, flat wound, [HARDENED], 3+ cap, traits) as translated datasheets.
    from unit_calculator import price_4192
    st = unit.get('stats', {})
    card = {
        'name': unit['unit_name'], 'class': unit.get('class_num', 1), 'models': unit.get('model_count', 1),
        'MOV': unit.get('mov_inches', 6), 'MS': int(str(st.get('MS', '4+')).rstrip('+')),
        'RS': int(str(st.get('RS', '4+')).rstrip('+')), 'ARM': unit.get('arm_val', 4),
        'MIGHT': unit.get('might_per_model', 1), 'CTRL': unit.get('ctrl_per_model', 1),
        'HARDENED': unit.get('hardened', False), 'keywords': unit.get('keywords', []),
        'weapons': [{'name': w['name'], 'type': w.get('type', 'Melee'), 'A': str(w.get('atk', 1)),
                     'D': str(w.get('dmg', 1)), 'wound': w.get('wound', '4+'), 'pen': w.get('pen', '0'),
                     'traits': w.get('traits', [])} for w in unit.get('weapons', [])],
    }
    pts, _ = price_4192(card)
    return max(pts, 45)

def generate_deterministic_unit(faction, class_num, unit_name):
    cfg = CLASS_BENCHMARKS[class_num]
    core_trait = faction.get('core_battle_trait', {})
    inherent_kw = faction.get('inherent_keywords', [])

    # Adjust stats according to faction aesthetic
    mov = cfg['mov']
    ms = cfg['ms']
    rs = cfg['rs']
    arm = cfg['arm']
    might = cfg['might']
    ctrl = cfg['ctrl']
    models = cfg['models']

    # Faction flavor nudges
    ga = faction.get('grand_alliance', '')
    if 'Sol' in ga: # High armor, disciplined
        arm = '3+'
    elif 'Abyssal' in ga or 'Hellbreach' in ga: # High melee, fast
        mov += 1
        ms = '2+'
    elif 'Celestial' in ga: # High accuracy, mobility
        mov += 1
        rs = '3+'

    weapons = []
    if class_num == 1:
        # Line infantry
        weapons.append({
            "name": f"{unit_name} Heavy Bolter / Carbine",
            "type": "Ranged",
            "range": '24"',
            "atk": 2,
            "wound": "4+",
            "pen": "-1",
            "dmg": 1,
            "traits": ["[HAILFIRE 1]"]
        })
        weapons.append({
            "name": f"{unit_name} Combat Blades",
            "type": "Melee",
            "range": "Melee",
            "atk": 2,
            "wound": "4+",
            "pen": "0",
            "dmg": 1,
            "traits": []
        })
    elif class_num == 2:
        # Shock elite
        weapons.append({
            "name": f"{unit_name} Glaive / Cleaver",
            "type": "Melee",
            "range": "Melee",
            "atk": 4,
            "wound": "3+",
            "pen": "-2",
            "dmg": 2,
            "traits": ["[REAPING 1]"]
        })
        weapons.append({
            "name": f"{unit_name} Plasma Pistol",
            "type": "Ranged",
            "range": '12"',
            "atk": 2,
            "wound": "3+",
            "pen": "-2",
            "dmg": 2,
            "traits": ["[CLOSE-QUARTERS]"]
        })
    elif class_num == 3:
        # Hero / Champion
        weapons.append({
            "name": f"Relic Weapon of {unit_name}",
            "type": "Melee",
            "range": "Melee",
            "atk": 5,
            "wound": "2+",
            "pen": "-3",
            "dmg": 3,
            "traits": ["[IMPALING HITS]", "[CRASHING]"]
        })
        weapons.append({
            "name": f"Sidearm of the Champion",
            "type": "Ranged",
            "range": '12"',
            "atk": 3,
            "wound": "3+",
            "pen": "-2",
            "dmg": 2,
            "traits": ["[CLOSE-QUARTERS]"]
        })
    elif class_num == 4:
        # Armored Behemoth / Tank
        weapons.append({
            "name": f"Heavy Siege Ordnance",
            "type": "Ranged",
            "range": '36"',
            "atk": 6,
            "wound": "2+",
            "pen": "-3",
            "dmg": 3,
            "traits": ["[ONSLAUGHT 1]"]
        })
        weapons.append({
            "name": f"Crushing Chassis / Fist",
            "type": "Melee",
            "range": "Melee",
            "atk": 5,
            "wound": "2+",
            "pen": "-2",
            "dmg": 3,
            "traits": ["[ANTI-VEHICLE 2+]"]
        })
    elif class_num == 5:
        # Colossal / Titan
        weapons.append({
            "name": f"Apocalypse Beam / Battery",
            "type": "Ranged",
            "range": '48"',
            "atk": 10,
            "wound": "2+",
            "pen": "-3",
            "dmg": 4,
            "traits": ["[SHREDDING WOUNDS]"]
        })
        weapons.append({
            "name": f"Titan Stomp / Colossal Scythe",
            "type": "Melee",
            "range": "Melee",
            "atk": 8,
            "wound": "2+",
            "pen": "-3",
            "dmg": 4,
            "traits": ["[REAPING 3]"]
        })

    # Signature ability
    ability_name = f"{core_trait.get('name', 'Faction Discipline')}"
    ability_text = f"While this unit activates, it gains the benefit of {core_trait.get('name', 'Army Trait')}: {core_trait.get('rule', '')[:120]}."

    unit_draft = {
        "unit_name": unit_name,
        "base_class": f"Class {class_num}",
        "class_num": class_num,
        "role": cfg["role"],
        "base_size": cfg["base"],
        "model_count": models,
        "mov_inches": mov,
        "arm_val": int(arm.replace('+', '')),
        "might_per_model": might,
        "ctrl_per_model": ctrl,
        "hardened": cfg.get("hardened", False),
        "stats": {
            "MOV": f'{mov}"',
            "MS": ms,
            "RS": rs,
            "ARM": arm,
            "MIGHT": f"{might} per model" if models > 1 else str(might),
            "CTRL": f"{ctrl} per model" if models > 1 else str(ctrl)
        },
        "weapons": weapons,
        "abilities": [
            {
                "name": ability_name,
                "description": ability_text
            }
        ],
        "keywords": inherent_kw + [f"CLASS {class_num}", cfg["role"].split('/')[0].strip().upper()]
    }

    # Calculate exact mathematical points cost
    points = calculate_exact_4192_points(unit_draft)
    unit_draft["points"] = points
    return unit_draft

def generate_llm_enhanced_unit(client, faction, class_num, unit_name):
    # If client is not online, fallback to deterministic
    if not client.is_online():
        return generate_deterministic_unit(faction, class_num, unit_name)

    cfg = CLASS_BENCHMARKS[class_num]
    core_trait = faction.get('core_battle_trait', {})
    aesthetic = faction.get('aesthetic_hook', '')
    ga = faction.get('grand_alliance', '')
    proxy = faction.get('primary_proxy', '')

    system_prompt = f"""You are the Lead Rules Designer for 'Project Codex: 4192 AD (Iron & Wrath)', a hyper-tactical model-agnostic wargame.
Rules:
- 6-stat profile: MOV (inches), MS (e.g. 2+, 3+), RS (e.g. 2+, 3+, 4+), ARM (must be 3+, 4+, or 5+ - never 2+ due to 3+ Save Cap), MIGHT (hp), CTRL (objective control).
- Weapons have: name, type ('Melee' or 'Ranged'), range (e.g. '24"' or 'Melee'), atk (integer), wound ('2+', '3+', '4+', or '5+' flat), pen ('0', '-1', '-2', '-3'), dmg (integer), traits (list of traits from [HAILFIRE 1], [REAPING 1], [IMPALING HITS], [SCORCH], [ONSLAUGHT 1], [SHREDDING WOUNDS], [CRASHING], [CLOSE-QUARTERS]).
- Unit must fit the faction's grimdark heavy-metal aesthetic.
Output strictly JSON conforming to the requested schema."""

    prompt = f"""Generate a balanced {cfg['role']} (Class {class_num}, {cfg['models']} models) named '{unit_name}'.
Faction: {faction.get('name')} ({ga})
Proxy archetype: {proxy}
Aesthetic: {aesthetic}
Faction Core Trait: {core_trait.get('name')} - {core_trait.get('rule')}

Provide JSON in this exact structure:
{{
  "unit_name": "{unit_name}",
  "mov_inches": {cfg['mov']},
  "ms": "{cfg['ms']}",
  "rs": "{cfg['rs']}",
  "arm": "{cfg['arm']}",
  "might_per_model": {cfg['might']},
  "ctrl_per_model": {cfg['ctrl']},
  "weapons": [
    {{
      "name": "Weapon Name",
      "type": "Ranged or Melee",
      "range": "24\" or Melee",
      "atk": 2,
      "wound": "3+",
      "pen": "-1",
      "dmg": 1,
      "traits": ["[HAILFIRE 1]"]
    }}
  ],
  "ability_name": "Signature Ability Name",
  "ability_description": "Rules text of ability synergizing with {core_trait.get('name')}"
}}"""

    res = client.generate(prompt, system_prompt=system_prompt, json_mode=True)
    if not res or not isinstance(res, dict) or 'weapons' not in res:
        # Fallback to deterministic
        return generate_deterministic_unit(faction, class_num, unit_name)

    # Sanitize and validate
    mov = int(res.get('mov_inches', cfg['mov']))
    arm_str = res.get('arm', cfg['arm'])
    arm_num = int(re.sub(r'[^\d]', '', arm_str)) if re.search(r'\d', arm_str) else 4
    arm_num = max(arm_num, 3) # Strict 3+ save cap enforcement!

    might = int(res.get('might_per_model', cfg['might']))
    ctrl = int(res.get('ctrl_per_model', cfg['ctrl']))
    models = cfg['models']

    unit_draft = {
        "unit_name": res.get('unit_name', unit_name),
        "base_class": f"Class {class_num}",
        "class_num": class_num,
        "role": cfg["role"],
        "base_size": cfg["base"],
        "model_count": models,
        "mov_inches": mov,
        "arm_val": arm_num,
        "might_per_model": might,
        "ctrl_per_model": ctrl,
        "hardened": cfg.get("hardened", False),
        "stats": {
            "MOV": f'{mov}"',
            "MS": res.get('ms', cfg['ms']),
            "RS": res.get('rs', cfg['rs']),
            "ARM": f'{arm_num}+',
            "MIGHT": f"{might} per model" if models > 1 else str(might),
            "CTRL": f"{ctrl} per model" if models > 1 else str(ctrl)
        },
        "weapons": res.get('weapons', []),
        "abilities": [
            {
                "name": res.get('ability_name', core_trait.get('name', 'Combat Discipline')),
                "description": res.get('ability_description', core_trait.get('rule', ''))
            }
        ],
        "keywords": faction.get('inherent_keywords', []) + [f"CLASS {class_num}", cfg["role"].split('/')[0].strip().upper()]
    }

    points = calculate_exact_4192_points(unit_draft)
    unit_draft["points"] = points
    return unit_draft

def generate_faction_dossier(faction, client, mode="auto"):
    fid = faction['id']
    fname = faction['name']
    ga = faction['grand_alliance']
    archetypes = faction.get('archetype_units', {})

    print(f"[*] Processing Faction {fid}/25: {fname} ({ga})...")
    units = []

    for c in range(1, 6):
        key = f"class_{c}"
        unit_name = archetypes.get(key, f"{fname} Unit Class {c}")
        if mode == "math-only" or not client.is_online():
            u = generate_deterministic_unit(faction, c, unit_name)
        else:
            u = generate_llm_enhanced_unit(client, faction, c, unit_name)
        units.append(u)

    # Select Warlord variant (Class 3 or Class 2 hero elevated to Warlord)
    warlord_hero = dict(units[2]) # Class 3
    warlord_hero["unit_name"] = f"Grand Warlord of {fname}"
    warlord_hero["role"] = "Supreme Warlord Leader"
    warlord_hero["points"] = round(warlord_hero["points"] * 1.25 / 5.0) * 5
    warlord_hero["keywords"] = warlord_hero["keywords"] + ["WARLORD", "HERO"]

    total_1000_roster_pts = units[0]["points"] + units[1]["points"] + warlord_hero["points"] + units[3]["points"]

    dossier = {
        "faction_id": fid,
        "name": fname,
        "grand_alliance": ga,
        "primary_proxy": faction.get('primary_proxy', ''),
        "aesthetic_hook": faction.get('aesthetic_hook', ''),
        "core_battle_trait": faction.get('core_battle_trait', {}),
        "signature_reaction_card": faction.get('signature_reaction_card', {}),
        "inherent_keywords": faction.get('inherent_keywords', []),
        "units": units,
        "warlord": warlord_hero,
        "starter_roster_cost": total_1000_roster_pts,
        "generated_at": datetime.datetime.now().isoformat()
    }

    # Save Faction JSON
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    slug = slugify(fname)
    out_json = os.path.join(OUTPUT_DIR, f"{fid:02d}_{slug}.json")
    with open(out_json, 'w', encoding='utf-8') as f:
        json.dump(dossier, f, indent=2, ensure_ascii=False)

    # Save Faction Markdown
    out_md = os.path.join(OUTPUT_DIR, f"{fid:02d}_{slug}.md")
    render_faction_markdown(dossier, out_md)
    print(f"[✓] Faction {fid} written: {out_json} & {out_md} (1,000-pt Starter: {total_1000_roster_pts} pts)")
    return dossier

def render_faction_markdown(dossier, path):
    lines = []
    lines.append(f"# {dossier['name']} — Faction Dossier")
    lines.append(f"**Grand Alliance:** {dossier['grand_alliance']} | **Primary Proxy:** {dossier['primary_proxy']}")
    lines.append(f"**Aesthetic:** *{dossier['aesthetic_hook']}*\n")
    cbt = dossier['core_battle_trait']
    lines.append(f"### Core Battle Trait: **{cbt.get('name', 'Army Trait')}**")
    lines.append(f"* **Trigger:** {cbt.get('trigger', 'Passive')}")
    lines.append(f"* **Rule:** {cbt.get('rule', '')}\n")

    rc = dossier['signature_reaction_card']
    if rc:
        lines.append(f"### Signature Reaction Card: **{rc.get('name')}**")
        lines.append(f"* **Fury Cost:** {rc.get('fury_cost', 1)} | **Trigger:** {rc.get('trigger')} | **Effect:** {rc.get('effect')}\n")

    lines.append("## Unit Datasheets\n")
    for u in dossier['units']:
        lines.append(f"### {u['unit_name']} ({u['base_class']} — {u['points']} pts)")
        lines.append(f"* **Role:** {u['role']} | **Base:** {u['base_size']} | **Models:** {u['model_count']}")
        st = u['stats']
        lines.append(f"\n| MOV | MS | RS | ARM | MIGHT | CTRL |")
        lines.append(f"| :---: | :---: | :---: | :---: | :---: | :---: |")
        lines.append(f"| {st['MOV']} | {st['MS']} | {st['RS']} | {st['ARM']} | {st['MIGHT']} | {st['CTRL']} |\n")
        lines.append("* **Weapons:**")
        for w in u['weapons']:
            tr = f" | `{', '.join(w.get('traits', []))}`" if w.get('traits') else ""
            lines.append(f"  * **{w.get('name')} ({w.get('type')}):** Range: {w.get('range')} | Atk: {w.get('atk')} | Wound: {w.get('wound')} | Pen: {w.get('pen')} | Dmg: {w.get('dmg')}{tr}")
        if u.get('abilities'):
            lines.append("* **Abilities:**")
            for ab in u['abilities']:
                lines.append(f"  * **{ab.get('name')}:** {ab.get('description')}")
        lines.append(f"* **Keywords:** `{', '.join(u.get('keywords', []))}`\n---\n")

    with open(path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

def compile_master_compendium(all_dossiers):
    lines = []
    lines.append("# PROJECT CODEX: 4192 AD (IRON & WRATH) — MASTER FACTION COMPENDIUM")
    lines.append(f"*The Definitive 25-Faction Roster Library. Compiled on {datetime.date.today().isoformat()}.*\n")
    lines.append("## Quick Reference Matrix\n")
    lines.append("| ID | Faction Name | Grand Alliance | Primary Proxy | Starter 1,000-Pt Budget |")
    lines.append("| :---: | :--- | :--- | :--- | :---: |")
    for d in all_dossiers:
        lines.append(f"| {d['faction_id']} | **{d['name']}** | {d['grand_alliance']} | {d['primary_proxy']} | {d['starter_roster_cost']} pts |")

    lines.append("\n---\n")
    for d in all_dossiers:
        lines.append(f"## {d['faction_id']}. {d['name']} ({d['grand_alliance']})")
        lines.append(f"* **Proxy Minis:** {d['primary_proxy']}")
        lines.append(f"* **Core Trait:** **{d['core_battle_trait'].get('name')}**: {d['core_battle_trait'].get('rule')}")
        lines.append(f"* **Units:** {', '.join([u['unit_name'] + ' (' + str(u['points']) + ' pts)' for u in d['units']])}\n")

    with open(MASTER_MD_PATH, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print(f"[✓] Master compendium written to {MASTER_MD_PATH}")

def main():
    parser = argparse.ArgumentParser(description="Batch Unit & Faction Generator for Project Codex 4192 AD")
    parser.add_argument('--mode', choices=['auto', 'llm', 'math-only'], default='auto', help="Generation engine mode")
    parser.add_argument('--model', type=str, help="Ollama model name (e.g. qwen2.5, llama3)")
    parser.add_argument('--limit', type=int, help="Limit number of factions to process")
    parser.add_argument('--force', action='store_true', help="Ignore checkpoint and regenerate all")
    args = parser.parse_args()

    client = LocalLLMClient(model=args.model)
    print("=" * 60)
    print(" PROJECT CODEX: 4192 AD — UNATTENDED BATCH FACTION GENERATOR")
    print("=" * 60)
    print(f"Mode: {args.mode}")
    print(f"Local LLM Online: {client.is_online()} (Model: {client.model if client.is_online() else 'N/A'})")

    if not os.path.exists(FACTION_DB_PATH):
        print(f"[!] Faction database not found at {FACTION_DB_PATH}")
        sys.exit(1)

    with open(FACTION_DB_PATH, 'r', encoding='utf-8') as f:
        factions = json.load(f)

    checkpoint = load_checkpoint() if not args.force else {'completed_factions': []}
    completed_ids = set(checkpoint.get('completed_factions', []))
    print(f"Existing completed factions in checkpoint: {len(completed_ids)}/25")

    factions_to_process = [f for f in factions if f['id'] not in completed_ids]
    if args.limit:
        factions_to_process = factions_to_process[:args.limit]

    print(f"Factions to process this run: {len(factions_to_process)}")

    all_dossiers = []
    # Load already completed dossiers for master compendium
    for f in factions:
        slug = slugify(f['name'])
        fpath = os.path.join(OUTPUT_DIR, f"{f['id']:02d}_{slug}.json")
        if os.path.exists(fpath):
            try:
                with open(fpath, 'r', encoding='utf-8') as fp:
                    all_dossiers.append(json.load(fp))
            except Exception:
                pass

    for faction in factions_to_process:
        try:
            dossier = generate_faction_dossier(faction, client, mode=args.mode)
            completed_ids.add(faction['id'])
            save_checkpoint(list(completed_ids))
            all_dossiers.append(dossier)
        except Exception as e:
            print(f"[!] Error processing faction {faction['id']}: {e}")

    compile_master_compendium(all_dossiers)
    print("=" * 60)
    print(f"[✓] Batch run complete! Total completed factions: {len(completed_ids)}/25")
    print(f"Outputs saved in {OUTPUT_DIR} and {MASTER_MD_PATH}")
    print("=" * 60)

if __name__ == '__main__':
    main()
