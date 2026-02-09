// game.js - Lógica Principal do Jogo e Network

// --- VARIÁVEIS GLOBAIS ---
let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;
let lastPacketTime = Date.now();
let blockSync = false;

const groundItemsMeshes = {}; 
const activeProjectiles = []; 
const activeHitboxes = []; 

// Estado do Jogo
let charState = "DEFAULT"; 
let isResting = false; 
let isFainted = false; 
let isRunning = false; 
let currentMoveSpeed = 0.08; 
let currentJumpForce = 0.20; 

// --- SISTEMA DE COMBOS ---
let lastCombatActionTime = 0; 
let isAttacking = false; 
// Soco
let fistComboStep = 0; 
let lastFistAttackTime = 0;
// Chute (NOVO)
let kickComboStep = 0;
let lastKickAttackTime = 0;

let animTime = 0; 
let isJumping = false; 
let verticalVelocity = 0; 
const gravity = -0.015; 

// UI State
let isStatWindowOpen = false;
let isInvWindowOpen = false; 
let isShopOpen = false; 

// Cache UI
let cachedHP = -1; let cachedMaxHP = -1; 
let cachedEn = -1; let cachedMaxEn = -1;
let cachedGold = -1; let cachedLvl = -1; let cachedName = "";
let cachedExp = -1; let cachedReqExp = -1; let cachedPts = -1;
let cachedStats = { str: -1, vit: -1, agi: -1, wis: -1 };
let cachedProfs = { pp: -1, pk: -1, ps: -1, pg: -1, bars: "" };

const POSITION_SYNC_INTERVAL = 100;
const POSITION_EPSILON = 0.01;
let lastSentTime = 0;
let lastSentX = null; let lastSentY = null; let lastSentZ = null; let lastSentRot = null;

// --- FUNÇÕES AUXILIARES UI ---
function addLog(msg, css) { 
    const d = document.getElementById('combat-log'); 
    if(d) {
        d.innerHTML += `<span class="${css}">${msg}</span><br>`; 
        d.scrollTop=d.scrollHeight; 
    }
}

function spawnDamageNumber(targetRef, amount) {
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
}

function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }

// --- CONTROLE DA INTERFACE ---
function toggleStats() {
    if(isShopOpen) return; 
    isStatWindowOpen = !isStatWindowOpen;
    document.getElementById('stat-window').style.display = isStatWindowOpen ? 'block' : 'none';
    if(isStatWindowOpen) {
        isInvWindowOpen = false; 
        document.getElementById('inventory-window').style.display = 'none';
        window.location.href = `byond://?src=${BYOND_REF}&action=request_status`;
    }
}

function toggleInventory() {
    if(blockSync) return;
    if(isShopOpen) { toggleShop(); return; }
    isInvWindowOpen = !isInvWindowOpen;
    document.getElementById('inventory-window').style.display = isInvWindowOpen ? 'flex' : 'none';
    if(isInvWindowOpen) {
        isStatWindowOpen = false;
        document.getElementById('stat-window').style.display = 'none';
        window.location.href = `byond://?src=${BYOND_REF}&action=request_inventory`;
    }
}

function toggleShop() {
    isShopOpen = !isShopOpen;
    document.getElementById('shop-window').style.display = isShopOpen ? 'flex' : 'none';
    isInvWindowOpen = isShopOpen;
    document.getElementById('inventory-window').style.display = isInvWindowOpen ? 'flex' : 'none';
    if(!isShopOpen) document.getElementById('shop-list').innerHTML = "";
}

function openShop(json) {
    if(!isShopOpen) toggleShop();
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
}

function buyItem(typepath) {
    if(blockSync) return;
    blockSync = true;
    window.location.href = `byond://?src=${BYOND_REF}&action=buy_item&type=${typepath}`;
    setTimeout(() => { blockSync = false; }, 200);
}

function sellItem(ref) {
    if(blockSync) return;
    if(confirm("Vender este item?")) {
        blockSync = true;
        window.location.href = `byond://?src=${BYOND_REF}&action=sell_item&ref=${ref}`;
        setTimeout(() => { blockSync = false; }, 200);
    }
}

function trashItem(ref) {
    if(blockSync) return;
    if(confirm("Tem certeza? O item será DESTRUÍDO para sempre.")) {
        blockSync = true;
        window.location.href = `byond://?src=${BYOND_REF}&action=trash_item&ref=${ref}`;
        setTimeout(() => { blockSync = false; }, 200);
    }
}

function hideTooltip() { document.getElementById('tooltip').style.display = 'none'; }

