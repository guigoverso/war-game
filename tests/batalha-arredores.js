'use strict';
// ---------- Teste dos arredores de defesa (feature 12, passo 8; Node + Playwright) ----------
// Confere: principal de facção forte ganha trincheira (e barricada onde a estrada cruza, em guerra); sem guerra a estrada fica livre; bandidos, jogador e
// tile sem principal forte não ganham nada. Uso: cd tests && node batalha-arredores.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, res) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK     ' : 'FALHA  ') + m); if (!c) fails++ };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?cenario=tile&tema=fortaleza&seed=11&forma=pangeia&auto=1&mute=1', browser = await chromium.launch();
  const run = async (qs) => { const p = await browser.newPage({ viewport: { width: 1000, height: 700 } }), errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(base + '&' + qs); await p.waitForFunction(() => typeof WORLD !== 'undefined' && WORLD.tileCompose && G.running, null, { timeout: 120000 }); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ s: WORLD.surround, main: WORLD.pois.find(p => p.main) && WORLD.pois.find(p => p.main).type, owner: WORLD.pois.find(p => p.main) && WORLD.pois.find(p => p.main).owner,
      kinds: WORLD.micros.map(m => m.kind), meshes: WORLD.micros.filter(m => m.mesh).length, n: WORLD.micros.length }));
    await p.close(); return { r, errs } };
  const f1 = await run('dono=faccao&guerra=1'), f0 = await run('dono=faccao&guerra=0'), b = await run('dono=bandit&guerra=1'), pl = await run('dono=player&guerra=1');
  console.log(JSON.stringify([f1.r.main, f1.r.owner, f1.r.s]), JSON.stringify(f0.r.s));
  ok(f1.r.main === 'fort' && typeof f1.r.owner === 'number', 'principal é forte e de facção');
  ok(f1.r.s.trincheira >= 6, 'facção: trincheira em volta (' + f1.r.s.trincheira + ' trechos)');
  ok(f1.r.s.barricada >= 1, 'facção em guerra: barricada onde a estrada cruza (' + f1.r.s.barricada + ')');
  ok(f0.r.s.barricada === 0 && f0.r.s.trincheira >= 6, 'sem guerra: sem barricada, a trincheira fica');
  ok(f1.r.meshes === f1.r.n, 'todos os trechos têm malha');
  ok(b.r.s.trincheira === 0 && b.r.s.barricada === 0, 'bandidos: sem arredores');
  ok(pl.r.s.trincheira === 0 && pl.r.s.barricada === 0, 'jogador: sem arredores');
  const errs = [].concat(f1.errs, f0.errs, b.errs, pl.errs); ok(errs.length === 0, 'sem erros na página' + (errs.length ? ': ' + errs[0] : ''));
  await browser.close(); srv.close(); console.log(fails ? fails + ' FALHA(S)' : 'TUDO OK'); process.exit(fails ? 1 : 0);
})();
