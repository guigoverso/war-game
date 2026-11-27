'use strict';
// Teste em Node do turno do mapa mundi (js/macro/worldturn.js, etapa 7). Uso (de dentro de tests/): node macro/worldturn.js
const { erros, run } = require('./carregar')();
let falhas = 0; const ok = (c, n, w) => { if (!c) falhas++; console.log((c ? 'OK    ' : 'FALHA ') + n + (w ? ' — ' + w : '')) };
ok(erros.length === 0, 'camada macro carrega (inclui worldturn.js)', erros.join(' | '));
run('var P={coins:2000}; resetState(); STATE.round=1; STATE.rd={now:[]}');
run('var F=wfCreate(11,{format:"pangeia",dominant:"plains"}); var G=wgBuild(F); var H=G.inicio.id');
ok(run('G.nodes.length')>10 && run('H')>=0, 'grafo de teste', 'nós ' + run('G.nodes.length'));

// pool e custo
ok(run('wtPoolMax(1)')===3 && run('wtPoolMax(3)')===5 && run('wtPoolMax(99)')===8, 'pool por nível (o último vale para os acima)');
ok(run('G.edges.every(e=>wtEdgeCost(e)>=1)') && run('(()=>{const t=G.edges.find(e=>e.kind==="trilha"),r=G.edges.find(e=>e.kind==="estrada");return !t||!r||wtEdgeCost(Object.assign({},r,{custo:t.custo,len:t.len}))<=wtEdgeCost(t)})()'), 'custo >= 1 e estrada nunca mais cara que trilha');

// turno do Líder (etapa 8.2): primeiro batalhão grátis; depois ponto + 1.000 de ouro; resgate só com o ponto
run('STATE.phase="leader"; STATE.rd.actions=5; STATE.rd.lvl=1');
ok(run('wtX().turn')==='leader', 'começa no turno do Líder');
const r1 = run('JSON.stringify(wtCreate(G,H))');
ok(JSON.parse(r1).ok && run('Ledger.get("gold")')===2000 && run('batList("player").length')===1 && run('STATE.rd.actions')===5, 'primeiro batalhão grátis (sem ouro nem ponto) na capital', r1.slice(0, 60));
ok(run('wtX().act')===run('batList("player")[0].id') && run('batList("player")[0].mun.pistol')===30 && run('batTotal(batList("player")[0])')===10, 'vira o ativo, com 10 soldados e o kit do comandante');
ok(run('wtCreate(G,H).why')==='teto', 'nível 1: só 1 batalhão (teto)');
run('STATE.rd.lvl=2');
ok(run('wtCreate(G,H).ok')===true && run('Ledger.get("gold")')===1000 && run('STATE.rd.actions')===4, 'nível 2: segundo custa 1 ponto + 1.000 de ouro');
ok(run('batTotal(batList("player")[1])')===10 && !('pistol' in run('batList("player")[1].mun')), 'nasce com 10 soldados e sem kit (inventário único)');
run('STATE.rd.lvl=3');
run('Ledger.set("gold",300)');
ok(run('wtCreate(G,H).why')==='ouro' && run('Ledger.get("gold")')===300 && run('STATE.rd.actions')===4, 'sem ouro: recusa e não mexe no saldo nem no ponto (nunca dívida)');
run('Ledger.set("gold",5000); STATE.rd.actions=0');
ok(run('wtCreate(G,H).why')==='ponto' && run('Ledger.get("gold")')===5000, 'sem ponto de Líder: recusa');
run('STATE.rd.actions=3');
ok(run('wtCreate(G,run=G.nodes.findIndex(n=>n.tema!=="cidade"&&n.tema!=="vila"&&!n.mar)).why')==='cidade', 'só em cidade ou vila sua');
ok(run('wtCreateCheck(G,H).why')==='' && run('wtCreateCheck(G,H).cost')===1000 && run('batList("player").length')===2, 'wtCreateCheck não cria nada');
run('wtX().turn="commander"'); ok(run('wtCreate(G,H).why')==='turno', 'criar só no turno do Líder'); run('wtX().turn="leader"');
// doação na mesma cidade
const [b1, b2] = JSON.parse(run('JSON.stringify(batList("player").map(b=>b.id))'));
ok(run(`wtDonate(G,${b1},${b2},4)`)===4 && run(`batTotal(batGet(${b2}))`)===14, 'doação entre batalhões na mesma cidade');
ok(run(`wtDonate(G,${b1},${b2},999)`)===6 && run(`batTotal(batGet(${b1}))`)===0, 'dá para zerar o doador (dividir)');
ok(run(`wtDonate(G,${b2},${b1},999)`)===20 && run(`batTotal(batGet(${b1}))`)===20, 'e voltar tudo');
run(`batGain(batGet(${b1}),"soldier",30)`);
ok(run(`wtDonate(G,${b2},${b1},5)`)===0, 'destino cheio (50) não recebe');
run(`batMove(batGet(${b2}),wtKey(G.nodes.find(n=>n.tema==="cidade"&&n.id!==H).id))`);
ok(run(`wtDonate(G,${b1},${b2},1)`)===0, 'doação recusada se não estão no mesmo tile');
run(`batMove(batGet(${b2}),wtKey(H))`);
run('wtX().turn="commander"'); ok(run(`wtDonate(G,${b1},${b2},1)`)===0, 'doar só no turno do Líder'); run('wtX().turn="leader"');
run(`batDestroy(${b2})`); run('STATE.rd.lvl=1');
// resgate: sem batalhão nenhum, o novo custa só o ponto e nasce sem soldados, com o kit
run(`batDestroy(${b1})`); run('STATE.rd.actions=2; Ledger.set("gold",10)');
ok(run('wtCreate(G,H).ok')===true && run('Ledger.get("gold")')===10 && run('STATE.rd.actions')===1 && run('batTotal(batList("player")[0])')===0 && run('batList("player")[0].mun.pistol')===30, 'resgate: só o ponto, sem soldados, com o kit');
run('batDestroy(batList("player")[0].id); STATE.rd.actions=0');
ok(run('wtCreate(G,H).why')==='ponto', 'resgate também exige o ponto');
ok(run('wtEnsureBat(G)')===null, 'wtEnsureBat não cria sozinho depois do primeiro do jogo');
run('batCreate("player",wtKey(H),{soldier:6},WT.kit,1); STATE.phase="commander"; wtX().turn="leader"');

