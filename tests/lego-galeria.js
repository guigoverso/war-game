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
    return WORLD.pois.map(p => { const l = p.recipe; if (!l) return { id: p.id, type: p.type, bad: 'sem p.recipe' };
      const H = LEGO_RECIPES[p.type][l.size].half, a = l.anchors, A = [a.house, a.gate, a.door], ab = (o, m) => Math.abs(o) <= m;
      const reach = [a.door, a.gate].every(q => legoReach(p, p.cx + q.x, p.cz + q.z));   // a porta da âncora e o portão são alcançáveis a pé de fora do portão
      return { id: p.id, type: p.type, size: l.size, sk: l.skeleton, rot: l.rot, mir: l.mir, pieces: l.pieces, r: p.r, cx: p.cx, cz: p.cz, y: p.y, flag: !!p.flagMat, cols: p.cols ? p.cols.length : 0, reach,
        bad: A.every(q => ab(q.x, H + 0.8) && ab(q.z, H + 0.8)) ? '' : 'âncora ou portão fora da área' } });
  });
  rep(list.length === 24, list.length + ' POIs no cenário (3 tipos x 2 tamanhos x 4 variações)');
  const nr = list.filter(i => !i.reach); rep(!nr.length, 'portão e porta da âncora alcançáveis a pé (nav)', nr.slice(0, 4).map(i => i.type + ' ' + i.id + ' ' + i.sk).join(' | '));
  const bad = list.filter(i => i.bad || !i.flag || i.cols < 5); rep(!bad.length, 'todos montados com âncoras, bandeira e colisões', bad.slice(0, 3).map(b => b.type + ' ' + b.id + ' ' + (b.bad || 'sem bandeira/colisões')).join(' | '));
  const un = await page.evaluate(() => {   // poiAnchorsXf: gira as âncoras já em coordenadas do mapa igual ao caminho relativo (legoBuild); yaw acompanha; receita refaz o mesmo POI
    const errs = [], near = (a, b) => Math.abs(a - b) < 1e-6, A = { bed: { x: 3, z: -2, y: 1.5 }, tavern: { x: -4, z: 5 }, svcSpec: [{ kind: 'smith', x: 6, z: 1, yaw: Math.PI }, { kind: 'inn', x: -2, z: -5, yaw: 0.7 }], keepers: [{ x: 1, z: 2, yaw: 0 }], beds: [{ x: 2, z: 2, y: 0.5 }] };
    for (let k = 0; k < 4; k++) for (const mir of [false, true]) {
      const f = legoXf(k, mir), p = { cx: 300, cz: 200, y: 20 }, rel = poiAnchorsMap(A, (x, z) => { const q = f(x, z); return [p.cx + q[0], p.cz + q[1]] }, f, p.y);
      for (const n of LEGO_ANCH_PT.concat(LEGO_ANCH_LIST)) if (A[n]) p[n] = JSON.parse(JSON.stringify(A[n]), (kk, v) => v);
      const abs = poiAnchorsMap(p, (x, z) => [x + 300, z + 200], (a, b) => [a, b], p.y); for (const n of Object.keys(abs)) p[n] = abs[n];   // vira coordenadas do mapa (y absoluto)
      poiAnchorsXf(p, k, mir);
      const cmp = (a, b, tag) => { if (!near(a.x, b.x) || !near(a.z, b.z) || (a.y !== undefined && !near(a.y, b.y))) errs.push(tag + ' ponto'); if (a.yaw !== undefined && !near(Math.cos(a.yaw - b.yaw), 1)) errs.push(tag + ' yaw') };
      cmp(p.bed, rel.bed, 'k' + k + (mir ? 'm' : '') + ' bed'); cmp(p.tavern, rel.tavern, 'tavern'); p.svcSpec.forEach((q, i) => cmp(q, rel.svcSpec[i], 'svc' + i)); cmp(p.keepers[0], rel.keepers[0], 'keeper'); cmp(p.beds[0], rel.beds[0], 'beds');
      const v = f(0, -1), q = rel.keepers[0]; if (!near(-Math.sin(q.yaw), v[0]) || !near(-Math.cos(q.yaw), v[1])) errs.push('k' + k + ' yaw não segue o giro');
    }
    const p0 = WORLD.pois.find(q => q.type === 'mine' && q.recipe.skeleton === 'boca-lateral' && q.recipe.size === 'M'), q = Object.assign({}, p0, { id: p0.id }); delete q.legoSk; delete q.legoFace; delete q.legoSize; q.recipe = JSON.parse(JSON.stringify(p0.recipe));
    poiBuild(q); const same = JSON.stringify(q.recipe) === JSON.stringify(p0.recipe) && q.cols.length === p0.cols.length; for (const o of q.sceneObjs) scene.remove(o);
    {const d = p0.recipe.anchors.door, bx = Math.floor(p0.cx + d.x), bz = Math.floor(p0.cz + d.z), sv = [];   // controle: com a porta emparedada por 5x5 células, legoReach tem de dar falso
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) { const k = (bz + dz) * W + bx + dx; sv.push([k, NAV.blocked[k]]); NAV.blocked[k] = 1 }
      const walled = legoReach(p0, p0.cx + d.x, p0.cz + d.z); for (const [k, v] of sv) NAV.blocked[k] = v; if (walled || !legoReach(p0, p0.cx + d.x, p0.cz + d.z)) errs.push('legoReach não distingue porta emparedada') }
    return { errs, same, n: p0.cols.length };
  });
  rep(!un.errs.length, 'poiAnchorsXf: âncoras giram/espelham como o desenho (pontos, y e yaw)', un.errs.slice(0, 3).join(' | '));
  rep(un.same, 'p.recipe refaz o mesmo POI (peças e colisões iguais, sem legoSk/legoFace)', 'colisões ' + un.n);
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
