#!/usr/bin/env python3
"""
layout_gen.py — original terrain layouts for 4192 AD (44" x 30" table), generated and checked automatically.

Design targets come from measuring 45 published 40k tournament layouts (60" x 44"): ~24 % of the table covered,
~95 % of deployment-zone-to-zone sightlines crossing tall terrain, cover at every objective. They are only used as
statistics; every layout here is generated from scratch on the 4192 kit and the 4192 deployment maps.

Every layout is point-symmetric (rotated 180° about the centre), so both players get the same table.
Checks per layout:
  sightlines   share of deployment-zone -> deployment-zone lines blocked by Dense terrain (target 80–95 %, aim 88 %)
  coverage     share of the table covered by terrain footprints (target 19–28 %)
  movement     a 4"-wide route (Class 4–5 base) connects both deployment zones and every objective
  objectives   no terrain on an objective; cover within 1.5–5" of each one
  shelter      share of each deployment zone that is mostly hidden from the enemy zone (target 15–60 %)
  centre       share of lines from each zone to the centre objective that are blocked (target 30–70 %)

    python3 layout_gen.py                       # writes website/data/layouts_4192.json + website/assets/layouts_4192/<CODE>.svg
    python3 layout_gen.py --tries 6000 --seed 7
"""
import argparse
import json
import math
import os
import random
import statistics

from shapely.affinity import rotate, scale, translate
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..', '..', 'website'))     # outputs go to the Iron & Wrath site (public repo)
W, H = 44.0, 30.0                 # table, inches. x along the 44" side, y along the 30" side, origin = table centre
HW, HH = W / 2, H / 2

# ---------------------------------------------------------------------------------------------------------------
# The 4192 terrain kit (12 pieces). Halves are placed by the generator, the other half is the 180° twin.
# ---------------------------------------------------------------------------------------------------------------
KIT = {   # matches CORE_RULES_MANUAL §6: Dense blocks line of sight through its footprint, Light gives cover, Exposed neither
    # --- standard kit: the common tournament footprint sizes (a 16-piece set; a layout uses 8–10 of them) ---
    'LR': dict(name='Large Ruin', name_es='Ruina grande', w=11.5, d=7.0, h=5.0, los=True, kind='dense', fill='#3f4652'),
    'TL': dict(name='Large Wedge (left)', name_es='Cuña grande (izquierda)', w=11.5, d=8.0, h=5.0, los=True, kind='dense', fill='#374151', wedge='L', narrow=2.0),
    'TR': dict(name='Large Wedge (right)', name_es='Cuña grande (derecha)', w=11.5, d=8.0, h=5.0, los=True, kind='dense', fill='#374151', wedge='R', narrow=2.0),
    'MR': dict(name='Medium Ruin', name_es='Ruina mediana', w=6.0, d=4.0, h=3.0, los=True, kind='dense', fill='#4b5563'),
    'LL': dict(name='Long Wall', name_es='Muro largo', w=10.0, d=2.5, h=5.0, los=True, kind='dense', fill='#2b3038'),
    'SL': dict(name='Short Wall', name_es='Muro corto', w=6.0, d=2.0, h=3.0, los=False, kind='light', fill='#9a8f7a'),
    # --- custom kit (v1) ---
    'RL': dict(name='Large Ruin', name_es='Ruina grande', w=8.0, d=6.0, h=5.0, los=True, kind='dense', count=4, fill='#3f4652'),
    'RS': dict(name='Small Ruin', name_es='Ruina pequeña', w=6.0, d=4.0, h=4.0, los=True, kind='dense', count=2, fill='#4b5563'),
    'BL': dict(name='Barricade', name_es='Barricada', w=6.0, d=1.5, h=1.5, los=False, kind='light', count=2, fill='#9a8f7a'),
    'LW': dict(name='Low Wall', name_es='Muro bajo', w=5.0, d=2.0, h=2.0, los=False, kind='light', count=2, fill='#8a94a3'),
    'CR': dict(name='Crater', name_es='Cráter', w=4.0, d=4.0, h=0.5, los=False, kind='exposed', count=2, fill='#a77b52', round=True),
}
ANGLES = [0, 90, 30, -30, 45, -45, 60, -60]

