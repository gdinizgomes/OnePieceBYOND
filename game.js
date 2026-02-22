// game.js - O Core Engine e Orquestrador Final do Cliente

function receberDadosGlobal(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    if(typeof NetworkSystem !== 'undefined') NetworkSystem.lastPacketTime = Date.now();
    if(typeof EntityManager !== 'undefined') EntityManager.syncGlobal(packet, performance.now());
}

function receberDadosPessoal(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    if(typeof EntityManager !== 'undefined') EntityManager.syncPersonal(packet);
}

function receberSkills(json) {
    try { 
        window.GameSkills = JSON.parse(json); 
        if(typeof UISystem !== 'undefined') {
            UISystem.addLog("<span style='color:#2ecc71'>[Sistema Data-Driven Carregado]</span>", "log-hit");
            UISystem.buildSkillsUI(); 
            UISystem.renderHotbar(); 
        }
    } catch(e) {
        console.error("Falha ao processar JSON de Skills", e);
    }
}

function mostrarNotificacao(msg) {
    if(typeof UISystem !== 'undefined') UISystem.showNotification(msg);
}

function addLog(msg) {
    if(typeof UISystem !== 'undefined') UISystem.addLog(msg);
}

function askKillConfirm(ref) {
    if(typeof TargetSystem !== 'undefined') TargetSystem.currentTargetID = ref;
    document.getElementById('kill-modal').style.display = 'block';
}

function openShop(json) {
    if(typeof UISystem === 'undefined') return;
    let items; try { items = JSON.parse(json); } catch(e) { console.error("JSON parse error in openShop", e); return; }
    
    const list = document.getElementById('shop-list');
    list.innerHTML = '';
    items.forEach(it => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        const imgName = `${it.id}_img.png`;
        
        itemDiv.innerHTML = `
            <img src="${imgName}" onerror="this.src='default_item.png'">
            <div class="shop-details">
                <div class="shop-name">${it.name}</div>
                <div class="shop-price">${it.price} Berries</div>
            </div>
            <button class="btn-buy" onclick="window.NetworkSystem.queueCommand('action=buy_item&type=${it.typepath}')">Comprar</button>
        `;
        list.appendChild(itemDiv);
    });
    
    UISystem.closeAllWindows();
    UISystem.state.shopOpen = true;
    document.getElementById('shop-window').style.display = 'flex';
    
    UISystem.state.invOpen = true;
    document.getElementById('inventory-window').style.display = 'flex';
    if(typeof window.NetworkSystem !== 'undefined') window.NetworkSystem.queueCommand('action=request_inventory');
}

function openLootWindow(json) {
    if(typeof UISystem === 'undefined') return;
    let data; try { data = JSON.parse(json); } catch(e) { return; }
    
    UISystem.closeAllWindows();
    UISystem.state.lootOpen = true;
    UISystem.state.lootTargetRef = data.target_ref;
    
    document.getElementById('loot-target-name').innerText = data.target_name;
    document.getElementById('loot-gold').innerText = data.gold;
    document.getElementById('loot-window').style.display = 'flex';
    
    const grid = document.getElementById('loot-grid');
    grid.innerHTML = '';
    
    const allItems = [...data.equipped, ...data.inventory];
    
    for(let i = 0; i < 12; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        const it = allItems[i];
        
        if(it) {
            if(it.equipped) slot.classList.add('equipped');
            
            const imgName = `${it.id}_img.png`; 
            let innerHTML = `<img src="${imgName}" class="inv-icon" onerror="this.src='default_item.png'">`;
            if(it.amount > 1) innerHTML += `<div class="inv-qty">${it.amount}</div>`;
            
            innerHTML += `<div class="inv-actions">
                <button class="action-btn" onclick="window.NetworkSystem.queueCommand('action=rob_item&target=${data.target_ref}&ref=${it.ref}')">Roubar / Dropar</button>
            </div>`;
            
            slot.innerHTML = innerHTML;
        }
        grid.appendChild(slot);
    }
}

