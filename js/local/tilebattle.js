'use strict';
// ---------- Batalha no tile real do mundo novo (?mundo=1, etapa 8.3 de docs/features/6_plano-mapa-mundi.md) ----------
// Liga o encontro do mapa mundi (STATE.wt.enc, macro/worldturn.js) aos modos de js/local/battle.js: tbStart lê o encontro e os batalhões do tile, monta a geometria do tile
// carregado (BATTLE.geo: coordenadas no mesmo formato do BATTLE_MOD, que só vale para o mapa de teste de 320) e chama o modo (Choque, Defesa ou Ataque). O fim volta ao macro:
// vitória = tbWin (baixas divididas entre os batalhões, o comandante continua no tile); derrota = tbLose (tela de morte narrativa e wtDeath forma 3, ou forma 2 na batalha
// pequena); sair no meio do Ataque = tbPause ("fugir pausa"). A morte fora de batalha (forma 1) é mundoDie. Números em BATTLE_TILE (battle-modifiers.js); textos em
// worldturn-texts.js / battle-texts.js. Nada daqui roda fora do mundo novo.

// Painel de morte original (index.html): guardado ao primeiro uso para a tela narrativa não estragar as mortes do jogo antigo.
let tbDeadHtml = null;
// Marca de que o tile carregado já teve uma batalha (peças e bandeiras dela ficam no mapa): a próxima entrada recarrega o tile limpo (ui/mundoturno.js).
let tbDirty = false;

