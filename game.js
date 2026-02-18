// game.js - Lógica Principal (Em Processo de Extração Física)

// --- MÓDULO 3: TARGET SYSTEM ---
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
        
        document.getElementById('target-hp-fill').style.width = pct + "%";
        document.getElementById('target-hp-text').innerText = `${Math.floor(hp)}/${maxHp}`;

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

// --- MÓDULO 4: COMBAT VISUAL SYSTEM ---
const CombatVisualSystem = {
    activeProjectiles: [],
    activeHitboxes: [],
    activeSkillProjectiles: [],
    hitboxPool: [],
    projectilePool: [],
    tempBoxAttacker: new THREE.Box3(),
    tempBoxTarget: new THREE.Box3(),

    getHitbox: function(size, colorHex) {
        let m;
        if (this.hitboxPool.length > 0) {
            m = this.hitboxPool.pop();
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFF0000, wireframe: true, transparent: true, opacity: 0.3 });
            m = new THREE.Mesh(geo, mat);
        }
        m.scale.set(size.x, size.y, size.z);
        m.material.color.setHex(colorHex || 0xFF0000);
        return m;
    },

    releaseHitbox: function(m) {
        Engine.scene.remove(m);
        this.hitboxPool.push(m);
    },

    getProjectile: function(colorHex, scaleArr) {
        let m;
        if (this.projectilePool.length > 0) {
            m = this.projectilePool.pop();
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
            m = new THREE.Mesh(geo, mat);
        }
        m.scale.set(scaleArr[0], scaleArr[1], scaleArr[2]);
        m.material.color.setHex(colorHex);
        return m;
    },

    releaseProjectile: function(m) {
        while(m.children.length > 0){ m.remove(m.children[0]); }
        Engine.scene.remove(m);
        this.projectilePool.push(m);
    },

    spawnDamageNumber: function(targetRef, amount) {
        if(!EntityManager.otherPlayers[targetRef]) return;
        const mesh = EntityManager.otherPlayers[targetRef].mesh;
        const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2.5, mesh.position.z);
        tempV.project(Engine.camera);
        const x = (tempV.x * .5 + .5) * window.innerWidth;
        const y = (-(tempV.y * .5) + .5) * window.innerHeight;
        const div = document.createElement('div');
        div.className = 'dmg-popup';
        div.innerText = "-" + amount;
        div.style.left = x + 'px';
        div.style.top = y + 'px';
        document.body.appendChild(div);
        setTimeout(() => { div.remove(); }, 1000);
    },

    fireProjectile: function(originMesh, projectileDef, isMine) {
        const s = projectileDef.scale || [0.1, 0.1, 0.1];
        const bullet = this.getProjectile(projectileDef.color, s);
        
        if(!originMesh) return; 
        
        const bodyRot = originMesh.rotation.y; 
        const sin = Math.sin(bodyRot); 
        const cos = Math.cos(bodyRot);
        
        bullet.position.copy(originMesh.position); 
        bullet.position.y += 1.3; 
        bullet.position.x += sin * 0.5 - cos * 0.4; 
        bullet.position.z += cos * 0.5 + sin * 0.4; 
        
        let dX = sin; let dY = 0; let dZ = cos;
        
        if (isMine && TargetSystem.currentTargetID && EntityManager.otherPlayers[TargetSystem.currentTargetID] && EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh) {
            const targetMesh = EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh;
            const targetPos = new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 0.9, targetMesh.position.z);
            const bulletPos = bullet.position.clone();
            
            const dirVec = new THREE.Vector3().subVectors(targetPos, bulletPos).normalize();
            dX = dirVec.x; dY = dirVec.y; dZ = dirVec.z;
            
            bullet.lookAt(targetPos); 
        } else {
            bullet.rotation.y = bodyRot; 
        }

        Engine.scene.add(bullet);
        
        this.activeProjectiles.push({ 
            mesh: bullet, dirX: dX, dirY: dY, dirZ: dZ, 
            speed: projectileDef.speed, distTraveled: 0, 
            maxDist: projectileDef.range || 10, isMine: isMine 
        });
    },

    spawnHitbox: function(playerMesh, size, forwardOffset, lifetime, customData, yOffset) {
        if(!playerMesh) return;
        const hitbox = this.getHitbox(size, 0xFF0000);
        hitbox.position.copy(playerMesh.position); 
        hitbox.position.y += (yOffset !== undefined ? yOffset : 1.0); 
        const bodyRot = playerMesh.rotation.y; 
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        hitbox.position.x += sin * forwardOffset; hitbox.position.z += cos * forwardOffset; hitbox.rotation.y = bodyRot;
        
        Engine.scene.add(hitbox);
        this.activeHitboxes.push({ mesh: hitbox, startTime: Date.now(), duration: lifetime, hasHit: [], data: customData || {} });
    },

    fireSkillProjectile: function(originMesh, skillId, ownerRef) {
        const def = GameSkills[skillId];
        if(!def || !originMesh) return;

        const isMine = (ownerRef === EntityManager.myID);

        const hitboxMesh = this.getProjectile(0x00FF00, def.hitboxSize);
        hitboxMesh.material.wireframe = true;
        hitboxMesh.material.transparent = true;
        hitboxMesh.material.opacity = 0.5; 

        if (def.visualDef && GameDefinitions[def.visualDef]) {
            const skinData = GameDefinitions[def.visualDef];
            const skinMesh = CharFactory.createFromDef(def.visualDef, skinData.visual);
            hitboxMesh.add(skinMesh); 
        }

        const bodyRot = originMesh.rotation.y;
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        
        hitboxMesh.position.copy(originMesh.position);
        hitboxMesh.position.y += 1.0; 
        hitboxMesh.position.x += sin * 1.0; 
        hitboxMesh.position.z += cos * 1.0;

        let dX = sin; let dY = 0; let dZ = cos;
        
        if (isMine && TargetSystem.currentTargetID && EntityManager.otherPlayers[TargetSystem.currentTargetID] && EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh) {
            const targetMesh = EntityManager.otherPlayers[TargetSystem.currentTargetID].mesh;
            const targetPos = new THREE.Vector3(targetMesh.position.x, targetMesh.position.y + 0.9, targetMesh.position.z);
            const dirVec = new THREE.Vector3().subVectors(targetPos, hitboxMesh.position).normalize();
            dX = dirVec.x; dY = dirVec.y; dZ = dirVec.z;
        }

        hitboxMesh.rotation.y = Math.atan2(dX, dZ);

        Engine.scene.add(hitboxMesh);
        
        this.activeSkillProjectiles.push({
            mesh: hitboxMesh, skillId: skillId, def: def,
            ownerRef: ownerRef, isMine: isMine,
            dirX: dX, dirY: dY, dirZ: dZ,
            distTraveled: 0, hasHit: [] 
        });
    },

    checkCollisions: function(attackerBox, type, objRef) {
        for (let id in EntityManager.otherPlayers) {
            const target = EntityManager.otherPlayers[id]; 
            
            if(type === "melee" && objRef.hasHit.includes(id)) continue;
            this.tempBoxTarget.setFromObject(target.mesh);
            if (attackerBox.intersectsBox(this.tempBoxTarget)) {
                let extra = "";
                if(type === "melee" && objRef.data && objRef.data.step) extra = `&combo=${objRef.data.step}`;
                if(typeof BYOND_REF !== 'undefined') NetworkSystem.queueCommand(`action=register_hit&target_ref=${id}&hit_type=${type}${extra}`);
                
                if(type === "projectile") { 
                    this.releaseProjectile(objRef.mesh); 
                    objRef.distTraveled = 99999; 
                } else if(type === "melee") { 
                    objRef.hasHit.push(id); 
                    objRef.mesh.material.color.setHex(0xFFFFFF); 
                }
            }
        }
    },

    update: function(timeScale) { 
        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeProjectiles[i]; 
            const moveStep = p.speed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += (p.dirY || 0) * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            if (p.isMine) { this.tempBoxAttacker.setFromObject(p.mesh); this.checkCollisions(this.tempBoxAttacker, "projectile", p); }
            if (p.distTraveled >= p.maxDist) { this.releaseProjectile(p.mesh); this.activeProjectiles.splice(i, 1); }
        }

        for (let i = this.activeSkillProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeSkillProjectiles[i]; 
            const moveStep = p.def.speed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += p.dirY * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            if (p.isMine) { 
                this.tempBoxAttacker.setFromObject(p.mesh); 
                
                for (let id in EntityManager.otherPlayers) {
                    if(p.hasHit.includes(id)) continue; 
                    
                    this.tempBoxTarget.setFromObject(EntityManager.otherPlayers[id].mesh);
                    if (this.tempBoxAttacker.intersectsBox(this.tempBoxTarget)) {
                        if(typeof BYOND_REF !== 'undefined') {
                            NetworkSystem.queueCommand(`action=register_skill_hit&skill_id=${p.skillId}&target_ref=${id}`);
                        }
                        
                        p.hasHit.push(id);
                        
                        if (!p.def.pierce) {
                            this.releaseProjectile(p.mesh); 
                            p.distTraveled = 99999; 
                            break; 
                        }
                    }
                }
            }
            
            if (p.distTraveled >= p.def.range) { 
                this.releaseProjectile(p.mesh); 
                this.activeSkillProjectiles.splice(i, 1); 
            }
        }

        const now = Date.now();
        for (let i = this.activeHitboxes.length - 1; i >= 0; i--) {
            const hb = this.activeHitboxes[i]; 
            if (now - hb.startTime > hb.duration) { 
                this.releaseHitbox(hb.mesh); 
                this.activeHitboxes.splice(i, 1); 
                continue; 
            }
            this.tempBoxAttacker.setFromObject(hb.mesh); this.checkCollisions(this.tempBoxAttacker, "melee", hb);
        }
    }
};

