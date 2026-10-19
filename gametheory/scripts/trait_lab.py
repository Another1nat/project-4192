#!/usr/bin/env python3
"""
trait_lab.py — does every weapon trait do what the rules say, in BOTH the calculator and the simulator?

Each test fires the same weapon with and without one trait, at a target and distance where the trait should matter
(and one control where it should not). Calculator = closed-form expectation (unit_calculator.resolve);
simulator = battle_sim.attack() rolled N times with real dice. A trait passes when both agree on the effect.

    python3 trait_lab.py            # writes gametheory/calc_output/trait_lab.md
"""
import copy
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import unit_calculator as U  # noqa: E402
import battle_sim as B       # noqa: E402

N = 4000
B.RULES['terrain'] = True

TARGETS = {   # 4192 cards
    'horde (10× M1 ARM6)':   dict(cls=1, models=10, ARM=6, MIGHT=1, kw=[]),
    'line (10× M1 ARM4)':    dict(cls=1, models=10, ARM=4, MIGHT=1, kw=[]),
    'elite (5× M2 ARM3)':    dict(cls=1, models=5, ARM=3, MIGHT=2, kw=[]),
    'heavy (3× M4 ARM3 W4)': dict(cls=2, models=3, ARM=3, MIGHT=4, kw=[], WARD=4),
    'monster (M14 ARM4 H)':  dict(cls=4, models=1, ARM=4, MIGHT=14, kw=[]),
    'vehicle (M16 ARM3 H)':  dict(cls=4, models=1, ARM=3, MIGHT=16, kw=[]),
}


def tcard(name):
    t = TARGETS[name]
    c = {'name': name, 'class': t['cls'], 'models': t['models'], 'MOV': 6, 'MS': 4, 'RS': 4, 'ARM': t['ARM'], 'MIGHT': t['MIGHT'],
         'CTRL': 1, 'keywords': t['kw'], 'weapons': [], 'abilities': [], 'HARDENED': t['cls'] >= 4}
    if t.get('WARD'):
        c['WARD'] = t['WARD']
    return c


def acard(weapons, cls=1, models=5, might=2):
    return {'name': 'Tester', 'class': cls, 'models': models, 'MOV': 6, 'MS': 3, 'RS': 3, 'ARM': 4, 'MIGHT': might, 'CTRL': 1,
            'keywords': [], 'weapons': weapons, 'abilities': []}


def W(name, typ, rng, A, wound, pen, D, *traits):
    return {'name': name, 'type': typ, 'range': rng, 'A': str(A), 'wound': wound, 'pen': str(pen), 'D': str(D), 'traits': list(traits)}


def calc(att, tgt, d, charged=False, moved=False, cover=False, att_models=None):
    """Calculator expectation of MIGHT removed by the whole attacking unit in one Shoot/Fight."""
    au = U.card_to_unit(att)
    tu = U.card_to_unit(tgt)['def']
    tu = dict(tu, kw={'VEHICLE', 'MONSTER'} if tgt['class'] >= 4 else {'INFANTRY'}, cover=cover)
    total = 0.0
    ws = au['loadout'][0]['weapons']
    melee = [w for w in ws if w['type'] != 'Ranged']
    if melee:
        main = [w for w in melee if not w['kw'].get('extra_attacks')]
        extra = [w for w in melee if w['kw'].get('extra_attacks')]
        ws = ([max(main, key=lambda w: U.resolve('4192', w, tu, charged=charged))] if main else []) + extra
    for w in ws:
        rng = U.target_num(w.get('range', '0'), 0)
        half = w['type'] == 'Ranged' and d <= rng / 2
        total += U.resolve('4192', w, tu, half_range=half, stationary=not moved, charged=charged)
    return min(total * att['models'], tgt['MIGHT'] * tgt['models'])     # overkill cap, as in the calculator


def sim(att, tgt, d, charged=False, moved=False, cover=False, n=N, att_models=None):
    tot = own = 0.0
    lib_t, lib_a = tgt, att
    for _ in range(n):
        A = B.SimUnit('A', lib_a, 100, 0, 'lab')
        T = B.SimUnit('T', lib_t, 100, 1, 'lab')
        A.x, T.x = 0.0, B.DEPLOY_GAP - d
        T.in_cover = cover
        g = B.Game([A], [T])
        g.round = 2
        wtype = 'Melee' if all(w['type'] != 'Ranged' for w in lib_a['weapons']) else 'Ranged'
        if wtype == 'Melee':
            A.engaged, T.engaged = T, A
        tot += B.attack(A, T, wtype, charged=charged, moved=moved, game=g)
        own += A.stats.get('overload_lost', 0)
    return tot / n, own / n


