/* Live games for the Game Tracker: "Share live game" codes (player ?live=CODE&k=KEY, spectator ?obs=CODE).
   - Changes travel phone to phone through Supabase Realtime (fast), and
   - every change is also SAVED in the database (live_room_save, supabase/live_rooms_v8.sql), so a shared game opens at once
     and stays viewable for 90 days after its last change, even when nobody has the app open (finished games too).
   - Only the host and players who opened the player link hold the game's secret key, so only they can save it.
     Spectators read it; a player who typed just the code still plays live, and the host saves for them.
   - Every state carries a revision; older ones never replace newer ones (here and in the database).
   If the database update has not been run yet, everything still works phone to phone, without saving. */
(function () {
    const ts = () => (typeof trackerState !== 'undefined' ? trackerState : null);
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => (lang() === 'es') ? es : en;
    const toast = m => (typeof window.toast === 'function' ? window.toast(m) : alert(m));
    const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
    const ROOM_KEY = 'gdm_live_room', KEYS_KEY = 'gdm_live_keys';

    let channel = null, roomCode = null, isHost = false, roomKey = null;
    let lastRev = 0, haveState = false, askTimer = null, replyTimer = null, pollTimer = null, saveTimer = null, missTimer = null;
    let online = { players: 0, spectators: 0 }, saved = { ok: false, until: null, off: '' }, finished = false;
    let subscribed = false, retryTimer = null, retryN = 0, showOnArrive = false, pendingSend = false, sendTimer = null;
    let roomGame = null;                               // 'started' stamp of the room's game: a phone that switches to another game leaves the room   // connection state; show the game when a joined game first arrives
    const short = () => (roomCode || '').replace('GDM-', '');
    const base = () => location.origin + location.pathname.replace(/index\.html$/, '');
    let client = null;
    const sb = () => {
        if (window.LEAGUE_CORE && window.LEAGUE_CORE.sb) return window.LEAGUE_CORE.sb();
        if (!client && window.LEAGUE_CONFIG && window.supabase) client = supabase.createClient(window.LEAGUE_CONFIG.url, window.LEAGUE_CONFIG.anonKey);
        return client;
    };
    const keys = () => { try { return JSON.parse(LS.get(KEYS_KEY) || '{}'); } catch (e) { return {}; } };
    const rememberKey = (code, k) => { const o = keys(); o[code] = k; LS.set(KEYS_KEY, JSON.stringify(o)); };
    const newKey = () => { const a = new Uint8Array(15); crypto.getRandomValues(a); return Array.from(a, b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join(''); };
    const newCode = () => { const a = new Uint8Array(5); crypto.getRandomValues(a); return Array.from(a, b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join(''); };

    // ---------- the "waiting / not found" note ----------
    const note = (html, color) => {
        let b = document.getElementById('lsync-wait');
        if (!html) { if (b) b.remove(); return; }
        if (!b) { b = document.createElement('div'); b.id = 'lsync-wait'; document.body.appendChild(b); }
        b.style.cssText = `position:fixed; left:12px; right:12px; bottom:max(14px, env(safe-area-inset-bottom)); z-index:100001; background:rgba(11,18,32,.96); border:1px solid ${color || '#4db8ff'}; border-radius:12px; padding:12px 14px; color:#e6edf8; font-size:.9rem; line-height:1.4; text-align:center;`;
        b.innerHTML = html;
    };
    const stopAsking = () => { clearInterval(askTimer); askTimer = null; clearTimeout(missTimer); note(''); };
    const askForState = () => {                     // ask the room now and every 4 s until the game arrives (about 5 minutes)
        stopAsking();
        if (haveState) { send('request_state', {}); return; }   // already have it: just catch up
        let n = 0; note(S('<b>Loading the game…</b>', '<b>Cargando la partida…</b>'));
        missTimer = setTimeout(() => { if (!haveState) note(S('<b>This game is not available right now.</b><br>It may have expired (games are kept 90 days) or it was shared before games were saved. It appears here as soon as a player opens it.', '<b>Esta partida no está disponible ahora.</b><br>Puede haber expirado (se guardan 90 días) o se compartió antes de que se guardaran. Aparece aquí en cuanto un jugador la abra.'), '#f59e0b'); }, 9000);
        const ask = () => { if (haveState || !channel || ++n > 75) return stopAsking(); send('request_state', {}); };
        ask(); askTimer = setInterval(ask, 4000);
    };
    const send = (event, payload) => { if (channel) channel.send({ type: 'broadcast', event, payload }).catch(() => {}); };

    // ---------- database: save / load ----------
    async function load() {
        const c = sb(); if (!c || !roomCode) return null;
        const { data, error } = await c.rpc('live_room_get', { p_code: short() });
        if (error) { if (/live_room_get|function|PGRST202/i.test(error.message || '') || error.code === 'PGRST202') saved.off = 'missing'; return null; }
        return data;
    }
    function persist(fin) {                         // throttled; only devices holding the key save
        if (!roomKey || saved.off || !roomCode) return;
        if (fin) finished = true;
        clearTimeout(saveTimer);
        saveTimer = setTimeout(async () => {
            const st = ts(), c = sb(); if (!st || !c || !haveState) return;
            const { data, error } = await c.rpc('live_room_save', { p_code: short(), p_key: roomKey, p_state: JSON.parse(JSON.stringify(st)), p_rev: lastRev, p_finished: finished });
            if (error) {
                const m = error.message || '';
                if (error.code === 'PGRST202' || /Could not find the function/i.test(m)) saved.off = 'missing';
                else if (/not allowed/i.test(m)) { roomKey = null; saved.off = 'nokey'; }
                saved.ok = false;
            } else { saved.ok = true; saved.until = new Date(Date.now() + 90 * 864e5); }
            refreshSheet();
        }, fin ? 0 : 1200);
    }
    function poll() {                               // everyone but the host checks the saved copy every 20 s (covers missed messages)
        clearInterval(pollTimer);
        pollTimer = setInterval(async () => {
            if (!roomCode || document.hidden) return;
            const r = await load();
            if (r && r.state && r.rev > lastRev) take(r.state, r.rev, r.finished);
        }, 20000);
    }
    function take(state, rev, fin) {
        if (rev && rev < lastRev) {                 // older than what this phone has: keep ours, but take in what that phone did (a score, CP…)
            try { if (window.GDM && GDM.absorbOlder && GDM.absorbOlder(state)) LSYNC.broadcastState(); } catch (e) { console.warn('merge', e); }
            return;
        }
        if (rev) lastRev = rev;
        haveState = true; stopAsking(); if (fin) finished = true;
        applyState(state); if (state && state.started) roomGame = state.started;
        if (channel || roomCode) remember();
        persist();                                  // a key holder keeps the saved copy current (e.g. the host saves the opponent's changes)
    }

    // ---------- remembering the room across reloads ----------
    const remember = () => { const st = ts(); LS.set(ROOM_KEY, JSON.stringify({ code: short(), host: isHost, spectator: !!window.isSpectatorMode, gameId: st && st.gameId, rev: lastRev })); };
    const forget = () => LS.del(ROOM_KEY);

    window.LSYNC = {
        active: () => !!roomCode,   // in a shared game (even while its connection is being rebuilt)
        getCode: () => roomCode,
        info: () => ({ active: !!channel, code: short(), host: isHost, spectator: !!window.isSpectatorMode, canSave: !!roomKey, online, saved, finished, links: LSYNC.links() }),
        links: () => roomCode ? { watch: base() + '?obs=' + short(), play: base() + '?live=' + short() + (roomKey ? '&k=' + roomKey : '') } : null,

        // older buttons call this: in a game it opens the Share sheet, on the tracker home it offers "join with a code"
        openMenu: function () {
            const inGame = !(document.getElementById('view-tracker') && document.getElementById('view-tracker').style.display !== 'none');
            if (inGame && typeof window.openShare === 'function') return window.openShare();
            LSYNC.openJoin();
        },
        openJoin: function () {
            let m = document.getElementById('lsync-menu-modal');
            if (!m) { m = document.createElement('div'); m.id = 'lsync-menu-modal'; m.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:100000; display:flex; align-items:center; justify-content:center; padding:20px;'; document.body.appendChild(m); }
            m.innerHTML = `<div style="background:#161d27; border:1px solid #3a4556; border-radius:12px; width:100%; max-width:400px; padding:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><div style="color:#fff; font-weight:bold; font-size:1.15rem;"><i class="fa-solid fa-share-nodes"></i> ${S('Join a shared game', 'Unirse a una partida compartida')}</div>
                <button onclick="document.getElementById('lsync-menu-modal').style.display='none'" aria-label="close" style="background:transparent; border:none; color:#888; font-size:1.2rem; min-width:44px; min-height:44px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button></div>
                <div style="color:#9aa7b8; font-size:.88rem; margin-bottom:12px;">${S('Type the code you were sent: 5 letters to play, or S + 5 letters to watch. Easier: just open the link.', 'Escribe el código que te mandaron: 5 letras para jugar, o S + 5 letras para mirar. Más fácil: abre el enlace.')}</div>
                <input type="text" id="lsync-join-input" placeholder="${S('CODE (e.g. KQ7MZ or SKQ7MZ)', 'CÓDIGO (ej. KQ7MZ o SKQ7MZ)')}" style="width:100%; background:#0d1117; color:#fff; border:1px solid #3a4556; border-radius:8px; padding:14px; font-size:1.1rem; text-align:center; margin-bottom:12px; text-transform:uppercase;">
                <button onclick="LSYNC.join(document.getElementById('lsync-join-input').value)" style="width:100%; min-height:48px; background:#4384ff; border:none; border-radius:8px; color:#fff; font-weight:bold; font-size:1rem; cursor:pointer;"><i class="fa-solid fa-right-to-bracket"></i> ${S('Join', 'Unirse')}</button></div>`;
            m.style.display = 'flex';
        },
        copied: (en, es) => toast(S(en, es)),
        copy: function (which) {
            const l = LSYNC.links(); if (!l) return; const v = which === 'play' ? l.play : which === 'code' ? short() : which === 'scode' ? 'S' + short() : l.watch;
            const ok = () => toast(S('Copied', 'Copiado'));
            if (navigator.clipboard) navigator.clipboard.writeText(v).then(ok, () => prompt(S('Copy:', 'Copiar:'), v)); else prompt(S('Copy:', 'Copiar:'), v);
        },
        whatsapp: function (which) {
            const l = LSYNC.links(), st = ts(); if (!l) return;
            const head = st && st.p1 ? `${st.p1.name || 'P1'} vs ${st.p2.name || 'P2'}\n` : '';
            const txt = which === 'play' ? `⚔️ Project 4192\n${head}${S('Join as player', 'Únete como jugador')}: ${l.play}` : `⚔️ Project 4192 — 🔴 ${S('LIVE', 'EN VIVO')}\n${head}${S('Watch', 'Mira')}: ${l.watch}`;
            window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
        },

        // Start sharing this game: creates the room, its secret key and the two links
        host: async function () {
            if (roomCode) return roomCode;              // already in this game's room
            const mem = remembered(), st = ts();
            if (mem && mem.code && st && st.gameId && mem.gameId === st.gameId) {   // this game was already shared: rejoin it, never a second room
                if (mem.host) await resumeHost(mem.code, mem.rev); else await LSYNC.join((mem.spectator ? 'S' : '') + mem.code, null, true);
                return roomCode;
            }
            const c = sb(); let code = newCode();
            for (let i = 0; i < 4 && c; i++) {          // avoid a code that is still in use (saved in the last 90 days)
                const { data, error } = await c.rpc('live_room_get', { p_code: code });
                if (error || !data) break; code = newCode();
            }
            roomCode = 'GDM-' + code; roomKey = newKey(); rememberKey(code, roomKey);
            isHost = true; haveState = true; finished = false; lastRev = Date.now(); window.isSpectatorMode = false;
            roomGame = (ts() || {}).started || null;
            saved = { ok: false, until: null, off: '' };
            connectChannel(roomCode); remember(); persist(); poll();
            toast(S('Sharing started — send the links', 'Compartiendo — envía los enlaces'));
            refreshSheet();
            return roomCode;
        },

        setLang: function (l) { LS.set('gdm_lang', l); if (typeof window.setLang === 'function') window.setLang(l); else if (typeof window.renderGame === 'function') window.renderGame(); LSYNC.updateBtn(); },

        // Join a room: code = ABCDE (player) or SABCDE (spectator); key = the k= of a player link (lets this device save too)
        join: async function (code, key, quiet) {
            if (!code) return;
            code = String(code).toUpperCase().trim().replace('GDM-', '');
            let spectator = false;
            if (code.length === 6 && code.startsWith('S')) { spectator = true; code = code.substring(1); }
            if (!/^[A-Z0-9]{5}$/.test(code)) { toast(S('That code does not look right (5 letters, or S + 5 to watch).', 'Ese código no parece correcto (5 letras, o S + 5 para mirar).')); return; }
            if (channel || roomCode) await LSYNC.leave(true);   // also stops a pending reconnect to the previous room
            roomCode = 'GDM-' + code; isHost = false; haveState = false; lastRev = 0; finished = false; showOnArrive = !quiet;
            if (key && !spectator) rememberKey(code, key);
            roomKey = spectator ? null : (key || keys()[code] || null);
            window.isSpectatorMode = spectator; saved = { ok: false, until: null, off: '' };
            const m = document.getElementById('lsync-menu-modal'); if (m) m.style.display = 'none';
            note(S('<b>Loading the game…</b>', '<b>Cargando la partida…</b>'));
            const r = await load();                     // the saved copy first: opens at once, even if nobody is online
            if (r && r.state) { saved.ok = true; saved.until = r.expires_at ? new Date(r.expires_at) : null; take(r.state, r.rev, r.finished); if (r.finished && !quiet) toast(S('This game has finished: final result', 'Esta partida terminó: resultado final')); }
            connectChannel(roomCode); remember(); poll();
            if (!quiet) toast(spectator ? S(`Watching game ${code}`, `Mirando la partida ${code}`) : S(`Playing in game ${code}`, `Jugando en la partida ${code}`));
        },

        leave: async function (keepRoom) {
            clearInterval(pollTimer); clearTimeout(saveTimer); clearTimeout(retryTimer); clearTimeout(sendTimer); subscribed = false; pendingSend = false;
            const old = channel; channel = null;    // cleared first, so its "closed" event is not taken for a dropped connection
            if (old) { try { await sb().removeChannel(old); } catch (e) {} }
            stopAsking(); clearTimeout(replyTimer); roomGame = null;
            roomCode = null; roomKey = null; online = { players: 0, spectators: 0 };
            if (!keepRoom) forget();
            document.dispatchEvent(new Event('lsync:disconnected'));
            LSYNC.updateBtn(); refreshSheet();
        },
        finish: () => { if (channel) { LSYNC.broadcastState(); persist(true); } },   // called when the game is finalized
        connected: () => !!channel && subscribed,
        reconnectFor: function (gameId) {
            if (channel) return; const r = remembered(); if (!r || !r.code || !gameId || r.gameId !== gameId) return;
            if (r.host) resumeHost(r.code, r.rev); else LSYNC.join((r.spectator ? 'S' : '') + r.code, null, true);
        },

        updateBtn: function () {
            const t = document.getElementById('lsync-btn-text'), b = document.getElementById('btn-lsync');
            const live = channel && subscribed, col = !channel ? '#cfd8e3' : live ? '#4ade80' : '#f59e0b';
            if (t) t.innerText = channel && roomCode ? (live ? '● ' : '○ ') + short() : S('Share', 'Compartir');
            if (b) { b.style.color = col; b.style.borderColor = !channel ? '#3a4556' : live ? '#22c55e' : '#f59e0b'; b.title = !channel ? S('Share game', 'Compartir partida') : live ? S('Live: connected', 'En vivo: conectado') : S('Reconnecting…', 'Reconectando…'); }
            const st = document.getElementById('set-btn-text'); if (st) st.innerText = S('Settings', 'Ajustes');
        },

        logAction: function (actionStr) {
            const state = ts(); if (!state) return;
            if (!state.activityLog) state.activityLog = [];
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            state.activityLog.unshift(`[${time}] R${state.round || 1} · ${actionStr}`);
            if (state.activityLog.length > 300) state.activityLog.length = 300;   // the whole game, turn by turn
            LSYNC.broadcastState();
            const m = document.getElementById('lsync-log-modal'); if (m && m.style.display !== 'none') LSYNC.showLog();
            const box = document.getElementById('set-activity'); if (box) box.innerHTML = LSYNC.logHtml(40);
        },
        logHtml: function (max) {
            const logs = ((ts() || {}).activityLog || []).slice(0, max || 300);
            return logs.length ? logs.map(l => `<div style="padding:7px 0; border-bottom:1px solid rgba(255,255,255,0.06);">${String(l).replace(/</g, '&lt;')}</div>`).join('') : `<div style="text-align:center; color:#888; padding:14px 0;">${S('No activity yet.', 'Aún no hay actividad.')}</div>`;
        },
        showLog: function () {
            let m = document.getElementById('lsync-log-modal');
            if (!m) { m = document.createElement('div'); m.id = 'lsync-log-modal'; m.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:100001; display:flex; align-items:center; justify-content:center; padding:20px;'; document.body.appendChild(m); }
            m.innerHTML = `<div style="background:#161d27; border:1px solid #3a4556; border-radius:12px; width:100%; max-width:500px; max-height:80vh; display:flex; flex-direction:column;">
                <div style="padding:15px; border-bottom:1px solid #3a4556; display:flex; justify-content:space-between; align-items:center;"><div style="color:#fff; font-weight:bold; font-size:1.15rem;"><i class="fa-solid fa-list-ul"></i> ${S('Activity log', 'Registro de actividad')}</div>
                <button onclick="document.getElementById('lsync-log-modal').style.display='none'" aria-label="close" style="background:transparent; border:none; color:#888; font-size:1.2rem; min-width:44px; min-height:44px; cursor:pointer;"><i class="fa-solid fa-xmark"></i></button></div>
                <div style="padding:15px; overflow-y:auto; flex:1; font-size:0.9rem; color:#ccc;">${LSYNC.logHtml()}</div></div>`;
            m.style.display = 'flex';
        },

        // keepRev = true: re-send the game as it is (answering a request); otherwise this is a new change, with a newer revision
        broadcastState: function (keepRev) {
            if (!roomCode || window.__liveApplying) return;
            // a phone that has not received the room's game yet sends NOTHING: otherwise its own (empty or other) game
            // would go out as the newest and replace the shared one on every phone
            if (!haveState) return;
            const state = ts(); if (!state || state.step !== 8) return;
            if (roomGame && state.started && state.started !== roomGame) {   // this phone opened / started a different game: leave, never overwrite the shared one
                if (!keepRev) { LSYNC.leave(); toast(S('You opened another game, so you left the shared game. Open its link again to rejoin.', 'Abriste otra partida, así que saliste de la partida compartida. Abre su enlace de nuevo para volver.')); }
                return;
            }
            if (!keepRev) lastRev = Math.max(lastRev + 1, Date.now());
            if (channel && subscribed) send('sync_state', { state: JSON.parse(JSON.stringify(state)), rev: lastRev, finished });
            else if (!keepRev) pendingSend = true;      // offline right now: goes out as soon as the room is back
            if (!keepRev) { persist(); remember(); }    // the saved copy is updated either way (others pick it up every 20 s)
        }
    };

    function refreshSheet() { const o = document.getElementById('ov-share'); if (o && typeof window.openShare === 'function') window.openShare(); LSYNC.updateBtn(); }

    function connectChannel(code) {
        const c = sb();
        if (!c) { toast(S('Live games need the internet connection to the server.', 'Las partidas en vivo necesitan conexión con el servidor.')); return; }
        const me = Math.random().toString(36).slice(2);
        channel = c.channel('gdm-room-' + code, { config: { broadcast: { self: false, ack: false }, presence: { key: me } } });
        channel.on('broadcast', { event: 'sync_state' }, msg => {
            const p = msg.payload; if (!p || !p.state) return;
            clearTimeout(replyTimer);                   // someone answered: no need for us to
            take(p.state, p.rev || 0, p.finished);
        });
        channel.on('broadcast', { event: 'request_state' }, () => {
            if (!haveState) return;
            clearTimeout(replyTimer);                   // the host answers at once, others after a short random wait (only one reply needed)
            replyTimer = setTimeout(() => LSYNC.broadcastState(true), isHost ? 0 : 300 + Math.random() * 900);
        });
        channel.on('presence', { event: 'sync' }, () => {
            const st = channel.presenceState(); let p = 0, s = 0;
            Object.values(st).forEach(list => (list || []).forEach(x => { if (x.role === 'spectator') s++; else p++; }));
            online = { players: p, spectators: s }; refreshSheet();
        });
        const mine = channel;
        channel.subscribe(status => {
            if (mine !== channel) return;               // an older channel this phone already replaced
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                subscribed = false; LSYNC.updateBtn();
                if (status !== 'CLOSED' || roomCode) scheduleRetry();
                return;
            }
            if (status !== 'SUBSCRIBED') return;
            subscribed = true; retryN = 0; clearTimeout(retryTimer); LSYNC.updateBtn();
            if (pendingSend && haveState) { pendingSend = false; send('sync_state', { state: JSON.parse(JSON.stringify(ts())), rev: lastRev, finished }); }
            document.dispatchEvent(new Event('lsync:connected'));
            channel.track({ role: isHost ? 'host' : (window.isSpectatorMode ? 'spectator' : 'player') }).catch(() => {});
            LSYNC.updateBtn();
            if (isHost) { LSYNC.broadcastState(true); send('request_state', {}); }   // the host also catches up on anything newer
            else askForState();                         // everyone else asks (and catches up after a reconnect)
        });
    }

    // the connection dropped: try again after 2, 4, 8… seconds (at most 30); a reconnect also catches up on what was missed
    function scheduleRetry(now) {
        clearTimeout(retryTimer); if (!roomCode) return;
        const wait = now ? 0 : Math.min(30000, 2000 * Math.pow(2, retryN++));
        retryTimer = setTimeout(async () => {
            if (!roomCode) return;
            const old = channel; channel = null; subscribed = false;
            if (old) { try { await sb().removeChannel(old); } catch (e) {} }
            connectChannel(roomCode);
            const r = await load(); if (r && r.state && r.rev > lastRev) take(r.state, r.rev, r.finished);
        }, wait);
    }
    window.addEventListener('online', () => { if (roomCode && !subscribed) { retryN = 0; scheduleRetry(); } });

    function applyState(newState) {
        if (!newState) return;
        const state = ts(); if (!state) return;
        const same = state.step === 8 && !!state.started && state.started === newState.started;
        // a different game (or none) on this phone: replace it completely so nothing of the old one mixes in
        if (!same) Object.keys(state).forEach(k => { if (!(k in newState)) delete state[k]; });
        let mergedMine = false;                     // what this phone did that the other copy had not seen yet (see GDM.mergeIncoming)
        try { if (same && window.GDM && GDM.mergeIncoming) mergedMine = GDM.mergeIncoming(newState); } catch (e) { console.warn('merge', e); }
        Object.assign(state, newState);
        if (showOnArrive && typeof window.joinLiveGameTransition === 'function') { showOnArrive = false; window.joinLiveGameTransition(); }
        const keepY = window.scrollY;
        if (typeof window.updateActiveGameUI === 'function') {
            window.__liveApplying = true;               // do not echo it back
            try { window.updateActiveGameUI(); if (window.TA && window.TA.paint) window.TA.paint(); if (window.saveCurrentGame) window.saveCurrentGame(); }
            finally { window.__liveApplying = false; }
        }
        const box = document.getElementById('set-activity'); if (box) box.innerHTML = LSYNC.logHtml(40);
        if (Math.abs(window.scrollY - keepY) > 1) window.scrollTo(0, keepY);
        if (mergedMine && !window.isSpectatorMode) setTimeout(() => LSYNC.broadcastState(), 0);   // send the merged game back out
    }

    // back from the background (phone unlocked, app reopened): resend / catch up
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden || !roomCode) return;
        if (!channel || !subscribed || (channel.state && channel.state !== 'joined')) { retryN = 0; clearTimeout(retryTimer); scheduleRetry(true); return; }
        if (haveState) LSYNC.broadcastState(true);
        send('request_state', {});
        const r = await load(); if (r && r.state && r.rev > lastRev) take(r.state, r.rev, r.finished);
    });
    document.addEventListener('bl:saved', () => {
        if (window.__liveApplying) return;
        clearTimeout(sendTimer); sendTimer = setTimeout(() => LSYNC.broadcastState(), 400);   // CP taps, typing a name… send the final result
    });

    // after a reload: reconnect to the shared game this device was in (unless the page was opened from a link)
    function remembered() { try { return JSON.parse(LS.get(ROOM_KEY) || 'null'); } catch (e) { return null; } }
    window.addEventListener('load', () => setTimeout(() => {
        const p = new URLSearchParams(location.search); if (p.get('live') || p.get('obs') || channel) return;
        const r = remembered(), st = ts(); if (!r || !r.code || !st) return;
        // the game on screen is another one: put this phone's copy of the shared game back first (if it has one)
        if (r.gameId && st.gameId !== r.gameId && window.GDM && GDM.restoreGame) {
            if (st.step === 8 && st.gameId) return;     // the player opened a different game on purpose: leave it alone
            GDM.restoreGame(r.gameId);
            if (/tracker-live/.test(location.hash) && typeof window.renderGame === 'function') window.renderGame();
        }
        if (r.host) resumeHost(r.code, r.rev); else LSYNC.join((r.spectator ? 'S' : '') + r.code, null, true);
    }, 300));
    async function resumeHost(code, rev) {
        roomCode = 'GDM-' + code; roomKey = keys()[code] || null; isHost = true; window.isSpectatorMode = false; haveState = true; lastRev = 0;
        roomGame = (ts() || {}).started || null;
        const r = await load();                         // the saved copy may be newer (the opponent kept scoring while this phone was away)
        if (r && r.state) { saved.ok = true; saved.until = r.expires_at ? new Date(r.expires_at) : null; take(r.state, r.rev, r.finished); }
        else lastRev = rev || 1;                        // nothing saved (database update not run yet): this phone's last known revision
        connectChannel(roomCode); poll();
    }
})();
