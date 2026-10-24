#!/usr/bin/env python3
"""
role_lab.py — judge every datasheet in its ROLE, not against a single average.

For each unit: expected points destroyed per activation, per own point, against 6 target types (calculator, with
cover, overkill cap, traits, abilities). The unit's role is its best matchup relative to all units. Then:
  1. within-role ranking (a flamer is compared with other chaff-killers, a lance with other tank-killers);
  2. intent check: names that promise a job (Hunter, Lance, Melta, Flame, Sniper…) vs the role the weapons deliver;
  3. simulator check (optional JSON from `battle_sim.py units --all --json`): damage dealt per point against
     Class 1 / 2 / 3 / 4–5 targets — do specialists actually do their job in played games?
  4. range: does the simulator reward weapon range, and does the price?

    python3 role_lab.py [units.json]       # writes gametheory/ROLE_REPORT.md
"""
import json
import math
import os
import re
import statistics
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import unit_calculator as U  # noqa: E402

ROOT = os.path.join(U.ROOT, 'gametheory')
TARGETS = {   # 4192 defender profiles + the archetype that sets their points per MIGHT
    'horde':   (dict(sv=6, ward=None, fnp=None, W=1, models=10, hardened=False, kw={'INFANTRY'}, cover_ok=True), 'c1_swarm'),
    'line':    (dict(sv=4, ward=None, fnp=None, W=1, models=10, hardened=False, kw={'INFANTRY'}, cover_ok=True), 'c1_line'),
    'elite':   (dict(sv=3, ward=None, fnp=None, W=2, models=5, hardened=False, kw={'INFANTRY'}, cover_ok=True), 'c1_battle_brothers'),
    'heavy':   (dict(sv=3, ward=4, fnp=None, W=4, models=3, hardened=False, kw={'INFANTRY'}, cover_ok=True), 'c2_heavy_infantry'),
    'monster': (dict(sv=4, ward=None, fnp=None, W=14, models=1, hardened=True, kw={'MONSTER'}), 'c4_behemoth_beast'),
    'vehicle': (dict(sv=3, ward=None, fnp=None, W=16, models=1, hardened=True, kw={'VEHICLE'}), 'c4_battle_tank'),
}
ROLE_OF = {'horde': 'anti-horde', 'line': 'anti-infantry', 'elite': 'anti-elite', 'heavy': 'anti-elite',
           'monster': 'anti-armour', 'vehicle': 'anti-armour'}
INTENT = [  # (regex on unit name, roles it promises)
    (r'hunter|lance|melta|thermal|las|rail|fusion|destroyer|tank-hunter|harpoon|anti', {'anti-armour', 'anti-elite'}),
    (r'flame|pyre-cannon|inferno|scorch|burn|spewer|blunderbuss|gas', {'anti-horde', 'anti-infantry'}),
    (r'sniper|marksm|long-rifle|sharpshoot', {'anti-elite', 'anti-infantry'}),
    (r'mortar|bombard|howitzer|lobba', {'anti-horde', 'anti-infantry', 'anti-elite'}),
]


def target_pts_per_might(lib, calib):
    out = {}
    arche = {a['id']: a for a in json.load(open(os.path.join(U.CAT_DIR, 'unit_archetypes.json'), encoding='utf-8'))}
    for t, (d, aid) in TARGETS.items():
        a = dict(arche[aid], name=aid)
        card, r, (lo, hi), pm = U.price_entry(a, lib, calib)
        out[t] = r['points'] / (card['MIGHT'] * card['models'])
    return out


def profile(card):
    """Expected MIGHT removed per activation vs each target: max(Shoot, Fight), abilities included at their uptime."""
    mods = [(a['mods'], a.get('scope', 'all')) for a in card.get('abilities', [])
            if a.get('mods') and not a.get('buff') and a.get('uptime', 1.0) >= 0.5]
    unit = U.card_to_unit(card, mods)
    saved, saved_mix = U.BENCH_TARGETS['4192'], U.DPA_MIX
    U.BENCH_TARGETS['4192'] = {t: d for t, (d, _) in TARGETS.items()}
    U.DPA_MIX = {t: 1.0 / len(TARGETS) for t in TARGETS}
    try:
        _, _, res = U.unit_dpa('4192', unit)
    finally:
        U.BENCH_TARGETS['4192'], U.DPA_MIX = saved, saved_mix
    return {t: max(v['ranged'], v['melee']) for t, v in res.items()}, \
        {t: v['ranged'] for t, v in res.items()}, {t: v['melee'] for t, v in res.items()}


