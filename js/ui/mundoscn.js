'use strict';
// ---------- Cenários do mundo novo (?mundo=1): partidas já montadas para testar uma mecânica sem jogar até ela ----------
// Cada cenário é só uma URL (a lista MUNDO_SCN alimenta a galeria cenarios-mundo.html, gerada por `cd tests && node cenarios-mundo.js`). Sessões novas da etapa 8
// acrescentam os seus aqui. Parâmetros desta sessão (8.3, encontro e morte), todos com ?mundo=1&auto=1&mute=1&seed=11:
//   enc=campo|defesa|invasao  encontro pronto no mapa mundi (campo = no tile vizinho; defesa = o bando entra na sua cidade; invasao = bando estacionado no vizinho)
//   soldados=N  soldados do batalhão 1 (padrão 10); soldados2=N  um 2º batalhão no mesmo tile (as forças se somam); mix=1  tipos de soldado variados
//   inim=N      força do bando (padrão 14); explorar=1  sem encontro: o comandante já está dentro do tile da capital
//   meu=1       no Ataque, o POI mais perto do alvo já é seu (a reposição dos soldados nasce nele)
//   mortal=1    desliga o modo deus (o criativo é invencível; sem isto não dá para morrer); morrer=S  o comandante cai S segundos depois de estar jogando no tile
// Parâmetros da 8.4 (economia por tile), também com ?mundo=1&auto=1&mute=1&seed=11:
//   terras=N    anexa os N tiles de terra mais perto da capital (recursos, vilas, cidades...); vila=1  anexa uma vila SEM tile seu vizinho (a mais longe da capital)
//   cidade=1    anexa a cidade NPC mais perto (para entrar nela: o suprimento sai do armazém); indep=1  a chance de independência vira 100%
//   armazem=1   o armazém único começa com madeira, minério e comida; armazem=cheio  todos os 24 slots cheios (a renda que sobra se perde em silêncio)
//   ouro=N      saldo de ouro (padrão: o do modo criativo); nivel=N  nível da facção (pool de ações e batalhões)
// Só vale numa partida nova (um save, ou a página recarregada ao entrar num tile, já traz o estado e o cenário não refaz nada).
const MUNDO_SCN = [
  { id: 'campo', t: 'Encontro no campo (Choque)', d: '10 soldados seus contra um bando de 14 num tile vizinho à capital. Botão Lutar no mapa mundi.', q: 'enc=campo&soldados=10&inim=14&mix=1' },
  { id: 'campo-grande', t: 'Encontro no campo, 30 x 10', d: '50 soldados contra 40 (campo: no máximo 30 inimigos e 10 soldados vivos ao mesmo tempo; o resto vem como reserva).', q: 'enc=campo&soldados=50&inim=40&mix=1' },
  { id: 'campo-dois', t: 'Dois batalhões no mesmo tile', d: 'Dois batalhões de 30 somam 60 contra 40; as baixas se dividem igualmente entre eles ao vencer.', q: 'enc=campo&soldados=30&soldados2=30&inim=40&mix=1' },
  { id: 'defesa', t: 'Defesa da cidade', d: 'Um bando de 25 cai sobre a capital com o seu batalhão dentro. Sem fuga: sair do raio azul é perder.', q: 'enc=defesa&soldados=20&inim=25&mix=1' },
  { id: 'invasao', t: 'Invasão (Ataque)', d: 'Um bando estacionado no tile vizinho; conquiste o ponto principal (a guarnição vem da batalha; vencer conquista o POI). Não se sai do tile em combate.', q: 'enc=invasao&soldados=30&inim=30&mix=1' },
  { id: 'invasao-poi', t: 'Invasão com POI seu perto', d: 'Como a invasão, mas um POI do tile já é seu: os soldados de reposição nascem nele. Vencer passa todos os POIs inimigos do tile para você.', q: 'enc=invasao&soldados=30&inim=30&mix=1&meu=1' },
  { id: 'morte-batalha', t: 'Morte em batalha grande (batalhão se desfaz)', d: 'Bando forte e comandante mortal: ele cai 40 s depois de começar a luta, e o batalhão se desfaz.', q: 'enc=campo&soldados=10&inim=60&mortal=1&morrer=40' },
  { id: 'morte-sozinho', t: 'Morte com o batalhão vazio', d: 'Comandante sem soldados contra um bando: cai e o batalhão (só ele) se desfaz.', q: 'enc=campo&soldados=0&inim=20&mortal=1&morrer=40' },
  { id: 'morte-campo', t: 'Morte fora de batalha (tile explorado)', d: 'O comandante já está dentro do tile, sem encontro, e cai 20 s depois: perde ouro, parte da munição e dos itens, (a ação da exploração já foi gasta; nenhuma a mais).', q: 'explorar=1&soldados=10&mortal=1&morrer=20' },
  { id: 'renda', t: 'Renda dos tiles e armazém', d: 'Seis tiles seus ao redor da capital. Encerre o turno: a tabela de renda aparece no livro (Resumo) e os recursos entram no armazém (livro > Cidades).', q: 'terras=6&armazem=1&nivel=3' },
  { id: 'vila-longe', t: 'Vila distante fica independente', d: 'Uma vila sua sem nenhum tile seu por perto, com a independência garantida: ao encerrar o turno ela se declara independente e o mapa mundi perde a bandeira.', q: 'vila=1&indep=1&nivel=3' },
  { id: 'armazem-cheio', t: 'Armazém cheio (excedente se perde)', d: 'Os 24 slots do armazém já estão cheios: a renda dos tiles não cabe e some em silêncio (a tabela mostra o que rendeu).', q: 'terras=6&armazem=cheio&nivel=3' },
  { id: 'cidade-2', t: 'Entrar numa segunda cidade sua', d: 'A cidade NPC mais perto já é sua, com o armazém abastecido: ao entrar, os suprimentos dela saem do armazém único. Botão direito no tile > Entrar.', q: 'cidade=1&armazem=1&nivel=5' },
];
const MUNDO_SCN_BASE = 'mundo=1&auto=1&mute=1&seed=11&';

