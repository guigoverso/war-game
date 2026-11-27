'use strict';
// ---------- Turno no mapa mundi 3D (etapa 7): painel de ações/batalhões, atores no diorama e encontro (js/ui/mundo3d.js + js/macro/worldturn.js) ----------
// Só interface: as regras estão em worldturn.js (STATE.wt). Caixa de Ações no alto à esquerda; o resto sai dos cliques no mapa (ver wm3EntMenu). Atores = bandidos (vermelho) e caravanas (carroça); outros batalhões seus = bandeira da facção.
// Sem toast nem nota: recusas ficam em silêncio (o contador de ações basta); o resumo do turno vai para o livro (rdNow) em wtEnd.
const wm3TurnState = { grp: null };
const wm3TurnTile = n => tileName(WM.built.G, WM.built.G.nodes[n]);

// Ao abrir o mapa: garante o mundo (atores), começa o turno do Comandante se ainda era o do Líder (no jogo, só fora do escritório) e põe o boneco no batalhão ativo.
function wm3TurnOpen(B) {
  const w = wtX(); wtInit(B.G); wm3SpeedSet(+localStorage.getItem('wm3speed') || WT.speedDefault);
  if (w.turn === 'leader' && (WM.standalone || typeof STATE.phase === 'undefined' || STATE.phase !== 'leader')) wtCommanderBegin(B.G);
  const b = wtEnsureBat(B.G); WM.at = b ? wtNode(b.tile) : B.G.inicio.id;
  wm3TokenPlace(WM.at); wm3TurnActors(); wm3TurnHud();
}
// Posição da vaga s (0 = a do batalhão ativo) de um tile: as vagas se enfileiram ao lado da âncora.
function wm3TurnPos(tile, s) { const a = wm3Anchor(tile); return { x: a.x - s * WORLD3D.slotGap, y: a.y, z: a.z } }
// Cor de um dono de batalhão: facção (FAC_COLORS), bandidos (WORLD3D.banditColor); o jogador usa a da facção dele.
const wm3TurnColor = dono => dono === 'bandit' ? WORLD3D.banditColor : dono === 'player' ? FAC_COLORS[(STATE.fac && STATE.fac.color) || 0].c : (facColor(dono) || WORLD3D.banditColor);
// Carroça (caravana) da altura do batalhão (WORLD3D.caravanScale), com a cor da facção da cidade de origem (col), com o comprimento ao longo de +z (a direção em que o boneco olha ao andar): lona, caixa, rodas dos lados e cavalo.
function wm3Cart(col) {
  const m = new THREE.Group();
  wmBox(m, -0.7, 0.5, -1.5, 1.4, 0.7, 2.4, 0x8a5a2a); wmBox(m, -0.8, 1.2, -1.5, 1.6, 0.9, 2.4, col); wmBox(m, -0.5, 2.1, -1.4, 1, 0.2, 2.1, 0xe8dcc0);
  wmBox(m, 0.78, 1.2, -2.2, 0.06, 1.9, 0.06, 0x4a3a2a); wmBox(m, 0.78, 2.4, -2.2, 0.05, 0.6, 0.8, col);   // bandeira da facção de origem
  for (const sx of [-0.95, 0.65]) for (const z of [-2, -0.5]) wmBox(m, sx, 0, z, 0.3, 0.9, 0.9, 0x3a2a1a);
  wmBox(m, -0.35, 0.6, 1.2, 0.7, 0.9, 1.1, 0x6a4a2a); wmBox(m, -0.2, 1.4, 1.9, 0.4, 0.5, 0.5, 0x6a4a2a); wmBox(m, -0.05, 0.1, 1.2, 0.1, 0.5, 0.1, 0x3a2a1a);   // cavalo
  m.scale.setScalar(WORLD3D.heroScale * WORLD3D.caravanScale); return { g: m, h: null };
}
// Marcadores dos atores e dos batalhões que não são o ativo. Bandido, facção e jogador usam o mesmo boneco do batalhão (wm3Figure), cada um com a sua cor;
// caravana é uma carroça. wm3TurnState.mesh[id] guarda o boneco de cada ator para a animação. Em cada tile só cabem WORLD3D.tileSlots (o seu batalhão ativo
// ocupa a vaga 0); quem passa disso e tem menos prioridade fica escondido.
function wm3TurnActors() {
  const B = WM.built, w = wtX(), sc = B.scene; if (wm3TurnState.grp) sc.remove(wm3TurnState.grp);
  const g = new THREE.Group(), by = {}; wm3TurnState.mesh = {};
  const add = (tile, pri, mk, id) => (by[tile] || (by[tile] = [])).push({ pri, mk, id });
  for (const a of w.actors) add(a.tile, a.kind === 'bandit' ? 2 : 3, () => a.kind === 'bandit' ? wm3Figure(wm3TurnColor('bandit')) : wm3Cart(wm3FlagColor(B.G.nodes[a.route[0]])), a.id);
  for (const b of batList()) if (b.id !== w.act) add(wtNode(b.tile), b.dono === 'player' ? 1 : 2, () => wm3Figure(wm3TurnColor(b.dono)), 0);
  for (const t of Object.keys(by)) {
    const L = by[t].sort((x, y) => x.pri - y.pri), tok = WM.at === +t && wtActive() ? 1 : 0;
    L.forEach((e, i) => {
      const o = e.mk(), s = tok + i, p = wm3TurnPos(+t, s); o.g.position.set(p.x, p.y, p.z); o.g.visible = s < WORLD3D.tileSlots; g.add(o.g);
      if (e.id) wm3TurnState.mesh[e.id] = o;
    });
  }
  sc.add(g); wm3TurnState.grp = g;
}
// ---- marcha em sequência: um passo do batalhão (uma ação) e logo os NPCs dão o deles, tudo andando na tela ----
// WM.seq = {steps:[{from,node,edge,npc:[{id,from,to,e}]}], i, tw}. Chamado por wm3Go (e por "Encerrar ações", que só tem passos de NPC).
function wm3SeqNext() {
  const q = WM.seq; if (!q) return;
  if (++q.i >= q.steps.length) { WM.seq = null; wm3TurnAfter(); return }
  const st = q.steps[q.i], B = WM.built;
  if (st.node === undefined) { wm3SeqNpc(); return }   // passo só de NPCs (fim do turno)
  const p = wm3PathPts({ ids: [st.edge], from: [st.from] }), t = B.token.position, a = wm3Anchor(st.node);
  WM.walk = { pts: [{ x: t.x, y: t.y, z: t.z }].concat(p, [{ x: a.x, y: a.y, z: a.z }]), k: 0, f: 0, dest: st.node };
}
// Depois do passo do batalhão: os NPCs do passo andam juntos (cada um pela trilha da aresta).
function wm3SeqNpc() {
  const q = WM.seq, st = q.steps[q.i], B = WM.built, tw = [];
  for (const m of st.npc) {
    const o = wm3TurnState.mesh[m.id]; if (!o) continue;
    const e = B.G.edges[m.e], pts = B.edgePts[m.e], seq = e.a === m.from ? pts : pts.slice().reverse(), end = wm3TurnPos(m.to, WM.at === m.to ? 1 : 0);
    const path = [{ x: o.g.position.x, y: o.g.position.y, z: o.g.position.z }].concat(seq.filter(x => !x.skip).map(x => ({ x: x.x, y: x.y, z: x.z })), [end]);
    o.g.visible = true; tw.push({ o, pts: path, k: 0, f: 0 });
  }
  if (!tw.length) { wm3SeqNext(); return }
  q.tw = tw;
}
function wm3TurnAnim(dt) {
  const q = WM.seq; if (!q || !q.tw) return;
  let live = 0;
  for (const t of q.tw) {
    let left = WORLD3D.walkSpeed * WM.speed * dt; const g = t.o.g, P = t.pts;
    if (t.k >= P.length - 1) continue;
    while (left > 0 && t.k < P.length - 1) {
      const a = P[t.k], b = P[t.k + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 0.001, rem = l * (1 - t.f);
      if (left >= rem) { left -= rem; t.k++; t.f = 0; continue }
      t.f += left / l; left = 0;
    }
    const a = P[t.k], b = P[Math.min(t.k + 1, P.length - 1)];
    g.position.set(a.x + (b.x - a.x) * t.f, a.y + (b.y - a.y) * t.f + Math.abs(Math.sin(performance.now() / 90)) * 0.3, a.z + (b.z - a.z) * t.f);
    if (b !== a) g.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    if (t.o.h) { const sw = Math.sin(performance.now() / 70) * 0.6; t.o.h.legs[0].rotation.x = sw; t.o.h.legs[1].rotation.x = -sw }
    if (t.k < P.length - 1) live++;
  }
  if (!live) { for (const t of q.tw) if (t.o.h) t.o.h.legs.forEach(l => { l.rotation.x = 0 }); q.tw = null; wm3SeqNext() }
}
// Depois de a marcha acabar: marcadores, caixa de Ações e anel do batalhão selecionado.
function wm3TurnAfter() { wm3TurnActors(); wm3TurnHud(); wm3ArmRing(); wm3TurnRoundGo() }
// Começa uma marcha só de passos de NPC (encerrar ações, sair do tile, luta): devolve true se havia passos para andar.
function wm3TurnSeqStart(steps) {
  if (!steps || !steps.length) return false;
  WM.seq = { steps, i: -1, tw: null }; wm3SeqNext(); return true;
}

// Caixa de Ações (canto superior esquerdo, sempre no topo da coluna): contador de ações e, quando vale, o encontro ou o aviso de dentro do tile.
function wm3TurnHudMake() {
  if (WM.turnEl) return;
  const css = document.createElement('style');
  css.textContent = `#wm3turn { width: 270px; box-sizing: border-box; pointer-events: auto; background: rgba(30,21,11,.96); border: 2px solid #c9a24a;
      border-radius: 12px; color: #f4ecd8; font: 14px Georgia, serif; padding: 10px 12px; display: none; }
    #wm3turn b { color: #fff; } #wm3turn .wm3-sub { color: #d8c8a0; margin: 4px 0; font-size: 13px; }
    #wm3turn button { display: block; width: 100%; margin-top: 6px; text-align: left; pointer-events: auto; cursor: pointer; padding: 7px 10px; border: 2px solid #c9a24a;
      border-radius: 10px; font: bold 13px Georgia, serif; background: #3a2810; color: #f4ecd8; }
    #wm3turn button:hover { background: #5a3d1a; } #wm3turn .wm3-warn { color: #ff9a8a; margin-top: 6px; font-size: 13px; }`;
  document.head.appendChild(css);
  const el = WM.turnEl = WM.hud.el.querySelector('#wm3turn');
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) wm3TurnClick(b.dataset.a) });
}
function wm3TurnHud() {
  wm3TurnHudMake();
  const el = WM.turnEl, w = wtX(); if (w.turn === 'leader') { el.style.display = 'none'; return }
  let h = '<div>' + txtWtActions(w.left, w.pool) + '</div>';
  if (w.enc) h += '<div class="wm3-warn">⚔ ' + txtWtEncTitle(w.enc.layout, w.enc.n) + '</div><button data-a="auto">' + TXT_WT_ENC_AUTO + '</button>';
  else if (w.inTile !== null) h += '<div class="wm3-sub">' + txtWtInTile(wm3TurnTile(w.inTile)) + '</div><button data-a="leave">' + TXT_WT_LEAVE + '</button>';
  el.innerHTML = h; el.style.display = 'block';
}
// Ações do turno (caixa de Ações e menus): enter (entrar no tile), leave, auto, skip (pula uma ação), end (encerra o turno). Recusas ficam em silêncio
// (o contador de ações basta).
function wm3TurnClick(a) {
  const G2 = WM.built.G; if (WM.walk || WM.seq) return;
  if (a === 'enter') { wm3EnterTile(); return }
  else if (a === 'leave') { const r = wtLeave(G2); if (wm3TurnSeqStart(r && r.steps)) return }
  else if (a === 'auto') { const r = wtAutoBattle(G2); if (r && r.fim) { wm3TurnEnd(); return } else if (r && wm3TurnSeqStart(r.steps)) return }
  else if (a === 'skip') {   // o tempo passa como numa marcha
    const r = wtSkip(G2); if (r.ok) wm3ClockSpend(WT.clock.skipMv); if (r.ok && wm3TurnSeqStart(r.steps)) return;
  }
  else if (a === 'end') { wm3TurnEnd(); return }
  wm3TurnSync();
}
// Encerrar o turno do Comandante. No jogo do mundo novo (?mundo=1) é o fim ÚNICO da rodada: wtEnd (sem passar o diário ao livro; endRound o leva para o
// relatório da rodada que fecha), os NPCs andam na tela e, ao fim da marcha, o mapa fecha e a rodada fecha (endRound, rounds.js) indo ao turno do Líder.
function wm3TurnEnd() {
  const G2 = WM.built.G, full = wm3RoundOn();
  if (full && (STATE.phase === 'leader' || G.office || P.dead || (typeof rebPending === 'function' && rebPending()))) { wm3Close(); roundEnd(); return }
  const r = wtEnd(G2, full); if (full && r.ok) WM.endRound = true;
  if (wm3TurnSeqStart(r.steps)) return;
  wm3TurnSync(); wm3TurnRoundGo();
}
// O jogo no mundo novo: o fim do turno no mapa mundi fecha a rodada.
const wm3RoundOn = () => mapMundoOn() && G.running && !WM.standalone && !!wtGraph();
// Depois da marcha do fim do turno: fecha o mapa e a rodada (endRound leva ao escritório do Líder).
function wm3TurnRoundGo() { if (!WM.endRound) return; WM.endRound = false; wm3Close(); endRound() }
// Pode encerrar as ações / explorar o tile agora? (turno do Comandante, sem encontro e fora do tile; explorar ainda pede uma ação.)
const wm3CanEnd = () => { const w = wtX(); return w.turn === 'commander' && !w.enc && w.inTile === null };
const wm3CanExplore = () => wm3CanEnd() && wtX().left >= WT.enterCost && !!wtActive();
// Reposiciona o boneco no batalhão ativo e refaz marcadores e painel (depois de trocar de batalhão, lutar ou encerrar).
function wm3TurnSync() {
  const b = wtActive(); if (b) { WM.at = wtNode(b.tile); wm3TokenPlace(WM.at) }
  WM.built.token.visible = !!b; wm3TurnActors(); wm3TurnHud(); wm3ArmRing();
}

