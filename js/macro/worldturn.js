'use strict';
// ---------- Turno do Comandante no mapa mundi (etapa 7 de docs/features/6_plano-mapa-mundi.md). Camada macro: sem Three.js nem DOM ----------
// Dados puros em STATE.wt (JSON, salvo com o jogo): pool de ações, batalhão ativo (o comandante único troca de graça), atores do mundo (bandidos e caravanas),
// encontro pendente e o diário do turno (vira o resumo do livro). O grafo (G de wgBuild) vem por parâmetro; o batalhão do jogador está em STATE.bat
// (battalion.js) e o tile é a chave 'w'+id do ponto. Fluxo: turno do Líder (wtCreate/wtDonate) -> wtCommanderBegin -> o jogador age (wtMove) e, a cada ação gasta,
// os NPCs dão UM passo (wtStepNpcs) -> encontro no mesmo tile = batalha (wtEnc) -> wtBattleEnd/wtAutoBattle -> wtEnd (sobra de ações vira passos, cerco cai, resumo).
// Números em WT (worldturn-modifiers.js); textos em worldturn-texts.js. Determinístico: o sorteio usa G.seed e o contador STATE.wt.rs.
const wtFresh = () => ({ rs: 0, seq: 0, pool: 0, left: 0, act: 0, turn: 'leader', actors: [], log: [], enc: null, idle: 0, init: false, inTile: null, owed: 0, mv: 0, local: null, spawn: false, entry: -1 });
const wtX = () => STATE.wt || (STATE.wt = wtFresh());
const wtKey = id => 'w' + id, wtNode = key => +String(key).slice(1);
const wtLvl = () => (STATE.rd && STATE.rd.lvl) || 1;
const wtRng = G => new RNG((G.seed * 7919 + (++wtX().rs) * 104729) >>> 0);
const wtLog = t => wtX().log.push(t);
// Passos dos NPCs do último wtNpcStep ({id, from, to, e}); a interface lê para animar os atores andando. Não é salvo.
let wtMoveLog = [];
const wtName = (G, id) => tileName(G, G.nodes[id]);
Hooks.on('resetState', () => { STATE.wt = wtFresh() });
// Lê o que veio do save (ausente ou torto = estado novo).
function wtApply(s) {
  const w = wtFresh();
  if (s && typeof s === 'object') {
    for (const k of ['rs', 'seq', 'pool', 'left', 'act', 'idle', 'owed', 'mv']) w[k] = +s[k] || 0;
    w.turn = s.turn === 'commander' ? 'commander' : 'leader'; w.init = !!s.init;
    w.actors = Array.isArray(s.actors) ? s.actors.filter(a => a && typeof a.tile === 'number' && a.str > 0) : [];
    w.log = Array.isArray(s.log) ? s.log.filter(t => typeof t === 'string') : [];
    w.enc = s.enc && typeof s.enc === 'object' ? s.enc : null; w.inTile = typeof s.inTile === 'number' ? s.inTile : null;
    w.local = typeof s.local === 'number' ? s.local : null; w.spawn = !!s.spawn; w.entry = typeof s.entry === 'number' ? s.entry : -1;
  }
  STATE.wt = w;
}

// ---- consultas ----
// Cidade ou vila do jogador (a capital do grafo ou a de dono 'player'/0 na ficha do tile).
const wtMine = (G, id) => { const n = G.nodes[id], o = tileOwner(wtKey(id), null); return (n.tema === 'cidade' || n.tema === 'vila') && (!!n.home || o === 'player' || o === 0) };
const wtActorsAt = id => wtX().actors.filter(a => a.tile === id);
const wtHostileAt = id => wtActorsAt(id).find(a => a.kind === 'bandit') || null;
const wtActive = () => batGet(wtX().act);
// Menor caminho em ações (Dijkstra). noSea (padrão) ignora arestas de mar. Devolve {acoes, mar, ids:[aresta...], from:[ponto...], nodes:[ponto...]} ou null.
function wtPath(G, from, to, noSea) {
  const N = G.nodes.length, d = new Array(N).fill(Infinity), pv = new Array(N).fill(-1), pe = new Array(N).fill(-1), done = new Array(N).fill(false);
  d[from] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < N; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = true;
    for (const x of G.adj[u]) {
      const e = G.edges[x.e]; if (noSea !== false && e.kind === 'mar') continue;
      const w = d[u] + wtEdgeCost(e) + (e.kind === 'mar' ? 0.01 : 0);
      if (w < d[x.to]) { d[x.to] = w; pv[x.to] = u; pe[x.to] = e.id }
    }
  }
  if (d[to] === Infinity) return null;
  const ids = [], fr = [], nodes = [to]; let a = 0, mar = false;
  for (let v = to; pv[v] >= 0; v = pv[v]) {
    ids.unshift(pe[v]); fr.unshift(pv[v]); nodes.unshift(pv[v]); a += wtEdgeCost(G.edges[pe[v]]); if (G.edges[pe[v]].kind === 'mar') mar = true;
  }
  return { acoes: a, mar, ids, from: fr, nodes };
}

