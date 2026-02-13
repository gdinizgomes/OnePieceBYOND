#define SAVE_DIR "saves/"

// --- CONTROLADOR GLOBAL DO SERVIDOR ---
var/global/datum/game_controller/SSserver

// Inicialização Global
world/New()
	world.maxx = 1
	world.maxy = 1
	world.maxz = 1
	..()
	if(!SSserver)
		SSserver = new()
		spawn(5) SSserver.Heartbeat()

	new /mob/npc/dummy() 
	new /mob/npc/vendor()
	new /mob/npc/nurse()
	new /mob/npc/prop/log()

// --- CLASSE DO CONTROLADOR ---
datum/game_controller
	var/tick_rate = 1 // 10 ticks por segundo
	var/running = 1

	proc/Heartbeat()
		set background = 1
		while(running)
			// 1. Coletar dados de TODOS os jogadores e NPCs
			var/list/all_player_data = list()
			var/list/active_clients = list()
			
			for(var/mob/M in global_players_list)
				if(M.client && M.in_game && M.char_loaded)
					active_clients += M
					var/pid = "\ref[M]"
					
					var/e_hand = ""; var/e_head = ""; var/e_body = ""; var/e_legs = ""; var/e_feet = ""
					if(M.slot_hand) e_hand = M.slot_hand.id_visual
					if(M.slot_head) e_head = M.slot_head.id_visual
					if(M.slot_body) e_body = M.slot_body.id_visual
					if(M.slot_legs) e_legs = M.slot_legs.id_visual
					if(M.slot_feet) e_feet = M.slot_feet.id_visual

					all_player_data[pid] = list(
						"x" = M.R2(M.real_x), "y" = M.R2(M.real_y), "z" = M.R2(M.real_z), "rot" = M.R2(M.real_rot),
						"a" = M.is_attacking, "at" = M.attack_type, "cs" = M.combo_step,
						"rn" = M.is_running,
						"it" = e_hand,
						"eq_h" = e_head, "eq_b" = e_body, "eq_l" = e_legs, "eq_f" = e_feet,
						"rest" = M.is_resting, "ft" = M.is_fainted,
						"name" = M.name, "skin" = M.skin_color, "cloth" = M.cloth_color,
						"npc" = 0,
						"hp" = M.current_hp, "mhp" = M.max_hp,
						"gen" = M.char_gender
					)

			for(var/mob/npc/N in global_npcs)
				var/nid = "\ref[N]"
				all_player_data[nid] = list(
					"x" = N.R2(N.real_x), "y" = N.R2(N.real_y), "z" = N.R2(N.real_z), "rot" = N.R2(N.real_rot),
					"a" = 0, "at" = "", "cs" = 0, "it" = "", "rest" = 0, "ft" = 0,
					"rn" = 0,
					"name" = N.name, "skin" = N.skin_color, "cloth" = N.cloth_color,
					"npc" = 1, "type" = N.npc_type,
					"hp" = N.current_hp, "mhp" = N.max_hp,
					"gen" = N.char_gender
				)
			
			// 2. Coletar Itens do chão
			var/list/ground_data = list()
			for(var/obj/item/I in global_ground_items)
				if(isturf(I.loc))
					ground_data += list(list("ref" = "\ref[I]", "id" = I.id_visual, "x" = I.real_x, "y" = I.real_y, "z" = I.real_z))
				else
					global_ground_items -= I

			// JSON Global
			var/global_json = json_encode(list("others" = all_player_data, "ground" = ground_data, "t" = world.time))

			// 3. Enviar Pacotes Individuais
			for(var/mob/M in active_clients)
				var/faint_rem = 0
				if(M.is_fainted && M.faint_end_time > world.time) faint_rem = round((M.faint_end_time - world.time) / 10)

				var/my_hand = ""; var/my_head = ""; var/my_body = ""; var/my_legs = ""; var/my_feet = ""
				if(M.slot_hand) my_hand = M.slot_hand.id_visual
				if(M.slot_head) my_head = M.slot_head.id_visual
				if(M.slot_body) my_body = M.slot_body.id_visual
				if(M.slot_legs) my_legs = M.slot_legs.id_visual
				if(M.slot_feet) my_feet = M.slot_feet.id_visual

				var/list/my_stats = list(
					"my_id" = "\ref[M]",
					"me" = list(
						"loaded" = 1,
						// POSIÇÃO INICIAL (CRÍTICO PARA O SNAP)
						"x" = M.R2(M.real_x), "y" = M.R2(M.real_y), "z" = M.R2(M.real_z), "rot" = M.R2(M.real_rot),
						
						"nick" = M.name, "class" = M.char_class,
						"lvl" = M.level, "exp" = M.experience, "req_exp" = M.req_experience, "pts" = M.stat_points,
						"str" = M.strength, "vit" = M.vitality, "agi" = M.agility,  "wis" = M.wisdom,
						"gold" = M.gold, "hp" = M.current_hp, "max_hp" = M.max_hp, "en" = M.current_energy, "max_en" = M.max_energy,
						"pp" = M.prof_punch_lvl, "pp_x" = M.prof_punch_exp, "pp_r" = M.GetProficiencyReq(M.prof_punch_lvl),
						"pk" = M.prof_kick_lvl,  "pk_x" = M.prof_kick_exp,  "pk_r" = M.GetProficiencyReq(M.prof_kick_lvl),
						"ps" = M.prof_sword_lvl, "ps_x" = M.prof_sword_exp, "ps_r" = M.GetProficiencyReq(M.prof_sword_lvl),
						"pg" = M.prof_gun_lvl,   "pg_x" = M.prof_gun_exp,   "pg_r" = M.GetProficiencyReq(M.prof_gun_lvl),
						"mspd" = M.calc_move_speed, "jmp" = M.calc_jump_power,
						"rest" = M.is_resting, "ft" = M.is_fainted, "rem" = faint_rem,
						"skin" = M.skin_color, "cloth" = M.cloth_color, "gen" = M.char_gender,
						"it" = my_hand, "eq_h" = my_head, "eq_b" = my_body, "eq_l" = my_legs, "eq_f" = my_feet
					),
					"evts" = M.pending_visuals
				)
				
				if(M.pending_visuals.len > 0) M.pending_visuals = list()

				M << output(global_json, "map3d:receberDadosGlobal")
				M << output(json_encode(my_stats), "map3d:receberDadosPessoal")

			sleep(tick_rate)