// turno do Comandante
run('wtCommanderBegin(G)');
ok(run('wtX().turn')==='commander' && run('wtX().left')===3, 'turno do Comandante: 3 ações no nível 1');
ok(run('wtX().actors.filter(a=>a.kind==="bandit").length')===3 && run('wtX().actors.filter(a=>a.kind==="caravan").length')>=1, 'atores nascem: bandidos e caravanas');
ok(run('wtX().actors.every(a=>a.kind!=="bandit"||wgHops(G,[H])[a.tile]>=3)'), 'bandidos nascem longe da capital');
ok(run('wtSwitch(999)')===false, 'trocar para batalhão inexistente falha');

// mover: um vizinho por terra
run('var LT=x=>wgLandAdj(G,x).map(q=>q.to).filter(t=>!G.nodes[t].mar&&G.nodes[t].tema!=="cidade"&&G.nodes[t].tema!=="vila")');
const viz = run('wgLandAdj(G,H).map(q=>q.to).find(t=>!G.nodes[t].mar&&LT(t).filter(u=>u!==H).length>0)');
const pr = JSON.parse(run(`JSON.stringify(wtPath(G,H,${viz}))`));
ok(pr && pr.nodes[0] === run('H') && pr.nodes[pr.nodes.length - 1] === viz, 'wtPath liga origem e destino', 'acoes ' + (pr && pr.acoes));
run('wtX().actors=wtX().actors.filter(a=>a.kind==="caravan")');   // sem bandidos: andar sem encontro
const left0 = run('wtX().left');
const m = JSON.parse(run(`JSON.stringify(wtMove(G,${viz}))`));
ok(m.ok && !m.enc && run('wtActive().tile')===run(`wtKey(${viz})`) && run('wtX().left')===left0 - 1, 'wtMove: uma ação leva o batalhão ao vizinho');
ok(JSON.parse(run('JSON.stringify(wtMove(G,wtNode(wtActive().tile)))')).why==='sem-caminho', 'ficar parado não é movimento');
run('wtX().left=0');
ok(run(`wtMove(G,${run('H')}).why`)==='sem-acao', 'sem ações: recusa');
run('wtX().left=20');

