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
  if (!pl) return console.log('Sem rota para ' + c.name + ': ' + warFrontCheck(c.fid, 'city', c).erro.replace(/<\/?b>/g, ''));
  console.log('Origem: ' + pl.origin.name + ' | rota: ' + Math.round(pl.len) + ' blocos | cadeia: ' +
    (pl.chain.map((p, i) => POI_DEFS[p.type].n + '#' + p.id + ' (' + poiOwnerName(p.owner) + ', ' +
      Math.round(pl.ts[i] * 100) + '%)').join(' → ') || 'vazia') + ' | POIs de guerra: ' + pl.war.length);
  return pl;
}

// Por que não há rota até o alvo? Refaz a rota SEM obstáculos de terceiros: se ela existe, o culpado é o obstáculo (cidade ou POI de
// fora da guerra) que ela atravessa, o mais perto da origem; se não existe, é água demais. Devolve {tipo:'city'|'poi', nome, fac,
// fid} ou {agua:true}; null se não há origem (você não tem cidade).
function warFrontBlocker(fid, kind, ref) {
  const mine = playerCities();
  if (!ref || !mine.length) return null;
  const origin = mine.reduce((m, c) => wfDist(c, ref) < wfDist(m, ref) ? c : m);
  const path = wfRoute(origin, ref, [], []);
  if (!path) return { agua: true };
  const cum = [0];
  for (let k = 1; k < path.length; k++) cum.push(cum[k - 1] + Math.hypot(path[k].x - path[k - 1].x, path[k].z - path[k - 1].z));
  let best = null, bt = 2;
  for (const o of wfBlockers(fid, origin, ref)) {
    const a = wfAlong(path, cum, o.cx, o.cz);
    if (a.d >= wfRad(o) || a.t >= bt) continue;
    bt = a.t; best = o;
  }
  if (!best) return { agua: true };
  const f = best.half !== undefined ? best.fid : best.owner;
  return { tipo: best.half !== undefined ? 'city' : 'poi', nome: best.half !== undefined ? best.name : POI_DEFS[best.type].n,
    fac: (facOf(f) || {}).name || 'outra facção', fid: f };
}
// Confere o alvo da declaração: {plan} se há rota, senão {erro: texto do aviso} (o toast de alvo recusado da declaração).
function warFrontCheck(fid, kind, ref) {
  const plan = warFrontPlan(fid, kind, ref);
  if (plan) return { plan };
  const b = warFrontBlocker(fid, kind, ref);
  return { erro: b && b.tipo ? txtWarBlocked(b.tipo, b.nome, b.fac) : TXT_WAR_NO_ROUTE };
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
  if (WORLD.showcaseMode) return;   // a vitrine dos POIs (poiShowcaseGen) monta os seus dormentes
  WORLD.dormant = [];
  const rng = new RNG((WORLD.seed * 977 + 13) >>> 0), r = POI_DEFS.fortcamp.r;
  // 'taken' começa pelas cidades (círculos): elas saem daqui e são medidas como quadrados (distância de xadrez), senão a
  // clareira entra pelos cantos da muralha. Baús escondidos (r 4) só pedem uma folga curta.
  const rest = taken.slice(WORLD.cities.length), big = rest.filter(q => q.r > 4), tiny = rest.filter(q => q.r <= 4);
  const nearCity = (x, z) => WORLD.cities.some(c => Math.max(Math.abs(c.cx - x), Math.abs(c.cz - z)) < c.half + r + F.gap);
  genDormant(rng, big, tiny, nearCity);   // antes das clareiras: o anel das cidades tem prioridade no espaço livre
  for (let t = 0; t < F.siteTries && S.length < F.sites; t++) {
    const x = rng.int(30, W - 30), z = rng.int(30, W - 30);
    const y = wfCrowded(x, z, r, big) ? null : spotOK(x, z, r + 1, [], 0, F.siteRange + (t > F.siteTries / 2 ? 6 : 0));   // mais tarde, aceita mais desnível (o POI se adapta ao chão)
    if (y === null || nearCity(x, z) || tiny.some(q => Math.hypot(q.x - x, q.z - z) < q.r + r + 3)) continue;
    big.push({ x, z, r, poi: true }); S.push({ x, z, y });
  }
}
// Há algo perto demais de (x, z) para um terreno de raio r? POIs e terrenos reservados pedem WAR.front.gap; acampamentos de
// bandidos, grutas e o resto (sem o sinalizador poi), WAR.front.gapAmb. loose (anel de cidade sem dormente): POIs pedem só gapAmb e o resto, 2.
const wfCrowded = (x, z, r, big, loose) => big.some(t => Math.hypot(t.x - x, t.z - z) < t.r + r +
  (loose ? (t.poi ? WAR.front.gapAmb : 2) : t.poi ? WAR.front.gap : WAR.front.gapAmb));
