#!/usr/bin/env python3
"""
layout_design.py — the 4192 terrain layouts (v3): hand-designed, then measured and polished.

v2 (layout_gen.py) placed pieces at random and kept objectives AWAY from terrain; the tables looked empty and flat.
v3 follows how tournament tables are actually built (measured on 45 published layouts for the larger table, statistics
only — no layout is copied):
  * every piece is a ruin FOOTPRINT you walk into, with walls on two sides (an L) and open sides for entry;
  * objectives sit INSIDE or against a ruin footprint (that is where the fighting happens) — 249 of 249 measured;
  * pieces work in clusters (a big ruin + a small one) that make lanes, at varied angles;
  * ~25 % of the table covered, about half the larger table's 16 footprints.

Three tables per deployment map, from simple to complex, so a group can pick the game it wants:
  1  Open      7–8 pieces, ~21 %: long fire lanes, objectives at the edge of cover — good for learning and gunlines
  2  Standard  9–10 pieces, ~26 %: the default tournament table
  3  Urban     10–12 pieces, ~30 %: dense ruins, objectives deep inside — close-quarters and melee armies shine

Each design lists ONE half of the table; the other half is its symmetric twin (mirror on Frontline and Pincer, so the
left/right wedge pair is used fairly; 180° rotation on Broken Ground). Pieces on the axis can be self-symmetric.
After the hand design, a small local search nudges positions (±1.5", ±10°) to hit the checks without changing the idea.

    python3 layout_design.py            # -> website/data/layouts_4192.json + website/assets/layouts_4192/<CODE>.svg
"""
import json
import math
import os
import random

from shapely.affinity import rotate, scale, translate
from shapely.geometry import LineString, Point, Polygon, box
from shapely.ops import unary_union

import layout_gen as G   # kit, maps, symmetry helpers, table size

W, H, HW, HH = G.W, G.H, G.HW, G.HH
KIT, MAPS, TABLE = G.KIT, G.MAPS, G.TABLE
C = G.C
COUNTS = {'LR': 4, 'TL': 1, 'TR': 1, 'MR': 4, 'LL': 2, 'SL': 4}    # the 16-piece standard footprint set
STYLE = {
    '1': ('Open', 'Abierta', 'Long fire lanes and objectives at the edge of cover. Simple to set up; good for learning and for gunlines.',
          'Carriles de fuego largos y objetivos al borde de la cobertura. Fácil de montar; buena para aprender y para ejércitos de disparo.'),
    '2': ('Standard', 'Estándar', 'The default table: clusters of ruins, objectives inside cover, a few open lanes.',
          'La mesa por defecto: grupos de ruinas, objetivos dentro de cobertura y algunos carriles abiertos.'),
    '3': ('Urban', 'Urbana', 'Dense ruins and objectives deep inside them. Short sightlines; close-quarters and melee armies shine.',
          'Ruinas densas con los objetivos dentro. Líneas de visión cortas; brillan los ejércitos de combate cercano.'),
}
TARGETS = {'1': dict(blocked=(0.78, 0.90), coverage=(0.19, 0.24)),
           '2': dict(blocked=(0.84, 0.94), coverage=(0.23, 0.29)),
           '3': dict(blocked=(0.90, 0.99), coverage=(0.27, 0.34))}
GAP = 3.0            # between two pieces that block line of sight (a 40mm infantry unit walks through; big models use the route check)
GAP_LIGHT = 2.0      # around light walls
BIG = 4.0            # Class 4–5 base that must reach both zones and come within 3" of every objective

# ---------------------------------------------------------------------------------------------------------------
# Walls drawn inside each footprint (local coordinates, before rotation). They show where to put the ruin walls;
# the rules treat the whole Dense footprint as blocking line of sight (CORE_RULES §6), the walls stop Class 4–5.
# corner: 0..3 picks which corner the L sits in (mirrored per piece), so walls face different ways.
# ---------------------------------------------------------------------------------------------------------------
def walls_local(k, corner=0):
    s = KIT[k]
    w, d = s['w'] / 2 - 0.35, s['d'] / 2 - 0.35
    sx, sy = (1, 1) if corner == 0 else (-1, 1) if corner == 1 else (-1, -1) if corner == 2 else (1, -1)
    if k == 'LR':
        segs = [[(-w, -d), (-w + 8.0, -d)], [(-w, -d), (-w, -d + 5.0)], [(w - 3.0, d), (w, d)]]
    elif k == 'MR':
        segs = [[(-w, -d), (-w + 4.0, -d)], [(-w, -d), (-w, -d + 2.6)]]
    elif k in ('TL', 'TR'):
        # wall along the long straight base and up the full-depth end
        full = w if k == 'TL' else -w
        segs = [[(-w, -d), (w, -d)], [(full, -d), (full, d)]]
        return [LineString(sg) for sg in segs]
    elif k in ('LL', 'SL'):
        return [LineString([(-s['w'] / 2 + 0.3, 0), (s['w'] / 2 - 0.3, 0)])]
    else:
        return []
    return [LineString([(sx * x, sy * y) for x, y in sg]) for sg in segs]