// encontro: bandido no tile de destino
run('var cur=wtNode(wtActive().tile)');
const alvo = run('LT(cur).find(u=>u!==H)');
run(`wtX().actors.push({id:99,kind:"bandit",tile:${alvo},str:8,stay:0})`);
const m2 = JSON.parse(run(`JSON.stringify(wtMove(G,${alvo}))`));
ok(m2.ok && m2.enc && m2.enc.layout === 'campo' && m2.enc.n === 8, 'entrar no tile do bandido = encontro no campo');
ok(run(`wtMove(G,${run('H')}).why`)==='turno' && run('wtEnd(G).why')==='encontro', 'com encontro pendente não anda nem encerra');
ok(/modo=choque&inim=8/.test(run('wtBattleParams(wtX().enc)')), 'parâmetros do cenário de batalha pelo layout');
// vitória
run('Ledger.set("gold",500)');
const w1 = JSON.parse(run('JSON.stringify(wtBattleEnd(G,true,3))'));
ok(!w1.fim && run('wtX().enc')===null && run('wtX().actors.some(a=>a.id===99)')===false && run('batTotal(wtActive())')===3, 'vitória: bandido some, baixas saem do batalhão');
// derrota: morre, perde ouro, sem dívida
run(`wtX().actors.push({id:98,kind:"bandit",tile:${alvo},str:30,stay:0})`); run('wtX().enc={actor:98,bat:wtActive().id,tile:wtNode(wtActive().tile),mover:"player",layout:"campo",n:30}');
const d1 = JSON.parse(run('JSON.stringify(wtBattleEnd(G,false,0))'));
ok(d1.fim === true && run('batList("player").length')===0 && run('Ledger.get("gold")')===350 && run('wtX().left')===0, 'derrota: batalhão destruído, perde 150 de ouro, a rodada acaba');
run('Ledger.set("gold",40)'); run('batCreate("player","w1",{soldier:5},{},1)'); run('wtX().act=batList("player")[0].id');
run('wtX().enc={actor:0,bat:wtX().act,tile:1,mover:"npc",layout:"defesa",n:5}'); run('wtBattleEnd(G,false,0)');
ok(run('Ledger.get("gold")')===0, 'ouro baixo: perde só o que tem (nunca dívida)');
// sem batalhão: o turno do Comandante fica sem ninguém; o Líder cria o de resgate (só o ponto) no turno dele
run('wtX().turn="leader"; wtCommanderBegin(G)');
ok(run('batList("player").length')===0 && run('wtActive()')===null, 'sem batalhão: nada nasce sozinho no turno do Comandante');
run('wtX().turn="leader"; STATE.phase="leader"; STATE.rd.actions=1');
ok(run('wtCreate(G,H).ok')===true && run('wtActive().tile')===run('wtKey(H)') && run('Ledger.get("gold")')===0 && run('batTotal(wtActive())')===0, 'resgate no turno do Líder: grátis na capital, sem soldados');
run('STATE.phase="commander"; wtCommanderBegin(G); batGain(wtActive(),"soldier",6)');

// NPC dá um passo por ação; bandido caça batalhão à vista; defesa na cidade
run('wtX().actors=[]; wtX().left=10; wtX().enc=null');
const vz = viz;
run(`wtX().actors.push({id:77,kind:"bandit",tile:${vz},str:9,stay:0})`);
ok(run('wtStepNpcs(G,1)')===true && run('wtX().enc.layout')==='defesa' && run('wtX().enc.tile')===run('H'), 'bandido à vista ataca a cidade com batalhão: layout defesa');
run('wtX().enc=null; wtX().actors=[]');
// bandido vaga (sem entrar em cidade) e caravana bate e volta
run(`wtX().actors.push({id:70,kind:"bandit",tile:${alvo},str:9,stay:0})`);
const pos = []; for (let i = 0; i < 12; i++) { run('wtStepNpcs(G,1)'); pos.push(run('wtX().actors.length?wtX().actors[0].tile:-1')) }
ok(pos.every(t => t >= 0 && run(`G.nodes[${t}].tema`) !== 'cidade' || t === run('H')), 'bandido vaga e só entra em cidade para atacar batalhão');
run('wtX().actors=[]; wtX().enc=null; wtX().init=false; wtInit(G)');
const car = run('wtX().actors.find(a=>a.kind==="caravan")');
if (car) {
  const seq = []; for (let i = 0; i < 12; i++) { run('wtStepNpcs(G,1)'); seq.push(run('wtX().actors.find(a=>a.kind==="caravan").tile')) }
  ok(new Set(seq).size > 1 && seq.every(t => run(`G.nodes[${t}]`) !== undefined), 'caravana anda pela rota e volta');
}

