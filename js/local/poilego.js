'use strict';
// ---------- Montador de POIs "lego" (protótipo da fazenda; docs/features/11_pois-procedurais-lego.md) ----------
// Um POI lego é um ESQUELETO (vagas com retângulo, tipo e frente) preenchido por PEÇAS que se ajustam ao retângulo da vaga. Tudo é desenhado no quadro do esqueleto
// (portão ao sul, +z) e girado/espelhado de uma vez pelo gancho BC_XF de Bc (city.js): peças só usam funções que passam por Bc/pBc (poiFence, poiHut, poiWell...;
// NÃO usar hay/tinyTree, que escrevem direto). Dados em js/modifiers/lego-modifiers.js (LEGO_FARM). Ligado por ?lego=1 (legoOn). Determinístico: só usa `rng`.
// Contrato com o jogo (feito aqui): p.flagMat/bandeira (poiFlag), p.lego = {skeleton, rot, mir, house:{x,z}, gate:{x,z}} em coordenadas do mapa local (relativas ao centro).

// Transformação do esqueleto para o POI: espelha em x (mir) e gira k vezes 90° ((x,z)->(-z,x); k=1 leva o sul para o oeste, 2 norte, 3 leste).
const legoXf = (k, mir) => (x, z) => { if (mir) x = -x; for (let i = 0; i < k; i++) { const t = x; x = -z; z = t } return [x, z] };
// Rotação (0 a 3) que leva o portão (sul) para a direção (dx,dz) (ex.: a da estrada mais próxima).
const legoRotToward = (dx, dz) => { const v = [[0, 1], [-1, 0], [0, -1], [1, 0]]; let b = 0, bd = -9; v.forEach((q, i) => { const d = q[0] * dx + q[1] * dz; if (d > bd) { bd = d; b = i } }); return b };
// Pilha de feno que passa por Bc (a hay de city.js escreve a colisão direto).
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

