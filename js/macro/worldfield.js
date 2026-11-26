'use strict';
// ---------- Campo do mundo (etapa 3 do plano do mapa mundi; docs/features/5_mapa-mundi.md, "o mundo é um campo, o tile é uma janela") ----------
// Camada macro: NÃO usa Three.js nem DOM (roda em Node: tests/macro/campo.js). O mundo é uma FUNÇÃO de posição (x, z em blocos de mundo):
// terra/mar (wfLand), altura (wfHeight), bioma (wfBiome) e rios (vales dentro de wfHeight). O mapa local é uma JANELA dessa função
// (wfWindow): dois tiles vizinhos que se sobrepõem veem exatamente o mesmo terreno, então costa, baía, ilha e rio casam sem costura.
// A grade de tiles (wfNode/wfTrails) é PROVISÓRIA: faz o papel do grafo da etapa 5, só para testar aberturas e continuidade.
// Números em WORLD_FIELD (js/modifiers/map-modifiers.js). Nada aqui lê ?parametros: quem chama decide (js/local/mapwin.js).
const WF_BIO = { PLAINS: 0, FOREST: 1, DESERT: 2, SNOW: 3, ROCK: 4 };   // mesmos valores de BIO_* (js/local/world.js)
const WF_NAMES = { continentes: 'Continentes', pangeia: 'Pangeia', arquipelagos: 'Arquipélagos', lago: 'Grande lago' };
const WF_DIRS = [[1, 0, 'E'], [-1, 0, 'W'], [0, 1, 'S'], [0, -1, 'N']];
// Cortes de bioma por bioma dominante: dT = acima disso (quente) vira deserto se a umidade for menor que dM; sT = abaixo disso (frio) vira neve; fM = umidade acima vira floresta.
const WF_CUT = {
  plains: { dT: 0.60, sT: 0.37, fM: 0.62, dM: 0.52 },
  forest: { dT: 0.66, sT: 0.35, fM: 0.47, dM: 0.52 },
  mountain: { dT: 0.60, sT: 0.37, fM: 0.62, dM: 0.52 },
  snow: { dT: 0.72, sT: 0.55, fM: 0.60, dM: 0.52 },
  desert: { dT: 0.50, sT: 0.30, fM: 0.70, dM: 0.64 }
};
const wfSea = () => (typeof SEA === 'number' ? SEA : 10);   // nível do mar (SEA de js/core/phys.js; 10 em Node)
const wfBox = (a, b) => Math.pow(Math.pow(Math.abs(a), 4) + Math.pow(Math.abs(b), 4), 0.25);

// Cria o campo de um mundo. opts = { dominant, format }. Sem format, o formato sai da semente.
function wfCreate(seed, opts) {
  opts = opts || {};
  const fm = WORLD_FIELD.formats, fmt = fm.includes(opts.format) ? opts.format : fm[new RNG((seed * 7 + 3) >>> 0).int(0, fm.length - 1)];
  const N = WORLD_FIELD.worldTiles[fmt] || WORLD_FIELD.tiles, S = N * WORLD_FIELD.spacing, rg = new RNG((seed * 131 + 17) >>> 0);
  const F = {
    seed, S, N, fmt, fmtName: WF_NAMES[fmt] || fmt, dominant: WF_CUT[opts.dominant] ? opts.dominant : 'plains',
    nz: new Noise(seed), nt: new Noise(seed + 11), nm: new Noise(seed + 23), nr: new Noise(seed + 37), nd: new Noise(seed + 51),
    nj: new Noise(seed + 77), wn: new Noise(seed + 131), ln: new Noise(seed + 211), blobs: [], lake: null
  };
  if (fmt === 'continentes') {   // de 2 a 5 massas de terra separadas por mar, em volta do centro
    const cn = rg.int(WORLD_FIELD.continents[0], WORLD_FIELD.continents[1]), a0 = rg.range(0, 6.283), shrink = Math.sqrt(3 / cn);   // mais massas = cada uma menor
    for (let k = 0; k < cn; k++) {
      const a = a0 + k * 6.283 / cn + rg.range(-0.35, 0.35) * 3 / cn, R = rg.range(0.5, 0.56);
      F.blobs.push({ u: Math.cos(a) * R, v: Math.sin(a) * R, r: rg.range(WORLD_FIELD.blobR[0], WORLD_FIELD.blobR[1]) * shrink });
    }
  } else if (fmt === 'lago') {   // um lago grande perto do centro
    const a = rg.range(0, 6.283), R = rg.range(0, 0.22);
    F.lake = { u: Math.cos(a) * R, v: Math.sin(a) * R, r: rg.range(0.26, 0.34) };
  }
  return F;
}

