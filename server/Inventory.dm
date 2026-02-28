// server/Inventory.dm
#define INVENTORY_MAX 12  

var/obj/ground_holder = null 
// --- INÍCIO DA MELHORIA: Starter Items Configuráveis ---
var/global/list/StarterItems = list("sword_wood", "head_bandana")

mob
	proc/SerializeItem(obj/item/I, equipped = 0)
		var/desc_txt = I.description ? I.description : "Sem descrição"
		var/p_str = ""
		if(I.atk > 0)        p_str += "ATK: [I.atk] "
		if(I.ratk > 0)       p_str += "RATK: [I.ratk] "
		if(I.def > 0)        p_str += "DEF: [I.def] "
		if(I.crit_bonus > 0) p_str += "CRIT: +[I.crit_bonus]% "
		if(p_str == "")      p_str = "Visual"
		return list("name"=I.name, "desc"=desc_txt, "ref"="\ref[I]", "amount"=I.amount, "id"=I.id_visual, "power"=p_str, "price"=I.price, "sell_price"=I.sell_price, "equipped"=equipped)

	proc/GiveStarterItems()
		if(src.received_starters) return
		src.received_starters = 1
		
		for(var/i_id in StarterItems)
			var/has_item = 0
			for(var/obj/item/I in contents)
				if(I.item_id == i_id) { has_item = 1; break }
			
			if(!has_item)
				var/obj/item/new_item = new /obj/item(src, i_id)
				if(new_item.slot == "hand" && !slot_hand) EquipItem(new_item)
				else if(new_item.slot == "head" && !slot_head) EquipItem(new_item)
		
		src << output("Itens iniciais verificados!", "map3d:mostrarNotificacao")
	// --- FIM DA MELHORIA ---

	proc/EquipItem(obj/item/I)
		if(!I || !(I in contents)) return
		var/obj/item/old_item = null
		var/success = 0
		if(I.slot == "hand")       { old_item = slot_hand; slot_hand = I; active_item_visual = I.id_visual; success = 1 }
		else if(I.slot == "head")  { old_item = slot_head; slot_head = I; success = 1 }
		else if(I.slot == "body")  { old_item = slot_body; slot_body = I; success = 1 }
		else if(I.slot == "legs")  { old_item = slot_legs; slot_legs = I; success = 1 }
		else if(I.slot == "feet")  { old_item = slot_feet; slot_feet = I; success = 1 }

		if(success)
			contents -= I
			if(old_item) contents += old_item
			if(slot_hand == I) active_item_visual = I.id_visual
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
			if(contents.len >= INVENTORY_MAX) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); return }
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
		
		if(!global.ground_holder) global.ground_holder = new /obj()
		var/obj/item/dropped_item = null

		if(amount_to_drop >= I.amount)
			src.contents -= I 
			I.loc = global.ground_holder 
			I.real_x = src.real_x
			I.real_z = src.real_z
			I.real_y = 0
			global_ground_items |= I
			dropped_item = I
		else
			I.amount -= amount_to_drop
			var/obj/item/NewI = new /obj/item(global.ground_holder, I.item_id)
			NewI.amount = amount_to_drop
			NewI.real_x = src.real_x
			NewI.real_z = src.real_z
			NewI.real_y = 0
			global_ground_items |= NewI
			dropped_item = NewI
			
		if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
		
		SaveWorldState() 
		RequestInventoryUpdate()

		if(dropped_item && dropped_item.despawn_time > 0)
			spawn(dropped_item.despawn_time)
				if(dropped_item && (dropped_item in global_ground_items))
					global_ground_items -= dropped_item
					if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
					SaveWorldState() 
					del(dropped_item)

	proc/TrashItem(obj/item/I)
		if(!I || I == slot_hand || I == slot_head || I == slot_body || I == slot_legs || I == slot_feet) return
		if(I in contents) { src.contents -= I; del(I); RequestInventoryUpdate() }

	proc/PickUpNearestItem()
		var/obj/item/target = null
		var/min_dist = 2.0
		for(var/obj/item/I in global_ground_items)
			if(!I) { global_ground_items -= I; continue } 
			var/dx = I.real_x - src.real_x
			var/dz = I.real_z - src.real_z
			var/dist = sqrt(dx*dx + dz*dz)
			if(dist <= min_dist) { target = I; break }
		if(target)
			var/stacked = 0
			for(var/obj/item/invItem in contents)
				if(invItem.item_id == target.item_id && invItem.amount < invItem.max_stack)
					var/space = invItem.max_stack - invItem.amount
					if(target.amount <= space)
						invItem.amount += target.amount
						global_ground_items -= target
						if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
						SaveWorldState() 
						del(target)
						stacked = 1
						break
			if(!stacked)
				if(contents.len >= INVENTORY_MAX) { src << output("Mochila cheia!", "map3d:mostrarNotificacao"); return }
				global_ground_items -= target
				if(SSserver) SSserver.ground_dirty_tick = SSserver.server_tick
				SaveWorldState() 
				target.loc = src 
				src.contents |= target 
				src << output("Pegou item!", "map3d:mostrarNotificacao")
			RequestInventoryUpdate()

	proc/RequestInventoryUpdate()
		var/list/inv_data = list()
		for(var/obj/item/I in contents)
			if(!I) continue
			inv_data += list(SerializeItem(I, 0))
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
			inv_data += list(SerializeItem(I, 0))

		var/list/eq_data = list()
		var/list/equipped_slots = list(slot_hand, slot_head, slot_body, slot_legs, slot_feet)
		for(var/obj/item/I in equipped_slots)
			if(I) eq_data += list(SerializeItem(I, 1))

		var/list/loot_payload = list("target_name"=src.name, "target_ref"="\ref[src]", "gold"=src.gold, "inventory"=inv_data, "equipped"=eq_data)
		robber << output(json_encode(loot_payload), "map3d:openLootWindow")