#!/usr/bin/env python3
"""
unit_calculator.py — Base unit calculator for Project Codex: 4192 AD (Iron & Wrath).

ONE dice engine, THREE rule sets:
  40k   S-vs-T wound table, AP, invulnerable save, Feel No Pain, normal damage does not spill
  aos   flat Hit/Wound, Rend, Ward (rolled after a failed save), damage spills between models
  4192  flat Wound + [HARDENED], PEN, 3+ final save cap, [WARD X+] (alt. save, also capped 3+),
        [UNYIELDING X+] (rolled per MIGHT lost), normal damage does not spill  (CORE_RULES_MANUAL_4192 §4)

BASE value (what this file prices) =
    stat line + invulnerable/ward + Feel No Pain (core ability) + keywords printed on the weapons.
Everything else (datasheet abilities, auras, leaders, army rules, deployment/utility keywords) is
the ABILITY LAYER. Those are detected and listed, but not priced here — see
UNITS_CALCULATION_REFERENCE.md §6 for the plan.

Commands
  fit                       fit price coefficients on every scraped unit, write calibration + reports
  unit "<name>" [--faction] show the full breakdown for one 40k / AoS unit (plus its 4192 card)
  custom <file.json>        price hand-designed 4192 cards (base + abilities + utility + buffs)
  catalogue                 price every universal unit archetype -> gametheory/UNIT_CATALOGUE.md
  faction <file.json>       price a faction's datasheets -> <file>.md
  list <file.json>          validate and total an army list (game size, unit/leader/class limits)
  registry                  regenerate the unit + detachment tables inside gametheory/FACTION_REGISTRY.md
  validate <faction.json>   quality gate: stat envelopes, keywords, IP-safe names, 4192 vocabulary, unpriced abilities
"""

import argparse
import glob
import json
import math
import os
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
DB_40K = os.path.join(ROOT, 'data', 'wahapedia_text_database', '40k')
DB_AOS = os.path.join(ROOT, 'data', 'wahapedia_text_database', 'aos4')
OUT_DIR = os.path.join(ROOT, 'gametheory', 'calc_output')
CALIBRATION_PATH = os.path.join(OUT_DIR, 'calibration.json')

# ---------------------------------------------------------------------------
# Tunable assumptions (every number the model depends on lives here)
# ---------------------------------------------------------------------------
EHP_MIX = {'light': 0.40, 'medium': 0.40, 'heavy': 0.20}   # incoming fire mix
DPA_MIX = {'horde': 0.20, 'elite': 0.47, 'tank': 0.33}     # target mix (v4.3.2: measured — random armies 16/45/39 %,
                                                            # legal lists 23/51/27 % of points; was 35/45/20)
HALF_RANGE_UPTIME = 0.5   # Rapid Fire / Melta / [HAILFIRE] / [ERADICATE]
STATIONARY_UPTIME = 0.5   # Heavy / [HEAVY]
CHARGE_UPTIME = 0.5       # Lance / [CRASHING] / AoS Charge (+1 Damage)
RANGE_ELASTICITY = 0.15   # 4192: value of weapon range (overridden by pricing_config.json; see role_lab.py)
COVER_UPTIME = 0.5        # 4192: share of ranged attacks vs Class 1–3 targets that face Cover (-1 to Hit); same as battle_sim COVER_P
EHP_MEAN = 'geometric'      # how the fire mix combines: 'harmonic' (hits arrive in that mix) | 'geometric' | 'arithmetic'
BATTLE_ROUNDS = 4         # 4192 battles last 4 rounds (manual §2); One Shot weapons are averaged over them
MOB_PER_INCH = 0.05       # +5% per inch of Move above 6"
MOB_MAX_INCHES = 14       # Aircraft/jetbikes stop gaining after 14"
MOB_FLY = 0.10
T_REF = 4                 # 4192 has no Toughness: weapons are mapped vs T4, Toughness is folded into MIGHT
CLASS_SQUAD_CAP = {1: 10, 2: 5, 3: 2, 4: 1, 5: 1}  # 4192 max squad sizes (UNIT_CATALOGUE: C1 5–10, C2 3–5)
GAME_SCALE_4192 = 1.5     # GAME_SYSTEM_PLAN.md §3: 1,000 pts ≈ 6–11 units / 20–40 models (≈ 2/3 of a 40k 1,000-pt game)
BENCH_ATTACKER_SKILL = 4  # benchmark attackers hit on 4+ (used to price incoming hit modifiers)
INCOMING_RANGED_SHARE = 0.6  # share of incoming damage that is ranged (Stealth only protects this share)

BENCH_ATTACKS = {
    '40k':  {'light': dict(S=4, ap=0, D='1'), 'medium': dict(S=7, ap=2, D='2'), 'heavy': dict(S=12, ap=3, D='4')},
    'aos':  {'light': dict(wound=4, ap=0, D='1'), 'medium': dict(wound=3, ap=1, D='2'), 'heavy': dict(wound=2, ap=2, D='4')},
    '4192': {'light': dict(wound=4, ap=0, D='1'), 'medium': dict(wound=3, ap=2, D='2'), 'heavy': dict(wound=2, ap=3, D='4')},
}
BENCH_TARGETS = {
    '40k': {
        'horde': dict(T=3, sv=5, inv=None, fnp=None, W=1, models=10, kw={'INFANTRY'}),
        'elite': dict(T=5, sv=3, inv=None, fnp=None, W=3, models=5, kw={'INFANTRY'}),
        'tank':  dict(T=10, sv=2, inv=None, fnp=None, W=12, models=1, kw={'VEHICLE', 'MONSTER'}),
    },
    'aos': {
        'horde': dict(sv=5, ward=None, W=1, models=20, kw={'INFANTRY'}),
        'elite': dict(sv=3, ward=None, W=3, models=5, kw={'INFANTRY'}),
        'tank':  dict(sv=3, ward=None, W=12, models=1, kw={'MONSTER'}),
    },
    '4192': {
        'horde': dict(sv=5, ward=None, fnp=None, W=1, models=10, hardened=False, kw={'INFANTRY'}, cover_ok=True),
        'elite': dict(sv=3, ward=None, fnp=None, W=3, models=3, hardened=False, kw={'INFANTRY'}, cover_ok=True),
        'tank':  dict(sv=3, ward=None, fnp=None, W=12, models=1, hardened=True, kw={'VEHICLE', 'MONSTER'}),
    },
}

PRICING_CONFIG_PATH = os.path.join(ROOT, 'gametheory', 'catalogue', 'pricing_config.json')
ACTIVATION_FEE_PTS = None   # overridden by pricing_config.json
CLASS_MULT = {}             # e.g. {"4": 0.85} — data-driven correction per base Class (from battle_sim.py)
MELEE_RETALIATION_BONUS = 0.0  # extra melee value from the free Retaliation Strike (set in pricing_config.json)
UNIT_MULT = {}                 # per-datasheet sim correction ("Faction|Unit": x), dice-pure units only (battle_sim.py unitfix)
FACTION_MULT = {}              # per-faction balance multiplier (tuned by battle_sim.py balance; validate in playtests)
SIM_CORRECTION = {}            # data-driven unit-level correction learned by battle_sim.py calibrate


def load_pricing_config():
    """gametheory/catalogue/pricing_config.json overrides the knobs below (and UTILITY), so designers never edit code."""
    g = globals()
    if not os.path.exists(PRICING_CONFIG_PATH):
        return
    cfg = json.load(open(PRICING_CONFIG_PATH, encoding='utf-8'))
    for k, v in cfg.items():
        if k.startswith('_'):
            continue
        if k == 'UTILITY':
            g['UTILITY'] = {kk: tuple(vv) for kk, vv in v.items()}
        elif k in g:
            g[k] = v


# ---------------------------------------------------------------------------
# Dice helpers
# ---------------------------------------------------------------------------
DICE_RE = re.compile(r'^(\d*)D(\d+)(?:\+(\d+))?$')


def dice_dist(expr):
    """'D6+1' -> {2:1/6, ..., 7:1/6}. Plain numbers -> {n:1}. Unknown -> {1:1}."""
    s = str(expr).strip().upper().replace(' ', '')
    m = DICE_RE.match(s)
    if m:
        n, sides, add = int(m.group(1) or 1), int(m.group(2)), int(m.group(3) or 0)
        dist = {0: 1.0}
        for _ in range(n):
            nxt = defaultdict(float)
            for v, p in dist.items():
                for f in range(1, sides + 1):
                    nxt[v + f] += p / sides
            dist = nxt
        return {v + add: p for v, p in dist.items()}
    m = re.search(r'\d+', s)
    return {int(m.group()): 1.0} if m else {1: 1.0}


def d_mean(dist):
    return sum(v * p for v, p in dist.items())


def d_shift(dist, k):
    return {v + k: p for v, p in dist.items()} if k else dist


def d_floor1(dist):
    out = defaultdict(float)
    for v, p in dist.items():
        out[max(v, 1)] += p
    return dict(out)


def p_roll(target):
    """P(D6 >= target) for hit/wound rolls: natural 1 fails, natural 6 succeeds."""
    t = min(max(int(round(target)), 2), 6)
    return (7 - t) / 6.0


def p_save(target):
    """P(save) — no automatic success on a 6, so a target of 7+ means no save."""
    if target > 6:
        return 0.0
    return (7 - max(target, 2)) / 6.0


def target_num(val, default=None):
    m = re.search(r'(\d+)', str(val or ''))
    return int(m.group(1)) if m else default


def wound_target_40k(S, T):
    if S >= 2 * T:
        return 2
    if S > T:
        return 3
    if S == T:
        return 4
    if 2 * S > T:
        return 5
    return 6


_UTW_CACHE = {}


def unsaved_to_wounds(dist, W, spill, mitig):
    """MIGHT actually removed per unsaved wound (steady state, exact).
    No-spill rules: each unsaved wound hits the current model; damage beyond its remaining MIGHT is lost.
    UNYIELDING / FNP (`mitig` = chance to ignore) is rolled per damage point.
    By the renewal-reward theorem the rate is W / E[unsaved wounds needed to kill one model], and E[...] comes
    from a small dynamic programme over the model's remaining MIGHT. (v4.3: replaces E[min(D, W)] × keep, which
    over-valued random-Damage weapons vs multi-MIGHT models by up to ~25% and mis-valued UNYIELDING vs big hits —
    found by verify_all.py's brute-force dice check.)"""
    keep = 1.0 - mitig
    if spill:
        return d_mean(dist) * keep
    W = max(1, int(round(W)))
    key = (tuple(sorted(dist.items())), W, round(keep, 6))
    if key in _UTW_CACHE:
        return _UTW_CACHE[key]
    eff = defaultdict(float)                 # damage after per-point mitigation
    for v, p in dist.items():
        v = max(0, int(v))
        if keep >= 1.0:
            eff[v] += p
        else:
            for k in range(v + 1):
                eff[k] += p * math.comb(v, k) * keep ** k * (1 - keep) ** (v - k)
    p0 = eff.get(0, 0.0)
    if p0 >= 1.0 - 1e-12:
        _UTW_CACHE[key] = 0.0
        return 0.0
    f = [0.0] * (W + 1)                      # f[h] = expected unsaved wounds to remove h remaining MIGHT
    for h in range(1, W + 1):
        s_ = 1.0
        for d, p in eff.items():
            if d >= 1:
                s_ += p * f[max(h - d, 0)]
        f[h] = s_ / (1.0 - p0)
    out = W / f[W]
    _UTW_CACHE[key] = out
    return out

# ---------------------------------------------------------------------------
# Weapon keywords (normalised)
# ---------------------------------------------------------------------------