// Terra (1) ou mar (0) num ponto do mundo, com transição suave na costa (a "landMask" em escala de mundo).
function wfLand(F, x, z) {
  const h = F.S / 2, u = (x - h) / h, v = (z - h) / h, cw = WORLD_FIELD.coastWidth;
  const wx = F.wn.fbm(x / 260, z / 260, 3) - 0.5, wz = F.wn.fbm(x / 260 + 50, z / 260 - 30, 3) - 0.5;
  const rim = 1 - smooth(0.9 - cw, 0.9, wfBox(u, v));   // o mar sempre fecha a borda do mundo
  switch (F.fmt) {
    case 'pangeia': {
      const d = wfBox(u + wx * 0.45, v + wz * 0.45) + (F.ln.fbm(x / 170, z / 170, 3) - 0.5) * 0.28;
      return 1 - smooth(0.7 - cw * 0.3, 0.7 + cw * 0.7, d);
    }
    case 'continentes': {
      let m = 0;
      for (const b of F.blobs) { const dk = Math.hypot(u - b.u + wx * 0.35, v - b.v + wz * 0.35) / b.r + (F.ln.fbm(x / 150, z / 150, 3) - 0.5) * 0.3; m = Math.max(m, 1 - smooth(0.85 - cw / b.r, 0.85, dk)) }
      return m * rim;
    }
    case 'arquipelagos': {
      const sc = (F.ln.fbm(x / 300, z / 300, 3) - 0.5) * 2.4 + 0.22 - wfBox(u, v) * 0.35;
      return smooth(0.0, 0.0 + cw * 1.6, sc) * rim;
    }
    default: {   // lago: terra quase até a borda, com um lago grande no meio
      const base = 1 - smooth(0.82 - cw, 0.82, wfBox(u + wx * 0.2, v + wz * 0.2));
      const L = F.lake, dl = Math.hypot(u - L.u + wx * 0.5, v - L.v + wz * 0.5) + (F.ln.fbm(x / 120, z / 120, 3) - 0.5) * 0.12;
      return base * smooth(L.r, L.r + cw, dl);
    }
  }
}

