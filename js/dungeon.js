'use strict';
// ---------- Dungeons subterrâneas e portais mágicos (Fase 3) ----------
// Num canto do mapa (o que tem menos terra) fica uma região reservada de 100×100 blocos, sem nada em volta, com 3 "alas" de dungeon
// geradas por semente (salas e corredores, teto de pedra). Portais mágicos surgem em terra firme (no máximo 3 por vez, renovados a cada
// 3 dias de jogo) e levam a uma ala. Dentro, inimigos guardam um baú; ao abri-lo, o portal entrega a recompensa anunciada:
// uma quantidade de um recurso, uma arma lendária (+50% de dano) ou uma relíquia.
const DG={ok:false,rx:0,rz:0,S:100,Y:0,wings:[]};
const DG_N=44,DG_HEIGHT=6,DG_ROOM_H=4.8;
const WING_OFF=[[4,4],[52,4],[4,52]];
const PORTAL_MAX=3,PORTAL_DAYS=3;
const PORTALS=[];   // objetos visuais dos portais (a lista de dados fica em STATE.portals)
const REWARD_NAMES={resource:'Recursos',weapon:'Arma lendária',relic:'Relíquia'};

// ---------- geração (roda dentro de genPOIs, antes da malha do terreno) ----------
function genDungeons(rng,cities,taken){
  DG.ok=false;DG.wings=[];
  const S=DG.S,corners=[[4,4],[W-S-4,4],[4,W-S-4],[W-S-4,W-S-4]];
  let best=null,bl=1e9;
  for(const [x0,z0] of corners){
    if(cities.some(c=>Math.max(Math.abs(c.cx-(x0+S/2)),Math.abs(c.cz-(z0+S/2)))<S/2+c.half+10))continue;
    let land=0;for(let dz=0;dz<S;dz+=4)for(let dx=0;dx<S;dx+=4)if(H[(z0+dz)*W+x0+dx]>=SEA)land++;
    if(land<bl){bl=land;best=[x0,z0]}
  }
  if(!best)return;
  DG.rx=best[0];DG.rz=best[1];DG.Y=SEA+6;DG.ok=true;
  taken.push({x:DG.rx+S/2,z:DG.rz+S/2,r:S*0.75});
  // plataforma plana de rocha; a borda desce suavemente até o terreno em volta
  const F=4;
  for(let dz=-F;dz<S+F;dz++)for(let dx=-F;dx<S+F;dx++){
    const x=DG.rx+dx,z=DG.rz+dz;if(x<1||z<1||x>=W-1||z>=W-1)continue;
    const i=z*W+x,inside=dx>=0&&dz>=0&&dx<S&&dz<S;
    if(inside){H[i]=DG.Y;B[i]=BIO_ROCK;T[i]=T_WILD}
    else{const e=Math.max(-dx,dx-S+1,-dz,dz-S+1);H[i]=Math.round(lerp(DG.Y,H[i],clamp(e/(F+1),0,1)));B[i]=BIO_ROCK}
  }
  for(let k=0;k<WING_OFF.length;k++)DG.wings.push(buildWing(new RNG((WORLD.seed*57+k*911+13)>>>0),k));
}

