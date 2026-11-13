'use strict';
// ---------- Inventário, itens, loot, cura e durabilidade das armas (Fase 1) ----------
// Regras definidas pelo autor:
//  - bolsa com número limitado de espaços, com UM upgrade de capacidade;
//  - itens NÃO caem no chão: se a bolsa está cheia, os novos ficam "pendentes" e o jogador escolhe o que descartar; o resto some;
//  - armas quebram e só voltam a funcionar quando consertadas; consertar nunca é bloqueado, mas pode gerar dívida (saldo negativo).
const INV_BASE=20,INV_UPGRADED=30,INV_UP_COST=300,BAR_SIZE=3;
const WEAR=[0.3,0.12,0.22,0.8,1.5,3];   // desgaste (em %) por tiro de cada arma
const REPAIR_BASE=[120,150,350,250,600,900]; // base de preço para o conserto (a pistola não tem preço de compra)
const itemDef=id=>DATA.items[id]||null;

function newInv(){return{size:INV_BASE,slots:new Array(INV_BASE).fill(null),bar:new Array(BAR_SIZE).fill(null),upgraded:false,pending:[]}}
Hooks.on('resetState',()=>{
  STATE.inv=newInv();STATE.dur=WEAPONS.map(()=>100);STATE.buffs=[];STATE.vendors={};
  STATE.inv.slots[0]={id:'vara',n:1};   // todo jogador começa com a vara de pescar
});
// garante que um estado carregado tenha todos os campos (salvamentos antigos)
function normalizeInv(){
  if(!STATE.inv)STATE.inv=newInv();
  const inv=STATE.inv;
  while(inv.slots.length<inv.size)inv.slots.push(null);
  if(!inv.bar)inv.bar=new Array(BAR_SIZE).fill(null);
  if(!inv.pending)inv.pending=[];
  if(!STATE.dur)STATE.dur=WEAPONS.map(()=>100);
  if(!STATE.buffs)STATE.buffs=[];
  if(!STATE.vendors)STATE.vendors={};
  if(invCount('vara')<=0&&!inv.pending.some(p=>p.id==='vara'))invAdd('vara',1);   // salvamentos antigos ganham a vara
}
// classe de cor do espaço: relíquia dourada, itens de cura em vermelho claro
function itemSlotCls(id){const d=itemDef(id);return !d?'':d.type==='relic'?'rel':(d.type==='consumable'&&d.use&&d.use.heal)?'heal':''}

// ---------- operações da bolsa ----------
function invCount(id){let n=0;for(const s of STATE.inv.slots)if(s&&s.id===id)n+=s.n;return n}
function invUsed(){return STATE.inv.slots.filter(Boolean).length}
// quantas unidades de um item ainda cabem
function invRoomFor(id){
  const d=itemDef(id);let room=0;
  for(const s of STATE.inv.slots){if(!s)room+=d.stack;else if(s.id===id)room+=d.stack-s.n}
  return room;
}
// coloca o que couber; devolve o que sobrou
function invAdd(id,n){
  const d=itemDef(id),inv=STATE.inv;let left=n;
  for(const s of inv.slots){if(left<=0)break;if(s&&s.id===id&&s.n<d.stack){const t=Math.min(left,d.stack-s.n);s.n+=t;left-=t}}
  for(let i=0;i<inv.slots.length&&left>0;i++){if(!inv.slots[i]){const t=Math.min(left,d.stack);inv.slots[i]={id,n:t};left-=t}}
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
  invChanged();
  if(full){G.invAlert=true;toast('🎒 Bolsa cheia! Aperte B para escolher o que descartar.',4000)}
  return parts.join(', ');
}
function invRemove(id,n){
  let left=n;const sl=STATE.inv.slots;
  for(let i=sl.length-1;i>=0&&left>0;i--){const s=sl[i];if(s&&s.id===id){const t=Math.min(left,s.n);s.n-=t;left-=t;if(s.n<=0)sl[i]=null}}
  invChanged();return n-left;
}
// tenta guardar os pendentes depois de liberar espaço
function flushPending(){
  const p=STATE.inv.pending;
  for(let i=p.length-1;i>=0;i--){const left=invAdd(p[i].id,p[i].n);if(left<=0)p.splice(i,1);else p[i].n=left}
}
function invChanged(){flushPending();refreshHotbar();if(G.panel==='inv')renderInventory()}
function invUpgrade(){
  const inv=STATE.inv;if(inv.upgraded){toast('A bolsa já foi ampliada.',1500);return false}
  if(!Ledger.spend({gold:INV_UP_COST})){toast(Ledger.anyDebt()?'Você está em dívida: compras bloqueadas.':'Ouro insuficiente.',2000);return false}
  inv.upgraded=true;inv.size=INV_UPGRADED;while(inv.slots.length<inv.size)inv.slots.push(null);
  sfx('coin',0);toast('🎒 Bolsa ampliada para '+inv.size+' espaços!',2500);invChanged();return true;
}

