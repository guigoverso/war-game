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
    // ataque a POI inimigo 2, defesa de POI conquistado 1, defesa de POI quase nada (0.25). attackExtra: soma extra do segundo
    // ataque da mesma rodada (1). opFailed: soma quando uma operação lançada não é cumprida (1). Só acumulam em STATE.war.fat
    gain: { sabotageTaken: 3, attackPoi: 2, defendConquered: 1, defendPoi: 0.25, attackExtra: 1, opFailed: 1 },
    // Fadiga que uma operação de "reduzir fadiga" tira, e a chance de ela falhar (o santuário falha 30%). Padrão: 2 e 0.3
    reduceBy: 2, reduceFail: 0.3,
    // Fadiga simples dos NPC (sem marcos): o que sobe ao perder POI, perder batalha ou sofrer sabotagem, e o que desce ao
    // ganhar batalha. Padrão: +1, +1, +1 e -1
    npc: { lostPoi: 1, lostBattle: 1, sabotage: 1, wonBattle: -1 }
  },
  // Pontos de líder por rodada = facLvl() + bônus durante a guerra. Padrão: +1 (perde ao acabar a guerra)
  leaderPointsBonus: 1,
  // Custo de cada operação do turno do Líder, em pontos de líder. Padrão: 1 cada; o ataque à cidade custa 2 (fixo)
  opCost: { attack: 1, defense: 1, sabotage: 1, reduceFatigue: 1, retaliation: 1, city: 2 },
  // Teto de operações de ataque lançadas por rodada. Padrão: 2
  maxAttacksPerRound: 2,
  // Mínimo de soldados de tipos variados na guarnição de um POI inimigo quando a operação de ataque fica ativa. Padrão: 10
  garrisonMin: 10,
  // Quantas rodadas o log narrativo da guerra (STATE.war.log) guarda; as mais antigas somem. Padrão: 30
  logMax: 30,
  // Tipos de operação do turno do Líder: on = disponível; off = motivo mostrado no botão desativado (estrutura pronta, regra nos
  // itens seguintes). Padrão: só o ataque está ativo
  ops: {
    attack: { on: true },
    city: { on: false, off: 'Chega com a batalha final da cidade (item 9).' },
    defense: { on: false, off: 'Chega com o item 11 (defesa reativa).' },
    sabotage: { on: false, off: 'Chega com a espionagem (itens 15 e 16).' },
    reduceFatigue: { on: false, off: 'Chega com a fadiga com efeitos (item 13).' }
  },
  // Fração dos POIs permanentes que o jogador precisa controlar para atacar a cidade inimiga ("maioria"). Padrão: 0.5
  // (estritamente mais que isso: com 4 POIs na frente, 3 bastam). Falta calibrar. (Reservado: a cidade só é atacável com os
  // dois POIs das pontas já seus, ver operações de guerra)
  majority: 0.5,
  // Blindagem em guerra: POI/cidade inimigo da trilha sem operação ativa não morre. Fator ×10 de dano que o jogador RECEBE dos
  // guardas ali (o ÷10 do que ele causa foi substituído pela blindagem). Padrão: 10
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
  //  band: distância máxima, em blocos, de um POI permanente à rota para entrar na cadeia (55; a 70 a rota chega a 1,8× a linha reta)
  //  avoid: folga, em blocos, que a rota guarda de cidades e POIs de quem está fora da guerra (18)
  //  waterMax: vão de água, em blocos, que a rota ainda aceita atravessar; acima disso ela contorna (a água não pode ocupar o
  //    espaço de um POI de guerra: 2 × raio + POI_GAP, ~54) (40)
  //  waterCost: custo extra por célula de água na busca (2: prefere terra, mas atravessa vão curto)
  //  pullCost: multiplicador do custo da busca de rota perto de POIs aproveitáveis e clareiras (0.7: a rota prefere passar por
  //    eles; 1 desliga). pullRadius: alcance desse desconto, em blocos (24)
  //  maxWarPois: teto de POIs de guerra por frente (8)
  //  side: distância máxima, em blocos, entre o ponto ideal de um POI de guerra na rota e o terreno de guerra reservado que
  //    ele usa (60)
  //  gap: folga, borda a borda, entre um terreno de guerra e cidades, POIs e outros terrenos de guerra (22; menor que POI_GAP
  //    porque a frente enche os vazios que a geração deixou)
  //  gapAmb: folga de clareiras e dormentes em relação a acampamentos de bandidos, grutas e outros (8)
  //  sites: clareiras (terrenos de guerra) reservadas na geração do mundo, sem árvores e sem mexer no chão, vazias até a guerra; o POI se adapta ao chão. No máximo (60)
  //  siteRange: desnível máximo aceito no chão de uma clareira; na segunda metade das tentativas aceita +6 (18)
  //  siteTries: tentativas de sorteio de lugar na geração (6000)
  //  minimap: true mostra a rota da frente (linha tracejada vermelha) também no minimapa; false só no mapa grande (true)
  //  dormMax: dormentes sorteados ao longo dos corredores entre cidades, fora os dos anéis (36)
  //  dormTries: tentativas de sorteio por dormente do anel e por ponto de corredor (60)
  //  dormStep: distância, em blocos, entre os pontos sorteados num corredor (65); dormWidth: desvio lateral máximo (45)
  //  ringSites: dormentes reservados em volta de cada cidade, em direções diferentes (3); ringRadius: distância máxima deles à muralha;
  //    no plano, o primeiro POI conquistável a partir da origem e o último antes do alvo ficam a no máximo isso (110)
  //  revert: tipos que a paz desmonta e voltam a ser decoração; os demais ficam como rastro da guerra, sem dono
  //    (hospital, depósito, atalaia e barricada voltam; acampamento e trincheira ficam)
  //  banditChance: chance de um POI de guerra do terço do meio da rota nascer de bandidos (0.4); banditMax: teto deles por frente (2)
  //  edit: edição manual da rota na declaração. Os POIs da rota mais curta são obrigatórios; o jogador também pode escolher qualquer
  //    POI (descoberto ou "?") a até radius blocos da cidade de origem, do alvo ou de um obrigatório, e só conclui com todos
  //    os obrigatórios marcados (140)
  front: { cell: 8, band: 55, avoid: 18, waterMax: 40, waterCost: 2, maxWarPois: 8, side: 60, gap: 22, gapAmb: 8, pullCost: 0.7, pullRadius: 24,
    edit: { radius: 140 },
    sites: 60, siteRange: 18, siteTries: 6000, minimap: true,
    dormTries: 60, dormMax: 36, dormStep: 65, dormWidth: 45, ringSites: 3, ringRadius: 110, banditChance: 0.4, banditMax: 2,
    revert: { fortcamp: false, trench: false, hospital: true, depot: true, lookout: true, barricade: true } }
};