// Peças: cada uma desenha dentro do retângulo R da vaga (no quadro do esqueleto) e devolve nada; A recebe âncoras (A.house).
const LEGO_PIECES = {
  casa(c, rng, R, face, A) {
    const r = legoCenter(R, 11, 8), P = LEGO_FARM.pal;
    poiHut(c, r.x, r.z, r.w, r.d, face, { chimney: rng.chance(0.7), timber: rng.chance(0.6), shut: rng.pick(P.shut), wall: rng.pick(P.wall), roof: rng.pick(P.roof) }, rng);
    A.house = { x: r.x + r.w / 2, z: r.z + r.d / 2, door: legoDoor(r, face) };
  },
  celeiro(c, rng, R, face) {
    const r = legoCenter(R, 12, 9), P = LEGO_FARM.pal;
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
    const sp = rng.pick(['vaca', 'ovelha', 'porco']), cols = LEGO_FARM.pal.animals[sp], n = clamp(Math.round(R.w * R.d / 20), 2, 6);
    pBc(c, R.x + 0.5, 0, R.z + 0.5, R.x + R.w - 0.5, 0.12, R.z + R.d - 0.5, 0x6a4a2e, false, { j: 0.03 }); legoPen(c, R, face, 3);
    for (let i = 0; i < n; i++) poiAnimal(c, R.x + 1.5 + rng.range(0, R.w - 4.5), R.z + 1.5 + rng.range(0, R.d - 3.5), rng.pick(cols), sp === 'vaca');
    pBc(c, R.x + 1.5, 0, R.z + R.d - 2.2, R.x + 4.5, 0.6, R.z + R.d - 1.4, 0x7a5632, true, { j: 0.04 }); pBc(c, R.x + 1.6, 0.6, R.z + R.d - 2.1, R.x + 4.4, 0.7, R.z + R.d - 1.5, 0x3a7ad8, false, { j: 0 });
  },
  pomar(c, rng, R) {
    pBc(c, R.x, 0, R.z, R.x + R.w, 0.1, R.z + R.d, 0x4a7a32, false, { j: 0.05 });
    for (let z = R.z + 2; z <= R.z + R.d - 2; z += 4.2) for (let x = R.x + 2; x <= R.x + R.w - 2; x += 4) legoTree(c, x + rng.range(-0.4, 0.4), z + rng.range(-0.4, 0.4), rng);
  },
  trigo(c, rng, R) { legoCrop(c, rng, R, 1.7, 1.0, 2.4, LEGO_FARM.pal.crops.trigo, 0.9, 0.25) },
  horta(c, rng, R) { legoCrop(c, rng, R, 1.3, 0.8, 0.9, LEGO_FARM.pal.crops.horta, 0.5, 0.3) },
  milho(c, rng, R) { legoCrop(c, rng, R, 1.8, 0.8, 1.2, LEGO_FARM.pal.crops.milho, 2.0, 0.6) },
  nada() {}
};
// Campo de cultivo: leiras (solo) a cada `step` blocos em z e plantas a cada `dx` em x, com altura h + variação v; espantalho em parte dos campos.
function legoCrop(c, rng, R, step, row, dx, cols, h, v) {
  for (let z = R.z; z + row <= R.z + R.d; z += step) {
    pBc(c, R.x, 0, z, R.x + R.w, 0.15, z + row, 0x5a3d22, false, { j: 0.02 });
    for (let x = R.x; x < R.x + R.w - 0.6; x += dx) pBc(c, x + 0.1, 0.15, z + 0.1, Math.min(R.x + R.w, x + dx - 0.2), 0.15 + h + v * rng.next(), z + row - 0.1, rng.pick(cols), false, { j: 0.08 });
  }
  if (R.w >= 8 && R.d >= 8 && rng.chance(0.4)) { const x = R.x + R.w / 2, z = R.z + R.d / 2; poiPole(c, x, z, 2.2); pBc(c, x - 1.1, 1.5, z - 0.1, x + 1.1, 1.7, z + 0.1, 0x4a3320, false, { j: 0 }); pBc(c, x - 0.3, 2.2, z - 0.4, x + 0.3, 2.7, z + 0.4, 0xb89048, false, { j: 0.04 }) }
}
// Enfeites do pátio (rect R): divide em células de ~3 blocos e põe 3 a 4 itens sorteados (poço e carroça só se a célula for grande).
function legoYard(c, rng, R) {
  const D = LEGO_FARM.decor, cw = R.w >= 8 ? 3 : 2, ch = R.d >= 8 ? 2 : 1, cells = [];
  for (let i = 0; i < cw; i++) for (let j = 0; j < ch; j++) cells.push([R.x + (i + 0.5) * R.w / cw, R.z + (j + 0.5) * R.d / ch, R.w / cw, R.d / ch]);
  rng.shuffle(cells);
  for (let k = 0, n = Math.min(cells.length, rng.int(LEGO_FARM.decorN[0], LEGO_FARM.decorN[1])); k < n; k++) {
    const [x, z, w, d] = cells[k], opts = Object.keys(D).filter(t => (t !== 'poco' && t !== 'carroca') || (w >= 3 && d >= 3.6));
    let r = rng.next() * opts.reduce((s, t) => s + D[t], 0), t = opts[0]; for (const o of opts) { r -= D[o]; if (r < 0) { t = o; break } }
    if (t === 'poco') poiWell(c, x, z); else if (t === 'carroca') poiCart(c, x - 1.3, z - 0.75, true, rng.pick([0xd8b84a, 0x6a8a3a, 0xc8a050]));
    else if (t === 'feno') { legoHay(c, x - 0.65, z - 0.65); if (w > 3) legoHay(c, x + 0.8, z - 0.3) } else if (t === 'lampiao') poiLampAt(c, x, z); else poiBench(c, x - 0.9, z - 0.25, true);
  }
}
// Peça sorteada para a vaga (só entre as que cabem; 'nada' conta como peça). null se a vaga não tem tabela.
function legoPieceFor(rng, slot) {
  const tab = LEGO_FARM.pick[slot.k]; if (!tab) return null;
  const o = Object.keys(tab).filter(id => { const m = LEGO_FARM.min[id]; return slot.w >= m[0] && slot.d >= m[1] });
  if (!o.length) return null;
  let r = rng.next() * o.reduce((s, id) => s + tab[id], 0);
  for (const id of o) { r -= tab[id]; if (r < 0) return id }
  return o[o.length - 1];
}
// Monta a fazenda lego em c (chamada por POI_BUILD.farm com ?lego=1). p.legoFace (0 a 3) = para onde o portão aponta (estrada); sem ele, sorteio. Guarda p.lego.
function legoFarm(c, rng, p) {
  const L = LEGO_FARM, sk = rng.pick(L.skeletons), rot = p.legoFace !== undefined ? p.legoFace : rng.int(0, 3), mir = rng.chance(0.5), f = legoXf(rot, mir), A = {}, used = [];
  BC_XF = (x0, z0, x1, z1) => { const a = f(x0, z0), b = f(x1, z1); return [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])] };
  try {
    const H = LEGO_HALF;
    pBc(c, -H, 0, -H, H, 0.05, H - 1, 0x6a5a40, false, { j: 0.03 });   // terra batida em toda a área (os campos e prédios assentam sobre ela)
    for (const s of sk.slots.slice().sort((a, b) => (b.k === 'casa') - (a.k === 'casa'))) {   // a casa (âncora) primeiro
      if (s.p !== undefined && rng.next() > s.p) continue;
      if (s.k === 'patio') { legoYard(c, rng, s); continue }
      const id = legoPieceFor(rng, s); if (!id) continue;
      LEGO_PIECES[id](c, rng, s, s.face || 'S', A); used.push(id);
    }
    const g = L.gate;   // cerca em volta (80%) com o portão ao sul
    if (rng.chance(0.8)) { poiFence(c, -H, -H, H, -H); poiFence(c, -H, -H, -H, H - 1); poiFence(c, H, -H, H, H - 1); poiFence(c, -H, H - 1, -g, H - 1); poiFence(c, g, H - 1, H, H - 1) }
    const lane = sk.lane || 0, dr = A.house ? A.house.door : [0, 0];   // caminho: do portão até a porta da casa (reta na faixa livre e depois de lado)
    poiPath(c, lane, H, lane, dr[1]); if (Math.abs(dr[0] - lane) > 0.5) poiPath(c, lane, dr[1], dr[0], dr[1]);
  } finally { BC_XF = null }
  const fp = f(L.flag[0], L.flag[1]); poiFlag(c, p, fp[0], fp[1], 6);   // bandeira do dono (mesh direto: fora da transformação, com o ponto já girado)
  const hp = A.house ? f(A.house.x, A.house.z) : [0, 0], gp = f(0, LEGO_HALF);
  p.lego = { skeleton: sk.id, rot, mir, pieces: used, house: { x: hp[0], z: hp[1] }, gate: { x: gp[0], z: gp[1] } };
}
