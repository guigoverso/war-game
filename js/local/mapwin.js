'use strict';
// ---------- Mapa local como janela do campo do mundo (etapa 3 do plano do mapa mundi; docs/features/6_plano-mapa-mundi.md) ----------
// Só com ?mundo=1 ou ?cenario=tile (mapWorldOn, js/modifiers/map-modifiers.js). Fluxo: worldInit (world.js) chama mapWindowPick e guarda a janela em
// WORLD.win; o relevo e os biomas saem do campo (reliefField/reliefFieldBiomes, chamadas por reliefTerrain/reliefBiomes); no começo da etapa de natureza
// as TRILHAS viram estrada até as aberturas da borda (tileTrailLinks); a borda é fechada por árvores e parede de colisão, exceto nas aberturas
// (tileBorderPlan antes dos POIs e das árvores, tileBorderBuild depois). O campo e a grade de tiles ficam em js/macro/worldfield.js.
// WORLD.win = {F, cx, cz, size, ox, oz, tile, ti, tj, kind, openings:[{dir,to,x,z,ix,iz,side,road}], neighbors:[{dir,i,j}], band}.

// Escolhe a janela deste mapa (ou null se o mundo novo está desligado). ?ti=&tj= escolhe o tile; ?tipo=cidade usa a janela de cidade; ?forma= o formato.
function mapWindowPick(seed, dominant) {
  if (!mapWorldOn()) return null;
  const q = new URLSearchParams(location.search), F = wfCreate(seed, { dominant, format: q.get('forma') });
  if (mapMundoOn()) return mapMundoWindow(F, q);
  if (!mapTileOn()) {   // ?mundo=1: janela do tamanho do mapa atual (704), onde há mais terra perto do ideal; sem grade de tiles, borda toda fechada
    const c = wfPickWindow(F, W);
    return wfWindow(F, c.x, c.z, W, { tile: false, openings: [], neighbors: [] });
  }
  const size = mapTileSize();
  if (q.has('wx') && q.has('wz')) {   // ?wx=&wz=: janela livre centrada num ponto do mundo (sem grade nem trilhas), para comparar terrenos que se sobrepõem
    const free = wfWindow(F, +q.get('wx'), +q.get('wz'), size, { tile: true, free: true, ti: -1, tj: -1, kind: q.get('tipo') === 'cidade' ? 'cidade' : 'natureza', neighbors: [], openings: [] });
    free.tema = tileThemeOk(q.get('tema')) ? q.get('tema') : 'passagem'; free.empty = tileEmptyOn(free.tema); free.cityKind = tileCityKind(free.tema); free.bare = tileBare(); free.battle = null;
    mapTilePlan(free);
    free.desc = tileDescribe(F, free, { tema: free.tema, principal: free.mainPlan });
    return free;
  }
  const t = wfPickTile(F, size, q.has('ti') ? +q.get('ti') : NaN, q.has('tj') ? +q.get('tj') : NaN), n = wfNode(F, t.i, t.j);
  const win = wfWindow(F, n.x, n.z, size, { tile: true, ti: t.i, tj: t.j, kind: q.get('tipo') === 'cidade' ? 'cidade' : 'natureza' });
  win.neighbors = wfTrails(F, t.i, t.j);
  win.openings = wfOpenings(F, win, t.i, t.j);
  mapTileDescribe(win, q);
  return win;
}
// Jogo no mundo novo (?mundo=1, etapa 8.1): o grafo vem do save (STATE.wg) ou é gerado (wtGraphLoad); o mapa local é o tile STATE.wt.local (partida
// nova = a cidade inicial do grafo). Janela centrada no ponto do tile, aberturas = arestas de terra do grafo (wgOpenings), tema = o do grafo.
function mapMundoWindow(F, q) {
  const G = wtGraphLoad(F), w = wtX(), id = typeof w.local === 'number' && G.nodes[w.local] ? w.local : (G.inicio || G.nodes.find(n => !n.mar)).id;
  const n = G.nodes[id], size = TILE_SIZE; w.local = id;
  const win = wfWindow(F, n.x, n.z, size, { tile: true, ti: -1, tj: -1, kind: 'natureza', node: id, neighbors: [] });
  win.openings = wgOpenings(G, F, id, size).filter(o => o.terra).map(o => Object.assign(o, { to: o.para }));
  win.tema = tileThemeOk(n.tema) ? n.tema : 'passagem'; win.empty = tileEmptyOn(win.tema); win.cityKind = tileCityKind(win.tema); win.bare = tileBare();
  win.battle = null; mapTilePlan(win);
  win.desc = tileDescribe(F, win, { tema: win.tema, principal: win.mainPlan });
  return win;
}
// Tema (?tema=; sem ele, sorteio pela semente com ?temas=% de tiles temáticos), batalha (?batalha=&entrada=...) e descritor do tile (js/macro/tile.js).
// Guarda win.tema, win.battle e win.desc; win.empty = tile vazio (4A: só terreno e borda; ?cidade=1 mantém a cidade central da etapa 3).
function mapTileDescribe(win, q) {
  const F = win.F, tema = tileThemeOk(q.get('tema')) ? q.get('tema') : tileThemeFor(F.seed, win.ti, win.tj, q.get('temas'));
  win.tema = tema; win.empty = tileEmptyOn(tema); win.cityKind = tileCityKind(tema); win.bare = tileBare();
  win.battle = tileBattle(win.openings, q.get('batalha'), q.get('entrada'), q.get('entrada2'), q.get('estac'));
  mapTilePlan(win);
  win.desc = tileDescribe(F, win, { tema, batalha: win.battle, principal: win.mainPlan });
}
// Forma e meia caixa da cidade enorme/vila do tile, sorteadas com as MESMAS retiradas do RNG da criação da cidade (worldCitiesStage, world.js, que chama esta função):
// o lugar do principal (tileMainPlan) precisa saber o tamanho antes de a cidade existir. kind = 'enorme' | 'vila' (outro = null); i = índice da cidade (0).
function mapTileCityDims(seed, size, kind, i) {
  if (kind !== 'enorme' && kind !== 'vila') return null;
  const hr = new RNG((seed * 37 + i * 101 + 13) >>> 0); for (let k = 0; k < 4; k++) hr.next();
  const shape = kind === 'enorme' ? cityHugeShape(hr) : cityVillageShape(hr);
  return { shape, half: kind === 'enorme' ? cityHugeHalf(hr, size, shape) : cityVillageHalf(hr, size) };
}
// Posição do POI principal do tile por arquétipo (macro/tile.js tileMainPlan); cidade e vila entram com a meia caixa. Guarda win.mainPlan (null na passagem).
function mapTilePlan(win) {
  const dims = mapTileCityDims(win.F.seed, win.size, win.cityKind, 0);
  return win.mainPlan = tileMainPlan(win.F, win, win.tema, { half: dims ? dims.half : 0 });
}