RIFLE = ('Rifle', 'Ranged', '24"', 2, '4+', 0, 1)
TESTS = [
    # (trait label, base weapon tuple, extra traits, target, distance, kwargs, expect)
    ('[SCORCH] auto-hit', ('Flamer', 'Ranged', '12"', 'D6', '4+', 0, 1), ['[SCORCH]'], 'horde (10× M1 ARM6)', 8, {}, 'up'),
    ('[IMPALING HITS]', RIFLE, ['[IMPALING HITS]'], 'vehicle (M16 ARM3 H)', 20, {}, 'up'),
    ('[ONSLAUGHT 1]', RIFLE, ['[ONSLAUGHT 1]'], 'line (10× M1 ARM4)', 20, {}, 'up'),
    ('[SHREDDING WOUNDS]', ('Rifle', 'Ranged', '24"', 2, '3+', -1, 1), ['[SHREDDING WOUNDS]'], 'heavy (3× M4 ARM3 W4)', 20, {}, 'up'),
    ('[RELENTLESS]', RIFLE, ['[RELENTLESS]'], 'elite (5× M2 ARM3)', 20, {}, 'up'),
    ('[HAILFIRE 1] half range', RIFLE, ['[HAILFIRE 1]'], 'line (10× M1 ARM4)', 10, {}, 'up'),
    ('[HAILFIRE 1] full range (control)', RIFLE, ['[HAILFIRE 1]'], 'line (10× M1 ARM4)', 20, {}, 'same'),
    ('[ERADICATE 2] point-blank', ('Melta', 'Ranged', '12"', 1, '2+', -4, 'D6'), ['[ERADICATE 2]'], 'vehicle (M16 ARM3 H)', 5, {}, 'up'),
    ('[ERADICATE 2] long (control)', ('Melta', 'Ranged', '12"', 1, '2+', -4, 'D6'), ['[ERADICATE 2]'], 'vehicle (M16 ARM3 H)', 10, {}, 'same'),
    ('[SHRAPNEL 1] vs horde', ('Mortar', 'Ranged', '48"', 'D3', '4+', 0, 1), ['[SHRAPNEL 1]'], 'horde (10× M1 ARM6)', 20, {}, 'up'),
    ('[SHRAPNEL 1] vs vehicle (control)', ('Mortar', 'Ranged', '48"', 'D3', '4+', 0, 1), ['[SHRAPNEL 1]'], 'vehicle (M16 ARM3 H)', 20, {}, 'same'),
    ('[HEAVY] stationary', ('Cannon', 'Ranged', '48"', 2, '3+', -1, 2), ['[HEAVY]'], 'elite (5× M2 ARM3)', 20, {}, 'up'),
    ('[HEAVY] moved (control)', ('Cannon', 'Ranged', '48"', 2, '3+', -1, 2), ['[HEAVY]'], 'elite (5× M2 ARM3)', 20, {'moved': True}, 'same'),
    ('[CRASHING] on the charge', ('Lance', 'Melee', 'Melee', 3, '4+', -1, 2), ['[CRASHING]'], 'elite (5× M2 ARM3)', 0, {'charged': True}, 'up'),
    ('[CRASHING] no charge (control)', ('Lance', 'Melee', 'Melee', 3, '4+', -1, 2), ['[CRASHING]'], 'elite (5× M2 ARM3)', 0, {}, 'same'),
    ('[ANTI-VEHICLE 4+] vs vehicle', ('Charge', 'Ranged', '12"', 1, '4+', -2, 3), ['[ANTI-VEHICLE 4+]'], 'vehicle (M16 ARM3 H)', 5, {}, 'up'),
    ('[ANTI-VEHICLE 4+] vs line (control)', ('Charge', 'Ranged', '12"', 1, '4+', -2, 3), ['[ANTI-VEHICLE 4+]'], 'line (10× M1 ARM4)', 5, {}, 'same'),
    ('[ANTI-INFANTRY 3+] vs line', RIFLE, ['[ANTI-INFANTRY 3+]'], 'line (10× M1 ARM4)', 20, {}, 'up'),
    ('[IGNORES COVER] target in cover', RIFLE, ['[IGNORES COVER]'], 'line (10× M1 ARM4)', 20, {'cover': True}, 'up'),
    ('[IGNORES COVER] no cover (control)', RIFLE, ['[IGNORES COVER]'], 'line (10× M1 ARM4)', 20, {}, 'same'),
    ('[PSYCHIC / ARCANE] target in cover', RIFLE, ['[PSYCHIC / ARCANE]'], 'line (10× M1 ARM4)', 20, {'cover': True}, 'up'),
    ('[INDIRECT FIRE] target in cover (visible)', ('Mortar', 'Ranged', '48"', 'D3', '4+', 0, 1), ['[INDIRECT FIRE]'], 'line (10× M1 ARM4)', 10, {'cover': True}, 'up'),
    ('[REAPING 1] vs horde', ('Talons', 'Melee', 'Melee', 2, '4+', -1, 1), ['[REAPING 1]'], 'horde (10× M1 ARM6)', 0, {'att_models': 2}, 'up'),
    ('[ONE SHOT] (¼ use)', ('Missile', 'Ranged', '24"', 1, '2+', -3, 'D6'), ['[ONE SHOT]'], 'vehicle (M16 ARM3 H)', 20, {}, 'down'),
]


