#define SAVE_DIR "saves/"
#define CHUNK_SIZE 10
#define CHUNK_RANGE 1
#define SKILL_EVENT_TTL 10

var/global/list/active_players = list()
var/global/list/chunk_members = list()
var/global/list/skill_events = list()
var/global/datum/ai_manager/ai_manager
var/global/list/skill_registry = list()

proc/GetChunkKey(x, z)
    var/cx = floor(x / CHUNK_SIZE)
    var/cz = floor(z / CHUNK_SIZE)
    return "[cx]:[cz]"

proc/GetNeighborChunkKeys(x, z)
    var/list/keys = list()
    var/cx = floor(x / CHUNK_SIZE)
    var/cz = floor(z / CHUNK_SIZE)
    for(var/dx = -CHUNK_RANGE to CHUNK_RANGE)
        for(var/dz = -CHUNK_RANGE to CHUNK_RANGE)
            keys += "[cx + dx]:[cz + dz]"
    return keys

proc/UpdateChunk(mob/M)
    if(!M) return
    var/new_key = GetChunkKey(M.real_x, M.real_z)
    if(M.chunk_key == new_key) return
    if(M.chunk_key && chunk_members[M.chunk_key])
        chunk_members[M.chunk_key] -= M
        if(!chunk_members[M.chunk_key].len) chunk_members -= M.chunk_key
    M.chunk_key = new_key
    if(!chunk_members[new_key]) chunk_members[new_key] = list()
    chunk_members[new_key] += M

proc/RemoveFromChunk(mob/M)
    if(!M) return
    if(M.chunk_key && chunk_members[M.chunk_key])
        chunk_members[M.chunk_key] -= M
        if(!chunk_members[M.chunk_key].len) chunk_members -= M.chunk_key
    M.chunk_key = null

proc/RegisterSkill(datum/skill/S)
    if(!S || !S.id) return
    skill_registry[S.id] = S

proc/GetSkillById(skill_id)
    return skill_registry[skill_id]

proc/QueueSkillEvent(datum/skill_event/E)
    if(!E) return
    skill_events += E

proc/GlobalUpdateLoop()
    while(TRUE)
        var/list/current_players = active_players.Copy()
        var/list/active_events = list()
        for(var/datum/skill_event/E in skill_events)
            if(E.expires_at >= world.time) active_events += E
        skill_events = active_events

        for(var/mob/P in current_players)
            if(!P || !P.client || !P.in_game || !P.char_loaded) continue
            var/list/players_list = list()
            var/list/near_chunks = GetNeighborChunkKeys(P.real_x, P.real_z)
            for(var/key in near_chunks)
                var/list/members = chunk_members[key]
                if(!members) continue
                for(var/mob/M in members)
                    if(!M.in_game || !M.char_loaded) continue
                    var/pid = "\ref[M]"
                    players_list[pid] = list(
                        "name" = M.name, "x" = M.real_x, "z" = M.real_z,
                        "rot" = M.real_rot, "skin" = M.skin_color, "cloth" = M.cloth_color,
                        "hp" = M.current_hp, "max_hp" = M.max_hp,
                        "attacking" = M.is_attacking,
                        "fruit" = M.fruit_type
                    )

            var/list/event_payload = list()
            for(var/datum/skill_event/E in active_events)
                if(E.chunk_key in near_chunks) event_payload += E.ToPayload()

            var/list/packet = list(
                "my_id" = "\ref[P]",
                "me" = list("loaded" = P.char_loaded, "lvl" = P.level, "gold" = P.gold, "hp" = P.current_hp, "max_hp" = P.max_hp),
                "others" = players_list,
                "events" = event_payload,
                "t" = world.time
            )
            P << output(json_encode(packet), "map3d:receberDadosMultiplayer")
        sleep(1)

datum/skill
    var/id
    var/name
    var/shape_id
    var/area = 1
    var/lifetime = 8
    var/texture_url
    var/scale = 1
    var/color = "#FFFFFF"

datum/skill_event
    var/skill_id
    var/shape_id
    var/texture_url
    var/scale
    var/color
    var/x
    var/z
    var/rot
    var/chunk_key
    var/expires_at
    var/owner_id

    proc/ToPayload()
        return list(
            "skill_id" = skill_id,
            "shape_id" = shape_id,
            "texture" = texture_url,
            "scale" = scale,
            "color" = color,
            "x" = x,
            "z" = z,
            "rot" = rot,
            "owner" = owner_id
        )

