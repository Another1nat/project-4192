/* Detachment descriptions: attaches rule + enhancement text (from detachment_rules.js) to the MFM detachment list.
   MFM stays the authority for names / DP / Force Dispositions / enhancement costs — this only ADDS descriptions. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[’'`]/g, '').replace(/&amp;/g, '&').replace(/[^a-z0-9]+/g, ' ').trim();
    const enorm = s => norm(String(s).replace(/\((upgrade|upgarde|aura|psychic)[^)]*\)/ig, ''));
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bld = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    const DB = () => (window.DET_RULES && window.DET_RULES.d) || {};
    // djb2 over UTF-16 units — the same hash tools/det_i18n/build.py writes next to every Spanish text
    const hs = s => { let v = 5381; for (let i = 0; i < s.length; i++) v = ((v << 5) + v + s.charCodeAt(i)) >>> 0; return v.toString(16); };
    const LC = {};
    // Spanish overlay: a translated piece is used only while the English it came from is unchanged
    function loc(info, k) {
        if (lang() !== 'es' || !window.DET_ES || !window.DET_ES[k]) return info;
        const t = window.DET_ES[k], ck = k + '|' + (info.__v || ''); if (LC[ck] && LC[ck].src === info) return LC[ck].out;
        const o = Object.assign({}, info);
        o.r = (info.r || []).map((r, i) => { const x = t.r && t.r[i]; return x && x[2] === hs(r[0] + '\t' + r[1]) ? [x[0], x[1]] : r; });
        o.e = Object.assign({}, info.e || {}); Object.keys(o.e).forEach(n => { const x = t.e && t.e[n]; if (x && x[1] === hs(o.e[n][2])) o.e[n] = [o.e[n][0], o.e[n][1], x[0]]; });
        o.s = (info.s || []).map((s, i) => { const x = t.s && t.s[i]; return x && x[4] === hs([s[3], s[4], s[5], s[6]].join(' ¦ ')) ? [s[0], s[1], s[2], x[0], x[1], x[2], x[3]] : s; });
        LC[ck] = { src: info, out: o }; return o;
    }
    // 39k.pro (official 11e) detachment -> the same {r, e, s} shape the older tables use
    const CAT = { battleTactic: 'Battle Tactic', strategicPloy: 'Strategic Ploy', epicDeed: 'Epic Deed', wargear: 'Wargear' };
    function from39k(x) {
        if (!x || !(x.rules || []).length) return null;
        const e = {}; (x.enhancements || []).forEach(h => { e[enorm(h.name)] = [h.name, h.cost, h.description || '']; });
        return { __v: '39k', r: x.rules.map(r => [r.name, r.description || '']), e,
            s: (x.stratagems || []).map(t => [t.name, t.cost + 'CP', (CAT[t.category] || 'Stratagem') + ' Stratagem', t.lore || '', t.turn || '', t.target || '', [t.effect, t.restriction].filter(Boolean).join('\n')]) };
    }
    // hand-entered text wins; then a verified Spanish translation (Spanish mode only); then the faction's own rules text
    function get(name, d39) {
        const k = norm(name), man = window.DET_MANUAL && window.DET_MANUAL[k]; if (man) return loc(man, k);
        const db = DB()[k] || null;
        if (db && lang() === 'es' && window.DET_ES && window.DET_ES[k]) return loc(db, k);
        const o = from39k(d39); if (o) return o;
        return db ? loc(db, k) : null;
    }
    function enhText(d, name) { const i = d && d.info; const e = i && i.e && i.e[enorm(name)]; return e ? e[2] : ''; }
    function enrich(d) {
        if (!d || d.__enriched === lang()) return d; const info = get(d.name, d.d39); d.__enriched = lang(); if (!info) return d;
        d.info = info; if (/coming soon/i.test(d.desc || '')) d.desc = '';
        const ens = d.enhancements || []; if (ens.length) { const hit = ens.filter(e => info.e && info.e[enorm(e.name)]).length; d.infoStale = hit < ens.length / 2; }
        const manual = !!(window.DET_MANUAL && window.DET_MANUAL[norm(d.name)]);
        (d.enhancements || []).forEach(e => { if (manual || e.__di || !e.description || /coming soon/i.test(e.description)) { const tx = enhText(d, e.name); if (tx) { e.description = tx; e.__di = true; } else if (!e.description) e.description = ''; } });
        return d;
    }
    // plain text -> small html (paragraphs, bullets, bold "Label:" / UPPERCASE headings)
    function fmt(t) {
        t = window.blClean ? blClean(String(t == null ? '' : t)) : t;
        const out = []; let list = [];
        const flush = () => { if (list.length) { out.push('<ul>' + list.map(x => '<li>' + x + '</li>').join('') + '</ul>'); list = []; } };
        const inl = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^([A-Z][^:\n<>]{2,60}?):(?!\s*<\/b>)/, '<b>$1:</b>').replace(/\b(WHEN|TARGET|EFFECT|RESTRICTIONS):/g, '<b>$1:</b>');
        String(t || '').split(/\n+/).forEach(line => {
            line = line.trim(); if (!line) return;
            if (/^[•▫]/.test(line)) list.push(inl(line.replace(/^[•▫]\s*/, '')));
            else { flush(); if (/^[A-Z ]{4,30}$/.test(line)) out.push('<div class="dt-h">' + esc(line) + '</div>'); else out.push('<p>' + inl(line) + '</p>'); }
        }); flush(); return out.join('');
    }
    // stratagems: [name, CP, type, flavour, when, target, effect]
    function stratItems(list) {
        return (list || []).map(x => `<div class="dt-st"><div class="dt-en"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div><div class="dt-sty">${esc(lang() === 'es' ? String(x[2]).replace(/^(.*) Stratagem$/, 'Estratagema de $1') : x[2])}</div>${x[3] ? `<p class="dt-fl">${esc(x[3])}</p>` : ''}<p><b>${S('WHEN', 'CUÁNDO')}:</b> ${bld(x[4])}</p><p><b>${S('TARGET', 'OBJETIVO')}:</b> ${bld(x[5])}</p><div class="dt-eff"><b>${S('EFFECT', 'EFECTO')}:</b> ${fmt(x[6])}</div></div>`).join('');
    }
    // the three parts of a detachment, for the roster's Rules / Enhancements / Stratagems sections
    function parts(d) {
        if (d && d.name) enrich(d); const i = d && d.info;
        const warn = d && d.infoStale ? `<div class="dt-warn">${S('Heads up: this text comes from an older Faction Pack — the enhancements in the Munitorum Field Manual differ. Trust the MFM list and the official app.', 'Ojo: este texto viene de un Faction Pack anterior — las mejoras del Munitorum Field Manual son distintas. Fíate de la lista del MFM y de la app oficial.')}</div>` : '';
        const rules = i && (i.r || []).length ? warn + i.r.map(([n, t]) => `<div class="dt-rule"><div class="dt-rn">${esc(n)}</div>${fmt(t)}</div>`).join('')
            : (d && d.requirements ? `<div class="dt-rule"><div class="dt-rn">${S('Requirement (MFM)', 'Requisito (MFM)')}</div><p>${esc(d.requirements)}</p></div>` : '');
        const s = (i && i.s) || [];
        return { rules, ruleCount: i ? (i.r || []).length : 0, strats: stratItems(s), stratCount: s.length };
    }
    function stratHtml(list) {
        if (!list || !list.length) return '';
        return `<details class="dt-strat"><summary>${S('Stratagems', 'Estratagemas')} <span>${list.length}</span></summary>${list.map(x => `<div class="dt-st"><div class="dt-en"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div><div class="dt-sty">${esc(lang() === 'es' ? String(x[2]).replace(/^(.*) Stratagem$/, 'Estratagema de $1') : x[2])}</div>${x[3] ? `<p class="dt-fl">${esc(x[3])}</p>` : ''}<p><b>${S('WHEN', 'CUÁNDO')}:</b> ${bld(x[4])}</p><p><b>${S('TARGET', 'OBJETIVO')}:</b> ${bld(x[5])}</p><div class="dt-eff"><b>${S('EFFECT', 'EFECTO')}:</b> ${fmt(x[6])}</div></div>`).join('')}</details>`;
    }
    // collapsible "what this detachment does" (rule text, plus enhancements when asked)
    function detailsHtml(d, o) {
        o = o || {}; if (d && d.name) enrich(d); const i = d && d.info;   // re-enrich if the language changed
        if (d && (!i || !(i.r || []).length)) {   // no rule text for this one: show what the Munitorum Field Manual does say, and be clear about the rest
            const req = d.requirements ? `<div class="dt-rule"><div class="dt-rn">${S('Requirement (MFM)', 'Requisito (MFM)')}</div><p>${esc(d.requirements)}</p></div>` : '';
            const enh = o.enhancements && (d.enhancements || []).length ? `<details class="dt-strat"><summary>${S('Enhancements', 'Mejoras')} <span>${d.enhancements.length}</span></summary>` + d.enhancements.map(e => `<div class="dt-enh"><div class="dt-en"><b>${esc(e.name)}</b>${e.cost != null && e.cost !== '' ? `<span>${esc(e.cost)} pts</span>` : ''}</div></div>`).join('') + '</details>' : '';
            if (!req && !enh) return '';
            return `<details class="dt-more"><summary>${S('Details', 'Detalles')}</summary><div class="dt-body">${req}${enh}<div class="dt-src">${S('The full rule text for this detachment is not included yet — only what the Munitorum Field Manual lists. Check the official app for how it works.', 'El texto completo de este destacamento aún no está incluido: solo lo que indica el Munitorum Field Manual. Consulta la app oficial para ver cómo funciona.')}</div></div></details>`;
        }
        if (!i) return '';
        const warn = d.infoStale ? `<div class="dt-warn">${S('Heads up: this text comes from an older Faction Pack — the enhancements in the Munitorum Field Manual differ. Trust the MFM list and the official app.', 'Ojo: este texto viene de un Faction Pack anterior; las mejoras del Munitorum Field Manual son distintas. Confía en la lista del MFM y en la app oficial.')}</div>` : '';
        const rules = warn + i.r.map(([n, t]) => `<div class="dt-rule"><div class="dt-rn">${esc(n)}</div>${fmt(t)}</div>`).join('');
        const enh = o.enhancements && (d.enhancements || []).length ? `<details class="dt-strat"><summary>${S('Enhancements', 'Mejoras')} <span>${d.enhancements.length}</span></summary>` + (d.enhancements || []).map(e => `<div class="dt-enh"><div class="dt-en"><b>${esc(e.name)}</b>${e.cost != null && e.cost !== '' ? `<span>${esc(e.cost)} pts</span>` : ''}</div>${e.description ? `<div class="dt-et">${fmt(e.description)}</div>` : ''}</div>`).join('') + '</details>' : '';
        const strat = stratHtml(i.s);
        return `<details class="dt-more"${o.open ? ' open' : ''}><summary>${S('Rules', 'Reglas')}</summary><div class="dt-body">${rules}${enh}${strat}<div class="dt-src">${S('Rules text from the Iron & Wrath faction data. The current rules manual is the authority if they differ.', 'Texto de reglas de los datos de facción de Iron & Wrath. Si hay diferencias, manda el manual de reglas vigente.')}</div></div></details>`;
    }
    window.DETINFO = { from39k, stratHtml, stratItems, parts, norm, enorm, get, enrich, enhText, fmt, detailsHtml };
})();