def run():
    random.seed(4192)
    rows = []
    for label, base, traits, tname, d, kw, expect in TESTS:
        w0 = W(*base)
        w1 = W(*base, *traits)
        am = kw.get('att_models') or 5
        a0, a1, t = acard([w0], models=am), acard([w1], models=am), tcard(tname)
        c0, c1 = calc(a0, t, d, **kw), calc(a1, t, d, **kw)
        s0, _ = sim(a0, t, d, **kw)
        s1, _ = sim(a1, t, d, **kw)
        rc, rs = c1 / max(c0, 1e-9), s1 / max(s0, 1e-9)
        ok = abs(rc - rs) <= max(0.08, 0.08 * rc) and abs(c0 - s0) <= max(0.12 * s0, 0.08)
        direction = {'up': rc > 1.02 and rs > 1.02, 'same': abs(rc - 1) < 0.03 and abs(rs - 1) < 0.06, 'down': rc < 0.98 and rs < 0.98}[expect]
        rows.append((label, tname, d, kw, c0, c1, s0, s1, rc, rs, ok and direction))
    # extra attacks: main + extra vs main only
    main = W('Claws', 'Melee', 'Melee', 3, '4+', -1, 1)
    jaws = W('Jaws', 'Melee', 'Melee', 1, '4+', -1, 1, '[EXTRA ATTACKS]')
    a0, a1, t = acard([main]), acard([main, jaws]), tcard('line (10× M1 ARM4)')
    c0, c1, (s0, _), (s1, _) = calc(a0, t, 0), calc(a1, t, 0), sim(a0, t, 0), sim(a1, t, 0)
    rc, rs = c1 / c0, s1 / s0
    rows.append(('[EXTRA ATTACKS] adds to best weapon', 'line (10× M1 ARM4)', 0, {}, c0, c1, s0, s1, rc, rs, abs(rc - rs) < 0.08 and rc > 1.2))
    # overload self-damage
    pl = W('Plasma', 'Ranged', '24"', 1, '3+', -2, 2, '[OVERLOAD]')
    a = acard([pl])
    _, own = sim(a, tcard('elite (5× M2 ARM3)'), 20)
    exp_own = 5 * (1 / 3)
    rows.append(('[OVERLOAD] self-damage per volley (5 models)', 'any', 20, {}, exp_own, exp_own, own, own, 1.0, own / exp_own,
                 abs(own - exp_own) / exp_own < 0.08))
    return rows


def main():
    rows = run()
    L = ['# Trait Lab — calculator vs simulator, trait by trait', '',
         f'*`scripts/trait_lab.py` · {N} simulated volleys per cell · attacker: 5 models, Hit 3+ · damage = MIGHT removed per Shoot/Fight*', '',
         '| Trait | Target | Dist | Condition | Calc without → with | Sim without → with | Effect calc | Effect sim | Pass |',
         '| :-- | :-- | --: | :-- | :-- | :-- | --: | --: | :-: |']
    for label, tname, d, kw, c0, c1, s0, s1, rc, rs, ok in rows:
        cond = ', '.join(k if v is True else f'{k}={v}' for k, v in kw.items() if v) or '–'
        L.append(f'| {label} | {tname} | {d}″ | {cond} | {c0:.2f} → {c1:.2f} | {s0:.2f} → {s1:.2f} | ×{rc:.2f} | ×{rs:.2f} | {"✅" if ok else "❌"} |')
    passed = sum(1 for r in rows if r[-1])
    L += ['', f'**{passed} / {len(rows)} pass.** A pass means the trait moves damage in the right direction and the calculator and '
          'simulator agree within 8% on the size of the effect and within 12% on absolute damage.', '',
          'Not dice traits (no damage effect to test): `[ASSAULT]` (shoot after Sprint), `[CLOSE-QUARTERS]` (fire while engaged — '
          'the simulator enforces it), `[PRECISION]` (snipe Leaders — priced as a small utility), `[HARPOON]` (drag 3″ — flat-priced '
          'on each datasheet), `[SUPPRESSIVE]` (Suppression tokens — UTILITY table).']
    out = os.path.join(U.ROOT, 'gametheory', 'calc_output', 'trait_lab.md')
    open(out, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print('\n'.join(L))


if __name__ == '__main__':
    main()