// Terrenos reservados: clareiras e dormentes (nada nasce em cima: árvores, portais, baús, outros POIs).
function wfReserved() { return (WORLD.warSites || []).concat(WORLD.dormant || []); }
// Se há estrada perto de (x, z), devolve o eixo dela ('x' ou 'z'); senão null. O ponto em si é terra batida longe de estrada.
function wfRoadAxis(x, z, r) {
  let best = null, bd = 1e9;
  for (let dz = -r - 8; dz <= r + 8; dz += 2) for (let dx = -r - 8; dx <= r + 8; dx += 2) {
    const i = (z + dz) * W + x + dx, d = Math.hypot(dx, dz);
    if (i >= 0 && i < W * W && T[i] === T_ROAD && d < bd) { bd = d; best = [dx, dz]; }
  }
  return best ? (Math.abs(best[0]) > Math.abs(best[1]) ? 'z' : 'x') : null;
}
// Dormentes (WORLD.dormant): decorações que guardam lugar de POI de guerra. Primeiro o anel de cada cidade (WAR.front.ringSites, até
// ringRadius da muralha, em direções diferentes), depois os corredores (retas entre cada cidade e suas 2 vizinhas mais próximas).
// Cada um: {i, x, z, y, kind, r, ring (id da cidade), road (eixo da estrada), off (virou POI de guerra)}.
function genDormant(rng, big, tiny, nearCity) {
  const F = WAR.front, D = WORLD.dormant = [], KW = { campfire: 3, garden: 2, well: 3, cairn: 3 };
  const put = (x, z, ring, loose, force) => {
    x = Math.round(x); z = Math.round(z);
    let kind = null, ax = null;
    const road = wfRoadAxis(x, z, WAR_DORMANT.cairn.r);
    if (force) { kind = force; ax = road; }
    else if (road && rng.next() < 0.6) { kind = 'cairn'; ax = road; }
    else { let w = rng.next() * (KW.campfire + KW.garden + KW.well); kind = w < KW.campfire ? 'campfire' : w < KW.campfire + KW.garden ? 'garden' : 'well'; }
    const r = WAR_DORMANT[kind].r;
    const y = wfCrowded(x, z, r, big, loose) ? null : spotOK(x, z, r + 1, [], 0, F.siteRange + (loose ? 20 : 6));
    if (y === null || nearCity(x, z) || tiny.some(q => Math.hypot(q.x - x, q.z - z) < q.r + r + 3)) return false;
    big.push({ x, z, r, poi: true });
    D.push({ i: D.length, x, z, y, kind, r, ring, road: kind === 'cairn' ? ax : undefined });
    return true;
  };
  for (const c of WORLD.cities) {   // anel: ringSites direções espaçadas, com sorteio de distância
    const a0 = rng.next() * 6.283;
    for (let k = 0; k < F.ringSites; k++) for (let t = 0; t < F.dormTries; t++) {
      const a = a0 + k * 6.283 / F.ringSites + (rng.next() - 0.5) * 1.2, d = c.half + 24 + rng.next() * (F.ringRadius - 24 - 14);
      if (put(c.cx + Math.cos(a) * d, c.cz + Math.sin(a) * d, c.id)) break;
    }
    // Toda cidade tem de ter ao menos um dormente no anel (senão o POI conquistável mais perto dela fica longe demais): se o
    // sorteio normal não achou, varre o anel palmo a palmo, só com a folga mínima (gapAmb), mais desnível e, por último,
    // o marco de pedras (o menor, raio 7), na ordem do mais perto da muralha para o mais longe.
    for (const kind of ['campfire', 'garden', 'well', 'cairn']) {
      for (let d = c.half + 24; d <= c.half + F.ringRadius - 6 && !D.some(q => q.ring === c.id); d += 5) {
        for (let a = rng.next() * 0.5; a < 6.283 && !D.some(q => q.ring === c.id); a += 0.12) {
          put(c.cx + Math.cos(a) * d, c.cz + Math.sin(a) * d, c.id, true, kind);
        }
      }
    }
  }
  const seen = new Set(), n0 = D.length;
  for (const a of WORLD.cities) {   // corredores
    const near = WORLD.cities.filter(b => b !== a).sort((p, q) => wfDist(a, p) - wfDist(a, q)).slice(0, 2);
    for (const b of near) {
      const key = Math.min(a.id, b.id) + ':' + Math.max(a.id, b.id);
      if (seen.has(key)) continue;
      seen.add(key);
      const L = wfDist(a, b), ux = (b.cx - a.cx) / L, uz = (b.cz - a.cz) / L;
      for (let s = F.ringRadius; s < L - F.ringRadius && D.length - n0 < F.dormMax; s += F.dormStep) {
        for (let t = 0; t < F.dormTries; t++) {
          const off = (rng.next() * 2 - 1) * F.dormWidth;
          if (put(a.cx + ux * s - uz * off, a.cz + uz * s + ux * off)) break;
        }
      }
    }
  }
}
// Dormente livre mais perto de (x, z), até WAR.front.side blocos. used = POIs de guerra já escolhidos neste plano. Com type, só os
// que viram esse tipo; null se não houver.
function wfDormNear(x, z, used, type) {
  let best = null, bd = WAR.front.side;
  for (const d of WORLD.dormant || []) {
    const q = Math.hypot(d.x - x, d.z - z);
    if (d.off || q >= bd || used.some(u => u.cx === d.x && u.cz === d.z)) continue;
    if (type && !WAR_DORMANT[d.kind].types.includes(type)) continue;
    best = d; bd = q;
  }
  return best;
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

// Preenche os vazios da rota com POIs de guerra (plano puro: {type, cx, cz, y, owner, t, dorm?, axis?}). Cada vazio entre dois
// vizinhos (cidade sua, POIs da cadeia, alvo) recebe quantos quadrados de 2 × raio + gap couberem, espaçados por igual. Tipo: sorteio
// por posição (warTypeWeights); usa o dormente livre mais perto que vire esse tipo, senão qualquer dormente perto (o tipo é o dele),
// senão uma clareira. Dono por terços da rota: 1º seu, último do inimigo, do meio de bandidos (banditChance, teto banditMax) ou do
// lado mais perto. No fim, o anel das cidades (wfRing). No máximo WAR.front.maxWarPois (o anel pode passar disso).
function wfFill(plan) {
  const F = WAR.front, fid = plan.fid, len = plan.len, rw = POI_DEFS.fortcamp.r;
  const rng = new RNG((WORLD.seed * 71 + fid * 13 + 7) >>> 0), out = [];
  const tr = plan.target, nodes = [{ s: 0, r: plan.origin.half, o: 'player' }];
  plan.chain.forEach((p, i) => nodes.push({ s: plan.ts[i] * len, r: POI_DEFS[p.type].r, o: p.owner, poi: true }));
  nodes.push({ s: len, r: wfRad(tr), o: fid, poi: plan.kind === 'poi' });
  // fronteira: entre o último nó seu e o primeiro do inimigo
  const lastP = Math.max(...nodes.filter(n => n.o === 'player').map(n => n.s));
  const firstE = Math.min(...nodes.filter(n => n.o === fid).map(n => n.s));
  const border = clamp((lastP + firstE) / 2 / (len || 1), 0, 1);
  let bandits = 0;
  const ownerAt = t => {
    if (t < 1 / 3) return 'player';
    if (t > 2 / 3) return fid;
    if (bandits < F.banditMax && rng.next() < F.banditChance) { bandits++; return 'bandit'; }
    return t < 0.5 ? 'player' : fid;
  };
  for (let i = 0; i + 1 < nodes.length && out.length < F.maxWarPois; i++) {
    const A = nodes[i], B = nodes[i + 1], from = A.s + A.r, L = B.s - B.r - from;
    const n = Math.floor((L - F.gap) / (2 * rw + F.gap));
    for (let k = 0; k < n && out.length < F.maxWarPois; k++) {
      const s = from + L * (k + 1) / (n + 1), t = s / len, c = wfPointAt(plan.path, s), w = warTypeWeights(t, border);
      let r = rng.next() * Object.values(w).reduce((a, b) => a + b, 0), type = 'fortcamp';
      for (const k2 in w) { if ((r -= w[k2]) < 0) { type = k2; break; } }
      const e = wfSpot(c.x, c.z, out, type, rng);
      if (!e) continue;   // sem dormente nem clareira perto: o quadrado fica vazio
      e.owner = ownerAt(t); e.t = t; out.push(e);
    }
  }
  wfRing(plan, out, nodes);
  return out;
}
// Lugar e tipo de um POI de guerra perto de (x, z): dormente do tipo, outro dormente (muda o tipo), ou clareira (sem barricada).
// Dormente de estrada vira Barricada (eixo p.axis). Devolve {type, cx, cz, y, dorm?, axis?} ou null.
function wfSpot(x, z, used, type, rng) {
  const d = wfDormNear(x, z, used, type) || wfDormNear(x, z, used);
  if (d) {
    const types = WAR_DORMANT[d.kind].types, plain = types.filter(q => q !== 'barricade');
    const ty = d.road ? 'barricade' : types.includes(type) ? type : plain[rng.int(0, plain.length - 1)];
    return { type: ty, cx: d.x, cz: d.z, y: d.y, dorm: d.i, axis: ty === 'barricade' ? d.road : undefined };
  }
  const site = wfSiteNear(x, z, used);
  return site ? { type: type === 'barricade' ? 'lookout' : type, cx: site.x, cz: site.z, y: site.y } : null;
}
// Anel das cidades: o primeiro POI conquistável (não seu) a partir da origem e o último antes do alvo ficam a no máximo
// WAR.front.ringRadius da muralha; se não, acrescenta um dormente do anel (ou clareira) como POI de guerra: de bandidos junto da
// origem, do inimigo junto da cidade-alvo. Sem lugar: plan.warn avisa. nodes: origem, cadeia e alvo (wfFill).
function wfRing(plan, out, nodes) {
  const F = WAR.front, len = plan.len, warn = plan.warn = [];
  const conq = nodes.slice(1, -1).filter(n => n.o !== 'player').map(n => n.s)
    .concat(out.filter(e => e.owner !== 'player').map(e => e.t * len)).sort((a, b) => a - b);
  const sides = [{ c: plan.origin, who: 'origem', own: 'bandit', first: true }];
  if (plan.kind === 'city') sides.push({ c: plan.target, who: 'alvo', own: plan.fid, first: false });
  for (const sd of sides) {
    const s = conq.length ? (sd.first ? conq[0] : conq[conq.length - 1]) : (sd.first ? len : 0);
    const reach = sd.first ? s - sd.c.half : len - s - sd.c.half;   // distância (pela rota) da muralha ao POI conquistável
    if (reach <= F.ringRadius) continue;
    const e = wfRingSpot(plan, out, sd, F);
    if (e) { out.push(e); conq.push(e.t * len); conq.sort((a, b) => a - b); }
    else warn.push(txtWarRingFail(sd.who, sd.c.name, Math.round(reach)));
  }
}
// Escolhe o dormente do anel de sd.c (livre, longe dos escolhidos e da cadeia) mais perto da rota; senão uma clareira no meio do trecho.
function wfRingSpot(plan, out, sd, F) {
  const cum = [0], pa = plan.path;
  for (let k = 1; k < pa.length; k++) cum.push(cum[k - 1] + Math.hypot(pa[k].x - pa[k - 1].x, pa[k].z - pa[k - 1].z));
  const clash = (x, z, r) => out.concat(plan.chain.map(p => ({ cx: p.cx, cz: p.cz, type: p.type })))
    .some(u => Math.hypot(u.cx - x, u.cz - z) < POI_DEFS[u.type].r + r + F.gap);
  let best = null, bd = 1e9;
  for (const d of WORLD.dormant || []) {
    if (d.off || d.ring !== sd.c.id || clash(d.x, d.z, d.r)) continue;
    const a = wfAlong(pa, cum, d.x, d.z);
    if (a.d < bd) { bd = a.d; best = d; }
  }
  if (best) {
    const ty = best.road ? 'barricade' : WAR_DORMANT[best.kind].types[0];
    return { type: ty, cx: best.x, cz: best.z, y: best.y, dorm: best.i, axis: ty === 'barricade' ? best.road : undefined,
      owner: sd.own, t: wfAlong(pa, cum, best.x, best.z).t };
  }
  const q = wfPointAt(pa, sd.first ? sd.c.half + F.ringRadius * 0.6 : plan.len - sd.c.half - F.ringRadius * 0.6);
  const site = q && wfSiteNear(q.x, q.z, out);
  return site && !clash(site.x, site.z, POI_DEFS.fortcamp.r)
    ? { type: 'fortcamp', cx: site.x, cz: site.z, y: site.y, owner: sd.own, t: wfAlong(pa, cum, site.x, site.z).t } : null;
}

// ---------- POIs de guerra: construir, remover e restaurar ----------
// Cria um POI de guerra em jogo (num terreno de guerra já nivelado, sobre uma base de terra, sem mexer na malha) e o liga ao mundo. e = {id, type, cx, cz, y, owner}.
// O dono entra direto (sem a espera de poiOwnerChanged): os soldados da guarnição moram nele desde a declaração.
function wfMake(e) {
  const p = { id: e.id, type: e.type, cx: e.cx, cz: e.cz, y: e.y, biome: B[e.cz * W + e.cx], owner: e.owner, runtime: true, axis: e.axis };
  const d = e.dorm !== undefined ? (WORLD.dormant || [])[e.dorm] : null;
  if (d) { dormRemove(d); d.off = true; }   // a decoração dormente dá lugar ao POI de guerra
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
    war: plan.war.map(e => ({ id: e.id, type: e.type, cx: e.cx, cz: e.cz, y: e.y, owner: e.owner, dorm: e.dorm, axis: e.axis })) };
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
// Desmonta os POIs de guerra da frente de fid (sem fid: de todas) e apaga a frente do estado. Chamada quando a guerra acaba.
// WAR.front.revert[tipo]: true remove o POI e reconstrói a decoração dormente; false deixa o POI como rastro da guerra (sem dono,
// guardado em STATE.war.trace e refeito por warFrontRestore).
function warFrontClear(fid) {
  const camps = warX().camps;
  for (const f of fid === undefined ? Object.keys(camps) : [fid]) {
    const fr = camps[f] && camps[f].front;
    if (!fr) continue;
    for (const e of fr.war || []) {
      const p = WORLD.pois.find(q => q.id === e.id);
      if (!p) continue;
      if (!WAR.front.revert[e.type]) {   // rastro: fica no mundo, sem dono e sem guarnição
        p.owner = 'none'; STATE.pois[p.id] = 'none'; poiPaint(p); poiGarrisonSync(p);
        warX().trace.push({ id: e.id, type: e.type, cx: e.cx, cz: e.cz, y: e.y, dorm: e.dorm, axis: e.axis });
        continue;
      }
      wfUnmake(p);
      const d = e.dorm !== undefined ? (WORLD.dormant || [])[e.dorm] : null;
      if (d) { d.off = false; dormBuild(d); }
    }
    delete camps[f].front;
  }
}
// Reconstrói os POIs de guerra das frentes salvas e os rastros (o mundo é refeito pela semente): applySave, depois das relações.
function warFrontRestore() {
  const X = warX();
  for (const fid in X.camps) {
    for (const e of (X.camps[fid].front || {}).war || []) if (!WORLD.pois.some(p => p.id === e.id)) wfMake(e);
  }
  for (const e of X.trace) if (!WORLD.pois.some(p => p.id === e.id)) wfMake(Object.assign({ owner: 'none' }, e));
}