// Ponto de terra firme e plana perto de (x,z): espiral de anéis até BATTLE_TILE.landMax. Sem achar, devolve o próprio ponto.
function tbLand(x, z) {
  const K = BATTLE_TILE, m = v => clamp(v, K.edge, W - K.edge); x = m(x); z = m(z);
  const dry = (px, pz) => tH(px, pz) >= SEA + K.dry && Math.abs(tH(px + 4, pz) - tH(px, pz)) < K.slope && Math.abs(tH(px, pz + 4) - tH(px, pz)) < K.slope;
  for (let r = 0; r <= K.landMax; r += K.landStep) {
    for (let k = 0, n = r ? Math.max(8, Math.round(r / 4)) : 1; k < n; k++) {
      const a = k / n * 6.283 + r, px = m(x + Math.cos(a) * r), pz = m(z + Math.sin(a) * r);
      if (dry(px, pz)) return { x: px, z: pz };
    }
  }
  return { x, z };
}
// Onde o comandante chegou: a abertura da estrada do tile de onde veio (de = ponto do grafo), 14 blocos para dentro (como tilePlaceAt); sem abertura, a borda oeste.
function tbEntry(de) {
  const ops = (WORLD.win && WORLD.win.openings) || [], o = ops.find(k => k.para && k.para[0] === de) || ops[0];
  if (!o) return { x: W * 0.15, z: W / 2, ix: 1, iz: 0 };
  return { x: clamp(o.x + o.ix * BATTLE_TILE.enter, 2, W - 3), z: clamp(o.z + o.iz * BATTLE_TILE.enter, 2, W - 3), ix: o.ix, iz: o.iz };
}
// Centro do campo de batalha do Choque: o do tile, mas longe da cidade (para as peças de cobertura e os postos não caírem sobre prédios).
function tbFieldCenter() {
  const C = W / 2, h = WORLD.home, city = h && h.half > 1 ? h : null; if (!city) return tbLand(C, C);
  let best = null;
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * 6.283, p = tbLand(C + Math.cos(a) * BATTLE_TILE.fieldRing, C + Math.sin(a) * BATTLE_TILE.fieldRing), d = Math.hypot(p.x - city.cx, p.z - city.cz);
    if (!best || d > best.d) best = { x: p.x, z: p.z, d };
  }
  return best && best.d > city.half + BATTLE_TILE.cityGap ? best : tbLand(C, C);
}
// Alvo do Ataque e posição defendida na Defesa: o POI principal do tile (macro: win.mainPlan) ou a cidade.
function tbMainPoint() {
  const win = WORLD.win, h = WORLD.home, m = win && win.mainPlan;
  if (h && h.half > 1) return { x: h.cx, z: h.cz, half: h.half };
  return m ? { x: m.x, z: m.z, half: 10 } : Object.assign({ half: 10 }, tbLand(W / 2, W / 2));
}
// Coordenadas do tile para os quatro modos (mesmo formato de BATTLE_MOD). entry = tbEntry; enemyAng = direção de onde vem o inimigo (rad).
function tbGeo(entry) {
  const K = BATTLE_TILE, M = BATTLE_MOD, C = tbFieldCenter(), main = tbMainPoint();
  let ux = C.x - entry.x, uz = C.z - entry.z; const ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;   // do jogador para o centro: os dele atrás, os do inimigo à frente
  const px = -uz, pz = ux, at = (k, s) => tbLand(C.x + ux * k + px * s, C.z + uz * k + pz * s);
  const choque = Object.assign({}, M.choque, { center: { x: C.x, z: C.z }, playerStart: { x: entry.x, z: entry.z },
    playerPosts: K.postSpread.map(s => at(-K.postDist, s)), enemyPosts: K.postSpread.map(s => at(K.postDist, s)) });
  const toEnemy = Math.atan2(main.z - entry.z, main.x - entry.x) * 180 / Math.PI;   // na Defesa o inimigo chega do lado oposto ao da sua entrada
  const defesa = Object.assign({}, M.defesa, { center: { x: main.x, z: main.z }, footprint: Math.max(K.defFoot, main.half * 2),
    postAngles: K.defAngles.map(a => a + toEnemy + 180) });
  const ataque = Object.assign({}, M.ataque, { center: { x: main.x, z: main.z }, start: { x: entry.x, z: entry.z } });
  const pequena = Object.assign({}, M.pequena, { center: { x: main.x, z: main.z }, start: { x: entry.x, z: entry.z } });
  return { choque, defesa, ataque, pequena };
}
// Soldados do encontro: tipos em fila (os BAT.elite primeiros são elites, os outros a reposição; ver battalion.js) e inimigos = força do bando.
function tbForces(enc) {
  const bats = wtForces(enc), flat = [];
  for (const k of BAT.kinds) for (const b of bats) for (let i = 0; i < (b.sold[k] || 0); i++) flat.push(k);
  const el = Math.min(BAT.elite, flat.length);
  return { elites: el, reserve: flat.length - el, kinds: flat.slice(0, el), queue: flat.slice(el), enemies: Math.max(1, enc.n | 0), total: flat.length };
}
// Começa a batalha do encontro pendente no tile carregado (o comandante já está dentro dele: wtBattleBegin). Chamada ao abrir o tile (mundoAfterStart) ou direto
// quando o tile do encontro já é o carregado (wm3Fight). mode = o do layout (WT.layoutMode).
function tbStart() {
  const w = wtX(), e = w.enc, b = e && batGet(e.bat); if (!e || !b || battleOn()) return false;
  const F = tbForces(e), mode = WT.layoutMode[e.layout] || 'choque', geo = tbGeo(tbEntry(typeof b.de === 'number' ? b.de : null));
  Object.assign(geo, F, { real: { enc: e.id || 0, layout: e.layout, mode } });
  tbDirty = true; BATTLE.geo = geo; G.introBook = false; if (G.panel) closePanel();
  ({ choque: battleStartChoque, defesa: battleStartDefesa, ataque: battleStartAtaque, pequena: battleStartPequena })[mode]();
  return true;
}
// O Ataque pode ser deixado no meio ("fugir pausa"); os outros modos não têm fuga.
const tbCanPause = () => !!BATTLE.real && battleOn() && BATTLE.mode === 'ataque';

// Cicatriz do tile (micros de guerra no mapa da próxima vez); as baixas e o dono do tile ficam com o macro (wtBattleEnd).
function tbRecord(res) {
  const key = typeof mundoTileKey === 'function' ? mundoTileKey() : null;
  if (key && typeof tileScarAdd === 'function') tileScarAdd(key, BATTLE.mode, !BATTLE.small);
  batSnapDrop();
}
// Vitória (battleWin): contas no macro. O comandante continua no tile; os soldados que sobraram patrulham onde a batalha terminou.
function tbWin() {
  const c = battleCounts(); BATTLE.real.out = wtBattleEnd(wtGraph(), true, c.p.d);
}
// Tira os soldados, geradores, anéis e inimigos da batalha do mapa (ao sair do tile): o tile só se reabre limpo, recarregando (tbDirty).
function tbEnd() {
  for (const a of ALLIES) { a.alive = false; a.gone = true; if (a.group) scene.remove(a.group) }
  for (const g of BATTLE.gens) for (const o of [g.group, g.ring, g.leashRing]) if (o) scene.remove(o);
  if (BATTLE.area) { for (const e of BATTLE.area.enemies) { e.alive = false; e.gone = true; if (e.group) scene.remove(e.group) } WORLD.areas = WORLD.areas.filter(a => a !== BATTLE.area) }
  battleWarn(false); if (BATTLE.hud) { BATTLE.hud.remove(); BATTLE.hud = null }
  BATTLE.on = false; BATTLE.over = true; BATTLE.real = null; BATTLE.geo = null;
}
// Sair no meio do Ataque: baixas até aqui saem dos batalhões, o bando perde os mortos e o encontro espera no mapa mundi (wtBattlePause).
function tbPause() {
  const c = battleCounts(); wtBattlePause(wtGraph(), c.p.d, c.e.d); tbEnd();
}

