#!/usr/bin/env python3
"""
build_game_data.py — turns the game (../gametheory) into the website's data files.

    cd website && python3 scripts/build_game_data.py

Reads  ../gametheory/factions/NN_*.json + the points calculator (gametheory/scripts/unit_calculator.py)
Writes data/factions/<Faction>.json   (one per faction, format: data/SCHEMA.md)
       app.js → const FACTIONS          (the faction picker: name, Grand Alliance, colour)
       data_version.js                  (bumped, so phones re-download the new data)
       + everything build_rules_data.py writes (rules, missions, Core Tactics, keyword glossary)
Re-run it whenever the rules or points change: nothing here is edited by hand.

4192 stats are stored in the template's field names where the code already reads them:
  weapon BS = the hit roll (the unit's RS for ranged, MS for melee), S = the wound roll, AP = PEN;
  model M = MOV, Sv = ARM, W = MIGHT, OC = CTRL. The datasheet `stats` boxes use the 4192 names.
"""
import hashlib
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))
GT = os.path.abspath(os.path.join(SITE, '..', 'gametheory'))
sys.path.insert(0, os.path.join(GT, 'scripts'))
import unit_calculator as U  # noqa: E402

ALLIANCES = [  # (faction numbers, Grand Alliance)
    (range(1, 6), 'Crown of Solis'), (range(6, 11), 'Nocturne Covenants'), (range(11, 16), 'Hellbreach Legions'),
    (range(16, 21), 'Celestial Dominion'), (range(21, 26), 'Voidborn Convergence')]
COLORS = {  # one readable accent colour per faction (dark UI)
    1: '#e5b93f', 2: '#8a9a5b', 3: '#e2683c', 4: '#4f8fd6', 5: '#2bb3a8', 6: '#c2324a', 7: '#9c8f6e', 8: '#5fb36b',
    9: '#7fc8e8', 10: '#d9a441', 11: '#e0412f', 12: '#7a9b3a', 13: '#b56b2e', 14: '#5b6ee8', 15: '#d65fa8',
    16: '#f2d26b', 17: '#3fbf8f', 18: '#c9853a', 19: '#9bc23c', 20: '#9a6ad6', 21: '#a3a9b4', 22: '#e8e4dc',
    23: '#b24bd1', 24: '#88c040', 25: '#6d7cff'}
CLASS_ROLE = {1: 'Class 1 · Infantry', 2: 'Class 2 · Elites', 3: 'Class 3 · Heavy', 4: 'Class 4 · Vehicles & Monsters',
              5: 'Class 5 · Colossal'}


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def plus(v):
    return f'{v}+' if isinstance(v, (int, float)) or str(v).isdigit() else str(v)


def cap(t):
    return t[:1].upper() + t[1:]


def clean_kw(k):
    return k.strip('[]').strip()


def faction_name(fac):
    return re.sub(r'^The ', '', fac['name'])


def banner(num):
    """assets/banners/<faction number>.jpg when that picture exists (prompts: BANNER_PROMPTS_GEMINI.md), else the default."""
    for ext in ('jpg', 'webp', 'png'):
        if os.path.exists(os.path.join(SITE, 'assets', 'banners', f'{num}.{ext}')):
            return f'assets/banners/{num}.{ext}'
    return 'assets/banners/0.jpg'


def alliance(num):
    for rng, name in ALLIANCES:
        if num in rng:
            return name
    return 'Unaligned'


def unit_points(entry, lib, calib, fac):
    """[(models, points)] for every legal squad size, from the calculator."""
    e = U.with_faction_rules(entry, fac)
    card, (lo, hi) = U.build_card(e, lib)
    out = []
    for n in range(lo, hi + 1):
        c, _ = U.build_card(e, lib, n)
        out.append((n, U.price_card(c, calib)['points']))
    return out, card


