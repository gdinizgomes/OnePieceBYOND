// game.js - Lógica Principal com ANTI-STUCK SPAWN, TELEPORT FIX E LOOT AUTO-CLOSE

// --- MÓDULO 1: NETWORK SYSTEM ---
const NetworkSystem = {
    commandQueue: [],
    lastPacketTime: Date.now(),
    blockSync: false,
    
    POSITION_SYNC_INTERVAL: 100,
    POSITION_EPSILON: 0.01,
    lastSentTime: 0,
    lastSentX: null, lastSentY: null, lastSentZ: null, lastSentRot: null,

    init: function() {
        setInterval(() => {
            if (this.commandQueue.length > 0 && typeof BYOND_REF !== 'undefined') {
                const cmd = this.commandQueue.shift();
                window.location.href = `byond://?src=${BYOND_REF}&${cmd}`;
            }
        }, 50);
    },

    queueCommand: function(cmdString) {
        this.commandQueue.push(cmdString);
    },

    shouldSendPosition: function(x, y, z, rot, now) {
        if (now - this.lastSentTime < this.POSITION_SYNC_INTERVAL) return false;
        if (Math.abs(x - this.lastSentX) < this.POSITION_EPSILON && 
            Math.abs(y - this.lastSentY) < this.POSITION_EPSILON && 
            Math.abs(z - this.lastSentZ) < this.POSITION_EPSILON && 
            Math.abs(rot - this.lastSentRot) < this.POSITION_EPSILON) return false;
        return true;
    },

    sendPositionUpdate: function(now, playerGroup, isRunning, isResting, isCharacterReady) { 
        if (!isCharacterReady || this.blockSync || typeof BYOND_REF === 'undefined' || !playerGroup) return; 
        
        const x = round2(playerGroup.position.x); 
        const y = round2(playerGroup.position.y); 
        const z = round2(playerGroup.position.z); 
        const rot = round2(playerGroup.rotation.y); 
        
        if (!this.shouldSendPosition(x, y, z, rot, now)) return; 
        
        this.lastSentTime = now; 
        this.lastSentX = x; this.lastSentY = y; this.lastSentZ = z; this.lastSentRot = rot; 
        
        let runFlag = (isRunning && !isResting) ? 1 : 0; 
        this.queueCommand(`action=update_pos&x=${x}&y=${y}&z=${z}&rot=${rot}&run=${runFlag}`); 
    }
};

NetworkSystem.init();

