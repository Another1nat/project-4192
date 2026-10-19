/* Active-game tracker (11th ed). Loaded AFTER app.js and overrides its older, duplicated
   active-game functions. Uses window.MISSION_TEXT (scraped from gdmissions.app, see
   scrape_mission_text.py / build_mission_text.py). */
(function () {
    const PRI_CAP = 15, SEC_CAP = 12, SEC_MISSION_CAP = 3,   // 4192: primary max 15, Tactical cards max 12 per game, 3 per card
          SAVE_KEY = 'gdm_current_game';
    const POOL = window.GDM_DATA && GDM_DATA.secondaryMissions ? GDM_DATA.secondaryMissions : [];
    const MT = () => window.MISSION_TEXT || { primary: {}, secondary: {} };
    const P = n => (Number(n) === 1 ? trackerState.p1 : trackerState.p2);
    const COL = n => (n === 1 ? '#4db8ff' : '#ff4d4d');
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const key = s => String(s).toLowerCase();
    const cap = s => key(s).replace(/\b\w/g, c => c.toUpperCase());
    // ---------- language (EN / ES) — mission names + card images stay English, rules text is translated ----------
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const ES = () => window.MISSION_ES || {};
    const tr = s => (lang() === 'es' && ES()[s]) || s;
    const UI = {
        tap: ['TAP WHAT YOU SCORED', 'TOCA LO QUE ANOTASTE'], manual: ['MANUAL ADJUST', 'AJUSTE MANUAL'], vp: ['VP', 'PV'],
        score: ['SCORE', 'ANOTAR'], notyet: ['NOT YET', 'AÚN NO'], scored: ['SCORED', 'ANOTADO'], any: ['ANY ROUND', 'CUALQUIER RONDA'],
        deck: ['TO DECK', 'AL MAZO'], full: ['FULL CARD', 'CARTA'], undo: ['UNDO SCORE', 'DESHACER'], held: ['HELD', 'EN MANO'],
        done: ['COMPLETED', 'COMPLETADA'], nocard: ['NO CARD TEXT AVAILABLE — ENTER VP MANUALLY', 'SIN TEXTO DE CARTA — INGRESA LOS PV A MANO'],
        pri: ['PRIMARY MISSION', 'MISIÓN PRIMARIA'], sec: ['SECONDARY MISSION', 'MISIÓN SECUNDARIA'],
        att: ['ATTACKER', 'ATACANTE'], def: ['DEFENDER', 'DEFENSOR'], scoredr: ['SCORED THIS ROUND', 'ANOTADO ESTA RONDA']
    };
    const u = k => UI[k][lang() === 'es' ? 1 : 0];
    const S = (en, es) => lang() === 'es' ? es : en;

    // ---------- persistence ----------
    const GAMES_KEY = 'gdm_games';           // { id: {id, updated, state} }  — every in-progress game
    const games = () => { try { return JSON.parse(localStorage.getItem(GAMES_KEY) || '{}'); } catch (e) { return {}; } };
    const putGames = o => { try { localStorage.setItem(GAMES_KEY, JSON.stringify(o)); } catch (e) {} };
    function save() {
        if (trackerState.step !== 8) return;
        if (!trackerState.gameId) trackerState.gameId = Date.now().toString(36);
        const o = games(); o[trackerState.gameId] = { id: trackerState.gameId, updated: Date.now(), state: JSON.parse(JSON.stringify(trackerState)) };
        putGames(o);
        try { localStorage.setItem(SAVE_KEY, trackerState.gameId); } catch (e) {}   // SAVE_KEY = id of the game open right now
        if (window.LEAGUE && window.LEAGUE.onGameSaved) window.LEAGUE.onGameSaved();
        if (window.BROADCAST && typeof window.BROADCAST.pushStateSoon === 'function') window.BROADCAST.pushStateSoon();
        document.dispatchEvent(new Event('bl:saved'));
    }
    window.saveCurrentGame = save;

    function ensure(p) {
        p.pri = p.pri || 0; p.sec = p.sec || 0;
        p.cp = typeof p.cp === 'number' ? Math.max(0, p.cp) : 1;
        p.detachments = p.detachments || [];
        p.secondaries = p.secondaries || []; p.discarded = p.discarded || []; p.log = p.log || []; p.removed = p.removed || [];
        ensureIds(p);
        // the score log is the truth: totals are rebuilt from it, so an undo or a merge can never leave them out of step
        if (p.fromLog || p.log.some(e => e.vp > 0)) { p.fromLog = true; recalc(p); }
    }
    const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    // entries saved before ids existed get one from their content, so every phone gives the same entry the same id
    function ensureIds(p) {
        const seen = {};
        p.log.forEach(e => { if (e.id) return; const sig = `${e.round}|${e.type}|${key(e.mission || '')}|${e.vp}`; seen[sig] = (seen[sig] || 0) + 1; e.id = 'L' + sig.replace(/[^a-z0-9|]/g, '') + '#' + seen[sig]; });
    }
    function recalc(p) {
        const sum = t => p.log.filter(e => e.type === t && e.vp > 0).reduce((s, e) => s + e.vp, 0);
        p.pri = Math.min(PRI_CAP, sum('primary')); p.sec = Math.min(SEC_CAP, sum('secondary'));
    }
    const isPicker = p => p.deck === 'FIXED' || p.deck === 'MANUAL';
    // when each shared value last changed here (round, cp1/cp2, hand1/hand2): live copies keep the newest of each, so a phone
    // that was asleep cannot send back an old CP or round over someone else's newer change
    function touch(k) { trackerState.t = trackerState.t || {}; trackerState.t[k] = Math.max(Date.now(), (trackerState.t[k] || 0) + 1); }
    window.GDM_touch = touch;   // the player chooses cards instead of drawing at random

    let hubMode = true, agTab = 1, internalNav = false;
    const SAVE_KEYX = SAVE_KEY;
    // ---------- start / render ----------
    window.startGameTracker = function () {
        clearTimeout(firstTurnTimer); let swapped = false;
        document.getElementById('view-tracker').style.display = 'none';
        document.getElementById('view-active-game').style.display = 'block';
        
        // Swap P1 and P2 if P2 won the first turn roll, so the first-turn player is always on the left
        if (trackerState.firstTurn === 2) {
            const tempP = trackerState.p1;
            trackerState.p1 = trackerState.p2;
            trackerState.p2 = tempP;
            
            const tempM = trackerState.primaryMissionP1;
            trackerState.primaryMissionP1 = trackerState.primaryMissionP2;
            trackerState.primaryMissionP2 = tempM;
            
            trackerState.firstTurn = 1; // Now P1 is the first turn player
            swapped = true;
        }

        trackerState.round = 1; trackerState.step = 8; trackerState.started = new Date().toISOString(); trackerState.gameId = Date.now().toString(36); hubMode = false; agTab = 1;
        [1, 2].forEach(n => { const p = P(n); p.pri = 0; p.sec = 0; p.cp = 1; p.secondaries = []; p.discarded = []; p.log = []; p.removed = []; p.fromLog = true; }); trackerState.t = {};
        // make sure both primaries exist (matrix lookup per player)
        if (!trackerState.primaryMissionP1 || !trackerState.primaryMissionP2) generatePrimaryMission();
        renderGame();
        if (trackerState.leagueId && window.LEAGUE && window.LEAGUE.publishNow) window.LEAGUE.publishNow();   // league games go live for the whole league
        if (trackerState.tournamentMatch && window.LSYNC && !LSYNC.active()) LSYNC.host();   // tournament games share themselves: saved 90 days, everyone can follow
        if (swapped && window.toast) toast(S(`${(trackerState.p1.name || 'PLAYER 2').toUpperCase()} goes first, so they are now on the left (blue).`, `${(trackerState.p1.name || 'JUGADOR 2').toUpperCase()} empieza, así que ahora va a la izquierda (azul).`));
    };
    let firstTurnTimer = null;

    function checkSpectator() {
        if (window.isSpectatorMode) {
            if (typeof window.toast === 'function') window.toast("Spectator mode (Read-only)");
            return true;
        }
        return false;
    }

    window.changeGameRound = function (dir) {
        if (checkSpectator()) return;
        trackerState.round = Math.max(1, Math.min(4, trackerState.round + dir));   // 4 battle rounds touch('round');
        if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`Battle round changed to ${trackerState.round}`);
        renderGame();
    };

    window.updateActiveGameUI = renderGame;

    const normFaction = f => String(f || '').replace(/’/g, "'");
    function factionBanner(f) {
        const hit = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => x.name === normFaction(f));
        if (hit) return hit.banner;
        const alias = {}[f];
        const al = alias && (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(x => x.name === alias);
        return al ? al.banner : 'assets/banners/0.jpg';
    }

    window.editPlayer = function(n) {
        if (checkSpectator()) return;
        const p = P(n);
        let defName = p.name;
        if ((defName === 'PLAYER ' + n || !defName) && window.LEAGUE_CORE && typeof window.LEAGUE_CORE.user === 'function') {
            const u = window.LEAGUE_CORE.user();
            if (u && u.user_metadata && u.user_metadata.display_name) {
                defName = u.user_metadata.display_name;
            }
        }
        const newName = prompt(S(`Enter name for Player ${n}:`, `Ingresa el nombre del Jugador ${n}:`), defName);
        if (newName && newName.trim()) {
            p.name = newName.trim().toUpperCase();
            if (window.LSYNC && typeof window.LSYNC.logAction === 'function') {
                window.LSYNC.logAction(`Player ${n} changed name to ${p.name}`);
            }
            if (confirm(S('Do you want to change your faction as well?', '¿Quieres cambiar tu facción también?'))) {
                if (typeof openFactionModal === 'function') openFactionModal(n);
            } else {
                renderGame();
            }
        }
    };

    window.showTab = function (n) {
        agTab = n;
        [1, 2].forEach(i => {
            const c = document.getElementById(`ag-card-${i}`), t = document.getElementById(`ag-tab-${i}`);
            if (c) c.classList.toggle('ag-card-off', i !== n);
            if (t) { t.style.background = i === n ? (i === 1 ? '#4384ff' : '#f44336') : 'transparent'; t.style.color = i === n ? '#fff' : '#9aa7b8'; }
        });
    };
    function setText(id, v) { const e = document.getElementById(id); if (e) e.innerText = v; }

    function renderGame() {
        document.getElementById('ag-round-display').innerText = trackerState.round;
        for (let n = 1; n <= 2; n++) {
            const p = P(n); ensure(p);
            const total = p.pri + p.sec + (p.paint ? 10 : 0);
            const name = (p.name || 'PLAYER ' + n).toUpperCase();
            setText(`ag-p${n}-name`, name); setText(`ag-p${n}-card-name`, name);
            [`ag-p${n}-name`, `ag-p${n}-card-name`].forEach(id => { const el = document.getElementById(id); if (!el) return;
                const t = document.createElement('span'); t.className = 'ag-turn-chip'; t.textContent = n === 1 ? S('1ST TURN', '1.er TURNO') : S('2ND TURN', '2.º TURNO');
                t.style.cssText = 'display:inline-block; margin:0 6px; padding:1px 6px; border-radius:6px; font-size:.62rem; font-weight:800; letter-spacing:.04em; vertical-align:middle; background:' + (n === 1 ? 'rgba(250,204,21,.18); color:#facc15; border:1px solid rgba(250,204,21,.5)' : 'rgba(148,163,184,.15); color:#9aa7b8; border:1px solid rgba(148,163,184,.35)');
                if (n === 2 && id === `ag-p${n}-name`) el.prepend(t); else el.appendChild(t); });
            setText(`ag-p${n}-total`, total); setText(`ag-p${n}-card-total`, total);
            setText(`ag-p${n}-pri-txt`, `${p.pri}/${PRI_CAP}`); setText(`ag-p${n}-pri-score`, `${p.pri}/${PRI_CAP}`);
            setText(`ag-p${n}-sec-txt`, `${p.sec}/${SEC_CAP}`); setText(`ag-p${n}-sec-score`, `${p.sec}/${SEC_CAP}`);
            document.getElementById(`ag-p${n}-pri-bar`).style.width = Math.min(100, p.pri / PRI_CAP * 100) + '%';
            document.getElementById(`ag-p${n}-sec-bar`).style.width = Math.min(100, p.sec / SEC_CAP * 100) + '%';
            setText(`ag-p${n}-card-cp`, p.cp || 0);
            setText(`ag-p${n}-top-cp-val`, p.cp || 0);

            const fd = p.forceDisp || '';
            // faction thumbnail behind the name (generic home banner when no faction)
            const hdr = document.getElementById(`ag-p${n}-card-name`).parentElement.parentElement;
            hdr.style.backgroundImage = `linear-gradient(90deg, rgba(22,29,39,0.94) 25%, rgba(22,29,39,0.45)), url('${factionBanner(p.faction)}')`;
            hdr.style.backgroundSize = 'cover'; hdr.style.backgroundPosition = 'center';
            let fl = document.getElementById(`ag-p${n}-faction-line`);
            if (!fl) { fl = document.createElement('div'); fl.id = `ag-p${n}-faction-line`; fl.style.cssText = 'color:#cfd8e3; font-size:0.75rem; margin-bottom:6px; text-shadow:0 1px 2px #000;'; document.getElementById(`ag-p${n}-card-name`).after(fl); }
            fl.innerText = p.faction || S('No faction', 'Sin facción');
            const tabBtn = document.getElementById(`ag-tab-${n}`);
            if (tabBtn) tabBtn.innerText = name;
            const badge = document.getElementById(`ag-p${n}-badge`);
            badge.innerText = fd; badge.style.background = getFDColor(fd);
            setText(`ag-p${n}-deck-type`, p.deck || 'TACTICAL');

            // primary: green once scored this round
            const pm = n === 1 ? trackerState.primaryMissionP1 : trackerState.primaryMissionP2;
            const donePri = entries(n, 'primary', pm, trackerState.round);
            const doneVp = donePri.reduce((s, e) => s + e.vp, 0);
            const box = document.getElementById(`ag-p${n}-pri-box`);
            box.style.borderColor = donePri.length ? '#2f9e5f' : getFDColor(fd);
            box.style.background = donePri.length ? 'rgba(47,158,95,0.18)' : '#161d27';
            box.removeAttribute('onclick'); box.onclick = () => openScoringTally(n, 'primary', pm);
            setText(`ag-p${n}-pri-name`, pm || '');
            const btn = document.getElementById(`ag-p${n}-pri-btn`);
            btn.innerHTML = donePri.length ? `<i class="fa-solid fa-check"></i> +${doneVp}` : `${u('score')} R${trackerState.round}`;
            btn.style.background = donePri.length ? '#2f9e5f' : getFDColor(fd);

            // secondaries: held + (green) completed this round
            const list = document.getElementById(`ag-p${n}-secondaries-list`);
            const completed = []; const seen = {};
            p.log.filter(e => e.type === 'secondary' && e.round === trackerState.round && e.vp > 0).forEach(e => {
                seen[key(e.mission)] = (seen[key(e.mission)] || 0) + e.vp; if (!completed.includes(e.mission)) completed.push(e.mission);
            });
            let html = p.secondaries.map(s => seen[key(s.name)] ? `
                <div data-sec="${esc(s.name)}" class="ag-sec" style="background:rgba(47,158,95,0.18); border:1px solid #2f9e5f; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; min-height:44px;">
                    <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${esc(s.name)}</div>
                    <div style="color:#5be59a; font-size:0.75rem; font-weight:bold; letter-spacing:1px;"><i class="fa-solid fa-check"></i> +${seen[key(s.name)]} ${u('vp')}</div>
                </div>` : `
                <div data-sec="${esc(s.name)}" class="ag-sec" style="background:#161d27; border:1px solid ${COL(n)}; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; min-height:44px;">
                    <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${esc(s.name)}</div>
                    <div style="color:${COL(n)}; font-size:0.7rem; font-weight:bold; letter-spacing:1px;">${p.deck === 'FIXED' ? S('FIXED', 'FIJA') : `${u('held')} &middot; R${s.round}`}</div>
                </div>`).join('');
            html += completed.filter(m => !p.secondaries.some(s => key(s.name) === key(m))).map(m => `
                <div data-sec="${esc(m)}" class="ag-sec" style="background:rgba(47,158,95,0.18); border:1px solid #2f9e5f; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer; min-height:44px;">
                    <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${esc(m)}</div>
                    <div style="color:#5be59a; font-size:0.75rem; font-weight:bold; letter-spacing:1px;"><i class="fa-solid fa-check"></i> +${seen[key(m)]} ${u('vp')}</div>
                </div>`).join('');
            list.innerHTML = html || '<div style="color:#888; font-size:0.9rem; text-align:center; padding:10px 0;">No active secondaries</div>';
            list.querySelectorAll('.ag-sec').forEach(el => el.onclick = () => openScoringTally(n, 'secondary', el.dataset.sec));
            const left = pickable(p).length, dc = document.getElementById(`ag-p${n}-deck-count`), drawBtn = dc && dc.parentElement;
            if (drawBtn) drawBtn.innerHTML = p.deck === 'FIXED' ? `+ ${S('CHOOSE FIXED SECONDARY', 'ELEGIR SECUNDARIA FIJA')} (<span id="ag-p${n}-deck-count">${p.secondaries.length}/${FIXED_MAX}</span>)`
                : p.deck === 'MANUAL' ? `+ ${S('CHOOSE SECONDARY', 'ELEGIR SECUNDARIA')} (<span id="ag-p${n}-deck-count">${left}</span>)`
                : `+ ${S('DRAW SECONDARY', 'ROBAR SECUNDARIA')} (<span id="ag-p${n}-deck-count">${left}</span>)`;
            renderHistoryBtn(n);
        }
        setText('btn-layout-map-txt', S('Map', 'Mapa'));
        if (window.LSYNC && window.LSYNC.updateBtn) window.LSYNC.updateBtn();
        showTab(agTab); save();
    }
    window.renderGame = renderGame;

    window.changeCp = function(n, delta) {
        if (checkSpectator()) return;
        n = Number(n) || 1;
        delta = Number(delta) || 0;
        const p = P(n); ensure(p);
        p.cp = Math.max(0, (typeof p.cp === 'number' ? p.cp : 1) + delta); touch('cp' + n);
        renderGame(); save();
        if (window.TR && typeof window.TR.render === 'function' && window.TR._n === n) {
            try { window.TR.render(n); } catch(e) {}
        }
        if (window.BROADCAST && typeof window.BROADCAST.pushStateSoon === 'function') {
            window.BROADCAST.pushStateSoon();
        }
    };
    window.GDM = window.GDM || {};
    window.GDM.changeCp = window.changeCp;

    // ---------- secondaries ----------
    // missions that have a FIXED side on their card (the only ones a Fixed deck may hold)
    const fixedPool = () => { const seen = {}; Object.keys(MT().secondary || {}).forEach(k => { const c = MT().secondary[k]; if (c && c.sections && c.sections.some(x => /FIXED/i.test(x.heading))) seen[key(k.split('|')[0])] = k.split('|')[0]; }); return Object.values(seen); };
    const FIXED_MAX = 2;
    function pickable(p) {
        return (p.deck === 'FIXED' ? fixedPool() : POOL).filter(x => !p.secondaries.some(s => key(s.name) === key(x)) && !p.discarded.includes(key(x)));
    }
    function openSecondaryPicker(n) {
        const p = P(n), fixed = p.deck === 'FIXED';
        if (fixed && p.secondaries.length >= FIXED_MAX) { if (window.toast) toast(S('A Fixed deck holds two secondaries. Discard one first.', 'Un mazo Fijo tiene dos secundarias. Descarta una primero.')); return; }
        const list = pickable(p);
        overlay('ov-pick-sec', `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;"><h3 style="margin:0;">${fixed ? S('Choose a fixed secondary', 'Elige una secundaria fija') : S('Choose a secondary', 'Elige una secundaria')}</h3>${closeBtn('ov-pick-sec')}</div>
            ${fixed ? `<div style="color:#9aa7b8; font-size:.85rem; margin-bottom:10px;">${S('Fixed secondaries stay in your hand all game and can be scored every round.', 'Las secundarias fijas se quedan en tu mano toda la partida y se pueden anotar cada ronda.')} (${p.secondaries.length}/${FIXED_MAX})</div>` : ''}
            <div style="display:flex; flex-direction:column; gap:8px;">${list.map(x => `<button data-pick="${esc(x)}" style="min-height:48px; padding:10px 14px; text-align:left; background:#161d27; border:1px solid ${COL(n)}; border-radius:8px; color:#fff; font-weight:bold; font-size:1rem; text-transform:uppercase; cursor:pointer;">${esc(x)}</button>`).join('') || `<div style="color:#888; text-align:center; padding:12px;">${S('No secondaries left.', 'No quedan secundarias.')}</div>`}</div>`);
        document.querySelectorAll('#ov-pick-sec [data-pick]').forEach(b => b.onclick = () => {
            const name = b.dataset.pick.toUpperCase(); p.secondaries.push({ name, round: trackerState.round }); touch('hand' + n);
            if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`${p.name || 'P' + n} chose ${name}`);
            document.getElementById('ov-pick-sec').remove(); renderGame();
        });
    }

    window.drawSecondary = function (n) {
        if (checkSpectator()) return;
        const p = P(n); ensure(p);
        if (isPicker(p)) return openSecondaryPicker(n);
        const remaining = pickable(p);
        if (!remaining.length) return;
        const pick = remaining[Math.floor(Math.random() * remaining.length)];
        p.secondaries.push({ name: pick.toUpperCase(), round: trackerState.round }); touch('hand' + n);
        if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`${p.name || 'P' + n} drew ${pick.toUpperCase()}`);
        renderGame();
    };

    // ---------- scoring modal ----------
    function roundRule(sec) {
        const h = sec.heading.toUpperCase();
        if (/END OF BATTLE/.test(h)) return { ok: r => r === 5, label: 'R5' };
        if (/FIFTH BATTLE ROUND/.test(h)) return { ok: r => r === 5, label: 'R5' };
        if (/FOURTH BATTLE ROUND ONWARDS/.test(h)) return { ok: r => r >= 4, label: 'R4+' };
        if (/THIRD BATTLE ROUND ONWARDS/.test(h)) return { ok: r => r >= 3, label: 'R3+' };
        if (/SECOND BATTLE ROUND ONWARDS/.test(h)) return { ok: r => r >= 2, label: 'R2+' };
        if (/SECOND TO FOURTH/.test(h)) return { ok: r => r >= 2 && r <= 4, label: 'R2-4' };
        if (/FIRST & SECOND/.test(h)) return { ok: r => r <= 2, label: 'R1-2' };
        if (/SECOND & THIRD/.test(h)) return { ok: r => r === 2 || r === 3, label: 'R2-3' };
        if (/FIRST BATTLE ROUND/.test(h)) return { ok: r => r === 1, label: 'R1' };
        return { ok: () => true, label: u('any') };
    }
    function deckOk(sec, deck) {
        const h = sec.heading.toUpperCase(), f = /FIXED/.test(h), t = /TACTICAL/.test(h);
        if (!f && !t) return true;
        return (deck === 'FIXED') ? f : t;
    }
    const entries = (n, type, mission, round) => P(n).log.filter(e => e.type === type && key(e.mission) === key(mission) && e.round === round && e.vp > 0);

    function getCard(type, name, role) {
        const t = MT(), find = (o, k) => { k = key(k); const h = Object.keys(o).find(x => key(x) === k); return h ? o[h] : null; };
        if (type === 'primary') return find(t.primary, name);
        return find(t.secondary, `${name}|${role}`) || find(t.secondary, `${name}|defender`);
    }

    window.openScoringTally = function (n, type, name) {
        if (checkSpectator()) return;
        const p = P(n); const role = (p.role || 'ATTACKER').toLowerCase();
        window.tallyState = { pNum: n, type, name, picked: {}, role, round: trackerState.round, manual: 0 };
        tallyState.card = getCard(type, name, role);
        tallyState.held = type === 'secondary' && p.secondaries.some(s => key(s.name) === key(name));
        tallyState.color = type === 'primary' ? getFDColor(p.forceDisp) : '#8c2a2a';
        tallyState.prev = entries(n, type, name, trackerState.round);   // already scored this round
        document.getElementById('modal-tally-container').style.borderColor = tallyState.color;
        document.getElementById('modal-tally-container').children[0].style.background = tallyState.color;
        document.getElementById('modal-tally-type').innerText =
            (type === 'primary' ? u('pri') : `${u('sec')} · ${role === 'attacker' ? u('att') : u('def')}`) + ` · ${(p.name || '').toUpperCase()} · R${trackerState.round}`;
        document.getElementById('modal-tally-title').innerText = name;
        document.getElementById('modal-tally').style.display = 'flex';
        renderTally();
    };

    // ids of the items in the same "A OR B" group as items[ii] (an item marked or is an alternative to the one above it)
    function orGroup(items, si, ii) {
        let a = ii; while (a > 0 && items[a].or) a--;
        let b = ii; while (b + 1 < items.length && items[b + 1].or) b++;
        const ids = []; for (let i = a; i <= b; i++) ids.push(`${si}_${i}`);
        return ids;
    }
    function prevCounts() {   // id -> VP-count already scored this round for this mission
        const c = {}; tallyState.prev.forEach(e => Object.entries(e.picked || {}).forEach(([id, k]) => c[id] = (c[id] || 0) + k)); return c;
    }

    function renderTally() {
        const ts = tallyState, body = document.getElementById('modal-tally-body-content'), isEs = lang() === 'es';
        body.setAttribute('data-view', 'tally');
        const done = prevCounts(), deck = (P(ts.pNum).deck || 'TACTICAL');
        let html = '';
        if (ts.prev.length) {
            const sum = ts.prev.reduce((s, e) => s + e.vp, 0);
            html += `<div style="background:rgba(47,158,95,0.18); border:1px solid #2f9e5f; border-radius:8px; padding:10px 12px; margin-bottom:12px; font-weight:bold; color:#1f6f43;"><i class="fa-solid fa-check"></i> ${u('scoredr')}: +${sum} ${u('vp')}</div>`;
        }
        if (!ts.card) {
            html += `<div style="color:#888; font-size:0.8rem; font-weight:bold; letter-spacing:2px; margin-bottom:12px;">${u('nocard')}</div>`;
        } else {
            if (ts.card.setup) html += `<div style="font-size:0.85rem; background:#fff; border:1px solid #ccc; border-radius:8px; padding:12px; margin-bottom:12px;">${esc(tr(ts.card.setup))}</div>`;
            html += `<div style="font-size:0.8rem; font-weight:bold; letter-spacing:2px; margin-bottom:10px; color:#888;">${u('tap')}</div>`;
            ts.card.sections.forEach((sec, si) => {
                if (!deckOk(sec, deck)) return;
                const rule = roundRule(sec), ok = rule.ok(ts.round);
                html += `<div style="background:#fff; border:1px solid #ccc; border-radius:8px; overflow:hidden; margin-bottom:14px; opacity:${ok ? 1 : 0.45};">
                    <div style="background:#1a232f; color:#fff; padding:6px 15px; font-weight:bold; display:flex; justify-content:space-between; gap:8px; font-size:0.78rem;">
                        <span>${esc(tr(sec.heading))}</span><span style="background:#fff; color:#1a232f; padding:0 6px; border-radius:2px; white-space:nowrap;">${rule.label}${ok ? '' : ' · ' + u('notyet')}</span></div>`;
                if (sec.timing) html += `<div style="padding:6px 15px; font-size:0.75rem; color:#666; border-bottom:1px solid #eee;">${esc(tr(sec.timing))}</div>`;
                sec.items.forEach((it, ii) => {
                    const id = `${si}_${ii}`, cnt = ts.picked[id] || 0, prior = done[id] || 0;
                    const groupDone = !it.each && orGroup(sec.items, si, ii).some(g => g !== id && done[g] > 0);   // the other option of this OR was already scored
                    const locked = (prior > 0 || groupDone) && !it.each, on = cnt > 0 || prior > 0, c = prior ? '#2f9e5f' : groupDone ? '#9aa7b8' : ts.color;
                    html += `<div class="tally-item" data-id="${id}" data-ok="${ok && !locked ? 1 : 0}" style="padding:12px 15px; border-bottom:1px solid #eee; display:flex; align-items:center; gap:12px; cursor:${ok && !locked ? 'pointer' : 'default'}; min-height:44px; background:${prior && locked ? 'rgba(47,158,95,0.12)' : '#fff'}; opacity:${groupDone ? 0.5 : 1};">
                        <div style="background:${c}; color:#fff; font-weight:bold; padding:8px; border-radius:8px; min-width:54px; text-align:center;">${it.plus ? '+' : ''}${it.vp}<span style="font-size:0.75rem; margin-left:2px;">${u('vp')}</span></div>
                        <div style="flex:1; font-size:0.85rem;">${it.or ? '<b style="color:#888">OR · </b>' : ''}${esc(tr(it.text))}</div>
                        ${it.each ? `<div style="display:flex; align-items:center; gap:4px; flex:none;">
                            ${prior ? `<span style="color:#2f9e5f; font-weight:bold; font-size:0.8rem;"><i class="fa-solid fa-check"></i>${prior}</span>` : ''}
                            <button class="each-dec" data-id="${id}" ${ok ? '' : 'disabled'} style="width:34px; height:34px; border-radius:50%; border:1px solid ${c}; background:transparent; color:${c}; font-size:1.1rem; cursor:pointer; padding:0;">-</button>
                            <b style="min-width:20px; text-align:center; font-size:1.1rem; color:${c};">${cnt}</b>
                            <button class="each-inc" data-id="${id}" ${ok ? '' : 'disabled'} style="width:34px; height:34px; border-radius:50%; border:none; background:${c}; color:#fff; font-size:1.1rem; cursor:pointer; padding:0;">+</button></div>`
                        : `<div style="min-width:28px; height:28px; padding:0 4px; border:2px solid ${on || prior ? c : '#ccc'}; border-radius:14px; display:flex; align-items:center; justify-content:center; flex:none; color:${c}; font-weight:bold;">${prior && locked ? '<i class="fa-solid fa-check"></i>' : (cnt ? `<div style="width:14px; height:14px; background:${c}; border-radius:50%;"></div>` : '')}</div>`}
                    </div>`;
                });
                (sec.notes || []).forEach(nt => { html += `<div style="padding:8px 15px; font-size:0.78rem; color:#555; border-top:1px dashed #ddd;">${esc(tr(nt))}</div>`; });
                html += '</div>';
            });
            (ts.card.actions || []).forEach(a => { html += `<div style="font-size:0.78rem; color:#444; background:#efe7d3; border-radius:8px; padding:10px 12px; margin-bottom:10px; white-space:pre-line;">${esc(tr(a))}</div>`; });
        }
        html += `<div style="display:flex; align-items:center; justify-content:center; gap:16px; margin:8px 0;">
            <span style="color:#888; font-size:0.75rem; font-weight:bold; letter-spacing:1px;">${u('manual')}</span>
            <button id="tally-minus" style="width:44px; height:44px; border-radius:50%; border:1px solid #4a5b6c; background:transparent; font-size:1.3rem; cursor:pointer;">-</button>
            <span style="font-size:1.4rem; font-weight:bold; min-width:30px; text-align:center;">${ts.manual || 0}</span>
            <button id="tally-plus" style="width:44px; height:44px; border-radius:50%; border:none; background:${ts.color}; color:#fff; font-size:1.3rem; cursor:pointer;">+</button></div>`;
        body.innerHTML = html;
        body.querySelectorAll('.tally-item').forEach(el => el.onclick = () => {
            if (el.dataset.ok !== '1') return;
            const [si, ii] = el.dataset.id.split('_').map(Number), items = ts.card.sections[si].items, it = items[ii], cur = ts.picked[el.dataset.id] || 0;
            ts.picked[el.dataset.id] = it.each ? cur + 1 : (cur ? 0 : 1);
            // "A OR B" options exclude each other; separate lines (e.g. "2 or more" and "more than your opponent") still add up
            if (!it.each && ts.picked[el.dataset.id]) orGroup(items, si, ii).forEach(g => { if (g !== el.dataset.id && !items[+g.split('_')[1]].each) delete ts.picked[g]; });
            renderTally();
        });
        body.querySelectorAll('.tally-item[data-id]').forEach(el => { // right-click / long-press not needed: double tap resets counters
            el.ondblclick = () => { if (el.dataset.ok === '1') { delete ts.picked[el.dataset.id]; renderTally(); } };
        });
        body.querySelectorAll('.each-inc,.each-dec').forEach(bt => bt.onclick = e => {
            e.stopPropagation(); const id = bt.dataset.id, d = bt.classList.contains('each-inc') ? 1 : -1;
            ts.picked[id] = Math.max(0, (ts.picked[id] || 0) + d); renderTally();
        });
        document.getElementById('tally-minus').onclick = () => { ts.manual = (ts.manual || 0) - 1; renderTally(); };
        document.getElementById('tally-plus').onclick = () => { ts.manual = (ts.manual || 0) + 1; renderTally(); };

        // footer: deck/trash only for held secondaries; undo when something was scored this round
        const show = (id, on) => { const e = document.getElementById(id); if (e) e.style.display = on ? '' : 'none'; };
        show('btn-tally-deck', ts.type === 'secondary' && ts.held); show('btn-tally-trash', ts.type === 'secondary' && ts.held);
        document.getElementById('btn-tally-deck').innerHTML = `<i class="fa-solid fa-undo"></i> ${u('deck')}`;
        document.getElementById('btn-tally-full').innerHTML = `<i class="fa-solid fa-eye"></i> ${u('full')}`;
        const undo = document.getElementById('btn-tally-undo');
        undo.style.display = ts.prev.length ? '' : 'none';
        undo.innerHTML = `<i class="fa-solid fa-rotate-left"></i> ${u('undo')} (-${ts.prev.reduce((s, e) => s + e.vp, 0)})`;
        const vp = tallyTotal(), btn = document.getElementById('btn-tally-score');
        const raw = rawTotal(); btn.innerText = `${u('score')} ${vp} ${u('vp')}` + (ts.type === 'secondary' && raw > vp ? ` (MAX ${SEC_MISSION_CAP})` : ''); btn.style.background = vp > 0 ? ts.color : '#2a3546';
    }

    function rawTotal() {
        const ts = tallyState; let vp = ts.manual || 0;
        if (ts.card) ts.card.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { vp += it.vp * (ts.picked[`${si}_${ii}`] || 0); }));
        return Math.max(0, vp);
    }
    function tallyTotal() {
        const ts = tallyState; let vp = ts.manual || 0;
        if (ts.card) ts.card.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { vp += it.vp * (ts.picked[`${si}_${ii}`] || 0); }));
        vp = Math.max(0, vp);
        return ts.type === 'secondary' ? Math.min(SEC_MISSION_CAP, vp) : vp;   // a Tactical card can never score more than 3 VP
    }

    window.submitTallyScore = function () {
        if (checkSpectator()) return;
        const ts = tallyState, p = P(ts.pNum); ensure(p);
        const vp = tallyTotal(), what = [];
        if (ts.card) ts.card.sections.forEach((sec, si) => sec.items.forEach((it, ii) => { const k = ts.picked[`${si}_${ii}`]; if (k) what.push(`${it.vp} VP${k > 1 ? ' x' + k : ''}: ${it.text}`); }));
        if (ts.manual) what.push(`manual ${ts.manual > 0 ? '+' : ''}${ts.manual}`);
        let actualVp = vp;
        if (ts.type === 'primary' && actualVp > 0) {
            let roundPriScored = 0;
            p.log.forEach(e => {
                if (e.round === trackerState.round && e.type === 'primary') roundPriScored += e.vp;
            });
            const limit = trackerState.round === 5 ? 25 : 15;
            const allowed = Math.max(0, limit - roundPriScored);
            if (actualVp > allowed) {
                if (allowed === 0 && vp > 0) {
                    if (typeof window.toast === 'function') window.toast(`Primary VP capped at ${limit} per round.`);
                    document.getElementById('modal-tally').style.display = 'none';
                    return;
                }
                actualVp = allowed;
                if (typeof window.toast === 'function') window.toast(`Primary VP capped at ${limit} this round.`);
            }
        }

        // the game caps (50 primary / 40 secondary): log only what really counts, so removing it later takes off the right amount
        if (actualVp > 0) {
            const room = ts.type === 'primary' ? PRI_CAP - p.pri : SEC_CAP - p.sec;
            if (actualVp > room) { actualVp = Math.max(0, room); if (typeof window.toast === 'function') window.toast(ts.type === 'primary' ? S(`Primary is capped at ${PRI_CAP} VP.`, `La primaria tiene un máximo de ${PRI_CAP} PV.`) : S(`Secondaries are capped at ${SEC_CAP} VP.`, `Las secundarias tienen un máximo de ${SEC_CAP} PV.`)); }
        }
        if (actualVp > 0) {
            if (ts.type === 'secondary' && p.deck !== 'FIXED') {   // tactical cards are spent; fixed cards stay all game
                p.secondaries = p.secondaries.filter(s => key(s.name) !== key(ts.name));
                if (!p.discarded.includes(key(ts.name))) p.discarded.push(key(ts.name));
                touch('hand' + ts.pNum);
            }
            p.log.push({ id: newId(), round: trackerState.round, type: ts.type, mission: ts.name, vp: actualVp, picked: Object.assign({}, ts.picked), detail: what });
            p.fromLog = true; recalc(p);
            if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`${p.name || 'P' + ts.pNum} scored ${actualVp} VP on ${ts.name}`);
        }
        document.getElementById('modal-tally').style.display = 'none';
        renderGame();
    };

    window.undoTallyScore = function () {
        if (checkSpectator()) return;
        const ts = tallyState, ids = entries(ts.pNum, ts.type, ts.name, ts.round).map(e => e.id);
        document.getElementById('modal-tally').style.display = 'none';
        removeScores(ts.pNum, ids);
    };

    // take scores off by id (undo, or the score history); a secondary removed in the round it was scored goes back into the hand
    function removeScores(n, ids) {
        const p = P(n); ensure(p);
        const gone = p.log.filter(e => ids.includes(e.id) && e.vp > 0); if (!gone.length) { renderGame(); return 0; }
        const sum = gone.reduce((s, e) => s + e.vp, 0);
        p.log = p.log.filter(e => !ids.includes(e.id));
        p.removed = p.removed.concat(gone.map(e => e.id)).slice(-500);   // so another phone's copy cannot bring them back
        gone.filter(e => e.type === 'secondary' && e.round === trackerState.round).forEach(e => {
            if (p.log.some(x => x.type === 'secondary' && x.vp > 0 && key(x.mission) === key(e.mission))) return;
            p.discarded = p.discarded.filter(x => x !== key(e.mission));
            if (!p.secondaries.some(s => key(s.name) === key(e.mission))) p.secondaries.push({ name: String(e.mission).toUpperCase(), round: trackerState.round });
            touch('hand' + n);
        });
        p.fromLog = true; recalc(p);
        if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`${p.name || 'P' + n} removed ${sum} VP (${[...new Set(gone.map(e => e.mission))].join(', ')})`);
        renderGame();
        return sum;
    }
    window.GDM_removeScores = removeScores;

    // ---------- score history: every score of the game, any round, each one removable ----------
    function renderHistoryBtn(n) {
        const dc = document.getElementById(`ag-p${n}-deck-count`), drawBtn = dc && dc.closest('button'); if (!drawBtn) return;
        let b = document.getElementById(`ag-p${n}-hist-btn`);
        if (!b) { b = document.createElement('button'); b.id = `ag-p${n}-hist-btn`; b.type = 'button'; b.onclick = () => openScoreHistory(n); drawBtn.after(b); }
        const p = P(n), cnt = p.log.filter(e => e.vp > 0).length;
        b.style.cssText = 'width:100%; margin-top:10px; min-height:48px; padding:10px 14px; background:transparent; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-weight:bold; font-size:.92rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;';
        b.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> ${S('Score history', 'Historial de puntos')} <span style="color:#8c99b0; font-weight:600;">(${cnt})</span>`;
    }
    function openScoreHistory(n) {
        const p = P(n); ensure(p);
        const ro = !!window.isSpectatorMode;
        let body = '';
        for (let r = 1; r <= 5; r++) {
            const list = p.log.filter(e => e.round === r && e.vp > 0); if (!list.length) continue;
            const sum = list.reduce((s, e) => s + e.vp, 0);
            body += `<div style="color:#9aa7b8; font-size:.75rem; font-weight:bold; letter-spacing:1px; margin:14px 0 6px; display:flex; justify-content:space-between;"><span>${S('ROUND', 'RONDA')} ${r}</span><span>+${sum} ${u('vp')}</span></div>`;
            body += list.map(e => `<div style="display:flex; align-items:center; gap:10px; background:#161d27; border:1px solid #2a3546; border-radius:8px; padding:8px 8px 8px 12px; margin-bottom:6px;">
                <span style="flex:none; font-size:.66rem; font-weight:800; letter-spacing:.06em; padding:3px 6px; border-radius:4px; background:${e.type === 'primary' ? 'rgba(166,132,60,.25)' : 'rgba(67,132,255,.2)'}; color:${e.type === 'primary' ? '#e7c77a' : '#9cc0ff'};">${e.type === 'primary' ? S('PRI', 'PRI') : S('SEC', 'SEC')}</span>
                <span style="flex:1; min-width:0; font-weight:bold; text-transform:uppercase; font-size:.9rem; overflow:hidden; text-overflow:ellipsis;">${esc(e.mission || '')}</span>
                <b style="flex:none; color:#5be59a; font-size:1.05rem;">+${e.vp}</b>
                ${ro ? '' : `<button data-rm="${esc(e.id)}" aria-label="${S('Remove', 'Quitar')}" style="flex:none; width:44px; height:44px; border-radius:8px; border:1px solid #8c2a2a; background:rgba(140,42,42,.2); color:#ff8a80; font-size:1rem; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>`}</div>`).join('');
        }
        overlay('ov-score-history', `<div style="display:flex; justify-content:space-between; align-items:center; gap:10px;"><h3 style="margin:0; color:${COL(n)};">${esc((p.name || 'PLAYER ' + n).toUpperCase())}</h3>${closeBtn('ov-score-history')}</div>
            <div style="display:flex; gap:8px; margin-top:12px;">${[[S('Primary', 'Primaria'), `${p.pri}/${PRI_CAP}`], [S('Secondary', 'Secundaria'), `${p.sec}/${SEC_CAP}`], [S('Total', 'Total'), p.pri + p.sec + (p.paint ? 10 : 0)]].map(([l, v]) => `<div style="flex:1; background:#161d27; border:1px solid #2a3546; border-radius:8px; padding:8px; text-align:center;"><div style="color:#8c99b0; font-size:.68rem; font-weight:bold; letter-spacing:1px; text-transform:uppercase;">${l}</div><div style="font-size:1.25rem; font-weight:bold;">${v}</div></div>`).join('')}</div>
            ${body || `<div style="color:#888; text-align:center; padding:20px 0;">${S('Nothing scored yet.', 'Aún no hay puntos.')}</div>`}
            ${body && !ro ? `<div style="color:#6f7c8e; font-size:.76rem; margin-top:10px; line-height:1.45;">${S('Removing a secondary scored this round puts the card back in your hand.', 'Quitar una secundaria anotada en esta ronda la devuelve a tu mano.')}</div>` : ''}`);
        document.querySelectorAll('#ov-score-history [data-rm]').forEach(b => b.onclick = () => {
            const e = P(n).log.find(x => x.id === b.dataset.rm); if (!e) return openScoreHistory(n);
            if (!confirm(S(`Remove +${e.vp} VP (${e.mission}, round ${e.round})?`, `¿Quitar +${e.vp} PV (${e.mission}, ronda ${e.round})?`))) return;
            removeScores(n, [e.id]); openScoreHistory(n);
        });
    }
    window.openScoreHistory = openScoreHistory;

    window.setTallyVp = function (vp) { tallyState.manual = vp; renderTally(); };

    window.discardMission = function (dest) {
        const ts = tallyState, p = P(ts.pNum); ensure(p);
        if (ts.type === 'secondary' && ts.held) {
            p.secondaries = p.secondaries.filter(s => key(s.name) !== key(ts.name));
            if (dest === 'trash') p.discarded.push(key(ts.name));   // 'deck' returns it to the pool
            touch('hand' + ts.pNum);
            p.log.push({ round: trackerState.round, type: 'secondary', mission: ts.name, vp: 0, detail: [dest === 'trash' ? 'discarded' : 'returned to deck'] });
            if (window.LSYNC && typeof window.LSYNC.logAction === 'function') window.LSYNC.logAction(`${p.name || 'P' + ts.pNum} ${dest === 'trash' ? 'discarded' : 'returned'} ${ts.name}`);
        }
        document.getElementById('modal-tally').style.display = 'none';
        renderGame();
    };

    window.toggleFullCard = function () {
        const ts = tallyState, body = document.getElementById('modal-tally-body-content');
        if (body.getAttribute('data-view') === 'full') { renderTally(); return; }
        body.setAttribute('data-view', 'full');
        const f = key(ts.name).replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
        let path = ts.type === 'primary' ? `assets/primary/${f}.png` : `assets/secondary/${ts.role}/${f.replace('secure-no-mans-land', 'secure-no-man-s-land')}.png`;
        const back = path.replace('.png', '-back.png');
        body.innerHTML = `<div style="text-align:center; position:relative;">
            <img id="tally-full-card-img" src="${path}" data-front="${path}" data-back="${back}" style="max-width:100%; max-height:55vh; border-radius:8px;">
            <button id="tally-flip-btn" style="display:none; position:absolute; top:10px; right:10px; background:#a6843c; color:#fff; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-rotate"></i> FLIP</button></div>`;
        const t = new Image();
        t.onload = () => { const b = document.getElementById('tally-flip-btn'); if (b) { b.style.display = 'block'; b.onclick = () => { const i = document.getElementById('tally-full-card-img'); i.src = i.src.includes('-back.png') ? i.dataset.front : i.dataset.back; }; } };
        t.src = back;
    };

    // ---------- history + export ----------
    function matchRecord() {
        const a = trackerState.p1, b = trackerState.p2;
        const tot = p => p.pri + p.sec + (p.paint ? 10 : 0);
        return {
            date: new Date().toLocaleDateString(), started: trackerState.started, round: trackerState.round,
            p1: a.name, p1score: tot(a), p1pri: a.pri, p1sec: a.sec, p1cp: typeof a.cp === 'number' ? a.cp : 1, p1paint: !!a.paint, p1faction: a.faction, p1forceDisp: a.forceDisp, p1role: a.role, p1mission: trackerState.primaryMissionP1, p1log: a.log, p1held: a.secondaries, p1discarded: a.discarded,
            p2: b.name, p2score: tot(b), p2pri: b.pri, p2sec: b.sec, p2cp: typeof b.cp === 'number' ? b.cp : 1, p2paint: !!b.paint, p2faction: b.faction, p2forceDisp: b.forceDisp, p2role: b.role, p2mission: trackerState.primaryMissionP2, p2log: b.log, p2held: b.secondaries, p2discarded: b.discarded,
            mission: `${trackerState.primaryMissionP1} / ${trackerState.primaryMissionP2}`, leagueId: trackerState.leagueId || null, tournamentMatch: trackerState.tournamentMatch || null,
            liveP2: (trackerState.live && trackerState.live.p2) || null, liveSide: (trackerState.live && trackerState.live.role === 'p2') ? 2 : 1, shareCode: trackerState.shareCode || null
        };
    }
    function download(name, text, type) {
        const url = URL.createObjectURL(new Blob([text], { type }));
        const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
    }
    const hist = () => { try { return JSON.parse(localStorage.getItem('gdm_history') || '[]'); } catch (e) { return []; } };

    window.saveMatchToHistory = function () {
        if (window.LSYNC && LSYNC.finish) LSYNC.finish();   // a shared game is saved as finished: its link keeps showing the final result
        const h = hist(); h.unshift(matchRecord());
        localStorage.setItem('gdm_history', JSON.stringify(h));
        if (window.LEAGUE && window.LEAGUE.onGameFinished) window.LEAGUE.onGameFinished(h[0], trackerState.shareCode);
        removeGame(trackerState.gameId); const toLeague = h[0].leagueId; trackerState.step = 9;
        showHub();
        if (h[0].tournamentMatch && window.TOURN && window.TOURN.reportFromTracker) window.TOURN.reportFromTracker(h[0]);
        else if (toLeague && window.LEAGUE && window.LEAGUE.promptSend) window.LEAGUE.promptSend(0);
    };
    function removeGame(id) {
        const o = games(); delete o[id]; putGames(o);
        try { if (localStorage.getItem(SAVE_KEY) === id) localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }

    // ---------- tracker hub: new game / games in progress / history ----------
    function ensureHub() {
        let hub = document.getElementById('ts-hub');
        if (!hub) { hub = document.createElement('div'); hub.id = 'ts-hub'; document.getElementById('view-tracker').prepend(hub); }
        return hub;
    }
    window.showHub = function () {
        hubMode = true;
        const tv = document.getElementById('view-tracker'); if (tv) tv.style.display = '';
        const ag = document.getElementById('view-active-game'); if (ag) ag.style.display = 'none';
        ['ts-1','ts-2','ts-3','ts-4','ts-5','ts-6','ts-7','ts-history','ts-nav','tracker-step-indicator'].forEach(i => { const e = document.getElementById(i); if (e) e.style.display = 'none'; });
        const hub = ensureHub();
        if (hub) hub.style.display = 'block';
        try {
            renderHub();
        } catch (e) {
            console.error('Error rendering tracker hub:', e);
            if (hub && !hub.innerHTML) {
                hub.innerHTML = `<h2 style="text-align:center; font-size:1.8rem; margin:0 0 4px;">${S('GAME TRACKER', 'REGISTRO DE PARTIDA')}</h2>
                <div style="display:flex; flex-direction:column; gap:10px; margin:20px 0;">
                    <button onclick="newGameFromHub()" style="width:100%; padding:18px; min-height:56px; background:var(--accent); color:#000; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;"><i class="fa-solid fa-plus"></i> ${S('NEW GAME', 'NUEVA PARTIDA')}</button>
                </div>`;
            }
        }
        window.TUTORIAL_MODE = false;
        let ov = document.getElementById('tutorial-overlay');
        if (ov) ov.style.display = 'none';
    };
    function renderHub() {
        const tot = p => (p && typeof p.pri === 'number' ? p.pri : 0) + (p && typeof p.sec === 'number' ? p.sec : 0) + (p && p.paint ? 10 : 0);
        let live = [];
        try {
            live = Object.values(games()).filter(x => x && x.state && x.state.p1 && x.state.p2).sort((a, b) => (b.updated || 0) - (a.updated || 0));
        } catch (e) {
            console.error('Error reading live games:', e);
        }
        let h = [];
        try {
            h = (hist() || []).filter(m => m && typeof m === 'object');
        } catch (e) {
            console.error('Error reading history:', e);
        }
        const liveHtml = live.map(x => { const s = x.state;
            return `<div style="background:#161d27; border:1px solid #2a3546; border-radius:10px; padding:14px;">
                <div style="color:#9aa7b8; font-size:0.72rem; margin-bottom:6px;">R${s.round || 1} · ${new Date(x.updated || Date.now()).toLocaleString()}</div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.05rem; gap:8px;">
                    <span style="color:#4db8ff">${esc(s.p1 ? s.p1.name : 'Player 1')}: ${tot(s.p1)}</span><span style="color:#556">VS</span><span style="color:#ff4d4d">${esc(s.p2 ? s.p2.name : 'Player 2')}: ${tot(s.p2)}</span></div><div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px; font-size:0.78rem; color:#9aa7b8;"><span>${esc(s.p1 ? (s.p1.faction || '—') : '—')}</span><span style="text-align:right;">${esc(s.p2 ? (s.p2.faction || '—') : '—')}</span></div>
                <div style="display:flex; gap:10px; margin-top:12px;">
                    <button onclick="resumeGame('${x.id}')" style="flex:1; min-height:44px; background:var(--accent); color:#000; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">${S('RESUME', 'CONTINUAR')}</button>
                    <button onclick="shareSavedGame('${x.id}')" aria-label="share" style="width:50px; min-height:44px; background:#2a3546; color:#fff; border:none; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-share-nodes"></i></button></div>
                <div style="display:flex; gap:10px; margin-top:10px;">
                    <button onclick="finishSavedGame('${x.id}')" style="flex:1; min-height:44px; background:#2f9e5f; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-flag-checkered"></i> ${S('FINISH', 'TERMINAR')}</button>
                    <button onclick="deleteSavedGame('${x.id}')" style="flex:1; min-height:44px; background:#8c2a2a; color:#fff; border:none; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-trash"></i> ${S('ERASE', 'BORRAR')}</button></div></div>`; }).join('');
        const histHtml = h.map((m, i) => { const w = m.p1score > m.p2score ? m.p1 : (m.p2score > m.p1score ? m.p2 : 'DRAW');
            return `<div style="background:#161d27; border:1px solid #2a3546; border-radius:10px; padding:14px;">
                <div style="color:#9aa7b8; font-size:0.72rem; margin-bottom:8px;">${esc(m.date || '')} · ${esc(m.mission || '')}</div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; gap:8px;">
                    <span style="color:${w === m.p1 ? 'var(--accent)' : '#fff'}">${esc(m.p1 || 'Player 1')}: ${m.p1score || 0}</span><span style="color:#556">VS</span>
                    <span style="color:${w === m.p2 ? 'var(--accent)' : '#fff'}">${esc(m.p2 || 'Player 2')}: ${m.p2score || 0}</span></div><div style="display:flex; justify-content:space-between; gap:8px; margin-top:4px; font-size:0.78rem; color:#9aa7b8;"><span>${esc(m.p1faction || '—')}</span><span style="text-align:right;">${esc(m.p2faction || '—')}</span></div>
                <button onclick="sendHistoryToLeague(${i})" style="width:100%; margin-top:10px; min-height:40px; background:transparent; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-trophy"></i> ${S('SEND TO LEAGUE', 'ENVIAR A LA LIGA')}</button>
                <button onclick="LEAGUE.shareLiveRecord(${i})" style="width:100%; margin-top:8px; min-height:40px; background:transparent; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-link"></i> ${S('SHARE LIVE LINK', 'COMPARTIR ENLACE')}</button></div>`; }).join('');
        const sec = (t, body, empty) => `<div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:2px; margin:22px 0 10px;">${t}</div><div style="display:flex; flex-direction:column; gap:10px;">${body || `<div style="color:#667; font-size:0.9rem;">${empty}</div>`}</div>`;
        let continueBtn = '';
        if (window.trackerState && window.trackerState.step >= 1 && window.trackerState.step <= 7) {
            continueBtn = `<button onclick="continueGameSetup()" style="width:100%; padding:15px; min-height:56px; background:#4db8ff; color:#000; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;"><i class="fa-solid fa-play"></i> ${S('CONTINUE GAME SETUP', 'CONTINUAR CONFIGURACIÓN')}</button>`;
        }
        
        const hubEl = ensureHub();
        if (hubEl) {
            hubEl.innerHTML = `<h2 style="text-align:center; font-size:1.8rem; margin:0 0 4px;">${S('GAME TRACKER', 'REGISTRO DE PARTIDA')}</h2>
            <div style="text-align:center; color:#888; font-size:0.85rem; margin-bottom:18px;">${S('Your games are saved on this device.', 'Tus partidas se guardan en este dispositivo.')}</div>
            <div style="display:flex; flex-direction:column; gap:10px; margin-bottom:20px;">
                ${continueBtn}
                <button onclick="newGameFromHub()" style="width:100%; padding:18px; min-height:56px; background:var(--accent); color:#000; border:none; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;"><i class="fa-solid fa-plus"></i> ${S('NEW GAME', 'NUEVA PARTIDA')}</button>
                <button onclick="LSYNC.openMenu()" style="width:100%; padding:15px; min-height:56px; background:rgba(77, 184, 255, 0.1); border:1px dashed #4db8ff; color:#4db8ff; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;"><i class="fa-solid fa-wifi"></i> ${S('JOIN LIVE GAME', 'UNIRSE A PARTIDA EN VIVO')}</button>
                <button onclick="startTrackerTutorial()" style="width:100%; padding:15px; min-height:56px; background:rgba(255, 255, 255, 0.05); border:1px solid #3a4556; color:#cfd8e3; border-radius:10px; font-weight:bold; font-size:1.1rem; cursor:pointer;"><i class="fa-solid fa-graduation-cap"></i> ${S('CREATE NEW GAME (TUTORIAL)', 'CREAR NUEVA PARTIDA (TUTORIAL)')}</button>
            </div>
            ${sec(S('IN PROGRESS', 'EN CURSO'), liveHtml, S('No games in progress.', 'No hay partidas en curso.'))}
            ${sec(S('HISTORY', 'HISTORIAL'), histHtml, S('No finished games yet.', 'Aún no hay partidas terminadas.'))}
            ${h.length ? `<div style="display:flex; gap:10px; margin-top:14px;"><button onclick="exportHistoryCSV()" style="flex:1; min-height:44px; background:#1e252f; border:1px solid #3a4556; border-radius:8px; color:#fff; font-weight:bold; cursor:pointer;">CSV</button><button onclick="exportHistory()" style="flex:1; min-height:44px; background:#1e252f; border:1px solid #3a4556; border-radius:8px; color:#fff; font-weight:bold; cursor:pointer;">JSON <i class="fa-solid fa-download"></i></button></div>` : ''}`;
        }
    }
    window.newGameFromHub = function () {
        switchView('tracker-new');
        startNewGame();
    };
    window.continueGameSetup = function() {
        switchView('tracker-continue');
        navTracker(0);
    };
    window.resumeGame = function (id) {
        const x = games()[id]; if (!x) return;
        Object.assign(trackerState, JSON.parse(JSON.stringify(x.state))); trackerState.step = 8; hubMode = false;
        try { localStorage.setItem(SAVE_KEY, id); } catch (e) {}
        switchView('tracker-live');
        renderGame();
        if (window.LSYNC && LSYNC.reconnectFor) LSYNC.reconnectFor(id);   // a shared game picks its live connection back up
    };
    window.joinLiveGameTransition = function () {
        trackerState.step = 8; hubMode = false;
        ensureHub().style.display = 'none'; showGameView();
    };
    window.deleteSavedGame = function (id) {
        if (!confirm(S('Delete this game? This cannot be undone.', '¿Eliminar esta partida? No se puede deshacer.'))) return;
        removeGame(id); if (trackerState.gameId === id) trackerState.step = 9; renderHub(); refreshContinue();
    };
    function loadSaved(id) {
        const x = games()[id]; if (!x) return false;
        Object.assign(trackerState, JSON.parse(JSON.stringify(x.state))); trackerState.step = 8; trackerState.gameId = id; return true;
    }
    window.shareSavedGame = function (id) { if (loadSaved(id)) openShare(); };
    window.finishSavedGame = function (id) {
        if (!loadSaved(id)) return;
        showSummary(true);   // final card first; "Save to history & finish" there asks for confirmation
    };
    window.confirmFinish = function () {
        if (!confirm(S('Finish this game and save it to history? It will leave the in-progress list.', '¿Terminar esta partida y guardarla en el historial? Saldrá de la lista de partidas en curso.'))) return;
        const o = document.getElementById('ov-summary'); if (o) o.remove(); saveMatchToHistory();
    };
    window.setupNewGame = function () {
        if (!confirm(S('Set up a new game? Your current game stays saved — you can resume it from the tracker screen.', '¿Preparar una nueva partida? Tu partida actual queda guardada: podrás continuarla desde la pantalla del tracker.'))) return;
        save(); trackerState.step = 9; try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
        showHub();
    };
    window.exportHistory = function () { download('project-4192_history.json', JSON.stringify(hist(), null, 2), 'application/json'); };
    window.exportHistoryCSV = function () {
        const rows = [['date', 'p1', 'p1_faction', 'p1_primary', 'p1_pri', 'p1_sec', 'p1_total', 'p2', 'p2_faction', 'p2_primary', 'p2_pri', 'p2_sec', 'p2_total']];
        hist().forEach(m => rows.push([m.date, m.p1, m.p1faction, m.p1mission, m.p1pri, m.p1sec, m.p1score, m.p2, m.p2faction, m.p2mission, m.p2pri, m.p2sec, m.p2score]));
        download('project-4192_history.csv', rows.map(r => r.map(c => `"${String(c == null ? '' : c).replace(/"/g, '""')}"`).join(',')).join('\n'), 'text/csv');
    };
    window.exportCurrentGame = function () { download('project-4192_game.json', JSON.stringify(matchRecord(), null, 2), 'application/json'); };

    // ---------- roles: picking one side auto-selects the opposite ----------
    window.setRole = function (n, role) {
        const other = role === 'ATTACKER' ? 'DEFENDER' : 'ATTACKER';
        trackerState.p1.role = n === 1 ? role : other;
        trackerState.p2.role = n === 2 ? role : other;
        [[1, '#4384ff'], [2, '#f44336']].forEach(([i, c]) => {
            const r = P(i).role;
            ['attacker', 'defender'].forEach(k => {
                const b = document.getElementById(`btn-p${i}-${k}`), on = r === k.toUpperCase();
                b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
                b.style.borderWidth = on ? '2px' : '1px';
                b.style.color = on ? '#fff' : '#9aa7b8';
            });
        });
    };

    // ---------- generic overlay ----------
    function overlay(id, inner) {
        let o = document.getElementById(id);
        if (!o) { o = document.createElement('div'); o.id = id; document.body.appendChild(o); }
        o.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.85); z-index:100000; display:flex; justify-content:center; align-items:flex-start; overflow-y:auto; padding:16px;';
        o.innerHTML = `<div style="background:#1e252f; border:1px solid #3a4556; border-radius:12px; width:100%; max-width:520px; padding:18px; color:#fff; margin:auto;">${inner}</div>`;
        o.onclick = e => { if (e.target === o) o.remove(); };
        return o;
    }
    const closeBtn = id => `<button onclick="document.getElementById('${id}').remove()" style="background:transparent; border:1px solid #3a4556; color:#fff; width:40px; height:40px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-times"></i></button>`;
    const bigBtn = (label, onclick, bg) => `<button onclick="${onclick}" style="width:100%; padding:14px; margin-top:10px; background:${bg || '#2a3546'}; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:1rem; cursor:pointer; min-height:44px;">${label}</button>`;

    // ---------- share / save ----------
    // compact, cloud-friendly snapshot of a game (also used for share links)
    function sideObj(p) {
        return { name: p.name, faction: p.faction, forceDisp: p.forceDisp, paint: !!p.paint, role: p.role, deck: p.deck, pri: p.pri || 0, sec: p.sec || 0,
                 cp: typeof p.cp === 'number' ? p.cp : 1,
                 secondaries: p.secondaries || [], discarded: p.discarded || [],
                 log: (p.log || []).map(e => ({ id: e.id, round: e.round, type: e.type, mission: e.mission, vp: e.vp, picked: e.picked })), removed: p.removed || [] };
    }
    function stateObj() {
        return { v: 2, round: trackerState.round, started: trackerState.started, layout: trackerState.terrainLayoutId || null, m1: trackerState.primaryMissionP1, m2: trackerState.primaryMissionP2, p1: sideObj(trackerState.p1), p2: sideObj(trackerState.p2) };
    }
    function recordSnap(rec) {   // a finished game from history -> same shape
        const side = n => ({ name: rec['p' + n], faction: rec['p' + n + 'faction'], forceDisp: rec['p' + n + 'forceDisp'], paint: !!rec['p' + n + 'paint'], role: rec['p' + n + 'role'], pri: rec['p' + n + 'pri'] || 0, sec: rec['p' + n + 'sec'] || 0,
            cp: typeof rec['p' + n + 'cp'] === 'number' ? rec['p' + n + 'cp'] : 1,
            secondaries: rec['p' + n + 'held'] || [], discarded: rec['p' + n + 'discarded'] || [], log: (rec['p' + n + 'log'] || []).map(e => ({ round: e.round, type: e.type, mission: e.mission, vp: e.vp })) });
        return { v: 2, round: rec.round, started: rec.started, layout: rec.terrainLayoutId || null, m1: rec.p1mission, m2: rec.p2mission, p1: side(1), p2: side(2) };
    }
    function importSnap(s) {
        trackerState.round = s.round || 1; trackerState.started = s.started; trackerState.primaryMissionP1 = s.m1; trackerState.primaryMissionP2 = s.m2;
        if (s.layout) trackerState.terrainLayoutId = s.layout;
        Object.assign(trackerState.p1, s.p1); Object.assign(trackerState.p2, s.p2); trackerState.step = 8; trackerState.gameId = null; trackerState.shareCode = null; trackerState.leagueId = null; trackerState.tournamentMatch = null;
        [1, 2].forEach(n => ensure(P(n)));
        showGameView(); renderGame();
    }
    window.GDM = { snapshot: stateObj, snapshotFromRecord: recordSnap, importSnapshot: importSnap,
        newGame: opts => { hubMode = false; const h = document.getElementById('ts-hub'); if (h) h.style.display = 'none'; document.getElementById('tracker-step-indicator').style.display = 'flex'; startNewGame(); if (opts && opts.leagueId) trackerState.leagueId = opts.leagueId;
            if (opts && opts.tournamentMatch) trackerState.tournamentMatch = opts.tournamentMatch;
            if (opts && opts.names) { ['ts-p1-name', 'ts-p2-name'].forEach((id, i) => { const e = document.getElementById(id); if (e) e.value = opts.names[i]; }); } } };
    // live games: take the OTHER player's side (and the shared round/mission) from the server, never touching my own side
    function applyRemote(s, mySide) {
        const other = mySide === 1 ? 2 : 1, o = (s && s['p' + other]) || {}, p = P(other);
        ['name', 'faction', 'forceDisp', 'paint', 'role', 'deck', 'pri', 'sec', 'cp', 'secondaries', 'discarded'].forEach(k => { if (o[k] !== undefined) p[k] = o[k]; });
        p.log = (o.log || []).map(e => Object.assign({}, e)); ensure(p);
        if (mySide === 2) { if (s.round) trackerState.round = s.round; if (s.started) trackerState.started = s.started; if (s.m1) trackerState.primaryMissionP1 = s.m1; }
        else if (s.m2) trackerState.primaryMissionP2 = s.m2;
        if (s.layout) trackerState.terrainLayoutId = s.layout;
        window.__liveApplying = true;
        try { renderGame(); save(); } finally { window.__liveApplying = false; }
    }
    window.GDM.applyRemote = applyRemote;
    window.GDM.restoreGame = id => loadSaved(id);   // put this phone's saved copy of a game back in place (no screen change)
    // Live games send the whole game. mergeInto(base, other) puts into `base` what `other` has that `base` lacks:
    // score entries it has not seen (and drops the ones either removed), and the round / CP / secondary hand where
    // `other` changed them more recently. Returns true when `base` changed.
    //  - a newer copy arrives: mergeInto(incoming, mine) keeps what this phone did meanwhile (then the result is sent back out)
    //  - an older copy arrives: mergeInto(mine, incoming) takes in what that phone did, instead of throwing it away
    function mergeInto(base, other) {
        if (!base || !other || !base.started || base.started !== other.started) return false;
        let changed = false;
        const bt = base.t = base.t || {}, ot = other.t || {};
        const newer = k => (ot[k] || 0) > (bt[k] || 0);
        if (newer('round')) { base.round = other.round; changed = true; }
        [1, 2].forEach(n => {
            const b = base['p' + n], o = other['p' + n]; if (!b || !o) return;
            if (newer('cp' + n)) { b.cp = o.cp; changed = true; }
            if (newer('hand' + n)) { b.secondaries = JSON.parse(JSON.stringify(o.secondaries || [])); b.discarded = (o.discarded || []).slice(); changed = true; }
            b.log = b.log || []; o.log = o.log || []; ensureIds(b); ensureIds(o);
            const removed = [...new Set([].concat(b.removed || [], o.removed || []))].slice(-500);
            const have = new Set(b.log.map(e => e.id));
            const extra = o.log.filter(e => !have.has(e.id) && !removed.includes(e.id));
            const before = b.log.length;
            b.log = b.log.filter(e => !removed.includes(e.id)).concat(extra.map(e => Object.assign({}, e)));
            if (extra.length || b.log.length !== before + extra.length) changed = true;
            b.removed = removed;
            // a tactical card the other copy scored is spent, even if this copy still shows it in the hand
            if (b.deck !== 'FIXED') extra.filter(e => e.type === 'secondary' && e.vp > 0).forEach(e => {
                b.secondaries = (b.secondaries || []).filter(x => key(x.name) !== key(e.mission));
                b.discarded = b.discarded || []; if (!b.discarded.includes(key(e.mission))) b.discarded.push(key(e.mission));
            });
            if (b.log.some(e => e.vp > 0) || o.fromLog) b.fromLog = true;
            if (b.fromLog) recalc(b);
        });
        Object.keys(ot).forEach(k => { bt[k] = Math.max(ot[k] || 0, bt[k] || 0); });
        return changed;
    }
    window.GDM.mergeIncoming = incoming => trackerState.step === 8 ? mergeInto(incoming, trackerState) : false;
    window.GDM.absorbOlder = incoming => {   // returns true when this phone's game gained something (then it is redrawn, saved and sent out)
        if (trackerState.step !== 8 || !mergeInto(trackerState, JSON.parse(JSON.stringify(incoming)))) return false;
        window.__liveApplying = true; try { renderGame(); save(); } finally { window.__liveApplying = false; }
        return true;
    };
    window.GDM.sides = () => { const s = stateObj(); return s; };
    window.GDM.hasActiveGame = () => { const v = document.getElementById('view-active-game'); return !!v && getComputedStyle(v).display !== 'none' && trackerState.step === 8; };
    window.GDM.joinLiveCopy = function (state, extra) {   // open a server game as MY local game (for the invited player)
        importSnap(state); Object.assign(trackerState, extra || {}); save();
    };
    function encodeState() {
        return btoa(unescape(encodeURIComponent(JSON.stringify(stateObj())))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function applyShared(code) {
        importSnap(JSON.parse(decodeURIComponent(escape(atob(code.replace(/-/g, '+').replace(/_/g, '/'))))));
    }
    const shareLink = () => location.origin + location.pathname + '?g=' + encodeState();

    // Share sheet: live sharing first (links, codes, WhatsApp, who is online, saved for 90 days); everything else under "See more"
    window.openShare = function () {
        const L = window.LSYNC ? LSYNC.info() : { active: false }, e = v => esc(String(v || ''));
        const btn = (label, onclick, bg) => `<button onclick="${onclick}" style="flex:1; min-height:44px; padding:0 10px; background:${bg}; color:#fff; border:none; border-radius:8px; font-weight:bold; font-size:.92rem; cursor:pointer;">${label}</button>`;
        const card = (title, color, icon, link, code, which, codeWhich) => `<div style="background:#1e252f; border:1px solid #3a4556; border-radius:12px; padding:12px; margin-top:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;"><div style="color:${color}; font-weight:800; letter-spacing:.06em; font-size:.8rem; text-transform:uppercase;"><i class="fa-solid ${icon}"></i> ${title}</div>
            <button data-keepcaps onclick="LSYNC.copy('${codeWhich}')" title="${S('Copy code', 'Copiar código')}" style="background:transparent; border:1px dashed #4a5568; color:#fff; font-weight:800; letter-spacing:2px; border-radius:8px; padding:4px 10px; min-height:36px; cursor:pointer;">${e(code)} <i class="fa-regular fa-copy" style="font-size:.8rem; color:#9aa7b8;"></i></button></div>
            <input readonly value="${e(link)}" onclick="this.select()" style="width:100%; margin-top:8px; padding:10px; background:#0d1117; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-size:.82rem;">
            <div style="display:flex; gap:8px; margin-top:8px;">${btn('<i class="fa-solid fa-link"></i> ' + S('Copy link', 'Copiar enlace'), `LSYNC.copy('${which}')`, '#4384ff')}${btn('<i class="fa-brands fa-whatsapp"></i> WhatsApp', `LSYNC.whatsapp('${which}')`, '#25a244')}</div></div>`;
        let live;
        if (!L.active) {
            live = `<p style="color:#9aa7b8; font-size:0.88rem; margin:6px 0 4px;">${S('Share this game live: your opponent scores on their own phone and anyone can watch. The game is saved and its link keeps working for 90 days, even after it ends.', 'Comparte esta partida en vivo: tu oponente anota desde su teléfono y cualquiera puede mirar. La partida se guarda y su enlace sigue funcionando 90 días, incluso cuando termina.')}</p>
                ${bigBtn('<i class="fa-solid fa-tower-broadcast"></i> ' + S('Start sharing live', 'Compartir en vivo'), 'LSYNC.host()', '#4384ff')}`;
        } else {
            const o = L.online || {}, people = (o.players || 0) + (o.spectators || 0);
            const on = people ? `<span style="color:#4ade80;">● ${S('Online', 'En línea')}:</span> ${o.players || 0} ${S((o.players === 1 ? 'player' : 'players'), (o.players === 1 ? 'jugador' : 'jugadores'))} · ${o.spectators || 0} ${S('watching', 'mirando')}` : `<span style="color:#f59e0b;">● ${S('Connecting…', 'Conectando…')}</span>`;
            const sv = L.saved || {}, until = sv.until ? new Date(sv.until).toLocaleDateString() : '';
            const savedTxt = sv.off === 'missing' ? `<span style="color:#f59e0b;">${S('Live only: saving is not switched on on the server yet', 'Solo en vivo: el guardado aún no está activado en el servidor')}</span>`
                : sv.ok ? `<i class="fa-solid fa-cloud" style="color:#4db8ff;"></i> ${S('Saved', 'Guardada')}${until ? ' · ' + S('link works until', 'el enlace funciona hasta') + ' ' + until : ''}`
                : L.canSave ? S('Saving…', 'Guardando…') : `<i class="fa-solid fa-cloud" style="color:#4db8ff;"></i> ${S('Saved by the host', 'La guarda el anfitrión')}`;
            live = `<div style="background:#0d1117; border:1px solid #3a4556; border-radius:10px; padding:10px 12px; margin-top:6px; font-size:.86rem; color:#cfd8e3; line-height:1.6;">${on}<br>${savedTxt}${L.finished ? '<br>🏁 ' + S('Finished: final result', 'Terminada: resultado final') : ''}${L.spectator ? '<br><i class="fa-solid fa-eye"></i> ' + S('You are watching (read-only)', 'Estás mirando (solo lectura)') : ''}</div>
                ${card(S('Watch', 'Mirar'), '#5be59a', 'fa-eye', L.links.watch, 'S' + L.code, 'watch', 'scode')}
                ${!L.spectator ? card(S('Play · anyone with this link can score', 'Jugar · quien tenga este enlace puede anotar'), '#4db8ff', 'fa-gamepad', L.links.play, L.code, 'play', 'code') : ''}
                <button onclick="LSYNC.leave()" style="width:100%; margin-top:12px; min-height:44px; background:transparent; color:#f87171; border:1px solid #4a2a2a; border-radius:8px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-link-slash"></i> ${L.host ? (sv.ok ? S('Stop sharing on this phone (the saved game stays)', 'Dejar de compartir en este teléfono (la partida guardada se queda)') : S('Stop sharing', 'Dejar de compartir')) : S('Leave this game', 'Salir de esta partida')}</button>`;
        }
        overlay('ov-share', `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><h3 style="margin:0;"><i class="fa-solid fa-share-nodes"></i> ${S('Share game', 'Compartir partida')}</h3>${closeBtn('ov-share')}</div>
            ${live}
            ${bigBtn('<i class="fa-solid fa-tower-broadcast" style="color:#ef4444;"></i> ' + S('Streamer Studio (OBS & 1080p Camera)', 'Estudio de Stream (OBS y Cámara 1080p)'), "document.getElementById('ov-share').remove(); if(window.BROADCAST) BROADCAST.openStudioModal();", '#161e29')}
            <details style="margin-top:14px; border-top:1px solid #2a3546; padding-top:6px;"><summary style="cursor:pointer; color:#cfd8e3; font-weight:bold; min-height:44px; display:flex; align-items:center;">${S('See more', 'Ver más')}</summary>
                <p style="color:#9aa7b8; font-size:0.82rem; margin:4px 0 0;">${S('Snapshot link: the scores as they are now; whoever opens it can continue on their own phone.', 'Enlace de instantánea: los puntos de este momento; quien lo abra puede seguir en su teléfono.')}</p>
                <input id="share-link" readonly value="${e(shareLink())}" onclick="this.select()" style="width:100%; margin-top:8px; padding:10px; background:#0d1117; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-size:.82rem;">
                ${bigBtn('<i class="fa-solid fa-copy"></i> ' + S('Copy snapshot link', 'Copiar enlace de instantánea'), 'copyShareLink()')}
                ${navigator.share ? bigBtn('<i class="fa-solid fa-share-nodes"></i> ' + S('Share…', 'Compartir…'), 'nativeShare()') : ''}
                ${bigBtn('<i class="fa-solid fa-camera"></i> ' + S('View snapshot', 'Ver instantánea'), "document.getElementById('ov-share').remove(); showSummary(false)")}
                ${bigBtn('<i class="fa-solid fa-download"></i> ' + S('Download game (.json)', 'Descargar partida (.json)'), 'exportCurrentGame()')}
                ${bigBtn('<i class="fa-solid fa-upload"></i> ' + S('Load game from file', 'Cargar partida desde archivo'), 'importGameFile()')}
                ${window.LEAGUE && LEAGUE.shareLive ? bigBtn('<i class="fa-solid fa-trophy"></i> ' + S('League live link (account)', 'Enlace en vivo de liga (cuenta)'), 'LEAGUE.shareLive()') : ''}
            </details>`);
    };
    window.copyShareLink = function () {
        const v = shareLink();
        const done = () => { const b = document.querySelector('#ov-share button'); alert(S('Link copied', 'Enlace copiado')); };
        if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, () => { const i = document.getElementById('share-link'); if(i){ i.value = v; i.select(); document.execCommand('copy'); } done(); });
        else { const i = document.getElementById('share-link'); if(i){ i.value = v; i.select(); document.execCommand('copy'); } done(); }
    };
    window.shareWhatsApp = function () {
        const a = trackerState.p1, b = trackerState.p2;
        let link = shareLink();
        let prefix = '';
        if (window.LSYNC && window.LSYNC.active() && window.LSYNC.getCode()) {
            link = location.origin + location.pathname + '?obs=' + window.LSYNC.getCode().replace('GDM-', '');
            prefix = '🔴 LIVE: ';
        }
        const txt = `⚔️ ${prefix}Project 4192 · ${a.name} ${totalOf(a)} - ${totalOf(b)} ${b.name} (${S('Round', 'Ronda')} ${trackerState.round}/5)\n${trackerState.primaryMissionP1} / ${trackerState.primaryMissionP2}\n${link}`;
        window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank');
    };
    window.nativeShare = function () { navigator.share({ title: 'Project 4192 game', text: `${trackerState.p1.name} vs ${trackerState.p2.name}`, url: shareLink() }).catch(() => {}); };
    window.importGameFile = function () {
        const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json';
        i.onchange = () => { const f = i.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => {
            try {
                const m = JSON.parse(r.result); const set = (p, n) => Object.assign(p, { name: m['p' + n], faction: m['p' + n + 'faction'], forceDisp: m['p' + n + 'forceDisp'], paint: m['p' + n + 'paint'], role: m['p' + n + 'role'], pri: m['p' + n + 'pri'], sec: m['p' + n + 'sec'], log: m['p' + n + 'log'] || [], secondaries: m['p' + n + 'held'] || [], discarded: m['p' + n + 'discarded'] || [] });
                set(trackerState.p1, 1); set(trackerState.p2, 2); trackerState.round = m.round || 1; trackerState.primaryMissionP1 = m.p1mission; trackerState.primaryMissionP2 = m.p2mission; trackerState.started = m.started; trackerState.step = 8; trackerState.gameId = null;
                showGameView();
                const o = document.getElementById('ov-share'); if (o) o.remove(); renderGame();
            } catch (e) { alert('Invalid file'); }
        }; r.readAsText(f); };
        i.click();
    };

    // ---------- settings ----------
    
    // (the layout preview lives in tracker_3d_viewer.js: one window with the 2D map and 3D & AR tabs)

    window.openSettings = function () {
        const inp = n => `<label style="display:block; color:${COL(n)}; font-size:0.75rem; font-weight:bold; letter-spacing:1px; margin:10px 0 4px;">${S('PLAYER', 'JUGADOR')} ${n}</label>
            <input id="set-name-${n}" value="${esc(P(n).name || '')}" oninput="renamePlayer(${n}, this.value)" style="width:100%; padding:12px; background:#161d27; border:1px solid ${COL(n)}; border-radius:8px; color:#fff; font-size:1rem;">`;
        const lb = (code, label) => `<button onclick="setLang('${code}')" style="flex:1; padding:12px; min-height:44px; background:${lang() === code ? '#4384ff' : '#161d27'}; color:#fff; border:1px solid #3a4556; border-radius:8px; font-weight:bold; cursor:pointer;">${label}</button>`;
        const head = t => `<div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:1px; margin:16px 0 6px;">${t}</div>`;
        const arBtn = `<button onclick="document.getElementById('ov-settings').remove(); open3DLayoutModal()" style="width:100%; margin-top:16px; min-height:64px; padding:12px 14px; display:flex; align-items:center; gap:14px; text-align:left; background:linear-gradient(135deg,#064e3b,#065f46); border:1px solid #22c55e; border-radius:12px; color:#ecfdf5; cursor:pointer; box-shadow:0 0 14px rgba(34,197,94,.25);"><i class="fa-solid fa-map-location-dot" style="font-size:1.6rem; color:#4ade80;"></i><span><b style="font-size:1.02rem;">${S('Terrain layout · 2D map, 3D & AR', 'Terreno · mapa 2D, 3D y RA')}</b><br><span style="font-size:.82rem; color:#a7f3d0;">${trackerState.terrainLayoutId ? S('See the map, or this layout on your table', 'Ver el mapa, o esta disposición sobre tu mesa') : S('No layout picked: shows the one for your Force Dispositions', 'Sin disposición elegida: muestra la de sus Disposiciones de Fuerza')}</span></span></button>`;
        const logBox = window.LSYNC && LSYNC.logHtml ? `${head(S('ACTIVITY LOG', 'REGISTRO DE ACTIVIDAD'))}<div id="set-activity" style="max-height:200px; overflow-y:auto; background:#0d1117; border:1px solid #3a4556; border-radius:8px; padding:2px 12px; font-size:.84rem; color:#cfd8e3;">${LSYNC.logHtml(40)}</div>
            <button onclick="LSYNC.showLog()" style="margin-top:6px; min-height:40px; padding:0 12px; background:transparent; border:1px solid #3a4556; border-radius:8px; color:#cfd8e3; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-list-ul"></i> ${S('Full log', 'Registro completo')}</button>` : '';
        overlay('ov-settings', `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><h3 style="margin:0;">${S('Settings', 'Ajustes')}</h3>${closeBtn('ov-settings')}</div>
            ${inp(1)}${inp(2)}
            <div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:1px; margin:16px 0 6px;">${S('MISSION TEXT LANGUAGE', 'IDIOMA DEL TEXTO DE MISIONES')}</div>
            <div style="display:flex; gap:10px;">${lb('en', 'ENGLISH')}${lb('es', 'ESPAÑOL')}</div>
            <div style="color:#6f7c8e; font-size:0.72rem; margin-top:6px; margin-bottom:4px;">${S('Mission names and the full card image stay in English.', 'Los nombres de misión y la imagen de la carta se quedan en inglés.')}</div>
            ${logBox}
            ${arBtn}
            ${bigBtn('<i class="fa-solid fa-camera"></i> ' + S('View summary', 'Ver resumen'), "document.getElementById('ov-settings').remove(); showSummary(false)")}
            ${bigBtn('<i class="fa-solid fa-flag-checkered"></i> ' + S('Finalize game', 'Finalizar partida'), "document.getElementById('ov-settings').remove(); showSummary(true)", '#2f9e5f')}
            ${bigBtn('<i class="fa-solid fa-trash"></i> ' + S('Discard this game', 'Descartar esta partida'), 'discardGame()', '#8c2a2a')}`);
    };
    window.renamePlayer = function (n, v) { P(n).name = v.toUpperCase(); setText(`ag-p${n}-name`, P(n).name); setText(`ag-p${n}-card-name`, P(n).name); save(); };
    window.setLang = function (c) { try { localStorage.setItem('gdm_lang', c); } catch (e) {} const o = document.getElementById('ov-settings'); if (o) openSettings(); renderGame(); };
    window.discardGame = function () {
        if (!confirm(S('Discard this game and its scores?', '¿Descartar esta partida y sus puntos?'))) return;
        removeGame(trackerState.gameId); trackerState.step = 9; showHub();
    };

    // ---------- summary / final card ----------
    function roundTable() {
        const rows = [];
        for (let r = 1; r <= 5; r++) {
            const row = { r, p: [1, 2].map(n => {
                const l = P(n).log.filter(e => e.round === r && e.vp > 0);
                return { pri: l.filter(e => e.type === 'primary').reduce((s, e) => s + e.vp, 0), sec: l.filter(e => e.type === 'secondary').reduce((s, e) => s + e.vp, 0), l };
            }) };
            row.any = row.p.some(x => x.l.length);
            rows.push(row);
        }
        return rows;
    }
    const totalOf = p => p.pri + p.sec + (p.paint ? 10 : 0);

    window.showSummary = function (final) {
        const a = trackerState.p1, b = trackerState.p2, ta = totalOf(a), tb = totalOf(b);
        const winner = ta === tb ? S('DRAW', 'EMPATE') : (ta > tb ? a.name : b.name);
        const rows = roundTable().filter(r => r.any || r.r <= trackerState.round);
        const chip = e => `<span style="display:inline-block; background:rgba(47,158,95,0.2); border:1px solid #2f9e5f; color:#9be8bd; border-radius:6px; padding:2px 8px; font-size:0.72rem; margin:2px 4px 2px 0;">${esc(e.mission)} +${e.vp}</span>`;
        const head = n => `<div style="flex:1; text-align:${n === 1 ? 'left' : 'right'};"><div style="color:${COL(n)}; font-weight:bold; font-size:0.8rem; letter-spacing:1px;">${esc((P(n).name || '').toUpperCase())}</div><div style="color:#cfd8e3; font-size:0.72rem;">${esc(P(n).faction || '')}</div>
            <div style="font-size:2.6rem; font-weight:bold; line-height:1;">${totalOf(P(n))}</div>
            <div style="color:#9aa7b8; font-size:0.72rem;">${S('PRIMARY', 'PRIMARIA')} ${P(n).pri} · ${S('SECONDARY', 'SECUNDARIA')} ${P(n).sec}${P(n).paint ? ' · ' + S('PAINTED', 'PINTADO') + ' +10' : ''}</div></div>`;
        const body = rows.map(r => `<div style="border-top:1px solid #2a3546; padding:10px 0;">
            <div style="font-weight:bold; color:#9aa7b8; font-size:0.75rem; letter-spacing:1px; margin-bottom:6px;">${S('BATTLE ROUND', 'RONDA')} ${r.r}</div>
            <div style="display:flex; gap:12px;">${[0, 1].map(i => `<div style="flex:1; min-width:0; text-align:${i ? 'right' : 'left'};">
                <div style="font-size:0.85rem;"><b style="color:${COL(i + 1)}">+${r.p[i].pri + r.p[i].sec}</b> <span style="color:#9aa7b8;">(${S('P', 'Pri')} ${r.p[i].pri} / ${S('S', 'Sec')} ${r.p[i].sec})</span></div>
                <div>${r.p[i].l.map(chip).join('') || '<span style="color:#556;">—</span>'}</div></div>`).join('')}</div></div>`).join('');
        overlay('ov-summary', `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:2px;">${final ? S('FINAL RESULT', 'RESULTADO FINAL') : S('SNAPSHOT · ROUND', 'INSTANTÁNEA · RONDA') + ' ' + trackerState.round}</div>${closeBtn('ov-summary')}</div>
            <div style="display:flex; gap:12px; align-items:flex-end;">${head(1)}<div style="color:#556; font-weight:bold;">VS</div>${head(2)}</div>
            ${final || ta !== tb ? `<div style="text-align:center; margin:12px 0; font-weight:bold; color:${ta === tb ? '#ccc' : '#e5c15a'};">${final ? '🏆 ' : ''}${ta === tb ? winner : (final ? S('WINNER: ', 'GANADOR: ') : S('LEADING: ', 'VA GANANDO: ')) + esc(winner)}</div>` : ''}
            <div style="color:#9aa7b8; font-size:0.72rem; margin:6px 0;">${esc(trackerState.primaryMissionP1)} / ${esc(trackerState.primaryMissionP2)}</div>
            ${body}
            ${bigBtn('<i class="fa-solid fa-image"></i> ' + S('Download score card (PNG)', 'Descargar tarjeta (PNG)'), 'downloadScoreCard()')}
            ${bigBtn('<i class="fa-brands fa-whatsapp"></i> ' + S('Share on WhatsApp', 'Compartir por WhatsApp'), 'shareWhatsApp()', '#25a244')}
            ${bigBtn('<i class="fa-solid fa-share-nodes"></i> ' + S('Share / save', 'Compartir / guardar'), "document.getElementById('ov-summary').remove(); openShare()")}
            ${final ? bigBtn('<i class="fa-solid fa-flag-checkered"></i> ' + S('Save to history & finish', 'Guardar en historial y terminar'), 'confirmFinish()', '#2f9e5f') : ''}`);
    };

    window.downloadScoreCard = async function () {
        const W = 1080, PAD = 40, HALF = W / 2, HEAD = 470;
        const loadImg = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
        const imgs = await Promise.all([1, 2].map(n => loadImg(factionBanner(P(n).faction))));
        const rounds = roundTable().filter(r => r.any);
        const lines = (r, i) => r.p[i].l.slice().sort((a, b) => (a.type === 'primary' ? 0 : 1) - (b.type === 'primary' ? 0 : 1));
        const LH = 40, ROWH = r => 110 + Math.max(1, ...[0, 1].map(i => lines(r, i).length)) * LH;
        const bodyH = rounds.length ? rounds.reduce((s, r) => s + ROWH(r), 0) : 90;
        const H = HEAD + bodyH + 130;
        const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
        const fit = (t, mx) => { while (x.measureText(t).width > mx && t.length > 4) t = t.slice(0, -2); return t; };
        const rr = (X, Y, w, h, r) => { x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + w, Y, X + w, Y + h, r); x.arcTo(X + w, Y + h, X, Y + h, r); x.arcTo(X, Y + h, X, Y, r); x.arcTo(X, Y, X + w, Y, r); x.closePath(); };
        x.fillStyle = '#10151c'; x.fillRect(0, 0, W, H);

        // ----- header: left half = player 1 faction, right half = player 2 faction
        [1, 2].forEach((n, k) => {
            const X0 = k * HALF, img = imgs[k], p = P(n), col = COL(n), right = k === 1;
            x.save(); x.beginPath(); x.rect(X0, 0, HALF, HEAD); x.clip();
            if (img) { const s = Math.max(HALF / img.width, HEAD / img.height); x.drawImage(img, X0 + (HALF - img.width * s) / 2, (HEAD - img.height * s) / 2, img.width * s, img.height * s); }
            else { x.fillStyle = '#1e252f'; x.fillRect(X0, 0, HALF, HEAD); }
            const gr = x.createLinearGradient(0, 0, 0, HEAD); gr.addColorStop(0, 'rgba(8,11,16,.55)'); gr.addColorStop(1, 'rgba(8,11,16,.92)');
            x.fillStyle = gr; x.fillRect(X0, 0, HALF, HEAD);
            x.fillStyle = col; x.fillRect(X0, 0, HALF, 8);
            x.restore();
            const tx = right ? X0 + HALF - PAD : X0 + PAD; x.textAlign = right ? 'right' : 'left';
            x.fillStyle = '#e8edf3'; x.font = `600 24px ${FONT}`; x.fillText((p.faction || S('No faction', 'Sin facción')).toUpperCase(), tx, 92);
            x.fillStyle = col; x.font = `800 40px ${FONT}`; x.fillText(fit((p.name || '').toUpperCase(), HALF - 2 * PAD), tx, 142);
            // force disposition pill
            x.font = `800 20px ${FONT}`; const fd = (p.forceDisp || '').toUpperCase(), fw = x.measureText(fd).width + 28, fx = right ? tx - fw : tx;
            x.fillStyle = getFDColor(p.forceDisp); rr(fx, 160, fw, 36, 8); x.fill(); x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(fd, fx + fw / 2, 185);
            x.textAlign = right ? 'right' : 'left';
            x.fillStyle = '#fff'; x.font = `800 150px ${FONT}`; x.fillText(totalOf(p), tx, 330);
            x.fillStyle = '#c3ccd8'; x.font = `600 22px ${FONT}`;
            x.fillText(`PRI ${p.pri}/${PRI_CAP}  ·  SEC ${p.sec}/${SEC_CAP}${p.paint ? '  ·  ' + S('PAINT', 'PINTURA') + ' +10' : ''}`, tx, 372);
            x.fillStyle = '#9aa7b8'; x.font = `500 20px ${FONT}`; x.fillText(fit(`${S('Primary', 'Primaria')}: ${k ? trackerState.primaryMissionP2 : trackerState.primaryMissionP1}  ·  ${(p.role || '').toUpperCase()}`, HALF - 2 * PAD), tx, 408);
        });
        x.fillStyle = '#e5c15a'; x.fillRect(HALF - 2, 0, 4, HEAD);
        // winner / title strip
        const a = totalOf(P(1)), b = totalOf(P(2));
        x.textAlign = 'center'; x.fillStyle = 'rgba(8,11,16,.85)'; x.fillRect(0, 0, W, 54);
        x.fillStyle = '#e5c15a'; x.font = `800 24px ${FONT}`; x.fillText('PROJECT 4192 · 11TH EDITION', HALF, 36);
        x.font = `800 26px ${FONT}`; const wt = a === b ? S('DRAW', 'EMPATE') : `🏆 ${(a > b ? P(1).name : P(2).name).toUpperCase()} ${S('WINS', 'GANA')}`, ww = x.measureText(wt).width + 44;
        x.fillStyle = '#10151c'; rr(HALF - ww / 2, 420, ww, 52, 26); x.fill(); x.strokeStyle = '#e5c15a'; x.lineWidth = 3; x.stroke();
        x.fillStyle = a === b ? '#cfd8e3' : '#e5c15a';
        x.fillText(a === b ? S('DRAW', 'EMPATE') : `🏆 ${(a > b ? P(1).name : P(2).name).toUpperCase()} ${S('WINS', 'GANA')}`, HALF, 456);

        // ----- rounds
        let y = HEAD + 50;
        if (!rounds.length) { x.fillStyle = '#667'; x.font = `500 22px ${FONT}`; x.fillText(S('No missions scored yet', 'Aún no hay misiones anotadas'), HALF, y + 30); y += 90; }
        rounds.forEach(r => {
            x.fillStyle = '#9aa7b8'; x.font = `800 22px ${FONT}`; x.textAlign = 'center';
            x.fillText(`${S('BATTLE ROUND', 'RONDA')} ${r.r}`, HALF, y + 8);
            x.strokeStyle = '#2a3546'; x.lineWidth = 2; x.beginPath(); x.moveTo(PAD, y + 24); x.lineTo(W - PAD, y + 24); x.stroke();
            [0, 1].forEach(i => {
                const right = i === 1, n = i + 1, tx = right ? W - PAD : PAD, ls = lines(r, i), sub = r.p[i].pri + r.p[i].sec;
                x.textAlign = right ? 'right' : 'left';
                x.fillStyle = COL(n); x.font = `800 26px ${FONT}`; x.fillText(`+${sub}`, tx, y + 62);
                x.fillStyle = '#7f8da0'; x.font = `500 19px ${FONT}`;
                x.fillText(`${S('PRI', 'PRI')} ${r.p[i].pri}  ·  ${S('SEC', 'SEC')} ${r.p[i].sec}`, right ? tx - 70 : tx + 70, y + 62);
                let yy = y + 62 + LH;
                ls.forEach(e => {
                    const tag = e.type === 'primary' ? 'P' : 'S', label = `${e.mission} +${e.vp}`;
                    x.font = `600 22px ${FONT}`; const t = fit(label.toUpperCase(), HALF - 2 * PAD - 50);
                    x.fillStyle = e.type === 'primary' ? '#e5c15a' : '#9be8bd';
                    x.fillText(right ? `${t}  ✓ ${tag}` : `${tag} ✓  ${t}`, tx, yy); yy += LH;
                });
                if (!ls.length) { x.fillStyle = '#4b5666'; x.font = `500 20px ${FONT}`; x.fillText('—', tx, yy); }
            });
            y += ROWH(r);
        });
        x.textAlign = 'center'; x.fillStyle = '#4b5666'; x.font = `500 18px ${FONT}`;
        x.fillText(`${new Date().toLocaleDateString()}  ·  P = ${S('primary', 'primaria')}, S = ${S('secondary', 'secundaria')}`, HALF, H - 40);
        c.toBlob(bl => { const url = URL.createObjectURL(bl), el = document.createElement('a'); el.href = url; el.download = `project-4192_${(P(1).name || 'p1')}_vs_${(P(2).name || 'p2')}.png`.replace(/\s+/g, '_'); el.click(); URL.revokeObjectURL(url); });
    };

    // keep the active game view in sync with the app's view switching (it lives outside the .view toggle)
    const baseSwitch = window.switchView;
    window.switchView = function (viewId, push) {
        if (viewId === 'tracker-setup' || viewId === 'tracker-new' || viewId === 'tracker-continue' || viewId === 'tracker-live') {
            if (push !== false && (!history.state || history.state.view !== viewId)) {
                history.pushState({ view: viewId }, '', '#' + viewId);
            }
            baseSwitch('tracker', false);
            
            const ag = document.getElementById('view-active-game'), tv = document.getElementById('view-tracker');
            hubMode = false;
            let hb = document.getElementById('ts-hub');
            if (hb) hb.style.display = 'none';

            if (viewId === 'tracker-setup' || viewId === 'tracker-new' || viewId === 'tracker-continue') {
                if (tv) tv.style.display = '';
                if (ag) ag.style.display = 'none';
                let ind = document.getElementById('tracker-step-indicator');
                if (ind) ind.style.display = 'flex';
                let nav = document.getElementById('ts-nav');
                if (nav) nav.style.display = 'flex';
            } else {
                if (tv) tv.style.display = 'none';
                if (ag) ag.style.display = 'block';
            }
            return;
        }

        baseSwitch(viewId, push);
        if (viewId === 'home') refreshContinue();
        if (viewId === 'tracker' && !internalNav) { showHub(); return; }
        const ag = document.getElementById('view-active-game'), tv = document.getElementById('view-tracker');
        if (!ag) return;
        const inGame = window.trackerState && window.trackerState.step === 8;
        if (viewId === 'tracker' && internalNav && inGame) { if (tv) tv.style.display = 'none'; if (ag) ag.style.display = 'block'; }
        else if (viewId !== 'tracker') { if (ag) ag.style.display = 'none'; }
    };
    window.showGameView = function() {
        switchView('tracker-live');
    }

    // Force Disposition step: with no detachments (no faction) any disposition can be picked manually
    const fdTitle = s => s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    window.renderForceDispositionStep = function () {
        const fds = BL_MISSION_TYPES();
        const icon = {}; fds.forEach((f, i) => { icon[f] = ['chess-rook', 'skull', 'bomb', 'eye', 'bolt', 'flag'][i % 6]; });
        for (let n = 1; n <= 2; n++) {
            const p = P(n), manual = !(p.detachments || []).length;
            const unlocked = manual ? fds.slice() : [].concat(...(p.detachments || []).filter(d => d.forceDisposition).map(d => d.forceDisposition.split(',').map(x => x.trim().toUpperCase())));
            if (!unlocked.includes(p.forceDisp) && unlocked.length) p.forceDisp = unlocked[0];
            
            const container = document.getElementById(`ts-p${n}-fd`);
            if (container) {
                // If manual state changed, we must rebuild the html
                const wasManual = container.dataset.manual === 'true';
                if (container.children.length > 3 && wasManual === manual) {
                    const btns = container.querySelectorAll('button');
                    fds.forEach((fd, i) => {
                        const btn = btns[i];
                        if (!btn) return;
                        const on = unlocked.includes(fd), sel = p.forceDisp === fd, c = getFDColor(fd);
                        const bg = sel ? c + '55' : (on ? c + '0d' : '#161d27');
                        const bdr = sel ? `2px solid ${c}` : (on ? `1px solid ${c}44` : '1px solid #3a4556');
                        const op = sel ? 1 : (on ? 0.75 : 0.3);
                        const badge = sel ? 'SELECTED' : (manual ? 'MANUAL' : 'UNLOCKED');
                        
                        btn.style.background = bg;
                        btn.style.border = bdr;
                        btn.style.opacity = op;
                        btn.disabled = !on;
                        btn.style.cursor = on ? 'pointer' : 'not-allowed';
                        
                        const badgeDiv = btn.querySelector('.fd-badge');
                        if (badgeDiv) {
                            if (on) {
                                badgeDiv.style.display = 'block';
                                badgeDiv.style.background = c + '88';
                                badgeDiv.innerText = badge;
                            } else {
                                badgeDiv.style.display = 'none';
                            }
                        }
                    });
                } else {
                    container.dataset.manual = manual;
                    let html = manual ? `<div style="color:#9aa7b8; font-size:0.8rem; margin-bottom:10px;">${S('No detachments selected — choose the Force Disposition manually.', 'Sin destacamentos — elige la Disposición de Fuerza manualmente.')}</div>` : '';
                    fds.forEach(fd => {
                        const on = unlocked.includes(fd), sel = p.forceDisp === fd, c = getFDColor(fd);
                        const bg = sel ? c + '55' : (on ? c + '0d' : '#161d27');
                        const bdr = sel ? `2px solid ${c}` : (on ? `1px solid ${c}44` : '1px solid #3a4556');
                        const op = sel ? 1 : (on ? 0.75 : 0.3);
                        const badge = sel ? 'SELECTED' : (manual ? 'MANUAL' : 'UNLOCKED');
                        html += `<button onclick="selectFD(${n}, '${fd}')" ${on ? '' : 'disabled'} style="display:flex; justify-content:space-between; align-items:center; width:100%; min-height:56px; padding:16px; margin-bottom:10px; background:${bg}; border:${bdr}; border-radius:8px; cursor:${on ? 'pointer' : 'not-allowed'}; opacity:${op}; transition:all 0.15s;">
                            <div style="display:flex; align-items:center; gap:14px;"><i class="fa-solid fa-${icon[fd]}" style="color:${on ? c : '#3a4556'}; font-size:1.4rem;"></i>
                            <span style="color:#fff; font-weight:bold; font-size:1.1rem;">${fdTitle(fd)}</span></div>
                            <div class="fd-badge" style="display:${on ? 'block' : 'none'}; background:${c}88; color:#fff; font-size:0.6rem; padding:4px 8px; border-radius:4px; font-weight:bold;">${badge}</div></button>`;
                    });
                    container.innerHTML = html;
                }
            }
            
            const nEl = document.getElementById(`ts-p${n}-fd-name`); 
            if (nEl) {
                nEl.innerHTML = `${(p.name || `PLAYER ${n}`).toUpperCase()}<br><span style="color:#fff; font-size:0.85rem; font-weight:normal; letter-spacing:0.5px;">${fdTitle(p.forceDisp)}</span>`;
            }
        }
    };

    // Faction picker: banner rows, white text with black outline
    const OUTLINE = '-webkit-text-stroke:1px #000; paint-order:stroke fill; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 2px 6px rgba(0,0,0,.9);';
    window.renderFactionList = function (q) {
        q = String(q || '').toLowerCase();
        const row = (label, banner, arg) => `<div onclick="selectFaction('${arg}')" style="min-height:76px; margin:0 0 8px; border-radius:10px; border:1px solid #2a3546; cursor:pointer; display:flex; align-items:center; padding:0 18px; background-image:linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,.1)), url('${banner}'); background-size:cover; background-position:center;">
            <span style="color:#fff; font-size:1.25rem; font-weight:800; ${OUTLINE}">${label}</span></div>`;
        let html = '<div style="padding:10px 12px 4px;">' + row('NO FACTION', 'assets/banners/0.jpg', 'NONE');
        Object.keys(window.MFM_DATA || {}).sort().filter(f => f.toLowerCase().includes(q)).forEach(f => { html += row(f, factionBanner(f), f.replace(/'/g, "\\'")); });
        document.getElementById('modal-faction-list').innerHTML = html + '</div>';
    };
    const baseSelectFaction = window.selectFaction;
    window.selectFaction = function (fac) {
        baseSelectFaction(fac);
        const n = window.currentFactionSelectPlayer, btn = document.getElementById(`ts-p${n}-faction-btn`), f = P(n).faction;
        btn.style.backgroundImage = `linear-gradient(90deg, rgba(0,0,0,.6), rgba(0,0,0,.15)), url('${factionBanner(f)}')`;
        btn.style.backgroundSize = 'cover'; btn.style.backgroundPosition = 'center';
        btn.style.color = '#fff'; btn.style.fontWeight = 'bold'; btn.style.cssText += OUTLINE;
    };

    // Home screen: "Continue game" above the factions (no auto-opening of the game)
    function refreshContinue() {
        const home = document.getElementById('view-home'); if (!home) return;
        let box = document.getElementById('home-continue');
        if (!box) {
            box = document.createElement('div'); box.id = 'home-continue';
            const label = Array.from(home.children).find(c => /FACTION/i.test(c.textContent) && c.children.length <= 2 && !c.classList.contains('home-header-card'));
            const anchor = label || home.children[1]; home.insertBefore(box, anchor);
        }
        const live = Object.values(games()).sort((a, b) => b.updated - a.updated);
        refreshHomeRosters();
        if (!live.length) { box.innerHTML = ''; return; }
        const one = live.length === 1, s = live[0].state;
        const sub = one ? `${esc(s.p1.name)} vs ${esc(s.p2.name)} · R${s.round}` : S(`${live.length} games in progress`, `${live.length} partidas en curso`);
        box.style.padding = '0 20px';
        box.innerHTML = `<button onclick="continueGame()" style="width:100%; margin:14px 0; padding:14px 18px; min-height:60px; background:var(--accent); color:#000; border:none; border-radius:12px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:14px;">
            <i class="fa-solid fa-play" style="font-size:1.3rem;"></i>
            <span><span style="display:block; font-weight:800; font-size:1.05rem; letter-spacing:1px;">${S('CONTINUE GAME', 'CONTINUAR PARTIDA')}</span><span style="display:block; font-size:0.8rem; opacity:.8;">${sub}</span></span></button>`;
    }
    // Home: "My rosters" (device-local, no login needed)
    function refreshHomeRosters() {
        const home = document.getElementById('view-home'); if (!home) return;
        let box = document.getElementById('home-rosters');
        if (!box) { box = document.createElement('div'); box.id = 'home-rosters'; const c = document.getElementById('home-continue'); c.after(box); }
        const rs = (typeof STATE !== 'undefined' && STATE.rosters) || [];
        const newBtn = `<button class="new-roster-cta" onclick="switchView('new-roster')"><i class="fa-solid fa-plus"></i> ${S('New roster', 'Nuevo ejército')}</button>`;
        if (!rs.length) { box.style.padding = '0 20px'; box.innerHTML = newBtn; return; }
        const pts = r => (r.units || []).reduce((s, u) => s + (+u.pts || 0), 0), show = box.dataset.all === '1' ? rs.length : Math.min(3, rs.length);
        const rows = rs.slice().reverse().slice(0, show).map(r => { const i = rs.indexOf(r), f = r.faction || {}; return `
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px; border:1px solid #2a3546; border-radius:10px; overflow:hidden; background-image:linear-gradient(90deg, rgba(11,15,22,.93) 35%, rgba(11,15,22,.55)), url('${f.banner || 'assets/banners/0.jpg'}'); background-size:cover; background-position:center; padding:10px 12px;">
                <div onclick="openHomeRoster(${i})" style="flex:1; min-width:0; cursor:pointer; min-height:44px; display:flex; flex-direction:column; justify-content:center;">
                    <b style="color:#fff; font-size:1rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; ${OUTLINE}">${esc(r.name)}</b>
                    <span style="color:#cfd8e3; font-size:0.75rem;">${esc(f.name || '')} · ${pts(r)}/${r.pointsLimit} pts · ${(r.units || []).length} unit${(r.units || []).length === 1 ? '' : 's'}${r.fromCloudSlot ? ' · ☁' : ''}</span></div>
                <button onclick="openHomeRoster(${i})" style="min-width:60px; min-height:44px; background:var(--accent); color:var(--accent-fg,#000); border:none; border-radius:8px; font-weight:bold; cursor:pointer;">${S('Open', 'Abrir')}</button>
                <button onclick="deleteHomeRoster(${i})" aria-label="delete roster" style="width:44px; min-height:44px; background:rgba(0,0,0,.45); color:#fff; border:1px solid #3a4556; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button></div>`; }).join('');
        box.style.padding = '0 20px';
        box.innerHTML = `<div style="color:#6a7a8c; font-size:0.8rem; font-weight:800; letter-spacing:2px; margin:4px 0 10px;">${S('MY ROSTERS', 'MIS EJÉRCITOS')} (${rs.length})</div>${rows}
            ${rs.length > 3 ? `<button onclick="toggleHomeRosters()" style="width:100%; min-height:40px; background:transparent; border:1px dashed #3a4556; border-radius:8px; color:#9aa7b8; cursor:pointer; margin-bottom:10px;">${box.dataset.all === '1' ? S('Show fewer', 'Mostrar menos') : S('Show all', 'Mostrar todos') + ' (' + rs.length + ')'}</button>` : ''}${newBtn}`;
    }
    window.openHomeRoster = i => { const r = STATE.rosters[i]; if (r) openRosterBuilder(r); };
    window.deleteHomeRoster = i => {
        const r = STATE.rosters[i]; if (!r) return;
        if (!confirm(S(`Delete roster "${r.name}" from this device?`, `¿Eliminar el ejército "${r.name}" de este dispositivo?`) + (r.fromCloudSlot ? S('\n(Its cloud copy is kept.)', '\n(Su copia en la nube se conserva.)') : ''))) return;
        STATE.rosters.splice(i, 1); saveRosters(); refreshHomeRosters();
    };
    window.toggleHomeRosters = () => { const b = document.getElementById('home-rosters'); b.dataset.all = b.dataset.all === '1' ? '0' : '1'; refreshHomeRosters(); };
    window.refreshHomeRosters = refreshHomeRosters;

    window.continueGame = function () {
        const live = Object.values(games()).sort((a, b) => b.updated - a.updated);
        if (live.length === 1) resumeGame(live[0].id);
        else { trackerState.step = trackerState.step === 8 ? 9 : trackerState.step; hubMode = true; switchView('tracker'); }
    };
    window.refreshContinue = refreshContinue;

    // ---------- start-up: shared link or saved game ----------
    function openHashView() {
        const v = window.__initialView || '';
        if (v && v !== 'home' && document.getElementById('view-' + v)) { switchView(v, false); history.replaceState({ view: v }, '', '#' + v); }
    }
    function resume() {
        const p = new URLSearchParams(location.search);
        if (!p.get('g') && !p.get('live') && !p.get('obs')) openHashView();
        if (!document.getElementById('view-active-game')) return;
        
        const liveCode = p.get('live');
        const obsCode = p.get('obs');
        if (liveCode || obsCode) {
            history.replaceState(null, '', location.pathname + location.hash);
            if (window.LSYNC) {
                setTimeout(() => {
                    window.switchView('tracker');
                    window.LSYNC.join(obsCode ? 'S' + obsCode : liveCode, p.get('k'));
                }, 400);
            }
            return;
        }

        const g = p.get('g');
        if (g) {
            try {
                if (confirm('Load the shared game? / ¿Cargar la partida compartida?')) { applyShared(g); }
            } catch (e) { alert('Invalid share link'); }
            history.replaceState(null, '', location.pathname + location.hash);
            return;
        }
        let cur = null; try { cur = localStorage.getItem(SAVE_KEY); } catch (e) {}
        if (cur && cur.length > 20) {   // migrate old single-game format (full JSON string)
            try { const s = JSON.parse(cur); s.gameId = s.gameId || Date.now().toString(36); const o = games(); o[s.gameId] = { id: s.gameId, updated: Date.now(), state: s }; putGames(o); cur = s.gameId; localStorage.setItem(SAVE_KEY, cur); } catch (e) { cur = null; }
        }
        hubMode = true; renderHub(); refreshContinue();
        const hash = window.location.hash.replace('#', '');
        if (hash === 'tracker') showHub();
        else if (hash === 'tracker-setup' || hash === 'tracker-continue') { switchView('tracker-continue', false); navTracker(0); }
        else if (hash === 'tracker-new') { switchView('tracker-new', false); startNewGame(); }
        else if (hash === 'tracker-live') {
            if (cur && games()[cur] && loadSaved(cur)) { hubMode = false; switchView('tracker-live', false); renderGame(); }
            else showHub();
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', resume); else setTimeout(resume, 0);

    // ---------- step selection re-render (steps 5, 6, 7 highlight persistence) ----------
    window.setDeck = function (n, deck) {
        P(n).deck = deck;
        const c = n === 1 ? '#4384ff' : '#f44336';
        ['tactical', 'fixed', 'manual'].forEach(k => {
            const b = document.getElementById(`btn-p${n}-${k}`), on = deck === k.toUpperCase();
            if (!b) return;
            b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
            b.style.borderWidth = on ? '2px' : '1px'; b.style.color = on ? '#fff' : '#9aa7b8';
        });
    };

    window.setFirstTurn = function (n) {
        trackerState.firstTurn = n;
        [[1, '#4384ff'], [2, '#f44336']].forEach(([i, c]) => {
            const b = document.getElementById(`btn-p${i}-first`), on = n === i;
            if (!b) return;
            b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
            b.style.borderWidth = on ? '2px' : '1px'; b.style.color = on ? '#fff' : '#9aa7b8';
        });
        clearTimeout(firstTurnTimer); firstTurnTimer = setTimeout(() => startGameTracker(), 900);
    };

    // Re-apply stored selections when navigating back to steps 5/6/7
    window.renderStepSelections = function () {
        // Step 5: Attacker / Defender
        [[1, '#4384ff'], [2, '#f44336']].forEach(([i, c]) => {
            const r = P(i).role || '';
            ['attacker', 'defender'].forEach(k => {
                const b = document.getElementById(`btn-p${i}-${k}`);
                if (!b) return;
                const on = r === k.toUpperCase();
                b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
                b.style.borderWidth = on ? '2px' : '1px'; b.style.color = on ? '#fff' : '#9aa7b8';
            });
        });
        
        // Step 5 player name labels
        const p5l1 = document.querySelector('#ts-5 [style*="color:#4db8ff"]');
        const p5l2 = document.querySelector('#ts-5 [style*="color:#ff4d4d"]');
        if (p5l1) p5l1.innerText = (trackerState.p1.name || 'PLAYER 1').toUpperCase();
        if (p5l2) p5l2.innerText = (trackerState.p2.name || 'PLAYER 2').toUpperCase();

        // Step 6: Deck type
        [1, 2].forEach(n => {
            const deck = P(n).deck || '';
            const c = n === 1 ? '#4384ff' : '#f44336';
            ['tactical', 'fixed', 'manual'].forEach(k => {
                const b = document.getElementById(`btn-p${n}-${k}`);
                if (!b) return;
                const on = deck === k.toUpperCase();
                b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
                b.style.borderWidth = on ? '2px' : '1px'; b.style.color = on ? '#fff' : '#9aa7b8';
            });
        });
        // Step 6 player name labels
        const p6l1 = document.querySelector('#ts-6 [style*="color:#4db8ff"]');
        const p6l2 = document.querySelector('#ts-6 [style*="color:#ff4d4d"]');
        if (p6l1) p6l1.innerText = (trackerState.p1.name || 'PLAYER 1').toUpperCase();
        if (p6l2) p6l2.innerText = (trackerState.p2.name || 'PLAYER 2').toUpperCase();

        // Step 7: First turn
        const ft = trackerState.firstTurn || 0;
        [[1, '#4384ff'], [2, '#f44336']].forEach(([i, c]) => {
            const b = document.getElementById(`btn-p${i}-first`);
            if (!b) return;
            const on = ft === i;
            b.style.background = on ? c : '#1e252f'; b.style.borderColor = on ? c : '#3a4556';
            b.style.borderWidth = on ? '2px' : '1px'; b.style.color = on ? '#fff' : '#9aa7b8';
        });
        
        // Step 7 player names on first-turn buttons
        const b1 = document.getElementById('btn-p1-first');
        const b2 = document.getElementById('btn-p2-first');
        const fac = p => p.faction ? `<span style="display:block; font-size:.72rem; font-weight:600; letter-spacing:.02em; opacity:.8; margin-top:4px;">${esc(p.faction)}</span>` : '';
        if (b1) b1.innerHTML = esc((trackerState.p1.name || 'PLAYER 1').toUpperCase()) + fac(trackerState.p1);
        if (b2) b2.innerHTML = esc((trackerState.p2.name || 'PLAYER 2').toUpperCase()) + fac(trackerState.p2);
        if (b1 && !document.getElementById('ts-first-note')) { const nt = document.createElement('div'); nt.id = 'ts-first-note'; nt.style.cssText = 'text-align:center; color:#8c99b0; font-size:.82rem; line-height:1.45; margin-top:14px;'; b1.parentElement.after(nt); }
        const nt = document.getElementById('ts-first-note'); if (nt) nt.textContent = S('The player who goes first is shown on the left (blue) during the game.', 'Durante la partida, quien empieza aparece a la izquierda (azul).');
    };
})();

// --- INTERACTIVE TUTORIAL OVERLAY ---
window.startTrackerTutorial = function() {
    window.TUTORIAL_MODE = true;
    newGameFromHub();
    updateTutorialOverlay();
};

function updateTutorialOverlay() {
    if (!window.TUTORIAL_MODE) {
        let ov = document.getElementById('tutorial-overlay');
        if(ov) ov.style.display = 'none';
        return;
    }
    let ov = document.getElementById('tutorial-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'tutorial-overlay';
        ov.style.cssText = 'position:fixed; bottom:80px; left:50%; transform:translateX(-50%); width:90%; max-width:400px; background:#4db8ff; color:#000; padding:15px 20px; border-radius:12px; box-shadow:0 8px 24px rgba(0,0,0,0.8); z-index:9999; text-align:center; transition:all 0.3s ease; pointer-events:none; border:2px solid #fff; font-weight:bold;';
        document.body.appendChild(ov);
    }
    
    let step = (window.trackerState && window.trackerState.step) ? window.trackerState.step : 1;
    let textEn = "";
    let textEs = "";
    
    if (document.getElementById('ts-hub') && document.getElementById('ts-hub').style.display !== 'none') {
        window.TUTORIAL_MODE = false;
        ov.style.display = 'none';
        return;
    }
    
    if (step >= 8) {
        window.TUTORIAL_MODE = false;
        ov.style.display = 'none';
        return;
    } else {
        ov.style.display = 'block';
    }

    if (step === 1) {
        textEn = "Step 1: Enter player names. If you made a roster, you can select it here to load your faction. Click NEXT when ready!";
        textEs = "Paso 1: Escribe los nombres. Si creaste una lista, puedes seleccionarla aquí. ¡Toca SIGUIENTE!";
    } else if (step === 2) {
        textEn = "Step 2: Faction setup! You can browse detachments here. Click NEXT to proceed.";
        textEs = "Paso 2: ¡Facciones! Explora los destacamentos y toca SIGUIENTE.";
    } else if (step === 3) {
        textEn = "Step 3: Force Disposition. Both players choose a mission type to determine the mission.";
        textEs = "Paso 3: Ambos jugadores eligen una Disposición de Fuerza para definir la misión.";
    } else if (step === 4) {
        textEn = "Step 4: Terrain Layout. Based on your mission, here are the recommended layouts! Tap the map to enlarge it. Click NEXT.";
        textEs = "Paso 4: Terreno. ¡Aquí están los mapas recomendados! Toca el mapa para ampliar. Luego SIGUIENTE.";
    } else if (step === 5) {
        textEn = "Step 5: Roll off! The winner decides who is the Attacker and who is the Defender.";
        textEs = "Paso 5: ¡Tiren los dados! El ganador elige quién es Atacante y quién Defensor.";
    } else if (step === 6) {
        textEn = "Step 6: Review the pre-game setup summary and click START GAME!";
        textEs = "Paso 6: Revisa el resumen de la partida y toca EMPEZAR PARTIDA.";
    } else if (step === 7) {
        textEn = "Step 7: You are in the game! Tap the ⚙️ Settings icon (top right) and click 'Share Game / Live Sync' to share the live score with friends! (Tutorial Complete)";
        textEs = "Paso 7: ¡Estás en partida! Toca el ícono ⚙️ (arriba a la derecha) y 'Compartir' para enviar el enlace a tus amigos. (Tutorial Completado)";
        setTimeout(() => { if (window.TUTORIAL_MODE) { window.TUTORIAL_MODE = false; if(ov) ov.style.display = 'none'; } }, 15000);
    }
    
    let localLang = 'en';
    try { localLang = localStorage.getItem('gdm_lang') || 'en'; } catch (e) {}
    let finalText = localLang === 'es' ? textEs : textEn;
    
    ov.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.8rem; text-transform:uppercase; opacity:0.8; margin-bottom:4px; letter-spacing:1px;">
        <span><i class="fa-solid fa-graduation-cap"></i> ${localLang === 'es' ? 'Tutorial Interactivo' : 'Interactive Tutorial'}</span>
        <i class="fa-solid fa-xmark" style="cursor:pointer; font-size:1.1rem; padding:4px;" onclick="window.TUTORIAL_MODE = false; document.getElementById('tutorial-overlay').style.display = 'none';"></i>
    </div>${finalText}`;
}

// Wrap navTracker to update the overlay
if (typeof window.navTracker === 'function' && !window.navTracker.__tutWrapped) {
    const _origNav = window.navTracker;
    window.navTracker = function(dir) {
        const ret = _origNav.apply(this, arguments);
        if (typeof updateTutorialOverlay === 'function') updateTutorialOverlay();
        return ret;
    };
    window.navTracker.__tutWrapped = true;
}
