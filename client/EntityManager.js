// client/EntityManager.js

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
                    CharFactory.disposeEntity(this.groundItemsMeshes[ref]);
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
                other.attacking = pData.a; 
                other.attackType = pData.at; 
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

                const slotMap = [
                    { key: 'it',   cacheKey: 'lastItem' },
                    { key: 'eq_h', cacheKey: 'lastHead' },
                    { key: 'eq_b', cacheKey: 'lastBody' },
                    { key: 'eq_l', cacheKey: 'lastLegs' },
                    { key: 'eq_f', cacheKey: 'lastFeet' },
                ];
                for (const slot of slotMap) {
                    if (pData[slot.key] !== undefined && mesh.userData[slot.cacheKey] !== pData[slot.key]) {
                        CharFactory.equipItem(mesh, pData[slot.key], mesh.userData[slot.cacheKey]);
                        mesh.userData[slot.cacheKey] = pData[slot.key];
                    }
                }
                
                if(other.hpFill && other.maxHp > 0) other.hpFill.style.width = Math.max(0, Math.min(100, (other.currentHp / other.maxHp) * 100)) + "%";
            }
        }
        
        for (const id in this.otherPlayers) { 
            if (!receivedIds.has(id)) { 
                const playerMesh = this.otherPlayers[id].mesh;
                const colIndex = Engine.collidables.indexOf(playerMesh);
                if(colIndex > -1) Engine.collidables.splice(colIndex, 1);
                
                CharFactory.disposeEntity(playerMesh); 
                this.otherPlayers[id].label.remove(); 
                if (TargetSystem.currentTargetID === id) TargetSystem.deselectTarget();
                delete this.otherPlayers[id]; 
            } 
        }

        if(packet.t && packet.evts) {
            packet.evts.forEach(evt => {

                if (evt.type === "action") {
                    if (evt.caster === this.myID) return; 
                    let originMesh = null;
                    if (this.otherPlayers[evt.caster]) originMesh = this.otherPlayers[evt.caster].mesh;
                    
                    if (originMesh) {
                        if (evt.is_proj === 1 && typeof CombatVisualSystem !== 'undefined') {
                            CombatVisualSystem.fireSkillProjectile(originMesh, evt.skill, evt.caster);
                        }
                        // --- INÍCIO DA MELHORIA: Hitboxes Visuais de Inimigos ---
                        else if (evt.is_proj === 0 && typeof CombatVisualSystem !== 'undefined') {
                            const sDef = window.GameSkills ? window.GameSkills[evt.skill] : null;
                            if (sDef && sDef.combos) {
                                const combo = sDef.combos[(evt.step || 1) - 1];
                                if (combo && combo.hitbox) {
                                    const size = { x: combo.hitbox.x, y: 1.5, z: combo.hitbox.z };
                                    // A flag "true" no final garante que é isVisualOnly e não causa dano falso!
                                    CombatVisualSystem.spawnHitbox(originMesh, size, combo.offset, 200, null, 1.0, true);
                                }
                            }
                        }
                        // --- FIM DA MELHORIA ---
                    }
                }

                if (evt.type === "hit") {
                    if (typeof CombatVisualSystem !== 'undefined') {
                        if (evt.caster !== this.myID) {
                            CombatVisualSystem.spawnDamageNumber(evt.target, evt.dmg);
                            CombatVisualSystem.destroyProjectileFrom(evt.caster, evt.skill);
                        } else {
                            CombatVisualSystem.spawnDamageNumber(evt.target, evt.dmg);
                        }
                    }
                }
            });
        }
        
        const hint = document.getElementById('interaction-hint');
        let npcNear = false;
        for(let id in this.otherPlayers) {
            const other = this.otherPlayers[id];
            
            const isInteractableNPC = other.isNPC && (other.npcType === 'vendor' || other.npcType === 'nurse');
            const isFaintedPlayer = !other.isNPC && other.fainted;

            if(isInteractableNPC || isFaintedPlayer) { 
                 let d = this.playerGroup ? this.playerGroup.position.distanceTo(other.mesh.position) : 999;
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

        if(packet.skills_data) {
            window.GameSkills = packet.skills_data;
            if(typeof UISystem !== 'undefined') {
                UISystem.addLog("<span style='color:#2ecc71'>[Sistema Data-Driven Sincronizado]</span>", "log-hit");
                UISystem.lastSkillsStr = ""; 
            }
        }

        if(me.loaded == 1 && !this.isCharacterReady) {
            this.playerGroup = CharFactory.createCharacter(me.skin || "FFCCAA", me.cloth || "FF0000"); 
            
            if(me.x !== undefined) {
                this.playerGroup.position.set(me.x, me.y, me.z);
                NetworkSystem.lastSentX = me.x; NetworkSystem.lastSentY = me.y; NetworkSystem.lastSentZ = me.z;
            }

            if(typeof Engine !== 'undefined') Engine.scene.add(this.playerGroup); 
            this.isCharacterReady = true; 
            
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

            if(typeof UISystem !== 'undefined') UISystem.updatePersonalStatus(me);

            if(packet.evts) packet.evts.forEach(evt => { 
                if(evt.type === "dmg" && typeof CombatVisualSystem !== 'undefined') CombatVisualSystem.spawnDamageNumber(evt.tid, evt.val); 
                if(evt.type === "teleport") {
                    if(this.playerGroup) {
                        this.playerGroup.position.set(evt.x, evt.y, evt.z);
                        if(typeof NetworkSystem !== 'undefined') {
                            NetworkSystem.lastSentX = evt.x; NetworkSystem.lastSentY = evt.y; NetworkSystem.lastSentZ = evt.z;
                        }
                    }
                }
                if(evt.type === "skill_cast_accept" && typeof CombatSystem !== 'undefined') CombatSystem.startSkillCooldownUI(evt.skill); 
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
                
                if(UISystem.state.shopOpen) UISystem.toggleShop();
                if(UISystem.state.lootOpen) UISystem.closeLoot();

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

        if(typeof Engine !== 'undefined') {
            const idealX = this.playerGroup.position.x + Math.sin(Input.camAngle)*7;
            const idealY = this.playerGroup.position.y + 5;
            const idealZ = this.playerGroup.position.z + Math.cos(Input.camAngle)*7;

            Engine.camera.position.x = lerp(Engine.camera.position.x, idealX, 0.4 * timeScale);
            Engine.camera.position.y = lerp(Engine.camera.position.y, idealY, 0.4 * timeScale);
            Engine.camera.position.z = lerp(Engine.camera.position.z, idealZ, 0.4 * timeScale);

            Engine.camera.lookAt(this.playerGroup.position.x, this.playerGroup.position.y + 1.5, this.playerGroup.position.z);
        }
        
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
            const currentGroundH = lerp(other.startY, other.targetY, t);
            mesh.rotation.y = lerpAngle(other.startRot, other.targetRot, t);
            
            const dist = Math.sqrt(Math.pow(other.targetX - mesh.position.x, 2) + Math.pow(other.targetZ - mesh.position.z, 2)); 
            const isMoving = dist > 0.02;

            let remoteState = "DEFAULT";
            
            if(other.attacking && other.attackType) {
                const sDef = window.GameSkills ? window.GameSkills[other.attackType] : null;
                if(sDef) {
                    if(sDef.type === "melee" && sDef.combos) {
                        const cData = sDef.combos[(other.comboStep || 1) - 1];
                        if(cData) remoteState = cData.castAnimation || "DEFAULT";
                    } else {
                        remoteState = sDef.castAnimation || "DEFAULT";
                    }
                }
            }

            AnimationSystem.animateRig(mesh, remoteState, isMoving, other.isRunning, other.resting, other.fainted, currentGroundH);

            if(typeof Engine !== 'undefined') {
                const tempV = new THREE.Vector3(mesh.position.x, mesh.position.y + 2, mesh.position.z); tempV.project(Engine.camera);
                other.label.style.display = (Math.abs(tempV.z) > 1) ? 'none' : 'block'; 
                other.label.style.left = Math.round((tempV.x * .5 + .5) * window.innerWidth) + 'px'; 
                other.label.style.top = Math.round((-(tempV.y * .5) + .5) * window.innerHeight) + 'px';
            }
        }
    }
};

window.EntityManager = EntityManager;