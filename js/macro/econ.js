'use strict';
// ---------- Economia das cidades (Fase 4): números (ECON), ações do líder, necessidades, humor, imposto, produção e estoque das lojas ----------
// Separado de rounds.js. Os números de balanceamento da economia ficam todos aqui.
const RES4=['food','ore','wood','leather','gold'];   // tudo o que uma cidade pode produzir (foco)
const NEEDS=['food','ore','wood','leather'];   // o que as cidades precisam suprir (o ouro é só economia: imposto e produção)
// humor da cidade (resultado da última rodada): próspera = alguma meta acima (gera bônus); contente = todas atendidas; descontente = faltou algo
const MOOD={rich:{n:'Próspera',icon:'😄',col:'#ffd23a'},ok:{n:'Contente',icon:'🙂',col:'#9fe89f'},upset:{n:'Descontente',icon:'😠',col:'#ff8a8a'}};
// ---------- números da economia (todos juntos para ajustar com facilidade) ----------
// baseNeed: unidades de um recurso para 100% de necessidade (150% = ×1,5; 200% = ×2) • prodBase/prodRank: produção em abundância por rodada (+1 se próspera)
// goldMul: ouro por unidade na cidade de foco dinheiro • taxBase/taxRank: imposto por rodada (×1,5 se próspera, 0 se descontente) • caravan: custo em ouro
const ECON={baseNeed:4,prodBase:7,prodRank:1,goldMul:8,taxBase:25,taxRank:10,caravan:300,shopMul:2,tradeGold:0.5};   // tradeGold: fração da produção de ouro da cidade parceira que vira ouro por rodada para quem negocia com ela   // shopMul: o estoque da Loja da cidade = (produção da cidade) × shopMul para o recurso dela (25% dos outros)
const TAX_BASE=ECON.taxBase,TAX_RANK=ECON.taxRank;
// ações do líder (Fase 4A): quanto cada decisão gasta por rodada. 0 = não gasta (hoje a caravana é só ouro; o porto e, no futuro, paz e guerra são grátis).
// Para a caravana também gastar ação, troque caravan para 1. Custos de evoluir cidade e facção: LVL, abaixo). capital/city = evoluir facção/cidade (1 ação cada, além do limite de 1 por rodada).
ECON.rebelUps=4;   // rodadas seguidas sem suprimentos até a rebelião: Descontente (1), (0), (−1) e então a rebelião
ECON.act={battalion:1,caravan:1,capital:1,city:1,give:1,relic:1,ally:1,mission:1};   // F4: criar caravana, doar ouro, doar relíquia e fechar aliança gastam 1 ação do líder cada (evita subir a relação com várias facções num turno)
ECON.loot={items:6,coins:40,perRank:15};   // saque: unidades de um dos produtos da rota + ◉ (base + por nível da cidade dona)
const TYPE_NAME={food:'Alimentos',ore:'Minérios',wood:'Madeira',leather:'Couro',gold:'Dinheiro',port:'Porto'};
const CITY_COLS=[0xe0402a,0x2aa04a,0xe8b820,0x8a3ac8,0x20b0c8,0xe87820,0xd0409a,0x8a8a8a];   // cor de identidade de cada cidade (faixa da bandeira)
const resIcon=k=>DATA.resources[k].icon,resName=k=>DATA.resources[k].name;

