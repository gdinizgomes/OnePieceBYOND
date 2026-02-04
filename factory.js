// factory.js - Construtor Universal baseado em Dados
const CharFactory = {
    textureLoader: new THREE.TextureLoader(),

    // Cache de Geometrias para performance (Instancing seria o próximo passo)
    geoCache: {
        box: new THREE.BoxGeometry(1, 1, 1), // Base unitária, escalamos depois
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        sphere: new THREE.SphereGeometry(1, 16, 16),
        plane: new THREE.PlaneGeometry(1, 1)
    },

    // Cria um objeto 3D baseado na Definição (ID)
    createFromDef: function(defId, overrides = {}) {
        const def = GameDefinitions[defId];
        if (!def) {
            console.error(`Factory: Definição '${defId}' não encontrada.`);
            return new THREE.Mesh(this.geoCache.box, new THREE.MeshBasicMaterial({color: 0xFF00FF})); // Erro rosa
        }

        // 1. Geometria
        const geometry = this.geoCache[def.visual.model] || this.geoCache.box;

        // 2. Material
        let material;
        // Permite override de cor (ex: pele/roupa do player)
        const finalColor = overrides.color ? parseInt("0x" + overrides.color) : def.visual.color;

        if (def.visual.texture) {
            const tex = this.textureLoader.load(def.visual.texture);
            tex.magFilter = THREE.NearestFilter; // Pixel Art
            material = new THREE.MeshPhongMaterial({ map: tex, transparent: true, color: 0xFFFFFF });
        } else {
            material = new THREE.MeshPhongMaterial({ color: finalColor });
        }

        // 3. Mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // 4. Escala (Aplicamos a escala visual definida no JSON)
        if (def.visual.scale) {
            mesh.scale.set(def.visual.scale[0], def.visual.scale[1], def.visual.scale[2]);
        }

        // Guarda dados lógicos no objeto 3D para uso futuro (ex: clique)
        mesh.userData = { 
            id: def.id, 
            type: def.type, 
            tags: def.data?.tags || [] 
        };

        return mesh;
    },

    // Monta um Personagem completo usando peças definidas
    createCharacter: function(skinColor, clothColor) {
        const group = new THREE.Group();

        // Helper para criar partes com offsets específicos do corpo humano
        // (Isso ainda é meio hardcoded pois é a estrutura do esqueleto, mas as peças vêm do JSON)
        
        const torso = this.createFromDef("char_human_torso", { color: clothColor });
        torso.position.y = 1.1; // Altura do centro do corpo
        group.add(torso);

        const head = this.createFromDef("char_human_head", { color: skinColor });
        head.position.y = 0.55; // Relativo ao Torso
        torso.add(head);

        // Função interna para criar membros com pivot correto
        const createLimb = (defId, color, x, y, z) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            
            const mesh = this.createFromDef(defId, { color: color });
            // Desloca mesh para que o pivot seja no topo
            mesh.position.y = -mesh.scale.y / 2; 
            
            pivot.add(mesh);
            return { pivot, mesh }; // Retorna pivot para animação e mesh para tintura
        };

        const lArm = createLimb("char_human_limb", skinColor, 0.35, 0.3, 0);
        const rArm = createLimb("char_human_limb", skinColor, -0.35, 0.3, 0);
        const lLeg = createLimb("char_human_limb", clothColor, 0.12, -0.35, 0); // Pernas usam mesma geo por enquanto
        const rLeg = createLimb("char_human_limb", clothColor, -0.12, -0.35, 0);

        // Ajuste específico de pernas (mais grossas/compridas se quiser mudar no JSON depois)
        // Mas por enquanto usamos o padrão do JSON

        torso.add(lArm.pivot); torso.add(rArm.pivot);
        torso.add(lLeg.pivot); torso.add(rLeg.pivot);

        // Salva referências para o sistema de animação
        group.userData.limbs = {
            leftArm: lArm.pivot,
            rightArm: rArm.pivot,
            leftLeg: lLeg.pivot,
            rightLeg: rLeg.pivot,
            head: head
        };

        return group;
    },

    // Equipa um item baseado no JSON de Definição
    equipItem: function(characterGroup, itemId) {
        const def = GameDefinitions[itemId];
        if (!def || def.type !== 'equipment') return;

        const limbs = characterGroup.userData.limbs;
        const targetBone = limbs[def.attachment.bone];

        if (targetBone) {
            // Remove item anterior se houver (lógica simples)
            // Idealmente teríamos slots nomeados: targetBone.getObjectByName("weapon_slot")
            
            const itemMesh = this.createFromDef(itemId);
            
            // Aplica Offsets definidos no JSON
            if (def.attachment.pos) itemMesh.position.set(...def.attachment.pos);
            if (def.attachment.rot) itemMesh.rotation.set(...def.attachment.rot);

            targetBone.add(itemMesh);
        }
    }
};