// ---- começo do mundo ----
// Cria os atores (bandidos longe da capital, caravanas entre cidades pela estrada). Só na primeira vez.
function wtInit(G) {
  const w = wtX(); if (w.init) return;
  const rg = wtRng(G), land = G.nodes.filter(n => !n.mar && !n.ponteNode && n.tema !== 'cidade' && n.tema !== 'vila');
  const home = G.inicio ? G.inicio.id : (G.nodes.find(n => !n.mar) || G.nodes[0]).id, hop = wgHops(G, [home]);
  const far = rg.shuffle(land.filter(n => hop[n.id] >= 3 && hop[n.id] < Infinity));
  for (const n of far.slice(0, WT.bandits)) w.actors.push({ id: ++w.seq, kind: 'bandit', tile: n.id, str: rg.int(WT.str[0], WT.str[1]), stay: 0 });
  const C = G.nodes.filter(n => n.tema === 'cidade');   // cada caravana liga uma cidade à mais barata das outras que alcança por terra
  for (let i = 0; i < C.length && w.actors.filter(a => a.kind === 'caravan').length < WT.caravans; i++) {
    let best = null;
    for (const o of C) { if (o === C[i]) continue; const p = wtPath(G, C[i].id, o.id); if (p && (!best || p.acoes < best.acoes)) best = p }
    if (best) w.actors.push({ id: ++w.seq, kind: 'caravan', tile: C[i].id, str: WT.caravanStr, route: best.nodes, ri: 0, dir: 1, stay: 0, cargo: rg.pick(WT.cargo) });
  }
  w.init = true;
}
// Garante um batalhão do jogador (o primeiro é grátis, com o kit do comandante); sem nenhum, nasce outro na capital. Devolve-o.
function wtEnsureBat(G) {
  const w = wtX(); let b = batGet(w.act) || batList('player')[0];
  if (!b) { const home = G.inicio ? G.inicio.id : 0; b = batCreate('player', wtKey(home), { soldier: WT.freeSoldiers }, WT.kit, wtLvl()); wtLog(txtWtCreated(wtName(G, home))) }
  w.act = b ? b.id : 0; return b;
}
// Começa o turno do Comandante: pool pelo nível, batalhão ativo garantido.
function wtCommanderBegin(G) {
  const w = wtX(); wtInit(G);
  w.turn = 'commander'; w.pool = w.left = wtPoolNow(wtLvl());   // rodada 0: WT.prepPool
  w.enc = null; w.idle = 0; w.mv = 0;   // mv: o relógio do mapa mundi recomeça a contar a parte do dia
  wtEnsureBat(G);
}
// Troca o batalhão ativo (grátis: o comandante é um só e "teleporta").
function wtSwitch(id) { const b = batGet(id); if (!b || b.dono !== 'player' || wtX().enc || wtX().inTile !== null) return false; wtX().act = id; return true }