// Altura do terreno (bloco inteiro) num ponto do mundo: mesma receita do mapa antigo (relevo base, serras, praia, rios por vale), porém sobre o campo contínuo.
function wfHeight(F, x, z) {
  const SEA_ = wfSea(), mtn = F.dominant === 'mountain', edgeV = 1 - wfLand(F, x, z);
  const mtnW = mtn ? [0.3, 0.55] : [0.64, 0.86], amp = mtn ? [27, 22] : [19, 16];
  const baseV = F.nz.fbm(x / 100, z / 100, 4), mtnV = smooth(mtnW[0], mtnW[1], F.nm.fbm(x / 140 + 5, z / 140 + 9, 3)) * (1 - smooth(0.55, 0.95, edgeV));   // (serra não nasce no mar)
  const ridge = 1 - Math.abs(2 * F.nr.fbm(x / 55, z / 55, 3) - 1);
  let h = SEA_ + 6 + (baseV - 0.5) * amp[0] + mtnV * (ridge * amp[1] + 4) + (F.nd.fbm(x / 10, z / 10, 2) - 0.5) * (mtn ? 3.4 : 2) * WORLD_FIELD.detail;
  h = lerp(h, SEA_ + 1.2 + (baseV - 0.5) * 3, smooth(0.02, 0.5, edgeV) * (1 - mtnV * 0.5));   // a costa desce devagar até a praia...
  h -= smooth(0.45, 0.95, edgeV) * 6;                                                           // ...e depois afunda no mar
  if (edgeV < 0.45) {   // rios: vale aberto e leito em volta de uma curva do ruído (só na terra, longe da costa funda)
    const rv = Math.abs(F.nr.fbm(x / 80 + 200, z / 80 - 120, 3) - 0.5);
    if (!mtn) h = lerp(h, SEA_ + 2, smooth(0.16, 0.05, rv) * 0.6 * (1 - mtnV));
    h = lerp(h, SEA_ - 2.5, smooth(0.07, 0.014, rv) * (1 - mtnV * 0.85));
  }
  return Math.max(SEA_ - 3, Math.round(h));
}

// Bioma num ponto do mundo (h = altura já calculada, ou depois de aplainar cidades). Contínuo no mundo: deserto e neve nunca se tocam (há sempre faixa entre os cortes).
function wfBiome(F, x, z, h) {
  const C = WF_CUT[F.dominant], j = (F.nj.v(x / 5, z / 5) - 0.5) * 0.07;
  const t = F.nt.fbm(x / 300 + 90, z / 300 + 40, 3) + j, m = F.nm.fbm(x / 260 - 70, z / 260 + 25, 3) - j;
  if (h >= wfSea() + (F.dominant === 'mountain' ? 10 : 17)) return WF_BIO.ROCK;
  if (t > C.dT && m < C.dM) return WF_BIO.DESERT;
  if (t < C.sT) return WF_BIO.SNOW;
  if (m > C.fM) return WF_BIO.FOREST;
  return WF_BIO.PLAINS;
}

// Fração de terra (altura >= nível do mar + 1) numa janela, amostrada de `step` em `step` blocos.
function wfLandFrac(F, ox, oz, size, step) {
  step = step || WORLD_FIELD.sampleStep;
  let n = 0, land = 0;
  for (let z = step / 2; z < size; z += step) for (let x = step / 2; x < size; x += step) { n++; if (wfHeight(F, ox + x, oz + z) >= wfSea() + 1) land++ }
  return n ? land / n : 0;
}

