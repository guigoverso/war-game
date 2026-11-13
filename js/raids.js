'use strict';
// ---------- Raids de bandidos e fumaça de cidades atacadas (Fase 3) ----------
// De vez em quando bandidos atacam uma cidade sua. O jogador recebe um aviso e escolhe: (1) abandonar a missão atual e ser levado
// à cidade, ou (2) "Entendido": tem 60 s para chegar. Os bandidos atacam os moradores e quem estiver por perto. Se todos morrerem,
// você é recompensado; se o tempo acabar sem você chegar, a cidade perde recursos e fica soltando fumaça por alguns dias.
const RAID_TIME=60,RAID_LOSS_GOLD=120,RAID_LOSS_RES=0.15,RAID_CHANCE=0.35,SMOKE_DAYS=4;
const RAID={active:false,area:null,city:null,t:0,engaged:false};
const SMOKE=[];

const playerCities=()=>WORLD.cities.filter(c=>c.owner==='player');
const inCityZone=(c,pad)=>Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))<c.half+(pad||6);

function startRaid(c){
  if(RAID.active||G.dg||P.dead)return false;
  const list=playerCities();if(!list.length)return false;
  c=c||list[Math.floor(Math.random()*list.length)];
  const rank=Math.max(1,c.rank||1),n=5+rank;
  const area={kind:'raid',id:600+(STATE.raidSeq=(STATE.raidSeq||0)+1),name:'Ataque a '+c.name,cx:c.cx,cz:c.cz,y:c.y,half:c.half,biome:c.biome,rank,hpMul:1,state:'attacking',owner:'enemy',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:999,city:c};
  const off=c.half+3,side=Math.floor(Math.random()*4),bx=[c.cx+off,c.cx-off,c.cx,c.cx][side],bz=[c.cz,c.cz,c.cz+off,c.cz-off][side];
  for(let i=0;i<n;i++){
    const e=spawnEnemy(area,(i===n-1&&rank>=2)?'hound':'soldier',bx+(Math.random()-0.5)*6,bz+(Math.random()-0.5)*6);
    e.aggro=true;e.unseenT=99;e.reactT=0.5;
  }
  WORLD.areas.push(area);
  RAID.active=true;RAID.area=area;RAID.city=c;RAID.t=RAID_TIME;RAID.engaged=inCityZone(c);STATE.raidLast=DN.days;
  sfx('alarm',0);
  RAID.alliesCalled=false;RAID.seeT=0;   // os soldados só são chamados quando um bandido enxerga o jogador
  if(!RAID.engaged)openRaidPanel();else toast('⚠ Bandidos atacam '+c.name+'! Defenda a cidade!',4000);
  return true;
}
function openRaidPanel(){
  const c=RAID.city,d=Math.round(Math.hypot(c.cx-P.x,c.cz-P.z));
  $('raidtxt').innerHTML='Bandidos estão atacando <b>'+c.name+'</b>, a <b>'+d+' m</b> de você.<br>Se você não chegar em '+RAID_TIME+' segundos, a cidade perde recursos e pega fogo.';
  const box=$('raidbtns');box.innerHTML='';
  if(QUEST.active)box.appendChild(UI.button('🌀 Abandonar a missão e ir até lá','red',()=>{failQuest('Você abandonou a missão para defender '+c.name+'.');raidTeleport();closePanel()}));
  box.appendChild(UI.button('Entendido ('+RAID_TIME+' s)','gold',()=>closePanel()));
  openPanel('raid');
}
// leva o jogador à praça da cidade
function raidTeleport(){
  const c=RAID.city;if(!c)return;
  if(c.home){placePlayerHome();return}
  const S=c.S||2,Pp=c.P||9;
  for(const q of[[S+2.5,Pp-2],[-S-2.5,Pp-2],[0,Pp-1],[Pp-1,0],[-Pp+1,0],[0,-Pp+1]]){
    const x=c.cx+q[0],z=c.cz+q[1];probe(x,z,0.5,tH(x,z),1.8,1.05);
    if(!GR.blocked){P.x=x;P.z=z;P.y=GR.g;P.vy=0;P.camY=P.y;return}
  }
  P.x=c.cx+4;P.z=c.cz+4;P.y=tH(P.x,P.z)+1;P.vy=0;P.camY=P.y;
}
function endRaid(){
  const a=RAID.area;
  for(const al of ALLIES)if(al.assaultCity===a){al.state='patrol';al.patrolCity=WORLD.home;al.assaultCity=null}   // os soldados voltam a acompanhar o jogador
  if(a){for(const e of a.enemies){e.alive=false;e.gone=true;scene.remove(e.group)}a.enemies=[];a.aliveEnemies=0;const i=WORLD.areas.indexOf(a);if(i>=0)WORLD.areas.splice(i,1)}
  RAID.active=false;RAID.area=null;RAID.city=null;
  const el=document.getElementById('raidhud');if(el)el.style.display='none';
}
function onRaidCleared(){
  if(!RAID.active)return;
  const c=RAID.city,r=40+30*Math.max(1,c.rank||1);
  Ledger.add('gold',r);sfx('win',0);toast('🛡 Raid repelido! '+c.name+' está a salvo. +◉'+r,5000);
  endRaid();
}
function raidFailed(){
  const c=RAID.city,lostGold=Math.max(0,Math.min(P.coins,RAID_LOSS_GOLD));
  Ledger.add('gold',-lostGold);
  const lost=[];for(const k of['food','ore','wood']){const l=Math.floor((STATE.res[k]||0)*RAID_LOSS_RES);if(l>0){Ledger.add(k,-l);lost.push(l+' '+DATA.resources[k].name.toLowerCase())}}
  igniteCity(c);
  toast('🔥 Os bandidos saquearam '+c.name+'! Você perdeu ◉'+lostGold+(lost.length?' e '+lost.join(', '):'')+'. A cidade está em chamas.',6000);
  endRaid();
}
function updateRaids(dt){
  const hud=document.getElementById('raidhud');
  // gatilho automático: a cada dia de jogo, uma chance de raid (a partir do 2º dia, com intervalo mínimo)
  const day=Math.floor(DN.days);
  if(!RAID.active&&day>(STATE.raidDay||0)){
    STATE.raidDay=day;
    if(day>=2&&DN.days-(STATE.raidLast||-9)>=1.5&&!G.dg&&Math.random()<RAID_CHANCE)startRaid();
  }
  // fim da fumaça
  for(const id in STATE.burnt)if(DN.days-STATE.burnt[id]>SMOKE_DAYS){delete STATE.burnt[id];clearSmoke(WORLD.cities[id])}
  updateSmoke(dt);
  if(!RAID.active){if(hud)hud.style.display='none';return}
  const c=RAID.city,alive=RAID.area.enemies.filter(e=>e.alive).length;
  if(!RAID.engaged&&inCityZone(c))RAID.engaged=true;
  // seus soldados aparecem atrás de você no instante em que um bandido te enxerga (assim não precisam atravessar o mapa devagar)
  if(!RAID.alliesCalled&&!P.dead&&!G.invis){
    RAID.seeT-=dt;
    if(RAID.seeT<=0){
      RAID.seeT=0.3;
      const seen=RAID.area.enemies.some(e=>e.alive&&Math.hypot(e.x-P.x,e.z-P.z)<46&&playerVisibleFrom(e.x,e.y+e.def.eye,e.z,P));
      if(seen){RAID.alliesCalled=true;armyAssault(RAID.area,'★ Os bandidos te viram! Seus soldados chegaram atrás de você!')}
    }
  }
  if(alive===0){onRaidCleared();return}
  if(!RAID.engaged){RAID.t-=dt;if(RAID.t<=0){raidFailed();return}}
  if(hud){
    hud.style.display='block';
    const d=Math.round(Math.hypot(c.cx-P.x,c.cz-P.z));
    hud.innerHTML=RAID.engaged?'🛡 Defenda <b>'+c.name+'</b>: '+alive+' bandidos':'⚠ <b>'+c.name+'</b> sob ataque! Chegue em <b>'+Math.ceil(RAID.t)+' s</b> ('+d+' m)';
  }
}

