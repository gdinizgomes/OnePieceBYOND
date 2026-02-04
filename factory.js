// factory.js - Construtor Universal com Correção de Escala
const CharFactory = {
    textureLoader: new THREE.TextureLoader(),

    // Cache de Geometrias
    geoCache: {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 12),
        sphere: new THREE.SphereGeometry(1, 16, 16),
        plane: new THREE.PlaneGeometry(1, 1)
    },

    // Cria um objeto 3D baseado na Definição
    createFromDef: function(defId, overrides = {}) {
        const def = GameDefinitions[defId];
        if (!def) {
            console.error(`Factory: Definição '${defId}' não encontrada.`);
            return new THREE.Mesh(this.geoCache.box, new THREE.MeshBasicMaterial({color: 0xFF00FF}));
        }

        const geometry = this.geoCache[def.visual.model] || this.geoCache.box;

        let material;
        const finalColor = overrides.color ? parseInt("0x" + overrides.color) : def.visual.color;

        if (def.visual.texture) {
            const tex = this.textureLoader.load(def.visual.texture);
            tex.magFilter = THREE.NearestFilter;
            material = new THREE.MeshPhongMaterial({ map: tex, transparent: true, color: 0xFFFFFF });
        } else {
            material = new THREE.MeshPhongMaterial({ color: finalColor });
        }

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        if (def.visual.scale) {
            mesh.scale.set(def.visual.scale[0], def.visual.scale[1], def.visual.scale[2]);
        }

        mesh.userData = { 
            id: def.id, 
            type: def.type, 
            tags: def.data?.tags || [] 
        };

        return mesh;
    },

    // --- CORREÇÃO AQUI: Montagem usando Âncoras (Groups) ---
    createCharacter: function(skinColor, clothColor) {
        const root = new THREE.Group(); // O Personagem inteiro

        // 1. Criar a "Espinha Dorsal" (Torso Anchor)
        // Usamos um Grupo invisível para segurar tudo. Ele tem escala 1,1,1, então não deforma os filhos.
        const torsoAnchor = new THREE.Group();
        torsoAnchor.position.y = 1.1; 
        root.add(torsoAnchor);

        // 2. O Visual do Torso (A caixa vermelha/azul)
        // Adicionamos à âncora, não somos pai de ninguém visualmente
        const torsoMesh = this.createFromDef("char_human_torso", { color: clothColor });
        // O mesh do torso já tem scale ajustado pelo createFromDef. 
        // Como ele é filho da âncora (scale 1), ele fica correto.
        torsoAnchor.add(torsoMesh);

        // 3. A Cabeça
        // Adicionamos à âncora também.
        const head = this.createFromDef("char_human_head", { color: skinColor });
        head.position.y = 0.55; // Posição relativa ao centro da âncora
        torsoAnchor.add(head);

        // Olhos (filhos da cabeça, ok herdar escala da cabeça pois são decorativos ou ajustados)
        const eyeDef = { visual: { model: "box", color: 0x000000, scale: [0.05, 0.05, 0.05] } }; // Definição temporária interna ou do JSON
        // Para simplificar, vou criar olhos manuais aqui ou usar createFromDef se tiver no JSON.
        // Vou usar box manual para garantir, já que não estão no definitions.js padrão acima
        const eyeGeo = this.geoCache.box;
        const eyeMat = new THREE.MeshBasicMaterial({color: 0x000000});
        
        const createEye = (x) => {
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.scale.set(0.05, 0.05, 0.05);
            // Ajuste fino: como a cabeça tem escala, precisamos posicionar "dentro" da escala dela
            // A cabeça tem tamanho ~0.35. O olho deve estar na frente.
            eye.position.set(x * (1/0.35), 0.05 * (1/0.35), 0.18 * (1/0.35)); 
            // Nota: Se a cabeça for escalada, posições filhas também são.
            // No código antigo: position.set(0.1, 0.05, 0.18).
            // Como head.scale é 0.35, a posição real seria 0.1*0.35 = 0.035. Muito perto.
            // SOLUÇÃO: Não adicione olhos como filhos de uma malha escalada se quiser controle preciso sem matemática chata.
            // Mas vamos manter simples:
            eye.position.set(x, 0.2, 0.6); // Valores chutados para compensar a escala da cabeça (0.35)
            return eye;
        };
        // Melhor abordagem para os olhos no sistema novo: 
        // Adicionar olhos ao JSON 'char_human_head' seria o ideal no futuro.
        // Por agora, vamos pular os olhos ou adicioná-los com valores testados:
        const eyeL = new THREE.Mesh(this.geoCache.box, eyeMat);
        eyeL.scale.set(0.15, 0.15, 0.15); // Relativo à cabeça pequena
        eyeL.position.set(0.3, 0.1, 0.51); // "Na cara" da cabeça
        head.add(eyeL);

        const eyeR = new THREE.Mesh(this.geoCache.box, eyeMat);
        eyeR.scale.set(0.15, 0.15, 0.15);
        eyeR.position.set(-0.3, 0.1, 0.51);
        head.add(eyeR);


        // 4. Membros (Pivots)
        // Adicionamos à âncora (TorsoAnchor).
        const createLimb = (defId, color, x, y, z) => {
            const pivot = new THREE.Group();
            pivot.position.set(x, y, z);
            
            const mesh = this.createFromDef(defId, { color: color });
            // Desloca visualmente para baixo do pivot
            mesh.position.y = -mesh.scale.y / 2; 
            
            pivot.add(mesh);
            return { pivot, mesh };
        };

        const lArm = createLimb("char_human_limb", skinColor, 0.35, 0.3, 0);
        const rArm = createLimb("char_human_limb", skinColor, -0.35, 0.3, 0);
        const lLeg = createLimb("char_human_limb", clothColor, 0.12, -0.35, 0);
        const rLeg = createLimb("char_human_limb", clothColor, -0.12, -0.35, 0);

        torsoAnchor.add(lArm.pivot); 
        torsoAnchor.add(rArm.pivot);
        torsoAnchor.add(lLeg.pivot); 
        torsoAnchor.add(rLeg.pivot);

        // Salva referências para animação
        root.userData.limbs = {
            leftArm: lArm.pivot,
            rightArm: rArm.pivot,
            leftLeg: lLeg.pivot,
            rightLeg: rLeg.pivot,
            head: head,
            torso: torsoAnchor // Para girar o corpo todo se precisar
        };

        return root;
    },

    equipItem: function(characterGroup, itemId) {
        const def = GameDefinitions[itemId];
        if (!def || def.type !== 'equipment') return;

        const limbs = characterGroup.userData.limbs;
        const targetBone = limbs[def.attachment.bone];

        if (targetBone) {
            // Remove item antigo (simples)
            for(let i = targetBone.children.length - 1; i >= 0; i--) {
                if(targetBone.children[i].userData.type === 'equipment') {
                    targetBone.remove(targetBone.children[i]);
                }
            }

            const itemMesh = this.createFromDef(itemId);
            
            if (def.attachment.pos) itemMesh.position.set(...def.attachment.pos);
            if (def.attachment.rot) itemMesh.rotation.set(...def.attachment.rot);

            targetBone.add(itemMesh);
        }
    }
};