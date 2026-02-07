// factory.js - Construtor Universal (Suporte a Objetos Compostos/Lego)
const CharFactory = {
    textureLoader: new THREE.TextureLoader(),

    // Cache de Geometrias Básicas para performance
    geoCache: {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        sphere: new THREE.SphereGeometry(1, 16, 16),
        plane: new THREE.PlaneGeometry(1, 1)
    },

    // Cria um Bloco Único
    createMesh: function(visualData, overrides = {}) {
        // Seleciona a geometria (padrão é box)
        const geometry = this.geoCache[visualData.model] || this.geoCache.box;
        let material;

        // Prioridade de cor: Override > VisualData > Branco Padrão
        const colorHex = overrides.color ? parseInt("0x" + overrides.color) : (visualData.color || 0xFFFFFF);

        if (visualData.texture) {
            const tex = this.textureLoader.load(visualData.texture);
            tex.magFilter = THREE.NearestFilter; // Mantém o Pixel Art nítido
            material = new THREE.MeshPhongMaterial({ map: tex, transparent: true, alphaTest: 0.5, color: colorHex });
        } else {
            material = new THREE.MeshPhongMaterial({ color: colorHex });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Aplica escala se definida
        if (visualData.scale) {
            mesh.scale.set(visualData.scale[0], visualData.scale[1], visualData.scale[2]);
        }
        
        // Aplica posição relativa (essencial para peças de Lego)
        if (visualData.pos) {
            mesh.position.set(visualData.pos[0], visualData.pos[1], visualData.pos[2]);
        }
        
        // Aplica rotação relativa
        if (visualData.rot) {
            mesh.rotation.set(visualData.rot[0], visualData.rot[1], visualData.rot[2]);
        }

        return mesh;
    },

    // Função Principal: Cria o objeto baseado no ID
    createFromDef: function(defId, overrides = {}) {
        const def = GameDefinitions[defId];
        if (!def) {
            console.error(`Factory: Definição '${defId}' não encontrada.`);
            return new THREE.Mesh(this.geoCache.box, new THREE.MeshBasicMaterial({color: 0xFF00FF})); // Erro rosa
        }

        // --- SISTEMA LEGO (NOVO) ---
        // Se o modelo for "group" e tiver "parts", montamos peça por peça
        if (def.visual.model === "group" && def.visual.parts) {
            const group = new THREE.Group();
            
            def.visual.parts.forEach(partDef => {
                const mesh = this.createMesh(partDef);
                group.add(mesh);
            });

            // Metadados para o jogo saber o que é isso
            group.userData = { id: def.id, type: def.type, tags: def.data?.tags || [] };
            return group;
        } 
        // ---------------------------

        // Comportamento Antigo (Bloco Único)
        const mesh = this.createMesh(def.visual, overrides);
        mesh.userData = { id: def.id, type: def.type, tags: def.data?.tags || [] };
        return mesh;
    },

    createCharacter: function(skinColor, clothColor) {
        const root = new THREE.Group(); 

        // Âncora do Torso (para não deformar filhos ao escalar)
        const torsoAnchor = new THREE.Group();
        torsoAnchor.position.y = 1.1; 
        root.add(torsoAnchor);

        const torsoMesh = this.createFromDef("char_human_torso", { color: clothColor });
        torsoAnchor.add(torsoMesh);

        const head = this.createFromDef("char_human_head", { color: skinColor });
        head.position.y = 0.55; 
        torsoAnchor.add(head);

        // Olhos simples
        const eyeGeo = this.geoCache.box;
        const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
        
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.scale.set(0.15, 0.15, 0.15); 
        eyeL.position.set(0.3, 0.1, 0.51); 
        head.add(eyeL);

        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.scale.set(0.15, 0.15, 0.15);
        eyeR.position.set(-0.3, 0.1, 0.51);
        head.add(eyeR);

        const createLimb = (defId, color, x, y, z) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            const mesh = this.createFromDef(defId, { color: color });
            mesh.position.y = -mesh.scale.y / 2; // Centraliza no pivô
            pivot.add(mesh);
            return { pivot, mesh };
        };

        const lArm = createLimb("char_human_limb", skinColor, 0.35, 0.3, 0);
        const rArm = createLimb("char_human_limb", skinColor, -0.35, 0.3, 0);
        const lLeg = createLimb("char_human_limb", clothColor, 0.12, -0.35, 0);
        const rLeg = createLimb("char_human_limb", clothColor, -0.12, -0.35, 0);

        torsoAnchor.add(lArm.pivot); torsoAnchor.add(rArm.pivot);
        torsoAnchor.add(lLeg.pivot); torsoAnchor.add(rLeg.pivot);

        root.userData.limbs = {
            leftArm: lArm.pivot, rightArm: rArm.pivot,
            leftLeg: lLeg.pivot, rightLeg: rLeg.pivot,
            head: head, torso: torsoAnchor
        };
        return root;
    },

    equipItem: function(characterGroup, itemId) {
        if(!itemId || itemId === "none") {
             // Lógica de desequipar
             const limbs = characterGroup.userData.limbs;
             // Limpa ambas as mãos por segurança ou apenas a direita
             // Aqui assumimos destro
             const targetBone = limbs.rightArm;
             for(let i = targetBone.children.length - 1; i >= 0; i--) {
                if(targetBone.children[i].userData.type === 'equipment') {
                    targetBone.remove(targetBone.children[i]);
                }
            }
            return;
        }
        
        const def = GameDefinitions[itemId];
        if (!def || def.type !== 'equipment') return;

        const limbs = characterGroup.userData.limbs;
        const targetBone = limbs[def.attachment.bone];

        if (targetBone) {
            // Remove item antigo antes de por o novo
            for(let i = targetBone.children.length - 1; i >= 0; i--) {
                if(targetBone.children[i].userData.type === 'equipment') {
                    targetBone.remove(targetBone.children[i]);
                }
            }

            // Cria o novo item
            const itemObj = this.createFromDef(itemId);
            itemObj.userData.type = 'equipment'; // Marca para remoção futura
            
            if (def.attachment.pos) itemObj.position.set(...def.attachment.pos);
            if (def.attachment.rot) itemObj.rotation.set(...def.attachment.rot);

            targetBone.add(itemObj);
        }
    }
};