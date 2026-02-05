// game.js - Lógica Principal do Jogo e Network

// --- VARIÁVEIS GLOBAIS ---
let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;
let lastPacketTime = Date.now();
let blockSync = false;

// Estado do Jogo
let charState = "DEFAULT"; 
let lastCombatActionTime = 0; 
let isAttacking = false; 
let animTime = 0; 
let isJumping = false; 
let verticalVelocity = 0; 
const gravity = -0.015; 
const jumpForce = 0.3;

// Cache UI
let cachedHP = -1; let cachedMaxHP = -1; let cachedGold = -1; let cachedLvl = -1; let cachedName = "";

// Sync
const POSITION_SYNC_INTERVAL = 100;
const POSITION_EPSILON = 0.01;
let lastSentTime = 0;
let lastSentX = null; let lastSentY = null; let lastSentZ = null; let lastSentRot = null;

// --- FUNÇÕES AUXILIARES UI ---
function addLog(msg, css) { 
    const d = document.getElementById('combat-log'); 
    d.innerHTML += `<span class="${css}">${msg}</span><br>`; 
    d.scrollTop=d.scrollHeight; 
}

function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }

// --- SISTEMA DE COLISÃO ---
const tempBoxPlayer = new THREE.Box3();
const tempBoxObstacle = new THREE.Box3();
const playerSize = new THREE.Vector3(0.5, 1.8, 0.5); 

function checkCollision(x, y, z) {
    // Caixa do Player
    tempBoxPlayer.setFromCenterAndSize(
        new THREE.Vector3(x, y + 0.9, z), 
        playerSize
    );

    // Itera sobre Engine.collidables (Que agora contém Props + Players Remotos)
    for (let obj of Engine.collidables) {
        tempBoxObstacle.setFromObject(obj);
        if (tempBoxPlayer.intersectsBox(tempBoxObstacle)) {
            return true; 
        }
    }
    return false; 
}

