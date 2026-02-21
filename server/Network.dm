// server/Network.dm

// Proc global reutilizável — elimina duplicação em Combat/Inventory/World3D
proc/get_dist_euclid(x1, z1, x2, z2)
	return sqrt((x1-x2)**2 + (z1-z2)**2)

mob
	// Alias de instância para compatibilidade com chamadas existentes
	proc/get_dist_euclid(x1, z1, x2, z2)
		return ::get_dist_euclid(x1, z1, x2, z2)

	Topic(href, href_list[])
		..()
		var/action = href_list["action"]
		
		if(action == "request_skills")
			var/skills_text = "{}"
			if(GlobalSkillsData && GlobalSkillsData.len > 0)
				skills_text = json_encode(GlobalSkillsData)
			src << output(skills_text, "map3d:receberSkills")
		
		if(action == "request_slots")
			var/list/slots_data = list()
			for(var/i=1 to 3)
				if(fexists("[SAVE_DIR][src.ckey]_slot[i].sav"))
					var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[i].sav")
					var/n; var/l; var/g; var/ge
					F["name"] >> n; F["level"] >> l; F["gold"] >> g; 
					if(F["gender"]) F["gender"] >> ge; else ge = "Male"
					slots_data["slot[i]"] = list("name"=n, "lvl"=l, "gold"=g, "gender"=ge)
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
			src.name = href_list["name"]
			src.skin_color = href_list["skin"]
			src.cloth_color = href_list["cloth"]
			src.char_gender = href_list["gender"] 
			src.level = 1; src.gold = 10000 
			src.real_x = 0; src.real_y = 0; src.real_z = 0
			current_slot = slot
			SaveCharacter()
			StartGame(slot)

		if(action == "force_save" && in_game) SaveCharacter()

		if(action == "toggle_lethal" && in_game)
			if(lethality_mode == 0) { lethality_mode = 1; src << output("Modo Letalidade ON", "map3d:mostrarNotificacao") }
			else { lethality_mode = 0; src << output("Modo Letalidade OFF", "map3d:mostrarNotificacao") }

		if(action == "update_pos" && in_game)
			if(!is_fainted)
				var/new_x = text2num(href_list["x"])
				var/new_y = text2num(href_list["y"])
				var/new_z = text2num(href_list["z"])
				var/new_rot = text2num(href_list["rot"])

				var/dist = get_dist_euclid(src.real_x, src.real_z, new_x, new_z)
				var/max_allowed = (calc_move_speed * 1.5) * 30
				if(max_allowed < 3.0) max_allowed = 3.0 
				if(dist > max_allowed) return 
				
				real_x = new_x; real_y = new_y; real_z = new_z; real_rot = new_rot
				if(real_x > 29) real_x = 29; if(real_x < -29) real_x = -29
				if(real_z > 29) real_z = 29; if(real_z < -29) real_z = -29

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

		if(action == "trash_item" && in_game)
			var/ref_id = href_list["ref"]
			var/obj/item/I = locate(ref_id)
			if(I && (I in contents)) TrashItem(I)

		if(action == "pick_up" && in_game) PickUpNearestItem()

		if(action == "interact_npc" && in_game)
			var/ref_id = href_list["ref"]
			var/mob/M = locate(ref_id)
			if(M && get_dist_euclid(src.real_x, src.real_z, M.real_x, M.real_z) < 3.0)
				if(istype(M, /mob/npc/vendor))
					var/mob/npc/vendor/V = M
					var/list/shop_items = list()
					for(var/path in V.stock)
						var/obj/item/tmpI = new path()
						shop_items += list(list("name"=tmpI.name, "id"=tmpI.id_visual, "price"=tmpI.price, "desc"=tmpI.description, "typepath"=path))
						del(tmpI) 
					src << output(json_encode(shop_items), "map3d:openShop")
					RequestInventoryUpdate()
				else if(istype(M, /mob/npc/nurse))
					src.current_hp = src.max_hp
					src.current_energy = src.max_energy
					src.is_fainted = 0
					src.faint_end_time = 0
					src << output("Enfermeira: Você foi curado!", "map3d:mostrarNotificacao")
				
				else if(M.client && M.is_fainted)
					M.SendLootWindow(src)

		if(action == "rob_item" && in_game)
			var/mob/target = locate(href_list["target"])
			var/obj/item/I = locate(href_list["ref"])
			// Revalida que alvo ainda está desmaiado no momento do processamento (evita race condition de lag)
			if(!target || !target.client || !target.is_fainted) return
			if(get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) >= 3.0) return
			if(!I) return
			// Item precisa estar no inventário (equipado ou na bolsa) do alvo
			if(I == target.slot_hand)       target.UnequipItem("hand")
			else if(I == target.slot_head)  target.UnequipItem("head")
			else if(I == target.slot_body)  target.UnequipItem("body")
			else if(I == target.slot_legs)  target.UnequipItem("legs")
			else if(I == target.slot_feet)  target.UnequipItem("feet")
			if(I in target.contents)
				target.DropItem(I, I.amount)
				src << output("Você roubou/dropou [I.name].", "map3d:mostrarNotificacao")
				target.SendLootWindow(src)

		if(action == "rob_gold" && in_game)
			var/mob/target = locate(href_list["target"])
			if(target && target.client && target.is_fainted && get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) < 3.0)
				if(target.gold > 0)
					src.gold += target.gold
					src << output("Você roubou [target.gold] Berries!", "map3d:mostrarNotificacao")
					target.gold = 0
					target.SendLootWindow(src)

		if(action == "confirm_kill" && in_game)
			var/mob/target = locate(href_list["target"])
			if(target && target.client && target.is_fainted && get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) < 4.0)
				target.Die(src)

		if(action == "buy_item" && in_game)
			// Segurança: verificar se há vendor próximo antes de processar compra
			var/mob/npc/vendor/nearby_vendor = null
			for(var/mob/npc/vendor/V in global_npcs)
				if(get_dist_euclid(src.real_x, src.real_z, V.real_x, V.real_z) <= 4.0)
					nearby_vendor = V
					break
			if(!nearby_vendor) return  // Sem vendor próximo — possível exploit

			// Segurança: whitelist — somente subtipos de /obj/item são válidos
			var/typepath = text2path(href_list["type"])
			if(!typepath || !ispath(typepath, /obj/item)) return

			// Segurança: verificar que o item está no estoque do vendor
			if(!(typepath in nearby_vendor.stock)) return

			var/obj/item/temp = new typepath()
			if(src.gold >= temp.price)
				if(contents.len >= INVENTORY_MAX) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); del(temp) }
				else
					src.gold -= temp.price
					temp.loc = src
					src << output("Comprou [temp.name]!", "map3d:mostrarNotificacao")
					RequestInventoryUpdate()
			else { src << output("Ouro insuficiente!", "map3d:mostrarNotificacao"); del(temp) }

		if(action == "sell_item" && in_game)
			var/ref_id = href_list["ref"]
			var/obj/item/I = locate(ref_id)
			if(I && (I in contents))
				if(I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet)
					src << output("Desequipe antes de vender!", "map3d:mostrarNotificacao")
				else
					var/val = round(I.price / 10)
					if(val < 1) val = 1
					src.gold += val
					src << output("Vendeu [I.name] por [val] Berries.", "map3d:mostrarNotificacao")
					del(I)
					RequestInventoryUpdate()

		if(action == "cast_skill" && in_game)
			var/s_id = href_list["skill_id"]
			if(!(s_id in unlocked_skills)) return 
			
			var/list/skill_data = GlobalSkillsData[s_id]
			if(!skill_data) return
			
			if(skill_cooldowns[s_id] && skill_cooldowns[s_id] > world.time) return 
			if(!ConsumeEnergy(skill_data["energyCost"])) return 
			
			skill_cooldowns[s_id] = world.time + round(skill_data["cooldown"] / 100)
			src.pending_visuals += list(list("type"="skill_cast_accept", "skill"=s_id))
			
			if(SSserver)
				SSserver.global_events += list(list("type" = "skill_cast", "skill" = s_id, "caster" = "\ref[src]", "x" = src.real_x, "z" = src.real_z))
			
			active_skill_hits["[s_id]"] = list()


		if(action == "register_skill_hit" && in_game)
			var/s_id = href_list["skill_id"]
			var/mob/target = locate(href_list["target_ref"])
			
			if(!target || !(s_id in unlocked_skills) || target == src) return 
			
			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "vendor" || N.npc_type == "nurse") return 

			var/list/skill_data = GlobalSkillsData[s_id]
			if(!skill_data) return
			
			var/list/already_hit = active_skill_hits["[s_id]"]
			if(already_hit && (target in already_hit)) return 
			if(!already_hit) already_hit = list()
			already_hit += target
			active_skill_hits["[s_id]"] = already_hit
			
			var/base_dmg = skill_data["power"]
			var/mult = skill_data["mult"]
			var/damage = round(base_dmg + (src.willpower * mult) + rand(0, 5))
			
			var/target_def = 0
			if(istype(target, /mob/npc))
				var/mob/npc/N = target; target_def = N.level * 2
			else
				var/mob/T = target; target_def = T.calc_def
			
			var/def_reduction = round(target_def * 0.4) 
			damage -= def_reduction
			if(damage < 1) damage = 1
			
			var/is_crit = 0
			if(rand(1, 100) <= calc_crit) { is_crit = 1; damage = round(damage * 1.5) }
			var/crit_txt = ""
			if(is_crit) crit_txt = " <b style='color:#f1c40f'>CRÍTICO MAG!</b>"

			src.pending_visuals += list(list("type"="dmg", "val"=damage, "tid"="\ref[target]"))

			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "prop")
					src << output("<span class='log-hit' style='color:#e74c3c'>[N.name]: [damage] dmg[crit_txt]</span>", "map3d:addLog")
					GainExperience(5)
				else
					src << output("<span class='log-hit'>HIT MÁGICO em [N.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
					N.current_hp -= damage
					if(N.current_hp <= 0)
						src << output("<span class='log-hit' style='color:red'>[N.name] eliminado!</span>", "map3d:addLog")
						N.current_hp = N.max_hp; N.real_x = rand(-10, 10); N.real_z = rand(-10, 10)
					GainExperience(10)
			else 
				var/mob/T = target
				src << output("<span class='log-hit'>HIT MÁGICO em [T.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
				T << output("<span class='log-hit' style='color:red'>Você recebeu [damage] de dano mágico de [src.name]![crit_txt]</span>", "map3d:addLog")
				T.current_hp -= damage
				
				if(T.current_hp <= 0)
					if(src.lethality_mode == 1) T.Die(src)
					else { src << output("<span class='log-hit' style='color:orange'>Você derrotou [T.name]! Ele está desmaiado.</span>", "map3d:addLog"); T.GoFaint() }
				GainExperience(10)
				T.UpdateVisuals()

		if(action == "attack" && in_game)
			if(is_resting || is_fainted) return
			var/base_cost = max_energy * 0.03
			if(ConsumeEnergy(base_cost))
				is_attacking = 1; attack_type = href_list["type"]; combo_step = text2num(href_list["step"]) 
				if(!combo_step) combo_step = 1
				
				hit_targets_this_swing = list()
				if(attack_type == "gun") { max_targets_per_swing = 1; projectile_window = world.time + 30 }
				else { if(attack_type == "sword") max_targets_per_swing = 3; else max_targets_per_swing = 1; attack_window = world.time + 10 }
				
				spawn(3) is_attacking = 0

		if(action == "register_hit" && in_game)
			var/target_ref = href_list["target_ref"]
			var/hit_type = href_list["hit_type"]
			
			if(hit_type == "projectile") { if(world.time > projectile_window) return }
			else { if(world.time > attack_window) return }
			
			var/mob/target = locate(target_ref)
			if(!target) return

			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "vendor" || N.npc_type == "nurse") return 

			if(target.client && target.is_fainted)
				if(get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) < 4.0)
					if(src.lethality_mode == 1)
						target.Die(src) 
					else
						src << output("\ref[target]", "map3d:askKillConfirm")
				return 

			if(target in hit_targets_this_swing) return 
			if(hit_targets_this_swing.len >= max_targets_per_swing) return 

			var/max_dist = 3.0 
			var/skill_exp_type = ""
			
			if(hit_type == "projectile")
				if(slot_hand && istype(slot_hand, /obj/item/weapon)) { max_dist = slot_hand:range + 5; skill_exp_type = "gun" }
				else return
			else if(hit_type == "melee")
				if(attack_type == "sword")
					if(slot_hand && istype(slot_hand, /obj/item/weapon)) { max_dist = slot_hand:range + 2; skill_exp_type = "sword" }
				else if(attack_type == "kick") { max_dist = 3.5; skill_exp_type = "kick" }
				else { max_dist = 2.5; skill_exp_type = "fist" }
			
			var/dist = get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z)
			if(dist > max_dist) return

			var/target_flee = 0
			var/target_def = 0
			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				target_flee = N.level * 2 
				target_def = N.level * 2
			else
				var/mob/T = target
				target_flee = T.calc_flee
				target_def = T.calc_def
			
			var/hit_chance = calc_hit - target_flee
			if(hit_chance < 5) hit_chance = 5
			if(hit_chance > 100) hit_chance = 100
			
			if(rand(1, 100) > hit_chance)
				src << output("<span class='log-hit' style='color:#95a5a6'>Errou o alvo! (Esquiva)</span>", "map3d:addLog")
				return 
			
			hit_targets_this_swing += target

			var/prof_bonus = 0
			if(skill_exp_type == "sword") prof_bonus = prof_sword_lvl * 2
			else if(skill_exp_type == "gun") prof_bonus = prof_gun_lvl * 2
			else if(skill_exp_type == "kick") prof_bonus = prof_kick_lvl * 2
			else prof_bonus = prof_punch_lvl * 2

			var/base_dmg = 0
			if(skill_exp_type == "gun") base_dmg = calc_ratk
			else base_dmg = calc_atk

			var/damage = base_dmg + prof_bonus + rand(0, 3)
			var/damage_mult = 1.0
			var/c_step = text2num(href_list["combo"])
			if(c_step == 3) damage_mult = 1.2
			
			var/is_crit = 0
			if(rand(1, 100) <= calc_crit)
				is_crit = 1
				damage_mult += 0.5 
				
			damage = round(damage * damage_mult)
			
			var/def_reduction = round(target_def * 0.5)
			damage -= def_reduction
			if(damage < 1) damage = 1
			
			var/crit_txt = ""
			if(is_crit) crit_txt = " <b style='color:#f1c40f'>CRÍTICO!</b>"

			src.pending_visuals += list(list("type"="dmg", "val"=damage, "tid"=target_ref))

			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "prop")
					var/msg = "TREINO: [damage] dmg[crit_txt]"
					if(c_step == 3) msg = "COMBO: [damage] dmg[crit_txt]!"
					src << output("<span class='log-hit' style='color:orange'>[msg]</span>", "map3d:addLog")
					GainExperience(5)
					if(skill_exp_type) GainWeaponExp(skill_exp_type, 3)
				else
					src << output("<span class='log-hit'>HIT em [N.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
					N.current_hp -= damage
					if(N.current_hp <= 0)
						src << output("<span class='log-hit' style='color:red'>[N.name] eliminado!</span>", "map3d:addLog")
						N.current_hp = N.max_hp
						N.real_x = rand(-10, 10)
						N.real_z = rand(-10, 10)
					GainExperience(10)
					if(skill_exp_type) GainWeaponExp(skill_exp_type, 5)
			else 
				var/mob/T = target
				src << output("<span class='log-hit'>HIT em [T.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
				T << output("<span class='log-hit' style='color:red'>Você recebeu [damage] de dano de [src.name]![crit_txt]</span>", "map3d:addLog")
				T.current_hp -= damage
				
				if(T.current_hp <= 0)
					if(src.lethality_mode == 1)
						T.Die(src)
					else
						src << output("<span class='log-hit' style='color:orange'>Você derrotou [T.name]! Ele está desmaiado.</span>", "map3d:addLog")
						T.GoFaint()
				
				GainExperience(10)
				if(skill_exp_type) GainWeaponExp(skill_exp_type, 5)
				T.UpdateVisuals()

		if(action == "add_stat" && in_game)
			if(stat_points > 0)
				var/s = href_list["stat"]
				if(s == "str") strength++
				if(s == "vit") vitality++
				if(s == "agi") agility++
				if(s == "dex") dexterity++
				if(s == "von") willpower++
				if(s == "sor") luck++
				stat_points--
				RecalculateStats()
				src << output("Ponto adicionado em [s]!", "map3d:mostrarNotificacao")