// ---------- Grade provisória de tiles e trilhas (a etapa 5 troca por um grafo; a interface fica) ----------
const wfNodeOk = (F, i) => i >= 0 && i < F.N;   // F.N = tiles de lado do mundo (S / spacing)
// Centro do tile (i, j) da grade: centro da célula + deslocamento sorteado pela semente.
function wfNode(F, i, j) {
  const sp = WORLD_FIELD.spacing, jt = WORLD_FIELD.jitter;
  return { i, j, x: Math.round((i + 0.5) * sp + (hash2(i, j, F.seed) - 0.5) * 2 * jt), z: Math.round((j + 0.5) * sp + (hash2(i, j, F.seed + 7) - 0.5) * 2 * jt) };
}
const wfLandAt = (F, x, z) => wfHeight(F, x, z) >= wfSea() + 1;
// Existe trilha entre dois tiles vizinhos? Sorteio pela ARESTA (mesmo resultado dos dois lados); exige terra nos dois centros e no meio.
function wfHasTrail(F, i, j, ni, nj) {
  if (!wfNodeOk(F, i) || !wfNodeOk(F, j) || !wfNodeOk(F, ni) || !wfNodeOk(F, nj)) return false;
  const a = wfNode(F, i, j), b = wfNode(F, ni, nj);
  if (!wfLandAt(F, a.x, a.z) || !wfLandAt(F, b.x, b.z) || !wfLandAt(F, (a.x + b.x) / 2, (a.z + b.z) / 2)) return false;
  return hash2(Math.min(i, ni), Math.min(j, nj), F.seed * 3 + (i !== ni ? 0 : 1) + 101) < WORLD_FIELD.trailProb;
}
// Vizinhos de um tile ligados por trilha: [{dir:'E'|'W'|'S'|'N', i, j}].
function wfTrails(F, i, j) {
  const out = [];
  for (const [di, dj, dir] of WF_DIRS) if (wfHasTrail(F, i, j, i + di, j + dj)) out.push({ dir, i: i + di, j: j + dj });
  return out;
}
// Caminho da trilha em coordenadas de mundo, do centro do tile (i0,j0) ao do (i1,j1), de ~12 em 12 blocos. O traçado é uma função só da ARESTA
// (calculado sempre do tile de menor índice para o maior e invertido se preciso), então os dois tiles desenham a mesma linha.
function wfTrailPath(F, i0, j0, i1, j1) {
  let flip = false;
  if (i1 < i0 || (i1 === i0 && j1 < j0)) { [i0, i1] = [i1, i0]; [j0, j1] = [j1, j0]; flip = true }
  const A = wfNode(F, i0, j0), B = wfNode(F, i1, j1), len = Math.hypot(B.x - A.x, B.z - A.z) || 1, n = Math.max(2, Math.ceil(len / 12));
  const amp = (hash2(i0, j0, F.seed * 5 + (i0 !== i1 ? 0 : 1) + 211) - 0.5) * 2 * WORLD_FIELD.trailWobble, px = -(B.z - A.z) / len, pz = (B.x - A.x) / len;
  const pts = [];
  for (let k = 0; k <= n; k++) { const t = k / n, w = Math.sin(Math.PI * t) * amp; pts.push({ x: lerp(A.x, B.x, t) + px * w, z: lerp(A.z, B.z, t) + pz * w }) }
  return flip ? pts.reverse() : pts;
}

// Janela do campo: centro (cx, cz) e lado `size` em blocos de mundo. ox/oz = canto de cima à esquerda (inteiros: os blocos casam com os da janela vizinha).
function wfWindow(F, cx, cz, size, extra) {
  return Object.assign({ F, cx: Math.round(cx), cz: Math.round(cz), size, ox: Math.round(cx - size / 2), oz: Math.round(cz - size / 2) }, extra || {});
}
// Aberturas de uma janela de tile: onde cada trilha do tile (i,j) cruza a borda da janela. Devolve [{dir, to:[i,j], x, z (locais, na borda), ix, iz (direção para dentro)}].
// Só vale se há terra no ponto de saída.
function wfOpenings(F, win, i, j) {
  const out = [], S = win.size, inside = p => p.x >= win.ox + 1 && p.x <= win.ox + S - 1 && p.z >= win.oz + 1 && p.z <= win.oz + S - 1;
  for (const tr of wfTrails(F, i, j)) {
    const path = wfTrailPath(F, i, j, tr.i, tr.j);
    let last = null, ex = null;
    for (let k = 0; k < path.length; k++) {
      const p = path[k];
      if (inside(p)) { last = p; continue }
      if (!last) break;
      let a = last, b = p;   // a borda está entre `last` (dentro) e `p` (fora): bisseção
      for (let r = 0; r < 10; r++) { const m = { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 }; if (inside(m)) a = m; else b = m }
      ex = { x: a.x, z: a.z, from: last }; break;
    }
    if (!ex) continue;
    const lx = clampN(ex.x - win.ox, 1, S - 2), lz = clampN(ex.z - win.oz, 1, S - 2);
    if (!wfLandAt(F, win.ox + lx, win.oz + lz)) continue;
    const dx = ex.from.x - ex.x, dz = ex.from.z - ex.z, dl = Math.hypot(dx, dz) || 1;
    const side = lx <= 2 ? 'W' : lx >= S - 3 ? 'E' : lz <= 2 ? 'N' : 'S';   // lado da janela por onde a trilha sai
    out.push({ dir: tr.dir, to: [tr.i, tr.j], x: Math.round(lx), z: Math.round(lz), ix: dx / dl, iz: dz / dl, side });
  }
  return out;
}
const clampN = (v, a, b) => (v < a ? a : v > b ? b : v);