// ---------- loot ----------
function rollLoot(key){
  const t=DATA.loot[key];if(!t)return[];const out=[];
  for(const d of t.drops){if(Math.random()<d.p){const n=d.min?d.min+Math.floor(Math.random()*(d.max-d.min+1)):1;out.push([d.id,n])}}
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
// baú aberto: loot garantido (pelo menos um item). Devolve o texto do que veio
function lootChest(){
  let list=rollLoot('chest');if(!list.length)list=rollOne('chest');
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
function invUse(id){
  const d=itemDef(id);if(!d||!d.use||P.dead)return false;
  if(G.useCd>0)return false;
  if(invCount(id)<=0){toast('Você não tem '+d.name+'.',1500);return false}
  if(d.use.heal){
    if(P.hp>=P.maxhp&&!d.use.buff){toast('Sua vida já está cheia.',1500);return false}
    P.hp=Math.min(P.maxhp,P.hp+d.use.heal);
  }
  if(d.use.buff){for(const b of[].concat(d.use.buff))applyBuff(b)}
  if(d.use.regen){
    if(P.hp>=P.maxhp){toast('Sua vida já está cheia.',1500);return false}
    P.regen={left:d.use.regen.secs,rate:d.use.regen.total/d.use.regen.secs};
  }
  invRemove(id,1);G.useCd=0.8;sfx('coin',0);toast(d.icon+' '+d.name+' usada',1200);return true;
}
function useBar(i){const id=STATE.inv.bar[i];if(!id){toast('Atalho '+(i+7)+' vazio. Abra a bolsa (B) para escolher um item.',2200);return}invUse(id)}
function updateInventory(dt){
  G.useCd=Math.max(0,(G.useCd||0)-dt);updateBuffs(dt);
  if(P.regen&&!P.dead){P.hp=Math.min(P.maxhp,P.hp+P.regen.rate*dt);P.regen.left-=dt;if(P.regen.left<=0||P.hp>=P.maxhp)P.regen=null}
}
// HUD dos atalhos
function refreshHotbar(){
  const el=document.getElementById('hotbar');if(!el||!STATE.inv)return;
  const inv=STATE.inv;let h='';
  inv.bar.forEach((id,i)=>{
    const d=id&&itemDef(id),n=id?invCount(id):0;
    h+='<div class="hb'+(id&&n<=0?' empty':'')+(id?' '+itemSlotCls(id):'')+'"><i>'+(i+7)+'</i>'+(d?d.icon:'')+(d&&n>0?'<b>'+n+'</b>':'')+'</div>';
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
  const i=WS.cur,before=STATE.dur[i];STATE.dur[i]=Math.max(0,before-WEAR[i]);const now=STATE.dur[i];
  if(before>=25&&now<25)toast('⚠ '+WEAPONS[i].name+' desgastada (25%). Conserte no armeiro.',3000);
  else if(before>=10&&now<10)toast('⚠ '+WEAPONS[i].name+' quase quebrando (10%)!',3000);
  else if(before>0&&now<=0)toast('💥 '+WEAPONS[i].name+' QUEBROU! Conserte no armeiro.',4000);
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
function renderInventory(){
  const inv=STATE.inv;if(!inv)return;
  $('invinfo').textContent='◉ '+P.coins+'  •  Bolsa: '+invUsed()+'/'+inv.size+(P.coins<0?'  •  ⚠ em dívida':'');
  UI.slotGrid($('invgrid'),{cols:5,slots:inv.slots.slice(0,inv.size),
    render:(s,i)=>{
      const d=s&&itemDef(s.id);
      return{label:d?d.icon:'',count:s?s.n:0,title:d?d.name+(s.n>1?' ×'+s.n:''):'Vazio',cls:(G.invSel===i?'sel':'')+(G.pendSel!==null&&G.pendSel!==undefined&&s?' target':'')+(s?' '+itemSlotCls(s.id):'')};
    },
    onClick:(s,i)=>{
      if(G.pendSel!==null&&G.pendSel!==undefined&&inv.pending[G.pendSel]){
        // trocar: descarta a pilha clicada e guarda o item novo no lugar
        const p=inv.pending[G.pendSel];
        if(s){const t=Math.min(p.n,itemDef(p.id).stack);inv.slots[i]={id:p.id,n:t};p.n-=t;if(p.n<=0)inv.pending.splice(G.pendSel,1);G.pendSel=null;G.invSel=i;invChanged()}
        else{G.invSel=i;renderInventory()}
        return;
      }
      G.invSel=i;renderInventory();
    }});
  // detalhes do item selecionado
  const det=$('invdetail');det.innerHTML='';
  const s=(G.invSel!==null&&G.invSel!==undefined)?inv.slots[G.invSel]:null;
  if(s){
    const d=itemDef(s.id);
    det.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+d.name+'</b> ×'+s.n+'<p class="st">'+d.desc+'<br>Valor: ◉'+d.value+(d.noSell?' (não vendável)':'')+'</p>';
    if(d.use){
      det.appendChild(UI.button('Usar','gold',()=>{invUse(s.id);renderInventory()}));
      for(let b=0;b<BAR_SIZE;b++)det.appendChild(UI.button('Atalho '+(b+7)+(inv.bar[b]===s.id?' ✔':''),'alt',()=>{inv.bar[b]=s.id;refreshHotbar();renderInventory()}));
    }
    if(!d.key)det.appendChild(UI.button('Descartar','red',()=>UI.confirm('Descartar '+d.name+' ×'+s.n+'? Esta ação não pode ser desfeita.',()=>{inv.slots[G.invSel]=null;G.invSel=null;invChanged()},'Descartar')));
  }else det.innerHTML='<p class="st">Clique em um item para ver os detalhes.</p>';
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
  // durabilidade das armas
  const we=$('invweapons');
  we.innerHTML='<b>Armas</b>'+WEAPONS.map((w,i)=>WS.owned[i]?'<div class="st">'+w.name+': '+(weaponBroken(i)?'<span style="color:#ff6a6a">QUEBRADA</span>':Math.round(durOf(i))+'%')+'</div>':'').join('');
  const up=$('invup');up.textContent=inv.upgraded?'Bolsa ampliada ✔':'Ampliar bolsa (+'+(INV_UPGRADED-INV_BASE)+' espaços) ◉'+INV_UP_COST;
  up.disabled=inv.upgraded;
}
