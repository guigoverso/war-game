'use strict';
// ---------- Modificadores da reserva (reservar primeiro, esculpir depois; feature 7) ----------
// Ligado por padrão (desde 2026-11-23); ?reserva=0 volta ao gerador antigo (para comparar). Desligado em ?cenario=batalha.
const reserveOn = () => new URLSearchParams(location.search).get('reserva') !== '0' && !tileTestOn();
const RESERVE = {
  // maxInvented: fração da área reservada (pegada + faixa plana) que era água no terreno rascunho; acima disso a cidade é corrigida. Padrão: 0.15
  maxInvented: 0.15,
  // maxRounds: voltas do laço de verificação no rascunho (mover, encolher, trocar de ponto, remover). Padrão: 5
  maxRounds: 5,
  // minHalf: tamanho mínimo (raio, blocos) ao encolher uma cidade que não coube (o sorteio normal é de 36 a 45). Padrão: 28
  minHalf: 28,
  // apron: faixa plana (blocos) além da pegada, onde o muro e as torres assentam, antes da rampa começar. Padrão: 4
  apron: 4,
  // mtnRise: quanto (blocos) o terreno natural além da borda da cidade precisa ser mais alto que ela para o lado virar montanha. Padrão: 6
  mtnRise: 6,
  // mtnSlope: inclinação da encosta ao lado da cidade (blocos de altura por bloco de distância, a partir da faixa plana); maior = mais íngreme. Padrão: 1
  mtnSlope: 1,
  // mtnChance: chance de cada lado elegível (terreno alto ao lado) ficar com a montanha natural, sem rampa; mtnMax: máximo de lados por cidade. Padrões: 0.8 e 2
  mtnChance: 0.8, mtnMax: 2,
  // roughPenalty: peso do desnível em volta na escolha do local da cidade no modo reserva (o antigo é 0.35); menor = aceita cidade perto de serra. Padrão: 0.15
  roughPenalty: 0.15,
  // roadWater: custo extra do A* por célula de água nas estradas do modo reserva (o antigo é 1); maior = prefere travessia curta ou contornar. Padrão: 3
  roadWater: 3,
  // gateLinkMax: distância máxima (blocos) de um portão aberto sem estrada até a estrada mais próxima para ligar os dois (sem ponte); mais longe, o portão fica sem estrada. Padrão: 40
  gateLinkMax: 40,
  // waterBias: chance de cada cidade preferir a margem de um rio, lago ou o mar (as outras são indiferentes); waterNear: distância ideal (blocos)
  // entre a borda da cidade e a água. Padrões: 0.7 e 12
  waterBias: 0.7, waterNear: 12,
  // waterBonus: pontos que o local ideal ganha na escolha (a distância entre cidades vale ~220; maior = a água pesa mais); waterTol: a partir de quantos
  // blocos do ideal o bônus zera; waterMax: alcance da busca por água a partir do centro. Padrões: 60, 50 e 110
  waterBonus: 60, waterTol: 50, waterMax: 110,
  // poiOn: liga a reserva dos POIs grandes (fase 3). Padrão: true
  poiOn: true,
  // poiTypes: POIs permanentes grandes e de tamanho fixo que entram na reserva (o chão final nasce com a plataforma e a rampa deles);
  // os outros (caçadores, torre, ruínas, pedágio de ponte) continuam sendo aplainados depois, como antes. Padrão: os de raio 14 ou mais
  // poiSlope: inclinação máxima da rampa em volta do POI reservado (blocos de altura por bloco de distância; menor = mais suave); poiRamp: alcance máximo da rampa (blocos). Padrões: 0.5 e 30
  poiSlope: 0.5, poiRamp: 30,
  // dormFlat: raio (blocos) do disco plano sob o enfeite dormente (fogueira, jardim, poço, marco); dormRamp: alcance da rampa circular em volta. Padrões: 7 e 10
  dormFlat: 7, dormRamp: 10,
  // poiDisc: a plataforma dos POIs grandes é um disco de raio (raio do POI × poiDisc); 1.41 cobre os cantos do quadrado, menor deixa a plataforma menor. Padrão: 1.3
  poiDisc: 1.3,
  // poiRampLate: alcance da rampa dos POIs não reservados (caçadores, torre, ruínas), aplainados depois das estradas: curta para não mexer nelas. Padrão: 4
  poiRampLate: 4,
  poiTypes: ['farm', 'mine', 'sawmill', 'sanctuary', 'post', 'fort', 'tavern']
};
// ---------- Rios desenhados (fase 5; só com ?reserva=1, js/rivers.js) ----------
const RIVER = {
  // on: liga os rios desenhados (nascem no alto e descem até o mar) no lugar do ruído de rios do gerador antigo; ?rios=0 desliga (comparação). Padrão: ligado
  on: new URLSearchParams(location.search).get('rios') !== '0',
  // count: quantos rios (mínimo e máximo; sorteio por semente); spacing: distância mínima (blocos) entre duas nascentes. Padrões: [3, 5] e 130
  count: [3, 5], spacing: 130,
  // srcRise: altura mínima da nascente acima do mar (blocos); srcSea: distância mínima da nascente até o mar (blocos); minLen: rio mais curto aceito (blocos).
  // Padrões: 5, 45 e 90
  srcRise: 5, srcSea: 45, minLen: 90,
  // spring: comprimento (blocos) do trecho de nascente em que o leito ainda é raso e vai ficando fundo. Padrão: 30
  spring: 30,
  // wMin/wGrow/wMax: meia-largura do leito (blocos) = wMin + wGrow × distância percorrida, até wMax; mergeBoost: acréscimo por rio que se junta. Padrões: 1.4, 0.012, 4.5 e 0.3
  wMin: 1.4, wGrow: 0.012, wMax: 4.5, mergeBoost: 0.3,
  // valley: alcance (blocos) do vale suave em volta do leito; bank: largura (blocos) da margem em declive. Padrões: 18 e 5
  valley: 18, bank: 5,
  // lake: um poço natural do terreno (depressão) com pelo menos esta profundidade (blocos) vira lago onde o rio passa; lakeMax: raio máximo (blocos). Padrões: 2 e 10
  lake: 2, lakeMax: 10
};
// ---------- Cidades multiníveis (fase 6; só com ?reserva=1; ?niveis=0 desliga, para comparar) ----------
const CITY_MULTI = {
  // on: a cidade ganha elevações e depressões suaves (mapa de altura c.lv), com casas em plataformas. Padrão: ligado
  on: new URLSearchParams(location.search).get('niveis') !== '0',
  // amp: variação máxima (blocos) do relevo da cidade para cima e para baixo; scale: tamanho (blocos) das ondulações. Padrões: 4 e 26
  amp: 4, scale: 26,
  // slope: inclinação máxima das ruas (blocos de altura por bloco; 0.3 = 1 bloco a cada ~3). Padrão: 0.3
  slope: 0.3,
  // plazaFlat: raio (blocos, medido em quadrado) da praça que fica sempre plano, e plazaRamp: distância até as ondulações valerem por inteiro. Padrões: 13 e 14
  plazaFlat: 13, plazaRamp: 14,
  // edge: faixa (blocos) junto à borda da cidade que volta ao nível da faixa plana (o muro, as torres e os portões ficam no nível c.y). Padrão: 7
  edge: 7,
  // bowl: quanto (blocos) o bairro longe da praça é mais baixo que o centro (a praça fica mais alta); lowShore: quanto o bairro à beira d'água desce;
  // shoreReach: distância (blocos) da água em que esse bairro baixo começa. Padrões: 1.5, 2 e 16
  bowl: 1.5, lowShore: 2, shoreReach: 16,
  // lotRing: faixa (blocos) em volta de cada plataforma de casa onde o terreno é limitado a 1 bloco de diferença dela (degrau de acesso). Padrão: 4
  lotRing: 4,
  // mtnAmp: multiplica a ondulação e a inclinação das cidades encostadas em serra (c.mtn); mtnRise: quanto (blocos) o terreno sobe em direção ao lado da montanha. Padrões: 1.6 e 5
  mtnAmp: 1.6, mtnRise: 5
};
// o POI deste tipo entra na reserva?
const poiReserved = type => RESERVE.poiOn && RESERVE.poiTypes.includes(type);
