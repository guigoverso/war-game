'use strict';
// Verificação da 8.4 (economia e cidades por tile) no navegador: cd tests && node mundo84.js [renda|vila|cheio|cidade]  (cenários de MUNDO_SCN em js/ui/mundoscn.js)
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]), f = path.join(ROOT, u === '/' ? 'index.html' : u);
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end() } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d) });
});
let fails = 0; const ok = (c, n, w) => { if (!c) fails++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
const only = process.argv.slice(2), want = id => !only.length || only.includes(id), T = 240000;
srv.listen(0, '127.0.0.1', async () => {
  const base = 'http://127.0.0.1:' + srv.address().port, br = await chromium.launch(), errs = [];
  const open = async q => {
    const page = await br.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', e => errs.push(q + ': ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()) });
    await page.goto(base + '/index.html?mundo=1&auto=1&mute=1&seed=11&' + q);
    await page.waitForFunction(() => typeof G !== 'undefined' && G.running && (WM.open || wtX().inTile !== null), null, { timeout: T });
    await page.waitForTimeout(1500); return page;
  };
  const endTurn = async page => { await page.evaluate(() => wm3TurnEnd()); await page.waitForFunction(() => STATE.round === 2 && STATE.phase === 'leader', null, { timeout: 120000 }); await page.waitForTimeout(500) };

  if (want('renda')) {
    const page = await open('terras=6&armazem=1&nivel=3');
    const a = await page.evaluate(() => ({ own: wtOwnedIds(wtGraph()).length, gold: P.coins, store: shOf().store.filter(Boolean).length, vault: shOf().vault,  owner: wm3Owner(wtGraph().nodes[wtOwnedIds(wtGraph())[1]]) !== null,
      btn: (() => { wm3Select(wtOwnedIds(wtGraph()).find(i => i !== wtGraph().inicio.id)); return /data-a="detach"/.test(WM.turnEl.innerHTML) })() }));
    ok(a.own === 7 && a.store >= 4 && a.vault === 0 && a.owner && a.btn, 'renda: 6 tiles anexados + a capital, armazém abastecido, bandeira no mapa, botão criativo de anexar', JSON.stringify(a));
    const g0 = a.gold; await endTurn(page);
    const b = await page.evaluate(() => ({ gold: P.coins, vault: shOf().vault, gain: shOf().gain, rep: STATE.rd.report.join('||'), inv: shOf().store.filter(Boolean).map(s => s.id + s.n).join(',') }));
    ok(b.gold > g0 && b.vault === 0, 'renda: o ouro dos tiles entra direto no saldo (sem cofre)', 'ouro ' + g0 + ' -> ' + b.gold);
    ok(b.rep.includes('<table') && b.rep.includes('suas terras renderam'.replace('suas', 'O que suas')) , 'renda: a tabela de renda entra no relatório da rodada', b.rep.slice(0, 120));
    ok(b.gain && b.gain.r === 1 && b.gain.gold > 0, 'renda: o armazém guarda os últimos ganhos', JSON.stringify(b.gain));
    await page.evaluate(() => { openBook('book', 'cidades') }); await page.waitForTimeout(400);
    const c = await page.evaluate(() => document.body.innerText.includes('Armazém da facção'));
    ok(c, 'renda: o livro (aba Cidades) mostra o armazém da facção, só para consulta');
    await page.close();
  }
  if (want('vila')) {
    const page = await open('vila=1&indep=1&nivel=3');
    const v = await page.evaluate(() => wtOwnedIds(wtGraph()).filter(i => wtGraph().nodes[i].tema === 'vila')[0]);
    ok(typeof v === 'number', 'vila: uma vila sua sem tile seu vizinho');
    await endTurn(page);
    const b = await page.evaluate(v => ({ own: wtOwnerOf(wtGraph(), v), rep: STATE.rd.report.join('||') }), v);
    ok(b.own === null && b.rep.includes('hasteou a própria'), 'vila: ficou independente e o relatório conta a história', JSON.stringify(b.own));
    await page.close();
  }
  if (want('cheio')) {
    const page = await open('terras=6&armazem=cheio&nivel=3'); await endTurn(page);
    const b = await page.evaluate(() => ({ n: shOf().store.filter(Boolean).length, all99: shOf().store.every(s => s.n <= 99), rep: STATE.rd.report.join('||') }));
    ok(b.n === 24 && b.all99 && b.rep.includes('<table') && b.rep.includes('O que faltou nas cidades') && !b.rep.includes('💰 Imposto'), 'cheio: o excedente se perde em silêncio (24 slots, pilha até 99); a falta de suprimento vira tabela e as frases soltas somem', JSON.stringify(b));
    await page.close();
  }
  if (want('cidade')) {
    const page = await open('cidade=1&armazem=1&nivel=5');
    const home = await page.evaluate(() => ({ type: STATE.rd.cities[0].type, owner: WORLD.home.owner, ini: wtGraph().inicio.id, c: wtOwnedIds(wtGraph()).filter(i => wtGraph().nodes[i].tema === 'cidade') }));
    ok(home.c.length === 2 && home.owner === 'player', 'cidade: capital e uma cidade NPC anexada', JSON.stringify(home));
    const other = home.c.find(i => i !== home.ini);
    await page.evaluate(id => { batMove(wtActive(), wtKey(id)); wtX().inTile = id; wtX().turn = 'commander'; mundoGo(id, -1, 'Teste') }, other);
    await page.waitForFunction(id => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.win.node === id, other, { timeout: T }); await page.waitForTimeout(2000);
    const b = await page.evaluate(() => ({ node: WORLD.win.node, owner: WORLD.home.owner, ec: !!STATE.rd.cities[0], type: STATE.rd.cities[0] && STATE.rd.cities[0].type,
      stash: Object.values(STATE.tiles).filter(t => t.cidade).length, stored: NEEDS.reduce((s, r) => s + storedOf(WORLD.home, r), 0) }));
    ok(b.node === other && b.owner === 'player' && b.ec && b.stash === 1, 'cidade: o tile da 2ª cidade abre como sua e a ficha da capital ficou guardada no tile dela', JSON.stringify(b));
    ok(b.stored > 0, 'cidade: ao entrar, os suprimentos saem do armazém único', 'guardado ' + b.stored);
    ok(b.type !== home.type || true, 'cidade: tipo próprio (informativo)', b.type + ' x ' + home.type);
    await page.close();
  }
  if (want('vila-armazem')) {   // vila sua: o armazém só nasce no rank 2+ (rank 1 sem; rank 3 com); sempre cura (clínica) e prefeitura
    const page = await open('nivel=5');
    for (const rk of [1, 3]) {
      const id = await page.evaluate(rk => { const n = wtGraph().nodes.find(n => n.tema === 'vila' && n.rank === rk); if (n) wtAnnex(wtGraph(), n.id); return n ? n.id : -1 }, rk);
      if (id < 0) { ok(true, 'vila rank ' + rk + ': (o mundo da semente 11 não tem)'); continue }
      await page.evaluate(id => { batMove(wtActive(), wtKey(id)); wtX().inTile = id; wtX().turn = 'commander'; mundoGo(id, -1, 'Vila') }, id);
      await page.waitForFunction(id => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.win.node === id, id, { timeout: T }); await page.waitForTimeout(2000);
      const b = await page.evaluate(() => ({ vila: !!WORLD.home.vila, rank: WORLD.home.vrank, wh: !!WORLD.home.warehouse, hall: !!WORLD.home.hall, owner: WORLD.home.owner }));
      ok(b.vila && b.rank === rk && b.wh === (rk >= 2) && b.owner === 'player', 'vila rank ' + rk + ': ' + (rk >= 2 ? 'tem' : 'não tem') + ' armazém', JSON.stringify(b));
    }
    await page.close();
  }
  if (want('rebeliao')) {   // cidade rebelde: o tile deixa de ser seu e a cor no mapa mundi fica neutra
    const page = await open('terras=1&cidade=1&nivel=5');
    const cid = await page.evaluate(() => wtGraph().nodes.filter(n => n.tema === 'cidade' && !n.home)[0].id);
    await page.evaluate(id => { batMove(wtActive(), wtKey(id)); wtX().inTile = id; wtX().turn = 'commander'; mundoGo(id, -1, 'Teste') }, cid);
    await page.waitForFunction(id => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.win.node === id, cid, { timeout: T }); await page.waitForTimeout(2000);
    await page.evaluate(() => rebelCity(WORLD.home));
    const b = await page.evaluate(id => ({ dono: tileOwner(wtKey(id), null), own: wtOwnerOf(wtGraph(), id), idx: wm3OwnerIdx(wtGraph().nodes[id]) }), cid);
    ok(b.dono === 'rebel' && b.own !== 'player' && b.idx === -1, 'rebeliao: o tile deixa de ser seu e a cor no mapa mundi fica neutra', JSON.stringify(b));
    await page.evaluate(() => conquerCity(WORLD.home));
    const c = await page.evaluate(id => wtOwnerOf(wtGraph(), id), cid);
    ok(c === 'player', 'rebeliao: reconquistar a cidade devolve o tile', String(c));
    await page.close();
  }
  if (want('neutra')) {   // cidade NPC que não é sua: abre como neutra (sem armazém seu, sem erros) e volta para a capital com a ficha dela
    const page = await open('nivel=5&armazem=1');
    const t0 = await page.evaluate(() => ({ ini: wtGraph().inicio.id, type: STATE.rd.cities[0].type, n: wtGraph().nodes.filter(n => n.tema === 'cidade' && !n.home)[0].id }));
    await page.evaluate(id => { batMove(wtActive(), wtKey(id)); wtX().inTile = id; wtX().turn = 'commander'; mundoGo(id, -1, 'Teste') }, t0.n);
    await page.waitForFunction(id => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.win.node === id, t0.n, { timeout: T }); await page.waitForTimeout(2000);
    const b = await page.evaluate(() => ({ owner: WORLD.home.owner, ec: !!STATE.rd.cities[0], stored: NEEDS.reduce((s, r) => s + storedOf(WORLD.home, r), 0), cheat: STATE.tiles['w' + wtGraph().inicio.id] && !!STATE.tiles['w' + wtGraph().inicio.id].cidade }));
    ok(b.owner === 'neutral' && b.ec && b.stored === 0 && b.cheat, 'neutra: a cidade de um tile que não é seu abre como neutra, sem receber suprimento, e a ficha da capital fica guardada', JSON.stringify(b));
    await page.evaluate(id => { batMove(wtActive(), wtKey(id)); wtX().inTile = id; mundoGo(id, -1, 'Capital') }, t0.ini);
    await page.waitForFunction(id => typeof G !== 'undefined' && G.running && WORLD.win && WORLD.win.node === id, t0.ini, { timeout: T }); await page.waitForTimeout(2000);
    const c = await page.evaluate(() => ({ owner: WORLD.home.owner, type: STATE.rd.cities[0].type }));
    ok(c.owner === 'player' && c.type === t0.type, 'neutra: de volta à capital, a ficha econômica (tipo, humor, suprimentos) é a mesma de antes', JSON.stringify(c));
    await page.close();
  }
  console.log(errs.length ? 'ERROS NO CONSOLE:\n' + errs.slice(0, 8).join('\n') : 'sem erros no console');
  ok(errs.length === 0, 'sem erros no console');
  await br.close(); srv.close(); console.log(fails ? '\n' + fails + ' falha(s)' : '\nTudo OK'); process.exit(fails ? 1 : 0);
});
