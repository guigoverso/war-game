'use strict';
// ---------- Raids de bandidos e fumaça de cidades atacadas (Fase 3) ----------
// De vez em quando bandidos atacam uma cidade sua. O jogador recebe um aviso e escolhe: (1) abandonar a missão atual e ser levado
// à cidade, ou (2) "Entendido": tem 60 s para chegar. Os bandidos atacam os moradores e quem estiver por perto. Se todos morrerem,
// você é recompensado; se o tempo acabar sem você chegar, a cidade perde recursos e fica soltando fumaça por alguns dias.
const RAID_AUTO=false,RAID_TIME=60,RAID_LOSS_GOLD=120,RAID_LOSS_RES=0.15,RAID_CHANCE=0.35,SMOKE_DAYS=4;
const RAID={active:false,area:null,city:null,t:0,engaged:false};
const SMOKE=[];

const playerCities=()=>WORLD.cities.filter(c=>c.owner==='player');
const inCityZone=(c,pad)=>Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))<c.half+(pad||6);

// Raid em ONDAS (sem reposição, no máximo 15 bandidos ao mesmo tempo): 5 por um lado, 10 (5 de cada de 2 lados) e 15 (5 de cada de 3 lados),
// com RAID_GAP segundos entre as ondas para o jogador se curar e recrutar. Os lados são as entradas (portões) da cidade.
const RAID_GAP=30,RAID_WAVES=[{sides:1,per:5},{sides:2,per:5},{sides:3,per:5}];
function raidSides(c,n){
  const dirs=[...new Set((c.gates||[]).map(g=>g.dir))];for(const d of['N','E','S','W'])if(!dirs.includes(d))dirs.push(d);
  return dirs.slice(0,n);
}
function raidSidePos(c,d){const off=c.half+3;return d==='E'?[c.cx+off,c.cz]:d==='W'?[c.cx-off,c.cz]:d==='S'?[c.cx,c.cz+off]:[c.cx,c.cz-off]}
function spawnRaidWave(){
  const W=RAID.waves,c=RAID.city,a=RAID.area,spec=RAID_WAVES[W.i],rank=a.rank;
  for(const d of raidSides(c,spec.sides)){
    const [bx,bz]=raidSidePos(c,d);
    for(let i=0;i<spec.per;i++){
      const e=spawnEnemy(a,(i===spec.per-1&&rank>=2&&W.i>=1)?'hound':'soldier',bx+(Math.random()-0.5)*6,bz+(Math.random()-0.5)*6);
      e.aggro=true;e.unseenT=99;e.reactT=0.5;
    }
  }
  W.i++;W.gapT=null;
  sfx('alarm',0);toast('⚔ Onda '+W.i+'/'+RAID_WAVES.length+': '+(spec.sides*spec.per)+' bandidos por '+spec.sides+' entrada'+(spec.sides>1?'s':'')+'!',4000);
}
// opts.teleport: o jogador é levado à praça da cidade e a luta começa na hora (política "Raid de bandidos", opção A)
function startRaid(c,opts){
  opts=opts||{};
  if(RAID.active||G.dg||G.office||P.dead)return false;
  const list=playerCities();if(!list.length)return false;
  c=c||list[Math.floor(Math.random()*list.length)];
  const rank=Math.max(1,c.rank||1);
  const area={kind:'raid',id:600+(STATE.raidSeq=(STATE.raidSeq||0)+1),name:'Ataque a '+c.name,cx:c.cx,cz:c.cz,y:c.y,half:c.half,biome:c.biome,rank,hpMul:1,state:'attacking',owner:'enemy',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:999,city:c};
  WORLD.areas.push(area);
  RAID.active=true;RAID.area=area;RAID.city=c;RAID.t=RAID_TIME;RAID.engaged=inCityZone(c);STATE.raidLast=DN.days;
  RAID.alliesCalled=false;RAID.seeT=0;   // os soldados só são chamados quando um bandido enxerga o jogador
  RAID.waves={i:0,gapT:null};
  if(opts.teleport){RAID.city=c;raidTeleport();RAID.engaged=true}
  spawnRaidWave();
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
  const lost=raidLoss(c);   // perde parte dos suprimentos guardados no armazém da cidade
  igniteCity(c);
  toast('🔥 Os bandidos saquearam '+c.name+'! Você perdeu ◉'+lostGold+(lost.length?' e '+lost.join(', '):'')+'. A cidade está em chamas.',6000);
  endRaid();
}
// ---------- emboscada a uma caravana (política "Ataque às caravanas", opção B) ----------
// A caravana escolhida (a que você envia ou a que a cidade parceira envia) está sendo saqueada: os guardas dela foram mortos (voltam se você vencer).
// Você começa longe e precisa se aproximar. Onda 1 (3 saqueadores) está junto da caravana; as ondas 2 e 3 (6 e 9) chegam de longe, vindo atacá-la.
const CVB={active:false},CVB_WAVES=[3,6,9],CVB_GAP=15,CVB_START=70,CVB_NEAR=42;
function cvbGuards(m,alive){
  for(const g of m.guards||[]){
    if(alive){g.alive=true;g.hp=g.maxhp;g.x=g.homeX;g.z=g.homeZ;g.y=tH(g.x,g.z);g.deadT=0;g.group.rotation.z=0;g.group.rotation.y=g.yaw0;g.group.position.set(g.x,g.y,g.z)}
    else{g.alive=false;g.deadT=1;g.group.rotation.z=1.5}   // caídos ao lado da caravana
  }
}
function startCaravanBattle(route,cb){
  if(RAID.active||CVB.active||G.dg||G.office||P.dead)return false;
  const ms=CARAVANS.filter(k=>k.r===route);if(!ms.length)return false;
  const m=ms[Math.floor(Math.random()*ms.length)];   // a caravana da sua cidade ou a da cidade parceira
  const A=WORLD.cities[route.a],B=WORLD.cities[route.b];
  const area={kind:'raid',id:700+(STATE.raidSeq=(STATE.raidSeq||0)+1),name:'Emboscada na estrada',cx:m.x,cz:m.z,y:tH(m.x,m.z),half:25,biome:A.biome,rank:Math.max(A.rank||1,B.rank||1),hpMul:1,state:'idle',owner:'enemy',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:999,city:A};
  WORLD.areas.push(area);
  Object.assign(CVB,{active:true,area,route,m,i:0,gapT:null,cb:cb||{},alliesCalled:false,seeT:0,engaged:false});
  m.ambush=true;cvbGuards(m,false);
  // você começa longe: no caminho da caravana de volta à cidade dela
  const home=m.city||A,dx=home.cx-m.x,dz=home.cz-m.z,L=Math.hypot(dx,dz)||1;
  const f=freeSpot(m.x+dx/L*CVB_START,m.z+dz/L*CVB_START,0.5,1.8,0.45);P.x=f[0];P.z=f[1];P.y=tH(P.x,P.z)+0.1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(m.x-P.x),-(m.z-P.z));P.pitch=0;
  spawnCvbWave();
  toast('🛡 Uma caravana está sendo saqueada! Aproxime-se (siga a estrela no minimapa).',5000);
  return true;
}
function spawnCvbWave(){
  const n=CVB_WAVES[CVB.i],m=CVB.m,first=CVB.i===0;
  for(let k=0;k<n;k++){
    let x,z;
    if(first){const a=Math.random()*6.283,r=4+Math.random()*3;x=m.x+Math.cos(a)*r;z=m.z+Math.sin(a)*r}
    else{   // de longe, indo atacar a caravana: um ponto em terra a 75–95 blocos
      for(let t=0;t<14;t++){const a=Math.random()*6.283,r=75+Math.random()*20;x=m.x+Math.cos(a)*r;z=m.z+Math.sin(a)*r;if(x>6&&z>6&&x<W-6&&z<W-6&&tH(x,z)>SEA+1)break}
    }
    const e=spawnEnemy(CVB.area,(k===n-1&&CVB.area.rank>=2&&!first)?'hound':'soldier',x,z);
    if(first){e.homeX=m.x;e.homeZ=m.z}else{e.aggro=true;e.unseenT=99;e.reactT=0.3}
  }
  CVB.i++;CVB.gapT=null;
  if(!first){CVB.area.state='attacking';sfx('alarm',0);toast('⚔ Onda '+CVB.i+'/'+CVB_WAVES.length+': '+n+' saqueadores vêm de longe atacar a caravana!',4500)}
}
function cvbEnd(win){
  if(!CVB.active)return;
  const a=CVB.area,cb=CVB.cb,m=CVB.m;
  for(const al of ALLIES)if(al.assaultCity===a){al.state='patrol';al.patrolCity=WORLD.home;al.assaultCity=null}
  if(a){for(const e of a.enemies){e.alive=false;e.gone=true;scene.remove(e.group)}a.enemies=[];a.aliveEnemies=0;const i=WORLD.areas.indexOf(a);if(i>=0)WORLD.areas.splice(i,1)}
  CVB.active=false;CVB.area=null;
  if(m){m.ambush=false;if(win)cvbGuards(m,true)}   // vencendo, os guardas voltam
  const el=document.getElementById('raidhud');if(el)el.style.display='none';
  if(win){sfx('win',0);if(cb.onWin)cb.onWin()}else if(cb.onLose)cb.onLose();
}
const cvbTarget=()=>CVB.active&&CVB.m&&!CVB.engaged?{x:CVB.m.x,z:CVB.m.z}:null;   // estrela no minimapa enquanto você ainda não chegou
function updateCvb(dt){
  if(!CVB.active)return;
  const hud=document.getElementById('raidhud'),alive=CVB.area.enemies.filter(e=>e.alive).length,m=CVB.m,dm=Math.hypot(m.x-P.x,m.z-P.z);
  if(!CVB.engaged&&dm<CVB_NEAR){   // chegou perto: os saqueadores da 1ª onda partem para cima de você
    CVB.engaged=true;CVB.area.state='attacking';for(const e of CVB.area.enemies)if(e.alive){e.aggro=true;e.unseenT=99;e.reactT=0.4}
    sfx('alarm',0);toast('⚔ Os saqueadores te viram! Onda 1/'+CVB_WAVES.length+'.',3500);
  }
  if(CVB.engaged&&!CVB.alliesCalled&&!P.dead&&!G.invis){
    CVB.seeT-=dt;
    if(CVB.seeT<=0){CVB.seeT=0.3;
      if(CVB.area.enemies.some(e=>e.alive&&Math.hypot(e.x-P.x,e.z-P.z)<46&&playerVisibleFrom(e.x,e.y+e.def.eye,e.z,P))){CVB.alliesCalled=true;armyAssault(CVB.area,'★ Seus soldados chegaram para defender a caravana!')}
    }
  }
  if(CVB.engaged&&alive===0){
    if(CVB.i>=CVB_WAVES.length){cvbEnd(true);return}
    if(CVB.gapT===null){CVB.gapT=CVB_GAP;toast('✔ Onda '+CVB.i+' vencida! A próxima chega em '+CVB_GAP+' s.',4000)}
    CVB.gapT-=dt;if(CVB.gapT<=0)spawnCvbWave();
  }
  if(hud){hud.style.display='block';hud.innerHTML=!CVB.engaged?'🛡 Aproxime-se da caravana: <b>'+Math.round(dm)+' m</b>':alive===0&&CVB.gapT!==null?'⏳ Caravana: próxima onda em <b>'+Math.max(0,Math.ceil(CVB.gapT))+' s</b>':'🛡 Defenda a caravana: onda '+CVB.i+'/'+CVB_WAVES.length+' • '+alive+' saqueadores'}
}
function updateRaids(dt){
  updateCvb(dt);
  const hud=document.getElementById('raidhud');
  // gatilho automático: a cada dia de jogo, uma chance de raid (a partir do 2º dia, com intervalo mínimo)
  const day=Math.floor(DN.days);
  if(!RAID.active&&day>(STATE.raidDay||0)){
    STATE.raidDay=day;
    if(RAID_AUTO&&day>=2&&DN.days-(STATE.raidLast||-9)>=1.5&&!G.dg&&!G.office&&Math.random()<RAID_CHANCE)startRaid();   // desligado: as raids agora vêm da política "Raid de bandidos"
  }
  // fim da fumaça
  for(const id in STATE.burnt)if(DN.days-STATE.burnt[id]>SMOKE_DAYS){delete STATE.burnt[id];clearSmoke(WORLD.cities[id])}
  updateSmoke(dt);
  if(!RAID.active){if(hud&&!CVB.active)hud.style.display='none';return}
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
  const W=RAID.waves;
  if(alive===0){
    if(!W||W.i>=RAID_WAVES.length){onRaidCleared();return}
    if(RAID.engaged){   // onda vencida: intervalo para curar e recrutar, depois vem a próxima
      if(W.gapT===null){W.gapT=RAID_GAP;toast('✔ Onda '+W.i+' vencida! A próxima chega em '+RAID_GAP+' s: cure-se e recrute.',4500)}
      W.gapT-=dt;if(W.gapT<=0)spawnRaidWave();
    }
  }
  if(!RAID.engaged){RAID.t-=dt;if(RAID.t<=0){raidFailed();return}}
  if(hud){
    hud.style.display='block';
    const d=Math.round(Math.hypot(c.cx-P.x,c.cz-P.z));
    hud.innerHTML=RAID.engaged?(alive===0&&W&&W.gapT!==null?'⏳ <b>'+c.name+'</b>: próxima onda em <b>'+Math.max(0,Math.ceil(W.gapT))+' s</b> ('+W.i+'/'+RAID_WAVES.length+' vencidas)':'🛡 Defenda <b>'+c.name+'</b>: onda '+(W?W.i:1)+'/'+RAID_WAVES.length+' • '+alive+' bandidos'):'⚠ <b>'+c.name+'</b> sob ataque! Chegue em <b>'+Math.ceil(RAID.t)+' s</b> ('+d+' m)';
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