// ---- menu do tile (clique direito): o que há no tile (batalhões, bandos, caravanas) e as informações de quem for escolhido ----
function wm3Ents(id) {
  const w = wtX(), out = [];
  for (const b of batAt(wtKey(id))) out.push({ k: 'bat', b });
  for (const a of w.actors) if (a.tile === id) out.push({ k: a.kind, a });
  return out;
}
// Facção de um dono de batalhão: nome e cor. Jogador = a dele; bandidos = WORLD3D.banditColor; número = facção (facOf), senão só a cor.
function wm3EntOwner(dono) {
  const css = c => '#' + c.toString(16).padStart(6, '0');
  if (dono === 'bandit') return { name: TXT_WT_BANDITS, css: css(WORLD3D.banditColor) };
  if (dono === 'player') return { name: (STATE.fac && STATE.fac.name) || TXT_WM3_YOURS, css: css(wm3TurnColor('player')) };
  const f = typeof facOf === 'function' ? facOf(dono) : null;
  return { name: f && f.name || String(dono), css: css(wm3TurnColor(dono)) };
}
// Dono de uma caravana = facção da cidade de onde ela saiu (provisório, como os donos do mapa).
function wm3CaravanOwner(a) {
  const n = WM.built.G.nodes[a.route[0]], i = wm3OwnerIdx(n);
  return { name: wm3OwnerName(n) || TXT_WM3_YOURS, css: '#' + wm3FlagColor(n).toString(16).padStart(6, '0'), i };
}
const wm3EntLabel = (e, i) => e.k === 'bat' ? (e.b.dono === 'player' ? txtWtMenuMine(i, batTotal(e.b)) : txtWtMenuBat(wm3EntOwner(e.b.dono).name))
  : e.k === 'bandit' ? txtWtMenuBand(e.a.str) : txtWtMenuCaravan(wm3CaravanOwner(e.a).name);
