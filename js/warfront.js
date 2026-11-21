'use strict';
// ---------- Frente da guerra: rota e cadeia de POIs (Fase 6, feature 36; docs/features/3_frente-da-guerra.md) ----------
// Cálculo puro: não toca no mundo nem no estado. Números em WAR.front (js/modifiers/war-modifiers.js).
// warFrontPlan(fid, kind, ref) -> {kind, fid, target, origin, path:[{x,z}], len, chain:[POI], ts:[0..1], war:[]} ou null.
//   kind 'city' (ref = cidade do inimigo) ou 'poi' (ref = POI permanente dele); origin = cidade sua mais perto do alvo;
//   path = rota por terra (centros de células, da origem ao alvo); chain = POIs permanentes na faixa da rota, em ordem;
//   ts = posição de cada um na rota (0 = origem, 1 = alvo); war = POIs de guerra (preenchidos na tarefa 3).

// Alvo e origem usam o centro (cx, cz) da cidade ou do POI.
const wfDist = (a, b) => Math.hypot(a.cx - b.cx, a.cz - b.cz);
// Raio de bloqueio de um obstáculo (cidade: half; POI: raio do tipo).
const wfRad = o => o.half !== undefined ? o.half : POI_DEFS[o.type].r;

// Obstáculos da rota: cidades e POIs de TERCEIROS (fora da guerra). Bandidos, livres, seus e do inimigo não bloqueiam.
function wfBlockers(fid, origin, target) {
  const out = [];
  for (const c of WORLD.cities) {
    if (c === origin || c === target || c.owner === 'player' || (c.owner === 'enemy' && c.fid === fid)) continue;
    out.push(c);
  }
  for (const p of warPois()) {
    if (p === target || typeof p.owner !== 'number' || p.owner === fid) continue;
    out.push(p);
  }
  return out;
}

// Busca A* na grade de WAR.front.cell blocos. water: custo extra por célula de água (null = água proibida).
// Devolve a lista de células [ix, iz] da origem ao alvo, ou null.
function wfSearch(a, b, blk, water) {
  const F = WAR.front, S = F.cell, N = Math.floor(W / S), cell = v => clamp(Math.floor(v / S), 0, N - 1);
  const wat = (i, j) => H[clamp(j * S + S / 2 | 0, 0, W - 1) * W + clamp(i * S + S / 2 | 0, 0, W - 1)] < SEA;
  const bad = new Uint8Array(N * N);
  for (const o of blk) {
    const r = wfRad(o) + F.avoid, i0 = cell(o.cx - r), i1 = cell(o.cx + r), j0 = cell(o.cz - r), j1 = cell(o.cz + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (Math.hypot(i * S + S / 2 - o.cx, j * S + S / 2 - o.cz) < r) bad[j * N + i] = 1;
    }
  }
  const si = cell(a.cx), sj = cell(a.cz), gi = cell(b.cx), gj = cell(b.cz);
  bad[sj * N + si] = bad[gj * N + gi] = 0;
  const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N);
  const hp = new Heap(), hF = (i, j) => Math.hypot(gi - i, gj - j) * S;
  g[sj * N + si] = 0; hp.push(hF(si, sj), sj * N + si);
  while (hp.size) {
    const k = hp.pop()[1];
    if (done[k]) continue;
    done[k] = 1;
    const i = k % N, j = (k - i) / N;
    if (i === gi && j === gj) {
      const out = [];
      for (let q = k; q >= 0; q = from[q]) out.push([q % N, (q - q % N) / N]);
      return out.reverse();
    }
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ni = i + di, nj = j + dj, nk = nj * N + ni;
      if ((!di && !dj) || ni < 0 || nj < 0 || ni >= N || nj >= N || bad[nk] || done[nk]) continue;
      if (di && dj && (bad[j * N + ni] || bad[nj * N + i])) continue;   // sem cortar quina de obstáculo
      const w = wat(ni, nj);
      if (w && water === null) continue;
      const c = g[k] + (di && dj ? 1.4142 : 1) * S * (w ? 1 + water : 1);
      if (c < g[nk]) { g[nk] = c; from[nk] = k; hp.push(c + hF(ni, nj), nk); }
    }
  }
  return null;
}

// Maior vão contínuo de água, em blocos, ao longo da rota (células).
function wfWaterRun(cells) {
  const S = WAR.front.cell;
  let run = 0, best = 0;
  for (const [i, j] of cells) {
    if (H[Math.min(W - 1, j * S + S / 2 | 0) * W + Math.min(W - 1, i * S + S / 2 | 0)] < SEA) best = Math.max(best, ++run);
    else run = 0;
  }
  return best * S;
}

// Rota por terra de a até b (objetos com cx, cz): vão de água só até WAR.front.waterMax; senão contorna. null = sem caminho.
// Devolve [{x, z}] com a origem e o alvo nas pontas.
function wfRoute(a, b, blk) {
  const F = WAR.front;
  let cells = wfSearch(a, b, blk, F.waterCost);
  if (cells && wfWaterRun(cells) > F.waterMax) cells = wfSearch(a, b, blk, null);
  if (!cells) return null;
  const S = F.cell, pts = cells.map(([i, j]) => ({ x: i * S + S / 2, z: j * S + S / 2 }));
  pts[0] = { x: a.cx, z: a.cz }; pts[pts.length - 1] = { x: b.cx, z: b.cz };
  return pts;
}

