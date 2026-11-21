'use strict';
// ---------- Guerra: estado salvo (Fase 6; números em WAR, js/modifiers/war-modifiers.js) ----------
// STATE.war guarda só a CAMPANHA; quem está em guerra com o jogador continua em STATE.rel[fid].war (factions.js).
//  fat    fadiga de guerra do jogador (0 a WAR.fatigue.max)
//  nfat   fadiga simples de cada facção NPC {fid: n}
//  camps  campanha por inimigo principal {fid: {kind:'attack'|'defense', since:rodada, allies:{player:[fid], enemy:[fid]}}}
//  ops    operações planejadas na rodada: {type, target, fid, cost}
//  inc    ataques inimigos pendentes (viram operação de Defesa no turno do Líder seguinte): {fid, target}
//  pts    pontos de líder gastos na rodada atual
// Ainda não há operações nem batalhas: este arquivo só dá o chão para elas (itens 5 a 13 do plano da fase 6).
const warNew = () => ({ fat: 0, nfat: {}, camps: {}, ops: [], inc: [], pts: 0 });
Hooks.on('resetState', () => { STATE.war = warNew(); });
// Acessor: cria o estado se faltar (partida nova ou save antigo) e completa campos que faltem.
function warX() {
  const W = STATE.war || (STATE.war = warNew()), d = warNew();
  for (const k in d) if (W[k] === undefined) W[k] = d[k];
  return W;
}
// Há campanha de guerra do jogador em andamento?
const warActive = () => Object.keys(warX().camps).length > 0;
// Marco de fadiga atual do jogador (0 a 3) e acréscimo de suprimento correspondente.
const warMark = () => warFatigueMark(warX().fat);
const warSupply = () => warSupplyBonus(warX().fat);
// Aplica o estado lido de um save (save.js).
function warApply(s) { STATE.war = Object.assign(warNew(), s || {}); }
