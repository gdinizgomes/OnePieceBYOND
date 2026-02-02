/*
    BYOND 3D MMO: Core Systems (Save, Stats, Movement)
*/

// Definições de Save
#define SAVE_DIR "saves/"

mob
    // --- 1. ATRIBUTOS RPG ---
    var/level = 1
    var/experience = 0
    var/max_experience = 100

    // Status (Base Neutra)
    var/strength = 5    // Dano Físico
    var/vitality = 5    // Vida (HP)
    var/agility = 5     // Velocidade de Movimento/Ataque
    var/wisdom = 5      // Mana/Habilidade (Akuma no Mi)

    var/current_hp = 50
    var/max_hp = 50
    var/gold = 0

    // Variáveis do Sistema 3D
    var/real_x = 0
    var/real_z = 0
    var/real_rot = 0

    // --- 2. SISTEMA DE LOGIN E SAVE ---
    Login()
        ..()
        // Tenta carregar o personagem
        if(!LoadCharacter())
            // Se não existir save, inicializa posição neutra
            real_x = 0
            real_z = 0
            world << "[src] entrou no mundo pela primeira vez!"

        // Inicia o jogo visual
        Run3DGame()
        // Inicia o loop de dados
        spawn(10) UpdateLoop()
        // Auto-save a cada 60 segundos
        spawn(600) AutoSaveLoop()

    Logout()
        SaveCharacter() // Salva ao sair
        ..()

    proc/AutoSaveLoop()
        while(src)
            SaveCharacter()
            sleep(600) // 1 minuto

    proc/SaveCharacter()
        if(!src.ckey) return
        var/savefile/F = new("[SAVE_DIR][src.ckey].sav")

        // O que vamos salvar?
        F["level"] << src.level
        F["exp"] << src.experience
        F["str"] << src.strength
        F["vit"] << src.vitality
        F["agi"] << src.agility
        F["wis"] << src.wisdom
        F["pos_x"] << src.real_x
        F["pos_z"] << src.real_z
        F["gold"] << src.gold

        src << output("Jogo Salvo!", "map3d:mostrarNotificacao") // Feedback visual

    proc/LoadCharacter()
        if(!fexists("[SAVE_DIR][src.ckey].sav")) return 0 // Retorna falso se não tem save

        var/savefile/F = new("[SAVE_DIR][src.ckey].sav")
        F["level"] >> src.level
        F["exp"] >> src.experience
        F["str"] >> src.strength
        F["vit"] >> src.vitality
        F["agi"] >> src.agility
        F["wis"] >> src.wisdom
        F["pos_x"] >> src.real_x
        F["pos_z"] >> src.real_z
        F["gold"] >> src.gold
        return 1 // Sucesso

    // --- 3. LOOP DE DADOS (AGORA COM STATUS) ---
    proc/UpdateLoop()
        while(src)
            var/list/packet = list(
                "data" = list(
                    "x" = src.real_x,
                    "z" = src.real_z,
                    "rot" = src.real_rot,
                    "hp" = src.current_hp,
                    "max_hp" = src.max_hp,
                    "lvl" = src.level,
                    "gold" = src.gold,
                    "name" = src.name
                )
            )
            src << output(json_encode(packet), "map3d:receberDados")
            sleep(1) // 10 ticks por segundo

    // --- 4. RECEBENDO INPUTS ---
    Topic(href, href_list[])
        ..()
        if(href_list["action"] == "update_pos")
            real_x = text2num(href_list["x"])
            real_z = text2num(href_list["z"])
            real_rot = text2num(href_list["rot"])

        if(href_list["action"] == "attack")
            // Lógica de ataque será processada aqui no futuro
            // Ex: Verificar colisão com inimigos próximos
            src << output("Ataque registrado!", "map3d:mostrarNotificacao")

    verb
        Run3DGame()
            set category = "3D"
            var/page = file2text('game.html')
            page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
            src << browse(page, "window=map3d")