// Relevo da janela: altura de cada bloco vem direto do campo (substitui reliefTerrain). Rios são vales do próprio campo.
function reliefField(P) {
  const { F, ox, oz } = P.win, demo = new URLSearchParams(location.search).get('relevo');
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) H[z * W + x] = wfHeight(F, ox + x, oz + z);
  if (demo && P.win.tile) reliefDemo(demo);
}
// Relevo de demonstração (?relevo=plano|colinas|lago|rio|costa), para ver como a cidade enorme se adapta a terrenos conhecidos: troca a altura do campo
// por terra suave (plano ~±2 blocos, colinas ~±9) e, conforme o nome, um lago, um rio serpenteando ou o mar na borda leste. Só no cenário de tile.
function reliefDemo(kind) {
  const n = new Noise(WORLD.seed + 4242), amp = kind === 'colinas' ? 18 : 5, base = SEA + (kind === 'colinas' ? 12 : 7);
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    let h = base + Math.round(amp * (n.fbm(x / 80 + 7, z / 80 + 3, 3) - 0.5));
    if (kind === 'lago') { const d = Math.hypot(x - W * 0.66, z - W * 0.4) / 58; if (d < 1.15) h = Math.min(h, SEA - 2 + Math.round(Math.max(0, d - 0.9) * 40)) }
    else if (kind === 'rio') { const d = Math.abs(z - (W * 0.5 + 46 * Math.sin(x / 63) + 16 * Math.sin(x / 23 + 1))); if (d < 7) h = Math.min(h, SEA - 2) ; else if (d < 12) h = Math.min(h, SEA + 2) }
    else if (kind === 'costa') { const e = x - (W * 0.80 + 24 * Math.sin(z / 51) + 10 * Math.sin(z / 19)); if (e > 0) h = Math.min(h, SEA + 1 - Math.min(8, Math.round(e / 4))) }
    H[z * W + x] = h;
  }
}
// Biomas da janela (substitui reliefBiomes): do campo, sobre a altura final (depois de aplainar cidades e estradas).
function reliefFieldBiomes(P) {
  const { F, ox, oz } = P.win;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) { const i = z * W + x; B[i] = wfBiome(F, ox + x, oz + z, H[i]) }
  WORLD.rockH = SEA + (F.dominant === 'mountain' ? 10 : 17);
}

