'use strict';
// ---------- Grafo do mundo (etapa 5; docs/features/5_mapa-mundi.md, "Mapa mundi natural", rodada 15) ----------
// Camada macro: SEM Three.js nem DOM (teste em Node: tests/macro/grafo.js). Sobre o campo do mundo (worldfield.js) escolhe os PONTOS do mapa mundi
// (amostragem com distância mínima), liga vizinhos por triangulação, escolhe trilhas e estradas, separa terra de mar e dá a cada tile o TEMA por
// adequação ao terreno (tileFit, tile.js). Determinístico: depende só da semente, do campo e das opções. Números em WORLD_GRAPH (map-modifiers.js).
// Ainda NÃO ligado ao jogo: o mapa local (mapwin.js) segue na grade provisória até as etapas 6 e 8; as aberturas daqui (wgOpening) já têm o formato
// que o descritor do tile (tileDescribe) espera.

// Grade grossa de terra (1 = terra) de `st` em `st` blocos: mede a fração de terra de uma janela sem chamar wfHeight milhares de vezes.
function wgLandGrid(F, st) {
  const n = Math.ceil(F.S / st), g = new Uint8Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) g[j * n + i] = wfHeight(F, (i + 0.5) * st, (j + 0.5) * st) >= wfSea() + 1 ? 1 : 0;
  return { n, st, g };
}
// Fração de terra da janela de lado `size` centrada em (cx, cz), pela grade grossa.
function wgGridFrac(L, cx, cz, size) {
  const a = Math.max(0, Math.floor((cx - size / 2) / L.st)), b = Math.min(L.n - 1, Math.floor((cx + size / 2 - 1) / L.st));
  const c = Math.max(0, Math.floor((cz - size / 2) / L.st)), d = Math.min(L.n - 1, Math.floor((cz + size / 2 - 1) / L.st));
  let n = 0, s = 0;
  for (let j = c; j <= d; j++) for (let i = a; i <= b; i++) { n++; s += L.g[j * L.n + i] }
  return n ? s / n : 0;
}

// Pontos do mapa: sorteio com distância mínima (os de TERRA, depois os de MAR nos vãos). Ordenados por z e x: o id é a posição na lista.
function wgSample(F, L, rg) {
  const K = WORLD_GRAPH, S = F.S, m = K.edgeMargin, pts = [];
  const far = (x, z) => pts.every(p => Math.hypot(p.x - x, p.z - z) >= K.minDist);
  for (const pass of ['terra', 'mar']) for (let t = 0; t < K.tries; t++) {
    const x = rg.range(m, S - m), z = rg.range(m, S - m);
    if (!far(x, z)) continue;
    const f = wgGridFrac(L, x, z, TILE_SIZE), land = f >= K.landMin && wfHeight(F, x, z) >= wfSea() + 1;
    if (pass === 'terra' ? land : !land) pts.push({ x: Math.round(x), z: Math.round(z), mar: !land, f });
  }
  const ok = pts;
  ok.sort((p, q) => p.z - q.z || p.x - q.x);
  return ok.map((p, id) => Object.assign(p, { id }));
}

