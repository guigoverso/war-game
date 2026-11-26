'use strict';
// ---------- Teste da batalha pequena (feature 12, passo 7; Node + Playwright) ----------
// Confere: só elites, defesa fixa com vida x1,75, sem placar nem reposição; conquista ao matar a defesa; vitória; derrota branda. Uso: cd tests && node batalha-pequena.js
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
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=pequena&mute=1');
    let s = await page.evaluate(() => ({ gar: ENEMIES.filter(e => e.alive && e.btl).length, hp: ENEMIES.find(e => e.btl).maxhp / EDEF.soldier.hp, al: ALLIES.length,
      res: BATTLE.ally.reserve, gens: BATTLE.gens.length, hud: !!document.getElementById('btlhud') }));
    ok(s.gar === 10 && Math.abs(s.hp / 1 - s.hp) < 1e-9 && s.hp >= 1.5 && s.al === 10 && s.res === 0 && s.gens === 1 && !s.hud, 'defesa 10 com vida x' + s.hp.toFixed(2) + ', 10 elites, sem reserva, sem placar ' + JSON.stringify(s));
    let q = await page.evaluate(() => ({ st: ALLIES.filter(a => a.alive).map(a => a.state), far: Math.hypot(ALLIES[0].x - BATTLE.target.x, ALLIES[0].z - BATTLE.target.z) }));
    ok(q.st.length === 10 && q.st.every(v => v === 'patrol'), 'antes de lutar os soldados patrulham, não seguem: ' + q.st[0]);
    await page.evaluate(() => { P.x = BATTLE.target.x + 30; P.z = BATTLE.target.z; }); await page.waitForTimeout(1200);
    q = await page.evaluate(() => ({ st: ALLIES.filter(a => a.alive).map(a => a.state), d: Math.hypot(ALLIES[0].x - P.x, ALLIES[0].z - P.z) }));
    ok(q.st.every(v => v === 'assault') && q.d < 20, 'defesa acordou: soldados teleportados para perto do jogador (' + q.d.toFixed(0) + ') em assalto');
    await page.evaluate(() => { P.x = BATTLE.target.x + 40; P.z = BATTLE.target.z; });
    await page.waitForTimeout(1500);
    await page.evaluate(() => { for (const e of ENEMIES) if (e.alive && e.btl) damageEnemy(e, 99999, false, true); });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(() => ({ cap: BATTLE.target.captured, over: BATTLE.over, ring: !!BATTLE.target.gen.ring, t: [...document.querySelectorAll('#toasts div')].map(d => d.innerText).join(' | ') }));
    q = await page.evaluate(() => ALLIES.filter(a => a.alive).map(a => a.state));
    ok(q.length > 0 && q.every(v => v === 'patrol'), 'vitória: soldados voltam a patrulhar, sem seguir');
    ok(r.cap && r.over && !r.ring && /VITÓRIA/.test(r.t) && /Posição tomada/.test(r.t), 'defesa morta (jogador longe do centro): conquista e vitória na hora: ' + r.t);
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  {
    const { page, errs } = await open(browser, base, 'cenario=batalha&modo=pequena&mute=1');
    await page.evaluate(() => { G.god = false; damagePlayer(99999, P.x, P.z); });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ over: BATTLE.over, panel: G.panel, txt: document.getElementById('dead').innerText }));
    ok(r.over && r.panel === 'dead' && /diante da posição/.test(r.txt), 'derrota branda: ' + r.txt.replace(/\n+/g, ' / '));
    ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
    await page.close();
  }
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
