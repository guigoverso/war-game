'use strict';
// ---------- Dono e economia dos tiles no mundo novo (etapa 8.4; rodada 16 de docs/features/5_mapa-mundi.md). Camada macro: sem Three.js nem DOM ----------
// O dono do tile é o da ficha STATE.tiles['w'+id] (tilestate.js; 'player', 'bandit' ou número de facção); a cidade inicial (n.home) é sempre do jogador. Renda por TIPO
// de tile, igual perto ou longe (recurso -> armazém; vila -> ouro pelo rank; POI não rende). O ouro vai para o saldo geral; o resto para o armazém único (warehouse.js).
// Números em TILE_ECON, TILE_PROD e TILE_TAX (economy-modifiers.js). Teste em Node: tests/macro/tileecon.js.

// Dono do tile `id` ('player', 'bandit', número ou null = neutro).
const wtOwnerOf = (G, id) => tileOwner(wtKey(id), G.nodes[id].home ? 'player' : null);
// Ids dos tiles de terra do dono (padrão 'player').
const wtOwnedIds = (G, dono) => G.nodes.filter(n => !n.mar && wtOwnerOf(G, n.id) === (dono || 'player')).map(n => n.id);
// Atalho criativo: anexa o tile ao dono (padrão 'player'). Falha em mar e na cidade inicial (que é sempre do jogador).
function wtAnnex(G, id, dono) {
  const n = G.nodes[id]; dono = dono || 'player';
  if (!n || n.mar || (n.home && dono !== 'player')) return false;
  tileOwnerSet(wtKey(id), n.home ? null : dono); wtPoiReset(id); return true;
}
// Atalho criativo: tira o tile do dono (volta a neutro). A cidade inicial não se desanexa.
function wtDetach(G, id) {
  const n = G.nodes[id]; if (!n || n.mar || n.home) return false;
  tileOwnerSet(wtKey(id), null); wtPoiReset(id); return true;
}
// O dono do tile mudou por fora do POI principal (atalho criativo): o POI principal volta a nascer do dono do tile, então o estado guardado dos POIs (donos) se descarta.
function wtPoiReset(id) { const t = tileStatesAll()[wtKey(id)]; if (t) delete t.poi }
// Quantos tiles vizinhos (aresta do grafo) são do jogador.
const wtOwnedNear = (G, id) => G.adj[id].filter(x => wtOwnerOf(G, x.to) === 'player').length;

// Renda de uma rodada dos tiles do jogador no nível `lvl`: {gold, res:{food,ore,wood}, tiles:[{id, tema, gold?, res?}], cidades:[ids de cidades suas]}.
// Cidade não entra na conta aqui: a do mapa local carregado segue a economia de sempre (rounds.js) e as outras rendem tileCityFlat() (wtRoundEconomy).
function wtIncome(G, lvl) {
  const out = { gold: 0, res: {}, tiles: [], cidades: [] };
  for (const id of wtOwnedIds(G, 'player')) {
    const n = G.nodes[id];
    if (n.tema === 'cidade') { out.cidades.push(id); continue }
    if (n.tema === 'vila') { const g = TILE_TAX.base + TILE_TAX.perRank * (n.rank || 1); out.gold += g; out.tiles.push({ id, tema: n.tema, gold: g }); continue }
    const p = tileProduction(n.tema, lvl), ks = Object.keys(p).filter(k => p[k] > 0);
    if (!ks.length) continue;
    for (const k of ks) out.res[k] = (out.res[k] || 0) + p[k];
    out.tiles.push({ id, tema: n.tema, res: p });
  }
  return out;
}
// Vilas suas que ficam independentes nesta rodada: sem nenhum tile seu vizinho, cada uma com a chance TILE_ECON.indepChance (vizinha de tile seu nunca).
// Tira o dono e devolve os ids.
function wtIndependence(G) {
  const rng = wtRng(G), out = [];
  for (const id of wtOwnedIds(G, 'player')) {
    const n = G.nodes[id];
    if (n.tema !== 'vila' || n.home || wtOwnedNear(G, id) > 0) continue;
    if (rng.next() < TILE_ECON.indepChance) { tileOwnerSet(wtKey(id), null); out.push(id) }
  }
  return out;
}
// Fecha a economia de tiles de uma rodada: a renda dos tiles de recurso e vila, a renda plana das cidades suas fora do mapa local carregado (`loaded` = id do tile
// carregado ou -1) e as vilas que se tornaram independentes. Quem chama põe o ouro no saldo e os itens no armazém. Devolve {gold, res, tiles, freed}.
function wtRoundEconomy(G, lvl, loaded) {
  const inc = wtIncome(G, lvl);
  for (const id of inc.cidades) if (id !== loaded) { const g = tileCityFlat(); inc.gold += g; inc.tiles.push({ id, tema: 'cidade', gold: g }) }
  inc.freed = wtIndependence(G);
  return inc;
}
// Vila com armazém? (rank do grafo; macro/graph.js)
const wtVilaStore = (G, id) => G.nodes[id].tema === 'vila' && vilaHasStore(G.nodes[id].rank);
