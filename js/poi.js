'use strict';
// ---------- Natureza: acampamentos de bandidos, grutas, baús escondidos e ciclo dia/noite ----------
const T_CAVE=9,T_WILD=10;
const FIRES=[];

function flattenArea(x,z,r,y){
  const F=3;
  for(let dz=-(r+F);dz<=r+F;dz++)for(let dx=-(r+F);dx<=r+F;dx++){
    const px=x+dx,pz=z+dz;if(px<2||pz<2||px>=W-2||pz>=W-2)continue;
    const d=Math.max(Math.abs(dx),Math.abs(dz)),i=pz*W+px;
    if(d<=r)H[i]=y;else H[i]=Math.round(lerp(y,H[i],(d-r)/F));
  }
}
function spotOK(x,z,r,taken,gap,maxRange){
  if(x<r+8||z<r+8||x>W-r-8||z>W-r-8)return null;
  for(const t of taken)if(Math.hypot(t.x-x,t.z-z)<t.r+gap)return null;
  let mn=99,mx=-99,sum=0,n=0;
  for(let dz=-r-1;dz<=r+1;dz+=2)for(let dx=-r-1;dx<=r+1;dx+=2){
    const i=(z+dz)*W+x+dx;if(T[i]!==T_NAT||H[i]<SEA+2)return null;
    if(H[i]<mn)mn=H[i];if(H[i]>mx)mx=H[i];sum+=H[i];n++;
  }
  return mx-mn>maxRange?null:Math.round(sum/n);
}
function findSpot(rng,r,gap,maxRange,taken,tries,pred){
  for(let t=0;t<tries;t++){
    const x=rng.int(30,W-30),z=rng.int(30,W-30);
    if(pred&&!pred(x,z))continue;
    const y=spotOK(x,z,r,taken,gap,maxRange+(t>tries*0.4?3:0)+(t>tries*0.75?4:0));
    if(y!==null)return{x,z,y};
  }
  return null;
}
function newArea(kind,id,name,s,rng,extra){
  const bio=B[s.z*W+s.x];
  return Object.assign({kind,id,name,cx:s.x,cz:s.z,y:s.y,half:9,biome:bio===BIO_ROCK?BIO_PLAINS:bio,rank:1,hpMul:1,state:'idle',owner:'enemy',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0},extra||{});
}

// ---------- baús ----------
function addChest(x,y,z,yaw,gold,lockedBy){
  const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=yaw;
  // corpo de tábuas, cantos e cintas de ferro; tampa em degraus; fechadura dourada
  const WDc=[0x7a4a22,0x6c4120,0x835228];
  for(let i=0;i<4;i++)part(g,GEO_BOX,0.9,0.12,0.6,WDc[i%3],0,0.06+i*0.125,0);
  part(g,GEO_BOX,0.94,0.06,0.64,0x4a2e16,0,0.03,0);                                    // rodapé
  for(const sx of[-1,1])for(const sz of[-1,1])part(g,GEO_BOX,0.09,0.52,0.09,0x3a3a3e,sx*0.43,0.26,sz*0.28);   // cantoneiras
  for(const x of[-0.26,0.26])part(g,GEO_BOX,0.1,0.5,0.64,0x4a4a50,x,0.25,0);          // cintas
  const lid=new THREE.Group();lid.position.set(0,0.5,-0.3);g.add(lid);
  part(lid,GEO_BOX,0.92,0.1,0.62,0x8a5a2a,0,0.05,0.3);part(lid,GEO_BOX,0.92,0.1,0.5,0x7a4e24,0,0.15,0.3);part(lid,GEO_BOX,0.92,0.08,0.3,0x8a5a2a,0,0.24,0.3);
  for(const x of[-0.26,0.26]){part(lid,GEO_BOX,0.1,0.1,0.64,0x4a4a50,x,0.05,0.3);part(lid,GEO_BOX,0.1,0.1,0.52,0x4a4a50,x,0.15,0.3);part(lid,GEO_BOX,0.1,0.08,0.32,0x4a4a50,x,0.24,0.3)}
  part(g,GEO_BOX,0.16,0.18,0.06,0xe0b030,0,0.46,0.33);part(g,GEO_BOX,0.05,0.08,0.07,0x2a2a2a,0,0.45,0.35);
  scene.add(g);
  const ch={x,y,z,gold,lockedBy:lockedBy||null,opened:false,g,lid,open:0,sparkT:Math.random()*2};
  WORLD.chests.push(ch);return ch;
}
function openChest(ch){
  if(ch.opened)return;
  if(ch.lockedBy&&ch.lockedBy.state!=='cleared'){toast('🔒 Trancado: elimine os bandidos primeiro.',1800);return}
  ch.opened=true;if(ch.lockedBy)ch.lockedBy.completed=true;addCoins(ch.gold);sfx('coin',0);toast('📦 Baú aberto! +'+ch.gold+' moedas',2500);
}
function updateChests(dt){
  for(const ch of WORLD.chests){
    if(ch.opened&&ch.open<1){ch.open=Math.min(1,ch.open+dt*2.5);ch.lid.rotation.x=-ch.open*1.9}
  }
}

