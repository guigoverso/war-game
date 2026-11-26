'use strict';
// ---------- Mapa mundi em 3D (etapa 6 do plano; docs/features/5_mapa-mundi.md, "Mapa mundi em 3D (diorama)") ----------
// Só visual e seleção (sem atores). Desenha o campo do mundo (worldfield.js) como uma ilha LIMPA de voxels: relevo suavizado e em degraus, regiões grandes de
// bioma, bosques em vez de árvores soltas, trilha/estrada esculpida no chão com marcadores nos tiles (grafo de graph.js), um modelo por tema e o herói
// (buildHuman) que anda pela trilha ao clicar duas vezes. Câmera livre com inércia. Cena própria (sceneUse, render.js); a câmera do jogo é emprestada e
// devolvida ao fechar. Números em WORLD3D (map-modifiers.js), textos em map-texts.js (txtWm3*).
// Abre com J (jogo), pelo botão do modo criativo ou com ?cenario=mundo3d (&seed=N &forma=pangeia|continentes|arquipelagos|lago &dom=plains|forest|...).
const WM = { time: 0.3, spent: 0, names: false, open: false, built: null, saved: null, hud: null, hover: -1, sel: -1, at: 0, mx: 0, my: 0, drag: null, walk: null, follow: false, standalone: false,
  yaw: 0, pitch: 0.9, dist: 150, tx: 0, tz: 0, c: { yaw: 0, pitch: 0.9, dist: 150, tx: 0, ty: 0, tz: 0 } };
const WM_BOX = new THREE.BoxGeometry(1, 1, 1), WM_MATS = new Map();
// Todo voxel de modelo marca o stencil onde aparece (ZPass): as linhas dos caminhos não desenham nesses pixels (o modelo tem preferência sobre a estrada).
const WM_STENCIL = { stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp };
const wmMat = c => WM_MATS.get(c) || (WM_MATS.set(c, new THREE.MeshLambertMaterial(Object.assign({ color: c }, WM_STENCIL))), WM_MATS.get(c));
// Caixa de voxel: base em (x, y, z) relativo ao grupo g, tamanho w x h x d.
const wmBox = (g, x, y, z, w, h, d, c) => {
  const m = new THREE.Mesh(WM_BOX, wmMat(c)); m.scale.set(w, h, d); m.position.set(x, y + h / 2, z); m.castShadow = m.receiveShadow = true; g.add(m); return m;
};
const wmHash = (a, b) => {
  let h = (a * 374761393 + b * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

// ---------- terreno ----------
// Suaviza o relevo (3 pontos por eixo) e acha as componentes 4-vizinhas de uma máscara (valor v).
function wm3Blur(a, n) {
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i; t[k] = (a[j * n + Math.max(0, i - 1)] + 2 * a[k] + a[j * n + Math.min(n - 1, i + 1)]) / 4;
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const k = j * n + i; o[k] = (t[Math.max(0, j - 1) * n + i] + 2 * t[k] + t[Math.min(n - 1, j + 1) * n + i]) / 4;
  }
  return o;
}
function wm3Comps(M, n, v) {
  const seen = new Uint8Array(n * n), out = [];
  for (let s = 0; s < n * n; s++) {
    if (seen[s] || M[s] !== v) continue;
    const q = [s], comp = []; seen[s] = 1;
    while (q.length) {
      const k = q.pop(), i = k % n, j = (k / n) | 0; comp.push(k);
      for (const [a, b] of [[i - 1, j], [i + 1, j], [i, j - 1], [i, j + 1]]) {
        if (a < 0 || b < 0 || a >= n || b >= n) continue;
        const m = b * n + a; if (!seen[m] && M[m] === v) { seen[m] = 1; q.push(m) }
      }
    }
    out.push(comp);
  }
  return out;
}
// Bioma por maioria numa janela (r colunas) só entre colunas de terra: tira o salpicado de neve, areia e rocha.
function wm3Major(B, land, n, r) {
  const o = B.slice(), cnt = new Uint16Array(5);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    if (!land[j * n + i]) continue;
    cnt.fill(0);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < n && b < n && land[b * n + a]) cnt[B[b * n + a]]++;
    }
    let best = B[j * n + i]; for (let k = 0; k < 5; k++) if (cnt[k] > cnt[best]) best = k;
    o[j * n + i] = best;
  }
  return o;
}
// Colunas do campo: alturas em degraus (blocos), biomas por região, marcas (1 = pedestal, 2 = estrada, 3 = trilha) e a posição de cada tile na cena.
function wm3Terrain(F, G) {
  const K = WORLD3D, n = Math.ceil(F.S / K.cell), sea = wfSea(), raw = new Float32Array(n * n);
  let B = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const x = (i + 0.5) * K.cell, z = (j + 0.5) * K.cell, h = wfHeight(F, x, z); raw[j * n + i] = h; B[j * n + i] = wfBiome(F, x, z, h);
  }
  let S = raw; for (let p = 0; p < K.smooth; p++) S = wm3Blur(S, n);
  const land = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) land[k] = S[k] >= sea + 0.8 ? 1 : 0;
  const at = nd => Math.floor(nd.z / K.cell) * n + Math.floor(nd.x / K.cell);
  for (const c of wm3Comps(land, n, 1)) {
    if (c.length < K.minIsland && !G.nodes.some(nd => !nd.mar && c.includes(at(nd)))) c.forEach(k => { land[k] = 0 });
  }
  for (const c of wm3Comps(land, n, 0)) {
    const edge = c.some(k => k % n === 0 || k < n || k % n === n - 1 || k >= n * (n - 1));
    if (!edge && c.length < K.minPond) c.forEach(k => { land[k] = 1 });
  }
  const S1 = wm3Blur(raw, n);   // em volta de uma ponte: só 1 passada de suavização (4 apagariam o estreito; o campo cru fica picado em poças)
  for (const nd of G.nodes) {   // em volta de uma ponte o terreno fica como o campo (a suavização apagaria o rio/estreito que ela cruza)
    if (!nd.ponteNode) continue;
    const ci = Math.floor(nd.x / K.cell), cj = Math.floor(nd.z / K.cell);
    for (let dj = -12; dj <= 12; dj++) for (let di = -12; di <= 12; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= n || j >= n || Math.hypot(di, dj) > 12) continue;
      const k = j * n + i; S[k] = S1[k]; land[k] = S1[k] >= sea + 0.8 ? 1 : 0;
    }
  }
  for (const nd of G.nodes) {   // o estreito da ponte é garantido: um canal reto, com a largura do vão, para os dois lados até encontrar água (no máximo 30 colunas)
    if (!nd.ponteNode) continue;
    const ca = Math.cos(nd.ang || 0), sa = Math.sin(nd.ang || 0), hw = Math.max(2, Math.round(nd.agua / K.cell / 2)), ci = nd.x / K.cell, cj = nd.z / K.cell;
    for (const dir of [1, -1]) {
      let wetRun = 0;
      for (let t = 0; t <= 30 && wetRun < 3; t += 0.5) {
        const cx = ci - sa * dir * t, cz = cj + ca * dir * t, c0 = Math.round(cz) * n + Math.round(cx);
        wetRun = t > 3 && !land[c0] ? wetRun + 1 : 0;
        for (let u = -hw; u <= hw; u++) {
          const i = Math.round(cx + ca * u), j = Math.round(cz + sa * u);
          if (i >= 0 && j >= 0 && i < n && j < n) { land[j * n + i] = 0; S[j * n + i] = sea - 2 }
        }
      }
    }
  }
  B = wm3Major(wm3Major(B, land, n, 3), land, n, 3);
  const H = new Int16Array(n * n), R = new Uint8Array(n * n);
  for (let k = 0; k < n * n; k++) {
    H[k] = land[k] ? sea + 1 + K.terrace * Math.round(Math.max(0, S[k] - sea - 1) / K.terrace) : sea - 2;
  }
  const T = { n, u: K.cell / K.unit, H, B, R, sea, pos: [], Y: null };
  wm3Pedestals(T, G, land);
  T.Y = Float32Array.from(H, h => (h - sea) * K.vScale); T.land = land;
  return T;
}
// Cada tile de terra vai para a terra firme mais perto (se o centro caiu na água) e ganha um pedestal plano; a cidade ganha um maior.
function wm3Pedestals(T, G, land) {
  const K = WORLD3D, n = T.n, sea = T.sea, cl = v => Math.min(n - 1, Math.max(0, v));
  for (const nd of G.nodes) {
    let ci = Math.floor(nd.x / K.cell), cj = Math.floor(nd.z / K.cell);
    if (!nd.mar && !nd.ponteNode && !land[cj * n + ci]) {
      let best = null;
      for (let r = 1; r <= 14 && !best; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const a = ci + di, b = cj + dj;
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || a < 0 || b < 0 || a >= n || b >= n || !land[b * n + a]) continue;
        let c = 0; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (land[cl(b + y) * n + cl(a + x)]) c++;
        if (!best || c > best.c) best = { a, b, c };
      }
      if (best) { ci = best.a; cj = best.b }
    }
    T.pos[nd.id] = { x: (ci + 0.5) * T.u, z: (cj + 0.5) * T.u };
    if (nd.ponteNode) {   // a ponte fica onde está (meio do vão de água); sem árvores em volta para o tabuleiro aparecer
      for (let dj = -13; dj <= 13; dj++) for (let di = -13; di <= 13; di++) {
        const i = ci + di, j = cj + dj; if (i >= 0 && j >= 0 && i < n && j < n && Math.hypot(di, dj) <= 13 && !T.R[j * n + i]) T.R[j * n + i] = 4;
      }
    }
    if (nd.mar || nd.ponteNode) continue;
    const r = nd.tema === 'cidade' ? K.cityPlateau : K.plateau, hN = Math.min(Math.max(T.H[cj * n + ci], sea + 2), sea + K.pedMax);
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const i = ci + di, j = cj + dj; if (i < 0 || j < 0 || i >= n || j >= n || Math.hypot(di, dj) > r + 0.4) continue;
      T.H[j * n + i] = hN; T.R[j * n + i] = 1; land[j * n + i] = 1; if (T.B[j * n + i] === WF_BIO.ROCK) T.B[j * n + i] = WF_BIO.PLAINS;
    }
  }
}
const wm3Col = (T, x, z) => clamp(Math.floor(z / T.u), 0, T.n - 1) * T.n + clamp(Math.floor(x / T.u), 0, T.n - 1);
// Cores do topo por bioma (planície, floresta, deserto, neve, rocha), praia, fundo do mar (raso e fundo), laterais (terra e pedra), estrada e trilha.
const WM_TOP = [0x6aa84a, 0x4f9440, 0xe3cf86, 0xf0f4f8, 0x9a9ba0], WM_SAND = 0xeeddaa, WM_SHELF = 0xd8cc98, WM_DEEP = 0x3f7aa0;
const WM_DIRT = 0x7d5d3a, WM_STONE = 0x7d766c, WM_ROAD = 0xe8cf92, WM_TRAIL = 0x93683f;

