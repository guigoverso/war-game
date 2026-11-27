'use strict';
// ---------- Peças dos POIs "lego" do L3.5 (docs/features/11_pois-procedurais-lego.md, seção 7h) ----------
// Caçadores, santuário, ruínas, forte, torre, pousada, alojamento, entreposto, plantação, vila de pesca e vila de trabalhadores. Mesmas regras do poilego.js: cada peça desenha
// dentro do retângulo R da vaga (quadro do esqueleto, giro/espelho pelo gancho BC_XF) SÓ com funções que passam por Bc/pBc/acL (poiHut, poiBench, crate, barrel...); nada de tinyTree.
// Peça com frente usa o quadro local legoLoc/legoDraw (u ao longo da frente, v do fundo 0 até a frente D). Âncoras funcionais: legoAnchor(A, tipo, valor) no quadro do esqueleto
// (legoSpot converte um ponto local). Fogueira = buildCampFire (a mesma do acampamento de bandidos, sempre funcional), que é malha direta: legoFire a põe no ponto já girado e
// entrega as chamas em A.objs (legoBuild as junta a p.sceneObjs). A.p = o POI (para o tema da pousada). Receitas e tabelas: js/modifiers/lego-poi-modifiers.js.

// Retângulo de no máximo lw (ao longo da frente) × ld (profundidade) dentro de R para uma peça com a frente para `face`, e o quadro local dele.
const legoFit = (R, face, lw, ld) => { const ns = face === 'S' || face === 'N', r = legoCenter(R, ns ? lw : ld, ns ? ld : lw); return { r, L: legoLoc(r, face) } };
// Ponto local (u,v) do quadro L levado ao quadro do esqueleto, com campos extras o (y, yaw...).
const legoSpot = (L, u, v, o) => { const q = L.map(u, v); return Object.assign({ x: q[0], z: q[1] }, o) };
// Yaw no quadro do esqueleto de uma direção dada no quadro local L como yaw y0 (a frente = (-sen y0, -cos y0); y0 = 0 olha para o fundo da peça).
const legoYaw = (L, y0) => { const a = L.map(0, 0), b = L.map(-Math.sin(y0), -Math.cos(y0)); return Math.atan2(-(b[0] - a[0]), -(b[1] - a[1])) };
// Fogueira do acampamento (buildCampFire) no ponto local (u,v) do quadro de desenho atual; malha direta: vai ao ponto já girado, sem giro, e as chamas ficam em A.objs.
function legoFire(c, rng, A, u, v) {
  const q = bcPt(u, v), xf = BC_XF; BC_XF = null;
  try { A.objs.push(...buildCampFire(Object.assign({}, c, { cx: c.cx + q[0], cz: c.cz + q[1] }), rng)) } finally { BC_XF = xf }
}
// Centro e porta (0.6 bloco fora, na frente) de uma peça-âncora de retângulo r e quadro L, no formato de A.house.
const legoHouse = (r, L, face, A, du) => { const q = L.map(du === undefined ? L.W / 2 : du, L.D / 2), d = du === undefined ? legoDoor(r, face) : L.map(du, L.D); A.house = { x: q[0], z: q[1], door: d } };
// Varal (couros ou peixes) em fileiras ao longo da frente da vaga: dois postes, travessa e peças penduradas de cores sorteadas de `pal`.
function legoLine(c, rng, L, pal, h0) {
  const rows = L.D >= 7 ? 2 : 1;
  legoDraw(L, () => {
    for (let k = 0; k < rows; k++) {
      const v = L.D * (k + 0.5) / rows, u0 = 0.6, u1 = L.W - 0.6;
      poiPole(c, u0, v, 2.8, 0x7a5632); poiPole(c, u1, v, 2.8, 0x7a5632); pBc(c, u0, 2.6, v - 0.08, u1, 2.8, v + 0.08, 0x7a5632, false, { j: 0 });
      for (let u = u0 + 0.5; u < u1 - 0.7; u += 1.0) pBc(c, u, h0, v - 0.05, u + 0.75, 2.6, v + 0.05, rng.pick(pal), false, { j: 0.03 });
    }
  });
}
// Muralha de pedra com ameias e portão (arco, grade e estandartes) em volta do esqueleto, torres nos quatro cantos; o portão fica ao sul (z = H-1), meia-largura g.
function legoWall(c, H, g) {
  const t = 1.4, S = H - 1, seg = (x0, z0, x1, z1, aX) => { poiWall(c, x0, z0, x1, z1, 4, 0x8a8a90); poiCrenels(c, x0, z0, x1, z1, 4, aX) };
  seg(-H, -H, H, -H + t, true); seg(-H, -H, -H + t, S, false); seg(H - t, -H, H, S, false); seg(-H, S - t, -g, S, true); seg(g, S - t, H, S, true);
  pBc(c, -g, 3.4, S - t, g, 4.2, S, 0x7a7a82, true, { j: 0.03 });   // arco do portão
  for (let x = -g + 0.4; x <= g - 0.3; x += 0.8) pBc(c, x - 0.05, 2.0, S - 1.0, x + 0.05, 3.4, S - 0.8, 0x2a2a2a, false, { j: 0 });   // grade levantada
  for (const s of [-1, 1]) { pBc(c, s * (g + 0.5) - 0.45, 0, S - t - 0.2, s * (g + 0.5) + 0.45, 4.7, S + 0.2, 0x7a7a82, true, { j: 0.03 }); pBc(c, s * (g - 0.6) - 0.35, 2.0, S + 0.2, s * (g - 0.6) + 0.35, 3.4, S + 0.28, 0xa02a2a, false, { j: 0.02 }) }
  for (const [x0, z0] of [[-H, -H], [H - 3, -H], [-H, S - 3], [H - 3, S - 3]]) {   // torres de canto
    pBc(c, x0 - 0.2, 0, z0 - 0.2, x0 + 3.2, 1.2, z0 + 3.2, 0x62626a, true, { j: 0.03 }); pBc(c, x0, 0, z0, x0 + 3, 7, z0 + 3, 0x74747a, true, { j: 0.04 }); pBc(c, x0 - 0.2, 7, z0 - 0.2, x0 + 3.2, 7.4, z0 + 3.2, 0x5a5a62, true, { j: 0.02 });
    for (let a = 0.1; a < 3; a += 1.0) for (const [qx, qz] of [[a, -0.2], [a, 2.6], [-0.2, a], [2.6, a]]) pBc(c, x0 + qx, 7.4, z0 + qz, x0 + qx + 0.6, 8.2, z0 + qz + 0.6, 0x7a7a82, true, { j: 0.03 });
  }
  for (const sx of [-1, 1]) for (const z of [-H * 0.45, 0, H * 0.45]) { const x = sx * (H - t - 0.4); pBc(c, x - 0.08, 4, z - 0.08, x + 0.08, 5.0, z + 0.08, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.2, 5.0, z - 0.2, x + 0.2, 5.4, z + 0.2, 0xff9a2a, false, { j: 0.05 }) }   // tochas
  poiBrazier(c, -g - 1.6, S + 1.6); poiBrazier(c, g + 1.6, S + 1.6);
}

