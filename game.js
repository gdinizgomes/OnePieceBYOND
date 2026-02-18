// game.js - Lógica Principal (Em Processo de Extração Física - Passo 7)

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

window.PhysicsSystem = PhysicsSystem;

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

window.AnimationSystem = AnimationSystem;

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

window.EntityManager = EntityManager;

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