// --- LISTA GLOBAL DE NPCS ---
var/list/global_npcs = list()
// --- LISTA GLOBAL DE PLAYERS ---
var/list/global_players_list = list()
// --- LISTA GLOBAL DE ITENS ---
var/list/global_ground_items = list()

// --- ESTRUTURA DE ITENS ---
obj/item
	var/id_visual = ""
	var/slot = "none" 
	var/power = 0
	var/price = 0
	var/description = ""
	var/amount = 1
	var/max_stack = 5 
	var/shop_tags = "" 
	var/real_x = 0
	var/real_y = 0
	var/real_z = 0

// -- Armas --
obj/item/weapon
	slot = "hand"
	max_stack = 1
	var/range = 1.0 
	var/projectile_speed = 0 

obj/item/weapon/sword_wood
	name = "Espada de Treino"
	id_visual = "weapon_sword_wood"
	description = "Uma espada de madeira para treinar."
	power = 5
	price = 50
	range = 3.0
	shop_tags = "armorer"

obj/item/weapon/sword_iron
	name = "Espada de Ferro"
	id_visual = "weapon_sword_iron"
	description = "Lâmina afiada e resistente."
	power = 10
	price = 100
	range = 3.0
	shop_tags = "armorer"

obj/item/weapon/sword_silver
	name = "Espada de Prata"
	id_visual = "weapon_sword_silver"
	description = "Brilha com a luz da lua."
	power = 20
	price = 500
	range = 3.5
	shop_tags = "armorer"

obj/item/weapon/gun_wood
	name = "Pistola de Brinquedo"
	id_visual = "weapon_gun_wood"
	description = "Dispara rolhas."
	power = 12
	price = 80
	range = 10.0 
	projectile_speed = 0.6 
	shop_tags = "armorer"

obj/item/weapon/gun_flintlock
	name = "Pistola Velha"
	id_visual = "weapon_gun_flintlock"
	description = "Cheira a pólvora queimada."
	power = 25
	price = 250
	range = 14.0
	projectile_speed = 3.6 
	shop_tags = "armorer"

obj/item/weapon/gun_silver
	name = "Pistola de Combate"
	id_visual = "weapon_gun_silver"
	description = "Alta precisão."
	power = 40
	price = 800
	range = 22.0
	projectile_speed = 7.2 
	shop_tags = "armorer"

// -- Roupas e Armaduras --
obj/item/armor
	max_stack = 1

obj/item/armor/head_bandana
	name = "Bandana Vermelha"
	id_visual = "armor_head_bandana"
	slot = "head"
	description = "Um pano simples para a cabeça."
	price = 30
	power = 0 
	shop_tags = "armorer"

obj/item/armor/head_bandana_black
	name = "Bandana Preta"
	id_visual = "armor_head_bandana_black"
	slot = "head"
	description = "Estilo pirata clássico."
	price = 35
	power = 0
	shop_tags = "armorer"

obj/item/armor/body_shirt
	name = "Camisa de Marinheiro"
	id_visual = "armor_body_shirt"
	slot = "body"
	description = "Uniforme padrão."
	price = 50
	power = 1
	shop_tags = "armorer"