// Triangulação de Delaunay (Bowyer-Watson; poucos pontos, então O(n^2) basta). Devolve os pares [a, b] de índices, em ordem.
function wgDelaunay(P) {
  const n = P.length, V = P.map(p => ({ x: p.x, z: p.z })).concat([{ x: -1e5, z: -1e5 }, { x: 1e5, z: -1e5 }, { x: 0, z: 1e5 }]);
  const circ = (t, p) => {   // p dentro do círculo circunscrito do triângulo t?
    const [a, b, c] = t.map(i => V[i]), d = 2 * (a.x * (b.z - c.z) + b.x * (c.z - a.z) + c.x * (a.z - b.z));
    if (!d) return false;
    const a2 = a.x * a.x + a.z * a.z, b2 = b.x * b.x + b.z * b.z, c2 = c.x * c.x + c.z * c.z;
    const ux = (a2 * (b.z - c.z) + b2 * (c.z - a.z) + c2 * (a.z - b.z)) / d, uz = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
    return Math.hypot(p.x - ux, p.z - uz) < Math.hypot(a.x - ux, a.z - uz) - 1e-9;
  };
  const key = (u, v) => (u < v ? u + '_' + v : v + '_' + u), sides = t => [[t[0], t[1]], [t[1], t[2]], [t[2], t[0]]];
  let T = [[n, n + 1, n + 2]];
  for (let i = 0; i < n; i++) {
    const bad = T.filter(t => circ(t, V[i])), cnt = new Map();
    for (const t of bad) for (const [u, v] of sides(t)) cnt.set(key(u, v), (cnt.get(key(u, v)) || 0) + 1);
    T = T.filter(t => !bad.includes(t));
    for (const [k, c] of cnt) if (c === 1) { const [u, v] = k.split('_').map(Number); T.push([u, v, i]) }
  }
  const E = new Set();
  for (const t of T) for (const [u, v] of sides(t)) if (u < n && v < n) E.add(key(u, v));
  return [...E].map(k => k.split('_').map(Number)).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
}

// Sonda de terreno entre dois pontos: maior vão de água seguido (blocos) e custo médio por bioma (planície 2 ... rocha 4; água 6) vezes o comprimento.
function wgProbe(F, A, B) {
  const K = WORLD_GRAPH, len = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(2, Math.ceil(len / K.probeStep)), step = len / n;
  let run = 0, maxRun = 0, cost = 0;
  for (let k = 0; k <= n; k++) {
    const x = lerp(A.x, B.x, k / n), z = lerp(A.z, B.z, k / n), h = wfHeight(F, x, z), w = h < wfSea() + 1;
    run = w ? run + 1 : 0; if (run > maxRun) maxRun = run;
    cost += w ? K.waterCost : K.biomeCost[wfBiome(F, x, z, h)];
  }
  return { agua: Math.round(maxRun * step), custo: cost / (n + 1) * len / K.minDist };
}

// Arestas: Delaunay podado por tamanho; entre tiles de terra só sobrevive o que a sonda permite (vão de água até bridgeMax); árvore geradora de custo
// mínimo por terra (conectividade) mais arestas extras sorteadas (até maxDeg vizinhos); todas as de mar; e, no fim, o par mais curto liga o que sobrar solto.
function wgEdges(F, nodes, rg) {
  const K = WORLD_GRAPH, N = nodes.length, cand = [];
  for (const [a, b] of wgDelaunay(nodes)) {
    const A = nodes[a], B = nodes[b], len = Math.hypot(A.x - B.x, A.z - B.z);
    if (len > K.minDist * K.maxEdge) continue;
    if (A.mar || B.mar) { cand.push({ a, b, kind: 'mar', len: Math.round(len), custo: len / K.minDist * K.seaCost }); continue }
    const pr = wgProbe(F, A, B);
    if (pr.agua <= K.bridgeMax) cand.push({ a, b, kind: 'trilha', len: Math.round(len), custo: pr.custo, agua: pr.agua, ponte: !(A.ponteNode || B.ponteNode) && pr.agua > K.riverMax });
  }
  const uf = Array.from({ length: N }, (_, i) => i), find = i => (uf[i] === i ? i : (uf[i] = find(uf[i]))), deg = new Array(N).fill(0), out = [];
  const add = e => { out.push(e); deg[e.a]++; deg[e.b]++; uf[find(e.a)] = find(e.b) };
  const extra = [];
  for (const e of cand.filter(e => e.kind === 'trilha').sort((p, q) => p.custo - q.custo)) { if (find(e.a) !== find(e.b)) add(e); else extra.push(e) }
  for (const e of extra) if (deg[e.a] < K.maxDeg && deg[e.b] < K.maxDeg && rg.next() < K.extraProb) add(e);
  for (const e of cand) if (e.kind === 'mar') add(e);
  for (;;) {   // um pedaço do mundo ficou solto (ilha longe de tudo): liga o par mais perto de componentes diferentes, por mar
    let best = null, bd = 1e9;
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) { const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z); if (find(a) !== find(b) && d < bd) { bd = d; best = [a, b] } }
    if (!best) break;
    add({ a: best[0], b: best[1], kind: 'mar', len: Math.round(bd), custo: bd / K.minDist * K.seaCost, ligacao: true });
  }
  return out.sort((p, q) => p.a - q.a || p.b - q.b).map((e, id) => Object.assign(e, { id }));
}