// ---------- acampamento de bandidos ----------
function buildCamp(c,rng){
  for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++)if(Math.hypot(dx,dz)<=9.6)setTL(c,dx,dz,T_WILD);
  c.flagMat=new THREE.MeshLambertMaterial({color:0x2a2a2a});
  // fogueira
  for(let k=0;k<10;k++){const a=k/10*6.283+rng.range(-0.1,0.1),x=Math.cos(a)*1.0,z=Math.sin(a)*1.0,s=rng.range(0.26,0.42),hh=rng.range(0.22,0.46);
    Bc(c,x-s/2,0,z-s/2,x+s/2,hh,z+s/2,shadec(rng.pick([0x6a6a6a,0x7a7a78,0x5a5a5e,0x8a8780]),rng.range(0.9,1.1)),false,{j:0.1})}
  Bc(c,-0.7,0,-0.7,0.7,0.1,0.7,0x2a1a14,false,{j:0.02});                                    // cinzas
  for(const [x,z] of[[-0.3,0.2],[0.25,-0.3],[0.1,0.35],[-0.15,-0.1]])Bc(c,x-0.1,0.1,z-0.1,x+0.1,0.16,z+0.1,0xc8501a,false,{j:0.1});   // brasas
  Bc(c,-0.55,0.1,-0.14,0.55,0.3,0.1,0x4a3320,false);Bc(c,-0.1,0.1,-0.55,0.14,0.3,0.55,0x5a4028,false);Bc(c,-0.5,0.3,-0.3,0.3,0.46,-0.1,0x3a2a1c,false);
  // tripé com panela
  for(let k=0;k<3;k++){const a=k*2.094+0.5;for(let j=0;j<6;j++){const r=1.1*(1-j/6.5),x=Math.cos(a)*r,z=Math.sin(a)*r;Bc(c,x-0.05,j*0.34,z-0.05,x+0.05,j*0.34+0.4,z+0.05,0x4a3320,false,{j:0.04})}}
  Bc(c,-0.04,1.6,-0.04,0.04,2.05,0.04,0x555555,false,{j:0});
  Bc(c,-0.3,1.1,-0.3,0.3,1.5,0.3,0x2a2a2e,false,{j:0.03});Bc(c,-0.34,1.46,-0.34,0.34,1.54,0.34,0x44444a,false,{j:0.03});
  for(const [col,sc,yy] of[[0xff7a1a,[0.5,0.6,0.5],0.5],[0xffd84a,[0.28,0.85,0.28],0.6]]){
    const m=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:col}));m.scale.set(sc[0],sc[1],sc[2]);m.position.set(c.cx,c.y+yy,c.cz);m.userData.base=sc;scene.add(m);FIRES.push(m);
  }
  // troncos de sentar
  for(let k=0;k<4;k++){const a=k*1.57+0.4,x=Math.cos(a)*2.7,z=Math.sin(a)*2.7;
    const ax=Math.abs(Math.cos(a))>Math.abs(Math.sin(a));
    if(ax){Bc(c,x-0.25,0,z-0.8,x+0.25,0.4,z+0.8,0x6b4a2a,true);Bc(c,x-0.27,0.05,z-0.82,x+0.27,0.35,z-0.74,0xb08a58,false,{j:0.02});Bc(c,x-0.27,0.05,z+0.74,x+0.27,0.35,z+0.82,0xb08a58,false,{j:0.02});Bc(c,x-0.1,0.4,z-0.5,x+0.1,0.44,z+0.5,0x7a5632,false,{j:0.04})}
    else{Bc(c,x-0.8,0,z-0.25,x+0.8,0.4,z+0.25,0x6b4a2a,true);Bc(c,x-0.82,0.05,z-0.27,x-0.74,0.35,z+0.27,0xb08a58,false,{j:0.02});Bc(c,x+0.74,0.05,z-0.27,x+0.82,0.35,z+0.27,0xb08a58,false,{j:0.02});Bc(c,x-0.5,0.4,z-0.1,x+0.5,0.44,z+0.1,0x7a5632,false,{j:0.04})}}
  // tendas
  const base=rng.range(0,6.28);
  for(let k=0;k<3;k++){
    const a=base+k*2.1,tx=Math.cos(a)*5.8,tz=Math.sin(a)*5.8,col=rng.pick([0x8a6a3a,0xa08a5a,0x6b4a2a,0x7a3a2a]);
    // lona em 5 degraus com faixas alternadas, mastro de cumeeira, porta com abas e estacas
    for(let i=0;i<5;i++){const w=1.8-i*0.34;Bc(c,tx-w,i*0.5,tz-1.4,tx+w,i*0.5+0.5,tz+1.4,shadec(col,i%2?1.07:0.95),false,{j:0.06})}
    Bc(c,tx-1.8,0,tz-1.4,tx-1.74,0.5,tz+1.4,shadec(col,0.8),false,{j:0});Bc(c,tx+1.74,0,tz-1.4,tx+1.8,0.5,tz+1.4,shadec(col,0.8),false,{j:0});   // barra
    Bc(c,tx-0.07,2.5,tz-1.75,tx+0.07,2.66,tz+1.75,0x4a3320,false,{j:0});
    Bc(c,tx-0.5,1.0,tz-0.5,tx+0.5,1.4,tz+0.5,shadec(col,1.2),false,{j:0.05});            // remendo
    const fz=tz>0?tz-1.4:tz+1.4,s=tz>0?-1:1,z0=Math.min(fz,fz+s*0.08),z1=Math.max(fz,fz+s*0.08);
    Bc(c,tx-0.45,0,z0,tx+0.45,1.5,z1,0x1f1710,false,{j:0});
    Bc(c,tx-0.7,0,z0,tx-0.45,1.6,z1+(s>0?0.06:0),shadec(col,0.75),false,{j:0.03});Bc(c,tx+0.45,0,z0,tx+0.7,1.6,z1+(s>0?0.06:0),shadec(col,0.75),false,{j:0.03});
    for(const sx of[-1,1])for(const sz of[-1,1])Bc(c,tx+sx*2.05-0.05,0,tz+sz*1.7-0.05,tx+sx*2.05+0.05,0.4,tz+sz*1.7+0.05,0x4a3320,false,{j:0});
    addCol(c.cx+tx-1.8,c.y,c.cz+tz-1.4,c.cx+tx+1.8,c.y+1.3,c.cz+tz+1.4);addCol(c.cx+tx-1.1,c.y+1.3,c.cz+tz-1.4,c.cx+tx+1.1,c.y+2.1,c.cz+tz+1.4);addCol(c.cx+tx-0.4,c.y+2.1,c.cz+tz-1.4,c.cx+tx+0.4,c.y+2.6,c.cz+tz+1.4);
  }
  // caixas e barris como cobertura
  const pp=(a,r)=>[Math.cos(base+a)*r,Math.sin(base+a)*r];
  let q=pp(1.05,3.6);crate(c,q[0]-0.5,q[1]-0.5,1,1.3);
  q=pp(3.15,3.6);barrel(c,q[0]-0.45,q[1]-0.45);
  q=pp(1.05,5.6);hay(c,q[0]-0.65,q[1]-0.65);
  q=pp(3.15,8);addFlag(c,q[0],0,q[1],3.4);
  // recompensa
  const ra=base+5.3,rx=Math.cos(ra)*6.6,rz=Math.sin(ra)*6.6;
  if(c.reward==='gold'){
    c.chest=addChest(c.cx+rx,c.y,c.cz+rz,Math.atan2(-rx,-rz),rng.int(150,300),c);
  }else buildCage(c,rx,rz);
  // blocos de terra do buraco escavado (só se o terreno foi cavado)
  if(c.dug>12){
    const bb=B[c.cz*W+c.cx],dc=bb===BIO_DESERT?[0xc9b777,0xb8a666]:bb===BIO_ROCK?[0x777777,0x6a6a6a]:[0x7a5636,0x6b4a2e,0x8a6240];
    for(let k=0;k<9;k++){
      const a=rng.range(0,6.283),r=rng.range(7.8,9.5),w=rng.range(0.7,1.4),d=rng.range(0.7,1.4),h=rng.range(0.45,1.0),x=Math.cos(a)*r,z=Math.sin(a)*r;
      Bc(c,x-w/2,0,z-d/2,x+w/2,h,z+d/2,rng.pick(dc),true,{j:0.08});
      if(rng.chance(0.35))Bc(c,x-w/4,h,z-d/4,x+w/4,h+0.5,z+d/4,rng.pick(dc),true,{j:0.08});
    }
  }
  c.firePos={x:c.cx,z:c.cz};
}
// constrói o acampamento numa malha própria, guardando tudo o que foi criado para poder removê-lo depois
function buildCampFull(c,rng){
  const before=scene.children.length;BX_CAP={batch:new BoxBatch(),cols:[]};
  try{buildCamp(c,rng)}finally{
    const cap=BX_CAP;BX_CAP=null;
    const m=cap.batch.toMesh(MAT_TERRAIN);if(m){m.userData.cx=c.cx;m.userData.cz=c.cz;scene.add(m);c.mesh=m}
    c.cols=cap.cols;
  }
  c.sceneObjs=scene.children.slice(before);
}
function addCol(x0,y0,z0,x1,y1,z1){const b={x0,y0,z0,x1,y1,z1};Col.add(b);if(BX_CAP)BX_CAP.cols.push(b);return b}
function buildCage(c,rx,rz){
  const h=1.1,PH=2.4,wx=c.cx+rx,wz=c.cz+rz,y=c.y,col=0x4a3a2a,barc=0x3a3a3a;
  const n=Math.abs(rx)<=Math.abs(rz)?[0,rz>0?-1:1]:[rx>0?-1:1,0];   // lado da porta: voltado para o centro do acampamento
  for(const sx of[-1,1])for(const sz of[-1,1])Bx(wx+sx*h-0.09,y,wz+sz*h-0.09,wx+sx*h+0.09,y+PH,wz+sz*h+0.09,col,true,{j:0});
  for(const yy of[0.05,PH-0.12]){
    Bx(wx-h,y+yy,wz-h,wx+h,y+yy+0.1,wz-h+0.1,col,false,{j:0});Bx(wx-h,y+yy,wz+h-0.1,wx+h,y+yy+0.1,wz+h,col,false,{j:0});
    Bx(wx-h,y+yy,wz-h,wx-h+0.1,y+yy+0.1,wz+h,col,false,{j:0});Bx(wx+h-0.1,y+yy,wz-h,wx+h,y+yy+0.1,wz+h,col,false,{j:0});
  }
  Bx(wx-h-0.1,y+PH,wz-h-0.1,wx+h+0.1,y+PH+0.12,wz+h+0.1,col,false,{j:0,b:true});   // b: desenha também a face de baixo (teto visto de dentro)
  for(const sd of[[0,-1],[0,1],[-1,0],[1,0]]){
    if(sd[0]===n[0]&&sd[1]===n[1])continue;
    for(const k of[-0.7,-0.35,0,0.35,0.7]){
      if(sd[0]===0)Bx(wx+k*1.3-0.04,y+0.1,wz+sd[1]*h-0.04,wx+k*1.3+0.04,y+PH-0.12,wz+sd[1]*h+0.04,barc,false,{j:0});
      else Bx(wx+sd[0]*h-0.04,y+0.1,wz+k*1.3-0.04,wx+sd[0]*h+0.04,y+PH-0.12,wz+k*1.3+0.04,barc,false,{j:0});
    }
    if(sd[0]===0)addCol(wx-h,y,wz+sd[1]*h-0.06,wx+h,y+PH,wz+sd[1]*h+0.06);else addCol(wx+sd[0]*h-0.06,y,wz-h,wx+sd[0]*h+0.06,y+PH,wz+h);
  }
  // porta articulada (abre com E depois que os bandidos forem eliminados)
  const dg=new THREE.Group(),mk=(w,hh,d,cl,x,yy,z)=>part(dg,GEO_BOX,w,hh,d,cl,x,yy,z);
  mk(2.0,0.1,0.1,0x6b4a2a,1.0,0.1,0);mk(2.0,0.1,0.1,0x6b4a2a,1.0,PH-0.2,0);
  for(const k of[0.15,0.6,1.0,1.4,1.85])mk(0.08,PH-0.3,0.08,0x4a4a4a,k,PH/2-0.05,0);
  mk(0.12,PH-0.2,0.12,0x6b4a2a,0.05,PH/2,0);mk(0.12,PH-0.2,0.12,0x6b4a2a,1.95,PH/2,0);mk(0.16,0.22,0.12,0xe0b030,1.75,1.1,0.1);
  let yb,hx,hz,box;
  if(n[0]===0){yb=0;hx=wx-1;hz=wz+n[1]*h;box=addCol(wx-h,y,wz+n[1]*h-0.06,wx+h,y+PH,wz+n[1]*h+0.06)}
  else{yb=Math.PI/2;hx=wx+n[0]*h;hz=wz+1;box=addCol(wx+n[0]*h-0.06,y,wz-h,wx+n[0]*h+0.06,y+PH,wz+h)}
  dg.position.set(hx,y,hz);dg.rotation.y=yb;scene.add(dg);
  const endDot=th=>2*Math.cos(yb+th)*n[0]-2*Math.sin(yb+th)*n[1];
  const th=endDot(1.7)>endDot(-1.7)?1.7:-1.7;
  c.cage={x:wx,z:wz,dp:{x:wx+n[0]*1.8,z:wz+n[1]*1.8},door:dg,box,yb,th,opened:false,t:0};
  c.hostagePos={x:wx,z:wz};
}
function openCage(c){
  const cg=c.cage;if(!cg||cg.opened)return;
  if(c.state!=='cleared'){toast('🔒 A grade está trancada — elimine os bandidos primeiro.',2200);return}
  cg.opened=true;cg.box.y0=-50;cg.box.y1=-49;sfx('coin',0);
  const h=c.hostage,qh=questHostageFreed(c);
  if(h&&h.alive){showSubtitle(qh?'— Obrigado por me libertar! Que Deus lhe pague!':'— Obrigado por me libertar! Vou me juntar às suas tropas.',2600);cg.leaveT=1.8;cg.questReward=qh}
  else{toast('A grade está aberta, mas o refém não sobreviveu.',3500);if(qh)failQuest('O refém não sobreviveu.');c.completed=true}
}
function clearCamp(c){
  c.state='cleared';c.flagMat.color.setHex(0x2a6aff);sfx('coin',0);
  if(c.reward==='hostage')toast('🏕 Acampamento limpo! Vá até a grade e abra-a para libertar o refém.',4500);
  else toast('🏕 Acampamento limpo! O baú foi destrancado.',3500);
  questCampCleared(c);
}

