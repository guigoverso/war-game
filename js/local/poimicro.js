'use strict';
// ---------- Micro-POIs (L3 do plano lego, docs/features/11_pois-procedurais-lego.md) ----------
// Micro-POI = só cenário (decisão 1 do plano): sem dono, serviço, anexação nem mapa; 1 função pequena que desenha ao redor de (0,0) dentro do raio de LEGO_MICRO.list.
// Mesma máquina das decorações dormentes da guerra (DORM_BUILD, pois.js): dormBuild lê MICRO_BUILD quando o tipo não é dormente. Só peças que passam por Bc (pBc, crate, barrel,
// poiFence, poiHut...; NÃO hay nem tinyTree, que escrevem direto): cada micro sorteia giro (0 a 3) e espelho pela semente e o desenha pelo gancho BC_XF, como o POI lego.
// Sem fogueira (regra do CLAUDE.md: fogueira de POI é a do acampamento e funcional; micro é cenário). Determinístico: só usa `rng`. Dados em LEGO_MICRO (lego-modifiers.js).

const MICRO_STONE = [0x8a8a90, 0x7a7a82, 0x9a9aa0, 0x6e6e76];
const MICRO_WOOD = [0x6b4a2a, 0x7a5632, 0x5a3d22, 0x8a5a2a];
// Árvore morta (tronco e galhos finos), só com pBc (gira com o micro).
function microDeadTree(c, rng, x, z) {
  const h = rng.range(3.4, 4.6);
  pBc(c, x - 0.3, 0, z - 0.3, x + 0.3, h, z + 0.3, 0x5a4a3a, true, { j: 0.03 });
  for (const [s, y] of [[-1, h * 0.55], [1, h * 0.75]]) pBc(c, x + (s > 0 ? 0.3 : -1.6), y, z - 0.1, x + (s > 0 ? 1.6 : -0.3), y + 0.18, z + 0.1, 0x4a3a2c, false, { j: 0.02 });
}
// Lápide de pedra (base e topo mais estreito) com a frente para o sul.
function microGrave(c, rng, x, z, mound) {
  if (mound) pBc(c, x - 0.6, 0, z - 0.2, x + 0.6, 0.22, z + 1.6, 0x4a3a2a, false, { j: 0.05 });
  pBc(c, x - 0.5, 0, z - 0.5, x + 0.5, 0.9, z - 0.2, rng.pick(MICRO_STONE), true, { j: 0.04 }); pBc(c, x - 0.35, 0.9, z - 0.5, x + 0.35, 1.2, z - 0.2, rng.pick(MICRO_STONE), false, { j: 0.04 });
}

