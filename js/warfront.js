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

// Busca A* na grade de WAR.front.cell blocos. water: custo extra por célula de água (null = água proibida); avoid: folga, em
// blocos, que a rota guarda dos obstáculos (cidade é um quadrado: distância de xadrez; POI é um círculo). pull: pontos {x, z}
// (POIs aproveitáveis e clareiras) perto dos quais o custo da célula cai para WAR.front.pullCost (a rota prefere passar por eles).
// Devolve a lista de células [ix, iz] da origem ao alvo, ou null.
function wfSearch(a, b, blk, water, avoid, pull) {
  const F = WAR.front, S = F.cell, N = Math.floor(W / S), cell = v => clamp(Math.floor(v / S), 0, N - 1);
  const wat = (i, j) => H[clamp(j * S + S / 2 | 0, 0, W - 1) * W + clamp(i * S + S / 2 | 0, 0, W - 1)] < SEA;
  const bad = new Uint8Array(N * N);
  for (const o of blk) {
    const r = wfRad(o) + avoid, sq = o.half !== undefined, i0 = cell(o.cx - r), i1 = cell(o.cx + r);
    const j0 = cell(o.cz - r), j1 = cell(o.cz + r);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const dx = Math.abs(i * S + S / 2 - o.cx), dz = Math.abs(j * S + S / 2 - o.cz);
      if ((sq ? Math.max(dx, dz) : Math.hypot(dx, dz)) < r) bad[j * N + i] = 1;
    }
  }
  const disc = new Float32Array(N * N).fill(1), pr = F.pullRadius;
  for (const q of pull || []) {
    for (let j = cell(q.z - pr); j <= cell(q.z + pr); j++) for (let i = cell(q.x - pr); i <= cell(q.x + pr); i++) {
      if (Math.hypot(i * S + S / 2 - q.x, j * S + S / 2 - q.z) < pr) disc[j * N + i] = F.pullCost;
    }
  }
  const si = cell(a.cx), sj = cell(a.cz), gi = cell(b.cx), gj = cell(b.cz);
  bad[sj * N + si] = bad[gj * N + gi] = 0;
  const g = new Float32Array(N * N).fill(Infinity), from = new Int32Array(N * N).fill(-1), done = new Uint8Array(N * N);
  const hp = new Heap(), hF = (i, j) => Math.hypot(gi - i, gj - j) * S * Math.min(1, F.pullCost);   // o desconto não pode tornar a estimativa maior que o custo
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
      const c = g[k] + (di && dj ? 1.4142 : 1) * S * (w ? 1 + water : 1) * disc[nk];
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

// Rota por terra de a até b (objetos com cx, cz): vão de água só até WAR.front.waterMax; senão contorna. Duas passadas de
// folga: primeiro com WAR.front.avoid dos obstáculos; se não houver caminho, sem folga (colada, mas fora deles). null = sem caminho.
// pull: ver wfSearch. Devolve [{x, z}] com a origem e o alvo nas pontas.
function wfRoute(a, b, blk, pull) {
  const F = WAR.front;
  let cells = null;
  for (const avoid of [F.avoid, 0]) {
    cells = wfSearch(a, b, blk, F.waterCost, avoid, pull);
    if (cells && wfWaterRun(cells) > F.waterMax) cells = wfSearch(a, b, blk, null, avoid, pull);
    if (cells) break;
  }
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
  for (const e of pl.war) {   // POIs de guerra previstos: quadrado do raio, tracejado
    const h = POI_DEFS[e.type].r * s;
    g.setLineDash([4 * k, 3 * k]); g.strokeStyle = '#7fd0ff'; g.lineWidth = 2 * k;
    g.strokeRect(e.cx * s - h, e.cz * s - h, 2 * h, 2 * h);
  }
  g.restore();
}

// Desenha a rota no minimapa (g já está transladado e rotacionado em torno do jogador; s = escala do minimapa).
// Só se WAR.front.minimap estiver ligado. Linha tracejada vermelha e círculo dourado nos POIs da cadeia.
function warFrontDrawMini(g, s) {
  const pl = WF.plan;
  if (!pl || !WAR.front.minimap) return;
  g.save();
  g.lineWidth = 2.5; g.strokeStyle = '#ff4a3a'; g.setLineDash([6, 4]); g.lineJoin = 'round';
  g.beginPath();
  pl.path.forEach((q, i) => i ? g.lineTo((q.x - P.x) * s, (q.z - P.z) * s) : g.moveTo((q.x - P.x) * s, (q.z - P.z) * s));
  g.stroke(); g.setLineDash([]);
  g.strokeStyle = '#ffd23a'; g.lineWidth = 1.8;
  for (const p of pl.chain) { g.beginPath(); g.arc((p.cx - P.x) * s, (p.cz - P.z) * s, 8, 0, 6.283); g.stroke(); }
  g.restore();
}

