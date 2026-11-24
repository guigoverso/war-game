'use strict';
// ---------- Teste dos POIs lego do L3.5 (docs/features/11_pois-procedurais-lego.md, seção 7h; Node + Playwright, só para desenvolvimento) ----------
// Para cada um dos 11 tipos novos abre ?cenario=lego&tipo=<tipo> (4 variações em cada tamanho, M e P) e confere: carga sem erros, 8 POIs com p.recipe e 4 esqueletos diferentes por tamanho,
// malha e colisões, bandeira (menos as ruínas), âncoras funcionais dentro do raio e alcançáveis a pé (nav), porta e portão alcançáveis, âncoras certas por tipo (serviço, cama, vigia,
// fogueira, baú) e que p.recipe refaz o mesmo POI. Âncora alcançável = a nav chega a 2 blocos dela, ou ela está dentro de um prédio (a nav bloqueia o interior) a até 10 blocos da porta, que é alcançável. Sem fotos (o visual é conferido no jogo). Uso: cd tests && node lego-l35.js [semente=11] [tipo]
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), SEED = +(process.argv[2] || 11), ONLY = process.argv[3];
const TYPES = ['hunters', 'sanctuary', 'ruins', 'fort', 'tower', 'inn', 'lodge', 'post', 'plantation', 'fishery', 'workers'];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
// o que cada tipo tem de gravar em p (âncoras funcionais)
const WANT = { hunters: ['firePos', 'chestPos'], tower: ['vigilPos', 'binoc'], inn: ['bed', 'svcSpec:inn'], lodge: ['bed', 'firePos', 'svcSpec:inn'], post: ['svcSpec:shop'], ruins: ['chest'] };
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?cenario=lego&auto=1&mute=1&seed=' + SEED, browser = await chromium.launch();
  for (const type of TYPES.filter(t => !ONLY || t === ONLY)) {
    const page = await browser.newPage({ viewport: { width: 700, height: 500 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    await page.goto(base + '&tipo=' + type); let why = '';
    try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && WORLD.pois && WORLD.pois.length, null, { timeout: 90000 }) } catch (e) { why = 'não carregou' }
    rep(!why && !errs.length, type + ': cenário carrega sem erros', why || errs.slice(0, 2).join(' | '));
    if (why) { await page.close(); continue }
    const out = await page.evaluate(() => {
      const near = (p, q) => Math.hypot(q.x - p.cx, q.z - p.cz) <= p.r + 1;
      return WORLD.pois.map(p => { const l = p.recipe, o = { id: p.id, type: p.type, size: l && l.size, sk: l && l.skeleton, r: p.r, bad: [], cols: p.cols ? p.cols.length : 0, flag: !!p.flagMat, pieces: l && l.pieces };
        if (!l) { o.bad.push('sem p.recipe'); return o }
        const a = l.anchors; o.reach = [a.door, a.gate].every(q => legoReach(p, p.cx + q.x, p.cz + q.z)); if (!o.reach) o.bad.push('porta/portão inalcançável');
        const pts = []; for (const k of ['bed', 'vigilPos', 'firePos', 'chestPos', 'chest']) if (p[k]) pts.push([k, p[k].x !== undefined ? p[k] : { x: p[k].x, z: p[k].z }]);
        if (p.chest) { pts.pop(); pts.push(['chest', { x: p.chest.x !== undefined ? p.chest.x : p.chest.g ? p.chest.g.position.x : p.cx, z: p.chest.z !== undefined ? p.chest.z : p.chest.g ? p.chest.g.position.z : p.cz }]) }
        for (const s of p.svcSpec || []) pts.push(['svc:' + s.kind, s]); for (const s of p.beds || []) pts.push(['leito', s]);
        o.anch = pts.map(q => q[0]);
        const dp = { x: p.cx + a.door.x, z: p.cz + a.door.z };   // a nav bloqueia o interior das casas: âncora dentro de um prédio vale se a porta é alcançável e ela está a até 10 blocos dela
        for (const [k, q] of pts) { if (!near(p, q)) o.bad.push(k + ' fora do raio'); if (k !== 'chest' && !legoReach(p, q.x, q.z) && Math.hypot(q.x - dp.x, q.z - dp.z) > 10) o.bad.push(k + ' inalcançável') }
        if (p.binoc) { o.anch.push('binoc'); if (!near(p, p.binoc)) o.bad.push('binoc fora do raio') }
        return o });
    });
    rep(out.length === 8, type + ': 8 POIs (4 variações em M e em P)', out.length + '');
    for (const sz of ['M', 'P']) { const g = out.filter(o => o.size === sz); rep(new Set(g.map(o => o.sk)).size >= 4, type + '/' + sz + ': 4 esqueletos diferentes', g.map(o => o.sk).join(', ')) }
    const bad = out.filter(o => o.bad.length || o.cols < 3 || (type !== 'ruins' && !o.flag));
    rep(!bad.length, type + ': todos montados (malha, colisões, bandeira), âncoras dentro do raio e alcançáveis', bad.slice(0, 4).map(o => o.size + ' ' + o.sk + ' [' + o.bad.join(', ') + (o.cols < 3 ? ' sem colisões' : '') + (!o.flag && type !== 'ruins' ? ' sem bandeira' : '') + ']').join(' | '));
    for (const w of WANT[type] || []) { const miss = out.filter(o => !o.anch || !o.anch.some(a => a === w || (w.startsWith('svcSpec:') && a === 'svc:' + w.split(':')[1]))); rep(!miss.length, type + ': âncora ' + w + ' em todos', miss.slice(0, 3).map(o => o.size + ' ' + o.sk).join(' | ')) }
    const same = await page.evaluate(() => {   // p.recipe refaz o mesmo POI (peças e colisões iguais), sem legoSk/legoFace/legoSize
      const p0 = WORLD.pois[0], q = Object.assign({}, p0); delete q.legoSk; delete q.legoFace; delete q.legoSize; q.recipe = JSON.parse(JSON.stringify(p0.recipe)); delete q.chest;
      poiBuild(q); const ok = JSON.stringify(q.recipe) === JSON.stringify(p0.recipe) && q.cols.length === p0.cols.length; for (const o of q.sceneObjs) scene.remove(o); return ok });
    rep(same, type + ': p.recipe refaz o mesmo POI');
    await page.close();
  }
  await browser.close(); srv.close(); console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
})();
