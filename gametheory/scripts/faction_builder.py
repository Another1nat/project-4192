#!/usr/bin/env python3
"""
faction_builder.py — turns compact faction specs (gametheory/factions/specs/*.py) into full faction files
(gametheory/factions/NN_slug.json) that unit_calculator.py (validate / faction / registry) and battle_sim.py read.

Why: 25 factions × 20–30 units is ~500 datasheets. Writing each by hand invites drift and unpriced text.
Here every unit = universal archetype + faction Stat DNA + overrides + abilities from ONE priced library (AB),
so every ability has a points value the calculator can compute.

    python3 faction_builder.py            # build every spec, then validate + price each faction
    python3 faction_builder.py 08 22      # build only some
"""
import importlib.util
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import unit_calculator as U  # noqa: E402

FAC_DIR = os.path.join(U.ROOT, 'gametheory', 'factions')
SPEC_DIR = os.path.join(FAC_DIR, 'specs')

# ---------------------------------------------------------------------------
# Ability library: key -> priced ability skeleton (mods / utility / buff / flat). Text comes from the spec.
# ---------------------------------------------------------------------------
def _m(mods, scope='all', uptime=1.0):
    return {'mods': mods, 'scope': scope, 'uptime': uptime}


def _b(mods, scope='all', n_eff=1.0, uptime=1.0):
    return {'buff': True, 'mods': mods, 'scope': scope, 'n_eff': n_eff, 'uptime': uptime}