// Atalho de teste (console): wfBuild() constrói os POIs de guerra do último plano de wfTest; wfBuild('limpar') os remove.
function wfBuild(q) {
  if (q === 'limpar') return warFrontClear();
  if (!WF.plan) return console.log('Rode wfTest(cidade) antes.');
  console.log(warFrontBuild(WF.plan) + ' POIs de guerra construídos.');
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
      Math.round(pl.ts[i] * 100) + '%)').join(' → ') || 'vazia') + ' | POIs de guerra: ' + pl.war.length);
  return pl;
}

// Plano da frente contra um alvo. Origem = cidade sua mais perto do alvo. Cadeia = POIs permanentes (sem ruínas, sem POI de
// guerra, sem o próprio alvo) a até WAR.front.band da rota, dono permitido: você, bandidos, livre ou o inimigo (fid).
function warFrontPlan(fid, kind, ref) {
  const mine = playerCities();
  if (!ref || !mine.length) return null;
  const origin = mine.reduce((m, c) => wfDist(c, ref) < wfDist(m, ref) ? c : m);
  const blk = wfBlockers(fid, origin, ref), ok = o => o === 'player' || o === 'bandit' || o === 'free' || o === fid;
  const cand = warPois().filter(p => p !== ref && !POI_DEFS[p.type].war && ok(p.owner));
  // pull: onde a rota gosta de passar (POIs aproveitáveis e clareiras ainda sem POI de guerra)
  const pull = cand.map(p => ({ x: p.cx, z: p.cz }))
    .concat((WORLD.warSites || []).filter(q => !WORLD.pois.some(p => p.cx === q.x && p.cz === q.z)));
  let path = wfRoute(origin, ref, blk, pull), t1 = null;
  if (!path) return null;
  // A cadeia sai da rota; a rota refeita por ela passa perto de outros POIs, então uma segunda passada os acrescenta.
  for (let pass = 0; pass < 2; pass++) {
    const cum = [0];
    for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z));
    const list = [];
    for (const p of cand) {
      const a = wfAlong(path, cum, p.cx, p.cz);
      if (a.d <= WAR.front.band) list.push({ p, t: a.t });
    }
    list.sort((x, y) => x.t - y.t);
    // A rota PASSA pelos POIs da cadeia (eles são os entrepostos) e, depois, também pelos POIs de guerra planejados.
    const th = wfThread(origin, ref, blk, list.map(o => o.p), pull);
    if (!th) { if (t1) break; return null; }
    const same = t1 && t1.stops.length === th.stops.length && t1.stops.every((p, i) => p === th.stops[i]);
    t1 = th; path = th.path;
    if (same) break;
  }
  if (!t1) return null;
  const plan = { kind, fid, target: ref, origin, path: t1.path, len: t1.len, chain: t1.stops,
    ts: t1.at.map(v => v / (t1.len || 1)), war: [] };
  const war = wfFill(plan);
  if (!war.length) return plan;
  const stops = plan.chain.map((p, i) => ({ cx: p.cx, cz: p.cz, o: p, s: plan.ts[i], w: false }))
    .concat(war.map(e => ({ cx: e.cx, cz: e.cz, o: e, s: e.t, w: true }))).sort((x, y) => x.s - y.s);
  const t2 = wfThread(origin, ref, blk, stops, pull);
  if (!t2) return plan;   // sem rota passando pelos POIs de guerra: fica a rota só com a cadeia
  plan.path = t2.path; plan.len = t2.len; plan.chain = []; plan.ts = []; plan.war = [];
  t2.stops.forEach((st, i) => {
    const t = t2.at[i] / (t2.len || 1);
    if (st.w) { st.o.t = t; plan.war.push(st.o); }
    else { plan.chain.push(st.o); plan.ts.push(t); }
  });
  return plan;
}

// Refaz a rota trecho a trecho: origem → parada 1 → ... → alvo. Cada parada tem cx, cz. Parada sem rota por terra a partir da
// anterior sai. Devolve {path, len, stops (as que ficaram), at (distância de cada uma desde a origem)} ou null (sem rota ao alvo).
function wfThread(origin, ref, blk, stops, pull) {
  const full = [{ x: origin.cx, z: origin.cz }], kept = [], at = [];
  let cur = origin, len = 0;
  const add = seg => {
    for (let k = 1; k < seg.length; k++) {
      const q = full[full.length - 1];
      len += Math.hypot(seg[k].x - q.x, seg[k].z - q.z); full.push(seg[k]);
    }
  };
  for (const st of stops) {
    const seg = wfRoute(cur, st, blk, pull);
    if (!seg) continue;
    add(seg); kept.push(st); at.push(len); cur = st;
  }
  const last = wfRoute(cur, ref, blk, pull);
  if (!last) return null;
  add(last);
  return { path: full, len, stops: kept, at };
}