def place(geom, x, y, ang):
    return translate(rotate(geom, ang, origin=(0, 0)), x, y)


def twin_geom(g, sym):
    if sym == 'point':
        return rotate(g, 180, origin=(0, 0))
    if sym == 'mirror_y':
        return scale(g, 1, -1, origin=(0, 0))
    return scale(g, -1, 1, origin=(0, 0))


def build(mk, design, sym):
    """design: list of (type, x, y, angle, corner, self_symmetric) in table-corner inches -> full list of pieces."""
    pieces = []
    for k, x, y, ang, corner, selfsym in design:
        cx, cy = C(x, y)
        poly = G.piece_poly(k, cx, cy, ang)
        walls = [place(w_, cx, cy, ang) for w_ in walls_local(k, corner)]
        pieces.append(dict(k=k, x=cx, y=cy, ang=ang, poly=poly, walls=walls, half=True))
        if selfsym:
            continue
        tk, tx, ty, ta, tp = G.twin(k, cx, cy, ang, poly, sym)
        pieces.append(dict(k=tk, x=tx, y=ty, ang=ta, poly=tp, walls=[twin_geom(w_, sym) for w_ in walls], half=False))
    return pieces


def objectives(mk):
    return [o for o in MAPS[mk]['objectives'] if o[0] != 'home']


def violation(mk, pieces, explain=False):
    """Hard rules as a penalty (0 = legal): kit counts, inside the table (0.5" margin), gaps between pieces."""
    pen, why = 0.0, []
    cnt = {}
    for p in pieces:
        cnt[p['k']] = cnt.get(p['k'], 0) + 1
    for k, n in COUNTS.items():
        if cnt.get(k, 0) > n:
            pen += 1000
            why.append(f'kit: {cnt[k]} x {k} > {n}')
    for o in objectives(mk):                       # a marker can sit in a ruin footprint, never on a wall
        q = Point(*o[2])
        for p in pieces:
            if p['k'] in ('LL', 'SL') and p['poly'].distance(q) < 1.0:
                pen += 20
                why.append(f'objective {o[2]} on a wall ({p["k"]})')
    inner = TABLE.buffer(-0.5)
    for i, p in enumerate(pieces):
        out = p['poly'].difference(inner).area
        if out > 1e-6:
            pen += 5 + out
            why.append(f'edge: {p["k"]}#{i} {out:.1f} sq in outside')
    for i, a in enumerate(pieces):
        for j in range(i + 1, len(pieces)):
            b = pieces[j]
            gap = GAP if (KIT[a['k']]['los'] and KIT[b['k']]['los']) else GAP_LIGHT
            d = a['poly'].distance(b['poly'])
            if d < gap - 1e-6:
                pen += 5 + (gap - d) * 3
                why.append(f'gap: {a["k"]}#{i} ({a["x"] + HW:.0f},{a["y"] + HH:.0f}) - {b["k"]}#{j} ({b["x"] + HW:.0f},{b["y"] + HH:.0f}) {d:.1f}" < {gap}"')
    return (pen, why) if explain else pen


def legal(mk, pieces):
    return violation(mk, pieces) == 0