// ---- turno do Líder: batalhões ----
// Cria um batalhão na cidade `id` (só sua). Grátis se o jogador não tem nenhum; senão custa newSoldiers x soldierPrice em ouro (nunca dívida).
function wtCreate(G, id) {
  const w = wtX(); if (w.turn !== 'leader') return { ok: false, why: 'turno' };
  if (!wtMine(G, id)) return { ok: false, why: 'cidade' };
  const free = !batList('player').length, cost = free ? 0 : WT.newSoldiers * WT.soldierPrice;
  if (batList('player').length >= batCountMax(wtLvl())) return { ok: false, why: 'teto' };
  if (cost && !Ledger.spend({ gold: cost })) return { ok: false, why: 'ouro', cost };
  const b = batCreate('player', wtKey(id), { soldier: free ? WT.freeSoldiers : WT.newSoldiers }, WT.kit, wtLvl());
  if (!w.act) w.act = b.id;
  wtLog(txtWtCreated(wtName(G, id))); return { ok: true, b, cost };
}
// Doa n soldados do tipo k entre dois batalhões do jogador parados na mesma cidade sua. Devolve quantos passaram.
function wtDonate(G, fromId, toId, k, n) {
  const a = batGet(fromId), b = batGet(toId);
  if (!a || !b || a === b || a.dono !== 'player' || b.dono !== 'player' || a.tile !== b.tile || !wtMine(G, wtNode(a.tile))) return 0;
  return batDonate(a, b, k, n);
}

