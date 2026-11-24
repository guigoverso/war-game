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

// Cidade ENORME (etapa 4B; tile temático 'cidade', ?cenario=tile&tema=cidade; docs/features/8_tiles-e-vilas.md). Ocupa de 40% a 60% da ÁREA do tile
// (em 384: lado de 243 a 297). Reaproveita buildCity com ruas em blocos, várias praças e formatos de pegada próprios. Padrões entre parênteses.
// areaFrac: [mín, máx] da área do tile ocupada pela pegada (0.25 e 0.35; a spec original era 0.40 a 0.60, reduzida para sobrar espaço aos POIs e ao cerco).
// boxMax: máximo da área do tile ocupada pela CAIXA (o quadrado em volta da pegada; formatos magros ganham caixa maior, mas até aqui) (0.45).
// minHalf: raio mínimo (blocos) ao encolher quando o terreno não deixa (70).
// margin: folga (blocos) entre a caixa da cidade e a borda do tile, para o muro, a rampa e a faixa de árvores (14).
// plazaOff: quanto a praça sai do centro da pegada (fração de `half`; ainda limitado pela folga do tile) (0.12). devMul: multiplica o desnível
// aceito pela pegada (CITY_FOOT.maxDev), porque a cidade é grande e o terreno vira terraço (1.5). nudge: quanto o centro pode andar (16).
// shapes: pesos dos formatos da pegada (ver cityShapeQ em cityfoot.js): quadrado (contorno quase quadrado, o de sempre), circulo, losango, oval,
// cruz, ele (em L), flor (lobos). Formato forçado por ?forma_cidade=<nome>.
// edge: recorte irregular do contorno (como CITY_FOOT.shapeBase/shapeNoise/shapeMin, mas bem menor, para o formato ficar legível) (0.97, 0.3 e 0.9).
// blockStep: [mín, máx] de blocos entre ruas paralelas da malha (quarteirões). avenue: meia-largura (blocos) das avenidas principais; street: das ruas.
// plazas: [mín, máx] de praças extras além da central; plazaP: meia-largura delas ([mín, máx]).
// density: blocos de pegada por casa (maior = menos casas; evita milhares de prédios e deixa a geração dentro do limite de 5 s) (260).
// serviceSpread: distância mínima (blocos) entre prédios de serviço (60). towerGap/towerMax: torres do muro (44 e 70).
// soldiers: soldados da cidade fora de guerra (10). civ: [mín, máx] de moradores (50, 70); a cidade é grande e precisa de gente nas ruas.
// walls: tipos de muro sorteados (a cidade enorme sempre tem muro, para o formato aparecer); ?muro=pedra|paliçada|cerca força um.
const CITY_HUGE = {
  areaFrac: [0.25, 0.35], boxMax: 0.45, minHalf: 70, margin: 14, plazaOff: 0.12, devMul: 1.5, nudge: 16,
  shapes: { quadrado: 3, circulo: 2, losango: 1, oval: 2, cruz: 1.5, ele: 1.5, flor: 1.5 },
  edge: { base: 0.97, noise: 0.3, min: 0.9 }, blockStep: [22, 30], avenue: 3, street: 1, plazas: [2, 4], plazaP: [5, 7],
  density: 260, serviceSpread: 60, towerGap: 44, towerMax: 70, soldiers: 10, civ: [50, 70],
  walls: ['stone', 'palisade', 'fence']
};
// Meia-largura (raio `half0`) da caixa de uma cidade enorme para um tile de lado `size`: a pegada ocupa size² × fração (areaFrac); formatos que
// enchem menos a caixa (CITY_SHAPES[...].fill, relativo a 0.8 do quadrado) ganham caixa maior, até caber no tile (folga `margin`).
function cityHugeHalf(rng, size, shape) {
  const f = rng.range(CITY_HUGE.areaFrac[0], CITY_HUGE.areaFrac[1]), fill = (CITY_SHAPES[shape] || { fill: 0.8 }).fill;
  return Math.min(Math.floor((size - 1) / 2) - CITY_HUGE.margin, Math.floor(size * Math.sqrt(CITY_HUGE.boxMax) / 2), Math.floor(size * Math.sqrt(f) / 2 * Math.sqrt(0.8 / fill)));   // 0.8 = fill do quadrado
}
// Formato da pegada de uma cidade enorme: ?forma_cidade=<nome> ou sorteio por peso (rng).
function cityHugeShape(rng) {
  const f = new URLSearchParams(location.search).get('forma_cidade');
  if (f && CITY_HUGE.shapes[f] !== undefined) return f;
  const k = Object.keys(CITY_HUGE.shapes), tot = k.reduce((a, s) => a + CITY_HUGE.shapes[s], 0);
  let r = rng.next() * tot;
  for (const s of k) { r -= CITY_HUGE.shapes[s]; if (r <= 0) return s }
  return k[0];
}