Hooks.on('round',()=>{for(const c of WORLD.caves)if(!(c.nextRenew>STATE.round)){c.renew=true;c.nextRenew=STATE.round+3+Math.floor(Math.random()*3)}});   // cada gruta renova no máximo a cada 3–5 rodadas (cada uma no seu ritmo)   // grutas renovam baú e animais (poi.js, renewCave)
Hooks.on('resetState',()=>{STATE.phase='commander';STATE.rd={lvl:1,actions:1,cities:{},routes:[],rbuf:{},debuff:{},report:[],now:[],hallCity:0,clv:{}}});
// ---------- ações do líder: um só lugar para gastar e conferir ----------
const isLeader=()=>STATE.phase==='leader';
const actCost=kind=>ECON.act[kind]||0;
const canAct=kind=>isLeader()&&STATE.rd.actions>=actCost(kind);
function spendAct(kind){if(!canAct(kind))return false;STATE.rd.actions-=actCost(kind);return true}
// ---------- níveis da facção e das cidades do jogador (valores a calibrar jogando) ----------
// facMax/cityMax: níveis máximos (facção = ações por rodada; cidade 1 sem muros, 2 cerca, 3 paliçada, 4 paliçada com atiradores, 5 pedra com atiradores).
// facCost[n]: custo para ir do nível n ao n+1 ({gold,food,ore,wood,leather}); facReq[n]: o que a facção precisa ter para ir de n a n+1
// (pois = POIs seus, cities = cidades suas contando a capital, maxCities = cidades no nível máximo; os requisitos de cada nível somam os dos anteriores).
// cityProd/cityTax: ganho de produção e de imposto por nível da cidade acima do 1 (só cidades do jogador). npcRank: rank da cidade -> nível visual.
const LVL={facMax:5,cityMax:5,
  facCost:{1:{gold:900,food:20,ore:20},2:{gold:1800,food:40,ore:40},3:{gold:3000,food:40,ore:40,wood:40,leather:40},4:{gold:4500,food:60,ore:60,wood:60,leather:60}},
  facReq:{1:{},2:{pois:2},3:{pois:2,cities:3},4:{pois:2,cities:3,maxCities:3}},
  cityProd:1,cityTax:10};
const LVL_RES_ICON={gold:'◉',food:'🍖',ore:'⛏',wood:'🪵',leather:'🟤'};
const cityMine=()=>WORLD.cities.filter(c=>c.owner==='player');
// nível visual inicial de uma cidade pelo rank e pelo muro (NPC e cidade anexada): 1-2 sem muros, 3-4 cerca, 5-6 paliçada (4) ou pedra (5)
const cityLvlFromRank=c=>c.rank>=5?(c.wallType==='stone'?5:4):c.rank>=3?2:1;
function cityLvl(c){   // cidade do jogador (capital incluída): rd.clv[id]; NPC não evolui (1). Grava na 1ª leitura para não flutuar
  if(c.owner!=='player')return 1;const rd=STATE.rd;if(!rd.clv)rd.clv={};
  if(!rd.clv[c.id])rd.clv[c.id]=Math.min(LVL.cityMax,c.home?rd.lvl||1:cityLvlFromRank(c));   // capital sem entrada herda o nível antigo (rd.lvl)
  return rd.clv[c.id];
}
const lvlSteps=c=>c.owner==='player'?cityLvl(c)-1:0;   // níveis acima do 1 (só cidade do jogador; NPC segue pelo rank)
const cityLvlGain=c=>{const n=lvlSteps(c);return{lvl:cityLvl(c),prod:LVL.cityProd*n,tax:LVL.cityTax*n}};   // ganho do nível atual (para as telas)
const facLvl=()=>STATE.rd.lvl||1;
// recursos do custo: ouro, comida, minério e madeira no Ledger; couro vem do inventário (msHas/msTake)
const lvlHave=k=>k==='leather'?msHas('leather'):Ledger.get(k);
const lvlCanPay=cost=>!Ledger.anyDebt()&&Object.keys(cost).every(k=>lvlHave(k)>=cost[k]);
function lvlPay(cost){   // paga o custo todo ou nada
  if(!lvlCanPay(cost))return false;
  for(const k in cost){if(k==='leather')msTake('leather',cost[k]);else Ledger.add(k,-cost[k])}
  return true;
}
const citiesAtMax=()=>cityMine().filter(c=>cityLvl(c)>=LVL.cityMax).length;
const facUpDone=()=>STATE.rd.facUpR===STATE.round;   // já evoluiu a facção nesta rodada
const cityUpDone=()=>STATE.rd.cityUpR===STATE.round;   // já evoluiu uma cidade nesta rodada (só 1 cidade por rodada)
// motivo de não poder evoluir ('' = pode); a tela mostra o texto, canFacUp/canCityUp só olham se está vazio
function cityUpWhy(c){
  if(c.owner!=='player')return 'Só nas suas cidades.';
  if(!isLeader())return 'Só no turno do Líder.';
  if(cityLvl(c)>=LVL.cityMax)return 'Nível máximo.';
  if(cityUpDone())return 'Você já evoluiu uma cidade nesta rodada.';
  if(!canAct('city'))return 'Sem ações do líder nesta rodada.';
  if(Ledger.anyDebt())return 'Com dívida não é possível comprar.';
  return lvlCanPay(cityCostOf(c))?'':'Faltam recursos.';
}
const canCityUp=c=>!cityUpWhy(c);
const rbufOn=r=>!!(STATE.rd&&STATE.rd.rbuf&&STATE.rd.rbuf[r]);
const debOn=r=>!!(STATE.rd&&STATE.rd.debuff&&STATE.rd.debuff[r]);   // debuff: faltou suprimento na rodada anterior
// dívida em itens (o que faltou e ainda não foi pago) das cidades do jogador
function cityItemDebt(){return false;   // (recursos não geram dívida)
  /*if(!STATE.rd||!STATE.rd.cities||typeof WORLD==='undefined')return false;return WORLD.cities.some(c=>c.owner==='player'&&STATE.rd.cities[c.id]&&STATE.rd.cities[c.id].debt&&Object.keys(STATE.rd.cities[c.id].debt).some(k=>STATE.rd.cities[c.id].debt[k]>0))*/}
