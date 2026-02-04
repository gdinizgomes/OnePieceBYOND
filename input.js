// input.js - Gerenciamento de Teclas e Mouse
const Input = {
    keys: { arrowup: false, arrowdown: false, arrowleft: false, arrowright: false, " ": false },
    mouseRight: false,
    lastMouseX: 0,
    camAngle: Math.PI, // Controle da câmera fica aqui pois depende do input

    init: function() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        // Mouse para girar câmera
        document.addEventListener('contextmenu', e => e.preventDefault());
        document.addEventListener('mousedown', e => { if(e.button===2){this.mouseRight=true; this.lastMouseX=e.clientX;} });
        document.addEventListener('mouseup', e => { if(e.button===2) this.mouseRight=false; });
        document.addEventListener('mousemove', e => { 
            if(this.mouseRight) { 
                this.camAngle -= (e.clientX - this.lastMouseX) * 0.005; 
                this.lastMouseX = e.clientX; 
            } 
        });
    },

    onKeyDown: function(e) {
        const k = e.key.toLowerCase();
        if(this.keys.hasOwnProperty(k)) this.keys[k] = true;
        
        // Atalhos de Ação (Dispara evento global para o Game Loop pegar)
        if(['a', 's', 'd', 'f', 'p'].includes(k)) {
            window.dispatchEvent(new CustomEvent('game-action', { detail: k }));
        }
    },

    onKeyUp: function(e) {
        if(this.keys.hasOwnProperty(e.key.toLowerCase())) this.keys[e.key.toLowerCase()] = false;
    }
};

Input.init();