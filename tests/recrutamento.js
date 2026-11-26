'use strict';
// ---------- Teste do recrutamento (feature 12, passo 11; 4B-4 e 4B-19) ----------
// Regras: teto único de 50 sem reserva; só cidade sua e vila sua/neutra recrutam; limite por rodada (cidade 50, vila 15); vila tem alistamento (e não Quartel).
// Uso: cd tests && node recrutamento.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
let fails = 0;
const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')); };
(async () => {
  const srv = await new Promise(r => { const s = http.createServer((q, s2) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]) === '/' ? 'index.html' : decodeURIComponent(q.url.split('?')[0]));
    fs.readFile(f, (e, d) => { if (e) { s2.writeHead(404); return s2.end() } s2.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); s2.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
  const base = 'http://127.0.0.1:' + srv.address().port, browser = await chromium.launch();
  for (const m of ['sua', 'neutra', 'inimiga']) {
    const page = await browser.newPage(), errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '/index.html?cenario=tile&tema=vila&seed=12&auto=1&mute=1&recrutar=' + m);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.cities, null, { timeout: 180000 });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => {
      const c = WORLD.cities.find(k => k.vila), out = { vila: !!c, post: !!(c && c.recruit), barr: !!(c && c.barracks), max: ARMY.max, place: recruitPlace(c) };
      P.coins = 1e6; let n = 0; while (recruitAlly(c) && n < 100) n++; out.n = n; out.left = recruitLeft(c);
      STATE.round++; out.leftNext = recruitLeft(c); out.total = armyTotal();
      return out;
    });
    const want = m === 'inimiga' ? 0 : m === 'neutra' ? 5 : 15;
    rep(r.vila && r.post && !r.barr, m + ': vila tem alistamento e não tem Quartel', JSON.stringify(r));
    rep(r.n === want && (m === 'inimiga' || (r.left === 0 && r.leftNext === want)), m + ': recruta ' + want + ' na rodada e renova na seguinte', JSON.stringify(r));
    rep(r.max === 50 && !errs.length, m + ': teto 50 e sem erros', errs.join('|'));
    await page.close();
  }
  const page = await browser.newPage(), errs = [];
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(base + '/index.html?cenario=tile&tema=cidade&seed=11&forma=pangeia&auto=1&mute=1');
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.home, null, { timeout: 180000 });
  const r = await page.evaluate(() => {
    const c = WORLD.home; P.coins = 1e6; let n = 0; while (recruitAlly(c) && n < 100) n++;
    const g = armyGain(5); return { n, total: armyTotal(), lost: g.lost, spawned: g.spawned, res: ARMY.reserve };
  });
  rep(r.n >= 1 && r.total <= 50 && r.res === undefined && r.spawned === 0 && r.lost === 5, 'cidade sua: recruta até o teto 50 e o excesso se perde', JSON.stringify(r) + errs.join('|'));
  await browser.close(); srv.close(); process.exit(fails ? 1 : 0);
})();
