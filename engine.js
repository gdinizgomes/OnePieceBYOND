// engine.js - Core do Cliente (Input, Math, Graphics)

// --- 1. MÓDULO DE MATEMÁTICA E ANIMAÇÃO ---
function lerp(start, end, t) { return start * (1 - t) + end * t; }
function mod(n, m) { return ((n % m) + m) % m; }
function lerpAngle(start, end, t) {
    const diff = end - start;
    const shortestDiff = mod(diff + Math.PI, Math.PI * 2) - Math.PI;
    return start + shortestDiff * t;
}
function lerpLimbRotation(limb, targetRot, speed) {
    limb.rotation.x = lerp(limb.rotation.x, targetRot.x, speed);
    limb.rotation.y = lerp(limb.rotation.y, targetRot.y, speed);
    limb.rotation.z = lerp(limb.rotation.z, targetRot.z, speed);
}

const RAD = Math.PI / 180;
const STANCES = {
    DEFAULT: { 
        rightArm: { x: 0, y: 0, z: 0 }, leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 }, leftLeg:  { x: 0, y: 0, z: 0 }
    },
    SWORD_IDLE: { 
        rightArm: { x: -45 * RAD, y: -10 * RAD, z: 30 * RAD }, leftArm:  { x: 20 * RAD, y: 0, z: -10 * RAD },
        rightLeg: { x: 0, y: 0, z: 0 }, leftLeg:  { x: 0, y: 0, z: 0 }
    },
    SWORD_WINDUP: { 
        rightArm: { x: -110 * RAD, y: -20 * RAD, z: 40 * RAD }, leftArm:  { x: 40 * RAD, y: 20 * RAD, z: -20 * RAD },
        rightLeg: { x: -20 * RAD, y: 0, z: 0 }, leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    SWORD_ATK_1: { 
        rightArm: { x: 60 * RAD, y: -40 * RAD, z: 10 * RAD }, leftArm:  { x: -30 * RAD, y: 0, z: -30 * RAD }, 
        rightLeg: { x: 20 * RAD, y: 0, z: 0 }, leftLeg:  { x: -10 * RAD, y: 0, z: 0 }
    },
    FIST_IDLE: { 
        rightArm: { x: -60 * RAD, y: 40 * RAD, z: 0 }, leftArm:  { x: -60 * RAD, y: -40 * RAD, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 }, leftLeg:  { x: 0, y: 0, z: 0 }
    },
    FIST_WINDUP: {
        rightArm: { x: -40 * RAD, y: 60 * RAD, z: 0 }, leftArm:  { x: -70 * RAD, y: -30 * RAD, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 }, leftLeg:  { x: 0, y: 0, z: 0 }
    },
    FIST_ATK: {
        rightArm: { x: -80 * RAD, y: -10 * RAD, z: -10 * RAD }, leftArm:  { x: -60 * RAD, y: -40 * RAD, z: 0 },
        rightLeg: { x: 20 * RAD, y: 0, z: 0 }, leftLeg:  { x: -10 * RAD, y: 0, z: 0 }
    },
    KICK_WINDUP: {
        rightArm: { x: -30 * RAD, y: 0, z: 0 }, leftArm:  { x: -30 * RAD, y: 0, z: 0 },
        rightLeg: { x: 40 * RAD, y: 0, z: 0 }, leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    KICK_ATK: {
        rightArm: { x: 20 * RAD, y: 0, z: -30 * RAD }, leftArm:  { x: 20 * RAD, y: 0, z: 30 * RAD },
        rightLeg: { x: -90 * RAD, y: 0, z: 0 }, leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    GUN_IDLE: {
        rightArm: { x: -90 * RAD, y: -5 * RAD, z: 0 }, leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: -10 * RAD, y: 0, z: 0 }, leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    GUN_ATK: { 
        rightArm: { x: -70 * RAD, y: -5 * RAD, z: 0 }, leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: -10 * RAD, y: 0, z: 0 }, leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    }
};

// --- 2. MÓDULO DE INPUT ---
const Input = {
    keys: { arrowup: false, arrowdown: false, arrowleft: false, arrowright: false, " ": false },
    mouseRight: false,
    lastMouseX: 0,
    camAngle: Math.PI, 

    init: function() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('mousedown', e => { if(e.button===2){this.mouseRight=true; this.lastMouseX=e.clientX;} });
        document.addEventListener('mouseup', e => { if(e.button===2) this.mouseRight=false; });
        document.addEventListener('mousemove', e => { 
            if(this.mouseRight) { 
                this.camAngle -= (e.clientX - this.lastMouseX) * 0.005; 
                this.lastMouseX = e.clientX; 
            } 
        });
    },

    onKeyDown: function(e) {
        const k = e.key.toLowerCase();
        if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
        
        if(['a', 's', 'd', 'f', 'p'].includes(k)) {
            window.dispatchEvent(new CustomEvent('game-action', { detail: k }));
        }
    },

    onKeyUp: function(e) {
        if(this.keys.hasOwnProperty(e.key.toLowerCase())) this.keys[e.key.toLowerCase()] = false;
    }
};

// --- 3. MÓDULO ENGINE GRÁFICA ---
const Engine = {
    scene: null,
    camera: null,
    renderer: null,
    dummyTarget: null,
    collidables: [], // Lista GLOBAL de objetos sólidos

    init: function() {
        Input.init();

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
        const dummyGroup = new THREE.Group();
        dummyGroup.position.set(5, 0, 5);

        const logDef = GameDefinitions["prop_tree_log"];
        if(logDef) {
            const logMesh = CharFactory.createFromDef("prop_tree_log");
            logMesh.position.y = logDef.visual.scale[1] / 2;
            dummyGroup.add(logMesh);
            
            // Lógica de Colisão
            const isSolid = !logDef.physics || logDef.physics.solid !== false;
            
            if(isSolid) {
                // Passa a propriedade 'standable' para a malha, para o game.js saber se pode pisar
                if(logDef.physics && logDef.physics.standable) {
                    logMesh.userData.standable = true;
                }
                this.collidables.push(logMesh);
            }
            
            const target = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
            target.position.y = 1.3;
            dummyGroup.add(target);
            dummyGroup.userData.hitZone = target;
        }

        this.scene.add(dummyGroup);
        this.dummyTarget = dummyGroup;
        
        dummyGroup.updateMatrixWorld(true);
    }
};

Engine.init();