obj/item/armor/legs_pants
	name = "Calça de Linho"
	id_visual = "armor_legs_pants"
	slot = "legs"
	description = "Confortável para correr."
	price = 40
	power = 1
	shop_tags = "armorer"

obj/item/armor/feet_boots
	name = "Botas de Couro"
	id_visual = "armor_feet_boots"
	slot = "feet"
	description = "Protege os pés."
	price = 60
	power = 1
	shop_tags = "armorer"

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
	var/strength = 5
	var/vitality = 5
	var/agility = 5
	var/wisdom = 5
	var/current_hp = 50
	var/max_hp = 50
	var/current_energy = 50
	var/max_energy = 50
	var/gold = 0
	var/prof_punch_lvl = 1
	var/prof_punch_exp = 0
	var/prof_kick_lvl = 1
	var/prof_kick_exp = 0
	var/prof_sword_lvl = 1
	var/prof_sword_exp = 0
	var/prof_gun_lvl = 1
	var/prof_gun_exp = 0
	var/is_resting = 0
	var/is_fainted = 0
	var/faint_end_time = 0
	var/is_running = 0
	var/calc_move_speed = 0.08
	var/calc_jump_power = 0.20
	var/skin_color = "FFCCAA"
	var/cloth_color = "FF0000"
	var/real_x = 0
	var/real_y = 0
	var/real_z = 0
	var/real_rot = 0
	var/hit_radius = 0.5 
	var/in_game = 0
	var/is_attacking = 0
	var/attack_type = ""
	var/combo_step = 0
	var/active_item_visual = ""
	
	var/obj/item/slot_hand = null
	var/obj/item/slot_head = null
	var/obj/item/slot_body = null
	var/obj/item/slot_legs = null
	var/obj/item/slot_feet = null 
	
	var/list/pending_visuals = list()

	Login()
		..()
		in_game = 0
		global_players_list += src
		ShowCharacterMenu()

	Logout()
		global_players_list -= src
		if(in_game)
			SaveCharacter()
			in_game = 0
		char_loaded = 0
		del(src)
		..()

	proc/GiveStarterItems()
		var/has_weapon = 0
		var/has_bandana = 0
		for(var/obj/item/I in contents)
			if(istype(I, /obj/item/weapon/sword_wood)) has_weapon = 1
			if(istype(I, /obj/item/armor/head_bandana)) has_bandana = 1
		
		if(!has_weapon && !slot_hand) new /obj/item/weapon/sword_wood(src)
		if(!has_bandana && !slot_head) new /obj/item/armor/head_bandana(src)
		
		src << output("Itens iniciais verificados!", "map3d:mostrarNotificacao")

	proc/EquipItem(obj/item/I)
		if(!I || !(I in contents)) return
		var/success = 0
		if(I.slot == "hand") { if(slot_hand) UnequipItem("hand"); slot_hand = I; active_item_visual = I.id_visual; success = 1; }
		else if(I.slot == "head") { if(slot_head) UnequipItem("head"); slot_head = I; success = 1; }
		else if(I.slot == "body") { if(slot_body) UnequipItem("body"); slot_body = I; success = 1; }
		else if(I.slot == "legs") { if(slot_legs) UnequipItem("legs"); slot_legs = I; success = 1; }
		else if(I.slot == "feet") { if(slot_feet) UnequipItem("feet"); slot_feet = I; success = 1; }
		if(success) { contents -= I; src << output("Equipou [I.name].", "map3d:mostrarNotificacao"); RequestInventoryUpdate(); RequestStatusUpdate(); }

	proc/UnequipItem(slot_name)
		var/obj/item/I = null
		if(slot_name == "hand") I = slot_hand
		else if(slot_name == "head") I = slot_head
		else if(slot_name == "body") I = slot_body
		else if(slot_name == "legs") I = slot_legs
		else if(slot_name == "feet") I = slot_feet
		if(I) {
			if(contents.len >= 12) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); return; }
			if(slot_name == "hand") { slot_hand = null; active_item_visual = ""; }
			else if(slot_name == "head") slot_head = null
			else if(slot_name == "body") slot_body = null
			else if(slot_name == "legs") slot_legs = null
			else if(slot_name == "feet") slot_feet = null
			contents += I; src << output("Desequipou [I.name].", "map3d:mostrarNotificacao"); RequestInventoryUpdate(); RequestStatusUpdate(); }

	proc/DropItem(obj/item/I, amount_to_drop)
		if(!I) return
		if(I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) { src << output("Desequipe primeiro!", "map3d:mostrarNotificacao"); return; }
		if(!(I in contents)) return
		if(amount_to_drop >= I.amount) { I.loc = locate(1,1,1); I.real_x = src.real_x; I.real_z = src.real_z; I.real_y = 0; global_ground_items |= I; src << output("Largou tudo de [I.name]", "map3d:mostrarNotificacao"); }
		else { I.amount -= amount_to_drop; var/obj/item/NewI = new I.type(locate(1,1,1)); NewI.amount = amount_to_drop; NewI.real_x = src.real_x; NewI.real_z = src.real_z; NewI.real_y = 0; global_ground_items |= NewI; src << output("Largou [amount_to_drop] x [I.name]", "map3d:mostrarNotificacao"); }
		RequestInventoryUpdate()

	proc/TrashItem(obj/item/I)
		if(!I) return
		if(I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) return
		if(I in contents) { src << output("Você jogou [I.name] no lixo.", "map3d:mostrarNotificacao"); del(I); RequestInventoryUpdate(); }

	proc/PickUpNearestItem()
		var/obj/item/target = null
		var/min_dist = 2.0
		for(var/obj/item/I in global_ground_items)
			if(I.loc == null || !isturf(I.loc)) { global_ground_items -= I; continue; }
			var/dx = I.real_x - src.real_x; var/dz = I.real_z - src.real_z; var/dist = sqrt(dx*dx + dz*dz)
			if(dist <= min_dist) { target = I; break; }
		if(target) {
			var/stacked = 0
			for(var/obj/item/invItem in contents)
				if(invItem.type == target.type && invItem.amount < invItem.max_stack) { var/space = invItem.max_stack - invItem.amount; if(target.amount <= space) { invItem.amount += target.amount; global_ground_items -= target; del(target); stacked = 1; break; } }
			if(!stacked) { if(contents.len >= 12) { src << output("Mochila cheia (12/12)!", "map3d:mostrarNotificacao"); return; } global_ground_items -= target; target.loc = src; src << output("Pegou item!", "map3d:mostrarNotificacao"); }
			RequestInventoryUpdate()
		} else src << output("Nada por perto.", "map3d:mostrarNotificacao")

	proc/RequestInventoryUpdate()
		var/list/inv_data = list()
		for(var/obj/item/I in contents)
			if(!I) continue
			var/desc_txt = I.description; if(!desc_txt) desc_txt = "Sem descrição"
			inv_data += list(list("name"=I.name, "desc"=desc_txt, "ref"="\ref[I]", "amount"=I.amount, "id"=I.id_visual, "power"=I.power, "price"=I.price, "equipped"=0))
		src << output(json_encode(inv_data), "map3d:loadInventory")

	proc/RequestStatusUpdate()
		var/list/eq_data = list("hand" = null, "head" = null, "body" = null, "legs" = null, "feet" = null)
		if(slot_hand) eq_data["hand"] = list("id"=slot_hand.id_visual, "ref"="\ref[slot_hand]", "name"=slot_hand.name)
		if(slot_head) eq_data["head"] = list("id"=slot_head.id_visual, "ref"="\ref[slot_head]", "name"=slot_head.name)
		if(slot_body) eq_data["body"] = list("id"=slot_body.id_visual, "ref"="\ref[slot_body]", "name"=slot_body.name)
		if(slot_legs) eq_data["legs"] = list("id"=slot_legs.id_visual, "ref"="\ref[slot_legs]", "name"=slot_legs.name)
		if(slot_feet) eq_data["feet"] = list("id"=slot_feet.id_visual, "ref"="\ref[slot_feet]", "name"=slot_feet.name)
		var/list/stat_data = list("nick"=src.name, "class"=char_class, "title"=char_title, "lvl"=src.level, "equip"=eq_data,
			"pp"=prof_punch_lvl, "pp_x"=prof_punch_exp, "pp_r"=GetProficiencyReq(prof_punch_lvl),
			"pk"=prof_kick_lvl, "pk_x"=prof_kick_exp, "pk_r"=GetProficiencyReq(prof_kick_lvl),
			"ps"=prof_sword_lvl, "ps_x"=prof_sword_exp, "ps_r"=GetProficiencyReq(prof_sword_lvl),
			"pg"=prof_gun_lvl, "pg_x"=prof_gun_exp, "pg_r"=GetProficiencyReq(prof_gun_lvl))
		src << output(json_encode(stat_data), "map3d:updateStatusMenu")

	proc/RecalculateStats()
		max_hp = 50 + (vitality * 10); max_energy = 30 + (wisdom * 5)
		if(current_hp > max_hp) current_hp = max_hp
		if(current_energy > max_energy) current_energy = max_energy
		
		// CONFIGURAÇÃO DE VELOCIDADE NO SERVIDOR
		// Antes: 0.08 + (agi * 0.002)
		// Agora: 0.12 + (agi * 0.004) -> Base mais rápida e Agi mais impactante
		calc_move_speed = 0.12 + (agility * 0.004)
		
		calc_jump_power = 0.20 + (strength * 0.002) + (agility * 0.003)

	proc/GainExperience(amount)
		if(!in_game) return
		experience += amount
		src << output("<span class='log-hit' style='color:#aaddff'>+ [amount] EXP</span>", "map3d:addLog")
		var/safety = 0; while(experience >= req_experience && safety < 50) { LevelUp(); safety++ }

	proc/LevelUp()
		level++; experience -= req_experience; req_experience = round(req_experience * 1.5)
		if(req_experience < 100) req_experience = 100
		stat_points += 3; RecalculateStats(); current_hp = max_hp; current_energy = max_energy
		src << output("<span class='log-hit' style='font-size:14px;color:#ffff00'>LEVEL UP! Nível [level]</span>", "map3d:addLog")
		SaveCharacter()

	proc/GetProficiencyReq(lvl) return 50 * (lvl * 1.2)

	proc/GainWeaponExp(type, amount)
		var/lvl = 1; var/exp = 0; var/req = 100
		if(type == "fist") { exp = prof_punch_exp; lvl = prof_punch_lvl }
		else if(type == "kick") { exp = prof_kick_exp; lvl = prof_kick_lvl }
		else if(type == "sword") { exp = prof_sword_exp; lvl = prof_sword_lvl }
		else if(type == "gun") { exp = prof_gun_exp; lvl = prof_gun_lvl }
		req = GetProficiencyReq(lvl); exp += amount
		if(exp >= req) { lvl++; exp -= req; src << output("<span class='log-hit' style='color:#00ff00'>Habilidade [type] subiu para [lvl]!</span>", "map3d:addLog") }
		if(type == "fist") { prof_punch_exp = exp; prof_punch_lvl = lvl }
		else if(type == "kick") { prof_kick_exp = exp; prof_kick_lvl = lvl }
		else if(type == "sword") { prof_sword_exp = exp; prof_sword_lvl = lvl }
		else if(type == "gun") { prof_gun_exp = exp; prof_gun_lvl = lvl }

	proc/ConsumeEnergy(amount)
		if(is_fainted) return 0
		var/efficiency = 1.0 - (vitality * 0.01); if(efficiency < 0.5) efficiency = 0.5
		current_energy -= amount * efficiency
		if(current_energy <= 0) { current_energy = 0; GoFaint(); }
		return 1

	proc/GoFaint()
		if(is_fainted) return
		is_fainted = 1; is_resting = 1; faint_end_time = world.time + 150
		src << output("<span class='log-hit' style='color:red;font-size:16px;'>VOCÊ DESMAIOU DE EXAUSTÃO!</span>", "map3d:addLog")
		spawn(150) if(src) WakeUp()

	proc/WakeUp()
		is_fainted = 0; is_resting = 0; faint_end_time = 0; current_energy = max_energy * 0.10
		src << output("Você acordou.", "map3d:mostrarNotificacao")

	proc/ToggleRest()
		if(is_attacking || is_fainted) return
		is_resting = !is_resting
		if(is_resting) src << output("Descansando...", "map3d:mostrarNotificacao")
		else src << output("Levantou.", "map3d:mostrarNotificacao")

	proc/RestLoop()
		while(src && in_game)
			if(is_resting && !is_fainted) {
				var/hp_regen = max_hp * 0.05; var/en_regen = max_energy * 0.05
				if(current_hp < max_hp) current_hp = min(max_hp, current_hp + hp_regen)
				if(current_energy < max_energy) current_energy = min(max_energy, current_energy + en_regen) }
			if(is_running && !is_resting && !is_fainted) {
				var/run_cost = max_energy * 0.01
				if(current_energy > 0) { current_energy -= run_cost; if(current_energy <= 0) { current_energy = 0; GoFaint(); } } }
			sleep(10)

	proc/ShowCharacterMenu()
		var/page = file2text('menu.html'); page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
		src << browse(page, "window=map3d")

	proc/StartGame(slot_index)
		current_slot = slot_index
		if(LoadCharacter(slot_index)) { src << output("Carregado!", "map3d:mostrarNotificacao"); GiveStarterItems(); }
		else {
			real_x = 0; real_y = 0; real_z = 0; level = 1; experience = 0; req_experience = 100; stat_points = 0
			strength = 5; vitality = 5; agility = 5; wisdom = 5
			prof_punch_lvl=1; prof_kick_lvl=1; prof_sword_lvl=1; prof_gun_lvl=1
			RecalculateStats(); current_hp = max_hp; current_energy = max_energy
			active_item_visual = ""; GiveStarterItems(); src << output("Novo char!", "map3d:mostrarNotificacao") }
		src << browse_rsc(file("definitions.js"), "definitions.js")
		src << browse_rsc(file("factory.js"), "factory.js")
		src << browse_rsc(file("engine.js"), "engine.js")
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
		var/page = file2text('game.html'); page = replacetext(page, "{{BYOND_REF}}", "\ref[src]")
		src << browse(page, "window=map3d")
		spawn(600) AutoSaveLoop()
		spawn(10) RestLoop()

	proc/SaveCharacter()
		if(!current_slot || !in_game) return
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
		F["name"] << src.name; F["level"] << src.level; F["exp"] << src.experience; F["req_exp"] << src.req_experience
		F["stat_pts"] << src.stat_points; F["gold"] << src.gold
		F["hp"] << src.current_hp; F["en"] << src.current_energy
		F["str"] << src.strength; F["vit"] << src.vitality; F["agi"] << src.agility; F["wis"] << src.wisdom
		F["p_punch"] << prof_punch_lvl; F["exp_punch"] << prof_punch_exp
		F["p_kick"] << prof_kick_lvl; F["exp_kick"] << prof_kick_exp
		F["p_sword"] << prof_sword_lvl; F["exp_sword"] << prof_sword_exp
		F["p_gun"] << prof_gun_lvl; F["exp_gun"] << prof_gun_exp
		F["pos_x"] << src.real_x; F["pos_y"] << src.real_y; F["pos_z"] << src.real_z
		F["skin"] << src.skin_color; F["cloth"] << src.cloth_color
		F["inventory"] << src.contents; F["slot_hand"] << src.slot_hand
		F["slot_head"] << src.slot_head
		F["slot_body"] << src.slot_body
		F["slot_legs"] << src.slot_legs
		F["slot_feet"] << src.slot_feet
		F["gender"] << src.char_gender
		src << output("Salvo!", "map3d:mostrarNotificacao")

	proc/LoadCharacter(slot)
		if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")
		F["name"] >> src.name; F["level"] >> src.level; F["exp"] >> src.experience; F["req_exp"] >> src.req_experience
		F["stat_pts"] >> src.stat_points; F["gold"] >> src.gold; F["hp"] >> src.current_hp
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
		F["pos_x"] >> src.real_x; if(F["pos_y"]) F["pos_y"] >> src.real_y; F["pos_z"] >> src.real_z
		F["skin"] >> src.skin_color; F["cloth"] >> src.cloth_color
		if(F["inventory"]) F["inventory"] >> src.contents
		if(F["slot_hand"]) F["slot_hand"] >> src.slot_hand
		if(F["slot_head"]) F["slot_head"] >> src.slot_head
		if(F["slot_body"]) F["slot_body"] >> src.slot_body
		if(F["slot_legs"]) F["slot_legs"] >> src.slot_legs
		if(F["slot_feet"]) F["slot_feet"] >> src.slot_feet
		if(F["gender"]) F["gender"] >> src.char_gender; else src.char_gender = "Male"
		if(!src.req_experience || src.req_experience <= 0) { src.req_experience = 100 * (1.5 ** (src.level - 1)); if(src.req_experience < 100) src.req_experience = 100 }
		active_item_visual = ""; if(slot_hand) active_item_visual = slot_hand.id_visual
		RecalculateStats(); return 1

	proc/R2(n) return round(n * 100) / 100
	proc/AutoSaveLoop()
		while(src && in_game) { SaveCharacter(); sleep(300) }

	Topic(href, href_list[])
		..()
		var/action = href_list["action"]
		if(action == "request_slots") {
			var/list/slots_data = list()
			for(var/i=1 to 3) {
				if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav")) {
					var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[i].sav"); var/n; var/l; var/g; var/ge
					F["name"] >> n; F["level"] >> l; F["gold"] >> g; if(F["gender"]) F["gender"] >> ge; else ge = "Male"
					slots_data["slot[i]"] = list("name"=n, "lvl"=l, "gold"=g, "gender"=ge)
				} else slots_data["slot[i]"] = null }
			src << output(json_encode(slots_data), "map3d:loadSlots") }

		if(action == "delete_char") { var/slot = text2num(href_list["slot"]); var/path = "[SAVE_DIR][src.ckey]_slot[slot].sav"; if(fexists(path)) fdel(path); ShowCharacterMenu() }
		if(action == "select_char") StartGame(text2num(href_list["slot"]))
		if(action == "create_char") {
			var/slot = text2num(href_list["slot"]); src.name = href_list["name"]; src.skin_color = href_list["skin"]; src.cloth_color = href_list["cloth"]; src.char_gender = href_list["gender"] 
			src.level = 1; src.gold = 10000; src.real_x = 0; src.real_y = 0; src.real_z = 0; current_slot = slot; SaveCharacter(); StartGame(slot) }
		if(action == "force_save" && in_game) SaveCharacter()
		if(action == "update_pos" && in_game) {
			if(!is_fainted) {
				real_x = text2num(href_list["x"]); real_y = text2num(href_list["y"]); real_z = text2num(href_list["z"]); real_rot = text2num(href_list["rot"])
				if(real_x > 29) real_x = 29; if(real_x < -29) real_x = -29; if(real_z > 29) real_z = 29; if(real_z < -29) real_z = -29
				if(href_list["run"] == "1") is_running = 1; else is_running = 0 } }
		if(action == "toggle_rest" && in_game) ToggleRest()
		if(action == "request_inventory" && in_game) RequestInventoryUpdate()
		if(action == "request_status" && in_game) RequestStatusUpdate()
		if(action == "equip_item" && in_game) { var/obj/item/I = locate(href_list["ref"]); if(I && (I in contents)) EquipItem(I) }
		if(action == "unequip_item" && in_game) UnequipItem(href_list["slot"])
		if(action == "drop_item" && in_game) { var/obj/item/I = locate(href_list["ref"]); var/qty = text2num(href_list["amount"]); if(I && (I in contents)) DropItem(I, qty) }
		if(action == "trash_item" && in_game) { var/obj/item/I = locate(href_list["ref"]); if(I && (I in contents)) TrashItem(I) }
		if(action == "pick_up" && in_game) PickUpNearestItem()
		if(action == "interact_npc" && in_game) {
			var/mob/npc/N = locate(href_list["ref"])
			if(N && get_dist_euclid(src.real_x, src.real_z, N.real_x, N.real_z) < 3.0) {
				if(istype(N, /mob/npc/vendor)) {
					var/mob/npc/vendor/V = N; var/list/shop_items = list()
					for(var/path in V.stock) { var/obj/item/tmpI = new path(); shop_items += list(list("name"=tmpI.name, "id"=tmpI.id_visual, "price"=tmpI.price, "desc"=tmpI.description, "typepath"=path)); del(tmpI) }
					src << output(json_encode(shop_items), "map3d:openShop"); RequestInventoryUpdate()
				} else if(istype(N, /mob/npc/nurse)) { src.current_hp = src.max_hp; src.current_energy = src.max_energy; src.is_fainted = 0; src.faint_end_time = 0; src << output("Enfermeira: Você foi curado!", "map3d:mostrarNotificacao") } } }
		if(action == "buy_item" && in_game) {
			var/typepath = text2path(href_list["type"]); if(typepath) { var/obj/item/temp = new typepath(); if(src.gold >= temp.price) { if(contents.len >= 12) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); del(temp) } else { src.gold -= temp.price; temp.loc = src; src << output("Comprou [temp.name]!", "map3d:mostrarNotificacao"); RequestInventoryUpdate() } } else { src << output("Ouro insuficiente!", "map3d:mostrarNotificacao"); del(temp) } } }
		if(action == "sell_item" && in_game) {
			var/obj/item/I = locate(href_list["ref"])
			if(I && (I in contents)) {
				if(I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) src << output("Desequipe antes de vender!", "map3d:mostrarNotificacao")
				else { var/val = round(I.price / 10); if(val < 1) val = 1; src.gold += val; src << output("Vendeu [I.name] por [val] Berries.", "map3d:mostrarNotificacao"); del(I); RequestInventoryUpdate() } } }
		if(action == "attack" && in_game) {
			if(is_resting) return
			var/base_cost = max_energy * 0.03
			if(ConsumeEnergy(base_cost)) {
				is_attacking = 1
				attack_type = href_list["type"]
				combo_step = text2num(href_list["step"]) // Sincronia de Estado
				if(!combo_step) combo_step = 1
				spawn(3) is_attacking = 0
			}
		}
		if(action == "register_hit" && in_game) {
			var/target_ref = href_list["target_ref"]; var/hit_type = href_list["hit_type"]; var/obj/target = locate(target_ref)
			if(target) {
				if(istype(target, /mob/npc)) { var/mob/npc/N = target; if(N.npc_type == "vendor" || N.npc_type == "nurse") return }
				var/max_dist = 3.0; var/bonus_dmg = 0; var/skill_exp_type = ""
				if(hit_type == "projectile") { if(slot_hand && istype(slot_hand, /obj/item/weapon)) { max_dist = slot_hand:range + 5; bonus_dmg = slot_hand:power; skill_exp_type = "gun" } else return }
				else if(hit_type == "melee") {
					if(attack_type == "sword") { if(slot_hand && istype(slot_hand, /obj/item/weapon)) { max_dist = slot_hand:range + 2; bonus_dmg = slot_hand:power; skill_exp_type = "sword" } }
					else if(attack_type == "kick") { max_dist = 3.5; skill_exp_type = "kick" } else { max_dist = 2.5; skill_exp_type = "fist" } }
				var/dist = get_dist_euclid(src.real_x, src.real_z, target:real_x, target:real_z); if(dist > max_dist) return
				var/prof_bonus = 0
				if(skill_exp_type == "sword") prof_bonus = prof_sword_lvl * 2
				else if(skill_exp_type == "gun") prof_bonus = prof_gun_lvl * 2
				else if(skill_exp_type == "kick") prof_bonus = prof_kick_lvl * 2
				else prof_bonus = prof_punch_lvl * 2
				var/damage_mult = 1.0; var/c_step = text2num(href_list["combo"]); if(c_step == 3) damage_mult = 1.2
				var/damage = round(((strength * 0.4) + prof_bonus + bonus_dmg + rand(0, 3)) * damage_mult)
				src.pending_visuals += list(list("type"="dmg", "val"=damage, "tid"=target_ref))
				if(istype(target, /mob/npc)) {
					var/mob/npc/N = target
					if(N.npc_type == "prop") { var/msg = "TREINO: [damage] dmg"; if(c_step == 3) msg = "COMBO: [damage] dmg!"; src << output("<span class='log-hit' style='color:orange'>[msg]</span>", "map3d:addLog"); GainExperience(5); if(skill_exp_type) GainWeaponExp(skill_exp_type, 3) }
					else {
						src << output("<span class='log-hit'>HIT em [N.name]! Dano: [damage]</span>", "map3d:addLog"); N.current_hp -= damage
						if(N.current_hp <= 0) { src << output("<span class='log-hit' style='color:red'>[N.name] eliminado!</span>", "map3d:addLog"); N.current_hp = N.max_hp; N.real_x = rand(-10, 10); N.real_z = rand(-10, 10) }
						GainExperience(10); if(skill_exp_type) GainWeaponExp(skill_exp_type, 5) } } } }
		if(action == "add_stat" && in_game) { if(stat_points > 0) { var/s = href_list["stat"]; if(s == "str") strength++; if(s == "vit") vitality++; if(s == "agi") agility++; if(s == "wis") wisdom++; stat_points--; RecalculateStats(); src << output("Ponto adicionado em [s]!", "map3d:mostrarNotificacao") } }

	verb/TestLevelUp()
		set category = "Debug"
		GainExperience(req_experience)

	proc/get_dist_euclid(x1, z1, x2, z2)
		return sqrt((x1-x2)**2 + (z1-z2)**2)

