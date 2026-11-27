'use strict';
// ---------- Economia por tile no mundo novo (etapa 8.4; ?mundo=1): fim de rodada, armazém único, suprimento ao entrar e a ficha da cidade de cada tile ----------
// Camada mista (usa o livro de recursos, o armazém e o mapa local); as contas ficam em js/macro/tileecon.js (testável em Node). Textos em economy-texts.js.

// "Últimos ganhos" do armazém: começa vazio no início do fechamento da rodada (endRound) e acumula o ouro (goldIn) e os itens (whIncome) que entraram.
function whGainBegin() { if (mapMundoOn()) shOf().gain = { r: STATE.round, gold: 0, items: [] } }
// Ouro que entrou na rodada (imposto, renda): soma nos ganhos do armazém.
function whGainGold(n) { const g = mapMundoOn() && shOf().gain; if (g) g.gold += n }
// Recursos de renda (res = {food, ore, wood}) entram no armazém único; o que não couber se perde em silêncio. Devolve [{id, n, put}].
function whIncome(res) {
  const sh = shOf(), out = [];
  for (const k in res) {
    const id = TILE_ECON.items[k]; if (!id || !(res[k] > 0)) continue;
    const put = storeAddTo(sh, id, res[k]); out.push({ id, n: res[k], put });
    if (sh.gain) sh.gain.items.push({ id, n: res[k], put });
  }
  return out;
}

// Fim da rodada no mundo novo (chamado por endRound depois das cidades): a renda dos tiles seus entra no saldo e no armazém, vilas distantes podem ficar
// independentes e o relatório da rodada ganha a tabela. rep = a lista do relatório.
function tileEconomyRound(rep, cityRows) {
  const G = wtGraph(); if (!mapMundoOn() || !G) return;
  const loaded = WORLD.win && typeof WORLD.win.node === 'number' ? WORLD.win.node : -1, eco = wtRoundEconomy(G, wtLvl(), loaded);
  goldIn(eco.gold); whIncome(eco.res);
  const rows = (cityRows || []).map(r => ({ nome: r.nome, tema: 'cidade', mood: r.mood, gold: r.gold, res: r.res })).concat(eco.tiles.map(t => ({ nome: wtName(G, t.id), tema: t.tema, gold: t.gold || 0, res: t.res || {} })));
  const tot = { gold: 0, res: {} };
  for (const r of rows) { tot.gold += r.gold; for (const k in r.res) tot.res[k] = (tot.res[k] || 0) + r.res[k] }
  if (rows.length) rep.push(txtTileIncomeTable(rows, tot));
  if (eco.freed.length) WM.key = null;   // o mapa mundi 3D refaz as bandeiras na próxima abertura (a vila independente ficava azul)
  for (const id of eco.freed) {
    rep.push(txtVilaIndep(wtName(G, id), STATE.fac && STATE.fac.name));
    if (id === loaded && WORLD.home) WORLD.home.owner = 'neutral';   // o jogador estava na vila: ela já deixa de ser sua no mapa carregado
  }
}

// Suprimento ao entrar numa cidade sua (cidade ou vila): o que a cidade precisa e ainda não tem nos slots sai do armazém único (a marcha não consome nada).
// A vila não tem necessidades: nada a suprir. Devolve quantas unidades passaram.
function whSupplyFromStore(c) {
  if (!c || c.owner !== 'player' || !ec(c)) return 0;
  const sh = shOf(); let moved = 0;
  for (const r of NEEDS) {
    let miss = needOf(c, r) - storedOf(c, r);
    for (let i = 0; i < WH_SLOTS && miss > 0; i++) {
      const s = sh.store[i], sp = s && supplyOf(s.id); if (!sp || sp.res !== r) continue;
      const dst = autoDest(c, 'sup', s.id); if (!dst) continue;
      const cur = refGet(c, dst), t = Math.min(miss, s.n, SUP_STACK - (cur ? cur.n : 0)); if (t <= 0) continue;
      if (cur) cur.n += t; else refSet(c, dst, { id: s.id, n: t });
      s.n -= t; if (s.n <= 0) sh.store[i] = null; supDelta(c, dst.area, s.id, t); miss -= t; moved += t;
    }
  }
  return moved;
}

// ---- ficha da cidade de cada tile ----
// A cidade de cada tile é sempre a de índice 0 do mapa local. A ficha econômica dela (tipo, necessidades, humor, suprimentos, loja) e o nível (rd.clv) vivem em
// STATE.rd.cities[0] / rd.clv[0] só enquanto o tile está carregado; ao sair (mundoGo) vão para STATE.tiles[chave].cidade e voltam ao entrar de novo.
const mundoCityId = () => (WORLD.cities && WORLD.cities[0] ? WORLD.cities[0].id : 0);
function mundoCityStash() {
  const key = mundoTileKey(), rd = STATE.rd; if (!key || !rd || !rd.cities) return;
  const id = mundoCityId(), e = rd.cities[id]; if (!e) return;
  tileSt(key).cidade = { ec: e, clv: (rd.clv && rd.clv[id]) || 0 };
  delete rd.cities[id]; if (rd.clv) delete rd.clv[id];
}
// Depois de carregar o save, antes de initEconomy: devolve a ficha do tile que vai ser aberto (id da cidade 0 de qualquer mapa local).
function mundoCityRestore() {
  const w = wtX(), rd = STATE.rd, key = typeof w.local === 'number' ? wtKey(w.local) : null, t = key && tileStatesAll()[key];
  if (!t || !t.cidade) return;
  if (t.cidade.ec) rd.cities[0] = t.cidade.ec;
  if (t.cidade.clv) (rd.clv || (rd.clv = {}))[0] = t.cidade.clv;
  delete t.cidade;
}