// ---------- POIs de guerra: planejar os vazios da rota ----------
// Ponto e direção da rota na distância s (blocos) desde a origem.
function wfPointAt(path, s) {
  let acc = 0;
  for (let k = 1; k < path.length; k++) {
    const p = path[k - 1], q = path[k], L = Math.hypot(q.x - p.x, q.z - p.z) || 1;
    if (acc + L >= s || k === path.length - 1) {
      const u = clamp((s - acc) / L, 0, 1);
      return { x: p.x + (q.x - p.x) * u, z: p.z + (q.z - p.z) * u, tx: (q.x - p.x) / L, tz: (q.z - p.z) / L };
    }
    acc += L;
  }
}

// Terrenos de guerra: clareiras reservadas na geração do mundo (chamada por genPOIs, poi.js), no fim, para não mudar nada que já
// existia. O terreno NÃO é mexido: só as árvores, pedras e plantas ficam de fora (genDecor, world.js) e o lugar é de terra
// firme, sem água. Ficam vazias até uma guerra pôr ali um POI de guerra, que se adapta ao chão (poiAdaptBc, pois.js).
function genWarSites(taken) {
  const F = WAR.front, S = WORLD.warSites = [];
  if (WORLD.showcaseMode) return;
  const rng = new RNG((WORLD.seed * 977 + 13) >>> 0), r = POI_DEFS.fortcamp.r;
  // 'taken' começa pelas cidades (círculos): elas saem daqui e são medidas como quadrados (distância de xadrez), senão a
  // clareira entra pelos cantos da muralha. Baús escondidos (r 4) só pedem uma folga curta.
  const rest = taken.slice(WORLD.cities.length), big = rest.filter(q => q.r > 4), tiny = rest.filter(q => q.r <= 4);
  const nearCity = (x, z) => WORLD.cities.some(c => Math.max(Math.abs(c.cx - x), Math.abs(c.cz - z)) < c.half + r + F.gap);
  for (let t = 0; t < F.siteTries && S.length < F.sites; t++) {
    const x = rng.int(30, W - 30), z = rng.int(30, W - 30);
    const y = spotOK(x, z, r + 1, big, F.gap + r, F.siteRange + (t > F.siteTries / 2 ? 6 : 0));   // mais tarde, aceita mais desnível (o POI se adapta ao chão)
    if (y === null || nearCity(x, z) || tiny.some(q => Math.hypot(q.x - x, q.z - z) < q.r + r + 3)) continue;
    const q = { x, z, r };
    big.push(q); S.push({ x, z, y });
  }
}
// Terreno de guerra livre mais perto de (x, z), até WAR.front.side blocos, que não esteja em 'used'; null se não houver.
function wfSiteNear(x, z, used) {
  let best = null, bd = WAR.front.side;
  for (const q of WORLD.warSites || []) {
    const d = Math.hypot(q.x - x, q.z - z);
    if (d >= bd || used.some(u => u.cx === q.x && u.cz === q.z) || WORLD.pois.some(p => p.cx === q.x && p.cz === q.z)) continue;
    best = q; bd = d;
  }
  return best;
}

