'use strict';
// Foto aérea dos POIs virados de um tile (uso de desenvolvimento): node tile-face-foto.js semente tema tipo
const http = require('http'), fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), [sd, tema, tipo] = process.argv.slice(2);
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html')); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript' }[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
(async () => {
  const srv = await serve(), b = await chromium.launch(), page = await b.newPage({ viewport: { width: 1100, height: 760 } });
  await page.goto('http://127.0.0.1:' + srv.address().port + '/index.html?cenario=tile&auto=1&mute=1&seed=' + sd + '&tema=' + tema);
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.tileCompose, null, { timeout: 40000 }); await page.click('text=Continuar').catch(() => {}); await page.waitForTimeout(800);
  const ps = await page.evaluate(t => WORLD.pois.filter(p => p.legoFace !== undefined && (!t || p.type === t)).map(p => ({ type: p.type, cx: p.cx, cz: p.cz, y: p.y, r: poiR(p), face: p.legoFace, gate: legoGateRel(p), off: !!p.offRoad, trail: p.trail })), tipo);
  console.log(JSON.stringify(ps));
  for (const [k, i] of ps.slice(0, 3).entries()) {
    await page.evaluate(i => { const g = i.gate, L = Math.hypot(g.x, g.z); P.x = i.cx + g.x / L * (i.r + 8); P.z = i.cz + g.z / L * (i.r + 8); P.y = i.y + 30; P.camY = P.y; P.yaw = Math.atan2(g.x, g.z); P.pitch = -1.15; P.vx = P.vz = P.vy = 0 }, i);
    await page.waitForTimeout(700); await page.screenshot({ path: path.join(__dirname, 'tile-face-out', i.type + '-' + sd + '-' + k + '.png') });
  }
  await b.close(); srv.close();
})();
