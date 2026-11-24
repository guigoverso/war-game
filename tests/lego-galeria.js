'use strict';
// ---------- Galeria dos POIs lego (L2: fazenda, mina e serraria; docs/features/11_pois-procedurais-lego.md; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=lego (mundo super plano com 4 variações de cada tipo e tamanho), confere carga sem erros, as âncoras (âncora e portão dentro da área) e que as 4 variações de
// cada fileira usam esqueletos diferentes, e tira uma foto aérea de cada POI (docs/img/lego/<tipo>-<tamanho>-<n>.png). Escreve cenarios-lego.html na raiz.
// Uso: cd tests && node lego-galeria.js [semente=11] [sem fotos: nofoto]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), IMG = path.join(ROOT, 'docs/img/lego'), SEED = +(process.argv[2] || 11), FOTO = process.argv[3] !== 'nofoto';
fs.mkdirSync(IMG, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?cenario=lego&auto=1&mute=1&seed=' + SEED + (process.env.PISO ? '&piso=' + process.env.PISO : '') + '', browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 700 } }), errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.goto(base);
  let why = ''; try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.pois && WORLD.pois.length, null, { timeout: 60000 }) } catch (e) { why = 'não carregou' }
  rep(!why && !errs.length, 'cenário lego carrega sem erros', why || errs.slice(0, 2).join(' | '));
  if (why) { await browser.close(); srv.close(); process.exit(1) }
  await page.click('text=Continuar').catch(() => {}); await page.waitForTimeout(400);
  const list = await page.evaluate(() => {
    G.noclip = true; for (const g of WS.vm) g.visible = false; WS.vm.length = 0;
    const st = document.createElement('style'); st.textContent = 'body>*:not(canvas){visibility:hidden!important}'; document.head.appendChild(st);
    return WORLD.pois.map(p => { const l = p.lego; if (!l) return { id: p.id, type: p.type, bad: 'sem p.lego' };
      const H = LEGO_RECIPES[p.type][l.size].half;
      return { id: p.id, type: p.type, size: l.size, sk: l.skeleton, rot: l.rot, mir: l.mir, pieces: l.pieces, r: p.r, cx: p.cx, cz: p.cz, y: p.y, flag: !!p.flagMat, cols: p.cols ? p.cols.length : 0,
        bad: (Math.abs(l.house.x) <= H && Math.abs(l.house.z) <= H && Math.abs(l.gate.x) <= H + 0.1 && Math.abs(l.gate.z) <= H + 0.1) ? '' : 'âncora ou portão fora da área' } });
  });
  rep(list.length === 24, list.length + ' POIs no cenário (3 tipos x 2 tamanhos x 4 variações)');
  const bad = list.filter(i => i.bad || !i.flag || i.cols < 5); rep(!bad.length, 'todos montados com âncoras, bandeira e colisões', bad.slice(0, 3).map(b => b.type + ' ' + b.id + ' ' + (b.bad || 'sem bandeira/colisões')).join(' | '));
  const g = {}; list.forEach(i => { (g[i.type + '-' + i.size] = g[i.type + '-' + i.size] || []).push(i) });
  for (const k in g) rep(new Set(g[k].map(i => i.sk)).size >= 4, k + ': 4 variações com esqueletos diferentes', g[k].map(i => i.sk).join(', '));
  const L = [];
  for (const k in g) g[k].forEach((i, n) => L.push(Object.assign({ n: n + 1, key: k }, i)));
  if (FOTO) for (const i of L) {
    await page.evaluate(i => { P.x = i.cx + 0.5; P.z = i.cz + i.r + 1; P.y = i.y + 12 + i.r * 1.5; P.camY = P.y; P.yaw = 0; P.pitch = -1.0; P.vx = P.vz = P.vy = 0 }, i);
    await page.waitForTimeout(900);
    i.img = 'docs/img/lego/' + i.key + '-' + i.n + '.png'; await page.screenshot({ path: path.join(ROOT, i.img) });
  }
  await browser.close(); srv.close();
  const nm = { farm: 'Fazenda', mine: 'Mina', sawmill: 'Serraria' };
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>POIs lego (L2)</title>
<style>body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}h2{font-size:16px;margin-top:22px}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:450px;background:#2a303a;border-radius:6px;padding:8px}.c img{width:450px;display:block}.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2}</style></head><body>
<h1>POIs lego: fazenda, mina e serraria (L2)</h1>
<p>Cada fileira é a <b>mesma receita</b> (tipo e tamanho: M médio, P pequeno) em 4 variações: esqueleto, giro/espelho, peças e enfeites mudam. Abra o cenário super plano em
<a href="index.html?cenario=lego&auto=1&mute=1&seed=${SEED}">?cenario=lego</a> (tecla N liga o voo). Dados: <code>js/modifiers/lego-modifiers.js</code>; montador: <code>js/local/poilego.js</code>. Gerada por <code>cd tests &amp;&amp; node lego-galeria.js</code>.</p>` +
  Object.keys(g).map(k => `<h2>${nm[k.split('-')[0]]} ${k.split('-')[1] === 'M' ? 'média' : 'pequena'}</h2><div class="g">` + L.filter(i => i.key === k).map(i =>
    `<div class="c">${i.img ? `<img src="${i.img}">` : ''}<p>Variação ${i.n}<br><small>esqueleto <b>${i.sk}</b>, rotação ${i.rot}${i.mir ? ', espelhada' : ''}, raio ${i.r}<br>peças: ${i.pieces.join(', ')}</small></p></div>`).join('') + '</div>').join('') + '</body></html>\n';
  fs.writeFileSync(path.join(ROOT, 'cenarios-lego.html'), html); console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
})();
