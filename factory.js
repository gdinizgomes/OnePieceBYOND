// factory.js - Construtor Universal (Suporte a Objetos Compostos/Lego)
const CharFactory = {
    textureLoader: new THREE.TextureLoader(),

    geoCache: {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        sphere: new THREE.SphereGeometry(1, 16, 16),
        plane: new THREE.PlaneGeometry(1, 1)
    },

    createMesh: function(visualData, overrides = {}) {
        const geometry = this.geoCache[visualData.model] || this.geoCache.box;
        let material;
        const colorHex = overrides.color ? parseInt("0x" + overrides.color) : (visualData.color || 0xFFFFFF);

        if (visualData.texture) {
            const tex = this.textureLoader.load(visualData.texture);
            tex.magFilter = THREE.NearestFilter; 
            material = new THREE.MeshPhongMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: colorHex });
        } else {
            material = new THREE.MeshPhongMaterial({ color: colorHex });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (visualData.scale) mesh.scale.set(visualData.scale[0], visualData.scale[1], visualData.scale[2]);
        if (visualData.pos) mesh.position.set(visualData.pos[0], visualData.pos[1], visualData.pos[2]);
        if (visualData.rot) mesh.rotation.set(visualData.rot[0], visualData.rot[1], visualData.rot[2]);

        return mesh;
    },

    createFromDef: function(defId, overrides = {}) {
        const def = GameDefinitions[defId];
        if (!def) {
            console.error(`Factory: Definição '${defId}' não encontrada.`);
            return new THREE.Mesh(this.geoCache.box, new THREE.MeshBasicMaterial({color: 0xFF00FF})); 
        }

        if (def.visual.model === "group" && def.visual.parts) {
            const group = new THREE.Group();
            def.visual.parts.forEach(partDef => {
                const mesh = this.createMesh(partDef);
                group.add(mesh);
            });
            group.userData = { id: def.id, type: def.type, tags: def.data?.tags || [] };
            return group;
        } 

        const mesh = this.createMesh(def.visual, overrides);
        mesh.userData = { id: def.id, type: def.type, tags: def.data?.tags || [] };
        return mesh;
    },

    // --- NOVA FUNÇÃO DE CRIAÇÃO HIERÁRQUICA (RIGGING) ---
    createCharacter: function(skinColor, clothColor) {
        const root = new THREE.Group(); 

        // 1. TORSO (Base)
        const torsoGroup = new THREE.Group();
        torsoGroup.position.y = 1.0; // Centro de gravidade
        root.add(torsoGroup);

        const torsoMesh = this.createFromDef("char_torso", { color: clothColor });
        torsoGroup.add(torsoMesh);

        // 2. CABEÇA
        const headGroup = new THREE.Group();
        headGroup.position.y = 0.45; // Em cima do torso
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

            // PIVÔ SUPERIOR (Ombro ou Quadril)
            const upperPivot = new THREE.Group();
            upperPivot.position.set(xPos, yPos, 0);
            torsoGroup.add(upperPivot);

            const upperDef = isLeg ? "char_upper_leg" : "char_upper_arm";
            const upperMesh = CharFactory.createFromDef(upperDef, { color: colorUpper });
            // Ajusta o mesh para que o pivô fique no topo
            upperMesh.position.y = -upperMesh.scale.y / 2;
            upperPivot.add(upperMesh);

            // PIVÔ INFERIOR (Cotovelo ou Joelho)
            const lowerPivot = new THREE.Group();
            lowerPivot.position.y = -upperMesh.scale.y; // Final do osso superior
            upperPivot.add(lowerPivot);

            const lowerDef = isLeg ? "char_lower_leg" : "char_lower_arm";
            const lowerMesh = CharFactory.createFromDef(lowerDef, { color: colorLower });
            lowerMesh.position.y = -lowerMesh.scale.y / 2;
            lowerPivot.add(lowerMesh);

            // PIVÔ EXTREMIDADE (Punho ou Pé)
            const endPivot = new THREE.Group();
            endPivot.position.y = -lowerMesh.scale.y;
            lowerPivot.add(endPivot);

            const endDef = isLeg ? "char_foot" : "char_hand";
            const endMesh = CharFactory.createFromDef(endDef, { color: isLeg ? 0x333333 : skinColor }); // Sapato ou Mão
            
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

        // Mapa de Ossos para animação e equipamentos
        root.userData.limbs = {
            head: headGroup, torso: torsoGroup,
            
            leftArm: lArm.upper, leftForeArm: lArm.lower, leftHand: lArm.end,
            rightArm: rArm.upper, rightForeArm: rArm.lower, rightHand: rArm.end,
            
            leftLeg: lLeg.upper, leftShin: lLeg.lower, leftFoot: lLeg.end,
            rightLeg: rLeg.upper, rightShin: rLeg.lower, rightFoot: rLeg.end
        };

        return root;
    },

    equipItem: function(characterGroup, itemId) {
        if(!characterGroup || !characterGroup.userData.limbs) return;
        
        // Remove item da mão direita (Padrão atual)
        const handBone = characterGroup.userData.limbs.rightHand;
        
        // Limpa slot
        for(let i = handBone.children.length - 1; i >= 0; i--) {
            if(handBone.children[i].userData.type === 'equipment') {
                handBone.remove(handBone.children[i]);
            }
        }

        if(!itemId || itemId === "none") return;
        
        const def = GameDefinitions[itemId];
        if (!def || def.type !== 'equipment') return;

        // Procura o osso correto (agora suporta rightHand, head, etc)
        const targetBone = characterGroup.userData.limbs[def.attachment.bone];

        if (targetBone) {
            const itemObj = this.createFromDef(itemId);
            itemObj.userData.type = 'equipment'; 
            
            if (def.attachment.pos) itemObj.position.set(...def.attachment.pos);
            if (def.attachment.rot) itemObj.rotation.set(...def.attachment.rot);

            targetBone.add(itemObj);
        }
    }
};