// --- MÓDULO 5: SKILL & COMBAT SYSTEM ---
const CombatSystem = {
    localSkillCooldowns: {},
    isAttacking: false,
    lastCombatActionTime: 0,
    
    fistComboStep: 0, lastFistAttackTime: 0,
    kickComboStep: 0, lastKickAttackTime: 0,
    swordComboStep: 0, lastSwordAttackTime: 0,

    castSkill: function(skillId) {
        if(EntityManager.isFainted || EntityManager.isResting || this.isAttacking || !EntityManager.isCharacterReady) return;
        
        const skillDef = GameSkills[skillId];
        if(!skillDef) return;

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
        EntityManager.charState = "SWORD_WINDUP"; 
        
        NetworkSystem.queueCommand(`action=cast_skill&skill_id=${skillId}`);
        
        setTimeout(() => {
            EntityManager.charState = "FIST_COMBO_1"; 
            setTimeout(() => { EntityManager.charState = "DEFAULT"; this.isAttacking = false; }, 300);
        }, 100);
    },

    startSkillCooldownUI: function(skillId) {
        const skillDef = GameSkills[skillId];
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
        if(this.isAttacking || !EntityManager.isCharacterReady) return; 
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
                NetworkSystem.queueCommand(`action=attack&type=${type}&step=${currentComboStep}`); 
                setTimeout(()=>{NetworkSystem.blockSync=false}, 200); 
            }
            setTimeout(() => { EntityManager.charState = idleStance; this.isAttacking = false; }, 300);
        }, 100); 
    }
};

