/* Project 4192 service worker: offline app shell + cached datasheets.
   Bump VERSION on every release that changes cached files (index.html also changes ?v= on scripts, which is picked up automatically). */
const VERSION = 'v93';
// DATA_V changes when the upstream datasheets (data/factions/) change (tools/update_all.py bumps it) so phones re-download them
const DATA_V = '';
const SHELL = 'bl-shell-' + VERSION, DATA = DATA_V ? 'bl-data-' + DATA_V : 'bl-data', RUNTIME = 'bl-runtime';
const EXTRA = ['/', 'manifest.json', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/apple-touch-icon.png', 'assets/icons/logo-mark-96.png', 'assets/icons/favicon-32.png'];
EXTRA.push('assets/banners/0.jpg');
EXTRA.push('assets/fonts/barlow-semicondensed-600.woff2', 'assets/fonts/barlow-semicondensed-700.woff2', 'theme.css', 'theme2.css', 'rules_es.js?v=2', 'detachment_rules_es.js?v=2', 'mission_text_es.js?v=2', 'data/offline_assets.json', 'ar.html', 'ar_viewer.js?v=14', 'data/ar_index.json', 'data/glossary.json', 'data/core_stratagems.json', 'data/tournament_lists.json');

self.addEventListener('install', e => {
    e.waitUntil((async () => {
        const cache = await caches.open(SHELL);
        let urls = new Set(EXTRA);
        try {   // every script/stylesheet the page references (they carry ?v= cache-busters)
            const html = await (await fetch('/', { cache: 'no-store' })).text();
            for (const m of html.matchAll(/(?:src|href)="([^"#]+)"/g)) { const u = m[1]; if (!/^(https?:)?\/\//.test(u) && !u.startsWith('data:')) urls.add(u); }
            for (const m of html.matchAll(/(?:src|href)="(https:\/\/(?:cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)[^"]+)"/g)) urls.add(m[1]);
        } catch (err) {}
        await Promise.all([...urls].map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
        await self.skipWaiting();
    })());
});
self.addEventListener('activate', e => {
    e.waitUntil((async () => {
        for (const k of await caches.keys()) if ((k.startsWith('bl-shell-') && k !== SHELL) || (k.startsWith('bl-data') && k !== DATA)) await caches.delete(k);
        await self.clients.claim();
    })());
});

const sameOrigin = u => new URL(u).origin === self.location.origin;
async function swr(req, cacheName, ignoreSearch) {
    const cache = await caches.open(cacheName), hit = await cache.match(req, { ignoreSearch: !!ignoreSearch });
    const net = fetch(req).then(r => { if (r && r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response('Offline', { status: 503 });
}
async function cacheFirst(req, cacheName) {
    const cache = await caches.open(cacheName), hit = await cache.match(req);
    if (hit) return hit;
    const r = await fetch(req); if (r && r.ok) cache.put(req, r.clone()); return r;
}
async function networkFirst(req, cacheName) {
    const cache = await caches.open(cacheName);
    try { const r = await fetch(req); if (r && r.ok) cache.put(req, r.clone()); return r; }
    catch (err) { return (await cache.match(req)) || (await cache.match(req, { ignoreSearch: true })) || new Response('', { status: 404 }); }
}
self.addEventListener('fetch', e => {
    const req = e.request; if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return;            // live data: never cached
    if (req.mode === 'navigate') {                                                                        // pages: network first, cached shell offline
        e.respondWith((async () => {
            try { const r = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(), 5000))]); const c = await caches.open(SHELL); c.put('/', r.clone()); return r; }
            catch (err) { return (await caches.match('/')) || (await caches.match('index.html')) || new Response('Offline', { status: 503 }); }
        })());
        return;
    }
    if (url.hostname === 'raw.githubusercontent.com') { e.respondWith((async () => { const hit = await caches.match(req); if (hit) return hit; try { return await fetch(req); } catch (err) { return new Response('Offline', { status: 503 }); } })()); return; }   // datasheets: a saved copy wins; otherwise straight from the network (saving is done by the page, on request)
    if (sameOrigin(req.url)) {
        if (url.pathname.startsWith('/assets/ar/')) { e.respondWith(networkFirst(req, RUNTIME)); return; }   // AR models get rebuilt: newest copy first, the saved one offline
        if (/^\/assets\/(primary|secondary|layouts_svg|tutorial|deployment|vendor)\//.test(url.pathname)) { e.respondWith(cacheFirst(req, RUNTIME).catch(() => new Response('', { status: 404 }))); return; }
        if (url.pathname.startsWith('/data/factions/') || url.pathname.endsWith('/data_version.js')) { e.respondWith(fetch(req).then(r => { if (r && r.ok) caches.open(SHELL).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req).then(h => h || new Response('Offline', { status: 503 })))); return; }   // datasheets: newest copy first, stored copy offline
        e.respondWith(swr(req, SHELL, url.pathname.startsWith('/data/')));
        return;
    }
    if (url.hostname.includes('cdnjs.cloudflare.com') || url.hostname.includes('jsdelivr.net')) e.respondWith(swr(req, RUNTIME));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
