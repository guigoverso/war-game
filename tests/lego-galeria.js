'use strict';
// ---------- Galeria da fazenda lego (protótipo; docs/features/11_pois-procedurais-lego.md; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=pois&lego=1 com várias sementes (a fazenda do mapa manual muda com a semente), confere carga sem erros e as âncoras (casa e portão dentro da área,
// casa alcançável) e tira uma foto aérea de cada fazenda (docs/img/lego/*.png). Escreve cenarios-lego.html na raiz. Uso: cd tests && node lego-galeria.js [n sementes]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), IMG = path.join(ROOT, 'docs/img/lego'), N = +(process.argv[2] || 8);
fs.mkdirSync(IMG, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?cenario=pois&auto=1&mute=1&lego=1', browser = await chromium.launch(), L = [];
  for (let s = 1; s <= N; s++) {
    const page = await browser.newPage({ viewport: { width: 900, height: 700 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    await page.goto(base + '&seed=' + s);
    let why = ''; try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.pois && WORLD.pois.length, null, { timeout: 40000 }) } catch (e) { why = 'não carregou' }
    rep(!why && !errs.length, 'semente ' + s + ': carrega sem erros', why || errs.slice(0, 2).join(' | '));
    if (why) { await page.close(); continue }
    await page.click('text=Continuar').catch(() => {}); await page.waitForTimeout(400);
    const info = await page.evaluate(() => {
      const p = WORLD.pois.find(q => q.type === 'farm'); if (!p || !p.lego) return null;
      G.noclip = true; P.x = p.cx + 0.5; P.z = p.cz + 17; P.y = p.y + 40; P.camY = P.y; P.yaw = 0; P.pitch = -1.15; P.vx = P.vz = P.vy = 0;
      for (const g of WS.vm) g.visible = false; WS.vm.length = 0;   // sem a arma na foto
      const st = document.createElement('style'); st.textContent = 'body>*:not(canvas){visibility:hidden!important}'; document.head.appendChild(st);   // sem HUD, minimapa nem avisos
      const l = p.lego, H = LEGO_HALF;
      return { sk: l.skeleton, rot: l.rot, mir: l.mir, pieces: l.pieces, house: l.house, gate: l.gate, boxes: p.cols ? p.cols.length : 0, ok: Math.abs(l.house.x) <= H && Math.abs(l.house.z) <= H && Math.abs(l.gate.x) <= H + 0.1 && Math.abs(l.gate.z) <= H + 0.1 };
    });
    rep(!!info && info.ok, 'semente ' + s + ': fazenda lego montada, casa e portão dentro da área', info ? info.sk + ' rot ' + info.rot + (info.mir ? ' espelhada' : '') + ' [' + info.pieces.join(',') + ']' : 'sem p.lego');
    await page.waitForTimeout(1200);
    const img = 'docs/img/lego/f' + String(s).padStart(2, '0') + '.png';
    await page.screenshot({ path: path.join(ROOT, img) });
    L.push({ s, img, info }); await page.close();
  }
  await browser.close(); srv.close();
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Fazenda lego (protótipo)</title>
<style>body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:450px;background:#2a303a;border-radius:6px;padding:8px}.c img{width:450px;display:block}.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2}</style></head><body>
<h1>Fazenda lego (protótipo, ${L.length} sementes)</h1>
<p>Cada cartão é a <b>mesma receita</b> (fazenda) com uma semente diferente: esqueleto, giro/espelho, peças de cada vaga e enfeites mudam. Cada link abre o mapa manual de POIs com a fazenda lego
(<code>?cenario=pois&amp;lego=1&amp;seed=N</code>; a fazenda é a primeira da grade; tecla N liga o voo). Sem <code>lego=1</code> a fazenda é a antiga, para comparar (<code>?cenario=pois&amp;seed=N</code>).
Dados: <code>js/modifiers/lego-modifiers.js</code>; montador: <code>js/local/poilego.js</code>. Gerada por <code>cd tests &amp;&amp; node lego-galeria.js</code>.</p><div class="g">` +
  L.map(l => `<div class="c"><img src="${l.img}"><p><a href="index.html?cenario=pois&auto=1&mute=1&lego=1&seed=${l.s}">Semente ${l.s}</a>${l.info ? '<br><small>esqueleto <b>' + l.info.sk + '</b>, rotação ' + l.info.rot + (l.info.mir ? ', espelhada' : '') + '<br>peças: ' + l.info.pieces.join(', ') + '</small>' : ''}</p></div>`).join('') + '</div></body></html>\n';
  fs.writeFileSync(path.join(ROOT, 'cenarios-lego.html'), html); console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
})();