// --- MÓDULO 6: PHYSICS SYSTEM ---
const PhysicsSystem = {
    tempBoxObstacle: new THREE.Box3(), 
    playerRadius: 0.15, 
    playerHeight: 1.6,

    getGroundHeightAt: function(x, y, z) {
        let maxY = 0; 
        if(!Engine.collidables) return maxY;
        
        for (let i = 0; i < Engine.collidables.length; i++) {
            let obj = Engine.collidables[i]; 
            if(!obj || !obj.userData.standable) continue;

            this.tempBoxObstacle.setFromObject(obj);

            let isInsideXZ = false;
            let phys = obj.userData.physics;

            if (phys && phys.shape === "cylinder") {
                let objPos = new THREE.Vector3();
                obj.getWorldPosition(objPos);
                
                let closestX = Math.max(x - this.playerRadius, Math.min(objPos.x, x + this.playerRadius));
                let closestZ = Math.max(z - this.playerRadius, Math.min(objPos.z, z + this.playerRadius));
                
                let dx = objPos.x - closestX;
                let dz = objPos.z - closestZ;
                
                if ((dx*dx + dz*dz) <= (phys.radius * phys.radius)) {
                    isInsideXZ = true;
                }
            } else {
                let pMinX = x - this.playerRadius; let pMaxX = x + this.playerRadius;
                let pMinZ = z - this.playerRadius; let pMaxZ = z + this.playerRadius;
                
                if (pMinX <= this.tempBoxObstacle.max.x && pMaxX >= this.tempBoxObstacle.min.x &&
                    pMinZ <= this.tempBoxObstacle.max.z && pMaxZ >= this.tempBoxObstacle.min.z) {
                    isInsideXZ = true;
                }
            }

            if (isInsideXZ) {
                if (this.tempBoxObstacle.max.y <= y + 0.6) {
                    if (this.tempBoxObstacle.max.y > maxY) maxY = this.tempBoxObstacle.max.y; 
                }
            }
        }
        return maxY;
    },

    checkCollision: function(x, y, z) {
        if(!Engine.collidables) return false; 
        
        const pMinY = y;
        const pMaxY = y + this.playerHeight;

        for (let i = 0; i < Engine.collidables.length; i++) {
            let obj = Engine.collidables[i]; 
            if(!obj) continue;
            
            this.tempBoxObstacle.setFromObject(obj);
            
            let objMinY = this.tempBoxObstacle.min.y;
            let objMaxY = this.tempBoxObstacle.max.y;
            
            if (pMinY >= objMaxY - 0.05 && obj.userData.standable) continue; 
            if (pMaxY <= objMinY) continue; 
            if (pMinY >= objMaxY) continue; 
            
            let collideXZ = false;
            let phys = obj.userData.physics;

            if (phys && phys.shape === "cylinder") {
                let objPos = new THREE.Vector3();
                obj.getWorldPosition(objPos);
                
                let closestX = Math.max(x - this.playerRadius, Math.min(objPos.x, x + this.playerRadius));
                let closestZ = Math.max(z - this.playerRadius, Math.min(objPos.z, z + this.playerRadius));
                
                let dx = objPos.x - closestX;
                let dz = objPos.z - closestZ;
                
                if ((dx*dx + dz*dz) < (phys.radius * phys.radius)) {
                    collideXZ = true;
                }
            } else {
                let pMinX = x - this.playerRadius; let pMaxX = x + this.playerRadius;
                let pMinZ = z - this.playerRadius; let pMaxZ = z + this.playerRadius;
                
                if (pMinX <= this.tempBoxObstacle.max.x && pMaxX >= this.tempBoxObstacle.min.x &&
                    pMinZ <= this.tempBoxObstacle.max.z && pMaxZ >= this.tempBoxObstacle.min.z) {
                    collideXZ = true;
                }
            }

            if (collideXZ) return true; 
        }
        return false; 
    },

    checkPlayerCollision: function(nextX, nextY, nextZ) {
        const futureBox = new THREE.Box3();
        const center = new THREE.Vector3(nextX, nextY + 0.9, nextZ); 
        const size = new THREE.Vector3(0.4, 1.8, 0.4); 
        futureBox.setFromCenterAndSize(center, size);
        
        const currentBox = new THREE.Box3();
        currentBox.setFromCenterAndSize(new THREE.Vector3(EntityManager.playerGroup.position.x, EntityManager.playerGroup.position.y + 0.9, EntityManager.playerGroup.position.z), size);

        for (let id in EntityManager.otherPlayers) {
            const other = EntityManager.otherPlayers[id];
            if (!other.mesh) continue;
            
            if (other.isNPC && other.npcType === "prop") continue;

            const otherBox = new THREE.Box3().setFromObject(other.mesh);
            otherBox.expandByScalar(-0.15); 
            
            if (futureBox.intersectsBox(otherBox)) { 
                if (currentBox.intersectsBox(otherBox)) {
                    const dxCur = EntityManager.playerGroup.position.x - other.mesh.position.x;
                    const dzCur = EntityManager.playerGroup.position.z - other.mesh.position.z;
                    const currentDistSq = dxCur*dxCur + dzCur*dzCur;

                    const dxFut = nextX - other.mesh.position.x;
                    const dzFut = nextZ - other.mesh.position.z;
                    const futureDistSq = dxFut*dxFut + dzFut*dzFut;

                    if (futureDistSq > currentDistSq || currentDistSq < 0.001) {
                        continue; 
                    }
                }
                return true; 
            }
        }
        return false;
    }
};

