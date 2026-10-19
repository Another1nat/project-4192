/* Terrain AR viewer, shared by ar.html and the game tracker's 3D / AR button.
   It shows the 3D model of a terrain layout (assets/ar/<CODE>.glb) and opens the phone's own AR viewer:
     iPhone/iPad  -> AR Quick Look (assets/ar/<CODE>.usdz)      Android -> Scene Viewer / WebXR (the .glb)
   Both anchor the model to the real floor/table at true size (1 inch = 25.4 mm) — no marker, no tracking code of ours.
   The model viewer library (assets/vendor/model-viewer.min.js, ~0.9 MB) is only loaded when this is first opened. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const FD = {};   // layout code -> [English name, Spanish name]
    const fdName = c => (FD[c] || [c, c])[lang() === 'es' ? 1 : 0];
    const MODEL_V = 14;   // bump when the models in assets/ar/ are rebuilt, so phones fetch the new ones instead of a cached copy
    let mvP = null, indexP = null;

    function ensureViewer() {
        if (window.customElements && customElements.get('model-viewer')) return Promise.resolve();
        return mvP = mvP || new Promise((res, rej) => { const s = document.createElement('script'); s.type = 'module'; s.src = 'assets/vendor/model-viewer.min.js'; s.onload = () => customElements.whenDefined('model-viewer').then(res); s.onerror = () => { mvP = null; rej(new Error('viewer')); }; document.head.appendChild(s); });
    }
    function loadIndex() { return indexP = indexP || fetch('data/ar_index.json?v=' + MODEL_V).then(r => r.json()).catch(() => { indexP = null; return {}; }); }
    // find the layout for two Force Dispositions (the 45 layouts are per unordered pair x A/B/C)
    function resolve(index, a, d, v) { v = v || 'A'; return [`${a}-${d}-${v}`, `${d}-${a}-${v}`].find(c => index[c]) || null; }

    function injectCss() {
        if (document.getElementById('arv-css')) return; const st = document.createElement('style'); st.id = 'arv-css';
        st.textContent = `.arv{position:relative;width:100%;background:radial-gradient(#243040,#0b0f14);border:1px solid #2a3546;border-radius:14px;overflow:hidden}
        .arv model-viewer{width:100%;height:100%;--poster-color:transparent}
        .arv-bar{position:absolute;left:10px;right:10px;top:10px;display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;pointer-events:none}
        .arv-btn{pointer-events:auto;min-height:44px;padding:0 14px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(11,18,32,.82);color:#fff;font-weight:700;font-size:.9rem;cursor:pointer}
        .arv-ar{position:absolute;left:12px;right:12px;bottom:12px;min-height:56px;border:none;border-radius:14px;background:linear-gradient(135deg,#16a34a,#22c55e);color:#04210f;font-weight:800;font-size:1.05rem;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.45)}
        .arv-ar[disabled]{background:#2a3546;color:#8c99b0;box-shadow:none}
        .arv-note{color:#9aa7b8;font-size:.82rem;line-height:1.5;margin:10px 2px}
        .arv-loading{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#9aa7b8;font-size:.95rem;pointer-events:none}
        .arv-walls{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 2px 0}.arv-wl{color:#9aa7b8;font-size:.76rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;margin-right:2px}
        .arv-seg{min-height:44px;padding:0 14px;border-radius:12px;border:1px solid #2a3546;background:#10161e;color:#e6edf8;font-weight:700;font-size:.9rem;cursor:pointer}.arv-seg.on{background:rgba(34,197,94,.16);border-color:#22c55e;color:#86efac}
        .arv-wn{flex-basis:100%;color:#8c99b0;font-size:.8rem;line-height:1.45}
        .arv-tabs{display:flex;gap:6px;margin-bottom:10px;background:#10161e;border:1px solid #2a3546;border-radius:14px;padding:4px}
        .arv-tab{flex:1;min-height:46px;border:none;border-radius:10px;background:transparent;color:#9aa7b8;font-weight:800;font-size:.95rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}
        .arv-tab.on{background:#22c55e;color:#04210f}
        .arv-2d-frame{position:relative;width:100%;background:#fff;border:1px solid #2a3546;border-radius:14px;overflow:auto;-webkit-overflow-scrolling:touch}
        .arv-2d-frame img{display:block;width:100%;height:auto}
        .arv-2d-frame.zoom img{width:200%;max-width:none}
        .arv-2d-frame.rot{aspect-ratio:44/60;overflow:hidden}
        .arv-2d-frame.rot img{position:absolute;left:50%;top:50%;width:136.3636%;max-width:none;transform:translate(-50%,-50%) rotate(90deg)}
        .arv-2d-bar{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .arv-tbl{width:100%;border-collapse:collapse;font-size:.85rem;color:#cfd8e3}.arv-tbl td,.arv-tbl th{padding:6px 8px;border-top:1px solid #243044;text-align:left}.arv-tbl th{color:#8c99b0;font-weight:600}`;
        document.head.appendChild(st);
    }

    async function mount(el, code, opts) {
        opts = opts || {}; injectCss(); const index = await loadIndex(); const L = index[code];
        if (!L) { el.innerHTML = `<div class="arv-note">${esc(S('That layout was not found.', 'No se encontró esa disposición.'))}</div>`; return null; }
        el.innerHTML = `<div class="arv" style="height:${opts.height || '62vh'};min-height:340px;"><div class="arv-loading">${esc(S('Loading 3D map…', 'Cargando mapa 3D…'))}</div></div>`;
        const box = el.querySelector('.arv');
        try { await ensureViewer(); } catch (e) { box.innerHTML = `<div class="arv-loading">${esc(S('The 3D viewer could not load. Check your connection and try again.', 'No se pudo cargar el visor 3D. Revisa tu conexión e inténtalo de nuevo.'))}</div>`; return null; }
        const mv = document.createElement('model-viewer');
        const set = (k, v) => mv.setAttribute(k, v);
        // wall style = which model file: the phones' AR viewers have no transparency slider, so the opacity is chosen here before opening AR
        const WALLS = [['min', '-min', S('Placing', 'Colocar')], ['see', '', S('See-through', 'Translúcidas')], ['solid', '-solid', S('Solid', 'Sólidas')], ['flat', '-flat', S('No walls', 'Sin paredes')]];
        let style = 'see'; try { const v = localStorage.getItem('bl_ar_walls'); if (WALLS.some(w => w[0] === v)) style = v; } catch (e) {}
        const files = () => { const sx = WALLS.find(w => w[0] === style)[1]; set('src', `assets/ar/${code}${sx}.glb?v=${MODEL_V}`); set('ios-src', `assets/ar/${code}${sx}.usdz?v=${MODEL_V}`); };
        files(); set('alt', `${L.title}`);
        set('ar', ''); set('ar-modes', 'scene-viewer quick-look webxr'); set('ar-scale', 'fixed'); set('ar-placement', 'floor');
        set('camera-controls', ''); set('touch-action', 'pan-y'); set('shadow-intensity', '0'); set('exposure', '1'); set('tone-mapping', 'neutral'); set('environment-image', 'legacy');   // legacy light + neutral tone mapping: black walls stay dark, red/yellow lines keep their colour set('interaction-prompt', 'none'); set('loading', 'eager'); set('reveal', 'auto');
        set('camera-orbit', '25deg 58deg 1.9m'); set('field-of-view', '35deg'); set('min-camera-orbit', 'auto 0deg 0.4m'); set('max-camera-orbit', 'auto 90deg 3.5m');
        const btn = document.createElement('button'); btn.slot = 'ar-button'; btn.className = 'arv-ar'; btn.innerHTML = `<span style="font-size:1.3rem">📱</span> ${esc(S('View on my table (AR)', 'Ver en mi mesa (RA)'))}`; mv.appendChild(btn);
        box.innerHTML = ''; box.appendChild(mv);
        const bar = document.createElement('div'); bar.className = 'arv-bar';
        let top = false; const home = '25deg 58deg 1.9m';
        const topLbl = () => S('Top view', 'Desde arriba');   // camera from above (the flat map itself is the 2D tab)
        const b2 = document.createElement('button'); b2.className = 'arv-btn'; b2.textContent = topLbl();
        b2.onclick = () => { top = !top; mv.cameraOrbit = top ? '0deg 1deg 1.55m' : home; b2.textContent = top ? '3D' : topLbl(); };
        const br = document.createElement('button'); br.className = 'arv-btn'; br.textContent = S('Reset', 'Restablecer'); br.onclick = () => { top = false; b2.textContent = topLbl(); mv.cameraOrbit = home; mv.fieldOfView = '35deg'; mv.jumpCameraToGoal && mv.jumpCameraToGoal(); };
        bar.append(b2, br); (opts.extraButtons || []).forEach(x => bar.append(x)); box.appendChild(bar);
        const row = document.createElement('div'); row.className = 'arv-walls'; row.innerHTML = `<span class="arv-wl">${esc(S('View', 'Vista'))}</span>`;
        WALLS.forEach(([k, , t]) => { const b = document.createElement('button'); b.className = 'arv-seg' + (k === style ? ' on' : ''); b.textContent = t;
            b.onclick = () => { style = k; try { localStorage.setItem('bl_ar_walls', k); } catch (e) {} row.querySelectorAll('.arv-seg').forEach(x => x.classList.toggle('on', x === b)); files(); }; row.appendChild(b); });
        row.insertAdjacentHTML('beforeend', `<div class="arv-wn">${esc(S('Choose before opening AR. "Placing" draws only thin outlines on the table (no grid, labels or 3D), so it sits on the table and barely covers your real terrain: best while setting up. The others add the grid, measurements, labels and walls to check the layout. On iPhones without LiDAR (non-Pro), point at the mat for a few seconds and move slowly before placing; good light helps it sit flat.', 'Elige antes de abrir la RA. "Colocar" dibuja solo contornos finos sobre la mesa (sin cuadrícula, etiquetas ni 3D), así queda pegado a la mesa y casi no tapa tu terreno real: lo mejor para montar. Las demás agregan cuadrícula, medidas, etiquetas y paredes para revisar la disposición. En iPhone sin LiDAR (no Pro), apunta al tapete unos segundos y muévete despacio antes de colocar; con buena luz queda más plano.'))}</div>`);
        el.appendChild(row);
        mv.addEventListener('load', () => { if (!mv.canActivateAR) box.insertAdjacentHTML('beforeend', `<div style="position:absolute;left:12px;right:12px;bottom:12px;padding:12px 14px;border-radius:12px;background:rgba(11,18,32,.88);border:1px solid #2a3546;color:#cfd8e3;font-size:.88rem;line-height:1.4;">${esc(S('AR opens on an iPhone (Safari) or an Android phone (Chrome) — open this page on your phone. You can still turn and zoom the map here.', 'La RA se abre en un iPhone (Safari) o un teléfono Android (Chrome): abre esta página en tu teléfono. Aquí puedes girar y acercar el mapa.'))}</div>`); });
        mv.addEventListener('error', () => { box.insertAdjacentHTML('beforeend', `<div class="arv-loading" style="background:rgba(11,15,20,.8)">${esc(S('The 3D model could not be loaded.', 'No se pudo cargar el modelo 3D.'))}</div>`); });
        if (!opts.compact) {
            const rows = L.pieces.map(p => `<tr><td><b>${esc(p.code)}</b></td><td>${esc(lang() === 'es' && p.kind_es ? p.kind_es : p.kind)}</td><td>${p.size_in[0]} × ${p.size_in[1]} in${p.narrow_end_in ? ` (${p.narrow_end_in} in ${esc(S('end', 'extremo'))})` : ''}</td><td>${p.height_in != null ? p.height_in + ' in' : ''}</td><td>${p.from_left_in != null ? p.from_left_in : ''}</td><td>${p.from_front_in != null ? p.from_front_in : ''}</td></tr>`).join('');
            el.insertAdjacentHTML('beforeend', `<div class="arv-note">${S('Scale is locked to real size (1 inch = 25.4 mm). In AR: point the camera at the floor or table, tap to place, then drag with one finger and twist with two until the yellow corner marks sit on the corners of your mat and the green cross (the short pole marked CENTER) sits on the centre of the table. <b>Grid</b>: each square is 1 inch; every 5th line is bold; the yellow numbers on all four edges count inches (along the front and back from the left edge, along the sides from the front edge). <b>Green</b>: the layout\'s own distances, on both halves of the table, if you want to check with a tape. <b>Pieces</b>: each footprint is drawn at its standard size, light grey with a thin red edge; set your terrain so its edge sits on the red line. The black walls, floors and barricades show where the layout puts them. Each label (next to its piece) gives the letter, size, type and height. <b>Objectives</b>: a pole with a lit sign marks each one: yellow = neutral, red = red side home, blue = blue side home, with its 3\" control ring on the floor.', 'La escala está fijada al tamaño real (1 pulgada = 25.4 mm). En RA: apunta la cámara al suelo o la mesa, toca para colocar, y arrastra con un dedo y gira con dos hasta que las marcas amarillas de las esquinas coincidan con las esquinas de tu tapete y la cruz verde (el poste corto marcado CENTER) quede en el centro de la mesa. <b>Cuadrícula</b>: cada cuadro mide 1 pulgada; cada 5.ª línea es gruesa; los números amarillos de los cuatro bordes cuentan pulgadas (por delante y detrás desde el borde izquierdo, por los lados desde el frente). <b>Verde</b>: las distancias de la propia disposición, en ambas mitades de la mesa, por si quieres comprobar con cinta. <b>Piezas</b>: cada huella tiene su tamaño estándar, gris claro con un borde rojo fino; coloca tu terreno con su borde sobre la línea roja. Las paredes, pisos y barricadas negras muestran dónde las pone la disposición. Cada etiqueta (junto a su pieza) da la letra, tamaño, tipo y altura. <b>Objetivos</b>: un poste con un letrero iluminado marca cada uno: amarillo = neutral, rojo = casa del lado rojo, azul = casa del lado azul, con su anillo de control de 3\" en el suelo.')}</div>
                <details class="arv-note"><summary style="cursor:pointer;color:#cfd8e3;font-weight:700;">${esc(S('Piece sizes and positions', 'Tamaño y posición de las piezas'))}</summary><table class="arv-tbl"><tr><th></th><th>${esc(S('Type', 'Tipo'))}</th><th>${esc(S('Footprint', 'Huella'))}</th><th>${esc(S('Height', 'Altura'))}</th><th>${esc(S('From left', 'Desde izq.'))}</th><th>${esc(S('From front', 'Desde frente'))}</th></tr>${rows}</table></details>`);
        }
        return { mv, code, layout: L };
    }
    // release the 3D model and WebGL memory (iPhone Safari gets sluggish / stuck if viewers pile up)
    function dispose(el) {
        try { (el || document).querySelectorAll('model-viewer').forEach(m => { try { m.dismissPoster && m.dismissPoster(); m.removeAttribute('src'); m.removeAttribute('ios-src'); } catch (e) {} m.remove(); }); } catch (e) {}
    }
    // the flat printed-style map (assets/layouts_svg/<CODE>.svg): instant, no 3D needed. Rotate fills a phone held upright; Zoom doubles it (scroll to pan).
    async function mount2d(el, code) {
        injectCss(); const index = await loadIndex(), L = index[code];
        let rot = false; try { rot = localStorage.getItem('bl_map_rot') === '1'; } catch (e) {}
        el.innerHTML = `<div class="arv-2d-frame${rot ? ' rot' : ''}"><img alt="${esc(L ? L.title : code)}" src="assets/layouts_svg/${esc(code)}.svg"></div>
            <div class="arv-2d-bar"><button type="button" class="arv-seg" data-a="rot">${esc(S('Rotate', 'Girar'))}</button><button type="button" class="arv-seg" data-a="zoom">${esc(S('Zoom', 'Ampliar'))}</button></div>`;
        const fr = el.querySelector('.arv-2d-frame'), bz = el.querySelector('[data-a="zoom"]'), br = el.querySelector('[data-a="rot"]');
        const sync = () => { br.classList.toggle('on', fr.classList.contains('rot')); bz.classList.toggle('on', fr.classList.contains('zoom')); bz.style.display = fr.classList.contains('rot') ? 'none' : ''; };
        br.onclick = () => { fr.classList.toggle('rot'); fr.classList.remove('zoom'); try { localStorage.setItem('bl_map_rot', fr.classList.contains('rot') ? '1' : '0'); } catch (e) {} sync(); };
        bz.onclick = () => { fr.classList.toggle('zoom'); sync(); };
        el.querySelector('img').onerror = () => { fr.outerHTML = `<div class="arv-note">${esc(S('The map could not be loaded.', 'No se pudo cargar el mapa.'))}</div>`; };
        sync();
        return L ? { code, layout: L } : null;
    }
    // one viewer for every place that shows a layout: "2D map" and "3D & AR" tabs (the last tab used is remembered)
    async function browse(el, code, opts) {
        opts = opts || {}; injectCss();
        let tab = opts.tab; if (!tab) { try { tab = localStorage.getItem('bl_layout_tab'); } catch (e) {} }
        if (tab !== '3d') tab = '2d';
        dispose(el);
        el.innerHTML = `<div class="arv-tabs" role="tablist"><button type="button" class="arv-tab" data-t="2d">🗺️ ${esc(S('2D map', 'Mapa 2D'))}</button><button type="button" class="arv-tab" data-t="3d">📱 ${esc(S('3D & AR', '3D y RA'))}</button></div><div class="arv-pane"></div>`;
        const pane = el.querySelector('.arv-pane'); let token = 0;
        const show = async t => {
            const my = ++token; tab = t; try { localStorage.setItem('bl_layout_tab', t); } catch (e) {}
            el.querySelectorAll('.arv-tab').forEach(b => { const on = b.dataset.t === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
            dispose(pane);
            const r = t === '3d' ? await mount(pane, code, opts) : await mount2d(pane, code);
            if (my === token && opts.onShow) opts.onShow(t, r);
            return r;
        };
        el.querySelectorAll('.arv-tab').forEach(b => b.onclick = () => { if (b.dataset.t !== tab) show(b.dataset.t); });
        return show(tab);
    }
    window.ARVIEW = { dispose, mount, mount2d, browse, resolve, loadIndex, fdName, FD, ensureViewer };
})();

// Coming back from the phone's AR viewer (or the browser's back/forward cache) can leave the page frozen: unlock it.
(function () {
    function unfreeze() {
        try {
            const open = !!document.getElementById('modal-3d-layout-viewer');   // the layout window keeps the page behind it still
            document.body.style.overflow = open ? 'hidden' : ''; document.body.style.pointerEvents = ''; document.documentElement.style.overflow = '';
        } catch (e) {}
    }
    window.addEventListener('pageshow', e => {
        if (e.persisted && document.getElementById('modal-3d-layout-viewer') && window.close3DLayoutModal) window.close3DLayoutModal();   // restored from the back/forward cache: start clean
        unfreeze();
    });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) unfreeze(); });
})();
