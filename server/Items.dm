// server/Items.dm
// Base lógica de Itens e Equipamentos (Sistema Data-Driven)

var/global/list/GlobalItemsData = list()

proc/LoadItemDefinitions()
	var/file_txt = file2text("shared/ItemDefinitions.json")
	if(file_txt)
		GlobalItemsData = json_decode(file_txt)
		world.log << "✅ Itens carregados com sucesso via JSON."
	else
		world.log << "❌ Falha ao carregar ItemDefinitions.json"

obj/item
	var/item_id = "" // ID que conecta o objeto ao JSON
	var/id_visual = ""
	var/slot = "none" 
	var/atk = 0
	var/ratk = 0
	var/def = 0
	var/crit_bonus = 0
	var/price = 0
	var/sell_price = 1 // Novo campo para economia dinâmica
	var/description = ""
	var/amount = 1
	var/max_stack = 5 
	var/shop_tags = "" 
	var/real_x = 0
	var/real_y = 0
	var/real_z = 0
	var/despawn_time = 6000 
	var/range = 1.0 
	var/projectile_speed = 0 

	// Atualiza os status do item baseados na versão mais recente do JSON
	proc/SyncData()
		if(src.item_id && GlobalItemsData[src.item_id])
			var/list/data = GlobalItemsData[src.item_id]
			src.name = data["name"]
			src.id_visual = data["id_visual"]
			src.slot = data["slot"]
			if(!isnull(data["atk"])) src.atk = data["atk"]
			if(!isnull(data["ratk"])) src.ratk = data["ratk"]
			if(!isnull(data["def"])) src.def = data["def"]
			if(!isnull(data["crit_bonus"])) src.crit_bonus = data["crit_bonus"]
			if(!isnull(data["price"])) src.price = data["price"]
			
			// Se o item não tiver um sell_price no JSON, usa o padrão (10% do preço de compra)
			if(!isnull(data["sell_price"])) src.sell_price = data["sell_price"]
			else src.sell_price = round(src.price / 10)
			if(src.sell_price < 1) src.sell_price = 1

			if(!isnull(data["description"])) src.description = data["description"]
			if(!isnull(data["max_stack"])) src.max_stack = data["max_stack"]
			if(!isnull(data["shop_tags"])) src.shop_tags = data["shop_tags"]
			if(!isnull(data["despawn_time"])) src.despawn_time = data["despawn_time"]
			if(!isnull(data["range"])) src.range = data["range"]
			if(!isnull(data["projectile_speed"])) src.projectile_speed = data["projectile_speed"]

	// O Construtor invoca a Sincronização
	New(newloc, build_id)
		..()
		if(build_id)
			src.item_id = build_id
			SyncData()