// Água (blocos, passo de 8) ao longo da reta entre dois pontos.
function wgWaterLen(F, a, b) {
  const len = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(len / 8)); let w = 0;
  for (let k = 0; k <= n; k++) if (wfHeight(F, lerp(a.x, b.x, k / n), lerp(a.z, b.z, k / n)) < wfSea() + 1) w += len / n;
  return w;
}
// Pontes (decisão de 2026-11-26): a ponte LIGA DUAS MASSAS DE TERRA por um vão de água curto, como um rio entre dois tiles. Para cada par de tiles de terra ligado
// por uma aresta que cruza água (`ponte`), se a reta entre eles tem UM só vão de água (de bridgeTile a bridgeMax blocos, sem mais água no caminho), vira um tile de
// PONTE no meio do vão (n.ponteNode; n.ends = [id antes, id depois]; n.agua = vão; n.ang = direção do tile antes para o depois). Vão grande demais não vira ponte
// (era o erro do mar aberto). O tile de ponte fica a bridgeDist x minDist de todos os outros; no máximo `bridges[1]` por mundo, sorteadas.
function wgPlaceBridges(F, nodes, edges, rg) {
  const K = WORLD_GRAPH, dmin = K.bridgeDist * K.minDist, out = [];
  for (const e of rg.shuffle(edges.filter(x => x.ponte && x.agua >= K.bridgeTile))) {
    if (out.length >= K.bridges[1]) break;
    const A = nodes[e.a], B = nodes[e.b], len = Math.hypot(B.x - A.x, B.z - A.z), n = Math.max(2, Math.ceil(len / 8)), st = len / n;
    let run = 0, best = 0, end = 0, wet = 0;
    for (let k = 0; k <= n; k++) {
      const w = wfHeight(F, lerp(A.x, B.x, k / n), lerp(A.z, B.z, k / n)) < wfSea() + 1;
      if (w) wet++;
      run = w ? run + 1 : 0; if (run > best) { best = run; end = k }
    }
    const gap = best * st;
    if (gap < K.bridgeTile || gap > K.bridgeMax || wet * st > gap + K.bridgeExtra) continue;   // um vão só (riacho pequeno à parte pode), nem curto nem largo demais
    const t = (end - (best - 1) / 2) / n, x = Math.round(lerp(A.x, B.x, t)), z = Math.round(lerp(A.z, B.z, t));
    if (![].concat(nodes, out).every(o => Math.hypot(o.x - x, o.z - z) >= dmin)) continue;
    out.push({ id: nodes.length + out.length, x, z, mar: false, ponteNode: true, agua: Math.round(gap), ang: Math.atan2(B.z - A.z, B.x - A.x), ends: [A.id, B.id], f: 0.5 });
  }
  for (const p of out) nodes.push(p);
}
// Liga cada tile de ponte SÓ aos seus dois tiles (antes e depois, sem bifurcação): tira as arestas dele e as travessias diretas que passam pelo mesmo vão, põe as
// duas ligações e, se isso soltou algum pedaço do mundo, liga o par mais perto por mar (como wgEdges).
function wgBridgeLinks(F, nodes, edges) {
  const K = WORLD_GRAPH, dseg = (p, a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, t = clamp(((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
    return Math.hypot(p.x - (a.x + dx * t), p.z - (a.z + dz * t));
  };
  let out = edges.filter(e => !nodes[e.a].ponteNode && !nodes[e.b].ponteNode);
  for (const p of nodes) {
    if (!p.ponteNode) continue;
    out = out.filter(e => !(e.ponte && dseg(p, nodes[e.a], nodes[e.b]) < K.minDist * 0.35));
    for (const o of p.ends.map(i => nodes[i])) {
      out.push({ a: Math.min(p.id, o.id), b: Math.max(p.id, o.id), kind: 'trilha', len: Math.round(Math.hypot(p.x - o.x, p.z - o.z)), custo: wgProbe(F, p, o).custo, ponte: false });
    }
  }
  const N = nodes.length;   // travessias de água sem tile que não fazem falta (os dois lados já se ligam por terra) saem, das maiores para as menores
  for (const e of out.filter(x => x.ponte).sort((p, q) => q.agua - p.agua)) {
    const u = Array.from({ length: N }, (_, i) => i), f = i => (u[i] === i ? i : (u[i] = f(u[i])));
    for (const x of out) if (x !== e && x.kind !== 'mar') u[f(x.a)] = f(x.b);
    if (f(e.a) === f(e.b)) out = out.filter(x => x !== e);
  }
  const uf = Array.from({ length: N }, (_, i) => i), find = i => (uf[i] === i ? i : (uf[i] = find(uf[i])));
  for (const e of out) uf[find(e.a)] = find(e.b);
  for (;;) {
    let best = null, bd = 1e9;
    for (let a = 0; a < N; a++) for (let b = a + 1; b < N; b++) {
      const d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].z - nodes[b].z);
      if (find(a) !== find(b) && !nodes[a].ponteNode && !nodes[b].ponteNode && d < bd) { bd = d; best = [a, b] }
    }
    if (!best) break;
    out.push({ a: best[0], b: best[1], kind: 'mar', len: Math.round(bd), custo: bd / K.minDist * K.seaCost, ligacao: true }); uf[find(best[0])] = find(best[1]);
  }
  return out.sort((p, q) => p.a - q.a || p.b - q.b).map((e, id) => Object.assign(e, { id }));
}

// Vizinhança: adj[id] = [{to, e}] (e = índice da aresta). `land` = só arestas de terra (trilha/estrada).
function wgAdj(G) {
  G.adj = G.nodes.map(() => []);
  for (const e of G.edges) { G.adj[e.a].push({ to: e.b, e: e.id }); G.adj[e.b].push({ to: e.a, e: e.id }) }
  return G;
}
const wgLandAdj = (G, id) => G.adj[id].filter(x => G.edges[x.e].kind !== 'mar');
// Arestas de terra entre dois pontos (ou undefined).
const wgEdgeOf = (G, a, b) => { const x = G.adj[a].find(q => q.to === b); return x ? G.edges[x.e] : undefined };

// Massas de terra: n.ilha = índice da componente por arestas de terra (mar = -1); G.ilhas = [{id, tiles, cidades}] (cidades entram depois).
function wgIslands(G) {
  G.ilhas = [];
  for (const n of G.nodes) n.ilha = -1;
  for (const s of G.nodes) {
    if (s.mar || s.ilha >= 0) continue;
    const id = G.ilhas.length, q = [s.id]; s.ilha = id; let tiles = 0;
    while (q.length) { const v = q.pop(); tiles++; for (const x of wgLandAdj(G, v)) if (G.nodes[x.to].ilha < 0) { G.nodes[x.to].ilha = id; q.push(x.to) } }
    G.ilhas.push({ id, tiles, cidades: 0 });
  }
}
// Menor custo de cada ponto até `from` por arestas de terra (Dijkstra simples): {dist, prev}. `pesos` troca o custo da aresta (estrada mais barata).
function wgDijkstra(G, from) {
  const N = G.nodes.length, dist = new Array(N).fill(Infinity), prev = new Array(N).fill(-1), done = new Array(N).fill(false);
  dist[from] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < N; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0) break;
    done[u] = true;
    for (const x of wgLandAdj(G, u)) { const d = dist[u] + G.edges[x.e].custo; if (d < dist[x.to]) { dist[x.to] = d; prev[x.to] = u } }
  }
  return { dist, prev };
}
// Saltos (arestas de terra) de cada ponto até o mais próximo de `srcs` (BFS; Infinity = inalcançável).
function wgHops(G, srcs) {
  const h = new Array(G.nodes.length).fill(Infinity), q = [];
  for (const s of srcs) { h[s] = 0; q.push(s) }
  for (let i = 0; i < q.length; i++) for (const x of wgLandAdj(G, q[i])) if (h[x.to] === Infinity) { h[x.to] = h[q[i]] + 1; q.push(x.to) }
  return h;
}
// Pontos de articulação do grafo de terra (tirá-los parte a massa em duas: os gargalos).
function wgArticulation(G) {
  const land = G.nodes.filter(n => !n.mar).map(n => n.id), comps = skip => {
    const seen = new Set(skip === undefined ? [] : [skip]); let c = 0;
    for (const s of land) { if (seen.has(s)) continue; c++; const q = [s]; seen.add(s); while (q.length) { const v = q.pop(); for (const x of wgLandAdj(G, v)) if (!seen.has(x.to)) { seen.add(x.to); q.push(x.to) } } }
    return c;
  }, c0 = comps();
  const art = new Set(); for (const v of land) if (comps(v) > c0) art.add(v);
  return art;
}

