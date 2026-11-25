'use strict';
// ---------- Teste do núcleo da batalha (feature 12, passo 1; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=batalha&modo=nucleo, entra no raio do gerador e confere: lotes de 3 a 5, cota de vivos (30), coleira (volta ao sair do raio x 1,3), reposição do jogador,
// vitória (reserva zerada) e derrota (morte do comandante). Uso: cd tests && node batalha-nucleo.js
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
  await page.evaluate(() => { closePanel(); G.god = true; });
  return { page, errs };
}
const snap = page => page.evaluate(() => ({ c: battleCounts(), t: BATTLE.t, awake: BATTLE.gens[0].awake, over: BATTLE.over,
  dist: ENEMIES.filter(e => e.alive && e.btl).map(e => Math.hypot(e.x - BATTLE.gens[0].x, e.z - BATTLE.gens[0].z)) }));

(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  {   // 1) lotes, cota e coleira
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=nucleo&mute=1&semente=7');
    let s = await snap(page);
    ok(s.c.e.f === 0 && s.c.e.r === 100 && s.c.p.f === 10 && s.c.p.r === 40, 'início: inimigo 0 em campo/100 reserva; jogador 10 em campo/40 reserva (batalhão de 50) ' + JSON.stringify(s.c));
    ok(!s.awake, 'o gerador começa dormindo (jogador fora do raio)');
    await page.evaluate(() => { const g = BATTLE.gens[0]; P.x = g.x - g.radius + 6; P.z = g.z; P.y = tH(P.x, P.z) + 0.1; P.camY = P.y; });
    await page.waitForTimeout(600);
    s = await snap(page);
    ok(s.awake && s.c.e.f >= 3 && s.c.e.f <= 5, 'ao entrar no raio o gerador acorda e lança o 1º lote de 3 a 5 (' + s.c.e.f + ')');
    await page.waitForTimeout(15000);
    s = await snap(page);
    ok(s.c.e.f <= 30, 'cota de vivos respeitada (' + s.c.e.f + ' <= 30)');
    ok(s.c.e.r < 100 - 5, 'reserva diminuiu com os lotes (' + s.c.e.r + ')');
    await page.evaluate(() => { const g = BATTLE.gens[0]; P.x = g.x - g.radius * 2.2; P.z = g.z; P.y = tH(P.x, P.z) + 0.1; P.camY = P.y; });
    await page.waitForTimeout(12000);
    s = await snap(page);
    ok(!s.awake, 'ao sair do raio x 1,3 o gerador dorme');
    ok(s.dist.every(d => d < 60 * 1.3 + 6), 'coleira: nenhum soldado lançado passou do raio x 1,3 (máx ' + Math.max(0, ...s.dist).toFixed(0) + ')');
    ok(s.dist.filter(d => d < 12).length >= Math.floor(s.dist.length * 0.5), 'coleira: a maioria voltou ao gerador (' + s.dist.filter(d => d < 12).length + '/' + s.dist.length + ')');
    ok(!(await page.evaluate(() => !!document.getElementById('btlhud'))) === false, 'placar na tela');
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // 2) vitória: reserva baixa, mata todos
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=nucleo&mute=1&inim=8&semente=3');
    await page.evaluate(() => { const g = BATTLE.gens[0]; P.x = g.x - g.radius + 6; P.z = g.z; P.y = tH(P.x, P.z) + 0.1; P.camY = P.y; });
    for (let i = 0; i < 12; i++) { await page.waitForTimeout(1500); await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); }); }
    await page.waitForTimeout(1000);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('victory').innerText }));
    ok(r.over && r.panel === 'victory', 'vitória ao zerar reserva e vivos: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // 3) derrota
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=nucleo&mute=1');
    await page.evaluate(() => { G.god = false; damagePlayer(99999, P.x, P.z); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /DERROTA/.test(r.txt), 'derrota na morte do comandante: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {   // 4) desempenho com 100 de reserva e 30 vivos
    const { page } = await open(browser, base, 'cenario=batalha&modo=nucleo&mute=1');
    await page.evaluate(() => { const g = BATTLE.gens[0]; P.x = g.x - g.radius + 6; P.z = g.z; P.y = tH(P.x, P.z) + 0.1; P.camY = P.y; tileTestMeasure(); });
    await page.waitForFunction(() => TILETEST.perf, null, { timeout: 240000 });
    const p = await page.evaluate(() => Object.assign({}, TILETEST.perf, { vivos: BATTLE.area.aliveEnemies, aliados: ALLIES.filter(a => a.alive).length }));
    console.log('desempenho: ' + p.fps.toFixed(1) + ' qps | atualizar ' + p.upd.toFixed(2) + ' ms | desenhar ' + p.ren.toFixed(2) + ' ms | vivos ' + p.vivos + ' x aliados ' + p.aliados + ' (software, sem placa de vídeo)');
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