AB = {
    # offense — melee
    'hit_m_charge': _m({'hit_mod': 1}, 'melee', 0.5), 'hit_m': _m({'hit_mod': 1}, 'melee'),
    'wnd_m_charge': _m({'wound_mod': 1}, 'melee', 0.5), 'wnd_m': _m({'wound_mod': 1}, 'melee'),
    'atk_m_charge': _m({'attacks_mod': 1}, 'melee', 0.5), 'atk_m': _m({'attacks_mod': 1}, 'melee'),
    'atk2_m_charge': _m({'attacks_mod': 2}, 'melee', 0.5), 'atk_m_damaged': _m({'attacks_mod': 1}, 'melee', 0.5),
    'dmg_m_charge': _m({'dmg_mod': 1}, 'melee', 0.5), 'pen_m': _m({'pen_mod': 1}, 'melee'),
    # a critical hit only matters with a crit trait, so crit-5+ abilities always carry one: _leth = [IMPALING HITS], _sus = [ONSLAUGHT 1]
    'crit5_m': _m({'crit_hit_on': 5, 'lethal': True}, 'melee'), 'crit5_m_half': _m({'crit_hit_on': 5, 'lethal': True}, 'melee', 0.5),
    'crit5_sus_m': _m({'crit_hit_on': 5, 'sustained': 1}, 'melee'), 'crit5_sus_r': _m({'crit_hit_on': 5, 'sustained': 1}, 'ranged'),
    'sus1_m': _m({'sustained': 1}, 'melee'), 'leth_m': _m({'lethal': True}, 'melee'), 'dev_m': _m({'devastating': True}, 'melee'),
    'rr1_m': _m({'reroll_hit': 'ones'}, 'melee'), 'rrw1_m': _m({'reroll_wound': 'ones'}, 'melee'), 'rrwall_m': _m({'reroll_wound': 'all'}, 'melee'),
    # offense — ranged
    'hit_r_still': _m({'hit_mod': 1}, 'ranged', 0.5), 'hit_r': _m({'hit_mod': 1}, 'ranged'),
    'wnd_r': _m({'wound_mod': 1}, 'ranged', 0.4), 'pen_r': _m({'pen_mod': 1}, 'ranged'), 'pen_r_half': _m({'pen_mod': 1}, 'ranged', 0.5),
    'rr1_r': _m({'reroll_hit': 'ones'}, 'ranged'), 'rrall_r': _m({'reroll_hit': 'all'}, 'ranged'), 'rrw1_r': _m({'reroll_wound': 'ones'}, 'ranged'),
    'sus1_r': _m({'sustained': 1}, 'ranged'), 'leth_r': _m({'lethal': True}, 'ranged'), 'dev_r': _m({'devastating': True}, 'ranged'),
    'crit5_r': _m({'crit_hit_on': 5, 'lethal': True}, 'ranged'), 'atk_r_half': _m({'attacks_mod': 1}, 'ranged', 0.5),
    'dmg_r_half': _m({'dmg_mod': 1}, 'ranged', 0.5),
    # offense — all
    'rr1_all': _m({'reroll_hit': 'ones'}), 'pen_all_half': _m({'pen_mod': 1}, 'all', 0.5),
    # defense
    'ward5': _m({'ward': 5}, 'defense'), 'ward6': _m({'ward': 6}, 'defense'), 'ward4': _m({'ward': 4}, 'defense'),
    'uny6': _m({'unyielding': 6}, 'defense'), 'uny5': _m({'unyielding': 5}, 'defense'),
    'dmgm1': _m({'incoming_dmg_mod': -1}, 'defense'), 'stealth': _m({'incoming_hit_mod_ranged': -1}, 'defense'),
    'parry': _m({'incoming_hit_mod_melee': -1}, 'defense'), 'save1': _m({'save_mod': 1}, 'defense'),
    'save1_half': _m({'save_mod': 1}, 'defense', 0.5), 'tough': _m({'incoming_wound_mod': 1}, 'defense'),
    'move2': _m({'move_mod': 2}, 'defense'), 'move1': _m({'move_mod': 1}, 'defense'),
    # utility (non-dice; priced from the UTILITY table)
    'infil': {'utility': 'INFILTRATORS'}, 'scouts': {'utility': 'SCOUTS'}, 'deep': {'utility': 'VANGUARD STRIKE'},
    'unseen': {'utility': 'UNSEEN'}, 'first': {'utility': 'STRIKE FIRST'}, 'secured': {'utility': 'SECURED'},
    'suppimm': {'utility': 'SUPPRESS IMMUNE'}, 'surge': {'utility': 'SURGE'}, 'glide': {'utility': 'GLIDE'},
    'fallback': {'utility': 'FALL BACK AND ACT'}, 'phase': {'utility': 'PHASE'},
    # leader buffs (attached unit) and auras (≈2.2 units)
    'B_rr1_r': _b({'reroll_hit': 'ones'}, 'ranged'), 'B_rr1_all': _b({'reroll_hit': 'ones'}), 'B_rr1_m': _b({'reroll_hit': 'ones'}, 'melee'),
    'B_rrw1_m': _b({'reroll_wound': 'ones'}, 'melee'), 'B_rrw1_all': _b({'reroll_wound': 'ones'}),
    'B_hit_m': _b({'hit_mod': 1}, 'melee'), 'B_hit_r': _b({'hit_mod': 1}, 'ranged'), 'B_wnd_m': _b({'wound_mod': 1}, 'melee', uptime=0.5),
    'B_atk_m': _b({'attacks_mod': 1}, 'melee'), 'B_sus_m': _b({'sustained': 1}, 'melee'), 'B_leth_r': _b({'lethal': True}, 'ranged'),
    'B_pen_m': _b({'pen_mod': 1}, 'melee'), 'B_pen_r': _b({'pen_mod': 1}, 'ranged'),
    'B_ward5': _b({'ward': 5}, 'defense'), 'B_uny6': _b({'unyielding': 6}, 'defense'), 'B_uny5': _b({'unyielding': 5}, 'defense'),
    'B_stealth': _b({'incoming_hit_mod_ranged': -1}, 'defense'), 'B_move': _b({'move_mod': 2}, 'defense'),
    'AU_hit_m': _b({'hit_mod': 1}, 'melee', 2.2, 0.6), 'AU_hit_r': _b({'hit_mod': 1}, 'ranged', 2.2, 0.6),
    'AU_wnd_m': _b({'wound_mod': 1}, 'melee', 2.2, 0.5), 'AU_atk_m': _b({'attacks_mod': 1}, 'melee', 2.2, 0.6),
    'AU_uny6': _b({'unyielding': 6}, 'defense', 2.2, 0.6), 'AU_stealth': _b({'incoming_hit_mod_ranged': -1}, 'defense', 2.2, 0.6),
    'AU_save1': _b({'save_mod': 1}, 'defense', 2.2, 0.6), 'AU_rr1_all': _b({'reroll_hit': 'ones'}, 'all', 2.2, 0.6),
}