// regras de ação: a ação inteira do jogador (até o movimento acabar) vem primeiro; só depois os NPCs dão UM passo cada
run('resetState(); STATE.round=1; STATE.rd={now:[]}; wtCreate(G,H); wtCommanderBegin(G); wtX().actors=[]; wtX().enc=null');
const longo = run('(()=>{let best=null,bl=0;for(const n of G.nodes){if(n.mar||n.id===H)continue;const p=wtPath(G,H,n.id);if(p&&p.ids.length>=4&&p.ids.length>bl){best=n;bl=p.ids.length}}return best&&best.id})()');
const pl = JSON.parse(run('JSON.stringify(wtPath(G,H,'+longo+'))'));
run('wtX().actors.push({id:5,kind:"caravan",tile:H,str:3,route:[H,'+viz+'],ri:0,dir:1,stay:0})');
const alc = run('wtReach(G,wtPath(G,H,'+longo+').ids,0)');
ok(alc >= 1 && alc < pl.ids.length, 'o movimento de uma ação não cobre um caminho longo', alc + ' de ' + pl.ids.length + ' tiles');
const pm = JSON.parse(run('JSON.stringify(wtMove(G,'+longo+'))'));
ok(pm.ok && pm.nodes.length === alc && pm.parcial && run('wtX().left')===2, 'uma ação anda até onde o movimento alcança e custa 1 ação');
ok(pm.steps.slice(0, -1).every(x => x.npc.length === 0) && pm.steps[pm.steps.length - 1].npc.length === 1 && pm.steps[pm.steps.length - 1].npc[0].id === 5, 'primeiro a ação inteira do jogador; depois UM passo de cada NPC');
ok(pm.gasto <= 6 || alc === 1, 'o gasto não passa do movimento da ação', 'gasto ' + pm.gasto);
const parou = run('wtActive().tile');
run('wtX().turn="leader"; wtCommanderBegin(G)');
ok(run('wtActive().tile')===parou && parou !== run('wtKey('+longo+')'), 'no turno seguinte fica parado onde parou (novo clique para continuar)');
run('batMove(wtActive(),wtKey(H)); wtX().left=99; wtX().actors=[]');
let ac = 0; while (run('wtActive().tile')!==run('wtKey('+longo+')') && ac < 20) { run('wtMove(G,'+longo+')'); ac++ }
ok(run('wtActive().tile')===run('wtKey('+longo+')') && ac > 1, 'várias ações chegam ao destino', ac + ' ações');

