'use strict';
// ---------- Inventário, itens, loot, cura e durabilidade das armas (Fase 1; armas como itens na Fase 2b) ----------
// Regras definidas pelo autor:
//  - bolsa com número limitado de espaços, com UM upgrade de capacidade;
//  - itens NÃO caem no chão: se a bolsa está cheia, os novos ficam "pendentes" e o jogador escolhe o que descartar; o resto some;
//  - ARMAS são itens. A barra 1–6 guarda as armas (e a vara de pescar); a barra 7–9 guarda curas. O que está em uma barra NÃO ocupa
//    espaço na bolsa;
//  - armas quebram e só voltam a funcionar quando consertadas; consertar nunca é bloqueado, mas pode gerar dívida (saldo negativo).
const INV_BASE=20,INV_UPGRADED=30,INV_UP_COST=300,CBAR=3,WBAR=6;
const WEAR=[0.3,0.12,0.22,0.8,1.5,3];   // desgaste (em %) por tiro de cada arma
const REPAIR_BASE=[120,150,350,250,600,900]; // base de preço para o conserto (a pistola não tem preço de compra)
const itemDef=id=>DATA.items[id]||null;
const wItemId=i=>'w_'+WEAPONS[i].id;

function newInv(){return{size:INV_BASE,slots:new Array(INV_BASE).fill(null),bar:new Array(CBAR).fill(null),wbar:['w_pistol',null,null,null,null,null],upgraded:false,pending:[]}}
Hooks.on('resetState',()=>{
  STATE.inv=newInv();STATE.dur=WEAPONS.map(()=>100);STATE.buffs=[];STATE.vendors={};STATE.fishGone={};
  STATE.portals=[];STATE.portalSeq=0;STATE.portalDay=undefined;STATE.legend={};STATE.burnt={};STATE.raidDay=0;STATE.raidLast=-9;
});
// garante que um estado carregado tenha todos os campos (salvamentos antigos)
function normalizeInv(){
  if(!STATE.inv)STATE.inv=newInv();
  const inv=STATE.inv;
  while(inv.slots.length<inv.size)inv.slots.push(null);
  if(!Array.isArray(inv.bar)||inv.bar.length!==CBAR)inv.bar=new Array(CBAR).fill(null);
  inv.bar=inv.bar.map(b=>(b&&typeof b==='object'&&b.id)?b:null);   // formato antigo (só o id) vira atalho vazio
  if(!Array.isArray(inv.wbar)||inv.wbar.length!==WBAR)inv.wbar=['w_pistol',null,null,null,null,null];
  if(!inv.pending)inv.pending=[];
  if(!STATE.dur)STATE.dur=WEAPONS.map(()=>100);
  if(!STATE.buffs)STATE.buffs=[];
  if(!STATE.vendors)STATE.vendors={};
  if(!STATE.fishGone)STATE.fishGone={};
  if(!STATE.portals)STATE.portals=[];
  if(!STATE.legend)STATE.legend={};
  if(!STATE.burnt)STATE.burnt={};
  if(STATE.raidDay===undefined)STATE.raidDay=0;
  if(STATE.raidLast===undefined)STATE.raidLast=-9;
}
// classe de cor do espaço: relíquia dourada, itens de cura em vermelho claro
function itemSlotCls(id){const d=itemDef(id);return !d?'':d.type==='relic'?'rel':(d.type==='consumable'&&d.use&&d.use.heal)?'heal':''}

