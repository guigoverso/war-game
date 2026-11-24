'use strict';
// ---------- Montador de POIs "lego" (L2: fazenda, mina e serraria; docs/features/11_pois-procedurais-lego.md) ----------
// Um POI lego é um ESQUELETO (vagas com retângulo, tipo e frente) preenchido por PEÇAS que se ajustam ao retângulo da vaga. Tudo é desenhado no quadro do esqueleto
// (portão ao sul, +z) e girado/espelhado de uma vez pelo gancho BC_XF de Bc (city.js; setTL e acL também o seguem): peças só usam funções que passam por Bc/pBc/acL
// (poiFence, poiHut, poiWell, crate, barrel, hay...; NÃO usar tinyTree, que escreve direto). Dados em js/modifiers/lego-modifiers.js (LEGO_RECIPES, LEGO_PICK...).
// Ligado por ?lego=1 ou ?cenario=lego (legoOn). Determinístico: só usa `rng`.
// Contrato com o jogo: p.flagMat/bandeira (poiFlag), p.r (raio da instância), p.lego = {type, size, skeleton, rot, mir, pieces, house:{x,z}, gate:{x,z}} (coordenadas
// relativas ao centro). Tamanho: p.legoSize ('M' médio, 'P' pequeno); esqueleto forçado: p.legoSk (índice); frente: p.legoFace (0 a 3, ver legoRotToward).