// batalha encerra a ação (os NPCs só andam depois dela) e explorar o tile adia os NPCs até o jogador sair
run('resetState(); STATE.round=1; STATE.rd={now:[]}; wtCreate(G,H); wtCommanderBegin(G); wtX().enc=null; wtX().actors=[]');
run('wtX().actors.push({id:8,kind:"caravan",tile:H,str:3,route:[H,'+viz+'],ri:0,dir:1,stay:0},{id:9,kind:"bandit",tile:'+viz+',str:4,stay:0})');
run('wtX().left=3');
const mb = JSON.parse(run('JSON.stringify(wtMove(G,'+viz+'))'));
ok(mb.enc && mb.steps.every(x => x.npc.length === 0) && run('wtX().left')===2 && run('wtX().actors.find(a=>a.id===8).tile')===run('H'), 'encontro no meio do caminho: a ação acaba e os NPCs ainda não andaram');
const bw = JSON.parse(run('JSON.stringify(wtBattleEnd(G,true,0))'));
ok(bw.steps.length === 1 && bw.steps[0].npc.some(m => m.id === 8) && run('wtX().actors.find(a=>a.id===8).tile')!==run('H'), 'depois da luta os NPCs dão o passo da ação');
const ex = JSON.parse(run('JSON.stringify(wtEnter(G))'));
const pos0 = run('wtX().actors.find(a=>a.id===8).tile');
ok(ex.ok && run('wtX().left')===1 && run('wtX().inTile')===run('wtNode(wtActive().tile)'), 'explorar o tile gasta a ação', 'ações ' + run('wtX().left'));
ok(run('wtMove(G,H).why')==='turno' && run('wtEnter(G).why')==='turno' && run('wtX().actors.find(a=>a.id===8).tile')===pos0, 'dentro do tile não anda e os NPCs ficam parados');
const lv = JSON.parse(run('JSON.stringify(wtLeave(G))'));
ok(lv.steps.length === 1 && run('wtX().inTile')===null && lv.steps[0].npc.length >= 1 && run('wtLeave(G)')===null, 'ao sair do tile os NPCs andam o que deviam');
run('wtEnter(G)'); const e2 = JSON.parse(run('JSON.stringify(wtEnd(G))'));
ok(e2.ok && run('wtX().inTile')===null && run('wtX().turn')==='leader', 'encerrar o turno dentro do tile sai dele antes');
// bandido alcança caravana: ela é tomada
run('wtX().actors=[]; wtX().enc=null; wtX().seq=0');
run('wtX().actors.push({id:1,kind:"caravan",tile:'+alvo+',str:3,route:[' + alvo + ',' + run('H') + '],ri:0,dir:1,stay:0},{id:2,kind:"bandit",tile:' + run('wgLandAdj(G,' + alvo + ')[0].to') + ',str:9,stay:0})');
run('wtX().log=[]');

// resolver por número e fim do turno
run('wtX().actors=[]; wtX().enc=null; wtX().turn="commander"; wtX().left=4; wtX().log=[]');
const ok1 = run('(()=>{const b=wtActive();b.sold={soldier:50};return wtX().enc=null})()');
run(`wtX().actors.push({id:55,kind:"bandit",tile:wtNode(wtActive().tile),str:6,stay:0}); wtSetEnc(G,wtX().actors[0],wtActive(),"player")`);
const au = JSON.parse(run('JSON.stringify(wtAutoBattle(G))'));
ok(au.venceu && au.baixas === 3 && run('batTotal(wtActive())')===47, 'resolver por número: 50 contra 6 vence e perde metade da força inimiga', JSON.stringify(au));
ok(run('wtEnd(G).ok')===true && run('wtX().turn')==='leader' && run('wtX().left')===0, 'encerrar turno: volta ao Líder');
ok(run('STATE.rd.now.length')>0 && run('wtX().log.length')===0, 'resumo foi para o livro (rdNow) e o diário esvaziou');
// fim do turno com encontro durante as ações que sobraram
run('wtX().turn="commander"; wtX().left=5; wtX().enc=null; wtX().actors=[]');
run(`wtX().actors.push({id:60,kind:"bandit",tile:${vz},str:9,stay:0}); wtActive().tile=wtKey(H)`);
const e1 = JSON.parse(run('JSON.stringify(wtEnd(G))'));
ok(!e1.ok && e1.why === 'encontro' && run('wtX().idle')>=0 && run('wtX().turn')==='commander', 'fim do turno: bandido alcança o batalhão parado e vira encontro');
run('wtBattleEnd(G,true,0)');
ok(run('wtEnd(G).ok')===true && run('wtX().turn')==='leader', 'resolvido o encontro, o turno encerra');
// cerco: cai no fim do turno sem batalhão
run('siegeStart("w7","1",true,null); wtX().turn="commander"; wtX().left=0; wtX().actors=[]');
run('wtEnd(G)');
ok(run('siegeGet("w7")')===null && run('tileOwner("w7",null)')==='1', 'cerco aberto cai no fim do turno do Comandante');
// batalhão chega ao tile cercado: defesa
run('tileStatesAll()["w9"]=undefined; delete tileStatesAll()["w9"]');
// salvar e carregar
const js = run('JSON.stringify(Object.assign({},wtX()))'); run('resetState()'); run('wtApply(JSON.parse(' + JSON.stringify(js) + '))');
ok(run('JSON.stringify(wtX())')===js, 'sobrevive ao salvar/carregar');
run('wtApply({turn:"x",actors:[null,{tile:"a"},{tile:3,str:5}],left:"q"})');
ok(run('wtX().actors.length')===1 && run('wtX().turn')==='leader' && run('wtX().left')===0, 'save torto: ignora inválidos');
run('wtApply(undefined)'); ok(run('wtX().actors.length')===0 && run('wtX().init')===false, 'save antigo: estado novo');
// determinismo
run('resetState(); STATE.round=1; STATE.rd={now:[]}'); run('wtInit(G)'); const A1 = run('JSON.stringify(wtX().actors)');
run('resetState(); STATE.round=1; STATE.rd={now:[]}'); run('wtInit(G)'); ok(run('JSON.stringify(wtX().actors)') === A1, 'mesma semente = mesmos atores');

