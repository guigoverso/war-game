'use strict';
// ---------- Batalhão no estado (passo 9 de docs/features/12_batalha-no-tile.md, 4B-4 e 4B-17). Camada macro: sem Three.js nem DOM ----------
// STATE.bat = {seq, list:[{id, tile, dono, sold:{tipo:n}, mun:{item:n}}]} (JSON puro, salvo com o jogo). Só isto é salvo: o estado da batalha em curso
// (vivos, reservas, lotes) não. tile = chave tileKey(i,j); dono = 'player' | id de facção | 'bandit'. Soldados por tipo (BAT.kinds); elites e comuns
// não diferem no estado: os primeiros BAT.elite do total são elites, o resto é comum (batElites/batCommons). Quem morre sai para sempre (batLose).
// Foto da batalha: ao começar uma batalha chama-se batSnapshot(); o save grava a foto (batSaved) e carregar abre no mapa mundi. batSnapDrop ao terminar.
const batX = () => STATE.bat || (STATE.bat = { seq: 0, list: [] });
const batGet = id => batX().list.find(b => b.id === id) || null;
const batList = dono => batX().list.filter(b => !dono || b.dono === dono);
const batAt = tile => batX().list.filter(b => b.tile === tile);
const batTotal = b => BAT.kinds.reduce((s, k) => s + (b.sold[k] || 0), 0);
const batElites = b => Math.min(BAT.elite, batTotal(b));
const batCommons = b => batTotal(b) - batElites(b);

// Cria um batalhão. sold = {tipo: n} (excesso sobre BAT.max é cortado, tipos desconhecidos ignorados). Devolve o batalhão, ou null se o jogador já
// está no teto de batalhões do nível `lvl` (só 'player' é limitado).
function batCreate(dono, tile, sold, mun, lvl) {
  if (dono === 'player' && batList('player').length >= batCountMax(lvl)) return null;
  const b = { id: ++batX().seq, tile, dono, sold: {}, mun: Object.assign({}, mun) };
  batX().list.push(b);
  for (const k of BAT.kinds) if (sold && sold[k] > 0) batGain(b, k, sold[k]);
  return b;
}
// Soma n soldados do tipo k, respeitando o teto de BAT.max. Devolve quantos entraram (o resto se perde).
function batGain(b, k, n) {
  if (!BAT.kinds.includes(k)) return 0;
  const add = Math.max(0, Math.min(Math.floor(n), BAT.max - batTotal(b)));
  if (add) b.sold[k] = (b.sold[k] || 0) + add;
  return add;
}
// Tira até n soldados do tipo k (baixas). Devolve quantos saíram.
function batLose(b, k, n) {
  const del = Math.max(0, Math.min(Math.floor(n), b.sold[k] || 0));
  if (del) { b.sold[k] -= del; if (!b.sold[k]) delete b.sold[k] }
  return del;
}
// Baixas sem tipo escolhido: tira n soldados dos tipos com mais gente primeiro. Devolve {tipo: n} do que saiu.
function batLoseAny(b, n) {
  const out = {};
  while (n > 0 && batTotal(b) > 0) {
    const k = BAT.kinds.reduce((m, x) => (b.sold[x] || 0) > (b.sold[m] || 0) ? x : m, BAT.kinds[0]);
    out[k] = (out[k] || 0) + batLose(b, k, 1); n--;
  }
  return out;
}
// Passa soldados de um batalhão a outro (doação; quem chama confere que o comandante está numa cidade). Devolve quantos passaram (limitado pelo teto do destino).
function batDonate(from, to, k, n) {
  const mv = batLose(from, k, Math.min(n, BAT.max - batTotal(to))), got = batGain(to, k, mv);
  return got;
}
const batMove = (b, tile) => { b.tile = tile };
// Derrota do comandante (3 de 4B): o batalhão é destruído e some da lista. A punição de ouro e munição é de quem chama.
function batDestroy(id) { const L = batX().list, i = L.findIndex(b => b.id === id); if (i >= 0) L.splice(i, 1); return i >= 0 }

// ---- foto da batalha (4B-17): fica só na memória; o save usa batSaved() no lugar do estado vivo ----
let batSnap = null;
const batSnapshot = () => { batSnap = JSON.stringify(batX()) };
const batSnapDrop = () => { batSnap = null };
const batSaved = () => batSnap ? JSON.parse(batSnap) : JSON.parse(JSON.stringify(batX()));
// Lê o que veio do save (ausente ou torto = nenhum batalhão) e descarta tipos e excessos inválidos.
function batApply(s) {
  batSnap = null;
  const st = { seq: 0, list: [] };
  if (s && Array.isArray(s.list)) {
    st.seq = +s.seq || 0;
    for (const o of s.list) {
      if (!o || typeof o.tile !== 'string' || !o.dono) continue;
      const b = { id: o.id, tile: o.tile, dono: o.dono, sold: {}, mun: Object.assign({}, o.mun) };
      for (const k of BAT.kinds) if (o.sold && o.sold[k] > 0) batGain(b, k, o.sold[k]);
      if (typeof o.de === 'number') b.de = o.de;   // tile de onde chegou (worldturn.js wtMove): entra no tile pela estrada certa
      st.list.push(b); st.seq = Math.max(st.seq, b.id || 0);
    }
  }
  STATE.bat = st;
}
Hooks.on('resetState', () => { batSnap = null; STATE.bat = { seq: 0, list: [] } });
