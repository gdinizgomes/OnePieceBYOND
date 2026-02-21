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

    fireProjectile: function(originMesh, projectileDef, isMine) {
        const s = projectileDef.scale || [0.1, 0.1, 0.1];
        const bullet = this.getProjectile(projectileDef.color, s);
        
        if(!originMesh) return; 
        
        const bodyRot = originMesh.rotation.y; 
        const sin = Math.sin(bodyRot); 
        const cos = Math.cos(bodyRot);
        
        bullet.position.copy(originMesh.position); 
        
        // CORREÇÃO CRÍTICA (Alinhamento do Cano da Arma):
        // Ajustado para sair da altura do peito/braço (1.05) e projetado para a ponta do cano 
        // baseando-se no vetor Forward e Right do personagem.
        bullet.position.y += 1.05; 
        bullet.position.x += sin * 0.8 - cos * 0.25; 
        bullet.position.z += cos * 0.8 + sin * 0.25; 
        
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
        const def = window.GameSkills ? window.GameSkills[skillId] : null;
        if(!def || !originMesh) return;

        const isMine = (ownerRef === EntityManager.myID);

        const hitboxMesh = this.getProjectile(0x00FF00, def.hitboxSize);
        hitboxMesh.material.wireframe = true;
        hitboxMesh.material.transparent = true;
        hitboxMesh.material.opacity = 0.5; 
        hitboxMesh.visible = Config.DEBUG_HITBOXES;

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
        for (let id in EntityManager.otherPlayers) {
            const target = EntityManager.otherPlayers[id]; 
            
            if(type === "melee" && objRef.hasHit.includes(id)) continue;
            if(!target || !target.mesh) continue;

            if (this.checkAccurateCollision(objRef, target.mesh)) {
                let extra = "";
                if(type === "melee" && objRef.data && objRef.data.step) extra = `&combo=${objRef.data.step}`;
                if(typeof BYOND_REF !== 'undefined') NetworkSystem.queueCommand(`action=register_hit&target_ref=${id}&hit_type=${type}${extra}`);
                
                if(type === "projectile") { 
                    this.releaseProjectile(objRef.mesh); 
                    objRef.distTraveled = 99999; 
                    break; 
                } else if(type === "melee") { 
                    objRef.hasHit.push(id); 
                    if(Config.DEBUG_HITBOXES) objRef.mesh.material.color.setHex(0xFFFFFF); 
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
            const moveStep = p.def.speed * timeScale;
            
            p.mesh.position.x += p.dirX * moveStep; 
            p.mesh.position.y += p.dirY * moveStep; 
            p.mesh.position.z += p.dirZ * moveStep; 
            p.distTraveled += moveStep;
            
            if (p.isMine) { 
                for (let id in EntityManager.otherPlayers) {
                    if(p.hasHit.includes(id)) continue;
                    if(!EntityManager.otherPlayers[id] || !EntityManager.otherPlayers[id].mesh) continue;

                    if (this.checkAccurateCollision(p, EntityManager.otherPlayers[id].mesh)) {
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
            this.checkCollisions("melee", hb);
        }
    }
};

window.CombatVisualSystem = CombatVisualSystem;