'use strict';
// ---------- Composição do tile (etapa 4E; feature 8, docs/features/8_tiles-e-vilas.md, rodadas 7 e 8) ----------
// Preenche o tile do cenário (?cenario=tile) depois do terreno e da cidade/vila: POI principal (posição por arquétipo, js/macro/tile.js), estradas
// das aberturas, zonas de guerra reservadas, POIs do tema, ambiente (acampamentos, grutas, bandos) e baús. Regra "reservar primeiro, esculpir
// depois": o principal e as estradas vêm antes, depois as zonas de guerra (clareiras vazias), só então o resto, que desvia de tudo isso.
// Tudo atrás de tileComposeOn() (map-modifiers.js; ?compor=0 volta ao tile vazio). Tabelas e folgas: TILE_COMPOSE, TILE_POI_MAP, TILE_PLACE, TILE_WAR.
// Resultado em WORLD.tileCompose (contagens e falhas) e WORLD.tileWar = {zones, pois, battle} (zonas de guerra e POIs de guerra montados).
// Os POIs de guerra desta etapa são de TESTE (TILE_WAR.test); os tipos e a quantidade de verdade são da etapa 10.

const tcInward = o => [o.side === 'W' ? 1 : o.side === 'E' ? -1 : 0, o.side === 'N' ? 1 : o.side === 'S' ? -1 : 0];
// Verdadeiro se (px,pz) está dentro de uma zona de guerra: o terreno de guerra fica sem árvores (genDecor, world.js). O anel só limpa a faixa de fora do POI.
function tileZoneNear(px, pz) {
  const z = WORLD.tileWar && WORLD.tileWar.zones;
  if (!z) return false;
  for (const q of z) { const d = Math.hypot(px - q.x, pz - q.z); if (d < q.r + 3 && d >= (q.rIn || 0) - 3) return true }
  return false;
}
// Dono inicial de um POI do tile: ruínas sem dono; o principal pode vir de ?dono=player|bandit; os outros, de TILE_OWNER.
function tcOwner(type, main) {
  if (type === 'ruins') return 'none';
  const q = new URLSearchParams(location.search).get('dono');
  return main ? (q === 'player' || q === 'bandit' ? q : TILE_OWNER.main) : TILE_OWNER.other;
}
// Mapa de distância (blocos) até a estrada mais próxima e lista de pontos de estrada (de 3 em 3), fora da cidade, para sortear lugares "perto da estrada".
function tcRoadDist(S) {
  const d = new Float32Array(W * W).fill(1e5); S.roadCells = [];
  for (let i = 0; i < W * W; i++) if (T[i] === T_ROAD || T[i] === T_BRIDGE) d[i] = 0;
  S.road = tileChamfer(d);
  for (let z = 4; z < W - 4; z += 3) for (let x = 4; x < W - 4; x += 3) { const i = z * W + x; if (S.road[i] === 0 && (!S.foot || S.foot[i] > 6)) S.roadCells.push([x, z]) }
}