// ---------- gruta ----------
function buildCave(c,rng){
  // gruta natural: um morro de rocha criado no próprio relevo, com um túnel no interior
  const D=rng.pick(['N','S','E','W']);c.entrance=D;
  const loc=(u,v)=>{const w=v-6;switch(D){case'N':return[u,w];case'S':return[u,-w];case'W':return[w,u];default:return[-w,u]}};
  const y=c.y,cx=c.cx,cz=c.cz;
  const ht=(u,v,tx,tz)=>Math.round(11*Math.max(0,1-Math.pow(Math.hypot(u,v-6)/14,2)))+(hash2(tx,tz,5)<0.3?1:0);
  const room=(u,v)=>Math.abs(u)<=3&&v>=2&&v<=10;
  const tunnel=(u,v)=>Math.abs(u)<=1&&v>=-3&&v<=1;
  const apron=(u,v)=>Math.abs(u)<=1&&v>=-8&&v<-3;
  const ring=(u,v)=>(Math.abs(u)<=4&&v>=1&&v<=11)||(Math.abs(u)<=2&&v>=-3&&v<=1);
  const roofs=[];
  for(let v=-9;v<=21;v++)for(let u=-16;u<=16;u++){
    const m=loc(u,v),tx=cx+m[0],tz=cz+m[1];if(tx<2||tz<2||tx>=W-2||tz>=W-2)continue;
    const d=Math.hypot(u,v-6);if(d>17)continue;
    const i=tz*W+tx,covered=room(u,v)||tunnel(u,v),open=apron(u,v);
    if(T[i]!==T_NAT&&!covered&&!open)continue;
    let top=ht(u,v,tx,tz);if(ring(u,v)||covered)top=Math.max(top,5);
    let h=(covered||open)?y:y+top;
    if(d>14&&!covered&&!open)h=Math.round(lerp(y+top,H[i],clamp((d-14)/3,0,1)));
    H[i]=h;if(d<=15)B[i]=BIO_ROCK;
    if(covered||open)T[i]=T_CAVE;
    if(covered)roofs.push([tx,tz,top]);
  }
  for(const [tx,tz,top] of roofs){
    const col=shadec(natCol(y+top,BIO_ROCK),0.78+hash2(tx,tz,9)*0.14);
    Bx(tx,y+3.2,tz,tx+1,y+top,tz+1,col,true,{b:true,j:0.05});
  }
  const wp=(u,v)=>{const m=loc(u,v);return[cx+m[0]+0.5,cz+m[1]+0.5]};
  c.wp=wp;
  // tochas e estalagmites
  for(const [u,v] of[[-3,4],[3,4],[-3,8],[3,8]]){const p=wp(u,v);Bx(p[0]-0.07,y,p[1]-0.07,p[0]+0.07,y+1.5,p[1]+0.07,0x4a3320,false,{j:0});Bx(p[0]-0.17,y+1.5,p[1]-0.17,p[0]+0.17,y+1.9,p[1]+0.17,0xffa020,false,{j:0})}
  for(let k=0;k<5;k++){const u=rng.pick([-3,-2.6,2.6,3])+0,v=rng.range(3,9.5),p=wp(u,v),w=rng.range(0.25,0.45);Bx(p[0],y,p[1],p[0]+w,y+rng.range(0.6,1.6),p[1]+w,0x77777a,true,{j:0.1})}
  const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D],cp=wp(0,9.5);
  c.chest=addChest(cp[0],y,cp[1],Math.atan2(o[0],o[1]),rng.int(120,260),null);
  c.mouth={x:wp(0,-5)[0],z:wp(0,-5)[1]};c.bearSpot=wp(0,6);
}

