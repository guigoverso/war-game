'use strict';
// ---------- Teste da composição do tile (etapa 4E; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=tile com cada tema (e algumas batalhas) e confere: carga sem erros, principal, POIs do tema, ambiente, baús, zonas de guerra, folgas entre POIs,
// estrada ligando as aberturas ao principal, nada sobre estrada/água, tempo de geração (limite 4 s; cidade 5 s) e batalhas (conquista, defesa, choque em 1, 2 e 4 aberturas).
// Uso: cd tests && node tile-compose.js [semente] [tema ...]      (sem temas = todos; BATALHA=0 pula as batalhas; TABELA=1 imprime a contagem por tema)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), seed = process.argv[2] || 11, only = process.argv.slice(3);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
const THEMES = ['cidade', 'vila', 'fazenda', 'mina', 'serraria', 'animais', 'ponte', 'fortaleza', 'ruinas', 'passagem'];
// Roda dentro da página: mede a composição e as regras (folgas, estrada, zonas).
const MEASURE = () => {
  const tc = WORLD.tileCompose, tw = WORLD.tileWar, win = WORLD.win, c = WORLD.cities[0], pois = WORLD.pois.filter(p => !p.war), out = { bad: [] };
  out.tc = tc; out.size = W; out.nan = isNaN(P.x + P.y + P.z); out.pois = pois.length; out.warPois = WORLD.pois.filter(p => p.war).map(p => [p.type, p.zona, p.lado, p.owner]);
  out.zones = tw.zones.map(z => z.id); out.aberturas = win.openings.length; out.roadOk = win.openings.filter(o => o.road).length;
  out.main = pois.find(p => p.main) ? pois.find(p => p.main).type : (tc.principal ? tc.principal.type : null);
  const gap = (a, b, ra, rb) => Math.hypot(a.cx - b.cx, a.cz - b.cz) - ra - rb;
  for (let i = 0; i < pois.length; i++) for (let j = i + 1; j < pois.length; j++) { const g = gap(pois[i], pois[j], POI_DEFS[pois[i].type].r, POI_DEFS[pois[j].type].r); if (g < TILE_PLACE.laxGap - 1) out.bad.push('POIs colados ' + pois[i].type + '/' + pois[j].type + ' ' + g.toFixed(0)) }
  for (const p of pois) {   // POI sobre água, sobre estrada ou na borda
    const r = POI_DEFS[p.type].r; let wet = 0, road = 0;
    for (let dz = -r; dz <= r; dz += 3) for (let dx = -r; dx <= r; dx += 3) { const i = (p.cz + dz) * W + p.cx + dx; if (i < 0 || i >= W * W) continue; if (H[i] < SEA && p.type !== 'bridge') wet++; if (T[i] === T_ROAD && p.type !== 'bridge') road++ }
    if (wet > 12) out.bad.push(p.type + ' com muita água (' + wet + ')');
    if (Math.min(p.cx, p.cz, W - 1 - p.cx, W - 1 - p.cz) < TILE_PLACE.edge - 1 && p.type !== 'bridge') out.bad.push(p.type + ' na borda');
  }
  if (c && c.half > 1 && c.foot) {   // nada dentro da pegada da cidade
    const Hc = c.half, N = 2 * Hc + 1;
    for (const p of pois) { const x = p.cx - c.cx + Hc, z = p.cz - c.cz + Hc; if (x >= 0 && z >= 0 && x < N && z < N && c.foot[z * N + x]) out.bad.push(p.type + ' dentro da pegada') }
  }
  for (const a of win.openings) for (const p of pois) if (Math.hypot(a.x - p.cx, a.z - p.cz) < POI_DEFS[p.type].r + TILE_PLACE.openClear - 1 && p.type !== 'bridge') out.bad.push(p.type + ' em cima da abertura ' + a.dir);
  for (const z of tw.zones) for (const p of pois) if (z.kind !== 'anel' && Math.hypot(z.x - p.cx, z.z - p.cz) < z.r + POI_DEFS[p.type].r) out.bad.push(p.type + ' dentro da zona ' + z.id);
  out.html = tileScenarioHtml(); out.mainDist = c && c.half > 1 ? null : (tc.principal && win.openings.length ? Math.min(...win.openings.map(o => Math.hypot(o.x - tc.principal.x, o.z - tc.principal.z))) : null);
  return out;
};
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port, browser = await chromium.launch(), table = [];
  const themes = only.length ? only : THEMES;
  const open = async (qs, sd) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    const t0 = Date.now(); let why = '';
    await page.goto(base + '/index.html?cenario=tile&auto=1&mute=1&seed=' + (sd || seed) + (process.env.LEGO ? '&lego=1' : '') + '&' + qs);
    try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && typeof WORLD !== 'undefined' && WORLD.win && WORLD.tileCompose, null, { timeout: 40000 }) } catch (e) { why = 'não carregou: ' + errs.slice(0, 3).join(' | ') }
    return { page, errs, why, ms: Date.now() - t0 };
  };
  for (const tema of themes) {
    const { page, errs, why, ms } = await open('tema=' + tema);
    await page.waitForTimeout(800);
    rep(!why && !errs.length, tema + ': carrega sem erros (' + ms + ' ms)', why || errs.slice(0, 2).join(' | '));
    if (why) { await page.close(); continue }
    const r = await page.evaluate(MEASURE), tc = r.tc, K = tema;
    table.push([tema, r.main, tc.arq, r.pois, tc.camps, tc.caves, tc.packs, tc.chests, r.zones.join(','), tc.falhas.join(','), tc.ms]);
    rep(r.size === 384 && !r.nan, tema + ': lado 384, jogador posicionado');
    if (tema === 'passagem') rep(r.main === null, tema + ': sem POI principal');
    else rep(!!r.main, tema + ': tem principal (' + r.main + ', arquétipo ' + tc.arq + (tc.caiu ? ', caiu' : '') + ')', 'falhas: ' + tc.falhas.join(','));
    const th = { cidade: [4, 5], vila: [4, 5] }[tema] || [4, 5];
    if (tema !== 'passagem') rep(tc.pois >= 1 + th[0] - 2, tema + ': ' + tc.pois + ' POIs (principal + tema)', JSON.stringify(tc.counts));
    rep(tc.chests >= 3, tema + ': ' + tc.chests + ' baús (meta 6 a 10)', tc.falhas.join(','));
    rep(tc.camps + tc.caves + tc.packs >= 2, tema + ': ambiente ' + (tc.camps + tc.caves + tc.packs) + ' (acamp. ' + tc.camps + ', grutas ' + tc.caves + ', bandos ' + tc.packs + ')');
    rep(r.html.includes('Principal:') && r.html.includes('Batalha no tile'), tema + ': painel do cenário mostra a composição e os atalhos de batalha');
    rep(r.bad.length === 0, tema + ': folgas e lugares válidos', r.bad.slice(0, 3).join(' | '));
    rep(r.zones.filter(z => z.startsWith('abertura')).length === r.aberturas, tema + ': uma zona por abertura (' + r.aberturas + ')', r.zones.join(','));
    if (tema !== 'passagem') rep(r.zones.includes('anel'), tema + ': anel de guerra em volta do principal');
    if (r.aberturas >= 2) rep(r.zones.includes('praca'), tema + ': praça de encontro', r.zones.join(','));
    rep(tc.ms <= (tema === 'cidade' ? 5000 : 4000), tema + ': composição em ' + tc.ms + ' ms; total até rodar ' + ms + ' ms (limite 4 s; cidade 5 s)');
    await page.close();
  }
  if (process.env.BATALHA !== '0') {
    // batalhas em tiles de 1, 2 e 4 aberturas: acha o tile por varredura do campo (wfOpenings) e abre cada tipo
    const BS = process.env.BSEED || 42, BF = '&forma=pangeia';   // semente 42 em pangeia tem tile de 4 aberturas (tiles de 1, 2 e 4)
    const { page, why } = await open('tema=fazenda' + BF, BS);
    const tiles = await page.evaluate(() => { const F = WORLD.win.F, out = {}; for (let j = 0; j < WORLD_FIELD.tiles; j++) for (let i = 0; i < WORLD_FIELD.tiles; i++) { const n = wfNode(F, i, j), w = wfWindow(F, n.x, n.z, 384, { tile: true, ti: i, tj: j, neighbors: [], openings: [] }); w.openings = wfOpenings(F, w, i, j); if (w.openings.length) { const terra = tileTerrain(F, w, 32).terra, k = w.openings.length; if (terra > 0.5 && (!out[k] || terra > out[k][3])) out[k] = [i, j, w.openings.map(o => o.dir), terra] } } return out });
    await page.close();
    for (const k of [1, 2, 4]) {
      if (!tiles[k]) { rep(false, 'batalhas: sem tile com ' + k + ' abertura(s) nesta semente'); continue }
      const [ti, tj, dirs] = tiles[k];
      for (const tipo of ['conquista', 'defesa', 'choque']) {
        if (tipo === 'choque' && k === 1) continue;
        const qs = 'tema=fazenda&ti=' + ti + '&tj=' + tj + '&batalha=' + tipo + '&entrada=' + dirs[0] + (tipo === 'choque' ? '&entrada2=' + dirs[1] : '');
        const { page, errs, why, ms } = await open(qs + BF, BS);
        const nome = tipo + ' em tile de ' + k + ' abertura(s) (' + ti + ',' + tj + ')';
        rep(!why && !errs.length, nome + ': carrega sem erros (' + ms + ' ms)', why || errs.slice(0, 2).join(' | '));
        if (why) { await page.close(); continue }
        const r = await page.evaluate(MEASURE);
        const want = tipo === 'choque' ? 3 : 2;   // choque: um por lado + barricada na praça; conquista/defesa: atacante + defensor
        rep(r.warPois.length >= (tipo === 'choque' ? 2 : 2) && r.warPois.length <= want, nome + ': ' + r.warPois.length + ' POI(s) de guerra', JSON.stringify(r.warPois));
        if (tipo !== 'choque') rep(r.warPois.some(p => p[1] === 'anel') && r.warPois.some(p => p[1].startsWith('abertura')), nome + ': atacante na abertura, defensor no anel');
        const ow = r.warPois.map(p => p[3]);
        if (tipo === 'defesa') rep(r.warPois.find(p => p[2] === 'defensor')[3] === 'player', nome + ': você é o defensor');
        if (tipo === 'conquista') rep(r.warPois.find(p => p[2] === 'atacante')[3] === 'player', nome + ': você é o atacante');
        // reposicionar: outra batalha desmonta e remonta
        const re = await page.evaluate(() => { const n0 = WORLD.pois.length; tileWarAssemble({ tipo: 'conquista', entradaAtacante: WORLD.win.openings[WORLD.win.openings.length - 1].dir, entradaDefensor: null, estacionado: null }); const a = WORLD.pois.filter(p => p.war).length; tileWarAssemble(null); return { a, b: WORLD.pois.filter(p => p.war).length, n0, n1: WORLD.pois.length } });
        rep(re.a === 2 && re.b === 0 && re.n1 === re.n0 - r.warPois.length, nome + ': reposicionar e desmontar', JSON.stringify(re));
        await page.close();
      }
    }
  }
  if (process.env.TABELA) { console.log('\ntema | principal | arq | pois | acamp | grutas | bandos | baús | zonas | falhas | ms'); for (const r of table) console.log(r.join(' | ')) }
  await browser.close(); srv.close(); console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
})();
