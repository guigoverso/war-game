'use strict';
// ---------- Montador de POIs "lego" (L2: fazenda, mina e serraria; docs/features/11_pois-procedurais-lego.md) ----------
// Um POI lego é um ESQUELETO (vagas com retângulo, tipo e frente) preenchido por PEÇAS que se ajustam ao retângulo da vaga. Tudo é desenhado no quadro do esqueleto
// (portão ao sul, +z) e girado/espelhado de uma vez pelo gancho BC_XF de Bc (city.js; setTL e acL também o seguem): peças só usam funções que passam por Bc/pBc/acL
// (poiFence, poiHut, poiWell, crate, barrel, hay...; NÃO usar tinyTree, que escreve direto). Dados em js/modifiers/lego-modifiers.js (LEGO_RECIPES, LEGO_PICK...).
// Ligado por padrão (L5; só ?cenario=pois o desliga, legoOn). Determinístico: só usa `rng`.
// Contrato com o jogo: p.flagMat/bandeira (poiFlag), p.r (raio da instância), p.recipe = {id, lego:true, size, skeleton, seed, rot, mir, pieces, anchors:{house, gate, door}} (coordenadas
// relativas ao centro; só a semente e os parâmetros, nunca as peças: com p.recipe já posto, poiBuild refaz o mesmo POI) e as âncoras funcionais (p.bed, p.svcSpec... ver legoAnchor). Tamanho: p.legoSize ('M' médio, 'P' pequeno); esqueleto forçado: p.legoSk (índice); frente: p.legoFace (0 a 3, ver legoRotToward).