// --- MÓDULO 2: UI SYSTEM ---
const UISystem = {
    state: {
        statOpen: false, invOpen: false, shopOpen: false, skillsOpen: false, lootOpen: false,
        lethalityMode: false, killTargetRef: null, lootTargetRef: null
    },
    cache: {
        hp: -1, maxHp: -1, en: -1, maxEn: -1, gold: -1, lvl: -1, name: "", exp: -1, reqExp: -1, pts: -1,
        stats: { str: -1, agi: -1, vit: -1, dex: -1, von: -1, sor: -1, atk: -1, ratk: -1, def: -1, hit: -1, flee: -1, crit: -1, kills: -1, deaths: -1 },
        profs: { pp: -1, pp_x: -1, pk: -1, pk_x: -1, ps: -1, ps_x: -1, pg: -1, pg_x: -1 }
    },

    init: function() {
        window.toggleStats = () => this.toggleStats();
        window.toggleInventory = () => this.toggleInventory();
        window.toggleSkills = () => this.toggleSkills();
        window.toggleShop = () => this.toggleShop();
        window.switchTab = (id, el) => this.switchTab(id, el);
        window.toggleLethal = () => this.toggleLethal();
        window.askKillConfirm = (ref) => this.askKillConfirm(ref);
        window.confirmKill = (choice) => this.confirmKill(choice);
        window.robItem = (ref) => this.robItem(ref);
        window.robGold = () => this.robGold();
        window.buyItem = (path) => this.buyItem(path);
        window.sellItem = (ref) => this.sellItem(ref);
        window.trashItem = (ref) => this.trashItem(ref);
        window.equipItem = (ref) => this.equipItem(ref);
        window.unequipItem = (slot) => this.unequipItem(slot);
        window.dropItem = (ref, amt) => this.dropItem(ref, amt);
        window.addStat = (stat) => this.addStat(stat);
        window.closeLoot = () => this.closeLoot();
        
        window.openLootWindow = (json) => this.openLootWindow(json);
        window.openShop = (json) => this.openShop(json);
        window.loadInventory = (json) => this.loadInventory(json);
        window.updateStatusMenu = (json) => this.updateStatusMenu(json);
    },

    addLog: function(msg, css) { 
        const d = document.getElementById('combat-log'); 
        if(d) {
            d.innerHTML += `<span class="${css}">${msg}</span><br>`; 
            d.scrollTop=d.scrollHeight; 
        }
    },

    toggleStats: function() {
        if(this.state.shopOpen || this.state.lootOpen) return; 
        this.state.statOpen = !this.state.statOpen;
        document.getElementById('stat-window').style.display = this.state.statOpen ? 'block' : 'none';
        if(this.state.statOpen) {
            this.state.invOpen = false; document.getElementById('inventory-window').style.display = 'none';
            this.state.skillsOpen = false; document.getElementById('skills-window').style.display = 'none';
            NetworkSystem.queueCommand(`action=request_status`);
        }
    },

    toggleInventory: function() {
        if(NetworkSystem.blockSync) return;
        if(this.state.shopOpen) { this.toggleShop(); return; }
        if(this.state.lootOpen) { this.closeLoot(); return; }

        this.state.invOpen = !this.state.invOpen;
        document.getElementById('inventory-window').style.display = this.state.invOpen ? 'flex' : 'none';
        if(this.state.invOpen) {
            this.state.statOpen = false; document.getElementById('stat-window').style.display = 'none';
            this.state.skillsOpen = false; document.getElementById('skills-window').style.display = 'none';
            NetworkSystem.queueCommand(`action=request_inventory`);
        }
    },

    toggleSkills: function() {
        if(this.state.shopOpen || this.state.lootOpen) return;
        this.state.skillsOpen = !this.state.skillsOpen;
        document.getElementById('skills-window').style.display = this.state.skillsOpen ? 'flex' : 'none';
        if(this.state.skillsOpen) {
            this.state.statOpen = false; document.getElementById('stat-window').style.display = 'none';
            this.state.invOpen = false; document.getElementById('inventory-window').style.display = 'none';
        }
    },

    toggleShop: function() {
        this.state.shopOpen = !this.state.shopOpen;
        document.getElementById('shop-window').style.display = this.state.shopOpen ? 'flex' : 'none';
        this.state.invOpen = this.state.shopOpen;
        document.getElementById('inventory-window').style.display = this.state.invOpen ? 'flex' : 'none';
        if(!this.state.shopOpen) document.getElementById('shop-list').innerHTML = "";
    },

    switchTab: function(tabId, btnElement) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        btnElement.classList.add('active');
    },

    toggleLethal: function() {
        if(NetworkSystem.blockSync) return;
        NetworkSystem.blockSync = true;
        this.state.lethalityMode = !this.state.lethalityMode;
        const btn = document.getElementById('lethality-toggle');
        if(this.state.lethalityMode) {
            btn.classList.add('on');
            btn.title = "Modo Letalidade: ON (Matar jogadores)";
        } else {
            btn.classList.remove('on');
            btn.title = "Modo Letalidade: OFF (Desmaiar jogadores)";
        }
        NetworkSystem.queueCommand(`action=toggle_lethal`);
        setTimeout(() => { NetworkSystem.blockSync = false; }, 300);
    },

    askKillConfirm: function(targetRef) {
        this.state.killTargetRef = targetRef;
        document.getElementById('kill-modal').style.display = 'block';
    },

    confirmKill: function(choice) {
        document.getElementById('kill-modal').style.display = 'none';
        if(choice && this.state.killTargetRef) {
            NetworkSystem.queueCommand(`action=confirm_kill&target=${this.state.killTargetRef}`);
        }
        this.state.killTargetRef = null;
    },

    hideTooltip: function() { document.getElementById('tooltip').style.display = 'none'; },

    openLootWindow: function(json) {
        let payload; try { payload = JSON.parse(json); } catch(e) { return; }
        
        this.state.lootTargetRef = payload.target_ref;
        this.state.lootOpen = true;
        document.getElementById('loot-window').style.display = 'flex';
        document.getElementById('loot-target-name').innerText = payload.target_name;
        document.getElementById('loot-gold').innerText = payload.gold;

        this.state.statOpen = false; document.getElementById('stat-window').style.display = 'none';
        this.state.skillsOpen = false; document.getElementById('skills-window').style.display = 'none';
        this.state.shopOpen = false; document.getElementById('shop-window').style.display = 'none';

        this.hideTooltip(); 
        const grid = document.getElementById('loot-grid');
        grid.innerHTML = "";
        
        const allItems = payload.equipped.concat(payload.inventory);

        for(let i = 0; i < 16; i++) { 
            const slotDiv = document.createElement('div');
            slotDiv.className = 'inv-slot';
            if (i < allItems.length) {
                const item = allItems[i];
                
                if(item.equipped === 1) slotDiv.classList.add("equipped");

                const img = document.createElement('img');
                img.className = 'inv-icon';
                img.src = item.id + "_img.png"; 
                img.onerror = function() {
                    if(this && this.style) this.style.display = 'none';
                    if(this && this.parentElement) {
                        this.parentElement.style.backgroundColor = '#444';
                        this.parentElement.innerText = "?";
                        this.parentElement.style.display = "flex"; 
                    }
                };
                slotDiv.appendChild(img);
                
                if(item.amount > 1) {
                    const qtyDiv = document.createElement('div'); qtyDiv.className = 'inv-qty'; qtyDiv.innerText = "x" + item.amount; slotDiv.appendChild(qtyDiv);
                }
                
                slotDiv.onmousemove = (e) => {
                    const tip = document.getElementById('tooltip');
                    tip.style.display = 'block'; tip.style.left = (e.pageX + 10) + 'px'; tip.style.top = (e.pageY + 10) + 'px';
                    let eqText = item.equipped ? "<br><span style='color:#2ecc71'>(Equipado)</span>" : "";
                    tip.innerHTML = `<strong>${item.name}</strong>Clique para roubar${eqText}`;
                };
                slotDiv.onmouseout = () => { this.hideTooltip(); };
                slotDiv.onclick = () => { this.robItem(item.ref); };
                
            } else slotDiv.style.opacity = "0.3";
            grid.appendChild(slotDiv);
        }
    },

    closeLoot: function() {
        this.state.lootOpen = false;
        this.state.lootTargetRef = null;
        document.getElementById('loot-window').style.display = 'none';
        this.hideTooltip();
    },

    robItem: function(itemRef) {
        if(NetworkSystem.blockSync || !this.state.lootTargetRef) return;
        NetworkSystem.blockSync = true;
        NetworkSystem.queueCommand(`action=rob_item&target=${this.state.lootTargetRef}&ref=${itemRef}`);
        setTimeout(() => { NetworkSystem.blockSync = false; }, 300);
    },

    robGold: function() {
        if(NetworkSystem.blockSync || !this.state.lootTargetRef) return;
        NetworkSystem.blockSync = true;
        NetworkSystem.queueCommand(`action=rob_gold&target=${this.state.lootTargetRef}`);
        setTimeout(() => { NetworkSystem.blockSync = false; }, 300);
    },

    openShop: function(json) {
        if(!this.state.shopOpen) this.toggleShop();
        const list = document.getElementById('shop-list');
        list.innerHTML = "";
        let items = [];
        try { items = JSON.parse(json); } catch(e) { return; }
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item';
            div.innerHTML = `<img src="${item.id}_img.png" onerror="this.style.display='none'"><div class="shop-details"><div class="shop-name">${item.name}</div><div class="shop-price">💰 ${item.price}</div></div><button class="btn-buy" onclick="buyItem('${item.typepath}')">Comprar</button>`;
            list.appendChild(div);
        });
    },

    buyItem: function(typepath) {
        if(NetworkSystem.blockSync) return;
        NetworkSystem.blockSync = true;
        NetworkSystem.queueCommand(`action=buy_item&type=${typepath}`);
        setTimeout(() => { NetworkSystem.blockSync = false; }, 200);
    },

    sellItem: function(ref) {
        if(NetworkSystem.blockSync) return;
        if(confirm("Vender este item?")) {
            NetworkSystem.blockSync = true;
            NetworkSystem.queueCommand(`action=sell_item&ref=${ref}`);
            setTimeout(() => { NetworkSystem.blockSync = false; }, 200);
        }
    },

    trashItem: function(ref) {
        if(NetworkSystem.blockSync) return;
        if(confirm("Tem certeza? O item será DESTRUÍDO para sempre.")) {
            NetworkSystem.blockSync = true;
            NetworkSystem.queueCommand(`action=trash_item&ref=${ref}`);
            setTimeout(() => { NetworkSystem.blockSync = false; }, 200);
        }
    },

    loadInventory: function(json) {
        this.hideTooltip(); 
        const grid = document.getElementById('inv-grid');
        grid.innerHTML = "";
        let data = [];
        try { data = JSON.parse(json); } catch(e) { console.log(e); return; }
        for(let i = 0; i < 12; i++) {
            const slotDiv = document.createElement('div');
            slotDiv.className = 'inv-slot';
            if (i < data.length) {
                const item = data[i];
                const img = document.createElement('img');
                img.className = 'inv-icon';
                img.src = item.id + "_img.png"; 
                
                img.onerror = function() {
                    if(this && this.style) this.style.display = 'none';
                    if(this && this.parentElement) {
                        this.parentElement.style.backgroundColor = '#444';
                        this.parentElement.innerText = "?";
                        this.parentElement.style.display = "flex"; 
                        this.parentElement.style.justifyContent = "center"; 
                        this.parentElement.style.alignItems = "center";
                    }
                };
                
                slotDiv.appendChild(img);
                if(item.amount > 1) {
                    const qtyDiv = document.createElement('div'); qtyDiv.className = 'inv-qty'; qtyDiv.innerText = "x" + item.amount; slotDiv.appendChild(qtyDiv);
                }
                slotDiv.onmousemove = (e) => {
                    const tip = document.getElementById('tooltip');
                    tip.style.display = 'block'; tip.style.left = (e.pageX + 10) + 'px'; tip.style.top = (e.pageY + 10) + 'px';
                    let priceTxt = this.state.shopOpen ? `<br><span style='color:#2ecc71'>Venda: ${Math.round(item.price/10)}</span>` : "";
                    tip.innerHTML = `<strong>${item.name}</strong>${item.desc}<br><span style='color:#aaa'>Status: ${item.power}</span>${priceTxt}`;
                };
                slotDiv.onmouseout = () => { this.hideTooltip(); };
                const actionsDiv = document.createElement('div'); actionsDiv.className = 'inv-actions';
                if(this.state.shopOpen) actionsDiv.innerHTML += `<button class="action-btn btn-sell" style="display:block" onclick="sellItem('${item.ref}')">Vender</button>`;
                else { actionsDiv.innerHTML += `<button class="action-btn" onclick="equipItem('${item.ref}')">Equipar</button>`; actionsDiv.innerHTML += `<button class="action-btn" onclick="dropItem('${item.ref}', ${item.amount})">Largar</button>`; }
                actionsDiv.innerHTML += `<button class="action-btn btn-trash" onclick="trashItem('${item.ref}')">Lixo</button>`;
                slotDiv.appendChild(actionsDiv);
            } else slotDiv.style.opacity = "0.3";
            grid.appendChild(slotDiv);
        }
    },

    updateStatusMenu: function(json) {
        let data; try { data = JSON.parse(json); } catch(e) { return; }
        document.getElementById('stat-name').innerText = data.nick; document.getElementById('stat-class').innerText = data.class; document.getElementById('stat-title').innerText = data.title;
        if(data.lvl) document.getElementById('stat-lvl').innerText = data.lvl;
        
        const updateSlot = (slotName, itemData) => {
            const div = document.getElementById('slot-' + slotName); 
            if(!div) return; 
            div.innerHTML = "";
            if(itemData) {
                const img = document.createElement('img'); img.className = 'equip-icon'; img.src = itemData.id + "_img.png";
                img.onerror = function() { if(this && this.style) this.style.backgroundColor = '#777'; };
                div.appendChild(img); 
                div.onclick = () => { this.unequipItem(slotName); }; 
                div.title = "Desequipar " + itemData.name;
            } else {
                const label = document.createElement('label'); 
                label.innerText = slotName.charAt(0).toUpperCase() + slotName.slice(1);
                div.appendChild(label); 
                div.onclick = null; 
                div.title = "Vazio";
            }
        };
        updateSlot('hand', data.equip.hand);
        updateSlot('head', data.equip.head);
        updateSlot('body', data.equip.body);
        updateSlot('legs', data.equip.legs);
        updateSlot('feet', data.equip.feet);
    },

    equipItem: function(ref) { if(NetworkSystem.blockSync) return; this.hideTooltip(); NetworkSystem.blockSync = true; NetworkSystem.queueCommand(`action=equip_item&ref=${ref}`); setTimeout(() => { NetworkSystem.blockSync = false; }, 200); },
    unequipItem: function(slotName) { if(NetworkSystem.blockSync) return; NetworkSystem.blockSync = true; NetworkSystem.queueCommand(`action=unequip_item&slot=${slotName}`); setTimeout(() => { NetworkSystem.blockSync = false; }, 200); },
    dropItem: function(ref, maxAmount) { if(NetworkSystem.blockSync) return; this.hideTooltip(); let qty = 1; if(maxAmount > 1) { let input = prompt(`Quantos? (Máx: ${maxAmount})`, "1"); if(input===null) return; qty = parseInt(input); if(isNaN(qty) || qty <= 0) return; if(qty > maxAmount) qty = maxAmount; } NetworkSystem.blockSync = true; NetworkSystem.queueCommand(`action=drop_item&ref=${ref}&amount=${qty}`); setTimeout(() => { NetworkSystem.blockSync = false; }, 200); },
    addStat: function(statName) { if(NetworkSystem.blockSync) return; NetworkSystem.blockSync = true; NetworkSystem.queueCommand(`action=add_stat&stat=${statName}`); setTimeout(function() { NetworkSystem.blockSync = false; }, 200); },

    startSkillCooldownUI: function(skillId) {
        const skillDef = GameSkills[skillId];
        if(!skillDef) return;

        localSkillCooldowns[skillId] = Date.now() + skillDef.cooldown;
        
        const overlay = document.getElementById(`cd-${skillId}`);
        if(overlay) {
            overlay.style.transition = "none";
            overlay.style.height = "100%";
            overlay.innerText = (skillDef.cooldown / 1000).toFixed(1) + "s";
            
            let timeLeft = skillDef.cooldown;
            const interval = setInterval(() => {
                timeLeft -= 100;
                if(timeLeft <= 0) {
                    overlay.style.height = "0%";
                    overlay.innerText = "";
                    clearInterval(interval);
                } else {
                    overlay.style.height = (timeLeft / skillDef.cooldown * 100) + "%";
                    overlay.innerText = (timeLeft / 1000).toFixed(1) + "s";
                }
            }, 100);
        }
    },

    updatePersonalStatus: function(me) {
        if(me.nick && this.cache.name !== me.nick) { document.getElementById('name-display').innerText = me.nick; this.cache.name = me.nick; }
        
        const overlay = document.getElementById('faint-overlay');
        if(me.rem > 0 && me.ft) {
            overlay.style.display = 'flex';
            document.getElementById('faint-timer').innerText = me.rem;
        } else {
            overlay.style.display = 'none';
        }

        if(me.lvl !== this.cache.lvl) { document.getElementById('lvl-display').innerText = me.lvl; this.cache.lvl = me.lvl; }
        if(me.gold !== this.cache.gold) { document.getElementById('gold-display').innerText = me.gold; this.cache.gold = me.gold; }
        
        if(me.hp !== this.cache.hp || me.max_hp !== this.cache.maxHp) {
            const pct = Math.max(0, Math.min(100, (me.hp / me.max_hp) * 100));
            document.getElementById('hp-bar-fill').style.width = pct + "%";
            document.getElementById('hp-text').innerText = me.hp + "/" + me.max_hp;
            this.cache.hp = me.hp; this.cache.maxHp = me.max_hp;
        }
        if(me.en !== this.cache.en || me.max_en !== this.cache.maxEn) {
            const pct = Math.max(0, Math.min(100, (me.en / me.max_en) * 100));
            document.getElementById('en-bar-fill').style.width = pct + "%";
            document.getElementById('en-text').innerText = Math.floor(me.en) + "/" + me.max_en;
            this.cache.en = me.en; this.cache.maxEn = me.max_en;
        }
        if(me.exp !== this.cache.exp || me.req_exp !== this.cache.reqExp) {
            const xpPct = Math.max(0, Math.min(100, (me.exp / me.req_exp) * 100));
            document.getElementById('xp-bar-fill').style.width = xpPct + "%";
            this.cache.exp = me.exp; this.cache.reqExp = me.req_exp;
        }

        if(me.pts !== this.cache.pts || me.str !== this.cache.stats.str || me.atk !== this.cache.stats.atk || 
           me.pp !== this.cache.profs.pp || me.pp_x !== this.cache.profs.pp_x ||
           me.pk !== this.cache.profs.pk || me.pk_x !== this.cache.profs.pk_x ||
           me.ps !== this.cache.profs.ps || me.ps_x !== this.cache.profs.ps_x ||
           me.pg !== this.cache.profs.pg || me.pg_x !== this.cache.profs.pg_x ||
           me.kills !== this.cache.stats.kills || me.deaths !== this.cache.stats.deaths) {
            
            document.getElementById('stat-points').innerText = me.pts;
            
            document.getElementById('val-str').innerText = me.str;
            document.getElementById('val-agi').innerText = me.agi;
            document.getElementById('val-vit').innerText = me.vit;
            document.getElementById('val-dex').innerText = me.dex;
            document.getElementById('val-von').innerText = me.von;
            document.getElementById('val-sor').innerText = me.sor;

            document.getElementById('val-atk').innerText = me.atk;
            document.getElementById('val-ratk').innerText = me.ratk;
            document.getElementById('val-def').innerText = me.def;
            document.getElementById('val-hit').innerText = me.hit;
            document.getElementById('val-flee').innerText = me.flee;
            document.getElementById('val-crit').innerText = me.crit + "%";

            document.getElementById('stat-kills').innerText = me.kills;
            document.getElementById('stat-deaths').innerText = me.deaths;

            document.getElementById('prof-punch').innerText = me.pp;
            document.getElementById('bar-punch').style.width = Math.min(100, (me.pp_x / me.pp_r) * 100) + "%";
            
            document.getElementById('prof-kick').innerText = me.pk;
            document.getElementById('bar-kick').style.width = Math.min(100, (me.pk_x / me.pk_r) * 100) + "%";
            
            document.getElementById('prof-sword').innerText = me.ps;
            document.getElementById('bar-sword').style.width = Math.min(100, (me.ps_x / me.ps_r) * 100) + "%";
            
            document.getElementById('prof-gun').innerText = me.pg;
            document.getElementById('bar-gun').style.width = Math.min(100, (me.pg_x / me.pg_r) * 100) + "%";
            
            const btns = document.getElementsByClassName('stat-btn');
            for(let i = 0; i < btns.length; i++) btns[i].disabled = (me.pts <= 0);
            
            this.cache.pts = me.pts;
            this.cache.stats = { str: me.str, agi: me.agi, vit: me.vit, dex: me.dex, von: me.von, sor: me.sor, atk: me.atk, ratk: me.ratk, def: me.def, hit: me.hit, flee: me.flee, crit: me.crit, kills: me.kills, deaths: me.deaths };
            this.cache.profs = { pp: me.pp, pp_x: me.pp_x, pk: me.pk, pk_x: me.pk_x, ps: me.ps, ps_x: me.ps_x, pg: me.pg, pg_x: me.pg_x };
        }
        
        if(me.lethal !== undefined && this.state.lethalityMode !== (me.lethal === 1)) {
            this.state.lethalityMode = (me.lethal === 1);
            const btn = document.getElementById('lethality-toggle');
            if(this.state.lethalityMode) {
                btn.classList.add('on');
                btn.title = "Modo Letalidade: ON (Matar jogadores)";
            } else {
                btn.classList.remove('on');
                btn.title = "Modo Letalidade: OFF (Desmaiar jogadores)";
            }
        }
    }
};

