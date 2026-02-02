#define SAVE_DIR "saves/"

mob
    // Dados de Sessão (Temporários)
    var/current_slot = 0

    // Atributos RPG
    var/level = 1
    var/experience = 0
    var/strength = 5; var/vitality = 5; var/agility = 5; var/wisdom = 5
    var/current_hp = 50; var/max_hp = 50; var/gold = 0

    // Customização Visual (Hex Codes)
    var/skin_color = "FFCCAA"
    var/cloth_color = "FF0000"

    // Sistema 3D
    var/real_x = 0; var/real_z = 0; var/real_rot = 0

    // Controle de estado
    var/in_game = 0

    Login()
        ..()
        in_game = 0
        ShowCharacterMenu()

    proc/ShowCharacterMenu()
        // 1. Ler os 3 slots de save
        var/list/slots_data = list()

        for(var/i=1 to 3)
            if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav"))
                var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[i].sav")
                var/n; var/l; var/g
                F["name"] >> n
                F["level"] >> l
                F["gold"] >> g
                slots_data["slot[i]"] = list("name"=n, "lvl"=l, "gold"=g)
            else
                slots_data["slot[i]"] = null

        // 2. Carregar o HTML do Menu
        var/page = file2text('menu.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

        // 3. Enviar os dados dos slots para o JS desenhar
        sleep(2) // Pequeno delay para o navegador carregar
        src << output(json_encode(slots_data), "map3d:loadSlots")

    proc/StartGame(slot_index)
        current_slot = slot_index
        LoadCharacter(slot_index)

        in_game = 1
        world << "[src] entrou no mundo (Slot [slot_index])."

        // Carrega o HTML do Jogo 3D
        var/page = file2text('game.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")

        spawn(10) UpdateLoop()
        spawn(600) AutoSaveLoop()

    proc/SaveCharacter()
        if(!current_slot) return
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
        F["name"] << src.name
        F["level"] << src.level
        F["gold"] << src.gold
        F["hp"] << src.current_hp
        F["max_hp"] << src.max_hp
        F["pos_x"] << src.real_x
        F["pos_z"] << src.real_z
        F["skin"] << src.skin_color
        F["cloth"] << src.cloth_color

    proc/LoadCharacter(slot)
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
        F["name"] >> src.name
        F["level"] >> src.level
        F["gold"] >> src.gold
        F["hp"] >> src.current_hp
        F["max_hp"] >> src.max_hp
        F["pos_x"] >> src.real_x
        F["pos_z"] >> src.real_z
        F["skin"] >> src.skin_color
        F["cloth"] >> src.cloth_color

    proc/UpdateLoop()
        while(src && in_game)
            var/list/packet = list(
                "data" = list(
                    "x" = src.real_x, "z" = src.real_z, "rot" = src.real_rot,
                    "hp" = src.current_hp, "max_hp" = src.max_hp,
                    "lvl" = src.level, "gold" = src.gold, "name" = src.name,
                    "skin" = src.skin_color, "cloth" = src.cloth_color // Envia cores pro JS
                )
            )
            src << output(json_encode(packet), "map3d:receberDados")
            sleep(1)

    proc/AutoSaveLoop()
        while(src && in_game)
            SaveCharacter()
            sleep(300)

    Topic(href, href_list[])
        ..()
        var/action = href_list["action"]

        // --- MENU: DELETAR PERSONAGEM ---
        if(action == "delete_char")
            var/slot = text2num(href_list["slot"])
            var/path = "[SAVE_DIR][src.ckey]_slot[slot].sav"

            if(fexists(path))
                fdel(path) // Deleta o arquivo
                src << output("Personagem deletado.", "map3d:mostrarNotificacao") // Feedback (opcional no menu)
                ShowCharacterMenu() // Recarrega o menu para atualizar os slots vazios

        // --- MENU: SELEÇÃO/CRIAÇÃO ---
        if(action == "select_char")
            StartGame(text2num(href_list["slot"]))

        if(action == "create_char")
            var/slot = text2num(href_list["slot"])
            src.name = href_list["name"]
            src.skin_color = href_list["skin"]
            src.cloth_color = href_list["cloth"]

            src.level = 1; src.gold = 0; src.real_x = 0; src.real_z = 0

            current_slot = slot
            SaveCharacter()
            StartGame(slot)

        // --- GAME: SAVE MANUAL (TECLA P) ---
        if(action == "force_save" && in_game)
            SaveCharacter()
            // A proc SaveCharacter já manda a notificação "Jogo Salvo!", não precisa mandar de novo aqui.

        // --- GAME: ATUALIZAÇÃO E AÇÕES ---
        if(action == "update_pos" && in_game)
            real_x = text2num(href_list["x"])
            real_z = text2num(href_list["z"])
            real_rot = text2num(href_list["rot"])

        if(action == "attack" && in_game)
            src << output("Ataque!", "map3d:mostrarNotificacao")