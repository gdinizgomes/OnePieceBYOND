// server/NPCs.dm
// Lógica de Inteligência Artificial e Tipos de NPCs

var/global/list/GlobalMobsData = list()

proc/LoadMobDefinitions()
	var/file_txt = file2text("shared/MobDefinitions.json")
	if(file_txt)
		GlobalMobsData = json_decode(file_txt)
		world.log << "✅ Mobs carregados com sucesso via JSON."
	else
		world.log << "❌ Falha ao carregar MobDefinitions.json"

proc/GetDirAngleInRadians(dx, dz)
	if(dx == 0 && dz == 0) return 0
	var/deg = 0
	if(dz == 0)
		deg = (dx > 0) ? 90 : -90
	else
		deg = arctan(dx/dz)
		if(dz < 0)
			deg += 180
	return deg * (3.14159 / 180)

mob/npc
	in_game = 1
	char_loaded = 1
	var/npc_type = "base"
	var/wanders = 1 
	char_gender = "Female"
	var/patrol_x = 0    
	var/patrol_z = 0
	var/patrol_radius = 5.0  

	New()
		..()
		real_y = 0
		patrol_x = real_x  
		patrol_z = real_z
		global_npcs += src
		if(wanders) spawn(5) AI_Loop()

	Del()
		global_npcs -= src
		..()

	proc/AI_Loop()
		while(src)
			var/dir = pick(0, 90, 180, 270)
			real_rot = (dir * 3.14159 / 180)
			for(var/i=1 to 10)
				if(dir==0)   real_z-=0.1
				if(dir==180) real_z+=0.1
				if(dir==90)  real_x+=0.1
				if(dir==270) real_x-=0.1
				real_x = clamp(real_x, max(patrol_x - patrol_radius, -29), min(patrol_x + patrol_radius, 29))
				real_z = clamp(real_z, max(patrol_z - patrol_radius, -29), min(patrol_z + patrol_radius, 29))
				sleep(1)
			sleep(rand(20, 50))


