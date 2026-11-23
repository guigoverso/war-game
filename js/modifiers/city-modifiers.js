'use strict';
// ---------- Modificadores: cidades (muros, atiradores e custo de evolução) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Este arquivo carrega cedo: funções daqui só podem usar globais de outros arquivos DENTRO do corpo (na hora da chamada).

// Visual e defesa da cidade por nível (city.js cityWallBuild, allies.js citySentrySync)
// Tipo de muro de cada nível de cidade (1 a 5). Padrão: 1 sem muro, 2 cerca, 3 paliçada (torres de enfeite, sem atiradores),
// 4 paliçada (com atiradores), 5 muralha de pedra (com atiradores). Valores aceitos: 'none', 'fence', 'palisade', 'stone'.
const CITY_WALL_BY_LEVEL = { 1: 'none', 2: 'fence', 3: 'palisade', 4: 'palisade', 5: 'stone' };
const cityWallTypeAt = level => CITY_WALL_BY_LEVEL[level] || 'none';
// Quantos atiradores do jogador ocupam as torres de uma cidade sua, por nível (limitado ao número de torres do muro).
// Padrão: nenhum até o nível 3, 4 no nível 4 e 8 no nível 5 (como as cidades NPC de rank 3-4 e 5-6). 0 = a cidade não tem atiradores.
const CITY_SENTRY_COUNT = { 4: 4, 5: 8 };
const citySentriesAt = level => CITY_SENTRY_COUNT[level] || 0;
// Alcance do tiro do atirador de torre, em blocos. Padrão: 60
const CITY_SENTRY_RANGE = 60;
// Segundos entre um tiro e o outro de cada atirador. Padrão: 1.6
const CITY_SENTRY_COOLDOWN = 1.6;
// Dano de cada tiro que acerta (os bandidos de raid têm de 40 a 100 de vida). Padrão: 14
const CITY_SENTRY_DAMAGE = 14;
// Chance de o tiro acertar (0 a 1). Padrão: 0.5
const CITY_SENTRY_HIT = 0.5;

// Pegada da cidade: a cidade se adapta ao terreno (cityfoot.js; world.js aplaina só dentro da pegada)
// coreX/coreZ: meia-largura do núcleo (praça + prédios dos cantos) que precisa ser terra firme. Padrão: 16 e 23
// maxDev: desnível máximo (blocos) entre um bloco da pegada e a altura média do núcleo (multiplicado por `dev` de cada etapa de `relax`). Padrão: 6
// ramp: largura (blocos) da rampa que liga a pegada ao relevo em volta. Padrão: 20
// nudge/nudgeStep: o centro pode andar até `nudge` blocos (de `nudgeStep` em `nudgeStep`) procurando o melhor chão. Padrão: 40 e 4
// shapeBase/shapeNoise/shapeMin: contorno irregular (mesmo em chão aberto): raio relativo = base + ruído*amplitude, mínimo shapeMin.
//   Padrão: 0.85, 0.6, 0.72 (1 = a caixa `half` inteira)
// relax: etapas tentadas na ordem até alguma servir; dev = fator do desnível máximo, beach = faixa mínima de terra (blocos) até a água.
//   Padrão: {1,3} {1.5,3} {2.2,2} {3,1}
// relocateTries/relocateGap: se a cidade não achou chão, tenta até `relocateTries` outros pontos candidatos, a no mínimo `relocateGap`
//   blocos das outras cidades. Padrão: 300 e 140
// density: blocos de pegada por casa (menor = cidade mais cheia; a meta de casas é área ÷ density). Padrão: 150
// houseGap: folga entre prédios (era 3; com 2 o vão mínimo é de 2 blocos). Padrão: 2
// serviceSpread/serviceMinDist/serviceTries: prédios de serviço (loja, clínica, capela, quartel, prefeitura, taverna, armazém, oficina) ficam a
//   pelo menos `serviceSpread` blocos uns dos outros e os 4 primeiros a `serviceMinDist` blocos da borda da praça; `serviceTries` sorteios por
//   prédio. Padrão: 18, 6 e 1500
// plazaOff: quanto a praça pode ficar fora do centro da cidade (fração de `half`, com 2 intensidades: plazaOff e 60% dela; a pegada se
//   desloca e a caixa `half` cresce junto). 0 = sempre no centro. Padrão: 0.5
// shoreSlope: inclinação máxima da cidade e da rampa perto da água (blocos de altura por bloco de distância até a margem). Padrão: 1
// towerGap/towerMax: torres do muro (além das 2 de cada portão): afastadas ao menos `towerGap` blocos entre si, no máximo `towerMax` no total.
//   Padrão: 24 e 20
// frontGap: [mín, máx] de blocos entre casas vizinhas na mesma rua (era 3 a 5). Padrão: [2, 3]
const CITY_FOOT = {
  coreX: 16, coreZ: 23, maxDev: 6, ramp: 20, nudge: 40, nudgeStep: 4, relocateTries: 300, relocateGap: 140,
  density: 150, houseGap: 2, frontGap: [2, 3],
  towerGap: 24, towerMax: 20, serviceSpread: 18, serviceMinDist: 6, serviceTries: 1500, plazaOff: 0.5, shoreSlope: 1,
  shapeBase: 0.85, shapeNoise: 0.6, shapeMin: 0.72, relax: [{ dev: 1, beach: 3 }, { dev: 1.5, beach: 3 }, { dev: 2.2, beach: 2 }, { dev: 3, beach: 1 }]
};

// Custo para evoluir uma cidade do jogador (econ.js canCityUp, book.js)
// Custo para ir do nível n ao n+1, por nível ATUAL da cidade (n de 1 a 4; o nível 5 é o máximo e não tem custo).
// Chaves aceitas: gold (ouro), food (comida), ore (minério), wood (madeira), leather (couro).
// Padrão: 1→2 ◉400 + 10 madeira · 2→3 ◉800 + 20 madeira · 3→4 ◉1200 + 30 madeira + 10 minério · 4→5 ◉2000 + 30 madeira + 40 minério.
const CITY_UP_COST = { 1: { gold: 400, wood: 10 }, 2: { gold: 800, wood: 20 }, 3: { gold: 1200, wood: 30, ore: 10 }, 4: { gold: 2000, wood: 30, ore: 40 } };
// Custo de evoluir a cidade c (objeto da cidade em WORLD.cities) para o próximo nível, ou null se já está no máximo.
// Para custos diferentes por cidade, olhe c.id, c.home (capital) ou c.biome aqui. Só consulta cityLvl (econ.js) na hora da chamada.
function cityCostOf(c) { 
  return {gold: 1}
 //return CITY_UP_COST[cityLvl(c)] || null 
}
// WILD_SHADE: brilho do chão de acampamentos de bandidos e baús escondidos (1 = cor natural do bioma; menor = mancha mais escura). A mancha fica mesmo quando o acampamento some. Padrão: 0.92
const WILD_SHADE = 0.92;