const DEB_TXT={leather:'coletes (seu e dos soldados) custam o dobro',food:'soldados e pratos da taverna custam o dobro',ore:'armas, munição e conserto custam o dobro',wood:'missões pagam 80% menos; a loja cobra o dobro e compra por 50%'};
// bônus de entrega: valor fixo, vale até o fim da rodada (ver seção 14 do design)
addPriceFx('rbuf',ctx=>{   // cada efeito leva o texto que aparece no popup "?" das lojas
  const k=ctx.kind,c=ctx.city,mine=!c||c.owner==='player',out=[],add=(txt,mul)=>out.push({txt,mul}),arms=k==='weapon'||k==='ammo'||k==='repair';
  if(mine&&rbufOn('ore')&&arms)add('Minério entregue (bônus da rodada)',0.8);
  if(mine&&rbufOn('food')&&k==='soldierup')add('Comida entregue (bônus da rodada)',0.8);
  if(mine&&rbufOn('leather')&&k==='vest')add('Couro entregue (bônus da rodada)',0.8);
  if(mine&&rbufOn('gold')&&k==='healhp')add('Ouro entregue (bônus da rodada)',0.8);
  // debuffs (faltou suprimento): preços sobem; a quantidade a suprir não muda
  if(mine&&debOn('food')&&(k==='recruit'||k==='soldierup'||k==='tavern'))add('Faltou comida na rodada passada',2);   // soldados e pratos da taverna
  if(mine&&debOn('ore')&&arms)add('Faltou minério na rodada passada',2);
  if(mine&&debOn('leather')&&k==='vest')add('Faltou couro na rodada passada',2);   // coletes (seu e dos soldados)
  if(mine&&debOn('wood')&&k==='buy')add('Faltou madeira na rodada passada',2);   // Loja
  if((k==='heal'||k==='healhp')&&c&&moodOf(c)==='upset')add('Cidade descontente (curas)',2);
  if(c&&moodOf(c)==='rich')add('Cidade próspera',0.9);
  return out;
},60);
// recompensas das missões: efeitos em lista (mesmo formato dos preços) para o selo "?" do quadro; somam em %
const rewardFx=()=>{const o=[];if(meetCampReward()!==1)o.push({txt:'Reunião das facções: recompensas '+(meetCampReward()>1?'+':'')+Math.round((meetCampReward()-1)*100)+'%',mul:meetCampReward()});if(rbufOn('wood'))o.push({txt:'Madeira entregue (bônus da rodada)',mul:1.1});if(debOn('wood'))o.push({txt:'Faltou madeira na rodada passada',mul:0.2});return o};
const rewardReport=()=>{const rows=rewardFx().map(e=>({txt:e.txt,mul:e.mul,ks:['r']})),m=priceMulOf(rows);return{lo:m,hi:m,rows}};
const qPay=q=>Math.round(q.reward*priceMulOf(rewardFx()));

