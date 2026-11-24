'use strict';
// ---------- Galeria de cenários da composição do tile (4E; Node + Playwright, só para desenvolvimento) ----------
// Procura tiles que mostram cada situação (arquétipos, cidade deslocada ao máximo, vila no canto, fallbacks, batalhas), tira uma planta 2D de cada um
// (docs/img/tile-compose/*.png) e escreve cenarios-tiles.html na raiz. Uso: cd tests && node tile-cenarios.js
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), IMG = path.join(ROOT, 'docs/img/tile-compose');
fs.mkdirSync(IMG, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css' };
const srv = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/, '/index.html'));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) }) });
// Planta 2D (dentro da página): terreno, estradas, pegada da cidade, zonas de guerra, POIs (★ = principal; vermelho = guerra), acampamentos, grutas, bandos, baús, aberturas.
const DRAW = () => {
  const k = 1.5, cv = document.createElement('canvas'); cv.width = cv.height = W * k; const g = cv.getContext('2d');
  const H0 = WORLD.snap.H, T0 = WORLD.snap.T, B0 = WORLD.snap.B, pal = ['#68b043', '#468f30', '#e0cf90', '#f3f7fb', '#8c8c8c'];
  for (let z = 0; z < W; z++) for (let x = 0; x < W; x++) { const i = z * W + x; g.fillStyle = H0[i] < SEA ? '#2f63b8' : T0[i] === T_ROAD ? '#d8b060' : T0[i] === T_BRIDGE ? '#8a5a2a' : T0[i] === T_NAT ? pal[B0[i]] : '#b07050'; g.fillRect(x * k, z * k, k, k) }
  const circ = (x, z, r, col, dash) => { g.strokeStyle = col; g.setLineDash(dash || []); g.beginPath(); g.arc(x * k, z * k, r * k, 0, 6.283); g.stroke() };
  g.lineWidth = 2;
  const c0 = WORLD.cities[0]; if (c0.foot) { const N = 2 * c0.half + 1; for (let z = 0; z < N; z += 3) for (let x = 0; x < N; x += 3) if (c0.foot[z * N + x]) { g.fillStyle = 'rgba(255,80,80,.4)'; g.fillRect((c0.cx - c0.half + x) * k, (c0.cz - c0.half + z) * k, 3 * k, 3 * k) } }
  for (const z of WORLD.tileWar.zones) { circ(z.x, z.z, z.r, z.kind === 'anel' ? '#ff0' : '#f0f', [6, 4]); if (z.rIn) circ(z.x, z.z, z.rIn, '#ff0', [2, 6]) }
  g.font = 'bold 10px sans-serif';
  for (const p of WORLD.pois) { const r = POI_DEFS[p.type].r; g.setLineDash([]); g.strokeStyle = p.war ? '#f00' : '#000'; g.fillStyle = p.war ? 'rgba(255,0,0,.4)' : 'rgba(255,255,255,.45)';
    g.fillRect((p.cx - r) * k, (p.cz - r) * k, 2 * r * k, 2 * r * k); g.strokeRect((p.cx - r) * k, (p.cz - r) * k, 2 * r * k, 2 * r * k); g.fillStyle = '#000'; g.fillText((p.main ? '★' : '') + p.type, (p.cx - r) * k + 2, p.cz * k) }
  for (const c of WORLD.camps) circ(c.cx, c.cz, 10, '#f00'); for (const c of WORLD.caves) circ(c.cx, c.cz, 11, '#444'); for (const c of WORLD.packs) circ(c.cx, c.cz, 5, '#a0f');
  for (const c of WORLD.chests) { g.fillStyle = '#ff0'; g.fillRect(c.x * k - 2, c.z * k - 2, 4, 4) }
  for (const o of WORLD.win.openings) { g.fillStyle = '#0ff'; g.fillRect(o.x * k - 5, o.z * k - 5, 10, 10) }
  return cv.toDataURL('image/png');
};
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + srv.address().port + '/index.html?cenario=tile&auto=1&mute=1', browser = await chromium.launch();
  const open = async (qs) => { const p = await browser.newPage({ viewport: { width: 1000, height: 700 } }); await p.goto(base + '&' + qs);
    await p.waitForFunction(() => typeof WORLD !== 'undefined' && WORLD.tileCompose && G.running, null, { timeout: 40000 }); await p.waitForTimeout(400); return p };
  // 1) varre os tiles da semente/forma e acha exemplos (dentro da página, com o mesmo campo do jogo)
  const SCAN = (arq) => { const F = WORLD.win.F, out = {}, cand = { central: 'fazenda', deslocado: 'fazenda', estrada: 'fazenda', fundo: 'fazenda', encosta: 'mina', margem: 'serraria' };
    let bestCity = null, bestVila = null;
    for (let j = 0; j < WORLD_FIELD.tiles; j++) for (let i = 0; i < WORLD_FIELD.tiles; i++) {
      const n = wfNode(F, i, j), w = wfWindow(F, n.x, n.z, 384, { tile: true, ti: i, tj: j, neighbors: [], openings: [] }); w.openings = wfOpenings(F, w, i, j);
      const terr = tileTerrain(F, w, 32); if (!w.openings.length || terr.terra < 0.6) continue;
      for (const a of arq) { if (tileFit(cand[a], terr) < 0.6) continue; w.cityKind = null; w.tema = cand[a]; const pl = tileMainPlan(F, w, cand[a], {}); if (pl && pl.arq === a && !pl.caiu && (!out[a] || w.openings.length >= 2 && out[a][3] < 2)) out[a] = [i, j, cand[a], w.openings.length] }
      for (const [tema, half, kind] of [['cidade', 100, 'enorme'], ['vila', 55, 'vila']]) { const pl = tileMainPlan(F, w, tema, { half }); if (!pl) continue;
        const off = Math.hypot(pl.x - 192, pl.z - 192), edge = Math.min(pl.x, pl.z, 383 - pl.x, 383 - pl.z) - half;
        if (tema === 'cidade' && (!bestCity || off > bestCity[3])) bestCity = [i, j, tema, off, pl.arq];
        if (tema === 'vila' && (!bestVila || edge < bestVila[3])) bestVila = [i, j, tema, edge, pl.arq] }
    }
    return { out, bestCity, bestVila };
  };
  const ARQ = ['central', 'deslocado', 'estrada', 'fundo', 'encosta', 'margem'], sc = { out: {}, bestCity: null, bestVila: null };
  for (const sd of [11, 3, 5, 7, 13, 21, 42]) {   // cada arquétipo usa a primeira semente que tem um tile adequado ao tema (fit >= 0.6)
    const p0 = await open('seed=' + sd + '&forma=pangeia&tema=fazenda'), r = await p0.evaluate(SCAN, ARQ.filter(a => !sc.out[a])); await p0.close();
    for (const a in r.out) sc.out[a] = r.out[a].concat(sd);
    if (!sc.bestCity && r.bestCity) sc.bestCity = r.bestCity.concat(sd); if (!sc.bestVila && r.bestVila) sc.bestVila = r.bestVila.concat(sd);
  }
  const P = 'seed=11&forma=pangeia';
  const L = [];
  const NOME = { central: 'Principal central', deslocado: 'Principal deslocado', estrada: 'Principal na beira da estrada', fundo: 'Principal no fundo (oposto à entrada)', encosta: 'Mina na encosta (ponto alto)', margem: 'Serraria na margem (borda da floresta/água)' };
  for (const a of Object.keys(NOME)) if (sc.out[a]) L.push({ g: 'Arquétipos de posição do principal', t: NOME[a], qs: `seed=${sc.out[a][4]}&forma=pangeia&ti=${sc.out[a][0]}&tj=${sc.out[a][1]}&tema=${sc.out[a][2]}` });
  if (sc.bestCity) L.push({ g: 'Ajustes: cidade e vila', t: `Cidade enorme deslocada ao máximo (${Math.round(sc.bestCity[3])} blocos do centro, arquétipo ${sc.bestCity[4]})`, qs: `seed=${sc.bestCity[5]}&forma=pangeia&ti=${sc.bestCity[0]}&tj=${sc.bestCity[1]}&tema=cidade` });
  if (sc.bestVila) L.push({ g: 'Ajustes: cidade e vila', t: `Vila mais perto da borda (arquétipo ${sc.bestVila[4]}): menos espaço para POIs e ambiente`, qs: `seed=${sc.bestVila[5]}&forma=pangeia&ti=${sc.bestVila[0]}&tj=${sc.bestVila[1]}&tema=vila` });
  L.push({ g: 'Ajustes: cidade e vila', t: 'Cidade em tile apertado (semente 5): acampamento e baús sem lugar (veja "Sem lugar" no painel)', qs: 'seed=5&tema=cidade' });
  L.push({ g: 'Ajustes: cidade e vila', t: 'Vila no canto, estrada curta: POIs de estrada caem em qualquer lugar (semente 11)', qs: 'seed=11&tema=vila' });
  L.push({ g: 'Substitutos e fallbacks', t: 'Ruínas: a vila em escombros não cabe e entra "ruínas antigas" (semente 5)', qs: 'seed=5&tema=ruinas' });
  L.push({ g: 'Substitutos e fallbacks', t: 'Ponte sem ponte no tile: o principal vira entreposto (semente 11)', qs: 'seed=11&tema=ponte' });
  L.push({ g: 'Substitutos e fallbacks', t: 'Mina: "vila de trabalhadores" entra como alojamento (pendente no painel)', qs: 'seed=11&tema=mina' });
  L.push({ g: 'Substitutos e fallbacks', t: 'Fazenda: "plantação" entra como fazenda (pendente no painel)', qs: 'seed=11&tema=fazenda' });
  L.push({ g: 'Substitutos e fallbacks', t: 'Passagem: sem principal, só ambiente e baús', qs: 'seed=11&tema=passagem' });
  const B = await (async () => { const p = await open(`seed=42&forma=pangeia&tema=fazenda`);
    const r = await p.evaluate(() => { const F = WORLD.win.F, out = {}; for (let j = 0; j < WORLD_FIELD.tiles; j++) for (let i = 0; i < WORLD_FIELD.tiles; i++) { const n = wfNode(F, i, j), w = wfWindow(F, n.x, n.z, 384, { tile: true, ti: i, tj: j, neighbors: [], openings: [] }); w.openings = wfOpenings(F, w, i, j); const k = w.openings.length; if (k && tileTerrain(F, w, 32).terra > 0.5 && (!out[k] || tileTerrain(F, w, 32).terra > out[k][3])) out[k] = [i, j, w.openings.map(o => o.dir), tileTerrain(F, w, 32).terra] } return out }); await p.close(); return r })();
  for (const k of [1, 2, 4]) if (B[k]) for (const tipo of ['conquista', 'defesa', 'choque']) {
    if (tipo === 'choque' && k === 1) continue;
    const d = B[k][2]; L.push({ g: 'Batalhas (POIs de guerra de teste)', t: `${tipo[0].toUpperCase() + tipo.slice(1)} em tile de ${k} abertura(s)`, qs: `seed=42&forma=pangeia&ti=${B[k][0]}&tj=${B[k][1]}&tema=fazenda&batalha=${tipo}&entrada=${d[0]}` + (tipo === 'choque' ? `&entrada2=${d[1]}` : '') });
  }
  // 2) planta de cada cenário
  for (let n = 0; n < L.length; n++) {
    const p = await open(L[n].qs), errs = []; p.on('pageerror', e => errs.push(e.message));
    L[n].img = 'docs/img/tile-compose/c' + String(n + 1).padStart(2, '0') + '.png';
    fs.writeFileSync(path.join(ROOT, L[n].img), Buffer.from((await p.evaluate(DRAW)).split(',')[1], 'base64'));
    L[n].info = await p.evaluate(() => { const t = WORLD.tileCompose; return (t.principal ? t.principal.type : 'sem principal') + (t.arq ? ' (' + t.arq + ')' : '') + ' • ' + t.pois + ' POIs, ' + t.camps + ' acamp., ' + t.caves + ' grutas, ' + t.packs + ' bandos, ' + t.chests + ' baús' + (t.falhas.length ? ' • sem lugar: ' + t.falhas.join(', ') : '') + (t.pend.length ? ' • pendente: ' + t.pend.join(', ') : '') });
    await p.close(); console.log(n + 1, L[n].t, '|', L[n].info);
  }
  await browser.close(); srv.close();
  const groups = [...new Set(L.map(l => l.g))];
  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Cenários da composição do tile (sessão 4E)</title>