function buildWing(rng,k){
  const N=DG_N,ox=DG.rx+WING_OFF[k][0],oz=DG.rz+WING_OFF[k][1],g=new Uint8Array(N*N);
  const rooms=[];
  for(let t=0;t<400&&rooms.length<7;t++){
    const w=rng.int(7,12),h=rng.int(7,12),x=rng.int(2,N-w-2),z=rng.int(2,N-h-2);
    if(rooms.some(r=>x<r.x+r.w+3&&x+w+3>r.x&&z<r.z+r.h+3&&z+h+3>r.z))continue;
    rooms.push({x,z,w,h,cx:x+(w>>1),cz:z+(h>>1)});
  }
  const carveRect=(x0,z0,x1,z1)=>{for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(x>0&&z>0&&x<N-1&&z<N-1)g[z*N+x]=1};
  for(const r of rooms)carveRect(r.x,r.z,r.x+r.w-1,r.z+r.h-1);
  const link=(a,b)=>{   // corredor em L com 3 de largura
    let x=a.cx,z=a.cz;
    while(x!==b.cx){carveRect(x,z-1,x,z+1);x+=Math.sign(b.cx-x)}
    while(z!==b.cz){carveRect(x-1,z,x+1,z);z+=Math.sign(b.cz-z)}
    carveRect(x-1,z-1,x+1,z+1);
  };
  for(let i=1;i<rooms.length;i++)link(rooms[i-1],rooms[i]);
  if(rooms.length>3)link(rooms[0],rooms[rooms.length-2]);   // um atalho para formar um laço
  // sala de entrada = a primeira; sala do chefe = a mais distante dela (busca em largura)
  const dist=new Int32Array(N*N).fill(-1),q=[[rooms[0].cx,rooms[0].cz]];dist[rooms[0].cz*N+rooms[0].cx]=0;
  for(let qi=0;qi<q.length;qi++){const [x,z]=q[qi];for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N||!g[nz*N+nx]||dist[nz*N+nx]>=0)continue;dist[nz*N+nx]=dist[z*N+x]+1;q.push([nx,nz])}}
  let boss=rooms[1],bd=-1;for(const r of rooms.slice(1)){const d=dist[r.cz*N+r.cx];if(d>bd){bd=d;boss=r}}
  const wx=i=>ox+i,wz=i=>oz+i;
  const wing={k,ox,oz,N,g,rooms,
    entrance:{x:wx(rooms[0].cx)+0.5,z:wz(rooms[0].cz)+0.5},boss:{x:wx(boss.cx)+0.5,z:wz(boss.cz)+0.5},bossRoom:boss,
    center:{x:ox+N/2,z:oz+N/2},spawns:[]};
  // pontos de aparição de inimigos: salas comuns (longe da entrada)
  for(const r of rooms.slice(1)){if(r===boss)continue;for(let n=0;n<4;n++)wing.spawns.push({x:wx(r.x+1+((r.w-2)*((n*37)%10)/10)|0)+0.5,z:wz(r.z+1+((r.h-2)*((n*53)%10)/10)|0)+0.5})}
  buildWingBoxes(wing,rng);
  // marca o terreno: chão de caverna (som e piso de pedra) onde há piso
  for(let z=0;z<N;z++)for(let x=0;x<N;x++)if(g[z*N+x])T[(oz+z)*W+ox+x]=T_CAVE;
  return wing;
}

