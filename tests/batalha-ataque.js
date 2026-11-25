'use strict';
// ---------- Teste do Ataque da batalha (feature 12, passo 4; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=batalha&modo=ataque e confere: guarnição no alvo, 3 satélites a 100-150 com a reserva dividida, satélite que acorda, captura (guarnição morta + 5 s no
// centro, reinicia se sair), satélites viram postos que retomam o alvo, vitória só com o alvo seu e tudo zerado, derrota, anexação de POIs reais. Uso: cd tests && node batalha-ataque.js
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
      return { c: battleCounts(), sats: T.sats.map(g => [g.reserve, Math.hypot(g.x - T.x, g.z - T.z)]), gar: ENEMIES.filter(e => e.alive && e.btl === T.gen).length, cap: T.captured }; });
    ok(s.gar === 12 && !s.cap, 'guarnição fixa de 12 no alvo (' + s.gar + ')');
    ok(s.sats.length === 3 && s.sats.every(q => q[1] >= 99 && q[1] <= 151) && s.sats.reduce((a, q) => a + q[0], 0) === 100, '3 satélites a 100-150 com reserva 100 dividida ' + JSON.stringify(s.sats));
    ok(s.c.e.f === 12 && s.c.e.r === 100 && s.c.p.r === 40 && s.c.p.f === 10, 'placar inicial ' + JSON.stringify(s.c));
    await page.waitForTimeout(3000);
    s = await page.evaluate(() => ({ gens: BATTLE.gens.filter(g => g.role === 'sat').map(g => g.awake), live: BATTLE.area.aliveEnemies }));
    ok(s.gens.every(a => !a) && s.live === 12, 'satélites dormem longe do jogador; só a guarnição está viva');
    // satélite acorda ao entrar no raio e lança lote
    await page.evaluate(() => { const g = BATTLE.target.sats[1]; P.x = g.x - 40; P.z = g.z; });
    await page.waitForTimeout(6000);
    s = await page.evaluate(() => { const g = BATTLE.target.sats[1]; return { awake: g.awake, res: g.reserve, r0: g.reserve0 }; });
    ok(s.awake && s.res < s.r0, 'satélite acorda no raio e lança soldados (reserva ' + s.res + '/' + s.r0 + ')');
    // captura: precisa da guarnição morta; sozinho no centro por 5 s
    await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl && e.btl.role === 'sat') damageEnemy(e, 99999, false, true); P.x = BATTLE.target.x + 2; P.z = BATTLE.target.z; });
    await page.waitForTimeout(5000);
    s = await page.evaluate(() => ({ cap: BATTLE.target.captured, gar: ENEMIES.filter(e => e.alive && e.btl === BATTLE.target.gen).length }));
    ok(!s.cap && s.gar > 0, 'com a guarnição viva o alvo não é conquistado');
    await killGarrison(page); await page.waitForTimeout(1500);
    await page.evaluate(() => { P.x = BATTLE.target.x + 40; });   // sai do círculo: o tempo reinicia
    await page.waitForTimeout(4000);
    await page.evaluate(() => { P.x = BATTLE.target.x + 2; });
    await page.waitForTimeout(3000);
    s = await page.evaluate(() => ({ cap: BATTLE.target.captured, t: BATTLE.target.capT }));
    ok(!s.cap && s.t > 1, 'sair do círculo zera a contagem; voltou e ainda falta (' + s.t.toFixed(1) + ' s)');
    await page.waitForTimeout(3500);
    s = await page.evaluate(() => ({ cap: BATTLE.target.captured, over: BATTLE.over, kinds: BATTLE.target.sats.map(g => g.kind), center: !!BATTLE.center }));
    ok(s.cap && !s.over, 'alvo conquistado após 5 s no centro; sem vitória (há reserva)');
    ok(s.kinds.every(k => k === 'post') && s.center, 'satélites viram postos que retomam o alvo');
    // retomada: soldados chegam ao alvo
    await page.evaluate(() => { P.x = BATTLE.target.x + 3; P.z = BATTLE.target.z; });
    await page.waitForTimeout(25000);
    s = await page.evaluate(() => ({ d: ENEMIES.filter(e => e.alive && e.btl).map(e => Math.hypot(e.x - BATTLE.target.x, e.z - BATTLE.target.z)), c: battleCounts() }));
    ok(s.c.e.r < 100 - 12 && s.d.length > 0 && s.d.some(d => d < 60), 'satélites mandam lotes ao alvo (min ' + Math.min(...s.d).toFixed(0) + ', reserva ' + s.c.e.r + ')');
    // vitória: zerar reserva e vivos
    for (let i = 0; i < 16; i++) { await page.waitForTimeout(1500); await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); }); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ over: BATTLE.over, txt: window.__toasts.join(' | ') }));
    ok(r.over && /VITÓRIA/.test(r.txt) && /conquistado/.test(r.txt), 'vitória com alvo seu e inimigo zerado: ' + r.txt.replace(/\n+/g, ' / '));
    await page.screenshot({ path: path.join(ROOT, 'tests', 'ataque.png') });
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // sem alvo conquistado não há vitória, mesmo com tudo morto
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=ataque&mute=1&inim=0&guarnicao=3');
    await killGarrison(page); await page.waitForTimeout(1500);
    let r = await page.evaluate(() => ({ over: BATTLE.over, cap: BATTLE.target.captured }));
    ok(!r.over && !r.cap, 'tudo morto, mas alvo não conquistado: sem vitória');
    await page.evaluate(() => { P.x = BATTLE.target.x; P.z = BATTLE.target.z; });
    await page.waitForTimeout(6500);
    r = await page.evaluate(() => ({ over: BATTLE.over, txt: window.__toasts.join(' | ') }));
    ok(r.over && /VITÓRIA/.test(r.txt), 'conquistou sem reserva: vitória na hora');
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