<style>
body{font-family:sans-serif;background:#1d2128;color:#e8e8e8;margin:20px}h1{font-size:20px}h2{font-size:16px;margin-top:26px;color:#ffd24a}p{max-width:960px;color:#b8c0cc}
.g{display:flex;flex-wrap:wrap;gap:14px}.c{width:384px;background:#2a303a;border-radius:6px;padding:8px}
.c img{width:384px;height:384px;image-rendering:pixelated;display:block}.c a{color:#ffd24a;font-weight:bold}.c small{color:#9aa4b2;word-break:break-all}
</style></head><body>
<h1>Cenários da composição do tile (sessão 4E)</h1>
<p>Cada cartão abre o jogo (precisa de servidor estático: <code>python -m http.server 8123</code> e abrir <code>http://localhost:8123/cenarios-tiles.html</code>) num tile de 384 já composto.
Legenda da planta: <b>★</b> POI principal; caixas brancas = POIs; caixas vermelhas = POIs de guerra de teste; círculo vermelho = acampamento; cinza = gruta; roxo = bando; ponto amarelo = baú;
quadrado ciano = abertura; tracejado magenta = zona de guerra (abertura/praça); tracejado amarelo = anel em volta do principal; contorno vermelho = pegada da cidade/vila; linha laranja = estrada.
Na pausa (Tab) -> aba <b>Facções</b> há o resumo da composição e atalhos de batalha. Tecla <b>N</b> liga o voo (noclip). Parâmetros: <code>tema</code>, <code>seed</code>, <code>forma</code>, <code>ti</code>/<code>tj</code>,
<code>batalha</code> (conquista, defesa, choque), <code>entrada</code>/<code>entrada2</code> (N, S, E, W), <code>compor=0</code> (tile vazio), <code>dono=player</code>. Gerada por <code>cd tests &amp;&amp; node tile-cenarios.js</code>.</p>
` + groups.map(gr => `<h2>${gr}</h2><div class="g">` + L.filter(l => l.g === gr).map(l => { const u = 'index.html?cenario=tile&auto=1&mute=1&' + l.qs;
    return `<div class="c"><img src="${l.img}"><p><a href="${u}">${l.t}</a><br><small>${l.info}</small><br><small>${u.replace('index.html', '')}</small></p></div>` }).join('') + '</div>').join('\n') + '\n</body></html>\n';
  fs.writeFileSync(path.join(ROOT, 'cenarios-tiles.html'), html); console.log('\ncenarios-tiles.html escrito com', L.length, 'cenários');
})();