datum/ai_manager
    var/list/npcs = list()

    proc/Register(mob/npc/N)
        if(!N) return
        npcs |= N

    proc/Loop()
        while(TRUE)
            for(var/mob/npc/N in npcs)
                if(!N || !N.in_game) continue
                N.ProcessAI()
            sleep(1)

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
    var/real_z = 0; var/real_rot = 0
    var/in_game = 0
    var/is_attacking = 0 // MUDANÇA PONTUAL: Estado de ataque para rede
    var/fruit_type = "none"
    var/chunk_key = null

    Login()
        ..()
        in_game = 0
        ShowCharacterMenu()

    Logout()
        if(in_game)
            SaveCharacter()
            in_game = 0     
            char_loaded = 0 
            active_players -= src
            RemoveFromChunk(src)
        del(src)            
        ..()

    proc/ShowCharacterMenu()
        var/list/slots_data = list()
        for(var/i=1 to 3)
            var/list/db_slot = null
            if(db_manager && db_manager.connected)
                db_slot = db_manager.LoadSlotSummary(src.ckey, i)
            if(db_slot)
                slots_data["slot[i]"] = db_slot
            else if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav"))
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
            real_x = 0; real_z = 0
            src << output("Novo personagem!", "map3d:mostrarNotificacao")

        char_loaded = 1 
        in_game = 1
        active_players |= src
        UpdateChunk(src)
        var/page = file2text('game.html')
        page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
        src << browse(page, "window=map3d")
        spawn(600) AutoSaveLoop()

    proc/SaveCharacter()
        if(!current_slot || !in_game) return
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
        F["name"] << src.name;
        F["level"] << src.level; F["gold"] << src.gold
        F["hp"] << src.current_hp;
        F["max_hp"] << src.max_hp
        F["pos_x"] << src.real_x;
        F["pos_z"] << src.real_z
        F["skin"] << src.skin_color;
        F["cloth"] << src.cloth_color
        F["fruit"] << src.fruit_type
        src << output("Jogo Salvo!", "map3d:mostrarNotificacao")

    proc/LoadCharacter(slot)
        if(db_manager && db_manager.connected)
            if(db_manager.LoadCharacter(src, slot)) return 1
        if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
        var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
        F["name"] >> src.name;
        F["level"] >> src.level; F["gold"] >> src.gold
        F["hp"] >> src.current_hp;
        F["max_hp"] >> src.max_hp
        F["pos_x"] >> src.real_x;
        F["pos_z"] >> src.real_z
        F["skin"] >> src.skin_color;
        F["cloth"] >> src.cloth_color
        F["fruit"] >> src.fruit_type
        return 1

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
            src.name = href_list["name"]; src.skin_color = href_list["skin"]; src.cloth_color = href_list["cloth"]
            src.level = 1; src.gold = 0; src.real_x = 0; src.real_z = 0
            current_slot = slot; SaveCharacter(); StartGame(slot)
        if(action == "force_save" && in_game) SaveCharacter()
        if(action == "update_pos" && in_game)
            real_x = text2num(href_list["x"]); real_z = text2num(href_list["z"]); real_rot = text2num(href_list["rot"])
            UpdateChunk(src)
        
        if(action == "attack" && in_game) 
            is_attacking = 1 // Ativa estado de ataque
            src << output("Ataque!", "map3d:mostrarNotificacao")
            spawn(3) is_attacking = 0 // Reseta após 300ms (tempo da animação JS)
        if(action == "use_skill" && in_game)
            var/skill_id = href_list["skill"]
            var/datum/skill/S = GetSkillById(skill_id)
            if(S)
                var/datum/skill_event/E = new
                E.skill_id = S.id
                E.shape_id = S.shape_id
                E.texture_url = S.texture_url
                E.scale = S.scale
                E.color = S.color
                E.x = src.real_x
                E.z = src.real_z
                E.rot = src.real_rot
                E.owner_id = "\ref[src]"
                E.chunk_key = GetChunkKey(src.real_x, src.real_z)
                E.expires_at = world.time + S.lifetime
                QueueSkillEvent(E)
        if(action == "consume_fruit" && in_game)
            var/fruit_id = href_list["fruit"]
            if(fruit_id && fruit_id != "")
                fruit_type = fruit_id
                if(fruit_id == "fire")
                    skin_color = "FFCCAA"
                    cloth_color = "FF5500"
                if(fruit_id == "ice")
                    skin_color = "CCEEFF"
                    cloth_color = "66CCFF"
                SaveCharacter()

mob/npc
    in_game = 1
    char_loaded = 1
    skin_color = "00FF00" 
    cloth_color = "0000FF"
    var/ai_dir = 0
    var/ai_steps = 0

    New()
        ..()
        real_x = rand(-10, 10); real_z = rand(-10, 10)
        UpdateChunk(src)
        if(ai_manager) ai_manager.Register(src)

    proc/ProcessAI()
        if(ai_steps <= 0)
            ai_dir = pick(0, 90, 180, 270)
            ai_steps = rand(8, 16)
        real_rot = (ai_dir * 3.14159 / 180)
        if(ai_dir == 0) real_z -= 0.1
        if(ai_dir == 180) real_z += 0.1
        if(ai_dir == 90) real_x += 0.1
        if(ai_dir == 270) real_x -= 0.1
        ai_steps--
        UpdateChunk(src)

world/New()
    ..()
    ai_manager = new
    spawn(1) ai_manager.Loop()
    spawn(1) GlobalUpdateLoop()
    RegisterSkill(new /datum/skill { id = "gomu_pistol"; name = "Gomu Gomu no Pistol"; shape_id = "ray_long"; lifetime = 6; texture_url = "https://i.imgur.com/IR9QwRX.png"; scale = 1.2; color = "#FFAA00" })
    RegisterSkill(new /datum/skill { id = "fire_burst"; name = "Hiken"; shape_id = "explosion"; lifetime = 8; texture_url = "https://i.imgur.com/5nZVQaw.png"; scale = 1.5; color = "#FF5500" })
    new /mob/npc() { name = "Pirata de Teste" }
