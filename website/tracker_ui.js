/* Game tracker setup — Force Disposition step as player tabs (phone friendly) + primary mission cards with a View button. Presentation only. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const $ = id => document.getElementById(id);
    let tab = 1;
    const ts = () => window.trackerState || (typeof trackerState !== 'undefined' ? trackerState : null);
    const FDN = s => s ? String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '';
    function paint() {
        const t = ts(), box = $('ts-fd-tabs'); if (!t || !box) return;
        const col = n => n === 1 ? '#4db8ff' : '#ff4d4d';
        box.innerHTML = [1, 2].map(n => { const p = n === 1 ? t.p1 : t.p2, fd = p.forceDisp; return `<button type="button" class="fd-tab${tab === n ? ' on' : ''}" style="--c:${col(n)}" onclick="TRK.fdTab(${n})"><b>${String(p.name || 'PLAYER ' + n).toUpperCase()}</b><small>${fd ? FDN(fd) : S('Choose…', 'Elegir…')}</small></button>`; }).join('');
        document.querySelectorAll('#ts-3 .fd-col').forEach(c => c.classList.toggle('fd-hide', +c.dataset.p !== tab));
        document.querySelectorAll('.fd-vt').forEach(x => x.textContent = S('View', 'Ver'));
        document.querySelectorAll('.fd-pt').forEach(x => x.textContent = S('PRIMARY', 'PRIMARIA'));
    }
    window.TRK = {
        fdTab: n => { tab = n; paint(); },
        viewPrimary: n => { const name = (($('ts-p' + n + '-primary-name') || {}).textContent || '').trim(); if (name && window.MSHEET) MSHEET.open('primary', name); },
        paint
    };
    function wrap() {
        if (typeof window.renderForceDispositionStep === 'function' && !window.renderForceDispositionStep.__t) {
            const o = window.renderForceDispositionStep; window.renderForceDispositionStep = function () { const r = o.apply(this, arguments); paint(); return r; }; window.renderForceDispositionStep.__t = 1;
        }
        if (typeof window.selectFD === 'function' && !window.selectFD.__t) {
            const o = window.selectFD; window.selectFD = function (n, fd) {
                const r = o.apply(this, arguments); const t = ts(); const other = n === 1 ? 2 : 1, op = other === 1 ? t.p1 : t.p2;
                if (!op.forceDisp) tab = other;   // move on to the other player
                paint(); return r;
            }; window.selectFD.__t = 1;
        }
    }
    setInterval(wrap, 800); wrap();
})();