UISystem.init();

// --- MÓDULO 3: TARGET SYSTEM ---
// Encapsula toda a lógica de seleção, alcance e interface de Alvo (Target)
const TargetSystem = {
    currentTargetID: null,
    MAX_RANGE: 25,
    SELECTION_RANGE: 20,

    cycleTarget: function() {
        if (!playerGroup) return;
        lastActionTime = Date.now(); 

        const potentialTargets = [];
        for (const id in otherPlayers) {
            const other = otherPlayers[id];
            const dist = playerGroup.position.distanceTo(other.mesh.position);
            
            if (dist <= this.SELECTION_RANGE) {
                potentialTargets.push({ id: id, dist: dist });
            }
        }

        if (potentialTargets.length === 0) {
            this.currentTargetID = null;
            return;
        }

        potentialTargets.sort((a, b) => {
            const distA = Math.round(a.dist * 10);
            const distB = Math.round(b.dist * 10);
            
            if (distA === distB) return a.id.localeCompare(b.id);
            return distA - distB;
        });

        if (!this.currentTargetID) {
            this.currentTargetID = potentialTargets[0].id;
        } else {
            const currentIndex = potentialTargets.findIndex(t => t.id === this.currentTargetID);
            if (currentIndex === -1 || currentIndex === potentialTargets.length - 1) {
                this.currentTargetID = potentialTargets[0].id;
            } else {
                this.currentTargetID = potentialTargets[currentIndex + 1].id;
            }
        }
    },

    deselectTarget: function() {
        this.currentTargetID = null;
    },

    updateUI: function() {
        const targetWin = document.getElementById('target-window');
        
        if (!this.currentTargetID || !otherPlayers[this.currentTargetID]) {
            targetWin.style.display = 'none';
            for (const id in otherPlayers) {
                if(otherPlayers[id].label) {
                    otherPlayers[id].label.style.border = "1px solid rgba(255,255,255,0.2)";
                    otherPlayers[id].label.style.zIndex = "1";
                }
            }
            return;
        }

        const target = otherPlayers[this.currentTargetID];
        const dist = playerGroup.position.distanceTo(target.mesh.position);
        
        if (dist > this.MAX_RANGE || Date.now() - lastActionTime > 15000) {
            this.deselectTarget();
            return;
        }

        targetWin.style.display = 'block';
        document.getElementById('target-name').innerText = target.name || "Desconhecido";
        
        const hp = target.currentHp || 100;
        const maxHp = target.maxHp || 100;
        const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        
        document.getElementById('target-hp-fill').style.width = pct + "%";
        document.getElementById('target-hp-text').innerText = `${Math.floor(hp)}/${maxHp}`;

        for (const id in otherPlayers) {
            if(otherPlayers[id].label) {
                if (id === this.currentTargetID) {
                    otherPlayers[id].label.style.border = "2px solid #e74c3c";
                    otherPlayers[id].label.style.zIndex = "100"; 
                } else {
                    otherPlayers[id].label.style.border = "1px solid rgba(255,255,255,0.2)";
                    otherPlayers[id].label.style.zIndex = "1";
                }
            }
        }
    }
};

