'use strict';
// ---------- Teste da L4 (POIs lego no tile; docs/features/11_pois-procedurais-lego.md, 7j; Node + Playwright, só desenvolvimento) ----------
// Abre ?cenario=tile&lego=1 em cada tema e semente e confere: carga sem erros, POIs de verdade (meta 12 a 14 com o principal) e micro-POIs (10 a 15), tamanho P/M por POI
// (raio da receita = p.r), tipos novos (plantação, pesca, vila de trabalhadores) com receita, folgas entre POIs e micros, nada sobre água, tempo (limite 4 s; cidade 5 s)
// e que SEM lego nada disso aparece (sem micros, sem tipos novos). Uso: cd tests && node tile-lego.js [semente ...]   (TABELA=1 imprime a contagem)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['11', '23'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
const THEMES = ['cidade', 'vila', 'fazenda', 'mina', 'serraria', 'animais', 'ponte', 'fortaleza', 'ruinas', 'passagem'];
const MEASURE = () => {
  const tc = WORLD.tileCompose, pois = WORLD.pois.filter(p => !p.war), mic = WORLD.micros || [], out = { bad: [], sizes: {}, types: {} };
  out.n = pois.length; out.micros = mic.length; out.ms = tc.ms; out.falhas = tc.falhas; out.city = tc.city;
  for (const p of pois) { out.types[p.type] = (out.types[p.type] || 0) + 1; if (p.legoSize) out.sizes[p.legoSize] = (out.sizes[p.legoSize] || 0) + 1 }
  for (const p of pois) if (LEGO_RECIPES[p.type] && p.type !== 'ruinvil') {
    if (!p.recipe || !p.recipe.lego) out.bad.push(p.type + ' sem receita');
    else if (p.r !== LEGO_RECIPES[p.type][p.legoSize].half + 1) out.bad.push(p.type + ' raio ' + p.r + ' difere da receita');
  }
  const items = pois.map(p => ({ x: p.cx, z: p.cz, r: poiR(p), n: p.type })).concat(mic.map(m => ({ x: m.x, z: m.z, r: m.r, n: 'micro:' + m.kind })));
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j], g = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
    if (g < (a.n[0] === 'm' && a.n[1] === 'i' || b.n[0] === 'm' && b.n[1] === 'i' ? 4 : TILE_PLACE.laxGap - 1)) out.bad.push('colados ' + a.n + '/' + b.n + ' ' + g.toFixed(0));
  }
  for (const m of mic) {
    if (!m.mesh) out.bad.push('micro sem malha ' + m.kind);
    if (H[m.z * W + m.x] < SEA) out.bad.push('micro na água ' + m.kind);
    if (Math.min(m.x, m.z, W - 1 - m.x, W - 1 - m.z) < 20) out.bad.push('micro na borda ' + m.kind);
    for (const z of WORLD.tileWar.zones) if (z.kind !== 'anel' && Math.hypot(z.x - m.x, z.z - m.z) < z.r + m.r) out.bad.push('micro dentro da zona ' + z.id);
  }
  for (const p of pois) if (p.type === 'fishery') {   // pesca: chão seco e água por perto
    let wet = false; for (let k = 0; k < 16 && !wet; k++) for (let d = poiR(p) + 4; d <= poiR(p) + 16; d += 3) { const x = Math.round(p.cx + Math.cos(k * 0.3927) * d), z = Math.round(p.cz + Math.sin(k * 0.3927) * d); if (H[z * W + x] < SEA) { wet = true; break } }
    if (!wet) out.bad.push('pesca sem água por perto');
  }
  return out;
};
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port, browser = await chromium.launch(), table = [];
  const open = async (qs) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    let why = '';
    await page.goto(base + '/index.html?cenario=tile&auto=1&mute=1&' + qs);
    try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && typeof WORLD !== 'undefined' && WORLD.win && WORLD.tileCompose, null, { timeout: 40000 }) } catch (e) { why = 'não carregou: ' + errs.slice(0, 3).join(' | ') }
    await page.waitForTimeout(300);
    return { page, errs, why };
  };
  for (const sd of seeds) for (const tema of THEMES) {
    const tag = tema + '/' + sd, { page, errs, why } = await open('seed=' + sd + '&tema=' + tema + '&lego=1');
    rep(!why && !errs.length, tag + ': carrega sem erros', why || errs.slice(0, 2).join(' | '));
    if (why) { await page.close(); continue }
    const r = await page.evaluate(MEASURE);
    table.push([tag, r.n, r.micros, JSON.stringify(r.sizes), r.ms, r.falhas.join(',')]);
    if (tema !== 'passagem') rep(r.n >= 6, tag + ': ' + r.n + ' POIs (meta 12 a 14 com principal)', JSON.stringify(r.types));
    rep(r.micros >= (tema === 'passagem' ? 8 : 5), tag + ': ' + r.micros + ' micro-POIs (meta 10 a 15)', r.falhas.join(','));
    rep(r.bad.length === 0, tag + ': receita, raio, folgas e lugares', r.bad.slice(0, 4).join(' | '));
    rep(r.ms <= (r.city ? 5000 : 4000), tag + ': composição em ' + r.ms + ' ms');
    await page.close();
  }
  {   // sem lego: nada muda (sem micros, sem tipos novos, raio = POI_DEFS)
    const { page, errs, why } = await open('seed=' + seeds[0] + '&tema=fazenda');
    const r = await page.evaluate(() => ({ mic: (WORLD.micros || []).length, nw: WORLD.pois.filter(p => ['plantation', 'fishery', 'workers'].includes(p.type) || p.legoSize).length, ok: WORLD.pois.every(p => p.recipe === undefined) }));
    rep(!why && !errs.length && r.mic === 0 && r.nw === 0 && r.ok, 'sem lego: sem micros, sem tipos novos, sem receitas', JSON.stringify(r) + (why || errs.join('|')));
    await page.close();
  }
  if (process.env.TABELA) { console.log('\ntema/semente | POIs | micros | tamanhos | ms | falhas'); for (const t of table) console.log(t.join(' | ')) }
  await browser.close(); srv.close(); console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
})();
