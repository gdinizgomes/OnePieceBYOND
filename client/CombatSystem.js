// client/CombatSystem.js

const CombatSystem = {
    localSkillCooldowns: {},
    activeCooldownsUI: {}, // NOVIDADE: Fila para atualizar UIs de Cooldown sem setInterval
    
    isAttacking: false,
    lastCombatActionTime: 0,
    
    // Variáveis da Máquina de Estados (FSM)
    combatState: "IDLE", 
    stateTimer: 0,
    syncBlockTimer: 0,
    pendingAction: null,
    
    fistComboStep: 0, lastFistAttackTime: 0,
    kickComboStep: 0, lastKickAttackTime: 0,
    swordComboStep: 0, lastSwordAttackTime: 0,

    // NOVIDADE: Atualização em Tempo Real (Chamada pelo GameLoop do game.js)
    update: function(dt) {
        // 1. Sistema de Prioridade Global (Morte/Stun cancelam ataques em andamento)
        if (typeof EntityManager !== 'undefined' && (EntityManager.isFainted || EntityManager.isResting)) {
            if (this.combatState !== "IDLE") {
                this.combatState = "IDLE";
                this.isAttacking = false;
                this.pendingAction = null;
            }
            // Não retorna aqui para garantir que timers de UI continuem rodando
        }

        // 2. Proteção e Desbloqueio de Sync de Rede
        if (this.syncBlockTimer > 0) {
            this.syncBlockTimer -= dt;
            if (this.syncBlockTimer <= 0 && typeof NetworkSystem !== 'undefined') {
                NetworkSystem.blockSync = false;
            }
        }

        // 3. FSM de Combate (Substitui os setTimeouts do Windup e Attack)
        if (this.combatState !== "IDLE") {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                if (this.combatState === "WINDUP") {
                    this.combatState = "ATTACK";
                    this.stateTimer = 300; // Duração do frame de ataque (Hitbox e animação de impacto)
                    
                    if (this.pendingAction) {
                        if (typeof EntityManager !== 'undefined') EntityManager.charState = this.pendingAction.atkStance;
                        if (this.pendingAction.execute) this.pendingAction.execute();
                    }
                } else if (this.combatState === "ATTACK") {
                    this.combatState = "IDLE";
                    this.isAttacking = false;
                    
                    if (this.pendingAction && typeof EntityManager !== 'undefined') {
                        EntityManager.charState = this.pendingAction.idleStance;
                    }
                    this.pendingAction = null;
                }
            }
        }

        // 4. Limpeza visual de Cooldowns
        for (const skillId in this.activeCooldownsUI) {
            const cdData = this.activeCooldownsUI[skillId];
            cdData.timeLeft -= dt;
            
            if (cdData.overlay) {
                if (cdData.timeLeft <= 0) {
                    cdData.overlay.style.height = "0%";
                    cdData.overlay.innerText = "";
                    delete this.activeCooldownsUI[skillId];
                } else {
                    cdData.overlay.style.height = (cdData.timeLeft / cdData.max * 100) + "%";
                    cdData.overlay.innerText = (cdData.timeLeft / 1000).toFixed(1) + "s";
                }
            } else {
                delete this.activeCooldownsUI[skillId];
            }
        }
    },

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
        
        NetworkSystem.queueCommand(`action=cast_skill&skill_id=${skillId}`);

        // Configura FSM de Cast
        EntityManager.charState = windupAnim;
        this.combatState = "WINDUP";
        this.stateTimer = 100;
        this.pendingAction = {
            atkStance: castAnim,
            idleStance: "DEFAULT",
            execute: null // A magia já foi pra rede, o client só encena o cast visual.
        };
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
            
            // Registra na FSM para evitar vazamento de memória com setIntervals órfãos
            this.activeCooldownsUI[skillId] = {
                timeLeft: skillDef.cooldown,
                max: skillDef.cooldown,
                overlay: overlay
            };
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
        
        // Configura FSM de Ataque Físico/Tiro
        EntityManager.charState = windupStance; 
        this.combatState = "WINDUP";
        this.stateTimer = 100; // Tempo de recuo da arma
        
        this.pendingAction = {
            atkStance: atkStance,
            idleStance: idleStance,
            execute: () => {
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
                    this.syncBlockTimer = 200; // Delega o desbloqueio para a matemática temporal da FSM
                    
                    const currentRot = EntityManager.playerGroup.rotation.y.toFixed(3);
                    NetworkSystem.queueCommand(`action=attack&type=${type}&step=${currentComboStep}&rot=${currentRot}`); 
                }
            }
        };
    }
};

window.CombatSystem = CombatSystem;