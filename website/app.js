
function getMFMOverride(name, fac) {
    const O = window.MFM_OVERRIDES; if (!O || !name) return null;
    const key = n => String(n).toLowerCase().replace(/[’'`]/g, '').replace(/[-‐‑–]/g, ' ').replace(/\s+/g, ' ').trim();   // hyphen styles ("Grav‑Tank", "Grav Tank") match
    if (window.__mfmIdxSrc !== O) { window.__mfmIdxSrc = O; window.__mfmIdx = {}; for (const k in O) window.__mfmIdx[key(k)] = O[k]; }
    const ALIAS = {};   // datasheet name -> the name used by the points list, when they differ
    const kk = key(name), ak = window.__mfmIdx[kk] ? kk : (ALIAS[kk] || kk);   // an entry under the unit's own name (e.g. a hand-kept price) wins over an alias
    const o = window.__mfmIdx[ak]; if (!o) return null;
    const f = fac || window.MFM_FACTION;                       // some units are priced differently per faction (MFM lists them per faction)
    return (f && o.f && o.f[f]) ? o.f[f] : o;
}


// Enhancements of a detachment (name / cost / description). Was referenced by the roster builder but never defined, which crashed it as soon as a detachment was added.
window.extractEnhancements = function(d) { return (d && Array.isArray(d.enhancements)) ? d.enhancements : []; };

// FORMAT BATTLESCRIBE TEXT
window.blClean = function (s) { if (typeof s !== 'string' || !/</.test(s)) return s; return s.replace(/<k>([\s\S]*?)<\/k>/g, (m, x) => '**' + x.toUpperCase() + '**').replace(/<(b|bi)>([\s\S]*?)<\/\1>/g, '**$2**').replace(/<li>([\s\S]*?)<\/li>/g, '\n• $1').replace(/<\/?(ul|i|u|ui|nest|table|tr|td)>/g, '').replace(/<\/?[a-z]*>/g, ''); };
window.formatBSText = function(str) {
    if(typeof str !== 'string') return str || '';
    str = blClean(str);
    // Reemplaza **texto** por <strong>texto</strong>
    let s = str.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>');
    // Reemplaza ^^texto^^ por uppercased y accent color
    s = s.replace(/\^\^(.*?)\^\^/g, '<span style="text-transform:uppercase; font-weight:bold; color:var(--accent);">$1</span>');
    // Elimina los saltos de linea extra si vienen como muchas 

    s = s.replace(/\n\n+/g, '<br><br>').replace(/\n/g, '<br>');
    return s;
};
// ESTADO
const STATE = {
    rosters: JSON.parse(localStorage.getItem('battlelist_rosters')) || [],
    currentFactionData: []
};

// Apply patches to saved rosters
setTimeout(() => {
    STATE.rosters.forEach(r => {
        if (!r.units) return;
    });
    saveRosters();
}, 500);


// FACTIONS: one entry per faction. Each one loads data/factions/<name>.json (see README.md for the format).
// banner = picture in assets/banners/, color = the faction colour the whole UI takes on.
const FACTIONS = [
    { id: 1, group: 'Example Alliance', name: 'Example Faction', banner: 'assets/banners/0.jpg', color: '#c8a24a' },
    { id: 2, group: 'Example Alliance', name: 'Second Faction', banner: 'assets/banners/0.jpg', color: '#3f8fd8' }
];


document.addEventListener('DOMContentLoaded', () => {
    renderFactions();
    
    // Búsqueda
    window.handleUnitSearch = function(rawTerm) {
        try {
            rawTerm = rawTerm.toLowerCase().trim();
            const filtered = (STATE.currentFactionData || []).filter(unit => {
                if (!rawTerm) return true;
                // Save unit as text and search for wording
                const unitText = JSON.stringify(unit).toLowerCase();
                return unitText.includes(rawTerm);
            });
            renderJSONDatasheets(filtered);
        } catch(err) {
            console.error('Search error', err);
        }
    };

    document.getElementById('search-input').addEventListener('input', (e) => {
        window.handleUnitSearch(e.target.value);
    });
});

// MENÚ HAMBURGUESA
window.toggleMenu = () => {
    const menu = document.getElementById('dropdown-menu');
    const overlay = document.getElementById('dropdown-overlay');
    menu.classList.toggle('open');
    if (menu.classList.contains('open')) {
        overlay.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } else {
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// NAVEGACIÓN
window.switchView = (viewId, pushHistory=true) => {
    if(pushHistory && (!history.state || history.state.view !== viewId)) {
        history.pushState({ view: viewId }, '', '#' + viewId);
    }
    document.querySelectorAll('.view').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(`view-${viewId}`);
    if(target) {
        target.classList.add('active');
        window.scrollTo(0, 0);
        
        // Randomize banners on navigation (except home screen which looks good statically)
        if (viewId !== 'home' && viewId !== 'new-roster') {
            const banners = target.querySelectorAll('.home-header-card');
            if (banners.length > 0) {
                const bannerList = [
                    '0.jpg', '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', 
                    '8.jpg', '9.jpg', '10.jpg', '11.jpg', '12.jpg', '13.jpg', '14.jpg', 
                    '15.jpg', '16.1.jpg', '17.1.jpg', '18.1.jpg', '19.jpg', '20.jpg', 
                    '21.jpg', '22.jpg', '23.jpg', '24.jpg', '25.jpg', '26.jpg', '27.jpg', '28.jpg'
                ];
                const randImg = bannerList[Math.floor(Math.random() * bannerList.length)];
                banners.forEach(b => b.style.backgroundImage = `url('assets/banners/${randImg}')`);
            }
        }
    }
};

window.onpopstate = (event) => {
    if (event.state && event.state.view) {
        switchView(event.state.view, false);
    } else {
        switchView('home', false);
    }
};

// Initialize history on load
window.__initialView = (location.hash || '').replace('#', '');   // remember deep links (e.g. /#tracker) before the home reset below
// Do not wipe out Supabase auth fragments
if(!history.state && !location.hash.includes('access_token=') && !location.hash.includes('error_description=')) {
    history.replaceState({ view: 'home' }, '', '#home');
}


let selectedPoints = 2000;

function selectPoints(btn, pts) {
    document.querySelectorAll('.pt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedPoints = pts;
}

let currentActiveRoster = null;
let isBuilderMode = false;

function createRoster(faction) {
    const nameInput = document.getElementById('new-roster-name').value;
    const rosterName = nameInput.trim() !== '' ? nameInput : `${faction.name} ${selectedPoints}`;
    
    const newRoster = {
        id: Date.now().toString(),
        name: rosterName,
        pointsLimit: selectedPoints,
        faction: faction,
        units: []
    };
    
    STATE.rosters.push(newRoster);
    saveRosters();
    
    openRosterBuilder(newRoster);
}

// faction colour → accent (lifted a little when too dark to read) + readable text colour for buttons
window.applyAccent = function (hex) {
    let c = String(hex || '#ff7a3d').replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
    const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2; let h = 0, s = 0;
    if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); const R = r / 255, G = g / 255, B = b / 255; h = mx === R ? (G - B) / d + (G < B ? 6 : 0) : mx === G ? (B - R) / d + 2 : (R - G) / d + 4; h *= 60; }
    const L = Math.max(l, 0.34), f = (n, k = (n + h / 30) % 12) => { const a = s * Math.min(L, 1 - L); return Math.round(255 * (L - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); };
    const R2 = f(0), G2 = f(8), B2 = f(4), lum = (0.2126 * R2 + 0.7152 * G2 + 0.0722 * B2) / 255;
    const root = document.documentElement.style; root.setProperty('--accent', `rgb(${R2},${G2},${B2})`); root.setProperty('--accent-rgb', `${R2},${G2},${B2}`); root.setProperty('--accent-fg', lum > 0.5 ? '#140a05' : '#ffffff');
};
function openRosterBuilder(roster) {
    if (!roster) return;
    if (!roster.units) roster.units = [];
    if (!roster.detachments) roster.detachments = [];
    
    // Normalize faction object if string or missing banner
    let fac = roster.faction;
    if (typeof fac === 'string') {
        fac = (typeof FACTIONS !== 'undefined' && FACTIONS.find(f => f.name.toLowerCase() === fac.toLowerCase())) || { name: fac, banner: 'assets/banners/1.jpg' };
        roster.faction = fac;
    } else if (!fac || !fac.banner) {
        fac = (fac && typeof FACTIONS !== 'undefined' && FACTIONS.find(f => f.name && f.name.toLowerCase() === fac.name.toLowerCase())) || (typeof FACTIONS !== 'undefined' ? FACTIONS[0] : { name: 'Faction', banner: 'assets/banners/1.jpg' });
        roster.faction = fac;
    }

    currentActiveRoster = roster;
    { const rp = document.getElementById('roster-faction-pane'), mp = document.getElementById('roster-main-pane'); if (rp && mp) { rp.hidden = true; mp.hidden = false; } const a = document.getElementById('pool-done-top'), b = document.getElementById('rp-rules-btn'); if (a) a.classList.add('on'); if (b) b.classList.remove('on'); }
    try { if (roster.faction && roster.faction.name) localStorage.setItem('bl_last_faction', roster.faction.name); } catch (e) {}
    switchView('rosters');
    { const fc = (roster.faction && roster.faction.color) || ((typeof FACTIONS !== 'undefined' && FACTIONS.find(f => roster.faction && f.name === roster.faction.name) || {}).color); if (fc) applyAccent(fc); }
    const fabBtn = document.getElementById('roster-fab-add');
    if (fabBtn) {
        fabBtn.style.background = 'var(--accent)';
        fabBtn.style.color = 'var(--accent-fg, #ffffff)';
    }
    
    const bannerEl = document.getElementById('roster-builder-banner');
    if (bannerEl && roster.faction && roster.faction.banner) {
        bannerEl.style.backgroundImage = `url('${roster.faction.banner}')`;
    }
    const fnEl = document.getElementById('rb-faction-name');
    if (fnEl) fnEl.textContent = (roster.faction && roster.faction.name ? roster.faction.name : 'ARMY').toUpperCase();
    const rnEl = document.getElementById('rb-roster-name');
    if (rnEl) rnEl.textContent = roster.name || 'Untitled Roster';
    const lpEl = document.getElementById('rb-limit-pts');
    if (lpEl) lpEl.innerHTML = `/ ${roster.pointsLimit || 2000} pts <i class="fa-solid fa-pencil" style="font-size:0.7rem; color:#6a7a8c;"></i>`;
    
    // Al abrir el builder, pre-cargamos la data de la facción para que cuando le de a "Add Unit" ya esté lista.
    // Además extrae los detachments y los renderiza.
    if (roster.faction && typeof preloadFactionData === 'function') {
        preloadFactionData(roster.faction).then(() => {
            renderRosterBuilder();
            if (window.renderRosterPool && STATE.currentFactionData) {
                renderRosterPool(STATE.currentFactionData);
            }
        }).catch(err => {
            console.warn('Faction data preload error:', err);
            renderRosterBuilder();
        });
    } else {
        renderRosterBuilder();
    }
}
const BL_FILEMAP = {};   // faction name -> data file name, when they differ (default: data/factions/<name>.json)

const BL_KEYWORD_RULES = /^(Pistol|Hazardous|Devastating Wounds|Assault|Extra Attacks|Twin-linked|Anti|Sustained Hits|Heavy|Melta|Blast|Precision|Indirect Fire|Lance|Lethal Hits|Ignores Cover|Rapid Fire|Torrent|Psychic|One Shot|Cleave|Close-quarters)$/i;
window.blFactionUrl = n => `data/factions/${encodeURIComponent(n)}.json` + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : '');

// ---- datasheet data loader: timeout + retries, optional save to the device cache (used offline) ----
window.BLDATA = {
    CACHE: 'bl-data',
    async cache() { try { return window.caches ? await caches.open(this.CACHE) : null; } catch (e) { return null; } },
    async has(url) { try { return !!(window.caches && await caches.match(url)); } catch (e) { return false; } },
    // opts.save: store a copy for offline use; opts.force: skip the stored copy and fetch fresh
    async get(url, opts) {
        opts = opts || {};
        const c = await this.cache();
        if (c && !opts.force) {
            try { const hit = (await c.match(url)) || (window.caches && await caches.match(url)); if (hit) { const d = await hit.json(); if (opts.save && !(await c.match(url))) await c.put(url, new Response(JSON.stringify(d), { headers: { 'content-type': 'application/json' } })); return d; } } catch (e) { try { await c.delete(url); } catch (e2) {} }
        }
        let err;   // no navigator.onLine gate: installed iPhone apps sometimes report offline while connected — just try the network

        for (let i = 0; i < 3; i++) {
            const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 40000);
            try {
                const r = await fetch(url, { signal: ctl.signal, cache: opts.force ? 'reload' : 'default' });
                if (!r.ok) { const he = new Error('HTTP ' + r.status); he.status = r.status; if (r.status === 404) { clearTimeout(t); throw he; } throw he; }
                const txt = await r.text(); clearTimeout(t);
                const data = JSON.parse(txt);
                if (opts.save && c) await c.put(url, new Response(txt, { headers: { 'content-type': 'application/json' } }));
                return data;
            } catch (e) { clearTimeout(t); err = e; if (e.status === 404 || navigator.onLine === false && i >= 0) { if (e.status === 404 || i >= 1) break; } if (i < 2) await new Promise(r => setTimeout(r, 700 * (i + 1))); }
        }
        throw err;
    }
};

// Save one faction (its file + the libraries it links to) into the device cache. No screen is touched, so browsing can go on meanwhile.
BLDATA.saveFaction = async function (name, force) { await this.get(window.blFactionUrl(name), { save: true, force }); return true; };
// is the faction really on this device? (file in the cache)
BLDATA.isSaved = async function (name) { return this.has(window.blFactionUrl(name)); };


const BL_MFM_KEY = {};   // faction name -> its key in MFM_DATA, when they differ
function blBuildDetachments(name, parsed) {
    const n = s => String(s == null ? '' : s).toLowerCase().replace(/[’'`]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const d39 = parsed.detachments || [], byName = {}; d39.forEach(d => { byName[n(d.name)] = d; });
    const mfm = window.MFM_DATA && (window.MFM_DATA[name] || window.MFM_DATA[BL_MFM_KEY[name]]);
    if (!mfm) return d39.map(d => ({ id: d.id, name: d.name, d39: d, desc: '', dpCost: d.cost, forceDisposition: '', requirements: '', enhancements: (d.enhancements || []).map(e => ({ name: e.name, cost: e.cost, description: e.description })), stratagems: [], rules: [] }));
    return mfm.map(m => {
        const x = byName[n(m.name)];
        const det = { id: m.name.replace(/[^a-zA-Z0-9]/g, ''), name: m.name, d39: x || null, desc: '', dpCost: m.dp, forceDisposition: m.forceDisposition || '', requirements: m.requirements || '',
            enhancements: (m.enhancements || []).map(e => ({ name: e.name, cost: e.cost, description: '' })), stratagems: [], rules: [] };
        if (window.DETINFO) DETINFO.enrich(det);
        return det;
    });
}

// Rosters saved before the 39k data used other unit ids: re-link their units by name and refresh the saved datasheet
function blMigrateRosters(factionName) {
    const byName = {}; (STATE.currentFactionData || []).forEach(d => { byName[d.name.toLowerCase()] = d; });
    let changed = false;
    (STATE.rosters || []).forEach(r => {
        if (!r.faction || r.faction.name !== factionName) return;
        r.ds = r.ds || {};
        (r.units || []).forEach(u => {
            const d = byName[String(u.name).toLowerCase()]; if (!d || (u.id === d.id && r.ds[d.id] && r.ds[d.id].src === '39k5')) return;
            if (u.id !== d.id) delete r.ds[u.id];
            u.id = d.id; u.role = d.role; r.ds[d.id] = rosterSnap39k(d); changed = true;
        });
    });
    if (changed) { try { saveRosters(); } catch (e) {} if (typeof currentActiveRoster !== 'undefined' && currentActiveRoster && currentActiveRoster.faction && currentActiveRoster.faction.name === factionName) { try { renderRosterBuilder(); } catch (e) {} } }
}

async function preloadFactionData(faction, opts) {
    window.MFM_FACTION = faction && faction.name;
    opts = opts || {};
    if (!opts.save && !opts.force && STATE.loadedFaction === faction.name && STATE.currentFactionData && STATE.currentFactionData.length > 0 && document.getElementById('faction-title').textContent === faction.name) return true;
    const seq = window.__dsSeq = (window.__dsSeq || 0) + 1;
    STATE.loadedFaction = null;
    
    document.getElementById('search-input').value = '';
    document.getElementById('faction-title').textContent = faction.name;
    document.getElementById('faction-banner').style.backgroundImage = `url('${faction.banner}')`;
    document.getElementById('faction-banner').style.borderBottomColor = faction.color;
    applyAccent(faction.color);
    
    const dsContainer = document.getElementById('datasheet-detail-container');
    if(dsContainer) {
        dsContainer.innerHTML = `<div class="empty-datasheet-state" style="text-align:center; padding-top:100px; color:#4a5b6c; cursor:pointer;" onclick="if(window.innerWidth <= 768) toggleUnitSidebar()">
            <i class="fa-solid fa-crosshairs" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
            <h3>SELECT A UNIT</h3>
            <p style="font-size:0.9rem;">Pick a datasheet from the list to view its stats and abilities.</p>
        </div>`;
    }
    
    const detContainer = document.getElementById('detachment-detail-container');
    if(detContainer) {
        detContainer.innerHTML = `<div class="empty-datasheet-state" style="text-align:center; padding-top:100px; color:#4a5b6c; cursor:pointer;" onclick="if(window.innerWidth <= 768) toggleDetachmentSidebar()">
            <i class="fa-solid fa-shield-halved" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
            <h3>SELECT A DETACHMENT</h3>
            <p style="font-size:0.9rem;">Pick a detachment to view its rules and enhancements.</p>
        </div>`;
    }
    
    const container = document.getElementById('datasheets-container');
    container.innerHTML = '<div style="padding:20px 20px 0;">' + Array.from({length: 7}, () => '<div class="skel" style="height:64px; margin-bottom:12px;"></div>').join('') + '</div>';

    const fileName = `${faction.name}.json`;
    
    try {
        let parsedFaction = await BLDATA.get(window.blFactionUrl(faction.name), { save: !!opts.save, force: !!opts.force });
        if (seq !== window.__dsSeq) return false;
        
        let units = (parsedFaction.datasheets || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base', numeric: true }));
        
        // 39k data -> STATE. Detachment names / DP / force dispositions / enhancement costs come from the MFM (the authority); rules, enhancement and stratagem text come from 39k.
        STATE.currentFactionData = units;
        STATE.currentFactionMeta = parsedFaction;
        STATE.currentFactionDetachments = blBuildDetachments(faction.name, parsedFaction);
        STATE.currentDetachments = STATE.currentFactionDetachments;
        if (typeof window.renderJSONDatasheets === 'function') window.renderJSONDatasheets(STATE.currentFactionData);
        window.renderDetachmentsList();
        
        blMigrateRosters(faction.name);
        STATE.loadedFaction = faction.name;
        
        return true;
    } catch (err) {
        console.error(err);
        if (opts.save) throw err;
        window.__retryFaction = faction;
        container.innerHTML = `<div id="ds-fail" style="text-align:center; padding:50px 20px; color:#c74646;">
            <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; margin-bottom:15px;"></i><br>
            <b>Error loading ${faction.name}</b><br><br>
            <span style="font-size:0.9rem; color:#8c99b0;">Could not reach 39k database or the data is malformed.</span><br><br>
            <button onclick="retryFactionLoad()" style="padding:8px 16px; background:var(--accent); color:#fff; border:none; border-radius:4px; font-weight:bold; cursor:pointer;">Retry</button>
        </div>`;
        return false;
    }
}

fetch('data/glossary.json' + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : '')).then(r => r.ok ? r.json() : {}).then(g => { window.BL_GLOSSARY = g; }).catch(() => {});
window.retryFactionLoad = function () { const f = window.__retryFaction; if (f) preloadFactionData(f, { force: true }); };


function formatWahapediaText(text) {
    if (!text) return '';
    let html = text.replace(/\n/g, '<br/>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\^\^(.*?)\^\^/g, '<em>$1</em>');
    html = html.replace(/\[\*(.*?)\*\]/g, '<strong>$1</strong>');
    return html;
}

let selectedFactionForRoster = null;

function renderFactions() {
    const grid = document.getElementById('factions-list');
    const pickerGrid = document.getElementById('new-roster-faction-grid');
    grid.innerHTML = '';
    if(pickerGrid) pickerGrid.innerHTML = '';
    
    FACTIONS.forEach((faction, index) => {
        // Llenar el grid del Home Screen
        const div = document.createElement('div');
        div.className = 'faction-card';
        div.style.borderLeft = `6px solid ${faction.color}`;
        div.style.backgroundImage = `url('${faction.banner}')`;
        div.innerHTML = `<span>${faction.name}</span>`;
        // Si haces click en el grid del Home, vas directo a ver los datasheets de esa facción
        div.onclick = () => { isBuilderMode = false; preloadFactionData(faction); switchView('datasheets'); };
        grid.appendChild(div);
        
        // Llenar el Grid Picker del formulario New Roster
        if (pickerGrid) {
            const pickerDiv = document.createElement('div');
            pickerDiv.className = 'picker-card';
            pickerDiv.style.backgroundImage = `url('${faction.banner}')`;
            pickerDiv.innerHTML = `<span>${faction.name}</span>`;
            pickerDiv.onclick = () => {
                // Quitar selected de todos
                document.querySelectorAll('.picker-card').forEach(el => el.classList.remove('selected'));
                pickerDiv.classList.add('selected');
                selectedFactionForRoster = faction;
                
                // Habilitar botón Create Roster
                const btn = document.getElementById('btn-create-roster');
                if(btn) {
                    btn.style.opacity = '1';
                    btn.style.pointerEvents = 'auto';
                }
            };
            pickerGrid.appendChild(pickerDiv);
        }
    });
}

function submitNewRoster() {
    if(selectedFactionForRoster) {
        createRoster(selectedFactionForRoster);
    }
}

// FUNCION RECURSIVA PARA ENCONTRAR PROFILES (Stats, Weapons, Abilities)
// BSData conditions evaluated for the default state: every count is 0 (nothing attached, no option selected)
function blCond(c) {
    const v = Number(c.value), t = c.type;
    if (t === 'lessThan') return 0 < v; if (t === 'lessThanOrEqual' || t === 'atMost') return 0 <= v; if (t === 'greaterThan') return 0 > v;
    if (t === 'greaterThanOrEqual' || t === 'atLeast') return 0 >= v; if (t === 'equalTo') return 0 === v; if (t === 'notEqualTo') return 0 !== v;
    if (t === 'instanceOf') return false; if (t === 'notInstanceOf') return true;
    return false;
}
function blGroup(g) {
    const res = (g.conditions || []).map(blCond).concat((g.conditionGroups || []).map(blGroup));
    if (!res.length) return true; return g.type === 'or' ? res.some(Boolean) : res.every(Boolean);
}
function blRuleHidden(l) {
    let hidden = !!l.hidden;
    (l.modifiers || []).forEach(m => {
        if (m.field !== 'hidden' || m.type !== 'set') return;
        const ok = blGroup({ type: 'and', conditions: m.conditions, conditionGroups: m.conditionGroups });
        if (ok) hidden = !!m.value;
    });
    return hidden;
}
// units a Leader / Support unit may be attached to, read from the datasheet's "Leading" association conditions
function leadsUnits(u) {
    const IDX = window.BL_LINK_INDEX, out = new Set();
    const walk = o => { if (!o || typeof o !== 'object') return; if (Array.isArray(o)) return o.forEach(walk);
        if (o.type === 'instanceOf' && o.childId && o.childName) { const t = IDX && IDX.entries[o.childId], nm = String(o.childName); if (((t && (t.type === 'unit' || t.type === 'model')) || (window.BL_UNIT_NAMES && BL_UNIT_NAMES.has(nm))) && nm !== u.name && !/legends/i.test(nm)) out.add(nm); }
        Object.values(o).forEach(walk); };
    (u.associations || []).forEach(a => walk(a));
    return [...out].sort();
}
function extractProfiles(node, profilesList = [], parentGroupName = null, seen = null, wOnly = false) {
    // Follow links to shared entries / groups / profiles (weapons are often shared and only linked from the unit)
    const top = !seen; if (top) seen = new Set();
    const IDX = window.BL_LINK_INDEX;
    if (IDX && node) {
        (node.infoLinks || []).forEach(l => {
            if (l.type === 'rule' && !wOnly && !seen.has('r' + l.targetId)) {
                // rules coming from optional wargear / enhancement entries are not part of the unit's own datasheet, and the community data
                // hides some rules unless a condition holds (e.g. Feel No Pain only while a Technomancer leads): evaluate that for the default
                // state (nothing attached, no option chosen) and never show a rule that is hidden there
                if (blRuleHidden(l)) return;
                const optionEntry = node.type === 'upgrade';   // weapons and other options are 'upgrade' entries
                const r = IDX.rules && IDX.rules[l.targetId], mods = l.modifiers || [];
                let nm = (r && r.name) || l.name;
                mods.forEach(m => { if (m.field === 'name' && !(m.conditions && m.conditions.length) && !(m.conditionGroups && m.conditionGroups.length)) { if (m.type === 'append') nm = nm + ' ' + m.value; else if (m.type === 'set') nm = String(m.value); } });   // e.g. "Deadly Demise" + "D6", "Scouts" + '6"'
                if (BL_KEYWORD_RULES.test(String(nm).replace(/\s+\d.*$/, '').trim())) { seen.add('r' + l.targetId); if (r) profilesList.push({ typeName: 'KeywordRule', name: r.name, characteristics: [{ name: 'Description', $text: r.description }] }); return; }   // weapon keyword definitions (these do live on the weapon entries)
                if (optionEntry) return;   // an ability that belongs to an optional wargear / enhancement entry is not part of the unit's own datasheet
                seen.add('r' + l.targetId);
                profilesList.push({ typeName: 'Abilities', name: nm, parentGroupName: r ? 'CORE' : 'FACTION', characteristics: [{ name: 'Description', $text: r ? r.description : 'The rule text is not in the community database yet — check the official app.' }] });
            }
            if (l.type === 'profile' && IDX.profiles[l.targetId] && !seen.has('p' + l.targetId)) {
                seen.add('p' + l.targetId); const prof = { ...IDX.profiles[l.targetId] }; if (!/Weapons/.test(prof.typeName || '')) return; if (parentGroupName) prof.parentGroupName = parentGroupName; profilesList.push(prof);
            }
        });
        (node.entryLinks || []).forEach(l => {
            if (/^(Crusade|Warlord|Enhancements?.*|Weapon Modifications|Detachment.*)$/i.test(l.name || '')) return;
            if ((l.type === 'selectionEntry' || l.type === 'selectionEntryGroup') && IDX.entries[l.targetId] && !seen.has('e' + l.targetId)) {
                seen.add('e' + l.targetId); extractProfiles(IDX.entries[l.targetId], profilesList, parentGroupName, seen, true);
            }
            if (l.entryLinks) extractProfiles({ entryLinks: l.entryLinks }, profilesList, parentGroupName, seen, true);
        });
    }
    if (node.profiles && Array.isArray(node.profiles)) {
        node.profiles.forEach(p => {
            if (wOnly && !/Weapons/.test(p.typeName || '')) return;
            let prof = { ...p };
            if (parentGroupName) prof.parentGroupName = parentGroupName;
            profilesList.push(prof);
        });
    }
    // infoGroups (used for nested abilities on leader datasheets)
    if (node.infoGroups && Array.isArray(node.infoGroups)) {
        node.infoGroups.forEach(ig => extractProfiles(ig, profilesList, ig.name, seen, wOnly));
    }
    // infoLinks (might point to shared profiles or infoGroups)
    // Actually, infoLinks just contain the name and targetId, but sometimes they embed profiles? We'll ignore for now unless needed.

    // Buscar en sub-entradas
    if (node.selectionEntries && Array.isArray(node.selectionEntries)) {
        node.selectionEntries.forEach(sub => extractProfiles(sub, profilesList, parentGroupName, seen, wOnly));
    }
    if (node.selectionEntryGroups && Array.isArray(node.selectionEntryGroups)) {
        node.selectionEntryGroups.forEach(group => {
            // Check if the group itself has profiles
            if (group.profiles) {
                group.profiles.forEach(p => {
                    if (wOnly && !/Weapons/.test(p.typeName || '')) return;
                    let prof = { ...p };
                    prof.parentGroupName = group.name;
                    profilesList.push(prof);
                });
            }
            if (group.selectionEntries) {
                group.selectionEntries.forEach(sub => extractProfiles(sub, profilesList, group.name, seen, wOnly));
            }
            if (group.entryLinks) extractProfiles({ entryLinks: group.entryLinks }, profilesList, group.name, seen, wOnly);
            if (group.selectionEntryGroups) extractProfiles({ selectionEntryGroups: group.selectionEntryGroups }, profilesList, group.name, seen, wOnly);
        });
    }
    return profilesList;
}

// RENDERIZAR DETALLE DE DATASHEET (INLINE ACCORDION)

// FALLBACK MOCK DATA (Por si el repo falla)

// RENDERIZAR LISTA NORMAL DE WEB APP
function renderJSONDatasheets(units) {
    const container = document.getElementById('datasheets-container');
    if(units.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No units found</div>';
        return;
    }
    
    const grouped = units.reduce((acc, unit) => {
        const role = unit.isAllied ? 'ALLIED UNITS' : (unit.role || 'Datasheet').toUpperCase();
        if (!acc[role]) acc[role] = [];
        acc[role].push(unit);
        return acc;
    }, {});

    const orderPriority = { 'EPIC HERO': 1, 'CHARACTER': 2, 'BATTLELINE': 3, 'ALLIED UNITS': 98 };
    const sortedRoles = Object.keys(grouped).sort((a, b) => {
        const priorityA = orderPriority[a] || 99;
        const priorityB = orderPriority[b] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.localeCompare(b);
    });

    let html = '';
    sortedRoles.forEach(role => {
        const roleUnits = grouped[role].slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base', numeric: true }));
        const safeRole = role.replace(/[^a-zA-Z]/g,'');
        const open = roleOpen(safeRole, 'search-input');
        html += `
            <div class="role-head${open ? ' open' : ''}" id="role-head-${safeRole}" onclick="toggleRole('${safeRole}')">
                <span>${role} <b>${roleUnits.length}</b></span>
                <i id="role-arrow-${safeRole}" class="fa-solid fa-chevron-down"></i>
            </div>
            <div id="role-container-${safeRole}" style="display:${open ? 'block' : 'none'};">
        `;
        
        roleUnits.forEach(unit => {
            let safeId = unit.id.replace(/[^a-zA-Z0-9_-]/g, '');
            if(!STATE.unitDict) STATE.unitDict = {};
            STATE.unitDict[safeId] = unit;
            
            html += `
                <div class="unit-card" onclick="selectUnit('${safeId}')" id="card-${safeId}">
                    <div class="unit-card-info">
                        <h4>${unit.name}</h4>
                        <p>${role}</p>
                    </div>
                    <div style="text-align:right;">
                        <div class="unit-card-pts">${unit.points} pts</div>
                        ${unit.comp ? `<div style="font-size:0.65rem; color:#888; text-transform:uppercase;">${unit.comp}</div>` : ''}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

window.toggleUnitSidebar = function() {
    const sidebar = document.getElementById('warmind-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if(overlay) overlay.style.display = 'none';
    } else {
        sidebar.classList.add('open');
        if(overlay) overlay.style.display = 'block';
    }
};


// Faction overview: army rules, every detachment (rules, enhancements, stratagems) and the faction's errata
window.showFactionOverview = function (target) {
    const main = target || document.getElementById('datasheet-detail-container'); if (!main) return;
    const meta = STATE.currentFactionMeta || {}, esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fm = t => (window.DETINFO ? DETINFO.fmt(t) : esc(t)).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const rules = (meta.rules || []).map(r => `<details class="dt-more fo-army"><summary>${esc(r.name)}</summary><div class="dt-body">${fm(r.description)}</div></details>`).join('');
    const dets = (STATE.currentFactionDetachments || []).map(d => { const fdc = getFDColor(d.forceDisposition); return `<div style="margin-bottom:14px;"><div style="padding:12px 14px; background:${fdc}1f; border:1px solid ${fdc}; border-left:5px solid ${fdc}; border-radius:10px; display:flex; justify-content:space-between; align-items:center; gap:10px;"><div><b style="color:#fff;">${esc(d.name)}</b><div>${fdChips(d.forceDisposition)}</div></div><span style="background:${fdc}; color:#fff; font-weight:800; border-radius:8px; padding:4px 10px; font-size:0.85rem;">${parseInt(d.dpCost) || 0} DP</span></div>${window.DETINFO ? DETINFO.detailsHtml(d, { enhancements: true }) : ''}</div>`; }).join('');
    const faq = (meta.faq || []).map(f => `<div class="dt-rule">${f.header ? `<div class="dt-rn">${fm(f.header)}</div>` : ''}${f.errata ? fm(f.errata) : ''}${f.q ? `<p><b>Q:</b> ${fm(f.q)}</p><p><b>A:</b> ${fm(f.a)}</p>` : ''}</div>`).join('');
    main.innerHTML = `<div style="animation: fadeIn 0.3s ease;"><h2 style="margin:0 0 4px; font-size:1.8rem; color:#fff;">${esc(meta.name || 'Faction')}</h2><p style="color:var(--text-muted); text-transform:uppercase; font-size:0.85rem; letter-spacing:1px; margin:0 0 16px;">Army rules &amp; detachments</p>
        <h3 class="ds-section-title" style="color:var(--accent); font-size:0.95rem; text-transform:uppercase;">Army rules</h3>${rules || '<div style="color:#888;">None listed.</div>'}
        <h3 class="ds-section-title" style="color:var(--accent); font-size:0.95rem; text-transform:uppercase; margin-top:22px;">Detachments</h3>${dets || '<div style="color:#888;">None listed.</div>'}
        ${faq ? `<h3 class="ds-section-title" style="color:var(--accent); font-size:0.95rem; text-transform:uppercase; margin-top:22px;">FAQ &amp; errata <span style="color:#888;">${(meta.faq || []).length}</span></h3><details class="dt-more"><summary>Show errata</summary><div class="dt-body">${faq}</div></details>` : ''}</div>`;
    if (!target && window.innerWidth <= 768 && typeof window.closeAllSidebars === 'function') window.closeAllSidebars();
};

// roster screen: "My roster" shows the units you added, "Faction rules & detachments" shows the faction overview in the same place
window.rosterShowPane = async function (which, closeSide) {
    const rules = which === 'rules', rp = document.getElementById('roster-faction-pane'), mp = document.getElementById('roster-main-pane');
    if (!rp || !mp) return;
    const side = document.getElementById('roster-pool-sidebar'), ov = document.getElementById('sidebar-overlay');
    if ((rules || closeSide) && side) { side.classList.remove('open'); if (ov) ov.style.display = 'none'; }
    const onB = document.getElementById('pool-done-top'), rlB = document.getElementById('rp-rules-btn');
    if (onB) onB.classList.toggle('on', !rules); if (rlB) rlB.classList.toggle('on', rules);
    if (rules) {
        const fac = currentActiveRoster && currentActiveRoster.faction;
        if (fac && STATE.loadedFaction !== fac.name && typeof preloadFactionData === 'function') {
            const f = (typeof FACTIONS !== 'undefined' && FACTIONS.find(x => x.name === fac.name)) || fac;
            rp.innerHTML = '<div class="skel" style="height:64px;"></div>'; rp.hidden = false; mp.hidden = true;
            await preloadFactionData(f); applyAccent(f.color || fac.color);
        }
        showFactionOverview(rp);
        rp.insertAdjacentHTML('afterbegin', `<button class="side-nav-btn side-roster fo-back" onclick="rosterShowPane('roster')"><i class="fa-solid fa-arrow-left"></i><span>My roster</span></button>`);
    }
    rp.hidden = !rules; mp.hidden = rules;
    const sc = rp.closest('.warmind-main'); if (sc) sc.scrollTop = 0; if (window.innerWidth < 900) window.scrollTo(0, 0);
    window.dispatchEvent(new Event('scroll'));   // the sticky points bar re-checks (it hides while the rules are shown)
};

// datasheets screen: "My roster" opens your roster for this faction (the open one, else the newest)
window.dsMyRoster = function () {
    const name = (document.getElementById('faction-title') || {}).textContent;
    if (typeof currentActiveRoster !== 'undefined' && currentActiveRoster && currentActiveRoster.faction && currentActiveRoster.faction.name === name && STATE.rosters.includes(currentActiveRoster)) return currentActiveRoster;
    const mine = (STATE.rosters || []).filter(r => r.faction && r.faction.name === name); return mine[mine.length - 1] || null;
};
window.dsOpenMyRoster = function () { const r = dsMyRoster(); if (r) { if (typeof closeAllSidebars === 'function') closeAllSidebars(); openRosterBuilder(r); } };
window.dsSyncMyRoster = function () { const b = document.getElementById('ds-myroster-btn'); if (b) b.hidden = !dsMyRoster(); };

// ---- loadout: models in the unit, count + points per size (MFM points win), wargear options ----
window.blLoadoutData = function (u, factionName) {
    const o = getMFMOverride(u.name, factionName || (STATE.currentFactionMeta && STATE.currentFactionMeta.name));
    const sizes = o ? [{ comp: o.comp, pts: o.basePts }].concat((o.options || []).map(x => ({ comp: x.comp, pts: x.pts }))) : [];
    const rows = (u.compositions || []).map(c => {
        const lo = c.models.reduce((s, m) => s + (m.min || 0), 0), hi = c.models.reduce((s, m) => s + (m.max || 0), 0);
        const hit = sizes.find(z => parseInt(z.comp) === hi) || sizes.find(z => { const n = parseInt(z.comp); return n >= lo && n <= hi; });
        return { models: c.models.map(m => ({ name: m.name, count: m.min === m.max ? String(m.min) : `${m.min}-${m.max}` })), total: lo === hi ? `${hi}` : `${lo}-${hi}`, pts: hit ? hit.pts : c.points, src: hit ? 'MFM' : '39k' };
    });
    return { rows, options: u.options || [] };
};
window.blLoadoutHtml = function (u, factionName) {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const d = blLoadoutData(u, factionName); let h = '';
    if (d.rows.length) h += `<div class="dt-rn" style="margin:6px 0;">Models &amp; points</div><table style="width:100%; border-collapse:collapse; font-size:0.85rem;"><tr style="color:#8c99b0; text-align:left;"><th style="padding:4px 0;">Model</th><th style="width:70px;">Count</th><th style="width:80px; text-align:right;">Points</th></tr>` + d.rows.map(r => r.models.map((m, i) => `<tr style="${i === 0 ? 'border-top:1px solid #243044;' : ''}"><td style="padding:4px 0;">${esc(m.name)}</td><td>${m.count}</td><td style="text-align:right;">${i === 0 ? `<b>${r.pts}</b>` : ''}</td></tr>`).join('')).join('') + '</table>';
    const gear = (u.models || []).filter(m => (m.equipped || []).length || (m.optional || []).length);
    if (gear.length) h += `<div class="dt-rn" style="margin:12px 0 6px;">What each model carries</div>` + gear.map(m => `<div style="margin-bottom:8px; line-height:1.45;"><b>${esc(m.name)}</b><br><span style="color:#b0c4de;">${(m.equipped || []).map(e => esc(e.item) + (e.count > 1 ? ' ×' + e.count : '')).join(', ') || '—'}</span>${(m.optional || []).length ? `<br><span style="color:#e5c15a; font-size:0.78rem;">Can also take: ${m.optional.map(esc).join(', ')}</span>` : ''}</div>`).join('');
    if (d.options.length) h += `<div class="dt-rn" style="margin:12px 0 6px;">Wargear options</div>` + d.options.map(o => `<div style="margin-bottom:8px; line-height:1.45;">${o.model ? `<span style="color:#8c99b0; font-size:0.72rem;">${esc(o.model)}</span><br>` : ''}${esc(o.text).replace(/\n/g, '<br>')}</div>`).join('');
    return h;
};

// ---- extra datasheet sections: MFM sizes & costs, leaders, damaged profiles, datasheet rules, FAQ ----
window.dsExtrasHtml = function (unit) {
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fmtT = t => (window.DETINFO ? DETINFO.fmt(t) : esc(t)).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    const sec = (title, body, open) => `<details class="dt-more" style="margin-bottom:12px;"${open ? ' open' : ''}><summary>${title}</summary><div class="dt-body">${body}</div></details>`;
    let out = '';
    const o = getMFMOverride(unit.name, STATE.currentFactionMeta && STATE.currentFactionMeta.name);
    if (o) {
        const sizes = [{ comp: o.comp, pts: o.basePts }].concat((o.options || []).map(x => ({ comp: x.comp, pts: x.pts })));
        const rows = sizes.map(s => `<tr><td>${esc(s.comp)}</td><td style="text-align:right;"><b>${s.pts} pts</b></td></tr>`).join('');
        let extra = '';
        if (o.thresholds && o.thresholds.length > 1) {
            let prev = 0; extra += '<div class="dt-rn" style="margin-top:10px;">Price by number of copies in your army</div>' + o.thresholds.map(t => { const r = `Copies ${prev + 1}${t.maxCount >= 99 ? '+' : '–' + t.maxCount}`; prev = t.maxCount; return `<div>${r}: <b>${t.pts} pts</b>${(t.optPts || []).map((p, i) => ` · ${esc(((o.options || [])[i] || {}).comp || '')} <b>${p} pts</b>`).join('')}</div>`; }).join('');
        }
        if (o.wargear && o.wargear.length) extra += '<div class="dt-rn" style="margin-top:10px;">Optional wargear</div>' + o.wargear.map(w => `<div>${esc(w.name)}: <b>+${w.pts} pts</b></div>`).join('');
        out += sec('Unit size & points <span>' + (o.manual ? 'manual' : 'MFM') + '</span>', `<table style="width:100%; border-collapse:collapse;">${rows}</table>${extra}${o.manual && window.MFM_MANUAL ? `<div class="dt-src" style="color:#e5c15a;">✎ ${MFM_MANUAL.note[(localStorage.getItem('gdm_lang') || 'en') === 'es' ? 'es' : 'en']}</div>` : '<div class="dt-src">Points from the Munitorum Field Manual. Pick the size and wargear in the roster builder; the total updates automatically.</div>'}`, true);
    }
    const leadTxt = (unit.leads || []).map(g => { const names = [].concat(g.units || [], (g.keywords || []).map(k => k + ' units')); return `<div style="margin-bottom:6px;"><b>${g.type === 'support' ? 'Support' : 'Leader'}</b>${g.onlyIn ? ` <i>(only with ${esc(g.onlyIn)})</i>` : ''}${g.notIn ? ` <i>(not with ${esc(g.notIn)})</i>` : ''}: ${names.map(esc).join(', ')}</div>`; }).join('');
    const ledTxt = (unit.ledBy || []).length ? `<div><b>Can be led by:</b> ${unit.ledBy.map(esc).join(', ')}</div>` : '';
    if (leadTxt || ledTxt) out += sec('Leaders & attached units', (leadTxt ? `<div class="dt-rn">Can be attached to</div>${leadTxt}` : '') + ledTxt);
    if ((unit.damage || []).length) out += sec('Damaged profile', unit.damage.map(d => `<div class="dt-rule"><div class="dt-rn">${esc(d.name)}</div>${fmtT(d.rules)}</div>`).join(''));
    if ((unit.rules || []).length) out += sec('Datasheet rules', unit.rules.map(d => `<div class="dt-rule"><div class="dt-rn">${esc(d.name)}</div>${fmtT(d.description)}</div>`).join(''));
    if ((unit.faq || []).length) out += sec(`FAQ & errata <span>${unit.faq.length}</span>`, unit.faq.map(f => `<div class="dt-rule">${f.header ? `<div class="dt-rn">${fmtT(f.header)}</div>` : ''}${f.errata ? fmtT(f.errata) : ''}${f.q ? `<p><b>Q:</b> ${fmtT(f.q)}</p><p><b>A:</b> ${fmtT(f.a)}</p>` : ''}</div>`).join(''));
    return out;
};

window.selectUnit = function(safeId) {
    document.querySelectorAll('.unit-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('card-' + safeId);
    if(card) card.classList.add('active');

    if(typeof window.closeAllSidebars === 'function') window.closeAllSidebars();

    const unit = STATE.unitDict[safeId];
    if(!unit) return;

    const main = document.getElementById('datasheet-detail-container');

    // 1. Stats (one block per model type when the unit has more than one stat line)
    let statsHtml = '';
    const statBlock = (st, title) => { let h = title ? `<div style="font-size:0.78rem; color:#8c99b0; margin:0 0 6px;">${title}</div>` : ''; h += '<div class="ds-stats-row" style="margin-bottom:14px; display:flex; gap:10px; flex-wrap:wrap;">';
        for (const [key, val] of Object.entries(st)) h += `<div class="ds-stat-box" style="background:#1a222d; border:1px solid #2a3545; border-radius:6px; padding:10px; text-align:center; flex:1; min-width:50px;"><span style="display:block; font-size:0.75rem; color:#888; text-transform:uppercase;">${key}</span><strong style="display:block; font-size:1.1rem; margin-top:5px; color:#fff;">${val}</strong></div>`;
        return h + '</div>'; };
    if (unit.models && unit.models.length > 1 && unit.models.some(m => ['T', 'Sv', 'W', 'Ld', 'OC', 'M'].some(k => m[k] !== unit.models[0][k]))) statsHtml = unit.models.map(m => statBlock(Object.assign({ M: m.M, T: m.T, Sv: m.Sv, W: m.W, Ld: m.Ld, OC: m.OC }, m.invuln && m.invuln !== '-' ? { INV: m.invuln } : {}), m.name)).join('');
    else if (unit.stats) statsHtml = statBlock(unit.stats, '');

    // 2. Invuln Save
    let invulnHtml = '';
    if (unit.invuln && unit.invuln !== '-') {
        invulnHtml = `
            <div style="background:#1a222d; border:1px solid var(--accent); border-radius:6px; padding:10px; margin-bottom:20px; text-align:center; color:var(--accent); font-weight:bold; letter-spacing:1px; font-size:1.1rem;">
                INVULNERABLE SAVE: ${unit.invuln}
            </div>
        `;
    }

    
    // Weapons
    let weaponsHtml = '';
    if (unit.weapons && unit.weapons.length > 0) {
        weaponsHtml = '<div style="margin-bottom:20px;"><h3 class="ds-section-title" style="color:var(--accent); border-bottom:1px solid #1a222d; padding-bottom:5px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase;"><i class="fa-solid fa-crosshairs"></i> WEAPONS</h3><div style="display:flex; flex-direction:column; gap:10px;">';
        unit.weapons.forEach(w => {
            let keywordBubbles = '';
            if (w.keywords && w.keywords.length > 0) {
                w.keywords.forEach(k => {
                    keywordBubbles += `<span style="display:inline-block; border:1px solid var(--accent); color:var(--accent); background:rgba(0,0,0,0.2); padding:3px 8px; border-radius:4px; font-size:0.7rem; text-transform:uppercase; font-weight:bold; margin-right:5px; margin-top:8px;">${k}</span>`;
                });
            }
            let isMelee = w.type === 'Melee' || w.range === 'Melee';
            let bsName = isMelee ? 'WS' : 'BS';
            
            weaponsHtml += `
                <div style="background:#141b25; border:1px solid #1a222d; border-radius:6px; padding:10px;">
                    <div style="color:#fff; font-weight:bold; font-size:0.95rem; margin-bottom:8px;">➤ ${w.name}${w.optional ? ' <span style="font-size:0.62rem; color:#e5c15a; border:1px solid #6b5a2a; border-radius:4px; padding:1px 5px; margin-left:6px; vertical-align:middle;">OPTION</span>' : ''}</div>
                    <div style="display:flex; justify-content:space-between; background:#0b0f16; padding:5px; border-radius:4px; text-transform:uppercase;">
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">Range</div>
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">A</div>
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">${bsName}</div>
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">S</div>
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">AP</div>
                        <div style="flex:1; text-align:center; font-size:0.7rem; color:#888;">D</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding:5px;">
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.range || '-'}</div>
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.A || '-'}</div>
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.BS || '-'}</div>
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.S || '-'}</div>
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.AP || '-'}</div>
                        <div style="flex:1; text-align:center; font-size:0.9rem; font-weight:bold; color:#fff;">${w.D || '-'}</div>
                    </div>
                    ${keywordBubbles}
                </div>
            `;
        });
        weaponsHtml += '</div></div>';
    }

    // 3. Abilities

    let abilitiesHtml = '';
    if (unit.abilities && unit.abilities.length > 0) {
        abilitiesHtml = '<div class="abilities-container"><h3 class="ds-section-title" style="color:var(--accent); border-bottom:1px solid #1a222d; padding-bottom:5px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase;"><i class="fa-solid fa-bolt"></i> ABILITIES & RULES</h3>';
        const fmtA = t => String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        const facNames = unit.abilities.filter(a => a.type === 'faction').map(a => a.name);
        if (facNames.length) abilitiesHtml += `<div style="margin-bottom:12px; font-size:0.85rem; color:#b0c4de;"><b style="color:var(--accent);">Faction abilities:</b> ${facNames.join(' · ')} <span style="color:#667;">(see Faction rules &amp; detachments)</span></div>`;
        unit.abilities.forEach(a => {
            if (a.type === 'faction') return;
            const desc = a.description && a.description !== '-' ? fmtA(a.description) : '';
            if (!desc && !(a.sub || []).length) return;   // no text and nothing under it
            const subs = (a.sub || []).map(s => `<div style="margin:8px 0 0 12px; padding:8px 10px; background:#0f1620; border-left:2px solid #5b6b80; border-radius:6px;"><div style="color:#fff; font-weight:bold; font-size:0.85rem; margin-bottom:3px;">${s.name}</div><div style="font-size:0.83rem; color:#b0c4de; line-height:1.4; white-space:pre-wrap;">${fmtA(s.description)}</div></div>`).join('');
            
            const isCore = a.type === 'core' || /\bcore\b/i.test(a.name || '') || /^(leader|support|deadly demise|deep strike|infiltrators|scouts|stealth|feel no pain|lone operative|firing deck)/i.test(a.name || '');
            const isLong = (a.description || '').length > 200 || (a.sub || []).length > 1 || /attached units/i.test(a.description || '');
            const cleanName = String(a.name || '').replace(/\s+CORE$/i, '');
            const badge = (isCore || a.type === 'core') ? ' <span style="font-size:0.65rem; color:#8c99b0; border:1px solid #3a4556; border-radius:4px; padding:1px 5px; margin-left:6px; vertical-align:middle; text-transform:uppercase;">CORE</span>' : '';

            if (isCore || isLong) {
                abilitiesHtml += `
                    <details class="dt-more" style="margin-bottom:10px;">
                        <summary>
                            <span>
                                <strong style="color:var(--accent); font-size:0.9rem;">${cleanName}</strong>${badge}
                            </span>
                        </summary>
                        <div class="dt-body" style="padding:10px 14px 14px;">
                            ${desc ? `<div class="ability-desc" style="font-size:0.85rem; color:#b0c4de; line-height:1.4; background:#141b25; padding:10px; border-radius:6px; border-left:2px solid var(--accent); white-space:pre-wrap;">${desc}</div>` : ''}
                            ${subs}
                        </div>
                    </details>
                `;
            } else {
                abilitiesHtml += `
                    <div class="ability-block" style="margin-bottom:15px;">
                        <div class="ability-name" style="color:var(--accent); font-weight:bold; font-size:0.9rem; margin-bottom:5px;">
                            <span>${cleanName}</span>${badge}
                        </div>
                        ${desc ? `<div class="ability-desc" style="font-size:0.85rem; color:#b0c4de; line-height:1.4; background:#141b25; padding:10px; border-radius:6px; border-left:2px solid var(--accent); white-space:pre-wrap;">${desc}</div>` : ''}${subs}
                    </div>
                `;
            }
        });
        abilitiesHtml += '</div>';
    }
    
    // Weapon keyword explanations (from the 39k wargear-ability glossary) and the faction's army rules
    const gl = window.BL_GLOSSARY || {}, gk = k => { let u = String(k).toUpperCase().split(':')[0].replace(/\s+(X|D?\d+\+?|\d*D\d+)$/, '').trim(); return gl[u] ? u : (gl[u.split('-')[0]] ? u.split('-')[0] : null); };
    const used = [], seenK = new Set();
    (unit.weapons || []).forEach(w => (w.keywords || []).forEach(k => { const g = gk(k); if (g && !seenK.has(g)) { seenK.add(g); used.push(g); } }));
    const glossHtml = used.length ? `<details class="dt-more" style="margin-bottom:16px;"><summary>Weapon keywords <span>${used.length}</span></summary><div class="dt-body">${used.map(g => `<div class="dt-rule"><div class="dt-rn">${g}</div>${window.DETINFO ? DETINFO.fmt(gl[g]).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') : gl[g]}</div>`).join('')}</div></details>` : '';
    const meta = STATE.currentFactionMeta || {}, fr = (meta.rules || []);
    const armyHtml = fr.length ? `<details class="dt-more" style="margin-bottom:16px;"><summary>${meta.name || 'Faction'} army rules <span>${fr.length}</span></summary><div class="dt-body">${fr.map(r => `<div class="dt-rule"><div class="dt-rn">${r.name}</div>${window.DETINFO ? DETINFO.fmt(r.description).replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') : r.description}</div>`).join('')}</div></details>` : '';

    if ((unit.wargearAbilities || []).length) abilitiesHtml += '<div class="abilities-container" style="margin-top:14px;"><h3 class="ds-section-title" style="color:var(--accent); border-bottom:1px solid #1a222d; padding-bottom:5px; margin-bottom:10px; font-size:0.95rem; text-transform:uppercase;"><i class="fa-solid fa-toolbox"></i> WARGEAR ABILITIES</h3>' + unit.wargearAbilities.map(w => `<div class="ability-block" style="margin-bottom:15px;"><div class="ability-name" style="color:var(--accent); font-weight:bold; font-size:0.9rem; margin-bottom:5px;">${w.name}</div><div class="ability-desc" style="font-size:0.85rem; color:#b0c4de; line-height:1.4; background:#141b25; padding:10px; border-radius:6px; border-left:2px solid var(--accent); white-space:pre-wrap;">${String(w.description).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')}</div></div>`).join('') + '</div>';

    // 4. Unit composition: what the models carry, count + points per size, wargear options
    let compHtml = '';
    { const eq = unit.composition ? `<div style="font-size:0.85rem; color:#b0c4de; line-height:1.4;">${formatWahapediaText(String(unit.composition).replace(/■/g, '•'))}</div>` : '', lo = blLoadoutHtml(unit);
      if (eq || lo) compHtml = `<div style="margin-bottom:20px; background:#141b25; border:1px solid #1a222d; border-radius:6px; padding:12px;"><h4 style="color:#888; text-transform:uppercase; font-size:0.75rem; margin:0 0 8px 0; border-bottom:1px solid #222; padding-bottom:5px;">UNIT COMPOSITION &amp; WARGEAR</h4>${eq}${lo ? `<div style="margin-top:12px;">${lo}</div>` : ''}<div class="dt-src" style="margin-top:8px;">Points: Munitorum Field Manual where it lists the size.</div></div>`; }

    // 5. Keywords
    let kwHtml = '<div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:20px;">';
    if (unit.keywords) {
        unit.keywords.forEach(k => {
            kwHtml += `<span style="background:#222; border:1px solid #444; color:#aaa; font-size:0.7rem; text-transform:uppercase; padding:3px 8px; border-radius:4px;">${k}</span>`;
        });
    }
    if (unit.factionKeywords) {
        unit.factionKeywords.forEach(k => {
            kwHtml += `<span style="background:rgba(0,0,0,0.3); border:1px solid var(--accent); color:var(--accent); font-size:0.7rem; text-transform:uppercase; font-weight:bold; padding:3px 8px; border-radius:4px;">FACTION: ${k}</span>`;
        });
    }
    kwHtml += '</div>';

    const addBtnHtml = (typeof currentActiveRoster !== 'undefined' && typeof isBuilderMode !== 'undefined' && isBuilderMode) ? 
        `<button class="add-btn" onclick="addToRoster('${unit.name.replace(/'/g, "\'")}', ${unit.points})" style="margin-top:20px; width:100%; background:var(--accent); color:#000; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-plus"></i> ADD TO ROSTER</button>` : '';

    main.innerHTML = `
        <div style="animation: fadeIn 0.3s ease;">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
                <div>
                    <h2 style="margin:0; font-size:1.8rem; color:#fff;">${unit.name}</h2>
                    <p style="color:var(--text-muted); text-transform:uppercase; font-size:0.85rem; letter-spacing:1px; margin-top:5px;">${unit.role || 'Datasheet'}</p>
                </div>
                <div style="background:var(--accent); color:#000; font-weight:bold; padding:8px 15px; border-radius:20px; font-size:1.1rem; box-shadow:0 0 10px rgba(0,255,204,0.2);">
                    ${unit.points || 0} PTS
                </div>
            </div>
            ${statsHtml}
            ${invulnHtml}
            ${weaponsHtml}
            ${abilitiesHtml}
            ${window.dsExtrasHtml ? dsExtrasHtml(unit) : ''}
            ${glossHtml}${armyHtml}
            ${compHtml}
            ${kwHtml}
            ${addBtnHtml}
        </div>
    `;
}


// ==========================================
// ROSTERS (GUARDADO LOCAL)
// ==========================================
window.addToRoster = (unitName, points) => {
    if(!currentActiveRoster) {
        alert("Please create a roster first.");
        return;
    }
    currentActiveRoster.units.push({ id: Date.now().toString(), name: unitName, pts: points });
    
    // Buscar y actualizar en STATE
    const rIndex = STATE.rosters.findIndex(r => r.id === currentActiveRoster.id);
    if(rIndex > -1) STATE.rosters[rIndex] = currentActiveRoster;
    
    saveRosters();
    renderRosterBuilder();
    
    // Feedback visual opcional
    alert(`Added ${unitName} to roster!`);
};

function saveRosters() {
    localStorage.setItem('battlelist_rosters', JSON.stringify(STATE.rosters));
}

// ---------- roster builder helpers ----------
window.rosterMaxDp = limit => limit > 2000 ? 4 : limit > 1000 ? 3 : 2;
window.rosterUsedDp = roster => (STATE.currentFactionDetachments || []).filter(d => (roster.detachments || []).includes(d.id)).reduce((s, d) => s + (parseInt(d.dpCost) || 0), 0);
window.fdChips = function (fd) {
    return String(fd || '').split(',').map(x => x.trim()).filter(Boolean).map(x => { const c = getFDColor(x); return `<span style="display:inline-block; background:${c}33; color:#fff; border:1px solid ${c}; border-radius:6px; padding:2px 8px; font-size:0.68rem; font-weight:700; margin:4px 6px 0 0;">${x}</span>`; }).join('');
};
// MFM sizes + points (copies of the same unit can change the price tier)
window.rosterUnitSizes = function (name) {
    const o = getMFMOverride(name); if (!o) return null;
    return { o, sizes: [{ comp: o.comp }].concat((o.options || []).map(x => ({ comp: x.comp }))) };
};
window.rosterUnitPts = function (u, copyNo) {
    const info = rosterUnitSizes(u.name); if (!info) return u.pts;
    const o = info.o, opts = o.options || [];
    if (u.sizeIdx === undefined) u.sizeIdx = (opts.length && u.pts > o.basePts) ? 1 : 0;   // rosters saved before sizes existed
    const si = Math.min(u.sizeIdx, opts.length);
    let tier = null;
    if (o.thresholds && o.thresholds.length) { tier = o.thresholds[0]; for (const t of o.thresholds) { if (copyNo <= t.maxCount) { tier = t; break; } } }
    if (si === 0) return tier ? tier.pts : o.basePts;
    return (tier && tier.optPts && tier.optPts[si - 1] != null) ? tier.optPts[si - 1] : (opts[si - 1] ? opts[si - 1].pts : o.basePts);
};
// optional per-weapon wargear costs from the MFM (e.g. a monster whose two gun options cost +10 / +20)
window.rosterWgList = u => { const o = getMFMOverride(u.name); return (o && o.wargear) || []; };
window.rosterWgCost = u => rosterWgList(u).reduce((s, w) => s + ((u.wg || []).includes(w.name) ? w.pts : 0), 0);
window.toggleWargear = function (index, name) {
    const u = currentActiveRoster && currentActiveRoster.units[index]; if (!u) return;
    u.wg = u.wg || []; const i = u.wg.indexOf(name); if (i >= 0) u.wg.splice(i, 1); else u.wg.push(name);
    saveRosters(); renderRosterBuilder();
};
window.wargearHtml = function (index, u) {
    const l = rosterWgList(u); if (!l.length) return '';
    return '<div onclick="event.stopPropagation()" style="margin-top:8px; display:flex; gap:8px; flex-wrap:wrap;">' + l.map(w => { const on = (u.wg || []).includes(w.name); return `<button onclick="toggleWargear(${index}, '${w.name.replace(/'/g, "\\'")}')" style="min-height:40px; padding:0 12px; border-radius:10px; font-size:0.8rem; cursor:pointer; border:1px solid ${on ? 'var(--accent)' : 'rgba(255,255,255,.25)'}; background:${on ? 'rgba(255,122,61,.15)' : 'transparent'}; color:#fff;">${on ? '✓ ' : '＋ '}${w.name} +${w.pts}</button>`; }).join('') + '</div>';
};
window.setUnitSize = function (index, si) {
    if (!currentActiveRoster || !currentActiveRoster.units[index]) return;
    currentActiveRoster.units[index].sizeIdx = si; saveRosters(); renderRosterBuilder();
};
window.removeUnitAt = function (index) {
    if (!currentActiveRoster) return;
    currentActiveRoster.units.splice(index, 1); saveRosters(); renderRosterBuilder();
};

// ---- datasheet snapshot kept inside the roster (so weapons / stats show offline and after reloads) ----
// keywords from the unit's category links: [keywords, faction keywords]
window.unitKeywords = function (u) {
    if (u && (u.factionKeywords || (u.stats && !u.categoryLinks))) return [(u.keywords || []).slice(), (u.factionKeywords || []).slice()];   // 39k datasheet
    const names = ((u && u.categoryLinks) || []).map(c => String(c.name || '').trim()).filter(Boolean);
    const seen = new Set(), uniq = n => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; };
    const fk = names.filter(n => /^Faction:/i.test(n)).map(n => n.replace(/^Faction:\s*/i, '')).filter(uniq);
    const kw = names.filter(n => !/^Faction:/i.test(n) && !/legend/i.test(n)).filter(uniq);
    return [kw, fk];
};
window.keywordsHtml = function (kw, fk) {
    if (!(kw && kw.length) && !(fk && fk.length)) return '';
    const chips = (l, cls) => l.map(k => `<span class="kw-chip ${cls}">${String(k).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</span>`).join('');
    return `<div class="kw-block">${kw && kw.length ? `<div class="kw-row"><span class="kw-lbl">Keywords</span>${chips(kw, '')}</div>` : ''}${fk && fk.length ? `<div class="kw-row"><span class="kw-lbl">Faction</span>${chips(fk, 'f')}</div>` : ''}</div>`;
};
// description of any ability-like profile (custom ability types use Description/Effect/etc.)
window.profDesc = function (p) {
    const cs = p.characteristics || []; const d = cs.find(c => ['Description', 'Effect', 'Capacity', 'Details'].includes(c.name)) || cs[0];
    return d ? String(d.$text == null ? '' : d.$text) : '';
};
const NON_ABILITY = /^(Unit|Model|Ranged Weapons?|Melee Weapons?|KeywordRule)$/;
// collapsible definitions of the weapon keywords a unit's weapons use (Rapid Fire, Melta, Twin-linked…)
window.weaponRulesHtml = function (list) {
    if (!list || !list.length) return '';
    return `<details class="kr-more"><summary>Weapon rules <span>${list.length}</span></summary>${list.map(r => `<div class="kr-it"><b>${String(r.n).replace(/</g, '&lt;')}</b><div>${formatBSText(r.d)}</div></div>`).join('')}</details>`;
};
// 39k keyword -> glossary entry (Rapid Fire 2 -> RAPID FIRE, Anti-Infantry 4+ -> ANTI-INFANTRY / ANTI)
window.glossKey = function (k) { const gl = window.BL_GLOSSARY || {}, u = String(k).toUpperCase().split(':')[0].replace(/\s+(X|D?\d+\+?|\d*D\d+)$/, '').trim(); return gl[u] ? u : (gl[u.split('-')[0]] ? u.split('-')[0] : null); };
// abilities for a frozen roster/tracker/PDF datasheet: sub-abilities (e.g. a Primarch's three choices) are folded into the text, faction abilities listed by name
window.snapAbilities = function (u, plain) {
    const out = [], fac = (u.abilities || []).filter(a => a.type === 'faction').map(a => a.name);
    (u.abilities || []).forEach(a => {
        if (a.type === 'faction') return;
        const d = a.description && a.description !== '-' ? plain(a.description) : '', subs = (a.sub || []).map(s => `• ${s.name}: ${plain(s.description).replace(/\n+/g, ' ')}`).join('\n');
        if (!d && !subs) return;
        out.push({ n: a.name, d: [d, subs].filter(Boolean).join('\n'), g: a.type === 'core' ? 'Core' : '' });
    });
    (u.wargearAbilities || []).forEach(w => out.push({ n: w.name, d: plain(w.description), g: 'Wargear' }));
    if (fac.length) out.push({ n: 'Faction abilities', d: fac.join(', '), g: '' });
    return out;
};
window.rosterSnap39k = function (u) {
    const s = u.stats || {}, plain = t => String(t == null ? '' : t).replace(/\*\*(.*?)\*\*/g, '$1');
    const statLine = (m) => { const c = [['M', m.M], ['T', m.T], ['SV', m.Sv], ['W', m.W], ['LD', m.Ld], ['OC', m.OC]].map(([k, v]) => [k, String(v == null ? '-' : v)]); const iv = m.invuln != null ? m.invuln : u.invuln; if (iv && iv !== '-') c.push(['INV', iv]); return c; };
    const statList = (u.models && u.models.length > 1) ? u.models.map(m => ({ n: m.name, c: statLine(m) })) : [{ n: u.name, c: statLine(s) }];
    const weapons = (u.weapons || []).map(w => ({ t: (w.type === 'Melee' || w.range === 'Melee') ? 'm' : 'r', n: w.name + (w.optional ? ' (option)' : ''), k: (w.keywords || []).slice(), c: [w.range || '', w.A || '', w.BS || '', w.S || '', w.AP || '', w.D || ''] }));
    const seen = new Set(), gl = window.BL_GLOSSARY || {}, kr = [];
    weapons.forEach(w => w.k.forEach(k => { const g = glossKey(k); if (g && !seen.has(g)) { seen.add(g); kr.push({ n: g, d: plain(gl[g]) }); } }));
    return { v: 4, src: '39k5', stats: statList, comp: u.composition ? plain(String(u.composition).replace(/■/g, '•')) : '', compositions: u.compositions || [], options: u.options || [], pname: u.name, models: (u.models || []).map(m => ({ name: m.name, equipped: m.equipped, optional: m.optional })), weapons, abilities: snapAbilities(u, plain), kw: (u.keywords || []).slice(), fk: (u.factionKeywords || []).slice(), kr };
};
window.rosterSnap = function (full) {
    if (full && !full.catalogue && !full.categoryLinks && full.stats && typeof full.stats === 'object' && !Array.isArray(full.stats)) return rosterSnap39k(full);
    const profs = extractProfiles(full), ch = p => { const o = {}; (p.characteristics || []).forEach(x => o[x.name] = String(x.$text == null ? '' : x.$text)); return o; };
    const stats = profs.filter(p => p.typeName === 'Unit' || p.typeName === 'Model').map(p => ({ n: p.name || '', c: (p.characteristics || []).map(x => [x.name, String(x.$text == null ? '' : x.$text)]) }));
    const weapons = profs.filter(p => /Weapon/.test(p.typeName)).map(p => { const c = ch(p), m = String(p.name || '').match(/\[([^\]]+)\]/); return { t: /Melee/.test(p.typeName) ? 'm' : 'r', n: String(p.name || '').replace(/\s*\[[^\]]+\]/, '').trim(), k: [...new Set((m ? m[1].split(',') : []).concat(String(c.Keywords || '') === '-' ? [] : String(c.Keywords || '').split(',')).map(s => s.trim()).filter(Boolean))], c: [c.Range || '', c.A || '', c.BS || c.WS || '', c.S || '', c.AP || '', c.D || ''] }; });
    const abilities = profs.filter(p => !NON_ABILITY.test(p.typeName || '')).map(p => ({ n: p.name || '', d: profDesc(p), g: p.parentGroupName || (/^Abilit/.test(p.typeName || '') ? '' : (p.typeName || '')) })).filter(x => x.d);
    const [kw, fk] = unitKeywords(full);
    const used = weapons.flatMap(w => w.k).map(k => String(k).toUpperCase().replace(/-/g, ' '));
    const kr = profs.filter(p => p.typeName === 'KeywordRule' && used.some(k => k.startsWith(String(p.name).toUpperCase().replace(/-/g, ' ')))).map(p => ({ n: p.name, d: profDesc(p) })).filter(x => x.d);
    return { v: 4, stats, weapons, abilities, kw, fk, kr };
};
window.dsTab = function (index, k) {
    const p = document.getElementById('ru-details-' + index); if (!p) return;
    p.querySelectorAll('.ds-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === k));
    p.querySelectorAll('.ds-pane').forEach(d => { const on = d.dataset.pane === k; d.style.display = on ? 'block' : 'none'; if (on) { d.classList.remove('ds-in'); void d.offsetWidth; d.classList.add('ds-in'); } });
};
window.rosterDetailsHtml = function (index, s) {
    const group = (list, key) => { const m = new Map(); list.forEach(x => { const k = key(x); const e = m.get(k); if (e) e.count++; else m.set(k, Object.assign({ count: 1 }, x)); }); return [...m.values()]; };
    const st = group(s.stats || [], x => JSON.stringify(x.c));
    const statsHtml = st.map(x => `<div style="margin-bottom:10px;">${st.length > 1 && x.n ? `<div style="font-size:0.72rem; color:#8c99b0; margin-bottom:4px;">${x.n}${x.count > 1 ? ' ×' + x.count : ''}</div>` : ''}<div style="display:grid; grid-template-columns:repeat(${Math.min(7, x.c.length || 1)}, 1fr); gap:6px;">${x.c.map(([k, v]) => `<div style="background:#1a2540; border-radius:8px; padding:6px 2px; text-align:center;"><div style="font-size:0.6rem; color:#8c99b0; letter-spacing:.06em;">${String(k).toUpperCase()}</div><div style="font-weight:700; color:#fff;">${v}</div></div>`).join('')}</div></div>`).join('');
    const wpn = (t, title, skill) => {
        const list = group((s.weapons || []).filter(w => w.t === t), w => w.n + JSON.stringify(w.c) + w.k.join()); if (!list.length) return '';
        return `<div style="margin-top:12px;"><div style="font-size:0.72rem; font-weight:700; letter-spacing:.1em; color:var(--accent); margin-bottom:6px;">${title}</div>${list.map(w => `<div style="background:#0f1a30; border:1px solid rgba(255,255,255,.07); border-radius:10px; padding:8px 10px; margin-bottom:6px;">
            <div style="display:flex; align-items:baseline; gap:6px; flex-wrap:wrap;"><b style="color:#fff;">${w.n}</b>${w.count > 1 ? `<span style="color:#8c99b0; font-size:0.75rem;">×${w.count}</span>` : ''}${w.k.map(k => `<span style="background:rgba(255,255,255,.08); border-radius:6px; padding:1px 7px; font-size:0.65rem; font-weight:700; color:#cfd8e3;">${k}</span>`).join('')}</div>
            <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:4px; margin-top:6px; text-align:center;">${['Range', 'A', skill, 'S', 'AP', 'D'].map((l, i) => `<div><div style="font-size:0.58rem; color:#8c99b0;">${l}</div><div style="font-weight:700; color:#fff; font-size:0.9rem;">${w.c[i] || '–'}</div></div>`).join('')}</div></div>`).join('')}</div>`;
    };
    const ab = (s.abilities || []).map(x => {
        const isCore = x.g === 'Core' || /\bcore\b/i.test(x.n || '') || /^(leader|support|deadly demise|deep strike|infiltrators|scouts|stealth|feel no pain|lone operative|firing deck)/i.test(x.n || '');
        const isLong = (x.d || '').length > 200 || /attached units/i.test(x.d || '');
        const cleanName = String(x.n || '').replace(/\s+CORE$/i, '');
        if (isCore || isLong) {
            return `<details class="dt-more" style="margin-bottom:8px;">
                <summary><span><strong style="color:var(--accent);">${cleanName}</strong>${(isCore || x.g) ? ` <span style="font-size:0.62rem; color:#8c99b0; border:1px solid #3a4556; border-radius:4px; padding:1px 5px; margin-left:6px; vertical-align:middle; text-transform:uppercase;">${x.g || 'CORE'}</span>` : ''}</span></summary>
                <div class="dt-body" style="padding:8px 12px 12px; color:#b9c4d6;">${formatBSText(x.d)}</div>
            </details>`;
        }
        return `<div style="margin-bottom:8px;">${x.g ? `<span class="ab-grp">${x.g}</span>` : ''}<strong style="color:#fff;">${x.n}:</strong> <span style="color:#b9c4d6;">${formatBSText(x.d)}</span></div>`;
    }).join('');
    const hasW = (s.weapons || []).length, hasA = !!ab, hasL = !!(s.comp || (s.compositions || []).length || (s.options || []).length);
    const loadoutPane = hasL ? `${s.comp ? `<div style="margin-bottom:10px; color:#b9c4d6; line-height:1.45;">${formatBSText(s.comp)}</div>` : ''}${blLoadoutHtml({ name: s.pname || '', compositions: s.compositions, options: s.options, models: s.models })}` : '';
    const pane = (k, inner, on) => `<div class="ds-pane" data-pane="${k}" style="display:${on ? 'block' : 'none'};">${inner}</div>`;
    const tab = (k, label, on) => `<button class="ds-tab${on ? ' on' : ''}" data-tab="${k}" onclick="event.stopPropagation(); dsTab('${index}', '${k}')">${label}</button>`;
    return `<div class="unit-details-panel" id="ru-details-${index}" style="display:none; padding:12px 15px 16px; background:#0a1020; border-top:1px solid rgba(255,255,255,.07); font-size:0.85rem;">
        <div class="ds-tabs" role="tablist">${tab('stats', 'Stats', true)}${hasW ? tab('weapons', 'Weapons <span>' + hasW + '</span>', false) : ''}${hasA ? tab('abilities', 'Abilities <span>' + (s.abilities || []).length + '</span>', false) : ''}${hasL ? tab('loadout', 'Loadout', false) : ''}</div>
        ${pane('stats', statsHtml || '<div style="color:#8c99b0;">No stat line saved.</div>', true)}
        ${hasW ? pane('weapons', wpn('r', 'RANGED WEAPONS', 'BS') + wpn('m', 'MELEE WEAPONS', 'WS') + weaponRulesHtml(s.kr), false) : ''}
        ${hasA ? pane('abilities', ab, false) : ''}
        ${hasL ? pane('loadout', loadoutPane, false) : ''}
        ${keywordsHtml(s.kw, s.fk)}</div>`;
};

// ---------- enhancements (cost counts toward the roster total; max 3, each once, CHARACTER bearers only) ----------

// collapsible blocks inside a roster's detachment (rules / enhancements); the open state survives re-renders
window.BL_DET_OPEN = window.BL_DET_OPEN || new Set();
// a saved roster keeps detachment ids built from the name; when the MFM only re-capitalises a name (or changes the hyphen style) the id
// changes too — re-link those so the roster keeps its detachment
window.blRelinkDetachments = function (r) {
    const list = STATE.currentFactionDetachments || []; if (!r || !(r.detachments || []).length || !list.length) return;
    const k = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''); let changed = false;
    r.detachments = r.detachments.map(id => { if (list.some(d => d.id === id)) return id; const hit = list.find(d => k(d.id) === k(id)); if (hit) { changed = true; return hit.id; } return id; });
    (r.units || []).forEach(u => { if (u.enh && u.enh.detId && !list.some(d => d.id === u.enh.detId)) { const hit = list.find(d => k(d.id) === k(u.enh.detId)); if (hit) { u.enh.detId = hit.id; changed = true; } } });
    if (changed && typeof saveRosters === 'function') saveRosters();
};
window.detSec = (key, head, body) => `<details class="det-sec" data-k="${String(key).replace(/"/g, '')}"${BL_DET_OPEN.has(key) ? ' open' : ''}><summary>${head}</summary><div class="det-sec-body">${body}</div></details>`;
document.addEventListener('toggle', e => { const d = e.target; if (d && d.classList && d.classList.contains('det-sec')) { const k = d.dataset.k; if (d.open) BL_DET_OPEN.add(k); else BL_DET_OPEN.delete(k); } }, true);
window.BL_DET_CLOSED = window.BL_DET_CLOSED || new Set();   // detachment cards start open; remember the ones the player folded
document.addEventListener('toggle', e => { const d = e.target; if (d && d.classList && d.classList.contains('det-card')) { const k = d.dataset.k; if (d.open) BL_DET_CLOSED.delete(k); else BL_DET_CLOSED.add(k); } }, true);
window.ENH_MAX = 4;            // enhancements per army (upgrades count toward it)
window.ENH_UPGRADE_COPIES = 3;   // an "(Upgrade)" enhancement can be taken up to 3 times
window.isUpgrade = e => /\(upgrade\)/i.test((e && e.name) || '');
window.enhCost = e => parseInt(String((e && e.cost) == null ? '' : e.cost).replace(/[^0-9]/g, '')) || 0;
window.unitRole = function (u) { const d = (STATE.currentFactionData || []).find(x => String(x.id) === String(u.id)); return String((d && d.role) || u.role || '').toUpperCase(); };
window.canBearEnhancement = u => { const r = unitRole(u); return /CHARACTER/.test(r) && !/EPIC/.test(r); };
window.enhUsed = () => (currentActiveRoster.units || []).filter(u => u.enh).map(u => u.enh);
window.rbSheet = function (title, bodyHtml) {   // small bottom-sheet style chooser
    let o = document.getElementById('rb-sheet'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'rb-sheet'; o.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,.8); z-index:100002; display:flex; align-items:flex-end; justify-content:center;';
    o.innerHTML = `<div style="background:#111a2c; border:1px solid rgba(255,255,255,.1); border-radius:18px 18px 0 0; width:100%; max-width:520px; max-height:80vh; overflow-y:auto; padding:18px 16px 28px;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;"><b style="font-size:1.05rem;">${title}</b><button onclick="document.getElementById('rb-sheet').remove()" style="background:none; border:1px solid rgba(255,255,255,.15); color:#fff; width:40px; height:40px; border-radius:10px; cursor:pointer;">✕</button></div>${bodyHtml}</div>`;
    o.addEventListener('click', e => { if (e.target === o) o.remove(); }); document.body.appendChild(o);
};
window.setEnhancement = function (index, detId, name, force) {
    const r = currentActiveRoster, u = r.units[index]; if (!u) return;
    const det = (STATE.currentFactionDetachments || []).find(d => d.id === detId), e = det && (det.enhancements || []).find(x => x.name === name); if (!e) return;
    const full = (det.d39 && (det.d39.enhancements || []).find(x => x.name === name)) || e;
    if (!force) {
        if (!canBearEnhancement(u)) {
            alert('Only non-Epic-Hero CHARACTER units can take an enhancement.');
            return;
        }
        if (window.RULES) {
            const check = RULES.canBear(u, full);
            if (!check.ok) {
                if (!confirm(`${check.why}\n\nAdd it anyway?`)) return;
            }
        }
    }
    if (u.enh) { alert(`${u.name} already has an enhancement. Remove it first.`); return; }
    const taken = enhUsed().filter(x => x.name === name).length;
    if (isUpgrade({ name })) { if (taken >= ENH_UPGRADE_COPIES) { alert(`You can take ${ENH_UPGRADE_COPIES} of the same upgrade at most.`); return; } }
    else if (taken) { alert('That enhancement is already taken.'); return; }
    if (enhUsed().length >= ENH_MAX) { alert(`An army can have at most ${ENH_MAX} enhancements.`); return; }
    u.enh = { detId, name, cost: enhCost(e), description: (e.description || full.description || '') };
    const el = document.getElementById('rb-sheet'); if (el) el.remove();
    saveRosters(); renderRosterBuilder(); if (window.toast) toast(`${name} added to ${u.name} · +${u.enh.cost} pts`);
};
window.removeEnhancement = function (index) {
    const u = currentActiveRoster.units[index]; if (!u || !u.enh) return;
    const n = u.enh.name; delete u.enh; saveRosters(); renderRosterBuilder(); if (window.toast) toast(`${n} removed`);
};
// pick the bearer for an enhancement (from the detachment list)
window.pickBearer = function (detId, name) {
    const r = currentActiveRoster, det = (STATE.currentFactionDetachments || []).find(d => d.id === detId), e = det && (det.enhancements || []).find(x => x.name === name); if (!e) return;
    const full = (det.d39 && (det.d39.enhancements || []).find(x => x.name === name)) || e;
    const list = window.RULES ? RULES.bearerRows(r, full) : r.units.map((u, i) => ({ u, i, res: { ok: canBearEnhancement(u) } })).filter(x => !x.u.enh);
    if (enhUsed().length >= ENH_MAX) { alert(`An army can have at most ${ENH_MAX} enhancements.`); return; }
    if (!list.length) { alert('Add a CHARACTER first (Epic Heroes cannot take enhancements), or free up one that already has an enhancement.'); return; }
    list.sort((x, y) => (y.res.ok ? 1 : 0) - (x.res.ok ? 1 : 0));
    rbSheet(`${name} · +${enhCost(e)} pts`, `<div style="color:#8c99b0; font-size:0.85rem; margin-bottom:10px;">Who carries it?</div>` + list.map(x => `<button onclick="${x.res.ok ? '' : `if(!confirm('${String(x.res.why).replace(/'/g, "\\'")}\\n\\nAdd it anyway?'))return;`}setEnhancement(${x.i}, '${detId}', '${name.replace(/'/g, "\\'")}', true)" style="width:100%; text-align:left; min-height:52px; margin-bottom:8px; padding:12px 14px; background:#151f35; color:#fff; border:1px solid ${x.res.ok ? 'rgba(255,255,255,.1)' : 'rgba(255,123,123,.35)'}; border-radius:12px; cursor:pointer; display:flex; justify-content:space-between; gap:10px; opacity:${x.res.ok ? 1 : 0.7};"><span><b>${x.u.name}</b>${x.res.ok ? '' : `<br><span style="font-size:0.72rem; color:#ff9b9b;">${x.res.why}</span>`}</span><span style="color:var(--accent);">${x.u.pts} pts</span></button>`).join(''));
};
// pick the enhancement for a given unit (from the unit card)
window.pickEnhancement = function (index) {
    const r = currentActiveRoster, u = r.units[index]; if (!u) return;
    const usedList = enhUsed(), dets = (STATE.currentFactionDetachments || []).filter(d => (r.detachments || []).includes(d.id));
    if (enhUsed().length >= ENH_MAX) { alert(`An army can have at most ${ENH_MAX} enhancements.`); return; }
    if (!dets.length) { alert('Pick a detachment first — enhancements come from your detachments.'); return; }
    if (window.DETINFO) dets.forEach(d => DETINFO.enrich(d));

    let html = '';
    dets.forEach(d => {
        const c = getFDColor(d.forceDisposition);
        const enhs = d.enhancements || [];
        const eligible = [];
        const ineligible = [];

        enhs.forEach(e => {
            const full = (d.d39 && (d.d39.enhancements || []).find(x => x.name === e.name)) || e;
            const desc = (e.description && !/coming soon/i.test(e.description)) ? e.description : (full.description || '');
            const cost = enhCost(e);
            const up = isUpgrade(e);
            const nTaken = usedList.filter(x => x.name === e.name).length;
            const isFull = up ? nTaken >= ENH_UPGRADE_COPIES : nTaken >= 1;
            const check = window.RULES ? RULES.canBear(u, full) : { ok: true };

            const item = { e, full, desc, cost, up, nTaken, isFull, check };
            if (check.ok && !isFull) {
                eligible.push(item);
            } else {
                ineligible.push(item);
            }
        });

        const renderCard = (item, allowAdd) => {
            const safeName = item.e.name.replace(/'/g, "\\'");
            return `<div style="background:#131c2e; border:1px solid ${allowAdd ? 'rgba(255,255,255,0.12)' : 'rgba(255,100,100,0.2)'}; border-left:4px solid ${allowAdd ? c : '#ff5e5e'}; border-radius:10px; padding:12px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px;">
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                            <strong style="color:#ffae42; font-size:0.95rem;">${item.e.name}</strong>
                            <span style="background:${c}; color:#fff; border-radius:6px; padding:2px 8px; font-size:0.75rem; font-weight:800;">+${item.cost} pts</span>
                            ${item.up ? `<span style="color:#9aa7b8; font-size:0.72rem;">up to ${ENH_UPGRADE_COPIES}×</span>` : ''}
                            ${item.isFull ? `<span style="color:#ff8a8a; font-size:0.72rem; font-weight:bold;">Already taken</span>` : ''}
                        </div>
                        ${item.desc ? `<div style="font-size:0.8rem; color:#b9c4d6; line-height:1.45; margin-top:6px;">${formatWahapediaText(item.desc)}</div>` : ''}
                        ${!item.check.ok ? `<div style="font-size:0.75rem; color:#ff9b9b; margin-top:6px; font-weight:600;"><i class="fa-solid fa-triangle-exclamation"></i> ${item.check.why}</div>` : ''}
                    </div>
                    ${allowAdd && !item.isFull ? `<button onclick="setEnhancement(${index}, '${d.id}', '${safeName}', true)" style="background:var(--accent, #ff7a3d); color:var(--accent-fg,#140a05); border:none; border-radius:8px; padding:0 18px; min-height:42px; font-weight:800; font-size:0.88rem; cursor:pointer; flex-shrink:0; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">Add</button>` : (!item.isFull ? `<button onclick="if(confirm('${String(item.check.why).replace(/'/g, "\\'")}\\n\\nAdd it anyway?')) setEnhancement(${index}, '${d.id}', '${safeName}', true)" style="background:transparent; border:1px solid rgba(255,255,255,0.2); color:#cfd8e3; border-radius:8px; padding:0 12px; min-height:38px; font-size:0.75rem; cursor:pointer; flex-shrink:0;">Add anyway</button>` : '')}
                </div>
            </div>`;
        };

        const eligibleHtml = eligible.length ? eligible.map(item => renderCard(item, true)).join('') : `<div style="color:#8c99b0; font-size:0.82rem; font-style:italic; padding:6px 0;">No eligible enhancements in this detachment for ${u.name}.</div>`;
        const ineligibleHtml = ineligible.length ? `<details class="dt-more" style="margin-top:10px; opacity:0.85;"><summary><span style="font-size:0.78rem; color:#8c99b0;"><i class="fa-solid fa-ban" style="color:#ff7b7b;"></i> Other enhancements (${ineligible.length})</span></summary><div class="dt-body" style="padding:10px 10px 4px;">${ineligible.map(item => renderCard(item, false)).join('')}</div></details>` : '';

        html += `<details class="dt-more" open style="margin-bottom:14px; border:1px solid ${c}; background:#0c1424;">
            <summary style="display:flex; justify-content:space-between; align-items:center;">
                <span>
                    <b style="color:#fff; font-size:0.95rem;">${d.name}</b>
                    ${d.forceDisposition ? ` <span style="font-size:0.7rem; color:${c}; border:1px solid ${c}55; border-radius:4px; padding:1px 6px; margin-left:6px;">${d.forceDisposition}</span>` : ''}
                    <span style="font-size:0.75rem; color:#8c99b0; margin-left:6px;">(${eligible.length} available)</span>
                </span>
            </summary>
            <div class="dt-body" style="padding:10px 12px 14px;">
                ${d.desc ? `<div style="font-size:0.8rem; color:#9aa7b8; margin-bottom:12px; line-height:1.45; background:#070d17; padding:8px 10px; border-radius:6px; border-left:3px solid ${c};">${formatWahapediaText(d.desc)}</div>` : ''}
                ${eligibleHtml}
                ${ineligibleHtml}
            </div>
        </details>`;
    });

    if (!html) { alert('No enhancements found in your selected detachments.'); return; }
    rbSheet(`Enhancement for ${u.name}`, html);
};

function renderRosterBuilder() {
    if (!currentActiveRoster) return;
    blRelinkDetachments(currentActiveRoster);
    
    let usedDp = 0;
    let maxDp = 2;
    if (currentActiveRoster.pointsLimit > 1000 && currentActiveRoster.pointsLimit <= 2000) maxDp = 3;
    else if (currentActiveRoster.pointsLimit > 2000) maxDp = 4;
    
    // Renderizar Detachments
    const detContainer = document.getElementById('roster-detachment-container');
    if (detContainer) {
        if (STATE.currentFactionDetachments && STATE.currentFactionDetachments.length > 0) {
            let dHtml = '';
            
            // Only show selected detachments
            const activeDets = currentActiveRoster.detachments || [];
            const selectedDets = STATE.currentFactionDetachments.filter(d => activeDets.includes(d.id));
            
            selectedDets.forEach(d => {
                if (window.DETINFO) DETINFO.enrich(d);
                let rulesHtml = '';
                let enhsHtml = '', enhsHead = '';
                
                const rules = extractProfiles(d);
                if(rules.length > 0) {
                    rulesHtml = '';
                    rules.forEach(r => {
                        if(r.characteristics) {
                            r.characteristics.forEach(c => {
                                rulesHtml += `<div style="margin-bottom:10px;"><strong style="color:var(--accent);">${c.name || r.name}:</strong> <span style="color:#ccc; font-size:0.8rem;">${formatWahapediaText(c.$text)}</span></div>`;
                            });
                        }
                    });
                }
                
                const enhs = extractEnhancements(d);
                if(enhs.length > 0) {
                    enhsHead = `ENHANCEMENTS <span class="det-n">${enhUsed().length}/${ENH_MAX} taken</span>`;
                    enhs.forEach(e => {
                        const cost = enhCost(e), up = isUpgrade(e), safeName = e.name.replace(/'/g, "\\'");
                        const holders = []; currentActiveRoster.units.forEach((u, ix) => { if (u.enh && u.enh.name === e.name) holders.push(ix); });
                        const isFull = enhUsed().length >= ENH_MAX || (up ? holders.length >= ENH_UPGRADE_COPIES : holders.length >= 1);
                        enhsHtml += `<div style="margin-bottom:10px; padding:10px 12px; background:rgba(0,0,0,.25); border:1px solid ${holders.length ? '#5be59a' : 'rgba(255,255,255,.08)'}; border-radius:10px;">
                            <div style="display:flex; align-items:flex-start; gap:10px;">
                                <div style="flex:1; min-width:0;">
                                    <div style="display:flex; align-items:baseline; gap:8px; flex-wrap:wrap;">
                                        <strong style="color:#ffae42; font-size:0.92rem;">${e.name}</strong>
                                        <span style="color:#fff; background:rgba(255,255,255,.12); border-radius:6px; padding:1px 7px; font-size:0.72rem; font-weight:700;">${cost} pts</span>
                                        ${up ? ` <span style="color:#9aa7b8; font-size:0.72rem;">up to ${ENH_UPGRADE_COPIES}× · ${holders.length}/${ENH_UPGRADE_COPIES}</span>` : ''}
                                    </div>
                                    ${e.description && !/coming soon/i.test(e.description) ? `<div style="color:#b9c4d6; font-size:0.8rem; margin:6px 0 8px; line-height:1.45;">${formatWahapediaText(e.description)}</div>` : ''}
                                </div>
                                ${isFull ? '' : `<button onclick="pickBearer('${d.id}', '${safeName}')" style="background:var(--accent); color:var(--accent-fg,#140a05); border:none; border-radius:8px; min-height:42px; padding:0 16px; font-weight:800; cursor:pointer; flex-shrink:0;">Add</button>`}
                            </div>
                            ${holders.map(ix => `<div style="display:flex; align-items:center; gap:8px; margin-top:8px; padding-top:8px; border-top:1px dashed rgba(255,255,255,.12); color:#5be59a; font-size:0.82rem;"><span style="flex:1; font-weight:600;"><i class="fa-solid fa-check"></i> on ${currentActiveRoster.units[ix].name}</span><button onclick="removeEnhancement(${ix})" style="background:#232d3b; color:#fff; border:1px solid rgba(255,255,255,.15); border-radius:8px; min-height:36px; padding:0 12px; cursor:pointer;">Remove</button></div>`).join('')}
                        </div>`;
                    });
                }
                
                // one collapsible card per detachment, with three collapsible sections: Rules · Enhancements · Stratagems
                const P = window.DETINFO ? DETINFO.parts(d) : { rules: '', ruleCount: 0, strats: '', stratCount: 0 };
                const L = (en, es) => (localStorage.getItem('gdm_lang') === 'es' ? es : en);
                const ruleBody = P.rules || rulesHtml || `<div style="color:#8c99b0; font-size:.82rem;">${L('Rule text for this detachment is not available yet — check the official app.', 'El texto de este destacamento aún no está disponible — consulta la app oficial.')}</div>`;
                const ruleN = P.ruleCount || (rulesHtml ? 1 : 0);
                const sections = detSec(d.id + ':r', `${L('RULES', 'REGLAS')} <span class="det-n">${ruleN || ''}</span>`, ruleBody)
                    + (enhsHtml ? detSec(d.id + ':e', enhsHead || L('ENHANCEMENTS', 'MEJORAS'), enhsHtml) : '')
                    + detSec(d.id + ':s', `${L('STRATAGEMS', 'ESTRATAGEMAS')} <span class="det-n">${P.stratCount || ''}</span>`, P.strats || `<div style="color:#8c99b0; font-size:.82rem;">${L('No stratagem text for this detachment yet.', 'Aún no hay texto de estratagemas para este destacamento.')}</div>`);

                let parsedDp = parseInt(d.dpCost) || 0;
                if(isNaN(parsedDp)) parsedDp = 0;
                usedDp += parsedDp;
                const fdc = getFDColor(d.forceDisposition);
                const cardKey = d.id + ':card', cardOpen = !(window.BL_DET_CLOSED && BL_DET_CLOSED.has(cardKey));

                dHtml += `
                    <details class="det-card" data-k="${cardKey}" style="--fd:${fdc}"${cardOpen ? ' open' : ''}>
                        <summary class="detachment-item selected" style="position:relative; padding:14px; background:${fdc}22; border:1px solid ${fdc}; border-left:5px solid ${fdc}; border-radius:10px;">
                            <div class="d-info" style="flex:1; min-width:0;">
                                <h4 style="margin:0 0 4px 0; color:#fff; font-size:1.05rem;">${d.name}</h4>
                                <div>${fdChips(d.forceDisposition)}</div>
                            </div>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span class="d-pts" style="background:${fdc}; color:#fff; font-weight:800; border-radius:8px; padding:4px 10px; font-size:0.85rem;">${parsedDp} DP</span>
                                <button onclick="event.preventDefault(); event.stopPropagation(); removeDetachmentFromRoster('${d.id}')" style="background:transparent; border:none; color:#ff7b7b; font-size:1.1rem; cursor:pointer; min-width:44px; min-height:44px;" title="Remove detachment" aria-label="Remove detachment"><i class="fa-solid fa-trash"></i></button>
                                <i class="fa-solid fa-chevron-down det-card-chev" aria-hidden="true"></i>
                            </div>
                        </summary>
                        <div class="det-card-body">${sections}</div>
                    </details>
                `;
            });
            
            // Add Detachment Button
            dHtml += `
                <button onclick="window.openDetachmentModal()" style="width:100%; padding:15px; background:transparent; border:2px dashed #2a3546; border-radius:8px; color:#fff; font-size:0.9rem; font-weight:bold; cursor:pointer; display:flex; justify-content:center; align-items:center; gap:10px; transition:all 0.2s;">
                    <i class="fa-solid fa-plus"></i> ADD DETACHMENT
                </button>
            `;
            
            detContainer.innerHTML = dHtml;
        } else {
            detContainer.innerHTML = '<div style="padding:15px; color:#888; text-align:center;">No specific detachments found</div>';
        }

        const dpEl = document.getElementById('roster-detachment-pts');
        if (dpEl) {
            dpEl.innerHTML = `${usedDp} / ${maxDp} DP`;
            dpEl.style.color = (usedDp > maxDp) ? '#ff5e5e' : '#6a7a8c';
        }
    }

    const fabBtn = document.getElementById('roster-fab-add');
    if (fabBtn) {
        fabBtn.style.background = 'var(--accent)';
        fabBtn.style.color = 'var(--accent-fg, #ffffff)';
    }

    let totalPts = 0, snapAdded = false;
    let html = '';
    
    if (currentActiveRoster.units.length === 0) {
        html = '<div style="text-align:center; padding:40px; color:#6a7a8c; border: 1px dashed #2a3546; border-radius: 8px;">No units added yet.</div>';
    } else {
        // points per unit from the Munitorum Field Manual: size option + price tier by number of copies
        let unitCounts = {};
        currentActiveRoster.units.forEach(u => {
            if (!u) return;
            unitCounts[u.name] = (unitCounts[u.name] || 0) + 1;
            u.computedPts = rosterUnitPts(u, unitCounts[u.name]);
            u.enhCost = u.enh ? (parseInt(u.enh.cost) || 0) : 0;
            u.wgCost = rosterWgCost(u);
            u.pts = (u.computedPts != null ? u.computedPts : (u.pts || 0)) + u.enhCost + u.wgCost;     // pts = unit price + enhancement
        });

        currentActiveRoster.units.forEach(u => { if (u && !u.uid && window.RULES) { RULES.uidOf(u); snapAdded = true; } });
        currentActiveRoster.units.forEach((unit, index) => {
            if (!unit) return;
            totalPts += (unit.pts || 0);
            
            let uidStr = String(unit.id || '');
            let fullUnit = (STATE.unitDict && uidStr) ? STATE.unitDict[uidStr.replace(/[^a-zA-Z0-9_-]/g, '')] : null;
            if (!currentActiveRoster.ds) currentActiveRoster.ds = {};
            let snap = currentActiveRoster.ds[unit.id];
            if ((!snap || snap.v !== 4) && fullUnit) { snap = currentActiveRoster.ds[unit.id] = rosterSnap(fullUnit); snapAdded = true; }   // older rosters get their datasheet saved the first time they are opened online
            let detailsHtml = snap ? rosterDetailsHtml(index, snap) : '';

                html += `
                <div class="roster-unit-card" style="background:#11161d; border-radius:8px; margin-bottom:10px; border:1px solid color-mix(in srgb, var(--accent, #3a4556) 35%, #1a222d); overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; cursor:pointer;" onclick="const d = document.getElementById('ru-details-${index}'); d.style.display = d.style.display === 'none' ? 'block' : 'none';">
                        <div style="flex:1;">
                            <h4 style="margin:0 0 5px 0; font-size:1rem; color:#fff; display:flex; align-items:center; gap:10px;">${unit.name} <i class="fa-solid fa-chevron-down" style="font-size:0.8rem; color:#6a7a8c;"></i></h4>
                            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;"><span style="font-size:0.9rem; color:var(--accent); font-weight:800;">${unit.pts} pts</span>${(() => { const inf = rosterUnitSizes(unit.name); if (!inf) return ''; if (inf.sizes.length < 2) return `<span style="font-size:0.75rem; color:#8c99b0;">${inf.sizes[0].comp}</span>`; return `<select onclick="event.stopPropagation()" onchange="setUnitSize(${index}, +this.value)" style="background:#0f1626; color:#fff; border:1px solid rgba(255,255,255,.15); border-radius:8px; padding:6px 8px; font-size:0.8rem; min-height:36px;">${inf.sizes.map((z, i) => `<option value="${i}" ${(unit.sizeIdx || 0) === i ? 'selected' : ''}>${z.comp}</option>`).join('')}</select>`; })()}</div>${wargearHtml(index, unit)}${unit.enh ? (() => {
                                let desc = unit.enh.description || '';
                                if (!desc) {
                                    const det = (STATE.currentFactionDetachments || []).find(d => (currentActiveRoster.detachments || []).includes(d.id));
                                    const enhObj = (det && (det.enhancements || []).find(x => x.name === unit.enh.name)) || (det && det.d39 && (det.d39.enhancements || []).find(x => x.name === unit.enh.name));
                                    desc = (enhObj && enhObj.description) || '';
                                }
                                return `<div onclick="event.stopPropagation()" style="margin-top:8px; background:rgba(255,174,66,.12); border:1px solid rgba(255,174,66,.45); border-radius:10px; padding:8px 10px; font-size:0.8rem;">
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span style="color:#ffae42; font-weight:700;">★ ${unit.enh.name}</span>
                                        <span style="color:#fff; font-weight:700;">+${unit.enh.cost} pts</span>
                                        <button onclick="removeEnhancement(${index})" aria-label="remove enhancement" style="margin-left:auto; background:none; border:none; color:#ff7b7b; cursor:pointer; min-width:32px; min-height:32px; font-size:0.9rem;">✕</button>
                                    </div>
                                    ${desc ? `<div style="color:#c7d3e3; font-size:0.75rem; line-height:1.4; margin-top:4px;">${formatWahapediaText(desc)}</div>` : ''}
                                </div>`;
                            })() : (canBearEnhancement(unit) ? `<button onclick="event.stopPropagation(); pickEnhancement(${index})" style="margin-top:8px; background:transparent; border:1px dashed rgba(255,255,255,.25); color:#cfd8e3; border-radius:10px; padding:0 12px; min-height:40px; font-size:0.8rem; cursor:pointer;">＋ Add enhancement</button>` : '')}
                        </div>
                        <button class="delete-btn" onclick="event.stopPropagation(); removeUnitAt(${index})" style="background:transparent; color:#ff5e5e; border:none; padding:10px; cursor:pointer;">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    ${window.RULES ? RULES.linkHtml(currentActiveRoster, index) : ''}
                    ${detailsHtml}
                </div>
            `;
        });
    }
    
    document.getElementById('roster-list-container').innerHTML = html;
    if (snapAdded) saveRosters();
    document.getElementById('rb-current-pts').textContent = totalPts;
    document.getElementById('rb-current-pts').style.color = totalPts > currentActiveRoster.pointsLimit ? '#ff7b7b' : 'var(--accent)';
}

window.removeUnit = (unitId) => {
    if(!currentActiveRoster) return;
    currentActiveRoster.units = currentActiveRoster.units.filter(u => u.id !== unitId);
    
    const rIndex = STATE.rosters.findIndex(r => r.id === currentActiveRoster.id);
    if(rIndex > -1) STATE.rosters[rIndex] = currentActiveRoster;
    
    saveRosters();
    renderRosterBuilder();
}





window.BL_OPEN_ROLES = window.BL_OPEN_ROLES || new Set();
// groups start collapsed; they stay as the user left them, and everything opens while a search term is typed
window.roleOpen = (key, searchId) => { const i = document.getElementById(searchId); return !!(i && i.value.trim()) || BL_OPEN_ROLES.has(key); };
window.toggleRole = (roleId) => {
    const el = document.getElementById('role-container-' + roleId), head = document.getElementById('role-head-' + roleId);
    if (!el) return;
    const open = el.style.display === 'none';
    el.style.display = open ? 'block' : 'none';
    if (head) head.classList.toggle('open', open);
    if (open) BL_OPEN_ROLES.add(roleId); else BL_OPEN_ROLES.delete(roleId);
};


window.renderDetachmentsList = function() {
    const container = document.getElementById('detachments-list-container');
    if(!container) return;
    const list = STATE.currentFactionDetachments || [];
    if(list.length === 0) { container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No detachments found</div>'; return; }
    container.innerHTML = list.map(det => `
        <div class="unit-card" onclick="selectDetachment('${det.id}')" id="det-card-${det.id}">
            <div class="unit-card-info"><h4>${det.name}</h4><p>${fdChips(det.forceDisposition)} ${parseInt(det.dpCost) || 0} DP</p></div>
        </div>`).join('');
};

window.toggleDetachmentSidebar = function() {
    const sidebar = document.getElementById('detachment-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        if(overlay) overlay.style.display = 'none';
    } else {
        sidebar.classList.add('open');
        if(overlay) overlay.style.display = 'block';
    }
};


window.openDetachmentModal = function() {
    const listContainer = document.getElementById('detachment-modal-list');
    let html = '';
    const maxDp = rosterMaxDp(currentActiveRoster ? currentActiveRoster.pointsLimit : 2000), usedDp = currentActiveRoster ? rosterUsedDp(currentActiveRoster) : 0, left = maxDp - usedDp;
    
    // Summary banner
    html += `<div style="color:#9aa7b8; font-size:0.85rem; margin-bottom:14px; background:#141b25; padding:12px 14px; border-radius:8px; border:1px solid #1a222d; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <span>Detachment points: <b style="color:#fff;">${usedDp} / ${maxDp}</b> used</span>
        <b style="color:${left > 0 ? '#5be59a' : '#ff7b7b'};">${left > 0 ? `${left} DP left` : 'Max DP reached (0 left)'}</b>
    </div>`;

    // Currently In Roster
    const activeIds = (currentActiveRoster && currentActiveRoster.detachments) || [];
    const addedDets = (STATE.currentFactionDetachments || []).filter(d => activeIds.includes(d.id));
    if (addedDets.length > 0) {
        html += `<div style="margin-bottom:16px;">
            <div style="font-size:0.75rem; color:#8c99b0; text-transform:uppercase; font-weight:700; letter-spacing:1px; margin-bottom:8px;">Currently In Roster (${addedDets.length})</div>
            ${addedDets.map(d => {
                const dp = parseInt(d.dpCost) || 0, fdc = getFDColor(d.forceDisposition);
                return `<div style="padding:10px 14px; background:${fdc}22; border:1px solid ${fdc}; border-left:5px solid ${fdc}; border-radius:8px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; gap:10px;">
                    <div style="flex:1; min-width:0;">
                        <b style="color:#fff; font-size:0.92rem;">${d.name}</b>
                        <div style="font-size:0.75rem; color:#9aa7b8; margin-top:2px;">${dp} DP · ${d.forceDisposition || ''}</div>
                    </div>
                    <button onclick="removeDetachmentFromRoster('${d.id}'); openDetachmentModal();" style="background:#232d3b; border:1px solid rgba(255,255,255,.15); color:#ff7b7b; border-radius:6px; padding:6px 12px; font-size:0.75rem; font-weight:700; cursor:pointer; display:flex; align-items:center; gap:5px;"><i class="fa-solid fa-trash"></i> Remove</button>
                </div>`;
            }).join('')}
        </div>`;
    }

    // Available Detachments
    const availableDets = (STATE.currentFactionDetachments || []).filter(d => !activeIds.includes(d.id));
    if (availableDets.length > 0) {
        html += `<div style="font-size:0.75rem; color:#8c99b0; text-transform:uppercase; font-weight:700; letter-spacing:1px; margin-bottom:8px;">Available Detachments (${availableDets.length})</div>`;
        availableDets.forEach(d => {
            const dp = parseInt(d.dpCost) || 0, fdc = getFDColor(d.forceDisposition), ok = dp <= left;
            html += `
                <div style="margin-bottom:10px;">
                <div style="padding:14px; background:${fdc}1f; border:1px solid ${fdc}; border-left:5px solid ${fdc}; border-radius:10px; margin-bottom:0; display:flex; justify-content:space-between; align-items:center; gap:10px; ${ok ? '' : 'opacity:0.45;'}">
                    <div class="d-info" style="flex:1; min-width:0;">
                        <h4 style="margin:0 0 2px 0; color:#fff; font-size:1rem;">${d.name}</h4>
                        <div>${fdChips(d.forceDisposition)}</div>
                        ${ok ? '' : `<div style="color:#ff7b7b; font-size:0.72rem; margin-top:6px;">Needs ${dp} DP — only ${left} left</div>`}
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="background:${fdc}; color:#fff; font-weight:800; font-size:0.85rem; border-radius:8px; padding:4px 10px;">${dp} DP</span>
                        <button ${ok ? '' : 'disabled'} onclick="selectDetachmentForRoster('${d.id}');" style="background:var(--accent); color:var(--accent-fg,#140a05); border:none; border-radius:8px; padding:10px 16px; min-height:44px; font-weight:800; cursor:${ok ? 'pointer' : 'not-allowed'};">Add</button>
                    </div>
                </div>
                ${window.DETINFO ? DETINFO.detailsHtml(d, { enhancements: true }) : ''}
                </div>
            `;
        });
    } else if (addedDets.length === 0) {
        html += '<div style="text-align:center; color:#888; padding:20px;">No detachments available</div>';
    }
    
    listContainer.innerHTML = html;
    
    document.getElementById('detachment-modal').style.display = 'flex';
};

window.selectDetachment = function(detId) {
    document.querySelectorAll('#detachments-list-container .unit-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById('det-card-' + detId); if (card) card.classList.add('active');
    window.closeAllSidebars();
    const det = (STATE.currentFactionDetachments || []).find(d => d.id === detId); if (!det) return;
    const main = document.getElementById('detachment-detail-container');
    const fdc = getFDColor(det.forceDisposition);
    const faction = (STATE.currentFactionMeta && STATE.currentFactionMeta.rules) || [];
    const armyRules = faction.length ? '<h3 class="ds-section-title" style="color:var(--accent); margin:18px 0 8px; font-size:0.95rem; text-transform:uppercase;">Army rules</h3>' + faction.map(r => `<details class="dt-more"><summary>${r.name}</summary><div class="dt-body">${window.DETINFO ? DETINFO.fmt(r.description) : r.description}</div></details>`).join('') : '';
    const selectBtn = (currentActiveRoster && isBuilderMode) ? `<button class="add-btn" onclick="selectDetachmentForRoster('${det.id}', '${det.name.replace(/'/g, "\\'")}')" style="margin-top:20px; width:100%; background:var(--accent); color:#000; border:none; padding:12px; min-height:44px; border-radius:6px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-check"></i> SELECT DETACHMENT</button>` : '';
    main.innerHTML = `<div style="animation: fadeIn 0.3s ease;">
        <h2 style="margin:0 0 6px; font-size:1.8rem; color:#fff;">${det.name}</h2>
        <div style="margin-bottom:14px;">${fdChips(det.forceDisposition)} <span style="color:${fdc}; font-weight:800;">${parseInt(det.dpCost) || 0} DP</span></div>
        ${window.DETINFO ? DETINFO.detailsHtml(det, { enhancements: true, open: true }) : ''}
        ${armyRules}${selectBtn}</div>`;
};

window.selectDetachmentForRoster = function(id, name) {
    if(!currentActiveRoster) return;
    if(!currentActiveRoster.detachments) currentActiveRoster.detachments = [];
    if(currentActiveRoster.detachments.includes(id)) { alert("This detachment is already added!"); return; }
    const d = (STATE.currentFactionDetachments || []).find(x => x.id === id), dp = d ? (parseInt(d.dpCost) || 0) : 0;
    const left = rosterMaxDp(currentActiveRoster.pointsLimit) - rosterUsedDp(currentActiveRoster);
    if (dp > left) { alert(`Not enough detachment points: ${d ? d.name : 'this detachment'} costs ${dp} DP and you have ${left} left.`); return; }
    currentActiveRoster.detachments.push(id);
    closeDetachmentModal();
    const rIndex = STATE.rosters.findIndex(r => r.id === currentActiveRoster.id);
    if(rIndex > -1) STATE.rosters[rIndex] = currentActiveRoster;
    saveRosters();
    renderRosterBuilder();
    if (window.toast) toast(`${d ? d.name : 'Detachment'} added (${dp} DP)`);
};


// ==========================================
// BATTLE TRACKER LOGIC
// ==========================================
let STATE_GAME = {
    roster: null,
    round: 1,
    cp: 0,
    vpPrimary: 0,
    vpSecondary: 0,
    painted: false,
    activeTactical: []
};



window.updateTrackerUI = function() {
    document.getElementById('tracker-round').textContent = "ROUND " + STATE_GAME.round;
    document.getElementById('tracker-cp').textContent = STATE_GAME.cp;
    document.getElementById('tracker-vp-primary').textContent = STATE_GAME.vpPrimary + " / 50";
    document.getElementById('tracker-vp-secondary').textContent = STATE_GAME.vpSecondary + " / 40";
    
    let total = STATE_GAME.vpPrimary + STATE_GAME.vpSecondary + (STATE_GAME.painted ? 10 : 0);
    document.getElementById('tracker-vp-total').textContent = total;
    
    const btn = document.getElementById('btn-painted');
    btn.textContent = STATE_GAME.painted ? "Yes" : "No";
    btn.style.background = STATE_GAME.painted ? "#00ffcc" : "#1a222d";
    btn.style.color = STATE_GAME.painted ? "#000" : "#fff";
    
    renderTacticalCards();
};





window.renderTacticalCards = function() {
    const container = document.getElementById('tracker-active-secondaries');
    container.innerHTML = STATE_GAME.activeTactical.map((m, i) => `
        <div style="background:#141b25; border:1px solid #1a222d; padding:15px; border-radius:6px; margin-bottom:10px;">
            <div style="color:#00ffcc; font-weight:bold; margin-bottom:5px;">${m.name}</div>
            <div style="font-size:0.85rem; color:#888; margin-bottom:15px;">${m.desc}</div>
            
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <button onclick="discardSecondary(${i})" style="padding:5px 10px; background:transparent; border:1px solid #ff4444; color:#ff4444; border-radius:4px; cursor:pointer;">Discard</button>
                <div style="display:flex; gap:5px; flex-wrap:wrap;">
                    <button onclick="scoreSecondary(${i}, 2)" style="padding:5px 10px; background:#1a222d; border:1px solid #2a3545; color:#fff; border-radius:4px; cursor:pointer;">+2 VP</button>
                    <button onclick="scoreSecondary(${i}, 4)" style="padding:5px 10px; background:#1a222d; border:1px solid #2a3545; color:#fff; border-radius:4px; cursor:pointer;">+4 VP</button>
                    <button onclick="scoreSecondary(${i}, 5)" style="padding:5px 10px; background:#1a222d; border:1px solid #2a3545; color:#fff; border-radius:4px; cursor:pointer;">+5 VP</button>
                </div>
            </div>
        </div>
    `).join('');
};

window.discardSecondary = function(idx) {
    STATE_GAME.activeTactical.splice(idx, 1);
    renderTacticalCards();
};

window.scoreSecondary = function(idx, pts) {
    STATE_GAME.vpSecondary += pts;
    if(STATE_GAME.vpSecondary > 40) STATE_GAME.vpSecondary = 40;
    STATE_GAME.activeTactical.splice(idx, 1);
    updateTrackerUI();
};



window.openRosterSidebar = function() {
    const sidebar = document.getElementById('roster-pool-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.add('open');
    if (overlay && window.innerWidth <= 899) overlay.style.display = 'block';
    const inp = document.getElementById('roster-search-input');
    if (inp) setTimeout(() => inp.focus(), 150);
};

window.closeAllSidebars = function() {
    const sidebar = document.getElementById('warmind-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
    }
    const detSidebar = document.getElementById('detachment-sidebar');
    if (detSidebar && detSidebar.classList.contains('open')) {
        detSidebar.classList.remove('open');
    }
    const rosterSidebar = document.getElementById('roster-pool-sidebar');
    if (rosterSidebar && rosterSidebar.classList.contains('open')) {
        rosterSidebar.classList.remove('open');
    }
    if (overlay) overlay.style.display = 'none';
};

// --- GDM 2026 GAME TRACKER LOGIC ---

var trackerState = window.trackerState = {   // the one live game-tracker state (replaced wholesale by startNewGame)
    step: 1,
    p1: { name: "PLAYER 1", faction: "", paint: false, detachments: [], dpSpent: 0, forceDisp: "", pri: 0, sec: 0, cp: 1 },
    p2: { name: "PLAYER 2", faction: "", paint: false, detachments: [], dpSpent: 0, forceDisp: "", pri: 0, sec: 0, cp: 1 },
    primaryMission: "",
    round: 1
};







// Also let's patch the onclick logic to use trackerState



window.renderGDMMissions = function() {
    if (!window.GDM_DATA) return;
    
    // RENDER PRIMARIES
    const pContainer = document.getElementById('primary-missions-container');
    if (pContainer && window.GDM_DATA.matrix) {
        let html = '';
        const allPrimaries = new Set();
        window.GDM_DATA.matrix.forEach(row => row.forEach(m => allPrimaries.add(m)));
        

        const types = (window.GDM_DATA.factions || []), primaryGroups = {}, colors = {};
        types.forEach((t, i) => { primaryGroups[t] = window.GDM_DATA.matrix[i] || []; colors[t] = BL_TYPE_PALETTE[i % BL_TYPE_PALETTE.length]; });
        const rgb = c => { const n = parseInt(c.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };
        Object.keys(primaryGroups).forEach((group, i) => {
            const c = colors[group], r = rgb(c);
            html += `
                <div class="mission-group" style="border:1px solid ${c}; border-radius:14px; overflow:hidden; background:rgba(${r},0.07);">
                    <div onclick="const b = this.nextElementSibling; b.style.display = b.style.display === 'none' ? 'flex' : 'none'; this.querySelector('i').style.transform = b.style.display === 'none' ? '' : 'rotate(180deg)';" style="background:${c}; color:#fff; padding:14px 16px; font-weight:700; font-size:1.05rem; cursor:pointer; display:flex; justify-content:space-between; align-items:center;">
                        <span>${group}</span>
                        <i class="fa-solid fa-chevron-down" style="transform:rotate(180deg); transition:transform .2s;"></i>
                    </div>
                    <div class="mission-row" style="display:flex; gap:10px; padding:14px; overflow-x:auto; scroll-snap-type:x proximity;">
            `;
            primaryGroups[group].forEach(m => {
                let formatted = m.toLowerCase().replace(/ /g, '-').replace(/'/g, '');
                let path = `assets/primary/${formatted}.png`;
                let backPath = `assets/primary/${formatted}-back.png`;
                html += `
                    <div onclick="MSHEET.open('primary', '${m.replace(/'/g, "\\'")}')" style="flex:1 0 150px; scroll-snap-align:start; min-height:84px; background:linear-gradient(160deg, rgba(${r},0.34), rgba(${r},0.12)); border:1px solid rgba(${r},0.7); border-radius:12px; padding:12px 10px; text-align:center; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <span style="color:#fff; font-size:0.9rem; font-weight:700; line-height:1.25;">${m}</span>
                    </div>
                `;
            });
            html += `</div></div>`;
        });

        pContainer.innerHTML = html;
    }
    
    // RENDER SECONDARIES
    const sContainer = document.getElementById('secondary-missions-container');
    if (sContainer && window.GDM_DATA.secondaryMissions) {
        let html = '';

        let secHtml = `
            <div style="margin-bottom:10px; border:1px solid #2a3546; border-radius:8px; overflow:hidden;">
                <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'grid' : 'none'" style="background:#2a3546; color:#fff; padding:15px; font-weight:bold; cursor:pointer; display:flex; justify-content:space-between;">
                    <span>Attacker Secondaries</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div style="display:none; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:10px; padding:15px; background:#0b0f16;">
        `;
        window.GDM_DATA.secondaryMissions.sort().forEach(m => {
            let formatted = m.toLowerCase().replace(/ /g, '-').replace(/'s/g, '-s');
            if (formatted === 'secure-no-mans-land') formatted = 'secure-no-man-s-land';
            let path = `assets/secondary/attacker/${formatted}.png`;
            let backPath = `assets/secondary/attacker/${formatted}-back.png`;
            secHtml += `
                <div onclick="MSHEET.open('secondary', '${m.replace(/'/g, "\\'")}', 'attacker')" style="background:#1a232f; border:1px solid #333; border-radius:6px; padding:10px; text-align:center; cursor:pointer; display:flex; flex-direction:column; justify-content:center; min-height:80px;">
                    <span style="color:#fff; font-size:0.8rem; font-weight:bold;">${m}</span>
                </div>
            `;
        });
        secHtml += `</div></div>`;
        
        secHtml += `
            <div style="margin-bottom:10px; border:1px solid #2a3546; border-radius:8px; overflow:hidden;">
                <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'grid' : 'none'" style="background:#2a3546; color:#fff; padding:15px; font-weight:bold; cursor:pointer; display:flex; justify-content:space-between;">
                    <span>Defender Secondaries</span>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div style="display:none; grid-template-columns:repeat(auto-fill, minmax(120px, 1fr)); gap:10px; padding:15px; background:#0b0f16;">
        `;
        window.GDM_DATA.secondaryMissions.sort().forEach(m => {
            let formatted = m.toLowerCase().replace(/ /g, '-').replace(/'s/g, '-s');
            if (formatted === 'secure-no-mans-land') formatted = 'secure-no-man-s-land';
            let path = `assets/secondary/defender/${formatted}.png`;
            let backPath = `assets/secondary/defender/${formatted}-back.png`;
            secHtml += `
                <div onclick="MSHEET.open('secondary', '${m.replace(/'/g, "\\'")}', 'defender')" style="background:#1a232f; border:1px solid #333; border-radius:6px; padding:10px; text-align:center; cursor:pointer; display:flex; flex-direction:column; justify-content:center; min-height:80px;">
                    <span style="color:#fff; font-size:0.8rem; font-weight:bold;">${m}</span>
                </div>
            `;
        });
        secHtml += `</div></div>`;
        html += secHtml;

        sContainer.innerHTML = html;
    }
    
    // RENDER RULES
    window.renderRulesList = function(searchTerm = '') {
        const rContainer = document.getElementById('rules-container');
        if (!rContainer || !window.GDM_DATA || !window.GDM_DATA.rules) return;
        
        let html = '';
        let categories = window.GDM_DATA.rules;
        let hasResults = false;
        
        const esOn = (() => { try { return localStorage.getItem('gdm_lang') === 'es' && window.RULES_ES; } catch (e) { return false; } })();
        const lbl = esOn ? 'reglas' : 'rules';
        categories.forEach((cat0, catIndex) => {
            if (!cat0 || !cat0.rules) return;
            const cat = esOn ? Object.assign({}, cat0, { title: window.RULES_ES.cats[cat0.id] || cat0.title, rules: cat0.rules.map(r => { const t = window.RULES_ES.rules[r.id]; return t ? Object.assign({}, r, { title: t.t, html: t.h }) : r; }) }) : cat0;
            let matchingRules = cat.rules;
            let catMatches = false;
            
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                catMatches = (cat.title && cat.title.toLowerCase().includes(lowerTerm)) || (cat.id && cat.id.toLowerCase().includes(lowerTerm));
                
                if (!catMatches) {
                    matchingRules = matchingRules.filter(r => 
                        (r.title && r.title.toLowerCase().includes(lowerTerm)) || 
                        (r.html && r.html.toLowerCase().includes(lowerTerm)) ||
                        (r.id && r.id.toLowerCase().includes(lowerTerm))
                    );
                }
            }
            
            if (matchingRules.length === 0 && !catMatches) return;
            hasResults = true;
            const isExpanded = searchTerm ? 'block' : 'none';
            
            html += `
                <div style="background:#0b0f16; border:1px solid #1a222d; border-radius:8px; overflow:hidden;">
                    <button onclick="const p = document.getElementById('cat-panel-${catIndex}'); p.style.display = p.style.display === 'none' ? 'block' : 'none';" style="width:100%; display:flex; align-items:center; gap:15px; padding:15px; background:#121822; border:none; cursor:pointer; color:#fff; text-align:left;">
                        <span style="color:var(--accent); font-family:monospace; font-weight:bold; font-size:1.1rem;">${cat.id || ''}</span>
                        <span style="flex:1; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${cat.title || 'General'}</span>
                        <span style="color:#888; font-size:0.8rem;">${matchingRules.length} ${lbl}</span>
                    </button>
                    <div id="cat-panel-${catIndex}" style="display:${isExpanded}; border-top:1px solid #1a222d; padding:15px;">
            `;
            
            matchingRules.forEach(r => {
                html += `
                    <div style="margin-bottom:25px; border-bottom:1px dashed #1a222d; padding-bottom:15px;">
                        <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                            <span style="color:var(--accent); font-family:monospace; font-size:0.9rem; font-weight:bold;">${r.id || ''}</span>
                            <h3 style="color:#fff; margin:0; font-size:1rem; text-transform:uppercase; letter-spacing:1px;">${r.title || ''}</h3>
                        </div>
                        <div class="rule-content" style="color:#aaa; font-size:0.9rem; line-height:1.6;">
                            ${r.html || ''}
                        </div>
                    </div>
                `;
            });
            html += `</div></div>`;
        });
        
        if (!hasResults) {
            rContainer.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">' + (esOn ? 'No se encontraron reglas.' : 'No rules found.') + '</div>';
            return;
        }
        rContainer.innerHTML = html;
    };
    
    renderRulesList();
    
    const searchInput = document.getElementById('rules-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderRulesList(e.target.value);
        });
    }
};

// Hook into app init
const originalInit = window.onload;
window.onload = function() {
    if (originalInit) originalInit();
    renderGDMMissions();
};

// PDF EXPORT
window.exportToPDF = function() {
    // Expand all unit detail panels in the roster
    const panels = document.querySelectorAll('#roster-list-container .unit-details-panel');
    const chevrons = document.querySelectorAll('#roster-list-container i.fa-chevron-down');
    
    // Save state
    const originalStates = [];
    panels.forEach((p, i) => {
        originalStates.push(p.style.display);
        p.style.display = 'block';
    });
    
    // Trigger browser print
    window.print();
    
    // Restore state
    panels.forEach((p, i) => {
        p.style.display = originalStates[i];
    });
};





// ROSTER POOL LOGIC
window.handleRosterSearch = function(term) {
    if (!STATE.currentFactionData) return;
    try {
        const rawTerm = term.toLowerCase().trim();
        const filtered = STATE.currentFactionData.filter(unit => {
            if (!rawTerm) return true;
            // Save unit as text and search for wording
            const unitText = JSON.stringify(unit).toLowerCase();
            return unitText.includes(rawTerm);
        });
        renderRosterPool(filtered);
    } catch(err) {
        console.error('Roster search error', err);
    }
};

window.renderRosterPool = function(units) {
    const container = document.getElementById('roster-pool-container');
    if(!container) return;
    
    if(units.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:#888; padding:20px;">No units found</div>';
        return;
    }
    
    const grouped = units.reduce((acc, unit) => {
        const role = unit.isAllied ? 'ALLIED UNITS' : (unit.role || 'Datasheet').toUpperCase();
        if (!acc[role]) acc[role] = [];
        acc[role].push(unit);
        return acc;
    }, {});

    const orderPriority = { 'EPIC HERO': 1, 'CHARACTER': 2, 'BATTLELINE': 3, 'ALLIED UNITS': 98 };
    const sortedRoles = Object.keys(grouped).sort((a, b) => {
        const priorityA = orderPriority[a] || 99;
        const priorityB = orderPriority[b] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return a.localeCompare(b);
    });

    let html = '';
    sortedRoles.forEach(role => {
        const roleUnits = grouped[role].slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base', numeric: true }));
        const safeRole = role.replace(/[^a-zA-Z]/g,'') + '_roster';
        const open = roleOpen(safeRole, 'roster-search-input');
        html += `
            <div class="role-head${open ? ' open' : ''}" id="role-head-${safeRole}" onclick="toggleRole('${safeRole}')">
                <span>${role} <b>${roleUnits.length}</b></span>
                <i id="role-arrow-${safeRole}" class="fa-solid fa-chevron-down"></i>
            </div>
            <div id="role-container-${safeRole}" style="display:${open ? 'block' : 'none'};">
        `;
        
        roleUnits.forEach(unit => {
            let safeId = unit.id.replace(/[^a-zA-Z0-9_-]/g, '');
            if(!STATE.unitDict) STATE.unitDict = {};
            STATE.unitDict[safeId] = unit;
            
            html += `
                <div class="unit-card" style="border:1px solid color-mix(in srgb, var(--accent, #3a4556) 35%, #1a222d); background:#121822; padding:10px; border-radius:6px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <h4 style="margin:0; font-size:0.9rem; color:#fff;">${unit.name}</h4>
                        <p style="margin:0; font-size:0.7rem; color:#888;">${role}</p>
                    </div>
                    <div style="text-align:right; display:flex; align-items:center; gap:10px;">
                        <div style="color:var(--accent); font-weight:bold; font-size:0.9rem;">${unit.points} pts</div>
                        <button onclick="addUnitToActiveRoster('${safeId}')" style="background:var(--accent); border:none; border-radius:4px; width:28px; height:28px; display:flex; justify-content:center; align-items:center; color:#fff; cursor:pointer; box-shadow:none; background-image:none;"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });
    
    container.innerHTML = html;
};

// what to ask when adding a unit: its size options (with points for the next copy) and who it can be joined with
window.addUnitChoices = function (unit) {
    const r = currentActiveRoster, inf = rosterUnitSizes(unit.name), copyNo = r.units.filter(u => u.name === unit.name).length + 1;
    const sizes = inf ? inf.sizes.map((z, i) => ({ i, comp: z.comp, pts: rosterUnitPts({ name: unit.name, sizeIdx: i, pts: unit.points }, copyNo) })) : [];
    let leaders = [], bodies = [];
    const d = window.RULES && RULES.dsOf({ id: unit.id, name: unit.name });
    if (d) { if ((d.leads || []).length) bodies = RULES.freeBodiesFor(r, d, -1); else leaders = RULES.freeLeadersFor(r, d, -1); }
    return { sizes, leaders, bodies };
};
window.openAddUnitSheet = function (safeId) {
    const unit = STATE.unitDict[safeId], r = currentActiveRoster; if (!unit || !r) return;
    const c = addUnitChoices(unit), esc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const L = (en, es) => (localStorage.getItem('gdm_lang') === 'es' ? es : en);
    const st = { size: 0, link: '' };
    let o = document.getElementById('add-unit-sheet'); if (o) o.remove();
    o = document.createElement('div'); o.id = 'add-unit-sheet';
    o.style.cssText = 'position:fixed; inset:0; z-index:100002; background:rgba(0,0,0,.72); display:flex; align-items:flex-end; justify-content:center;';
    const chip = (grp, val, label, sub) => `<button type="button" data-g="${grp}" data-v="${esc(val)}" style="min-height:52px; padding:8px 14px; border-radius:12px; border:1px solid #3a4556; background:#141b25; color:#fff; font-weight:700; font-size:.92rem; cursor:pointer; text-align:left; display:flex; flex-direction:column; justify-content:center; gap:2px;">${esc(label)}${sub ? `<span style="color:#9aa7b8; font-weight:600; font-size:.78rem;">${esc(sub)}</span>` : ''}</button>`;
    const head = t => `<div style="color:#8c99b0; font-size:.74rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; margin:14px 0 8px;">${t}</div>`;
    const linkRows = c.leaders.length ? head(L('Led by', 'Liderada por')) + `<div style="display:flex; flex-wrap:wrap; gap:8px;">${chip('link', '', L('No leader', 'Sin líder'))}${c.leaders.map(x => chip('link', RULES.uidOf(x.x), RULES.unitLabel(r, x.ix))).join('')}</div>`
        : c.bodies.length ? head(L('Attach to', 'Unir a')) + `<div style="display:flex; flex-wrap:wrap; gap:8px;">${chip('link', '', L('Not attached', 'Sin unir'))}${c.bodies.map(x => chip('link', RULES.uidOf(x.x), RULES.unitLabel(r, x.ix))).join('')}</div>` : '';
    o.innerHTML = `<div role="dialog" aria-label="${esc(L('Add unit', 'Añadir unidad'))}" style="background:#1a222d; border:1px solid #2a3546; border-bottom:none; border-radius:18px 18px 0 0; width:100%; max-width:560px; max-height:88vh; overflow-y:auto; padding:18px 16px max(16px, env(safe-area-inset-bottom)); color:#fff;">
        <div style="display:flex; align-items:center; gap:10px;"><div style="flex:1; min-width:0;"><div style="color:#8c99b0; font-size:.74rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase;">${L('Add unit', 'Añadir unidad')}</div><div style="font-size:1.15rem; font-weight:800;">${esc(unit.name)}</div></div>
        <button type="button" id="aus-x" aria-label="close" style="min-width:44px; min-height:44px; background:transparent; border:1px solid #3a4556; border-radius:10px; color:#fff; cursor:pointer;">✕</button></div>
        ${c.sizes.length > 1 ? head(L('Unit size', 'Tamaño de la unidad')) + `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:8px;">${c.sizes.map(z => chip('size', z.i, z.comp, z.pts + ' pts')).join('')}</div>` : ''}
        ${linkRows}
        <button type="button" id="aus-add" style="width:100%; margin-top:18px; min-height:54px; border:none; border-radius:12px; background:var(--accent); color:var(--accent-fg, #140a05); font-weight:800; font-size:1.05rem; cursor:pointer;"></button></div>`;
    document.body.appendChild(o);
    const paint = () => {
        o.querySelectorAll('[data-g]').forEach(b => { const on = String(st[b.dataset.g === 'size' ? 'size' : 'link']) === b.dataset.v; b.style.borderColor = on ? 'var(--accent)' : '#3a4556'; b.style.background = on ? 'color-mix(in srgb, var(--accent) 18%, #141b25)' : '#141b25'; b.setAttribute('aria-pressed', on); });
        const z = c.sizes[st.size]; document.getElementById('aus-add').textContent = L('Add', 'Añadir') + (z ? ` · ${z.comp} · ${z.pts} pts` : ` · ${unit.points} pts`);
    };
    o.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { if (b.dataset.g === 'size') st.size = +b.dataset.v; else st.link = b.dataset.v; paint(); });
    const close = () => o.remove();
    o.onclick = e => { if (e.target === o) close(); };
    document.getElementById('aus-x').onclick = close;
    document.getElementById('aus-add').onclick = () => { close(); addUnitToActiveRoster(safeId, { size: st.size, link: st.link }); };
    paint();
};

window.addUnitToActiveRoster = function(safeId, opts) {
    if(!currentActiveRoster) return;
    const unit = STATE.unitDict[safeId];
    if(!unit) return;
    
    // Check Limits
    let count = 0;
    currentActiveRoster.units.forEach(u => {
        if(u.name === unit.name) count++;
    });
    
    const role = (unit.role || '').toUpperCase();
    const isEpicHero = role === 'EPIC HERO';
    const isBattleline = role === 'BATTLELINE';
    const isDedicatedTransport = role === 'DEDICATED TRANSPORT';
    
    if (isEpicHero && count >= 1) {
        alert('You can only include 1 of each Epic Hero.');
        return;
    }
    if ((isBattleline || isDedicatedTransport) && count >= 6) {
        alert('You can only include up to 6 of each Battleline or Dedicated Transport unit.');
        return;
    }
    if (!isEpicHero && !isBattleline && !isDedicatedTransport && count >= 3) {
        alert('You can only include up to 3 of this datasheet.');
        return;
    }
    // more than one size, or a leader to pair with: ask first (one tap still adds a unit with nothing to choose)
    if (!opts) { const c = addUnitChoices(unit); if (c.sizes.length > 1 || c.leaders.length || c.bodies.length) return openAddUnitSheet(safeId); }
    opts = opts || {};

    const added = {
        id: unit.id,
        name: unit.name,
        pts: unit.points,
        sizeIdx: opts.size || 0,
        role: unit.role,
        w: 0,
        expanded: false
    };
    currentActiveRoster.units.push(added);
    if (opts.link && window.RULES) {        // join it with the leader / unit chosen in the sheet
        const other = currentActiveRoster.units.find(u => u.uid === opts.link);
        if (other) { if (added.id && RULES.dsOf(added) && (RULES.dsOf(added).leads || []).length) added.att = opts.link; else other.att = RULES.uidOf(added); }
    }
    if (!currentActiveRoster.ds) currentActiveRoster.ds = {};
    try { currentActiveRoster.ds[unit.id] = rosterSnap(unit); } catch (e) {}
    
    saveRosters();
    renderRosterBuilder();
    if (window.toast) { const u = currentActiveRoster.units[currentActiveRoster.units.length - 1]; toast(`${unit.name} added · ${u.computedPts != null ? u.computedPts : unit.points} pts`); }
};

window.removeDetachmentFromRoster = function(id) {
    if(!currentActiveRoster || !currentActiveRoster.detachments) return;
    currentActiveRoster.detachments = currentActiveRoster.detachments.filter(d => d !== id);
    (currentActiveRoster.units || []).forEach(u => { if (u.enh && u.enh.detId === id) delete u.enh; });   // its enhancements go with it
    saveRosters();
    renderRosterBuilder();
};
window.closeDetachmentModal = function() {
    const modal = document.getElementById('detachment-modal');
    if(modal) modal.style.display = 'none';
};





window.togglePaintScore = function(pNum) {
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    p.paint = !p.paint;
    document.getElementById(`ts-p${pNum}-br-btn`).style.opacity = p.paint ? "1" : "0.5";
    document.getElementById(`p${pNum}-paint-cb`).checked = p.paint;
    updateGDMScore(pNum);
};

// FACTION MODAL
window.openFactionModal = function(pNum) {
    window.currentFactionSelectPlayer = pNum;
    document.getElementById('modal-faction-pname').innerText = `PLAYER ${pNum}`;
    document.getElementById('modal-faction').style.display = 'flex';
    renderFactionList("");
};

window.filterFactions = function() {
    renderFactionList(document.getElementById('faction-search-input').value);
};

window.renderFactionList = function(q) {
    q = q.toLowerCase();
    let factions = Object.keys(window.MFM_DATA || {}).sort();
    let html = `
        <div style="padding:15px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="selectFaction('NONE')">
            <span style="color:#fff; font-size:1.1rem; font-weight:bold;">NO FACTION</span>
        </div>
    `;
    for(let f of factions) {
        if(f.toLowerCase().includes(q)) {
            html += `
                <div style="padding:15px; border-bottom:1px solid #333; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="selectFaction('${f}')">
                    <span style="color:#fff; font-size:1.1rem; font-weight:bold;">${f}</span>
                </div>
            `;
        }
    }
    document.getElementById('modal-faction-list').innerHTML = html;
};

window.selectFaction = function(fac) {
    let pNum = window.currentFactionSelectPlayer;
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    p.faction = fac === 'NONE' ? "" : fac;
    p.detachments = []; // reset detachments
    p.dpSpent = 0;
    const btn = document.getElementById(`ts-p${pNum}-faction-btn`);
    if (btn) btn.innerHTML = p.faction ? p.faction : "Faction (optional) <i class='fa-solid fa-chevron-down' style='float:right;'></i>";
    document.getElementById('modal-faction').style.display = 'none';
    if (typeof window.updateActiveGameUI === 'function') {
        window.updateActiveGameUI();
    }
};

// DETACHMENT MODAL

// mission types (GDM_DATA.factions) in upper case, and one colour each
window.BL_MISSION_TYPES = () => (((window.GDM_DATA || {}).factions) || []).map(t => String(t).toUpperCase());
window.BL_TYPE_PALETTE = ['#33704b', '#943030', '#2052a3', '#298585', '#a6843c', '#6b4fa3', '#7a5c2e'];
window.getFDColor = function(fdStr) {
    if (!fdStr) return '#3a4556';
    const i = BL_MISSION_TYPES().findIndex(t => String(fdStr).toUpperCase().includes(t));
    return i < 0 ? '#3a4556' : BL_TYPE_PALETTE[i % BL_TYPE_PALETTE.length];
};

window.renderDetachmentStep = function() {
    document.getElementById('ts-p1-det-fac').innerText = trackerState.p1.faction || "NONE";
    let n1 = document.getElementById('ts-p1-det-name'); if(n1) n1.innerText = (trackerState.p1.name || "PLAYER 1").toUpperCase();
    document.getElementById('ts-p2-det-fac').innerText = trackerState.p2.faction || "NONE";
    let n2 = document.getElementById('ts-p2-det-name'); if(n2) n2.innerText = (trackerState.p2.name || "PLAYER 2").toUpperCase();
    renderSelectedDetachments(1);
    renderSelectedDetachments(2);
};

window.renderSelectedDetachments = function(pNum) {
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    let html = "";
    for(let d of p.detachments) {
        let fdColor = window.getFDColor(d.forceDisposition);
        html += `
            <div style="background:${fdColor}33; border-radius:8px; padding:15px; border:1px solid ${fdColor};">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${d.name}</div>
                    <div style="background:${fdColor}; color:#fff; font-weight:bold; padding:2px 8px; border-radius:4px; font-size:0.8rem; border:1px solid rgba(255,255,255,0.2);">${d.dp} DP</div>
                </div>
                <div style="color:${fdColor}; font-size:0.8rem; text-transform:uppercase; font-weight:bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${d.forceDisposition || "No force disposition"}</div>
                ${window.DETINFO ? '<div onclick="event.stopPropagation()" style="margin-top:8px;">' + DETINFO.detailsHtml(DETINFO.enrich(d), { enhancements: true }) + '</div>' : ''}
            </div>
        `;
    }
    document.getElementById(`ts-p${pNum}-selected-det`).innerHTML = html;
    document.getElementById(`ts-p${pNum}-dp`).innerText = p.dpSpent;
};

window.openTrackerDetachmentModal = function(pNum) {
    window.currentDetPlayer = pNum;
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    document.getElementById('modal-det-pname').innerText = `PLAYER ${pNum}`;
    document.getElementById('modal-det-dp').innerText = p.dpSpent;
    document.getElementById('modal-detachment').style.display = 'flex';
    renderDetachmentModalList();
};

window.renderDetachmentModalList = function() {
    let pNum = window.currentDetPlayer;
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    
    if(!p.faction || !window.MFM_DATA[p.faction]) {
        document.getElementById('modal-det-list').innerHTML = "<div style='color:#888; padding:20px; text-align:center;'>Please select a valid faction in Step 1.</div>";
        return;
    }
    
    let dets = window.MFM_DATA[p.faction];
    let html = "";
    for(let d of dets) {
        let isSelected = p.detachments.some(x => x.name === d.name);
        let canAfford = p.dpSpent + d.dp <= 3 || isSelected;
        let fdColor = window.getFDColor(d.forceDisposition);
        let color = fdColor;
        let bg = isSelected ? fdColor + '44' : fdColor + '15';
        html += `
            <div style="border:1px solid ${color}; border-radius:8px; padding:15px; background:${bg}; cursor:${canAfford ? 'pointer' : 'not-allowed'}; opacity:${canAfford ? '1' : '0.4'}; transition:all 0.2s;" onclick="${canAfford ? `toggleDetachment('${d.name}')` : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
                    <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${d.name}</div>
                    <div style="background:${isSelected ? fdColor : fdColor + '88'}; color:#fff; font-weight:bold; padding:2px 8px; border-radius:4px; font-size:0.8rem; border:1px solid rgba(255,255,255,0.2);">${d.dp} DP</div>
                </div>
                <div style="color:${color}; font-size:0.8rem; text-transform:uppercase; font-weight:bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${d.forceDisposition || "No force disposition"}</div>
                ${window.DETINFO ? '<div onclick="event.stopPropagation()" style="margin-top:8px;">' + DETINFO.detailsHtml(DETINFO.enrich(d), { enhancements: true }) + '</div>' : ''}
            </div>
        `;
    }
    document.getElementById('modal-det-list').innerHTML = html;
};

window.toggleDetachment = function(dname) {
    let pNum = window.currentDetPlayer;
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    let dets = window.MFM_DATA[p.faction];
    let d = dets.find(x => x.name === dname);
    
    let idx = p.detachments.findIndex(x => x.name === dname);
    if(idx > -1) {
        p.detachments.splice(idx, 1);
        p.dpSpent -= d.dp;
    } else {
        if(p.dpSpent + d.dp <= 3) {
            p.detachments.push(d);
            p.dpSpent += d.dp;
        }
    }
    document.getElementById('modal-det-dp').innerText = p.dpSpent;
    renderDetachmentModalList();
};

window.renderDetachmentsUI = function() {
    renderSelectedDetachments(1);
    renderSelectedDetachments(2);
};

// FORCE DISPOSITION
window.renderForceDispositionStep = function() {
    const fds = BL_MISSION_TYPES();
    for(let pNum = 1; pNum <= 2; pNum++) {
        let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
        let unlocked = [];
        for(let d of p.detachments) {
            if(d.forceDisposition) {
                let parts = d.forceDisposition.split(',').map(x => x.trim().toUpperCase());
                unlocked.push(...parts);
            }
        }
        
        let html = "";
        for(let fd of fds) {
            let isUnlocked = unlocked.includes(fd);
            let isSelected = p.forceDisp === fd;
            let fdColor = window.getFDColor(fd);
            let color = isUnlocked ? fdColor : '#3a4556';
            let bg = isSelected ? fdColor + '44' : (isUnlocked ? fdColor + '15' : '#161d27');
            
            let badge = "";
            if(isUnlocked) {
                badge = `<div style="background:${fdColor}88; color:#fff; font-size:0.6rem; padding:4px 8px; border-radius:4px; font-weight:bold; border:1px solid rgba(255,255,255,0.2);">UNLOCKED</div>`;
            }
            
            html += `
                <button onclick="selectFD(${pNum}, '${fd}')" ${!isUnlocked ? 'disabled' : ''} style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:20px; background:${bg}; border:1px solid ${color}; border-radius:8px; cursor:${isUnlocked ? 'pointer' : 'not-allowed'}; opacity:${isUnlocked ? '1' : '0.4'}; transition:all 0.2s;">
                    <div style="display:flex; align-items:center; gap:15px;">
                        <i class="fa-solid fa-${['chess-rook','skull','bomb','eye','bolt','flag'][Math.max(0, fds.indexOf(fd)) % 6]}" style="color:${color}; font-size:1.5rem;"></i>
                        <span style="color:#fff; font-weight:bold; font-size:1.2rem; text-transform:uppercase; text-shadow:0 1px 2px rgba(0,0,0,0.8);">${fd}</span>
                    </div>
                    ${badge}
                </button>
            `;
        }
        document.getElementById(`ts-p${pNum}-fd`).innerHTML = html;
        let nEl = document.getElementById(`ts-p${pNum}-fd-name`);
        if(nEl) nEl.innerText = (p.name || `PLAYER ${pNum}`).toUpperCase();
    }
};


window.updateDeploymentPreview = function() {
    let dep = document.getElementById('ts-deployment-sel').value;
    document.getElementById('ts-deployment-preview').src = `assets/deployment/${dep}.svg`;
};

window.startNewGame = function() {
    try {
        let activeId = localStorage.getItem('gdm_current_game');
        if (activeId) {
            let cur = JSON.parse(localStorage.getItem('gdm_games') || '{}');
            if (cur[activeId] && (!cur[activeId].state || cur[activeId].state.step < 8)) {
                delete cur[activeId];
                localStorage.setItem('gdm_games', JSON.stringify(cur));
            }
        }
        localStorage.removeItem('gdm_current_game');
    } catch(e) {}
    
    let p1name = "PLAYER 1";
    if (window.LEAGUE_CORE && typeof window.LEAGUE_CORE.user === 'function') {
        const u = window.LEAGUE_CORE.user();
        if (u && u.user_metadata && u.user_metadata.display_name) {
            p1name = u.user_metadata.display_name;
        }
    }
    window.trackerState = trackerState = {
        p1: { name: p1name, faction: "", paint: false, detachments: [], dpSpent: 0, forceDisp: "", pri: 0, sec: 0, cp: 1 },
        p2: { name: "PLAYER 2", faction: "", paint: false, detachments: [], dpSpent: 0, forceDisp: "", pri: 0, sec: 0, cp: 1 },
        primaryMission: "",
        round: 1,
        step: 1
    };
    document.getElementById('ts-history').style.display = 'none';
    
    const p1input = document.getElementById('ts-p1-name');
    if (p1input) p1input.value = p1name;
    const p2input = document.getElementById('ts-p2-name');
    if (p2input) p2input.value = "PLAYER 2";
    
    const f1Btn = document.getElementById('ts-p1-faction-btn');
    if (f1Btn) f1Btn.innerHTML = `Faction (optional) <i class="fa-solid fa-chevron-down" style="float:right;"></i>`;
    const f2Btn = document.getElementById('ts-p2-faction-btn');
    if (f2Btn) f2Btn.innerHTML = `Faction (optional) <i class="fa-solid fa-chevron-down" style="float:right;"></i>`;

    const br1 = document.getElementById('ts-p1-br-btn');
    if (br1) { br1.style.opacity = '0.5'; br1.style.border = 'none'; br1.innerHTML = 'BATTLE READY +10 VP'; }
    const br2 = document.getElementById('ts-p2-br-btn');
    if (br2) { br2.style.opacity = '0.5'; br2.style.border = 'none'; br2.innerHTML = 'BATTLE READY +10 VP'; }

    if (typeof renderForceDispositionStep === 'function') renderForceDispositionStep();
    if (typeof renderStepSelections === 'function') renderStepSelections();

    navTracker(0); // Renders step 1
    document.getElementById('ts-nav').style.display = 'flex';
};

window.saveMatchToHistory = function() {
    let history = JSON.parse(localStorage.getItem('gdm_history') || '[]');
    let match = {
        date: new Date().toLocaleDateString(),
        p1: trackerState.p1.name,
        p1score: trackerState.p1.pri + trackerState.p1.sec + (trackerState.p1.paint ? 10 : 0),
        p2: trackerState.p2.name,
        p2score: trackerState.p2.pri + trackerState.p2.sec + (trackerState.p2.paint ? 10 : 0),
        mission: trackerState.primaryMissionP1 + " / " + trackerState.primaryMissionP2
    };
    history.unshift(match);
    localStorage.setItem('gdm_history', JSON.stringify(history));
    
    // Switch to history view
    document.getElementById('ts-7').style.display = 'none';
    document.getElementById('ts-history').style.display = 'block';
    
    let html = "";
    for(let m of history) {
        let winner = m.p1score > m.p2score ? m.p1 : (m.p2score > m.p1score ? m.p2 : "DRAW");
        html += `
            <div style="background:#161d27; border:1px solid #2a3546; border-radius:8px; padding:15px; margin-bottom:10px;">
                <div style="color:#888; font-size:0.8rem; margin-bottom:10px;">${m.date} - ${m.mission}</div>
                <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:1.2rem;">
                    <span style="color:${winner===m.p1?'var(--accent)':'#fff' }">${m.p1}: ${m.p1score}</span>
                    <span style="color:#888;">VS</span>
                    <span style="color:${winner===m.p2?'var(--accent)':'#fff' }">${m.p2}: ${m.p2score}</span>
                </div>
            </div>
        `;
    }
    document.getElementById('history-list').innerHTML = html;
};

// Modal overrides from earlier




window.updateGDMScore = function(pNum) {
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    let total = (p.pri || 0) + (p.sec || 0) + (p.paint ? 10 : 0);
    
    let elTotal = document.getElementById(`ag-p${pNum}-total`);
    if(elTotal) elTotal.innerText = total;
    
    let elPriTxt = document.getElementById(`ag-p${pNum}-pri-txt`);
    if(elPriTxt) elPriTxt.innerText = `${p.pri || 0}/45`;
    
    let elSecTxt = document.getElementById(`ag-p${pNum}-sec-txt`);
    if(elSecTxt) elSecTxt.innerText = `${p.sec || 0}/40`;
    
    let elPriBar = document.getElementById(`ag-p${pNum}-pri-bar`);
    if(elPriBar) elPriBar.style.width = `${((p.pri || 0)/45)*100}%`;
    
    let elSecBar = document.getElementById(`ag-p${pNum}-sec-bar`);
    if(elSecBar) elSecBar.style.width = `${((p.sec || 0)/40)*100}%`;
    
    let elCardTotal = document.getElementById(`ag-p${pNum}-card-total`);
    if(elCardTotal) elCardTotal.innerText = total;
    
    let elCardPriScore = document.getElementById(`ag-p${pNum}-pri-score`);
    if(elCardPriScore) elCardPriScore.innerText = `${p.pri || 0}/45`;
    
    let elCardSecScore = document.getElementById(`ag-p${pNum}-sec-score`);
    if(elCardSecScore) elCardSecScore.innerText = `${p.sec || 0}/40`;
};


window.selectFD = function(pNum, fd) {
    if(pNum === 1) trackerState.p1.forceDisp = fd;
    if(pNum === 2) trackerState.p2.forceDisp = fd;
    renderForceDispositionStep();
    
    if (trackerState.p1.forceDisp && trackerState.p2.forceDisp) {
        document.getElementById('ts-primary-result-box').style.display = 'flex';
        let missions = generatePrimaryMission();
        document.getElementById('ts-p1-primary-name').innerText = missions.p1;
        document.getElementById('ts-p2-primary-name').innerText = missions.p2;
        let p1n = document.getElementById('ts-p1-prim-name'); if(p1n) p1n.innerText = (trackerState.p1.name || "PLAYER 1").toUpperCase();
        let p2n = document.getElementById('ts-p2-prim-name'); if(p2n) p2n.innerText = (trackerState.p2.name || "PLAYER 2").toUpperCase();
    }
};

window.generatePrimaryMission = function() {
    // primary missions come from gdm_data.js: GDM_DATA.matrix[row][column], rows/columns in the order of GDM_DATA.factions (mission types)
    const p1fd = trackerState.p1.forceDisp, p2fd = trackerState.p2.forceDisp;
    const gd = window.GDM_DATA || {}, matrix = gd.matrix || [], types = (gd.factions || []).map(t => String(t).toUpperCase());
    const idx = fd => Math.max(0, types.indexOf(String(fd || '').toUpperCase()));
    const pick = (r, c) => (matrix[r] && matrix[r][c]) || '';
    const p1Mission = pick(idx(p1fd), idx(p2fd)), p2Mission = pick(idx(p2fd), idx(p1fd));
    trackerState.primaryMissionP1 = p1Mission;
    trackerState.primaryMissionP2 = p2Mission;
    return { p1: p1Mission, p2: p2Mission };
};
window.openPrimaryModal = function() {
    let m = trackerState.primaryMission || "Sabotage";
    let formatted = m.toLowerCase().replace(/ /g, '-').replace(/'/g, '');
    document.getElementById('modal-primary-img').src = `assets/primary/${formatted}.png`;
    document.getElementById('modal-primary-card').style.display = 'flex';
};

window.setRole = function(pNum, role) {
    let otherRole = role === 'ATTACKER' ? 'DEFENDER' : 'ATTACKER';
    
    // Set P1
    let p1Role = pNum === 1 ? role : otherRole;
    trackerState.p1.role = p1Role;
    document.getElementById('btn-p1-attacker').style.background = p1Role === 'ATTACKER' ? '#4384ff' : '#1e252f';
    document.getElementById('btn-p1-attacker').style.borderColor = p1Role === 'ATTACKER' ? '#4384ff' : '#3a4556';
    document.getElementById('btn-p1-defender').style.background = p1Role === 'DEFENDER' ? '#4384ff' : '#1e252f';
    document.getElementById('btn-p1-defender').style.borderColor = p1Role === 'DEFENDER' ? '#4384ff' : '#3a4556';
    
    // Set P2
    let p2Role = pNum === 2 ? role : otherRole;
    trackerState.p2.role = p2Role;
    document.getElementById('btn-p2-attacker').style.background = p2Role === 'ATTACKER' ? '#f44336' : '#1e252f';
    document.getElementById('btn-p2-attacker').style.borderColor = p2Role === 'ATTACKER' ? '#f44336' : '#3a4556';
    document.getElementById('btn-p2-defender').style.background = p2Role === 'DEFENDER' ? '#f44336' : '#1e252f';
    document.getElementById('btn-p2-defender').style.borderColor = p2Role === 'DEFENDER' ? '#f44336' : '#3a4556';
};

window.setDeck = function(pNum, deck) {
    if (pNum === 1) {
        trackerState.p1.deck = deck;
        document.getElementById('btn-p1-tactical').style.background = deck === 'TACTICAL' ? '#4384ff' : '#1e252f';
        document.getElementById('btn-p1-fixed').style.background = deck === 'FIXED' ? '#4384ff' : '#1e252f';
        document.getElementById('btn-p1-manual').style.background = deck === 'MANUAL' ? '#4384ff' : '#1e252f';
    } else {
        trackerState.p2.deck = deck;
        document.getElementById('btn-p2-tactical').style.background = deck === 'TACTICAL' ? '#f44336' : '#1e252f';
        document.getElementById('btn-p2-fixed').style.background = deck === 'FIXED' ? '#f44336' : '#1e252f';
        document.getElementById('btn-p2-manual').style.background = deck === 'MANUAL' ? '#f44336' : '#1e252f';
    }
};



window.VALID_MATCHUPS = [];   // terrain layout matchups ("AB-CD"); add your own with MATCHUP_DETAILS
window.getFDSlug = function(fdName) {
    const i = BL_MISSION_TYPES().indexOf(String(fdName || '').toUpperCase());
    return 'T' + (i < 0 ? 0 : i);
};
window.MATCHUP_DETAILS = {};   // "T0-T1": { dispositionLabel, missions: { T0: 'mission', T1: 'mission' } }  + pictures in assets/layouts_svg/<key>-A.svg

window.getMatchupKey = function(s1, s2) {
    if (VALID_MATCHUPS.includes(s1 + "-" + s2)) return s1 + "-" + s2;
    if (VALID_MATCHUPS.includes(s2 + "-" + s1)) return s2 + "-" + s1;
    return s1 + "-" + s2;
};

window.updateTerrainLayouts = function() {
    let p1fd = trackerState.p1.forceDisp || "";
    let p2fd = trackerState.p2.forceDisp || "";
    let slug1 = getFDSlug(p1fd);
    let slug2 = getFDSlug(p2fd);
    let matchupKey = getMatchupKey(slug1, slug2);
    
    if (!trackerState.terrainLayoutId || !trackerState.terrainLayoutId.startsWith(matchupKey)) {
        trackerState.terrainLayoutId = matchupKey + "-A";
    }
    let currentLayout = trackerState.terrainLayoutId;
    let currentV = currentLayout.split("-").pop();
    
    let details = MATCHUP_DETAILS[matchupKey] || {};
    let subtitle = "";
    if (details.missions) {
        let keys = Object.keys(details.missions);
        if (keys.length === 1) {
            subtitle = "Both players: " + details.missions[keys[0]];
        } else {
            subtitle = keys.map(k => k + ": " + details.missions[k]).join(" | ");
        }
    }
    
    let html = `<div style="display:flex; justify-content:center; gap:10px; margin-bottom:20px;">`;
    ['A', 'B', 'C'].forEach(v => {
        let layoutId = matchupKey + "-" + v;
        let isSelected = currentLayout === layoutId;
        let bg = isSelected ? 'var(--accent)' : '#1e252f';
        let color = isSelected ? '#000' : '#fff';
        let fw = isSelected ? 'bold' : 'normal';
        html += `<button onclick="selectTerrainLayout('${layoutId}')" style="flex:1; padding:12px; background:${bg}; color:${color}; border:1px solid #3a4556; border-radius:8px; font-weight:${fw}; cursor:pointer; font-size:1.1rem; transition:all 0.2s;">Layout ${v}</button>`;
    });
    html += `</div>`;
    
    html += `
        <div style="background:#161d27; border:1px solid #2a3546; border-radius:12px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.3);">
            <div onclick="previewTerrainLayout()" style="position:relative; cursor:pointer;">
                <img src="assets/layouts_svg/${currentLayout}.svg" style="width:100%; display:block; background:#fff; border-bottom:1px solid #2a3546;" />
                <div style="position:absolute; bottom:10px; right:10px; background:rgba(0,0,0,0.7); color:#fff; padding:5px 10px; border-radius:20px; font-size:0.8rem; font-weight:bold;">
                    <i class="fa-solid fa-expand"></i> Tap to Enlarge
                </div>
            </div>
            <div style="padding:15px; text-align:center;">
                <div style="font-size:1.15rem; font-weight:bold; color:var(--accent); margin-bottom:6px;">${details.dispositionLabel} Layout ${currentV}</div>
                <div style="font-size:0.85rem; color:#888; margin-bottom:12px;">${subtitle}</div>
                <div style="display:flex; justify-content:center; gap:10px;">
                    <button onclick="event.stopPropagation(); open3DLayoutModal('${currentLayout}', '3d')" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:linear-gradient(135deg, #16a34a, #15803d); border:1px solid #4ade80; border-radius:8px; color:#fff; font-weight:bold; font-size:0.92rem; text-decoration:none; box-shadow:0 4px 12px rgba(22,163,74,0.35); cursor:pointer;"><i class="fa-solid fa-vr-cardboard"></i> 📱 3D &amp; AR</button>
                </div>
            </div>
        </div>
    `;
    
    let opts = document.getElementById('ts-terrain-options');
    let btn = document.getElementById('btn-preview-terrain');
    if(opts) {
        opts.innerHTML = html;
        if(btn) btn.style.display = 'none'; // Replaced by tapping the image
    }
};

window.selectTerrainLayout = function(id) {
    trackerState.terrainLayoutId = id;
    updateTerrainLayouts();
};


window.navTracker = function(dir) {
    let currentStep = window.trackerState.step || 1;
    let nextStep = currentStep + dir;
    if (nextStep < 1) nextStep = 1;
    if (nextStep > 7) nextStep = 7;
    
    // Validate step logic here if needed
    if (currentStep === 1 && dir > 0) {
        trackerState.p1.name = document.getElementById('ts-p1-name').value || "PLAYER 1";
        trackerState.p2.name = document.getElementById('ts-p2-name').value || "PLAYER 2";
        renderDetachmentStep();
    }
    if (currentStep === 2 && dir > 0) {
        renderForceDispositionStep();
        if (trackerState.p1.forceDisp && trackerState.p2.forceDisp) {
            document.getElementById('ts-primary-result-box').style.display = 'flex';
            let missions = generatePrimaryMission();
            document.getElementById('ts-p1-primary-name').innerText = missions.p1;
            document.getElementById('ts-p2-primary-name').innerText = missions.p2;
            let p1n = document.getElementById('ts-p1-prim-name'); if(p1n) p1n.innerText = (trackerState.p1.name || "PLAYER 1").toUpperCase();
            let p2n = document.getElementById('ts-p2-prim-name'); if(p2n) p2n.innerText = (trackerState.p2.name || "PLAYER 2").toUpperCase();
        }
    }
    if (nextStep === 4) { updateTerrainLayouts(); }
    if (nextStep === 7 && dir > 0) {
        let n1 = document.getElementById('ag-p1-name'); if(n1) n1.innerText = trackerState.p1.name.toUpperCase();
        let cn1 = document.getElementById('ag-p1-card-name'); if(cn1) cn1.innerText = trackerState.p1.name.toUpperCase();
        let n2 = document.getElementById('ag-p2-name'); if(n2) n2.innerText = trackerState.p2.name.toUpperCase();
        let cn2 = document.getElementById('ag-p2-card-name'); if(cn2) cn2.innerText = trackerState.p2.name.toUpperCase();
        updateGDMScore(1);
        updateGDMScore(2);
    }
    
    // Hide all steps
    for(let i=1; i<=7; i++) {
        let el = document.getElementById('ts-' + i);
        if(el) el.style.display = 'none';
        
        let dot = document.getElementById('sdot-' + i);
        if (dot) {
            if (i === nextStep) {
                dot.style.background = i === 1 ? '#4db8ff' : (i === 2 ? '#ff4d4d' : 'var(--accent)');
                dot.style.color = '#000';
                dot.style.fontWeight = 'bold';
                dot.style.borderColor = 'transparent';
            } else {
                dot.style.background = nextStep > i ? '#2f6b4f' : 'transparent';
                dot.style.color = nextStep > i ? '#fff' : '#888';
                dot.style.fontWeight = 'normal';
                dot.style.borderColor = nextStep > i ? 'transparent' : '#333';
                if (nextStep > i) {
                    dot.innerHTML = '<i class="fa-solid fa-check"></i>';
                } else {
                    dot.innerHTML = i;
                }
            }
        }
    }
    document.getElementById('ts-' + nextStep).style.display = 'block';
    window.trackerState.step = nextStep;
    
    // Re-apply selection highlights for steps 5/6/7 (attacker, deck, first turn)
    if (nextStep >= 5 && nextStep <= 7 && typeof renderStepSelections === 'function') {
        setTimeout(renderStepSelections, 0);
    }
    
    document.getElementById('btn-tracker-back').style.display = nextStep > 1 ? 'block' : 'none';
    if (nextStep === 7) {
        document.getElementById('ts-nav').style.display = 'none';
    }
    
    window.trackerState.step = nextStep;
};


window.setFirstTurn = function(pNum) {
    trackerState.firstTurn = pNum;
    document.getElementById('btn-p1-first').style.background = pNum === 1 ? '#4384ff' : '#1e252f';
    document.getElementById('btn-p2-first').style.background = pNum === 2 ? '#f44336' : '#1e252f';
    
    // Auto-advance to active game after a brief delay
    setTimeout(() => {
        startGameTracker();
    }, 500);
};

window.startGameTracker = function() {
    document.getElementById('view-tracker').style.display = 'none';
    document.getElementById('view-active-game').style.display = 'block';
    
    // Init state
    trackerState.round = 1;
    trackerState.p1.pri = 0; trackerState.p1.sec = 0; trackerState.p1.secondaries = [];
    trackerState.p2.pri = 0; trackerState.p2.sec = 0; trackerState.p2.secondaries = [];
    
    // Render names and static data
    document.getElementById('ag-p1-badge').innerText = trackerState.p1.forceDisp || 'PRIORITY ASSETS';
    document.getElementById('ag-p2-badge').innerText = trackerState.p2.forceDisp || 'PRIORITY ASSETS';
    document.getElementById('ag-p1-pri-name').innerText = trackerState.primaryMission;
    document.getElementById('ag-p2-pri-name').innerText = trackerState.primaryMission;
    document.getElementById('ag-p1-deck-type').innerText = trackerState.p1.deck || 'TACTICAL';
    document.getElementById('ag-p2-deck-type').innerText = trackerState.p2.deck || 'TACTICAL';
    
    updateActiveGameUI();
};

window.changeGameRound = function(dir) {
    trackerState.round += dir;
    if(trackerState.round < 1) trackerState.round = 1;
    if(trackerState.round > 5) trackerState.round = 5;
    document.getElementById('ag-round-display').innerText = trackerState.round;
    updateActiveGameUI();
};

window.updateActiveGameUI = function() {
    for(let pNum=1; pNum<=2; pNum++) {
        let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
        let total = p.pri + p.sec + (p.paint ? 10 : 0);
        
        // Update top bars
        document.getElementById(`ag-p${pNum}-total`).innerText = total;
        document.getElementById(`ag-p${pNum}-pri-txt`).innerText = `${p.pri}/45`;
        document.getElementById(`ag-p${pNum}-pri-bar`).style.width = `${Math.min(100, (p.pri/45)*100)}%`;
        document.getElementById(`ag-p${pNum}-sec-txt`).innerText = `${p.sec}/45`;
        document.getElementById(`ag-p${pNum}-sec-bar`).style.width = `${Math.min(100, (p.sec/45)*100)}%`;
        
        // Update cards
        document.getElementById(`ag-p${pNum}-card-total`).innerText = total;
        document.getElementById(`ag-p${pNum}-pri-score`).innerText = `${p.pri}/45`;
        document.getElementById(`ag-p${pNum}-sec-score`).innerText = `${p.sec}/45`;
        
        // Update primary button text
        document.getElementById(`ag-p${pNum}-pri-btn`).innerText = `SCORE R${trackerState.round}`;
        let pm = pNum === 1 ? trackerState.primaryMissionP1 : trackerState.primaryMissionP2;
        document.getElementById(`ag-p${pNum}-pri-box`).setAttribute("onclick", `openScoringTally(${pNum}, \'primary\', \'${pm}\')`);
        
        // Update secondaries list
        let secHtml = "";
        if (p.secondaries.length === 0) {
            secHtml = '<div style="color:#888; font-size:0.9rem; text-align:center; padding:10px 0;">No active secondaries</div>';
        } else {
            for(let sec of p.secondaries) {
                secHtml += `
                    <div style="background:#161d27; border:1px solid ${pNum === 1 ? '#4db8ff' : '#ff4d4d'}; border-radius:8px; padding:15px; display:flex; justify-content:space-between; align-items:center; cursor:pointer;" onclick="openScoringTally(${pNum}, 'secondary', '${sec}')">
                        <div style="color:#fff; font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${sec}</div>
                        <div style="color:${pNum === 1 ? '#4db8ff' : '#ff4d4d'}; font-size:0.7rem; font-weight:bold; letter-spacing:1px;">HELD &middot; R${trackerState.round}</div>
                    </div>
                `;
            }
        }
        document.getElementById(`ag-p${pNum}-secondaries-list`).innerHTML = secHtml;
    }
};

window.drawSecondary = function(pNum) {
    let p = pNum === 1 ? trackerState.p1 : trackerState.p2;
    // Hardcoded list for visual demo (matching screenshots)
    let pool = [
        "A GRIEVOUS BLOW", "A TEMPTING TARGET", "ASSASSINATION", "BEACON", 
        "BEHIND ENEMY LINES", "BRING IT DOWN", "BURDEN OF TRUST", "CENTRE GROUND", 
        "CLEANSE", "DEFEND STRONGHOLD", "DISPLAY OF MIGHT", "ENGAGE ON ALL FRONTS", 
        "FORWARD POSITION", "NO PRISONERS", "OUTFLANK", "OVERWHELMING FORCE", 
        "PLUNDER", "SECURE NO MAN'S LAND"
    ];
    if(!p.discarded) p.discarded = [];
    let remaining = pool.filter(x => !p.secondaries.includes(x) && !p.discarded.includes(x));
    if(remaining.length > 0) {
        let draw = remaining[Math.floor(Math.random() * remaining.length)];
        p.secondaries.push(draw);
        let countEl = document.getElementById(`ag-p${pNum}-deck-count`);
        countEl.innerText = Math.max(0, parseInt(countEl.innerText) - 1);
        updateActiveGameUI();
    }
};

// TALLY MODAL LOGIC
window.tallyState = { pNum: 1, type: 'primary', name: '', s1: false, s2: false };

window.openScoringTally = function(pNum, type, name) {
    tallyState = { pNum: pNum, type: type, name: name, s1: false, s2: false };
    let body = document.getElementById('modal-tally-body-content');
    body.setAttribute('data-view', 'tally');
    
    // For primary, if we don't have custom HTML, let's just make it generic
    if(true) { // Use generic VP input for all (Primary & Secondary)
        let label = type === 'primary' ? 'INPUT PRIMARY VP' : 'INPUT SECONDARY VP';
        body.innerHTML = `
            <div style="font-size:0.8rem; font-weight:bold; letter-spacing:2px; margin-bottom:15px; color:#888;">${label}</div>
            <div style="background:#fff; border:1px solid #ccc; border-radius:8px; overflow:hidden; margin-bottom:20px; padding:20px; text-align:center;">
                <div style="font-size:1rem; margin-bottom:15px; color:#1a232f;">Select the amount of VP you scored for <b>${name}</b> this round.</div>
                <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap;">
                <div style="--btn-bg: ${type === 'primary' ? '#a6843c' : '#8c2a2a'}; display:flex; justify-content:center; gap:10px; flex-wrap:wrap; width:100%;">
                    <button onclick="setTallyVp(2)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">2 VP</button>
                    <button onclick="setTallyVp(3)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">3 VP</button>
                    <button onclick="setTallyVp(4)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">4 VP</button>
                    <button onclick="setTallyVp(5)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">5 VP</button>
                    <button onclick="setTallyVp(6)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">6 VP</button>
                    <button onclick="setTallyVp(8)" style="padding:10px; background:var(--btn-bg); color:#fff; border:none; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1.1rem; flex:1; min-width:60px;">8 VP</button>
                </div>
                </div>
            </div>
        `;
    }
    
    // Colors
    let isPri = type === 'primary';
    let bgColor = isPri ? '#a6843c' : '#8c2a2a';
    
    // Set up modal
    document.getElementById('modal-tally-container').style.borderColor = bgColor;
    document.getElementById('modal-tally-container').children[0].style.background = bgColor;
    document.getElementById('modal-tally-type').innerText = isPri ? 'PRIMARY MISSION' : 'SECONDARY MISSION';
    document.getElementById('modal-tally-title').innerText = name;
    
    // Reset checks
    updateTallyChecks();
    
    document.getElementById('modal-tally').style.display = 'flex';
    document.getElementById('btn-tally-score').innerText = 'SCORE 0 VP';
    document.getElementById('btn-tally-score').style.background = '#2a3546';
};

window.toggleTallyCheck = function(idx) {
    if(idx === 1) {
        tallyState.s1 = !tallyState.s1;
        if(tallyState.s1) tallyState.s2 = false; // It's an OR condition in Beacon
    } else {
        tallyState.s2 = !tallyState.s2;
        if(tallyState.s2) tallyState.s1 = false;
    }
    updateTallyChecks();
};

window.updateTallyChecks = function() {
    let c1 = document.getElementById('modal-tally-check-1');
    let c2 = document.getElementById('modal-tally-check-2');
    let btn = document.getElementById('btn-tally-score');
    
    if(!c1 || !c2) return;
    
    if(tallyState.s1) {
        c1.innerHTML = '<div style="width:16px; height:16px; background:#8c2a2a; border-radius:50%;"></div>';
        c1.style.borderColor = '#8c2a2a';
    } else {
        c1.innerHTML = '';
        c1.style.borderColor = '#ccc';
    }
    
    if(tallyState.s2) {
        c2.innerHTML = '<div style="width:16px; height:16px; background:#8c2a2a; border-radius:50%;"></div>';
        c2.style.borderColor = '#8c2a2a';
    } else {
        c2.innerHTML = '';
        c2.style.borderColor = '#ccc';
    }
    
    let vp = 0;
    if(tallyState.s1) vp = 3;
    if(tallyState.s2) vp = 5;
    
    btn.innerText = `SCORE ${vp} VP`;
    btn.style.background = vp > 0 ? '#8c2a2a' : '#2a3546';
};

window.submitTallyScore = function() {
    let vp = tallyState.vp || 0;
    if(vp === 0) {
        if(tallyState.s1) vp = 3;
        if(tallyState.s2) vp = 5;
    }
    
    let p = tallyState.pNum === 1 ? trackerState.p1 : trackerState.p2;
    if(tallyState.type === 'primary') {
        p.pri += vp;
    } else {
        p.sec += vp;
        // if they score a secondary, they usually discard it
        if (vp > 0) {
            p.secondaries = p.secondaries.filter(x => x !== tallyState.name);
        }
    }
    
    updateActiveGameUI();
    document.getElementById('modal-tally').style.display = 'none';
};



window.setTallyVp = function(vp) {
    tallyState.vp = vp;
    document.getElementById('btn-tally-score').innerText = `SCORE ${vp} VP`;
    document.getElementById('btn-tally-score').style.background = tallyState.type === 'primary' ? '#a6843c' : '#8c2a2a';
};
window.toggleFullCard = function() {
    let body = document.getElementById('modal-tally-body-content');
    if(body.getAttribute('data-view') === 'full') {
        body.setAttribute('data-view', 'tally');
        body.innerHTML = tallyState.originalHTML || "";
        updateTallyChecks();
    } else {
        tallyState.originalHTML = body.innerHTML;
        body.setAttribute('data-view', 'full');
        let formatted = tallyState.name.toLowerCase().replace(/ /g, '-').replace(/'/g, '');
        let role = trackerState['p' + tallyState.pNum].role ? trackerState['p' + tallyState.pNum].role.toLowerCase() : 'defender';
        formatted = formatted.replace(/-s/g, '-s-'); // Fix for SECURE NO MAN'S LAND
        let path = tallyState.type === 'primary' ? `assets/primary/${formatted}.png` : `assets/secondary/${role}/${formatted}.png`;
        // Handle "secure no man's land" specific formatting issue from download script
        if (path.includes('secure-no-man-s--land')) path = path.replace('secure-no-man-s--land', 'secure-no-man-s-land');
        if (formatted === 'secure-no-mans-land') path = tallyState.type === 'primary' ? `assets/primary/secure-no-mans-land.png` : `assets/secondary/${role}/secure-no-man-s-land.png`;
        
        let backPath = path.replace('.png', '-back.png');
        body.innerHTML = `
            <div style="text-align:center; position:relative;">
                <img id="tally-full-card-img" src="${path}" data-front="${path}" data-back="${backPath}" style="max-width:100%; max-height:55vh; border-radius:8px; box-shadow:0 4px 15px rgba(0,0,0,0.3);">
                <button id="tally-flip-btn" style="display:none; position:absolute; top:10px; right:10px; background:#a6843c; color:#fff; border:none; padding:8px 15px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 2px 10px rgba(0,0,0,0.5);"><i class="fa-solid fa-rotate"></i> FLIP</button>
            </div>
        `;
        let testImg = new Image();
        testImg.onload = function() {
            let btn = document.getElementById('tally-flip-btn');
            if(btn) {
                btn.style.display = 'block';
                btn.onclick = function() {
                    let img = document.getElementById('tally-full-card-img');
                    img.src = img.src.includes(img.dataset.front) ? img.dataset.back : img.dataset.front;
                };
            }
        };
        testImg.src = backPath;

    }
};


window.discardMission = function(dest) {
    let p = tallyState.pNum === 1 ? trackerState.p1 : trackerState.p2;
    if(tallyState.type === 'secondary') {
        let idx = p.secondaries.indexOf(tallyState.name);
        if(idx !== -1) {
            p.secondaries.splice(idx, 1);
        }
        if(dest === 'trash' || dest === 'score') {
            if(!p.discarded) p.discarded = [];
            if(!p.discarded.includes(tallyState.name)) {
                p.discarded.push(tallyState.name);
            }
        }
    }
    updateActiveGameUI();
    document.getElementById('modal-tally').style.display = 'none';
};

window.openCardView = function(frontPath, backPath) {
    let modal = document.getElementById('modal-card-viewer');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-card-viewer';
        modal.style.cssText = 'display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:99999; flex-direction:column; justify-content:center; align-items:center; padding:20px;';
        modal.innerHTML = `
            <div style="position:absolute; top:20px; right:20px; display:flex; gap:10px;">
                <button id="btn-flip-card" style="display:none; background:#a6843c; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1rem;"><i class="fa-solid fa-rotate"></i> FLIP</button>
                <button onclick="document.getElementById('modal-card-viewer').style.display='none'" style="background:#2a3546; color:#fff; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:1rem;"><i class="fa-solid fa-times"></i> CLOSE</button>
            </div>
            <img id="card-viewer-img" src="" style="max-width:100%; max-height:85vh; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.8); transition: opacity 0.2s;">
        `;
        document.body.appendChild(modal);
    }
    
    let img = document.getElementById('card-viewer-img');
    let flipBtn = document.getElementById('btn-flip-card');
    
    img.src = frontPath;
    img.dataset.front = frontPath;
    img.dataset.back = backPath;
    
    // Check if back exists by testing the image
    let testImg = new Image();
    testImg.onload = function() {
        flipBtn.style.display = 'block';
    };
    testImg.onerror = function() {
        flipBtn.style.display = 'none';
    };
    testImg.src = backPath;
    
    flipBtn.onclick = function() {
        if(img.src.includes(img.dataset.front)) {
            img.src = img.dataset.back;
        } else {
            img.src = img.dataset.front;
        }
    };
    
    modal.style.display = 'flex';
};

window.exportHistory = function() {
    let history = localStorage.getItem('gdm_history') || '[]';
    let blob = new Blob([history], {type: "application/json"});
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = "iron-and-wrath_history.json";
    a.click();
    URL.revokeObjectURL(url);
};

// Start logic (must run after navTracker is defined)
if(document.getElementById('view-tracker')) {
    navTracker(0); // Init
}