// Geometria única do terreno: topo de cada coluna e laterais onde o vizinho é mais baixo (ou na borda do mundo, até o fundo do diorama).
function wm3TerrainGeo(T) {
  const K = WORLD3D, n = T.n, u = T.u, pos = [], col = [], nor = [], idx = [], tc = new THREE.Color();
  const quad = (p, nm, c, k) => {
    const e1 = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], e2 = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    const cx = e1[1] * e2[2] - e1[2] * e2[1], cy = e1[2] * e2[0] - e1[0] * e2[2], cz = e1[0] * e2[1] - e1[1] * e2[0];
    if (cx * nm[0] + cy * nm[1] + cz * nm[2] < 0) p = p.slice().reverse();   // enrolamento sempre com a face para fora
    tc.setHex(c); const v0 = pos.length / 3;
    for (const q of p) { pos.push(q[0], q[1], q[2]); col.push(tc.r * k, tc.g * k, tc.b * k); nor.push(nm[0], nm[1], nm[2]) }
    idx.push(v0, v0 + 1, v0 + 2, v0, v0 + 2, v0 + 3);
  };
  const wet = (i, j) => i < 0 || j < 0 || i >= n || j >= n || T.H[j * n + i] < T.sea + 1;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const id = j * n + i, h = T.H[id], y = T.Y[id], x0 = i * u, z0 = j * u, x1 = x0 + u, z1 = z0 + u, land = h >= T.sea + 1;
    let c, k = 0.96 + wmHash(i, j) * 0.08;
    if (!land) {   // fundo do mar: raso perto da terra, fundo longe
      let near = false;
      for (let d = -2; d <= 2 && !near; d++) for (let e = -2; e <= 2; e++) if (!wet(i + d, j + e)) { near = true; break }
      c = near ? WM_SHELF : WM_DEEP;
    } else if (T.R[id] === 2) c = WM_ROAD;
    else if (T.R[id] === 3) c = WM_TRAIL;
    else if (!T.R[id] && (wet(i - 1, j) || wet(i + 1, j) || wet(i, j - 1) || wet(i, j + 1)) && T.B[id] !== WF_BIO.SNOW) c = WM_SAND;
    else c = WM_TOP[T.B[id]];
    if (T.R[id] >= 2) k = 0.97 + wmHash(i, j) * 0.05;
    quad([[x0, y, z0], [x0, y, z1], [x1, y, z1], [x1, y, z0]], [0, 1, 0], c, k);
    const sides = [[x0, z1, x0, z0, -1, 0], [x1, z0, x1, z1, 1, 0], [x0, z0, x1, z0, 0, -1], [x1, z1, x0, z1, 0, 1]];
    for (const [ax, az, bx, bz, di, dj] of sides) {
      const a = i + di, b = j + dj, lo = a < 0 || b < 0 || a >= n || b >= n ? -2 * K.vScale : T.Y[b * n + a];   // fora do mundo: o fundo do mar segue (sem parede)
      if (lo >= y - 1e-6) continue;
      const mid = Math.max(lo, y - 0.5), dirt = land && T.B[id] !== WF_BIO.ROCK ? WM_DIRT : WM_STONE;
      if (y - mid > 1e-6) quad([[ax, y, az], [ax, mid, az], [bx, mid, bz], [bx, y, bz]], [di, 0, dj], dirt, 0.88);
      if (mid - lo > 1e-6) quad([[ax, mid, az], [ax, lo, az], [bx, lo, bz], [bx, mid, bz]], [di, 0, dj], WM_STONE, 0.78);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  return g;
}

// ---------- caminhos (arestas do grafo) ----------
// Pontos de uma aresta (a -> b) em unidades da cena: reta com ondulação suave. skip = dentro do raio do modelo do tile (não desenha, o herói não pisa).
function wm3EdgePts(T, G, e) {
  const A = G.nodes[e.a], B = G.nodes[e.b], pa = T.pos[e.a], pb = T.pos[e.b], dx = pb.x - pa.x, dz = pb.z - pa.z;
  const len = Math.hypot(dx, dz) || 1, n = Math.max(2, Math.ceil(len / 0.9)), px = -dz / len, pz = dx / len, ph = wmHash(e.id, 7) * 6.28;
  const amp = e.kind === 'mar' ? 0 : Math.min(3, len * 0.08), pts = [], rad = nd => (nd.mar ? 1 : nd.tema === 'cidade' ? 11 : 7.5);
  for (let k = 0; k <= n; k++) {
    const t = k / n, off = Math.sin(t * Math.PI) * amp * Math.sin(t * Math.PI * 2.2 + ph), x = pa.x + dx * t + px * off, z = pa.z + dz * t + pz * off;
    const c = wm3Col(T, x, z), wetp = T.H[c] < T.sea + 1;
    pts.push({ x, z, y: e.kind === 'mar' ? 0.22 : wetp ? 0.45 : T.Y[c] + 0.02, ponte: e.kind !== 'mar' && wetp,
      skip: Math.hypot(x - pa.x, z - pa.z) < rad(A) || Math.hypot(x - pb.x, z - pb.z) < rad(B) });
  }
  return pts;
}
// Esculpe estrada (2 colunas) e trilha (1) no chão da terra e devolve os extras: ponte (tábuas), rota de mar (pontilhada) e marcadores nos tiles.
function wm3Carve(T, G, edgePts) {
  const grp = new THREE.Group(), planks = [], dots = [], plain = [], lines = { estrada: [], trilha: [] };
  for (const e of G.edges) {
    const P = edgePts[e.id], mk = e.kind === 'estrada' ? 2 : 3;
    if (e.kind !== 'mar') {
      for (let k = 0; k < P.length - 1; k++) {
        const mx = (P[k].x + P[k + 1].x) / 2, mz = (P[k].z + P[k + 1].z) / 2, inTile = nd => {   // dentro da placa do tile: a linha fica por baixo
          const q = T.pos[nd.id], h = wm3Half(nd) + 0.6; return Math.abs(mx - q.x) < h && Math.abs(mz - q.z) < h;
        };
        if (!inTile(G.nodes[e.a]) && !inTile(G.nodes[e.b])) lines[mk === 2 ? 'estrada' : 'trilha'].push([P[k], P[k + 1]]);
      }
    }
    P.forEach((p, k) => {
      if (e.kind === 'mar') { if (k % 8 === 0 && !p.skip) dots.push(p); return }
      if (p.skip) return;
      if (p.ponte) return;   // a ponte é desenhada como modelo no meio do vão (abaixo)
      const i = Math.floor(p.x / T.u), j = Math.floor(p.z / T.u);
      for (let dj = 0; dj < (mk === 2 ? 2 : 1); dj++) for (let di = 0; di < (mk === 2 ? 2 : 1); di++) {
        const id = Math.min(T.n - 1, j + dj) * T.n + Math.min(T.n - 1, i + di);
        if (T.H[id] >= T.sea + 1 && T.R[id] !== 1 && !(T.R[id] === 2 && mk === 3)) T.R[id] = mk;
      }
    });
    let run = [], best = [];   // travessia de água sem tile: ponte reta e simples sobre o MAIOR trecho molhado seguido (uma só por vão, sem arcos)
    for (const q of P) { if (q.ponte) { run.push(q); if (run.length > best.length) best = run.slice() } else run = [] }
    if (best.length) {
      const f = best[0], l = best[best.length - 1], mx = (f.x + l.x) / 2, mz = (f.z + l.z) / 2;
      const perto = G.nodes.some(n => n.ponteNode && Math.hypot(T.pos[n.id].x - mx, T.pos[n.id].z - mz) < 18);   // perto de um tile de ponte: é a ponte dele
      if (!perto && !plain.some(o => Math.hypot(o.x - mx, o.z - mz) < 7)) plain.push({ x: mx, z: mz, ang: Math.atan2(l.z - f.z, l.x - f.x), L: Math.hypot(l.x - f.x, l.z - f.z) + 5 });
    }
  }
  for (const c of plain) wm3BridgeBuild(grp, c, T, false);
  for (const n of G.nodes) {   // TILE de ponte: reta, ao longo do estreito, com um arco em cada ponta (é o que a diferencia das outras)
    if (!n.ponteNode) continue;
    const q = T.pos[n.id]; T.deck = T.deck || {};
    T.deck[n.id] = wm3BridgeBuild(grp, { x: q.x, z: q.z, ang: n.ang || 0, L: Math.max(13, (n.agua || 64) / WORLD3D.unit + 10) }, T, true);
  }
  const pos = [], idx = [];
  for (const [p, q] of planks) {
    const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l * 0.8, sz = dx / l * 0.8, v = pos.length / 3;
    pos.push(p.x - sx, p.y, p.z - sz, p.x + sx, p.y, p.z + sz, q.x + sx, q.y, q.z + sz, q.x - sx, q.y, q.z - sz); idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
    if (Math.floor(p.x * 1.1) % 2 === 0) {
      wmBox(grp, p.x + sx * 1.05, p.y, p.z + sz * 1.05, 0.2, 0.7, 0.2, 0x5a3a1e); wmBox(grp, p.x - sx * 1.05, p.y, p.z - sz * 1.05, 0.2, 0.7, 0.2, 0x5a3a1e);
    }
  }
  if (pos.length) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    grp.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x8a5a2e, side: THREE.DoubleSide })));
  }
  for (const p of dots) wmBox(grp, p.x, p.y, p.z, 0.5, 0.1, 0.5, 0xdff0ff);
  const K = WORLD3D;   // linhas translúcidas por cima dos modelos e do relevo (menos dentro do tile)
  grp.add(wm3Lines(lines.estrada, K.roadW, 0xffffff, K.lineAlpha, 21), wm3Lines(lines.trilha, K.trailW, 0xffffff, K.lineAlpha, 21));
  return grp;
}

