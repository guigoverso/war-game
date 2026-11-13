'use strict';
// ---------- Pesca (Fase 2) ----------
// A vara é uma "arma" da barra 1–6 (comprada na Loja). Equipada, o botão direito mirando um CARDUME lança a linha. Espere a mordida
// (aviso na tela) e clique a tempo com o botão direito; depois segure o botão direito para puxar e mantenha a tensão fora do
// vermelho até o progresso encher. Só se pesca em cardumes (peixes nadando em círculo); ao pescar, o cardume some e volta depois.
const FISH={state:'idle',t:0,bx:0,bz:0,sx:0,sz:0,fish:null,spot:null,waitT:0,biteT:0,prog:0,tens:0,pull:0,pullT:0,timeT:0,hold:false,click:false,kind:'fresh',bob:null,line:null};
const SPOTS=[];
const SPOT_COUNT=42,SPOT_RESPAWN_DAYS=2;

function fishSound(kind){
  if(!AC||!master)return;
  if(kind==='splash'){nzs(0.25,0.3,900,null,'lowpass');tn(300,0.12,'sine',0.12,150)}
  else if(kind==='bite'){tn(1200,0.08,'triangle',0.2,900);setTimeout(()=>AC&&tn(1500,0.1,'triangle',0.2,1100),90)}
  else if(kind==='catch'){tn(660,0.12,'triangle',0.18,900);setTimeout(()=>AC&&tn(990,0.2,'triangle',0.18,1200),110)}
  else if(kind==='snap'){nzs(0.12,0.3,3000,null,'highpass')}
}
// água grande (mar) ou pequena (rio/lago): conta a água ao redor do ponto
function waterKind(x,z){
  let w=0,n=0;
  for(let dz=-9;dz<=9;dz+=3)for(let dx=-9;dx<=9;dx+=3){const xx=Math.floor(x+dx),zz=Math.floor(z+dz);if(xx<0||zz<0||xx>=W||zz>=W)continue;n++;if(H[zz*W+xx]<SEA)w++}
  return n&&w/n>0.6?'sea':'fresh';
}
function rollFish(kind,biome){
  const night=DN.dayF<0.4,list=[];let tot=0;
  for(const f of Object.values(DATA.fish)){
    if(f.water!=='any'&&f.water!==kind)continue;
    let w=f.w;if(night&&f.night)w*=f.night;if(f.biomes&&f.biomes[biome])w*=f.biomes[biome];
    list.push([f,w]);tot+=w;
  }
  let r=Math.random()*tot;for(const [f,w] of list){r-=w;if(r<=0)return f}
  return list[0][0];
}

// ---------- cardumes (pontos de pesca) ----------
function makeSpot(id,x,z){
  const g=new THREE.Group();g.position.set(x,SEA+0.03,z);
  const ring=new THREE.Mesh(new THREE.RingGeometry(1.25,1.5,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.5,side:THREE.DoubleSide,depthWrite:false}));
  ring.rotation.x=-Math.PI/2;g.add(ring);
  const fish=[],cols=[0xc8d4e0,0x7a9ac0,0xd8c88a];
  for(let k=0;k<5;k++){
    const f=new THREE.Group(),c=cols[k%3];
    const body=new THREE.Mesh(GEO_BOX,mat(c));body.scale.set(0.36,0.13,0.15);f.add(body);
    const tail=new THREE.Mesh(GEO_BOX,mat(shadec(c,0.8)));tail.scale.set(0.1,0.18,0.04);tail.position.set(-0.23,0,0);f.add(tail);
    const fin=new THREE.Mesh(GEO_BOX,mat(shadec(c,0.7)));fin.scale.set(0.12,0.06,0.03);fin.position.set(0,0.09,0);f.add(fin);
    f.userData={a:k/5*Math.PI*2,r:0.65+(k%3)*0.22,sp:1.1+(k%2)*0.5,dy:-0.05-(k%2)*0.06};
    g.add(f);fish.push(f);
  }
  scene.add(g);
  return{id,x,z,kind:waterKind(x,z),group:g,ring,fish,gone:false};
}
// gera os cardumes perto das margens (sempre os mesmos para a mesma semente)
function genFishSpots(){
  for(const s of SPOTS){scene.remove(s.group)}SPOTS.length=0;
  const rng=new RNG((WORLD.seed*131+7)>>>0);let tries=0;
  while(SPOTS.length<SPOT_COUNT&&tries++<8000){
    const x=rng.int(12,W-12),z=rng.int(12,W-12);
    if(H[z*W+x]>=SEA-1)continue;   // precisa de água com alguma profundidade
    let land=false;
    for(let k=0;k<16&&!land;k++){const a=k*0.3927;for(const r of[5,8,11]){const xx=Math.floor(x+Math.cos(a)*r),zz=Math.floor(z+Math.sin(a)*r);if(xx>0&&zz>0&&xx<W&&zz<W&&H[zz*W+xx]>=SEA+0.5){land=true;break}}}
    if(!land)continue;
    if(SPOTS.some(s=>Math.hypot(s.x-x,s.z-z)<24))continue;
    SPOTS.push(makeSpot(SPOTS.length,x+0.5,z+0.5));
  }
  applyFishGone();
}
function applyFishGone(){
  for(const s of SPOTS){s.gone=STATE.fishGone&&STATE.fishGone[s.id]!==undefined;s.group.visible=!s.gone}
}
function updateSpots(dt){
  for(const s of SPOTS){
    if(s.gone){
      const day=STATE.fishGone[s.id];
      if(day!==undefined&&DN.days-day>=SPOT_RESPAWN_DAYS){delete STATE.fishGone[s.id];s.gone=false}
      s.group.visible=false;continue;
    }
    const d=Math.hypot(s.x-P.x,s.z-P.z);
    s.group.visible=d<110;if(d>=70)continue;
    for(const f of s.fish){
      const u=f.userData;u.a+=u.sp*dt;
      f.position.set(Math.cos(u.a)*u.r,u.dy,Math.sin(u.a)*u.r);f.rotation.y=-u.a-Math.PI/2;
    }
    s.ring.scale.setScalar(1+0.12*Math.sin(G.t*2.2+s.id));
  }
}
// cardume à frente do jogador (3 a 15 m, dentro de uns 35° da direção do olhar); null se não houver
function findFishSpot(){
  if(P.y<SEA-0.3)return null;
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);let best=null,bd=1e9;
  for(const s of SPOTS){
    if(s.gone)continue;
    const dx=s.x-P.x,dz=s.z-P.z,d=Math.hypot(dx,dz);
    if(d<3||d>15)continue;
    if((dx*fx+dz*fz)/d<0.82)continue;
    if(d<bd){bd=d;best=s}
  }
  return best;
}

