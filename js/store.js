'use strict';
// ---------- Loja e taverna: venda para vendedores de ouro limitado e compra de itens (Fase 2) ----------
// Cada cidade tem um vendedor com ouro limitado. Cada item vendido vai para o estoque do vendedor e derruba o preço dele
// (saturação). Com o tempo (dias de jogo) o vendedor recupera ouro e revende parte do estoque.
// A Loja vende a vara de pescar; o taverneiro vende comida pronta.
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
  const d=itemDef(id),v=getVendor(c),base=d.value*(c.owner==='enemy'?0.5:1)*(typeof debOn==='function'&&debOn('wood')?0.5:1);   // debuff de madeira: a loja compra por 50% do valor
  return Math.max(1,Math.round(base*Math.max(VENDOR_MIN_MUL,1-VENDOR_SAT*(v.stock[id]||0))));
}
// vende até `qty` unidades da bolsa; para quando o vendedor fica sem ouro. Devolve {sold, earned, broke}
function sellItem(c,id,qty){
  const d=itemDef(id),v=getVendor(c);let sold=0,earned=0,broke=false;
  if(!d||d.noSell)return{sold:0,earned:0,broke:false};
  for(let i=0;i<qty;i++){
    if(d.weapon!==undefined&&weaponsOwnedCount()<=1){toast('Você precisa ficar com pelo menos uma arma.',2200);break}
    const p=sellUnitPrice(id,c);
    if(v.gold<p){broke=true;break}
    if(invRemove(id,1)<1)break;
    v.gold-=p;v.stock[id]=(v.stock[id]||0)+1;Ledger.add('gold',p);sold++;earned+=p;
  }
  return{sold,earned,broke};
}

// ---------- tela da loja / taverna ----------
// kind: 'store' (vende e compra itens) ou 'tavern' (só compra comida pronta)
function openStore(c,kind){G.storeCity=c;G.storeKind=kind||'store';G.storeMode=G.storeKind==='tavern'?'buy':'menu';G.storeSel=null;openPanel('store');renderStore()}   // a taverna só tem uma opção: abre direto na compra
function buyCards(kind,c){
  return Object.values(DATA.items).filter(d=>d.shop===kind);
}
function renderStore(){
  const c=G.storeCity,kind=G.storeKind,v=getVendor(c),body=$('storebody');body.innerHTML='';
  $('storetitle').textContent=kind==='tavern'?'🍺 TAVERNA':'🛒 LOJA';
  $('storeinfo').textContent='◉ '+P.coins+(kind==='store'?'  •  Ouro do vendedor: ◉'+Math.floor(v.gold)+' / '+vendorMax(c)+(c.owner==='enemy'?'  •  cidade inimiga paga metade':''):'')+(Ledger.anyDebt()?'  •  ⚠ em dívida: compras bloqueadas':'');
  if(G.storeMode==='menu'){
    const p=document.createElement('p');p.textContent=kind==='tavern'?'— Sente-se! Tenho comida quente. O fogão lá no fundo é seu, se quiser cozinhar.':'— Bem-vindo à loja! O que deseja?';body.appendChild(p);
    body.appendChild(UI.button(kind==='tavern'?'🍲 Comprar comidas':'🛍 Comprar','gold',()=>{G.storeMode='buy';renderStore()}));
    if(kind==='store')body.appendChild(UI.button('🎒 Vender itens','gold',()=>{G.storeMode='sell';G.storeSel=null;renderStore()}));
    return;
  }
  if(G.storeMode==='buy'){
    const list=buyCards(kind,c);
    const grid=document.createElement('div');grid.className='grid';
    for(const d of list){
      const price=pc(d.price,c,kind==='tavern'?'tavern':'buy');
      const own=d.rod&&invCount(d.id)>0;
      const card=document.createElement('div');card.className='card';
      const left=(d.supply&&d.shop==='store'&&typeof shopLeft==='function')?shopLeft(c,d.id):null;   // estoque limitado pela produção da cidade
      card.innerHTML='<b>'+d.icon+' '+d.name+'</b><div class="st">'+d.desc+'<br>Preço: <b>◉'+price+'</b>'+(left!==null?'<br>Em estoque: <b>'+left+'</b> (reabastece a cada rodada, conforme a produção da cidade)':'')+(own?'<br>Você já tem esta vara.':'')+'</div>';
      const btn=UI.button('Comprar ◉'+price,'gold',()=>{
        if(Ledger.anyDebt()){toast('Você está em dívida: compras bloqueadas.',2000);return}
        const need=d.type==='weapon'?(STATE.inv.wbar.includes(null)||invRoomFor(d.id)>=1):invRoomFor(d.id)>=1;
        if(!need){toast('Bolsa cheia! Descarte algo antes de comprar.',2200);return}
        if(left!==null&&shopLeft(c,d.id)<=0){toast('Esgotado nesta cidade até a próxima rodada.',2200);return}
        if(!Ledger.spend({gold:price})){toast('Ouro insuficiente.',1800);return}
        if(left!==null)shopTake(c,d.id,1);
        invGive([[d.id,1]]);sfx('coin',0);toast(d.icon+' '+d.name+' comprado'+(d.type==='weapon'?' — coloque na barra 1–6 e equipe':''),2500);renderStore();
      });
      btn.disabled=own||Ledger.anyDebt()||P.coins<price||(left!==null&&left<=0);
      card.appendChild(btn);grid.appendChild(card);
    }
    body.appendChild(grid);
    if(kind==='store'){const back=UI.button('← Voltar','alt',()=>{G.storeMode='menu';renderStore()});back.style.marginTop='10px';body.appendChild(back)}
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
    const d=itemDef(s.id),n=s.n,p=sellUnitPrice(s.id,c),st=v.stock[s.id]||0;
    right.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+d.name+'</b> ×'+n+'<p class="st">'+d.desc+'<br>'+(d.noSell?'Este item não pode ser vendido.':'Preço agora: <b>◉'+p+'</b> cada (valor base ◉'+d.value+')'+(st?'<br>O vendedor já tem '+st+' no estoque: o preço cai com o excesso.':''))+'</p>';
    if(!d.noSell){
      const sell=(q)=>{const r=sellItem(c,s.id,q);if(r.sold>0){sfx('coin',0);toast('Vendido: '+r.sold+'× '+d.name+'  +◉'+r.earned+(r.broke?'  •  o vendedor ficou sem ouro':''),2200)}else if(r.broke)toast('O vendedor está sem ouro para este item.',2200);renderStore()};
      right.appendChild(UI.button('Vender 1','gold',()=>sell(1)));
      if(n>1)right.appendChild(UI.button('Vender tudo ('+n+')','alt',()=>sell(n)));
    }
  }else right.innerHTML='<p class="st">Clique em um item da mochila. (Armas e curas das barras não aparecem aqui: guarde-as na bolsa para vendê-las.)</p>';
  const back=UI.button('← Voltar','alt',()=>{G.storeMode='menu';renderStore()});back.style.marginTop='10px';body.appendChild(back);
}