mob/npc/enemy
	npc_type = "enemy"
	var/mob_id = ""
	var/mob_rank = "normal"
	var/mob_speed = 0.05
	
	var/mob/aggro_target = null
	var/aggro_range = 6.0
	var/chase_range = 12.0
	
	var/list/mob_skills = list()
	var/list/mob_loot = list()
	var/next_attack_time = 0

	New(newloc, build_id)
		..()
		if(build_id)
			src.mob_id = build_id
			SyncData()

	proc/SyncData()
		if(!mob_id || !GlobalMobsData[mob_id]) return
		var/list/data = GlobalMobsData[mob_id]
		
		src.name = data["name"]
		if(data["visuals"])
			src.skin_color = data["visuals"]["skin"]
			src.cloth_color = data["visuals"]["cloth"]
		
		src.mob_rank = data["rank"]
		src.level = data["level"]
		
		if(data["stats"])
			src.max_hp = data["stats"]["max_hp"]
			src.current_hp = src.max_hp
			src.calc_move_speed = data["stats"]["speed"] 
			src.mob_speed = data["stats"]["speed"]
			src.calc_atk = data["stats"]["atk"]
			src.calc_def = data["stats"]["def"]
			src.calc_flee = data["stats"]["flee"]
		
		if(data["behavior"])
			src.aggro_range = data["behavior"]["aggro_range"]
			src.chase_range = data["behavior"]["chase_range"]
			src.patrol_radius = data["behavior"]["patrol_radius"]
			
		if(data["combat"] && data["combat"]["skills"])
			src.mob_skills = data["combat"]["skills"]
			
		if(data["loot"])
			src.mob_loot = data["loot"]

	AI_Loop()
		while(src)
			if(current_hp <= 0) { sleep(10); continue } 

			if(aggro_target)
				var/dist = get_dist_euclid(src.real_x, src.real_z, aggro_target.real_x, aggro_target.real_z)
				
				if(aggro_target.is_fainted || aggro_target.current_hp <= 0 || dist > chase_range)
					aggro_target = null
					sleep(10)
					continue
				
				var/attacked = 0
				if(world.time > next_attack_time && mob_skills.len > 0)
					for(var/list/sk in mob_skills)
						if(dist <= sk["range"])
							ExecuteSkill(sk["id"], aggro_target)
							next_attack_time = world.time + sk["cooldown"]
							attacked = 1
							break
				
				if(!attacked && dist > 1.5) 
					var/dx = aggro_target.real_x - src.real_x
					var/dz = aggro_target.real_z - src.real_z
					var/len = sqrt(dx*dx + dz*dz)
					if(len > 0)
						src.real_x += (dx/len) * mob_speed * 2 
						src.real_z += (dz/len) * mob_speed * 2
						src.real_rot = GetDirAngleInRadians(dx, dz)
						src.real_x = clamp(src.real_x, -29, 29)
						src.real_z = clamp(src.real_z, -29, 29)

				sleep(2) 
			else
				for(var/mob/M in world)
					if(M.client && !M.is_fainted && get_dist_euclid(src.real_x, src.real_z, M.real_x, M.real_z) <= aggro_range)
						aggro_target = M
						break
				
				if(!aggro_target)
					var/dir = pick(0, 90, 180, 270)
					real_rot = (dir * 3.14159 / 180)
					for(var/i=1 to 5)
						if(dir==0)   real_z-=0.1
						if(dir==180) real_z+=0.1
						if(dir==90)  real_x+=0.1
						if(dir==270) real_x-=0.1
						real_x = clamp(real_x, max(patrol_x - patrol_radius, -29), min(patrol_x + patrol_radius, 29))
						real_z = clamp(real_z, max(patrol_z - patrol_radius, -29), min(patrol_z + patrol_radius, 29))
						sleep(2)
					sleep(rand(20, 40)) 

	proc/ExecuteSkill(skill_id, mob/target)
		var/list/skill_data = GlobalSkillsData[skill_id]
		if(!skill_data) return
		
		var/is_proj = (skill_data["type"] == "projectile") ? 1 : 0
		
		// --- INÍCIO DA MELHORIA: Ativar a animação para a Rede ---
		src.is_attacking = 1
		src.attack_type = skill_id
		src.combo_step = 1
		spawn(3) src.is_attacking = 0
		// --- FIM DA MELHORIA ---
		
		if(SSserver)
			SSserver.global_events += list(list("type" = "action", "skill" = skill_id, "caster" = "\ref[src]", "step" = 1, "is_proj" = is_proj))
		
		if(!is_proj)
			var/damage = calc_atk
			if(skill_data["power"]) damage += skill_data["power"]
			
			target.current_hp -= damage
			target << output("<span class='log-hit' style='color:red'>[src.name] acertou-te com um golpe! (-[damage] HP)</span>", "map3d:addLog")
			if(target.current_hp <= 0) target.GoFaint()
			
			if(SSserver)
				SSserver.global_events += list(list("type" = "hit", "skill" = skill_id, "caster" = "\ref[src]", "target" = "\ref[target]", "dmg" = damage, "crit" = 0))

	Die(mob/killer)
		killer << output("<span class='log-hit' style='color:#f1c40f'><b>Eliminaste [src.name]!</b></span>", "map3d:addLog")
		
		if(mob_loot && mob_loot.len > 0)
			if(!global.ground_holder) global.ground_holder = new /obj()
			for(var/list/loot_entry in mob_loot)
				var/roll = rand(1, 1000) / 10 
				if(roll <= loot_entry["chance"])
					var/item_id = loot_entry["item_id"]
					var/obj/item/I = new /obj/item(global.ground_holder, item_id)
					I.real_x = src.real_x + (rand(-10, 10)/10)
					I.real_z = src.real_z + (rand(-10, 10)/10)
					I.real_y = 0
					if(loot_entry["amount_min"] && loot_entry["amount_max"])
						I.amount = rand(loot_entry["amount_min"], loot_entry["amount_max"])
					global_ground_items |= I
		
		if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
		SaveWorldState() 
		
		src.current_hp = 0
		src.real_x = 999 
		src.real_z = 999
		aggro_target = null
		spawn(100) 
			src.current_hp = src.max_hp
			src.real_x = patrol_x + (rand(-2, 2))
			src.real_z = patrol_z + (rand(-2, 2))

mob/npc/prop
	npc_type = "prop"
	wanders = 0
	var/prop_id = "prop_tree_log"

mob/npc/prop/log
	name = "Tronco de Treino"
	skin_color = "8B4513" 
	hit_radius = 0.8 
	New()
		..()
		real_x = 5
		real_z = 5
		real_y = 0
		real_rot = 0
		max_hp = 9999
		current_hp = 9999

mob/npc/vendor
	name = "Armeiro"
	npc_type = "vendor"
	skin_color = "FFE0BD"
	cloth_color = "555555"
	wanders = 0 
	char_gender = "Male"
	var/list/stock = list()
	var/shop_tag_filter = "armorer" 
	
	New()
		..()
		real_x = 2
		real_z = 2
		real_y = 0
		real_rot = 3.14
		patrol_x = real_x; patrol_z = real_z

		spawn(5)
			for(var/item_id in GlobalItemsData)
				var/list/data = GlobalItemsData[item_id]
				if(data && data["shop_tags"] == src.shop_tag_filter)
					stock += item_id 

mob/npc/nurse
	name = "Enfermeira"
	npc_type = "nurse"
	skin_color = "FFE0BD"
	cloth_color = "FF69B4"
	wanders = 0 
	char_gender = "Female"
	New()
		..()
		real_x = 8
		real_z = 8
		real_y = 0.1
		real_rot = 3.14