// --- MÓDULO 7: ANIMATION SYSTEM ---
const AnimationSystem = {
    animTime: 0,
    
    update: function(timeScale) {
        this.animTime += 0.1 * timeScale;
    },

    animateRig: function(mesh, state, isMoving, isRunning, isResting, isFainted, groundH) {
        const limbs = mesh.userData.limbs;
        if(!limbs) return;

        if (isFainted) {
            mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1); 
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + 0.2, 0.1);
            else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
        } 
        else if (isResting) {
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1);
            const yOffset = -0.4; 
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + yOffset, 0.1);
            else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
            
            const restStance = STANCES.REST_SIMPLE;
            if(restStance) {
                const spd = 0.1;
                lerpLimbRotation(limbs.torso, restStance.torso, spd);
                lerpLimbRotation(limbs.leftLeg, restStance.leftLeg, spd); lerpLimbRotation(limbs.rightLeg, restStance.rightLeg, spd);
                lerpLimbRotation(limbs.leftShin, restStance.leftShin, spd); lerpLimbRotation(limbs.rightShin, restStance.rightShin, spd);
                lerpLimbRotation(limbs.leftArm, restStance.leftArm, spd); lerpLimbRotation(limbs.rightArm, restStance.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, restStance.leftForeArm, spd); lerpLimbRotation(limbs.rightForeArm, restStance.rightForeArm, spd);
            }
        } 
        else {
            if(mesh !== EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH, 0.2); 
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.2);

            let targetStance = STANCES[state] || STANCES.DEFAULT;
            const def = STANCES.DEFAULT;

            if(isMoving) {
                let legSpeed = isRunning ? 0.3 : 0.8; 
                
                limbs.leftLeg.rotation.x = Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                limbs.rightLeg.rotation.x = -Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                limbs.leftShin.rotation.x = (limbs.leftLeg.rotation.x > 0) ? limbs.leftLeg.rotation.x : 0;
                limbs.rightShin.rotation.x = (limbs.rightLeg.rotation.x > 0) ? limbs.rightLeg.rotation.x : 0;
            } else {
                const spd = 0.1;
                lerpLimbRotation(limbs.leftLeg, targetStance.leftLeg || def.leftLeg, spd);
                lerpLimbRotation(limbs.rightLeg, targetStance.rightLeg || def.rightLeg, spd);
                lerpLimbRotation(limbs.leftShin, targetStance.leftShin || def.leftShin, spd);
                lerpLimbRotation(limbs.rightShin, targetStance.rightShin || def.rightShin, spd);
            }

            if (state !== "DEFAULT") {
                const spd = 0.4; 
                lerpLimbRotation(limbs.torso, targetStance.torso || def.torso, spd);
                lerpLimbRotation(limbs.leftArm, targetStance.leftArm || def.leftArm, spd);
                lerpLimbRotation(limbs.rightArm, targetStance.rightArm || def.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, targetStance.leftForeArm || def.leftForeArm, spd);
                lerpLimbRotation(limbs.rightForeArm, targetStance.rightForeArm || def.rightForeArm, spd);
            } else {
                if (isMoving) {
                    let armAmp = isRunning ? 1.2 : 0.6; 
                    limbs.leftArm.rotation.x = -Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * armAmp;
                    limbs.rightArm.rotation.x = Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * armAmp;
                    limbs.leftForeArm.rotation.x = -0.2;
                    limbs.rightForeArm.rotation.x = -0.2;
                    lerpLimbRotation(limbs.torso, def.torso, 0.1);
                } else {
                    const spd = 0.1;
                    lerpLimbRotation(limbs.torso, def.torso, spd);
                    lerpLimbRotation(limbs.leftArm, def.leftArm, spd);
                    lerpLimbRotation(limbs.rightArm, def.rightArm, spd);
                    lerpLimbRotation(limbs.leftForeArm, def.leftForeArm, spd);
                    lerpLimbRotation(limbs.rightForeArm, def.rightForeArm, spd);
                }
            }
        }
    }
};

