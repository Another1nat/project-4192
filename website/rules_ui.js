/* Core rules page: English / Spanish switch + A4 PDF export (download or share). Language is shared with the tracker and missions. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const setLang = l => { try { localStorage.setItem('gdm_lang', l); } catch (e) {} };
    const S = (en, es) => lang() === 'es' ? es : en;
    const $ = id => document.getElementById(id);

    let esP = null;
    const ensureEs = () => window.RULES_ES ? Promise.resolve() : (esP = esP || new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'rules_es.js?v=2'; s.onload = res; s.onerror = () => { esP = null; rej(new Error(S('The Spanish rules need internet the first time.', 'Las reglas en español necesitan internet la primera vez.'))); }; document.head.appendChild(s); }));
    function rulesData() {
        const cats = (window.GDM_DATA && window.GDM_DATA.rules) || []; const es = lang() === 'es' && window.RULES_ES;
        return cats.map(c => ({ id: c.id, title: es ? (window.RULES_ES.cats[c.id] || c.title) : c.title, rules: (c.rules || []).map(r => { const t = es && window.RULES_ES.rules[r.id]; return { id: r.id, title: t ? t.t : r.title, html: t ? t.h : r.html }; }) }));
    }
    // html -> simple blocks [{k:'p'|'li'|'h', t}]
    function blocks(html) {
        const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.firstChild, out = []; d.querySelectorAll('.sr-only').forEach(x => x.remove());
        const text = el => PDFEXPORT.clean(el.textContent.replace(/\s+/g, ' '));
        (function walk(n) {
            for (const c of n.childNodes) {
                if (c.nodeType !== 1) continue; const tag = c.tagName.toLowerCase();
                if (tag === 'li') { const t = text(c).replace(/^[-•▪■▫]\s*/, ''); if (t) out.push({ k: 'li', t }); }
                else if (tag === 'p' || tag === 'h4') { const t = text(c); if (t) out.push({ k: tag === 'h4' ? 'h' : 'p', t }); }
                else if (tag === 'ul' || tag === 'ol' || tag === 'div' || tag === 'table' || tag === 'tbody' || tag === 'tr') walk(c);
                else if (tag === 'td' || tag === 'th') { const t = text(c); if (t) out.push({ k: 'li', t }); }
                else { const t = text(c); if (t) out.push({ k: 'p', t }); }
            }
        })(d);
        return out;
    }
    async function build(onProgress) {
        if (lang() === 'es') await ensureEs();
        await PDFEXPORT.lib(); const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' });
        const W = 210, H = 297, M = 15, CW = W - 2 * M; let y = M, page = 1;
        const clean = PDFEXPORT.clean, es = lang() === 'es';
        const footer = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(140); doc.text('Project 4192 - ' + (es ? 'Reglas básicas (traducción no oficial)' : 'Core Rules'), M, H - 7); doc.text(String(page), W - M, H - 7, { align: 'right' }); doc.setTextColor(0); };
        const need = h => { if (y + h > H - 14) { footer(); doc.addPage(); page++; y = M; } };
        // cover
        doc.setFont('helvetica', 'bold'); doc.setFontSize(26); doc.text(es ? 'Reglas básicas' : 'Core Rules', M, 50);
        doc.setFontSize(12); doc.setFont('helvetica', 'normal'); doc.setTextColor(90); doc.text('Project 4192', M, 60);
        if (es) { const n = doc.splitTextToSize('Traducción de cortesía generada para Project 4192. No es oficial; ante cualquier duda prevalece el texto en inglés. Los nombres de palabras clave y habilidades se mantienen en inglés para coincidir con las hojas de datos.', CW); doc.setFontSize(9.5); doc.text(n, M, 72); }
        doc.setTextColor(0); y = 100;
        const data = rulesData(); let n = 0;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(es ? 'Contenido' : 'Contents', M, y); y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
        data.forEach(c => { if (y > H - 20) { footer(); doc.addPage(); page++; y = M; } doc.text(clean(`${c.id}  ${c.title}`), M + 2, y); y += 5.2; });
        footer(); doc.addPage(); page++; y = M;
        for (const c of data) {
            n++; if (onProgress) onProgress(n, data.length);
            need(30); doc.setFillColor(30, 40, 62); doc.rect(M, y - 5, CW, 10, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(clean(`${c.id}  ${c.title}`.toUpperCase()), M + 3, y + 1.6); doc.setTextColor(0); y += 11;
            for (const r of c.rules) {
                need(18); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(150, 60, 20); doc.text(clean(r.id), M, y); doc.setTextColor(0);
                const tl = doc.splitTextToSize(clean(r.title), CW - 16); doc.text(tl, M + 15, y); y += 5 * tl.length + 0.5;
                const bl = blocks(r.html || '');
                bl.forEach((b, i) => {
                    if (b.k === 'h') { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); } else { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8); }
                    const ind = b.k === 'li' ? 6 : 0, lines = doc.splitTextToSize(b.t, CW - ind); need(4.1 * Math.min(lines.length, 3) + 1.5);
                    if (b.k === 'li') { doc.setFillColor(90); doc.circle(M + 2, y - 1, 0.5, 'F'); }
                    lines.forEach(l => { need(4.1); doc.text(l, M + ind, y); y += 4.1; }); y += 1.2;
                });
                y += 3;
            }
            y += 3;
        }
        footer(); return doc.output('blob');
    }
    function saveBlob(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
    async function run(mode, btn) {
        const old = btn ? btn.innerHTML : ''; const busy = t => { if (btn) { btn.disabled = true; btn.innerHTML = t; } };
        try {
            busy(S('Preparing…', 'Preparando…')); const blob = await build((i, n) => busy(i + '/' + n));
            const name = lang() === 'es' ? 'project-4192-reglas-basicas-es.pdf' : 'project-4192-core-rules.pdf', file = new File([blob], name, { type: 'application/pdf' });
            if (mode === 'share' || mode === 'whatsapp') {
                if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: S('Core Rules', 'Reglas básicas') }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
                saveBlob(blob, name); if (window.toast) toast(S('PDF saved. Attach it in WhatsApp.', 'PDF guardado. Adjúntalo en WhatsApp.'));
                if (mode === 'whatsapp') setTimeout(() => window.open('https://wa.me/?text=' + encodeURIComponent(S('Core Rules', 'Reglas básicas') + ' - ' + location.origin), '_blank'), 600);
            } else { saveBlob(blob, name); if (window.toast) toast(S('PDF ready', 'PDF listo')); }
        } catch (e) { if (window.toast) toast('⚠ ' + (e.message || e)); } finally { if (btn) { btn.disabled = false; btn.innerHTML = old; } }
    }
    window.RULESUI = {
        lang: l => { setLang(l); paint(); (l === 'es' ? ensureEs() : Promise.resolve()).then(() => { if (window.renderRulesList) renderRulesList(($('rules-search') || {}).value || ''); }).catch(e => { if (window.toast) toast('⚠ ' + e.message); }); },
        pdf: run
    };
    function paint() {
        document.querySelectorAll('.rl-lang button').forEach(b => b.classList.toggle('on', b.dataset.l === lang()));
        const s = $('rules-search'); if (s) s.placeholder = S('Search rules...', 'Buscar reglas...');
        const dl = document.querySelector('#rl-bar .split-btn button:first-child span'), sh = document.querySelector('#rl-bar .split-btn button:last-child span');
        if (dl) dl.textContent = S('Download PDF', 'Descargar PDF'); if (sh) sh.textContent = S('Share', 'Compartir');
        const note = $('rl-note'); if (note) note.style.display = lang() === 'es' ? '' : 'none';
        document.querySelectorAll('#rl-bar .rl-t').forEach(x => x.textContent = S('Rules language & export', 'Idioma de las reglas y exportar'));
        document.querySelectorAll('#rl-cheat .rl-ct').forEach(x => x.textContent = S('Turn cheat sheet · 1 page', 'Resumen del turno · 1 página'));
        document.querySelectorAll('#rl-cheat .rl-cd').forEach(x => x.textContent = S('The whole turn on one page: every phase in order, yes/no decisions, the stratagems of each phase and key numbers. A3, also prints on A4. Unofficial summary.', 'Todo el turno en una página: cada fase en orden, decisiones sí/no, las estratagemas de cada fase y los números clave. A3, también se imprime en A4. Resumen no oficial.'));
    }
    function add() {
        const v = $('view-rules'); if (!v || $('rl-bar')) { paint(); return; }
        const wrap = v.querySelector('div[style*="max-width"]'); if (!wrap) return;
        const bar = document.createElement('div'); bar.id = 'rl-bar'; bar.className = 'ms-pageexport';
        bar.innerHTML = `<div class="ms-pe-t rl-t"></div><div class="rl-lang ms-seg"><button data-l="en" onclick="RULESUI.lang('en')">English</button><button data-l="es" onclick="RULESUI.lang('es')">Español</button></div>
            <div class="split-btn"><button type="button" onclick="RULESUI.pdf('download', this)"><i class="fa-solid fa-file-pdf"></i> <span></span></button><button type="button" onclick="SHAREMENU.open(this, &quot;RULESUI.pdf('MODE', this)&quot;)"><i class="fa-solid fa-share-nodes"></i> <span></span> <i class="fa-solid fa-chevron-down" style="font-size:.7em"></i></button></div>
            <div id="rl-note" class="ms-note" style="display:none">Traducción de cortesía, no oficial. Las palabras clave y habilidades se mantienen en inglés para coincidir con las hojas de datos.</div>`;
        wrap.insertBefore(bar, wrap.firstChild);
        paint();
        (lang() === 'es' ? ensureEs() : Promise.resolve()).then(() => { if (window.renderRulesList) renderRulesList(($('rules-search') || {}).value || ''); }).catch(() => {});
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(add, 400)); else setTimeout(add, 400);
    setInterval(add, 2000);
})();