// Linha branca translúcida sobre os segmentos [p, q] de um caminho: desenhada POR CIMA de tudo (sem teste de profundidade), exceto dentro do tile.
function wm3Lines(segs, w, color, alpha, order) {
  const pos = [], idx = [];
  for (const [p, q] of segs) {
    const dx = q.x - p.x, dz = q.z - p.z, l = Math.hypot(dx, dz) || 1, sx = -dz / l * w / 2, sz = dx / l * w / 2, v = pos.length / 3;
    pos.push(p.x - sx, p.y + 0.1, p.z - sz, p.x + sx, p.y + 0.1, p.z + sz, q.x + sx, q.y + 0.1, q.z + sz, q.x - sx, q.y + 0.1, q.z - sz);
    idx.push(v, v + 1, v + 2, v, v + 2, v + 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, depthTest: false, depthWrite: false, transparent: true, opacity: alpha, fog: false,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.NotEqualStencilFunc, stencilFail: THREE.KeepStencilOp, stencilZFail: THREE.KeepStencilOp,
    stencilZPass: THREE.KeepStencilOp }));
  m.renderOrder = order; m.frustumCulled = false; return m;
}

// ---------- símbolos e nomes dos tiles (sprites) ----------
function wm3Sprite(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  return new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, depthTest: false, fog: false }));
}
// Meia largura da placa de cada tile (cidade maior) e a placa em si: quadrado translúcido no chão, SOB o modelo; neutro = branco (padrão); tile de facção = cor dela (fundo e borda grossa).
const wm3Half = n => (n.tema === 'cidade' ? WORLD3D.cityPlateau : WORLD3D.plateau);
function wm3Plate(n) {
  const c = document.createElement('canvas'), ow = wm3Owner(n), col = ow === null ? '#ffffff' : '#' + ow.toString(16).padStart(6, '0');
  c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = col; g.globalAlpha = ow === null ? 0.16 : 0.42; g.fillRect(0, 0, 256, 256); g.globalAlpha = 1;
  if (ow !== null) {   // território de facção: borda grossa na cor dela, com um fio branco por dentro
    g.strokeStyle = col; g.lineWidth = 34; g.strokeRect(17, 17, 222, 222);
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(38, 38, 180, 180);
  } else { g.strokeStyle = '#ffffff'; g.lineWidth = 14; g.strokeRect(7, 7, 242, 242) }
  const h = wm3Half(n) * 2 - 0.6, geo = new THREE.PlaneGeometry(h, h); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial(Object.assign({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true,
    polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, WM_STENCIL)));
  m.renderOrder = 1; return m;
}
// Faixa com o nome do tile: pergaminho escuro com moldura dourada, ornamentos nas pontas e, se tem dono, uma pastilha na cor da facção.
function wm3Label(text, owner) {
  const s = wm3Sprite(512, 128, (c, w, h) => {
    const rr = (x, y, ww, hh, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + ww, y, x + ww, y + hh, r); c.arcTo(x + ww, y + hh, x, y + hh, r); c.arcTo(x, y + hh, x, y, r); c.arcTo(x, y, x + ww, y, r); c.closePath() };
    c.font = 'bold 46px Georgia, serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const pad = owner ? 110 : 84, tw = Math.min(w - 70, c.measureText(text).width + pad), x0 = (w - tw) / 2, y0 = 24, hh = h - 48;
    c.fillStyle = '#2e1f0e'; rr(x0, y0, tw, hh, 20); c.fill();
    c.strokeStyle = '#e8c068'; c.lineWidth = 5; rr(x0, y0, tw, hh, 20); c.stroke();
    c.strokeStyle = 'rgba(255,232,170,0.4)'; c.lineWidth = 2; rr(x0 + 9, y0 + 9, tw - 18, hh - 18, 13); c.stroke();
    c.fillStyle = '#e8c068';
    for (const sx of [x0 - 2, x0 + tw + 2]) { c.beginPath(); c.moveTo(sx, h / 2 - 13); c.lineTo(sx + 13, h / 2); c.lineTo(sx, h / 2 + 13); c.lineTo(sx - 13, h / 2); c.closePath(); c.fill() }
    if (owner) { c.fillStyle = owner; c.strokeStyle = '#fff'; c.lineWidth = 3; rr(x0 + 24, h / 2 - 15, 30, 30, 6); c.fill(); c.stroke() }
    c.fillStyle = '#fff3d0'; c.fillText(text, w / 2 + (owner ? 22 : 0), h / 2 + 3);
  });
  s.scale.set(18, 4.5, 1); s.renderOrder = 30; return s;
}

// ---------- bosques (instâncias) ----------
function wm3Trees(T) {
  const K = WORLD3D, L = [];
  for (let j = 0; j < T.n; j++) for (let i = 0; i < T.n; i++) {
    const id = j * T.n + i; if (T.H[id] < T.sea + 2 || T.R[id]) continue;
    const b = T.B[id], grove = 0.55 + 0.9 * wmHash(i >> 3, j >> 3), pr = K.treeProb[b] * grove;
    if (wmHash(i * 3 + 1, j) < pr) L.push({ x: (i + 0.5) * T.u, z: (j + 0.5) * T.u, y: T.Y[id], b, s: 1 + wmHash(j, i + 1) * 0.6 });
  }
  const leaf = new THREE.InstancedMesh(WM_BOX, new THREE.MeshLambertMaterial({ color: 0xffffff }), L.length || 1);
  const trunk = new THREE.InstancedMesh(WM_BOX, new THREE.MeshLambertMaterial({ color: 0x6b4a2a }), L.length || 1);
  const d = new THREE.Object3D(), c = new THREE.Color();
  L.forEach((t, q) => {
    const cactus = t.b === WF_BIO.DESERT, pine = t.b === WF_BIO.SNOW, hl = (pine ? 3 : cactus ? 1.8 : 1.9) * t.s, wl = (pine ? 1.4 : cactus ? 0.6 : 2.2) * t.s;
    const tr = cactus ? 0 : t.s;
    d.scale.set(wl, hl, wl); d.position.set(t.x, t.y + tr + hl / 2, t.z); d.updateMatrix(); leaf.setMatrixAt(q, d.matrix);
    c.setHex(cactus ? 0x3c8a3a : pine ? 0x2f6b4c : t.b === WF_BIO.PLAINS ? 0x58a040 : 0x2f7a32); c.offsetHSL(0, 0, (wmHash(q, 5) - 0.5) * 0.08); leaf.setColorAt(q, c);
    d.scale.set(0.5 * t.s, tr || 0.001, 0.5 * t.s); d.position.set(t.x, t.y + tr / 2, t.z); d.updateMatrix(); trunk.setMatrixAt(q, d.matrix);
  });
  leaf.count = trunk.count = L.length; leaf.frustumCulled = trunk.frustumCulled = false;
  leaf.castShadow = trunk.castShadow = leaf.receiveShadow = true;
  const g = new THREE.Group(); g.add(leaf, trunk); return g;
}