// O lugar (x,z) serve a um POI/área de raio def.r? Devolve a altura do chão (y) ou null. o: {def, gap, cityGap, edge, open, range, big, wet, pred, rule}.
function tcFits(S, type, x, z, o) {
  const P = TILE_PLACE, r = o.def.r;
  if (x < 0 || z < 0 || x >= W || z >= W || Math.min(x, z, W - 1 - x, W - 1 - z) < (o.edge === undefined ? P.edge : o.edge)) return null;
  if (S.foot && S.foot[z * W + x] < r + (o.cityGap === undefined ? P.cityGap : o.cityGap)) return null;
  for (const a of S.win.openings) if (Math.hypot(a.x - x, a.z - z) < (o.open === undefined ? P.openClear + r : o.open)) return null;
  for (const t of S.taken) if (!(o.skipRing && t.ring) && Math.hypot(t.x - x, t.z - z) < t.r + r + (t.zone || o.gap === undefined ? 4 : o.gap)) return null;
  const y = spotOK(x, z, r + (o.big || 0), [], 0, o.range, o.wet || 0);
  if (y === null || (o.pred && !o.pred(x, z)) || (o.rule && !poiRuleOK(type, x, z, o.rule))) return null;
  return y;
}
// Sorteia um lugar para q = {type, def, place, range, big, wet, gap, cityGap, pred, rule}: 'road' perto da estrada, 'far' longe, 'main' colado ao principal (e ao
// anel dele), 'free' em qualquer parte. Duas passadas: folga normal e depois TILE_PLACE.laxGap; a 2ª alarga o alcance da estrada (roadFar) e solta o 'main'. Sem
// estrada por perto o POI "de estrada" (pousada, taverna, entreposto, fazenda) NÃO nasce (fica em `falhas`). Devolve {x,z,y} ou null.
function tcPick(S, q) {
  const P = TILE_PLACE, rng = S.rng, r = q.def.r, tries = P.tries;
  for (let pass = 0; pass < (q.off ? 1 : 2); pass++) for (let t = 0; t < tries; t++) {   // q.off (L1b): POI longe da estrada, ligado por trilha (offNear); uma passada só
    let x, z, a = rng.range(0, 6.2832);
    const place = pass && q.place === 'main' ? 'free' : q.place;   // colado ao principal sem lugar: qualquer um; de estrada: continua perto da estrada (2ª passada alarga o alcance)
    if (place === 'road' && S.roadCells.length) { const c = rng.pick(S.roadCells), nr = q.off ? P.offNear : P.roadNear, k = r + rng.range(nr[0], nr[1]); x = c[0] + Math.cos(a) * k; z = c[1] + Math.sin(a) * k }
    else if (place === 'main' && S.main) { const k = S.main.rOut + r + rng.range(P.mainNear[0], P.mainNear[1]); x = S.main.x + Math.cos(a) * k; z = S.main.z + Math.sin(a) * k }
    else { x = rng.range(P.edge, W - P.edge); z = rng.range(P.edge, W - P.edge) }
    x = Math.round(x); z = Math.round(z);
    if (x < 0 || z < 0 || x >= W || z >= W) continue;
    const dr = S.road ? S.road[z * W + x] : 1e5;
    if (place === 'road' && S.roadCells.length && (q.off ? dr - r < P.offNear[0] || dr - r > P.offNear[1] : dr - r < P.roadNear[0] || dr - r > P.roadNear[1] + (pass ? P.roadFar : 8))) continue;
    if (place === 'far' && S.roadCells.length && dr < P.farRoad) continue;
    const grow = (t > tries * 0.5 ? 4 : 0) + (t > tries * 0.8 ? 4 : 0);
    const o = Object.assign({}, q, { range: q.range + grow, gap: pass ? Math.min(q.gap, P.laxGap) : q.gap, wet: q.wet || 0 });
    if (place === 'main' && pass === 0) o.gap = Math.min(o.gap, P.laxGap);
    const y = tcFits(S, q.type, x, z, o);
    if (y !== null) return { x, z, y };
  }
  return null;
}
// Define o pedido de lugar de um POI de POI_DEFS: raio, desnível aceito, grande?, regra de tipo (poiRuleOK) e folga (POI_GAP).
// L4: com lego ligado o POI de um tipo com receita nasce em um tamanho (size 'M' médio, o padrão, ou 'P' pequeno) e o raio é o da receita (legoRadius).
function tcQuery(type, place, size) {
  size = size || (legoOn() && LEGO_RECIPES[type] ? 'M' : null);
  const def = size ? Object.assign({}, POI_DEFS[type], { r: legoRadius(type, size) }) : POI_DEFS[type];
  return { type, def, place, size, range: POI_RANGE[type] || 6, big: POI_BIG[type] ? 2 : 1, wet: POI_BIG[type] ? 0.15 : 0, gap: size ? TILE_LEGO.poiGap : POI_GAP, rule: place === 'road' ? 'road' : 'interior' };
}
// ---- L1b: frente para a estrada e trilha ----
// O POI do tile ganha a frente virada para a estrada (p.legoFace, 0 a 3) e uma trilha do portão até a estrada: só os tipos de LEGO_FACE_TYPES e, com lego ligado, fazenda/mina/serraria.
// (o tipo de estrada com receita só gira com lego ligado)
const tcFaced = type => LEGO_FACE_TYPES.includes(type) || (LEGO_FACE_RECIPES.includes(type) && legoOn());
const TC_DIR = [[0, 1], [-1, 0], [0, -1], [1, 0]], TC_LETTER = ['S', 'W', 'N', 'E'];   // frente k: sul, oeste, norte, leste (como legoRotToward)
// Estrada mais próxima de (x,z) (pontos de S.roadCells; sem estrada ainda, as aberturas do tile, de onde elas virão); null se não há nenhuma.
function tcNearRoad(S, x, z) {
  const pts = S.roadCells.length ? S.roadCells : S.win.openings.map(o => [o.x, o.z]);
  return pts.length ? pts.reduce((b, c) => Math.hypot(c[0] - x, c[1] - z) < Math.hypot(b[0] - x, b[1] - z) ? c : b) : null;
}
const tcFaceFor = (S, x, z) => { const q = tcNearRoad(S, x, z); return q ? legoRotToward(q[0] - x, q[1] - z) : 0 };
// Obstáculos das trilhas: cidades, POIs e zonas de guerra (menos o anel do principal, que é só uma faixa de passagem).
const tcObst = (S, self) => WORLD.cities.concat(S.taken.filter(t => t !== self && (t.poi || (t.zone && !t.ring && !t.trail))).map(t => ({ cx: t.x, cz: t.z, half: t.r, gates: [] })));
// Plano da trilha de um POI de raio r em (x,z) com a frente k: {goal: [x,z] da estrada, from: portão} ou, se o portão já está a menos de trailGap da estrada, {goal: null}. Devolve null
// se a trilha não é possível (a rota cruza água). Não pinta nada.
function tcTrailPlan(S, x, z, r, k, self) {
  if (!S.roadCells.length) return null;
  const v = TC_DIR[k], gx = x + v[0] * (r + 3), gz = z + v[1] * (r + 3), goal = tcNearRoad(S, gx, gz);
  if (Math.hypot(goal[0] - gx, goal[1] - gz) < TILE_PLACE.trailGap) return { goal: null };
  const a = { cx: x, cz: z, half: r, gates: [] }, b = { cx: goal[0], cz: goal[1], half: -3, gates: [] };
  const tiles = roadTiles(a, b, tcObst(S, self), { water: ROAD_WATER_OLD, dirA: TC_LETTER[k] });
  return tiles.some(t => H[t.z * W + t.x] < SEA) ? null : { goal, from: [gx, gz] };
}
// Abre a trilha do portão do POI p (já construído, com p.legoFace) até a estrada e reserva o caminho contra outros POIs. p.trail = {ok, to, n}. Sem estrada (o principal nasce antes dela) não faz nada.
function tcTrail(S, p) {
  const r = poiR(p), k = p.legoFace, self = S.taken.find(t => t.poi && t.x === p.cx && t.z === p.cz), pl = tcTrailPlan(S, p.cx, p.cz, r, k, self);
  if (!pl) { p.trail = { ok: false }; return }   // sem estrada ou rota por água
  if (!pl.goal) { p.trail = { ok: true, near: true }; return }   // o portão já encosta na estrada
  const a = { cx: p.cx, cz: p.cz, half: r, gates: [] }, b = { cx: pl.goal[0], cz: pl.goal[1], half: -3, gates: [] };
  if (!carveRoad(a, b, tcObst(S, self), { water: ROAD_WATER_OLD, noBridge: true, pinEnds: true, dirA: TC_LETTER[k] })) { p.trail = { ok: false }; return }
  const v = TC_DIR[k];
  for (let d = r; d <= r + 3; d++) for (let w = -1; w <= 1; w++) {   // do portão até onde a trilha começa (r + 3): terra de estrada sobre o chão natural
    const px = p.cx + v[0] * d + (v[0] ? 0 : w), pz = p.cz + v[1] * d + (v[1] ? 0 : w), i = pz * W + px;
    if (T[i] === T_NAT) T[i] = T_ROAD;
  }
  p.trail = { ok: true, to: pl.goal, n: Math.round(Math.hypot(pl.goal[0] - p.cx, pl.goal[1] - p.cz)) };
  for (let t = 0.1; t < 1; t += 0.1) S.taken.push({ x: Math.round(p.cx + (pl.goal[0] - p.cx) * t), z: Math.round(p.cz + (pl.goal[1] - p.cz) * t), r: TILE_PLACE.trailTaken, zone: true, trail: true });
}

