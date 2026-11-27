'use strict';
// Verificação da 8.2 (modo Líder no mapa mundi) no navegador: node tests/lider82.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) });
});
let fails = 0; const ok = (c, n, w) => { if (!c) fails++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port, br = await chromium.launch(), page = await br.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(base + '/index.html?mundo=1&auto=1&mute=1&seed=11');
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running, null, { timeout: 180000 });
  await page.waitForTimeout(2000);
  const r = await page.evaluate(() => {
    const o = {}; o.turn = wtX().turn; o.phase = STATE.phase; o.office = !!G.office; o.bats = batList('player').length;
    closePanel(); wm3Open(); o.open = WM.open; o.hud = WM.turnEl && WM.turnEl.innerText;
    const G2 = WM.built.G, home = G2.inicio.id; wm3Select(home); o.sel = WM.turnEl.innerText;
    o.mine = wtMine(G2, home); STATE.rd.actions = 3; STATE.rd.lvl = 2; Ledger.set('gold', 5000); wm3Select(home);
    o.btns = [...WM.turnEl.querySelectorAll('button')].map(b => b.innerText + (b.disabled ? ' [off]' : ''));
    WM.turnEl.querySelector('[data-a=lcreate]').click(); o.after = batList('player').map(b => batTotal(b)); o.gold = Ledger.get('gold'); o.pts = STATE.rd.actions;
    o.btns2 = [...WM.turnEl.querySelectorAll('button')].map(b => b.innerText);
    const d = WM.turnEl.querySelector('[data-a^="ldon"]'); if (d) d.click(); o.afterDon = batList('player').map(b => batTotal(b));
    o.recCap = RECRUIT_ROUND_CAP.city; o.full = armyFull();
    return o;
  });
  console.log(JSON.stringify(r, null, 1));
  ok(r.open && /Batalh/.test(r.hud || ''), 'mapa mundi abre em modo Líder com a caixa de batalhões');
  ok(r.after.length === 2 && r.gold === 4000 && r.pts === 2, 'criar: 2 batalhões, -1000 de ouro e -1 ponto');
  ok(r.afterDon && r.afterDon.reduce((a, b) => a + b, 0) === r.after.reduce((a, b) => a + b, 0), 'doar mantém o total');
  ok(errs.length === 0, 'sem erros no console', errs.join(' | '));
  await br.close(); srv.close(); process.exit(fails ? 1 : 0);
});
