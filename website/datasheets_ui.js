/* Datasheets: a page that lists every faction, then the faction's unit browser at #datasheets/<faction>. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const slug = n => String(n).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const bySlug = s => FACTIONS.find(f => slug(f.name) === s);
    const saved = () => { try { return JSON.parse(localStorage.getItem('bl_offline_factions') || '{}'); } catch (e) { return {}; } };
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    function renderIndex() {
        const grid = document.getElementById('ds-index-grid'); if (!grid) return;
        const q = ((document.getElementById('ds-index-search') || {}).value || '').toLowerCase().trim(), d = saved(), n = Object.keys(d).length;
        const sub = document.getElementById('ds-index-sub'); if (sub) sub.textContent = S('Pick a faction to browse its units.', 'Elige una facción para ver sus unidades.') + (n ? ' ' + S(`${n} saved for offline.`, `${n} guardadas sin conexión.`) : '');
        grid.innerHTML = '';
        FACTIONS.filter(f => !q || f.name.toLowerCase().includes(q)).forEach(f => {
            const c = document.createElement('div'); c.className = 'faction-card'; c.style.borderLeft = `6px solid ${f.color}`; c.style.backgroundImage = `url('${f.banner}')`;
            c.innerHTML = `<span>${esc(f.name)}</span>${d[f.name] ? `<i class="fa-solid fa-circle-arrow-down" title="${S('Available offline', 'Disponible sin conexión')}" style="position:absolute; top:8px; right:8px; z-index:3; color:#5be59a; font-size:1.05rem;"></i>` : ''}`;
                        c.onclick = () => openFactionDatasheets(f); grid.appendChild(c);
        });
        if (!grid.children.length) grid.innerHTML = `<div style="grid-column:1/-1; color:#8c99b0; padding:20px 0;">${S('No faction matches.', 'Ninguna facción coincide.')}</div>`;
    }
    window.openDatasheetIndex = function () {
        switchView('datasheet-index'); renderIndex();
        try { history.replaceState({ view: 'datasheet-index' }, '', '#datasheets'); } catch (e) {}
        document.title = S('Datasheets', 'Datasheets') + ' · Iron & Wrath';
    };
    // Datasheets open straight away (loaded from the community database). "Save for offline" is optional and lives in this bar.
    function renderDsBar() {
        const layout = document.querySelector('#view-datasheets .warmind-layout'); if (!layout) return;
        let bar = document.getElementById('ds-save-bar'); if (!bar) { bar = document.createElement('div'); bar.id = 'ds-save-bar'; layout.before(bar); }
        if (window.dsSyncMyRoster) dsSyncMyRoster();
        const t = document.getElementById('faction-title'), name = t && t.textContent; const f = FACTIONS.find(x => x.name === name); if (!f) { bar.innerHTML = ''; return; }
        const st = window.OFFLINE ? OFFLINE.state() : {}, d = saved(), when = d[f.name], busy = st.busy && st.task === 'factions';
        const age = when ? Math.round((Date.now() - when) / 864e5) : null;
        const label = busy ? `<i class="fa-solid fa-spinner fa-spin"></i> ${S('Saving…', 'Guardando…')}`
            : when ? `<i class="fa-solid fa-rotate"></i> ${S('Update', 'Actualizar')}` : `<i class="fa-solid fa-download"></i> ${S('Save for offline', 'Guardar sin conexión')}`;
        const info = when ? `<span class="ds-ok"><i class="fa-solid fa-circle-arrow-down"></i> ${S('Saved on this device', 'Guardado en este dispositivo')} · ${age === 0 ? S('today', 'hoy') : age + ' ' + S('d ago', 'd')}</span>` : `<span class="ds-no">${S('Optional: save these datasheets to use them offline', 'Opcional: guarda estos datasheets para usarlos sin conexión')}</span>`;
        bar.innerHTML = `${info}<button id="ds-save-btn" ${busy || !navigator.onLine ? 'disabled' : ''}>${label}</button>`;
        const bt = document.getElementById('ds-save-btn'); if (bt) bt.onclick = () => { if (window.OFFLINE) OFFLINE.one(f.name); };
        if (st.progress && !busy && st.task === 'factions' && /failed|fallaron|:/.test(st.progress) && !when) bar.insertAdjacentHTML('beforeend', `<div class="ds-err">${esc(st.progress)}</div>`);
    }
    window.renderDsBar = renderDsBar; window.renderDatasheetIndex = renderIndex;
    window.openFactionDatasheets = function (f) {
        isBuilderMode = false; switchView('datasheets');
        preloadFactionData(f).then(renderDsBar); renderDsBar();
        try { history.replaceState({ view: 'datasheets', faction: slug(f.name) }, '', '#datasheets/' + slug(f.name)); } catch (e) {}
        document.title = `${f.name} · Datasheets · Iron & Wrath`;
    };
    function setup() {
        // breadcrumb on the faction page: "‹ Datasheets" instead of "FACTION"
        const sub = document.getElementById('faction-subtitle');
        if (sub) { sub.innerHTML = `<a href="#datasheets" onclick="event.preventDefault(); openDatasheetIndex();" style="color:inherit; text-decoration:none; cursor:pointer;">‹ ${S('Datasheets', 'Datasheets')}</a>`; sub.style.cursor = 'pointer'; }
        // home faction cards open the same URL-friendly page
        document.querySelectorAll('#factions-list .faction-card').forEach(c => { const f = FACTIONS.find(x => x.name === (c.querySelector('span') || {}).textContent); if (f) c.onclick = () => openFactionDatasheets(f); });
        const inp = document.getElementById('ds-index-search'); if (inp) inp.oninput = renderIndex;
        // deep links: #datasheets  and  #datasheets/<faction>
        const h = window.__initialView || ''; const m = h.match(/^datasheets\/([a-z0-9-]+)$/);
        if (m && bySlug(m[1])) setTimeout(() => openFactionDatasheets(bySlug(m[1])), 80);
        else if (h === 'datasheets' || h === 'datasheet-index') setTimeout(openDatasheetIndex, 80);
    }
    const origPop = window.onpopstate;
    window.onpopstate = function (e) {
        if (origPop) origPop.call(window, e);
        const st = e.state || {};
        if (st.view === 'datasheet-index') renderIndex();
        if (st.faction) { const f = bySlug(st.faction); const t = document.getElementById('faction-title'); if (f && t && t.textContent !== f.name) preloadFactionData(f).then(renderDsBar); }
    };
    const base = window.switchView; window.switchView = function (v, p) { base(v, p); if (v === 'datasheet-index') renderIndex(); };
    window.addEventListener('online', () => { renderIndex(); renderDsBar(); if (document.getElementById('ds-fail') && window.retryFactionLoad) retryFactionLoad(); }); window.addEventListener('offline', () => { renderIndex(); renderDsBar(); });
    document.addEventListener('DOMContentLoaded', () => setTimeout(setup, 50));
})();