// Constrói um POI no lugar (aplaina, constrói, registra). POI de guerra (fortcamp, trincheira...) se adapta ao chão em vez de aplainá-lo (p.adapt, poiBuild).
function tcAdd(S, type, x, z, y, extra) {
  const d = POI_DEFS[type], p = Object.assign({ id: S.ids++, type, cx: x, cz: z, y, biome: B[z * W + x], owner: tcOwner(type, extra && extra.main), tile: true, cityId: 0 }, extra || {});
  const sz = p.legoSize || (legoOn() && LEGO_RECIPES[type] ? 'M' : null); if (sz) { p.legoSize = sz; p.r = legoRadius(type, sz) }   // L4: tamanho e raio da receita
  const r = poiR(p);
  if (d.war) p.adapt = true; else flattenArea(x, z, r, y, extra && extra.main ? TILE_PLACE.mainRamp : POI_BIG[type] ? 4 : 3);
  if (tcFaced(type) && tcNearRoad(S, x, z)) p.legoFace = tcFaceFor(S, x, z);   // a frente olha para a estrada mais próxima (o principal nasce antes das estradas: olha para a abertura mais próxima, de onde elas virão)
  S.taken.push({ x, z, r, poi: true }); poiBuild(p); WORLD.pois.push(p); S.counts[type] = (S.counts[type] || 0) + 1;
  if (p.legoFace !== undefined && !(extra && extra.main)) tcTrail(S, p);   // trilha do portão até a estrada
  return p;
}

// 1) POI principal. Cidade/vila já existem (o lugar saiu de mapTileSite); os outros temas procuram o terreno mais perto do ponto do arquétipo (win.mainPlan).
function tcMain(S) {
  const win = S.win, K = TILE_COMPOSE[win.tema], plan = win.mainPlan, W_ = TILE_WAR;
  if (!K.main) return;
  if (S.city) { S.main = { type: win.tema, x: S.city.cx, z: S.city.cz, r: S.city.half, rOut: S.city.half + W_.ringW, owner: 'player', city: true }; return }
  if (K.main === 'ponte') return;   // a ponte nasce depois das estradas (tcBridge)
  const tipo0 = TILE_MAIN_TYPE[K.main];
  if (!tipo0) return;   // cidade/vila sem cidade (não achou chão): o tile fica sem principal
  for (const type of [tipo0, TILE_MAIN_FALLBACK[tipo0]]) {   // o principal; se não cabe em lugar nenhum, o menor de TILE_MAIN_FALLBACK
    if (!type) break;
    const q = tcQuery(type, 'free'), tx = plan ? plan.x : W >> 1, tz = plan ? plan.z : W >> 1;
    Object.assign(q, { gap: 0, edge: 30, open: TILE_MAIN.openGap - 20, rule: null, range: (POI_RANGE[type] || 9) + 2 });
    for (let d = 0; d <= 130; d += 4) for (let k = 0, n = d ? Math.max(6, Math.round(6.2832 * d / 7)) : 1; k < n; k++) {
      const a = k / n * 6.2832 + d * 0.37, x = Math.round(tx + Math.cos(a) * d), z = Math.round(tz + Math.sin(a) * d);
      const y = tcFits(S, type, x, z, Object.assign({}, q, { range: q.range + (d > 40 ? 3 : 0) + (d > 80 ? 4 : 0) }));
      if (y !== null) { tcSetMain(S, tcAdd(S, type, x, z, y, { main: true })); if (type !== tipo0) S.falhas.push(POI_DEFS[tipo0].n + '→' + POI_DEFS[type].n); return }
    }
  }
  S.falhas.push('principal');
}
function tcSetMain(S, p) { S.main = { type: p.type, x: p.cx, z: p.cz, y: p.y, r: poiR(p), rOut: poiR(p) + TILE_WAR.ringW, owner: p.owner, poi: p } }

