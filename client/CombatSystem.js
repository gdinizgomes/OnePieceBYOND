// client/CombatSystem.js

const CombatSystem = {
    localSkillCooldowns: {},
    isAttacking: false,
    lastCombatActionTime: 0,
    
    fistComboStep: 0, lastFistAttackTime: 0,
    kickComboStep: 0, lastKickAttackTime: 0,
    swordComboStep: 0, lastSwordAttackTime: 0,

    castSkill: function(skillId) {
        if(EntityManager.isFainted || EntityManager.isResting || this.isAttacking || !EntityManager.isCharacterReady) return;
        
        const skillDef = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!skillDef) {
            UISystem.addLog("<span style='color:red'>Erro de Servidor: Magia Desconhecida.</span>", "log-miss");
            return;
        }

        const now = Date.now();
        if (this.localSkillCooldowns[skillId] && this.localSkillCooldowns[skillId] > now) {
            UISystem.addLog(`<span style='color:orange'>A habilidade ${skillDef.name} está em recarga.</span>`, "log-miss");
            return;
        }

        if (UISystem.cache.en < skillDef.energyCost) {
            UISystem.addLog("<span style='color:red'>Energia insuficiente!</span>", "log-miss");
            return;
        }

        this.isAttacking = true;
        EntityManager.lastActionTime = now;
        this.lastCombatActionTime = now;

        const windupAnim = skillDef.animation || "FIST_WINDUP";
        const castAnim   = skillDef.castAnimation || "FIST_COMBO_1";
        EntityManager.charState = windupAnim;

        NetworkSystem.queueCommand(`action=cast_skill&skill_id=${skillId}`);

        setTimeout(() => {
            EntityManager.charState = castAnim;
            setTimeout(() => { EntityManager.charState = "DEFAULT"; this.isAttacking = false; }, 300);
        }, 100);
    },

    startSkillCooldownUI: function(skillId) {
        const skillDef = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!skillDef) return;

        this.localSkillCooldowns[skillId] = Date.now() + skillDef.cooldown;
        
        const overlay = document.getElementById(`cd-${skillId}`);
        if(overlay) {
            overlay.style.transition = "none";
            overlay.style.height = "100%";
            overlay.innerText = (skillDef.cooldown / 1000).toFixed(1) + "s";
            
            let timeLeft = skillDef.cooldown;
            const interval = setInterval(() => {
                timeLeft -= 100;
                if(timeLeft <= 0) {
                    overlay.style.height = "0%";
                    overlay.innerText = "";
                    clearInterval(interval);
                } else {
                    overlay.style.height = (timeLeft / skillDef.cooldown * 100) + "%";
                    overlay.innerText = (timeLeft / 1000).toFixed(1) + "s";
                }
            }, 100);
        }
    },

    performAttack: function(type) {
        if(this.isAttacking || !EntityManager.isCharacterReady || EntityManager.isResting || EntityManager.isFainted) return; 
        
        const equippedItem = EntityManager.playerGroup.userData.lastItem;
        let hasSword = false; let hasGun = false; let projectileData = null;
        if(equippedItem && GameDefinitions[equippedItem]) {
            const def = GameDefinitions[equippedItem]; const tags = def.tags || (def.data ? def.data.tags : []);
            if(tags && tags.includes("sword")) hasSword = true; if(tags && tags.includes("gun")) { hasGun = true; projectileData = def.projectile; }
        }
        if(type === "sword" && !hasSword) { UISystem.addLog("Sem espada!", "log-miss"); return; }
        if(type === "gun" && !hasGun) { UISystem.addLog("Sem arma!", "log-miss"); return; }
        
        if (TargetSystem.currentTargetID && EntityManager.otherPlayers[TargetSystem.currentTargetID]) {
            const targetMesh = EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh;
            const dx = targetMesh.position.x - EntityManager.playerGroup.position.x;
            const dz = targetMesh.position.z - EntityManager.playerGroup.position.z;
            EntityManager.playerGroup.rotation.y = Math.atan2(dx, dz);
        }

        this.isAttacking = true; 
        this.lastCombatActionTime = Date.now();
        EntityManager.lastActionTime = Date.now(); 
        let windupStance = "SWORD_WINDUP"; let atkStance = "SWORD_ATK_1"; let idleStance = "SWORD_IDLE";
        let currentComboStep = 1;

        if(type === "fist") {
            if(Date.now() - this.lastFistAttackTime > 600) this.fistComboStep = 0;
            this.fistComboStep++; if(this.fistComboStep > 3) this.fistComboStep = 1; 
            this.lastFistAttackTime = Date.now();
            currentComboStep = this.fistComboStep;
            windupStance = "FIST_WINDUP"; atkStance = "FIST_COMBO_" + this.fistComboStep; idleStance = "FIST_IDLE";
        }
        else if(type === "kick") { 
            if(Date.now() - this.lastKickAttackTime > 600) this.kickComboStep = 0;
            this.kickComboStep++; if(this.kickComboStep > 3) this.kickComboStep = 1;
            this.lastKickAttackTime = Date.now();
            currentComboStep = this.kickComboStep;
            windupStance = "KICK_WINDUP"; atkStance = "KICK_COMBO_" + this.kickComboStep; idleStance = "FIST_IDLE";
        }
        else if(type === "sword") {
            if(Date.now() - this.lastSwordAttackTime > 600) this.swordComboStep = 0;
            this.swordComboStep++; if(this.swordComboStep > 3) this.swordComboStep = 1;
            this.lastSwordAttackTime = Date.now();
            currentComboStep = this.swordComboStep;
            windupStance = "SWORD_WINDUP"; atkStance = "SWORD_COMBO_" + this.swordComboStep; idleStance = "SWORD_IDLE";
        }
        else if(type === "gun") { windupStance = "GUN_IDLE"; atkStance = "GUN_ATK"; idleStance = "GUN_IDLE"; }
        
        EntityManager.charState = windupStance; 
        setTimeout(() => {
            EntityManager.charState = atkStance;
            if(type === "gun" && projectileData) CombatVisualSystem.fireProjectile(EntityManager.playerGroup, projectileData, true);
            else if (type === "fist") {
                if(this.fistComboStep === 3) CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1.5, y:1.5, z:1.5}, 1.5, 200, {step: 3}); 
                else CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1, y:1, z:1}, 1.0, 200, {step: this.fistComboStep}); 
            }
            else if (type === "kick") {
                if(this.kickComboStep === 1) CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1.2, y:0.8, z:1.2}, 1.0, 300, {step: 1}, 0.5); 
                else if(this.kickComboStep === 2) CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1.2, y:1.0, z:1.2}, 1.2, 300, {step: 2}, 1.0); 
                else CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1.5, y:1.2, z:1.5}, 1.4, 300, {step: 3}, 1.7); 
            }
            else if (type === "sword") {
                if(this.swordComboStep === 3) CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:1.0, y:1.0, z:4.0}, 2.5, 300, {step: 3}); 
                else CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, {x:2.5, y:1.0, z:2.0}, 1.5, 300, {step: this.swordComboStep}); 
            }
            
            if(typeof BYOND_REF !== 'undefined') { 
                NetworkSystem.blockSync = true; 
                // CORREÇÃO CRÍTICA (Desync de Combate): Envia a rotação atualizada pro servidor validar a OBB com perfeição matemática!
                const currentRot = EntityManager.playerGroup.rotation.y.toFixed(3);
                NetworkSystem.queueCommand(`action=attack&type=${type}&step=${currentComboStep}&rot=${currentRot}`); 
                setTimeout(()=>{NetworkSystem.blockSync=false}, 200); 
            }
            setTimeout(() => { EntityManager.charState = idleStance; this.isAttacking = false; }, 300);
        }, 100); 
    }
};

window.CombatSystem = CombatSystem;