function buildWingBoxes(w,rng){
  const N=w.N,g=w.g,Y=DG.Y,ox=w.ox,oz=w.oz;
  const nearFloor=(x,z)=>{for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const a=x+dx,b=z+dz;if(a>=0&&b>=0&&a<N&&b<N&&g[b*N+a])return true}return false};
  const stone=(x,z,k,base)=>shadec(base,0.82+0.3*hash2(x,z,k));
  // paredes de rocha: tiras horizontais; perto do piso as tiras são curtas (variação de cor), longe delas são longas
  for(let z=0;z<N;z++){
    let x=0;
    while(x<N){
      if(g[z*N+x]){x++;continue}
      const near=nearFloor(x,z),maxL=near?3:16;let e=x+1;
      while(e<N&&!g[z*N+e]&&e-x<maxL&&nearFloor(e,z)===near)e++;
      Bx(ox+x,Y,oz+z,ox+e,Y+DG_HEIGHT,oz+z+1,stone(x,z,1,0x55555d),true,{j:0.05});
      x=e;
    }
  }
  // chão com lajes e teto (a face de baixo do teto também é desenhada)
  for(let z=0;z<N;z++){
    let x=0;
    while(x<N){
      if(!g[z*N+x]){x++;continue}
      let e=x+1;while(e<N&&g[z*N+e]&&e-x<4)e++;
      Bx(ox+x,Y,oz+z,ox+e,Y+0.07,oz+z+1,stone(x,z,2,0x3c3c44),false,{j:0.06});
      Bx(ox+x,Y+DG_ROOM_H,oz+z,ox+e,Y+DG_HEIGHT,oz+z+1,stone(x,z,3,0x4a4a52),true,{b:true,j:0.05});
      x=e;
    }
  }
  // pilares nas salas grandes e tochas nas paredes
  for(const r of w.rooms){
    if(r.w>=9&&r.h>=9)for(const [px,pz] of[[r.x+2,r.z+2],[r.x+r.w-4,r.z+2],[r.x+2,r.z+r.h-4],[r.x+r.w-4,r.z+r.h-4]])Bx(ox+px,Y,oz+pz,ox+px+2,Y+DG_ROOM_H,oz+pz+2,stone(px,pz,4,0x6a6a72),true,{j:0.05});
  }
  for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){
    if(!g[z*N+x]||hash2(x,z,17)>0.045)continue;
    for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){
      if(g[(z+dz)*N+x+dx])continue;
      // tocha no piso junto à parede (haste + chama)
      const tx=ox+x+0.5+dx*0.38,tz=oz+z+0.5+dz*0.38;
      Bx(tx-0.06,Y+1.6,tz-0.06,tx+0.06,Y+2.3,tz+0.06,0x4a3320,false,{j:0});
      Bx(tx-0.14,Y+2.3,tz-0.14,tx+0.14,Y+2.7,tz+0.14,0xffa020,false,{j:0.1});
      break;
    }
  }
  // caixas e escombros
  for(const r of w.rooms){
    for(let n=0;n<3;n++){
      const x=r.x+1+Math.floor(hash2(r.x,n,31)*(r.w-3)),z=r.z+1+Math.floor(hash2(r.z,n,37)*(r.h-3));
      if(!g[z*N+x])continue;
      Bx(ox+x+0.1,Y,oz+z+0.1,ox+x+0.9,Y+0.5+hash2(x,z,5)*0.5,oz+z+0.9,stone(x,z,6,0x6b5030),true,{j:0.08});
    }
  }
}

