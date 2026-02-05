#define SAVE_DIR "saves/"

mob
    var/current_slot = 0
    var/char_loaded = 0

    // --- SISTEMA DE RPG (ATUALIZADO) ---
    var/level = 1
    var/experience = 0
    var/req_experience = 100 
    var/stat_points = 0      
    
    // Atributos
    var/strength = 5
    var/vitality = 5
    var/agility = 5
    var/wisdom = 5
    
    // Status Vitais
    var/current_hp = 50
    var/max_hp = 50
    var/gold = 0

    // Visual e Posição
    var/skin_color = "FFCCAA"
    var/cloth_color = "FF0000"
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

    // --- LÓGICA DE EVOLUÇÃO ---
    proc/GainExperience(amount)
        if(!in_game) return
        
        experience += amount
        // Feedback visual de XP
        src << output("<span class='log-hit' style='color:#aaddff'>+ [amount] EXP</span>", "map3d:addLog")
        
        var/safety_loop = 0
        while(experience >= req_experience && safety_loop < 100)
            LevelUp()
            safety_loop++

    proc/LevelUp()
        level++
        experience -= req_experience
        req_experience = round(req_experience * 1.5)
        if(req_experience < 10) req_experience = 100 
        
        stat_points += 3
        max_hp += 10 + (vitality * 2) 
        current_hp = max_hp           
        
        src << output("<span class='log-hit' style='font-size:14px; color:#ffff00'>LEVEL UP! Nível [level]</span>", "map3d:addLog")
        src << output("Você ganhou 3 pontos de status.", "map3d:mostrarNotificacao")
        SaveCharacter()

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
            // Reset para novo char
            real_x = 0; real_y = 0; real_z = 0
            level = 1; experience = 0; req_experience = 100; stat_points = 0
            current_hp = 50; max_hp = 50
            strength = 5; vitality = 5; agility = 5; wisdom = 5
            src << output("Novo personagem!", "map3d:mostrarNotificacao")

        src << browse_rsc(file("definitions.js"), "definitions.js")
        src << browse_rsc(file("factory.js"), "factory.js")
        src << browse_rsc(file("engine.js"), "engine.js")
        src << browse_rsc(file("game.js"), "game.js")

        char_loaded = 1
        in_game = 1
        var/page = file2text('game.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

        spawn(10) UpdateLoop()
        spawn(600) AutoSaveLoop()

    proc/SaveCharacter()
        if(!current_slot || !in_game) return

        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
        F["name"] << src.name
        F["level"] << src.level
        F["exp"] << src.experience          
        F["req_exp"] << src.req_experience  
        F["stat_pts"] << src.stat_points    
        
        F["gold"] << src.gold
        F["hp"] << src.current_hp; F["max_hp"] << src.max_hp
        
        // Stats
        F["str"] << src.strength; F["vit"] << src.vitality
        F["agi"] << src.agility;  F["wis"] << src.wisdom

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
        F["hp"] >> src.current_hp; F["max_hp"] >> src.max_hp

        if(F["str"]) F["str"] >> src.strength; else src.strength = 5
        if(F["vit"]) F["vit"] >> src.vitality; else src.vitality = 5
        if(F["agi"]) F["agi"] >> src.agility;  else src.agility = 5
        if(F["wis"]) F["wis"] >> src.wisdom;   else src.wisdom = 5

        F["pos_x"] >> src.real_x; 
        if(F["pos_y"]) F["pos_y"] >> src.real_y;
        F["pos_z"] >> src.real_z
        F["skin"] >> src.skin_color; F["cloth"] >> src.cloth_color

        if(!src.req_experience || src.req_experience <= 0)
            src.req_experience = 100 * (1.5 ** (src.level - 1)) 
            if(src.req_experience < 100) src.req_experience = 100
        
        return 1

    proc/UpdateLoop()
        var/sync_step = 0
        while(src && in_game)
            var/list/players_list = list()
            var/full_sync = (sync_step >= 4)
            if(full_sync) sync_step = 0
            else sync_step++

            for(var/mob/M in world)
                if(M.in_game && M.char_loaded)
                    if(abs(M.real_x - src.real_x) > 15 || abs(M.real_z - src.real_z) > 15) continue
                    var/pid = "\ref[M]"
                    var/list/pData = list(
                        "x" = M.real_x, "y" = M.real_y, "z" = M.real_z, "rot" = M.real_rot,
                        "a" = M.is_attacking, "at" = M.attack_type
                    )
                    if(full_sync)
                        pData["name"] = M.name
                        pData["skin"] = M.skin_color; pData["cloth"] = M.cloth_color
                        pData["hp"] = M.current_hp; pData["max_hp"] = M.max_hp
                    players_list[pid] = pData

            var/list/packet = list(
                "my_id" = "\ref[src]",
                "me" = list(
                    "loaded" = src.char_loaded, 
                    "lvl" = src.level, 
                    "exp" = src.experience,       
                    "req_exp" = src.req_experience, 
                    
                    "pts" = src.stat_points,
                    "str" = src.strength,
                    "vit" = src.vitality,
                    "agi" = src.agility,
                    "wis" = src.wisdom,
                    
                    "gold" = src.gold, 
                    "hp" = src.current_hp, 
                    "max_hp" = src.max_hp
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
        if(action == "update_pos" && in_game)
            real_x = text2num(href_list["x"]); real_y = text2num(href_list["y"]);
            real_z = text2num(href_list["z"]); real_rot = text2num(href_list["rot"])

        if(action == "attack" && in_game)
            is_attacking = 1
            attack_type = href_list["type"]
            var/target = href_list["target"] // Novo parâmetro

            // LÓGICA DE DANO E XP
            if(target == "dummy")
                // Dano Base = Força + Bonus da Arma (simples por enquanto)
                var/weapon_bonus = 0
                if(attack_type == "sword") weapon_bonus = 5
                if(attack_type == "gun") weapon_bonus = 10
                
                var/damage = strength + weapon_bonus + rand(0, 2)
                src << output("<span class='log-hit'>HIT! Dano: [damage]</span>", "map3d:addLog")
                
                // Ganha XP apenas se acertou
                GainExperience(10)
            
            spawn(3) 
                is_attacking = 0
                attack_type = "" 

        // --- SISTEMA DE STATS ---
        if(action == "add_stat" && in_game)
            if(stat_points > 0)
                var/s = href_list["stat"]
                if(s == "str") strength++
                if(s == "vit") 
                    vitality++
                    max_hp += 2 
                if(s == "agi") agility++
                if(s == "wis") wisdom++
                
                stat_points--
                src << output("Ponto adicionado em [s]!", "map3d:mostrarNotificacao")
            else
                src << output("Sem pontos!", "map3d:mostrarNotificacao")

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