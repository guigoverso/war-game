'use strict';
// ---------- Modificadores: guerra (Fase 6; desenho em docs/fase-6-guerra.md) ----------
// Todo modificador tem um comentário acima: para que serve e o valor padrão. Altere o valor e recarregue o jogo.
// Os valores são PONTO DE PARTIDA, a calibrar jogando. O estado da guerra (STATE.war) fica em js/war.js.

// Objeto único de balanceamento da guerra (como ECON, POL e RAID_WAVES).
const WAR = {
  // Fadiga de guerra do jogador (barra de 0 a max; sobe enquanto a guerra dura)
  fatigue: {
    // Teto da barra. Aos 20 acabam ataque, sabotagem e reduzir fadiga, e o jogador perde metade dos pontos de líder. Padrão: 20
    max: 20,
    // Marcos em que a necessidade de suprimento das cidades sobe (logística da guerra). Padrão: 5, 10 e 15
    marks: [5, 10, 15],
    // Acréscimo de necessidade em cada marco, na mesma ordem de marks (0.15 = +15%). Padrão: +15%, +30%, +45%
    supplyBonus: [0.15, 0.30, 0.45],
    // Quanto a fadiga do jogador sobe por tipo de evento (do maior para o menor). Padrão: sabotagem sofrida 3,
    // ataque a POI inimigo 2, defesa de POI conquistado 1, defesa de POI quase nada (0.25)
    gain: { sabotageTaken: 3, attackPoi: 2, defendConquered: 1, defendPoi: 0.25 },
    // Fadiga que uma operação de "reduzir fadiga" tira, e a chance de ela falhar (o santuário falha 30%). Padrão: 2 e 0.3
    reduceBy: 2, reduceFail: 0.3,
    // Fadiga simples dos NPC (sem marcos): o que sobe ao perder POI, perder batalha ou sofrer sabotagem, e o que desce ao
    // ganhar batalha. Padrão: +1, +1, +1 e -1
    npc: { lostPoi: 1, lostBattle: 1, sabotage: 1, wonBattle: -1 }
  },
  // Pontos de líder por rodada = facLvl() + bônus durante a guerra. Padrão: +1 (perde ao acabar a guerra)
  leaderPointsBonus: 1,
  // Custo de cada operação do turno do Líder, em pontos de líder. Padrão: 1 cada; a cidade final custa mais (3)
  opCost: { attack: 1, defense: 1, sabotage: 1, reduceFatigue: 1, retaliation: 1, city: 3 },
  // Fração dos POIs permanentes que o jogador precisa controlar para atacar a cidade inimiga ("maioria"). Padrão: 0.5
  // (estritamente mais que isso: com 4 POIs na frente, 3 bastam). Falta calibrar.
  majority: 0.5,
  // Penalidade de entrar em local proibido (turno do Comandante): dano que o jogador causa ÷10 e que recebe ×10. Padrão: 10
  forbiddenFactor: 10,
  // Entrada dos aliados: rodadas de atraso do aliado do jogador (1 a 2) e "questão de tempo" da facção agressiva
  // aliada do inimigo (2 a 4). Padrão: [1,2] e [2,4]
  allyDelay: { player: [1, 2], aggressive: [2, 4] },
  // Fração do espólio das batalhas que vai para o aliado do jogador. Padrão: 0.1
  allyLoot: 0.1,
  // Espionagem (desenho ainda em aberto; chance base de a sabotagem dar certo, 0 a 1). Padrão: 0.5
  sabotageBase: 0.5,
  // Chance por rodada de o inimigo atacar no fim da rodada, por temperamento (agressiva quase toda rodada, neutra de vez em
  // quando; pacífica nunca declara). Padrão: agressiva 0.9, neutra 0.3, pacífica 0
  attackChance: { aggressive: 0.9, neutral: 0.3, peaceful: 0 },
  // Cenário ?cenario=guerra: rodada inicial, ouro, nível da facção, cidades conquistadas além da capital e comida/minério.
  // Padrão: rodada 3, ◉20000, nível 3, 1 cidade extra, 40 e 40.
  // startAtWar: true começa com a guerra já declarada; false começa em paz e você declara pela tela de Negociações. Padrão: true
  // splitPois: true divide os POIs permanentes entre você e o inimigo (teste do painel Conquistar POI); false deixa os POIs
  // como o mundo os gerou (bandidos, livres, de facções), bom para testar a frente. Padrão: false
  scenario: { round: 3, coins: 20000, lvl: 3, extraCities: 1, food: 40, ore: 40, startAtWar: true, splitPois: false },
  // Frente da guerra (feature 36): como a rota entre a cidade sua e o alvo vira uma cadeia de POIs.
  //  cell: tamanho da grade da busca de rota, em blocos (8)
  //  band: distância máxima, em blocos, de um POI permanente à rota para entrar na cadeia (45)
  //  avoid: folga, em blocos, que a rota guarda de cidades e POIs de quem está fora da guerra (18)
  //  waterMax: vão de água, em blocos, que a rota ainda aceita atravessar; acima disso ela contorna (a água não pode ocupar o
  //    espaço de um POI de guerra: 2 × raio + POI_GAP, ~54) (40)
  //  waterCost: custo extra por célula de água na busca (2: prefere terra, mas atravessa vão curto)
  //  slope: desnível máximo do terreno de um POI de guerra (os POIs de guerra não aplainam o chão em jogo) (4)
  //  maxWarPois: teto de POIs de guerra por frente (8)
  //  side: quanto o POI de guerra pode sair da rota para achar terreno bom, em blocos (40)
  //  gap: folga, borda a borda, entre um POI de guerra e cidades, POIs vizinhos e outros POIs de guerra (22; menor que POI_GAP
  //    porque a frente enche os vazios que a geração deixou)
  front: { cell: 8, band: 45, avoid: 18, waterMax: 40, waterCost: 2, slope: 4, maxWarPois: 8, side: 40, gap: 22 }
};

