// client/InputSystem.js

const InputSystem = {
    init: function() {
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        window.addEventListener('game-action', (e) => this.handleGameAction(e));
    },

    handleKeyDown: function(e) {
        const k = e.key.toLowerCase();
        
        if (k === 'tab') { e.preventDefault(); if (e.repeat) return; TargetSystem.cycleTarget(); return; }
        if (e.key === 'Escape') {
            if (UISystem.state.invOpen) UISystem.toggleInventory();
            else if (UISystem.state.statOpen) UISystem.toggleStats();
            else if (UISystem.state.skillsOpen) UISystem.toggleSkills();
            else if (UISystem.state.shopOpen) UISystem.toggleShop();
            else if (UISystem.state.lootOpen) UISystem.closeLoot();
            else {
                TargetSystem.deselectTarget();
                if(document.getElementById('kill-modal').style.display === 'block') UISystem.confirmKill(false);
            }
            return;
        }

        if(k === 'c') UISystem.toggleStats(); 
        if(k === 'i') UISystem.toggleInventory(); 
        if(k === 'k') UISystem.toggleSkills();
        if(k === 'x') EntityManager.interact();
        
        if(k === 'e' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; EntityManager.lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=pick_up`); setTimeout(() => { NetworkSystem.blockSync = false; }, 300); }
        if(k === 'r' && !NetworkSystem.blockSync) { NetworkSystem.blockSync = true; EntityManager.lastActionTime = Date.now(); NetworkSystem.queueCommand(`action=toggle_rest`); setTimeout(() => { NetworkSystem.blockSync = false; }, 500); }
        if(e.key === 'Shift') EntityManager.isRunning = true;

        // CORREÇÃO: O InputSystem agora obedece cegamente ao JSON Universal
        if(k === '1') CombatSystem.executeSkill("fireball");
        if(k === '2') CombatSystem.executeSkill("iceball");
    },

    handleKeyUp: function(e) {
        if(e.key === 'Shift') EntityManager.isRunning = false;
    },

    handleGameAction: function(e) {
        if(EntityManager.isFainted) return; 
        const k = e.detail;
        
        // CORREÇÃO: O InputSystem agora obedece cegamente ao JSON Universal
        if(k === 'd') CombatSystem.executeSkill("basic_sword"); 
        else if(k === 'f') CombatSystem.executeSkill("basic_gun"); 
        else if(k === 'a') CombatSystem.executeSkill("basic_fist"); 
        else if(k === 's') CombatSystem.executeSkill("basic_kick");
        else if(k === 'p' && !NetworkSystem.blockSync) { 
            NetworkSystem.blockSync = true; 
            NetworkSystem.queueCommand("action=force_save"); 
            UISystem.addLog("Salvando...", "log-miss"); 
            setTimeout(() => { NetworkSystem.blockSync = false; }, 500); 
        }
    }
};

InputSystem.init();
window.InputSystem = InputSystem;