// ---------- economia das cidades ----------
const ec=c=>STATE.rd.cities[c.id];
const focusOf=c=>{const e=ec(c);return e.type==='port'?e.pf:e.type};
const maxActions=()=>STATE.rd.lvl+(warActive()?WAR.leaderPointsBonus:0);   // guerra: +bônus de pontos de líder
function portPct(pf,ps){   // porto: o jogador escolhe o que produz (0%) e o que falta (200%); o resto fica em 150% / 100% (só recursos físicos são necessidades)
  const p={},rest=NEEDS.filter(r=>r!==pf&&r!==ps);if(NEEDS.includes(pf))p[pf]=0;p[ps]=200;rest.forEach((r,i)=>p[r]=[150,100,100][i]);return p;
}
// tipo de cada cidade (food/ore/wood/leather/gold/port) por semente: o mundo usa já na geração (edifício do tipo, city.js) e a economia na rodada 0.
// done = cidades que já têm economia (salvamento); só as que faltam são sorteadas.
function cityTypePlan(cities,seed,done){
  done=done||{};
  const hasPort=Object.values(done).some(e=>e.type==='port');
  // o porto é uma cidade forte que não é a capital e fica no litoral: a mais forte entre as litorâneas; sem litoral, o mundo não tem porto
  const strong=cities.filter(c=>!c.home).sort((a,b)=>(b.rank||0)-(a.rank||0)||a.id-b.id);
  const cand=strong.find(c=>c.coastal);
  // tipos distribuídos por rodízio (embaralhado pela semente): nenhum tipo some nem domina, mesmo com poucas cidades
  const gr=new RNG((seed*7919+13)>>>0),kinds=gr.shuffle(['food','ore','wood','leather','gold']),ord=gr.shuffle(cities.filter(c=>!done[c.id]&&!(!hasPort&&cand&&cand.id===c.id))),assign={};
  ord.forEach((c,i)=>assign[c.id]=kinds[i%kinds.length]);
  if(!hasPort&&cand&&!done[cand.id])assign[cand.id]='port';
  return assign;
}
// Semente da economia: no mundo novo cada tile tem a sua (a cidade de cada tile é a de índice 0; sem isto todas teriam o mesmo tipo e as mesmas necessidades).
const econSeed=seed=>seed+(mapMundoOn()&&WORLD.win&&typeof WORLD.win.node==='number'?(WORLD.win.node+1)*7919:0);
function initEconomy(){
  const rd=STATE.rd;if(!rd.cities)rd.cities={};
  const assign=cityTypePlan(WORLD.cities,econSeed(WORLD.seed),rd.cities);
  for(const c of WORLD.cities){
    if(rd.cities[c.id])continue;
    const rng=new RNG((econSeed(WORLD.seed)*31+c.id*977+5)>>>0);
    const type=assign[c.id];
    const e={type,pct:{},pf:type==='port'?rng.pick(RES4):type,ps:'',got:{},carry:{}};
    if(type==='port'){do{e.ps=rng.pick(NEEDS)}while(e.ps===e.pf);e.pct=portPct(e.pf,e.ps)}
    else{   // foco = 0%; as outras três necessidades sorteiam 200/150/100
      const others=NEEDS.filter(r=>r!==type),lv=[200,150,100,100].slice(0,others.length);
      for(let i=lv.length-1;i>0;i--){const j=rng.int(0,i);const t=lv[i];lv[i]=lv[j];lv[j]=t}
      e.pct[type]=0;others.forEach((r,i)=>e.pct[r]=lv[i]);
    }
    rd.cities[c.id]=e;
  }
  for(const c of WORLD.cities){const e=rd.cities[c.id];if(e&&e.type!=='port'&&NEEDS.some(r=>r!==e.type&&e.pct[r]===undefined))rerollNeeds(c)}   // salvamentos antigos: sorteia as necessidades que faltam (couro)
  for(const c of WORLD.cities)whOf(c);   // cada cidade tem o seu armazém (salvamentos antigos ganham um vazio)
  if(!rd.routes)rd.routes=[];if(!rd.rbuf)rd.rbuf={};if(!rd.report)rd.report=[];if(!rd.now)rd.now=[];if(!rd.lvl)rd.lvl=1;if(rd.actions===undefined)rd.actions=maxActions();if(!rd.clv)rd.clv={};
}
// necessidade (em unidades) de um recurso numa cidade; uma caravana que traz o foco do parceiro zera a necessidade dele
const tradePct=p=>p===100?0:p===150?100:p===200?150:p;   // caravana: 100% some, 150% cai para 100%, 200% cai para 150%
function pctOf(c,res){
  const e=ec(c);let pct=e.pct[res]||0;
  if(e.press&&pct>0)pct=Math.min(300,pct+50*e.press.n);   // cidade reprimida (política Rebelião B): +50% por rodada, no máximo 300%
  for(const r of STATE.rd.routes){
    if(r.a!==c.id&&r.b!==c.id)continue;
    const o=WORLD.cities[r.a===c.id?r.b:r.a];if(focusOf(o)===res)pct=tradePct(pct);   // caravana: 150% some, 200% cai para 100%, 100% não muda
  }
  return pct;
}
const needOf=(c,res)=>Math.round(pctOf(c,res)*ECON.baseNeed/100*polMul('need',c.id,res)*meetNeedMul(c,res));   // políticas podem multiplicar a necessidade (policies.js)   // recursos 1 para 1: 100% = ECON.baseNeed unidades
// recursos do mais abundante (necessidade 0) ao menos abundante (necessidade 200%) nesta rodada
const abundOf=c=>(focusOf(c)==='gold'?['gold']:[]).concat(NEEDS.slice().sort((a,b)=>pctOf(c,a)-pctOf(c,b)||NEEDS.indexOf(a)-NEEDS.indexOf(b)));
const abundHtml=c=>abundOf(c).map((r,i)=>'<span title="'+resName(r)+': necessidade '+pctOf(c,r)+'%">'+resIcon(r)+'</span>').join(' › ');
const gotOf=(c,r)=>ec(c).got[r]||0,carryOf=(c,r)=>ec(c).carry[r]||0;   // got = entregue nesta rodada; carry = o que já estava nos slots no início dela
const missingOf=(c,r)=>G.alwaysSupplied||STATE.round<1?0:Math.max(0,needOf(c,r)-storedOf(c,r));   // G.alwaysSupplied: botão do modo criativo "Cidades sempre supridas"
const cityMet=c=>NEEDS.every(r=>missingOf(c,r)===0);
function moodOf(c){const e=STATE.rd&&STATE.rd.cities&&STATE.rd.cities[c.id];return(e&&e.mood)||'ok'}
const hasRoute=c=>STATE.rd.routes.some(r=>r.a===c.id||r.b===c.id)||(STATE.rd.nroutes||[]).some(r=>r.a===c.id||r.b===c.id);   // inclui as caravanas entre NPC (facgraph.js): uma por cidade
const prodOf=c=>polFlag('noProd',c.id)?0:(ECON.prodBase+ECON.prodRank*Math.max(1,c.rank||1)+LVL.cityProd*lvlSteps(c)+(moodOf(c)==='rich'?1:0))*(focusOf(c)==='gold'?ECON.goldMul*meetGoldProd():1);   // cidade próspera: +1 de produção
const goldTradeOf=c=>{   // ouro extra por rodada de quem negocia com cidades que produzem ouro
  let g=0;for(const r of STATE.rd.routes){if(r.a!==c.id&&r.b!==c.id)continue;const o=WORLD.cities[r.a===c.id?r.b:r.a];if(focusOf(o)==='gold'&&o!==c)g+=Math.round(prodOf(o)*ECON.tradeGold)}
  return moodOf(c)==='upset'||focusOf(c)==='gold'?0:g;
};
const taxOf=c=>moodOf(c)==='upset'||polFlag('noTax',c.id)||(focusOf(c)==='gold'&&hasRoute(c))?0:Math.round((TAX_BASE+TAX_RANK*Math.max(1,c.rank||1)+LVL.cityTax*lvlSteps(c))*(moodOf(c)==='rich'?1.5:1)*meetTaxMul());
const deliverAndRefresh=()=>{computeBuffs();refreshRoundHud()};function computeBuffs(){
  const b={};
  for(const c of playerCities())for(const r of NEEDS)if(gotOf(c,r)>Math.max(0,needOf(c,r)-carryOf(c,r)))b[r]=true;
  STATE.rd.rnext=b;   // o bônus de entrega acima da meta só vale na PRÓXIMA rodada (vira rbuf em endRound)
}
function playerPort(){return playerCities().find(c=>ec(c).type==='port')}
// nível do humor: Próspera 3 • Contente 2 • Descontente 1, depois 0 e −1 conforme as rodadas seguidas sem suprimentos (ups)
function moodLvl(c){const m=moodOf(c);if(m==='rich')return 3;if(m==='ok')return 2;const u=(ec(c)&&ec(c).ups)||0;return Math.max(-1,2-Math.max(1,u))}
const moodLbl=c=>MOOD[moodOf(c)].n+' ('+moodLvl(c)+')';
// felicidade (políticas): move o humor um degrau; vale já nesta rodada e no próximo fechamento; não mexe na contagem de rebelião
function joyShift(c,d){const e=ec(c),ORD=['upset','ok','rich'];e.mood=ORD[clamp(ORD.indexOf(e.mood||'ok')+d,0,2)];e.joyAdj=(e.joyAdj||0)+d}
const CARAVAN_COST=ECON.caravan;
// ---------- as necessidades mudam a cada rodada: "joga-se o dado" para ver qual recurso pesa mais ----------
function rerollNeeds(c){
  const e=ec(c);if(!e||e.type==='port'||e.press)return;   // o porto é distribuído pelo jogador; cidade reprimida não gira o dado
  const foc=e.type,others=NEEDS.filter(r=>r!==foc),lv=[200,150,100,100].slice(0,others.length);
  for(let i=lv.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));const x=lv[i];lv[i]=lv[j];lv[j]=x}
  e.pct={};if(NEEDS.includes(foc))e.pct[foc]=0;others.forEach((r,i)=>e.pct[r]=lv[i]);
}
// ---------- lojas: o estoque à venda depende da produção da cidade ----------
const SHOP_ITEM={food:'carne',wood:'tora',ore:'minerio',leather:'couro'};
function shopFull(c){   // estoque cheio da loja da cidade (por item); o entreposto usa uma fração dele
  const base=(ECON.prodBase+ECON.prodRank*Math.max(1,c.rank||1)+LVL.cityProd*lvlSteps(c))*ECON.shopMul,f=focusOf(c),s={};
  for(const r of NEEDS)s[SHOP_ITEM[r]]=Math.floor((f===r?base:f==='gold'?Math.floor(base*0.5):Math.floor(base*0.25))*fsupStockMul(c,r)*meetStockMul());   // facção abundante/em falta num recurso: mais/menos estoque
  return s;
}
function refreshShops(){for(const c of WORLD.cities){const e=ec(c);if(e)e.shop=shopFull(c)}}
function shopLeft(c,id){const e=ec(c);if(!e)return 99;if(!e.shop)refreshShops();return e.shop[id]===undefined?null:e.shop[id]}   // null = item sem limite
function shopTake(c,id,n){const e=ec(c);if(e&&e.shop&&e.shop[id]!==undefined)e.shop[id]=Math.max(0,e.shop[id]-n)}
