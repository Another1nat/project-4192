/* Game Tracker: "Stratagems & CP" sheet per player.
   A sticky bar on top (CP − / +, search, phase chips, your turn / opponent's turn), then every stratagem the player can use:
   all of their detachments at once plus the core ones, each card tagged with where it comes from (no detachment tabs to flip
   through). Tap a card to read it, the cost button spends the CP (used ones listed and logged). Below: detachment rules, army
   rules and enhancements, folded. Data = the player's faction file, loaded without touching the datasheet screens. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ts = () => (typeof trackerState !== 'undefined' ? trackerState : null);
    const P = n => { const t = ts(); return t ? (n === 1 ? t.p1 : t.p2) : null; };
    const norm = f => String(f || '').replace(/’/g, "'").replace('Imperial Agents', 'Agents of the Imperium');
    const cache = {}, st = { 1: { phase: 'all', turn: 'all' }, 2: { phase: 'all', turn: 'all' } };
    const PHASES = [['all', 'All', 'Todas'], ['command', 'Command', 'Mando'], ['movement', 'Movement', 'Movimiento'], ['shooting', 'Shooting', 'Disparo'], ['charge', 'Charge', 'Carga'], ['fight', 'Fight', 'Combate']];
    const TURNS = [['all', 'Both turns', 'Ambos turnos'], ['your', 'Your turn', 'Tu turno'], ['opp', "Opponent's turn", 'Turno rival']];
    const DCOL = ['#e5c15a', '#7cc4ff', '#c39bff', '#7ee0a1', '#ff9f6b', '#f78fb3'], CORE_COL = '#8c99b0';   // one colour per detachment
    const save = () => { if (window.saveCurrentGame) saveCurrentGame(); if (window.LSYNC && LSYNC.active && LSYNC.active()) LSYNC.broadcastState(); };
    const fm = t => (window.DETINFO ? DETINFO.fmt(t) : esc(t)).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const ph = k => (PHASES.find(q => q[0] === k) || [k, k, k])[lang() === 'es' ? 2 : 1];

    async function load(name) {
        const f = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => norm(x.name) === norm(name)); if (!f) return null;
        if (cache[f.name]) return cache[f.name];
        try { const parsed = await BLDATA.get(window.blFactionUrl(f.name), {}); return cache[f.name] = { f, parsed, dets: blBuildDetachments(f.name, parsed) }; } catch (e) { return null; }
    }
    function ensure() {
        [1, 2].forEach(n => {
            const card = document.getElementById('ag-card-' + n); if (!card || card.querySelector('.tr-btn')) return;
            const c = n === 1 ? '#4db8ff' : '#ff4d4d', btn = document.createElement('button');
            btn.className = 'tr-btn'; btn.innerHTML = `<i class="fa-solid fa-scroll"></i> ${S('STRATAGEMS, DETACHMENT & CP', 'ESTRATAGEMAS, DESTACAMENTO Y CP')}`;
            btn.style.cssText = `display:block; width:100%; min-height:44px; margin-top:10px; background:#1e252f; border:1px dashed ${c}; color:${c}; border-radius:8px; padding:12px; font-size:0.9rem; font-weight:bold; cursor:pointer; letter-spacing:1px;`;
            btn.onclick = () => TR.open(n);
            const w = document.createElement('div'); w.style.cssText = 'margin-top:12px;'; w.appendChild(btn);
            const lastBlock = card.lastElementChild; if (lastBlock) lastBlock.appendChild(w);
        });
        if (!document.getElementById('tr-modal')) {
            const m = document.createElement('div'); m.id = 'tr-modal'; m.className = 'tk-sheet';
            m.innerHTML = `<div class="tk-head"><div class="tk-t" id="tr-title"></div><button class="tk-x" onclick="TR.close()" aria-label="${S('Close', 'Cerrar')}"><i class="fa-solid fa-xmark"></i></button></div><div id="tr-body" class="tk-body"></div>`;
            document.body.appendChild(m);
        }
    }
    const anyPhase = s => /any phase/i.test(String(s.turn || ''));   // e.g. Command Re-roll: shown under every phase filter
    const phaseOf = s => { const t = String(s.turn || '').toLowerCase(); return anyPhase(s) ? PHASES.slice(1).map(p => p[0]) : PHASES.slice(1).filter(p => t.includes(p[0] + ' phase') || t.includes(p[0] + ' step')).map(p => p[0]); };
    const turnOf = x => x.when === 'opponentsTurn' ? 'opp' : x.when === 'yourTurn' ? 'your' : 'either';
    let core = null;                                   // core stratagems (Command Re-roll, Counteroffensive, …) for every army
    async function loadCore() { if (core) return core; try { core = await (await fetch('data/core_stratagems.json' + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : ''))).json(); } catch (e) { core = []; } return core; }

    // the detachments shown: the ones picked in the game setup; with none picked, the ones ticked here (none ticked = all of them)
    function shownDets(n, data) {
        const p = P(n), chosen = (p.detachments || []).map(d => d.name);
        if (chosen.length) { const d = data.dets.filter(x => chosen.includes(x.name)); if (d.length) return { list: d, picked: true }; }
        const mine = p.stratDets || [], d = data.dets.filter(x => mine.includes(x.name));
        return { list: d.length ? d : data.dets, picked: false };
    }
    function cardHtml(n, x, src, col) {
        const p = P(n), c = parseInt(x.cost) || 0, t = ts(), round = (t && t.round) || 1;
        const used = (p.stratUsed || []).filter(u => u.name === x.name && u.round === round).length;
        const when = { opp: S("Opponent's turn", 'Turno rival'), your: S('Your turn', 'Tu turno'), either: S('Either turn', 'Cualquier turno') }[turnOf(x)];
        const phases = anyPhase(x) ? S('Any phase', 'Cualquier fase') : phaseOf(x).map(ph).join(' / ');
        return `<details class="tr-strat tk-st" style="--dc:${col}" data-n="${esc(x.name)}" data-q="${esc((x.name + ' ' + src + ' ' + (x.turn || '') + ' ' + (x.effect || '') + ' ' + (x.target || '')).toLowerCase())}" data-ph="${anyPhase(x) ? 'any' : phaseOf(x).join(' ')}" data-w="${turnOf(x)}">
            <summary><div class="tk-st-m"><b class="tk-n">${esc(x.name)}</b><div class="tk-when">${esc([when, phases].filter(Boolean).join(' · '))}</div>
              <div class="tk-src"><i></i>${esc(src)}${usedMark(used)}</div></div>
              <button class="tk-cost" data-c="${c}" onclick="event.preventDefault(); event.stopPropagation(); TR.spend(${n}, ${c}, '${esc(x.name).replace(/'/g, "\\'")}')" ${(p.cp || 0) < c ? 'disabled' : ''} title="${S('Use (spend CP)', 'Usar (gastar CP)')}">${esc(x.cost)} CP</button></summary>
            <div class="tk-txt"><p><b class="tk-l">${S('When', 'Cuándo')}</b>${fm(x.turn)}</p><p><b class="tk-l">${S('Target', 'Objetivo')}</b>${fm(x.target)}</p><p><b class="tk-l">${S('Effect', 'Efecto')}</b>${fm(x.effect)}</p>${x.restriction ? `<p><b class="tk-l">${S('Restrictions', 'Restricciones')}</b>${fm(x.restriction)}</p>` : ''}</div></details>`;
    }
    const usedMark = k => k ? `<span class="tk-used"><i class="fa-solid fa-check"></i> ${S('used this round', 'usada esta ronda')}${k > 1 ? ' ×' + k : ''}</span>` : '';
    // used this game (newest first)
    const usedHtml = n => { const u = (P(n).stratUsed || []).slice(-8).reverse();
        return u.length ? `<div class="tk-usedrow"><span>${S('Used', 'Usadas')}</span>${u.map(x => `<em>${esc(x.name)} · R${x.round}</em>`).join('')}</div>` : ''; };
    const cpHtml = n => { const p = P(n); return `<button onclick="TR.cp(${n}, -1)" aria-label="−1 CP">−</button><output><b>${p.cp}</b><span>CP</span></output><button onclick="TR.cp(${n}, 1)" aria-label="+1 CP">+</button>`; };

    async function render(n) {
        const p = P(n), body = document.getElementById('tr-body'); if (!p || !body) return;
        document.getElementById('tr-title').innerHTML = `${esc(p.name || S('Player ', 'Jugador ') + n)}<small>${esc(p.faction || '')}</small>`;
        p.cp = typeof p.cp === 'number' ? p.cp : 1;   // matched play: each player starts round 1 with 1 CP
        const top = (extra = '') => `<div class="tk-top"><div class="tk-row"><div class="tk-cp" id="tr-cp">${cpHtml(n)}</div>${extra}</div>`;
        if (!p.faction) { body.innerHTML = top() + `</div><div class="tk-empty">${S('Pick a faction for this player to see their stratagems and detachments.', 'Elige una facción para este jugador para ver sus estratagemas y destacamentos.')}</div>`; return; }
        body.innerHTML = top() + `</div><div class="tk-empty"><i class="fa-solid fa-spinner fa-spin"></i></div>`;
        const [data] = await Promise.all([load(p.faction), loadCore()]);
        if (!data) { body.innerHTML = top() + `</div><div class="tk-empty" style="color:#ff6b6b;">${S('Could not load this faction. Check your connection (or save it for offline use).', 'No se pudo cargar la facción. Revisa tu conexión (o guárdala para uso sin conexión).')}</div>`; return; }
        const s = st[n], { list, picked } = shownDets(n, data);
        const col = d => DCOL[Math.max(0, list.indexOf(d)) % DCOL.length];
        const cards = [];
        list.forEach(d => ((d.d39 || {}).stratagems || []).forEach(x => cards.push(cardHtml(n, x, d.name, col(d)))));
        (core || []).forEach(x => cards.push(cardHtml(n, x, S('Core stratagem', 'Estratagema básica'), CORE_COL)));
        // with no detachment picked in the setup: tick yours here (stays with this game)
        const mine = p.stratDets || [];
        const pick = picked ? '' : `<details class="dt-more tk-more tk-pick"><summary><span>${mine.length ? S('Showing', 'Mostrando') + ': ' + esc(mine.join(', ')) : S(`All ${data.dets.length} detachments — tap yours`, `Los ${data.dets.length} destacamentos — toca los tuyos`)}</span></summary><div class="dt-body"><div class="tk-chips tk-wrap">${data.dets.map(d => `<button class="tk-chip${mine.includes(d.name) ? ' on' : ''}" onclick="TR.pickDet(${n}, '${esc(d.name).replace(/'/g, "\\'")}')">${esc(d.name)}</button>`).join('')}</div></div></details>`;
        const rules = list.map(d => { const txt = ((d.d39 || {}).rules || []).map(r => `<div class="tk-rule"><b>${esc(r.name)}</b><div>${fm(r.description)}</div></div>`).join('');
            return `<details class="dt-more tk-more" style="--dc:${col(d)}"><summary><span><i class="tk-dot"></i>${esc(d.name)}</span></summary><div class="dt-body">${txt || `<div style="color:#888;">${S('No rule text for this detachment.', 'Sin texto de regla para este destacamento.')}</div>`}</div></details>`; }).join('');
        const enhList = [].concat(...list.map(d => ((d.d39 || {}).enhancements || []).map(e => [e, d])));
        const enh = enhList.map(([e, d]) => `<div class="tk-rule" style="--dc:${col(d)}"><b style="color:#ffae42;">${esc(e.name)}</b> <span class="tk-pts">${e.cost} pts</span><div class="tk-src"><i></i>${esc(d.name)}</div><div>${fm(e.description)}</div></div>`).join('');
        const army = (data.parsed.rules || []).map(r => `<div class="tk-rule"><b>${esc(r.name)}</b><div>${fm(r.description)}</div></div>`).join('');
        body.innerHTML = top(`<input id="tr-q" class="tk-q" type="search" enterkeyhint="search" placeholder="${S('Search stratagems…', 'Buscar estratagemas…')}" oninput="TR.filter(this.value)">`)
            + `<div class="tk-chips" id="tr-ph">${PHASES.map(q => `<button class="tk-chip${s.phase === q[0] ? ' on' : ''}" data-v="${q[0]}" onclick="TR.phase(${n}, '${q[0]}')">${lang() === 'es' ? q[2] : q[1]}</button>`).join('')}</div>`
            + `<div class="tk-seg" id="tr-turn">${TURNS.map(q => `<button class="${s.turn === q[0] ? 'on' : ''}" data-v="${q[0]}" onclick="TR.turn(${n}, '${q[0]}')">${lang() === 'es' ? q[2] : q[1]}</button>`).join('')}</div></div>`
            + pick
            + `<h3 class="tk-h">${S('Stratagems', 'Estratagemas')} <span id="tr-count"></span></h3><div id="tr-used">${usedHtml(n)}</div>`
            + `<div id="tr-strats">${cards.join('')}</div><div class="tk-empty" id="tr-none" style="display:none;">${S('No stratagem matches.', 'Ninguna estratagema coincide.')}</div>`
            + `<h3 class="tk-h" style="margin-top:22px;">${list.length > 1 ? S('Detachment rules', 'Reglas de destacamento') : S('Detachment rule', 'Regla de destacamento')}</h3>` + rules
            + (enh ? `<details class="dt-more tk-more"><summary><span>${S('Enhancements', 'Mejoras')}</span><span class="tk-pts">${enhList.length}</span></summary><div class="dt-body">${enh}</div></details>` : '')
            + (army ? `<details class="dt-more tk-more"><summary><span>${S('Army rules', 'Reglas de ejército')}</span></summary><div class="dt-body">${army}</div></details>` : '');
        const q = document.getElementById('tr-q'); if (q) q.value = TR._q || '';
        apply();
    }
    // every filter (search, phase, turn) hides cards in place: no redraw, so the keyboard stays open and the scroll stays put
    function apply() {
        const n = TR._n, s = st[n] || st[1], q = TR._q || ''; let shown = 0;
        document.querySelectorAll('#tr-strats .tr-strat').forEach(el => {
            const ok = (!q || el.dataset.q.includes(q)) && (s.phase === 'all' || el.dataset.ph === 'any' || el.dataset.ph.split(' ').includes(s.phase))
                && (s.turn === 'all' || el.dataset.w === 'either' || el.dataset.w === s.turn);
            el.style.display = ok ? '' : 'none'; if (ok) shown++; });
        const c = document.getElementById('tr-count'); if (c) c.textContent = shown;
        const none = document.getElementById('tr-none'); if (none) none.style.display = shown ? 'none' : 'block';
        ['tr-ph', 'tr-turn'].forEach((id, i) => { const box = document.getElementById(id); if (box) box.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === (i ? s.turn : s.phase))); });
    }
    // after CP changes: the number, the cost buttons, the "used" marks; the rest of the sheet is left alone
    function refresh(n) {
        const p = P(n), box = document.getElementById('tr-cp'); if (box) box.innerHTML = cpHtml(n);
        document.querySelectorAll('#tr-strats .tk-cost').forEach(b => { b.disabled = (p.cp || 0) < +b.dataset.c; });
        const u = document.getElementById('tr-used'); if (u) u.innerHTML = usedHtml(n);
        const t = ts(), round = (t && t.round) || 1;
        document.querySelectorAll('#tr-strats .tr-strat').forEach(el => { const k = (p.stratUsed || []).filter(x => x.name === el.dataset.n && x.round === round).length, src = el.querySelector('.tk-src'), old = src && src.querySelector('.tk-used');
            if (old) old.remove(); if (k && src) src.insertAdjacentHTML('beforeend', usedMark(k)); });
    }
    window.TR = {
        open(n) { ensure(); TR._q = ''; TR._n = n; document.getElementById('tr-modal').style.display = 'flex'; document.getElementById('tr-body').scrollTop = 0; render(n); },
        close() { const m = document.getElementById('tr-modal'); if (m) m.style.display = 'none'; },
        cp(n, d) { const p = P(n); p.cp = Math.max(0, (p.cp || 0) + d); if (window.GDM_touch) GDM_touch('cp' + n); save(); refresh(n); if (window.renderGame) window.renderGame(); },   // keep the CP on the main screen in step
        spend(n, c, name) { const p = P(n); if ((p.cp || 0) < c) return; p.cp -= c; if (window.GDM_touch) GDM_touch('cp' + n); const t = ts();
            (p.stratUsed = p.stratUsed || []).push({ name, cost: c, round: (t && t.round) || 1 });
            if (window.LSYNC && LSYNC.logAction) LSYNC.logAction(`${p.name || 'P' + n} used ${name} (−${c} CP)`);   // spectators see it in the activity log
            save(); refresh(n); if (window.renderGame) window.renderGame(); if (window.toast) toast(`${name} · −${c} CP`); },
        filter(q) { TR._q = String(q || '').toLowerCase().trim(); apply(); },
        phase(n, v) { st[n].phase = v; apply(); }, turn(n, v) { st[n].turn = v; apply(); },
        pickDet(n, name) { const p = P(n), a = p.stratDets = p.stratDets || [], i = a.indexOf(name); if (i >= 0) a.splice(i, 1); else a.push(name); save(); render(n); },
        load
    };
    const boot = () => { ensure(); setInterval(ensure, 2500); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 800)); else setTimeout(boot, 800);
})();