// Quantos tiles de cada tema: os tiles de terra x porcentagem temática (tileThemedPct) repartidos pelo peso de cada tema, no mínimo 1 de cada.
// Cidades: faixa pedida (WORLD_GRAPH.cities), limitada a cityMaxFrac dos temáticos. Devolve {tema: n}.
function wgQuotas(nLand, pct, rg) {
  const K = WORLD_GRAPH, ks = Object.keys(TILE_THEME_WEIGHT), tot = ks.reduce((a, k) => a + TILE_THEME_WEIGHT[k], 0);
  const T = Math.max(ks.length, Math.round(nLand * tileThemedPct(pct) / 100)), q = {};
  for (const k of ks) q[k] = Math.max(1, Math.round(T * TILE_THEME_WEIGHT[k] / tot));
  q.cidade = Math.max(1, Math.min(rg.int(K.cities[0], K.cities[1]), Math.round(T * K.cityMaxFrac)));
  return q;
}
// Adequação do tile ao tema (0 a 1): tileFit (biomas) x terra suficiente na janela (themeLandMin).
function wgFit(n, tema) {
  const lm = WORLD_GRAPH.themeLandMin[tema] || 0;
  return tileFit(tema, n.terr) * (lm ? clamp(n.terr.terra / lm, 0, 1) : 1);
}

