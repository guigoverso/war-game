'use strict';
// ---------- Teste da Defesa da batalha (feature 12, passo 3; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=batalha&modo=defesa e confere: 3 postos por lado, reservas, cobertura espelhada fora das rotas, marcha ao centro, cota de vivos, reposição
// do jogador pelos postos, vitória (os dois lados do inimigo zerados) e derrota. Uso: cd tests && node batalha-defesa.js
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
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=defesa&mute=1&semente=5');
    let s = await page.evaluate(() => ({ c: battleCounts(), L: BATTLE.limit, gens: BATTLE.gens.map(g => [g.side, g.kind, g.reserve, Math.hypot(g.x - BATTLE.limit.x, g.z - BATTLE.limit.z)]),
      d: Math.hypot(P.x - BATTLE.limit.x, P.z - BATTLE.limit.z) }));
    ok(s.L.r === 45 && s.L.gray === 20, 'raio 45 e zona cinza 20 ' + JSON.stringify(s.L));
    ok(s.gens.length === 3 && s.gens.every(g => g[0] === 'enemy' && Math.abs(g[3] - 85) < 1), '3 postos inimigos a ~40 além do raio ' + JSON.stringify(s.gens));
    ok(s.d < 6, 'jogador começa no centro do POI (' + s.d.toFixed(1) + ')');
    ok(s.c.e.r + s.c.e.f === 100 && s.c.p.r === 40 && s.c.p.f === 10, 'reservas ' + JSON.stringify(s.c));
    await page.waitForTimeout(20000);
    s = await page.evaluate(() => ({ c: battleCounts(), d: ENEMIES.filter(e => e.alive && e.btl).map(e => Math.hypot(e.x - BATTLE.center.x, e.z - BATTLE.center.z)) }));
    ok(s.c.e.f > 0 && s.c.e.f <= 30 && s.c.e.r < 100, 'lotes saem dos postos sob a cota (' + s.c.e.f + ', reserva ' + s.c.e.r + ')');
    ok(s.d.some(d => d < 45), 'atacantes chegaram à área (min ' + Math.min(...s.d).toFixed(0) + ')');
    let r;
    // soldado preso fora da área: teleporte logo além da borda; preso de novo, recua
    await page.evaluate(() => { const e = ENEMIES.find(q => q.alive && q.btl && q.btl.kind === 'post'), c = BATTLE.center, d = Math.hypot(e.x - c.x, e.z - c.z) || 1;
      e.x = c.x + (e.x - c.x) / d * 75; e.z = c.z + (e.z - c.z) / d * 75; window.__st = { e, x: e.x, z: e.z };
      window.__pin = setInterval(() => { if (!e.stuckN && e.alive) { e.x = __st.x; e.z = __st.z; } }, 30); });
    await page.waitForFunction(() => __st.e.stuckN === 1, null, { timeout: 30000 });
    r = await page.evaluate(() => { const e = __st.e, c = BATTLE.center; return { d: Math.hypot(e.x - c.x, e.z - c.z), edge: BATTLE.centerR + BATTLE_MOD.stuck.offset, alive: e.alive }; });
    ok(r.alive && Math.abs(r.d - r.edge) < 3, 'preso foi teleportado logo além da borda (' + r.d.toFixed(1) + ' ~ ' + r.edge + ')');
    await page.evaluate(() => { clearInterval(__pin); const e = __st.e; window.__pin = setInterval(() => { if (e.alive) { e.x = __st.x; e.z = __st.z; } }, 30); });
    await page.waitForFunction(() => !__st.e.alive, null, { timeout: 30000 });
    ok(true, 'preso de novo: recuou e saiu da batalha'); await page.evaluate(() => clearInterval(__pin));
    // ordem de movimento limitada ao raio
    const o = await page.evaluate(() => { const O = { x: BATTLE.limit.x + 200, z: BATTLE.limit.z }; battleClampOrder(O); return Math.hypot(O.x - BATTLE.limit.x, O.z - BATTLE.limit.z); });
    ok(o <= 45, 'ordem V fora da área é puxada para dentro (' + o.toFixed(1) + ')');
    // zona cinza: aviso; atravessar: fuga
    await page.evaluate(() => { P.x = BATTLE.limit.x + BATTLE.limit.r + 8; P.z = BATTLE.limit.z; });
    await page.waitForTimeout(500);
    r = await page.evaluate(() => ({ warn: document.getElementById('btlwarn') && document.getElementById('btlwarn').style.display, over: BATTLE.over }));
    ok(r.warn === 'block' && !r.over, 'zona cinza mostra o aviso sem perder');
    await page.evaluate(() => { P.x = BATTLE.limit.x; P.z = BATTLE.limit.z; });
    await page.waitForTimeout(500);
    r = await page.evaluate(() => document.getElementById('btlwarn').style.display);
    ok(r === 'none', 'aviso some ao voltar');
    await page.evaluate(() => { P.x = BATTLE.limit.x + BATTLE.limit.r + 25; });
    await page.waitForTimeout(500);
    r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /fugiu/.test(r.txt), 'fuga = derrota: ' + r.txt.replace(/\n+/g, ' / '));
    await page.screenshot({ path: path.join(ROOT, 'tests', 'defesa.png') });
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // vitória
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=defesa&mute=1&inim=9&semente=3');
    for (let i = 0; i < 14; i++) { await page.waitForTimeout(1500); await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); }); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ over: BATTLE.over, txt: window.__toasts.join(' | ') }));
    ok(r.over && /VITÓRIA/.test(r.txt), 'vitória ao zerar atacantes: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // derrota por morte
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=defesa&mute=1');
    await page.evaluate(() => { G.god = false; damagePlayer(99999, P.x, P.z); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /caiu defendendo/.test(r.txt), 'derrota por morte: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // passo 10: Defesa vinda do cerco (&origem=cerco), fadiga registrada e cicatriz ao vencer
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=defesa&mute=1&origem=cerco&acoes=2');
    const a = await page.evaluate(() => ({ o: BATTLE.origem, ficha: siegeGet('teste'), fat0: STATE.war ? STATE.war.fat : null, whyOk: typeof tileWarWhy === 'function' }));
    ok(a.o && a.o.tipo === 'defesa' && a.o.origem === 'cerco' && a.o.acoesGastas === 2 && a.ficha === null, 'origem=cerco: o batalhão chegou a tempo, o cerco virou Defesa: ' + JSON.stringify(a.o));
    await page.evaluate(() => { facDeclareWar(tileTestFoe().fid); battleWin(); });   // sem guerra a fadiga não mexe (testado em macro/tilewar.js)
    const b = await page.evaluate(() => ({ rel: relStatus(tileTestFoe().fid), fim: BATTLE.fim, scars: tileScars('teste'), fat: STATE.war ? STATE.war.fat : null }));
    ok(b.fim && b.fim.tile === null && b.scars.length === 2, 'defesa vencida: tile continua seu e deixa 2 cicatrizes: ' + JSON.stringify(b.scars));
    ok(b.fat === a.fat0 + 0.25, 'fadiga da defesa vencida: +0,25 (só com guerra ativa): ' + a.fat0 + ' -> ' + b.fat + ' rel=' + b.rel + ' fim=' + JSON.stringify(b.fim));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
