#!/usr/bin/env python3
"""
build_rules_data.py — the game's rules and missions → the website (run by build_game_data.py, or on its own).

Reads  ../gametheory/CORE_RULES_MANUAL_4192.md, MISSIONS_AND_TACTICAL_DECK.md
Writes gdm_data.js               (Rules page categories, the 3 maps as primary missions, the 12 Tactical cards)
       mission_text.js           (card text the Missions page and the game tracker show)
       data/core_stratagems.json (the 10 Core Tactics)
       data/glossary.json        (keyword → rule, shown under weapons on datasheets)
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.abspath(os.path.join(HERE, '..'))
GT = os.path.abspath(os.path.join(SITE, '..', 'gametheory'))
RULES_MD = os.path.join(GT, 'CORE_RULES_MANUAL_4192.md')
MISSIONS_MD = os.path.join(GT, 'MISSIONS_AND_TACTICAL_DECK.md')


# ---------- a small markdown → html converter (what these two files use: lists, tables, bold, code, quotes) ----------
def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r'`([^`]+)`', r'<code>\1</code>', t)
    t = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', t)
    t = re.sub(r'(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?!\w)', r'<i>\1</i>', t)
    t = re.sub(r'\[([^\]]+)\]\(([^)]+\.md)\)', r'\1', t)       # links to other md files: keep the words
    t = re.sub(r'\$\\le\s*', '≤', t).replace('$', '')
    return t


def md_html(lines):
    out, i, para = [], 0, []
    lists = []   # stack of (indent, tag)

    def flush():
        if para:
            out.append('<p>' + inline(' '.join(para)) + '</p>')
            para.clear()

    def close_lists(to=-1):
        while lists and lists[-1][0] > to:
            out.append(f'</li></{lists.pop()[1]}>')

    while i < len(lines):
        ln = lines[i].rstrip('\n')
        s = ln.strip()
        if s.startswith('```'):
            flush(); close_lists()
            j = i + 1
            block = []
            while j < len(lines) and not lines[j].strip().startswith('```'):
                block.append(lines[j].rstrip('\n')); j += 1
            if s == '```mermaid':   # the round flowchart: show its three boxes as text
                steps = [re.sub(r'<br>', ' — ', m) for m in re.findall(r'\["([^"]+)"\]', '\n'.join(block))]
                out.append('<p><b>' + ' → '.join(html.escape(x) for x in steps) + '</b></p>')
            else:
                out.append('<pre>' + html.escape('\n'.join(block)) + '</pre>')
            i = j + 1
            continue
        if s.startswith('|'):
            flush(); close_lists()
            rows = []
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells if c):
                    rows.append(cells)
                i += 1
            t = '<table><thead><tr>' + ''.join(f'<th>{inline(c)}</th>' for c in rows[0]) + '</tr></thead><tbody>'
            t += ''.join('<tr>' + ''.join(f'<td>{inline(c)}</td>' for c in r) + '</tr>' for r in rows[1:]) + '</tbody></table>'
            out.append(t)
            continue
        m = re.match(r'^(\s*)([*-]|\d+\.)\s+(.*)$', ln)
        if m:
            flush()
            ind, tag = len(m.group(1).replace('\t', '    ')), 'ol' if m.group(2)[0].isdigit() else 'ul'
            if not lists or ind > lists[-1][0]:
                out.append(f'<{tag}><li>'); lists.append((ind, tag))
            else:
                close_lists(ind)
                if lists:
                    out.append('</li><li>')
                else:
                    out.append(f'<{tag}><li>'); lists.append((ind, tag))
            out.append(inline(m.group(3)))
            i += 1
            continue
        if s.startswith('>'):
            flush(); close_lists()
            q = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                q.append(lines[i].strip()[1:].strip()); i += 1
            out.append('<blockquote>' + md_html(q) + '</blockquote>')
            continue
        if s.startswith('####'):
            flush(); close_lists()
            out.append('<h4>' + inline(s.lstrip('#').strip()) + '</h4>')
        elif s in ('---', ''):
            flush()
            if s == '---' or (i + 1 < len(lines) and not re.match(r'^\s+([*-]|\d+\.)\s', lines[i + 1])):
                close_lists()
        else:
            if lists and ln.startswith(' '):
                out.append(' ' + inline(s))
            else:
                close_lists(); para.append(s)
        i += 1
    flush(); close_lists()
    return ''.join(out)


def sections(text, level):
    """Split markdown on headings of exactly `level` #'s → [(title, lines)] (text before the first heading → title '')."""
    out, cur, buf = [], '', []
    for ln in text.splitlines():
        m = re.match(r'^(#{%d})\s+(.*)$' % level, ln)
        if m:
            out.append((cur, buf)); cur, buf = m.group(2).strip(), []
        else:
            buf.append(ln)
    out.append((cur, buf))
    return out


