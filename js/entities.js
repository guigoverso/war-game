'use strict';
// ---------- Modelos, NPCs e inimigos ----------
const NPCS=[],ENEMIES=[],POISON={t:0,acc:0};
const SKINS=[0xf2c9a0,0xe0ac80,0xc68a5c,0x9a6a44,0x6e4a2e,0x4a3220];
const HAIRS=[0x1a1410,0x3a2616,0x6b4a2a,0xb08a4a,0xd8c07a,0x8a3a1a];
const CLOTH={
  0:[0x3a6ab0,0xb04a3a,0x4a9a4a,0xd8b84a,0x8a5ab0,0xe0e0e0,0x5a5a5a,0xb07a3a],
  1:[0x4a6a3a,0x6b4a2a,0x8a3a2a,0x3a5a6a,0x7a7a3a,0x555555],
  2:[0xe8d8b0,0xc9a96a,0xb5522f,0x3f8a8a,0xf2f2f2,0xa86a3a],
  3:[0x3a5a8a,0x8a2a2a,0x2a5a3a,0x5a5a5a,0xb0b0b8,0x6a3a6a],
  4:[0x555555,0x6b4a2a,0x3a5a6a]
};
const PANTS=[0x3a3a4a,0x4a3a2a,0x2a3a5a,0x5a4a3a,0x333333];

function limb(parent,x,y,z,w,len,d,c1,c2,endLen){
  const g=new THREE.Group();g.position.set(x,y,z);
  part(g,GEO_TOP,w,len,d,c1,0,0,0);
  if(endLen)part(g,GEO_TOP,w*1.03,endLen,d*1.03,c2,0,-(len-endLen),0);
  parent.add(g);return g;
}
// modelo antigo (caixas) — substituído por buildHuman em voxel.js; mantido como reserva
function buildHumanBoxy(o){
  const s=o.scale||1,g=new THREE.Group(),skin=o.skin;
  const legs=[limb(g,-0.125*s,0.75*s,0,0.25*s,0.75*s,0.25*s,o.pants,o.shoes||0x2a2a2a,0.15*s),limb(g,0.125*s,0.75*s,0,0.25*s,0.75*s,0.25*s,o.pants,o.shoes||0x2a2a2a,0.15*s)];
  part(g,GEO_BOX,0.5*s,0.75*s,0.25*s,o.shirt,0,1.125*s,0);
  if(o.robe)part(g,GEO_TOP,0.54*s,0.85*s,0.3*s,o.robe,0,0.9*s,0);
  const arms=[limb(g,-0.375*s,1.5*s,0,0.25*s,0.75*s,0.25*s,o.sleeve||o.shirt,skin,0.22*s),limb(g,0.375*s,1.5*s,0,0.25*s,0.75*s,0.25*s,o.sleeve||o.shirt,skin,0.22*s)];
  const head=new THREE.Group();head.position.set(0,1.5*s,0);g.add(head);
  part(head,GEO_BOX,0.5*s,0.5*s,0.5*s,skin,0,0.25*s,0);
  part(head,GEO_BOX,0.09*s,0.09*s,0.02*s,0x222222,-0.12*s,0.28*s,0.255*s);
  part(head,GEO_BOX,0.09*s,0.09*s,0.02*s,0x222222,0.12*s,0.28*s,0.255*s);
  const h=o.hair||0x333333;
  switch(o.hairStyle){
    case'short':part(head,GEO_BOX,0.54*s,0.14*s,0.54*s,h,0,0.5*s,0);part(head,GEO_BOX,0.54*s,0.36*s,0.1*s,h,0,0.32*s,-0.23*s);break;
    case'long':part(head,GEO_BOX,0.54*s,0.14*s,0.54*s,h,0,0.5*s,0);part(head,GEO_BOX,0.54*s,0.75*s,0.12*s,h,0,0.14*s,-0.23*s);part(head,GEO_BOX,0.08*s,0.4*s,0.5*s,h,-0.27*s,0.3*s,0);part(head,GEO_BOX,0.08*s,0.4*s,0.5*s,h,0.27*s,0.3*s,0);break;
    case'cap':part(head,GEO_BOX,0.56*s,0.16*s,0.56*s,o.hat||0x2a4a8a,0,0.52*s,0);part(head,GEO_BOX,0.5*s,0.04*s,0.25*s,o.hat||0x2a4a8a,0,0.46*s,0.36*s);break;
    case'hat':part(head,GEO_BOX,0.95*s,0.05*s,0.95*s,o.hat||0xc8a85a,0,0.5*s,0);part(head,GEO_BOX,0.5*s,0.25*s,0.5*s,o.hat||0xc8a85a,0,0.64*s,0);break;
    case'helmet':part(head,GEO_BOX,0.6*s,0.3*s,0.6*s,o.hat||0x6a6a6a,0,0.45*s,0);part(head,GEO_BOX,0.6*s,0.12*s,0.1*s,o.hat||0x6a6a6a,0,0.3*s,0.26*s);break;
    case'turban':part(head,GEO_BOX,0.6*s,0.3*s,0.6*s,o.hat||0xf2f2f2,0,0.5*s,0);part(head,GEO_BOX,0.4*s,0.12*s,0.4*s,o.hat||0xf2f2f2,0,0.7*s,0);break;
    case'bandana':part(head,GEO_BOX,0.56*s,0.12*s,0.56*s,o.hat||0xb02a2a,0,0.42*s,0);part(head,GEO_BOX,0.54*s,0.12*s,0.54*s,h,0,0.54*s,0);break;
  }
  if(o.beard)part(head,GEO_BOX,0.4*s,0.16*s,0.07*s,o.beard,0,0.08*s,0.26*s);
  if(o.scarf)part(g,GEO_BOX,0.56*s,0.14*s,0.32*s,o.scarf,0,1.48*s,0);
  if(o.apron)part(g,GEO_BOX,0.42*s,0.6*s,0.04*s,o.apron,0,1.0*s,0.14*s);
  if(o.pack)part(g,GEO_BOX,0.4*s,0.5*s,0.2*s,o.pack,0,1.15*s,-0.22*s);
  if(o.gun){const gl=o.gun.len||0.7;part(g,GEO_BOX,0.1*s,0.14*s,gl*s,0x222222,0.25*s,1.12*s,(0.2+gl/2)*s);part(g,GEO_BOX,0.1*s,0.2*s,0.14*s,0x5a3d22,0.25*s,1.0*s,0.18*s)}
  if(o.vest)part(g,GEO_BOX,0.56*s,0.55*s,0.3*s,0x4f5a66,0,1.2*s,0);
  return{group:g,legs,arms,head,s,height:2*s,lift:0,quad:false};
}
function buildHound(fur,dark){
  fur=fur||0x7a5a3a;dark=dark||0x4a3320;
  const g=new THREE.Group();
  part(g,GEO_BOX,0.5,0.45,0.95,fur,0,0.62,0);
  const head=new THREE.Group();head.position.set(0,0.82,0.55);g.add(head);
  part(head,GEO_BOX,0.4,0.38,0.4,fur,0,0,0);part(head,GEO_BOX,0.22,0.18,0.28,0xb89a70,0,-0.07,0.3);part(head,GEO_BOX,0.1,0.08,0.06,0x111111,0,-0.02,0.45);
  part(head,GEO_BOX,0.1,0.18,0.08,dark,-0.15,0.24,0);part(head,GEO_BOX,0.1,0.18,0.08,dark,0.15,0.24,0);
  part(head,GEO_BOX,0.07,0.07,0.02,0xff2a2a,-0.1,0.06,0.21);part(head,GEO_BOX,0.07,0.07,0.02,0xff2a2a,0.1,0.06,0.21);
  part(g,GEO_BOX,0.1,0.1,0.45,fur,0,0.82,-0.65).rotation.x=0.6;
  const legs=[];for(const [x,z] of[[-0.17,0.35],[0.17,0.35],[-0.17,-0.35],[0.17,-0.35]])legs.push(limb(g,x,0.42,z,0.14,0.42,0.14,fur,dark,0.1));
  return{group:g,legs,arms:[],head,s:1,height:1,lift:0,quad:true};
}
function buildBear(){
  const g=new THREE.Group(),fur=0x5a3a22,dark=0x3a2514;
  part(g,GEO_BOX,1.1,1.0,1.7,fur,0,1.15,0);part(g,GEO_BOX,0.9,0.5,0.6,shadec(fur,1.1),0,1.75,0.5);
  const head=new THREE.Group();head.position.set(0,1.35,1.0);g.add(head);
  part(head,GEO_BOX,0.75,0.65,0.7,fur,0,0,0);part(head,GEO_BOX,0.4,0.3,0.4,0x8a6a4a,0,-0.12,0.45);part(head,GEO_BOX,0.14,0.1,0.06,0x111111,0,-0.04,0.67);
  part(head,GEO_BOX,0.18,0.18,0.12,dark,-0.3,0.38,0);part(head,GEO_BOX,0.18,0.18,0.12,dark,0.3,0.38,0);
  part(head,GEO_BOX,0.08,0.08,0.02,0xff3a2a,-0.2,0.1,0.36);part(head,GEO_BOX,0.08,0.08,0.02,0xff3a2a,0.2,0.1,0.36);
  const legs=[];for(const [x,z] of[[-0.4,0.6],[0.4,0.6],[-0.4,-0.6],[0.4,-0.6]])legs.push(limb(g,x,0.75,z,0.38,0.75,0.38,fur,dark,0.15));
  return{group:g,legs,arms:[],head,s:1.2,height:1.7,lift:0,quad:true};
}
function buildSpider(){
  const g=new THREE.Group(),dark=0x2a1f1f,legs=[];
  part(g,GEO_BOX,0.8,0.5,1.0,dark,0,0.7,0.1);part(g,GEO_BOX,0.95,0.65,1.15,0x3a2a2a,0,0.78,-0.85);part(g,GEO_BOX,0.5,0.2,0.5,0xb02a2a,0,1.12,-0.85);
  const head=new THREE.Group();head.position.set(0,0.72,0.7);g.add(head);
  part(head,GEO_BOX,0.5,0.42,0.4,0x3a2a2a,0,0,0);
  for(const [x,y] of[[-0.15,0.08],[0.15,0.08],[-0.07,-0.05],[0.07,-0.05]])part(head,GEO_BOX,0.07,0.07,0.02,0xff3a2a,x,y,0.21);
  part(head,GEO_BOX,0.1,0.2,0.1,0x222222,-0.12,-0.25,0.15);part(head,GEO_BOX,0.1,0.2,0.1,0x222222,0.12,-0.25,0.15);
  for(const side of[-1,1])for(let i=0;i<4;i++){
    const lg=new THREE.Group();lg.position.set(side*0.35,0.7,0.5-i*0.4);lg.rotation.z=-side*0.5;
    part(lg,GEO_BOX,1.0,0.1,0.1,dark,side*0.5,0,0);part(lg,GEO_BOX,0.1,0.8,0.1,dark,side*1.0,-0.38,0);
    g.add(lg);lg.userData.base=(i-1.5)*0.35*side;lg.rotation.y=lg.userData.base;legs.push(lg);
  }
  return{group:g,legs,arms:[],head,s:1.1,height:1.2,lift:0,quad:true,spider:true};
}
function buildBot(){
  const g=new THREE.Group(),inner=new THREE.Group();inner.position.y=1.2;g.add(inner);
  part(inner,GEO_BOX,0.6,0.45,0.6,0x666a72,0,0,0);part(inner,GEO_BOX,0.34,0.34,0.64,0xff7a1a,0,0,0);part(inner,GEO_BOX,0.2,0.12,0.2,0xff2a2a,0,0.3,0);
  const props=[];
  for(const [x,z] of[[-0.5,-0.5],[0.5,-0.5],[-0.5,0.5],[0.5,0.5]]){part(inner,GEO_BOX,0.08,0.2,0.08,0x333333,x,0.1,z);props.push(part(inner,GEO_BOX,0.55,0.04,0.12,0x222222,x,0.22,z))}
  return{group:g,legs:[],arms:[],head:inner,props,inner,s:1,height:0.8,lift:1.2,quad:true,bot:true};
}
function buildGolem(){
  const g=new THREE.Group(),st=0x7a7a74,mo=0x4a7a3a;
  const legs=[limb(g,-0.42,1.3,0,0.6,1.3,0.6,st,0x5a5a54,0.3),limb(g,0.42,1.3,0,0.6,1.3,0.6,st,0x5a5a54,0.3)];
  part(g,GEO_BOX,1.6,1.5,1.0,st,0,2.05,0);part(g,GEO_BOX,0.7,0.3,0.1,mo,-0.3,2.5,0.52);part(g,GEO_BOX,0.5,0.5,0.1,mo,0.4,1.8,0.52);
  const arms=[limb(g,-1.15,2.7,0,0.6,1.9,0.6,st,0x5a5a54,0.6),limb(g,1.15,2.7,0,0.6,1.9,0.6,st,0x5a5a54,0.6)];
  const head=new THREE.Group();head.position.set(0,2.8,0);g.add(head);
  part(head,GEO_BOX,0.75,0.65,0.75,0x8a8a84,0,0.35,0);part(head,GEO_BOX,0.12,0.1,0.04,0xff8a1a,-0.18,0.4,0.39);part(head,GEO_BOX,0.12,0.1,0.04,0xff8a1a,0.18,0.4,0.39);
  return{group:g,legs,arms,head,s:1.2,height:3.6,lift:0,quad:false,golem:true};
}

