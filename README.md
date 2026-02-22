# 🏴‍☠️ One Piece BYOND 3D

Um RPG de Ação 3D revolucionário construído sobre a engine **BYOND** (Build Your Own Net Dream). Este projeto quebra as limitações clássicas do grid 2D do BYOND ao acoplar um motor gráfico customizado em **WebGL (Three.js)** renderizado nativamente dentro do cliente web do jogo, combinado com uma arquitetura de servidor **Data-Driven**.

---

## 🌟 Core Features (Diferenciais)

* **Renderização 3D Híbrida:** Cliente visual em *Three.js* (Low-Poly/Toon shading com `MeshLambertMaterial` para altíssima performance) comunicando-se em tempo real com o backend robusto e seguro do BYOND.
* **Combate 100% Data-Driven:** Todo o balanceamento (dano, multiplicadores, caixas de colisão OBB, tempos de recarga e pré-requisitos) é lido dinamicamente do `SkillDefinitions.json`. Nenhuma matemática de magia é *hardcoded*.
* **Interface Modular (PoE 2 Style):** Uma Hotbar de habilidades flexível, atribuível in-game e salva diretamente no banco de dados do servidor, imune a limpezas de cache do navegador.
* **Netcode Anti-Stutter:** Interpolação de movimento (Lerp) para câmera e entidades, frame pacing com `requestAnimationFrame` estrito e sistema de *Lag Compensation* (Favor the Shooter) nas hitboxes do servidor.
* **Árvore de Habilidades Inteligente:** Sistema de *Skill Unlocks* dinâmico. Habilidades sobem de nível com o uso (XP por acerto) e o servidor automaticamente entrega ou revoga magias avançadas com base em pré-requisitos de atributos e dependências cruzadas (Ex: *Iceball* requer *Fireball* Nv. 2).

---

## 🛠️ Stack Tecnológico

| Camada | Tecnologia | Propósito |
| :--- | :--- | :--- |
| **Backend** | `DM (Dream Maker)` | Servidor BYOND. Controla autoridade, persistência, banco de dados (`.sav`), IA, hitboxes e broadcast de pacotes. |
| **Frontend Gráfico** | `Three.js` (R128) | Renderização da malha 3D, luzes, sombras, detecção matemática de projéteis visuais e esqueletos (Rigging). |
| **Frontend Lógico** | `Vanilla JS (ES6)` | Loop de jogo local a 60FPS, predição de cliente, FSM (Finite State Machine) de animações e UI. |
| **Interface (UI)** | `HTML5 / CSS3` | Renderização modular gerada dinamicamente pelo JS, sobreposta ao canvas do WebGL. |
| **Bridge** | `Topic` / `output()` | O cordão umbilical bidirecional entre o C++ do BYOND e a Webview (V8/CEF) do cliente. |

---

## 📂 Estrutura de Diretórios

```text
📦 OnePieceBYOND
 ┣ 📂 client/               # Motor Lógico do Frontend (Executado no Navegador do BYOND)
 ┃ ┣ 📜 AnimationSystem.js  # Máquina de Estados (FSM) de Animação do esqueleto 3D
 ┃ ┣ 📜 CombatSystem.js     # Orquestrador de inputs e combos
 ┃ ┣ 📜 CombatVisualSystem.js # Renderizador de Hitboxes, Projéteis e Dano Flutuante
 ┃ ┣ 📜 EntityManager.js    # Lerp de Entidades, Câmera e Sincronização de Posição
 ┃ ┣ 📜 InputSystem.js      # Captura de Teclado (WASD, Hotbar) com blindagem de foco
 ┃ ┣ 📜 NetworkSystem.js    # Ponte JS -> BYOND (Fila de Comandos)
 ┃ ┣ 📜 PhysicsSystem.js    # Colisão preditiva de cliente
 ┃ ┗ 📜 UISystem.js         # Manipulador do DOM, Render dinâmico de Menus e Hotbar
 ┣ 📂 server/               # Lógica Autorital do Backend (Executado no BYOND Server)
 ┃ ┣ 📜 Combat.dm           # Fórmulas de dano, Status, XP de Armas/Magias e Death state
 ┃ ┣ 📜 Inventory.dm        # Slots de equipamento, drop e lixeiras
 ┃ ┣ 📜 Items.dm            # Definições base de armas e armaduras (/obj/item)
 ┃ ┣ 📜 Network.dm          # O "Topic" (API Controller): Recebe ações da Web e delega
 ┃ ┣ 📜 NPCs.dm             # Lojas, Enfermeiras, Inimigos e Props de treino
 ┃ ┗ 📜 Persistence.dm      # Save/Load seguro em formato .sav e validação de Unlocks
 ┣ 📂 shared/               # Dados Universais
 ┃ ┗ 📜 SkillDefinitions.json # O coração do balanceamento do jogo (Dicionário de Magias)
 ┣ 📜 World3D.dm            # O Loop principal de Servidor (SSserver Heartbeat)
 ┣ 📜 engine.js             # O Inicializador do ambiente Three.js e da Cena
 ┣ 📜 factory.js            # O Construtor de Malhas 3D e Equipamentos (MeshLambert)
 ┣ 📜 definitions.js        # Dicionário de geometria e materiais base 3D
 ┣ 📜 game.js               # Injetor global de ponte BYOND -> JS e o Loop de Animação
 ┗ 📜 game.html             # O esqueleto HTML e o CSS master da Interface de Usuário