function loadInventory(json) {
    hideTooltip(); 
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
                this.style.display = 'none';
                if(this.parentElement) {
                    this.parentElement.style.backgroundColor = '#444';
                    this.parentElement.innerText = "?";
                    this.parentElement.style.display = "flex"; this.parentElement.style.justifyContent = "center"; this.parentElement.style.alignItems = "center";
                }
            };
            slotDiv.appendChild(img);
            if(item.amount > 1) {
                const qtyDiv = document.createElement('div'); qtyDiv.className = 'inv-qty'; qtyDiv.innerText = "x" + item.amount; slotDiv.appendChild(qtyDiv);
            }
            slotDiv.onmousemove = function(e) {
                const tip = document.getElementById('tooltip');
                tip.style.display = 'block'; tip.style.left = (e.pageX + 10) + 'px'; tip.style.top = (e.pageY + 10) + 'px';
                let priceTxt = isShopOpen ? `<br><span style='color:#2ecc71'>Venda: ${Math.round(item.price/10)}</span>` : "";
                tip.innerHTML = `<strong>${item.name}</strong>${item.desc}<br><span style='color:#aaa'>Dano: ${item.power}</span>${priceTxt}`;
            };
            slotDiv.onmouseout = function() { hideTooltip(); };
            const actionsDiv = document.createElement('div'); actionsDiv.className = 'inv-actions';
            if(isShopOpen) actionsDiv.innerHTML += `<button class="action-btn btn-sell" style="display:block" onclick="sellItem('${item.ref}')">Vender</button>`;
            else { actionsDiv.innerHTML += `<button class="action-btn" onclick="equipItem('${item.ref}')">Equipar</button>`; actionsDiv.innerHTML += `<button class="action-btn" onclick="dropItem('${item.ref}', ${item.amount})">Largar</button>`; }
            actionsDiv.innerHTML += `<button class="action-btn btn-trash" onclick="trashItem('${item.ref}')">Lixo</button>`;
            slotDiv.appendChild(actionsDiv);
        } else slotDiv.style.opacity = "0.3";
        grid.appendChild(slotDiv);
    }
}

function updateStatusMenu(json) {
    let data; try { data = JSON.parse(json); } catch(e) { return; }
    document.getElementById('stat-name').innerText = data.nick; document.getElementById('stat-class').innerText = data.class; document.getElementById('stat-title').innerText = data.title;
    if(data.lvl) document.getElementById('stat-lvl').innerText = data.lvl;
    if(data.pp !== undefined) {
        document.getElementById('prof-punch').innerText = data.pp; document.getElementById('bar-punch').style.width = Math.min(100, (data.pp_x / data.pp_r) * 100) + "%";
        document.getElementById('prof-kick').innerText = data.pk; document.getElementById('bar-kick').style.width = Math.min(100, (data.pk_x / data.pk_r) * 100) + "%";
        document.getElementById('prof-sword').innerText = data.ps; document.getElementById('bar-sword').style.width = Math.min(100, (data.ps_x / data.ps_r) * 100) + "%";
        document.getElementById('prof-gun').innerText = data.pg; document.getElementById('bar-gun').style.width = Math.min(100, (data.pg_x / data.pg_r) * 100) + "%";
    }
    function updateSlot(slotName, itemData) {
        const div = document.getElementById('slot-' + slotName); div.innerHTML = "";
        if(itemData) {
            const img = document.createElement('img'); img.className = 'equip-icon'; img.src = itemData.id + "_img.png";
            img.onerror = function() { this.style.backgroundColor = '#777'; };
            div.appendChild(img); div.onclick = function() { unequipItem(slotName); }; div.title = "Desequipar " + itemData.name;
        } else {
            const label = document.createElement('label'); label.innerText = slotName.charAt(0).toUpperCase() + slotName.slice(1);
            div.appendChild(label); div.onclick = null; div.title = "Vazio";
        }
    }
    updateSlot('hand', data.equip.hand);
}

function equipItem(ref) { if(blockSync) return; hideTooltip(); blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=equip_item&ref=${ref}`; setTimeout(() => { blockSync = false; }, 200); }
function unequipItem(slotName) { if(blockSync) return; blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=unequip_item&slot=${slotName}`; setTimeout(() => { blockSync = false; }, 200); }
function dropItem(ref, maxAmount) { if(blockSync) return; hideTooltip(); let qty = 1; if(maxAmount > 1) { let input = prompt(`Quantos? (Máx: ${maxAmount})`, "1"); if(input===null) return; qty = parseInt(input); if(isNaN(qty) || qty <= 0) return; if(qty > maxAmount) qty = maxAmount; } blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=drop_item&ref=${ref}&amount=${qty}`; setTimeout(() => { blockSync = false; }, 200); }
function addStat(statName) { if(blockSync) return; blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=add_stat&stat=${statName}`; setTimeout(function() { blockSync = false; }, 200); }

window.addEventListener('keydown', function(e) {
    const k = e.key.toLowerCase();
    if(k === 'c') toggleStats(); if(k === 'i') toggleInventory(); if(k === 'x') interact();
    if(k === 'e' && !blockSync) { blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=pick_up`; setTimeout(function() { blockSync = false; }, 300); }
    if(k === 'r' && !blockSync) { blockSync = true; window.location.href = `byond://?src=${BYOND_REF}&action=toggle_rest`; setTimeout(function() { blockSync = false; }, 500); }
    if(e.key === 'Shift') isRunning = true;
});
window.addEventListener('keyup', function(e) { if(e.key === 'Shift') isRunning = false; });

function interact() {
    let targetRef = ""; for(let id in otherPlayers) { let dist = playerGroup.position.distanceTo(otherPlayers[id].mesh.position); if(dist < 3.0) { targetRef = id; break; } }
    if(targetRef !== "") window.location.href = `byond://?src=${BYOND_REF}&action=interact_npc&ref=${targetRef}`;
}

const tempBoxPlayer = new THREE.Box3(); const tempBoxObstacle = new THREE.Box3(); const playerSize = new THREE.Vector3(0.5, 1.8, 0.5); 
function getGroundHeightAt(x, z) {
    let maxY = 0; if(!Engine.collidables) return maxY;
    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i]; if(!obj) continue;
        if(obj.userData.standable) { tempBoxObstacle.setFromObject(obj); if(x >= tempBoxObstacle.min.x && x <= tempBoxObstacle.max.x && z >= tempBoxObstacle.min.z && z <= tempBoxObstacle.max.z) { if(tempBoxObstacle.max.y > maxY) maxY = tempBoxObstacle.max.y; } }
    }
    return maxY;
}
function checkCollision(x, y, z) {
    if(!Engine.collidables) return false; tempBoxPlayer.setFromCenterAndSize(new THREE.Vector3(x, y + 0.9, z), playerSize);
    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i]; if(!obj) continue;
        tempBoxObstacle.setFromObject(obj); if (tempBoxPlayer.intersectsBox(tempBoxObstacle)) { if(obj.userData.standable && y >= tempBoxObstacle.max.y - 0.1) continue; return true; }
    }
    return false; 
}