def datasheet(entry, fac, fname, lib, calib, leaders_by_class, units_by_class):
    sizes, card = unit_points(entry, lib, calib, fac)
    c = card['class']
    leader = 'leader' in entry.get('role', '').lower()
    role = 'Leader' if leader else ('Battleline' if entry.get('battleline') else CLASS_ROLE[c])
    stats = {'CLASS': str(c), 'MOV': f'{card["MOV"]}"', 'MS': plus(card['MS']), 'RS': plus(card['RS']), 'ARM': plus(card['ARM']),
             'MIGHT': str(card['MIGHT']), 'CTRL': str(card['CTRL'])}
    if card.get('WARD'):
        stats['WARD'] = plus(card['WARD'])
    if card.get('UNYIELDING'):
        stats['UNY'] = plus(card['UNYIELDING'])
    kws = [f'Class {c}', entry.get('role', '').split(' (')[0]] + (['Leader'] if leader else []) + \
          (['Battleline'] if entry.get('battleline') else []) + [clean_kw(k) for k in card.get('keywords', [])] + \
          (['HARDENED'] if card.get('HARDENED') or c >= 4 else []) + [entry['name']]
    kws = list(dict.fromkeys(k for k in kws if k))   # drop blanks and repeats, keep order
    weapons = []
    for w in card['weapons']:
        ranged = w['type'] == 'Ranged'
        weapons.append({'name': w['name'], 'type': w['type'], 'range': w.get('range', '') if ranged else 'Melee',
                        'A': str(w['A']), 'BS': plus(card['RS'] if ranged else card['MS']), 'S': str(w['wound']),
                        'AP': str(w.get('pen', '0')), 'D': str(w['D']), 'keywords': [clean_kw(t) for t in w.get('traits', [])],
                        'models': [entry['name']]})
    abilities = [{'name': fac['core_rule']['name'], 'description': 'Army rule — see the faction rules.', 'type': 'faction'}]
    for k in card.get('keywords', []):
        if k.upper().strip('[]') not in ('FLY', 'HARDENED'):
            abilities.append({'name': clean_kw(k), 'description': '', 'type': 'core'})
    for a in entry.get('abilities', []):
        if a.get('name'):
            abilities.append({'name': a['name'], 'description': a.get('text', ''), 'type': 'datasheet'})
    lo, hi = sizes[0][0], sizes[-1][0]
    comp_txt = f'■ **{lo} {entry["name"]}**' if lo == hi else f'■ **{lo}–{hi} models**'
    model = {'name': entry['name'], 'M': stats['MOV'], 'T': '-', 'Sv': stats['ARM'], 'W': stats['MIGHT'], 'Ld': '-', 'OC': stats['CTRL'],
             'MOV': stats['MOV'], 'MS': stats['MS'], 'RS': stats['RS'], 'ARM': stats['ARM'], 'MIGHT': stats['MIGHT'], 'CTRL': stats['CTRL'],
             **{k: stats[k] for k in ('WARD', 'UNY') if k in stats},
             'equipped': [{'item': w['name'], 'count': 1} for w in weapons], 'optional': []}
    ds = {'id': f'{fac["number"]}-{slug(entry["name"])}', 'name': entry['name'], 'role': role, 'composition': comp_txt, 'lore': '',
          'stats': stats, 'invuln': '-', 'keywords': kws, 'factionKeywords': [fname], 'abilities': abilities,
          'weapons': weapons, 'points': sizes[0][1], 'pointsSource': 'Calculated (gametheory/scripts/unit_calculator.py)',
          'compositions': [{'default': i == 0, 'points': p, 'models': [{'name': entry['name'], 'min': n, 'max': n}]} for i, (n, p) in enumerate(sizes)],
          'models': [model], 'options': [], 'ledBy': [], 'leads': [], 'rules': [], 'faq': [], 'class': c}
    if leader:   # a Leader joins a same-Class bodyguard unit (core rules)
        ds['leads'] = [{'type': 'leader', 'units': units_by_class.get(c, [])}]
    else:
        ds['ledBy'] = leaders_by_class.get(c, [])
    return ds, card


def detachments(fac, cards, lib, calib):
    out = []
    for i, d in enumerate(fac.get('detachments', []), 1):
        did = f'{fac["number"]}-det{i}'
        rule = d['rule']
        rname, _, rtext = rule.partition(':') if ':' in rule[:60] else (d['name'], '', rule)
        enh = []
        for j, en in enumerate(d.get('enhancements', []), 1):
            cost = U.price_enhancement(cards[en['bearer']], en['ability'], calib) if en['bearer'] in cards else 10
            enh.append({'id': f'{did}-e{j}', 'name': en['name'], 'cost': cost, 'description': f"**{en['bearer']}** only. {en['text']}",
                        'lore': '', 'requires': [{'keywords': [], 'faction': [faction_name(fac)], 'datasheet': en['bearer']}]})
        strats = [{'id': f'{did}-s{j}', 'name': s['name'], 'cost': str(s['cp']), 'category': None, 'when': 'eitherPlayer',
                   'turn': s['when'], 'target': '', 'effect': s['effect'], 'restriction': '', 'lore': ''}
                  for j, s in enumerate(d.get('stratagems', []), 1)]
        out.append({'id': did, 'name': d['name'], 'cost': 1,   # 1 DP; the army builder allows 1 DP = one Detachment
                    'playstyle': d.get('playstyle', ''),
                    'rules': [{'id': f'{did}-r1', 'name': rname.strip(), 'description': cap((rtext or rule).strip())}],
                    'enhancements': enh, 'stratagems': strats})
    return out


