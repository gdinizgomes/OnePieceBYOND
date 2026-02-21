#define SAVE_DIR "saves/"

// Constantes de sincronização do heartbeat
#define VISION_RANGE  40.0  // Distância máxima de visibilidade entre entidades
#define SYNC_FREQ     20    // Ticks entre full syncs de visuais
#define VISUAL_LAG    5     // Janela de ticks para enviar visuais sujos

var/global/datum/game_controller/SSserver
var/global/list/GlobalSkillsData = list()

var/list/global_npcs = list()
var/list/global_players_list = list()
var/list/global_ground_items = list()

world/New()
	world.maxx = 1
	world.maxy = 1
	world.maxz = 1
	..()
	
	var/skills_file = file2text('shared/SkillDefinitions.json')
	if(skills_file)
		try
			GlobalSkillsData = json_decode(skills_file)
			world.log << "SkillDefinitions.json carregado com sucesso!"
		catch(var/exception/e)
			world.log << "ERRO de Formatação no JSON: [e.name]"
	else
		world.log << "ERRO CRITICO: shared/SkillDefinitions.json nao encontrado no pacote!"

	if(!SSserver)
		SSserver = new()
		spawn(5) SSserver.Heartbeat()

	new /mob/npc/dummy() 
	new /mob/npc/vendor()
	new /mob/npc/nurse()
	new /mob/npc/prop/log()