// ---- movimento e NPCs ----
// Prepara o encontro pendente (e para o turno até ser resolvido). mover = 'player' (você entrou) ou 'npc' (ele veio até você).
function wtSetEnc(G, actor, bat, mover, cerco) {
  const id = wtNode(bat.tile), mine = wtMine(G, id);
  const layout = cerco || (mover === 'npc' && mine) ? 'defesa' : mover === 'player' && actor && actor.stay > 0 ? 'invasao' : 'campo';
  const n = actor ? actor.str : WT.siegeStr;
  wtX().enc = { actor: actor ? actor.id : 0, bat: bat.id, tile: id, mover, layout, n, pend: mover === 'player' };   // pend: a ação do jogador acabou; os NPCs andam depois da luta
  wtLog(layout === 'defesa' ? txtWtAmbush(wtName(G, id), n) : txtWtEncounter(wtName(G, id), n));
}
// Um passo de cada ator (bandido caça o batalhão do jogador que estiver à vista; senão vaga; caravana segue a rota e volta). Devolve true se houve encontro.
function wtNpcStep(G) {
  const w = wtX(), rg = wtRng(G), mine = batList('player');
  for (const a of w.actors.slice()) {
    if (!w.actors.includes(a)) continue;
    if (a.kind === 'caravan') {
      const r = a.route; if (a.ri + a.dir < 0 || a.ri + a.dir >= r.length) a.dir = -a.dir;
      const f0 = a.tile; a.ri += a.dir; a.tile = r[a.ri]; wtMoveLog.push({ id: a.id, from: f0, to: a.tile, e: wgEdgeOf(G, f0, a.tile).id });
      if (wtHostileAt(a.tile)) { w.actors.splice(w.actors.indexOf(a), 1); wtLog(txtWtCaravanLost(wtName(G, a.tile))) }
      continue;
    }
    let next = -1;
    const seen = wtSee(G, a.tile, mine);   // batalhão do jogador à vista: primeiro salto do caminho até ele
    if (seen !== null) next = seen;
    else if (rg.chance(WT.roam)) {
      const opt = wgLandAdj(G, a.tile).map(x => x.to).filter(t => { const m = G.nodes[t]; return !m.mar && m.tema !== 'cidade' && m.tema !== 'vila' });
      if (opt.length) next = rg.pick(opt);
    }
    if (next < 0) continue;
    wtMoveLog.push({ id: a.id, from: a.tile, to: next, e: wgEdgeOf(G, a.tile, next).id }); a.tile = next;
    const bat = mine.find(b => wtNode(b.tile) === next);
    if (bat) { wtSetEnc(G, a, bat, 'npc'); return true }
    const car = wtActorsAt(next).find(c => c.kind === 'caravan');
    if (car) { w.actors.splice(w.actors.indexOf(car), 1); wtLog(txtWtCaravanLost(wtName(G, next))) }
  }
  return false;
}
// Busca em largura por terra até WT.sight saltos: devolve o primeiro salto rumo ao batalhão mais próximo, ou null.
function wtSee(G, from, bats) {
  if (!bats.length) return null;
  const goal = new Set(bats.map(b => wtNode(b.tile))), prev = new Map([[from, -1]]); let fr = [from];
  for (let d = 0; d < WT.sight; d++) {
    const nx = [];
    for (const u of fr) for (const x of wgLandAdj(G, u)) {
      if (prev.has(x.to)) continue; const m = G.nodes[x.to];
      if (m.mar || ((m.tema === 'cidade' || m.tema === 'vila') && !goal.has(x.to))) continue;
      prev.set(x.to, u); if (goal.has(x.to)) { let v = x.to; while (prev.get(v) !== from) v = prev.get(v); return v }
      nx.push(x.to);
    }
    fr = nx;
  }
  return null;
}
// n passos de NPCs; para no primeiro encontro. Devolve true se houve.
function wtStepNpcs(G, n) { for (let i = 0; i < n; i++) if (wtNpcStep(G)) return true; return false }
// Quantos tiles do caminho `ids` cabem numa ação a partir do trecho q (o movimento da ação é WT.movePerAction; o 1º trecho sempre cabe, para nunca travar).
function wtReach(G, ids, q) {
  let mv = WT.movePerAction, n = 0;
  for (; q + n < ids.length; n++) { const c = wtEdgeCost(G.edges[ids[q + n]]); if (n && c > mv) break; mv -= c; if (mv <= 0) { n++; break } }
  return n;
}
// Quantas ações o caminho p (de wtPath) pede ao todo.
function wtPlan(G, p) { let q = 0, a = 0; while (q < p.ids.length) { q += wtReach(G, p.ids, q); a++ } return a }
// Fim de uma ação do jogador: o cerco conta 1 e cada NPC dá UM passo. Devolve os passos [{id, from, to, e}] para animar.
function wtActionEnd(G) { for (const k of siegeList()) siegeTick(k, 1); wtMoveLog = []; wtNpcStep(G); return wtMoveLog }
// Encerrar UMA ação sem agir: o batalhão fica parado, a ação se gasta e cada NPC dá o seu passo. Devolve {ok, steps:[{npc}], enc, left} ou {ok:false, why}.
function wtSkip(G) {
  const w = wtX(); if (w.turn !== 'commander' || w.enc || w.inTile !== null) return { ok: false, why: 'turno' };
  if (w.left <= 0) return { ok: false, why: 'sem-acao' };
  w.left--; return { ok: true, steps: [{ npc: wtActionEnd(G) }], enc: w.enc, left: w.left };
}
// Entrar no tile (o mapa local do tile do batalhão ativo): gasta WT.enterCost ações e encerra a ação, mas os NPCs só andam quando o jogador SAI do tile
// (wtLeave, grátis). Tile sem o jogador não simula NPCs. Devolve {ok, tile, de} (de = de onde o batalhão chegou, para nascer na estrada certa) ou {ok:false, why}.
function wtEnter(G) {
  const w = wtX(), b = wtActive();
  if (w.turn !== 'commander' || w.enc || w.inTile !== null) return { ok: false, why: 'turno' };
  if (!b || b.dono !== 'player') return { ok: false, why: 'sem-batalhao' };
  if (w.left < WT.enterCost) return { ok: false, why: 'sem-acao' };
  w.left -= WT.enterCost; w.inTile = wtNode(b.tile); w.owed = WT.enterCost; w.mv = 0;
  wtLog(txtWtExplored(wtName(G, w.inTile)));   // mv: o Campo começa no início da parte do dia (wtEnterTime)
  return { ok: true, tile: w.inTile, de: typeof b.de === 'number' ? b.de : null };
}
// Sair do tile explorado: agora os NPCs andam o que ficaram devendo. Devolve {steps:[{npc}]} ou null se não estava no tile.
function wtLeave(G) {
  const w = wtX(); if (w.inTile === null) return null;
  const steps = []; w.inTile = null;
  for (; w.owed > 0; w.owed--) { steps.push({ npc: wtActionEnd(G) }); if (w.enc) { w.owed--; break } }
  w.owed = 0; return { steps };
}
// UMA AÇÃO do batalhão ativo: anda até `to` (por terra) até onde o movimento da ação alcança (custo do terreno de cada tile; WT.movePerAction), parando antes se
// encontrar inimigo. A ação inteira do jogador acontece primeiro; só depois os NPCs dão UM passo cada (e o cerco conta 1). Quem não chegou fica parado onde parou:
// o próximo trecho é outra ação, com novo clique. Devolve {ok, nodes, steps:[{from, node, edge, npc}], gasto, enc, left, parcial}; os passos dos NPCs vêm no último
// item de steps (npc). Ou {ok:false, why}.
function wtMove(G, to) {
  const w = wtX(), b = wtActive();
  if (w.turn !== 'commander' || w.enc || w.inTile !== null) return { ok: false, why: 'turno' };
  if (!b || b.dono !== 'player') return { ok: false, why: 'sem-batalhao' };
  const p = wtPath(G, wtNode(b.tile), to); if (!p || !p.ids.length) return { ok: false, why: 'sem-caminho' };
  if (w.left <= 0) return { ok: false, why: 'sem-acao', acoes: wtPlan(G, p) };
  const n = wtReach(G, p.ids, 0), nodes = [], steps = []; let gasto = 0;
  w.left--;
  for (let q = 0; q < n; q++) {
    const node = p.nodes[q + 1], key = wtKey(node), st = { from: p.nodes[q], node, edge: p.ids[q], npc: [] };
    b.tile = key; b.de = p.nodes[q]; gasto += wtEdgeCost(G.edges[p.ids[q]]); nodes.push(node); steps.push(st);   // de: de onde chegou (entra pela estrada certa)
    if (siegeArrive(key)) { wtSetEnc(G, null, b, 'player', true); break }
    const hit = wtHostileAt(node); if (hit) { wtSetEnc(G, hit, b, 'player'); break }
  }
  if (!w.enc) {
    steps[steps.length - 1].npc = wtActionEnd(G);   // depois da ação completa do jogador: um passo de cada NPC
    wtLog(txtWtMoved(wtName(G, nodes[nodes.length - 1])));
  }
  return { ok: true, nodes, steps, gasto, enc: w.enc, left: w.left, parcial: nodes.length < p.ids.length && !w.enc };
}