// Monta o grafo de um campo. opts = {pct} (porcentagem de tiles temáticos; padrão tileThemedPct). Devolve G (ver wgPack para o que se salva).
function wgBuild(F, opts) {
  opts = opts || {};
  const K = WORLD_GRAPH, t0 = Date.now(), rg = new RNG((F.seed * 977 + 13) >>> 0), L = wgLandGrid(F, K.gridStep), nodes = wgSample(F, L, rg);
  const raw = wgEdges(F, nodes, rg);
  wgPlaceBridges(F, nodes, raw, rg);   // tiles de ponte sobre vãos curtos entre duas terras (acrescentam pontos)
  const edges = wgBridgeLinks(F, nodes, raw);
  for (const n of nodes) {
    n.terr = tileTerrain(F, wfWindow(F, n.x, n.z, TILE_SIZE), K.terrStep); n.tema = n.mar ? 'mar' : n.ponteNode ? 'ponte' : null; n.fit = n.ponteNode ? 1 : 0;
    n.onRoad = false; n.pass = 0;
  }
  const G = wgAdj({ v: 1, seed: F.seed, fmt: F.fmt, dominant: F.dominant, pct: tileThemedPct(opts.pct), S: F.S, tile: TILE_SIZE, nodes, edges });
  wgIslands(G);
  const land = nodes.filter(n => !n.mar && !n.ponteNode), q = wgQuotas(land.length, opts.pct, rg);
  G.quotas = q; G.forcados = [];
  wgPickCities(G, q.cidade);
  wgRoads(G);
  wgPickThemes(G, q);
  wgRoadFill(G);
  for (const n of land) if (!n.tema) n.tema = 'passagem';
  wgCoast(G); wgStart(G);
  G.ms = Date.now() - t0;
  return G;
}