// ---------- baús escondidos ----------
function buildHideout(x,z,y,rng){
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)setT(x+dx,z+dz,T_WILD);
  const gap=rng.int(0,5);
  for(let k=0;k<6;k++){if(k===gap)continue;const a=k/6*6.283+rng.range(-0.2,0.2),rx=x+Math.round(Math.cos(a)*2.3),rz=z+Math.round(Math.sin(a)*2.3);
    if(getT(rx,rz)===T_NAT&&H[rz*W+rx]>=SEA+1)addRock(rx,rz,H[rz*W+rx],rng,B[rz*W+rx]===BIO_SNOW,B[rz*W+rx])}
  addChest(x+0.5,H[z*W+x],z+0.5,rng.range(0,6.28),rng.int(60,180),null);
}

// grutas só em montanhas: tile de rocha, ou neve com rocha (montanha nevada) por perto
function caveOK(x,z){
  const b=B[z*W+x];
  if(b===BIO_ROCK)return true;
  if(b!==BIO_SNOW)return false;
  for(let k=0;k<12;k++){const a=k/12*6.283,px=Math.round(x+Math.cos(a)*22),pz=Math.round(z+Math.sin(a)*22);if(px>0&&pz>0&&px<W&&pz<W&&B[pz*W+px]===BIO_ROCK)return true}
  return false;
}
// escava o terreno para o acampamento caber inteiro: tudo acima do nível é removido (paredes verticais de terra); buracos são preenchidos
function digCamp(x,z){
  const R=10.5,hs=[];
  for(let dz=-11;dz<=11;dz++)for(let dx=-11;dx<=11;dx++)if(Math.hypot(dx,dz)<=R)hs.push(H[(z+dz)*W+x+dx]);
  hs.sort((a,b)=>a-b);
  const y=Math.max(SEA+2,hs[Math.floor(hs.length*0.35)]);let dug=0;
  for(let dz=-11;dz<=11;dz++)for(let dx=-11;dx<=11;dx++)if(Math.hypot(dx,dz)<=R){const i=(z+dz)*W+x+dx;if(H[i]>y)dug++;H[i]=y}
  return{y,dug};
}
function genPOIs(rng,cities){
  WORLD.camps=[];WORLD.caves=[];WORLD.chests=[];FIRES.length=0;
  const taken=cities.map(c=>({x:c.cx,z:c.cz,r:c.half+8}));
  const nCamps=rng.int(14,18);
  for(let i=0;i<nCamps;i++){
    const s=findSpot(rng,10,16,6,taken.concat(cities.map(k=>({x:k.cx,z:k.cz,r:k.half+24}))),3500);if(!s)continue;
    taken.push({x:s.x,z:s.z,r:14});
    const dg=digCamp(s.x,s.z);s.y=dg.y;
    const c=newArea('camp',100+i,'Acampamento de bandidos',s,rng,{rank:rng.int(1,2),reward:rng.chance(0.5)?'hostage':'gold',dug:dg.dug});
    buildCampFull(c,rng);WORLD.camps.push(c);
  }
  const nCaves=rng.int(9,12);
  for(let i=0;i<nCaves;i++){
    const s=findSpot(rng,11,20,9,taken,9000,caveOK);if(!s)continue;
    taken.push({x:s.x,z:s.z,r:17});
    const c=newArea('cave',200+i,'Gruta',s,rng,{rank:6,owner:'wild'});
    buildCave(c,rng);WORLD.caves.push(c);
  }
  const nChests=rng.int(34,46);
  for(let i=0;i<nChests;i++){
    const s=findSpot(rng,3,10,4,taken,1500);if(!s)continue;
    taken.push({x:s.x,z:s.z,r:4});buildHideout(s.x,s.z,s.y,rng);
  }
  genPacks(rng,cities,taken);
  WORLD.areas=cities.concat(WORLD.camps,WORLD.caves,WORLD.packs);
}

