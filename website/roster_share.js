/* Roster share link + import. A link is  <site>/#r=<payload>  where payload is the roster (name, faction, points, detachments, units)
   — never the datasheet snapshots (they are rebuilt when the roster is opened). Anything coming from a link is untrusted: it is whitelisted,
   length-limited and stripped of markup characters, and nothing is added until the person confirms. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const CUR = () => (typeof currentActiveRoster !== 'undefined' ? currentActiveRoster : null);
    const toast = m => (typeof window.toast === 'function' ? window.toast(m) : alert(m));
    const b64e = bytes => { let s = ''; bytes.forEach(b => s += String.fromCharCode(b)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
    const b64d = t => { const s = atob(String(t).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
    async function pack(obj) {
        const raw = new TextEncoder().encode(JSON.stringify(obj));
        if (window.CompressionStream) { try { const cs = new CompressionStream('deflate-raw'), w = cs.writable.getWriter(); w.write(raw).catch(() => {}); w.close().catch(() => {}); return 'z' + b64e(new Uint8Array(await new Response(cs.readable).arrayBuffer())); } catch (e) {} }
        return 'p' + b64e(raw);
    }
    async function unpack(t) {
        const kind = t[0], bytes = b64d(t.slice(1));
        if (kind === 'z') { const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(bytes).catch(() => {}); w.close().catch(() => {}); return JSON.parse(new TextDecoder().decode(new Uint8Array(await new Response(ds.readable).arrayBuffer()))); }
        if (kind === 'p') return JSON.parse(new TextDecoder().decode(bytes));
        throw new Error('format');
    }
    // ---- cleaning (everything below is untrusted input) ----
    const txt = (s, n) => String(s == null ? '' : s).replace(/[<>"`\\\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, n || 80);
    const key = s => String(s == null ? '' : s).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
    const num = (v, lo, hi, d) => { v = Number(v); return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
    function clean(p) {
        if (!p || typeof p !== 'object' || p.v !== 1) throw new Error('format');
        const fac = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(f => f.name === p.f); if (!fac) throw new Error(S('Unknown faction in that link.', 'Facción desconocida en ese enlace.'));
        const units = (Array.isArray(p.u) ? p.u : []).slice(0, 80).map(u => {
            if (!u || typeof u !== 'object') return null; const o = { id: key(u.id) || String(Date.now() + Math.random()).replace('.', ''), name: txt(u.name, 80), pts: num(u.pts, 0, 5000, 0), sizeIdx: num(u.sizeIdx, 0, 20, 0), role: txt(u.role, 40), w: 0 };
            if (!o.name) return null;
            if (Array.isArray(u.wg)) o.wg = u.wg.slice(0, 20).map(x => txt(x, 80)).filter(Boolean);
            if (u.enh && typeof u.enh === 'object' && u.enh.name) o.enh = { name: txt(u.enh.name, 80), cost: num(u.enh.cost, 0, 500, 0), detId: key(u.enh.detId) };
            return o;
        }).filter(Boolean);
        return { name: txt(p.n, 60) || fac.name, faction: fac, pointsLimit: num(p.p, 100, 10000, 2000), detachments: (Array.isArray(p.d) ? p.d : []).slice(0, 6).map(key).filter(Boolean), units };
    }
    const payload = r => ({ v: 1, n: r.name, f: r.faction && r.faction.name, p: r.pointsLimit, d: r.detachments || [], u: (r.units || []).map(u => { const o = { id: u.id, name: u.name, pts: u.pts, sizeIdx: u.sizeIdx || 0, role: u.role || '' }; if (u.wg && u.wg.length) o.wg = u.wg; if (u.enh) o.enh = { name: u.enh.name, cost: u.enh.cost, detId: u.enh.detId }; return o; }) });

    function ensure() {
        if ($('rs-root')) return;
        const m = document.createElement('div'); m.id = 'rs-root'; m.innerHTML = '<div class="br-card" role="dialog"></div>';
        m.onclick = e => { if (e.target === m) RSHARE.close(); }; document.body.appendChild(m);
    }
    const card = html => { ensure(); const m = $('rs-root'); m.querySelector('.br-card').innerHTML = html; m.classList.add('open'); };
    let pending = null;
    function confirmView(r) {
        pending = r; const pts = r.units.reduce((s, u) => s + (u.pts || 0), 0);
        card(`<div class="br-top"><b>${S('Import this roster?', '¿Importar esta lista?')}</b><button class="br-x" onclick="RSHARE.close()" aria-label="Close">✕</button></div>
            <div class="rs-sum"><b>${esc(r.name)}</b><span>${esc(r.faction.name)} · ${r.pointsLimit} pts limit · ${r.units.length} ${S('units', 'unidades')} · ~${pts} pts</span>
            <div class="rs-list">${r.units.slice(0, 40).map(u => `<div>${esc(u.name)}${u.enh ? ' ★' : ''}<i>${u.pts} pts</i></div>`).join('')}${r.units.length > 40 ? `<div>… +${r.units.length - 40}</div>` : ''}</div></div>
            <div class="br-note">${S('It is added as a new roster on this device; yours are not touched.', 'Se agrega como una lista nueva en este dispositivo; las tuyas no se tocan.')}</div>
            <button class="br-go" onclick="RSHARE.accept()"><i class="fa-solid fa-file-import"></i> ${S('Add to my rosters', 'Agregar a mis listas')}</button>`);
    }
    async function fromText(t) {
        t = String(t || '').trim(); const m = /[#&?]?r=([zp][A-Za-z0-9_-]+)/.exec(t) || /^([zp][A-Za-z0-9_-]{8,})$/.exec(t); if (!m) throw new Error(S('That does not look like a Project 4192 roster link.', 'Eso no parece un enlace de lista de Project 4192.'));
        return clean(await unpack(m[1]));
    }
    window.RSHARE = {
        pack, unpack,                                   // also used to move saved data from the old address (offline.js)
        async link(r) { return location.origin + location.pathname.replace(/index\.html$/, '') + '#r=' + await pack(payload(r || currentActiveRoster)); },
        // Share menu: the roster as a PDF (WhatsApp / any app) or as a link
        menu(anchor) {
            const r = CUR(); if (!r) return;
            if (!r.units || !r.units.length) { toast(S('Add some units first.', 'Agrega unidades primero.')); return; }
            SHAREMENU.openItems(anchor, [
                { ic: 'fa-brands fa-whatsapp', t: 'WhatsApp', sub: S('Send the roster PDF', 'Enviar el PDF de la lista'), fn: b => RSHARE.pdf('whatsapp', b) },
                { ic: 'fa-solid fa-share-nodes', t: S('More apps…', 'Más apps…'), sub: S('PDF to Mail, Drive, AirDrop…', 'PDF a Correo, Drive, AirDrop…'), fn: b => RSHARE.pdf('share', b) },
                { ic: 'fa-solid fa-link', t: S('Copy link', 'Copiar enlace'), sub: S('Opens this roster in Project 4192', 'Abre esta lista en Project 4192'), fn: () => RSHARE.copyLink() }
            ]);
        },
        async pdf(mode, btn) {
            const r = CUR(); if (!r || !window.PDFEXPORT) return; const old = btn && btn.innerHTML; if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>'; }
            try {
                toast(S('Preparing PDF…', 'Preparando PDF…'));
                const out = await PDFEXPORT.roster(r, { blob: true }), file = new File([out.blob], out.name, { type: 'application/pdf' }), title = r.name + ' · Project 4192';
                if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title, text: title }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                const a = document.createElement('a'); a.href = URL.createObjectURL(out.blob); a.download = out.name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);   // no file sharing here (desktop): save it, then open WhatsApp
                toast(S('PDF saved. Attach it in WhatsApp.', 'PDF guardado. Adjúntalo en WhatsApp.'));
                if (mode === 'whatsapp') { const link = await this.link(r); setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(title + ' ' + link), '_blank'), 700); }
            } catch (e) { toast('⚠ ' + (e.message || e)); } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
        },
        async copyLink() {
            const r = CUR(); if (!r) return; const url = await this.link(r);
            try { await navigator.clipboard.writeText(url); toast(S('Link copied', 'Enlace copiado')); } catch (e) { prompt(S('Copy this link:', 'Copia este enlace:'), url); }
        },
        openImport() {
            card(`<div class="br-top"><b>${S('Import a roster', 'Importar una lista')}</b><button class="br-x" onclick="RSHARE.close()" aria-label="Close">✕</button></div>
                <div class="br-note" style="margin-top:0">${S('Paste a Project 4192 roster link someone sent you.', 'Pega un enlace de lista de Project 4192 que te hayan enviado.')}</div>
                <input id="rs-in" class="br-in" style="margin-top:0" placeholder="https://…/#r=…" autocomplete="off" autocapitalize="off" spellcheck="false">
                <div class="br-err" id="rs-err"></div><button class="br-go" onclick="RSHARE.readInput()">${S('Continue', 'Continuar')}</button>`);
            setTimeout(() => { const i = $('rs-in'); if (i) i.focus(); }, 100);
        },
        async readInput() { try { confirmView(await fromText(($('rs-in') || {}).value)); } catch (e) { const el = $('rs-err'); if (el) el.textContent = e.message === 'format' ? S('That link is not valid.', 'Ese enlace no es válido.') : e.message; } },
        accept() {
            const r = pending; if (!r) return; pending = null;
            const roster = { id: Date.now().toString(), name: r.name, pointsLimit: r.pointsLimit, faction: r.faction, units: r.units, detachments: r.detachments };
            STATE.rosters.push(roster); saveRosters(); this.close();
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
            toast(S('Roster imported', 'Lista importada')); openRosterBuilder(roster);
        },
        close() { const m = $('rs-root'); if (m) m.classList.remove('open'); pending = null; },
        async fromHash() {
            let h = location.hash || ''; if (!/^#r=/.test(h) && !this.__done && /^r=/.test(window.__initialView || '')) h = '#' + window.__initialView;   // the app clears the hash at startup but remembers it
            this.__done = true; if (!/^#r=/.test(h)) return;
            try { confirmView(await fromText(h)); } catch (e) { toast(S('That roster link is not valid.', 'Ese enlace de lista no es válido.')); }
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        }
    };
    function decorate() {
        const bar = document.querySelector('#view-rosters .dashboard-actions');
        if (bar && !$('rs-share-btn')) { const b = document.createElement('button'); b.id = 'rs-share-btn'; b.className = 'rs-btn'; b.innerHTML = '<i class="fa-solid fa-link"></i> <span class="lbl-l">' + S('SHARE LINK', 'COMPARTIR') + '</span><span class="lbl-s">' + S('Share', 'Compartir') + '</span>'; b.onclick = () => RSHARE.menu(b); bar.insertBefore(b, bar.firstChild); }
        const setup = document.querySelector('#view-new-roster .roster-setup-container');
        if (setup && !$('rs-import-btn')) { const b = document.createElement('button'); b.id = 'rs-import-btn'; b.className = 'rs-import'; b.innerHTML = '<i class="fa-solid fa-file-import"></i> ' + S('Import a roster from a link', 'Importar una lista desde un enlace'); b.onclick = () => RSHARE.openImport(); setup.insertBefore(b, setup.firstChild); }
    }
    document.addEventListener('keydown', e => { if (e.key === 'Escape') RSHARE.close(); });
    function boot() { decorate(); setInterval(decorate, 1500); setTimeout(() => RSHARE.fromHash(), 600); window.addEventListener('hashchange', () => RSHARE.fromHash()); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 500)); else setTimeout(boot, 500);
})();