const EDEF={
  soldier:{name:'Soldado',hp:55,spd:3.6,range:42,pref:22,dmg:6,burst:3,burstInt:0.13,cd:1.8,acc:0.5,eye:1.6,r:0.4,h:1.9,reward:14,ranged:true,sfx:'rifle'},
  sniper:{name:'Franco-atirador',hp:40,spd:2.4,range:95,pref:60,dmg:24,burst:1,burstInt:1,cd:3.6,acc:0.7,eye:1.6,r:0.4,h:1.9,reward:26,ranged:true,sfx:'sniper'},
  brute:{name:'Brutamontes',hp:140,spd:2.8,range:22,pref:8,dmg:5,pellets:7,burst:1,burstInt:1,cd:2.1,acc:0.5,eye:2.1,r:0.55,h:2.5,reward:32,ranged:true,sfx:'shotgun'},
  hound:{name:'Cão de Guerra',hp:26,spd:7.5,melee:true,reach:1.7,dmg:7,cd:0.9,eye:0.8,r:0.4,h:1,reward:8},
  spider:{name:'Aranha Gigante',climb:true,hp:48,spd:3.5,melee:true,reach:2.1,dmg:10,cd:1.2,lunge:true,eye:0.8,r:0.7,h:1.2,reward:15},
  bot:{name:'Drone Kamikaze',hp:18,spd:6.0,melee:true,bomb:true,reach:2.6,dmg:38,cd:1,eye:1.2,r:0.4,h:0.8,lift:1.2,reward:12},
  wolf:{name:'Lobo',hp:42,spd:6.8,melee:true,reach:1.7,dmg:8,cd:0.9,eye:0.8,r:0.4,h:1,reward:12},
  bear:{name:'Urso',hp:170,spd:3.8,melee:true,reach:2.5,dmg:20,cd:1.5,lunge:true,lungeMin:4,lungeMax:11,lungeT:0.55,lungeMul:2.6,lungeCd:1.1,leap:5.5,eye:1.4,r:0.7,h:1.6,reward:45},
  boar:{name:'Javali',hp:75,spd:5.6,melee:true,reach:1.8,dmg:11,cd:1.3,lunge:true,lungeMin:5,lungeMax:12,lungeT:1.0,lungeMul:1.7,lungeCd:2.4,stun:0.9,eye:0.7,r:0.5,h:0.9,reward:20},
  scorpion:{name:'Escorpião',hp:65,spd:4.3,melee:true,reach:2.3,dmg:8,cd:1.1,poison:true,eye:0.5,r:0.6,h:0.7,reward:22},
  golem:{name:'Golem de Pedra',hp:380,spd:2.2,melee:true,reach:3.6,dmg:26,cd:2.0,slam:true,eye:3,r:1.0,h:3.6,reward:70}
};