// Posição de um ponto na rota: distância mínima à rota (d) e fração do comprimento do ponto mais próximo (t, 0 a 1).
function wfAlong(path, cum, x, z) {
  let d = Infinity, at = 0;
  for (let k = 1; k < path.length; k++) {
    const p = path[k - 1], q = path[k], sx = q.x - p.x, sz = q.z - p.z, L2 = sx * sx + sz * sz || 1;
    const u = clamp(((x - p.x) * sx + (z - p.z) * sz) / L2, 0, 1), dd = Math.hypot(x - p.x - sx * u, z - p.z - sz * u);
    if (dd < d) { d = dd; at = cum[k - 1] + Math.sqrt(L2) * u; }
  }
  return { d, t: at / (cum[cum.length - 1] || 1) };
}

// Plano mostrado no mapa grande (wfTest o define; a tarefa 4 passa a usá-lo na previsão). null = nada desenhado.
const WF = { plan: null };
// Desenha no mapa grande (g, escala s, fator k de drawBigMap) a rota tracejada e destaca a cadeia numerada.
function warFrontDraw(g, s, k) {
  const pl = WF.plan;
  if (!pl) return;
  g.save();
  g.lineWidth = 3 * k; g.strokeStyle = '#ff4a3a'; g.setLineDash([8 * k, 6 * k]); g.lineCap = 'round';
  g.beginPath();
  pl.path.forEach((q, i) => i ? g.lineTo(q.x * s, q.z * s) : g.moveTo(q.x * s, q.z * s));
  g.stroke(); g.setLineDash([]);
  g.font = 'bold ' + Math.round(12 * k) + 'px monospace'; g.textAlign = 'center'; g.lineWidth = 3;
  pl.chain.forEach((p, i) => {
    const x = p.cx * s, y = p.cz * s;
    g.strokeStyle = '#ffd23a'; g.beginPath(); g.arc(x, y, 11 * k, 0, 6.283); g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.strokeText(i + 1, x, y + 22 * k); g.fillText(i + 1, x, y + 22 * k);
  });
  g.restore();
}

// Atalho de teste (console): wfTest('Nome') ou wfTest(id) para uma cidade inimiga; sem argumento lista os nomes.
// Imprime origem, tamanho da rota e cadeia, desenha a rota no mapa grande; devolve o plano. wfTest('limpar') apaga a rota do mapa.
function wfTest(q) {
  if (q === 'limpar') return void (WF.plan = null);
  // inimigos: facções em guerra com você (STATE.rel[fid].war); sem nenhuma, todas as cidades NPC
  const at = f => (STATE.rel[f.id] || {}).war, ws = WORLD.factions.filter(at);
  const L = WORLD.cities.filter(c => c.owner === 'enemy' && !c.rebel && (!ws.length || ws.some(f => f.id === c.fid)));
  if (q === undefined) return console.log(L.map(c => c.id + ' ' + c.name + ' (fac. ' + c.fid + ')').join(' | ') || 'nenhuma');
  const c = L.find(x => x.id === q || x.name.toLowerCase() === String(q).toLowerCase());
  if (!c) return console.log('Cidade não achada. Use wfTest() para listar.');
  const pl = WF.plan = warFrontPlan(c.fid, 'city', c);
  if (!pl) return console.log('Sem rota para ' + c.name);
  console.log('Origem: ' + pl.origin.name + ' | rota: ' + Math.round(pl.len) + ' blocos | cadeia: ' +
    (pl.chain.map((p, i) => POI_DEFS[p.type].n + '#' + p.id + ' (' + poiOwnerName(p.owner) + ', ' +
      Math.round(pl.ts[i] * 100) + '%)').join(' → ') || 'vazia'));
  return pl;
}

// Plano da frente contra um alvo. Origem = cidade sua mais perto do alvo. Cadeia = POIs permanentes (sem ruínas, sem POI de
// guerra, sem o próprio alvo) a até WAR.front.band da rota, dono permitido: você, bandidos, livre ou o inimigo (fid).
function warFrontPlan(fid, kind, ref) {
  const mine = playerCities();
  if (!ref || !mine.length) return null;
  const origin = mine.reduce((m, c) => wfDist(c, ref) < wfDist(m, ref) ? c : m);
  const path = wfRoute(origin, ref, wfBlockers(fid, origin, ref));
  if (!path) return null;
  const cum = [0];
  for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z));
  const ok = o => o === 'player' || o === 'bandit' || o === 'free' || o === fid;
  const list = [];
  for (const p of warPois()) {
    if (p === ref || POI_DEFS[p.type].war || !ok(p.owner)) continue;
    const a = wfAlong(path, cum, p.cx, p.cz);
    if (a.d <= WAR.front.band) list.push({ p, t: a.t });
  }
  list.sort((x, y) => x.t - y.t);
  // A rota PASSA pelos POIs da cadeia (eles são os entrepostos): refaz trecho a trecho origem → POI 1 → ... → alvo.
  // POI que não tem rota por terra a partir do anterior sai da cadeia.
  const blk = wfBlockers(fid, origin, ref), full = [path[0]], chain = [], at = [];
  let cur = origin, len = 0;
  const add = seg => {
    for (let k = 1; k < seg.length; k++) {
      const q = full[full.length - 1];
      len += Math.hypot(seg[k].x - q.x, seg[k].z - q.z); full.push(seg[k]);
    }
  };
  for (const { p } of list) {
    const seg = wfRoute(cur, p, blk);
    if (!seg) continue;
    add(seg); chain.push(p); at.push(len); cur = p;
  }
  const last = wfRoute(cur, ref, blk);
  if (!last) return null;
  add(last);
  return { kind, fid, target: ref, origin, path: full, len, chain, ts: at.map(v => v / (len || 1)), war: [] };
}
