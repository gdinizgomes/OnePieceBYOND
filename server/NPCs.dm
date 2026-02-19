// server/NPCs.dm
// Lógica de Inteligência Artificial e Tipos de NPCs

mob/npc
	in_game = 1
	char_loaded = 1
	var/npc_type = "base"
	var/wanders = 1 
	char_gender = "Female"
	
	New()
		..()
		real_y = 0
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
				if(dir==0) real_z-=0.1; if(dir==180) real_z+=0.1
				if(dir==90) real_x+=0.1; if(dir==270) real_x-=0.1
				sleep(1)
			sleep(rand(20, 50))

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
	
	New()
		..()
		real_x = 2
		real_z = 2
		real_y = 0
		real_rot = 3.14
		
		for(var/T in typesof(/obj/item))
			var/obj/item/temp = new T()
			if(temp.shop_tags == "armorer")
				stock += T
			del(temp)

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

mob/npc/dummy
	name = "Pirata de Teste"
	npc_type = "enemy"
	skin_color = "00FF00"
	cloth_color = "0000FF"
	level = 5 
	wanders = 1
	New()
		..()
		real_x = rand(-10, 10); real_z = rand(-10, 10)
		max_hp = 150
		current_hp = 150