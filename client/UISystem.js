// client/UISystem.js

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
        window.addLog = (msg, css) => this.addLog(msg, css);
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
window.UISystem = UISystem;