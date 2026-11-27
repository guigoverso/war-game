'use strict';
// ---------- POIs viram sítios dentro do tile (etapa 8.5; só com ?mundo=1; docs/features/13_etapa-8-migracao-mecanicas.md, D1 a D4) ----------
// Regras novas: cada POI mantém o SEU dono; o tile é de quem tem o POI PRINCIPAL; POI não tem efeito global nem renda (só o serviço local); baú de recompensa por tipo (fechado
// enquanto bandidos seguram o POI); torre de vigia nova (poiTowerUse) e dízimo do santuário (svcSanctuary). Números em poi-modifiers.js (POI_CHEST, TOWER, SANC_TITHE, TOLL).
// O pedágio e a lista de dungeons achadas ficam na camada macro (macro/toll.js); aqui só a parte que mexe no mapa local.

// ---- estado dos POIs por tile ----
// STATE.pois (dono de cada POI que mudou) e STATE.poiX (limpos, loja, quarto, baús de recompensa...) são chaveados pelo id do POI, e o id se repete de um tile para outro:
// ao sair para outro tile (mundoGo, ui/mundoturno.js) vão para a ficha do tile (mundoPoiStash) e voltam ao entrar de novo (mundoPoiTake, save.js applySave).
const poiFreshX = () => ({ clr: {}, vigil: {}, room: null, done: {}, seen: {} });
const poiXEmpty = X => Object.keys(X).every(k => { const v = X[k]; return v === null || v === undefined || (typeof v === 'object' && !Object.keys(v).length) });
function mundoPoiStash() {
  const key = mundoTileKey(); if (!key) return;
  const X = STATE.poiX || poiFreshX(), P0 = STATE.pois || {};
  if (Object.keys(P0).length || !poiXEmpty(X)) tileSt(key).poi = { pois: P0, x: X };   // sem nada para guardar, não cria a ficha do tile
  STATE.pois = {}; STATE.poiX = poiFreshX();
}
// Devolve (e apaga da ficha) o estado dos POIs do tile que vai abrir, ou null se nunca foi guardado.
function mundoPoiTake() {
  const w = wtX(), key = typeof w.local === 'number' ? wtKey(w.local) : null, t = key && tileStatesAll()[key];
  if (!t || !t.poi) return null;
  const o = t.poi; delete t.poi; return { pois: o.pois || {}, x: o.x || {} };
}

// ---- dono do POI principal = dono do tile ----
// Dono inicial do POI principal deste tile pela ficha do tile (tcOwner, local/tilecompose.js): do jogador, de uma facção ou de bandidos; sem dono, a ponte e a fortaleza
// ficam 'free' (passagem neutra, sem guarnição; cobra TOLL.neutral) e o resto segue o padrão do tile (bandidos). null = vale o padrão.
function mundoMainOwner() {
  const key = mundoTileKey(); if (!key) return null;
  const o = tileOwner(key, null), tema = WORLD.win && WORLD.win.tema;
  if (o === 'player' || o === 0) return 'player';
  if (o === 'bandit') return 'bandit';
  if (typeof o === 'number') return o;
  return TOLL.tiles.includes(tema) ? 'free' : null;
}
// O POI principal mudou de mãos (poiSetOwner, pois.js): o tile passa a ser de quem o tem (a renda e o mapa mundi leem a ficha do tile).
function poiTileSync(p) {
  if (!mapMundoOn() || p.show || !p.main) return;
  const key = mundoTileKey(), o = p.owner; if (!key) return;
  tileOwnerSet(key, o === 'player' ? 'player' : typeof o === 'number' ? o : o === 'bandit' ? 'bandit' : null);
  if (typeof WM !== 'undefined') WM.key = null;   // o mapa mundi 3D refaz as bandeiras na próxima abertura
}

