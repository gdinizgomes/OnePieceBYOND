// server/Persistence.dm
// Módulo de Gerenciamento de Dados, Salvamento e Carregamento (Save/Load)

#define SAVE_VERSION 2

proc/SaveWorldState()
	var/file_path = "[SAVE_DIR]world_state.sav"
	
	if(fexists(file_path)) 
		fdel(file_path)
		
	var/savefile/F = new(file_path)
	var/list/items_data = list()
	for(var/obj/item/I in global_ground_items)
		if(!I) continue
		var/list/idata = list(
			"type" = I.type,
			"x" = I.real_x,
			"y" = I.real_y,
			"z" = I.real_z,
			"amount" = I.amount
		)
		items_data[++items_data.len] = idata
		
	F["ground_items"] << items_data
	
	F = null 

proc/LoadWorldState()
	if(!fexists("[SAVE_DIR]world_state.sav")) return
	var/savefile/F = new("[SAVE_DIR]world_state.sav")
	var/list/items_data
	F["ground_items"] >> items_data
	if(!items_data || !istype(items_data, /list)) return

	if(!global.ground_holder) global.ground_holder = new /obj()

	for(var/list/idata in items_data)
		var/typepath = idata["type"]
		if(ispath(typepath, /obj/item))
			var/obj/item/I = new typepath()
			I.loc = global.ground_holder
			I.real_x = idata["x"]
			I.real_y = idata["y"]
			I.real_z = idata["z"]
			if(idata["amount"]) I.amount = idata["amount"]
			global_ground_items |= I
			
			if(I.despawn_time > 0)
				spawn(I.despawn_time)
					if(I && (I in global_ground_items))
						global_ground_items -= I
						if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
						SaveWorldState() 
						del(I)