# ---------------------------------------------------------------------------------------------------------------
# Deployment maps (MISSIONS_AND_TACTICAL_DECK.md §2), converted from corner coordinates to centre coordinates.
# Attacker = red = bottom/left, defender = blue = top/right.
# ---------------------------------------------------------------------------------------------------------------
def C(x, y):
    return (x - HW, y - HH)


MAPS = {
    'FC': dict(name='Frontline Clash', name_es='Choque Frontal', letter='A', sym='mirror_y', zone_dense=2,   # only 14" of no-man's land
               zones=[[C(0, 0), C(44, 0), C(44, 8), C(0, 8)], [C(0, 22), C(44, 22), C(44, 30), C(0, 30)]],
               objectives=[('home', 'attacker', C(22, 4)), ('home', 'defender', C(22, 26)), ('central', '', C(22, 15)),
                           ('flank', '', C(8, 15)), ('flank', '', C(36, 15))]),
    'BG': dict(name='Broken Ground', name_es='Tierra Rota', letter='B', sym='point',
               zones=[[C(0, 0), C(20, 0), C(0, 14)], [C(44, 30), C(24, 30), C(44, 16)]],
               objectives=[('home', 'attacker', C(6, 6)), ('home', 'defender', C(38, 24)), ('central', '', C(22, 15)),
                           ('flank', '', C(10, 24)), ('flank', '', C(34, 6))]),
    'PI': dict(name='Pincer', name_es='Tenaza', letter='C', sym='mirror_x',
               zones=[[C(0, 0), C(10, 0), C(10, 30), C(0, 30)], [C(34, 0), C(44, 0), C(44, 30), C(34, 30)]],
               objectives=[('home', 'attacker', C(5, 15)), ('home', 'defender', C(39, 15)), ('central', '', C(22, 15)),
                           ('flank', '', C(22, 5)), ('flank', '', C(22, 25))]),
}
# Standard kit: which half-sets to try. Mirror maps can use the left/right wedge pair (each half gets one wedge, its
# mirror twin is the other hand). Point-symmetric maps cannot (a rotated left wedge is still a left wedge).
COMPOSITIONS = {
    'mirror': [['LR', 'TL', 'MR', 'SL'], ['LR', 'TL', 'MR', 'LL', 'SL'], ['LR', 'MR', 'MR', 'LL', 'SL'], ['TL', 'MR', 'MR', 'LL', 'SL'],
               ['LR', 'TL', 'LL', 'SL'], ['LR', 'TL', 'SL', 'SL']],
    'point': [['LR', 'MR', 'MR', 'LL', 'SL'], ['LR', 'MR', 'MR', 'SL', 'SL'], ['LR', 'MR', 'LL', 'SL', 'SL'], ['LR', 'LL', 'MR', 'SL']],
}
CUSTOM_HALF = ['RL', 'RL', 'RS', 'CR', 'BL', 'LW']
TARGETS = dict(blocked=(0.80, 0.95), coverage=(0.19, 0.28), shelter=(0.15, 0.60), centre=(0.30, 0.70))
BIG_BASE = 4.0        # Class 4–5 footprint that must be able to move between objectives and zones
GAP_MIN = 3.0         # minimum gap from a line-of-sight blocker to any other piece
GAP_LIGHT = 2.5       # light cover and craters may sit a little closer (infantry still pass; big models use the 4" route check)
OBJ_CLEAR, OBJ_COVER = 1.5, 5.0
ZONE_SHARE = 0.3      # a piece counts as "in" a deployment zone when more than this share of it is inside