mob/npc
	in_game = 1; char_loaded = 1; var/npc_type = "base"; var/wanders = 1; char_gender = "Female"
	New() { ..(); real_y = 0; global_npcs += src; if(wanders) spawn(5) AI_Loop() }
	Del() { global_npcs -= src; ..() }
	proc/AI_Loop()
		while(src) {
			var/dir = pick(0, 90, 180, 270); real_rot = (dir * 3.14159 / 180)
			for(var/i=1 to 10) { if(dir==0) real_z-=0.1; if(dir==180) real_z+=0.1; if(dir==90) real_x+=0.1; if(dir==270) real_x-=0.1; sleep(1) }
			sleep(rand(20, 50)) }

mob/npc/prop
	npc_type = "prop"; wanders = 0
mob/npc/prop/log
	name = "Tronco de Treino"; skin_color = "8B4513"; hit_radius = 0.8
	New() { ..(); real_x = 5; real_z = 5; real_y = 0; real_rot = 0; max_hp = 9999; current_hp = 9999 }

mob/npc/vendor
	name = "Armeiro"; npc_type = "vendor"; skin_color = "FFE0BD"; cloth_color = "555555"; wanders = 0; char_gender = "Male"; var/list/stock = list()
	New() { ..(); real_x = 2; real_z = 2; real_y = 0.1; real_rot = 3.14; for(var/T in typesof(/obj/item)) { var/obj/item/temp = new T(); if(temp.shop_tags == "armorer") stock += T; del(temp) } }

mob/npc/nurse
	name = "Enfermeira"; npc_type = "nurse"; skin_color = "FFE0BD"; cloth_color = "FF69B4"; wanders = 0; char_gender = "Female"
	New() { ..(); real_x = 8; real_z = 8; real_y = 0.1; real_rot = 3.14 }

mob/npc/dummy
	name = "Pirata de Teste"; npc_type = "enemy"; skin_color = "00FF00"; cloth_color = "0000FF"; wanders = 1
	New() { ..(); real_x = rand(-10, 10); real_z = rand(-10, 10) }

world/New()
	world.maxx = 1; world.maxy = 1; world.maxz = 1
	..()
	new /mob/npc/dummy(); new /mob/npc/vendor(); new /mob/npc/nurse(); new /mob/npc/prop/log()