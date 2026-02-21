// client/CombatSystem.js

const CombatSystem = {
    localSkillCooldowns: {},
    activeCooldownsUI: {}, 
    
    isAttacking: false,
    lastCombatActionTime: 0,
    
    combatState: "IDLE", 
    stateTimer: 0,
    syncBlockTimer: 0,
    pendingAction: null,
    
    comboStep: 1, 
    lastComboTime: 0,
    lastSkillUsed: "",

    update: function(dt) {
        if (typeof EntityManager !== 'undefined' && (EntityManager.isFainted || EntityManager.isResting)) {
            if (this.combatState !== "IDLE") {
                this.combatState = "IDLE";
                this.isAttacking = false;
                this.pendingAction = null;
            }
        }

        if (this.syncBlockTimer > 0) {
            this.syncBlockTimer -= dt;
            if (this.syncBlockTimer <= 0 && typeof NetworkSystem !== 'undefined') {
                NetworkSystem.blockSync = false;
            }
        }

        if (this.combatState !== "IDLE") {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                if (this.combatState === "WINDUP") {
                    this.combatState = "ATTACK";
                    this.stateTimer = 300; 
                    
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

    startSkillCooldownUI: function(skillId) {
        const skillDef = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!skillDef || !skillDef.cooldown || skillDef.cooldown <= 0) return;

        this.localSkillCooldowns[skillId] = Date.now() + skillDef.cooldown;
        
        const overlay = document.getElementById(`cd-${skillId}`);
        if(overlay) {
            overlay.style.transition = "none";
            overlay.style.height = "100%";
            overlay.innerText = (skillDef.cooldown / 1000).toFixed(1) + "s";
            
            this.activeCooldownsUI[skillId] = {
                timeLeft: skillDef.cooldown,
                max: skillDef.cooldown,
                overlay: overlay
            };
        }
    },

    executeSkill: function(skillId) {
        if(this.isAttacking || !EntityManager.isCharacterReady || EntityManager.isResting || EntityManager.isFainted) return;
        
        const skillDef = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!skillDef) {
            console.warn("Skill não encontrada no JSON:", skillId);
            return;
        }

        const now = Date.now();
        if (this.localSkillCooldowns[skillId] && this.localSkillCooldowns[skillId] > now) return;

        if (skillDef.energyCost && UISystem.cache.en < skillDef.energyCost) {
            UISystem.addLog("<span style='color:red'>Energia insuficiente!</span>", "log-miss");
            return;
        }

        if(skillDef.requiresWeaponTag) {
            const equippedItem = EntityManager.playerGroup.userData.lastItem;
            let hasReq = false;
            if(equippedItem && GameDefinitions[equippedItem]) {
                const tags = GameDefinitions[equippedItem].tags || [];
                if(tags.includes(skillDef.requiresWeaponTag)) hasReq = true;
            }
            if(!hasReq) {
                UISystem.addLog(`Requer arma: ${skillDef.requiresWeaponTag}!`, "log-miss");
                return;
            }
        }

        if (skillId !== this.lastSkillUsed || now - this.lastComboTime > 600) {
            this.comboStep = 1;
        } else {
            this.comboStep++;
            const maxCombos = skillDef.combos ? skillDef.combos.length : 1;
            if (this.comboStep > maxCombos) this.comboStep = 1;
        }
        
        this.lastComboTime = now;
        this.lastSkillUsed = skillId;
        this.isAttacking = true;
        this.lastCombatActionTime = now;
        EntityManager.lastActionTime = now;

        if (TargetSystem.currentTargetID && EntityManager.otherPlayers[TargetSystem.currentTargetID]) {
            const targetMesh = EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh;
            const dx = targetMesh.position.x - EntityManager.playerGroup.position.x;
            const dz = targetMesh.position.z - EntityManager.playerGroup.position.z;
            EntityManager.playerGroup.rotation.y = Math.atan2(dx, dz);
        }

        let windupAnim = skillDef.animation || "DEFAULT";
        let castAnim = skillDef.castAnimation || "DEFAULT";
        let idleAnim = "DEFAULT"; 
        
        if(skillId === "basic_sword") idleAnim = "SWORD_IDLE";
        if(skillId === "basic_fist" || skillId === "basic_kick") idleAnim = "FIST_IDLE";
        if(skillId === "basic_gun") idleAnim = "GUN_IDLE";

        let hitboxData = null;
        let hitboxOffset = 1.0;

        if(skillDef.type === "melee" && skillDef.combos) {
            const comboData = skillDef.combos[this.comboStep - 1]; 
            if(comboData) {
                windupAnim = comboData.animation || windupAnim;
                castAnim = comboData.castAnimation || castAnim;
                hitboxData = comboData.hitbox;
                hitboxOffset = comboData.offset || 1.0;
            }
        }

        EntityManager.charState = windupAnim;
        this.combatState = "WINDUP";
        this.stateTimer = 100;

        this.pendingAction = {
            atkStance: castAnim,
            idleStance: idleAnim,
            execute: () => {
                if (skillDef.type === "projectile") {
                    if(skillDef.visualDef) {
                        CombatVisualSystem.fireSkillProjectile(EntityManager.playerGroup, skillId, EntityManager.myID);
                    } else if (skillDef.requiresWeaponTag === "gun") {
                        const equippedItem = EntityManager.playerGroup.userData.lastItem;
                        let projData = null;
                        if(equippedItem && GameDefinitions[equippedItem] && GameDefinitions[equippedItem].gameplay) {
                            projData = GameDefinitions[equippedItem].gameplay.projectile;
                        }
                        // CORREÇÃO: Passando o skillId para o construtor do projétil!
                        if(projData) CombatVisualSystem.fireProjectile(EntityManager.playerGroup, projData, true, skillId);
                    }
                } 
                else if (skillDef.type === "melee" && hitboxData) {
                    CombatVisualSystem.spawnHitbox(EntityManager.playerGroup, hitboxData, hitboxOffset, 300, {skillId: skillId, step: this.comboStep});
                }
                
                if(typeof BYOND_REF !== 'undefined') {
                    NetworkSystem.blockSync = true;
                    this.syncBlockTimer = 200;
                    const currentRot = EntityManager.playerGroup.rotation.y.toFixed(3);
                    NetworkSystem.queueCommand(`action=execute_skill&skill_id=${skillId}&step=${this.comboStep}&rot=${currentRot}`);
                }
            }
        };
        
        if(skillDef.cooldown > 0) this.startSkillCooldownUI(skillId);
    }
};

window.CombatSystem = CombatSystem;