// 2) Estradas: cada abertura até o principal (ou até um ponto central, na ponte; ou até a primeira abertura, na passagem). Cidade/vila: já ligadas por tileTrailLinks.
function tcRoads(S) {
  const win = S.win, ops = win.openings;
  if (!ops.length || S.city) return;
  const ends = ops.map(o => { const [ix, iz] = tcInward(o); return { o, x: o.x + ix * 8, z: o.z + iz * 8, ix, iz } });
  const obst = () => WORLD.cities.concat(S.taken.filter(t => t.poi).map(t => ({ cx: t.x, cz: t.z, half: t.r, gates: [] })));
  let hub = null;
  if (S.main && S.main.poi) hub = { cx: S.main.x, cz: S.main.z, half: S.main.r, gates: [] };
  else if (win.tema === 'ponte' && win.mainPlan) hub = { cx: win.mainPlan.x, cz: win.mainPlan.z, half: 6, gates: [] };
  const link = (e, from) => {
    if (carveRoad(from, { cx: e.x, cz: e.z, half: -3, gates: [] }, obst(), { water: ROAD_WATER_OLD, pinEnds: true })) { tileRoadStub(e.x, e.z, -e.ix, -e.iz); e.o.road = true }
  };
  if (hub) for (const e of ends) link(e, hub);
  else for (const e of ends.slice(1)) link(e, { cx: ends[0].x, cz: ends[0].z, half: -3, gates: [] });   // passagem: as aberturas se ligam entre si
  if (!hub) { tileRoadStub(ends[0].x, ends[0].z, -ends[0].ix, -ends[0].iz); ends[0].o.road = true }
}
// Tema ponte: o principal é o pedágio da ponte mais longa que as estradas fizeram; sem ponte (o grafo da etapa 5 é que a cria), vira TILE_BRIDGE_FALLBACK.
function tcBridge(S) {
  if (TILE_COMPOSE[S.win.tema].main !== 'ponte' || S.main) return;
  const cand = (WORLD.bridges || []).slice().sort((p, q) => q.len - p.len);
  for (const br of cand) {
    const sp = bridgeSpots(br).find(q => !S.taken.some(t => Math.hypot(t.x - q.x, t.z - q.z) < t.r + 14));
    if (!sp) continue;
    const p = { id: S.ids++, type: 'bridge', cx: sp.x, cz: sp.z, y: H[sp.z * W + sp.x], biome: B[sp.z * W + sp.x], owner: tcOwner('bridge', true), axis: sp.axis, vs: sp.vs, tile: true, main: true, cityId: 0 };
    S.taken.push({ x: sp.x, z: sp.z, r: POI_DEFS.bridge.r, poi: true }); poiBuild(p); WORLD.pois.push(p); br.toll = p.id; S.counts.bridge = 1; tcSetMain(S, p);
    return;
  }
  const type = TILE_BRIDGE_FALLBACK, plan = S.win.mainPlan, q = tcQuery(type, 'free');
  Object.assign(q, { gap: 0, edge: 30, open: 40, rule: null });
  for (let d = 0; d <= 120; d += 4) for (let k = 0, n = d ? Math.max(6, Math.round(6.2832 * d / 7)) : 1; k < n; k++) {
    const a = k / n * 6.2832, x = Math.round((plan ? plan.x : W >> 1) + Math.cos(a) * d), z = Math.round((plan ? plan.z : W >> 1) + Math.sin(a) * d);
    const y = tcFits(S, type, x, z, Object.assign({}, q, { range: q.range + (d > 40 ? 4 : 0) }));
    if (y !== null) { tcSetMain(S, tcAdd(S, type, x, z, y, { main: true })); S.falhas.push('ponte→' + POI_DEFS[type].n); return }
  }
  S.falhas.push('principal');
}