// --- MÓDULO 4: COMBAT VISUAL SYSTEM ---
// Separa responsabilidades estéticas, de renderização de Dano e de Object Pooling
const CombatVisualSystem = {
    activeProjectiles: [],
    activeHitboxes: [],
    activeSkillProjectiles: [],
    hitboxPool: [],
    projectilePool: [],
    tempBoxAttacker: new THREE.Box3(),
    tempBoxTarget: new THREE.Box3(),

    getHitbox: function(size, colorHex) {
        let m;
        if (this.hitboxPool.length > 0) {
            m = this.hitboxPool.pop();
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFF0000, wireframe: true, transparent: true, opacity: 0.3 });
            m = new THREE.Mesh(geo, mat);
        }
        m.scale.set(size.x, size.y, size.z);
        m.material.color.setHex(colorHex || 0xFF0000);
        return m;
    },

    releaseHitbox: function(m) {
        Engine.scene.remove(m);
        this.hitboxPool.push(m);
    },

    getProjectile: function(colorHex, scaleArr) {
        let m;
        if (this.projectilePool.length > 0) {
            m = this.projectilePool.pop();
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            m = new THREE.Mesh(geo, mat);
        }
        m.scale.set(scaleArr[0], scaleArr[1], scaleArr[2]);
        m.material.color.setHex(colorHex);
        return m;
    },

    releaseProjectile: function(m) {
        while(m.children.length > 0){ m.remove(m.children[0]); }
        Engine.scene.remove(m);
        this.projectilePool.push(m);
    },

    spawnDamageNumber: function(targetRef, amount) {
        if(!otherPlayers[targetRef]) return;
        const mesh = otherPlayers[targetRef].mesh;
        const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2.5, mesh.position.z);
        tempV.project(Engine.camera);
        const x = (tempV.x * .5 + .5) * window.innerWidth;
        const y = (-(tempV.y * .5) + .5) * window.innerHeight;
        const div = document.createElement('div');
        div.className = 'dmg-popup';
        div.innerText = "-" + amount;
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        document.body.appendChild(div);
        setTimeout(() => { div.remove(); }, 1000);
    },

    fireProjectile: function(originMesh, projectileDef, isMine) {
        const s = projectileDef.scale || [0.1, 0.1, 0.1];
        const bullet = this.getProjectile(projectileDef.color, s);
        
        if(!originMesh) return; 
        
        const bodyRot = originMesh.rotation.y; 
        const sin = Math.sin(bodyRot); 
        const cos = Math.cos(bodyRot);
        
        bullet.position.copy(originMesh.position); 
        bullet.position.y += 1.3; 
        bullet.position.x += sin * 0.5 - cos * 0.4; 
        bullet.position.z += cos * 0.5 + sin * 0.4; 
        
        let dX = sin; let dY = 0; let dZ = cos;
        
        if (isMine && TargetSystem.currentTargetID && otherPlayers[TargetSystem.currentTargetID] && otherPlayers[TargetSystem.currentTargetID].mesh) {
            const targetMesh = otherPlayers[TargetSystem.currentTargetID].mesh;
            const targetPos = new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 0.9, targetMesh.position.z);
            const bulletPos = bullet.position.clone();
            
            const dirVec = new THREE.Vector3().subVectors(targetPos, bulletPos).normalize();
            dX = dirVec.x; dY = dirVec.y; dZ = dirVec.z;
            
            bullet.lookAt(targetPos); 
        } else {
            bullet.rotation.y = bodyRot; 
        }

        Engine.scene.add(bullet);
        
        this.activeProjectiles.push({ 
            mesh: bullet, dirX: dX, dirY: dY, dirZ: dZ, 
            speed: projectileDef.speed, distTraveled: 0, 
            maxDist: projectileDef.range || 10, isMine: isMine 
        });
    },

    spawnHitbox: function(playerMesh, size, forwardOffset, lifetime, customData, yOffset) {
        if(!playerMesh) return;
        const hitbox = this.getHitbox(size, 0xFF0000);
        hitbox.position.copy(playerMesh.position); 
        hitbox.position.y += (yOffset !== undefined ? yOffset : 1.0); 
        const bodyRot = playerMesh.rotation.y; 
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        hitbox.position.x += sin * forwardOffset; hitbox.position.z += cos * forwardOffset; hitbox.rotation.y = bodyRot;
        
        Engine.scene.add(hitbox);
        this.activeHitboxes.push({ mesh: hitbox, startTime: Date.now(), duration: lifetime, hasHit: [], data: customData || {} });
    },

    fireSkillProjectile: function(originMesh, skillId, ownerRef) {
        const def = GameSkills[skillId];
        if(!def || !originMesh) return;

        const isMine = (ownerRef === myID);

        const hitboxMesh = this.getProjectile(0x00FF00, def.hitboxSize);
        hitboxMesh.material.wireframe = true;
        hitboxMesh.material.transparent = true;
        hitboxMesh.material.opacity = 0.5; 

        if (def.visualDef && GameDefinitions[def.visualDef]) {
            const skinData = GameDefinitions[def.visualDef];
            const skinMesh = CharFactory.createFromDef(def.visualDef, skinData.visual);
            hitboxMesh.add(skinMesh); 
        }

        const bodyRot = originMesh.rotation.y;
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        
        hitboxMesh.position.copy(originMesh.position);
        hitboxMesh.position.y += 1.0; 
        hitboxMesh.position.x += sin * 1.0; 
        hitboxMesh.position.z += cos * 1.0;

        let dX = sin; let dY = 0; let dZ = cos;
        
        if (isMine && TargetSystem.currentTargetID && otherPlayers[TargetSystem.currentTargetID] && otherPlayers[TargetSystem.currentTargetID].mesh) {
            const targetMesh = otherPlayers[TargetSystem.currentTargetID].mesh;
            const targetPos = new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 0.9, targetMesh.position.z);
            const dirVec = new THREE.Vector3().subVectors(targetPos, hitboxMesh.position).normalize();
            dX = dirVec.x; dY = dirVec.y; dZ = dirVec.z;
        }

        hitboxMesh.rotation.y = Math.atan2(dX, dZ);

        Engine.scene.add(hitboxMesh);
        
        this.activeSkillProjectiles.push({
            mesh: hitboxMesh, skillId: skillId, def: def,
            ownerRef: ownerRef, isMine: isMine,
            dirX: dX, dirY: dY, dirZ: dZ,
            distTraveled: 0, hasHit: [] 
        });
    },

    checkCollisions: function(attackerBox, type, objRef) {
        for (let id in otherPlayers) {
            const target = otherPlayers[id]; 
            
            if(type === "melee" && objRef.hasHit.includes(id)) continue;
            this.tempBoxTarget.setFromObject(target.mesh);
            if (attackerBox.intersectsBox(this.tempBoxTarget)) {
                let extra = "";
                if(type === "melee" && objRef.data && objRef.data.step) extra = `&combo=${objRef.data.step}`;
                if(typeof BYOND_REF !== 'undefined') NetworkSystem.queueCommand(`action=register_hit&target_ref=${id}&hit_type=${type}${extra}`);
                
                if(type === "projectile") { 
                    this.releaseProjectile(objRef.mesh); 
                    objRef.distTraveled = 99999; 
                } else if(type === "melee") { 
                    objRef.hasHit.push(id); 
                    objRef.mesh.material.color.setHex(0xFFFFFF); 
                }
            }
        }
    },

    update: function(timeScale) { 
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i]; 
            const moveStep = p.speed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += (p.dirY || 0) * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            if (p.isMine) { this.tempBoxAttacker.setFromObject(p.mesh); this.checkCollisions(this.tempBoxAttacker, "projectile", p); }
            if (p.distTraveled >= p.maxDist) { this.releaseProjectile(p.mesh); this.activeProjectiles.splice(i, 1); }
        }

        for (let i = this.activeSkillProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeSkillProjectiles[i]; 
            const moveStep = p.def.speed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += p.dirY * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            if (p.isMine) { 
                this.tempBoxAttacker.setFromObject(p.mesh); 
                
                for (let id in otherPlayers) {
                    if(p.hasHit.includes(id)) continue; 
                    
                    this.tempBoxTarget.setFromObject(otherPlayers[id].mesh);
                    if (this.tempBoxAttacker.intersectsBox(this.tempBoxTarget)) {
                        if(typeof BYOND_REF !== 'undefined') {
                            NetworkSystem.queueCommand(`action=register_skill_hit&skill_id=${p.skillId}&target_ref=${id}`);
                        }
                        
                        p.hasHit.push(id);
                        
                        if (!p.def.pierce) {
                            this.releaseProjectile(p.mesh); 
                            p.distTraveled = 99999; 
                            break; 
                        }
                    }
                }
            }
            
            if (p.distTraveled >= p.def.range) { 
                this.releaseProjectile(p.mesh); 
                this.activeSkillProjectiles.splice(i, 1); 
            }
        }

        const now = Date.now();
        for (let i = this.activeHitboxes.length - 1; i >= 0; i--) {
            const hb = this.activeHitboxes[i]; 
            if (now - hb.startTime > hb.duration) { 
                this.releaseHitbox(hb.mesh); 
                this.activeHitboxes.splice(i, 1); 
                continue; 
            }
            this.tempBoxAttacker.setFromObject(hb.mesh); this.checkCollisions(this.tempBoxAttacker, "melee", hb);
        }
    }
};

