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
            requestAnimationFrame(animate); 
            
            const now = performance.now();
            const dt = Math.min((now - this.lastFrameTime), 100); 
            this.lastFrameTime = now;
            const timeScale = dt / this.OPTIMAL_FRAME_TIME;

            // Delegação estrita de responsabilidades a cada Frame
            AnimationSystem.update(timeScale);
            TargetSystem.updateUI();
            CombatVisualSystem.update(timeScale); 
            
            EntityManager.updatePlayer(timeScale, now);
            EntityManager.updateOthers(timeScale, now);

            // Renderiza o visual após todo o processamento matemático/lógico
            Engine.renderer.render(Engine.scene, Engine.camera);
        };
        
        animate();
        
        // Watchdog de Desconexão
        setInterval(() => { 
            if(EntityManager.isCharacterReady && Date.now() - NetworkSystem.lastPacketTime > 4000) { 
                UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
                EntityManager.isCharacterReady = false; 
            } 
        }, 1000);
    }
};

// Inicia o Cliente Visual
GameLoop.start();