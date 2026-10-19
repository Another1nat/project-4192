/* Export saved faction datasheets as a real PDF file (jsPDF, loaded on first use and cached for offline).
   Uses the same data the app shows (STATE.currentFactionData after preloadFactionData). */
(function () {
    const JSPDF_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const clean = s => String(s == null ? '' : s).replace(/\^\^|\*\*/g, '').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, '-').replace(/…/g, '...').replace(/[•●▪]/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/×/g, 'x')
        .replace(/[^\x20-\x7E -ÿ\n]/g, '').replace(/[ \t]+/g, ' ').trim();
    function loadLib() {
        if (window.jspdf) return Promise.resolve();
        return new Promise((res, rej) => { const s = document.createElement('script'); s.src = JSPDF_URL; s.onload = res; s.onerror = () => rej(new Error(S('The PDF library needs internet the first time. Connect once and try again.', 'La librería de PDF necesita internet la primera vez. Conéctate una vez e inténtalo de nuevo.'))); document.head.appendChild(s); });
    }
    const chr = (u, n) => { const p = (u.profiles || []).find(x => x.typeName === 'Unit' || x.typeName === 'Model'); const c = p && (p.characteristics || []).find(x => x.name === n); return c ? clean(c['$text']) : ''; };
    // semi-transparent row band (alternating rows / header) so lines are easy to follow
    function shade(doc, x, y, w, h, alpha, rgb) { doc.setGState(new doc.GState({ opacity: alpha })); doc.setFillColor(...(rgb || [70, 85, 110])); doc.rect(x, y, w, h, 'F'); doc.setGState(new doc.GState({ opacity: 1 })); doc.setFillColor(0); }
    function weaponsOf(u, melee) {
        return (u.profiles || []).filter(p => (melee ? /Melee Weapon/ : /Ranged Weapon/).test(p.typeName)).map(p => { const c = {}; (p.characteristics || []).forEach(x => c[x.name] = clean(x['$text'])); const kws = String(c.Keywords || '').trim(); return { name: clean(p.name) + (kws && kws !== '-' && !/\[/.test(p.name || '') ? ` [${kws}]` : ''), c }; });
    }
    function abilitiesOf(u) { return (u.profiles || []).filter(p => !/^(Unit|Model|Ranged Weapons?|Melee Weapons?|KeywordRule)$/.test(p.typeName || '')).map(p => { const g = p.parentGroupName || (/^Abilit/.test(p.typeName || '') ? '' : (p.typeName || '')); return { name: clean(p.name) + (g ? ` [${clean(g)}]` : ''), text: clean(profDesc(p)) }; }).filter(a => a.text); }
    function kwLine(kw, fk) { const k = (kw || []).map(clean).join(', '), f = (fk || []).map(clean).join(', '); return [k && 'KEYWORDS: ' + k, f && 'FACTION: ' + f].filter(Boolean).join('   '); }
    const sizeText = u => { const ov = getMFMOverride(u.name); const comps = [(u.comp || (ov && ov.comp))].concat(((u.options || (ov && ov.options)) || []).map(o => o.comp)).filter(Boolean); return comps.join(' / '); };

    function render(doc, factionName, units, state) {
        const W = 210, H = 297, M = 14, CW = W - 2 * M; let y = M;
        const foot = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`Project 4192 · ${factionName}`, M, H - 7); doc.text(String(doc.internal.getNumberOfPages()), W - M, H - 7, { align: 'right' }); doc.setTextColor(0); };
        const newPage = () => { foot(); doc.addPage(); y = M; };
        const need = h => { if (y + h > H - 14) newPage(); };
        const lines = (t, w, size) => { doc.setFontSize(size); return doc.splitTextToSize(t, w); };
        // faction title
        if (state.first) state.first = false; else newPage();
        doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(factionName, M, y + 6); y += 10;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110); doc.text(`${units.length} datasheets · ${new Date().toLocaleDateString()}`, M, y); doc.setTextColor(0); y += 8;
        units.forEach(u => {
            const stats = [['M', chr(u, 'M')], ['T', chr(u, 'T')], ['Sv', chr(u, 'Sv')], ['W', chr(u, 'W')], ['Ld', chr(u, 'LD') || chr(u, 'Ld')], ['OC', chr(u, 'OC')], ['Inv', chr(u, 'InSv')]].filter(x => x[1]);
            const rw = weaponsOf(u, false), mw = weaponsOf(u, true), ab = abilitiesOf(u);
            // measure
            let h = 7 + 6; const sizes = sizeText(u);
            [rw, mw].forEach(list => { if (list.length) h += 4.5 + list.reduce((s, w) => s + 4.2 * Math.max(1, lines(w.name, 62, 7.5).length), 0); });
            ab.forEach(a => { h += 3.8 * lines(`${a.name}: ${a.text}`, CW, 7.5).length + 1; });
            h += 5 + 8;
            need(Math.min(h, H - 2 * M - 10));
            // header
            doc.setDrawColor(40); doc.setLineWidth(0.4); doc.line(M, y, W - M, y); y += 5;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(clean(u.name), M, y);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(90);
            doc.text([u.role ? clean(u.role) : '', u.points ? `${u.points} pts` : '', sizes].filter(Boolean).join('  ·  '), W - M, y, { align: 'right' }); doc.setTextColor(0); y += 5.5;
            // stats
            shade(doc, M, y - 3.6, W - 2 * M, 5.2, 0.1, [200, 150, 60]); let x = M; stats.forEach(([k, v]) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(k, x, y); const kw = doc.getTextWidth(k) + 1.2; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(v, x + kw, y); x += kw + doc.getTextWidth(v) + 6; }); y += 5;
            // weapons
            const wtab = (title, list, skill) => {
                if (!list.length) return; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100);
                shade(doc, M, y - 3, W - 2 * M, 4.4, 0.28); const cols = [['Range', 84], ['A', 102], [skill, 112], ['S', 124], ['AP', 134], ['D', 146]]; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100); doc.text(title.toUpperCase(), M, y); cols.forEach(([t, cx]) => doc.text(t, cx, y)); doc.setTextColor(0); y += 3.8;
                list.forEach((w, wi) => { const nl = lines(w.name, 62, 7.5); if (wi % 2 === 0) shade(doc, M, y - 3, W - 2 * M, 4.2 * nl.length, 0.12); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(nl, M + 1, y); const c = w.c;
                    [[c.Range, 84], [c.A, 102], [c.BS || c.WS, 112], [c.S, 124], [c.AP, 134], [c.D, 146]].forEach(([v, cx]) => doc.text(String(v == null ? '' : v), cx, y)); y += 4.2 * nl.length; });
                y += 0.8;
            };
            wtab('Ranged weapons', rw, 'BS'); wtab('Melee weapons', mw, 'WS');
            // abilities
            ab.forEach((a, ai) => { const nl = lines(`${a.name}: ${a.text}`, CW, 7.5); need(3.8 * nl.length + 2); if (ai % 2 === 0) shade(doc, M, y - 2.8, W - 2 * M, 3.8 * nl.length + 0.6, 0.08); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
                doc.text(nl, M, y); y += 3.8 * nl.length + 1; });
            { const [kk, ff] = unitKeywords(u), kl = kwLine(kk, ff); if (kl) { const nl = lines(kl, CW, 6.8); need(3.4 * nl.length + 2); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(90); doc.text(nl, M, y + 0.5); doc.setTextColor(0); y += 3.4 * nl.length + 1; } }
            y += 3;
        });
    }
    async function exportFactions(names, onProgress) {
        await loadLib(); const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent'); let done = 0, last = 0;
        for (const name of names) {
            const f = FACTIONS.find(x => x.name === name); if (!f) continue;
            if (onProgress) onProgress(`${name} (${done + 1}/${names.length})`, done / names.length);
            try { const t = document.getElementById('faction-title'); if (t) t.textContent = ''; await preloadFactionData(f); } catch (e) { continue; }
            const units = (STATE.currentFactionData || []).slice().sort((a, b) => a.name.localeCompare(b.name)); if (!units.length) continue;
            const ds = {}; units.forEach(u => { try { ds[u.id] = rosterSnap(u); } catch (e) {} });
            const dets = (STATE.currentFactionDetachments || []).map(d => d.id);
            const pseudo = { name: f.name + ' datasheets', faction: f, pointsLimit: 0, detachments: dets, units: units.map(u => ({ id: u.id, name: u.name, pts: u.points || 0 })), ds };
            await exportRoster(pseudo, { doc, addPage: done > 0, reference: true, partOf: true, noCore: true }); done++; last = doc.internal.getNumberOfPages();
            await new Promise(r => setTimeout(r, 0));
        }
        if (accent) document.documentElement.style.setProperty('--accent', accent.trim());
        if (!done) throw new Error(S('No datasheets were available.', 'No había datasheets disponibles.'));
        try { const cs = await (await fetch('data/core_stratagems.json' + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : ''))).json(); if (cs.length) { doc.addPage(); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text('CORE STRATAGEMS', 14, 20); let yy = 28; doc.setFontSize(8);
            cs.forEach(x => { const body = `${x.name} (${x.cost}CP)\nWHEN: ${x.turn}\nTARGET: ${x.target}\nEFFECT: ${x.effect}`; const tl = doc.splitTextToSize(clean(body), 180); if (yy + tl.length * 3.6 > 285) { doc.addPage(); yy = 20; } doc.setFont('helvetica', 'normal'); doc.text(tl, 14, yy); yy += tl.length * 3.6 + 3; }); } } catch (e) {}
        const n = doc.internal.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`Project 4192 · ${names.length === 1 ? names[0] : 'Datasheets'} · ${new Date().toLocaleDateString()}`, 14, 290); doc.setFontSize(6.2); doc.text(clean((window.FAN_NOTICE || {}).en || 'Project 4192'), 14, 293.5); doc.setFontSize(7.5); doc.text(`${i} / ${n}`, 196, 290, { align: 'right' }); }
        doc.save(`project-4192-datasheets-${names.length === 1 ? names[0].toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'all'}.pdf`); return n;
    }
    window.PDFEXPORT = { lib: loadLib, clean, exportFactions, prefetch: () => { try { fetch(JSPDF_URL).catch(() => {}); } catch (e) {} } };

    // ───────────── roster → PDF (faction banner, outlined title, detachments with DP colours, full unit datasheets) ─────────────
    function loadBanner(url, w, h) {   // crop-to-cover into a JPEG data URL
        return new Promise(res => { const i = new Image(); i.onload = () => { try { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'), s = Math.max(w / i.width, h / i.height); x.drawImage(i, (w - i.width * s) / 2, (h - i.height * s) / 2, i.width * s, i.height * s); res(c.toDataURL('image/jpeg', 0.85)); } catch (e) { res(null); } }; i.onerror = () => res(null); i.src = url; });
    }
    const hexRgb = h => { const m = String(h || '#555').replace('#', ''); const n = parseInt(m.length === 3 ? m.replace(/./g, '$&$&') : m, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    async function exportRoster(roster, opts) {
        await loadLib(); const { jsPDF } = window.jspdf; opts = opts || {}; const doc = opts.doc || new jsPDF({ unit: 'mm', format: 'a4'});
        if (opts.doc && doc.internal.getNumberOfPages() > 0 && opts.addPage) doc.addPage();
        const W = 210, H = 297, M = 14, CW = W - 2 * M; let y = 0;
        const units = roster.units || [], total = units.reduce((s, u) => s + (+u.pts || 0), 0), limit = roster.pointsLimit || 0;
        // banner
        const img = await loadBanner((roster.faction && roster.faction.banner) || 'assets/banners/0.jpg', 1260, 264);
        if (img) doc.addImage(img, 'JPEG', 0, 0, W, 44); else { doc.setFillColor(23, 34, 62); doc.rect(0, 0, W, 44, 'F'); }
        doc.setGState(new doc.GState({ opacity: 0.5 })); doc.setFillColor(0, 0, 0); doc.rect(0, 0, W, 44, 'F'); doc.setGState(new doc.GState({ opacity: 1 }));
        const outlined = (txt, x, yy, size, opts) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(size); const o = opts || {};
            doc.setGState(new doc.GState({ opacity: 0.55 })); doc.setTextColor(0, 0, 0); doc.text(txt, x + 0.35, yy + 0.35, o); doc.text(txt, x + 0.15, yy + 0.5, o); doc.setGState(new doc.GState({ opacity: 1 }));
            doc.setTextColor(255, 255, 255); doc.text(txt, x, yy, o); };
        outlined(clean((roster.faction && roster.faction.name) || '').toUpperCase(), M, 15, 10);
        let rs = 32; doc.setFont('helvetica', 'bold'); while (rs > 16) { doc.setFontSize(rs); if (doc.getTextWidth(clean(roster.name)) < CW - 70) break; rs -= 1; }
        outlined(clean(roster.name), M, 30, rs);
        if (opts.reference) { outlined(S('DATASHEETS', 'DATASHEETS'), W - M, 28, 16, { align: 'right' }); outlined(`${units.length} ${units.length === 1 ? 'datasheet' : 'datasheets'}`, W - M, 37, 11, { align: 'right' }); }
        else { outlined(`${total} / ${limit} pts`, W - M, 28, 20, { align: 'right' });
        outlined(`${units.length} ${units.length === 1 ? 'unit' : 'units'}`, W - M, 37, 11, { align: 'right' }); }
        doc.setTextColor(0); doc.setDrawColor(0); y = 54;
        const newPage = () => { doc.addPage(); y = M; }, need = h => { if (y + h > H - 16) newPage(); };
        const lines = (t, w, size) => { doc.setFontSize(size); return doc.splitTextToSize(t, w); };
        const heading = t => { need(14); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90); doc.text(t, M, y); doc.setTextColor(0); doc.setDrawColor(150); doc.setLineWidth(0.2); doc.line(M, y + 1.5, W - M, y + 1.5); y += 6; };
        // titled paragraph: bold name (+ right-side tag), then wrapped body; splits across pages
        const para = (name, tag, body, o) => { o = o || {}; const x0 = M + (o.indent || 0), w = CW - (o.indent || 0), fs = o.size || 7.4, lh = fs * 0.45;
            need(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(o.nsize || 8); doc.setTextColor(40); doc.text(clean(name), x0, y); if (tag) { doc.setFont('helvetica', 'normal'); doc.setTextColor(110); doc.text(clean(tag), W - M, y, { align: 'right' }); } y += 3.8;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(fs); doc.setTextColor(70);
            clean(body || '').split('\n').forEach(par => { lines(par, w, fs).forEach(l => { need(lh + 1); doc.text(l, x0, y); y += lh; }); });
            doc.setTextColor(0); y += o.gap == null ? 1.8 : o.gap; };
        const stratBlock = x => { para(`${x.name}`, `${x.cost}CP${x.category ? ' · ' + ({ battleTactic: 'Battle Tactic', strategicPloy: 'Strategic Ploy', epicDeed: 'Epic Deed', wargear: 'Wargear' }[x.category] || '') : ''}`, `WHEN: ${x.turn}\nTARGET: ${x.target}\nEFFECT: ${x.effect}${x.restriction ? '\nRESTRICTIONS: ' + x.restriction : ''}`, { indent: 3, size: 7.2, nsize: 7.8, gap: 1.4 }); };
        const meta = (typeof STATE !== 'undefined' && STATE.currentFactionMeta) || {};
        // detachments
        const all = (typeof STATE !== 'undefined' && STATE.currentFactionDetachments) || [], sel = all.filter(d => (roster.detachments || []).includes(d.id));
        const maxDp = limit > 2000 ? 4 : limit > 1000 ? 3 : 2, used = sel.reduce((s, d) => s + (parseInt(d.dpCost) || 0), 0);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(90); doc.text(`DETACHMENTS  ${used} / ${maxDp} DP`, M, y); doc.setTextColor(0); y += 4;
        if (!sel.length) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(140); doc.text('No detachment selected', M, y + 3); doc.setTextColor(0); y += 8; }
        sel.forEach(d => {
            need(12); const col = hexRgb(typeof getFDColor === 'function' ? getFDColor(d.forceDisposition) : '#555'), dp = parseInt(d.dpCost) || 0;
            doc.setFillColor(...col); doc.rect(M, y, 2.2, 10, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(clean(d.name), M + 5, y + 4.5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(95); doc.text(clean(d.forceDisposition || ''), M + 5, y + 8.6); doc.setTextColor(0);
            doc.setFillColor(...col); doc.roundedRect(W - M - 16, y + 1, 16, 7, 1.6, 1.6, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(255); doc.text(`${dp} DP`, W - M - 8, y + 5.8, { align: 'center' }); doc.setTextColor(0);
            y += 12.5;
            // what the detachment does (text from the faction data)
            if (window.DETINFO) DETINFO.enrich(d);
            if (d.info && d.info.r && d.info.r.length) {
                d.info.r.forEach(([rn, rt]) => {
                    const body = clean(rt).replace(/\n•/g, '\n-').replace(/\n{2,}/g, '\n'); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
                    const tl = doc.splitTextToSize(body, CW - 6); need(5 + Math.min(tl.length, 6) * 3.3);
                    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(60); doc.text(clean(rn), M + 3, y); y += 3.8;
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(70);
                    tl.forEach(l => { need(3.4); doc.text(l, M + 3, y); y += 3.3; }); doc.setTextColor(0); y += 1.8;
                });
            }
            // enhancements of this detachment (cost, full text, who carries it)
            { const taken = {}; units.forEach(u => { if (u.enh && u.enh.detId === d.id) (taken[u.enh.name] = taken[u.enh.name] || []).push(u.name); });
              const ens = d.enhancements || []; if (ens.length) { need(8); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8); doc.setTextColor(150, 90, 10); doc.text('ENHANCEMENTS', M + 3, y); doc.setTextColor(0); y += 4;
                ens.forEach(e => { const tx = window.DETINFO ? DETINFO.enhText(DETINFO.enrich(d), e.name) || e.description : e.description; para(e.name + (taken[e.name] ? `  [TAKEN by ${taken[e.name].join(', ')}]` : ''), `${e.cost} pts`, tx || '', { indent: 3, size: 7.2, nsize: 7.8, gap: 1.2 }); }); y += 1; } }
            // stratagems of this detachment, in full
            { const st = (d.d39 && d.d39.stratagems) || []; if (st.length) { need(8); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.8); doc.setTextColor(60, 90, 150); doc.text(`DETACHMENT STRATAGEMS (${st.length})`, M + 3, y); doc.setTextColor(0); y += 4; st.forEach(stratBlock); y += 1; } }
        });
        if (window.MFM_MANUAL && roster.faction && roster.faction.name === MFM_MANUAL.faction && units.some(u => { const o = window.getMFMOverride && getMFMOverride(u.name); return o && o.manual; })) { y += 2; para('Note on points', '', MFM_MANUAL.note.en, { size: 7.2, nsize: 7.8, gap: 2 }); }
        if ((meta.rules || []).length) { y += 3; heading(`${clean(meta.name || (roster.faction && roster.faction.name) || 'FACTION').toUpperCase()} ARMY RULES`); meta.rules.forEach(r => para(r.name, '', r.description, { indent: 0, size: 7.4, nsize: 8.4 })); }
        y += 3; heading(opts.reference ? 'DATASHEETS' : 'ARMY LIST');
        // units
        const group = (list, key) => { const m = new Map(); list.forEach(x => { const k = key(x); const e = m.get(k); if (e) e.count++; else m.set(k, Object.assign({ count: 1 }, x)); }); return [...m.values()]; };
        units.forEach(u => {
            const s = (roster.ds || {})[u.id] || { stats: [], weapons: [], abilities: [] }, info = (typeof rosterUnitSizes === 'function') ? rosterUnitSizes(u.name) : null;
            const size = info && info.sizes[Math.min(u.sizeIdx || 0, info.sizes.length - 1)] ? info.sizes[Math.min(u.sizeIdx || 0, info.sizes.length - 1)].comp : '';
            const stats = group(s.stats || [], x => JSON.stringify(x.c)), rw = group((s.weapons || []).filter(w => w.t === 'r'), w => w.n + JSON.stringify(w.c)), mw = group((s.weapons || []).filter(w => w.t === 'm'), w => w.n + JSON.stringify(w.c));
            const wname = w => clean(w.n + (w.count > 1 ? ` x${w.count}` : '') + (w.k && w.k.length ? ` [${w.k.join(', ')}]` : ''));
            let h = 8 + (u.enh ? 5 : 0) + stats.length * 5.5; [rw, mw].forEach(l => { if (l.length) h += 4.5 + l.reduce((t, w) => t + 4.2 * Math.max(1, lines(wname(w), 64, 7.5).length), 0); });
            (s.abilities || []).forEach(a => { h += 3.8 * lines(clean(`${a.g ? '[' + a.g + '] ' : ''}${a.n}: ${a.d}`), CW, 7.5).length + 1; }); h += 8;
            need(Math.min(h + 4, H - 2 * M - 8));
            doc.setDrawColor(60); doc.setLineWidth(0.35); doc.line(M, y, W - M, y); y += 5;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.text(clean(u.name), M, y);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(`${u.pts} pts`, W - M, y, { align: 'right' });
            if (size) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text(clean(size), W - M - 18, y, { align: 'right' }); doc.setTextColor(0); }
            y += 5.5;
            if (u.enh) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(150, 90, 10); doc.text(clean(`Enhancement: ${u.enh.name} (+${u.enh.cost} pts)`), M, y); doc.setTextColor(0); y += 4.4;
                const ed = sel.find(x => x.id === u.enh.detId), et = ed && window.DETINFO ? DETINFO.enhText(DETINFO.enrich(ed), u.enh.name) : '';
                if (et) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.setTextColor(95); doc.splitTextToSize(clean(et).replace(/\n+/g, ' '), CW - 4).forEach(l => { need(3.3); doc.text(l, M + 2, y); y += 3.2; }); doc.setTextColor(0); y += 1.2; } else y += 0.6; }
            stats.forEach(st => { shade(doc, M, y - 3.6, W - 2 * M, 5.2, 0.1, [200, 150, 60]); let x = M; if (stats.length > 1 && st.n) { doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(110); doc.text(clean(st.n) + (st.count > 1 ? ` x${st.count}` : ''), x, y); doc.setTextColor(0); x += doc.getTextWidth(clean(st.n) + (st.count > 1 ? ` x${st.count}` : '')) + 6; }
                st.c.forEach(([k, v]) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(clean(k), x, y); const kw = doc.getTextWidth(clean(k)) + 1.2; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(clean(v), x + kw, y); x += kw + doc.getTextWidth(clean(v)) + 5.5; }); y += 5.5; });
            const tab = (title, list, skill) => {
                if (!list.length) return; doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(100); shade(doc, M, y - 3, W - 2 * M, 4.4, 0.28); doc.text(title, M, y);
                [['Range', 84], ['A', 102], [skill, 112], ['S', 124], ['AP', 134], ['D', 146]].forEach(([t, cx]) => doc.text(t, cx, y)); doc.setTextColor(0); y += 3.8;
                list.forEach((w, wi) => { const nl = lines(wname(w), 64, 7.5); need(4.2 * nl.length + 1); if (wi % 2 === 0) shade(doc, M, y - 3, W - 2 * M, 4.2 * nl.length, 0.12); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(nl, M + 1, y);
                    [[w.c[0], 84], [w.c[1], 102], [w.c[2], 112], [w.c[3], 124], [w.c[4], 134], [w.c[5], 146]].forEach(([v, cx]) => doc.text(clean(v), cx, y)); y += 4.2 * nl.length; }); y += 0.8;
            };
            tab('RANGED WEAPONS', rw, 'BS'); tab('MELEE WEAPONS', mw, 'WS');
            (s.abilities || []).forEach((a, ai) => { const nl = lines(clean(`${a.g ? '[' + a.g + '] ' : ''}${a.n}: ${a.d}`), CW, 7.5); need(3.8 * nl.length + 2); if (ai % 2 === 0) shade(doc, M, y - 2.8, W - 2 * M, 3.8 * nl.length + 0.6, 0.08); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.text(nl, M, y); y += 3.8 * nl.length + 1; });
            { const lo = blLoadoutData({ name: u.name, compositions: s.compositions, options: s.options }, roster.faction && roster.faction.name);
              if (s.comp) para('Unit composition', '', s.comp, { size: 7, nsize: 7.4, gap: 1 });
              if (lo.rows.length) { need(10); doc.setFont('helvetica', 'bold'); doc.setFontSize(7.2); doc.setTextColor(60); doc.text('Models & points', M, y); doc.setTextColor(0); y += 3.6;
                lo.rows.forEach(r => r.models.forEach((m, i) => { need(4); if (i === 0) { doc.setDrawColor(200); doc.setLineWidth(0.1); doc.line(M, y - 2.8, W - M, y - 2.8); } doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2); doc.text(clean(m.name), M + 2, y); doc.text(String(m.count), M + 100, y); if (i === 0) { doc.setFont('helvetica', 'bold'); doc.text(`${r.pts} pts`, W - M, y, { align: 'right' }); } y += 3.6; })); y += 1; }
              { const gear = (s.models || []).filter(m => (m.equipped || []).length || (m.optional || []).length); if (gear.length) para('What each model carries', '', gear.map(m => `${m.name}: ${(m.equipped || []).map(e => e.item + (e.count > 1 ? ' x' + e.count : '')).join(', ') || '-'}${(m.optional || []).length ? '  [can also take: ' + m.optional.join(', ') + ']' : ''}`).join('\n'), { size: 6.9, nsize: 7.4, gap: 1 }); }
              if (lo.options.length) para('Wargear options', '', lo.options.map(o => (o.model ? '[' + o.model + '] ' : '') + o.text).join('\n'), { size: 6.9, nsize: 7.4, gap: 1.2 }); }
            { const dd = (window.RULES && RULES.dsOf(u)) || {};
              const wgs = (u.wg || []); if (wgs.length) para('Wargear taken', '', wgs.join(', '), { size: 7.2, nsize: 7.6, gap: 1 });
              if ((s.kr || []).length) para('Weapon rules', '', s.kr.map(k => `${k.n}: ${k.d}`).join('\n'), { size: 6.8, nsize: 7.4, gap: 1 });
              if ((dd.leads || []).length) para('Can lead / be attached to', '', dd.leads.map(g => (g.type === 'support' ? 'Support: ' : 'Leader: ') + [].concat(g.units || [], (g.keywords || []).map(k => k + ' units')).join(', ') + (g.onlyIn ? ` (only with ${g.onlyIn})` : '') + (g.notIn ? ` (not with ${g.notIn})` : '')).join('\n'), { size: 6.8, nsize: 7.4, gap: 1 });
              if ((dd.ledBy || []).length) para('Can be led by', '', dd.ledBy.join(', '), { size: 6.8, nsize: 7.4, gap: 1 });
              (dd.damage || []).forEach(x => para(x.name, '', x.rules, { size: 6.8, nsize: 7.4, gap: 1 }));
              (dd.rules || []).forEach(x => para(x.name, '', x.description, { size: 6.8, nsize: 7.4, gap: 1 })); }
            { const kl = kwLine(s.kw, s.fk); if (kl) { const nl = lines(clean(kl), CW, 6.8); need(3.4 * nl.length + 2); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.8); doc.setTextColor(90); doc.text(nl, M, y + 0.5); doc.setTextColor(0); y += 3.4 * nl.length + 1; } }
            y += 3;
        });
        try { const cs = await (await fetch('data/core_stratagems.json' + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : ''))).json();
            if (cs.length && !opts.noCore) { doc.addPage(); y = M; heading('CORE STRATAGEMS (available to every army)'); cs.forEach(stratBlock); } } catch (e) {}
        if (opts.partOf) return doc.internal.getNumberOfPages();
        const n = doc.internal.getNumberOfPages();
        for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120); doc.text(`Project 4192 · ${clean(roster.name)} · ${new Date().toLocaleDateString()}`, M, H - 8); doc.setFontSize(6.2); doc.text(clean((window.FAN_NOTICE || {}).en || 'Project 4192'), M, H - 4.6); doc.setFontSize(7.5); doc.text(`${i} / ${n}`, W - M, H - 8, { align: 'right' }); }
        const fname = `roster-${clean(roster.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'army'}.pdf`;
        if (opts && opts.blob) return { blob: doc.output('blob'), name: fname, pages: n };   // for sharing instead of saving
        doc.save(fname); return n;
    }
    window.PDFEXPORT.roster = exportRoster;
    window.exportToPDF = async function () {
        const r = typeof currentActiveRoster !== 'undefined' ? currentActiveRoster : null; if (!r) return;
        if (!r.units || !r.units.length) { if (window.toast) toast(S('Add some units first.', 'Agrega unidades primero.')); return; }
        try { if (window.toast) toast(S('Preparing PDF…', 'Preparando PDF…')); const pages = await exportRoster(r); if (window.toast) toast(S(`PDF ready ✔ (${pages} pages)`, `PDF listo ✔ (${pages} páginas)`)); }
        catch (e) { if (window.toast) toast('⚠ ' + e.message); else alert(e.message); }
    };
})();