function wm3EntInfo(e, i) {
  const G2 = WM.built.G, nm = n => wm3TurnTile(n);
  if (e.k === 'bat') {
    const mine = e.b.dono === 'player', ow = wm3EntOwner(e.b.dono);
    return txtWtEntInfo({ titulo: mine ? 'Seu batalhão ' + i + (e.b.id === wtX().act ? ' (ativo)' : '') : 'Batalhão', dono: ow, linhas: [['🪖', 'Soldados', batTotal(e.b)], ['📍', 'Em', nm(wtNode(e.b.tile))]] });
  }
  if (e.k === 'bandit') return txtWtEntInfo({ titulo: 'Bando de bandidos', dono: wm3EntOwner('bandit'), linhas: [['🪖', 'Homens', e.a.str], ['📍', 'Em', nm(e.a.tile)]] });
  const a = e.a, r = a.route, from = a.dir > 0 ? r[0] : r[r.length - 1], to = a.dir > 0 ? r[r.length - 1] : r[0];
  return txtWtEntInfo({ titulo: 'Caravana', dono: wm3CaravanOwner(a), linhas: [['🏙️', 'Saiu de', nm(from)], ['🧭', 'Rumo a', nm(to)], ['📦', 'Levando', TXT_WT_CARGO[a.cargo] || '—']] });
}
// Caixa pequena de escolhas ao lado do mouse. items = [{t: texto, on: função}]; escolher um item executa e fecha a caixa.
function wm3Pop(mx, my, items) {
  wm3TurnHudMake(); let el = WM.pickEl;
  if (!el) {
    el = WM.pickEl = document.createElement('div'); el.id = 'wm3pick';
    el.style.cssText = 'position:fixed;pointer-events:auto;background:rgba(30,21,11,.97);border:2px solid #c9a24a;border-radius:10px;padding:6px;z-index:40;font:13px Georgia,serif;color:#f4ecd8';
    WM.hud.el.appendChild(el);
    el.addEventListener('click', e => { const b = e.target.closest('button'), it = b && WM.popItems[+b.dataset.i]; if (!it) return; wm3EntClose(); it.on() });
  }
  WM.popItems = items;
  el.innerHTML = items.map((it, i) => '<button data-i="' + i + '" style="display:block;width:100%;margin:2px 0;cursor:pointer;padding:6px 10px;border:2px solid #c9a24a;border-radius:8px;'
    + 'background:#3a2810;color:#f4ecd8;font:bold 13px Georgia,serif;text-align:left">' + it.t + '</button>').join('');
  el.style.left = Math.min(mx + 8, innerWidth - 260) + 'px'; el.style.top = Math.min(my + 8, innerHeight - 40 - items.length * 36) + 'px'; el.style.display = 'block';
}
const wm3EntClose = () => { if (WM.pickEl) WM.pickEl.style.display = 'none' };
// Botão direito sem nada selecionado e sem nada a listar: oferece encerrar UMA ação (o jogador não age e os NPCs dão um passo); sem ações sobrando, encerrar o turno.
function wm3EndMenu(mx, my) {
  if (WM.armed || !wm3CanEnd()) return;
  const skip = wtX().left > 0; wm3Pop(mx, my, [{ t: skip ? TXT_WT_SKIP : TXT_WT_END, on: () => wm3TurnClick(skip ? 'skip' : 'end') }]);
}
// Botão direito num tile: lista o que há nele (com um só item, abre direto). Sem nada no tile e sem batalhão selecionado, oferece encerrar as ações.
function wm3EntMenu(mx, my, tile) {
  const L = wm3Ents(tile), enter = tile === WM.at && wm3CanExplore(); wm3EntClose();   // enter: o batalhão ativo está aqui e pode entrar no tile
  if (!L.length) { wm3EndMenu(mx, my); return }
  wm3Select(tile);
  const mine = e => 1 + batList('player').findIndex(x => e.b && x.id === e.b.id);
  if (L.length === 1 && !enter) { wm3EntPick(tile, L[0], mine(L[0])); return }
  const items = L.map(e => ({ t: wm3EntLabel(e, mine(e)), on: () => wm3EntPick(tile, e, mine(e)) }));
  if (enter) items.unshift({ t: TXT_WT_ENTER, on: () => wm3TurnClick('enter') });
  wm3Pop(mx, my, items);
}
// Escolha de uma entrada do tile: batalhão seu = seleciona (o já selecionado abre o menu dele); o resto mostra a informação sob a do tile.
function wm3EntPick(tile, E, i) {
  if (E.k === 'bat' && E.b.dono === 'player') {
    if (E.b.id === wtX().act && WM.armed) { wm3MenuOpen(); return }
    if (E.b.id !== wtX().act && !(wtSwitch(E.b.id) && (wm3TurnSync(), true))) return;
    WM.armed = true; wm3ArmRing();
  }
  wm3Select(tile); WM.hud.info.innerHTML += wm3EntInfo(E, i);
}

