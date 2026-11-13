'use strict';
// ---------- Armazém da cidade (Fase 4b) ----------
// Cada cidade tem um armazém (edifício). Em QUALQUER armazém de cidade sua dá para gerenciar QUALQUER cidade sua. O ARMAZENAMENTO (24 slots) e o COFRE de ouro são
// do jogador e valem em todos os armazéns: um item guardado na cidade X aparece no armazém da cidade Y. Já os SUPRIMENTOS e a PRODUÇÃO são de cada cidade:
// 1 slot de madeira, 1 de minério e 10 de alimentos (a variedade de comida) para entregar o que a cidade precisa na rodada, e o slot de produção em abundância,
// que se acumula até ser retirado. Madeira, minério e alimentos são ITENS (1 item = 1 unidade) e podem ser comprados, vendidos e carregados.
// Mover itens é sempre ARRASTAR e soltar; os botões servem para mover em lote.
const WH_SLOTS=24,SUP_STACK=60,PROD_STACK=99,FOOD_SLOTS=10;
const LEATHER_SLOTS=Math.max(1,Object.values(DATA.items).filter(d=>d.supply&&d.supply.res==='leather').length);   // um slot para cada item que vale como couro
const FOOD_TYPES=['carne','tilapia','lambari','bagre','truta','ervas'];   // alimentos possíveis na produção em abundância
const RES_ITEM={wood:'tora',ore:'minerio',leather:'couro'};
const supplyOf=id=>{const d=itemDef(id);if(!d)return null;if(d.supply)return d.supply;if(d.tags&&d.tags.includes('fish'))return{res:'food'};return null};

