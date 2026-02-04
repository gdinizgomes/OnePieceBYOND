// definitions.js - O Banco de Dados de Objetos do Jogo
// Aqui definimos TUDO que existe visualmente no jogo.
// A IA deve gerar JSONs seguindo este padrão.

const GameDefinitions = {
    // --- PARTES DO CORPO (Modular) ---
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

    // --- ARMAS (Exemplos de Equipment) ---
    "weapon_sword_iron": {
        id: "weapon_sword_iron",
        name: "Espada de Ferro",
        type: "equipment",
        tags: ["sharp", "metal"],
        visual: {
            model: "box", // Pode ser 'plane' se for sprite 2D
            color: 0xCCCCCC, // Cinza
            scale: [0.1, 0.8, 0.05], // Comprimento definido aqui no Y
            texture: null // Aqui entraria o URL da sprite gerada por IA
        },
        attachment: {
            bone: "rightArm",
            pos: [0, -0.6, 0.15], // Posição na mão
            rot: [Math.PI / 2, 0, 0] // Rotação para apontar para frente
        },
        data: { power: 10, durability: 100 }
    },
    
    "weapon_gun_flintlock": {
        id: "weapon_gun_flintlock",
        name: "Pistola Velha",
        type: "equipment",
        tags: ["ranged", "gunpowder"],
        visual: {
            model: "box",
            color: 0x553311, // Marrom
            scale: [0.1, 0.1, 0.4]
        },
        attachment: {
            bone: "rightArm",
            pos: [0, -0.6, 0.15],
            rot: [0, 0, 0]
        },
        data: { power: 25, durability: 50 }
    },

    // --- OBJETOS DO MAPA (Props) ---
    "prop_tree_log": {
        id: "prop_tree_log",
        name: "Tronco de Treino",
        type: "prop",
        visual: {
            model: "cylinder",
            color: 0x8B4513,
            scale: [0.4, 1.8, 0.4] // Raio Topo, Altura, Raio Base
        },
        physics: { solid: true, mass: 50 }
    }
};