// ---------- estados da pesca ----------
function fishHud(html){const el=document.getElementById('fishhud');if(!el)return;if(html===null||html===undefined){el.style.display='none';return}el.style.display='block';el.firstElementChild.innerHTML=html}
function fishBars(on){const b=document.getElementById('fishbars');if(b)b.style.display=on?'block':'none'}
function fishClean(){
  if(FISH.bob){scene.remove(FISH.bob);FISH.bob=null}
  if(FISH.line){scene.remove(FISH.line);FISH.line.geometry.dispose();FISH.line=null}
  FISH.state='idle';FISH.fish=null;FISH.spot=null;FISH.click=false;FISH.hold=false;WS.rodSwing=0;fishHud(null);fishBars(false);
}
function fishCancel(msg){if(msg)toast(msg,1800);fishClean()}
// botão direito: lança a linha (parado) ou recolhe (esperando)
function fishRight(down){
  if(!down)return;
  if(!WS.rod||P.dead||G.panel||G.frozen)return;
  if(FISH.state==='idle'){startCast();return}
  if(FISH.state==='wait')fishCancel('Você recolheu a linha.');
}
// botão esquerdo: minigame (fisgar quando morder; segurar para puxar)
function fishLeft(down){
  if(!down){FISH.hold=false;return}
  if(!WS.rod||P.dead||G.panel||G.frozen)return;
  if(FISH.state==='bite'){FISH.click=true;FISH.hold=true;return}
  if(FISH.state==='reel')FISH.hold=true;
}
function startCast(){
  const sp=findFishSpot();
  if(!sp){toast('Mire em um cardume: peixes nadando em círculo na água, a poucos passos.',2800);return}
  FISH.spot=sp;FISH.state='cast';FISH.t=0;FISH.bx=sp.x;FISH.bz=sp.z;FISH.sx=P.x;FISH.sz=P.z;FISH.kind=sp.kind;
  FISH.bob=new THREE.Group();
  const bb=new THREE.Mesh(GEO_BOX,mat(0xe03a3a));bb.scale.set(0.16,0.14,0.16);FISH.bob.add(bb);
  const bw=new THREE.Mesh(GEO_BOX,mat(0xffffff));bw.scale.set(0.16,0.09,0.16);bw.position.y=0.1;FISH.bob.add(bw);
  scene.add(FISH.bob);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  FISH.line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffffff}));FISH.line.frustumCulled=false;scene.add(FISH.line);
  fishSound('splash');fishHud('🎣 Lançando a linha...');
}
const _tip=new THREE.Vector3();
function rodTipWorld(){
  const rv=WS.vm[WEAPONS.length];
  if(rv&&WS.rodTip){rv.updateWorldMatrix(true,false);_tip.copy(WS.rodTip);rv.localToWorld(_tip);return _tip}
  _tip.set(P.x,P.y+1.4,P.z);return _tip;
}