// Preenche os vazios da rota com POIs de guerra (plano puro: {type, cx, cz, y, owner, t}). Cada vazio entre dois vizinhos
// (cidade sua, POIs da cadeia, alvo) recebe quantos quadrados de 2 × raio + gap couberem, espaçados por igual; cada um usa o
// terreno de guerra livre mais perto do ponto ideal. Tipo: warCampChance. Dono: o do vizinho mais perto se for você ou o
// inimigo; senão pela metade da rota. No máximo WAR.front.maxWarPois.
function wfFill(plan) {
  const F = WAR.front, fid = plan.fid, len = plan.len, rw = POI_DEFS.fortcamp.r;
  const rng = new RNG((WORLD.seed * 71 + fid * 13 + 7) >>> 0), out = [];
  const tr = plan.target, nodes = [{ s: 0, r: plan.origin.half, o: 'player' }];
  plan.chain.forEach((p, i) => nodes.push({ s: plan.ts[i] * len, r: POI_DEFS[p.type].r, o: p.owner, poi: true }));
  nodes.push({ s: len, r: wfRad(tr), o: fid, poi: plan.kind === 'poi' });
  for (let i = 0; i + 1 < nodes.length && out.length < F.maxWarPois; i++) {
    const A = nodes[i], B = nodes[i + 1], from = A.s + A.r, L = B.s - B.r - from;
    const n = Math.floor((L - F.gap) / (2 * rw + F.gap));
    for (let k = 0; k < n && out.length < F.maxWarPois; k++) {
      const s = from + L * (k + 1) / (n + 1), t = s / len, near = s - A.s < B.s - s ? A : B, c = wfPointAt(plan.path, s);
      const site = wfSiteNear(c.x, c.z, out);
      if (!site) continue;   // sem terreno de guerra perto: o quadrado fica vazio
      const type = rng.next() < warCampChance(t, (A.poi && A.o === fid) || (B.poi && B.o === fid)) ? 'fortcamp' : 'trench';
      const own = near.o === 'player' || near.o === fid ? near.o : (t < 0.5 ? 'player' : fid);
      out.push({ type, cx: site.x, cz: site.z, y: site.y, owner: own, t });
    }
  }
  return out;
}

// ---------- POIs de guerra: construir, remover e restaurar ----------
// Cria um POI de guerra em jogo (num terreno de guerra já nivelado, sobre uma base de terra, sem mexer na malha) e o liga ao mundo. e = {id, type, cx, cz, y, owner}.
// O dono entra direto (sem a espera de poiOwnerChanged): os soldados da guarnição moram nele desde a declaração.
function wfMake(e) {
  const p = { id: e.id, type: e.type, cx: e.cx, cz: e.cz, y: e.y, biome: B[e.cz * W + e.cx], owner: e.owner, runtime: true };
  poiBuild(p);
  WORLD.pois.push(p);
  STATE.pois = STATE.pois || {};
  if (STATE.pois[p.id] !== undefined) p.owner = STATE.pois[p.id]; else STATE.pois[p.id] = p.owner;
  poiPaint(p); poiGarrisonSync(p);
  return p;
}
// Constrói os POIs de guerra do plano e grava a frente em STATE.war.camps[fid].front (cria a campanha se faltar).
function warFrontBuild(plan) {
  const fid = plan.fid, camps = warX().camps;
  warFrontClear(fid);
  const used = new Set(WORLD.pois.map(p => p.id));
  let id = 700;
  for (const e of plan.war) { while (used.has(id)) id++; e.id = id; used.add(id); }
  const camp = camps[fid] || (camps[fid] = { kind: 'attack', since: STATE.round, allies: { player: [], enemy: [] } });
  camp.front = { kind: plan.kind, targetId: plan.target.id, originId: plan.origin.id,
    path: plan.path.map(q => [Math.round(q.x), Math.round(q.z)]), chain: plan.chain.map(p => p.id),
    war: plan.war.map(e => ({ id: e.id, type: e.type, cx: e.cx, cz: e.cz, y: e.y, owner: e.owner })) };
  for (const e of plan.war) wfMake(e);
  return plan.war.length;
}
// Remove um POI de guerra do mundo: guarnição, moradores, malha, colisões e entradas de estado.
function wfUnmake(p) {
  poiGarrisonRemove(p); poiCivRemove(p);
  for (const o of p.sceneObjs || []) scene.remove(o);
  if (p.mesh) p.mesh.geometry.dispose();
  if (p.flagMat) p.flagMat.dispose();
  for (const b of p.cols || []) Col.remove(b);
  const i = WORLD.pois.indexOf(p);
  if (i >= 0) WORLD.pois.splice(i, 1);
  delete STATE.pois[p.id];
  const X = poiX();
  for (const k of ['seen', 'since', 'conq', 'clr']) if (X[k]) delete X[k][p.id];
}
// Remove os POIs de guerra da frente de fid (sem fid: de todas) e apaga a frente do estado. Chamada quando a guerra acaba.
function warFrontClear(fid) {
  const camps = warX().camps;
  for (const f of fid === undefined ? Object.keys(camps) : [fid]) {
    const fr = camps[f] && camps[f].front;
    if (!fr) continue;
    for (const e of fr.war || []) { const p = WORLD.pois.find(q => q.id === e.id); if (p) wfUnmake(p); }
    delete camps[f].front;
  }
}
// Reconstrói os POIs de guerra das frentes salvas (o mundo é refeito pela semente): applySave, depois das relações.
function warFrontRestore() {
  for (const fid in warX().camps) {
    for (const e of (warX().camps[fid].front || {}).war || []) if (!WORLD.pois.some(p => p.id === e.id)) wfMake(e);
  }
}
