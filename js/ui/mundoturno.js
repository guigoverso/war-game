'use strict';
// ---------- Turno no mapa mundi 3D (etapa 7): painel de ações/batalhões, atores no diorama e encontro (js/ui/mundo3d.js + js/macro/worldturn.js) ----------
// Só interface: as regras estão em worldturn.js (STATE.wt). Atores = bandidos (vermelho) e caravanas (carroça); outros batalhões seus = bandeira da facção.
// Sem toast: recusas aparecem como nota no painel; o resumo do turno vai para o livro (rdNow) em wtEnd.
const wm3TurnState = { grp: null, note: '' };
const wm3TurnTile = n => tileName(WM.built.G, WM.built.G.nodes[n]);

// Ao abrir o mapa: garante o mundo (atores), começa o turno do Comandante se ainda era o do Líder (no jogo, só fora do escritório) e põe o boneco no batalhão ativo.
function wm3TurnOpen(B) {
  const w = wtX(); wtInit(B.G); WM.speed = +localStorage.getItem('wm3speed') || WT.speedDefault;
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
// WM.seq = {steps:[{from,node,edge,npc:[{id,from,to,e}]}], i, tw}. Chamado por wm3Go (e por "Encerrar turno", que só tem passos de NPC).
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
function wm3TurnNote(why) { wm3TurnState.note = TXT_WT_WHY[why] || ''; wm3TurnHud() }
// Depois de a marcha acabar: marcadores, painel e, se houver encontro, o painel dele.
function wm3TurnAfter() { wm3TurnActors(); wm3TurnHud() }

function wm3TurnHudMake() {
  if (WM.turnEl) return;
  const css = document.createElement('style');
  css.textContent = `#wm3turn { position: fixed; left: 16px; bottom: 14px; width: 290px; pointer-events: auto; background: rgba(30,21,11,.96); border: 2px solid #c9a24a;
      border-radius: 12px; color: #f4ecd8; font: 14px Georgia, serif; padding: 10px 12px; display: none; }
    #wm3turn b { color: #fff; } #wm3turn .wm3-sub { color: #d8c8a0; margin: 4px 0; font-size: 13px; }
    #wm3turn button { display: block; width: 100%; margin-top: 6px; text-align: left; pointer-events: auto; cursor: pointer; padding: 7px 10px; border: 2px solid #c9a24a;
      border-radius: 10px; font: bold 13px Georgia, serif; background: #3a2810; color: #f4ecd8; }
    #wm3turn button:hover { background: #5a3d1a; } #wm3turn button.on { background: #6a4a1c; } #wm3turn .wm3-warn { color: #ff9a8a; margin-top: 6px; font-size: 13px; }`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'wm3turn'; WM.hud.el.appendChild(el); WM.turnEl = el;
  el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) wm3TurnClick(b.dataset.a, +b.dataset.i) });
}
function wm3TurnHud() {
  wm3TurnHudMake();
  const el = WM.turnEl, w = wtX(), B = WM.built, G2 = B.G; let h = '<button data-a="speed">' + txtWtSpeed(WM.speed) + '</button>';
  if (w.turn === 'leader') {
    h += '<div class="wm3-sub">' + TXT_WT_LEADER + '</div>';
    for (const c of G2.nodes) if (wtMine(G2, c.id)) h += '<button data-a="create" data-i="' + c.id + '">' + txtWtCreate(wm3TurnTile(c.id), batList('player').length ? WT.newSoldiers * WT.soldierPrice : 0) + '</button>';
    h += '<button data-a="begin">' + TXT_WT_BEGIN + '</button>';
  } else {
    h += '<div>' + txtWtActions(w.left, w.pool) + '</div>';
    batList('player').forEach((b, i) => { h += '<button data-a="sw" data-i="' + b.id + '"' + (b.id === w.act ? ' class="on"' : '') + '>' + txtWtBat(i + 1, wm3TurnTile(wtNode(b.tile)), batTotal(b), b.id === w.act) + '</button>' });
    if (w.enc) {
      h += '<div class="wm3-warn">⚔ ' + txtWtEncTitle(w.enc.layout, w.enc.n) + '</div><button data-a="auto">' + TXT_WT_ENC_AUTO + '</button>';
    } else if (w.inTile !== null) h += '<div class="wm3-sub">' + txtWtInTile(wm3TurnTile(w.inTile)) + '</div><button data-a="leave">' + TXT_WT_LEAVE + '</button>';
    else h += (w.left > 0 ? '<button data-a="explore">' + TXT_WT_EXPLORE + '</button>' : '') + '<button data-a="end">' + TXT_WT_END + '</button>';
  }
  if (wm3TurnState.note) h += '<div class="wm3-warn">' + wm3TurnState.note + '</div>';
  el.innerHTML = h; el.style.display = 'block';
}
function wm3TurnClick(a, i) {
  const w = wtX(), G2 = WM.built.G; wm3TurnState.note = '';
  if (a === 'speed') { const L = WT.speeds, n = L[(L.indexOf(WM.speed) + 1) % L.length]; WM.speed = n; localStorage.setItem('wm3speed', n); wm3TurnHud(); return }
  if (WM.walk || WM.seq) return;
  if (a === 'begin') { wtCommanderBegin(G2) }
  else if (a === 'create') { const r = wtCreate(G2, i); wm3TurnState.note = r.ok ? '' : TXT_WT_WHY_CREATE[r.why] || '' }
  else if (a === 'sw') { if (wtSwitch(i)) { WM.at = wtNode(wtActive().tile); wm3TokenPlace(WM.at); WM.walk = null } }
  else if (a === 'explore') { const r = wtExplore(G2); wm3TurnState.note = r.ok ? '' : TXT_WT_WHY[r.why] || '' }
  else if (a === 'leave') { const r = wtLeave(G2); if (wm3TurnSeqStart(r && r.steps)) return }
  else if (a === 'auto') { const r = wtAutoBattle(G2); if (r && r.fim) wtEnd(G2); else if (r && wm3TurnSeqStart(r.steps)) return }
  else if (a === 'end') { const r = wtEnd(G2); if (wm3TurnSeqStart(r.steps)) return }
  wm3TurnSync();
}
// Reposiciona o boneco no batalhão ativo e refaz marcadores e painel (depois de trocar de batalhão, lutar ou encerrar).
function wm3TurnSync() {
  const b = wtActive(); if (b) { WM.at = wtNode(b.tile); wm3TokenPlace(WM.at) }
  WM.built.token.visible = !!b; wm3TurnActors(); wm3TurnHud();
}

