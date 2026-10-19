#!/usr/bin/env python3
"""
verify_all.py — independent verification of every faction, datasheet, ability, enhancement, stratagem and the
calculator maths itself. Writes gametheory/VERIFICATION_REPORT.md and one legal sample list per faction.

    python3 verify_all.py                # full run (~1 min)
    python3 verify_all.py --mc 400       # more dice-engine test cases

Checks
  A. Dice engine vs brute force: the calculator's expected damage (resolve) against a Monte Carlo roll of the
     same attack, die by die. Separates exact cases from the documented approximations (random damage, FNP).
  B. Metamorphic price tests: a strictly better unit (more MIGHT / ARM / skill / MOV / models) must never cost less.
  C. Datasheet sanity: Class price bands, per-model cost > 0, abilities priced ~0 (dead) or > 40 % of the base.
  D. Enhancements & stratagems: every enhancement priced on its bearer (5–60 pts), CP 1–2, 2 + 3 per detachment.
  E. Rules text everywhere (core, gamble, detachments, enhancements, stratagems, abilities): IP names + 4192 vocabulary.
  F. Names: duplicate datasheet names inside a faction and across factions.
  G. Muster: build one legal 1,000-pt list per faction (lists/samples/) and run the list checker on it.
"""
import argparse
import contextlib
import glob
import io
import json
import math
import os
import random
import re
import statistics
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import unit_calculator as U  # noqa: E402

ROOT = os.path.join(U.ROOT, 'gametheory')
FAC_FILES = sorted(glob.glob(os.path.join(ROOT, 'factions', '[0-9][0-9]_*.json')))
BANDS = {1: (30, 220), 2: (45, 280), 3: (60, 300), 4: (110, 340), 5: (200, 520)}     # sanity bands, points


# ---------------------------------------------------------------------------------------------------------------
# A. Dice engine vs brute force
# ---------------------------------------------------------------------------------------------------------------
def roll_expr(expr):
    """Sample one value of a dice expression ('3', 'D3', 'D6+1', '2D6')."""
    dist = U.dice_dist(expr)
    r, acc = random.random(), 0.0
    for v, p in sorted(dist.items()):
        acc += p
        if r <= acc:
            return v
    return max(dist)


def d6():
    return random.randint(1, 6)


def brute_attack(w, t, om, trials):
    """Roll `trials` attacks one die at a time; damage goes to a pool of W-MIGHT models with no spill.
    Returns MIGHT removed per attack-profile use (one model firing the weapon once)."""
    removed, cur = 0.0, t['W']
    for _ in range(trials):
        n = roll_expr(w['A']) + om.get('attacks_mod', 0)
        hit_need = min(max(w['skill'] - om.get('hit_mod', 0), 2), 6)
        crit_on = om.get('crit_hit_on', 6)
        hits, crits = 0, 0
        for _a in range(n):
            r = d6()
            ok = r >= hit_need or r >= crit_on
            if not ok and (om.get('reroll_hit') == 'all' or (om.get('reroll_hit') == 'ones' and r == 1)):
                r = d6()
                ok = r >= hit_need or r >= crit_on
            if ok:
                if r >= crit_on:
                    crits += 1
                else:
                    hits += 1
        sustained = om.get('sustained', 0)
        lethal = om.get('lethal', False)
        to_wound = hits + crits * sustained + (0 if lethal else crits)
        auto = crits if lethal else 0
        need = w['wound'] + (1 if t['hardened'] else 0) - om.get('wound_mod', 0)
        need = min(max(need, 2), 6)
        normal_w, dev_w = auto, 0
        for _b in range(to_wound):
            r = d6()
            ok = r >= need
            if not ok and (om.get('reroll_wound') == 'all' or (om.get('reroll_wound') == 'ones' and r == 1)):
                r = d6()
                ok = r >= need
            if ok:
                if om.get('devastating') and r == 6:
                    dev_w += 1
                else:
                    normal_w += 1
        st = t['sv'] + w['ap'] + om.get('pen_mod', 0)
        if t.get('ward'):
            st = min(st, t['ward'])
        st = max(st, 3)
        unsaved = dev_w + sum(1 for _c in range(normal_w) if not (st <= 6 and d6() >= st))
        for _d in range(unsaved):
            dmg = max(0, roll_expr(w['D']) + om.get('dmg_mod', 0))
            if t.get('fnp'):
                dmg = sum(1 for _e in range(dmg) if d6() < t['fnp'])
            take = min(dmg, cur)
            removed += take
            cur -= take
            if cur <= 0:
                cur = t['W']
    return removed / trials


