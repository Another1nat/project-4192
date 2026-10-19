#!/usr/bin/env python3
"""Give the app your game's name (run once, from the website folder):
       python3 scripts/rename_game.py "Ashes of Kharon"
       python3 scripts/rename_game.py "Ashes of Kharon" ashes-of-kharon     # optional: the short id used for file names / deploy
   Replaces the placeholder "Your Game" (also YOUR GAME / your-game) in every text file. The logo shows the
   first word in white and the rest in the faction colour."""
import os, re, sys, html as H
if len(sys.argv) < 2: sys.exit(__doc__)
name = sys.argv[1].strip()
slug = sys.argv[2] if len(sys.argv) > 2 else re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
first, _, rest = name.partition(' ')
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def esc(s): return H.escape(s, quote=False)
changed = 0
for dp, dn, fn in os.walk(root):
    dn[:] = [d for d in dn if d not in ('node_modules', '.git', '.wrangler')]
    for f in fn:
        if not f.endswith(('.js', '.html', '.css', '.json', '.sql', '.md', '.jsonc', '.txt')): continue
        p = os.path.join(dp, f); s = o = open(p, encoding='utf-8').read()
        # the logo: "Your" + coloured "Game"
        s = s.replace('<span>Your<span style="color:var(--accent);">Game</span>', f'<span>{esc(first)}<span style="color:var(--accent);">{esc(rest)}</span>')
        s = s.replace('Your <span>Game</span>', f'{esc(first)} <span>{esc(rest)}</span>').replace('Your <b>Game</b>', f'{esc(first)} <b>{esc(rest)}</b>')
        s = s.replace("'YOUR GAME': 'Your Game'", f"'{name.upper()}': '{name}'")
        s = s.replace('Your Game', name).replace('YOUR GAME', name.upper()).replace('your-game', slug)
        if s != o: open(p, 'w', encoding='utf-8').write(s); changed += 1
print(f'{changed} files now say "{name}" (id: {slug}). Replace the icons in assets/icons/ with your logo.')
