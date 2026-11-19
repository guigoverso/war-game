# Mapa do código (js/)

Referência rápida para achar as coisas sem varrer o código. Nomes são exatos (função/constante global).
Se renomear ou mover algo listado aqui, atualize esta página.

## Ordem de carga (`index.html`, fim do arquivo)
util → render → voxel → phys → world → city → nav → entities → weapons → allies → poi → quests → ambient → data →
state → ui → inventory → store → cooking → fishing → dungeon → raids → warehouse → econ → office → rounds → policies →
factions → facgraph → facsupply → rebellion → rebmine → facevents → meetfx → meeting → globalev → flageditor →
scenario → missions → pois → poigame → negoc → save → **game** (último: laço principal e entrada).
Código no topo de um arquivo só pode usar o que veio antes; dentro de funções, qualquer global serve.

## Arquivos
**Mundo e render**
- `util` — utilitários (sementes, cores, interpolação): `mulberry32`, `hashStr`, `clamp`, `lerp`, `mixc`, `tick`.
- `render` — cena Three.js e cache de materiais/geometria: `scene`, `mat`, `part`, `GEO_BOX`, `makeSign`.
- `voxel` — modelos voxel de humanos e animais: `buildHuman`, `vpart`, `faceMaterial`, `buildQuad`, `buildBearV`.
- `phys` — colisão e raios: `W` (tamanho do mapa), `Col`, `rayWorld`, `losClear`, `moveXZ`, `moveY`.
- `world` — terreno por semente, biomas, árvores, minimapa: `WORLD`, `biomeAt`, `carveRoad`, `meshTerrain`, `makeMapCanvas`, `cityName`.
- `city` — cidades e prédios: `buildCity`, `makeBuilding`, `buildHall`, `buildWarehouse`, `buildStore`, `buildTavern`, `cityDecor`.
- `nav` — grade de navegação e caminhos: `NAV`, `buildNav`, `findPath`, `navMove`.

**Entidades e combate**
- `entities` — NPCs, inimigos e IA: `NPCS`, `EDEF`, `spawnNpc`, `updateNpc`, `npcTalk`, `updateEnemy`, `damageEnemy`, `populateCities`.
- `weapons` — armas e tiro: `WEAPONS`, `initWeapons`, `selectWeapon`, `fireWeapon`, `updateWeapons`, `noiseAt`.
- `allies` — soldados do jogador e exército: `ALLIES`, `ARMY`, `pickTarget`, `recruitAlly`, `updateAllies`, `openBarracks`.
- `poi` — POIs antigos (acampamentos, cavernas, baús, matilhas) e dia/noite: `genPOIs`, `openChest`, `openCage`, `updateCamps`, `genPacks`, `updateDayNight`.
- `quests` — emboscadas de gangues: `QUEST`, `GANGS`, `spawnAmbush`, `updateAmbushes`.
- `ambient` — som ambiente e passos: `AMB`, `SND`, `initAmbient`, `footstep`, `updateAmbient`.
- `data` — tabelas de itens, peixes, receitas e loot: `DATA`, `defItems`, `defLoot`, `dataGet`, `dataDefine`.

**Estado e base**
- `state` — estado salvo e ganchos: `SAVE_VERSION`, `STATE`, `resetState`, `rdNow`, `Hooks`, `Ledger`, `PriceMods`/`priceMul`, `Rounds`.
- `ui` — peças de interface (janela, botão, grade de slots, tooltip): `UI`.
- `save` — salvar/carregar: `SAVE_SLOTS`, `collectSave`, `migrateSave`, `applySave`, `SaveUI`, `loadSlot`.

**Itens e serviços**
- `inventory` — bolsa, barras, buffs, durabilidade: `newInv`, `invAdd`, `invRemove`, `invCount`, `applyBuff`, `repairWeapon`, `renderInventory`.
- `store` — loja/taverna com ouro do vendedor: `VENDOR_BASE_GOLD`, `getVendor`, `sellItem`, `openStore`, `renderStore`.
- `cooking` — fogão e fogueira: `canCook`, `cook`, `openCooking`, `renderCooking`.
- `fishing` — pesca: `FISH`, `SPOTS`, `genFishSpots`, `startCast`, `updateFishing`.
- `dungeon` — portais, alas, portal dourado, veios: `DG`, `PORTALS`, `CONTEST`, `enterDungeon`, `leaveDungeon`, `mineVein`, `rollLegendary`.
- `warehouse` — armazém, cofre e suprimentos: `RES_ITEM`, `supplyOf`, `consumeSupply`, `prodAdd`, `giveResource`, `openWarehouse`, `renderWarehouse`.

