#define SAVE_DIR "saves/"

// --- ESTRUTURA DE ITENS ---
obj/item
    var/id_visual = ""
    var/slot = "none"
    var/power = 0
    var/price = 0
    var/description = ""

    var/amount = 1
    var/max_stack = 5

    // Posição 3D
    var/real_x = 0; var/real_y = 0; var/real_z = 0

// -- Armas --
obj/item/weapon
    slot = "hand"
    max_stack = 1

obj/item/weapon/sword_wood
    name = "Espada de Treino"
    id_visual = "weapon_sword_wood"
    description = "Uma espada de madeira para treinar."
    power = 5; price = 50; max_stack = 5

obj/item/weapon/sword_iron
    name = "Espada de Ferro"
    id_visual = "weapon_sword_iron"
    description = "Lâmina afiada e resistente."
    power = 10; price = 100

obj/item/weapon/sword_silver
    name = "Espada de Prata"
    id_visual = "weapon_sword_silver"
    description = "Brilha com a luz da lua."
    power = 20; price = 500

obj/item/weapon/gun_wood
    name = "Pistola de Brinquedo"
    id_visual = "weapon_gun_wood"
    description = "Dispara rolhas."
    power = 12; price = 80; max_stack = 5

obj/item/weapon/gun_flintlock
    name = "Pistola Velha"
    id_visual = "weapon_gun_flintlock"
    description = "Cheira a pólvora queimada."
    power = 25; price = 250

obj/item/weapon/gun_silver
    name = "Pistola de Combate"
    id_visual = "weapon_gun_silver"
    description = "Alta precisão."
    power = 40; price = 800

// -----------------------------------------------------

