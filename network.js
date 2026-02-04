let playerGroup = null; 
const otherPlayers = {}; 
let myID = null; 
let isCharacterReady = false;
let lastPacketTime = Date.now();
let blockSync = false;

const POSITION_SYNC_INTERVAL = 100;
const POSITION_EPSILON = 0.01;
let lastSentTime = 0;
let lastSentX = 0; let lastSentY = 0; let lastSentZ = 0; let lastSentRot = 0;

// Variáveis de Cache para UI
let cachedHP = -1;
let cachedMaxHP = -1;
let cachedGold = -1;
let cachedLvl = -1;
let cachedName = "";

function receberDadosMultiplayer(json) {
    lastPacketTime = Date.now();
    const packet = JSON.parse(json);
    const me = packet.me;
    myID = packet.my_id;
    const now = performance.now();

    // Criação do personagem local
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

    // Atualização da UI (CORRIGIDO: Verifica se os dados existem antes de atualizar)
    if(isCharacterReady) {
        const myData = packet.others[myID];
        
        // Só atualiza o nome se ele vier no pacote E for diferente do cache
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
    for (const id in serverPlayers) {
        if (id === myID) continue;
        const pData = serverPlayers[id];
        
        if (!otherPlayers[id]) {
            // Só cria se tivermos os dados visuais (skin)
            if(pData.skin) {
                const newChar = createCharacterMesh(pData.skin, pData.cloth);
                newChar.position.set(pData.x, pData.y, pData.z);
                scene.add(newChar);
                
                // Criação da etiqueta de nome
                const label = document.createElement('div');
                label.className = 'name-label';
                label.innerText = pData.name || "Unknown"; // Fallback seguro
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
            // Atualização de jogadores existentes
            const other = otherPlayers[id];
            const timeSinceLast = other.lastPacketTime ? (now - other.lastPacketTime) : POSITION_SYNC_INTERVAL;
            
            // Ajuste dinâmico do Lerp para evitar "pulos" se a rede engasgar
            other.lerpDuration = Math.max(180, timeSinceLast + 30);
            
            other.startX = other.mesh.position.x; other.startY = other.mesh.position.y;
            other.startZ = other.mesh.position.z; other.startRot = other.mesh.rotation.y;
            other.targetX = pData.x; other.targetY = pData.y;
            other.targetZ = pData.z; other.targetRot = pData.rot;
            other.lastPacketTime = now;
            
            // Só atualiza status se vierem no pacote
            if (pData.a !== undefined) other.attacking = pData.a;
            if (pData.at) other.attackType = pData.at;
            
            if (pData.a) other.lastCombatTime = now;
            if (pData.at) other.lastCombatType = pData.at;

            // Correção também para o nome dos outros jogadores
            if(pData.name && other.label.innerText !== pData.name) {
                other.label.innerText = pData.name; 
            }
        }
    }
    
    // Limpeza de jogadores desconectados
    for (const id in otherPlayers) {
        if (!serverPlayers[id]) {
            scene.remove(otherPlayers[id].mesh);
            if(otherPlayers[id].label) otherPlayers[id].label.remove();
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

// Loop de verificação de conexão
setInterval(() => {
    if(isCharacterReady && Date.now() - lastPacketTime > 4000) { 
        addLog("AVISO: Conexão com o servidor perdida.", "log-hit");
        isCharacterReady = false; 
    }
}, 1000);