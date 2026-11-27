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
  { id: 'ponte-neutra', t: 'Ponte neutra (pedágio 100)', d: 'O batalhão está ao lado de um tile de ponte sem dono. Marche para o outro lado: o aviso pede ◉100 (pagar, recusar, não mostrar de novo).', q: 'sitio=ponte&ped=neutro&ouro=1000' },
  { id: 'ponte-aliada', t: 'Ponte de facção aliada (de graça)', d: 'Ponte de uma facção Aliada: cobra 150 x 0 = nada. Troque rel= (fav 105, neutral 150, unfav 225, enemy 300) na URL para ver os outros preços.', q: 'sitio=ponte&ped=faccao&rel=ally&ouro=1000' },
  { id: 'ponte-inimiga', t: 'Ponte de facção inimiga (300)', d: 'Pedágio de 150 x 2. Recuse e volte (não paga), ou pague e atravesse; o ouro pode ficar negativo (dívida).', q: 'sitio=ponte&ped=faccao&rel=enemy&ouro=100' },
  { id: 'ponte-meu', t: 'Ponte sua (grátis)', d: 'Atravessar o seu próprio tile não cobra nada. (NPCs que passarem pagam a você; eles só andam de verdade na 8.10.)', q: 'sitio=ponte&ped=meu&ouro=1000' },
  { id: 'ponte-bandidos', t: 'Ponte tomada por bandidos (500)', d: 'Bandidos seguram a ponte: o encontro oferece lutar ou pagar ◉500 e passar.', q: 'sitio=ponte&ped=bandido&bando=1&ouro=1000' },
  { id: 'fortaleza-neutra', t: 'Fortaleza neutra (pedágio 100)', d: 'Mesmo pedágio, no tile de fortaleza. Encerre ações várias vezes: bandidos soltos podem tomar a passagem (diário do turno).', q: 'sitio=fortaleza&ped=neutro&ouro=1000' },
  { id: 'torre', t: 'Torre de vigia nova', d: 'Dentro do tile, ao lado de uma torre sua. [E] na base ou no binóculo: 3 usos por rodada, 50% de falha; a dungeon achada aparece como cristal roxo no mapa mundi (J) só nesta rodada.', q: 'poi=tower&dono=player' },
  { id: 'bau-fazenda', t: 'Baú de recompensa (fazenda de bandidos)', d: 'Fazenda com guarnição de bandidos e o baú trancado. Limpe os bandidos: o POI vira seu na hora e o baú abre (comida).', q: 'poi=farm&dono=bandit' },
  { id: 'bau-torre', t: 'Baú de recompensa (torre de bandidos)', d: 'Torre dominada por bandidos; o baú guarda munição. Se os bandidos a retomarem, o baú enche de novo.', q: 'poi=tower&dono=bandit' },
  { id: 'santuario', t: 'Santuário: dízimo no altar', d: 'Santuário seu e vida pela metade: [E] no altar cura uma parte pelo dízimo (sem buffs nem debuffs no preço).', q: 'poi=sanctuary&dono=player&vida=40' },
  { id: 'entreposto', t: 'Entreposto: Comprar / Vender', d: 'Entreposto seu: o menu pergunta Comprar ou Vender; ele só paga até o ouro que tem na rodada.', q: 'poi=post&dono=player&ouro=1000' },
  { id: 'taverna', t: 'Taverna: Comprar / Vender e cura', d: 'Taverna sua: menu com Comprar (comida e remédios), Vender itens e o quarto.', q: 'poi=tavern&dono=player&ouro=1000' },
  { id: 'cidade-2', t: 'Entrar numa segunda cidade sua', d: 'A cidade NPC mais perto já é sua, com o armazém abastecido: ao entrar, os suprimentos dela saem do armazém único. Botão direito no tile > Entrar.', q: 'cidade=1&armazem=1&nivel=5' },
];
const MUNDO_SCN_BASE = 'mundo=1&auto=1&mute=1&seed=11&';
// Parâmetros da 8.5 (POIs viram sítios), também com ?mundo=1&auto=1&mute=1&seed=11:
//   sitio=ponte|fortaleza  o tile de pedágio mais perto da capital; o batalhão começa num vizinho de terra dele (clique no outro lado para atravessar)
//   ped=neutro|faccao|bandido|meu  dono desse tile (neutro cobra 100, facção 150 x relação, bandidos 500, o seu é de graça); rel=ally|fav|neutral|unfav|enemy  relação com a facção
//   bando=1  um bando de bandidos parado no tile de pedágio (encontro com o botão de pagar a passagem)
//   tile=<tema|id>  a partida já começa dentro desse tile (o mais perto da capital do tema); poi=<tipo>  põe um POI desse tipo ao lado do jogador (tower, sanctuary, farm,
//   mine, sawmill, hunters, post, tavern, fort, inn, lodge, bridge); dono=player|bandit  dono do POI (bandit = guarnição e baú trancado); vida=N  vida do jogador
function mundoScnTile(G, q) {
  const t = q.get('tile'); if (!t) return null;
  if (/^[0-9]+$/.test(t)) return G.nodes[+t] && !G.nodes[+t].mar ? +t : null;
  const H = G.inicio, d = n => Math.hypot(n.x - H.x, n.z - H.z);
  const c = G.nodes.filter(n => n.tema === t && !n.mar).sort((a, b) => d(a) - d(b))[0]; return c ? c.id : null;
}
// Põe um POI do tipo `type` perto do começo do jogador (fora da cidade) e o monta como se tivesse nascido com o tile. Devolve o POI ou null.
function mundoScnPoi(type, dono) {
  const d = POI_DEFS[type], hm = WORLD.home; if (!d || !hm) return null;
  const taken = (WORLD.pois || []).map(p => ({ x: p.cx, z: p.cz, r: poiR(p) })), base = (hm.half > 1 ? hm.half * 1.45 : 0) + d.r + 8;
  for (let dd = base; dd < base + 160; dd += 8) for (let k = 0; k < 24; k++) {
    const a = k / 24 * 6.2832, x = Math.round(hm.cx + Math.cos(a) * dd), z = Math.round(hm.cz + Math.sin(a) * dd), y = spotOK(x, z, d.r + 2, taken, 8, 4, 0);
    if (y === null) continue;
    const p = { id: 900, type, cx: x, cz: z, y, biome: B[z * W + x], owner: dono, tile: true, cityId: 0 };
    flattenArea(x, z, d.r, y, POI_BIG[type] ? 4 : 3); poiBuild(p); WORLD.pois.push(p);
    poiX().since[p.id] = -9;   // os moradores já estão lá (o serviço funciona)
    poiApply(); return p;
  }
  return null;
}
// Cenários da 8.5 (parâmetros acima).
function mundoScnSite(q) {
  if (!['sitio', 'poi'].some(k => q.has(k)) || wtX().init) return false;
  const G2 = wtGraph(), home = G2.inicio.id, w = wtX(); poiX().since = poiX().since || {};
  G.introBook = false; STATE.phase = 'commander'; STATE.round = 1; STATE.rd.lvl = 3; STATE.rd.actions = maxActions();
  if (q.has('ouro')) P.coins = +q.get('ouro');
  if (q.has('vida')) P.hp = +q.get('vida');
  wtInit(G2); w.actors = []; w.turn = 'leader'; wtCommanderBegin(G2);
  const b = wtEnsureBat(G2); BAT.kinds.forEach((kd, i) => batGain(b, kd, i === 0 ? 10 : 0));
  if (q.has('sitio')) {
    const H = G2.nodes[home], t = G2.nodes.filter(n => n.tema === q.get('sitio') && !n.mar).sort((x, y) => Math.hypot(x.x - H.x, x.z - H.z) - Math.hypot(y.x - H.x, y.z - H.z))[0];
    if (!t) return false;
    const nb = G2.adj[t.id].map(x => x.to).find(id => !G2.nodes[id].mar); b.tile = wtKey(nb); b.de = -1;
    const ped = q.get('ped') || 'neutro';
    if (ped === 'faccao') wtAnnex(G2, t.id, 3); else if (ped === 'bandido') wtAnnex(G2, t.id, 'bandit'); else if (ped === 'meu') wtAnnex(G2, t.id, 'player');
    const rel = { ally: [10, true], fav: [9, false], neutral: [5, false], unfav: [2, false], enemy: [0, false] }[q.get('rel')];
    if (rel) Object.assign(relOf(3), { v: rel[0], ally: rel[1] });
    if (q.get('bando') === '1') w.actors.push({ id: ++w.seq, kind: 'bandit', tile: t.id, str: 8, stay: 0 });
    return true;
  }
  w.inTile = w.local; w.owed = 1; w.left = Math.max(0, w.left - 1); b.tile = wtKey(w.local); b.de = home;   // dentro do tile, sem encontro
  const p = mundoScnPoi(q.get('poi'), q.get('dono') === 'bandit' ? 'bandit' : 'player');
  if (p) {
    const s = p.vigilPos || p.altar || (p.svcSpec && p.svcSpec[0]) || { x: p.cx + poiR(p) * 0.5, z: p.cz };
    P.x = s.x + 1.5; P.z = s.z; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  }
  return true;
}

// Gancho de scenarioApply (scenario.js). Devolve true se montou um cenário (a partida nova pula o livro do Líder e já abre o turno do Comandante).
function mundoScenario() {
  const q = new URLSearchParams(location.search); if (!mapMundoOn()) return false;
  if (mundoScnSite(q) || mundoScnEcon(q)) return true;   // site primeiro: os dois aceitam ouro=
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
