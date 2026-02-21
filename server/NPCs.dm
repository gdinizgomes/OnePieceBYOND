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
		patrol_x = real_x  // Salva ponto de origem para limitar patrulha
		patrol_z = real_z
		global_npcs += src
		if(wanders) spawn(5) AI_Loop()

	Del()
		global_npcs -= src
		..()

	var/patrol_x = 0    // Centro da patrulha (definido em New())
	var/patrol_z = 0
	var/patrol_radius = 5.0  // Raio máximo de desvio do ponto de origem

	proc/AI_Loop()
		while(src)
			var/dir = pick(0, 90, 180, 270)
			real_rot = (dir * 3.14159 / 180)
			for(var/i=1 to 10)
				if(dir==0)   real_z-=0.1
				if(dir==180) real_z+=0.1
				if(dir==90)  real_x+=0.1
				if(dir==270) real_x-=0.1
				// Limita ao raio de patrulha e aos limites do mapa
				real_x = clamp(real_x, max(patrol_x - patrol_radius, -29), min(patrol_x + patrol_radius, 29))
				real_z = clamp(real_z, max(patrol_z - patrol_radius, -29), min(patrol_z + patrol_radius, 29))
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
		patrol_x = real_x; patrol_z = real_z  // Vendor não anda, mas inicializa por consistência

		// Usa initial() para ler atributos sem instanciar objetos temporários
		for(var/T in typesof(/obj/item))
			if(T == /obj/item) continue  // Ignora tipo base
			if(initial(T:shop_tags) == "armorer")
				stock += T

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