'use strict';
// Teste em Node do estado e da economia do tile (js/macro/tilestate.js, etapa 4F). Uso (de dentro de tests/): node macro/tilestate.js
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui tilestate.js)',erros.join(' | '));
run('resetState()');
ok(run('JSON.stringify(STATE.tiles)')==='{}'&&run('tileKey(3,4)')==='3,4','resetState zera STATE.tiles; chave "i,j"');
// dono
ok(run('tileOwner("3,4","bandit")')==='bandit'&&run('tileStHas("3,4")')===false,'sem ficha: dono = o da semente, e consultar não cria ficha');
ok(run('tileOwnerSync("3,4","bandit","player")')===true&&run('tileOwner("3,4","bandit")')==='player','principal tomado: dono do tile muda');
ok(run('tileOwnerSync("3,4","bandit","player")')===false,'mesmo dono de novo: sem mudança');
ok(run('tileOwnerSync("3,4","bandit","bandit")')===true&&run('tileOwner("3,4","bandit")')==='bandit'&&run('STATE.tiles["3,4"].dono')===null,'volta ao dono da semente: ficha sem dono');
// diferenças
run('tileDiffSet("3,4","nivel",7,3);tileDiffSet("3,4","mortos","a",1);tileDiffSet("3,4","loot","b",{x:1})');
ok(run('tileDiffGet("3,4","nivel",7)')===3&&run('tileDiffGet("3,4","nivel",8,0)')===0,'diferença lida; ausente = padrão');
run('tileDiffSet("3,4","nivel",7,null)');
ok(run('"nivel" in STATE.tiles["3,4"].dif')===false&&run('Object.keys(tileDiffs("3,4","mortos")).length')===1,'diferença apagada some do estado');
// guerra
run('tileWarSet("3,4",[{tipo:"fortcamp",zona:"a",dono:"player",lado:"atacante"},{tipo:"trench",zona:"b",dono:"bandit",lado:"defensor"}],{tipo:"defesa",entradaAtacante:"E",entradaDefensor:null,estacionado:null,ajustada:true})');
ok(run('tileWarList("3,4").length')===2&&run('tileWarBattle("3,4").tipo')==='defesa'&&run('"ajustada" in tileWarBattle("3,4")')===false,'lista de POIs de guerra e batalha guardadas');
run('tileWarSet("3,4",[],null)');
ok(run('tileWarList("3,4").length')===0&&run('tileWarBattle("3,4")')===null,'batalha encerrada limpa a lista');
// produção
ok(JSON.stringify(run('tileProduction("fazenda",1)'))==='{"food":2}'&&JSON.stringify(run('tileProduction("mina",3)'))==='{"ore":4}'&&JSON.stringify(run('tileProduction("serraria",2)'))==='{"wood":3}','recurso: base + perLvl × nível ('+JSON.stringify(run('tileProduction("fazenda",1)'))+')');
ok(run('tileProduction("vila",1).gold')===22&&run('tileProduction("vila",5).gold')===22,'vila: imposto 12 + 5 × rank (22), independe do nível do líder');
ok(Object.keys(run('tileProduction("cidade",1)')).length===0&&Object.keys(run('tileProduction("passagem",1)')).length===0&&Object.keys(run('tileProduction("ruinas",1)')).length===0,'cidade, passagem e ruínas: sem produção de tile');
ok(run('["fazenda","mina","serraria","animais"].every(t=>!("gold" in tileProduction(t,1)))'),'tiles de recurso não geram imposto');
// estoque por rodada
ok(Object.keys(run('tileProdTick("5,5","fazenda",1,1,null)')).length===0,'tile sem dono não produz');
run('tileOwnerSet("5,5","player")');
ok(run('tileProdTick("5,5","fazenda",1,1,null).food')===2&&Object.keys(run('tileProdTick("5,5","fazenda",1,1,null)')).length===0,'produz uma vez por rodada (repetir a mesma rodada não soma)');
run('tileProdTick("5,5","fazenda",2,1,null)');
ok(run('tileProdStock("player",[{key:"5,5"},{key:"3,4"}]).food')===4,'estoque soma 2 rodadas');
ok(run('tileProdCollect("5,5").food')===4&&run('tileProdCollect("5,5").food')===undefined,'recolher zera o estoque');
run('tileOwnerSet("6,6","bandit");tileProdTick("6,6","vila",1,1,null)');
ok(run('tileProdStock("player",[{key:"6,6"}]).gold')===undefined&&run('tileProdStock("bandit",[{key:"6,6"}]).gold')===22,'estoque por dono: imposto da vila fica com quem a tem');
// salvar e carregar: JSON puro
const js=run('JSON.stringify(STATE.tiles)');run('resetState()');run('STATE.tiles=JSON.parse('+JSON.stringify(js)+')');
ok(run('JSON.stringify(STATE.tiles)')===js&&run('tileOwner("5,5")')==='player','estado do tile sobrevive ao salvar/carregar (JSON puro)');
process.exit(falhas?1:0);