// VILA (etapa 4C; tile temático 'vila', ?cenario=tile&tema=vila; docs/features/8_tiles-e-vilas.md). A vila ocupa no máximo 10% do tile (caixa de lado até ~121).
// Reaproveita buildCity (c.vila): sem ruas, só caminhos de terra estreitos ligando as casas, cerca em vez de muro, poucos serviços e poucos soldados.
// Padrões entre parênteses.
// half: [mín, máx] do raio da caixa em blocos (lado = 2*half+1; 58 dá lado 117, 5,4% do tile em área? não: 117² / 384² = 9,3%) ([54, 60]).
// margin: folga entre a caixa e a borda do tile (12). minHalf: raio mínimo ao encolher por falta de chão (28). plazaOff: deslocamento da praça (0.12).
// devMul: multiplica o desnível aceito pela pegada (1.5). nudge: quanto o centro pode andar (16). edge: recorte do contorno (como em CITY_HUGE.edge).
// shapes: pesos dos formatos da pegada (os de CITY_SHAPES em cityfoot.js; losango e cruz ficam de fora porque ficam finos demais em ~100 blocos).
// plaza: meia-largura da praça, [mín, máx] (5, 6). road: meia-largura dos caminhos de terra entre as casas (1).
// branches: [mín, máx] de caminhos extras saindo dos eixos (14, 22). density: blocos de pegada por casa (120).
// services: prédios de serviço que a vila tem (o resto some): loja e quartel; o armazém, a loja de itens e a prefeitura entram do mesmo jeito que na cidade,
//   só que menores (ver city.js). soldiers: [mín, máx] de soldados fora de guerra (3, 6). civ: [mín, máx] de moradores (8, 14).
// wall: tipo de cerca da vila ('fence'; sem muro de pedra nem torres de verdade).
const CITY_VILLAGE = {
  half: [54, 60], margin: 12, minHalf: 28, plazaOff: 0.12, devMul: 1.5, nudge: 16,
  shapes: { quadrado: 3, circulo: 2, oval: 2, ele: 2, flor: 1.5 },
  edge: { base: 0.95, noise: 0.35, min: 0.85 }, plaza: [5, 6], road: 1, branches: [14, 22], density: 120,
  services: ['shop', 'barracks'], soldiers: [3, 6], civ: [8, 14], wall: 'fence'
};
// Configuração da cidade grande de c: CITY_HUGE (cidade enorme), CITY_VILLAGE (vila) ou null (cidade do mapa antigo).
const cityBig = c => c.huge ? CITY_HUGE : c.vila ? CITY_VILLAGE : null;
// Formato da vila (pesos de CITY_VILLAGE.shapes; ?forma_cidade=<nome> força um) e raio da caixa (CITY_VILLAGE.half).
function cityVillageShape(rng) {
  const f = new URLSearchParams(location.search).get('forma_cidade');
  if (f && CITY_VILLAGE.shapes[f] !== undefined) return f;
  const k = Object.keys(CITY_VILLAGE.shapes), tot = k.reduce((a, s) => a + CITY_VILLAGE.shapes[s], 0);
  let r = rng.next() * tot;
  for (const s of k) { r -= CITY_VILLAGE.shapes[s]; if (r <= 0) return s }
  return k[0];
}
const cityVillageHalf = (rng, size) => Math.min(Math.floor((size - 1) / 2) - CITY_VILLAGE.margin, rng.int(CITY_VILLAGE.half[0], CITY_VILLAGE.half[1]));
// Soldados de uma cidade grande fora de guerra (cidade enorme: CITY_HUGE.soldiers; vila: sorteio em CITY_VILLAGE.soldiers).
const cityGuardCount = (c, rng) => c.huge ? CITY_HUGE.soldiers : rng.int(CITY_VILLAGE.soldiers[0], CITY_VILLAGE.soldiers[1]);
const cityCivCount = (c, rng) => c.huge ? rng.int(CITY_HUGE.civ[0], CITY_HUGE.civ[1]) : rng.int(CITY_VILLAGE.civ[0], CITY_VILLAGE.civ[1]);

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