// ---------- portais ----------
function distHome(x,z){const h=WORLD.home;return Math.hypot(x-h.cx,z-h.cz)}
function spawnPortals(){
  if(!DG.ok)return 0;
  const keep=(STATE.portals||[]).filter(p=>G.dg&&G.dg.p===p);
  clearPortalMeshes();STATE.portals=keep;
  const rng=new RNG((Math.random()*1e9)|0),used=new Set(keep.map(p=>p.wing));
  for(let k=0;k<DG.wings.length&&STATE.portals.length<PORTAL_MAX;k++){
    if(used.has(k))continue;
    for(let t=0;t<200;t++){
      const x=rng.int(30,W-30),z=rng.int(30,W-30);
      if(x>DG.rx-12&&x<DG.rx+DG.S+12&&z>DG.rz-12&&z<DG.rz+DG.S+12)continue;
      if(H[z*W+x]<SEA+2||T[z*W+x]!==T_NAT)continue;
      if(Math.abs(H[z*W+x+2]-H[z*W+x])>1||Math.abs(H[(z+2)*W+x]-H[z*W+x])>1)continue;
      if(WORLD.cities.some(c=>Math.max(Math.abs(c.cx-x),Math.abs(c.cz-z))<c.half+30))continue;
      if(WORLD.camps.some(c=>Math.hypot(c.cx-x,c.cz-z)<30))continue;
      if(STATE.portals.some(p=>Math.hypot(p.x-x,p.z-z)<60))continue;
      const d=distHome(x,z),tier=d<150?1:d<270?2:3,r=rng.next();
      let reward;
      if(r<0.45){const res=rng.pick(['food','ore','wood','gold']);reward={type:'resource',res,amt:(res==='gold'?3:1)*rng.int(60,100)*tier}}
      else if(r<0.72)reward={type:'weapon'};
      else reward={type:'relic'};
      STATE.portals.push({id:(STATE.portalSeq=(STATE.portalSeq||0)+1),x:x+0.5,z:z+0.5,wing:k,tier,reward,claimed:false});
      break;
    }
  }
  STATE.portalDay=DN.days;
  for(const p of STATE.portals)if(!PORTALS.find(m=>m.id===p.id))makePortalMesh(p);
  return STATE.portals.length;
}
function clearPortalMeshes(){for(const m of PORTALS)scene.remove(m.group);PORTALS.length=0}
function rewardText(p){
  const r=p.reward;
  if(r.type==='resource')return DATA.resources[r.res].icon+' '+r.amt+' de '+DATA.resources[r.res].name;
  return r.type==='weapon'?'★ uma arma lendária':'🏺 uma relíquia';
}
function makePortalMesh(p){
  const g=new THREE.Group(),y=tH(p.x,p.z);g.position.set(p.x,y,p.z);g.rotation.y=(p.id*1.7)%6.28;
  const stone=mat(0x6a6a74),dark=mat(0x3a3a44),glow=new THREE.MeshBasicMaterial({color:0xb070ff,transparent:true,opacity:0.75,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending});
  const box=(m,sx,sy,sz,px,py,pz)=>{const o=new THREE.Mesh(GEO_BOX,m);o.scale.set(sx,sy,sz);o.position.set(px,py,pz);g.add(o);return o};
  box(dark,3.6,0.3,1.2,0,0.15,0);                                       // base
  box(stone,0.55,3.4,0.55,-1.45,1.85,0);box(stone,0.55,3.4,0.55,1.45,1.85,0);   // pilares
  box(stone,3.6,0.55,0.7,0,3.75,0);box(dark,0.9,0.4,0.8,0,4.15,0);      // arco com pedra-chave
  const swirl=new THREE.Mesh(new THREE.PlaneGeometry(2.4,3.2),glow);swirl.position.set(0,1.95,0);g.add(swirl);
  const orbs=[];for(let i=0;i<6;i++){const o=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xe0b0ff}));o.scale.set(0.16,0.16,0.16);const a=i*1.047;o.position.set(Math.cos(a)*1.2,1.95+Math.sin(a)*1.5,0.05);g.add(o);orbs.push(o)}
  const beam=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xa060ff,transparent:true,opacity:0.2,depthWrite:false}));beam.scale.set(0.7,60,0.7);beam.position.set(0,30,0);g.add(beam);   // coluna de luz visível de longe
  scene.add(g);
  const m={id:p.id,group:g,swirl,orbs,beam,p};PORTALS.push(m);return m;
}
function removePortal(p){
  const i=PORTALS.findIndex(m=>m.id===p.id);if(i>=0){scene.remove(PORTALS[i].group);PORTALS.splice(i,1)}
  STATE.portals=STATE.portals.filter(x=>x!==p&&x.id!==p.id);
}
// recria os objetos dos portais (ao carregar um salvamento)
function rebuildPortals(){clearPortalMeshes();for(const p of STATE.portals||[])makePortalMesh(p)}
function portalNear(){
  if(G.dg)return null;
  for(const m of PORTALS){const d=Math.hypot(m.p.x-P.x,m.p.z-P.z);if(d<3.4&&Math.abs(tH(m.p.x,m.p.z)-P.y)<3)return m.p}
  return null;
}
function updatePortals(dt){
  if(!DG.ok)return;
  if(!STATE.portals)STATE.portals=[];
  if(!G.dg&&(!STATE.portals.length&&STATE.portalDay===undefined||DN.days-(STATE.portalDay||0)>=PORTAL_DAYS)){spawnPortals()}
  for(const m of PORTALS)m.group.visible=Math.hypot(m.p.x-P.x,m.p.z-P.z)<260;   // o brilho do portal é estático
  updateDungeonMood();
}
Hooks.on('round',()=>{if(DG.ok&&!G.dg)spawnPortals()});

