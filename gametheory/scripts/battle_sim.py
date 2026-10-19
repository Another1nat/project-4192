#!/usr/bin/env python3
"""
battle_sim.py — Monte-Carlo battle simulator for 4192 AD (tests whether POINTS predict RESULTS).

Builds random legal armies from faction files, plays full games with real dice and 4192 rules
(2 actions, charge + free strike-first fight, retaliation, flat wound, [HARDENED]/[FRAIL], 3+ cap,
WARD, UNYIELDING, SHREDDING/IMPALING/ONSLAUGHT/HAILFIRE/ERADICATE/SHRAPNEL, Suppression, Broken,
alternating activations with the catch-up Pass, objectives) on a simplified 1-D battlefield.

    python3 battle_sim.py matrix  --games 200          # faction-vs-faction win rates, random 1,000-pt lists
    python3 battle_sim.py units   --games 600          # per-datasheet efficiency (value returned per point)

Simplifications (documented so results are read correctly): one axis of movement (distance to the enemy
line), objectives = midfield control + home objective, no terrain/LoS, faction verbs approximated by their
priced modifiers (plus Thrall-Chain, Glide, Surge, Burning Vessels, Synapse, Orders modelled directly).
"""
import argparse
import glob
import json
import os
import random
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import unit_calculator as U  # noqa: E402

ROOT = U.ROOT
FACTION_FILES = ['01_auric_solar_host.json', '02_golgotha_trench_legions.json', '11_cinder_gorged_legion.json',
                 '23_apex_bio_swarm.json', '16_starfire_high_court.json']
VP_PTS = 1000 / 16.0   # a game hands out ~16 VP; 1 VP ≈ 62 pts of value
DEPLOY_GAP = 24.0      # inches between the two deployment lines at the start
MID = DEPLOY_GAP / 2


def d6():
    return random.randint(1, 6)


def roll_dice(expr):
    s = str(expr).upper().replace(' ', '')
    m = U.DICE_RE.match(s)
    if m:
        n, sides, add = int(m.group(1) or 1), int(m.group(2)), int(m.group(3) or 0)
        return sum(random.randint(1, sides) for _ in range(n)) + add
    return U.target_num(s, 1)

# ---------------------------------------------------------------------------
# Army construction
# ---------------------------------------------------------------------------


GLIDE_ESCAPES = 1     # Starfire v4.3: escape-glides (leaving engagement) per army per round