// Cidades: a primeira perto do centro do mundo e de muita terra; as outras vão para o ponto mais afastado das já escolhidas (espalha pelo mundo).
function wgPickCities(G, count) {
  const K = WORLD_GRAPH, C = [], ok = G.nodes.filter(n => !n.mar && wgFit(n, 'cidade') >= K.minFit);
  const pool = ok.length ? ok : G.nodes.filter(n => !n.mar).sort((p, q) => wgFit(q, 'cidade') - wgFit(p, 'cidade')).slice(0, Math.max(count, 1));
  const mid = G.S / 2, spread = n => (C.length ? Math.min(...C.map(c => Math.hypot(c.x - n.x, c.z - n.z))) / (K.minDist * 3) : 1 - Math.hypot(n.x - mid, n.z - mid) / G.S);
  while (C.length < count) {
    let best = null, bs = -1;
    for (const n of pool) {
      if (n.tema) continue;
      const pen = G.adj[n.id].some(x => G.nodes[x.to].tema === 'cidade') ? 1 - K.sameNeighbor : 1;
      const s = (wgFit(n, 'cidade') + clamp(spread(n), 0, 1) * 0.8 + n.terr.terra * 0.2) * pen;
      if (s > bs) { bs = s; best = n }
    }
    if (!best) break;
    best.tema = 'cidade'; best.fit = wgFit(best, 'cidade'); C.push(best);
    if (best.fit < K.minFit && C.length === 1) { best.forcado = true; G.forcados.push('cidade') }
  }
  for (const c of C) G.ilhas[c.ilha].cidades++;
}

// Estradas: cada cidade liga-se às roadLinks cidades mais próximas (em custo) da mesma massa de terra; as arestas desses caminhos viram estrada
// (rota de caravana) e cada ponto conta quantos caminhos passam por ele (n.pass) e se tem estrada (n.onRoad).
function wgRoads(G) {
  const K = WORLD_GRAPH, C = G.nodes.filter(n => n.tema === 'cidade'), done = new Set();
  for (const c of C) {
    const { dist, prev } = wgDijkstra(G, c.id), near = C.filter(o => o !== c && dist[o.id] < Infinity).sort((p, q) => dist[p.id] - dist[q.id]).slice(0, K.roadLinks);
    for (const o of near) {
      const k = Math.min(c.id, o.id) + '_' + Math.max(c.id, o.id);
      if (done.has(k)) continue; done.add(k);
      for (let v = o.id; v >= 0; v = prev[v]) { G.nodes[v].pass++; if (prev[v] >= 0) wgEdgeOf(G, v, prev[v]).kind = 'estrada' }
    }
  }
  for (const e of G.edges) if (e.kind === 'estrada') { G.nodes[e.a].onRoad = true; G.nodes[e.b].onRoad = true }
}