def mc_check(n_cases, trials):
    rows = []
    for i in range(n_cases):
        exact = i % 2 == 0          # half the cases use fixed damage and no FNP: the formula should be exact
        w = {'name': 'test', 'type': random.choice(['Ranged', 'Melee']), 'A': random.choice(['1', '2', '3', '4', 'D3', 'D6']),
             'skill': random.randint(2, 6), 'wound': random.randint(2, 6), 'ap': random.randint(0, 4),
             'D': random.choice(['1', '2', '3']) if exact else random.choice(['D3', 'D6', 'D6+1', '2']), 'kw': {}}
        t = {'sv': random.randint(3, 7), 'W': random.choice([1, 1, 2, 3, 4, 6, 10, 14]), 'hardened': random.random() < 0.3,
             'frail': False, 'ward': random.choice([None, None, 4, 5, 6]), 'fnp': None if exact else random.choice([None, 5, 6]),
             'models': 5, 'mods': {}, 'kw': set()}
        om = random.choice([{}, {}, {'reroll_hit': 'ones'}, {'reroll_hit': 'all'}, {'reroll_wound': 'ones'}, {'sustained': 1},
                            {'lethal': True}, {'devastating': True}, {'crit_hit_on': 5, 'lethal': True}, {'pen_mod': 1}, {'dmg_mod': 1},
                            {'hit_mod': 1}, {'wound_mod': 1}])
        w['mods'] = om
        calc = U.resolve('4192', w, t)
        brute = brute_attack(w, t, om, trials)
        rows.append((exact, calc, brute, w, t, om))
    return rows


# ---------------------------------------------------------------------------------------------------------------
# B. Metamorphic price tests
# ---------------------------------------------------------------------------------------------------------------
def raw_price(card, calib):
    return U.price_card(card, calib)['raw']


def metamorphic(entry, fac, lib, calib):
    e = U.with_faction_rules(entry, fac)
    card, (lo, hi) = U.build_card(e, lib)
    base = raw_price(card, calib)
    fails = []
    variants = [('MIGHT +1', {'MIGHT': card['MIGHT'] + 1}), ('MOV +1', {'MOV': card['MOV'] + 1})]
    if card['ARM'] > 3:
        variants.append(('ARM better', {'ARM': card['ARM'] - 1}))
    if card['MS'] > 2 and any(w['type'] != 'Ranged' for w in card['weapons']):
        variants.append(('MS better', {'MS': card['MS'] - 1}))
    if card['RS'] > 2 and any(w['type'] == 'Ranged' for w in card['weapons']):
        variants.append(('RS better', {'RS': card['RS'] - 1}))
    for name, ch in variants:
        v = raw_price(dict(card, **ch), calib)
        if v < base - 1e-6:
            fails.append(f'{name}: {base:.2f} → {v:.2f}')
    if hi > lo:
        big, _ = U.build_card(e, lib, hi)
        if raw_price(big, calib) <= base:
            fails.append('more models not more expensive')
    return fails


# ---------------------------------------------------------------------------------------------------------------
# C–F. Datasheets, enhancements, stratagems, text, names
# ---------------------------------------------------------------------------------------------------------------
RULES = json.load(open(os.path.join(U.CAT_DIR, 'design_rules.json'), encoding='utf-8'))
BANNED = [re.compile(r'\b' + re.escape(x) + r's?\b', re.I) for x in U.banned_terms(RULES)]
FLAGS = [x.lower() for x in RULES['rules_vocabulary']['flag_words']]


def text_issues(where, txt):
    out = []
    for rx in BANNED:
        m = rx.search(txt or '')
        if m:
            out.append(f'IP term "{m.group(0)}" in {where}')
    low = (txt or '').lower()
    for f in FLAGS:
        if f in low:
            out.append(f'vocabulary "{f}" in {where}')
    return out


