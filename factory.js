// factory.js - Criação e Gerenciamento de Personagens
const CharFactory = {
    // Banco de Geometrias (Reutilização = Performance)
    geometries: {
        torso: new THREE.BoxGeometry(0.5, 0.7, 0.3),
        head: new THREE.BoxGeometry(0.35, 0.35, 0.35),
        eye: new THREE.BoxGeometry(0.05, 0.05, 0.05),
        arm: new THREE.BoxGeometry(0.15, 0.7, 0.15),
        leg: new THREE.BoxGeometry(0.18, 0.8, 0.18)
    },

    // Cria um personagem completo
    create: function(skinColorHex, clothColorHex) {
        const group = new THREE.Group();
        
        // Materiais (Únicos por personagem para permitir cores diferentes)
        const matSkin = new THREE.MeshPhongMaterial({ color: parseInt("0x" + skinColorHex) }); 
        const matClothes = new THREE.MeshPhongMaterial({ color: parseInt("0x" + clothColorHex) }); 
        const matEye = new THREE.MeshBasicMaterial({color: 0x000000});
        
        // --- Montagem Modular ---
        const torso = this.createPart(this.geometries.torso, matClothes, 0, 1.1, 0);
        group.add(torso);
        
        const head = this.createPart(this.geometries.head, matSkin, 0, 0.55, 0);
        torso.add(head);
        
        const eyeL = this.createPart(this.geometries.eye, matEye, 0.1, 0.05, 0.18);
        head.add(eyeL); // Olho é filho da cabeça
        
        const eyeR = this.createPart(this.geometries.eye, matEye, -0.1, 0.05, 0.18);
        head.add(eyeR);

        // Membros
        // Nota: Pivots são grupos vazios para rotação correta (ombro/quadril)
        const leftArm = this.createLimbPivot(this.geometries.arm, matSkin, 0.35, 0.3, 0);
        const rightArm = this.createLimbPivot(this.geometries.arm, matSkin, -0.35, 0.3, 0);
        const leftLeg = this.createLimbPivot(this.geometries.leg, matClothes, 0.12, -0.35, 0, 0.8);
        const rightLeg = this.createLimbPivot(this.geometries.leg, matClothes, -0.12, -0.35, 0, 0.8);
        
        torso.add(leftArm); torso.add(rightArm); torso.add(leftLeg); torso.add(rightLeg);
        
        // Salva referências para animação
        group.userData.limbs = { 
            leftArm: leftArm, 
            rightArm: rightArm, 
            leftLeg: leftLeg, 
            rightLeg: rightLeg 
        };
        
        return group;
    },

    // Helper simples para partes estáticas (cabeça, torso)
    createPart: function(geo, mat, x, y, z) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        return mesh;
    },

    // Helper para membros articulados (com pivot no topo)
    createLimbPivot: function(geo, mat, x, y, z, heightOverride = 0.7) {
        const pivot = new THREE.Group();
        pivot.position.set(x, y, z);
        
        const mesh = new THREE.Mesh(geo, mat);
        // Desloca a malha para baixo para que o pivot fique no topo (ombro)
        mesh.position.y = -heightOverride / 2; 
        mesh.castShadow = true;
        
        pivot.add(mesh);
        return pivot;
    }
};