// ---------- modelos dos tiles ----------
const WM_WALL = 0xb8b2a5, WM_ROOF = [0xa84432, 0x4a6a9a, 0x8a5a2e], WM_WALLS = [0xe8dcc0, 0xd9c9a3, 0xcdb89a];
// Cor da bandeira de cada cidade: a do jogador na inicial; as outras só variam de cor (ainda não há facção dona no grafo).
// Índice da cor da facção dona do tile (FAC_COLORS) ou -1 se neutro. PROVISÓRIO: o grafo ainda não tem donos; só as cidades têm (a inicial é do jogador).
function wm3OwnerIdx(n) {
  if (n.tema !== 'cidade') return -1;
  const pc = (typeof STATE !== 'undefined' && STATE.fac && STATE.fac.color) || 0, list = FAC_COLORS.map((_, i) => i).filter(i => i !== pc);
  return n.home ? pc : list[(n.id * 5) % list.length];
}
const wm3FlagColor = n => FAC_COLORS[Math.max(0, wm3OwnerIdx(n))].c;
// Nome da facção dona (a do jogador tem o nome que ele deu; as outras, por enquanto, só a cor) ou null se neutro.
function wm3OwnerName(n) {
  const i = wm3OwnerIdx(n); if (i < 0) return null;
  return n.home ? ((typeof STATE !== 'undefined' && STATE.fac && STATE.fac.name) || TXT_WM3_YOURS) : txtWm3FacName(FAC_COLORS[i].n);
}
// Dono do tile (cor de facção, número) ou null se neutro. PROVISÓRIO: o grafo ainda não tem donos; só as cidades têm (a inicial é do jogador).
const wm3Owner = n => (wm3OwnerIdx(n) < 0 ? null : wm3FlagColor(n));
function wmHouse(g, x, z, w, d, h, rg) {
  wmBox(g, x, 0, z, w, h, d, WM_WALLS[rg.int(0, 2)]); wmBox(g, x, h, z, w + 0.4, 0.55, d + 0.4, WM_ROOF[rg.int(0, 2)]);
}
const WM_MODEL = {
  cidade(g, n, rg) {
    const hw = 5.5; wmBox(g, 0, 0, -hw, 2 * hw, 1.1, 0.5, WM_WALL); wmBox(g, 0, 0, hw, 2 * hw, 1.1, 0.5, WM_WALL);
    wmBox(g, -hw, 0, 0, 0.5, 1.1, 2 * hw, WM_WALL); wmBox(g, hw, 0, 0, 0.5, 1.1, 2 * hw, WM_WALL);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      wmBox(g, sx * hw, 0, sz * hw, 1.3, 2.2, 1.3, WM_WALL); wmBox(g, sx * hw, 2.2, sz * hw, 1.6, 0.4, 1.6, 0x8a847a);
    }
    for (const gx of [-3.1, 0, 3.1]) for (const gz of [-3.1, 0, 3.1]) {
      if (!gx && !gz) continue;
      wmHouse(g, gx + rg.range(-0.3, 0.3), gz + rg.range(-0.3, 0.3), rg.range(1.5, 2.1), rg.range(1.5, 2.1), rg.range(1.2, 1.8), rg);
    }
    wmBox(g, 0, 0, 0, 2.2, 3.4, 2.2, 0xc4bfb3); wmBox(g, 0, 3.4, 0, 2.6, 0.5, 2.6, 0x8a5a2e);
    wmBox(g, 0, 3.9, 0, 0.14, 2.4, 0.14, 0x4a3a2a); wmBox(g, 0.75, 5.4, 0, 1.5, 0.95, 0.1, wm3FlagColor(n));
  },
  vila(g, n, rg) {
    for (const [x, z] of [[-2.2, -2], [2.3, -1.6], [-1.6, 2.4], [2.1, 2.2]]) {
      wmHouse(g, x + rg.range(-0.3, 0.3), z, rg.range(1.3, 1.8), rg.range(1.3, 1.8), rg.range(1, 1.4), rg);
    }
    wmBox(g, 0, 0, 0, 0.9, 0.5, 0.9, 0x8a8a90); wmBox(g, 0, 0.5, 0, 0.5, 0.2, 0.5, 0x2d78c8);
  },
  fazenda(g, n, rg) {
    for (let k = 0; k < 4; k++) wmBox(g, -2.6 + k * 1.75, 0, 2.2, 1.45, 0.12 + (k % 2) * 0.06, 4.6, [0xd9b84a, 0x8ab04a, 0xb8903a, 0x9ac05a][k]);
    wmBox(g, -1.5, 0, -2.6, 3.6, 2.2, 2.8, 0xa8402e); wmBox(g, -1.5, 2.2, -2.6, 3.9, 0.7, 3.1, 0x7a3020); wmBox(g, 2.4, 0, -2.4, 1, 3, 1, 0xd8d2c0);
  },
  mina(g, n, rg) {
    wmBox(g, 0, 0, 0, 6, 1.6, 5, 0x77746f); wmBox(g, -0.6, 1.6, 0.4, 3.8, 1.6, 3.4, 0x6b6863); wmBox(g, -0.9, 3.2, 0.6, 1.8, 1.1, 1.8, 0x8a8782);
    wmBox(g, 0, 0, 2.55, 1.5, 1.4, 0.3, 0x1a1a1e); wmBox(g, -0.9, 0, 2.6, 0.25, 1.5, 0.35, 0x8a5a2e); wmBox(g, 0.9, 0, 2.6, 0.25, 1.5, 0.35, 0x8a5a2e);
    wmBox(g, 2.6, 0, 3.4, 1, 0.55, 0.7, 0x5a4a3a); wmBox(g, -2.8, 0, 3.4, 0.7, 0.5, 0.6, 0xb89a3a);
  },
  serraria(g, n, rg) {
    wmBox(g, -1.5, 0, -1, 3.4, 1.6, 2.6, 0x9a6a3a); wmBox(g, -1.5, 1.6, -1, 3.8, 0.6, 3, 0x6b4a2a);
    for (let k = 0; k < 6; k++) wmBox(g, 1.9 + (k % 3) * 0.7, Math.floor(k / 3) * 0.55, 2.4, 0.6, 0.55, 2.2, 0xb8864a);
    wmBox(g, -3, 0, 2.6, 0.7, 0.5, 0.7, 0x8a5a2e); wmBox(g, -2, 0, 3, 0.6, 0.35, 0.6, 0x8a5a2e);
  },
  animais(g, n, rg) {
    const r = 3.6;
    for (let k = -3; k <= 3; k++) {
      wmBox(g, k * r / 3, 0, -r, 0.2, 0.8, 0.2, 0x8a5a2e); wmBox(g, k * r / 3, 0, r, 0.2, 0.8, 0.2, 0x8a5a2e);
      wmBox(g, -r, 0, k * r / 3, 0.2, 0.8, 0.2, 0x8a5a2e); wmBox(g, r, 0, k * r / 3, 0.2, 0.8, 0.2, 0x8a5a2e);
    }
    for (const s of [-1, 1]) { wmBox(g, 0, 0.45, s * r, 2 * r, 0.12, 0.1, 0x8a5a2e); wmBox(g, s * r, 0.45, 0, 0.1, 0.12, 2 * r, 0x8a5a2e) }
    for (let k = 0; k < 4; k++) {
      const x = rg.range(-2.4, 2.4), z = rg.range(-2.4, 2.4), c = [0xf0eee6, 0x7a5a3a, 0xf0eee6, 0x2a2a2a][k];
      wmBox(g, x, 0.25, z, 0.9, 0.7, 0.55, c); wmBox(g, x + 0.55, 0.55, z, 0.4, 0.4, 0.4, c);
    }
  },
  ponte() {},   // o tile de ponte não usa este modelo: a ponte (reta, com arcos) é desenhada em wm3Carve por wm3BridgeBuild
  fortaleza(g, n, rg) {
    wmBox(g, 0, 0, 0, 4.4, 3.6, 4.4, 0xa6a196);
    for (let k = 0; k < 8; k++) { const a = k * 0.785; wmBox(g, Math.cos(a) * 2, 3.6, Math.sin(a) * 2, 0.7, 0.6, 0.7, 0x8a847a) }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      wmBox(g, sx * 3, 0, sz * 3, 1.5, 2.6, 1.5, 0xb8b2a5); wmBox(g, sx * 3, 2.6, sz * 3, 1.8, 0.4, 1.8, 0x8a847a);
    }
    wmBox(g, 0, 4.2, 0, 0.14, 2, 0.14, 0x4a3a2a); wmBox(g, 0.7, 5.3, 0, 1.3, 0.8, 0.1, 0x6a1b9a);
  },
  ruinas(g, n, rg) {
    for (let k = 0; k < 7; k++) {
      const a = k * 0.9 + 0.3, r = k < 6 ? rg.range(2.2, 3.4) : 0; wmBox(g, Math.cos(a) * r, 0, Math.sin(a) * r, 0.8, rg.range(0.8, 3), 0.8, 0xb4afa4);
    }
    for (let k = 0; k < 5; k++) wmBox(g, rg.range(-3.5, 3.5), 0, rg.range(-3.5, 3.5), rg.range(0.5, 1.2), 0.4, rg.range(0.5, 1.2), 0x9a958a);
  },
  passagem(g, n, rg) {
    wmBox(g, 0, 0, 0, 0.2, 1.5, 0.2, 0x6b4a2a); wmBox(g, 0.35, 1.0, 0, 0.9, 0.4, 0.1, 0xb8864a);
    for (let k = 0; k < 3; k++) wmBox(g, rg.range(-2, 2), 0, rg.range(1, 3), 0.7, 0.45, 0.6, 0x8f9096);
  },
  mar() {}
};
// Ponte RETA de comprimento L centrada em c = {x, z, ang} (ang = direção da travessia): tabuleiro plano (sempre na altura da margem mais alta por perto, com
// cabeceiras de pedra do fundo até o tabuleiro, então nada fica no ar ou afundado), guarda-corpo e pilares. arcos = true (tile de ponte): um ARCO de pedra em
// cada ponta, alto o bastante para aparecer por cima da floresta. Devolve a altura do tabuleiro.
function wm3BridgeBuild(grp, c, T, arcos) {
  const b = new THREE.Group(), L = c.L, W = arcos ? 3.4 : 2.2, th = 0.45, ca = Math.cos(c.ang), sa = Math.sin(c.ang);
  b.position.set(c.x, 0, c.z); b.rotation.y = -c.ang; grp.add(b);
  let top = 0.9;   // margem mais alta perto das duas pontas (até 3 unidades), no máximo 2,6
  for (const sg of [-1, 1]) for (let di = -3; di <= 3; di++) for (let dj = -3; dj <= 3; dj++) {
    const q = wm3Col(T, c.x + ca * sg * L / 2 + di, c.z + sa * sg * L / 2 + dj); if (T.H[q] >= T.sea + 1) top = Math.max(top, Math.min(2.6, T.Y[q] + 0.1));
  }
  wmBox(b, 0, top - th, 0, L, th, W, 0x8a5a2e);
  for (const z of [-W / 2 + 0.12, W / 2 - 0.12]) {
    wmBox(b, 0, top + 0.75, z, L, 0.14, 0.14, 0x5a3a1e);
    for (let x = -L / 2 + 0.4; x <= L / 2 - 0.3; x += 2.2) wmBox(b, x, top, z, 0.22, 0.9, 0.22, 0x5a3a1e);
  }
  for (let x = -L / 2 + 3; x < L / 2 - 2; x += 4.2) wmBox(b, x, -0.7, 0, 1.2, top - th + 0.7, W - 0.6, WM_WALL);   // pilares na água
  for (const sg of [-1, 1]) wmBox(b, sg * (L / 2 - 0.8), -0.7, 0, 1.6, top - th + 0.7, W + 0.3, WM_WALL);   // cabeceiras de pedra
  if (arcos) {
    for (const sg of [-1, 1]) {
      const x = sg * (L / 2 - 0.9);
      for (const z of [-1, 1]) wmBox(b, x, top - th, z * (W / 2 + 0.3), 1.2, 4.2 + th, 1.2, WM_WALL);   // pilares do arco
      wmBox(b, x, top + 3.7, 0, 1.4, 0.9, W + 2.2, 0xa8a296);   // verga
      wmBox(b, x, top + 4.6, 0, 1.8, 0.4, W + 2.6, 0x6a645a);   // capa
      wmBox(b, x, top + 3.0, 0, 1.0, 0.7, W - 0.4, 0x8a847a);   // fecho do arco (mais baixo, dá a forma de arco)
      wmBox(b, x, top + 5.0, 0, 0.14, 1.8, 0.14, 0x4a3a2a); wmBox(b, x, top + 6.2, 0.75, 0.1, 0.8, 1.3, 0xe8c068);   // mastro e flâmula
    }
  }
  return top;
}
// Cais e barco para tile de porto: um píer de tábuas até o mar mais perto e um barquinho na ponta.
function wm3Port(g, G, T, n) {
  const m = G.adj[n.id].map(x => G.nodes[x.to]).find(o => o.mar); if (!m) return;
  const a = Math.atan2(T.pos[m.id].z - T.pos[n.id].z, T.pos[m.id].x - T.pos[n.id].x), pr = new THREE.Group(); pr.rotation.y = -a; g.add(pr);
  wmBox(pr, 8.5, -0.1, 0, 5, 0.25, 1.2, 0x8a5a2e); wmBox(pr, 11.8, 0.05, 1.8, 2.6, 0.5, 1.1, 0x6b4a2a);
  wmBox(pr, 11.8, 0.55, 1.8, 0.12, 1.8, 0.12, 0x4a3a2a); wmBox(pr, 12.2, 0.9, 1.8, 0.04, 1.2, 0.9, 0xf0eee6);
}

