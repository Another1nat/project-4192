/* Data & Offline screen: install the app, download datasheets / mission cards for offline use,
   backup & restore rosters + games. Also registers the service worker (sw.js) and shows an offline pill. */
(function () {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
    const root = () => document.getElementById('offline-root');
    const card = inner => `<div style="background:#161d27; border:1px solid #2a3546; border-radius:12px; padding:14px; margin-bottom:12px;">${inner}</div>`;
    const btn = (label, onclick, bg, dis) => `<button onclick="${onclick}" ${dis ? 'disabled' : ''} style="width:100%; min-height:48px; margin-top:8px; padding:12px; background:${bg || 'var(--accent)'}; color:${bg ? '#fff' : '#000'}; border:none; border-radius:10px; font-weight:bold; cursor:pointer; ${dis ? 'opacity:.5;' : ''}">${label}</button>`;
    const KEY_FACT = 'bl_offline_factions';           // { factionName: timestamp }
    const done = () => { try { return JSON.parse(LS.get(KEY_FACT) || '{}'); } catch (e) { return {}; } };
    let busy = false, progress = '', pct = 0, deferred = null, estimate = '', task = '', failed = [];

    // ---- service worker + offline pill ----
    if ('serviceWorker' in navigator) {
        const had = !!navigator.serviceWorker.controller;
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
        // a new version took over: offer a one-tap reload so phones stop running stale code
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!had || document.getElementById('bl-update-bar')) return;
            const b = document.createElement('div'); b.id = 'bl-update-bar';
            b.style.cssText = 'position:fixed; left:12px; right:12px; bottom:calc(env(safe-area-inset-bottom,0px) + 84px); z-index:100050; background:var(--accent,#ff7a3d); color:var(--accent-fg,#140a05); border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:10px; font-weight:800; box-shadow:0 8px 24px rgba(0,0,0,.5);';
            b.innerHTML = '<span style="flex:1;">New version ready</span><button style="min-height:44px; padding:0 16px; border:none; border-radius:10px; background:#0b1220; color:#fff; font-weight:800; cursor:pointer;">Reload</button>';
            b.querySelector('button').onclick = () => location.reload(); document.body.appendChild(b);
        });
    }
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; if (root()) render(); if (window.OFFLINE_PAINT_INSTALL) OFFLINE_PAINT_INSTALL(); });
    window.addEventListener('appinstalled', () => { deferred = null; if (root()) render(); });
    function pill() {
        let p = document.getElementById('offline-pill');
        if (!p) { p = document.createElement('div'); p.id = 'offline-pill'; p.style.cssText = 'position:fixed; bottom:12px; left:50%; transform:translateX(-50%); background:#8c2a2a; color:#fff; font-weight:800; font-size:0.8rem; letter-spacing:1px; padding:8px 16px; border-radius:20px; z-index:99990; box-shadow:0 4px 12px rgba(0,0,0,.5); display:none; pointer-events:none;'; document.body.appendChild(p); }
        p.textContent = S('OFFLINE — saved data only', 'SIN CONEXIÓN — solo datos guardados'); p.style.display = navigator.onLine ? 'none' : 'block';
    }
    window.addEventListener('online', () => { pill(); if (root()) render(); }); window.addEventListener('offline', () => { pill(); if (root()) render(); });
    document.addEventListener('DOMContentLoaded', pill);

    // ---- datasheets ----
    async function downloadFactions(names, fresh) {
        if (busy) return; busy = true; pct = 0; task = 'factions'; progress = ''; failed = [];
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}   // ask the browser not to evict saved data
        try { if (window.PDFEXPORT) PDFEXPORT.prefetch(); } catch (e) {}                                       // so PDF export also works offline later
        try {
            for (let i = 0; i < names.length; i++) {
                progress = `${names[i]} (${i + 1}/${names.length})`; pct = i / names.length; render();
                try { await BLDATA.saveFaction(names[i], !!fresh); const d = done(); d[names[i]] = Date.now(); LS.set(KEY_FACT, JSON.stringify(d)); }
                catch (e) { failed.push(names[i]); progress = names[i] + ': ' + (e.message || e); render(); await new Promise(r => setTimeout(r, 900)); }
            }
        } finally {
            busy = false; pct = 1;
            progress = failed.length ? S(`Done, but ${failed.length} failed: ${failed.join(', ')} — tap Save to retry`, `Terminado, pero ${failed.length} fallaron: ${failed.join(', ')} — toca Guardar para reintentar`) : S('Done ✔', 'Listo ✔');
            render(); try { if (window.renderDsBar) renderDsBar(); } catch (e) {} try { if (window.renderDatasheetIndex) renderDatasheetIndex(); } catch (e) {}
        }
    }
    // drop "saved" flags whose files are no longer in the device cache (browser cleared them)
    async function verifySaved() {
        const d = done(); let changed = false;
        for (const n of Object.keys(d)) { try { if (!(await BLDATA.isSaved(n))) { delete d[n]; changed = true; } } catch (e) {} }
        if (changed) { LS.set(KEY_FACT, JSON.stringify(d)); paintFactions(); if (root()) render(); if (window.renderDatasheetIndex) renderDatasheetIndex(); }
    }
    window.addEventListener('load', () => setTimeout(verifySaved, 1500));
    const slug = s => String(s).toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    function cardUrls() {
        const urls = [], gd = window.GDM_DATA || {};
        (gd.matrix || []).flat().forEach(n => { urls.push({ u: `assets/primary/${slug(n)}.png`, kind: 'primary' }, { u: `assets/primary/${slug(n)}-back.png`, kind: 'primary', optional: true }); });
        (gd.secondaryMissions || []).forEach(n => { const s = slug(n).replace('secure-no-mans-land', 'secure-no-man-s-land'); ['attacker', 'defender'].forEach(r => urls.push({ u: `assets/secondary/${r}/${s}.png`, kind: 'secondary' })); });
        return urls;
    }
    async function cachedCardCount() {   // how many mission-card images are really stored on this device right now
        if (!window.caches) return { n: 0, total: 0 };
        let n = 0; const list = cardUrls();
        for (const x of list) { try { if (await caches.match(x.u)) n++; } catch (e) {} }
        return { n, total: list.length, ok: +(LS.get('bl_cards_ok') || 0) };
    }
    async function downloadCards() {
        if (busy) return; busy = true; task = 'cards'; progress = S('Saving mission cards…', 'Guardando cartas de misión…'); pct = 0; render();
        const list = cardUrls(); let n = 0, ok = 0;
        for (const x of list) { try { const r = await fetch(x.u); if (r.ok) ok++; } catch (e) {} n++; pct = n / list.length; if (n % 5 === 0) { render(); paintMissions(); } }
        try { const man = await (await fetch('data/offline_assets.json')).json(); const extra = [].concat(man.maps || [], man.tutorial || [], man.deployment || []); let m = 0;
            for (const u of extra) { try { const r = await fetch(u); if (r.ok) m++; } catch (e) {} progress = S(`Saving maps and guides… ${m}/${extra.length}`, `Guardando mapas y guías… ${m}/${extra.length}`); if (m % 6 === 0) render(); }
            LS.set('bl_maps_ok', String(m)); } catch (e) {}
        LS.set('bl_offline_cards', String(Date.now())); LS.set('bl_cards_ok', String(ok)); busy = false; progress = S(`Done ✔ ${ok} cards saved`, `Listo ✔ ${ok} cartas guardadas`); pct = 1; render(); paintMissions();
    }
    // banner at the top of the Primary / Secondary mission screens
    async function paintMissions() {
        // no "save all cards" box on the mission pages any more: saving cards for offline lives in Data & Offline
        ['primary', 'secondary'].forEach(k => { const b = document.getElementById('off-m-' + k); if (b) b.remove(); });
        return;
        for (const [view, kind] of [['primary-missions', 'primary'], ['secondary-missions', 'secondary']]) {
            const v = document.getElementById('view-' + view); if (!v) continue; const holder = v.querySelector('[id$="-missions-container"]'); if (!holder) continue;
            let b = document.getElementById('off-m-' + kind); if (!b) { b = document.createElement('div'); b.id = 'off-m-' + kind; holder.before(b); }
            const c = await cachedCardCount(), full = c.ok ? c.n >= c.ok : false, has = c.n > 0;
            b.innerHTML = full ? `<div style="margin:0 0 12px; padding:12px 14px; border-radius:10px; background:rgba(91,229,154,.10); border:1px solid rgba(91,229,154,.45); color:#9be8bd; font-size:0.9rem; display:flex; align-items:center; gap:10px; min-height:48px;"><i class="fa-solid fa-circle-check"></i> ${S('All mission cards are saved on this device — works offline.', 'Todas las cartas de misión están guardadas en este dispositivo: funciona sin conexión.')}</div>`
                : `<div style="margin:0 0 12px; padding:12px 14px; border-radius:10px; background:#161d27; border:1px solid #2a3546; font-size:0.9rem;"><div style="color:#cfd8e3;">${has ? S(`${c.n} cards saved offline so far.`, `${c.n} cartas guardadas hasta ahora.`) : S('Mission cards need internet right now.', 'Las cartas de misión necesitan internet por ahora.')}</div>
                ${busy && task === 'cards' ? `<div style="height:8px; background:#2a3546; border-radius:4px; overflow:hidden; margin-top:8px;"><div style="height:100%; width:${Math.round(pct * 100)}%; background:var(--accent);"></div></div>` : `<button onclick="OFFLINE.cards()" ${navigator.onLine ? '' : 'disabled'} style="margin-top:8px; width:100%; min-height:48px; background:var(--accent); color:#000; border:none; border-radius:10px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-download"></i> ${S('Save all mission cards for offline (~25 MB)', 'Guardar todas las cartas sin conexión (~25 MB)')}</button>`}</div>`;
        }
    }
    window.OFFLINE_PAINT_MISSIONS = paintMissions;

    // home screen: "how to get the app" card (until installed or dismissed)
    function paintInstallCard() {
        // the home screen stays clean: installing the app lives in the menu (Data & Offline)
        const old = document.getElementById('install-banner'); if (old) old.remove();
        return;
        const home = document.getElementById('view-home'); if (!home) return;
        let b = document.getElementById('install-banner');
        const anchor = home.querySelector('.section-label'); if (!b && anchor) { b = document.createElement('div'); b.id = 'install-banner'; anchor.before(b); }
        if (!b) return;
        if (isStandalone() || LS.get('bl_install_dismissed')) { b.innerHTML = ''; return; }
        b.style.padding = '0 20px';
        b.innerHTML = `<div class="install-pill"><img src="assets/icons/logo-mark-96.png" width="36" height="36" alt=""><div class="t">${S('Install the app', 'Instala la app')}<small>${S('Works offline, opens full screen', 'Funciona sin conexión, pantalla completa')}</small></div>
            <button class="go" onclick="${deferred ? 'OFFLINE.install()' : "switchView('data')"}">${deferred ? S('Install', 'Instalar') : S('How', 'Cómo')}</button><button class="x" aria-label="close" onclick="OFFLINE.dismissInstall()">✕</button></div>`;
    }
    window.OFFLINE_PAINT_INSTALL = paintInstallCard;

    async function exportPdf(names) {
        if (busy) return; if (!window.PDFEXPORT) { alert('PDF export is not available'); return; }
        const list = names || Object.keys(done()); if (!list.length) { alert(S('Save at least one faction first (step 2).', 'Guarda al menos una facción primero (paso 2).')); return; }
        if (list.length > 5 && !confirm(S(`Export ${list.length} factions? The file can be very large (hundreds of pages) and may take a minute.`, `¿Exportar ${list.length} facciones? El archivo puede ser muy grande (cientos de páginas) y tardar un minuto.`))) return;
        busy = true; task = 'pdf'; pct = 0; progress = S('Preparing PDF…', 'Preparando PDF…'); render();
        try { const pages = await PDFEXPORT.exportFactions(list, (t, p) => { progress = t; pct = p; render(); }); progress = S(`PDF ready ✔ (${pages} pages) — check your downloads`, `PDF listo ✔ (${pages} páginas) — revisa tus descargas`); pct = 1; }
        catch (e) { progress = '⚠ ' + e.message; }
        busy = false; render();
    }

    // ---- faction cards: "available offline" badges + banner on the home screen ----
    let painting = false;
    function paintFactions() {
        if (painting) return; painting = true;
        try {
            const d = done(), offline = !navigator.onLine, grid = document.getElementById('factions-list'); if (!grid) return;
            let n = 0;
            grid.querySelectorAll('.faction-card').forEach(c => {
                const name = (c.querySelector('span') || {}).textContent, has = !!d[name]; if (has) n++;
                let b = c.querySelector('.off-badge');
                if (has && !b) { b = document.createElement('i'); b.className = 'fa-solid fa-circle-arrow-down off-badge'; b.title = S('Available offline', 'Disponible sin conexión'); b.style.cssText = 'position:absolute; top:8px; right:8px; color:#5be59a; font-size:1.05rem; text-shadow:0 1px 3px #000;'; c.appendChild(b); }
                if (!has && b) b.remove();
                c.style.opacity = offline && !has ? '0.35' : ''; c.title = offline && !has ? S('Not downloaded — needs internet', 'No descargada — requiere internet') : '';
            });
            let ban = document.getElementById('offline-banner');
            const home = document.getElementById('view-home'), anchor = home && Array.from(home.children).find(x => x.classList && x.classList.contains('section-label'));
            if (!ban && anchor) { ban = document.createElement('div'); ban.id = 'offline-banner'; anchor.before(ban); }
            if (ban) {
                ban.style.padding = '0 20px';
                ban.innerHTML = n || offline ? `<div onclick="switchView('data')" style="cursor:pointer; margin:0 0 12px; padding:10px 14px; border-radius:10px; background:rgba(91,229,154,.10); border:1px solid rgba(91,229,154,.45); color:#9be8bd; font-size:0.85rem; display:flex; align-items:center; gap:10px; min-height:44px;"><i class="fa-solid fa-circle-arrow-down"></i><span style="flex:1;">${n ? S(`Offline datasheets available: ${n} of ${FACTIONS.length} factions`, `Datasheets sin conexión: ${n} de ${FACTIONS.length} facciones`) : S('No factions saved for offline use yet', 'Aún no hay facciones guardadas para uso sin conexión')}</span><b>${S('Manage', 'Gestionar')} ›</b></div>` : '';
            }
        } finally { painting = false; }
    }
    window.OFFLINE_PAINT = paintFactions;
    window.OFFLINE_MARK = name => { const d = done(); if (!d[name]) { d[name] = Date.now(); LS.set(KEY_FACT, JSON.stringify(d)); } };
    document.addEventListener('DOMContentLoaded', () => { const h = document.getElementById('view-home'); if (h) { let t; new MutationObserver(() => { clearTimeout(t); t = setTimeout(paintFactions, 60); }).observe(h, { childList: true, subtree: true }); } setTimeout(() => { paintFactions(); paintInstallCard(); }, 300); });
    window.addEventListener('online', paintFactions); window.addEventListener('offline', paintFactions);

    // ---- backup ----
    const KEYS = ['battlelist_rosters', 'gdm_history', 'gdm_games', 'gdm_lang'];
    function exportAll() {
        LS.set('bl_last_backup', String(Date.now()));
        const data = {}; KEYS.forEach(k => { const v = LS.get(k); if (v != null) data[k] = v; });
        const blob = new Blob([JSON.stringify({ app: 'iron-and-wrath', v: 1, exported: new Date().toISOString(), data }, null, 1)], { type: 'application/json' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `iron-and-wrath-backup-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }
    // merge a backup ({ app, data }) into this device: existing items are kept, new ones added; returns what was added
    function importData(b) {
        if (!['iron-and-wrath', 'battlelist'].includes(b.app) || !b.data) throw new Error('not a Iron & Wrath backup');
        const parse = (k, d) => { try { return JSON.parse(b.data[k] || JSON.stringify(d)); } catch (e) { return d; } };
        const mine = (k, d) => { try { return JSON.parse(LS.get(k) || JSON.stringify(d)); } catch (e) { return d; } };
        const merge = (k, keyOf) => { const cur = mine(k, []), inc = parse(k, []), seen = new Set(cur.map(keyOf)); let add = 0; inc.forEach(x => { if (!seen.has(keyOf(x))) { cur.push(x); add++; } }); LS.set(k, JSON.stringify(cur)); return add; };
        const gm = mine('gdm_games', {}), gi = parse('gdm_games', {}); let ga = 0; Object.keys(gi).forEach(id => { if (!gm[id]) { gm[id] = gi[id]; ga++; } }); LS.set('gdm_games', JSON.stringify(gm));
        const ra = merge('battlelist_rosters', x => x.id), ha = merge('gdm_history', x => `${x.started || x.date}|${x.p1}|${x.p2}`);
        return { ra, ha, ga };
    }
    function importFile() {
        const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
        inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
            try {
                const { ra, ha, ga } = importData(JSON.parse(r.result));
                alert(S(`Imported: ${ra} rosters, ${ha} finished games, ${ga} games in progress (existing items were kept). The page will reload.`, `Importado: ${ra} ejércitos, ${ha} partidas terminadas, ${ga} en curso (lo existente se conservó). Se recargará la página.`));
                location.reload();
            } catch (e) { alert(S('That file is not a valid Iron & Wrath backup.', 'Ese archivo no es un respaldo válido de Iron & Wrath.')); }
        }; r.readAsText(f); };
        inp.click();
    }

    // ---- moving from the old address (battlelist.…workers.dev) to this site ----
    // Browsers keep each address's data apart, so the old address offers a one-tap move: the saved data travels, compressed, in the link.
    const NEW_SITE = '';
    const OLD_HOST = /\.workers\.dev$/.test(location.hostname);
    const MOVED = window.__MOVED || '';             // captured by the first script in index.html, before the app switches the address to #home
    const hasData = () => { try { return JSON.parse(LS.get('battlelist_rosters') || '[]').length + Object.keys(JSON.parse(LS.get('gdm_games') || '{}')).length + JSON.parse(LS.get('gdm_history') || '[]').length > 0; } catch (e) { return false; } };
    async function moveToNewSite() {
        const data = {}; KEYS.forEach(k => { const v = LS.get(k); if (v != null) data[k] = v; });
        try {
            const packed = await RSHARE.pack({ app: 'iron-and-wrath', v: 1, data });
            if (packed.length < 1500000) { location.href = NEW_SITE + '/#move=' + packed; return; }
        } catch (e) {}
        exportAll();                                    // too big for a link: save a backup file to import there
        alert(S('Your data was saved as a backup file. On this site open Menu → Data & Offline → Import backup.', 'Tus datos se guardaron en un archivo de respaldo. En this site abre Menú → Datos y sin conexión → Importar respaldo.'));
        location.href = NEW_SITE;
    }
    function oldHostBanner() {
        if (!OLD_HOST) return;
        if (!hasData()) { location.replace(NEW_SITE + location.pathname + location.search + location.hash); return; }   // nothing saved here: just go
        const b = document.createElement('div'); b.id = 'bl-moved';
        b.style.cssText = 'position:fixed; left:12px; right:12px; top:max(12px, env(safe-area-inset-top)); z-index:100002; background:#0b1220; border:2px solid #22c55e; border-radius:14px; padding:14px; color:#e6edf8; font-size:.92rem; line-height:1.45; box-shadow:0 10px 30px rgba(0,0,0,.6);';
        b.innerHTML = `<b style="color:#86efac">${S('Battlelist is now Iron & Wrath', 'Battlelist ahora es Iron & Wrath')}</b> — <b>this site</b><br>${S('Bring your rosters and games with you (one tap, nothing is deleted here).', 'Lleva tus listas y partidas contigo (un toque, aquí no se borra nada).')}
            <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;"><button data-a="move" style="flex:1; min-height:44px; border:none; border-radius:10px; background:#22c55e; color:#04210f; font-weight:800;">${S('Move my data to this site', 'Mover mis datos a this site')}</button>
            <button data-a="go" style="min-height:44px; padding:0 14px; border:1px solid #2a3546; border-radius:10px; background:#10161e; color:#e6edf8; font-weight:700;">${S('Just open it', 'Solo abrir')}</button></div>`;
        b.querySelector('[data-a=move]').onclick = moveToNewSite;
        b.querySelector('[data-a=go]').onclick = () => { location.href = NEW_SITE; };
        document.body.appendChild(b);
    }
    async function receiveMove() {
        if (!MOVED) return;
        const packed = MOVED; if (location.hash.startsWith('#move=')) history.replaceState(null, '', location.pathname + location.search + '#home');
        try {
            const b = await RSHARE.unpack(packed);
            if (!confirm(S('Import your rosters and games from the old Battlelist address? Anything already here is kept.', '¿Importar tus listas y partidas de la dirección anterior de Battlelist? Lo que ya hay aquí se conserva.'))) return;
            const { ra, ha, ga } = importData(b);
            alert(S(`Moved: ${ra} rosters, ${ha} finished games, ${ga} games in progress. Welcome to Iron & Wrath!`, `Movido: ${ra} listas, ${ha} partidas terminadas, ${ga} en curso. ¡Bienvenido a Iron & Wrath!`));
            location.reload();
        } catch (e) { alert(S('The data in that link could not be read. On the old address use Data & Offline → Export backup instead.', 'No se pudieron leer los datos del enlace. En la dirección anterior usa Datos y sin conexión → Exportar respaldo.')); }
    }
    // (Iron & Wrath's old-address migration banner is switched off in this copy)

    async function refreshEstimate() { try { const e = await navigator.storage.estimate(); estimate = `${(e.usage / 1048576).toFixed(1)} MB ${S('used on this device', 'usados en este dispositivo')}`; } catch (e) { estimate = ''; } if (root()) render(); }
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    const stepCard = (num, icon, title, body) => `<div style="background:#161d27; border:1px solid #2a3546; border-radius:16px; padding:20px; margin-bottom:22px;">
        <div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;"><div style="width:44px; height:44px; border-radius:50%; background:var(--accent); color:#000; font-weight:800; font-size:1.3rem; display:flex; align-items:center; justify-content:center; flex:none;">${num}</div><div style="font-weight:800; font-size:1.2rem; line-height:1.2;">${icon} ${title}</div></div>${body}</div>`;
    const bigBtn = (label, onclick, kind, dis) => `<button onclick="${onclick}" ${dis ? 'disabled' : ''} style="width:100%; min-height:56px; margin-top:12px; padding:14px; background:${kind === 'ghost' ? '#232d3b' : 'var(--accent)'}; color:${kind === 'ghost' ? '#fff' : '#000'}; border:none; border-radius:12px; font-weight:800; font-size:1rem; cursor:pointer; ${dis ? 'opacity:.45;' : ''}">${label}</button>`;
    const prog = t => task === t && (busy || progress) ? `<div style="margin:14px 0 4px;">${busy ? `<div style="height:12px; background:#2a3546; border-radius:6px; overflow:hidden;"><div style="height:100%; width:${Math.round(pct * 100)}%; background:var(--accent); transition:width .2s;"></div></div>` : ''}<div style="color:${busy ? '#9aa7b8' : '#5be59a'}; font-size:0.95rem; margin-top:6px;">${esc(progress)}</div></div>` : '';
    const list = (arr) => `<ol style="margin:8px 0 0; padding-left:24px; line-height:1.85; font-size:0.97rem; color:#e3e9f0;">${arr.map(x => `<li style="margin-bottom:4px;">${x}</li>`).join('')}</ol>`;
    function render() {
        try { if (window.renderDsBar) renderDsBar(); } catch (e) {}
        const el = root(); if (!el) return; const d = done(), names = FACTIONS.map(f => f.name), cached = names.filter(n => d[n]).length;
        const last = Math.max(0, ...Object.values(d)), age = last ? Math.round((Date.now() - last) / 864e5) : null;
        const ios = list([S('Open this page in <b>Safari</b> (or Chrome)', 'Abre esta página en <b>Safari</b> (o Chrome)'), S('Tap the <b>Share</b> button ⬆︎', 'Toca el botón <b>Compartir</b> ⬆︎'), S('Choose <b>Add to Home Screen</b>', 'Elige <b>Añadir a pantalla de inicio</b>'), S('Tap <b>Add</b> — a Iron & Wrath icon appears on your phone', 'Toca <b>Añadir</b>: aparece el icono de Iron & Wrath')]);
        const andr = list([S('Open this page in <b>Chrome</b>', 'Abre esta página en <b>Chrome</b>'), S('Tap the <b>⋮</b> menu (top right)', 'Toca el menú <b>⋮</b> (arriba a la derecha)'), S('Choose <b>Install app</b> or <b>Add to Home screen</b>', 'Elige <b>Instalar app</b> o <b>Añadir a pantalla de inicio</b>'), S('Confirm — find the icon on your phone', 'Confirma y busca el icono en tu teléfono')]);
        const pcs = list([S('Use Chrome or Edge', 'Usa Chrome o Edge'), S('Click the <b>install icon</b> at the right end of the address bar', 'Haz clic en el <b>icono de instalar</b> al final de la barra de direcciones')]);
        const sec = (open, t, body) => `<details ${open ? 'open' : ''} style="margin-top:12px; background:#10151c; border:1px solid #2a3546; border-radius:12px; padding:12px 14px;"><summary style="cursor:pointer; font-weight:bold; font-size:1.02rem; min-height:36px;">${t}</summary>${body}</details>`;
        setTimeout(async () => { const l = document.getElementById('off-ready-list'); if (!l) return; const r = await readiness(); const row = (ok, t) => `<div>${ok ? '<span style="color:#5be59a;">✔</span>' : '<span style="color:#e5c15a;">○</span>'} ${t}</div>`; l.innerHTML = row(r.shell, S('App screens saved', 'Pantallas de la app guardadas')) + row(r.factions >= 28, S(`Factions ${r.factions}/28`, `Facciones ${r.factions}/28`)) + row(r.cardsTotal && r.cards >= r.cardsTotal, S(`Mission cards ${r.cards}/${r.cardsTotal}`, `Cartas de misión ${r.cards}/${r.cardsTotal}`)) + row(r.mapsTotal && r.maps >= r.mapsTotal, S(`Terrain maps ${r.maps}/${r.mapsTotal}`, `Mapas de terreno ${r.maps}/${r.mapsTotal}`)); }, 0);
        el.innerHTML = `<h2 style="text-align:center; font-size:1.9rem; margin:0 0 6px;"><i class="fa-solid fa-cloud-arrow-down" style="color:var(--accent)"></i> ${S('DATA & OFFLINE', 'DATOS Y SIN CONEXIÓN')}</h2>
            <div style="text-align:center; color:#9aa7b8; font-size:0.95rem; margin-bottom:22px;">${navigator.onLine ? '<span style="color:#5be59a;">●</span> ' + S('Online', 'Con conexión') : '<span style="color:#ff7b7b;">●</span> ' + S('Offline', 'Sin conexión')} ${estimate ? '· ' + esc(estimate) : ''}<br>${S('Follow the steps in order. It takes about 2 minutes.', 'Sigue los pasos en orden. Toma unos 2 minutos.')}</div>
            <div id="off-ready" style="background:#161d27; border:1px solid var(--accent); border-radius:16px; padding:18px; margin-bottom:22px;">
                <div style="font-weight:800; margin-bottom:6px;">${S('Use it fully offline', 'Úsala totalmente sin conexión')}</div>
                <div style="color:#cfd8e3; font-size:0.92rem; line-height:1.5;">${S('One tap saves everything: all 28 factions, the mission cards, the terrain maps and the guides. After that, every screen (rosters, datasheets, calculator, game tracker, PDF export) works without internet. Payments of data such as cloud save and live sync still need a connection.', 'Un toque guarda todo: las 28 facciones, las cartas de misión, los mapas de terreno y las guías. Después, todas las pantallas (ejércitos, datasheets, calculadora, registro de partida, exportar PDF) funcionan sin internet. El guardado en la nube y la sincronización en vivo siguen necesitando conexión.')}</div>
                <div id="off-ready-list" style="margin-top:10px; font-size:0.9rem; color:#9aa7b8;">…</div>
                ${prog('cards')}${bigBtn('' + S('SAVE EVERYTHING FOR OFFLINE', 'GUARDAR TODO PARA USO SIN CONEXIÓN'), 'OFFLINE.everything()', null, busy || !navigator.onLine)}
            </div>
            ${stepCard(1, '<i class="fa-solid fa-mobile-screen" style="color:var(--accent)"></i>', S('Put the app on your phone', 'Pon la app en tu teléfono'), `<div style="color:#cfd8e3; font-size:0.97rem; line-height:1.6;">${isStandalone() ? '✔ ' + S('Already installed — you are using the app.', 'Ya instalada: estás usando la app.') : S('Installed, Iron & Wrath opens full screen with its own icon and keeps your saved data safe.', 'Instalada, Iron & Wrath abre a pantalla completa con su icono y conserva tus datos guardados.')}</div>
                ${deferred ? bigBtn(S('INSTALL NOW', 'INSTALAR AHORA'), 'OFFLINE.install()') : ''}
                ${isStandalone() ? '' : sec(isIOS, 'iPhone / iPad', ios) + sec(/android/i.test(navigator.userAgent), 'Android', andr) + sec(!isIOS && !/android/i.test(navigator.userAgent), '' + S('Computer', 'Computadora'), pcs)}`)}
            ${stepCard(2, '<i class="fa-solid fa-database" style="color:var(--accent)"></i>', S('Save the datasheets', 'Guarda los datasheets'), `<div style="color:#cfd8e3; font-size:0.97rem; line-height:1.6;">${S('Pick the factions you play. They will open without internet.', 'Elige las facciones que juegas. Abrirán sin internet.')}</div>
                <div style="margin-top:10px; font-size:1.05rem;"><b style="color:var(--accent);">${cached}</b> ${S('of', 'de')} ${names.length} ${S('factions saved', 'facciones guardadas')}${age != null ? `<span style="color:#9aa7b8; font-size:0.85rem;"> · ${S('updated', 'actualizado')} ${age === 0 ? S('today', 'hoy') : age + ' ' + S('days ago', 'días')}</span>` : ''}${age != null && age > 30 ? ` <b style="color:#e5c15a;">· ${S('time to update', 'conviene actualizar')}</b>` : ''}</div>
                ${prog('factions')}
                ${bigBtn('' + S('SAVE ALL FACTIONS', 'GUARDAR TODAS LAS FACCIONES'), 'OFFLINE.downloadAll()', null, busy || !navigator.onLine)}
                ${bigBtn('' + S('UPDATE SAVED FACTIONS', 'ACTUALIZAR FACCIONES GUARDADAS'), 'OFFLINE.updateAll()', 'ghost', busy || !navigator.onLine || !cached)}
                ${bigBtn('' + S('EXPORT SAVED FACTIONS AS PDF', 'EXPORTAR FACCIONES GUARDADAS A PDF'), 'OFFLINE.pdf()', 'ghost', busy || !cached)}
                ${prog('pdf')}
                ${sec(false, S('Or choose one faction at a time', 'O elige una facción a la vez'), names.map(n => `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-top:1px solid #222c3a;"><span style="font-size:1rem;">${esc(n)} ${d[n] ? '<span style="color:#5be59a;">✔</span>' : ''}</span><span style="display:flex; gap:8px;">${d[n] ? `<button onclick="OFFLINE.pdf('${n.replace(/'/g, "\\'")}')" ${busy ? 'disabled' : ''} style="background:#232d3b; color:#fff; border:none; border-radius:10px; padding:10px 12px; min-height:46px; cursor:pointer;">PDF</button>` : ''}<button onclick="OFFLINE.one('${n.replace(/'/g, "\\'")}')" ${busy || !navigator.onLine ? 'disabled' : ''} style="background:#2a3546; color:#fff; border:none; border-radius:10px; padding:10px 14px; min-height:46px; min-width:96px; cursor:pointer;">${d[n] ? S('Update', 'Actualizar') : S('Save', 'Guardar')}</button></span></div>`).join(''))}`)}
            ${stepCard(3, '<i class="fa-solid fa-clone" style="color:var(--accent)"></i>', S('Save the mission cards', 'Guarda las cartas de misión'), `<div style="color:#cfd8e3; font-size:0.97rem; line-height:1.6;">${S('About 25 MB. The Primary and Secondary mission screens and the "Full card" view will then work offline.', 'Unos 25 MB. Las pantallas de Misiones Primarias y Secundarias y la "Carta completa" funcionarán sin conexión.')} ${LS.get('bl_offline_cards') ? '<b style="color:#5be59a;">✔ ' + S('saved', 'guardadas') + '</b>' : ''}</div>
                ${prog('cards')}${bigBtn('' + S('SAVE MISSION CARDS', 'GUARDAR CARTAS DE MISIÓN'), 'OFFLINE.cards()', null, busy || !navigator.onLine)}`)}
            ${stepCard('★', '<i class="fa-solid fa-vr-cardboard" style="color:var(--accent)"></i>', S('Terrain AR models (optional, about 28 MB)', 'Modelos de terreno RA (opcional, unos 28 MB)'), `<div style="color:#cfd8e3; font-size:0.97rem; line-height:1.5;">${S('The 3D maps and the files your phone\'s AR viewer opens. Saved here, the 3D view works offline; the AR viewer itself may still need a connection on some phones.', 'Los mapas 3D y los archivos que abre el visor de RA de tu teléfono. Guardados aquí, la vista 3D funciona sin conexión; en algunos teléfonos el visor de RA aún puede necesitar conexión.')}</div>
                ${prog('ar')}${bigBtn('' + S('SAVE AR TERRAIN MODELS', 'GUARDAR MODELOS DE TERRENO RA'), 'OFFLINE.ar()', 'ghost', busy || !navigator.onLine)}`)}
            ${stepCard(4, '<i class="fa-solid fa-shield-halved" style="color:var(--accent)"></i>', S('Back up your data (optional)', 'Respalda tus datos (opcional)'), `<div style="color:#cfd8e3; font-size:0.97rem; line-height:1.6;">${S('Your rosters and games live in this browser. Export a file to keep them safe, or import one to restore. Existing items are kept.', 'Tus ejércitos y partidas viven en este navegador. Exporta un archivo para guardarlos o importa uno para restaurar. Lo existente se conserva.')}</div>
                ${bigBtn('' + S('EXPORT BACKUP', 'EXPORTAR RESPALDO'), 'OFFLINE.export()')}${bigBtn('' + S('IMPORT BACKUP', 'IMPORTAR RESPALDO'), 'OFFLINE.import()', 'ghost')}`)}`;
    }
    async function downloadAr() {
        if (busy) return; busy = true; task = 'ar'; pct = 0; progress = S('Saving AR terrain models…', 'Guardando modelos de terreno RA…'); render();
        let ok = 0, total = 0;
        try { const man = await (await fetch('data/offline_assets.json')).json(); const list = man.ar || []; total = list.length;
            for (let i = 0; i < list.length; i++) { try { const r = await fetch(list[i]); if (r.ok) ok++; } catch (e) {} pct = (i + 1) / total; if (i % 6 === 0) { progress = S(`AR terrain models ${ok}/${total}`, `Modelos de terreno RA ${ok}/${total}`); render(); } } } catch (e) {}
        LS.set('bl_ar_ok', String(ok)); busy = false; pct = 1; progress = ok && ok >= total ? S('Done ✔ AR models saved', 'Listo ✔ modelos RA guardados') : S(`Saved ${ok} of ${total}. Tap to retry.`, `Guardados ${ok} de ${total}. Toca para reintentar.`); render();
    }
    async function everything() {
        if (busy) return; await downloadFactions(FACTIONS.map(f => f.name), false); if (failed && failed.length) return; await downloadCards();
        try { const c = await caches.open('bl-data'); await Promise.all(['data/glossary.json', 'data/core_stratagems.json'].map(u => fetch(u).then(r => r.ok && c.put(u, r)).catch(() => {}))); } catch (e) {}
    }
    async function readiness() {
        const out = { shell: false, factions: 0, cards: 0, cardsTotal: 0, maps: 0, mapsTotal: 0 };
        try { out.shell = !!(window.caches && await caches.match('index.html')) || !!(window.caches && await caches.match('/')); } catch (e) {}
        out.factions = Object.keys(done()).length; try { const c = await cachedCardCount(); out.cards = c.n; out.cardsTotal = c.total; } catch (e) {}
        try { const man = await (await fetch('data/offline_assets.json')).json(); const all = [].concat(man.maps || []); out.mapsTotal = all.length; for (const u of all) { if (await caches.match(u)) out.maps++; } } catch (e) {}
        return out;
    }
    // gentle reminder: rosters and games only live on this device
    function backupReminder() {
        try {
            const n = (() => { try { return JSON.parse(LS.get('battlelist_rosters') || '[]').length + Object.keys(JSON.parse(LS.get('gdm_games') || '{}')).length + JSON.parse(LS.get('gdm_history') || '[]').length; } catch (e) { return 0; } })();
            const last = +(LS.get('bl_last_backup') || 0), asked = +(LS.get('bl_backup_asked') || 0), DAY = 864e5;
            if (n < 2 || (last && Date.now() - last < 30 * DAY) || (asked && Date.now() - asked < 14 * DAY) || document.getElementById('bl-backup-bar')) return;
            const b = document.createElement('div'); b.id = 'bl-backup-bar';
            b.style.cssText = 'position:fixed; left:12px; right:12px; bottom:calc(env(safe-area-inset-bottom,0px) + 84px); z-index:100040; background:#161d27; border:1px solid var(--accent); color:#fff; border-radius:14px; padding:12px 14px; display:flex; align-items:center; gap:10px; box-shadow:0 8px 24px rgba(0,0,0,.5);';
            b.innerHTML = `<span style="flex:1; font-size:0.9rem; line-height:1.35;">${S('Your rosters and games are saved only on this device. Make a backup?', 'Tus ejércitos y partidas solo se guardan en este dispositivo. ¿Hacer una copia de seguridad?')}</span><button data-a="go" style="min-height:44px; padding:0 14px; border:none; border-radius:10px; background:var(--accent); color:var(--accent-fg,#000); font-weight:800;">${S('Back up', 'Respaldar')}</button><button data-a="no" aria-label="close" style="min-height:44px; min-width:44px; border:none; background:transparent; color:#9aa7b8; font-size:1.2rem;">✕</button>`;
            b.querySelector('[data-a=go]').onclick = () => { exportAll(); LS.set('bl_backup_asked', String(Date.now())); b.remove(); };
            b.querySelector('[data-a=no]').onclick = () => { LS.set('bl_backup_asked', String(Date.now())); b.remove(); };
            document.body.appendChild(b);
        } catch (e) {}
    }
    window.addEventListener('load', () => setTimeout(backupReminder, 6000));
    window.OFFLINE = {
        everything, readiness, backupReminder, ar: downloadAr,
        state: () => ({ busy, task, progress, pct }),
        pdf: n => exportPdf(n ? [n] : null), render, export: exportAll, import: importFile, cards: downloadCards,
        downloadAll: () => downloadFactions(FACTIONS.map(f => f.name), false),
        updateAll: () => downloadFactions(Object.keys(done()), true),
        one: n => downloadFactions([n], !!done()[n]),
        dismissInstall: () => { LS.set('bl_install_dismissed', '1'); paintInstallCard(); },
        install: async () => { if (!deferred) return; deferred.prompt(); try { await deferred.userChoice; } catch (e) {} deferred = null; render(); }
    };
    const base = window.switchView;
    window.switchView = function (v, push) { base(v, push); if (v === 'data') { render(); refreshEstimate(); } if (v === 'home') setTimeout(() => { paintFactions(); paintInstallCard(); }, 100); if (v === 'primary-missions' || v === 'secondary-missions') setTimeout(paintMissions, 150); };
})();