window.addEventListener('game-action', function(e) {
    if(isFainted) return; const k = e.detail;
    if(k === 'd') performAttack("sword"); else if(k === 'f') performAttack("gun"); else if(k === 'a') performAttack("fist"); else if(k === 's') performAttack("kick");
    else if(k === 'p' && !blockSync) { blockSync = true; window.location.href = "byond://?src=" + BYOND_REF + "&action=force_save"; addLog("Salvando...", "log-miss"); setTimeout(function() { blockSync = false; }, 500); }
});

function fireProjectile(projectileDef, isMine) {
    const geo = new THREE.BoxGeometry(1, 1, 1); const mat = new THREE.MeshBasicMaterial({ color: projectileDef.color }); const bullet = new THREE.Mesh(geo, mat);
    const s = projectileDef.scale || [0.1, 0.1, 0.1]; bullet.scale.set(s[0], s[1], s[2]);
    const origin = isMine ? playerGroup : (otherPlayers[projectileDef.ownerID] ? otherPlayers[projectileDef.ownerID].mesh : null);
    if(!origin) return; 
    const bodyRot = origin.rotation.y; const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
    bullet.position.copy(origin.position); bullet.position.y += 1.3; 
    bullet.position.x += sin * 0.5 - cos * 0.4; bullet.position.z += cos * 0.5 + sin * 0.4; 
    bullet.rotation.y = bodyRot; Engine.scene.add(bullet);
    activeProjectiles.push({ mesh: bullet, dirX: sin, dirZ: cos, speed: projectileDef.speed, distTraveled: 0, maxDist: projectileDef.range || 10, isMine: isMine });
}

// NOVA FUNÇÃO COM SUPORTE A DADOS CUSTOMIZADOS (E OFFSET Y)
function spawnHitbox(size, forwardOffset, lifetime, customData, yOffset) {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mat = new THREE.MeshBasicMaterial({ color: 0xFF0000, wireframe: true, transparent: true, opacity: 0.3 });
    const hitbox = new THREE.Mesh(geo, mat);
    hitbox.position.copy(playerGroup.position); 
    
    // Altura customizável (Padrão 1.0)
    hitbox.position.y += (yOffset !== undefined ? yOffset : 1.0); 

    const bodyRot = playerGroup.rotation.y; const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
    hitbox.position.x += sin * forwardOffset; hitbox.position.z += cos * forwardOffset; hitbox.rotation.y = bodyRot;
    Engine.scene.add(hitbox);
    activeHitboxes.push({ mesh: hitbox, startTime: Date.now(), duration: lifetime, hasHit: [], data: customData || {} });
}

const tempBoxAttacker = new THREE.Box3(); const tempBoxTarget = new THREE.Box3();
function updateCombatHitboxes() {
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const p = activeProjectiles[i]; p.mesh.position.x += p.dirX * p.speed; p.mesh.position.z += p.dirZ * p.speed; p.distTraveled += p.speed;
        if (p.isMine) { tempBoxAttacker.setFromObject(p.mesh); checkCollisions(tempBoxAttacker, "projectile", p); }
        if (p.distTraveled >= p.maxDist) { Engine.scene.remove(p.mesh); activeProjectiles.splice(i, 1); }
    }
    const now = Date.now();
    for (let i = activeHitboxes.length - 1; i >= 0; i--) {
        const hb = activeHitboxes[i]; if (now - hb.startTime > hb.duration) { Engine.scene.remove(hb.mesh); activeHitboxes.splice(i, 1); continue; }
        tempBoxAttacker.setFromObject(hb.mesh); checkCollisions(tempBoxAttacker, "melee", hb);
    }
}

function checkCollisions(attackerBox, type, objRef) {
    for (let id in otherPlayers) {
        const target = otherPlayers[id]; if(target.fainted) continue;
        if(type === "melee" && objRef.hasHit.includes(id)) continue;
        tempBoxTarget.setFromObject(target.mesh);
        if (attackerBox.intersectsBox(tempBoxTarget)) {
            let extra = "";
            if(type === "melee" && objRef.data && objRef.data.step) extra = `&combo=${objRef.data.step}`;
            if(typeof BYOND_REF !== 'undefined') window.location.href = `byond://?src=${BYOND_REF}&action=register_hit&target_ref=${id}&hit_type=${type}${extra}`;
            if(type === "projectile") { Engine.scene.remove(objRef.mesh); objRef.distTraveled = 99999; } else if(type === "melee") { objRef.hasHit.push(id); objRef.mesh.material.color.setHex(0xFFFFFF); }
        }
    }
}