// ---------- efeitos: rastros e partículas ----------
const tracers=[],particles=[];
function initFx(){
  // rastro com degradê: forte na saída do cano (z local -0,5) e fraco no destino (+0,5)
  const tg=new THREE.BoxGeometry(1,1,1),pos=tg.attributes.position,cols=[];
  for(let i=0;i<pos.count;i++){const f=1-(pos.getZ(i)+0.5)*0.9;cols.push(f,f,f)}
  tg.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));
  for(let i=0;i<40;i++){const m=new THREE.Mesh(tg,new THREE.MeshBasicMaterial({color:0xffee99,vertexColors:true,transparent:true,opacity:1,blending:THREE.AdditiveBlending,depthWrite:false}));m.visible=false;scene.add(m);tracers.push({m,life:0})}
  for(let i=0;i<220;i++){const m=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xffffff}));m.visible=false;scene.add(m);particles.push({m,life:0,vx:0,vy:0,vz:0,g:1})}
}
function tracer(ax,ay,az,bx,by,bz,color){
  let t=null;for(const q of tracers)if(q.life<=0){t=q;break}if(!t)t=tracers[0];
  const dx=bx-ax,dy=by-ay,dz=bz-az,len=Math.hypot(dx,dy,dz);if(len<0.2)return;
  t.m.position.set((ax+bx)/2,(ay+by)/2,(az+bz)/2);t.m.scale.set(0.045,0.045,len);t.m.lookAt(bx,by,bz);t.m.material.color.setHex(color||0xffee99);t.m.visible=true;t.life=0.08;
}
function burst(x,y,z,color,n,spd,size,grav){
  for(let k=0;k<n;k++){
    let p=null;for(const q of particles)if(q.life<=0){p=q;break}if(!p)return;
    p.life=0.4+Math.random()*0.5;p.m.position.set(x,y,z);p.m.visible=true;p.m.material.color.setHex(Array.isArray(color)?color[Math.floor(Math.random()*color.length)]:color);
    const s=(size||0.12)*(0.6+Math.random()*0.8);p.m.scale.set(s,s,s);
    p.vx=(Math.random()-0.5)*spd;p.vy=Math.random()*spd*0.8;p.vz=(Math.random()-0.5)*spd;p.g=grav===undefined?14:grav;
  }
}
function updateFx(dt){
  for(const t of tracers)if(t.life>0){t.life-=dt;if(t.life<=0)t.m.visible=false}
  for(const p of particles)if(p.life>0){p.life-=dt;if(p.life<=0){p.m.visible=false;continue}
    p.vy-=p.g*dt;p.m.position.x+=p.vx*dt;p.m.position.y+=p.vy*dt;p.m.position.z+=p.vz*dt;
    const gy=tH(p.m.position.x,p.m.position.z);if(p.m.position.y<gy){p.m.position.y=gy;p.vy=0;p.vx*=0.5;p.vz*=0.5}}
}
function explode(x,y,z,radius,dmg,byPlayer,noSelf){
  burst(x,y,z,[0xff9a1a,0xffd84a,0xff5a1a,0x555555],45,12,0.3,6);
  const fl=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xffcc66,transparent:true,opacity:0.8}));fl.position.set(x,y,z);fl.scale.set(radius,radius,radius);scene.add(fl);
  let life=0.18;const tk=()=>{life-=0.016;fl.material.opacity=Math.max(0,life*4);fl.scale.multiplyScalar(0.96);if(life>0)requestAnimationFrame(tk);else{scene.remove(fl);fl.material.dispose()}};tk();
  sfx('boom',Math.hypot(x-P.x,z-P.z));
  for(const e of ENEMIES.slice())if(e.alive&&byPlayer){const d=Math.hypot(e.x-x,e.y+e.def.h/2-y,e.z-z)-e.def.r;if(d<radius)damageEnemy(e,dmg*(1-clamp(d/radius,0,1)*0.7),false)}
  for(const n of NPCS)if(n.alive){const d=Math.hypot(n.x-x,n.y+1-y,n.z-z);if(d<radius)damageNpc(n,dmg*(1-d/radius))}
  if(!byPlayer)for(const a of ALLIES)if(a.alive){const d=Math.hypot(a.x-x,a.y+1-y,a.z-z);if(d<radius)damageAlly(a,dmg*(1-d/radius))}
  const dp=Math.hypot(P.x-x,P.y+1-y,P.z-z);if(!noSelf&&dp<radius&&!P.dead)damagePlayer(dmg*(1-dp/radius)*(byPlayer?0.5:1),x,z);
}

