'use strict';
// ---------- Armazém da cidade (Fase 4b) ----------
// Cada cidade tem um armazém (edifício). Nele o jogador: (1) guarda itens num armazenamento próprio (separado da bolsa); (2) entrega os SUPRIMENTOS
// que a cidade precisa na rodada: 1 slot de madeira, 1 de minério e 10 de alimentos (a variedade de comida), mais o ouro do cofre; (3) recolhe a produção
// em abundância da cidade (o slot de produção), que se acumula até ser retirada. Madeira, minério e alimentos são ITENS (1 item = 1 unidade) e podem ser
// comprados, vendidos e carregados. O ouro segue o jogo: dá para guardar e tirar do cofre do armazém. O livro só mostra o que a cidade tem.
const WH_SLOTS=24,SUP_STACK=60,PROD_STACK=99,FOOD_SLOTS=10;
const FOOD_TYPES=['carne','tilapia','lambari','bagre','truta','ervas'];   // alimentos possíveis na produção em abundância
const RES_ITEM={wood:'tora',ore:'minerio'};
const UNIT_PRICE={food:6,ore:10,wood:8,gold:1};   // preço de cada unidade que faltou (vira dívida em ouro)
const supplyOf=id=>{const d=itemDef(id);if(!d)return null;if(d.supply)return d.supply;if(d.tags&&d.tags.includes('fish'))return{res:'food'};return null};

