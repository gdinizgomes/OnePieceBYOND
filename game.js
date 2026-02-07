// game.js - Lógica Principal do Jogo e Network

// --- VARIÁVEIS GLOBAIS ---
let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;
let lastPacketTime = Date.now();
let blockSync = false;

// Itens no Chão
const groundItemsMeshes = {}; 

// Estado do Jogo
let charState = "DEFAULT"; 
let isResting = false; 
let isFainted = false; 
let isRunning = false; 
let currentMoveSpeed = 0.08; 
let currentJumpForce = 0.20; 

let lastCombatActionTime = 0; 
let isAttacking = false; 
let animTime = 0; 
let isJumping = false; 
let verticalVelocity = 0; 
const gravity = -0.015; 

// UI State
let isStatWindowOpen = false;
let isInvWindowOpen = false; 

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

function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }

// --- CONTROLE DA INTERFACE ---
function toggleStats() {
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
    isInvWindowOpen = !isInvWindowOpen;
    document.getElementById('inventory-window').style.display = isInvWindowOpen ? 'flex' : 'none';
    
    if(isInvWindowOpen) {
        isStatWindowOpen = false;
        document.getElementById('stat-window').style.display = 'none';
        window.location.href = `byond://?src=${BYOND_REF}&action=request_inventory`;
    }
}

// Renderiza o Grid de 12 Slots - VERSÃO SEGURA (Sem Erro de Line 1)
function loadInventory(json) {
    const grid = document.getElementById('inv-grid');
    grid.innerHTML = "";
    let data = [];
    try { data = JSON.parse(json); } catch(e) { console.log(e); return; }

    for(let i = 0; i < 12; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'inv-slot';
        
        if (i < data.length) {
            const item = data[i];
            
            // --- CRIAÇÃO SEGURA DA IMAGEM ---
            const img = document.createElement('img');
            img.className = 'inv-icon';
            img.src = item.id + "_img.png";
            
            // Se falhar o carregamento, esconde e deixa cinza
            img.onerror = function() {
                this.style.display = 'none';
                if(this.parentElement) this.parentElement.style.backgroundColor = '#555';
            };
            
            slotDiv.appendChild(img);
            // --------------------------------
            
            if(item.amount > 1) {
                const qtyDiv = document.createElement('div');
                qtyDiv.className = 'inv-qty';
                qtyDiv.innerText = "x" + item.amount;
                slotDiv.appendChild(qtyDiv);
            }

            slotDiv.onmousemove = function(e) {
                const tip = document.getElementById('tooltip');
                tip.style.display = 'block';
                tip.style.left = (e.pageX + 10) + 'px';
                tip.style.top = (e.pageY + 10) + 'px';
                tip.innerHTML = `<strong>${item.name}</strong>${item.desc}<br><span style='color:#aaa'>Dano: ${item.power}</span>`;
            };
            slotDiv.onmouseout = function() { document.getElementById('tooltip').style.display = 'none'; };

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'inv-actions';
            actionsDiv.innerHTML = `
                <button class="action-btn" onclick="equipItem('${item.ref}')">Equipar</button>
                <button class="action-btn" onclick="dropItem('${item.ref}', ${item.amount})">Largar</button>
            `;
            slotDiv.appendChild(actionsDiv);
        } else {
            slotDiv.style.opacity = "0.3";
        }
        grid.appendChild(slotDiv);
    }
}

// Atualiza o Menu C
function updateStatusMenu(json) {
    let data;
    try { data = JSON.parse(json); } catch(e) { return; }
    
    document.getElementById('stat-name').innerText = data.nick;
    document.getElementById('stat-class').innerText = data.class;
    document.getElementById('stat-title').innerText = data.title;

    // --- CORREÇÃO AQUI: Atualiza o nível na tela ---
    if(data.lvl) document.getElementById('stat-lvl').innerText = data.lvl;
    
    function updateSlot(slotName, itemData) {
        const div = document.getElementById('slot-' + slotName);
        // Limpa conteúdo anterior
        div.innerHTML = "";
        
        if(itemData) {
            // Cria imagem segura também para o slot de equipamento
            const img = document.createElement('img');
            img.className = 'equip-icon';
            img.src = itemData.id + "_img.png";
            img.onerror = function() { this.style.backgroundColor = '#777'; };
            
            div.appendChild(img);
            div.onclick = function() { unequipItem(slotName); };
            div.title = "Desequipar " + itemData.name;
        } else {
            const label = document.createElement('label');
            label.innerText = slotName.charAt(0).toUpperCase() + slotName.slice(1);
            div.appendChild(label);
            div.onclick = null;
            div.title = "Vazio";
        }
    }
    
    updateSlot('hand', data.equip.hand);
}