// 3) Zonas de guerra (reservadas, vazias): uma por abertura (a 40 blocos dela), um anel em volta do principal e, com 2 ou mais aberturas, a praça de encontro
// perto da estrada mais próxima do centro. Clareira plana e sem árvores; entram em S.taken como reservadas (zone) e em WORLD.tileWar.zones.
function tcZoneSpot(S, tx, tz, r, kind) {
  const W_ = TILE_WAR;
  for (let d = 0; d <= 70; d += 3) for (let k = 0, n = d ? Math.max(6, Math.round(6.2832 * d / 6)) : 1; k < n; k++) {
    const a = k / n * 6.2832 + d * 0.9, x = Math.round(tx + Math.cos(a) * d), z = Math.round(tz + Math.sin(a) * d);
    const y = tcFits(S, 'zona', x, z, { def: { r }, skipRing: kind === 'praca', gap: 6, edge: r + 10, open: 0, cityGap: 8, range: W_.siteRange + (d > 30 ? 4 : 0) });
    if (y !== null) return { x, z, y };
  }
  return null;
}
function tcZones(S) {
  const W_ = TILE_WAR, win = S.win;
  const put = (kind, s, r, extra) => { const zn = Object.assign({ id: kind + (extra && extra.dir ? ':' + extra.dir : ''), kind, x: s.x, z: s.z, y: s.y, r }, extra || {}); S.zones.push(zn); S.taken.push({ x: s.x, z: s.z, r, zone: true }); return zn };
  for (const o of win.openings) {
    const [ix, iz] = tcInward(o), s = tcZoneSpot(S, o.x + ix * W_.openDist, o.z + iz * W_.openDist, W_.openR);
    if (s) put('abertura', s, W_.openR, { dir: o.dir }); else S.falhas.push('zona ' + o.dir);
  }
  if (S.main) {   // anel: faixa em volta do principal (não é clareira escolhida: é a área ao redor dele; r = alcance externo, rIn = onde começa)
    const rIn = S.main.r + 4;
    S.zones.push({ id: 'anel', kind: 'anel', x: S.main.x, z: S.main.z, y: S.main.y || H[S.main.z * W + S.main.x], r: S.main.rOut, rIn });
    S.taken.push({ x: S.main.x, z: S.main.z, r: S.main.rOut, zone: true, ring: true });
  }
  if (win.openings.length >= 2 && S.roadCells.length) {   // praça de encontro: estrada fora do anel, a mais perto do centro
    const c0 = W >> 1, out = S.main ? S.main.rOut + W_.plazaR + 6 : 0;
    let cell = null, s = null;
    for (const slack of [12, 0, -10]) {   // 1ª tentativa: longe da borda e da pegada; se a estrada é curta (principal num canto), afrouxa
      const cells = S.roadCells.filter(c => (S.city || !S.main || Math.hypot(c[0] - S.main.x, c[1] - S.main.z) >= out + slack - 12) && Math.min(c[0], c[1], W - 1 - c[0], W - 1 - c[1]) > W_.plazaR + slack
        && (!S.foot || S.foot[c[1] * W + c[0]] > W_.plazaR + slack)).sort((p, q) => Math.hypot(p[0] - c0, p[1] - c0) - Math.hypot(q[0] - c0, q[1] - c0));
      for (const c of cells.slice(0, 6)) { s = tcZoneSpot(S, c[0], c[1], W_.plazaR, 'praca'); if (s) { cell = c; break } }
      if (s) break;
    }
    if (s) { const hx = (T[cell[1] * W + cell[0] - 3] === T_ROAD) + (T[cell[1] * W + cell[0] + 3] === T_ROAD), hz = (T[(cell[1] - 3) * W + cell[0]] === T_ROAD) + (T[(cell[1] + 3) * W + cell[0]] === T_ROAD);
      put('praca', s, W_.plazaR, { axis: hx >= hz ? 'x' : 'z', road: cell }) } else S.falhas.push('praça');   // axis = direção da estrada (a barricada a cruza)
  }
}

