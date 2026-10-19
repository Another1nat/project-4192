/* Super-admin panel. Only shows for the admin account; EVERYTHING is enforced server-side by the admin_* functions
   (supabase/schema.sql, "v6"): a non-admin who calls them gets "forbidden". Passwords are hashed by Supabase and cannot be read —
   use "Send reset link" instead. */
(function () {
    const sb = () => window.LEAGUE_CORE && window.LEAGUE_CORE.sb && window.LEAGUE_CORE.sb();
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const ago = t => { if (!t) return '—'; const m = Math.round((Date.now() - new Date(t)) / 60000); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
    const when = t => t ? new Date(t).toLocaleString() : '—';
    const TABS = [['overview', 'Overview', 'gauge-high'], ['users', 'Users', 'users'], ['leagues', 'Leagues', 'trophy'], ['games', 'Games', 'chess-board'], ['live', 'Live', 'tower-broadcast'], ['rosters', 'Rosters', 'list'], ['tournaments', 'Tournaments', 'medal'], ['reports', 'Reports', 'bug'], ['log', 'Audit log', 'clipboard-list']];
    let tab = 'overview', rstat = '', cache = {}, q = '', isAdmin = null, busy = false;

    // shared live games (no account; saved 90 days): watch by spectator link, delete
    function roomsHtml(rooms) {
        if (rooms === null) return '<div class="ad-note">Shared live games are not saved yet: run supabase/live_rooms_v8.sql in the Supabase SQL editor.</div>';
        const t = p => (p.pri || 0) + (p.sec || 0) + (p.paint ? 10 : 0);
        return `<div class="ad-sub" style="margin:4px 2px 10px">Shared live games (no account) · ${rooms.length} · kept 90 days after the last change</div>` + rooms.map(g => { const s = g.state || {}, p1 = s.p1 || {}, p2 = s.p2 || {};
            return `<div class="ad-card"><div class="ad-main"><b>${esc(p1.name || 'P1')} <span class="ad-score">${t(p1)}</span> – <span class="ad-score">${t(p2)}</span> ${esc(p2.name || 'P2')}</b> ${chip(g.finished ? 'finished' : 'in progress', g.finished ? 'ok' : 'warn')}
            <div class="ad-sub">round ${s.round || '?'} · updated ${ago(g.updated_at)} · kept until ${g.expires_at ? new Date(g.expires_at).toLocaleDateString() : "—"} · code ${esc(g.code)}</div></div>
            <div class="ad-acts"><a class="ad-btn" href="./?obs=${esc(g.code)}" target="_blank" style="text-decoration:none"><i class="fa-solid fa-eye"></i> Watch</a><button class="ad-btn bad" onclick="ADMIN.delLive('${esc(g.code)}')"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`; }).join('')
            + '<div class="ad-sub" style="margin:14px 2px 10px">League live links (account)</div>';
    }
    async function rpc(fn, args) { const { data, error } = await sb().rpc(fn, args || {}); if (error) throw new Error(error.message); return data; }
    const toast = m => (typeof window.toast === "function" ? window.toast(m) : alert(m));
    function viewEl() {
        let v = document.getElementById('view-admin'); if (v) return v;
        const ref = document.getElementById('view-league'); if (!ref) return null;
        v = document.createElement('div'); v.id = 'view-admin'; v.className = 'view'; ref.parentElement.appendChild(v); return v;
    }
    async function check() {
        const c = sb(); if (!c) return false;
        try { const { data: s } = await c.auth.getSession(); if (!s.session) isAdmin = false; else isAdmin = (await rpc('is_admin')) === true; } catch (e) { isAdmin = false; }
        const b = document.getElementById('menu-admin'); if (b) b.style.display = isAdmin ? '' : 'none';
        return isAdmin;
    }
    function shell(body) {
        return `<div class="ad-wrap"><div class="ad-top"><div><h2 style="margin:0;"><i class="fa-solid fa-user-shield"></i> Admin</h2><small>Visible only to your account · every action is logged</small></div><button class="ad-btn" onclick="ADMIN.reload()"><i class="fa-solid fa-rotate"></i></button></div>
            <div class="ad-tabs">${TABS.map(([k, l, ic]) => `<button class="${tab === k ? 'on' : ''}" onclick="ADMIN.tab('${k}')"><i class="fa-solid fa-${ic}"></i> ${l}</button>`).join('')}</div>${body}</div>`;
    }
    const chip = (t, c) => `<span class="ad-chip ${c || ''}">${esc(t)}</span>`;
    const stat = (n, l) => `<div class="ad-stat"><b>${n}</b><span>${l}</span></div>`;

    function userCard(u) {
        return `<div class="ad-card"><div class="ad-row"><div class="ad-main"><b>${esc(u.name || '—')}</b>${u.is_admin ? chip('admin', 'ok') : ''}${u.blocked ? chip('blocked', 'bad') : ''}${!u.confirmed ? chip('unconfirmed', 'warn') : ''}
            <div class="ad-sub">${esc(u.email)}</div><div class="ad-sub">joined ${when(u.created_at)} · last sign-in ${u.last_sign_in_at ? ago(u.last_sign_in_at) : 'never'}${u.league ? ' · league: ' + esc(u.league) : ''}</div>
            <div class="ad-sub">${u.rosters} rosters · ${u.games} games · ${u.live} live links${u.blocked && u.blocked_reason ? ' · reason: ' + esc(u.blocked_reason) : ''}</div></div></div>
            <div class="ad-acts"><button class="ad-btn" onclick="ADMIN.reset('${esc(u.email)}')"><i class="fa-solid fa-key"></i> Send reset link</button>
            <button class="ad-btn" onclick="ADMIN.copy('${esc(u.email)}')"><i class="fa-regular fa-copy"></i> Copy email</button>
            ${u.is_admin ? '' : `<button class="ad-btn warn" onclick="ADMIN.block('${u.id}', ${!u.blocked})">${u.blocked ? '<i class="fa-solid fa-lock-open"></i> Unblock' : '<i class="fa-solid fa-ban"></i> Block'}</button>
            <button class="ad-btn bad" onclick="ADMIN.delUser('${u.id}', '${esc(u.email)}')"><i class="fa-solid fa-trash"></i> Delete</button>`}</div></div>`;
    }
    const units = r => (r.units || []).map(u => `${u[3] || 1}× ${esc(u[1])} (${u[2]})`).join(', ');
    const view = {
        overview: d => `<div class="ad-stats">${stat(d.users, 'users')}${stat(d.users_24h, 'new (24 h)')}${stat(d.active_7d, 'active (7 d)')}${stat(d.blocked, 'blocked')}${stat(d.leagues, 'leagues')}${stat(d.games, 'league games')}${stat(d.live, 'live now')}${stat(d.pending_invites, 'pending invites')}${stat(d.rosters, 'cloud rosters')}${stat(d.tournaments, 'tournaments')}${stat(d.reports_new || 0, 'new reports')}</div>`,
        users: d => `<input class="ad-search" id="ad-q" placeholder="Search name or email…" value="${esc(q)}" onkeydown="if(event.key==='Enter')ADMIN.search(this.value)"><div class="ad-sub" style="margin:6px 2px 10px">${d.length} shown</div>${d.map(userCard).join('') || '<div class="ad-empty">No users.</div>'}`,
        leagues: d => d.map(l => `<div class="ad-card"><div class="ad-main"><b>${esc(l.name)}</b> ${chip(l.members + ' members')}${chip(l.games + ' games')}${chip(l.tournaments + ' tournaments')}<div class="ad-sub">owner ${esc(l.owner || '—')} · code ${esc(l.invite_code)} · created ${when(l.created_at)}</div>
            <div class="ad-members">${(l.member_list || []).map(m => `<span class="ad-chip">${esc(m.name || '—')}${m.role === 'owner' ? ' ★' : ''} <a onclick="ADMIN.rmMember('${l.id}','${m.id}','${esc(m.name || '')}')" title="remove">✕</a></span>`).join('')}</div></div>
            <div class="ad-acts"><button class="ad-btn bad" onclick="ADMIN.disband('${l.id}','${esc(l.name)}')"><i class="fa-solid fa-trash"></i> Disband league</button></div></div>`).join('') || '<div class="ad-empty">No leagues.</div>',
        games: d => d.map(g => `<div class="ad-card"><div class="ad-main"><b>${esc(g.p1)} <span class="ad-score">${g.p1_score}</span> – <span class="ad-score">${g.p2_score}</span> ${esc(g.p2)}</b> ${chip(g.status, g.status === 'confirmed' ? 'ok' : 'warn')}
            <div class="ad-sub">${esc(g.p1_faction || '')} vs ${esc(g.p2_faction || '')} · ${esc(g.mission || '')} · ${esc(g.league || 'no league')} · ${when(g.played_at)} · by ${esc(g.submitted_by || '—')}</div>
            ${g.p1_roster || g.p2_roster ? `<details class="ad-det"><summary>Rosters</summary>${[g.p1_roster, g.p2_roster].filter(Boolean).map(r => `<div class="ad-sub"><b>${esc(r.name)}</b> (${r.points_limit}): ${units(r)}</div>`).join('')}</details>` : ''}</div>
            <div class="ad-acts"><button class="ad-btn bad" onclick="ADMIN.delGame('${g.id}')"><i class="fa-solid fa-trash"></i> Delete game</button></div></div>`).join('') || '<div class="ad-empty">No games.</div>',
        live: d => roomsHtml(d.rooms || []) + (d.games || []).map(g => { const s = g.state || {}, p1 = s.p1 || {}, p2 = s.p2 || {}, t = p => (p.pri || 0) + (p.sec || 0) + (p.paint ? 10 : 0);
            return `<div class="ad-card"><div class="ad-main"><b>${esc(p1.name || g.owner)} <span class="ad-score">${t(p1)}</span> – <span class="ad-score">${t(p2)}</span> ${esc(p2.name || '')}</b> ${chip(g.status, g.status === 'finished' ? 'ok' : 'warn')}${g.p2 ? chip('linked: ' + g.p2, 'ok') : ''}${g.invite_status === 'pending' ? chip('invite pending: ' + (g.invited || ''), 'warn') : ''}
            <div class="ad-sub">host ${esc(g.owner)} · ${esc(g.league || 'no league')} · round ${s.round || '?'} · v${g.version} · updated ${ago(g.updated_at)} · code ${esc(g.code)}</div></div>
            <div class="ad-acts"><button class="ad-btn" onclick="LEAGUE.openViewer('${g.code}')"><i class="fa-solid fa-eye"></i> Watch</button><button class="ad-btn bad" onclick="ADMIN.delLive('${g.code}')"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`; }).join('') || '<div class="ad-empty">No live games.</div>',
        rosters: d => `<input class="ad-search" id="ad-q" placeholder="Search roster, faction, name or email…" value="${esc(q)}" onkeydown="if(event.key==='Enter')ADMIN.search(this.value)"><div class="ad-sub" style="margin:6px 2px 10px">${d.length} shown</div>` + d.map(r => `<div class="ad-card"><div class="ad-main"><b>${esc(r.name)}</b> ${chip(r.faction)}${chip(r.points_limit + ' pts')}${chip('slot ' + r.slot)}
            <div class="ad-sub">${esc(r.owner_name || '—')} · ${esc(r.email)} · updated ${ago(r.updated_at)}</div><details class="ad-det"><summary>${(r.units || []).length} unit lines</summary><div class="ad-sub">${units(r)}</div></details></div>
            <div class="ad-acts"><button class="ad-btn bad" onclick="ADMIN.delRoster('${r.id}','${esc(r.name)}')"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`).join(''),
        tournaments: d => d.map(t => `<div class="ad-card"><div class="ad-main"><b>${esc(t.name)}</b> ${chip(t.format)}${chip(t.status, t.status === 'finished' ? 'ok' : 'warn')}${chip(t.players + ' players')}<div class="ad-sub">${esc(t.league || '')} · ${when(t.created_at)}</div></div>
            <div class="ad-acts"><button class="ad-btn bad" onclick="ADMIN.delTournament('${t.id}','${esc(t.name)}')"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`).join('') || '<div class="ad-empty">No tournaments.</div>',
        reports: d => `<div class="ad-seg">${[['', 'All'], ['new', 'New'], ['seen', 'Seen'], ['done', 'Done']].map(([k, l]) => `<button class="${rstat === k ? 'on' : ''}" onclick="ADMIN.rfilter('${k}')">${l}</button>`).join('')}</div><div class="ad-sub" style="margin:6px 2px 10px">${d.length} shown</div>` + d.map(r => `<div class="ad-card"><div class="ad-main"><b>${r.kind === 'bug' ? '🐞 Bug' : '💡 Idea'}</b> ${chip(r.status, r.status === 'new' ? 'warn' : r.status === 'done' ? 'ok' : '')}${r.has_image ? chip('screenshot') : ''}
            <div class="ad-msg">${esc(r.message).replace(/\n/g, '<br>')}</div>
            <div class="ad-sub">${r.email ? esc(r.name || '—') + ' · ' + esc(r.email) : 'not signed in'}${r.contact ? ' · contact: ' + esc(r.contact) : ''} · ${when(r.created_at)}</div>
            <div class="ad-sub">${esc(r.page || '')} · v${esc(r.app_version || '?')} · ${esc((r.user_agent || '').replace(/^Mozilla\/5\.0 /, '').slice(0, 90))}</div></div>
            <div class="ad-acts">${r.has_image ? `<button class="ad-btn" onclick="ADMIN.reportImg('${r.id}', this)"><i class="fa-solid fa-image"></i> Screenshot</button>` : ''}${r.status !== 'seen' ? `<button class="ad-btn" onclick="ADMIN.reportSet('${r.id}','seen')"><i class="fa-regular fa-eye"></i> Seen</button>` : ''}${r.status !== 'done' ? `<button class="ad-btn" onclick="ADMIN.reportSet('${r.id}','done')"><i class="fa-solid fa-check"></i> Done</button>` : ''}<button class="ad-btn bad" onclick="ADMIN.reportDel('${r.id}')"><i class="fa-solid fa-trash"></i> Delete</button></div></div>`).join('') || '<div class="ad-empty">No reports.</div>',
        log: d => d.map(l => `<div class="ad-card"><div class="ad-main"><b>${esc(l.action)}</b> <span class="ad-sub">${when(l.at)}</span><div class="ad-sub">${esc(l.target || '')} ${l.detail ? esc(JSON.stringify(l.detail)) : ''}</div></div></div>`).join('') || '<div class="ad-empty">Nothing logged yet.</div>'
    };
    const loaders = { overview: () => rpc('admin_overview'), users: () => rpc('admin_users', { p_q: q || null, p_limit: 300 }), leagues: () => rpc('admin_leagues'), games: () => rpc('admin_games', { p_limit: 200 }),
        live: async () => ({ games: await rpc('admin_live_games'), rooms: await rpc('admin_live_rooms').catch(() => null) }), rosters: () => rpc('admin_rosters', { p_q: q || null }), tournaments: () => rpc('admin_tournaments'), reports: () => rpc('admin_reports', { p_status: rstat || null, p_limit: 200 }), log: () => rpc('admin_log_list', { p_limit: 150 }) };
    async function render() {
        const v = viewEl(); if (!v) return;
        v.innerHTML = shell('<div class="ad-empty">Loading…</div>');
        if (!(await check())) { v.innerHTML = '<div class="ad-wrap"><div class="ad-empty">This area is only for the admin account.</div></div>'; return; }
        try { const d = await loaders[tab](); cache[tab] = d; v.innerHTML = shell(view[tab](d)); } catch (e) { v.innerHTML = shell(`<div class="ad-note bad">${esc(e.message)}<br><small>If this says a function does not exist, run the latest supabase/schema.sql in the Supabase SQL editor.</small></div>`); }
    }
    async function act(fn, args, msg) { if (busy) return; busy = true; try { await rpc(fn, args); toast(msg || 'Done'); await render(); } catch (e) { alert(e.message); } finally { busy = false; } }
    window.ADMIN = {
        open: async () => { if (!(await check())) { alert('This area is only for the admin account.'); return; } viewEl(); switchView('admin'); render(); },
        tab: t => { tab = t; q = ''; render(); }, reload: () => render(), search: v => { q = v; render(); },
        reset: async email => { if (!confirm('Send a password-reset link to ' + email + '?')) return; try { const { error } = await sb().auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname }); if (error) throw error; toast('Reset link sent to ' + email); } catch (e) { alert(e.message); } },
        copy: e => { (navigator.clipboard ? navigator.clipboard.writeText(e) : Promise.reject()).then(() => toast('Copied'), () => prompt('Email:', e)); },
        block: (id, on) => { const r = on ? prompt('Block this account? Optional reason (they will be signed out and cannot sign in):', '') : ''; if (on && r === null) return; if (!on && !confirm('Unblock this account?')) return; act('admin_set_block', { p_user: id, p_block: on, p_reason: r || null }, on ? 'Account blocked' : 'Account unblocked'); },
        delUser: (id, email) => { if ((prompt('This permanently deletes the account and its cloud data (played games stay, names only).\nType the email to confirm:\n' + email) || '').trim().toLowerCase() !== email.toLowerCase()) return; act('admin_delete_user', { p_user: id }, 'Account deleted'); },
        disband: (id, name) => { if ((prompt('Type the league name to disband it for everyone:\n' + name) || '').trim() !== name) return; act('admin_disband_league', { p_league: id }, 'League disbanded'); },
        rmMember: (l, u, n) => { if (confirm('Remove ' + n + ' from the league?')) act('admin_remove_member', { p_league: l, p_user: u }, 'Removed'); },
        delGame: id => { if (confirm('Delete this game from the league?')) act('admin_delete_game', { p_game: id }, 'Game deleted'); },
        delLive: c => { if (confirm('Delete this live game?')) act('admin_delete_live', { p_code: c }, 'Live game deleted'); },
        delRoster: (id, n) => { if (confirm('Delete the cloud roster "' + n + '"?')) act('admin_delete_roster', { p_id: id }, 'Roster deleted'); },
        delTournament: (id, n) => { if (confirm('Delete the tournament "' + n + '"?')) act('admin_delete_tournament', { p_id: id }, 'Tournament deleted'); },
        rfilter: k => { rstat = k; render(); },
        reportSet: (id, s) => act('admin_report_set', { p_id: id, p_status: s }, 'Marked ' + s),
        reportDel: id => { if (confirm('Delete this report?')) act('admin_report_delete', { p_id: id }, 'Report deleted'); },
        reportImg: async (id, btn) => { btn.disabled = true; try { const img = await rpc('admin_report_image', { p_id: id }); const w = window.open(); if (w) { w.document.title = 'Screenshot'; w.document.body.style.cssText = 'margin:0;background:#111;display:flex;justify-content:center'; w.document.body.innerHTML = '<img style="max-width:100%;height:auto" src="' + img + '">'; } else { alert('Allow pop-ups to see the screenshot.'); } } catch (e) { alert(e.message); } finally { btn.disabled = false; } },
        check
    };
    // show the menu button only for the admin (the server decides; this is just the button)
    function boot() {
        const c = sb(); if (!c) return; check();
        c.auth.onAuthStateChange(() => setTimeout(check, 50));
        if (location.hash === '#admin') setTimeout(ADMIN.open, 100);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 600)); else setTimeout(boot, 600);
})();