// ---- baú de recompensa ----
// Nasce com o POI (tipos de POI_CHEST), FECHADO enquanto bandidos o seguram (lockedBy = a guarnição) e abre depois da limpeza. Reabastece uma vez por ocupação: se os
// bandidos retomam o POI, o baú volta cheio. Estado em poiX().rew[id] = {n: quantas vezes encheu, opened}. Chamado por poiGarrisonSync (poigame.js).
function poiRewardSpot(p) {
  const A = p.recipe && p.recipe.anchors, h = A && A.house, dr = A && A.door;   // dentro do prédio do POI e o mais longe da porta (num canto)
  if (h) {
    let best = null;
    for (const r of [2.6, 2.0, 1.4]) for (let k = 0; k < 16; k++) {
      const a = k / 16 * 6.2832, x = h.x + Math.cos(a) * r, z = h.z + Math.sin(a) * r, q = freeSpot(x, z, 0.5, 1.8, 0.45);
      if (!q || Math.hypot(q[0] - x, q[1] - z) > 0.4 || Math.abs(tH(q[0], q[1]) - p.y) > 1.2) continue;
      const sc = (dr ? Math.hypot(q[0] - dr.x, q[1] - dr.z) : 0) + r;
      if (!best || sc > best.sc) best = { sc, x: q[0], y: tH(q[0], q[1]), z: q[1] };
    }
    if (best) return best;
  }
  if (p.chestPos) return { x: p.chestPos.x, y: p.chestPos.y, z: p.chestPos.z };
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * 6.2832, d = poiR(p) * (k < 8 ? 0.4 : 0.6), q = freeSpot(p.cx + Math.cos(a) * d, p.cz + Math.sin(a) * d, 0.5, 1.8, 0.45);
    if (q && Math.abs(tH(q[0], q[1]) - p.y) <= 1.5) return { x: q[0], y: tH(q[0], q[1]), z: q[1] };
  }
  return { x: p.cx + 2, y: p.y, z: p.cz + 2 };
}
// O que o baú guarda: {items:[[id,n]], gold, ammo}; quantidade sorteada pela semente do tile, do POI e da ocupação, x POI_CHEST_THEME_MUL no tema de casa.
function poiRewardLoot(p, n) {
  const rng = new RNG((WORLD.seed * 131 + p.id * 17 + n * 7919 + 3) >>> 0), home = WORLD.win && WORLD.win.tema === POI_CHEST_HOME[p.type] ? POI_CHEST_THEME_MUL : 1;
  const out = { items: [], gold: 0, ammo: 0 };
  for (const [id, a, b] of POI_CHEST[p.type]) {
    const q = Math.max(1, Math.round(rng.int(a, b) * home));
    if (id === 'gold') out.gold += q; else if (id === 'ammo') out.ammo += q; else out.items.push([id, q]);
  }
  return out;
}
function poiChestOpenedLook(ch) { ch.opened = true; ch.open = 1; ch.lid.rotation.x = -1.9 }
function poiRewardRemove(p) {
  const ch = p.rewChest; if (!ch) return;
  scene.remove(ch.g); const i = WORLD.chests.indexOf(ch); if (i >= 0) WORLD.chests.splice(i, 1); p.rewChest = null;
}
function poiRewardMake(p, rec) {
  const q = poiRewardSpot(p), L = poiRewardLoot(p, rec.n), ch = addChest(q.x, q.y, q.z, 0, L.gold, p.gar && p.gar.state !== 'cleared' ? p.gar : null);
  ch.fixedLoot = L.items; ch.poiRew = true;   // poiRew: não entra nas marcas do tile (mundoMarksSave); o estado vai em poiX().rew
  ch.onOpen = () => {
    const r = poiX().rew[p.id]; if (r) r.opened = true;
    if (L.ammo) for (let i = 0; i < WEAPONS.length; i++) if (WS.owned[i] && WEAPONS[i].pack) WS.reserve[i] = Math.min(WS.reserve[i] + WEAPONS[i].pack * L.ammo, WEAPONS[i].pack * 8);
  };
  p.rewChest = ch;
}
function poiRewardSync(p) {
  if (!mapMundoOn() || p.show || !POI_CHEST[p.type]) return;
  const X = poiX(), R = X.rew || (X.rew = {}), rec = R[p.id] || (R[p.id] = { n: 0, opened: false }), o = p.owner;
  if (o === 'bandit' && rec.opened) { rec.opened = false; rec.n++; poiRewardRemove(p) }   // os bandidos retomaram: o baú reabastece (uma vez por ocupação)
  if (o !== 'bandit' && o !== 'player' && o !== 'free') return;
  if (rec.opened) { if (p.rewChest && !p.rewChest.opened) poiChestOpenedLook(p.rewChest); return }
  if (!p.rewChest) poiRewardMake(p, rec);
  else if (p.gar && p.gar.state !== 'cleared') p.rewChest.lockedBy = p.gar;
}

// ---- torre de vigia nova (poigame.js, poiVigil chama aqui no mundo novo) ----
// Até TOWER.perRound usos por rodada (somados), no turno do Comandante: cada um acha, com 50% de falha, uma dungeon no tile da torre ou nos vizinhos e a marca no mapa mundi
// só por esta rodada (macro/toll.js wtTowerUse). O relógio do Campo anda POIX.vigilHours, como antes. Não acha baús nem POIs.
function poiTowerUse() {
  const G2 = wtGraph(), id = WORLD.win && WORLD.win.node;
  if (STATE.phase !== 'commander') return toast(TXT_VIGIL_WRONG_PHASE, 2500);
  if (!G2 || typeof id !== 'number') return;
  const r = wtTowerUse(G2, id); if (!r.ok) return toast(TXT_TOWER_LIMIT, 3500);
  { const dt = POIX.vigilHours / 24; DN.t += dt; if (DN.t >= 1) { DN.t -= 1; DN.days++ } }
  if (r.tile < 0) return toast(TXT_VIGIL_NOTHING, 3500);
  if (typeof WM !== 'undefined') WM.key = null;
  toast(txtTowerFound(wtName(G2, r.tile)), 4500);
}

// ---- santuário: dízimo no altar ----
// A cura do altar é menor que a do hospital e o preço NÃO sofre buffs nem debuffs (SANC_TITHE). Cura uma parte da vida que falta, até um teto, por visita.
function sancOffer() {
  const miss = Math.max(0, Math.ceil(P.maxhp - P.hp)), heal = Math.min(miss, SANC_TITHE.max, Math.ceil(miss * SANC_TITHE.part));
  return { miss, heal, cost: heal ? Math.max(1, Math.ceil(heal * SANC_TITHE.perHp)) : 0 };
}
function svcSanctuary(p) {
  svcOpen('⛪ SANTUÁRIO', (txt, body) => {
    const o = sancOffer();
    txt.innerHTML = txtSancAsk(o.miss, o.heal, o.cost) + ' Moedas: <b>◉ ' + P.coins + '</b>';
    const b = UI.button(txtSancPay(o.cost), 'gold', () => {
      const q = sancOffer(); if (!q.heal || !Ledger.spend({ gold: q.cost })) return;
      P.hp = Math.min(P.maxhp, P.hp + q.heal); sfx('coin', 0); sfx('choir', 0); svcRender();
    });
    b.disabled = !o.heal || Ledger.anyDebt() || P.coins < o.cost; body.appendChild(b);
  });
}
