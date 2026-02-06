// definitions.js - O Banco de Dados de Objetos do Jogo
// REGRA DE COLISÃO: Tudo é SÓLIDO (collision=true) por padrão.
// PHYSICS: { solid: true/false, standable: true/false }

const GameDefinitions = {
    // --- PARTES DO CORPO ---
    "char_human_torso": {
        type: "part",
        visual: { model: "box", color: 0xFF0000, scale: [0.2, 0.7, 0.2] }
    },
    "char_human_head": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.35, 0.35, 0.35] }
    },
    "char_human_limb": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.15, 0.7, 0.15] }
    },

    // --- ARMAS: ESPADAS ---
    "weapon_sword_wood": {
        id: "weapon_sword_wood",
        name: "Espada de Treino",
        type: "equipment",
        tags: ["sword"],
        visual: { model: "box", color: 0x8B4513, scale: [0.1, 0.8, 0.05] }, // Marrom
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [Math.PI / 2, 0, 0] },
        data: { power: 5 }
    },
    "weapon_sword_iron": {
        id: "weapon_sword_iron",
        name: "Espada de Ferro",
        type: "equipment",
        tags: ["sword", "metal"],
        visual: { model: "box", color: 0xCCCCCC, scale: [0.1, 0.8, 0.05] }, // Cinza
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [Math.PI / 2, 0, 0] },
        data: { power: 10 }
    },
    "weapon_sword_silver": {
        id: "weapon_sword_silver",
        name: "Espada de Prata",
        type: "equipment",
        tags: ["sword", "precious"],
        visual: { model: "box", color: 0xFFFFFF, scale: [0.1, 0.8, 0.05] }, // Branco Brilhante
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [Math.PI / 2, 0, 0] },
        data: { power: 20 }
    },
    
    // --- ARMAS: PISTOLAS ---
    "weapon_gun_wood": {
        id: "weapon_gun_wood",
        name: "Pistola de Brinquedo",
        type: "equipment",
        tags: ["gun"],
        visual: { model: "box", color: 0x8B4513, scale: [0.1, 0.1, 0.4] }, // Marrom
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [0, 0, 0] },
        data: { power: 12 }
    },
    "weapon_gun_flintlock": {
        id: "weapon_gun_flintlock",
        name: "Pistola Velha",
        type: "equipment",
        tags: ["gun", "gunpowder"],
        visual: { model: "box", color: 0x553311, scale: [0.1, 0.1, 0.4] }, // Escura
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [0, 0, 0] },
        data: { power: 25 }
    },
    "weapon_gun_silver": {
        id: "weapon_gun_silver",
        name: "Pistola de Combate",
        type: "equipment",
        tags: ["gun", "modern"],
        visual: { model: "box", color: 0xAAAAAA, scale: [0.1, 0.1, 0.4] }, // Prata
        attachment: { bone: "rightArm", pos: [0, -0.6, 0.15], rot: [0, 0, 0] },
        data: { power: 40 }
    },

    // --- OBJETOS DO MAPA (Props) ---
    "prop_tree_log": {
        id: "prop_tree_log",
        name: "Tronco de Treino",
        type: "prop",
        visual: { model: "cylinder", color: 0x8B4513, scale: [0.4, 1.8, 0.4] },
        physics: { solid: true, standable: true, mass: 50 } 
    }
};