**Rodadas, economia e eventos**
- `econ` — economia das cidades: `ECON`, `NEEDS`, `RES4`, `MOOD`, ações do líder (`isLeader`, `actCost`, `canAct`, `spendAct`), `initEconomy`, `cityTypePlan`, `needOf`, `pctOf`, `missingOf`, `prodOf`, `taxOf`, `moodOf`/`moodLbl`/`joyShift`, `computeBuffs`, `rerollNeeds`, `refreshShops`/`shopLeft`/`shopTake`, `capCost`, `CARAVAN_COST`.
- `office` — escritório do Líder (sala no canto da região das dungeons): `OFFICE`, `genOffice`, `initOffice`, `officeLook`, `enterOffice`, `leaveOffice`, `nearBook`, `inOfficeRoom`, `hallExit`, `placeAtHall`.
- `rounds` — rodadas, caderno, caravanas, guardas: `endRound`, `finishLeaderTurn`, `openBook`, `renderBook`, `CARAVANS`, `buyCaravan`.
- `raids` — raids em ondas e batalha de caravana: `RAID`, `RAID_WAVES`, `RAID_GAP`, `startRaid`, `endRaid`, `raidLocked`, `CVB`/`startCaravanBattle`.
- `policies` — políticas locais (cartões A/B/C): `POL`, `definePolicy`, `rollPolicy`, `showPolicy`, `polChoose`, `polBookHtml`, `polHud`.
- `factions` — facções, bandeiras, relações, guerra/paz: `FAC_KINDS`, `REL_MAX`, `facOf`, `relOf`, `relChange`, `facDeclareWar`, `facPeace`, `FAC_GOLD`.
- `facgraph` — grafo de relações e rotas entre facções: `FG`, `fgInit`, `fgSet`, `fgPropagate`, `fgRoutes`, `fgBookPages`.
- `facsupply` — oferta/escassez por facção: `FSUP`, `fsupRound`, `fsupStockMul`, `fsupSellFx`.
- `rebellion` — rebeliões, batalha, ruínas: `REB`, `rebCheck`, `rebStart`, `rebRound`, `rebCombatStart`, `rebEnd`, `rebHud`.
- `rebmine` — missão de rebelião na mina: `REBM`, `rebmStart`, `rebmWon`, `rebmLost`.
- `facevents` — eventos entre facções: `FEV`, `FEV_DEFS`, `fevRound`, `fevMedCard`, `fevForce`.
- `meetfx` — efeitos das reuniões e aba Efeitos: `MEET_DUR`, `MPROPS`, `meetApplyEffect`, `meetRoundEnd`, `meetBookHtml`, `buffsPages`.
- `meeting` — salão de reunião dos líderes (votação): `MEET`, `meetDue`, `meetEnter`, `meetInteract`, `meetDoVote`, `meetFinish`.
- `globalev` — eventos globais e resgate: `GEV`, `GEV_EV`, `gevTick`, `gevCard`, `gevRescueStart`, `gevCageOpen`.
- `missions` — missões (quadro do salão e de facções): `MS`, `msBoard`, `msAdd`, `msComplete`, `msDeliver`, `openQuests`, `msBookPages`.

**POIs da Fase 6**
- `pois` — tipos e construção dos POIs no mundo: `POI_DEFS`, `POI_TYPES`, `poiBuild`, `genWorldPois`, `poiSetOwner`, `poiNear`, `poiShowcase`.
- `poigame` — regras dos POIs (guarnição, anexação, renda, preço): `POIX`, `POI_PRICE`, `poiMine`, `poiGarrisonSync`, `poiScan`, `poiAct`, `poiTick`; moradores e serviços (ferreiro, bigorna, curtidor, taverneiro), binóculo: `SVC`, `svcOpen`, `svcSmith`, `svcAnvil`, `svcTanner`, `svcTavern`, `poiBinoc`.
- `negoc` — Negociação (entrada no caderno): `negOpen`, `negPage`, `negClick`, `negEntryHtml`.

**Outros**
- `flageditor` — editor de bandeira: `FE_PAL`, `facEditor`.
- `scenario` — cenários de teste por URL (`?cenario=`): `SCN`, `scenarioApply`, `scenarioGo`, `scenarioHtml`.
- `game` — laço principal, jogador, entrada, HUD, painéis, minimapa, pausa: `P`, `G`, `frame`, `update`, `doInteract`, `updateInteract`, `openPanel`, `closePanel`, `toast`, `updateHUD`, `drawMinimap`, `pauseTab`.

