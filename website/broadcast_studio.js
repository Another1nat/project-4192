/* Iron & Wrath Streamer Studio: Mobile "Mini-OBS" broadcasting engine for tabletop games.
   Streams 1080p rear camera, live VP & CP scores, and 3D terrain layouts to OBS Studio & private spectator links.
   Uses Supabase Realtime for zero-server WebRTC signaling & score telemetry. $0 bandwidth cost. */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let mediaStream = null;
    const peers = new Map();
    let wakeLock = null;
    let pushTimer = null;
    let isTorchOn = false;
    let isMuted = false;
    let isBroadcasting = false;
    let videoDevices = [];
    let curCameraIndex = 0;
    let realtimeChannel = null;

    const sbClient = () => {
        if (window.LEAGUE_CORE && window.LEAGUE_CORE.sb) return window.LEAGUE_CORE.sb();
        if (window.LEAGUE_CONFIG && window.supabase) return supabase.createClient(window.LEAGUE_CONFIG.url, window.LEAGUE_CONFIG.anonKey);
        return null;
    };

    function getRoomId() {
        if (window.trackerState && window.trackerState.shareCode) {
            return 'wtc-' + window.trackerState.shareCode.toLowerCase();
        }
        let r = localStorage.getItem('bl_stream_room');
        if (!r) {
            r = 'wtc-' + Math.random().toString(36).substring(2, 8);
            try { localStorage.setItem('bl_stream_room', r); } catch (e) {}
        }
        return r;
    }

    const settings = {
        showScores: true,
        showCp: true,
        showSecondaries: true,
        show3dMap: false
    };

    function loadSettings() {
        try {
            const s = JSON.parse(localStorage.getItem('bl_stream_settings') || '{}');
            Object.assign(settings, s);
        } catch (e) {}
    }
    function saveSettings() {
        try { localStorage.setItem('bl_stream_settings', JSON.stringify(settings)); } catch (e) {}
    }

    async function acquireWakeLock() {
        try {
            if ('wakeLock' in navigator && !wakeLock) {
                wakeLock = await navigator.wakeLock.request('screen');
                wakeLock.addEventListener('release', () => { wakeLock = null; });
            }
        } catch (e) {}
    }

    function releaseWakeLock() {
        if (wakeLock) {
            wakeLock.release().catch(() => {});
            wakeLock = null;
        }
    }

    async function enumerateCameras() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
            const devs = await navigator.mediaDevices.enumerateDevices();
            videoDevices = devs.filter(d => d.kind === 'videoinput');
        } catch (e) {}
    }

    async function startCamera(deviceId) {
        if (!window.isSecureContext && location.protocol === 'http:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
            location.replace(location.href.replace(/^http:/, 'https:'));
            throw new Error(S('Redirecting to secure HTTPS for camera access…', 'Redirigiendo a HTTPS seguro para acceder a la cámara…'));
        }

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error(S(
                'Camera access requires HTTPS. Please visit https://' + location.host,
                'El acceso a la cámara requiere HTTPS. Por favor visita https://' + location.host
            ));
        }

        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }

        await enumerateCameras();

        // Progressive constraint fallbacks for iOS Safari / Mobile (never use strict min: dims that break portrait)
        const constraintTiers = [
            // Tier 1: Rear camera with 1080p target + audio
            {
                video: deviceId ? { deviceId: { exact: deviceId } } : {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                },
                audio: true
            },
            // Tier 2: Rear camera basic + audio
            {
                video: { facingMode: { ideal: 'environment' } },
                audio: true
            },
            // Tier 3: Rear camera video ONLY (in case microphone was denied or unavailable)
            {
                video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }
            },
            // Tier 4: Any camera fallback
            {
                video: true
            }
        ];

        let lastErr = null;
        for (const c of constraintTiers) {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(c);
                if (mediaStream) break;
            } catch (err) {
                lastErr = err;
                console.warn('getUserMedia tier failed:', c, err);
            }
        }

        if (!mediaStream) {
            throw lastErr || new Error(S('Unable to access camera.', 'No se pudo acceder a la cámara.'));
        }

        await acquireWakeLock();

        const v = document.getElementById('bcast-preview');
        if (v) {
            v.muted = true;
            v.setAttribute('playsinline', '');
            v.setAttribute('webkit-playsinline', '');
            v.srcObject = mediaStream;
            v.play().catch(e => console.warn('Preview play warning:', e));
        }
        updateTorchUI();
    }

    function toggleMute() {
        if (!mediaStream) return;
        isMuted = !isMuted;
        mediaStream.getAudioTracks().forEach(t => { t.enabled = !isMuted; });
        const b = document.getElementById('bcast-btn-mute');
        if (b) b.innerHTML = isMuted ? '<i class="fa-solid fa-microphone-slash" style="color:#ef4444;"></i>' : '<i class="fa-solid fa-microphone"></i>';
    }

    async function toggleTorch() {
        if (!mediaStream) return;
        const track = mediaStream.getVideoTracks()[0];
        if (!track) return;
        try {
            const caps = track.getCapabilities ? track.getCapabilities() : {};
            if (caps.torch) {
                isTorchOn = !isTorchOn;
                await track.applyConstraints({ advanced: [{ torch: isTorchOn }] });
                const b = document.getElementById('bcast-btn-torch');
                if (b) b.style.color = isTorchOn ? '#f59e0b' : '#fff';
            } else {
                alert(S('Flashlight / Torch not supported on this lens.', 'Linterna no disponible en este lente.'));
            }
        } catch (e) {
            console.warn('Torch error:', e);
        }
    }

    function updateTorchUI() {
        const b = document.getElementById('bcast-btn-torch');
        if (!b || !mediaStream) return;
        const track = mediaStream.getVideoTracks()[0];
        const caps = track && track.getCapabilities ? track.getCapabilities() : {};
        b.style.display = caps.torch ? 'flex' : 'none';
    }

    async function cycleCamera() {
        if (videoDevices.length < 2) return;
        curCameraIndex = (curCameraIndex + 1) % videoDevices.length;
        await startCamera(videoDevices[curCameraIndex].deviceId);
        if (mediaStream) {
            const videoTrack = mediaStream.getVideoTracks()[0];
            if (videoTrack) {
                peers.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(videoTrack).catch(() => {});
                });
            }
        }
    }

    async function createPeerOffer(peerId) {
        if (!peerId) peerId = 'default';
        if (peers.has(peerId)) {
            try { peers.get(peerId).close(); } catch (e) {}
            peers.delete(peerId);
        }

        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.cloudflare.com:3478' },
                { urls: 'stun:stun.l.google.com:19302' }
            ]
        });

        if (mediaStream) {
            mediaStream.getTracks().forEach(t => pc.addTrack(t, mediaStream));
        }

        // candidates go out only after the offer, otherwise the viewer has no connection to add them to yet
        let offerSent = false;
        const earlyIce = [];
        const sendIce = c => {
            if (realtimeChannel) realtimeChannel.send({
                type: 'broadcast',
                event: 'candidate',
                payload: { target: peerId, role: 'host', candidate: c }
            }).catch(() => {});
        };
        pc.onicecandidate = e => {
            if (!e.candidate) return;
            if (offerSent) sendIce(e.candidate); else earlyIce.push(e.candidate);
        };

        pc.onconnectionstatechange = () => {
            updateConnectionStatus();
            if (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected') {
                try { pc.close(); } catch (e) {}
                peers.delete(peerId);
                updateConnectionStatus();
            }
        };

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            peers.set(peerId, pc);

            if (realtimeChannel) {
                await realtimeChannel.send({
                    type: 'broadcast',
                    event: 'offer',
                    payload: { target: peerId, sdp: offer.sdp }
                }).catch(() => {});
            }
            offerSent = true;
            earlyIce.splice(0).forEach(sendIce);
        } catch (e) {
            console.error('Error creating offer for peer:', peerId, e);
        }
    }

    // WebRTC & Realtime Signaling
    async function startBroadcasting() {
        const roomId = getRoomId();
        // the stream also shares the game live (saved 90 days): spectators then see the full game tracker under the video
        if (window.LSYNC && !LSYNC.active() && window.trackerState && trackerState.step === 8) { try { await LSYNC.host(); } catch (e) {} }
        const client = sbClient();

        if (client) {
            if (realtimeChannel) realtimeChannel.unsubscribe();
            realtimeChannel = client.channel('stream_' + roomId);
            realtimeChannel
                .on('broadcast', { event: 'request_state' }, () => pushStateSoon())
                .on('broadcast', { event: 'request_offer' }, msg => {
                    const peerId = (msg.payload && msg.payload.peerId) || 'default';
                    createPeerOffer(peerId);
                })
                .on('broadcast', { event: 'answer' }, async msg => {
                    const peerId = (msg.payload && msg.payload.peerId) || 'default';
                    const pc = peers.get(peerId);
                    if (pc && msg.payload && msg.payload.sdp) {
                        try {
                            await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: msg.payload.sdp }));
                            updateConnectionStatus();
                        } catch (err) {
                            console.warn('Set remote desc error:', err);
                        }
                    }
                })
                .on('broadcast', { event: 'candidate' }, msg => {
                    const peerId = (msg.payload && msg.payload.peerId) || 'default';
                    const pc = peers.get(peerId);
                    if (pc && msg.payload && msg.payload.candidate && msg.payload.role === 'peer') {
                        try { pc.addIceCandidate(new RTCIceCandidate(msg.payload.candidate)); } catch (err) {}
                    }
                })
                .subscribe(status => {
                    if (status === 'SUBSCRIBED') {
                        pushStateSoon();
                        // OBS / spectator pages opened before the broadcast started ask for the camera on this signal
                        realtimeChannel.send({ type: 'broadcast', event: 'host_ready', payload: {} }).catch(() => {});
                    }
                });
        }

        isBroadcasting = true;
        pushStateSoon();
        updateConsoleHeader();
    }

    function updateConnectionStatus() {
        let connectedCount = 0;
        peers.forEach(pc => {
            if (pc.connectionState === 'connected') connectedCount++;
        });
        const dot = document.getElementById('bcast-status-dot');
        const txt = document.getElementById('bcast-status-txt');
        if (connectedCount > 0) {
            if (dot) dot.style.background = '#22c55e';
            if (txt) txt.textContent = S(`LIVE (${connectedCount} VIEWING)`, `EN VIVO (${connectedCount} ESPECTADORES)`);
        } else {
            if (dot) dot.style.background = '#ef4444';
            if (txt) txt.textContent = S('LIVE BROADCASTING', 'TRANSMITIENDO EN VIVO');
        }
    }

    function stopBroadcasting(showToast = true) {
        const wasLive = isBroadcasting;
        if (realtimeChannel) {
            realtimeChannel.unsubscribe();
            realtimeChannel = null;
        }
        peers.forEach(pc => {
            try { pc.close(); } catch (e) {}
        });
        peers.clear();
        if (mediaStream) {
            mediaStream.getTracks().forEach(t => t.stop());
            mediaStream = null;
        }
        releaseWakeLock();
        isBroadcasting = false;
        const wrap = document.getElementById('bcast-viewfinder-root');
        if (wrap) wrap.remove();
        if (showToast && wasLive && window.toast) {
            toast(S('Broadcast ended.', 'Transmisión finalizada.'));
        }
    }

    function pushStateSoon() {
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => {
            const snap = window.GDM && typeof window.GDM.snapshot === 'function' ? window.GDM.snapshot() : null;
            if (!snap) return;

            // Broadcast via Realtime channel
            if (realtimeChannel) {
                const live = window.LSYNC && LSYNC.active() ? LSYNC.info().code : null;   // the shared game: viewers show it in full
                realtimeChannel.send({ type: 'broadcast', event: 'telemetry', payload: { state: snap, settings, live, ts: Date.now() } }).catch(() => {});
            }
        }, 200);
    }

    // UI: Viewfinder Bar at Top of Active Game
    function renderViewfinderConsole() {
        let root = document.getElementById('bcast-viewfinder-root');
        if (root) return root;

        root = document.createElement('div');
        root.id = 'bcast-viewfinder-root';
        root.style.cssText = 'background:#101726; border:1px solid #2d3b50; border-radius:14px; padding:12px; margin-bottom:14px; box-shadow:0 8px 24px rgba(0,0,0,0.5);';

        const roomId = getRoomId();
        root.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <span id="bcast-status-dot" style="width:10px; height:10px; border-radius:50%; background:#22c55e; display:inline-block; animation:pulse 1.5s infinite;"></span>
                    <b id="bcast-status-txt" style="font-size:0.85rem; color:#fff; letter-spacing:0.04em;">${S('LIVE BROADCASTING', 'TRANSMITIENDO EN VIVO')}</b>
                    <small style="color:#94a3b8; font-weight:700;">#${esc(roomId)}</small>
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="BROADCAST.toggleViewfinder()" id="bcast-btn-min" style="background:#1e293b; border:1px solid #475569; color:#fff; border-radius:8px; padding:5px 9px; font-size:0.78rem; cursor:pointer;" title="${S('Minimize viewfinder', 'Minimizar visor')}"><i class="fa-solid fa-compress"></i></button>
                </div>
            </div>
            
            <div id="bcast-body-box" style="display:flex; flex-direction:column; gap:10px;">
                <!-- Full 16:9 viewfinder matching spectator view -->
                <div style="position:relative; width:100%; aspect-ratio:16/9; max-height:260px; background:#000; border-radius:10px; overflow:hidden; border:1px solid #334155;">
                    <video id="bcast-preview" autoplay playsinline webkit-playsinline muted style="width:100%; height:100%; object-fit:contain; background:#000;"></video>
                </div>

                <!-- Balanced control buttons toolbar -->
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(60px, 1fr)); gap:8px;">
                    <button id="bcast-btn-torch" onclick="BROADCAST.toggleTorch()" style="display:none; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:46px; border:1px solid #334155; border-radius:8px; background:#1e293b; color:#fff; font-size:0.72rem; font-weight:700; cursor:pointer;" title="${S('Torch / Flashlight', 'Linterna')}">
                        <i class="fa-solid fa-lightbulb" style="font-size:1rem;"></i>
                        <span>${S('Torch', 'Linterna')}</span>
                    </button>
                    <button onclick="BROADCAST.cycleCamera()" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:46px; border:1px solid #334155; border-radius:8px; background:#1e293b; color:#fff; font-size:0.72rem; font-weight:700; cursor:pointer;" title="${S('Switch camera lens', 'Cambiar lente')}">
                        <i class="fa-solid fa-camera-rotate" style="font-size:1rem;"></i>
                        <span>${S('Lens', 'Lente')}</span>
                    </button>
                    <button id="bcast-btn-mute" onclick="BROADCAST.toggleMute()" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:46px; border:1px solid #334155; border-radius:8px; background:#1e293b; color:#fff; font-size:0.72rem; font-weight:700; cursor:pointer;" title="${S('Mute microphone', 'Silenciar')}">
                        <i class="fa-solid fa-microphone" style="font-size:1rem;"></i>
                        <span>${S('Mic', 'Mic')}</span>
                    </button>
                    <button onclick="BROADCAST.openStudioModal()" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:46px; border:1px solid #334155; border-radius:8px; background:#1e293b; color:#38bdf8; font-size:0.72rem; font-weight:700; cursor:pointer;" title="${S('Share links', 'Enlaces para compartir')}">
                        <i class="fa-solid fa-share-nodes" style="font-size:1rem;"></i>
                        <span>${S('Links', 'Enlaces')}</span>
                    </button>
                    <button onclick="BROADCAST.stop()" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; height:46px; border:1px solid #ef4444; border-radius:8px; background:#dc2626; color:#fff; font-size:0.72rem; font-weight:800; cursor:pointer;" title="${S('End Broadcast', 'Terminar')}">
                        <i class="fa-solid fa-stop" style="font-size:1rem;"></i>
                        <span>${S('End', 'Fin')}</span>
                    </button>
                </div>

                <!-- Overlay display controls -->
                <div style="padding-top:8px; border-top:1px solid #1e293b; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <span style="font-size:0.72rem; color:#94a3b8; font-weight:800; text-transform:uppercase; letter-spacing:0.04em;">${S('OVERLAY DISPLAY CONTROLS', 'CONTROL DE PANTALLA')}:</span>
                    <div style="display:flex; gap:12px; font-size:0.78rem;">
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="chk-cp" ${settings.showCp ? 'checked' : ''} onchange="BROADCAST.setOption('showCp', this.checked)"> CP</label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="chk-sec" ${settings.showSecondaries ? 'checked' : ''} onchange="BROADCAST.setOption('showSecondaries', this.checked)"> ${S('Secondaries', 'Secundarias')}</label>
                        <label style="cursor:pointer; display:flex; align-items:center; gap:5px;"><input type="checkbox" id="chk-3d" ${settings.show3dMap ? 'checked' : ''} onchange="BROADCAST.setOption('show3dMap', this.checked)"> 3D Map</label>
                    </div>
                </div>
            </div>
        `;

        const v = document.getElementById('view-active-game');
        if (v) v.prepend(root);
        return root;
    }

    let isCollapsed = false;
    function toggleViewfinder() {
        isCollapsed = !isCollapsed;
        const b = document.getElementById('bcast-body-box');
        const btn = document.getElementById('bcast-btn-min');
        if (b) b.style.display = isCollapsed ? 'none' : 'flex';
        if (btn) btn.innerHTML = isCollapsed ? '<i class="fa-solid fa-expand"></i>' : '<i class="fa-solid fa-compress"></i>';
    }

    function updateConsoleHeader() {
        const dot = document.getElementById('bcast-status-dot');
        if (dot) dot.style.background = isBroadcasting ? '#22c55e' : '#ef4444';
    }

    function openStudioModal() {
        const roomId = getRoomId();
        const base = (location.origin + location.pathname.replace(/\/[^/]*$/, '/')).replace(/^http:/, 'https:');
        const obsUrl = `${base}overlay.html?room=${roomId}`;
        const watchUrl = `${base}watch.html?room=${roomId}`;

        let m = document.getElementById('modal-streamer-studio');
        if (m) m.remove();

        m = document.createElement('div');
        m.id = 'modal-streamer-studio';
        m.style.cssText = 'position:fixed; inset:0; z-index:100000; background:rgba(0,0,0,0.88); display:flex; align-items:center; justify-content:center; padding:14px;';
        m.innerHTML = `
            <div style="background:#161d27; border:1px solid #334155; border-radius:16px; max-width:500px; width:100%; padding:18px; color:#e2e8f0; max-height:90vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <b style="font-size:1.1rem; color:#fff;"><i class="fa-solid fa-tower-broadcast" style="color:#ef4444;"></i> ${S('Streamer Studio', 'Estudio de Stream')}</b>
                    <button onclick="document.getElementById('modal-streamer-studio').remove()" style="background:transparent; border:none; color:#94a3b8; font-size:1.4rem; cursor:pointer;">✕</button>
                </div>
                
                <p style="font-size:0.86rem; color:#94a3b8; line-height:1.45; margin-bottom:14px;">
                    ${S('Share a live video of your table with the score on top, or share the game tracker so friends can follow every point.', 'Comparte un video en vivo de tu mesa con el marcador encima, o comparte el marcador del juego para que tus amigos sigan cada punto.')}
                </p>

                <div id="bcast-modal-error" style="display:none; background:#450a0a; border:1px solid #ef4444; color:#fca5a5; border-radius:10px; padding:10px 12px; font-size:0.8rem; margin-bottom:12px; line-height:1.4;"></div>

                <!-- Video stream link (camera + score bar) -->
                <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
                        <b style="font-size:1.05rem; color:#38bdf8; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-video" style="font-size:1.25rem;"></i> ${S('Share Video Stream', 'Compartir Video en Vivo')}</b>
                        <button onclick="BROADCAST.copyText('${esc(obsUrl)}')" style="background:#38bdf8; color:#000; border:none; border-radius:6px; padding:5px 10px; font-size:0.8rem; font-weight:800; cursor:pointer;">${S('Copy', 'Copiar')}</button>
                    </div>
                    <input readonly value="${esc(obsUrl)}" onclick="this.select()" style="width:100%; background:#1e293b; border:1px solid #334155; color:#cbd5e1; padding:8px; border-radius:6px; font-size:0.78rem;">
                </div>

                <!-- Game tracker link (spectator page) -->
                <div style="background:#0f172a; border:1px solid #334155; border-radius:10px; padding:12px; margin-bottom:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:8px;">
                        <b style="font-size:1.05rem; color:#4ade80; display:flex; align-items:center; gap:8px;"><i class="fa-solid fa-clipboard-list" style="font-size:1.25rem;"></i> ${S('Share Game Tracker', 'Compartir Marcador del Juego')}</b>
                        <button onclick="BROADCAST.copyText('${esc(watchUrl)}')" style="background:#4ade80; color:#000; border:none; border-radius:6px; padding:5px 10px; font-size:0.8rem; font-weight:800; cursor:pointer;">${S('Copy', 'Copiar')}</button>
                    </div>
                    <input readonly value="${esc(watchUrl)}" onclick="this.select()" style="width:100%; background:#1e293b; border:1px solid #334155; color:#cbd5e1; padding:8px; border-radius:6px; font-size:0.78rem;">
                </div>

                <!-- New Code Button on top of Start Broadcast -->
                <div style="margin-bottom:10px;">
                    <button onclick="BROADCAST.resetRoom()" style="width:100%; min-height:40px; border:1px solid #334155; border-radius:10px; background:#1e293b; color:#cbd5e1; font-weight:700; font-size:0.84rem; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;" title="${S('Generate new private room code', 'Generar nuevo código de sala privado')}">
                        <i class="fa-solid fa-arrows-rotate"></i> ${S('Generate New Private Room Code', 'Generar Nuevo Código de Sala')}
                    </button>
                </div>

                <div style="display:flex; gap:10px;">
                    ${isBroadcasting
                        ? `<button onclick="BROADCAST.stop(); document.getElementById('modal-streamer-studio').remove();" style="flex:1; min-height:46px; border:none; border-radius:10px; background:#dc2626; color:#fff; font-weight:800; cursor:pointer;">${S('Stop Broadcast', 'Detener Transmisión')}</button>`
                        : `<button onclick="BROADCAST.startFromModal(this)" id="bcast-modal-start-btn" style="flex:1; min-height:46px; border:none; border-radius:10px; background:linear-gradient(135deg, #ef4444, #f97316); color:#fff; font-weight:800; font-size:1rem; cursor:pointer;"><i class="fa-solid fa-satellite-dish"></i> ${S('Start Table Broadcast', 'Iniciar Transmisión de Mesa')}</button>`
                    }
                </div>
            </div>
        `;
        document.body.appendChild(m);
    }

    async function startFromModal(btn) {
        if (!btn) return;
        const origHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${S('Starting Camera…', 'Iniciando Cámara…')}`;
        const errBox = document.getElementById('bcast-modal-error');
        if (errBox) errBox.style.display = 'none';

        try {
            await window.BROADCAST.start();
            const m = document.getElementById('modal-streamer-studio');
            if (m) m.remove();
        } catch (e) {
            btn.disabled = false;
            btn.innerHTML = origHTML;
            if (errBox) {
                errBox.style.display = 'block';
                errBox.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> <b>${S('Camera error:', 'Error de cámara:')}</b> ` + esc(e.message || String(e));
            } else {
                alert(e.message || String(e));
            }
        }
    }

    function resetRoom() {
        if (isBroadcasting) {
            if (!confirm(S('Broadcasting is active. Stop broadcast and generate new room code?', 'La transmisión está activa. ¿Detener transmisión y generar nuevo código?'))) return;
            stopBroadcasting(false);
        }
        const r = 'wtc-' + Math.random().toString(36).substring(2, 8);
        try { localStorage.setItem('bl_stream_room', r); } catch (e) {}
        openStudioModal();
        if (window.toast) toast(S('New stream room: #' + r, 'Nueva sala: #' + r));
    }

    function copyText(str) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(str).then(() => {
                if (window.toast) toast(S('Link copied to clipboard!', '¡Enlace copiado!'));
                else alert(S('Link copied!', '¡Enlace copiado!'));
            });
        }
    }

    loadSettings();

    window.BROADCAST = {
        async start() {
            renderViewfinderConsole();
            try {
                await startCamera();
                await startBroadcasting();
                if (window.toast) toast(S('Broadcast live! Place phone on tripod.', '¡Transmisión activa! Coloca el móvil en el trípode.'));
            } catch (e) {
                console.error(e);
                stopBroadcasting(false);
                throw e;
            }
        },
        stop: () => stopBroadcasting(true),
        startFromModal,
        toggleTorch,
        toggleMute,
        cycleCamera,
        toggleViewfinder,
        openStudioModal,
        resetRoom,
        copyText,
        pushStateSoon,
        setOption(k, v) {
            settings[k] = v;
            saveSettings();
            pushStateSoon();
        },
        isLive: () => isBroadcasting
    };

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && isBroadcasting) acquireWakeLock();
    });

})();