/* "Report a bug / suggest an idea": burger-menu button -> small form (text + optional screenshot) -> Supabase submit_report().
   The admin reads them in Admin -> Reports. A report that cannot be sent (offline) is kept on the device and sent later. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const $ = id => document.getElementById(id);
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const sb = () => window.LEAGUE_CORE && window.LEAGUE_CORE.sb && window.LEAGUE_CORE.sb();
    const QK = 'bl_report_queue', DK = 'bl_report_draft';
    const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }, del: k => { try { localStorage.removeItem(k); } catch (e) {} } };
    let st = { kind: 'bug', msg: '', contact: '', image: null, busy: false, err: '', done: false, queued: false };
    const ver = () => { const m = /app\.js\?v=(\d+)/.exec(Array.from(document.scripts).map(s => s.src).join(' ')); return (m && m[1]) || ''; };
    const meta = () => ({ page: (location.hash || '#home').slice(0, 120) + ' | ' + ((document.querySelector('.view.active') || {}).id || ''), v: ver(), ua: navigator.userAgent, w: innerWidth, h: innerHeight, lang: lang(), online: navigator.onLine, standalone: !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) });

    // shrink a screenshot to a small JPEG (max 1280 px, ~100-250 KB) so it fits comfortably in the free database
    function shrink(file) {
        return new Promise((res, rej) => {
            const url = URL.createObjectURL(file), im = new Image();
            im.onload = () => {
                const k = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
                c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
                const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
                let q = 0.78, d = c.toDataURL('image/jpeg', q); while (d.length > 600000 && q > 0.35) { q -= 0.1; d = c.toDataURL('image/jpeg', q); }
                d.length > 850000 ? rej(new Error(S('That image is too large.', 'La imagen es demasiado grande.'))) : res(d);
            };
            im.onerror = () => { URL.revokeObjectURL(url); rej(new Error(S('Could not read that image.', 'No se pudo leer esa imagen.'))); };
            im.src = url;
        });
    }
    function ensure() {
        if ($('br-root')) return;
        const m = document.createElement('div'); m.id = 'br-root'; m.innerHTML = '<div class="br-card" role="dialog" aria-label="Report"></div>';
        m.onclick = e => { if (e.target === m) BUG.close(); }; document.body.appendChild(m);
    }
    function render() {
        const m = $('br-root'); if (!m) return; const c = m.querySelector('.br-card');
        if (st.done) { c.innerHTML = `<div class="br-ok"><i class="fa-solid fa-circle-check"></i><h3>${st.queued ? S('Saved on this device', 'Guardado en este dispositivo') : S('Thank you!', '¡Gracias!')}</h3><p>${st.queued ? S('There is no connection right now. It will be sent automatically when you are back online.', 'No hay conexión ahora. Se enviará automáticamente cuando vuelvas a tener internet.') : S('Your message was sent. It helps a lot.', 'Tu mensaje fue enviado. Ayuda muchísimo.')}</p><button class="br-go" onclick="BUG.close()">${S('Close', 'Cerrar')}</button></div>`; return; }
        c.innerHTML = `<div class="br-top"><b>${S('Report a bug or suggest an idea', 'Reportar un error o proponer una mejora')}</b><button class="br-x" onclick="BUG.close()" aria-label="Close">✕</button></div>
            <div class="br-seg" role="group"><button class="${st.kind === 'bug' ? 'on' : ''}" onclick="BUG.kind('bug')"><i class="fa-solid fa-bug"></i> ${S('Bug', 'Error')}</button><button class="${st.kind === 'idea' ? 'on' : ''}" onclick="BUG.kind('idea')"><i class="fa-regular fa-lightbulb"></i> ${S('Idea', 'Mejora')}</button></div>
            <textarea id="br-msg" maxlength="4000" rows="6" placeholder="${st.kind === 'bug' ? S('What happened? What did you expect? Which screen were you on?', '¿Qué pasó? ¿Qué esperabas? ¿En qué pantalla estabas?') : S('What would make Project 4192 better for you?', '¿Qué haría Project 4192 mejor para ti?')}" oninput="BUG.set('msg', this.value)">${esc(st.msg)}</textarea>
            <div class="br-img">${st.image ? `<div class="br-prev"><img src="${st.image}" alt=""><button onclick="BUG.noImg()" aria-label="remove">✕</button></div>` : `<label class="br-att"><i class="fa-solid fa-image"></i> ${S('Add a screenshot (optional)', 'Agregar captura (opcional)')}<input type="file" accept="image/*" onchange="BUG.pick(this)" hidden></label>`}</div>
            <input id="br-contact" class="br-in" maxlength="200" placeholder="${S('Email or name so I can reply (optional)', 'Correo o nombre para responderte (opcional)')}" value="${esc(st.contact)}" oninput="BUG.set('contact', this.value)" autocomplete="off">
            <div class="br-note">${S('Sent with the screen name, app version and device type to help find the problem. No passwords or rosters.', 'Se envía con el nombre de la pantalla, la versión de la app y el tipo de dispositivo para ayudar a encontrar el problema. Sin contraseñas ni listas.')}</div>
            ${st.err ? `<div class="br-err">${esc(st.err)}</div>` : ''}
            <button class="br-go" onclick="BUG.send()" ${st.busy ? 'disabled' : ''}>${st.busy ? '<i class="fa-solid fa-spinner fa-spin"></i> ' + S('Sending…', 'Enviando…') : '<i class="fa-solid fa-paper-plane"></i> ' + S('Send', 'Enviar')}</button>`;
    }
    const isNet = e => !navigator.onLine || /fetch|network|Failed to|load failed/i.test(String((e && e.message) || e));
    async function submit(rep) {
        const c = sb(); if (!c) throw new Error(S('Reports are not available right now.', 'Los reportes no están disponibles por ahora.'));
        const { error } = await c.rpc('submit_report', { p_kind: rep.kind, p_message: rep.message, p_image: rep.image || null, p_contact: rep.contact || null, p_meta: rep.meta });
        if (error) throw new Error(error.message);
    }
    const queue = () => { try { return JSON.parse(ls.get(QK) || '[]'); } catch (e) { return []; } };
    async function flush() {
        const q = queue(); if (!q.length || !navigator.onLine || !sb()) return;
        const rest = []; for (const r of q) { try { await submit(r); } catch (e) { if (isNet(e)) rest.push(r); } }
        ls.set(QK, JSON.stringify(rest));
    }
    window.BUG = {
        open() { ensure(); try { const d = JSON.parse(ls.get(DK) || 'null'); if (d && !st.msg) st = Object.assign(st, d, { busy: false, err: '', done: false }); } catch (e) {} st.done = false; st.err = ''; $('br-root').classList.add('open'); render(); const t = $('br-msg'); if (t) setTimeout(() => t.focus(), 120); },
        close() { const m = $('br-root'); if (m) m.classList.remove('open'); if (st.done) st = { kind: 'bug', msg: '', contact: '', image: null, busy: false, err: '', done: false, queued: false }; },
        kind(k) { st.kind = k; render(); },
        set(k, v) { st[k] = v; ls.set(DK, JSON.stringify({ kind: st.kind, msg: st.msg, contact: st.contact })); },
        noImg() { st.image = null; render(); },
        async pick(inp) { const f = inp.files && inp.files[0]; if (!f) return; try { st.image = await shrink(f); st.err = ''; } catch (e) { st.err = e.message; } render(); },
        async send() {
            if (st.busy) return; const message = (st.msg || '').trim();
            if (message.length < 3) { st.err = S('Please write a short description.', 'Escribe una descripción breve.'); render(); return; }
            st.busy = true; st.err = ''; render();
            const rep = { kind: st.kind, message, image: st.image, contact: (st.contact || '').trim(), meta: meta() };
            try { await submit(rep); st.done = true; st.queued = false; ls.del(DK); }
            catch (e) {
                if (isNet(e)) { const q = queue(); q.push(rep); try { ls.set(QK, JSON.stringify(q.slice(-5))); st.done = true; st.queued = true; ls.del(DK); } catch (e2) { st.err = S('Could not save it on this device.', 'No se pudo guardar en este dispositivo.'); } }
                else st.err = e.message;
            }
            st.busy = false; render();
        },
        flush
    };
    window.addEventListener('online', () => setTimeout(flush, 800));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') BUG.close(); });
    setTimeout(flush, 4000);
})();