// Lugar da cidade do tile: o centro da janela se for terra; senão o candidato mais perto do centro (cand = {x,z,b,rough}).
function mapTileSite(cand) {
  const win = WORLD.win, pl = win && win.mainPlan && (win.cityKind === 'enorme' || win.cityKind === 'vila') ? win.mainPlan : null;   // 4E: o arquétipo desloca a cidade
  if (pl && H[pl.z * W + pl.x] >= SEA + 1) return { x: pl.x, z: pl.z, b: B[pl.z * W + pl.x] };
  const c = W >> 1;
  if (H[c * W + c] >= SEA + 1) return { x: c, z: c, b: B[c * W + c] };
  let best = null, bd = 1e9;
  for (const k of cand) { const d = Math.hypot(k.x - c, k.z - c); if (d < bd) { bd = d; best = k } }
  return best;
}

// Trilhas -> estrada: cada abertura da borda vira uma estrada até um portão aberto da cidade do tile (a mais próxima do centro). O ponto de chegada fica
// 8 blocos para dentro (o A* de roadTiles não chega à última fileira) e um trecho reto liga esse ponto à borda. Abertura sem estrada possível (água no
// caminho, sem portão aberto) fica como trilha natural: a borda continua aberta ali.
function tileTrailLinks(cities) {
  const win = WORLD.win; if (!win || win.empty || !win.openings.length || !cities.length) return;
  const c = WORLD.home || cities[0], dirs = [['E', 1, 0], ['W', -1, 0], ['S', 0, 1], ['N', 0, -1]];
  for (const o of win.openings) {
    const inx = o.side === 'W' ? 1 : o.side === 'E' ? -1 : 0, inz = o.side === 'N' ? 1 : o.side === 'S' ? -1 : 0;
    const ex = o.x + inx * 8, ez = o.z + inz * 8, vx = ex - c.cx, vz = ez - c.cz, vl = Math.hypot(vx, vz) || 1;
    const pref = dirs.map(d => [d[0], (d[1] * vx + d[2] * vz) / vl]).sort((p, q) => q[1] - p[1]).find(p => !c.gland || c.gland[p[0]]);
    if (!pref) continue;
    const d = pref[0], dup = c.gates.some(g => g.dir === d);
    if (!carveRoad(c, { cx: ex, cz: ez, half: -3, gates: [] }, cities, { water: ROAD_WATER_OLD, dirA: d, pinEnds: true })) { c.gates.pop(); continue }   // sem noBridge: se um rio atravessa o caminho, a estrada ganha ponte (custo alto da água: contorna quando dá)
    if (dup) c.gates.pop();   // o portão já existia (outra trilha usa o mesmo): não duplica
    const E = c.gedge ? c.gedge[d] : c.half;
    for (let k = 1; k <= 4; k++) for (let w = -1; w <= 1; w++) {   // trecho do portão até a rua (igual a reserveGateLinks, js/reserve.js)
      const lx = d === 'E' ? E + k : d === 'W' ? -E - k : w, lz = d === 'S' ? E + k : d === 'N' ? -E - k : w;
      if (getT(c.cx + lx, c.cz + lz) === T_NAT) setTL(c, lx, lz, T_ROAD);
    }
    tileRoadStub(ex, ez, -inx, -inz);   // do ponto de chegada até a borda
    o.road = true;
  }
}
// Estrada reta de 3 blocos de largura saindo de (x0,z0) na direção (dx,dz) até a borda do mapa; a altura segue o chão com degraus de no máximo 1.
function tileRoadStub(x0, z0, dx, dz) {
  let h = Math.max(SEA + 1, H[z0 * W + x0]);
  for (let k = 1; ; k++) {
    const x = x0 + dx * k, z = z0 + dz * k;
    if (x < 1 || z < 1 || x >= W - 1 || z >= W - 1) break;
    h = clamp(Math.max(SEA + 1, H[z * W + x]), h - 1, h + 1);
    for (let w = -1; w <= 1; w++) {
      const px = x + (dz ? w : 0), pz = z + (dx ? w : 0);
      if (px < 1 || pz < 1 || px >= W - 1 || pz >= W - 1) continue;
      const i = pz * W + px;
      if (T[i] === T_NAT) { H[i] = h; T[i] = T_ROAD }
    }
  }
}

