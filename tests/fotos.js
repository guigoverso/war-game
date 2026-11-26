'use strict';
// ---------- Teste das fotos de modelos 3D (feature 12, passo 12; Node + Playwright, só para desenvolvimento) ----------
// Confere: retratos dos recrutas (imagens geradas, não vazias, mesma semente = mesma imagem, sementes diferentes variam) e ícones das 6 armas
// (6 imagens distintas, não vazias, nas telas: barra, bolsa). Guarda as imagens em tests/fotos-saida/ para olhar. Uso: cd tests && node fotos.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(__dirname, 'fotos-saida');
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
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(base + '/index.html?cenario=tile&tema=vila&seed=12&auto=1&mute=1');
  await page.waitForFunction(() => typeof G !== 'undefined' && G.running, null, { timeout: 240000 });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const faces = [1, 2, 3, 4, 5, 6, 7, 8].map(s => recruitPortrait(s * 2654435761, 64));
    const again = recruitPortrait(1 * 2654435761, 64);
    const icons = WEAPONS.map((w, i) => weaponIconUrl(i));
    return { faces, again, icons, face0: faces[0] };
  });
  const save = (name, url) => fs.writeFileSync(path.join(OUT, name), Buffer.from(url.split(',')[1], 'base64'));
  r.faces.forEach((u, i) => save('rosto' + i + '.png', u)); r.icons.forEach((u, i) => u && save('arma' + i + '.png', u));
  ok(r.faces.every(u => /^data:image\/png/.test(u)), '8 retratos gerados');
  ok(r.faces[0] === r.again, 'mesma semente dá a mesma imagem');
  ok(new Set(r.faces).size >= 5, 'sementes diferentes variam (' + new Set(r.faces).size + ' de 8)');
  ok(r.faces.every(u => u.length > 600), 'retratos não vazios');
  ok(r.icons.every(u => u && /^data:image\/png/.test(u)), '6 ícones de arma gerados');
  ok(new Set(r.icons).size === 6, 'ícones das armas distintos');
  ok(r.icons.every(u => u && u.length > 600), 'ícones não vazios');
  // telas: barra de armas e bolsa
  await page.evaluate(() => { if (typeof giveWeapon === 'function') for (let i = 1; i < 6; i++) giveWeapon(i, true); invChanged(); });
  await page.waitForTimeout(400);
  await page.evaluate(() => updateHUD(0)); const n = await page.evaluate(() => { return document.querySelectorAll('#wlist img.wic').length; });
  ok(n >= 6, 'barra de armas mostra os ícones em foto (' + n + ')');
  await page.screenshot({ path: path.join(OUT, 'tela.png') });
  ok(errs.length === 0, errs.length ? 'ERROS: ' + errs.slice(0, 4).join(' | ') : 'sem erros no console');
  await browser.close(); srv.close();
  console.log(fails ? fails + ' FALHA(S)' : 'tudo OK'); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
