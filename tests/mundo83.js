'use strict';
// Verificação da 8.3 (encontro vira batalha no tile e morte) no navegador: cd tests && node mundo83.js [cenário...]  (cenários de MUNDO_SCN em js/ui/mundoscn.js)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) });
});
let fails = 0; const ok = (c, n, w) => { if (!c) fails++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
const only = process.argv.slice(2);
const T = 240000;
srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port, br = await chromium.launch(), errs = [];
  const open = async q => {
    const page = await br.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errs.push(q + ': ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()) });
    await page.goto(base + '/index.html?mundo=1&auto=1&mute=1&seed=11&' + q);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && (WM.open || wtX().inTile !== null), null, { timeout: T });
    await page.waitForTimeout(1500); return page;
  };
  const inBattle = page => page.waitForFunction(() => typeof BATTLE !== 'undefined' && BATTLE.on && BATTLE.real && !BATTLE.over && ALLIES.length > 0, null, { timeout: T }).then(() => page.waitForTimeout(1500));
  const want = id => !only.length || only.includes(id);

  if (want('campo')) {   // encontro no campo: tile vizinho (recarrega a página), Choque, vitória, sair
    const page = await open('enc=campo&soldados=10&inim=6&mix=1');
    const a = await page.evaluate(() => ({ enc: wtX().enc, hud: WM.turnEl.innerText, btn: [...WM.turnEl.querySelectorAll('button')].map(b => b.dataset.a) }));
    ok(a.enc && a.enc.layout === 'campo' && a.btn.includes('fight') && a.btn.includes('auto'), 'campo: encontro no mapa mundi com os botões Lutar e (criativo) por número', JSON.stringify(a.btn));
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    const b = await page.evaluate(() => ({ mode: BATTLE.mode, tile: WORLD.win.node, enc: wtX().enc && wtX().enc.tile, inTile: wtX().inTile, allies: ALLIES.filter(x => x.alive).length, kinds: ALLIES.map(x => x.kindT),
      en: BATTLE.total0, gens: BATTLE.gens.length, p: { x: P.x | 0, z: P.z | 0 }, W, mapOpen: WM.open, dry: tH(P.x, P.z) > SEA }));
    ok(b.mode === 'choque' && b.tile === b.enc && b.inTile === b.enc && b.allies === 10 && b.en === 6 && !b.mapOpen && b.dry, 'campo: o tile do encontro abre e o Choque começa com os 10 soldados em campo e 6 inimigos', JSON.stringify(b));
    ok(b.gens === 3 && b.kinds.length === b.allies, 'campo: sem reserva não há postos seus (só os 3 do inimigo)', JSON.stringify(b.gens));
    await page.evaluate(() => { for (const e of ENEMIES) if (e.btl) e.hp = 0; });   // elimina os bandidos que já nasceram e as reservas
    await page.evaluate(() => { for (const g of BATTLE.gens) if (g.side === 'enemy') g.reserve = 0; for (const e of BATTLE.area.enemies) if (e.alive) { e.alive = false; e.gone = true; BATTLE.area.aliveEnemies-- } });
    await page.waitForFunction(() => BATTLE.over && wtX().enc === null, null, { timeout: 60000 });
    const c = await page.evaluate(() => ({ enc: wtX().enc, actors: wtX().actors.length, inTile: wtX().inTile, left: wtX().left, bat: batTotal(wtActive()), can: mundoCanLeave() }));
    ok(c.enc === null && c.actors === 0 && c.inTile !== null && c.can, 'campo: vitória; o bando some, o comandante continua no tile e pode sair', JSON.stringify(c));
    await page.evaluate(() => mundoLeaveTile()); await page.waitForTimeout(1200);
    const d = await page.evaluate(() => ({ open: WM.open, inTile: wtX().inTile, bats: batList('player').length, over: BATTLE.on }));
    ok(d.open && d.inTile === null && d.bats === 1 && !d.over, 'campo: sair do tile volta ao mapa mundi e limpa a batalha', JSON.stringify(d));
    await page.close();
  }
  if (want('defesa')) {
    const page = await open('enc=defesa&soldados=20&inim=8&mix=1');
    ok(await page.evaluate(() => wtX().enc && wtX().enc.layout === 'defesa'), 'defesa: encontro na capital');
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    const b = await page.evaluate(() => ({ mode: BATTLE.mode, lim: !!BATTLE.limit, R: BATTLE.centerR | 0, d: Math.hypot(P.x - BATTLE.center.x, P.z - BATTLE.center.z) | 0, en: BATTLE.total0, allies: ALLIES.filter(x => x.alive).length, res: BATTLE.ally.reserve }));
    ok(b.mode === 'defesa' && b.lim && b.en === 8 && b.allies === 10 && b.res + b.allies === 20 && b.R < 95, 'defesa: raio de defesa menor e forças do batalhão (10 em campo + 10 de reserva)', JSON.stringify(b));
    await page.evaluate(() => { const L = BATTLE.limit; P.x = L.x + L.r + L.gray + 5; P.z = L.z });   // foge além da zona cinza
    await page.waitForSelector('#tbgo', { timeout: 20000 });
    const t = await page.evaluate(() => document.querySelector('#dead').innerText);
    ok(/fugiu/.test(t) && !/soldado.*perd/i.test(t), 'defesa: fugir do raio = tela de morte narrativa (fuga)', t.slice(0, 80));
    await page.click('#tbgo'); await page.waitForTimeout(1500);
    const c = await page.evaluate(() => ({ open: WM.open, bats: batList('player').length, dead: P.dead, inTile: wtX().inTile, enc: wtX().enc, turn: wtX().turn }));
    ok(c.bats === 0 && !c.dead && c.inTile === null && c.enc === null && c.turn === 'leader', 'defesa: o batalhão se desfaz; sem outro, o turno do Comandante acaba e a rodada vai ao Líder', JSON.stringify(c));
    await page.close();
  }
  if (want('invasao')) {   // Ataque: sem fuga; a guarnição real do POI sai e o POI é conquistado
    const page = await open('enc=invasao&soldados=30&inim=14&mix=1');
    const g0 = await page.evaluate(() => ({ gar: (WORLD.pois || []).filter(p => p.gar).length, main: !!(WORLD.tileS && WORLD.tileS.main && WORLD.tileS.main.poi) }));
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    const b = await page.evaluate(() => { const m = WORLD.tileS && WORLD.tileS.main && WORLD.tileS.main.poi; return { mode: BATTLE.mode, t: !!BATTLE.target, can: mundoCanLeave(), en: BATTLE.total0,
      allies: ALLIES.filter(x => x.alive).length, gar: (WORLD.pois || []).filter(p => p.gar).length, main: m ? m.owner : null, tpoi: !!(BATTLE.target && BATTLE.target.poi) } });
    ok(b.mode === 'ataque' && b.t && !b.can && b.en === 14 && b.allies === 10, 'invasão: modo Ataque com 10 em campo; NÃO dá para sair do tile em combate', JSON.stringify(b));
    ok(b.gar === 0, 'invasão: os bandidos reais dos POIs saem (a guarnição é a da batalha)', JSON.stringify([g0, b]));
    if (b.main !== null) {
      await page.evaluate(() => { for (const g of BATTLE.gens) if (g.side === 'enemy') g.reserve = 0; for (const e of BATTLE.area.enemies) if (e.alive) { e.alive = false; e.gone = true; BATTLE.area.aliveEnemies-- } });
      await page.waitForFunction(() => BATTLE.over, null, { timeout: 30000 });
      const c = await page.evaluate(() => ({ owner: WORLD.tileS.main.poi.owner, can: mundoCanLeave() }));
      ok(c.owner === 'player' && c.can, 'invasão: vencer conquista o POI principal e libera a saída', JSON.stringify(c));
    }
    await page.close();
  }
  if (want('invasao-poi')) {   // reposição a partir de POI seu; formação parada; todos os POIs inimigos passam ao vencer
    const page = await open('enc=invasao&soldados=30&inim=14&mix=1&meu=1');
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    const b = await page.evaluate(() => { const mine = (WORLD.pois || []).filter(p => p.owner === 'player' && !p.show); const m = mine[0];
      return { n: mine.length, main: WORLD.tileS.main && [WORLD.tileS.main.x | 0, WORLD.tileS.main.z | 0], base: BATTLE.base, poi: m ? { x: m.cx | 0, z: m.cz | 0 } : null, geo: BATTLE.geo.ataque.base } });
    ok(b.n >= 1 && b.geo && Math.abs(b.geo.x - b.poi.x) < 2, 'invasão-poi: a reposição vem do POI seu perto do alvo', JSON.stringify(b));
    const y0 = await page.evaluate(() => ALLIES.filter(a => a.alive).map(a => a.yaw));
    await page.waitForTimeout(6000);
    const flips = await page.evaluate(async () => { const A = ALLIES.filter(a => a.alive); const y = A.map(a => a.yaw); await new Promise(r => setTimeout(r, 1500));
      return A.filter((a, i) => Math.abs(Math.atan2(Math.sin(a.yaw - y[i]), Math.cos(a.yaw - y[i]))) > 1.5).length });
    ok(flips === 0, 'formação: parados, os soldados não ficam virando', String(flips));
    const f = await page.evaluate(async () => { for (const e of BATTLE.area.enemies) if (e.alive) { e.hp = 1e9 } P.yaw += 2; await new Promise(r => setTimeout(r, 4000));   // gira a câmera parado: ninguém pode se mexer
      const A = ALLIES.filter(a => a.alive), p0 = A.map(a => [a.x, a.z]); await new Promise(r => setTimeout(r, 2500));
      const mov = A.filter((a, i) => Math.hypot(a.x - p0[i][0], a.z - p0[i][1]) > 0.6).length, fx = -Math.sin(BATTLE.head), fz = -Math.cos(BATTLE.head);
      const front = A.filter(a => (a.x - P.x) * fx + (a.z - P.z) * fz > 1).length; const dbg = A.map(a => { const q = battleFormSpot(a); return [Math.hypot(q.x - a.x, q.z - a.z).toFixed(1), a.state, !!a.path].join(':') }).join(' '); return { dbg, n: A.length, mov, tg: A.filter(a => a.tgtE).length, front, d: A.map(a => Math.hypot(a.x - P.x, a.z - P.z) | 0).join(',') } });
    ok(f.mov === 0 && f.front === 0, 'formação: parados ficam atrás do jogador e não se mexem quando ele gira a câmera', JSON.stringify(f));
    const t = await page.evaluate(async () => { const T = BATTLE.target, R = battleCfg('ataque').alert; P.x = T.x - 20; P.z = T.z; P.y = tH(P.x, P.z) + 1;   // o jogador chega primeiro ao alvo
      const a = ALLIES.find(q => q.alive); a.x = T.x + 170; a.z = T.z + 40; a.y = tH(a.x, a.z); await new Promise(r => setTimeout(r, 1500));
      return { R, d: Math.hypot(a.x - T.x, a.z - T.z) | 0, ok: ALLIES.filter(q => q.alive && Math.hypot(q.x - P.x, q.z - P.z) > 150).length } });
    ok(t.ok === 0 && Math.abs(t.d - t.R) < 12, 'chegou primeiro: o batalhão distante vai para a borda do raio', JSON.stringify(t));
    await page.evaluate(() => { for (const g of BATTLE.gens) if (g.side === 'enemy') g.reserve = 0; for (const e of BATTLE.area.enemies) if (e.alive) { e.alive = false; e.gone = true; BATTLE.area.aliveEnemies-- } });
    await page.waitForFunction(() => BATTLE.over, null, { timeout: 30000 });
    const c = await page.evaluate(() => (WORLD.pois || []).filter(p => !p.show && !p.war && p.type !== 'ruins' && p.owner !== 'player' && p.owner !== 'free').length);
    ok(c === 0, 'invasão-poi: vencer passa todos os POIs inimigos do tile ao jogador', String(c));
    await page.close();
  }
  if (want('morte-sozinho')) {   // sem soldados: sem postos seus; texto de quem estava sozinho
    const page = await open('enc=campo&soldados=0&inim=20&mortal=1');
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await page.waitForFunction(() => typeof BATTLE !== 'undefined' && BATTLE.on && BATTLE.real && !BATTLE.over, null, { timeout: T }); await page.waitForTimeout(1500);
    const g = await page.evaluate(() => BATTLE.gens.filter(x => x.side === 'player').length);
    ok(g === 0, 'sozinho: nenhum posto/POI do jogador na batalha', String(g));
    await page.evaluate(() => { P.hp = 0; die() });
    await page.waitForSelector('#tbgo', { timeout: 20000 });
    const t = await page.evaluate(() => document.querySelector('#dead').innerText);
    ok(/sozinho/.test(t) && !/soldados/.test(t), 'sozinho: tela de morte própria de quem estava sozinho', t.slice(0, 90));
    await page.close();
  }
  if (want('morte-campo')) {   // forma 1: sem batalha, dentro do tile
    const page = await open('explorar=1&soldados=10&mortal=1');
    await page.evaluate(() => { closePanel(); if (WM.open) wm3Close(); });
    await page.waitForTimeout(500);
    const g0 = await page.evaluate(() => { Ledger.set('gold', 400); return { gold: Ledger.get('gold'), left: wtX().left, mun: JSON.stringify(wtActive().mun) } });
    await page.evaluate(() => { P.hp = 0; die() });
    await page.waitForSelector('#tbgo', { timeout: 10000 });
    await page.click('#tbgo'); await page.waitForTimeout(1500);
    const c = await page.evaluate(() => ({ open: WM.open, gold: Ledger.get('gold'), left: wtX().left, bats: batList('player').length, mun: JSON.stringify(wtActive().mun), inTile: wtX().inTile, dead: P.dead }));
    ok(c.open && c.gold === 250 && c.left === g0.left && c.bats === 1 && c.inTile === null && !c.dead, 'morte fora de batalha: perde 150 de ouro (a ação da exploração já foi paga; nenhuma a mais); o batalhão fica; volta ao mapa mundi', JSON.stringify([g0, c]));
    await page.close();
  }
  if (want('dois')) {   // dois batalhões somados: as baixas se dividem
    const page = await open('enc=campo&soldados=20&soldados2=20&inim=6&mix=1');
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    const b = await page.evaluate(() => ({ tot: BATTLE.ally.total0, res: BATTLE.ally.reserve, bats: batAt(wtX().enc ? wtKey(wtX().enc.tile) : '').length }));
    ok(b.tot === 40 && b.bats === 2, 'dois batalhões: as forças somam 40 soldados na batalha', JSON.stringify(b));
    await page.evaluate(() => { BATTLE.ally.reserve = 0; for (const a of ALLIES) if (a.alive && a.slot < 4) { a.alive = false; a.hp = 0 } });   // 4 mortos em campo
    await page.evaluate(() => { for (const g of BATTLE.gens) if (g.side === 'enemy') g.reserve = 0; for (const e of BATTLE.area.enemies) if (e.alive) { e.alive = false; e.gone = true; BATTLE.area.aliveEnemies-- } });
    await page.waitForFunction(() => BATTLE.over && wtX().enc === null, null, { timeout: 60000 });
    const c = await page.evaluate(() => batList('player').map(x => batTotal(x)));
    ok(c.length === 2 && Math.abs(c[0] - c[1]) <= 1, 'dois batalhões: as baixas se dividem igualmente', JSON.stringify(c));
    await page.close();
  }
  if (want('morte-batalha')) {   // forma 3 em batalha grande
    const page = await open('enc=campo&soldados=10&inim=60&mortal=1&mix=1');
    await page.evaluate(() => WM.turnEl.querySelector('[data-a=fight]').click());
    await inBattle(page);
    await page.evaluate(() => { P.hp = 0; die() });
    await page.waitForSelector('#tbgo', { timeout: 20000 });
    const t = await page.evaluate(() => document.querySelector('#dead').innerText);
    ok(/DERROTA/.test(t) && /comandante caiu/.test(t), 'morte em batalha grande: tela narrativa de derrota do Choque', t.slice(0, 90));
    await page.click('#tbgo'); await page.waitForTimeout(1500);
    const c = await page.evaluate(() => ({ bats: batList('player').length, dead: P.dead, inTile: wtX().inTile, enc: wtX().enc, actors: wtX().actors.length, turn: wtX().turn, gold: Ledger.get('gold') }));
    ok(c.bats === 0 && !c.dead && c.inTile === null && c.enc === null && c.actors === 1 && c.turn === 'leader' && c.gold >= 0, 'morte em batalha grande: o batalhão se desfaz, o bando fica e o turno acaba (sem dívida)', JSON.stringify(c));
    await page.close();
  }
  ok(errs.length === 0, 'sem erros no console', errs.slice(0, 5).join(' | '));
  await br.close(); srv.close(); process.exit(fails ? 1 : 0);
});