function performAttack(type) {
    if(isAttacking || !isCharacterReady) return; 
    const equippedItem = playerGroup.userData.lastItem;
    let hasSword = false; let hasGun = false; let projectileData = null;
    if(equippedItem && GameDefinitions[equippedItem]) {
        const def = GameDefinitions[equippedItem]; const tags = def.tags || (def.data ? def.data.tags : []);
        if(tags && tags.includes("sword")) hasSword = true; if(tags && tags.includes("gun")) { hasGun = true; projectileData = def.projectile; }
    }
    if(type === "sword" && !hasSword) { addLog("Sem espada!", "log-miss"); return; }
    if(type === "gun" && !hasGun) { addLog("Sem arma!", "log-miss"); return; }
    
    isAttacking = true; 
    lastCombatActionTime = Date.now();

    let windupStance = "SWORD_WINDUP"; 
    let atkStance = "SWORD_ATK_1"; 
    let idleStance = "SWORD_IDLE";

    // --- COMBO SOCO ---
    if(type === "fist") {
        if(Date.now() - lastFistAttackTime > 600) fistComboStep = 0;
        fistComboStep++; if(fistComboStep > 3) fistComboStep = 1; 
        lastFistAttackTime = Date.now();
        windupStance = "FIST_WINDUP"; atkStance = "FIST_COMBO_" + fistComboStep; idleStance = "FIST_IDLE";
        
        // Dash Soco
        let pushDist = (fistComboStep === 3) ? 1.5 : 0.5; 
        const sin = Math.sin(playerGroup.rotation.y); const cos = Math.cos(playerGroup.rotation.y);
        const nextX = playerGroup.position.x + sin * pushDist; const nextZ = playerGroup.position.z + cos * pushDist;
        if(!checkCollision(nextX, playerGroup.position.y, nextZ)) { playerGroup.position.x = nextX; playerGroup.position.z = nextZ; }
    }
    // --- COMBO CHUTE (NOVO) ---
    else if(type === "kick") { 
        if(Date.now() - lastKickAttackTime > 600) kickComboStep = 0;
        kickComboStep++; if(kickComboStep > 3) kickComboStep = 1;
        lastKickAttackTime = Date.now();
        
        windupStance = "KICK_WINDUP"; atkStance = "KICK_COMBO_" + kickComboStep; idleStance = "FIST_IDLE";

        // Dash Chute (Menor no 1 e 2, Maior no 3)
        let pushDist = (kickComboStep === 3) ? 1.2 : 0.4;
        const sin = Math.sin(playerGroup.rotation.y); const cos = Math.cos(playerGroup.rotation.y);
        const nextX = playerGroup.position.x + sin * pushDist; const nextZ = playerGroup.position.z + cos * pushDist;
        if(!checkCollision(nextX, playerGroup.position.y, nextZ)) { playerGroup.position.x = nextX; playerGroup.position.z = nextZ; }
    }
    else if(type === "sword") { windupStance = "SWORD_WINDUP"; atkStance = "SWORD_ATK_1"; idleStance = "SWORD_IDLE"; }
    else if(type === "gun") { windupStance = "GUN_IDLE"; atkStance = "GUN_ATK"; idleStance = "GUN_IDLE"; }
    
    charState = windupStance; 
    setTimeout(function() {
        charState = atkStance;
        if(type === "gun" && projectileData) fireProjectile(projectileData, true);
        else if (type === "fist") {
            if(fistComboStep === 3) spawnHitbox({x:1.5, y:1.5, z:1.5}, 1.5, 200, {step: 3}); 
            else spawnHitbox({x:1, y:1, z:1}, 1.0, 200, {step: fistComboStep}); 
        }
        // --- HITBOX CHUTE (ALTURA VARIÁVEL) ---
        else if (type === "kick") {
            if(kickComboStep === 1) spawnHitbox({x:1.2, y:0.8, z:1.2}, 1.0, 300, {step: 1}, 0.5); // Baixo
            else if(kickComboStep === 2) spawnHitbox({x:1.2, y:1.0, z:1.2}, 1.2, 300, {step: 2}, 1.0); // Médio
            else spawnHitbox({x:1.5, y:1.2, z:1.5}, 1.4, 300, {step: 3}, 1.7); // Alto
        }
        else if (type === "sword") spawnHitbox({x:2.5, y:1, z:2.5}, 1.5, 300);
        
        if(typeof BYOND_REF !== 'undefined') { 
            blockSync = true; 
            window.location.href = `byond://?src=${BYOND_REF}&action=attack&type=${type}`; 
            setTimeout(function(){blockSync=false}, 200); 
        }
        
        setTimeout(function() { 
            charState = idleStance; 
            isAttacking = false; 
        }, 300);
    }, 100); 
}