// Chance de um POI de guerra da frente ser Acampamento fortificado (senão, Trincheira). t = posição na rota (0 = cidade sua,
// 1 = cidade-alvo); nearEnemy = há POI do inimigo colado. Perto da cidade sua: acampamento; perto dos POIs do inimigo: trincheira.
// Padrão: 1 - t, menos 0.3 se houver POI do inimigo colado (entre 0.1 e 0.9)
const warCampChance = (t, nearEnemy) => Math.max(0.1, Math.min(0.9, 1 - t - (nearEnemy ? 0.3 : 0)));
// A cidade ou POI pode ser alvo de guerra? Padrão: qualquer cidade do inimigo, ou POI permanente dele (nunca ruínas, ponte de
// aliado, POI de guerra). Aliado do inimigo não pode (só se entrar na guerra).
const warCanTarget = (fid, kind, ref) => kind === 'city'
  ? ref.owner === 'enemy' && ref.fid === fid && !ref.rebel
  : ref.owner === fid && ref.type !== 'ruins' && !POI_DEFS[ref.type].war;

// Cenário de guerra: quantos POIs permanentes ficam com o jogador entre n no total. Metade, arredondada para baixo
// (com número ímpar o NPC fica com a maioria). Padrão: floor(n / 2)
const warScenarioPlayerPois = n => Math.floor(n / 2);

// Marco de fadiga atingido (0 = nenhum, 1, 2 ou 3) para uma fadiga f. Usa WAR.fatigue.marks.
function warFatigueMark(f) {
  let n = 0;
  for (const m of WAR.fatigue.marks) if (f >= m) n++;
  return n;
}
// Acréscimo de necessidade de suprimento (0 a 0.45) para a fadiga f. É a logística da guerra: não somar outro acréscimo à parte.
function warSupplyBonus(f) {
  const n = warFatigueMark(f);
  return n ? WAR.fatigue.supplyBonus[n - 1] : 0;
}