// --- SISTEMA DE COMBATE ---
window.addEventListener('game-action', (e) => {
    const k = e.detail;
    if(k === 'd') { CharFactory.equipItem(playerGroup, "weapon_sword_iron"); performAttack("sword"); }
    else if(k === 'f') { CharFactory.equipItem(playerGroup, "weapon_gun_flintlock"); performAttack("gun"); }
    else if(k === 'a') { performAttack("fist"); }
    else if(k === 's') { performAttack("kick"); }
    else if(k === 'p' && !blockSync) {
        blockSync = true; 
        window.location.href = "byond://?src=" + BYOND_REF + "&action=force_save";
        addLog("Salvando...", "log-miss");
        setTimeout(() => { blockSync = false; }, 500);
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

    setTimeout(() => {
        charState = atkStance;
        
        let dist = 100;
        if(Engine.dummyTarget) {
            dist = playerGroup.position.distanceTo(Engine.dummyTarget.position);
        }

        if(dist < (type === "gun" ? 8.0 : 2.5)) { 
            addLog(`HIT (${type})!`, "log-hit"); 
            if(Engine.dummyTarget && Engine.dummyTarget.userData.hitZone) {
                const mat = Engine.dummyTarget.userData.hitZone.material;
                mat.color.setHex(0x550000); 
                setTimeout(()=>mat.color.setHex(0xFF0000),150);
            }
        } else {
            addLog("Errou...", "log-miss");
        }
        
        blockSync = true; 
        window.location.href = `byond://?src=${BYOND_REF}&action=attack&type=${type}`; 
        setTimeout(()=>{blockSync=false}, 200);

        setTimeout(() => {
            charState = idleStance; 
            isAttacking = false;
        }, 300);
    }, 100); 
}

// --- NETWORK CORE (ATUALIZADO PARA COLISÃO) ---
function receivingMultiplayerData(json) { }

function receberDadosMultiplayer(json) {
    lastPacketTime = Date.now();
    const packet = JSON.parse(json);
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
            // NOTA: NÃO adicionamos o PRÓPRIO jogador à lista de colisão local,
            // senão ele colidiria com ele mesmo e travaria.
        }
    }

    if(isCharacterReady) {
        const myData = packet.others[myID];
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
            document.getElementById('hp-bar-fill').style.width = ((me.hp / me.max_hp) * 100) + "%";
            cachedHP = me.hp;
            cachedMaxHP = me.max_hp;
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
                
                // NOVO: Adiciona players remotos/NPCs à colisão
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
                    attacking: pData.a,
                    attackType: pData.at,
                    lastCombatTime: 0,
                    lastCombatType: "sword" 
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
            if (pData.a) other.lastCombatTime = now;
            if (pData.at) other.lastCombatType = pData.at;
            if(pData.name && other.label.innerText !== pData.name) other.label.innerText = pData.name; 
        }
    }
    
    for (const id in otherPlayers) {
        if (!receivedIds.has(id)) {
            // Remove da cena
            Engine.scene.remove(otherPlayers[id].mesh);
            
            // NOVO: Remove da lista de colisão
            const meshToRemove = otherPlayers[id].mesh;
            const idx = Engine.collidables.indexOf(meshToRemove);
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
    
    const x = round2(playerGroup.position.x);
    const y = round2(playerGroup.position.y);
    const z = round2(playerGroup.position.z);
    const rot = round2(playerGroup.rotation.y);

    if (!shouldSendPosition(x, y, z, rot, now)) return;
    lastSentTime = now; lastSentX = x; lastSentY = y; lastSentZ = z; lastSentRot = rot;
    
    window.location.href = `byond://?src=${BYOND_REF}&action=update_pos&x=${x}&y=${y}&z=${z}&rot=${rot}`; 
}

// --- GAME LOOP ---
function animate() {
    requestAnimationFrame(animate);
    animTime += 0.1;
    const now = performance.now();

    if (isCharacterReady) {
        if(!isAttacking && charState !== "DEFAULT") {
            if(Date.now() - lastCombatActionTime > 3000) charState = "DEFAULT";
        }

        const speed = 0.15;
        let moveX = 0, moveZ = 0, moving = false;
        const sin = Math.sin(Input.camAngle); const cos = Math.cos(Input.camAngle);
        
        if(Input.keys.arrowup) { moveX -= sin*speed; moveZ -= cos*speed; moving = true; }
        if(Input.keys.arrowdown) { moveX += sin*speed; moveZ += cos*speed; moving = true; }
        if(Input.keys.arrowleft) { moveX -= cos*speed; moveZ += sin*speed; moving = true; }
        if(Input.keys.arrowright) { moveX += cos*speed; moveZ -= sin*speed; moving = true; }

        // --- APLICAÇÃO DA COLISÃO ---
        const nextX = playerGroup.position.x + moveX;
        const nextZ = playerGroup.position.z + moveZ;
        const currentY = playerGroup.position.y; 

        if(!checkCollision(nextX, currentY, nextZ)) {
            playerGroup.position.x = nextX; 
            playerGroup.position.z = nextZ;
        } else {
            if(!checkCollision(nextX, currentY, playerGroup.position.z)) {
                playerGroup.position.x = nextX;
            } else if(!checkCollision(playerGroup.position.x, currentY, nextZ)) {
                playerGroup.position.z = nextZ;
            }
        }
        
        if(playerGroup.position.x > 30) playerGroup.position.x = 30; if(playerGroup.position.x < -30) playerGroup.position.x = -30;
        if(playerGroup.position.z > 30) playerGroup.position.z = 30; if(playerGroup.position.z < -30) playerGroup.position.z = -30;

        if(moving) {
            const targetCharRot = Math.atan2(moveX, moveZ);
            playerGroup.rotation.y = targetCharRot;
            if(!Input.keys.arrowdown && !Input.mouseRight) Input.camAngle = lerpAngle(Input.camAngle, targetCharRot + Math.PI, 0.02);
        }

        if(Input.keys[" "] && !isJumping) { verticalVelocity = jumpForce; isJumping = true; }
        playerGroup.position.y += verticalVelocity; verticalVelocity += gravity;
        if(playerGroup.position.y < 0) { playerGroup.position.y = 0; isJumping = false; verticalVelocity = 0; }

        let targetStance = STANCES[charState] || STANCES.DEFAULT;
        if(moving && !isJumping && !isAttacking) {
            playerGroup.userData.limbs.leftLeg.rotation.x = Math.sin(animTime)*0.8;
            playerGroup.userData.limbs.rightLeg.rotation.x = -Math.sin(animTime)*0.8;
            
            if(charState === "DEFAULT") {
                playerGroup.userData.limbs.leftArm.rotation.x = -Math.sin(animTime)*0.8;
                playerGroup.userData.limbs.rightArm.rotation.x = Math.sin(animTime)*0.8;
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

        const camDist = 7; const camH = 5;
        Engine.camera.position.set(
            playerGroup.position.x + Math.sin(Input.camAngle)*camDist, 
            playerGroup.position.y + camH, 
            playerGroup.position.z + Math.cos(Input.camAngle)*camDist
        );
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

        const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2));
        const isMoving = dist > 0.05;

        let remoteStance = STANCES.DEFAULT; 
        const timeSinceCombat = now - (other.lastCombatTime || 0);
        const isInCombatMode = timeSinceCombat < 3000;

        if(isInCombatMode) {
            let type = other.lastCombatType || "sword";
            if(type === "fist" || type === "kick") remoteStance = STANCES.FIST_IDLE;
            else if(type === "gun") remoteStance = STANCES.GUN_IDLE;
            else remoteStance = STANCES.SWORD_IDLE;
        }

        if(other.attacking) {
            let atkName = "SWORD_ATK_1";
            let currentType = other.attackType || other.lastCombatType;
            if(currentType === "fist") atkName = "FIST_ATK";
            if(currentType === "kick") atkName = "KICK_ATK";
            if(currentType === "gun") atkName = "GUN_ATK";
            
            let targetAnim = STANCES[atkName] || STANCES.SWORD_ATK_1;
            lerpLimbRotation(mesh.userData.limbs.leftArm, targetAnim.leftArm, 0.3);
            lerpLimbRotation(mesh.userData.limbs.rightArm, targetAnim.rightArm, 0.3);
            lerpLimbRotation(mesh.userData.limbs.leftLeg, targetAnim.leftLeg, 0.3);
            lerpLimbRotation(mesh.userData.limbs.rightLeg, targetAnim.rightLeg, 0.3);
        } else {
            if(isMoving) {
                mesh.userData.limbs.leftLeg.rotation.x = Math.sin(animTime)*0.8;
                mesh.userData.limbs.rightLeg.rotation.x = -Math.sin(animTime)*0.8;
                if(remoteStance === STANCES.DEFAULT) {
                    mesh.userData.limbs.leftArm.rotation.x = -Math.sin(animTime)*0.8;
                    mesh.userData.limbs.rightArm.rotation.x = Math.sin(animTime)*0.8;
                } else {
                    lerpLimbRotation(mesh.userData.limbs.leftArm, remoteStance.leftArm, 0.2);
                    lerpLimbRotation(mesh.userData.limbs.rightArm, remoteStance.rightArm, 0.2);
                }
            } else {
                lerpLimbRotation(mesh.userData.limbs.leftArm, remoteStance.leftArm, 0.1);
                lerpLimbRotation(mesh.userData.limbs.rightArm, remoteStance.rightArm, 0.1);
                lerpLimbRotation(mesh.userData.limbs.leftLeg, remoteStance.leftLeg, 0.1);
                lerpLimbRotation(mesh.userData.limbs.rightLeg, remoteStance.rightLeg, 0.1);
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

setInterval(() => {
    if(isCharacterReady && Date.now() - lastPacketTime > 4000) { 
        addLog("AVISO: Conexão com o servidor perdida.", "log-hit");
        isCharacterReady = false; 
    }
}, 1000);