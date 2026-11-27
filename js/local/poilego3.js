'use strict';
// ---------- Peças dos POIs "lego" do L5: taverna (docs/features/11_pois-procedurais-lego.md, seção 7k) ----------
// Mesmas regras do poilego.js e do poilego2.js (legoFit, legoSpot, legoYaw, legoAnchor): cada peça desenha dentro da vaga SÓ por Bc/pBc/FB/setTL (que seguem o gancho BC_XF).
// Taverna: o térreo da taverna das cidades (balcão, fogão, mesas, fregueses; makeBuilding + buildTavern) com escada interna até um andar de saguão e quartos (uma porta aberta,
// o resto falso), mais o chão batido, barris, banco e lampiões da frente. Desenhada no quadro do prédio (x -9..8, z -8..4, frente +z), levado ao quadro da vaga por T; a frente
// tem ap = profundidade da vaga - 13 blocos (3 a 6). Âncoras: tavern (balcão), stove, keepers (taverneiro e fregueses; um freguês vira o mercenário), bed (quarto aberto).

Object.assign(LEGO_PIECES, {
  // Taverna de dois andares. Âncora (A.house).
  taverna(c, rng, R, face, A) {
    const { L } = legoFit(R, face, 18, 19), ap = L.D - 13, T = { map: (x, z) => L.map(x + 9, z + 8) }, Y = 3.6, SZ = { u0: 15.0, u1: 17.0, v1: 5.0 }, PV = 6.4, open = rng.int(0, 4);
    c.keepers = []; c.tavern = null; c.stove = null; A.p.roomDoor = open; let bedAt = null;
    legoDraw(T, () => {
      const f = makeBuilding(c, { x0: -9, x1: 8, z0: -8, z1: 4 }, 'S', 8, { floors: 2, noFloors: true, wall: 0xc89a62, glass: 0x9ed4ff, roof: 0x5a3a24, roofT: 'gable', chimney: true, timber: true, shut: 0x5a3d22, base: 0xa88a5a }, rng);
      const U = f.U, V = f.V, W2 = (u0, v0, u1, v1, y0, y1, col, s, o) => FB(c, f, u0, v0, u1, v1, y0, y1, col, s, Object.assign({ b: true }, o || {}));
      buildTavern(c, f, 'S', 8, rng, { stair: true, rows: [2.6, 5.7], colStep: 3.0, stairZone: { u0: SZ.u0, v1: SZ.v1 }, barStools: true });
      W2(0, SZ.v1, U, V, 3.2, 3.6, 0x8a6a3a, true, { j: 0.02 }); W2(0, 0, SZ.u0, SZ.v1, 3.2, 3.6, 0x8a6a3a, true, { j: 0.02 }); W2(SZ.u1, 0, U, SZ.v1, 3.2, 3.6, 0x8a6a3a, true, { j: 0.02 });   // laje com o vão da escada
      for (let j = 0; j < 4; j++) W2(SZ.u0 + 0.2, 1.0 + j, SZ.u1 - 0.2, 2.0 + j, 0, 0.9 * (j + 1), j % 2 ? 0x8a6a3a : 0x7a5632, true, { j: 0.03 });   // degraus de 0,9
      W2(SZ.u0 - 0.12, 1.0, SZ.u0, SZ.v1, Y, Y + 1.0, 0x5a3d22, true); for (let v = 1.2; v < SZ.v1; v += 1.0) W2(SZ.u0 - 0.1, v, SZ.u0 + 0.06, v + 0.1, Y, Y + 1.05, 0x4a2f1a, false, { j: 0 });
      W2(SZ.u0, 0.95, SZ.u1, 1.07, Y, Y + 1.0, 0x5a3d22, true);
      W2(1.2, 1.4, 3.6, 2.8, Y, Y + 0.05, 0x7a2a2a, false, { j: 0 }); W2(1.5, 3.2, 2.9, 4.4, Y, Y + 0.75, 0x7a5632, true); W2(1.7, 3.4, 2.7, 4.2, Y + 0.75, Y + 0.82, 0xe8d8a8, false, { j: 0 });   // saguão: tapete e mesinha
      for (const u of [6.0, 12.0]) W2(u, 0.9, u + 0.4, 1.4, Y + 2.2, Y + 2.8, 0xffe9a0, false, { j: 0 });
      let u0 = 1;
      for (let i = 0; i < 5; i++) {   // cinco quartos ao fundo: um de porta aberta (o do jogador), os outros de porta falsa
        const ra = 1 + i * 3.2, uc = ra + 1.6; if (i) W2(ra - 0.15, PV, ra + 0.15, V - 1, Y, Y + 3.0, 0xb89a6a, true, { j: 0.02 });
        W2(u0, PV, uc - 0.65, PV + 0.3, Y, Y + 3.0, 0xb89a6a, true, { j: 0.02 }); u0 = uc + 0.65;
        if (i !== open) { W2(uc - 0.65, PV, uc + 0.65, PV + 0.2, Y, Y + 2.5, 0x5a3d22, true, { j: 0.02 }); W2(uc + 0.35, PV - 0.05, uc + 0.5, PV, Y + 1.1, Y + 1.25, 0xe0b030, false, { j: 0 }); W2(uc - 0.2, PV - 0.05, uc + 0.2, PV, Y + 1.9, Y + 2.2, 0xe8d8a8, false, { j: 0 }) }
        else {
          W2(uc - 0.65, PV + 0.3, uc - 0.5, PV + 1.6, Y, Y + 2.5, 0x5a3d22, false, { j: 0.02 });
          W2(uc - 1.4, V - 3.4, uc - 0.2, V - 1.1, Y, Y + 0.5, 0x6b4a2a, true, { j: 0.02 }); W2(uc - 1.3, V - 3.1, uc - 0.3, V - 1.2, Y + 0.5, Y + 0.75, 0xc03a3a, false, { j: 0.02 }); W2(uc - 1.3, V - 1.6, uc - 0.3, V - 1.2, Y + 0.75, Y + 0.9, 0xf0ece0, false, { j: 0 });
          W2(uc + 0.5, V - 2.6, uc + 1.4, V - 1.8, Y, Y + 0.7, 0x7a5632, true, { j: 0.02 }); W2(uc + 0.8, V - 2.4, uc + 1.0, V - 2.2, Y + 0.7, Y + 0.95, 0xfff0b0, false, { j: 0 });
          W2(uc + 0.3, PV + 1.0, uc + 1.3, PV + 1.8, Y, Y + 0.7, 0x7a4a22, true, { j: 0.02 }); W2(uc - 1.2, PV + 1.0, uc + 0.1, PV + 2.6, Y, Y + 0.04, 0x7a2a2a, false, { j: 0 });
        }
      }
      W2(u0, PV, U - 1, PV + 0.3, Y, Y + 3.0, 0xb89a6a, true, { j: 0.02 });
      { const m = f.map(1 + open * 3.2 + 1.6 - 0.8, V - 2.2); bedAt = { x: m[0], z: m[1] } }   // a cama do quarto aberto: [E] Dormir
      for (const [uu, vv] of [[3, V - 1.3], [9, V - 1.3]]) W2(uu, vv, uu + 0.5, vv + 0.3, Y + 2.2, Y + 2.8, 0xffe9a0, false, { j: 0 });
      W2(0.8, -1.8, 1.7, -0.9, 0, 0.95, 0x7a5a30, true); W2(0.8, -3.0, 1.7, -2.1, 0, 0.95, 0x7a5a30, true); W2(2.4, -1.5, 4.4, -0.9, 0.45, 0.6, 0x7a5632, true); W2(2.5, -1.5, 2.7, -0.9, 0, 0.45, 0x5a3d22, false, { j: 0 }); W2(4.1, -1.5, 4.3, -0.9, 0, 0.45, 0x5a3d22, false, { j: 0 });   // barris e banco
      W2(12.5, -2.2, 16.5, -1.4, 0, 0.6, 0x7a5632, true, { j: 0.04 }); W2(12.6, -2.1, 16.4, -1.5, 0.6, 0.7, 0x3a7ad8, false, { j: 0 });   // cocho
      W2(5.2, -0.6, 5.32, -0.48, -4, 3.6, 0x4a2f1a, false, { j: 0 }); W2(5.2, -0.6, 7.2, -0.48, 3.3, 3.6, 0x4a2f1a, false, { j: 0 }); W2(6.1, -0.6, 7.2, -0.5, 2.4, 3.3, 0x5a3d22, false, { j: 0 }); W2(6.2, -0.5, 7.1, -0.45, 2.5, 3.2, 0xf0d890, false, { j: 0 });   // placa pendurada
      for (const uu of [5.0, 13.0]) { W2(uu, -1.2, uu + 0.2, -1.0, -4, 3.2, 0x2a2a2a, true, { j: 0 }); W2(uu - 0.15, -1.35, uu + 0.35, -0.85, 3.2, 3.7, 0xffe9a0, false, { j: 0 }) }   // lampiões
      for (let v = -ap; v < 0; v++) for (let u = 6; u < 12; u++) { const m = f.map(u + 0.5, v + 0.5); setTL(c, Math.floor(m[0]), Math.floor(m[1]), T_STREET) }   // chão batido na frente
    });
    const at = (x, z, o) => legoSpot(L, x - c.cx + 9, z - c.cz + 8, o);
    legoAnchor(A, 'tavern', at(c.tavern.x, c.tavern.z)); legoAnchor(A, 'stove', at(c.stove.x, c.stove.z)); legoAnchor(A, 'bed', legoSpot(L, bedAt.x + 9, bedAt.z + 8, { y: Y }));   // (bedAt é relativo ao centro; as outras âncoras do prédio, absolutas)
    for (const k of c.keepers) { const o = Object.assign({}, k, { yaw: legoYaw(L, k.yaw) }); delete o.x; delete o.z; if (k.y !== undefined) o.y = k.y - c.y; legoAnchor(A, 'keepers', at(k.x, k.z, o)) }
    const seat = A.anch.keepers.find(k => k.role === 'patron');   // o mercenário ocupa o lugar de um freguês sentado à mesa (só na taverna do jogador; nas outras o freguês fica)
    if (seat) { seat.merc = true; legoAnchor(A, 'svcSpec', { kind: 'merc', label: txtLegoSvc.merc, x: seat.x, z: seat.z, seat: true }) }
    const m = L.map(9, 6.5); A.house = { x: m[0], z: m[1], door: L.map(9, 13.6) };
  },
  // Ferraria ao lado da taverna: chão de pedra, telhado aberto, fornalha com chaminé, fuligem, bigorna, fole, barril de têmpera, ferramentas e carvão. Âncora svcSpec (ferreiro).
  ferraria(c, rng, R, face, A) {
    const { L } = legoFit(R, face, 9, 8), T = { map: (x, z) => L.map(x - 8.6, z + 8.0) };   // o desenho original (x 9,8 a 16,4; z -7,2 a -1,2) levado ao quadro da vaga
    legoDraw(T, () => {
      for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) pBc(c, 10 + i, 0, -7 + j, 11 + i, 0.07, -6 + j, (i + j) % 2 ? 0x7a7a82 : 0x6a6a72, false, { j: 0.02 });
      for (const [x, z] of [[10.2, -6.8], [15.6, -6.8], [10.2, -1.4], [15.6, -1.4]]) pBc(c, x, 0, z, x + 0.3, 3.0, z + 0.3, 0x5a3d22, true, { j: 0 });
      for (let k = 0; k < 4; k++) pBc(c, 9.8, 3.0 + k * 0.2, -7.2 + k * 1.55, 16.2, 3.2 + k * 0.2, -5.5 + k * 1.55, k % 2 ? 0x4a3a2a : 0x5a4a3a, false, { j: 0.03 });
      pBc(c, 9.8, 2.96, -7.2, 16.2, 3.0, -4.2, 0x1a1a1e, false, { j: 0 });
      pBc(c, 13.6, 0, -6.6, 15.8, 1.7, -4.6, 0x6a6a70, true, { j: 0.03 }); pBc(c, 14.2, 1.7, -6.3, 15.2, 4.6, -5.4, 0x5a5a60, true, { j: 0.03 }); pBc(c, 14.1, 4.0, -6.4, 15.3, 4.6, -5.3, 0x2a2a2e, false, { j: 0 });
      pBc(c, 13.5, 0.5, -6.1, 13.62, 1.2, -5.1, 0x1a1a1a, false, { j: 0 }); pBc(c, 13.45, 0.55, -5.95, 13.6, 0.95, -5.25, 0xff7a1a, false, { j: 0 }); pBc(c, 13.42, 0.6, -5.8, 13.58, 0.8, -5.4, 0xffd84a, false, { j: 0 });
      pBc(c, 12.6, 0.07, -6.9, 13.5, 0.1, -4.3, 0x1a1a1a, false, { j: 0.05 }); pBc(c, 15.8, 0.07, -6.9, 16.1, 0.1, -4.5, 0x222226, false, { j: 0.05 });
      pBc(c, 13.8, 0.3, -4.5, 14.9, 0.8, -3.9, 0x6b4a2a, true, { j: 0.03 }); pBc(c, 14.9, 0.4, -4.4, 15.7, 0.65, -4.0, 0x3a2a1a, false, { j: 0.02 });
      pBc(c, 11.0, 0, -3.4, 12.0, 0.5, -2.4, 0x6b4a2a, true, { j: 0.04 }); pBc(c, 10.85, 0.5, -3.3, 12.15, 0.8, -2.5, 0x2a2a2e, false, { j: 0 }); pBc(c, 12.15, 0.55, -3.1, 12.7, 0.75, -2.7, 0x2a2a2e, false, { j: 0 });
      pBc(c, 10.4, 0, -6.3, 11.6, 0.7, -5.2, 0x6b4a2a, true, { j: 0.03 }); pBc(c, 10.5, 0.7, -6.2, 11.5, 0.78, -5.3, 0x3a7ad8, false, { j: 0 });
      poiRack(c, 12.2, -1.5, true); poiSign(c, 9.0, -1.2, 0x4a4a52);
      for (let k = 0; k < 5; k++) pBc(c, 15.1 + k * 0.15, 0, -3.2 + k * 0.25, 15.6 + k * 0.15, 0.25 + 0.1 * k, -2.8 + k * 0.25, 0x2a2a2a, false, { j: 0.1 });
    });
    legoAnchor(A, 'svcSpec', legoSpot(T, 11.5, -1.7, { kind: 'smith', role: 'smith', label: txtLegoSvc.smith, yaw: legoYaw(L, Math.PI) }));
  }
});
