/* Unit calculator: expected damage / models removed by one of your units against reference targets.
   Pure maths engine (window.CALC) + UI. Uses the datasheet data the app already loads (STATE.currentFactionData).
   Estimator only: classic hit → wound → save → damage maths, averages (no dice rolling). */
(function () {
    // ───────────── engine ─────────────
    const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
    const num = s => { const m = String(s == null ? '' : s).match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
    // "D6", "2D3+1", "3", "D6+2" -> [{v, p}] outcomes
    function dice(str) {
        const s = String(str == null ? '' : str).toUpperCase().replace(/\s/g, '');
        const m = s.match(/^(\d*)D(\d+)([+-]\d+)?$/);
        if (!m) { const n = num(s); return n == null ? null : [{ v: n, p: 1 }]; }
        const cnt = m[1] ? +m[1] : 1, sides = +m[2], add = m[3] ? +m[3] : 0;
        let dist = new Map([[0, 1]]);
        for (let i = 0; i < cnt; i++) { const nd = new Map(); dist.forEach((p, v) => { for (let f = 1; f <= sides; f++) nd.set(v + f, (nd.get(v + f) || 0) + p / sides); }); dist = nd; }
        return [...dist].map(([v, p]) => ({ v: v + add, p }));
    }
    const mean = d => d.reduce((s, o) => s + o.v * o.p, 0);
    const skillOf = s => { const n = num(s); return n == null || /N\/A/i.test(s) ? null : n; };   // "3+" -> 3 ; N/A -> null (auto-hit)
    const normKw = k => String(k || '').replace(/[\[\]]/g, '').replace(/[‑–—]/g, '-').replace(/\s+/g, ' ').trim().toUpperCase();
    const KNOWN_KW = [/^LETHAL HITS$/, /^SUSTAINED HITS( \d+)?$/, /^DEVASTATING WOUNDS/, /^ANTI-[A-Z ]+ \d\+$/, /^BLAST( \d+)?$/, /^TORRENT$/, /^RAPID FIRE( \d+| D\d)?$/, /^MELTA( \d+| D\d)?$/, /^HEAVY$/, /^LANCE$/, /^TWIN-LINKED$/, /^IGNORES COVER$/, /^MELEE$/, /^PISTOL$/, /^ASSAULT$/, /^PSYCHIC$/, /^HAZARDOUS$/, /^PRECISION$/];

    // ---- weapon tags as controls: simple on/off boxes, boxes with a number, and Anti-X (keyword + roll) ----
    const TAGS_SIMPLE = [
        ['MELEE', 'Melee weapon', 'uses WS and the Fight phase'],
        ['LETHAL HITS', 'Lethal Hits', 'a 6 to hit automatically wounds (skips the wound roll)'],
        ['DEVASTATING WOUNDS', 'Devastating Wounds', 'a 6 to wound ignores saves (damage still applies)'],
        ['TORRENT', 'Torrent', 'always hits (no hit roll)'],
        ['HEAVY', 'Heavy', '+1 to hit if the attacker stood still'],
        ['LANCE', 'Lance', '+1 to wound if the attacker charged'],
        ['TWIN-LINKED', 'Twin-linked', 're-roll wound rolls'],
        ['IGNORES COVER', 'Ignores Cover', 'target gets no cover bonus']
    ];
    const TAGS_NUM = [
        ['SUSTAINED HITS', 'Sustained Hits', 'each 6 to hit adds this many extra hits', 1, 'hits'],
        ['BLAST', 'Blast', 'extra attacks per 5 models in the target unit (rounded down)', 1, 'per 5'],
        ['RAPID FIRE', 'Rapid Fire', 'extra ATTACKS at half range', 1, 'attacks'],
        ['MELTA', 'Melta', 'extra DAMAGE at half range', 2, 'damage']
    ];
    const ANTI_KW = ['INFANTRY', 'MONSTER', 'VEHICLE', 'CHARACTER', 'PSYKER', 'FLY', 'TITANIC', 'BEAST', 'MOUNTED', 'SWARM', 'DAEMON'];
    const tagKey = (name) => new RegExp('^' + name.replace(/[-]/g, '\\-') + '(\\s|$)');
    function tagPanel(i, wi, w) {
        const has = n => w.kws.some(k => k === n), numOf = (n, d) => { const k = w.kws.find(x => tagKey(n).test(x)); if (!k) return null; const v = num(k.slice(n.length)); return v == null ? d : v; };
        const box = (checked, onchange, label, hint) => `<label style="display:flex; align-items:center; gap:8px; min-height:44px; font-size:0.85rem;"><input type="checkbox" ${checked ? 'checked' : ''} onchange="${onchange}" style="width:22px; height:22px; flex:none;"><span><b>${label}</b><span style="color:#667; font-size:0.68rem; display:block;">${hint}</span></span></label>`;
        let h = `<details style="margin-top:8px;" open><summary style="cursor:pointer; color:#9aa7b8; font-size:0.78rem;">${S('Weapon abilities', 'Habilidades del arma')}</summary><div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:2px 10px; margin-top:4px;">`;
        TAGS_SIMPLE.forEach(([n, label, hint]) => { h += box(has(n), `CALCUI.tag(${i},${wi},'${n}',this.checked)`, label, hint); });
        TAGS_NUM.forEach(([n, label, hint, d, unit]) => { const v = numOf(n, d), on = v != null; h += `<div style="display:flex; align-items:center; gap:8px; min-height:44px; font-size:0.85rem;"><label style="display:flex; align-items:center; gap:8px; flex:1; min-height:44px;"><input type="checkbox" ${on ? 'checked' : ''} onchange="CALCUI.tag(${i},${wi},'${n}',this.checked,${d})" style="width:22px; height:22px; flex:none;"><span style="flex:1;"><b>${label}</b><span style="color:#667; font-size:0.68rem; display:block;">${hint}</span></span></label><input type="number" inputmode="numeric" min="1" max="12" value="${on ? v : d}" ${on ? '' : 'disabled'} onchange="CALCUI.tagn(${i},${wi},'${n}',this.value)" aria-label="${label} value" style="${css.in} width:64px; padding:4px; min-height:40px;"><span style="color:#9aa7b8; font-size:0.7rem; width:46px;">${unit}</span></div>`; });
        const anti = w.kws.find(k => /^ANTI-/.test(k)), am = anti && anti.match(/^ANTI-([A-Z ]+?)\s*(\d)\+$/), akw = am ? am[1].trim() : '', ax = am ? am[2] : '4';
        h += `<div style="display:flex; align-items:center; gap:8px; min-height:44px; flex-wrap:wrap; font-size:0.85rem; grid-column:1 / -1;"><label style="display:flex; align-items:center; gap:8px; min-height:44px;"><input type="checkbox" ${anti ? 'checked' : ''} onchange="CALCUI.anti(${i},${wi},this.checked)" style="width:22px; height:22px; flex:none;"><span><b>Anti-</b><span style="color:#667; font-size:0.68rem;"> ${S('wounds on a', 'hiere con')} ${S('critical roll of', 'tirada crítica de')}</span></span></label><select ${anti ? '' : 'disabled'} onchange="CALCUI.antiSet(${i},${wi},this.value,null)" style="${css.in} width:130px; padding:4px; min-height:40px;">${ANTI_KW.map(k => `<option ${k === akw ? 'selected' : ''}>${k}</option>`).join('')}</select><select ${anti ? '' : 'disabled'} onchange="CALCUI.antiSet(${i},${wi},null,this.value)" style="${css.in} width:70px; padding:4px; min-height:40px;">${[2, 3, 4, 5, 6].map(n => `<option ${String(n) === ax ? 'selected' : ''}>${n}</option>`).join('')}</select><span style="color:#9aa7b8;">+</span></div>`;
        h += `</div><details style="margin-top:6px;"><summary style="cursor:pointer; color:#667; font-size:0.72rem;">${S('Other keywords (typed)', 'Otras palabras clave (texto)')}</summary><input value="${esc(w.kws.join(', '))}" onchange="CALCUI.cw(${i}, ${wi}, 'kws', this.value)" style="${css.in} padding:4px; margin-top:4px;"></details></details>`;
        return h;
    }
    function parseKeywords(name) {
        const m = String(name || '').match(/\[([^\]]+)\]/); const kws = m ? m[1].split(',').map(x => x.trim().toUpperCase()) : [];
        return { base: String(name || '').replace(/\s*\[[^\]]+\]/, '').trim(), kws };
    }
    const kwNum = (kws, re, dflt) => { const k = kws.find(x => re.test(x)); if (!k) return null; const n = num(k.replace(re, '')); return n == null ? dflt : n; };
    function woundNeed(S, T) { return S >= 2 * T ? 2 : S > T ? 3 : S === T ? 4 : S * 2 <= T ? 6 : 5; }
    const pRoll = (need, mod) => clamp((7 - clamp(need - mod, 2, 7)) / 6, 1 / 6, 5 / 6);   // natural 1 fails, natural 6 succeeds
    function withReroll(p, mode) { return mode === 'all' ? p + (1 - p) * p : mode === 'ones' ? p + p / 6 : p; }
    function crit6(p, mode) { return mode === 'all' ? 1 / 6 + (1 - p) / 6 : mode === 'ones' ? 1 / 6 + 1 / 36 : 1 / 6; }

    // w = {A,skill,S,AP,D,kws,melee}; t = {T,W,Sv,Inv,Fnp,size,kw:[]}; o = {halfRange,cover,charged,stationary,rrHit,rrWound,hitMod,count}
    function resolve(w, t, o) {
        const r = resolve1(w, t, o); if (!r) return r;
        if ((w.kws || []).includes('LETHAL HITS') && (w.kws || []).includes('DEVASTATING WOUNDS')) { const r2 = resolve1(Object.assign({}, w, { kws: w.kws.filter(k => k !== 'LETHAL HITS') }), t, o); if (r2 && r2.dmg > r.dmg) { r2.rolled = true; return r2; } }
        return r;
    }
    function resolve1(w, t, o) {
        o = o || {}; const kws = w.kws || [], A0 = dice(w.A); if (!A0 || w.S == null) return null;
        let A = mean(A0);
        const rf = kwNum(kws, /^RAPID FIRE\s*/, 1); if (rf != null && o.halfRange && !w.melee) A += mean(dice(String(rf)) || [{ v: 1, p: 1 }]);
        { const bl = kws.find(k => /^BLAST(\s|$)/.test(k)); if (bl) A += (kwNum(kws, /^BLAST\s*/, 1) || 1) * Math.floor((t.size || 1) / 5); }   // BLAST X: +X attacks per full 5 models in the target unit
        const torrent = kws.includes('TORRENT') || w.skill == null;
        let hitMod = clamp((o.hitMod || 0) + (kws.includes('HEAVY') && o.stationary ? 1 : 0), -1, 1);
        const pH0 = torrent ? 1 : pRoll(w.skill, hitMod), pH = torrent ? 1 : withReroll(pH0, o.rrHit), pCritH = torrent ? 0 : crit6(pH0, o.rrHit);
        const hitsAll = A * pH, crits = A * pCritH;
        const sus = kwNum(kws, /^SUSTAINED HITS\s*/, 1) || 0, lethal = kws.includes('LETHAL HITS');
        const extra = crits * sus;
        const toWound = lethal ? hitsAll - crits + extra : hitsAll + extra, autoW = lethal ? crits : 0;
        // wounding
        const need = woundNeed(w.S, t.T), wMod = clamp((kws.includes('LANCE') && o.charged && w.melee ? 1 : 0), -1, 1);
        let pW0 = pRoll(need, wMod), pCritW0 = 1 / 6;
        const anti = kws.find(k => /^ANTI-/.test(k));
        if (anti) { const m = anti.match(/^ANTI-([A-Z ]+?)\s*(\d)\+$/); if (m && (t.kw || []).map(x => x.toUpperCase()).includes(m[1].trim())) { const y = +m[2]; pCritW0 = (7 - y) / 6; pW0 = Math.max(pW0, pCritW0); } }
        const rrW = kws.includes('TWIN-LINKED') ? 'all' : (o.rrWound || 'none');
        const pW = withReroll(pW0, rrW), pCritW = pCritW0 + (rrW === 'all' ? (1 - pW0) * pCritW0 : rrW === 'ones' ? pCritW0 / 6 : 0);
        const wounds = toWound * pW + autoW, critWounds = Math.min(toWound * pCritW, toWound * pW);
        const dev = kws.includes('DEVASTATING WOUNDS');
        const normalWounds = dev ? wounds - critWounds : wounds, devWounds = dev ? critWounds : 0;
        // saves
        const ap = num(w.AP) || 0, cover = o.cover && !kws.includes('IGNORES COVER') ? 1 : 0;
        const armour = (t.Sv || 7) - ap - cover, inv = t.Inv ? t.Inv : 7, best = Math.min(armour, inv);   // ap is negative: Sv - (-2) = worse
        const sv = Math.min(armour, inv);
        const pSave = sv > 6 ? 0 : clamp((7 - Math.max(2, sv)) / 6, 0, 5 / 6);
        const unsaved = normalWounds * (1 - pSave) + devWounds;
        // damage (capped by one model's wounds; no spill-over between models)
        const D = dice(w.D); if (!D) return null; const melta = o.halfRange ? (kwNum(kws, /^MELTA\s*/, 1) || 0) : 0;
        const eff = D.reduce((s, x) => s + x.p * Math.min(x.v + melta, t.W), 0);
        const pFnp = t.Fnp ? (7 - t.Fnp) / 6 : 0;
        const dmg = unsaved * eff * (1 - pFnp), kills = dmg / t.W;
        return { dmg, kills, hits: hitsAll + extra, wounds, unsaved, pSave, attacks: A, crits, extra, autoW, devWounds, hitRoll: torrent ? 0 : pH, math: { hit: torrent ? 'Auto' : w.skill+'+', wound: need+'+', save: sv > 6 ? '-' : Math.max(2, sv)+'+', fnp: t.Fnp ? t.Fnp+'+' : '-' } };
    }
    function volley(weapons, t, o) {
        let dmg = 0, kills = 0, mathStr = '', det = { att: 0, hits: 0, wnd: 0, uns: 0, extra: 0, auto: 0, dev: 0, crit: 0, rolled: false };
        weapons.forEach(x => { 
            const r = resolve(x.w, t, o); 
            if (r) { 
                dmg += r.dmg * x.count; kills += r.kills * x.count; det.att += r.attacks * x.count; det.hits += r.hits * x.count; det.wnd += r.wounds * x.count; det.uns += r.unsaved * x.count; det.extra += r.extra * x.count; det.auto += r.autoW * x.count; det.dev += r.devWounds * x.count; det.crit += r.crits * x.count; if (r.rolled) det.rolled = true;
                if (!mathStr) mathStr = `${r.math.hit} hit · ${r.math.wound} wnd · ${r.math.save} sv${r.math.fnp !== '-' ? ' · '+r.math.fnp+' fnp' : ''}`;
            } 
        });
        const f = n => (Math.round(n * 10) / 10).toString(); const detail = det.att ? `${f(det.att)} attacks → ${f(det.hits)} hits${det.crit && (det.extra || det.auto) ? ` (${f(det.crit)} critical on 6s${det.extra ? `, +${f(det.extra)} sustained extra` : ''})` : ''} → ${f(det.wnd)} wounds${det.auto ? ` (${f(det.auto)} lethal auto-wounds)` : ''}${det.rolled ? ' (Lethal Hits not used: rolling to wound is better with Devastating Wounds)' : ''}${det.dev ? ` (${f(det.dev)} devastating, no save)` : ''} → ${f(det.uns)} unsaved` : '';
        return { dmg, kills, pct: t.size ? Math.min(1, kills / t.size) : 0, mathStr, detail };
    }
    window.CALC = { dice, mean, resolve, volley, parseKeywords, woundNeed, skillOf, num };

    // ───────────── presets ─────────────
    const PRESETS = [
        { id: 'p1', name: 'Light infantry', T: 3, W: 1, Sv: 5, Inv: 0, Fnp: 0, size: 10, kw: ['INFANTRY'] },
        { id: 'p2', name: 'Tough infantry', T: 5, W: 2, Sv: 3, Inv: 0, Fnp: 0, size: 5, kw: ['INFANTRY'] },
        { id: 'p3', name: 'Heavy-armour veteran', T: 6, W: 3, Sv: 3, Inv: 4, Fnp: 0, size: 5, kw: ['INFANTRY'] },
        { id: 'p4', name: 'Golden guardian', T: 6, W: 3, Sv: 2, Inv: 4, Fnp: 0, size: 5, kw: ['INFANTRY'] },
        { id: 'p5', name: 'Heavy / walker', T: 7, W: 5, Sv: 3, Inv: 4, Fnp: 0, size: 1, kw: ['VEHICLE'] },
        { id: 'p6', name: 'Monster / tank', T: 9, W: 9, Sv: 3, Inv: 0, Fnp: 0, size: 1, kw: ['MONSTER', 'VEHICLE'] },
        { id: 'p7', name: 'Titanic', T: 11, W: 16, Sv: 2, Inv: 4, Fnp: 0, size: 1, kw: ['VEHICLE', 'MONSTER'] }
    ];
    window.CALC.PRESETS = PRESETS;

    // ───────────── UI ─────────────
    const lang = () => { try { return localStorage.getItem('gdm_lang') || 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const mkSlot = () => ({ faction: '', units: [], unit: null, size: 1, nUnits: 1, counts: {}, off: {}, loading: false, msg: '' });
    const st = { slots: [mkSlot(), mkSlot()], compare: false, o: { halfRange: false, cover: false, charged: false, stationary: false, rrHit: 'none', rrWound: 'none', hitMod: 0 }, targets: PRESETS.map(p => ({ ...p })) };
    // Rapid Fire / Melta only work at half range and Heavy needs a stationary attacker, so using such a weapon switches the matching condition on
    const AUTO = { halfRange: false, stationary: false };
    function syncConditions(why) {
        let hr = false, sta = false;
        st.slots.forEach((sl, i) => { if (!sl.unit || (i === 1 && !st.compare)) return; activeW(sl).forEach(w => { const k = w.kws || []; if (k.some(x => /^(RAPID FIRE|MELTA)(\s|$)/.test(x)) && !w.melee) hr = true; if (k.some(x => /^MELTA(\s|$)/.test(x))) hr = true; if (k.includes('HEAVY')) sta = true; }); });
        if (hr && !st.o.halfRange) { st.o.halfRange = true; AUTO.halfRange = true; }
        if (sta && !st.o.stationary) { st.o.stationary = true; AUTO.stationary = true; }
        if (!hr) AUTO.halfRange = false; if (!sta) AUTO.stationary = false;
    }
    const KEY = 'bl_calc_saved_v1';
    function saveState() { try { localStorage.setItem(KEY, JSON.stringify({ targets: st.targets, o: st.o, custom: st.slots.map(sl => sl.faction === 'CUSTOM' ? { name: sl.unit && sl.unit.name, models: sl.unit && sl.unit.models, weapons: sl.unit && sl.unit.weapons, size: sl.size, nUnits: sl.nUnits, counts: sl.counts, off: sl.off } : null) })); } catch (e) {} }
    function loadState() { try { const d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (!d) return; if (Array.isArray(d.targets) && d.targets.length === st.targets.length) st.targets = d.targets; if (d.o) Object.assign(st.o, d.o);
        (d.custom || []).forEach((c, i) => { if (c && c.weapons && st.slots[i]) { const sl = st.slots[i]; sl.faction = 'CUSTOM'; sl.unit = { id: 'custom', name: c.name || 'Custom Unit', weapons: c.weapons, models: c.models || [{ M: '-', T: '4', Sv: '3+', W: '1', Ld: '6+', OC: '1' }], comp: [] }; sl.units = [sl.unit]; sl.size = c.size || 1; sl.nUnits = c.nUnits || 1; sl.counts = c.counts || {}; sl.off = c.off || {}; } }); } catch (e) {} }
    const root = () => document.getElementById('calc-root');
    const css = { in: 'width:100%; padding:10px; min-height:44px; background:#0f141b; border:1px solid #3a4556; border-radius:8px; color:#fff; font-size:1rem;', card: 'background:#161d27; border:1px solid #2a3546; border-radius:12px; padding:14px; margin-bottom:12px;' };
    const COLORS = ['#4db8ff', '#ff9f43'];

    const statOf = (u, n) => { 
        if (u && u.models && u.models.length > 0 && n === 'InSv' ? u.models[0].invuln : u.models[0][n]) return String(n === 'InSv' ? u.models[0].invuln : u.models[0][n]).replace('+', ''); 
        const p = (u.profiles || []).find(x => x.typeName === 'Unit' || x.typeName === 'Model'); const c = p && (p.characteristics || []).find(x => x.name === n); return c ? String(c['$text'] || '').replace('+', '') : '-'; 
    };
    function weaponsOf(u) {
        if (u && u.weapons && u.weapons.length) {
            return u.weapons.map((p, i) => {
                const w = { id: p.id || i, name: p.name || 'Weapon', ok: false, A: String(p.A||'1'), S: num(p.S), AP: num(p.AP) || 0, D: String(p.D||'1'), skill: (p.skill !== undefined && p.BS === undefined && p.WS === undefined) ? p.skill : skillOf(p.BS || p.WS), kws: [], melee: p.type ? p.type === 'Melee' : Boolean(p.WS), range: p.Range || p.range, optional: !!p.optional };
                if (p.keywords) w.kws = p.keywords.map(normKw);
                w.ok = !!(dice(w.A) && dice(w.D) && w.S != null && w.AP != null);
                if (p.kws) w.kws = p.kws.map(normKw);
                if (p.melee !== undefined) w.melee = p.melee;
                if (p.range === 'Melee') w.melee = true;
                return w;
            });
        }
        return (u.profiles || []).filter(p => /Ranged Weapon|Melee Weapon/.test(p.typeName)).map((p, i) => {
            const ch = {}; (p.characteristics || []).forEach(c => ch[c.name] = c['$text']); const melee = /Melee/.test(p.typeName), k = parseKeywords(p.name);
            const w = { id: i, name: k.base, kws: k.kws, melee, A: ch.A, skill: skillOf(melee ? ch.WS : ch.BS), S: num(ch.S), AP: ch.AP, D: ch.D, range: ch.Range };
            w.ok = !!(dice(ch.A) && dice(ch.D) && w.S != null); return w;
        });
    }
    function sizeSrc(u) {   // unit.comp/options come from the points data; fall back to the closest points entry by name
        if (u.comp) return u;
        const ov = window.MFM_OVERRIDES || {}, n = (u.name || '').toLowerCase(); let best = null;
        Object.keys(ov).forEach(k => { const kl = k.toLowerCase(); if ((n.startsWith(kl) || kl.startsWith(n)) && (!best || k.length > best.length)) best = k; });
        return best ? Object.assign({ name: u.name }, ov[best]) : u;
    }
    const sizeOptions = u0 => { const u = sizeSrc(u0); const out = new Set(); [u.comp].concat((u.options || []).map(o => o.comp)).forEach(c => { const n = num(c); if (n) out.add(n); }); return out.size ? [...out].sort((a, b) => a - b) : [1]; };
    const totalModels = s => s.size * s.nUnits;
    function unitPts(s) {
        if (!s.unit) return 0; const u = sizeSrc(s.unit), base = u.basePts || u.points || 0, o = (u.options || []).find(x => num(x.comp) === s.size);
        if (o && o.pts) return o.pts;
        const first = sizeOptions(s.unit)[0] || 1; return s.size === first ? base : Math.round(base / first * s.size);
    }
    const wCount = (s, w) => s.counts[w.id] != null ? s.counts[w.id] : totalModels(s);
    const activeW = s => weaponsOf(s.unit).filter(w => w.ok && !s.off[w.id]);

    async function loadFaction(i, name) {
        const s = st.slots[i]; Object.assign(s, mkSlot(), { faction: name, loading: true }); render();
        if (name === 'CUSTOM') {
            s.loading = false;
            s.units = [{ id: 'custom', name: 'Custom Unit', weapons: [], models: [{M:'-', T:'4', Sv:'3+', W:'1', Ld:'6+', OC:'1'}], comp: [] }];
            s.msg = null; render();
            pickUnit(i, 'custom');
            return;
        }
        const f = FACTIONS.find(x => x.name === name); if (!f) { s.loading = false; render(); return; }
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent');
        try {
            await preloadFactionData(f);
            // new 39k schema uses .datasheets, .weapons
            let dss = window.FACTION_DB && window.FACTION_DB.datasheets ? window.FACTION_DB.datasheets : (STATE.currentFactionData || []);
            s.units = dss.filter(u => (u.weapons && u.weapons.length) || (u.profiles && u.profiles.some(p => /Weapon/.test(p.typeName)))).sort((a, b) => a.name.localeCompare(b.name));
            if (!s.units.length) s.msg = S('No datasheet data available for this faction yet.', 'Aún no hay datos para esta facción.');
        } catch (e) { s.msg = S('Could not load this faction (offline?): ', 'No se pudo cargar (¿sin conexión?): ') + e.message; }
        if (accent) document.documentElement.style.setProperty('--accent', accent.trim());
        s.loading = false; render();
    }
    function pickUnit(i, id) {
        const s = st.slots[i]; s.unit = s.units.find(u => String(u.id) === String(id)) || null; s.counts = {}; s.off = {};
        if (s.unit) { s.size = sizeOptions(s.unit)[0] || 1; const ws = weaponsOf(s.unit); const pick = f => ws.find(w => f(w) && w.ok && !w.optional) || ws.find(w => f(w) && w.ok); const r = pick(w => !w.melee), m = pick(w => w.melee); ws.forEach(w => { s.off[w.id] = !(w === r || w === m); }); }
        syncConditions(); render();
    }

    const f1 = n => n >= 100 ? Math.round(n) : (Math.round(n * 10) / 10).toString();
    const kv = (k, size) => f1(k);
    function resultsFor(s) {
        if (!s.unit) return null;
        const ws = activeW(s), rng = ws.filter(w => !w.melee).map(w => ({ w, count: wCount(s, w) })), mel = ws.filter(w => w.melee).map(w => ({ w, count: wCount(s, w) }));
        return st.targets.map(t => ({ t, sh: volley(rng, t, st.o), me: volley(mel, t, st.o) }));
    }
    const bar = (pct, c) => `<div style="height:6px; background:#2a3546; border-radius:3px; overflow:hidden;"><div style="height:100%; width:${Math.round(pct * 100)}%; background:${c};"></div></div>`;

    function slotCard(i) {
        const s = st.slots[i], col = COLORS[i], tag = st.compare ? `<span style="color:${col}; font-weight:800;">${i ? 'B' : 'A'}</span> ` : '';
        const fo = FACTIONS.map(f => `<option value="${esc(f.name)}" ${f.name === s.faction ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
        let h = `<div style="${css.card} ${st.compare ? 'border-top:3px solid ' + col + ';' : ''}">${tag}<label style="color:#9aa7b8; font-size:0.75rem;">${S('Faction', 'Facción')}</label>
            <div style="display:flex; gap:8px;">
                <select onchange="CALCUI.faction(${i}, this.value)" style="${css.in}; flex:1;">
                    <option value="">${s.faction === 'CUSTOM' ? S('— Custom Profile —', '— Perfil Personalizado —') : '—'}</option>
                    ${fo}
                </select>
                <button onclick="CALCUI.faction(${i}, 'CUSTOM')" style="background:#2a3546; color:#fff; border:1px solid #3a4556; border-radius:8px; padding:0 14px; cursor:pointer; font-size:0.9rem; white-space:nowrap;">
                    <i class="fa-solid fa-gear"></i> ${S('Custom', 'Personalizado')}
                </button>
            </div>
            ${s.loading ? `<div style="color:#9aa7b8; margin-top:10px;"><i class="fa-solid fa-spinner fa-spin"></i> ${S('Loading datasheets…', 'Cargando datasheets…')}</div>` : ''}
            ${s.msg ? `<div style="color:#ffb4b4; margin-top:8px;">${esc(s.msg)}</div>` : ''}
            ${s.units.length ? `<label style="color:#9aa7b8; font-size:0.75rem; display:block; margin-top:10px;">${S('Unit', 'Unidad')}</label><select onchange="CALCUI.unit(${i}, this.value)" style="${css.in}"><option value="">—</option>${s.units.map(u => `<option value="${esc(u.id)}" ${s.unit && s.unit.id === u.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('')}</select>` : ''}</div>`;
        if (!s.unit) return h;
        const u = s.unit, ws = weaponsOf(u), sizes = sizeOptions(u);
        h += `<div style="${css.card}"><b>${esc(u.name)}</b><div style="color:#9aa7b8; font-size:0.78rem;">T${esc(statOf(u, 'T'))} · W${esc(statOf(u, 'W'))} · Sv ${esc(statOf(u, 'Sv'))}${statOf(u, 'InSv') ? ' · ' + esc(statOf(u, 'InSv')) + ' inv' : ''}</div>
            <div style="display:flex; gap:10px; margin-top:10px;">
              <div style="flex:1;"><label style="color:#9aa7b8; font-size:0.75rem;">${S('Models per unit', 'Miniaturas por unidad')}</label><input type="number" min="1" max="60" value="${s.size}" onchange="CALCUI.size(${i}, +this.value)" style="${css.in}">${sizes.length > 1 ? `<div style="margin-top:4px;">${sizes.map(n => `<button onclick="CALCUI.size(${i}, ${n})" style="background:#2a3546; color:#fff; border:none; border-radius:6px; padding:4px 10px; margin-right:6px; cursor:pointer; min-height:32px;">${n}</button>`).join('')}</div>` : ''}</div>
              <div style="flex:1;"><label style="color:#9aa7b8; font-size:0.75rem;">${S('How many units', 'Cuántas unidades')}</label><input type="number" min="1" max="20" value="${s.nUnits}" onchange="CALCUI.units(${i}, +this.value)" style="${css.in}"></div></div>
            <div style="color:#cfd8e3; margin-top:8px; font-size:0.9rem;">${S('Total', 'Total')}: <b>${totalModels(s)} ${S('models', 'minis')}</b> · ~<b>${unitPts(s) * s.nUnits} pts</b> <span style="color:#667; font-size:0.72rem;">(${S('points estimate', 'estimación de puntos')})</span></div></div>`;
        h += `<details style="${css.card}" open><summary style="cursor:pointer; font-weight:bold;">${S('Weapons', 'Armas')}</summary> <div style="color:#667; font-size:0.72rem; margin-bottom:8px;">${S('tick what is used; the box = how many models carry it', 'marca lo usado; la casilla = cuántas minis la llevan')}</div>`;
        if (s.faction === 'CUSTOM') {
            ws.forEach((w, wi) => {
                h += `<div style="padding:10px 0; border-top:1px solid #222c3a;">
                    <div style="display:flex; gap:6px; flex-wrap:wrap; align-items:center; margin-bottom:6px;">
                        <input type="checkbox" ${s.off[w.id] ? '' : 'checked'} onchange="CALCUI.weapon(${i}, ${w.id}, this.checked)" style="width:22px; height:22px;">
                        <input value="${esc(w.name)}" placeholder="Weapon Name" onchange="CALCUI.cw(${i}, ${wi}, 'name', this.value)" style="${css.in} flex:1;">
                        <input type="number" min="0" max="200" value="${wCount(s, w)}" onchange="CALCUI.count(${i}, ${w.id}, +this.value)" aria-label="models" style="${css.in} width:70px; padding:6px;">
                        <button onclick="CALCUI.cwrm(${i}, ${wi})" style="background:#dc3545; color:#fff; border:none; border-radius:4px; padding:6px 10px; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:6px;">
                        <div><label style="color:#9aa7b8; font-size:0.65rem;">A</label><input type="text" value="${esc(w.A)}" onchange="CALCUI.cw(${i}, ${wi}, 'A', this.value)" style="${css.in} padding:4px;"></div>
                        <div><label style="color:#9aa7b8; font-size:0.65rem;">BS/WS</label><input type="text" placeholder="3+" value="${w.skill || ''}" onchange="CALCUI.cw(${i}, ${wi}, 'skill', this.value)" style="${css.in} padding:4px;"></div>
                        <div><label style="color:#9aa7b8; font-size:0.65rem;">S</label><input type="text" placeholder="4" value="${w.S}" onchange="CALCUI.cw(${i}, ${wi}, 'S', this.value)" style="${css.in} padding:4px;"></div>
                        <div><label style="color:#9aa7b8; font-size:0.65rem;">AP</label><input type="text" placeholder="-1" value="${w.AP}" onchange="CALCUI.cw(${i}, ${wi}, 'AP', this.value)" style="${css.in} padding:4px;"></div>
                        <div><label style="color:#9aa7b8; font-size:0.65rem;">D</label><input type="text" placeholder="1" value="${esc(w.D)}" onchange="CALCUI.cw(${i}, ${wi}, 'D', this.value)" style="${css.in} padding:4px;"></div>
                    </div>
                    ${tagPanel(i, wi, w)}
                </div>`;
            });
            h += `<button onclick="CALCUI.cwadd(${i})" style="margin-top:10px; background:#2a3546; color:#fff; border:none; border-radius:8px; padding:8px 12px; cursor:pointer; width:100%;"><i class="fa-solid fa-plus"></i> ${S('Add Custom Weapon', 'Añadir arma')}</button>`;
        } else {
            h += ws.map(w => `<div style="display:flex; align-items:center; flex-wrap:wrap; gap:8px; padding:10px 0; border-top:1px solid #222c3a; ${w.ok ? '' : 'opacity:.45;'}">
                <input type="checkbox" ${s.off[w.id] || !w.ok ? '' : 'checked'} ${w.ok ? '' : 'disabled'} onchange="CALCUI.weapon(${i}, ${w.id}, this.checked)" style="width:22px; height:22px;">
                <div style="flex:1 1 150px; min-width:0;"><div style="font-weight:bold; font-size:0.9rem;">${w.melee ? '⚔' : '🎯'} ${esc(w.name)}</div><div style="color:#9aa7b8; font-size:0.72rem;">A${esc(w.A)} · ${w.skill == null ? 'auto' : w.skill + '+'} · S${esc(w.S)} · AP${esc(w.AP)} · D${esc(w.D)}${w.kws.length ? ' · ' + esc(w.kws.join(', ')) : ''}${w.ok ? '' : ' · ' + S('variable stats (skipped)', 'valores variables (omitida)')}</div></div>
                <input type="number" min="0" max="200" value="${wCount(s, w)}" onchange="CALCUI.count(${i}, ${w.id}, +this.value)" aria-label="models" style="${css.in} width:70px; padding:6px;"></div>`).join('');
        }
        h += `</details>`;
        return h;
    }

    function render() {
        const el = root(); if (!el) return;
        saveState();
        const tg = (k, label, on) => `<label style="display:flex; align-items:center; gap:6px; margin:4px 12px 4px 0; font-size:0.85rem;"><input type="checkbox" ${on ? 'checked' : ''} onchange="CALCUI.opt('${k}', this.checked)" style="width:20px; height:20px;"> ${label}</label>`;
        const sel = (k, v) => `<select onchange="CALCUI.opt('${k}', this.value)" style="${css.in} padding:6px; min-height:40px;"><option value="none" ${v === 'none' ? 'selected' : ''}>${S('no re-roll', 'sin repetir')}</option><option value="ones" ${v === 'ones' ? 'selected' : ''}>${S('re-roll 1s', 'repetir 1s')}</option><option value="all" ${v === 'all' ? 'selected' : ''}>${S('re-roll all', 'repetir todo')}</option></select>`;
        let h = `<h2 style="text-align:center; font-size:1.8rem; margin:0 0 4px;"><i class="fa-solid fa-calculator" style="color:var(--accent)"></i> ${S('UNIT CALCULATOR', 'CALCULADORA DE UNIDAD')}</h2>
            <div style="text-align:center; color:#888; font-size:0.85rem; margin-bottom:10px;">${S('Average damage and models removed by your unit against reference targets.', 'Daño promedio y miniaturas retiradas por tu unidad contra objetivos de referencia.')}</div>
            <label style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:12px; font-weight:bold;"><input type="checkbox" ${st.compare ? 'checked' : ''} onchange="CALCUI.compare(this.checked)" style="width:22px; height:22px;"> ${S('Compare two units side by side', 'Comparar dos unidades')}</label>`;
        h += slotCard(0); if (st.compare) h += slotCard(1);
        const any = st.slots.some(s => s.unit);
        if (any) {
            h += `<details style="${css.card}" open><summary style="cursor:pointer; font-weight:bold;">${S('Conditions & Modifiers', 'Condiciones y Modificadores')}</summary><div style="color:#667; font-size:0.72rem; margin-bottom:6px;">${S('(apply to both units)', '(para ambas unidades)')}${(AUTO.halfRange || AUTO.stationary) ? ' · ✨ ' + S('switched on because a selected weapon has Rapid Fire / Melta / Heavy — untick if not true', 'activado porque un arma seleccionada tiene Rapid Fire / Melta / Heavy — desmarca si no aplica') : ''}</div><div style="display:flex; flex-wrap:wrap; margin-top:6px;">${tg('halfRange', S('Half range (Rapid Fire / Melta)', 'Media distancia (Rapid Fire / Melta)') + (AUTO.halfRange ? ' ✨' : ''), st.o.halfRange)}${tg('stationary', S('Stationary (Heavy)', 'Inmóvil (Heavy)') + (AUTO.stationary ? ' ✨' : ''), st.o.stationary)}${tg('charged', S('Charged (Lance)', 'Cargó (Lance)'), st.o.charged)}${tg('cover', S('Target in cover', 'Objetivo en cobertura'), st.o.cover)}${tg('hit1', S('+1 to hit', '+1 para impactar'), st.o.hitMod === 1)}</div>
                <div style="display:flex; gap:10px; margin-top:6px;"><div style="flex:1;"><label style="color:#9aa7b8; font-size:0.72rem;">${S('Hit rolls', 'Impactos')}</label>${sel('rrHit', st.o.rrHit)}</div><div style="flex:1;"><label style="color:#9aa7b8; font-size:0.72rem;">${S('Wound rolls', 'Heridas')}</label>${sel('rrWound', st.o.rrWound)}</div></div></details>`;
            const R = st.slots.map((s, i) => (st.compare || i === 0) ? resultsFor(s) : null);
            h += `<div style="color:#9aa7b8; font-size:0.75rem; font-weight:bold; letter-spacing:2px; margin:14px 0 8px;">${S('RESULTS — one activation, average', 'RESULTADOS — una activación, promedio')}</div>`;
            st.targets.forEach((t, ti) => {
                h += `<div style="${css.card}"><div style="display:flex; justify-content:space-between; gap:8px;"><b>${esc(t.name)}</b><span style="color:#9aa7b8; font-size:0.78rem;">T${t.T} · ${t.W}W · ${t.Sv}+${t.Inv ? ' / ' + t.Inv + '++' : ''}${t.Fnp ? ' · ' + t.Fnp + '+++' : ''} · ×${t.size}</span></div>`;
                const rows = R.map((r, i) => r ? { i, r: r[ti] } : null).filter(Boolean);
                const bestSh = Math.max(...rows.map(x => x.r.sh.kills)), bestMe = Math.max(...rows.map(x => x.r.me.kills));
                rows.forEach(({ i, r }) => {
                    const lab = st.compare ? `<div style="color:${COLORS[i]}; font-weight:800; font-size:0.8rem; margin-top:8px;">${i ? 'B' : 'A'} · ${esc(st.slots[i].unit ? st.slots[i].unit.name : '—')}</div>` : '';
                    const win = (v, b) => st.compare && rows.length > 1 && v >= b && v > 0 ? ' ✓' : '';
                    h += `${lab}<div style="display:flex; gap:12px; margin-top:6px;">
                      <div style="flex:1;"><div style="color:#9aa7b8; font-size:0.7rem;">🎯 ${S('SHOOTING', 'DISPARO')}</div><div style="font-size:1.25rem; font-weight:800;">${kv(r.sh.kills, t.size)}<span style="color:#5be59a;">${win(r.sh.kills, bestSh)}</span> <span style="font-size:0.75rem; color:#9aa7b8; font-weight:normal;">${S('models', 'minis')} · ${f1(r.sh.dmg)} ${S('dmg', 'daño')}</span></div><div style="font-size:0.65rem; color:#8c99b0; margin-top:-2px; margin-bottom:2px;">${r.sh.mathStr}</div>${r.sh.detail ? `<div style="font-size:0.62rem; color:#667; margin-bottom:4px;">${r.sh.detail}</div>` : ''}${bar(r.sh.pct, COLORS[i])}</div>
                      <div style="flex:1;"><div style="color:#9aa7b8; font-size:0.7rem;">⚔ ${S('MELEE', 'CUERPO A CUERPO')}</div><div style="font-size:1.25rem; font-weight:800;">${kv(r.me.kills, t.size)}<span style="color:#5be59a;">${win(r.me.kills, bestMe)}</span> <span style="font-size:0.75rem; color:#9aa7b8; font-weight:normal;">${S('models', 'minis')} · ${f1(r.me.dmg)} ${S('dmg', 'daño')}</span></div><div style="font-size:0.65rem; color:#8c99b0; margin-top:-2px; margin-bottom:2px;">${r.me.mathStr}</div>${r.me.detail ? `<div style="font-size:0.62rem; color:#667; margin-bottom:4px;">${r.me.detail}</div>` : ''}${bar(r.me.pct, COLORS[i])}</div></div>`;
                });
                h += `<div style="color:#667; font-size:0.7rem; margin-top:6px;">${S('Bars = share of a', 'Barras = parte de una')} ${t.size}-${S('model target unit removed', 'unidad objetivo eliminada')}</div></div>`;
            });
            h += `<details style="${css.card}" open><summary style="cursor:pointer; font-weight:bold; color:#5be59a;">⚙️ ${S('Edit target profiles (Enter Custom Enemy here)', 'Editar objetivos')}</summary>${st.targets.map((t, i) => `<div style="border-top:1px solid #222c3a; padding:10px 0;"><input value="${esc(t.name)}" onchange="CALCUI.tgt(${i},'name',this.value)" style="${css.in} margin-bottom:6px;">
                <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px;">${[['T', 'T'], ['W', 'W'], ['Sv', 'Sv'], ['Inv', 'Inv'], ['Fnp', 'FNP'], ['size', S('Models', 'Minis')]].map(([k, l]) => `<div><label style="color:#9aa7b8; font-size:0.68rem;">${l}</label><input type="number" min="0" value="${t[k]}" onchange="CALCUI.tgt(${i},'${k}',+this.value)" style="${css.in} padding:6px;"></div>`).join('')}</div>
                <div style="color:#667; font-size:0.7rem; margin-top:4px;">Sv/Inv/FNP: ${S('enter the number, e.g. 3 for 3+ (0 = none)', 'escribe el número, ej. 3 para 3+ (0 = ninguno)')} · ${S('keywords', 'palabras clave')}: ${esc(t.kw.join(', '))}</div></div>`).join('')}
                <button onclick="CALCUI.reset()" style="margin-top:8px; background:#2a3546; color:#fff; border:none; border-radius:8px; padding:10px 14px; cursor:pointer; min-height:44px;">${S('Reset to defaults', 'Restablecer')}</button></details>
                <div style="color:#667; font-size:0.72rem; padding:0 4px 20px;">${S('Estimator only: averages, no overkill spill-over between models, saves capped at 6+. Keyword handling: Sustained/Lethal/Devastating, Anti-X, Twin-linked, Torrent, Blast, Rapid Fire, Melta, Heavy, Lance, Ignores Cover. Check the datasheet for anything unusual.', 'Solo una estimación: promedios, sin sobrante de daño entre miniaturas. Palabras clave: Sustained/Lethal/Devastating, Anti-X, Twin-linked, Torrent, Blast, Rapid Fire, Melta, Heavy, Lance, Ignores Cover. Revisa la datasheet en casos raros.')}</div>`;
        }
        el.innerHTML = h;
        el.querySelectorAll('input[type=text],input[type=number]').forEach(i => i.addEventListener('focus', () => { try { i.select(); } catch (e) {} }));   // tap a field and type to replace its value
    }
    const refreshW = w => { w.ok = Boolean(dice(w.A) && dice(w.D) && w.S != null && w.AP != null); };
    window.CALCUI = {
        faction: (i, n) => n && loadFaction(i, n), unit: pickUnit, compare: on => { st.compare = on; syncConditions(); render(); },
        size: (i, n) => { const s = st.slots[i]; s.size = clamp(n || 1, 1, 60); s.counts = {}; render(); }, units: (i, n) => { const s = st.slots[i]; s.nUnits = clamp(n || 1, 1, 20); s.counts = {}; render(); },
        weapon: (i, id, on) => { st.slots[i].off[id] = !on; syncConditions(); render(); }, count: (i, id, n) => { st.slots[i].counts[id] = Math.max(0, n || 0); render(); },
        opt: (k, v) => { if (k === 'hit1') st.o.hitMod = v ? 1 : 0; else { st.o[k] = v; if (!v && k in AUTO) AUTO[k] = false; } render(); },
        tgt: (i, k, v) => { st.targets[i][k] = v; render(); }, reset: () => { st.targets = PRESETS.map(p => ({ ...p })); render(); },
        tag: (i, wi, name, on, d) => { const w = st.slots[i].unit.weapons[wi]; w.kws = w.kws.filter(k => !tagKey(name).test(k)); if (on) w.kws.push(d != null ? `${name} ${d}` : name); if (name === 'MELEE') w.melee = !!on; refreshW(w); syncConditions(); render(); },
        tagn: (i, wi, name, v) => { const w = st.slots[i].unit.weapons[wi]; const n = Math.max(1, Math.min(12, Math.round(+v) || 1)); w.kws = w.kws.filter(k => !tagKey(name).test(k)); w.kws.push(`${name} ${n}`); render(); },
        anti: (i, wi, on) => { const w = st.slots[i].unit.weapons[wi]; w.kws = w.kws.filter(k => !/^ANTI-/.test(k)); if (on) w.kws.push('ANTI-INFANTRY 4+'); render(); },
        antiSet: (i, wi, kw, x) => { const w = st.slots[i].unit.weapons[wi]; const cur = w.kws.find(k => /^ANTI-/.test(k)), m = cur && cur.match(/^ANTI-([A-Z ]+?)\s*(\d)\+$/); const k2 = kw || (m ? m[1].trim() : 'INFANTRY'), x2 = x || (m ? m[2] : '4'); w.kws = w.kws.filter(k => !/^ANTI-/.test(k)); w.kws.push(`ANTI-${k2} ${x2}+`); render(); },
        cwadd: (i) => { const s = st.slots[i]; const id = Date.now(); s.unit.weapons.push({ id, name: 'Custom Weapon', A: '1', skill: 3, S: 4, AP: 0, D: '1', kws: [], melee: false }); render(); },
        cwrm: (i, wi) => { st.slots[i].unit.weapons.splice(wi, 1); render(); },
        cw: (i, wi, k, v) => { 
            const w = st.slots[i].unit.weapons[wi]; 
            if (k === 'kws') { w.kws = String(v).split(/[,;\n]/).map(normKw).filter(Boolean); w.melee = w.kws.includes('MELEE'); }
            else if (k === 'skill') { w.skill = skillOf(v) || num(v); }
            else if (k === 'S' || k === 'AP') { w[k] = num(v) || 0; }
            else { w[k] = v; }
            w.ok = Boolean(dice(w.A) && dice(w.D) && w.S != null && w.AP != null);
            syncConditions(); render(); 
        }
    };
    loadState();
    const base = window.switchView;
    window.switchView = function (v, push) { base(v, push); if (v === 'calc') render(); };
})();