// Teste de capacidade (?pois=max, TILE_POI_TEST): enche o que sobrou do tile com POIs de todos os tipos grandes e pequenos, em rodízio e sem regras de posição, só para contar
// quantos cabem. Lugares testados do mais perto da cidade para o mais longe (empacota o anel primeiro). Guarda WORLD.tileFill = {total, counts, ms}.
// ?gap=N troca a folga entre POIs só neste teste (30 = a do jogo normal).
function tileFillGap() { const g = new URLSearchParams(location.search).get('gap'); return g === null ? {} : { poiGap: +g } }
function tileFillPois(cities) {
  const t0 = performance.now(), K = Object.assign({}, TILE_POI_TEST, tileFillGap()), rng = new RNG((WORLD.seed * 977 + 31) >>> 0), placed = [], counts = {}, dist = tileFootDist(cities);
  const grid = [];
  for (let z = 20; z < W - 20; z += K.step) for (let x = 20; x < W - 20; x += K.step) grid.push([x, z, dist[z * W + x] + rng.range(0, 6)]);
  grid.sort((a, b) => a[2] - b[2]);
  let types = K.types.filter(t => POI_DEFS[t]).sort((a, b) => POI_DEFS[b].r - POI_DEFS[a].r), id = 300;
  const find = type => {
    const d = POI_DEFS[type], big = POI_BIG[type] ? 2 : 1;
    for (const [x, z] of grid) {
      if (dist[z * W + x] < d.r + K.cityGap || placed.some(q => Math.hypot(q.x - x, q.z - z) < q.r + d.r + K.poiGap)) continue;
      const y = spotOK(x, z, d.r + big, [], 0, K.range, POI_BIG[type] ? 0.15 : 0);
      if (y !== null) return { x, z, y };
    }
    return null;
  };
  while (types.length) for (const type of types.slice()) {
    const s = find(type), d = POI_DEFS[type];
    if (!s) { types = types.filter(t => t !== type); continue }
    const p = { id: id++, type, cx: s.x, cz: s.z, y: s.y, biome: B[s.z * W + s.x], owner: 'bandit' };
    p.owner = poiInitOwner(p, rng); flattenArea(s.x, s.z, d.r, s.y, POI_BIG[type] ? 4 : 3); poiBuild(p);
    WORLD.pois.push(p); placed.push({ x: s.x, z: s.z, r: d.r }); counts[type] = (counts[type] || 0) + 1;
  }
  poiApply();
  WORLD.tileFill = { total: placed.length, counts, ms: Math.round(performance.now() - t0) };
}
// Distância (blocos, chanfro) de cada bloco do mapa até a pegada da cidade mais próxima; 0 dentro dela. Sem pegada, a caixa da cidade.
function tileFootDist(cities) {
  const d = new Float32Array(W * W).fill(1e5);
  for (const c of cities) { const Hc = c.half, N = 2 * Hc + 1;
    for (let z = -Hc; z <= Hc; z++) for (let x = -Hc; x <= Hc; x++) { const wx = c.cx + x, wz = c.cz + z;
      if (wx >= 0 && wz >= 0 && wx < W && wz < W && (!c.foot || c.foot[(z + Hc) * N + x + Hc])) d[wz * W + wx] = 0 } }
  return tileChamfer(d);
}
// Distância de chanfro (duas passadas) a partir das células com 0 em d (Float32Array W*W, o resto 1e5); devolve o próprio d. Usada por tileFootDist e pela 4E (estradas).
function tileChamfer(d) {
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) { const i = z * W + x; let v = d[i];
    if (x > 0) v = Math.min(v, d[i - 1] + 1);
    if (z > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414) }
    d[i] = v }
  for (let z = W - 1; z >= 0; z--) for (let x = W - 1; x >= 0; x--) { const i = z * W + x; let v = d[i];
    if (x < W - 1) v = Math.min(v, d[i + 1] + 1);
    if (z < W - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414) }
    d[i] = v }
  return d;
}

