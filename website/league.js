/* League prototype: accounts, leagues (invite link), leaderboard, send finished games.
   Backend = Supabase (free tier). See supabase/README.md. All DB access lives in this file. */
(function () {
    const cfg = window.LEAGUE_CONFIG || {};
    const configured = !!(cfg.url && cfg.anonKey && window.supabase);
    const sb = configured ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const LS = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
    const root = () => document.getElementById('league-root');
    let session = null, memberships = [], currentId = LS.get('lg_current'), msg = '', info = '';

    // ---- data layer (everything that touches Supabase) ----
    const db = {
        session: async () => (await sb.auth.getSession()).data.session,
        signUp: (email, password, name) => sb.auth.signUp({ email, password, options: { data: { display_name: name } } }),
        signIn: (email, password) => sb.auth.signInWithPassword({ email, password }),
        signOut: () => sb.auth.signOut(),
        emailFor: async who => { who = String(who || '').trim(); if (who.includes('@')) return who; const { data, error } = await sb.rpc('login_email', { p_name: who }); if (error) throw new Error('Login by username needs supabase/login_v5.sql. Use your email for now.'); if (!data) throw new Error("We couldn't find that username. Try your email instead."); return data; },
        resetPassword: (email) => sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }),
        setPassword: (pw) => sb.auth.updateUser({ password: pw }),
        memberships: async () => {
            const { data, error } = await sb.from('league_members').select('role, league:leagues(id, name, invite_code)').order('joined_at');
            if (error) throw error; return data.filter(x => x.league);
        },
        createLeague: async name => { const { data, error } = await sb.rpc('create_league', { p_name: name }); if (error) throw error; return data; },
        preview: async code => { const { data, error } = await sb.rpc('league_preview', { p_code: code }); if (error) throw error; return data && data[0] || null; },
        members: async id => { const { data, error } = await sb.rpc('league_members_list', { p_league: id }); if (error) throw error; return data; },
        leave: async (id, uid) => { const { error } = await sb.from('league_members').delete().eq('league_id', id).eq('user_id', uid); if (error) throw error; },
        joinLeague: async code => { const { data, error } = await sb.rpc('join_league', { p_code: code }); if (error) throw error; return data; },
        leaderboard: async id => { const { data, error } = await sb.rpc('league_leaderboard', { p_league: id }); if (error) throw error; return data; },
        recentGames: async id => { const { data, error } = await sb.from('games').select('id, played_at, p1_name, p1_faction, p1_score, p2_name, p2_faction, p2_score, mission, submitted_by, status, p1_user, p2_user, p1_roster, p2_roster').eq('league_id', id).order('played_at', { ascending: false }).limit(15); if (error) throw error; return data; },
        pendingForMe: async id => { const { data, error } = await sb.from('games').select('id, played_at, p1_name, p1_score, p2_name, p2_score, mission, submitted_by, p1_user, p2_user').eq('league_id', id).eq('status', 'pending'); if (error) throw error; return data.filter(g => g.submitted_by !== session.user.id && (g.p1_user === session.user.id || g.p2_user === session.user.id)); },
        confirmGame: async (id, accept) => { const { error } = await sb.rpc('confirm_game', { p_game: id, p_accept: accept }); if (error) throw error; },
        events: async id => { const { data, error } = await sb.from('league_events').select('id, starts_at, title, notes, created_by').eq('league_id', id).gte('starts_at', new Date(Date.now() - 864e5).toISOString()).order('starts_at').limit(12); if (error) throw error; return data; },
        addEvent: async (id, e) => { const { error } = await sb.from('league_events').insert({ league_id: id, created_by: session.user.id, starts_at: e.starts_at, title: e.title, notes: e.notes || null }); if (error) throw error; },
        deleteEvent: async id => { const { error } = await sb.from('league_events').delete().eq('id', id); if (error) throw error; },
        publish: async (code, state, status, league) => { const { data, error } = await sb.rpc('publish_game', { p_code: code || null, p_state: state, p_status: status, p_league: league || null }); if (error) throw error; return data; },
        liveGet: async code => { const { data, error } = await sb.rpc('live_get', { p_code: code }); if (error) throw error; return data; },
        liveGames: async id => { const { data, error } = await sb.rpc('league_live_games', { p_league: id }); if (error) throw error; return data || []; },
        disband: async id => { const { error } = await sb.rpc('disband_league', { p_league: id }); if (error) throw error; },
        getShared: async code => { const { data, error } = await sb.rpc('get_shared_game', { p_code: code }); if (error) throw error; return data && data[0] || null; },
        deleteCloudData: async () => { const { error } = await sb.rpc('delete_my_cloud_data'); if (error) throw new Error(error.message + ' (run the latest supabase/schema.sql)'); },
        deleteAccount: async () => { const { error } = await sb.rpc('delete_my_account'); if (error) throw error; },
        submitGame: async (leagueId, rec, side, opponent, myRoster) => {
            const { data, error } = await sb.rpc('submit_game', {
                p_league: leagueId, p_client_key: `${rec.started || rec.date}|${rec.p1}|${rec.p2}`, p_played_at: rec.started || new Date().toISOString(),
                p_p1_name: rec.p1, p_p1_faction: rec.p1faction || null, p_p1_score: rec.p1score, p_p2_name: rec.p2, p_p2_faction: rec.p2faction || null, p_p2_score: rec.p2score,
                p_mission: rec.mission || null, p_detail: { rounds: rec.round, snap: window.GDM.snapshotFromRecord(rec) },
                p_my_side: side, p_opponent: opponent || null, p_p1_roster: side === 1 ? myRoster : null, p_p2_roster: side === 2 ? myRoster : null });
            if (error) throw error; return data;
        },
        deleteGame: async id => { const { error } = await sb.from('games').delete().eq('id', id); if (error) throw error; },
        rosters: async () => { const { data, error } = await sb.from('rosters').select('slot, name, faction, points_limit, detachments, units, updated_at').order('slot'); if (error) throw error; return data; },
        saveRoster: async (slot, c) => { const { error } = await sb.from('rosters').upsert({ owner: session.user.id, slot, name: c.name, faction: c.faction, points_limit: c.points_limit, detachments: c.detachments, units: c.units }, { onConflict: 'owner,slot' }); if (error) throw error; },
        deleteRoster: async slot => { const { error } = await sb.from('rosters').delete().eq('slot', slot); if (error) throw error; },
    };

    window.LEAGUE_CORE = { sb: () => sb, user: () => (session && session.user) || null, role: () => { const m = memberships.find(x => x.league.id === currentId); return m ? m.role : null; } };

    // ---- UI ----
    const card = (inner) => `<div style="background:#161d27; border:1px solid #2a3546; border-radius:12px; padding:16px; margin-bottom:14px;">${inner}</div>`;
    const inputCss = 'width:100%; padding:12px; margin:6px 0; background:#0f141b; border:1px solid #3a4556; border-radius:8px; color:#fff; font-size:1rem; min-height:44px;';
    const btn = (label, onclick, bg, extra) => `<button onclick="${onclick}" style="width:100%; min-height:48px; margin-top:8px; padding:12px; background:${bg || 'var(--accent)'}; color:${bg ? '#fff' : '#000'}; border:none; border-radius:10px; font-weight:bold; cursor:pointer; ${extra || ''}">${label}</button>`;
    const note = () => msg ? `<div style="color:#ffb4b4; font-size:0.85rem; margin:8px 0;">${esc(msg)}</div>` : '';

    const infoBox = () => info ? `<div style="background:rgba(47,158,95,.18); border:1px solid #2f9e5f; color:#9be8bd; border-radius:10px; padding:10px 12px; margin:8px 0; font-size:0.9rem;">${esc(info)}</div>` : '';
    function head() { return `<h2 style="text-align:center; font-size:1.8rem; margin:0 0 4px;"><i class="fa-solid fa-trophy" style="color:var(--accent)"></i> LEAGUE</h2>`; }

    function renderSetup() {
        root().innerHTML = head() + card(`<b>League isn't connected yet.</b><p style="color:#9aa7b8; font-size:0.9rem;">Create the free Supabase project and paste its URL and anon key into <code>league_config.js</code>. Step-by-step instructions are in <code>supabase/README.md</code>.</p>`);
    }

    async function renderAuth() {
        let inv = '';
        const code = LS.get('lg_pending_code');
        if (code) {
            let pv = null; try { pv = await db.preview(code); } catch (e) {}
            inv = pv ? card(`<div style="color:var(--accent); font-size:0.75rem; font-weight:bold; letter-spacing:2px;">YOU'RE INVITED</div><div style="font-size:1.3rem; font-weight:800; margin:6px 0;">${esc(pv.name)}</div><div style="color:#9aa7b8; font-size:0.85rem;">Created by ${esc(pv.owner_name || 'a player')} · ${pv.members} member${pv.members == 1 ? '' : 's'}.<br>Create an account or log in below — you'll join automatically.</div>`)
                : card(`<div style="color:#ffb4b4;">This invite link isn't valid any more. Ask your friend for a new one.</div>`);
        }
        if (authMode === 'recovery') {
            root().innerHTML = head() + `<div style="text-align:center; color:#9aa7b8; font-size:0.9rem; margin-bottom:16px;">Choose a new password.</div>` + card(`
                <input id="lg-pass" type="password" placeholder="New password (min 6)" style="${inputCss}" autocomplete="new-password">
                ${note()}${btn('SAVE NEW PASSWORD', 'LEAGUE.savePassword()')}`);
            return;
        }
        const login = authMode === 'login', forgot = authMode === 'forgot';
        const title = forgot ? 'Enter your email or username and we will send you a reset link.' : login ? 'Welcome back.' : "Create a free account to join your group's ranking.";
        root().innerHTML = head() + inv + `<div style="text-align:center; color:#9aa7b8; font-size:0.9rem; margin-bottom:16px;">${title}</div>` + card(`
            ${(login || forgot) ? '' : `<input id="lg-name" placeholder="Username" style="${inputCss}" autocomplete="nickname">`}
            <input id="lg-email" ${(login || forgot) ? 'type="text" placeholder="Email or username" autocapitalize="none" autocorrect="off" autocomplete="username"' : 'type="email" placeholder="Email" autocomplete="email"'} style="${inputCss}">
            ${forgot ? '' : `<input id="lg-pass" type="password" placeholder="Password (min 6)" style="${inputCss}" autocomplete="${login ? 'current-password' : 'new-password'}">`}
            ${note()}${info ? `<div style="color:#5be59a; font-size:0.85rem; margin:8px 0;">${esc(info)}</div>` : ''}
            ${forgot ? btn('SEND RESET LINK', 'LEAGUE.forgot()') : login ? btn('LOG IN', 'LEAGUE.signIn()') : btn('CREATE ACCOUNT', 'LEAGUE.signUp()')}
            ${login ? `<button onclick="LEAGUE.setMode('forgot')" style="display:block; margin:10px auto 0; background:none; border:none; color:#9aa7b8; font-size:0.85rem; text-decoration:underline; cursor:pointer; min-height:44px;">I forgot my password</button>` : ''}
            ${forgot ? `<button onclick="LEAGUE.setMode('login')" style="display:block; margin:10px auto 0; background:none; border:none; color:#9aa7b8; font-size:0.85rem; text-decoration:underline; cursor:pointer; min-height:44px;">Back to log in</button>`
                : `<button onclick="LEAGUE.setMode('${login ? 'signup' : 'login'}')" style="display:block; margin:6px auto 0; background:none; border:none; color:#9aa7b8; font-size:0.85rem; text-decoration:underline; cursor:pointer; min-height:44px;">${login ? 'New here? Create account' : 'Already have an account? Log in'}</button>`}`);
    }

    async function renderHome() {
        root().innerHTML = head() + `<div style="text-align:center; color:#888;">Loading…</div>`;
        try { memberships = await db.memberships(); } catch (e) { msg = e.message; }
        const pend = LS.get('lg_pending_code');
        if (pend) { LS.del('lg_pending_code'); try { const id = await db.joinLeague(pend); currentId = id; LS.set('lg_current', id); memberships = await db.memberships(); const jm = memberships.find(m => m.league.id === id); info = jm ? `You joined “${jm.league.name}” 🎉` : ''; } catch (e) { msg = 'Invite: ' + e.message; } }
        if (!memberships.some(m => m.league.id === currentId)) currentId = memberships[0] ? memberships[0].league.id : null;
        const cur = memberships.find(m => m.league.id === currentId);
        const who = `<div style="display:flex; justify-content:space-between; align-items:center; color:#9aa7b8; font-size:0.8rem; margin-bottom:12px;"><span>${esc(session.user.email)}</span><button onclick="LEAGUE.signOut()" style="background:none; border:1px solid #3a4556; color:#9aa7b8; border-radius:8px; padding:6px 12px; cursor:pointer; min-height:36px;">Sign out</button></div>`;
        let html = head() + who + infoBox() + note();
        if (cur) {
            let lb = [], games = [], pending = [], events = [], live = [], v3 = true;
            try { [lb, games] = await Promise.all([db.leaderboard(currentId), db.recentGames(currentId)]); } catch (e) { html += `<div style="color:#ffb4b4">${esc(e.message)}</div>`; v3 = false; }
            try { [pending, events, live] = await Promise.all([db.pendingForMe(currentId), db.events(currentId), db.liveGames(currentId).catch(() => [])]); } catch (e) { v3 = false; html += `<div style="color:#ffb4b4; font-size:0.8rem;">Confirmations/calendar unavailable: ${esc(e.message)} (run supabase/league_v3.sql)</div>`; }
            const link = location.origin + location.pathname + '?join=' + cur.league.invite_code;
            html += btn('<i class="fa-solid fa-play"></i> START A LEAGUE GAME', 'LEAGUE.newLeagueGame()');
            if (live.length) html += `<div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:2px; margin:16px 0 8px;">LIVE &amp; RECENT GAMES</div>` + live.map(g => { const s = g.state || {}, tot = p => ((p || {}).pri || 0) + ((p || {}).sec || 0) + ((p || {}).paint ? 10 : 0), fin = g.status === 'finished'; return `<div style="background:#161d27; border:1px solid ${fin ? '#2a3546' : '#e5c15a'}; border-radius:10px; padding:12px; margin-bottom:8px;"><div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#9aa7b8;"><span style="color:${fin ? '#9aa7b8' : '#e5c15a'}; font-weight:bold;">${fin ? 'FINISHED' : '● LIVE · ROUND ' + (s.round || 1)}</span><span>by ${esc(g.owner_name || '')} · ${ago(g.updated_at)}</span></div><div style="display:flex; justify-content:space-between; font-weight:bold; margin-top:4px;"><span>${esc((s.p1 || {}).name)}: ${tot(s.p1)}</span><span>${esc((s.p2 || {}).name)}: ${tot(s.p2)}</span></div><button onclick="LEAGUE.openViewer('${g.code}')" style="margin-top:8px; width:100%; min-height:40px; background:transparent; border:1px solid #3a4556; border-radius:8px; color:#fff; cursor:pointer;"><i class="fa-solid fa-eye"></i> Watch</button></div>`; }).join('');
            if (pending.length) html += card(`<div style="color:#e5c15a; font-weight:bold; margin-bottom:8px;"><i class="fa-solid fa-hourglass-half"></i> Games waiting for YOUR confirmation (${pending.length})</div>${pending.map(g => `<div style="border-top:1px solid #2a3546; padding:10px 0;"><div style="color:#9aa7b8; font-size:0.72rem;">${new Date(g.played_at).toLocaleDateString()} · ${esc(g.mission || '')}</div><div style="font-weight:bold; margin:4px 0;">${esc(g.p1_name)} ${g.p1_score} – ${g.p2_score} ${esc(g.p2_name)}</div><div style="display:flex; gap:8px;"><button onclick="LEAGUE.confirm('${g.id}', true)" style="flex:1; min-height:44px; background:#2f9e5f; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">✔ Confirm</button><button onclick="LEAGUE.confirm('${g.id}', false)" style="flex:1; min-height:44px; background:#8c2a2a; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">✖ Reject</button></div></div>`).join('')}`);
            const rk = i => `<span class="rk rk${i < 3 ? i + 1 : 0}">${i + 1}</span>`;
            html += `<h3 style="margin:8px 0;">${esc(cur.league.name)}</h3>` + card(lb.length ? `<div class="lb">
                <div class="lb-h"><span>PLAYER</span><span>W-D-L</span><span>VP±</span><span>PTS</span></div>
                ${lb.map((r, i) => { const d = r.vp_for - r.vp_against; return `<div class="lb-row${i === 0 ? ' first' : ''}" style="animation-delay:${i * 40}ms">${rk(i)}<div class="lb-n"><b>${esc(r.display_name)}</b><small>${r.games} ${r.games === 1 ? 'game' : 'games'}</small></div><span class="lb-w">${r.wins}-${r.draws}-${r.losses}</span><span class="lb-d ${d > 0 ? 'up' : d < 0 ? 'dn' : ''}">${d > 0 ? '+' : ''}${d}</span><span class="lb-p">${r.points}</span></div>`; }).join('')}</div>
                <div style="color:#667; font-size:0.7rem; margin-top:8px;">3 pts per win, 1 per draw. Games older than 60 days are summarized into these totals.</div>` : `<div class="empty-art"><svg viewBox="0 0 64 64" fill="none" stroke="#6b7a96" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10h24v14a12 12 0 0 1-24 0z"/><path d="M20 14h-8c0 8 4 12 9 13M44 14h8c0 8-4 12-9 13M32 36v10M22 54h20M26 46h12"/></svg><span>No games yet. Finish a game in the Game Tracker, then press <b>SEND TO LEAGUE</b> on it in the history list.</span></div>`);
            const chip = g => ({ pending: ['⏳ waiting for confirmation', '#e5c15a'], confirmed: ['✔ confirmed', '#5be59a'], rejected: ['✖ rejected', '#ff7b7b'] }[g.status || 'confirmed']);
            const rosterTxt = (r, who) => r && r.units ? `<div style="margin-top:6px; font-size:0.78rem; color:#cfd8e3;"><b>${esc(who)}'s list</b> — ${esc(r.name)} (${r.points_limit} pts)<br>${r.units.map(u => `${u[3]}× ${esc(u[1])}`).join(', ')}</div>` : '';
            html += `<div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:2px; margin:16px 0 8px;">RECENT GAMES</div>` + (games.length ? games.map(g => { const c = chip(g), w1 = g.p1_score > g.p2_score, w2 = g.p2_score > g.p1_score; return `<div class="gcard">
                <div class="gc-top"><span>${new Date(g.played_at).toLocaleDateString()} · ${esc(g.mission || '')}</span><span style="color:${c[1]}; font-weight:bold; white-space:nowrap;">${c[0]}</span></div>
                <div class="gc-score"><div class="gc-p ${w1 ? 'win' : ''}"><b>${esc(g.p1_name)}</b><small>${esc(g.p1_faction || '')}</small></div><div class="gc-n"><span class="${w1 ? 'win' : ''}">${g.p1_score}</span><i>–</i><span class="${w2 ? 'win' : ''}">${g.p2_score}</span></div><div class="gc-p r ${w2 ? 'win' : ''}"><b>${esc(g.p2_name)}</b><small>${esc(g.p2_faction || '')}</small></div></div>
                ${rosterTxt(g.p1_roster, g.p1_name)}${rosterTxt(g.p2_roster, g.p2_name)}
                ${g.submitted_by === session.user.id ? `<button onclick="LEAGUE.removeGame('${g.id}')" style="background:none; border:none; color:#a66; font-size:0.75rem; cursor:pointer; margin-top:6px; min-height:32px;">${g.status === 'rejected' ? 'delete rejected game (then you can re-send it)' : 'remove my submission'}</button>` : ''}</div>`; }).join('') : '<div style="color:#667; font-size:0.85rem;">—</div>');
            const iAmOwner = cur.role === 'owner';
            html += card(`<div style="font-weight:bold; margin-bottom:8px;"><i class="fa-solid fa-calendar-days"></i> League calendar</div>${events.length ? events.map(e => `<div style="border-top:1px solid #222c3a; padding:10px 0;"><div style="display:flex; justify-content:space-between; gap:8px;"><b>${esc(e.title)}</b><span style="color:var(--accent); font-size:0.8rem; white-space:nowrap;">${new Date(e.starts_at).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>${e.notes ? `<div style="color:#9aa7b8; font-size:0.8rem;">${esc(e.notes)}</div>` : ''}
                <div style="display:flex; gap:10px; margin-top:6px;"><button onclick="LEAGUE.ics('${e.id}')" style="background:none; border:1px solid #3a4556; color:#cfd8e3; border-radius:8px; padding:6px 10px; cursor:pointer; min-height:36px; font-size:0.75rem;">+ Add to my calendar</button>${(e.created_by === session.user.id || iAmOwner) ? `<button onclick="LEAGUE.delEvent('${e.id}')" style="background:none; border:none; color:#a66; cursor:pointer; min-height:36px; font-size:0.75rem;">delete</button>` : ''}</div></div>`).join('') : '<div style="color:#667; font-size:0.85rem; margin-bottom:6px;">Nothing scheduled yet.</div>'}
                <div style="border-top:1px solid #222c3a; margin-top:8px; padding-top:8px;"><input id="ev-title" placeholder="New event (e.g. League night)" maxlength="80" style="${inputCss}"><input id="ev-when" type="datetime-local" style="${inputCss}"><input id="ev-notes" placeholder="Notes (optional)" maxlength="400" style="${inputCss}">${btn('ADD EVENT', 'LEAGUE.addEvent()', '#2a3546')}</div>`);
            window.__events = events;
            html += '<div id="tourn-card"></div>';
            let members = []; try { members = await db.members(currentId); } catch (e) { html += `<div style="color:#ffb4b4; font-size:0.8rem;">Members: ${esc(e.message)} (run supabase/league_v2.sql)</div>`; }
            html += card(`<div style="font-weight:bold; margin-bottom:8px;">Members (${members.length})</div>${members.map(m => `<div style="display:flex; justify-content:space-between; padding:8px 0; border-top:1px solid #222c3a;"><span>${esc(m.display_name)}${m.user_id === session.user.id ? ' <small style="color:#889">(you)</small>' : ''}</span><span style="color:${m.role === 'owner' ? 'var(--accent)' : '#889'}; font-size:0.75rem; font-weight:bold;">${m.role === 'owner' ? 'OWNER' : 'MEMBER'}</span></div>`).join('')}
                ${cur.role === 'owner' ? '' : `<button onclick="LEAGUE.leave()" style="margin-top:10px; background:none; border:1px solid #6b2a2a; color:#d88; border-radius:8px; padding:8px 14px; cursor:pointer; min-height:40px;">Leave league</button>`}`);
            html += card(`<div style="font-weight:bold; margin-bottom:6px;">Invite friends</div><input readonly value="${esc(link)}" onclick="this.select()" style="${inputCss} font-size:0.8rem;">
                ${btn('<i class="fa-brands fa-whatsapp"></i> Send invite on WhatsApp', 'LEAGUE.inviteWA()', '#25a244')}${btn('Copy invite link', 'LEAGUE.copyInvite()', '#2a3546')}`);
        }
        let cloudRosters = []; try { cloudRosters = await db.rosters(); } catch (e) { html += `<div style="color:#ffb4b4; font-size:0.8rem;">Rosters: ${esc(e.message)} (run supabase/rosters.sql)</div>`; }
        html += rostersCard(cloudRosters);
        html += card(`<div style="font-weight:bold; margin-bottom:6px;">Account &amp; data</div><div style="color:#9aa7b8; font-size:0.8rem;">Manage what is stored on this device, in the cloud, or delete your account. Games you played stay in the ranking under the names you typed.</div>
            ${btn('<i class="fa-solid fa-broom"></i> MANAGE DATA ON THIS DEVICE', 'DATAMGR.open()', '#2a3546')}
            ${btn('<i class="fa-solid fa-cloud"></i> DELETE CLOUD DATA', 'LEAGUE.deleteCloud()', '#4a2a2a')}
            ${btn('<i class="fa-solid fa-user-slash"></i> DELETE ACCOUNT', 'LEAGUE.deleteAccount()', '#5c1f1f')}`);
        if (!cur) html += card(`<div style="font-weight:bold;">Start or join a league</div><div style="color:#9aa7b8; font-size:0.8rem; margin:4px 0 6px;">You can be in one league at a time. Name yours and invite friends with a link, or enter an invite code.</div>
            <input id="lg-new" placeholder="League name" maxlength="60" style="${inputCss}">${btn('CREATE LEAGUE', 'LEAGUE.create()')}
            <input id="lg-code" placeholder="Invite code" style="${inputCss} margin-top:14px;">${btn('JOIN WITH CODE', 'LEAGUE.join()', '#2a3546')}`);
        else if (cur.role === 'owner') html += card(`<div style="font-weight:bold;">Owner tools</div><div style="color:#9aa7b8; font-size:0.8rem; margin:4px 0;">Disbanding deletes the league for everyone (members, games, calendar, live links). Then you can create or join another.</div>${btn('DISBAND LEAGUE', 'LEAGUE.disband()', '#5c1f1f')}`);
        msg = ''; info = ''; root().innerHTML = html; if (window.LIVE) LIVE.paintNow();
        if (cur && window.TOURN && window.TOURN.paintCard) window.TOURN.paintCard(currentId, cur.role);
    }

    async function render() {
        if (!root()) return;
        if (!configured) return renderSetup();
        session = await db.session();
        if (!session) return renderAuth();
        renderHome();
    }

    const val = id => (document.getElementById(id) || {}).value || '';
    const safe = fn => async (...a) => { try { msg = ''; await fn(...a); } catch (e) { msg = e.message || String(e); render(); } };
    let authMode = 'signup';
    window.LEAGUE = {
        render,
        setMode: m => { authMode = m; msg = ''; info = ''; render(); },
        forgot: safe(async () => { const who = val('lg-email').trim(); if (!who) throw new Error('Enter your email or username'); let email; try { email = await db.emailFor(who); } catch (e) { if (!who.includes('@')) throw e; } if (email) { const { error } = await db.resetPassword(email); if (error) throw error; } authMode = 'login'; info = 'If that account exists, a reset link is on its way. Check your email.'; render(); }),
        savePassword: safe(async () => { const pw = val('lg-pass'); if (pw.length < 6) throw new Error('Use at least 6 characters'); const { error } = await db.setPassword(pw); if (error) throw error; authMode = 'login'; info = 'Password updated.'; render(); }),
        signIn: safe(async () => { const email = await db.emailFor(val('lg-email')); const { error } = await db.signIn(email, val('lg-pass')); if (error) throw error; render(); }),
        signUp: safe(async () => {
            const { data, error } = await db.signUp(val('lg-email'), val('lg-pass'), val('lg-name'));
            if (error) throw error;
            if (!data.session) throw new Error('Account created. In Supabase turn off "Confirm email" (Auth → Providers → Email) or confirm via the email, then sign in.');
            render();
        }),
        signOut: safe(async () => { await db.signOut(); render(); }),
        leave: safe(async () => { homeCache = null; if (!confirm('Leave this league? Your submitted games stay in the ranking.')) return; await db.leave(currentId, session.user.id); LS.del('lg_current'); currentId = null; renderHome(); }),
        pick: id => { currentId = id; LS.set('lg_current', id); renderHome(); },
        create: safe(async () => { homeCache = null; const n = val('lg-new').trim(); if (!n) throw new Error('Name the league first'); const l = await db.createLeague(n); currentId = l.id; LS.set('lg_current', l.id); renderHome(); }),
        join: safe(async () => { homeCache = null; const c = val('lg-code').trim(); if (!c) throw new Error('Enter an invite code'); const id = await db.joinLeague(c); currentId = id; LS.set('lg_current', id); renderHome(); }),
        removeGame: safe(async id => { if (!confirm('Remove this game from the league?')) return; await db.deleteGame(id); renderHome(); }),
        copyInvite: () => { const m = memberships.find(x => x.league.id === currentId); if (!m) return; const l = location.origin + location.pathname + '?join=' + m.league.invite_code; (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject()).then(() => alert('Invite link copied'), () => prompt('Copy this link:', l)); },
        inviteWA: () => { const m = memberships.find(x => x.league.id === currentId); if (!m) return; const l = location.origin + location.pathname + '?join=' + m.league.invite_code; window.open('https://wa.me/?text=' + encodeURIComponent(`Join my league "${m.league.name}" on Project 4192: ${l}`), '_blank'); }
    };

    // ---- cloud rosters: max 3 per user, stored compactly as [datasheetId, name, pts, count] ----
    const ptsOf = r => (r.units || []).reduce((s, u) => s + (+u.pts || 0), 0);
    function compact(r) {
        const m = new Map();
        (r.units || []).forEach(u => { const k = u.id + '|' + u.pts + '|' + (u.enh ? u.enh.name : ''); const e = m.get(k); if (e) e[3]++; else m.set(k, [String(u.id), u.name, +u.pts || 0, 1].concat(u.enh ? [u.enh.name, +u.enh.cost || 0, u.enh.detId] : [])); });
        return { name: r.name, faction: r.faction && r.faction.name || '', points_limit: r.pointsLimit || 0, detachments: Array.isArray(r.detachments) ? r.detachments : [], units: [...m.values()] };
    }
    function expand(c, slot) {
        const f = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => x.name === c.faction) || { name: c.faction, banner: 'assets/banners/0.jpg', color: '#888' };
        const units = []; c.units.forEach(([id, name, pts, n, en, ec, ed]) => { for (let i = 0; i < n; i++) units.push(Object.assign({ id, name, pts, w: 0, expanded: false }, en ? { enh: { name: en, cost: ec || 0, detId: ed } } : {})); });
        return { id: Date.now().toString() + slot, name: c.name, pointsLimit: c.points_limit, faction: f, units, detachments: c.detachments || [], fromCloudSlot: slot };
    }
    const unitCount = c => c.units.reduce((s, u) => s + u[3], 0);
    const need = async () => {
        if (!configured) { alert('League/cloud is not set up yet.'); return false; }
        session = await db.session();
        if (!session) { alert('Create an account or log in first (top bar) to save rosters to the cloud.'); window.LEAGUE.openAuth('login'); return false; }
        return true;
    };
    function chooser(title, rows, cancelLabel) {   // small modal returning the chosen key (or null)
        return new Promise(res => {
            const o = document.createElement('div'); o.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:100001; display:flex; align-items:center; justify-content:center; padding:16px;';
            o.innerHTML = `<div style="background:#1e252f; border:1px solid #3a4556; border-radius:12px; width:100%; max-width:440px; padding:18px; color:#fff;"><h3 style="margin:0 0 12px;">${title}</h3>${rows.map(r => `<button data-k="${r.key}" style="width:100%; text-align:left; min-height:56px; margin-bottom:10px; padding:12px; background:#161d27; color:#fff; border:1px solid #3a4556; border-radius:10px; cursor:pointer;"><b>${esc(r.label)}</b><br><span style="color:#9aa7b8; font-size:0.8rem;">${esc(r.sub)}</span></button>`).join('')}<button data-k="" style="width:100%; min-height:44px; background:transparent; color:#9aa7b8; border:none; cursor:pointer;">${cancelLabel || 'Cancel'}</button></div>`;
            o.onclick = e => { const b = e.target.closest('button'); if (b || e.target === o) { o.remove(); res(b && b.dataset.k ? b.dataset.k : null); } };
            document.body.appendChild(o);
        });
    }
    async function saveRosterToCloud(roster) {
        if (!roster || !(await need())) return;
        let cloud; try { cloud = await db.rosters(); } catch (e) { alert('Cloud error: ' + e.message + '\n(Did you run supabase/rosters.sql?)'); return; }
        const c = compact(roster);
        if (!c.units.length) { alert('Add some units first.'); return; }
        let slot = (roster.fromCloudSlot && cloud.find(r => r.slot === roster.fromCloudSlot)) ? roster.fromCloudSlot : null;
        if (!slot) {
            const free = [1, 2, 3].find(s => !cloud.some(r => r.slot === s));
            if (free) slot = free;
            else {
                const k = await chooser('Cloud is full (3 of 3). Replace which roster?', cloud.map(r => ({ key: r.slot, label: r.name, sub: `${r.faction} · ${r.points_limit} pts · ${unitCount(r)} units · slot ${r.slot}` })).sort((a, b) => a.key - b.key), 'Cancel — keep both');
                if (!k) return; slot = +k;
            }
        }
        try { await db.saveRoster(slot, c); STATE.rosters.forEach(x => { if (x !== roster && x.fromCloudSlot === slot) delete x.fromCloudSlot; }); roster.fromCloudSlot = slot; if (typeof saveRosters === 'function') saveRosters(); alert(`Saved to the cloud (slot ${slot}) ✔`); if (document.getElementById('league-root') && getComputedStyle(document.getElementById('view-league')).display !== 'none') renderHome(); }
        catch (e) { alert('Could not save: ' + e.message); }
    }
    function importCloudRoster(c) {
        const r = expand(c, c.slot), i = STATE.rosters.findIndex(x => x.fromCloudSlot === c.slot);
        if (i > -1) { if (!confirm(`Replace your device copy of "${STATE.rosters[i].name}" with the cloud version?`)) return null; r.id = STATE.rosters[i].id; STATE.rosters[i] = r; }
        else STATE.rosters.push(r);
        saveRosters(); return r;
    }
    function rostersCard(cloud) {
        const local = (typeof STATE !== 'undefined' ? STATE.rosters : []);
        const cl = [1, 2, 3].map(s => { const r = cloud.find(x => x.slot === s);
            return r ? `<div style="border:1px solid #2a3546; border-radius:10px; padding:12px; margin-bottom:8px; background:#10151c;"><b>${esc(r.name)}</b><div style="color:#9aa7b8; font-size:0.78rem;">${esc(r.faction)} · ${r.points_limit} pts · ${unitCount(r)} units</div>
                <div style="display:flex; gap:8px; margin-top:8px;"><button onclick="LEAGUE.openCloudRoster(${s})" style="flex:1; min-height:42px; background:var(--accent); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">OPEN</button>
                <button onclick="LEAGUE.deleteCloudRoster(${s})" aria-label="delete" style="width:48px; min-height:42px; background:#2a3546; color:#fff; border:none; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></div></div>`
                : `<div style="border:1px dashed #2a3546; border-radius:10px; padding:14px; margin-bottom:8px; color:#667; font-size:0.85rem;">Slot ${s} — empty</div>`; }).join('');
        const lc = local.length ? local.map((r, i) => `<div style="display:flex; align-items:center; gap:8px; border:1px solid #2a3546; border-radius:10px; padding:10px 12px; margin-bottom:8px; background:#10151c;">
                <div style="flex:1; min-width:0;"><b style="display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc(r.name)}</b><span style="color:#9aa7b8; font-size:0.75rem;">${esc(r.faction && r.faction.name)} · ${ptsOf(r)}/${r.pointsLimit} pts · ${(r.units || []).length} units${r.fromCloudSlot ? ' · ☁ slot ' + r.fromCloudSlot : ''}</span></div>
                <button onclick="LEAGUE.openLocalRoster(${i})" style="min-width:56px; min-height:42px; background:#2a3546; color:#fff; border:none; border-radius:8px; cursor:pointer;">Open</button>
                <button onclick="LEAGUE.saveLocalRoster(${i})" aria-label="save to cloud" style="min-width:48px; min-height:42px; background:#2a3546; color:#fff; border:none; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-cloud-arrow-up"></i></button></div>`).join('')
            : '<div style="color:#667; font-size:0.85rem;">No rosters on this device yet.</div>';
        return card(`<div style="font-weight:bold; margin-bottom:4px;">My rosters</div><div style="color:#9aa7b8; font-size:0.78rem; margin-bottom:10px;">Cloud: ${cloud.length} of 3 used. Only name, units and points are stored.</div>
            <div style="color:#9aa7b8; font-size:0.7rem; font-weight:bold; letter-spacing:2px; margin:8px 0;">IN THE CLOUD</div>${cl}
            <div style="color:#9aa7b8; font-size:0.7rem; font-weight:bold; letter-spacing:2px; margin:14px 0 8px;">ON THIS DEVICE</div>${lc}`);
    }
    Object.assign(window.LEAGUE, {
        saveCurrentRoster: () => saveRosterToCloud(typeof currentActiveRoster !== 'undefined' ? currentActiveRoster : null),
        saveLocalRoster: i => saveRosterToCloud(STATE.rosters[i]),
        openLocalRoster: i => { openRosterBuilder(STATE.rosters[i]); },
        openCloudRoster: safe(async s => { const c = (await db.rosters()).find(r => r.slot === s); if (!c) return; const r = importCloudRoster(Object.assign({ slot: s }, c)); if (r) openRosterBuilder(r); }),
        deleteCloudRoster: safe(async s => { if (!confirm('Delete this cloud roster? (Your device copy is not touched.)')) return; await db.deleteRoster(s); renderHome(); })
    });

    // ---------- v3 features: confirmations, calendar, account, send flow ----------
    const pad = n => String(n).padStart(2, '0');
    const icsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    function formOverlay(id, inner) {
        const o = document.createElement('div'); o.id = id; o.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.85); z-index:100001; display:flex; align-items:flex-start; justify-content:center; padding:16px; overflow-y:auto;';
        o.innerHTML = `<div style="background:#1e252f; border:1px solid #3a4556; border-radius:12px; width:100%; max-width:460px; padding:18px; color:#fff; margin:auto;">${inner}</div>`;
        o.onclick = e => { if (e.target === o) o.remove(); }; document.body.appendChild(o); return o;
    }
    Object.assign(window.LEAGUE, {
        confirm: safe(async (id, accept) => { if (!accept && !confirm('Reject this result? The game will not count and the sender can delete and re-send it.')) return; await db.confirmGame(id, accept); renderHome(); }),
        addEvent: safe(async () => {
            const title = val('ev-title').trim(), when = val('ev-when'); if (!title || !when) throw new Error('Give the event a name and a date/time');
            await db.addEvent(currentId, { title, starts_at: new Date(when).toISOString(), notes: val('ev-notes').trim() }); renderHome();
        }),
        delEvent: safe(async id => { if (!confirm('Delete this event?')) return; await db.deleteEvent(id); renderHome(); }),
        ics: id => {
            const e = (window.__events || []).find(x => x.id === id); if (!e) return;
            const s = new Date(e.starts_at), en = new Date(s.getTime() + 3 * 36e5), m = memberships.find(x => x.league.id === currentId);
            const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Project 4192//League//EN', 'BEGIN:VEVENT', `UID:${e.id}@project-4192`, `DTSTAMP:${icsDate(new Date())}`, `DTSTART:${icsDate(s)}`, `DTEND:${icsDate(en)}`,
                `SUMMARY:${(e.title || '').replace(/[,;\n]/g, ' ')}${m ? ' · ' + m.league.name.replace(/[,;\n]/g, ' ') : ''}`, `DESCRIPTION:${(e.notes || '').replace(/[,;\n]/g, ' ')}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
            const url = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' })), a = document.createElement('a'); a.href = url; a.download = 'league-event.ics'; a.click(); URL.revokeObjectURL(url);
        },
        deleteCloud: safe(async () => {
            if (!confirm('Delete your cloud data? This removes your saved cloud rosters and your live game links. Your account, league membership and played games stay.')) return;
            await db.deleteCloudData(); info = 'Cloud rosters and live links deleted.'; renderHome();
        }),
        deleteAccount: safe(async () => {
            if (!confirm('Delete your account and all your cloud data? This cannot be undone.')) return;
            if ((prompt('Type DELETE to confirm') || '').trim() !== 'DELETE') return;
            await db.deleteAccount(); try { await db.signOut(); } catch (e) {}
            ['lg_current', 'lg_pending_code'].forEach(k => LS.del(k)); currentId = null; alert('Your account was deleted.'); render();
        }),
        // ----- send a finished game to the league (opponent picked from members → they confirm) -----
        sendHistory: async function (i) {
            if (!configured) { alert('League is not set up yet — see supabase/README.md'); return; }
            session = await db.session();
            if (!session) { alert('Create an account or log in first (top bar) to send games to a league.'); window.LEAGUE.openAuth('login'); return; }
            const rec = JSON.parse(localStorage.getItem('gdm_history') || '[]')[i]; if (!rec) return;
            try { memberships = await db.memberships(); } catch (e) { alert(e.message); return; }
            if (!memberships.length) { alert('Join or create a league first (menu → League).'); switchView('league'); return; }
            const lid = (memberships.find(x => x.league.id === (rec.leagueId || currentId)) || memberships[0]).league.id;
            let members = []; try { members = await db.members(lid); } catch (e) { alert(e.message + '\\n(Run supabase/league_v3.sql)'); return; }
            const others = members.filter(m => m.user_id !== session.user.id), rosters = (typeof STATE !== 'undefined' ? STATE.rosters : []);
            const o = formOverlay('ov-send', `<h3 style="margin:0 0 4px;">Send to league</h3><div style="color:#9aa7b8; font-size:0.85rem; margin-bottom:10px;">${esc(rec.p1)} ${rec.p1score} – ${rec.p2score} ${esc(rec.p2)}</div>
                ${memberships.length > 1 ? `<label style="font-size:0.75rem; color:#9aa7b8;">League</label><select id="sg-league" style="${inputCss}">${memberships.map(m => `<option value="${m.league.id}" ${m.league.id === lid ? 'selected' : ''}>${esc(m.league.name)}</option>`).join('')}</select>` : ''}
                <label style="font-size:0.75rem; color:#9aa7b8;">I played as</label><select id="sg-side" style="${inputCss}"><option value="1">${esc(rec.p1)} (Player 1)</option><option value="2">${esc(rec.p2)} (Player 2)</option></select>
                <label style="font-size:0.75rem; color:#9aa7b8;">Opponent</label><select id="sg-opp" style="${inputCss}"><option value="">Not in the league (counts right away)</option>${others.map(m => `<option value="${m.user_id}">${esc(m.display_name)} — must confirm</option>`).join('')}</select>
                <label style="font-size:0.75rem; color:#9aa7b8;">Attach my army list (optional)</label><select id="sg-roster" style="${inputCss}"><option value="">None</option>${rosters.map((r, k) => `<option value="${k}">${esc(r.name)} · ${esc(r.faction && r.faction.name)}</option>`).join('')}</select>
                <div id="sg-msg" style="color:#ffb4b4; font-size:0.85rem;"></div>${btn('SEND', 'LEAGUE._sendGo(' + i + ')')}${btn('Cancel', "document.getElementById('ov-send').remove()", '#2a3546')}`);
            if (rec.liveP2) { const so = document.getElementById('sg-opp'), ss = document.getElementById('sg-side'); if (so && [...so.options].some(x => x.value === rec.liveP2)) so.value = rec.liveP2; if (ss) ss.value = String(rec.liveSide || 1); }
        },
        _sendGo: async function (i) {
            const rec = JSON.parse(localStorage.getItem('gdm_history') || '[]')[i], msgEl = document.getElementById('sg-msg');
            const lid = (document.getElementById('sg-league') || {}).value || currentId || (memberships[0] && memberships[0].league.id);
            const side = +document.getElementById('sg-side').value, opp = document.getElementById('sg-opp').value, rk = document.getElementById('sg-roster').value;
            try {
                await db.submitGame(lid, rec, side, opp || null, rk !== '' ? compact(STATE.rosters[+rk]) : null);
                document.getElementById('ov-send').remove();
                alert(opp ? 'Sent ✔ — it counts once your opponent confirms it (League screen).' : 'Sent ✔ — it is in the ranking.');
            } catch (e) { msgEl.textContent = /already sent/.test(e.message) ? 'That game was already sent to this league.' : e.message; }
        }
    });
    window.sendHistoryToLeague = i => window.LEAGUE.sendHistory(i);

    // ---------- live shared games: owner publishes, anyone with the link views status ----------
    let syncTimer = null;
    const liveLink = code => location.origin + location.pathname + '?game=' + code;
    const factionBanner = f => { const n = String(f || '').replace(/’/g, "'").replace('Imperial Agents', 'Agents of the Imperium'); const hit = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => x.name === n); return hit ? hit.banner : 'assets/banners/0.jpg'; };
    const ago = t => { const s = Math.max(0, (Date.now() - new Date(t)) / 1000); return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : Math.round(s / 86400) + ' d ago'; };
    async function ensureLogin(what) {
        if (!configured) { alert('Cloud features are not set up yet.'); return false; }
        session = await db.session();
        if (!session) { alert(`Create an account or log in first (top bar) to ${what}.`); window.LEAGUE.openAuth('login'); return false; }
        return true;
    }
    function liveOverlay(code, status) {
        const link = liveLink(code);
        const o = formOverlay('ov-livelink', `<div style="display:flex; justify-content:space-between; align-items:center;"><h3 style="margin:0;">Live link</h3><button onclick="document.getElementById('ov-livelink').remove()" style="background:none; border:1px solid #3a4556; color:#fff; width:40px; height:40px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-times"></i></button></div>
            <p style="color:#9aa7b8; font-size:0.85rem;">Anyone with this link can <b>watch</b> the game — scores, round and missions scored. ${status === 'finished' ? 'This game is finished.' : 'It updates automatically while you play.'} Links expire after 30 days without updates.</p>
            <input readonly id="live-link-input" value="${esc(link)}" onclick="this.select()" style="${inputCss} font-size:0.8rem;">
            ${btn('<i class="fa-solid fa-copy"></i> Copy link', 'LEAGUE._copyLive()', '#4384ff')}
            ${btn('<i class="fa-brands fa-whatsapp"></i> Send on WhatsApp', "LEAGUE._waLive()", '#25a244')}
            <div id="live-invite-box"></div>`);
        if (window.LIVE) LIVE.inviteBox(code);
        return o;
    }
    async function publishCurrent(status) {
        if (trackerState.live && trackerState.live.role === 'p2' && trackerState.shareCode) return trackerState.shareCode;   // the host owns the shared game
        const code = await db.publish(trackerState.shareCode, window.GDM.snapshot(), status, trackerState.leagueId);
        if (code !== trackerState.shareCode) { trackerState.shareCode = code; if (window.saveCurrentGame) window.saveCurrentGame(); }
        return code;
    }
    async function renderViewer(code, first) {
        const o = document.getElementById('ov-live'); if (!o) return;
        let r, lg = null; try { try { lg = await db.liveGet(code); } catch (e2) { lg = null; } r = lg ? { status: lg.status, state: lg.state, updated_at: lg.updated_at, owner_name: lg.owner_name } : await db.getShared(code); } catch (e) { o.firstChild.innerHTML = `<div style="color:#ffb4b4">${esc(e.message)}</div>`; return; }
        if (!r) { o.firstChild.innerHTML = `<div style="text-align:center; padding:20px;"><h3>Link not found</h3><div style="color:#9aa7b8;">This live game doesn't exist or has expired.</div>${btn('Close', "document.getElementById('ov-live').remove()", '#2a3546')}</div>`; return; }
        const s = r.state, fin = r.status === 'finished', tot = p => (p.pri || 0) + (p.sec || 0) + (p.paint ? 10 : 0), col = n => n === 1 ? '#4db8ff' : '#ff4d4d';
        const fd = f => typeof getFDColor === 'function' ? getFDColor(f) : '#444';
        const side = (p, n, m) => `<div style="flex:1; min-width:0; padding:14px 12px; background-image:linear-gradient(180deg, rgba(8,11,16,.55), rgba(8,11,16,.92)), url('${factionBanner(p.faction)}'); background-size:cover; background-position:center; text-align:${n === 1 ? 'left' : 'right'}; border-top:4px solid ${col(n)};">
            <div style="color:#dfe6ee; font-size:0.75rem;">${esc(p.faction || 'No faction')}</div><div style="color:${col(n)}; font-weight:800; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${esc((p.name || '').toUpperCase())}</div>
            <div style="font-size:3rem; font-weight:800; line-height:1.05;">${tot(p)}</div>
            <div style="color:#c3ccd8; font-size:0.72rem;">PRI ${p.pri || 0} · SEC ${p.sec || 0}${p.paint ? ' · PAINT +10' : ''}</div>
            <div style="display:inline-block; margin-top:6px; background:${fd(p.forceDisp)}; border-radius:6px; padding:2px 8px; font-size:0.65rem; font-weight:bold;">${esc(p.forceDisp || '')}</div>
            <div style="color:#aab4c2; font-size:0.7rem; margin-top:4px;">${esc(m || '')}</div></div>`;
        const rounds = []; for (let k = 1; k <= 5; k++) { const rows = [1, 2].map(n => (s['p' + n].log || []).filter(e => e.round === k && e.vp > 0)); if (rows[0].length || rows[1].length) rounds.push([k, rows]); }
        const chipx = e => `<span style="display:inline-block; background:rgba(47,158,95,.2); border:1px solid #2f9e5f; color:#9be8bd; border-radius:6px; padding:2px 8px; font-size:0.72rem; margin:2px 4px 2px 0;">${esc(e.mission)} +${e.vp}</span>`;
        o.firstChild.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <span style="background:${fin ? '#2f9e5f' : '#e5c15a'}; color:#000; font-weight:800; font-size:0.72rem; letter-spacing:1px; border-radius:6px; padding:4px 10px;">${fin ? 'FINISHED' : 'IN PROGRESS · ROUND ' + (s.round || 1) + ' OF 5'}</span>
            <button onclick="document.getElementById('ov-live').remove()" style="background:none; border:1px solid #3a4556; color:#fff; width:40px; height:40px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-times"></i></button></div>
            <div style="display:flex; border-radius:10px; overflow:hidden; border:1px solid #2a3546;">${side(s.p1, 1, s.m1)}${side(s.p2, 2, s.m2)}</div>
            <div style="color:#778; font-size:0.72rem; margin:8px 0;">Host ${esc(r.owner_name || 'a player')}${lg && lg.p2_name ? ' · vs ' + esc(lg.p2_name) + ' (linked)' : ''}${lg && lg.role && lg.role !== 'spectator' ? ' · you are a player' : ' · spectator'} · updated ${ago(r.updated_at)}${fin ? '' : ' · refreshing every 5 s'}</div>
            ${rounds.length ? rounds.map(([k, rows]) => `<div style="border-top:1px solid #2a3546; padding:8px 0;"><div style="color:#9aa7b8; font-size:0.7rem; font-weight:bold; letter-spacing:1px;">ROUND ${k}</div><div style="display:flex; gap:10px;">${[0, 1].map(i => `<div style="flex:1; min-width:0; text-align:${i ? 'right' : 'left'};">${rows[i].map(chipx).join('') || '<span style="color:#445">—</span>'}</div>`).join('')}</div></div>`).join('') : '<div style="color:#667; font-size:0.85rem;">No missions scored yet.</div>'}
            ${!fin ? btn('<i class="fa-solid fa-clone"></i> Open a copy on my device and keep scoring', 'LEAGUE._copyLiveGame()', '#4384ff') : ''}`;
        o.__state = s;
        if (first || !o.__timer) { clearInterval(o.__timer); o.__timer = fin ? null : setInterval(() => { if (!document.getElementById('ov-live')) { clearInterval(o.__timer); return; } renderViewer(code, false); }, 5000); }
    }
    Object.assign(window.LEAGUE, {
        openViewer: code => {
            let o = document.getElementById('ov-live'); if (o) { clearInterval(o.__timer); o.remove(); }
            o = formOverlay('ov-live', '<div style="color:#9aa7b8; text-align:center; padding:20px;">Loading live game…</div>');
            if (!configured) { o.firstChild.innerHTML = '<div style="padding:20px;">Cloud features are not set up.</div>'; return; }
            renderViewer(code, true);
        },
        _copyLiveGame: () => { const o = document.getElementById('ov-live'); if (!o || !o.__state) return; if (!confirm('Open a copy of this game on your device? It will not stay linked to the original.')) return; clearInterval(o.__timer); window.GDM.importSnapshot(o.__state); o.remove(); },
        shareLive: async () => {
            if (!(await ensureLogin('share a live link'))) return;
            try { const code = await publishCurrent('in_progress'); const sh = document.getElementById('ov-share'); if (sh) sh.remove(); liveOverlay(code, 'in_progress'); } catch (e) { alert('Could not create the link: ' + e.message + '\\n(Did you run supabase/league_v3.sql?)'); }
        },
        shareLiveRecord: async i => {
            if (!(await ensureLogin('share a live link'))) return;
            const h = JSON.parse(localStorage.getItem('gdm_history') || '[]'), rec = h[i]; if (!rec) return;
            try { const code = await db.publish(rec.shareCode || null, window.GDM.snapshotFromRecord(rec), 'finished'); if (rec.shareCode !== code) { rec.shareCode = code; localStorage.setItem('gdm_history', JSON.stringify(h)); } liveOverlay(code, 'finished'); }
            catch (e) { alert('Could not create the link: ' + e.message + '\\n(Did you run supabase/league_v3.sql?)'); }
        },
        disband: safe(async () => { homeCache = null; const m = memberships.find(x => x.league.id === currentId); if (!m) return; if ((prompt(`Type the league name to disband it:\n${m.league.name}`) || '').trim() !== m.league.name) return; await db.disband(currentId); LS.del('lg_current'); currentId = null; info = 'League disbanded.'; renderHome(); }),
        newLeagueGame: async () => { if (!(await ensureLogin('start a league game'))) return; if (!currentId) { alert('Create or join a league first.'); return; } switchView('tracker'); window.GDM.newGame({ leagueId: currentId }); },
        publishNow: async () => { if (!configured || typeof trackerState === 'undefined' || !trackerState.leagueId) return; try { session = await db.session(); if (session) await publishCurrent('in_progress'); } catch (e) {} },
        promptSend: i => { setTimeout(() => window.LEAGUE.sendHistory(i), 400); },
        onGameSaved: () => { if (!configured || typeof trackerState === 'undefined' || !trackerState.shareCode) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => publishCurrent('in_progress').catch(() => {}), 3000); },
        onGameFinished: (rec, code) => { if (!configured || !code || !rec) return; rec.shareCode = code; db.publish(code, window.GDM.snapshotFromRecord(rec), 'finished', rec.leagueId).catch(() => {}); },
        _copyLive: () => { const v = document.getElementById('live-link-input').value; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => alert('Link copied'), () => { document.getElementById('live-link-input').select(); document.execCommand('copy'); }); },
        _waLive: () => { const v = document.getElementById('live-link-input').value; window.open('https://wa.me/?text=' + encodeURIComponent('Follow my game live on Project 4192: ' + v), '_blank'); }
    });

    // header pills: Log in / Sign up  ↔  Account
    function paintPills(s) {
        const box = document.getElementById('auth-pills'); if (!box) return;
        box.style.display = configured ? 'flex' : 'none';
        const on = !!s;
        document.getElementById('auth-login').style.display = 'none';
        document.getElementById('auth-signup').style.display = on ? 'none' : '';
        const acc = document.getElementById('auth-account'); acc.style.display = on ? '' : 'none';
        if (on) document.getElementById('auth-name').textContent = ((s.user.user_metadata && s.user.user_metadata.display_name) || s.user.email || 'Account').split('@')[0].slice(0, 12);
    }
    window.LEAGUE.openAuth = async function (mode) {
        authMode = mode === 'login' ? 'login' : 'signup';
        switchView('league'); await render();
        const f = document.getElementById(authMode === 'signup' ? 'lg-name' : 'lg-email'); if (f) f.focus();
    };
    if (configured) {
        db.session().then(paintPills); setTimeout(paintHomeLeague, 400);
        sb.auth.onAuthStateChange((_e, s) => { paintPills(s); homeCache = null; setTimeout(paintHomeLeague, 100); });
    } else paintPills(null);

    // Home screen button for logged-in users: create / open the league
    let homeCache = null;
    async function paintHomeLeague() {
        // the home screen stays clean: the league lives in the menu (League)
        const old = document.getElementById('home-league'); if (old) old.remove();
        return;
        const home = document.getElementById('view-home'); if (!home || !configured) return;
        let box = document.getElementById('home-league');
        if (!box) { box = document.createElement('div'); box.id = 'home-league'; box.style.padding = '0 20px'; const anchor = document.getElementById('home-rosters') || document.getElementById('home-continue'); if (anchor) anchor.after(box); else home.insertBefore(box, home.children[1]); }
        let s = null; try { s = await db.session(); } catch (e) {}
        if (!s) { box.innerHTML = ''; homeCache = null; return; }
        if (homeCache === null) { try { session = s; const m = await db.memberships(); homeCache = m[0] ? m[0].league.name : ''; } catch (e) { homeCache = ''; } }
        box.innerHTML = `<button onclick="switchView('league')" style="width:100%; margin:6px 0 14px; padding:14px 18px; min-height:56px; background:rgba(229,193,90,.12); border:1px solid #e5c15a; color:#e5c15a; border-radius:12px; cursor:pointer; text-align:left; font-weight:800; display:flex; align-items:center; gap:12px;"><i class="fa-solid fa-trophy" style="font-size:1.2rem;"></i><span style="flex:1;">${homeCache ? esc(homeCache) + ' · League' : 'Create or join a league'}</span><i class="fa-solid fa-chevron-right"></i></button>`;
    }
    window.LEAGUE.paintHome = () => { homeCache = null; paintHomeLeague(); };

    // render when the view opens
    const base = window.switchView;
    window.switchView = function (v, push) { base(v, push); if (v === 'league') render(); if (v === 'home') setTimeout(paintHomeLeague, 50); };
    if (configured) sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') { authMode = 'recovery'; switchView('league'); setTimeout(render, 50); return; } const el = document.getElementById('view-league'); if (el && getComputedStyle(el).display !== 'none') render(); });

    // live game link: ?game=CODE -> read-only status viewer (no account needed)
    const gcode = new URLSearchParams(location.search).get('game');
    if (gcode) { history.replaceState(null, '', location.pathname + location.hash); setTimeout(() => window.LEAGUE.openViewer(gcode), 300); }

    // invite link: ?join=CODE → remember it and open the League screen
    const p = new URLSearchParams(location.search), code = p.get('join');
    if (code) {
        LS.set('lg_pending_code', code);
        history.replaceState(null, '', location.pathname + location.hash);
        setTimeout(() => switchView('league'), 0);
    }
})();
