'use strict';
// ---------- Teste da provocação (tiro de longe acorda a defesa; Node + Playwright) ----------
// Confere: jogador a 90 do alvo (fora do alerta de 40) atira em um soldado: o gerador acorda e fica acordado, 2 contra-atiradores com alcance maior, EDEF intacto. Uso: cd tests && node provocacao.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const serve = () => new Promise(r => {
  const s = http.createServer((q, res) => {
    const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  });
  s.listen(0, '127.0.0.1', () => r(s));
});
let fails = 0;
const ok = (c, m) => { console.log((c ? 'OK     ' : 'FALHA  ') + m); if (!c) fails++; };

async function open(browser, base, qs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base + '/index.html?' + qs);
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running && typeof BATTLE !== 'undefined' && BATTLE.on, null, { timeout: 240000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => { closePanel(); G.god = true; window.__toasts = []; const o = toast; window.toast = (m, ms) => { window.__toasts.push(m); o(m, ms); }; });
  return { page, errs };
}
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const { page, errs } = await open(browser, base, 'cenario=batalha&modo=pequena&mute=1');
  await page.evaluate(() => { P.x = BATTLE.target.x - 90; P.z = BATTLE.target.z; }); await page.waitForTimeout(1500);
  let s = await page.evaluate(() => ({ awake: BATTLE.target.gen.awake, c: ENEMIES.filter(e => e.counter).length }));
  ok(!s.awake && s.c === 0, 'a 90 do alvo a defesa dorme e ninguém é contra-atirador ' + JSON.stringify(s));
  await page.evaluate(() => { damageEnemy(ENEMIES.find(e => e.alive && e.btl), 1, false, false); }); await page.waitForTimeout(3500);
  s = await page.evaluate(() => ({ awake: BATTLE.target.gen.awake, c: ENEMIES.filter(e => e.counter).length, r: ENEMIES.find(e => e.counter).def.range, r0: ENEMIES.find(e => e.alive && e.btl && !e.counter).def.range,
    sq: BATTLE.squadOn, d: Math.hypot(P.x - BATTLE.target.x, P.z - BATTLE.target.z) }));
  ok(s.awake && s.sq && s.d > 80, 'tiro de longe acorda a defesa e ela continua acordada com o jogador a ' + s.d.toFixed(0) + ' ' + JSON.stringify(s));
  ok(s.c === 2 && s.r > s.r0 * 2 && s.r0 > 0, 'contra-atiradores: ' + s.c + ' com alcance ' + s.r.toFixed(0) + ' (soldado comum ' + s.r0 + ', EDEF ' + 42 + ')');
  await page.evaluate(() => { P.x = BATTLE.target.x - 400; P.z = BATTLE.target.z; BATTLE.target.gen.provokedUntil = 0; }); await page.waitForTimeout(1500);
  s = await page.evaluate(() => BATTLE.target.gen.awake);
  ok(!s, 'acabada a provocação e com o jogador longe, a defesa volta a dormir');
  ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
  await browser.close(); srv.close();
  console.log(fails ? fails + ' falha(s)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})();
