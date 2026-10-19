/* UI polish (no logic): sentence-case buttons/headings, non-blocking toasts instead of alert(), mobile bottom tab bar. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;

    // ───── casing: ALL-CAPS labels → readable case ─────
    const KEEP = new Set(['PDF', 'CSV', 'JSON', 'PNG', 'ICS', 'VP', 'PTS', 'DP', 'OC', 'FNP', 'UI', 'OR', 'VS', 'BYE', 'PRI', 'SEC', 'BS', 'WS', 'AP', 'MFM', 'WTC', 'AI', 'IOS', 'NO', 'II', 'III', 'IV']);
    const BRAND = { WHATSAPP: 'WhatsApp', 'PROJECT 4192': 'Project 4192', ICS: '.ics' };
    const SMALL = new Set(['of', 'the', 'and', 'to', 'in', 'on', 'a', 'an', 'vs', 'for', 'or', 'de', 'la', 'el', 'y', 'en', 'del', 'los', 'las', 'con']);
    const isCaps = s => /[A-ZÁÉÍÓÚÑÜ]{3,}/.test(s) && !/[a-záéíóúñü]/.test(s);
    function convertWord(w, first, title) {
        const core = w.replace(/^[^A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]+|[^A-Za-zÁÉÍÓÚÑÜáéíóúñü0-9]+$/g, ''); if (!core) return w;
        if (/\d/.test(core)) return w;                                          // R1, 5+, 2VP …
        if (BRAND[core]) return w.replace(core, BRAND[core]);
        if (KEEP.has(core) && core !== 'NO') return w;
        const lower = core.toLowerCase(), small = title && !first && SMALL.has(lower);
        const out = (first || (title && !small)) ? lower.charAt(0).toUpperCase() + lower.slice(1) : lower;
        return w.replace(core, out);
    }
    function recase(text, title) {
        let first = true;
        return text.split(/(\s+)/).map(tok => { if (/^\s+$/.test(tok) || !tok) return tok; const hasLetter = /[A-Za-zÁÉÍÓÚÑÜáéíóúñü]/.test(tok); const r = convertWord(tok, first, title); if (hasLetter) first = false; return r; }).join('');
    }
    const skip = el => el.closest('[data-keepcaps], .logo, #tabbar, .toast, script, style, textarea, input');
    function polish(rootEl) {
        const els = (rootEl || document.body).querySelectorAll('button, summary, h1, h2, h3, h4, .back-btn');
        els.forEach(el => {
            if (skip(el)) return; const title = /^H[1-4]$/.test(el.tagName);
            const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null); let n;
            while ((n = w.nextNode())) {
                const v = n.nodeValue; if (!v.trim() || !isCaps(v)) continue;
                if (v.trim().split(/\s+/).length === 1 && v.trim().length <= 4) continue;   // single short tokens (acronyms) stay
                const r = recase(v, title); if (r !== v) n.nodeValue = r;
            }
        });
    }
    window.UIPOLISH = { sentence: s => recase(String(s).toLowerCase() === String(s) ? s : s, false), recase, polish };
    let t = null; const schedule = () => { clearTimeout(t); t = setTimeout(() => { obs.disconnect(); try { polish(document.body); classify(document.body); emptyStates(document.body); } finally { obs.observe(document.body, { childList: true, subtree: true, characterData: true }); } }, 90); };
    const obs = new MutationObserver(schedule);

    // ───── toasts instead of blocking alert() (reload-flows keep the native one) ─────
    const nativeAlert = window.alert.bind(window);
    function toast(msg, opt) {
        let box = document.getElementById('toasts'); if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
        box.querySelectorAll('div').forEach(x => x.remove());   // one toast at a time, no pile-up
        const el = document.createElement('div'); const m = String(msg == null ? '' : msg);
        el.className = 'toast ' + (/^(could not|⚠|error|invalid|no se pudo)|failed|not found/i.test(m) ? 'err' : /✔|✓|sent|saved|copied|ready|done|listo|enviado|guardad|copiad/i.test(m) ? 'ok' : '');
        el.textContent = m;
        if (opt && opt.action) { const b = document.createElement('button'); b.className = 'act'; b.textContent = opt.action; b.onclick = () => { try { opt.onAction && opt.onAction(); } finally { el.remove(); } }; el.appendChild(b); }
        box.appendChild(el); setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, opt && opt.action ? 6500 : Math.min(7000, 2600 + m.length * 35));
    }
    window.alert = function (msg) { const m = String(msg == null ? '' : msg); if (/reload|recargar/i.test(m)) return nativeAlert(m); toast(m); };
    window.toast = toast;

    // ───── bottom tab bar (phones) ─────
    const TABS = [['home', 'fa-house', ['Home', 'Inicio']], ['datasheets', 'fa-book-open', ['Datasheets', 'Datasheets']], ['tracker', 'fa-chess-board', ['Game', 'Partida']], ['menu', 'fa-bars', ['Menu', 'Menú']]];
    const GROUP = { home: 'home', 'new-roster': 'home', rosters: 'home', detachments: 'home', datasheets: 'datasheets', 'datasheet-index': 'datasheets', tracker: 'tracker', 'active-game': 'tracker' };
    function buildTabs() {
        if (document.getElementById('tabbar')) return; const nav = document.createElement('nav'); nav.id = 'tabbar'; nav.setAttribute('aria-label', 'Main');
        nav.innerHTML = TABS.map(([k, ic, l]) => `<button data-tab="${k}" aria-label="${l[0]}"><i class="fa-solid ${ic}"></i><span>${l[lang() === 'es' ? 1 : 0]}</span></button>`).join('');
        nav.onclick = e => { const b = e.target.closest('button'); if (!b) return; const k = b.dataset.tab; if (k === 'menu') toggleMenu(); else if (k === 'datasheets') openDatasheetIndex(); else switchView(k); };
        document.body.appendChild(nav); mark();
    }
    function currentView() {
        const act = document.querySelector('.view.active'); const ag = document.getElementById('view-active-game');
        if (ag && getComputedStyle(ag).display !== 'none') return 'active-game';
        return act ? act.id.replace('view-', '') : 'home';
    }
    function mark() { const g = GROUP[currentView()]; document.querySelectorAll('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === g)); }
    // theme colour = faction of your latest roster; no rosters yet → a random faction colour per visit
    const GREYS = ['Deathwatch', 'Agents of the Imperium', 'Grey Knights', 'Black Templars'];
    function themeFaction() {
        const F = (typeof FACTIONS !== 'undefined' ? FACTIONS : []); let rs = []; try { rs = JSON.parse(localStorage.getItem('game_rosters') || '[]'); } catch (e) {}
        const names = rs.map(r => r.faction && r.faction.name).filter(Boolean); let n = null;
        try { n = localStorage.getItem('bl_last_faction'); } catch (e) {}
        if (!rs.length) n = null; else if (!n || !names.includes(n)) n = names[names.length - 1];
        let f = n && F.find(x => x.name === n);
        if (!f && F.length) { let rn = null; try { rn = sessionStorage.getItem('bl_rand_faction'); } catch (e) {} const pool = F.filter(x => !GREYS.includes(x.name)); f = F.find(x => x.name === rn) || pool[Math.floor(Math.random() * pool.length)]; try { sessionStorage.setItem('bl_rand_faction', f.name); } catch (e) {} }
        return f;
    }
    window.applyThemeAccent = function () { const f = themeFaction(); if (f && typeof applyAccent === 'function') applyAccent(f.color); };
    const FACTION_VIEWS = ['datasheets', 'rosters', 'detachments', 'new-roster'];
    const base = window.switchView; window.switchView = function (v, p) { base(v, p); if (!FACTION_VIEWS.includes(v)) applyThemeAccent(); setTimeout(mark, 60); };
    document.addEventListener('focusin', e => { if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && !/checkbox|radio|button/.test(e.target.type || '')) document.body.classList.add('kbd'); });
    document.addEventListener('focusout', () => document.body.classList.remove('kbd'));

    // ───── design-system classes (presentation only): tag legacy inline-styled elements ─────
    const SKIP_BTN = 'button[id^="btn-p"], #ts-p1-fd button, #ts-p2-fd button, #tabbar, .home-tile, .auth-pill, .menu-toggle, .install-pill, .toast, #splash, .mobile-sidebar-toggle, #roster-pool-container button, .unit-card button, .roster-fab-btn, #rbs-add';
    const NEUTRAL_BG = /background:\s*(#2a3546|#232d3b|#1e252f|#2f3a4d|#161d27|#232d3b)/i;
    function classify(rootEl) {
        (rootEl || document.body).querySelectorAll('button[style], div[style], input[style], select[style], textarea[style]').forEach(el => {
            if (el.dataset.bl) return; const st = el.getAttribute('style') || ''; el.dataset.bl = '1';
            if (el.tagName === 'BUTTON') {
                if (el.closest(SKIP_BTN)) return;
                if (/background:\s*var\(--accent\)/i.test(st)) el.classList.add('bl-primary');
                else if (/dashed/i.test(st)) el.classList.add('bl-dashed');
                else if (NEUTRAL_BG.test(st)) el.classList.add('bl-secondary');
            } else if (el.tagName === 'DIV') {
                if (/border:\s*1px solid (#2a3546|#1a222d|#3a4556)/i.test(st) && /border-radius:\s*(1[0-9]|2[0-9])px/i.test(st) && /background:\s*(#161d27|#121b2e|#11161d|#10151c|#0f1a30|#16213a)/i.test(st)) el.classList.add(/padding:\s*(1[2-9]|2[0-9])px/.test(st) ? 'bl-card' : 'bl-inner');
            } else if (/border:\s*1px solid #3a4556/i.test(st) && /border-radius/.test(st)) el.classList.add('bl-input');
        });
    }
    // ───── "saved" pill ─────
    let pillT = null, pillOk = false; setTimeout(() => pillOk = true, 2500);
    function savedPill() {
        if (!pillOk) return; let p = document.getElementById('saved-pill');
        if (!p) { p = document.createElement('div'); p.id = 'saved-pill'; p.innerHTML = '<i class="fa-solid fa-check"></i><span></span>'; document.body.appendChild(p); }
        p.lastChild.textContent = S('Saved', 'Guardado'); p.classList.add('show'); clearTimeout(pillT); pillT = setTimeout(() => p.classList.remove('show'), 1400);
    }
    document.addEventListener('bl:saved', savedPill);
    if (typeof window.saveRosters === 'function') { const orig = window.saveRosters; window.saveRosters = function () { const r = orig.apply(this, arguments); document.dispatchEvent(new Event('bl:saved')); return r; }; }
    // ───── illustrated empty states ─────
    const ART = {
        swords: '<svg viewBox="0 0 64 64" fill="none" stroke="#6b7a96" stroke-width="2.4" stroke-linecap="round"><path d="M12 12l26 26M52 12L26 38"/><path d="M8 20l8-8M56 20l-8-8M22 42l-8 8M42 42l8 8"/><circle cx="32" cy="32" r="3" fill="#ff7a3d" stroke="none"/></svg>',
        trophy: '<svg viewBox="0 0 64 64" fill="none" stroke="#6b7a96" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10h24v14a12 12 0 0 1-24 0z"/><path d="M20 14h-8c0 8 4 12 9 13M44 14h8c0 8-4 12-9 13M32 36v10M22 54h20M26 46h12"/><circle cx="32" cy="22" r="3" fill="#e5c15a" stroke="none"/></svg>',
        cal: '<svg viewBox="0 0 64 64" fill="none" stroke="#6b7a96" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="10" y="14" width="44" height="40" rx="6"/><path d="M10 26h44M22 8v10M42 8v10"/><circle cx="32" cy="40" r="3" fill="#3d8bff" stroke="none"/></svg>'
    };
    const EMPTY = { 'No units added yet.': 'swords', 'No games in progress.': 'swords', 'No finished games yet.': 'trophy', 'No tournaments yet.': 'trophy', 'Nothing scheduled yet.': 'cal', 'No rosters on this device yet.': 'swords', 'Nobody yet.': 'swords', 'No active secondaries': 'swords' };
    function emptyStates(rootEl) {
        (rootEl || document.body).querySelectorAll('div').forEach(el => {
            if (el.children.length || el.dataset.empty) return; const t = el.textContent.trim(); const k = EMPTY[t]; if (!k) return;
            el.dataset.empty = '1'; el.className += ' empty-art'; el.innerHTML = ART[k] + '<span>' + t + '</span>'; el.style.border = 'none';
        });
    }
    // ───── splash on launch (installed app / first visit of the session) ─────
    try {
        const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
        if ((standalone || !sessionStorage.getItem('bl_splash')) && !window.__noSplash) {
            sessionStorage.setItem('bl_splash', '1'); const sp = document.createElement('div'); sp.id = 'splash'; sp.style.pointerEvents = 'none';
            sp.innerHTML = '<img src="assets/icons/logo-mark-192.png" alt=""><div class="w">Project <b>4192</b></div>'; document.body.appendChild(sp);
            setTimeout(() => { sp.style.opacity = '0'; setTimeout(() => sp.remove(), 480); }, 650);
        }
    } catch (e) {}
    window.UIPOLISH.classify = classify; window.UIPOLISH.empty = emptyStates;

    // click on the dark backdrop (outside the card) closes picker / card viewers; Escape closes them too
    const BACKDROPS = ['modal-card-viewer', 'modal-primary-card', 'tracker-modal-cards', 'img-modal-deployment', 'modal-faction', 'modal-detachment', 'detachment-modal'];
    document.addEventListener('click', e => { if (BACKDROPS.includes(e.target.id)) e.target.style.display = 'none'; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') BACKDROPS.forEach(id => { const el = document.getElementById(id); if (el && getComputedStyle(el).display !== 'none') el.style.display = 'none'; }); });
    document.addEventListener('DOMContentLoaded', () => { buildTabs(); polish(document.body); classify(document.body); emptyStates(document.body); obs.observe(document.body, { childList: true, subtree: true, characterData: true }); setInterval(mark, 1500); });
})();

/* Presentation-only: round dots under the round counter + score bump animation (no state touched) */
(function () {
    function dots() {
        const r = document.getElementById('ag-round-display'); if (!r) return; const cur = parseInt(r.textContent, 10) || 1;
        const box = r.parentElement; let d = box.parentElement.querySelector('.rdots');
        if (!d) { d = document.createElement('div'); d.className = 'rdots'; d.innerHTML = '<i></i><i></i><i></i><i></i><i></i>'; box.insertAdjacentElement('afterend', d); }
        d.querySelectorAll('i').forEach((i, k) => i.className = k + 1 < cur ? 'done' : k + 1 === cur ? 'now' : '');
    }
    const last = new WeakMap();
    function bump() {
        document.querySelectorAll('#view-active-game div').forEach(el => {
            if (el.children.length || !/^\d{1,3}$/.test(el.textContent.trim())) return; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 26) return;
            const t = el.textContent; if (last.has(el) && last.get(el) !== t) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} } last.set(el, t);
        });
    }
    new MutationObserver(() => { dots(); bump(); }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
/* theme colour on launch + whenever rosters change on a non-faction screen */
(function () {
    const run = () => { try { window.applyThemeAccent(); } catch (e) {} };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
    setTimeout(run, 600);
    document.addEventListener('bl:saved', () => { const v = document.querySelector('.view.active'); if (!v || !/rosters|datasheets|detachments|new-roster/.test(v.id)) run(); });
})();


/* language switch in the burger menu (reloads so every screen re-renders in that language) */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    function add() {
        const m = document.getElementById('dropdown-menu'); if (!m || m.querySelector('.menu-lang')) return;
        const d = document.createElement('div'); d.className = 'menu-lang';
        d.innerHTML = `<span>${lang() === 'es' ? 'Idioma' : 'Language'}</span><div class="ms-seg"><button type="button" data-l="en">English</button><button type="button" data-l="es">Español</button></div>`;
        d.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.l === lang()); b.onclick = e => { e.stopPropagation(); if (b.dataset.l === lang()) return; try { localStorage.setItem('gdm_lang', b.dataset.l); } catch (x) {} location.reload(); }; });
        m.prepend(d);
        if (lang() === 'es' && window.I18N) { const go = () => { I18N.apply(m); const nav = document.querySelector('.desktop-nav-links'); if (nav) I18N.apply(nav); const ap = document.getElementById('auth-pills'); if (ap) I18N.apply(ap); }; go(); setTimeout(go, 1200); }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(add, 200)); else setTimeout(add, 200);
})();