// etapa 8.1: rodada 0, entrar no tile, relógio único, diário para o fim da rodada e grafo salvo
run('resetState(); STATE.round=1; STATE.rd={now:[]}; STATE.round=0; wtCommanderBegin(G)');
ok(run('wtX().left')===run('WT.prepPool'), 'rodada 0: pool de preparação (WT.prepPool)');
run('STATE.round=1; wtX().turn="leader"; wtCommanderBegin(G)');
ok(run('wtX().left')===run('wtPoolMax(1)'), 'rodada 1: pool pelo nível');
run('wtX().actors=[]');
const nb = run('(()=>{const b=wtActive(),a=G.adj[wtNode(b.tile)].find(x=>!G.nodes[x.to].mar);return a?a.to:-1})()');
const mv1 = JSON.parse(run('JSON.stringify(wtMove(G,' + nb + '))'));
ok(mv1.ok && run('wtActive().de')===run('G.inicio.id'), 'marcha guarda de onde o batalhão chegou (b.de)');
const en = JSON.parse(run('JSON.stringify(wtEnter(G))'));
ok(en.ok && en.tile===nb && en.de===run('G.inicio.id') && run('wtX().mv')===0, 'entrar no tile: gasta a ação e devolve o tile e a entrada', JSON.stringify(en));
run('wtLeave(G)');
ok(run('wtBand(0.1)')===0 && run('wtBand(0.3)')===1 && run('wtBand(0.6)')===2 && run('wtBand(0.9)')===3 && run('wtBand(1.3)')===1,
  'partes do dia (madrugada, manhã, tarde, noite)');
run('wtX().mv=0');
ok(run('wtClockSpend(0.3,3)')===0.3 && run('wtX().mv')===3, 'movimento abaixo de uma parte não passa o tempo');
ok(run('wtClockSpend(0.3,1)')===0.5 && run('wtX().mv')===0, 'a cada 4 de movimento passa uma parte (vai ao início da seguinte)');
ok(run('wtClockSpend(0.8,8)')===1.25, 'duas partes: a noite vira a manhã do dia seguinte');
ok(run('wtEnterTime(0.46)')===0.25 && run('wtEnterTime(0.8)')===0.75, 'entrar: o Campo começa no início da parte do dia');
run('wtX().turn="commander"; wtX().enc=null; wtX().inTile=null; wtX().left=0; wtX().log=["a","b"]');
ok(run('wtEnd(G,true).ok') && run('wtX().log.length')===2 && run('JSON.stringify(wtTake())')==='["a","b"]' && run('wtX().log.length')===0,
  'fim do turno guardando o diário para o fim da rodada (wtTake)');
run('delete STATE.wg');
ok(run('wtGraphLoad(F).nodes.length')===run('G.nodes.length') && run('STATE.wg.seed')===11, 'grafo novo é guardado em STATE.wg');
run('STATE.wg.nodes[0][3]="ruinas"');
ok(run('wtGraphLoad(F).nodes[0].tema')==='ruinas', 'grafo do save vale no lugar do gerado');
ok(run('(()=>{const U=wgUnpack(JSON.parse(JSON.stringify(wgPack(G))),F);return G.edges.every(e=>wtEdgeCost(e)===wtEdgeCost(U.edges[e.id]))})()'),
  'pack guarda o custo da aresta (caminho em ações igual ao carregar)');
console.log(falhas ? '\n' + falhas + ' FALHA(S)' : '\nTudo OK'); process.exit(falhas ? 1 : 0);