def plain(t):
    return re.sub(r'\*\*|`', '', t).strip()


# ---------- core rules → Rules page ----------
def core_rules():
    text = open(RULES_MD, encoding='utf-8').read()
    cats = []
    for n, (title, lines) in enumerate(sections(text, 2)):
        if not title:
            continue
        cid = f'{len(cats) + 1:02d}'
        ctitle = re.sub(r'^SECTION\s+[\dA-Z]+:\s*', '', title).title().replace('&', '&').replace("'S", "'s")
        rules = []
        for rt, rl in sections('\n'.join(lines), 3):
            body = md_html(rl).strip()
            if not body:
                continue
            rules.append({'id': f'{cid}.{len(rules) + 1:02d}', 'title': (rt or ctitle).upper(), 'html': body})
        cats.append({'id': cid, 'title': ctitle, 'rules': rules})
    return cats, text


def core_tactics(text):
    sec = dict(sections(text, 2))
    lines = next(v for k, v in sec.items() if 'CORE TACTICS' in k)
    out = []
    for ln in lines:
        c = [x.strip() for x in ln.strip().strip('|').split('|')]
        if len(c) == 5 and re.fullmatch(r'\**\d+\**', c[0]):
            out.append({'name': plain(c[1]), 'cost': re.sub(r'\D', '', c[2]) or c[2], 'category': 'Core Tactic',
                        'turn': plain(c[3]), 'target': '', 'effect': plain(c[4])})
    return out


def glossary(text):
    out = {}
    for ln in text.splitlines():
        m = re.match(r'^\*\s+\*\*`\[([^\]]+)\]`(.*?):\*\*\s*(.*)$', ln)
        if not m:
            continue
        desc = plain(m.group(3))
        for part in re.split(r'\s*/\s*', m.group(1)):          # [PSYCHIC / ARCANE] → both
            key = re.sub(r'\s+([XY]|D?\d+)\+?"?$', '', part.strip().upper())   # "WARD X+", "SURGE D6\"" → WARD, SURGE
            key = key.split('-')[0] if key.startswith('ANTI') else key
            out[key] = desc
        extra = re.search(r'`\[([A-Z ]+) X\]`', m.group(2))         # "[REAPING X] (Melee) / [SHRAPNEL X] (Ranged)"
        if extra:
            out[extra.group(1)] = desc
    return out


# ---------- missions → Missions page + tracker ----------
MAPS = [('A', 'Frontline Clash'), ('B', 'Broken Ground'), ('C', 'Pincer')]


def missions():
    text = open(MISSIONS_MD, encoding='utf-8').read()
    sec = {k: v for k, v in sections(text, 2)}
    maps_lines = next(v for k, v in sec.items() if k.startswith('2.'))
    rows = {}
    for ln in maps_lines:
        c = [x.strip() for x in ln.strip().strip('|').split('|')]
        if len(c) == 4:
            for code, name in MAPS:
                if name in c[0]:
                    rows[name] = c
    primary = {}
    for code, name in MAPS:
        c = rows[name]
        primary[name] = {
            'setup': f'Map {code} · 44″ × 30″ · 3 objectives (40 mm)\nDeployment: {plain(c[1])}\nObjectives (x, y from the bottom-left corner): {plain(c[2])}\nPlays like: {plain(c[3])}\nTerrain: one of the {code}-layouts on the Terrain page.',
            'sections': [{'heading': 'SECOND TO FOURTH BATTLE ROUND — END OF ROUND', 'timing': 'End of Rounds 2, 3 and 4',
                          'items': [{'vp': 1, 'text': 'You control 1 or more objectives.'},
                                    {'vp': 2, 'plus': True, 'text': 'You control 2 or more objectives.'},
                                    {'vp': 2, 'plus': True, 'text': 'You control more objectives than your opponent.'}],
                          'notes': ['Control: the highest total CTRL within 3″ horizontally / 5″ vertically. Broken units have CTRL 0. [SECURED] keeps control until the enemy out-controls it.',
                                    'No primary scoring in Round 1: it is the positioning round.', 'Max 15 VP per game.'],
                          'max': 5}],
            'actions': ['Tie-break at the end of the battle: points of enemy units destroyed.']}
    deck_lines = next(v for k, v in sec.items() if k.startswith('3.'))
    secondary, names = {}, []
    for ln in deck_lines:
        c = [x.strip() for x in ln.strip().strip('|').split('|')]
        if len(c) == 4 and re.fullmatch(r'\d+', c[0]):
            name, score, burn = plain(c[1]), plain(c[2]), plain(c[3])
            vp = int(re.search(r'(\d+)\s*VP', score).group(1))
            cond = re.sub(r':\s*\d+\s*VP.*$', '', score).strip()
            bonus = re.search(r'\((\d+) if ([^)]+)\)', score)
            heading = 'SCORE IT — SECOND TO FOURTH BATTLE ROUND' if re.search(r'Rounds 2–4', score) else 'SCORE IT — END OF ROUND'
            items = [{'vp': vp, 'text': re.sub(r'^Rounds 2–4 only:\s*', '', cond) + '.'}]
            if bonus:
                items.append({'vp': int(bonus.group(1)), 'or': True, 'text': f'Instead, if {bonus.group(2)}.'})
            secondary[name + '|defender'] = {'sections': [{'heading': heading, 'timing': 'End of Round (max 2 cards scored per round)', 'items': items}],
                                             'actions': ['BURN IT (instant, 0 CP, during one of your activations): ' + burn + '.']}
            names.append(name)
    deck_rules = md_html([ln for ln in deck_lines if not ln.strip().startswith('|')])
    other = [(k, v) for k, v in sec.items() if k and not k.startswith(('2.', '3.', '5.'))]
    mrules = [{'title': 'DEPLOYMENT MAPS', 'html': md_html(maps_lines)}, {'title': 'THE TACTICAL DECK', 'html': deck_rules}] + \
             [{'title': re.sub(r'^\d+\.\s*', '', k).upper(), 'html': md_html(v)} for k, v in other]
    return primary, secondary, names, mrules