// --- VARIÁVEIS GLOBAIS DE ENTIDADE (Manteremos até criar o EntityManager) ---
let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;

// Variáveis Críticas Residuais
let lastActionTime = Date.now(); 

// --- DELTA TIME VARS ---
let lastFrameTime = performance.now();
const TARGET_FPS = 60;
const OPTIMAL_FRAME_TIME = 1000 / TARGET_FPS; 

const groundItemsMeshes = {}; 

// Estado do Jogo (Física/Entidade)
let charState = "DEFAULT"; 
let isResting = false; 
let isFainted = false; 
let isRunning = false; 
let currentMoveSpeed = 0.08; 
let currentJumpForce = 0.20; 

// --- SISTEMA DE COMBOS ---
let lastCombatActionTime = 0; 
let isAttacking = false; 
let fistComboStep = 0; let lastFistAttackTime = 0;
let kickComboStep = 0; let lastKickAttackTime = 0;
let swordComboStep = 0; let lastSwordAttackTime = 0;

let animTime = 0; 
let isJumping = false; 
let verticalVelocity = 0; 
const gravity = -0.015; 

const MAP_LIMIT = 29; 

// --- CONTROLE DE SKILLS (HOTBAR) ---
const localSkillCooldowns = {};

function castSkill(skillId) {
    if(isFainted || isResting || isAttacking || !isCharacterReady) return;
    
    const skillDef = GameSkills[skillId];
    if(!skillDef) return;

    const now = Date.now();
    if (localSkillCooldowns[skillId] && localSkillCooldowns[skillId] > now) {
        UISystem.addLog(`<span style='color:orange'>A habilidade ${skillDef.name} está em recarga.</span>`, "log-miss");
        return;
    }

    if (UISystem.cache.en < skillDef.energyCost) {
        UISystem.addLog("<span style='color:red'>Energia insuficiente!</span>", "log-miss");
        return;
    }

    isAttacking = true;
    lastActionTime = now;
    lastCombatActionTime = now;
    charState = "SWORD_WINDUP"; 
    
    NetworkSystem.queueCommand(`action=cast_skill&skill_id=${skillId}`);
    
    setTimeout(() => {
        charState = "FIST_COMBO_1"; 
        setTimeout(() => { charState = "DEFAULT"; isAttacking = false; }, 300);
    }, 100);
}

// Helper Matemático
function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }

// --- EVENTOS DE CONTROLE ---
window.addEventListener('keydown', function(e) {
    const k = e.key.toLowerCase();
    
    if (k === 'tab') {
        e.preventDefault(); 
        if (e.repeat) return; 
        TargetSystem.cycleTarget();
        return;
    }
    
    if (e.key === 'Escape') {
        if (UISystem.state.invOpen) UISystem.toggleInventory();
        else if (UISystem.state.statOpen) UISystem.toggleStats();
        else if (UISystem.state.skillsOpen) UISystem.toggleSkills();
        else if (UISystem.state.shopOpen) UISystem.toggleShop();
        else if (UISystem.state.lootOpen) UISystem.closeLoot();
        else {
            TargetSystem.deselectTarget();
            if(document.getElementById('kill-modal').style.display === 'block') UISystem.confirmKill(false);
        }
        return;
    }

    if(k === 'c') UISystem.toggleStats(); 
    if(k === 'i') UISystem.toggleInventory(); 
    if(k === 'k') UISystem.toggleSkills();
    if(k === 'x') interact();
    
    if(k === 'e' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=pick_up`); setTimeout(function() { NetworkSystem.blockSync = false; }, 300); }
    if(k === 'r' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=toggle_rest`); setTimeout(function() { NetworkSystem.blockSync = false; }, 500); }
    if(e.key === 'Shift') isRunning = true;

    // HOTKEYS DE SKILL
    if(k === '1') castSkill("fireball");
    if(k === '2') castSkill("iceball");
});

window.addEventListener('keyup', function(e) { if(e.key === 'Shift') isRunning = false; });

function interact() {
    lastActionTime = Date.now(); 
    if (TargetSystem.currentTargetID && otherPlayers[TargetSystem.currentTargetID]) {
        let dist = playerGroup.position.distanceTo(otherPlayers[TargetSystem.currentTargetID].mesh.position);
        if (dist < 3.0) {
            NetworkSystem.queueCommand(`action=interact_npc&ref=${TargetSystem.currentTargetID}`);
            return;
        }
    }

    let targetRef = ""; for(let id in otherPlayers) { let dist = playerGroup.position.distanceTo(otherPlayers[id].mesh.position); if(dist < 3.0) { targetRef = id; break; } }
    if(targetRef !== "") NetworkSystem.queueCommand(`action=interact_npc&ref=${targetRef}`);
}

// --- SISTEMA DE COLISÃO DO AMBIENTE ---
const tempBoxObstacle = new THREE.Box3(); 
const playerRadius = 0.15; 
const playerHeight = 1.6;  

function getGroundHeightAt(x, y, z) {
    let maxY = 0; 
    if(!Engine.collidables) return maxY;
    
    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i]; 
        if(!obj || !obj.userData.standable) continue;

        tempBoxObstacle.setFromObject(obj);

        let isInsideXZ = false;
        let phys = obj.userData.physics;

        if (phys && phys.shape === "cylinder") {
            let objPos = new THREE.Vector3();
            obj.getWorldPosition(objPos);
            
            let closestX = Math.max(x - playerRadius, Math.min(objPos.x, x + playerRadius));
            let closestZ = Math.max(z - playerRadius, Math.min(objPos.z, z + playerRadius));
            
            let dx = objPos.x - closestX;
            let dz = objPos.z - closestZ;
            
            if ((dx*dx + dz*dz) <= (phys.radius * phys.radius)) {
                isInsideXZ = true;
            }
        } else {
            let pMinX = x - playerRadius; let pMaxX = x + playerRadius;
            let pMinZ = z - playerRadius; let pMaxZ = z + playerRadius;
            
            if (pMinX <= tempBoxObstacle.max.x && pMaxX >= tempBoxObstacle.min.x &&
                pMinZ <= tempBoxObstacle.max.z && pMaxZ >= tempBoxObstacle.min.z) {
                isInsideXZ = true;
            }
        }

        if (isInsideXZ) {
            if (tempBoxObstacle.max.y <= y + 0.6) {
                if (tempBoxObstacle.max.y > maxY) maxY = tempBoxObstacle.max.y; 
            }
        }
    }
    return maxY;
}

function checkCollision(x, y, z) {
    if(!Engine.collidables) return false; 
    
    const pMinY = y;
    const pMaxY = y + playerHeight;

    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i]; 
        if(!obj) continue;
        
        tempBoxObstacle.setFromObject(obj);
        
        let objMinY = tempBoxObstacle.min.y;
        let objMaxY = tempBoxObstacle.max.y;
        
        if (pMinY >= objMaxY - 0.05 && obj.userData.standable) continue; 
        if (pMaxY <= objMinY) continue; 
        if (pMinY >= objMaxY) continue; 
        
        let collideXZ = false;
        let phys = obj.userData.physics;

        if (phys && phys.shape === "cylinder") {
            let objPos = new THREE.Vector3();
            obj.getWorldPosition(objPos);
            
            let closestX = Math.max(x - playerRadius, Math.min(objPos.x, x + playerRadius));
            let closestZ = Math.max(z - playerRadius, Math.min(objPos.z, z + playerRadius));
            
            let dx = objPos.x - closestX;
            let dz = objPos.z - closestZ;
            
            if ((dx*dx + dz*dz) < (phys.radius * phys.radius)) {
                collideXZ = true;
            }
        } else {
            let pMinX = x - playerRadius; let pMaxX = x + playerRadius;
            let pMinZ = z - playerRadius; let pMaxZ = z + playerRadius;
            
            if (pMinX <= tempBoxObstacle.max.x && pMaxX >= tempBoxObstacle.min.x &&
                pMinZ <= tempBoxObstacle.max.z && pMaxZ >= tempBoxObstacle.min.z) {
                collideXZ = true;
            }
        }

        if (collideXZ) return true; 
    }
    return false; 
}