function updateFishing(dt){
  updateSpots(dt);
  if(FISH.state==='idle')return;
  if(P.dead||G.panel||!WS.rod||Math.hypot(P.x-FISH.sx,P.z-FISH.sz)>3.5){fishCancel(P.dead||!WS.rod?'':'Você se afastou e a linha foi recolhida.');return}
  const tip=rodTipWorld(),hx=tip.x,hy=tip.y,hz=tip.z;
  let by=SEA+0.06,bx=FISH.bx,bz=FISH.bz;
  FISH.t+=dt;
  if(FISH.state==='cast'){
    const k=Math.min(1,FISH.t/0.7);bx=hx+(FISH.bx-hx)*k;bz=hz+(FISH.bz-hz)*k;by=hy+(SEA+0.06-hy)*k+Math.sin(k*Math.PI)*1.8;
    WS.rodSwing=0.7*Math.sin(Math.min(1,FISH.t/0.5)*Math.PI);   // a vara balança para a frente ao lançar
    if(k>=1){FISH.state='wait';FISH.t=0;FISH.waitT=2+Math.random()*5.5;fishSound('splash');fishHud('🎣 Esperando o peixe morder... (botão direito recolhe a linha)')}
  }else if(FISH.state==='wait'){
    by+=Math.sin(FISH.t*2.2)*0.025;FISH.waitT-=dt;WS.rodSwing=0;
    if(FISH.waitT<=0){FISH.state='bite';FISH.t=0;FISH.biteT=1.3;FISH.click=false;fishSound('bite');fishHud('❗ <b>O peixe mordeu! Botão esquerdo!</b>')}
  }else if(FISH.state==='bite'){
    by-=0.12+Math.sin(FISH.t*30)*0.03;FISH.biteT-=dt;WS.rodSwing=0.12*Math.sin(FISH.t*40);
    if(FISH.click){
      FISH.click=false;FISH.fish=rollFish(FISH.kind,B[Math.floor(P.z)*W+Math.floor(P.x)]);
      FISH.state='reel';FISH.prog=25;FISH.tens=0.35;FISH.pull=0;FISH.pullT=0.4;FISH.timeT=0;
      fishHud('🎣 Segure o botão esquerdo para puxar. Não deixe a tensão estourar!');fishBars(true);
    }else if(FISH.biteT<=0){toast('O peixe escapou. Tente de novo.',1800);fishClean();return}
  }else if(FISH.state==='reel'){
    const f=FISH.fish,fight=f.fight;FISH.timeT+=dt;
    FISH.pullT-=dt;if(FISH.pullT<=0){FISH.pull=Math.random()<0.55?(0.4+Math.random()*0.9)*fight:0;FISH.pullT=0.5+Math.random()*1.1}
    if(FISH.hold){FISH.prog+=17*dt/(0.6+0.4*fight);FISH.tens+=(0.62+0.5*FISH.pull)*dt}
    else{FISH.tens-=0.55*dt;FISH.prog-=(4+5*fight)*dt+FISH.pull*3*dt}
    FISH.tens=Math.max(0,FISH.tens);by+=Math.sin(FISH.t*14)*0.03;bx+=Math.sin(FISH.t*3)*0.3;
    WS.rodSwing=(FISH.hold?-0.25:0.0)+0.06*Math.sin(FISH.t*18)*FISH.tens;   // puxando, a vara entorta para trás e vibra com a tensão
    const pf=document.getElementById('fishprog'),tf=document.getElementById('fishten');
    if(pf)pf.style.width=clamp(FISH.prog,0,100)+'%';
    if(tf){tf.style.width=clamp(FISH.tens*100,0,100)+'%';tf.style.background=FISH.tens>0.8?'#e03a3a':FISH.tens>0.55?'#e0c03a':'#4ac05a'}
    if(FISH.tens>=1){fishSound('snap');toast('💥 A linha arrebentou! O peixe fugiu.',2200);fishClean();return}
    if(FISH.prog<=0){toast('O peixe escapou.',1800);fishClean();return}
    if(FISH.timeT>35){toast('O peixe se soltou.',1800);fishClean();return}
    if(FISH.prog>=100){
      const it=itemDef(f.item),sp=FISH.spot;invGive([[f.item,1]]);fishSound('catch');
      toast('🎣 Você pescou: '+it.icon+' '+it.name+'!  O cardume se dispersou.',3200);
      if(sp){sp.gone=true;sp.group.visible=false;STATE.fishGone[sp.id]=DN.days}   // depois de pescar, o cardume some (volta depois de uns dias)
      fishClean();return;
    }
  }
  if(FISH.bob)FISH.bob.position.set(bx,by,bz);
  if(FISH.line){const p=FISH.line.geometry.attributes.position;p.setXYZ(0,hx,hy,hz);p.setXYZ(1,bx,by,bz);p.needsUpdate=true}
}
