#define SAVE_DIR "saves/"

// --- ESTRUTURA DE ITENS (NOVO SISTEMA MODULAR) ---
// Todos os itens do jogo herdarão desta estrutura base.
obj/item
    var/id_visual = ""      // O ID que o definitions.js usa (ex: "weapon_sword_iron")
    var/slot = "none"       // Onde equipa? "hand", "body", etc.
    var/power = 0           // Dano ou Defesa
    var/price = 0           // Valor em Berries
    var/weight = 0          // Peso (futuro)

// -- Definição de Armas --
obj/item/weapon
    slot = "hand"

obj/item/weapon/sword_iron
    name = "Espada de Ferro"
    id_visual = "weapon_sword_iron"
    power = 10
    price = 100

obj/item/weapon/gun_flintlock
    name = "Pistola Velha"
    id_visual = "weapon_gun_flintlock"
    power = 25
    price = 250

// -----------------------------------------------------

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
    var/agility = 5   
    var/wisdom = 5    
    
    // Status Vitais
    var/current_hp = 50; var/max_hp = 50
    var/current_energy = 50; var/max_energy = 50 
    var/gold = 0

    // Proficiências
    var/prof_punch_lvl = 1; var/prof_punch_exp = 0
    var/prof_kick_lvl = 1;  var/prof_kick_exp = 0
    var/prof_sword_lvl = 1; var/prof_sword_exp = 0
    var/prof_gun_lvl = 1;   var/prof_gun_exp = 0

    // Estados
    var/is_resting = 0 
    var/is_fainted = 0 
    var/faint_end_time = 0 
    var/is_running = 0 

    // Variáveis Físicas
    var/calc_move_speed = 0.08
    var/calc_jump_power = 0.20

    // Visual e Posição
    var/skin_color = "FFCCAA"; var/cloth_color = "FF0000"
    var/real_x = 0; var/real_y = 0; var/real_z = 0; var/real_rot = 0
    var/in_game = 0
    
    // --- COMBATE E EQUIPAMENTO (MODULARIZADO) ---
    var/is_attacking = 0
    var/attack_type = "" 
    
    // Agora 'active_item' é apenas para envio de rede (string).
    // A lógica real usa 'equipped_item' (referência ao objeto).
    var/tmp/obj/item/equipped_item = null 
    var/active_item_visual = "" 

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

    // --- GERENCIAMENTO DE INVENTÁRIO ---
    proc/GiveStarterItems()
        // Apenas para testes ou novos chars: dá itens se não tiver
        if(contents.len == 0)
            new /obj/item/weapon/sword_iron(src)
            new /obj/item/weapon/gun_flintlock(src)
            src << output("Itens iniciais recebidos!", "map3d:mostrarNotificacao")

    proc/EquipItem(obj/item/I)
        if(!I || !(I in contents)) return
        
        if(I.slot == "hand")
            equipped_item = I
            active_item_visual = I.id_visual
            src << output("Equipou [I.name]", "map3d:mostrarNotificacao")

    proc/UnequipItem()
        equipped_item = null
        active_item_visual = ""
        src << output("Desequipou arma", "map3d:mostrarNotificacao")

    // --- CÁLCULO DE STATUS ---
    proc/RecalculateStats()
        max_hp = 50 + (vitality * 10) 
        max_energy = 30 + (wisdom * 5)
        
        if(current_hp > max_hp) current_hp = max_hp
        if(current_energy > max_energy) current_energy = max_energy

        calc_move_speed = 0.08 + (agility * 0.002) 
        calc_jump_power = 0.20 + (strength * 0.002) + (agility * 0.003)

    // --- LÓGICA DE EVOLUÇÃO ---
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

    proc/GetProficiencyReq(lvl)
        return 50 * (lvl * 1.2)

    proc/GainWeaponExp(type, amount)
        var/lvl = 1; var/exp = 0; var/req = 100
        
        if(type == "fist") { exp = prof_punch_exp; lvl = prof_punch_lvl; }
        else if(type == "kick") { exp = prof_kick_exp; lvl = prof_kick_lvl; }
        else if(type == "sword") { exp = prof_sword_exp; lvl = prof_sword_lvl; }
        else if(type == "gun") { exp = prof_gun_exp; lvl = prof_gun_lvl; }

        req = GetProficiencyReq(lvl)
        exp += amount

        if(exp >= req)
            lvl++
            exp -= req
            src << output("<span class='log-hit' style='color:#00ff00'>Habilidade [type] subiu para [lvl]!</span>", "map3d:addLog")
        
        if(type == "fist") { prof_punch_exp = exp; prof_punch_lvl = lvl; }
        else if(type == "kick") { prof_kick_exp = exp; prof_kick_lvl = lvl; }
        else if(type == "sword") { prof_sword_exp = exp; prof_sword_lvl = lvl; }
        else if(type == "gun") { prof_gun_exp = exp; prof_gun_lvl = lvl; }

    // --- SISTEMA DE ENERGIA E DESMAIO ---
    proc/ConsumeEnergy(amount)
        if(is_fainted) return 0 

        var/efficiency = 1.0 - (vitality * 0.01) 
        if(efficiency < 0.5) efficiency = 0.5 
        
        var/final_cost = amount * efficiency
        current_energy -= final_cost

        if(current_energy <= 0)
            current_energy = 0
            GoFaint()
        
        return 1 

    proc/GoFaint()
        if(is_fainted) return
        is_fainted = 1
        is_resting = 1
        faint_end_time = world.time + 150 
        
        src << output("<span class='log-hit' style='color:red; font-size:16px;'>VOCÊ DESMAIOU DE EXAUSTÃO!</span>", "map3d:addLog")
        
        spawn(150) 
            if(src) WakeUp()

    proc/WakeUp()
        is_fainted = 0
        is_resting = 0
        faint_end_time = 0
        current_energy = max_energy * 0.10 
        src << output("Você acordou.", "map3d:mostrarNotificacao")

    proc/ToggleRest()
        if(is_attacking || is_fainted) return
        is_resting = !is_resting
        if(is_resting) src << output("Descansando...", "map3d:mostrarNotificacao")
        else src << output("Levantou.", "map3d:mostrarNotificacao")

    proc/RestLoop()
        while(src && in_game)
            if(is_resting && !is_fainted)
                var/hp_regen = max_hp * 0.05
                var/en_regen = max_energy * 0.05
                if(current_hp < max_hp) current_hp = min(max_hp, current_hp + hp_regen)
                if(current_energy < max_energy) current_energy = min(max_energy, current_energy + en_regen)
            
            if(is_running && !is_resting && !is_fainted)
                var/run_cost = max_energy * 0.01
                if(current_energy > 0)
                    current_energy -= run_cost
                    if(current_energy <= 0) 
                        current_energy = 0
                        GoFaint()
            
            sleep(10)

    // -------------------------

    proc/ShowCharacterMenu()
        var/page = file2text('menu.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

    proc/StartGame(slot_index)
        current_slot = slot_index
        if(LoadCharacter(slot_index))
            src << output("Carregado!", "map3d:mostrarNotificacao")
        else
            real_x = 0; real_y = 0; real_z = 0
            level = 1; experience = 0; req_experience = 100; stat_points = 0
            strength = 5; vitality = 5; agility = 5; wisdom = 5
            prof_punch_lvl=1; prof_kick_lvl=1; prof_sword_lvl=1; prof_gun_lvl=1
            RecalculateStats()
            current_hp = max_hp; current_energy = max_energy
            active_item_visual = "" 
            
            // Novos personagens ganham itens iniciais
            GiveStarterItems()
            
            src << output("Novo char!", "map3d:mostrarNotificacao")

        src << browse_rsc(file("definitions.js"), "definitions.js")
        src << browse_rsc(file("factory.js"), "factory.js")
        src << browse_rsc(file("engine.js"), "engine.js")
        src << browse_rsc(file("game.js"), "game.js")

        char_loaded = 1
        in_game = 1
        is_resting = 0; is_fainted = 0; is_running = 0
        var/page = file2text('game.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

        spawn(10) UpdateLoop()
        spawn(600) AutoSaveLoop()
        spawn(10) RestLoop()

    proc/SaveCharacter()
        if(!current_slot || !in_game) return
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
        F["name"] << src.name; F["level"] << src.level
        F["exp"] << src.experience; F["req_exp"] << src.req_experience
        F["stat_pts"] << src.stat_points; F["gold"] << src.gold
        F["hp"] << src.current_hp; F["en"] << src.current_energy
        F["str"] << src.strength; F["vit"] << src.vitality
        F["agi"] << src.agility; F["wis"] << src.wisdom
        F["p_punch"] << prof_punch_lvl; F["exp_punch"] << prof_punch_exp
        F["p_kick"] << prof_kick_lvl; F["exp_kick"] << prof_kick_exp
        F["p_sword"] << prof_sword_lvl; F["exp_sword"] << prof_sword_exp
        F["p_gun"] << prof_gun_lvl; F["exp_gun"] << prof_gun_exp
        F["pos_x"] << src.real_x; F["pos_y"] << src.real_y; F["pos_z"] << src.real_z
        F["skin"] << src.skin_color; F["cloth"] << src.cloth_color
        
        // SALVAMENTO DE INVENTÁRIO (MODERNO)
        // O BYOND lida automaticamente com listas de objetos ao salvar.
        F["inventory"] << src.contents
        
        src << output("Salvo!", "map3d:mostrarNotificacao")

    proc/LoadCharacter(slot)
        if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
        F["name"] >> src.name; F["level"] >> src.level
        F["exp"] >> src.experience; F["req_exp"] >> src.req_experience
        F["stat_pts"] >> src.stat_points; F["gold"] >> src.gold
        F["hp"] >> src.current_hp
        if(F["en"]) F["en"] >> src.current_energy; else src.current_energy = 50
        if(F["str"]) F["str"] >> src.strength; else src.strength = 5
        if(F["vit"]) F["vit"] >> src.vitality; else src.vitality = 5
        if(F["agi"]) F["agi"] >> src.agility; else src.agility = 5
        if(F["wis"]) F["wis"] >> src.wisdom; else src.wisdom = 5
        
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

        // CARREGAMENTO DE INVENTÁRIO
        if(F["inventory"]) F["inventory"] >> src.contents

        if(!src.req_experience || src.req_experience <= 0)
            src.req_experience = 100 * (1.5 ** (src.level - 1)) 
            if(src.req_experience < 100) src.req_experience = 100
        
        RecalculateStats()
        return 1

    proc/UpdateLoop()
        while(src && in_game)
            var/list/players_list = list()
            for(var/mob/M in world)
                if(M.in_game && M.char_loaded)
                    if(abs(M.real_x - src.real_x) > 30 || abs(M.real_z - src.real_z) > 30) continue
                    var/pid = "\ref[M]"
                    var/list/pData = list(
                        "x" = M.real_x, "y" = M.real_y, "z" = M.real_z, "rot" = M.real_rot,
                        "a" = M.is_attacking, "at" = M.attack_type,
                        "it" = M.active_item_visual, // Usa a variável visual agora
                        "rest" = M.is_resting,
                        "ft" = M.is_fainted 
                    )
                    pData["name"] = M.name
                    pData["skin"] = M.skin_color; pData["cloth"] = M.cloth_color
                    players_list[pid] = pData

            var/faint_remaining = 0
            if(src.is_fainted && src.faint_end_time > world.time)
                faint_remaining = round((src.faint_end_time - world.time) / 10)

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
                    "en" = src.current_energy, "max_en" = src.max_energy,
                    
                    "pp" = prof_punch_lvl, "pp_x" = prof_punch_exp, "pp_r" = GetProficiencyReq(prof_punch_lvl),
                    "pk" = prof_kick_lvl,  "pk_x" = prof_kick_exp,  "pk_r" = GetProficiencyReq(prof_kick_lvl),
                    "ps" = prof_sword_lvl, "ps_x" = prof_sword_exp, "ps_r" = GetProficiencyReq(prof_sword_lvl),
                    "pg" = prof_gun_lvl,   "pg_x" = prof_gun_exp,   "pg_r" = GetProficiencyReq(prof_gun_lvl),
                    
                    "mspd" = calc_move_speed,
                    "jmp" = calc_jump_power,
                    "rest" = src.is_resting,
                    "ft" = src.is_fainted,
                    "rem" = faint_remaining 
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
            if(!is_fainted) 
                real_x = text2num(href_list["x"]); real_y = text2num(href_list["y"]);
                real_z = text2num(href_list["z"]); real_rot = text2num(href_list["rot"])
                if(href_list["run"] == "1") is_running = 1
                else is_running = 0

        if(action == "toggle_rest" && in_game) ToggleRest()

        if(action == "attack" && in_game)
            if(is_resting) return 

            var/base_cost = max_energy * 0.03 
            
            if(ConsumeEnergy(base_cost))
                is_attacking = 1
                attack_type = href_list["type"] // Tipo Visual (fist, sword, gun)
                
                // --- LÓGICA DE DANO MODULARIZADA ---
                var/weapon_bonus = 0
                var/prof_bonus = 0
                var/prof_lvl = 1
                
                // Verifica o item equipado REALMENTE, não só o visual
                if(attack_type == "sword" || attack_type == "gun")
                    // Se o player diz que ataca de espada, vamos ver se ele TEM UMA equipada
                    // Neste passo simples, buscamos no inventário um item desse tipo
                    // para simular a troca de "test weapon" por "real item"
                    if(attack_type == "sword")
                        var/obj/item/weapon/sword_iron/W = locate() in src
                        if(W) 
                            EquipItem(W) // Garante equip
                            weapon_bonus = W.power
                    if(attack_type == "gun")
                        var/obj/item/weapon/gun_flintlock/G = locate() in src
                        if(G) 
                            EquipItem(G)
                            weapon_bonus = G.power
                else
                    UnequipItem() // Socos desequipam

                if(attack_type == "fist")  { prof_lvl = prof_punch_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "kick")  { prof_lvl = prof_kick_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "sword") { prof_lvl = prof_sword_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "gun")   { prof_lvl = prof_gun_lvl;  prof_bonus = prof_lvl * 2; }
                
                var/target = href_list["target"]

                if(target == "dummy")
                    var/damage = round((strength * 0.5) + prof_bonus + weapon_bonus + rand(0, 2))
                    src << output("<span class='log-hit'>HIT! Dano: [damage]</span>", "map3d:addLog")
                    
                    GainExperience(10)
                    GainWeaponExp(attack_type, 5) 
                else
                    src << output("Errou...", "map3d:addLog")
                
                spawn(3) 
                    is_attacking = 0
            else
                return

        if(action == "add_stat" && in_game)
            if(stat_points > 0)
                var/s = href_list["stat"]
                if(s == "str") strength++
                if(s == "vit") vitality++
                if(s == "agi") agility++
                if(s == "wis") wisdom++
                stat_points--
                RecalculateStats() 
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