// ---------- minimapa da dungeon: planta da ala (chão claro, rocha escura); marca só a saída e o baú, nunca os inimigos ----------
function wingCanvas(w){
  if(w.cv)return w.cv;
  const N=w.N,cv=document.createElement('canvas');cv.width=cv.height=N;
  const g=cv.getContext('2d');g.fillStyle='#07070b';g.fillRect(0,0,N,N);
  for(let z=0;z<N;z++)for(let x=0;x<N;x++)if(w.g[z*N+x]){g.fillStyle=hash2(x,z,9)>0.5?'#76768a':'#6a6a7e';g.fillRect(x,z,1,1)}
  return w.cv=cv;
}
function drawDungeonMinimap(){
  const d=G.dg,w=d.wing,s=4;
  mmc.imageSmoothingEnabled=false;
  mmc.drawImage(wingCanvas(w),(w.ox-P.x)*s,(w.oz-P.z)*s,w.N*s,w.N*s);
  const dot=(x,z,col)=>{mmc.fillStyle=col;mmc.strokeStyle='#000';mmc.lineWidth=1.5;mmc.beginPath();mmc.rect((x-P.x)*s-4,(z-P.z)*s-4,8,8);mmc.fill();mmc.stroke()};
  dot(w.entrance.x,w.entrance.z,'#c080ff');                               // saída
  if(d.chest&&!d.chest.opened)dot(d.chest.x,d.chest.z,'#ffd23a');        // baú
}

// ---------- ambiente escuro dentro da dungeon ----------
function inDungeonRegion(){return DG.ok&&P.x>=DG.rx&&P.x<DG.rx+DG.S&&P.z>=DG.rz&&P.z<DG.rz+DG.S}
function updateDungeonMood(){
  const inside=inDungeonRegion();
  if(DN.group)DN.group.visible=!inside;
  for(const cl of clouds)cl.visible=!inside;
  if(!inside)return;
  scene.background.setHex(0x050507);scene.fog.color.setHex(0x050507);scene.fog.near=3;scene.fog.far=40;
  hemi.intensity=0.3;hemi.color.setHex(0x6a6a8a);sun.intensity=0;
  if(DN.torch)DN.torch.intensity=1.7;
}