// ---------- Entrar e sair do tile (etapa 8.1) ----------
// Entrar (botão direito no tile do batalhão ou menu do batalhão): gasta WT.enterCost ações (wtEnter) e abre o mapa local do tile. Se o tile já é o mapa
// carregado, só fecha o mapa mundi e põe o jogador na estrada de onde veio; senão grava tudo na sessão do navegador e recarrega a página gerando o tile
// novo (mundoGo). Sair é o botão "Sair do tile" da caixa de Ações (wtLeave, grátis): os NPCs andam o que ficaram devendo.
// Fora do jogo do mundo novo (mapa mundi aberto no jogo antigo ou ?cenario=mundo3d) entrar só marca o batalhão como dentro do tile (como era o "Explorar").
function wm3EnterTile() {
  const G2 = WM.built.G; if (!wm3CanExplore()) return;
  const r = wtEnter(G2); if (!r.ok) return;
  if (!wm3RoundOn()) { wm3TurnSync(); return }
  wm3ClockEnter(); wm3Disarm();
  if (r.tile === (WORLD.win && WORLD.win.node)) { wm3Close(); mundoPlaceEntry(r.de); return }
  mundoGo(r.tile, r.de, tileName(G2, G2.nodes[r.tile]));
}
// Troca o mapa local: as marcas do tile atual vão para a ficha dele (collectSave), o tile novo vira STATE.wt.local e o jogador nasce na abertura da
// estrada de `de` (STATE.wt.spawn/entry). Só o Comandante entra: os soldados que o seguiam não vão junto (allies = 0).
function mundoGo(tile, de, nome) {
  const w = wtX(); mundoMarksSave(); w.local = tile; w.spawn = true; w.entry = typeof de === 'number' ? de : -1;
  const d = collectSave(); d.allies = 0;
  try { sessionStorage.setItem('fc_enter', JSON.stringify({ d, nome })) } catch (e) { console.error(e); return }
  mundoLoadShow(nome); setTimeout(() => location.reload(), 30);
}
// Começo da página depois de mundoGo (game.js): devolve {d, nome} guardado na sessão (e o apaga) ou null.
function mundoEnterTake() {
  let j = null; try { j = JSON.parse(sessionStorage.getItem('fc_enter') || 'null'); sessionStorage.removeItem('fc_enter') } catch (e) { j = null }
  return j && j.d ? j : null;
}
// Fim de startGame no jogo do mundo novo: nasce na estrada certa (entrada num tile novo) e, se o turno do Comandante está no mapa mundi (fora de um tile),
// abre o mapa mundi. Devolve true se tomou a tela (sem a pausa de "mundo pronto").
function mundoAfterStart(entering) {
  if (!mapMundoOn()) return false;
  const w = wtX(); if (w.spawn) { w.spawn = false; mundoPlaceEntry(w.entry >= 0 ? w.entry : null) }
  mundoLoadHide();
  const map = STATE.phase === 'commander' && w.turn === 'commander' && w.inTile === null && !!wtGraph();
  if (map || entering) closePanel();   // tira a tela inicial (a pausa de "mundo pronto" não abre)
  if (map) wm3Open();
  return map || !!entering;
}
// Começo do turno do Comandante no mundo novo (finishLeaderTurn, rounds.js): pool de ações (rodada 0 = WT.prepPool) e o mapa mundi aberto.
function mundoCommanderStart() { const G2 = wtGraph(); if (!G2) return; wtCommanderBegin(G2); wm3Open() }
// O mapa mundi do mundo novo, fora de um tile no turno do Comandante, é a tela principal: Esc/J abrem a pausa em vez de voltar ao Campo.
const wm3Locked = () => wm3RoundOn() && STATE.phase === 'commander' && wtX().turn === 'commander' && wtX().inTile === null;