// ---------- bandos de animais selvagens (andam por aí e atacam quem chega perto) ----------
const PACK_W={
  [BIO_FOREST]:[['wolf',3],['boar',3],['bear',2],['spider',2]],
  [BIO_PLAINS]:[['boar',3],['wolf',2.5],['spider',1.5],['bear',0.7]],
  [BIO_DESERT]:[['scorpion',4],['spider',1.5],['wolf',0.5]],
  [BIO_SNOW]:[['wolf',4],['bear',2.5],['spider',0.5]],
  [BIO_ROCK]:[['spider',3],['bear',2],['wolf',2],['scorpion',1]]
};
function packSpecies(rng,b){
  const wt=PACK_W[b]||PACK_W[BIO_PLAINS],tot=wt.reduce((a,x)=>a+x[1],0);let r=rng.next()*tot;
  for(const w of wt){r-=w[1];if(r<=0)return w[0]}return wt[0][0];
}
function genPacks(rng,cities,taken){
  WORLD.packs=[];
  const home=cities.find(c=>c.home),n=rng.int(20,26);
  for(let i=0;i<n;i++){
    const s=findSpot(rng,3,10,6,taken,2500,(x,z)=>{
      if(home&&Math.hypot(x-home.cx,z-home.cz)<home.half+70)return false;
      for(const c of cities)if(Math.hypot(x-c.cx,z-c.cz)<c.half+30)return false;
      return true;
    });
    if(!s)continue;
    taken.push({x:s.x,z:s.z,r:6});
    const sp=packSpecies(rng,B[s.z*W+s.x]);
    const c=newArea('pack',300+i,'Animais selvagens',s,rng,{rank:2,owner:'wild',leash:50,species:sp,ax:s.x+0.5,az:s.z+0.5,tx:s.x,tz:s.z,rt:rng.range(4,14)});
    WORLD.packs.push(c);
  }
}
function populatePack(c){
  c.spawnN=(c.spawnN||0)+1;
  const rng=new RNG(WORLD.seed*23+c.id*89+c.spawnN*313);
  const n={bear:rng.int(1,2),wolf:rng.int(3,5),spider:rng.int(2,4),boar:rng.int(2,3),scorpion:rng.int(3,5)}[c.species]||3;
  c.enemies=[];c.aliveEnemies=0;c.totalEnemies=0;c.state='idle';c.cx=Math.floor(c.ax);c.cz=Math.floor(c.az);c.tx=c.ax;c.tz=c.az;
  for(let i=0;i<n;i++){
    const a=i/n*6.283+rng.range(0,1),r=1.5+rng.range(0,2.5),e=spawnEnemy(c,c.species,c.ax+Math.cos(a)*r,c.az+Math.sin(a)*r);
    e.pkx=rng.range(-3,3);e.pkz=rng.range(-3,3);e.homeX=c.ax+e.pkx;e.homeZ=c.az+e.pkz;
  }
}
// botão de teste: invoca um bando 20 m à frente do jogador (some depois de morto)
function summonPack(sp){
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw),x=clamp(P.x+fx*20,12,W-12),z=clamp(P.z+fz*20,12,W-12);
  const s={x:Math.floor(x),z:Math.floor(z),y:Math.max(tH(x,z),SEA)};
  const rng=new RNG((Math.random()*1e9)|0),species=sp||packSpecies(rng,B[s.z*W+s.x]);
  const c=newArea('pack',900+WORLD.packs.length,'Animais selvagens',s,rng,{rank:2,owner:'wild',leash:50,species,ax:x,az:z,tx:x,tz:z,rt:10,temp:true});
  WORLD.packs.push(c);WORLD.areas.push(c);populatePack(c);
  toast('🐾 Bando invocado: '+(EDEF[species].name)+' ×'+c.enemies.length,2500);
}
function updatePacks(dt){
  for(const c of WORLD.packs.slice()){
    const alive=c.enemies.filter(e=>e.alive);
    if(c.temp&&!alive.length){
      c.deadAt=c.deadAt===undefined?G.t:c.deadAt;
      if(G.t-c.deadAt>8){WORLD.packs.splice(WORLD.packs.indexOf(c),1);const k=WORLD.areas.indexOf(c);if(k>=0)WORLD.areas.splice(k,1)}
      continue;
    }
    if(!alive.length){
      if(c.deadAt===undefined)c.deadAt=G.t;
      else if(G.t-c.deadAt>240&&Math.hypot(c.ax-P.x,c.az-P.z)>110){c.deadAt=undefined;populatePack(c)}
      continue;
    }
    if(alive.some(e=>e.aggro))continue;
    let mx=0,mz=0;for(const e of alive){mx+=e.x;mz+=e.z}c.cx=mx/alive.length;c.cz=mz/alive.length;
    c.rt-=dt;
    if(c.rt<=0||Math.hypot(c.tx-c.cx,c.tz-c.cz)<4){
      c.rt=14+Math.random()*20;
      for(let k=0;k<14;k++){
        const a=Math.random()*6.283,r=10+Math.random()*28,x=c.cx+Math.cos(a)*r,z=c.cz+Math.sin(a)*r;
        if(x<12||z<12||x>W-12||z>W-12||Math.hypot(x-c.ax,z-c.az)>70)continue;
        if(tH(x,z)<SEA+0.8||!navFree(x,z)||T[Math.floor(z)*W+Math.floor(x)]!==T_NAT)continue;
        let near=false;for(const k2 of WORLD.cities)if(Math.hypot(x-k2.cx,z-k2.cz)<k2.half+14){near=true;break}
        if(near)continue;
        c.tx=x;c.tz=z;break;
      }
    }
    for(const e of alive){e.homeX=c.tx+e.pkx;e.homeZ=c.tz+e.pkz}
  }
}

