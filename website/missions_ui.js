/* Mission sheet: read any Primary / Secondary mission in English or Spanish and see the card image.
   Language is shared with the Game Tracker (localStorage gdm_lang). Presentation only. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const setLang = l => { try { localStorage.setItem('gdm_lang', l); } catch (e) {} };
    const S = (en, es) => lang() === 'es' ? es : en;
    const tr = s => (lang() === 'es' && window.MISSION_ES && window.MISSION_ES[s]) || s;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const key = s => String(s).toLowerCase();
    const GD = window.GDM_DATA || {}, COL = {}, GROUPS = {};
    (GD.factions || []).forEach((t, i) => { GROUPS[t] = (GD.matrix || [])[i] || []; COL[t] = (window.BL_TYPE_PALETTE || ['#3a4556'])[i % 7]; });
    let st = { type: 'primary', name: '', role: 'attacker', tab: 'text', face: 'front' };

    function find(o, k) { k = key(k); const h = Object.keys(o || {}).find(x => key(x) === k); return h ? o[h] : null; }
    function card() {
        const t = window.MISSION_TEXT || { primary: {}, secondary: {} };
        return st.type === 'primary' ? find(t.primary, st.name) : (find(t.secondary, st.name + '|' + st.role) || find(t.secondary, st.name + '|defender'));
    }
    function paths() {
        const f = key(st.name).replace(/ /g, '-').replace(/'s/g, '-s').replace(/'/g, '');
        const ff = f === 'secure-no-mans-land' ? 'secure-no-man-s-land' : f;
        const base = st.type === 'primary' ? 'assets/primary/' + key(st.name).replace(/ /g, '-').replace(/'/g, '') : 'assets/secondary/' + st.role + '/' + ff;
        return [base + '.png', base + '-back.png'];
    }
    function color() { for (const g in GROUPS) if (GROUPS[g].includes(st.name)) return COL[g]; return st.type === 'secondary' ? '#8c2a2a' : '#a6843c'; }

    // ── images: png first, svg fallback ──
    const variants = u => { const b = u.replace(/\.(png|svg)$/, ''); return [b + '.png', b + '.svg']; };
    function loadImg(url) {
        return new Promise(res => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = url; });
    }
    async function cardImage(url) {
        for (const v of variants(url)) { const im = await loadImg(v); if (im) { const w = Math.min(1000, im.naturalWidth || 1000), h = Math.round(w * (im.naturalHeight || 1) / (im.naturalWidth || 1)); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h); return { data: c.toDataURL('image/jpeg', 0.88), w, h }; } }
        return null;
    }
    function pathsFor(type, name, role) {
        const f = key(name).replace(/ /g, '-').replace(/'s/g, '-s').replace(/'/g, ''), ff = f === 'secure-no-mans-land' ? 'secure-no-man-s-land' : f;
        const base = type === 'primary' ? 'assets/primary/' + key(name).replace(/ /g, '-').replace(/'/g, '') : 'assets/secondary/' + role + '/' + ff;
        return [base + '.png', base + '-back.png'];
    }
    // A4 portrait: one mission per page, front and back side by side when both exist
    async function buildPdf(list, title, onProgress) {
        await PDFEXPORT.lib(); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); const W = 210, H = 297, M = 9;
        let first = true, n = 0;
        for (const it of list) {
            n++; if (onProgress) onProgress(n, list.length);
            const [fu, bu] = pathsFor(it.type, it.name, it.role), [f, b] = await Promise.all([cardImage(fu), cardImage(bu)]);
            if (!f) continue; if (!first) doc.addPage(); first = false;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(20); doc.text(String(it.name).replace(/[^\x20-\x7E]/g, ''), M, M + 5);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110);
            doc.text(`${it.type === 'primary' ? 'Primary mission' : 'Secondary mission (' + it.role + ')'}${it.group ? ' - ' + it.group : ''}`, W - M, M + 5, { align: 'right' });
            const top = M + 10, availH = H - top - M - 6, availW = W - 2 * M, gap = 6, cards = b ? [f, b] : [f];
            const each = cards.length === 2 ? (availW - gap) / 2 : availW * 0.78; let cw = each, ch = cw * f.h / f.w; if (ch > availH) { ch = availH; cw = ch * f.w / f.h; }
            const totalW = cards.length * cw + (cards.length - 1) * gap; let x = (W - totalW) / 2;
            cards.forEach((c, i) => { doc.addImage(c.data, 'JPEG', x, top, cw, ch); doc.setDrawColor(190); doc.setLineWidth(0.2); doc.rect(x, top, cw, ch); doc.setFontSize(7); doc.setTextColor(140); doc.text(i ? 'Back' : 'Front', x + cw / 2, top + ch + 4, { align: 'center' }); x += cw + gap; });
            doc.setFontSize(7); doc.setTextColor(150); doc.text('Iron & Wrath - printed at 100% scale the cards are ~' + Math.round(cw) + ' mm wide', W / 2, H - 5, { align: 'center' });
        }
        if (first) throw new Error(S('No card images found.', 'No se encontraron imágenes de cartas.'));
        return doc.output('blob');
    }

    // ── text PDF: the same mission text the sheet shows (EN or ES), laid out for A4 ──
    const clean = x => String(x == null ? '' : x).replace(/[‘’′]/g, "'").replace(/[“”]/g, '"').replace(/[–—−]/g, '-').replace(/…/g, '...').replace(/[•●▪]/g, '-').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/ /g, ' ').replace(/[^\x09\x0A\x20-\xFF]/g, '');
    const rgb = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); const n = m ? parseInt(m[1], 16) : 0x8c2a2a; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    function cardFor(it) { const t = window.MISSION_TEXT || { primary: {}, secondary: {} }; return it.type === 'primary' ? find(t.primary, it.name) : (find(t.secondary, it.name + '|' + it.role) || find(t.secondary, it.name + '|defender')); }
    function colorFor(it) { for (const g in GROUPS) if (GROUPS[g].includes(it.name)) return COL[g]; return it.type === 'secondary' ? '#8c2a2a' : '#a6843c'; }
    function textPage(doc, it, first) {
        const W = 210, H = 297, M = 14, CW = W - 2 * M; let y;
        const c = cardFor(it), col = rgb(colorFor(it));
        const header = cont => {
            doc.setFillColor(col[0], col[1], col[2]); doc.rect(0, 0, W, 26, 'F');
            doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
            doc.text(clean(it.type === 'primary' ? S('PRIMARY MISSION', 'MISION PRIMARIA') : S('SECONDARY MISSION', 'MISION SECUNDARIA') + ' - ' + (it.role === 'attacker' ? S('ATTACKER', 'ATACANTE') : S('DEFENDER', 'DEFENSOR'))) + (it.group ? '  |  ' + clean(it.group).toUpperCase() : ''), M, 9);
            doc.setFontSize(18); doc.text(clean(it.name) + (cont ? ' ' + S('(cont.)', '(cont.)') : ''), M, 19);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.text('Iron & Wrath - 11e', W - M, 9, { align: 'right' });
            y = 34;
        };
        const foot = () => { const p = doc.getNumberOfPages(); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(150); doc.text(clean(S('Iron & Wrath - ', 'Iron & Wrath - ') + it.name), M, H - 7); doc.text(String(p), W - M, H - 7, { align: 'right' }); };
        const need = h => { if (y + h > H - 16) { foot(); doc.addPage(); header(true); } };
        const para = (txt, size, color, style, indent, w) => {
            doc.setFont('helvetica', style || 'normal'); doc.setFontSize(size); doc.setTextColor(color[0], color[1], color[2]);
            const lines = doc.splitTextToSize(clean(txt), w || CW - (indent || 0)), lh = size * 0.42;
            lines.forEach(l => { need(lh + 1); doc.text(l, M + (indent || 0), y); y += lh; }); y += 1.6;
        };
        if (!first) doc.addPage(); header(false);
        if (!c) { para(S('No card text available for this mission.', 'No hay texto disponible para esta mision.'), 11, [90, 90, 90]); foot(); return; }
        if (c.setup) { doc.setFillColor(243, 243, 243); const lines = doc.splitTextToSize(clean(tr(c.setup)), CW - 8); const h = lines.length * 4.6 + 6; need(h); doc.rect(M, y - 4, CW, h, 'F'); doc.setFont('helvetica', 'italic'); doc.setFontSize(10.5); doc.setTextColor(60); lines.forEach((l, i) => doc.text(l, M + 4, y + 1 + i * 4.6)); y += h + 2; }
        (c.sections || []).forEach(sec => {
            need(16); y += 2; doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.setTextColor(col[0], col[1], col[2]); doc.text(clean(tr(sec.heading)).toUpperCase(), M, y); y += 1.6;
            doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.5); doc.line(M, y, W - M, y); y += 5;
            if (sec.timing) para(tr(sec.timing), 9.5, [110, 110, 110], 'italic');
            (sec.items || []).forEach((item, i) => {
                if (i && item.or) { need(7); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150); doc.text(S('OR', 'O'), W / 2, y, { align: 'center' }); y += 5; }
                else if (i && item.plus) { need(7); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(150); doc.text('+', W / 2, y, { align: 'center' }); y += 5; }
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5);
                const lines = doc.splitTextToSize(clean(tr(item.text)), CW - 24), h = Math.max(10, lines.length * 4.7 + 2);
                need(h + 2);
                doc.setFillColor(col[0], col[1], col[2]); doc.roundedRect(M, y - 4.2, 18, 9, 1.5, 1.5, 'F');
                doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.text(String(item.vp), M + 7.5, y + 2, { align: 'center' });
                doc.setFontSize(6); doc.text(clean(S('VP', 'PV')) + (item.each ? ' ' + clean(S('each', 'c/u')) : ''), M + 14.2, y + 2, { align: 'center' });
                doc.setFont('helvetica', 'normal'); doc.setFontSize(10.5); doc.setTextColor(30);
                lines.forEach((l, k) => doc.text(l, M + 22, y + k * 4.7)); y += h;
            });
            (sec.notes || []).forEach(n => para(tr(n), 9, [100, 100, 100], 'italic'));
            if (sec.max) para(S('Max', 'Max.') + ' ' + sec.max + ' ' + S('VP', 'PV'), 9, [100, 100, 100], 'bold');
        });
        (c.actions || []).forEach(a => { y += 2; const lines = doc.splitTextToSize(clean(tr(a)), CW - 8), h = lines.length * 4.6 + 6; need(h); doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.4); doc.rect(M, y - 4, CW, h); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40); lines.forEach((l, i) => doc.text(l, M + 4, y + 1 + i * 4.6)); y += h + 2; });
        if (lang() === 'es') para('Texto traducido al espanol; las cartas oficiales estan en ingles. Consulta siempre la carta oficial.', 8, [130, 130, 130], 'italic');
        foot();
    }
    async function buildTextPdf(list, title, onProgress) {
        await PDFEXPORT.lib(); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' }); let first = true, n = 0;
        for (const it of list) { n++; if (onProgress) onProgress(n, list.length); if (!cardFor(it)) continue; textPage(doc, it, first); first = false; }
        if (first) throw new Error(S('No mission text found.', 'No se encontro texto de mision.'));
        return doc.output('blob');
    }
    const fileName = s => 'iron-and-wrath-' + String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.pdf';
    function allOf(type, role) {
        if (type === 'primary') return Object.keys(GROUPS).flatMap(g => GROUPS[g].map(n => ({ type, name: n, group: g })));
        const names = (window.GDM_DATA && window.GDM_DATA.secondaryMissions ? window.GDM_DATA.secondaryMissions.slice().sort() : []);
        return names.map(n => ({ type, name: n, role }));
    }
    async function doExport(list, title, mode, btn, kind) {
        const old = btn ? btn.innerHTML : ''; const busy = txt => { if (btn) { btn.disabled = true; btn.innerHTML = txt; } };
        try {
            busy(S('Preparing…', 'Preparando…'));
            const blob = await (kind === 'cards' ? buildPdf : buildTextPdf)(list, title, (i, n) => { if (list.length > 1) busy(i + '/' + n); });
            const name = fileName(title + (kind === 'cards' ? '' : '-' + lang())), file = new File([blob], name, { type: 'application/pdf' });
            if (mode === 'share' || mode === 'whatsapp') {
                if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title, text: title + ' - Iron & Wrath' }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                // no file-sharing support (desktop): save it, then open WhatsApp with a link
                saveBlob(blob, name); if (window.toast) toast(S('PDF saved. Attach it in WhatsApp.', 'PDF guardado. Adjúntalo en WhatsApp.'));
                if (mode === 'whatsapp') setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(title + ' - ' + location.origin), '_blank'), 600);
            } else { saveBlob(blob, name); if (window.toast) toast(S('PDF ready', 'PDF listo')); }
        } catch (e) { if (window.toast) toast('⚠ ' + (e.message || e)); } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
    }
    function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
    const splitHtml = (dl, sh) => `<div class="split-btn"><button type="button" onclick="${dl}"><i class="fa-solid fa-file-pdf"></i> <span>${S('Download PDF', 'Descargar PDF')}</span></button><button type="button" onclick="SHAREMENU.open(this, &quot;${sh.replace(/'share'/, "'MODE'").replace(/"/g, '&quot;')}&quot;)"><i class="fa-solid fa-share-nodes"></i> <span>${S('Share', 'Compartir')}</span> <i class="fa-solid fa-chevron-down" style="font-size:.7em"></i></button></div>`;
    window.MEXPORT = {
        one: (mode, btn) => doExport([{ type: st.type, name: st.name, role: st.role }], st.name + (st.type === 'secondary' ? ' (' + st.role + ')' : ''), mode, btn, st.tab === 'card' ? 'cards' : 'text'),
        all: (type, mode, btn) => { const role = window.__msRole || 'attacker'; doExport(allOf(type, role), type === 'primary' ? 'Primary missions' : 'Secondary missions ' + role, mode, btn, window.__msKind || 'text'); },
        kind: k => { window.__msKind = k; document.querySelectorAll('.ms-kind button').forEach(b => b.classList.toggle('on', b.dataset.k === k)); },
        role: r => { window.__msRole = r; document.querySelectorAll('.ms-role button').forEach(b => b.classList.toggle('on', b.dataset.r === r)); }
    };

    function textHtml() {
        const c = card(); if (!c) return `<div class="ms-empty">${S('No card text available for this mission.', 'No hay texto disponible para esta misión.')}</div>`;
        let h = '';
        if (c.setup) h += `<div class="ms-setup">${esc(tr(c.setup)).replace(/\n/g, '<br>')}</div>`;
        (c.sections || []).forEach(sec => {
            h += `<div class="ms-sec"><div class="ms-sh">${esc(tr(sec.heading))}</div>${sec.timing ? `<div class="ms-tm">${esc(tr(sec.timing))}</div>` : ''}`;
            (sec.items || []).forEach((it, i) => {
                h += `${it.or && i ? `<div class="ms-or">${S('OR', 'O')}</div>` : it.plus && i ? `<div class="ms-or">+</div>` : ''}<div class="ms-it"><span class="ms-vp">${it.vp}<small>${S('VP', 'PV')}${it.each ? ' ' + S('each', 'c/u') : ''}</small></span><span>${esc(tr(it.text))}</span></div>`;
            });
            (sec.notes || []).forEach(n => { h += `<div class="ms-note">${esc(tr(n))}</div>`; });
            if (sec.max) h += `<div class="ms-note">${S('Max', 'Máx.')} ${sec.max} ${S('VP', 'PV')}</div>`;
            h += '</div>';
        });
        (c.actions || []).forEach(a => { h += `<div class="ms-act">${esc(tr(a)).replace(/\n/g, '<br>')}</div>`; });
        return h;
    }
    function render() {
        const m = $('ms-root'); if (!m) return; const [front, back] = paths(), col = color();
        const seg = (k, l, on, fn) => `<button class="${on ? 'on' : ''}" onclick="${fn}">${l}</button>`;
        m.querySelector('.ms-card').style.setProperty('--mc', col);
        m.querySelector('.ms-card').innerHTML = `
            <div class="ms-top"><div><div class="ms-type">${st.type === 'primary' ? S('PRIMARY MISSION', 'MISIÓN PRIMARIA') : S('SECONDARY MISSION', 'MISIÓN SECUNDARIA')}</div><div class="ms-title">${esc(st.name)}</div></div><button class="ms-x" onclick="MSHEET.close()" aria-label="Close">✕</button></div>
            <div class="ms-ctl">
                <div class="ms-seg" role="group" aria-label="Language">${seg('en', 'EN', lang() === 'en', "MSHEET.lang('en')")}${seg('es', 'ES', lang() === 'es', "MSHEET.lang('es')")}</div>
                <div class="ms-seg" role="group" aria-label="View">${seg('t', S('Text', 'Texto'), st.tab === 'text', "MSHEET.tab('text')")}${seg('c', S('Card', 'Carta'), st.tab === 'card', "MSHEET.tab('card')")}</div>
                ${st.type === 'secondary' ? `<div class="ms-seg" role="group">${seg('a', S('Attacker', 'Atacante'), st.role === 'attacker', "MSHEET.role('attacker')")}${seg('d', S('Defender', 'Defensor'), st.role === 'defender', "MSHEET.role('defender')")}</div>` : ''}
            </div>
            <div class="ms-share">${splitHtml("MEXPORT.one('download', this)", "MEXPORT.one('share', this)")}</div>
            <div class="ms-body">${st.tab === 'text' ? textHtml() + (lang() === 'es' ? `<div class="ms-note" style="margin-top:12px">${S('', 'La carta (imagen) está en inglés; el texto está traducido.')}</div>` : '') : `<div class="ms-img"><img id="ms-img" onerror="if(!this.dataset.t){this.dataset.t=1;this.src=this.src.replace(/\\.png$/,'.svg')}" src="${st.face === 'front' ? front : back}" alt="${esc(st.name)}"><button id="ms-flip" onclick="MSHEET.flip()" style="display:none">${S('Flip card', 'Dar vuelta')}</button></div>`}</div>`;
        if (st.tab === 'card') { const t = new Image(); t.onload = () => { const b = $('ms-flip'); if (b) b.style.display = ''; }; t.src = st.face === 'front' ? back : front; }
        paintToggles();
    }
    const $ = id => document.getElementById(id);
    function ensure() {
        if ($('ms-root')) return;
        const m = document.createElement('div'); m.id = 'ms-root'; m.innerHTML = '<div class="ms-card" role="dialog"></div>';
        m.onclick = e => { if (e.target === m) MSHEET.close(); }; document.body.appendChild(m);
    }
    window.MSHEET = {
        open: (type, name, role, tab) => { st = { type, name, role: role || 'attacker', tab: tab || 'text', face: 'front' }; ensure(); $('ms-root').classList.add('open'); render(); },
        close: () => { const m = $('ms-root'); if (m) m.classList.remove('open'); },
        lang: l => { setLang(l); render(); try { if (window.renderGDMMissions) { /* names stay English */ } } catch (e) {} },
        tab: t => { st.tab = t; st.face = 'front'; render(); },
        role: r => { st.role = r; st.face = 'front'; render(); },
        flip: () => { st.face = st.face === 'front' ? 'back' : 'front'; const [f, b] = paths(); $('ms-img').src = st.face === 'front' ? f : b; }
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') MSHEET.close(); });

    // language pills on the two mission pages
    function paintToggles() { document.querySelectorAll('.ms-pagelang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang())); }
    function addToggles() {
        // the page stays clean: language, card text / image, attacker / defender, PDF and share all live in each mission's own window
        document.querySelectorAll('#view-primary-missions .ms-pagelang, #view-primary-missions .ms-pageexport, #view-secondary-missions .ms-pagelang, #view-secondary-missions .ms-pageexport').forEach(x => x.remove());
        return;
        ['view-primary-missions', 'view-secondary-missions'].forEach(id => {
            const v = $(id); if (!v || v.querySelector('.ms-pagelang')) return;
            const d = document.createElement('div'); d.className = 'ms-pagelang';
            d.innerHTML = `<span>${'Card text'}</span><div class="ms-seg"><button data-l="en" onclick="MSHEET.lang('en')">English</button><button data-l="es" onclick="MSHEET.lang('es')">Español</button></div><small>Tap a mission to read it or see the card.</small>`;
            const type = id.includes('primary') ? 'primary' : 'secondary';
            const roleSel = type === 'secondary' ? `<div class="ms-seg ms-role"><button data-r="attacker" class="on" onclick="MEXPORT.role('attacker')">${S('Attacker', 'Atacante')}</button><button data-r="defender" onclick="MEXPORT.role('defender')">${S('Defender', 'Defensor')}</button></div>` : '';
            const ex = document.createElement('div'); ex.className = 'ms-pageexport'; ex.innerHTML = `<div class="ms-pe-t">${S('Print-ready cards (A4)', 'Cartas listas para imprimir (A4)')}</div>${roleSel}<div class="ms-seg ms-kind"><button data-k="text" class="on" onclick="MEXPORT.kind('text')">${S('Text', 'Texto')}</button><button data-k="cards" onclick="MEXPORT.kind('cards')">${S('Card images', 'Imágenes de cartas')}</button></div>${splitHtml(`MEXPORT.all('${type}','download',this)`, `MEXPORT.all('${type}','share',this)`)}`;
            const wrap = v.querySelector('div[style*="max-width"]'); if (wrap) { wrap.insertBefore(ex, wrap.firstChild); wrap.insertBefore(d, wrap.firstChild); }
        }); paintToggles();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(addToggles, 300)); else setTimeout(addToggles, 300);
    setInterval(addToggles, 2000);
})();
