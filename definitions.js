// definitions.js - Visuais, Equipamentos e Poses (Sem Lógica de Dano)

// Usando window. para evitar conflitos de declaração em cache (SyntaxError)
window.GameDefinitions = {
    // --- PARTES DO CORPO ---
    "char_head": { id: "char_head", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0xFFCCAA, scale: [0.30, 0.30, 0.30] } },
    "char_torso": { id: "char_torso", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0xFF0000, scale: [0.35, 0.60, 0.20] } },
    "char_upper_arm": { id: "char_upper_arm", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0xFFCCAA, scale: [0.12, 0.35, 0.12] } },
    "char_lower_arm": { id: "char_lower_arm", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0xFFCCAA, scale: [0.10, 0.30, 0.10] } },
    "char_hand": { id: "char_hand", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0xFFCCAA, scale: [0.08, 0.10, 0.10] } },
    "char_upper_leg": { id: "char_upper_leg", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0x0000FF, scale: [0.14, 0.40, 0.14] } },
    "char_lower_leg": { id: "char_lower_leg", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0x0000FF, scale: [0.12, 0.40, 0.12] } },
    "char_foot": { id: "char_foot", type: "part", tags: ["bodypart"], visual: { model: "box", color: 0x333333, scale: [0.12, 0.10, 0.22] } },

    // --- ARMAS VISUAIS ---
    "weapon_sword_wood": {
        id: "weapon_sword_wood", type: "equipment", tags: ["sword"],
        visual: { model: "group", parts: [ { model: "box", color: 0x5c4033, scale: [0.08, 0.45, 0.04], pos: [0, 0.25, 0] }, { model: "box", color: 0x8b5a2b, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] }, { model: "box", color: 0xcd853f, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: {}
    },
    "weapon_sword_iron": {
        id: "weapon_sword_iron", type: "equipment", tags: ["sword", "metal"],
        visual: { model: "group", parts: [ { model: "box", color: 0x111111, scale: [0.08, 0.55, 0.04], pos: [0, 0.30, 0] }, { model: "box", color: 0x555555, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] }, { model: "box", color: 0x333333, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: {}
    },
    "weapon_sword_silver": {
        id: "weapon_sword_silver", type: "equipment", tags: ["sword", "precious"],
        visual: { model: "group", parts: [ { model: "box", color: 0x000088, scale: [0.08, 0.60, 0.04], pos: [0, 0.32, 0] }, { model: "box", color: 0xD4AF37, scale: [0.25, 0.05, 0.06], pos: [0, 0.02, 0] }, { model: "box", color: 0xFFFFFF, scale: [0.06, 0.15, 0.06], pos: [0, -0.08, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: {}
    },
    "weapon_gun_wood": {
        id: "weapon_gun_wood", type: "equipment", tags: ["gun"],
        visual: { model: "group", parts: [ { model: "box", color: 0x8B4513, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] }, { model: "box", color: 0xA0522D, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: { projectile: { speed: 0.4, range: 8, color: 0xFFFF00, scale: [0.09, 0.09, 1] } } 
    },
    "weapon_gun_flintlock": {
        id: "weapon_gun_flintlock", type: "equipment", tags: ["gun", "gunpowder"],
        visual: { model: "group", parts: [ { model: "box", color: 0x3d2b1f, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] }, { model: "box", color: 0x555555, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: { projectile: { speed: 0.8, range: 12, color: 0xFFFF00, scale: [0.09, 0.09, 1] } }
    },
    "weapon_gun_silver": {
        id: "weapon_gun_silver", type: "equipment", tags: ["gun", "modern"],
        visual: { model: "group", parts: [ { model: "box", color: 0x111111, scale: [0.1, 0.3, 0.1], pos: [0, 0.05, 0], rot: [1.57, 0, 0] }, { model: "box", color: 0xAAAAAA, scale: [0.06, 0.12, 0.06], pos: [0, -0.05, 0] } ] },
        attachment: { bone: "rightHand", pos: [0, -0.05, 0.05], rot: [Math.PI/2, 0, 0] },
        gameplay: { projectile: { speed: 1.2, range: 20, color: 0xFFFF00, scale: [0.09, 0.09, 1] } }
    },

    // --- ARMADURAS VISUAIS ---
    "armor_head_bandana": { id: "armor_head_bandana", type: "equipment", tags: ["head"], visual: { model: "box", color: 0xFF0000, scale: [0.32, 0.08, 0.32] }, attachment: { bone: "head", pos: [0, 0.10, 0], rot: [0, 0, 0] }, gameplay: {} },
    "armor_head_bandana_black": { id: "armor_head_bandana_black", type: "equipment", tags: ["head"], visual: { model: "box", color: 0x000000, scale: [0.32, 0.08, 0.32] }, attachment: { bone: "head", pos: [0, 0.10, 0], rot: [0, 0, 0] }, gameplay: {} },
    "armor_body_shirt": { id: "armor_body_shirt", type: "equipment", tags: ["body"], visual: { model: "box", color: 0xFFFFFF, scale: [0.36, 0.40, 0.22] }, attachment: { bone: "torso", pos: [0, 0.10, 0], rot: [0, 0, 0] }, gameplay: {} },
    "armor_legs_pants": { id: "armor_legs_pants", type: "equipment", tags: ["legs"], visual: { model: "box", color: 0x8B4513, scale: [0.36, 0.20, 0.22] }, attachments: [ { bone: "torso", pos: [0, -0.25, 0], rot: [0, 0, 0], visual: { model: "box", color: 0x8B4513, scale: [0.36, 0.20, 0.22] } }, { bone: "leftLeg", pos: [0, 0, 0], rot: [0, 0, 0], visual: { model: "box", color: 0x8B4513, scale: [0.16, 0.35, 0.16] } }, { bone: "leftShin", pos: [0, 0, 0], rot: [0, 0, 0], visual: { model: "box", color: 0x8B4513, scale: [0.14, 0.35, 0.14] } }, { bone: "rightLeg", pos: [0, 0, 0], rot: [0, 0, 0], visual: { model: "box", color: 0x8B4513, scale: [0.16, 0.35, 0.16] } }, { bone: "rightShin", pos: [0, 0, 0], rot: [0, 0, 0], visual: { model: "box", color: 0x8B4513, scale: [0.14, 0.35, 0.14] } } ], gameplay: {} },
    "armor_feet_boots": { id: "armor_feet_boots", type: "equipment", tags: ["feet"], visual: { model: "box", color: 0x3d2b1f, scale: [0.15, 0.10, 0.24] }, attachments: [ { bone: "leftFoot", pos: [0, 0, 0], rot: [0, 0, 0] }, { bone: "rightFoot", pos: [0, 0, 0], rot: [0, 0, 0] } ], gameplay: {} },

    // --- PROPS ---
    "prop_tree_log": { id: "prop_tree_log", type: "prop", tags: ["prop"], visual: { model: "group", parts: [ { model: "cylinder", color: 0x8B4513, scale: [0.4, 1.8, 0.4], pos: [0, 0.9, 0] } ] }, physics: { solid: true, standable: true, mass: 50, shape: "cylinder", radius: 0.2 }, gameplay: {} },

    // --- SKILLS VISUAIS ---
    "vfx_fireball": { id: "vfx_fireball", type: "vfx", tags: ["vfx"], visual: { model: "box", color: 0xFF4500, scale: [0.6, 0.6, 0.6] }, gameplay: {} },
    "vfx_iceball": { id: "vfx_iceball", type: "vfx", tags: ["vfx"], visual: { model: "box", color: 0x00FFFF, scale: [0.2, 0.2, 1.0] }, gameplay: {} }
};

window.STANCES = {
    DEFAULT: { torso: { x: 0, y: 0, z: 0 }, leftArm: { x: 0, y: 0, z: 0.2 }, rightArm: { x: 0, y: 0, z: -0.2 }, leftForeArm: { x: -0.1, y: 0, z: 0 }, rightForeArm: { x: -0.1, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    REST_SIMPLE: { torso: { x: 0.3, y: 0, z: 0 }, leftArm: { x: -0.5, y: 0, z: 0.3 }, rightArm: { x: -0.5, y: 0, z: -0.3 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -1.5, y: 0.2, z: 0 }, rightLeg: { x: -1.5, y: -0.2, z: 0 }, leftShin: { x: 1.0, y: 0, z: 0 }, rightShin: { x: 1.0, y: 0, z: 0 } },
    FIST_WINDUP: { torso: { x: 0, y: 0.5, z: 0 }, leftArm: { x: -1.5, y: 0.5, z: 0 }, rightArm: { x: -0.5, y: -0.5, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    FIST_COMBO_1: { torso: { x: 0, y: -0.5, z: 0 }, leftArm: { x: -1.5, y: -0.5, z: 0 }, rightArm: { x: -1.5, y: 0.5, z: 0 }, leftForeArm: { x: 0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    FIST_COMBO_2: { torso: { x: 0, y: 0.5, z: 0 }, leftArm: { x: -1.5, y: 0.5, z: 0 }, rightArm: { x: -1.5, y: -0.5, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    FIST_COMBO_3: { torso: { x: 0.2, y: 0, z: 0 }, leftArm: { x: -1.5, y: -0.8, z: 0 }, rightArm: { x: -1.5, y: 0.8, z: 0 }, leftForeArm: { x: 0, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    FIST_IDLE: { torso: { x: 0.1, y: 0.3, z: 0 }, leftArm: { x: -1.2, y: 0.3, z: 0.2 }, rightArm: { x: -1.2, y: -0.3, z: -0.2 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -0.2, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    KICK_WINDUP: { torso: { x: 0, y: 0.5, z: 0 }, leftArm: { x: -1.0, y: 0.5, z: 0 }, rightArm: { x: -1.0, y: -0.5, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -0.5, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 1.0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    KICK_COMBO_1: { torso: { x: 0, y: -0.5, z: 0 }, leftArm: { x: -1.0, y: -0.5, z: 0 }, rightArm: { x: -1.0, y: 0.5, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -1.5, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    KICK_COMBO_2: { torso: { x: 0, y: 0.5, z: 0 }, leftArm: { x: -1.0, y: 0.5, z: 0 }, rightArm: { x: -1.0, y: -0.5, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: -1.5, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    KICK_COMBO_3: { torso: { x: -0.5, y: 1.5, z: 0 }, leftArm: { x: -1.0, y: 1.0, z: 0 }, rightArm: { x: -1.0, y: -1.0, z: 0 }, leftForeArm: { x: -1.0, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -2.0, y: 0, z: 0 }, rightLeg: { x: 0.5, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0.5, y: 0, z: 0 } },
    SWORD_WINDUP: { torso: { x: 0, y: 0.8, z: 0 }, leftArm: { x: -0.5, y: 0.5, z: 0.2 }, rightArm: { x: -2.5, y: -0.5, z: -0.2 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: -1.0, y: 0, z: 0 }, leftLeg: { x: -0.2, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    SWORD_COMBO_1: { torso: { x: 0, y: -0.8, z: 0 }, leftArm: { x: -0.5, y: -0.5, z: 0.2 }, rightArm: { x: -1.0, y: 0.8, z: -0.2 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: -0.5, y: 0, z: 0 }, leftLeg: { x: -0.5, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.5, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    SWORD_COMBO_2: { torso: { x: 0, y: 0.8, z: 0 }, leftArm: { x: -0.5, y: 0.5, z: 0.2 }, rightArm: { x: -2.0, y: -1.0, z: -0.2 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: -0.5, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    SWORD_COMBO_3: { torso: { x: 0.5, y: 0, z: 0 }, leftArm: { x: -0.5, y: 0.5, z: 0.2 }, rightArm: { x: -1.5, y: 0, z: -0.5 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, leftLeg: { x: -0.2, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    SWORD_IDLE: { torso: { x: 0, y: 0.4, z: 0 }, leftArm: { x: -0.5, y: 0.2, z: 0.2 }, rightArm: { x: -1.8, y: -0.2, z: -0.2 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: -0.8, y: 0, z: 0 }, leftLeg: { x: -0.2, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    GUN_ATK: { torso: { x: 0, y: 0.8, z: 0 }, leftArm: { x: -0.5, y: 0.5, z: 0.2 }, rightArm: { x: -1.5, y: 0, z: 0 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: 0, y: 0, z: 0 }, leftLeg: { x: 0, y: 0, z: 0 }, rightLeg: { x: 0, y: 0, z: 0 }, leftShin: { x: 0, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } },
    GUN_IDLE: { torso: { x: 0, y: 0.4, z: 0 }, leftArm: { x: -0.5, y: 0.2, z: 0.2 }, rightArm: { x: -1.0, y: -0.2, z: 0 }, leftForeArm: { x: -0.5, y: 0, z: 0 }, rightForeArm: { x: -0.5, y: 0, z: 0 }, leftLeg: { x: -0.2, y: 0, z: 0 }, rightLeg: { x: 0.2, y: 0, z: 0 }, leftShin: { x: 0.2, y: 0, z: 0 }, rightShin: { x: 0, y: 0, z: 0 } }
};