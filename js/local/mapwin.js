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
  if (!mapTileOn()) {   // ?mundo=1: janela do tamanho do mapa atual (704), onde há mais terra perto do ideal; sem grade de tiles, borda toda fechada
    const c = wfPickWindow(F, W);
    return wfWindow(F, c.x, c.z, W, { tile: false, openings: [], neighbors: [] });
  }
  const size = mapTileSize();
  if (q.has('wx') && q.has('wz')) {   // ?wx=&wz=: janela livre centrada num ponto do mundo (sem grade nem trilhas), para comparar terrenos que se sobrepõem
    const free = wfWindow(F, +q.get('wx'), +q.get('wz'), size, { tile: true, free: true, ti: -1, tj: -1, kind: q.get('tipo') === 'cidade' ? 'cidade' : 'natureza', neighbors: [], openings: [] });
    return free;
  }
  const t = wfPickTile(F, size, q.has('ti') ? +q.get('ti') : NaN, q.has('tj') ? +q.get('tj') : NaN), n = wfNode(F, t.i, t.j);
  const win = wfWindow(F, n.x, n.z, size, { tile: true, ti: t.i, tj: t.j, kind: q.get('tipo') === 'cidade' ? 'cidade' : 'natureza' });
  win.neighbors = wfTrails(F, t.i, t.j);
  win.openings = wfOpenings(F, win, t.i, t.j);
  for (const o of win.openings) o.side = o.x <= 2 ? 'W' : o.x >= size - 3 ? 'E' : o.z <= 2 ? 'N' : 'S';
  return win;
}

// Relevo da janela: altura de cada bloco vem direto do campo (substitui reliefTerrain). Rios são vales do próprio campo.
function reliefField(P) {
  const { F, ox, oz } = P.win;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) H[z * W + x] = wfHeight(F, ox + x, oz + z);
}
// Biomas da janela (substitui reliefBiomes): do campo, sobre a altura final (depois de aplainar cidades e estradas).
function reliefFieldBiomes(P) {
  const { F, ox, oz } = P.win;
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) { const i = z * W + x; B[i] = wfBiome(F, ox + x, oz + z, H[i]) }
  WORLD.rockH = SEA + (F.dominant === 'mountain' ? 10 : 17);
}

// Lugar da cidade do tile: o centro da janela se for terra; senão o candidato mais perto do centro (cand = {x,z,b,rough}).
function mapTileSite(cand) {
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
  const win = WORLD.win; if (!win || !win.openings.length || !cities.length) return;
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
  STATE.rd.lvl = 1; STATE.rd.actions = maxActions();
}
// Depois do mundo pronto: ?pos=borda começa dentro da primeira abertura, olhando para fora (para conferir a continuidade com o vizinho).
function tileAfter() {
  const win = WORLD.win, o = win && win.openings[0];
  if (new URLSearchParams(location.search).get('pos') === 'borda' && o) tilePlaceAt(o);
}
function tilePlaceAt(o) {
  const x = clamp(o.x + o.ix * 14, 2, W - 3), z = clamp(o.z + o.iz * 14, 2, W - 3), f = freeSpot(x, z, 0.5, 1.8, 0.45);
  P.x = f[0]; P.z = f[1]; P.y = tH(P.x, P.z) + 0.1; P.vx = P.vz = P.vy = 0; P.camY = P.y;
  P.yaw = Math.atan2(o.ix, o.iz); P.pitch = -0.05;
}
// Endereço do tile (i,j) mantendo os outros parâmetros da URL.
function tileUrl(i, j) {
  const q = new URLSearchParams(location.search); q.set('ti', i); q.set('tj', j); q.delete('pos');
  return '?' + q.toString();
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
  for (let j = 0; j < WORLD_FIELD.tiles; j++) for (let i = 0; i < WORLD_FIELD.tiles; i++) for (const t of wfTrails(F, i, j)) {
    if (t.i < i || (t.i === i && t.j < j)) continue;
    g.beginPath(); wfTrailPath(F, i, j, t.i, t.j).forEach((p, k) => k ? g.lineTo(p.x / st, p.z / st) : g.moveTo(p.x / st, p.z / st)); g.stroke();
  }
  g.fillStyle = '#fff';
  for (let j = 0; j < WORLD_FIELD.tiles; j++) for (let i = 0; i < WORLD_FIELD.tiles; i++) { const q = wfNode(F, i, j); g.fillRect(q.x / st - 1, q.z / st - 1, 3, 3) }
  g.strokeStyle = '#e03030'; g.lineWidth = 2; g.strokeRect(win.ox / st, win.oz / st, win.size / st, win.size / st);
  return win.mapUrl = cv.toDataURL();
}
// Painel do cenário (aba Facções da pausa, via scenarioHtml): dados do tile, mapa do mundo e atalhos para os vizinhos.
function tileScenarioHtml() {
  const win = WORLD.win; if (!win) return '';
  const links = win.neighbors.map(t => '<a class="alt" style="margin:2px;padding:3px 8px;border:1px solid #888;border-radius:4px;display:inline-block;color:inherit" href="' + tileUrl(t.i, t.j) + '">' + txtTileDirLabel(t) + '</a>').join('');
  const shift = [[-128, 0, '←'], [128, 0, '→'], [0, -128, '↑'], [0, 128, '↓']].map(k => '<a style="margin:2px;padding:3px 8px;border:1px solid #888;border-radius:4px;display:inline-block;color:inherit" href="' + tileShiftUrl(k[0], k[1]) + '">' + k[2] + '</a>').join('');
  return '<p class="ptitle">' + TXT_TILE_TITLE + '</p><p class="ldsm" style="margin:2px 0 4px">' + txtTileInfo(win) + '</p>'
    + '<img src="' + tileWorldImage() + '" style="width:252px;image-rendering:pixelated;border:1px solid #555"><p class="ldsm">' + TXT_TILE_MAPHELP + '</p>'
    + '<p class="ldsm"><b>' + TXT_TILE_NEIGHBORS + '</b> ' + (links || TXT_TILE_NONEIGHBOR) + '</p>'
    + '<p class="ldsm"><b>' + TXT_TILE_SHIFT + '</b> ' + shift + '</p>'
    + '<button class="alt" data-tile="border">' + TXT_TILE_GOBORDER + '</button><br><button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-tile]'); if (!b || !WORLD.win) return;
  const o = WORLD.win.openings[0];
  if (b.dataset.tile === 'border' && o) { tilePlaceAt(o); closePanel(); }
});