def measure(mk, pieces, rnd, n=500):
    mp = MAPS[mk]
    zones = [Polygon(z) for z in mp['zones']]
    blockers = unary_union([p['poly'] for p in pieces if KIT[p['k']]['los']])
    allp = unary_union([p['poly'] for p in pieces])
    objs = [Point(*o[2]) for o in objectives(mk)]
    centre = objs[[o[0] for o in objectives(mk)].index('central')]
    rp = G.rand_point
    blocked = sum(LineString([rp(zones[0], rnd), rp(zones[1], rnd)]).intersects(blockers) for _ in range(n)) / n
    shelter = []
    for a, b in ((0, 1), (1, 0)):
        hid = 0
        for _ in range(50):
            q = rp(zones[a], rnd)
            hid += sum(LineString([q, rp(zones[b], rnd)]).intersects(blockers) for _ in range(20)) / 20 >= 0.7
        shelter.append(hid / 50)
    # lines from each zone to the centre objective (the objective itself may sit inside a ruin: count only terrain
    # crossed before reaching 1" from the marker, so a unit standing on it is not "hidden from everything")
    # a unit holding it stands within 3": it can be seen unless OTHER Dense terrain is in the way (a ruin you stand in
    # does not hide you from outside — CORE_RULES §6 only blocks lines drawn through an area to the far side)
    cen = []
    ring = centre.buffer(3.0)
    for z in zones:
        hit = 0
        for _ in range(80):
            t = rp(ring, rnd)
            others = unary_union([p['poly'] for p in pieces if KIT[p['k']]['los'] and not p['poly'].buffer(0.05).contains(t)])
            hit += LineString([rp(z, rnd), t]).intersects(others)
        cen.append(hit / 80)
    solid = unary_union([p['poly'] for p in pieces])
    free = TABLE.buffer(-BIG / 2).difference(solid.buffer(BIG / 2))
    parts = list(free.geoms) if hasattr(free, 'geoms') else [free]

    main = max(parts, key=lambda g: g.area) if parts else None     # the open ground big models move through
    # within control range of each objective — or, when the objective sits inside a ruin, at that ruin's edge
    # (Class 4–5 enter a footprint through its open sides; they cannot cross its walls, CORE_RULES §6)
    reach = [z.buffer(-0.1) for z in zones]
    for o in objs:
        host = [p['poly'] for p in pieces if p['poly'].contains(o)]
        reach.append(o.buffer(3.0).union(host[0].buffer(BIG / 2 + 0.6)) if host else o.buffer(3.0))
    cut = sum(1 for g in reach if main is None or not main.intersects(g))   # zones / objectives a 4" base cannot reach
    connected = cut == 0
    obj_terrain = [round(allp.distance(o), 1) for o in objs]  # 0 = inside a footprint
    return dict(blocked=blocked, coverage=allp.area / (W * H), shelter=shelter, centre=cen, connected=connected, cut=cut,
                obj_terrain=obj_terrain, n_pieces=len(pieces))


def score(m, var):
    t = TARGETS[var]

    def band(v, lo, hi, w=1.0):
        return w * (0 if lo <= v <= hi else (lo - v if v < lo else v - hi) * 10)
    s = band(m['blocked'], *t['blocked'], 4) + band(m['coverage'], *t['coverage'], 2)
    s += sum(band(v, 0.25, 0.85) for v in m['shelter']) + sum(band(v, 0.30, 0.80) for v in m['centre'])
    s += 20 * m['cut']
    s += abs(m['shelter'][0] - m['shelter'][1]) * 4 + abs(m['centre'][0] - m['centre'][1]) * 4   # both sides equal
    # objectives: Open = at the edge of cover (<= 2.5"), Standard / Urban = inside or touching (<= 1")
    lim = 2.5 if var == '1' else 1.0
    s += sum(4 for i, d in enumerate(m['obj_terrain']) if d > (6.0 if var == '1' and i == 0 else lim))   # Open keeps an open centre
    return s