// Transformação do esqueleto para o POI: espelha em x (mir) e gira k vezes 90° ((x,z)->(-z,x); k=1 leva o sul para o oeste, 2 norte, 3 leste).
const legoXf = (k, mir) => (x, z) => { if (mir) x = -x; for (let i = 0; i < k; i++) { const t = x; x = -z; z = t } return [x, z] };
// Rotação (0 a 3) que leva o portão (sul) para a direção (dx,dz) (ex.: a da estrada mais próxima).
const legoRotToward = (dx, dz) => { const v = [[0, 1], [-1, 0], [0, -1], [1, 0]]; let b = 0, bd = -9; v.forEach((q, i) => { const d = q[0] * dx + q[1] * dz; if (d > bd) { bd = d; b = i } }); return b };
// ---------- âncoras funcionais (serviços, cama, vigia...; L1a) ----------
// O jogo lê as âncoras de um POI em COORDENADAS DO MAPA (poigame.js): pontos {x,z[,y][,yaw]} em p.bed, p.tavern, p.stove, p.vigilPos, p.chestPos e listas em p.beds, p.medWalk, p.keepers, p.svcSpec.
// binoc: binóculo da torre; chestAt: onde nasce o baú das ruínas (criado por legoBuild com addChest, não fica em p). yaw: direção da frente = (-sen yaw, -cos yaw). Uma peça declara a âncora no quadro do esqueleto (relativa ao centro, y relativo ao chão do POI) com legoAnchor(A, tipo, valor);
// legoBuild a converte (giro/espelho) e grava em p. POIs antigos (L1b: frente para a estrada) usam poiAnchorsXf, que gira as âncoras já gravadas em coordenadas do mapa.
const LEGO_ANCH_PT = ['bed', 'tavern', 'stove', 'vigilPos', 'chestPos', 'firePos', 'binoc', 'chestAt'], LEGO_ANCH_LIST = ['beds', 'medWalk', 'keepers', 'svcSpec'];
function legoAnchor(A, kind, v) { const a = A.anch = A.anch || {}; if (LEGO_ANCH_LIST.includes(kind)) (a[kind] = a[kind] || []).push(v); else a[kind] = v }
// Cópia das âncoras o com cada ponto levado por fn(x,z) -> [x,z], cada yaw por fv(dx,dz) (vetor) e y somado a dy.
function poiAnchorsMap(o, fn, fv, dy) {
  const pt = q => { const r = fn(q.x, q.z), n = Object.assign({}, q, { x: r[0], z: r[1] }); if (q.y !== undefined) n.y = q.y + dy;
    if (q.yaw !== undefined) { const v = fv(-Math.sin(q.yaw), -Math.cos(q.yaw)); n.yaw = Math.atan2(-v[0], -v[1]) } return n };
  const out = {}; for (const k of LEGO_ANCH_PT) if (o[k]) out[k] = pt(o[k]); for (const k of LEGO_ANCH_LIST) if (o[k]) out[k] = o[k].map(pt); return out;
}
// Gira (k vezes 90°) e espelha (mir) as âncoras de p que já estão em coordenadas do mapa, em torno do centro do POI (o desenho girou por BC_XF com a mesma legoXf(k, mir)).
function poiAnchorsXf(p, k, mir) {
  const f = legoXf(k, mir), o = {}; for (const n of LEGO_ANCH_PT.concat(LEGO_ANCH_LIST)) if (p[n]) o[n] = p[n];
  Object.assign(p, poiAnchorsMap(o, (x, z) => { const q = f(x - p.cx, z - p.cz); return [p.cx + q[0], p.cz + q[1]] }, f, 0));
}
// A âncora (x,z em coordenadas do mapa) é alcançável a pé a partir de fora do portão? Preenche a grade de navegação (NAV.blocked) dentro do raio do POI + 3, começando 2 blocos
// para fora do portão (p.recipe.anchors.gate) e aceitando uma célula livre a até 2 blocos da âncora. Só vale depois de buildNav().
function legoReach(p, x, z) {
  const g = p.recipe.anchors.gate, L = Math.hypot(g.x, g.z) || 1, R = Math.ceil(p.r + 3), sx = Math.floor(p.cx + g.x + g.x / L * 2), sz = Math.floor(p.cz + g.z + g.z / L * 2), seen = new Set(), st = [[sx, sz]];
  const ok = (cx, cz) => Math.abs(cx - p.cx) <= R && Math.abs(cz - p.cz) <= R && navFree(cx + 0.5, cz + 0.5);
  if (!ok(sx, sz)) return false; seen.add(sx + ',' + sz);
  while (st.length) { const [cx, cz] = st.pop(); if (Math.hypot(cx + 0.5 - x, cz + 0.5 - z) <= 2) return true;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = cx + dx, nz = cz + dz, k = nx + ',' + nz; if ((!dx && !dz) || seen.has(k) || !ok(nx, nz)) continue;
      if (dx && dz && !(ok(cx + dx, cz) && ok(cx, cz + dz))) continue; seen.add(k); st.push([nx, nz]) } }
  return false;
}
// Escava o terreno no retângulo (x0,z0,x1,z1) do quadro de desenho atual (poiDig só vale na geração, antes da malha), levando o retângulo pelo giro do POI (BC_XF).
function legoDig(c, x0, z0, x1, z1, d) { const q = BC_XF ? BC_XF(x0, z0, x1, z1) : [x0, z0, x1, z1]; poiDig(c, q[0], q[1], q[2], q[3], d) }
// Pilha de feno que passa por Bc (a hay de city.js também passa, mas esta tem o sorteio de altura fixo).
function legoHay(c, x, z) { pBc(c, x, 0, z, x + 1.3, 1.3, z + 1.3, 0xd8b84a, true, { j: 0.1 }); for (const k of [0.3, 0.9]) pBc(c, x - 0.04, 0, z + k, x + 1.34, 1.3, z + k + 0.07, 0x6a5a2a, false, { j: 0 }) }
// Árvore pequena de pomar (tronco com colisão, copa em dois blocos; algumas com frutos).
function legoTree(c, x, z, rng) {
  const th = rng.int(3, 4), lc = [0x2a6a24, 0x3a7a2a, 0x2a5a1e][rng.int(0, 2)];
  pBc(c, x - 0.35, 0, z - 0.35, x + 0.35, th, z + 0.35, 0x6b4a2a, true, { j: 0.02 });
  pBc(c, x - 1.5, th - 1, z - 1.5, x + 1.5, th + 0.5, z + 1.5, lc, false, { j: 0.1, b: true });
  pBc(c, x - 0.8, th + 0.5, z - 0.8, x + 0.8, th + 1.3, z + 0.8, shadec(lc, 1.1), false, { j: 0.1, b: true });
  if (rng.chance(0.5)) for (let k = 0; k < 3; k++) pBc(c, x - 1.4 + rng.range(0, 2.4), th - 0.6, z - 1.6 + rng.range(0, 3), x - 1.1 + rng.range(0, 2.4), th - 0.3, z - 1.3 + rng.range(0, 3), 0xc83a2a, false, { j: 0 });
}
// Cerca em volta do retângulo R (recuada 0.5) com um vão de `gap` na face `face` (a frente); face null = fechada.
function legoPen(c, R, face, gap) {
  const x0 = R.x + 0.5, x1 = R.x + R.w - 0.5, z0 = R.z + 0.5, z1 = R.z + R.d - 0.5, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, g = gap / 2;
  const seg = (a, b, c2, d, side) => { if (face !== side) poiFence(c, a, b, c2, d); else if (side === 'N' || side === 'S') { poiFence(c, a, b, xm - g, d); poiFence(c, xm + g, b, c2, d) } else { poiFence(c, a, b, c2, zm - g); poiFence(c, a, zm + g, c2, d) } };
  seg(x0, z0, x1, z0, 'N'); seg(x0, z1, x1, z1, 'S'); seg(x0, z0, x0, z1, 'W'); seg(x1, z0, x1, z1, 'E');
}
// Retângulo inteiro (centrado em R) de no máximo mw × md.
const legoCenter = (R, mw, md) => { const w = Math.min(R.w, mw), d = Math.min(R.d, md); return { x: Math.round(R.x + (R.w - w) / 2), z: Math.round(R.z + (R.d - d) / 2), w, d } };
// Ponto à frente da porta (0.6 bloco fora) de um retângulo com a frente para `face`.
const legoDoor = (r, face) => face === 'S' ? [r.x + r.w / 2, r.z + r.d + 0.6] : face === 'N' ? [r.x + r.w / 2, r.z - 0.6] : face === 'E' ? [r.x + r.w + 0.6, r.z + r.d / 2] : [r.x - 0.6, r.z + r.d / 2];
// Quadro local de uma vaga com a frente para `face`: u = ao longo da frente (0..W), v = profundidade do fundo (0) até a frente (D); map(u,v) leva para o quadro do esqueleto.
function legoLoc(R, face) {
  const ns = face === 'S' || face === 'N';
  return { W: ns ? R.w : R.d, D: ns ? R.d : R.w, map: (u, v) => face === 'S' ? [R.x + u, R.z + v] : face === 'N' ? [R.x + R.w - u, R.z + R.d - v] : face === 'E' ? [R.x + v, R.z + u] : [R.x + R.w - v, R.z + R.d - u] };
}
// Executa fn() com tudo que passa por Bc desenhado no quadro local `loc` (compõe com a transformação do POI, se houver).
function legoDraw(loc, fn) {
  const outer = BC_XF;
  BC_XF = (x0, z0, x1, z1) => { const a = loc.map(x0, z0), b = loc.map(x1, z1), q = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])]; return outer ? outer(q[0], q[1], q[2], q[3]) : q };
  try { fn() } finally { BC_XF = outer }
}
// Pilha de toras (rows fiadas, cada fiada com uma tora a menos) com comprimento len em z, canto mínimo (x,z).
function legoLogPile(c, rng, x, z, len, rows) {
  for (let r2 = 0; r2 < rows; r2++) for (let k = 0; k < rows + 1 - r2; k++) pBc(c, x + k * 1.1 + r2 * 0.55, r2 * 0.65, z, x + k * 1.1 + r2 * 0.55 + 1, r2 * 0.65 + 0.65, z + len, rng.pick(LEGO_PAL.log), true, { j: 0.05 });
}
// Pilhas de material (minério, carvão) em células de ~3 blocos dentro de R, sobre chão escuro; cols = paleta. Devolve nada.
function legoPile(c, rng, R, cols) {
  pBc(c, R.x, 0, R.z, R.x + R.w, 0.09, R.z + R.d, 0x4a4036, false, { j: 0.03 });   // (0.09: acima da terra batida, 0.05, senão as faces coincidem e piscam)
  const nx = Math.max(1, Math.floor(R.w / 3.4)), nz = Math.max(1, Math.floor(R.d / 3.2)), cw = R.w / nx, cd = R.d / nz, cart = R.w >= 8 && R.d >= 6;
  if (cart) poiCart(c, R.x + 0.8, R.z + 0.8, true, rng.pick(cols));
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
    if (cart && i === 0 && j === 0) continue; if (rng.chance(0.2)) continue;
    const x = R.x + i * cw + 0.5, z = R.z + j * cd + 0.5, w = Math.min(2.6, cw - 0.8), d = Math.min(2.2, cd - 0.8), h = 0.5 + rng.range(0, 0.5);
    pBc(c, x, 0, z, x + w, h, z + d, rng.pick(cols), true, { j: 0.1 });
    pBc(c, x + 0.35, h, z + 0.3, x + w - 0.35, h + 0.4 + rng.range(0, 0.4), z + d - 0.3, rng.pick(cols), false, { j: 0.1 });
  }
}