// ---------- localizações: bolsa (bag), barra de consumíveis 7–9 (cbar) e barra de armas 1–6 (wbar) ----------
function getLoc(l){
  const inv=STATE.inv;
  if(l.k==='bag')return inv.slots[l.i]||null;
  if(l.k==='cbar')return inv.bar[l.i]||null;
  const id=inv.wbar[l.i];return id?{id,n:1}:null;
}
function setLoc(l,it){
  const inv=STATE.inv;
  if(l.k==='bag')inv.slots[l.i]=it;
  else if(l.k==='cbar')inv.bar[l.i]=it;
  else inv.wbar[l.i]=it?it.id:null;
}
function accepts(k,it){
  if(!it)return true;const d=itemDef(it.id);
  if(k==='wbar')return d.type==='weapon';
  if(k==='cbar')return d.type==='consumable';
  return true;
}
function bagFree(){return STATE.inv.slots.findIndex((s,i)=>!s&&i<STATE.inv.size)}
// move (ou troca) um item entre dois espaços. Devolve true se algo mudou.
function moveItem(src,dst){
  if(src.k===dst.k&&src.i===dst.i)return false;
  const a=getLoc(src),b=getLoc(dst);if(!a)return false;
  if(!accepts(dst.k,a))return false;
  if(b&&b.id===a.id&&dst.k!=='wbar'){
    const d=itemDef(a.id),t=Math.min(a.n,d.stack-b.n);if(t<=0)return false;
    b.n+=t;a.n-=t;if(a.n<=0)setLoc(src,null);return true;
  }
  if(b&&!accepts(src.k,b))return false;
  setLoc(dst,a);setLoc(src,b||null);return true;
}
function afterMove(){syncOwned();ensureEquipped();invChanged()}

// ---------- operações da bolsa ----------
function invCount(id){
  let n=0;const inv=STATE.inv;
  for(const s of inv.slots)if(s&&s.id===id)n+=s.n;
  for(const s of inv.bar)if(s&&s.id===id)n+=s.n;
  for(const w of inv.wbar)if(w===id)n+=1;
  return n;
}
function invUsed(){return STATE.inv.slots.slice(0,STATE.inv.size).filter(Boolean).length}
// quantas unidades de um item ainda cabem (na bolsa e, para consumíveis, nos atalhos que já guardam o mesmo item)
function invRoomFor(id){
  const d=itemDef(id),inv=STATE.inv;let room=0;
  for(let i=0;i<inv.size;i++){const s=inv.slots[i];if(!s)room+=d.stack;else if(s.id===id)room+=d.stack-s.n}
  for(const s of inv.bar)if(s&&s.id===id)room+=d.stack-s.n;
  return room;
}
// coloca o que couber; devolve o que sobrou
function invAdd(id,n){
  const d=itemDef(id),inv=STATE.inv;let left=n;
  if(d.type==='weapon'){const k=inv.wbar.indexOf(null);if(k>=0&&left>0){inv.wbar[k]=id;left--}}   // armas e a vara vão direto para a barra 1–6, se houver vaga
  for(const s of inv.bar){if(left<=0)break;if(s&&s.id===id&&s.n<d.stack){const t=Math.min(left,d.stack-s.n);s.n+=t;left-=t}}
  for(let i=0;i<inv.size&&left>0;i++){const s=inv.slots[i];if(s&&s.id===id&&s.n<d.stack){const t=Math.min(left,d.stack-s.n);s.n+=t;left-=t}}
  for(let i=0;i<inv.size&&left>0;i++){if(!inv.slots[i]){const t=Math.min(left,d.stack);inv.slots[i]={id,n:t};left-=t}}
  return left;
}
// recebe itens: o que não couber vira "pendente" (o jogador escolhe o que descartar). Devolve o texto para o aviso.
function invGive(list){
  const parts=[];let full=false;
  for(const [id,n] of list){
    const left=invAdd(id,n),got=n-left;
    if(got>0)parts.push('+'+got+' '+itemDef(id).icon+' '+itemDef(id).name);
    if(left>0){full=true;const p=STATE.inv.pending,ex=p.find(x=>x.id===id);if(ex)ex.n+=left;else p.push({id,n:left});while(p.length>6)p.shift()}
  }
  syncOwned();invChanged();
  if(full){G.invAlert=true;toast('🎒 Bolsa cheia! Aperte B para escolher o que descartar.',4000)}
  return parts.join(', ');
}
// remove da bolsa primeiro e depois dos atalhos de consumíveis
function invRemove(id,n){
  let left=n;const inv=STATE.inv,sl=inv.slots;
  for(let i=sl.length-1;i>=0&&left>0;i--){const s=sl[i];if(s&&s.id===id){const t=Math.min(left,s.n);s.n-=t;left-=t;if(s.n<=0)sl[i]=null}}
  for(let i=0;i<inv.bar.length&&left>0;i++){const s=inv.bar[i];if(s&&s.id===id){const t=Math.min(left,s.n);s.n-=t;left-=t;if(s.n<=0)inv.bar[i]=null}}
  syncOwned();ensureEquipped();invChanged();return n-left;
}
// tenta guardar os pendentes depois de liberar espaço
function flushPending(){
  const p=STATE.inv.pending;
  for(let i=p.length-1;i>=0;i--){const left=invAdd(p[i].id,p[i].n);if(left<=0)p.splice(i,1);else p[i].n=left}
}
function invChanged(){flushPending();syncOwned();refreshHotbar();if(G.panel==='inv')renderInventory()}
// a ampliação da bolsa é vendida no Armeiro (o preço vem de lá)
function invUpgrade(cost){
  const inv=STATE.inv;if(inv.upgraded){toast('A bolsa já foi ampliada.',1500);return false}
  if(!Ledger.spend({gold:cost||INV_UP_COST})){toast(Ledger.anyDebt()?'Você está em dívida: compras bloqueadas.':'Ouro insuficiente.',2000);return false}
  inv.upgraded=true;inv.size=INV_UPGRADED;while(inv.slots.length<inv.size)inv.slots.push(null);
  sfx('coin',0);toast('🎒 Bolsa ampliada para '+inv.size+' espaços!',2500);invChanged();return true;
}