function equipItem(ref) {
    if(blockSync) return;
    blockSync = true;
    window.location.href = `byond://?src=${BYOND_REF}&action=equip_item&ref=${ref}`;
    setTimeout(() => { blockSync = false; }, 200);
}

function unequipItem(slotName) {
    if(blockSync) return;
    blockSync = true;
    window.location.href = `byond://?src=${BYOND_REF}&action=unequip_item&slot=${slotName}`;
    setTimeout(() => { blockSync = false; }, 200);
}

function dropItem(ref, maxAmount) {
    if(blockSync) return;
    
    let qty = 1;
    if(maxAmount > 1) {
        let input = prompt(`Quantos itens largar? (Máx: ${maxAmount})`, "1");
        if(input === null) return;
        qty = parseInt(input);
        if(isNaN(qty) || qty <= 0) return;
        if(qty > maxAmount) qty = maxAmount;
    }

    blockSync = true;
    window.location.href = `byond://?src=${BYOND_REF}&action=drop_item&ref=${ref}&amount=${qty}`;
    setTimeout(() => { blockSync = false; }, 200);
}

function addStat(statName) {
    if(blockSync) return;
    if(typeof BYOND_REF === 'undefined') return;
    blockSync = true;
    window.location.href = `byond://?src=${BYOND_REF}&action=add_stat&stat=${statName}`;
    setTimeout(function() { blockSync = false; }, 200);
}

// Input de Teclas
window.addEventListener('keydown', function(e) {
    const k = e.key.toLowerCase();
    if(k === 'c') toggleStats();
    if(k === 'i') toggleInventory(); 
    if(k === 'e') {
        if(typeof BYOND_REF !== 'undefined' && !blockSync) {
            blockSync = true;
            window.location.href = `byond://?src=${BYOND_REF}&action=pick_up`;
            setTimeout(function() { blockSync = false; }, 300); 
        }
    }
    if(k === 'r') {
        if(typeof BYOND_REF !== 'undefined' && !blockSync) {
            blockSync = true;
            window.location.href = `byond://?src=${BYOND_REF}&action=toggle_rest`;
            setTimeout(function() { blockSync = false; }, 500); 
        }
    }
    if(e.key === 'Shift') isRunning = true;
});

window.addEventListener('keyup', function(e) {
    if(e.key === 'Shift') isRunning = false;
});

// --- SISTEMA DE FÍSICA ---
const tempBoxPlayer = new THREE.Box3();
const tempBoxObstacle = new THREE.Box3();
const playerSize = new THREE.Vector3(0.5, 1.8, 0.5); 

function getGroundHeightAt(x, z) {
    let maxY = 0; 
    if(!Engine.collidables) return maxY;
    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i];
        if(!obj) continue;
        if(obj.userData.standable) {
            tempBoxObstacle.setFromObject(obj);
            if(x >= tempBoxObstacle.min.x && x <= tempBoxObstacle.max.x &&
               z >= tempBoxObstacle.min.z && z <= tempBoxObstacle.max.z) {
                if(tempBoxObstacle.max.y > maxY) maxY = tempBoxObstacle.max.y;
            }
        }
    }
    return maxY;
}

function checkCollision(x, y, z) {
    if(!Engine.collidables) return false;
    tempBoxPlayer.setFromCenterAndSize(new THREE.Vector3(x, y + 0.9, z), playerSize);
    for (let i = 0; i < Engine.collidables.length; i++) {
        let obj = Engine.collidables[i];
        if(!obj) continue;
        tempBoxObstacle.setFromObject(obj);
        if (tempBoxPlayer.intersectsBox(tempBoxObstacle)) {
            if(obj.userData.standable) {
                if (y >= tempBoxObstacle.max.y - 0.1) continue; 
            }
            return true; 
        }
    }
    return false; 
}

// --- SISTEMA DE COMBATE ---
window.addEventListener('game-action', function(e) {
    if(isFainted) return; 
    
    const k = e.detail;
    if(k === 'd') { performAttack("sword"); }
    else if(k === 'f') { performAttack("gun"); }
    else if(k === 'a') { performAttack("fist"); }
    else if(k === 's') { performAttack("kick"); }
    else if(k === 'p' && !blockSync) {
        if(typeof BYOND_REF !== 'undefined') {
            blockSync = true; 
            window.location.href = "byond://?src=" + BYOND_REF + "&action=force_save";
            addLog("Salvando...", "log-miss");
            setTimeout(function() { blockSync = false; }, 500);
        }
    }
});

