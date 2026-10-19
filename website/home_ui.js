/* Home screen structure (no logic): hero tagline, three quick tiles, collapsible faction list. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const S = (en, es) => lang() === 'es' ? es : en;
    const KEY = 'bl_factions_open';
    const get = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } };
    const set = v => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch (e) {} };
    function build() {
        const home = document.getElementById('view-home'); if (!home) return;
        const ov = home.querySelector('.home-header-overlay');
        if (ov && !ov.querySelector('.home-title')) {
            const t = document.createElement('div'); t.innerHTML = `<h1 class="home-title">Iron <span>&amp; Wrath</span></h1><div class="home-sub">${S('Rosters · Games · League', 'Ejércitos · Partidas · Liga')}</div>`; ov.prepend(t);
            ov.style.flexDirection = 'column'; ov.style.alignItems = 'center';
        }
        if (!document.getElementById('home-actions')) {
            const a = document.createElement('div'); a.id = 'home-actions';
            a.innerHTML = [
                ['switchView(\'tracker\')', 'fa-chess-board', 'var(--accent)', S('Game Tracker', 'Game Tracker')],
                ['openTournamentLists()', 'fa-trophy', '#e5c15a', S('Lists', 'Listas')],
                ['openDatasheetIndex()', 'fa-book-open', '#3d8bff', S('Datasheets', 'Datasheets')]
            ].map(([f, ic, c, l]) => `<button class="home-tile" onclick="${f}"><i class="fa-solid ${ic}" style="color:${c}"></i><span>${l}</span></button>`).join('');
            const hero = home.querySelector('.home-header-card'); hero.after(a);
        }
        if (!document.getElementById('factions-toggle')) {
            const b = document.createElement('button'); b.id = 'factions-toggle'; b.onclick = () => { home.classList.toggle('factions-open'); set(home.classList.contains('factions-open')); label(); if (window.OFFLINE_PAINT) OFFLINE_PAINT(); };
            home.appendChild(b);
        }
        if (!document.getElementById('home-fan-footer')) {
            const f = document.createElement('div'); f.id = 'home-fan-footer'; f.style.cssText = 'text-align:center; color:#667; font-size:0.74rem; line-height:1.5; padding:18px 20px 30px;';
            f.innerHTML = `${esc(S((window.FAN_NOTICE || {}).en || 'Iron & Wrath companion app.', (window.FAN_NOTICE || {}).es || 'App complementaria de Iron & Wrath.'))} <a href="#about" onclick="switchView('about'); return false;" style="color:var(--accent); text-decoration:underline;">${S('About', 'Acerca de')}</a>`;
            home.appendChild(f);
        }
        if (get() || !navigator.onLine) home.classList.add('factions-open');
        label();
    }
    function label() {
        const b = document.getElementById('factions-toggle'), home = document.getElementById('view-home'); if (!b) return;
        const n = (typeof FACTIONS !== 'undefined' ? FACTIONS.length : 0); let saved = 0; try { saved = Object.keys(JSON.parse(localStorage.getItem('bl_offline_factions') || '{}')).length; } catch (e) {}
        const open = home.classList.contains('factions-open');
        b.innerHTML = `<i class="fa-solid fa-book-skull" style="color:var(--text-muted)"></i><span>${open ? S('Hide factions', 'Ocultar facciones') : S('Browse factions', 'Ver facciones')}</span><span class="count">${n}${saved ? ' · ' + saved + ' ' + S('offline', 'sin conexión') : ''}</span><i class="fa-solid fa-chevron-down chev"></i>`;
    }
    document.addEventListener('DOMContentLoaded', () => { build(); setTimeout(build, 600); });
    const base = window.switchView; window.switchView = function (v, p) { base(v, p); if (v === 'home') setTimeout(label, 120); };
    window.addEventListener('online', label); window.addEventListener('offline', () => { const h = document.getElementById('view-home'); if (h) h.classList.add('factions-open'); label(); });
})();
