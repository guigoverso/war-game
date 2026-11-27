'use strict';
// ---------- Pedágio e torre de vigia no mapa mundi (etapa 8.5; docs/features/13_etapa-8-migracao-mecanicas.md, D3 e D4). Camada macro: sem Three.js nem DOM ----------
// Pedágio: os tiles de ponte e fortaleza cobram do BATALHÃO (caravana e bandido não pagam) ao ATRAVESSAR para o lado oposto ao de onde veio (wtMove chama wtTollCheck).
// O preço vem do dono do tile (wtOwnerOf, tileecon.js): o do jogador é de graça para ele; neutro TOLL.neutral; outra facção TOLL.faction x a relação; bandidos TOLL.bandit.
// Torre de vigia: até TOWER.perRound usos por rodada; cada um acha (50%) uma dungeon no tile da torre ou nos vizinhos e marca o tile só por aquela rodada (STATE.wt.dung).
// Números em TOLL e TOWER (poi-modifiers.js); textos em poi-texts.js. Teste em Node: tests/macro/toll.js.

const wtTollTile = (G, id) => !!G.nodes[id] && TOLL.tiles.includes(G.nodes[id].tema);
// Preço do pedágio do tile `id` para o pagador `payer` ('player' ou id numérico de facção). 0 = passa de graça. rel(fid) = status de relação (relStatus) de quem paga com a facção dona.
function wtTollPrice(G, id, payer, rel) {
  if (!wtTollTile(G, id)) return 0;
  const o = wtOwnerOf(G, id), mine = v => v === 'player' || v === 0;
  if (payer === 'player' ? mine(o) : o === payer) return 0;
  if (o === 'bandit') return TOLL.bandit;
  if (typeof o === 'number' && o !== 0 && payer === 'player') {
    const st = (rel || (typeof relStatus === 'function' ? relStatus : () => 'neutral'))(o), m = TOLL.rel[st];
    return Math.round(TOLL.faction * (m === undefined ? 1 : m));
  }
  if (typeof o === 'number' && o !== 0) return TOLL.faction;
  return TOLL.neutral;   // sem dono (ou o tile do jogador, para um NPC que passa)
}
// Quem aparece no popup: 'bandit', 'neutral' ou o nome da facção dona (facName(fid) opcional).
function wtTollOwnerLabel(G, id, facName) {
  const o = wtOwnerOf(G, id);
  return o === 'bandit' ? 'bandit' : typeof o === 'number' && o !== 0 ? (facName || (() => 'uma facção'))(o) : 'neutral';
}
// Cobra: o jogador paga mesmo sem saldo (fica em dívida); se o dono é o jogador e quem paga é NPC, o ouro entra. Devolve o preço cobrado.
function wtTollCharge(G, id, payer, rel) {
  const price = wtTollPrice(G, id, payer, rel); if (!price) return 0;
  if (payer === 'player') Ledger.borrow({ gold: price });
  else if (wtOwnerOf(G, id) === 'player') Ledger.add('gold', price);
  return price;
}
// O batalhão `b`, parado no tile `cur`, vai para `next`: é uma travessia que cobra? Devolve {tile, to, price, dono} ou null. Voltar para onde veio (b.de) nunca paga.
function wtTollCheck(G, b, cur, next, rel, facName) {
  if (!wtTollTile(G, cur) || (typeof b.de === 'number' && b.de === next)) return null;
  const price = wtTollPrice(G, cur, 'player', rel); if (!price) return null;
  return { tile: cur, to: next, price, dono: wtTollOwnerLabel(G, cur, facName) };
}
// Passar por bandidos num tile de pedágio deles sem lutar (botão do encontro): paga TOLL.bandit (pode ficar em dívida) e o encontro se desfaz; o bando continua lá.
// Devolve o preço, ou 0 se não vale (sem encontro, tile que não é de pedágio ou não é dos bandidos).
function wtEncPay(G) {
  const w = wtX(), e = w.enc; if (!e || e.mover !== 'player' || !wtTollTile(G, e.tile) || wtOwnerOf(G, e.tile) !== 'bandit') return 0;
  Ledger.borrow({ gold: TOLL.bandit }); w.enc = null; return TOLL.bandit;
}
// Voltar do encontro com bandidos de pedágio: o batalhão recua para o tile de onde veio (grátis; o bando continua lá) e o encontro se desfaz. Devolve {from, to} ou null.
function wtEncBack(G) {
  const w = wtX(), e = w.enc, b = e && batGet(e.bat);
  if (!wtEncCanPay(G) || !b || typeof b.de !== 'number') return null;
  const from = e.tile; b.tile = wtKey(b.de); w.enc = null; return { from, to: b.de };
}
const wtEncCanBack = G => { const b = wtEncCanPay(G) && batGet(wtX().enc.bat); return !!b && typeof b.de === 'number' };
const wtEncCanPay = G => { const e = wtX().enc; return !!e && e.mover === 'player' && wtTollTile(G, e.tile) && wtOwnerOf(G, e.tile) === 'bandit' };

