'use strict';
// ---------- Armas ----------
const WEAPONS=[
  {id:'pistol',name:'Pistola',desc:'Confiável e precisa. Semiautomática.',dmg:24,rpm:320,auto:false,mag:12,spread:0.014,pellets:1,range:110,price:0,pack:24,packCost:8,reload:1.1,zoom:1.3,rec:0.05,sfx:'pistol'},
  {id:'smg',name:'Submetralhadora',desc:'Cadência altíssima, ótima de perto.',dmg:12,rpm:800,auto:true,mag:32,spread:0.03,pellets:1,range:70,price:150,pack:64,packCost:18,reload:1.6,zoom:1.4,rec:0.04,sfx:'smg'},
  {id:'rifle',name:'Fuzil de Assalto',desc:'Equilibrado. Dano e alcance bons.',dmg:21,rpm:570,auto:true,mag:30,spread:0.017,pellets:1,range:130,price:350,pack:60,packCost:30,reload:2.0,zoom:1.7,rec:0.06,sfx:'rifle'},
  {id:'shotgun',name:'Escopeta',desc:'8 projéteis por tiro. Devastadora de perto.',dmg:11,rpm:75,auto:false,mag:6,spread:0.07,pellets:8,range:45,price:250,pack:18,packCost:26,reload:2.4,zoom:1.15,rec:0.12,sfx:'shotgun'},
  {id:'sniper',name:'Rifle Sniper',desc:'Um tiro, uma morte. Zoom 4x (botão direito).',dmg:140,rpm:50,auto:false,mag:5,spread:0.02,pellets:1,range:260,price:600,pack:10,packCost:42,reload:2.8,zoom:4,rec:0.14,sfx:'sniper'},
  {id:'launcher',name:'Lança-foguetes',desc:'Explosão em área. Cuidado com o recuo!',dmg:150,rpm:48,auto:false,mag:1,spread:0.0,pellets:1,range:200,price:900,pack:4,packCost:70,reload:2.6,zoom:1.25,rec:0.2,sfx:'launcher',rocket:true}
];
const WS={owned:[true,false,false,false,false,false],mag:[],reserve:[],cur:0,cool:0,reload:0,recoil:0,flash:0,vm:[],muzzle:[]};
const ROCKETS=[];
let game_kills=0;
function initWeapons(){
  WEAPONS.forEach((w,i)=>{WS.mag[i]=w.mag;WS.reserve[i]=i===0?48:0;WS.owned[i]=i===0});
  WS.cur=0;WS.cool=0;WS.reload=0;
}
// Armas em primeira pessoa: voxels de 2 cm numa única malha (arma + mãos + antebraços) por arma.
// Em cada receita: x = direita, y = cima, z = para trás (a frente é z negativo).
function buildViewmodels(camera){
  const SK=0xe8b48a,SKS=0xcf9a72,SL=0x4a5a30,SL2=0x3c4a26,GL=0x2a2a2a;
  const D=0x24262a,M=0x4a4f56,MH=0x6a7078,L=0x8a9098,O=0x4a5a30,GR=(x,y,z)=>((x+y+z)&1)?0x2c2e32:0x383a40,
        WD=(x,y,z)=>((z>>1)&1)?0x6b4a2a:0x7a5632;
  // mão + antebraço (dx: inclinação lateral do antebraço rumo à câmera)
  const hand=(b,x,y,z,dx)=>{
    b.box(x-3,y-3,z-3,x+3,y+2,z+3,SK);b.box(x-3,y+2,z-3,x+3,y+3,z+3,SKS);
    b.box(x-4,y,z-3,x-3,y+3,z+1,SK);                         // polegar
    ARMS.push([x,y-1,z+3,dx]);
  };
  const ARMS=[];
  const mk=(build,tipY,tipZ)=>{ARMS.length=0;
    const vb=new VB();build(vb);
    const g=new THREE.Group(),mesh=new THREE.Mesh(vb.geo(0,0,0),VOX_MAT);mesh.scale.setScalar(0.02/VS);g.add(mesh);
    for(const a of ARMS){const dir=new THREE.Vector3(a[3]*0.22,-0.42,1).normalize(),st=new THREE.Vector3(a[0]*0.02,a[1]*0.02,a[2]*0.02);
      const sl=new THREE.Mesh(GEO_BOX,new THREE.MeshLambertMaterial({color:SL}));sl.scale.set(0.115,0.115,0.9);sl.position.copy(st).addScaledVector(dir,0.45);sl.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),dir);g.add(sl);
      const cf=new THREE.Mesh(GEO_BOX,new THREE.MeshLambertMaterial({color:GL}));cf.scale.set(0.125,0.125,0.07);cf.position.copy(st).addScaledVector(dir,0.035);cf.quaternion.copy(sl.quaternion);g.add(cf)}
    const f=new THREE.Group(),fm=new THREE.MeshBasicMaterial({color:0xffe066});
    for(const r of[0,Math.PI/2]){const q=new THREE.Mesh(GEO_BOX,fm);q.scale.set(0.12,0.012,0.14);q.rotation.z=r;f.add(q)}
    const c=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xfff6c0}));c.scale.set(0.035,0.035,0.1);f.add(c);
    f.position.set(0,tipY*0.02,tipZ*0.02-0.06);f.visible=false;g.add(f);
    g.visible=false;g.position.set(0.24,-0.22,-0.62);camera.add(g);WS.vm.push(g);WS.muzzle.push(f);
  };
  // 0 pistola
  mk(b=>{
    b.box(-2,0,-14,2,4,3,M);b.box(-2,4,-14,2,5,3,MH);b.box(-1,0,-17,1,2,-14,D);b.box(-2,-2,-12,2,0,2,D);
    b.box(-1,-4,-8,1,-2,-7,D);b.box(-1,-4,-8,1,-3,-2,D);b.box(-2,5,0,-1,6,2,D);b.box(1,5,0,2,6,2,D);b.box(-1,5,-13,1,6,-11,D);
    for(let i=0;i<7;i++)b.box(-2,-9+i,2-(i>>1)+3-3,2,-8+i,6-(i>>1),GR);
    hand(b,0,-5,3,1);
  },1,-17);
  // 1 submetralhadora
  mk(b=>{
    b.box(-2,-3,-18,2,3,4,D);b.box(-2,3,-18,2,4,4,M);b.box(-1,0,-27,1,2,-18,M);b.box(-2,-1,-24,2,3,-18,D);
    b.box(-1,-14,-9,1,-3,-6,M);b.box(-1,-14,-9,1,-12,-5,D);
    for(let i=0;i<6;i++)b.box(-2,-4-i,2+(i>>1),2,-3-i,5+(i>>1),GR);
    b.box(-1,-1,4,1,1,10,M);b.box(-1,-6,10,1,2,12,D);
    b.box(-2,4,-4,-1,6,-2,D);b.box(1,4,-4,2,6,-2,D);b.box(-1,4,-25,1,7,-23,D);
    hand(b,0,-6,3,1);hand(b,-1,-5,-10,-1.6);
  },1,-27);
  // 2 fuzil
  mk(b=>{
    b.box(-2,-3,-16,2,3,14,M);b.box(-2,3,-16,2,4,14,MH);b.box(-3,-3,-34,3,2,-16,WD);b.box(-1,0,-52,1,2,-34,D);
    b.box(-1,2,-46,1,3,-26,M);b.box(-1,2,-50,1,7,-48,D);b.box(-2,3,-6,2,6,-3,D);b.box(-1,6,-6,1,7,-3,D);
    for(let i=0;i<9;i++)b.box(-1,-4-i,-10+(i>>1)+(i>>2),1,-3-i,-4+(i>>1)+(i>>2),i<8?D:M);
    for(let i=0;i<6;i++)b.box(-2,-4-i,6+(i>>1),2,-3-i,9+(i>>1),GR);
    b.box(-2,-4,14,2,3,16,WD);b.box(-2,-6,16,2,2,20,WD);b.box(-2,-7,20,2,3,22,D);
    hand(b,0,-7,7,1);hand(b,-1,-5,-20,-1.8);
  },1,-52);
  // 3 escopeta
  mk(b=>{
    b.box(-2,-3,-10,2,3,8,M);b.box(-2,3,-10,2,4,8,MH);b.box(-2,0,-44,2,3,-10,D);b.box(-1,-2,-40,1,0,-10,M);
    b.box(-1,3,-44,1,4,-40,L);b.box(-1,3,-43,1,5,-41,D);
    b.box(-3,-4,-34,3,0,-20,WD);
    b.box(-2,-6,8,2,3,12,WD);b.box(-2,-9,12,2,1,18,WD);b.box(-2,-10,18,2,2,20,D);
    b.box(-1,-5,-4,1,-3,-1,D);
    hand(b,0,-7,6,1);hand(b,-1,-5,-18,-1.8);
  },1,-44);
  // 4 sniper
  mk(b=>{
    b.box(-2,-3,-10,2,3,12,D);b.box(-1,0,-84,1,2,-10,M);b.box(-2,-1,-96,2,3,-84,D);
    b.box(-2,4,-14,2,8,6,D);b.box(-3,3,-14,3,9,-10,D);b.box(-3,3,2,3,9,6,D);b.box(-1,4,-12,1,8,-11,0x4a90d0);   // luneta
    b.box(-1,3,-10,1,4,4,M);b.box(-1,3,-1,1,4,1,M);
    b.box(-1,-10,-4,1,-3,2,D);
    b.box(-2,-5,12,2,3,16,O);b.box(-2,-7,16,2,2,20,O);b.box(-2,-8,20,2,3,22,D);
    b.box(-3,-4,-30,3,-2,-14,O);
    for(let i=0;i<6;i++)b.box(-2,-4-i,4+(i>>1),2,-3-i,7+(i>>1),GR);
    hand(b,0,-6,6,1);hand(b,-1,-5,-18,-1.8);
  },1,-96);
  // 5 lança-foguetes
  mk(b=>{
    b.box(-4,-5,-30,4,5,8,O);b.box(-5,-4,-30,5,4,8,O);b.box(-5,-5,-30,5,-4,8,SL2);
    b.box(-5,-4,8,5,4,11,M);b.box(-4,-5,8,4,5,11,M);
    b.box(-3,-3,-42,3,3,-30,0x7a7e84);b.box(-2,-2,-46,2,2,-42,0xb0402a);
    b.box(-1,5,-14,1,9,-10,D);b.box(-2,9,-14,2,10,-10,D);b.box(-1,5,4,1,8,6,D);
    b.box(-2,-12,-20,2,-5,-16,D);
    for(let i=0;i<6;i++)b.box(-2,-6-i,2+(i>>1),2,-5-i,6+(i>>1),GR);
    hand(b,0,-9,5,1);hand(b,-1,-9,-14,-1.5);
  },0,-46);
}
function selectWeapon(i){
  if(!WS.owned[i]||i===WS.cur)return;
  WS.cur=i;WS.reload=0;WS.cool=0.25;WS.vm.forEach((v,k)=>v.visible=(k===i));
  sfx('reload',0);
}
function startReload(){
  const w=WEAPONS[WS.cur];
  if(G.noReload||WS.reload>0||WS.mag[WS.cur]>=w.mag||WS.reserve[WS.cur]<=0&&!G.infAmmo)return;
  WS.reload=w.reload;sfx('reload',0);
}
function giveRandomAmmo(){
  const owned=[];WEAPONS.forEach((w,i)=>{if(WS.owned[i])owned.push(i)});
  const i=owned[Math.floor(Math.random()*owned.length)];WS.reserve[i]+=Math.ceil(WEAPONS[i].pack/3);
}
const _o=new THREE.Vector3(),_d=new THREE.Vector3(),_r=new THREE.Vector3(),_u=new THREE.Vector3();
const _hb={x0:0,y0:0,z0:0,x1:0,y1:0,z1:0};
function actorHit(a,ox,oy,oz,dx,dy,dz,maxT){
  const r=a.hitR,y0=a.y+a.lift;
  _hb.x0=a.x-r;_hb.x1=a.x+r;_hb.z0=a.z-r;_hb.z1=a.z+r;_hb.y0=y0;_hb.y1=y0+a.hitH;
  return rayBox(ox,oy,oz,dx,dy,dz,_hb,maxT);
}
function fireWeapon(){
  const w=WEAPONS[WS.cur];
  if(WS.cool>0||WS.reload>0||P.dead)return;
  if(WS.mag[WS.cur]<=0&&!G.noReload){if(WS.reserve[WS.cur]>0||G.infAmmo)startReload();else{sfx('empty',0);WS.cool=0.3}return}
  if(!G.noReload)WS.mag[WS.cur]--;WS.cool=60/w.rpm;WS.recoil=1;WS.flash=0.05;
  camera.getWorldDirection(_d);camera.getWorldPosition(_o);
  _r.set(1,0,0).applyQuaternion(camera.quaternion);_u.set(0,1,0).applyQuaternion(camera.quaternion);
  const aimed=G.aiming,mulSp=(aimed?0.35:1)*(P.crouch?0.7:1)*(P.speed>2?1.35:1)*(P.ground?1:1.8);
  P.pitch+=w.rec*(aimed?0.5:1)*(0.6+Math.random()*0.8);P.yaw+=(Math.random()-0.5)*w.rec*0.5;
  sfx(w.sfx,0);noiseAt(P.x,P.z,45);
  // posição visual do cano
  const mx=_o.x+_r.x*0.22+_d.x*0.7,my=_o.y-0.16+_d.y*0.7,mz=_o.z+_r.z*0.22+_d.z*0.7;
  if(w.rocket){
    ROCKETS.push({x:_o.x+_d.x*1.2,y:_o.y-0.1+_d.y*1.2,z:_o.z+_d.z*1.2,vx:_d.x*42,vy:_d.y*42,vz:_d.z*42,life:6,mesh:(()=>{const m=new THREE.Mesh(GEO_BOX,mat(0x777777));m.scale.set(0.2,0.2,0.7);scene.add(m);return m})()});
    P.vy+=0;return;
  }
  let hitAny=false,killed=false,headshot=false;
  for(let k=0;k<w.pellets;k++){
    const sp=w.spread*mulSp;
    let dx=_d.x+_r.x*(Math.random()-0.5)*2*sp+_u.x*(Math.random()-0.5)*2*sp,dy=_d.y+_r.y*(Math.random()-0.5)*2*sp+_u.y*(Math.random()-0.5)*2*sp,dz=_d.z+_r.z*(Math.random()-0.5)*2*sp+_u.z*(Math.random()-0.5)*2*sp;
    const L=Math.hypot(dx,dy,dz);dx/=L;dy/=L;dz/=L;
    rayWorld(_o.x,_o.y,_o.z,dx,dy,dz,w.range);
    let best=RAY.t,kind=RAY.kind,tgt=null;
    for(const e of ENEMIES){if(!e.alive||!e.group.visible)continue;const t=actorHit(e,_o.x,_o.y,_o.z,dx,dy,dz,best);if(t>=0&&t<best){best=t;tgt=e}}
    for(const n of NPCS){if(!n.alive||!n.group.visible)continue;const t=actorHit(n,_o.x,_o.y,_o.z,dx,dy,dz,best);if(t>=0&&t<best){best=t;tgt=n}}
    const hx=_o.x+dx*best,hy=_o.y+dy*best,hz=_o.z+dz*best;
    tracer(mx,my,mz,hx,hy,hz,0xfff2a0);
    if(tgt){
      let dmg=w.dmg;
      if(w.pellets>1)dmg*=1-clamp((best-12)/(w.range*0.9),0,0.65);
      const head=hy>tgt.y+tgt.lift+tgt.hitH*0.78&&tgt.kind==='enemy'&&!tgt.model.quad;
      if(head){dmg*=2;headshot=true}
      hitAny=true;
      if(tgt.kind==='enemy'){const was=tgt.alive;damageEnemy(tgt,dmg,head);if(was&&!tgt.alive)killed=true}else damageNpc(tgt,dmg);
    }else if(kind){burst(hx,hy,hz,kind===1?[0x6b8a3a,0x7a5636]:[0xcccccc,0x888888],4,3.5,0.08)}
  }
  if(hitAny)hitMarker(killed,headshot);
}
function updateWeapons(dt){
  const w=WEAPONS[WS.cur];
  WS.cool-=dt;
  if(WS.reload>0){WS.reload-=dt;if(WS.reload<=0){
    const need=w.mag-WS.mag[WS.cur],take=G.infAmmo?need:Math.min(need,WS.reserve[WS.cur]);
    WS.mag[WS.cur]+=take;if(!G.infAmmo)WS.reserve[WS.cur]-=take;}}
  if(G.fireHeld&&!P.dead&&(w.auto||G.firePressed)){fireWeapon()}
  G.firePressed=false;
  WS.recoil=Math.max(0,WS.recoil-dt*9);WS.flash-=dt;
  const vm=WS.vm[WS.cur];
  if(vm){
    const aimK=G.aiming?1:0;
    const tx=lerp(0.24,0.0,aimK),ty=lerp(-0.22,-0.15,aimK);
    const rl=WS.reload>0?Math.sin(clamp(1-WS.reload/w.reload,0,1)*Math.PI):0;
    vm.position.x+=(tx-vm.position.x)*Math.min(1,dt*14);
    vm.position.y+=(ty-rl*0.25-vm.position.y)*Math.min(1,dt*14);
    vm.position.z=-0.62+WS.recoil*0.08+Math.sin(G.bob*2)*0.004*(P.speed>1?1:0);
    vm.rotation.x=WS.recoil*0.12+rl*0.6;vm.rotation.z=Math.sin(G.bob)*0.01*(P.speed>1?1:0);
    vm.visible=!(G.aiming&&w.id==='sniper'&&WS.reload<=0&&false)&&!(G.aiming&&w.id==='sniper');
    WS.muzzle[WS.cur].visible=WS.flash>0;
  }
  for(let i=ROCKETS.length-1;i>=0;i--){
    const r=ROCKETS[i];r.life-=dt;
    const sx=r.x,sy=r.y,sz=r.z,mv=Math.hypot(r.vx,r.vy,r.vz)*dt;
    const dx=r.vx*dt/mv,dy=r.vy*dt/mv,dz=r.vz*dt/mv;
    rayWorld(sx,sy,sz,dx,dy,dz,mv+0.2);
    let hit=RAY.kind!==0,hx=sx+dx*RAY.t,hy=sy+dy*RAY.t,hz=sz+dz*RAY.t;
    if(!hit){
      r.x+=r.vx*dt;r.y+=r.vy*dt;r.z+=r.vz*dt;
      for(const e of ENEMIES){if(e.alive&&Math.abs(e.x-r.x)<e.hitR+0.4&&Math.abs(e.z-r.z)<e.hitR+0.4&&r.y>e.y+e.lift-0.3&&r.y<e.y+e.lift+e.hitH+0.3){hit=true;hx=r.x;hy=r.y;hz=r.z;break}}
    }
    r.mesh.position.set(r.x,r.y,r.z);r.mesh.lookAt(r.x+r.vx,r.y+r.vy,r.z+r.vz);
    burst(r.x,r.y,r.z,[0xcccccc,0xffaa33],1,1,0.12,0);
    if(hit||r.life<=0){scene.remove(r.mesh);ROCKETS.splice(i,1);explode(hx,hy,hz,6,w.dmg,true)}
  }
}
function noiseAt(x,z,rad){for(const n of NPCS)if(n.alive&&!n.stationary&&n.fear<=0){const d=Math.hypot(n.x-x,n.z-z);if(d<rad){n.fear=3+Math.random()*2;n.fx=x;n.fz=z}}}