const MICRO_PIECES = {
  // Carroça quebrada: caixa caída de lado, uma roda de pé e outra no chão, o varal partido e a carga espalhada.
  carroca(c, rng) {
    pBc(c, -2.2, 0.15, -0.9, -0.5, 0.5, 0.9, 0x7a5632, true, { j: 0.03 }); pBc(c, -0.5, 0.45, -0.9, 1.6, 0.8, 0.9, 0x6a4a2a, true, { j: 0.03 });
    pBc(c, -0.2, 0.2, 0.9, 0.9, 1.3, 1.0, 0x4a3320, false, { j: 0 }); pBc(c, 2.4, 0, 1.6, 3.5, 0.12, 2.7, 0x4a3320, false, { j: 0 });   // roda de pé; roda caída
    pBc(c, 1.6, 0.55, -0.1, 4.2, 0.7, 0.1, 0x4a3320, false, { j: 0.02 }); pBc(c, 4.2, 0.2, 0.4, 4.9, 0.3, 0.55, 0x4a3320, false, { j: 0.02 });   // varal e a ponta partida
    crate(c, -3.6, 1.3, 1.0, 0.9); crate(c, 2.6, -2.8, 1.1, 1.0); barrel(c, -2.6, -2.6);
    for (let k = 0; k < 3; k++) pBc(c, -1 + k * 1.1, 0, 2.2 + (k % 2) * 0.5, 0.1 + k * 1.1, 0.4, 3.2 + (k % 2) * 0.5, rng.pick([0xc8b070, 0xb89a58, 0xd0c090]), true, { j: 0.1 });   // sacos
  },
  // Acampamento abandonado: duas tendas (uma caída), toras de assento, caixas, um saco de dormir e as estacas de uma terceira; sem fogueira.
  acampamento(c, rng) {
    poiTent(c, -4.2, -2.4, rng.pick([0x8a6a3a, 0x6a7a4a, 0xa08a5a])); poiTent(c, 3.8, -3.6, rng.pick([0x8a6a3a, 0x6a7a4a, 0xa08a5a]));
    pBc(c, 1.5, 0, 2.2, 5.2, 0.22, 4.6, 0x8a7a5a, false, { j: 0.1 }); pBc(c, 2.1, 0.22, 2.7, 4.6, 0.4, 4.1, 0x7a6a4a, false, { j: 0.1 });   // tenda caída
    for (const [x, z] of [[1.5, 2.2], [5.2, 2.2], [1.5, 4.6], [5.2, 4.6]]) pBc(c, x - 0.08, 0, z - 0.08, x + 0.08, 0.9, z + 0.08, 0x5a3d22, false, { j: 0 });
    pBc(c, -1.6, 0, 1.6, 1.6, 0.5, 2.4, 0x6a4a2e, true, { j: 0.05 }); pBc(c, -1.4, 0, 3.4, 0.2, 0.5, 4.2, 0x6a4a2e, true, { j: 0.05 });   // toras de assento
    pBc(c, -5.6, 0, 2.2, -4.2, 0.25, 4.4, 0x6a5a8a, false, { j: 0.05 });   // saco de dormir
    crate(c, -0.2, -2.8, 1.1, 1.1); barrel(c, 0.3, -4.2); poiSign(c, 6, 0.4, 0x5a4a3a);
  },
  // Estande de caça: dois varais com peles, um poste com chifres de troféu, tora de corte e lenha.
  estande(c, rng) {
    for (const z0 of [-2.6, 0.6]) {
      poiPole(c, -3, z0, 2.8, 0x7a5632); poiPole(c, 3, z0, 2.8, 0x7a5632); pBc(c, -3, 2.6, z0 - 0.08, 3, 2.8, z0 + 0.08, 0x7a5632, false, { j: 0 });
      for (let x = -2.5; x < 2.7; x += 1.0) pBc(c, x, 0.7, z0 - 0.05, x + 0.75, 2.6, z0 + 0.05, rng.pick([0xe0b888, 0xd0a070, 0xc89860, 0x8a6a4a, 0xb8b0a0]), false, { j: 0.03 });
    }
    poiPole(c, 0, 4, 3); pBc(c, -0.7, 2.7, 3.9, 0.7, 2.9, 4.1, 0x4a3320, false, { j: 0 }); for (const s of [-0.7, 0.55]) pBc(c, s, 2.9, 3.9, s + 0.12, 3.7, 4.1, 0xe8e0c8, false, { j: 0 });
    pBc(c, 3.6, 0, 3.2, 4.8, 0.7, 4.4, 0x6b4a2a, true, { j: 0.05 }); pBc(c, 3.9, 0.7, 3.7, 4.5, 1.3, 3.9, 0xb0b0b8, false, { j: 0 });   // tora de corte com faca
    for (let k = 0; k < 3; k++) pBc(c, -5 + k * 0.35, 0, 2.5 + k * 0.7, -4.1 + k * 0.35, 0.5 + 0.3 * k, 3.1 + k * 0.7, 0x6b4a2a, true, { j: 0.06 });
  },
  // Altar solitário: plataforma de dois degraus, laje com pano, quatro pilares (dois partidos) e velas apagadas.
  altar(c, rng) {
    const st = rng.pick(MICRO_STONE);
    pBc(c, -3.6, 0, -3.6, 3.6, 0.3, 3.6, shadec(st, 0.9), true, { j: 0.03 }); pBc(c, -2.6, 0.3, -2.6, 2.6, 0.6, 2.6, st, true, { j: 0.03 });
    pBc(c, -1.4, 0.6, -0.8, 1.4, 1.4, 0.8, shadec(st, 1.1), true, { j: 0.03 }); pBc(c, -1.6, 1.4, -1.0, 1.6, 1.6, 1.0, shadec(st, 1.15), true, { j: 0.02 });
    pBc(c, -0.9, 1.6, -0.7, 0.9, 1.65, 0.7, rng.pick([0x8a2a2a, 0x2a3a8a, 0x5a2a6a]), false, { j: 0.02 });
    for (const [sx, sz, h] of [[-1, -1, 3.4], [1, -1, 1.7], [-1, 1, 2.2], [1, 1, 3.4]]) { pBc(c, sx * 3 - 0.4, 0.3, sz * 3 - 0.4, sx * 3 + 0.4, h, sz * 3 + 0.4, st, true, { j: 0.04 }); pBc(c, sx * 3 - 0.55, h, sz * 3 - 0.55, sx * 3 + 0.55, h + 0.25, sz * 3 + 0.55, shadec(st, 1.1), false, { j: 0.02 }) }
    for (const x of [-1, 0, 1]) pBc(c, x - 0.1, 1.65, -0.1, x + 0.1, 2.1, 0.1, 0xf0ece0, false, { j: 0 });
    for (let k = 0; k < 4; k++) { const s = rng.range(0.3, 0.6); pBc(c, -4 + k * 2, 0, 4.2, -4 + k * 2 + s, s * 0.7, 4.2 + s, st, false, { j: 0.1 }) }   // pedras caídas à frente
  },
  // Ruína de torre: quadrado de 7x7 com os muros de alturas diferentes (quebrados), vão ao sul, piso e entulho em volta.
  torre(c, rng) {
    const st = rng.pick(MICRO_STONE), seg = (x0, z0, x1, z1) => { const n = Math.max(1, Math.round(Math.max(x1 - x0, z1 - z0) / 2.2)); for (let i = 0; i < n; i++) {
      const a = (x1 - x0) / n, b = (z1 - z0) / n, h = rng.chance(0.2) ? 0.6 : rng.range(1.6, 5.2); pBc(c, x0 + a * i, 0, z0 + b * i, x0 + a * (i + 1) + (a ? 0 : 0.8), h, z0 + b * (i + 1) + (b ? 0 : 0.8), shadec(st, rng.range(0.9, 1.1)), true, { j: 0.06 }) } };
    pBc(c, -2.7, 0, -2.7, 2.7, 0.1, 2.7, 0x5a5a60, false, { j: 0.03 });
    seg(-3.5, -3.5, 3.5, -3.5); seg(-3.5, -3.5, -3.5, 3.5); seg(3.5, -3.5, 3.5, 3.5); seg(-3.5, 3.5, -1.5, 3.5); seg(1.5, 3.5, 3.5, 3.5);   // o vão do sul (3 blocos) fica livre
    pBc(c, -3.5, 0, -3.5, -2.5, 6.0, -2.5, shadec(st, 0.95), true, { j: 0.05 });   // canto que ainda está de pé
    for (let k = 0; k < 7; k++) { const x = rng.range(-6, 5.5), z = rng.range(-6, 6), s = rng.range(0.4, 0.9); if (Math.abs(x) < 4.2 && Math.abs(z) < 4.2) continue; pBc(c, x, 0, z, x + s, s * 0.7, z + s, rng.pick(MICRO_STONE), true, { j: 0.1 }) }
  },
  // Monólito: pedra alta em três blocos, anel de pedras baixas, chão escuro e uma runa que brilha.
  monolito(c, rng) {
    pBc(c, -4.4, 0, -4.4, 4.4, 0.08, 4.4, 0x4a4a52, false, { j: 0.04 });
    pBc(c, -0.9, 0, -0.7, 0.9, 2.4, 0.7, 0x6a6a74, true, { j: 0.04 }); pBc(c, -0.7, 2.4, -0.55, 0.7, 4.2, 0.55, 0x74747e, true, { j: 0.04 }); pBc(c, -0.45, 4.2, -0.4, 0.45, 5.4, 0.4, 0x7e7e88, false, { j: 0.04 });
    pBc(c, -0.25, 1.4, 0.7, 0.25, 3.2, 0.78, 0x6ae0ff, false, { j: 0 }); pBc(c, -0.6, 2.2, 0.7, 0.6, 2.5, 0.78, 0x6ae0ff, false, { j: 0 });   // runa
    for (let i = 0; i < 8; i++) { const g = i * Math.PI / 4 + 0.2, x = Math.cos(g) * 3.6, z = Math.sin(g) * 3.6, h = rng.range(0.6, 1.6); pBc(c, x - 0.4, 0, z - 0.4, x + 0.4, h, z + 0.4, rng.pick(MICRO_STONE), true, { j: 0.08 }) }
  },
  // Cabana de ermitão: casa pequena, horta, lenha, toco com machado, banco e barril de água.
  ermitao(c, rng) {
    const P = LEGO_PAL;
    poiHut(c, -5, -4, 5, 4, 'S', { h: 3.2, wall: rng.pick(P.wall), roof: rng.pick(P.roof), shut: rng.pick(P.shut), timber: true, chimney: true }, rng);
    legoCrop(c, rng, { x: 1.5, z: -3.6, w: 4, d: 3.4 }, 1.3, 0.8, 0.9, P.crops.horta, 0.5, 0.3);
    for (let k = 0; k < 3; k++) pBc(c, -5.6 + k * 0.35, 0, 1.4 + k * 0.7, -4.7 + k * 0.35, 0.5 + 0.3 * k, 2.0 + k * 0.7, 0x6b4a2a, true, { j: 0.06 });
    pBc(c, 1, 0, 2.6, 2, 0.5, 3.6, 0x6b4a2a, true, { j: 0.05 }); pBc(c, 1.4, 0.5, 2.8, 1.6, 1.2, 3.0, 0xb0b0b8, false, { j: 0 });
    poiBench(c, -3.6, 0.4, true); barrel(c, -1.4, 0.3); poiPath(c, -2.5, 0.6, -2.5, 3.2);
  },
  // Carrinho de minério perdido: trilhos curtos que acabam no nada, vagonete tombado, pilha de minério, lampião e picareta.
  minerio(c, rng) {
    for (const s of [-0.8, 0.8]) pBc(c, s - 0.06, 0.02, -4, s + 0.06, 0.16, 2.2, 0x9a9aa2, false, { j: 0 });
    for (let v = -3.8; v < 2.2; v += 0.7) pBc(c, -1.2, 0, v, 1.2, 0.06, v + 0.3, 0x4a3320, false, { j: 0 });
    pBc(c, -1.3, 0.2, 2.4, 1.3, 1.0, 4.4, 0x5a5a62, true, { j: 0.03 }); pBc(c, -1.0, 0.95, 2.6, 1.0, 1.3, 4.2, rng.pick(LEGO_PAL.ore), false, { j: 0.08 });
    for (let k = 0; k < 6; k++) pBc(c, 2.6 + rng.range(0, 1.8), 0, -2 + rng.range(0, 2.4), 3.3 + rng.range(0, 1.8), 0.4 + rng.range(0, 0.5), -1.3 + rng.range(0, 2.4), rng.pick(LEGO_PAL.ore), true, { j: 0.1 });
    poiLampAt(c, -3.2, -2.4); poiRack(c, -4.6, 1, false);
  },
  // Toras caídas: três troncos deitados, tocos, galhos, serragem e um machado cravado.
  toras(c, rng) {
    pBc(c, -4.5, 0, -2.4, 1.5, 0.9, -1.4, rng.pick(LEGO_PAL.log), true, { j: 0.04 }); pBc(c, -3.5, 0, 0.2, 3.5, 0.9, 1.2, rng.pick(LEGO_PAL.log), true, { j: 0.04 }); pBc(c, 2.6, 0, -3.8, 3.6, 0.9, 0.2, rng.pick(LEGO_PAL.log), true, { j: 0.04 });
    pBc(c, -4.4, 0.9, -2.3, -3.2, 1.3, -1.5, 0x4a7a32, false, { j: 0.1 });   // ramos verdes no tronco
    for (const [x, z] of [[-1, 3], [4, 2.4]]) { pBc(c, x - 0.6, 0, z - 0.6, x + 0.6, 0.6, z + 0.6, 0x6b4a2a, true, { j: 0.05 }); pBc(c, x - 0.5, 0.6, z - 0.5, x + 0.5, 0.65, z + 0.5, 0xc8a868, false, { j: 0 }) }
    pBc(c, 3.4, 0.6, 2.2, 3.6, 1.3, 2.4, 0xb0b0b8, false, { j: 0 });
    pBc(c, -3, 0, 2.4, 0.6, 0.09, 5, 0xd0a868, false, { j: 0.05 });
    for (let k = 0; k < 4; k++) { const x = rng.range(-5, 4), z = rng.range(-5, 4); pBc(c, x, 0, z, x + 1.1, 0.12, z + 0.1, 0x5a3d22, false, { j: 0.05 }) }
  },
  // Armadilha de caça: cova coberta de tábuas (meio quebrada), estacas em volta, corda e placa de aviso.
  armadilha(c, rng) {
    pBc(c, -2, 0, -2, 2, 0.06, 2, 0x1a1410, false, { j: 0 });
    for (let k = 0; k < 4; k++) pBc(c, -2.2 + k * 1.15, 0.08, -2.2 + (k % 2) * 0.1, -1.2 + k * 1.15, 0.2, 0.6 + (k % 3) * 0.6, 0x7a5632, false, { j: 0.03 });
    for (let k = 0; k < 8; k++) { const g = k * Math.PI / 4, x = Math.cos(g) * 3.2, z = Math.sin(g) * 3.2; pBc(c, x - 0.07, 0, z - 0.07, x + 0.07, 0.9, z + 0.07, 0xd8c8a0, true, { j: 0 }) }
    pBc(c, -3.2, 0.5, -0.04, 3.2, 0.58, 0.04, 0x8a7a5a, false, { j: 0 });
    poiSign(c, 4.2, 3.4, 0x8a2a2a); pBc(c, 2.4, 0, -3.6, 3.0, 0.15, -3.1, 0xe8e0c8, false, { j: 0.05 });
  },
  // Tumba: cerca baixa com portão ao sul, quatro sepulturas com lápides, uma cruz de madeira e uma árvore morta.
  tumba(c, rng) {
    poiFence(c, -5, -4.5, 5, -4.5, 0x6a6a70); poiFence(c, -5, -4.5, -5, 4); poiFence(c, 5, -4.5, 5, 4); poiFence(c, -5, 4, -1.5, 4); poiFence(c, 1.5, 4, 5, 4);
    for (const [x, z] of [[-3, -2.5], [0, -2.5], [3, -2.5], [-1.5, 0.4]]) microGrave(c, rng, x, z, true);
    pBc(c, 2.6, 0, 0.6, 3.0, 1.8, 0.9, 0x6b4a2a, true, { j: 0.03 }); pBc(c, 2.0, 1.2, 0.6, 3.6, 1.5, 0.9, 0x6b4a2a, false, { j: 0.03 });   // cruz
    microDeadTree(c, rng, -4, 2.6); poiPath(c, 0, 4.4, 0, 1.6);
  },
  // Estátua: pedestal de três degraus, figura de pedra com um braço erguido, cabeça e braço quebrados no chão, musgo.
  estatua(c, rng) {
    const st = rng.pick(MICRO_STONE);
    pBc(c, -2.2, 0, -2.2, 2.2, 0.35, 2.2, shadec(st, 0.9), true, { j: 0.03 }); pBc(c, -1.6, 0.35, -1.6, 1.6, 0.7, 1.6, st, true, { j: 0.03 }); pBc(c, -1.1, 0.7, -1.1, 1.1, 1.9, 1.1, shadec(st, 1.1), true, { j: 0.03 });
    pBc(c, -0.6, 1.9, -0.35, -0.05, 3.0, 0.35, shadec(st, 1.05), true, { j: 0.03 }); pBc(c, 0.05, 1.9, -0.35, 0.6, 3.0, 0.35, shadec(st, 1.05), true, { j: 0.03 });   // pernas
    pBc(c, -0.7, 3.0, -0.4, 0.7, 4.2, 0.4, shadec(st, 1.1), true, { j: 0.03 }); pBc(c, -1.0, 3.2, -0.2, -0.7, 3.8, 0.2, shadec(st, 1.1), false, { j: 0.02 });   // tronco e braço
    pBc(c, 0.7, 3.4, -0.2, 1.0, 4.6, 0.2, shadec(st, 1.1), false, { j: 0.02 });   // braço erguido
    pBc(c, -0.1, 4.8, -0.2, 0.1, 4.9, 0.2, shadec(st, 1.1), false, { j: 0 });   // (cabeça perdida: só o toco do pescoço)
    pBc(c, 2.6, 0, 1.2, 3.5, 0.7, 2.1, shadec(st, 1.15), true, { j: 0.06 }); pBc(c, -3.4, 0, 2.2, -2.2, 0.3, 2.6, shadec(st, 1.05), false, { j: 0.05 });   // cabeça e braço no chão
    pBc(c, -2.0, 0.36, -2.0, -0.6, 0.4, -0.8, 0x4a7a32, false, { j: 0.05 });   // musgo
  },

  // ---- ecos de um conflito antigo (armas de fogo, não medievais) ----
  // Campo de batalha esquecido: fuzis cravados no chão com capacete em cima (sepulturas de campanha), fuzis caídos, estojos de cartucho, terra revolvida, caixa de munição e bandeira rasgada.
  campo_batalha(c, rng) {
    pBc(c, -5.5, 0, -4.5, 5.5, 0.07, 4.5, 0x3a3226, false, { j: 0.05 });   // terra revolvida e queimada
    for (const [x, z] of [[-4, -2.5], [-1.5, -3], [1.2, -2.4], [3.8, -3], [-3, 0.4], [2.4, 0.2]]) { microGrave(c, rng, x, z + 0.4, true); microRifleStuck(c, x + 0.1, z + 1.4); if (rng.chance(0.6)) microHelmet(c, x + 0.1, z + 1.4, 1.5) }
    for (let k = 0; k < 4; k++) microRifleLying(c, rng.range(-4.5, 3), rng.range(1.6, 4), rng.chance(0.5));
    for (let k = 0; k < 14; k++) { const x = rng.range(-5, 5), z = rng.range(-3.5, 4.2); pBc(c, x, 0, z, x + 0.14, 0.1, z + 0.14, 0xc8a030, false, { j: 0 }) }
    crate(c, 4.4, 2.8, 1.0, 0.9); poiPole(c, -5.2, 3.4, 3.4, 0x5a4a3a); pBc(c, -5.1, 2.2, 3.35, -3.7, 3.3, 3.45, 0x8a2a2a, false, { j: 0.04 }); pBc(c, -4.4, 2.2, 3.35, -3.7, 2.6, 3.45, 0x1a1a1a, false, { j: 0 });   // bandeira queimada na ponta
  },
  // Barricada derrubada: fileira de sacos de areia com um vão e sacos soltos, ouriço de vigas (frisa), rolo de arame no chão, carroça tombada e fuzil caído.
  barricada(c, rng) {
    poiBarrierRow(c, -6, -1, -1.6, -1); poiBarrierRow(c, 1.6, -1, 6, -1);   // vão de 3,2 blocos no meio
    for (let k = 0; k < 5; k++) { const x = rng.range(-2.5, 3), z = rng.range(-0.2, 2.2); pBc(c, x, 0, z, x + 1.1, 0.45, z + 0.6, rng.pick([0xb8a06a, 0xa8905a, 0xc0a878]), true, { j: 0.1 }) }   // sacos soltos
    const hx = -3.8, hz = 3.2; pBc(c, hx - 1.1, 0.5, hz - 0.12, hx + 1.1, 0.74, hz + 0.12, 0x4a3320, true, { j: 0.02 }); pBc(c, hx - 0.12, 0.5, hz - 1.1, hx + 0.12, 0.74, hz + 1.1, 0x4a3320, true, { j: 0.02 }); pBc(c, hx - 0.12, 0, hz - 0.12, hx + 0.12, 1.6, hz + 0.12, 0x4a3320, false, { j: 0.02 });   // frisa
    for (let k = 0; k < 4; k++) pBc(c, 1 + k * 0.8, 0.02, 3.4 + (k % 2) * 0.35, 1.7 + k * 0.8, 0.22, 3.85 + (k % 2) * 0.35, 0x6a6a72, false, { j: 0.04 });   // arame
    pBc(c, 3.6, 0, 2.6, 5.9, 0.5, 4.2, 0x7a5632, true, { j: 0.03 }); pBc(c, 3.2, 0.3, 4.2, 6.2, 0.38, 4.35, 0x4a3320, false, { j: 0.02 }); pBc(c, 5.9, 0.2, 2.9, 6.6, 1.2, 3.0, 0x4a3320, false, { j: 0.02 });   // carroça tombada
    microRifleLying(c, -1, 3, true); microHelmet(c, 0.6, 2.2, 0);
  },
  // Trincheira abandonada: vala marcada por dois parapetos de terra e sacos, tábuas podres no fundo, caixas, lampião apagado, capacete e fuzil; passagem no meio.
  trincheira(c, rng) {
    pBc(c, -6.5, 0, -1.1, 6.5, 0.05, 1.1, 0x2a2218, false, { j: 0.02 });   // fundo escuro da vala
    for (const [z0, z1] of [[-2.4, -1.1], [1.1, 2.4]]) for (const [a, b] of [[-6.5, -1.7], [1.7, 6.5]]) {
      pBc(c, a, 0, z0, b, 0.9, z1, 0x5a4a34, true, { j: 0.07 }); pBc(c, a + 0.3, 0.9, z0 + 0.2, b - 0.3, 1.3, z1 - 0.2, rng.pick([0xb8a06a, 0xa8905a]), false, { j: 0.1 }) }   // parapeitos (vão de 3,4 no meio)
    for (let k = 0; k < 5; k++) pBc(c, -5.5 + k * 2.4, 0.06, -0.9, -4.6 + k * 2.4, 0.12, 0.9, rng.pick([0x5a4a38, 0x4a3a2a, 0x6a5a40]), false, { j: 0.04 });   // tábuas
    for (const x of [-4.5, 4.5]) { pBc(c, x - 0.1, 0, -1.1, x + 0.1, 1.6, -0.9, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.1, 0, 0.9, x + 0.1, 1.6, 1.1, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.1, 1.5, -1.1, x + 0.1, 1.65, 1.1, 0x4a3320, false, { j: 0 }) }   // escoras
    crate(c, 5, 0.1, 1.0, 0.9); crate(c, -5.6, -0.6, 1.0, 1.0); poiLampAt(c, -3.4, 3.6); microHelmet(c, 3.1, 0, 0.12); microRifleLying(c, -2.4, 0.1, true);
    for (let k = 0; k < 5; k++) { const x = rng.range(-6, 5), z = rng.range(3, 4.6); pBc(c, x, 0, z, x + 0.14, 0.1, z + 0.14, 0xc8a030, false, { j: 0 }) }
  },
  // Vala comum com marco: faixa de terra remexida, cruz grande de madeira, capacetes em estacas ao longo da vala, pá cravada e flores secas.
  vala_comum(c, rng) {
    pBc(c, -4.5, 0, -1.6, 4.5, 0.35, 1.6, 0x4a3a2a, false, { j: 0.08 }); pBc(c, -3.6, 0.35, -1.0, 3.6, 0.5, 1.0, 0x3a2e22, false, { j: 0.1 });
    pBc(c, -5.4, 0, -0.2, -4.8, 3.6, 0.4, 0x6b4a2a, true, { j: 0.03 }); pBc(c, -6.4, 2.4, -0.15, -3.8, 2.9, 0.35, 0x6b4a2a, true, { j: 0.03 });   // cruz
    for (let k = 0; k < 5; k++) { const x = -3 + k * 1.7; pBc(c, x - 0.05, 0, 2.2, x + 0.05, 1.3, 2.3, 0x5a3d22, false, { j: 0 }); microHelmet(c, x, 2.25, 1.3) }
    pBc(c, 4.8, 0, 2.6, 4.9, 1.7, 2.7, 0x5a3d22, false, { j: 0 }); pBc(c, 4.6, 1.5, 2.55, 5.1, 1.9, 2.75, 0x8a8a90, false, { j: 0 });   // pá
    for (let k = 0; k < 6; k++) pBc(c, -3.4 + k * 1.4 + rng.range(-0.3, 0.3), 0.5, -0.5 + rng.range(-0.4, 0.4), -3.2 + k * 1.4, 0.8, -0.3, rng.pick([0x8a7a3a, 0x7a5a3a, 0x9a8a5a]), false, { j: 0.05 });   // flores secas
    microGrave(c, rng, 0, -3.8, false);
  },
  // Paliçada tombada: fileira de troncos com a ponta afiada, a maioria caída em ângulos de 90° (deitada em x ou em z), poucos de pé, um portal partido, cordas cortadas e marcas de queimado.
  palicada(c, rng) {
    for (let i = 0; i < 9; i++) {
      const x = -6 + i * 1.5, st = i === 0 || i === 8 || i === 4 && rng.chance(0.5), col = rng.chance(0.3) ? 0x2a2218 : rng.pick([0x6b4a2a, 0x5a3d22, 0x7a5632]);
      if (st) { pBc(c, x - 0.3, 0, -0.3, x + 0.3, rng.range(3.4, 4.4), 0.3, col, true, { j: 0.03 }); pBc(c, x - 0.15, 4.4, -0.15, x + 0.15, 4.9, 0.15, col, false, { j: 0 }) }
      else if (x > 2.5 || rng.chance(0.5)) { const z = rng.range(-3.6, 3.2); pBc(c, x - 0.3, 0, z - 0.3, x + 0.3, 0.6, z + 3 - 0.3, col, true, { j: 0.03 }); pBc(c, x - 0.15, 0.1, z + 2.7, x + 0.15, 0.4, z + 3.4, col, false, { j: 0 }) }   // caído em z
      else { const z = rng.range(-3.5, 3.5); pBc(c, x - 0.3, 0, z - 0.3, x + 2.7, 0.6, z + 0.3, col, true, { j: 0.03 }); pBc(c, x + 2.7, 0.1, z - 0.15, x + 3.3, 0.4, z + 0.15, col, false, { j: 0 }) }   // caído em x
    }
    pBc(c, -0.5, 3.5, -0.2, 0.5, 3.7, 0.2, 0x4a3320, false, { j: 0 });   // travessa solta de pé
    for (let k = 0; k < 5; k++) { const x = rng.range(-6, 5), z = rng.range(-4.6, 4.6); pBc(c, x, 0.02, z, x + 1.2, 0.07, z + 0.06, 0x8a7a5a, false, { j: 0 }) }   // cordas cortadas
    pBc(c, -3, 0, 4.4, 2.4, 0.07, 6, 0x2a2218, false, { j: 0.05 });   // chão queimado
  }
};
// Peças de arma de fogo e capacete (calibre de "guerra moderna": fuzil de cano comprido e coronha de madeira; capacete de aço oliva) usadas pelos micro-POIs de conflito.
function microRifleStuck(c, x, z) {   // fuzil cravado com o cano para baixo e a coronha para cima
  pBc(c, x - 0.05, 0, z - 0.05, x + 0.05, 1.1, z + 0.05, 0x3a3a3e, false, { j: 0 }); pBc(c, x - 0.1, 1.1, z - 0.08, x + 0.1, 1.6, z + 0.08, 0x6b4a2a, false, { j: 0.02 });
}
function microRifleLying(c, x, z, alongX) {   // fuzil no chão: coronha de madeira e cano escuro
  if (alongX) { pBc(c, x, 0, z, x + 0.5, 0.18, z + 0.16, 0x6b4a2a, false, { j: 0.02 }); pBc(c, x + 0.5, 0.04, z + 0.04, x + 1.6, 0.14, z + 0.12, 0x3a3a3e, false, { j: 0 }) }
  else { pBc(c, x, 0, z, x + 0.16, 0.18, z + 0.5, 0x6b4a2a, false, { j: 0.02 }); pBc(c, x + 0.04, 0.04, z + 0.5, x + 0.12, 0.14, z + 1.6, 0x3a3a3e, false, { j: 0 }) }
}
function microHelmet(c, x, z, y) {   // capacete de aço (cúpula em dois blocos) com o centro em (x,z) e a base em y
  pBc(c, x - 0.32, y, z - 0.32, x + 0.32, y + 0.22, z + 0.32, 0x5a6a4a, false, { j: 0.02 }); pBc(c, x - 0.22, y + 0.22, z - 0.22, x + 0.22, y + 0.38, z + 0.22, 0x4a5a3a, false, { j: 0.02 });
}
// Construtor de cada micro-POI (lido por dormBuild, pois.js): sorteia giro e espelho pela semente e desenha pelo gancho BC_XF (como o POI lego).
const MICRO_BUILD = {};
for (const id of Object.keys(MICRO_PIECES)) MICRO_BUILD[id] = (c, rng, d) => {
  const f = legoXf(rng.int(0, 3), rng.chance(0.5));
  BC_XF = (x0, z0, x1, z1) => { const a = f(x0, z0), b = f(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
  try { MICRO_PIECES[id](c, rng, d) } finally { BC_XF = null }
};

// ---------- cenário ?cenario=lego: bloco de micro-POIs ao lado da grade (chamado por poiLegoShowGen, poilego.js) ----------
// Lista completa: os 4 que já existiam (decorações dormentes da guerra: fogueira, jardim, poço, marco) e os novos (LEGO_MICRO.list), em colunas de LEGO_MICRO.cols.
// Os dormentes entram em WORLD.dormant (a fogueira dormente cozinha: dormScan); os novos em WORLD.micros. Cada um leva uma placa.
function poiMicroShowGen(Y) {
  const S = LEGO_MICRO, dk = Object.keys(WAR_DORMANT), all = dk.map(k => ({ kind: k, old: true, r: WAR_DORMANT[k].r, n: WAR_DORMANT[k].n })).concat(S.list.map(m => ({ kind: m.id, r: m.r, n: m.n }))),
    rows = Math.ceil(all.length / S.cols), x0 = W / 2 + S.x, z0 = W / 2 - (rows - 1) * S.gap / 2; WORLD.dormant = []; WORLD.micros = [];
  all.forEach((m, i) => {
    const x = Math.round(x0 + (i % S.cols) * S.gap), z = Math.round(z0 + Math.floor(i / S.cols) * S.gap), d = { i: m.old ? WORLD.dormant.length : WORLD.micros.length, x, z, y: Y, kind: m.kind, r: m.r };
    (m.old ? WORLD.dormant : WORLD.micros).push(d); dormBuild(d);
    const lbl = poiMicroLabel(m); makeSign(lbl, Math.max(4, lbl.length * 0.36 + 0.8), 0.9, 0x2a2a3a, 0xf0e6c0, x, Y + 4.4, z + m.r + 1.2, 'S');
  });
}