// --- MÓDULO 8: ENTITY MANAGER ---
const EntityManager = {
    playerGroup: null, 
    otherPlayers: {}, 
    groundItemsMeshes: {},
    myID: null, 
    isCharacterReady: false,

    lastActionTime: Date.now(), 
    charState: "DEFAULT", 
    isResting: false, 
    isFainted: false, 
    isRunning: false, 
    currentMoveSpeed: 0.08, 
    currentJumpForce: 0.20, 
    isJumping: false, 
    verticalVelocity: 0, 
    gravity: -0.015, 
    MAP_LIMIT: 29,

    syncGlobal: function(packet, now) {
        let closestDist = 999;

        if (packet.ground !== undefined) {
            const serverGroundItems = packet.ground;
            const seenItems = new Set();
            
            serverGroundItems.forEach(itemData => {
                seenItems.add(itemData.ref);
                if(!this.groundItemsMeshes[itemData.ref]) {
                    const mesh = CharFactory.createFromDef(itemData.id);
                    mesh.position.set(itemData.x, 0.05, itemData.z); 
                    Engine.scene.add(mesh);
                    this.groundItemsMeshes[itemData.ref] = mesh;
                } else {
                    const mesh = this.groundItemsMeshes[itemData.ref];
                    mesh.position.x = lerp(mesh.position.x, itemData.x, 0.2);
                    mesh.position.z = lerp(mesh.position.z, itemData.z, 0.2);
                }
            });
            for(let ref in this.groundItemsMeshes) {
                if(!seenItems.has(ref)) {
                    Engine.scene.remove(this.groundItemsMeshes[ref]);
                    delete this.groundItemsMeshes[ref];
                }
            }
        }

        if(this.playerGroup) {
            for(let ref in this.groundItemsMeshes) {
                const d = this.playerGroup.position.distanceTo(this.groundItemsMeshes[ref].position);
                if(d < closestDist) closestDist = d;
            }
        }

        const serverPlayers = packet.others; 
        const receivedIds = new Set();
        
        for (const id in serverPlayers) {
            if (id === this.myID) continue; 
            receivedIds.add(id); 
            const pData = serverPlayers[id];
            
            if (!this.otherPlayers[id]) {
                if(pData.skin !== undefined) {
                    let newChar;
                    let isProp = (pData.npc === 1 && pData.type === "prop");
                    
                    if(isProp) {
                        newChar = CharFactory.createFromDef(pData.prop_id || "prop_tree_log");
                        Engine.collidables.push(newChar); 
                    } else {
                        newChar = CharFactory.createCharacter(pData.skin, pData.cloth);
                    }
                    
                    newChar.position.set(pData.x, pData.y, pData.z); 
                    Engine.scene.add(newChar); 

                    const label = document.createElement('div'); label.className = 'name-label'; 
                    label.innerHTML = `<div class="name-text">${pData.name||"?"}</div><div class="mini-hp-bg"><div class="mini-hp-fill"></div></div>`; 
                    document.getElementById('labels-container').appendChild(label);
                    
                    newChar.userData.lastHead = ""; newChar.userData.lastBody = "";
                    newChar.userData.lastLegs = ""; newChar.userData.lastFeet = ""; newChar.userData.lastItem = "";
                    
                    this.otherPlayers[id] = { 
                        mesh: newChar, label: label, hpFill: label.querySelector('.mini-hp-fill'), 
                        name: pData.name, currentHp: pData.hp, maxHp: pData.mhp,
                        startX: pData.x, startY: pData.y, startZ: pData.z, startRot: pData.rot, 
                        targetX: pData.x, targetY: pData.y, targetZ: pData.z, targetRot: pData.rot, 
                        lastPacketTime: now, lerpDuration: 150, 
                        attacking: pData.a, attackType: pData.at, comboStep: pData.cs, 
                        resting: pData.rest, fainted: pData.ft, lastItem: "", 
                        isNPC: (pData.npc === 1), npcType: pData.type, gender: pData.gen, isRunning: false 
                    };
                }
            } else {
                const other = this.otherPlayers[id];
                const mesh = other.mesh;
                
                other.currentHp = pData.hp;
                other.startX = mesh.position.x; other.startY = mesh.position.y; other.startZ = mesh.position.z; other.startRot = mesh.rotation.y;
                other.targetX = pData.x; other.targetY = pData.y; other.targetZ = pData.z; other.targetRot = pData.rot; other.lastPacketTime = now;
                other.attacking = pData.a; other.attackType = pData.at; 
                other.comboStep = pData.cs; 
                other.resting = pData.rest; 
                
                if(UISystem.state.lootOpen && UISystem.state.lootTargetRef === id && pData.ft === 0) {
                    UISystem.closeLoot();
                    UISystem.addLog("<span style='color:orange'>O alvo acordou! Saque interrompido.</span>", "log-miss");
                }

                other.fainted = pData.ft;
                if(pData.rn !== undefined) other.isRunning = pData.rn;

                if(pData.mhp !== undefined) other.maxHp = pData.mhp;
                if(pData.name !== undefined) { 
                    other.name = pData.name; 
                    if(other.label.querySelector('.name-text').innerText !== pData.name) other.label.querySelector('.name-text').innerText = pData.name; 
                }
                if(pData.gen !== undefined) other.gender = pData.gen;

                if(pData.it !== undefined && mesh.userData.lastItem !== pData.it) { CharFactory.equipItem(mesh, pData.it, mesh.userData.lastItem); mesh.userData.lastItem = pData.it; }
                if(pData.eq_h !== undefined && mesh.userData.lastHead !== pData.eq_h) { CharFactory.equipItem(mesh, pData.eq_h, mesh.userData.lastHead); mesh.userData.lastHead = pData.eq_h; }
                if(pData.eq_b !== undefined && mesh.userData.lastBody !== pData.eq_b) { CharFactory.equipItem(mesh, pData.eq_b, mesh.userData.lastBody); mesh.userData.lastBody = pData.eq_b; }
                if(pData.eq_l !== undefined && mesh.userData.lastLegs !== pData.eq_l) { CharFactory.equipItem(mesh, pData.eq_l, mesh.userData.lastLegs); mesh.userData.lastLegs = pData.eq_l; }
                if(pData.eq_f !== undefined && mesh.userData.lastFeet !== pData.eq_f) { CharFactory.equipItem(mesh, pData.eq_f, mesh.userData.lastFeet); mesh.userData.lastFeet = pData.eq_f; }
                
                if(other.hpFill && other.maxHp > 0) other.hpFill.style.width = Math.max(0, Math.min(100, (other.currentHp / other.maxHp) * 100)) + "%";
                
                if (other.attacking && other.attackType === "gun" && !other.hasFiredThisCycle) { 
                    CombatVisualSystem.fireProjectile(mesh, { speed: 0.6, color: 0xFFFF00, ownerID: id }, false); 
                    other.hasFiredThisCycle = true; setTimeout(() => { other.hasFiredThisCycle = false; }, 500); 
                }
            }
        }
        
        for (const id in this.otherPlayers) { 
            if (!receivedIds.has(id)) { 
                Engine.scene.remove(this.otherPlayers[id].mesh); 
                const colIndex = Engine.collidables.indexOf(this.otherPlayers[id].mesh);
                if(colIndex > -1) Engine.collidables.splice(colIndex, 1);
                this.otherPlayers[id].label.remove(); 
                
                if (TargetSystem.currentTargetID === id) TargetSystem.deselectTarget();

                delete this.otherPlayers[id]; 
            } 
        }

        if(packet.t && packet.evts) {
            packet.evts.forEach(evt => {
                if (evt.type === "skill_cast") {
                    let originMesh = null;
                    if(evt.caster === this.myID && this.playerGroup) originMesh = this.playerGroup;
                    else if(this.otherPlayers[evt.caster]) originMesh = this.otherPlayers[evt.caster].mesh;
                    
                    CombatVisualSystem.fireSkillProjectile(originMesh, evt.skill, evt.caster);
                }
            });
        }
        
        const hint = document.getElementById('interaction-hint');
        let npcNear = false;
        for(let id in this.otherPlayers) {
            if(this.otherPlayers[id].isNPC || (this.otherPlayers[id].fainted && !this.otherPlayers[id].isNPC)) { 
                 let d = this.playerGroup ? this.playerGroup.position.distanceTo(this.otherPlayers[id].mesh.position) : 999;
                 if(d < 3.0) npcNear = true;
            }
        }
        if(closestDist < 2.0) { hint.innerText = "[E] Pegar Item"; hint.style.display = 'block'; }
        else if(npcNear) { hint.innerText = "[X] Interagir"; hint.style.display = 'block'; }
        else hint.style.display = 'none';
    },

    syncPersonal: function(packet) {
        const me = packet.me; 
        this.myID = packet.my_id;

        if(me.loaded == 1 && !this.isCharacterReady) {
            this.playerGroup = CharFactory.createCharacter(me.skin || "FFCCAA", me.cloth || "FF0000"); 
            
            if(me.x !== undefined) {
                this.playerGroup.position.set(me.x, me.y, me.z);
                NetworkSystem.lastSentX = me.x; NetworkSystem.lastSentY = me.y; NetworkSystem.lastSentZ = me.z;
            }

            Engine.scene.add(this.playerGroup); this.isCharacterReady = true; 
            
            this.playerGroup.userData.lastHead = ""; this.playerGroup.userData.lastBody = ""; 
            this.playerGroup.userData.lastLegs = ""; this.playerGroup.userData.lastFeet = ""; 
            this.playerGroup.userData.lastItem = "";
        }

        if(this.isCharacterReady) {
            this.isResting = me.rest; this.isFainted = me.ft; 
            if(me.gen) this.playerGroup.userData.gender = me.gen;

            if(this.playerGroup.userData.lastItem !== me.it) { CharFactory.equipItem(this.playerGroup, me.it, this.playerGroup.userData.lastItem); this.playerGroup.userData.lastItem = me.it; }
            if(this.playerGroup.userData.lastHead !== me.eq_h) { CharFactory.equipItem(this.playerGroup, me.eq_h, this.playerGroup.userData.lastHead); this.playerGroup.userData.lastHead = me.eq_h; }
            if(this.playerGroup.userData.lastBody !== me.eq_b) { CharFactory.equipItem(this.playerGroup, me.eq_b, this.playerGroup.userData.lastBody); this.playerGroup.userData.lastBody = me.eq_b; }
            if(this.playerGroup.userData.lastLegs !== me.eq_l) { CharFactory.equipItem(this.playerGroup, me.eq_l, this.playerGroup.userData.lastLegs); this.playerGroup.userData.lastLegs = me.eq_l; }
            if(this.playerGroup.userData.lastFeet !== me.eq_f) { CharFactory.equipItem(this.playerGroup, me.eq_f, this.playerGroup.userData.lastFeet); this.playerGroup.userData.lastFeet = me.eq_f; }
            
            if(me.mspd) this.currentMoveSpeed = me.mspd;
            if(me.jmp) this.currentJumpForce = me.jmp;

            UISystem.updatePersonalStatus(me);

            if(packet.evts) packet.evts.forEach(evt => { 
                if(evt.type === "dmg") CombatVisualSystem.spawnDamageNumber(evt.tid, evt.val); 
                if(evt.type === "teleport") {
                    if(this.playerGroup) {
                        this.playerGroup.position.set(evt.x, evt.y, evt.z);
                        NetworkSystem.lastSentX = evt.x; NetworkSystem.lastSentY = evt.y; NetworkSystem.lastSentZ = evt.z;
                    }
                }
                if(evt.type === "skill_cast_accept") { CombatSystem.startSkillCooldownUI(evt.skill); }
            });
        }
    },

    interact: function() {
        this.lastActionTime = Date.now(); 
        if (TargetSystem.currentTargetID && this.otherPlayers[TargetSystem.currentTargetID]) {
            let dist = this.playerGroup.position.distanceTo(this.otherPlayers[TargetSystem.currentTargetID].mesh.position);
            if (dist < 3.0) {
                NetworkSystem.queueCommand(`action=interact_npc&ref=${TargetSystem.currentTargetID}`);
                return;
            }
        }
        let targetRef = ""; 
        for(let id in this.otherPlayers) { 
            let dist = this.playerGroup.position.distanceTo(this.otherPlayers[id].mesh.position); 
            if(dist < 3.0) { targetRef = id; break; } 
        }
        if(targetRef !== "") NetworkSystem.queueCommand(`action=interact_npc&ref=${targetRef}`);
    },

    updatePlayer: function(timeScale, now) {
        if (!this.isCharacterReady) return;

        if(!CombatSystem.isAttacking && this.charState !== "DEFAULT") { 
            if(Date.now() - CombatSystem.lastCombatActionTime > 3000) this.charState = "DEFAULT"; 
        }
        
        const groundHeight = PhysicsSystem.getGroundHeightAt(this.playerGroup.position.x, this.playerGroup.position.y, this.playerGroup.position.z);

        if(!this.isResting && !this.isFainted) {
            let moveX = 0, moveZ = 0, moving = false; 
            let speed = this.currentMoveSpeed * (this.isRunning ? 1.5 : 1) * timeScale; 
            
            const sin = Math.sin(Input.camAngle); const cos = Math.cos(Input.camAngle);
            let inputX = 0; let inputZ = 0;
            if(Input.keys.arrowup) { inputX -= sin; inputZ -= cos; moving = true; }
            if(Input.keys.arrowdown) { inputX += sin; inputZ += cos; moving = true; }
            if(Input.keys.arrowleft) { inputX -= cos; inputZ += sin; moving = true; }
            if(Input.keys.arrowright) { inputX += cos; inputZ -= sin; moving = true; }

            if(moving) {
                this.lastActionTime = Date.now(); 

                const len = Math.sqrt(inputX*inputX + inputZ*inputZ);
                if(len > 0) { inputX /= len; inputZ /= len; }
                inputX *= speed; inputZ *= speed;

                let nextX = this.playerGroup.position.x + inputX; 
                let nextZ = this.playerGroup.position.z + inputZ;

                if(!PhysicsSystem.checkCollision(nextX, this.playerGroup.position.y, this.playerGroup.position.z) && 
                   !PhysicsSystem.checkPlayerCollision(nextX, this.playerGroup.position.y, this.playerGroup.position.z) && 
                   nextX <= this.MAP_LIMIT && nextX >= -this.MAP_LIMIT) { 
                    this.playerGroup.position.x = nextX; 
                }

                if(!PhysicsSystem.checkCollision(this.playerGroup.position.x, this.playerGroup.position.y, nextZ) && 
                   !PhysicsSystem.checkPlayerCollision(this.playerGroup.position.x, this.playerGroup.position.y, nextZ) && 
                   nextZ <= this.MAP_LIMIT && nextZ >= -this.MAP_LIMIT) { 
                    this.playerGroup.position.z = nextZ; 
                }

                if (!CombatSystem.isAttacking) {
                    const targetCharRot = Math.atan2(inputX, inputZ); 
                    this.playerGroup.rotation.y = targetCharRot;
                }
                
                if(!Input.keys.arrowdown && !Input.mouseRight) {
                    const desiredMoveAngle = Math.atan2(inputX, inputZ); 
                    Input.camAngle = lerpAngle(Input.camAngle, desiredMoveAngle + Math.PI, 0.02 * timeScale); 
                }
            }

            if(Input.keys[" "] && !this.isJumping && Math.abs(this.playerGroup.position.y - groundHeight) < 0.1) { 
                this.verticalVelocity = this.currentJumpForce; 
                this.isJumping = true; 
                this.lastActionTime = Date.now(); 
            }
            
            this.playerGroup.position.y += this.verticalVelocity * timeScale; 
            this.verticalVelocity += this.gravity * timeScale;
            
            if(this.playerGroup.position.y < groundHeight) { 
                this.playerGroup.position.y = groundHeight; 
                this.isJumping = false; 
                this.verticalVelocity = 0; 
            }
            
            AnimationSystem.animateRig(this.playerGroup, this.charState, moving, this.isRunning, this.isResting, this.isFainted, groundHeight);
        } else {
            AnimationSystem.animateRig(this.playerGroup, this.charState, false, false, this.isResting, this.isFainted, groundHeight);
        }

        Engine.camera.position.set(this.playerGroup.position.x + Math.sin(Input.camAngle)*7, this.playerGroup.position.y + 5, this.playerGroup.position.z + Math.cos(Input.camAngle)*7);
        Engine.camera.lookAt(this.playerGroup.position.x, this.playerGroup.position.y + 1.5, this.playerGroup.position.z);
        
        NetworkSystem.sendPositionUpdate(now, this.playerGroup, this.isRunning, this.isResting, this.isCharacterReady);
    },

    updateOthers: function(timeScale, now) {
        for(const id in this.otherPlayers) {
            const other = this.otherPlayers[id]; 
            const mesh = other.mesh; 
            const elapsed = other.lastPacketTime ? (now - other.lastPacketTime) : 0; 
            const t = other.lerpDuration ? Math.min(1, elapsed / other.lerpDuration) : 1;
            
            mesh.position.x = lerp(other.startX, other.targetX, t); 
            mesh.position.z = lerp(other.startZ, other.targetZ, t); 
            
            const currentGroundH = other.targetY; 
            mesh.rotation.y = lerpAngle(other.startRot, other.targetRot, t);
            
            const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2)); 
            const isMoving = dist > 0.02;

            let remoteState = "DEFAULT";
            if(other.attacking) {
                let step = other.comboStep || 1;
                if(other.attackType === "sword") remoteState = "SWORD_COMBO_" + step; 
                else if(other.attackType === "fist") remoteState = "FIST_COMBO_" + step;
                else if(other.attackType === "kick") remoteState = "KICK_COMBO_" + step; 
                else if(other.attackType === "gun") remoteState = "GUN_ATK";
            }

            AnimationSystem.animateRig(mesh, remoteState, isMoving, other.isRunning, other.resting, other.fainted, currentGroundH);

            const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2, mesh.position.z); tempV.project(Engine.camera);
            other.label.style.display = (Math.abs(tempV.z) > 1) ? 'none' : 'block'; 
            other.label.style.left = (tempV.x * .5 + .5) * window.innerWidth + 'px'; 
            other.label.style.top = (-(tempV.y * .5) + .5) * window.innerHeight + 'px';
        }
    }
};