mob
	var/received_starters = 0 

	proc/AutoSaveLoop()
		while(src && in_game)
			SaveCharacter()
			sleep(300)

	proc/SaveCharacter()
		if(!current_slot || !in_game) return
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
		F["save_version"] << SAVE_VERSION  
		F["name"] << src.name
		F["level"] << src.level
		F["exp"] << src.experience
		F["req_exp"] << src.req_experience
		F["stat_pts"] << src.stat_points
		F["gold"] << src.gold
		F["hp"] << src.current_hp
		F["en"] << src.current_energy
		F["str"] << src.strength
		F["vit"] << src.vitality
		F["agi"] << src.agility
		F["dex"] << src.dexterity
		F["von"] << src.willpower
		F["sor"] << src.luck
		F["p_punch"] << prof_punch_lvl
		F["exp_punch"] << prof_punch_exp
		F["p_kick"] << prof_kick_lvl
		F["exp_kick"] << prof_kick_exp
		F["p_sword"] << prof_sword_lvl
		F["exp_sword"] << prof_sword_exp
		F["p_gun"] << prof_gun_lvl
		F["exp_gun"] << prof_gun_exp
		F["pos_x"] << src.real_x
		F["pos_y"] << src.real_y
		F["pos_z"] << src.real_z
		F["skin"] << src.skin_color
		F["cloth"] << src.cloth_color
		F["inventory"] << src.contents
		F["slot_hand"] << src.slot_hand
		F["slot_head"] << src.slot_head
		F["slot_body"] << src.slot_body
		F["slot_legs"] << src.slot_legs
		F["slot_feet"] << src.slot_feet
		F["gender"] << src.char_gender
		F["kills"] << src.kills
		F["deaths"] << src.deaths
		F["starters"] << src.received_starters 
		
		F["skill_levels"] << src.skill_levels
		F["skill_exps"] << src.skill_exps
		F["hotbar"] << src.hotbar
		
		src << output("Salvo!", "map3d:mostrarNotificacao")

	proc/LoadCharacter(slot)
		if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")

		// CORREÇÃO CRÍTICA ARQUITETURAL: Extração cega à prova de falsos-negativos
		F["name"] >> src.name; if(!src.name) src.name = "Sem nome"
		F["level"] >> src.level; if(isnull(src.level)) src.level = 1
		F["exp"] >> src.experience; if(isnull(src.experience)) src.experience = 0
		F["stat_pts"] >> src.stat_points; if(isnull(src.stat_points)) src.stat_points = 0
		F["gold"] >> src.gold; if(isnull(src.gold)) src.gold = 0
		F["hp"] >> src.current_hp; if(isnull(src.current_hp)) src.current_hp = 50
		F["en"] >> src.current_energy; if(isnull(src.current_energy)) src.current_energy = 50
		F["str"] >> src.strength; if(isnull(src.strength)) src.strength = 5
		F["vit"] >> src.vitality; if(isnull(src.vitality)) src.vitality = 5
		F["agi"] >> src.agility; if(isnull(src.agility)) src.agility = 5
		F["dex"] >> src.dexterity; if(isnull(src.dexterity)) src.dexterity = 5
		F["von"] >> src.willpower; if(isnull(src.willpower)) src.willpower = 5
		F["sor"] >> src.luck; if(isnull(src.luck)) src.luck = 5
		
		F["p_punch"] >> prof_punch_lvl; if(isnull(prof_punch_lvl)) prof_punch_lvl = 1
		F["exp_punch"] >> prof_punch_exp; if(isnull(prof_punch_exp)) prof_punch_exp = 0
		F["p_kick"] >> prof_kick_lvl; if(isnull(prof_kick_lvl)) prof_kick_lvl = 1
		F["exp_kick"] >> prof_kick_exp; if(isnull(prof_kick_exp)) prof_kick_exp = 0
		F["p_sword"] >> prof_sword_lvl; if(isnull(prof_sword_lvl)) prof_sword_lvl = 1
		F["exp_sword"] >> prof_sword_exp; if(isnull(prof_sword_exp)) prof_sword_exp = 0
		F["p_gun"] >> prof_gun_lvl; if(isnull(prof_gun_lvl)) prof_gun_lvl = 1
		F["exp_gun"] >> prof_gun_exp; if(isnull(prof_gun_exp)) prof_gun_exp = 0
		
		F["pos_x"] >> src.real_x; if(isnull(src.real_x)) src.real_x = 0
		F["pos_y"] >> src.real_y; if(isnull(src.real_y)) src.real_y = 0
		F["pos_z"] >> src.real_z; if(isnull(src.real_z)) src.real_z = 0
		F["skin"] >> src.skin_color; if(!src.skin_color) src.skin_color = "FFD1A3"
		F["cloth"] >> src.cloth_color; if(!src.cloth_color) src.cloth_color = "3366CC"
		F["inventory"] >> src.contents
		F["slot_hand"] >> src.slot_hand
		F["slot_head"] >> src.slot_head
		F["slot_body"] >> src.slot_body
		F["slot_legs"] >> src.slot_legs
		F["slot_feet"] >> src.slot_feet
		F["gender"] >> src.char_gender; if(!src.char_gender) src.char_gender = "Male"
		F["kills"] >> src.kills; if(isnull(src.kills)) src.kills = 0
		F["deaths"] >> src.deaths; if(isnull(src.deaths)) src.deaths = 0
		F["starters"] >> src.received_starters; if(isnull(src.received_starters)) src.received_starters = 0

		F["skill_levels"] >> src.skill_levels; if(!istype(src.skill_levels, /list)) src.skill_levels = list()
		F["skill_exps"] >> src.skill_exps; if(!istype(src.skill_exps, /list)) src.skill_exps = list()
		F["hotbar"] >> src.hotbar; if(!istype(src.hotbar, /list)) src.hotbar = list("1"=null, "2"=null, "3"=null, "4"=null, "5"=null, "6"=null, "7"=null, "8"=null, "9"=null)

		if(src.level < 1) src.level = 1
		if(src.experience < 0) src.experience = 0
		if(src.gold < 0) src.gold = 0
		if(!src.name || src.name == "") src.name = "Sem nome"

		src.req_experience = round(100 * (log(src.level + 1) / log(2)) * src.level)
		if(src.req_experience < 100) src.req_experience = 100

		active_item_visual = ""
		if(slot_hand) active_item_visual = slot_hand.id_visual
		RecalculateStats()
		lethality_mode = 0
		return 1