// ---------- montagem ----------
function wm3Build(F, G) {
  const K = WORLD3D, sc = new THREE.Scene(), T = wm3Terrain(F, G), S = F.S / K.unit, SKY = 0xa9d2f2;
  sc.background = new THREE.Color(0x2a1e14);   // cor de espera até a imagem de fundo (a mesa) carregar; sem névoa nem céu
  const hemi = new THREE.HemisphereLight(0xdcecff, 0x6a7a50, 0.4), sun = new THREE.DirectionalLight(0xfff0d0, 1), moon = new THREE.DirectionalLight(0x8aa6ff, 0.3);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.25; sc.add(hemi, sun, sun.target, moon);
  const edgePts = G.edges.map(e => wm3EdgePts(T, G, e)), carve = wm3Carve(T, G, edgePts);
  const land = new THREE.Mesh(wm3TerrainGeo(T), new THREE.MeshLambertMaterial({ vertexColors: true })); land.castShadow = land.receiveShadow = true; sc.add(land);
  const wy = 0.1, wmat = new THREE.MeshLambertMaterial({ color: 0x2f86d0, transparent: true, opacity: 0.55, depthWrite: false });   // mesma opacidade da superfície ondulada: a borda do mundo não aparece
  const wgeo = new THREE.PlaneGeometry(S, S, 110, 110); wgeo.rotateX(-Math.PI / 2);
  wgeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(wgeo.attributes.position.count * 3).fill(1), 3));
  const wave = new THREE.Mesh(wgeo, new THREE.MeshLambertMaterial({ color: 0x2f86d0, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true, vertexColors: true }));
  wave.position.set(S / 2, wy, S / 2); wave.renderOrder = 2; sc.add(wave);
  sc.add(carve); sc.add(wm3Trees(T));
  const clouds = wm3Clouds(S), ships = wm3Ships(T, G, wy); sc.add(clouds.group, ships.group, wm3Slab(S));
  const pick = [], nodeY = [], labels = [];
  for (const n of G.nodes) {
    const g = new THREE.Group(), p = T.pos[n.id], y = n.mar || n.ponteNode ? wy : T.Y[wm3Col(T, p.x, p.z)];
    g.position.set(p.x, y, p.z); g.scale.setScalar(K.modelScale); nodeY[n.id] = y;
    WM_MODEL[n.tema](g, n, new RNG((F.seed * 31 + n.id * 7 + 1) >>> 0), G, T); if (n.porto) wm3Port(g, G, T, n);
    sc.add(g);
    if (!n.mar) {
      const hh = n.tema === 'cidade' ? 10 : 8.2, pl = wm3Plate(n), lb = wm3Label(TXT_WM3_THEME[n.tema], wm3Owner(n) === null ? null : '#' + wm3Owner(n).toString(16).padStart(6, '0'));
      pl.position.set(p.x, y + 0.16, p.z); lb.position.set(p.x, y + 0.9, p.z + wm3Half(n) + 2.6); lb.visible = WM.names; sc.add(pl, lb); labels.push(lb);
    }
    const rr = n.tema === 'cidade' ? 9 : 6, pk = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 10, 12), new THREE.MeshBasicMaterial({ visible: false }));
    pk.position.set(p.x, y + 3, p.z); pk.userData.id = n.id; sc.add(pk); pick.push(pk);
  }
  const ring = (r0, r1, c) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 40),
      new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide, depthTest: false, transparent: true, opacity: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 10; m.visible = false; sc.add(m); return m;
  };
  const B = { scene: sc, T, G, F, S, edgePts, pick, nodeY, hoverRing: ring(6.2, 6.8, 0xffffff), selRing: ring(6.9, 7.8, 0xffd23a),
    path: new THREE.Group(), token: null, hemi, sun, moon, wmat, wave, labels, clouds, ships };
  sc.add(B.path); wm3Backdrop(B); return B;
}

// ---------- herói ----------
function wm3Token(B) {
  const pc = (typeof STATE !== 'undefined' && STATE.fac && STATE.fac.color) || 0, col = FAC_COLORS[pc].c;
  const h = buildHuman({ skin: 0xe3b48e, shirt: col, pants: 0x3b3f55, hair: 0x3a2a1c, hairStyle: 'helmet', hat: 0x8a9ab0, scale: 1 }), g = new THREE.Group();
  wmBox(g, 1.1, 0, 0.12, 0.06, 2.8, 0.06, 0x4a3a2a); wmBox(g, 1.55, 2, 0.12, 0.9, 0.6, 0.05, col);   // bandeira do batalhão
  const hp = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.4, 10), new THREE.MeshBasicMaterial({ visible: false }));   // área de clique do batalhão
  hp.position.y = 1.2; g.add(hp); B.heroPick = hp;
  g.add(h.group); g.traverse(o => { if (o.isMesh && o !== hp) o.castShadow = true }); B.hero = h;
  g.scale.setScalar(WORLD3D.heroScale);   // tamanho do batalhão: WORLD3D.heroScale (recarregue a página ao mudar)
  B.scene.add(g); B.token = g; return g;
}
// Onde o herói fica ao lado do tile (de frente, fora do modelo).
function wm3Anchor(id) {
  const B = WM.built, p = B.T.pos[id], nd = B.G.nodes[id], r = nd.tema === 'cidade' ? 9 : 7;
  if (nd.ponteNode) return { x: p.x, z: p.z, y: (B.T.deck && B.T.deck[id]) || B.nodeY[id] + 0.5 };   // o batalhão para em cima da ponte
  const x = p.x + 1.2, z = p.z + r;
  return { x, z, y: B.T.Y[wm3Col(B.T, x, z)] + 0.02 };
}
function wm3TokenPlace(id) {
  const a = wm3Anchor(id); WM.built.token.position.set(a.x, a.y, a.z); WM.built.tokenY = a.y;
}

// ---------- caminho e custo ----------
const wm3Actions = e => Math.max(1, Math.ceil((e.custo || e.len / TILE_SIZE * 2.2) / WORLD3D.costPerAction));
// Menor caminho (em ações) por todas as arestas, de `from` até `to`. Devolve {acoes, mar, ids:[aresta...], from:[ponto...]} ou null.
function wm3Path(G, from, to) {
  const N = G.nodes.length, d = new Array(N).fill(Infinity), pv = new Array(N).fill(-1), pe = new Array(N).fill(-1), done = new Array(N).fill(false);
  d[from] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < N; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i;
    if (u < 0 || u === to) break;
    done[u] = true;
    for (const x of G.adj[u]) {
      const e = G.edges[x.e], w = d[u] + wm3Actions(e) + (e.kind === 'mar' ? 0.01 : 0);
      if (w < d[x.to]) { d[x.to] = w; pv[x.to] = u; pe[x.to] = e.id }
    }
  }
  if (d[to] === Infinity) return null;
  const ids = [], fr = []; let a = 0, mar = false;
  for (let v = to; pv[v] >= 0; v = pv[v]) {
    ids.unshift(pe[v]); fr.unshift(pv[v]); a += wm3Actions(G.edges[pe[v]]); if (G.edges[pe[v]].kind === 'mar') mar = true;
  }
  return { acoes: a, mar, ids, from: fr };
}
// Pontos livres do caminho, na ordem de quem anda (cada aresta virada para o lado certo).
function wm3PathPts(p) {
  const B = WM.built, out = [];
  p.ids.forEach((id, q) => {
    const e = B.G.edges[id], pts = B.edgePts[id], seq = e.a === p.from[q] ? pts : pts.slice().reverse();
    for (const pt of seq) if (!pt.skip) out.push(pt);
  });
  return out;
}
// Pontos dourados sobre o caminho escolhido.
function wm3ShowPath(p) {
  const B = WM.built; B.path.children.slice().forEach(c => B.path.remove(c));
  if (!p) return;
  wm3PathPts(p).forEach((pt, k) => {
    if (k % 2) return;
    const m = new THREE.Mesh(WM_BOX, wmMat(0xffd23a)); m.scale.set(0.5, 0.5, 0.5); m.position.set(pt.x, pt.y + 0.7, pt.z); B.path.add(m);
  });
}

// ---------- seleção e caminhada ----------
function wm3Info(id) {
  if (id < 0) return '';
  const B = WM.built, n = B.G.nodes[id], p = id === WM.at ? null : wm3Path(B.G, WM.at, id), ow = wm3Owner(n);
  const prod = n.tema === 'vila' || n.tema === 'cidade' ? 'imposto' : TILE_PROD.res[n.tema] || null;
  return txtWm3Info(n, { prod: prod && TXT_WM3_PROD[prod], owner: ow === null ? null : { name: wm3OwnerName(n), css: '#' + ow.toString(16).padStart(6, '0') },
    aqui: id === WM.at, cost: p ? { acoes: p.acoes, mar: p.mar } : null, sem: id !== WM.at && !p });
}
function wm3Select(id) {
  const B = WM.built; WM.sel = id; B.selRing.visible = id >= 0;
  if (id >= 0) { const p = B.T.pos[id]; B.selRing.position.set(p.x, B.nodeY[id] + 0.2, p.z); B.selRing.scale.setScalar(wm3Half(B.G.nodes[id]) / 6.2 * 1.25) }
  wm3ShowPath(id >= 0 && id !== WM.at ? wm3Path(B.G, WM.at, id) : null);
  WM.hud.info.innerHTML = wm3Info(id); WM.hud.info.style.display = id >= 0 ? '' : 'none';
}
// Segundo clique no tile escolhido: o herói anda pela trilha (só visual por enquanto; só por terra).
function wm3Go(id) {
  const B = WM.built, p = wm3Path(B.G, WM.at, id); if (!p || p.mar || WM.walk) return;
  const pts = wm3PathPts(p).slice(), a = wm3Anchor(id), t = B.token.position;
  WM.walk = { pts: [{ x: t.x, y: t.y, z: t.z }].concat(pts, [{ x: a.x, y: a.y, z: a.z }]), k: 0, f: 0, dest: id }; WM.follow = true;
  WM.spent += p.acoes;   // gastar ações passa o tempo (dia e noite)
  B.path.children.slice().forEach(c => B.path.remove(c)); WM.hud.info.style.display = 'none'; B.selRing.visible = false;
}
function wm3WalkStep(dt) {
  const B = WM.built, w = WM.walk, t = B.token.position; let left = WORLD3D.walkSpeed * dt;
  while (left > 0 && w.k < w.pts.length - 1) {
    const a = w.pts[w.k], b = w.pts[w.k + 1], l = Math.hypot(b.x - a.x, b.z - a.z) || 0.001, rem = l * (1 - w.f);
    if (left >= rem) { left -= rem; w.k++; w.f = 0; continue }
    w.f += left / l; left = 0;
  }
  const a = w.pts[w.k], b = w.pts[Math.min(w.k + 1, w.pts.length - 1)];
  t.x = a.x + (b.x - a.x) * w.f; t.z = a.z + (b.z - a.z) * w.f;
  t.y = a.y + (b.y - a.y) * w.f + Math.abs(Math.sin(performance.now() / 90)) * 0.35;
  if (b !== a) B.token.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
  const sw = Math.sin(performance.now() / 70) * 0.6;
  B.hero.legs[0].rotation.x = sw; B.hero.legs[1].rotation.x = -sw; B.hero.arms[0].rotation.x = -sw; B.hero.arms[1].rotation.x = sw;
  if (w.k >= w.pts.length - 1) {
    WM.walk = null; WM.at = w.dest; wm3TokenPlace(w.dest);
    B.hero.legs.concat(B.hero.arms).forEach(l => { l.rotation.x = 0 }); wm3Select(-1);
  }
}
const WM_RAY = new THREE.Raycaster(), WM_V = new THREE.Vector2();
function wm3PickAt(mx, my) {
  WM_V.set(mx / innerWidth * 2 - 1, -(my / innerHeight) * 2 + 1); WM_RAY.setFromCamera(WM_V, camera);
  const h = WM_RAY.intersectObjects(WM.built.pick, false)[0]; return h ? h.object.userData.id : -1;
}

