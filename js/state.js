'use strict';
// ---------- Estado do jogo, livro de recursos, preços e ganchos (Fase 0) ----------
// Tudo o que precisa sobreviver a um salvamento e que não faz parte do mundo gerado pela semente fica em STATE (JSON puro).
const SAVE_VERSION=3;
const STATE={version:SAVE_VERSION,round:1,phase:'commander',res:{food:0,ore:0,wood:0}};
// zera o estado para uma partida nova; sistemas que guardam coisas em STATE (inventário, durabilidade...) assinam 'resetState'
function resetState(){STATE.version=SAVE_VERSION;STATE.round=1;STATE.phase='commander';STATE.res={food:0,ore:0,wood:0};Hooks.emit('resetState')}

// ---------- ganchos (eventos internos): outros sistemas assinam sem precisar mexer neste arquivo ----------
const Hooks={
  map:{},
  on(name,fn){(this.map[name]=this.map[name]||[]).push(fn)},
  emit(name,arg){for(const fn of this.map[name]||[])fn(arg)}
};

// ---------- livro de recursos ----------
// O ouro é P.coins (para continuar compatível com todo o código atual); os outros três ficam em STATE.res.
// Saldos podem ficar NEGATIVOS (dívida). Quem está devendo em qualquer recurso não consegue comprar nada.
const Ledger={
  keys:['food','ore','wood','gold'],
  get(k){return k==='gold'?P.coins:(STATE.res[k]||0)},
  set(k,v){if(k==='gold')P.coins=v;else STATE.res[k]=v;Hooks.emit('ledger',{key:k,value:v})},
  add(k,n){this.set(k,this.get(k)+n)},
  anyDebt(){return this.keys.some(k=>this.get(k)<0)},
  inDebt(k){return this.get(k)<0},
  // cost = {gold:50, wood:3}. Dívida em qualquer recurso bloqueia a compra.
  canAfford(cost){
    if(this.anyDebt())return false;
    for(const k in cost)if(this.get(k)<cost[k])return false;
    return true;
  },
  spend(cost){if(!this.canAfford(cost))return false;for(const k in cost)this.add(k,-cost[k]);return true},
  // gasta mesmo sem saldo, deixando o recurso negativo (ex.: conserto de arma)
  borrow(cost){for(const k in cost)this.add(k,-cost[k])},
  summary(){return this.keys.map(k=>DATA.resources[k].icon+' '+DATA.resources[k].name+': '+this.get(k)).join('  •  ')}
};

// ---------- preço: uma função só, com modificadores encadeados ----------
// Cada modificador recebe (preço, contexto) e devolve o novo preço. Contexto: {city, kind}.
// Cidade, buffs de entrega, eventos, reuniões e cidades evoluídas entram aqui no futuro sem mexer nas lojas.
const PriceMods=[];
function addPriceMod(id,fn,order){
  const m={id,fn,order:order===undefined?100:order},i=PriceMods.findIndex(x=>x.id===id);
  if(i>=0)PriceMods[i]=m;else PriceMods.push(m);
  PriceMods.sort((a,b)=>a.order-b.order);
}
function removePriceMod(id){const i=PriceMods.findIndex(x=>x.id===id);if(i>=0)PriceMods.splice(i,1)}
function priceOf(base,ctx){
  ctx=ctx||{};let p=base;
  for(const m of PriceMods)p=m.fn(p,ctx);
  return Math.max(1,Math.round(p));
}

// ---------- rodada (contador; as regras de turno entram na Fase 4) ----------
const Rounds={
  get n(){return STATE.round},
  advance(){STATE.round++;Hooks.emit('round',STATE.round)}
};
