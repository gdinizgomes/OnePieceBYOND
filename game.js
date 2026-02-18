// game.js - O Core Engine e Orquestrador Final do Cliente

// Pontes de Comunicação do Servidor para o Cliente (Via BYOND)
window.receberDadosGlobal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    if(typeof NetworkSystem !== 'undefined') NetworkSystem.lastPacketTime = Date.now();
    if(typeof EntityManager !== 'undefined') EntityManager.syncGlobal(packet, performance.now());
};

window.receberDadosPessoal = function(json) {
    let packet; try { packet = JSON.parse(json); } catch(e) { return; }
    if(typeof EntityManager !== 'undefined') EntityManager.syncPersonal(packet);
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
            if (typeof AnimationSystem !== 'undefined') AnimationSystem.update(timeScale);
            if (typeof TargetSystem !== 'undefined') TargetSystem.updateUI();
            if (typeof CombatVisualSystem !== 'undefined') CombatVisualSystem.update(timeScale); 
            
            if (typeof EntityManager !== 'undefined') {
                EntityManager.updatePlayer(timeScale, now);
                EntityManager.updateOthers(timeScale, now);
            }

            // Renderiza o visual APENAS se a Engine estiver definida (Resolve a Tela Preta)
            if (typeof Engine !== 'undefined' && Engine.renderer && Engine.scene && Engine.camera) {
                Engine.renderer.render(Engine.scene, Engine.camera);
            }

            // O Loop continua apenas no final (Evita travamento do PC em caso de erro)
            requestAnimationFrame(animate); 
        };
        
        animate();
        
        // Watchdog de Desconexão
        setInterval(() => { 
            if(typeof EntityManager !== 'undefined' && EntityManager.isCharacterReady) {
                if (typeof NetworkSystem !== 'undefined' && Date.now() - NetworkSystem.lastPacketTime > 4000) {
                    if(typeof UISystem !== 'undefined') UISystem.addLog("AVISO: Conexão com o servidor perdida.", "log-hit"); 
                    EntityManager.isCharacterReady = false; 
                }
            } 
        }, 1000);
    }
};

// Inicia o Cliente Visual
GameLoop.start();