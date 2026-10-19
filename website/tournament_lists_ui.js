/* Tournament Winning Lists UI & Roster Importer (2026 Meta) */
(function () {
    const lang = () => { try { return localStorage.getItem('gdm_lang') === 'es' ? 'es' : 'en'; } catch (e) { return 'en'; } };
    const S = (en, es) => lang() === 'es' ? es : en;
    const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    let currentFactionFilter = 'All';
    let currentSearchTerm = '';
    let isLoadingLists = false;

    async function ensureListsLoaded() {
        if (window.TOURNAMENT_LISTS && window.TOURNAMENT_LISTS.length) return window.TOURNAMENT_LISTS;
        if (isLoadingLists) return [];
        isLoadingLists = true;
        try {
            const res = await fetch('data/tournament_lists.json' + (window.BL_DATA_V ? '?v=' + window.BL_DATA_V : ''));
            if (res.ok) {
                window.TOURNAMENT_LISTS = await res.json();
            }
        } catch (e) {
            console.warn('Could not load data/tournament_lists.json:', e);
        } finally {
            isLoadingLists = false;
        }
        return window.TOURNAMENT_LISTS || [];
    }

    window.openTournamentLists = async function (faction) {
        if (faction && typeof faction === 'string') {
            currentFactionFilter = faction;
        }
        if (typeof window.switchView === 'function') {
            window.switchView('tournament-lists');
        }
        render();
        if (!window.TOURNAMENT_LISTS || !window.TOURNAMENT_LISTS.length) {
            await ensureListsLoaded();
            render();
        }
    };

    window.tlSetFaction = function (fac) {
        currentFactionFilter = fac || 'All';
        render();
    };

    window.tlOnSearch = function (term) {
        currentSearchTerm = (term || '').trim().toLowerCase();
        renderListCardsOnly();
    };

    window.copyTournamentListRaw = function (id) {
        const lists = window.TOURNAMENT_LISTS || [];
        const item = lists.find(l => l.id === id);
        if (!item || !item.rawText) return;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(item.rawText).then(() => {
                if (window.toast) window.toast(S('Tournament list copied to clipboard!', '¡Lista de torneo copiada al portapapeles!'));
                else alert(S('Copied to clipboard!', '¡Copiado al portapapeles!'));
            }).catch(() => {
                fallbackCopy(item.rawText);
            });
        } else {
            fallbackCopy(item.rawText);
        }
    };

    function fallbackCopy(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            if (window.toast) window.toast(S('List copied!', '¡Lista copiada!'));
        } catch (e) {}
        document.body.removeChild(ta);
    }

    window.cloneTournamentListToRoster = async function (id) {
        const lists = window.TOURNAMENT_LISTS || [];
        const item = lists.find(l => l.id === id);
        if (!item) {
            alert(S('Tournament list not found.', 'Lista no encontrada.'));
            return;
        }

        if (window.toast) window.toast(S('Importing tournament list into Roster Builder...', 'Importando lista al creador de ejércitos...'));

        // Match faction in FACTIONS
        const facName = item.faction;
        const factionObj = (typeof FACTIONS !== 'undefined' ? FACTIONS : []).find(f => 
            f.name.toLowerCase() === facName.toLowerCase() ||
            (f.name === 'Space Marines' && facName.includes('Space Marines')) ||
            (f.name === 'Agents of the Imperium' && (facName.includes('Agents') || facName.includes('Imperial Agents')))
        ) || (typeof FACTIONS !== 'undefined' ? FACTIONS[0] : { name: facName });

        // Ensure faction data is preloaded
        if (typeof preloadFactionData === 'function') {
            try {
                await preloadFactionData(factionObj);
            } catch (e) {
                console.warn('Faction preload failed:', e);
            }
        }

        const datasheets = (STATE && STATE.currentFactionData && STATE.currentFactionData.datasheets) ? STATE.currentFactionData.datasheets : [];
        const detachments = (STATE && STATE.currentFactionData && STATE.currentFactionData.detachments) ? STATE.currentFactionData.detachments : [];

        // Match detachment
        const matchedDetIds = [];
        if (item.detachment && detachments.length) {
            const rawDets = item.detachment.split(/[|,/]/).map(d => d.trim().toLowerCase());
            for (const d of detachments) {
                if (rawDets.some(rd => d.name.toLowerCase().includes(rd) || rd.includes(d.name.toLowerCase()))) {
                    matchedDetIds.push(d.id);
                }
            }
        }

        const newRoster = {
            id: Date.now().toString(),
            name: `${item.player} — ${item.placing || 'GT'}`,
            pointsLimit: item.points || 2000,
            faction: factionObj,
            detachments: matchedDetIds,
            units: [],
            ds: {}
        };

        // Match units
        for (const u of (item.units || [])) {
            const cleanName = u.name.trim().toLowerCase();
            const ds = datasheets.find(d => {
                const dn = d.name.toLowerCase();
                return dn === cleanName || dn.includes(cleanName) || cleanName.includes(dn);
            });

            const unitId = ds ? ds.id : 'ds_' + Math.random().toString(36).slice(2, 9);
            const unitName = ds ? ds.name : u.name;
            const pts = u.points || (ds ? ds.points : 100);

            let enhObj = null;
            if (u.enhancement && detachments.length) {
                for (const det of detachments) {
                    if (det.enhancements) {
                        const matchedEnh = det.enhancements.find(e => 
                            e.name.toLowerCase().includes(u.enhancement.toLowerCase()) || 
                            u.enhancement.toLowerCase().includes(e.name.toLowerCase())
                        );
                        if (matchedEnh) {
                            enhObj = {
                                id: matchedEnh.id,
                                name: matchedEnh.name,
                                cost: matchedEnh.cost || 0,
                                detId: det.id,
                                desc: matchedEnh.description || ''
                            };
                            break;
                        }
                    }
                }
                if (!enhObj && u.enhancement) {
                    enhObj = { name: u.enhancement, cost: 0, desc: '' };
                }
            }

            const rosterUnit = {
                id: unitId,
                name: unitName,
                pts: pts,
                sizeIdx: 0,
                role: ds ? ds.role : (u.section || 'OTHER'),
                w: 0,
                expanded: false,
                warlord: !!u.warlord,
                enh: enhObj,
                customLoadout: u.wargearTally || null
            };

            newRoster.units.push(rosterUnit);

            if (ds && typeof rosterSnap === 'function') {
                try {
                    newRoster.ds[unitId] = rosterSnap(ds);
                } catch (e) {}
            }
        }

        if (typeof STATE !== 'undefined' && STATE.rosters) {
            STATE.rosters.push(newRoster);
            if (typeof saveRosters === 'function') saveRosters();
            if (typeof openRosterBuilder === 'function') {
                openRosterBuilder(newRoster);
            }
        }

        if (window.toast) {
            window.toast(S(`🏆 ${item.player}'s list cloned into Roster Builder!`, `¡Lista de ${item.player} clonada en el Creador de Ejércitos!`));
        }
    };

    function getFilteredLists() {
        const all = window.TOURNAMENT_LISTS || [];
        return all.filter(l => {
            if (currentFactionFilter !== 'All' && l.faction !== currentFactionFilter) {
                return false;
            }
            if (!currentSearchTerm) return true;
            const term = currentSearchTerm;
            if (l.player && l.player.toLowerCase().includes(term)) return true;
            if (l.event && l.event.toLowerCase().includes(term)) return true;
            if (l.faction && l.faction.toLowerCase().includes(term)) return true;
            if (l.detachment && l.detachment.toLowerCase().includes(term)) return true;
            if (l.units && l.units.some(u => {
                if (u.name.toLowerCase().includes(term)) return true;
                if (u.enhancement && u.enhancement.toLowerCase().includes(term)) return true;
                if (u.wargearTally && Object.keys(u.wargearTally).some(w => w.toLowerCase().includes(term))) return true;
                return false;
            })) return true;
            return false;
        });
    }

    function render() {
        const root = document.getElementById('tournament-lists-root');
        if (!root) return;

        const all = window.TOURNAMENT_LISTS || [];
        const factions = [...new Set(all.map(l => l.faction))].sort();

        let html = `
            <div class="tl-container">
                <div class="tl-header">
                    <button class="tl-back-btn" onclick="switchView('home')">
                        <i class="fa-solid fa-arrow-left"></i> <span>${S('Home', 'Inicio')}</span>
                    </button>
                    <div class="tl-title-wrap">
                        <h1 class="tl-main-title"><i class="fa-solid fa-trophy" style="color:#e5c15a;"></i> ${S('Tournament Winning Lists', 'Listas Ganadoras de Torneo')}</h1>
                        <p class="tl-subtitle">${S('Top-performing 2,000 pt lists from 2026 Grand Tournaments with full loadouts and 1-click import.', 'Listas de 2.000 pts destacadas de Grandes Torneos 2026 con equipamiento completo e importación directa.')}</p>
                    </div>
                </div>

                <div class="tl-toolbar bl-card">
                    <div class="tl-filter-group">
                        <label for="tl-fac-sel"><i class="fa-solid fa-shield-halved"></i> ${S('Faction:', 'Facción:')}</label>
                        <select id="tl-fac-sel" class="bl-input tl-select" onchange="tlSetFaction(this.value)">
                            <option value="All"${currentFactionFilter === 'All' ? ' selected' : ''}>${S('All Factions', 'Todas las facciones')} (${all.length} ${S('lists', 'listas')})</option>
                            ${factions.map(f => {
                                const count = all.filter(x => x.faction === f).length;
                                return `<option value="${esc(f)}"${currentFactionFilter === f ? ' selected' : ''}>${esc(f)} (${count})</option>`;
                            }).join('')}
                        </select>
                    </div>

                    <div class="tl-search-group">
                        <i class="fa-solid fa-magnifying-glass tl-search-icon"></i>
                        <input type="text" id="tl-search-input" class="bl-input tl-input" 
                               placeholder="${S('Search player, tournament, unit, or weapon...', 'Buscar jugador, torneo, unidad o arma...')}" 
                               value="${esc(currentSearchTerm)}" 
                               oninput="tlOnSearch(this.value)">
                        ${currentSearchTerm ? `<button class="tl-search-clear" onclick="tlOnSearch(''); document.getElementById('tl-search-input').value='';"><i class="fa-solid fa-xmark"></i></button>` : ''}
                    </div>
                </div>

                <div id="tl-cards-container">
                    ${renderCardsHtml()}
                </div>
            </div>
        `;

        root.innerHTML = html;
    }

    function renderListCardsOnly() {
        const container = document.getElementById('tl-cards-container');
        if (container) {
            container.innerHTML = renderCardsHtml();
        }
    }

    function renderCardsHtml() {
        if (isLoadingLists && (!window.TOURNAMENT_LISTS || !window.TOURNAMENT_LISTS.length)) {
            return `
                <div class="tl-empty-state bl-card" style="padding: 50px 20px;">
                    <i class="fa-solid fa-trophy fa-bounce" style="font-size:2.5rem; color:#e5c15a; margin-bottom:14px;"></i>
                    <h3 style="margin:0 0 6px 0; color:#fff;">${S('Loading tournament lists...', 'Cargando listas de torneos...')}</h3>
                    <p style="margin:0; color:#94a1b8; font-size:0.85rem;">${S('Retrieving 140 top-cut tournament lists from 2026 Grand Tournaments...', 'Cargando 140 listas destacadas de Grandes Torneos 2026...')}</p>
                </div>
            `;
        }
        const filtered = getFilteredLists();
        if (!filtered.length) {
            return `
                <div class="tl-empty-state bl-card">
                    <i class="fa-solid fa-filter-circle-xmark" style="font-size:2.5rem; color:#94a1b8; margin-bottom:12px;"></i>
                    <h3 style="margin:0 0 6px 0; color:#fff;">${S('No tournament lists found', 'No se encontraron listas de torneo')}</h3>
                    <p style="margin:0; color:#94a1b8; font-size:0.85rem;">${S('Try selecting a different faction or clearing your search filter.', 'Intenta seleccionar otra facción o borrar tu búsqueda.')}</p>
                </div>
            `;
        }

        return `
            <div class="tl-meta-status">
                <span>${S('Showing', 'Mostrando')} <b>${filtered.length}</b> ${S('tournament lists', 'listas de torneo')}</span>
                ${currentFactionFilter !== 'All' ? `<span class="tl-filter-tag">${esc(currentFactionFilter)} <i class="fa-solid fa-xmark" onclick="tlSetFaction('All')"></i></span>` : ''}
            </div>
            <div class="tl-grid">
                ${filtered.map(l => renderSingleListCard(l)).join('')}
            </div>
        `;
    }

    function renderSingleListCard(l) {
        const isFirst = l.placing && l.placing.includes('1st');
        const badgeClass = isFirst ? 'tl-badge-gold' : 'tl-badge-sub';
        const trophyIcon = isFirst ? 'fa-trophy' : 'fa-award';

        return `
            <div class="tl-card bl-card" id="${esc(l.id)}">
                <div class="tl-card-header">
                    <div class="tl-card-headline">
                        <div class="tl-placing-badge ${badgeClass}">
                            <i class="fa-solid ${trophyIcon}"></i>
                            <span>${esc(l.placing || l.record)}</span>
                        </div>
                        <div class="tl-pts-pill">
                            <i class="fa-solid fa-calculator"></i> ${esc(l.points || 2000)} pts
                        </div>
                    </div>

                    <div class="tl-player-info">
                        <h2 class="tl-player-name">${esc(l.player)}</h2>
                        <div class="tl-event-meta">
                            <span class="tl-event-title"><i class="fa-solid fa-calendar-check" style="color:var(--accent);"></i> ${esc(l.event)}</span>
                            <span class="tl-event-date">${esc(l.date)}</span>
                        </div>
                    </div>

                    <div class="tl-faction-row">
                        <span class="tl-faction-chip"><i class="fa-solid fa-shield-halved"></i> ${esc(l.faction)}</span>
                        ${l.detachment ? `<span class="tl-detachment-chip"><i class="fa-solid fa-crosshairs"></i> ${esc(l.detachment)}</span>` : ''}
                    </div>

                    <div class="tl-card-actions">
                        <button class="bl-primary tl-act-btn tl-btn-import" onclick="cloneTournamentListToRoster('${esc(l.id)}')">
                            <i class="fa-solid fa-folder-plus"></i>
                            <span>${S('Import to Roster Builder', 'Importar a Creador de Ejércitos')}</span>
                        </button>
                        <button class="bl-secondary tl-act-btn tl-btn-copy" onclick="copyTournamentListRaw('${esc(l.id)}')">
                            <i class="fa-solid fa-copy"></i>
                            <span>${S('Copy Raw List', 'Copiar Lista')}</span>
                        </button>
                    </div>
                </div>

                <div class="tl-units-breakdown">
                    <div class="tl-breakdown-title">
                        <span><i class="fa-solid fa-list-ol"></i> ${S('Army Roster Breakdown', 'Desglose del Ejército')} (${l.units ? l.units.length : 0} ${S('units', 'unidades')})</span>
                    </div>

                    <div class="tl-unit-list">
                        ${(l.units || []).map(u => renderUnitRow(u)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function renderUnitRow(u) {
        const gearKeys = u.wargearTally ? Object.keys(u.wargearTally) : [];
        const hasGear = gearKeys.length > 0;
        const count = u.modelCount || 1;

        return `
            <div class="tl-unit-item bl-inner">
                <div class="tl-unit-main-row">
                    <div class="tl-unit-count-chip">${count}x</div>
                    <div class="tl-unit-name-wrap">
                        <span class="tl-unit-name">${esc(u.name)}</span>
                        <div class="tl-unit-tags">
                            ${u.warlord ? `<span class="tl-tag-warlord"><i class="fa-solid fa-crown"></i> ${S('WARLORD', 'SEÑOR DE LA GUERRA')}</span>` : ''}
                            ${u.enhancement ? `<span class="tl-tag-enh"><i class="fa-solid fa-sparkles"></i> ${esc(u.enhancement)}</span>` : ''}
                            ${u.attachedGroup ? `<span class="tl-tag-att"><i class="fa-solid fa-link"></i> ${esc(u.attachedGroup)}</span>` : ''}
                        </div>
                    </div>
                    <div class="tl-unit-pts">${esc(u.points)} pts</div>
                </div>

                ${hasGear ? `
                    <details class="tl-wargear-details">
                        <summary class="tl-wargear-summary">
                            <span><i class="fa-solid fa-wrench"></i> ${gearKeys.length} ${S('wargear options', 'opciones de equipo')}</span>
                            <i class="fa-solid fa-chevron-down tl-chev"></i>
                        </summary>
                        <div class="tl-wargear-tray">
                            ${gearKeys.map(k => `
                                <span class="tl-gear-chip">
                                    <span class="tl-gear-count">${u.wargearTally[k]}x</span>
                                    <span class="tl-gear-name">${esc(k)}</span>
                                </span>
                            `).join('')}
                        </div>
                    </details>
                ` : ''}
            </div>
        `;
    }

    // Register switchView hook
    const base = window.switchView;
    if (base) {
        window.switchView = function (v, p) {
            const r = base.apply(this, arguments);
            if (v === 'tournament-lists') {
                render();
            }
            return r;
        };
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (location.hash === '#tournament-lists') {
            openTournamentLists();
        }
    });
})();