def build():
    calib, lib = U.load_calibration(), U.load_library()
    os.makedirs(os.path.join(SITE, 'data', 'factions'), exist_ok=True)
    factions_js = []
    files = sorted(f for f in os.listdir(os.path.join(GT, 'factions')) if re.match(r'^\d\d_.*\.json$', f))
    total_units = 0
    for f in files:
        fac = json.load(open(os.path.join(GT, 'factions', f), encoding='utf-8'))
        fac.setdefault('number', f[:2])
        num = int(f[:2])
        fname = faction_name(fac)
        leaders_by_class, units_by_class = {}, {}
        for e in fac['units']:
            (leaders_by_class if 'leader' in e.get('role', '').lower() else units_by_class).setdefault(e['class'], []).append(e['name'])
        sheets, cards = [], {}
        for e in fac['units']:
            ds, card = datasheet(e, fac, fname, lib, calib, leaders_by_class, units_by_class)
            sheets.append(ds)
            cards[e['name']] = U.build_card(U.with_faction_rules(e, fac), lib)[0]
        rules = [{'name': fac['core_rule']['name'], 'description': fac['core_rule']['text']}]
        if fac.get('gamble'):
            g = fac['gamble']
            rules.append({'name': f"Gamble — {g['name']}", 'description': g['text'] + (f" (Risk: {g['risk_cost']}.)" if g.get('risk_cost') else '')})
        data = {'name': fname, 'factionKeyword': fname, 'verb': fac.get('verb', ''), 'identity': fac.get('identity', ''),
                'sources': ['Project 4192 — gametheory/factions/' + f, 'Points: gametheory/scripts/unit_calculator.py'],
                'rules': rules, 'detachments': detachments(fac, cards, lib, calib), 'datasheets': sheets, 'faq': []}
        json.dump(data, open(os.path.join(SITE, 'data', 'factions', fname + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        factions_js.append({'id': num, 'group': alliance(num), 'name': fname, 'banner': banner(num), 'color': COLORS.get(num, '#c8a24a')})
        total_units += len(sheets)
        print(f'  {num:02d} {fname}: {len(sheets)} datasheets, {len(data["detachments"])} detachments')
    # example files go once real factions exist
    for ex in ('Example Faction.json', 'Second Faction.json'):
        p = os.path.join(SITE, 'data', 'factions', ex)
        if os.path.exists(p):
            os.remove(p)
    # FACTIONS list in app.js
    app = os.path.join(SITE, 'app.js')
    s = open(app, encoding='utf-8').read()
    q = lambda v: "'" + str(v).replace('\\', '\\\\').replace("'", "\\'") + "'"   # the template's style (predeploy_check.js reads it)
    body = 'const FACTIONS = [\n' + ',\n'.join(
        f"    {{ id: {x['id']}, group: {q(x['group'])}, name: {q(x['name'])}, banner: {q(x['banner'])}, color: {q(x['color'])} }}" for x in factions_js) + '\n];'
    s = re.sub(r'const FACTIONS = \[.*?\n\];', lambda m: body, s, count=1, flags=re.S)
    open(app, 'w', encoding='utf-8').write(s)
    # data version: devices drop their saved copies when the datasheets change
    h = hashlib.sha1()
    for fn in sorted(os.listdir(os.path.join(SITE, 'data', 'factions'))):
        h.update(fn.encode()); h.update(open(os.path.join(SITE, 'data', 'factions', fn), 'rb').read())
    open(os.path.join(SITE, 'data_version.js'), 'w', encoding='utf-8').write(
        f"window.BL_DATA_V = '{h.hexdigest()[:10]}';   // generated by scripts/build_game_data.py — changes whenever the datasheet files change, so devices drop their old saved copies\n")
    print(f'[✓] {len(factions_js)} factions, {total_units} datasheets → data/factions/, FACTIONS updated in app.js')


if __name__ == '__main__':
    build()
    import build_rules_data   # rules, missions, Core Tactics, keyword glossary
    build_rules_data.build()
