'use strict';
// ---------- Modificadores da reserva (reservar primeiro, esculpir depois; feature 7) ----------
// Ligado só com ?reserva=1 (o gerador antigo continua o padrão até o protótipo ser aprovado).
const reserveOn = () => new URLSearchParams(location.search).get('reserva') === '1' && !tileTestOn();
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
// o POI deste tipo entra na reserva?
const poiReserved = type => RESERVE.poiOn && RESERVE.poiTypes.includes(type);