// ---------- fumaça das cidades atacadas ----------
function ensureSmoke(c){
  if(!c||SMOKE.find(s=>s.c===c))return;
  const houses=(c.houses||[]).slice().sort((a,b)=>hash2(c.id,a.x0,3)-hash2(c.id,b.x0,3)).slice(0,4);
  const spots=houses.length?houses.map(h=>[c.cx+(h.x0+h.x1)/2+0.5,c.cz+(h.z0+h.z1)/2+0.5]):[[c.cx,c.cz]];
  const g=new THREE.Group(),puffs=[];
  spots.forEach((s,k)=>{
    for(let i=0;i<12;i++){
      const m=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0x2a2a2a,transparent:true,opacity:0.5,depthWrite:false}));
      g.add(m);puffs.push({m,x:s[0],z:s[1],seed:k*3.1+i*0.083,ph:i/12});
    }
  });
  g.position.y=c.y+5.5;scene.add(g);SMOKE.push({c,g,puffs});
}
function clearSmoke(c){const i=SMOKE.findIndex(s=>s.c===c);if(i>=0){scene.remove(SMOKE[i].g);SMOKE.splice(i,1)}}
function igniteCity(c){STATE.burnt[c.id]=DN.days;ensureSmoke(c)}
function rebuildSmoke(){for(const s of SMOKE)scene.remove(s.g);SMOKE.length=0;for(const id in STATE.burnt)ensureSmoke(WORLD.cities[id])}
function updateSmoke(dt){
  for(const s of SMOKE){
    const d=Math.hypot(s.c.cx-P.x,s.c.cz-P.z);s.g.visible=d<(s.c.half+170);if(!s.g.visible)continue;
    for(const p of s.puffs){
      const age=(G.t*0.1+p.ph)%1,sz=2.2+age*5;
      p.m.position.set(p.x+Math.sin(p.seed*7+age*3)*age*4,age*26,p.z+Math.cos(p.seed*5+age*2)*age*4);
      p.m.scale.set(sz,sz*0.9,sz);p.m.rotation.y=p.seed*5+age;
      p.m.material.opacity=0.75*(1-age)*Math.min(1,age*6);
      p.m.material.color.setHex(age<0.3?0x1e1e1e:age<0.65?0x3a3a3a:0x6a6a6a);
    }
  }
}
