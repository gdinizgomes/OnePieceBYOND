let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;
let lastPacketTime = Date.now();
let blockSync = false;

// Configurações de Rede
// REMOVIDO: const BYOND_REF... (Agora vem do HTML global)
const POSITION_SYNC_INTERVAL = 100;
const POSITION_EPSILON = 0.01;
let lastSentTime = 0;
let lastSentX = 0; let lastSentY = 0; let lastSentZ = 0; let lastSentRot = 0;

function receberDadosMultiplayer(json) {
    lastPacketTime = Date.now();
    const packet = JSON.parse(json);
    const me = packet.me;
    myID = packet.my_id;
    const now = performance.now();

    if(me.loaded == 1 && !isCharacterReady) {
        if(packet.others[myID] && packet.others[myID].skin) {
            const myData = packet.others[myID];
            playerGroup = createCharacterMesh(myData.skin, myData.cloth);
            playerGroup.visible = true;
            playerGroup.position.set(myData.x, myData.y, myData.z);
            scene.add(playerGroup);
            isCharacterReady = true;
            camAngle = myData.rot + Math.PI; 
        }
    }

    if(isCharacterReady) {
        if(packet.others[myID] && packet.others[myID].name) document.getElementById('name-display').innerText = packet.others[myID].name;
        document.getElementById('lvl-display').innerText = me.lvl;
        document.getElementById('gold-display').innerText = me.gold;
        document.getElementById('hp-bar-fill').style.width = ((me.hp / me.max_hp) * 100) + "%";
    }

    const serverPlayers = packet.others;
    for (const id in serverPlayers) {
        if (id === myID) continue;
        const pData = serverPlayers[id];
        
        if (!otherPlayers[id]) {
            if(pData.skin) {
                const newChar = createCharacterMesh(pData.skin, pData.cloth);
                newChar.position.set(pData.x, pData.y, pData.z);
                scene.add(newChar);
                const label = document.createElement('div');
                label.className = 'name-label';
                label.innerText = pData.name;
                document.getElementById('labels-container').appendChild(label);
                otherPlayers[id] = {
                    mesh: newChar,
                    label: label,
                    startX: pData.x, startY: pData.y, startZ: pData.z, startRot: pData.rot,
                    targetX: pData.x, targetY: pData.y, targetZ: pData.z, targetRot: pData.rot,
                    lastPacketTime: now,
                    lerpDuration: 180,
                    attacking: pData.a 
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
            other.attacking = pData.a; 
            if(pData.name) other.label.innerText = pData.name; 
        }
    }
    for (const id in otherPlayers) {
        if (!serverPlayers[id]) {
            scene.remove(otherPlayers[id].mesh);
            otherPlayers[id].label.remove();
            delete otherPlayers[id];
        }
    }
}

function shouldSendPosition(x, y, z, rot, now) { 
    if (now - lastSentTime < POSITION_SYNC_INTERVAL) return false;
    if (Math.abs(x - lastSentX) < POSITION_EPSILON && Math.abs(y - lastSentY) < POSITION_EPSILON && 
        Math.abs(z - lastSentZ) < POSITION_EPSILON && Math.abs(rot - lastSentRot) < POSITION_EPSILON) return false;
    return true;
}

function sendPositionUpdate(now) {
    if (!isCharacterReady || blockSync) return;
    const x = Number(playerGroup.position.x.toFixed(2));
    const y = Number(playerGroup.position.y.toFixed(2));
    const z = Number(playerGroup.position.z.toFixed(2));
    const rot = Number(playerGroup.rotation.y.toFixed(2));
    if (!shouldSendPosition(x, y, z, rot, now)) return;
    lastSentTime = now; lastSentX = x; lastSentY = y; lastSentZ = z; lastSentRot = rot;
    window.location.href = `byond://?src=${BYOND_REF}&action=update_pos&x=${x}&y=${y}&z=${z}&rot=${rot}`; 
}

setInterval(() => {
    if(isCharacterReady && Date.now() - lastPacketTime > 4000) { 
        addLog("AVISO: Conexão com o servidor perdida.", "log-hit");
        isCharacterReady = false; 
    }
}, 1000);