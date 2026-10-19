/* Army-list check panel in the roster builder: points, detachments (DP), datasheet copies, a CHARACTER. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    function roleOf(u) { const d = (STATE.currentFactionData || []).find(x => String(x.id) === String(u.id)); return d ? String(d.role || '').toUpperCase() : ''; }
    function check(r) {
        const out = [], units = r.units || [], used = units.reduce((s, u) => s + (+u.pts || 0), 0), lim = r.pointsLimit || 0;
        if (!units.length) return [{ lvl: 'warn', t: S('No units yet.', 'Aún no hay unidades.') }];
        out.push(used > lim ? { lvl: 'err', t: S(`Over the points limit by ${used - lim} pts (${used}/${lim}).`, `Superas el límite por ${used - lim} pts (${used}/${lim}).`) }
                            : { lvl: 'ok', t: S(`Points ${used}/${lim} (${lim - used} left).`, `Puntos ${used}/${lim} (te quedan ${lim - used}).`) });
        // detachments + DP
        const dets = (r.detachments || []).concat(r.detachmentId ? [r.detachmentId] : []), all = STATE.currentFactionDetachments || [];
        if (!dets.length) out.push({ lvl: 'warn', t: S('No detachment selected.', 'No hay destacamento seleccionado.') });
        else {
            const dp = all.filter(d => dets.includes(d.id)).reduce((s, d) => s + (+d.dpCost || 0), 0), max = lim > 2000 ? 4 : lim > 1000 ? 3 : 2;
            out.push(dp > max ? { lvl: 'err', t: S(`Detachment points ${dp}/${max} — too many.`, `Puntos de destacamento ${dp}/${max}: demasiados.`) } : { lvl: 'ok', t: S(`Detachments ${dp}/${max} DP.`, `Destacamentos ${dp}/${max} DP.`) });
        }
        // copies per datasheet
        const by = {}; units.forEach(u => { const k = u.id; (by[k] = by[k] || { n: 0, u }).n++; });
        let bad = 0; Object.values(by).forEach(({ n, u }) => {
            const role = roleOf(u), cap = /EPIC/.test(role) ? 1 : /BATTLELINE|TRANSPORT/.test(role) ? 6 : 3;
            if (n > cap) { bad++; out.push({ lvl: 'err', t: S(`${u.name}: ${n} copies (max ${cap}).`, `${u.name}: ${n} copias (máx. ${cap}).`) }); }
        });
        if (!bad) out.push({ lvl: 'ok', t: S('Datasheet copies are within limits.', 'Las copias de datasheet están dentro del límite.') });
        // enhancements
        const enhs = units.filter(u => u.enh);
        if (enhs.length) {
            const cnt = {}; enhs.forEach(u => cnt[u.enh.name] = (cnt[u.enh.name] || 0) + 1); const dup = Object.entries(cnt).some(([n, k]) => /\(upgrade\)/i.test(n) ? k > 3 : k > 1), selIds = (r.detachments || []), orphan = enhs.filter(u => !selIds.includes(u.enh.detId));
            out.push(enhs.length > 4 ? { lvl: 'err', t: S(`Enhancements ${enhs.length}/4 — too many.`, `Mejoras ${enhs.length}/4: demasiadas.`) } : { lvl: 'ok', t: S(`Enhancements ${enhs.length}/4 (${enhs.reduce((s, u) => s + (+u.enh.cost || 0), 0)} pts).`, `Mejoras ${enhs.length}/4 (${enhs.reduce((s, u) => s + (+u.enh.cost || 0), 0)} pts).`) });
            if (dup) out.push({ lvl: 'err', t: S('An enhancement is taken too many times (upgrades: max 3, others: once).', 'Una mejora está repetida de más (mejoras tipo Upgrade: máx. 3, las demás: una vez).') });
            orphan.forEach(u => out.push({ lvl: 'err', t: S(`${u.enh.name}: its detachment is no longer selected.`, `${u.enh.name}: su destacamento ya no está seleccionado.`) }));
            enhs.filter(u => /EPIC/.test(roleOf(u)) || !/CHARACTER/.test(roleOf(u) || 'CHARACTER')).forEach(u => out.push({ lvl: 'err', t: S(`${u.name} cannot take an enhancement.`, `${u.name} no puede llevar una mejora.`) }));
        }
        // hand-entered points (Munitorum Field Manual not updated yet)
        if (window.MFM_MANUAL && r.faction && r.faction.name === MFM_MANUAL.faction && units.some(u => { const o = window.getMFMOverride && getMFMOverride(u.name); return o && o.manual; })) out.push({ lvl: 'warn', t: MFM_MANUAL.note[lang() === 'es' ? 'es' : 'en'] });
        // warlord
        const hasChar = units.some(u => /CHARACTER|EPIC/.test(roleOf(u)));
        if (units.length && (STATE.currentFactionData || []).length) out.push(hasChar ? { lvl: 'ok', t: S('Has a CHARACTER for your Warlord.', 'Tienes un PERSONAJE para tu Señor de la Guerra.') } : { lvl: 'warn', t: S('No CHARACTER — you need one to be your Warlord.', 'Sin PERSONAJE: necesitas uno como Señor de la Guerra.') });
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
            <div style="color:#667; font-size:0.7rem; margin-top:6px;">${S('Quick checks only — confirm against the current rules and Munitorum Field Manual.', 'Revisiones rápidas: confirma con las reglas vigentes y el Munitorum Field Manual.')}</div></details>`;
    }
    const orig = window.renderRosterBuilder;
    window.renderRosterBuilder = function () { const r = orig.apply(this, arguments); try { paint(); } catch (e) {} return r; };
    window.ARMYCHECK = { check, paint };
})();