// 4) Sorteio de um id da tabela (TILE_POI_MAP): 'vila_ou_descanso' escolhe pelo peso; 'qualquer' pesa o tipo pelo terreno do tile (TILE_ANY_*).
function tcResolve(S, id) {
  let sp = TILE_POI_MAP[id];
  if (sp && sp.lego && legoOn()) sp = Object.assign({}, sp, sp.lego);   // L4: o que muda com lego ligado (outro tipo, tamanho, margem de água)
  if (id === 'qualquer') return { any: true };
  if (sp && sp.pick) { const tot = sp.pick.reduce((s, e) => s + e[1], 0); let r = S.rng.next() * tot; for (const e of sp.pick) { r -= e[1]; if (r < 0) return tcResolve(S, e[0]) } return tcResolve(S, sp.pick[0][0]) }
  return sp ? Object.assign({ id }, sp) : null;
}
function tcAnyType(S) {
  const b = S.win.desc.terreno.biomas, w = TILE_ANY_TYPES.map(t => { let f = 0; for (const k in TILE_ANY_FAVOR) if (TILE_ANY_FAVOR[k].includes(t)) f += b[k] || 0; return [t, 1 + (TILE_ANY_BONUS - 1) * f * 2] });
  let r = S.rng.next() * w.reduce((s, e) => s + e[1], 0);
  for (const e of w) { r -= e[1]; if (r < 0) return e[0] }
  return w[0][0];
}
function tcTheme(S) {
  const K = TILE_COMPOSE[S.win.tema], [mn, mx, opts] = K.theme, n0 = S.rng.int(mn, mx), lg = legoOn(), n = n0 + (lg ? S.rng.int(TILE_LEGO.themeExtra[0], TILE_LEGO.themeExtra[1]) : 0);
  for (let k = 0; k < n; k++) for (let tr = 0; tr < 4; tr++) {   // se a opção sorteada não cabe, tenta outra (até 4 vezes)
    const r = tcResolve(S, S.rng.pick(opts));
    if (!r || r.ambient || (r.caravan && !tileCaravanRoad(S.win))) continue;
    const type = r.any ? tcAnyType(S) : r.type, place = r.any ? TILE_TYPE_PLACE[type] || 'free' : r.place;
    let s = null;
    const size = lg && LEGO_RECIPES[type] ? r.size || (k >= n0 || S.rng.chance(TILE_LEGO.pChance) ? 'P' : 'M') : null;   // L4: os extras e metade dos demais nascem pequenos
    const mk = () => { const q = tcQuery(type, place, size); if (place === 'shore') q.pred = (x, z) => tcShore(x, z, q.def.r); return q };
    if (place === 'road' && TILE_PLACE.offRoadTypes.includes(type) && S.rng.chance(TILE_PLACE.offRoad)) {   // L1b: longe da estrada, só se a trilha for possível
      const q = mk(), rr = q.def.r; q.off = true; q.pred = (x, z) => !!tcTrailPlan(S, x, z, rr, tcFaceFor(S, x, z));
      s = tcPick(S, q); if (s) s.off = true;   // (sem lugar: volta para a beira da estrada, abaixo)
    }
    if (!s) s = tcPick(S, mk());
    if (!s) { if (tr === 3) S.falhas.push(r.id || type); continue }
    const po = tcAdd(S, type, s.x, s.z, s.y, size ? { legoSize: size } : {}); if (s.off) po.offRoad = true; if (r.pend) S.pend.push(r.id);
    break;
  }
}
// Margem de água (vila de pesca): há água (abaixo do nível do mar) entre TILE_LEGO.shore de folga além da borda do POI de raio r, em algum dos 16 rumos, e o chão do POI é seco.
function tcShore(x, z, r) {
  const [a, b] = TILE_LEGO.shore;
  for (let k = 0; k < 16; k++) for (let d = r + a; d <= r + b; d += 3) {
    const px = Math.round(x + Math.cos(k * 0.3927) * d), pz = Math.round(z + Math.sin(k * 0.3927) * d);
    if (px >= 0 && pz >= 0 && px < W && pz < W && H[pz * W + px] < SEA) return true;
  }
  return false;
}
// 4b) Vida (L4, só com lego): micro-POIs do tema (TILE_COMPOSE[tema].vida), só cenário, sem dono nem anexação. Entram em WORLD.micros (poimicro.js) e reservam o lugar em S.taken.
function tcLife(S) {
  WORLD.micros = [];
  const v = TILE_COMPOSE[S.win.tema].vida; if (!v || !legoOn()) return;
  const L = TILE_LEGO, rng = S.rng, n = rng.int(v[0], v[1]);
  for (let k = 0; k < n; k++) for (let tr = 0; tr < 6; tr++) {
    const id = rng.pick(v[2]), m = LEGO_MICRO.list.find(e => e.id === id); if (!m) break;
    const s = tcPick(S, { type: 'micro', def: { r: m.r }, place: TILE_MICRO_PLACE[id] || 'free', range: 5, gap: L.microGap, cityGap: L.microGap, edge: L.microEdge, big: 1 });
    if (!s) { if (tr === 5) S.falhas.push('micro ' + id); continue }
    S.taken.push({ x: s.x, z: s.z, r: m.r });
    const d = { i: WORLD.micros.length, x: s.x, z: s.z, y: s.y, kind: id, r: m.r }; WORLD.micros.push(d); dormBuild(d);
    break;
  }
}
// 5) Ambiente: acampamentos de bandidos (digCamp), grutas (só em montanha: caveOK; sem lugar viram acampamento) e bandos (andam; ver genPacks). 'far' = longe da estrada.
function tcAmbient(S) {
  const K = TILE_COMPOSE[S.win.tema], [mn, mx, opts] = K.ambient, n = S.rng.int(mn, mx), rng = S.rng;
  const AMB = {
    camp: { r: 10, range: 6, tk: 14 }, cave: { r: 11, range: 9, tk: 17, pred: caveOK }, pack: { r: 3, range: 6, tk: 6, gap: 10 }
  };
  const idx = { camp: 0, cave: 0, pack: 0 };
  for (let k = 0; k < n; k++) {
    let r = tcResolve(S, rng.pick(opts)); if (!r || !r.ambient) { if (r && r.type) { const s = tcPick(S, tcQuery(r.type, r.place)); if (s) tcAdd(S, r.type, s.x, s.z, s.y, {}); else S.falhas.push(r.id) } continue }
    let kind = r.ambient;
    for (let tr = 0; tr < 2; tr++) {
      const A = AMB[kind], q = { type: kind, def: { r: A.r }, place: 'far', range: A.range, gap: A.gap === undefined ? AMB_GAP : A.gap, cityGap: AMB_GAP, pred: A.pred, big: 1 };
      const s = tcPick(S, q);
      if (!s) { if (kind === 'cave') { kind = 'camp'; continue } S.falhas.push(kind); break }
      S.taken.push({ x: s.x, z: s.z, r: A.tk });
      if (kind === 'camp') {
        const dg = digCamp(s.x, s.z); s.y = dg.y;
        const c = newArea('camp', 100 + idx.camp++, 'Acampamento de bandidos', s, rng, { rank: rng.int(1, 2), reward: rng.chance(0.25) ? 'hostage' : 'gold', dug: dg.dug });
        buildCampFull(c, rng); WORLD.camps.push(c);
      } else if (kind === 'cave') {
        const c = newArea('cave', 200 + idx.cave++, 'Gruta', s, rng, { rank: 6, owner: 'wild' }); buildCave(c, rng); WORLD.caves.push(c);
      } else {
        const sp = packSpecies(rng, B[s.z * W + s.x]);
        WORLD.packs.push(newArea('pack', 300 + idx.pack++, 'Animais selvagens', s, rng, { rank: 2, owner: 'wild', leash: 50, species: sp, ax: s.x + 0.5, az: s.z + 0.5, tx: s.x, tz: s.z, rt: rng.range(4, 14) }));
      }
      break;
    }
  }
  // baús escondidos (6 a 10, em todo tile)
  for (let k = 0, m = rng.int(TILE_CHESTS[0], TILE_CHESTS[1]); k < m; k++) {
    const s = tcPick(S, { type: 'chest', def: { r: 3 }, place: 'free', range: 4, gap: AMB_GAP, cityGap: AMB_GAP, big: 1 });
    if (!s) { S.falhas.push('baú'); continue }
    S.taken.push({ x: s.x, z: s.z, r: 4 }); buildHideout(s.x, s.z, s.y, rng); S.chests++;
  }
}