def piece_poly(k, x, y, ang):
    s = KIT[k]
    if s.get('round'):
        return Point(x, y).buffer(s['w'] / 2, 24)
    w, d = s['w'] / 2, s['d'] / 2
    if s.get('wedge') == 'L':      # right-angled wedge: full depth at one end, `narrow` at the other
        p = Polygon([(-w, -d), (w, -d), (w, d), (-w, -d + s['narrow'])])
    elif s.get('wedge') == 'R':
        p = Polygon([(-w, -d), (w, -d), (w, -d + s['narrow']), (-w, d)])
    else:
        p = box(-w, -d, w, d)
    return translate(rotate(p, ang, origin=(0, 0)), x, y)


TABLE = box(-HW, -HH, HW, HH)


def rand_point(poly, rnd):
    minx, miny, maxx, maxy = poly.bounds
    for _ in range(200):
        q = Point(rnd.uniform(minx, maxx), rnd.uniform(miny, maxy))
        if poly.contains(q):
            return q
    return poly.representative_point()


def twin(k, x, y, ang, p, sym):
    """The symmetric partner of a piece: 'point' = rotated 180° about the centre, 'mirror_y' = reflected across the
    long centre line (y -> -y), 'mirror_x' = reflected across the short centre line (x -> -x). Reflection swaps wedge hands."""
    flip = {'TL': 'TR', 'TR': 'TL'}
    if sym == 'point':
        return k, -x, -y, ang, rotate(p, 180, origin=(0, 0))
    if sym == 'mirror_y':
        return flip.get(k, k), x, -y, -ang, scale(p, 1, -1, origin=(0, 0))
    return flip.get(k, k), -x, y, 180 - ang, scale(p, -1, 1, origin=(0, 0))


def objectives_of(mp, homes):
    return [o for o in mp['objectives'] if homes or o[0] != 'home']


def candidate(mp, rnd, order, sym, homes):
    """Place one half of the kit at random, add the symmetric twins, return pieces or None if a hard rule fails."""
    zones = [Polygon(z) for z in mp['zones']]
    objs = [Point(*o[2]) for o in objectives_of(mp, homes)]
    half = []
    for k in order:
        ok = False
        for _ in range(300):
            ang = rnd.choice(ANGLES)
            if k == 'CR':
                q = rand_point(zones[0].buffer(-2.2), rnd)
                x, y = q.x, q.y
            else:
                x, y = rnd.uniform(-HW + 2, HW - 2), rnd.uniform(-HH + 2, HH - 2)
            p = piece_poly(k, x, y, ang)
            tk, tx, ty, ta, tp = twin(k, x, y, ang, p, sym)
            if not TABLE.buffer(-0.5).contains(p):
                continue
            if p.distance(tp) < GAP_MIN:
                continue
            if any(p.distance(o) < OBJ_CLEAR + 0.8 for o in objs):
                continue
            gap = GAP_MIN if KIT[k]['los'] else GAP_LIGHT
            if any(p.distance(h[4]) < gap or p.distance(h[5][4]) < gap for h in half):
                continue
            def in_zone(poly):     # a half-piece in either zone puts one Dense piece (it or its twin) in EACH zone
                return any(poly.intersection(z).area > ZONE_SHARE * poly.area for z in zones)
            if KIT[k]['los'] and KIT[k]['w'] >= 6 and in_zone(p):
                if sum(1 for h in half if KIT[h[0]]['los'] and KIT[h[0]]['w'] >= 6 and in_zone(h[4])) >= mp.get('zone_dense', 1):
                    continue  # limit Dense pieces inside each deployment zone: the rest fills no-man's land
            half.append((k, x, y, ang, p, (tk, tx, ty, ta, tp)))
            ok = True
            break
        if not ok:
            return None
    pieces = []
    for k, x, y, ang, p, (tk, tx, ty, ta, tp) in half:
        pieces.append(dict(k=k, x=x, y=y, ang=ang, poly=p))
        pieces.append(dict(k=tk, x=tx, y=ty, ang=ta, poly=tp))
    return pieces