function checkPlayerCollision(nextX, nextY, nextZ) {
    const futureBox = new THREE.Box3();
    const center = new THREE.Vector3(nextX, nextY + 0.9, nextZ); 
    const size = new THREE.Vector3(0.4, 1.8, 0.4); 
    futureBox.setFromCenterAndSize(center, size);
    
    const currentBox = new THREE.Box3();
    currentBox.setFromCenterAndSize(new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 0.9, playerGroup.position.z), size);

    for (let id in otherPlayers) {
        const other = otherPlayers[id];
        if (!other.mesh) continue;
        
        if (other.isNPC && other.npcType === "prop") continue;

        const otherBox = new THREE.Box3().setFromObject(other.mesh);
        otherBox.expandByScalar(-0.15); 
        
        if (futureBox.intersectsBox(otherBox)) { 
            if (currentBox.intersectsBox(otherBox)) {
                const dxCur = playerGroup.position.x - other.mesh.position.x;
                const dzCur = playerGroup.position.z - other.mesh.position.z;
                const currentDistSq = dxCur*dxCur + dzCur*dzCur;

                const dxFut = nextX - other.mesh.position.x;
                const dzFut = nextZ - other.mesh.position.z;
                const futureDistSq = dxFut*dxFut + dzFut*dzFut;

                if (futureDistSq > currentDistSq || currentDistSq < 0.001) {
                    continue; 
                }
            }
            return true; 
        }
    }
    return false;
}

window.addEventListener('game-action', function(e) {
    if(isFainted) return; const k = e.detail;
    if(k === 'd') performAttack("sword"); else if(k === 'f') performAttack("gun"); else if(k === 'a') performAttack("fist"); else if(k === 's') performAttack("kick");
    else if(k === 'p' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; NetworkSystem.queueCommand("action=force_save"); UISystem.addLog("Salvando...", "log-miss"); setTimeout(function() { NetworkSystem.blockSync = false; }, 500); }
});

function performAttack(type) {
    if(isAttacking || !isCharacterReady) return; 
    const equippedItem = playerGroup.userData.lastItem;
    let hasSword = false; let hasGun = false; let projectileData = null;
    if(equippedItem && GameDefinitions[equippedItem]) {
        const def = GameDefinitions[equippedItem]; const tags = def.tags || (def.data ? def.data.tags : []);
        if(tags && tags.includes("sword")) hasSword = true; if(tags && tags.includes("gun")) { hasGun = true; projectileData = def.projectile; }
    }
    if(type === "sword" && !hasSword) { UISystem.addLog("Sem espada!", "log-miss"); return; }
    if(type === "gun" && !hasGun) { UISystem.addLog("Sem arma!", "log-miss"); return; }
    
    if (TargetSystem.currentTargetID && otherPlayers[TargetSystem.currentTargetID]) {
        const targetMesh = otherPlayers[TargetSystem.currentTargetID].mesh;
        const dx = targetMesh.position.x - playerGroup.position.x;
        const dz = targetMesh.position.z - playerGroup.position.z;
        playerGroup.rotation.y = Math.atan2(dx, dz);
    }

    isAttacking = true; 
    lastCombatActionTime = Date.now();
    lastActionTime = Date.now(); 
    let windupStance = "SWORD_WINDUP"; let atkStance = "SWORD_ATK_1"; let idleStance = "SWORD_IDLE";
    let currentComboStep = 1;

    if(type === "fist") {
        if(Date.now() - lastFistAttackTime > 600) fistComboStep = 0;
        fistComboStep++; if(fistComboStep > 3) fistComboStep = 1; 
        lastFistAttackTime = Date.now();
        currentComboStep = fistComboStep;
        windupStance = "FIST_WINDUP"; atkStance = "FIST_COMBO_" + fistComboStep; idleStance = "FIST_IDLE";
    }
    else if(type === "kick") { 
        if(Date.now() - lastKickAttackTime > 600) kickComboStep = 0;
        kickComboStep++; if(kickComboStep > 3) kickComboStep = 1;
        lastKickAttackTime = Date.now();
        currentComboStep = kickComboStep;
        windupStance = "KICK_WINDUP"; atkStance = "KICK_COMBO_" + kickComboStep; idleStance = "FIST_IDLE";
    }
    else if(type === "sword") {
        if(Date.now() - lastSwordAttackTime > 600) swordComboStep = 0;
        swordComboStep++; if(swordComboStep > 3) swordComboStep = 1;
        lastSwordAttackTime = Date.now();
        currentComboStep = swordComboStep;
        windupStance = "SWORD_WINDUP"; atkStance = "SWORD_COMBO_" + swordComboStep; idleStance = "SWORD_IDLE";
    }
    else if(type === "gun") { windupStance = "GUN_IDLE"; atkStance = "GUN_ATK"; idleStance = "GUN_IDLE"; }
    
    charState = windupStance; 
    setTimeout(function() {
        charState = atkStance;
        if(type === "gun" && projectileData) CombatVisualSystem.fireProjectile(playerGroup, projectileData, true);
        else if (type === "fist") {
            if(fistComboStep === 3) CombatVisualSystem.spawnHitbox(playerGroup, {x:1.5, y:1.5, z:1.5}, 1.5, 200, {step: 3}); 
            else CombatVisualSystem.spawnHitbox(playerGroup, {x:1, y:1, z:1}, 1.0, 200, {step: fistComboStep}); 
        }
        else if (type === "kick") {
            if(kickComboStep === 1) CombatVisualSystem.spawnHitbox(playerGroup, {x:1.2, y:0.8, z:1.2}, 1.0, 300, {step: 1}, 0.5); 
            else if(kickComboStep === 2) CombatVisualSystem.spawnHitbox(playerGroup, {x:1.2, y:1.0, z:1.2}, 1.2, 300, {step: 2}, 1.0); 
            else CombatVisualSystem.spawnHitbox(playerGroup, {x:1.5, y:1.2, z:1.5}, 1.4, 300, {step: 3}, 1.7); 
        }
        else if (type === "sword") {
            if(swordComboStep === 3) CombatVisualSystem.spawnHitbox(playerGroup, {x:1.0, y:1.0, z:4.0}, 2.5, 300, {step: 3}); 
            else CombatVisualSystem.spawnHitbox(playerGroup, {x:2.5, y:1.0, z:2.0}, 1.5, 300, {step: swordComboStep}); 
        }
        
        if(typeof BYOND_REF !== 'undefined') { 
            NetworkSystem.blockSync = true; 
            NetworkSystem.queueCommand(`action=attack&type=${type}&step=${currentComboStep}`); 
            setTimeout(function(){NetworkSystem.blockSync=false}, 200); 
        }
        setTimeout(function() { charState = idleStance; isAttacking = false; }, 300);
    }, 100); 
}