// ---------- população (depois da geração) ----------
function populateCamp(c){
  c.spawnN=(c.spawnN||0)+1;
  const rng=new RNG(WORLD.seed*17+c.id*53+3+c.spawnN*977),n=c.rank===1?3:4,ang0=rng.range(0,6.28);
  for(let i=0;i<n;i++){
    const a=ang0+i*(6.283/n),r=3.4+rng.range(0,1.6),type=(c.rank===2&&i===n-1)?'hound':'soldier';
    spawnEnemy(c,type,c.cx+Math.cos(a)*r,c.cz+Math.sin(a)*r);
  }
  if(c.reward==='hostage'&&c.hostagePos){c.hostage=spawnNpc(c,{role:'hostage',x:c.hostagePos.x,z:c.hostagePos.z,stationary:true,yaw:0})}
}
function populateWild(){  for(const c of WORLD.camps)populateCamp(c);
  for(const c of WORLD.packs)populatePack(c);
  for(const c of WORLD.caves){
    const rng=new RNG(WORLD.seed*19+c.id*71+5),roll=rng.int(0,1);
    const plan=roll===0?['wolf','wolf','wolf']:['bear','bear'];
    plan.forEach((t,i)=>{
      let x,z;
      if(t==='bear'&&i===0){x=c.bearSpot[0];z=c.bearSpot[1]}
      else{const p=c.wp(rng.range(-1.2,1.2),-5-rng.range(0,6));x=p[0];z=p[1]}
      spawnEnemy(c,t,x,z);
    });
  }
}
// ---------- ciclo de vida dos acampamentos ----------
// Concluído (bando eliminado + baú aberto ou refém libertado) e fora da visão: some. Dois dias depois, também fora da visão, reaparece
// com novos bandidos e outra recompensa. Uma missão também pode fazê-lo reaparecer antes.
let CAMP_T=0;
function campOutOfSight(c){
  const d=Math.hypot(c.cx-P.x,c.cz-P.z);
  if(d<60)return false;if(d>150)return true;
  camera.getWorldDirection(_d);return((c.cx-P.x)*_d.x+(c.cz-P.z)*_d.z)/d<0.25;
}
function despawnCamp(c){
  const objs=c.sceneObjs||[];
  for(const o of objs){scene.remove(o);if(o.geometry&&o===c.mesh)o.geometry.dispose()}
  for(const b of c.cols||[])Col.remove(b);
  for(let i=FIRES.length-1;i>=0;i--)if(objs.includes(FIRES[i]))FIRES.splice(i,1);
  if(c.chest){const k=WORLD.chests.indexOf(c.chest);if(k>=0)WORLD.chests.splice(k,1)}
  for(const e of c.enemies){e.alive=false;e.gone=true;scene.remove(e.group)}
  for(const n of c.npcs){n.alive=false;n.gone=true;scene.remove(n.group)}
  c.enemies=[];c.npcs=[];c.hostage=null;c.chest=null;c.cage=null;c.hostagePos=null;c.flags=[];c.mesh=null;c.sceneObjs=[];c.cols=[];
  c.aliveEnemies=0;c.totalEnemies=0;c.gone=true;c.goneAt=DN.days;c.state='gone';c.completed=false;c.questTarget=false;
  buildNav();
}
function respawnCamp(c,opt){
  opt=opt||{};const rng=new RNG((Math.random()*1e9)|0);
  c.gone=false;c.state='idle';c.completed=false;c.owner='enemy';c.name='Acampamento de bandidos';
  c.rank=opt.rank||rng.int(1,2);c.reward=opt.reward||(rng.chance(0.5)?'hostage':'gold');
  c.enemies=[];c.npcs=[];c.aliveEnemies=0;c.totalEnemies=0;c.flags=[];c.hostage=null;c.chest=null;c.cage=null;c.hostagePos=null;
  buildCampFull(c,rng);populateCamp(c);buildNav();
}
function updateCamps(dt){
  CAMP_T-=dt;if(CAMP_T>0)return;CAMP_T=1;
  for(const c of WORLD.camps){
    if(!c.gone){if(c.completed&&!c.questTarget&&campOutOfSight(c))despawnCamp(c)}
    else if(DN.days-c.goneAt>=2&&campOutOfSight(c))respawnCamp(c);
  }
}
function updateWild(dt){
  updateCamps(dt);updatePacks(dt);
  if(POISON.t>0){if(P.dead)POISON.t=0;else{POISON.t-=dt;POISON.acc+=dt;if(POISON.acc>=1){POISON.acc=0;damagePlayer(2,P.x+1,P.z)}}}
  for(const c of WORLD.caves.concat(WORLD.camps,WORLD.packs))if(c.state==='attacking'&&!c.enemies.some(e=>e.alive&&e.aggro))c.state='idle';
  for(const c of WORLD.camps){const cg=c.cage;
    if(cg&&cg.leaveT>0){cg.leaveT-=dt;if(cg.leaveT<=0){
      const h=c.hostage;if(h&&h.alive){h.alive=false;h.gone=true;scene.remove(h.group);
        const hm=WORLD.home,bk=hm.barracks||{x:hm.cx,z:hm.cz};
        if(cg.questReward){completeQuest()}else if(allyCount()<ARMY.max){spawnAlly(bk.x,bk.z,hm);toast('🪢 O refém agora é um dos seus soldados, no quartel de '+hm.name+'.',4500)}
        else{addCoins(150);toast('🪢 Refém libertado! Exército cheio: +150 moedas.',4000)}}c.completed=true}}
    if(cg&&cg.opened&&cg.t<1){cg.t=Math.min(1,cg.t+dt*1.6);cg.door.rotation.y=cg.yb+cg.th*cg.t}}
  for(const m of FIRES){const k=0.85+Math.sin(G.t*14+m.position.x)*0.15+Math.random()*0.1;m.scale.set(m.userData.base[0]*k,m.userData.base[1]*(0.8+Math.random()*0.4),m.userData.base[2]*k)}
}