// Pontuação de um tile para um tema (maior = melhor): adequação + a razão estrutural do tema, vezes a penalidade de vizinho do mesmo tema.
function wgScore(G, ctx, n, tema, fit) {
  const K = WORLD_GRAPH, hop = ctx.hops[n.id], passN = n.pass / Math.max(1, ctx.maxPass);
  let s = fit;
  if (tema === 'ponte') s += G.adj[n.id].some(x => G.edges[x.e].ponte) ? 0.8 : 0;
  else if (tema === 'vila') s += hop >= 1 && hop <= 2 ? 0.4 : 0.1;
  else if (tema === 'fortaleza') s += 0.5 * (ctx.art.has(n.id) ? 1 : 0) + 0.5 * passN;
  else if (tema === 'ruinas') s += 0.15 * Math.min(hop === Infinity ? 4 : hop, 4);
  else s += (hop <= 2 ? 0.2 : 0) + (n.onRoad ? 0.1 : 0);   // recursos: perto das cidades e de estrada
  const same = G.adj[n.id].filter(x => G.nodes[x.to].tema === tema).length;
  return s * Math.pow(1 - K.sameNeighbor, same);
}
// Temas pela ordem do mais exigente com o terreno ao mais livre; cada um escolhe, vez por vez, o melhor tile livre com adequação >= minFit. O 1º de
// cada tema, se nenhum chega ao limite, é FORÇADO no de maior adequação (decisão de 2026-11-26: o mundo tem no mínimo 1 de cada tema).
const WG_ORDER = ['mina', 'serraria', 'animais', 'fazenda', 'fortaleza', 'ruinas', 'vila'];
function wgPickThemes(G, q) {
  const K = WORLD_GRAPH, land = G.nodes.filter(n => !n.mar);
  const ctx = { hops: wgHops(G, G.nodes.filter(n => n.tema === 'cidade').map(n => n.id)), art: wgArticulation(G), maxPass: Math.max(0, ...G.nodes.map(n => n.pass)) };
  for (const tema of WG_ORDER) for (let k = 0; k < (q[tema] || 0); k++) {
    const free = land.filter(n => !n.tema), cand = free.map(n => ({ n, fit: wgFit(n, tema) }));
    let pick = null, bs = -1;
    for (const c of cand) if (c.fit >= K.minFit) { const s = wgScore(G, ctx, c.n, tema, c.fit); if (s > bs) { bs = s; pick = c } }
    if (!pick && k === 0 && cand.length) { pick = cand.reduce((a, b) => (b.fit > a.fit ? b : a)); pick.forca = true }
    if (!pick) break;
    pick.n.tema = tema; pick.n.fit = pick.fit;
    if (pick.forca) { pick.n.forcado = true; G.forcados.push(tema) }
  }
}
// Tile de terra com estrada e sem tema (a passagem fica fora das rotas de caravana): ganha o tema de maior pontuação entre os de recurso e a vila.
function wgRoadFill(G) {
  const K = WORLD_GRAPH, ctx = { hops: wgHops(G, G.nodes.filter(n => n.tema === 'cidade').map(n => n.id)), art: new Set(), maxPass: 1 };
  for (const n of G.nodes) {
    if (n.mar || n.tema || !n.onRoad) continue;
    let best = 'vila', bs = -1;
    for (const t of ['vila', 'fazenda', 'mina', 'serraria', 'animais']) { const f = wgFit(n, t); if (f < K.minFit) continue; const s = wgScore(G, ctx, n, t, f) - (t === 'vila' ? 0 : 0.05); if (s > bs) { bs = s; best = t } }
    n.tema = best; n.fit = wgFit(n, best); n.extra = true;
  }
}
// Tiles de terra que tocam o mar (n.costa): lugar de porto e de embarque.
function wgCoast(G) {
  for (const n of G.nodes) n.costa = !n.mar && G.adj[n.id].some(x => G.nodes[x.to].mar);
}
// Ilha inicial: a cidade inicial fica na maior massa de terra (a mais perto do centro). Se a ilha tem poucos tiles ou cidades (startIsland), vira porto.
function wgStart(G) {
  const C = G.nodes.filter(n => n.tema === 'cidade'); if (!C.length) { G.inicio = null; return }
  const mid = G.S / 2, home = C.slice().sort((p, q) => G.ilhas[q.ilha].tiles - G.ilhas[p.ilha].tiles || Math.hypot(p.x - mid, p.z - mid) - Math.hypot(q.x - mid, q.z - mid))[0];
  const il = G.ilhas[home.ilha], si = WORLD_GRAPH.startIsland;
  home.home = true; home.porto = il.tiles < si.tiles || il.cidades < si.cities;
  G.inicio = { id: home.id, ilha: il.id, tiles: il.tiles, cidades: il.cidades, porto: home.porto };
}