function receberDadosMultiplayer(json) {
    lastPacketTime = Date.now();
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    const me = packet.me; myID = packet.my_id; const now = performance.now();

    if(me.loaded == 1 && !isCharacterReady) {
        if(packet.others[myID] && packet.others[myID].skin) {
            const myData = packet.others[myID];
            playerGroup = CharFactory.createCharacter(myData.skin, myData.cloth);
            playerGroup.visible = true; playerGroup.position.set(myData.x, myData.y, myData.z);
            Engine.scene.add(playerGroup); isCharacterReady = true; Input.camAngle = myData.rot + Math.PI; 
        }
    }
    if(isCharacterReady) {
        // --- 1. ITENS NO CHÃO ---
        const serverGroundItems = packet.ground || [];
        const seenItems = new Set();
        let closestDist = 999;

        serverGroundItems.forEach(itemData => {
            seenItems.add(itemData.ref);
            if(!groundItemsMeshes[itemData.ref]) {
                const mesh = CharFactory.createFromDef(itemData.id);
                mesh.position.set(itemData.x, 0.5, itemData.z); 
                Engine.scene.add(mesh);
                groundItemsMeshes[itemData.ref] = mesh;
            } else {
                const mesh = groundItemsMeshes[itemData.ref];
                mesh.position.x = lerp(mesh.position.x, itemData.x, 0.2);
                mesh.position.z = lerp(mesh.position.z, itemData.z, 0.2);
            }
            const d = playerGroup.position.distanceTo(groundItemsMeshes[itemData.ref].position);
            if(d < closestDist) closestDist = d;
        });

        for(let ref in groundItemsMeshes) {
            if(!seenItems.has(ref)) {
                Engine.scene.remove(groundItemsMeshes[ref]);
                delete groundItemsMeshes[ref];
            }
        }

        // --- 2. INTERAÇÃO ---
        const hint = document.getElementById('interaction-hint');
        let npcNear = false;
        for(let id in otherPlayers) {
            if(otherPlayers[id].isNPC) { 
                 let d = playerGroup.position.distanceTo(otherPlayers[id].mesh.position);
                 if(d < 3.0) npcNear = true;
            }
        }

        if(closestDist < 2.0) { hint.innerText = "[E] Pegar Item"; hint.style.display = 'block'; }
        else if(npcNear) { hint.innerText = "[X] Interagir"; hint.style.display = 'block'; }
        else hint.style.display = 'none';

        // --- 3. DADOS ---
        const myData = packet.others[myID]; isResting = me.rest; isFainted = me.ft; 
        
        if(me.gen) playerGroup.userData.gender = me.gen;

        if(myData && myData.it !== undefined) {
            if(playerGroup.userData.lastItem !== myData.it) {
                CharFactory.equipItem(playerGroup, myData.it); playerGroup.userData.lastItem = myData.it;
            }
        }
        
        const overlay = document.getElementById('faint-overlay');
        if(me.rem > 0 && isFainted) {
            overlay.style.display = 'flex';
            document.getElementById('faint-timer').innerText = me.rem;
        } else {
            overlay.style.display = 'none';
        }
        
        if(me.mspd) currentMoveSpeed = me.mspd;
        if(me.jmp) currentJumpForce = me.jmp;

        if(myData && myData.name && myData.name !== cachedName) {
            document.getElementById('name-display').innerText = myData.name;
            cachedName = myData.name;
        }
        if(me.lvl !== cachedLvl) {
            document.getElementById('lvl-display').innerText = me.lvl;
            cachedLvl = me.lvl;
        }
        if(me.gold !== cachedGold) {
            document.getElementById('gold-display').innerText = me.gold;
            cachedGold = me.gold;
        }
        
        if(me.hp !== cachedHP || me.max_hp !== cachedMaxHP) {
            const pct = Math.max(0, Math.min(100, (me.hp / me.max_hp) * 100));
            document.getElementById('hp-bar-fill').style.width = pct + "%";
            document.getElementById('hp-text').innerText = me.hp + "/" + me.max_hp;
            cachedHP = me.hp; cachedMaxHP = me.max_hp;
        }

        if(me.en !== cachedEn || me.max_en !== cachedMaxEn) {
            const pct = Math.max(0, Math.min(100, (me.en / me.max_en) * 100));
            document.getElementById('en-bar-fill').style.width = pct + "%";
            document.getElementById('en-text').innerText = Math.floor(me.en) + "/" + me.max_en;
            cachedEn = me.en; cachedMaxEn = me.max_en;
        }

        if(me.exp !== cachedExp || me.req_exp !== cachedReqExp) {
            const xpPct = Math.max(0, Math.min(100, (me.exp / me.req_exp) * 100));
            document.getElementById('xp-bar-fill').style.width = xpPct + "%";
            cachedExp = me.exp; cachedReqExp = me.req_exp;
        }

        if(me.pts !== undefined) {
            if(me.pts !== cachedPts || me.str !== cachedStats.str || me.pp !== cachedProfs.pp) {
                document.getElementById('stat-points').innerText = me.pts;
                document.getElementById('val-str').innerText = me.str;
                document.getElementById('val-vit').innerText = me.vit;
                document.getElementById('val-agi').innerText = me.agi;
                document.getElementById('val-wis').innerText = me.wis;
                
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

                cachedPts = me.pts;
                cachedStats = { str: me.str, vit: me.vit, agi: me.agi, wis: me.wis };
                cachedProfs = { pp: me.pp, pk: me.pk, ps: me.ps, pg: me.pg };
            }
        }
        
        if(packet.evts) packet.evts.forEach(evt => { if(evt.type === "dmg") spawnDamageNumber(evt.tid, evt.val); });
    }

    const serverPlayers = packet.others; const receivedIds = new Set();
    for (const id in serverPlayers) {
        if (id === myID) continue; receivedIds.add(id); const pData = serverPlayers[id];
        if (!otherPlayers[id]) {
            if(pData.skin) {
                const newChar = CharFactory.createCharacter(pData.skin, pData.cloth);
                newChar.position.set(pData.x, pData.y, pData.z); Engine.scene.add(newChar); Engine.collidables.push(newChar);
                const label = document.createElement('div'); label.className = 'name-label'; label.innerHTML = `<div class="name-text">${pData.name||"?"}</div><div class="mini-hp-bg"><div class="mini-hp-fill"></div></div>`; document.getElementById('labels-container').appendChild(label);
                otherPlayers[id] = { mesh: newChar, label: label, hpFill: label.querySelector('.mini-hp-fill'), startX: pData.x, startY: pData.y, startZ: pData.z, startRot: pData.rot, targetX: pData.x, targetY: pData.y, targetZ: pData.z, targetRot: pData.rot, lastPacketTime: now, lerpDuration: 180, attacking: pData.a, attackType: pData.at, resting: pData.rest, fainted: pData.ft, lastItem: "", isNPC: (pData.npc === 1), npcType: pData.type, gender: pData.gen };
            }
        } else {
            const other = otherPlayers[id];
            other.startX = other.mesh.position.x; other.startY = other.mesh.position.y; other.startZ = other.mesh.position.z; other.startRot = other.mesh.rotation.y;
            other.targetX = pData.x; other.targetY = pData.y; other.targetZ = pData.z; other.targetRot = pData.rot; other.lastPacketTime = now;
            other.attacking = pData.a; other.attackType = pData.at; other.resting = pData.rest; other.fainted = pData.ft;
            if(pData.gen) other.gender = pData.gen;
            
            if(pData.name && other.label.querySelector('.name-text').innerText !== pData.name) {
                other.label.querySelector('.name-text').innerText = pData.name;
            }

            if(pData.hp !== undefined && other.hpFill) other.hpFill.style.width = Math.max(0, Math.min(100, (pData.hp / pData.mhp) * 100)) + "%";
            if(pData.it !== undefined && pData.it !== other.lastItem) { CharFactory.equipItem(other.mesh, pData.it); other.lastItem = pData.it; }
            if (other.attacking && other.attackType === "gun" && !other.hasFiredThisCycle) { fireProjectile({ speed: 0.6, color: 0xFFFF00, ownerID: id }, false); other.hasFiredThisCycle = true; setTimeout(() => { other.hasFiredThisCycle = false; }, 500); }
        }
    }
    for (const id in otherPlayers) { if (!receivedIds.has(id)) { Engine.scene.remove(otherPlayers[id].mesh); otherPlayers[id].label.remove(); delete otherPlayers[id]; } }
}