def metrics(mp, pieces, rnd, n=260, homes=True):
    zones = [Polygon(z) for z in mp['zones']]
    blockers = unary_union([p['poly'] for p in pieces if KIT[p['k']]['los']])
    allp = unary_union([p['poly'] for p in pieces])
    olist = objectives_of(mp, homes)
    objs = [Point(*o[2]) for o in olist]
    centre_obj = objs[[o[0] for o in olist].index('central')]
    # sightlines zone -> zone
    blocked = sum(LineString([rand_point(zones[0], rnd), rand_point(zones[1], rnd)]).intersects(blockers) for _ in range(n)) / n
    coverage = allp.area / (W * H)
    # shelter: share of zone points that cannot see >= 70 % of the enemy zone
    shelter = []
    for a, b in ((0, 1), (1, 0)):
        hid = 0
        for _ in range(40):
            p = rand_point(zones[a], rnd)
            bl = sum(LineString([p, rand_point(zones[b], rnd)]).intersects(blockers) for _ in range(20)) / 20
            hid += bl >= 0.7
        shelter.append(hid / 40)
    centre = [sum(LineString([rand_point(z, rnd), centre_obj]).intersects(blockers) for _ in range(60)) / 60 for z in zones]
    # movement for a 4" base: free space = table shrunk by 2" minus pieces grown by 2" (craters are passable)
    solid = unary_union([p['poly'] for p in pieces if p['k'] != 'CR'])
    free = TABLE.buffer(-BIG_BASE / 2).difference(solid.buffer(BIG_BASE / 2))
    parts = list(free.geoms) if hasattr(free, 'geoms') else [free]

    def part_of(geom):
        for i, g in enumerate(parts):
            if g.intersects(geom):
                return i
        return None
    zid = [part_of(z.buffer(-0.1)) for z in zones]
    oid = [part_of(o.buffer(1.0)) for o in objs]
    connected = zid[0] is not None and all(i == zid[0] for i in zid + oid)
    obj_cover = [allp.distance(o) for o in objs]
    return dict(blocked=blocked, coverage=coverage, shelter=shelter, centre=centre, connected=connected,
                obj_cover=obj_cover, n_pieces=len(pieces))


def score(m):
    s = 0.0

    def band(v, lo, hi, w=1.0):
        return w * (0 if lo <= v <= hi else (lo - v if v < lo else v - hi) * 10)
    s += band(m['blocked'], *TARGETS['blocked'], 4.0)
    s += band(m['coverage'], *TARGETS['coverage'])
    for v in m['shelter']:
        s += band(v, *TARGETS['shelter'])
    for v in m['centre']:
        s += band(v, *TARGETS['centre'])
    s += 0 if m['connected'] else 50
    s += sum(3 for d in m['obj_cover'] if not OBJ_CLEAR <= d <= OBJ_COVER)
    # prefer blocked near the middle of the band (some long lanes stay open for artillery)
    s += abs(m['blocked'] - 0.88) * 3
    return s


def signature(pieces):
    return [(p['k'], round(p['x'] / 4), round(p['y'] / 4)) for p in pieces if KIT[p['k']]['los']]


def distance(a, b):
    sa, sb = signature(a), signature(b)
    return sum(1 for t in sa if t not in sb)


