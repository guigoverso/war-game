'use strict';
// Teste dos serviços da vila (CITY_VILLAGE, city-modifiers.js): sempre prefeitura e cura (clínica), NUNCA armazém; armeiro, quartel, loja e taverna opcionais.
// Uso: cd tests && node tile-vila.js [semente ...]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['11', '23', '31', '5', '7', '42'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port, browser = await chromium.launch(), seen = { store: 0, tavern: 0, shop: 0, barracks: 0 };
  for (const sd of seeds) {
    const page = await browser.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '/index.html?cenario=tile&tema=vila&auto=1&mute=1&seed=' + sd);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.tileCompose, null, { timeout: 40000 }).catch(() => errs.push('não carregou'));
    const r = await page.evaluate(() => { const c = WORLD.cities.find(k => k.vila); return c ? { hall: !!c.hall, clinic: !!c.clinic, wh: !!c.warehouse, store: !!c.store, tavern: !!c.tavern, armeiro: !!c.shopSpot || !!c.armory, ks: Object.keys(c).filter(k => /smith|shop|armor|barrack/i.test(k)) } : null });
    rep(!errs.length && r && r.hall && r.clinic && !r.wh, 'vila/' + sd + ': prefeitura e cura, sem armazém', JSON.stringify(r) + errs.join('|'));
    if (r) { if (r.store) seen.store++; if (r.tavern) seen.tavern++ }
    await page.close();
  }
  console.log('loja em', seen.store, 'e taverna em', seen.tavern, 'de', seeds.length, 'vilas (opcionais)');
  await browser.close(); srv.close(); console.log(fails ? fails + ' FALHA(S)' : 'Tudo OK'); process.exit(fails ? 1 : 0);
})();