// ---- batalha ----
// Parâmetros de URL do cenário de batalha para o encontro (modo por WT.layoutMode, inimigos = força do encontro). A luta de verdade no tile liga na etapa 8.
const wtBattleParams = enc => '?cenario=batalha&modo=' + WT.layoutMode[enc.layout] + '&inim=' + enc.n;
// Derrota do comandante: o batalhão se desfaz, o jogador perde ouro (nunca dívida) e o que o batalhão levava (munição). Passa o comando a outro batalhão.
function wtDeath(G, id) {
  const w = wtX(), b = batGet(id); if (!b) return null;
  const sold = batTotal(b), gold = Math.max(0, Math.min(Ledger.get('gold'), WT.deathGold));
  if (gold) Ledger.add('gold', -gold);
  batDestroy(id);
  const rest = batList('player'); w.act = rest.length ? rest[0].id : 0;
  wtLog(txtWtDead(wtName(G, wtNode(b.tile)), gold));
  if (!rest.length) w.left = 0;   // sem batalhão: a rodada acaba e vai para o turno do Líder
  return { soldados: sold, ouro: gold, restam: rest.length };
}
// A batalha encerrou a ação do jogador (qualquer que seja o movimento que sobrava): agora os NPCs dão o passo deles. Devolve [{npc}].
function wtBattleAfter(G, e) { return e.pend ? [{ npc: wtActionEnd(G) }] : [] }
// Fim da luta do encontro. venceu: o inimigo some; baixas = soldados do batalhão que morreram. Derrota: wtDeath. Devolve {fim}: true = sem batalhão (chame wtEnd).
function wtBattleEnd(G, venceu, baixas) {
  const w = wtX(), e = w.enc; if (!e) return { fim: false };
  const b = batGet(e.bat); w.enc = null;
  if (venceu) {
    const i = w.actors.findIndex(a => a.id === e.actor); if (i >= 0) w.actors.splice(i, 1);
    if (b) batLoseAny(b, baixas || 0);
    wtLog(txtWtWon(wtName(G, e.tile), baixas || 0)); return { fim: false, steps: wtBattleAfter(G, e) };
  }
  const r = b ? wtDeath(G, b.id) : null; return { fim: !!r && r.restam === 0, steps: r && r.restam ? wtBattleAfter(G, e) : [] };
}
// Resolve o encontro por número (atalho de teste para o jogador). Maior força (com um pouco de acaso) vence; o vencedor perde WT.autoLoss da força do outro.
// Devolve {venceu, baixas, fim}.
function wtAutoBattle(G) {
  const e = wtX().enc, b = e && batGet(e.bat); if (!b) return null;
  const rg = wtRng(G), a = batTotal(b), jog = a * (1 + (rg.next() - 0.5) * 2 * WT.autoNoise), venceu = jog >= e.n;
  const baixas = venceu ? Math.min(a - 1, Math.round(e.n * WT.autoLoss)) : a;
  return Object.assign({ venceu, baixas }, wtBattleEnd(G, venceu, baixas));
}

