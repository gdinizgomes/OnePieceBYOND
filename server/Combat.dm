// server/Combat.dm
#define FAINT_DURATION 150    // 15 segundos (1 tick BYOND = 100ms)
#define REST_INTERVAL  50     // Regenera a cada 5 segundos
#define MAX_LEVEL_UPS  20     // Máximo de level-ups por chamada de GainExperience
mob
	proc/RecalculateStats()
		max_hp = 50 + (level * 15) + (vitality * 12)
		max_energy = 30 + (level * 5) + (willpower * 8)
		if(current_hp > max_hp) current_hp = max_hp
		if(current_energy > max_energy) current_energy = max_energy
		
		calc_move_speed = 0.08 + (agility * 0.002)
		if(calc_move_speed > 0.20) calc_move_speed = 0.20 
		calc_jump_power = 0.18 + (agility * 0.002)
		if(calc_jump_power > 0.40) calc_jump_power = 0.40

		var/eq_atk = 0; var/eq_ratk = 0; var/eq_def = 0; var/eq_crit = 0
		var/list/equipped = list(slot_hand, slot_head, slot_body, slot_legs, slot_feet)
		for(var/obj/item/I in equipped)
			if(I)
				eq_atk += I.atk
				eq_ratk += I.ratk
				eq_def += I.def
				eq_crit += I.crit_bonus

		calc_atk = (strength * 2) + level + eq_atk
		calc_ratk = (dexterity * 2) + level + eq_ratk
		calc_def = round((vitality * 1.5) + (level * 0.5) + eq_def)
		calc_hit = 80 + (dexterity * 2) + level
		calc_flee = 10 + (agility * 2) + level
		calc_crit = round((luck * 0.5) + eq_crit)
		calc_poise = vitality * 2

		// Gatilho: Subiu algum atributo? Checa se liberou Magia!
		if(in_game) CheckSkillUnlocks()

	proc/GainExperience(amount)
		if(!in_game) return
		if(amount <= 0) return  // Ignora XP negativa ou zero
		experience += amount
		src << output("<span class='log-hit' style='color:#aaddff'>+ [amount] EXP</span>", "map3d:addLog")
		var/safety = 0
		while(experience >= req_experience && safety < MAX_LEVEL_UPS)
			LevelUp()
			safety++

	proc/LevelUp()
		level++
		experience -= req_experience
		if(experience < 0) experience = 0 
		
		// Curva logarítmica-linear evita overflow exponencial em níveis altos
		// Nível 10: ~2300 XP | Nível 50: ~20k XP | Nível 100: ~46k XP
		req_experience = round(100 * (log(level + 1) / log(2)) * level)
		if(req_experience < 100) req_experience = 100
		
		stat_points += 3
		RecalculateStats()
		current_hp = max_hp 
		current_energy = max_energy
		UpdateVisuals()
		src << output("<span class='log-hit' style='font-size:14px;color:#ffff00'>LEVEL UP! Nível [level]</span>", "map3d:addLog")
		SaveCharacter()

	proc/GetProficiencyReq(lvl) return round(50 * (lvl * 1.2))

	proc/GainWeaponExp(type, amount)
		// Mapa de (tipo) -> (exp_var, lvl_var) para evitar if/else duplicados
		var/lvl = 1; var/exp = 0
		if(type == "fist")       { exp = prof_punch_exp; lvl = prof_punch_lvl  }
		else if(type == "kick")  { exp = prof_kick_exp; lvl = prof_kick_lvl   }
		else if(type == "sword") { exp = prof_sword_exp; lvl = prof_sword_lvl  }
		else if(type == "gun")   { exp = prof_gun_exp; lvl = prof_gun_lvl    }
		else return  // Tipo desconhecido, não processa

		var/req = GetProficiencyReq(lvl)
		exp += amount
		if(exp >= req)
			lvl++; exp -= req
			src << output("<span class='log-hit' style='color:#00ff00'>Habilidade [type] subiu para [lvl]!</span>", "map3d:addLog")

		// Salva de volta nas variáveis correspondentes
		if(type == "fist")       { prof_punch_exp = exp; prof_punch_lvl = lvl  }
		else if(type == "kick")  { prof_kick_exp = exp; prof_kick_lvl = lvl   }
		else if(type == "sword") { prof_sword_exp = exp; prof_sword_lvl = lvl  }
		else if(type == "gun")   { prof_gun_exp = exp; prof_gun_lvl = lvl    }

		// Gatilho: Subiu o nível do soco? Pode liberar magia de classe
		if(in_game) CheckSkillUnlocks()

	proc/ConsumeEnergy(amount)
		if(is_fainted) return 0
		var/efficiency = 1.0 - (vitality * 0.01)
		if(efficiency < 0.5) efficiency = 0.5
		current_energy -= amount * efficiency
		if(current_energy <= 0) { current_energy = 0; GoFaint() }
		return 1

	proc/GoFaint()
		if(is_fainted) return
		is_fainted = 1; is_resting = 1; faint_end_time = world.time + FAINT_DURATION
		src << output("<span class='log-hit' style='color:red;font-size:16px;'>VOCÊ DESMAIOU!</span>", "map3d:addLog")
		spawn(FAINT_DURATION) if(src) WakeUp()

	proc/WakeUp()
		if(!is_fainted) return
		is_fainted = 0; is_resting = 0; faint_end_time = 0; current_energy = max_energy * 0.10
		if(current_hp <= 0) current_hp = max_hp * 0.10
		src << output("Você acordou.", "map3d:mostrarNotificacao")
		UpdateVisuals()

	proc/Die(mob/killer)
		if(killer && killer != src)
			killer.kills++
			src << output("<span class='log-hit' style='color:red'>Você foi assassinado por [killer.name]!</span>", "map3d:addLog")
			killer << output("<span class='log-hit' style='color:red'>Você assassinou [src.name]!</span>", "map3d:addLog")
		
		deaths++
		is_fainted = 0
		is_resting = 0
		faint_end_time = 0
		current_hp = max_hp
		current_energy = max_energy
		
		real_x = 8 + (rand(-50, 50) / 100)
		real_z = 5 + (rand(-50, 50) / 100) 
		real_y = 0
		
		src.pending_visuals += list(list("type"="teleport", "x"=real_x, "y"=real_y, "z"=real_z))
		
		src << output("Você morreu e foi revivido pela Enfermeira.", "map3d:mostrarNotificacao")
		
		UpdateVisuals()
		SaveCharacter()
		if(killer) killer.SaveCharacter()

	proc/ToggleRest()
		if(is_attacking || is_fainted) return
		is_resting = !is_resting

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
					if(current_energy <= 0) { current_energy = 0; GoFaint() }
			sleep(REST_INTERVAL)