// factory.js - Construtor Universal (Suporte a Objetos Compostos/Lego)
const CharFactory = {
    textureLoader: new THREE.TextureLoader(),

    geoCache: {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        sphere: new THREE.SphereGeometry(1, 16, 16),
        plane: new THREE.PlaneGeometry(1, 1)
    },

    matCache: {},       // Dicionário para reaproveitamento de materiais
    matCacheOrder: [],  // Ordem de inserção para evicção LRU
    MAT_CACHE_MAX: 100, // Limite: evita acumular centenas de materiais em memória

    createMesh: function(visualData, overrides = {}) {
        const geometry = this.geoCache[visualData.model] || this.geoCache.box;
        const colorHex = overrides.color ? parseInt("0x" + overrides.color) : (visualData.color || 0xFFFFFF);
        const cacheKey = visualData.texture ? `${visualData.texture}_${colorHex}` : `${colorHex}`;

        let material = this.matCache[cacheKey];

        if (!material) {
            if (visualData.texture) {
                const tex = this.textureLoader.load(visualData.texture);
                tex.magFilter = THREE.NearestFilter;
                material = new THREE.MeshPhongMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: colorHex });
            } else {
                material = new THREE.MeshPhongMaterial({ color: colorHex });
            }
            // Evicção LRU: remove o material mais antigo quando cache está cheio
            if (this.matCacheOrder.length >= this.MAT_CACHE_MAX) {
                const oldest = this.matCacheOrder.shift();
                if (this.matCache[oldest]) {
                    // NOVIDADE CRÍTICA (VRAM Leak Fix): Limpa a textura alocada na placa de vídeo
                    if (this.matCache[oldest].map) this.matCache[oldest].map.dispose(); 
                    this.matCache[oldest].dispose();
                    delete this.matCache[oldest];
                }
            }
            this.matCache[cacheKey] = material;
            this.matCacheOrder.push(cacheKey);
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (visualData.scale) mesh.scale.set(visualData.scale[0], visualData.scale[1], visualData.scale[2]);
        if (visualData.pos) mesh.position.set(visualData.pos[0], visualData.pos[1], visualData.pos[2]);
        if (visualData.rot) mesh.rotation.set(visualData.rot[0], visualData.rot[1], visualData.rot[2]);

        return mesh;
    },

    // NOVIDADE CRÍTICA (Memory Management): Função segura para descartar instâncias de tela
    disposeEntity: function(entity) {
        if (!entity) return;
        if (entity.parent) entity.parent.remove(entity);
        
        // Limpa referências locais para forçar o Garbage Collector da RAM.
        // O descarte de VRAM é protegido e deixado para o matCache (evita apagar material em uso).
        entity.traverse((child) => {
            if (child.isMesh) {
                child.userData = {};
            }
        });
    },

    createFromDef: function(defId, overrides = {}) {
        const def = GameDefinitions[defId];
        if (!def) {
            console.error(`Factory: Definição '${defId}' não encontrada.`);
            return new THREE.Mesh(this.geoCache.box, new THREE.MeshBasicMaterial({color: 0xFF00FF})); 
        }

        // NOVIDADE (Padronização e ECS): Schema universal para todos os objetos do jogo
        const stdUserData = {
            id: def.id || defId,
            name: def.name || "Unknown",
            type: def.type || "generic",
            tags: def.tags || (def.data ? def.data.tags : []) || [], // Corrige o bug de leitura de tags
            gameplay: def.data || {},
            physics: def.physics || null
        };
        if (def.physics && def.physics.standable) stdUserData.standable = true;

        if (def.visual.model === "group" && def.visual.parts) {
            const group = new THREE.Group();
            def.visual.parts.forEach(partDef => {
                const mesh = this.createMesh(partDef);
                group.add(mesh);
            });
            group.userData = { ...stdUserData };
            return group;
        } 

        const mesh = this.createMesh(def.visual, overrides);
        mesh.userData = { ...stdUserData };
        return mesh;
    },

    // --- CRIAÇÃO HIERÁRQUICA (RIGGING) ---
    createCharacter: function(skinColor, clothColor) {
        const root = new THREE.Group(); 

        // 1. TORSO (Base)
        const torsoGroup = new THREE.Group();
        // AJUSTE DE ALTURA PERFEITO: Subindo para 1.20, a ponta inferior do pé fica matematicamente em 0.0.
        torsoGroup.position.y = 1.20; 
        root.add(torsoGroup);

        const torsoMesh = this.createFromDef("char_torso", { color: clothColor });
        torsoGroup.add(torsoMesh);

        // 2. CABEÇA
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.45; 
        torsoGroup.add(headGroup);
        const headMesh = this.createFromDef("char_head", { color: skinColor });
        headGroup.add(headMesh);

        // Olhos
        const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
        const eyeL = new THREE.Mesh(this.geoCache.box, eyeMat); eyeL.scale.set(0.05, 0.05, 0.05); eyeL.position.set(0.08, 0.05, 0.16); headGroup.add(eyeL);
        const eyeR = new THREE.Mesh(this.geoCache.box, eyeMat); eyeR.scale.set(0.05, 0.05, 0.05); eyeR.position.set(-0.08, 0.05, 0.16); headGroup.add(eyeR);

        // --- FUNÇÃO AUXILIAR PARA CRIAR MEMBROS ARTICULADOS ---
        function createLimbChain(side, colorUpper, colorLower, yOffset, isLeg) {
            const xDir = (side === "left") ? 1 : -1;
            const xPos = isLeg ? (0.10 * xDir) : (0.28 * xDir);
            const yPos = isLeg ? -0.30 : 0.25;

            // PIVÔ SUPERIOR
            const upperPivot = new THREE.Group();
            upperPivot.position.set(xPos, yPos, 0);
            torsoGroup.add(upperPivot);

            const upperDef = isLeg ? "char_upper_leg" : "char_upper_arm";
            const upperMesh = CharFactory.createFromDef(upperDef, { color: colorUpper });
            upperMesh.position.y = -upperMesh.scale.y / 2;
            upperPivot.add(upperMesh);

            // PIVÔ INFERIOR
            const lowerPivot = new THREE.Group();
            lowerPivot.position.y = -upperMesh.scale.y; 
            upperPivot.add(lowerPivot);

            const lowerDef = isLeg ? "char_lower_leg" : "char_lower_arm";
            const lowerMesh = CharFactory.createFromDef(lowerDef, { color: colorLower });
            lowerMesh.position.y = -lowerMesh.scale.y / 2;
            lowerPivot.add(lowerMesh);

            // PIVÔ EXTREMIDADE
            const endPivot = new THREE.Group();
            endPivot.position.y = -lowerMesh.scale.y;
            lowerPivot.add(endPivot);

            const endDef = isLeg ? "char_foot" : "char_hand";
            const endMesh = CharFactory.createFromDef(endDef, { color: isLeg ? 0x333333 : skinColor }); 
            
            if(isLeg) {
                endMesh.position.y = -0.05; endMesh.position.z = 0.05; // Pé pra frente
            } else {
                endMesh.position.y = -0.05; // Mão pendurada
            }
            endPivot.add(endMesh);

            return { upper: upperPivot, lower: lowerPivot, end: endPivot };
        }

        const lArm = createLimbChain("left", skinColor, skinColor, 0, false);
        const rArm = createLimbChain("right", skinColor, skinColor, 0, false);
        const lLeg = createLimbChain("left", clothColor, clothColor, 0, true);
        const rLeg = createLimbChain("right", clothColor, clothColor, 0, true);

        root.userData.limbs = {
            head: headGroup, torso: torsoGroup,
            leftArm: lArm.upper, leftForeArm: lArm.lower, leftHand: lArm.end,
            rightArm: rArm.upper, rightForeArm: rArm.lower, rightHand: rArm.end,
            leftLeg: lLeg.upper, leftShin: lLeg.lower, leftFoot: lLeg.end,
            rightLeg: rLeg.upper, rightShin: rLeg.lower, rightFoot: rLeg.end
        };

        return root;
    },

    // --- EQUIPAMENTO INTELIGENTE v3 ---
    equipItem: function(characterGroup, itemId, oldItemId) {
        if(!characterGroup || !characterGroup.userData.limbs) return;
        
        if(oldItemId && oldItemId !== "") {
            const oldDef = GameDefinitions[oldItemId];
            if(oldDef && oldDef.type === 'equipment') {
                const attachments = oldDef.attachments || [oldDef.attachment];
                attachments.forEach(att => {
                    if(!att || !att.bone) return;
                    const targetBone = characterGroup.userData.limbs[att.bone];
                    if(targetBone) {
                        for(let i = targetBone.children.length - 1; i >= 0; i--) {
                            const child = targetBone.children[i];
                            if(child.userData && child.userData.id === oldItemId) {
                                // NOVIDADE: Chama o dispose para limpar memória do item que foi desequipado
                                CharFactory.disposeEntity(child);
                            }
                        }
                    }
                });
            }
        }

        if(!itemId || itemId === "none" || itemId === "") return;
        
        const def = GameDefinitions[itemId];
        if (!def || def.type !== 'equipment') return;

        const attachments = def.attachments || [def.attachment];
        attachments.forEach(att => {
            if(!att || !att.bone) return;
            const targetBone = characterGroup.userData.limbs[att.bone];

            if(targetBone) {
                let itemObj;

                if (att.visual) {
                    itemObj = this.createMesh(att.visual);
                    itemObj.userData = { id: itemId, type: 'equipment', tags: def.tags || [] };
                } else {
                    itemObj = this.createFromDef(itemId);
                    itemObj.userData.type = 'equipment'; 
                    itemObj.userData.id = itemId;
                }
                
                if (att.pos) itemObj.position.set(...att.pos);
                if (att.rot) itemObj.rotation.set(...att.rot);

                targetBone.add(itemObj);
            }
        });
    }
};