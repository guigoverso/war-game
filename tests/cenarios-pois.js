'use strict';
// ---------- Galeria dos cenários de POIs (como cenarios-tiles.html; Node + Playwright, só para desenvolvimento) ----------
// Gera cenarios-pois.html na raiz, em três grupos: POIs sem variações (um link: ?cenario=pois), POIs procedurais (um link por tipo de LEGO_SHOW.types:
// ?cenario=lego&tipo=<tipo>, 4 variações em cada tamanho) e micro-POIs (um link: ?cenario=lego&micro=1). Cada cartão leva uma foto aérea (docs/img/cenarios-pois/).
// Os tipos procedurais saem de LEGO_SHOW.types (14 tipos desde o L3.5): um tipo novo entra sozinho. Uso: cd tests && node cenarios-pois.js [semente=11] [sem fotos: nofoto]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), IMG = path.join(ROOT, 'docs/img/cenarios-pois'), SEED = +(process.argv[2] || 11), FOTO = process.argv[3] !== 'nofoto';
fs.mkdirSync(IMG, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html', browser = await chromium.launch(), errs = [];
  const open = async q => {   // abre uma vista, espera carregar e devolve a página e um resumo do que há no mapa
    const page = await browser.newPage({ viewport: { width: 1000, height: 700 } }); page.on('pageerror', e => errs.push(q + ': ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()) });
    await page.goto(base + '?' + q + '&auto=1&mute=1&seed=' + SEED);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && ((WORLD.pois && WORLD.pois.length) || (WORLD.micros && WORLD.micros.length)), null, { timeout: 90000 });
    await page.click('text=Continuar').catch(() => {}); await page.waitForTimeout(400);
    const info = await page.evaluate(() => ({ pois: WORLD.pois.length, dorm: (WORLD.dormant || []).length, micros: (WORLD.micros || []).length,
      types: typeof LEGO_SHOW !== 'undefined' ? LEGO_SHOW.types.map(t => [t, POI_DEFS[t].n]) : [], names: WORLD.pois.map(p => POI_DEFS[p.type].n).filter((n, i, a) => a.indexOf(n) === i) }));
    return { page, info };
  };
  const shot = async (page, name, alt) => {   // foto aérea (sem a interface) de cima do cenário
    await page.evaluate(alt => { G.noclip = true; for (const g of WS.vm) g.visible = false; WS.vm.length = 0; const st = document.createElement('style'); st.textContent = 'body>*:not(canvas){visibility:hidden!important}'; document.head.appendChild(st);
      const s = WORLD.showcase; P.x = W / 2; P.z = s.z - 30 + 20; P.y = s.y + alt; P.camY = P.y; P.yaw = 0; P.pitch = -1.45; P.vx = P.vz = P.vy = 0 }, alt);
    await page.waitForTimeout(1200); const f = 'docs/img/cenarios-pois/' + name + '.png'; await page.screenshot({ path: path.join(ROOT, f) }); return f;
  };
  const card = (c, q) => `<div class="c">${c.img ? `<img src="${c.img}">` : ''}<p><a href="index.html?${q}&auto=1&mute=1&seed=${SEED}">${esc(c.t)}</a><br><small>${esc(c.d)}</small><br><small>?${q}&auto=1&mute=1&seed=${SEED}</small></p></div>`;
  const out = { fixo: [], proc: [], micro: [] };
  {   // 1) POIs sem variações
    const { page, info } = await open('cenario=pois'); const c = { t: 'Todos os POIs de desenho fixo (mapa manual)', d: info.pois + ' POIs permanentes e de guerra + ' + info.dorm + ' decorações dormentes: ' + info.names.join(', ') };
    if (FOTO) c.img = await shot(page, 'fixos', 190); out.fixo.push([c, 'cenario=pois']); await page.close();
  }
  const first = await open('cenario=lego&tipo=__'); const types = first.info.types; await first.page.close();   // a vista sem tipo válido mostra tudo: serve para ler LEGO_SHOW.types
  for (const [t, n] of types) {   // 2) POIs procedurais: um link por tipo
    const { page, info } = await open('cenario=lego&tipo=' + t); const c = { t: n + ': variações procedurais', d: info.pois + ' POIs: 4 variações (esqueletos diferentes) em cada tamanho, médio e pequeno' };
    if (FOTO) c.img = await shot(page, 'proc-' + t, 130); out.proc.push([c, 'cenario=lego&tipo=' + t]); await page.close();
  }
  {   // 3) micro-POIs
    const { page, info } = await open('cenario=lego&micro=1'); const c = { t: 'Todos os micro-POIs', d: (info.dorm + info.micros) + ' micro-POIs: ' + info.dorm + ' que já existiam (decorações dormentes) e ' + info.micros + ' novos' };
    if (FOTO) c.img = await shot(page, 'micros', 150); out.micro.push([c, 'cenario=lego&micro=1']); await page.close();
  }
  await browser.close(); srv.close();
  const sec = (h, a) => `<h2>${h}</h2><div class="g">${a.map(([c, q]) => card(c, q)).join('')}</div>`;
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Cenários dos POIs</title>
<style>
body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}h2{font-size:16px;margin-top:26px;color:#ffd24a}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:384px;background:#2a303a;border-radius:6px;padding:8px}
.c img{width:384px;display:block}.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2;word-break:break-all}
</style></head><body>
<h1>Cenários dos POIs</h1>
<p>Cada cartão abre o jogo num mundo super plano (precisa de servidor estático: <code>python -m http.server 8123</code> e abrir <code>http://localhost:8123/cenarios-pois.html</code>). Tecla <b>N</b> liga o voo (noclip).
Os procedurais aceitam <code>piso=planicie|floresta|deserto|neve|montanha</code>. Sem <code>tipo</code> nem <code>micro</code>, <code>?cenario=lego</code> mostra só fazenda, mina e serraria (a grade de 14 tipos não cabe no mapa) e os micro-POIs. Gerada por <code>cd tests &amp;&amp; node cenarios-pois.js</code>.</p>
${sec('POIs sem variações (um desenho fixo cada)', out.fixo)}${sec('POIs procedurais (lego): um link por tipo', out.proc)}${sec('Micro-POIs (só cenário)', out.micro)}</body></html>
`;
  fs.writeFileSync(path.join(ROOT, 'cenarios-pois.html'), html);
  if (errs.length) console.log('FALHA erros no jogo:\n' + errs.slice(0, 5).join('\n')); else console.log('OK    ' + (out.fixo.length + out.proc.length + out.micro.length) + ' vistas abertas sem erros');
  process.exit(errs.length ? 1 : 0);
})();