function loadInventory(json) {
    if(typeof UISystem === 'undefined') return;
    let items; try { items = JSON.parse(json); } catch(e) { return; }
    
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = '';
    
    for(let i = 0; i < 12; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-slot';
        const it = items[i];
        
        if(it) {
            let tooltipContent = `<strong>${it.name}</strong><br>${it.desc}<br><span style='color:#3498db'>${it.power}</span><br><span style='color:#f1c40f'>Valor: ${Math.max(1, Math.floor(it.price/10))} Berries</span>`;
            slot.onmousemove = (e) => UISystem.showTooltip(tooltipContent, e.clientX, e.clientY);
            slot.onmouseleave = () => UISystem.hideTooltip();
            
            const imgName = `${it.id}_img.png`;
            let innerHTML = `<img src="${imgName}" class="inv-icon" onerror="this.src='default_item.png'">`;
            if(it.amount > 1) innerHTML += `<div class="inv-qty">${it.amount}</div>`;
            
            let btnEquip = '';
            if(!UISystem.state.shopOpen && !UISystem.state.lootOpen) {
                btnEquip = it.equipped ? `<button class="action-btn" onclick="window.NetworkSystem.queueCommand('action=unequip_item&slot=${it.slot}')">Desequipar</button>` : `<button class="action-btn" onclick="window.NetworkSystem.queueCommand('action=equip_item&ref=${it.ref}')">Equipar</button>`;
            }
            
            innerHTML += `<div class="inv-actions">
                ${btnEquip}
                <button class="action-btn btn-sell" onclick="window.NetworkSystem.queueCommand('action=sell_item&ref=${it.ref}')">Vender</button>
                <button class="action-btn btn-trash" onclick="window.NetworkSystem.queueCommand('action=drop_item&amount=${it.amount}&ref=${it.ref}')">Dropar</button>
            </div>`;
            
            slot.innerHTML = innerHTML;
        }
        grid.appendChild(slot);
    }
    
    if(UISystem.state.shopOpen) {
        document.querySelectorAll('.btn-sell').forEach(b => b.style.display = 'block');
    }
}

function updateStatusMenu(json) {
    let data; try { data = JSON.parse(json); } catch(e) { return; }
    const eq = data.equip;
    
    const slots = ['head', 'body', 'hand', 'legs', 'feet'];
    slots.forEach(slot => {
        const el = document.getElementById(`slot-${slot}`);
        if(el) {
            el.innerHTML = `<label>${slot}</label>`;
            if(eq[slot]) {
                el.innerHTML += `<img src="${eq[slot].id}_img.png" class="equip-icon" title="${eq[slot].name}" onerror="this.src='default_item.png'">`;
                el.onclick = () => window.NetworkSystem.queueCommand(`action=unequip_item&slot=${slot}`);
            } else {
                el.onclick = null;
            }
        }
    });
}

const GameLoop = {
    lastFrameTime: performance.now(),
    TARGET_FPS: 60,
    OPTIMAL_FRAME_TIME: 1000 / 60,

    start: function() {
        const animate = () => {
            // CORREÇÃO CRÍTICA (Frame Pacing): O Request no topo obriga o VSync do monitor a engolir 
            // este frame perfeitamente, estabilizando as variações matemáticas e removendo "engasgos".
            requestAnimationFrame(animate); 

            const now = performance.now();
            const rawDt = now - this.lastFrameTime;
            const dt = Math.min(rawDt, 100); 
            this.lastFrameTime = now;
            
            const timeScale = dt / this.OPTIMAL_FRAME_TIME;

            if (typeof AnimationSystem !== 'undefined') AnimationSystem.update(timeScale);
            if (typeof TargetSystem !== 'undefined') TargetSystem.updateUI();
            if (typeof CombatVisualSystem !== 'undefined') CombatVisualSystem.update(timeScale); 
            
            if (typeof CombatSystem !== 'undefined') CombatSystem.update(dt);
            
            if (typeof EntityManager !== 'undefined') {
                EntityManager.updatePlayer(timeScale, now);
                EntityManager.updateOthers(timeScale, now);
            }

            if (typeof Engine !== 'undefined' && Engine.renderer && Engine.scene && Engine.camera) {
                Engine.renderer.render(Engine.scene, Engine.camera);
            }
        };
        
        animate();
        
        setInterval(() => { 
            if(typeof EntityManager !== 'undefined' && EntityManager.isCharacterReady) {
                if (typeof NetworkSystem !== 'undefined' && Date.now() - NetworkSystem.lastPacketTime > 4000) {
                    if(typeof UISystem !== 'undefined') UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
                    EntityManager.isCharacterReady = false; 
                }
            } 
        }, 1000);
    }
};

GameLoop.start();