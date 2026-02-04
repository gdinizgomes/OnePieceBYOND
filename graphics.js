// Configuração do Three.js
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 15, 60);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Luzes
const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
dirLight.position.set(20, 50, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Mapa e Ambiente
const MAP_SIZE = 60; 
const road = new THREE.Mesh(new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE), new THREE.MeshPhongMaterial({ color: 0x333333 }));
road.rotation.x = -Math.PI / 2; 
road.receiveShadow = true;
scene.add(road); 
scene.add(new THREE.GridHelper(MAP_SIZE, MAP_SIZE));

// Dummy de Treino
const dummyGroup = new THREE.Group();
dummyGroup.position.set(5, 0, 5);
const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.8, 12), new THREE.MeshPhongMaterial({ color: 0x8B4513 }));
trunk.position.y = 0.9; trunk.castShadow = true;
const target = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.4, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
target.position.y = 1.3;
const targetCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 12), new THREE.MeshBasicMaterial({ color: 0xFF0000 }));
targetCenter.position.y = 1.3;
dummyGroup.add(trunk); dummyGroup.add(target); dummyGroup.add(targetCenter);
scene.add(dummyGroup);

// --- OTIMIZAÇÃO: Geometrias Reutilizáveis ---
// Criamos as formas apenas uma vez na memória
const geoTorso = new THREE.BoxGeometry(0.5, 0.7, 0.3);
const geoHead = new THREE.BoxGeometry(0.35, 0.35, 0.35);
const geoEye = new THREE.BoxGeometry(0.05, 0.05, 0.05);
// Membros (Padrão para braços e pernas, escalamos se necessário mas aqui são iguais na lógica antiga)
// Como seus membros têm tamanhos diferentes, criamos as bases:
const geoArm = new THREE.BoxGeometry(0.15, 0.7, 0.15);
const geoLeg = new THREE.BoxGeometry(0.18, 0.8, 0.18);

// Função de criação do Personagem
function createCharacterMesh(skinColorHex, clothColorHex) {
    const group = new THREE.Group();
    
    // Materiais precisam ser únicos por personagem pois as cores mudam
    const matSkin = new THREE.MeshPhongMaterial({ color: parseInt("0x" + skinColorHex) }); 
    const matClothes = new THREE.MeshPhongMaterial({ color: parseInt("0x" + clothColorHex) }); 
    const matEye = new THREE.MeshBasicMaterial({color: 0x000000});
    
    // Reutiliza a geometria geoTorso
    const torso = new THREE.Mesh(geoTorso, matClothes);
    torso.position.y = 1.1; torso.castShadow = true; group.add(torso);
    
    // Reutiliza geoHead
    const head = new THREE.Mesh(geoHead, matSkin);
    head.position.y = 0.55; torso.add(head);
    
    // Reutiliza geoEye
    const eyeL = new THREE.Mesh(geoEye, matEye); eyeL.position.set(0.1, 0.05, 0.18); head.add(eyeL);
    const eyeR = new THREE.Mesh(geoEye, matEye); eyeR.position.set(-0.1, 0.05, 0.18); head.add(eyeR);

    function createLimb(geometry, mat, x, y, z) {
        const pivot = new THREE.Group(); pivot.position.set(x, y, z);
        // Reutiliza a geometria passada como argumento
        const mesh = new THREE.Mesh(geometry, mat);
        // Nota: A altura original era hardcoded na geometria, aqui pegamos do bounding box se precisasse,
        // mas como suas geometrias são fixas, mantemos o -h/2 manual baseado no tipo
        let h = 0.7; 
        if(geometry === geoLeg) h = 0.8;

        mesh.position.y = -h/2; mesh.castShadow = true; pivot.add(mesh); return { pivot, mesh };
    }

    const leftArm = createLimb(geoArm, matSkin, 0.35, 0.3, 0); 
    const rightArm = createLimb(geoArm, matSkin, -0.35, 0.3, 0);
    const leftLeg = createLimb(geoLeg, matClothes, 0.12, -0.35, 0); 
    const rightLeg = createLimb(geoLeg, matClothes, -0.12, -0.35, 0);
    
    torso.add(leftArm.pivot); torso.add(rightArm.pivot); torso.add(leftLeg.pivot); torso.add(rightLeg.pivot);
    group.userData.limbs = { leftArm: leftArm.pivot, rightArm: rightArm.pivot, leftLeg: leftLeg.pivot, rightLeg: rightLeg.pivot };
    return group;
}