// --- NETWORK HANDLERS ---
function receberDadosGlobal(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    NetworkSystem.lastPacketTime = Date.now();
    const now = performance.now();

    let closestDist = 999;

    // 1. SYNC DE CHÃO 
    if (packet.ground !== undefined) {
        const serverGroundItems = packet.ground;
        const seenItems = new Set();
        
        serverGroundItems.forEach(itemData => {
            seenItems.add(itemData.ref);
            if(!groundItemsMeshes[itemData.ref]) {
                const mesh = CharFactory.createFromDef(itemData.id);
                mesh.position.set(itemData.x, 0.05, itemData.z); 
                Engine.scene.add(mesh);
                groundItemsMeshes[itemData.ref] = mesh;
            } else {
                const mesh = groundItemsMeshes[itemData.ref];
                mesh.position.x = lerp(mesh.position.x, itemData.x, 0.2);
                mesh.position.z = lerp(mesh.position.z, itemData.z, 0.2);
            }
        });
        for(let ref in groundItemsMeshes) {
            if(!seenItems.has(ref)) {
                Engine.scene.remove(groundItemsMeshes[ref]);
                delete groundItemsMeshes[ref];
            }
        }
    }

    if(playerGroup) {
        for(let ref in groundItemsMeshes) {
            const d = playerGroup.position.distanceTo(groundItemsMeshes[ref].position);
            if(d < closestDist) closestDist = d;
        }
    }

    // 2. SYNC DE PLAYERS & NPCS
    const serverPlayers = packet.others; 
    const receivedIds = new Set();
    
    for (const id in serverPlayers) {
        if (id === myID) continue; 
        receivedIds.add(id); 
        const pData = serverPlayers[id];
        
        if (!otherPlayers[id]) {
            if(pData.skin !== undefined) {
                let newChar;
                let isProp = (pData.npc === 1 && pData.type === "prop");
                
                if(isProp) {
                    newChar = CharFactory.createFromDef(pData.prop_id || "prop_tree_log");
                    Engine.collidables.push(newChar); 
                } else {
                    newChar = CharFactory.createCharacter(pData.skin, pData.cloth);
                }
                
                newChar.position.set(pData.x, pData.y, pData.z); 
                Engine.scene.add(newChar); 

                const label = document.createElement('div'); label.className = 'name-label'; 
                label.innerHTML = `<div class="name-text">${pData.name||"?"}</div><div class="mini-hp-bg"><div class="mini-hp-fill"></div></div>`; 
                document.getElementById('labels-container').appendChild(label);
                
                newChar.userData.lastHead = ""; newChar.userData.lastBody = "";
                newChar.userData.lastLegs = ""; newChar.userData.lastFeet = ""; newChar.userData.lastItem = "";
                
                otherPlayers[id] = { 
                    mesh: newChar, label: label, hpFill: label.querySelector('.mini-hp-fill'), 
                    name: pData.name, currentHp: pData.hp, maxHp: pData.mhp,
                    startX: pData.x, startY: pData.y, startZ: pData.z, startRot: pData.rot, 
                    targetX: pData.x, targetY: pData.y, targetZ: pData.z, targetRot: pData.rot, 
                    lastPacketTime: now, lerpDuration: 150, 
                    attacking: pData.a, attackType: pData.at, comboStep: pData.cs, 
                    resting: pData.rest, fainted: pData.ft, lastItem: "", 
                    isNPC: (pData.npc === 1), npcType: pData.type, gender: pData.gen, isRunning: false 
                };
            }
        } else {
            const other = otherPlayers[id];
            const mesh = other.mesh;
            
            other.currentHp = pData.hp;
            other.startX = mesh.position.x; other.startY = mesh.position.y; other.startZ = mesh.position.z; other.startRot = mesh.rotation.y;
            other.targetX = pData.x; other.targetY = pData.y; other.targetZ = pData.z; other.targetRot = pData.rot; other.lastPacketTime = now;
            other.attacking = pData.a; other.attackType = pData.at; 
            other.comboStep = pData.cs; 
            other.resting = pData.rest; 
            
            if(UISystem.state.lootOpen && UISystem.state.lootTargetRef === id && pData.ft === 0) {
                UISystem.closeLoot();
                UISystem.addLog("<span style='color:orange'>O alvo acordou! Saque interrompido.</span>", "log-miss");
            }

            other.fainted = pData.ft;
            if(pData.rn !== undefined) other.isRunning = pData.rn;

            if(pData.mhp !== undefined) other.maxHp = pData.mhp;
            if(pData.name !== undefined) { 
                other.name = pData.name; 
                if(other.label.querySelector('.name-text').innerText !== pData.name) other.label.querySelector('.name-text').innerText = pData.name; 
            }
            if(pData.gen !== undefined) other.gender = pData.gen;

            if(pData.it !== undefined && mesh.userData.lastItem !== pData.it) { CharFactory.equipItem(mesh, pData.it, mesh.userData.lastItem); mesh.userData.lastItem = pData.it; }
            if(pData.eq_h !== undefined && mesh.userData.lastHead !== pData.eq_h) { CharFactory.equipItem(mesh, pData.eq_h, mesh.userData.lastHead); mesh.userData.lastHead = pData.eq_h; }
            if(pData.eq_b !== undefined && mesh.userData.lastBody !== pData.eq_b) { CharFactory.equipItem(mesh, pData.eq_b, mesh.userData.lastBody); mesh.userData.lastBody = pData.eq_b; }
            if(pData.eq_l !== undefined && mesh.userData.lastLegs !== pData.eq_l) { CharFactory.equipItem(mesh, pData.eq_l, mesh.userData.lastLegs); mesh.userData.lastLegs = pData.eq_l; }
            if(pData.eq_f !== undefined && mesh.userData.lastFeet !== pData.eq_f) { CharFactory.equipItem(mesh, pData.eq_f, mesh.userData.lastFeet); mesh.userData.lastFeet = pData.eq_f; }
            
            if(other.hpFill && other.maxHp > 0) other.hpFill.style.width = Math.max(0, Math.min(100, (other.currentHp / other.maxHp) * 100)) + "%";
            
            if (other.attacking && other.attackType === "gun" && !other.hasFiredThisCycle) { 
                CombatVisualSystem.fireProjectile(mesh, { speed: 0.6, color: 0xFFFF00, ownerID: id }, false); 
                other.hasFiredThisCycle = true; setTimeout(() => { other.hasFiredThisCycle = false; }, 500); 
            }
        }
    }
    
    for (const id in otherPlayers) { 
        if (!receivedIds.has(id)) { 
            Engine.scene.remove(otherPlayers[id].mesh); 
            const colIndex = Engine.collidables.indexOf(otherPlayers[id].mesh);
            if(colIndex > -1) Engine.collidables.splice(colIndex, 1);
            otherPlayers[id].label.remove(); 
            
            if (TargetSystem.currentTargetID === id) TargetSystem.deselectTarget();

            delete otherPlayers[id]; 
        } 
    }

    if(packet.t && packet.evts) {
        packet.evts.forEach(evt => {
            if (evt.type === "skill_cast") {
                let originMesh = null;
                if(evt.caster === myID && playerGroup) originMesh = playerGroup;
                else if(otherPlayers[evt.caster]) originMesh = otherPlayers[evt.caster].mesh;
                
                CombatVisualSystem.fireSkillProjectile(originMesh, evt.skill, evt.caster);
            }
        });
    }
    
    const hint = document.getElementById('interaction-hint');
    let npcNear = false;
    for(let id in otherPlayers) {
        if(otherPlayers[id].isNPC || (otherPlayers[id].fainted && !otherPlayers[id].isNPC)) { 
             let d = playerGroup ? playerGroup.position.distanceTo(otherPlayers[id].mesh.position) : 999;
             if(d < 3.0) npcNear = true;
        }
    }
    if(closestDist < 2.0) { hint.innerText = "[E] Pegar Item"; hint.style.display = 'block'; }
    else if(npcNear) { hint.innerText = "[X] Interagir"; hint.style.display = 'block'; }
    else hint.style.display = 'none';
}

function receberDadosPessoal(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    const me = packet.me; 
    myID = packet.my_id;

    if(me.loaded == 1 && !isCharacterReady) {
        playerGroup = CharFactory.createCharacter(me.skin || "FFCCAA", me.cloth || "FF0000"); 
        
        if(me.x !== undefined) {
            playerGroup.position.set(me.x, me.y, me.z);
            NetworkSystem.lastSentX = me.x; NetworkSystem.lastSentY = me.y; NetworkSystem.lastSentZ = me.z;
        }

        Engine.scene.add(playerGroup); isCharacterReady = true; 
        
        playerGroup.userData.lastHead = ""; playerGroup.userData.lastBody = ""; 
        playerGroup.userData.lastLegs = ""; playerGroup.userData.lastFeet = ""; 
        playerGroup.userData.lastItem = "";
    }

    if(isCharacterReady) {
        isResting = me.rest; isFainted = me.ft; 
        if(me.gen) playerGroup.userData.gender = me.gen;

        if(playerGroup.userData.lastItem !== me.it) { CharFactory.equipItem(playerGroup, me.it, playerGroup.userData.lastItem); playerGroup.userData.lastItem = me.it; }
        if(playerGroup.userData.lastHead !== me.eq_h) { CharFactory.equipItem(playerGroup, me.eq_h, playerGroup.userData.lastHead); playerGroup.userData.lastHead = me.eq_h; }
        if(playerGroup.userData.lastBody !== me.eq_b) { CharFactory.equipItem(playerGroup, me.eq_b, playerGroup.userData.lastBody); playerGroup.userData.lastBody = me.eq_b; }
        if(playerGroup.userData.lastLegs !== me.eq_l) { CharFactory.equipItem(playerGroup, me.eq_l, playerGroup.userData.lastLegs); playerGroup.userData.lastLegs = me.eq_l; }
        if(playerGroup.userData.lastFeet !== me.eq_f) { CharFactory.equipItem(playerGroup, me.eq_f, playerGroup.userData.lastFeet); playerGroup.userData.lastFeet = me.eq_f; }
        
        if(me.mspd) currentMoveSpeed = me.mspd;
        if(me.jmp) currentJumpForce = me.jmp;

        UISystem.updatePersonalStatus(me);

        if(packet.evts) packet.evts.forEach(evt => { 
            if(evt.type === "dmg") CombatVisualSystem.spawnDamageNumber(evt.tid, evt.val); 
            if(evt.type === "teleport") {
                if(playerGroup) {
                    playerGroup.position.set(evt.x, evt.y, evt.z);
                    NetworkSystem.lastSentX = evt.x; NetworkSystem.lastSentY = evt.y; NetworkSystem.lastSentZ = evt.z;
                }
            }
            if(evt.type === "skill_cast_accept") { UISystem.startSkillCooldownUI(evt.skill); }
        });
    }
}

