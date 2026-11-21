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

// Custo para evoluir uma cidade do jogador (econ.js canCityUp, book.js)
// Custo para ir do nível n ao n+1, por nível ATUAL da cidade (n de 1 a 4; o nível 5 é o máximo e não tem custo).
// Chaves aceitas: gold (ouro), food (comida), ore (minério), wood (madeira), leather (couro).
// Padrão: 1→2 ◉400 + 10 madeira · 2→3 ◉800 + 20 madeira · 3→4 ◉1200 + 30 madeira + 10 minério · 4→5 ◉2000 + 30 madeira + 40 minério.
const CITY_UP_COST = { 1: { gold: 400, wood: 10 }, 2: { gold: 800, wood: 20 }, 3: { gold: 1200, wood: 30, ore: 10 }, 4: { gold: 2000, wood: 30, ore: 40 } };
// Custo de evoluir a cidade c (objeto da cidade em WORLD.cities) para o próximo nível, ou null se já está no máximo.
// Para custos diferentes por cidade, olhe c.id, c.home (capital) ou c.biome aqui. Só consulta cityLvl (econ.js) na hora da chamada.
function cityCostOf(c) { 
 return CITY_UP_COST[cityLvl(c)] || null 
}
