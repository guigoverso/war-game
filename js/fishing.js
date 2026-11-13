'use strict';
// ---------- Pesca (Fase 2) ----------
// T de frente para a água lança a linha. Espere a mordida (aviso na tela) e clique a tempo. Depois, segure o botão esquerdo
// para puxar: mantenha a tensão fora do vermelho até a barra de progresso encher. A vara é um item que todo jogador tem.
const FISH={state:'idle',t:0,bx:0,bz:0,sx:0,sz:0,fish:null,waitT:0,biteT:0,prog:0,tens:0,pull:0,pullT:0,timeT:0,hold:false,click:false,kind:'fresh',bob:null,line:null};

function fishSound(kind){
  if(!AC||!master)return;
  if(kind==='splash'){nzs(0.25,0.3,900,null,'lowpass');tn(300,0.12,'sine',0.12,150)}
  else if(kind==='bite'){tn(1200,0.08,'triangle',0.2,900);setTimeout(()=>AC&&tn(1500,0.1,'triangle',0.2,1100),90)}
  else if(kind==='catch'){tn(660,0.12,'triangle',0.18,900);setTimeout(()=>AC&&tn(990,0.2,'triangle',0.18,1200),110)}
  else if(kind==='snap'){nzs(0.12,0.3,3000,null,'highpass')}
}
// ponto de água à frente do jogador (3 a 10 m); null se não houver
function findWaterSpot(){
  if(P.y<SEA-0.3)return null;
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  for(let d=3;d<=10;d+=0.5){
    const x=P.x+fx*d,z=P.z+fz*d;
    if(x<2||z<2||x>W-2||z>W-2)return null;
    if(tH(x,z)<SEA-0.25)return{x,z};
  }
  return null;
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

function fishHud(html){const el=document.getElementById('fishhud');if(!el)return;if(html===null||html===undefined){el.style.display='none';return}el.style.display='block';el.firstElementChild.innerHTML=html}
function fishBars(on){const b=document.getElementById('fishbars');if(b)b.style.display=on?'block':'none'}
function fishClean(){
  if(FISH.bob){scene.remove(FISH.bob);FISH.bob=null}
  if(FISH.line){scene.remove(FISH.line);FISH.line.geometry.dispose();FISH.line=null}
  FISH.state='idle';FISH.fish=null;FISH.click=false;FISH.hold=false;fishHud(null);fishBars(false);
}
function fishCancel(msg){if(msg)toast(msg,1800);fishClean()}
function fishKey(){
  if(FISH.state!=='idle'){fishCancel('Você recolheu a linha.');return}
  if(P.dead||G.panel||G.frozen)return;
  if(invCount('vara')<=0){toast('Você não tem a vara de pescar.',2000);return}
  const w=findWaterSpot();
  if(!w){toast('Fique de frente para a água (rio, lago ou mar), a poucos passos, para pescar.',2800);return}
  FISH.state='cast';FISH.t=0;FISH.bx=w.x;FISH.bz=w.z;FISH.sx=P.x;FISH.sz=P.z;FISH.kind=waterKind(w.x,w.z);
  FISH.bob=new THREE.Mesh(GEO_BOX,mat(0xe03a3a));FISH.bob.scale.set(0.16,0.16,0.16);scene.add(FISH.bob);
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));
  FISH.line=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xffffff}));FISH.line.frustumCulled=false;scene.add(FISH.line);
  fishSound('splash');fishHud('🎣 Lançando a linha...');
}
window.addEventListener('mousedown',e=>{if(e.button===0&&FISH.state!=='idle'&&G.locked){FISH.click=true;FISH.hold=true}});
window.addEventListener('mouseup',e=>{if(e.button===0)FISH.hold=false});