def build():
    cats, text = core_rules()
    primary, secondary, cards, mrules = missions()
    mid = f'{len(cats) + 1:02d}'
    cats.append({'id': mid, 'title': 'Missions & Tactical Deck', 'rules': [dict(r, id=f'{mid}.{i + 1:02d}') for i, r in enumerate(mrules)]})
    tid = f'{len(cats) + 1:02d}'
    cats.append({'id': tid, 'title': 'Terrain', 'rules': [{'id': f'{tid}.01', 'title': 'TERRAIN LAYOUTS',
                 'html': '<p>9 ready-made layouts (3 per map) built from common tournament footprint sizes: 2 Large Ruins, the left/right Large Wedge pair, '
                         '2 Medium Ruins, 2 Long Walls and 4 Short Walls. Ruins, Wedges and Long Walls are <b>Dense</b> (block line of sight); Short Walls are <b>Light</b> (cover).</p>'
                         '<p><a href="terrain.html">Open the Terrain page</a> for each layout\'s map, setup table and checks.</p>'}]})
    types = [n for _, n in MAPS]
    gdm = {'factions': types, 'matrix': [[n] * len(types) for n in types], 'primaryMissions': types, 'secondaryMissions': cards, 'rules': cats}
    head = ('/* Missions and core rules for the game tracker and the Rules / Missions pages.\n'
            '   GENERATED by scripts/build_rules_data.py from gametheory/CORE_RULES_MANUAL_4192.md and MISSIONS_AND_TACTICAL_DECK.md: edit those, then re-run.\n'
            '   Mission types = the 3 deployment maps (both players pick the same one); secondaries = the 12 Tactical cards. */\n')
    open(os.path.join(SITE, 'gdm_data.js'), 'w', encoding='utf-8').write(head + 'window.GDM_DATA = ' + json.dumps(gdm, ensure_ascii=False, indent=1) + ';\n')
    open(os.path.join(SITE, 'mission_text.js'), 'w', encoding='utf-8').write(
        '/* GENERATED by scripts/build_rules_data.py: primary = the 3 maps (hold objectives), secondary = the 12 Tactical cards. */\n'
        'window.MISSION_TEXT = ' + json.dumps({'primary': primary, 'secondary': secondary}, ensure_ascii=False, indent=1) + ';\n')
    tactics, gloss = core_tactics(text), glossary(text)
    json.dump(tactics, open(os.path.join(SITE, 'data', 'core_stratagems.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    json.dump(gloss, open(os.path.join(SITE, 'data', 'glossary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'[✓] rules: {len(cats)} categories, {sum(len(c["rules"]) for c in cats)} rules · {len(types)} maps · {len(cards)} Tactical cards · '
          f'{len(tactics)} Core Tactics · {len(gloss)} keywords')


if __name__ == '__main__':
    build()