// ---------- relógio único: partes do dia no mapa mundi (macro/worldturn.js wtClockSpend) sobre o relógio do Campo (DN, local/poi.js) ----------
function wm3ClockSet(T) { const dt = T - DN.t; if (!dt) return; DN.days = Math.max(0, DN.days + dt); DN.t = ((T % 1) + 1) % 1 }   // entrar pode voltar umas horas
// Gastou movimento no mapa mundi: a cada WT.clock.mvPerPart passa uma parte do dia.
function wm3ClockSpend(mv) { wm3ClockSet(wtClockSpend(DN.t, mv)) }
// Entrou no tile: o Campo começa no início da parte do dia.
function wm3ClockEnter() { wm3ClockSet(wtEnterTime(DN.t)) }
// Hora com que o mapa mundi desenha a luz (WT.clock.look da parte do dia), perto de WM.time (a luz anda sempre pelo caminho mais curto).
function wm3ClockLook() {
  let t = Math.floor(WM.time) + WT.clock.look[wtBand(DN.t)];
  if (t < WM.time - 0.5) t += 1; else if (t > WM.time + 0.5) t -= 1;
  return t;
}

// ---------- tela de carregamento (entrar num tile): 3 soldados correndo no lugar e o texto embaixo (txtTileLoading) ----------
function mundoLoadShow(nome) {
  let el = document.getElementById('tileload');
  if (!el) {
    const css = document.createElement('style');
    css.textContent = `#tileload { position: fixed; inset: 0; z-index: 200; background: #1e150b; display: flex; flex-direction: column; align-items: center;
        justify-content: center; gap: 28px; color: #f4ecd8; font: 22px Georgia, serif; }
      #tileload .tl-row { display: flex; gap: 34px; }
      #tileload .tl-s { position: relative; width: 26px; height: 64px; animation: tlbob .36s ease-in-out infinite; }
      #tileload .tl-s:nth-child(2) { animation-delay: -.12s; } #tileload .tl-s:nth-child(3) { animation-delay: -.24s; }
      #tileload .tl-s i { position: absolute; display: block; }
      #tileload .tl-h { left: 7px; top: 0; width: 12px; height: 12px; background: #e3b48e; box-shadow: 0 -4px 0 #6a7a5a; }
      #tileload .tl-b { left: 4px; top: 13px; width: 18px; height: 22px; background: #5a6a4a; }
      #tileload .tl-g { left: 18px; top: 16px; width: 14px; height: 4px; background: #3a2a1a; }
      #tileload .tl-l { top: 35px; width: 7px; height: 20px; background: #3b3f55; transform-origin: 50% 0; animation: tlleg .36s linear infinite alternate; }
      #tileload .tl-l1 { left: 5px; } #tileload .tl-l2 { left: 14px; animation-direction: alternate-reverse; }
      @keyframes tlbob { 50% { transform: translateY(-4px); } }
      @keyframes tlleg { from { transform: rotate(32deg); } to { transform: rotate(-32deg); } }`;
    document.head.appendChild(css);
    el = document.createElement('div'); el.id = 'tileload';
    const s = '<div class="tl-s"><i class="tl-h"></i><i class="tl-b"></i><i class="tl-g"></i><i class="tl-l tl-l1"></i><i class="tl-l tl-l2"></i></div>';
    el.innerHTML = '<div class="tl-row">' + s + s + s + '</div><div class="tl-txt"></div>';
    document.body.appendChild(el);
  }
  el.querySelector('.tl-txt').textContent = txtTileLoading(nome || ''); el.style.display = 'flex';
}
function mundoLoadHide() { const el = document.getElementById('tileload'); if (el) el.style.display = 'none' }

// Sair do tile pelo livro/bolsa (botão do canto inferior direito, ui/book.js): fecha o livro, abre o mapa mundi e os NPCs andam o que deviam.
const mundoCanLeave = () => mapMundoOn() && G.running && !!wtGraph() && !WM.open && wtX().turn === 'commander' && wtX().inTile !== null && !wtX().enc
  && STATE.phase === 'commander' && !G.office;
function mundoLeaveTile() {
  const r = wtLeave(wtGraph()); closePanel(); wm3Open();
  if (!wm3TurnSeqStart(r && r.steps)) wm3TurnSync();
}