def check_faction(path, lib, calib):
    fac = json.load(open(path, encoding='utf-8'))
    rep = {'name': fac['name'], 'num': os.path.basename(path)[:2], 'issues': [], 'warn': [], 'units': [], 'enh': [],
           'meta_fail': [], 'dead': [], 'big': []}
    texts = [('core rule', json.dumps(fac.get('core_rule', {}), ensure_ascii=False)),
             ('gamble', json.dumps(fac.get('gamble') or {}, ensure_ascii=False))]
    for d in fac['detachments']:
        texts.append((f"detachment {d['name']}", d['name'] + ' ' + d['rule']))
        if len(d['enhancements']) != 2 or len(d['stratagems']) != 3:
            rep['warn'].append(f"detachment {d['name']}: {len(d['enhancements'])} enhancements / {len(d['stratagems'])} stratagems")
        for s in d['stratagems']:
            texts.append((f"stratagem {s['name']}", ' '.join(str(s[k]) for k in ('name', 'when', 'effect'))))
            if s['cp'] not in (1, 2):
                rep['issues'].append(f"stratagem {s['name']} costs {s['cp']} CP")
        for en in d['enhancements']:
            texts.append((f"enhancement {en['name']}", en['name'] + ' ' + en['text']))
    for u in fac['units']:
        for a in u.get('abilities', []):
            texts.append((f"{u['name']} / {a.get('name')}", a.get('name', '') + ' ' + a.get('text', '')))
    for where, txt in texts:
        rep['issues'] += text_issues(where, txt)

    own = {u['name']: {a['name'] for a in u.get('abilities', [])} for u in fac['units']}
    cards = {}
    for e in fac['units']:
        card, r, (lo, hi), pm = U.price_entry(e, lib, calib, fac)
        cards[e['name']] = card
        pts = r['points']
        c = card['class']
        leader = 'leader' in e.get('role', '').lower()
        rep['units'].append((e['name'], c, leader, lo, hi, pts, pm, r['base_raw'] * r['scale']))
        blo, bhi = BANDS[c]
        if not blo <= pts <= bhi:
            rep['warn'].append(f"{e['name']}: {pts} pts outside the Class {c} sanity band {blo}–{bhi}")
        if hi > lo and (pm is None or pm <= 0):
            rep['issues'].append(f"{e['name']}: extra models cost {pm}")
        base = r['base_raw']
        lines = r['combat_lines'] + [x for x in r['utility'] if x[0] != 'CTRL' and not isinstance(x[0], tuple)] + r['buffs']
        for n, v in lines:
            if n not in own[e['name']]:
                continue                      # army-wide rules are checked per faction, not per unit
            ab = next(a for a in e['abilities'] if a['name'] == n)
            drawback = ab.get('flat', 0) < 0 or any(x < 0 for x in ab.get('mods', {}).values() if isinstance(x, (int, float)) and not isinstance(x, bool)
                                                    and n.lower().endswith('cost'))
            if abs(v * r['scale']) < 0.5 and not drawback:
                rep['dead'].append(f"{e['name']} — {n}")
            if v > 0.4 * base:
                rep['big'].append(f"{e['name']} — {n}: +{v * r['scale']:.0f} on base {base * r['scale']:.0f}")
        rep['meta_fail'] += [f"{e['name']}: {f}" for f in metamorphic(e, fac, lib, calib)]
    for d in fac['detachments']:
        for en in d['enhancements']:
            if en['bearer'] not in cards:
                rep['issues'].append(f"enhancement {en['name']}: bearer {en['bearer']} missing")
                continue
            p = U.price_enhancement(cards[en['bearer']], en['ability'], calib)
            rep['enh'].append((d['name'], en['name'], en['bearer'], p))
            if p <= U.ENHANCEMENT_MIN_PTS:
                rep['warn'].append(f"enhancement {en['name']} sits on the {U.ENHANCEMENT_MIN_PTS}-pt floor (measured value is lower on {en['bearer']})")
            if p > 60:
                rep['warn'].append(f"enhancement {en['name']} costs {p} pts")
    names = Counter(u['name'] for u in fac['units'])
    rep['issues'] += [f'duplicate datasheet name {n}' for n, k in names.items() if k > 1]
    return fac, rep, cards


