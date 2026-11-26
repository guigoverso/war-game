'use strict';
// Teste em Node do batalhão no estado (js/macro/battalion.js, passo 9 da feature 12). Uso (de dentro de tests/): node macro/battalion.js
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui battalion.js)',erros.join(' | '));
run('resetState()');
ok(run('JSON.stringify(STATE.bat)')==='{"seq":0,"list":[]}','resetState: sem batalhões');
// criar e teto de 50
run('var b1=batCreate("player","3,4",{soldier:30,heavy:15,sniper:10,xyz:5},{pistol:20},1)');
ok(run('batTotal(b1)')===50&&run('b1.sold.sniper')===5&&run('"xyz" in b1.sold')===false,'teto 50: excesso cortado, tipo desconhecido ignorado');
ok(run('batElites(b1)')===10&&run('batCommons(b1)')===40,'10 elites + 40 comuns');
ok(run('batGain(b1,"soldier",3)')===0,'cheio: ganho além do teto se perde');
// limite de batalhões por nível
ok(run('batCreate("player","5,5",{soldier:5},{},1)')===null,'nível 1: só 1 batalhão do jogador');
ok(run('batCreate("player","5,5",{soldier:5},{},2)')!==null&&run('batCreate("player","6,6",{soldier:5},{},2)')===null,'nível 2: até 2');
ok(run('batCreate("bandit","7,7",{soldier:99},{},1).sold.soldier')===50&&run('batCreate("2","8,8",{},{},1)')!==null,'facção e bandidos não entram no limite do jogador');
// baixas
ok(run('batLose(b1,"soldier",100)')===30&&run('"soldier" in b1.sold')===false,'baixas por tipo: removido o que havia; tipo zerado some');
ok(JSON.stringify(run('batLoseAny(b1,3)'))==='{"heavy":3}'&&run('batTotal(b1)')===17,'baixas sem tipo: do tipo mais numeroso');
// doação respeita o teto do destino
run('var b2=batList("player")[1]');
ok(run('batDonate(b1,b2,"heavy",12)')===12&&run('batTotal(b2)')===17&&run('b1.sold.heavy')===0||run('"heavy" in b1.sold')===false,'doação passa soldados entre batalhões');
run('var b3=batCreate("bandit","9,9",{soldier:48},{},1)');
ok(run('batDonate(b2,b3,"soldier",10)')===2&&run('batTotal(b3)')===50,'doação limitada pelo teto do destino');
// consulta e movimento
run('batMove(b2,"3,5")');
ok(run('batAt("3,5").length')===1&&run('batAt("3,4").length')===1&&run('batList("bandit").length')===2,'batAt/batList');
// destruição
ok(run('batDestroy(b2.id)')===true&&run('batGet(b2.id)')===null&&run('batDestroy(999)')===false,'derrota: batalhão destruído e removido');
// foto da batalha
run('batSnapshot()');run('batLose(b3,"soldier",40)');
ok(run('batTotal(batSaved().list.find(x=>x.id===b3.id))')===50&&run('batTotal(b3)')===10,'save em batalha grava a foto de antes dela');
run('batSnapDrop()');
ok(run('batTotal(batSaved().list.find(x=>x.id===b3.id))')===10,'sem batalha: grava o estado vivo');
// salvar e carregar (JSON puro), com lixo
const js=run('JSON.stringify(batSaved())');run('resetState()');run('batApply(JSON.parse('+JSON.stringify(js)+'))');
ok(run('JSON.stringify(batSaved())')===js&&run('batCreate("2","1,1",{soldier:1},{},1).id')>run('Math.max(...batList().filter(b=>b.tile!=="1,1").map(b=>b.id))'),'sobrevive ao salvar/carregar; novos ids não repetem');
run('batApply(undefined)');ok(run('batList().length')===0,'save antigo (sem bat): nenhum batalhão');
run('batApply({seq:1,list:[null,{id:1,tile:3,dono:"x"},{id:2,tile:"a",dono:"player",sold:{soldier:80}}]})');
ok(run('batList().length')===1&&run('batTotal(batList()[0])')===50,'save torto: ignora inválidos e corta o excesso');
process.exit(falhas?1:0);