def parse_weapon_kw(raw_tokens, system):
    """a public rules database splits 'Rapid Fire 2' into tokens; AoS gives 'Crit (2 Hits)' strings."""
    text = ' '.join(raw_tokens).upper()
    kw = {}

    def num_after(word, default=1):
        m = re.search(word + r'\s*(D?\d+)', text)
        return d_mean(dice_dist(m.group(1))) if m else default

    if system == 'aos':
        if 'CRIT (2 HITS)' in text:
            kw['sustained'] = 1
        if 'CRIT (AUTO-WOUND)' in text:
            kw['lethal'] = True
        if 'CRIT (MORTAL)' in text:
            kw['devastating'] = True
        for m in re.finditer(r'ANTI-([A-Z\- ]+?) \(\+1 REND\)', text):
            kw.setdefault('anti_rend', set()).add(m.group(1).strip())
        if 'CHARGE (+1 DAMAGE)' in text:
            kw['charge_dmg'] = 1
        if 'COMPANION' in text:
            kw['companion'] = True
        return kw

    if 'TORRENT' in text:
        kw['torrent'] = True
    if 'SUSTAINED' in text:
        kw['sustained'] = num_after('SUSTAINED HITS')
    if 'LETHAL' in text:
        kw['lethal'] = True
    if 'DEVASTATING' in text:
        kw['devastating'] = True
    if 'TWIN' in text:
        kw['twin'] = True
    if 'RAPID FIRE' in text:
        kw['rapid'] = num_after('RAPID FIRE')
    if 'MELTA' in text:
        kw['melta'] = num_after('MELTA')
    if 'BLAST' in text:
        kw['blast'] = True
    if re.search(r'\bHEAVY\b', text):
        kw['heavy'] = True
    if 'LANCE' in text:
        kw['lance'] = True
    if 'ONE SHOT' in text:
        kw['one_shot'] = True
    if 'EXTRA ATTACKS' in text:
        kw['extra_attacks'] = True
    if 'PISTOL' in text:
        kw['pistol'] = True
    for m in re.finditer(r'ANTI-([A-Z\-/ ]+?)\s+(\d)\+', text):
        kw.setdefault('anti', {})[m.group(1).strip()] = int(m.group(2))
    for tag in ('ASSAULT', 'IGNORES COVER', 'INDIRECT', 'PRECISION', 'HAZARDOUS', 'PSYCHIC', 'CLOSE-QUARTERS', 'CLEAVE'):
        if tag in text:
            kw[tag.lower().replace(' ', '_').replace('-', '_')] = True
    return kw


def anti_matches(anti_key, target_kw):
    # 'non-MONSTER/VEHICLE' style keys are excluded on purpose (they target infantry)
    key = anti_key.upper()
    if key.startswith('NON-'):
        excluded = set(key[4:].split('/'))
        return not (target_kw & excluded)
    return any(part.strip() in target_kw for part in key.split('/'))

# ---------------------------------------------------------------------------
# The attack sequence (one weapon, one target, one situation)
# ---------------------------------------------------------------------------


