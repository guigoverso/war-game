'use strict';
// ---------- Cenários do mundo novo (?mundo=1): partidas já montadas para testar uma mecânica sem jogar até ela ----------
// Cada cenário é só uma URL (a lista MUNDO_SCN alimenta a galeria cenarios-mundo.html, gerada por `cd tests && node cenarios-mundo.js`). Sessões novas da etapa 8
// acrescentam os seus aqui. Parâmetros desta sessão (8.3, encontro e morte), todos com ?mundo=1&auto=1&mute=1&seed=11:
//   enc=campo|defesa|invasao  encontro pronto no mapa mundi (campo = no tile vizinho; defesa = o bando entra na sua cidade; invasao = bando estacionado no vizinho)
//   soldados=N  soldados do batalhão 1 (padrão 10); soldados2=N  um 2º batalhão no mesmo tile (as forças se somam); mix=1  tipos de soldado variados
//   inim=N      força do bando (padrão 14); explorar=1  sem encontro: o comandante já está dentro do tile da capital
//   mortal=1    desliga o modo deus (o criativo é invencível; sem isto não dá para morrer); morrer=S  o comandante cai S segundos depois de estar jogando no tile
// Só vale numa partida nova (um save, ou a página recarregada ao entrar num tile, já traz o estado e o cenário não refaz nada).
const MUNDO_SCN = [
  { id: 'campo', t: 'Encontro no campo (Choque)', d: '10 soldados seus contra um bando de 14 num tile vizinho à capital. Botão Lutar no mapa mundi.', q: 'enc=campo&soldados=10&inim=14&mix=1' },
  { id: 'campo-grande', t: 'Encontro no campo, 30 x 10', d: '50 soldados contra 40 (campo: no máximo 30 inimigos e 10 soldados vivos ao mesmo tempo; o resto vem como reserva).', q: 'enc=campo&soldados=50&inim=40&mix=1' },
  { id: 'campo-dois', t: 'Dois batalhões no mesmo tile', d: 'Dois batalhões de 30 somam 60 contra 40; as baixas se dividem igualmente entre eles ao vencer.', q: 'enc=campo&soldados=30&soldados2=30&inim=40&mix=1' },
  { id: 'defesa', t: 'Defesa da cidade', d: 'Um bando de 25 cai sobre a capital com o seu batalhão dentro. Sem fuga: sair do raio azul é perder.', q: 'enc=defesa&soldados=20&inim=25&mix=1' },
  { id: 'invasao', t: 'Invasão (Ataque)', d: 'Um bando estacionado no tile vizinho; conquiste o ponto principal. Sair do tile no meio só pausa a luta.', q: 'enc=invasao&soldados=30&inim=30&mix=1' },
  { id: 'morte-batalha', t: 'Morte em batalha grande (batalhão se desfaz)', d: 'Bando forte e comandante mortal: ele cai 40 s depois de começar a luta, e o batalhão se desfaz.', q: 'enc=campo&soldados=10&inim=60&mortal=1&morrer=40' },
  { id: 'morte-sozinho', t: 'Morte com o batalhão vazio', d: 'Comandante sem soldados contra um bando: cai e o batalhão (só ele) se desfaz.', q: 'enc=campo&soldados=0&inim=20&mortal=1&morrer=40' },
  { id: 'morte-campo', t: 'Morte fora de batalha (tile explorado)', d: 'O comandante já está dentro do tile, sem encontro, e cai 20 s depois: perde ouro, parte da munição e dos itens, e uma ação.', q: 'explorar=1&soldados=10&mortal=1&morrer=20' }
];
const MUNDO_SCN_BASE = 'mundo=1&auto=1&mute=1&seed=11&';

// Gancho de scenarioApply (scenario.js). Devolve true se montou um cenário (a partida nova pula o livro do Líder e já abre o turno do Comandante).
function mundoScenario() {
  const q = new URLSearchParams(location.search); if (!mapMundoOn()) return false;
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