// ---- bandidos tomam o tile de pedágio ----
// Chamado a cada passo de um bando solto no tile em que está: se é um tile de pedágio que não é dos bandidos, ele fica e, depois de TOLL.take ações, o toma.
// Devolve true se o bando fica parado (tomando ou acabou de tomar).
function wtBanditTake(G, a, rg) {
  if (!wtTollTile(G, a.tile) || wtOwnerOf(G, a.tile) === 'bandit') { a.take = 0; return false }
  if (!a.takeN) a.takeN = rg.int(TOLL.take[0], TOLL.take[1]);
  a.take = (a.take || 0) + 1;
  if (a.take >= a.takeN) { tileOwnerSet(wtKey(a.tile), 'bandit'); a.take = 0; a.takeN = 0; wtLog(txtWtTollTaken(wtName(G, a.tile))) }
  return true;
}
// Tile de pedágio vizinho que não é dos bandidos e que o bando quer tomar (sorteio TOLL.pull), ou -1.
function wtBanditTarget(G, from, rg) {
  const opt = wgLandAdj(G, from).map(x => x.to).filter(t => wtTollTile(G, t) && wtOwnerOf(G, t) !== 'bandit');
  return opt.length && rg.chance(TOLL.pull) ? rg.pick(opt) : -1;
}

// ---- torre de vigia ----
// Usos da torre nesta rodada (somados: o limite é por rodada, não por torre).
const wtTowerUsed = () => { const t = wtX().tow; return t && t.r === STATE.round ? t.n : 0 };
const wtTowerLeft = () => Math.max(0, TOWER.perRound - wtTowerUsed());
// Marcas de dungeon desta rodada (ids de tile). As antigas expiram sozinhas: a janela de oportunidade é de uma rodada.
const wtDungeons = () => (wtX().dung || []).filter(d => d.r === STATE.round).map(d => d.tile);
// Um uso da torre no tile `id`: gasta o uso; 50% (TOWER.fail) de não achar nada; senão revela UMA dungeon num tile de terra (sem cidade/vila) do próprio tile ou dos vizinhos
// que ainda não esteja marcado. Devolve {ok:false, why:'limite'} ou {ok:true, tile: id|-1} (-1 = nada).
function wtTowerUse(G, id) {
  const w = wtX(); if (wtTowerLeft() <= 0) return { ok: false, why: 'limite' };
  w.tow = { r: STATE.round, n: wtTowerUsed() + 1 };
  w.dung = (w.dung || []).filter(d => d.r === STATE.round);
  const rg = wtRng(G); if (rg.chance(TOWER.fail)) return { ok: true, tile: -1 };
  const have = new Set(w.dung.map(d => d.tile));
  const cand = [id].concat(G.adj[id].map(x => x.to)).filter(t => { const n = G.nodes[t]; return !n.mar && n.tema !== 'cidade' && n.tema !== 'vila' && !have.has(t) });
  if (!cand.length) return { ok: true, tile: -1 };
  const t = rg.pick(cand); w.dung.push({ tile: t, r: STATE.round }); return { ok: true, tile: t };
}
