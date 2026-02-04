// Utilitários Matemáticos
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

// Dicionário de Posturas (State Machine Visual)
const RAD = Math.PI / 180;
const STANCES = {
    // --- ESTADO RELAXADO ---
    DEFAULT: { 
        rightArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }
    },

    // --- ESTILO ESPADACHIM (Key: D) ---
    SWORD_IDLE: { 
        rightArm: { x: -45 * RAD, y: -10 * RAD, z: 30 * RAD }, 
        leftArm:  { x: 20 * RAD, y: 0, z: -10 * RAD },
        rightLeg: { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }
    },
    SWORD_WINDUP: { 
        rightArm: { x: -110 * RAD, y: -20 * RAD, z: 40 * RAD },
        leftArm:  { x: 40 * RAD, y: 20 * RAD, z: -20 * RAD },
        rightLeg: { x: -20 * RAD, y: 0, z: 0 },
        leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    SWORD_ATK_1: { 
        rightArm: { x: 60 * RAD, y: -40 * RAD, z: 10 * RAD }, 
        leftArm:  { x: -30 * RAD, y: 0, z: -30 * RAD }, 
        rightLeg: { x: 20 * RAD, y: 0, z: 0 },
        leftLeg:  { x: -10 * RAD, y: 0, z: 0 }
    },

    // --- ESTILO LUTADOR / SOCO (Key: A) ---
    FIST_IDLE: { 
        rightArm: { x: -60 * RAD, y: 40 * RAD, z: 0 }, // Guarda alta
        leftArm:  { x: -60 * RAD, y: -40 * RAD, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }
    },
    FIST_WINDUP: {
        rightArm: { x: -40 * RAD, y: 60 * RAD, z: 0 }, // Puxa braço direito
        leftArm:  { x: -70 * RAD, y: -30 * RAD, z: 0 }, // Protege com o esquerdo
        rightLeg: { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }
    },
    FIST_ATK: {
        rightArm: { x: -80 * RAD, y: -10 * RAD, z: -10 * RAD }, // Soco reto
        leftArm:  { x: -60 * RAD, y: -40 * RAD, z: 0 },
        rightLeg: { x: 20 * RAD, y: 0, z: 0 }, // Avança perna
        leftLeg:  { x: -10 * RAD, y: 0, z: 0 }
    },

    // --- ESTILO CHUTE (Key: S) ---
    // Usa a mesma base de idle do soco, ou uma nova se preferir
    KICK_WINDUP: {
        rightArm: { x: -30 * RAD, y: 0, z: 0 },
        leftArm:  { x: -30 * RAD, y: 0, z: 0 },
        rightLeg: { x: 40 * RAD, y: 0, z: 0 }, // Prepara a perna (para tras)
        leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    KICK_ATK: {
        rightArm: { x: 20 * RAD, y: 0, z: -30 * RAD }, // Braços para equilibrio
        leftArm:  { x: 20 * RAD, y: 0, z: 30 * RAD },
        rightLeg: { x: -90 * RAD, y: 0, z: 0 }, // Chute alto
        leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },

    // --- ESTILO ATIRADOR (Key: F) ---
    GUN_IDLE: {
        rightArm: { x: -90 * RAD, y: -5 * RAD, z: 0 }, // Braço esticado (mirando)
        leftArm:  { x: 0, y: 0, z: 0 }, // Braço solto ou apoiando
        rightLeg: { x: -10 * RAD, y: 0, z: 0 }, // Base firme
        leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    },
    GUN_ATK: { // Recuo do tiro
        rightArm: { x: -70 * RAD, y: -5 * RAD, z: 0 }, // Braço sobe com recuo
        leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: -10 * RAD, y: 0, z: 0 },
        leftLeg:  { x: 10 * RAD, y: 0, z: 0 }
    }
};