# ---------------------------------------------------------------------------------------------------------------
# Output: data (same idea as the 40k ar_index.json: pieces with corners, objectives, zones) + SVG 2D maps
# ---------------------------------------------------------------------------------------------------------------
def to_record(code, mk, var, pieces, m, homes=True, sym='point', kit='standard'):
    mp = MAPS[mk]
    letters = 'ABCDEFGHIJKL'
    order = sorted(range(len(pieces)), key=lambda i: (-pieces[i]['y'], pieces[i]['x']))
    out = []
    for li, i in enumerate(order):
        p = pieces[i]
        s = KIT[p['k']]
        corners = [[round(x, 2), round(y, 2)] for x, y in list(p['poly'].exterior.coords)[:-1]] if not s.get('round') else []
        out.append({'code': letters[li], 'type': p['k'], 'kind': s['name'], 'kind_es': s['name_es'], 'terrain': s['kind'],
                    'blocks_los': s['los'], 'size_in': [s['w'], s['d']], 'height_in': s['h'],
                    'centre_in': [round(p['x'], 2), round(p['y'], 2)],
                    'from_left_in': round(p['x'] + HW, 1), 'from_front_in': round(p['y'] + HH, 1),
                    'rotation_deg': (p['ang'] % 360 if s.get('wedge') else p['ang'] % 180) if not s.get('round') else 0,
                    'corners_in': corners})
    return {'code': code, 'map': mk, 'variant': var, 'title': f"{mp['name']} — Layout {var}", 'title_es': f"{mp['name_es']} — Disposición {var}",
            'table': {'width_in': W, 'depth_in': H},
            'deployment_zones': [{'role': 'attacker', 'color': '#ef4444', 'points_in': [list(map(lambda v: round(v, 2), p)) for p in mp['zones'][0]]},
                                 {'role': 'defender', 'color': '#3b82f6', 'points_in': [list(map(lambda v: round(v, 2), p)) for p in mp['zones'][1]]}],
            'objectives': [{'n': i + 1, 'type': t, 'owner': o, 'x_in': round(x, 2), 'y_in': round(y, 2), 'control_radius_in': 3.0}
                           for i, (t, o, (x, y)) in enumerate(objectives_of(mp, homes))],
            'kit': kit, 'symmetry': sym,
            'pieces': out,
            'checks': {'sightlines_blocked': round(m['blocked'], 3), 'coverage': round(m['coverage'], 3),
                       'shelter': [round(v, 2) for v in m['shelter']], 'centre_blocked': [round(v, 2) for v in m['centre']],
                       'big_model_route': m['connected'], 'objective_cover_in': [round(v, 1) for v in m['obj_cover']]}}


