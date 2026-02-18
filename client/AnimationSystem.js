// client/AnimationSystem.js

const AnimationSystem = {
    animTime: 0,
    
    update: function(timeScale) {
        this.animTime += 0.1 * timeScale;
    },

    animateRig: function(mesh, state, isMoving, isRunning, isResting, isFainted, groundH) {
        const limbs = mesh.userData.limbs;
        if(!limbs) return;

        if (isFainted) {
            mesh.rotation.x = lerp(mesh.rotation.x, -Math.PI/2, 0.1); 
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + 0.2, 0.1);
            else mesh.position.y = lerp(mesh.position.y, groundH, 0.1);
        } 
        else if (isResting) {
            mesh.rotation.x = lerp(mesh.rotation.x, 0, 0.1);
            const yOffset = -0.4; 
            if(mesh === EntityManager.playerGroup) mesh.position.y = lerp(mesh.position.y, groundH + yOffset, 0.1);
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

window.AnimationSystem = AnimationSystem;