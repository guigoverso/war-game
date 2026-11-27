'use strict';
// ---------- Galeria dos cenários do mundo novo (como cenarios-pois.html; Node + Playwright, só para desenvolvimento) ----------
// Gera cenarios-mundo.html na raiz com um cartão por cenário de MUNDO_SCN (js/ui/mundoscn.js): link para abrir o cenário no jogo (?mundo=1&auto=1&mute=1&seed=11&...) e
// duas fotos (o mapa mundi com o encontro e a batalha/tela de morte já no tile; docs/img/cenarios-mundo/). Cenário novo = linha nova em MUNDO_SCN, e rodar de novo.
// Uso: cd tests && node cenarios-mundo.js [nofoto] [id...]  (demora: cada cenário carrega o mundo e, se há luta, recarrega o tile)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), IMG = path.join(ROOT, 'docs/img/cenarios-mundo'), args = process.argv.slice(2), FOTO = !args.includes('nofoto'), ONLY = args.filter(a => a !== 'nofoto');
fs.mkdirSync(IMG, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = 240000;
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html', browser = await chromium.launch(), errs = [];
  const open = async q => {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    page.on('pageerror', e => errs.push(q + ': ' + e.message));
    await page.goto(base + '?' + q);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && (WM.open || wtX().inTile !== null), null, { timeout: T });
    await page.waitForTimeout(2500); return page;
  };
  const first = await open('mundo=1&auto=1&mute=1&seed=11&explorar=1'); const list = await first.evaluate(() => ({ list: MUNDO_SCN, base: MUNDO_SCN_BASE })); await first.close();
  const cards = [];
  for (const s of list.list) {
    const card = { s, imgs: [] }, url = list.base + s.q; cards.push(card);
    if (!FOTO || (ONLY.length && !ONLY.includes(s.id))) { for (const n of [1, 2]) { const f = 'docs/img/cenarios-mundo/' + s.id + '-' + n + '.png'; if (fs.existsSync(path.join(ROOT, f))) card.imgs.push(f) } continue }   // pulado: mantém as fotos que já existem
    try {
      const page = await open(url), shot = async n => { const f = 'docs/img/cenarios-mundo/' + s.id + '-' + n + '.png'; await page.screenshot({ path: path.join(ROOT, f) }); card.imgs.push(f) };
      if (await page.evaluate(() => WM.open)) {   // mapa mundi com o encontro
        await shot(1);
        if (await page.evaluate(() => !!WM.turnEl.querySelector('[data-a=fight]'))) {
          await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
          await page.waitForFunction(() => typeof BATTLE !== 'undefined' && BATTLE.on && BATTLE.real, null, { timeout: T });
          await page.waitForTimeout(/morte/.test(s.id) ? 1000 : 6000);
        }
      }
      await page.evaluate(() => { if (G.panel) closePanel() });   // a pausa de "mundo pronto" (cenário já dentro do tile) deixaria o relógio da morte parado
      if (/morte/.test(s.id)) await page.waitForSelector('#tbgo', { timeout: 90000 });
      await shot(card.imgs.length + 1); await page.close();
    } catch (e) { errs.push(s.id + ': ' + e.message.split('\n')[0]) }
    console.log('cenário ' + s.id + ': ' + card.imgs.length + ' foto(s)');
  }
  await browser.close(); srv.close();
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Cenários do mundo novo</title>
<style>
body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}h2{font-size:16px;margin-top:26px;color:#ffd24a}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:560px;background:#2a303a;border-radius:6px;padding:8px}
.c img{width:272px;display:inline-block;margin-right:6px}.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2;word-break:break-all}
</style></head><body>
<h1>Cenários do mundo novo (?mundo=1)</h1>
<p>Cada cartão abre o jogo já no estado a testar (precisa de servidor estático: <code>python -m http.server 8123</code> e abrir <code>http://localhost:8123/cenarios-mundo.html</code>). Todos têm o modo criativo ligado
(<code>auto=1</code>); os de morte usam <code>mortal=1</code> (sem o modo deus). O encontro aparece no mapa mundi: clique em <b>⚔ Lutar</b> (o tile abre, a página recarrega). Parâmetros soltos:
<code>enc=campo|defesa|invasao</code>, <code>soldados=N</code>, <code>soldados2=N</code>, <code>inim=N</code>, <code>mix=1</code>, <code>explorar=1</code>, <code>mortal=1</code>, <code>morrer=S</code> (ver o comentário de <code>js/ui/mundoscn.js</code>).
Gerada por <code>cd tests &amp;&amp; node cenarios-mundo.js</code>.</p>
<h2>Etapa 8.3: encontro vira batalha no tile, soma de batalhões e morte</h2><div class="g">${cards.map(c => `<div class="c">${c.imgs.map(i => `<img src="${i}">`).join('')}<p><a href="index.html?${list.base + c.s.q}">${esc(c.s.t)}</a><br>${esc(c.s.d)}<br><small>?${list.base + c.s.q}</small></p></div>`).join('')}</div></body></html>
`;
  fs.writeFileSync(path.join(ROOT, 'cenarios-mundo.html'), html);
  console.log(errs.length ? 'AVISOS:\n' + errs.join('\n') : 'ok'); console.log('gerado cenarios-mundo.html');
})();