def resolve(system, wpn, tgt, half_range=False, stationary=False, charged=False):
    """Expected wounds removed from `tgt` by ONE model firing/swinging `wpn` once."""
    kw = wpn['kw']
    om = wpn.get('mods', {})                  # ability modifiers (delta method), see ABILITY MODS below
    attacks = d_mean(dice_dist(wpn['A'])) + om.get('attacks_mod', 0)
    if half_range and kw.get('rapid'):
        attacks += kw['rapid']
    if kw.get('blast'):
        if system == '4192':   # [SHRAPNEL X] / [REAPING X]: +X per 3 models, max +3
            attacks += min(kw['blast'] * (tgt['models'] // 3), 3)
        else:                  # 40k Blast: +1 per 5 models
            attacks += tgt['models'] // 5
    if kw.get('one_shot'):
        attacks /= BATTLE_ROUNDS

    # STEP 1: hit
    if kw.get('torrent'):
        normal_hits, crit_hits = attacks, 0.0
    else:
        mod = (1 if (stationary and kw.get('heavy')) else 0) + om.get('hit_mod', 0)
        neg = 0
        if wpn['type'] == 'Ranged':
            neg += tgt.get('mods', {}).get('incoming_hit_mod_ranged', 0)
            if tgt.get('cover') and not (kw.get('ignores_cover') or kw.get('indirect')):
                neg -= 1                          # 4192 Benefit of Cover: -1 to Hit at range
        else:
            neg += tgt.get('mods', {}).get('incoming_hit_mod_melee', 0)
        if kw.get('psychic'):
            neg = max(neg, 0)                     # [PSYCHIC / ARCANE]: ignore negative Hit modifiers
        mod += neg
        if system == '4192':
            mod = max(-1, min(1, mod))        # manual §4: hit rolls never modified by more than ±1
        p_hit = p_roll(wpn['skill'] - mod)
        c_hit = (7 - om.get('crit_hit_on', 6)) / 6.0
        p_hit = max(p_hit, c_hit)
        rr = om.get('reroll_hit')
        if rr == 'all':
            p_hit, c_hit = p_hit + (1 - p_hit) * p_hit, c_hit + (1 - p_hit) * c_hit
        elif rr == 'ones':
            p_hit, c_hit = p_hit + p_hit / 6.0, c_hit + c_hit / 6.0
        crit_hits = attacks * c_hit
        normal_hits = attacks * p_hit - crit_hits
    sustained = kw.get('sustained', 0) + om.get('sustained', 0)
    lethal = kw.get('lethal') or om.get('lethal')
    extra_hits = crit_hits * sustained
    auto_wounds = crit_hits if lethal else 0.0
    to_wound = normal_hits + extra_hits + (0.0 if lethal else crit_hits)

    # STEP 2: wound
    if system == '40k':
        need = wound_target_40k(wpn['S'], tgt['T'])
    else:
        need = wpn['wound'] + (1 if (system == '4192' and tgt.get('hardened')) else 0) \
            - (1 if (system == '4192' and tgt.get('frail')) else 0)
    if charged and (kw.get('lance') or kw.get('crashing')):
        need -= 1
    need += tgt.get('mods', {}).get('incoming_wound_mod', 0) - om.get('wound_mod', 0)
    need = min(max(need, 2), 6)
    crit_on = om.get('crit_wound_on', 6)
    for key, y in kw.get('anti', {}).items():
        if anti_matches(key, tgt['kw']):
            crit_on = min(crit_on, y)
    p_w = (7 - min(need, crit_on)) / 6.0
    p_cw = (7 - crit_on) / 6.0
    if kw.get('twin') or kw.get('relentless') or om.get('reroll_wound') == 'all':
        p_w, p_cw = p_w + (1 - p_w) * p_w, p_cw + (1 - p_w) * p_cw
    elif om.get('reroll_wound') == 'ones':
        p_w, p_cw = p_w + p_w / 6.0, p_cw + p_cw / 6.0
    wounds = to_wound * p_w
    crit_wounds = to_wound * p_cw if (kw.get('devastating') or om.get('devastating')) else 0.0
    normal_wounds = wounds - crit_wounds + auto_wounds

    # STEP 3: save
    ap = wpn['ap'] + om.get('pen_mod', 0)
    if system == 'aos':
        for key in kw.get('anti_rend', ()):
            if key in tgt['kw']:
                ap += 1
    st = tgt['sv'] + ap
    if system == '40k' and tgt.get('inv'):
        st = min(st, tgt['inv'])
    if system == '4192':
        if tgt.get('ward'):
            st = min(st, tgt['ward'])
        st = max(st, 3)                       # the 3+ final save cap
    p_fail = 1.0 - p_save(st)

    # damage
    dmg = dice_dist(wpn['D'])
    if half_range and kw.get('melta'):
        dmg = d_shift(dmg, int(round(kw['melta'])))
    if charged and kw.get('charge_dmg'):
        dmg = d_shift(dmg, kw['charge_dmg'])
    dmg = d_shift(dmg, om.get('dmg_mod', 0))
    if tgt.get('mods', {}).get('incoming_dmg_mod'):
        dmg = d_floor1(d_shift(dmg, tgt['mods']['incoming_dmg_mod']))
    spill = system == 'aos'
    mitig_key = 'ward' if system == 'aos' else 'fnp'
    mitig = p_save(tgt[mitig_key]) if tgt.get(mitig_key) else 0.0
    out = normal_wounds * p_fail * unsaved_to_wounds(dmg, tgt['W'], spill, mitig)
    # Devastating / Crit (Mortal) / [SHREDDING WOUNDS]: skip the save (and the 4192 ward); FNP still applies;
    # capped at one model per critical wound (4192 '1-Model Balance Cap', 40k excess damage lost)
    out += crit_wounds * unsaved_to_wounds(dmg, tgt['W'], spill, mitig)
    return out


def weapon_dpa(system, wpn, tgt):
    """Blend the conditional situations by their uptimes."""
    ranged = wpn['type'] == 'Ranged'
    total = 0.0
    if ranged:
        covers = ((True, COVER_UPTIME), (False, 1 - COVER_UPTIME)) if (system == '4192' and tgt.get('cover_ok')) else ((False, 1.0),)
        for cv, pcv in covers:
            t2 = dict(tgt, cover=cv)
            for hr, phr in ((True, HALF_RANGE_UPTIME), (False, 1 - HALF_RANGE_UPTIME)):
                for stn, pst in ((True, STATIONARY_UPTIME), (False, 1 - STATIONARY_UPTIME)):
                    total += pcv * phr * pst * resolve(system, wpn, t2, half_range=hr, stationary=stn)
    else:
        for ch, pch in ((True, CHARGE_UPTIME), (False, 1 - CHARGE_UPTIME)):
            total += pch * resolve(system, wpn, tgt, charged=ch)
    return total

# ---------------------------------------------------------------------------
# Durability (EHP): hits needed to wipe the unit, averaged over the incoming-fire mix
# ---------------------------------------------------------------------------


def unit_ehp(system, d):
    dm = d.get('mods', {})
    out = {}
    for name, b in BENCH_ATTACKS[system].items():
        if system == '40k':
            p_w = p_roll(wound_target_40k(b['S'], d['T']) + dm.get('incoming_wound_mod', 0))
        else:
            p_w = p_roll(b['wound'] + (1 if (system == '4192' and d.get('hardened')) else 0)
                         - (1 if (system == '4192' and d.get('frail')) else 0) + dm.get('incoming_wound_mod', 0))
        st = d['sv'] - dm.get('save_mod', 0) + b['ap']
        if system == '40k' and d.get('inv'):
            st = min(st, d['inv'])
        if system == '4192':
            if d.get('ward'):
                st = min(st, d['ward'])
            st = max(st, 3)
        p_fail = 1.0 - p_save(st)
        mitig_key = 'ward' if system == 'aos' else 'fnp'
        mitig = p_save(d[mitig_key]) if d.get(mitig_key) else 0.0
        dist = dice_dist(b['D'])
        if dm.get('incoming_dmg_mod'):
            dist = d_floor1(d_shift(dist, dm['incoming_dmg_mod']))
        per_unsaved = unsaved_to_wounds(dist, d['W'], system == 'aos', mitig)
        removed_per_hit = max(p_w * p_fail * per_unsaved, 1e-3)
        out[name] = d['W'] * d['models'] / removed_per_hit
    ehp = mix_mean(out, EHP_MIX, EHP_MEAN)
    # incoming hit modifiers (Stealth, terror…): benchmark attackers hit on BENCH_ATTACKER_SKILL+
    hr, hm = dm.get('incoming_hit_mod_ranged', 0), dm.get('incoming_hit_mod_melee', 0)
    if hr or hm:
        def f(m):
            m = max(-1, min(1, m)) if system == '4192' else m
            return p_roll(BENCH_ATTACKER_SKILL) / p_roll(BENCH_ATTACKER_SKILL - m)
        ehp = ehp / (INCOMING_RANGED_SHARE / f(hr) + (1 - INCOMING_RANGED_SHARE) / f(hm))
    return ehp, out


def mix_mean(vals, weights, mode):
    if mode == 'harmonic':      # expected wounds per hit is the weighted average -> hits-to-kill is its inverse
        return 1.0 / sum(weights[k] / vals[k] for k in vals)
    if mode == 'geometric':
        return math.exp(sum(weights[k] * math.log(vals[k]) for k in vals))
    return sum(weights[k] * vals[k] for k in vals)

# ---------------------------------------------------------------------------
# Offense (DPA): wounds removed per activation, averaged over the target mix
# ---------------------------------------------------------------------------


def best_by_group(system, weapons, tgt):
    """Profiles like 'Plasma gun – standard/supercharge' are one weapon: the player picks the better one."""
    best = {}
    for w in weapons:
        v = weapon_dpa(system, w, tgt)
        g = w['group']
        if g not in best or v > best[g][0]:
            best[g] = (v, w)
    return best


def unit_dpa(system, unit):
    """Each model: fires all its ranged weapons (pistols only if nothing else / vehicles & monsters),
    fights with its best melee weapon plus any Extra Attacks / Companion weapons."""
    res = {}
    for tname, tgt in BENCH_TARGETS[system].items():
        ranged = melee = 0.0
        for slot in unit['loadout']:          # slot = {'count': n_models, 'weapons': [...]}
            n = slot['count']
            r = [w for w in slot['weapons'] if w['type'] == 'Ranged']
            m = [w for w in slot['weapons'] if w['type'] != 'Ranged']
            rb = best_by_group(system, r, tgt)
            if not unit.get('big') and any(not w['kw'].get('pistol') for _, w in rb.values()):
                rb = {g: vw for g, vw in rb.items() if not vw[1]['kw'].get('pistol')}
            ranged += n * sum(v for v, _ in rb.values())
            mb = best_by_group(system, m, tgt)
            main = [v for v, w in mb.values() if not (w['kw'].get('extra_attacks') or w['kw'].get('companion'))]
            extra = [v for v, w in mb.values() if (w['kw'].get('extra_attacks') or w['kw'].get('companion'))]
            if unit.get('sum_melee'):
                melee += n * (sum(main) + sum(extra))
            else:
                melee += n * ((max(main) if main else 0.0) + sum(extra))
        if system == '4192':      # overkill: one Shoot or Fight cannot remove more MIGHT than the target unit has
            cap = tgt['W'] * tgt['models']
            ranged, melee = min(ranged, cap), min(melee, cap)
        res[tname] = {'ranged': ranged, 'melee': melee}
    ranged = sum(DPA_MIX[t] * v['ranged'] for t, v in res.items())
    melee = sum(DPA_MIX[t] * v['melee'] for t, v in res.items())
    return ranged, melee, res


def mobility(move, fly):
    return 1.0 + max(min(move, MOB_MAX_INCHES) - 6.0, 0.0) * MOB_PER_INCH + (MOB_FLY if fly else 0.0)


def reach_factor(unit):
    """4192: longer guns shoot earlier and from safety. Ranged DPA x (R/24)^RANGE_ELASTICITY, R = damage-weighted
    weapon range (6–48\"). Set in pricing_config.json (0.15 in v4.3.2). The simulator still shows a residual of about
    +0.19, almost all from >36\" guns that hang back and survive. That is partly an AI artefact, so it is not chased further."""
    if not RANGE_ELASTICITY:
        return 1.0
    ws = [w for slot in unit['loadout'] for w in slot['weapons'] if w['type'] == 'Ranged']
    if not ws:
        return 1.0
    num = den = 0.0
    for w in ws:
        a = d_mean(dice_dist(w['A'])) * d_mean(dice_dist(w['D']))
        num += a * min(48.0, max(6.0, target_num(w.get('range', '24'), 24)))
        den += a
    return (num / max(den, 1e-9) / 24.0) ** RANGE_ELASTICITY


def features(system, unit):
    ehp, ehp_detail = unit_ehp(system, unit['def'])
    ranged, melee, dpa_detail = unit_dpa(system, unit)
    if system == '4192':
        ranged *= reach_factor(unit)
    if system == '4192':
        melee *= 1 + MELEE_RETALIATION_BONUS   # 4192 retaliation: melee units also strike back once per round
    dpa = ranged + melee
    mob = mobility(unit['move'], unit['fly'])
    cp = math.sqrt(max(ehp, 1.0) * max(dpa, 0.1)) * mob
    oc = unit['oc'] * unit['def']['models']
    return {'cp': cp, 'ehp': ehp, 'dpa': dpa, 'ranged_dpa': ranged, 'melee_dpa': melee,
            'oc_total': oc, 'mobility': mob, 'ehp_detail': ehp_detail, 'dpa_detail': dpa_detail}


FEATURE_KEYS = ['cp', 'ehp', 'dpa', 'oc_total']


def price_raw(feat, coefs):
    return coefs['intercept'] + sum(coefs[k] * feat[k] for k in FEATURE_KEYS)


def price(feat, coefs):
    return max(5, int(round(price_raw(feat, coefs) / 5.0)) * 5)

# ---------------------------------------------------------------------------
# Loaders: 40k
# ---------------------------------------------------------------------------
LEADER_WORDS = re.compile(r"sergeant|superior|champion|leader|\bnob\b|boss|exarch|alpha|prime|bone ?.?ead|aspiring|"
                          r"sybarite|hekatrix|shas'ui|shas’ui|acolyte hybrid leader|veteran|herald|icon|captain|"
                          r"master|sister superior|warden|lord|chief|princeps|kaptin|pack leader|huntmaster", re.I)


def norm_name(s):
    s = s.lower().replace('’', "'").strip()
    s = re.sub(r'^\d+\s+', '', s)
    s = re.sub(r'\s+', ' ', s)
    return s.rstrip('s').strip()


def weapon_group(name):
    return norm_name(re.split(r'\s+[–-]\s+', name)[0])


def parse_40k_weapon(w):
    S = target_num(w.get('strength'), 4)
    ap = abs(target_num(w.get('ap'), 0) or 0)
    skill = target_num(w.get('skill'), None)
    kw = parse_weapon_kw(w.get('keywords', []), '40k')
    return {'name': w['name'], 'group': weapon_group(w['name']), 'type': w.get('type', 'Melee'),
            'range': w.get('range', ''), 'A': w.get('atk', '1'), 'skill': skill or 4, 'skill_raw': skill,
            'S': S, 'ap': ap, 'D': w.get('damage', '1'), 'kw': kw, 'raw_kw': w.get('keywords', [])}


def parse_loadout_40k(comp_text, weapons, models):
    """'Every Shock Trooper is equipped with: lasgun; close combat weapon.' -> slots of models x weapons."""
    groups = defaultdict(list)
    for w in weapons:
        groups[w['group']].append(w)
    slots = []
    for m in re.finditer(r'(?:is|are) equipped with:\s*([^.]*)', comp_text or ''):
        items = m.group(1)
        before = comp_text[max(0, m.start() - 120):m.start()]
        starts = list(re.finditer(r'(Every|Each|The|This|All)\b', before))
        subject = before[starts[-1].start():].strip() if starts else before.strip()[-40:]
        found = []
        for item in items.split(';'):
            it = norm_name(item)
            if not it:
                continue
            for g, ws in groups.items():
                if g == it or g.startswith(it) or it.startswith(g):
                    found.extend(ws)
                    break
        subj = subject.lower()
        if re.search(r'\b(every|each|all) model|this model', subj):
            n = models
        elif LEADER_WORDS.search(subj) or subj.startswith('the '):
            n = 1
        else:
            n = None   # 'the rest'
        slots.append({'count': n, 'weapons': found, 'subject': subject})
    slots = [s for s in slots if s['weapons']]
    if not slots:
        return [{'count': models, 'weapons': weapons, 'subject': 'fallback: all profiles'}], True
    fixed = sum(s['count'] for s in slots if s['count'] is not None)
    rest = [s for s in slots if s['count'] is None]
    for s in rest:
        s['count'] = max(models - fixed, 0) / len(rest)
    if not rest and fixed < models and len(slots) == 1:
        slots[0]['count'] = models
    return slots, False


def load_40k():
    units, seen = [], set()
    for f in sorted(glob.glob(os.path.join(DB_40K, '*.json'))):
        for x in json.load(open(f, encoding='utf-8'))['units']:
            st = x.get('stats') or {}
            if not st.get('W') or not x.get('primary_points'):
                continue
            if (x['name'], x['primary_points']) in seen:   # allied datasheets repeat across factions
                continue
            seen.add((x['name'], x['primary_points']))
            m = re.search(r'(\d+)\s*model', x.get('primary_composition', ''))
            models = int(m.group(1)) if m else 1
            weapons = [parse_40k_weapon(w) for w in x.get('weapons', [])]
            loadout, fallback = parse_loadout_40k(x.get('composition_text', ''), weapons, models)
            core = x.get('core_abilities', [])
            fnp = None
            for c in core:
                mm = re.search(r'Feel No Pain (\d)\+', c, re.I)
                if mm:
                    fnp = int(mm.group(1))
            kws = set(k.upper() for k in x.get('unit_keywords', []))
            units.append({
                'system': '40k', 'faction': x['faction'], 'name': x['name'], 'role': x.get('role', ''),
                'base_size': x.get('base_size', ''), 'points': x['primary_points'], 'keywords': kws,
                'move': target_num(st.get('M'), 6), 'fly': 'FLY' in kws, 'oc': target_num(st.get('OC'), 0) or 0,
                'big': bool(kws & {'VEHICLE', 'MONSTER'}), 'sum_melee': False,
                'def': {'T': target_num(st.get('T'), 4), 'sv': target_num(st.get('SV'), 7), 'W': target_num(st.get('W'), 1),
                        'inv': target_num(x.get('invuln')), 'fnp': fnp, 'models': models},
                'weapons': weapons, 'loadout': loadout, 'loadout_fallback': fallback,
                'core_abilities': core, 'abilities': x.get('datasheet_abilities', []),
                'wargear_abilities': x.get('wargear_abilities', []),
            })
    return units

# ---------------------------------------------------------------------------
# Loaders: fantasy wargames 4
# ---------------------------------------------------------------------------


def load_aos():
    units, seen = [], set()
    for f in sorted(glob.glob(os.path.join(DB_AOS, '*.json'))):
        for x in json.load(open(f, encoding='utf-8'))['units']:
            st = x.get('stats') or {}
            if not st.get('Health') or not x.get('primary_points') or not x.get('weapons'):
                continue
            if (x['name'], x['primary_points']) in seen:
                continue
            seen.add((x['name'], x['primary_points']))
            m = re.search(r'(\d+)\s*model', x.get('primary_composition', ''))
            models = int(m.group(1)) if m else 1
            weapons = []
            for w in x['weapons']:
                weapons.append({'name': w['name'], 'group': norm_name(w['name']), 'type': w.get('type', 'Melee'),
                                'A': w.get('atk', '1'), 'skill': target_num(w.get('hit'), 4),
                                'wound': target_num(w.get('wound'), 4), 'ap': target_num(w.get('rend'), 0) or 0,
                                'D': w.get('damage', '1'), 'kw': parse_weapon_kw(w.get('abilities', []), 'aos')})
            kws = set(k.upper() for k in x.get('keywords', []))
            ward = None
            for k in kws:
                mm = re.match(r'WARD \((\d)\+\)', k)
                if mm:
                    ward = int(mm.group(1))
            units.append({
                'system': 'aos', 'faction': x['faction'], 'name': x['name'], 'role': ', '.join(x.get('keywords_line1', [])),
                'base_size': x.get('base_size', ''), 'points': x['primary_points'], 'keywords': kws,
                'move': target_num(st.get('M'), 5), 'fly': 'FLY' in kws, 'oc': target_num(st.get('Control'), 0) or 0,
                'big': True, 'sum_melee': models == 1,
                'def': {'sv': target_num(st.get('Save'), 7), 'W': target_num(st.get('Health'), 1), 'ward': ward, 'models': models},
                'weapons': weapons, 'loadout': [{'count': models, 'weapons': weapons, 'subject': 'all'}],
                'loadout_fallback': models > 1,
                'core_abilities': [], 'abilities': x.get('abilities', []),
            })
    return units

# ---------------------------------------------------------------------------
# 40k -> 4192 translation (durability-preserving)
# ---------------------------------------------------------------------------
TRAIT_MAP = [('torrent', '[SCORCH]'), ('sustained', '[ONSLAUGHT {}]'), ('lethal', '[IMPALING HITS]'),
             ('devastating', '[SHREDDING WOUNDS]'), ('twin', '[RELENTLESS]'), ('rapid', '[HAILFIRE {}]'),
             ('melta', '[ERADICATE {}]'), ('blast', '[SHRAPNEL 1]'), ('heavy', '[HEAVY]'), ('lance', '[CRASHING]'),
             ('one_shot', '[ONE SHOT]'), ('extra_attacks', '[EXTRA ATTACKS]'), ('pistol', '[CLOSE-QUARTERS]'),
             ('close_quarters', '[CLOSE-QUARTERS]'), ('assault', '[ASSAULT]'), ('ignores_cover', '[IGNORES COVER]'),
             ('indirect', '[INDIRECT FIRE]'), ('precision', '[PRECISION]'), ('hazardous', '[OVERLOAD]'),
             ('psychic', '[PSYCHIC / ARCANE]')]

UNIT_TAG_MAP = [(r'deep strike', '[VANGUARD STRIKE]'), (r'infiltrators', '[INFILTRATORS]'), (r'scouts (\d+)', '[SCOUTS {}"]'),
                (r'stealth', '[STEALTH]'), (r'lone operative', '[UNSEEN 12"]'), (r'fights first', '[STRIKE FIRST]'),
                (r'deadly demise (\S+)', '[DETONATE {}]'), (r'firing deck (\d+)', '[FIRING DECK {}]')]


def base_class(unit):
    kws, b = unit['keywords'], unit['base_size']
    if 'TITANIC' in kws:
        return 5
    # first size only: '(⌀25mm60 x 35mm if equipped with …)' is a 25mm model
    m = re.search(r'(\d+(?:\.\d+)?)\s*(?:(?:x|×)\s*(\d+(?:\.\d+)?)\s*)?mm', b, re.I)
    if m:
        big = float(m.group(1))
        if m.group(2):   # oval: 60x35 -> 2, 75x42 -> 3, 90-120 -> 4
            return 2 if big <= 60 else 3 if big <= 80 else 4 if big <= 120 else 5
        return 1 if big <= 32 else 2 if big <= 50 else 3 if big <= 80 else 4 if big <= 120 else 5
    # no base size ('Use model' or blank): fall back to keywords and wounds
    if kws & {'VEHICLE', 'MONSTER'}:
        return 3 if 'WALKER' in kws and unit['def']['W'] <= 8 else 4
    if kws & {'MOUNTED', 'TERMINATOR', 'CAVALRY', 'BEAST'} or unit['def']['W'] >= 3:
        return 2
    return 1


def q_toughness_40k(T):
    return sum(EHP_MIX[k] / p_roll(wound_target_40k(b['S'], T)) for k, b in BENCH_ATTACKS['40k'].items())


def q_toughness_4192(hardened):
    return sum(EHP_MIX[k] / p_roll(b['wound'] + (1 if hardened else 0)) for k, b in BENCH_ATTACKS['4192'].items())


def skill_mode(ws, default=4):
    vals = [w['skill_raw'] for w in ws if w.get('skill_raw')]
    return Counter(vals).most_common(1)[0][0] if vals else default


def translate_40k_to_4192(u):
    d = u['def']
    cls = base_class(u)
    hardened = cls >= 4
    # Toughness has no 4192 equivalent: fold it into MIGHT so durability vs the benchmark fire mix is preserved.
    t_ratio = q_toughness_40k(d['T']) / q_toughness_40k(T_REF)
    h_ratio = q_toughness_4192(hardened) / q_toughness_4192(False)
    might = max(1, int(math.floor(d['W'] * t_ratio / h_ratio + 0.5)))
    models = max(1, min(d['models'], CLASS_SQUAD_CAP[cls]))
    used = []
    seen = set()
    for slot in u['loadout']:
        for w in slot['weapons']:
            if (w['name'], w['type']) not in seen:
                seen.add((w['name'], w['type']))
                used.append(w)
    ranged = [w for w in used if w['type'] == 'Ranged']
    melee = [w for w in used if w['type'] != 'Ranged']
    weapons = []
    for w in used:
        traits = []
        for key, label in TRAIT_MAP:
            if w['kw'].get(key):
                val = w['kw'][key]
                traits.append(label.format(int(val)) if '{}' in label else label)
        for key, y in w['kw'].get('anti', {}).items():
            traits.append(f'[ANTI-{key} {y}+]')
        wound = min(max(wound_target_40k(w['S'], T_REF), 2), 5)   # 4192 wound stats run 2+..5+
        weapons.append({'name': w['name'], 'group': w['group'], 'type': w['type'], 'range': w.get('range', ''),
                        'A': w['A'], 'wound': wound, 'pen': w['ap'], 'D': w['D'], 'traits': sorted(set(traits)),
                        'kw': dict(w['kw'], relentless=w['kw'].get('twin', False), crashing=w['kw'].get('lance', False))})
    text = ' '.join(u['core_abilities']).lower()
    tags = []
    for pat, label in UNIT_TAG_MAP:
        mm = re.search(pat, text)
        if mm:
            tags.append(label.format(*(g.upper() for g in mm.groups())) if mm.groups() else label)
    if u['fly']:
        tags.append('[FLY]')
    if hardened:
        tags.append('[HARDENED]')
    card = {
        'name': u['name'], 'source': f"40k / {u['faction']}", 'class': cls, 'models': models,
        'MOV': u['move'], 'MS': skill_mode(melee), 'RS': skill_mode(ranged),
        'ARM': max(d['sv'], 3), 'MIGHT': might, 'CTRL': u['oc'],
        'WARD': max(d['inv'], 3) if d.get('inv') else None, 'UNYIELDING': d.get('fnp'),
        'HARDENED': hardened, 'keywords': tags, 'weapons': weapons,
    }
    return card


def card_to_unit(card, mods_list=()):
    """A 4192 card (translated or hand-made) -> engine unit. mods_list = [(mods, scope)], scope ∈ all/ranged/melee/defense."""
    off = {'Ranged': merge_mods([m for m, sc in mods_list if sc in ('all', 'ranged')]),
           'Melee': merge_mods([m for m, sc in mods_list if sc in ('all', 'melee')])}
    dfn = merge_mods([m for m, sc in mods_list if sc == 'defense'])
    ws = []
    for w in card['weapons']:
        w = dict(w)
        w.setdefault('group', norm_name(w['name']))
        w.setdefault('kw', parse_4192_traits(w.get('traits', [])))
        w['skill'] = card['RS'] if w['type'] == 'Ranged' else card['MS']
        w['ap'] = abs(int(w.get('pen', w.get('ap', 0))))
        w['wound'] = int(target_num(w['wound'], 4))
        w['mods'] = off['Ranged' if w['type'] == 'Ranged' else 'Melee']
        ws.append(w)
    kws = set(card.get('keywords', []))
    ward, fnp = card.get('WARD'), card.get('UNYIELDING')
    if dfn.get('ward'):
        ward = min(ward or 7, dfn['ward'])
    if dfn.get('unyielding'):
        fnp = min(fnp or 7, dfn['unyielding'])
    return {
        'system': '4192', 'name': card['name'], 'move': card['MOV'] + dfn.get('move_mod', 0),
        'fly': '[FLY]' in kws or dfn.get('fly', False), 'oc': card['CTRL'],
        'big': card['class'] >= 4, 'sum_melee': False, 'keywords': kws,
        'def': {'sv': card['ARM'], 'W': card['MIGHT'], 'ward': ward, 'fnp': fnp, 'mods': dfn,
                'hardened': card.get('HARDENED', card['class'] >= 4), 'models': card['models'],
                'frail': '[FRAIL]' in kws},
        'loadout': [{'count': card['models'], 'weapons': ws, 'subject': 'all'}],
    }


# ---------------------------------------------------------------------------
# ABILITY MODS (delta method) — the vocabulary every 4192 ability is written in
#   offense : reroll_hit / reroll_wound ('ones'|'all'), hit_mod, wound_mod, pen_mod, dmg_mod, attacks_mod,
#             crit_hit_on (5 = crits on 5+), crit_wound_on, sustained (+X), lethal, devastating
#   defense : incoming_hit_mod_ranged / _melee (−1 = Stealth/terror), incoming_wound_mod (+1 = harder to wound),
#             incoming_dmg_mod (−1, min 1), save_mod (+1 ARM, cap 3+), ward (X+), unyielding (X+), move_mod, fly
# ---------------------------------------------------------------------------
ADDITIVE = {'hit_mod', 'wound_mod', 'pen_mod', 'dmg_mod', 'attacks_mod', 'sustained', 'incoming_hit_mod_ranged',
            'incoming_hit_mod_melee', 'incoming_wound_mod', 'incoming_dmg_mod', 'save_mod', 'move_mod'}


def merge_mods(mods):
    out = {}
    for m in mods:
        for k, v in m.items():
            if k in ADDITIVE:
                out[k] = out.get(k, 0) + v
            elif k in ('reroll_hit', 'reroll_wound'):
                out[k] = 'all' if 'all' in (v, out.get(k)) else v
            elif k in ('crit_hit_on', 'crit_wound_on', 'ward', 'unyielding'):
                out[k] = min(out.get(k, 7), v)
            else:
                out[k] = out.get(k) or v
    return out


# Non-dice abilities: (share of base price, minimum raw pts). Seeded from the GW residual study
# (UNITS_CALCULATION_REFERENCE §5) and corrected Part 2 values — calibrate with playtest data.
UTILITY = {
    'INFILTRATORS': (0.04, 3), 'SCOUTS': (0.04, 3), 'VANGUARD STRIKE': (0.03, 2), 'UNSEEN': (0.15, 5),
    'STRIKE FIRST': (0.10, 4), 'SECURED': (0.0, 6), 'SURGE': (0.05, 2), 'GLIDE': (0.12, 4),
    'FALL BACK AND ACT': (0.08, 3), 'FIRING DECK': (0.03, 2), 'PHASE': (0.08, 3), 'SUPPRESS IMMUNE': (0.05, 2),
}
TRANSPORT_PER_MODEL = 1.5      # raw pts per model of [TRANSPORT X] capacity
CLASS_MIN_PTS = {'3': 60, '4': 110, '5': 200}   # DESIGN KNOB: the sim cannot value transports/terrain blocking
ENHANCEMENT_MIN_PTS = 10       # DESIGN KNOB: an enhancement uses a limited slot, so it never costs less than this
CTRL_PTS_4192 = 0.5            # DESIGN KNOB: raw pts per CTRL point (×models). GW's points don't price OC, but
                               # 4192 scores 1 VP per objective per round, so control gets a modest price.
REFERENCE_SQUAD = {            # aura / leader buffs are priced as their effect on this squad × n_eff
    'name': 'Reference Battle-Brother Squad', 'class': 1, 'models': 5, 'MOV': 6, 'MS': 3, 'RS': 3, 'ARM': 3,
    'MIGHT': 2, 'CTRL': 2, 'keywords': [],
    'weapons': [{'name': 'Heavy rifle', 'type': 'Ranged', 'A': '2', 'wound': '4+', 'pen': '-1', 'D': '1', 'traits': ['[HAILFIRE 1]']},
                {'name': 'Chain-blade', 'type': 'Melee', 'A': '3', 'wound': '4+', 'pen': '-1', 'D': '1', 'traits': []}]}


load_pricing_config()


def utility_tags(card):
    tags = []
    for k in card.get('keywords', []):
        K = k.upper().strip('[]')
        for u in UTILITY:
            if K.startswith(u):
                tags.append(u)
        m = re.match(r'TRANSPORT (\d+)', K)
        if m:
            tags.append(('TRANSPORT', int(m.group(1))))
    for a in card.get('abilities', []):
        if a.get('utility'):
            tags.append(a['utility'].upper())
    if any('SUPPRESSIVE' in t.upper() for w in card['weapons'] for t in w.get('traits', [])):
        tags.append('SUPPRESSIVE')
    return [t for t in tags if isinstance(t, tuple) or t in UTILITY]


def _feat_with(card, mods_list):
    return features('4192', card_to_unit(card, mods_list))


def _price_from(ehp, dpa, mob, oc, coefs):
    cp = math.sqrt(max(ehp, 1.0) * max(dpa, 0.1)) * mob
    return price_raw({'cp': cp, 'ehp': ehp, 'dpa': dpa, 'oc_total': oc}, coefs)


def price_card(card, calib=None, scale=None):
    """Full 4192 price: base stat line + combat abilities (delta method) + utility + leader/aura buffs."""
    calib = calib or load_calibration()
    coefs = calib['4192']['coefs']
    scale = GAME_SCALE_4192 if scale is None else scale
    base = _feat_with(card, [])
    base_pts = price_raw(base, coefs)
    combat = [a for a in card.get('abilities', []) if a.get('mods') and not a.get('buff')]
    # each ability: EHP and DPA multipliers alone, blended by uptime, then stacked multiplicatively
    mults = []
    for a in combat:
        f = _feat_with(card, [(a['mods'], a.get('scope', 'all'))])
        u = a.get('uptime', 1.0)
        me = 1 + u * (f['ehp'] / base['ehp'] - 1)
        md = 1 + u * (f['dpa'] / max(base['dpa'], 1e-6) - 1)
        mob = f['mobility'] / base['mobility']
        mults.append((a['name'], me, md, 1 + u * (mob - 1)))

    # Lanchester pricing of abilities: value scales with sqrt(EHP x DPA) x mobility, applied to the fitted base
    # price. (The fitted coefficients under-weight DPA because DPA is the noisier measurement — attenuation bias —
    # so abilities use the symmetric law instead.)
    def stacked(skip=None):
        m = 1.0
        for n, me, md, mm in mults:
            if n != skip:
                m *= math.sqrt(me * md) * mm
        return base_pts * m
    total_combat = stacked()
    lines = [(n, total_combat - stacked(skip=n)) for n, *_ in mults]
    util = []
    for t in utility_tags(card):
        if isinstance(t, tuple):
            util.append((f'TRANSPORT {t[1]}', TRANSPORT_PER_MODEL * t[1]))
        else:
            pct, mn = UTILITY[t]
            util.append((t, pct * base_pts if pct < 0 else max(pct * base_pts, mn)))
    buffs = []
    ref0 = _feat_with(REFERENCE_SQUAD, [])
    ref_base = price_raw(ref0, coefs)
    for a in card.get('abilities', []):
        if a.get('buff'):
            f = _feat_with(REFERENCE_SQUAD, [(a['mods'], a.get('scope', 'all'))])
            m = math.sqrt(f['ehp'] / ref0['ehp'] * f['dpa'] / ref0['dpa']) * f['mobility'] / ref0['mobility']
            buffs.append((a['name'], ref_base * (m - 1) * a.get('uptime', 1.0) * a.get('n_eff', 1.0)))
    ov = overload_drawback(card, base)
    if ov:
        util.append(('OVERLOAD', -ov * base_pts))
    if any('PRECISION' in t.upper() for w in card['weapons'] for t in w.get('traits', [])):
        pct, mn = UTILITY.get('PRECISION', (0.03, 2))
        util.append(('PRECISION', max(pct * base_pts, mn)))
    if CTRL_PTS_4192 and card['CTRL']:
        util.append(('CTRL', CTRL_PTS_4192 * card['CTRL'] * card['models']))
    for a in card.get('abilities', []):
        if a.get('flat'):
            util.append((a['name'], a['flat'] * (card['models'] if a.get('per_model') else 1)))
    raw = total_combat + sum(v for _, v in util) + sum(v for _, v in buffs)
    scaled = raw * scale if ACTIVATION_FEE_PTS is None else (raw - coefs['intercept']) * scale + ACTIVATION_FEE_PTS
    scaled *= CLASS_MULT.get(str(card['class']), 1.0) * FACTION_MULT.get(card.get('_faction', ''), 1.0)
    scaled *= UNIT_MULT.get(f"{card.get('_faction', '')}|{card['name']}", 1.0)
    scaled *= sim_correction(card)
    scaled += card.get('points_adjust', 0)          # designer override, shown in every breakdown
    pts = int(round(scaled / 5.0)) * 5
    pts = max(pts, CLASS_MIN_PTS.get(str(card['class']), 0))   # design floor: big chassis never go bargain-bin
    return {'base_raw': base_pts, 'combat_raw': total_combat - base_pts, 'combat_lines': lines,
            'utility': util, 'buffs': buffs, 'raw': raw, 'points': max(pts, 5), 'scale': scale, 'feat': base,
            'adjust': card.get('points_adjust', 0)}


def overload_drawback(card, feat):
    """[OVERLOAD]: after firing, 1-2 on a D6 = 1 Fatal Wound to the firing model (3 if Class 4-5).
    Expected own-MIGHT loss per activation f = (1/3 x FW) / MIGHT; over ~3 firing rounds the unit keeps about
    (1-f)^1.5 of its value. Scaled by how much of the unit's damage the overload weapons provide (x2, capped at 1):
    a unit can choose not to fire a weapon it barely needs."""
    ov = [w for w in card['weapons'] if w['type'] == 'Ranged' and any('OVERLOAD' in t.upper() for t in w.get('traits', []))]
    if not ov:
        return 0.0
    fw = 3 if card['class'] >= 4 else 1
    f = min(0.5, (fw / 3.0) / max(card['MIGHT'], 1))
    loss = 1 - (1 - f) ** 1.5
    u = card_to_unit(card)
    tot = features('4192', u)['dpa']
    only = dict(card, weapons=[w for w in card['weapons'] if w not in ov])
    rest = features('4192', card_to_unit(only))['dpa'] if only['weapons'] else 0.0
    share = max(0.0, (tot - rest) / max(tot, 1e-6))
    return loss * min(1.0, 2 * share)


def sim_correction(card):
    """exp(Σ β·x): residuals the battle simulator measured (big squads, Class 4–5, melee-only), applied damped."""
    sc = SIM_CORRECTION
    if not sc:
        return 1.0
    melee_only = all(w['type'] != 'Ranged' for w in card['weapons'])
    leader = 'leader' in card.get('role', '').lower()       # Leaders excluded: the sim under-models auras/duels
    x = ((0 if leader else sc.get('log_models', 0) * (math.log(card['models']) - sc.get('log_models_center', 1.2)))
         + sc.get('class45', 0) * (1 if card['class'] >= 4 else 0)
         + sc.get('melee_only', 0) * (1 if melee_only else 0))
    return math.exp(x)


def price_enhancement(card, ability, calib=None):
    """Points an enhancement / upgrade adds to the unit that takes it (delta method on the bearer)."""
    with_e = dict(card, abilities=list(card.get('abilities', [])) + [ability])
    a, b = price_card(card, calib), price_card(with_e, calib)
    return max(ENHANCEMENT_MIN_PTS, int(round((b['raw'] - a['raw']) * a['scale'] / 5.0)) * 5)


def parse_4192_traits(traits):
    t = ' '.join(traits).upper()
    kw = {}

    def num(word):
        m = re.search(re.escape(word) + r'\s*(\d+)', t)
        return int(m.group(1)) if m else 1
    if 'SCORCH' in t: kw['torrent'] = True
    if 'ONSLAUGHT' in t: kw['sustained'] = num('ONSLAUGHT')
    if 'IMPALING' in t: kw['lethal'] = True
    if 'SHREDDING' in t: kw['devastating'] = True
    if 'RELENTLESS' in t: kw['relentless'] = True
    if 'HAILFIRE' in t: kw['rapid'] = num('HAILFIRE')
    if 'ERADICATE' in t: kw['melta'] = num('ERADICATE')
    if 'SHRAPNEL' in t or 'REAPING' in t: kw['blast'] = num('SHRAPNEL') if 'SHRAPNEL' in t else num('REAPING')
    if '[HEAVY]' in t: kw['heavy'] = True
    if 'CRASHING' in t: kw['crashing'] = True
    if 'ONE SHOT' in t: kw['one_shot'] = True
    if 'EXTRA ATTACKS' in t: kw['extra_attacks'] = True
    if 'IGNORES COVER' in t: kw['ignores_cover'] = True
    if 'INDIRECT' in t: kw['indirect'] = True
    if 'PSYCHIC' in t or 'ARCANE' in t: kw['psychic'] = True
    if 'OVERLOAD' in t: kw['overload'] = True
    if 'PRECISION' in t: kw['precision'] = True
    for m in re.finditer(r'ANTI-([A-Z\-/ ]+?)\s+(\d)\+', t):
        kw.setdefault('anti', {})[m.group(1).strip()] = int(m.group(2))
    return kw

# ---------------------------------------------------------------------------
# Ability layer (detection only — residual study, not pricing)
# ---------------------------------------------------------------------------
ABILITY_TAGS = {
    'deep_strike': r'\bdeep strike\b', 'infiltrators': r'\binfiltrators\b', 'scouts': r'\bscouts\b',
    'stealth': r'\bstealth\b', 'lone_operative': r'lone operative', 'fights_first': r'fights? first',
    'leader': r'^leader$|\bleader\b', 'deadly_demise': r'deadly demise', 'firing_deck': r'firing deck',
    'fnp_ability': r'feel no pain', 'reroll_hit': r're-?roll (?:the )?hit', 'reroll_wound': r're-?roll (?:the )?wound',
    'lethal_ability': r'lethal hits', 'sustained_ability': r'sustained hits', 'devastating_ability': r'devastating wounds',
    'minus_hit': r'subtract 1 from (?:the )?hit', 'minus_damage': r'subtract 1 from (?:the )?damage',
    'fall_back_shoot': r'fell back.*?(?:shoot|charge)', 'aura': r'\(aura\)|within 6"', 'transport': r'transport capacity|can transport',
    'once_per_battle': r'once per battle',
}


def ability_tags(u):
    core = ' | '.join(u.get('core_abilities', [])).lower()
    abil = ' | '.join((a.get('name', '') + ': ' + a.get('description', a.get('effect', ''))) for a in u.get('abilities', [])).lower()
    tags = set()
    for tag, pat in ABILITY_TAGS.items():
        src = core if tag in ('deep_strike', 'infiltrators', 'scouts', 'stealth', 'lone_operative', 'leader',
                              'deadly_demise', 'firing_deck', 'fights_first') else abil
        if tag == 'fights_first':
            src = core + ' ' + abil
        if re.search(pat, src):
            tags.add(tag)
    return tags

# ---------------------------------------------------------------------------
# Fitting (weighted least squares on relative error, no numpy needed)
# ---------------------------------------------------------------------------


def solve(A, b):
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        M[c], M[p] = M[p], M[c]
        if abs(M[c][c]) < 1e-12:
            continue
        for r in range(n):
            if r != c:
                f = M[r][c] / M[c][c]
                for k in range(c, n + 1):
                    M[r][k] -= f * M[c][k]
    return [M[i][n] / M[i][i] if abs(M[i][i]) > 1e-12 else 0.0 for i in range(n)]


def wls(X, y, w, ridge=1e-6):
    k = len(X[0])
    A = [[sum(w[i] * X[i][a] * X[i][b] for i in range(len(X))) + (ridge if a == b else 0) for b in range(k)] for a in range(k)]
    v = [sum(w[i] * X[i][a] * y[i] for i in range(len(X))) for a in range(k)]
    return solve(A, v)


def nn_wls(X, y, w, names):
    """Weighted LS, dropping any feature whose coefficient comes out negative (simple active set)."""
    active = list(range(len(names)))
    while True:
        beta = wls([[r[i] for i in active] for r in X], y, w)
        neg = [active[j] for j, b in enumerate(beta) if b < 0 and names[active[j]] != 'intercept']
        if not neg:
            out = {n: 0.0 for n in names}
            for j, i in enumerate(active):
                out[names[i]] = beta[j]
            return out
        active.remove(min(neg, key=lambda i: beta[active.index(i)]))


def fit_system(rows):
    names = FEATURE_KEYS + ['intercept']
    X = [[r['feat'][k] for k in FEATURE_KEYS] + [1.0] for r in rows]
    y = [r['target'] for r in rows]
    w = [1.0 / max(t, 10) for t in y]   # between absolute and relative error: best R² AND best typical % error
    return nn_wls(X, y, w, names)


def accuracy(rows, coefs):
    ys = [r['target'] for r in rows]
    ps = [price(r['feat'], coefs) for r in rows]
    mean = sum(ys) / len(ys)
    ss_tot = sum((v - mean) ** 2 for v in ys)
    ss_res = sum((v - p) ** 2 for v, p in zip(ys, ps))
    mae = sum(abs(v - p) for v, p in zip(ys, ps)) / len(ys)
    mape = sum(abs(v - p) / v for v, p in zip(ys, ps)) / len(ys)
    within20 = sum(1 for v, p in zip(ys, ps) if abs(v - p) / v <= 0.20) / len(ys)
    return {'n': len(ys), 'r2': round(1 - ss_res / ss_tot, 3), 'mae': round(mae, 1),
            'mape_pct': round(100 * mape, 1), 'within_20pct': round(100 * within20, 1)}


def load_calibration(auto_fit=True):
    if not os.path.exists(CALIBRATION_PATH):
        if not auto_fit:
            sys.exit('No calibration yet — run:  python3 gametheory/scripts/unit_calculator.py fit')
        cmd_fit(None)
    return json.load(open(CALIBRATION_PATH, encoding='utf-8'))


def price_4192(card, calib=None):
    """Public entry point: full price of a 4192 unit card. Returns (points, base features)."""
    r = price_card(card, calib)
    return r['points'], r['feat']


# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


def cmd_fit(args):
    os.makedirs(OUT_DIR, exist_ok=True)
    u40, uaos = load_40k(), load_aos()
    rows40 = [{'u': u, 'feat': features('40k', u), 'target': u['points']} for u in u40]
    rowsaos = [{'u': u, 'feat': features('aos', u), 'target': u['points']} for u in uaos]
    rows4192 = []
    for r in rows40:
        card = translate_40k_to_4192(r['u'])
        tu = card_to_unit(card)
        # the 4192 squad may be smaller than the 40k one: scale the reference price per model
        tgt = r['u']['points'] * card['models'] / r['u']['def']['models']
        rows4192.append({'u': r['u'], 'card': card, 'feat': features('4192', tu), 'target': tgt})

    calib = {'assumptions': {
        'EHP_MIX': EHP_MIX, 'DPA_MIX': DPA_MIX, 'HALF_RANGE_UPTIME': HALF_RANGE_UPTIME,
        'STATIONARY_UPTIME': STATIONARY_UPTIME, 'CHARGE_UPTIME': CHARGE_UPTIME, 'T_REF': T_REF,
        'CLASS_SQUAD_CAP': CLASS_SQUAD_CAP, 'GAME_SCALE_4192': GAME_SCALE_4192}}
    for sysname, rows in (('40k', rows40), ('aos', rowsaos), ('4192', rows4192)):
        coefs = fit_system(rows)
        calib[sysname] = {'coefs': {k: round(v, 4) for k, v in coefs.items()}, 'accuracy': accuracy(rows, coefs)}
        for r in rows:
            r['pred'] = price(r['feat'], coefs)
    with open(CALIBRATION_PATH, 'w', encoding='utf-8') as f:
        json.dump(calib, f, indent=2)

    # Ability residual study (40k): which abilities explain the gap between base price and real price?
    tag_rows = []
    for r in rows40:
        r['tags'] = ability_tags(r['u'])
        tag_rows.append(r)
    tags = sorted(ABILITY_TAGS)
    X = [[1.0] + [1.0 if t in r['tags'] else 0.0 for t in tags] for r in tag_rows]
    y = [math.log(r['target'] / r['pred']) for r in tag_rows]
    beta = wls(X, y, [1.0] * len(y), ridge=1.0)
    counts = Counter(t for r in tag_rows for t in r['tags'])
    calib['ability_residuals_40k'] = {t: {'n': counts[t], 'pct_effect': round(100 * (math.exp(beta[i + 1]) - 1), 1)}
                                      for i, t in enumerate(tags)}
    with open(CALIBRATION_PATH, 'w', encoding='utf-8') as f:
        json.dump(calib, f, indent=2)

    # Outputs
    def dump(rows, path, with_card=False):
        out = []
        for r in rows:
            u, ft = r['u'], r['feat']
            item = {'faction': u['faction'], 'name': u['name'], 'models': u['def']['models'], 'official_pts': r['target'],
                    'base_pts': r['pred'], 'diff': r['pred'] - r['target'], 'ehp': round(ft['ehp'], 1),
                    'ranged_dpa': round(ft['ranged_dpa'], 2), 'melee_dpa': round(ft['melee_dpa'], 2),
                    'cp': round(ft['cp'], 2), 'oc_total': ft['oc_total'], 'loadout_fallback': u.get('loadout_fallback')}
            if 'tags' in r:
                item['ability_tags'] = sorted(r['tags'])
            if with_card:
                c = dict(r['card'])
                c['weapons'] = [{k: v for k, v in w.items() if k not in ('kw', 'group')} for w in c['weapons']]
                item['card_4192'] = c
                item['pts_4192'] = int(round(r['pred'] * GAME_SCALE_4192 / 5.0)) * 5
            out.append(item)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(out, f, indent=1, ensure_ascii=False)
    dump(rows40, os.path.join(OUT_DIR, 'units_40k.json'))
    dump(rowsaos, os.path.join(OUT_DIR, 'units_aos.json'))
    dump(rows4192, os.path.join(OUT_DIR, 'units_4192.json'), with_card=True)
    write_report(calib, rows40, rowsaos, rows4192)
    for s in ('40k', 'aos', '4192'):
        a = calib[s]['accuracy']
        print(f"[{s:>4}] n={a['n']:4d}  R²={a['r2']:.3f}  MAE=±{a['mae']} pts  MAPE={a['mape_pct']}%  "
              f"within±20%={a['within_20pct']}%  coefs={calib[s]['coefs']}")
    print(f'[✓] wrote {OUT_DIR}/ (calibration.json, units_*.json, BASE_CALCULATOR_REPORT.md)')


def write_report(calib, rows40, rowsaos, rows4192):
    L = ['# Base Unit Calculator — Fit Report', '',
         '*Generated by `gametheory/scripts/unit_calculator.py fit`. Base stats only (no datasheet abilities).*', '',
         '## Accuracy vs official points', '',
         '| System | Units | R² | MAE | Mean % error | Within ±20% | CP | EHP | DPA | OC | Intercept |',
         '| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |']
    for s in ('40k', 'aos', '4192'):
        a, c = calib[s]['accuracy'], calib[s]['coefs']
        L.append(f"| {s} | {a['n']} | {a['r2']} | ±{a['mae']} | {a['mape_pct']}% | {a['within_20pct']}% | "
                 f"{c['cp']} | {c['ehp']} | {c['dpa']} | {c['oc_total']} | {c['intercept']} |")
    L += ['', '## Faction accuracy (40k)', '', '| Faction | Units | Mean % error | Avg official − base |', '| :-- | --: | --: | --: |']
    by = defaultdict(list)
    for r in rows40:
        by[r['u']['faction']].append(r)
    for fac, rs in sorted(by.items()):
        mape = 100 * sum(abs(r['pred'] - r['target']) / r['target'] for r in rs) / len(rs)
        gap = sum(r['target'] - r['pred'] for r in rs) / len(rs)
        L.append(f'| {fac} | {len(rs)} | {mape:.1f}% | {gap:+.0f} |')
    L += ['', '## Ability residuals (40k) — % price effect not explained by base stats', '',
          '*Joint regression of log(official / base) on detected ability tags. Positive = GW charges extra for it.*', '',
          '| Tag | Units | Effect |', '| :-- | --: | --: |']
    for t, v in sorted(calib['ability_residuals_40k'].items(), key=lambda kv: -kv[1]['pct_effect']):
        L.append(f"| {t} | {v['n']} | {v['pct_effect']:+.1f}% |")
    L += ['', '## Biggest misses (40k) — check these by hand', '', '| Unit | Faction | Official | Base | Diff |', '| :-- | :-- | --: | --: | --: |']
    for r in sorted(rows40, key=lambda r: -abs(r['pred'] - r['target']) / r['target'])[:25]:
        L.append(f"| {r['u']['name']} | {r['u']['faction']} | {r['target']} | {r['pred']} | {r['pred'] - r['target']:+d} |")
    with open(os.path.join(OUT_DIR, 'BASE_CALCULATOR_REPORT.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def show_card(card, feat, pts):
    w = card['weapons']
    print(f"\n  4192 CARD: {card['name']}  (Class {card['class']}, {card['models']} model(s))  ->  {pts} pts")
    print(f"    MOV {card['MOV']}\"  MS {card['MS']}+  RS {card['RS']}+  ARM {card['ARM']}+  MIGHT {card['MIGHT']}  CTRL {card['CTRL']}"
          + (f"  WARD {card['WARD']}+" if card.get('WARD') else '') + (f"  UNYIELDING {card['UNYIELDING']}+" if card.get('UNYIELDING') else ''))
    print(f"    keywords: {', '.join(card.get('keywords', [])) or '-'}")
    for x in w:
        print(f"    - {x['name']:<38} {x['type']:<6} A{x['A']:<5} W{target_num(x['wound'], 4)}+  PEN-{abs(int(x.get('pen', 0)))}  D{x['D']:<5} {' '.join(x.get('traits', []))}")
    print(f"    EHP {feat['ehp']:.1f}  ranged DPA {feat['ranged_dpa']:.2f}  melee DPA {feat['melee_dpa']:.2f}  CP {feat['cp']:.2f}")


def cmd_unit(args):
    calib = load_calibration()
    hits = [u for u in load_40k() + load_aos() if args.name.lower() in u['name'].lower()
            and (not args.faction or args.faction.lower() in u['faction'].lower())]
    if not hits:
        sys.exit('no unit matched')
    for u in hits[:args.limit]:
        ft = features(u['system'], u)
        pts = price(ft, calib[u['system']]['coefs'])
        d = u['def']
        print('=' * 90)
        print(f"{u['name']}  [{u['system']} / {u['faction']}]  {d['models']} model(s)  official {u['points']} pts  ->  base {pts} pts")
        print(f"  defence: {', '.join(f'{k}={v}' for k, v in d.items() if v is not None)}   move {u['move']}\"  OC/model {u['oc']}")
        print(f"  EHP {ft['ehp']:.1f} (hits to wipe)  " + '  '.join(f'{k}:{v:.1f}' for k, v in ft['ehp_detail'].items()))
        for t, v in ft['dpa_detail'].items():
            print(f"  vs {t:<5}: ranged {v['ranged']:.2f}  melee {v['melee']:.2f} wounds/activation")
        print(f"  mobility x{ft['mobility']:.2f}   CP {ft['cp']:.2f}   loadout{' (FALLBACK: all profiles)' if u.get('loadout_fallback') else ''}:")
        for s in u['loadout']:
            print(f"    {s['count']:>5.1f} x {s['subject'][:40]:<40} -> {', '.join(sorted(set(w['name'] for w in s['weapons'])))}")
        tags = ability_tags(u)
        if tags:
            print(f"  ability layer (not priced): {', '.join(sorted(tags))}")
        if u['system'] == '40k':
            card = translate_40k_to_4192(u)
            f4 = features('4192', card_to_unit(card))
            show_card(card, f4, price_4192(card, calib)[0])


def show_breakdown(card, r):
    show_card(card, r['feat'], r['points'])
    sc = r['scale']
    print(f"    PRICE  base {r['base_raw'] * sc:.0f}", end='')
    for n, v in r['combat_lines']:
        print(f" | {n} {v * sc:+.0f}", end='')
    for n, v in r['utility']:
        print(f" | {n} {v * sc:+.0f}", end='')
    for n, v in r['buffs']:
        print(f" | buff: {n} {v * sc:+.0f}", end='')
    if r.get('adjust'):
        print(f" | designer adjust {r['adjust']:+d}", end='')
    print(f"  =>  {r['points']} pts")


def cmd_custom(args):
    calib = load_calibration()
    cards = json.load(open(args.file, encoding='utf-8'))
    for card in (cards if isinstance(cards, list) else [cards]):
        show_breakdown(card, price_card(card, calib))

# ---------------------------------------------------------------------------
# Catalogue, faction files and army lists
# ---------------------------------------------------------------------------
CAT_DIR = os.path.join(ROOT, 'gametheory', 'catalogue')
GAME_SIZES = {   # GAME_SYSTEM_PLAN.md §2
    'skirmish': {'points': 500, 'units': (3, 8), 'leaders': (1, 2), 'max_big': 1, 'max_c5': 0, 'max_same': 2, 'battleline_same': 2, 'min_battleline': 1, 'cp': 2},
    'standard': {'points': 1000, 'units': (5, 15), 'leaders': (1, 3), 'max_big': 3, 'max_c5': 1, 'max_same': 2, 'battleline_same': 3, 'min_battleline': 2, 'cp': 3},
    'grand':    {'points': 1500, 'units': (7, 20), 'leaders': (1, 4), 'max_big': 5, 'max_c5': 2, 'max_same': 3, 'battleline_same': 5, 'min_battleline': 3, 'cp': 4},
}


def load_library():
    return json.load(open(os.path.join(CAT_DIR, 'weapon_library.json'), encoding='utf-8'))


def build_card(entry, library, models=None):
    """Datasheet entry (weapons may be library ids) -> priced-ready card at a given model count."""
    card = {k: v for k, v in entry.items() if k not in ('weapons', 'options', 'models')}
    mm = entry['models'] if isinstance(entry['models'], list) else [entry['models'], entry['models']]
    card['models'] = models or mm[0]
    card.setdefault('name', entry.get('archetype') or entry.get('id'))
    card.setdefault('keywords', [])
    ws, seen = [], Counter()
    for w in entry['weapons']:
        w = dict(library[w], id=w) if isinstance(w, str) else dict(w)
        seen[w['name']] += 1
        if seen[w['name']] > 1:            # a second copy of the same weapon fires too
            w['group'] = f"{norm_name(w['name'])}#{seen[w['name']]}"
        ws.append(w)
    card['weapons'] = ws
    return card, mm


def with_faction_rules(entry, fac):
    """Army-wide rules (faction_abilities) are inherent to every unit: append them before pricing."""
    extra = [a for a in (fac or {}).get('faction_abilities', [])
             if entry['class'] in a.get('classes', [1, 2, 3, 4, 5]) and entry['name'] not in a.get('exclude', [])]
    return dict(entry, abilities=list(entry.get('abilities', [])) + extra, _faction=(fac or {}).get('name', ''))


def price_entry(entry, library, calib, fac=None):
    entry = with_faction_rules(entry, fac)
    card, (lo, hi) = build_card(entry, library)
    r_lo = price_card(card, calib)
    per_model = None
    if hi > lo:
        card_hi, _ = build_card(entry, library, hi)
        r_hi = price_card(card_hi, calib)
        per_model = (r_hi['raw'] - r_lo['raw']) * GAME_SCALE_4192 / (hi - lo)
    return card, r_lo, (lo, hi), per_model


def stat_line(c):
    extra = (f" · WARD {c['WARD']}+" if c.get('WARD') else '') + (f" · UNY {c['UNYIELDING']}+" if c.get('UNYIELDING') else '')
    return f"{c['MOV']}\" · {c['MS']}+ · {c['RS']}+ · {c['ARM']}+ · {c['MIGHT']} · {c['CTRL']}{extra}"


def weapon_line(w):
    return (f"{w['name']} ({w['type'][0]}{' ' + str(w.get('range', '')) if w['type'] == 'Ranged' else ''}) "
            f"A{w['A']} W{target_num(w['wound'], 4)}+ PEN-{abs(int(w.get('pen', 0)))} D{w['D']} {' '.join(w.get('traits', []))}").strip()


def cmd_catalogue(args):
    calib, lib = load_calibration(), load_library()
    arche = json.load(open(os.path.join(CAT_DIR, 'unit_archetypes.json'), encoding='utf-8'))
    L = ['# Universal Unit Catalogue — every unit type the 5 Classes allow', '',
         f'*Generated by `unit_calculator.py catalogue` · points at ×{GAME_SCALE_4192} scale (1,000-pt standard game) · '
         'stat line = MOV · MS · RS · ARM · MIGHT · CTRL.*', '',
         'These are **chassis**: Faction 21 (Rift-Stalker) plays them as-is, and every other faction starts from one, '
         'then applies its Stat DNA and abilities (FACTION_DESIGN_GUIDE.md §1.2–1.3).', '']
    out = []
    for cls in range(1, 6):
        L += [f'## Class {cls}', '', '| Archetype | Role | Models | Stat line | Default weapons | Pts (min size) | +/model | Proxies |',
              '| :-- | :-- | :-: | :-- | :-- | --: | --: | :-- |']
        for e in [a for a in arche if a['class'] == cls]:
            card, r, (lo, hi), pm = price_entry(e, lib, calib)
            out.append({'id': e['id'], 'points_min': r['points'], 'per_model': pm, 'models': [lo, hi]})
            ws = '<br>'.join(weapon_line(w) for w in card['weapons'])
            kw = (' ' + ' '.join(card['keywords'])) if card['keywords'] else ''
            L.append(f"| **{e['archetype']}**{kw} | {e['role']} | {lo}–{hi} | {stat_line(card)} | {ws} | **{r['points']}** | "
                     f"{'+' + str(int(round(pm))) if pm else '—'} | {e.get('proxies', '')} |")
        L.append('')
    L += ['## Weapon library', '', '| Id | Weapon | Type | Range | A | Wound | PEN | D | Traits |', '| :-- | :-- | :-- | :-- | :-: | :-: | :-: | :-: | :-- |']
    for k, w in lib.items():
        L.append(f"| `{k}` | {w['name']} | {w['type']} | {w.get('range', '')} | {w['A']} | {w['wound']} | {w['pen']} | {w['D']} | {' '.join(w.get('traits', []))} |")
    path = os.path.join(ROOT, 'gametheory', 'UNIT_CATALOGUE.md')
    open(path, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    json.dump(out, open(os.path.join(CAT_DIR, 'catalogue_prices.json'), 'w'), indent=1)
    print(f'[✓] {len(out)} archetypes priced -> {path}')


def cmd_faction(args):
    calib, lib = load_calibration(), load_library()
    fac = json.load(open(args.file, encoding='utf-8'))
    L = [f"# {fac['name']} — Draft Datasheets", '', f"*Owned verb: **{fac.get('verb', '-')}** · generated by `unit_calculator.py faction` · "
         f"×{GAME_SCALE_4192} scale · stat line = MOV · MS · RS · ARM · MIGHT · CTRL*", '',
         f"**Core trait — {fac['core_rule']['name']}:** {fac['core_rule']['text']}", '']
    if fac.get('gamble'):
        g = fac['gamble']
        L += [f"**Gamble — {g['name']}** *(risk: {g.get('risk_cost', 'see text')})*: {g['text']}", '']
    if fac.get('faction_abilities'):
        L += ['**Army-wide rules (priced into every unit):** ' + ' · '.join(f"*{a['name']}* — {a.get('text', '')}" for a in fac['faction_abilities']), '']
    cards = {}
    for e in fac['units']:
        card, r, (lo, hi), pm = price_entry(e, lib, calib, fac)
        cards[e['name']] = card
        print('=' * 90)
        show_breakdown(card, r)
        L += [f"### {e['name']} — {r['points']} pts" + (f" ({lo} models, +{int(round(pm))}/model up to {hi})" if pm else ''),
              f"*Class {card['class']} · {e['role']} · Ladder: {e.get('ladder', '-')}*" + (f" · {' '.join(card['keywords'])}" if card['keywords'] else ''), '',
              f"`{stat_line(card)}`", '']
        for w in card['weapons']:
            L.append(f"- {weapon_line(w)}")
        for a in e.get('abilities', []):
            L.append(f"- **{a['name']}:** {a.get('text', '')}")
        price_bits = [f"base {r['base_raw'] * r['scale']:.0f}"] + [f"{n} {v * r['scale']:+.0f}" for n, v in r['combat_lines'] + r['utility'] + r['buffs']]
        L += ['', f"<sub>Price: {' · '.join(price_bits)}</sub>", '']
    for d in fac.get('detachments', []):
        L += [f"## Detachment — {d['name']}", '', f"*{d.get('playstyle', '')}*", '', f"**Detachment rule:** {d['rule']}", '', '**Enhancements**']
        for en in d.get('enhancements', []):
            pts = price_enhancement(cards[en['bearer']], en['ability'], calib) if en['bearer'] in cards else '?'
            L.append(f"- **{en['name']}** (+{pts} pts, {en['bearer']}): {en['text']}")
        L += ['', '**Stratagems**']
        for st in d.get('stratagems', []):
            L.append(f"- **{st['name']}** ({st['cp']} CP) — *{st['when']}:* {st['effect']}")
        L.append('')
    md = os.path.splitext(args.file)[0] + '.md'
    open(md, 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    print(f'[✓] {md}')


def cmd_list(args):
    calib, lib = load_calibration(), load_library()
    army = json.load(open(args.file, encoding='utf-8'))
    size = GAME_SIZES[army.get('size', 'standard')]
    pools = {}
    for src in army.get('sources', []):
        data = json.load(open(os.path.join(os.path.dirname(args.file), src), encoding='utf-8'))
        for e in (data['units'] if isinstance(data, dict) else data):
            if isinstance(data, dict):
                e = with_faction_rules(e, data)
            pools[e.get('name', e.get('archetype', e.get('id')))] = e
            if e.get('id'):
                pools[e['id']] = e
    total, models, activations, leaders, big, c5 = 0, 0, 0, 0, 0, 0
    counts = Counter()
    feats = defaultdict(float)
    rows = []
    for item in army['units']:
        e = pools[item['unit']]
        card, _ = build_card(e, lib, item.get('models'))
        r = price_card(card, calib)
        total += r['points']
        models += card['models']
        counts[item['unit']] += 1
        is_leader = 'Leader' in e.get('role', '')
        leaders += is_leader
        if not item.get('attached'):
            activations += 1
        big += card['class'] >= 4
        c5 += card['class'] == 5
        for k in ('ehp', 'dpa', 'oc_total'):
            feats[k] += r['feat'][k]
        rows.append((item['unit'], card['models'], card['class'], r['points'], ' (attached)' if item.get('attached') else ''))
    print(f"{army.get('name', 'Army')}  [{army.get('size', 'standard')} · {size['points']} pts]")
    for n, m, c, p, a in rows:
        print(f"  {p:>4} pts  C{c}  {m:>2} models  {n}{a}")
    issues = []
    if total > size['points']:
        issues.append(f"over points: {total}/{size['points']}")
    lo, hi = size['units']
    nunits = len(army['units'])
    if not lo <= nunits <= hi:
        issues.append(f"units {nunits} outside {lo}–{hi}")
    if not size['leaders'][0] <= leaders <= size['leaders'][1]:
        issues.append(f"leaders {leaders} outside {size['leaders']}")
    if big > size['max_big']:
        issues.append(f"Class 4–5 units {big} > {size['max_big']}")
    if c5 > size['max_c5']:
        issues.append(f"Class 5 units {c5} > {size['max_c5']}")
    for n, c in counts.items():
        cap = size['battleline_same'] if pools[n].get('battleline') else size['max_same']
        if c > cap:
            issues.append(f"{n} ×{c} > {cap}")
    nbl = sum(c for n, c in counts.items() if pools[n].get('battleline'))
    if any('battleline' in e for e in pools.values()) and nbl < size['min_battleline']:
        issues.append(f"Battleline units {nbl} < {size['min_battleline']}")
    print(f"  TOTAL {total} pts · {nunits} units · {activations} activations · {models} models · "
          f"EHP {feats['ehp']:.0f} · DPA {feats['dpa']:.1f} · CTRL {feats['oc_total']:.0f}")
    print('  ' + ('✅ legal' if not issues else '❌ ' + '; '.join(issues)))


# ---------------------------------------------------------------------------
# Faction registry (FACTION_REGISTRY.md): prose is hand-written; unit + detachment blocks are generated
# ---------------------------------------------------------------------------
RELEASE_FILES = {'01': '01_auric_solar_host.json', '02': '02_golgotha_trench_legions.json',
                 '11': '11_cinder_gorged_legion.json', '16': '16_starfire_high_court.json', '23': '23_apex_bio_swarm.json'}


def faction_file(key):
    """factions/NN_*.json for any faction number (release files and builder output alike)."""
    hits = sorted(glob.glob(os.path.join(ROOT, 'gametheory', 'factions', f'{key}_*.json')))
    return hits[0] if hits else None


def apply_dna(arch, dna, over):
    """Archetype + faction Stat DNA + unit overrides -> datasheet entry."""
    e = json.loads(json.dumps(arch))
    e['MOV'] = max(3, e['MOV'] + dna.get('MOV', 0))
    for k in ('MS', 'RS'):
        e[k] = min(6, max(2, e[k] + dna.get(k, 0)))
    e['ARM'] = min(7, max(3, e['ARM'] + dna.get('ARM', 0)))
    if e['MIGHT'] <= 2:
        e['MIGHT'] = max(1, e['MIGHT'] + dna.get('MIGHT_inf', 0))
    else:
        e['MIGHT'] = max(1, int(round(e['MIGHT'] * dna.get('MIGHT_big', 1.0))))
    e['CTRL'] = max(0, e['CTRL'] + dna.get('CTRL', 0))
    for k, v in over.items():
        if k == 'keywords':
            e['keywords'] = sorted(set(e.get('keywords', [])) | set(v))
        elif v is None:
            e.pop(k, None)
        else:
            e[k] = v
    return e


def unit_rows_release(fac, lib, calib):
    rows = []
    for e in fac['units']:
        card, r, (lo, hi), pm = price_entry(e, lib, calib, fac)
        ab = '; '.join(a['name'] for a in e.get('abilities', []) if a.get('name'))
        rows.append((e['name'], f"C{card['class']} {e['role']}", f"{lo}–{hi}" if hi > lo else str(lo), stat_line(card),
                     ', '.join(w['name'] for w in card['weapons']), ab, f"**{r['points']}**" + (f" (+{int(round(pm))}/m)" if pm else '')))
    return rows


def unit_rows_spec(spec, arche, lib, calib):
    rows = []
    for name, aid, models, over, note in spec['units']:
        e = apply_dna(arche[aid], spec['dna'], over)
        e['name'] = name
        if models:
            e['models'] = models
        card, r, (lo, hi), pm = price_entry(e, lib, calib)
        rows.append((name, f"C{card['class']} {arche[aid]['role']}", f"{lo}–{hi}" if hi > lo else str(lo), stat_line(card),
                     ', '.join(w['name'] for w in card['weapons']), note, f"{r['points']}" + (f" (+{int(round(pm))}/m)" if pm else '')))
    return rows


def table(rows):
    L = ['| Unit | Class / role | Models | MOV · MS · RS · ARM · MIGHT · CTRL | Weapons | Key abilities | Pts |',
         '| :-- | :-- | :-: | :-- | :-- | :-- | --: |']
    L += ['| ' + ' | '.join(str(c) for c in r) + ' |' for r in rows]
    return L


def detach_block_release(fac, lib, calib):
    cards = {}
    for e in fac['units']:
        card, _, _, _ = price_entry(e, lib, calib, fac)
        cards[e['name']] = card
    L = []
    for i, d in enumerate(fac.get('detachments', []), 1):
        L += [f"**D{i}. {d['name']}** — *{d.get('playstyle', '')}*", f"- *Rule:* {d['rule']}"]
        for en in d.get('enhancements', []):
            pts = price_enhancement(cards[en['bearer']], en['ability'], calib) if en['bearer'] in cards else '?'
            L.append(f"- *Enhancement:* **{en['name']}** (+{pts} pts, {en['bearer']}) — {en['text']}")
        for st in d.get('stratagems', []):
            L.append(f"- *Stratagem:* **{st['name']}** ({st['cp']} CP) — {st['when']}: {st['effect']}")
        L.append('')
    return L


def rules_block(fac):
    L = [f"**Core rule — {fac['core_rule']['name']}:** {fac['core_rule']['text']}", '']
    g = fac.get('gamble')
    if g:
        L += [f"**Gamble — {g['name']}** *(risk: {g.get('risk_cost', 'see text')})*: {g['text']}", '']
    return L


def detach_block_spec(spec):
    L = []
    for i, d in enumerate(spec.get('detachments', []), 1):
        L += [f"**D{i}. {d['n']}** — *{d['p']}*", f"- *Rule:* {d['r']}"]
        for n, b, t in d['e']:
            L.append(f"- *Enhancement:* **{n}** ({b}) — {t}")
        for n, cp, t in d['s']:
            L.append(f"- *Stratagem:* **{n}** ({cp} CP) — {t}")
        L.append('')
    return L


def cmd_registry(args):
    calib, lib = load_calibration(), load_library()
    arche = {a['id']: a for a in json.load(open(os.path.join(CAT_DIR, 'unit_archetypes.json'), encoding='utf-8'))}
    specs = json.load(open(os.path.join(ROOT, 'gametheory', 'factions', 'registry_units.json'), encoding='utf-8'))
    path = os.path.join(ROOT, 'gametheory', 'FACTION_REGISTRY.md')
    text = open(path, encoding='utf-8').read()
    for key in [f'{i:02d}' for i in range(1, 26)]:
        ff = faction_file(key)
        if ff:
            fac = json.load(open(ff, encoding='utf-8'))
            units = table(unit_rows_release(fac, lib, calib))
            det = rules_block(fac) + detach_block_release(fac, lib, calib)
        elif key == '21':
            rows = []
            for a in arche.values():
                card, r, (lo, hi), pm = price_entry(dict(a, name=a['archetype']), lib, calib)
                rows.append((a['archetype'], f"C{a['class']} {a['role']}", f"{lo}–{hi}" if hi > lo else str(lo), stat_line(card),
                             ', '.join(w['name'] for w in card['weapons']), a.get('proxies', ''), f"{r['points']}" + (f" (+{int(round(pm))}/m)" if pm else '')))
            units, det = table(rows), None
        elif key in specs:
            units, det = table(unit_rows_spec(specs[key], arche, lib, calib)), detach_block_spec(specs[key])
        else:
            continue
        for tag, block in (('UNITS', units), ('DETACH', det)):
            if block is None:
                continue
            a, b = f'<!--{tag}:{key}-->', f'<!--/{tag}:{key}-->'
            if a in text and b in text:
                i, j = text.index(a) + len(a), text.index(b)
                text = text[:i] + '\n' + '\n'.join(block) + '\n' + text[j:]
    open(path, 'w', encoding='utf-8').write(text)
    print(f'[✓] {path} regenerated')


def banned_terms(rules=None):
    """Protected names from other games: the private list (catalogue/ip_blocklist.private.json) when present, else design_rules."""
    priv = os.path.join(CAT_DIR, 'ip_blocklist.private.json')
    if os.path.exists(priv):
        return json.load(open(priv, encoding='utf-8'))['banned_terms']
    rules = rules or json.load(open(os.path.join(CAT_DIR, 'design_rules.json'), encoding='utf-8'))
    return rules.get('banned_terms', [])


def cmd_validate(args):
    """Quality gate for hand-made or LLM-generated factions: envelopes, keywords, IP-safe names,
    4192 vocabulary, army-wide caps, and whether every ability is something the calculator can price."""
    rules = json.load(open(os.path.join(CAT_DIR, 'design_rules.json'), encoding='utf-8'))
    lib = load_library()
    fac = json.load(open(args.file, encoding='utf-8'))
    env, wl = rules['envelopes'], rules['weapon_limits']
    banned = [re.compile(r'\b' + re.escape(t) + r's?\b', re.I) for t in banned_terms(rules)]
    flagw = [w.lower() for w in rules['rules_vocabulary']['flag_words']]
    ukw = set(k.upper() for k in rules['keywords_unit'])
    wpre = [k.upper() for k in rules['keywords_weapon_prefixes']]
    errors = warns = 0
    unpriced = []

    def text_checks(where, txt):
        nonlocal errors, warns
        out = []
        for rx in banned:
            m = rx.search(txt or '')
            if m:
                out.append(f'IP: "{m.group(0)}" ({where})')
                errors += 1
        low = (txt or '').lower()
        for w in flagw:
            if w in low:
                out.append(f'vocab: "{w}" ({where}) — 4192 uses activation/round')
                warns += 1
        return out

    issues_all = []
    head = text_checks('faction', fac.get('name', '') + ' ' + json.dumps(fac.get('core_rule', {}), ensure_ascii=False))
    for a in fac.get('faction_abilities', []):
        if a.get('mods', {}).get('ward', 9) < rules['army_wide_limits']['ward_best'] or a.get('mods', {}).get('unyielding', 9) < rules['army_wide_limits']['unyielding_best']:
            head.append(f"army-wide cap: {a['name']} grants WARD/UNYIELDING better than 5+")
            errors += 1
    for u in fac['units']:
        iss = []
        c = str(u['class'])
        e = env[c]
        leader = 'leader' in u.get('role', '').lower()
        mm = u['models'] if isinstance(u['models'], list) else [u['models'], u['models']]
        for stat in ('MOV', 'MS', 'RS', 'ARM', 'CTRL'):
            lo, hi = e[stat]
            if not lo <= u[stat] <= hi:
                iss.append(f'{stat} {u[stat]} outside C{c} envelope {lo}–{hi}')
        lo, hi = e['MIGHT_leader' if leader else 'MIGHT']
        if not lo <= u['MIGHT'] <= hi:
            iss.append(f"MIGHT {u['MIGHT']} outside C{c}{' leader' if leader else ''} envelope {lo}–{hi}")
        if not e['models'][0] <= mm[0] <= mm[1] <= e['models'][1]:
            iss.append(f'models {mm} outside C{c} envelope {e["models"]}')
        if e.get('HARDENED') and not u.get('HARDENED', True):
            iss.append('Class 4–5 must be [HARDENED]')
        if u.get('WARD') and u['WARD'] < e['WARD_best_leader' if leader else 'WARD_best']:
            iss.append(f"WARD {u['WARD']}+ better than allowed for C{c}{' leader' if leader else ''}")
        for k in u.get('keywords', []):
            K = k.upper().replace('″', '"')
            if K not in ukw and not any(K.startswith(x[:-1]) for x in ukw if x.endswith(']')):
                iss.append(f'unknown unit keyword {k}')
        card, _ = build_card(u, lib)
        for w in card['weapons']:
            for t in w.get('traits', []):
                if not any(t.upper().startswith(p) for p in wpre):
                    iss.append(f"unknown weapon trait {t} on {w['name']}")
            if abs(int(w.get('pen', 0))) > wl['max_pen']:
                iss.append(f"{w['name']} PEN beyond -{wl['max_pen']}")
            if d_mean(dice_dist(w['D'])) > wl['max_avg_damage']:
                iss.append(f"{w['name']} average damage {d_mean(dice_dist(w['D'])):.1f} > {wl['max_avg_damage']}")
            if d_mean(dice_dist(w['A'])) > wl['max_avg_attacks_per_model'][c]:
                iss.append(f"{w['name']} attacks above C{c} limit")
            iss += text_checks(w['name'], w['name'])
        errors += len([i for i in iss if not i.startswith(('IP', 'vocab'))])
        iss += text_checks(u['name'], u['name'])
        for a in u.get('abilities', []):
            iss += text_checks(a.get('name', 'ability'), a.get('name', '') + ' ' + a.get('text', ''))
            if not any(a.get(k) for k in ('mods', 'utility', 'flat', 'buff')):
                unpriced.append(f"{u['name']}: {a.get('name')}")
        if iss:
            issues_all.append((u['name'], iss))
    print(f"VALIDATE {fac.get('name')}  ({len(fac['units'])} datasheets)")
    for i in head:
        print('  [faction]', i)
    for n, iss in issues_all:
        for i in iss:
            print(f'  {n[:34]:<34} {i}')
    print(f'  abilities with NO pricing hook (text-only, priced at 0): {len(unpriced)}')
    for x in unpriced:
        print('    -', x)
    print(f"  => {errors} errors, {warns} warnings  {'✅' if not errors else '❌'}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('fit')
    p = sub.add_parser('unit')
    p.add_argument('name')
    p.add_argument('--faction')
    p.add_argument('--limit', type=int, default=3)
    for name in ('custom', 'faction', 'list', 'validate'):
        sub.add_parser(name).add_argument('file')
    sub.add_parser('catalogue')
    sub.add_parser('registry')
    args = ap.parse_args()
    {'fit': cmd_fit, 'unit': cmd_unit, 'custom': cmd_custom, 'catalogue': cmd_catalogue,
     'faction': cmd_faction, 'list': cmd_list, 'registry': cmd_registry,
     'validate': cmd_validate}[args.cmd](args)


if __name__ == '__main__':
    main()
