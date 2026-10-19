/* Game Tracker: "Roster & units" sheet.
   Pick one of your saved rosters (same-faction ones first) or any faction's datasheets; the choice then folds into a bar on
   top (tap it to change), with the search box under it. Units are grouped by role, each with its stats in small cells and a
   heart to mark it lost; tap a unit for its weapons, abilities and keywords. Local to the device, but the pick is sent to the
   others through live_sync when a live game is on. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ts = () => (typeof trackerState !== 'undefined' ? trackerState : null);
    const P = n => { const t = ts(); return t ? (n === 1 ? t.p1 : t.p2) : null; };
    const norm = f => String(f || '').replace(/’/g, "'").replace('Imperial Agents', 'Agents of the Imperium');
    const rosters = () => (typeof STATE !== 'undefined' && STATE.rosters) || [];
    const facData = {};   // faction name -> units
    const loading = {};
    const q = {};         // unit search per player
    const showPick = {};  // source picker open, per player

    function army(n) { const p = P(n); if (!p) return null; p.army = p.army || { rid: null, faction: null, dead: {} }; p.army.dead = p.army.dead || {}; return p.army; }
    const save = () => {
        if (window.saveCurrentGame) saveCurrentGame();
        if (window.LSYNC && LSYNC.active()) LSYNC.broadcastState();   // the others see which roster is picked
    };

    function ensure() {
        [1, 2].forEach(n => {
            const card = document.getElementById('ag-card-' + n); if (!card || card.querySelector('.ta-roster-btn')) return;
            const c = n === 1 ? '#4db8ff' : '#ff4d4d', btn = document.createElement('button');
            btn.className = 'ta-roster-btn';
            btn.innerHTML = `<i class="fa-solid fa-list-ul"></i> ${S('ROSTER & UNITS', 'EJÉRCITO Y UNIDADES')}`;
            btn.style.cssText = `margin-top:0; display:block; width:100%; background:#1e252f; border:1px dashed ${c}; color:${c}; border-radius:8px; padding:12px; min-height:44px; font-size:0.9rem; font-weight:bold; cursor:pointer; letter-spacing:1px; position:relative;`;
            btn.onclick = () => TA.openModal(n);
            const wrapper = document.createElement('div');           // a top border to separate it from the secondaries
            wrapper.style.cssText = `margin-top:20px; padding-top:20px; border-top:1px solid #3a4556;`;
            wrapper.appendChild(btn);
            const lastBlock = card.lastElementChild; if (lastBlock) lastBlock.appendChild(wrapper);
        });
        if (!document.getElementById('ta-modal')) {
            const m = document.createElement('div');
            m.id = 'ta-modal'; m.className = 'tk-sheet';
            m.innerHTML = `<div class="tk-head"><div class="tk-t" id="ta-modal-title">ROSTER</div><button class="tk-x" onclick="TA.close()" aria-label="${S('Close', 'Cerrar')}"><i class="fa-solid fa-xmark"></i></button></div><div id="ta-modal-body" class="tk-body"></div>`;
            document.body.appendChild(m);
        }
    }

    const ptsOf = r => (r.units || []).reduce((s, u) => s + (+u.pts || 0), 0);
    // where the units come from: one of your rosters, or any faction's datasheets
    function picker(n) {
        const p = P(n), a = army(n), pf = norm(p.faction);
        const rs = rosters(), same = rs.filter(r => r.faction && norm(r.faction.name) === pf), other = rs.filter(r => !same.includes(r));
        const card = r => `<button class="ta-rc${a.rid === r.id ? ' on' : ''}" onclick="TA.pick(${n}, 'r:${esc(r.id)}')"><b>${esc(r.name)}</b><span>${esc(r.faction && r.faction.name || '')} · ${ptsOf(r)}/${r.pointsLimit || '?'} pts · ${(r.units || []).length} ${S('units', 'unidades')}</span></button>`;
        const facs = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).map(f => `<option value="f:${esc(f.name)}" ${(!a.rid && a.faction === f.name) ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
        return `<div class="tk-pickp">${rs.length ? `<div class="tk-h">${S('Your rosters', 'Tus listas')}</div><div class="ta-rcs">${same.map(card).join('')}${other.map(card).join('')}</div>`
                : `<div class="tk-note">${S('You have no saved rosters yet — build one in Rosters, or browse any faction below.', 'Aún no tienes listas guardadas: crea una en Ejércitos o explora cualquier facción abajo.')}</div>`}
            <div class="tk-h">${S("Or browse a faction's datasheets", 'O explora los datasheets de una facción')}</div>
            <select class="tk-sel" onchange="TA.pick(${n}, this.value)"><option value="">${S('— choose a faction —', '— elige una facción —')}</option>${facs}</select></div>`;
    }
    // sticky top: what is open (tap to change it) and the search box
    function top(n, title, sub) {
        return `<div class="tk-top"><button class="ta-src" onclick="TA.change(${n})"><span><b>${esc(title)}</b><small>${sub}</small></span><em>${S('Change', 'Cambiar')} <i class="fa-solid fa-chevron-${showPick[n] ? 'up' : 'down'}"></i></em></button>
            <input class="tk-q" type="search" enterkeyhint="search" placeholder="${S('Search units, enhancements…', 'Buscar unidades, mejoras…')}" value="${esc(q[n] || '')}" oninput="TA.search(${n}, this.value)" style="width:100%; margin-top:8px;"></div>`
            + (showPick[n] ? picker(n) : '');
    }

    // stats as small cells (M T SV W LD OC INV), the way they read on the datasheet
    const statCells = snap => { const c = snap && snap.stats && snap.stats[0] && snap.stats[0].c; return c && c.length ? `<div class="tk-stats">${c.map(([k, v]) => `<span><i>${esc(String(k).toUpperCase())}</i><b>${esc(v)}</b></span>`).join('')}</div>` : ''; };
    const noMatch = `<div class="ta-none tk-empty" style="display:none;">${S('No unit matches.', 'Ninguna unidad coincide.')}</div>`;
    const ORDER = ['EPIC HERO', 'CHARACTER', 'BATTLELINE', 'INFANTRY', 'MOUNTED', 'BEAST', 'SWARM', 'VEHICLE', 'MONSTER', 'DEDICATED TRANSPORT', 'FORTIFICATION', 'ALLIED', 'OTHER'];
    const roleOf = u => (window.unitRole ? window.unitRole(u) : (u.role || 'OTHER')).toUpperCase();
    const byRoles = items => { const by = {}; items.forEach(it => (by[roleOf(it.u)] = by[roleOf(it.u)] || []).push(it));
        const rank = r => { const i = ORDER.indexOf(r); return i < 0 ? 99 : i; };
        return Object.keys(by).sort((x, y) => rank(x) - rank(y) || x.localeCompare(y)).map(r => [r, by[r]]); };
    const group = (role, items, open, inner) => `<details class="ta-role tk-grp"${open ? ' open' : ''}><summary><span>${esc(role.charAt(0) + role.slice(1).toLowerCase())}</span><span class="tk-cnt">${items.length}</span></summary>${items.map(it => inner(it, role)).join('')}</details>`;

    function rosterView(n, r) {
        const a = army(n); r.ds = r.ds || {};
        const groups = []; (r.units || []).forEach((u, i) => { const g = groups.find(x => x.u.id === u.id && x.u.name === u.name && !!x.u.enh === !!u.enh); if (g) g.idx.push(i); else groups.push({ u, idx: [i] }); });
        const isDead = i => !!a.dead[n + ':' + r.id + ':' + i], all = (r.units || []).length, lost = (r.units || []).filter((u, i) => isDead(i));
        const lostPts = lost.reduce((s, u) => s + (+u.pts || 0), 0);
        let h = top(n, r.name, `${ptsOf(r)}/${r.pointsLimit || '?'} pts · ${all} ${S('units', 'unidades')}`);
        h += `<div class="tk-sum"><span><b>${all - lost.length}</b>/${all} ${S('alive', 'vivas')}</span>${lost.length ? `<span class="bad"><b>${lost.length}</b> ${S('lost', 'perdidas')} · ${lostPts} pts</span>` : `<span>${S('Tap', 'Toca')} <i class="fa-solid fa-heart"></i> ${S('when a unit dies', 'cuando muere una unidad')}</span>`}</div>` + noMatch;
        h += byRoles(groups.map((g, gi) => ({ u: g.u, g, gi }))).map(([role, items]) => group(role, items, true, ({ g, gi }) => {
            const u = g.u, snap = r.ds[u.id], dead = g.idx.filter(isDead).length, alive = g.idx.length - dead, idx = `ta${n}_${gi}`;
            const body = snap && window.rosterDetailsHtml ? window.rosterDetailsHtml(idx, snap) : `<div id="ru-details-${idx}" class="tk-note" style="display:none; padding:12px;">${S('Datasheet not saved yet — open this roster once online.', 'Datasheet aún no guardado: abre esta lista una vez con internet.')}</div>`;
            const life = g.idx.length > 1 ? `${alive}/${g.idx.length}` : (dead ? '<i class="fa-solid fa-skull"></i>' : '<i class="fa-solid fa-heart"></i>');
            return `<div class="ta-unit tk-unit${alive === 0 ? ' lost' : ''}" data-q="${esc((u.name + ' ' + (u.enh ? u.enh.name : '') + ' ' + role).toLowerCase())}">
                <div class="tk-uh" onclick="TA.toggle('${idx}')"><div class="tk-um"><div class="tk-un"><b>${esc(u.name)}</b>${g.idx.length > 1 ? `<span class="tk-mult">×${g.idx.length}</span>` : ''}<span class="tk-pts">${u.pts} pts</span></div>
                    ${u.enh ? `<div class="tk-enh"><i class="fa-solid fa-star"></i> ${esc(u.enh.name)}</div>` : ''}${statCells(snap)}</div>
                  <button class="tk-life${dead ? ' on' : ''}" onclick="event.stopPropagation(); TA.lost(${n}, '${esc(r.id)}', ${g.idx[0]}, ${g.idx.length})" title="${S('Mark lost', 'Marcar baja')}">${life}</button></div>${body}</div>`; })).join('');
        return h;
    }

    function factionView(n, name) {
        const f = (FACTIONS || []).find(x => x.name === name); if (!f) return '';
        const units = facData[name], head = top(n, name, S('All datasheets', 'Todos los datasheets'));
        if (!units) {
            if (units === null) return head + `<div class="tk-empty" style="color:#ff6b6b;">${S('Could not load the datasheets.', 'No se pudieron cargar los datasheets.')} ${navigator.onLine ? '' : S('You are offline and this faction is not saved on this device.', 'Sin conexión y esta facción no está guardada en este dispositivo.')}</div><button class="tk-sel" onclick="TA.retry(${n}, '${esc(name)}')"><i class="fa-solid fa-rotate-right"></i> ${S('Try again', 'Reintentar')}</button>`;
            return head + `<div class="tk-empty"><i class="fa-solid fa-spinner fa-spin fa-2x"></i><div style="margin-top:15px;">${S('Loading datasheets…', 'Cargando datasheets…')}</div></div>`;
        }
        return head + noMatch + byRoles(units.map((u, i) => ({ u, i }))).map(([role, items]) => group(role, items, false, ({ u, i }) => {
            const idx = `ta${n}f_${i}`; let snap = null; try { snap = typeof rosterSnap === 'function' ? rosterSnap(u) : u; } catch (e) {}
            const body = snap && window.rosterDetailsHtml ? window.rosterDetailsHtml(idx, snap) : '';
            return `<div class="ta-unit tk-unit" data-q="${esc((u.name + ' ' + role).toLowerCase())}"><div class="tk-uh" onclick="TA.toggle('${idx}')"><div class="tk-um"><div class="tk-un"><b>${esc(u.name)}</b><span class="tk-pts">${u.points ? u.points + ' pts' : ''}</span></div>${statCells(snap)}</div></div>${body}</div>`; })).join('');
    }

    async function loadFaction(n, name) {
        const f = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => x.name === name); if (!f || loading[name]) return; loading[name] = true;
        delete facData[name]; TA.renderModalBody(n);
        try { const ok = window.preloadFactionData ? await preloadFactionData(f) : false; facData[name] = ok && (STATE.currentFactionData || []).length ? (STATE.currentFactionData || []).slice() : null; } catch (e) { facData[name] = null; }
        loading[name] = false;
        TA.renderModalBody(n);
    }

    window.TA = {
        currentModalN: null,
        openModal(n) {
            ensure();
            const p = P(n); if (!p) return;
            const a = army(n);
            if (!a.rid && !a.faction && p.faction) {           // nothing picked yet: the roster of this player's faction, else its datasheets
                const mine = rosters().filter(r => r.faction && norm(r.faction.name) === norm(p.faction));
                const f = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => norm(x.name) === norm(p.faction));
                if (mine.length === 1) a.rid = mine[0].id; else if (!mine.length && f) a.faction = f.name;
                if (a.rid || a.faction) save();
            }
            showPick[n] = !a.rid && !a.faction;
            document.getElementById('ta-modal-title').innerHTML = `${esc(p.name || S('Player ', 'Jugador ') + n)}<small>${S('Roster & units', 'Ejército y unidades')}</small>`;
            TA.currentModalN = n;
            TA.renderModalBody(n);
            document.getElementById('ta-modal').style.display = 'flex';
            document.getElementById('ta-modal-body').scrollTop = 0;
        },
        close() { const m = document.getElementById('ta-modal'); if (m) m.style.display = 'none'; },
        renderModalBody(n) {
            if (TA.currentModalN !== n) return;
            const body = document.getElementById('ta-modal-body');
            if (!body) return;
            const a = army(n), r = a.rid && rosters().find(x => x.id === a.rid);
            if (!r && a.faction && facData[a.faction] === undefined && !loading[a.faction]) setTimeout(() => loadFaction(n, a.faction), 0);
            const keep = body.scrollTop;
            body.innerHTML = r ? rosterView(n, r) : a.faction ? factionView(n, a.faction)
                : picker(n) + `<div class="tk-note" style="text-align:center; padding:16px;">${S("Pick one of your saved rosters to see its units here, or open any faction's datasheets. Handy for checking rules mid-game.", 'Elige una de tus listas guardadas para ver aquí sus unidades, o abre los datasheets de cualquier facción. Útil para consultar reglas durante la partida.')}</div>`;
            body.scrollTop = keep;
            if (q[n]) TA.search(n, q[n]);
        },
        pick(n, v) {
            const a = army(n); a.rid = null; a.faction = null;
            if (v.startsWith('r:')) a.rid = v.slice(2); else if (v.startsWith('f:')) { a.faction = v.slice(2); if (!facData[a.faction]) loadFaction(n, a.faction); }
            showPick[n] = !a.rid && !a.faction; q[n] = '';
            save(); TA.renderModalBody(n);
        },
        change(n) { showPick[n] = !showPick[n]; TA.renderModalBody(n); },
        toggle(idx) { const p = document.getElementById('ru-details-' + idx); if (!p) return; const open = p.style.display === 'none'; p.style.display = open ? 'block' : 'none'; const u = p.closest('.tk-unit'); if (u) u.classList.toggle('open', open); },
        lost(n, rid, first, count) {
            const a = army(n), roster = rosters().find(x => x.id === rid); if (!roster) return;
            const grp = []; (roster.units || []).forEach((u, i) => { const f = roster.units[first]; if (u.id === f.id && u.name === f.name && !!u.enh === !!f.enh) grp.push(i); });
            const k2 = grp.map(i => n + ':' + rid + ':' + i), alive = k2.filter(k => !a.dead[k]);
            if (alive.length) a.dead[alive[0]] = true; else k2.forEach(k => delete a.dead[k]);   // tap again once all are lost: back alive
            save(); TA.renderModalBody(n);
        },
        // filters the cards in place (the list is not redrawn, so the keyboard stays open); groups with a match open, empty ones hide
        search(n, v) {
            q[n] = v; const term = String(v || '').toLowerCase().trim(), body = document.getElementById('ta-modal-body'); if (!body) return;
            let any = false;
            body.querySelectorAll('.ta-role').forEach(role => { let hit = 0;
                role.querySelectorAll('.ta-unit').forEach(c => { const ok = !term || c.dataset.q.includes(term); c.style.display = ok ? '' : 'none'; if (ok) hit++; });
                const badge = role.querySelector('.tk-cnt'); if (badge) { badge.dataset.total = badge.dataset.total || badge.textContent; badge.textContent = term ? hit : badge.dataset.total; }   // matches, not the total
                role.style.display = hit ? '' : 'none'; if (term && hit) role.open = true; if (hit) any = true; });
            const none = body.querySelector('.ta-none'); if (none) none.style.display = any || !body.querySelector('.ta-role') ? 'none' : 'block';
        },
        retry(n, name) { loadFaction(n, name); },
        paint() { ensure(); }
    };

    function boot() { ensure(); TA.paint(); setInterval(() => { if (window.GDM && GDM.hasActiveGame && GDM.hasActiveGame()) { ensure(); } }, 2500); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 700)); else setTimeout(boot, 700);
})();