// Ponto de entrada (chamado por worldNatureStage, world.js, depois de tileTrailLinks e tileBorderPlan). cities = as cidades do mapa (a do tile ou a âncora vazia).
function tileCompose(cities) {
  const win = WORLD.win, t0 = performance.now(), tema = win.tema;
  const rng = new RNG((WORLD.seed * 977 + (win.ti | 0) * 31 + (win.tj | 0) * 17 + hashStr(tema)) >>> 0);
  const city = cities[0] && cities[0].half > 1 ? cities[0] : null, h0 = H.slice(), tt0 = T.slice();
  WORLD.camps = []; WORLD.caves = []; WORLD.chests = []; WORLD.packs = []; WORLD.pois = []; FIRES.length = 0;
  const S = { win, rng, city, taken: [], counts: {}, falhas: [], pend: [], foot: city ? tileFootDist(cities) : null, road: null, roadCells: [], main: null, ids: 300, zones: [], chests: 0 };
  WORLD.tileWar = { zones: S.zones, pois: [], battle: null }; WORLD.tileS = S;   // (tileS: estado interno, só para depurar)
  tcMain(S); tcRoads(S); tcRoadDist(S); tcBridge(S);
  tcRoadDist(S); tcZones(S);
  tcTheme(S);
  const sn = WORLD.snap;   // o mapa (makeMapCanvas) usa a cópia de antes dos extras: estradas e nivelamento dos POIs entram nela (como em genPOIs)
  if (sn) for (let k = 0; k < W * W; k++) if (H[k] !== h0[k] || T[k] !== tt0[k]) { sn.H[k] = H[k]; sn.T[k] = T[k]; sn.B[k] = B[k] }
  tcAmbient(S); tcLife(S);
  WORLD.areas = cities.concat(WORLD.camps, WORLD.caves, WORLD.packs);
  tileWarAssemble(win.battle);
  poiApply();
  const pois = WORLD.pois.filter(p => !p.war);
  WORLD.tileCompose = {
    tema, arq: win.mainPlan ? win.mainPlan.arq : null, caiu: win.mainPlan ? !!win.mainPlan.caiu : false, principal: S.main ? { type: S.main.type, x: S.main.x, z: S.main.z } : null,
    counts: S.counts, pois: pois.length, camps: WORLD.camps.length, caves: WORLD.caves.length, packs: WORLD.packs.length, chests: S.chests, micros: (WORLD.micros || []).length,
    zones: S.zones.map(z => z.kind + (z.dir ? ':' + z.dir : '')), falhas: S.falhas, pend: S.pend, ms: Math.round(performance.now() - t0), city: !!city
  };
}

// ---------- Marcas no mapa e no minimapa (TILE_MARK, map-modifiers.js) ----------
// Lista [{x, z, main, own}] dos pontos marcados: POIs e cidade do tile; own = 'player' | 'enemy' | null (sem círculo de dono).
function tileMarks() {
  const tc = WORLD.tileCompose, out = []; if (!tc) return out;
  const side = o => o === 'player' ? 'player' : (o === 'bandit' || typeof o === 'number') ? 'enemy' : null;
  for (const c of WORLD.cities) if (c.half > 1) out.push({ x: c.cx, z: c.cz, main: tc.city, own: side(c.owner) });
  for (const p of WORLD.pois) out.push({ x: p.cx, z: p.cz, main: !!p.main, own: side(p.owner) });
  return out;
}
// Desenha os círculos em g; (x,z) -> pixel por f(x,z) = [px, py]; cfg = TILE_MARK.mini ou .big; k = escala.
function tileMarkDraw(g, f, cfg, k) {
  g.save(); g.lineWidth = cfg.w * k;
  for (const m of tileMarks()) {
    const [px, py] = f(m.x, m.z);
    if (m.own) { g.strokeStyle = TILE_MARK[m.own]; g.beginPath(); g.arc(px, py, cfg.own * k, 0, 6.283); g.stroke() }
    if (m.main) { g.strokeStyle = TILE_MARK.main; g.beginPath(); g.arc(px, py, cfg.main * k, 0, 6.283); g.stroke() }
  }
  g.restore();
}

