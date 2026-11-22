'use strict';
// ---------- Teste de desempenho do cenário ?cenario=batalha (Node + Playwright; só para desenvolvimento) ----------
// Abre o mapa local de cidade com a batalha (30 inimigos + 10 soldados) e sem ela (?inim=0&alia=0), mede quadros e imprime a comparação.
// Atenção: o Chromium sem janela usa desenho por software (SwiftShader), então o "desenhar" é bem pior que numa placa de vídeo; o "atualizar" (IA,
// navegação, tiros) é do processador e vale como está. Uso: cd tests && node batalha.js [inim] [alia]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const serve = () => new Promise(r => {
  const s = http.createServer((q, res) => {
    const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  });
  s.listen(0, '127.0.0.1', () => r(s));
});

async function run(browser, base, qs, secs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base + '/index.html?' + qs);
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running && typeof TILETEST !== 'undefined' && TILETEST.on, null, { timeout: 240000 });
  await page.waitForTimeout(1500);
  const info = await page.evaluate(() => {
    closePanel(); tileTestMeasure();
    const foe = WORLD.cities.find(c => !c.home);
    return { W, cities: WORLD.cities.length, half: foe.half, pois: (WORLD.pois || []).length, camps: (WORLD.camps || []).length,
      inimigos: ENEMIES.filter(e => e.alive && e.city === foe).length, bandidosFora: ENEMIES.filter(e => e.alive && e.city !== foe).length,
      aliados: ALLIES.filter(a => a.alive).length, civis: NPCS.filter(n => n.alive).length };
  });
  await page.waitForFunction(() => TILETEST.perf, null, { timeout: secs * 1000 });
  const perf = await page.evaluate(() => Object.assign({}, TILETEST.perf, {
    vivosInim: ENEMIES.filter(e => e.alive && e.city === WORLD.cities.find(c => !c.home)).length, vivosAli: ALLIES.filter(a => a.alive).length }));
  await page.close();
  return { info, perf, errs };
}

(async () => {
  const inim = process.argv[2] || '', alia = process.argv[3] || '';
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const extra = (inim !== '' ? '&inim=' + inim : '') + (alia !== '' ? '&alia=' + alia : '');
  for (const [nome, qs] of [['sem batalha', 'cenario=batalha&mute=1&inim=0&alia=0'], ['com batalha (jogador no portão inimigo)', 'cenario=batalha&mute=1&pos=portao' + extra],
    ['com batalha (jogador no centro da cidade inimiga)', 'cenario=batalha&mute=1&pos=centro' + extra]]) {
    const r = await run(browser, base, qs, 240);
    console.log('== ' + nome + ' ==');
    console.log(JSON.stringify(r.info));
    console.log('qps ' + r.perf.fps.toFixed(1) + ' | atualizar ' + r.perf.upd.toFixed(2) + ' ms | desenhar ' + r.perf.ren.toFixed(2) + ' ms | chamadas ' + r.perf.calls
      + ' | vivos: inimigos ' + r.perf.vivosInim + ', aliados ' + r.perf.vivosAli);
    console.log(r.errs.length ? 'ERROS: ' + r.errs.slice(0, 5).join(' | ') : 'sem erros no console');
  }
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