// ---------- armas como itens ----------
function weaponHere(i){const id=wItemId(i),inv=STATE.inv;return inv.wbar.includes(id)||inv.slots.some(s=>s&&s.id===id)}
function weaponsOwnedCount(){let n=0;for(let i=0;i<WEAPONS.length;i++)if(weaponHere(i))n++;return n}
// a posse (WS.owned) sempre segue o que existe nas barras e na bolsa
function syncOwned(){if(!STATE.inv)return;for(let i=0;i<WEAPONS.length;i++)WS.owned[i]=weaponHere(i)}
// recebe uma arma: vai para a primeira vaga livre da barra 1–6; sem vaga, vai para a bolsa
function giveWeapon(i,silent){
  if(weaponHere(i))return true;
  const inv=STATE.inv,id=wItemId(i),w=WEAPONS[i],slot=inv.wbar.indexOf(null);
  if(slot<0&&invRoomFor(id)<1){toast('Bolsa e barra de armas cheias! Descarte algo antes.',2500);return false}
  WS.mag[i]=w.mag;WS.reserve[i]=Math.max(WS.reserve[i]||0,w.pack);STATE.dur[i]=100;
  if(slot>=0){inv.wbar[slot]=id;syncOwned();selectWeapon(i)}else{invAdd(id,1);syncOwned()}
  invChanged();if(!silent)toast('🔫 '+w.name+' adquirida'+(slot>=0?' (barra '+(slot+1)+')':' (na bolsa: coloque-a na barra 1–6)'),2500);
  return true;
}
// ao carregar: garante que cada arma "possuída" exista como item (barra ou bolsa)
function reconcileWeapons(){
  const inv=STATE.inv;
  for(const id of inv.wbar)if(id)for(let k=0;k<inv.slots.length;k++)if(inv.slots[k]&&inv.slots[k].id===id)inv.slots[k]=null;   // sem cópia da mesma arma na bolsa
  for(let i=0;i<WEAPONS.length;i++){
    if(WS.owned[i]&&!weaponHere(i)){const slot=inv.wbar.indexOf(null);if(slot>=0)inv.wbar[slot]=wItemId(i);else invAdd(wItemId(i),1)}
  }
  syncOwned();ensureEquipped();refreshHotbar();
}
// mantém sempre algo válido na mão (arma da barra, vara, ou nada)
function ensureEquipped(){
  if(!WS.vm.length||!STATE.inv)return;
  const w=STATE.inv.wbar;
  if(WS.rod&&!w.includes('vara'))WS.rod=false;
  if(WS.rod){WS.none=false;WS.vm.forEach((v,k)=>v.visible=(k===WEAPONS.length));return}
  if(w.includes(wItemId(WS.cur))){WS.none=false;WS.vm.forEach((v,k)=>v.visible=(k===WS.cur));return}
  const first=w.find(id=>id&&itemDef(id).weapon!==undefined);
  if(first){WS.cur=itemDef(first).weapon;WS.none=false;WS.vm.forEach((v,k)=>v.visible=(k===WS.cur));return}
  if(w.includes('vara')){WS.rod=true;WS.none=false;WS.vm.forEach((v,k)=>v.visible=(k===WEAPONS.length));return}
  WS.none=true;WS.vm.forEach(v=>v.visible=false);
}
function selectSlot(k){
  const id=STATE.inv.wbar[k];if(!id)return;
  const d=itemDef(id);
  if(d.rod)equipRod();else selectWeapon(d.weapon);
}
function slotOfWeapon(i){return STATE.inv.wbar.indexOf(wItemId(i))}
function equippedSlot(){const w=STATE.inv.wbar;if(WS.rod)return w.indexOf('vara');if(WS.none)return -1;return w.indexOf(wItemId(WS.cur))}