function performAttack(type) {
    if(isAttacking || !isCharacterReady) return; 
    
    isAttacking = true;
    lastCombatActionTime = Date.now();

    let windupStance = "SWORD_WINDUP";
    let atkStance = "SWORD_ATK_1";
    let idleStance = "SWORD_IDLE";

    if(type === "fist") { windupStance = "FIST_WINDUP"; atkStance = "FIST_ATK"; idleStance = "FIST_IDLE"; }
    else if(type === "kick") { windupStance = "KICK_WINDUP"; atkStance = "KICK_ATK"; idleStance = "FIST_IDLE"; }
    else if(type === "sword") { windupStance = "SWORD_WINDUP"; atkStance = "SWORD_ATK_1"; idleStance = "SWORD_IDLE"; }
    else if(type === "gun") { windupStance = "GUN_IDLE"; atkStance = "GUN_ATK"; idleStance = "GUN_IDLE"; }

    charState = windupStance; 

    setTimeout(function() {
        charState = atkStance;
        let dist = 100;
        let hit = false; 

        if(Engine.dummyTarget) dist = playerGroup.position.distanceTo(Engine.dummyTarget.position);

        if(dist < (type === "gun" ? 8.0 : 2.5)) { 
            hit = true;
            if(Engine.dummyTarget && Engine.dummyTarget.userData.hitZone) {
                const mat = Engine.dummyTarget.userData.hitZone.material;
                mat.color.setHex(0x550000); 
                setTimeout(function(){mat.color.setHex(0xFF0000)}, 150);
            }
        } else {
            // Miss
        }
        
        if(typeof BYOND_REF !== 'undefined') {
            blockSync = true; 
            let targetStr = hit ? "dummy" : "none";
            window.location.href = `byond://?src=${BYOND_REF}&action=attack&type=${type}&target=${targetStr}`; 
            setTimeout(function(){blockSync=false}, 200);
        }

        setTimeout(function() {
            charState = idleStance; 
            isAttacking = false;
        }, 300);
    }, 100); 
}

// --- NETWORK CORE ---
function receivingMultiplayerData(json) { }

