'use strict';
// ---------- Teste do Choque da batalha (feature 12, passo 2; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=batalha&modo=choque e confere: 3 postos por lado, reservas, cobertura espelhada fora das rotas, marcha ao centro, cota de vivos, reposição
// do jogador pelos postos, vitória (os dois lados do inimigo zerados) e derrota. Uso: cd tests && node batalha-choque.js
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
  {
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=choque&mute=1&semente=5');
    let s = await page.evaluate(() => ({ c: battleCounts(), gens: BATTLE.gens.map(g => [g.side, g.kind, g.reserve]), cover: BATTLE.cover, C: BATTLE_MOD.choque }));
    ok(s.gens.length === 6 && s.gens.filter(g => g[0] === 'enemy').length === 3, '3 postos por lado ' + JSON.stringify(s.gens));
    ok(s.c.e.r + s.c.e.f === 100 && s.c.p.r === 40 && s.c.p.f === 10, 'inimigo 100 no total; jogador 10 em campo + 40 de reserva ' + JSON.stringify(s.c));
    ok(s.cover.length >= 8 && s.cover.length <= 15, 'peças de cobertura 8 a 15 (' + s.cover.length + ')');
    const cx = s.C.center.x, left = s.cover.filter(o => o.x < cx - 0.5).length, right = s.cover.filter(o => o.x > cx + 0.5).length;
    ok(left === right, 'cobertura igual dos dois lados (' + left + ' x ' + right + ')');
    const posts = s.C.playerPosts.concat(s.C.enemyPosts), segd = (x, z, a, b) => { const dx = cx - a.x, dz = s.C.center.z - a.z, t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz))); return Math.hypot(x - a.x - dx * t, z - a.z - dz * t); };
    ok(s.cover.every(o => posts.every(p => segd(o.x, o.z, p) > 5.5)), 'nenhuma peça nas rotas dos postos ao centro');
    await page.waitForTimeout(25000);
    s = await page.evaluate(() => ({ c: battleCounts(), d: ENEMIES.filter(e => e.alive && e.btl).map(e => Math.hypot(e.x - BATTLE.center.x, e.z - BATTLE.center.z)),
      pe: ALLIES.filter(a => a.alive).length, allyDist: ALLIES.filter(a => a.alive).map(a => Math.hypot(a.x - P.x, a.z - P.z)) }));
    ok(s.c.e.f > 0 && s.c.e.f <= 30, 'inimigos em campo respeitam a cota 30 (' + s.c.e.f + ')');
    ok(s.c.e.r < 100, 'reserva inimiga diminuiu (' + s.c.e.r + ')');
    ok(s.c.p.f <= 10, 'cota do jogador respeitada (' + s.c.p.f + ' <= 10)');
    ok(s.d.some(d => d < 40), 'soldados do inimigo chegaram perto do centro (min ' + Math.min(...s.d).toFixed(0) + ')');
    await page.evaluate(() => { for (const a of ALLIES) if (a.alive) { a.hp = 0; a.alive = false; a.deadT = 0; } });
    await page.waitForTimeout(8000);
    s = await page.evaluate(() => ({ c: battleCounts() }));
    ok(s.c.p.f > 0 && s.c.p.r < 40, 'mortos do jogador são repostos pelos postos (em campo ' + s.c.p.f + ', reserva ' + s.c.p.r + ')');
    await page.screenshot({ path: path.join(ROOT, 'tests', 'choque.png') });
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // vitória
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=choque&mute=1&inim=9&semente=3');
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(1500); await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); }); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: window.__toasts.join(' | ') }));
    ok(r.over && r.panel !== 'victory' && /VITÓRIA/.test(r.txt), 'vitória ao zerar reserva e vivos: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // derrota
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=choque&mute=1');
    await page.evaluate(() => { G.god = false; damagePlayer(99999, P.x, P.z); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /DERROTA/.test(r.txt), 'derrota: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
