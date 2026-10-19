/* Game tracker: full-screen terrain layout window with two tabs, "2D map" (the flat map, instant) and "3D & AR" (the phone's own AR viewer).
   Opened by the Map button in the live game header, Settings, and tapping the layout in setup step 4.
   The phone's back button / back swipe closes the window instead of leaving the game.
   The 3D viewer itself (model-viewer + the layout models) is loaded only when the 3D tab is first opened — see ar_viewer.js. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    function loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src.includes(src))) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }

    // the game's layout; without one (setup step 4 skipped) the layout A of the two players' Force Dispositions
    function gameLayout() {
        const ts = window.trackerState; if (!ts) return { code: '', guessed: false };
        if (ts.terrainLayoutId) return { code: ts.terrainLayoutId, guessed: false };
        if (typeof window.getFDSlug === 'function' && typeof window.getMatchupKey === 'function' && ts.p1 && ts.p2)
            return { code: getMatchupKey(getFDSlug(ts.p1.forceDisp), getFDSlug(ts.p2.forceDisp)) + '-A', guessed: true };
        return { code: '', guessed: false };
    }

    let pushedState = false, prevPop = null;
    function restorePop() { if (prevPop !== null) { window.onpopstate = prevPop; prevPop = null; } }
    function removeModal() {
        const m = document.getElementById('modal-3d-layout-viewer');
        if (m) { try { window.ARVIEW && ARVIEW.dispose(m); } catch (e) {} m.remove(); }
        document.body.style.overflow = ''; document.documentElement.style.overflow = '';
    }
    // closing by the ✕ goes back one step in the history (the step this window added), so the back button and the ✕ agree
    window.close3DLayoutModal = function () {
        removeModal();
        if (pushedState && history.state && history.state.m3d) { pushedState = false; history.back(); return; }   // the popstate below restores the handler
        pushedState = false; restorePop();
    };
    window.open3DLayoutModal = async function (layoutId, tab) {
        const g = layoutId ? { code: layoutId, guessed: false } : gameLayout(), code = g.code;
        if (!code) { if (window.toast) toast(S('Pick a terrain layout first (setup step 4).', 'Elige primero una disposición de terreno (paso 4 de la configuración).')); return; }
        removeModal();
        const m = document.createElement('div'); m.id = 'modal-3d-layout-viewer';
        m.style.cssText = 'position:fixed; inset:0; z-index:100001; background:#070a10; display:flex; flex-direction:column; padding:max(10px, env(safe-area-inset-top)) 10px max(10px, env(safe-area-inset-bottom));';
        m.innerHTML = `<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                <div style="flex:1; min-width:0;"><div id="m3d-title" style="color:#4ade80; font-weight:800; font-size:.95rem; text-transform:uppercase; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.25;">${esc(code)}</div>
                ${g.guessed ? `<div style="color:#8c99b0; font-size:.74rem; margin-top:2px;">${esc(S('From the players’ Force Dispositions (no layout picked in setup)', 'Según las Disposiciones de Fuerza (no se eligió disposición)'))}</div>` : ''}</div>
                <button type="button" id="m3d-close" aria-label="${esc(S('Close', 'Cerrar'))}" style="min-width:48px; min-height:48px; border:none; border-radius:12px; background:#dc2626; color:#fff; font-size:1.3rem; cursor:pointer;">✕</button></div>
            <div id="m3d-body" style="flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch;"></div>`;
        document.body.appendChild(m); document.body.style.overflow = 'hidden';
        document.getElementById('m3d-close').onclick = () => window.close3DLayoutModal();
        // one history step for this window: back closes it (app.js handles every other back)
        if (!pushedState) {
            try { history.pushState(Object.assign({}, history.state || {}, { m3d: 1 }), '', location.href); pushedState = true; } catch (e) {}
            if (pushedState) { prevPop = window.onpopstate; window.onpopstate = () => { pushedState = false; restorePop(); removeModal(); }; }
        }
        try {
            await loadScript('ar_viewer.js?v=14');
            const r = await ARVIEW.browse(document.getElementById('m3d-body'), code, { height: '62vh', tab,
                onShow: (t, res) => { const el = document.getElementById('m3d-title'); if (el && res && res.layout) el.textContent = res.layout.title; } });
            if (r && r.layout) document.getElementById('m3d-title').textContent = r.layout.title;
        } catch (e) {
            const b = document.getElementById('m3d-body'); if (b) b.innerHTML = `<div style="color:#9aa7b8; padding:20px;">${esc(S('The layout viewer could not load. Check your connection and try again.', 'No se pudo cargar el visor. Revisa tu conexión e inténtalo de nuevo.'))}</div>`;
        }
    };
    window.openLayoutMap = () => window.open3DLayoutModal('', '2d');
    window.previewTerrainLayout = function () { window.open3DLayoutModal((window.trackerState && window.trackerState.terrainLayoutId) || '', '2d'); };
})();