def load_faction(fname, calib, lib):
    fac = json.load(open(os.path.join(ROOT, 'gametheory', 'factions', fname), encoding='utf-8'))
    entries = []
    for e in fac['units']:
        e2 = U.with_faction_rules(e, fac)
        lo, hi = e['models'] if isinstance(e['models'], list) else (e['models'], e['models'])
        sizes = sorted({lo, hi, (lo + hi) // 2})
        options = []
        for n in sizes:
            card, _ = U.build_card(e2, lib, n)
            options.append((n, card, U.price_card(card, calib)['points']))
        entries.append({'name': e['name'], 'role': e.get('role', ''), 'class': e['class'], 'options': options,
                        'battleline': bool(e.get('battleline'))})
    return fac, entries


def random_army(entries, size='standard', target=1000):
    lim = U.GAME_SIZES[size]
    for _ in range(200):
        army, pts, counts = [], 0, defaultdict(int)
        leaders = [e for e in entries if 'Leader' in e['role']]
        first = random.choice(leaders)
        n, card, p = random.choice(first['options'])
        army.append((first, card, p))
        pts += p
        counts[first['name']] += 1
        bl = [e for e in entries if e.get('battleline')]
        for _b in range(lim['min_battleline'] if bl else 0):     # muster: minimum Battleline, like a legal list
            e = random.choice(bl)
            n, card, p = random.choice(e['options'])
            army.append((e, card, p))
            pts += p
            counts[e['name']] += 1
        tries = 0
        while pts < target - 60 and tries < 60:
            tries += 1
            e = random.choice(entries)
            n, card, p = random.choice(e['options'])
            cap = lim['battleline_same'] if e.get('battleline') else lim['max_same']
            if pts + p > target or counts[e['name']] >= cap:
                continue
            nl = sum(1 for a in army if 'Leader' in a[0]['role']) + ('Leader' in e['role'])
            big = sum(1 for a in army if a[1]['class'] >= 4) + (card['class'] >= 4)
            c5 = sum(1 for a in army if a[1]['class'] == 5) + (card['class'] == 5)
            if nl > lim['leaders'][1] or big > lim['max_big'] or c5 > lim['max_c5'] or len(army) >= lim['units'][1]:
                continue
            army.append((e, card, p))
            pts += p
            counts[e['name']] += 1
        if len(army) >= lim['units'][0] and pts >= target - 100:
            return army, pts
    return army, pts

# ---------------------------------------------------------------------------
# Sim units
# ---------------------------------------------------------------------------


class SimUnit:
    def __init__(self, name, card, pts, side, faction):
        self.name, self.card, self.pts, self.side, self.faction = name, card, pts, side, faction
        self.cls = card['class']
        self.kws = set(k.upper() for k in card.get('keywords', []))
        ab = card.get('abilities', [])
        self.util = set(a.get('utility', '').upper() for a in ab if a.get('utility'))
        self.util |= {t for t in U.utility_tags(card) if isinstance(t, str)}
        self.ability_mods = [a for a in ab if a.get('mods') and not a.get('buff')]
        self.buffs = []
        self.models = []          # dicts: might, max, arm, ward, uny, weapons, is_leader
        self.add_models(card, leader=False)
        self.start_models = len(self.models)
        self.start_might = sum(m['might'] for m in self.models)
        self.move = card['MOV']
        self.fly = '[FLY]' in self.kws
        self.x = 0.0              # inches advanced from own deployment line
        self.engaged = None
        self.tokens = 0
        self.broken = False
        self.retaliated = False
        self.reserve = 'VANGUARD STRIKE' in self.util or '[VANGUARD STRIKE]' in self.kws
        self.is_thrall = 'Debt-Thrall' in name
        self.stats = defaultdict(float)
        if 'INFILTRATORS' in self.util:
            self.x = 8.0
        elif 'SCOUTS' in self.util:
            self.x = 6.0
        self.ctrl = card['CTRL']

    def add_models(self, card, leader):
        d = U.card_to_unit(card)['def']
        for i in range(card['models']):
            self.models.append({'might': card['MIGHT'], 'max': card['MIGHT'], 'arm': card['ARM'], 'ward': d.get('ward'),
                                'uny': d.get('fnp'), 'hardened': d.get('hardened'), 'frail': d.get('frail'),
                                'card': card, 'leader': leader})

    def attach(self, leader_unit):
        self.models.extend(dict(m, leader=True) for m in leader_unit.models)
        self.buffs = [a for a in leader_unit.card.get('abilities', []) if a.get('buff')]
        self.util |= leader_unit.util
        self.name = f"{self.name} + {leader_unit.name}"
        self.leader_name, self.leader_pts = leader_unit.name, leader_unit.pts
        self.pts += leader_unit.pts
        self.start_models = len(self.models)
        self.start_might = sum(m['might'] for m in self.models)

    @property
    def alive(self):
        return bool(self.models)

    def melee_bias(self):
        r = sum(1 for m in self.models for w in m['card']['weapons'] if w['type'] == 'Ranged')
        mm = sum(1 for m in self.models for w in m['card']['weapons'] if w['type'] != 'Ranged')
        rs = self.models[0]['card']['RS'] if self.models else 6
        return mm > 0 and (r == 0 or rs >= 5)

    def max_range(self):
        best = 0
        for m in self.models:
            for w in m['card']['weapons']:
                if w['type'] == 'Ranged':
                    best = max(best, U.target_num(w.get('range', '0'), 0))
        return best


def dist(a, b):
    return max(0.0, DEPLOY_GAP - a.x - b.x)

# ---------------------------------------------------------------------------
# Attack resolution (real dice)
# ---------------------------------------------------------------------------


def active_mods(unit, wtype):
    mods = []
    for a in unit.ability_mods + unit.buffs:
        sc = a.get('scope', 'all')
        if sc == 'defense':
            continue
        if sc in ('all', wtype.lower()) and random.random() < a.get('uptime', 1.0):
            mods.append(a['mods'])
    return U.merge_mods(mods)


def defense_mods(unit):
    mods = [a['mods'] for a in unit.ability_mods + unit.buffs
            if a.get('scope') == 'defense' and random.random() < a.get('uptime', 1.0)]
    return U.merge_mods(mods)


def expected_value(att, tgt):
    """Points of the target this shooter expects to destroy (how a sensible player picks targets)."""
    if not tgt.models:
        return 0.0
    m0 = tgt.models[0]
    d = dist(att, tgt)
    total = 0.0
    for m in att.models:
        card = m['card']
        for w in card['weapons']:
            if w['type'] != 'Ranged' or U.target_num(w.get('range', '0'), 0) < d:
                continue
            kw = U.parse_4192_traits(w.get('traits', []))
            a = U.d_mean(U.dice_dist(w['A']))
            ph = 1.0 if kw.get('torrent') else U.p_roll(card['RS'])
            need = U.target_num(w['wound'], 4) + (1 if m0['hardened'] else 0) - (1 if m0['frail'] else 0)
            pw = U.p_roll(need)
            st = m0['arm'] + abs(int(w.get('pen', 0)))
            if m0['ward']:
                st = min(st, m0['ward'])
            pf = 1 - U.p_save(max(st, 3))
            dmg = min(U.d_mean(U.dice_dist(w['D'])), m0['max'])
            total += a * ph * pw * pf * dmg
    start = max(tgt.start_might, 1)
    return min(total, sum(x['might'] for x in tgt.models)) / start * tgt.pts


def attack(att, tgt, wtype, charged=False, moved=False, game=None):
    """att attacks tgt with all weapons of the given type. Returns damage dealt (MIGHT)."""
    if not att.alive or not tgt.alive:
        return 0
    om = active_mods(att, wtype)
    dm = defense_mods(tgt)
    d = dist(att, tgt)
    hits_landed = wounds_unsaved = 0
    pending = []      # (damage, fatal) allocations
    overloaded = []   # models that fired an [OVERLOAD] weapon this volley
    for m in list(att.models):
        card = m['card']
        ws = [w for w in card['weapons'] if (w['type'] == 'Ranged') == (wtype == 'Ranged')]
        if wtype == 'Ranged':
            ws = [w for w in ws if U.target_num(w.get('range', '0'), 0) >= d or att.engaged is tgt]
            if att.engaged is not None:
                ws = [w for w in ws if any('CLOSE-QUARTERS' in t for t in w.get('traits', [])) or att.cls >= 4]
            if 'UNSEEN' in tgt.util and d > 12 and tgt.engaged is None:
                return 0
        else:
            # best melee weapon + extra attacks
            main = [w for w in ws if '[EXTRA ATTACKS]' not in w.get('traits', [])]
            extra = [w for w in ws if '[EXTRA ATTACKS]' in w.get('traits', [])]
            if main:
                main = [max(main, key=lambda w: U.d_mean(U.dice_dist(w['A'])) * (7 - U.target_num(w['wound'], 4)) * (1 + abs(int(w.get('pen', 0)))))]
            ws = main + extra
        skill = card['RS'] if wtype == 'Ranged' else card['MS']
        for w in ws:
            kw = U.parse_4192_traits(w.get('traits', []))
            n = roll_dice(w['A']) + om.get('attacks_mod', 0)
            rng = U.target_num(w.get('range', '0'), 0)
            half = wtype == 'Ranged' and d <= rng / 2
            if half and kw.get('rapid'):
                n += kw['rapid']
            if kw.get('blast'):
                n += min(kw['blast'] * (len(tgt.models) // 3), 3)
            if kw.get('one_shot') and random.random() > 1 / 4:
                continue
            hmod = om.get('hit_mod', 0) + (1 if (kw.get('heavy') and not moved) else 0)
            neg = -1 if att.tokens >= 1 else 0
            if wtype == 'Ranged':
                neg += dm.get('incoming_hit_mod_ranged', 0)
                if getattr(tgt, 'in_cover', False) and not ({'[IGNORES COVER]', '[INDIRECT FIRE]'} & set(t.upper() for t in w.get('traits', []))):
                    neg -= 1
                if '[INDIRECT FIRE]' in [t.upper() for t in w.get('traits', [])] and game and not visible(att, tgt, game):
                    neg -= 1
            else:
                neg += dm.get('incoming_hit_mod_melee', 0)
            if kw.get('psychic'):
                neg = max(neg, 0)                 # [PSYCHIC / ARCANE] ignores negative Hit modifiers
            hmod = max(-1, min(1, hmod + neg))
            if kw.get('overload') and n > 0:
                overloaded.append(m)
            crit_h = om.get('crit_hit_on', 6)
            need_w = U.target_num(w['wound'], 4) + (1 if tgt.models[0]['hardened'] else 0) - (1 if tgt.models[0]['frail'] else 0)
            if charged and kw.get('crashing'):
                need_w -= 1
            need_w += dm.get('incoming_wound_mod', 0) - om.get('wound_mod', 0)
            need_w = min(max(need_w, 2), 6)
            crit_w = om.get('crit_wound_on', 6)
            for key, y in kw.get('anti', {}).items():
                if U.anti_matches(key, tgt.kws | {'VEHICLE', 'MONSTER'} if tgt.cls >= 4 else tgt.kws | {'INFANTRY'}):
                    crit_w = min(crit_w, y)
            sustained = kw.get('sustained', 0) + om.get('sustained', 0)
            lethal = kw.get('lethal') or om.get('lethal')
            dev = kw.get('devastating') or om.get('devastating')
            pen = abs(int(w.get('pen', 0))) + om.get('pen_mod', 0)
            for _ in range(max(0, n)):
                # hit
                to_wound, auto = 0, 0
                if kw.get('torrent'):
                    to_wound = 1
                else:
                    r = d6()
                    if r < max(2, skill - hmod) and r != 6 and r < crit_h:
                        rr = om.get('reroll_hit')
                        if rr == 'all' or (rr == 'ones' and r == 1):
                            r = d6()
                    if r >= crit_h:
                        hits_landed += 1
                        to_wound += sustained
                        if lethal:
                            auto += 1
                        else:
                            to_wound += 1
                    elif r != 1 and r >= skill - hmod:
                        hits_landed += 1
                        to_wound += 1
                for i in range(to_wound + auto):
                    if i < auto:
                        crit = False
                    else:
                        r = d6()
                        ok = r >= crit_w or (r != 1 and r >= need_w)
                        if not ok:
                            rr = om.get('reroll_wound') or ('all' if kw.get('relentless') else None)
                            if rr == 'all' or (rr == 'ones' and r == 1):
                                r = d6()
                                ok = r >= crit_w or (r != 1 and r >= need_w)
                        if not ok:
                            continue
                        crit = r >= crit_w
                    dmg = roll_dice(w['D']) + om.get('dmg_mod', 0)
                    if half and kw.get('melta'):
                        dmg += kw['melta']
                    if dm.get('incoming_dmg_mod'):
                        dmg = max(1, dmg + dm['incoming_dmg_mod'])
                    pending.append((dmg, bool(dev and crit), pen))
    # allocate (casualties removed after the whole volley; damage resolved in order)
    dealt = 0
    shooting = wtype == 'Ranged'
    for dmg, fatal, pen in pending:
        if not tgt.models:
            break
        m = tgt.models[0]
        if not fatal:
            st = m['arm'] + pen - dm.get('save_mod', 0)
            ward = m['ward'] if not dm.get('ward') else min(m['ward'] or 7, dm['ward'])
            if ward:
                st = min(st, ward)
            st = max(st, 3)
            if st <= 6 and d6() >= st:
                continue
            # Thrall-Chain
            if game and tgt.faction.startswith('The Auric') and not tgt.is_thrall:
                thr = [u for u in game.sides[tgt.side] if u.is_thrall and u.alive and abs(u.x - tgt.x) <= 6]
                if thr and random.random() < 0.7:
                    t = thr[0]
                    t.models.pop(0)
                    t.stats['value_dealt'] += min(dmg, m['might']) / max(tgt.start_might, 1) * tgt.pts
                    continue
        wounds_unsaved += 1
        uny = m['uny'] if not dm.get('unyielding') else min(m['uny'] or 7, dm['unyielding'])
        lost = sum(1 for _ in range(dmg) if not (uny and d6() >= uny))
        lost = min(lost, m['might'])
        m['might'] -= lost
        dealt += lost
        if m['might'] <= 0:
            tgt.models.pop(0)
            game.deaths += 1
    if shooting and 'SUPPRESS IMMUNE' not in tgt.util:
        sup = any('SUPPRESSIVE' in t for mm in att.models for w in mm['card']['weapons'] for t in w.get('traits', []))
        if wounds_unsaved > 0 or (sup and hits_landed > 0):
            tgt.tokens = min(tgt.tokens + 1, 1 if tgt.cls >= 4 else 2)
    value = dealt / max(tgt.start_might, 1) * tgt.pts
    att.stats['value_dealt'] += value
    att.stats['dealt_c' + ('45' if tgt.cls >= 4 else str(tgt.cls))] += value
    m0 = tgt.card
    tk = ('horde' if tgt.cls == 1 and m0['MIGHT'] <= 1 and m0['ARM'] >= 5 else 'line' if tgt.cls == 1 and m0['MIGHT'] <= 1
          else 'elite' if tgt.cls <= 2 else 'big')
    att.stats['dealt_' + tk] += value
    # [OVERLOAD]: after resolving all attacks, each firing model rolls: 1-2 = 1 Fatal Wound (3 if Class 4-5)
    for m in {id(x): x for x in overloaded}.values():
        if m in att.models and d6() <= 2:
            fw = 3 if att.cls >= 4 else 1
            lost = sum(1 for _ in range(fw) if not (m['uny'] and d6() >= m['uny']))
            m['might'] -= lost
            att.stats['overload_lost'] += lost
            if m['might'] <= 0:
                att.models.remove(m)
                if game:
                    game.deaths += 1
    return dealt

# ---------------------------------------------------------------------------
# Game
# ---------------------------------------------------------------------------


class Game:
    def __init__(self, armyA, armyB):
        self.los = {}
        self.glided = [0, 0]
        self.sides = [armyA, armyB]
        self.vp = [0.0, 0.0]
        self.deaths = 0

    def enemies(self, u):
        return [e for e in self.sides[1 - u.side] if e.alive and not e.reserve]

    def fight(self, a, t, charged=False):
        if RULES.get('defender_first') and not charged and not t.retaliated and t.engaged is a:
            t.retaliated = True                          # proposed: defender strikes first in ongoing melee
            attack(t, a, 'Melee', game=self)
            if a.alive:
                attack(a, t, 'Melee', game=self)
            if not t.alive:
                a.engaged = None
                a.x = min(a.x + 3, DEPLOY_GAP)
            return
        attack(a, t, 'Melee', charged=charged, game=self)
        if t.alive and not t.retaliated and t.engaged is a:
            t.retaliated = True
            attack(t, a, 'Melee', game=self)
        if not t.alive:
            a.engaged = None
            a.x = min(a.x + 3, DEPLOY_GAP)

    def disengage_dead(self):
        for side in self.sides:
            for u in side:
                if u.engaged is not None and not u.engaged.alive:
                    u.engaged = None

    def activate(self, u):
        """Simple, sensible AI: engaged → fight; melee units charge or close in; shooters shoot, then
        advance to the objective line (MID − 3″) and hold it. Starfire glides out after fighting."""
        if not u.alive:
            return
        if u.reserve:
            if self.round < 2:
                return
            u.reserve = False
            en = self.enemies(u)
            u.x = max(0.0, DEPLOY_GAP - 9 - (max(e.x for e in en) if en else 0))
        if u.tokens >= 2:                       # Pinned: 1 action, spent on Rally
            u.tokens = 0
            return
        moved = shot = charged = fought = False
        hold_line = MID - 3
        one_fight = getattr(self, 'one_fight', True)    # proposed rule: FIGHT max once per activation
        for a in range(2):
            self.disengage_dead()
            en = self.enemies(u)
            if not en or not u.alive:
                return
            if u.engaged is not None:
                if fought and one_fight:
                    break
                t = u.engaged
                self.fight(u, t)
                fought = True
                if ('GLIDE' in u.util and u.alive and t.alive and (not u.melee_bias() or t.melee_bias())
                        and self.glided[u.side] < GLIDE_ESCAPES):    # v4.3: only 1 escape-glide per round per army
                    self.glided[u.side] += 1
                    u.engaged = None
                    if t.engaged is u:
                        t.engaged = None
                    u.x = max(0.0, u.x - 3)
                continue
            target = min(en, key=lambda e: dist(u, e))
            dd = dist(u, target)
            if u.melee_bias():
                mc = RULES.get('move_charge') and moved and not charged and dd <= 9 and d6() + 3 >= dd
                if mc:                                   # proposed: Move + Charge with a 3"+D6 rush
                    u.x += dd
                    u.engaged = target
                    if target.engaged is None:
                        target.engaged = u
                    charged = fought = True
                    self.fight(u, target, charged=True)
                elif not moved and not charged and dd <= u.move + 6 and d6() + u.move >= dd:
                    u.x += dd
                    u.engaged = target
                    if target.engaged is None:
                        target.engaged = u
                    charged = fought = True
                    self.fight(u, target, charged=True)
                elif not charged:
                    u.x = min(u.x + u.move, DEPLOY_GAP - target.x - 1.5)
                    moved = True
                continue
            ind = any('[INDIRECT FIRE]' in [t.upper() for t in w.get('traits', [])] for m in u.models for w in m['card']['weapons'])
            in_range = [e for e in en if u.max_range() >= dist(u, e) and not ('UNSEEN' in e.util and dist(u, e) > 12)
                        and visible(u, e, self, indirect=ind)]
            if in_range and not shot:
                t = max(in_range, key=lambda e: expected_value(u, e))
                attack(u, t, 'Ranged', moved=moved, game=self)
                shot = True
            elif u.x < hold_line:
                u.x = min(hold_line, u.x + u.move, DEPLOY_GAP - target.x - 1.5)
                moved = True
            elif target.engaged is None and dd <= u.move + 4 and any(w['type'] != 'Ranged' for m in u.models for w in m['card']['weapons']) and not moved:
                u.x += dd
                u.engaged = target
                target.engaged = target.engaged or u
                charged = fought = True
                self.fight(u, target, charged=True)

    def end_round(self):
        self.glided = [0, 0]
        for s, side in enumerate(self.sides):
            for u in side:
                if not u.alive:
                    continue
                u.tokens = max(0, u.tokens - 1)
                u.retaliated = False
                if 'BURNING' in u.util and u.engaged is None and not u.reserve:
                    u.models[0]['might'] -= 1
                    if u.models[0]['might'] <= 0:
                        u.models.pop(0)
                        self.deaths += 1
                if u.alive:
                    cur = len(u.models) if u.start_models > 1 else u.models[0]['might']
                    start = u.start_models if u.start_models > 1 else u.start_might
                    u.broken = cur <= start / 2
        # objectives: 3 midfield (by CTRL share within 6" of midline) + 1 home each
        ctrl = [0.0, 0.0]
        for s, side in enumerate(self.sides):
            for u in side:
                if u.alive and not u.broken and not u.reserve and u.x >= MID - 4:
                    c = u.ctrl * len(u.models) * (2 if 'SECURED' in u.util else 1)
                    ctrl[s] += c
                    u.stats['ctrl'] += c
        tot = sum(ctrl)
        for s in (0, 1):
            if tot:
                self.vp[s] += 3 * ctrl[s] / tot
                for u in self.sides[s]:
                    if u.alive and not u.broken and not u.reserve and u.x >= MID - 4:
                        u.stats['vp'] += 3 * u.ctrl * len(u.models) * (2 if 'SECURED' in u.util else 1) / tot
            if any(u.alive and not u.broken and u.x <= 6 and not u.reserve for u in self.sides[s]):
                self.vp[s] += 1

    def play(self):
        first = random.randint(0, 1)
        for self.round in range(1, 5):
            for side in self.sides:
                for u in side:
                    u.in_cover = RULES.get('terrain') and u.cls <= 3 and random.random() < COVER_P
            ready = [[u for u in side if u.alive] for side in self.sides]
            for side in ready:
                random.shuffle(side)
                side.sort(key=lambda u: -u.pts)     # strongest first (simple policy)
            turn, passes = first, [0, 0]
            finished_first = None
            while ready[0] or ready[1]:
                if not ready[turn]:
                    if finished_first is None:
                        finished_first = turn
                    turn = 1 - turn
                    continue
                if ready[1 - turn] and len(ready[turn]) < len(ready[1 - turn]) and passes[turn] < 2 and random.random() < 0.5:
                    passes[turn] += 1
                    turn = 1 - turn
                    continue
                u = ready[turn].pop(0)
                self.activate(u)
                turn = 1 - turn
            self.end_round()
            first = finished_first if finished_first is not None else random.randint(0, 1)
        killed = [sum(u.pts * (1 - (sum(m['might'] for m in u.models) / max(u.start_might, 1))) for u in self.sides[1 - s]) for s in (0, 1)]
        score = [self.vp[s] + killed[s] / 100.0 for s in (0, 1)]       # VP + 1 per 100 pts destroyed
        return score


def build_side(army, side, fac_name):
    units = [SimUnit(e['name'], card, p, side, fac_name) for e, card, p in army]
    leaders = [u for u in units if 'Leader' in next(e['role'] for e, c, p in army if e['name'] == u.name.split(' + ')[0])]
    bodies = [u for u in units if u not in leaders]
    for L in leaders:
        cand = [b for b in bodies if b.cls == L.cls and not hasattr(b, 'leader_name') and not b.is_thrall]
        if cand:
            random.choice(cand).attach(L)
            units.remove(L)
    return units


RULES = {'one_fight': True, 'terrain': True}
COVER_P = 0.5            # share of Class 1–3 units in cover each round (−1 to be hit at range)
HIDDEN_P = {1: 0.6, 2: 0.35, 3: 0.35, 4: 0.35}   # chance a Class 1–3 target beyond 12" is out of LoS, per round


def visible(shooter, tgt, game, indirect=False):
    if not RULES.get('terrain') or tgt.cls >= 4 or dist(shooter, tgt) <= 12 or tgt.engaged is not None or indirect:
        return True
    key = (id(shooter), id(tgt), game.round)
    if key not in game.los:
        game.los[key] = random.random() > HIDDEN_P[game.round]
    return game.los[key]


MAP_GAPS = (14.0, 18.0, 24.0)   # no-man's-land of maps A (Frontline), B (Broken Ground, diagonal ≈ 18"), C (Pincer)
DEPLOY_DEPTH = 6.0              # units may deploy up to this far behind their front line (zones are 8" deep)


def play_match(facA, facB):
    global DEPLOY_GAP, MID
    if RULES.get('maps', True):                  # v4.3.2: map variety + deployment depth, so weapon range matters
        DEPLOY_GAP = random.choice(MAP_GAPS)
        MID = DEPLOY_GAP / 2
    armyA, _ = random_army(facA[1])
    armyB, _ = random_army(facB[1])
    sa, sb = build_side(armyA, 0, facA[0]['name']), build_side(armyB, 1, facB[0]['name'])
    if RULES.get('maps', True):
        for u in sa + sb:
            if u.x == 0.0 and not u.reserve:
                # long-range shooters hang back; melee and short-range units deploy on the line
                rng = u.max_range()
                u.x = -random.uniform(0, DEPLOY_DEPTH) if rng >= 30 else -random.uniform(0, 2)
    g = Game(sa, sb)
    g.one_fight = RULES['one_fight']
    score = g.play()
    return score, sa, sb

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------


ALL_FACTIONS = False      # --all: use every factions/NN_*.json instead of the 5 release factions


def load_all():
    calib, lib = U.load_calibration(), U.load_library()
    files = all_faction_files() if ALL_FACTIONS else FACTION_FILES
    return [load_faction(f, calib, lib) for f in files]


def cmd_matrix(args):
    random.seed(args.seed)
    facs = load_all()
    names = [f[0]['name'].replace('The ', '') for f in facs]
    wins = defaultdict(float)
    games = defaultdict(int)
    for i in range(len(facs)):
        for j in range(len(facs)):
            if i >= j:
                continue
            for _ in range(args.games):
                (sa, sb), _, _ = play_match(facs[i], facs[j])
                games[(i, j)] += 1
                wins[(i, j)] += 1 if sa > sb else 0.5 if sa == sb else 0
    print(f"\nWin rate of ROW vs COLUMN ({args.games} random 1,000-pt games per pairing)\n")
    print(' ' * 26 + ''.join(f'{n[:12]:>13}' for n in names) + '      avg')
    for i in range(len(facs)):
        row, tot = [], []
        for j in range(len(facs)):
            if i == j:
                row.append('      —      ')
                continue
            w = wins[(i, j)] / games[(i, j)] if i < j else 1 - wins[(j, i)] / games[(j, i)]
            tot.append(w)
            row.append(f'{100 * w:12.0f}%')
        print(f'{names[i][:25]:<26}' + ''.join(row) + f'   {100 * sum(tot) / len(tot):5.1f}%')


def cmd_units(args):
    random.seed(args.seed)
    facs = load_all()
    acc = defaultdict(lambda: defaultdict(float))
    for g in range(args.games):
        i, j = random.sample(range(len(facs)), 2)
        (sa, sb), A, B = play_match(facs[i], facs[j])
        for side, won in ((A, sa > sb), (B, sb > sa)):
            for u in side:
                parts = [(u.name.split(' + ')[0], u.pts - getattr(u, 'leader_pts', 0))]
                if hasattr(u, 'leader_name'):
                    parts.append((u.leader_name, u.leader_pts))
                alive_frac = sum(m['might'] for m in u.models) / max(u.start_might, 1)
                for nm, p in parts:
                    share = p / u.pts
                    a = acc[(u.faction, nm)]
                    a['n'] += 1
                    a['pts'] += p
                    a['dealt'] += u.stats['value_dealt'] * share
                    a['kept'] += alive_frac * p
                    a['ctrl'] += u.stats['vp'] * share
                    a['won'] += won
                    for k in ('dealt_c1', 'dealt_c2', 'dealt_c3', 'dealt_c45', 'dealt_horde', 'dealt_line', 'dealt_elite', 'dealt_big', 'overload_lost'):
                        a[k] += u.stats[k] * share
    rows = []
    for (fac, nm), a in acc.items():
        if a['n'] < 5:
            continue
        ret = (a['dealt'] + a['kept'] + VP_PTS * a['ctrl']) / a['pts']
        rows.append((fac, nm, a['n'], ret, a['won'] / a['n'], a['pts'] / a['n']))
    mean = sum(r[3] for r in rows) / len(rows)
    rows.sort(key=lambda r: -r[3])
    print(f"\nValue returned per point (pts destroyed + pts surviving + objective VP × {VP_PTS:.0f}), 1.00 = average. {args.games} games.\n")
    print(f"{'Faction':<28}{'Datasheet':<30}{'n':>5}{'avg pts':>9}{'value/pt':>10}{'win%':>7}")
    for fac, nm, n, ret, wr, ap in rows:
        flag = '  ▲ underpriced?' if ret / mean > 1.25 else '  ▼ overpriced?' if ret / mean < 0.8 else ''
        print(f"{fac.replace('The ', '')[:27]:<28}{nm[:29]:<30}{n:>5.0f}{ap:>9.0f}{ret / mean:>10.2f}{100 * wr:>6.0f}%{flag}")
    args._beta = diagnose(rows, mean, facs)
    # per-Class medians of value/pt (non-leaders, normalised by the non-leader mean)
    import statistics
    cls_of, role_of = {}, {}
    for fac, entries in facs:
        for e in entries:
            cls_of[(fac['name'], e['name'])] = e['class']
            role_of[(fac['name'], e['name'])] = e['role']
    nl = [r for r in rows if 'leader' not in role_of.get((r[0], r[1]), '').lower()]
    m = sum(r[3] for r in nl) / len(nl)
    args._class_med = {c: statistics.median([r[3] / m for r in nl if cls_of.get((r[0], r[1])) == c] or [1.0]) for c in range(1, 6)}
    print('\nValue per point by Class (non-leaders, 1.00 = average):', {c: round(v, 2) for c, v in args._class_med.items()})
    if args.json:
        out = []
        for r in rows:
            a = acc[(r[0], r[1])]
            d = dict(zip(['faction', 'unit', 'n', 'value_per_pt', 'win_rate', 'avg_pts'], (r[0], r[1], r[2], r[3] / mean, r[4], r[5])))
            d.update({k: a[k] / a['pts'] for k in ('dealt_c1', 'dealt_c2', 'dealt_c3', 'dealt_c45', 'dealt_horde', 'dealt_line',
                                                   'dealt_elite', 'dealt_big')})   # pts destroyed per own pt
            d['overload_lost'] = a['overload_lost'] / a['n']
            out.append(d)
        json.dump(out, open(args.json, 'w'), indent=1)


def diagnose(rows, mean, facs):
    """Which pricing assumption is off? Regress log(value/pt) on unit traits."""
    import math
    info = {}
    for fac, entries in facs:
        for e in entries:
            n, card, p = e['options'][0]
            info[(fac['name'], e['name'])] = card
    X, y, names = [], [], ['1', 'log(models)', 'Class 4-5', 'CTRL per 100 pts', 'melee-only', 'FLY', 'MIGHT/model']
    facnames = sorted({r[0] for r in rows})[1:]          # faction fixed effects: unit traits are measured WITHIN factions
    for fac, nm, n, ret, wr, ap in rows:
        c = info.get((fac, nm))
        if not c or 'leader' in c.get('role', '').lower():
            continue
        mel = all(w['type'] != 'Ranged' for w in c['weapons'])
        X.append([1, math.log(c['models']), 1 if c['class'] >= 4 else 0, 100 * c['CTRL'] * c['models'] / ap, 1 if mel else 0,
                  1 if '[FLY]' in c.get('keywords', []) else 0, c['MIGHT']] + [1 if fac == f else 0 for f in facnames])
        y.append(math.log(ret / mean))
    beta = U.wls(X, y, [1.0] * len(y), ridge=0.1)
    print('\nWhat explains over/under-performance (effect on value per point):')
    for nm_, b in zip(names[1:], beta[1:len(names)]):
        print(f'  {nm_:<18} {100 * (math.exp(b) - 1):+6.1f}% per unit of the trait')
    return dict(zip(['const', 'log_models', 'class45', 'ctrl', 'melee_only', 'fly', 'might'], beta))


def faction_winrates(games):
    facs = load_all()
    wins = {i: [0.0, 0] for i in range(len(facs))}
    for i in range(len(facs)):
        for j in range(i + 1, len(facs)):
            for _ in range(games):
                (sa, sb), _, _ = play_match(facs[i], facs[j])
                r = 1 if sa > sb else 0.5 if sa == sb else 0
                wins[i][0] += r
                wins[i][1] += 1
                wins[j][0] += 1 - r
                wins[j][1] += 1
    return facs, [wins[i][0] / wins[i][1] for i in range(len(facs))]


def cmd_balance(args):
    """Iteratively tune FACTION_MULT so every release faction wins ~50% with random lists; writes pricing_config.json."""
    random.seed(args.seed)
    cfg = json.load(open(U.PRICING_CONFIG_PATH, encoding='utf-8'))
    mult = dict(cfg.get('FACTION_MULT', {}))
    for it in range(args.iters):
        U.FACTION_MULT = mult
        facs, wr = faction_winrates(args.games)
        line = '  '.join(f"{f[0]['name'].replace('The ', '')[:16]} {100 * w:3.0f}% ×{mult.get(f[0]['name'], 1.0):.2f}" for f, w in zip(facs, wr))
        print(f'iter {it}: {line}')
        for f, w in zip(facs, wr):
            n = f[0]['name']
            # winning too much -> more expensive; damped step, clamped to ±35%
            mult[n] = round(min(1.35, max(0.65, mult.get(n, 1.0) * (1 + 0.6 * (w - 0.5)))), 3)
    cfg['FACTION_MULT'] = mult
    cfg['_FACTION_MULT'] = (f"Tuned by `battle_sim.py balance` ({args.iters} iterations x {args.games} games per pairing). "
                            "Provisional: the sim has no terrain/LoS; confirm with table playtests.")
    json.dump(cfg, open(U.PRICING_CONFIG_PATH, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    print('[✓] FACTION_MULT written to pricing_config.json')


def all_faction_files():
    return sorted(os.path.basename(p) for p in glob.glob(os.path.join(ROOT, 'gametheory', 'factions', '[0-9][0-9]_*.json')))


def cmd_gauntlet(args):
    """Draft factions vs the 5 calibrated release factions (fixed). Tunes each draft's FACTION_MULT toward 50%.
    Provisional by design: the sim cannot see harpoons, spells, swaps, sagas or other non-dice rules (priced as flat pts)."""
    random.seed(args.seed)
    calib, lib = U.load_calibration(), U.load_library()
    cfg = json.load(open(U.PRICING_CONFIG_PATH, encoding='utf-8'))
    mult = dict(cfg.get('FACTION_MULT', {}))
    drafts = [f for f in all_faction_files() if f not in FACTION_FILES]
    if args.only:
        drafts = [f for f in drafts if f[:2] in args.only.split(',')]
    history = defaultdict(list)
    for it in range(args.iters):
        U.FACTION_MULT = mult
        rel = [load_faction(f, calib, lib) for f in FACTION_FILES]
        print(f'--- gauntlet iteration {it + 1} ({args.games} games per draft faction) ---')
        for f in drafts:
            d = load_faction(f, calib, lib)
            w = 0.0
            for g in range(args.games):
                opp = rel[g % len(rel)]
                if g % 2 == 0:
                    (sa, sb), _, _ = play_match(d, opp)
                    w += 1 if sa > sb else 0.5 if sa == sb else 0
                else:
                    (sa, sb), _, _ = play_match(opp, d)
                    w += 1 if sb > sa else 0.5 if sa == sb else 0
            wr = w / args.games
            n = d[0]['name']
            history[n].append(wr)
            old = mult.get(n, 1.0)
            mult[n] = round(min(1.35, max(0.65, old * (1 + 0.6 * (wr - 0.5)))), 3)
            print(f"  {n.replace('The ', '')[:34]:<34} {100 * wr:5.1f}%  ×{old:.3f} → ×{mult[n]:.3f}")
    cfg['FACTION_MULT'] = mult
    cfg['_FACTION_MULT_DRAFTS'] = (f"Draft factions tuned by `battle_sim.py gauntlet` ({args.iters} iterations x {args.games} games vs the "
                                   "5 release factions). PROVISIONAL: non-dice rules are priced as flat points the sim cannot see.")
    json.dump(cfg, open(U.PRICING_CONFIG_PATH, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    if args.json:
        json.dump(history, open(args.json, 'w', encoding='utf-8'), indent=1)
    print('[✓] draft FACTION_MULT written to pricing_config.json')


def cmd_calibrate(args):
    """Learn SIM_CORRECTION (damped) from per-unit residuals, then re-balance factions."""
    cfg = json.load(open(U.PRICING_CONFIG_PATH, encoding='utf-8'))
    sc = dict(cfg.get('SIM_CORRECTION', {}))
    sc.setdefault('log_models_center', 1.2)
    damp = 0.5
    for it in range(args.iters):
        U.SIM_CORRECTION = sc
        print(f'--- calibration iteration {it + 1} ---')
        cmd_units(args)
        b = args._beta
        sc['melee_only'] = round(sc.get('melee_only', 0.0) + damp * b['melee_only'], 4)
        sc['log_models'] = 0.0      # replaced by per-Class multipliers (Class and squad size are collinear)
        sc['class45'] = 0.0
        cm = {str(c): round(min(1.6, max(0.6, U.CLASS_MULT.get(str(c), 1.0) * v ** damp)), 3) for c, v in args._class_med.items()}
        U.CLASS_MULT = cm
        cfg['CLASS_MULT'] = cm
        print('  melee_only', sc['melee_only'], ' CLASS_MULT now', cm)
    cfg['SIM_CORRECTION'] = sc
    cfg['_CLASS_MULT'] = "Learned by `battle_sim.py calibrate`: per-Class value/pt medians (non-leaders), damped 50% per iteration."
    cfg['_SIM_CORRECTION'] = ("Unit-level correction learned by `battle_sim.py calibrate` (terrain sim, EV targeting, damped 50% per "
                              "iteration). price × exp(log_models·(ln models − center) + class45·[Class 4–5] + melee_only·[no ranged]). "
                              "FLY is excluded on purpose: the sim cannot model flying over terrain.")
    json.dump(cfg, open(U.PRICING_CONFIG_PATH, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    U.SIM_CORRECTION = sc
    print('[✓] SIM_CORRECTION written; now balancing factions')
    cfg2 = json.load(open(U.PRICING_CONFIG_PATH, encoding='utf-8'))
    cfg2['FACTION_MULT'] = {}
    json.dump(cfg2, open(U.PRICING_CONFIG_PATH, 'w', encoding='utf-8'), indent=2, ensure_ascii=False)
    U.FACTION_MULT = {}
    args.iters = args.balance_iters
    cmd_balance(args)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    for name in ('matrix', 'units', 'balance', 'calibrate', 'gauntlet'):
        p = sub.add_parser(name)
        p.add_argument('--iters', type=int, default=6)
        p.add_argument('--balance-iters', type=int, default=6)
        p.add_argument('--games', type=int, default=200)
        p.add_argument('--seed', type=int, default=4192)
        p.add_argument('--json', default=None)
        p.add_argument('--all', action='store_true', help='matrix/units: all 25 factions, not just the release five')
        p.add_argument('--only', default=None, help='gauntlet: comma-separated faction numbers, e.g. 03,14')
        p.add_argument('--double-fight', action='store_true', help='rules as currently written (Charge + Fight in one activation)')
        p.add_argument('--move-charge', action='store_true', help='proposal: Charge after a Move with 3"+D6')
        p.add_argument('--defender-first', action='store_true', help='proposal: defender strikes first in ongoing melee')
        p.add_argument('--open-field', action='store_true', help='v1 behaviour: no cover, no line-of-sight blocking')
        p.add_argument('--fixed-map', action='store_true', help='pre-v4.3.2 behaviour: one 24" gap, everyone deploys on the line')
    args = ap.parse_args()
    RULES['one_fight'] = not args.double_fight
    RULES['move_charge'] = args.move_charge
    RULES['defender_first'] = args.defender_first
    RULES['terrain'] = not args.open_field
    RULES['maps'] = not args.fixed_map
    global ALL_FACTIONS
    ALL_FACTIONS = args.all and args.cmd in ('matrix', 'units', 'balance')
    {'matrix': cmd_matrix, 'units': cmd_units, 'balance': cmd_balance, 'calibrate': cmd_calibrate,
     'gauntlet': cmd_gauntlet}[args.cmd](args)


if __name__ == '__main__':
    main()
