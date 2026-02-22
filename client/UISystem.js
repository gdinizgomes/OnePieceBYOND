// client/UISystem.js

const UISystem = {
    state: { invOpen: false, statOpen: false, shopOpen: false, skillsOpen: false, lootOpen: false, lootTargetRef: "" },
    cache: { maxHp: 100, maxEn: 100, hp: 100, en: 100, lvl: 1, reqExp: 100, exp: 0, profs: {} },
    charName: "",
    unlockedSkills: [],
    lastSkillsStr: "",
    
    hotbar: { '1': null, '2': null, '3': null, '4': null, '5': null, '6': null, '7': null, '8': null, '9': null },
    assignTargetSlot: null,

    toggleInventory: function() { this.state.invOpen = !this.state.invOpen; document.getElementById('inventory-window').style.display = this.state.invOpen ? 'flex' : 'none'; },
    toggleStats: function() { this.state.statOpen = !this.state.statOpen; document.getElementById('stat-window').style.display = this.state.statOpen ? 'block' : 'none'; },
    toggleShop: function() { this.state.shopOpen = !this.state.shopOpen; document.getElementById('shop-window').style.display = this.state.shopOpen ? 'flex' : 'none'; },
    toggleSkills: function() { this.state.skillsOpen = !this.state.skillsOpen; document.getElementById('skills-window').style.display = this.state.skillsOpen ? 'flex' : 'none'; },
    
    closeLoot: function() { this.state.lootOpen = false; this.state.lootTargetRef = ""; document.getElementById('loot-window').style.display = 'none'; },

    confirmKill: function(isYes) {
        document.getElementById('kill-modal').style.display = 'none';
        if(isYes && TargetSystem.currentTargetID) NetworkSystem.queueCommand(`action=confirm_kill&target=${TargetSystem.currentTargetID}`);
    },

    addLog: function(msg, typeClass) {
        const logBox = document.getElementById('combat-log');
        const entry = document.createElement('div');
        entry.innerHTML = msg;
        if(typeClass) entry.className = typeClass;
        logBox.appendChild(entry);
        while(logBox.childElementCount > 400) logBox.removeChild(logBox.firstChild);
        logBox.scrollTop = logBox.scrollHeight;
    },

    showNotification: function(msg) {
        const area = document.getElementById('notif-area');
        const d = document.createElement('div');
        d.innerText = msg;
        d.style.cssText = "background:rgba(0,0,0,0.7); color:#f1c40f; padding:5px 15px; border-radius:15px; font-weight:bold; border:1px solid #d4af37; font-size:12px; margin-top:5px; animation: floatUp 2s ease-out forwards;";
        area.appendChild(d);
        setTimeout(() => d.remove(), 2000);
    },

    showTooltip: function(text, x, y) {
        const t = document.getElementById('tooltip');
        t.innerHTML = text; t.style.left = (x + 15) + 'px'; t.style.top = (y + 15) + 'px'; t.style.display = 'block';
    },
    hideTooltip: function() { document.getElementById('tooltip').style.display = 'none'; },

    loadHotbarMemory: function() {
        if(!this.charName) return;
        const saved = localStorage.getItem(`poe2_hotbar_${this.charName}`);
        if(saved) {
            try { this.hotbar = JSON.parse(saved); } catch(e){}
        }
        this.renderHotbar();
    },

    saveHotbarMemory: function() {
        if(!this.charName) return;
        localStorage.setItem(`poe2_hotbar_${this.charName}`, JSON.stringify(this.hotbar));
    },

    renderHotbar: function() {
        const container = document.getElementById('hotbar');
        container.innerHTML = '';
        
        for(let i = 1; i <= 9; i++) {
            const skillId = this.hotbar[i.toString()];
            const skillDef = skillId && window.GameSkills ? window.GameSkills[skillId] : null;
            
            let innerHTML = `<div class="hotbar-key">${i}</div>`;
            if(skillDef) {
                const rarityColors = { basic: "#ccc", uncommon: "#2ecc71", rare: "#3498db", legend: "#f1c40f", ultimate: "#e74c3c" };
                const c = rarityColors[skillDef.rarity] || "#fff";
                let shortName = skillDef.name.split(' ')[0].substring(0, 6);
                
                innerHTML += `<div style="color:${c}; font-size:10px; font-weight:bold; text-align:center; line-height:1;">${shortName}</div>`;
                innerHTML += `<div class="cooldown-overlay" id="cd-${skillId}"></div>`;
            } else {
                innerHTML += `<div style="color:#555; font-size:10px;">Vazio</div>`;
            }
            
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            slot.innerHTML = innerHTML;
            slot.onclick = () => this.openAssignPopup(i);
            container.appendChild(slot);
        }
    },

    openAssignPopup: function(slotNum) {
        if(!window.GameSkills) return;
        this.assignTargetSlot = slotNum.toString();
        const popup = document.getElementById('skill-assign-popup');
        const list = document.getElementById('assign-skill-list');
        list.innerHTML = '';
        
        const emptyBtn = document.createElement('div');
        emptyBtn.className = "assign-btn empty";
        emptyBtn.innerText = "✖ Remover Habilidade";
        emptyBtn.onclick = () => this.assignSkillToSlot(null);
        list.appendChild(emptyBtn);

        for(const [sId, sDef] of Object.entries(window.GameSkills)) {
            if(sId === "_COMMENT_DOCUMENTATION") continue;
            if(sDef.macro !== null) continue; 
            if(!this.unlockedSkills.includes(sId)) continue; 

            const btn = document.createElement('div');
            btn.className = "assign-btn";
            
            const rarityColors = { basic: "#ccc", uncommon: "#2ecc71", rare: "#3498db", legend: "#f1c40f", ultimate: "#e74c3c" };
            const c = rarityColors[sDef.rarity] || "#fff";
            
            btn.innerHTML = `<span style="color:${c}">${sDef.name}</span> <span style="font-size:10px; color:#aaa">${sDef.energyCost} EN</span>`;
            btn.onclick = () => this.assignSkillToSlot(sId);
            list.appendChild(btn);
        }
        
        popup.style.display = 'flex';
    },

    closeAssignPopup: function() {
        document.getElementById('skill-assign-popup').style.display = 'none';
        this.assignTargetSlot = null;
    },

    buildSkillsUI: function() {
        if(!window.GameSkills) return;
        
        const tabsHeader = document.getElementById('skills-tabs-header');
        const tabsContent = document.getElementById('skills-tabs-content');
        tabsHeader.innerHTML = ''; tabsContent.innerHTML = '';
        
        // CORREÇÃO: Abas base e customizadas combinadas
        const standardCategories = ["Combate", "Vontade", "Especial", "Classes"];
        const categoryGroups = {};
        standardCategories.forEach(c => categoryGroups[c] = []);

        for(const [sId, sDef] of Object.entries(window.GameSkills)) {
            if(sId === "_COMMENT_DOCUMENTATION") continue;
            const cat = sDef.category || "Outros";
            if(!categoryGroups[cat]) categoryGroups[cat] = [];
            categoryGroups[cat].push({id: sId, def: sDef});
        }
        
        let firstActive = null;

        for(const cat in categoryGroups) {
            const skillsList = categoryGroups[cat];
            let hasUnlocked = false;
            
            skillsList.forEach(skill => {
                const isUnlocked = (skill.def.macro !== null) || this.unlockedSkills.includes(skill.id);
                if(isUnlocked) hasUnlocked = true;
            });

            const btn = document.createElement('button');
            
            // CORREÇÃO: Lógica responsiva de abas desativadas
            if(skillsList.length === 0 || !hasUnlocked) {
                btn.className = 'tab-btn';
                btn.disabled = true;
                btn.innerText = cat;
                btn.title = `Nenhuma habilidade de ${cat} desbloqueada no momento.`;
            } else {
                btn.className = 'tab-btn';
                btn.innerText = cat;
                btn.onclick = (e) => this.switchSkillTab(`tab-cat-${cat}`, e.target);
                if(!firstActive) {
                    btn.classList.add('active');
                    firstActive = cat;
                }
            }
            tabsHeader.appendChild(btn);
            
            const content = document.createElement('div');
            content.id = `tab-cat-${cat}`;
            content.className = `tab-content ${firstActive === cat ? 'active' : ''}`;
            
            skillsList.forEach(skill => {
                const sId = skill.id;
                const sDef = skill.def;
                const isUnlocked = (sDef.macro !== null) || this.unlockedSkills.includes(sId);
                
                const rarityColors = { basic: "#ccc", uncommon: "#2ecc71", rare: "#3498db", legend: "#f1c40f", ultimate: "#e74c3c" };
                const c = rarityColors[sDef.rarity] || "#fff";
                
                const card = document.createElement('div');
                card.className = "skill-card";
                if(!isUnlocked) card.style.opacity = "0.5";
                
                let macroTxt = sDef.macro ? `[${sDef.macro}]` : `(Slot Hotbar)`;
                if(!isUnlocked) macroTxt = "[Não Aprendida]";
                
                // CORREÇÃO: Ícone padrão ✨
                let iconChar = "✨";
                if(sDef.requiresWeaponTag === "sword") iconChar = "⚔️";
                else if(sDef.requiresWeaponTag === "gun") iconChar = "🔫";
                else if(sDef.type === "melee") iconChar = "👊";
                
                let lvlTxt = "1";
                let pct = 0;
                
                // CORREÇÃO: Resgate da EXP das habilidades base para montagem inicial
                if(this.cache.profs && this.cache.profs[sId]) {
                    const prof = this.cache.profs[sId];
                    lvlTxt = prof.lvl || 1;
                    if(prof.req > 0) pct = (prof.exp / prof.req) * 100;
                }
                
                card.innerHTML = `
                    <div class="skill-icon" style="color:${c}; border-color:${c};">${iconChar}</div>
                    <div class="skill-info">
                        <div class="skill-name" style="color: ${c}">${sDef.name} <span style="font-size:10px; color:#aaa; float:right">${macroTxt}</span></div>
                        <div class="skill-desc">EN: ${sDef.energyCost || 0} | CD: ${(sDef.cooldown/1000).toFixed(1)}s</div>
                        <div class="skill-bar-bg"><div class="skill-bar-fill" id="bar-${sId}" style="width: ${pct}%"></div></div>
                    </div>
                    <div class="skill-lvl">Lv.<span id="lvl-${sId}">${lvlTxt}</span></div>
                `;
                content.appendChild(card);
            });
            
            tabsContent.appendChild(content);
        }
    },

    switchSkillTab: function(tabId, btnElement) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btnElement.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    },

    updatePersonalStatus: function(me) {
        // Inicializa as proficiências base recebidas do servidor antes de recriar/atualizar a UI
        this.cache.profs = {
            'basic_fist': { lvl: me.pp, exp: me.pp_x, req: me.pp_r },
            'basic_kick': { lvl: me.pk, exp: me.pk_x, req: me.pk_r },
            'basic_sword': { lvl: me.ps, exp: me.ps_x, req: me.ps_r },
            'basic_gun': { lvl: me.pg, exp: me.pg_x, req: me.pg_r }
        };

        if(me.skills) {
            const str = JSON.stringify(me.skills);
            if (this.lastSkillsStr !== str) {
                this.unlockedSkills = me.skills;
                this.lastSkillsStr = str;
                this.buildSkillsUI();
            }
        }
        
        // CORREÇÃO (Performance): Atualiza dinamicamente as larguras das barras de XP sem recriar o painel inteiro!
        for(let sId in this.cache.profs) {
            const prof = this.cache.profs[sId];
            const bar = document.getElementById(`bar-${sId}`);
            const lvl = document.getElementById(`lvl-${sId}`);
            if(bar && prof.req > 0) bar.style.width = Math.max(0, Math.min(100, (prof.exp / prof.req) * 100)) + "%";
            if(lvl) lvl.innerText = prof.lvl || 1;
        }

        if(me.nick && this.charName !== me.nick) {
            this.charName = me.nick;
            this.loadHotbarMemory();
        }

        document.getElementById('name-display').innerText = me.nick || "Unknown";
        document.getElementById('lvl-display').innerText = me.lvl || 1;
        document.getElementById('gold-display').innerText = me.gold || 0;

        document.getElementById('stat-name').innerText = me.nick || "Unknown";
        document.getElementById('stat-class').innerText = me.class || "Civil";
        document.getElementById('stat-title').innerText = me.title || "Nenhum";
        document.getElementById('stat-lvl').innerText = me.lvl || 1;
        document.getElementById('stat-kills').innerText = me.kills || 0;
        document.getElementById('stat-deaths').innerText = me.deaths || 0;

        this.cache.maxHp = me.max_hp; this.cache.hp = me.hp;
        document.getElementById('hp-text').innerText = `${me.hp}/${me.max_hp}`;
        document.getElementById('hp-bar-fill').style.width = Math.max(0, Math.min(100, (me.hp / me.max_hp) * 100)) + "%";

        this.cache.maxEn = me.max_en; this.cache.en = me.en;
        document.getElementById('en-text').innerText = `${me.en}/${me.max_en}`;
        document.getElementById('en-bar-fill').style.width = Math.max(0, Math.min(100, (me.en / me.max_en) * 100)) + "%";

        this.cache.reqExp = me.req_exp; this.cache.exp = me.exp;
        document.getElementById('xp-bar-fill').style.width = Math.max(0, Math.min(100, (me.exp / me.req_exp) * 100)) + "%";

        document.getElementById('stat-points').innerText = me.pts || 0;
        document.getElementById('val-str').innerText = me.str || 0;
        document.getElementById('val-vit').innerText = me.vit || 0;
        document.getElementById('val-agi').innerText = me.agi || 0;
        document.getElementById('val-dex').innerText = me.dex || 0;
        document.getElementById('val-von').innerText = me.von || 0;
        document.getElementById('val-sor').innerText = me.sor || 0;

        document.getElementById('val-atk').innerText = me.atk || 0;
        document.getElementById('val-ratk').innerText = me.ratk || 0;
        document.getElementById('val-def').innerText = me.def || 0;
        document.getElementById('val-hit').innerText = me.hit || 0;
        document.getElementById('val-flee').innerText = me.flee || 0;
        document.getElementById('val-crit').innerText = (me.crit || 0) + "%";

        const btn = document.getElementById('lethality-toggle');
        if(me.lethal === 1) { btn.classList.add('on'); btn.title = "Modo Letalidade: ON (Mata jogadores defitivamente)"; }
        else { btn.classList.remove('on'); btn.title = "Modo Letalidade: OFF (Apenas desmaia jogadores)"; }

        if(me.ft) {
            document.getElementById('faint-overlay').style.display = 'flex';
            if(me.rem !== undefined) document.getElementById('faint-timer').innerText = me.rem;
        } else {
            document.getElementById('faint-overlay').style.display = 'none';
        }
    }
};

window.UISystem = UISystem;