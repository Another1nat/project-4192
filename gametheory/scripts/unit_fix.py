#!/usr/bin/env python3
"""
unit_fix.py — damped per-datasheet price correction from battle_sim's unit value-per-point measurement.

    python3 battle_sim.py units --all --games 20000 --json units.json
    python3 unit_fix.py units.json            # writes UNIT_MULT into catalogue/pricing_config.json

Only "dice-pure" datasheets are corrected: Leaders and units whose price is mostly flat-priced rules (auras, heals,
drag, spells, spotting…) are skipped, because the simulator cannot see what those rules do.
Correction = sqrt(value/pt ÷ median), only when outside 0.77–1.30, capped to ±25 %, compounded with any previous
UNIT_MULT and capped again. One table in the config, easy to inspect or delete.
"""
import json
import os
import statistics
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import unit_calculator as U  # noqa: E402

FLAT_SHARE_MAX = 0.12      # a unit is dice-pure if flat/utility/buff abilities are < 12 % of its raw price
BAND = (0.77, 1.30)
CAP = (0.75, 1.25)
MIN_N = 120


def rule_share(fac, entry, lib, calib):
    card, r, _, _ = U.price_entry(entry, lib, calib, fac)
    own = {a['name'] for a in entry.get('abilities', [])}
    # flat-priced abilities are listed in r['utility'] by price_card, next to keyword utilities
    non_dice = sum(v for n, v in r['utility'] + r['buffs'] if n in own and n != 'CTRL' and v > 0)
    return non_dice / max(r['raw'], 1e-6)


def main():
    rows = json.load(open(sys.argv[1], encoding='utf-8'))
    calib, lib = U.load_calibration(), U.load_library()
    facs = {}
    for p in sorted(os.listdir(os.path.join(U.ROOT, 'gametheory', 'factions'))):
        if p[:2].isdigit() and p.endswith('.json'):
            f = json.load(open(os.path.join(U.ROOT, 'gametheory', 'factions', p), encoding='utf-8'))
            facs[f['name']] = f
    info = {}
    for r in rows:
        fac = facs.get(r['faction'])
        e = next((u for u in fac['units'] if u['name'] == r['unit']), None) if fac else None
        if not e:
            continue
        leader = 'leader' in e.get('role', '').lower()
        info[(r['faction'], r['unit'])] = (leader, rule_share(fac, e, lib, calib), r)
    pure = [v[2]['value_per_pt'] for v in info.values() if not v[0] and v[1] < FLAT_SHARE_MAX and v[2]['n'] >= MIN_N]
    med = statistics.median(pure)
    cfg = json.load(open(U.PRICING_CONFIG_PATH, encoding='utf-8'))
    um = dict(cfg.get('UNIT_MULT', {}))
    changed = []
    for (fn, un), (leader, share, r) in info.items():
        if leader or share >= FLAT_SHARE_MAX or r['n'] < MIN_N:
            continue
        rel = r['value_per_pt'] / med
        if BAND[0] <= rel <= BAND[1]:
            continue
        step = min(CAP[1], max(CAP[0], rel ** 0.5))
        key = f'{fn}|{un}'
        new = round(min(CAP[1], max(CAP[0], um.get(key, 1.0) * step)), 3)
        if abs(new - um.get(key, 1.0)) >= 0.01:
            changed.append((key, um.get(key, 1.0), new, rel))
            um[key] = new
    cfg['UNIT_MULT'] = dict(sorted(um.items()))
    cfg['_UNIT_MULT'] = ('Per-datasheet correction from battle_sim units --all (scripts/unit_fix.py): dice-pure non-Leader units only, '
                         'sqrt of the value-per-point gap, capped 0.75–1.25. Delete an entry to revert it.')
    json.dump(cfg, open(U.PRICING_CONFIG_PATH, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    print(f'median value/pt of dice-pure units: {med:.2f}; {len(pure)} dice-pure units measured; {len(changed)} corrections')
    for k, o, n, rel in sorted(changed, key=lambda x: -x[3]):
        print(f'  {k[4:70]:<66} value/pt ×{rel:.2f}  mult {o:.3f} → {n:.3f}')


if __name__ == '__main__':
    main()