// Gancho de scenarioApply (scenario.js). Devolve true se montou um cenário (a partida nova pula o livro do Líder e já abre o turno do Comandante).
function mundoScenario() {
  const q = new URLSearchParams(location.search); if (!mapMundoOn()) return false;
  if (mundoScnEcon(q)) return true;
  if (q.get('mortal') === '1') setGod(false);   // vale também depois de recarregar o tile (o criativo religa o modo deus a cada partida)
  const kind = q.get('enc') || (q.get('explorar') ? 'explorar' : ''); mundoScnDie(+q.get('morrer') || 0);
  if (!kind || wtX().init) return false;
  const G2 = wtGraph(), n = q.has('soldados') ? +q.get('soldados') : 10, n2 = +q.get('soldados2') || 0, foe = q.has('inim') ? +q.get('inim') : 14;
  G.introBook = false; STATE.phase = 'commander'; STATE.round = 1; STATE.rd.lvl = 3; STATE.rd.actions = maxActions();
  wtInit(G2); wtX().actors = []; wtX().turn = 'leader'; wtCommanderBegin(G2);   // sem bandos soltos nem caravanas: só o do cenário
  const b = wtEnsureBat(G2), home = G2.inicio.id, w = wtX();
  const fill = (bt, k) => { const mix = q.get('mix') === '1' ? [0.6, 0.15, 0.1, 0.15] : [1, 0, 0, 0]; let left = k;
    BAT.kinds.forEach((kd, i) => { const c = i === BAT.kinds.length - 1 ? left : Math.round(k * mix[i]); left -= batGain(bt, kd, c) }) };
  fill(b, n);
  const next = kind === 'defesa' || kind === 'explorar' ? home : G2.adj[home].map(x => x.to).find(t => !G2.nodes[t].mar && G2.nodes[t].tema !== 'cidade' && G2.nodes[t].tema !== 'vila');
  if (next === undefined) return false;
  b.tile = wtKey(next); b.de = home;
  if (n2 > 0) fill(batCreate('player', wtKey(next), {}, {}, 3), n2);
  if (kind === 'explorar') { w.inTile = home; w.owed = 1; w.left = Math.max(0, w.left - 1); return true }
  const a = { id: ++w.seq, kind: 'bandit', tile: next, str: foe, stay: kind === 'invasao' ? 3 : 0 }; w.actors.push(a);
  wtSetEnc(G2, a, b, kind === 'defesa' ? 'npc' : 'player'); return true;
}
// meu=1 (Ataque no tile real): o POI inimigo mais perto do alvo já é seu (a reposição dos soldados nasce nele). Chamada por tbPoiOpts (local/tilebattle.js).
function mundoScnPois() {
  if (new URLSearchParams(location.search).get('meu') !== '1') return;
  const S = WORLD.tileS, main = S && S.main && S.main.poi; if (!main) return;
  const c = (WORLD.pois || []).filter(p => p !== main && !p.show && !p.war && (p.owner === 'bandit' || typeof p.owner === 'number'))
    .sort((a, b) => Math.hypot(a.cx - main.cx, a.cz - main.cz) - Math.hypot(b.cx - main.cx, b.cz - main.cz))[0];
  if (c) poiSetOwner(c, 'player');
}
// morrer=S: depois de S segundos jogando dentro de um tile (mapa mundi fechado, sem painel), o comandante cai (die(), como se os inimigos o tivessem derrubado).
function mundoScnDie(secs) {
  if (!secs) return;
  let t0 = 0;
  const id = setInterval(() => {
    if (!G.running || P.dead || WM.open || G.panel || wtX().inTile === null) { t0 = 0; return }
    if (!t0) { t0 = performance.now(); return }
    if (performance.now() - t0 >= secs * 1000) { clearInterval(id); P.hp = 0; die() }
  }, 500);
}

