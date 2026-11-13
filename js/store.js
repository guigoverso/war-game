'use strict';
// ---------- Loja: compra de itens com vendedores de estoque e ouro limitados (Fase 2) ----------
// Cada cidade tem um vendedor com ouro limitado. Cada item vendido vai para o estoque do vendedor e derruba o preço dele
// (saturação). Com o tempo (dias de jogo) o vendedor recupera ouro e revende parte do estoque. "Comprar" entra mais tarde.
const VENDOR_BASE_GOLD=250,VENDOR_GOLD_PER_RANK=100,VENDOR_SAT=0.05,VENDOR_MIN_MUL=0.35;
const vendorMax=c=>VENDOR_BASE_GOLD+VENDOR_GOLD_PER_RANK*((c&&c.rank)||0);
function getVendor(c){
  let v=STATE.vendors[c.id];
  if(!v)v=STATE.vendors[c.id]={gold:vendorMax(c),stock:{},day:Math.floor(DN.days)};
  return v;
}
// a cada dia de jogo: o vendedor recupera 1/3 do ouro máximo e revende 30% do estoque acumulado
function updateVendors(){
  if(!STATE.vendors)return;const d=Math.floor(DN.days);
  for(const k in STATE.vendors){
    const v=STATE.vendors[k];if(v.day===undefined)v.day=d;
    while(v.day<d){
      v.day++;const mx=vendorMax(WORLD.cities[k]);v.gold=Math.min(mx,v.gold+mx/3);
      for(const id in v.stock){v.stock[id]=Math.floor(v.stock[id]*0.7);if(!v.stock[id])delete v.stock[id]}
    }
  }
}
// preço que o vendedor paga agora por UMA unidade
function sellUnitPrice(id,c){
  const d=itemDef(id),v=getVendor(c),base=d.value*(c.owner==='enemy'?0.5:1);
  return Math.max(1,Math.round(base*Math.max(VENDOR_MIN_MUL,1-VENDOR_SAT*(v.stock[id]||0))));
}
// vende até `qty` unidades; para quando o vendedor fica sem ouro. Devolve {sold, earned, brokeVendor}
function sellItem(c,id,qty){
  const d=itemDef(id),v=getVendor(c);let sold=0,earned=0,broke=false;
  if(!d||d.noSell)return{sold:0,earned:0,broke:false};
  for(let i=0;i<qty&&invCount(id)>0;i++){
    const p=sellUnitPrice(id,c);
    if(v.gold<p){broke=true;break}
    invRemove(id,1);v.gold-=p;v.stock[id]=(v.stock[id]||0)+1;Ledger.add('gold',p);sold++;earned+=p;
  }
  return{sold,earned,broke};
}

// ---------- tela da loja ----------
function openStore(c){G.storeCity=c;G.storeMode='menu';G.storeSel=null;openPanel('store');renderStore()}
function renderStore(){
  const c=G.storeCity,v=getVendor(c),body=$('storebody');body.innerHTML='';
  $('storeinfo').textContent='◉ '+P.coins+'  •  Ouro do vendedor: ◉'+Math.floor(v.gold)+' / '+vendorMax(c)+(c.owner==='enemy'?'  •  cidade inimiga paga metade':'');
  if(G.storeMode==='menu'){
    const p=document.createElement('p');p.textContent='— Bem-vindo à loja! O que deseja?';body.appendChild(p);
    body.appendChild(UI.button('🎒 Vender itens','gold',()=>{G.storeMode='sell';G.storeSel=null;renderStore()}));
    const b=UI.button('🛍 Comprar (em breve)','alt');b.disabled=true;body.appendChild(b);
    return;
  }
  // modo vender: a mochila aparece; clique em um item para ver o preço e vender
  const wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:18px;flex-wrap:wrap';
  const left=document.createElement('div'),right=document.createElement('div');right.style.cssText='min-width:240px;max-width:300px';
  wrap.append(left,right);body.appendChild(wrap);
  const inv=STATE.inv;
  UI.slotGrid(left,{cols:5,slots:inv.slots.slice(0,inv.size),
    render:(s,i)=>{const d=s&&itemDef(s.id);return{label:d?d.icon:'',count:s?s.n:0,title:d?d.name+(s.n>1?' ×'+s.n:'')+(d.noSell?' (não vendável)':' — ◉'+sellUnitPrice(s.id,c)+' cada'):'Vazio',cls:(G.storeSel===i?'sel':'')+(s?' '+itemSlotCls(s.id):'')}},
    onClick:(s,i)=>{G.storeSel=i;renderStore()}});
  const s=G.storeSel!==null&&G.storeSel!==undefined?inv.slots[G.storeSel]:null;
  if(s){
    const d=itemDef(s.id),n=invCount(s.id),p=sellUnitPrice(s.id,c),st=v.stock[s.id]||0;
    right.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+d.name+'</b> ×'+n+'<p class="st">'+d.desc+'<br>'+(d.noSell?'Este item não pode ser vendido.':'Preço agora: <b>◉'+p+'</b> cada (valor base ◉'+d.value+')'+(st?'<br>O vendedor já tem '+st+' no estoque: o preço cai com o excesso.':''))+'</p>';
    if(!d.noSell){
      const sell=(q)=>{const r=sellItem(c,s.id,q);if(r.sold>0){sfx('coin',0);toast('Vendido: '+r.sold+'× '+d.name+'  +◉'+r.earned+(r.broke?'  •  o vendedor ficou sem ouro':''),2200)}else if(r.broke)toast('O vendedor está sem ouro para este item.',2200);renderStore()};
      right.appendChild(UI.button('Vender 1','gold',()=>sell(1)));
      if(n>1)right.appendChild(UI.button('Vender tudo ('+n+')','alt',()=>sell(n)));
    }
  }else right.innerHTML='<p class="st">Clique em um item da mochila.</p>';
  const back=UI.button('← Voltar','alt',()=>{G.storeMode='menu';renderStore()});back.style.marginTop='10px';body.appendChild(back);
}