def max_range(card):
    return max([U.target_num(w.get('range', '0'), 0) for w in card['weapons'] if w['type'] == 'Ranged'] or [0])


def compute_rows(calib=None, lib=None):
    """Every datasheet with its points, damage profile per target type (MIGHT removed per activation: 'dmg'),
    efficiency per own point ('eff', 'rel' vs the median) and its role (anti-horde ... anti-armour, transport, support)."""
    calib, lib = calib or U.load_calibration(), lib or U.load_library()
    ppm = target_pts_per_might(lib, calib)
    rows = []
    for p in sorted(os.listdir(os.path.join(ROOT, 'factions'))):
        if not (p[:2].isdigit() and p.endswith('.json')):
            continue
        fac = json.load(open(os.path.join(ROOT, 'factions', p), encoding='utf-8'))
        for e in fac['units']:
            card, r, _, _ = U.price_entry(e, lib, calib, fac)
            prof, rng_d, mel_d = profile(card)
            eff = {t: prof[t] * ppm[t] / r['points'] for t in TARGETS}          # pts destroyed per activation per own pt
            rows.append({'fac': fac['name'], 'num': p[:2], 'unit': e['name'], 'role_txt': e.get('role', ''), 'cls': card['class'],
                         'pts': r['points'], 'eff': eff, 'dmg': prof, 'range': max_range(card),
                         'ranged_share': sum(rng_d.values()) / max(sum(rng_d.values()) + sum(mel_d.values()), 1e-9),
                         'leader': 'leader' in e.get('role', '').lower(), 'kws': card.get('keywords', [])})
    med = {t: statistics.median(r['eff'][t] for r in rows if not r['leader']) for t in TARGETS}
    for r in rows:
        rel = {t: r['eff'][t] / med[t] for t in TARGETS}
        r['rel'] = rel
        best = max(rel, key=rel.get)
        r['best'] = best
        r['role'] = ROLE_OF[best]
        vals = sorted(rel.values())
        r['versatility'] = vals[1] / vals[-1]           # 2nd-worst ÷ best: 1 = generalist, ~0 = pure specialist
        r['spec'] = rel[best]
        if any(k.upper().startswith('[TRANSPORT') for k in r.get('kws', [])):
            r['role'] = 'transport'
        elif rel[best] < 0.45:
            r['role'] = 'support'
    return rows, med, ppm


