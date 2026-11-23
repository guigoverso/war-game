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
  // waterBias / waterNear: preferência por margem de água (fase 4; ainda não usados). Padrões: 0.7 e 12
  waterBias: 0.7, waterNear: 12
};
