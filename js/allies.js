'use strict';
// ---------- Exército: soldados recrutados no Quartel ----------
const ALLIES=[];
const VEST_HP=40;
const ARMY={vest:false,dmg:0,hp:0,weapon:0,owned:[true,false,false,false,false,false],max:5,maxLvl:8,recruitCost:100,city:null};
const allyMaxHp=()=>45+12*ARMY.hp;
const allyDmgMul=()=>1+0.25*ARMY.dmg;
const allyCount=()=>ALLIES.filter(a=>a.alive).length;
const upCost=l=>120+80*l;
const bp=(b,k)=>pc(b,ARMY.city,k);   // preço ajustado pela cidade do quartel

function giveAllyVest(a){
  a.armor=VEST_HP;if(a.vested)return;a.vested=true;
  part(a.group,GEO_BOX,0.56,0.55,0.3,0x4f5a66,0,1.2,0);part(a.model.head,GEO_BOX,0.62,0.12,0.62,0x9ab0c8,0,0.42,0);
}
// Força dos animais (do mais fraco ao mais forte): lobo < aranha < escorpião < javali < urso.
// in: multiplicador do dano que soldados/bandidos causam no animal (lobo 3x, vai caindo até 1x no urso)
// out: multiplicador do dano que o animal causa em soldados/bandidos (lobo e aranha 1x; sobe a partir do escorpião até 1,6x no urso)
// Só vale nas brigas entre eles; o dano em você e nos seus soldados não muda.
const WILD_TIER={wolf:{in:3,out:1},spider:{in:2.5,out:1},scorpion:{in:2,out:1.2},boar:{in:1.5,out:1.4},bear:{in:1,out:1.6}};
function hurtTarget(tg,dmg,fx,fz,src){
  if(tg===P)damagePlayer(dmg,fx,fz);
  else if(tg.kind==='enemy'){
    if(src){const sp=src.city.kind==='pack',tp=tg.city.kind==='pack';
      if(!sp&&tp)dmg*=(WILD_TIER[tg.type]||{in:1}).in;else if(sp&&!tp)dmg*=(WILD_TIER[src.type]||{out:1}).out}
    damageEnemy(tg,dmg,false,true,src);
  }else if(tg.kind==='npc')damageNpc(tg,dmg,src);
  else if(tg.kind==='guard')damageGuard(tg,dmg);
  else damageAlly(tg,dmg);
}
// alvo de briga: animal x soldado/bandido, só quando o jogador está vendo o animal
function wildFoe(e){
  const pk=e.city.kind==='pack',lim=pk?24:28;let best=null,bd=lim;
  for(const o of ENEMIES){
    if(o===e||!o.alive||(o.city.kind==='pack')===pk||o.def.bomb)continue;
    if(!(pk?e.watched:o.watched))continue;
    const d=Math.hypot(o.x-e.x,o.z-e.z);if(d<bd){bd=d;best=o}
  }
  return best;
}
function wildCiv(e){   // animais preferem perseguir civis (vistos pelo jogador)
  if(!e.watched&&e.city.kind!=='raid')return null;let best=null,bd=45;
  for(const n of NPCS){if(!n.alive||n.gone||n.role==='hostage'||n.role==='guard')continue;const d=Math.hypot(n.x-e.x,n.z-e.z);if(d<bd){bd=d;best=n}}
  return best;
}
function pickTarget(e){
  if(e.revengeT>0&&e.revenge&&(e.revenge===P?!P.dead:e.revenge.alive))return e.revenge;
  if(e.city.kind&&e.city.kind!=='dungeon'){const gd=nearGuard(e,20);if(gd&&!(e.aggro&&Math.hypot(P.x-e.x,P.z-e.z)<14))return gd}   // bandidos e animais atacam os guardas de caravana que estiverem perto
  if(CONTEST.active&&CONTEST.areas.includes(e.city)){   // disputa do portal dourado: cada tropa luta com a mais próxima de outro grupo; sem ninguém por perto, ataca você
    let best=null,bd=32;for(const o of ENEMIES){if(o===e||!o.alive||o.city===e.city||!CONTEST.areas.includes(o.city))continue;const d=Math.hypot(o.x-e.x,o.z-e.z);if(d<bd){bd=d;best=o}}
    if(best)return best;
  }
  if(e.city.kind==='pack'){const dp=Math.hypot(P.x-e.x,P.z-e.z);if(!(e.aggro&&dp<14)){const cv=wildCiv(e);if(cv)return cv}}
  const wf=wildFoe(e);
  if(wf){
    const dp=Math.hypot(P.x-e.x,P.z-e.z),df=Math.hypot(wf.x-e.x,wf.z-e.z);
    if(e.city.kind==='pack'){if(!(e.aggro&&dp<14))return wf}
    else if(e.city.state!=='attacking'||df<10)return wf;
  }
  let best=null,bd=1e9;
  for(const a of ALLIES){if(!a.alive)continue;const d=Math.hypot(a.x-e.x,a.z-e.z);if(d<bd){bd=d;best=a}}
  const dp=Math.hypot(P.x-e.x,P.z-e.z);
  if(best&&(P.dead||(bd<30&&bd<dp*0.8)))return best;
  return P;
}
function spawnAlly(x,z,city){
  const rng=new RNG((Math.random()*1e9)|0);
  const m=buildHuman({skin:rng.pick(SKINS),shirt:0x2a4a9a,pants:0x2a2a3a,hairStyle:'helmet',hat:0x8a9ab0,gun:{len:0.75},scarf:0xe0e0e0});
  m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;
  const a={kind:'ally',isAlly:true,alive:true,x,z,y:tH(x,z),vy:0,ground:true,yaw:rng.range(0,6.28),hp:allyMaxHp(),maxhp:allyMaxHp(),eye:1.6,crouch:false,speed:1,
    model:m,group:m.group,r:0.35,cool:rng.range(0,1),scanT:0,sees:false,tgtE:null,seekE:null,phase:0,stuck:0,detour:0,detourT:0,
    state:'patrol',patrolCity:city,assaultCity:null,ang:0,slot:0,holdMul:0.75+rng.range(0,0.6),form:null,deadT:0,gone:false};
  const used=new Set(ALLIES.filter(q=>q.alive).map(q=>q.slot));let sl=0;while(used.has(sl))sl++;a.slot=sl;a.ang=sl*6.283/5+rng.range(0,0.4);
  a.armor=0;if(ARMY.vest)giveAllyVest(a);
  scene.add(a.group);ALLIES.push(a);return a;
}
function recruitAlly(c){
  if(c&&polFlag('noRecruit',c.id)){toast('Não é possível recrutar em '+c.name+' agora (política em vigor).',2500);return false}
  if(c.owner!=='player'||allyCount()>=ARMY.max||P.coins<bp(ARMY.recruitCost,'recruit'))return false;
  P.coins-=bp(ARMY.recruitCost,'recruit');
  const bk=c.barracks||{x:c.cx,z:c.cz};
  spawnAlly(bk.x+(Math.random()-0.5)*1.5,bk.z+(Math.random()-0.5)*1.5,c);
  sfx('coin',0);return true;
}
function damageAlly(a,dmg){
  if(!a.alive)return;if(a.armor>0){const ab=Math.min(a.armor,dmg*0.6);a.armor-=ab;dmg-=ab}
  a.hp-=dmg;burst(a.x,a.y+1,a.z,0x2a5ac0,6,4,0.1);
  if(a.hp<=0){a.alive=false;a.deadT=0;toast('☠ Um soldado seu caiu! Recrute outro no Quartel.',3000)}
}
function armyAssault(c,msg){
  let n=0;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),tot=allyCount();
  for(const a of ALLIES){if(!a.alive)continue;
    // aparecem atrás do jogador, em formação escalonada
    let back=5+Math.floor(n/2)*2.4+Math.random(),x=0,z=0;const side=(n%2?1:-1)*(1.8+(n>>1)*1.7);
    for(let k=0;k<6;k++){
      x=P.x+sy*back+cy*side;z=P.z+cy*back-sy*side;
      probe(x,z,0.5,tH(x,z),1.8,1.05);if(!GR.blocked&&GR.g-P.y<1.5)break;back=Math.max(1.5,back-1);
    }
    a.x=x;a.z=z;a.y=tH(x,z);a.vy=0;a.state='assault';a.assaultCity=c;a.tgtE=null;a.path=null;
    a.form={ang:n/Math.max(1,tot)*6.283+Math.random()*0.5,r:5+Math.random()*5};a.holdMul=0.75+Math.random()*0.6;n++}
  if(n&&msg!=='')toast(msg||('★ Seus '+n+' soldados avançam para o centro de '+c.name+'!'),3000);
}
function armyConquered(c){for(const a of ALLIES)if(a.alive){a.state='patrol';a.patrolCity=c;a.assaultCity=null}}
function allyFindTarget(a,w){
  const ey=a.y+1.6;let best=null,bd=1e9,seek=null,sd=1e9;
  for(const e of ENEMIES){
    if(!e.alive||e.city.state!=='attacking'||(e.city.kind&&e.city.kind!=='raid'&&e.city.kind!=='contest'))continue;   // aliados também combatem os bandidos de raid
    const d=Math.hypot(e.x-a.x,e.z-a.z);
    if(d<sd){sd=d;seek=e}
    if(d<Math.min(w.range,60)&&d<bd&&losClear(a.x,ey,a.z,e.x,e.y+e.lift+e.def.h*0.6,e.z)){bd=d;best=e}
  }
  a.tgtE=best;a.seekE=seek;
}
function updateAlly(a,dt){
  const w=WEAPONS[ARMY.weapon];
  if(!a.alive){a.deadT+=dt;a.group.rotation.z=Math.min(1,a.deadT*3)*1.5;if(a.deadT>5){scene.remove(a.group);a.gone=true}return}
  a.cool-=dt;a.scanT-=dt;
  if(a.state==='assault'){const c=a.assaultCity;if(!c||c.state!=='attacking'||c.aliveEnemies<=0){a.state='patrol';a.patrolCity=c||WORLD.home}}
  if(a.scanT<=0){a.scanT=0.25+Math.random()*0.1;allyFindTarget(a,w)}
  let moving=false;
  const t=a.tgtE&&a.tgtE.alive?a.tgtE:null;
  if(t){
    const dx=t.x-a.x,dz=t.z-a.z,d=Math.hypot(dx,dz),face=Math.atan2(dx,dz);
    a.yaw+=((face-a.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*10);
    const hold=(w.range>100?35:w.id==='shotgun'?8:18)*(a.holdMul||1);
    if(d>hold){navMove(a,t.x,t.z,3.8,dt,a.r,1.8,1.05);moving=true}
    if(a.cool<=0){
      a.cool=clamp(60/w.rpm*6,0.5,2.2)*(1+Math.random()*0.4);
      const ox=a.x,oy=a.y+1.4,oz=a.z,ty=t.y+t.lift+t.def.h*0.6;
      const hit=Math.random()<clamp(0.38-d/(w.range*2),0.12,0.3);
      const ex=t.x+(hit?0:(Math.random()-0.5)*3),ez=t.z+(hit?0:(Math.random()-0.5)*3);
      tracer(ox,oy,oz,ex,ty+(hit?0:(Math.random()-0.5)),ez,0x9ad0ff);sfx(w.sfx,Math.hypot(a.x-P.x,a.z-P.z)*1.2);
      if(hit){
        if(w.rocket)explode(t.x,ty,t.z,5,w.dmg*allyDmgMul()*0.22,true,true);
        else damageEnemy(t,w.dmg*(w.pellets>1?w.pellets*0.55:1)*allyDmgMul()*0.22,false,true);
      }
    }
  }else if(a.state==='assault'){
    const c=a.assaultCity,dc=Math.hypot(c.cx-a.x,c.cz-a.z);
    const fm=a.form||{ang:0,r:0};let tx=c.cx+Math.cos(fm.ang)*fm.r,tz=c.cz+Math.sin(fm.ang)*fm.r;
    if(dc<7&&a.seekE){tx=a.seekE.x;tz=a.seekE.z}
    const d=navMove(a,tx,tz,dc>40?6:4,dt,a.r,1.8,1.05);a.yaw=Math.atan2(tx-a.x,tz-a.z);moving=true;
  }else{
    const c=a.patrolCity||WORLD.home,R=c.half+5+(a.slot%3)*2;
    const tx=c.cx+Math.cos(a.ang)*R,tz=c.cz+Math.sin(a.ang)*R;
    const d=navMove(a,tx,tz,Math.hypot(tx-a.x,tz-a.z)>25?6:2.4,dt,a.r,1.8,1.05);
    a.yaw=Math.atan2(tx-a.x,tz-a.z);moving=true;
    if(d<2.5||a.stuck>0.3&&Math.random()<0.02)a.ang+=0.4;
  }
  for(const o of ALLIES){if(o===a||!o.alive)continue;const dx=a.x-o.x,dz=a.z-o.z,d=Math.hypot(dx,dz);if(d<2.6&&d>0.01)moveXZ(a,dx/d*2.6*dt,dz/d*2.6*dt,a.r,1.8,1.05)}
  if(moving)a.phase+=dt*9;
  moveY(a,dt,a.r,1.8,1.05);rescueStuck(a,dt,a.r,1.8);
  a.group.position.set(a.x,a.y,a.z);a.group.rotation.y=a.yaw;
  if(moving)animWalk(a.model,a.phase,0.7);else a.model.legs.forEach(l=>l.rotation.x*=0.8);
}
function updateAllies(dt){
  for(let i=ALLIES.length-1;i>=0;i--){const a=ALLIES[i];if(a.gone){ALLIES.splice(i,1);continue}updateAlly(a,dt)}
}
function applyArmyStats(){
  for(const a of ALLIES)if(a.alive){const f=a.hp/a.maxhp;a.maxhp=allyMaxHp();a.hp=Math.min(a.maxhp,Math.max(a.hp,a.maxhp*f)+10)}
}

// ---------- Interface do Quartel ----------
function openBarracks(c){ARMY.city=c;openPanel('barracks');renderBarracks()}
function renderBarracks(){
  const n=allyCount();
  $('bkinfo').textContent='◉ '+P.coins+' moedas  •  Soldados vivos: '+n+'/'+ARMY.max+'  •  '+priceLabel(ARMY.city);
  let h='<div class="grid">';
  if(ARMY.city&&ARMY.city.owner==='player')h+='<div class="card"><b>Recrutar soldado</b><div class="st">Máx. '+ARMY.max+' vivos. Munição infinita. Teleportam até você quando a invasão começa.</div><button class="gold" data-a="rec" '+(n>=ARMY.max||P.coins<bp(ARMY.recruitCost,'recruit')?'disabled':'')+'>Recrutar ◉'+bp(ARMY.recruitCost,'recruit')+'</button></div>';
  const dl=ARMY.dmg,hl=ARMY.hp;
  h+='<div class="card"><b>Dano dos soldados</b><div class="st">Nível '+dl+'/'+ARMY.maxLvl+' • +25% de dano por nível (atual ×'+allyDmgMul().toFixed(2)+')</div><button data-a="dmg" '+(dl>=ARMY.maxLvl||P.coins<bp(upCost(dl),'soldierup')?'disabled':'')+'>'+(dl>=ARMY.maxLvl?'Máximo':'Evoluir ◉'+bp(upCost(dl),'soldierup'))+'</button></div>';
  h+='<div class="card"><b>Vida dos soldados</b><div class="st">Nível '+hl+'/'+ARMY.maxLvl+' • +12 de vida por nível (atual '+allyMaxHp()+')</div><button data-a="hp" '+(hl>=ARMY.maxLvl||P.coins<bp(upCost(hl),'soldierup')?'disabled':'')+'>'+(hl>=ARMY.maxLvl?'Máximo':'Evoluir ◉'+bp(upCost(hl),'soldierup'))+'</button></div>';
  h+='<div class="card"><b>🛡 Colete dos soldados</b><div class="st">Soldados com colete (e capacete de aço) absorvem 60% do dano até esgotar '+VEST_HP+' pontos.</div>'+(ARMY.vest?'<button data-a="refill" '+(P.coins<bp(60,'vest')?'disabled':'')+'>Repor coletes ◉'+bp(60,'vest')+'</button>':'<button class="gold" data-a="vest" '+(P.coins<bp(220,'vest')?'disabled':'')+'>Comprar ◉'+bp(220,'vest')+'</button>')+'</div>';
  WEAPONS.forEach((w,i)=>{
    const own=ARMY.owned[i],cur=ARMY.weapon===i;
    h+='<div class="card'+(cur?'':own?'':' locked')+'"><b>'+w.name+(cur?' ✔ (em uso)':'')+'</b><div class="st">Dano '+w.dmg+(w.pellets>1?' ×'+w.pellets:'')+' • '+w.rpm+' dpm</div>'+
      (cur?'':own?'<button data-a="eq" data-i="'+i+'">Equipar</button>':'<button class="gold" data-a="buy" data-i="'+i+'" '+(P.coins<bp(w.price,'weapon')?'disabled':'')+'>Comprar ◉'+w.price+'</button>')+'</div>';
  });
  $('bkbody').innerHTML=h+'</div>';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#bkbody button');if(!b)return;
  const a=b.dataset.a,i=+b.dataset.i;
  if(a==='rec')recruitAlly(ARMY.city);
  else if(a==='dmg'&&P.coins>=bp(upCost(ARMY.dmg),'soldierup')&&ARMY.dmg<ARMY.maxLvl){P.coins-=bp(upCost(ARMY.dmg),'soldierup');ARMY.dmg++;sfx('coin',0)}
  else if(a==='hp'&&P.coins>=bp(upCost(ARMY.hp),'soldierup')&&ARMY.hp<ARMY.maxLvl){P.coins-=bp(upCost(ARMY.hp),'soldierup');ARMY.hp++;applyArmyStats();sfx('coin',0)}
  else if(a==='buy'&&P.coins>=bp(WEAPONS[i].price,'weapon')){P.coins-=bp(WEAPONS[i].price,'weapon');ARMY.owned[i]=true;ARMY.weapon=i;sfx('coin',0)}
  else if(a==='eq'){ARMY.weapon=i}
  else if(a==='vest'&&!ARMY.vest&&P.coins>=bp(220,'vest')){P.coins-=bp(220,'vest');ARMY.vest=true;for(const x of ALLIES)if(x.alive)giveAllyVest(x);sfx('coin',0)}
  else if(a==='refill'&&P.coins>=bp(60,'vest')){P.coins-=bp(60,'vest');for(const x of ALLIES)if(x.alive)x.armor=VEST_HP;sfx('coin',0)}
  renderBarracks();
});

