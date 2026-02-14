// definitions.js - Versão "LEGO ARTICULADO" + ARMADURAS
const GameDefinitions = {
    // --- PARTES DO CORPO (SEGMENTADAS) ---
    "char_head": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.30, 0.30, 0.30] }
    },
    "char_torso": {
        type: "part",
        visual: { model: "box", color: 0xFF0000, scale: [0.35, 0.60, 0.20] } 
    },
    // Braços
    "char_upper_arm": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.12, 0.35, 0.12] }
    },
    "char_lower_arm": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.10, 0.30, 0.10] }
    },
    "char_hand": {
        type: "part",
        visual: { model: "box", color: 0xFFCCAA, scale: [0.08, 0.10, 0.10] } 
    },
    // Pernas
    "char_upper_leg": {
        type: "part",
        visual: { model: "box", color: 0x0000FF, scale: [0.14, 0.40, 0.14] } 
    },
    "char_lower_leg": {
        type: "part",
        visual: { model: "box", color: 0x0000FF, scale: [0.12, 0.40, 0.12] } 
    },
    "char_foot": {
        type: "part",
        visual: { model: "box", color: 0x333333, scale: [0.12, 0.10, 0.22] } 
    },

    // --- ARMAS ---
    "weapon_sword_wood": {
        id: "weapon_sword_wood",
        name: "Espada de Treino",
        type: "equipment",
        tags: ["sword"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x5c4033, scale: [0.08, 0.45, 0.04], pos: [0, 0.25, 0] }, 
                { model: "box", color: 0x8b5a2b, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] }, 
                { model: "box", color: 0xcd853f, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] } 
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 5 }
    },

    "weapon_sword_iron": {
        id: "weapon_sword_iron",
        name: "Espada de Ferro",
        type: "equipment",
        tags: ["sword", "metal"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x111111, scale: [0.08, 0.55, 0.04], pos: [0, 0.30, 0] },
                { model: "box", color: 0x555555, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] },
                { model: "box", color: 0x333333, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] }
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 10 }
    },

    "weapon_sword_silver": {
        id: "weapon_sword_silver",
        name: "Espada de Prata",
        type: "equipment",
        tags: ["sword", "precious"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x000088, scale: [0.08, 0.60, 0.04], pos: [0, 0.32, 0] },
                { model: "box", color: 0xD4AF37, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] },
                { model: "box", color: 0xFFFFFF, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] }
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 20 }
    },

    "weapon_gun_wood": {
        id: "weapon_gun_wood",
        name: "Pistola de Brinquedo",
        type: "equipment",
        tags: ["gun"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x8B4513, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] }, 
                { model: "box", color: 0xA0522D, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] } 
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 12 },
        projectile: { speed: 0.4, range: 8, color: 0xFFFF00, scale: [0.09, 0.09, 1] } 
    },

    "weapon_gun_flintlock": {
        id: "weapon_gun_flintlock",
        name: "Pistola Velha",
        type: "equipment",
        tags: ["gun", "gunpowder"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x3d2b1f, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] },
                { model: "box", color: 0x555555, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] }
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 25 },
        projectile: { speed: 0.8, range: 12, color: 0xFFFF00, scale: [0.09, 0.09, 1] }
    },

    "weapon_gun_silver": {
        id: "weapon_gun_silver",
        name: "Pistola de Combate",
        type: "equipment",
        tags: ["gun", "modern"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x111111, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] },
                { model: "box", color: 0xAAAAAA, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] }
            ]
        },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        data: { power: 40 },
        projectile: { speed: 1.2, range: 20, color: 0xFFFF00, scale: [0.09, 0.09, 1] }
    },

    // --- ARMADURAS ---

    "armor_head_bandana": {
        id: "armor_head_bandana",
        name: "Bandana Vermelha",
        type: "equipment",
        tags: ["head"],
        visual: { model: "box", color: 0xFF0000, scale: [0.32, 0.08, 0.32] },
        attachment: { bone: "head", pos: [0, 0.10, 0], rot: [0, 0, 0] }
    },

    "armor_head_bandana_black": {
        id: "armor_head_bandana_black",
        name: "Bandana Preta",
        type: "equipment",
        tags: ["head"],
        visual: { model: "box", color: 0x000000, scale: [0.32, 0.08, 0.32] },
        attachment: { bone: "head", pos: [0, 0.10, 0], rot: [0, 0, 0] }
    },

    "armor_body_shirt": {
        id: "armor_body_shirt",
        name: "Camisa de Marinheiro",
        type: "equipment",
        tags: ["body"],
        visual: { model: "box", color: 0xFFFFFF, scale: [0.36, 0.40, 0.22] },
        attachment: { bone: "torso", pos: [0, 0.10, 0], rot: [0, 0, 0] }
    },

    "armor_legs_pants": {
        id: "armor_legs_pants",
        name: "Calça de Linho",
        type: "equipment",
        tags: ["legs"],
        visual: { model: "box", color: 0x8B4513, scale: [0.36, 0.20, 0.22] },
        
        attachments: [
            { bone: "torso", pos: [0, -0.25, 0], rot: [0, 0, 0],
              visual: { model: "box", color: 0x8B4513, scale: [0.36, 0.20, 0.22] } 
            },
            { bone: "leftLeg", pos: [0, 0, 0], rot: [0, 0, 0], 
              visual: { model: "box", color: 0x8B4513, scale: [0.16, 0.35, 0.16] } 
            },
            { bone: "leftShin", pos: [0, 0, 0], rot: [0, 0, 0], 
              visual: { model: "box", color: 0x8B4513, scale: [0.14, 0.35, 0.14] } 
            },
            { bone: "rightLeg", pos: [0, 0, 0], rot: [0, 0, 0],
              visual: { model: "box", color: 0x8B4513, scale: [0.16, 0.35, 0.16] } 
            },
            { bone: "rightShin", pos: [0, 0, 0], rot: [0, 0, 0],
              visual: { model: "box", color: 0x8B4513, scale: [0.14, 0.35, 0.14] } 
            }
        ]
    },

    "armor_feet_boots": {
        id: "armor_feet_boots",
        name: "Botas de Couro",
        type: "equipment",
        tags: ["feet"],
        visual: { model: "box", color: 0x3d2b1f, scale: [0.15, 0.10, 0.24] },
        attachments: [
            { bone: "leftFoot", pos: [0, 0, 0], rot: [0, 0, 0] },
            { bone: "rightFoot", pos: [0, 0, 0], rot: [0, 0, 0] }
        ]
    },

    "prop_tree_log": {
        id: "prop_tree_log",
        name: "Tronco de Treino",
        type: "prop",
        visual: { model: "cylinder", color: 0x8B4513, scale: [0.4, 1.8, 0.4] },
        // FÍSICA GEOMÉTRICA EXATA ADICIONADA AQUI
        physics: { solid: true, standable: true, mass: 50, shape: "cylinder", radius: 0.2 } 
    }
};