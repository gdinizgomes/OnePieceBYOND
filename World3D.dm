#define SAVE_DIR "saves/"

mob
    var/current_slot = 0
    var/char_loaded = 0

    // --- SISTEMA DE RPG ---
    var/level = 1
    var/experience = 0
    var/req_experience = 100 
    var/stat_points = 0      
    
    // Atributos Principais
    var/strength = 5
    var/vitality = 5
    var/agility = 5   // Influencia Velocidade
    var/wisdom = 5    // Influencia Energia
    
    // Status Vitais
    var/current_hp = 50; var/max_hp = 50
    var/current_energy = 50; var/max_energy = 50 // NOVO
    var/gold = 0

    // Proficiências (Nível e XP)
    var/prof_punch_lvl = 1; var/prof_punch_exp = 0
    var/prof_kick_lvl = 1;  var/prof_kick_exp = 0
    var/prof_sword_lvl = 1; var/prof_sword_exp = 0
    var/prof_gun_lvl = 1;   var/prof_gun_exp = 0

    // Estados
    var/is_resting = 0 // NOVO

    // Visual e Posição
    var/skin_color = "FFCCAA"; var/cloth_color = "FF0000"
    var/real_x = 0; var/real_y = 0; var/real_z = 0; var/real_rot = 0
    var/in_game = 0
    var/is_attacking = 0
    var/attack_type = "" 

    Login()
        ..()
        in_game = 0
        ShowCharacterMenu()

    Logout()
        if(in_game)
            SaveCharacter()
            in_game = 0
        char_loaded = 0
        del(src)
        ..()

    // --- CÁLCULO DE STATUS ---
    proc/RecalculateStats()
        max_hp = 50 + (vitality * 5)
        max_energy = 30 + (wisdom * 5)
        // A velocidade base é 0.10, cada ponto de agilidade dá +0.005
        // Ex: 5 AGI = 0.125, 20 AGI = 0.20 (Muito rápido)

    // --- LÓGICA DE EVOLUÇÃO (GERAL) ---
    proc/GainExperience(amount)
        if(!in_game) return
        experience += amount
        src << output("<span class='log-hit' style='color:#aaddff'>+ [amount] EXP</span>", "map3d:addLog")
        
        var/safety = 0
        while(experience >= req_experience && safety < 50)
            LevelUp()
            safety++

    proc/LevelUp()
        level++
        experience -= req_experience
        req_experience = round(req_experience * 1.5)
        if(req_experience < 100) req_experience = 100 
        stat_points += 3
        RecalculateStats()
        current_hp = max_hp; current_energy = max_energy
        src << output("<span class='log-hit' style='font-size:14px; color:#ffff00'>LEVEL UP! Nível [level]</span>", "map3d:addLog")
        src << output("Você ganhou 3 pontos de status.", "map3d:mostrarNotificacao")
        SaveCharacter()

    // --- EVOLUÇÃO DE PROFICIÊNCIA ---
    proc/GainWeaponExp(type, amount)
        var/lvl = 1; var/exp = 0; var/req = 100
        
        if(type == "fist") { exp = prof_punch_exp; lvl = prof_punch_lvl; }
        else if(type == "kick") { exp = prof_kick_exp; lvl = prof_kick_lvl; }
        else if(type == "sword") { exp = prof_sword_exp; lvl = prof_sword_lvl; }
        else if(type == "gun") { exp = prof_gun_exp; lvl = prof_gun_lvl; }

        req = 50 * (lvl * 1.2) // Curva de proficiência
        exp += amount

        // Verifica Level Up da Arma
        if(exp >= req)
            lvl++
            exp -= req
            src << output("<span class='log-hit' style='color:#00ff00'>Sua habilidade em [type] subiu para [lvl]!</span>", "map3d:addLog")
        
        // Salva de volta
        if(type == "fist") { prof_punch_exp = exp; prof_punch_lvl = lvl; }
        else if(type == "kick") { prof_kick_exp = exp; prof_kick_lvl = lvl; }
        else if(type == "sword") { prof_sword_exp = exp; prof_sword_lvl = lvl; }
        else if(type == "gun") { prof_gun_exp = exp; prof_gun_lvl = lvl; }

    // --- SISTEMA DE DESCANSO ---
    proc/ToggleRest()
        if(is_attacking) return
        is_resting = !is_resting
        if(is_resting)
            src << output("Você começou a descansar...", "map3d:mostrarNotificacao")
        else
            src << output("Você levantou.", "map3d:mostrarNotificacao")

    proc/RestLoop()
        while(src && in_game)
            if(is_resting)
                // Recupera 10% a cada segundo (Total ~10s)
                var/hp_regen = max_hp * 0.1
                var/en_regen = max_energy * 0.1
                
                if(current_hp < max_hp) current_hp = min(max_hp, current_hp + hp_regen)
                if(current_energy < max_energy) current_energy = min(max_energy, current_energy + en_regen)
                
                // Se estiver cheio, acorda? Não, deixa o player decidir.
            sleep(10) // 1 segundo

    // -------------------------

    proc/ShowCharacterMenu()
        var/page = file2text('menu.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

    proc/StartGame(slot_index)
        current_slot = slot_index
        if(LoadCharacter(slot_index))
            src << output("Personagem carregado!", "map3d:mostrarNotificacao")
        else
            // Reset
            real_x = 0; real_y = 0; real_z = 0
            level = 1; experience = 0; req_experience = 100; stat_points = 0
            strength = 5; vitality = 5; agility = 5; wisdom = 5
            prof_punch_lvl=1; prof_kick_lvl=1; prof_sword_lvl=1; prof_gun_lvl=1
            RecalculateStats()
            current_hp = max_hp; current_energy = max_energy
            src << output("Novo personagem!", "map3d:mostrarNotificacao")

        src << browse_rsc(file("definitions.js"), "definitions.js")
        src << browse_rsc(file("factory.js"), "factory.js")
        src << browse_rsc(file("engine.js"), "engine.js")
        src << browse_rsc(file("game.js"), "game.js")

        char_loaded = 1
        in_game = 1
        is_resting = 0
        var/page = file2text('game.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

        spawn(10) UpdateLoop()
        spawn(600) AutoSaveLoop()
        spawn(10) RestLoop()

    proc/SaveCharacter()
        if(!current_slot || !in_game) return

        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
        F["name"] << src.name
        F["level"] << src.level
        F["exp"] << src.experience          
        F["req_exp"] << src.req_experience  
        F["stat_pts"] << src.stat_points    
        F["gold"] << src.gold
        F["hp"] << src.current_hp
        F["en"] << src.current_energy // Salva energia
        
        // Stats
        F["str"] << src.strength; F["vit"] << src.vitality
        F["agi"] << src.agility;  F["wis"] << src.wisdom
        
        // Proficiências
        F["p_punch"] << prof_punch_lvl; F["exp_punch"] << prof_punch_exp
        F["p_kick"] << prof_kick_lvl;   F["exp_kick"] << prof_kick_exp
        F["p_sword"] << prof_sword_lvl; F["exp_sword"] << prof_sword_exp
        F["p_gun"] << prof_gun_lvl;     F["exp_gun"] << prof_gun_exp

        F["pos_x"] << src.real_x; F["pos_y"] << src.real_y; F["pos_z"] << src.real_z
        F["skin"] << src.skin_color; F["cloth"] << src.cloth_color
        src << output("Jogo Salvo!", "map3d:mostrarNotificacao")

    proc/LoadCharacter(slot)
        if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
        F["name"] >> src.name
        F["level"] >> src.level
        F["exp"] >> src.experience          
        F["req_exp"] >> src.req_experience  
        F["stat_pts"] >> src.stat_points    
        F["gold"] >> src.gold
        F["hp"] >> src.current_hp
        
        if(F["en"]) F["en"] >> src.current_energy; else src.current_energy = 50

        if(F["str"]) F["str"] >> src.strength; else src.strength = 5
        if(F["vit"]) F["vit"] >> src.vitality; else src.vitality = 5
        if(F["agi"]) F["agi"] >> src.agility;  else src.agility = 5
        if(F["wis"]) F["wis"] >> src.wisdom;   else src.wisdom = 5

        // Carrega Proficiências (com fallback para 1)
        if(F["p_punch"]) F["p_punch"] >> prof_punch_lvl; else prof_punch_lvl = 1
        if(F["exp_punch"]) F["exp_punch"] >> prof_punch_exp
        if(F["p_kick"]) F["p_kick"] >> prof_kick_lvl; else prof_kick_lvl = 1
        if(F["exp_kick"]) F["exp_kick"] >> prof_kick_exp
        if(F["p_sword"]) F["p_sword"] >> prof_sword_lvl; else prof_sword_lvl = 1
        if(F["exp_sword"]) F["exp_sword"] >> prof_sword_exp
        if(F["p_gun"]) F["p_gun"] >> prof_gun_lvl; else prof_gun_lvl = 1
        if(F["exp_gun"]) F["exp_gun"] >> prof_gun_exp

        F["pos_x"] >> src.real_x; 
        if(F["pos_y"]) F["pos_y"] >> src.real_y;
        F["pos_z"] >> src.real_z
        F["skin"] >> src.skin_color; F["cloth"] >> src.cloth_color

        if(!src.req_experience || src.req_experience <= 0)
            src.req_experience = 100 * (1.5 ** (src.level - 1)) 
            if(src.req_experience < 100) src.req_experience = 100
        
        RecalculateStats() // Garante max_hp e max_energy corretos
        return 1

    proc/UpdateLoop()
        while(src && in_game)
            var/list/players_list = list()
            // Loop para outros players (AOI)
            for(var/mob/M in world)
                if(M.in_game && M.char_loaded)
                    if(abs(M.real_x - src.real_x) > 15 || abs(M.real_z - src.real_z) > 15) continue
                    var/pid = "\ref[M]"
                    var/list/pData = list(
                        "x" = M.real_x, "y" = M.real_y, "z" = M.real_z, "rot" = M.real_rot,
                        "a" = M.is_attacking, "at" = M.attack_type,
                        "rest" = M.is_resting // Envia se está descansando
                    )
                    // Sync Visual (Simplificado para o exemplo)
                    pData["name"] = M.name
                    pData["skin"] = M.skin_color; pData["cloth"] = M.cloth_color
                    players_list[pid] = pData

            // Calcula velocidade baseada em Agilidade
            var/spd = 0.10 + (src.agility * 0.005)

            var/list/packet = list(
                "my_id" = "\ref[src]",
                "me" = list(
                    "loaded" = src.char_loaded, 
                    "lvl" = src.level, 
                    "exp" = src.experience, "req_exp" = src.req_experience, 
                    "pts" = src.stat_points,
                    "str" = src.strength, "vit" = src.vitality,
                    "agi" = src.agility,  "wis" = src.wisdom,
                    "gold" = src.gold, 
                    "hp" = src.current_hp, "max_hp" = src.max_hp,
                    "en" = src.current_energy, "max_en" = src.max_energy, // Energia
                    
                    // Proficiências
                    "pp" = prof_punch_lvl, "pk" = prof_kick_lvl,
                    "ps" = prof_sword_lvl, "pg" = prof_gun_lvl,
                    
                    "mspd" = spd, // Velocidade de Movimento calculada
                    "rest" = src.is_resting // Estado de descanso
                ),
                "others" = players_list,
                "t" = world.time
            )
            src << output(json_encode(packet), "map3d:receberDadosMultiplayer")
            sleep(2)

    proc/AutoSaveLoop()
        while(src && in_game)
            SaveCharacter()
            sleep(300)

    Topic(href, href_list[])
        ..()
        var/action = href_list["action"]
        
        if(action == "request_slots")
            var/list/slots_data = list()
            for(var/i=1 to 3)
                if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav"))
                    var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[i].sav")
                    var/n; var/l; var/g
                    F["name"] >> n; F["level"] >> l; F["gold"] >> g
                    slots_data["slot[i]"] = list("name"=n, "lvl"=l, "gold"=g)
                else
                    slots_data["slot[i]"] = null
            src << output(json_encode(slots_data), "map3d:loadSlots")

        if(action == "delete_char")
            var/slot = text2num(href_list["slot"])
            var/path = "[SAVE_DIR][src.ckey]_slot[slot].sav"
            if(fexists(path)) fdel(path)
            ShowCharacterMenu()
        if(action == "select_char") StartGame(text2num(href_list["slot"]))
        if(action == "create_char")
            var/slot = text2num(href_list["slot"])
            src.name = href_list["name"]; src.skin_color = href_list["skin"]; src.cloth_color = href_list["cloth"]
            src.level = 1; src.gold = 0;
            src.real_x = 0; src.real_y = 0; src.real_z = 0
            current_slot = slot; SaveCharacter(); StartGame(slot)
        if(action == "force_save" && in_game) SaveCharacter()
        
        // Movimentação (Bloqueia se estiver descansando)
        if(action == "update_pos" && in_game)
            if(!is_resting)
                real_x = text2num(href_list["x"]); real_y = text2num(href_list["y"]);
                real_z = text2num(href_list["z"]); real_rot = text2num(href_list["rot"])

        if(action == "toggle_rest" && in_game)
            ToggleRest()

        if(action == "attack" && in_game)
            if(is_resting) return // Não ataca dormindo

            // Custo de Energia (Fixo 5 por enquanto)
            if(current_energy >= 5)
                current_energy -= 5
                is_attacking = 1
                attack_type = href_list["type"]
                var/target = href_list["target"]

                if(target == "dummy")
                    var/weapon_bonus = 0
                    var/prof_bonus = 0
                    
                    if(attack_type == "fist")  prof_bonus = prof_punch_lvl
                    if(attack_type == "kick")  prof_bonus = prof_kick_lvl
                    if(attack_type == "sword") { weapon_bonus = 5; prof_bonus = prof_sword_lvl; }
                    if(attack_type == "gun")   { weapon_bonus = 10; prof_bonus = prof_gun_lvl; }
                    
                    var/damage = strength + weapon_bonus + prof_bonus + rand(0, 2)
                    src << output("<span class='log-hit'>HIT! Dano: [damage] (-5 Energia)</span>", "map3d:addLog")
                    
                    GainExperience(10)
                    GainWeaponExp(attack_type, 5) // Ganha 5 XP de proficiência
                else
                    src << output("Errou... (-5 Energia)", "map3d:addLog")
                
                spawn(3) 
                    is_attacking = 0
                    attack_type = ""
            else
                src << output("Sem energia!", "map3d:mostrarNotificacao")

        if(action == "add_stat" && in_game)
            if(stat_points > 0)
                var/s = href_list["stat"]
                if(s == "str") strength++
                if(s == "vit") vitality++
                if(s == "agi") agility++
                if(s == "wis") wisdom++
                stat_points--
                RecalculateStats() // Atualiza max_hp/energy/speed
                src << output("Ponto adicionado em [s]!", "map3d:mostrarNotificacao")

    verb/TestLevelUp()
        set category = "Debug"
        GainExperience(req_experience)

mob/npc
    in_game = 1
    char_loaded = 1
    skin_color = "00FF00"
    cloth_color = "0000FF"
    New()
        ..()
        real_x = rand(-10, 10); real_z = rand(-10, 10); real_y = 0
        spawn(5) AI_Loop()
    proc/AI_Loop()
        while(src)
            var/dir = pick(0, 90, 180, 270)
            real_rot = (dir * 3.14159 / 180)
            for(var/i=1 to 10)
                if(dir == 0) real_z -= 0.1
                if(dir == 180) real_z += 0.1
                if(dir == 90) real_x += 0.1
                if(dir == 270) real_x -= 0.1
                sleep(1)
            sleep(rand(20, 50))
world/New()
    ..()
    new /mob/npc() { name = "Pirata de Teste" }