def polish(mk, design, sym, var, rnd, steps=1200):
    """Local search around the hand design: small moves only, keeps the composition."""
    best = list(design)
    pcs = build(mk, best, sym)
    pen, why = violation(mk, pcs, explain=True)
    if why:
        print(f'  {mk}-{var} hand design needs repair: ' + '; '.join(why))
    bm = measure(mk, pcs, random.Random(7), 260)
    bs = score(bm, var) + pen * 10
    for _ in range(steps):
        cand = list(best)
        i = rnd.randrange(len(cand))
        k, x, y, a, c, ss = cand[i]
        if ss:                                         # self-symmetric pieces slide along their axis only
            if sym == 'point':
                continue
            if sym == 'mirror_y':
                cand[i] = (k, round((x + rnd.uniform(-1.5, 1.5)) * 2) / 2, y, a, c, ss)
            else:
                cand[i] = (k, x, round((y + rnd.uniform(-1.5, 1.5)) * 2) / 2, a, c, ss)
        else:
            r = 3.0 if pen > 0 else 1.5                # bigger moves while untangling a clash; positions stay on a 0.5" grid
            q = lambda v: round(v * 2) / 2
            cand[i] = (k, q(x + rnd.uniform(-r, r)), q(y + rnd.uniform(-r, r)), a + rnd.choice([0, 0, 5, -5, 10, -10] + ([20, -20] if pen > 0 else [])), c, ss)
        p2 = build(mk, cand, sym)
        pen2 = violation(mk, p2)
        if pen2 > 0 and pen2 >= pen:
            continue                                   # while repairing, only accept moves that reduce the clash
        m2 = measure(mk, p2, random.Random(7), 260)
        s2 = score(m2, var) + pen2 * 10
        if s2 < bs - 1e-9:
            pen = pen2
            best, bs, bm = cand, s2, m2
        if bs == 0:
            break
    rounded = best
    pen, why = violation(mk, build(mk, rounded, sym), explain=True)
    if why:
        print(f'  !! {mk}-{var} still illegal: ' + '; '.join(why))
    return rounded


# ---------------------------------------------------------------------------------------------------------------
# The designs. (type, x, y, angle°, wall corner, self-symmetric) — x along the 44" edge, y from the attacker (red) edge.
# Frontline Clash: zones are the long edges (8" deep), objectives (22,15) centre, (8,15) and (36,15) flanks.
# Broken Ground:   corner triangles, objectives (22,15) centre, (10,24) and (34,6).
# Pincer:          short edges (10" deep), objectives (22,15) centre, (22,5) and (22,25) wings.
# ---------------------------------------------------------------------------------------------------------------
DESIGNS = {
    # ---- A · Frontline Clash (mirror across the long centre line) ----
    'FC-1': [  # Open: two big ruins shelter each zone, flank objectives between low walls, an open centre crossed by a long wall
        ('LR', 9.5, 4.5, 0, 0, False),
        ('MR', 35.0, 10.0, 20, 1, False),
        ('LL', 24.0, 9.0, -15, 0, False),
        ('SL', 8.0, 11.0, 0, 0, False),
    ],
    'FC-2': [  # Standard: the wedge pair guards the left of each zone, a big ruin on the right, centre between two medium ruins
        ('TL', 10.0, 5.0, 0, 0, False),
        ('LR', 34.0, 4.5, 0, 1, False),
        ('MR', 22.0, 11.0, 0, 0, False),
        ('SL', 7.0, 11.5, 25, 0, False),
        ('MR', 37.0, 15.0, 90, 1, True),
    ],
    'FC-3': [  # Urban: the centre objective inside a central ruin, flank objectives inside medium ruins, wedge + big ruin behind
        ('LR', 22.0, 15.0, 0, 0, True),
        ('MR', 8.0, 15.0, 90, 0, True),
        ('MR', 36.0, 15.0, 90, 2, True),
        ('TL', 11.0, 4.5, 10, 0, False),
        ('LR', 33.5, 4.5, -10, 1, False),
        ('SL', 22.0, 7.5, 0, 0, False),
    ],
    # ---- B · Broken Ground (rotated 180°) ----
    'BG-1': [  # Open: one big ruin screens each corner zone, the off-diagonal objectives sit against medium ruins and low walls
        ('LR', 13.0, 10.5, 35, 0, False),
        ('MR', 31.0, 9.0, 0, 1, False),
        ('SL', 38.5, 6.0, 90, 0, False),
        ('LL', 24.0, 2.5, 0, 0, False),
    ],
    'BG-2': [  # Standard: a big ruin holds each off-diagonal objective, centre plaza between two medium ruins, long walls screen the zones
        ('LR', 34.0, 7.5, -20, 1, False),
        ('MR', 22.0, 11.0, 0, 0, False),
        ('LL', 13.5, 12.0, 55, 0, False),
        ('MR', 40.5, 20.0, 90, 2, False),
        ('SL', 17.0, 3.0, 0, 0, False),
    ],
    'BG-3': [  # Urban: centre objective inside a central ruin, off-diagonal objectives inside ruins, a big ruin in front of each zone
        ('LR', 22.0, 15.0, -35, 0, True),
        ('MR', 34.0, 6.0, 0, 1, False),
        ('LR', 10.0, 8.5, 50, 0, False),
        ('LL', 22.0, 3.0, 0, 0, False),
        ('MR', 39.0, 15.5, 90, 2, False),
    ],
    # ---- C · Pincer (mirror across the short centre line) ----
    'PI-1': [  # Open: a big ruin shelters each zone, wing objectives at the edge of medium ruins, open middle with a long wall
        ('LR', 6.0, 15.0, 90, 0, False),
        ('MR', 18.0, 6.0, 0, 0, False),
        ('LL', 16.0, 21.5, 30, 0, False),
        ('SL', 22.0, 11.0, 0, 0, True),
    ],
    'PI-2': [  # Standard: the wedge pair sits in front of each zone, centre plaza between two medium ruins, wing ruins
        ('TL', 5.0, 21.0, 90, 0, False),
        ('LR', 13.0, 7.0, 20, 1, False),
        ('MR', 16.5, 15.0, 90, 0, False),
        ('LL', 22.0, 26.0, 0, 0, True),
        ('SL', 22.0, 3.5, 0, 0, True),
    ],
    'PI-3': [  # Urban: centre objective inside a central ruin, both wings inside ruins, wedge + big ruin flank each zone
        ('LR', 22.0, 15.0, 90, 0, True),
        ('MR', 22.0, 5.0, 0, 0, True),
        ('MR', 22.0, 25.0, 0, 2, True),
        ('TL', 6.0, 7.5, 90, 0, False),
        ('LR', 11.5, 22.5, -30, 1, False),
        ('SL', 14.0, 14.5, 90, 0, False),
    ],
}


