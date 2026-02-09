// engine.js - Core do Cliente (Input, Math, Graphics)

function lerp(start, end, t) { return start * (1 - t) + end * t; }
function mod(n, m) { return ((n % m) + m) % m; }
function lerpAngle(start, end, t) {
    const diff = end - start;
    const shortestDiff = mod(diff + Math.PI, Math.PI * 2) - Math.PI;
    return start + shortestDiff * t;
}

function lerpLimbRotation(limb, targetRot, speed) {
    if(!limb || !targetRot) return;
    limb.rotation.x = lerp(limb.rotation.x, targetRot.x, speed);
    limb.rotation.y = lerp(limb.rotation.y, targetRot.y, speed);
    limb.rotation.z = lerp(limb.rotation.z, targetRot.z, speed);
}

const RAD = Math.PI / 180;

// POSES ARTICULADAS
const STANCES = {
    DEFAULT: { 
        rightArm: { x: 0, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: 0, y: 0, z: 0 }, leftForeArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 }, rightShin:    { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }, leftShin:     { x: 0, y: 0, z: 0 },
        torso:    { x: 0, y: 0, z: 0 }
    },
    
    // --- BOXE ---
    FIST_IDLE: { 
        torso:    { x: 0.1, y: 0, z: 0 }, 
        rightArm: { x: -0.8, y: 0.5, z: 0 }, rightForeArm: { x: -2.0, y: 0, z: 0 }, 
        leftArm:  { x: -0.8, y: -0.5, z: 0 }, leftForeArm:  { x: -2.0, y: 0, z: 0 }
    },
    FIST_WINDUP: {
        torso:    { x: 0, y: 0.2, z: 0 },
        rightArm: { x: -0.5, y: 0.5, z: 0 }, rightForeArm: { x: -2.2, y: 0, z: 0 },
        leftArm:  { x: -0.5, y: -0.5, z: 0 }, leftForeArm:  { x: -2.2, y: 0, z: 0 }
    },
    FIST_COMBO_1: {
        torso:    { x: 0, y: -0.4, z: 0 }, 
        leftArm:  { x: -1.5, y: -0.5, z: 0 },   leftForeArm:  { x: 0, y: 0, z: 0 },
        rightArm: { x: -0.8, y: 0.5, z: 0 }, rightForeArm: { x: -2.0, y: 0, z: 0 } 
    },
    FIST_COMBO_2: {
        torso:    { x: 0, y: 0.4, z: 0 }, 
        rightArm: { x: -1.5, y: 0.5, z: 0 },   rightForeArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: -0.8, y: -0.5, z: 0 }, leftForeArm:  { x: -2.0, y: 0, z: 0 } 
    },
    FIST_COMBO_3: {
        torso:    { x: 0.2, y: 0.8, z: 0 }, 
        rightArm: { x: -1.4, y: 0.2, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: -0.5, y: -0.5, z: 0 }, leftForeArm:  { x: -2.2, y: 0, z: 0 },
        rightLeg: { x: -0.5, y: 0, z: 0 }, rightShin: { x: 1.0, y: 0, z: 0 }
    },

    // --- KICKBOXING ---
    KICK_WINDUP: {
        torso: { x: -0.2, y: 0, z: 0 },
        rightLeg: { x: 0.5, y: 0, z: 0 }, rightShin: { x: 1.0, y: 0, z: 0 }, 
        leftLeg:  { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 },
        rightArm: { x: -0.8, y: 0.5, z: 0 }, rightForeArm: { x: -2.0, y: 0, z: 0 }, 
        leftArm:  { x: -0.8, y: -0.5, z: 0 }, leftForeArm:  { x: -2.0, y: 0, z: 0 }
    },
    KICK_COMBO_1: {
        torso:    { x: 0, y: 0.5, z: -0.2 }, 
        rightLeg: { x: -0.8, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 }, 
        leftLeg:  { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 },
        rightArm: { x: 0.5, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, 
        leftArm:  { x: -0.8, y: -0.5, z: 0 }, leftForeArm:  { x: -2.0, y: 0, z: 0 }
    },
    KICK_COMBO_2: {
        torso:    { x: 0, y: -0.5, z: 0.2 },
        leftLeg:  { x: -1.6, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, 
        rightLeg: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 },
        rightArm: { x: -0.8, y: 0.5, z: 0 }, rightForeArm: { x: -2.0, y: 0, z: 0 },
        leftArm:  { x: 0.5, y: 0, z: 0 }, leftForeArm:  { x: 0, y: 0, z: 0 }
    },
    KICK_COMBO_3: {
        torso:    { x: -0.3, y: 0.8, z: -0.4 }, 
        rightLeg: { x: -2.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 }, 
        leftLeg:  { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.5, y: 0, z: 0 }, 
        rightArm: { x: 1.0, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, 
        leftArm:  { x: -0.8, y: -0.5, z: 0 }, leftForeArm:  { x: -2.0, y: 0, z: 0 }
    },

    // --- ESPADA (HACK 'N SLASH) ---
    SWORD_IDLE: { 
        rightArm: { x: -20 * RAD, y: 0, z: 10 * RAD }, 
        rightForeArm: { x: -90 * RAD, y: 0, z: 0 },

        leftArm:  { x: 0, y: 0, z: -10 * RAD }, 
        leftForeArm: { x: 0, y: 0, z: 0 },

        // Pernas em base relaxada
        rightLeg: { x: 5 * RAD, y: 0, z: 0 }, 
        rightShin:{ x: -5 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -5 * RAD, y: 0, z: 0 }, 
        leftShin: { x: 5 * RAD, y: 0, z: 0 }
    },
    SWORD_WINDUP: { 
        torso: { x: 0, y: 45 * RAD, z: 5 * RAD },

        rightArm: { x: -45 * RAD, y: 65 * RAD, z: -15 * RAD },
        rightForeArm: { x: -25 * RAD, y: 10 * RAD, z: 0 },

        leftArm:  { x: 35 * RAD, y: -10 * RAD, z: 10 * RAD },
        leftForeArm: { x: 0, y: 0, z: 0 },

        // Peso vai para perna direita
        rightLeg: { x: -15 * RAD, y: 0, z: 0 },
        rightShin:{ x: 20 * RAD, y: 0, z: 0 },

        leftLeg:  { x: 10 * RAD, y: 0, z: 0 },
        leftShin: { x: -10 * RAD, y: 0, z: 0 }
    },
    // HIT 1: CORTE DIAGONAL (Direita -> Esquerda)
    SWORD_COMBO_1: {
        torso: { x: 0, y: -25 * RAD, z: 12 * RAD },

        rightArm: { x: -15 * RAD, y: -80 * RAD, z: -55 * RAD },
        rightForeArm: { x: 5 * RAD, y: -55 * RAD, z: -20 * RAD },

        leftArm:  { x: 25 * RAD, y: 20 * RAD, z: 25 * RAD },
        leftForeArm: { x: 0, y: 0, z: 0 },

        // Base abre, impacto sólido
        rightLeg: { x: 10 * RAD, y: 0, z: 0 },
        rightShin:{ x: -15 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -20 * RAD, y: 0, z: 0 },
        leftShin: { x: 25 * RAD, y: 0, z: 0 }
    },
    // HIT 2: CORTE HORIZONTAL ABERTO (Esquerda -> Direita)
    SWORD_COMBO_2: {
        torso: { x: 0, y: 40 * RAD, z: -10 * RAD },

        rightArm: { x: -10 * RAD, y: 130 * RAD, z: -45 * RAD },
        rightForeArm: { x: 10 * RAD, y: 60 * RAD, z: -10 * RAD },

        leftArm:  { x: -30 * RAD, y: -30 * RAD, z: 15 * RAD },
        leftForeArm: { x: -20 * RAD, y: 0, z: 0 },

        // Rotação passa pelas pernas
        rightLeg: { x: -5 * RAD, y: 0, z: 0 },
        rightShin:{ x: 10 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -25 * RAD, y: 0, z: 0 },
        leftShin: { x: 30 * RAD, y: 0, z: 0 }
    },
    // HIT 3: CORTE FINALIZADOR (CIMA -> BAIXO)
    SWORD_COMBO_3: {
        torso: { x: 0, y: -25 * RAD, z: 12 * RAD },

        rightArm: { x: -15 * RAD, y: -80 * RAD, z: -55 * RAD },
        rightForeArm: { x: 5 * RAD, y: -55 * RAD, z: -20 * RAD },

        leftArm:  { x: 25 * RAD, y: 20 * RAD, z: 25 * RAD },
        leftForeArm: { x: 0, y: 0, z: 0 },

        // Base abre, impacto sólido
        rightLeg: { x: 10 * RAD, y: 0, z: 0 },
        rightShin:{ x: -15 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -20 * RAD, y: 0, z: 0 },
        leftShin: { x: 25 * RAD, y: 0, z: 0 }
    },


    GUN_IDLE: {
        rightArm: { x: -70 * RAD, y: 0, z: 0 }, rightForeArm: { x: -20 * RAD, y: 0, z: 0 },
        leftArm:  { x: 0, y: 0, z: 0 }, leftForeArm:  { x: 0, y: 0, z: 0 }
    },
    GUN_ATK: { 
        rightArm: { x: -90 * RAD, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: 0, y: 0, z: 0 }, leftForeArm:  { x: 0, y: 0, z: 0 }
    },
    REST_SQUAT: {
        rightLeg: { x: 1.3, y: 0, z: 0.2 }, rightShin: { x: 2.6, y: 0, z: 0 },
        leftLeg:  { x: 1.3, y: 0, z: -0.2 }, leftShin:  { x: 2.6, y: 0, z: 0 },
        rightArm: { x: -0.7, y: 0, z: 0 }, rightForeArm: { x: -0.5, y: 0, z: 0 },
        leftArm:  { x: -0.7, y: 0, z: 0 }, leftForeArm:  { x: -0.5, y: 0, z: 0 }
    },
    REST_SIMPLE: {
        torso: { x: 0, y: 0, z: 0 },
        rightLeg: { x: -1.5, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 }, 
        leftLeg:  { x: -1.5, y: 0, z: 0 }, leftShin:  { x: 0, y: 0, z: 0 }, 
        rightArm: { x: 0.5, y: 0, z: 0 }, rightForeArm: { x: -0.5, y: 0, z: 0 },
        leftArm:  { x: 0.5, y: 0, z: 0 }, leftForeArm:  { x: -0.5, y: 0, z: 0 }
    }
};

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

const Engine = {
    scene: null, camera: null, renderer: null, dummyTarget: null, collidables: [], 
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
        road.rotation.x = -Math.PI / 2; road.receiveShadow = true;
        this.scene.add(road); this.scene.add(new THREE.GridHelper(MAP_SIZE, MAP_SIZE));
    },
    spawnProps: function() {
        const dummyGroup = new THREE.Group();
        dummyGroup.position.set(5, 0, 5);
        const logDef = GameDefinitions["prop_tree_log"];
        if(logDef) {
            const logMesh = CharFactory.createFromDef("prop_tree_log");
            logMesh.position.y = logDef.visual.scale[1] / 2;
            dummyGroup.add(logMesh);
            const isSolid = !logDef.physics || logDef.physics.solid !== false;
            if(isSolid) {
                if(logDef.physics && logDef.physics.standable) logMesh.userData.standable = true;
                this.collidables.push(logMesh);
            }
            const target = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
            target.position.y = 1.3; dummyGroup.add(target); dummyGroup.userData.hitZone = target;
        }
        this.scene.add(dummyGroup); this.dummyTarget = dummyGroup; dummyGroup.updateMatrixWorld(true);
    }
};
Engine.init();