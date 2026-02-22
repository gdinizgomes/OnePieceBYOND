// client/TargetSystem.js

const TargetSystem = {
    currentTargetID: null,
    MAX_RANGE: 25,
    SELECTION_RANGE: 20,

    cycleTarget: function() {
        if (!EntityManager.playerGroup) return;
        EntityManager.lastActionTime = Date.now(); 

        const potentialTargets = [];
        for (const id in EntityManager.otherPlayers) {
            const other = EntityManager.otherPlayers[id];
            const dist = EntityManager.playerGroup.position.distanceTo(other.mesh.position);
            if (dist <= this.SELECTION_RANGE) potentialTargets.push({ id: id, dist: dist });
        }

        if (potentialTargets.length === 0) {
            this.currentTargetID = null;
            return;
        }

        potentialTargets.sort((a, b) => {
            const distA = Math.round(a.dist * 10);
            const distB = Math.round(b.dist * 10);
            if (distA === distB) return a.id.localeCompare(b.id);
            return distA - distB;
        });

        if (!this.currentTargetID) {
            this.currentTargetID = potentialTargets[0].id;
        } else {
            const currentIndex = potentialTargets.findIndex(t => t.id === this.currentTargetID);
            if (currentIndex === -1 || currentIndex === potentialTargets.length - 1) {
                this.currentTargetID = potentialTargets[0].id;
            } else {
                this.currentTargetID = potentialTargets[currentIndex + 1].id;
            }
        }
    },

    deselectTarget: function() {
        this.currentTargetID = null;
    },

    updateUI: function() {
        const targetWin = document.getElementById('target-window');
        
        if (!this.currentTargetID || !EntityManager.otherPlayers[this.currentTargetID]) {
            targetWin.style.display = 'none';
            for (const id in EntityManager.otherPlayers) {
                if(EntityManager.otherPlayers[id].label) {
                    EntityManager.otherPlayers[id].label.style.border = "1px solid rgba(255,255,255,0.2)";
                    EntityManager.otherPlayers[id].label.style.zIndex = "1";
                }
            }
            return;
        }

        const target = EntityManager.otherPlayers[this.currentTargetID];
        const dist = EntityManager.playerGroup.position.distanceTo(target.mesh.position);
        
        if (dist > this.MAX_RANGE || Date.now() - EntityManager.lastActionTime > 15000) {
            this.deselectTarget();
            return;
        }

        targetWin.style.display = 'block';
        document.getElementById('target-name').innerText = target.name || "Desconhecido";
        
        const hp = target.currentHp || 100;
        const maxHp = target.maxHp || 100;
        const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        
        // CORREÇÃO CRÍTICA: Arredonda os HPs do Painel de Alvo
        document.getElementById('target-hp-fill').style.width = pct + "%";
        document.getElementById('target-hp-text').innerText = `${Math.round(hp)}/${Math.round(maxHp)}`;

        for (const id in EntityManager.otherPlayers) {
            if(EntityManager.otherPlayers[id].label) {
                if (id === this.currentTargetID) {
                    EntityManager.otherPlayers[id].label.style.border = "2px solid #e74c3c";
                    EntityManager.otherPlayers[id].label.style.zIndex = "100"; 
                } else {
                    EntityManager.otherPlayers[id].label.style.border = "1px solid rgba(255,255,255,0.2)";
                    EntityManager.otherPlayers[id].label.style.zIndex = "1";
                }
            }
        }
    }
};

window.TargetSystem = TargetSystem;