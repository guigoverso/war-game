'use strict';
// Ferramenta de teste da camada macro em Node (sem navegador): carrega js/core/state + js/macro e confere que carrega sem Three.js/DOM.
// Uso (de dentro de tests/): node macro/run.js
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega sem navegador',erros.join(' | '));
const tipos=['ECON','Ledger','STATE','Hooks'].map(n=>[n,run('typeof '+n)]);
for(const [n,t] of tipos)ok(t!=='undefined',n+' existe',t);

// Economia sem navegador: mapa falso (só a lista de cidades), initEconomy sorteia o tipo de cada cidade e as necessidades; confere que é determinístico
// e que cada cidade ganhou ficha. Estende-se com rodadas e facções quando esses sistemas saírem de misturados (etapas 5 e 7 do plano).
run(`var WORLD={seed:11,cities:Array.from({length:6},(_,i)=>({id:i,cx:100*i,cz:50,name:'C'+i,rank:i,owner:i?'enemy':'player',home:i===0,half:40,gates:[],keepers:[]}))};function whOf(c){return c.wh||(c.wh={})}resetState();`);   // whOf: o armazém real é de js/warehouse.js (ainda misto)
let r1,r2;
try{
  run('initEconomy()');r1=run('JSON.stringify(STATE.rd.cities)');
  run('resetState();initEconomy()');r2=run('JSON.stringify(STATE.rd.cities)');
  ok(Object.keys(JSON.parse(r1)).length===6,'initEconomy: 6 cidades com ficha');
  ok(r1===r2,'initEconomy: mesma semente, mesma economia');
  ok(run('Object.values(STATE.rd.cities).every(e=>e.type&&e.pct)'),'cada cidade tem tipo e necessidades');
}catch(e){ok(false,'economia em Node','initEconomy: '+e.message)}
process.exit(falhas?1:0);