// ---- fim do turno ----
// Encerra o turno do Comandante: as ações que sobraram viram passos dos NPCs (WT.idleSteps), o cerco aberto cai e o resumo vai para o livro. Se um NPC
// alcança um batalhão no meio, para com o encontro pendente (resolva e chame de novo; os passos que faltam ficam em idle). Devolve {ok, why, enc, steps:[{npc}]}.
// keep = o diário fica em STATE.wt.log para o fim da rodada (endRound, rounds.js) pôr no relatório da rodada que fecha (wtTake), em vez de ir para rdNow.
function wtEnd(G, keep) {
  const w = wtX(); if (w.enc) return { ok: false, why: 'encontro', enc: w.enc };
  if (w.turn !== 'commander') return { ok: false, why: 'turno' };
  const lv = wtLeave(G), n = w.idle > 0 ? w.idle : WT.idleSteps ? w.left : 0, steps = lv ? lv.steps : []; w.left = 0; w.idle = 0;
  if (w.enc) return { ok: false, why: 'encontro', enc: w.enc, steps };
  for (let i = 0; i < n; i++) {
    wtMoveLog = []; const enc = wtNpcStep(G); steps.push({ npc: wtMoveLog });
    if (enc) { w.idle = n - i - 1; return { ok: false, why: 'encontro', enc: w.enc, steps } }
  }
  siegeEndTurn(); w.turn = 'leader'; if (!keep) wtFlush();
  return { ok: true, steps };
}
// Passa o diário do turno ao relatório da rodada (rdNow, sem toast) e esvazia. Devolve as linhas.
function wtFlush() { const w = wtX(), L = w.log; w.log = []; for (const t of L) rdNow(t); return L }
// Tira o diário do turno (para o relatório da rodada que fecha) e esvazia. Devolve as linhas.
function wtTake() { const w = wtX(), L = w.log; w.log = []; return L }

// ---- relógio único (etapa 8.1): partes do dia no mapa mundi, horas no Campo ----
// T = tempo absoluto em dias (parte inteira = dia, fração = hora / 24). Parte do dia: 0 Madrugada, 1 Manhã, 2 Tarde, 3 Noite (cada uma 6 h).
const wtBand = T => Math.floor((((T % 1) + 1) % 1) * 4) % 4;
const wtBandStart = T => Math.floor(T * 4 + 1e-9) / 4;
// Gasta mv pontos de movimento no mapa mundi: a cada WT.clock.mvPerPart passa uma parte do dia (o tempo vai para o início da parte seguinte).
// Devolve o novo T (igual ao de entrada se nenhuma parte passou). Guarda o resto em STATE.wt.mv.
function wtClockSpend(T, mv) {
  const w = wtX(), k = WT.clock.mvPerPart; w.mv = (w.mv || 0) + Math.max(0, mv || 0);
  const n = Math.floor(w.mv / k + 1e-9); if (!n) return T;
  w.mv -= n * k; return wtBandStart(T) + n / 4;
}
// Entrar no tile: o Campo começa no início da parte do dia do mapa mundi (06h, 12h, 18h, 00h). wtEnter zera o movimento acumulado (STATE.wt.mv).
const wtEnterTime = T => wtBandStart(T);
// Sair do tile não mexe no relógio: a hora do Campo (que andou lá dentro) vira a parte do dia do mapa mundi (wtBand).

// ---- grafo do mundo salvo (etapa 8.1) ----
// O grafo vai no save (STATE.wg = wgPack) para o mundo não mudar se as constantes do gerador mudarem. Sem save (ou de outra semente/formato), gera e guarda.
let WT_G = null;
function wtGraphLoad(F) {
  const d = STATE.wg, same = d && d.v && d.seed === F.seed && d.fmt === F.fmt && d.dom === F.dominant;
  WT_G = same ? wgUnpack(d, F) : wgBuild(F); if (!same) STATE.wg = wgPack(WT_G);
  return WT_G;
}
const wtGraph = () => WT_G;
