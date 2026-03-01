// client/CombatVisualSystem.js

const CombatVisualSystem = {
    activeProjectiles: [],
    activeHitboxes: [],
    activeSkillProjectiles: [],
    hitboxPool: [],
    projectilePool: [],

    getHitbox: function(size, colorHex) {
        let m;
        if (this.hitboxPool.length > 0) {
            m = this.hitboxPool.pop();
        } else {
            const geo = new THREE.BoxGeometry(1, 1, 1);
            const mat = new THREE.MeshBasicMaterial({ 
                color: 0xFF0000, 
                wireframe: true, 
                transparent: true, 
                opacity: 0.3,
                visible: Config.DEBUG_HITBOXES 
            });
            m = new THREE.Mesh(geo, mat);
        }
        m.scale.set(size.x, size.y, size.z);
        m.material.color.setHex(colorHex || 0xFF0000);
        return m;
    },

    releaseHitbox: function(m) {
        Engine.scene.remove(m);
        m.userData = {};
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
        m.userData = {};
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

    fireProjectile: function(originMesh, projectileDef, isMine, skillId, ownerRef) {
        const s = projectileDef.scale || [0.1, 0.1, 0.1];
        const bullet = this.getProjectile(projectileDef.color, s);
        
        if(!originMesh) return; 
        
        const bodyRot = originMesh.rotation.y; 
        const sin = Math.sin(bodyRot); 
        const cos = Math.cos(bodyRot);
        
        bullet.position.copy(originMesh.position); 
        bullet.position.y += 1.05; 
        
        bullet.position.x += sin * 0.5; 
        bullet.position.z += cos * 0.5; 
        
        let dX = sin; let dY = 0; let dZ = cos;
        bullet.rotation.y = bodyRot;

        Engine.scene.add(bullet);
        
        this.activeProjectiles.push({ 
            mesh: bullet, dirX: dX, dirY: dY, dirZ: dZ, 
            speed: projectileDef.speed, distTraveled: 0, 
            maxDist: projectileDef.range || 10, isMine: isMine,
            skillId: skillId, ownerRef: ownerRef
        });
    },

    spawnHitbox: function(playerMesh, size, forwardOffset, lifetime, customData, yOffset, isVisualOnly = false) {
        if(!playerMesh) return;
        const hitbox = this.getHitbox(size, 0xFF0000);
        hitbox.position.copy(playerMesh.position); 
        hitbox.position.y += (yOffset !== undefined ? yOffset : 1.0); 
        const bodyRot = playerMesh.rotation.y; 
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        hitbox.position.x += sin * forwardOffset; hitbox.position.z += cos * forwardOffset; hitbox.rotation.y = bodyRot;
        
        Engine.scene.add(hitbox);
        this.activeHitboxes.push({ 
            mesh: hitbox, 
            startTime: Date.now(), 
            duration: lifetime, 
            hasHit: [], 
            data: customData || {}, 
            isVisualOnly: isVisualOnly,
            ownerMesh: playerMesh 
        });
    },

    // --- INÍCIO DA MELHORIA: Substitui os Atributos Dinâmicos da Arma ---
    fireSkillProjectile: function(originMesh, skillId, ownerRef, overrideSpeed, overrideRange) {
        const def = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!def || !originMesh) return;

        const isMine = (ownerRef === EntityManager.myID);
        
        const pSpeed = (overrideSpeed !== undefined && overrideSpeed !== null) ? overrideSpeed : def.speed;
        const pRange = (overrideRange !== undefined && overrideRange !== null) ? overrideRange : def.range;

        const hitboxMesh = this.getProjectile(0x00FF00, def.hitboxSize);
        hitboxMesh.material.wireframe = true;
        hitboxMesh.material.transparent = true;
        hitboxMesh.material.opacity = 0.5; 
        
        hitboxMesh.material.visible = Config.DEBUG_HITBOXES;

        if (def.visualDef && GameDefinitions[def.visualDef]) {
            const skinData = GameDefinitions[def.visualDef];
            const skinMesh = CharFactory.createFromDef(def.visualDef, skinData.visual);
            
            if(def.hitboxSize) {
                skinMesh.scale.set(
                    1 / def.hitboxSize[0],
                    1 / def.hitboxSize[1],
                    1 / def.hitboxSize[2]
                );
            }
            hitboxMesh.add(skinMesh); 
        }

        const bodyRot = originMesh.rotation.y;
        const sin = Math.sin(bodyRot); const cos = Math.cos(bodyRot);
        
        hitboxMesh.position.copy(originMesh.position);
        hitboxMesh.position.y += 1.0; 
        hitboxMesh.position.x += sin * 0.5; 
        hitboxMesh.position.z += cos * 0.5;

        let dX = sin; let dY = 0; let dZ = cos;
        hitboxMesh.rotation.y = bodyRot; 

        Engine.scene.add(hitboxMesh);
        
        this.activeSkillProjectiles.push({
            mesh: hitboxMesh, skillId: skillId, def: def,
            ownerRef: ownerRef, isMine: isMine,
            dirX: dX, dirY: dY, dirZ: dZ,
            distTraveled: 0, hasHit: [],
            actualSpeed: pSpeed,
            actualRange: pRange
        });
    },
    // --- FIM DA MELHORIA ---

    destroyProjectileFrom: function(ownerRef, skillId) {
        if (!ownerRef) return;
        
        if (skillId && window.GameSkills && window.GameSkills[skillId]) {
            const pVal = window.GameSkills[skillId].pierce;
            if (pVal === true || pVal === 1 || pVal === "1") {
                return; 
            }
        }

        for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
            if (this.activeProjectiles[i].ownerRef === ownerRef && this.activeProjectiles[i].skillId === skillId) {
                this.releaseProjectile(this.activeProjectiles[i].mesh);
                this.activeProjectiles.splice(i, 1);
            }
        }

        for (let i = this.activeSkillProjectiles.length - 1; i >= 0; i--) {
            if (this.activeSkillProjectiles[i].ownerRef === ownerRef && this.activeSkillProjectiles[i].skillId === skillId) {
                this.releaseProjectile(this.activeSkillProjectiles[i].mesh);
                this.activeSkillProjectiles.splice(i, 1);
            }
        }
    },

    checkAccurateCollision: function(objRef, targetMesh) {
        const TARGET_RADIUS = 0.3; 
        const TARGET_HALF_HEIGHT = 1.0;

        const targetPos = targetMesh.position.clone();
        targetPos.y += TARGET_HALF_HEIGHT; 

        objRef.mesh.updateMatrixWorld();
        
        const localPos = objRef.mesh.worldToLocal(targetPos);

        const sx = objRef.mesh.scale.x || 1;
        const sy = objRef.mesh.scale.y || 1;
        const sz = objRef.mesh.scale.z || 1;

        const paddingX = TARGET_RADIUS / sx;
        const paddingY = TARGET_HALF_HEIGHT / sy;
        const paddingZ = TARGET_RADIUS / sz;

        if (Math.abs(localPos.x) <= 0.5 + paddingX &&
            Math.abs(localPos.y) <= 0.5 + paddingY &&
            Math.abs(localPos.z) <= 0.5 + paddingZ) {
            return true;
        }
        return false;
    },

    checkCollisions: function(type, objRef) {
        let targets = [];
        
        if (EntityManager.isCharacterReady && EntityManager.playerGroup) {
            targets.push({ id: EntityManager.myID, mesh: EntityManager.playerGroup });
        }
        
        for (let id in EntityManager.otherPlayers) {
            const other = EntityManager.otherPlayers[id];
            if (other && other.mesh) {
                targets.push({ id: id, mesh: other.mesh });
            }
        }

        for (let i = 0; i < targets.length; i++) {
            let targetId = targets[i].id;
            let targetMesh = targets[i].mesh;

            if (type === "melee" && objRef.ownerMesh === targetMesh) continue;
            if (type === "projectile" && objRef.ownerRef === targetId) continue;
            
            if (objRef.hasHit && objRef.hasHit.includes(targetId)) continue;

            if (this.checkAccurateCollision(objRef, targetMesh)) {
                
                let sId = "";
                let step = 1;

                if (type === "melee") {
                    sId = objRef.data ? objRef.data.skillId : "";
                    step = objRef.data ? objRef.data.step : 1;
                } else if (type === "projectile") {
                    sId = objRef.skillId;
                }

                if(!objRef.isVisualOnly && typeof BYOND_REF !== 'undefined') {
                    if(targetId !== EntityManager.myID) {
                        NetworkSystem.queueCommand(`action=register_hit&target_ref=${targetId}&skill_id=${sId}&step=${step}`);
                    }
                }
                
                if(type === "projectile") { 
                    this.releaseProjectile(objRef.mesh); 
                    objRef.distTraveled = 99999; 
                    break; 
                } else if(type === "melee") { 
                    if (!objRef.hasHit) objRef.hasHit = [];
                    objRef.hasHit.push(targetId); 
                    
                    if(Config.DEBUG_HITBOXES && objRef.mesh && objRef.mesh.material) {
                        objRef.mesh.material.color.setHex(0xFFFFFF); 
                    }
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
            
            if (p.isMine) { this.checkCollisions("projectile", p); }
            if (p.distTraveled >= p.maxDist) { this.releaseProjectile(p.mesh); this.activeProjectiles.splice(i, 1); }
        }

        for (let i = this.activeSkillProjectiles.length - 1; i >= 0; i--) {
            const p = this.activeSkillProjectiles[i]; 
            const moveStep = p.actualSpeed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += p.dirY * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            // --- INÍCIO DA MELHORIA: O fim do "Projétil que Atravessa" ---
            if (p.isMine) { 
                for (let id in EntityManager.otherPlayers) {
                    if(p.hasHit.includes(id)) continue;
                    if(!EntityManager.otherPlayers[id] || !EntityManager.otherPlayers[id].mesh) continue;

                    if (this.checkAccurateCollision(p, EntityManager.otherPlayers[id].mesh)) {
                        if(typeof BYOND_REF !== 'undefined') {
                            NetworkSystem.queueCommand(`action=register_hit&target_ref=${id}&skill_id=${p.skillId}&step=1`);
                        }
                        p.hasHit.push(id);
                        
                        const pVal = p.def.pierce;
                        if (pVal !== true && pVal !== 1 && pVal !== "1") {
                            // Removido o this.releaseProjectile(p.mesh) duplicado para salvar a memória RAM (Object Pool). 
                            // Ele marca a distância como 99999 e deixa o despawner natural debaixo tratar a limpeza.
                            p.distTraveled = 99999; 
                            break; 
                        }
                    }
                }
            } else if (p.ownerRef && EntityManager.otherPlayers[p.ownerRef] && EntityManager.otherPlayers[p.ownerRef].isNPC) {
                if (this.checkAccurateCollision(p, EntityManager.playerGroup)) {
                    if (!p.hasHit.includes(EntityManager.myID)) {
                        p.hasHit.push(EntityManager.myID);
                        if (typeof BYOND_REF !== 'undefined') {
                            NetworkSystem.queueCommand(`action=mob_projectile_hit&caster_ref=${p.ownerRef}&skill_id=${p.skillId}`);
                        }
                        const pVal = p.def.pierce;
                        if (pVal !== true && pVal !== 1 && pVal !== "1") {
                            // Removido a duplicata visual!
                            p.distTraveled = 99999; 
                        }
                    }
                }
            }
            // --- FIM DA MELHORIA ---
            
            if (p.distTraveled >= p.actualRange) { 
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
            
            this.checkCollisions("melee", hb);
        }
    }
};

window.CombatVisualSystem = CombatVisualSystem;