// Peças: cada uma desenha dentro do retângulo R da vaga (no quadro do esqueleto) e devolve nada; A recebe âncoras (A.house).
const LEGO_PIECES = {
  casa(c, rng, R, face, A) {
    const r = legoCenter(R, 11, 8), P = LEGO_PAL;
    poiHut(c, r.x, r.z, r.w, r.d, face, { chimney: rng.chance(0.7), timber: rng.chance(0.6), shut: rng.pick(P.shut), wall: rng.pick(P.wall), roof: rng.pick(P.roof) }, rng);
    A.house = { x: r.x + r.w / 2, z: r.z + r.d / 2, door: legoDoor(r, face) };
  },
  celeiro(c, rng, R, face) {
    const r = legoCenter(R, 12, 9), P = LEGO_PAL;
    poiHouse(c, r.x, r.z, r.w, r.d, face, { h: 5.5, wall: rng.pick(P.barn), roof: rng.pick(P.barnRoof), timber: true }, rng);
    const d = legoDoor(r, face); if (rng.chance(0.7)) legoHay(c, d[0] + (face === 'S' || face === 'N' ? 2.4 : -0.6), d[1] + (face === 'E' || face === 'W' ? 2.4 : -0.6));
  },
  silos(c, rng, R) {
    const n = Math.min(3, Math.floor(R.w / 3.2)), x0 = R.x + (R.w - n * 3.2) / 2 + 0.3;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 3.2, z = R.z + 0.8, h = 5 + rng.range(0, 1.5);
      pBc(c, x, 0, z, x + 2.6, h, z + 2.6, 0xc8c8c8, true, { j: 0.03 }); pBc(c, x - 0.1, h * 0.5, z - 0.1, x + 2.7, h * 0.5 + 0.25, z + 2.7, 0x8a8a90, false, { j: 0 });
      pBc(c, x + 0.3, h, z + 0.3, x + 2.3, h + 0.7, z + 2.3, 0x9a4a2a, false, { j: 0.03 });
    }
    legoHay(c, R.x + 1, R.z + R.d - 2.4); if (R.w > 9) legoHay(c, R.x + R.w - 3, R.z + R.d - 2.4);
  },
  galinheiro(c, rng, R, face) {
    const r = legoCenter(R, 9, 7); legoPen(c, r, face, 2.4);
    pBc(c, r.x + 1.5, 0, r.z + 1.2, r.x + 5, 1.0, r.z + 3, 0x9a6a3a, true, { j: 0.03 }); pBc(c, r.x + 1.3, 1.0, r.z + 1, r.x + 5.2, 1.5, r.z + 3.2, 0x7a3a2a, false, { j: 0.03 });
    for (let i = 0; i < 3; i++) poiAnimal(c, r.x + 1.5 + rng.range(0, r.w - 4), r.z + r.d - 2.5 - rng.range(0, 1.5), 0xf0ece0, false);
  },
  curral(c, rng, R, face) {
    const sp = rng.pick(['vaca', 'ovelha', 'porco']), cols = LEGO_PAL.animals[sp], n = clamp(Math.round(R.w * R.d / 20), 2, 6);
    pBc(c, R.x + 0.5, 0, R.z + 0.5, R.x + R.w - 0.5, 0.12, R.z + R.d - 0.5, 0x6a4a2e, false, { j: 0.03 }); legoPen(c, R, face, 3);
    for (let i = 0; i < n; i++) poiAnimal(c, R.x + 1.5 + rng.range(0, R.w - 4.5), R.z + 1.5 + rng.range(0, R.d - 3.5), rng.pick(cols), sp === 'vaca');
    pBc(c, R.x + 1.5, 0, R.z + R.d - 2.2, R.x + 4.5, 0.6, R.z + R.d - 1.4, 0x7a5632, true, { j: 0.04 }); pBc(c, R.x + 1.6, 0.6, R.z + R.d - 2.1, R.x + 4.4, 0.7, R.z + R.d - 1.5, 0x3a7ad8, false, { j: 0 });
  },
  pomar(c, rng, R) {
    pBc(c, R.x, 0, R.z, R.x + R.w, 0.1, R.z + R.d, 0x4a7a32, false, { j: 0.05 });
    for (let z = R.z + 2; z <= R.z + R.d - 2; z += 4.2) for (let x = R.x + 2; x <= R.x + R.w - 2; x += 4) legoTree(c, x + rng.range(-0.4, 0.4), z + rng.range(-0.4, 0.4), rng);
  },
  trigo(c, rng, R) { legoCrop(c, rng, R, 1.7, 1.0, 2.4, LEGO_PAL.crops.trigo, 0.9, 0.25) },
  horta(c, rng, R) { legoCrop(c, rng, R, 1.3, 0.8, 0.9, LEGO_PAL.crops.horta, 0.5, 0.3) },
  milho(c, rng, R) { legoCrop(c, rng, R, 1.8, 0.8, 1.2, LEGO_PAL.crops.milho, 2.0, 0.6) },

  // Mina: galpão de madeira sobre uma rampa escavada (5 degraus de 1 bloco desde a porta do galpão, o terreno desce de verdade: legoDig) com trilhos e um vagonete lá embaixo, como a mina antiga. Âncora (A.house).
  // Tudo em blocos inteiros (o terreno é uma grade de 1x1): a rampa tem 4 de largura (u = ua..ua+4) e o degrau k (1 a 5) é o bloco v = top-k-1..top-k (top = a frente do galpão), com a profundidade k; o degrau 0 fica sob o galpão.
  boca(c, rng, R, face, A) {
    const L = legoLoc(R, face), D = L.D, ua = Math.round(L.W / 2) - 2, uc = ua + 2, sv0 = D - 5, top = D, n = 5, v0 = top - n - 1, P = LEGO_PAL;
    legoDraw(L, () => {
      for (let k = 1; k <= n; k++) legoDig(c, ua, top - k - 1, ua + 4, top - k, k);
      for (let k = 0; k <= n; k++) { const vA = top - k - 1, vB = top - k, y = -k;   // trilhos, dormentes, piso e paredes escuras de cada degrau
        for (const s of [-0.8, 0.8]) pBc(c, uc + s - 0.06, y + 0.02, vA, uc + s + 0.06, y + 0.16, vB, 0x9a9aa2, false, { j: 0 });
        for (let v = vA; v < vB; v += 0.5) pBc(c, uc - 1.2, y, v, uc + 1.2, y + 0.06, v + 0.25, 0x4a3320, false, { j: 0 });
        if (k) { pBc(c, ua, y, vA, ua + 4, y + 0.05, vB, k % 2 ? 0x7a7a82 : 0x6a6a72, false, { j: 0.05 }); pBc(c, ua, y, vA, ua + 0.06, 0, vB, 0x0c0c10, false, { j: 0 }); pBc(c, ua + 3.94, y, vA, ua + 4, 0, vB, 0x0c0c10, false, { j: 0 }) } }
      pBc(c, ua, -n, v0, ua + 4, 0, v0 + 0.06, 0x0c0c10, false, { j: 0 });
      pBc(c, uc - 0.8, -n + 0.2, v0 + 0.05, uc + 0.8, -n + 0.9, v0 + 0.95, 0x5a5a62, true, { j: 0.03 }); pBc(c, uc - 0.7, -n + 0.9, v0 + 0.1, uc + 0.7, -n + 1.2, v0 + 0.9, 0x2a2a2a, false, { j: 0.05 });   // vagonete descendo, com minério
      for (let k = 0; k < 4; k++) pBc(c, uc - 0.5 + k * 0.25, -n + 1.2, v0 + 0.15 + (k % 2) * 0.35, uc - 0.3 + k * 0.25, -n + 1.5, v0 + 0.4 + (k % 2) * 0.35, rng.pick(P.ore), false, { j: 0.05 });
      pBc(c, uc - 0.05, -n, v0 + 1.0, uc + 0.05, 0.9, v0 + 1.1, 0x6a5a3a, false, { j: 0 });   // corda
      for (const u of [ua - 1, ua + 5]) for (const v of [sv0, sv0 + 2.5, D - 0.2]) pBc(c, u - 0.18, 0, v - 0.18, u + 0.18, 3.6, v + 0.18, 0x5a3d22, true, { j: 0.02 });   // galpão: pilares, muretas, viga e telhado
      for (const u of [ua - 1, ua + 5]) { pBc(c, u - 0.1, 0, sv0, u + 0.1, 1.3, D, 0x7a5632, true, { j: 0.04 }); pBc(c, u - 0.1, 2.4, sv0, u + 0.1, 3.6, D, 0x6b4a2a, false, { j: 0.04 }) }
      pBc(c, ua - 1, 3.3, sv0 - 0.1, ua + 5, 3.6, D + 0.1, 0x4a3320, false, { j: 0.02 });
      roofOn(c, ua - 1.2, sv0 - 0.4, ua + 5.2, D + 0.4, 3.6, 'gable', 0x6a4a2a, { trim: 0x4a3320 });
      for (const u of [ua - 0.4, ua + 4.4]) { pBc(c, u - 0.06, 2.3, D - 0.6, u + 0.06, 3.0, D - 0.5, 0x2a2a2a, false, { j: 0 }); pBc(c, u - 0.2, 2.8, D - 0.7, u + 0.2, 3.3, D - 0.3, 0xffe9a0, false, { j: 0 }) }   // lanternas
      const fv = Math.max(0.2, v0 - 0.5); poiFence(c, ua - 0.5, fv, ua - 0.5, sv0 - 0.2); poiFence(c, ua + 4.5, fv, ua + 4.5, sv0 - 0.2); poiFence(c, ua - 0.5, fv, ua + 4.5, fv);   // cerca em volta do trecho a céu aberto
    });
    const hm = L.map(uc, (sv0 + D) / 2);
    A.house = { x: hm[0], z: hm[1], door: L.map(uc, D + 0.6) };
  },
  // Oficina da mina: galpão de madeira com ferramentas e caixas na porta.
  oficina(c, rng, R, face) {
    const r = legoCenter(R, 8, 6), P = LEGO_PAL, d = legoDoor(r, face), ns = face === 'S' || face === 'N';
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.6, wall: rng.pick(P.work), roof: rng.pick(P.workRoof), timber: true, chimney: rng.chance(0.4) }, rng);
    const q = (k, m) => ns ? [d[0] + k, d[1] + m * (face === 'S' ? 1 : -1)] : [d[0] + m * (face === 'E' ? 1 : -1), d[1] + k];
    const a = q(2.2, 0.4), b = q(-2.4, 0.4); crate(c, a[0], a[1], 1.1, 1.0); barrel(c, b[0], b[1]);
  },
  // Torre do guincho: quatro pernas, viga, roda, corda e balde de minério.
  guincho(c, rng, R) {
    const r = legoCenter(R, 6, 6), cx = r.x + r.w / 2, cz = r.z + r.d / 2, a = Math.min(2.4, (Math.min(r.w, r.d) - 1) / 2);
    pBc(c, cx - a - 0.3, 0, cz - a - 0.3, cx + a + 0.3, 0.12, cz + a + 0.3, 0x5a4a3a, false, { j: 0.03 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) pBc(c, cx + sx * a - 0.18, 0, cz + sz * a - 0.18, cx + sx * a + 0.18, 5.5, cz + sz * a + 0.18, 0x5a3d22, true, { j: 0.02 });
    for (const sz of [-1, 1]) pBc(c, cx - a, 2.4, cz + sz * a - 0.07, cx + a, 2.6, cz + sz * a + 0.07, 0x6b4a2a, false, { j: 0 });
    pBc(c, cx - a - 0.3, 5.2, cz - 0.2, cx + a + 0.3, 5.55, cz + 0.2, 0x4a3320, true, { j: 0.02 });
    pBc(c, cx - 0.9, 3.9, cz - 0.35, cx + 0.9, 5.6, cz + 0.35, 0x3a3a3a, false, { j: 0.02 }); pBc(c, cx - 0.25, 3.7, cz - 0.45, cx + 0.25, 5.8, cz + 0.45, 0x6a6a72, false, { j: 0 });
    pBc(c, cx - 0.04, 1.0, cz - 0.04, cx + 0.04, 3.9, cz + 0.04, 0x6a5a3a, false, { j: 0 });
    pBc(c, cx - 0.5, 0.12, cz - 0.5, cx + 0.5, 1.0, cz + 0.5, 0x5a5a62, true, { j: 0.03 }); pBc(c, cx - 0.4, 1.0, cz - 0.4, cx + 0.4, 1.3, cz + 0.4, rng.pick(LEGO_PAL.ore), false, { j: 0.06 });
  },
  // Depósito: galpão aberto (pilares, fundo e telhado) com caixas e barris.
  deposito(c, rng, R, face) {
    const r = legoCenter(R, 9, 6), f = makeShed(c, { x0: r.x, x1: r.x + r.w - 1, z0: r.z, z1: r.z + r.d - 1 }, face, { h: 3.4, roof: rng.pick([0x6a4a2a, 0x5a4a3a, 0x7a5a3a]) }, rng);
    for (let i = 0; i < 3; i++) FB(c, f, 1.2 + i * 2.6, f.V - 2.4, 2.4 + i * 2.6, f.V - 1.2, 0, 0.9 + rng.range(0, 0.5), i % 2 ? 0x9a7a45 : 0x8a6c3a, true, { j: 0.05 });
    if (f.U > 7) FB(c, f, f.U - 2.6, 1, f.U - 1.7, 1.9, 0, 1.2, 0x7a5a30, true, { j: 0.05 });
  },
  minerio(c, rng, R) { legoPile(c, rng, R, LEGO_PAL.ore) },
  carvao(c, rng, R) { legoPile(c, rng, R, LEGO_PAL.coal) },
  // Monte de entulho (terra e pedras) escalonado, com pedras soltas em volta.
  entulho(c, rng, R) {
    const w = Math.min(R.w - 1, 8), d = Math.min(R.d - 1, 7), x0 = R.x + (R.w - w) / 2, z0 = R.z + (R.d - d) / 2;
    for (let k = 0; k < 3; k++) { const m = k * Math.min(w, d) * 0.22; if (w - 2 * m < 1.5 || d - 2 * m < 1.5) break; pBc(c, x0 + m, k * 0.8, z0 + m, x0 + w - m, k * 0.8 + 0.8, z0 + d - m, shadec(0x6a5a40, 1 - k * 0.08), true, { j: 0.1 }) }
    for (let k = 0; k < 5; k++) { const x = R.x + rng.range(0.3, R.w - 1), z = R.z + rng.range(0.3, R.d - 1), s = rng.range(0.4, 0.9); pBc(c, x, 0, z, x + s, s * 0.7, z + s, rng.pick(LEGO_PAL.rock), false, { j: 0.1 }) }
  },

  // Serraria: galpão aberto com bancada e serra, serragem à frente. Âncora (A.house).
  serra(c, rng, R, face, A) {
    const r = legoCenter(R, 12, 8), f = makeShed(c, { x0: r.x, x1: r.x + r.w - 1, z0: r.z, z1: r.z + r.d - 1 }, face, { h: 4, roof: rng.pick([0xc09050, 0xb08040, 0x9a7a48]) }, rng);
    const bu = Math.min(f.U * 0.58, f.U - 4.5), bv = Math.max(1.5, f.V * 0.45);
    FB(c, f, bu, bv, bu + 3.5, bv + 1.0, 0, 0.9, 0x8a6a3a, true); FB(c, f, bu + 1.6, bv - 0.1, bu + 1.8, bv + 1.1, 0.9, 1.9, 0xc0c8d0, false, { j: 0 }); FB(c, f, bu + 1.2, bv, bu + 2.2, bv + 1.0, 1.9, 2.0, 0x6a6a72, false, { j: 0 });
    FB(c, f, 1.2, 1.5, 4.2, 2.9, 0, 0.5, 0xd0a868, false, { j: 0.08 });   // serragem
    A.house = { x: r.x + r.w / 2, z: r.z + r.d / 2, door: legoDoor(r, face) };
  },
  // Escritório da serraria: casinha de madeira com placa.
  escritorio(c, rng, R, face) {
    const r = legoCenter(R, 8, 6), P = LEGO_PAL, d = legoDoor(r, face);
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.4, wall: rng.pick(P.work), roof: rng.pick(P.workRoof), timber: true, shut: 0x4a3a2a, chimney: rng.chance(0.5) }, rng);
    poiSign(c, d[0] + (face === 'S' || face === 'N' ? 2.2 : 0), d[1] + (face === 'E' || face === 'W' ? 2.2 : 0), 0x8a5a2a);
  },
  // Tábuas em pilha cruzada (uma ou duas fileiras de pilhas), sobre serragem.
  tabuas(c, rng, R) {
    pBc(c, R.x, 0, R.z, R.x + R.w, 0.09, R.z + R.d, 0xd0a868, false, { j: 0.04 });   // serragem: mais alta que a terra batida (0.05), senão pisca (z-fighting)
    const nx = Math.max(1, Math.floor(R.w / 5.4)), nz = R.d >= 8.5 ? 2 : 1, cw = R.w / nx, cd = R.d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x = R.x + (i + 0.5) * cw - 2.2, z = R.z + (j + 0.5) * cd - 1.4, n = rng.int(3, 5);
      for (let k = 0; k < n; k++) pBc(c, x + (k % 2 ? 0.12 : 0), k * 0.32, z, x + 4.4 - (k % 2 ? 0.12 : 0), k * 0.32 + 0.3, z + 2.8, rng.pick(LEGO_PAL.plank), true, { j: 0.04 });
    }
  },
  // Pilhas de toras em células de ~5 blocos, com um toco e machado.
  toras(c, rng, R) {
    const rows = R.w >= 5.5 ? 3 : 2, pw = (rows + 1) * 1.1, nx = Math.max(1, Math.floor(R.w / (pw + 0.8))), nz = Math.max(1, Math.floor(R.d / 4.4)), cw = R.w / nx, cd = R.d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { if (rng.chance(0.15)) continue; legoLogPile(c, rng, R.x + (i + 0.5) * cw - pw / 2, R.z + (j + 0.5) * cd - 1.7, 3.4, rows) }
  },
  // Canal de madeira com toras boiando que termina numa roda d'água (o canal corre pelo lado maior da vaga).
  canal(c, rng, R) {
    const L = legoLoc(R, R.w >= R.d ? 'S' : 'E'), W = L.W, D = L.D, v0 = D / 2 - 1.3, v1 = D / 2 + 1.3, vc = D / 2, uc = W - 1.6;
    legoDraw(L, () => {
      pBc(c, 0.3, 0, v0 - 0.4, W - 3, 0.5, v0, 0x6b4a2a, true, { j: 0.03 }); pBc(c, 0.3, 0, v1, W - 3, 0.5, v1 + 0.4, 0x6b4a2a, true, { j: 0.03 }); pBc(c, 0.3, 0, v0, W - 3, 0.18, v1, 0x3a7ad8, false, { j: 0 });
      for (let k = 0, u = 1.2; u < W - 4.5; u += 1.9, k++) pBc(c, u, 0.18, vc - 0.45 + (k % 2) * 0.4 - 0.2, u + 1.4, 0.55, vc + 0.35 + (k % 2) * 0.4 - 0.2, rng.pick(LEGO_PAL.log), false, { j: 0.05 });
      for (const s of [-1, 1]) pBc(c, uc - 0.2, 0, vc + s * 1.9 - 0.15, uc + 0.2, 2.2, vc + s * 1.9 + 0.15, 0x4a3320, true, { j: 0.02 });
      pBc(c, uc - 0.1, 1.5, vc - 1.9, uc + 0.1, 1.9, vc + 1.9, 0x3a3a3a, false, { j: 0 });
      for (let a = 0; a < 8; a++) { const g = a * 0.785, px = uc + Math.cos(g) * 1.3, py = 1.7 + Math.sin(g) * 1.3; pBc(c, px - 0.25, py - 0.15, vc - 1.5, px + 0.25, py + 0.15, vc + 1.5, 0x7a5632, false, { j: 0.03 }) }
    });
  }
};
// Campo de cultivo: leiras (solo) a cada `step` blocos em z e plantas a cada `dx` em x, com altura h + variação v; espantalho em parte dos campos.
function legoCrop(c, rng, R, step, row, dx, cols, h, v) {
  for (let z = R.z; z + row <= R.z + R.d; z += step) {
    pBc(c, R.x, 0, z, R.x + R.w, 0.15, z + row, 0x5a3d22, false, { j: 0.02 });
    for (let x = R.x; x < R.x + R.w - 0.6; x += dx) pBc(c, x + 0.1, 0.15, z + 0.1, Math.min(R.x + R.w, x + dx - 0.2), 0.15 + h + v * rng.next(), z + row - 0.1, rng.pick(cols), false, { j: 0.08 });
  }
  if (R.w >= 8 && R.d >= 8 && rng.chance(0.4)) { const x = R.x + R.w / 2, z = R.z + R.d / 2; poiPole(c, x, z, 2.2); pBc(c, x - 1.1, 1.5, z - 0.1, x + 1.1, 1.7, z + 0.1, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.3, 2.2, z - 0.4, x + 0.3, 2.7, z + 0.4, 0xb89048, false, { j: 0.04 }) }
}
// Enfeites do pátio (rect R): divide em células de ~3 blocos e põe `n` itens sorteados da tabela LEGO_DECOR do tipo (poço e carroça só se a célula for grande).
function legoYard(c, rng, R, type, nr, keep) {
  const D = LEGO_DECOR[type], cw = R.w >= 8 ? 3 : 2, ch = R.d >= 8 ? 2 : 1, cells = [];
  for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) cells.push([R.x + (i + 0.5) * R.w / cw, R.z + (j + 0.5) * R.d / ch, R.w / cw, R.d / ch]);
  rng.shuffle(cells);
  for (let k = 0, n = Math.min(cells.length, rng.int(nr[0], nr[1])); k < n; k++) {
    if (keep && keep(cells[k][0], cells[k][1], Math.max(cells[k][2], cells[k][3]) / 2)) continue;   // célula em cima do caminho do portão à porta: sem enfeite
    const [x, z, w, d] = cells[k], opts = Object.keys(D).filter(t => (t !== 'poco' && t !== 'carroca') || (w >= 3 && d >= 3.6));
    let r = rng.next() * opts.reduce((s, t) => s + D[t], 0), t = opts[0]; for (const o of opts) { r -= D[o]; if (r < 0) { t = o; break } }
    if (t === 'poco') poiWell(c, x, z); else if (t === 'carroca') poiCart(c, x - 1.3, z - 0.75, true, rng.pick([0xd8b84a, 0x6a8a3a, 0xc8a050, 0x6a6a72]));
    else if (t === 'feno') { legoHay(c, x - 0.65, z - 0.65); if (w > 3) legoHay(c, x + 0.8, z - 0.3) } else if (t === 'lampiao') poiLampAt(c, x, z);
    else if (t === 'barril') { barrel(c, x - 0.45, z - 0.45); if (w > 3) barrel(c, x + 0.7, z - 0.2) } else if (t === 'caixa') { crate(c, x - 0.6, z - 0.6, 1.2, 1.1); if (w > 3) crate(c, x + 0.8, z - 0.3, 0.9, 0.9) }
    else if (t === 'braseiro') poiBrazier(c, x, z); else if (t === 'pedra') { const s = 0.5 + rng.next() * 0.6; pBc(c, x - s, 0, z - s, x + s, s * 0.8, z + s, rng.pick(LEGO_PAL.rock), true, { j: 0.1 }) }
    else if (t === 'rack') poiRack(c, x - 0.9, z - 0.2, true); else if (t === 'toco') { pBc(c, x - 0.5, 0, z - 0.5, x + 0.5, 0.5, z + 0.5, 0x6b4a2a, true, { j: 0.05 }); pBc(c, x - 0.1, 0.5, z - 0.1, x + 0.1, 1.2, z + 0.1, 0xb0b0b8, false, { j: 0 }) }
    else if (t === 'tora') pBc(c, x - 1.2, 0, z - 0.4, x + 1.2, 0.7, z + 0.4, rng.pick(LEGO_PAL.log), true, { j: 0.05 }); else poiBench(c, x - 0.9, z - 0.25, true);
  }
}
// Peça sorteada para a vaga (só entre as que cabem; 'nada' conta como peça). null se a vaga não tem tabela.
function legoPieceFor(rng, type, slot) {
  const tab = LEGO_PICK[type][slot.k]; if (!tab) return null;
  const o = Object.keys(tab).filter(id => { const m = LEGO_MIN[id]; return slot.w >= m[0] && slot.d >= m[1] });
  if (!o.length) return null;
  let r = rng.next() * o.reduce((s, id) => s + tab[id], 0);
  for (const id of o) { r -= tab[id]; if (r < 0) return id }
  return o[o.length - 1];
}
// Raio (blocos) de um POI lego do tipo e tamanho dados (metade do lado da receita + 1); é o p.r que legoBuild grava. Usado pelo tile para reservar o lugar antes de construir.
const legoRadius = (type, size) => LEGO_RECIPES[type][size].half + 1;
// Monta o POI lego p (fazenda, mina ou serraria) em c; chamada por POI_BUILD.<tipo> com legoOn. p.legoFace (0 a 3) = para onde o portão aponta (estrada); sem ele, sorteio.
// Guarda p.r e p.recipe; com p.recipe já posto (poiBuild), refaz esse mesmo POI.
function legoBuild(c, rng, p) {
  const R0 = p.recipe && p.recipe.lego ? p.recipe : null, size = R0 ? R0.size : p.legoSize || 'M', rc = LEGO_RECIPES[p.type][size], H = rc.half, n = rc.skeletons.length;
  const r1 = rng.int(0, n - 1), r2 = rng.int(0, 3), r3 = rng.chance(0.5);   // os três sorteios sempre acontecem (mesma sequência da rng com ou sem receita pronta)
  const ski = R0 ? Math.max(0, rc.skeletons.findIndex(s => s.id === R0.skeleton)) : p.legoSk !== undefined ? p.legoSk % n : r1, sk = rc.skeletons[ski];
  const rot = R0 ? R0.rot : p.legoFace !== undefined ? p.legoFace : r2, mir = R0 ? R0.mir : r3, f = legoXf(rot, mir), A = { p, objs: [] }, used = [];   // A.objs: malhas diretas (fogueira) que vão para p.sceneObjs
  p.r = H + 1;
  BC_XF = (x0, z0, x1, z1) => { const a = f(x0, z0), b = f(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
  try {
    for (const s of sk.slots.slice().sort((a, b) => (b.k === 'casa') - (a.k === 'casa'))) {   // a âncora primeiro
      if (s.p !== undefined && rng.next() > s.p) continue;
      if (s.k === 'patio') {   // enfeites longe do caminho do portão até a porta da âncora (a âncora já foi desenhada)
        const dr = A.house ? A.house.door : [0, 0], lane = sk.lane || 0, sg = [[lane, dr[1], lane, H], [Math.min(lane, dr[0]), dr[1], Math.max(lane, dr[0]), dr[1]]];
        legoYard(c, rng, s, p.type, rc.decorN, (x, z, r) => sg.some(q => Math.hypot(x - clamp(x, q[0], q[2]), z - clamp(z, q[1], q[3])) < r + 1.2)); continue
      }
      const id = legoPieceFor(rng, p.type, s); if (!id) continue;
      if (id !== 'nada') LEGO_PIECES[id](c, rng, s, s.k === 'apoio' ? legoFaceFor(sk.slots, s, H) : s.face || 'S', A); used.push(id);
    }
    const g = rc.gate, fz = rc.fence === undefined ? LEGO_FENCE[size] : rc.fence;   // limite em volta com o portão ao sul: muralha (fence 'wall'), cerca (chance) ou nada
    if (fz === 'wall') legoWall(c, H, g);
    else if (rng.chance(fz)) { poiFence(c, -H, -H, H, -H); poiFence(c, -H, -H, -H, H - 1); poiFence(c, H, -H, H, H - 1); poiFence(c, -H, H - 1, -g, H - 1); poiFence(c, g, H - 1, H, H - 1) }
    const lane = sk.lane || 0, dr = A.house ? A.house.door : [0, 0];   // caminho: do portão até a porta da âncora (reta na faixa livre e depois de lado)
    if (rc.path !== false) { poiPath(c, lane, H, lane, dr[1]); if (Math.abs(dr[0] - lane) > 0.5) poiPath(c, lane, dr[1], dr[0], dr[1]) }
  } finally { BC_XF = null }
  if (!rc.noflag) { const fp = f(rc.flag[0], rc.flag[1]); poiFlag(c, p, fp[0], fp[1], 6) }   // bandeira do dono (mesh direto: fora da transformação, com o ponto já girado); ruínas não têm
  p.sceneObjs.push(...A.objs);
  const hp = A.house ? f(A.house.x, A.house.z) : [0, 0], gp = f(0, H);
  const dp = f(A.house ? A.house.door[0] : 0, A.house ? A.house.door[1] : H);
  if (A.anch) Object.assign(p, poiAnchorsMap(A.anch, (x, z) => { const q = f(x, z); return [p.cx + q[0], p.cz + q[1]] }, f, c.y));   // âncoras funcionais das peças, em coordenadas do mapa
  if (p.chestAt) { const q = p.chestAt; delete p.chestAt; if (!p.chest) { p.chest = addChest(q.x, q.y, q.z, 0, rng.int(40, 120), null); p.chest.onOpen = () => poiRuinLoot(p) } }   // baú das ruínas (30% de relíquia)
  p.recipe = { id: p.type, lego: true, size, skeleton: sk.id, seed: (WORLD.seed * 53 + p.id * 97 + 3) >>> 0, rot, mir, pieces: used, anchors: { house: { x: hp[0], z: hp[1] }, gate: { x: gp[0], z: gp[1] }, door: { x: dp[0], z: dp[1] } } };
}

// ---------- POIs antigos virados para a estrada (L1b: taverna, entreposto, pousada, alojamento) ----------
// Verdadeiro se o POI antigo p deve ser desenhado girado (p.legoFace posto pelo compositor do tile, tilecompose.js; só os tipos de LEGO_FACE_TYPES).
const legoFaceOn = p => p.legoFace !== undefined && LEGO_FACE_TYPES.includes(p.type) && !(legoOn() && LEGO_RECIPES[p.type]);   // (com lego ligado, o tipo que tem receita gira nativamente: legoBuild)
// Monta o POI antigo girado k = p.legoFace vezes 90° (o construtor desenha no quadro de sempre, frente = +z, e o gancho BC_XF gira tudo que passa por Bc) e gira as âncoras gravadas
// em coordenadas do mapa (poiAnchorsXf). p.faceGate = o portão (frente), relativo ao centro, já girado: onde a trilha da estrada chega.
function legoOldBuild(c, rng, p) {
  const k = p.legoFace, f = legoXf(k, 0);
  BC_XF = (x0, z0, x1, z1) => { const a = f(x0, z0), b = f(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
  try { POI_BUILD[p.type](c, rng, p) } finally { BC_XF = null }
  poiAnchorsXf(p, k, 0);
  const g = f(0, poiR(p)); p.faceGate = { x: g[0], z: g[1] };
}
// Portão (frente) do POI p, relativo ao centro: o da receita (lego) ou o do POI antigo girado; null se o POI não foi girado.
const legoGateRel = p => p.recipe && p.recipe.anchors ? p.recipe.anchors.gate : p.faceGate || null;

// ---------- cenário ?cenario=lego: mundo super plano com os POIs lego em grade (chamado por poiShowcaseGen, pois.js) ----------
// Uma fileira por tipo e tamanho (LEGO_SHOW), com LEGO_SHOW.n variações lado a lado: a variação i usa o esqueleto i (giro, espelho, peças e enfeites vêm da semente). Cada POI leva uma placa.
function poiLegoShowGen() {
  const S = LEGO_SHOW, V = legoShowView(), rows = V.types.length * S.sizes.length, Y = SEA + 6, row = { r: 0 };
  const gap = Math.max(S.gap, ...V.types.map(t => 2 * legoR(t, 'M') + 8)), x0 = W / 2 - (S.n - 1) * gap / 2, z0 = W / 2 - (rows - 1) * gap / 2;   // espaçamento: cabe o maior POI da vista (vila de trabalhadores: raio 23)
  const owners = ['bandit', (WORLD.factions && WORLD.factions[0]) ? WORLD.factions[0].id : 'bandit', 'player']; WORLD.pois = []; let id = 900;
  for (const type of V.types) for (const size of S.sizes) {
    for (let i = 0; i < S.n; i++) {
      const x = Math.round(x0 + i * gap), z = Math.round(z0 + row.r * gap), p = { id: id++, type, cx: x, cz: z, y: Y, biome: legoShowBiome(), owner: owners[i % 3], show: true, axis: 'z', legoSize: size, legoSk: i };
      poiBuild(p); WORLD.pois.push(p);
      const lbl = poiLegoLabel(p, i); makeSign(lbl, Math.max(4, lbl.length * 0.36 + 0.8), 0.9, 0x2a2a3a, 0xf0e6c0, x, Y + 4.4, z + p.r + 1.2, 'S');
    }
    row.r++;
  }
  WORLD.dormant = []; WORLD.micros = []; let zs = rows ? z0 + (rows - 1) * gap + 30 : 0;
  if (V.micro) zs = Math.max(zs, poiMicroShowGen(Y, V.solo));   // micro-POIs (os 4 dormentes que já existiam e os novos, poimicro.js): ao lado da grade, ou sozinhos e centrados
  WORLD.showcase = { x: W / 2, z: zs, y: Y };
  poiApply();
}