// Custo de um tile sem saída de verdade: 1 se não há trilha nem abertura na borda (trilha que cai na água não abre a borda), 0,4 por abertura que falta.
function tileOpenPenalty(F, w, i, j) {
  const tr = wfTrails(F, i, j).length, op = wfOpenings(F, w, i, j).length;
  return op ? (tr - op) * 0.4 : 1;
}
// Escolhe o tile padrão da grade para o cenário: com terra perto de landTarget, ao menos uma trilha e o mais perto do centro do mundo.
// Devolve { i, j }. Se ti/tj vierem da URL, só confere que existem.
function wfPickTile(F, size, ti, tj) {
  const N = F.N;
  if (wfNodeOk(F, ti) && wfNodeOk(F, tj)) return { i: ti, j: tj };
  let best = null, bs = 1e9;
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const n = wfNode(F, i, j), w = wfWindow(F, n.x, n.z, size), f = wfLandFrac(F, w.ox, w.oz, size, WORLD_FIELD.sampleStep * 2);
    if (f < WORLD_FIELD.landMin) continue;
    const sc = Math.abs(f - WORLD_FIELD.landTarget) * 2 + Math.hypot(n.x - F.S / 2, n.z - F.S / 2) / F.S + tileOpenPenalty(F, w, i, j);
    if (sc < bs) { bs = sc; best = { i, j } }
  }
  if (!best) {   // mundo quase todo mar: o tile de maior fração de terra
    let bf = -1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const n = wfNode(F, i, j), f = wfLandFrac(F, n.x - size / 2, n.z - size / 2, size, WORLD_FIELD.sampleStep * 2); if (f > bf) { bf = f; best = { i, j } } }
  }
  return best;
}
// Escolhe o centro de uma janela de `size` blocos (para ?mundo=1, sem grade): a de fração de terra mais perto de landTarget, passos de 128 blocos.
function wfPickWindow(F, size) {
  let best = null, bs = 1e9;
  for (let cz = size / 2; cz <= F.S - size / 2; cz += 128) for (let cx = size / 2; cx <= F.S - size / 2; cx += 128) {
    const f = wfLandFrac(F, cx - size / 2, cz - size / 2, size, WORLD_FIELD.sampleStep * 3);
    const sc = (f < WORLD_FIELD.landMin ? 1 : 0) + Math.abs(f - WORLD_FIELD.landTarget) + Math.hypot(cx - F.S / 2, cz - F.S / 2) / F.S * 0.2;
    if (sc < bs) { bs = sc; best = { x: cx, z: cz } }
  }
  return best;
}
// Desenho em texto do mundo inteiro (teste em Node): '~' mar, '.' planície, 'f' floresta, ':' deserto, '*' neve, '^' rocha; 'o' = centro de tile da grade.
function wfAscii(F, step) {
  step = step || 32;
  const rows = [], nodes = new Set();
  for (let j = 0; j < F.N; j++) for (let i = 0; i < F.N; i++) { const n = wfNode(F, i, j); nodes.add(Math.floor(n.x / step) + ',' + Math.floor(n.z / step)) }
  for (let z = 0; z < F.S; z += step) {
    let s = '';
    for (let x = 0; x < F.S; x += step) {
      const h = wfHeight(F, x, z);
      if (nodes.has(Math.floor(x / step) + ',' + Math.floor(z / step))) { s += 'o'; continue }
      s += h < wfSea() ? '~' : ['.', 'f', ':', '*', '^'][wfBiome(F, x, z, h)];
    }
    rows.push(s);
  }
  return rows.join('\n');
}