datum/game_controller
	var/tick_rate = 1
	var/running = 1
	var/server_tick = 0
	var/ground_dirty_tick = 0
	var/list/global_events = list()

	// Serializa visuais de equipamento de uma mob para o pacote de sync
	proc/SerializeEquipment(mob/M)
		var/list/eq = list("it"="","eq_h"="","eq_b"="","eq_l"="","eq_f"="")
		if(M.slot_hand) eq["it"]   = M.slot_hand.id_visual
		if(M.slot_head) eq["eq_h"] = M.slot_head.id_visual
		if(M.slot_body) eq["eq_b"] = M.slot_body.id_visual
		if(M.slot_legs) eq["eq_l"] = M.slot_legs.id_visual
		if(M.slot_feet) eq["eq_f"] = M.slot_feet.id_visual
		return eq

	proc/Heartbeat()
		set background = 1
		while(running)
			server_tick++
			
			try
				var/full_sync = (server_tick % SYNC_FREQ == 0)
				var/list/all_entity_data = list()
				var/list/active_clients = list()

				for(var/mob/M in global_players_list)
					if(M.client && M.in_game && M.char_loaded)
						active_clients += M

					if(M.in_game && M.char_loaded)
						var/pid = "\ref[M]"
						var/list/pData = list("x"=M.R2(M.real_x),"y"=M.R2(M.real_y),"z"=M.R2(M.real_z),"rot"=M.R2(M.real_rot),"a"=M.is_attacking,"at"=M.attack_type,"cs"=M.combo_step,"rn"=M.is_running,"rest"=M.is_resting,"ft"=M.is_fainted,"hp"=M.current_hp,"npc"=0)

						var/send_visuals = full_sync || (M.last_visual_update >= server_tick - VISUAL_LAG)
						if(send_visuals)
							var/list/eq = SerializeEquipment(M)
							pData["it"]=eq["it"]; pData["eq_h"]=eq["eq_h"]; pData["eq_b"]=eq["eq_b"]; pData["eq_l"]=eq["eq_l"]; pData["eq_f"]=eq["eq_f"]
							pData["name"]=M.name; pData["skin"]=M.skin_color; pData["cloth"]=M.cloth_color; pData["mhp"]=M.max_hp; pData["gen"]=M.char_gender
						all_entity_data[pid] = pData

				for(var/mob/npc/N in global_npcs)
					var/nid = "\ref[N]"
					var/list/nData = list("x"=N.R2(N.real_x),"y"=N.R2(N.real_y),"z"=N.R2(N.real_z),"rot"=N.R2(N.real_rot),"a"=0,"at"="","cs"=0,"rn"=0,"rest"=0,"ft"=0,"hp"=N.current_hp,"npc"=1)

					var/send_visuals = full_sync || (N.last_visual_update >= server_tick - VISUAL_LAG)
					if(send_visuals)
						nData["type"]=N.npc_type; nData["name"]=N.name; nData["skin"]=N.skin_color; nData["cloth"]=N.cloth_color; nData["mhp"]=N.max_hp; nData["gen"]=N.char_gender
						if(N.npc_type == "prop") nData["prop_id"] = N:prop_id
					all_entity_data[nid] = nData

				var/send_ground = full_sync || (ground_dirty_tick >= server_tick - VISUAL_LAG)
				var/list/ground_data = list()
				if(send_ground)
					for(var/obj/item/I in global_ground_items)
						if(isturf(I.loc)) ground_data += list(list("ref" = "\ref[I]", "id" = I.id_visual, "x" = I.real_x, "y" = I.real_y, "z" = I.real_z))
						else global_ground_items -= I

				for(var/mob/M in active_clients)
					var/faint_rem = 0
					if(M.is_fainted && M.faint_end_time > world.time) faint_rem = round((M.faint_end_time - world.time) / 10)

					var/list/my_visible_entities = list()
					for(var/id in all_entity_data)
						var/list/edata = all_entity_data[id]
						if(sqrt((edata["x"] - M.real_x)**2 + (edata["z"] - M.real_z)**2) <= VISION_RANGE) my_visible_entities[id] = edata
					
					var/list/my_visible_ground = list()
					if(send_ground)
						for(var/list/gdata in ground_data)
							if(sqrt((gdata["x"] - M.real_x)**2 + (gdata["z"] - M.real_z)**2) <= VISION_RANGE) my_visible_ground += list(gdata)

					var/list/my_global_json_list = list("others" = my_visible_entities, "t" = world.time)
					if(send_ground) my_global_json_list["ground"] = my_visible_ground
					
					if(global_events.len > 0)
						my_global_json_list["evts"] = list()
						for(var/list/evt in global_events)
							if(sqrt((evt["x"] - M.real_x)**2 + (evt["z"] - M.real_z)**2) <= VISION_RANGE) my_global_json_list["evts"] += list(evt)

					var/global_json = json_encode(my_global_json_list)

					var/list/my_eq = SerializeEquipment(M)
					var/list/my_stats = list(
						"my_id" = "\ref[M]",
						"me" = list("loaded" = 1, "x" = M.R2(M.real_x), "y" = M.R2(M.real_y), "z" = M.R2(M.real_z), "rot" = M.R2(M.real_rot), "nick" = M.name, "class" = M.char_class, "lvl" = M.level, "exp" = M.experience, "req_exp" = M.req_experience, "pts" = M.stat_points, "str" = M.strength, "vit" = M.vitality, "agi" = M.agility, "dex" = M.dexterity, "von" = M.willpower, "sor" = M.luck, "atk" = M.calc_atk, "ratk" = M.calc_ratk, "def" = M.calc_def, "hit" = M.calc_hit, "flee" = M.calc_flee, "crit" = M.calc_crit, "gold" = M.gold, "hp" = M.current_hp, "max_hp" = M.max_hp, "en" = M.current_energy, "max_en" = M.max_energy, "pp" = M.prof_punch_lvl, "pp_x" = M.prof_punch_exp, "pp_r" = M.GetProficiencyReq(M.prof_punch_lvl), "pk" = M.prof_kick_lvl,  "pk_x" = M.prof_kick_exp,  "pk_r" = M.GetProficiencyReq(M.prof_kick_lvl), "ps" = M.prof_sword_lvl, "ps_x" = M.prof_sword_exp, "ps_r" = M.GetProficiencyReq(M.prof_sword_lvl), "pg" = M.prof_gun_lvl,   "pg_x" = M.prof_gun_exp,   "pg_r" = M.GetProficiencyReq(M.prof_gun_lvl), "mspd" = M.calc_move_speed, "jmp" = M.calc_jump_power, "rest" = M.is_resting, "ft" = M.is_fainted, "rem" = faint_rem, "skin" = M.skin_color, "cloth" = M.cloth_color, "gen" = M.char_gender, "it" = my_eq["it"], "eq_h" = my_eq["eq_h"], "eq_b" = my_eq["eq_b"], "eq_l" = my_eq["eq_l"], "eq_f" = my_eq["eq_f"], "kills" = M.kills, "deaths" = M.deaths, "lethal" = M.lethality_mode),
						"evts" = M.pending_visuals
					)
					
					if(M.needs_skill_sync)
						my_stats["skills_data"] = GlobalSkillsData
						M.needs_skill_sync = 0
					
					if(M.pending_visuals.len > 0) M.pending_visuals = list()

					M << output(global_json, "map3d:receberDadosGlobal")
					M << output(json_encode(my_stats), "map3d:receberDadosPessoal")

				if(global_events.len > 0) global_events = list()
			
			catch(var/exception/e)
				world.log << "HEARTBEAT ERRO: [e.name] | [e.desc] | [e.file]:[e.line]"
			
			sleep(tick_rate)