// ---- menu do tile (clique esquerdo): o que há no tile (batalhões, bandos, caravanas) e as informações de quem for escolhido ----
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
function wm3EntMenu(mx, my, tile) {
  const L = wm3Ents(tile); wm3EntClose(); if (!L.length) return;
  wm3TurnHudMake(); let el = WM.pickEl;
  if (!el) {
    el = WM.pickEl = document.createElement('div'); el.id = 'wm3pick';
    el.style.cssText = 'position:fixed;pointer-events:auto;background:rgba(30,21,11,.97);border:2px solid #c9a24a;border-radius:10px;padding:6px;z-index:40;font:13px Georgia,serif;color:#f4ecd8';
    WM.hud.el.appendChild(el);
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const t = WM.pickTile, E = wm3Ents(t)[+b.dataset.i];
      if (!E) return; if (E.k === 'bat' && E.b.dono === 'player' && E.b.id !== wtX().act) wtSwitch(E.b.id) && wm3TurnSync();
      WM.hud.info.innerHTML = wm3Info(t) + wm3EntInfo(E, 1 + batList('player').findIndex(x => E.b && x.id === E.b.id)); WM.hud.info.style.display = '';
      wm3EntMenu(+el.style.left.slice(0, -2) - 8, +el.style.top.slice(0, -2) - 8, t, +b.dataset.i);
    });
  }
  WM.pickTile = tile; const sel = arguments[3];
  el.innerHTML = L.map((e, i) => '<button data-i="' + i + '" style="display:block;width:100%;margin:2px 0;cursor:pointer;padding:6px 10px;border:2px solid #c9a24a;border-radius:8px;background:'
    + (i === sel ? '#6a4a1c' : '#3a2810') + ';color:#f4ecd8;font:bold 13px Georgia,serif;text-align:left">' + wm3EntLabel(e, 1 + batList('player').findIndex(x => e.b && x.id === e.b.id)) + '</button>').join('');
  el.style.left = Math.min(mx + 8, innerWidth - 260) + 'px'; el.style.top = Math.min(my + 8, innerHeight - 40 - L.length * 36) + 'px'; el.style.display = 'block';
}
const wm3EntClose = () => { if (WM.pickEl) WM.pickEl.style.display = 'none' };