// --- FUNÇÃO UNIFICADA DE ANIMAÇÃO EM CAMADAS ---
function animateCharacterRig(mesh, state, isMoving, isRunning, isResting, isFainted, groundH) {
    const limbs = mesh.userData.limbs;
    if(!limbs) return;

    if (isFainted) {
        mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1); 
        if(mesh === playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + 0.2, 0.1);
        else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
    } 
    else if (isResting) {
        mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1);
        const yOffset = -0.4; 
        if(mesh === playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + yOffset, 0.1);
        else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
        
        const restStance = STANCES.REST_SIMPLE;
        if(restStance) {
            const spd = 0.1;
            lerpLimbRotation(limbs.torso, restStance.torso, spd);
            lerpLimbRotation(limbs.leftLeg, restStance.leftLeg, spd); lerpLimbRotation(limbs.rightLeg, restStance.rightLeg, spd);
            lerpLimbRotation(limbs.leftShin, restStance.leftShin, spd); lerpLimbRotation(limbs.rightShin, restStance.rightShin, spd);
            lerpLimbRotation(limbs.leftArm, restStance.leftArm, spd); lerpLimbRotation(limbs.rightArm, restStance.rightArm, spd);
            lerpLimbRotation(limbs.leftForeArm, restStance.leftForeArm, spd); lerpLimbRotation(limbs.rightForeArm, restStance.rightForeArm, spd);
        }
    } 
    else {
        if(mesh !== playerGroup) mesh.position.y = lerp(mesh.position.y, groundH, 0.2); 
        mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.2);

        let targetStance = STANCES[state] || STANCES.DEFAULT;
        const def = STANCES.DEFAULT;

        if(isMoving) {
            let legSpeed = isRunning ? 0.3 : 0.8; 
            
            limbs.leftLeg.rotation.x = Math.sin(animTime * (isRunning ? 1.5 : 1)) * legSpeed;
            limbs.rightLeg.rotation.x = -Math.sin(animTime * (isRunning ? 1.5 : 1)) * legSpeed;
            limbs.leftShin.rotation.x = (limbs.leftLeg.rotation.x > 0) ? limbs.leftLeg.rotation.x : 0;
            limbs.rightShin.rotation.x = (limbs.rightLeg.rotation.x > 0) ? limbs.rightLeg.rotation.x : 0;
        } else {
            const spd = 0.1;
            lerpLimbRotation(limbs.leftLeg, targetStance.leftLeg || def.leftLeg, spd);
            lerpLimbRotation(limbs.rightLeg, targetStance.rightLeg || def.rightLeg, spd);
            lerpLimbRotation(limbs.leftShin, targetStance.leftShin || def.leftShin, spd);
            lerpLimbRotation(limbs.rightShin, targetStance.rightShin || def.rightShin, spd);
        }

        if (state !== "DEFAULT") {
            const spd = 0.4; 
            lerpLimbRotation(limbs.torso, targetStance.torso || def.torso, spd);
            lerpLimbRotation(limbs.leftArm, targetStance.leftArm || def.leftArm, spd);
            lerpLimbRotation(limbs.rightArm, targetStance.rightArm || def.rightArm, spd);
            lerpLimbRotation(limbs.leftForeArm, targetStance.leftForeArm || def.leftForeArm, spd);
            lerpLimbRotation(limbs.rightForeArm, targetStance.rightForeArm || def.rightForeArm, spd);
        } else {
            if (isMoving) {
                let armAmp = isRunning ? 1.2 : 0.6; 
                limbs.leftArm.rotation.x = -Math.sin(animTime * (isRunning ? 1.5 : 1)) * armAmp;
                limbs.rightArm.rotation.x = Math.sin(animTime * (isRunning ? 1.5 : 1)) * armAmp;
                limbs.leftForeArm.rotation.x = -0.2;
                limbs.rightForeArm.rotation.x = -0.2;
                lerpLimbRotation(limbs.torso, def.torso, 0.1);
            } else {
                const spd = 0.1;
                lerpLimbRotation(limbs.torso, def.torso, spd);
                lerpLimbRotation(limbs.leftArm, def.leftArm, spd);
                lerpLimbRotation(limbs.rightArm, def.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, def.leftForeArm, spd);
                lerpLimbRotation(limbs.rightForeArm, def.rightForeArm, spd);
            }
        }
    }
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate); 
    
    const now = performance.now();
    const dt = Math.min((now - lastFrameTime), 100); 
    lastFrameTime = now;
    const timeScale = dt / OPTIMAL_FRAME_TIME;

    animTime += 0.1 * timeScale; 

    // Atualização Modularizada
    TargetSystem.updateUI();
    CombatVisualSystem.update(timeScale); 
    
    if (isCharacterReady) {
        if(!isAttacking && charState !== "DEFAULT") { if(Date.now() - lastCombatActionTime > 3000) charState = "DEFAULT"; }
        
        const groundHeight = getGroundHeightAt(playerGroup.position.x, playerGroup.position.y, playerGroup.position.z);

        if(!isResting && !isFainted) {
            let moveX = 0, moveZ = 0, moving = false; 
            let speed = currentMoveSpeed * (isRunning ? 1.5 : 1) * timeScale; 
            
            const sin = Math.sin(Input.camAngle); const cos = Math.cos(Input.camAngle);
            let inputX = 0; let inputZ = 0;
            if(Input.keys.arrowup) { inputX -= sin; inputZ -= cos; moving = true; }
            if(Input.keys.arrowdown) { inputX += sin; inputZ += cos; moving = true; }
            if(Input.keys.arrowleft) { inputX -= cos; inputZ += sin; moving = true; }
            if(Input.keys.arrowright) { inputX += cos; inputZ -= sin; moving = true; }

            if(moving) {
                lastActionTime = Date.now(); 

                const len = Math.sqrt(inputX*inputX + inputZ*inputZ);
                if(len > 0) { inputX /= len; inputZ /= len; }
                inputX *= speed; inputZ *= speed;

                let nextX = playerGroup.position.x + inputX; 
                let nextZ = playerGroup.position.z + inputZ;

                let canMoveX = true;
                if(nextX > MAP_LIMIT || nextX < -MAP_LIMIT || 
                   checkCollision(nextX, playerGroup.position.y, playerGroup.position.z) || 
                   checkPlayerCollision(nextX, playerGroup.position.y, playerGroup.position.z)) { canMoveX = false; } else { playerGroup.position.x = nextX; }

                let canMoveZ = true;
                if(nextZ > MAP_LIMIT || nextZ < -MAP_LIMIT || 
                   checkCollision(playerGroup.position.x, playerGroup.position.y, nextZ) || 
                   checkPlayerCollision(playerGroup.position.x, playerGroup.position.y, nextZ)) { canMoveZ = false; } else { playerGroup.position.z = nextZ; }

                if (!isAttacking) {
                    const targetCharRot = Math.atan2(inputX, inputZ); 
                    playerGroup.rotation.y = targetCharRot;
                }
                
                if(!Input.keys.arrowdown && !Input.mouseRight) {
                    const desiredMoveAngle = Math.atan2(inputX, inputZ); 
                    Input.camAngle = lerpAngle(Input.camAngle, desiredMoveAngle + Math.PI, 0.02 * timeScale); 
                }
            }

            if(Input.keys[" "] && !isJumping && Math.abs(playerGroup.position.y - groundHeight) < 0.1) { 
                verticalVelocity = currentJumpForce; 
                isJumping = true; 
                lastActionTime = Date.now(); 
            }
            
            playerGroup.position.y += verticalVelocity * timeScale; 
            verticalVelocity += gravity * timeScale;
            
            if(playerGroup.position.y < groundHeight) { playerGroup.position.y = groundHeight; isJumping = false; verticalVelocity = 0; }
            
            animateCharacterRig(playerGroup, charState, moving, isRunning, isResting, isFainted, groundHeight);
        } else {
            animateCharacterRig(playerGroup, charState, false, false, isResting, isFainted, groundHeight);
        }

        Engine.camera.position.set(playerGroup.position.x + Math.sin(Input.camAngle)*7, playerGroup.position.y + 5, playerGroup.position.z + Math.cos(Input.camAngle)*7);
        Engine.camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.5, playerGroup.position.z);
        
        NetworkSystem.sendPositionUpdate(now, playerGroup, isRunning, isResting, isCharacterReady);
    }
    
    for(const id in otherPlayers) {
        const other = otherPlayers[id]; 
        const mesh = other.mesh; 
        const elapsed = other.lastPacketTime ? (now - other.lastPacketTime) : 0; 
        const t = other.lerpDuration ? Math.min(1, elapsed / other.lerpDuration) : 1;
        
        mesh.position.x = lerp(other.startX, other.targetX, t); 
        mesh.position.z = lerp(other.startZ, other.targetZ, t); 
        
        const currentGroundH = other.targetY; 
        
        mesh.rotation.y = lerpAngle(other.startRot, other.targetRot, t);
        
        const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2)); 
        const isMoving = dist > 0.02;

        let remoteState = "DEFAULT";
        if(other.attacking) {
            let step = other.comboStep || 1;
            if(other.attackType === "sword") remoteState = "SWORD_COMBO_" + step; 
            else if(other.attackType === "fist") remoteState = "FIST_COMBO_" + step;
            else if(other.attackType === "kick") remoteState = "KICK_COMBO_" + step; 
            else if(other.attackType === "gun") remoteState = "GUN_ATK";
        }

        animateCharacterRig(mesh, remoteState, isMoving, other.isRunning, other.resting, other.fainted, currentGroundH);

        const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2, mesh.position.z); tempV.project(Engine.camera);
        other.label.style.display = (Math.abs(tempV.z) > 1) ? 'none' : 'block'; 
        other.label.style.left = (tempV.x * .5 + .5) * window.innerWidth + 'px'; 
        other.label.style.top = (-(tempV.y * .5) + .5) * window.innerHeight + 'px';
    }
    Engine.renderer.render(Engine.scene, Engine.camera);
}

animate();

setInterval(function() { 
    if(isCharacterReady && Date.now() - NetworkSystem.lastPacketTime > 4000) { 
        UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
        isCharacterReady = false; 
    } 
}, 1000);