## Onde fica cada UI
- **Painéis** (`G.panel`): nomes em `SCREENS` (`game.js`); abrir/fechar com `openPanel`/`closePanel`. Peças comuns em `UI` (`ui.js`).
- **Caderno** (painel `ldbook`, `rounds.js`): estado em `LB` (`top`: `book`/`inv`/`map`; `tab`), abas em `LSUBS`, montagem em `openBook` → `renderBook` → `bookPages` / `mapPages`; cliques em `bookClick`. Teclas L (Livro) e M (Mapa) em `game.js`.
  Páginas vindas de outros arquivos: `polBookHtml` (policies), `buffsPages`/`meetBookHtml` (meetfx), `fgBookPages` (facgraph), `msBookPages` (missions), `negEntryHtml` (negoc). Inventário dentro do caderno: `INV_L`/`INV_R` + `renderInventory`.
- **Escritório do Líder**: `OFFICE`, `enterOffice`, `leaveOffice`, `nearBook` (`office.js`); `hallRoundAction` (`rounds.js`).
- **Lojas**: loja de armas/munição `openShop`/`renderShop` e clínica `openClinic` (`game.js`); mercado e taverna `openStore` (`store.js`); quartel `openBarracks` (`allies.js`); armazém `openWarehouse` (`warehouse.js`); cozinha `openCooking` (`cooking.js`); serviços dos POIs `svcOpen` (painel `svc`, `poigame.js`).
- **Cartões/popups**: política `showPolicy`, evento de facção `fevMedCard`, evento global `gevCard`, rebelião `rebCard`, reunião `meetCard`, missão `msCard`.
- **HUD**: `updateHUD` (`game.js`), `refreshRoundHud` (`rounds.js`), `polHud`, `rebHud`. Preços explicados: `openPriceWhy`/`priceTag` (`game.js`).
- **Pausa** (Tab/O/Esc): `pauseTab`, aba Locais `renderLocs`, truques `refreshCheats`/`refreshPolicyCheats` (`game.js`); cada sistema fornece seu `*CheatHtml` (`fgCheatHtml`, `fsupCheatHtml`, `rebCheatHtml`, `fevCheatHtml`, `gevCheatHtml`, `scenarioHtml`).

## Ganchos (`Hooks`, `state.js`)
`Hooks.on(nome,fn)` / `Hooks.emit(nome,arg)`. Eventos existentes:
- `resetState` — emitido por `resetState()`; quase todo sistema registra aqui o seu pedaço de `STATE`.
- `round` — emitido em `endRound` (`rounds.js`) e `Rounds.advance`; ouvido por econ (grutas), rounds, policies, factions, facgraph, facevents, globalev, meetfx, missions, dungeon, poigame.
- `leaderTurn` — emitido no início do turno do Líder (`rounds.js`); ouvido por `policies.js` (sorteia o cartão).
- `ledger` — emitido por `Ledger.set` quando um recurso muda.

## Interação (tecla E)
`updateInteract` (`game.js`) escolhe o alvo mais próximo e grava `G.target={type,...}`; `doInteract` despacha pelo `type`:
`hall`→`openQuests`, `barracks`→`openBarracks`, `shop`→`openShop`, `clinic`→`openClinic`, `store`/`tavern`→`openStore`,
`stove`/`fire`→`openCooking`, `npc`→`npcTalk`, `chest`→`openChest`, `cage`→`openCage`, `dgcage`→`gevCageOpen`,
`portal`→`enterDungeon`, `dgexit`→`leaveDungeon`, `vein`→`mineVein`, `book`→`openBook`, `leader`→`hallRoundAction`,
`warehouse`→`openWarehouse`, `loot`→`lootCaravan`, `msdeliver`→`msDeliver`, `poi*`→`poiAct` (`poigame.js`).
Alvos `poi*`: `poibar`, `poibed`, `poibinoc`, `poivigil`, `poisvc`, `poianvil` (`poiScan`, poigame).
Raid ativa bloqueia via `raidLocked(t.c)`. No escritório/salão: `meetInteract` (meeting) ou `nearBook`→`openBook`.

## Números de balanceamento
- `ECON` (`econ.js`) — necessidades, saque de caravana (`ECON.loot`), produção, impostos, caravana (`CARAVAN_COST=ECON.caravan`), evolução de cidade.
- `POL` (`policies.js`) — chance e duração das políticas; definições via `definePolicy`.
- `POIX` e `POI_PRICE` (`poigame.js`) — guarnição, renda, retomada e preço dos POIs.
- `RAID_WAVES`, `RAID_GAP`, `RAID_TIME`, `RAID_LOSS_*` (`raids.js`).
- `REB` (rebellion), `FEV` (facevents), `GEV` (globalev), `FSUP` (facsupply), `MEET`/`MEET_DUR` (meeting/meetfx).
- `REL_MAX`/`REL_START`, `FAC_GOLD`, `FAC_RELIC_GAIN` (`factions.js`); `VENDOR_*` (`store.js`); `INV_BASE`, `INV_UP_COST` (`inventory.js`); `WEAPONS` (`weapons.js`).
