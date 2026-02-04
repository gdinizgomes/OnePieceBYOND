#define SAVE_DIR "saves/"

mob
    var/current_slot = 0
    var/char_loaded = 0 

    var/level = 1;
    var/experience = 0
    var/strength = 5; var/vitality = 5; var/agility = 5;
    var/wisdom = 5
    var/current_hp = 50; var/max_hp = 50;
    var/gold = 0

    var/skin_color = "FFCCAA"; var/cloth_color = "FF0000"
    var/real_x = 0;
    var/real_y = 0; // Altura (Eixo Y)
    var/real_z = 0;
    var/real_rot = 0
    var/in_game = 0
    var/is_attacking = 0

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

    proc/ShowCharacterMenu()
        var/list/slots_data = list()
        for(var/i=1 to 3)
            if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav"))
                var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[i].sav")
                var/n; var/l; var/g
                F["name"] >> n;
                F["level"] >> l; F["gold"] >> g
                slots_data["slot[i]"] = list("name"=n, "lvl"=l, "gold"=g)
            else
                slots_data["slot[i]"] = null

        var/page = file2text('menu.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")
        sleep(2)
        src << output(json_encode(slots_data), "map3d:loadSlots")

    proc/StartGame(slot_index)
        current_slot = slot_index
        if(LoadCharacter(slot_index))
            src << output("Personagem carregado!", "map3d:mostrarNotificacao")
        else
            real_x = 0; real_y = 0; real_z = 0
            src << output("Novo personagem!", "map3d:mostrarNotificacao")

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
        F["name"] << src.name;
        F["level"] << src.level; F["gold"] << src.gold
        F["hp"] << src.current_hp;
        F["max_hp"] << src.max_hp
        F["pos_x"] << src.real_x;
        F["pos_y"] << src.real_y;
        F["pos_z"] << src.real_z
        F["skin"] << src.skin_color;
        F["cloth"] << src.cloth_color
        src << output("Jogo Salvo!", "map3d:mostrarNotificacao")

    proc/LoadCharacter(slot)
        if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
        F["name"] >> src.name;
        F["level"] >> src.level; F["gold"] >> src.gold
        F["hp"] >> src.current_hp;
        F["max_hp"] >> src.max_hp
        F["pos_x"] >> src.real_x;
        if(F["pos_y"]) F["pos_y"] >> src.real_y;
        F["pos_z"] >> src.real_z
        F["skin"] >> src.skin_color;
        F["cloth"] >> src.cloth_color
        return 1

    proc/UpdateLoop()
        var/sync_step = 0 // Contador para alternar entre pacote completo e leve
        while(src && in_game)
            var/list/players_list = list()
            
            // Lógica de Otimização:
            // A cada 5 ticks (0.5s), mandamos dados completos (Skin, Nome, HP).
            // Nos outros ticks, mandamos apenas Posição e Ação (Muito mais leve).
            var/full_sync = (sync_step >= 4)
            if(full_sync) sync_step = 0
            else sync_step++

            for(var/mob/M in world)
                if(M.in_game && M.char_loaded) 
                    var/pid = "\ref[M]"
                    
                    // Dados Leves (Sempre envia)
                    var/list/pData = list(
                        "x" = M.real_x, 
                        "y" = M.real_y,
                        "z" = M.real_z, 
                        "rot" = M.real_rot,
                        "a" = M.is_attacking // Simplificado para 'a' para economizar bytes
                    )

                    // Dados Pesados (Apenas no Full Sync)
                    if(full_sync)
                        pData["name"] = M.name
                        pData["skin"] = M.skin_color
                        pData["cloth"] = M.cloth_color
                        pData["hp"] = M.current_hp
                        pData["max_hp"] = M.max_hp

                    players_list[pid] = pData

            var/list/packet = list(
                "my_id" = "\ref[src]",
                "me" = list("loaded" = src.char_loaded, "lvl" = src.level, "gold" = src.gold, "hp" = src.current_hp, "max_hp" = src.max_hp),
                "others" = players_list,
                "t" = world.time
            )
            src << output(json_encode(packet), "map3d:receberDadosMultiplayer")
            sleep(1) 

    proc/AutoSaveLoop()
        while(src && in_game)
            SaveCharacter()
            sleep(300)

    Topic(href, href_list[])
        ..()
        var/action = href_list["action"]
        if(action == "delete_char")
            var/slot = text2num(href_list["slot"])
            var/path = "[SAVE_DIR][src.ckey]_slot[slot].sav"
            if(fexists(path)) fdel(path)
            ShowCharacterMenu()
        if(action == "select_char") StartGame(text2num(href_list["slot"]))
        if(action == "create_char")
            var/slot = text2num(href_list["slot"])
            src.name = href_list["name"];
            src.skin_color = href_list["skin"];
            src.cloth_color = href_list["cloth"]
            src.level = 1;
            src.gold = 0;
            src.real_x = 0; src.real_y = 0; src.real_z = 0
            current_slot = slot;
            SaveCharacter(); StartGame(slot)
        if(action == "force_save" && in_game) SaveCharacter()
        if(action == "update_pos" && in_game)
            real_x = text2num(href_list["x"]);
            real_y = text2num(href_list["y"]);
            real_z = text2num(href_list["z"]);
            real_rot = text2num(href_list["rot"])
        
        if(action == "attack" && in_game) 
            is_attacking = 1 
            src << output("Ataque!", "map3d:mostrarNotificacao")
            spawn(3) is_attacking = 0

mob/npc
    in_game = 1
    char_loaded = 1
    skin_color = "00FF00" 
    cloth_color = "0000FF"

    New()
        ..()
        real_x = rand(-10, 10);
        real_z = rand(-10, 10)
        real_y = 0
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