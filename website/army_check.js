/* Army-list check panel in the roster builder — Project 4192 muster rules (CORE_RULES_MANUAL_4192.md §7). */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // game sizes (unit_calculator.py GAME_SIZES): units, leaders, Class 4–5, Class 5, copies, Battleline copies, min Battleline, enhancements
    const SIZES = {
        skirmish: { name: ['Skirmish', 'Escaramuza'], units: [3, 8], leaders: [1, 2], big: 1, c5: 0, same: 2, blSame: 2, minBl: 1, enh: 2 },
        standard: { name: ['Standard', 'Estándar'], units: [5, 15], leaders: [1, 3], big: 3, c5: 1, same: 2, blSame: 3, minBl: 2, enh: 2 },
        grand: { name: ['Grand', 'Gran batalla'], units: [7, 20], leaders: [1, 4], big: 5, c5: 2, same: 3, blSame: 5, minBl: 3, enh: 3 }
    };
    const sizeOf = lim => lim <= 500 ? SIZES.skirmish : lim <= 1000 ? SIZES.standard : SIZES.grand;

    const sheet = u => (STATE.currentFactionData || []).find(x => String(x.id) === String(u.id)) || {};
    const isLeader = d => d.role === 'Leader';
    const isBl = d => d.role === 'Battleline';
    const classOf = d => +d.class || +((d.stats || {}).CLASS) || 1;

    function check(r) {
        const out = [], units = r.units || [], used = units.reduce((s, u) => s + (+u.pts || 0), 0), lim = r.pointsLimit || 1000, z = sizeOf(lim);
        const ok = t => out.push({ lvl: 'ok', t }), err = t => out.push({ lvl: 'err', t }), warn = t => out.push({ lvl: 'warn', t });
        if (!units.length) return [{ lvl: 'warn', t: S('No units yet.', 'Aún no hay unidades.') }];
        const known = (STATE.currentFactionData || []).length > 0, ds = units.map(sheet);
        // points
        if (used > lim) err(S(`Over the points limit by ${used - lim} pts (${used}/${lim}).`, `Superas el límite por ${used - lim} pts (${used}/${lim}).`));
        else ok(S(`Points ${used}/${lim} (${lim - used} left) · ${z.name[0]} game.`, `Puntos ${used}/${lim} (te quedan ${lim - used}) · partida ${z.name[1]}.`));
        // one detachment
        const dets = (r.detachments || []).concat(r.detachmentId ? [r.detachmentId] : []);
        if (!dets.length) warn(S('Choose 1 Detachment.', 'Elige 1 Destacamento.'));
        else if (dets.length > 1) err(S(`${dets.length} Detachments — only 1 is allowed.`, `${dets.length} Destacamentos: solo se permite 1.`));
        else ok(S('1 Detachment.', '1 Destacamento.'));
        if (!known) return out;
        // units (attached Leaders do not count toward the maximum)
        const leaders = ds.filter(isLeader).length, others = units.length - leaders;
        if (units.length < z.units[0]) err(S(`${units.length} units — at least ${z.units[0]}.`, `${units.length} unidades: mínimo ${z.units[0]}.`));
        else if (others > z.units[1]) err(S(`${others} units besides Leaders — at most ${z.units[1]}.`, `${others} unidades sin contar Líderes: máximo ${z.units[1]}.`));
        else ok(S(`${units.length} units (${z.units[0]}–${z.units[1]}; attached Leaders don't count).`, `${units.length} unidades (${z.units[0]}–${z.units[1]}; los Líderes unidos no cuentan).`));
        // leaders / warlord
        if (leaders < z.leaders[0]) err(S('No Leader — you need one as your Warlord.', 'Sin Líder: necesitas uno como Señor de la Guerra.'));
        else if (leaders > z.leaders[1]) err(S(`${leaders} Leaders — at most ${z.leaders[1]}.`, `${leaders} Líderes: máximo ${z.leaders[1]}.`));
        else ok(S(`${leaders} Leader${leaders > 1 ? 's' : ''} (${z.leaders[0]}–${z.leaders[1]}); pick 1 as Warlord.`, `${leaders} Líder${leaders > 1 ? 'es' : ''} (${z.leaders[0]}–${z.leaders[1]}); elige 1 como Señor de la Guerra.`));
        // big units
        const big = ds.filter(d => classOf(d) >= 4).length, c5 = ds.filter(d => classOf(d) === 5).length;
        if (big > z.big) err(S(`${big} Class 4–5 units — at most ${z.big}.`, `${big} unidades de Clase 4–5: máximo ${z.big}.`));
        if (c5 > z.c5) err(S(`${c5} Class 5 units — at most ${z.c5}.`, `${c5} unidades de Clase 5: máximo ${z.c5}.`));
        if (big <= z.big && c5 <= z.c5) ok(S(`Class 4–5: ${big}/${z.big} · Class 5: ${c5}/${z.c5}.`, `Clase 4–5: ${big}/${z.big} · Clase 5: ${c5}/${z.c5}.`));
        // copies
        const by = {}; units.forEach((u, i) => { (by[u.id] = by[u.id] || { n: 0, u, d: ds[i] }).n++; });
        let bad = 0; Object.values(by).forEach(({ n, u, d }) => { const cap = isBl(d) ? z.blSame : z.same;
            if (n > cap) { bad++; err(S(`${u.name}: ${n} copies (max ${cap}).`, `${u.name}: ${n} copias (máx. ${cap}).`)); } });
        if (!bad) ok(S(`Copies within limits (${z.same} per datasheet, ${z.blSame} Battleline).`, `Copias dentro del límite (${z.same} por datasheet, ${z.blSame} Battleline).`));
        // battleline
        const bl = ds.filter(isBl).length;
        if (bl < z.minBl) err(S(`${bl} Battleline units — at least ${z.minBl}.`, `${bl} unidades Battleline: mínimo ${z.minBl}.`));
        else ok(S(`${bl} Battleline (min ${z.minBl}).`, `${bl} Battleline (mín. ${z.minBl}).`));
        // enhancements: one each, on different Leaders, from the chosen Detachment
        const enhs = units.filter(u => u.enh);
        if (enhs.length) {
            const pts = enhs.reduce((s, u) => s + (+u.enh.cost || 0), 0), cnt = {};
            enhs.forEach(u => cnt[u.enh.name] = (cnt[u.enh.name] || 0) + 1);
            if (enhs.length > z.enh) err(S(`Enhancements ${enhs.length}/${z.enh} — too many.`, `Mejoras ${enhs.length}/${z.enh}: demasiadas.`));
            else ok(S(`Enhancements ${enhs.length}/${z.enh} (${pts} pts).`, `Mejoras ${enhs.length}/${z.enh} (${pts} pts).`));
            if (Object.values(cnt).some(k => k > 1)) err(S('An enhancement is taken more than once.', 'Una mejora está repetida.'));
            enhs.filter(u => !dets.includes(u.enh.detId)).forEach(u => err(S(`${u.enh.name}: its Detachment is not selected.`, `${u.enh.name}: su Destacamento no está seleccionado.`)));
            enhs.filter(u => !isLeader(sheet(u))).forEach(u => err(S(`${u.name} is not a Leader and cannot take an enhancement.`, `${u.name} no es Líder y no puede llevar una mejora.`)));
        }
        if (window.RULES) { try { RULES.checks(r).forEach(x => out.push(x)); } catch (e) {} }
        return out;
    }
    // folded by default (easier to scroll the roster); stays open while editing once the player opens it
    let acOpen = false;
    document.addEventListener('toggle', e => { if (e.target && e.target.id === 'roster-check-d') acOpen = e.target.open; }, true);
    function paint() {
        const r = typeof currentActiveRoster !== 'undefined' ? currentActiveRoster : null; if (!r) return;
        let box = document.getElementById('roster-checks');
        if (!box) { const a = document.getElementById('detachment-alert'); if (!a) return; box = document.createElement('div'); box.id = 'roster-checks'; a.after(box); }
        const res = check(r), bad = res.filter(x => x.lvl !== 'ok').length, ico = { ok: '✔', warn: '⚠', err: '✖' }, col = { ok: '#5be59a', warn: '#e5c15a', err: '#ff7b7b' };
        box.innerHTML = `<details id="roster-check-d" ${acOpen ? 'open' : ''} style="margin-top:12px; background:#10151c; border:1px solid ${bad ? '#6b5a2a' : '#2a3546'}; border-radius:10px; padding:10px 12px;"><summary style="cursor:pointer; font-weight:bold;">${bad ? '⚠ ' + S(`Army check — ${bad} to review`, `Revisión de lista — ${bad} por revisar`) : '✔ ' + S('Army check — all good', 'Revisión de lista — todo bien')}</summary>
            ${res.map(x => `<div style="color:${col[x.lvl]}; font-size:0.85rem; padding:4px 0;">${ico[x.lvl]} ${esc(x.t)}</div>`).join('')}
            <div style="color:#667; font-size:0.7rem; margin-top:6px;">${S('Quick checks only — confirm against the core rules (§7 Muster).', 'Revisiones rápidas: confirma con las reglas básicas (§7 Reclutamiento).')}</div></details>`;
    }
    const orig = window.renderRosterBuilder;
    window.renderRosterBuilder = function () { const r = orig.apply(this, arguments); try { paint(); } catch (e) {} return r; };
    window.ARMYCHECK = { check, paint, SIZES };
})();
