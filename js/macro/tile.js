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

// Descritor do tile: {seed, tema, terreno, adequacao, saidas, dono, batalha}. win = janela do campo (wfWindow + openings). opts = {tema, batalha}.
// saidas = as aberturas (posição fixa pelo hash da aresta); dono: null até a 4F (o dono do POI principal).
function tileDescribe(F, win, opts) {
  opts = opts || {};
  const tema = tileThemeOk(opts.tema) ? opts.tema : 'passagem', terr = tileTerrain(F, win);
  return {
    seed: F.seed, tema, terreno: terr, adequacao: tileFit(tema, terr),
    saidas: win.openings.map(o => ({ dir: o.dir, x: o.x, z: o.z, ix: o.ix, iz: o.iz, side: o.side, para: o.to })),
    dono: null, batalha: opts.batalha || null
  };
}