// ---------- loot ----------
const CHEST_MAX_ITEMS=3;   // no máximo 3 tipos de item por baú
function rollLoot(key){
  const t=DATA.loot[key];if(!t)return[];let out=[];
  for(const d of t.drops){if(Math.random()<d.p){const n=d.min?d.min+Math.floor(Math.random()*(d.max-d.min+1)):1;out.push([d.id,n])}}
  if((key==='chest'||key==='chest_dungeon')&&out.length>CHEST_MAX_ITEMS)out=out.sort(()=>Math.random()-0.5).slice(0,CHEST_MAX_ITEMS);
  return out;
}
// sorteia UM item da tabela, ponderado pelas chances (usado quando o loot é garantido)
function rollOne(key){
  const t=DATA.loot[key];if(!t)return[];let tot=0;for(const d of t.drops)tot+=d.p;
  let r=Math.random()*tot;
  for(const d of t.drops){r-=d.p;if(r<=0)return[[d.id,d.min?d.min+Math.floor(Math.random()*(d.max-d.min+1)):1]]}
  const d=t.drops[0];return[[d.id,d.min||1]];
}
const LOOT_CHANCE=0.3;   // chance de um inimigo morto pelo jogador deixar itens; os baús sempre dão
// inimigo morto pelo jogador
function dropLoot(e){
  if(Math.random()>=LOOT_CHANCE)return;
  let list=rollLoot(e.type);if(!list.length)list=rollOne(e.type);if(!list.length)return;
  const txt=invGive(list);if(txt)toast('🎁 '+txt,2200);
}
// baú aberto: loot garantido (pelo menos um item). key: 'chest' (comum) ou 'chest_dungeon'. Devolve o texto do que veio
function lootChest(key){
  key=key||'chest';
  let list=rollLoot(key);if(!list.length)list=rollOne(key);
  return list.length?invGive(list):'';
}