// ---------- vida em volta: nuvens e navios ----------
// MESA do mundo: uma laje sólida sob o mar com o corte em camadas (terra, pedra, magma incandescente), uma MOLDURA dourada e de madeira em volta do mar, quatro
// colunas nos cantos e um PEDESTAL de pedra em degraus mais largo que a laje, tudo acima do oceano de fora, que fica mais baixo (ver wm3Build).
function wm3Slab(S) {
  const K = WORLD3D, g = new THREE.Group(), fw = K.frameW, bY = K.baseY, top = -2 * K.vScale - 0.6, a = -fw, b = S + fw, rim = K.frameH;
  const mt = (c, e) => new THREE.MeshLambertMaterial(e ? { color: c, emissive: e, emissiveIntensity: 0.75 } : { color: c });
  const box = (x0, x1, y0, y1, z0, z1, mat) => {
    const m = new THREE.Mesh(WM_BOX, mat); m.scale.set(x1 - x0, y1 - y0, z1 - z0); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    m.castShadow = m.receiveShadow = true; g.add(m); return m;
  };
  const y1 = top - 1.5, y2 = top - 4.2;   // limites das camadas
  box(a, b, y1, top, a, b, mt(0x7d5d3a)); box(a, b, y2, y1, a, b, mt(0x7d766c)); box(a, b, bY, y2, a, b, mt(0xc0501c, 0x8a2a0c));
  for (const [y, c] of [[y1, 0x4a3520], [y2, 0x4a463f]]) box(a - 0.06, b + 0.06, y - 0.12, y + 0.12, a - 0.06, b + 0.06, mt(c));   // filetes entre as camadas
  for (const [pad, h] of [[K.plinth[0], 1.9], [K.plinth[1], 1.1]]) box(a - pad, b + pad, bY, bY + h, a - pad, b + pad, mt(0x5a554e));   // pedestal em degraus
  const gold = mt(0xd4af50), wood = mt(0x7a5230), dark = mt(0x3e2a16);
  for (const [x0, x1, z0, z1] of [[a - 0.15, b + 0.15, a - 0.15, 0], [a - 0.15, b + 0.15, S, b + 0.15], [a - 0.15, 0, 0, S], [S, b + 0.15, 0, S]]) box(x0, x1, top, top + 0.35, z0, z1, dark);   // base da moldura (só em volta)
  const strip = (x0, x1, z0, z1) => {   // moldura: blocos alternados de ouro e madeira, entalhados
    const alongX = x1 - x0 > z1 - z0, len = alongX ? x1 - x0 : z1 - z0;
    for (let q = 0, i = 0; q < len; q += 2.4, i++) {
      const e = Math.min(q + 2.4, len), c = i % 2 ? wood : gold;
      if (alongX) box(x0 + q, x0 + e, top + 0.35, rim, z0, z1, c); else box(x0, x1, top + 0.35, rim, z0 + q, z0 + e, c);
    }
  };
  strip(a, b, a, 0); strip(a, b, S, b); strip(a, 0, 0, S); strip(S, b, 0, S);
  for (const [x, z] of [[a, a], [S, a], [a, S], [S, S]]) {   // colunas dos cantos
    box(x - 0.2, x + fw + 0.2, top, rim + 1.6, z - 0.2, z + fw + 0.2, gold); box(x - 0.45, x + fw + 0.45, rim + 1.6, rim + 2.1, z - 0.45, z + fw + 0.45, wood);
    box(x + fw / 2 - 0.25, x + fw / 2 + 0.25, rim + 2.1, rim + 3.1, z + fw / 2 - 0.25, z + fw / 2 + 0.25, gold);
  }
  return g;
}
// Nuvens de voxel: poucas e esparsas (para não esconder o mapa de longe), andam com o vento, voltam do outro lado e fazem sombra no mar e na terra.
function wm3Clouds(S) {
  const K = WORLD3D, group = new THREE.Group(), list = [], mat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  for (let k = 0; k < K.clouds; k++) {
    const c = new THREE.Group(), nb = 5 + Math.floor(wmHash(k, 1) * 5), w = 6 + wmHash(k, 2) * 8;
    for (let q = 0; q < nb; q++) {
      const m = new THREE.Mesh(WM_BOX, mat), sx = 3 + wmHash(k, q + 3) * 5, sz = 3 + wmHash(k, q + 20) * 4, lay = wmHash(k, q + 40) < 0.4 ? 1 : 0;
      m.scale.set(sx, 1.5 + lay * 0.8, sz); m.position.set((wmHash(k, q + 60) - 0.5) * w, lay * 1.1, (wmHash(k, q + 80) - 0.5) * w * 0.6); m.castShadow = true; c.add(m);
    }
    c.position.set(wmHash(k, 100) * (S + 160) - 80, K.cloudY[0] + wmHash(k, 101) * (K.cloudY[1] - K.cloudY[0]), wmHash(k, 102) * S);
    list.push({ c, sp: K.cloudSpeed * (0.6 + wmHash(k, 103) * 0.8) }); group.add(c);
  }
  return { group, list, S };
}
// Navios: velejam de ponta a ponta de rotas de mar do grafo (só no trecho inteiro de água da reta, sem cruzar terra), viram nas pontas e balançam nas ondas.
function wm3Ships(T, G, wy) {
  const K = WORLD3D, group = new THREE.Group(), list = [], lanes = [];
  for (const e of G.edges) {
    if (e.kind !== 'mar') continue;
    const A = T.pos[e.a], B = T.pos[e.b], len = Math.hypot(B.x - A.x, B.z - A.z), n = Math.ceil(len);
    let run = 0, best = 0, end = 0;
    for (let k = 0; k <= n; k++) {
      const x = A.x + (B.x - A.x) * k / n, z = A.z + (B.z - A.z) * k / n;
      run = T.H[wm3Col(T, x, z)] < T.sea + 1 ? run + 1 : 0; if (run > best) { best = run; end = k }
    }
    if (best < 30) continue;
    const k0 = end - best + 1 + 4, k1 = end - 4, f = k => ({ x: A.x + (B.x - A.x) * k / n, z: A.z + (B.z - A.z) * k / n });
    lanes.push({ a: f(k0), b: f(k1), len: Math.hypot(f(k1).x - f(k0).x, f(k1).z - f(k0).z) });
  }
  for (let k = 0; k < Math.min(K.ships, lanes.length); k++) {
    const ln = lanes[Math.floor(wmHash(k, 7) * lanes.length)], g = new THREE.Group(), s = new THREE.Group(); g.add(s);
    wmBox(s, 0, 0, 0, 4.2, 0.8, 1.5, 0x7a4a24); wmBox(s, 2.4, 0.3, 0, 1, 0.5, 1.0, 0x7a4a24); wmBox(s, -2.3, 0.8, 0, 0.8, 0.5, 1.3, 0x5a3a1e);   // casco, proa e popa
    wmBox(s, 0, 0.8, 0, 0.18, 4.2, 0.18, 0x4a3a2a); wmBox(s, 0.2, 1.6, 0, 0.1, 2.4, 2.6, 0xf4ecd8); wmBox(s, 1.0, 1.4, 0, 0.1, 1.4, 1.6, 0xe8dcc0);   // mastro e velas
    wmBox(s, 0, 5.0, 0, 0.1, 0.1, 0.9, 0xc0392b);
    g.scale.setScalar(K.shipScale); group.add(g);
    list.push({ g, s, ln, t: wmHash(k, 9), dir: wmHash(k, 11) < 0.5 ? 1 : -1, ph: wmHash(k, 13) * 6.28, yaw: 0 });
  }
  return { group, list, wy };
}
function wm3Life(dt, tm) {
  const B = WM.built, K = WORLD3D;
  for (const c of B.clouds.list) { c.c.position.x += c.sp * dt; if (c.c.position.x > B.clouds.S + 80) c.c.position.x = -80 }
  for (const sh of B.ships.list) {
    sh.t += sh.dir * K.shipSpeed * dt / sh.ln.len; if (sh.t > 1) { sh.t = 1; sh.dir = -1 } else if (sh.t < 0) { sh.t = 0; sh.dir = 1 }
    const a = sh.ln.a, b = sh.ln.b, x = a.x + (b.x - a.x) * sh.t, z = a.z + (b.z - a.z) * sh.t, want = Math.atan2(-(b.z - a.z) * sh.dir, (b.x - a.x) * sh.dir);
    let d = want - sh.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); sh.yaw += d * Math.min(1, dt * 1.5);   // vira devagar nas pontas
    sh.g.position.set(x, B.ships.wy + 0.1 + Math.sin(tm * 1.8 + sh.ph) * 0.1, z); sh.g.rotation.y = sh.yaw; sh.s.rotation.z = Math.sin(tm * 1.4 + sh.ph) * 0.05;
  }
}

