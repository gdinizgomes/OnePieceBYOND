// server/Persistence.dm
// Módulo de Gerenciamento de Dados, Salvamento e Carregamento (Save/Load)

// Incremente este número ao mudar qualquer campo de save para detectar migração necessária
#define SAVE_VERSION 2

mob
	proc/AutoSaveLoop()
		while(src && in_game)
			SaveCharacter()
			sleep(300)

	proc/SaveCharacter()
		if(!current_slot || !in_game) return
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[current_slot].sav")
		F["save_version"] << SAVE_VERSION  // Versionamento para detectar saves incompatíveis
		F["name"] << src.name
		F["level"] << src.level
		F["exp"] << src.experience
		F["req_exp"] << src.req_experience
		F["stat_pts"] << src.stat_points
		F["gold"] << src.gold
		F["hp"] << src.current_hp
		F["en"] << src.current_energy
		F["str"] << src.strength
		F["vit"] << src.vitality
		F["agi"] << src.agility
		F["dex"] << src.dexterity
		F["von"] << src.willpower
		F["sor"] << src.luck
		F["p_punch"] << prof_punch_lvl
		F["exp_punch"] << prof_punch_exp
		F["p_kick"] << prof_kick_lvl
		F["exp_kick"] << prof_kick_exp
		F["p_sword"] << prof_sword_lvl
		F["exp_sword"] << prof_sword_exp
		F["p_gun"] << prof_gun_lvl
		F["exp_gun"] << prof_gun_exp
		F["pos_x"] << src.real_x
		F["pos_y"] << src.real_y
		F["pos_z"] << src.real_z
		F["skin"] << src.skin_color
		F["cloth"] << src.cloth_color
		F["inventory"] << src.contents
		F["slot_hand"] << src.slot_hand
		F["slot_head"] << src.slot_head
		F["slot_body"] << src.slot_body
		F["slot_legs"] << src.slot_legs
		F["slot_feet"] << src.slot_feet
		F["gender"] << src.char_gender
		F["kills"] << src.kills
		F["deaths"] << src.deaths
		src << output("Salvo!", "map3d:mostrarNotificacao")

	proc/LoadCharacter(slot)
		if(!fexists("[SAVE_DIR][src.ckey]_slot[slot].sav")) return 0
		var/savefile/F = new("[SAVE_DIR][src.ckey]_slot[slot].sav")

		// Leitura com valores padrão em todas as variáveis (padronizado)
		if(F["name"])     F["name"]     >> src.name;     else src.name = "Sem nome"
		if(F["level"])    F["level"]    >> src.level;    else src.level = 1
		if(F["exp"])      F["exp"]      >> src.experience; else src.experience = 0
		if(F["stat_pts"]) F["stat_pts"] >> src.stat_points; else src.stat_points = 0
		if(F["gold"])     F["gold"]     >> src.gold;     else src.gold = 0
		if(F["hp"])       F["hp"]       >> src.current_hp; else src.current_hp = 50
		if(F["en"])       F["en"]       >> src.current_energy; else src.current_energy = 50
		if(F["str"])      F["str"]      >> src.strength;  else src.strength = 5
		if(F["vit"])      F["vit"]      >> src.vitality;  else src.vitality = 5
		if(F["agi"])      F["agi"]      >> src.agility;   else src.agility = 5
		if(F["dex"])      F["dex"]      >> src.dexterity; else src.dexterity = 5
		if(F["von"])      F["von"]      >> src.willpower; else src.willpower = 5
		if(F["sor"])      F["sor"]      >> src.luck;      else src.luck = 5
		if(F["p_punch"])  F["p_punch"]  >> prof_punch_lvl;  else prof_punch_lvl = 1
		if(F["exp_punch"]) F["exp_punch"] >> prof_punch_exp; else prof_punch_exp = 0
		if(F["p_kick"])   F["p_kick"]   >> prof_kick_lvl;   else prof_kick_lvl = 1
		if(F["exp_kick"]) F["exp_kick"] >> prof_kick_exp;   else prof_kick_exp = 0
		if(F["p_sword"])  F["p_sword"]  >> prof_sword_lvl;  else prof_sword_lvl = 1
		if(F["exp_sword"]) F["exp_sword"] >> prof_sword_exp; else prof_sword_exp = 0
		if(F["p_gun"])    F["p_gun"]    >> prof_gun_lvl;    else prof_gun_lvl = 1
		if(F["exp_gun"])  F["exp_gun"]  >> prof_gun_exp;    else prof_gun_exp = 0
		if(F["pos_x"])    F["pos_x"]    >> src.real_x;  else src.real_x = 0
		if(F["pos_y"])    F["pos_y"]    >> src.real_y;  else src.real_y = 0
		if(F["pos_z"])    F["pos_z"]    >> src.real_z;  else src.real_z = 0
		if(F["skin"])     F["skin"]     >> src.skin_color;  else src.skin_color = "FFD1A3"
		if(F["cloth"])    F["cloth"]    >> src.cloth_color; else src.cloth_color = "3366CC"
		if(F["inventory"]) F["inventory"] >> src.contents
		if(F["slot_hand"]) F["slot_hand"] >> src.slot_hand
		if(F["slot_head"]) F["slot_head"] >> src.slot_head
		if(F["slot_body"]) F["slot_body"] >> src.slot_body
		if(F["slot_legs"]) F["slot_legs"] >> src.slot_legs
		if(F["slot_feet"]) F["slot_feet"] >> src.slot_feet
		if(F["gender"])   F["gender"]   >> src.char_gender; else src.char_gender = "Male"
		if(F["kills"])    F["kills"]    >> src.kills;   else src.kills = 0
		if(F["deaths"])   F["deaths"]   >> src.deaths;  else src.deaths = 0

		// Validação de integridade dos dados carregados
		if(src.level < 1) src.level = 1
		if(src.experience < 0) src.experience = 0
		if(src.gold < 0) src.gold = 0
		if(!src.name || src.name == "") src.name = "Sem nome"

		// Recalcula req_experience usando a fórmula atual (sincronizada com Combat.dm)
		src.req_experience = round(100 * (log(src.level + 1) / log(2)) * src.level)
		if(src.req_experience < 100) src.req_experience = 100

		active_item_visual = ""
		if(slot_hand) active_item_visual = slot_hand.id_visual
		RecalculateStats()
		lethality_mode = 0
		return 1