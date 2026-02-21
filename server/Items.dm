// server/Items.dm
// Contém a base lógica e a listagem de Itens e Equipamentos (Em breve Data-Driven)

obj/item
	var/id_visual = ""
	var/slot = "none" 
	var/atk = 0
	var/ratk = 0
	var/def = 0
	var/crit_bonus = 0
	var/price = 0
	var/description = ""
	var/amount = 1
	var/max_stack = 5 
	var/shop_tags = "" 
	var/real_x = 0
	var/real_y = 0
	var/real_z = 0
	var/despawn_time = 6000 // Padrão: 10 minutos (6000 ticks) antes de autodestruir do chão

obj/item/weapon
	slot = "hand"
	max_stack = 1
	var/range = 1.0 
	var/projectile_speed = 0 

obj/item/weapon/sword_wood
	name = "Espada de Treino"
	id_visual = "weapon_sword_wood"
	description = "Uma espada de madeira para treinar."
	atk = 8
	price = 50
	range = 3.0
	shop_tags = "armorer"

obj/item/weapon/sword_iron
	name = "Espada de Ferro"
	id_visual = "weapon_sword_iron"
	description = "Lâmina afiada e resistente."
	atk = 16
	price = 100
	range = 3.0
	shop_tags = "armorer"

obj/item/weapon/sword_silver
	name = "Espada de Prata"
	id_visual = "weapon_sword_silver"
	description = "Brilha com a luz da lua. Crítico alto."
	atk = 25
	crit_bonus = 5 
	price = 500
	range = 3.5
	shop_tags = "armorer"
	despawn_time = 12000 // EXCEÇÃO: 20 minutos por ser um item mais valioso

obj/item/weapon/gun_wood
	name = "Pistola de Brinquedo"
	id_visual = "weapon_gun_wood"
	description = "Dispara rolhas."
	ratk = 12
	price = 80
	range = 10.0 
	projectile_speed = 0.6 
	shop_tags = "armorer"

obj/item/weapon/gun_flintlock
	name = "Pistola Velha"
	id_visual = "weapon_gun_flintlock"
	description = "Cheira a pólvora queimada."
	ratk = 25
	price = 250
	range = 14.0
	projectile_speed = 3.6 
	shop_tags = "armorer"

obj/item/weapon/gun_silver
	name = "Pistola de Combate"
	id_visual = "weapon_gun_silver"
	description = "Alta precisão."
	ratk = 40
	crit_bonus = 10 
	price = 800
	range = 22.0
	projectile_speed = 7.2 
	shop_tags = "armorer"

obj/item/armor
	max_stack = 1

obj/item/armor/head_bandana
	name = "Bandana Vermelha"
	id_visual = "armor_head_bandana"
	slot = "head"
	description = "Um pano simples para a cabeça."
	price = 30
	def = 1 
	shop_tags = "armorer"

obj/item/armor/head_bandana_black
	name = "Bandana Preta"
	id_visual = "armor_head_bandana_black"
	slot = "head"
	description = "Estilo pirata clássico."
	price = 35
	def = 1
	shop_tags = "armorer"

obj/item/armor/body_shirt
	name = "Camisa de Marinheiro"
	id_visual = "armor_body_shirt"
	slot = "body"
	description = "Uniforme padrão."
	price = 50
	def = 4
	shop_tags = "armorer"

obj/item/armor/legs_pants
	name = "Calça de Linho"
	id_visual = "armor_legs_pants"
	slot = "legs"
	description = "Confortável para correr."
	price = 40
	def = 2
	shop_tags = "armorer"

obj/item/armor/feet_boots
	name = "Botas de Couro"
	id_visual = "armor_feet_boots"
	slot = "feet"
	description = "Protege os pés."
	price = 60
	def = 2
	shop_tags = "armorer"