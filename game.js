// game.js - O Core Engine e Orquestrador Final do Cliente

// Pontes de Comunicação do Servidor para o Cliente (Via BYOND)
window.receberDadosGlobal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    NetworkSystem.lastPacketTime = Date.now();
    EntityManager.syncGlobal(packet, performance.now());
};

window.receberDadosPessoal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    EntityManager.syncPersonal(packet);
};

// --- MÓDULO 9: GAME LOOP ORQUESTRADOR ---
const GameLoop = {
    lastFrameTime: performance.now(),
    TARGET_FPS: 60,
    OPTIMAL_FRAME_TIME: 1000 / 60,

    start: function() {
        const animate = () => {
            const now = performance.now();
            const dt = Math.min((now - this.lastFrameTime), 100); 
            this.lastFrameTime = now;
            const timeScale = dt / this.OPTIMAL_FRAME_TIME;

            // Delegação estrita de responsabilidades a cada Frame
            if(window.AnimationSystem) window.AnimationSystem.update(timeScale);
            if(window.TargetSystem) window.TargetSystem.updateUI();
            if(window.CombatVisualSystem) window.CombatVisualSystem.update(timeScale); 
            
            if(window.EntityManager) {
                window.EntityManager.updatePlayer(timeScale, now);
                window.EntityManager.updateOthers(timeScale, now);
            }

            // Renderiza o visual após todo o processamento
            if (window.Engine && window.Engine.renderer && window.Engine.scene && window.Engine.camera) {
                window.Engine.renderer.render(window.Engine.scene, window.Engine.camera);
            }

            // TRAVA DE SEGURANÇA: Só pede o próximo frame se o atual rodou até o final sem quebrar!
            requestAnimationFrame(animate); 
        };
        
        animate();
        
        // Watchdog de Desconexão
        setInterval(() => { 
            if(window.EntityManager && window.EntityManager.isCharacterReady && Date.now() - window.NetworkSystem.lastPacketTime > 4000) { 
                if(window.UISystem) window.UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
                window.EntityManager.isCharacterReady = false; 
            } 
        }, 1000);
    }
};

// Inicia o Cliente Visual
GameLoop.start();