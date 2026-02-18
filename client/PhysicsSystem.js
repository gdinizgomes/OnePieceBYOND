// client/PhysicsSystem.js

const PhysicsSystem = {
    tempBoxObstacle: new THREE.Box3(), 
    playerRadius: 0.15, 
    playerHeight: 1.6,

    getGroundHeightAt: function(x, y, z) {
        let maxY = 0; 
        if(!Engine.collidables) return maxY;
        
        for (let i = 0; i < Engine.collidables.length; i++) {
            let obj = Engine.collidables[i]; 
            if(!obj || !obj.userData.standable) continue;

            this.tempBoxObstacle.setFromObject(obj);

            let isInsideXZ = false;
            let phys = obj.userData.physics;

            if (phys && phys.shape === "cylinder") {
                let objPos = new THREE.Vector3();
                obj.getWorldPosition(objPos);
                
                let closestX = Math.max(x - this.playerRadius, Math.min(objPos.x, x + this.playerRadius));
                let closestZ = Math.max(z - this.playerRadius, Math.min(objPos.z, z + this.playerRadius));
                
                let dx = objPos.x - closestX;
                let dz = objPos.z - closestZ;
                
                if ((dx*dx + dz*dz) <= (phys.radius * phys.radius)) {
                    isInsideXZ = true;
                }
            } else {
                let pMinX = x - this.playerRadius; let pMaxX = x + this.playerRadius;
                let pMinZ = z - this.playerRadius; let pMaxZ = z + this.playerRadius;
                
                if (pMinX <= this.tempBoxObstacle.max.x && pMaxX >= this.tempBoxObstacle.min.x &&
                    pMinZ <= this.tempBoxObstacle.max.z && pMaxZ >= this.tempBoxObstacle.min.z) {
                    isInsideXZ = true;
                }
            }

            if (isInsideXZ) {
                if (this.tempBoxObstacle.max.y <= y + 0.6) {
                    if (this.tempBoxObstacle.max.y > maxY) maxY = this.tempBoxObstacle.max.y; 
                }
            }
        }
        return maxY;
    },

    checkCollision: function(x, y, z) {
        if(!Engine.collidables) return false; 
        
        const pMinY = y;
        const pMaxY = y + this.playerHeight;

        for (let i = 0; i < Engine.collidables.length; i++) {
            let obj = Engine.collidables[i]; 
            if(!obj) continue;
            
            this.tempBoxObstacle.setFromObject(obj);
            
            let objMinY = this.tempBoxObstacle.min.y;
            let objMaxY = this.tempBoxObstacle.max.y;
            
            if (pMinY >= objMaxY - 0.05 && obj.userData.standable) continue; 
            if (pMaxY <= objMinY) continue; 
            if (pMinY >= objMaxY) continue; 
            
            let collideXZ = false;
            let phys = obj.userData.physics;

            if (phys && phys.shape === "cylinder") {
                let objPos = new THREE.Vector3();
                obj.getWorldPosition(objPos);
                
                let closestX = Math.max(x - this.playerRadius, Math.min(objPos.x, x + this.playerRadius));
                let closestZ = Math.max(z - this.playerRadius, Math.min(objPos.z, z + this.playerRadius));
                
                let dx = objPos.x - closestX;
                let dz = objPos.z - closestZ;
                
                if ((dx*dx + dz*dz) < (phys.radius * phys.radius)) {
                    collideXZ = true;
                }
            } else {
                let pMinX = x - this.playerRadius; let pMaxX = x + this.playerRadius;
                let pMinZ = z - this.playerRadius; let pMaxZ = z + this.playerRadius;
                
                if (pMinX <= this.tempBoxObstacle.max.x && pMaxX >= this.tempBoxObstacle.min.x &&
                    pMinZ <= this.tempBoxObstacle.max.z && pMaxZ >= this.tempBoxObstacle.min.z) {
                    collideXZ = true;
                }
            }

            if (collideXZ) return true; 
        }
        return false; 
    },

    checkPlayerCollision: function(nextX, nextY, nextZ) {
        const futureBox = new THREE.Box3();
        const center = new THREE.Vector3(nextX, nextY + 0.9, nextZ); 
        const size = new THREE.Vector3(0.4, 1.8, 0.4); 
        futureBox.setFromCenterAndSize(center, size);
        
        const currentBox = new THREE.Box3();
        currentBox.setFromCenterAndSize(new THREE.Vector3(EntityManager.playerGroup.position.x, EntityManager.playerGroup.position.y + 0.9, EntityManager.playerGroup.position.z), size);

        for (let id in EntityManager.otherPlayers) {
            const other = EntityManager.otherPlayers[id];
            if (!other.mesh) continue;
            
            if (other.isNPC && other.npcType === "prop") continue;

            const otherBox = new THREE.Box3().setFromObject(other.mesh);
            otherBox.expandByScalar(-0.15); 
            
            if (futureBox.intersectsBox(otherBox)) { 
                if (currentBox.intersectsBox(otherBox)) {
                    const dxCur = EntityManager.playerGroup.position.x - other.mesh.position.x;
                    const dzCur = EntityManager.playerGroup.position.z - other.mesh.position.z;
                    const currentDistSq = dxCur*dxCur + dzCur*dzCur;

                    const dxFut = nextX - other.mesh.position.x;
                    const dzFut = nextZ - other.mesh.position.z;
                    const futureDistSq = dxFut*dxFut + dzFut*dzFut;

                    if (futureDistSq > currentDistSq || currentDistSq < 0.001) {
                        continue; 
                    }
                }
                return true; 
            }
        }
        return false;
    }
};

window.PhysicsSystem = PhysicsSystem;