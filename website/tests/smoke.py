"""Browser smoke tests for the Project 4192 site (Playwright, Chromium). Run from the repo root:
       python3 tests/smoke.py            # all tests
       python3 tests/smoke.py calc       # only tests whose name contains "calc"
   Exit code 1 if anything fails, so CI can block a bad change. It starts its own static server."""
import json, subprocess, sys, time, socket, os, contextlib
from playwright.sync_api import sync_playwright

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
def free_port():
    with contextlib.closing(socket.socket()) as s: s.bind(('127.0.0.1', 0)); return s.getsockname()[1]
PORT = free_port(); BASE = f'http://127.0.0.1:{PORT}/'
server = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.0)
TESTS = []
def test(fn): TESTS.append(fn); return fn

def new_page(b, w=390):
    ctx = b.new_context(viewport={'width': w, 'height': 844}, is_mobile=w < 700, has_touch=w < 700)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)[:200]))
    pg.on('console', lambda m: errs.append('console: ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.on('dialog', lambda d: d.accept())
    pg.goto(BASE); pg.wait_for_timeout(1800)
    return pg, errs

@test
def app_loads_without_errors_and_never_points_at_warpedia(b):
    pg, errs = new_page(b)
    for v in ['home', 'rosters', 'datasheets', 'tracker', 'calc', 'rules', 'about']:
        assert pg.evaluate(f"!!document.getElementById('view-{v}')"), f'missing view {v}'
    assert pg.evaluate("window.LEAGUE_CONFIG === null"), 'backend must stay unset until you add your own Supabase project'
    assert 'warpedia' not in pg.content().lower(), 'Warpedia branding left in the page'
    assert pg.evaluate("FACTIONS.length") >= 1
    assert not errs, errs

@test
def every_screen_opens_without_errors(b):
    pg, errs = new_page(b)
    for v in ['home', 'datasheet-index', 'rules', 'primary-missions', 'secondary-missions', 'calc', 'about', 'tracker', 'patch-notes']:
        pg.evaluate(f"switchView('{v}')"); pg.wait_for_timeout(500)
    assert not errs, errs

@test
def example_faction_datasheets_load(b):
    pg, errs = new_page(b)
    pg.evaluate("openFactionDatasheets(FACTIONS[0])"); pg.wait_for_timeout(1500)
    names = pg.evaluate("STATE.currentFactionData.map(u => u.name)")
    assert 'Example Squad' in names and 'Example Commander' in names, names
    assert pg.evaluate("STATE.currentFactionDetachments.length") == 1
    pg.evaluate("selectUnit(Object.keys(STATE.unitDict)[0])"); pg.wait_for_timeout(400)
    pg.evaluate("showFactionOverview()"); pg.wait_for_timeout(300)
    assert 'faction rule' in pg.inner_text('#datasheet-detail-container').lower()
    assert not errs, errs

@test
def roster_build_with_points_and_leader(b):
    pg, errs = new_page(b)
    r = pg.evaluate("""async () => { createRoster(FACTIONS[0]); await new Promise(r => setTimeout(r, 1500));
        for (const n of ['Example Commander', 'Example Squad']) addUnitToActiveRoster(STATE.currentFactionData.find(u => u.name === n).id, {});
        renderRosterBuilder(); await new Promise(r => setTimeout(r, 300));
        return { units: currentActiveRoster.units.map(u => [u.name, u.pts]), pts: document.getElementById('rb-current-pts').textContent } }""")
    assert r['units'] == [['Example Commander', 70], ['Example Squad', 60]] and r['pts'].strip() == '130', r
    assert not errs, errs

@test
def game_tracker_starts_a_game(b):
    pg, errs = new_page(b)
    pg.evaluate("""() => { localStorage.removeItem('gdm_games'); trackerState.p1.name = 'ALPHA'; trackerState.p2.name = 'BETA'; trackerState.firstTurn = 1; trackerState.terrainLayoutId = null; startGameTracker(); renderGame(); }""")
    pg.wait_for_timeout(500)
    assert 'ALPHA' in pg.inner_text('body') and 'BETA' in pg.inner_text('body')
    pg.evaluate("changeGameRound(1)")
    assert not errs, errs

@test
def streaming_and_spectator_pages_work_without_a_backend(b):
    pg, errs = new_page(b)
    pg.evaluate("""() => { localStorage.removeItem('gdm_games'); trackerState.p1.name = 'ALPHA'; trackerState.p2.name = 'BETA'; trackerState.firstTurn = 1; startGameTracker(); renderGame(); }""")
    pg.wait_for_timeout(400)
    pg.evaluate("openShare()"); pg.wait_for_timeout(500)
    assert pg.evaluate("typeof BROADCAST === 'object' && typeof BROADCAST.openStudioModal === 'function'")
    pg.evaluate("BROADCAST.openStudioModal()"); pg.wait_for_timeout(500)
    assert pg.evaluate("typeof LSYNC === 'object'")
    assert not errs, errs
    for page in ['watch.html?room=TEST', 'overlay.html?room=TEST', 'ar.html']:
        p2 = pg.context.new_page(); e2 = []
        p2.on('pageerror', lambda e: e2.append(str(e)[:200]))
        p2.goto(BASE + page); p2.wait_for_timeout(1500)
        assert 'warpedia' not in p2.content().lower(), page
        assert not e2, (page, e2)

def main():
    pick = sys.argv[1].lower() if len(sys.argv) > 1 else ''
    todo = [t for t in TESTS if pick in t.__name__]
    failed = 0
    with sync_playwright() as p:
        b = p.chromium.launch()
        for t in todo:
            t0 = time.time()
            try: t(b); print(f'PASS  {t.__name__}  ({time.time()-t0:.1f}s)')
            except Exception as e: failed += 1; print(f'FAIL  {t.__name__}: {str(e)[:400]}')
        b.close()
    server.terminate()
    print(f'\n{len(todo)-failed}/{len(todo)} passed'); sys.exit(1 if failed else 0)
if __name__ == '__main__': main()