# ---------------------------------------------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------------------------------------------
def edge_gaps(poly):
    minx, miny, maxx, maxy = poly.bounds
    side = ('left', round(minx + HW, 1)) if (minx + HW) <= (HW - maxx) else ('right', round(HW - maxx, 1))
    front = ('front', round(miny + HH, 1)) if (miny + HH) <= (HH - maxy) else ('back', round(HH - maxy, 1))
    return side, front


def record(code, mk, var, pieces, m, sym):
    mp = MAPS[mk]
    letters = 'ABCDEFGHIJKLMNOP'
    order = sorted(range(len(pieces)), key=lambda i: (-pieces[i]['y'], pieces[i]['x']))
    out = []
    for li, i in enumerate(order):
        p = pieces[i]
        s = KIT[p['k']]
        side, front = edge_gaps(p['poly'])
        out.append({'code': letters[li], 'type': p['k'], 'kind': s['name'], 'kind_es': s['name_es'], 'terrain': s['kind'],
                    'blocks_los': s['los'], 'size_in': [s['w'], s['d']], 'height_in': s['h'],
                    'centre_in': [round(p['x'], 2), round(p['y'], 2)],
                    'from_left_in': round(p['x'] + HW, 1), 'from_front_in': round(p['y'] + HH, 1),
                    'rotation_deg': round(p['ang'] % 360 if s.get('wedge') else p['ang'] % 180),
                    'edge_gap': {'side': side[0], 'side_in': side[1], 'end': front[0], 'end_in': front[1]},
                    'corners_in': [[round(x, 2), round(y, 2)] for x, y in list(p['poly'].exterior.coords)[:-1]],
                    'walls_in': [[[round(x, 2), round(y, 2)] for x, y in w_.coords] for w_ in p['walls']],
                    'measured': p['half']})
    st = STYLE[var]
    return {'code': code, 'map': mk, 'variant': var, 'style': st[0], 'style_es': st[1], 'about': st[2], 'about_es': st[3],
            'title': f"{mp['name']} — {var} · {st[0]}", 'title_es': f"{mp['name_es']} — {var} · {st[1]}",
            'table': {'width_in': W, 'depth_in': H}, 'kit': 'standard', 'symmetry': sym,
            'deployment_zones': [{'role': 'attacker', 'color': '#ef4444', 'points_in': [[round(v, 2) for v in q] for q in mp['zones'][0]]},
                                 {'role': 'defender', 'color': '#3b82f6', 'points_in': [[round(v, 2) for v in q] for q in mp['zones'][1]]}],
            'objectives': [{'n': i + 1, 'type': t, 'owner': o, 'x_in': round(x, 2), 'y_in': round(y, 2), 'control_radius_in': 3.0}
                           for i, (t, o, (x, y)) in enumerate(objectives(mk))],
            'pieces': out,
            'checks': {'sightlines_blocked': round(m['blocked'], 3), 'coverage': round(m['coverage'], 3),
                       'shelter': [round(v, 2) for v in m['shelter']], 'centre_blocked': [round(v, 2) for v in m['centre']],
                       'big_model_route': m['connected'], 'objective_terrain_in': m['obj_terrain'],
                       'objective_cover_in': m['obj_terrain'], 'pieces': len(pieces)}}


