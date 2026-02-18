// client/NetworkSystem.js

function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }
window.round2 = round2;

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

        // Solicita ao servidor as configurações Data-Driven assim que a rede iniciar!
        this.queueCommand("action=request_skills");
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
window.NetworkSystem = NetworkSystem;