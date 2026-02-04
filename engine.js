// engine.js - Configuração do Three.js e Ambiente
const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    dummyTarget: null, 

    init: function() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 15, 60);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.body.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        this.createGround();
        this.spawnProps();

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

    spawnProps: function() {
        // Exemplo: Criando objeto baseado na definição do JSON
        // Isso prova que podemos criar qualquer coisa se tivermos a definição
        const dummyGroup = new THREE.Group();
        dummyGroup.position.set(5, 0, 5);

        // Cria o tronco usando a definição
        const logDef = GameDefinitions["prop_tree_log"];
        if(logDef) {
            const logMesh = CharFactory.createFromDef("prop_tree_log");
            logMesh.position.y = logDef.visual.scale[1] / 2; // Ajusta pivot pra base
            dummyGroup.add(logMesh);
            
            // Alvo visual (hardcoded por enquanto pois é lógica específica de treino)
            const target = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
            target.position.y = 1.3;
            dummyGroup.add(target);
            dummyGroup.userData.hitZone = target;
        }

        this.scene.add(dummyGroup);
        this.dummyTarget = dummyGroup;
    }
};

Engine.init();