FILLS = {'LR': '#4a4f58', 'TL': '#454b55', 'TR': '#454b55', 'MR': '#525862', 'LL': '#3a3f47', 'SL': '#a89a7c'}


def svg(rec):
    S, pad, top = 22.0, 30, 46
    Wp, Hp = W * S + 2 * pad, H * S + pad + top
    X = lambda x: pad + (x + HW) * S
    Y = lambda y: top + (HH - y) * S
    o = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {Wp:.0f} {Hp:.0f}" role="img" aria-label="{rec["code"]}" font-family="-apple-system,Segoe UI,Roboto,sans-serif">',
         '<defs><pattern id="rub" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="8" height="8" fill="none"/>'
         '<line x1="0" y1="0" x2="0" y2="8" stroke="#ffffff" stroke-opacity="0.07" stroke-width="3"/></pattern></defs>',
         f'<rect width="{Wp:.0f}" height="{Hp:.0f}" fill="#0b0f14"/>',
         f'<rect x="{pad}" y="{top}" width="{W * S:.0f}" height="{H * S:.0f}" fill="#f4f3ef" stroke="#cfcfcf" stroke-width="2"/>']
    for gx in range(2, int(W), 2):
        o.append(f'<line x1="{X(gx - HW):.1f}" y1="{top}" x2="{X(gx - HW):.1f}" y2="{top + H * S:.0f}" stroke="#e7e6e1" stroke-width="{1.2 if gx % 6 == 0 else 0.5}"/>')
    for gy in range(2, int(H), 2):
        o.append(f'<line x1="{pad}" y1="{Y(gy - HH):.1f}" x2="{pad + W * S:.0f}" y2="{Y(gy - HH):.1f}" stroke="#e7e6e1" stroke-width="{1.2 if gy % 6 == 0 else 0.5}"/>')
    for z, col in zip(rec['deployment_zones'], ('rgba(239,68,68,0.12)', 'rgba(59,130,246,0.12)')):
        pts = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in z['points_in'])
        o.append(f'<polygon points="{pts}" fill="{col}" stroke="{z["color"]}" stroke-dasharray="6 4" stroke-width="1.5"/>')
    o.append(f'<line x1="{X(-HW)}" y1="{Y(0)}" x2="{X(HW)}" y2="{Y(0)}" stroke="#777" stroke-dasharray="5 5" stroke-width="1"/>')
    o.append(f'<line x1="{X(0)}" y1="{Y(-HH)}" x2="{X(0)}" y2="{Y(HH)}" stroke="#777" stroke-dasharray="5 5" stroke-width="1"/>')
    # objective control circles under the terrain, markers on top
    for ob in rec['objectives']:
        o.append(f'<circle cx="{X(ob["x_in"]):.1f}" cy="{Y(ob["y_in"]):.1f}" r="{3 * S:.1f}" fill="rgba(34,197,94,0.07)" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="3 4"/>')
    for p in rec['pieces']:
        pts = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in p['corners_in'])
        light = not p['blocks_los']
        o.append(f'<polygon points="{pts}" fill="{FILLS.get(p["type"], "#555")}" stroke="#1b1f24" stroke-width="1.6" stroke-linejoin="round"/>')
        if not light:
            o.append(f'<polygon points="{pts}" fill="url(#rub)"/>')
        for wl in p['walls_in']:
            d = ' '.join(f'{X(x):.1f},{Y(y):.1f}' for x, y in wl)
            col, wid = ('#6b5d43', 5) if light else ('#d4b16a', 6)
            o.append(f'<polyline points="{d}" fill="none" stroke="#2a2214" stroke-width="{wid + 3}" stroke-linecap="round"/>')
            o.append(f'<polyline points="{d}" fill="none" stroke="{col}" stroke-width="{wid}" stroke-linecap="round"/>')
        cx, cy = p['centre_in']
        o.append(f'<text x="{X(cx):.1f}" y="{Y(cy) + 6:.1f}" text-anchor="middle" font-size="16" font-weight="800" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke">{p["code"]}</text>')
    for ob in rec['objectives']:
        x, y = X(ob['x_in']), Y(ob['y_in'])
        o.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="14" fill="#16a34a" stroke="#fff" stroke-width="3"/>')
        o.append(f'<text x="{x:.1f}" y="{y + 5:.1f}" text-anchor="middle" font-size="14" font-weight="800" fill="#fff">{ob["n"]}</text>')
    # set-up measurements for the measured half: nearest footprint edge to the nearest side and end of the table
    for p in rec['pieces']:
        if not p['measured']:
            continue
        xs = [c[0] for c in p['corners_in']]
        ys = [c[1] for c in p['corners_in']]
        g = p['edge_gap']
        if g['side'] == 'left':
            ex, px = -HW, min(xs)
        else:
            ex, px = HW, max(xs)
        py = ys[xs.index(px)]
        if g['end'] == 'front':
            ey, qy = -HH, min(ys)
        else:
            ey, qy = HH, max(ys)
        qx = xs[ys.index(qy)]
        for (x1, y1, x2, y2, txt, tx, ty) in ((px, py, ex, py, g['side_in'], (px + ex) / 2, py), (qx, qy, qx, ey, g['end_in'], qx, (qy + ey) / 2)):
            if txt < 0.4:
                continue
            o.append(f'<line x1="{X(x1):.1f}" y1="{Y(y1):.1f}" x2="{X(x2):.1f}" y2="{Y(y2):.1f}" stroke="#2563eb" stroke-width="1.2" stroke-dasharray="3 3"/>')
            o.append(f'<text x="{X(tx):.1f}" y="{Y(ty) - 4:.1f}" text-anchor="middle" font-size="13" font-weight="800" fill="#1d4ed8" stroke="#f4f3ef" stroke-width="3" paint-order="stroke">{txt}"</text>')
    o.append(f'<text x="{pad}" y="{top - 16}" font-size="16" font-weight="800" fill="#e6edf8">{rec["title"]}</text>')
    symtxt = {'point': '180° symmetric', 'mirror_y': 'mirrored across the long centre line', 'mirror_x': 'mirrored across the short centre line'}[rec['symmetry']]
    o.append(f'<text x="{pad + W * S:.0f}" y="{top - 16}" text-anchor="end" font-size="12" fill="#9aa7b8">44" × 30" · {rec["checks"]["pieces"]} pieces · {symtxt} · blue: gap from the table edge</text>')
    o.append('</svg>')
    return '\n'.join(o)