// ---------- bônus temporários (comida) ----------
function applyBuff(id){
  const d=DATA.buffs[id];if(!d)return;
  const b=STATE.buffs.find(x=>x.id===id);
  if(b)b.left=d.secs;else STATE.buffs.push({id,left:d.secs});
  refreshBuffs();
}
function buffMul(key){   // multiplicador acumulado de um efeito: 'dmg', 'resist', 'speed'
  let m=1;for(const b of STATE.buffs||[]){const d=DATA.buffs[b.id];if(d&&d[key])m*=d[key]}return m;
}
function buffSum(key){let s=0;for(const b of STATE.buffs||[]){const d=DATA.buffs[b.id];if(d&&d[key])s+=d[key]}return s}
function updateBuffs(dt){
  const bs=STATE.buffs;if(!bs||!bs.length)return;
  const regen=buffSum('regen');if(regen>0&&!P.dead)P.hp=Math.min(P.maxhp,P.hp+regen*dt);
  let ch=false;for(let i=bs.length-1;i>=0;i--){bs[i].left-=dt;if(bs[i].left<=0){bs.splice(i,1);ch=true}}
  G.buffT=(G.buffT||0)-dt;if(ch||G.buffT<=0){G.buffT=1;refreshBuffs()}
}
function refreshBuffs(){
  const el=document.getElementById('buffs');if(!el)return;
  el.innerHTML=(STATE.buffs||[]).map(b=>{const d=DATA.buffs[b.id];return '<div class="buff" title="'+d.desc+'">'+d.icon+' '+d.name+' <small>'+Math.ceil(b.left)+'s</small></div>'}).join('');
}

// ---------- usar itens, atalhos e regeneração ----------
// aplica o efeito (sem consumir). Devolve true se foi usado.
function applyUse(id){
  const d=itemDef(id);if(!d||!d.use||P.dead)return false;
  if(G.useCd>0)return false;
  if(d.use.heal){
    if(P.hp>=P.maxhp&&!d.use.buff){toast('Sua vida já está cheia.',1500);return false}
    P.hp=Math.min(P.maxhp,P.hp+d.use.heal);
  }
  if(d.use.regen){
    if(P.hp>=P.maxhp){toast('Sua vida já está cheia.',1500);return false}
    P.regen={left:d.use.regen.secs,rate:d.use.regen.total/d.use.regen.secs};
  }
  if(d.use.buff){for(const b of[].concat(d.use.buff))applyBuff(b)}
  G.useCd=0.8;sfx('coin',0);toast(d.icon+' '+d.name+' usada',1200);return true;
}
function invUse(id){
  if(invCount(id)<=0){const d=itemDef(id);toast('Você não tem '+(d?d.name:id)+'.',1500);return false}
  if(!applyUse(id))return false;
  invRemove(id,1);return true;
}
// usa o item do atalho 7–9; quando acaba, reabastece com o que houver na bolsa
function useBar(i){
  const inv=STATE.inv,s=inv.bar[i];
  if(!s){toast('Atalho '+(i+7)+' vazio. Abra a bolsa (B) e coloque uma cura aqui.',2200);return}
  if(!applyUse(s.id))return;
  s.n--;
  if(s.n<=0){
    inv.bar[i]=null;
    // reabastece com a bolsa
    let need=itemDef(s.id).stack,took=0;
    for(let k=inv.slots.length-1;k>=0&&took<need;k--){const b=inv.slots[k];if(b&&b.id===s.id){const t=Math.min(need-took,b.n);b.n-=t;took+=t;if(b.n<=0)inv.slots[k]=null}}
    if(took>0)inv.bar[i]={id:s.id,n:took};
  }
  invChanged();
}
function updateInventory(dt){
  G.useCd=Math.max(0,(G.useCd||0)-dt);updateBuffs(dt);
  if(P.regen&&!P.dead){P.hp=Math.min(P.maxhp,P.hp+P.regen.rate*dt);P.regen.left-=dt;if(P.regen.left<=0||P.hp>=P.maxhp)P.regen=null}
}
// HUD dos atalhos 7–9
function refreshHotbar(){
  const el=document.getElementById('hotbar');if(!el||!STATE.inv)return;
  const inv=STATE.inv;let h='';
  inv.bar.forEach((s,i)=>{
    const d=s&&itemDef(s.id);
    h+='<div class="hb'+(s?' '+itemSlotCls(s.id):'')+'"><i>'+(i+7)+'</i>'+(d?d.icon:'')+(d&&s.n>1?'<b>'+s.n+'</b>':'')+'</div>';
  });
  if(inv.pending.length)h+='<div class="invalert">🎒 Bolsa cheia — B</div>';
  el.innerHTML=h;
}

