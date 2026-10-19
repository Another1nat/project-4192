/* Tournaments inside a league: Swiss / round robin / single elimination.
   Engine (window.TOURN: standings + pairings) and UI (the "Tournament" screen opened from the League screen).
   Data lives in Supabase (supabase/tournaments.sql); all writes go through RPC functions. */
(function () {
    // ───────────── engine (pure) ─────────────
    const WIN = 3, DRAW = 1;
    function standings(players, matches) {
        const S = {}; players.forEach((p, i) => S[p.id] = { id: p.id, name: p.name, faction: p.faction, dropped: p.dropped, seed: p.seed || i, pts: 0, w: 0, d: 0, l: 0, vpf: 0, vpa: 0, opps: [], byes: 0, played: 0, buch: 0 });
        matches.forEach(m => {
            const a = S[m.p1]; if (!a) return;
            if (m.status === 'bye' || !m.p2) { a.pts += WIN; a.w++; a.byes++; a.played++; return; }
            if (m.status !== 'reported') return; const b = S[m.p2]; if (!b) return;
            a.vpf += m.p1_vp; a.vpa += m.p2_vp; b.vpf += m.p2_vp; b.vpa += m.p1_vp; a.opps.push(b.id); b.opps.push(a.id); a.played++; b.played++;
            if (m.p1_vp > m.p2_vp) { a.pts += WIN; a.w++; b.l++; } else if (m.p1_vp < m.p2_vp) { b.pts += WIN; b.w++; a.l++; } else { a.pts += DRAW; b.pts += DRAW; a.d++; b.d++; }
        });
        const list = Object.values(S); list.forEach(s => { s.buch = s.opps.reduce((t, o) => t + (S[o] ? S[o].pts : 0), 0); s.diff = s.vpf - s.vpa; });
        list.sort((x, y) => y.pts - x.pts || y.buch - x.buch || y.diff - x.diff || y.vpf - x.vpf || x.seed - y.seed);
        list.forEach((s, i) => s.rank = i + 1); return list;
    }
    const playedPairs = matches => { const s = new Set(); matches.forEach(m => { if (m.p2) { s.add(m.p1 + '|' + m.p2); s.add(m.p2 + '|' + m.p1); } }); return s; };
    function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
    // Swiss: top-down by standing, never a rematch if avoidable, odd player count -> bye to the lowest player without one
    function pairSwiss(players, matches, round) {
        const active = players.filter(p => !p.dropped); let order = round === 1 ? shuffle(active) : standings(active, matches.filter(m => active.some(p => p.id === m.p1 || p.id === m.p2))).map(s => active.find(p => p.id === s.id));
        const pairs = []; let bye = null;
        if (order.length % 2) {
            const had = new Set(matches.filter(m => !m.p2).map(m => m.p1));
            for (let i = order.length - 1; i >= 0; i--) if (!had.has(order[i].id)) { bye = order[i]; break; }
            bye = bye || order[order.length - 1]; order = order.filter(p => p !== bye);
        }
        const seen = playedPairs(matches);
        const solve = (list, allowRematch) => {
            if (!list.length) return [];
            const [a, ...rest] = list;
            for (let i = 0; i < rest.length; i++) { const b = rest[i]; if (!allowRematch && seen.has(a.id + '|' + b.id)) continue; const sub = solve(rest.filter((_, k) => k !== i), allowRematch); if (sub) return [[a, b]].concat(sub); }
            return null;
        };
        const res = solve(order, false) || solve(order, true) || [];
        res.forEach(([a, b], i) => pairs.push({ p1: a.id, p2: b.id, table: i + 1 }));
        if (bye) pairs.push({ p1: bye.id, p2: null, table: pairs.length + 1 });
        return pairs;
    }
    // Round robin: circle method (everyone plays everyone once; odd counts get a bye each round)
    function pairRoundRobin(players, round) {
        const ps = players.filter(p => !p.dropped).slice().sort((a, b) => (a.seed || 0) - (b.seed || 0)); const arr = ps.map(p => p.id); if (arr.length % 2) arr.push(null);
        const n = arr.length, rot = arr.slice(1); const r = (round - 1) % (n - 1); const rotated = rot.slice(rot.length - r).concat(rot.slice(0, rot.length - r)); const line = [arr[0]].concat(rotated);
        const out = []; let t = 1;
        for (let i = 0; i < n / 2; i++) { const a = line[i], b = line[n - 1 - i]; if (a == null || b == null) out.push({ p1: a || b, p2: null, table: 0 }); else out.push({ p1: a, p2: b, table: t++ }); }
        out.filter(x => x.table === 0).forEach(x => x.table = t++); return out;
    }
    // Single elimination: seeded bracket with byes for the top seeds; later rounds pair winners of neighbouring tables
    function bracketOrder(size) { let o = [1]; while (o.length < size) { const n = o.length * 2; o = o.flatMap(s => [s, n + 1 - s]); } return o; }
    function winnerOf(m) { return !m.p2 ? m.p1 : (m.p1_vp > m.p2_vp ? m.p1 : m.p2); }
    function pairElimination(players, matches, round) {
        const ps = players.filter(p => !p.dropped || round > 1).slice().sort((a, b) => (a.seed || 0) - (b.seed || 0));
        if (round === 1) {
            const size = 1 << Math.ceil(Math.log2(Math.max(2, ps.length))), order = bracketOrder(size), out = []; let t = 1;
            for (let i = 0; i < size; i += 2) { const a = ps[order[i] - 1], b = ps[order[i + 1] - 1]; if (a) out.push({ p1: a.id, p2: b ? b.id : null, table: t++ }); else if (b) out.push({ p1: b.id, p2: null, table: t++ }); }
            return out;
        }
        const prev = matches.filter(m => m.round === round - 1).sort((a, b) => a.table_no - b.table_no), out = [];
        for (let i = 0; i < prev.length; i += 2) { const a = winnerOf(prev[i]), b = prev[i + 1] ? winnerOf(prev[i + 1]) : null; out.push({ p1: a, p2: b, table: out.length + 1 }); }
        return out;
    }
    const roundsFor = (format, n) => format === 'roundrobin' ? Math.max(1, n - (n % 2 ? 0 : 1)) : format === 'elimination' ? Math.max(1, Math.ceil(Math.log2(Math.max(2, n)))) : Math.max(2, Math.min(7, Math.ceil(Math.log2(Math.max(2, n)))));
    function pairings(format, players, matches, round) { return format === 'roundrobin' ? pairRoundRobin(players, round) : format === 'elimination' ? pairElimination(players, matches, round) : pairSwiss(players, matches, round); }
    window.TOURN = { standings, pairSwiss, pairRoundRobin, pairElimination, pairings, roundsFor, winnerOf, bracketOrder, shuffle };

    // ───────────── UI ─────────────
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const core = () => window.LEAGUE_CORE;
    const root = () => document.getElementById('tournament-root');
    const inputCss = 'width:100%; padding:10px; min-height:44px; margin:6px 0; background:#0f141b; border:1px solid #3a4556; border-radius:8px; color:#fff; font-size:1rem;';
    const card = inner => `<div style="background:#161d27; border:1px solid #2a3546; border-radius:12px; padding:14px; margin-bottom:12px;">${inner}</div>`;
    const btn = (label, onclick, bg, extra) => `<button onclick="${onclick}" style="width:100%; min-height:46px; margin-top:8px; padding:10px; background:${bg || 'var(--accent)'}; color:${bg ? '#fff' : '#000'}; border:none; border-radius:10px; font-weight:bold; cursor:pointer; ${extra || ''}">${label}</button>`;
    const FORMAT = { swiss: ['Swiss', 'Suizo'], roundrobin: ['Round robin', 'Todos contra todos'], elimination: ['Single elimination', 'Eliminación directa'] };
    const fmtName = f => FORMAT[f] ? FORMAT[f][lang() === 'es' ? 1 : 0] : f;
    const STATUS = { registration: ['REGISTRATION', 'INSCRIPCIÓN', '#e5c15a'], running: ['RUNNING', 'EN CURSO', '#4db8ff'], finished: ['FINISHED', 'TERMINADO', '#5be59a'] };
    const chip = s => `<span style="background:${STATUS[s][2]}; color:#000; font-weight:800; font-size:0.68rem; letter-spacing:1px; border-radius:6px; padding:3px 8px;">${STATUS[s][lang() === 'es' ? 1 : 0]}</span>`;
    const st = { id: null, t: null, players: [], matches: [], tab: 'round', viewRound: 0, msg: '', busy: false, timer: null };
    const me = () => { const u = core() && core().user(); return u ? u.id : null; };
    const myPlayer = () => st.players.find(p => p.user_id === me());
    const isOrg = () => { const L = window.__leagueRole; return st.t && (st.t.created_by === me() || L === 'owner'); };
    const pname = id => { const p = st.players.find(x => x.id === id); return p ? p.name : '—'; };
    const sb = () => core().sb();

    async function load() {
        const [t, p, m] = await Promise.all([sb().from('tournaments').select('*').eq('id', st.id).single(), sb().from('tournament_players').select('*').eq('tournament_id', st.id).order('seed'), sb().from('tournament_matches').select('*').eq('tournament_id', st.id).order('round').order('table_no')]);
        if (t.error) throw t.error; st.t = t.data; st.players = p.data || []; st.matches = m.data || [];
        if (!st.viewRound || st.viewRound > st.t.current_round) st.viewRound = st.t.current_round || 1;
    }
    async function refresh(quiet) { if (!st.id || !core()) return; try { await load(); st.msg = quiet ? st.msg : ''; } catch (e) { st.msg = e.message; } render(); }
    const rpc = async (fn, args, okMsg) => { try { const { data, error } = await sb().rpc(fn, args); if (error) throw error; st.msg = ''; await load(); render(); return data; } catch (e) { st.msg = e.message; render(); return null; } };

    function matchCard(m) {
        const a = pname(m.p1), b = m.p2 ? pname(m.p2) : null, pa = st.players.find(p => p.id === m.p1), pb = st.players.find(p => p.id === m.p2);
        const mine = me() && ((pa && pa.user_id === me()) || (pb && pb.user_id === me()));
        const canReport = st.t.status === 'running' && m.status !== 'bye' && (isOrg() || (mine && m.status === 'pending'));
        const res = m.status === 'reported';
        let h = `<div class="mcard${mine ? ' mine' : ''}${res ? ' done' : ''}"><div style="color:#9aa7b8; font-size:0.7rem; font-weight:bold; letter-spacing:1px;">${S('TABLE', 'MESA')} ${m.table_no}${mine ? ' · ' + S('PROJECT 4192', 'TU PARTIDA') : ''}</div>`;
        if (!b) return h + `<div style="font-weight:bold; margin-top:4px;">${esc(a)} <span style="color:#5be59a;">— BYE (${S('win', 'victoria')})</span></div></div>`;
        const side = (n, p, vp) => `<div style="flex:1; min-width:0; text-align:${n === 1 ? 'left' : 'right'};"><div style="font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:${res && ((n === 1 && m.p1_vp > m.p2_vp) || (n === 2 && m.p2_vp > m.p1_vp)) ? '#5be59a' : '#fff'};">${esc(p.name)}</div><div style="color:#889; font-size:0.72rem;">${esc(p.faction || '')}</div>
            ${canReport ? `<input type="number" inputmode="numeric" min="0" max="200" id="vp-${m.id}-${n}" value="${vp == null ? '' : vp}" placeholder="VP" style="${inputCss} width:90px; text-align:center; ${n === 2 ? 'margin-left:auto; display:block;' : ''}">` : `<div class="mc-vp${res && ((n === 1 && m.p1_vp > m.p2_vp) || (n === 2 && m.p2_vp > m.p1_vp)) ? ' win' : ''}">${vp == null ? '–' : vp}</div>`}</div>`;
        h += `<div style="display:flex; gap:10px; align-items:flex-start; margin-top:6px;">${side(1, pa, m.p1_vp)}<div class="mc-vs">VS</div>${side(2, pb, m.p2_vp)}</div>`;
        // date and points of this game (games are spread over weeks); the two players or the organizer plan it
        const when = m.scheduled_on ? new Date(m.scheduled_on + 'T12:00:00').toLocaleDateString(lang() === 'es' ? 'es-MX' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
        if (when || m.points) h += `<div style="margin-top:8px; color:#cfd8e3; font-size:0.85rem;">${when ? `<i class="fa-regular fa-calendar"></i> ${esc(when)}` : ''}${when && m.points ? ' · ' : ''}${m.points ? `${m.points} pts` : ''}</div>`;
        if ((mine || isOrg()) && st.t.status !== 'finished' && !res) h += `<details style="margin-top:8px;"><summary style="cursor:pointer; color:#9aa7b8; font-size:0.82rem; min-height:36px; display:flex; align-items:center;">${S('Plan this game (date, points)', 'Planear esta partida (fecha, puntos)')}</summary>
            <div style="display:flex; gap:8px; margin-top:6px;"><input type="date" id="pl-d-${m.id}" value="${esc(m.scheduled_on || '')}" style="${inputCss} flex:1;"><select id="pl-p-${m.id}" style="${inputCss} width:120px;">${['', 1000, 1250, 1400, 1500, 1600, 2000].map(v => `<option value="${v}"${String(m.points || '') === String(v) ? ' selected' : ''}>${v ? v + ' pts' : S('Points', 'Puntos')}</option>`).join('')}${m.points && ![1000, 1250, 1400, 1500, 1600, 2000].includes(m.points) ? `<option selected value="${m.points}">${m.points} pts</option>` : ''}</select></div>
            ${btn(S('SAVE PLAN', 'GUARDAR PLAN'), `TOURNUI.plan('${m.id}')`, '#2a3546')}</details>`;
        if (canReport) h += btn(res ? S('UPDATE RESULT', 'ACTUALIZAR RESULTADO') : S('SAVE RESULT', 'GUARDAR RESULTADO'), `TOURNUI.report('${m.id}')`, res ? '#2a3546' : null);
        if (mine && m.status === 'pending' && st.t.status === 'running') h += btn('<i class="fa-solid fa-chess-board"></i> ' + S('PLAY IT IN THE GAME TRACKER', 'JUGAR EN EL REGISTRO DE PARTIDA'), `TOURNUI.play('${m.id}')`, '#2a3546');
        return h + '</div>';
    }
    function standingsTable() {
        const list = TOURN.standings(st.players, st.matches);
        const rk = i => `<span class="rk rk${i < 3 ? i + 1 : 0}">${i + 1}</span>`;
        return card(`<div style="font-weight:bold; margin-bottom:8px;">${S('Standings', 'Clasificación')}</div><div class="lb"><div class="lb-h"><span>${S('PLAYER', 'JUGADOR')}</span><span>W-D-L</span><span>VP±</span><span>PTS</span></div>
            ${list.map((s, i) => `<div class="lb-row${i === 0 ? ' first' : ''}" style="${s.dropped ? 'opacity:.5;' : ''}animation-delay:${i * 40}ms">${rk(i)}<div class="lb-n"><b>${esc(s.name)}${s.dropped ? ' <small>(drop)</small>' : ''}</b><small>${esc(s.faction || '')} · Buch ${s.buch}</small></div><span class="lb-w">${s.w}-${s.d}-${s.l}</span><span class="lb-d ${s.diff > 0 ? 'up' : s.diff < 0 ? 'dn' : ''}">${s.diff > 0 ? '+' : ''}${s.diff}</span><span class="lb-p">${s.pts}</span></div>`).join('')}</div>
            <div style="color:#667; font-size:0.7rem; margin-top:6px;">${S('Win 3 pts, draw 1, bye counts as a win. Tiebreakers: Buchholz (opponents\' points), VP difference, VP scored.', 'Victoria 3 pts, empate 1, el descanso cuenta como victoria. Desempates: Buchholz (puntos de rivales), diferencia de VP, VP anotados.')}</div>`);
    }
    function bracketView() {
        const total = Math.max(st.t.rounds_total || 1, ...st.matches.map(m => m.round)), cols = [];
        let prev = 0;
        for (let r = 1; r <= total; r++) {
            const ms = st.matches.filter(m => m.round === r).sort((x, y) => x.table_no - y.table_no);
            const count = ms.length || Math.max(1, Math.ceil(prev / 2)); prev = count;
            const fromEnd = total - r, label = fromEnd === 0 ? S('FINAL', 'FINAL') : fromEnd === 1 ? S('SEMIFINAL', 'SEMIFINAL') : fromEnd === 2 ? S('QUARTERFINAL', 'CUARTOS') : `${S('ROUND', 'RONDA')} ${r}`;
            const cards = Array.from({ length: count }, (_, i) => {
                const m = ms[i]; if (!m) return `<div class="br-m tbd"><div class="br-r"><span>${S('To be decided', 'Por definir')}</span></div><div class="br-r"><span>&nbsp;</span></div></div>`;
                const w = m.status === 'pending' ? null : TOURN.winnerOf(m), mine = me() && [m.p1, m.p2].some(id => { const p = st.players.find(x => x.id === id); return p && p.user_id === me(); });
                const row = (id, vp) => `<div class="br-r${w && w === id ? ' win' : ''}${w && id && w !== id ? ' lose' : ''}"><span>${esc(id ? pname(id) : 'BYE')}</span><b>${vp == null ? '' : vp}</b></div>`;
                return `<div class="br-m${mine ? ' mine' : ''}">${row(m.p1, m.p1_vp)}${row(m.p2, m.p2_vp)}</div>`;
            }).join('');
            cols.push(`<div class="br-col${r === total ? ' last' : ''}"><div class="br-h">${label}</div><div class="br-ms">${cards}</div></div>`);
        }
        return `<div class="br-scroll"><div class="br">${cols.join('')}</div></div>`;
    }

    function render() {
        const el = root(); if (!el) return; const t = st.t;
        if (!t) { el.innerHTML = `<div style="text-align:center; color:#9aa7b8; padding:30px;">${st.msg ? esc(st.msg) : S('Loading…', 'Cargando…')}</div>`; return; }
        const org = isOrg(), mine = myPlayer(), n = st.players.filter(p => !p.dropped).length, cur = t.current_round;
        const roundMs = st.matches.filter(m => m.round === st.viewRound), curMs = st.matches.filter(m => m.round === cur), allDone = curMs.length && curMs.every(m => m.status !== 'pending');
        let h = `<button onclick="TOURNUI.back()" style="background:none; border:none; color:#9aa7b8; cursor:pointer; min-height:40px;">‹ ${S('League', 'Liga')}</button>
            <h2 style="margin:4px 0; font-size:1.6rem;"><i class="fa-solid fa-medal" style="color:var(--accent)"></i> ${esc(t.name)}</h2>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:10px;">${chip(t.status)}<span style="color:#9aa7b8; font-size:0.8rem;">${fmtName(t.format)} · ${n} ${S('players', 'jugadores')}${t.status !== 'registration' ? ` · ${S('round', 'ronda')} ${cur}/${t.rounds_total}` : ` · ${t.rounds_total} ${S('rounds', 'rondas')}`}</span><button onclick="TOURNUI.refresh()" aria-label="refresh" style="margin-left:auto; background:#2a3546; color:#fff; border:none; border-radius:8px; min-width:44px; min-height:40px; cursor:pointer;"><i class="fa-solid fa-rotate"></i></button></div>
            ${t.notes ? `<div style="color:#9aa7b8; font-size:0.85rem; margin-bottom:10px;">${esc(t.notes)}</div>` : ''}
            ${st.msg ? `<div style="color:#ffb4b4; font-size:0.85rem; margin:6px 0;">${esc(st.msg)}</div>` : ''}`;
        if (t.status === 'registration') {
            h += card(`<div style="font-weight:bold; margin-bottom:6px;">${S('Players', 'Jugadores')} (${st.players.length})</div>${st.players.map(p => `<div style="display:flex; align-items:center; gap:8px; padding:8px 0; border-top:1px solid #222c3a;"><div style="flex:1;"><b>${esc(p.name)}</b>${p.user_id ? '' : ' <small style="color:#889">(guest)</small>'}<div style="color:#889; font-size:0.72rem;">${esc(p.faction || '')}</div></div>${org ? `<button onclick="TOURNUI.remove('${p.id}')" style="background:none; border:none; color:#a66; cursor:pointer; min-height:40px;">${S('remove', 'quitar')}</button>` : ''}</div>`).join('') || `<div style="color:#667;">${S('Nobody yet.', 'Nadie aún.')}</div>`}
                ${mine ? `<div style="color:#5be59a; margin-top:8px;">✔ ${S('You are registered.', 'Estás inscrito.')}</div>${btn(S('LEAVE TOURNAMENT', 'SALIR DEL TORNEO'), 'TOURNUI.leave()', '#2a3546')}` : `<input id="tn-faction" placeholder="${S('Your faction (optional)', 'Tu facción (opcional)')}" style="${inputCss}">${btn(S('JOIN TOURNAMENT', 'INSCRIBIRME'), 'TOURNUI.join()')}`}`);
            if (org) h += card(`<div style="font-weight:bold;">${S('Organizer', 'Organizador')}</div><div style="display:flex; gap:8px;"><input id="tn-gname" placeholder="${S('Guest name', 'Nombre del invitado')}" maxlength="40" style="${inputCss}"><input id="tn-gfac" placeholder="${S('Faction', 'Facción')}" style="${inputCss}"></div>${btn(S('ADD GUEST PLAYER', 'AGREGAR INVITADO'), 'TOURNUI.guest()', '#2a3546')}
                <label style="color:#9aa7b8; font-size:0.75rem; display:block; margin-top:10px;">${S('Rounds', 'Rondas')} (${S('suggested', 'sugerido')}: ${TOURN.roundsFor(t.format, Math.max(2, n))})</label><input id="tn-rounds" type="number" min="1" max="15" value="${t.rounds_total === 3 && !st.roundsTouched ? TOURN.roundsFor(t.format, Math.max(2, n)) : t.rounds_total}" onchange="TOURNUI.touch()" style="${inputCss}">
                ${t.format === 'elimination' ? `<label style="display:flex; align-items:center; gap:10px; margin-top:10px; min-height:44px; color:#cfd8e3;"><input type="checkbox" id="tn-draw" checked style="width:22px; height:22px;"> ${S('Random draw (names from a hat) for round 1', 'Sorteo (nombres en papelitos) para la ronda 1')}</label>` : ''}
                ${btn('<i class="fa-solid fa-play"></i> ' + S('START TOURNAMENT (ROUND 1)', 'INICIAR TORNEO (RONDA 1)'), 'TOURNUI.start()')}${btn(S('DELETE TOURNAMENT', 'BORRAR TORNEO'), 'TOURNUI.del()', '#5c1f1f')}`);
            el.innerHTML = h; return;
        }
        if (t.status === 'finished') {
            const top = TOURN.standings(st.players, st.matches);
            let podium = top.slice(0, 3);
            if (t.format === 'elimination') { const last = st.matches.filter(m => m.round === t.current_round)[0]; if (last && last.status !== 'pending') { const w = TOURN.winnerOf(last), l = last.p1 === w ? last.p2 : last.p1; podium = [w, l].map(id => top.find(s => s.id === id)).filter(Boolean); } }
            h += `<div class="champ"><div class="champ-t">🏆</div><div class="champ-l">${S('CHAMPION', 'CAMPEÓN')}</div><div class="champ-n">${esc(podium[0] ? podium[0].name : '—')}</div><div class="champ-s">${podium.slice(1).map((p, i) => (i ? '🥉 ' : '🥈 ') + esc(p.name)).join(' &nbsp; ')}</div></div>`;
        }
        const tabs = [['round', S('Round', 'Ronda')], ['standings', S('Standings', 'Clasificación')]].concat(t.format === 'elimination' ? [['bracket', S('Bracket', 'Llave')]] : [['all', S('All rounds', 'Todas')]]);
        h += `<div style="display:flex; gap:6px; margin:10px 0;">${tabs.map(([k, l]) => `<button onclick="TOURNUI.tab('${k}')" style="flex:1; min-height:44px; background:${st.tab === k ? 'var(--accent)' : '#161d27'}; color:${st.tab === k ? '#000' : '#fff'}; border:1px solid #3a4556; border-radius:10px; font-weight:bold; cursor:pointer;">${l}</button>`).join('')}</div>`;
        if (st.tab === 'round') {
            h += `<div style="display:flex; gap:6px; margin-bottom:8px; overflow-x:auto;">${Array.from({ length: cur }, (_, i) => i + 1).map(r => `<button onclick="TOURNUI.viewRound(${r})" style="min-width:44px; min-height:40px; background:${st.viewRound === r ? '#2a3546' : 'transparent'}; color:#fff; border:1px solid #3a4556; border-radius:8px; cursor:pointer;">R${r}</button>`).join('')}</div>${roundMs.map(matchCard).join('')}`;
            if (org && t.status === 'running') {
                if (allDone && cur < t.rounds_total) h += btn('<i class="fa-solid fa-forward"></i> ' + S(`GENERATE ROUND ${cur + 1}`, `GENERAR RONDA ${cur + 1}`), 'TOURNUI.next()');
                else if (allDone && cur >= t.rounds_total) h += btn('<i class="fa-solid fa-flag-checkered"></i> ' + S('FINISH TOURNAMENT', 'TERMINAR TORNEO'), 'TOURNUI.finish()', '#2f9e5f');
                else h += `<div style="color:#667; font-size:0.8rem; margin-top:6px;">${S('Report every game to generate the next round.', 'Registra todas las partidas para generar la siguiente ronda.')}</div>`;
                h += btn(S('FINISH TOURNAMENT NOW', 'TERMINAR TORNEO YA'), 'TOURNUI.finish()', '#2a3546') + btn(S('DELETE TOURNAMENT', 'BORRAR TORNEO'), 'TOURNUI.del()', '#5c1f1f');
            }
            if (mine && t.status === 'running') h += btn(S('DROP OUT OF THE TOURNAMENT', 'RETIRARME DEL TORNEO'), 'TOURNUI.leave()', '#2a3546');
        } else if (st.tab === 'standings') h += standingsTable();
        else if (st.tab === 'bracket') h += card(bracketView());
        else h += Array.from({ length: cur }, (_, i) => cur - i).map(r => card(`<div style="font-weight:bold; margin-bottom:6px;">${S('Round', 'Ronda')} ${r}</div>${st.matches.filter(m => m.round === r).map(m => `<div style="display:flex; justify-content:space-between; gap:8px; font-size:0.85rem; padding:4px 0; border-top:1px solid #222c3a;"><span>${esc(pname(m.p1))} vs ${m.p2 ? esc(pname(m.p2)) : 'BYE'}</span><b>${m.status === 'reported' ? m.p1_vp + ' – ' + m.p2_vp : m.status === 'bye' ? '' : '…'}</b></div>`).join('')}`)).join('');
        el.innerHTML = h;
    }

    window.TOURNUI = {
        touch: () => { st.roundsTouched = true; },
        refresh: () => refresh(false), tab: k => { st.tab = k; render(); }, viewRound: r => { st.viewRound = r; render(); },
        back: () => { stopTimer(); switchView('league'); },
        join: () => rpc('join_tournament', { p_tournament: st.id, p_faction: (document.getElementById('tn-faction') || {}).value || null }),
        leave: () => { if (st.t.status === 'running' && !confirm(S('Drop out of this tournament?', '¿Retirarte de este torneo?'))) return; return rpc('leave_tournament', { p_tournament: st.id }); },
        remove: id => { if (confirm(S('Remove this player?', '¿Quitar a este jugador?'))) rpc('remove_tournament_player', { p_player: id }); },
        guest: () => { const nm = (document.getElementById('tn-gname') || {}).value.trim(); if (!nm) { st.msg = S('Enter a name', 'Escribe un nombre'); return render(); } rpc('add_tournament_guest', { p_tournament: st.id, p_name: nm, p_faction: (document.getElementById('tn-gfac') || {}).value || null }); },
        start: async () => {
            const n = st.players.filter(p => !p.dropped).length; if (n < 2) { st.msg = S('Need at least 2 players.', 'Se necesitan al menos 2 jugadores.'); return render(); }
            const rounds = Math.max(1, Math.min(15, +(document.getElementById('tn-rounds') || {}).value || TOURN.roundsFor(st.t.format, n)));
            if (!confirm(S(`Start with ${n} players and ${rounds} rounds? Registration closes.`, `¿Iniciar con ${n} jugadores y ${rounds} rondas? Se cierra la inscripción.`))) return;
            const draw = st.t.format === 'elimination' && (document.getElementById('tn-draw') || {}).checked;   // names from a hat: a random bracket
            const players = draw ? TOURN.shuffle(st.players.filter(p => !p.dropped)).map((p, i) => Object.assign({}, p, { seed: i })) : st.players;
            await rpc('start_round', { p_tournament: st.id, p_pairings: TOURN.pairings(st.t.format, players, [], 1), p_rounds: rounds });
        },
        plan: async id => {
            const d = (document.getElementById(`pl-d-${id}`) || {}).value || null, p = +((document.getElementById(`pl-p-${id}`) || {}).value) || null;
            const r = await rpc('plan_match', { p_match: id, p_date: d, p_points: p });
            if (r === null && /plan_match|function/i.test(st.msg || '')) { st.msg = S('Dates and points need a server update: run supabase/tournament_plan_v9.sql in Supabase.', 'Fechas y puntos necesitan una actualización del servidor: corre supabase/tournament_plan_v9.sql en Supabase.'); render(); }
        },
        next: async () => { const r = st.t.current_round + 1; await rpc('start_round', { p_tournament: st.id, p_pairings: TOURN.pairings(st.t.format, st.players, st.matches, r), p_rounds: null }); st.viewRound = r; st.tab = 'round'; render(); },
        report: async id => {
            const a = (document.getElementById(`vp-${id}-1`) || {}).value, b = (document.getElementById(`vp-${id}-2`) || {}).value;
            if (a === '' || b === '' || a == null || b == null) { st.msg = S('Enter both scores.', 'Escribe ambos puntajes.'); return render(); }
            await rpc('report_match', { p_match: id, p_p1_vp: +a, p_p2_vp: +b });
        },
        finish: () => { if (confirm(S('Finish the tournament? Results are locked.', '¿Terminar el torneo? Los resultados se bloquean.'))) rpc('finish_tournament', { p_tournament: st.id }); },
        del: () => { if (confirm(S('Delete this tournament and all its results?', '¿Borrar este torneo y todos sus resultados?'))) rpc('delete_tournament', { p_tournament: st.id }).then(() => TOURNUI.back()); },
        play: id => {
            const m = st.matches.find(x => x.id === id); if (!m) return; const pa = st.players.find(p => p.id === m.p1), pb = st.players.find(p => p.id === m.p2);
            stopTimer(); switchView('tracker'); window.GDM.newGame({ leagueId: st.t.league_id, tournamentMatch: { id: m.id, tid: st.id }, names: [pa.name, pb.name] });
        }
    };
    function stopTimer() { clearInterval(st.timer); st.timer = null; }
    function startTimer() { stopTimer(); st.timer = setInterval(() => { const el = document.getElementById('view-tournament'); if (!el || getComputedStyle(el).display === 'none') return stopTimer(); if (document.activeElement && /INPUT/.test(document.activeElement.tagName)) return; refresh(true); }, 20000); }

    // ───────────── League screen card: list + create ─────────────
    async function paintCard(leagueId, role) {
        const box = document.getElementById('tourn-card'); if (!box || !core()) return; window.__leagueRole = role;
        let list = []; try { const { data, error } = await sb().from('tournaments').select('id, name, format, status, current_round, rounds_total, created_at').eq('league_id', leagueId).order('created_at', { ascending: false }).limit(10); if (error) throw error; list = data || []; }
        catch (e) { box.innerHTML = card(`<div style="color:#ffb4b4; font-size:0.8rem;">${S('Tournaments unavailable', 'Torneos no disponibles')}: ${esc(e.message)} (run supabase/tournaments.sql)</div>`); return; }
        box.innerHTML = card(`<div style="font-weight:bold; margin-bottom:8px;"><i class="fa-solid fa-medal"></i> ${S('Tournaments', 'Torneos')}</div>
            ${list.map(t => `<div onclick="TOURNUI_open('${t.id}', '${role || ''}')" style="display:flex; align-items:center; gap:8px; padding:10px 0; border-top:1px solid #222c3a; cursor:pointer; min-height:48px;"><div style="flex:1; min-width:0;"><b>${esc(t.name)}</b><div style="color:#889; font-size:0.72rem;">${fmtName(t.format)}${t.status !== 'registration' ? ` · ${S('round', 'ronda')} ${t.current_round}/${t.rounds_total}` : ''}</div></div>${chip(t.status)}<i class="fa-solid fa-chevron-right" style="color:#556;"></i></div>`).join('') || `<div style="color:#667; font-size:0.85rem;">${S('No tournaments yet.', 'Aún no hay torneos.')}</div>`}
            <details style="margin-top:8px;"><summary style="cursor:pointer; color:var(--accent); font-weight:bold; min-height:40px;">+ ${S('New tournament', 'Nuevo torneo')}</summary>
              <input id="tn-new-name" placeholder="${S('Tournament name', 'Nombre del torneo')}" maxlength="80" style="${inputCss}">
              <select id="tn-new-format" style="${inputCss}"><option value="swiss">${fmtName('swiss')}</option><option value="roundrobin">${fmtName('roundrobin')}</option><option value="elimination">${fmtName('elimination')}</option></select>
              <input id="tn-new-notes" placeholder="${S('Notes: points, missions, date… (optional)', 'Notas: puntos, misiones, fecha… (opcional)')}" maxlength="400" style="${inputCss}">
              ${btn(S('CREATE TOURNAMENT', 'CREAR TORNEO'), `TOURNUI_create('${leagueId}', '${role || ''}')`)}</details>`);
    }
    window.TOURNUI_open = (id, role) => { st.id = id; st.t = null; st.tab = 'round'; st.roundsTouched = false; st.viewRound = 0; window.__leagueRole = role; switchView('tournament'); };
    window.TOURNUI_create = async (leagueId, role) => {
        const name = (document.getElementById('tn-new-name') || {}).value.trim(); if (!name) { alert(S('Name the tournament first', 'Ponle nombre al torneo')); return; }
        const { data, error } = await sb().rpc('create_tournament', { p_league: leagueId, p_name: name, p_format: document.getElementById('tn-new-format').value, p_rounds: 3, p_notes: (document.getElementById('tn-new-notes') || {}).value || null });
        if (error) { alert(error.message); return; } TOURNUI_open(data, role);
    };
    // finished tracker game that belongs to a tournament match -> offer to report it
    async function reportFromTracker(rec) {
        const m = rec.tournamentMatch; if (!m || !core()) return;
        if (!confirm(S(`Report ${rec.p1} ${rec.p1score} – ${rec.p2score} ${rec.p2} to the tournament?`, `¿Registrar ${rec.p1} ${rec.p1score} – ${rec.p2score} ${rec.p2} en el torneo?`))) return;
        const { error } = await sb().rpc('report_match', { p_match: m.id, p_p1_vp: Math.min(200, rec.p1score), p_p2_vp: Math.min(200, rec.p2score) });
        if (error) { alert(error.message); return; } alert(S('Result reported ✔', 'Resultado registrado ✔')); st.id = m.tid; st.t = null; switchView('tournament');
    }
    window.TOURN.paintCard = paintCard; window.TOURN.reportFromTracker = reportFromTracker;
    const base = window.switchView;
    window.switchView = function (v, push) { base(v, push); if (v === 'tournament') { render(); if (st.id) { refresh(false); startTimer(); } } };
})();