def main():
    rnd = random.Random(4192)
    svg_dir = os.path.join(G.SITE, 'assets', 'layouts_4192')
    os.makedirs(svg_dir, exist_ok=True)
    out = os.path.join(G.SITE, 'data', 'layouts_4192.json')
    records = {}
    for code, design in DESIGNS.items():
        mk, var = code.split('-')
        sym = MAPS[mk]['sym']
        final = polish(mk, design, sym, var, rnd)
        pcs = build(mk, final, sym)
        m = measure(mk, pcs, random.Random(1), 900)
        rec = record(code, mk, var, pcs, m, sym)
        rec['checks']['score'] = round(score(m, var), 2)
        rec['design'] = [list(t) for t in final]
        records[code] = rec
        open(os.path.join(svg_dir, f'{code}.svg'), 'w', encoding='utf-8').write(svg(rec))
        c = rec['checks']
        print(f"{code} {STYLE[var][0]:<8} pieces {c['pieces']:>2} · blocked {100 * c['sightlines_blocked']:.0f}% · cover {100 * c['coverage']:.0f}% · "
              f"shelter {c['shelter']} · centre {c['centre_blocked']} · route {c['big_model_route']} · obj→terrain {c['objective_terrain_in']} · score {c['score']}")
    json.dump(records, open(out, 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    print(f'[✓] {out} ({len(records)} layouts) + SVGs')


if __name__ == '__main__':
    main()
