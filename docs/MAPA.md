# Mapa do código (js/)

Referência rápida para achar as coisas sem varrer o código. Nomes são exatos (função/constante global).
Se renomear ou mover algo listado aqui, atualize esta página.

## Ordem de carga (`index.html`, fim do arquivo)
util → modifiers/* → texts/* → render → voxel → phys → world → city → nav → entities → weapons → allies → poi → quests → ambient → data →
state → ui → inventory → store → cooking → fishing → dungeon → raids → warehouse → econ → office → caravans → book → bookmap → rounds → policies →
factions → facgraph → facsupply → rebellion → rebmine → facevents → meetfx → meeting → globalev → flageditor →
scenario → missions → pois → poigame → negoc → save → **game** (último: laço principal e entrada).
Código no topo de um arquivo só pode usar o que veio antes; dentro de funções, qualquer global serve.

## Arquivos
**Modificadores (ajuste fácil)**
- `modifiers/` (pasta, um arquivo por categoria) — constantes e funções de regra que o usuário altera sem pedir à IA (cada uma com comentário: para que serve e valor padrão). Novos modificadores vão aqui. Hoje: `BANDIT_RETAKE_FREE_POI`, `FACTION_TAKE_FREE_POI` (pesos de quem retoma um POI livre ignorado) e `freePoiTaker` (usada por `poiFreeRetake` em `poigame.js`); `WAR_RETAKE_MULTIPLIER` (redutor da retomada dos POIs seus em guerra, usado em `poiRetakeChance`).
- `texts/` (pasta, um arquivo por categoria) — textos do jogo que o usuário ajusta sem pedir à IA: mensagens e avisos (toast, relatório da rodada), textos de livro e cartão, e funções que devolvem string. Cada um com comentário (onde aparece e para que serve). Novos textos vão aqui. Ainda vazio. Evolução de cidade: `txtWallAt`, `txtCityUpNext`, `txtLvlCostLine`, `txtCityUpToast`, `txtCityUpReport` (tela da cidade em `book.js`, botão `cityup`). Evolução da facção: `txtFacHead`, `txtFacReqLine`, `txtFacUpToast`, `txtFacUpReport` (aba Facção, botão `cap`).

**Mundo e render**
- `util` — utilitários (sementes, cores, interpolação): `mulberry32`, `hashStr`, `clamp`, `lerp`, `mixc`, `tick`.
- `render` — cena Three.js e cache de materiais/geometria: `scene`, `mat`, `part`, `GEO_BOX`, `makeSign`.
- `voxel` — modelos voxel de humanos e animais: `buildHuman`, `vpart`, `faceMaterial`, `buildQuad`, `buildBearV`.
- `phys` — colisão e raios: `W` (tamanho do mapa), `Col`, `rayWorld`, `losClear`, `moveXZ`, `moveY`.
- `world` — terreno por semente, biomas, árvores, minimapa: `WORLD`, `biomeAt`, `carveRoad` (estradas; `ROAD_WATER`, `ROAD_SPAN_MAX`, `BRIDGE_HEAD`), pontes: `WORLD.bridges`/`WORLD.bt`, `meshBridgeWater`, `bridgeRails`; `meshTerrain`, `makeMapCanvas`, `cityName`.
- `city` — cidades e prédios: `buildCity`, `makeBuilding`, `buildHall`, `buildWarehouse`, `buildStore`, `buildTavern`, `cityDecor`.
- `nav` — grade de navegação e caminhos: `NAV`, `buildNav`, `findPath`, `navMove`.

**Entidades e combate**
- `entities` — NPCs, inimigos e IA: `NPCS`, `EDEF`, `spawnNpc`, `updateNpc`, `npcTalk`, `updateEnemy`, `damageEnemy`, `populateCities`.
- `weapons` — armas e tiro: `WEAPONS`, `initWeapons`, `selectWeapon`, `fireWeapon`, `updateWeapons`, `noiseAt`.
- `allies` — soldados do jogador e exército: `ALLIES`, `ARMY`, `pickTarget`, `recruitAlly`, `updateAllies`, `openBarracks`, reparo do colete do jogador no Quartel (`vestRepairQuote`, `vestRepair`; números em `POIX.vest`).
- `poi` — POIs antigos (acampamentos, cavernas, baús, matilhas) e dia/noite: `genPOIs` (chama `genWorldPois` antes dos acampamentos, grutas e baús e atualiza `WORLD.snap`, a cópia do terreno usada pelo mapa, com o que os POIs mudaram), `spotOK` (parâmetro `wet`: água aceita), `flattenArea` (rampa `F`), `openChest`, `openCage`, `updateCamps`, `genPacks`, `updateDayNight`.
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
- `econ` — economia das cidades: `ECON`, `NEEDS`, `RES4`, `MOOD`, ações do líder (`isLeader`, `actCost`, `canAct`, `spendAct`), `initEconomy`, `cityTypePlan`, `needOf`, `pctOf`, `missingOf`, `prodOf`, `taxOf`, `moodOf`/`moodLbl`/`joyShift`, `computeBuffs`, `rerollNeeds`, `refreshShops`/`shopLeft`/`shopTake`, `CARAVAN_COST`; níveis: `LVL` (custos, requisitos e efeitos por nível), `cityLvl` (todas as cidades suas, capital incluída; `rd.clv`), `facLvl`, `facCostOf`/`cityCostOf`, `canCityUp` (+ `cityUpWhy`); em `js/modifiers/`: `facReqState`, `canFacUp` (+ `facUpWhy`), `lvlCanPay`/`lvlPay`, `lvlSteps`/`cityLvlGain` (ganho por nível: entra em `prodOf`, `taxOf`, `shopFull` e nas telas); limites por rodada `rd.facUpR`/`rd.cityUpR`.
- `office` — escritório do Líder (sala no canto da região das dungeons): `OFFICE`, `genOffice`, `initOffice`, `officeLook`, `enterOffice`, `leaveOffice`, `nearBook`, `inOfficeRoom`, `hallExit`, `placeAtHall`.
- `caravans` — caravanas e rotas na estrada, guardas, saque e compra: `CARAVANS`, `rebuildCaravans`, `makeCaravan`, `roadSpot`, `updateCaravanGuards`, `damageGuard`, `nearGuard`, `lootCaravan`, `caravanAttacked`, `destroyRoute`, `purgeDoomedCaravans`, `buyCaravan`, `dealSummary`.
- `book` — caderno (painel `ldbook`): `LB`, `LSUBS`, `openBook`, `renderBook`, `bookPages`, `bookClick`, `routeTip`, `typeLabel`, `moodHtml`, `INV_L`/`INV_R`, `renderDeposit`, `mapOpen`.
- `bookmap` — aba Mapa do caderno e escolha de caravana no mapa: `MP`, `mapPages`, `startCaravanPick`, `drawPickOverlay`, `pickCityAt`, `pickPoiAt`, `freeCityForRoute`; dica do mouse sobre cidades e POIs.
- `rounds` — fim da rodada, turno do Líder, HUD da rodada e rodada 0: `endRound`, `rebelCity`, `beginLeaderTurn`, `finishLeaderTurn`, `updateRounds`, `refreshRoundHud`, `hallRoundAction`, `prepOn`/`prepThin`/`prepRestore`.
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
- `pois` — tipos e construção dos POIs no mundo: `POI_DEFS`, `POI_TYPES` (fazenda, mina, serraria, caçadores, santuário, ponte, forte, torre, taverna, entreposto, ruínas), `POI_BUILD`, `poiBuild`, `genWorldPois` (anel, estrada e interior; números em `POI_GEN`, pesos por bioma em `POI_W`, regras de lugar em `poiRuleOK`, `POI_RANGE`/`POI_BIG`: desnível e terreno dos grandes, `POI_GEN.limit`/`min`/`biomeCap`/`first`: limites, mínimos e tipo principal do bioma), `bridgeSpots` (lugar do pedágio na ponte; `POI_GEN.bridgeToll/bridgeMin/bridgeGap`), `poiSetOwner`, `poiNear`, `poiShowcase`.
- `poigame` — regras dos POIs (guarnição, anexação, renda, preço): `POIX`, `POI_PRICE`, `poiMine`, `poiLvl` (nível do dono: produção e pedágio), `poiGarrisonSync`, `poiScan`, `poiAct`, `poiTick`; moradores e serviços (ferreiro, mercenário, taverneiro, lojista do entreposto), binóculo: `SVC`, `svcOpen`, `svcSmith`, `svcMerc`, `svcTavern`, `svcPost`, `svcPost` em abas (`POST_TABS`; aba Venda = `postSellTab`, usa `sellEffects`/`sellItem` da cidade de referência; "?" = `postPriceTag`), `postStockLeft` (estoque do entreposto: `STATE.poiX.postStock`, `POST_STOCK_MULTIPLIER` em modifiers.js, `shopFull` em econ.js, `txtPostStock` em texts.js), `poiVigil` (vigia da torre; marcas `STATE.poiX.marks`, `poiMarkCheck`; desenho `drawQuery` em `quests.js`; textos `TXT_VIGIL_*` em `texts.js`).
  Entreposto: `poiPosts`, `poiOnRoute` (`p.road` opcional), `poiRouteBlocked` (usado em `caravans.js`, `bookmap.js`, `facgraph.js`), `poiPostIncome`, `poiPostEffects` (aba Efeitos, `meetfx.js`), `postPrice`; números em `POIX.post`.
  Santuário: `poiHasSanc`, `poiSancPeace` (usado em `rounds.js` e `facsupply.js`), `poiSancDelay` (`rounds.js` e `rebellion.js`); números em `POIX.sanc`. Ruínas: guardiões voltam a cada rodada (gancho `round` de `poigame`), baú não volta (`POIX.ruinRelic`). Caçadores: `poiHuntLoot`, `poiHuntPen` (`facsupply.js`).
- `negoc` — Negociação (entrada no caderno): `negOpen`, `negPage`, `negClick`, `negEntryHtml`.

**Outros**
- `flageditor` — editor de bandeira: `FE_PAL`, `facEditor`.
- `scenario` — cenários de teste por URL (`?cenario=`): `SCN`, `scenarioApply`, `scenarioGo`, `scenarioHtml`. Cenário de guerra (`?cenario=guerra`): `WARSCN`, `warScenario`, `warSplitPois`, `warScenarioHtml` em `war.js`; números em `WAR.scenario`.
- `game` — laço principal, jogador, entrada, HUD, painéis, minimapa, pausa: `P`, `G`, `frame`, `update`, `doInteract`, `updateInteract`, `openPanel`, `closePanel`, `toast`, `updateHUD`, `drawMinimap`, `pauseTab`.

## Onde fica cada UI
- **Painéis** (`G.panel`): nomes em `SCREENS` (`game.js`); abrir/fechar com `openPanel`/`closePanel`. Peças comuns em `UI` (`ui.js`).
- **Caderno** (painel `ldbook`, `book.js`): estado em `LB` (`top`: `book`/`inv`/`map`; `tab`), abas em `LSUBS`, montagem em `openBook` → `renderBook` → `bookPages` / `mapPages` (`bookmap.js`); cliques em `bookClick`. Teclas L (Livro) e M (Mapa) em `game.js`.
  Páginas vindas de outros arquivos: `polBookHtml` (policies), `buffsPages`/`meetBookHtml` (meetfx), `fgBookPages` (facgraph), `msBookPages` (missions), `negEntryHtml` (negoc). Inventário dentro do caderno: `INV_L`/`INV_R` + `renderInventory`.
- **Escritório do Líder**: `OFFICE`, `enterOffice`, `leaveOffice`, `nearBook` (`office.js`); `hallRoundAction` (`rounds.js`).
- **Lojas**: loja de armas/munição `openShop`/`renderShop` e clínica `openClinic` (`game.js`); mercado e taverna `openStore` (`store.js`); quartel `openBarracks` (`allies.js`); armazém `openWarehouse` (`warehouse.js`); cozinha `openCooking` (`cooking.js`); serviços dos POIs `svcOpen` (painel `svc`, `poigame.js`).
- **Cartões/popups**: política `showPolicy`, evento de facção `fevMedCard`, evento global `gevCard`, rebelião `rebCard`, reunião `meetCard`, missão `msCard`.
- **HUD**: `updateHUD` (`game.js`), `refreshRoundHud` (`rounds.js`), `polHud`, `rebHud`. Preços explicados: `openPriceWhy`/`priceTag` (`game.js`).
- **Pausa** (Tab/O/Esc): `pauseTab`, aba Locais `renderLocs`, truques `refreshCheats`/`refreshPolicyCheats` (`game.js`); cada sistema fornece seu `*CheatHtml` (`fgCheatHtml`, `fsupCheatHtml`, `rebCheatHtml`, `fevCheatHtml`, `gevCheatHtml`, `scenarioHtml`).

## Ganchos (`Hooks`, `state.js`)
`Hooks.on(nome,fn)` / `Hooks.emit(nome,arg)`. Eventos existentes:
- `resetState` — emitido por `resetState()`; quase todo sistema registra aqui o seu pedaço de `STATE`.
- `round` — emitido em `endRound` (`rounds.js`) e `Rounds.advance`; ouvido por econ (grutas), caravans, rounds (rodada 0), policies, factions, facgraph, facevents, globalev, meetfx, missions, dungeon, poigame (renda, retomada, rotas bloqueadas e renda do entreposto, guardiões das ruínas).
- `leaderEnd` — emitido em `finishLeaderTurn` (`rounds.js`) ao encerrar o turno do Líder; ouvido por `poigame.js` (`poiFreeRetake`: POI livre sem decisão é retomado).
- `leaderTurn` — emitido no início do turno do Líder (`rounds.js`); ouvido por `policies.js` (sorteia o cartão).
- `ledger` — emitido por `Ledger.set` quando um recurso muda.

## Interação (tecla E)
`updateInteract` (`game.js`) escolhe o alvo mais próximo e grava `G.target={type,...}`; `doInteract` despacha pelo `type`:
`hall`→`openQuests`, `barracks`→`openBarracks`, `shop`→`openShop`, `clinic`→`openClinic`, `store`/`tavern`→`openStore`,
`stove`/`fire`→`openCooking`, `npc`→`npcTalk`, `chest`→`openChest`, `cage`→`openCage`, `dgcage`→`gevCageOpen`,
`portal`→`enterDungeon`, `dgexit`→`leaveDungeon`, `vein`→`mineVein`, `book`→`openBook`, `leader`→`hallRoundAction`,
`warehouse`→`openWarehouse`, `loot`→`lootCaravan`, `msdeliver`→`msDeliver`, `poi*`→`poiAct` (`poigame.js`).
Alvos `poi*`: `poibar`, `poibed`, `poivigil`, `poisvc` (ferreiro, mercenário, lojista do entreposto) (`poiScan`, poigame).
Raid ativa bloqueia via `raidLocked(t.c)`. No escritório/salão: `meetInteract` (meeting) ou `nearBook`→`openBook`.

## Números de balanceamento
- `ECON` (`econ.js`) — necessidades, saque de caravana (`ECON.loot`), produção, impostos, caravana (`CARAVAN_COST=ECON.caravan`), evolução de cidade.
- `POL` (`policies.js`) — chance e duração das políticas; definições via `definePolicy`.
- `POI_GEN`, `POI_W`, `POI_RANGE` (`pois.js`) — quantidade, pesos por bioma, limites e mínimos dos POIs gerados.
- **POIs de guerra** (`POI_WAR_TYPES` em `pois.js`; só visuais): `fortcamp` (12), `trench` (11), `hospital` (10; `p.beds`/`p.medWalk`, pacientes `lie` e médicos criados por `poiMedSync` em `poigame.js`, números em `WAR_POI` de `war-modifiers.js`), `depot` (10; `poiBarrierRow`), `lookout` (6) e `barricade` (7; usa `p.axis` = direção da estrada). Opção `lie` de `spawnNpc` (`entities.js`); fala dos pacientes em `TXT_WAR_PATIENT_SAY`. O mapa `?cenario=pois` mostra os 17 POIs.
- **`js/texts/`** — textos novos, um arquivo por categoria (`poi-`, `city-`, `faction-`, `economy-`, `policy-`, `war-texts.js`): olhar aqui antes de escrever string na lógica.
- **`js/modifiers/`** — modificadores novos, um arquivo por categoria (`poi-`, `city-`, `raid-`, `faction-`, `economy-`, `policy-`, `war-modifiers.js`): olhar primeiro aqui antes de criar constante nova. `WAR` (fadiga, custos de operação, aliados, espionagem) e `warFatigueMark`/`warSupplyBonus` ficam em `war-modifiers.js`.
- **`war.js`** — estado salvo da guerra `STATE.war` (`fat`, `nfat`, `camps`, `ops`, `inc`, `pts`; `SAVE_VERSION` 22): `warNew`, `warX`, `warActive`, `warMark`, `warSupply`, `warApply` (save.js). Quem está em guerra continua em `STATE.rel[fid].war`. Textos em `texts/war-texts.js`.
- **`warfront.js`** — frente da guerra (feature 36; `docs/features/3_frente-da-guerra.md`): `warFrontPlan(fid, kind, ref)` → `{origin, path, len, chain, ts, war}` ou `null` (rota passa pelos POIs da cadeia; `war` = POIs de guerra planejados por `wfFill`/`wfSpotY`); auxiliares `wfBlockers`, `wfSearch` (A* em grade; cidade como quadrado; folga por passada), `wfRoute` (duas passadas de folga: `avoid` e 0; `pull`: desconto de custo `WAR.front.pullCost` perto de POIs e clareiras), `wfWaterRun`, `wfRoute`, `wfAlong`, `wfPointAt`. Dormentes (4.4): `genDormant` (anel das cidades + corredores, `WORLD.dormant`, `wfCrowded`, `wfReserved`, `wfRoadAxis`, `wfDormNear`; todo anel de cidade tem ao menos 1 dormente: se o sorteio falha, `genDormant` varre o anel com folga mínima; a vitrine `?cenario=pois` mostra os 4 dormentes em `poiShowcaseGen`); `wfFill` sorteia o tipo por posição (`warTypeWeights`), `wfSpot` (dormente > clareira), `wfRing` (primeiro/último POI conquistável a no máximo `ringRadius`; `plan.warn`); `warFrontClear` reverte (`WAR.front.revert`) ou deixa rastro (`STATE.war.trace`). Decorações em pois.js: `DORM_BUILD` (fogueira, jardim, poço, marco de pedras), `dormBuild`/`dormRemove`/`dormBuildAll`. Clareiras de guerra (`genWarSites`, chamada por `genPOIs` em poi.js; `WORLD.warSites`: lugares sem árvore reservados na geração, sem mexer no chão; `wfSiteNear`). O POI de guerra se adapta ao terreno: `poiAdaptBc` (pois.js, usada por `Bc` quando `c.adapt`) parte as caixas em pedaços de 3 blocos que acompanham o chão, e `poiBaseY` dá a altura do chão para colisões e bandeira. POIs de guerra em jogo (ids 700+, `p.runtime`, numa clareira, adaptado ao chão, sem mexer na malha; a rota passa por eles; `wfThread`): `warFrontBuild(plan)` (grava `STATE.war.camps[fid].front`), `warFrontClear(fid)` (chamada por `facPeace`), `warFrontRestore()` (em `applySave`), `wfMake`, `wfUnmake`. Desenho no mapa grande: `warFrontDraw` (chamada de `drawBigMap`); no minimapa: `warFrontDrawMini` (chamada de `drawMinimap`; liga/desliga em `WAR.front.minimap`). Testes no console: `wfTest(cidade)`, `wfBuild()`, `wfBuild('limpar')`. Números em `WAR.front`.
- Visual da cidade por nível (Evolução da facção e das cidades, tarefa 3): `CITY_WALL_BY_LEVEL`, `CITY_SENTRY_*` (`js/modifiers/`); `cityWallBuild/Clear/Rebuild/Sync` (`city.js`, muro em malha própria `c.wall`); `citySentrySync`, `updateCitySentries` (`allies.js`, atiradores de torre, nível 4 e 5, não salvos).
- Custo de evoluir cidade: `CITY_UP_COST` e `cityCostOf(c)` (`js/modifiers/`; saiu do `LVL`).
- `POIX` e `POI_PRICE` (`poigame.js`) — guarnição, produção e pedágio por nível, santuário (`sanc`), caçadores (`hunt`), entreposto (`post`), colete (`vest`), retomada e preço dos POIs.
- `RAID_WAVES`, `RAID_GAP`, `RAID_TIME`, `RAID_LOSS_*` (`raids.js`).
- `REB` (rebellion), `FEV` (facevents), `GEV` (globalev), `FSUP` (facsupply), `MEET`/`MEET_DUR` (meeting/meetfx).
- `REL_MAX`/`REL_START`, `FAC_GOLD`, `FAC_RELIC_GAIN` (`factions.js`); `VENDOR_*` (`store.js`); `INV_BASE`, `INV_UP_COST` (`inventory.js`); `WEAPONS` (`weapons.js`).