Object.assign(LEGO_PIECES, {
  // ---- caçadores ----
  // Fogueira do acampamento no meio, toras de sentar, lenha e o ponto do baú da conquista. Âncora (A.house); firePos e chestPos.
  fogueira(c, rng, R, face, A) {
    const { r, L } = legoFit(R, face, 10, 9), W = L.W, D = L.D, uc = W / 2, vc = D / 2 - 0.3;
    legoDraw(L, () => {
      legoFire(c, rng, A, uc, vc);
      poiBench(c, uc - 0.9, vc + 2.3, true); poiBench(c, uc - 0.9, vc - 2.8, true);   // dois bancos (frente e fundo): os lados ficam abertos para chegar à fogueira a pé
      for (let k = 0; k < 3; k++) pBc(c, W - 1.6 + k * 0.3, 0, 0.8 + k * 0.7, W - 0.7 + k * 0.3, 0.5 + 0.3 * k, 1.4 + k * 0.7, 0x6b4a2a, true, { j: 0.06 });   // lenha empilhada
    });
    legoAnchor(A, 'firePos', legoSpot(L, uc, vc)); legoAnchor(A, 'chestPos', legoSpot(L, uc + 3.0, vc - 2.8, { y: 0 })); legoHouse(r, L, face, A);
  },
  // Uma ou duas tendas de pele (entrada para a frente da vaga), com um barril à porta.
  tenda(c, rng, R, face) {
    const L = legoLoc(R, face), n = L.W >= 10 ? 2 : 1, v = Math.max(1.5, Math.min(L.D - 1.5, L.D / 2));
    legoDraw(L, () => { for (let i = 0; i < n; i++) { const u = L.W * (i + 0.5) / n; poiTent(c, u, v, rng.pick(LEGO_PAL.tents)); if (v + 2.7 <= L.D && rng.chance(0.6)) barrel(c, u + 1.1, v + 1.7) } });
  },
  varal(c, rng, R, face) { legoLine(c, rng, legoLoc(R, face), LEGO_PAL.hides, 0.7) },
  // Poste com chifres de troféu e uma estante de armas.
  trofeu(c, rng, R) {
    const x = R.x + R.w / 2, z = R.z + R.d / 2 - 0.4;
    poiPole(c, x, z, 3); pBc(c, x - 0.7, 2.7, z - 0.1, x + 0.7, 2.9, z + 0.1, 0x4a3320, false, { j: 0 });
    for (const s of [-0.7, 0.58]) pBc(c, x + s, 2.9, z - 0.1, x + s + 0.12, 3.7, z + 0.1, 0xe8e0c8, false, { j: 0 });
    poiRack(c, x - 0.9, z + 1.4, true);
  },
  // Covas de armadilha cobertas de gravetos, com estacas em volta e uma vara com pano vermelho.
  armadilha(c, rng, R) {
    const nx = Math.max(1, Math.floor(R.w / 3)), nz = Math.max(1, Math.floor(R.d / 3)), cw = R.w / nx, cd = R.d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (rng.chance(0.2)) continue;
      const x = R.x + (i + 0.5) * cw, z = R.z + (j + 0.5) * cd;
      pBc(c, x - 0.8, 0, z - 0.8, x + 0.8, 0.08, z + 0.8, 0x1a140e, false, { j: 0 });
      for (let k = 0; k < 3; k++) pBc(c, x - 0.9, 0.08, z - 0.6 + k * 0.6, x + 0.9, 0.14, z - 0.5 + k * 0.6, 0x6b4a2a, false, { j: 0.03 });
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pBc(c, x + sx * 1.05 - 0.07, 0, z + sz * 1.05 - 0.07, x + sx * 1.05 + 0.07, 0.9, z + sz * 1.05 + 0.07, 0x8a6a3a, false, { j: 0.02 });
      if (rng.chance(0.4)) { poiPole(c, x + 1.6, z, 1.6); pBc(c, x + 1.6, 1.0, z - 0.05, x + 2.2, 1.5, z + 0.05, 0xc03a3a, false, { j: 0 }) }
    }
  },
  // Cinco ou seis árvores pequenas espalhadas (as de pomar, com tronco sólido).
  bosque(c, rng, R) {
    const n = clamp(Math.round(R.w * R.d / 22), 1, 6);
    for (let k = 0; k < n; k++) legoTree(c, R.x + 1.8 + rng.next() * Math.max(0, R.w - 3.6), R.z + 1.8 + rng.next() * Math.max(0, R.d - 3.6), rng);
  },

  // ---- santuário ----
  // Capela de pedra com vitrais, altar com toalha e velas, bancos nos dois lados do corredor e braseiros na porta. Âncora (A.house).
  capela(c, rng, R, face, A) {
    const { r, L } = legoFit(R, face, 10, 11), W = L.W, D = L.D, uc = W / 2;
    poiHouse(c, r.x, r.z, r.w, r.d, face, { h: 4.6, wall: rng.pick(LEGO_PAL.stone), roof: 0x5a6a8a, roofT: 'gable', timber: false, chimney: false, shut: null }, rng);
    legoDraw(L, () => {
      pBc(c, uc - 1.1, 0, 1.4, uc + 1.1, 1.0, 2.6, 0xf2eee4, true, { j: 0.02 }); pBc(c, uc - 0.9, 1.0, 1.5, uc + 0.9, 1.1, 2.5, 0xb02a3a, false, { j: 0 });   // altar com toalha
      for (const x of [-0.8, 0.8]) pBc(c, uc + x - 0.08, 1.1, 1.9, uc + x + 0.08, 1.5, 2.1, 0xffe9a0, false, { j: 0 });   // velas
      for (const v of [4.2, 6.0, 7.8]) if (v < D - 2) { poiBench(c, 1.8, v, true); poiBench(c, W - 3.6, v, true) }
      for (const v of [3.2, 6.2]) for (const u of [-0.06, W - 0.02]) pBc(c, u, 1.6, v - 0.6, u + 0.08, 3.6, v + 0.6, rng.pick([0x6aa0e0, 0xe07a6a, 0xe0c04a]), false, { j: 0 });   // vitrais
      poiBrazier(c, uc - 2.2, D + 0.7); poiBrazier(c, uc + 2.2, D + 0.7);
    });
    legoAnchor(A, 'altar', legoSpot(L, uc, 3.4));   // onde o jogador deixa o dízimo (poigame.js, svcSanctuary)
    legoHouse(r, L, face, A);
  },
  // Torre do sino: base cheia, quatro pilares, sino, telhado em pirâmide e cruz.
  campanario(c, rng, R) {
    const cx = R.x + R.w / 2, cz = R.z + R.d / 2;
    pBc(c, cx - 1.6, 0, cz - 1.6, cx + 1.6, 4.5, cz + 1.6, 0xcfc7b6, true, { j: 0.03 });
    for (const [x, z] of [[cx - 1.6, cz - 1.6], [cx + 1.2, cz - 1.6], [cx - 1.6, cz + 1.2], [cx + 1.2, cz + 1.2]]) pBc(c, x, 4.5, z, x + 0.4, 7.5, z + 0.4, 0xd8d0c0, true, { j: 0.02 });
    pBc(c, cx - 0.6, 5.3, cz - 0.6, cx + 0.6, 6.6, cz + 0.6, 0xe0b030, false, { j: 0.03 }); pBc(c, cx - 0.1, 6.6, cz - 0.1, cx + 0.1, 7.2, cz + 0.1, 0x3a3a3a, false, { j: 0 });
    for (let k = 0; k < 4; k++) { const w = 2.0 - k * 0.5; pBc(c, cx - w, 7.5 + k * 0.5, cz - w, cx + w, 8 + k * 0.5, cz + w, k % 2 ? 0x5a6a8a : 0x4a5a7a, false, { j: 0.04 }) }
    pBc(c, cx - 0.1, 8.0, cz - 0.1, cx + 0.1, 9.6, cz + 0.1, 0xe0b030, false, { j: 0 }); pBc(c, cx - 0.45, 9.2, cz - 0.1, cx + 0.45, 9.4, cz + 0.1, 0xe0b030, false, { j: 0 });
  },
  // Cela de pedra (casinha de monge).
  cela(c, rng, R, face) {
    const r = legoCenter(R, 8, 6);
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.6, wall: rng.pick(LEGO_PAL.stone), roof: 0x5a6a8a, shut: 0x3a4a6a, chimney: rng.chance(0.5) }, rng);
  },
  // Canteiros de flores em fileiras (terra com flores de cores sorteadas).
  canteiros(c, rng, R) {
    const nx = Math.max(1, Math.floor(R.w / 5)), nz = Math.max(1, Math.floor(R.d / 3.2)), cw = R.w / nx, cd = R.d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      const x0 = R.x + i * cw + 0.4, z0 = R.z + j * cd + 0.4, w = cw - 0.8, d = Math.min(2.2, cd - 0.8);
      pBc(c, x0, 0, z0, x0 + w, 0.4, z0 + d, 0x5a3d22, false, { j: 0.04 });   // sem colisão: a porta de uma cela pode dar nele
      for (let k = 0, x = x0 + 0.2; x < x0 + w - 0.4; x += 0.52, k++) pBc(c, x, 0.4, z0 + 0.2 + (k % 2) * (d - 0.7), x + 0.35, 0.75, z0 + 0.55 + (k % 2) * (d - 0.7), rng.pick(LEGO_PAL.flowers), false, { j: 0.05 });
    }
  },
  // Cemitério: sepulturas (montinho e lápide) em grade, algumas faltando.
  tumulos(c, rng, R) {
    const nx = Math.max(1, Math.floor(R.w / 2.4)), nz = Math.max(1, Math.floor(R.d / 2.8)), cw = R.w / nx, cd = R.d / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
      if (rng.chance(0.25)) continue;
      const x = R.x + (i + 0.5) * cw, z = R.z + (j + 0.5) * cd;
      pBc(c, x - 0.5, 0, z - 0.1, x + 0.5, 0.25, z + 1.2, 0x5a4a3a, false, { j: 0.05 }); pBc(c, x - 0.4, 0, z - 0.5, x + 0.4, rng.range(0.8, 1.2), z - 0.3, rng.pick(LEGO_PAL.wallStone), true, { j: 0.04 });
    }
  },

  // ---- ruínas ----
  // Altar em ruínas: muro do fundo quebrado, arco partido, colunas (uma caída), degraus em pirâmide até o altar com braseiros e o baú (âncora chestAt). Âncora (A.house).
  altar_ruina(c, rng, R, face, A) {
    const { r, L } = legoFit(R, face, 12, 9), W = L.W, D = L.D, uc = W / 2, v0 = 3.2, n = Math.max(2, Math.floor(W / 3));
    legoDraw(L, () => {
      for (let k = 0; k < n; k++) { const x = 0.3 + k * (W - 0.6) / n, h = rng.range(0.8, 3.8); if (Math.abs(x + 1.1 - uc) < 2.4) continue;
        pBc(c, x, 0, 0, x + 2.2, h, 1.0, rng.pick(poiStone), true, { j: 0.07 }); if (h > 2) pBc(c, x + 0.4, h, 0, x + 1.6, h + 0.6, 1.0, 0x7a7a82, false, { j: 0.1 });
        if (rng.chance(0.5)) pBc(c, x + 0.2, h * 0.5, 1.0, x + 0.6, h * 0.5 + 1.2, 1.06, 0x3a7a2a, false, { j: 0.1 }) }   // muro do fundo com musgo
      pBc(c, 0, 0, 0, 1, rng.range(1.5, 3.5), 3, 0x8a8a90, true, { j: 0.07 }); pBc(c, W - 1, 0, 0, W, rng.range(1, 2.5), 2, 0x8a8a90, true, { j: 0.07 });
      pBc(c, uc - 1.6, 0, 0.2, uc - 0.6, 4.2, 1.6, 0xa8a498, true, { j: 0.04 }); pBc(c, uc + 1.8, 0, 0.2, uc + 2.8, 3.0, 1.6, 0xa8a498, true, { j: 0.04 }); pBc(c, uc - 1.6, 4.2, 0.1, uc + 1.2, 4.8, 1.7, 0xa8a498, false, { j: 0.04 });   // arco partido
      for (let k = 0; k < 4; k++) { const x = 1.2 + k * (W - 2.4) / 3, z = Math.min(D - 1.4, v0 + 2.2 + rng.range(0, 1.5)), h = k === 2 ? 1.3 : rng.range(3, 4.6);
        if (Math.abs(x - uc) < 1.4) continue;   // a porta (frente, no meio) fica livre
        pBc(c, x - 0.6, 0, z - 0.6, x + 0.6, h, z + 0.6, 0xb8b4a8, true, { j: 0.05 }); pBc(c, x - 0.75, h, z - 0.75, x + 0.75, h + 0.25, z + 0.75, 0xa8a498, false, { j: 0.04 }); pBc(c, x - 0.75, 0, z - 0.75, x + 0.75, 0.3, z + 0.75, 0x98948a, false, { j: 0.03 }) }
      for (let s = 0; s < 3; s++) { const hx = 3.0 - s * 0.6, hz = 1.9 - s * 0.4; pBc(c, uc - hx, 0, v0 - hz, uc + hx, 0.3 * (s + 1), v0 + hz, 0xa8a498, true, { j: 0.03 }) }   // degraus do altar
      pBc(c, uc - 0.9, 0.9, v0 - 0.6, uc + 0.9, 1.9, v0 + 0.6, 0xb8b4a8, true, { j: 0.03 }); pBc(c, uc - 1.1, 1.9, v0 - 0.7, uc + 1.1, 2.05, v0 + 0.7, 0x9a968a, false, { j: 0.02 });
      for (const x of [-2.0, 2.0]) poiBrazier(c, uc + x, v0 + 1.2, 0.6);
      for (let k = 0; k < 4; k++) { const x = 1 + rng.next() * (W - 2); pBc(c, x, 0.4, 1.02, x + 0.08, 0.4 + rng.range(0.5, 1.2), 1.06, 0x3aa0b0, false, { j: 0 }) }   // runas apagadas
    });
    legoAnchor(A, 'chestAt', legoSpot(L, uc, v0, { y: 2.05 })); legoHouse(r, L, face, A);
  },
  // Trecho de muro quebrado (blocos de alturas diferentes, alguns com musgo) ao longo da frente da vaga.
  muro_roto(c, rng, R, face) {
    const L = legoLoc(R, face), n = Math.max(2, Math.floor(L.W / 3)), v = L.D / 2 - 0.5;
    legoDraw(L, () => { for (let k = 0; k < n; k++) { if (rng.chance(0.2)) continue;
      const x = k * L.W / n + 0.2, w = L.W / n - 0.5, h = rng.range(0.8, 3.4); pBc(c, x, 0, v, x + w, h, v + 1, rng.pick(poiStone), true, { j: 0.07 });
      if (h > 2) pBc(c, x + 0.3, h, v, x + w - 0.3, h + 0.5, v + 1, 0x7a7a82, false, { j: 0.1 }); if (rng.chance(0.5)) pBc(c, x + 0.2, h * 0.5, v + 1, x + 0.6, h * 0.5 + 1.0, v + 1.06, 0x3a7a2a, false, { j: 0.1 }) } });
  },
  // Arco partido com uma coluna menor e pedras caídas.
  arco(c, rng, R, face) {
    const L = legoLoc(R, face), uc = L.W / 2, v = L.D / 2;
    legoDraw(L, () => {
      pBc(c, uc - 2.0, 0, v - 0.5, uc - 1.0, 4.2, v + 0.5, 0xa8a498, true, { j: 0.04 }); pBc(c, uc + 1.2, 0, v - 0.5, uc + 2.2, rng.range(2, 3.2), v + 0.5, 0xa8a498, true, { j: 0.04 });
      pBc(c, uc - 2.1, 4.2, v - 0.6, uc + 0.6, 4.8, v + 0.6, 0xa8a498, false, { j: 0.04 });
      for (let k = 0; k < 4; k++) { const x = uc - 2.2 + rng.next() * 4.4, z = v + 0.8 + rng.next() * 1.2, s = rng.range(0.4, 0.8); pBc(c, x, 0, z, x + s, s * 0.7, z + s, rng.pick(poiStone), false, { j: 0.1 }) }
    });
  },
  // Colunas (algumas quebradas) com base e capitel.
  columnas(c, rng, R) {
    const n = R.w >= 8 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const x = R.x + (k + 0.5) * R.w / n, z = R.z + R.d * (0.35 + 0.3 * rng.next()), brk = k === 1 || rng.chance(0.3), h = brk ? rng.range(1.0, 1.8) : rng.range(3, 4.6);
      pBc(c, x - 0.6, 0, z - 0.6, x + 0.6, h, z + 0.6, 0xb8b4a8, true, { j: 0.05 }); pBc(c, x - 0.75, 0, z - 0.75, x + 0.75, 0.3, z + 0.75, 0x98948a, false, { j: 0.03 });
      if (!brk) pBc(c, x - 0.75, h, z - 0.75, x + 0.75, h + 0.25, z + 0.75, 0xa8a498, false, { j: 0.04 });
      else if (rng.chance(0.6)) pBc(c, x + 0.9, 0, z - 0.4, x + 2.9, 0.8, z + 0.4, 0xb8b4a8, true, { j: 0.05 });   // pedaço caído
    }
  },
  // Mato e pedras soltas.
  mato(c, rng, R) {
    const n = clamp(Math.round(R.w * R.d / 3), 8, 34);
    for (let k = 0; k < n; k++) { const x = R.x + rng.next() * (R.w - 0.5), z = R.z + rng.next() * (R.d - 0.5); pBc(c, x, 0, z, x + 0.3, rng.range(0.3, 0.8), z + 0.3, rng.pick([0x3a7a2a, 0x2a6a24, 0x4a8a30]), false, { j: 0.1 }) }
    for (let k = 0; k < 3; k++) { const x = R.x + rng.next() * (R.w - 1), z = R.z + rng.next() * (R.d - 1), s = rng.range(0.4, 0.9); pBc(c, x, 0, z, x + s, s * 0.7, z + s, rng.pick(poiStone), false, { j: 0.1 }) }
  },

  // ---- forte ----
  // Torre de menagem de pedra (telhado em quatro águas). Âncora (A.house).
  menagem(c, rng, R, face, A) {
    const r = legoCenter(R, 9, 7), L = legoLoc(r, face);
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 5, wall: 0x9a9a98, roof: 0x4a4a52, roofT: 'hip', chimney: false }, rng); legoHouse(r, L, face, A);
  },
  quartel(c, rng, R, face) {
    const r = legoCenter(R, 9, 6);
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.6, wall: 0x8a7a62, roof: 0x5a4a3a, timber: true }, rng);
  },
  // Estábulo: galpão aberto com manjedoura no fundo e dois ou três cavalos.
  estabulo(c, rng, R, face) {
    const r = legoCenter(R, 10, 6), f = makeShed(c, { x0: r.x, x1: r.x + r.w - 1, z0: r.z, z1: r.z + r.d - 1 }, face, { h: 3.4, roof: 0x6a4a2a }, rng), n = f.U >= 8 ? 3 : 2;
    FB(c, f, 0.8, f.V - 2.0, f.U - 0.8, f.V - 1.2, 0, 0.6, 0x7a5632, true, { j: 0.03 });
    for (let i = 0; i < n; i++) { const q = f.map(1.4 + i * (f.U - 3.4) / (n - 1), Math.max(0.6, f.V - 3.3)); poiAnimal(c, q[0], q[1], rng.pick([0x8a5a3a, 0x3a2a22, 0xf0ece0, 0x6a4a2a]), true) }
  },
  // Campo de treino: bonecos de palha, estante de armas e banco.
  treino(c, rng, R) {
    const n = R.w >= 9 ? 3 : 2;
    for (let k = 0; k < n; k++) { const x = R.x + (k + 0.5) * R.w / n, z = R.z + R.d * 0.4; poiPole(c, x, z, 2.2); pBc(c, x - 1.1, 1.5, z - 0.1, x + 1.1, 1.7, z + 0.1, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.3, 2.2, z - 0.4, x + 0.3, 2.7, z + 0.4, 0xb89048, false, { j: 0.04 }) }
    poiRack(c, R.x + 0.6, R.z + R.d - 1.4, true); poiBench(c, R.x + R.w - 2.6, R.z + R.d - 1.2, true);
  },

  // ---- torre ----
  // Torre de vigia de pedra: porta para a frente, escada de 8 degraus pelo lado esquerdo até a plataforma (parapeito, telhado em quatro águas, braseiro e binóculo no tripé),
  // cama, baú e mesa por dentro. Âncoras: vigilPos (no térreo) e binoc (na plataforma). Âncora (A.house).
  torre_vigia(c, rng, R, face, A) {
    const { r, L } = legoFit(R, face, 9, 8), W = L.W, D = L.D, b = 3.3, cu = Math.max(4.7, W - 3.7), cv = D - 0.6 - b, ST = 0x7a7a82;
    legoDraw(L, () => {
      poiWall(c, cu - b, cv - b, cu + b, cv - b + 1, 9, ST); poiWall(c, cu - b, cv - b, cu - b + 1, cv + b, 9, ST); poiWall(c, cu + b - 1, cv - b, cu + b, cv + b, 9, ST);
      poiWall(c, cu - b, cv + b - 1, cu - 0.9, cv + b, 9, ST); poiWall(c, cu + 0.9, cv + b - 1, cu + b, cv + b, 9, ST); pBc(c, cu - 0.9, 2.8, cv + b - 1, cu + 0.9, 9, cv + b, ST, true, { j: 0.04 });   // porta na frente
      for (const y of [3.4, 6.4]) pBc(c, cu - b - 0.1, y, cv - b - 0.1, cu + b + 0.1, y + 0.25, cv + b + 0.1, 0x6a6a72, false, { j: 0.02 });
      for (const y of [4.6, 7.4]) { pBc(c, cu - 0.4, y, cv - b - 0.06, cu + 0.4, y + 1.0, cv - b + 0.02, 0x1a1a1a, false, { j: 0 }); pBc(c, cu + b - 0.02, y, cv - 0.4, cu + b + 0.06, y + 1.0, cv + 0.4, 0x1a1a1a, false, { j: 0 }) }   // seteiras
      const sl = 2 * b / 9;   // escada pelo lado esquerdo: 9 degraus de 1 bloco, do chão (frente) até a altura 9 junto ao fundo (a plataforma sobe até 9,5: o último degrau tem meio bloco, não dois)
      for (let i = 0; i < 9; i++) { const v1 = cv + b - i * sl, v0 = v1 - sl;
        pBc(c, cu - b - 1.4, 0, v0, cu - b, i + 1, v1, i % 2 ? 0x8a8a92 : 0x7a7a82, true, { j: 0.03 }); pBc(c, cu - b - 1.45, i + 1, v0, cu - b - 1.35, i + 2.1, v1, 0x4a3320, false, { j: 0 }) }
      pBc(c, cu - b, 9, cv - b - 0.4, cu + b + 0.4, 9.5, cv + b + 0.4, 0x6b4a2a, true, { j: 0.03 });   // plataforma (sem beiral do lado da escada)
      for (let k = cu - b; k < cu + b + 0.4; k += 1.2) { pBc(c, k, 9.5, cv - b - 0.4, k + 0.7, 10.8, cv - b - 0.2, 0x7a5632, true, { j: 0.04 }); pBc(c, k, 9.5, cv + b + 0.2, k + 0.7, 10.8, cv + b + 0.4, 0x7a5632, true, { j: 0.04 }) }
      for (let k = cv - b - 0.4; k < cv + b + 0.4; k += 1.2) { if (k > cv - b + 1.9) pBc(c, cu - b, 9.5, k, cu - b + 0.2, 10.8, k + 0.7, 0x7a5632, true, { j: 0.04 }); pBc(c, cu + b + 0.2, 9.5, k, cu + b + 0.4, 10.8, k + 0.7, 0x7a5632, true, { j: 0.04 }) }
      pBc(c, cu - b, 10.5, cv - b - 0.4, cu + b + 0.4, 10.8, cv - b - 0.2, 0x6b4a2a, true, { j: 0.02 }); pBc(c, cu - b, 10.5, cv + b + 0.2, cu + b + 0.4, 10.8, cv + b + 0.4, 0x6b4a2a, true, { j: 0.02 }); pBc(c, cu + b + 0.2, 10.5, cv - b - 0.4, cu + b + 0.4, 10.8, cv + b + 0.4, 0x6b4a2a, true, { j: 0.02 });
      for (const [px, pz] of [[cu + b, cv - b], [cu + b, cv + b], [cu - b + 0.2, cv + b]]) pBc(c, px - 0.12, 10.8, pz - 0.12, px + 0.12, 13.2, pz + 0.12, 0x4a3320, false, { j: 0 });
      roofOn(c, cu - b, cv - b - 0.4, cu + b + 0.4, cv + b + 0.4, 13.2, 'hip', 0x7a4a2a, { trim: 0x4a3320 });
      fillT(c, { x0: Math.round(cu) - 2, x1: Math.round(cu) + 1, z0: Math.round(cv) - 2, z1: Math.round(cv) + 1 }, T_FLOOR);
      poiBrazier(c, cu + b - 0.8, cv - b + 0.8, 9.5);
      const bz = cv - b + 0.5; pBc(c, cu - 0.08, 9.5, bz - 0.08, cu + 0.08, 10.6, bz + 0.08, 0x3a3a3a, true, { j: 0 }); pBc(c, cu - 0.3, 10.55, bz - 0.5, cu + 0.3, 10.75, bz + 0.5, 0x4a4a52, false, { j: 0 });   // binóculo no tripé
      for (const s of [-0.14, 0.14]) { pBc(c, cu + s - 0.1, 10.65, bz - 0.6, cu + s + 0.1, 10.9, bz + 0.4, 0x2a2a32, false, { j: 0 }); pBc(c, cu + s - 0.13, 10.62, bz - 0.7, cu + s + 0.13, 10.93, bz - 0.58, 0x6ab0ff, false, { j: 0 }) }
      pBc(c, cu - 2.2, 0, cv - 2.2, cu - 0.6, 0.5, cv - 0.2, 0x6b4a2a, true, { j: 0.03 }); pBc(c, cu - 2.2, 0.5, cv - 2.2, cu - 0.6, 0.7, cv - 0.2, 0xc03a3a, false, { j: 0 });   // cama
      pBc(c, cu + 0.9, 0, cv - 2.2, cu + 2.2, 0.7, cv - 1.4, 0x7a4a22, true, { j: 0.03 }); pBc(c, cu + 0.9, 0, cv + 0.3, cu + 2.2, 0.9, cv + 1.3, 0x5a3d22, true, { j: 0.03 }); pBc(c, cu + 0.8, 0.9, cv + 0.2, cu + 2.3, 1.0, cv + 1.4, 0x8a6a3a, false, { j: 0 });
      poiLampAt(c, cu - 2.4, D + 0.3); poiSign(c, cu + 2.0, D + 0.4, 0x4a3a2a);
    });
    legoAnchor(A, 'vigilPos', legoSpot(L, cu, cv)); legoAnchor(A, 'binoc', legoSpot(L, cu, cv - b + 0.5, { y: 10.8 }));
    legoHouse(r, L, face, A, cu);
  },

  // ---- pousada, alojamento e entreposto ----
  // Pousada: casa de um andar com balcão, duas camas e criado-mudo com vela. Âncoras: bed e svcSpec (pousadeiro). Âncora (A.house).
  posada(c, rng, R, face, A) {
    const { r, L } = legoFit(R, face, 12, 8), W = L.W, du = W - 12;   // vaga menor que 12: a casa encolhe e as camas e a mesinha andam junto com o fundo (antes ficavam para fora da parede)
    poiHouse(c, r.x, r.z, r.w, r.d, face, { h: 4, wall: 0xd8b888, roof: 0x8a3a2a, chimney: true, timber: true, shut: 0x4a3a2a }, rng);
    legoDraw(L, () => {
      pBc(c, 0.8, 0, 2.6, 4.4, 1.05, 3.3, 0x7a5632, true, { j: 0.03 }); pBc(c, 0.7, 1.05, 2.5, 4.5, 1.15, 3.4, 0x9a6a3a, false, { j: 0.02 });   // balcão
      for (const [bx, sw] of [[6.6 + du, 0xc03a3a], [8.6 + du, 0x3a6ac0]]) { pBc(c, bx, 0, 1.1, bx + 1.5, 0.5, 3.5, 0x6b4a2a, true, { j: 0.02 }); pBc(c, bx + 0.1, 0.5, 1.2, bx + 1.4, 0.75, 2.8, sw, false, { j: 0.02 }); pBc(c, bx + 0.1, 0.5, 2.8, bx + 1.4, 0.7, 3.4, 0xf0ece0, false, { j: 0 }) }
      pBc(c, 5.6 + du, 0, 1.0, 6.2 + du, 0.7, 1.6, 0x7a4a22, true, { j: 0.02 }); pBc(c, 5.8 + du, 0.7, 1.1, 6.0 + du, 0.95, 1.5, 0xfff0b0, false, { j: 0 });
    });
    legoAnchor(A, 'bed', legoSpot(L, 7.35 + du, 2.4, { y: 0.1 }));
    legoAnchor(A, 'svcSpec', legoSpot(L, 4.8, 2.7, { kind: 'inn', role: 'merchant', label: txtLegoSvc.inn, yaw: legoYaw(L, 0), r: 3.2 })); legoHouse(r, L, face, A);
  },
  // Enfeite de fora da pousada por tema do tile (feira, minério ou toras; poiRestTheme).
  tema(c, rng, R, face, A) { poiRestTheme(c, rng, A.p, R.x + 0.5, R.z + 0.5) },
  // Barracão aberto com beliches (dois leitos empilhados com cobertas). Âncora bed. Âncora (A.house).
  barracao(c, rng, R, face, A) {
    const r = legoCenter(R, 11, 8), L = legoLoc(r, face), n = Math.max(1, Math.floor((L.W - 1) / 3));
    makeShed(c, { x0: r.x, x1: r.x + r.w - 1, z0: r.z, z1: r.z + r.d - 1 }, face, { h: 3.4, roof: 0x6a5a3a }, rng);
    legoDraw(L, () => { for (let i = 0; i < n; i++) { const u = 1.0 + i * 3;
      for (const [y, col] of [[0, rng.pick(LEGO_PAL.blankets)], [1.5, rng.pick(LEGO_PAL.blankets)]]) { pBc(c, u, y, 1.2, u + 1.5, y + 0.5, 3.4, 0x6b4a2a, true, { j: 0.02 }); pBc(c, u + 0.1, y + 0.5, 1.3, u + 1.4, y + 0.7, 3.3, col, false, { j: 0.03 }) }
      for (const [pu, pv] of [[u, 1.2], [u + 1.4, 1.2], [u, 3.3], [u + 1.4, 3.3]]) pBc(c, pu, 0, pv, pu + 0.12, 1.5, pv + 0.12, 0x5a3d22, true, { j: 0 }) } });
    legoAnchor(A, 'bed', legoSpot(L, 1.75, 2.3, { y: 0.1 })); legoHouse(r, L, face, A);
  },
  // Cozinha de campo: a fogueira do acampamento (cozinhar), mesa de preparo com legumes, banco, barris e lenha; o cozinheiro fica ao lado. Âncoras: firePos e svcSpec (cozinheiro).
  cozinha(c, rng, R, face, A) {
    const L = legoLoc(R, face), W = L.W, D = L.D, uf = W * 0.6, vf = D * 0.6;   // a fogueira fica para a frente; mesa, barris e lenha atrás, para os lados e a frente ficarem abertos
    legoDraw(L, () => {
      legoFire(c, rng, A, uf, vf);
      pBc(c, uf - 2.0, 0, vf - 3.3, uf + 2.0, 0.95, vf - 2.3, 0x7a5632, true, { j: 0.03 });
      for (let k = 0; k < 5; k++) pBc(c, uf - 1.7 + k * 0.75, 0.95, vf - 3.1 + (k % 2) * 0.4, uf - 0.9 + k * 0.75, 1.2, vf - 2.7 + (k % 2) * 0.4, rng.pick([0xc83a2a, 0xe08a2a, 0x5ab03a, 0xd8d0b0]), false, { j: 0.06 });
      barrel(c, W - 1.7, 0.4); barrel(c, W - 1.7, 1.5);
      for (let k = 0; k < 3; k++) pBc(c, 0.4 + k * 0.3, 0, 0.4 + k * 0.7, 1.4 + k * 0.3, 0.5 + 0.3 * k, 1.0 + k * 0.7, 0x6b4a2a, true, { j: 0.06 });
    });
    legoAnchor(A, 'firePos', legoSpot(L, uf, vf));
    legoAnchor(A, 'svcSpec', legoSpot(L, uf - 3.0, vf + 0.4, { kind: 'inn', role: 'merchant', label: txtLegoSvc.cook, yaw: legoYaw(L, Math.PI * 0.5) }));
  },
  // Galpão de mercado: prateleiras com mercadorias no fundo e um balcão que fecha o galpão (o lojista fica atrás). Âncora svcSpec (lojista). Âncora (A.house).
  mercado(c, rng, R, face, A) {
    const r = legoCenter(R, 18, 10), L = legoLoc(r, face), W = L.W, D = L.D, cvv = Math.round(D * 0.58);
    makeShed(c, { x0: r.x, x1: r.x + r.w - 1, z0: r.z, z1: r.z + r.d - 1 }, face, { h: 3.9, roof: 0x7a4a22 }, rng);
    legoDraw(L, () => {
      pBc(c, 0.1, 0, 0.1, W - 0.1, 0.1, D - 0.1, 0x8a6a3a, false, { j: 0.03 });
      for (let lv = 0; lv < 3; lv++) { const y = 0.9 + lv * 0.9; pBc(c, 0.4, y, 0.2, W - 0.4, y + 0.1, 1.3, 0x6b4a2a, false, { j: 0.02 });
        for (let x = 0.8; x < W - 1.2; x += 1.15) pBc(c, x, y + 0.1, 0.5, x + 0.9, y + 0.1 + rng.range(0.35, 0.7), 1.1, rng.pick(LEGO_PAL.goods), false, { j: 0.08 }) }
      pBc(c, 0.2, 0, cvv, W - 0.2, 1.1, cvv + 0.7, 0x7a5632, true, { j: 0.03 }); pBc(c, 0, 1.1, cvv - 0.1, W, 1.2, cvv + 0.8, 0x9a6a3a, false, { j: 0.02 });   // balcão
      for (let k = 0; k < 4; k++) pBc(c, 1.4 + k * (W - 3) / 3, 1.2, cvv + 0.1, 2.2 + k * (W - 3) / 3, 1.7, cvv + 0.6, rng.pick([0xd8c8a0, 0xc8a060, 0x8a5a3a]), false, { j: 0.06 });
      pBc(c, W / 2 - 0.4, 1.2, cvv + 0.2, W / 2 + 0.4, 1.35, cvv + 0.5, 0xe0b030, false, { j: 0.02 }); pBc(c, W / 2 - 0.1, 1.35, cvv + 0.3, W / 2 + 0.1, 1.9, cvv + 0.4, 0x3a3a3a, false, { j: 0 });   // balança
      poiLampAt(c, 1.2, cvv - 1.5); poiLampAt(c, W - 1.2, cvv - 1.5);
    });
    legoAnchor(A, 'svcSpec', legoSpot(L, W / 2, cvv - 0.8, { kind: 'shop', role: 'merchant', label: txtLegoSvc.shop, yaw: legoYaw(L, 0) })); legoHouse(r, L, face, A);
  },
  // Banca de feira: quatro postes, balcão com frutas e toldo listrado.
  banca(c, rng, R, face) {
    const L = legoLoc(R, face), bu = L.W / 2 - 2.4, bv = L.D / 2 - 1.8;
    legoDraw(L, () => {
      for (const [x, z] of [[bu, bv], [bu + 4.8, bv], [bu, bv + 3.6], [bu + 4.8, bv + 3.6]]) pBc(c, x - 0.1, 0, z - 0.1, x + 0.1, 2.7, z + 0.1, 0x5a3d22, true, { j: 0.02 });
      pBc(c, bu + 0.4, 0, bv + 1.0, bu + 4.4, 1.0, bv + 1.8, 0x7a5632, true, { j: 0.03 });
      for (let i = 0; i < 5; i++) pBc(c, bu - 0.2 + i, 2.6 + i * 0.04, bv - 0.1, bu + 0.8 + i, 2.8 + i * 0.04, bv + 3.7, i % 2 ? 0xc03a3a : 0xf0ece0, false, { j: 0.03 });
      for (let k = 0; k < 7; k++) pBc(c, bu + 0.7 + k * 0.5, 1.0, bv + 1.1 + (k % 2) * 0.4, bu + 1.1 + k * 0.5, 1.3, bv + 1.5 + (k % 2) * 0.4, rng.pick(LEGO_PAL.fruit), false, { j: 0.05 });
    });
  },
  // Uma ou duas carroças carregadas, de lado para a frente da vaga.
  carrocas(c, rng, R, face) {
    const L = legoLoc(R, face), n = L.D >= 8 ? 2 : 1;
    legoDraw(L, () => { for (let i = 0; i < n; i++) poiCart(c, (L.W - 3.8) / 2, L.D * (i + 0.5) / n - 0.75, true, rng.pick([0xc8a060, 0x8a5a3a, 0xd8b84a, 0x6a6a72])) });
  },
  // Barra de amarrar com dois cavalos.
  cavalos(c, rng, R, face) {
    const L = legoLoc(R, face), u0 = 0.8, u1 = L.W - 0.8;
    legoDraw(L, () => {
      pBc(c, u0, 0.95, 0.5, u1, 1.1, 0.7, 0x5a3d22, false, { j: 0.02 }); for (let u = u0; u <= u1 + 0.1; u += (u1 - u0) / 2) pBc(c, u - 0.1, 0, 0.5, u + 0.1, 1.4, 0.7, 0x4a3320, true, { j: 0 });
      poiAnimal(c, u0 + 0.6, 1.3, rng.pick([0x8a5a3a, 0x3a2a22]), true); poiAnimal(c, u1 - 2.2, 1.4, rng.pick([0xf0ece0, 0x6a4a2a]), true);
    });
  },
  // Pilha de caixas, barris, sacos e (se couber) feno.
  pilha(c, rng, R) {
    crate(c, R.x + 0.6, R.z + 0.6, 1.2, 1.2); crate(c, R.x + 1.9, R.z + 0.7, 1.0, 0.9); barrel(c, R.x + 0.8, R.z + 2.2); barrel(c, R.x + 2.0, R.z + 2.3);
    for (let k = 0; k < 4; k++) pBc(c, R.x + 0.6 + (k % 2) * 1.1, 0, R.z + R.d - 1.9 + Math.floor(k / 2) * 0.9, R.x + 1.6 + (k % 2) * 1.1, 0.7, R.z + R.d - 1.1 + Math.floor(k / 2) * 0.9, 0xd8c8a0, true, { j: 0.1 });
    if (R.w >= 6) legoHay(c, R.x + R.w - 2.4, R.z + 0.6);
  },

  // ---- vila de pesca ----
  // Cabana de pescador (casinha de madeira). Âncora (A.house).
  cabana(c, rng, R, face, A) {
    const r = legoCenter(R, 9, 7), L = legoLoc(r, face), P = LEGO_PAL;
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.6, wall: rng.pick(P.work), roof: rng.pick(P.workRoof), timber: true, shut: 0x3a5a6a, chimney: rng.chance(0.6) }, rng); legoHouse(r, L, face, A);
  },
  // Lago raso (areia na margem, água baixa, juncos) com um cais de tábuas que entra pela frente e um barco amarrado.
  lago(c, rng, R, face) {
    const L = legoLoc(R, face), W = L.W, D = L.D, uc = W / 2, vb = D * 0.4;
    legoDraw(L, () => {
      pBc(c, 0.2, 0, 0.2, W - 0.2, 0.1, D - 0.2, 0xc0b080, false, { j: 0.04 }); pBc(c, 0.9, 0, 0.9, W - 0.9, 0.16, D - 0.9, 0x3a7ad8, false, { j: 0 });
      for (let k = 0; k < 8; k++) { const t = rng.next(), x = t < 0.5 ? 0.7 + rng.next() * (W - 1.4) : (rng.chance(0.5) ? 0.6 : W - 0.8), z = t < 0.5 ? (rng.chance(0.5) ? 0.6 : D - 0.8) : 0.7 + rng.next() * (D - 1.4); pBc(c, x, 0, z, x + 0.12, rng.range(0.8, 1.5), z + 0.12, 0x5a8a3a, false, { j: 0.02 }) }   // juncos
      for (let v = D * 0.3; v < D; v += 0.4) pBc(c, uc - 0.9, 0.2, v, uc + 0.9, 0.26, v + 0.34, v % 0.8 < 0.4 ? 0x7a5632 : 0x8a6a3e, false, { j: 0.02 });   // cais
      for (const s of [-1, 1]) for (let v = D * 0.3 + 0.4; v < D; v += 1.6) pBc(c, uc + s * 1.0 - 0.1, 0, v, uc + s * 1.0 + 0.1, 0.9, v + 0.2, 0x4a3320, false, { j: 0 });
      const bc = rng.pick(LEGO_PAL.boat); pBc(c, uc + 1.4, 0.16, vb, uc + 2.7, 0.55, vb + 3.2, bc, false, { j: 0.03 }); pBc(c, uc + 1.6, 0.55, vb + 0.3, uc + 2.5, 0.6, vb + 2.9, 0x3a2a1a, false, { j: 0 }); pBc(c, uc + 1.8, 0.16, vb - 0.5, uc + 2.3, 0.55, vb, bc, false, { j: 0.03 });
    });
  },
  // Rede de pesca esticada entre dois postes, com boias, e um barril.
  redes(c, rng, R, face) {
    const L = legoLoc(R, face), v = L.D / 2, u0 = 0.6, u1 = L.W - 0.6;
    legoDraw(L, () => {
      poiPole(c, u0, v, 2.6, 0x7a5632); poiPole(c, u1, v, 2.6, 0x7a5632);
      for (let j = 0; j < 4; j++) pBc(c, u0, 0.7 + j * 0.5, v - 0.04, u1, 0.75 + j * 0.5, v + 0.04, 0x9a9a78, false, { j: 0 });
      for (let u = u0 + 0.5; u < u1 - 0.3; u += 0.7) pBc(c, u, 0.7, v - 0.04, u + 0.05, 2.3, v + 0.04, 0x9a9a78, false, { j: 0 });
      for (let u = u0 + 0.6; u < u1 - 0.4; u += 1.4) pBc(c, u, 2.3, v - 0.09, u + 0.2, 2.5, v + 0.09, rng.pick([0xc83a2a, 0xf0ece0, 0xe0c030]), false, { j: 0 });
      if (L.D >= 5) barrel(c, u0 + 0.8, v + 1.0);
    });
  },
  // Um ou dois barcos virados sobre cavaletes (casco de tábuas).
  barcos(c, rng, R, face) {
    const L = legoLoc(R, face), n = L.W >= 11 ? 2 : 1;
    legoDraw(L, () => { for (let i = 0; i < n; i++) { const u = L.W * (i + 0.5) / n - 1.8, v = L.D / 2 - 0.6, bc = rng.pick(LEGO_PAL.boat);
      for (const k of [0.6, 3.0]) pBc(c, u + k, 0, v + 0.1, u + k + 0.2, 0.55, v + 1.1, 0x4a3320, true, { j: 0 });
      pBc(c, u, 0.55, v - 0.1, u + 3.6, 1.0, v + 1.3, bc, true, { j: 0.04 }); pBc(c, u + 0.5, 1.0, v + 0.1, u + 3.1, 1.3, v + 1.1, shadec(bc, 0.85), false, { j: 0.04 }); pBc(c, u + 3.4, 0.7, v + 0.3, u + 3.9, 1.1, v + 0.9, bc, false, { j: 0.03 }) } });
  },
  // Varal de peixes secando.
  secagem(c, rng, R, face) { legoLine(c, rng, legoLoc(R, face), LEGO_PAL.fish, 1.0) },

  // ---- vila de trabalhadores ----
  // Choupana: casinha de madeira simples.
  choupana(c, rng, R, face) {
    const r = legoCenter(R, 8, 6), P = LEGO_PAL;
    poiHut(c, r.x, r.z, r.w, r.d, face, { h: 3.6, wall: rng.pick(P.work), roof: rng.pick(P.workRoof), timber: true, shut: 0x4a3a2a, chimney: rng.chance(0.5) }, rng);
  }
});