function updateFishing(dt){
  if(FISH.state==='idle')return;
  if(P.dead||G.panel||Math.hypot(P.x-FISH.sx,P.z-FISH.sz)>3.5){fishCancel(P.dead?'':'Você se afastou e a linha foi recolhida.');return}
  const fx=-Math.sin(P.yaw),fz=-Math.cos(P.yaw);
  const hx=P.x+fx*0.5+Math.cos(P.yaw)*0.25,hy=P.y+1.25,hz=P.z+fz*0.5-Math.sin(P.yaw)*0.25;   // ponta da vara
  let by=SEA+0.06,bx=FISH.bx,bz=FISH.bz;
  FISH.t+=dt;
  if(FISH.state==='cast'){
    const k=Math.min(1,FISH.t/0.7);bx=hx+(FISH.bx-hx)*k;bz=hz+(FISH.bz-hz)*k;by=hy+(SEA+0.06-hy)*k+Math.sin(k*Math.PI)*1.8;
    if(k>=1){FISH.state='wait';FISH.t=0;FISH.waitT=2+Math.random()*5.5;fishSound('splash');fishHud('🎣 Esperando o peixe morder... (T recolhe)')}
  }else if(FISH.state==='wait'){
    by+=Math.sin(FISH.t*2.2)*0.025;FISH.waitT-=dt;
    if(FISH.waitT<=0){FISH.state='bite';FISH.t=0;FISH.biteT=1.3;FISH.click=false;fishSound('bite');fishHud('❗ <b>O peixe mordeu! Clique!</b>')}
  }else if(FISH.state==='bite'){
    by-=0.12+Math.sin(FISH.t*30)*0.03;FISH.biteT-=dt;
    if(FISH.click){
      FISH.click=false;FISH.fish=rollFish(FISH.kind,B[Math.floor(P.z)*W+Math.floor(P.x)]);
      FISH.state='reel';FISH.prog=25;FISH.tens=0.35;FISH.pull=0;FISH.pullT=0.4;FISH.timeT=0;
      fishHud('🎣 Segure o botão esquerdo para puxar. Não deixe a tensão estourar!');fishBars(true);
    }else if(FISH.biteT<=0){toast('O peixe escapou. Tente de novo (T).',1800);fishClean();return}
  }else if(FISH.state==='reel'){
    const f=FISH.fish,fight=f.fight;FISH.timeT+=dt;
    FISH.pullT-=dt;if(FISH.pullT<=0){FISH.pull=Math.random()<0.55?(0.4+Math.random()*0.9)*fight:0;FISH.pullT=0.5+Math.random()*1.1}
    if(FISH.hold){FISH.prog+=17*dt/(0.6+0.4*fight);FISH.tens+=(0.62+0.5*FISH.pull)*dt}
    else{FISH.tens-=0.55*dt;FISH.prog-=(4+5*fight)*dt+FISH.pull*3*dt}
    FISH.tens=Math.max(0,FISH.tens);by+=Math.sin(FISH.t*14)*0.03;bx+=Math.sin(FISH.t*3)*0.3;
    const pf=document.getElementById('fishprog'),tf=document.getElementById('fishten');
    if(pf)pf.style.width=clamp(FISH.prog,0,100)+'%';
    if(tf){tf.style.width=clamp(FISH.tens*100,0,100)+'%';tf.style.background=FISH.tens>0.8?'#e03a3a':FISH.tens>0.55?'#e0c03a':'#4ac05a'}
    if(FISH.tens>=1){fishSound('snap');toast('💥 A linha arrebentou! O peixe fugiu.',2200);fishClean();return}
    if(FISH.prog<=0){toast('O peixe escapou.',1800);fishClean();return}
    if(FISH.timeT>35){toast('O peixe se soltou.',1800);fishClean();return}
    if(FISH.prog>=100){
      const it=itemDef(f.item);invGive([[f.item,1]]);fishSound('catch');
      toast('🎣 Você pescou: '+it.icon+' '+it.name+'!',3000);fishClean();return;
    }
  }
  if(FISH.bob)FISH.bob.position.set(bx,by,bz);
  if(FISH.line){const p=FISH.line.geometry.attributes.position;p.setXYZ(0,hx,hy,hz);p.setXYZ(1,bx,by,bz);p.needsUpdate=true}
}