function shouldSendPosition(x, y, z, rot, now) { if (now - lastSentTime < POSITION_SYNC_INTERVAL) return false; if (Math.abs(x - lastSentX) < POSITION_EPSILON && Math.abs(y - lastSentY) < POSITION_EPSILON && Math.abs(z - lastSentZ) < POSITION_EPSILON && Math.abs(rot - lastSentRot) < POSITION_EPSILON) return false; return true; }
function sendPositionUpdate(now) { if (!isCharacterReady || blockSync || typeof BYOND_REF === 'undefined') return; const x = round2(playerGroup.position.x); const y = round2(playerGroup.position.y); const z = round2(playerGroup.position.z); const rot = round2(playerGroup.rotation.y); if (!shouldSendPosition(x, y, z, rot, now)) return; lastSentTime = now; lastSentX = x; lastSentY = y; lastSentZ = z; lastSentRot = rot; let runFlag = (isRunning && !isResting) ? 1 : 0; window.location.href = `byond://?src=${BYOND_REF}&action=update_pos&x=${x}&y=${y}&z=${z}&rot=${rot}&run=${runFlag}`; }

// --- GAME LOOP COM NOVA ANIMAÇÃO ---
function animate() {
    requestAnimationFrame(animate); animTime += 0.1; const now = performance.now();
    updateCombatHitboxes(); 
    if (isCharacterReady) {
        if(!isAttacking && charState !== "DEFAULT") { if(Date.now() - lastCombatActionTime > 3000) charState = "DEFAULT"; }
        const groundHeight = getGroundHeightAt(playerGroup.position.x, playerGroup.position.z);

        if(isFainted) {
            playerGroup.rotation.x = lerp(playerGroup.rotation.x, -Math.PI/2, 0.1); playerGroup.position.y = lerp(playerGroup.position.y, groundHeight + 0.2, 0.1);
        } else if(isResting) {
            // POSE UNIFICADA: SIMPLES (Pernas Retas)
            playerGroup.rotation.x = lerp(playerGroup.rotation.x, 0, 0.1); 
            const yOffset = -0.6; 
            playerGroup.position.y = lerp(playerGroup.position.y, groundHeight + yOffset, 0.1);
            
            const restStance = STANCES.REST_SIMPLE;
            const limbs = playerGroup.userData.limbs;
            if(limbs && restStance) {
                const spd = 0.1;
                // INCLUI A COLUNA (TORSO)
                if(restStance.torso) lerpLimbRotation(limbs.torso, restStance.torso, spd);
                lerpLimbRotation(limbs.leftLeg, restStance.leftLeg, spd); lerpLimbRotation(limbs.rightLeg, restStance.rightLeg, spd);
                lerpLimbRotation(limbs.leftShin, restStance.leftShin, spd); lerpLimbRotation(limbs.rightShin, restStance.rightShin, spd);
                lerpLimbRotation(limbs.leftArm, restStance.leftArm, spd); lerpLimbRotation(limbs.rightArm, restStance.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, restStance.leftForeArm, spd); lerpLimbRotation(limbs.rightForeArm, restStance.rightForeArm, spd);
            }

        } else {
            let moveX = 0, moveZ = 0, moving = false; let speed = currentMoveSpeed * (isRunning ? 1.5 : 1); 
            const sin = Math.sin(Input.camAngle); const cos = Math.cos(Input.camAngle);
            if(Input.keys.arrowup) { moveX -= sin*speed; moveZ -= cos*speed; moving = true; }
            if(Input.keys.arrowdown) { moveX += sin*speed; moveZ += cos*speed; moving = true; }
            if(Input.keys.arrowleft) { moveX -= cos*speed; moveZ += sin*speed; moving = true; }
            if(Input.keys.arrowright) { moveX += cos*speed; moveZ -= sin*speed; moving = true; }

            const nextX = playerGroup.position.x + moveX; const nextZ = playerGroup.position.z + moveZ;
            if(!checkCollision(nextX, playerGroup.position.y, nextZ)) { playerGroup.position.x = nextX; playerGroup.position.z = nextZ; }
            
            if(moving) {
                const targetCharRot = Math.atan2(moveX, moveZ); playerGroup.rotation.y = targetCharRot;
                if(!Input.keys.arrowdown && !Input.mouseRight) Input.camAngle = lerpAngle(Input.camAngle, targetCharRot + Math.PI, 0.02);
            }
            if(Input.keys[" "] && !isJumping && Math.abs(playerGroup.position.y - groundHeight) < 0.1) { verticalVelocity = currentJumpForce; isJumping = true; }
            playerGroup.position.y += verticalVelocity; verticalVelocity += gravity;
            if(playerGroup.position.y < groundHeight) { playerGroup.position.y = groundHeight; isJumping = false; verticalVelocity = 0; }
            playerGroup.rotation.x = lerp(playerGroup.rotation.x, 0, 0.2); 

            // --- ANIMATION SYSTEM 2.0 (ARTICULADO) ---
            const limbs = playerGroup.userData.limbs;
            if(limbs) {
                let targetStance = STANCES[charState] || STANCES.DEFAULT;
                const def = STANCES.DEFAULT; 

                if(moving && !isJumping && !isAttacking) {
                    let legSpeed = isRunning ? 0.3 : 0.8; 
                    limbs.leftLeg.rotation.x = Math.sin(animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                    limbs.rightLeg.rotation.x = -Math.sin(animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                    limbs.leftShin.rotation.x = (limbs.leftLeg.rotation.x > 0) ? limbs.leftLeg.rotation.x : 0;
                    limbs.rightShin.rotation.x = (limbs.rightLeg.rotation.x > 0) ? limbs.rightLeg.rotation.x : 0;

                    if(charState === "DEFAULT") {
                        limbs.leftArm.rotation.x = -Math.sin(animTime)*legSpeed;
                        limbs.rightArm.rotation.x = Math.sin(animTime)*legSpeed;
                        limbs.leftForeArm.rotation.x = -0.2;
                        limbs.rightForeArm.rotation.x = -0.2;
                        // Reseta Torso
                        lerpLimbRotation(limbs.torso, def.torso, 0.1);
                    } else {
                        lerpLimbRotation(limbs.leftArm, targetStance.leftArm || def.leftArm, 0.2);
                        lerpLimbRotation(limbs.rightArm, targetStance.rightArm || def.rightArm, 0.2);
                        lerpLimbRotation(limbs.leftForeArm, targetStance.leftForeArm || def.leftForeArm, 0.2);
                        lerpLimbRotation(limbs.rightForeArm, targetStance.rightForeArm || def.rightForeArm, 0.2);
                        // Torso segue a arma
                        lerpLimbRotation(limbs.torso, targetStance.torso || def.torso, 0.2);
                    }
                } else {
                    const spd = isAttacking ? 0.4 : 0.1;
                    
                    // --- AQUI APLICAMOS O TORSO ---
                    if(targetStance.torso) lerpLimbRotation(limbs.torso, targetStance.torso, spd);
                    else lerpLimbRotation(limbs.torso, def.torso, spd);

                    lerpLimbRotation(limbs.leftArm, targetStance.leftArm || def.leftArm, spd);
                    lerpLimbRotation(limbs.rightArm, targetStance.rightArm || def.rightArm, spd);
                    lerpLimbRotation(limbs.leftForeArm, targetStance.leftForeArm || def.leftForeArm, spd);
                    lerpLimbRotation(limbs.rightForeArm, targetStance.rightForeArm || def.rightForeArm, spd);
                    
                    lerpLimbRotation(limbs.leftLeg, targetStance.leftLeg || def.leftLeg, spd);
                    lerpLimbRotation(limbs.rightLeg, targetStance.rightLeg || def.rightLeg, spd);
                    lerpLimbRotation(limbs.leftShin, targetStance.leftShin || def.leftShin, spd);
                    lerpLimbRotation(limbs.rightShin, targetStance.rightShin || def.rightShin, spd);
                }
            }
        }
        Engine.camera.position.set(playerGroup.position.x + Math.sin(Input.camAngle)*7, playerGroup.position.y + 5, playerGroup.position.z + Math.cos(Input.camAngle)*7);
        Engine.camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.5, playerGroup.position.z);
        sendPositionUpdate(now);
    }
    
    // Render Other Players
    for(const id in otherPlayers) {
        const other = otherPlayers[id]; const mesh = other.mesh; const elapsed = other.lastPacketTime ? (now - other.lastPacketTime) : 0; const t = other.lerpDuration ? Math.min(1, elapsed / other.lerpDuration) : 1;
        mesh.position.x = lerp(other.startX, other.targetX, t); mesh.position.y = lerp(other.startY, other.targetY, t); mesh.position.z = lerp(other.startZ, other.targetZ, t); mesh.rotation.y = lerpAngle(other.startRot, other.targetRot, t);
        
        const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2)); const isMoving = dist > 0.05;
        const limbs = mesh.userData.limbs;
        if(limbs) {
            let remoteStance = STANCES.DEFAULT;
            const def = STANCES.DEFAULT;

            if (other.fainted) {
                mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1); 
                mesh.position.y = lerp(mesh.position.y, 0.2, 0.1);
            }
            else if (other.resting) {
                mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1);
                const yOffset = -0.6;
                mesh.position.y = lerp(mesh.position.y, other.targetY + yOffset, 0.1); 

                const restStance = STANCES.REST_SIMPLE;
                if(restStance) {
                    const spd = 0.1;
                    if(restStance.torso) lerpLimbRotation(limbs.torso, restStance.torso, spd);
                    lerpLimbRotation(limbs.leftLeg, restStance.leftLeg, spd); lerpLimbRotation(limbs.rightLeg, restStance.rightLeg, spd);
                    lerpLimbRotation(limbs.leftShin, restStance.leftShin, spd); lerpLimbRotation(limbs.rightShin, restStance.rightShin, spd);
                    lerpLimbRotation(limbs.leftArm, restStance.leftArm, spd); lerpLimbRotation(limbs.rightArm, restStance.rightArm, spd);
                    lerpLimbRotation(limbs.leftForeArm, restStance.leftForeArm, spd); lerpLimbRotation(limbs.rightForeArm, restStance.rightForeArm, spd);
                }
            } else {
                if(other.attacking) {
                    if(other.attackType === "sword") remoteStance = STANCES.SWORD_ATK_1; 
                    else if(other.attackType === "fist") remoteStance = STANCES.FIST_COMBO_1;
                    else if(other.attackType === "kick") remoteStance = STANCES.KICK_COMBO_1; // Usa chute 1 como padrão pra outros
                    else if(other.attackType === "gun") remoteStance = STANCES.GUN_ATK;
                    
                    if(remoteStance.torso) lerpLimbRotation(limbs.torso, remoteStance.torso, 0.4);
                    lerpLimbRotation(limbs.leftArm, remoteStance.leftArm || def.leftArm, 0.4); lerpLimbRotation(limbs.rightArm, remoteStance.rightArm || def.rightArm, 0.4);
                    lerpLimbRotation(limbs.leftForeArm, remoteStance.leftForeArm || def.leftForeArm, 0.4); lerpLimbRotation(limbs.rightForeArm, remoteStance.rightForeArm || def.rightForeArm, 0.4);
                    lerpLimbRotation(limbs.leftLeg, remoteStance.leftLeg || def.leftLeg, 0.4); lerpLimbRotation(limbs.rightLeg, remoteStance.rightLeg || def.rightLeg, 0.4);
                } else if(isMoving) {
                    limbs.leftLeg.rotation.x = Math.sin(animTime)*0.8; limbs.rightLeg.rotation.x = -Math.sin(animTime)*0.8;
                    limbs.leftShin.rotation.x = (limbs.leftLeg.rotation.x > 0) ? limbs.leftLeg.rotation.x : 0;
                    limbs.rightShin.rotation.x = (limbs.rightLeg.rotation.x > 0) ? limbs.rightLeg.rotation.x : 0;
                    limbs.leftArm.rotation.x = -Math.sin(animTime)*0.8; limbs.rightArm.rotation.x = Math.sin(animTime)*0.8;
                    // Torso neutro ao andar
                    lerpLimbRotation(limbs.torso, def.torso, 0.1);
                } else {
                    lerpLimbRotation(limbs.torso, def.torso, 0.1);
                    lerpLimbRotation(limbs.leftLeg, STANCES.DEFAULT.leftLeg, 0.1); lerpLimbRotation(limbs.rightLeg, STANCES.DEFAULT.rightLeg, 0.1);
                    lerpLimbRotation(limbs.leftShin, STANCES.DEFAULT.leftShin, 0.1); lerpLimbRotation(limbs.rightShin, STANCES.DEFAULT.rightShin, 0.1);
                    lerpLimbRotation(limbs.leftArm, STANCES.DEFAULT.leftArm, 0.1); lerpLimbRotation(limbs.rightArm, STANCES.DEFAULT.rightArm, 0.1);
                }
            }
        }
        const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2, mesh.position.z); tempV.project(Engine.camera);
        other.label.style.display = (Math.abs(tempV.z) > 1) ? 'none' : 'block'; other.label.style.left = (tempV.x * .5 + .5) * window.innerWidth + 'px'; other.label.style.top = (-(tempV.y * .5) + .5) * window.innerHeight + 'px';
    }
    Engine.renderer.render(Engine.scene, Engine.camera);
}

animate();
setInterval(function() { if(isCharacterReady && Date.now() - lastPacketTime > 4000) { addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); isCharacterReady = false; } }, 1000);