// armazenamento e cofre compartilhados por todos os armazéns do jogador
function shOf(){
  const rd=STATE.rd;
  if(!rd.shared){
    rd.shared={store:new Array(WH_SLOTS).fill(null),vault:0};
    for(const k in rd.cities){const w=rd.cities[k].wh;if(!w)continue;   // salvamentos antigos: junta o que havia em cada cidade
      if(w.store)for(const s of w.store)if(s)storeAddTo(rd.shared,s.id,s.n);
      rd.shared.vault+=w.vault||0;delete w.store;w.vault=0}
  }
  return rd.shared;
}
// suprimentos e produção de uma cidade
function whOf(c){
  const e=ec(c);
  if(!e.wh)e.wh={prod:null,wood:null,ore:null,leather:null,food:new Array(FOOD_SLOTS).fill(null)};
  if(!e.wh.food)e.wh.food=new Array(FOOD_SLOTS).fill(null);
  if(!Array.isArray(e.wh.leather)){const old=e.wh.leather;e.wh.leather=new Array(LEATHER_SLOTS).fill(null);if(old)e.wh.leather[0]=old}
  return e.wh;
}
const slotN=s=>s?s.n:0;
function storedOf(c,res){
  const w=whOf(c);
  if(res==='food')return w.food.reduce((a,s)=>a+slotN(s),0);
  if(res==='leather')return w.leather.reduce((a,s)=>a+slotN(s),0);
  if(res==='wood'||res==='ore')return slotN(w[res]);
  return 0;
}
// gasta n unidades dos slots de suprimento (fim da rodada)
function consumeSupply(c,res,n){
  const w=whOf(c);
  if(res==='wood'||res==='ore'){const s=w[res];if(!s)return 0;const t=Math.min(n,s.n);s.n-=t;if(s.n<=0)w[res]=null;return t}
  const arr=res==='leather'?w.leather:w.food;   // comida e couro têm vários slots (um por tipo de item)
  let left=n;for(let i=0;i<arr.length&&left>0;i++){const s=arr[i];if(!s)continue;const t=Math.min(left,s.n);s.n-=t;left-=t;if(s.n<=0)arr[i]=null}
  return n-left;
}
// produção em abundância da rodada (cidade-foco sem caravana)
function prodAdd(c,res,amt){
  const w=whOf(c);
  if(res==='gold'){shOf().vault+=amt;return amt}   // ouro vai direto para o cofre
  let id=RES_ITEM[res];
  if(res==='food'){id=w.prod&&supplyOf(w.prod.id)&&supplyOf(w.prod.id).res==='food'?w.prod.id:FOOD_TYPES[Math.floor(Math.random()*FOOD_TYPES.length)]}   // sorteia o tipo; enquanto não for retirado, continua somando
  if(w.prod&&w.prod.id!==id){moveProdToStore(c)}
  if(!w.prod)w.prod={id,n:0};
  const add=Math.min(amt,PROD_STACK-w.prod.n);w.prod.n+=add;return add;
}
// a abundância mudou: o que estava na reserva de produção vai para o armazenamento; o que não couber é destruído
function moveProdToStore(c){
  const w=whOf(c);if(!w.prod)return'';
  const s=w.prod;w.prod=null;const put=storeAddTo(shOf(),s.id,s.n);
  const lost=s.n-put;return lost>0?lost+' '+itemDef(s.id).name+' destruído(s) por falta de espaço':'';
}
function storeAddTo(sh,id,n){
  const cap=itemDef(id).stack;let left=n;
  for(let i=0;i<WH_SLOTS&&left>0;i++){const s=sh.store[i];if(s&&s.id===id&&s.n<cap){const t=Math.min(left,cap-s.n);s.n+=t;left-=t}}
  for(let i=0;i<WH_SLOTS&&left>0;i++){if(!sh.store[i]){const t=Math.min(left,cap);sh.store[i]={id,n:t};left-=t}}
  return n-left;
}
// ---------- movimentação de itens entre bolsa, armazenamento, produção e suprimentos ----------
// ref: {area:'bag'|'store'|'prod'|'wood'|'ore'|'food', i}
function refGet(c,ref){
  const w=whOf(c);
  if(ref.area==='bag')return STATE.inv.slots[ref.i]||null;
  if(ref.area==='store')return shOf().store[ref.i]||null;
  if(ref.area==='prod')return w.prod;
  if(ref.area==='food')return w.food[ref.i]||null;
  if(ref.area==='leather')return w.leather[ref.i]||null;
  return w[ref.area]||null;
}
function refSet(c,ref,v){
  const w=whOf(c);
  if(ref.area==='bag')STATE.inv.slots[ref.i]=v;
  else if(ref.area==='store')shOf().store[ref.i]=v;
  else if(ref.area==='prod')w.prod=v;
  else if(ref.area==='food')w.food[ref.i]=v;
  else if(ref.area==='leather')w.leather[ref.i]=v;
  else w[ref.area]=v;
}
const refCap=(ref,id)=>ref.area==='prod'?PROD_STACK:(ref.area==='wood'||ref.area==='ore'||ref.area==='leather'||ref.area==='food')?SUP_STACK:itemDef(id).stack;
const isSupArea=a=>a==='wood'||a==='ore'||a==='leather'||a==='food';
// o item id pode ficar nessa área?
function areaOk(area,id){
  const d=itemDef(id);
  if(area==='bag')return true;
  if(area==='store')return !(d.type==='weapon'||d.key);
  if(area==='prod')return false;
  const sp=supplyOf(id);return !!sp&&sp.res===area;
}
function supDelta(c,area,id,n){if(isSupArea(area)){const r=supplyOf(id).res,e=ec(c);e.got[r]=(e.got[r]||0)+n}}
// destino automático para o item id: devolve um ref com espaço (ou null)
function autoDest(c,kind,id){
  const w=whOf(c),sh=shOf(),cap=itemDef(id).stack;
  if(kind==='bag'){
    const sl=STATE.inv.slots;
    for(let i=0;i<STATE.inv.size;i++)if(sl[i]&&sl[i].id===id&&sl[i].n<cap)return{area:'bag',i};
    for(let i=0;i<STATE.inv.size;i++)if(!sl[i])return{area:'bag',i};
    return null;
  }
  if(kind==='store'){
    for(let i=0;i<WH_SLOTS;i++)if(sh.store[i]&&sh.store[i].id===id&&sh.store[i].n<cap)return{area:'store',i};
    for(let i=0;i<WH_SLOTS;i++)if(!sh.store[i])return{area:'store',i};
    return null;
  }
  if(kind==='sup'){
    const sp=supplyOf(id);if(!sp)return null;
    if(sp.res==='wood'||sp.res==='ore'){const s=w[sp.res];return(!s||(s.id===id&&s.n<SUP_STACK))?{area:sp.res}:null}
    const arr=sp.res==='leather'?w.leather:w.food,ar=sp.res==='leather'?'leather':'food';
    for(let i=0;i<arr.length;i++)if(arr[i]&&arr[i].id===id&&arr[i].n<SUP_STACK)return{area:ar,i};
    for(let i=0;i<arr.length;i++)if(!arr[i])return{area:ar,i};
  }
  return null;
}
function afterMove(){invChanged();computeBuffs();refreshRoundHud()}
// em lote (botões): move até n unidades do ref de origem para o destino automático (kind: 'bag'|'store'|'sup'); devolve quantas moveu
function whMove(c,from,kind,n){
  const src=refGet(c,from);if(!src)return 0;
  const id=src.id,d=itemDef(id);
  if(d.type==='weapon'||d.key){toast('Esse item não pode ir para o armazém.',1800);return 0}
  if(kind==='sup'&&!supplyOf(id)){toast('Isso não é um suprimento (madeira, minério ou comida).',2200);return 0}
  let left=Math.min(n,src.n),moved=0;
  while(left>0){
    const dst=autoDest(c,kind,id);if(!dst)break;
    const cur=refGet(c,dst),cap=refCap(dst,id),room=cap-(cur?cur.n:0);
    const t=Math.min(left,room);if(t<=0)break;
    if(cur)cur.n+=t;else refSet(c,dst,{id,n:t});
    left-=t;moved+=t;supDelta(c,dst.area,id,t);
  }
  if(moved>0){src.n-=moved;if(src.n<=0)refSet(c,from,null);supDelta(c,from.area,id,-moved);afterMove()}
  else toast(kind==='bag'?'Bolsa cheia!':kind==='store'?'Armazenamento cheio!':'Sem espaço no slot de suprimento.',1800);
  return moved;
}
// arrastar e soltar: leva a pilha inteira de um slot para outro (junta se for o mesmo item, troca se forem diferentes e couber)
function whDrop(c,from,to){
  if(from.area===to.area&&from.i===to.i)return false;
  const src=refGet(c,from);if(!src)return false;
  if(to.area==='prod'){toast('A produção só pode ser retirada.',1800);return false}
  if(!areaOk(to.area,src.id)){toast(isSupArea(to.area)?'Esse slot só aceita '+(to.area==='food'?'comida':to.area==='wood'?'madeira':to.area==='leather'?'couro':'minério')+'.':'Esse item não pode ficar aqui.',2000);return false}
  const dst=refGet(c,to),cap=refCap(to,src.id);
  if(!dst||dst.id===src.id){
    const t=Math.min(src.n,cap-(dst?dst.n:0));if(t<=0){toast('Sem espaço nesse slot.',1500);return false}
    if(dst)dst.n+=t;else refSet(c,to,{id:src.id,n:t});
    src.n-=t;if(src.n<=0)refSet(c,from,null);
    supDelta(c,to.area,src.id,t);supDelta(c,from.area,src.id,-t);
  }else{
    if(!areaOk(from.area,dst.id)||src.n>cap||dst.n>refCap(from,dst.id)){toast('Não dá para trocar esses itens de lugar.',1800);return false}
    supDelta(c,from.area,src.id,-src.n);supDelta(c,to.area,dst.id,-dst.n);
    refSet(c,to,src);refSet(c,from,dst);
    supDelta(c,to.area,src.id,src.n);supDelta(c,from.area,dst.id,dst.n);
  }
  afterMove();return true;
}
// ouro: cofre do jogador (o mesmo em todos os armazéns)
function vaultMove(delta){   // delta>0 guarda do bolso; delta<0 tira para o bolso
  const sh=shOf();
  if(delta>0){const t=Math.min(delta,Math.max(0,P.coins));sh.vault+=t;P.coins-=t;return t}
  const t=Math.min(-delta,sh.vault);sh.vault-=t;P.coins+=t;return -t;
}
// saque de raid: perde parte dos suprimentos guardados na cidade
function raidLoss(c){
  const out=[];
  for(const r of NEEDS){
    const tot=storedOf(c,r),l=Math.floor(tot*RAID_LOSS_RES);if(l>0){consumeSupply(c,r,l);out.push(l+' '+DATA.resources[r].name.toLowerCase())}
  }
  return out;
}
// recompensa de portal/dungeon em recursos: vira itens na bolsa
function giveResource(res,n){
  if(res==='gold'){Ledger.add('gold',n);return n+' de ouro'}
  const id=res==='food'?FOOD_TYPES[Math.floor(Math.random()*FOOD_TYPES.length)]:RES_ITEM[res];
  invGive([[id,n]]);return n+' × '+itemDef(id).name;
}

