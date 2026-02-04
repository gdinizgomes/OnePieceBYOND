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
    DEFAULT: { 
        rightArm: { x: 0, y: 0, z: 0 },
        leftArm:  { x: 0, y: 0, z: 0 },
        rightLeg: { x: 0, y: 0, z: 0 },
        leftLeg:  { x: 0, y: 0, z: 0 }
    },
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
    }
};