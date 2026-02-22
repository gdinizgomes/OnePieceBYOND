// server/Network.dm

proc/get_dist_euclid(x1, z1, x2, z2)
	return sqrt((x1-x2)**2 + (z1-z2)**2)

mob
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
			if(!target || !target.client || !target.is_fainted) return
			if(get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) >= 3.0) return
			if(!I) return
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
			var/mob/npc/vendor/nearby_vendor = null
			for(var/mob/npc/vendor/V in global_npcs)
				if(get_dist_euclid(src.real_x, src.real_z, V.real_x, V.real_z) <= 4.0)
					nearby_vendor = V
					break
			if(!nearby_vendor) return  

			var/typepath = text2path(href_list["type"])
			if(!typepath || !ispath(typepath, /obj/item)) return
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

		if(action == "execute_skill" && in_game)
			if(is_resting || is_fainted) return
			var/s_id = href_list["skill_id"]
			
			if(s_id == "_COMMENT_DOCUMENTATION") return
			
			var/list/skill_data = GlobalSkillsData[s_id]
			if(!skill_data) return
			
			if(skill_cooldowns[s_id] && skill_cooldowns[s_id] > world.time) return
			var/cost = skill_data["energyCost"]
			if(!cost) cost = 0
			if(!ConsumeEnergy(cost)) return
			
			if(skill_data["cooldown"]) skill_cooldowns[s_id] = world.time + round(skill_data["cooldown"] / 100)
			
			is_attacking = 1
			attack_type = s_id
			combo_step = text2num(href_list["step"])
			if(!combo_step) combo_step = 1
			
			if(href_list["rot"]) src.real_rot = text2num(href_list["rot"])
			
			hit_targets_this_swing = list()
			
			if(skill_data["type"] == "projectile") 
				max_targets_per_swing = skill_data["pierce"] ? 10 : 1
				projectile_window = world.time + 30 
				if(skill_data["visualDef"])
					if(SSserver) SSserver.global_events += list(list("type" = "skill_cast", "skill" = s_id, "caster" = "\ref[src]", "x" = src.real_x, "z" = src.real_z))
			else 
				max_targets_per_swing = 3
				attack_window = world.time + 10 
				
			active_skill_hits["[s_id]"] = list()
			spawn(3) is_attacking = 0

		if(action == "register_hit" && in_game)
			var/s_id = href_list["skill_id"]
			if(s_id == "_COMMENT_DOCUMENTATION") return
			
			var/list/skill_data = GlobalSkillsData[s_id]
			if(!skill_data) return
			
			var/target_ref = href_list["target_ref"]
			var/c_step = text2num(href_list["step"])
			if(!c_step) c_step = 1
			
			if(skill_data["type"] == "projectile") { if(world.time > projectile_window) return }
			else { if(world.time > attack_window) return }
			
			var/mob/target = locate(target_ref)
			if(!target || target == src) return

			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "vendor" || N.npc_type == "nurse") return 

			if(target.client && target.is_fainted)
				if(get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z) < 4.0)
					if(src.lethality_mode == 1) target.Die(src) 
					else src << output("\ref[target]", "map3d:askKillConfirm")
				return 

			if(target in hit_targets_this_swing) return 
			if(hit_targets_this_swing.len >= max_targets_per_swing) return 

			var/max_dist = skill_data["range"]
			if(!max_dist) max_dist = 5.0
			
			var/dist = get_dist_euclid(src.real_x, src.real_z, target.real_x, target.real_z)
			if(dist > max_dist + 5.0) return 

			if(dist > 0.1 && skill_data["type"] == "melee") 
				var/list/combos = skill_data["combos"]
				if(combos && c_step <= combos.len)
					var/list/combo = combos[c_step] 
					var/list/hb = combo["hitbox"]
					
					var/box_wid = hb["x"]
					var/box_len = hb["z"]
					var/fwd_off = combo["offset"]

					var/dx = target.real_x - src.real_x
					var/dz = target.real_z - src.real_z

					var/rot_deg = src.real_rot * 57.2957795
					var/s = sin(rot_deg)
					var/c = cos(rot_deg)

					var/local_z = (dx * s) + (dz * c)
					var/local_x = (dx * c) - (dz * s)

					var/pad_w = 1.0 
					var/pad_l = 1.5 
					var/half_l = (box_len / 2) + pad_l
					var/half_w = (box_wid / 2) + pad_w

					if(abs(local_z - fwd_off) > half_l || abs(local_x) > half_w)
						src << output("<span style='color:red'><b>Servidor:</b> Hit Negado - OBB Matemática.</span>", "map3d:addLog")
						return 
				else return

			var/list/already_hit = active_skill_hits["[s_id]"]
			if(already_hit && (target in already_hit)) return 
			if(!already_hit) already_hit = list()
			already_hit += target
			active_skill_hits["[s_id]"] = already_hit
			hit_targets_this_swing += target

			var/target_flee = 0
			var/target_def = 0
			if(istype(target, /mob/npc))
				var/mob/npc/N = target; target_flee = N.level * 2; target_def = N.level * 2
			else
				var/mob/T = target; target_flee = T.calc_flee; target_def = T.calc_def
			
			if(skill_data["scaling"] == "physical" || skill_data["scaling"] == "ranged")
				var/hit_chance = calc_hit - target_flee
				if(hit_chance < 5) hit_chance = 5
				if(hit_chance > 100) hit_chance = 100
				if(rand(1, 100) > hit_chance)
					src << output("<span class='log-hit' style='color:#95a5a6'>Errou o alvo! (Esquiva)</span>", "map3d:addLog")
					return 

			// =========================================================================
			// CORREÇÃO CRÍTICA: MATEMÁTICA ESTRITA (Fim do Escalonamento Quadrático)
			// =========================================================================

			var/base_dmg = skill_data["power"]
			if(!base_dmg) base_dmg = 0
			
			var/s_lvl = 1
			if(s_id == "basic_sword") s_lvl = prof_sword_lvl
			else if(s_id == "basic_kick") s_lvl = prof_kick_lvl
			else if(s_id == "basic_fist") s_lvl = prof_punch_lvl
			else if(s_id == "basic_gun") s_lvl = prof_gun_lvl

			// Calcula a soma dos atributos influentes
			var/stat_sum = 0
			var/list/weights = skill_data["statWeights"]
			if(weights && istype(weights, /list))
				if(weights["str"]) stat_sum += src.strength * weights["str"]
				if(weights["agi"]) stat_sum += src.agility * weights["agi"]
				if(weights["vit"]) stat_sum += src.vitality * weights["vit"]
				if(weights["dex"]) stat_sum += src.dexterity * weights["dex"]
				if(weights["von"]) stat_sum += src.willpower * weights["von"]
				if(weights["sor"]) stat_sum += src.luck * weights["sor"]
			if(stat_sum < 1) stat_sum = 1 

			var/level_scale = skill_data["levelScale"]
			if(!level_scale) level_scale = 0

			// Extrai apenas o ataque da arma de forma linear
			var/equip_atk = 0
			if(skill_data["scaling"] == "physical" && slot_hand && istype(slot_hand, /obj/item/weapon))
				equip_atk = slot_hand:atk
			else if(skill_data["scaling"] == "ranged" && slot_hand && istype(slot_hand, /obj/item/weapon))
				equip_atk = slot_hand:ratk

			// FÓRMULA PEDIDA: Power * (Weights_Sum) + (Level * Coef) + Weapon
			var/raw_damage = (base_dmg * stat_sum) + (s_lvl * level_scale) + equip_atk

			var/damage_mult = 1.0
			if(skill_data["type"] == "melee")
				var/list/combos = skill_data["combos"]
				if(combos && c_step <= combos.len)
					var/list/combo = combos[c_step]
					if(combo["damageMult"]) damage_mult = combo["damageMult"]

			var/damage = round((raw_damage * damage_mult) + rand(0, 3))
			
			var/is_crit = 0
			if(rand(1, 100) <= calc_crit)
				is_crit = 1
				damage = round(damage * 1.5) 
				
			var/def_reduction = round(target_def * (skill_data["scaling"] == "magical" ? 0.4 : 0.5))
			damage -= def_reduction
			if(damage < 1) damage = 1
			
			// =========================================================================

			var/crit_txt = is_crit ? " <b style='color:#f1c40f'>CRÍTICO!</b>" : ""
			src.pending_visuals += list(list("type"="dmg", "val"=damage, "tid"=target_ref))

			var/xp_type = ""
			if(s_id == "basic_sword") xp_type = "sword"
			else if(s_id == "basic_kick") xp_type = "kick"
			else if(s_id == "basic_fist") xp_type = "fist"
			else if(s_id == "basic_gun") xp_type = "gun"

			if(istype(target, /mob/npc))
				var/mob/npc/N = target
				if(N.npc_type == "prop")
					src << output("<span class='log-hit' style='color:orange'>TREINO: [damage] dmg[crit_txt]</span>", "map3d:addLog")
					GainExperience(5)
					if(xp_type != "") GainWeaponExp(xp_type, 3)
				else
					src << output("<span class='log-hit'>HIT em [N.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
					N.current_hp -= damage
					if(N.current_hp <= 0)
						src << output("<span class='log-hit' style='color:red'>[N.name] eliminado!</span>", "map3d:addLog")
						N.current_hp = N.max_hp; N.real_x = rand(-10, 10); N.real_z = rand(-10, 10)
					GainExperience(10)
					if(xp_type != "") GainWeaponExp(xp_type, 5)
			else 
				var/mob/T = target
				src << output("<span class='log-hit'>HIT em [T.name]! Dano: [damage][crit_txt]</span>", "map3d:addLog")
				T << output("<span class='log-hit' style='color:red'>Você recebeu [damage] de dano de [src.name]![crit_txt]</span>", "map3d:addLog")
				T.current_hp -= damage
				
				if(T.current_hp <= 0)
					if(src.lethality_mode == 1) T.Die(src)
					else { src << output("<span class='log-hit' style='color:orange'>Você derrotou [T.name]! Ele está desmaiado.</span>", "map3d:addLog"); T.GoFaint() }
				
				GainExperience(10)
				if(xp_type != "") GainWeaponExp(xp_type, 5)
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