// Transformação do esqueleto para o POI: espelha em x (mir) e gira k vezes 90° ((x,z)->(-z,x); k=1 leva o sul para o oeste, 2 norte, 3 leste).
const legoXf = (k, mir) => (x, z) => { if (mir) x = -x; for (let i = 0; i < k; i++) { const t = x; x = -z; z = t } return [x, z] };
// Rotação (0 a 3) que leva o portão (sul) para a direção (dx,dz) (ex.: a da estrada mais próxima).
const legoRotToward = (dx, dz) => { const v = [[0, 1], [-1, 0], [0, -1], [1, 0]]; let b = 0, bd = -9; v.forEach((q, i) => { const d = q[0] * dx + q[1] * dz; if (d > bd) { bd = d; b = i } }); return b };
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

  // Mina: boca em morro de pedra (escalonado, sem escavar o terreno: gira com o POI) com portal de madeira e trilhos até um vagonete. Âncora (A.house).
  boca(c, rng, R, face, A) {
    const L = legoLoc(R, face), w = Math.min(L.W, 12), d = Math.min(L.D, 9), u0 = (L.W - w) / 2, mv = d - 3, uc = u0 + w / 2, P = LEGO_PAL, base = rng.pick(P.rock);
    legoDraw(L, () => {
      const tiers = [[0, 0, mv, 3.4], [1.2, 0.5, mv - 1.2, 5.0], [2.6, 1.0, mv - 2.4, 6.2]];   // degraus do morro: [recuo lateral, v do fundo, v da frente, topo]
      tiers.forEach((t, k) => { const a = u0 + t[0], b = u0 + w - t[0]; if (b - a < 3 || t[2] - t[1] < 0.8) return;
        pBc(c, a, k ? tiers[k - 1][3] : 0, t[1], b, t[3], t[2], shadec(base, 1 - k * 0.06 + rng.range(-0.04, 0.04)), true, { j: 0.08 }) });
      pBc(c, uc - 1.3, 0, mv, uc + 1.3, 2.7, mv + 0.08, 0x0c0c10, false, { j: 0 });   // boca escura
      for (const s of [-1, 1]) pBc(c, uc + s * 1.5 - 0.2, 0, mv, uc + s * 1.5 + 0.2, 3.0, mv + 0.45, 0x5a3d22, false, { j: 0.02 });
      pBc(c, uc - 1.8, 2.9, mv, uc + 1.8, 3.4, mv + 0.45, 0x4a3320, false, { j: 0.02 });
      for (const s of [-1, 1]) { pBc(c, uc + s * 2.1 - 0.06, 2.2, mv + 0.2, uc + s * 2.1 + 0.06, 2.9, mv + 0.32, 0x2a2a2a, false, { j: 0 }); pBc(c, uc + s * 2.1 - 0.2, 2.8, mv + 0.1, uc + s * 2.1 + 0.2, 3.3, mv + 0.4, 0xffe9a0, false, { j: 0 }) }   // lanternas
      for (const s of [-0.8, 0.8]) pBc(c, uc + s - 0.06, 0.02, mv, uc + s + 0.06, 0.16, d, 0x9a9aa2, false, { j: 0 });   // trilhos
      for (let v = mv + 0.2; v < d; v += 0.7) pBc(c, uc - 1.2, 0, v, uc + 1.2, 0.06, v + 0.3, 0x4a3320, false, { j: 0 });
      poiCart(c, uc - 0.75, mv + 0.3, false, rng.pick(P.ore));   // vagonete com minério na boca
    });
    const hp = L.map(uc, mv / 2), dr = L.map(uc, d + 0.6); A.house = { x: hp[0], z: hp[1], door: dr };
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
// Monta o POI lego p (fazenda, mina ou serraria) em c; chamada por POI_BUILD.<tipo> com legoOn. p.legoFace (0 a 3) = para onde o portão aponta (estrada); sem ele, sorteio.
// Guarda p.r e p.lego.
function legoBuild(c, rng, p) {
  const size = p.legoSize || 'M', rc = LEGO_RECIPES[p.type][size], H = rc.half, n = rc.skeletons.length, ski = p.legoSk !== undefined ? p.legoSk % n : rng.int(0, n - 1), sk = rc.skeletons[ski];
  const rot = p.legoFace !== undefined ? p.legoFace : rng.int(0, 3), mir = rng.chance(0.5), f = legoXf(rot, mir), A = {}, used = [];
  p.r = H + 1;
  BC_XF = (x0, z0, x1, z1) => { const a = f(x0, z0), b = f(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
  try {
    const fl = LEGO_FLOOR[p.biome] || LEGO_FLOOR[0], bare = rng.chance(LEGO_FLOOR_BARE[p.biome] || 0);   // bare: sem piso, vale o chão do terreno
    if (!bare) pBc(c, -H, 0, -H, H, 0.05, H - 1, fl.base, false, { j: 0.03 });   // piso do bioma em toda a área (os campos e prédios assentam sobre ela)
    for (let k = 0; !bare && k < 14; k++) { const x = rng.range(-H, H - 2), z = rng.range(-H, H - 3), w = rng.range(1.5, 3.5), d = rng.range(1.2, 3);   // manchas (0.07: acima do piso, sem piscar)
      pBc(c, x, 0, z, Math.min(H, x + w), 0.07, Math.min(H - 1, z + d), rng.pick(fl.alt), false, { j: 0.05 }) }
    for (const s of sk.slots.slice().sort((a, b) => (b.k === 'casa') - (a.k === 'casa'))) {   // a âncora primeiro
      if (s.p !== undefined && rng.next() > s.p) continue;
      if (s.k === 'patio') {   // enfeites longe do caminho do portão até a porta da âncora (a âncora já foi desenhada)
        const dr = A.house ? A.house.door : [0, 0], lane = sk.lane || 0, sg = [[lane, dr[1], lane, H], [Math.min(lane, dr[0]), dr[1], Math.max(lane, dr[0]), dr[1]]];
        legoYard(c, rng, s, p.type, rc.decorN, (x, z, r) => sg.some(q => Math.hypot(x - clamp(x, q[0], q[2]), z - clamp(z, q[1], q[3])) < r + 1.2)); continue
      }
      const id = legoPieceFor(rng, p.type, s); if (!id) continue;
      if (id !== 'nada') LEGO_PIECES[id](c, rng, s, s.k === 'apoio' ? legoFaceFor(sk.slots, s, H) : s.face || 'S', A); used.push(id);
    }
    const g = rc.gate;   // cerca em volta (LEGO_FENCE por tamanho) com o portão ao sul
    if (rng.chance(LEGO_FENCE[size])) { poiFence(c, -H, -H, H, -H); poiFence(c, -H, -H, -H, H - 1); poiFence(c, H, -H, H, H - 1); poiFence(c, -H, H - 1, -g, H - 1); poiFence(c, g, H - 1, H, H - 1) }
    const lane = sk.lane || 0, dr = A.house ? A.house.door : [0, 0];   // caminho: do portão até a porta da âncora (reta na faixa livre e depois de lado)
    poiPath(c, lane, H, lane, dr[1]); if (Math.abs(dr[0] - lane) > 0.5) poiPath(c, lane, dr[1], dr[0], dr[1]);
  } finally { BC_XF = null }
  const fp = f(rc.flag[0], rc.flag[1]); poiFlag(c, p, fp[0], fp[1], 6);   // bandeira do dono (mesh direto: fora da transformação, com o ponto já girado)
  const hp = A.house ? f(A.house.x, A.house.z) : [0, 0], gp = f(0, H);
  p.lego = { type: p.type, size, skeleton: sk.id, rot, mir, pieces: used, house: { x: hp[0], z: hp[1] }, gate: { x: gp[0], z: gp[1] } };
}

// ---------- cenário ?cenario=lego: mundo super plano com os POIs lego em grade (chamado por poiShowcaseGen, pois.js) ----------
// Uma fileira por tipo e tamanho (LEGO_SHOW), com LEGO_SHOW.n variações lado a lado: a variação i usa o esqueleto i (giro, espelho, peças e enfeites vêm da semente). Cada POI leva uma placa.
function poiLegoShowGen() {
  const S = LEGO_SHOW, rows = S.types.length * S.sizes.length, x0 = W / 2 - (S.n - 1) * S.gap / 2, z0 = W / 2 - (rows - 1) * S.gap / 2, Y = SEA + 6, row = { r: 0 };
  const owners = ['bandit', (WORLD.factions && WORLD.factions[0]) ? WORLD.factions[0].id : 'bandit', 'player']; WORLD.pois = []; WORLD.dormant = []; let id = 900;
  for (const type of S.types) for (const size of S.sizes) {
    for (let i = 0; i < S.n; i++) {
      const x = Math.round(x0 + i * S.gap), z = Math.round(z0 + row.r * S.gap), p = { id: id++, type, cx: x, cz: z, y: Y, biome: legoShowBiome(), owner: owners[i % 3], show: true, axis: 'z', legoSize: size, legoSk: i };
      poiBuild(p); WORLD.pois.push(p);
      const lbl = poiLegoLabel(p, i); makeSign(lbl, Math.max(4, lbl.length * 0.36 + 0.8), 0.9, 0x2a2a3a, 0xf0e6c0, x, Y + 4.4, z + p.r + 1.2, 'S');
    }
    row.r++;
  }
  WORLD.showcase = { x: W / 2, z: z0 + (rows - 1) * S.gap + 30, y: Y };
  poiApply();
}
