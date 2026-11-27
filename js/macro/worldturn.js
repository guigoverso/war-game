'use strict';
// ---------- Turno do Comandante no mapa mundi (etapa 7 de docs/features/6_plano-mapa-mundi.md). Camada macro: sem Three.js nem DOM ----------
// Dados puros em STATE.wt (JSON, salvo com o jogo): pool de ações, batalhão ativo (o comandante único troca de graça), atores do mundo (bandidos e caravanas),
// encontro pendente e o diário do turno (vira o resumo do livro). O grafo (G de wgBuild) vem por parâmetro; o batalhão do jogador está em STATE.bat
// (battalion.js) e o tile é a chave 'w'+id do ponto. Fluxo: turno do Líder (wtCreate/wtDonate) -> wtCommanderBegin -> o jogador age (wtMove) e, a cada ação gasta,
// os NPCs dão UM passo (wtStepNpcs) -> encontro no mesmo tile = batalha (wtEnc) -> wtBattleEnd/wtAutoBattle -> wtEnd (sobra de ações vira passos, cerco cai, resumo).
// Números em WT (worldturn-modifiers.js); textos em worldturn-texts.js. Determinístico: o sorteio usa G.seed e o contador STATE.wt.rs.
const wtFresh = () => ({ rs: 0, seq: 0, pool: 0, left: 0, act: 0, turn: 'leader', actors: [], log: [], enc: null, idle: 0, init: false, inTile: null, owed: 0, mv: 0, born: 0, local: null, spawn: false, entry: -1, tow: null, dung: [] });
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
    for (const k of ['rs', 'seq', 'pool', 'left', 'act', 'idle', 'owed', 'mv', 'born']) w[k] = +s[k] || 0;
    w.turn = s.turn === 'commander' ? 'commander' : 'leader'; w.init = !!s.init;
    w.actors = Array.isArray(s.actors) ? s.actors.filter(a => a && typeof a.tile === 'number' && a.str > 0) : [];
    w.log = Array.isArray(s.log) ? s.log.filter(t => typeof t === 'string') : [];
    w.enc = s.enc && typeof s.enc === 'object' ? s.enc : null; w.inTile = typeof s.inTile === 'number' ? s.inTile : null;
    w.local = typeof s.local === 'number' ? s.local : null; w.spawn = !!s.spawn; w.entry = typeof s.entry === 'number' ? s.entry : -1;
    w.tow = s.tow && typeof s.tow === 'object' ? { r: +s.tow.r || 0, n: +s.tow.n || 0 } : null;   // torre de vigia: usos da rodada (macro/toll.js)
    w.dung = Array.isArray(s.dung) ? s.dung.filter(d => d && typeof d.tile === 'number').map(d => ({ tile: d.tile, r: +d.r || 0 })) : [];   // dungeons achadas (só valem na rodada em que r = STATE.round)
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
// Garante o batalhão ativo. Só o PRIMEIRO do jogo nasce sozinho (grátis, com o kit); quem perdeu todos cria o de resgate no turno do Líder (wtCreate).
function wtEnsureBat(G) {
  const w = wtX(); let b = batGet(w.act) || batList('player')[0] || null;
  if (!b && !w.born) { const r = wtCreate(G, G.inicio ? G.inicio.id : 0, true); b = r.b || null }
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
// Com um encontro pendente a troca vale (o jogador move os outros batalhões antes de lutar), menos para o que está no tile do encontro.
function wtSwitch(id) {
  const b = batGet(id), w = wtX(); if (!b || b.dono !== 'player' || w.inTile !== null || (w.enc && wtNode(b.tile) === w.enc.tile)) return false;
  w.act = id; return true;
}

// ---- turno do Líder: batalhões ----
// Confere se dá para criar um batalhão em `id` sem criar nada (a interface usa para ligar o botão). Devolve {why: '' | turno|cidade|teto|ponto|ouro, none, first, cost, pt}.
function wtCreateCheck(G, id, force) {
  const w = wtX(), none = !batList('player').length, first = none && !w.born, cost = none ? 0 : WT.newGold, pt = !force && !first, o = { none, first, cost, pt, why: '' };
  if (!force && w.turn !== 'leader') o.why = 'turno';
  else if (!wtMine(G, id)) o.why = 'cidade';
  else if (!none && batList('player').length >= batCountMax(wtLvl())) o.why = 'teto';
  else if (pt && !canAct('battalion')) o.why = 'ponto';   // o primeiro do jogo não gasta nem o ponto
  else if (cost && !Ledger.canAfford({ gold: cost })) o.why = 'ouro';
  return o;
}
// Cria um batalhão na cidade ou vila sua `id` (no turno do Líder; `force` = começo do jogo, sem turno nem ponto). O PRIMEIRO do jogo é grátis (WT.firstSoldiers
// e o kit); sem nenhum batalhão, o de resgate custa só o ponto do Líder (sem soldados, com o kit); os demais custam o ponto e WT.newGold (nasce com WT.newSoldiers,
// sem kit: o inventário é um só). Respeita o teto do nível; nunca vira dívida. Devolve {ok, b, cost} ou {ok:false, why: turno|cidade|teto|ponto|ouro}.
function wtCreate(G, id, force) {
  const c = wtCreateCheck(G, id, force); if (c.why) return { ok: false, why: c.why, cost: c.cost };
  const w = wtX(), none = c.none, first = c.first, cost = c.cost;
  if (c.pt) spendAct('battalion'); if (cost) Ledger.spend({ gold: cost });
  const sold = first ? WT.firstSoldiers : none ? WT.rescueSoldiers : WT.newSoldiers;
  const b = batCreate('player', wtKey(id), sold ? { soldier: sold } : {}, none ? WT.kit : {}, wtLvl()); w.born++;
  if (!w.act || none) w.act = b.id;
  wtLog(txtWtCreated(wtName(G, id))); return { ok: true, b, cost };
}
// Doa soldados entre dois batalhões do jogador parados na mesma cidade ou vila sua, no turno do Líder; pode zerar o doador (dividir um batalhão cheio).
// Doa até n soldados (os tipos com mais gente primeiro); o destino respeita o teto. Devolve quantos passaram.
function wtDonate(G, fromId, toId, n) {
  const a = batGet(fromId), b = batGet(toId);
  if (wtX().turn !== 'leader' || !a || !b || a === b || a.dono !== 'player' || b.dono !== 'player' || a.tile !== b.tile || !wtMine(G, wtNode(a.tile))) return 0;
  let got = 0, left = Math.min(n, BAT.max - batTotal(b));
  while (left > 0 && batTotal(a) > 0) {
    const k = BAT.kinds.reduce((m, x) => (a.sold[x] || 0) > (a.sold[m] || 0) ? x : m, BAT.kinds[0]), d = batDonate(a, b, k, left);
    if (!d) break; got += d; left -= d;
  }
  return got;
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
    if (!w.actors.includes(a) || (w.enc && a.id === w.enc.actor)) continue;   // quem está no encontro pendente espera a luta
    if (a.kind === 'caravan') {
      const r = a.route; if (a.ri + a.dir < 0 || a.ri + a.dir >= r.length) a.dir = -a.dir;
      const f0 = a.tile; a.ri += a.dir; a.tile = r[a.ri]; wtMoveLog.push({ id: a.id, from: f0, to: a.tile, e: wgEdgeOf(G, f0, a.tile).id });
      if (wtHostileAt(a.tile)) { w.actors.splice(w.actors.indexOf(a), 1); wtLog(txtWtCaravanLost(wtName(G, a.tile))) }
      continue;
    }
    let next = -1;
    const seen = wtSee(G, a.tile, mine);   // batalhão do jogador à vista: primeiro salto do caminho até ele
    if (wtTollTile(G, a.tile) && wtOwnerOf(G, a.tile) === 'bandit') continue;   // bando que segura a passagem fica estacionado lá (não persegue)
    if (seen === null && wtBanditTake(G, a, rg)) continue;   // num tile de pedágio que não é deles: ficam 2 a 3 ações e o tomam (macro/toll.js)
    if (seen !== null) next = seen;
    else {
      const tg = wtBanditTarget(G, a.tile, rg);   // tile de pedágio vizinho que ainda não é deles
      if (tg >= 0) next = tg;
      else if (rg.chance(WT.roam)) {
        const opt = wgLandAdj(G, a.tile).map(x => x.to).filter(t => { const m = G.nodes[t]; return !m.mar && m.tema !== 'cidade' && m.tema !== 'vila' });
        if (opt.length) next = rg.pick(opt);
      }
    }
    if (next < 0) continue;
    wtMoveLog.push({ id: a.id, from: a.tile, to: next, e: wgEdgeOf(G, a.tile, next).id }); a.tile = next;
    const bat = mine.find(b => wtNode(b.tile) === next);
    if (bat && !w.enc) { wtSetEnc(G, a, bat, 'npc'); return true }   // com um encontro pendente não nasce outro
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
// encontrar inimigo ou um pedágio (tile de ponte/fortaleza que cobra ao atravessar, macro/toll.js: sem opts.pay/opts.auto o batalhão para ali e o resultado traz `toll`). A ação inteira do jogador acontece primeiro; só depois os NPCs dão UM passo cada (e o cerco conta 1). Quem não chegou fica parado onde parou:
// o próximo trecho é outra ação, com novo clique. Devolve {ok, nodes, steps:[{from, node, edge, npc}], gasto, enc, left, parcial}; os passos dos NPCs vêm no último
// item de steps (npc). Ou {ok:false, why}. opts = {pay: {tile, to} (paga esse pedágio), auto (paga todos), rel, facName (para o preço e o nome do dono)}; toll = pedágio pendente.
function wtMove(G, to, opts) {
  opts = opts || {};
  const w = wtX(), b = wtActive();
  if (w.turn !== 'commander' || w.inTile !== null || (w.enc && b && wtNode(b.tile) === w.enc.tile)) return { ok: false, why: 'turno' };   // no encontro, só se move quem não está nele
  if (!b || b.dono !== 'player') return { ok: false, why: 'sem-batalhao' };
  const p = wtPath(G, wtNode(b.tile), to); if (!p || !p.ids.length) return { ok: false, why: 'sem-caminho' };
  const free = !!opts.pay;   // pagar o pedágio não é uma ação: o trecho que continua depois do pagamento não gasta ação nem faz os NPCs andarem
  if (w.left <= 0 && !free) return { ok: false, why: 'sem-acao', acoes: wtPlan(G, p) };
  const n = wtReach(G, p.ids, 0), nodes = [], steps = []; let gasto = 0, toll = null;
  if (!free) w.left--;
  for (let q = 0; q < n; q++) {
    const node = p.nodes[q + 1], key = wtKey(node), st = { from: p.nodes[q], node, edge: p.ids[q], npc: [] };
    if (w.enc && node !== w.enc.tile && wtHostileAt(node)) break;   // com um encontro pendente, outro batalhão só entra no tile do próprio encontro (junta-se à luta); outro tile hostil espera
    const tl = wtTollCheck(G, b, p.nodes[q], node, opts.rel, opts.facName);   // pedágio: só ao atravessar para o lado oposto ao de onde veio
    if (tl) { if (opts.auto || (opts.pay && opts.pay.tile === tl.tile && opts.pay.to === tl.to)) st.pay = wtTollCharge(G, tl.tile, 'player', opts.rel); else { toll = tl; break } }   // st.pay: a interface mostra -◉ na cabeça do boneco ao partir
    b.tile = key; b.de = p.nodes[q]; gasto += wtEdgeCost(G.edges[p.ids[q]]); nodes.push(node); steps.push(st);   // de: de onde chegou (entra pela estrada certa)
    if (!w.enc && siegeArrive(key)) { wtSetEnc(G, null, b, 'player', true); break }
    const hit = wtHostileAt(node); if (hit && !w.enc) { wtSetEnc(G, hit, b, 'player'); break }
  }
  if (!nodes.length) { if (!free) w.left++; return toll ? { ok: false, why: 'pedagio', toll } : { ok: false, why: 'bloqueado' } }
  if (!w.enc && !free) {
    steps[steps.length - 1].npc = wtActionEnd(G);   // depois da ação completa do jogador: um passo de cada NPC
    wtLog(txtWtMoved(wtName(G, nodes[nodes.length - 1])));
  }
  return { ok: true, nodes, steps, gasto, enc: w.enc, left: w.left, parcial: nodes.length < p.ids.length && !w.enc, toll };
}

// ---- batalha ----
// Parâmetros de URL do cenário de batalha do teste (modo por WT.layoutMode, inimigos = força do encontro). O jogo do mundo novo usa wtBattleBegin.
const wtBattleParams = enc => '?cenario=batalha&modo=' + WT.layoutMode[enc.layout] + '&inim=' + enc.n;
// Batalhões do jogador que lutam o encontro: os que estão no tile dele (o do encontro e os que chegaram; somam, 8.3).
const wtForces = e => e ? batAt(wtKey(e.tile)).filter(b => b.dono === 'player') : [];
// Baixas divididas igualmente entre os batalhões (14 e 14 de 28); sobra de conta redonda vai aos primeiros; quem tem menos que a cota perde o que tem e o resto passa adiante.
function wtLoseSplit(bats, n) {
  let left = Math.max(0, Math.floor(n)); const L = bats.slice();
  while (left > 0 && L.some(b => batTotal(b) > 0)) {
    const live = L.filter(b => batTotal(b) > 0), q = Math.max(1, Math.floor(left / live.length));
    for (const b of live) { if (left <= 0) break; const d = Math.min(q, left, batTotal(b)); batLoseAny(b, d); left -= d }
  }
}
// Começa a luta do encontro: o comandante passa a estar DENTRO do tile (sem gastar ação: o encontro já gastou a do movimento; os NPCs andam quando ele sai, owed).
// Devolve {ok, tile, de, mode, enemies, bats:[id], soldiers} (mode = o da batalha em battle.js, soldiers = soma dos batalhões no tile) ou {ok:false, why}.
function wtBattleBegin(G) {
  const w = wtX(), e = w.enc, b = e && batGet(e.bat);
  if (!e || !b || w.turn !== 'commander' || w.inTile !== null) return { ok: false, why: 'sem-encontro' };
  const bats = wtForces(e); w.inTile = e.tile; w.owed = e.pend ? 1 : 0; w.mv = 0;
  return { ok: true, tile: e.tile, de: typeof b.de === 'number' ? b.de : null, mode: WT.layoutMode[e.layout], layout: e.layout, enemies: e.n,
    bats: bats.map(x => x.id), soldiers: bats.reduce((s, x) => s + batTotal(x), 0) };
}
// Sair da luta sem terminá-la (hoje sem uso no jogo: desde 2026-11-27 não se sai do tile em combate; fica para o macro/testes): o comandante sai do tile, o encontro continua à espera. As baixas até aqui já saíram dos batalhões
// e o bando perdeu `mortos` homens (a força nunca cai a menos de 1). Devolve {steps: []}.
function wtBattlePause(G, baixas, mortos) {
  const w = wtX(), e = w.enc; if (!e) return null;
  wtLoseSplit(wtForces(e), baixas || 0);
  const a = w.actors.find(x => x.id === e.actor); if (a && mortos > 0) a.str = Math.max(1, a.str - mortos);
  e.n = a ? a.str : Math.max(1, e.n - (mortos || 0)); w.inTile = null; w.owed = 0;
  return { steps: [] };
}
// Derrota do comandante em batalha ou fora dela. form 1 = tile neutro ou bandidos sem tropas: perde ouro, parte da munição e dos itens (itemsLost, o chamador sorteia); a ação
// gasta para entrar no tile já foi paga, nenhuma outra se perde; form 2 = batalha de POI com soldados: igual e mais WT.deathPoiSoldiers soldados (sem soldados vira forma 3, sozinho); form 3 = batalha grande: o batalhão
// se desfaz (soldados, ouro até WT.deathGold e munição), passa-se o comando a outro e, sem outro, o turno do Comandante acaba. Nunca dívida. O comandante volta ao mapa
// mundi (sai do tile; os NPCs andam o que ficaram devendo). Devolve {form, sozinho, soldados, ouro, restam, fim, steps}.
function wtDeath(G, id, form) {
  const w = wtX(), b = batGet(id); if (!b) return null;
  form = form || 3; const sozinho = form === 2 && batTotal(b) === 0; if (sozinho) form = 3;
  const sold = batTotal(b), gold = Math.max(0, Math.min(Ledger.get('gold'), WT.deathGold)), name = wtName(G, wtNode(b.tile));
  if (gold) Ledger.add('gold', -gold);
  let lostSold = 0;
  if (form === 3) {
    batDestroy(id); const rest = batList('player'); w.act = rest.length ? rest[0].id : 0;
    if (!rest.length) w.left = 0;   // sem batalhão: a rodada acaba e vai para o turno do Líder
    wtLog(txtWtDead(name, gold));
  } else {
    for (const k of Object.keys(b.mun)) b.mun[k] = Math.floor(b.mun[k] * (1 - WT.deathAmmoPart));
    if (form === 2) lostSold = Object.values(batLoseAny(b, WT.deathPoiSoldiers)).reduce((s, n) => s + n, 0);
    wtLog(txtWtFainted(name, form));
  }
  w.enc = null; const lv = w.inTile !== null || w.owed > 0 ? wtLeave(G) : null, restam = batList('player').length;
  return { form, sozinho, soldados: form === 3 ? sold : lostSold, ouro: gold, restam, fim: restam === 0, steps: lv ? lv.steps : [], mun: form !== 3 };
}
// A batalha encerrou a ação do jogador (qualquer que seja o movimento que sobrava): agora os NPCs dão o passo deles. Devolve [{npc}].
function wtBattleAfter(G, e) { return e.pend ? [{ npc: wtActionEnd(G) }] : [] }
// Fim da luta do encontro. venceu: o bando some e as baixas (soldados que morreram) se dividem igualmente entre os batalhões no tile; o comandante CONTINUA no tile
// (sai pelo botão; os NPCs que deviam andar andam então) e, fora dele (resolvido por número), os NPCs andam já. Derrota: wtDeath forma 3 (form = outra, se pedida).
// Devolve {fim, steps, ...}: fim = sem batalhão (chame wtEnd).
function wtBattleEnd(G, venceu, baixas, form) {
  const w = wtX(), e = w.enc; if (!e) return { fim: false };
  const b = batGet(e.bat), bats = wtForces(e);
  if (venceu) {
    w.enc = null; const i = w.actors.findIndex(a => a.id === e.actor); if (i >= 0) w.actors.splice(i, 1);
    wtLoseSplit(bats.length ? bats : (b ? [b] : []), baixas || 0);
    wtLog(txtWtWon(wtName(G, e.tile), baixas || 0));
    if (w.inTile !== null) { w.owed += e.pend ? 1 : 0; return { fim: false, steps: [] } }
    return { fim: false, steps: wtBattleAfter(G, e) };
  }
  const dentro = w.inTile !== null, r = b ? wtDeath(G, b.id, form) : null;
  if (r && !dentro && r.restam) r.steps = wtBattleAfter(G, e);   // resolvido por número (fora do tile): os NPCs andam já
  return Object.assign({ fim: !!r && r.restam === 0, steps: r ? r.steps : [] }, r || {});
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
