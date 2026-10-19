window.COLLECTION = {
    data: JSON.parse(localStorage.getItem('bl_physical_army')) || {},
    currentTab: 'owned', // 'owned' or 'wants'
    
    save: function() {
        localStorage.setItem('bl_physical_army', JSON.stringify(this.data));
    },
    
    renderHub: function() {
        const root = document.getElementById('collection-root');
        if (!root) return;
        
        const factions = Object.keys(this.data).sort();
        
        let h = `<div style="text-align:center; margin-bottom:20px;">
            <h2 style="margin:0; font-size:2rem; text-transform:uppercase;">Physical Army</h2>
            <div style="color:#9aa7b8; font-size:0.9rem;">Track your owned and wishlist models</div>
        </div>`;
        
        if (factions.length === 0) {
            h += `<div style="text-align:center; padding:40px 20px; background:#161d27; border-radius:12px; border:1px dashed #3a4556;">
                <i class="fa-solid fa-boxes-packing" style="font-size:3rem; color:#2a3546; margin-bottom:15px;"></i>
                <div style="color:#9aa7b8; margin-bottom:20px;">Your collection is empty.</div>
                <button onclick="COLLECTION.showFactionPicker()" style="background:var(--accent, #ff7a3d); color:#000; border:none; padding:12px 24px; border-radius:8px; font-weight:bold; cursor:pointer;">+ ADD FACTION</button>
            </div>`;
        } else {
            h += `<div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">`;
            factions.forEach(fName => {
                const facData = this.data[fName];
                const facObj = FACTIONS.find(x => x.name === fName) || { name: fName, color: '#333' };
                const totalOwned = facData.units.reduce((acc, u) => acc + (u.count || 0), 0);
                const totalWants = facData.units.reduce((acc, u) => acc + (u.wantCount || 0), 0);
                
                h += `<div onclick="COLLECTION.openFaction('${fName}')" style="background:#161d27; border-left:4px solid ${facObj.color}; border-radius:8px; padding:15px; cursor:pointer; display:flex; align-items:center; justify-content:space-between; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
                    <div>
                        <div style="font-weight:bold; font-size:1.1rem; text-transform:uppercase;">${facObj.name}</div>
                        <div style="color:#9aa7b8; font-size:0.8rem;">${totalOwned} Owned &middot; ${totalWants} Wishlist</div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color:#3a4556;"></i>
                </div>`;
            });
            h += `</div>
            <button onclick="COLLECTION.showFactionPicker()" style="width:100%; background:transparent; border:1px dashed #3a4556; color:#9aa7b8; padding:15px; border-radius:8px; font-weight:bold; cursor:pointer;">+ ADD ANOTHER FACTION</button>`;
        }
        
        root.innerHTML = h;
    },
    
    showFactionPicker: function() {
        const root = document.getElementById('collection-root');
        let h = `<div style="margin-bottom:20px;">
            <button onclick="COLLECTION.renderHub()" style="background:transparent; border:none; color:#9aa7b8; cursor:pointer; padding:0; font-size:1rem;"><i class="fa-solid fa-arrow-left"></i> Back</button>
            <h2 style="margin:10px 0 0; text-transform:uppercase;">Select Faction</h2>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">`;
        
        FACTIONS.forEach(f => {
            h += `<div onclick="COLLECTION.initFaction('${f.name}')" style="background-image:linear-gradient(to top, rgba(0,0,0,0.9), rgba(0,0,0,0.2)), url('${f.banner}'); background-size:cover; background-position:center; height:100px; border-radius:8px; border-bottom:3px solid ${f.color}; cursor:pointer; display:flex; align-items:flex-end; padding:10px;">
                <span style="font-weight:bold; font-size:0.9rem; text-shadow:0 2px 4px rgba(0,0,0,0.8);">${f.name}</span>
            </div>`;
        });
        
        h += `</div>`;
        root.innerHTML = h;
    },
    
    initFaction: function(fName) {
        if (!this.data[fName]) {
            this.data[fName] = { units: [] };
            this.save();
        }
        this.openFaction(fName);
    },
    
    openFaction: async function(fName) {
        const root = document.getElementById('collection-root');
        root.innerHTML = `<div style="text-align:center; padding:50px; color:#9aa7b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:2rem; margin-bottom:15px;"></i><br>Loading datasheets...</div>`;
        
        try {
            const fileName = window.BL_FILEMAP ? window.BL_FILEMAP[fName] : (fName + '.json');
            const url = 'data/factions/' + (fileName || fName + '.json');
            
            const req = await fetch(url);
            const data = await req.json();
            this.tempData = data.datasheets || [];
            
        } catch (e) {
            root.innerHTML = `<div style="color:#ff4d4d; padding:20px;">Failed to load data for ${fName}. Are you offline?</div><button onclick="COLLECTION.renderHub()">Back</button>`;
            return;
        }
        
        this.renderFactionInventory(fName);
    },
    
    setTab: function(fName, tabName) {
        this.currentTab = tabName;
        this.renderFactionInventory(fName);
    },
    
    renderFactionInventory: function(fName) {
        const root = document.getElementById('collection-root');
        const facData = this.data[fName];
        const facObj = FACTIONS.find(x => x.name === fName) || { name: fName, color: '#333' };
        
        let h = `<div style="margin-bottom:15px; display:flex; justify-content:space-between; align-items:flex-start;">
            <div>
                <button onclick="COLLECTION.renderHub()" style="background:transparent; border:none; color:#9aa7b8; cursor:pointer; padding:0; font-size:1rem; margin-bottom:10px;"><i class="fa-solid fa-arrow-left"></i> Back</button>
                <h2 style="margin:0; text-transform:uppercase; color:${facObj.color};">${facObj.name}</h2>
            </div>
            <button onclick="COLLECTION.showAddUnits('${fName}')" style="background:${facObj.color}; color:#000; border:none; padding:10px 15px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.85rem;">+ ADD UNITS</button>
        </div>`;
        
        const isWants = this.currentTab === 'wants';
        const tabOwnedBg = isWants ? 'transparent' : '#2a3546';
        const tabOwnedCol = isWants ? '#9aa7b8' : '#fff';
        const tabWantsBg = isWants ? '#2a3546' : 'transparent';
        const tabWantsCol = isWants ? '#fff' : '#9aa7b8';
        
        h += `<div style="display:flex; background:#0e1626; border-radius:8px; padding:4px; margin-bottom:15px; border:1px solid #1c2532;">
            <button onclick="COLLECTION.setTab('${fName}', 'owned')" style="flex:1; background:${tabOwnedBg}; color:${tabOwnedCol}; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.9rem;">OWNED</button>
            <button onclick="COLLECTION.setTab('${fName}', 'wants')" style="flex:1; background:${tabWantsBg}; color:${tabWantsCol}; border:none; padding:10px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:0.9rem;">WISHLIST</button>
        </div>`;
        
        const activeUnits = facData.units.filter(u => isWants ? (u.wantCount > 0) : (u.count > 0));
        
        let totalPts = 0;
        activeUnits.forEach(u => {
            const qty = isWants ? u.wantCount : u.count;
            if (this.tempData) {
                const ds = this.tempData.find(x => x.id === u.id);
                if (ds && ds.comp) {
                    const firstCost = ds.comp.find(c => c.val > 0);
                    if (firstCost) totalPts += firstCost.val * qty;
                }
            }
        });

        if (totalPts > 0) {
            h += `<div id="col-total-pts" style="background:rgba(255,122,61,0.1); border:1px solid var(--accent); color:var(--accent); padding:10px; border-radius:8px; margin-bottom:15px; text-align:center; font-weight:bold;">
                Estimated ${isWants ? 'Wishlist' : 'Collection'} Value: ~${totalPts} pts
            </div>`;
        }

        if (activeUnits.length === 0) {
            h += `<div style="text-align:center; padding:30px; background:#161d27; border-radius:8px; color:#9aa7b8;">
                You have no units in your ${isWants ? 'wishlist' : 'collection'} for this faction.
            </div>`;
        } else {
            h += `<div style="display:flex; flex-direction:column; gap:8px;">`;
            activeUnits.forEach(u => {
                const val = isWants ? u.wantCount : u.count;
                h += `<div id="col-row-${u.id}" style="background:#161d27; border:1px solid #2a3546; border-radius:8px; padding:12px 15px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-weight:bold; font-size:0.95rem; line-height:1.2; padding-right:10px;">${u.name}</div>
                    <div style="display:flex; align-items:center; gap:12px; background:#0e1626; padding:4px; border-radius:6px; border:1px solid #1c2532; flex-shrink:0;">
                        <button onclick="COLLECTION.modUnit('${fName}', '${u.id}', -1)" style="background:transparent; color:#9aa7b8; border:none; width:30px; height:30px; cursor:pointer; font-size:1rem;"><i class="fa-solid fa-minus"></i></button>
                        <span id="col-val-${u.id}" style="font-weight:bold; width:20px; text-align:center;">${val}</span>
                        <button onclick="COLLECTION.modUnit('${fName}', '${u.id}', 1)" style="background:transparent; color:#9aa7b8; border:none; width:30px; height:30px; cursor:pointer; font-size:1rem;"><i class="fa-solid fa-plus"></i></button>
                    </div>
                </div>`;
            });
            h += `</div>`;
        }
        
        root.innerHTML = h;
    },
    
    modUnit: function(fName, unitId, delta) {
        const u = this.data[fName].units.find(x => x.id === unitId);
        if (!u) return;
        
        const isWants = this.currentTab === 'wants';
        if (isWants) {
            u.wantCount = Math.max(0, (u.wantCount || 0) + delta);
        } else {
            u.count = Math.max(0, (u.count || 0) + delta);
        }
        
        if ((u.count || 0) === 0 && (u.wantCount || 0) === 0) {
            this.data[fName].units = this.data[fName].units.filter(x => x.id !== unitId);
            this.save();
            this.renderFactionInventory(fName);
            return;
        }
        
        this.save();
        
        // Direct DOM update
        const valEl = document.getElementById('col-val-' + unitId);
        if (valEl) valEl.innerText = isWants ? u.wantCount : u.count;
        
        // If it drops to 0 on the active tab, remove the row visually to match filter
        if ((isWants ? u.wantCount : u.count) === 0) {
            const row = document.getElementById('col-row-' + unitId);
            if (row) row.style.display = 'none';
        }
        
        this.updateTotalPts(fName);
    },
    
    updateTotalPts: function(fName) {
        const facData = this.data[fName];
        if (!facData) return;
        const isWants = this.currentTab === 'wants';
        const activeUnits = facData.units.filter(u => isWants ? (u.wantCount > 0) : (u.count > 0));
        let totalPts = 0;
        activeUnits.forEach(u => {
            const qty = isWants ? u.wantCount : u.count;
            if (this.tempData) {
                const ds = this.tempData.find(x => x.id === u.id);
                if (ds && ds.comp) {
                    const firstCost = ds.comp.find(c => c.val > 0);
                    if (firstCost) totalPts += firstCost.val * qty;
                }
            }
        });
        const ptsEl = document.getElementById('col-total-pts');
        if (ptsEl) ptsEl.innerText = `Estimated ${isWants ? 'Wishlist' : 'Collection'} Value: ~${totalPts} pts`;
    },
    
    showAddUnits: function(fName) {
        const root = document.getElementById('collection-root');
        
        let dss = this.tempData || [];
        dss = dss.sort((a, b) => a.name.localeCompare(b.name));
        
        const isWants = this.currentTab === 'wants';
        
        let h = `<div style="margin-bottom:15px; display:flex; align-items:center; gap:15px; position:sticky; top:0; background:var(--bg, #0b1220); padding:10px 0; z-index:10;">
            <button onclick="COLLECTION.renderFactionInventory('${fName}')" style="background:#2a3546; border:none; color:#fff; width:40px; height:40px; border-radius:8px; cursor:pointer;"><i class="fa-solid fa-arrow-left"></i></button>
            <input type="text" id="col-search" placeholder="Search units to add to ${isWants ? 'wishlist' : 'collection'}..." onkeyup="COLLECTION.filterAddUnits()" style="flex:1; background:#161d27; border:1px solid #3a4556; color:#fff; padding:10px 15px; border-radius:8px; font-size:1rem;">
        </div>
        <div id="col-add-list" style="display:flex; flex-direction:column; gap:6px;">`;
        
        dss.forEach(ds => {
            h += `<div class="col-add-item" data-name="${ds.name.toLowerCase()}" style="background:#161d27; border:1px solid #2a3546; border-radius:8px; padding:10px 15px; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:bold; font-size:0.9rem; padding-right:10px;">${ds.name}</div>
                <button onclick="COLLECTION.addUnit('${fName}', '${ds.id}', '${ds.name.replace(/'/g, "\'")}', this)" style="background:#3a4556; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:0.8rem; flex-shrink:0;">+ ADD</button>
            </div>`;
        });
        
        h += `</div>`;
        root.innerHTML = h;
    },
    
    filterAddUnits: function() {
        const q = document.getElementById('col-search').value.toLowerCase();
        document.querySelectorAll('.col-add-item').forEach(el => {
            el.style.display = el.dataset.name.includes(q) ? 'flex' : 'none';
        });
    },
    
    addUnit: function(fName, unitId, unitName, btn) {
        const facData = this.data[fName];
        let existing = facData.units.find(u => u.id === unitId);
        
        if (!existing) {
            existing = { id: unitId, name: unitName, count: 0, wantCount: 0 };
            facData.units.push(existing);
            facData.units.sort((a, b) => a.name.localeCompare(b.name));
        }
        
        if (this.currentTab === 'wants') {
            existing.wantCount++;
        } else {
            existing.count++;
        }
        
        this.save();
        
        // Flash background only, leave text untouched
        if (!btn) btn = event.currentTarget;
        const oldBg = btn.style.background;
        const oldCol = btn.style.color;
        btn.style.background = "#5be59a";
        btn.style.color = "#000";
        btn.innerHTML = `<i class="fa-solid fa-check"></i>`;
        setTimeout(() => {
            btn.style.background = oldBg || "#3a4556";
            btn.style.color = oldCol || "#fff";
            btn.innerHTML = "+ ADD";
        }, 800);
    },
    
    init: function() {
        this.renderHub();
    }
};

(function() {
    const baseSwitch = window.switchView;
    if (baseSwitch) {
        window.switchView = function(v, p) {
            baseSwitch(v, p);
            if (v === 'collection') {
                COLLECTION.init();
            }
        };
    }
})();
