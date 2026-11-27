'use strict';
// Teste em Node da economia por tile (js/macro/tileecon.js, etapa 8.4). Uso (de dentro de tests/): node macro/tileecon.js
const { erros, run } = require('./carregar')();
let falhas = 0; const ok = (c, n, w) => { if (!c) falhas++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
ok(erros.length === 0, 'camada macro carrega (inclui tileecon.js)', erros.join(' | '));
run('var P={coins:0}; resetState(); STATE.round=1; STATE.rd={now:[],lvl:1}');
run('var F=wfCreate(11,{format:"pangeia",dominant:"plains"}); var G=wgBuild(F); var H=G.inicio.id');
const vilas = run('G.nodes.filter(n=>n.tema==="vila").length'), ranks = JSON.parse(run('JSON.stringify(G.nodes.filter(n=>n.tema==="vila").map(n=>n.rank))'));
ok(vilas >= 1 && ranks.every(r => r >= 1 && r <= 3), 'toda vila tem rank de 1 a 3', 'ranks ' + ranks.join(','));
ok(run('G.nodes.filter(n=>n.tema!=="vila").every(n=>!n.rank)'), 'tile que não é vila não tem rank');
run('var D=wgUnpack(wgPack(G),F)');
ok(run('D.nodes.every((n,i)=>n.rank===G.nodes[i].rank)'), 'o rank sai igual depois de salvar e carregar o grafo');
// dono: a cidade inicial é sempre sua; o resto é neutro
ok(run('wtOwnerOf(G,H)')==='player' && run('wtOwnedIds(G).length')===1, 'só a cidade inicial é sua no começo');
ok(run('wtDetach(G,H)')===false && run('wtAnnex(G,H,"bandit")')===false, 'a cidade inicial não se desanexa nem passa a outro dono');
const rec = run('G.nodes.find(n=>n.tema==="fazenda").id'), mina = run('G.nodes.find(n=>n.tema==="mina").id'), v0 = run('G.nodes.find(n=>n.tema==="vila").id');
ok(run(`wtAnnex(G,${rec})`)===true && run(`wtOwnerOf(G,${rec})`)==='player', 'anexar um tile o faz seu');
ok(run('wtAnnex(G,G.nodes.find(n=>n.mar).id)')===false, 'tile de mar não se anexa');
// renda por tipo de tile, igual perto ou longe
run(`wtAnnex(G,${mina}); wtAnnex(G,${v0})`);
const inc = JSON.parse(run('JSON.stringify(wtIncome(G,1))'));
const rankV0 = run(`G.nodes[${v0}].rank`);
ok(inc.gold === 12 + 5 * rankV0, 'vila rende 12 + 5 x rank em ouro', 'ouro ' + inc.gold + ' rank ' + rankV0);
ok(inc.res.food === 2 && inc.res.ore === 2, 'fazenda e mina rendem base + nível (2) de comida e minério');
ok(inc.tiles.length === 3 && inc.cidades.length === 1, 'cidade fica de fora da renda por tile (rounds.js cuida da carregada)');
run('STATE.rd.lvl=3');
ok(run('wtIncome(G,3).res.food')===4, 'a renda sobe com o nível do líder');
// POI não rende: tile com tema sem produção (passagem, fortaleza, ponte) não entra
const pas = run('G.nodes.find(n=>!n.mar&&["passagem","fortaleza","ponte","ruinas"].includes(n.tema)).id');
run(`wtAnnex(G,${pas})`);
ok(run('wtIncome(G,3).tiles.length')===3, 'tile de passagem/fortaleza/ponte/ruína não rende');
// renda da rodada: cidade fora do mapa local rende o valor plano
run('wtAnnex(G,G.nodes.find(n=>n.tema==="cidade"&&!n.home).id)');
const eco = JSON.parse(run('JSON.stringify(wtRoundEconomy(G,1,H))'));
ok(eco.tiles.filter(t => t.tema === 'cidade').length === 1 && eco.gold === 12 + 5 * rankV0 + run('tileCityFlat()'), 'cidade sua fora do mapa local rende o valor plano', 'ouro ' + eco.gold);
const eco2 = JSON.parse(run(`JSON.stringify(wtRoundEconomy(G,1,G.nodes.find(n=>n.tema==="cidade"&&!n.home).id))`));
ok(eco2.tiles.filter(t => t.tema === 'cidade').length === 1 && eco2.tiles.find(t => t.tema === 'cidade').id === run('H'), 'a cidade do mapa local carregado fica de fora (economia de sempre)');
// independência: vila sem tile seu vizinho

run('STATE.tiles={}; wtAnnex(G,G.nodes.find(n=>n.tema==="vila").id)');
const vid = run('G.nodes.find(n=>n.tema==="vila").id');
const vizinha = run(`wtOwnedNear(G,${vid})`);
ok(vizinha === 0 || vizinha === 1, 'wtOwnedNear conta vizinhos seus', 'vizinhos ' + vizinha);
// força: sem vizinho seu e chance 1 -> independente; com vizinho seu -> nunca
run('TILE_ECON.indepChance=1');
run('STATE.tiles={}; wtAnnex(G,' + vid + ')');
ok(run('wtIndependence(G).includes(' + vid + ')') === true && run('wtOwnerOf(G,' + vid + ')') === null, 'vila sua sem tile seu vizinho fica independente (chance 1)');
run('wtAnnex(G,' + vid + ')');
const viz = run('G.adj[' + vid + '].find(x=>!G.nodes[x.to].mar).to');
run('wtAnnex(G,' + viz + ')');
ok(run('wtIndependence(G).length')===0 && run('wtOwnerOf(G,' + vid + ')') === 'player', 'vila vizinha de tile seu nunca fica independente');
run('wtDetach(G,' + viz + ')'); run('TILE_ECON.indepChance=0');
ok(run('wtIndependence(G).length')===0, 'chance 0: nada muda');
// armazém por rank
ok(run('vilaHasStore(1)')===false && run('vilaHasStore(2)')===true && run('vilaHasStore(3)')===true, 'armazém na vila a partir do rank 2');
// determinismo do rank
const F2 = run('var F2=wfCreate(11,{format:"pangeia",dominant:"plains"}); var G2=wgBuild(F2); G2.nodes.map(n=>n.rank).join(",")');
ok(F2 === run('G.nodes.map(n=>n.rank).join(",")'), 'mesma semente, mesmos ranks');
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nTudo OK');
process.exit(falhas ? 1 : 0);