// ---------- ciclo dia/noite ----------
const DN={t:0.3,len:420,dayF:1,elev:1,group:null,days:0};   // days: tempo total em dias de jogo
const _dnv=new THREE.Vector3();
function initDayNight(){
  DN.group=new THREE.Group();scene.add(DN.group);
  const mk=(col,s)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(s,s,2),new THREE.MeshBasicMaterial({color:col,fog:false}));DN.group.add(m);return m};
  DN.sunM=mk(0xfff0a0,38);DN.moonM=mk(0xdfe8ff,24);
  const rng=new RNG(WORLD.seed+404),pos=new Float32Array(700*3);
  for(let i=0;i<700;i++){const th=rng.range(0,6.283),ph=Math.acos(rng.range(-1,1));pos[i*3]=Math.sin(ph)*Math.cos(th)*330;pos[i*3+1]=Math.cos(ph)*330;pos[i*3+2]=Math.sin(ph)*Math.sin(th)*330}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  DN.stars=new THREE.Points(g,new THREE.PointsMaterial({color:0xffffff,size:1.8,sizeAttenuation:false,transparent:true,fog:false,depthWrite:false}));
  DN.group.add(DN.stars);
  DN.torch=new THREE.PointLight(0xffc27a,0,28,1.2);DN.torch.position.set(0.2,-0.2,-0.6);camera.add(DN.torch);
}
function updateDayNight(dt){
  if(!DN.group)return;
  DN.t=(DN.t+dt/DN.len)%1;DN.days+=dt/DN.len;
  const a=DN.t*6.2832,elev=-Math.cos(a),dayF=smooth(-0.12,0.22,elev);DN.dayF=dayF;DN.elev=elev;
  _dnv.set(Math.sin(a)*0.9,elev,0.35).normalize();
  const dusk=Math.exp(-Math.pow(elev/0.2,2));
  let sky=mixc(0x070b1c,0x8fc4f2,dayF);sky=mixc(sky,0xe9824a,dusk*0.6);
  scene.background.setHex(sky);scene.fog.color.setHex(sky);scene.fog.near=lerp(45,75,dayF);scene.fog.far=lerp(150,200,dayF);
  if(elev>=0){sun.position.copy(_dnv);sun.color.setHex(mixc(0xffa860,0xfff3d8,smooth(0,0.5,elev)));sun.intensity=0.58*smooth(-0.05,0.25,elev)}
  else{sun.position.set(-_dnv.x,-_dnv.y,-_dnv.z);sun.color.setHex(0x7a9aff);sun.intensity=0.22*smooth(0,0.25,-elev)}
  hemi.intensity=0.24+0.34*dayF;hemi.color.setHex(mixc(0x2a3a6a,0xcfe6ff,dayF));
  DN.group.position.copy(camera.position);
  DN.sunM.position.copy(_dnv).multiplyScalar(320);DN.moonM.position.copy(_dnv).multiplyScalar(-320);
  DN.sunM.lookAt(camera.position);DN.moonM.lookAt(camera.position);
  DN.sunM.material.color.setHex(mixc(0xff8a40,0xfff0a0,smooth(0,0.5,elev)));
  DN.sunM.visible=elev>-0.12;DN.moonM.visible=elev<0.12;
  DN.stars.material.opacity=clamp(1-dayF*1.5,0,1);
  DN.torch.intensity=1.2*(1-dayF);
  const cc=mixc(mixc(0x232a3c,0xffffff,dayF),0xffb890,dusk*0.4);
  for(const cl of clouds)for(const ch of cl.children)ch.material.color.setHex(cc);
  const hh=Math.floor(DN.t*24),mm=Math.floor((DN.t*24-hh)*60);
  $('clock').textContent=(elev>0?'☀ ':'☾ ')+String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');
}
