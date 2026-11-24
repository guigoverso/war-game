'use strict';
// ---------- Teste da frente e da trilha dos POIs de estrada (L1b; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=tile em vários temas e sementes e confere nos POIs de LEGO_FACE_TYPES (taverna, entreposto, pousada, alojamento): a frente olha para a estrada (o portão está mais perto
// dela que o centro), a trilha liga o portão a uma estrada (flood-fill sobre T_ROAD), nada bloqueia a porta (nav), as âncoras giraram junto (dentro do raio e alcançáveis) e o entreposto
// nunca nasce fora da estrada. Uso: cd tests && node tile-face.js [sementes separadas por vírgula] ; FOTO=1 guarda uma foto de cada POI girado em tests/tile-face-out.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), seeds = (process.argv[2] || '11,12,13').split(',');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const serve = () => new Promise(r => { const s = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) }); s.listen(0, '127.0.0.1', () => r(s)) });
let fails = 0; const rep = (ok, n, w) => { if (!ok) fails++; console.log((ok ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
const THEMES = ['fazenda', 'mina', 'serraria', 'animais', 'passagem', 'ruinas', 'fortaleza'];
// Roda na página: uma linha por POI virado.
const MEASURE = () => {
  const out = [], near = (x, z) => { let b = 1e9; for (let dz = -60; dz <= 60; dz += 2) for (let dx = -60; dx <= 60; dx += 2) { const i = ((z | 0) + dz) * W + (x | 0) + dx; if (i >= 0 && i < W * W && (T[i] === T_ROAD || T[i] === T_BRIDGE)) b = Math.min(b, Math.hypot(dx, dz)) } return b };
  for (const p of WORLD.pois) {
    if (p.legoFace === undefined) continue;
    const g = legoGateRel(p), r = poiR(p), o = { type: p.type, x: p.cx, z: p.cz, r, face: p.legoFace, off: !!p.offRoad, trail: p.trail, main: !!p.main, bad: [] };
    if (!g) { o.bad.push('sem portão'); out.push(o); continue }
    const gx = p.cx + g.x * (r + 3) / Math.hypot(g.x, g.z), gz = p.cz + g.z * (r + 3) / Math.hypot(g.x, g.z);
    o.dGate = near(gx, gz); o.dCenter = near(p.cx, p.cz);
    // flood-fill de estrada: do portão (fora) até ao menos trail.n blocos de distância do centro, e até a estrada de antes (to)
    if (p.trail && p.trail.ok && !p.trail.near) {
      const seen = new Set(), st = [[Math.round(gx), Math.round(gz)]]; let hit = false;
      const road = (x, z) => { const i = z * W + x; return T[i] === T_ROAD || T[i] === T_BRIDGE };
      let s0 = null; for (let d = 0; d <= 4 && !s0; d++) for (let dz = -d; dz <= d && !s0; dz++) for (let dx = -d; dx <= d; dx++) if (road(Math.round(gx) + dx, Math.round(gz) + dz)) { s0 = [Math.round(gx) + dx, Math.round(gz) + dz]; break }
      if (s0) { st.length = 0; st.push(s0); seen.add(s0.join(',')) }
      while (st.length && s0) { const [x, z] = st.pop(); if (Math.hypot(x - p.trail.to[0], z - p.trail.to[1]) <= 3) { hit = true; break }
        for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, nz = z + dz, k = nx + ',' + nz; if (!seen.has(k) && road(nx, nz)) { seen.add(k); st.push([nx, nz]) } } }
      o.linked = hit;
    }
    // âncoras dentro do raio e alcançáveis a pé (nav), partindo de fora do portão
    const A = [].concat(p.bed || [], p.tavern || [], p.stove || [], (p.keepers || []), (p.svcSpec || []));
    o.anch = A.length;
    for (const a of A) { if (Math.hypot(a.x - p.cx, a.z - p.cz) > r + 1) o.bad.push('âncora fora do raio'); }
    if (typeof navFree === 'function') { const sx = Math.floor(p.cx + g.x + g.x / Math.hypot(g.x, g.z) * 2), sz = Math.floor(p.cz + g.z + g.z / Math.hypot(g.x, g.z) * 2); o.gateFree = navFree(sx + 0.5, sz + 0.5) }
    out.push(o);
  }
  return out;
};
(async () => {
  const srv = await serve(), base = 'http://127.0.0.1:' + srv.address().port, browser = await chromium.launch(), all = [];
  for (const sd of seeds) for (const tema of THEMES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
    await page.goto(base + '/index.html?cenario=tile&auto=1&mute=1&seed=' + sd + '&tema=' + tema + (process.env.LEGO ? '&lego=1' : ''));
    let why = ''; try { await page.waitForFunction(() => typeof G !== 'undefined' && G.running && typeof WORLD !== 'undefined' && WORLD.win && WORLD.tileCompose, null, { timeout: 40000 }) } catch (e) { why = 'não carregou: ' + errs.slice(0, 3).join(' | ') }
    rep(!why && !errs.length, 'semente ' + sd + ' ' + tema + ': carrega sem erros', why || errs.slice(0, 2).join(' | '));
    if (!why) { await page.waitForTimeout(600); const r = await page.evaluate(MEASURE); for (const o of r) { o.sd = sd; o.tema = tema; all.push(o) } }
    await page.close();
  }
  await browser.close(); srv.close();
  const tag = o => o.type + ' s' + o.sd + ' ' + o.tema + ' (' + o.x + ',' + o.z + ')';
  console.log('POIs virados: ' + all.length + ' (' + Object.entries(all.reduce((m, o) => (m[o.type] = (m[o.type] || 0) + 1, m), {})).map(e => e.join(' ')).join(', ') + ')');
  rep(all.length >= 4, 'há POIs virados para testar', all.length + ' nas amostras');
  for (const o of all) {
    if (o.bad.length) rep(false, tag(o), o.bad.join('; '));
    else if (o.trail && !o.trail.ok) rep(false, tag(o) + ': trilha impossível', JSON.stringify(o.trail));   // (a trilha é opcional no tile, mas o portão não pode ficar longe da estrada)
    else if (o.dGate >= o.dCenter && o.dCenter > 6) rep(false, tag(o) + ': frente não olha para a estrada', 'portão ' + o.dGate.toFixed(0) + ' centro ' + o.dCenter.toFixed(0));
    else if (o.trail && o.trail.ok && !o.trail.near && !o.linked) rep(false, tag(o) + ': trilha não liga à estrada');
    else if (o.gateFree === false) rep(false, tag(o) + ': portão bloqueado na nav');
  }
  const off = all.filter(o => o.off), post = all.filter(o => o.type === 'post');
  rep(!all.some(o => o.type === 'post' && o.off), 'entreposto nunca fora da estrada', post.length + ' entrepostos, ' + off.length + ' POIs fora da estrada de ' + all.length);
  rep(off.every(o => o.trail && o.trail.ok && !o.trail.near), 'todo POI fora da estrada tem trilha', off.length + ' casos');
  console.log(fails ? '\n' + fails + ' FALHA(S)' : '\nTudo OK');
  process.exit(fails ? 1 : 0);
})();