// ---------- dia e noite, ondas e sombras ----------
const wmLerpC = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);
// Aplica a hora do dia (0 a 1: 0,25 nascer do sol, 0,5 meio-dia, 0,75 pôr do sol): céu, névoa, luzes, estrelas e cor do mar.
function wm3Env() {
  const B = WM.built, K = WORLD3D, a = Math.PI * 2 * (WM.time - 0.25), e = Math.sin(a), sm = (x, y, t) => { const u = clamp((t - x) / (y - x), 0, 1); return u * u * (3 - 2 * u) };
  const day = sm(-0.12, 0.3, e), dusk = Math.exp(-Math.pow(e / 0.25, 2));
  const sky = wmLerpC(K.skyNight, K.skyDay, day).lerp(new THREE.Color(K.skyDusk), dusk * 0.6);   // cor do céu: só tinge a luz ambiente
  if (B.bgDraw) B.bgDraw(wmLerpC(K.bgNight, 0xffffff, day).lerp(new THREE.Color(K.bgDusk), dusk * 0.35));   // a mesa escurece à noite e esquenta no entardecer
  B.hemi.intensity = K.ambNight + (K.ambDay - K.ambNight) * day; B.hemi.color.copy(sky).lerp(new THREE.Color(0xffffff), 0.4);
  const c = WM.c, dir = new THREE.Vector3(Math.cos(a), Math.max(e, 0.12) + 0.1, 0.5).normalize(), ext = clamp(c.dist * 0.9, 45, 280);
  B.sun.visible = e > -0.05; B.sun.intensity = K.sunPower * day; B.sun.color.set(0xfff0d0).lerp(new THREE.Color(0xff9a50), dusk * 0.8);
  B.sun.target.position.set(c.tx, c.ty, c.tz); B.sun.position.set(c.tx + dir.x * 220, c.ty + dir.y * 220, c.tz + dir.z * 220);
  const sc = B.sun.shadow.camera; if (Math.abs(sc.right - ext) > 1) { sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = 520; sc.updateProjectionMatrix() }
  B.moon.intensity = K.moonPower * (1 - day); B.moon.position.set(c.tx - dir.x * 220, c.ty + 180, c.tz - dir.z * 220); B.moon.target.position.set(c.tx, c.ty, c.tz);
  B.wave.material.color.copy(wmLerpC(K.seaNight, K.seaDay, day)); B.wmat.color.copy(B.wave.material.color).multiplyScalar(0.94);   // o anel de fora sem o brilho médio das ondas
}
// Ondas: a superfície do mar sobe e desce em ondas largas que andam.
function wm3Waves(tm) {
  const B = WM.built, g = B.wave.geometry, p = g.attributes.position, c = g.attributes.color, K = WORLD3D;
  if (!B.wph) {   // fase de cada ponto: varia rápido no espaço, então os pontos oscilam fora de sintonia (sem onda andando pelo mapa)
    B.wph = new Float32Array(p.count);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); B.wph[i] = (Math.sin(x * 1.7) + Math.cos(z * 1.3) + Math.sin((x - z) * 0.8)) * 2.1 }
  }
  for (let i = 0; i < p.count; i++) {
    const s = Math.sin(tm * K.waveSpeed + B.wph[i]);
    p.setY(i, s * K.waveAmp); const k = 0.9 + 0.1 * s; c.setXYZ(i, k, k, k);   // brilho oscila junto: a água "respira" sem subir sobre a praia
  }
  p.needsUpdate = true; c.needsUpdate = true;
}

// ---------- menu do batalhão e livro ----------
function wm3HeroAt(mx, my) {
  const B = WM.built; WM_V.set(mx / innerWidth * 2 - 1, -(my / innerHeight) * 2 + 1); WM_RAY.setFromCamera(WM_V, camera);
  return WM_RAY.intersectObject(B.heroPick, false).length > 0;
}
// Abre o menu do batalhão ao lado dele (segue o boneco na tela). As opções ainda não fazem nada (só existem para as próximas etapas).
function wm3MenuOpen() { WM.menuOn = true; WM.hud.menu.style.display = 'block'; wm3MenuPlace() }
function wm3MenuClose() { if (!WM.hud) return; WM.menuOn = false; WM.hud.menu.style.display = 'none' }
function wm3MenuPlace() {
  const v = WM.built.token.position.clone(); v.y += WORLD3D.heroScale * 1.1; v.project(camera);
  const m = WM.hud.menu, x = (v.x + 1) / 2 * innerWidth + 34, y = (1 - v.y) / 2 * innerHeight;
  m.style.left = Math.min(innerWidth - m.offsetWidth - 10, x) + 'px'; m.style.top = clamp(y - m.offsetHeight / 2, 10, innerHeight - m.offsetHeight - 10) + 'px';
}
function wm3MenuAct(id) {
  wm3MenuClose();
  // GANCHO: aqui entram as ações reais (entrar no tile = abrir o mapa local do tile do batalhão; as demais, nas etapas 7 e 8). Ainda sem efeito.
  WM.lastAct = id;
}
// Abre o livro do jogo (tecla L ou botão); ao fechar o livro o mapa mundi continua aberto (wm3Frame devolve o painel). Só dentro do jogo.
function wm3Book() { if (!G.running || WM.standalone) return; wm3MenuClose(); openBook('book') }

// ---------- câmera livre com inércia ----------
function wm3Limits() {
  const K = WORLD3D, B = WM.built;
  WM.tx = clamp(WM.tx, 0, B.S); WM.tz = clamp(WM.tz, 0, B.S); WM.dist = clamp(WM.dist, K.distLim[0], K.distLim[1]);
  WM.pitch = clamp(WM.pitch, K.pitchLim[0], K.pitchLim[1]); if (K.yawMax < 6) WM.yaw = clamp(WM.yaw, -K.yawMax, K.yawMax);
}
function wm3Cam(dt) {
  const B = WM.built, c = WM.c, k = 1 - Math.exp(-WORLD3D.damp * dt);
  if (WM.follow && B.token) { WM.tx = B.token.position.x; WM.tz = B.token.position.z }
  wm3Limits();
  c.yaw += (WM.yaw - c.yaw) * k; c.pitch += (WM.pitch - c.pitch) * k; c.dist += (WM.dist - c.dist) * k;
  c.tx += (WM.tx - c.tx) * k; c.tz += (WM.tz - c.tz) * k; c.ty += (B.T.Y[wm3Col(B.T, c.tx, c.tz)] - c.ty) * k;
  const cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
  camera.position.set(c.tx + Math.sin(c.yaw) * cp * c.dist, Math.max(0.6, c.ty + sp * c.dist), c.tz + Math.cos(c.yaw) * cp * c.dist);
  camera.lookAt(c.tx, c.ty, c.tz);
  const nr = clamp(c.dist * 0.04, 1, 30); if (Math.abs(nr - camera.near) > 0.4) { camera.near = nr; camera.updateProjectionMatrix() }   // de longe, mais precisão: some o tremor
  wm3BackdropFit();
}
// ---------- imagem de fundo (a mesa) ----------
// Fundo de tela de verdade (scene.background): fica parado, não gira nem inclina com a câmera. A imagem passa por uma tela (canvas) para poder ser tingida à noite e no
// entardecer (multiplica a cor, no máximo a cada 250 ms) e é cortada para cobrir a tela sem esticar (wm3BackdropFit).
const WM_BGW = 1280, WM_BGH = 714;
function wm3Backdrop(B) {
  const cv = document.createElement('canvas'); cv.width = WM_BGW; cv.height = WM_BGH;
  const g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv), im = new Image(); let last = '', at = 0;
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false; B.bgTex = tex;
  B.bgDraw = (col, force) => {
    const k = col.getHexString(), now = performance.now();
    if (!im.complete || !im.naturalWidth || (!force && (k === last || now - at < 250))) return;
    last = k; at = now; g.globalCompositeOperation = 'source-over'; g.drawImage(im, 0, 0, WM_BGW, WM_BGH);
    g.globalCompositeOperation = 'multiply'; g.fillStyle = '#' + k; g.fillRect(0, 0, WM_BGW, WM_BGH); tex.needsUpdate = true;
  };
  im.onload = () => { B.bgDraw(new THREE.Color(0xffffff), true); B.scene.background = tex };
  im.src = WORLD3D.backdrop;
}
function wm3BackdropFit() {   // "cover": enche a tela cortando o excesso, sem esticar
  const t = WM.built.bgTex, ia = WM_BGW / WM_BGH, a = innerWidth / innerHeight;
  if (a > ia) { t.repeat.set(1, ia / a); t.offset.set(0, (1 - ia / a) / 2) } else { t.repeat.set(a / ia, 1); t.offset.set((1 - a / ia) / 2, 0) }
}
// Visões prontas: 'geral' enquadra o mundo; 'heroi' vai ao herói e o segue.
function wm3View(v) {
  const B = WM.built; WM.follow = v === 'heroi';
  if (v === 'geral') { WM.tx = WM.tz = B.S / 2; WM.dist = B.S * 0.95; WM.pitch = 1.0 }
  else { const t = B.token.position; WM.tx = t.x; WM.tz = t.z; WM.dist = 55; WM.pitch = 0.8 }
}
function wm3Pan(fw, rt) {   // desloca o alvo: fw para o fundo da tela, rt para a direita
  WM.follow = false; WM.tx += -Math.sin(WM.yaw) * fw + Math.cos(WM.yaw) * rt; WM.tz += -Math.cos(WM.yaw) * fw - Math.sin(WM.yaw) * rt;
}
function wm3Frame(dt) {
  if (!WM.open) return;
  if (G.panel === null) { G.panel = 'mundo3d'; if (document.pointerLockElement) document.exitPointerLock() }   // o livro fechou: volta ao mapa mundi
  WM.hud.el.style.visibility = G.panel === 'ldbook' ? 'hidden' : '';
  const B = WM.built, K = WORLD3D, k = G.keys, sp = WORLD3D.panSpeed * WM.dist * dt, on = (a, b) => (k[a] || k[b] ? 1 : 0);
  wm3Pan((on('KeyW', 'ArrowUp') - on('KeyS', 'ArrowDown')) * sp, (on('KeyD', 'ArrowRight') - on('KeyA', 'ArrowLeft')) * sp);
  if (k.KeyQ) WM.yaw -= dt * 1.4; if (k.KeyE) WM.yaw += dt * 1.4;
  if (WM.walk) wm3WalkStep(dt); else if (B.token) B.token.position.y = B.tokenY + Math.abs(Math.sin(performance.now() / 700)) * 0.05;
  wm3Cam(dt);
  WM.time += (K.dayStart + WM.spent / K.actionsPerDay - WM.time) * (1 - Math.exp(-dt * 0.9));   // a hora só anda quando se gastam ações; a luz acompanha devagar
  wm3Env(); wm3Waves(performance.now() / 1000); wm3Life(dt, performance.now() / 1000);
  if (WM.menuOn) wm3MenuPlace();
  const h = WM.drag || WM.walk || G.panel !== 'mundo3d' ? -1 : wm3PickAt(WM.mx, WM.my);
  document.body.style.cursor = h >= 0 ? 'pointer' : '';
  if (h !== WM.hover) {
    WM.hover = h; B.hoverRing.visible = h >= 0 && h !== WM.sel;
    if (h >= 0) { const p = B.T.pos[h]; B.hoverRing.position.set(p.x, B.nodeY[h] + 0.18, p.z); B.hoverRing.scale.setScalar(wm3Half(B.G.nodes[h]) / 6.2 * 1.25) }
  }
}
function wm3Keys(e) {
  if (!WM.open || G.panel !== 'mundo3d') return;   // com o livro aberto, as teclas são do jogo
  if (e.code === 'Escape' || e.code === 'KeyJ') {
    if (WM.menuOn) wm3MenuClose(); else if (!WM.standalone && !e.repeat) wm3Close();
    e.preventDefault(); e.stopImmediatePropagation(); return;
  }
  if (e.code === 'KeyL' && !e.repeat) { wm3Book(); e.preventDefault(); e.stopImmediatePropagation(); return }
  if (e.code === 'KeyF' && !e.repeat) wm3View(WM.follow ? 'geral' : 'heroi');
  if (e.code === 'Home' && !e.repeat) wm3View('geral');
  if (!(e.ctrlKey || e.metaKey || (e.code.startsWith('F') && e.code.length > 1))) {
    G.keys[e.code] = true; e.stopImmediatePropagation(); if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
  }
}
window.addEventListener('keydown', wm3Keys, true);
window.addEventListener('keyup', e => { if (WM.open) { G.keys[e.code] = false } });
window.addEventListener('mousedown', e => { if (WM.open && e.target === canvas) WM.drag = { b: e.button, x: e.clientX, y: e.clientY, len: 0, moved: false } });
window.addEventListener('mousemove', e => {
  if (!WM.open) return; WM.mx = e.clientX; WM.my = e.clientY;
  const d = WM.drag; if (!d) return;
  const dx = e.clientX - d.x, dy = e.clientY - d.y; d.x = e.clientX; d.y = e.clientY; d.len += Math.abs(dx) + Math.abs(dy); d.moved = d.len > 4;
  if (d.b === 2 || d.b === 1) { WM.yaw -= dx * 0.005; WM.pitch += dy * 0.004 }
  else { const k = WM.dist * 2 * Math.tan(camera.fov * Math.PI / 360) / innerHeight; wm3Pan(dy * k * 1.2, -dx * k) }
});
window.addEventListener('mouseup', e => {
  const d = WM.drag; if (!WM.open || !d) return; WM.drag = null;
  if (d.moved || WM.walk) return;
  const wasMenu = WM.menuOn; wm3MenuClose();
  if (d.b === 2) { if (wm3HeroAt(e.clientX, e.clientY) && !wasMenu) wm3MenuOpen(); return }   // botão direito no batalhão: menu do batalhão
  if (d.b !== 0) return;
  const id = wm3PickAt(e.clientX, e.clientY);
  if (id < 0) wm3Select(-1); else if (id === WM.sel && id !== WM.at) wm3Go(id); else wm3Select(id);
});
window.addEventListener('wheel', e => { if (WM.open) { WM.dist *= e.deltaY > 0 ? 1.12 : 1 / 1.12; e.preventDefault() } }, { passive: false });
window.addEventListener('contextmenu', e => { if (WM.open) e.preventDefault() });