// --- EVENTOS DO NAVEGADOR ---
window.addEventListener('keydown', function(e) {
    const k = e.key.toLowerCase();
    
    if (k === 'tab') { e.preventDefault(); if (e.repeat) return; TargetSystem.cycleTarget(); return; }
    if (e.key === 'Escape') {
        if (UISystem.state.invOpen) UISystem.toggleInventory();
        else if (UISystem.state.statOpen) UISystem.toggleStats();
        else if (UISystem.state.skillsOpen) UISystem.toggleSkills();
        else if (UISystem.state.shopOpen) UISystem.toggleShop();
        else if (UISystem.state.lootOpen) UISystem.closeLoot();
        else {
            TargetSystem.deselectTarget();
            if(document.getElementById('kill-modal').style.display === 'block') UISystem.confirmKill(false);
        }
        return;
    }

    if(k === 'c') UISystem.toggleStats(); 
    if(k === 'i') UISystem.toggleInventory(); 
    if(k === 'k') UISystem.toggleSkills();
    if(k === 'x') EntityManager.interact();
    
    if(k === 'e' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; EntityManager.lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=pick_up`); setTimeout(function() { NetworkSystem.blockSync = false; }, 300); }
    if(k === 'r' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; EntityManager.lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=toggle_rest`); setTimeout(function() { NetworkSystem.blockSync = false; }, 500); }
    if(e.key === 'Shift') EntityManager.isRunning = true;

    if(k === '1') CombatSystem.castSkill("fireball");
    if(k === '2') CombatSystem.castSkill("iceball");
});