// ---------- NPCs ----------
function npcLook(rng,biome,role,owner){
  const L={skin:rng.pick(SKINS),pants:rng.pick(PANTS),hair:rng.pick(HAIRS),scale:rng.range(0.93,1.06)};
  const cl=CLOTH[biome]||CLOTH[0];L.shirt=rng.pick(cl);
  const age=role==='civ'?rng.next():0.5;
  if(age<0.14){L.scale=rng.range(0.58,0.7);L.hairStyle=rng.pick(['short','cap','long','none']);role='child'}
  else if(age<0.26){L.scale=rng.range(0.9,0.97);L.hair=0xb8b8b8;L.hairStyle=rng.pick(['short','none','hat']);if(rng.chance(0.5))L.beard=0xb8b8b8;role='elder'}
  else L.hairStyle=rng.pick(['short','short','long','cap','none','hat','bandana']);
  if(L.hairStyle==='cap')L.hat=rng.pick(cl);
  if(L.hairStyle==='hat')L.hat=rng.pick([0xc8a85a,0x6b4a2a,0x3a3a3a,0x8a2a2a]);
  if(L.hairStyle==='bandana')L.hat=rng.pick(cl);
  if(biome===2){L.robe=rng.chance(0.6)?L.shirt:0;if(!L.robe)delete L.robe;if(rng.chance(0.5)){L.hairStyle='turban';L.hat=rng.pick([0xf2f2f2,0xb5522f,0x3f8a8a])}}
  if(biome===3){L.scarf=rng.pick([0xb02a2a,0x2a5a8a,0xe0e0e0]);if(rng.chance(0.6)){L.hairStyle='cap';L.hat=rng.pick(cl)}L.pants=0x3a3a44}
  if(role==='civ'&&rng.chance(0.15))L.pack=rng.pick([0x6b4a2a,0x4a5a3a]);
  if(role==='civ'&&rng.chance(0.15)){L.hairStyle='hat';L.hat=0xc8a85a;L.pants=0x5a4a3a}
  if(role==='shop'){L.apron=0xf2f2f2;L.shirt=0x8a3a2a;L.hairStyle='cap';L.hat=0x6b4a2a;L.beard=L.hair;L.scale=1.05}
  if(role==='merchant'){L.apron=0x6b4a2a;L.shirt=0x3a6a4a;L.hairStyle='hat';L.hat=0xc8a85a;L.scale=1.02}
  if(role==='cook'){L.apron=0xf2f2f2;L.shirt=0xe8e0d0;L.hairStyle='cap';L.hat=0xf4f4f4;L.beard=L.hair;L.scale=1.04}
  if(role==='nurse'){L.shirt=0xf4f4f4;L.pants=0xf4f4f4;L.hairStyle='cap';L.hat=0xf4f4f4;L.scarf=0xd02a2a;L.shoes=0xdddddd}
  if(role==='hostage'){L.shirt=0x8a8a80;L.pants=0x4a4036;L.hairStyle='none';L.scale=1;L.miku=true} // prisioneira temporária: Hatsune Miku
  if(role==='clerk'){L.shirt=0x3a5a8a;L.hairStyle='short';L.scarf=0xe0d8b0}
  if(role==='guard'){L.shirt=0x2a4a9a;L.hairStyle='helmet';L.hat=0x7a8aa0;L.gun={len:0.8};L.pants=0x2a2a3a}
  // bochechas coradas: crianças, enfermeiras e uma parte dos adultos (aprox. as mulheres); nunca em homens
  L.blush=role==='child'||role==='nurse'||((role==='civ'||role==='elder')&&rng.chance(0.3));
  L.roleOut=role;return L;
}
const SAY={
  civ_f:['Bom dia, soldado!','A cidade está segura graças a você.','Precisa de munição? Fale com o armeiro.','Que o céu proteja você nas estradas.','Dizem que as cidades vizinhas são perigosas.','Ouvi tiros para os lados da estrada...','O mercado está movimentado hoje.'],
  civ_e:['Não queremos problemas...','Os soldados mandam aqui.','Você não devia estar aqui.','Por favor, não atire!','Dizem que um forasteiro anda libertando cidades.','Tenho medo do que vem por aí.'],
  civ_c:['Obrigado por nos libertar!','Finalmente paz por aqui.','Os soldados foram embora. Graças a você!','Agora podemos voltar ao trabalho.'],
  child:['Você é um herói?','Posso ver sua arma?','Meu pai disse pra não falar com estranhos.','Eu vi uma aranha enorme ontem!'],
  elder:['No meu tempo isto aqui era só mato.','Cuidado com as aranhas, meu filho.','Vi coisas estranhas nas montanhas.','Esse terreno muda a cada geração...'],
  guard:['Em guarda!','Tudo calmo por aqui.','Boa sorte lá fora.','Os portões estão seguros.'],
  clerk:['O quadro de missões está logo ali.','Há sempre trabalho para quem sabe lutar.'],
  hostage:['Obrigado... pensei que ninguém viria!','Me tire daqui, por favor!'],
  merchant:['Bem-vindo à loja! Aperte E para vender o que você encontrou.','Peles, presas, joias... eu compro quase tudo.'],
  cook:['Hoje tem prato quente! Aperte E para cozinhar.','Traga peixe e carne fresca que eu faço o resto.'],
  shop:['Bem-vindo! Aperte E para ver as armas.'],nurse:['Está ferido? Aperte E para se tratar.']
};
function makeBubble(text){
  const cv=document.createElement('canvas'),g=cv.getContext('2d');g.font='bold 22px monospace';
  const w=Math.ceil(g.measureText(text).width)+24;cv.width=w;cv.height=40;
  g.fillStyle='rgba(255,255,255,0.92)';g.fillRect(0,0,w,40);g.strokeStyle='#222';g.lineWidth=3;g.strokeRect(1,1,w-2,38);
  g.fillStyle='#222';g.font='bold 22px monospace';g.textBaseline='middle';g.fillText(text,12,21);
  const tex=new THREE.CanvasTexture(cv);tex.minFilter=THREE.LinearFilter;
  const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true}));sp.scale.set(w/46,40/46,1);sp.renderOrder=10;return sp;
}
function npcSay(n,text){showSubtitle('— '+text,2000)}
// ---------- anti-prisão: acha um ponto livre e resgata quem ficar preso dentro de estruturas ----------
function freeSpot(x,z,r,hgt,boxStep){
  for(let rad=0;rad<=10;rad+=0.75){
    const n=rad===0?1:Math.max(8,Math.round(rad*5));
    for(let k=0;k<n;k++){
      const a=k/n*6.283+rad,px=x+Math.cos(a)*rad,pz=z+Math.sin(a)*rad;
      if(px<3||pz<3||px>W-3||pz>W-3)continue;
      const gy=tH(px,pz);if(gy<SEA-0.5)continue;
      probe(px,pz,r,gy,hgt,1.05,boxStep);
      if(!GR.blocked)return[px,pz];
    }
  }
  return[x,z];
}
function rescueStuck(e,dt,r,hgt){
  e.chkT=(e.chkT||0)-dt;if(e.chkT>0)return;e.chkT=0.3;
  probe(e.x,e.z,r*0.6,e.y,hgt,1.05,e.boxStep);
  if(GR.blocked){
    e.stuckIn=(e.stuckIn||0)+0.3;
    if(e.stuckIn>=0.9){const f=freeSpot(e.x,e.z,r,hgt,e.boxStep);e.x=f[0];e.z=f[1];e.y=tH(f[0],f[1]);e.vy=0;e.path=null;e.stuckIn=0}
  }else e.stuckIn=0;
}
function spawnNpc(c,o){
  const rng=new RNG((WORLD.seed*7+c.id*131+NPCS.length*17)>>>0);
  if(!o.stationary&&o.role!=='guard'){const f=freeSpot(o.x,o.z,0.3,1.8,0.45);o.x=f[0];o.z=f[1]}
  const role=o.role||'civ',L=npcLook(rng,c.biome===BIO_ROCK?1:c.biome,role,c.owner);
  const m=buildHuman(L);
  const n={kind:'npc',role:L.roleOut,city:c,model:m,group:m.group,x:o.x,z:o.z,y:tH(o.x,o.z),vy:0,ground:true,yaw:o.yaw||rng.range(0,6.28),state:'idle',timer:rng.range(0,4),
    hp:25,alive:true,eye:1.6*m.s,speed:rng.range(1.2,1.8)*(L.scale<0.8?1.1:1),fear:0,phase:rng.range(0,6),stationary:!!o.stationary||role==='guard',boxStep:0.45,r:0.3*m.s,hitR:0.3*m.s,hitH:2*m.s,lift:0,stuck:0,detour:0,detourT:0,sayT:0,bubble:null,def:{r:0.3*m.s,h:2*m.s,lift:0}};
  if(role==='guard'){m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0}
  scene.add(n.group);NPCS.push(n);c.npcs.push(n);return n;
}
function steer(e,tx,tz,speed,dt,r,hgt,stepH){
  let dx=tx-e.x,dz=tz-e.z;const d=Math.hypot(dx,dz)||1;dx/=d;dz/=d;
  if(e.detourT>0){const a=e.detour*1.3,cs=Math.cos(a),sn=Math.sin(a),nx=dx*cs-dz*sn,nz=dx*sn+dz*cs;dx=nx;dz=nz;e.detourT-=dt}
  const step=speed*dt,m=moveXZ(e,dx*step,dz*step,r,hgt,stepH);
  if(m<step*0.3){e.stuck+=dt;if(e.stuck>0.35){e.detour=Math.random()<0.5?-1:1;e.detourT=0.7+Math.random()*0.7;e.stuck=0}}else e.stuck=Math.max(0,e.stuck-dt);
  return d;
}
// vira o corpo para a direção em que realmente se deslocou (px,pz = posição antes do passo), com suavização
function faceMove(e,px,pz,dt){
  const mx=e.x-px,mz=e.z-pz;
  if(mx*mx+mz*mz<1e-6)return;
  const da=((Math.atan2(mx,mz)-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;
  e.yaw+=da*Math.min(1,dt*10);
}
// afasta a entidade de outras próximas (evita um ficar dentro do outro)
function separate(e,list,dt){
  for(const o of list){
    if(o===e||!o.alive||o.gone||o.sentry&&e.sentry)continue;
    const sx=e.x-o.x,sz=e.z-o.z;if(Math.abs(sx)>2.5||Math.abs(sz)>2.5)continue;
    const md=(e.def.r||0.3)+(o.def.r||0.3)+0.2,sd=Math.hypot(sx,sz);
    if(sd>=md)continue;
    let nx,nz;if(sd<0.001){const a=Math.random()*6.283;nx=Math.cos(a);nz=Math.sin(a)}else{nx=sx/sd;nz=sz/sd}
    const push=(md-sd)*Math.min(1,dt*12)*0.6; // cada um cede um pouco, a soma resolve a sobreposição
    moveXZ(e,nx*push,nz*push,e.def.r||0.3,Math.min(e.def.h||1.8,1.8),1.05);
  }
}
function animWalk(m,phase,amp,quad){
  const a=Math.sin(phase)*amp;
  if(m.legs.length===2){m.legs[0].rotation.x=a;m.legs[1].rotation.x=-a}
  else if(m.spider){m.legs.forEach((l,i)=>{l.rotation.y=l.userData.base+Math.sin(phase*1.3+i*1.7)*0.3*Math.min(1,amp)})}
  else if(m.legs.length===4){m.legs[0].rotation.x=a;m.legs[3].rotation.x=a;m.legs[1].rotation.x=-a;m.legs[2].rotation.x=-a}
}
function updateNpc(n,dt){
  const c=n.city;
  if(!n.alive){n.deadT+=dt;n.group.rotation.z=Math.min(1,n.deadT*3)*1.5;if(n.deadT>6){scene.remove(n.group);n.gone=true}return}
  if(n.bubble){n.sayT-=dt;if(n.sayT<=0){n.group.remove(n.bubble);n.bubble=null}}
  const dx=P.x-n.x,dz=P.z-n.z,d=Math.hypot(dx,dz);
  let moving=false;const px0=n.x,pz0=n.z;
  if(c.state==='attacking'&&d<45&&!n.stationary){n.fear=Math.max(n.fear,1);n.fx=P.x;n.fz=P.z}
  n.scareT=(n.scareT||0)-dt;   // civis fogem de animais selvagens por perto
  if(n.scareT<=0&&!n.stationary){n.scareT=0.3;for(const pk of WORLD.packs)for(const a of pk.enemies)if(a.alive&&Math.abs(a.x-n.x)<12&&Math.abs(a.z-n.z)<12&&Math.hypot(a.x-n.x,a.z-n.z)<12){n.fear=Math.max(n.fear,1.5);n.fx=a.x;n.fz=a.z}}
  if(n.fear>0){
    n.fear-=dt;const ax=n.x-n.fx,az=n.z-n.fz,al=Math.hypot(ax,az)||1;
    steer(n,n.x+ax/al*5,n.z+az/al*5,4.6,dt,n.r,1.8,1.05);faceMove(n,px0,pz0,dt);moving=true;n.phase+=dt*12;
  }else if(n.stationary){
    if(d<7){n.yaw+=(Math.atan2(dx,dz)-n.yaw+Math.PI*3)%(Math.PI*2)-Math.PI;}
  }else if(n.state==='idle'){
    n.timer-=dt;
    if(d<4.5)n.yaw+=((Math.atan2(dx,dz)-n.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*3);
    if(n.timer<=0&&c.walk.length){const w=c.walk[Math.floor(Math.random()*c.walk.length)];n.tx=w.x;n.tz=w.z;n.state='walk';n.walkT=18}
  }else{
    n.walkT-=dt;
    const dd=navMove(n,n.tx,n.tz,n.speed,dt,n.r,1.8,1.05);
    faceMove(n,px0,pz0,dt);moving=true;n.phase+=dt*n.speed*5;
    if(dd<0.8||n.walkT<=0){n.state='idle';n.timer=1+Math.random()*5}
  }
  moveY(n,dt,n.r,1.8,1.05);
  rescueStuck(n,dt,n.r,1.8);
  if(!n.stationary||n.fear>0){separate(n,c.npcs,dt);for(const o of c.enemies)if(o.alive&&!o.gone&&Math.abs(o.x-n.x)<2&&Math.abs(o.z-n.z)<2)separate(n,[o],dt)}
  n.group.position.set(n.x,n.y,n.z);n.group.rotation.y=n.yaw;
  if(moving)animWalk(n.model,n.phase,0.7);else{n.model.legs.forEach(l=>l.rotation.x*=0.8)}
  if(n.model.sway)n.model.sway(n.phase,moving,G.t)
}
function damageNpc(n,amount,src){   // src: bicho que atacou (não envolve o jogador)
  if(!n.alive)return;n.hp-=amount;burst(n.x,n.y+1,n.z,0xaa1111,8,5,0.1);
  if(!src&&n.city.owner==='enemy'&&n.city.state==='idle')startAttack(n.city);
  n.fear=5;n.fx=src?src.x:P.x;n.fz=src?src.z:P.z;
  if(n.hp<=0){n.alive=false;n.deadT=0;if(n.bubble){n.group.remove(n.bubble);n.bubble=null}}
}
function npcTalk(n){
  const c=n.city;let pool;
  if(n.role==='guard')pool=SAY.guard;else if(n.role==='shop')pool=SAY.shop;else if(n.role==='nurse')pool=SAY.nurse;else if(n.role==='merchant')pool=SAY.merchant;else if(n.role==='cook')pool=SAY.cook;else if(n.role==='hostage')pool=SAY.hostage;else if(n.role==='clerk')pool=SAY.clerk;
  else if(n.role==='child')pool=SAY.child;else if(n.role==='elder'&&Math.random()<0.6)pool=SAY.elder;
  else pool=c.home?SAY.civ_f:(c.owner==='player'?SAY.civ_c:SAY.civ_e);
  npcSay(n,pool[Math.floor(Math.random()*pool.length)]);
}

// ---------- Inimigos ----------
// uma cor de uniforme por nível (rank) da cidade
const RANK_COL=[0x2a6aff,0x6a7a2a,0xc8641e,0x9a2a2a,0x6a3a9a,0x2e2e3a,0xd8b830];
function buildEnemyModel(type,rng,rank,c,vest){
  const red=RANK_COL[rank]||0x9a2a2a,dark=shadec(red,0.6),steel=0x9ab0c8,camp=c&&c.kind==='camp';
  switch(type){
    case'soldier':
      if(camp)return buildHuman({skin:rng.pick(SKINS),shirt:0x6b4a2a,sleeve:0x4a3a2a,pants:0x3a2f24,hairStyle:'bandana',hat:0xb02a2a,hair:0x2a1a10,beard:rng.chance(0.5)?0x2a1a10:undefined,gun:{len:0.7}});
      return buildHuman({skin:rng.pick(SKINS),shirt:red,pants:0x3a3a3a,hairStyle:'helmet',hat:vest?steel:dark,gun:{len:0.75},scarf:rank>=5?0xc02a2a:undefined,vest});
    case'sniper':return buildHuman({skin:rng.pick(SKINS),shirt:0x4a5a2a,pants:0x3a4a2a,hairStyle:'hat',hat:0x4a5a2a,scarf:red,gun:{len:1.2}});
    case'brute':return buildHuman({skin:rng.pick(SKINS),shirt:0x3a3a44,sleeve:red,pants:0x2a2a30,hairStyle:vest?'helmet':'short',hair:0x2a2a2a,hat:vest?steel:undefined,scale:1.28,gun:{len:0.8},pack:red,scarf:red,vest});
    case'hound':return camp?buildHoundV(0x3a3a3a,0x222222):buildHoundV();
    case'wolf':return buildHoundV(0x8a8e96,0x5a5e66);
    case'bear':return buildBearV();
    case'spider':return buildSpiderV();
    case'boar':return buildBoarV();
    case'scorpion':return buildScorpionV();
    case'bot':return buildBot();
    default:return buildGolemV();
  }
}function spawnEnemy(c,type,x,z,y,sentry){
  if(!sentry){const f=freeSpot(x,z,EDEF[type].r,1.8);x=f[0];z=f[1]}
  let def=EDEF[type];
  if(c.kind){def=Object.assign({},def);if(def.range)def.range*=0.5;if(def.pref)def.pref*=0.5;def.sight=def.ranged?18:14;if(c.kind==='pack')def.sight=22}   // bandidos e animais selvagens: alcance pela metade; bandos de bichos enxergam mais longe
  const rng=new RNG((WORLD.seed*3+c.id*71+ENEMIES.length*13)>>>0);
  const vest=(type==='soldier'||type==='brute')&&!c.kind&&rng.chance(Math.min(0.6,0.1*c.rank));
  const m=buildEnemyModel(type,rng,c.rank,c,vest);
  const hpMul=c.hpMul||(0.85+0.12*c.rank);
  const e={kind:'enemy',type,def,eye:def.eye,city:c,model:m,group:m.group,x,z,y:y!==undefined?y:tH(x,z),vy:0,ground:true,yaw:rng.range(0,6.28),hp:def.hp*hpMul,maxhp:def.hp*hpMul,alive:true,
    cool:rng.range(0.5,2),burst:0,sees:false,losT:rng.range(0,0.3),phase:rng.range(0,6),stuck:0,detour:0,detourT:0,strafe:rng.chance(0.5)?1:-1,strafeT:rng.range(1,3),
    armor:vest?30+10*c.rank:0,vest,uid:++EUID,reactT:0,unseenT:99,spreadT:0,crowdT:0,beeps:0,sentry:!!sentry,homeX:x,homeZ:z,wanderT:rng.range(0,3),fuse:-1,lunge:0,wind:0,lift:def.lift||0,hitR:def.r,hitH:def.h,deadT:0,flash:0};
  if(def.ranged&&m.arms.length){m.arms[0].rotation.x=-0.1;m.arms[1].rotation.x=-1.2}
  scene.add(e.group);ENEMIES.push(e);c.enemies.push(e);c.aliveEnemies++;c.totalEnemies++;return e;
}
function startAttack(c){
  if(c.owner==='player'||c.state==='attacking')return;
  c.state='attacking';
  if(c.kind==='camp'){toast('⚔ Bandidos em alerta! Elimine todo o bando.',3000);sfx('alarm',0)}else if(!c.kind){toast('⚔ ATAQUE A '+c.name.toUpperCase()+'! Elimine todos os inimigos.',3500);sfx('alarm',0)}
  for(const e of c.enemies)if(e.alive){e.cool=Math.max(e.cool,1.5+Math.random()*1.5);e.unseenT=99;e.reactT=0}
  if(!c.kind)armyAssault(c);
  if(!c.kind&&c.aliveEnemies<=0)checkConquest(c);   // cidade já esvaziada (por animais): atacar conquista na hora
}
function playerVisibleFrom(x,y,z,tg){
  const eye=tg.y+tg.eye;
  return losClear(x,y,z,tg.x,eye,tg.z)||losClear(x,y,z,tg.x,tg.y+tg.eye*0.55,tg.z);
}
function enemyShoot(e){
  const tg=e.tg||P,def=e.def,ox=e.x+Math.sin(e.yaw)*0.5,oy=e.y+def.eye-0.25,oz=e.z+Math.cos(e.yaw)*0.5;
  const tx=tg.x,ty=tg.y+tg.eye*0.75,tz=tg.z;
  const d=Math.hypot(tx-ox,tz-oz);
  const pellets=def.pellets||1;
  let any=false;
  const baseAcc=def.acc*(1-clamp(d/(def.range*1.5),0,0.75))*(tg.crouch?0.6:1)*(tg.speed>1?0.85:1);
  for(let k=0;k<pellets;k++){
    const hit=Math.random()<baseAcc*(pellets>1?0.75:1)&&(losClear(ox,oy,oz,tx,tg.y+tg.eye*0.9,tz)||losClear(ox,oy,oz,tx,ty,tz));
    let ex=tx,ey=ty,ez=tz;
    if(!hit){const sp=0.6+d*0.03;ex+=(Math.random()-0.5)*sp*2;ey+=(Math.random()-0.5)*sp;ez+=(Math.random()-0.5)*sp*2}
    let ddx=ex-ox,ddy=ey-oy,ddz=ez-oz;const L=Math.hypot(ddx,ddy,ddz);ddx/=L;ddy/=L;ddz/=L;
    rayWorld(ox,oy,oz,ddx,ddy,ddz,hit?L:L+30);
    const t=hit?L:RAY.t;
    tracer(ox,oy,oz,ox+ddx*t,oy+ddy*t,oz+ddz*t,0xff8866);
    if(hit){hurtTarget(tg,def.dmg,e.x,e.z,e);any=true}
    else if(RAY.kind)burst(ox+ddx*t,oy+ddy*t,oz+ddz*t,[0xdddddd,0x999999],3,3,0.08);
  }
  sfx(def.sfx||'rifle',d);
}
let EUID=0;
// animais e bandidos: só atacam se te virem perto da área deles; o bando/matilha avisa os vizinhos
function wildAggro(e){
  e.aggro=true;e.unseenT=99;const c=e.city;
  if(c.state!=='attacking')c.state='attacking';
  for(const o of c.enemies)if(o.alive&&!o.aggro&&Math.hypot(o.x-e.x,o.z-e.z)<16){o.aggro=true;o.unseenT=99}
}
// tempo de reação ao notar o alvo: maior nos níveis baixos; rank 6 (dourado) = reação padrão (0)
function reactDelay(e){return Math.max(0,6-e.city.rank)*0.28}
function crowdCheck(e){
  let n=0,cx=0,cz=0,rank=0;
  for(const o of ENEMIES){
    if(o===e||!o.alive||o.sentry||o.city!==e.city)continue;
    if(Math.hypot(o.x-e.x,o.z-e.z)<4.5){n++;cx+=o.x;cz+=o.z;if(o.uid<e.uid)rank++}
  }
  if(n>=2&&rank>=2){ // 3º inimigo em diante num mesmo ponto: abre distância
    cx/=n;cz/=n;let ax=e.x-cx,az=e.z-cz,l=Math.hypot(ax,az);
    if(l<0.1){ax=Math.random()-0.5;az=Math.random()-0.5;l=Math.hypot(ax,az)||1}
    ax/=l;az/=l;
    for(let k=0;k<6;k++){
      const a=(Math.random()-0.5)*1.8*(k+1)/3,ca=Math.cos(a),sa=Math.sin(a),dist=6+Math.random()*3;
      const px=e.x+(ax*ca-az*sa)*dist,pz=e.z+(ax*sa+az*ca)*dist;
      if(navFree(px,pz)||k===5){e.spx=px;e.spz=pz;break}
    }
    e.spreadT=1.8;
  }
}
function chaseMove(e,tg,speed,dt,r,hg,stepH){
  let gx=tg.x,gz=tg.z;
  if(e.spreadT>0&&e.spx!==undefined){gx=e.spx;gz=e.spz}
  if(e.def.climb)return steer(e,gx,gz,speed,dt,r,hg,stepH);
  return navMove(e,gx,gz,speed,dt,r,hg,stepH);
}
function updateEnemy(e,dt){  const def=e.def,m=e.model;
  if(!e.alive){
    e.deadT+=dt;const k=Math.min(1,e.deadT*3);
    if(m.spider){e.group.rotation.z=k*Math.PI}else if(m.bot){e.group.position.y=e.y;m.inner.position.y=Math.max(0,m.inner.position.y-dt*8);m.inner.rotation.z=k*2}
    else e.group.rotation.z=k*1.55;
    if(m.golem||m.s>1)e.group.position.y=e.y;
    if(e.deadT>5){scene.remove(e.group);e.gone=true}return;
  }
  const c=e.city;
  e.flinch=Math.max(0,(e.flinch||0)-dt);
  e.tgT=(e.tgT||0)-dt;
  e.watchT=(e.watchT||0)-dt;   // o jogador está vendo este bicho/soldado? (brigas entre eles só acontecem à vista)
  if(e.watchT<=0){e.watchT=0.4+Math.random()*0.2;e.watched=!P.dead&&Math.hypot(e.x-P.x,e.z-P.z)<85&&losClear(camera.position.x,camera.position.y,camera.position.z,e.x,e.y+0.8,e.z)}
  if(!e.tg||(e.tg!==P&&!e.tg.alive)||e.tgT<=0||(e.fightW&&!e.watched&&!e.tg.watched&&!(e.revengeT>0))){e.tgT=0.5;e.tg=pickTarget(e)}
  e.revengeT=(e.revengeT||0)-dt;
  e.fightW=e.tg.kind==='enemy'||e.tg.kind==='npc';
  const tg=e.tg,dx=tg.x-e.x,dz=tg.z-e.z,d=Math.hypot(dx,dz);
  e.cool-=dt;e.losT-=dt;e.flash-=dt;
  let active=c.state==='attacking'&&!P.dead&&d<140;
  if(c.kind==='cave'||c.kind==='camp'||c.kind==='pack'){
    const dc=Math.hypot(P.x-c.cx,P.z-c.cz),leash=c.leash||(c.kind==='cave'?24:30);
    e.wildT=(e.wildT||0)-dt;
    if(e.wildT<=0){
      e.wildT=0.25;const dp=Math.hypot(P.x-e.x,P.z-e.z);
      e.canSee=!P.dead&&dc<leash&&dp<(def.sight||(def.ranged?36:28))&&playerVisibleFrom(e.x,e.y+def.eye,e.z,P);
      if(e.canSee&&!e.aggro&&!G.invis)wildAggro(e);
      if(e.aggro&&(P.dead||dc>leash))e.aggro=false;
    }
    active=!!e.aggro&&!P.dead;
  }
  if(e.fightW)active=true;   // briga entre bichos e soldados/bandidos
  if(G.invis&&tg===P){active=false;e.aggro=false;e.lunge=0;e.wind=0;e.sees=false}   // modo invisível: ninguém ataca o jogador
  let moving=false;
  if(!active){
    e.sees=false;
    if(!e.sentry){
      e.wanderT-=dt;
      const pk=c.kind==='pack';
      if(e.wanderT<=0){e.tx=e.homeX+(Math.random()-0.5)*(pk?3:8);e.tz=e.homeZ+(Math.random()-0.5)*(pk?3:8);e.wanderT=pk?2+Math.random()*3:3+Math.random()*5;e.walking=true}
      if(e.walking){const px0=e.x,pz0=e.z,dd=steer(e,e.tx,e.tz,def.spd*(pk?0.45:0.3),dt,def.r,Math.min(def.h,1.9),1.05);faceMove(e,px0,pz0,dt);moving=true;e.phase+=dt*def.spd;if(dd<0.6)e.walking=false}
    }
  }else{
    e.crowdT-=dt;e.spreadT-=dt;
    if(e.crowdT<=0&&!e.sentry){e.crowdT=0.2+Math.random()*0.15;crowdCheck(e)}
    if(e.losT<=0){e.losT=0.18+Math.random()*0.1;const eyeY=e.y+def.eye+e.lift*0;e.sees=d<(def.range||40)*1.25&&playerVisibleFrom(e.x,eyeY,e.z,tg)}
    const noticed=e.sees||d<10;
    if(noticed){if(e.unseenT>1.5)e.reactT=reactDelay(e)*(0.85+Math.random()*0.3);e.unseenT=0}else e.unseenT+=dt;
    e.reactT-=dt;
    const face=Math.atan2(dx,dz);
    let da=((face-e.yaw+Math.PI*3)%(Math.PI*2))-Math.PI;if(!(def.stun&&e.lunge>0))e.yaw+=da*Math.min(1,dt*8);   // javali em investida não corrige a direção
    const stepH=def.climb?7:def.bomb?3:1.05,hg=Math.min(def.h,1.9);
    if(e.reactT>0){/* reagindo: parado, só virando para o alvo */}
    else if(def.ranged){
      e.strafeT-=dt;if(e.strafeT<=0){e.strafe=-e.strafe;e.strafeT=1+Math.random()*2.5}
      if(e.sees&&d<def.range){
        if(!e.sentry){
          if(d>def.pref+5||e.spreadT>0){chaseMove(e,tg,def.spd,dt,def.r,hg,stepH);moving=true}
          else if(d<def.pref-6){steer(e,e.x-dx,e.z-dz,def.spd*0.8,dt,def.r,hg,stepH);moving=true}
          else{steer(e,e.x+dz*e.strafe,e.z-dx*e.strafe,def.spd*0.6,dt,def.r,hg,stepH);moving=true}
        }
        if(e.cool<=0&&da*da<0.4){
          enemyShoot(e);
          if(e.burst<=0)e.burst=(def.burst||1)-1;else e.burst--;
          e.cool=e.burst>0?def.burstInt:def.cd*(0.8+Math.random()*0.5);
        }
      }else if(!e.sentry){
        chaseMove(e,tg,def.spd,dt,def.r,hg,stepH);moving=true;
      }
      if(moving)e.phase+=dt*def.spd*2.2;
    }else{
      // corpo a corpo
      if(e.lunge>0){
        e.lunge-=dt;moveXZ(e,Math.sin(e.yaw)*def.spd*(def.lungeMul||2.6)*dt,Math.cos(e.yaw)*def.spd*(def.lungeMul||2.6)*dt,def.r,hg,stepH);moving=true;
        if(def.stun){
          if(!e.hitDone&&d<def.reach+0.3&&Math.abs(tg.y-e.y)<2){e.hitDone=true;hurtTarget(tg,def.dmg*1.3,e.x,e.z,e);e.lunge=0;e.stunT=def.stun*0.6;e.cool=def.cd}
          else if(e.lunge<=0)e.stunT=def.stun;   // errou: fica atordoado
        }
      }
      else if(e.stunT>0){e.stunT-=dt}
      else if(e.wind>0){
        e.wind-=dt;m.arms.forEach(a=>a.rotation.x=-2.6);
        if(e.wind<=0){m.arms.forEach(a=>a.rotation.x=0.4);if(d<def.reach+1&&Math.abs(tg.y-e.y)<2.5){hurtTarget(tg,def.dmg,e.x,e.z,e);burst(e.x+Math.sin(e.yaw)*2,e.y+0.2,e.z+Math.cos(e.yaw)*2,[0x777777,0x555555],14,6,0.25);sfx('slam',d)}e.cool=def.cd}
      }else{
        if(def.bomb){
          // drone: ao chegar perto, apita 1x por segundo; no 3º bip explode
          if(d<7){if(e.fuse<0){e.fuse=0;e.beeps=0}}else if(d>16&&e.fuse>=0){e.fuse=-1;e.beeps=0}
          if(e.fuse>=0){
            e.fuse+=dt;
            while(e.beeps<3&&e.fuse>=e.beeps){
              e.beeps++;e.beepFlash=1;sfx('beep'+e.beeps,d*0.35);
              if(e.beeps===3){e.alive=false;e.deadT=0;c.aliveEnemies--;explode(e.x,e.y+1,e.z,4.8,def.dmg,false);e.group.visible=false;e.gone=true;scene.remove(e.group);checkConquest(c);return}
            }
          }
          if(d>1.5){chaseMove(e,tg,def.spd,dt,def.r,hg,stepH);moving=true}
        }else if(e.spreadT>0){chaseMove(e,tg,def.spd,dt,def.r,hg,stepH);moving=true}
        else if(d<def.reach){
          if(e.cool<=0){
            if(def.slam)e.wind=0.6;
            else{hurtTarget(tg,def.dmg,e.x,e.z,e);e.cool=def.cd;e.strike=0.3;if(def.lunge)e.lunge=0;if(def.poison&&tg===P){if(POISON.t<=0)toast('☠ Envenenado!',1500);POISON.t=3.5}}
          }
        }else{
          if(def.lunge&&d<(def.lungeMax||6)&&d>(def.lungeMin||3)&&e.cool<=0&&e.sees){e.lunge=def.lungeT||0.28;e.cool=def.lungeCd||1.2;e.hitDone=false;if(def.leap&&e.ground)e.vy=def.leap}   // urso salta para alcançar
          else{chaseMove(e,tg,def.spd,dt,def.r,hg,stepH);moving=true}
        }        if(moving)e.phase+=dt*def.spd*(def.golem?1.5:2.4);
        if(e.sees===false&&e.losT<=0.1){}
      }
    }
  }
  if(!e.sentry&&!def.climb&&!def.bomb&&!def.lift){e.sepT=(e.sepT||0)-dt;if(e.sepT<=0){e.sepT=0.05;separate(e,c.enemies,0.1)}}
  if(!e.sentry&&!def.climb)rescueStuck(e,dt,def.r,Math.min(def.h,1.9));
  if(def.climb){
    probe(e.x,e.z,def.r,e.y,1.2,7);const gg=GR.g;
    if(e.y<gg-0.01){e.y=Math.min(gg,e.y+dt*6.5);e.climbing=true}else{e.climbing=false;if(e.y>gg)e.y=Math.max(gg,e.y-dt*14)}
    e.vy=0;e.ground=true;e.group.rotation.order='YXZ';e.group.rotation.x+=((e.climbing?-0.9:0)-e.group.rotation.x)*Math.min(1,dt*8);
  }else moveY(e,dt,def.r,Math.min(def.h,1.9),def.bomb?3:1.05);
  if(m.tail){e.strike=Math.max(0,(e.strike||0)-dt);m.tail.rotation.x=(active?0.15:0)+Math.sin(G.t*2+e.phase)*0.07+(e.strike>0?0.95*e.strike/0.3:0)}   // cauda do escorpião: balança e ferroa
  if(def.slam&&e.wind<=0)m.arms.forEach(a=>a.rotation.x*=0.85);
  e.group.position.set(e.x,e.y,e.z);e.group.rotation.y=e.yaw;
  if(!def.climb)e.group.rotation.x+=((e.flinch>0?-0.28:0)-e.group.rotation.x)*Math.min(1,dt*25);
  if(m.bot){m.inner.position.y=1.2+Math.sin(performance.now()*0.004+e.phase)*0.12;m.inner.scale.setScalar(1+(e.beepFlash||0)*0.4);e.beepFlash=Math.max(0,(e.beepFlash||0)-dt*4);m.props.forEach(p=>p.rotation.y+=dt*40)}
  if(moving)animWalk(m,e.phase,def.golem?0.5:(m.quad?0.8:0.7));else if(m.legs.length)m.legs.forEach(l=>{if(!m.spider)l.rotation.x*=0.8});
  if(def.ranged&&m.arms.length){m.arms[1].rotation.x=active?-1.25:-0.2;m.arms[0].rotation.x=active?-1.0:0}
}
function damageEnemy(e,amount,head,byAlly,src){   // src: outro bicho/soldado que causou o dano (briga entre eles, sem envolver o jogador)
  if(!e.alive)return;
  if(e.city.kind==='pack'||src){e.revenge=src||P;e.revengeT=src?8:10;e.tgT=0}   // quem feriu o animal vira o alvo dele
  if(!src){if(e.city.kind){if(!e.aggro)wildAggro(e)}else if(e.city.state!=='attacking')startAttack(e.city)}
  if(e.armor>0){const ab=Math.min(e.armor,amount*0.6);e.armor-=ab;amount-=ab}
  // o tiro é sentido: o inimigo se encolhe e a ação dele atrasa por instantes (golem, urso e brutamonte aguentam melhor)
  {const st=(e.type==='golem'||e.type==='bear'||e.type==='brute')?0.08:0.16;e.reactT=Math.max(e.reactT||0,st);e.flinch=st*1.4;e.lunge=0;if(e.wind>0){e.wind=0;e.model.arms.forEach(a=>a.rotation.x=0.4)}}
  e.hp-=amount;e.flash=0.1;
  burst(e.x,e.y+e.lift+e.def.h*0.6,e.z,e.model.golem?[0x888888,0x666666]:[0xb01818,0x801010],head?12:7,5,0.1);
  if(e.hp<=0){
    e.alive=false;e.deadT=0;e.city.aliveEnemies--;
    const rw=Math.round(e.def.reward*(0.8+Math.random()*0.5));if(!src)addCoins(rw);
    if(!byAlly&&!src)dropLoot(e);   // itens do inimigo morto pelo jogador
    if(!byAlly&&!src){giveRandomAmmo();game_kills++;toast('+'+rw+' moedas  ('+e.def.name+')',1200);sfx('kill',0)}
    checkConquest(e.city);
  }
}
function checkConquest(c){
  if(c.aliveEnemies>0)return;
  if(c.kind==='camp'&&!c.ambush&&!c.gone&&c.state!=='cleared'){clearCamp(c);return}   // acampamento esvaziado (até por animais): baú e refém liberados
  if(c.state!=='attacking')return;
  if(c.ambush)c.state='cleared';else if(c.kind==='camp')clearCamp(c);else if(c.kind==='cave'||c.kind==='pack')c.state='idle';else if(c.owner==='enemy')conquerCity(c);
}

function populateCities(){
  for(const c of WORLD.cities){
    const rng=new RNG(WORLD.seed*13+c.id*101+9);
    for(const k of c.keepers||[])spawnNpc(c,{role:k.role,x:k.x,z:k.z,yaw:k.yaw,stationary:true});
    const nCiv=c.home?rng.int(26,34):rng.int(14,20);
    const pts=rng.shuffle(c.walk.slice());
    const chosen=(c.keepers||[]).map(k=>({x:k.x,z:k.z}));let placed=0;
    for(const p of pts){if(placed>=nCiv)break;if(chosen.some(q=>Math.hypot(q.x-p.x,q.z-p.z)<3.2))continue;chosen.push(p);spawnNpc(c,{role:'civ',x:p.x,z:p.z});placed++}
    if(c.home)for(const g of c.gateSpots)spawnNpc(c,{role:'guard',x:g.x,z:g.z,yaw:Math.atan2(g.x-c.cx,g.z-c.cz)});
    if(!c.home){
      const rank=c.rank,n=8+3*rank,plan=[];
      const ns=rank>=3?Math.min(c.towers.length,rank>=4?8:4):0;
      for(let i=0;i<ns;i++)plan.push({t:'sniper',tw:c.towers[i]});
      const ng=rank>=4?(rank>=6?3:2):0;for(let i=0;i<ng;i++)plan.push({t:'golem'});
      const wt=[['soldier',6],['hound',rank>=1?2.2:0],['spider',rank>=2?2:0],['brute',rank>=3?1.6:0],['bot',rank>=3?2:0],['sniper',rank>=3?0.8:0]];
      const tot=wt.reduce((a,b)=>a+b[1],0);
      while(plan.length<n){let r=rng.next()*tot,t='soldier';for(const w of wt){r-=w[1];if(r<=0){t=w[0];break}}plan.push({t})}
      const spots=rng.shuffle(c.walk.filter(p=>Math.hypot(p.x-c.cx,p.z-c.cz)>4));
      // cada inimigo nasce num ponto livre: longe dos civis, guardas e outros inimigos (evita corpos sobrepostos)
      let si=0;
      for(const p of plan){
        if(p.tw){spawnEnemy(c,p.t,p.tw.x,p.tw.z,p.tw.y,true);continue}
        let s=null;
        while(si<spots.length){const q=spots[si++];if(!chosen.some(o=>Math.hypot(o.x-q.x,o.z-q.z)<3.2)){s=q;break}}
        if(!s){ // sem pontos livres: tenta um ponto qualquer com mais folga
          for(let t=0;t<30&&!s;t++){const q=spots[Math.floor(rng.next()*spots.length)];if(q&&!chosen.some(o=>Math.hypot(o.x-q.x,o.z-q.z)<1.6))s=q}
          if(!s)s=spots[Math.floor(rng.next()*spots.length)];
        }
        if(s){chosen.push({x:s.x,z:s.z});spawnEnemy(c,p.t,s.x,s.z)}
      }
    }
  }
}
function updateActors(dt){
  for(let i=NPCS.length-1;i>=0;i--){
    const n=NPCS[i];
    if(n.gone){NPCS.splice(i,1);continue}
    const d2=(n.x-P.x)**2+(n.z-P.z)**2;
    if(d2>120*120){n.group.visible=false;continue}
    n.group.visible=true;updateNpc(n,dt);
  }
  for(let i=ENEMIES.length-1;i>=0;i--){
    const e=ENEMIES[i];
    if(e.gone){ENEMIES.splice(i,1);continue}
    const d2=(e.x-P.x)**2+(e.z-P.z)**2;
    if(d2>130*130&&e.city.state!=='attacking'){e.group.visible=false;continue}
    e.group.visible=d2<150*150;updateEnemy(e,dt);
  }
}