// Itens da bolsa perdidos na morte (formas 1 e 2): cada pilha da bolsa tem WT.deathItems de chance de ir; armas, atalhos e equipamento ficam.
function tbLoseItems() {
  const sl = STATE.inv && STATE.inv.slots; if (!sl) return;
  for (const s of sl.slice()) if (s && Math.random() < WT.deathItems) invRemove(s.id, s.n);
}
// Tela de morte narrativa (sem listar o que se perdeu): título, texto e o botão Continuar, que chama onGo.
function tbDeathScreen(titulo, texto, onGo) {
  const el = $('dead'); if (tbDeadHtml === null) tbDeadHtml = el.innerHTML;
  el.innerHTML = '<div class="panel"><h1 style="color:#ff6a6a">' + titulo + '</h1><p>' + texto + '</p><button id="tbgo" class="red">' + TXT_WT_DEATH.botao + '</button></div>';
  $('tbgo').onclick = () => { el.innerHTML = tbDeadHtml; onGo() };
  openPanel('dead');
}
// Volta do comandante ao mapa mundi depois da morte: revive, abre o mapa e segue (outro batalhão assume, o turno acaba ou os NPCs andam o que deviam).
function tbBackToMap(res) {
  P.dead = false; P.hp = P.maxhp; P.armor = 0; P.crouch = false; P.regen = null; G.fireHeld = false; closePanel();
  if (BATTLE.real || BATTLE.on) tbEnd();
  tbDirty = true; wm3Open();
  if (res && res.fim) { wm3TurnEnd(); return }
  if (!wm3TurnSeqStart(res && res.steps)) wm3TurnSync();
}
// Derrota na batalha (battleDefeat): batalha pequena = forma 2 (perde 10 soldados, o batalhão fica); as demais = forma 3 (o batalhão se desfaz). Pequena sem soldados vira a
// forma 3 "atacou sozinho". key = chave do texto (defesaFuga, quando o comandante sai do raio da Defesa).
function tbLose(key) {
  const w = wtX(), e = w.enc, b = e && batGet(e.bat), small = BATTLE.small, form = small ? 2 : 3, alone = small && b && batTotal(b) === 0;
  const txt = alone ? TXT_WT_DEATH.sozinho : small ? TXT_WT_DEATH.poi : TXT_BATTLE_LOSE[key || BATTLE.mode] || TXT_BATTLE_LOSE.nucleo;
  tbDeathScreen(small && !alone ? TXT_WT_DEATH.titulo : TXT_BATTLE_LOSE.titulo, txt, () => {
    const res = wtBattleEnd(wtGraph(), false, 0, form); if (res.form === 2) tbLoseItems();
    tbBackToMap(res);
  });
}
// Morte FORA de batalha (forma 1; game.js die): no tile do mundo novo, no turno do Comandante. Perde ouro, parte da munição e dos itens e uma ação; volta ao mapa
// mundi. Devolve true se tratou (die() não abre a tela antiga).
function mundoDie() {
  if (!mapMundoOn() || !G.running || !wtGraph() || STATE.phase !== 'commander' || wtX().turn !== 'commander' || wtX().inTile === null || G.office) return false;
  const b = wtActive(); if (!b) return false;
  tbDeathScreen(TXT_WT_DEATH.titulo, TXT_WT_DEATH.campo, () => { const res = wtDeath(wtGraph(), b.id, 1); tbLoseItems(); tbBackToMap(res) });
  return true;
}