// POIs de guerra novos (só visuais, sem efeitos). Raios em POI_DEFS (pois.js): Acampamento 12, Trincheira 11, Hospital 10, Depósito 10,
// Atalaia 6, Barricada 7 (só em estrada). Hospital de campanha: patients = pacientes deitados nas macas (a construção tem 7: 6 na tenda
// e 1 ao ar livre); medics = médicos que andam por ali (levam tiro); guards = soldados do dono (se for seu ou de facção; de bandidos vale a guarnição). Padrão: 5, 2 e 3
const WAR_POI = { hospital: { patients: 5, medics: 2, guards: 3 } };

// Pesos para sortear o tipo de um POI de guerra da frente pela posição t na rota (0 = cidade sua, 1 = cidade-alvo); border = t da
// fronteira (onde o controle muda). Trincheira na fronteira; Hospital e Depósito entre a fronteira e as cidades; Acampamento e
// Atalaia em qualquer lugar. Padrão: trincheira 6 perto da fronteira (até 0,15) e 0,5 longe; hospital/depósito 3 de 0,1 a 0,45 da
// fronteira e 0,5 fora; acampamento 2; atalaia 1,5. A barricada não entra aqui: só nasce num Marco de pedras ao lado de estrada.
const warTypeWeights = (t, border) => {
  const d = Math.abs(t - border), mid = d >= 0.1 && d < 0.45 ? 3 : 0.5;
  return { fortcamp: 2, trench: d < 0.15 ? 6 : 0.5, hospital: mid, depot: mid, lookout: 1.5 };
};

// Decoração dormente: guarda o lugar de um POI de guerra (sem função). r = raio (igual ao do POI de guerra que ela vira),
// types = POIs de guerra em que ela se converte. Fogueira 12 (Acampamento), Jardim 11 (Trincheira), Poço 10 (Hospital ou Depósito),
// Marco de pedras 7 (Atalaia, ou Barricada se estiver ao lado de estrada)
const WAR_DORMANT = {
  campfire: { n: 'Fogueira', r: 12, types: ['fortcamp'] }, garden: { n: 'Jardim', r: 11, types: ['trench'] },
  well: { n: 'Poço', r: 10, types: ['hospital', 'depot'] }, cairn: { n: 'Marco de pedras', r: 7, types: ['lookout', 'barricade'] }
};
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