def main():
    simf = sys.argv[1] if len(sys.argv) > 1 else None
    rows, med, ppm = compute_rows()
    # 1. within-role rank (non-leaders)
    byrole = defaultdict(list)
    for r in rows:
        if not r['leader']:
            byrole[r['role']].append(r)
    for role, rs in byrole.items():
        m = statistics.median(x['spec'] for x in rs)
        for x in rs:
            x['role_score'] = x['spec'] / m
    # 2. intent check
    mism = []
    for r in rows:
        nm = r['unit'].lower()
        for rx, roles in INTENT:
            if re.search(rx, nm):
                if r['role'] not in roles and not r['leader']:
                    mism.append((r, roles))
                break
    # 3. simulator per-class check
    sim = {}
    if simf and os.path.exists(simf):
        for d in json.load(open(simf, encoding='utf-8')):
            sim[(d['faction'], d['unit'])] = d
    L = ['# Role Report — every datasheet judged in its role', '',
         f'*`scripts/role_lab.py` · {len(rows)} datasheets · efficiency = points of the target destroyed per activation ÷ own points '
         '(calculator: cover, overkill cap, traits and abilities included)*', '',
         '## Target types', '', '| Target | Profile | Pts per MIGHT | Median efficiency |', '| :-- | :-- | --: | --: |']
    for t, (d, aid) in TARGETS.items():
        L.append(f"| {t} | {d['models']}× MIGHT {d['W']}, ARM {d['sv']}+{', WARD ' + str(d['ward']) + '+' if d['ward'] else ''}"
                 f"{', HARDENED' if d['hardened'] else ''} | {ppm[t]:.1f} | {med[t]:.3f} |")
    cnt = Counter(r['role'] for r in rows if not r['leader'])
    L += ['', '## Roles found', '', '| Role | Datasheets | Example specialists (best in role) |', '| :-- | --: | :-- |']
    for role in ('anti-horde', 'anti-infantry', 'anti-elite', 'anti-armour', 'transport', 'support'):
        top = sorted(byrole.get(role, []), key=lambda x: -x['spec'])[:4]
        L.append(f"| {role} | {cnt.get(role, 0)} | " + '; '.join(f"{x['unit']} ({x['num']}, ×{x['spec']:.1f})" for x in top) + ' |')
    gen = sorted([r for r in rows if not r['leader']], key=lambda x: -x['versatility'])[:6]
    spec = sorted([r for r in rows if not r['leader']], key=lambda x: x['versatility'])[:6]
    L += ['', f"**Most versatile:** " + '; '.join(f"{x['unit']} ({x['versatility']:.2f})" for x in gen),
          '', f"**Purest specialists:** " + '; '.join(f"{x['unit']} → {x['role']} ({x['versatility']:.2f})" for x in spec), '']
    combat = ('anti-horde', 'anti-infantry', 'anti-elite', 'anti-armour')
    weak = sorted([r for rs in byrole.values() for r in rs if r['role'] in combat and r['role_score'] < 0.6], key=lambda x: x['role_score'])
    strong = sorted([r for rs in byrole.values() for r in rs if r['role'] in combat and r['role_score'] > 1.8], key=lambda x: -x['role_score'])
    L += [f'## Weak in their own role ({len(weak)}): under 0.6× the role median', '',
          'These units are not even good at the job their weapons point to. Fix the weapon or the price, not the role.', '',
          '| # | Unit | Role | Score in role | Pts |', '| :-: | :-- | :-- | --: | --: |']
    L += [f"| {r['num']} | {r['unit']} | {r['role']} | {r['role_score']:.2f} | {r['pts']} |" for r in weak] or ['| – | none | | | |']
    L += ['', f'## Dominant in their role ({len(strong)}): over 1.8× the role median', '',
          '| # | Unit | Role | Score in role | Pts |', '| :-: | :-- | :-- | --: | --: |']
    L += [f"| {r['num']} | {r['unit']} | {r['role']} | {r['role_score']:.2f} | {r['pts']} |" for r in strong] or ['| – | none | | | |']
    L += ['', f'## Name promises a different job than the weapons deliver ({len(mism)})', '',
          '| # | Unit | Name suggests | Weapons deliver | Best ×median |', '| :-: | :-- | :-- | :-- | --: |']
    L += [f"| {r['num']} | {r['unit']} | {' / '.join(sorted(roles))} | {r['role']} ({r['best']}) | {r['spec']:.2f} |" for r, roles in mism] or ['| – | none | | | |']

    if sim:
        # do specialists deal more to their target class in played games?
        cls_of = {'horde': 'dealt_c1', 'line': 'dealt_c1', 'elite': 'dealt_c1', 'heavy': 'dealt_c2', 'monster': 'dealt_c45', 'vehicle': 'dealt_c45'}
        keyed = [(r, sim[(r['fac'], r['unit'])]) for r in rows if (r['fac'], r['unit']) in sim and not r['leader']]
        keys = ('dealt_horde', 'dealt_line', 'dealt_elite', 'dealt_big')
        have = all(k in next(iter(sim.values())) for k in keys)
        if not have:
            keys = ('dealt_c1', 'dealt_c2', 'dealt_c45')
        medc = {k: statistics.median(s[k] for _, s in keyed) or 1e-9 for k in keys}
        heads = {'dealt_horde': 'vs horde', 'dealt_line': 'vs line inf.', 'dealt_elite': 'vs elite / Class 2', 'dealt_big': 'vs Class 3–5',
                 'dealt_c1': 'vs Class 1', 'dealt_c2': 'vs Class 2', 'dealt_c45': 'vs Class 4–5'}
        own = {'anti-horde': 'dealt_horde', 'anti-infantry': 'dealt_line', 'anti-elite': 'dealt_elite', 'anti-armour': 'dealt_big'}
        L += ['', '## Simulator check: do specialists do their job in played games?', '',
              'Points destroyed per own point against each target type in random games, relative to the median unit '
              '(>1 = better than a typical unit against that type). **Bold** = the role\'s own target.', '',
              '| Role (calculator) | Units | ' + ' | '.join(heads[k] for k in keys) + ' |', '| :-- | --: | ' + ' | '.join('--:' for _ in keys) + ' |']
        for role in ('anti-horde', 'anti-infantry', 'anti-elite', 'anti-armour', 'transport', 'support'):
            g = [s for r, s in keyed if r['role'] == role]
            if g:
                cells = []
                for k in keys:
                    v = f"{statistics.median(s[k] for s in g) / medc[k]:.2f}"
                    cells.append(f'**{v}**' if own.get(role) == k else v)
                L.append(f"| {role} | {len(g)} | " + ' | '.join(cells) + ' |')
        # role value-per-point (all effects) — is a role systematically over/under priced?
        L += ['', '| Role | Median value per point (sim, 1.00 = all units) |', '| :-- | --: |']
        vm = statistics.median(s['value_per_pt'] for _, s in keyed)
        for role in ('anti-horde', 'anti-infantry', 'anti-elite', 'anti-armour', 'transport', 'support'):
            g = [s['value_per_pt'] for r, s in keyed if r['role'] == role]
            if g:
                L.append(f"| {role} | {statistics.median(g) / vm:.2f} |")
        # 4. range
        L += ['', '## Range: what is it worth in played games?', '',
              'Ranged-dominant, non-Leader units (≥70% of damage from guns), grouped by their longest weapon. '
              'Value per point from the simulator (maps of 14″/18″/24″ gaps, deployment up to 6″ deep).', '',
              '| Longest range | Units | Median value per point |', '| :-- | --: | --: |']
        buckets = [(0, 13, '≤12″'), (13, 19, '13–18″'), (19, 25, '19–24″'), (25, 37, '25–36″'), (37, 999, '>36″')]
        rb = {}
        for lo, hi, lab in buckets:
            g = [s['value_per_pt'] for r, s in keyed if r['ranged_share'] >= 0.7 and lo <= r['range'] < hi]
            if g:
                rb[lab] = statistics.median(g) / vm
                L.append(f'| {lab} | {len(g)} | {rb[lab]:.2f} |')
        mel = [s['value_per_pt'] for r, s in keyed if r['ranged_share'] <= 0.3]
        if mel:
            L.append(f'| melee-dominant (for reference) | {len(mel)} | {statistics.median(mel) / vm:.2f} |')
        # regression slope of log(value/pt) on log(range) for ranged units
        pts_ = [(math.log(r['range'] / 24), math.log(s['value_per_pt'] / vm)) for r, s in keyed if r['ranged_share'] >= 0.7 and r['range'] > 0]
        if len(pts_) > 10:
            mx = statistics.mean(x for x, _ in pts_)
            my = statistics.mean(y for _, y in pts_)
            beta = sum((x - mx) * (y - my) for x, y in pts_) / sum((x - mx) ** 2 for x, _ in pts_)
            L += ['', f'**Elasticity of value per point to range: {beta:+.3f}** '
                  f'(+{100 * (2 ** beta - 1):.0f}% value per point for doubling range, if the price ignores range).']
            json.dump({'range_beta': beta, 'buckets': rb}, open(os.path.join(ROOT, 'calc_output', 'role_lab_range.json'), 'w'), indent=1)
    out = os.path.join(ROOT, 'ROLE_REPORT.md')
    open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:60]))
    print(f'[✓] {out}')


if __name__ == '__main__':
    main()
