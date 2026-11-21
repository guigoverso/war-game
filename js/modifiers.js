'use strict';
// ---------- Modificadores: números e regras pequenas que o autor ajusta direto, sem pedir à IA ----------
// Aqui ficam as constantes (valores de balanceamento) e as funções de decisão que as regras novas consultam.
// Só entram os modificadores criados a partir da feature "Atualizações dos POIs"; os antigos seguem em ECON, POL, POIX etc.
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// ---------- POI livre sem decisão (poigame.js, gancho 'leaderEnd') ----------
// Peso de os BANDIDOS retomarem um POI livre que o jogador ignorou, ao encerrar o turno do Líder. Padrão: 0.5
// (peso, não chance: a chance real é BANDIT/(BANDIT+FACTION). 0 = bandidos nunca retomam.)
const BANDIT_RETAKE_FREE_POI=0.5;
// Peso de a FACÇÃO mais perto do POI (qualquer uma, inclusive em guerra com o jogador) tomá-lo. Padrão: 0.5
// (FACTION=1 e BANDIT=0 = sempre facção, bom para testar; os dois em 0 = o POI nunca é retomado e fica livre.)
const FACTION_TAKE_FREE_POI=0.5;
// Quem retoma o POI livre agora: 'bandit', 'faction' ou null (continua livre). canFaction = existe facção com cidades.
// Sem facção possível, vão os bandidos (se o peso deles for maior que 0). roll opcional (0 a 1) para os testes.
function freePoiTaker(canFaction,roll){
  const banditWeight=BANDIT_RETAKE_FREE_POI,factionWeight=canFaction?FACTION_TAKE_FREE_POI:0,total=banditWeight+factionWeight;
  if(total<=0)return canFaction||banditWeight<=0?null:'bandit';
  const draw=roll===undefined?Math.random():roll;
  return draw<banditWeight/total?'bandit':'faction';
}

// ---------- Retomada dos POIs do jogador pelos bandidos (poigame.js, poiRetakeChance) ----------
// Multiplicador da chance de retomada (por rodada) dos POIs SEUS enquanto há guerra com alguma facção. Padrão: 0.5
// (1 = a guerra não muda a chance; 0 = em guerra os bandidos nunca retomam; maior que 1 = mais retomadas na guerra.)
const WAR_RETAKE_MULTIPLIER=0.5;