// Borda fechada: WORLD.win.band marca cada célula como 0 (livre), 1 (faixa de árvores) ou 2 (parede de colisão, dentro da faixa). A largura da faixa varia com
// ruído (borda orgânica). As aberturas das trilhas ficam livres (WORLD_FIELD.gapHalf de meia largura, gapDepth de profundidade).
function tileBorderPlan() {
  const win = WORLD.win; if (!win) return;
  const wn = new Noise(WORLD.seed + 419), band = win.band = new Uint8Array(W * W), WF = WORLD_FIELD, maxW = WF.borderBase + WF.borderVar;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) {
    const d = Math.min(x, z, W - 1 - x, W - 1 - z);
    if (d >= maxW) continue;
    const w = WF.borderBase + WF.borderVar * clamp((wn.fbm(x / 14 + 10, z / 14 + 3, 2) - 0.3) / 0.4, 0, 1);
    if (d >= w) continue;
    let gap = false;
    for (const o of win.openings) {
      const depth = o.side === 'W' ? x : o.side === 'E' ? W - 1 - x : o.side === 'N' ? z : W - 1 - z, along = Math.abs((o.side === 'W' || o.side === 'E') ? z - o.z : x - o.x);
      if (depth <= WF.gapDepth && along <= WF.gapHalf) { gap = true; break }
    }
    if (!gap) band[z * W + x] = d < w * WF.borderSolid ? 2 : 1;
  }
}
// Depois da natureza: árvores densas na faixa (por bioma) e parede de colisão invisível nas células 2 (também sobre a água: o jogador não sai do mapa).
function tileBorderBuild() {
  const win = WORLD.win; if (!win || !win.band) return;
  const band = win.band, rng = new RNG((WORLD.seed * 131 + 29) >>> 0);
  for (let z = 1; z < W - 1; z += 2) for (let x = 1; x < W - 1; x += 2) {
    const px = x + rng.int(0, 1), pz = z + rng.int(0, 1), i = pz * W + px;
    if (!band[i] || T[i] !== T_NAT || H[i] < SEA + 1) continue;
    const b = B[i], h = H[i];
    if (b === BIO_DESERT) { if (rng.chance(0.5)) addTree(px, pz, h, 'cactus', rng); else addRock(px, pz, h, rng, false, b); continue }
    if (b === BIO_SNOW || b === BIO_ROCK) { if (rng.chance(0.8)) addTree(px, pz, h, 'spruce', rng); else addRock(px, pz, h, rng, b === BIO_SNOW, b); continue }
    addTree(px, pz, h, rng.pick(['oak', 'oak', 'oak', 'birch', 'spruce', 'bigoak']), rng);
  }
  const y0 = SEA - 8, y1 = SEA + 120;   // parede: células 2, em tiras horizontais (uma caixa por trecho contínuo)
  for (let z = 0; z < W; z++) for (let x = 0; x < W;) {
    if (band[z * W + x] !== 2) { x++; continue }
    let e = x; while (e + 1 < W && band[z * W + e + 1] === 2) e++;
    Col.add({ x0: x, y0, z0: z, x1: e + 1, y1, z1: z + 1 });
    x = e + 1;
  }
}