mob
    var/current_slot = 0
    var/char_loaded = 0

    // --- INFO DO PERSONAGEM ---
    var/char_class = "Civil"
    var/char_title = "Nenhum"

    // --- SISTEMA DE RPG ---
    var/level = 1; var/experience = 0; var/req_experience = 100; var/stat_points = 0
    var/strength = 5; var/vitality = 5; var/agility = 5; var/wisdom = 5
    var/current_hp = 50; var/max_hp = 50
    var/current_energy = 50; var/max_energy = 50
    var/gold = 0

    var/prof_punch_lvl = 1; var/prof_punch_exp = 0
    var/prof_kick_lvl = 1;  var/prof_kick_exp = 0
    var/prof_sword_lvl = 1; var/prof_sword_exp = 0
    var/prof_gun_lvl = 1;   var/prof_gun_exp = 0

    var/is_resting = 0; var/is_fainted = 0; var/faint_end_time = 0; var/is_running = 0
    var/calc_move_speed = 0.08; var/calc_jump_power = 0.20
    var/skin_color = "FFCCAA"; var/cloth_color = "FF0000"
    var/real_x = 0; var/real_y = 0; var/real_z = 0; var/real_rot = 0
    var/in_game = 0

    // --- COMBATE E EQUIPAMENTO ---
    var/is_attacking = 0
    var/attack_type = ""
    var/active_item_visual = ""

    // SLOTS REAIS
    var/obj/item/slot_hand = null
    var/obj/item/slot_head = null
    var/obj/item/slot_body = null
    var/obj/item/slot_legs = null

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

    proc/GiveStarterItems()
        if(contents.len == 0 && !slot_hand)
            new /obj/item/weapon/sword_wood(src)
            src << output("Item inicial recebido!", "map3d:mostrarNotificacao")

    proc/EquipItem(obj/item/I)
        if(!I || !(I in contents)) return
        if(I.slot == "hand")
            if(slot_hand) UnequipItem("hand")
            slot_hand = I
            contents -= I
            active_item_visual = I.id_visual
            src << output("Equipou [I.name].", "map3d:mostrarNotificacao")
            RequestInventoryUpdate()
            RequestStatusUpdate()

    proc/UnequipItem(slot_name)
        var/obj/item/I = null
        if(slot_name == "hand") I = slot_hand
        if(I)
            if(contents.len >= 12)
                src << output("Mochila cheia!", "map3d:mostrarNotificacao")
                return
            if(slot_name == "hand")
                slot_hand = null
                active_item_visual = ""
            contents += I
            src << output("Desequipou [I.name].", "map3d:mostrarNotificacao")
            RequestInventoryUpdate()
            RequestStatusUpdate()

    proc/DropItem(obj/item/I, amount_to_drop)
        if(!I) return
        if(I == slot_hand)
            src << output("Desequipe primeiro!", "map3d:mostrarNotificacao")
            return
        if(!(I in contents)) return

        if(amount_to_drop >= I.amount)
            I.loc = locate(1,1,1)
            I.real_x = src.real_x; I.real_z = src.real_z; I.real_y = 0
            src << output("Largou tudo de [I.name]", "map3d:mostrarNotificacao")
        else
            I.amount -= amount_to_drop
            var/obj/item/NewI = new I.type(locate(1,1,1))
            NewI.amount = amount_to_drop
            NewI.real_x = src.real_x; NewI.real_z = src.real_z; NewI.real_y = 0
            src << output("Largou [amount_to_drop] x [I.name]", "map3d:mostrarNotificacao")
        RequestInventoryUpdate()

    proc/PickUpNearestItem()
        var/obj/item/target = null
        var/min_dist = 2.0
        for(var/obj/item/I in world)
            if(I.loc == null || !isturf(I.loc)) continue
            var/dx = I.real_x - src.real_x; var/dz = I.real_z - src.real_z
            var/dist = sqrt(dx*dx + dz*dz)
            if(dist <= min_dist) { target = I; break }

        if(target)
            var/stacked = 0
            for(var/obj/item/invItem in contents)
                if(invItem.type == target.type && invItem.amount < invItem.max_stack)
                    var/space = invItem.max_stack - invItem.amount
                    if(target.amount <= space)
                        invItem.amount += target.amount
                        del(target)
                        stacked = 1
                        break
            if(!stacked)
                if(contents.len >= 12)
                    src << output("Mochila cheia (12/12)!", "map3d:mostrarNotificacao")
                    return
                target.loc = src
            src << output("Pegou item!", "map3d:mostrarNotificacao")
            RequestInventoryUpdate()
        else
            src << output("Nada por perto.", "map3d:mostrarNotificacao")

    proc/RequestInventoryUpdate()
        var/list/inv_data = list()
        for(var/obj/item/I in contents)
            if(!I) continue
            inv_data += list(list(
                "name" = I.name,
                "desc" = I.description ? I.description : "Sem descrição",
                "ref" = "\ref[I]",
                "amount" = I.amount,
                "id" = I.id_visual,
                "power" = I.power,
                "equipped" = 0
            ))
        src << output(json_encode(inv_data), "map3d:loadInventory")

    proc/RequestStatusUpdate()
        var/list/eq_data = list("hand" = null)
        if(slot_hand) eq_data["hand"] = list("id"=slot_hand.id_visual, "ref"="\ref[slot_hand]", "name"=slot_hand.name)

        var/list/stat_data = list(
            "nick" = src.name, "class" = char_class, "title" = char_title, "equip" = eq_data
        )
        src << output(json_encode(stat_data), "map3d:updateStatusMenu")

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
        while(experience >= req_experience && safety < 50) { LevelUp(); safety++ }

    proc/LevelUp()
        level++; experience -= req_experience
        req_experience = round(req_experience * 1.5)
        if(req_experience < 100) req_experience = 100
        stat_points += 3
        RecalculateStats()
        current_hp = max_hp; current_energy = max_energy
        src << output("<span class='log-hit' style='font-size:14px; color:#ffff00'>LEVEL UP! Nível [level]</span>", "map3d:addLog")
        SaveCharacter()

    proc/GetProficiencyReq(lvl) return 50 * (lvl * 1.2)

    proc/GainWeaponExp(type, amount)
        var/lvl = 1; var/exp = 0; var/req = 100
        if(type == "fist") { exp = prof_punch_exp; lvl = prof_punch_lvl; }
        else if(type == "kick") { exp = prof_kick_exp; lvl = prof_kick_lvl; }
        else if(type == "sword") { exp = prof_sword_exp; lvl = prof_sword_lvl; }
        else if(type == "gun") { exp = prof_gun_exp; lvl = prof_gun_lvl; }

        req = GetProficiencyReq(lvl)
        exp += amount
        if(exp >= req)
            lvl++; exp -= req
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
        current_energy -= amount * efficiency
        if(current_energy <= 0) { current_energy = 0; GoFaint(); }
        return 1

    proc/GoFaint()
        if(is_fainted) return
        is_fainted = 1; is_resting = 1; faint_end_time = world.time + 150
        src << output("<span class='log-hit' style='color:red; font-size:16px;'>VOCÊ DESMAIOU DE EXAUSTÃO!</span>", "map3d:addLog")
        spawn(150) if(src) WakeUp()

    proc/WakeUp()
        is_fainted = 0; is_resting = 0; faint_end_time = 0
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
                if(current_energy > 0) { current_energy -= run_cost; if(current_energy <= 0) { current_energy=0; GoFaint(); } }
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
            GiveStarterItems()
            src << output("Novo char!", "map3d:mostrarNotificacao")

        // === AQUI É A MÁGICA: ENVIA AS IMAGENS PARA O NAVEGADOR ===
        // Se você não enviar isso, o browser não vê o arquivo local.
        src << browse_rsc(file("definitions.js"), "definitions.js")
        src << browse_rsc(file("factory.js"), "factory.js")
        src << browse_rsc(file("engine.js"), "engine.js")
        src << browse_rsc(file("game.js"), "game.js")

        // Enviar Imagens PNG (Adicione todas as suas imagens aqui)
        // O BYOND só envia se o arquivo existir na pasta do projeto.
        // Use try/catch ou verifique fexists se quiser segurança, mas aqui vamos direto.
        if(fexists("weapon_sword_wood_img.png")) src << browse_rsc(file("weapon_sword_wood_img.png"), "weapon_sword_wood_img.png")
        if(fexists("weapon_sword_iron_img.png")) src << browse_rsc(file("weapon_sword_iron_img.png"), "weapon_sword_iron_img.png")
        if(fexists("weapon_sword_silver_img.png")) src << browse_rsc(file("weapon_sword_silver_img.png"), "weapon_sword_silver_img.png")
        if(fexists("weapon_gun_wood_img.png")) src << browse_rsc(file("weapon_gun_wood_img.png"), "weapon_gun_wood_img.png")
        if(fexists("weapon_gun_flintlock_img.png")) src << browse_rsc(file("weapon_gun_flintlock_img.png"), "weapon_gun_flintlock_img.png")
        if(fexists("weapon_gun_silver_img.png")) src << browse_rsc(file("weapon_gun_silver_img.png"), "weapon_gun_silver_img.png")

        char_loaded = 1; in_game = 1
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

        F["inventory"] << src.contents
        F["slot_hand"] << src.slot_hand

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

        if(F["inventory"]) F["inventory"] >> src.contents
        if(F["slot_hand"]) F["slot_hand"] >> src.slot_hand

        if(!src.req_experience || src.req_experience <= 0)
            src.req_experience = 100 * (1.5 ** (src.level - 1))
            if(src.req_experience < 100) src.req_experience = 100

        active_item_visual = ""
        if(slot_hand) active_item_visual = slot_hand.id_visual

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
                        "it" = M.active_item_visual,
                        "rest" = M.is_resting,
                        "ft" = M.is_fainted
                    )
                    pData["name"] = M.name
                    pData["skin"] = M.skin_color; pData["cloth"] = M.cloth_color
                    players_list[pid] = pData

            var/list/ground_items = list()
            for(var/obj/item/I in world)
                if(isturf(I.loc))
                    var/dx = I.real_x - src.real_x
                    var/dz = I.real_z - src.real_z
                    if(abs(dx) < 20 && abs(dz) < 20)
                        ground_items += list(list(
                            "ref" = "\ref[I]", "id" = I.id_visual,
                            "x" = I.real_x, "y" = I.real_y, "z" = I.real_z
                        ))

            var/faint_remaining = 0
            if(src.is_fainted && src.faint_end_time > world.time)
                faint_remaining = round((src.faint_end_time - world.time) / 10)

            var/list/packet = list(
                "my_id" = "\ref[src]",
                "me" = list(
                    "loaded" = src.char_loaded,
                    "lvl" = src.level, "exp" = src.experience, "req_exp" = src.req_experience, "pts" = src.stat_points,
                    "str" = src.strength, "vit" = src.vitality, "agi" = src.agility,  "wis" = src.wisdom,
                    "gold" = src.gold, "hp" = src.current_hp, "max_hp" = src.max_hp, "en" = src.current_energy, "max_en" = src.max_energy,
                    "pp" = prof_punch_lvl, "pp_x" = prof_punch_exp, "pp_r" = GetProficiencyReq(prof_punch_lvl),
                    "pk" = prof_kick_lvl,  "pk_x" = prof_kick_exp,  "pk_r" = GetProficiencyReq(prof_kick_lvl),
                    "ps" = prof_sword_lvl, "ps_x" = prof_sword_exp, "ps_r" = GetProficiencyReq(prof_sword_lvl),
                    "pg" = prof_gun_lvl,   "pg_x" = prof_gun_exp,   "pg_r" = GetProficiencyReq(prof_gun_lvl),
                    "mspd" = calc_move_speed, "jmp" = calc_jump_power,
                    "rest" = src.is_resting, "ft" = src.is_fainted, "rem" = faint_remaining
                ),
                "others" = players_list, "ground" = ground_items, "t" = world.time
            )
            src << output(json_encode(packet), "map3d:receberDadosMultiplayer")
            sleep(2)

    proc/AutoSaveLoop()
        while(src && in_game)
            SaveCharacter(); sleep(300)

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
                else slots_data["slot[i]"] = null
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

        if(action == "request_inventory" && in_game) RequestInventoryUpdate()
        if(action == "request_status" && in_game) RequestStatusUpdate()

        if(action == "equip_item" && in_game)
            var/ref_id = href_list["ref"]
            var/obj/item/I = locate(ref_id)
            if(I && (I in contents)) EquipItem(I)

        if(action == "unequip_item" && in_game)
            var/slot_name = href_list["slot"]
            UnequipItem(slot_name)

        if(action == "drop_item" && in_game)
            var/ref_id = href_list["ref"]
            var/qty = text2num(href_list["amount"])
            var/obj/item/I = locate(ref_id)
            if(I && (I in contents)) DropItem(I, qty)

        if(action == "pick_up" && in_game) PickUpNearestItem()

        if(action == "attack" && in_game)
            if(is_resting) return
            var/base_cost = max_energy * 0.03
            if(ConsumeEnergy(base_cost))
                is_attacking = 1; attack_type = href_list["type"]
                var/weapon_bonus = 0; var/prof_bonus = 0; var/prof_lvl = 1

                if(attack_type == "sword")
                    if(slot_hand && istype(slot_hand, /obj/item/weapon) && findtext(slot_hand.id_visual, "sword"))
                        weapon_bonus = slot_hand.power
                    else
                        src << output("Você precisa de uma espada equipada!", "map3d:mostrarNotificacao")
                        is_attacking = 0
                        return

                else if(attack_type == "gun")
                    if(slot_hand && istype(slot_hand, /obj/item/weapon) && findtext(slot_hand.id_visual, "gun"))
                        weapon_bonus = slot_hand.power
                    else
                        src << output("Você precisa de uma arma equipada!", "map3d:mostrarNotificacao")
                        is_attacking = 0
                        return

                if(attack_type == "fist")  { prof_lvl = prof_punch_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "kick")  { prof_lvl = prof_kick_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "sword") { prof_lvl = prof_sword_lvl; prof_bonus = prof_lvl * 2; }
                if(attack_type == "gun")   { prof_lvl = prof_gun_lvl;  prof_bonus = prof_lvl * 2; }

                var/target = href_list["target"]
                if(target == "dummy")
                    var/damage = round((strength * 0.5) + prof_bonus + weapon_bonus + rand(0, 2))
                    src << output("<span class='log-hit'>HIT! Dano: [damage]</span>", "map3d:addLog")
                    GainExperience(10); GainWeaponExp(attack_type, 5)
                else src << output("Errou...", "map3d:addLog")
                spawn(3) is_attacking = 0
            else return

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
    in_game = 1; char_loaded = 1; skin_color = "00FF00"; cloth_color = "0000FF"
    New()
        ..(); real_x = rand(-10, 10); real_z = rand(-10, 10); real_y = 0; spawn(5) AI_Loop()
    proc/AI_Loop()
        while(src)
            var/dir = pick(0, 90, 180, 270); real_rot = (dir * 3.14159 / 180)
            for(var/i=1 to 10)
                if(dir==0) real_z-=0.1; if(dir==180) real_z+=0.1; if(dir==90) real_x+=0.1; if(dir==270) real_x-=0.1
                sleep(1)
            sleep(rand(20, 50))

world/New()
    world.maxx = 1; world.maxy = 1; world.maxz = 1
    ..()
    new /mob/npc() { name = "Pirata de Teste" }

    spawn(10)
        var/obj/item/weapon/sword_wood/S = new(locate(1,1,1))
        S.real_x = 4; S.real_z = 5; S.loc = locate(1,1,1)

        var/obj/item/weapon/gun_flintlock/G = new(locate(1,1,1))
        G.real_x = 6; G.real_z = 5; G.loc = locate(1,1,1)

        var/list/types = list(/obj/item/weapon/sword_wood, /obj/item/weapon/sword_iron, /obj/item/weapon/sword_silver, /obj/item/weapon/gun_wood, /obj/item/weapon/gun_flintlock, /obj/item/weapon/gun_silver)
        for(var/i=1 to 10)
            var/t = pick(types); var/obj/item/I = new t(locate(1,1,1))
            I.real_x = rand(-10, 10); I.real_z = rand(-10, 10); I.loc = locate(1,1,1)