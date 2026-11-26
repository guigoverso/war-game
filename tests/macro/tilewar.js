'use strict';
// Teste em Node da integração tile x macro (js/macro/tilewar.js, passo 10 da feature 12): cerco em ações, fadiga, cicatrizes e fim da batalha. Uso (de dentro de tests/): node macro/tilewar.js
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui tilewar.js)',erros.join(' | '));
run('resetState()');
// prazo por tipo de tile
ok(run('WAR.siege.city')===5&&run('WAR.siege.other')===3,'prazos: cidade 5, outro tile 3');
run('siegeStart("1,1","2",false,"W")');
ok(run('siegeGet("1,1").left')===3&&run('siegeStart("1,1","2",false,"W")')===false,'cerco de tile comum: 3 ações; segundo cerco no mesmo tile é recusado');
// a contagem desce a cada ação; chegar antes vira defesa
ok(run('siegeTick("1,1")')==='cerco'&&run('siegeGet("1,1").left')===2,'1 ação: restam 2');
const d=JSON.parse(run('JSON.stringify(siegeArrive("1,1"))'));
ok(d.tipo==='defesa'&&d.donoAtacante==='2'&&d.origem==='cerco'&&run('siegeGet("1,1")')===null,'batalhão chega a tempo: vira Defesa e o cerco acaba');
ok(run('tileOwner("1,1","player")')==='player','tile não caiu');
// prazo zera: tile cai com os POIs
run('siegeStart("2,2","3",true,"E")');
ok(run('siegeGet("2,2").left')===5,'tile de cidade: 5 ações');
run('siegeTick("2,2",4)');
ok(run('siegeTick("2,2")')==='caiu'&&run('tileOwner("2,2","player")')==='3'&&run('tileStatesAll()["2,2"].tomado')===true&&run('siegeGet("2,2")')===null,'5ª ação: o tile cai (dono = atacante, POIs vão junto)');
ok(run('siegeTick("9,9")')===null&&run('siegeArrive("9,9")')===null,'sem cerco: nada acontece');
// fim do turno: o que sobra do prazo derruba o tile (não passa para a rodada seguinte)
run('siegeStart("4,4","bandit",false,"N")');run('siegeStart("5,5","2",true,"S")');run('siegeTick("5,5")');
const cai=JSON.parse(run('JSON.stringify(siegeEndTurn())'));
ok(cai.length===2&&run('siegeList().length')===0&&run('tileOwner("4,4","player")')==='bandit'&&run('tileOwner("5,5","player")')==='2','fim do turno do Comandante: todo cerco aberto derruba o tile');
// resumo da rodada registra, sem toast
run('resetState();STATE.rd={now:[]};siegeStart("6,6","2",false,"W");siegeTick("6,6")');
ok(run('STATE.rd.now.length')===2&&/Cerco/.test(run('STATE.rd.now[0]')),'resumo da rodada registra o início e a contagem do cerco');
// sobrevive a salvar/carregar (JSON puro)
const js=run('JSON.stringify(STATE.tiles)');run('STATE.tiles=JSON.parse('+JSON.stringify(js)+')');
ok(run('siegeGet("6,6").left')===2,'cerco sobrevive ao salvar/carregar');
// improviso: só com batalha, cerco ou batalhão inimigo
run('resetState()');
ok(run('tileWarWhy("1,1",null)')===null&&run('tileWarWhy("1,1",{tipo:"defesa"})')==='batalha','improviso: nada sem motivo; batalha liga');
run('siegeStart("1,1","2",false,"W")');ok(run('tileWarWhy("1,1",null)')==='cerco','improviso: cerco liga');
run('batCreate("2","7,7",{soldier:5},{},1)');run('batCreate("player","8,8",{soldier:5},{},1)');
ok(run('tileWarWhy("7,7",null)')==='batalhao'&&run('tileWarWhy("8,8",null)')===null,'improviso: batalhão inimigo liga; o do jogador não');
// fadiga: só com guerra ativa
run('var g=({camps:{"2":1},fat:0,nfat:{}})');
ok(run('tileWarFatigue(null,{modo:"ataque",res:"vitoria"})')===null&&run('tileWarFatigue({camps:{},fat:0},{modo:"ataque",res:"vitoria"})')===null,'sem guerra ativa: não mexe em fadiga');
run('tileWarFatigue(g,{modo:"ataque",res:"vitoria",fid:"2"})');
ok(run('g.fat')===2&&run('g.nfat["2"]')===1,'ataque vencido: jogador +2 (attackPoi), inimigo +1');
run('g.fat=0;g.nfat={};tileWarFatigue(g,{modo:"defesa",res:"vitoria",fid:"2"})');
ok(run('g.fat')===0.25,'defesa vencida: quase nada (0,25)');
run('g.fat=0;tileWarFatigue(g,{modo:"defesa",res:"derrota",fid:"2"})');
ok(run('g.fat')===1&&run('g.nfat["2"]')===0,'derrota: opFailed (1) e o vencedor perde fadiga (mínimo 0)');
run('g.fat=19.5;tileWarFatigue(g,{modo:"ataque",res:"derrota"})');
ok(run('g.fat')===20,'fadiga limitada ao teto (20)');
// cicatrizes
run('resetState()');
ok(run('tileScars("3,3").length')===0,'tile sem luta: sem cicatriz');
run('tileScarAdd("3,3","defesa",true)');
ok(run('tileScars("3,3").length')===2,'luta grande: 2 cicatrizes');
for(let i=0;i<5;i++)run('tileScarAdd("3,3","ataque",true)');
ok(run('tileScars("3,3").length')===6,'teto de cicatrizes por tile (6)');
// fim da batalha
run('resetState()');
run('var b=batCreate("player","3,3",{soldier:30,heavy:20},{},1);var o={key:"3,3",war:{camps:{"2":1},fat:0,nfat:{}},fid:"2"}');
run('batSnapshot()');
let r=run('tileBattleEnd(Object.assign({},o,{modo:"ataque",res:"vitoria",grande:true,bat:b.id,mortos:12}))');
ok(r.tile==='conquistado'&&run('batTotal(b)')===38&&run('tileOwner("3,3",null)')==='player','ataque vencido: tile seu, 12 mortos saem do batalhão');
ok(run('batTotal(batSaved().list[0])')===38,'foto da batalha descartada ao fim');
run('var b2=batCreate("player","4,4",{soldier:40},{},3)');
r=run('tileBattleEnd(Object.assign({},o,{key:"4,4",modo:"defesa",res:"derrota",grande:true,bat:b2.id,mortos:5}))');
ok(r.bat==='destruido'&&run('batGet(b2.id)')===null&&r.tile==='perdido'&&run('tileOwner("4,4","player")')==='2','derrota grande (defesa): batalhão destruído, tile tomado');
run('var b3=batCreate("player","5,5",{soldier:30},{},3)');
r=run('tileBattleEnd(Object.assign({},o,{key:"5,5",modo:"pequena",res:"derrota",grande:false,bat:b3.id,mortos:4,origem:"5,4"}))');
ok(r.bat==='recuou'&&run('b3.tile')==='5,4'&&run('batTotal(b3)')===26&&run('tileOwner("5,5","x")')==='x','derrota pequena (branda): perde só os mortos, recua ao tile de origem, tile não muda');
r=run('tileBattleEnd(Object.assign({},o,{key:"6,6",modo:"choque",res:"vitoria",grande:true,war:null}))');
ok(r.tile===null&&r.fat===null&&run('tileScars("6,6").length')===2,'choque vencido sem guerra: tile não muda, sem fadiga, deixa cicatriz');
process.exit(falhas?1:0);
