// definitions.js - Versão "LEGO" (Encaixe de Mão Perfeito)
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

    // --- ARMAS TIPO ESPADA ---
    // CORREÇÃO: pos Y alterado para -0.55. Isso faz o cabo "subir" para dentro da mão.
    "weapon_sword_wood": {
        id: "weapon_sword_wood",
        name: "Espada de Treino",
        type: "equipment",
        tags: ["sword"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x5c4033, scale: [0.1, 0.45, 0.04], pos: [0, 0, 0] },
                { model: "box", color: 0x8b5a2b, scale: [0.3, 0.1, 0.06], pos: [0, 0.2, 0] },
                { model: "box", color: 0xcd853f, scale: [0.08, 1, 0.02], pos: [0, 0.58, 0] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
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
                //cabo
                { model: "box", color: 0x111111, scale: [0.1, 0.45, 0.04], pos: [0, 0, 0] },
                //guarda-mão
                { model: "box", color: 0x555555, scale: [0.3, 0.1, 0.06], pos: [0, 0.2, 0] },
                //lâmina
                { model: "box", color: 0xDDDDDD, scale: [0.08, 1, 0.02], pos: [0, 0.58, 0] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
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
                { model: "box", color: 0x000088, scale: [0.1, 0.45, 0.04], pos: [0, 0, 0] },
                { model: "box", color: 0xD4AF37, scale: [0.3, 0.1, 0.06], pos: [0, 0.2, 0] },
                { model: "box", color: 0xFFFFFF, scale: [0.08, 1, 0.02], pos: [0, 0.58, 0] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
        data: { power: 20 }
    },

    // --- ARMAS TIPO PISTOLA ---
    // CORREÇÃO: Ajuste fino do pos para o cabo inclinado coincidir com a mão
    "weapon_gun_wood": {
        id: "weapon_gun_wood",
        name: "Pistola de Brinquedo",
        type: "equipment",
        tags: ["gun"],
        visual: {
            model: "group",
            parts: [
                // Cabo
                { model: "box", color: 0x8B4513, scale: [0.07, 0.15, 0.07], pos: [0, -0.05, 0.05], rot: [0.2, 0, 0] }, 
                // Cano
                { model: "box", color: 0xA0522D, scale: [0.08, 0.1, 0.20], pos: [0, 0.05, 0.15] },
                // Ponta
                { model: "box", color: 0xFF6600, scale: [0.04, 0.04, 0.05], pos: [0, 0.07, 0.26] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
        data: { power: 12 }
    },

    "weapon_gun_flintlock": {
        id: "weapon_gun_flintlock",
        name: "Pistola Velha",
        type: "equipment",
        tags: ["gun", "gunpowder"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x3d2b1f, scale: [0.07, 0.18, 0.07], pos: [0, -0.08, 0.05], rot: [0.5, 0, 0] },
                { model: "box", color: 0x555555, scale: [0.09, 0.08, 0.25], pos: [0, 0.02, 0.15] },
                { model: "box", color: 0x333333, scale: [0.05, 0.05, 0.35], pos: [0, 0.04, 0.25] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
        data: { power: 25 }
    },

    "weapon_gun_silver": {
        id: "weapon_gun_silver",
        name: "Pistola de Combate",
        type: "equipment",
        tags: ["gun", "modern"],
        visual: {
            model: "group",
            parts: [
                { model: "box", color: 0x111111, scale: [0.07, 0.16, 0.08], pos: [0, -0.08, 0.02], rot: [0.1, 0, 0] },
                { model: "box", color: 0xAAAAAA, scale: [0.08, 0.12, 0.30], pos: [0, 0.02, 0.15] },
                { model: "box", color: 0x000000, scale: [0.02, 0.04, 0.02], pos: [0, 0.10, 0.28] }
            ]
        },
        attachment: { bone: "rightArm", pos: [0, -0.55, 0.1], rot: [Math.PI/2, 0, 0] },
        data: { power: 40 }
    },

    // Props
    "prop_tree_log": {
        id: "prop_tree_log",
        name: "Tronco de Treino",
        type: "prop",
        visual: { model: "cylinder", color: 0x8B4513, scale: [0.4, 1.8, 0.4] },
        physics: { solid: true, standable: true, mass: 50 } 
    }
};