// Cenários da economia por tile (8.4; parâmetros no topo do arquivo). Monta a partida no turno do Comandante, rodada 1, com os tiles anexados e o armazém pedidos.
function mundoScnEcon(q) {
  if (!['terras', 'vila', 'cidade', 'armazem', 'ouro', 'nivel', 'indep'].some(k => q.has(k)) || wtX().init) return false;
  const G2 = wtGraph(), home = G2.inicio.id, H = G2.nodes[home], land = G2.nodes.filter(n => !n.mar && !n.home);
  const dist = n => Math.hypot(n.x - H.x, n.z - H.z);
  G.introBook = false; STATE.phase = 'commander'; STATE.round = 1; STATE.rd.lvl = +q.get('nivel') || 1; STATE.rd.actions = maxActions();
  if (q.has('ouro')) P.coins = +q.get('ouro');
  if (q.get('indep') === '1') TILE_ECON.indepChance = 1;
  for (const n of land.slice().sort((a, b) => dist(a) - dist(b)).slice(0, +q.get('terras') || 0)) wtAnnex(G2, n.id);
  if (q.get('cidade') === '1') { const c = land.filter(n => n.tema === 'cidade').sort((a, b) => dist(a) - dist(b))[0]; if (c) wtAnnex(G2, c.id) }
  if (q.get('vila') === '1') {   // a vila mais longe da capital cujos vizinhos não são seus
    const v = land.filter(n => n.tema === 'vila' && wtOwnedNear(G2, n.id) === 0).sort((a, b) => dist(b) - dist(a))[0]; if (v) wtAnnex(G2, v.id);
  }
  const sh = shOf(), arm = q.get('armazem');
  if (arm === 'cheio') for (let i = 0; i < WH_SLOTS; i++) sh.store[i] = { id: 'tora', n: TILE_ECON.storeStack };
  else if (arm) for (const [id, n] of [['tora', 30], ['minerio', 20], ['carne', 25], ['couro', 10]]) storeAddTo(sh, id, n);
  wtInit(G2); wtX().actors = []; wtX().turn = 'leader'; wtCommanderBegin(G2); wtEnsureBat(G2);
  return true;
}