# ---------------------------------------------------------------------------------------------------------------
# G. Sample lists
# ---------------------------------------------------------------------------------------------------------------
def build_list(fac, path, lib, calib):
    size = U.GAME_SIZES['standard']
    priced = {}
    for e in fac['units']:
        card, r, (lo, hi), pm = U.price_entry(e, lib, calib, fac)
        priced[e['name']] = (e, r['points'], lo, card['class'])
    units, pts, counts = [], 0, Counter()

    def add(name, attached=False):
        nonlocal pts
        e, p, lo, c = priced[name]
        item = {'unit': name, 'models': lo}
        if attached:
            item['attached'] = True
        units.append(item)
        pts += p
        counts[name] += 1

    leaders = sorted((v[1], n) for n, v in priced.items() if 'leader' in v[0].get('role', '').lower() and v[3] <= 2)
    warlords = [x for x in leaders if 'warlord' in priced[x[1]][0].get('role', '').lower()] or leaders
    add(warlords[0][1], attached=True)
    bl = sorted((v[1], n) for n, v in priced.items() if v[0].get('battleline'))
    if bl:
        add(bl[0][1])
        add(bl[1][1] if len(bl) > 1 else bl[0][1])
    order = [2, 1, 4, 3, 2, 1, 5, 2, 1, 3, 4]
    used_cls = Counter(priced[u['unit']][3] for u in units)
    for c in order * 2:
        cands = sorted((v[1], n) for n, v in priced.items()
                       if v[3] == c and 'leader' not in v[0].get('role', '').lower() and counts[n] < 1)
        for p, n in cands:
            big = sum(1 for u in units if priced[u['unit']][3] >= 4)
            if pts + p > size['points'] or len(units) >= size['units'][1]:
                continue
            if c >= 4 and big >= size['max_big']:
                continue
            if c == 5 and used_cls[5] >= size['max_c5']:
                continue
            add(n)
            used_cls[c] += 1
            break
    # top up with a second support Leader if it fits
    for p, n in leaders:
        if n != units[0]['unit'] and pts + p <= size['points']:
            add(n, attached=True)
            break
    lst = {'name': f"{fac['name']} — verifier sample", 'detachment': fac['detachments'][0]['name'], 'units': units,
           'size': 'standard', 'sources': [os.path.relpath(path, os.path.join(ROOT, 'lists', 'samples'))]}
    out = os.path.join(ROOT, 'lists', 'samples', os.path.basename(path)[:2] + '_sample_1000.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(lst, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        U.cmd_list(argparse.Namespace(file=out))
    txt = buf.getvalue()
    legal = '✅ legal' in txt
    total = re.search(r'TOTAL (\d+) pts · (\d+) units · (\d+) activations · (\d+) models', txt)
    return out, legal, total.groups() if total else None, txt.strip().splitlines()[-1]


# ---------------------------------------------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mc', type=int, default=200, help='dice-engine test cases')
    ap.add_argument('--trials', type=int, default=6000)
    args = ap.parse_args()
    random.seed(4192)
    calib, lib = U.load_calibration(), U.load_library()

    print('A. dice engine vs brute force …')
    mc = mc_check(args.mc, args.trials)

    def rel(c, b):
        return (c - b) / max(b, 1e-3)
    ex = [(c, b) for e_, c, b, *_ in mc if e_ and b > 0.02]
    ap_ = [(c, b) for e_, c, b, *_ in mc if not e_ and b > 0.02]
    if not ap_:
        ap_ = [(1, 1)]
    ex_err = [abs(rel(c, b)) for c, b in ex]
    ap_err = [rel(c, b) for c, b in ap_]
    se = [1 / math.sqrt(args.trials)]

    print('B–F. factions …')
    reps, all_names = [], defaultdict(list)
    for p in FAC_FILES:
        fac, rep, _ = check_faction(p, lib, calib)
        reps.append(rep)
        for u in fac['units']:
            all_names[u['name']].append(rep['num'])
        rep['list'] = build_list(fac, p, lib, calib)
    cross = {n: v for n, v in all_names.items() if len(v) > 1}

    # ---------------- report ----------------
    L = ['# Verification Report — all factions', '',
         f'*Generated by `scripts/verify_all.py` · {len(FAC_FILES)} factions · {sum(len(r["units"]) for r in reps)} datasheets*', '']
    tot_issues = sum(len(r['issues']) for r in reps)
    tot_meta = sum(len(r['meta_fail']) for r in reps)
    legal = sum(1 for r in reps if r['list'][1])
    L += ['## Summary', '', '| Check | Result |', '| :-- | :-- |',
          f"| A. Dice engine, exact cases ({len(ex)}) | mean error {100 * statistics.mean(ex_err):.2f}% · max {100 * max(ex_err):.1f}% (Monte Carlo noise ≈ {100 * se[0] * 2:.1f}%) |",
          f"| A. Dice engine, random Damage / UNYIELDING cases ({len(ap_)}) | mean bias {100 * statistics.mean(ap_err):+.1f}% · range {100 * min(ap_err):+.0f}% to {100 * max(ap_err):+.0f}% |",
          f"| B. Metamorphic price tests (better stats never cheaper) | {tot_meta} failures |",
          f"| C. Datasheets outside sanity bands | {sum(1 for r in reps for w in r['warn'] if 'sanity band' in w)} |",
          f"| C. Unit abilities priced ≈0 | {sum(len(r['dead']) for r in reps)} |",
          f"| C. Unit abilities > 40% of base price | {sum(len(r['big']) for r in reps)} |",
          f"| D. Enhancements priced | {sum(len(r['enh']) for r in reps)} (range {min(p for r in reps for *_, p in r['enh'])}–{max(p for r in reps for *_, p in r['enh'])} pts) |",
          f"| E/F. Errors (IP terms, vocabulary, CP, duplicates, missing bearers) | {tot_issues} |",
          f"| F. Datasheet names shared across factions | {len(cross)} |",
          f"| G. Sample 1,000-pt lists legal | {legal} / {len(reps)} |", '']

    L += ['## A. Dice engine', '',
          'Each case rolls the same attack die by die (hit → re-rolls → crits → wound → save/ward cap 3+ → damage with no spill '
          f'into a pool of models), {args.trials} times, and compares the MIGHT removed with the calculator\'s closed-form expectation.', '',
          '- **Exact cases** (fixed Damage, no UNYIELDING): the formula is the true expectation; differences are dice noise.',
          '- **Random Damage / UNYIELDING cases**: until v4.3 the calculator used `E[min(D, W)] × keep`, which this check showed '
          'was off by −33% to +27% (random-Damage weapons over-valued against multi-MIGHT models; UNYIELDING mis-valued against '
          'big hits). It now uses an exact renewal formula: MIGHT removed per wound = W ÷ E[wounds needed to kill one model], '
          'with UNYIELDING rolled per damage point. Remaining differences are dice noise; rare-event cases (<0.15 wounds per '
          'attack) carry ±10% noise.', '']
    worst = sorted(mc, key=lambda r: -abs(rel(r[1], r[2])) if r[2] > 0.02 else 0)[:8]
    L += ['| Exact? | Weapon (A, skill, wound, PEN, D) | Target (ARM, MIGHT, WARD, UNY, hard) | Mods | Calculator | Brute force | Diff |',
          '| :-: | :-- | :-- | :-- | --: | --: | --: |']
    for e_, c, b, w, t, om in worst:
        L.append(f"| {'yes' if e_ else 'no'} | A{w['A']} {w['skill']}+ W{w['wound']}+ PEN-{w['ap']} D{w['D']} | {t['sv']}+ M{t['W']} "
                 f"W{t['ward'] or '-'} U{t['fnp'] or '-'} {'H' if t['hardened'] else ''} | {om or '-'} | {c:.3f} | {b:.3f} | {100 * rel(c, b):+.0f}% |")
    L += ['', '*(the 8 largest differences out of all cases)*', '']

    L += ['## Per faction', '', '| # | Faction | Datasheets | Price range | Errors | Warnings | ≈0 abilities | Metamorphic fails | Sample list |',
          '| :-: | :-- | --: | :-- | --: | --: | --: | --: | :-- |']
    for r in reps:
        pr = [u[5] for u in r['units']]
        lst = r['list']
        tot = lst[2]
        L.append(f"| {r['num']} | {r['name'].replace('The ', '')} | {len(r['units'])} | {min(pr)}–{max(pr)} | {len(r['issues'])} | "
                 f"{len(r['warn'])} | {len(r['dead'])} | {len(r['meta_fail'])} | {'✅' if lst[1] else '❌'} "
                 f"{tot[0] + ' pts · ' + tot[1] + ' units · ' + tot[3] + ' models' if tot else lst[3]} |")
    L += ['']
    for title, key in (('Errors', 'issues'), ('Warnings', 'warn'), ('Abilities priced ≈0 (dead, capped, or effect already at the 2+/3+ cap)', 'dead'),
                       ('Abilities worth more than 40% of the unit base', 'big'), ('Metamorphic failures', 'meta_fail')):
        items = [(r['num'], x) for r in reps for x in r[key]]
        L += [f'## {title} ({len(items)})', '']
        L += [f'- **{n}** {x}' for n, x in items] or ['- none']
        L.append('')
    L += [f'## Shared datasheet names across factions ({len(cross)})', '']
    L += [f'- {n}: factions {", ".join(v)}' for n, v in sorted(cross.items())] or ['- none']
    L += ['', '## Enhancement prices', '', '| # | Detachment | Enhancement | Bearer | Pts |', '| :-: | :-- | :-- | :-- | --: |']
    for r in reps:
        for d, n, b, p in r['enh']:
            L.append(f"| {r['num']} | {d} | {n} | {b} | {p} |")
    out = os.path.join(ROOT, 'VERIFICATION_REPORT.md')
    open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L[:20]))
    print(f'[✓] {out}')


if __name__ == '__main__':
    main()