window.addEventListener('keyup', function(e) { if(e.key === 'Shift') EntityManager.isRunning = false; });

window.addEventListener('game-action', function(e) {
    if(EntityManager.isFainted) return; const k = e.detail;
    if(k === 'd') CombatSystem.performAttack("sword"); 
    else if(k === 'f') CombatSystem.performAttack("gun"); 
    else if(k === 'a') CombatSystem.performAttack("fist"); 
    else if(k === 's') CombatSystem.performAttack("kick");
    else if(k === 'p' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; NetworkSystem.queueCommand("action=force_save"); UISystem.addLog("Salvando...", "log-miss"); setTimeout(function() { NetworkSystem.blockSync = false; }, 500); }
});

// Pontes para Comunicação com o Servidor
window.receberDadosGlobal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    NetworkSystem.lastPacketTime = Date.now();
    EntityManager.syncGlobal(packet, performance.now());
};

window.receberDadosPessoal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    EntityManager.syncPersonal(packet);
};

// --- MÓDULO 9: GAME LOOP ORQUESTRADOR ---
const GameLoop = {
    lastFrameTime: performance.now(),
    TARGET_FPS: 60,
    OPTIMAL_FRAME_TIME: 1000 / 60,

    start: function() {
        const animate = () => {
            requestAnimationFrame(animate); 
            
            const now = performance.now();
            const dt = Math.min((now - this.lastFrameTime), 100); 
            this.lastFrameTime = now;
            const timeScale = dt / this.OPTIMAL_FRAME_TIME;

            AnimationSystem.update(timeScale);
            TargetSystem.updateUI();
            CombatVisualSystem.update(timeScale); 
            
            EntityManager.updatePlayer(timeScale, now);
            EntityManager.updateOthers(timeScale, now);

            Engine.renderer.render(Engine.scene, Engine.camera);
        };
        
        animate();
        
        setInterval(() => { 
            if(EntityManager.isCharacterReady && Date.now() - NetworkSystem.lastPacketTime > 4000) { 
                UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
                EntityManager.isCharacterReady = false; 
            } 
        }, 1000);
    }
};

GameLoop.start();