mob
	var/current_slot = 0
	var/char_loaded = 0
	var/char_class = "Civil"
	var/char_title = "Nenhum"
	var/char_gender = "Male"
	var/level = 1
	var/experience = 0
	var/req_experience = 100
	var/stat_points = 0
	var/gold = 0
	var/kills = 0
	var/deaths = 0
	var/lethality_mode = 0
	var/needs_skill_sync = 1 
	var/list/unlocked_skills = list("fireball", "iceball")
	var/list/skill_cooldowns = list()
	var/list/active_skill_hits = list()
	var/strength = 5; var/agility = 5; var/vitality = 5; var/dexterity = 5; var/willpower = 5; var/luck = 5
	var/calc_atk = 0; var/calc_ratk = 0; var/calc_def = 0; var/calc_hit = 0; var/calc_flee = 0; var/calc_crit = 0; var/calc_poise = 0
	var/current_hp = 50; var/max_hp = 50; var/current_energy = 50; var/max_energy = 50
	var/prof_punch_lvl = 1; var/prof_punch_exp = 0; var/prof_kick_lvl = 1; var/prof_kick_exp = 0; var/prof_sword_lvl = 1; var/prof_sword_exp = 0; var/prof_gun_lvl = 1; var/prof_gun_exp = 0
	var/is_resting = 0; var/is_fainted = 0; var/faint_end_time = 0; var/is_running = 0
	var/calc_move_speed = 0.08; var/calc_jump_power = 0.20
	var/skin_color = "FFCCAA"; var/cloth_color = "FF0000"
	var/real_x = 0; var/real_y = 0; var/real_z = 0; var/real_rot = 0
	var/hit_radius = 0.5 
	var/in_game = 0; var/is_attacking = 0; var/attack_type = ""; var/combo_step = 0; var/active_item_visual = ""
	var/last_visual_update = 0
	var/list/hit_targets_this_swing = list()
	var/max_targets_per_swing = 1; var/attack_window = 0; var/projectile_window = 0
	var/obj/item/slot_hand = null; var/obj/item/slot_head = null; var/obj/item/slot_body = null; var/obj/item/slot_legs = null; var/obj/item/slot_feet = null 
	var/list/pending_visuals = list()

	proc/UpdateVisuals()
		if(SSserver) last_visual_update = SSserver.server_tick

	Login()
		..()
		in_game = 0
		needs_skill_sync = 1
		global_players_list += src
		ShowCharacterMenu()

	Logout()
		global_players_list -= src
		if(in_game)
			try
				SaveCharacter()
			catch(var/exception/e)
				world.log << "ERRO ao salvar [src.name] no logout: [e.name] | [e.file]:[e.line]"
			in_game = 0
		char_loaded = 0
		del(src)
		..()

	proc/ShowCharacterMenu()
		var/page = file2text('menu.html')
		page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
		src << browse(page, "window=map3d")

	proc/StartGame(slot_index)
		current_slot = slot_index
		if(LoadCharacter(slot_index))
			src << output("Carregado!", "map3d:mostrarNotificacao")
			GiveStarterItems() 
		else
			real_x = rand(-50, 50) / 100 
			real_y = 0
			real_z = rand(-50, 50) / 100
			level = 1; experience = 0; req_experience = 100; stat_points = 0; gold = 0
			kills = 0; deaths = 0; lethality_mode = 0
			strength = 5; vitality = 5; agility = 5; dexterity = 5; willpower = 5; luck = 5
			prof_punch_lvl=1; prof_kick_lvl=1; prof_sword_lvl=1; prof_gun_lvl=1
			RecalculateStats()
			current_hp = max_hp; current_energy = max_energy
			active_item_visual = ""
			GiveStarterItems()
			src << output("Novo char!", "map3d:mostrarNotificacao")

		var/page = file2text('game.html')
		page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")

		src << browse_rsc(file("definitions.js"), "definitions.js")
		src << browse_rsc(file("factory.js"), "factory.js")
		src << browse_rsc(file("engine.js"), "engine.js")
		
		src << browse_rsc(file("client/NetworkSystem.js"), "NetworkSystem.js")
		src << browse_rsc(file("client/UISystem.js"), "UISystem.js")
		src << browse_rsc(file("client/TargetSystem.js"), "TargetSystem.js")
		src << browse_rsc(file("client/CombatVisualSystem.js"), "CombatVisualSystem.js")
		src << browse_rsc(file("client/CombatSystem.js"), "CombatSystem.js")
		src << browse_rsc(file("client/PhysicsSystem.js"), "PhysicsSystem.js")
		src << browse_rsc(file("client/AnimationSystem.js"), "AnimationSystem.js")
		src << browse_rsc(file("client/EntityManager.js"), "EntityManager.js")
		src << browse_rsc(file("client/InputSystem.js"), "InputSystem.js")
		
		src << browse_rsc(file("game.js"), "game.js")

		if(fexists("weapon_sword_wood_img.png")) src << browse_rsc(file("weapon_sword_wood_img.png"), "weapon_sword_wood_img.png")
		if(fexists("weapon_sword_iron_img.png")) src << browse_rsc(file("weapon_sword_iron_img.png"), "weapon_sword_iron_img.png")
		if(fexists("weapon_sword_silver_img.png")) src << browse_rsc(file("weapon_sword_silver_img.png"), "weapon_sword_silver_img.png")
		if(fexists("weapon_gun_wood_img.png")) src << browse_rsc(file("weapon_gun_wood_img.png"), "weapon_gun_wood_img.png")
		if(fexists("weapon_gun_flintlock_img.png")) src << browse_rsc(file("weapon_gun_flintlock_img.png"), "weapon_gun_flintlock_img.png")
		if(fexists("weapon_gun_silver_img.png")) src << browse_rsc(file("weapon_gun_silver_img.png"), "weapon_gun_silver_img.png")
		if(fexists("armor_head_bandana_img.png")) src << browse_rsc(file("armor_head_bandana_img.png"), "armor_head_bandana_img.png")
		if(fexists("armor_head_bandana_black_img.png")) src << browse_rsc(file("armor_head_bandana_black_img.png"), "armor_head_bandana_black_img.png")
		if(fexists("armor_body_shirt_img.png")) src << browse_rsc(file("armor_body_shirt_img.png"), "armor_body_shirt_img.png")
		if(fexists("armor_legs_pants_img.png")) src << browse_rsc(file("armor_legs_pants_img.png"), "armor_legs_pants_img.png")
		if(fexists("armor_feet_boots_img.png")) src << browse_rsc(file("armor_feet_boots_img.png"), "armor_feet_boots_img.png")

		char_loaded = 1; in_game = 1; is_resting = 0; is_fainted = 0; is_running = 0
		UpdateVisuals()
		
		src << browse(page, "window=map3d") 
		
		spawn(600) AutoSaveLoop()
		spawn(10) RestLoop()

	proc/R2(n) return round(n * 100) / 100