// ---------- Batalha no tile: POIs de guerra montados nas zonas reservadas (rodada 8) ----------
// Desmonta os POIs de guerra montados (wfUnmake, warfront.js) e esvazia a lista.
function tileWarClear() {
  const tw = WORLD.tileWar; if (!tw) return;
  for (const p of tw.pois) wfUnmake(p);
  tw.pois.length = 0; tw.battle = null;
}
// Monta os POIs de guerra de uma batalha (descritor de tileBattle) nas zonas: conquista/defesa = atacante na zona da sua abertura e defensor no anel do principal;
// choque = cada lado na zona da própria abertura e uma barricada na praça (quem já estava no tile, `estacionado`, fica na praça). Chamar de novo com outra batalha
// REPOSICIONA (desmonta e remonta). Devolve a lista [{tipo, zona, dono, lado}] (a mesma de WORLD.tileWar.pois) para a camada macro guardar (4F).
function tileWarAssemble(battle) {
  const tw = WORLD.tileWar; if (!tw) return [];
  tileWarClear();
  if (!battle) { tcWarSave([], null); return [] }
  const Z = tw.zones, byDir = d => Z.find(z => z.kind === 'abertura' && z.dir === d), ring = Z.find(z => z.kind === 'anel'), plaza = Z.find(z => z.kind === 'praca');
  tw.battle = battle;   // (tcRingAngle lê a batalha)
  const sides = TILE_WAR.sides[battle.tipo] || ['player', 'bandit'], mainOwner = tcMainOwner();
  const own = s => s === 'main' ? mainOwner : s;
  const jobs = [];
  if (battle.tipo === 'choque') {
    let za = byDir(battle.entradaAtacante), zd = byDir(battle.entradaDefensor);
    if (battle.estacionado === 'atacante' && plaza) za = plaza;
    if (battle.estacionado === 'defensor' && plaza) zd = plaza;
    if (za) jobs.push({ zone: za, lado: 'atacante', dono: own(sides[0]) });
    if (zd) jobs.push({ zone: zd, lado: 'defensor', dono: own(sides[1]) });
    if (plaza && za !== plaza && zd !== plaza) jobs.push({ zone: plaza, lado: 'praca', dono: own(sides[1]) });
  } else {
    const za = byDir(battle.entradaAtacante);
    if (za) jobs.push({ zone: za, lado: 'atacante', dono: own(sides[0]) });
    if (ring) jobs.push({ zone: ring, lado: 'defensor', dono: own(sides[1]) });
  }
  const used = new Set(WORLD.pois.map(p => p.id)); let id = 700;
  for (const j of jobs) {
    while (used.has(id)) id++; used.add(id);
    const type = TILE_WAR.test[j.zone.kind], z = j.zone;
    let x = z.x, zz = z.z, y = z.y;
    if (z.kind === 'anel') { const a = tcRingAngle(z); x = Math.round(z.x + Math.cos(a) * (z.rIn + (z.r - z.rIn) * 0.5)); zz = Math.round(z.z + Math.sin(a) * (z.rIn + (z.r - z.rIn) * 0.5)); y = Math.max(SEA + 1, H[zz * W + x]) }
    const p = { id, type, cx: x, cz: zz, y, biome: B[zz * W + x], owner: j.dono, adapt: true, tile: true, war: true, zona: z.id, lado: j.lado, axis: z.axis || 'x' };
    poiBuild(p); WORLD.pois.push(p); poiPaint(p);
    if (typeof poiGarrisonSync === 'function') poiGarrisonSync(p);
    tw.pois.push(p);
  }
  const lista = tw.pois.map(p => ({ tipo: p.type, zona: p.zona, dono: p.owner, lado: p.lado }));
  tcWarSave(lista, battle);
  return lista;
}
// Guarda a lista de POIs de guerra no estado do tile (4F, macro/tilestate.js); janela livre (sem ti/tj) não guarda.
function tcWarSave(lista, battle) {
  const w = WORLD.win; if (w && w.tile && w.ti >= 0) tileWarSet(tileKey(w.ti, w.tj), lista, battle);
}
// Ângulo (do centro do principal) do lado do anel para o POI do defensor: o lado que olha para a abertura do atacante (onde a investida chega); sem batalha, para o centro do tile.
function tcRingAngle(z) {
  const b = WORLD.tileWar && WORLD.tileWar.battle, win = WORLD.win, o = b && win.openings.find(q => q.dir === b.entradaAtacante);
  return o ? Math.atan2(o.z - z.z, o.x - z.x) : Math.atan2((W >> 1) - z.z, (W >> 1) - z.x);
}
function tcMainOwner() {
  const m = WORLD.pois.find(p => p.main);
  return m ? m.owner : WORLD.home ? WORLD.home.owner : 'bandit';
}