// ---------- durabilidade das armas ----------
const durOf=i=>(STATE.dur&&STATE.dur[i]!==undefined)?STATE.dur[i]:100;
function weaponBroken(i){return durOf(i===undefined?WS.cur:i)<=0}
function durMul(){const d=durOf(WS.cur);return d<25?0.75:d<50?0.9:1}
function wearWeapon(){
  if(G.noWear)return;
  const i=WS.cur,before=STATE.dur[i];STATE.dur[i]=Math.max(0,before-WEAR[i]*(STATE.legend[i]?0.5:1));const now=STATE.dur[i];   // armas lendárias gastam metade
  if(before>=25&&now<25)toast('⚠ '+wName(i)+' desgastada (25%). Conserte no armeiro.',3000);
  else if(before>=10&&now<10)toast('⚠ '+wName(i)+' quase quebrando (10%)!',3000);
  else if(before>0&&now<=0)toast('💥 '+wName(i)+' QUEBROU! Conserte no armeiro.',4000);
}
function repairCost(i,c){
  const miss=100-durOf(i);if(miss<=0)return 0;
  return pc(Math.max(5,Math.round(REPAIR_BASE[i]*0.35*miss/100)),c,'repair');
}
// conserto nunca é bloqueado: sem saldo, vira dívida (ouro negativo)
function repairWeapon(i,c){
  const cost=repairCost(i,c);if(cost<=0)return false;
  let debt=false;
  if(!Ledger.spend({gold:cost})){Ledger.borrow({gold:cost});debt=true}
  STATE.dur[i]=100;sfx('coin',0);
  toast('🔧 '+WEAPONS[i].name+' consertada'+(debt?' — ⚠ você ficou em dívida!':'!'),2500);return true;
}

