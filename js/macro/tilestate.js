'use strict';
// ---------- Estado e economia do tile (etapa 4F; feature 8). Camada macro: sem Three.js nem DOM ----------
// O tile fora da tela NÃO é simulado: guarda-se só a DIFERENÇA da semente (dono, nível, mortos, loot, prédios novos), a lista de POIs de guerra e a produção
// resumida. Tudo em STATE.tiles[chave] (JSON puro, salvo com o jogo); chave = tileKey(i,j). Campo ausente = o valor da semente. Números: TILE_PROD/TILE_TAX
// (economy-modifiers.js). A ligação com as rodadas e a anexação detalhada são da etapa 8; aqui só o formato do estado e as fórmulas.
const tileKey = (i, j) => i + ',' + j;
const tileStatesAll = () => STATE.tiles || (STATE.tiles = {});
// Ficha do tile (criada ao primeiro uso): dono (null = o da semente), dif = diferenças {tipo: {id: valor}}, guerra = [{tipo, zona, dono, lado}], est = estoque {food, ore, wood, gold}.
function tileSt(key) {
  const T = tileStatesAll();
  return T[key] || (T[key] = { dono: null, dif: {}, guerra: [], est: {}, rodada: 0 });
}
const tileStHas = key => !!tileStatesAll()[key];

// ---- dono: o do POI principal. seedOwner = dono de origem (da semente), usado enquanto não houver mudança ----
const tileOwner = (key, seedOwner) => { const s = tileStatesAll()[key]; return s && s.dono ? s.dono : seedOwner || null };
function tileOwnerSet(key, dono) { tileSt(key).dono = dono || null }
// Atualiza o dono do tile a partir do POI principal (chamar quando ele muda de mãos). Devolve true se o dono mudou.
function tileOwnerSync(key, seedOwner, mainOwner) {
  const antes = tileOwner(key, seedOwner); tileOwnerSet(key, mainOwner === seedOwner ? null : mainOwner);
  return antes !== tileOwner(key, seedOwner);
}

// ---- diferenças da semente: tipo = 'dono' (POI), 'nivel', 'mortos', 'loot', 'predios'; id = POI/baú/prédio; valor = JSON puro. undefined/null apaga ----
function tileDiffSet(key, tipo, id, valor) {
  const d = tileSt(key).dif, m = d[tipo] || (d[tipo] = {});
  if (valor === undefined || valor === null) { delete m[id]; if (!Object.keys(m).length) delete d[tipo] } else m[id] = valor;
}
const tileDiffGet = (key, tipo, id, padrao) => { const s = tileStatesAll()[key], m = s && s.dif[tipo]; return m && id in m ? m[id] : padrao };
const tileDiffs = (key, tipo) => { const s = tileStatesAll()[key]; return Object.assign({}, s && s.dif[tipo]) };

// ---- POIs de guerra do tile: a lista devolvida por tileWarAssemble. Ficam enquanto durar o conflito (batalha = o descritor, para remontar) ----
function tileWarSet(key, lista, batalha) {
  const s = tileSt(key);
  s.guerra = (lista || []).map(p => ({ tipo: p.tipo, zona: p.zona, dono: p.dono, lado: p.lado || null }));
  s.batalha = lista && lista.length && batalha ? { tipo: batalha.tipo, entradaAtacante: batalha.entradaAtacante, entradaDefensor: batalha.entradaDefensor, estacionado: batalha.estacionado } : null;
}
const tileWarList = key => { const s = tileStatesAll()[key]; return s ? s.guerra.map(p => Object.assign({}, p)) : [] };
const tileWarBattle = key => { const s = tileStatesAll()[key]; return s && s.batalha ? Object.assign({}, s.batalha) : null };

// ---- produção resumida por rodada ----
// Produção de um tema por rodada, para o nível do líder `lvl`: {food|ore|wood: n} (tema de recurso) ou {gold: n} (vila: imposto). Sem produção = {}.
function tileProduction(tema, lvl) {
  const r = TILE_PROD.res[tema];
  if (r) return { [r]: Math.max(0, Math.round((TILE_PROD.base + TILE_PROD.perLvl * (lvl || 1)) * TILE_PROD.mul)) };
  return tileTaxes(tema) ? { gold: TILE_TAX.base + TILE_TAX.perRank * TILE_TAX.rank } : {};
}
// Fecha uma rodada do tile: se tem dono (sem dono, nada a produzir) e ainda não produziu na rodada `round`, soma a produção ao estoque. Devolve o que produziu ({} se nada).
function tileProdTick(key, tema, round, lvl, seedOwner) {
  const s = tileSt(key);
  if (!tileOwner(key, seedOwner) || s.rodada >= round) return {};
  s.rodada = round;
  const p = tileProduction(tema, lvl);
  for (const k in p) s.est[k] = (s.est[k] || 0) + p[k];
  return p;
}
// Recolhe o estoque do tile (zera e devolve {food, ore, wood, gold}); a etapa 8 manda isso ao armazém/cofre do dono.
function tileProdCollect(key) {
  const s = tileStatesAll()[key]; if (!s) return {};
  const e = s.est; s.est = {}; return e;
}
// Soma o estoque dos tiles de um dono (sem recolher): para mostrar no resumo. Aceita a lista [{key, seedOwner}] (a etapa 8 monta pela grade/grafo).
function tileProdStock(dono, lista) {
  const out = {};
  for (const t of lista) if (tileOwner(t.key, t.seedOwner) === dono) { const e = (tileStatesAll()[t.key] || {}).est || {}; for (const k in e) out[k] = (out[k] || 0) + e[k] }
  return out;
}

Hooks.on('resetState', () => { STATE.tiles = {} });
