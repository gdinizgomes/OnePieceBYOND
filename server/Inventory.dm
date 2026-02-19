// server/Inventory.dm
mob
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
		if(I.slot == "hand") { if(slot_hand) UnequipItem("hand"); slot_hand = I; active_item_visual = I.id_visual; success = 1 }
		else if(I.slot == "head") { if(slot_head) UnequipItem("head"); slot_head = I; success = 1 }
		else if(I.slot == "body") { if(slot_body) UnequipItem("body"); slot_body = I; success = 1 }
		else if(I.slot == "legs") { if(slot_legs) UnequipItem("legs"); slot_legs = I; success = 1 }
		else if(I.slot == "feet") { if(slot_feet) UnequipItem("feet"); slot_feet = I; success = 1 }
			
		if(success)
			contents -= I
			src << output("Equipou [I.name].", "map3d:mostrarNotificacao")
			RecalculateStats()
			UpdateVisuals()
			RequestInventoryUpdate()
			RequestStatusUpdate()

	proc/UnequipItem(slot_name)
		var/obj/item/I = null
		if(slot_name == "hand") I = slot_hand
		else if(slot_name == "head") I = slot_head
		else if(slot_name == "body") I = slot_body
		else if(slot_name == "legs") I = slot_legs
		else if(slot_name == "feet") I = slot_feet
		
		if(I)
			if(contents.len >= 12) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); return }
			if(slot_name == "hand") { slot_hand = null; active_item_visual = ""; }
			else if(slot_name == "head") slot_head = null
			else if(slot_name == "body") slot_body = null
			else if(slot_name == "legs") slot_legs = null
			else if(slot_name == "feet") slot_feet = null
			
			contents += I
			src << output("Desequipou [I.name].", "map3d:mostrarNotificacao")
			RecalculateStats()
			UpdateVisuals()
			RequestInventoryUpdate()
			RequestStatusUpdate()

	proc/DropItem(obj/item/I, amount_to_drop)
		if(!I || I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) return
		if(!(I in contents)) return
		if(amount_to_drop >= I.amount)
			I.loc = locate(1,1,1)
			I.real_x = src.real_x
			I.real_z = src.real_z
			I.real_y = 0
			global_ground_items |= I
			if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
		else
			I.amount -= amount_to_drop
			var/obj/item/NewI = new I.type(locate(1,1,1))
			NewI.amount = amount_to_drop
			NewI.real_x = src.real_x
			NewI.real_z = src.real_z
			NewI.real_y = 0
			global_ground_items |= NewI
			if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
		RequestInventoryUpdate()

	proc/TrashItem(obj/item/I)
		if(!I || I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) return
		if(I in contents) { del(I); RequestInventoryUpdate() }

	proc/PickUpNearestItem()
		var/obj/item/target = null
		var/min_dist = 2.0
		for(var/obj/item/I in global_ground_items)
			if(I.loc == null || !isturf(I.loc)) { global_ground_items -= I; continue }
			var/dx = I.real_x - src.real_x
			var/dz = I.real_z - src.real_z
			var/dist = sqrt(dx*dx + dz*dz)
			if(dist <= min_dist) { target = I; break }
		if(target)
			var/stacked = 0
			for(var/obj/item/invItem in contents)
				if(invItem.type == target.type && invItem.amount < invItem.max_stack)
					var/space = invItem.max_stack - invItem.amount
					if(target.amount <= space)
						invItem.amount += target.amount
						global_ground_items -= target
						if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
						del(target)
						stacked = 1
						break
			if(!stacked)
				if(contents.len >= 12) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); return }
				global_ground_items -= target
				if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
				target.loc = src
				src << output("Pegou item!", "map3d:mostrarNotificacao")
			RequestInventoryUpdate()

	proc/RequestInventoryUpdate()
		var/list/inv_data = list()
		for(var/obj/item/I in contents)
			if(!I) continue
			var/desc_txt = I.description
			if(!desc_txt) desc_txt = "Sem descrição"
			
			var/p_str = ""
			if(I.atk > 0) p_str += "ATK: [I.atk] "
			if(I.ratk > 0) p_str += "RATK: [I.ratk] "
			if(I.def > 0) p_str += "DEF: [I.def] "
			if(I.crit_bonus > 0) p_str += "CRIT: +[I.crit_bonus]% "
			if(p_str == "") p_str = "Visual"
			
			inv_data += list(list("name" = I.name, "desc" = desc_txt, "ref" = "\ref[I]", "amount" = I.amount, "id" = I.id_visual, "power" = p_str, "price" = I.price, "equipped" = 0))
		src << output(json_encode(inv_data), "map3d:loadInventory")

	proc/RequestStatusUpdate()
		var/list/eq_data = list("hand" = null, "head" = null, "body" = null, "legs" = null, "feet" = null)
		if(slot_hand) eq_data["hand"] = list("id"=slot_hand.id_visual, "ref"="\ref[slot_hand]", "name"=slot_hand.name)
		if(slot_head) eq_data["head"] = list("id"=slot_head.id_visual, "ref"="\ref[slot_head]", "name"=slot_head.name)
		if(slot_body) eq_data["body"] = list("id"=slot_body.id_visual, "ref"="\ref[slot_body]", "name"=slot_body.name)
		if(slot_legs) eq_data["legs"] = list("id"=slot_legs.id_visual, "ref"="\ref[slot_legs]", "name"=slot_legs.name)
		if(slot_feet) eq_data["feet"] = list("id"=slot_feet.id_visual, "ref"="\ref[slot_feet]", "name"=slot_feet.name)

		var/list/stat_data = list("nick" = src.name, "class" = char_class, "title" = char_title, "lvl" = src.level, "equip" = eq_data)
		src << output(json_encode(stat_data), "map3d:updateStatusMenu")

	proc/SendLootWindow(mob/robber)
		var/list/inv_data = list()
		for(var/obj/item/I in contents)
			if(!I) continue
			inv_data += list(list("name"=I.name, "ref"="\ref[I]", "amount"=I.amount, "id"=I.id_visual, "equipped"=0))
		
		var/list/eq_data = list()
		if(slot_hand) eq_data += list(list("name"=slot_hand.name, "ref"="\ref[slot_hand]", "amount"=1, "id"=slot_hand.id_visual, "equipped"=1))
		if(slot_head) eq_data += list(list("name"=slot_head.name, "ref"="\ref[slot_head]", "amount"=1, "id"=slot_head.id_visual, "equipped"=1))
		if(slot_body) eq_data += list(list("name"=slot_body.name, "ref"="\ref[slot_body]", "amount"=1, "id"=slot_body.id_visual, "equipped"=1))
		if(slot_legs) eq_data += list(list("name"=slot_legs.name, "ref"="\ref[slot_legs]", "amount"=1, "id"=slot_legs.id_visual, "equipped"=1))
		if(slot_feet) eq_data += list(list("name"=slot_feet.name, "ref"="\ref[slot_feet]", "amount"=1, "id"=slot_feet.id_visual, "equipped"=1))
		
		var/list/loot_payload = list("target_name" = src.name, "target_ref" = "\ref[src]", "gold" = src.gold, "inventory" = inv_data, "equipped" = eq_data)
		robber << output(json_encode(loot_payload), "map3d:openLootWindow")