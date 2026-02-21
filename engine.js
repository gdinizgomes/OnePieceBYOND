// engine.js - Core do Cliente (Input, Math, Graphics)

// Configuração centralizada — altere aqui para refletir em todo o cliente
const Config = {
    RENDER_HEIGHT: 720,
    FOG_NEAR:  15,
    FOG_FAR:   60,
    MAP_SIZE:  58,   // = 29 * 2, alinhado com MAP_LIMIT do servidor ([-29, 29])
    
    // NOVIDADE: Controle de Produção. Coloque 'true' se quiser voltar a ver os quadrados vermelhos para testar.
    DEBUG_HITBOXES: true 
};

const RENDER_HEIGHT = Config.RENDER_HEIGHT;  // Alias de compatibilidade

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
    scene: null, camera: null, renderer: null, collidables: [], 
    init: function() {
        Input.init();
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, Config.FOG_NEAR, Config.FOG_FAR);
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: false }); 
        
        document.body.appendChild(this.renderer.domElement);
        
        this.renderer.domElement.style.width = "100%";
        this.renderer.domElement.style.height = "100%";
        this.renderer.domElement.style.display = "block";
        this.renderer.domElement.style.imageRendering = "pixelated"; 
        
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
        this.scene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(20, 50, 20);
        dirLight.castShadow = true;
        this.scene.add(dirLight);
        
        this.createGround();

        const onResize = () => {
            const aspect = window.innerWidth / window.innerHeight;
            const renderWidth = Math.floor(RENDER_HEIGHT * aspect);
            
            this.camera.aspect = aspect;
            this.camera.updateProjectionMatrix();

            this.renderer.setSize(renderWidth, RENDER_HEIGHT, false);
        };

        window.addEventListener('resize', onResize);
        onResize(); 
    },
    createGround: function() {
        const MAP_SIZE = Config.MAP_SIZE;
        const road = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), new THREE.MeshPhongMaterial({ color: 0x333333 }));
        road.rotation.x = -Math.PI / 2; 
        
        road.position.y = 0; 
        road.receiveShadow = true;
        this.scene.add(road); 
        
        const grid = new THREE.GridHelper(MAP_SIZE, MAP_SIZE);
        grid.position.y = 0.01; 
        this.scene.add(grid);
    }
};
Engine.init();