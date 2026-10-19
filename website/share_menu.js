/* Small "Share" popover: WhatsApp (PDF) or any other app. The actual PDF export lives in missions_ui.js / rules_ui.js. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    function close() { const m = document.getElementById('share-menu'); if (m) m.remove(); document.removeEventListener('click', away, true); }
    function away(e) { const m = document.getElementById('share-menu'); if (m && !m.contains(e.target)) close(); }
    window.SHAREMENU = {
        open(anchor, tpl) {
            close(); const m = document.createElement('div'); m.id = 'share-menu'; m.setAttribute('role', 'menu');
            const item = (mode, ic, t, sub) => `<button type="button" role="menuitem" data-m="${mode}"><i class="${ic}"></i><span><b>${t}</b><small>${sub}</small></span></button>`;
            m.innerHTML = item('whatsapp', 'fa-brands fa-whatsapp', 'WhatsApp', S('Send the PDF', 'Enviar el PDF')) + item('share', 'fa-solid fa-share-nodes', S('More apps…', 'Más apps…'), S('Mail, Drive, AirDrop…', 'Correo, Drive, AirDrop…'));
            document.body.appendChild(m);
            const r = anchor.getBoundingClientRect(), w = Math.min(280, innerWidth - 24); m.style.width = w + 'px';
            m.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + 'px';
            const h = m.offsetHeight, below = r.bottom + 8 + h < innerHeight; m.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
            m.querySelectorAll('button').forEach(b => b.onclick = () => { const mode = b.dataset.m; close(); (new Function('btn', tpl.replace('MODE', mode).replace('this', 'btn')))(anchor); });
            setTimeout(() => document.addEventListener('click', away, true), 0);
        },
        // generic menu: items = [{ic, t, sub, fn}]
        openItems(anchor, items) {
            close(); const m = document.createElement('div'); m.id = 'share-menu'; m.setAttribute('role', 'menu');
            m.innerHTML = items.map((x, i) => `<button type="button" role="menuitem" data-i="${i}"><i class="${x.ic}"></i><span><b>${x.t}</b><small>${x.sub || ''}</small></span></button>`).join('');
            document.body.appendChild(m);
            const r = anchor.getBoundingClientRect(), w = Math.min(290, innerWidth - 24); m.style.width = w + 'px';
            m.style.left = Math.max(12, Math.min(innerWidth - w - 12, r.right - w)) + 'px';
            const h = m.offsetHeight, below = r.bottom + 8 + h < innerHeight; m.style.top = (below ? r.bottom + 8 : Math.max(8, r.top - h - 8)) + 'px';
            m.querySelectorAll('button').forEach(b => b.onclick = () => { const x = items[+b.dataset.i]; close(); x.fn(anchor); });
            setTimeout(() => document.addEventListener('click', away, true), 0);
        },
        close
    };
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();
