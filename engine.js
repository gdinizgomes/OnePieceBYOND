// engine.js - Configuração do Three.js e Ambiente
const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    dummyTarget: null, // Alvo global para interação

    init: function() {
        // 1. Setup Three.js
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 15, 60);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        // 2. Luzes
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 3. Chão
        this.createGround();
        
        // 4. Objetos do Mapa (Props)
        this.spawnDummy(5, 5);
        
        // Evento de Resize
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    },

    createGround: function() {
        const MAP_SIZE = 60; 
        const road = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), new THREE.MeshPhongMaterial({ color: 0x333333 }));
        road.rotation.x = -Math.PI / 2; 
        road.receiveShadow = true;
        this.scene.add(road); 
        this.scene.add(new THREE.GridHelper(MAP_SIZE, MAP_SIZE));
    },

    spawnDummy: function(x, z) {
        const group = new THREE.Group();
        group.position.set(x, 0, z);
        
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
        trunk.position.y = 0.9; trunk.castShadow = true;
        
        const target = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        target.position.y = 1.3;
        
        // Alvo central (que muda de cor)
        const targetCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
        targetCenter.position.y = 1.3;
        
        group.add(trunk); group.add(target); group.add(targetCenter);
        this.scene.add(group);
        
        this.dummyTarget = group;
        // Guardamos referência na userData para fácil acesso
        group.userData.hitZone = targetCenter;
    }
};

// Inicializa imediatamente
Engine.init();