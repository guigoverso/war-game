'use strict';
// ---------- Descritor de tile (etapa 4A; feature 8). Camada macro: sem Three.js nem DOM ----------
// O descritor é tudo o que o macro sabe de um tile antes do mapa local existir: {seed, tema, terreno, saidas, dono, batalha}.
// O gerador do mapa local (js/local/mapwin.js) o recebe; as etapas 4E/4F preenchem POIs e estado. Números em js/modifiers/map-modifiers.js.

const tileThemeOk = t => TILE_THEMES.includes(t);
// Porcentagem de tiles temáticos pedida (0 a 100), limitada pelos limites do modificador; v = valor pedido (ou undefined/NaN = o padrão).
const tileThemedPct = v => Math.max(TILE_THEMED_PCT.min, Math.min(TILE_THEMED_PCT.max, v === undefined || v === null || v === '' || isNaN(+v) ? TILE_THEMED_PCT.def : +v));

// Tema do tile (i,j) sem grafo (provisório até a etapa 5): sorteio pela semente. `pct`% dos tiles têm tema (peso em TILE_THEME_WEIGHT), o resto é passagem.
function tileThemeFor(seed, i, j, pct) {
  if (hash2(i, j, seed * 11 + 5) * 100 >= tileThemedPct(pct)) return 'passagem';
  const ks = Object.keys(TILE_THEME_WEIGHT), tot = ks.reduce((a, k) => a + TILE_THEME_WEIGHT[k], 0);
  let r = hash2(i, j, seed * 13 + 9) * tot;
  for (const k of ks) { r -= TILE_THEME_WEIGHT[k]; if (r < 0) return k }
  return ks[ks.length - 1];
}

// Composição do terreno da janela: {agua, terra, biomas:[planície, floresta, deserto, neve, rocha] (fração da TERRA)}, amostrado de `step` em `step` blocos.
function tileTerrain(F, win, step) {
  step = step || WORLD_FIELD.sampleStep;
  const bio = [0, 0, 0, 0, 0]; let n = 0, land = 0;
  for (let z = step / 2; z < win.size; z += step) for (let x = step / 2; x < win.size; x += step) {
    n++; const h = wfHeight(F, win.ox + x, win.oz + z);
    if (h >= wfSea() + 1) { land++; bio[wfBiome(F, win.ox + x, win.oz + z, h)]++ }
  }
  return { agua: n ? 1 - land / n : 1, terra: n ? land / n : 0, biomas: bio.map(v => land ? v / land : 0) };
}
// Quanto o terreno combina com o tema (0 a 1): fração da terra nos biomas recomendados (qualquer bioma = 1); ponte = fração de água (pede água estreita).
function tileFit(tema, terr) {
  if (tema === 'ponte') return Math.min(1, terr.agua * 2);
  const b = TILE_THEME_BIOMES[tema];
  return !b || !b.length ? 1 : b.reduce((a, k) => a + terr.biomas[k], 0);
}

// Letras de entrada aceitas na URL (L = leste, O = oeste, N, S) e as direções do campo (E, W, N, S).
const TILE_DIR_LETTER = { L: 'E', E: 'E', O: 'W', W: 'W', N: 'N', S: 'S' };
// Entrada pedida -> abertura do tile (ou a primeira, com `ajustada`: a pedida não existe neste tile). Sem aberturas: null.
function tileEntrance(openings, letter) {
  const d = TILE_DIR_LETTER[String(letter || '').toUpperCase()], o = openings.find(a => a.dir === d);
  return o ? { dir: o.dir, ajustada: false } : openings.length ? { dir: openings[0].dir, ajustada: true } : null;
}
// Descritor de batalha {tipo, entradaAtacante, entradaDefensor, estacionado} a partir dos dados soltos (null se o tipo não existe).
// Conquista e defesa: um lado entra pela abertura (atacante), o outro está no POI principal (entradaDefensor = null). Choque: cada lado entra pela sua.
// estacionado: 'atacante' | 'defensor' | null (quem já estava no tile antes da batalha).
function tileBattle(openings, tipo, entrada, entrada2, estac) {
  if (!TILE_BATTLES.includes(tipo)) return null;
  const a = tileEntrance(openings, entrada), d = tipo === 'choque' ? tileEntrance(openings.filter(o => !a || o.dir !== a.dir), entrada2) || (a ? { dir: null, ajustada: true } : null) : null;
  return {
    tipo, entradaAtacante: a ? a.dir : null, entradaDefensor: d ? d.dir : null,
    estacionado: estac === 'atacante' || estac === 'defensor' ? estac : null, ajustada: !!(a && a.ajustada) || !!(d && d.ajustada)
  };
}