function receberDadosMultiplayer(json) {
    lastPacketTime = Date.now();
    let packet;
    try { packet = JSON.parse(json); } catch(e) { return; }

    const me = packet.me;
    myID = packet.my_id;
    const now = performance.now();

    if(me.loaded == 1 && !isCharacterReady) {
        if(packet.others[myID] && packet.others[myID].skin) {
            const myData = packet.others[myID];
            playerGroup = CharFactory.createCharacter(myData.skin, myData.cloth);
            playerGroup.visible = true;
            playerGroup.position.set(myData.x, myData.y, myData.z);
            Engine.scene.add(playerGroup);
            isCharacterReady = true;
            Input.camAngle = myData.rot + Math.PI; 
        }
    }

    if(isCharacterReady) {
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

        const hint = document.getElementById('interaction-hint');
        if(closestDist < 2.0) hint.style.display = 'block';
        else hint.style.display = 'none';

        const myData = packet.others[myID];
        isResting = me.rest;
        isFainted = me.ft; 
        
        if(myData && myData.it !== undefined) {
            if(playerGroup.userData.lastItem !== myData.it) {
                if(myData.it === "" || myData.it === null) {
                    const rightArm = playerGroup.userData.limbs.rightArm;
                    if(rightArm) {
                        for(let i = rightArm.children.length - 1; i >= 0; i--) {
                            if(rightArm.children[i].userData.type === 'equipment') {
                                rightArm.remove(rightArm.children[i]);
                            }
                        }
                    }
                    playerGroup.userData.lastItem = "";
                } else {
                    CharFactory.equipItem(playerGroup, myData.it);
                    playerGroup.userData.lastItem = myData.it;
                }
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
    }

    const serverPlayers = packet.others;
    const receivedIds = new Set();

    for (const id in serverPlayers) {
        if (id === myID) continue;
        receivedIds.add(id);
        const pData = serverPlayers[id];
        
        if (!otherPlayers[id]) {
            if(pData.skin) {
                const newChar = CharFactory.createCharacter(pData.skin, pData.cloth);
                newChar.position.set(pData.x, pData.y, pData.z);
                Engine.scene.add(newChar);
                Engine.collidables.push(newChar);
                
                const label = document.createElement('div');
                label.className = 'name-label';
                label.innerText = pData.name || "Unknown"; 
                document.getElementById('labels-container').appendChild(label);
                
                otherPlayers[id] = {
                    mesh: newChar,
                    label: label,
                    startX: pData.x, startY: pData.y, startZ: pData.z, startRot: pData.rot,
                    targetX: pData.x, targetY: pData.y, targetZ: pData.z, targetRot: pData.rot,
                    lastPacketTime: now,
                    lerpDuration: 180,
                    attacking: pData.a, attackType: pData.at, 
                    resting: pData.rest,
                    fainted: pData.ft,
                    lastItem: "" 
                };
            }
        } else {
            const other = otherPlayers[id];
            const timeSinceLast = other.lastPacketTime ? (now - other.lastPacketTime) : POSITION_SYNC_INTERVAL;
            other.lerpDuration = Math.max(180, timeSinceLast + 30);
            
            other.startX = other.mesh.position.x; other.startY = other.mesh.position.y;
            other.startZ = other.mesh.position.z; other.startRot = other.mesh.rotation.y;
            other.targetX = pData.x; other.targetY = pData.y;
            other.targetZ = pData.z; other.targetRot = pData.rot;
            other.lastPacketTime = now;
            
            if (pData.a !== undefined) other.attacking = pData.a;
            if (pData.at) other.attackType = pData.at;
            if (pData.rest !== undefined) other.resting = pData.rest; 
            if (pData.ft !== undefined) other.fainted = pData.ft;
            if(pData.name && other.label.innerText !== pData.name) other.label.innerText = pData.name; 

            if(pData.it !== undefined && pData.it !== other.lastItem) {
                if(pData.it === "" || pData.it === null) CharFactory.equipItem(other.mesh, "none");
                else CharFactory.equipItem(other.mesh, pData.it);
                other.lastItem = pData.it;
            }
        }
    }
    
    for (const id in otherPlayers) {
        if (!receivedIds.has(id)) {
            Engine.scene.remove(otherPlayers[id].mesh);
            const idx = Engine.collidables.indexOf(otherPlayers[id].mesh);
            if(idx > -1) Engine.collidables.splice(idx, 1);
            if(otherPlayers[id].label) otherPlayers[id].label.remove();
            delete otherPlayers[id];
        }
    }
}

function shouldSendPosition(x, y, z, rot, now) { 
    if (now - lastSentTime < POSITION_SYNC_INTERVAL) return false;
    if (lastSentX === null) return true;
    if (Math.abs(x - lastSentX) < POSITION_EPSILON && Math.abs(y - lastSentY) < POSITION_EPSILON && 
        Math.abs(z - lastSentZ) < POSITION_EPSILON && Math.abs(rot - lastSentRot) < POSITION_EPSILON) return false;
    return true;
}

function sendPositionUpdate(now) {
    if (!isCharacterReady || blockSync) return;
    if(typeof BYOND_REF === 'undefined') return;

    const x = round2(playerGroup.position.x); const y = round2(playerGroup.position.y);
    const z = round2(playerGroup.position.z); const rot = round2(playerGroup.rotation.y);

    if (!shouldSendPosition(x, y, z, rot, now)) return;
    lastSentTime = now; lastSentX = x; lastSentY = y; lastSentZ = z; lastSentRot = rot;
    
    let runFlag = (isRunning && !isResting) ? 1 : 0;
    window.location.href = `byond://?src=${BYOND_REF}&action=update_pos&x=${x}&y=${y}&z=${z}&rot=${rot}&run=${runFlag}`; 
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    animTime += 0.1;
    const now = performance.now();

    for(let ref in groundItemsMeshes) {
        const item = groundItemsMeshes[ref];
        item.rotation.y += 0.02;
        item.position.y = 0.5 + Math.sin(animTime * 2) * 0.1; 
    }

    if (isCharacterReady) {
        if(!isAttacking && charState !== "DEFAULT") {
            if(Date.now() - lastCombatActionTime > 3000) charState = "DEFAULT";
        }

        const groundHeight = getGroundHeightAt(playerGroup.position.x, playerGroup.position.z);

        if(isFainted) {
            playerGroup.rotation.x = lerp(playerGroup.rotation.x, -Math.PI/2, 0.1); 
            playerGroup.position.y = lerp(playerGroup.position.y, groundHeight + 0.2, 0.1);
            playerGroup.userData.limbs.leftLeg.rotation.x = 0;
            playerGroup.userData.limbs.rightLeg.rotation.x = 0;
            
        } else if(isResting) {
            playerGroup.rotation.x = lerp(playerGroup.rotation.x, 0, 0.1); 
            playerGroup.position.y = lerp(playerGroup.position.y, groundHeight - 0.75, 0.1);
            lerpLimbRotation(playerGroup.userData.limbs.leftLeg, {x: -Math.PI/2, y:0, z:0}, 0.1);
            lerpLimbRotation(playerGroup.userData.limbs.rightLeg, {x: -Math.PI/2, y:0, z:0}, 0.1);
            
        } else {
            let moveX = 0, moveZ = 0, moving = false;
            let speed = currentMoveSpeed; 
            if(isRunning) speed *= 1.5; 

            const sin = Math.sin(Input.camAngle); const cos = Math.cos(Input.camAngle);
            if(Input.keys.arrowup) { moveX -= sin*speed; moveZ -= cos*speed; moving = true; }
            if(Input.keys.arrowdown) { moveX += sin*speed; moveZ += cos*speed; moving = true; }
            if(Input.keys.arrowleft) { moveX -= cos*speed; moveZ += sin*speed; moving = true; }
            if(Input.keys.arrowright) { moveX += cos*speed; moveZ -= sin*speed; moving = true; }

            const nextX = playerGroup.position.x + moveX;
            const nextZ = playerGroup.position.z + moveZ;
            const currentY = playerGroup.position.y; 

            if(!checkCollision(nextX, currentY, nextZ)) {
                playerGroup.position.x = nextX; playerGroup.position.z = nextZ;
            } else {
                if(!checkCollision(nextX, currentY, playerGroup.position.z)) playerGroup.position.x = nextX;
                else if(!checkCollision(playerGroup.position.x, currentY, nextZ)) playerGroup.position.z = nextZ;
            }
            
            if(playerGroup.position.x > 30) playerGroup.position.x = 30; if(playerGroup.position.x < -30) playerGroup.position.x = -30;
            if(playerGroup.position.z > 30) playerGroup.position.z = 30; if(playerGroup.position.z < -30) playerGroup.position.z = -30;

            if(moving) {
                const targetCharRot = Math.atan2(moveX, moveZ);
                playerGroup.rotation.y = targetCharRot;
                if(!Input.keys.arrowdown && !Input.mouseRight) Input.camAngle = lerpAngle(Input.camAngle, targetCharRot + Math.PI, 0.02);
            }

            if(Input.keys[" "] && !isJumping) { 
                if (Math.abs(playerGroup.position.y - groundHeight) < 0.1) {
                    verticalVelocity = currentJumpForce; 
                    isJumping = true; 
                }
            }
            playerGroup.position.y += verticalVelocity; 
            verticalVelocity += gravity;
            if(playerGroup.position.y < groundHeight) { 
                playerGroup.position.y = groundHeight; 
                isJumping = false; 
                verticalVelocity = 0; 
            }

            playerGroup.rotation.x = lerp(playerGroup.rotation.x, 0, 0.2); 
            if(moving && isRunning) playerGroup.rotation.x = 0.2; 

            let targetStance = STANCES[charState] || STANCES.DEFAULT;
            if(moving && !isJumping && !isAttacking) {
                let legSpeed = isRunning ? 0.3 : 0.8; 
                playerGroup.userData.limbs.leftLeg.rotation.x = Math.sin(animTime * (isRunning ? 1.5 : 1))*legSpeed;
                playerGroup.userData.limbs.rightLeg.rotation.x = -Math.sin(animTime * (isRunning ? 1.5 : 1))*legSpeed;
                
                if(charState === "DEFAULT") {
                    playerGroup.userData.limbs.leftArm.rotation.x = -Math.sin(animTime)*legSpeed;
                    playerGroup.userData.limbs.rightArm.rotation.x = Math.sin(animTime)*legSpeed;
                } else {
                    lerpLimbRotation(playerGroup.userData.limbs.leftArm, targetStance.leftArm, 0.2);
                    lerpLimbRotation(playerGroup.userData.limbs.rightArm, targetStance.rightArm, 0.2);
                }
            } else {
                const animSpeed = isAttacking ? 0.4 : 0.1;
                lerpLimbRotation(playerGroup.userData.limbs.leftArm, targetStance.leftArm, animSpeed);
                lerpLimbRotation(playerGroup.userData.limbs.rightArm, targetStance.rightArm, animSpeed);
                lerpLimbRotation(playerGroup.userData.limbs.leftLeg, targetStance.leftLeg, animSpeed);
                lerpLimbRotation(playerGroup.userData.limbs.rightLeg, targetStance.rightLeg, animSpeed);
            }
        }

        const camDist = 7; const camH = 5;
        Engine.camera.position.set(playerGroup.position.x + Math.sin(Input.camAngle)*camDist, playerGroup.position.y + camH, playerGroup.position.z + Math.cos(Input.camAngle)*camDist);
        Engine.camera.lookAt(playerGroup.position.x, playerGroup.position.y + 1.5, playerGroup.position.z);
        sendPositionUpdate(now);
    }

    for(const id in otherPlayers) {
        const other = otherPlayers[id];
        const mesh = other.mesh;
        const elapsed = other.lastPacketTime ? (now - other.lastPacketTime) : 0;
        const t = other.lerpDuration ? Math.min(1, elapsed / other.lerpDuration) : 1;
        
        mesh.position.x = lerp(other.startX, other.targetX, t);
        mesh.position.y = lerp(other.startY, other.targetY, t);
        mesh.position.z = lerp(other.startZ, other.targetZ, t);
        mesh.rotation.y = lerpAngle(other.startRot, other.targetRot, t);

        if(other.fainted) { 
            mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1);
            mesh.position.y = lerp(mesh.position.y, 0.2, 0.1); 
            mesh.userData.limbs.leftLeg.rotation.x = 0;
            mesh.userData.limbs.rightLeg.rotation.x = 0;
        } else if(other.resting) { 
             mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1); 
             mesh.position.y = lerp(mesh.position.y, other.targetY, 0.1); 
             lerpLimbRotation(mesh.userData.limbs.leftLeg, {x: -Math.PI/2, y:0, z:0}, 0.1);
             lerpLimbRotation(mesh.userData.limbs.rightLeg, {x: -Math.PI/2, y:0, z:0}, 0.1);
        } else {
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.2);
            const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2));
            const isMoving = dist > 0.05;
            let remoteStance = STANCES.DEFAULT; 
            
            if(other.attacking) {
                if(other.attackType === "sword") remoteStance = STANCES.SWORD_ATK_1;
                else if(other.attackType === "fist") remoteStance = STANCES.FIST_ATK;
                else if(other.attackType === "kick") remoteStance = STANCES.KICK_ATK;
                else if(other.attackType === "gun") remoteStance = STANCES.GUN_ATK;
                lerpLimbRotation(mesh.userData.limbs.leftArm, remoteStance.leftArm, 0.4);
                lerpLimbRotation(mesh.userData.limbs.rightArm, remoteStance.rightArm, 0.4);
                lerpLimbRotation(mesh.userData.limbs.leftLeg, remoteStance.leftLeg, 0.4);
                lerpLimbRotation(mesh.userData.limbs.rightLeg, remoteStance.rightLeg, 0.4);
            } else if(isMoving) {
                mesh.userData.limbs.leftLeg.rotation.x = Math.sin(animTime)*0.8;
                mesh.userData.limbs.rightLeg.rotation.x = -Math.sin(animTime)*0.8;
                mesh.userData.limbs.leftArm.rotation.x = -Math.sin(animTime)*0.8;
                mesh.userData.limbs.rightArm.rotation.x = Math.sin(animTime)*0.8;
            } else {
                mesh.userData.limbs.leftLeg.rotation.x = 0;
                mesh.userData.limbs.rightLeg.rotation.x = 0;
                mesh.userData.limbs.leftArm.rotation.x = 0;
                mesh.userData.limbs.rightArm.rotation.x = 0;
            }
        }
        
        const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2, mesh.position.z);
        tempV.project(Engine.camera);
        other.label.style.display = (Math.abs(tempV.z) > 1) ? 'none' : 'block';
        other.label.style.left = (tempV.x * .5 + .5) * window.innerWidth + 'px';
        other.label.style.top = (-(tempV.y * .5) + .5) * window.innerHeight + 'px';
    }
    Engine.renderer.render(Engine.scene, Engine.camera);
}

animate();
setInterval(function() { if(isCharacterReady && Date.now() - lastPacketTime > 4000) { addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); isCharacterReady = false; } }, 1000);