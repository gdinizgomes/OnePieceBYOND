// client/NetworkSystem.js

function round2(num) { return Math.round((num + Number.EPSILON) * 100) / 100; }
window.round2 = round2;

const NetworkSystem = {
    commandQueue: [],
    lastPacketTime: Date.now(),
    blockSync: false,

    // Limite da fila: previne acúmulo de comandos em caso de spam ou lag
    MAX_QUEUE_SIZE: 30,

    POSITION_SYNC_INTERVAL: 100,
    POSITION_EPSILON: 0.01,
    lastSentTime: 0,
    lastSentX: null, lastSentY: null, lastSentZ: null, lastSentRot: null,

    init: function() {
        setInterval(() => {
            if (this.commandQueue.length > 0 && typeof BYOND_REF !== 'undefined') {
                const cmd = this.commandQueue.shift();
                // Parâmetros já vêm encodados por queueCommand
                window.location.href = `byond://?src=${BYOND_REF}&${cmd}`;
            }
        }, 50);

        // Solicita ao servidor as configurações Data-Driven assim que a rede iniciar!
        this.queueCommand("action=request_skills");
    },

    queueCommand: function(cmdString) {
        // --- INÍCIO DA MELHORIA: Deduplicação e Prioridade de Pacotes (Prevenção de Input Lag) ---
        
        // 1. DEDUPLICAÇÃO DE VOLÁTEIS: Se for um pacote de movimento, evitamos poluir a fila.
        // Basta sobrescrever a última posição que ainda não foi enviada pela posição mais recente.
        if (cmdString.startsWith("action=update_pos")) {
            for (let i = this.commandQueue.length - 1; i >= 0; i--) {
                if (this.commandQueue[i].startsWith("action=update_pos")) {
                    this.commandQueue[i] = cmdString; // Atualiza o pacote no lugar dele
                    return; // Sai da função sem aumentar a fila!
                }
            }
        }

        // 2. PROTEÇÃO DE EVENTOS CRÍTICOS: Se a fila atingir o limite máximo
        if (this.commandQueue.length >= this.MAX_QUEUE_SIZE) {
            let removedVolatile = false;
            
            // Tentamos sacrificar um pacote de movimento (volátil) primeiro para dar espaço
            for (let i = 0; i < this.commandQueue.length; i++) {
                if (this.commandQueue[i].startsWith("action=update_pos")) {
                    this.commandQueue.splice(i, 1);
                    removedVolatile = true;
                    break;
                }
            }
            
            // Se não houvesse movimento na fila, jogamos fora o mais antigo como última emergência
            if (!removedVolatile) {
                this.commandQueue.shift(); 
            }
        }
        // --- FIM DA MELHORIA ---

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