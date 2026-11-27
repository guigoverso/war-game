'use strict';
// ---------- Modificadores: POIs (retomada, estoque do entreposto) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// Pousada e alojamento de trabalhadores (poigame.js, svcInn): room = quarto como fração do preço de curar toda a vida (a taverna cobra 1,1);
// markup = acréscimo sobre os preços da loja da cidade de referência; cash = ouro que o comerciante tem para COMPRAR de você por rodada (100). Padrão: pousada room 1.0 e markup 0.10; alojamento (rústico) room 0.8 e markup 0.05
const POI_REST = { inn: { room: 1.0, markup: 0.10, cash: 100 }, lodge: { room: 0.8, markup: 0.05, cash: 100 },
  post: { room: 0, markup: 0, cash: 200 }, tavern: { room: 0, markup: 0, cash: 150 } };   // post e tavern: só o ouro do comerciante para COMPRAR de você por rodada (etapa 8.5, D2: padrão 200 e 150)

// Vila em escombros (pois.js, ruinvil): r = raio do POI em blocos (padrão 40, tamanho de vila); cell = lado da célula de uma casa (14);
// empty = chance de a célula ficar sem casa (0.25); square = raio da praça central sem casas (7); debris = entulho, mato e estacas por bloco² (0.05)
const POI_RUINVIL = { r: 40, cell: 14, empty: 0.25, square: 7, debris: 0.05 };

// POI livre sem decisão (poigame.js, gancho 'leaderEnd')
// Peso de os BANDIDOS retomarem um POI livre que o jogador ignorou, ao encerrar o turno do Líder. Padrão: 0.5
// (peso, não chance: a chance real é BANDIT/(BANDIT+FACTION). 0 = bandidos nunca retomam.)
const BANDIT_RETAKE_FREE_POI = 0.5;
// Peso de a FACÇÃO mais perto do POI (qualquer uma, inclusive em guerra com o jogador) tomá-lo. Padrão: 0.5
// (FACTION=1 e BANDIT=0 = sempre facção, bom para testar; os dois em 0 = o POI nunca é retomado e fica livre.)
const FACTION_TAKE_FREE_POI = 0.5;
// Quem retoma o POI livre agora: 'bandit', 'faction' ou null (continua livre). canFaction = existe facção com cidades.
// Sem facção possível, vão os bandidos (se o peso deles for maior que 0). roll opcional (0 a 1) para os testes.
function freePoiTaker(canFaction, roll) {
  const banditWeight = BANDIT_RETAKE_FREE_POI, factionWeight = canFaction ? FACTION_TAKE_FREE_POI : 0, total = banditWeight + factionWeight;
  if (total <= 0) return canFaction || banditWeight <= 0 ? null : 'bandit';
  const draw = roll === undefined ? Math.random() : roll;
  return draw < banditWeight / total ? 'bandit' : 'faction';
}

// Entreposto: estoque limitado (poigame.js, postStockLeft)
// Fração do estoque de materiais (carne, tora, minério, couro) da loja da cidade de referência que o entreposto tem
// por rodada, arredondada para baixo. Padrão: 0.5 (1 = igual à loja da cidade; 0 = o entreposto não vende materiais.)
const POST_STOCK_MULTIPLIER = 0.5;

// Retomada dos POIs do jogador pelos bandidos (poigame.js, poiRetakeChance)
// Multiplicador da chance de retomada (por rodada) dos POIs SEUS enquanto há guerra com alguma facção. Padrão: 0.5
// (1 = a guerra não muda a chance; 0 = em guerra os bandidos nunca retomam; maior que 1 = mais retomadas na guerra.)
const WAR_RETAKE_MULTIPLIER = 0.5;

// ---------- Etapa 8.5: POIs viram sítios dentro do tile (mundo novo, ?mundo=1; docs/features/13_etapa-8-migracao-mecanicas.md, D1 a D4) ----------
// Pedágio dos tiles de PONTE e FORTALEZA (macro/toll.js; o pedágio sai do POI e vai para o tile). neutral = tile sem dono; faction = tile de outra facção ANTES da relação;
// bandit = tile tomado por bandidos (passar sem lutar); rel = multiplicador do pedágio de outra facção pela relação (chaves de relStatus: ally Aliado, fav Favorável,
// neutral Neutro, unfav Desfavorável, enemy/war Inimiga); take = [mín, máx] de ações que um bando leva para tomar o tile; pull = chance de um bandido vizinho ir tentar tomar
// um tile de pedágio que não é dos bandidos; tiles = temas do grafo que cobram. O tile do jogador é de graça para ele e rende NEUTRAL a cada NPC que passa. Padrão: 100, 150, 500,
// {ally 0, fav 0.7, neutral 1, unfav 1.5, enemy 2, war 2}, [2, 3], 0.35, ['ponte', 'fortaleza']
const TOLL = { neutral: 100, faction: 150, bandit: 500, rel: { ally: 0, fav: 0.7, neutral: 1, unfav: 1.5, enemy: 2, war: 2 }, take: [2, 3], pull: 0.35, tiles: ['ponte', 'fortaleza'] };

// Torre de vigia nova (poigame.js, poiTowerUse; macro/toll.js wtTowerUse): usos por RODADA somados entre todas as torres e o binóculo; chance de o uso não achar nada.
// O alcance é o tile da torre e os vizinhos (1 salto do grafo). A dungeon achada e a marca duram só aquela rodada. Padrão: 3 e 0.5
const TOWER = { perRound: 3, fail: 0.5 };

// Baú de recompensa do POI (poigame.js, poiRewardSync): o que cada tipo de POI guarda. [item, mín, máx]; 'ammo' = pacotes de munição das armas que você tem; 'gold' = ouro.
// O baú nasce FECHADO enquanto bandidos seguram o POI e só abre depois de limpá-lo; reabastece uma vez por ocupação (se os bandidos o retomam). themeMul = multiplicador
// da quantidade quando o tile é do mesmo tema do POI (ex.: fazenda no tile de fazenda). Ruínas e vila em escombros seguem com o baú antigo. Padrão: ver a tabela, 1.5
const POI_CHEST = {
  farm: [['carne', 3, 5]], hunters: [['couro', 2, 3], ['carne', 2, 3]], mine: [['minerio', 3, 5]], sawmill: [['tora', 3, 5]],
  tower: [['ammo', 2, 3]], fort: [['ammo', 3, 4]], tavern: [['carne', 2, 3], ['bandagem', 1, 2]], inn: [['carne', 2, 3], ['bandagem', 1, 2]],
  lodge: [['bandagem', 2, 3], ['kit_medico', 1, 1]], sanctuary: [['kit_medico', 1, 2]],
  post: [['sucata', 2, 3], ['tora', 1, 2], ['minerio', 1, 2], ['carne', 1, 2]], bridge: [['gold', 100, 200]]
};
const POI_CHEST_THEME_MUL = 1.5;
// Tema do tile (grafo) em que cada tipo de POI "está em casa", para o themeMul do baú.
const POI_CHEST_HOME = { farm: 'fazenda', mine: 'mina', sawmill: 'serraria', hunters: 'animais', fort: 'fortaleza', bridge: 'ponte', ruins: 'ruinas' };

// Santuário (poigame.js, svcSanctuary): cura no altar mediante DÍZIMO. Não sofre buffs nem debuffs de preço. perHp = ouro por ponto de vida curado; part = fração da vida que
// falta que o altar cura (o hospital cura tudo e cobra 0,5 por ponto); max = teto de pontos por visita. Padrão: 0.25, 0.5, 60
const SANC_TITHE = { perHp: 0.25, part: 0.5, max: 60 };