// ---------- painel (HTML) ----------
function wm3HudMake() {
  if (WM.hud) return;
  const css = document.createElement('style');
  css.textContent = `
    #wm3 { position: fixed; inset: 0; z-index: 30; pointer-events: none; display: none; font-family: Georgia, serif; }
    #wm3 .wm3-tl { position: fixed; left: 16px; top: 16px; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
    #wm3 .wm3-tr { position: fixed; right: 16px; top: 16px; }
    #wm3 .wm3-panel { pointer-events: none; width: 270px; background: rgba(30,21,11,.96); border: 2px solid #c9a24a;
      border-radius: 12px; color: #f4ecd8; font-size: 14px; overflow: hidden; }
    #wm3 .wm3-head { padding: 10px 14px; background: #c9a24a; color: #2a1a08; font-weight: bold; font-size: 19px;
      text-align: center; letter-spacing: 1px; }
    #wm3 .wm3-body { padding: 8px 14px 12px; }
    #wm3 .wm3-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px dashed rgba(201,162,74,.3); }
    #wm3 .wm3-row:last-child { border-bottom: 0; }
    #wm3 .wm3-row i { font-style: normal; width: 22px; text-align: center; }
    #wm3 .wm3-row span { flex: 1; color: #d8c8a0; }
    #wm3 .wm3-row b { color: #fff; text-align: right; }
    #wm3 .wm3-sw { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1px solid #fff; margin-right: 6px; vertical-align: -2px; }
    #wm3 .wm3-btns { display: flex; gap: 8px; }
    #wm3 .wm3-btn { pointer-events: auto; cursor: pointer; padding: 8px 14px; border: 2px solid #c9a24a; border-radius: 10px; font: bold 14px Georgia, serif;
      background: #3a2810; color: #f4ecd8; }
    #wm3 .wm3-btn:hover { background: #5a3d1a; }
    #wm3 .wm3-btn.off { opacity: .65; }
    #wm3 .wm3-hint { position: fixed; right: 16px; bottom: 14px; padding: 6px 12px; color: #f4ecd8; font-size: 13px; background: rgba(20,14,8,.7);
      border: 1px solid rgba(201,162,74,.7); border-radius: 8px; }
    #wm3 .wm3-menu { position: fixed; display: none; pointer-events: auto; min-width: 200px; background: rgba(30,21,11,.97);
      border: 2px solid #c9a24a; border-radius: 12px; overflow: hidden; }
    #wm3 .wm3-menu .wm3-head { font-size: 16px; padding: 8px 12px; }
    #wm3 .wm3-menu button { display: flex; gap: 10px; align-items: center; width: 100%; padding: 10px 14px; background: none; border: 0; cursor: pointer;
      border-bottom: 1px solid rgba(201,162,74,.25); color: #f4ecd8; font: 15px Georgia, serif; text-align: left; }
    #wm3 .wm3-menu button:last-child { border-bottom: 0; }
    #wm3 .wm3-menu button:hover { background: rgba(201,162,74,.28); }
    #wm3 .wm3-menu button.soon { opacity: .6; }`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'wm3';
  el.innerHTML = '<div class="wm3-tl"><div id="wm3info" class="wm3-panel" style="display:none"></div>'
    + '<button class="wm3-btn off" data-v="nomes">' + TXT_WM3_VIEW.nomes + '</button></div>'
    + '<div class="wm3-tr"><button class="wm3-btn" data-v="livro">' + TXT_WM3_VIEW.livro + '</button></div>'
    + '<div class="wm3-hint">' + TXT_WM3_BOOKHINT + '</div>'
    + '<div class="wm3-menu"><div class="wm3-head">' + TXT_WM3_MENU_TITLE + '</div>'
    + TXT_WM3_MENU.map(o => '<button data-m="' + o.id + '"' + (o.ok ? '' : ' class="soon"') + '><i style="font-style:normal">' + o.ic + '</i>' + o.t + '</button>').join('') + '</div>';
  document.body.appendChild(el);
  const nm = el.querySelector('[data-v="nomes"]');
  nm.onclick = () => { WM.names = !WM.names; WM.built.labels.forEach(l => { l.visible = WM.names }); nm.classList.toggle('off', !WM.names) };
  el.querySelector('[data-v="livro"]').onclick = wm3Book;
  el.querySelectorAll('.wm3-menu button').forEach(b => { b.onclick = () => wm3MenuAct(b.dataset.m) });
  WM.hud = { el, info: el.querySelector('#wm3info'), menu: el.querySelector('.wm3-menu'), book: el.querySelector('[data-v="livro"]'), hint: el.querySelector('.wm3-hint') };
}

// ---------- abrir e fechar ----------
const wm3Key = F => F.seed + '/' + F.fmt + '/' + F.dominant;
function wm3Open(F) {
  if (WM.open) return;
  wm3HudMake();
  if (!F) {
    const q = new URLSearchParams(location.search), w = (typeof MAP !== 'undefined' && MAP.win) || null;
    F = w ? w.F : wfCreate((typeof MAP !== 'undefined' && MAP.seed) || 11, { dominant: MAP.dominant, format: q.get('forma') });
  }
  if (!WM.built || WM.key !== wm3Key(F)) { const G2 = wgBuild(F); WM.built = wm3Build(F, G2); WM.key = wm3Key(F); wm3Token(WM.built) }
  const B = WM.built;
  WM.saved = { scene, pos: camera.position.clone(), rot: camera.rotation.clone(), fov: camera.fov, near: camera.near, far: camera.far, panel: G.panel,
    hud: !$('hud').classList.contains('hidden') };
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;   // sombras só no mapa mundi
  sceneUse(B.scene); camera.fov = 45; camera.near = 1; camera.far = 3000; camera.updateProjectionMatrix();
  G.panel = 'mundo3d'; if (document.pointerLockElement) document.exitPointerLock();
  $('hud').classList.add('hidden');
  const oh = document.getElementById('officehint'); WM.saved.oh = oh ? oh.style.display : ''; if (oh) oh.style.display = 'none';   // dica do escritório não aparece no mapa
  WM.at = B.G.inicio ? B.G.inicio.id : (B.G.nodes.find(n => !n.mar) || B.G.nodes[0]).id; wm3TokenPlace(WM.at); WM.walk = null;
  const t = B.token.position; WM.tx = WM.c.tx = t.x; WM.tz = WM.c.tz = t.z; WM.c.ty = B.nodeY[WM.at];
  WM.dist = WM.c.dist = WORLD3D.dist; WM.pitch = WM.c.pitch = WORLD3D.pitch; WM.yaw = WM.c.yaw = 0; WM.hover = -1; WM.drag = null; WM.follow = false;
  WM.open = true; WM.hud.el.style.display = 'block'; wm3MenuClose(); wm3Select(-1);
  WM.hud.book.style.opacity = WM.hud.hint.style.opacity = WM.standalone || !G.running ? 0.45 : 1;   // o livro só abre dentro do jogo
}
function wm3Close() {
  if (!WM.open) return; const s = WM.saved;
  WM.open = false; WM.hud.el.style.display = 'none'; wm3MenuClose(); sceneUse(s.scene); document.body.style.cursor = ''; renderer.shadowMap.enabled = false;
  camera.fov = s.fov; camera.near = s.near; camera.far = s.far; camera.updateProjectionMatrix(); camera.position.copy(s.pos); camera.rotation.copy(s.rot);
  if (s.hud) $('hud').classList.remove('hidden');
  const oh = document.getElementById('officehint'); if (oh) oh.style.display = s.oh;
  for (const c of Object.keys(G.keys)) G.keys[c] = false;
  if (G.running) closePanel(); else G.panel = s.panel;
}
// ?cenario=mundo3d: só o mapa mundi, sem gerar o mapa local (nem tela de criação de facção).
function wm3Standalone() {
  const q = new URLSearchParams(location.search), sv = $('seed').value.trim(), seed = sv ? (/^\d+$/.test(sv) ? +sv >>> 0 : hashStr(sv)) : 11;
  SCREENS.forEach(s => $(s).classList.add('hidden')); WM.standalone = true;
  wm3Open(wfCreate(seed, { dominant: q.get('dom') || 'plains', format: q.get('forma') }));
}
if (new URLSearchParams(location.search).get('cenario') === 'mundo3d') setTimeout(wm3Standalone, 250);
const wmBtn = document.getElementById('cMundo3d');   // botão do modo criativo (aba Mundo); o game.js carrega depois, então nada de $ aqui
if (wmBtn) { wmBtn.textContent = TXT_WM3_BUTTON; wmBtn.onclick = () => { closePanel(); wm3Open() } }
