/* Manage data on this device: saved rosters/games, offline cache (datasheets, mission cards, app files), or everything. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const $ = id => document.getElementById(id);
    const kb = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';
    const isAuthKey = k => /^sb-.*-auth-token/.test(k);
    function lsKeys(authToo) { const out = []; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (authToo || !isAuthKey(k)) out.push(k); } } catch (e) {} return out; }
    function lsSize(keys) { let n = 0; try { keys.forEach(k => n += (k.length + (localStorage.getItem(k) || '').length) * 2); } catch (e) {} return n; }
    async function cacheSize() { try { const e = await navigator.storage.estimate(); return e.usage || 0; } catch (err) { return 0; } }
    async function clearCaches() {
        try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) {}
        try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) {}
        try { ['bl_offline_factions', 'bl_offline_cards', 'bl_cards_ok'].forEach(k => localStorage.removeItem(k)); } catch (e) {}   // the "saved" marks must go with the files
        try { if (indexedDB.databases) for (const db of await indexedDB.databases()) if (db.name) indexedDB.deleteDatabase(db.name); } catch (e) {}
    }
    function clearSaved() { lsKeys(false).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); try { sessionStorage.clear(); } catch (e) {} }
    async function render() {
        const m = $('dm-root'); if (!m) return; const keys = lsKeys(false), used = await cacheSize();
        let saved = {}; try { saved = JSON.parse(localStorage.getItem('bl_offline_factions') || '{}'); } catch (e) {}
        const nSaved = Object.keys(saved).length, last = Math.max(0, ...Object.values(saved)), age = last ? Math.round((Date.now() - last) / 864e5) : null;
        const row = (id, ic, t, d, size, btn) => `<div class="dm-row"><i class="fa-solid ${ic}"></i><div><b>${t}</b><small>${d}</small><em>${size}</em></div><button id="${id}">${btn}</button></div>`;
        m.querySelector('.dm-card').innerHTML = `<div class="dm-top"><b>${S('Manage data on this device', 'Administrar datos en este dispositivo')}</b><button onclick="DATAMGR.close()" aria-label="Close">✕</button></div>
            ${nSaved ? row('dm-upd', 'fa-rotate', S('Update downloaded datasheets', 'Actualizar datasheets descargados'), S('Fetches the latest unit data again for the factions saved on this device.', 'Vuelve a descargar los datos más recientes de las facciones guardadas en este dispositivo.'), nSaved + ' ' + S('factions', 'facciones') + (age != null ? ' · ' + S('updated', 'actualizado') + ' ' + (age === 0 ? S('today', 'hoy') : age + ' ' + S('days ago', 'días')) : ''), S('Update', 'Actualizar')) : ''}
            ${row('dm-saved', 'fa-folder-open', S('Saved rosters, games & settings', 'Listas, partidas y ajustes guardados'), S('Everything the app stores in this browser. Cloud copies are not touched.', 'Todo lo que la app guarda en este navegador. Las copias en la nube no se tocan.'), keys.length + ' ' + S('items', 'elementos') + ' · ' + kb(lsSize(keys)), S('Delete', 'Borrar'))}
            ${row('dm-cache', 'fa-box-archive', S('Offline downloads', 'Descargas sin conexión'), S('Datasheets, mission cards and app files saved for offline use. They download again when needed.', 'Datasheets, cartas de misión y archivos de la app guardados sin conexión. Se vuelven a descargar cuando hacen falta.'), kb(used), S('Delete', 'Borrar'))}
            ${row('dm-all', 'fa-triangle-exclamation', S('Reset this device', 'Restablecer este dispositivo'), S('Deletes both of the above and logs you out. Like a fresh install.', 'Borra ambos y cierra tu sesión. Como una instalación nueva.'), '', S('Reset', 'Restablecer'))}`;
        const confirmDo = (msg, fn, reload) => async () => { if (!confirm(msg)) return; await fn(); if (window.toast) toast(S('Done', 'Listo')); if (reload) setTimeout(() => location.reload(), 600); else render(); };
        const upd = $('dm-upd'); if (upd) upd.onclick = async () => {
            if (!navigator.onLine) { if (window.toast) toast(S('You are offline.', 'Sin conexión.')); return; }
            upd.disabled = true; upd.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            try { await OFFLINE.updateAll(); } catch (e) {}
            const st = OFFLINE.state ? OFFLINE.state() : {}; if (window.toast) toast(st.progress || S('Done', 'Listo')); render();
        };
        $('dm-saved').onclick = confirmDo(S('Delete saved rosters, game history and settings from this device?', '¿Borrar las listas, el historial y los ajustes de este dispositivo?'), async () => clearSaved(), true);
        $('dm-cache').onclick = confirmDo(S('Delete offline downloads? You will need internet to use datasheets and mission cards again.', '¿Borrar las descargas sin conexión? Necesitarás internet para usar datasheets y cartas otra vez.'), clearCaches, true);
        $('dm-all').onclick = confirmDo(S('Reset this device? Saved data, offline downloads and your login on this device will be removed.', '¿Restablecer este dispositivo? Se borrarán los datos guardados, las descargas y tu sesión en este dispositivo.'), async () => { lsKeys(true).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); try { sessionStorage.clear(); } catch (e) {} await clearCaches(); }, true);
    }
    window.DATAMGR = {
        open: () => { let m = $('dm-root'); if (!m) { m = document.createElement('div'); m.id = 'dm-root'; m.innerHTML = '<div class="dm-card" role="dialog"></div>'; m.onclick = e => { if (e.target === m) DATAMGR.close(); }; document.body.appendChild(m); } m.classList.add('open'); render(); },
        close: () => { const m = $('dm-root'); if (m) m.classList.remove('open'); }
    };
})();