// ---------- tela da bolsa ----------
function openInventory(){G.invSel=null;G.pendSel=null;openPanel('inv');renderInventory()}
function slotTitle(it,loc){
  const d=itemDef(it.id);let t=(d.weapon!==undefined?wName(d.weapon):d.name)+(it.n>1?' ×'+it.n:'');
  if(d.weapon!==undefined)t+=' — '+(weaponBroken(d.weapon)?'QUEBRADA':Math.round(durOf(d.weapon))+'%');
  return t;
}
function renderInventory(){
  const inv=STATE.inv;if(!inv)return;
  $('invinfo').textContent='◉ '+P.coins+'  •  Bolsa: '+invUsed()+'/'+inv.size+(P.coins<0?'  •  ⚠ em dívida':'');
  const sel=G.invSel,isSel=(k,i)=>sel&&sel.k===k&&sel.i===i;
  const grid=(el,k,arr,cols,keyBase)=>UI.slotGrid(el,{cols,slots:arr,
    render:(s,i)=>{
      const d=s&&itemDef(s.id);
      return{label:d?d.icon:'',count:s&&k!=='wbar'?s.n:0,key:keyBase?(i+keyBase):'',title:s?slotTitle(s,{k,i}):(k==='wbar'?'Barra de armas '+(i+1)+' (vazia)':k==='cbar'?'Atalho '+(i+7)+' (vazio)':'Vazio'),
        cls:(isSel(k,i)?'sel':'')+(G.pendSel!==null&&G.pendSel!==undefined&&k==='bag'&&s?' target':'')+(s?' '+itemSlotCls(s.id):'')};
    },
    dnd:{
      start:(s,i)=>{G.drag={k,i};G.invSel={k,i}},
      drop:(s,i)=>{const src=G.drag;G.drag=null;if(!src)return;if(moveItem(src,{k,i})){G.invSel={k,i};afterMove()}else toast('Esse item não vai nesse espaço.',1500)}
    },
    onClick:(s,i)=>{
      if(k==='bag'&&G.pendSel!==null&&G.pendSel!==undefined&&inv.pending[G.pendSel]){
        // trocar: descarta a pilha clicada e guarda o item novo no lugar
        const p=inv.pending[G.pendSel];
        if(s){const t=Math.min(p.n,itemDef(p.id).stack);inv.slots[i]={id:p.id,n:t};p.n-=t;if(p.n<=0)inv.pending.splice(G.pendSel,1);G.pendSel=null;G.invSel={k,i};afterMove()}
        else{G.invSel={k,i};renderInventory()}
        return;
      }
      G.invSel={k,i};renderInventory();
    }});
  grid($('invwbar'),'wbar',inv.wbar.map(id=>id?{id,n:1}:null),6,1);
  grid($('invcbar'),'cbar',inv.bar,3,7);
  grid($('invgrid'),'bag',inv.slots.slice(0,inv.size),5,0);
  // detalhes do item selecionado
  const det=$('invdetail');det.innerHTML='';
  const s=sel?getLoc(sel):null;
  if(s){
    const d=itemDef(s.id);
    let extra='';
    if(d.weapon!==undefined){const i=d.weapon;extra='<br>Durabilidade: '+(weaponBroken(i)?'<b style="color:#ff6a6a">QUEBRADA</b>':Math.round(durOf(i))+'%')+'<br>Munição reserva: '+WS.reserve[i]}
    if(d.weapon!==undefined&&STATE.legend[d.weapon])extra+='<br><b style="color:#ffd23a">★ Lendária: +50% de dano e desgaste pela metade</b>';
    det.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+(d.weapon!==undefined?wName(d.weapon):d.name)+'</b>'+(s.n>1?' ×'+s.n:'')+'<p class="st">'+d.desc+'<br>Valor: ◉'+d.value+(d.noSell?' (não vendável)':'')+extra+'</p>';
    const fromBag=sel.k==='bag';
    if(d.use){
      det.appendChild(UI.button('Usar','gold',()=>{if(sel.k==='cbar')useBar(sel.i);else invUse(s.id);G.invSel=null;renderInventory()}));
    }
    if(d.type==='weapon'&&sel.k==='wbar')det.appendChild(UI.button('Equipar','gold',()=>{selectSlot(sel.i);renderInventory()}));
    const lastWeapon=d.weapon!==undefined&&weaponsOwnedCount()<=1;
    if(!d.key&&!lastWeapon)det.appendChild(UI.button('Descartar','red',()=>UI.confirm('Descartar '+d.name+(s.n>1?' ×'+s.n:'')+'? Esta ação não pode ser desfeita.',()=>{setLoc(sel,null);G.invSel=null;afterMove()},'Descartar')));
  }else det.innerHTML='<p class="st">Clique em um item para ver os detalhes e <b>arraste</b> os itens entre a bolsa, a barra de armas (1–6) e os atalhos de cura (7–9). O que está nas barras não ocupa espaço na bolsa.</p>';
  // itens pendentes (bolsa cheia)
  const pe=$('invpending');pe.innerHTML='';
  if(inv.pending.length){
    const h=document.createElement('div');h.className='pendbox';
    h.innerHTML='<b>🎒 Bolsa cheia — itens novos</b><p class="st">Escolha um item novo e clique no item da bolsa que deseja descartar no lugar. O que não guardar some.</p>';
    inv.pending.forEach((p,k)=>{
      const d=itemDef(p.id),row=document.createElement('div');row.style.margin='4px 0';
      const pick=UI.button(d.icon+' '+d.name+' ×'+p.n,G.pendSel===k?'gold':'alt',()=>{G.pendSel=(G.pendSel===k?null:k);renderInventory()});
      const drop=UI.button('Descartar novo','red',()=>{inv.pending.splice(k,1);G.pendSel=null;invChanged()});
      row.append(pick,drop);h.appendChild(row);
    });
    pe.appendChild(h);
  }
}
