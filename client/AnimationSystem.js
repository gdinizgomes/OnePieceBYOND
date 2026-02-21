// client/AnimationSystem.js

const RAD = Math.PI / 180;

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

        rightLeg: { x: -15 * RAD, y: 0, z: 0 },
        rightShin:{ x: 20 * RAD, y: 0, z: 0 },

        leftLeg:  { x: 10 * RAD, y: 0, z: 0 },
        leftShin: { x: -10 * RAD, y: 0, z: 0 }
    },
    SWORD_COMBO_1: {
        torso: { x: 0, y: -25 * RAD, z: 12 * RAD },

        rightArm: { x: -15 * RAD, y: -80 * RAD, z: -55 * RAD },
        rightForeArm: { x: 5 * RAD, y: -55 * RAD, z: -20 * RAD },

        leftArm:  { x: 25 * RAD, y: 20 * RAD, z: 25 * RAD },
        leftForeArm: { x: 0, y: 0, z: 0 },

        rightLeg: { x: 10 * RAD, y: 0, z: 0 },
        rightShin:{ x: -15 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -20 * RAD, y: 0, z: 0 },
        leftShin: { x: 25 * RAD, y: 0, z: 0 }
    },
    SWORD_COMBO_2: {
        torso: { x: 0, y: 40 * RAD, z: -10 * RAD },

        rightArm: { x: -10 * RAD, y: 130 * RAD, z: -45 * RAD },
        rightForeArm: { x: 10 * RAD, y: 60 * RAD, z: -10 * RAD },

        leftArm:  { x: -30 * RAD, y: -30 * RAD, z: 15 * RAD },
        leftForeArm: { x: -20 * RAD, y: 0, z: 0 },

        rightLeg: { x: -5 * RAD, y: 0, z: 0 },
        rightShin:{ x: 10 * RAD, y: 0, z: 0 },

        leftLeg:  { x: -25 * RAD, y: 0, z: 0 },
        leftShin: { x: 30 * RAD, y: 0, z: 0 }
    },
    SWORD_COMBO_3: {
        torso: { x: 0, y: -25 * RAD, z: 12 * RAD },

        rightArm: { x: -15 * RAD, y: -80 * RAD, z: -55 * RAD },
        rightForeArm: { x: 5 * RAD, y: -55 * RAD, z: -20 * RAD },

        leftArm:  { x: 25 * RAD, y: 20 * RAD, z: 25 * RAD },
        leftForeArm: { x: 0, y: 0, z: 0 },

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

const AnimationSystem = {
    animTime: 0,
    
    update: function(timeScale) {
        this.animTime += 0.1 * timeScale;
    },

    animateRig: function(mesh, state, isMoving, isRunning, isResting, isFainted, groundH) {
        const limbs = mesh.userData.limbs;
        if(!limbs) return;

        // NOVIDADE TÉCNICA: Identifica a escala atual do Mesh no eixo Y.
        // Padrão é 1.0 (Humanos normais). Se for um Gigante (ex: 3.0), o offset triplica.
        const scaleY = mesh.scale.y || 1.0;

        if (isFainted) {
            mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1); 
            
            // Offset dinâmico de desmaio para impedir que personagens maiores atravessem a malha do solo deitados
            const faintOffset = 0.2 * scaleY;
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + faintOffset, 0.1);
            else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
        } 
        else if (isResting) {
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1);
            
            // NOVIDADE TÉCNICA: O valor base de assentar agora é dinâmico.
            const BASE_SIT_OFFSET = -0.65; 
            const dynamicOffset = BASE_SIT_OFFSET * scaleY;
            
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + dynamicOffset, 0.1);
            else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
            
            const restStance = STANCES.REST_SIMPLE;
            if(restStance) {
                const spd = 0.1;
                lerpLimbRotation(limbs.torso, restStance.torso, spd);
                lerpLimbRotation(limbs.leftLeg, restStance.leftLeg, spd); lerpLimbRotation(limbs.rightLeg, restStance.rightLeg, spd);
                lerpLimbRotation(limbs.leftShin, restStance.leftShin, spd); lerpLimbRotation(limbs.rightShin, restStance.rightShin, spd);
                lerpLimbRotation(limbs.leftArm, restStance.leftArm, spd); lerpLimbRotation(limbs.rightArm, restStance.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, restStance.leftForeArm, spd); lerpLimbRotation(limbs.rightForeArm, restStance.rightForeArm, spd);
            }
        } 
        else {
            if(mesh !== EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH, 0.2); 
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.2);

            let targetStance = STANCES[state] || STANCES.DEFAULT;
            const def = STANCES.DEFAULT;

            if(isMoving) {
                let legSpeed = isRunning ? 0.3 : 0.8; 
                
                limbs.leftLeg.rotation.x = Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                limbs.rightLeg.rotation.x = -Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * legSpeed;
                limbs.leftShin.rotation.x = (limbs.leftLeg.rotation.x > 0) ? limbs.leftLeg.rotation.x : 0;
                limbs.rightShin.rotation.x = (limbs.rightLeg.rotation.x > 0) ? limbs.rightLeg.rotation.x : 0;
            } else {
                const spd = 0.1;
                lerpLimbRotation(limbs.leftLeg, targetStance.leftLeg || def.leftLeg, spd);
                lerpLimbRotation(limbs.rightLeg, targetStance.rightLeg || def.rightLeg, spd);
                lerpLimbRotation(limbs.leftShin, targetStance.leftShin || def.leftShin, spd);
                lerpLimbRotation(limbs.rightShin, targetStance.rightShin || def.rightShin, spd);
            }

            if (state !== "DEFAULT") {
                const spd = 0.4; 
                lerpLimbRotation(limbs.torso, targetStance.torso || def.torso, spd);
                lerpLimbRotation(limbs.leftArm, targetStance.leftArm || def.leftArm, spd);
                lerpLimbRotation(limbs.rightArm, targetStance.rightArm || def.rightArm, spd);
                lerpLimbRotation(limbs.leftForeArm, targetStance.leftForeArm || def.leftForeArm, spd);
                lerpLimbRotation(limbs.rightForeArm, targetStance.rightForeArm || def.rightForeArm, spd);
            } else {
                if (isMoving) {
                    let armAmp = isRunning ? 1.2 : 0.6; 
                    limbs.leftArm.rotation.x = -Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * armAmp;
                    limbs.rightArm.rotation.x = Math.sin(this.animTime * (isRunning ? 1.5 : 1)) * armAmp;
                    limbs.leftForeArm.rotation.x = -0.2;
                    limbs.rightForeArm.rotation.x = -0.2;
                    lerpLimbRotation(limbs.torso, def.torso, 0.1);
                } else {
                    const spd = 0.1;
                    lerpLimbRotation(limbs.torso, def.torso, spd);
                    lerpLimbRotation(limbs.leftArm, def.leftArm, spd);
                    lerpLimbRotation(limbs.rightArm, def.rightArm, spd);
                    lerpLimbRotation(limbs.leftForeArm, def.leftForeArm, spd);
                    lerpLimbRotation(limbs.rightForeArm, def.rightForeArm, spd);
                }
            }
        }
    }
};

window.STANCES = STANCES; // Exportado para caso outros sistemas (ex: magias) precisem validar posições.
window.AnimationSystem = AnimationSystem;