def ability(key, name, text, kw=None):
    """key = AB entry | 'flat:8' (raw pts for effects dice can't model) | 'custom' (mods/scope/uptime/buff/n_eff in kw)
    | 'text' (flavour only, unpriced). kw overrides any field, e.g. {'uptime': 0.3}."""
    kw = dict(kw or {})
    if key.startswith('flat:'):
        a = {'flat': float(key.split(':')[1])}
    elif key == 'text':
        a = {}
    elif key == 'custom':
        a = {'scope': 'all', 'uptime': 1.0}
    else:
        a = json.loads(json.dumps(AB[key]))
    a.update(kw)
    a.update({'name': name, 'text': text})
    return a


def load_spec(path):
    sys.path.insert(0, SPEC_DIR)
    spec = importlib.util.spec_from_file_location(os.path.basename(path)[:-3], path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.FACTIONS


def skin_weapons(weapons, lib, skin):
    """lib id -> library weapon renamed by the faction skin; {'_lib': id, 'name': .., changes} -> edited copy."""
    out = []
    for w in weapons:
        if isinstance(w, str):
            d = dict(lib[w])
            d['name'] = skin.get(w, d['name'])
        elif '_lib' in w:
            d = dict(lib[w['_lib']])
            d.update({k: v for k, v in w.items() if k != '_lib'})
        else:
            d = dict(w)
        d.setdefault('traits', [])
        d['traits'] = list(d['traits'])
        out.append(d)
    return out


ENV = json.load(open(os.path.join(U.CAT_DIR, 'design_rules.json'), encoding='utf-8'))['envelopes']
CLAMPS = []


def clamp(e):
    env = ENV[str(e['class'])]
    leader = 'leader' in e.get('role', '').lower()
    for k, rng in (('MOV', env['MOV']), ('CTRL', env['CTRL']), ('ARM', env['ARM']), ('MS', env['MS']), ('RS', env['RS']),
                   ('MIGHT', env['MIGHT_leader' if leader else 'MIGHT'])):
        v = min(max(e[k], rng[0]), rng[1])
        if v != e[k]:
            CLAMPS.append(f"{e['name']}: {k} {e[k]}->{v}")
            e[k] = v


def build_unit(u, arche, lib, dna, skin, slot):
    """u = dict(name, arch, models?, stats overrides..., ab=[(key, name, text), ...], weapons?, keywords?)."""
    base = arche[u['arch']]
    over = {k: v for k, v in u.items() if k not in ('name', 'arch', 'ab', 'models', 'slot', 'bl')}
    e = U.apply_dna(base, dna, over)
    e.pop('id', None)
    e.pop('archetype', None)
    e.pop('proxies', None)
    e['name'] = u['name']
    e['slot'] = u.get('slot', slot)
    if u.get('models'):
        e['models'] = u['models']
    e['weapons'] = skin_weapons(e['weapons'], lib, skin)
    if u.get('keywords'):        # an explicit [TRANSPORT n] / [FIRING DECK n] / [SCOUTS n] replaces the archetype's
        for pre in ('[TRANSPORT', '[FIRING DECK', '[SCOUTS', '[SURGE', '[UNSEEN', '[DETONATE'):
            if any(k.startswith(pre) for k in u['keywords']):
                e['keywords'] = [k for k in e['keywords'] if not k.startswith(pre) or k in u['keywords']]
    e['abilities'] = [ability(*a) for a in u.get('ab', [])]
    if u.get('bl'):
        e['battleline'] = True
    if e['class'] >= 4:
        e['HARDENED'] = True
    clamp(e)
    return e


def build(fs, arche, lib):
    if fs.get('append_to'):
        return append_release(fs, arche, lib)
    units = [build_unit(u, arche, lib, fs['dna'], fs.get('skin', {}), i + 1) for i, u in enumerate(fs['units'])]
    names = {u['name'] for u in units}
    dets = []
    for d in fs['detachments']:
        enh = []
        for en in d['enh']:
            n, bearer, key, text = en[:4]
            assert bearer in names, f"{fs['name']}: enhancement bearer {bearer} missing"
            enh.append({'name': n, 'bearer': bearer, 'ability': ability(key, n, text, en[4] if len(en) > 4 else None), 'text': text})
        dets.append({'name': d['name'], 'playstyle': d['play'], 'rule': d['rule'], 'enhancements': enh,
                     'stratagems': [{'name': n, 'cp': cp, 'when': w, 'effect': e} for n, cp, w, e in d['strats']]})
    fac = {k: fs[k] for k in ('name', 'verb', 'identity') if k in fs}
    fac.update({'number': fs['num'], 'template': fs.get('template'), 'status': fs.get('status', 'draft'),
                'learned_from': fs.get('learned', []), 'risk_profile': fs.get('risk', ''),
                'core_rule': fs['core'], 'gamble': fs.get('gamble'),
                'faction_abilities': [ability(*a) for a in fs.get('army', [])],
                'units': units, 'detachments': dets})
    return fac


def append_release(fs, arche, lib):
    """Release factions: keep the hand-made file, replace/append units by name, optionally revise rules."""
    path = os.path.join(FAC_DIR, fs['append_to'])
    fac = json.load(open(path, encoding='utf-8'))
    have = {u['name']: i for i, u in enumerate(fac['units'])}
    for u in fs['units']:
        e = build_unit(u, arche, lib, fs['dna'], fs.get('skin', {}), len(fac['units']) + 1)
        if u['name'] in have:
            e['slot'] = fac['units'][have[u['name']]].get('slot', e['slot'])
            fac['units'][have[u['name']]] = e
        else:
            fac['units'].append(e)
            have[u['name']] = len(fac['units']) - 1
    for k in ('core_rule', 'gamble'):
        if fs.get(k):
            fac[k] = fs[k]
    if 'army' in fs:
        fac['faction_abilities'] = [ability(*a) for a in fs['army']]
    for name, patch in fs.get('patch_units', {}).items():
        u = fac['units'][have[name]]
        if 'ab' in patch:
            u['abilities'] = [ability(*a) for a in patch.pop('ab')]
        u.update(patch)
    fac['_out'] = path
    return fac


def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower().replace('the ', '')).strip('_')


def main():
    only = set(sys.argv[1:])
    lib = U.load_library()
    arche = {a['id']: a for a in json.load(open(os.path.join(U.CAT_DIR, 'unit_archetypes.json'), encoding='utf-8'))}
    built = []
    for path in sorted(glob.glob(os.path.join(SPEC_DIR, '*.py'))):
        for fs in load_spec(path):
            if only and fs['num'] not in only:
                continue
            fac = build(fs, arche, lib)
            out = fac.pop('_out', None) or os.path.join(FAC_DIR, f"{fs['num']}_{slug(fs['name'])}.json")
            json.dump(fac, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
            built.append(out)
            print(f"[built] {fs['num']} {fs['name']}: {len(fac['units'])} datasheets, {len(fac['detachments'])} detachments")
    for c in CLAMPS:
        print('  [clamped]', c)
    return built


if __name__ == '__main__':
    main()