// ---------- entrar, lutar e sair ----------
function enterDungeon(p){
  if(G.dg||!DG.ok)return;
  const w=DG.wings[p.wing];
  const area={kind:'dungeon',id:500+p.wing,name:'Dungeon',cx:Math.floor(w.center.x),cz:Math.floor(w.center.z),y:DG.Y,half:24,biome:BIO_ROCK,rank:p.tier+1,hpMul:1,state:'idle',owner:'wild',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:70};
  G.dg={p,ret:{x:P.x,y:P.y,z:P.z,yaw:P.yaw},area,chest:null,wing:w};
  WORLD.areas.push(area);
  populateWing(p,w,area);
  // baú do chefe: trancado até todos os inimigos morrerem. Fica no centro da sala (os pilares ficam nos cantos) e longe de qualquer bloco
  let cx=w.boss.x,cz=w.boss.z;
  for(let r=0;r<=4;r+=1){let ok=false;for(let k=0;k<(r?8:1)&&!ok;k++){const a=k*0.785,x=w.boss.x+Math.cos(a)*r,z=w.boss.z+Math.sin(a)*r;if(!Col.near(x-1,z-1,x+1,z+1).some(b=>b.y1>DG.Y+0.3&&b.y0<DG.Y+2)){cx=x;cz=z;ok=true}}if(ok)break}   // livre de pilares e caixas (o teto não conta)
  const ang=Math.atan2(w.entrance.x-cx,w.entrance.z-cz);
  const ch=addArcaneChest(cx,DG.Y,cz,ang,40+30*p.tier,area);ch.dg=p;ch.lootKey='chest_dungeon';G.dg.chest=ch;
  P.x=w.entrance.x;P.z=w.entrance.z;P.y=DG.Y+0.2;P.vy=0;P.vx=P.vz=0;P.camY=P.y;P.yaw=Math.atan2(-(w.boss.x-w.entrance.x),-(w.boss.z-w.entrance.z));
  G.dgPad=w.entrance;
  {   // pedra de saída: disco de pedra com brilho roxo
    const g=new THREE.Group();g.position.set(w.entrance.x,DG.Y+0.08,w.entrance.z);
    const disc=new THREE.Mesh(GEO_BOX,mat(0x4a4a56));disc.scale.set(2.4,0.12,2.4);g.add(disc);
    const gl=new THREE.Mesh(new THREE.RingGeometry(0.6,1.0,24),new THREE.MeshBasicMaterial({color:0xb070ff,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));gl.rotation.x=-Math.PI/2;gl.position.y=0.1;g.add(gl);
    const bm=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xa060ff,transparent:true,opacity:0.18,depthWrite:false}));bm.scale.set(0.5,3.5,0.5);bm.position.y=1.8;g.add(bm);
    scene.add(g);G.dgPadMesh=g;
  }
  toast('🌀 Dungeon nível '+p.tier+' — elimine os inimigos e abra o baú do fundo. Recompensa: '+rewardText(p),6000);
}
function populateWing(p,w,area){
  const plan={1:['spider','spider','hound','hound','bot'],2:['spider','spider','scorpion','scorpion','hound','hound','bot','bot'],3:['spider','spider','spider','scorpion','scorpion','scorpion','bot','bot','bot','brute']}[p.tier];
  const pts=w.spawns.slice().sort(()=>Math.random()-0.5);
  plan.forEach((t,i)=>{const s=pts[i%pts.length];spawnEnemy(area,t,s.x,s.z)});
  spawnEnemy(area,p.tier===1?'scorpion':p.tier===2?'brute':'golem',w.boss.x-3,w.boss.z-3);   // chefe
}
function leaveDungeon(noTeleport){
  const d=G.dg;if(!d)return;
  for(const e of d.area.enemies){if(e.alive){e.alive=false}e.gone=true;scene.remove(e.group)}
  d.area.enemies=[];d.area.aliveEnemies=0;
  const ai=WORLD.areas.indexOf(d.area);if(ai>=0)WORLD.areas.splice(ai,1);
  if(d.chest){const k=WORLD.chests.indexOf(d.chest);if(k>=0)WORLD.chests.splice(k,1);scene.remove(d.chest.g)}
  const p=d.p;G.dg=null;G.dgPad=null;if(G.dgPadMesh){scene.remove(G.dgPadMesh);G.dgPadMesh=null}
  if(!noTeleport){P.x=d.ret.x;P.z=d.ret.z;P.y=d.ret.y+0.3;P.vy=0;P.camY=P.y;P.yaw=d.ret.yaw}
  if(p.claimed){removePortal(p);toast('O portal se desfez depois de entregar sua recompensa.',3500)}
  else toast('Você saiu da dungeon. O portal continua aberto (os inimigos voltam se você entrar de novo).',3500);
}
// chamado quando o baú de uma dungeon é aberto: entrega a recompensa do portal
function dungeonChestOpened(ch){
  const p=ch.dg;if(!p||p.claimed)return;p.claimed=true;
  const r=p.reward;
  if(r.type==='resource'){Ledger.add(r.res,r.amt);toast('🌀 Recompensa do portal: '+rewardText(p)+'!',5000)}
  else if(r.type==='relic'){const t=invGive([['reliquia',1]]);toast('🌀 Recompensa do portal: 🏺 Relíquia! '+t,5000)}
  else{
    const idx=rollLegendary();
    if(idx>=0){STATE.legend[idx]=true;if(!weaponHere(idx))giveWeapon(idx,true);toast('🌀 ★ '+WEAPONS[idx].name+' LENDÁRIA! +50% de dano',6000);invChanged()}
    else{Ledger.add('gold',300);toast('🌀 Todas as armas já são lendárias: +◉300',4000)}
  }
  sfx('win',0);
}
function rollLegendary(){
  const c=[];for(let i=1;i<WEAPONS.length;i++)if(!STATE.legend[i])c.push(i);
  if(!c.length&&!STATE.legend[0])c.push(0);
  return c.length?c[Math.floor(Math.random()*c.length)]:-1;
}
const legendMul=i=>(STATE.legend&&STATE.legend[i])?1.5:1;
const wName=i=>WEAPONS[i].name+((STATE.legend&&STATE.legend[i])?' ★':'');