// ---------- Cenário ?cenario=tile ----------
// Mesmo estado inicial do cenário de batalha (criativo, comandante, rodada 1), sem inimigos: serve para olhar o terreno, a borda e as trilhas do tile.
function tileScenario() {
  G.introBook = false; STATE.phase = 'commander'; STATE.round = 1; P.coins = 20000;
  facSetIdentity({ name: 'Teste de tile' });
  STATE.rd.lvl = tileCityLevel(); STATE.rd.actions = maxActions();
}
// Nível da cidade do jogador no cenário (decide o muro: CITY_WALL_BY_LEVEL). Cidade enorme: nível 5 (muralha de pedra) para o formato aparecer;
// ?muro=pedra|palicada|cerca|nenhum força o tipo e ?nivel=N força o nível. Os outros temas: 1.
function tileCityLevel() {
  const q = new URLSearchParams(location.search), m = { pedra: 5, palicada: 4, cerca: 2, nenhum: 1 }[q.get('muro')];
  if (q.get('nivel')) return Math.max(1, Math.min(LVL.cityMax, +q.get('nivel') || 1));
  return m || (mapTileOn() && q.get('tema') === 'cidade' ? 5 : 1);
}
// Depois do mundo pronto: ?pos=borda começa dentro da primeira abertura, olhando para fora (para conferir a continuidade com o vizinho).
function tileAfter() {
  const win = WORLD.win, o = win && win.openings[0], q = new URLSearchParams(location.search);
  if (win && win.empty) tilePlaceFree(o && q.get('pos') !== 'centro' ? o : null);
  else if (q.get('pos') === 'borda' && o) tilePlaceAt(o);
  tileHugeGarrison();
  tileRecruitScenario();
}
// ?recrutar=sua|neutra|inimiga (feature 12, passo 11): muda o dono da vila (ou da cidade) do tile e põe o jogador diante do alistamento/Quartel, para testar 4B-19.
function tileRecruitScenario() {
  const m = new URLSearchParams(location.search).get('recrutar'), c = WORLD.cities.find(k => k.vila) || WORLD.home;
  if (!m || !c) return;
  c.owner = m === 'sua' ? 'player' : m === 'neutra' ? 'neutral' : 'enemy'; c.ofid = m === 'inimiga' ? 1 : null;
  const b = c.recruit || c.barracks || { x: c.cx, z: c.cz }, f = freeSpot(b.x + 2, b.z + 2, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y; P.yaw = Math.atan2(b.x - P.x, b.z - P.z);
}
// Cidade enorme do jogador (4B): CITY_HUGE.soldiers soldados seus patrulham a cidade, saindo do quartel (nas cidades de outra facção o populateCities põe os inimigos).
function tileHugeGarrison() {
  const c = WORLD.home; if (!c || !cityBig(c)) return;
  const b = c.barracks || { x: c.cx, z: c.cz };
  for (let i = 0, n = cityGuardCount(c, new RNG(WORLD.seed * 13 + c.id * 101 + 9)); i < n; i++) spawnAlly(b.x + (i % 5 - 2) * 1.5, b.z + 2 + Math.floor(i / 5) * 1.5, c);
}
// Tile vazio: o jogador começa na abertura (olhando para dentro do tile) ou, sem aberturas, no centro.
function tilePlaceFree(o) {
  if (o) { tilePlaceAt(o); return }
  const f = freeSpot(W >> 1, W >> 1, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y; P.pitch = -0.05;
}
function tilePlaceAt(o) {
  const x = clamp(o.x + o.ix * 14, 2, W - 3), z = clamp(o.z + o.iz * 14, 2, W - 3), f = freeSpot(x, z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(o.ix, o.iz); P.pitch = -0.05;
}
// Endereço do tile (i,j) mantendo os outros parâmetros da URL.
function tileUrl(i, j) {
  const q = new URLSearchParams(location.search); q.set('ti', i); q.set('tj', j); q.delete('pos'); q.delete('tema');
  return '?' + q.toString();
}
// Endereço do mesmo tile com outro tema (?tema=).
function tileThemeUrl(t) { const q = new URLSearchParams(location.search); q.set('tema', t); q.delete('pos'); return '?' + q.toString() }
// Endereço do mesmo tile com outro valor de um parâmetro (?forma_cidade=, ?relevo=, ?muro=); valor vazio tira o parâmetro.
function tileParamUrl(k, v) { const q = new URLSearchParams(location.search); if (v) q.set(k, v); else q.delete(k); q.delete('pos'); return '?' + q.toString() }
// Linha de atalhos (rótulo + um link por opção; a opção atual fica destacada) do painel da cidade enorme.
function tileParamRow(label, key, names, cur) {
  return '<p class="ldsm"><b>' + label + '</b> ' + Object.keys(names).map(o => '<a style="margin:2px;padding:2px 6px;border:1px solid ' + (o === cur ? '#e0c040' : '#888')
    + ';border-radius:4px;display:inline-block;color:inherit" href="' + tileParamUrl(key, o === 'natural' ? '' : o) + '">' + names[o] + '</a>').join('') + '</p>';
}
// Endereço da janela livre deslocada (dx,dz) blocos do centro atual (continuidade: o terreno comum às duas janelas tem de ser igual).
function tileShiftUrl(dx, dz) {
  const win = WORLD.win, q = new URLSearchParams(location.search);
  q.set('wx', win.cx + dx); q.set('wz', win.cz + dz); q.delete('ti'); q.delete('tj'); q.delete('pos');
  return '?' + q.toString();
}
// Mapa do mundo de teste (imagem): o campo inteiro com a grade de tiles, as trilhas e o tile atual. Calculado uma vez por mundo.
function tileWorldImage() {
  const win = WORLD.win; if (win.mapUrl) return win.mapUrl;
  const F = win.F, st = 12, n = Math.ceil(F.S / st), cv = document.createElement('canvas'); cv.width = cv.height = n;
  const g = cv.getContext('2d'), img = g.createImageData(n, n), pal = [0x68b043, 0x468f30, 0xe0cf90, 0xf3f7fb, 0x8c8c8c];
  for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
    const h = wfHeight(F, x * st, z * st), c = h < SEA ? (h >= SEA - 1 ? 0x4a86d8 : 0x2f63b8) : pal[wfBiome(F, x * st, z * st, h)], o = (z * n + x) * 4;
    img.data[o] = c >> 16 & 255; img.data[o + 1] = c >> 8 & 255; img.data[o + 2] = c & 255; img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  g.strokeStyle = '#d8c08a'; g.lineWidth = 1;
  for (let j = 0; j < F.N; j++) for (let i = 0; i < F.N; i++) for (const t of wfTrails(F, i, j)) {
    if (t.i < i || (t.i === i && t.j < j)) continue;
    g.beginPath(); wfTrailPath(F, i, j, t.i, t.j).forEach((p, k) => k ? g.lineTo(p.x / st, p.z / st) : g.moveTo(p.x / st, p.z / st)); g.stroke();
  }
  g.fillStyle = '#fff';
  for (let j = 0; j < F.N; j++) for (let i = 0; i < F.N; i++) { const q = wfNode(F, i, j); g.fillRect(q.x / st - 1, q.z / st - 1, 3, 3) }
  g.strokeStyle = '#e03030'; g.lineWidth = 2; g.strokeRect(win.ox / st, win.oz / st, win.size / st, win.size / st);
  return win.mapUrl = cv.toDataURL();
}
// Painel do cenário (aba Facções da pausa, via scenarioHtml): dados do tile, mapa do mundo e atalhos para os vizinhos.
function tileScenarioHtml() {
  const win = WORLD.win; if (!win) return '';
  const links = win.neighbors.map(t => '<a class="alt" style="margin:2px;padding:3px 8px;border:1px solid #888;border-radius:4px;display:inline-block;color:inherit" href="' + tileUrl(t.i, t.j) + '">' + txtTileDirLabel(t) + '</a>').join('');
  const shift = [[-128, 0, '←'], [128, 0, '→'], [0, -128, '↑'], [0, 128, '↓']].map(k => '<a style="margin:2px;padding:3px 8px;border:1px solid #888;border-radius:4px;display:inline-block;color:inherit" href="' + tileShiftUrl(k[0], k[1]) + '">' + k[2] + '</a>').join('');
  const themes = TILE_THEMES.map(t => '<a style="margin:2px;padding:2px 6px;border:1px solid ' + (t === win.tema ? '#e0c040' : '#888') + ';border-radius:4px;display:inline-block;color:inherit" href="'
    + tileThemeUrl(t) + '">' + TXT_TILE_THEME[t] + '</a>').join('');
  return '<p class="ptitle">' + TXT_TILE_TITLE + '</p><p class="ldsm" style="margin:2px 0 4px">' + txtTileInfo(win) + '</p>'
    + '<img src="' + tileWorldImage() + '" style="width:252px;image-rendering:pixelated;border:1px solid #555"><p class="ldsm">' + TXT_TILE_MAPHELP + '</p>'
    + '<p class="ldsm"><b>' + TXT_TILE_NEIGHBORS + '</b> ' + (links || TXT_TILE_NONEIGHBOR) + '</p>'
    + '<p class="ldsm"><b>' + TXT_TILE_THEMES + '</b> ' + themes + '</p>'
    + tileComposeHtml(win)
    + (win.cityKind === 'enorme' || win.cityKind === 'vila' ? tileHugePanel(win) : '')
    + '<p class="ldsm"><b>' + TXT_TILE_SHIFT + '</b> ' + shift + '</p>'
    + '<button class="alt" data-tile="border">' + TXT_TILE_GOBORDER + '</button><br><button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
// Painel da composição (4E): resumo de WORLD.tileCompose, POIs de guerra montados e atalhos de batalha (?batalha=conquista|defesa|choque; entradas = as duas primeiras aberturas).
function tileComposeHtml(win) {
  const tc = WORLD.tileCompose; if (!tc) return '';
  return '<p class="ldsm" style="margin:2px 0 4px">' + txtTileCompose(tc) + '</p>' + (WORLD.tileWar && WORLD.tileWar.battle ? '<p class="ldsm">' + txtTileWar(WORLD.tileWar) + '</p>' : '') + tileBattleRow(win);
}
function tileBattleRow(win) {
  const q0 = new URLSearchParams(location.search), cur = q0.get('batalha') || '', ops = win.openings;
  if (!ops.length) return '';
  return '<p class="ldsm"><b>' + TXT_TILE_BATTLE + '</b> ' + Object.keys(TXT_TILE_BATTLE_NAME).map(k => {
    const q = new URLSearchParams(location.search); q.delete('pos');
    if (k) { q.set('batalha', k); q.set('entrada', ops[0].dir); if (k === 'choque' && ops[1]) q.set('entrada2', ops[1].dir); else q.delete('entrada2') } else { q.delete('batalha'); q.delete('entrada'); q.delete('entrada2') }
    return '<a style="margin:2px;padding:2px 6px;border:1px solid ' + (k === cur ? '#e0c040' : '#888') + ';border-radius:4px;display:inline-block;color:inherit" href="?' + q.toString() + '">' + TXT_TILE_BATTLE_NAME[k] + '</a>';
  }).join('') + '</p>';
}
// Painel extra da cidade enorme (4B): resumo e atalhos de formato, relevo e muro, para ver as cidades em vários cenários sem mexer na URL.
function tileHugePanel(win) {
  const q = new URLSearchParams(location.search), c = WORLD.home;
  return '<p class="ldsm" style="margin:2px 0 4px">' + (c && cityBig(c) ? txtTileCityInfo(c) : '') + (WORLD.tileFill ? '<br>' + txtTileFill(WORLD.tileFill) : '') + '</p>'
    + tileParamRow(TXT_TILE_SHAPES, 'forma_cidade', TXT_TILE_SHAPE_NAME, c ? c.shape : '')
    + tileParamRow(TXT_TILE_RELIEFS, 'relevo', TXT_TILE_RELIEF_NAME, q.get('relevo') || 'natural')
    + tileParamRow(TXT_TILE_WALLS, 'muro', TXT_TILE_WALL_NAME, q.get('muro') || 'pedra');
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-tile]'); if (!b || !WORLD.win) return;
  const o = WORLD.win.openings[0];
  if (b.dataset.tile === 'border' && o) { tilePlaceAt(o); closePanel(); }
});

// ---------- Jogo no mundo novo (?mundo=1, etapa 8.1): marcas do tile e entrada pela estrada ----------
// O terreno vem da semente e o jogador não mexe em blocos: o que muda num tile são as MARCAS (baús abertos, acampamentos limpos ou sumidos), guardadas
// como diferenças na ficha do tile (STATE.tiles['w'+id].dif.loot / .acamp, macro/tilestate.js). collectSave grava as do tile carregado; applySave aplica.
const mundoTileKey = () => (WORLD.win && typeof WORLD.win.node === 'number' ? wtKey(WORLD.win.node) : null);
function mundoMarksSave() {
  const key = mundoTileKey(); if (!key) return;
  for (const ch of WORLD.chests || []) if (ch.opened) tileDiffSet(key, 'loot', chestKey(ch), 1);
  for (const c of WORLD.camps || []) {
    const m = { gone: !!c.gone, goneAt: c.goneAt, completed: !!c.completed, cleared: c.state === 'cleared', cageOpened: !!(c.cage && c.cage.opened) };
    const on = m.gone || m.completed || m.cleared || m.cageOpened;
    if (on || tileStHas(key)) tileDiffSet(key, 'acamp', c.id, on ? m : null);   // sem marca: não cria a ficha do tile
  }
}
// Marcas do tile carregado no formato do save antigo ({chests:[chave], camps:[{id, ...}]}), para applySave reaproveitar a mesma aplicação.
function mundoMarks() {
  const key = mundoTileKey(); if (!key) return { chests: [], camps: [] };
  const ac = tileDiffs(key, 'acamp');
  return { chests: Object.keys(tileDiffs(key, 'loot')), camps: Object.keys(ac).map(id => Object.assign({ id: +id }, ac[id])) };
}
// Põe o jogador na abertura da estrada que vem do tile `de` (chegou pelo sul, começa no sul), uns blocos para dentro e de frente para o tile.
// Sem abertura para esse vizinho: a cidade do tile (se houver) ou a primeira abertura. Devolve true se usou uma abertura.
function mundoPlaceEntry(de) {
  const win = WORLD.win, ops = (win && win.openings) || [], o = ops.find(k => k.para && k.para[0] === de);
  if (!o && WORLD.home && WORLD.home.half > 1) { placePlayerHome(); return false }
  const e = o || ops[0]; if (!e) { tilePlaceFree(null); return false }
  tilePlaceAt(e); P.yaw += Math.PI; return true;   // tilePlaceAt olha para fora; aqui o jogador olha para dentro do tile
}