function whOf(c){
  const e=ec(c);
  if(!e.wh)e.wh={store:new Array(WH_SLOTS).fill(null),prod:null,wood:null,ore:null,food:new Array(FOOD_SLOTS).fill(null),vault:0,supGold:0};
  return e.wh;
}
const slotN=s=>s?s.n:0;
// quanto da cidade já está nos slots de suprimento
function storedOf(c,res){
  const w=whOf(c);
  if(res==='gold')return w.supGold;
  if(res==='food')return w.food.reduce((a,s)=>a+slotN(s),0);
  return slotN(w[res]);
}
// gasta n unidades dos slots de suprimento (fim da rodada)
function consumeSupply(c,res,n){
  const w=whOf(c);
  if(res==='gold'){const t=Math.min(n,w.supGold);w.supGold-=t;return t}
  if(res==='wood'||res==='ore'){const s=w[res];if(!s)return 0;const t=Math.min(n,s.n);s.n-=t;if(s.n<=0)w[res]=null;return t}
  let left=n;for(let i=0;i<FOOD_SLOTS&&left>0;i++){const s=w.food[i];if(!s)continue;const t=Math.min(left,s.n);s.n-=t;left-=t;if(s.n<=0)w.food[i]=null}
  return n-left;
}
// produção em abundância da rodada (cidade-foco sem caravana)
function prodAdd(c,res,amt){
  const w=whOf(c);
  if(res==='gold'){w.vault+=amt;return amt}   // ouro vai direto para o cofre
  let id=RES_ITEM[res];
  if(res==='food'){id=w.prod&&supplyOf(w.prod.id)&&supplyOf(w.prod.id).res==='food'?w.prod.id:FOOD_TYPES[Math.floor(Math.random()*FOOD_TYPES.length)]}   // sorteia o tipo; enquanto não for retirado, continua somando
  if(w.prod&&w.prod.id!==id){moveProdToStore(c)}
  if(!w.prod)w.prod={id,n:0};
  const add=Math.min(amt,PROD_STACK-w.prod.n);w.prod.n+=add;return add;
}
// a abundância mudou: o que estava na reserva de produção vai para o armazenamento; o que não couber é destruído
function moveProdToStore(c){
  const w=whOf(c);if(!w.prod)return'';
  const s=w.prod;w.prod=null;const put=storeAdd(w,s.id,s.n);
  const lost=s.n-put;return lost>0?lost+' '+itemDef(s.id).name+' destruído(s) por falta de espaço':'';
}
function storeAdd(w,id,n){
  const cap=itemDef(id).stack;let left=n;
  for(let i=0;i<WH_SLOTS&&left>0;i++){const s=w.store[i];if(s&&s.id===id&&s.n<cap){const t=Math.min(left,cap-s.n);s.n+=t;left-=t}}
  for(let i=0;i<WH_SLOTS&&left>0;i++){if(!w.store[i]){const t=Math.min(left,cap);w.store[i]={id,n:t};left-=t}}
  return n-left;
}
// ---------- movimentação de itens entre bolsa, armazenamento, produção e suprimentos ----------
// ref: {area:'bag'|'store'|'prod'|'wood'|'ore'|'food', i}
function refGet(c,ref){
  const w=whOf(c);
  if(ref.area==='bag')return STATE.inv.slots[ref.i]||null;
  if(ref.area==='store')return w.store[ref.i]||null;
  if(ref.area==='prod')return w.prod;
  if(ref.area==='food')return w.food[ref.i]||null;
  return w[ref.area]||null;
}
function refSet(c,ref,v){
  const w=whOf(c);
  if(ref.area==='bag')STATE.inv.slots[ref.i]=v;
  else if(ref.area==='store')w.store[ref.i]=v;
  else if(ref.area==='prod')w.prod=v;
  else if(ref.area==='food')w.food[ref.i]=v;
  else w[ref.area]=v;
}
const refCap=(ref,id)=>ref.area==='prod'?PROD_STACK:(ref.area==='wood'||ref.area==='ore'||ref.area==='food')?SUP_STACK:itemDef(id).stack;
const isSupArea=a=>a==='wood'||a==='ore'||a==='food';
// destino automático para o item id: devolve um ref com espaço (ou null)
function autoDest(c,kind,id){
  const w=whOf(c),cap=itemDef(id).stack;
  if(kind==='bag'){
    const sl=STATE.inv.slots;
    for(let i=0;i<STATE.inv.size;i++)if(sl[i]&&sl[i].id===id&&sl[i].n<cap)return{area:'bag',i};
    for(let i=0;i<STATE.inv.size;i++)if(!sl[i])return{area:'bag',i};
    return null;
  }
  if(kind==='store'){
    for(let i=0;i<WH_SLOTS;i++)if(w.store[i]&&w.store[i].id===id&&w.store[i].n<cap)return{area:'store',i};
    for(let i=0;i<WH_SLOTS;i++)if(!w.store[i])return{area:'store',i};
    return null;
  }
  if(kind==='sup'){
    const sp=supplyOf(id);if(!sp)return null;
    if(sp.res==='wood'||sp.res==='ore'){const s=w[sp.res];return(!s||(s.id===id&&s.n<SUP_STACK))?{area:sp.res}:null}
    for(let i=0;i<FOOD_SLOTS;i++)if(w.food[i]&&w.food[i].id===id&&w.food[i].n<SUP_STACK)return{area:'food',i};
    for(let i=0;i<FOOD_SLOTS;i++)if(!w.food[i])return{area:'food',i};
  }
  return null;
}
// move até n unidades do ref de origem para o destino (kind: 'bag'|'store'|'sup'); devolve quantas moveu
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
    left-=t;moved+=t;
    if(isSupArea(dst.area)){const r=supplyOf(id).res;ec(c).got[r]=(ec(c).got[r]||0)+t}
  }
  if(moved>0){
    src.n-=moved;if(src.n<=0)refSet(c,from,null);
    if(isSupArea(from.area)){const r=supplyOf(id).res;ec(c).got[r]=(ec(c).got[r]||0)-moved}
    invChanged();computeBuffs();refreshRoundHud();
  }else toast(kind==='bag'?'Bolsa cheia!':kind==='store'?'Armazenamento cheio!':'Sem espaço no slot de suprimento.',1800);
  return moved;
}
// ouro: cofre do armazém e suprimento de ouro da cidade
function vaultMove(c,delta){   // delta>0 guarda do bolso; delta<0 tira para o bolso
  const w=whOf(c);
  if(delta>0){const t=Math.min(delta,Math.max(0,P.coins));w.vault+=t;P.coins-=t;return t}
  const t=Math.min(-delta,w.vault);w.vault-=t;P.coins+=t;return -t;
}
function supGoldMove(c,delta){   // delta>0 do cofre para o suprimento; delta<0 de volta ao cofre
  const w=whOf(c),e=ec(c);
  if(delta>0){const t=Math.min(delta,w.vault);w.vault-=t;w.supGold+=t;e.got.gold=(e.got.gold||0)+t;return t}
  const t=Math.min(-delta,w.supGold);w.supGold-=t;w.vault+=t;e.got.gold=(e.got.gold||0)-t;return -t;
}
// saque de raid: perde parte dos suprimentos guardados na cidade
function raidLoss(c){
  const w=whOf(c),out=[];
  for(const r of['food','ore','wood']){
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
const WHU={city:null,tab:'store',sel:null};
function openWarehouse(c){WHU.city=c;WHU.sel=null;whOf(c);openPanel('warehouse');renderWarehouse()}
function whSummaryHtml(c){
  const f=focusOf(c),w=whOf(c),route=hasRoute(c),amt=prodOf(c);
  const prodTxt=route?'enviada por caravana (não vai para o armazém)':'+'+amt+' '+resIcon(f)+' '+resName(f).toLowerCase()+' por rodada';
  const rows=NEEDS.map(r=>{
    const need=needOf(c,r),st=storedOf(c,r),m=Math.max(0,need-st),bonus=(ec(c).got[r]||0)>Math.max(0,need-(ec(c).carry[r]||0));
    const tag=need===0&&st===0?'<span style="color:#9fe89f">não precisa</span>':m>0?'<span style="color:#ff8a8a">falta '+m+'</span>':bonus?'<span style="color:#ffd23a">★ bônus</span>':'<span style="color:#9fe89f">✔</span>';
    const dv=(ec(c).debt||{})[r]||0;return '<div>'+resIcon(r)+' '+resName(r)+': <b>'+st+'</b> / '+need+' '+tag+(dv?' <span style="color:#ff8a8a">• dívida '+dv+'</span>':'')+'</div>';
  }).join('');
  return '<div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:8px"><div class="card" style="flex:1;min-width:250px"><b>Produção de '+c.name+'</b><div class="st">'+prodTxt+'<br>Cofre: <b>◉ '+w.vault+'</b><br>Humor: '+moodHtml(c)+' • imposto por rodada: ◉'+taxOf(c)+'</div></div><div class="card" style="flex:1;min-width:250px"><b>Suprimentos desta rodada</b><div class="st" style="line-height:1.6">'+rows+'</div></div></div>';
}
function whItemSlot(s,key,title){
  const d=s&&itemDef(s.id);
  return{label:d?d.icon:'',count:s?s.n:0,title:s?d.name+' ×'+s.n:title,cls:(s?itemSlotCls(s.id):'')+(WHU.sel&&WHU.sel.area===key.area&&WHU.sel.i===key.i?' sel':'')};
}
function renderWarehouse(){
  const c=WHU.city;if(!c)return;
  const w=whOf(c),body=$('whbody');body.innerHTML='';
  $('whtitle').textContent='🏚 ARMAZÉM — '+c.name;
  const sum=document.createElement('div');sum.innerHTML=whSummaryHtml(c);body.appendChild(sum);
  // abas
  const tabs=document.createElement('div');tabs.style.marginBottom='8px';
  for(const [k,t] of[['store','📦 Armazenamento'],['sup','📥 Suprimentos']])tabs.appendChild(UI.button(t,WHU.tab===k?'gold':'alt',()=>{WHU.tab=k;WHU.sel=null;renderWarehouse()}));
  body.appendChild(tabs);
  const cols=document.createElement('div');cols.style.cssText='display:flex;gap:18px;flex-wrap:wrap';
  const L=document.createElement('div'),R=document.createElement('div');L.style.cssText='flex:1 1 340px;max-width:380px';R.style.cssText='flex:1 1 260px;max-width:320px';
  cols.append(L,R);body.appendChild(cols);
  const lab=(el,txt)=>{const b=document.createElement('b');b.className='st';b.style.cssText='display:block;margin:8px 0 3px';b.textContent=txt;el.appendChild(b)};
  const grid=(el,area,arr,ncols,keyOf)=>{const d=document.createElement('div');el.appendChild(d);UI.slotGrid(d,{cols:ncols,slots:arr,render:(s,i)=>whItemSlot(s,{area:keyOf(i).area,i:keyOf(i).i},'Vazio'),onClick:(s,i)=>{const k=keyOf(i);WHU.sel=(WHU.sel&&WHU.sel.area===k.area&&WHU.sel.i===k.i)?null:k;renderWarehouse()}})};
  if(WHU.tab==='store'){
    lab(L,'Armazenamento da cidade ('+w.store.filter(Boolean).length+'/'+WH_SLOTS+')');grid(L,'store',w.store,6,i=>({area:'store',i}));
    lab(L,'Cofre (ouro): ◉ '+w.vault+'  •  Com você: ◉ '+P.coins);
    const gb=document.createElement('div');
    for(const n of[10,100])gb.appendChild(UI.button('Guardar ◉'+n,'',()=>{vaultMove(c,n);sfx('coin',0);renderWarehouse()}));
    gb.appendChild(UI.button('Guardar tudo','',()=>{vaultMove(c,P.coins);sfx('coin',0);renderWarehouse()}));
    for(const n of[10,100])gb.appendChild(UI.button('Tirar ◉'+n,'alt',()=>{vaultMove(c,-n);sfx('coin',0);renderWarehouse()}));
    gb.appendChild(UI.button('Tirar tudo','alt',()=>{vaultMove(c,-w.vault);sfx('coin',0);renderWarehouse()}));
    L.appendChild(gb);
  }else{
    lab(L,'Produção em abundância (reserva)');grid(L,'prod',[w.prod],1,()=>({area:'prod',i:0}));
    lab(L,resIcon('wood')+' Madeira — precisa '+needOf(c,'wood'));grid(L,'wood',[w.wood],1,()=>({area:'wood',i:0}));
    lab(L,resIcon('ore')+' Minério — precisa '+needOf(c,'ore'));grid(L,'ore',[w.ore],1,()=>({area:'ore',i:0}));
    lab(L,resIcon('food')+' Alimentos (até 10 tipos) — precisa '+needOf(c,'food'));grid(L,'food',w.food,5,i=>({area:'food',i}));
  }
  // direita: bolsa + detalhes e ações
  lab(R,'Sua bolsa');grid(R,'bag',STATE.inv.slots.slice(0,STATE.inv.size),5,i=>({area:'bag',i}));
  const det=document.createElement('div');det.style.marginTop='8px';R.appendChild(det);
  const sel=WHU.sel,s=sel?refGet(c,sel):null;
  if(!s){det.innerHTML='<p class="st">Clique em um item para ver as ações. Nos <b>Suprimentos</b>, madeira (troncos), minério e comida contam 1 unidade por item.</p>'}
  else{
    const d=itemDef(s.id),sp=supplyOf(s.id);
    det.innerHTML='<div style="font-size:26px">'+d.icon+'</div><b>'+d.name+'</b> ×'+s.n+'<p class="st">'+d.desc+'</p>';
    const addRow=(label,kind)=>{
      const r=document.createElement('div');r.appendChild(document.createTextNode(label+' '));
      for(const n of[1,5,s.n])r.appendChild(UI.button(n===s.n&&s.n>5?'tudo':String(n),'gold',()=>{whMove(c,sel,kind,n);if(!refGet(c,sel))WHU.sel=null;renderWarehouse()}));
      det.appendChild(r);
    };
    if(sel.area!=='bag')addRow('← Para a bolsa:','bag');
    if(sel.area==='bag'||sel.area==='prod')addRow('→ Armazenar:','store');
    if(sp&&(sel.area==='bag'||sel.area==='store'||sel.area==='prod'))addRow('→ Suprimentos:','sup');
    if(sel.area==='bag'||sel.area==='store'){if(!sp)det.appendChild(Object.assign(document.createElement('p'),{className:'st',textContent:'Não é suprimento.'}))}
  }
}
document.getElementById('whclose').onclick=()=>closePanel();