// Abertura do tile `id` em direção ao vizinho `to`: onde a aresta (reta entre os centros) cruza a borda da janela de lado `size`, no formato de
// tileDescribe().saidas: {dir, para:[id], x, z (locais), ix, iz (direção para dentro), side, edge, terra}. Escorrega pela borda até achar terra.
function wgOpening(G, F, id, to, size) {
  size = size || TILE_SIZE;
  const A = G.nodes[id], B = G.nodes[to], dx = B.x - A.x, dz = B.z - A.z, len = Math.hypot(dx, dz) || 1, hs = size / 2 - 2;
  const k = hs / Math.max(Math.abs(dx), Math.abs(dz), 1), side = Math.abs(dx) >= Math.abs(dz) ? (dx > 0 ? 'E' : 'W') : (dz > 0 ? 'S' : 'N');
  const ox = A.x - size / 2, oz = A.z - size / 2, along = side === 'E' || side === 'W' ? 'z' : 'x';
  let lx = size / 2 + dx * k, lz = size / 2 + dz * k, terra = wfHeight(F, ox + lx, oz + lz) >= wfSea() + 1;
  for (let s = 8; !terra && s <= WORLD_GRAPH.openSlide; s += 8) for (const sg of [1, -1]) {
    const px = along === 'x' ? lx + s * sg : lx, pz = along === 'z' ? lz + s * sg : lz;
    if (px > 2 && px < size - 3 && pz > 2 && pz < size - 3 && wfHeight(F, ox + px, oz + pz) >= wfSea() + 1) { lx = px; lz = pz; terra = true; break }
  }
  const e = wgEdgeOf(G, id, to);
  return { dir: side, para: [to], x: Math.round(lx), z: Math.round(lz), ix: -dx / len, iz: -dz / len, side, edge: e ? e.id : -1, terra };
}
// Todas as aberturas de um tile (uma por aresta de terra: trilha ou estrada).
const wgOpenings = (G, F, id, size) => wgLandAdj(G, id).map(x => wgOpening(G, F, id, x.to, size));

// O que se salva do grafo (rascunho para o SAVE_VERSION da etapa 8): pontos e arestas com o essencial; o terreno (terr) se recalcula do campo.
function wgPack(G) {
  return {
    v: 1, seed: G.seed, fmt: G.fmt, dom: G.dominant, pct: G.pct, S: G.S, tile: G.tile,
    nodes: G.nodes.map(n => [n.x, n.z, n.mar ? 1 : 0, n.tema, Math.round(n.fit * 100) / 100, (n.forcado ? 1 : 0) | (n.home ? 2 : 0) | (n.porto ? 4 : 0) | (n.extra ? 8 : 0) | (n.ponteNode ? 16 : 0), n.agua || 0, Math.round((n.ang || 0) * 1000) / 1000]),
    edges: G.edges.map(e => [e.a, e.b, e.kind, e.len, e.agua || 0, e.ponte ? 1 : 0])
  };
}
// Reconstrói o grafo salvo (sem refazer o sorteio: o resultado não depende das constantes de hoje). Precisa do campo (wfCreate com seed, fmt e dom).
function wgUnpack(d, F) {
  const nodes = d.nodes.map((a, id) => ({ id, x: a[0], z: a[1], mar: !!a[2], tema: a[3], fit: a[4], forcado: !!(a[5] & 1), home: !!(a[5] & 2), porto: !!(a[5] & 4), extra: !!(a[5] & 8), ponteNode: !!(a[5] & 16), agua: a[6] || 0, ang: a[7] || 0,
    terr: tileTerrain(F, wfWindow(F, a[0], a[1], d.tile), WORLD_GRAPH.terrStep), onRoad: false, pass: 0 }));
  const edges = d.edges.map((a, id) => ({ id, a: a[0], b: a[1], kind: a[2], len: a[3], agua: a[4], ponte: !!a[5], custo: 0 }));
  const G = wgAdj({ v: d.v, seed: d.seed, fmt: d.fmt, dominant: d.dom, pct: d.pct, S: d.S, tile: d.tile, nodes, edges });
  for (const e of edges) if (e.kind === 'estrada') { nodes[e.a].onRoad = true; nodes[e.b].onRoad = true }
  wgIslands(G);
  for (const n of nodes) if (n.tema === 'cidade') G.ilhas[n.ilha].cidades++;
  wgCoast(G);
  const h = nodes.find(n => n.home); G.inicio = h ? { id: h.id, ilha: h.ilha, tiles: G.ilhas[h.ilha].tiles, cidades: G.ilhas[h.ilha].cidades, porto: h.porto } : null;
  return G;
}
