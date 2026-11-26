'use strict';
// ---------- Teste do Ataque da batalha (feature 12, passo 4; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=batalha&modo=ataque e confere: com batalhão, guarnição de 30 e 3 satélites (100-150, reserva 100) que reforçam conforme morrem; conquista ao matar a
// guarnição, com a notificação se ainda vêm reforços; vitória só com tudo zerado; sem batalhão (?batalhao=0) só a guarnição; derrota; anexação de POIs reais. Uso: cd tests && node batalha-ataque.js
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
const killGarrison = page => page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl === BATTLE.target.gen) damageEnemy(e, 99999, false, true); });
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  {
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=ataque&mute=1&semente=5');
    let s = await page.evaluate(() => { const T = BATTLE.target;
      return { c: battleCounts(), sats: T.sats.map(g => [g.reserve, g.kind, Math.hypot(g.x - T.x, g.z - T.z)]), gar: ENEMIES.filter(e => e.alive && e.btl === T.gen).length }; });
    const d0 = await page.evaluate(() => ({ home: Math.hypot(P.x - WORLD.home.cx, P.z - WORLD.home.cz), tg: Math.hypot(P.x - BATTLE.target.x, P.z - BATTLE.target.z), base: BATTLE.base.x }));
    ok(d0.home < 40 && d0.tg > 80 && d0.base === 100, 'jogador nasce na cidade, longe do alvo (' + d0.tg.toFixed(0) + '), reposição na trilha');
    ok(s.gar === 30, 'com batalhão a guarnição é de 30 (' + s.gar + ')');
    ok(s.sats.length === 3 && s.sats.every(q => q[2] >= 99 && q[2] <= 151 && q[1] === 'post') && s.sats.reduce((a, q) => a + q[0], 0) === 82, '3 satélites a 100-150 com reserva 82 (100 - 18 que completaram a guarnição) ' + JSON.stringify(s.sats));
    ok(s.c.e.f === 30 && s.c.e.r === 82 && s.c.e.d === 0 && s.c.p.r === 45 && s.c.p.f === 5, 'placar inicial ' + JSON.stringify(s.c));
    await page.waitForTimeout(5000);
    s = await page.evaluate(() => ({ r: battleCounts().e.r, live: BATTLE.area.aliveEnemies }));
    ok(s.r === 82 && s.live === 30, 'cota cheia: satélites ainda não mandam reforço');
    await page.evaluate(() => { let k = 0; for (const e of ENEMIES) if (e.alive && e.btl === BATTLE.target.gen && k++ < 6) damageEnemy(e, 99999, false, true); });
    await page.waitForTimeout(6000);
    s = await page.evaluate(() => ({ r: battleCounts().e.r, live: BATTLE.area.aliveEnemies, cap: BATTLE.target.captured }));
    ok(s.r < 82 && s.live <= 30 && !s.cap, 'à medida que morrem, os satélites mandam reforços (reserva ' + s.r + ', vivos ' + s.live + ')');
    await killGarrison(page); await page.waitForTimeout(800);
    s = await page.evaluate(() => ({ cap: BATTLE.target.captured, over: BATTLE.over, t: window.__toasts.join(' | ') }));
    ok(s.cap && !s.over && /Posto inimigo tomado\. Defenda a posição/.test(s.t), 'guarnição morta = conquista e notificação: ' + s.t);
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(1500); await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); }); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ over: BATTLE.over, txt: window.__toasts.join(' | ') }));
    ok(r.over && /VITÓRIA/.test(r.txt) && /conquistado/.test(r.txt), 'vitória com alvo seu e inimigo zerado: ' + r.txt.replace(/\n+/g, ' / '));
    await page.screenshot({ path: path.join(ROOT, 'tests', 'ataque.png') });
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // sem batalhão: só a guarnição; conquistar = vencer, sem a notificação
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=ataque&mute=1&batalhao=0');
    let s = await page.evaluate(() => ({ gar: ENEMIES.filter(e => e.alive && e.btl === BATTLE.target.gen).length, sats: BATTLE.target.sats.length, gens: BATTLE.gens.length, c: battleCounts() }));
    ok(s.gar === 12 && s.sats === 0 && s.gens === 1 && s.c.e.r === 0, 'sem batalhão: só a guarnição de 12, sem satélites ' + JSON.stringify(s));
    await killGarrison(page); await page.waitForTimeout(1500);
    s = await page.evaluate(() => ({ over: BATTLE.over, cap: BATTLE.target.captured, t: window.__toasts.join(' | ') }));
    ok(s.over && s.cap && /VITÓRIA/.test(s.t) && !/Defenda/.test(s.t), 'conquista sem reforços: vitória, sem a notificação de defesa');
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // anexação de POIs reais e satélites reais
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=ataque&mute=1');
    const r = await page.evaluate(() => {
      const T = BATTLE.target, mk = (dx, dz) => ({ id: 900 + dx, cx: T.x + dx, cz: T.z + dz, owner: 'enemy', show: false }), pois = [mk(110, 0), mk(0, 120), mk(10, 10)];
      const sp = battleSatSpots(T, pois);
      window.poiSetOwner = (p, o) => { p.owner = o; };
      T.pois = [pois[0], pois[2]]; battleAnnex(T);
      return { real: sp.filter(q => q.poi).length, n: sp.length, owners: pois.map(p => p.owner) };
    });
    ok(r.n === 3 && r.real === 2, 'satélites: 2 POIs reais dentro de 100-150 + 1 posto temporário');
    ok(r.owners[0] === 'player' && r.owners[2] === 'player' && r.owners[1] === 'enemy', 'anexação passa os POIs listados ao jogador ' + JSON.stringify(r.owners));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // derrota por morte
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=ataque&mute=1');
    await page.evaluate(() => { G.god = false; damagePlayer(99999, P.x, P.z); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /diante do alvo/.test(r.txt), 'derrota por morte: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
