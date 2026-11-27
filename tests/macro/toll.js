'use strict';
// Teste em Node do pedágio, dos bandidos que tomam a passagem e da torre de vigia (js/macro/toll.js, etapa 8.5). Uso (de dentro de tests/): node macro/toll.js
const { erros, run } = require('./carregar')();
let falhas = 0; const ok = (c, n, w) => { if (!c) falhas++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
ok(erros.length === 0, 'camada macro carrega (inclui toll.js)', erros.join(' | '));
run('var P={coins:1000}; resetState(); STATE.round=1; STATE.rd={now:[],lvl:1}; STATE.rel={}');
run('var F=wfCreate(11,{format:"pangeia",dominant:"plains"}); var G=wgBuild(F); wtGraphLoad(F); wtApply({}); var H=G.inicio.id');
const pt = run('G.nodes.find(n=>n.tema==="ponte")'), fo = run('G.nodes.find(n=>n.tema==="fortaleza")');
ok(!!pt && !!fo, 'o mundo tem tile de ponte e de fortaleza');
const ponte = run('G.nodes.find(n=>n.tema==="ponte").id'), forte = run('G.nodes.find(n=>n.tema==="fortaleza").id'), faz = run('G.nodes.find(n=>n.tema==="fazenda").id');
ok(run(`wtTollTile(G,${ponte})`) && run(`wtTollTile(G,${forte})`) && !run(`wtTollTile(G,${faz})`), 'só ponte e fortaleza cobram');
// preço por dono
ok(run(`wtTollPrice(G,${ponte},'player')`) === 100, 'tile neutro cobra 100');
run(`wtAnnex(G,${ponte})`);
ok(run(`wtTollPrice(G,${ponte},'player')`) === 0, 'o tile do jogador é de graça para ele');
ok(run(`wtTollPrice(G,${ponte},7)`) === 100, 'NPC que passa por tile do jogador paga 100 (o ouro entra)');
run(`wtAnnex(G,${ponte},3)`);
const preco = r => run(`wtTollPrice(G,${ponte},'player',()=>'${r}')`);
ok(preco('neutral') === 150 && preco('ally') === 0 && preco('fav') === 105 && preco('unfav') === 225 && preco('enemy') === 300 && preco('war') === 300, 'outra facção cobra 150 x relação (Aliado 0, Favorável x0,7, Neutro x1, Desfavorável x1,5, Inimiga x2)');
run(`wtAnnex(G,${ponte},"bandit")`);
ok(run(`wtTollPrice(G,${ponte},'player')`) === 500, 'tile tomado por bandidos cobra 500');
run(`wtDetach(G,${ponte})`);
// cobrar: ouro, dívida e ouro entrando no dono
run(`P.coins=1000; wtTollCharge(G,${ponte},'player')`);
ok(run('P.coins') === 900, 'pagar tira o ouro');
run(`P.coins=30; wtTollCharge(G,${ponte},'player')`);
ok(run('P.coins') === -70, 'o jogador pode ficar em dívida ao pagar');
run(`P.coins=0; wtAnnex(G,${ponte}); wtTollCharge(G,${ponte},7)`);
ok(run('P.coins') === 100, 'NPC que passa por ponte do jogador entrega o ouro automaticamente');
run(`wtDetach(G,${ponte})`);
// travessia: só ao atravessar para o lado oposto ao de onde veio
const viz = run(`G.adj[${ponte}].filter(x=>!G.nodes[x.to].mar).map(x=>x.to)`);
ok(viz.length >= 2, 'a ponte liga pelo menos dois tiles de terra', 'vizinhos ' + viz.join(','));
if (viz.length >= 2) {
  run(`var b={de:${viz[0]}}`);
  ok(run(`wtTollCheck(G,b,${ponte},${viz[0]})`) === null, 'voltar para onde veio não paga');
  const tl = run(`wtTollCheck(G,b,${ponte},${viz[1]})`);
  ok(tl && tl.price === 100 && tl.dono === 'neutral', 'seguir para o lado oposto cobra', JSON.stringify(tl));
  ok(run(`wtTollCheck(G,{},${ponte},${viz[1]})`) !== null, 'sem tile de origem conhecido, qualquer saída cobra');
}
// wtMove para no pedágio e só segue depois de pagar
run('STATE.wt=wtFresh(); wtX().init=true; wtX().turn="commander"; wtX().pool=wtX().left=99; STATE.bat={seq:0,list:[]}');
const ini = viz[0];
run(`var B=batCreate("player","w"+${viz[0]},{soldier:5},{},1); B.de=-1; wtX().act=B.id`);
const alvo = run(`wtPath(G,${viz[0]},${viz[1]}).nodes[wtPath(G,${viz[0]},${viz[1]}).nodes.length-1]`);
run('P.coins=1000');
const r1 = JSON.parse(run(`JSON.stringify(wtMove(G,${viz[1]}))`));
ok(r1.ok === true && r1.toll && r1.toll.price === 100 && r1.toll.tile === ponte && r1.parcial === true, 'wtMove anda até a ponte e para no pedágio (a ação foi gasta)', JSON.stringify(r1.toll));
ok(run(`batGet(B.id).tile`) === 'w' + ponte && run('P.coins') === 1000, 'o batalhão espera na ponte e nada foi cobrado');
const r1b = JSON.parse(run(`JSON.stringify(wtMove(G,${viz[1]}))`));
ok(r1b.ok === false && r1b.why === 'pedagio' && run('wtX().left') === 98, 'recusar e tentar de novo repete o pedido sem gastar a ação');
const r2 = JSON.parse(run(`JSON.stringify(wtMove(G,${viz[1]},{pay:{tile:${ponte},to:${viz[1]}}}))`));
ok(run('wtX().left') === 98, 'pagar o pedágio não gasta ação (continua em 98)');
ok(r2.ok === true && !r2.toll && run('P.coins') === 900 && run(`batGet(B.id).tile`) === 'w' + viz[1], 'pagando, o batalhão atravessa e o ouro cai', 'ouro ' + run('P.coins'));
const r2b = JSON.parse(run(`JSON.stringify(wtMove(G,${ponte}))`));
ok(r2b.ok === true && run('P.coins') === 900, 'voltar para a ponte e depois para onde veio não cobra de novo');
run(`P.coins=1000; var Bb=batGet(B.id); Bb.tile="w"+${viz[0]}; Bb.de=-1`);
const r3 = JSON.parse(run(`JSON.stringify(wtMove(G,${viz[1]},{auto:true}))`));
ok(r3.ok === true && run('P.coins') === 900, 'com o aviso desligado (auto) paga sozinho');
run(`wtAnnex(G,${ponte}); P.coins=1000; var Bc=batGet(B.id); Bc.tile="w"+${viz[0]}; Bc.de=-1`);
const r4 = JSON.parse(run(`JSON.stringify(wtMove(G,${viz[1]}))`));
ok(r4.ok === true && run('P.coins') === 1000, 'o tile do jogador não cobra');
run(`wtDetach(G,${ponte})`);
// caravana e bandido não pagam: o pedágio só existe em wtMove do batalhão (nenhum ouro some no passo dos NPCs)
run('P.coins=1000'); run('wtStepNpcs(G,10)');
ok(run('P.coins') === 1000, 'os NPCs andando não mexem no ouro do jogador');
// bandidos tomam o tile em 2 a 3 ações
run(`STATE.tiles={}; STATE.wt=wtFresh(); wtX().actors=[{id:1,kind:"bandit",tile:${forte},str:8,stay:0}]; wtX().init=true; wtX().turn="commander"; STATE.bat={seq:0,list:[]}`);
ok(run(`wtOwnerOf(G,${forte})`) === null, 'a fortaleza começa neutra');
let passos = 0; for (; passos < 6 && run(`wtOwnerOf(G,${forte})`) !== 'bandit'; passos++) run('wtNpcStep(G)');
ok(run(`wtOwnerOf(G,${forte})`) === 'bandit' && passos >= 2 && passos <= 3, 'o bando toma a fortaleza em 2 a 3 ações', 'passos ' + passos);
ok(run('wtX().log.some(t=>t.indexOf("tomaram")>=0)'), 'o diário do turno anota a passagem tomada');
ok(run(`wtX().actors[0].tile`) === forte, 'o bando fica no tile enquanto toma');
// o bando que segura a passagem fica estacionado (não persegue o batalhão que passa perto)
run(`wtX().actors=[{id:1,kind:"bandit",tile:${forte},str:8,stay:0}]; STATE.bat={seq:0,list:[]}; var Bs=batCreate("player","w"+G.adj[${forte}][0].to,{soldier:5},{},1)`);
run('wtStepNpcs(G,8)');
ok(run('wtX().actors[0].tile') === forte, 'bando dono da passagem fica estacionado mesmo com o batalhão à vista');
// voltar do encontro: o batalhão recua para o tile de onde veio
run(`Bs.tile="w"+${forte}; Bs.de=G.adj[${forte}][0].to; wtX().enc={actor:1,bat:Bs.id,tile:${forte},mover:"player",layout:"campo",n:8,pend:true}`);
ok(run('wtEncCanBack(G)') === true, 'o encontro de pedágio de bandidos oferece voltar');
const vb = JSON.parse(run('JSON.stringify(wtEncBack(G))'));
ok(vb && vb.from === forte && run('batGet(Bs.id).tile') === 'w' + vb.to && run('wtX().enc') === null, 'voltar move o batalhão ao tile anterior e desfaz o encontro');
ok(run('wtEncBack(G)') === null, 'sem encontro, voltar não faz nada');
// encontro com bandidos num tile de pedágio deles: pagar 500 e passar
run(`wtX().enc={actor:1,bat:0,tile:${forte},mover:"player",layout:"campo",n:8,pend:true}; P.coins=600`);
ok(run('wtEncCanPay(G)') === true && run('wtEncPay(G)') === 500 && run('P.coins') === 100 && run('wtX().enc') === null, 'passar pelos bandidos custa 500 e desfaz o encontro');
ok(run('wtEncPay(G)') === 0, 'sem encontro não há o que pagar');
run(`wtDetach(G,${forte})`); run(`wtX().enc={actor:1,bat:0,tile:${forte},mover:"player",layout:"campo",n:8,pend:true}`);
ok(run('wtEncCanPay(G)') === false, 'tile neutro não vende passagem pelo encontro');
run('wtX().enc=null');
// torre: 3 usos por rodada, 50% de falha, alcance de 1 salto, a marca dura só a rodada
run('STATE.wt=wtFresh(); STATE.round=2');
let achou = 0, nada = 0, outros = 0; const dentro = new Set();
const ctr = run('G.nodes.find(n=>!n.mar&&n.tema!=="cidade"&&n.tema!=="vila"&&G.adj[n.id].length>=3).id');
const alc = new Set([ctr].concat(JSON.parse(run(`JSON.stringify(G.adj[${ctr}].map(x=>x.to))`))));
for (let rodada = 2; rodada < 62; rodada++) {
  run(`STATE.round=${rodada}; STATE.wt.tow=null`);
  for (let k = 0; k < 3; k++) { const r = JSON.parse(run(`JSON.stringify(wtTowerUse(G,${ctr}))`)); if (!r.ok) outros++; else if (r.tile < 0) nada++; else { achou++; if (!alc.has(r.tile)) outros++ } }
  const lim = run('wtTowerLeft()') === 0 && JSON.parse(run(`JSON.stringify(wtTowerUse(G,${ctr}))`)).why === 'limite'; if (!lim || rodada === 2) ok(lim, 'o quarto uso da rodada é recusado (limite de 3 por rodada)', 'rodada ' + rodada);
  if (rodada > 3) falhas += 0;
}
ok(outros === 0, 'toda dungeon achada fica no tile da torre ou nos vizinhos');
ok(achou > 0 && nada > 0 && Math.abs(nada / (achou + nada) - 0.5) < 0.2, 'cerca de metade dos usos não acha nada', 'achou ' + achou + ' nada ' + nada);
run('STATE.round=100; STATE.wt.tow=null; STATE.wt.dung=[{tile:' + ctr + ',r:100}]');
ok(run('wtDungeons().length') === 1, 'a marca vale na rodada em que foi achada');
run('STATE.round=101');
ok(run('wtDungeons().length') === 0, 'a marca some na rodada seguinte');
ok(run('wtTowerLeft()') === 3, 'os usos voltam na rodada seguinte');
// o save guarda usos e marcas
run('STATE.round=5; wtX().tow={r:5,n:2}; wtX().dung=[{tile:3,r:5}]; var cp=JSON.parse(JSON.stringify(STATE.wt)); wtApply(cp)');
ok(run('wtX().tow.n') === 2 && run('wtX().dung.length') === 1, 'usos da torre e dungeons marcadas sobrevivem ao salvar e carregar');
console.log(falhas ? '\n' + falhas + ' falha(s)' : '\nTudo OK');
process.exit(falhas ? 1 : 0);
