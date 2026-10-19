/* Roster builder UX layer — presentation + feedback only. Calls existing functions, never changes roster logic. */
(function () {
    const $ = id => document.getElementById(id);
    const S = (en, es) => (window.I18N && I18N.lang && I18N.lang() === 'es') ? es : en;
    const ROLE = {
        'EPIC HERO': ['crown', '#e5c15a'], 'CHARACTER': ['user-shield', '#ff7a3d'], 'BATTLELINE': ['users', '#4cc38a'],
        'DEDICATED TRANSPORT': ['truck-moving', '#9aa7b8'], 'FORTIFICATION': ['chess-rook', '#9aa7b8'], 'MONSTER': ['paw', '#c779ff'],
        'VEHICLE': ['gears', '#3d8bff'], 'INFANTRY': ['person-rifle', '#3d8bff'], 'MOUNTED': ['horse', '#3d8bff'], 'BEAST': ['paw', '#c779ff'],
        'SWARM': ['bugs', '#c779ff'], 'WALKER': ['gears', '#3d8bff'], 'AIRCRAFT': ['jet-fighter', '#3d8bff'], 'TITANIC': ['skull', '#ff5e5e']
    };
    const roleStyle = r => ROLE[String(r || '').toUpperCase()] || ['crosshairs', '#6f86ad'];
    let lastCount = -1;
    const CAR = () => (typeof currentActiveRoster !== 'undefined' ? currentActiveRoster : null);

    // ── sticky points bar (appears once the main points panel scrolls out of view) ──
    function ensureBar() {
        let b = $('rb-sticky'); if (b) return b;
        b = document.createElement('div'); b.id = 'rb-sticky';
        b.innerHTML = '<div class="rbs-main"><div class="rbs-num"><b id="rbs-cur">0</b><span id="rbs-lim">/ 1000</span></div><div class="rbs-track"><i id="rbs-fill"></i></div><div class="rbs-left" id="rbs-left"></div></div><button id="rbs-add" aria-label="Add units"><i class="fa-solid fa-plus"></i></button>';
        document.body.appendChild(b);
        $('rbs-add').onclick = () => { const s = $('roster-pool-sidebar'); if (s) s.classList.add('open'); };
        return b;
    }
    function updateBar() {
        const b = ensureBar(), r = CAR(); const view = $('view-rosters');
        const cur = parseInt(($('rb-current-pts') || {}).textContent, 10) || 0; const lim = r ? (r.pointsLimit || 1000) : 2000;
        const pct = Math.min(100, Math.round(cur / lim * 100)), left = lim - cur;
        $('rbs-cur').textContent = cur; $('rbs-lim').textContent = '/ ' + lim;
        $('rbs-fill').style.width = pct + '%';
        $('rbs-left').textContent = left >= 0 ? left + ' ' + S('left', 'libres') : Math.abs(left) + ' ' + S('over', 'de más');
        b.dataset.state = left < 0 ? 'over' : (pct >= 90 ? 'near' : 'ok');
        const panel = $('rb-current-pts'); let hidden = false;
        if (panel && panel.offsetParent && view && view.classList.contains('active')) { const rc = panel.getBoundingClientRect(); hidden = rc.bottom < 110; }
        b.classList.toggle('show', !!(view && view.classList.contains('active') && hidden));
    }
    window.addEventListener('scroll', updateBar, { passive: true });
    document.addEventListener('scroll', updateBar, { passive: true, capture: true });

    // ── decorate unit cards: role icon + colour, press / open states ──
    function decorate() {
        const r = CAR(); if (!r) return;
        const cards = document.querySelectorAll('#roster-list-container .roster-unit-card');
        cards.forEach((card, i) => {
            const u = r.units[i]; if (!u) return;
            if (!card.parentElement.classList.contains('sw-wrap')) { const w = document.createElement('div'); w.className = 'sw-wrap'; w.innerHTML = '<div class="sw-bg"><i class="fa-solid fa-trash"></i><span>' + S('Delete', 'Eliminar') + '</span></div>'; card.parentElement.insertBefore(w, card); w.appendChild(card); } const [ico, col] = roleStyle(u.role);
            card.style.setProperty('--rc', col); card.dataset.i = i;
            const h = card.querySelector('h4');
            if (h && !h.querySelector('.ru-ico')) { const s = document.createElement('span'); s.className = 'ru-ico'; s.innerHTML = '<i class="fa-solid fa-' + ico + '"></i>'; h.insertBefore(s, h.firstChild); }
        });
        if (lastCount >= 0 && cards.length > lastCount && cards.length) {                           // a unit was just added → flash + scroll hint
            const c = cards[cards.length - 1]; c.classList.add('ru-new'); setTimeout(() => c.classList.remove('ru-new'), 1400);
        }
        lastCount = cards.length;
        updateBar();
    }
    document.addEventListener('click', e => {
        const head = e.target.closest && e.target.closest('.roster-unit-card > div');
        if (head && !e.target.closest('button, select')) { const card = head.parentElement; setTimeout(() => { const d = card.querySelector('[id^="ru-details-"]'); card.classList.toggle('open', !!(d && d.style.display !== 'none')); }, 0); }
    }, true);

    // ── swipe left to delete (mobile) ──
    (function () {
        let sx = 0, sy = 0, dx = 0, card = null, lock = null, moved = false;
        const box = () => $('roster-list-container');
        document.addEventListener('touchstart', e => {
            const c = e.target.closest && e.target.closest('#roster-list-container .roster-unit-card'); if (!c || e.target.closest('button, select, input, a')) { card = null; return; }
            card = c; sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; lock = null; moved = false; c.style.transition = 'none';
        }, { passive: true });
        document.addEventListener('touchmove', e => {
            if (!card) return; const x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
            if (lock === null && (Math.abs(x) > 8 || Math.abs(y) > 8)) lock = Math.abs(x) > Math.abs(y) * 1.4 ? 'h' : 'v';
            if (lock !== 'h') return; e.preventDefault(); moved = true; dx = Math.min(0, Math.max(-160, x));
            card.style.transform = 'translateX(' + dx + 'px)'; const w = card.parentElement; w.style.setProperty('--sw', Math.min(1, -dx / 100)); w.classList.toggle('armed', dx < -100);
        }, { passive: false });
        document.addEventListener('touchend', () => {
            if (!card) return; const c = card; card = null; const w = c.parentElement; c.style.transition = 'transform .22s ease';
            if (moved && dx < -100) { c.style.transform = 'translateX(-110%)'; try { navigator.vibrate && navigator.vibrate(15); } catch (e) {} const i = +c.dataset.i; setTimeout(() => { if (typeof removeUnitAt === 'function') removeUnitAt(i); }, 180); }
            else { c.style.transform = ''; w.style.setProperty('--sw', 0); w.classList.remove('armed'); }
            if (moved) { c.dataset.noclick = '1'; setTimeout(() => delete c.dataset.noclick, 300); }
        });
        document.addEventListener('click', e => { const c = e.target.closest && e.target.closest('.roster-unit-card'); if (c && c.dataset.noclick) { e.stopPropagation(); e.preventDefault(); } }, true);
    })();

    // ── delete with Undo ──
    function wrap() {
        if (typeof window.removeUnitAt === 'function' && !window.removeUnitAt.__w) {
            const orig = window.removeUnitAt;
            window.removeUnitAt = function (i) {
                const r = CAR(), u = r && r.units[i]; const ds = u && r.ds ? r.ds[u.id] : null;
                const card = document.querySelector('#roster-list-container .roster-unit-card[data-i="' + i + '"]');
                const go = () => {
                    orig.call(this, i); lastCount = -1;
                    if (u && window.toast) toast(u.name + ' ' + S('removed', 'eliminada'), { action: S('Undo', 'Deshacer'), onAction: () => {
                        if (!r.units) return; r.units.splice(Math.min(i, r.units.length), 0, u); if (ds) { r.ds = r.ds || {}; r.ds[u.id] = ds; }
                        if (typeof saveRosters === 'function') saveRosters(); if (typeof renderRosterBuilder === 'function') renderRosterBuilder();
                    } });
                };
                if (card) { card.classList.add('ru-out'); setTimeout(go, 180); } else go();
            };
            window.removeUnitAt.__w = 1;
        }
        if (typeof window.addUnitToActiveRoster === 'function' && !window.addUnitToActiveRoster.__w) {
            const orig = window.addUnitToActiveRoster;
            window.addUnitToActiveRoster = function (id) {
                const btn = document.activeElement && document.activeElement.tagName === 'BUTTON' ? document.activeElement : null;
                const before = CAR() ? CAR().units.length : 0;
                const out = orig.apply(this, arguments);
                if (CAR() && CAR().units.length > before) {
                    try { navigator.vibrate && navigator.vibrate(10); } catch (e) {}
                    if (btn) { btn.classList.add('ru-added'); setTimeout(() => btn.classList.remove('ru-added'), 700); }
                }
                setTimeout(poolBadges, 30); return out;
            };
            window.addUnitToActiveRoster.__w = 1;
        }
    }

    // ── picker: ×N badges for units already in the roster + a Done bar ──
    function poolBadges() {
        const r = CAR(), box = $('roster-pool-container'); if (!r || !box) return;
        // "✓ 2×5 · 1×10": how many copies of each size are already in the roster
        const sizesOf = name => { const inf = typeof rosterUnitSizes === 'function' ? rosterUnitSizes(name) : null; return inf ? inf.sizes : null; };
        const counts = {};
        r.units.forEach(u => { const z = sizesOf(u.name), comp = z ? z[Math.min(u.sizeIdx || 0, z.length - 1)].comp : ''; const m = parseInt(comp, 10) || 0;
            (counts[u.name] = counts[u.name] || { n: 0, by: {} }).n++; counts[u.name].by[m] = (counts[u.name].by[m] || 0) + 1; });
        const label = c => { const ks = Object.keys(c.by).map(Number).sort((a, b) => a - b); return ks.length === 1 && ks[0] <= 1 ? '✓ ×' + c.n : '✓ ' + ks.map(k => c.by[k] + '×' + (k || '?')).join(' · '); };
        box.querySelectorAll('.unit-card').forEach(c => {
            const h = c.querySelector('h4'); if (!h) return;
            const name = (h.firstChild && h.firstChild.nodeType === 3 ? h.firstChild.textContent : h.textContent).trim(), cnt = counts[name]; let b = c.querySelector('.pool-badge');
            if (cnt && !b) { b = document.createElement('span'); b.className = 'pool-badge'; h.appendChild(b); }
            if (b) { if (cnt) b.textContent = label(cnt); else b.remove(); }
            c.classList.toggle('in-roster', !!cnt);
        });
        const side = $('roster-pool-sidebar'); if (!side) return;
        // Done sits at the TOP of the list (it used to float over the units underneath)
        const d = $('pool-done-top'); if (!d) return;
        const cur = parseInt(($('rb-current-pts') || {}).textContent, 10) || 0, pts = d.querySelector('.side-pts');
        if (pts) pts.textContent = cur + ' / ' + (r.pointsLimit || 1000);
    }

    // the Done bar only exists while the unit picker is open AND the roster screen is the active one
    function syncDone() { const o = $('sidebar-overlay'); if (o && !document.querySelector('.warmind-sidebar.open')) o.style.display = 'none'; }
    (function () {
        const base = window.switchView;
        window.switchView = function (v, p) { const r = base.apply(this, arguments); if (v !== 'rosters') { const s = $('roster-pool-sidebar'); if (s) s.classList.remove('open'); const o = $('sidebar-overlay'); if (o && !document.querySelector('.warmind-sidebar.open')) o.style.display = 'none'; } syncDone(); return r; };
    })();
    // ── edit roster name + points limit ──
    window.editRoster = function () {
        const r = CAR(); if (!r) return;
        let o = $('rb-edit'); if (o) o.remove();
        o = document.createElement('div'); o.id = 'rb-edit';
        const presets = [500, 1000, 1500];
        o.innerHTML = `<div class="rbe-card" role="dialog" aria-label="Edit roster">
            <div class="rbe-t">${S('Edit roster', 'Editar lista')}</div>
            <label>${S('Name', 'Nombre')}</label><input id="rbe-name" maxlength="40" value="${String(r.name).replace(/"/g, '&quot;')}" autocomplete="off">
            <label>${S('Points limit', 'Límite de puntos')}</label>
            <div class="rbe-chips">${presets.map(p => `<button type="button" data-p="${p}" class="${p === r.pointsLimit ? 'on' : ''}">${p}</button>`).join('')}</div>
            <input id="rbe-pts" type="number" inputmode="numeric" min="100" max="10000" step="50" value="${r.pointsLimit}">
            <div class="rbe-act"><button type="button" id="rbe-cancel">${S('Cancel', 'Cancelar')}</button><button type="button" id="rbe-save">${S('Save', 'Guardar')}</button></div></div>`;
        document.body.appendChild(o);
        o.onclick = e => { if (e.target === o) o.remove(); };
        o.querySelectorAll('.rbe-chips button').forEach(b => b.onclick = () => { $('rbe-pts').value = b.dataset.p; o.querySelectorAll('.rbe-chips button').forEach(x => x.classList.toggle('on', x === b)); });
        $('rbe-cancel').onclick = () => o.remove();
        $('rbe-save').onclick = () => {
            const n = $('rbe-name').value.trim() || r.name, p = Math.max(100, Math.min(10000, parseInt($('rbe-pts').value, 10) || r.pointsLimit));
            r.name = n; r.pointsLimit = p;
            $('rb-roster-name').textContent = n; $('rb-limit-pts').innerHTML = `/ ${p} pts <i class="fa-solid fa-pencil" style="font-size:0.7rem; color:#6a7a8c;"></i>`;
            if (typeof saveRosters === 'function') saveRosters(); if (typeof renderRosterBuilder === 'function') renderRosterBuilder();
            o.remove(); if (window.toast) toast(S('Roster updated', 'Lista actualizada'));
        };
        setTimeout(() => { const f = $('rbe-name'); f.focus(); f.select(); }, 50);
    };
    function boot() {
        wrap();
        const list = $('roster-list-container'), pool = $('roster-pool-container');
        if (list) new MutationObserver(decorate).observe(list, { childList: true });
        if (pool) new MutationObserver(() => poolBadges()).observe(pool, { childList: true });
        const pts = $('rb-current-pts'); if (pts) new MutationObserver(() => { updateBar(); poolBadges(); }).observe(pts, { childList: true, characterData: true, subtree: true });
        document.addEventListener('view:change', updateBar);
        setInterval(() => { wrap(); updateBar(); }, 1500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

// tap anywhere outside the unit list (the dimmed strip) to close it
document.addEventListener('click', e => {
    const side = document.getElementById('roster-pool-sidebar'); if (!side || !side.classList.contains('open')) return;
    if (side.contains(e.target) || e.target.closest('.mobile-sidebar-toggle') || e.target.closest('#rb-sheet') || e.target.closest('.toast')) return;
    side.classList.remove('open');
}, true);
