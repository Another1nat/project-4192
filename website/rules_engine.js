/* Rules engine: reads the 39k restrictions stored in data/factions/*.json and answers "is this allowed?"
   - enhancements: which datasheets may bear them (required / excluded keywords)
   - leaders: who may be attached to whom (and who is missing a bodyguard)
   - detachments: datasheets a detachment forbids
   It only reports; the roster still lets the player override (the data can lag behind the book). */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const n = s => String(s == null ? '' : s).toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const dsOf = u => (STATE.currentFactionData || []).find(d => String(d.id) === String(u.id)) || (STATE.currentFactionData || []).find(d => n(d.name) === n(u.name));
    const kwSet = d => new Set([].concat(d ? d.keywords || [] : [], d ? d.factionKeywords || [] : []).map(n));

    // can this roster unit carry that enhancement?  -> { ok, why }
    function canBear(u, e) {
        const d = dsOf(u); if (!d) return { ok: true };
        const ks = kwSet(d);
        if (ks.has('epic hero')) return { ok: false, why: S('Epic Heroes cannot take enhancements.', 'Los Héroes Épicos no pueden llevar mejoras.') };
        if (!ks.has('character') && !(e.requires || []).some(g => g.datasheet)) return { ok: false, why: S('Only CHARACTER units can take enhancements.', 'Solo los PERSONAJES pueden llevar mejoras.') };
        const bad = (e.excludes || []).find(k => ks.has(n(k))); if (bad) return { ok: false, why: S(`Units with ${bad} cannot take it.`, `Las unidades con ${bad} no pueden llevarla.`) };
        const alts = e.requires || [];
        if (alts.length && !alts.some(g => (!g.datasheet || n(g.datasheet) === n(d.name)) && (g.keywords || []).every(k => ks.has(n(k))) && (g.faction || []).every(k => ks.has(n(k))))) {
            const need = alts.map(g => [].concat(g.datasheet ? [g.datasheet] : [], g.keywords || [], g.faction || []).join(' + ')).join(' / ');
            return { ok: false, why: S(`Bearer must be: ${need}.`, `El portador debe ser: ${need}.`) };
        }
        if (!alts.length && e.description) {
            const desc = String(e.description);
            const match = desc.match(/^[*_]*([A-Z0-9\s'-]{3,40}?)[*_]*\s+model(?:\s+with\s+the\s+[*_]*([A-Z0-9\s'-]{3,40}?)[*_]*\s+ability)?\s+only/i);
            if (match) {
                const reqKw = n(match[1]);
                if (reqKw && !ks.has(reqKw) && n(d.name) !== reqKw) {
                    return { ok: false, why: S(`Bearer must be: ${match[1].trim()}.`, `El portador debe ser: ${match[1].trim()}.`) };
                }
                const reqAbility = match[2] ? n(match[2]) : null;
                if (reqAbility) {
                    const hasAb = ((d.abilities || []).some(a => n(a.name) === reqAbility || n(a.name).includes(reqAbility))) ||
                                  ((d.keywords || []).some(k => n(k) === reqAbility));
                    if (!hasAb) {
                        return { ok: false, why: S(`Bearer must have the ${match[2].trim()} ability.`, `El portador debe tener la habilidad ${match[2].trim()}.`) };
                    }
                }
            }
        }
        return { ok: true };
    }
    // leader rules for one roster: [{lvl, t}]
    function leaderChecks(r) {
        const out = [], units = r.units || [], items = units.map(u => ({ u, d: dsOf(u) })).filter(x => x.d);
        const dets = ((STATE.currentFactionDetachments || []).filter(d => (r.detachments || []).includes(d.id))).map(d => n(d.name));
        const fits = (lead, body) => (lead.d.leads || []).some(g => {
            if (g.onlyIn && !dets.includes(n(g.onlyIn))) return false; if (g.notIn && dets.includes(n(g.notIn))) return false;
            const byName = (g.units || []).some(x => n(x) === n(body.d.name)), bk = kwSet(body.d), byKw = (g.keywords || []).length && g.keywords.every(k => bk.has(n(k)));
            return byName || byKw;
        });
        const leaders = items.filter(x => (x.d.leads || []).length), bodies = items.filter(x => !(x.d.leads || []).length || true);
        leaders.forEach(l => {
            if (/epic hero|character/.test(n(l.d.role))) { /* leaders are characters; nothing else to check */ }
            const ok = bodies.some(b => b !== l && fits(l, b));
            if (!ok) out.push({ lvl: 'warn', t: S(`${l.u.name} has no unit to lead in this roster (it can lead: ${leadNames(l.d)}).`, `${l.u.name} no tiene unidad a la que liderar en esta lista (puede liderar: ${leadNames(l.d)}).`) });
        });
        return out;
    }
    function leadNames(d) { const names = new Set(); (d.leads || []).forEach(g => { (g.units || []).forEach(x => names.add(x)); (g.keywords || []).forEach(x => names.add(x + ' units')); }); const a = [...names]; return a.slice(0, 6).join(', ') + (a.length > 6 ? ` +${a.length - 6}` : ''); }
    function detachmentChecks(r) {
        const out = [], dets = (STATE.currentFactionDetachments || []).filter(d => (r.detachments || []).includes(d.id));
        dets.forEach(det => { const ex = ((det.d39 || {}).excludedDatasheets || []).map(n); (r.units || []).forEach(u => { if (ex.includes(n(u.name))) out.push({ lvl: 'err', t: S(`${u.name} cannot be taken with ${det.name}.`, `${u.name} no se puede llevar con ${det.name}.`) }); }); });
        return out;
    }

    // ---- leader <-> bodyguard linking inside a roster ----
    const uidOf = u => u.uid || (u.uid = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    function activeDets(r) { return ((STATE.currentFactionDetachments || []).filter(d => (r.detachments || []).includes(d.id))).map(d => n(d.name)); }
    function fitsRoster(r, leadD, bodyD) {
        const dets = activeDets(r);
        return (leadD.leads || []).some(g => {
            if (g.onlyIn && !dets.includes(n(g.onlyIn))) return false; if (g.notIn && dets.includes(n(g.notIn))) return false;
            const bk = kwSet(bodyD);
            return (g.units || []).some(x => n(x) === n(bodyD.name)) || ((g.keywords || []).length && g.keywords.every(k => bk.has(n(k))));
        });
    }
    // a unit can be led if it is not a leader itself, or if the leader names it outright (Farseer Skyrunner -> Warlock Skyrunners)
    const namedBy = (leadD, bodyD) => (leadD.leads || []).some(g => (g.units || []).some(x => n(x) === n(bodyD.name)));
    const ledOk = (leadD, bodyD) => !(bodyD.leads || []).length || namedBy(leadD, bodyD);
    function linkInfo(r, i) {
        const u = r.units[i], d = dsOf(u); if (!d) return null;
        const items = r.units.map((x, ix) => ({ x, ix, d: dsOf(x) }));
        const canLead = (d.leads || []).length ? items.filter(o => o.ix !== i && o.d && ledOk(d, o.d) && fitsRoster(r, d, o.d)) : [];
        const leaders = items.filter(o => o.ix !== i && o.d && (o.d.leads || []).length && ledOk(o.d, d) && fitsRoster(r, o.d, d));
        const attachedTo = u.att ? items.find(o => o.x.uid === u.att) : null;
        const ledBy = items.filter(o => o.x.att && o.x.uid !== undefined && u.uid && o.x.att === u.uid);
        return { d, canLead, leaders, attachedTo, ledBy };
    }
    // "Lokhust Destroyers · 3 models #2": which copy is which when a roster holds the same unit more than once
    function unitLabel(r, ix) {
        const x = r.units[ix], same = r.units.filter(y => y.name === x.name), k = same.indexOf(x) + 1;
        const inf = typeof window.rosterUnitSizes === 'function' ? rosterUnitSizes(x.name) : null, z = inf && inf.sizes[Math.min(x.sizeIdx || 0, inf.sizes.length - 1)];
        return x.name + (z && inf.sizes.length > 1 ? ' · ' + z.comp : '') + (same.length > 1 ? ' #' + k : '');
    }
    // leaders that could take this datasheet and are not leading anything yet / units this leader could join that have no leader yet
    function freeLeadersFor(r, bodyD, exceptIx) { return r.units.map((x, ix) => ({ x, ix, d: dsOf(x) })).filter(o => o.ix !== exceptIx && o.d && (o.d.leads || []).length && !o.x.att && ledOk(o.d, bodyD) && fitsRoster(r, o.d, bodyD)); }
    function freeBodiesFor(r, leadD, exceptIx) { return r.units.map((x, ix) => ({ x, ix, d: dsOf(x) })).filter(o => o.ix !== exceptIx && o.d && ledOk(leadD, o.d) && fitsRoster(r, leadD, o.d) && !r.units.some(y => y.att && y.att === o.x.uid)); }
    const selStyle = 'min-height:44px; background:#0f1a30; color:#fff; border:1px solid #3a4556; border-radius:8px; padding:0 8px; max-width:100%; flex:1; min-width:0;';
    function linkHtml(r, i) {
        const li = linkInfo(r, i); if (!li) return '';
        const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const isLeader = (li.d.leads || []).length, rows = [];
        if (isLeader) {
            if (li.canLead.length) rows.push(`<label style="display:flex; align-items:center; gap:8px;"><span style="color:#8c99b0; flex:none;">${S('Leads', 'Lidera')}:</span><select onclick="event.stopPropagation()" onchange="RULES.attach(${i}, this.value)" style="${selStyle}"><option value="">${S('— not attached —', '— sin unir —')}</option>${li.canLead.map(o => { const other = r.units.find((y, k) => k !== i && y.att && y.att === o.x.uid); return `<option value="${esc(uidOf(o.x))}" ${li.attachedTo && li.attachedTo.ix === o.ix ? 'selected' : ''}>${esc(unitLabel(r, o.ix))}${other ? ' — ' + S('led by', 'liderada por') + ' ' + esc(other.name) : ''}</option>`; }).join('')}</select></label>`);
            else rows.push(`<div style="color:#e5c15a;">⚠ ${S('Nobody in this roster to lead.', 'Nadie en esta lista a quien liderar.')} <span style="color:#8c99b0;">${S('Can lead', 'Puede liderar')}: ${esc(leadNames(li.d))}</span></div>`);
        }
        if (!isLeader || li.leaders.length || li.ledBy.length) {   // a leader that can itself be led (Warlock Skyrunners) gets both pickers
            // the unit's own side: who leads it, and a picker with the leaders that are still free
            li.ledBy.forEach(o => rows.push(`<div style="display:flex; align-items:center; gap:8px; color:#5be59a;"><span style="flex:1;">✔ ${S('Led by', 'Liderada por')}: <b>${esc(unitLabel(r, o.ix))}</b></span><button onclick="event.stopPropagation(); RULES.attach(${o.ix}, '')" aria-label="${S('Detach', 'Separar')}" style="flex:none; min-width:44px; min-height:40px; background:#232d3b; color:#ff9a9a; border:1px solid rgba(255,255,255,.15); border-radius:8px; cursor:pointer;">✕</button></div>`));
            const free = freeLeadersFor(r, li.d, i);
            if (free.length) rows.push(`<label style="display:flex; align-items:center; gap:8px;"><span style="color:#8c99b0; flex:none;">${li.ledBy.length ? S('Add leader', 'Añadir líder') : S('Led by', 'Liderada por')}:</span><select onclick="event.stopPropagation()" onchange="if (this.value) RULES.lead(${i}, this.value)" style="${selStyle}"><option value="">${li.ledBy.length ? S('— choose —', '— elegir —') : S('— no leader —', '— sin líder —')}</option>${free.map(o => `<option value="${esc(uidOf(o.x))}">${esc(unitLabel(r, o.ix))}</option>`).join('')}</select></label>`);
            else if (!li.ledBy.length && li.leaders.length) rows.push(`<div style="color:#8c99b0;">${S('Can be led by', 'Puede ser liderada por')}: ${li.leaders.map(o => esc(o.x.name)).join(', ')} ${S('(already leading other units)', '(ya lideran otras unidades)')}</div>`);
        }
        if (!rows.length) return '';
        return `<div onclick="event.stopPropagation()" style="padding:8px 15px 10px; border-top:1px solid #1a222d; font-size:0.82rem; display:flex; flex-direction:column; gap:6px;">${rows.join('')}</div>`;
    }
    // attach the leader with that uid to unit i (the bodyguard side of attach)
    function lead(i, leaderUid) {
        const r = currentActiveRoster, body = r.units[i]; if (!body) return;
        const li = r.units.findIndex(x => x.uid === leaderUid); if (li < 0) return;
        attach(li, uidOf(body));
    }
    function attach(i, uid) {
        const r = currentActiveRoster, u = r.units[i]; if (!u) return;
        if (uid) { const body = r.units.find(x => x.uid === uid); const mine = dsOf(u); if (body && mine) { const clash = r.units.find((x, ix) => ix !== i && x.att === uid && ((dsOf(x) || {}).leads || []).some(g => g.type === ((mine.leads || [])[0] || {}).type)); if (clash && !confirm(S(`${body.name} already has ${clash.name} attached as the same kind of leader. Attach anyway?`, `${body.name} ya tiene a ${clash.name} como el mismo tipo de líder. ¿Unir de todos modos?`))) { renderRosterBuilder(); return; } } u.att = uid; } else delete u.att;
        const k = STATE.rosters.findIndex(x => x.id === r.id); if (k > -1) STATE.rosters[k] = r; saveRosters(); renderRosterBuilder();
    }
    function checks(r) { return [].concat(leaderChecks(r), detachmentChecks(r)); }
    // bearer rows for the picker: eligible first, the rest with the reason
    function bearerRows(r, e) { return (r.units || []).map((u, i) => ({ u, i, res: canBear(u, e) })).filter(x => !x.u.enh); }
    window.RULES = { linkHtml, attach, lead, unitLabel, freeLeadersFor, freeBodiesFor, fitsRoster, uidOf, linkInfo, canBear, checks, leaderChecks, bearerRows, dsOf, kwSet, norm: n, leadNames };
})();