// ---------- tela do armazém ----------
const WHU={at:null,city:null,tab:'store',sel:null,drag:null};   // at = armazém onde o jogador está; city = cidade que está sendo gerenciada
function openWarehouse(c){WHU.at=c;WHU.city=c;WHU.sel=null;WHU.drag=null;whOf(c);openPanel('warehouse');renderWarehouse()}
function whSummaryHtml(c){
  const f=focusOf(c),route=hasRoute(c),amt=prodOf(c);
  const prodTxt=route?'enviada por caravana (não vai para o armazém)':'+'+amt+' '+resIcon(f)+' '+resName(f).toLowerCase()+' por rodada';
  const rows=NEEDS.map(r=>{
    const need=needOf(c,r),st=storedOf(c,r),m=Math.max(0,need-st),bonus=(ec(c).got[r]||0)>Math.max(0,need-(ec(c).carry[r]||0));
    const tag=need===0&&st===0?'<span style="color:#9fe89f">não precisa</span>':m>0?'<span style="color:#ff8a8a">falta '+m+'</span>':bonus?'<span style="color:#ffd23a">★ bônus</span>':'<span style="color:#9fe89f">✔</span>';
    return '<div>'+resIcon(r)+' '+resName(r)+': <b>'+st+'</b> / '+need+' '+tag+'</div>';
  }).join('');
  return '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px"><div class="card" style="flex:1;min-width:250px"><b>Produção de '+c.name+'</b><div class="st">'+prodTxt+'<br>Humor: '+moodHtml(c)+' • imposto por rodada: ◉'+taxOf(c)+'<br>Cofre (de todos os armazéns): <b>◉ '+shOf().vault+'</b></div></div><div class="card" style="flex:1;min-width:250px"><b>Suprimentos desta rodada</b><div class="st" style="line-height:1.6">'+rows+'</div></div></div>';
}
function whItemSlot(s,key,title){
  const d=s&&itemDef(s.id);
  return{label:d?d.icon:'',count:s?s.n:0,title:s?d.name+' ×'+s.n:title,cls:(s?itemSlotCls(s.id):'')+(WHU.sel&&WHU.sel.area===key.area&&WHU.sel.i===key.i?' sel':'')};
}
function renderWarehouse(){
  const c=WHU.city;if(!c)return;
  const w=whOf(c),sh=shOf(),body=$('whbody');body.innerHTML='';
  $('whtitle').textContent='🏚 ARMAZÉM — '+(WHU.at?WHU.at.name:c.name);
  // escolha da cidade gerenciada (qualquer cidade sua)
  const pcs=playerCities();
  if(pcs.length>1){
    const cb=document.createElement('div');cb.style.marginBottom='6px';
    cb.appendChild(Object.assign(document.createElement('span'),{className:'st',textContent:'Gerenciar a cidade: '}));
    for(const pc2 of pcs)cb.appendChild(UI.button(MOOD[moodOf(pc2)].icon+' '+pc2.name,pc2===c?'gold':'alt',()=>{WHU.city=pc2;WHU.sel=null;renderWarehouse()}));
    body.appendChild(cb);
  }
  const sum=document.createElement('div');sum.innerHTML=whSummaryHtml(c);body.appendChild(sum);
  // abas
  const tabs=document.createElement('div');tabs.style.marginBottom='8px';
  for(const [k,t] of[['store','📦 Armazenamento'],['sup','📥 Suprimentos']])tabs.appendChild(UI.button(t,WHU.tab===k?'gold':'alt',()=>{WHU.tab=k;WHU.sel=null;renderWarehouse()}));
  body.appendChild(tabs);
  const cols=document.createElement('div');cols.style.cssText='display:flex;gap:18px;flex-wrap:wrap';
  const L=document.createElement('div'),R=document.createElement('div');L.style.cssText='flex:1 1 340px;max-width:380px';R.style.cssText='flex:1 1 260px;max-width:320px';
  cols.append(L,R);body.appendChild(cols);
  const lab=(el,txt)=>{const b=document.createElement('b');b.className='st';b.style.cssText='display:block;margin:8px 0 3px';b.textContent=txt;el.appendChild(b)};
  // grade de slots com clique (selecionar) e arrastar/soltar
  const grid=(el,arr,ncols,keyOf)=>{const d=document.createElement('div');el.appendChild(d);UI.slotGrid(d,{cols:ncols,slots:arr,
    render:(s,i)=>whItemSlot(s,keyOf(i),'Vazio'),
    onClick:(s,i)=>{const k=keyOf(i);WHU.sel=(WHU.sel&&WHU.sel.area===k.area&&WHU.sel.i===k.i)?null:k;renderWarehouse()},
    dnd:{start:(s,i)=>{WHU.drag=keyOf(i);WHU.sel=keyOf(i)},drop:(s,i)=>{const f=WHU.drag;WHU.drag=null;if(f)whDrop(c,f,keyOf(i));WHU.sel=null;renderWarehouse()}}})};
  if(WHU.tab==='store'){
    lab(L,'Armazenamento (o mesmo em todos os armazéns) ('+sh.store.filter(Boolean).length+'/'+WH_SLOTS+')');grid(L,sh.store,6,i=>({area:'store',i}));
    lab(L,'Cofre (ouro): ◉ '+sh.vault+'  •  Com você: ◉ '+P.coins);
    const gb=document.createElement('div');
    for(const n of[10,100])gb.appendChild(UI.button('Guardar ◉'+n,'',()=>{vaultMove(n);sfx('coin',0);renderWarehouse()}));
    gb.appendChild(UI.button('Guardar tudo','',()=>{vaultMove(P.coins);sfx('coin',0);renderWarehouse()}));
    for(const n of[10,100])gb.appendChild(UI.button('Tirar ◉'+n,'alt',()=>{vaultMove(-n);sfx('coin',0);renderWarehouse()}));
    gb.appendChild(UI.button('Tirar tudo','alt',()=>{vaultMove(-sh.vault);sfx('coin',0);renderWarehouse()}));
    L.appendChild(gb);
  }else{
    lab(L,'Produção em abundância de '+c.name+' (reserva)');grid(L,[w.prod],1,()=>({area:'prod',i:0}));
    lab(L,resIcon('wood')+' Madeira — precisa '+needOf(c,'wood'));grid(L,[w.wood],1,()=>({area:'wood',i:0}));
    lab(L,resIcon('ore')+' Minério — precisa '+needOf(c,'ore'));grid(L,[w.ore],1,()=>({area:'ore',i:0}));
    lab(L,resIcon('leather')+' Couro ('+LEATHER_SLOTS+' tipos: couro, pele de lobo) — precisa '+needOf(c,'leather'));grid(L,w.leather,LEATHER_SLOTS,i=>({area:'leather',i}));
    lab(L,resIcon('food')+' Alimentos (até 10 tipos) — precisa '+needOf(c,'food'));grid(L,w.food,5,i=>({area:'food',i}));
  }
  // direita: bolsa + detalhes e ações em lote
  lab(R,'Sua bolsa');grid(R,STATE.inv.slots.slice(0,STATE.inv.size),5,i=>({area:'bag',i}));
  const det=document.createElement('div');det.style.marginTop='8px';R.appendChild(det);
  const sel=WHU.sel,s=sel?refGet(c,sel):null;
  if(!s){det.innerHTML='<p class="st"><b>Arraste</b> os itens entre a bolsa, o armazenamento e os slots de suprimento. Madeira (troncos), minério e comida contam 1 unidade por item. Clique em um item para mover em lote.</p>'}
  else{
    const d=itemDef(s.id),sp=supplyOf(s.id);
    det.innerHTML='<div style="font-size:26px">'+d.icon+'</div><b>'+d.name+'</b> ×'+s.n+'<p class="st">'+d.desc+'</p><p class="st">Em lote:</p>';
    const addRow=(label,kind)=>{
      const r=document.createElement('div');r.appendChild(document.createTextNode(label+' '));
      for(const n of[1,5,s.n])r.appendChild(UI.button(n===s.n&&s.n>5?'tudo':String(n),'gold',()=>{whMove(c,sel,kind,n);if(!refGet(c,sel))WHU.sel=null;renderWarehouse()}));
      det.appendChild(r);
    };
    if(sel.area!=='bag')addRow('← Para a bolsa:','bag');
    if(sel.area==='bag'||sel.area==='prod')addRow('→ Armazenar:','store');
    if(sp&&(sel.area==='bag'||sel.area==='store'||sel.area==='prod'))addRow('→ Suprimentos:','sup');
  }
}
document.getElementById('whclose').onclick=()=>closePanel();
