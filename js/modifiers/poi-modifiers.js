'use strict';
// ---------- Modificadores: POIs (retomada, estoque do entreposto) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// Pousada e alojamento de trabalhadores (poigame.js, svcInn): room = quarto como fração do preço de curar toda a vida (a taverna cobra 1,1);
// markup = acréscimo sobre os preços da loja da cidade de referência; cash = ouro que o comerciante tem para COMPRAR de você por rodada (100). Padrão: pousada room 1.0 e markup 0.10; alojamento (rústico) room 0.8 e markup 0.05
const POI_REST = { inn: { room: 1.0, markup: 0.10, cash: 100 }, lodge: { room: 0.8, markup: 0.05, cash: 100 } };

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