// Descritor do tile: {seed, tema, terreno, adequacao, saidas, dono, batalha, principal}. win = janela do campo (wfWindow + openings). opts = {tema, batalha, principal}.
// saidas = as aberturas (posição fixa pelo hash da aresta); dono: null até a 4F (o dono do POI principal); principal = {arq, x, z} (tileMainPlan) ou null.
function tileDescribe(F, win, opts) {
  opts = opts || {};
  const tema = tileThemeOk(opts.tema) ? opts.tema : 'passagem', terr = tileTerrain(F, win);
  return {
    seed: F.seed, tema, terreno: terr, adequacao: tileFit(tema, terr),
    saidas: win.openings.map(o => ({ dir: o.dir, x: o.x, z: o.z, ix: o.ix, iz: o.iz, side: o.side, para: o.to })),
    dono: null, batalha: opts.batalha || null, principal: opts.principal || null
  };
}

// ---------- Posição do POI principal (4E, rodada 8): arquétipo sorteado pela semente ----------
// Arquétipos: central, deslocado (25% a 40% do centro), estrada (a estrada passa por ele), fundo (oposto à abertura principal), encosta (ponto alto),
// margem (junto d'água ou da borda da floresta). Restrições (TILE_MAIN): ≥ margin da borda, ≥ openGap de qualquer abertura; cidade/vila (o.half = meia caixa)
// usam o deslocamento máximo (tile - 2*half)/2 - bigEdge e ficam a half + bigOpen das aberturas. Tile de UMA entrada: sempre "fundo". Sem terreno ou
// sorteio que sirva, cai em deslocado, central e, por fim, no ponto de terra mais perto do centro. Devolve {arq, x, z, tentativas, caiu} em coordenadas do
// mapa local (0 a size), ou null para tema sem principal (passagem). Determinístico: depende só de semente, tile, tema, aberturas e do campo.
const TILE_ARCHS = ['central', 'deslocado', 'estrada', 'fundo', 'encosta', 'margem'];
function tileMainPlan(F, win, tema, o) {
  if (tema === 'passagem' || !TILE_COMPOSE[tema] || !TILE_COMPOSE[tema].main) return null;
  o = o || {};
  const K = TILE_MAIN, S = win.size, C = S / 2, sea = wfSea(), big = !!o.half, ops = win.openings || [];
  const lo = big ? o.half + K.bigEdge : K.margin, hi = S - lo, gap = big ? o.half + K.bigOpen : K.openGap;
  let n = 0;
  const salt = typeof hashStr === 'function' ? hashStr(tema) : 7, rnd = () => hash2(++n * 31 + (win.ti | 0), (win.tj | 0) * 7 + n, F.seed * 19 + 301 + (salt | 0));
  const hAt = (x, z) => wfHeight(F, win.ox + x, win.oz + z);
  const cl = (x, z) => [Math.max(lo, Math.min(hi, x)), Math.max(lo, Math.min(hi, z))];
  const ok = (x, z) => x >= lo && x <= hi && z >= lo && z <= hi && hAt(x, z) >= sea + 2 && ops.every(a => Math.hypot(a.x - x, a.z - z) >= gap);
  const sample = (cnt, f) => { const out = []; for (let k = 0; k < cnt; k++) { const x = lo + rnd() * (hi - lo), z = lo + rnd() * (hi - lo); if (ok(x, z) && (!f || f(x, z))) out.push([x, z]) } return out };
  const pickOf = list => list.length ? list[Math.floor(rnd() * list.length) % list.length] : null;
  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  const nearWater = (x, z) => DIRS.some(d => [K.shoreMin, (K.shoreMin + K.shoreMax) / 2, K.shoreMax].some(r => hAt(x + d[0] * r, z + d[1] * r) < sea));
  const forestEdge = (x, z) => {
    const b = (px, pz) => wfBiome(F, win.ox + px, win.oz + pz, hAt(px, pz));
    return b(x, z) === 1 && DIRS.some(d => b(x + d[0] * K.shoreMax, z + d[1] * K.shoreMax) !== 1);
  };
  const gen = {
    central: () => [C, C],
    deslocado: () => { const a = rnd() * 6.2832, d = (K.shift[0] + rnd() * (K.shift[1] - K.shift[0])) * C; return cl(C + Math.cos(a) * d, C + Math.sin(a) * d) },
    estrada: () => {
      if (!ops.length) return null;
      const A = ops[Math.floor(rnd() * ops.length) % ops.length], B2 = ops.length > 1 ? ops.filter(q => q !== A)[Math.floor(rnd() * (ops.length - 1)) % (ops.length - 1)] : { x: C, z: C };
      const t = 0.35 + 0.3 * rnd(), lx = A.x + (B2.x - A.x) * t, lz = A.z + (B2.z - A.z) * t, j = (rnd() - 0.5) * 40;
      return cl(lx - (B2.z - A.z) * 0.1 * j / 40, lz + (B2.x - A.x) * 0.1 * j / 40);
    },
    fundo: () => {
      if (!ops.length) return null;
      const a = ops[0], d = S - lo, lat = (rnd() - 0.5) * 50;
      return cl(a.x + a.ix * d + (a.iz ? lat : 0), a.z + a.iz * d + (a.ix ? lat : 0));
    },
    encosta: () => {
      const L = sample(48).map(p => [p[0], p[1], hAt(p[0], p[1])]).sort((p, q) => q[2] - p[2]);
      return L.length ? pickOf(L.slice(0, Math.max(1, Math.ceil(L.length * K.topFrac)))) : null;
    },
    margem: () => pickOf(sample(80, (tema === 'serraria' ? forestEdge : nearWater)))
  };
  const w = Object.assign({}, K.weights[tema] || K.weights.padrao);
  if (ops.length === 1) { for (const k in w) w[k] = 0; w.fundo = 1; w.deslocado = 0.001 }   // uma entrada: o principal no fundo
  if (!ops.length) { w.fundo = 0; w.estrada = 0 }
  const order = []; let pool = TILE_ARCHS.filter(a => w[a] > 0);
  while (pool.length) { const tot = pool.reduce((s, a) => s + w[a], 0); let r = rnd() * tot, pk = pool[pool.length - 1]; for (const a of pool) { r -= w[a]; if (r < 0) { pk = a; break } } order.push(pk); pool = pool.filter(a => a !== pk) }
  let tentativas = 0;
  const tryArch = arq => {
    for (let t = 0, mx = arq === 'central' ? 1 : arq === 'encosta' || arq === 'margem' ? 3 : K.tries; t < mx; t++) {
      tentativas++; const p = gen[arq](); if (p && ok(p[0], p[1])) return { arq, x: Math.round(p[0]), z: Math.round(p[1]), tentativas, caiu: arq !== order[0] };
    }
    return null;
  };
  for (const a of order.concat(['deslocado', 'central'])) { const r = tryArch(a); if (r) return r }
  for (let d = 0; d <= S; d += 8) for (let a = 0; a < 6.2832; a += 0.4) { const p = cl(C + Math.cos(a) * d, C + Math.sin(a) * d); if (hAt(p[0], p[1]) >= sea + 2) return { arq: 'central', x: Math.round(p[0]), z: Math.round(p[1]), tentativas, caiu: true }; }
  return { arq: 'central', x: Math.round(C), z: Math.round(C), tentativas, caiu: true };
}
