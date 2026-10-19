/* Live games between logged-in players: invitations, a linked second player on their own device, and spectators.
   Rules (enforced server-side by supabase/schema.sql "v6"):
   - the host (game owner) scores Player 1 and the shared round; an invited league member who accepts scores Player 2 on their own phone;
   - each device only writes ITS side, so there are no edit conflicts; everyone else with the link/league just watches (spectators);
   - a guest opponent (typed name) still works exactly as before — the host scores both sides. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sb = () => window.LEAGUE_CORE && window.LEAGUE_CORE.sb && window.LEAGUE_CORE.sb();
    const toast = m => { if (typeof window.toast === 'function') window.toast(m); else alert(m); };
    async function rpc(fn, args) { const { data, error } = await sb().rpc(fn, args || {}); if (error) throw new Error(error.message); return data; }
    async function me() { const c = sb(); if (!c) return null; try { const { data } = await c.auth.getSession(); return data.session ? data.session.user : null; } catch (e) { return null; } }
    const tsOk = () => typeof trackerState !== 'undefined' && trackerState;
    let invites = [], timer = null, last = { sig: null }, inviteTimer = null, pushT = null, lastPushVersion = -1;

    // ───────────── invited player: invitations ─────────────
    function slot(id, afterSel, parentSel) {
        let el = document.getElementById(id); if (el) return el;
        const ref = afterSel && document.querySelector(afterSel); if (!ref) return null;
        el = document.createElement('div'); el.id = id; el.className = 'live-invites-slot'; ref.after(el); return el;
    }
    function inviteCards() {
        return invites.map(i => `<div class="lv-inv"><div class="lv-inv-t"><i class="fa-solid fa-chess-board"></i> ${S('Game invitation', 'Invitación a una partida')}</div>
            <div><b>${esc(i.from || '—')}</b> ${S('invites you to play', 'te invita a jugar')}${i.p1_faction ? ' · ' + esc(i.p1_faction) : ''}${i.league ? ' · ' + esc(i.league) : ''}</div>
            <div class="lv-inv-a"><button onclick="LIVE.openInvite('${esc(i.code)}')">${S('View invitation', 'Ver invitación')}</button></div></div>`).join('');
    }
    function paint() {
        const html = invites.length ? inviteCards() : '';
        const home = slot('home-invites', '#view-home .home-header-card'); if (home) home.innerHTML = html;
        const lg = document.getElementById('league-root'); if (lg) { let s = document.getElementById('lg-invites'); if (!s) { s = document.createElement('div'); s.id = 'lg-invites'; lg.prepend(s); } s.innerHTML = html; }
    }
    async function refreshInvites() {
        if (!sb() || !(await me())) { invites = []; paint(); return; }
        try { const list = (await rpc('my_game_invites')) || []; const fresh = list.filter(x => !invites.some(y => y.code === x.code)); invites = list; paint(); if (fresh.length) toast(S('New game invitation from ', 'Nueva invitación de ') + (fresh[0].from || '—')); }
        catch (e) { /* functions not installed yet / offline: stay quiet */ }
    }
    async function myRosters() {
        const out = []; const local = (typeof STATE !== 'undefined' && STATE.rosters) || [];
        local.forEach((r, i) => out.push({ key: 'l' + i, label: `${r.name} · ${(r.faction && r.faction.name) || ''} · ${(r.units || []).reduce((s, u) => s + (+u.pts || 0), 0)}/${r.pointsLimit}`, roster: compactLocal(r) }));
        try { const { data } = await sb().from('rosters').select('slot, name, faction, points_limit, units').order('slot'); (data || []).forEach(c => out.push({ key: 'c' + c.slot, label: `☁ ${c.name} · ${c.faction} · ${c.points_limit} pts`, roster: { name: c.name, faction: c.faction, points_limit: c.points_limit, units: c.units } })); } catch (e) {}
        return out;
    }
    function compactLocal(r) {
        const m = new Map(); (r.units || []).forEach(u => { const k = u.id + '|' + u.pts; const e = m.get(k); if (e) e[3]++; else m.set(k, [String(u.id), u.name, +u.pts || 0, 1]); });
        return { name: r.name, faction: (r.faction && r.faction.name) || '', points_limit: r.pointsLimit || 0, units: [...m.values()] };
    }
    function overlay(id, inner) {
        let o = document.getElementById(id); if (o) o.remove();
        o = document.createElement('div'); o.id = id; o.className = 'lv-ov'; o.innerHTML = `<div class="lv-card">${inner}</div>`; o.onclick = e => { if (e.target === o) o.remove(); }; document.body.appendChild(o); return o;
    }
    async function openInvite(code) {
        const inv = invites.find(x => x.code === code); if (!inv) return;
        const rs = await myRosters();
        const o = overlay('lv-accept', `<div class="lv-h"><b>${S('Game invitation', 'Invitación a una partida')}</b><button onclick="document.getElementById('lv-accept').remove()">✕</button></div>
            <p><b>${esc(inv.from)}</b> ${S('wants you to play as Player 2', 'quiere que juegues como Jugador 2')}${inv.league ? ' · ' + esc(inv.league) : ''}.</p>
            <p class="lv-s">${S('You will score your own side on your phone and see theirs live. Everyone else in the league can watch.', 'Anotarás tu lado en tu móvil y verás el suyo en vivo. El resto de la liga puede mirar.')}</p>
            <label>${S('Your army list (optional)', 'Tu lista de ejército (opcional)')}</label>
            <select id="lv-roster"><option value="">${S('No list', 'Sin lista')}</option>${rs.map(r => `<option value="${r.key}">${esc(r.label)}</option>`).join('')}</select>
            <div id="lv-msg" class="lv-err"></div>
            <div class="lv-btns"><button class="go" onclick="LIVE.respond('${esc(code)}', true)">${S('Accept & play', 'Aceptar y jugar')}</button><button onclick="LIVE.respond('${esc(code)}', false)">${S('Decline', 'Rechazar')}</button></div>`);
        o.__rs = rs;
    }
    async function respond(code, accept) {
        const o = document.getElementById('lv-accept'), msg = document.getElementById('lv-msg'); let roster = null;
        if (accept && o) { const k = (document.getElementById('lv-roster') || {}).value; const r = (o.__rs || []).find(x => x.key === k); roster = r ? r.roster : null; }
        try { await rpc('live_respond', { p_code: code, p_accept: accept, p_roster: roster }); if (o) o.remove(); invites = invites.filter(x => x.code !== code); paint(); if (accept) { await join(code); toast(S('You are in — good luck!', '¡Estás dentro, suerte!')); } else toast(S('Invitation declined', 'Invitación rechazada')); }
        catch (e) { if (msg) msg.textContent = e.message; refreshInvites(); }
    }
    // open (or resume) the server game as my own local game, as Player 2
    async function join(code) {
        const r = await rpc('live_get', { p_code: code }); if (!r || r.role !== 'p2') throw new Error(S('This game is not linked to you.', 'Esta partida no está vinculada a ti.'));
        const g = (() => { try { return JSON.parse(localStorage.getItem('gdm_games') || '{}'); } catch (e) { return {}; } })();
        const ex = Object.values(g).find(x => x.state && x.state.live && x.state.live.code === code);
        if (ex && window.resumeGame) { window.resumeGame(ex.id); }
        else { switchView('tracker'); GDM.joinLiveCopy(r.state, { shareCode: code, leagueId: r.league_id, live: { code, role: 'p2', side: 2, p2: r.p2_user, hostName: r.owner_name } }); }
        start(); tick(); setTimeout(() => { try { showTab(2); } catch (e) {} }, 400);
    }

    // ───────────── host: invite a league member ─────────────
    async function inviteBox(code) {
        const box = document.getElementById('live-invite-box'); if (!box) return;
        if (!(await me())) { box.innerHTML = ''; return; }
        let r = null; try { r = await rpc('live_get', { p_code: code }); } catch (e) { box.innerHTML = `<div class="lv-s">${esc(e.message)}</div>`; return; }
        if (!r) { box.innerHTML = ''; return; }
        if (r.role !== 'owner') { box.innerHTML = ''; return; }
        let h = `<div class="lv-sec"><div class="lv-t"><i class="fa-solid fa-user-plus"></i> ${S('Play with a league member', 'Jugar con un miembro de la liga')}</div>`;
        if (r.status === 'finished') h += `<div class="lv-s">${S('This game is finished.', 'Esta partida terminó.')}</div>`;
        else if (r.p2_user) h += `<div class="lv-ok">${S('Linked player', 'Jugador vinculado')}: <b>${esc(r.p2_name || '—')}</b> — ${S('they score Player 2 on their own device.', 'anota al Jugador 2 en su propio dispositivo.')}</div><button class="lv-b bad" onclick="LIVE.unlink('${esc(code)}')">${S('Remove player', 'Quitar jugador')}</button>`;
        else if (r.invite_status === 'pending') h += `<div class="lv-ok">${S('Invitation sent to', 'Invitación enviada a')} <b>${esc(r.invite_name || '—')}</b> — ${S('waiting for them to accept (24 h).', 'esperando que acepte (24 h).')}</div><button class="lv-b" onclick="LIVE.cancelInvite('${esc(code)}')">${S('Cancel invitation', 'Cancelar invitación')}</button>`;
        else if (!r.league_id) {
            h += `<div class="lv-s">${S('Only league games can invite a player.', 'Solo las partidas de liga pueden invitar a un jugador.')}</div><button class="lv-b" onclick="LIVE.linkLeague('${esc(code)}')">${S('Link this game to my league', 'Vincular esta partida a mi liga')}</button>`;
        } else {
            let members = []; try { members = await rpc('league_members_list', { p_league: r.league_id }); } catch (e) {}
            const u = await me(); const others = (members || []).filter(m => m.user_id !== (u && u.id));
            h += others.length ? `<div class="lv-s">${S('Pick your opponent. They get a notification and choose their army list. Anyone else stays a spectator.', 'Elige a tu oponente. Recibirá una notificación y elegirá su lista. Los demás serán espectadores.')}</div>` + others.map(m => `<div class="lv-mem"><span>${esc(m.display_name)}</span><button class="lv-b go" onclick="LIVE.invite('${esc(code)}','${m.user_id}')">${S('Invite', 'Invitar')}</button></div>`).join('') : `<div class="lv-s">${S('No other members in your league yet.', 'Aún no hay otros miembros en tu liga.')}</div>`;
        }
        box.innerHTML = h + '</div>';
    }
    async function guarded(fn, code) { try { await fn(); } catch (e) { alert(e.message); } inviteBox(code); tick(); }
    async function linkLeague(code) {
        try { const u = await me(); const { data } = await sb().from('league_members').select('league_id').eq('user_id', u.id).limit(1); const lid = data && data[0] && data[0].league_id; if (!lid) { alert(S('Join or create a league first (menu → League).', 'Únete o crea una liga primero (menú → Liga).')); return; }
            if (tsOk()) { trackerState.leagueId = lid; if (window.saveCurrentGame) saveCurrentGame(); } await rpc('publish_game', { p_code: code, p_state: GDM.snapshot(), p_status: 'in_progress', p_league: lid }); } catch (e) { alert(e.message); }
        inviteBox(code);
    }

    // ───────────── in-game sync ─────────────
    const live = () => (tsOk() && trackerState.live) || null;
    const linked = () => { const l = live(); return !!l && (l.role === 'p2' || !!l.p2); };
    function guard() {
        const l = live(), act = window.GDM && GDM.hasActiveGame && GDM.hasActiveGame();
        const ro = l && linked() ? (l.role === 'p2' ? 1 : 2) : 0;       // the side this device must not edit
        [1, 2].forEach(n => { const c = document.getElementById('ag-card-' + n); if (c) c.classList.toggle('live-ro', ro === n); });
        const rb = document.querySelectorAll('#view-active-game [onclick^="changeGameRound"]'); rb.forEach(b => b.classList.toggle('live-ro', l && l.role === 'p2'));
        let bn = document.getElementById('live-banner');
        if (!l || !act) { if (bn) bn.remove(); return; }
        if (!bn) { bn = document.createElement('div'); bn.id = 'live-banner'; const v = document.getElementById('view-active-game'); if (v) v.prepend(bn); }
        const synced = last.at ? Math.max(0, Math.round((Date.now() - last.at) / 1000)) : null;
        bn.innerHTML = linked()
            ? (l.role === 'p2' ? `<i class="fa-solid fa-link"></i> ${S('LIVE — you score', 'EN VIVO — tú anotas')} <b>${S('your side', 'tu lado')}</b>${S(' vs host ', ' vs anfitrión ')}<b>${esc(l.hostName || '')}</b>` : `<i class="fa-solid fa-link"></i> ${S('LIVE — ', 'EN VIVO — ')}<b>${esc(l.p2Name || '')}</b> ${S('scores Player 2 on their phone', 'anota al Jugador 2 en su móvil')}`)
            : `<i class="fa-solid fa-tower-broadcast"></i> ${S('Live game', 'Partida en vivo')}`;
        bn.innerHTML += `<small>${l.finished ? S('finished', 'terminada') : (synced == null ? '…' : synced + ' s')}</small>`;
    }
    async function tick() {
        if (!tsOk() || !sb() || document.hidden) return;
        const code = trackerState.shareCode; if (!code || trackerState.step !== 8) return;
        if (!(await me())) return;
        let r; try { r = await rpc('live_get', { p_code: code }); } catch (e) { return; }
        if (!r) { const l = live(); if (l && l.role === 'p2') { toast(S('The host ended this game.', 'El anfitrión terminó la partida.')); delete trackerState.live; if (window.saveCurrentGame) saveCurrentGame(); } return; }
        last.at = Date.now();
        const was = live();
        if (r.role === 'owner' || r.role === 'p2') {
            const l = trackerState.live = Object.assign({}, was || {}, { code, role: r.role, side: r.role === 'p2' ? 2 : 1, p2: r.p2_user || null, p2Name: r.p2_name || null, hostName: r.owner_name });
            if (!was || was.p2 !== l.p2 || was.role !== l.role) { if (r.p2_user && r.role === 'owner' && !(was && was.p2)) toast(S('Player linked: ', 'Jugador vinculado: ') + (r.p2_name || '')); if (window.saveCurrentGame) saveCurrentGame(); }
            if (!r.p2_user && r.role === 'p2') { toast(S('You are no longer a player in this game.', 'Ya no eres jugador de esta partida.')); delete trackerState.live; if (window.saveCurrentGame) saveCurrentGame(); }
            if (linked()) {   // apply only when the OTHER side / shared data really changed (a version counter is shared with my own pushes, so it cannot be used)
                const mine = r.role === 'p2' ? 2 : 1, st = r.state || {}, sig = JSON.stringify(mine === 2 ? [st.p1, st.m1, st.round, st.started] : [st.p2, st.m2]);
                if (sig !== last.sig) { last.sig = sig; GDM.applyRemote(st, mine); }
            }
            if (r.status === 'finished' && l && !l.finished) { l.finished = true; toast(S('The game was finished.', 'La partida terminó.')); if (r.role === 'p2') GDM.applyRemote(r.state, 2); if (window.saveCurrentGame) saveCurrentGame(); }
        }
        guard();
    }
    function start() { if (!timer) timer = setInterval(() => { if (GDM.hasActiveGame && GDM.hasActiveGame()) tick(); else guard(); }, 4000); }
    // push my side (called from the existing "game saved" hook)
    function pushSoon() {
        clearTimeout(pushT); pushT = setTimeout(async () => {
            const l = live(); if (!l || !linked() || l.finished || !tsOk() || !trackerState.shareCode) return;
            const s = GDM.snapshot();
            try {
                const out = await rpc('live_push', { p_code: trackerState.shareCode, p_side: l.role === 'p2' ? 2 : 1, p_patch: l.role === 'p2' ? s.p2 : s.p1, p_shared: l.role === 'p2' ? { m2: s.m2 } : { round: s.round, started: s.started, m1: s.m1 } });
            } catch (e) { if (/finished/.test(e.message)) { l.finished = true; } else if (!/offline|fetch|network/i.test(e.message)) console.warn('live push:', e.message); }
        }, 1100);
    }
    function hook() {
        if (!window.LEAGUE || window.LEAGUE.__liveHooked) return; window.LEAGUE.__liveHooked = true;
        const origFin = window.LEAGUE.onGameFinished;
        window.LEAGUE.onGameFinished = function (rec, code) { if (rec && rec.liveSide === 2 && rec.shareCode) return; return origFin && origFin.apply(this, arguments); };   // the host's device finishes the shared game
        const orig = window.LEAGUE.onGameSaved;
        window.LEAGUE.onGameSaved = function () { if (window.__liveApplying) return; if (linked()) { pushSoon(); return; } return orig && orig.apply(this, arguments); };
        const origPub = window.LEAGUE.publishNow;   // a host with a linked player must not overwrite their side with a full publish
        window.LEAGUE.publishNow = function () { if (linked()) { pushSoon(); return; } return origPub && origPub.apply(this, arguments); };
    }
    function boot() {
        hook(); start(); refreshInvites();
        inviteTimer = setInterval(() => { if (!document.hidden) refreshInvites(); }, 30000);
        const c = sb(); if (c) c.auth.onAuthStateChange(() => setTimeout(refreshInvites, 200));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { refreshInvites(); tick(); } });
    }
    window.LIVE = {
        paintNow: paint, refreshInvites, openInvite, respond, join, inviteBox, tick, guard,
        invite: (code, uid) => guarded(() => rpc('live_invite', { p_code: code, p_user: uid }), code),
        cancelInvite: code => guarded(() => rpc('live_cancel_invite', { p_code: code }), code),
        unlink: code => { if (!confirm(S('Remove the linked player? They stay a spectator.', '¿Quitar al jugador vinculado? Seguirá como espectador.'))) return; guarded(async () => { await rpc('live_unlink', { p_code: code }); if (tsOk() && trackerState.live) { trackerState.live.p2 = null; trackerState.live.p2Name = null; if (window.saveCurrentGame) saveCurrentGame(); } }, code); },
        leave: async () => { const l = live(); if (!l) return; if (!confirm(S('Leave this live game? You keep a copy and become a spectator.', '¿Salir de la partida en vivo? Conservas una copia y pasas a espectador.'))) return; try { await rpc('live_unlink', { p_code: l.code }); } catch (e) {} delete trackerState.live; if (window.saveCurrentGame) saveCurrentGame(); guard(); },
        linkLeague, invites: () => invites
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 900)); else setTimeout(boot, 900);
})();
