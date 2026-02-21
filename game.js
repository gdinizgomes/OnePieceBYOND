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

// Nova ponte dedicada ao Data-Driven
window.receberSkills = function(json) {
    try { 
        window.GameSkills = JSON.parse(json); 
        if(typeof UISystem !== 'undefined') {
            UISystem.addLog("<span style='color:#2ecc71'>[Sistema Data-Driven Carregado com Sucesso]</span>", "log-hit");
        }
    } catch(e) {
        console.error("Falha ao processar JSON de Skills", e);
    }
};

// --- MÓDULO 9: GAME LOOP ORQUESTRADOR ---
const GameLoop = {
    lastFrameTime: performance.now(),
    TARGET_FPS: 60,
    OPTIMAL_FRAME_TIME: 1000 / 60,

    start: function() {
        const animate = () => {
            const now = performance.now();
            const rawDt = now - this.lastFrameTime;
            // Clampa o DeltaTime a 100ms. Evita o pulo de tempo absurdo 
            // se o usuário sair da aba por 30 minutos e voltar.
            const dt = Math.min(rawDt, 100); 
            this.lastFrameTime = now;
            
            const timeScale = dt / this.OPTIMAL_FRAME_TIME;

            if (typeof AnimationSystem !== 'undefined') AnimationSystem.update(timeScale);
            if (typeof TargetSystem !== 'undefined') TargetSystem.updateUI();
            if (typeof CombatVisualSystem !== 'undefined') CombatVisualSystem.update(timeScale); 
            
            // NOVIDADE: A Máquina de Estados agora pulsa pelo coração da Engine (Milissegundos puros)
            if (typeof CombatSystem !== 'undefined') CombatSystem.update(dt);
            
            if (typeof EntityManager !== 'undefined') {
                EntityManager.updatePlayer(timeScale, now);
                EntityManager.updateOthers(timeScale, now);
            }

            if (typeof Engine !== 'undefined' && Engine.renderer && Engine.scene && Engine.camera) {
                Engine.renderer.render(Engine.scene, Engine.camera);
            }

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

GameLoop.start();