def svg(rec):
    S = 22.0                        # px per inch
    pad = 34
    Wp, Hp = W * S + 2 * pad, H * S + 2 * pad
    X = lambda x: pad + (x + HW) * S
    Y = lambda y: pad + (HH - y) * S          # y up = towards the defender (top of the image)
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wp:.0f} {Hp:.0f}" role="img" aria-label="{rec["code"]}" '
         f'font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
         f'<rect x="0" y="0" width="{Wp:.0f}" height="{Hp:.0f}" fill="#0b0f14"/>',
         f'<rect x="{pad}" y="{pad}" width="{W * S:.0f}" height="{H * S:.0f}" fill="#f7f7f5" stroke="#cfcfcf" stroke-width="2"/>']
    # 6" grid
    for gx in range(6, int(W), 6):
        o.append(f'<line x1="{X(gx - HW):.1f}" y1="{pad}" x2="{X(gx - HW):.1f}" y2="{pad + H * S:.0f}" stroke="#e3e3e0" stroke-width="1"/>')
    for gy in range(6, int(H), 6):
        o.append(f'<line x1="{pad}" y1="{Y(gy - HH):.1f}" x2="{pad + W * S:.0f}" y2="{Y(gy - HH):.1f}" stroke="#e3e3e0" stroke-width="1"/>')
    for z, col in zip(rec['deployment_zones'], ('rgba(239,68,68,0.13)', 'rgba(59,130,246,0.13)')):
        pts = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in z['points_in'])
        o.append(f'<polygon points="{pts}" fill="{col}" stroke="{z["color"]}" stroke-dasharray="6 4" stroke-width="1.5"/>')
    o.append(f'<line x1="{X(-HW)}" y1="{Y(0)}" x2="{X(HW)}" y2="{Y(0)}" stroke="#555" stroke-dasharray="5 5" stroke-width="1"/>')
    o.append(f'<line x1="{X(0)}" y1="{Y(-HH)}" x2="{X(0)}" y2="{Y(HH)}" stroke="#555" stroke-dasharray="5 5" stroke-width="1"/>')
    for p in rec['pieces']:
        s = KIT[p['type']]
        cx, cy = p['centre_in']
        if s.get('round'):
            o.append(f'<circle cx="{X(cx):.1f}" cy="{Y(cy):.1f}" r="{s["w"] / 2 * S:.1f}" fill="{s["fill"]}" fill-opacity="0.55" stroke="#6b4a2c" stroke-width="2" stroke-dasharray="4 3"/>')
        else:
            pts = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in p['corners_in'])
            o.append(f'<polygon points="{pts}" fill="{s["fill"]}" stroke="#111" stroke-width="1.5"/>')
        o.append(f'<text x="{X(cx):.1f}" y="{Y(cy) + 6:.1f}" text-anchor="middle" font-size="17" font-weight="800" fill="#fff" '
                 f'stroke="#000" stroke-width="3" paint-order="stroke">{p["code"]}</text>')
    for ob in rec['objectives']:
        x, y = X(ob['x_in']), Y(ob['y_in'])
        col = {'attacker': '#ef4444', 'defender': '#3b82f6'}.get(ob['owner'], '#22c55e')
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{3 * S:.1f}" fill="none" stroke="{col}" stroke-width="1.5" stroke-dasharray="3 4"/>')
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="13" fill="#fff" stroke="{col}" stroke-width="4"/>')
        o.append(f'<text x="{x:.1f}" y="{y + 5:.1f}" text-anchor="middle" font-size="14" font-weight="800" fill="{col}">{ob["n"]}</text>')
    # dimension lines for the attacker half (the other half is the 180° twin): centre of each piece to the nearest side edges
    for p in rec['pieces']:
        cx, cy = p['centre_in']
        if cy > 0:
            continue
        ex = -HW if cx < 0 else HW
        o.append(f'<line x1="{X(cx):.1f}" y1="{Y(cy):.1f}" x2="{X(ex):.1f}" y2="{Y(cy):.1f}" stroke="#2563eb" stroke-width="1" stroke-dasharray="2 3"/>')
        o.append(f'<line x1="{X(cx):.1f}" y1="{Y(cy):.1f}" x2="{X(cx):.1f}" y2="{Y(-HH):.1f}" stroke="#2563eb" stroke-width="1" stroke-dasharray="2 3"/>')
        dx = abs(ex - cx)
        o.append(f'<text x="{(X(cx) + X(ex)) / 2:.1f}" y="{Y(cy) - 4:.1f}" text-anchor="middle" font-size="13" font-weight="700" fill="#1d4ed8">{dx:.1f}"</text>')
        o.append(f'<text x="{X(cx) + 4:.1f}" y="{(Y(cy) + Y(-HH)) / 2:.1f}" font-size="13" font-weight="700" fill="#1d4ed8">{cy + HH:.1f}"</text>')
    o.append(f'<text x="{pad}" y="{pad - 10}" font-size="15" font-weight="800" fill="#e6edf8">{rec["title"]}</text>')
    symtxt = {'point': '180° symmetric', 'mirror_y': 'mirrored across the long centre line', 'mirror_x': 'mirrored across the short centre line'}[rec.get('symmetry', 'point')]
    o.append(f'<text x="{pad + W * S:.0f}" y="{pad - 10}" text-anchor="end" font-size="12" fill="#9aa7b8">44" × 30" · centres from the nearest side and the front edge · {symtxt}</text>')
    o.append('</svg>')
    return '\n'.join(o)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kit', choices=['standard', 'custom'], default='standard')
    ap.add_argument('--homes', action='store_true', help='keep the two home objectives (standard kit drops them by default)')
    ap.add_argument('--tries', type=int, default=2500)
    ap.add_argument('--seed', type=int, default=4192)
    ap.add_argument('--variants', type=int, default=3)
    ap.add_argument('--maps', default=None, help='only these maps, e.g. PI or FC,PI (other layouts in the file are kept)')
    args = ap.parse_args()
    rnd = random.Random(args.seed)
    homes = args.homes or args.kit == 'custom'
    global ZONE_SHARE
    if args.kit == 'standard':
        ZONE_SHARE = 0.5      # the standard pieces are big for a 30" table: only count pieces mostly inside a zone
    sub = '' if args.kit == 'standard' else 'custom'
    svg_dir = os.path.join(SITE, 'assets', 'layouts_4192', sub)
    os.makedirs(svg_dir, exist_ok=True)
    out = os.path.join(SITE, 'data', 'layouts_4192.json' if args.kit == 'standard' else 'layouts_4192_custom.json')
    records, summary = {}, []
    if args.maps and os.path.exists(out):
        records = json.load(open(out, encoding='utf-8'))
    for mk, mp in MAPS.items():
        if args.maps and mk not in args.maps.split(','):
            continue
        sym = 'point' if args.kit == 'custom' else mp['sym']
        comps = [CUSTOM_HALF] if args.kit == 'custom' else COMPOSITIONS['point' if sym == 'point' else 'mirror']
        pool, valid = [], {}
        per = max(1, args.tries // len(comps))
        for comp in comps:
            order = sorted(comp, key=lambda k: -KIT[k]['w'] * KIT[k]['d'])     # big pieces first
            n_ok = 0
            for _ in range(per):
                pcs = candidate(mp, rnd, order, sym, homes)
                if not pcs:
                    continue
                n_ok += 1
                m = metrics(mp, pcs, rnd, n=120, homes=homes)
                pool.append((score(m), pcs, m, '+'.join(comp)))
            valid['+'.join(comp)] = n_ok
        pool.sort(key=lambda t: t[0])
        # how well each half-set can do: median of its 10 best first-pass scores
        for comp in valid:
            best = [t[0] for t in pool if t[3] == comp][:10]
            summary.append((mk, comp, valid[comp], statistics.median(best) if best else None))
        chosen = []
        for sc, pcs, m, comp in pool[:800]:
            if all(distance(pcs, c[1]) >= 3 for c in chosen):
                m = metrics(mp, pcs, random.Random(1), n=600, homes=homes)  # re-measure the finalists with more sightlines
                if m['blocked'] < 0.78 or not m['connected'] or not all(OBJ_CLEAR <= d <= OBJ_COVER + 0.5 for d in m['obj_cover']):
                    continue                                        # failed a hard check on the precise measure: try the next one
                chosen.append((score(m), pcs, m, comp))
            if len(chosen) == args.variants:
                break
        for i, (sc, pcs, m, comp) in enumerate(chosen):
            var = str(i + 1)
            code = f'{mk}-{var}'
            rec = to_record(code, mk, var, pcs, m, homes=homes, sym=sym, kit=args.kit)
            rec['checks']['score'] = round(sc, 3)
            rec['checks']['half_set'] = comp
            records[code] = rec
            open(os.path.join(svg_dir, f'{code}.svg'), 'w', encoding='utf-8').write(svg(rec))
            c = rec['checks']
            print(f"{code:<5} [{comp}] score {sc:5.2f} · blocked {100 * c['sightlines_blocked']:.0f}% · coverage {100 * c['coverage']:.0f}% · "
                  f"shelter {c['shelter']} · centre {c['centre_blocked']} · route {c['big_model_route']} · objective cover {c['objective_cover_in']}")
    print('\nHalf-set comparison (median of the 10 best scores; lower is better):')
    for mk, comp, n_ok, med in summary:
        print(f'  {mk} {comp:<22} valid {n_ok:5d}  median best score {med if med is None else round(med, 2)}')
    json.dump(records, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'[✓] {out} ({len(records)} layouts) and {svg_dir}/*.svg')


if __name__ == '__main__':
    main()
