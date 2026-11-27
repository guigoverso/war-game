'use strict';
// ---------- F5b: reuniões das facções (a cada 5 rodadas) ----------
// Desenho em docs/fase-5-reunioes.md. Um cartão de política com UMA opção ("Ir para a reunião") leva o jogador a uma sala com mesa redonda (região do
// escritório, mundo de baixo). Fluxo: (1) livro do canto: escolhe o tema entre 3 propostas sorteadas • (2) fala com os líderes (em pé, andando) e negocia
// votos • (3) senta na própria cadeira: os líderes sentam e abre a votação • o jogador aprova ou reprova; efeitos em meetfx.js • volta à sala do líder.
// Estado: STATE.meet = {last, eff, models, draw, theme, bought}. Os líderes são diversos e o visual de cada um fica salvo em models.
const MEET={every:5,price:600,speed:1.15};
Hooks.on('resetState',()=>{STATE.meet={last:0,eff:null,models:{},draw:null,theme:null,bought:{}}});
const meetS=()=>STATE.meet||(STATE.meet={last:0,eff:null,models:{},draw:null,theme:null,bought:{}});
const meetFacs=()=>(WORLD.factions||[]).filter(f=>facCities(f.id).length);   // facções que ainda existem (as extintas não votam; as novas votam)
const meetWeight=f=>Math.max(1,f===0?playerCities().length:facCities(f).length);   // o voto pesa o número de cidades
const meetDue=()=>(STATE.round>=MEET.every&&STATE.round%MEET.every===0||meetS().force===STATE.round)&&meetS().last<STATE.round&&meetFacs().length>0;   // force: modo criativo (Invocar evento)
const meetPending=()=>meetDue()&&STATE.phase==='leader'&&!(G.office&&G.office.meet);   // o turno do líder só acaba depois da reunião
function meetCard(){return{pid:'reuniao',city:-1,round:STATE.round,data:{}}}
definePolicy({id:'reuniao',name:'Reunião das facções',city:false,noRoll:true,flex:true,cool:0,cond:()=>meetDue(),fixCond:()=>{meetS().force=STATE.round;meetS().last=-1;return 'reunião forçada nesta rodada'},
  text:()=>'Os líderes das facções se reúnem a cada '+MEET.every+' rodadas para votar uma proposta que vale para todos. Você escolhe o tema, negocia votos e vota.',
  options:[{k:'A',label:'Ir para a reunião',type:'neutral',eff:()=>'Você é levado a uma sala com uma mesa redonda. Só volta ao escritório depois da votação, e o turno do líder só termina depois dela.',apply:()=>{setTimeout(meetEnter,0)}}]});

// ---------- a sala (estática, no mundo de baixo, ao lado do escritório) ----------
const MH={ok:false,ox:0,oz:0,Wd:32,Dp:19,H:5.2,Y:0,cx:0,cz:0,R:3.3,seatR:4.9,ringR:7.4,desk:null,spawn:null,bookT:null};
function genMeetHall(){
  MH.ok=false;if(!DG.ok)return;
  const Wd=MH.Wd,Dp=MH.Dp,H=MH.H,ox=DG.rx+58,oz=DG.rz+75,Y=DG.Y;
  Object.assign(MH,{ox,oz,Y,cx:Wd/2,cz:Dp/2});   // cx,cz: centro LOCAL da sala (mundo = ox+cx, oz+cz)
  const ob=(a,b,c,d,e,f,col,solid,o)=>Bx(ox+a,Y+b,oz+c,ox+d,Y+e,oz+f,col,!!solid,o);
  const PL=0xeadfc4,WD=0x8a6a44,DK=0x4a3420,TOP=0x9a6a3a,GOLD=0xe0b030;
  const cx=Wd/2,cz=Dp/2;
  for(let z=0;z<Dp;z++)for(let x=0;x<Wd;x+=4)ob(x,0,z,x+4,0.05,z+1,shadec(0x9a7a52,0.88+0.18*hash2(x,z,51)),false,{j:0.03});   // piso de tábuas claras
  ob(-1,0,-1,Wd+1,H,0,PL,true);ob(0,0,0,Wd,1.2,0.1,WD,false);                       // paredes e rodapé
  const g0=Wd/2-1.2,g1=Wd/2+1.2;
  ob(-1,0,Dp,g0,H,Dp+1,PL,true);ob(g1,0,Dp,Wd+1,H,Dp+1,PL,true);ob(g0,2.7,Dp,g1,H,Dp+1,PL,true);ob(g0,0,Dp+0.3,g1,2.7,Dp+0.7,0x7a5a3c,true);ob(g1-0.45,1.2,Dp-0.05,g1-0.25,1.4,Dp+0.3,GOLD,false);   // sul, com a porta fechada
  ob(-1,0,0,0,H,Dp,PL,true);ob(Wd,0,0,Wd+1,H,Dp,PL,true);
  ob(-1,H,-1,Wd+1,H+0.5,Dp+1,0x9a7a52,true,{b:true});for(let x=2;x<Wd;x+=5)ob(x,H-0.35,0,x+0.4,H,Dp,0x6a4a2a,false,{b:true});   // teto claro com vigas
  // tapetes: redondo sob a mesa (vinho com anéis dourados) e passadeira azul da porta até a mesa
  for(let dz=-6.5;dz<6.5;dz+=0.5){const h=Math.sqrt(Math.max(0,42.25-(dz+0.25)*(dz+0.25)));ob(cx-h,0.05,cz+dz,cx+h,0.09,cz+dz+0.5,0x8a3040,false,{j:0})}
  for(let dz=-5.2;dz<5.2;dz+=0.5){const h=Math.sqrt(Math.max(0,27-(dz+0.25)*(dz+0.25))),h2=Math.sqrt(Math.max(0,22.5-(dz+0.25)*(dz+0.25)));ob(cx-h,0.09,cz+dz,cx+h,0.11,cz+dz+0.5,GOLD,false,{j:0});ob(cx-h2,0.11,cz+dz,cx+h2,0.13,cz+dz+0.5,0xa84a5a,false,{j:0})}
  ob(cx-1.5,0.05,cz+6.4,cx+1.5,0.1,Dp,0x2a5a8a,false,{j:0});ob(cx-1.5,0.1,cz+6.4,cx-1.3,0.12,Dp,GOLD,false,{j:0});ob(cx+1.3,0.1,cz+6.4,cx+1.5,0.12,Dp,GOLD,false,{j:0});
  // mesa redonda BAIXA (tampo a 0,8 m: sentado se vê por cima dela), pé central; a colisão é mais alta para não dar para subir nela
  for(let dz=-MH.R;dz<MH.R;dz+=0.5){const h=Math.sqrt(Math.max(0,MH.R*MH.R-(dz+0.25)*(dz+0.25)));ob(cx-h,0.7,cz+dz,cx+h,0.82,cz+dz+0.5,TOP,false,{j:0.02});ob(cx-h+0.1,0.64,cz+dz,cx+h-0.1,0.7,cz+dz+0.5,DK,false,{j:0})}
  ob(cx-0.8,0,cz-0.8,cx+0.8,0.7,cz+0.8,DK,false);ob(cx-1.3,0,cz-1.3,cx+1.3,0.12,cz+1.3,DK,false);
  Col.add({x0:ox+cx-MH.R,y0:Y,z0:oz+cz-MH.R,x1:ox+cx+MH.R,y1:Y+1.3,z1:oz+cz+MH.R});
  // candelabro sobre a mesa: argola dourada pendurada do teto com velas
  ob(cx-0.08,H-1.7,cz-0.08,cx+0.08,H,cz+0.08,DK,false);
  for(const [a,b,c2,d] of[[-1.4,-1.4,1.4,-1.3],[-1.4,1.3,1.4,1.4],[-1.4,-1.4,-1.3,1.4],[1.3,-1.4,1.4,1.4]])ob(cx+a,H-1.8,cz+b,cx+c2,H-1.7,cz+d,GOLD,false,{j:0});
  for(const [a,b] of[[-1.35,-1.35],[1.25,-1.35],[-1.35,1.25],[1.25,1.25],[-0.05,-1.35],[-0.05,1.25],[-1.35,-0.05],[1.25,-0.05]]){ob(cx+a,H-1.7,cz+b,cx+a+0.1,H-1.4,cz+b+0.1,0xfff0c8,false,{j:0});ob(cx+a-0.01,H-1.4,cz+b-0.01,cx+a+0.11,H-1.25,cz+b+0.11,0xffb830,false,{j:0})}
  // mesa do canto (tema): leste/norte; o livro é dinâmico
  ob(Wd-7,0,1.2,Wd-2.2,1.0,3.6,TOP,true,{j:0.02});ob(Wd-7.05,0.95,1.15,Wd-2.15,1.05,3.65,0xb08048,false,{j:0});
  MH.desk={x:ox+Wd-4.6,z:oz+4.2,bx:ox+Wd-4.6,bz:oz+2.7};
  // janelas na parede norte, com cortinas vermelhas
  for(const wx of[4,12,20]){ob(wx-0.1,1.7,0.02,wx+3.1,3.9,0.12,DK,false,{j:0});ob(wx,1.8,0.1,wx+3,3.8,0.14,0xcfe8ff,false,{j:0});ob(wx-0.4,1.6,0.12,wx+0.3,4.1,0.26,0xa83a3a,false,{j:0.05});ob(wx+2.7,1.6,0.12,wx+3.4,4.1,0.26,0xa83a3a,false,{j:0.05})}
  // quadros na parede norte, nos vãos das janelas
  for(const [qx,col,col2] of[[8.3,0x3a7ab0,0x6ab04a],[16.2,0xc8883a,0x8a3a2a],[24.8,0x7a4a9a,0xe0c050],[28.2,0x3a8a6a,0xd0d0e0]]){ob(qx,1.9,0.12,qx+1.7,3.5,0.2,GOLD,false,{j:0});ob(qx+0.12,2.02,0.2,qx+1.58,3.38,0.24,col,false,{j:0});ob(qx+0.12,2.02,0.24,qx+1.58,2.6,0.27,col2,false,{j:0});ob(qx+0.6,2.6,0.24,qx+1.1,3.1,0.28,0xf0f0f0,false,{j:0})}
  // estantes de livros na parede sul, dos dois lados da porta
  for(const x0 of[1.2,Wd-11.2]){ob(x0,0,Dp-1.1,x0+10,3.3,Dp-0.1,DK,true,{j:0.02});
    for(let row=0;row<3;row++)for(let k=0;k<30;k++){const x=x0+0.2+k*0.32,h=0.45+0.12*hash2(k,row,x0),cc=[0xa02a2a,0x2a5aa0,0x2a8a4a,0xc8a020,0x6a2a8a,0xe0d8c0][Math.floor(hash2(k,row,x0+3)*6)];ob(x,0.4+row*1.0,Dp-1.1-0.12,x+0.26,0.4+row*1.0+h,Dp-1.0,cc,false,{j:0})}}
  // tochas e bandeiras nas paredes oeste e leste (as bandeiras das facções são dinâmicas) e plantas nos cantos
  for(const side of[0,1])for(const z of[2,Dp/2,Dp-2]){const x=side?Wd-0.4:0.4;ob(x-0.15,1.4,z-0.15,x+0.15,1.9,z+0.15,DK,false);ob(x-0.1,1.9,z-0.1,x+0.1,2.15,z+0.1,0xffb040,false,{j:0})}
  for(const [px,pz] of[[1.2,1.2],[Wd-1.2,Dp-1.5],[Wd-10,1.0],[11,Dp-1.5]]){ob(px-0.45,0,pz-0.45,px+0.45,0.7,pz+0.45,0xb0603a,false);for(const [dx,dy,dz,sz] of[[0,0.7,0,0.9],[-0.3,1.1,0.1,0.7],[0.3,1.2,-0.1,0.7],[0,1.6,0,0.6]])ob(px+dx-sz/2,dy,pz+dz-sz/2,px+dx+sz/2,dy+sz,pz+dz+sz/2,[0x3a8a3a,0x4aa04a,0x2a7a3a][Math.floor(hash2(px*3,pz,dy)*3)],false,{j:0.1})}
  MH.spawn={x:ox+cx-3,z:oz+Dp-2.6};MH.ok=true;
}
const mhPos=(x,z)=>({x:MH.ox+x,z:MH.oz+z});
const mhC=()=>({x:MH.cx,z:MH.cz});

// ---------- participantes: líderes e guardas ----------
const MEETA={g:null,leaders:[],guards:[],chairs:[],bookP:null,deskBook:null,seated:false,phase:'mingle',wins:{},result:null};
const meetParts=()=>[0].concat(meetFacs().map(f=>f.id));   // você (0) e cada facção viva
function meetSeat(i,n){const a=Math.PI/2+2*Math.PI*i/n;return{a,x:MH.cx+Math.cos(a)*MH.seatR,z:MH.cz+Math.sin(a)*MH.seatR}}
const SKIN_T=[0xf2c9a0,0xe0ac80,0xc68a5c,0x9a6a44,0x6e4a2e,0x4a3220],HAIR_T=[0x2a1a0e,0x5a3a1a,0xb0b0b0,0xd8c070,0x7a2a1a,0x111111],STY_T=['short','long','hat','turban','bandana','none','cap'];
const hexMul=(c,m)=>{const r=Math.min(255,Math.round((c>>16&255)*m)),g=Math.min(255,Math.round((c>>8&255)*m)),b=Math.min(255,Math.round((c&255)*m));return(r<<16)|(g<<8)|b};
function meetLook(fid){   // o visual do líder de cada facção é sorteado uma vez e salvo para as próximas reuniões
  const S=meetS();let m=S.models[fid];
  if(!m){const p=a=>a[Math.floor(Math.random()*a.length)];m=S.models[fid]={skin:p(SKIN_T),hair:p(HAIR_T),sty:p(STY_T),beard:Math.random()<0.4?p(HAIR_T):0,scale:+(0.94+Math.random()*0.18).toFixed(2),robe:Math.random()<0.45,pants:p([0x2a2a3a,0x3a2a1a,0x1a2a3a,0x2a3a2a]),hatM:+(0.7+Math.random()*0.5).toFixed(2)}}
  const col=facColor(fid)||0x888888;
  return{skin:m.skin,shirt:col,pants:m.pants,hair:m.hair,hairStyle:m.sty,hat:hexMul(col,m.hatM),beard:m.beard||undefined,robe:m.robe?hexMul(col,0.75):undefined,scale:m.scale};
}
function meetGuardLook(fid,k){const col=fid===0?(facColor(0)||0x2a4a9a):(facColor(fid)||0x888888);return{skin:SKIN_T[(fid*3+k)%SKIN_T.length],shirt:col,pants:0x2a2a3a,hairStyle:'helmet',hat:hexMul(col,1.25),gun:{len:0.75},scarf:0xe0e0e0}}
function meetBuild(){
  meetClear();
  const g=new THREE.Group(),A=MEETA,parts=meetParts(),n=parts.length,Y=MH.Y,box=(c,sx,sy,sz,px,py,pz,par)=>{const o=new THREE.Mesh(GEO_BOX,mat(c));o.scale.set(sx,sy,sz);o.position.set(px,py,pz);(par||g).add(o);return o};
  parts.forEach((fid,i)=>{
    const s=meetSeat(i,n),col=facColor(fid)||0x888888;
    // cadeira: assento, encosto e almofada na cor da facção, voltada para o centro
    const ch=new THREE.Group();ch.position.set(MH.ox+s.x,Y,MH.oz+s.z);ch.rotation.y=Math.atan2(MH.cx-s.x,MH.cz-s.z);
    box(0x7a5030,0.8,0.1,0.8,0,0.42,0,ch);box(col,0.64,0.1,0.64,0,0.5,0,ch);box(0x7a5030,0.8,0.9,0.1,0,0.9,-0.4,ch);box(col,0.6,0.55,0.07,0,0.95,-0.33,ch);box(0xe0b030,0.84,0.06,0.12,0,1.38,-0.4,ch);
    for(const dx of[-0.35,0.35])for(const dz of[-0.35,0.35])box(0x4a3018,0.08,0.42,0.08,dx,0.21,dz,ch);
    g.add(ch);A.chairs.push({fid,x:s.x,z:s.z,a:s.a});
    // bandeira da facção na parede lateral (alternando oeste e leste), nas cores dela
    {const wall=i%2,k=Math.floor(i/2),cnt=Math.ceil(n/2),zz=2.4+(MH.Dp-4.8)*(k+0.5)/cnt,bx=MH.ox+(wall?MH.Wd-0.22:0.22),bz=MH.oz+zz;
     box(0x4a3420,0.1,0.1,1.3,bx,MH.Y+4.4,bz);box(col,0.06,2.3,1.1,bx,MH.Y+3.2,bz);box(0xf0f0f0,0.07,0.25,1.1,bx,MH.Y+3.7,bz);box(hexMul(col,0.7),0.07,0.5,1.1,bx,MH.Y+2.3,bz)}
    const dirx=Math.cos(s.a),dirz=Math.sin(s.a);
    // guardas: encostados na parede da direção da cadeira (clamp na sala), dois por facção
    const t=Math.min((MH.Wd/2-1.5)/Math.max(0.01,Math.abs(dirx)),(MH.Dp/2-1.3)/Math.max(0.01,Math.abs(dirz)));
    for(let k=0;k<2;k++){
      const px=MH.cx+dirx*t+(-dirz)*(k?1.2:-1.2),pz=MH.cz+dirz*t+dirx*(k?1.2:-1.2),m=buildHuman(meetGuardLook(fid,k));
      m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;m.group.position.set(MH.ox+px,Y,MH.oz+pz);m.group.rotation.y=Math.atan2(MH.cx-px,MH.cz-pz);g.add(m.group);A.guards.push({m,fid});
    }
    if(fid!==0){
      const L={fid,m:buildHuman(meetLook(fid)),sa:s.a,seat:{x:s.x,z:s.z},ang:s.a+0.9+i*0.4,rad:MH.ringR,dir:i%2?1:-1,wait:Math.random()*2,run:0.4+Math.random()*0.5,mode:'mingle',phase:Math.random()*6,prev:'mingle',x:0,z:0,yaw:0};
      L.m.arms[1].rotation.x=-0.5;g.add(L.m.group);A.leaders.push(L);meetPlace(L);
    }
  });
  // livro do jogador sobre a mesa, na frente da cadeira dele, e livro do tema na mesa do canto
  const bk=(px,py,pz,ry)=>{const b=new THREE.Group();box(0x5a2a10,0.7,0.05,0.5,0,0,0,b);box(0xf2e8c8,0.32,0.06,0.44,-0.17,0.05,0,b);box(0xf2e8c8,0.32,0.06,0.44,0.17,0.05,0,b);b.position.set(px,py,pz);b.rotation.y=ry||0;g.add(b);return b};
  const s0=meetSeat(0,n);A.bookP={x:MH.ox+MH.cx+Math.cos(s0.a)*(MH.R-0.55),z:MH.oz+MH.cz+Math.sin(s0.a)*(MH.R-0.55)};bk(A.bookP.x,Y+0.88,A.bookP.z,0);   // na borda da mesa, bem na frente da sua cadeira
  A.deskBook=bk(MH.desk.bx,Y+1.1,MH.desk.bz,0);
  for(const [lx,lz] of[[8,5],[24,5],[8,14],[24,14],[16,9.5]]){const li=new THREE.PointLight(0xfff0d8,0.5,30);li.position.set(MH.ox+lx,Y+4.3,MH.oz+lz);g.add(li)}   // luz quente de teto (a sala é fechada)
  scene.add(g);A.g=g;A.seated=false;A.phase='mingle';A.result=null;
}
function meetClear(){const A=MEETA;if(A.g){scene.remove(A.g);A.g=null}A.leaders=[];A.guards=[];A.chairs=[];A.seated=false;for(const k in A.wins)if(A.wins[k].isOpen())A.wins[k].close()}
function meetPlace(L){
  const R=MH.ox,Z=MH.oz;L.x=R+MH.cx+Math.cos(L.ang)*L.rad;L.z=Z+MH.cz+Math.sin(L.ang)*L.rad;
  L.m.group.position.x=L.x;L.m.group.position.z=L.z;
}
const meetChair0=()=>MEETA.chairs[0];
// ---------- movimento dos líderes ----------
function updateLeaders(dt){
  const A=MEETA,Y=MH.Y;let allSat=A.leaders.length>0;
  for(const L of A.leaders){
    let moving=false;
    if(L.mode==='mingle'){
      if(L.wait>0)L.wait-=dt;
      else{L.ang+=L.dir*MEET.speed/L.rad*dt;L.run-=MEET.speed/L.rad*dt;moving=true;L.ty=Math.atan2(L.dir*-Math.sin(L.ang),L.dir*Math.cos(L.ang));if(L.run<=0){L.wait=1+Math.random()*3;L.run=0.3+Math.random()*0.6;if(Math.random()<0.3)L.dir*=-1}}
    }else if(L.mode==='talk'){L.ty=Math.atan2(P.x-L.x,P.z-L.z)}
    else if(L.mode==='toSeat'){
      let d=((L.sa-L.ang)%(Math.PI*2)+Math.PI*3)%(Math.PI*2)-Math.PI;
      if(Math.abs(d)>0.05){const st=Math.sign(d)*Math.min(Math.abs(d),1.6/L.rad*dt*1.4);L.ang+=st;moving=true;L.ty=Math.atan2(Math.sign(d)*-Math.sin(L.ang),Math.sign(d)*Math.cos(L.ang))}
      else if(L.rad>MH.seatR+0.04){L.ang=L.sa;L.rad=Math.max(MH.seatR,L.rad-1.5*dt);moving=true;L.ty=Math.atan2(-Math.cos(L.sa),-Math.sin(L.sa))}
      else{L.mode='sit';L.ang=L.sa;L.rad=MH.seatR}
    }
    if(L.mode==='sit'){L.ty=Math.atan2(-Math.cos(L.sa),-Math.sin(L.sa))}else allSat=false;
    meetPlace(L);
    if(L.ty===undefined)L.ty=L.yaw;
    L.yaw+=((L.ty-L.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*(L.mode==='talk'?5:9));   // vira devagar (ao falar, primeiro olha para você)
    L.m.group.rotation.y=L.yaw;
    if(L.pendingTalk){L.talkT+=dt;const dy=Math.abs(((L.ty-L.yaw+Math.PI*3)%(Math.PI*2))-Math.PI);if(dy<0.12||L.talkT>1.4)meetTalkUI(L)}   // só então abre o diálogo
    if(L.mode==='sit'){L.m.group.position.y=Y-0.4;L.m.legs.forEach(l=>l.rotation.x=-1.4);L.m.arms.forEach(a=>a.rotation.x=-0.9)}
    else{L.m.group.position.y=Y;if(moving){L.phase+=dt*8;animWalk(L.m,L.phase,0.6)}else L.m.legs.forEach(l=>l.rotation.x*=0.8)}
  }
  return allSat;
}
// ---------- pontuação do voto das NPC e preço do voto ----------
// score = compra (+10) + aliança (+2,5) + benefício/prejuízo da proposta (−2..+2) + relação com você ((v−5)/2,5). Vota a favor se score > 0.
function meetScore(f,pr,withBought){
  const rl=relOf(f),p=MPD[pr.id];
  return(withBought&&meetS().bought[f]?10:0)+(rl.ally?2.5:0)+p.benefit(f,pr.a)+(rl.v-5)/2.5;
}
const meetStance=(f,pr)=>{const s=meetScore(f,pr,true);return s>1?'fav':s<-1?'against':'undecided'};
const meetTheme=()=>{const S=meetS();return S.theme?S.draw.find(x=>x.id===S.theme):null};
function meetPrice(f,pr){
  const rl=relOf(f),st=meetStance(f,pr),ben=MPD[pr.id].benefit(f,pr.a);
  let m=Math.max(0.65,Math.min(1.35,1.35-0.07*rl.v));m*=st==='fav'?0.6:st==='against'?1.6:1;if(ben<0)m*=1+0.3*Math.abs(ben);
  return Math.max(50,Math.round(MEET.price*meetWeight(f)*m/10)*10);
}
const meetCanTalk=f=>{const s=relStatus(f);return s!=='enemy'&&s!=='war'};
// ---------- falas ----------
const MQ={
  hostile:['Você ousa se aproximar? Saia da minha frente.','Não tenho nada a tratar com você.'],
  cold:['Seja breve. Não tenho tempo a perder.','Hum. O que você quer?'],
  neutral:['Estou ouvindo. O que tem a propor?','Fale. Mas não prometo nada.'],
  friendly:['Bom ver você! Vamos conversar.','Ora, um amigo. Em que posso ajudar?'],
  warm:['Meu amigo! Conte comigo no que precisar.','É sempre uma honra falar com você.']};
const meetBand=v=>v<=1?'hostile':v<=3?'cold':v<=6?'neutral':v<=8?'friendly':'warm';
const MSTANCE={fav:'Estou inclinado a apoiar essa proposta.',undecided:'Ainda não decidi como vou votar.',against:'Sou contra essa proposta. Seria preciso muito para me convencer.'};
// ---------- janelas ----------
function meetWin(id,title,width,low){
  const A=MEETA;let w=A.wins[id];
  if(!w){w=A.wins[id]=UI.window({title:'',width:width||600,z:55});
    if(low){w.el.style.alignItems='flex-end';w.el.style.background='transparent';w.el.style.pointerEvents='none';const pn=w.el.firstChild;pn.style.pointerEvents='auto';pn.style.marginBottom='26px'}}
  w.setTitle(title);
  if(!w._fm){w._fm=1;const op=w.open;w.open=function(){const r=op.call(w);meetFreeMouse(w);return r}}   // a janela anterior pediu o mouse de volta: solta de novo para o cursor aparecer
  return w;
}
function meetFreeMouse(w){for(const ms of[60,200,500])setTimeout(()=>{if(w.isOpen()&&document.pointerLockElement)document.exitPointerLock()},ms)}
const meetFx=(side,pr)=>{const e=MPD[pr.id][side];return '<span style="color:#7fdc7f">▲ '+e.buff(pr.a)+'</span><br><span style="color:#ff9a8a">▼ '+e.debuff(pr.a)+'</span>'};
const meetPropHtml=pr=>'<b>'+meetName(pr)+'</b><div style="font-size:14px;margin-top:4px"><b>Se aprovada:</b><br>'+meetFx('ok',pr)+'<br><b>Se reprovada:</b><br>'+meetFx('no',pr)+'</div>';
function meetThemeUI(){   // livro do canto: escolhe o tema entre as 3 propostas sorteadas
  const S=meetS(),w=meetWin('theme','📖 Tema da votação',680);w.body.innerHTML='';w.foot.innerHTML='';
  if(S.theme){const pr=meetTheme();const d=document.createElement('div');d.className='card';d.style.margin='6px 0';d.innerHTML='Tema escolhido:<br>'+meetPropHtml(pr);w.body.appendChild(d)}
  else for(const pr of S.draw){
    const d=document.createElement('div');d.className='card';d.style.cssText='margin:6px 0;padding:8px 10px';d.innerHTML=meetPropHtml(pr);
    const b=UI.button('Escolher este tema','gold',()=>{S.theme=pr.id;w.close();meetHintNow()});b.style.marginTop='6px';d.appendChild(b);w.body.appendChild(d);
  }
  w.foot.appendChild(UI.button('Fechar','alt',()=>w.close()));w.open();
}
function meetTalkUI(L){
  const S=meetS(),f=L.fid,pr=meetTheme(),w=meetWin('talk','',640,true),name=facOf(f).name,rl=relOf(f);
  L.prev=L.mode==='talk'?L.prev:L.mode;L.mode='talk';L.pendingTalk=false;
  const q=MQ[meetBand(rl.v)];let h='<div style="font-size:18px;margin-bottom:4px">'+fgChipName(f)+'</div><p style="font-style:italic;font-size:17px;margin:4px 0">“'+q[Math.floor(f*7+STATE.round)%q.length]+'”</p>';
  h+='<p style="margin:4px 0">Representa <b>'+meetWeight(f)+'</b> voto'+(meetWeight(f)>1?'s':'')+' de '+meetTotalW()+'.</p>';
  if(pr)h+='<p style="margin:4px 0;color:#e8d8a8">“'+MSTANCE[meetStance(f,pr)]+'”</p>';else h+='<p style="margin:4px 0;color:#bbb">Escolha o tema no livro do canto para negociar.</p>';
  w.body.innerHTML=h;w.foot.innerHTML='';
  if(pr){
    if(rl.ally)w.body.insertAdjacentHTML('beforeend','<p style="color:#9ad0ff">“Somos aliados: não é necessário comprar o meu voto.”</p>');
    else if(!meetCanTalk(f))w.body.insertAdjacentHTML('beforeend','<p style="color:#ff9a8a">“Não negocio com inimigos.”</p>');
    else if(S.bought[f])w.body.insertAdjacentHTML('beforeend','<p style="color:#7fdc7f">“Estamos combinados.” (voto comprado)</p>');
    else{const price=meetPrice(f,pr),b=UI.button('💰 Comprar o voto — ◉'+price,'gold',()=>{if(!Ledger.spend({gold:price})){toast('Ouro insuficiente.',1800);return}S.bought[f]=true;sfx('coin',0);meetTalkUI(L)});b.disabled=P.coins<price;w.foot.appendChild(b)}
  }
  w.foot.appendChild(UI.button('Encerrar a conversa','alt',()=>w.close()));w.open();
}
const meetTotalW=()=>meetParts().reduce((s,f)=>s+meetWeight(f),0);
// ---------- votação ----------
function meetVoteUI(){
  const pr=meetTheme(),w=meetWin('vote','🗳 Votação',680);if(!pr||MEETA.result)return;
  w.body.innerHTML='<p>Peso do seu voto: <b>'+meetWeight(0)+'</b> de '+meetTotalW()+'. Para aprovar é preciso mais da metade dos votos; empate reprova.</p><div class="card" style="padding:8px 10px">'+meetPropHtml(pr)+'</div>';
  w.foot.innerHTML='';
  w.foot.append(UI.button('✅ Aprovar','gold',()=>meetDoVote(true)),UI.button('❌ Reprovar','red',()=>meetDoVote(false)));w.open();
}
function meetDoVote(yes){
  const S=meetS(),pr=meetTheme(),rows=[{fid:0,w:meetWeight(0),yes}];
  for(const f of meetFacs())rows.push({fid:f.id,w:meetWeight(f.id),yes:meetScore(f.id,pr,true)>0});
  const yw=rows.filter(r=>r.yes).reduce((s,r)=>s+r.w,0),tot=rows.reduce((s,r)=>s+r.w,0),ok=yw*2>tot;
  MEETA.result={rows,yw,tot,ok,pr};
  const w=MEETA.wins.vote;if(w)w.close();
  const r=meetWin('result','🗳 Resultado',680);
  r.body.innerHTML='<table style="width:100%;border-collapse:collapse">'+rows.map(x=>'<tr><td style="padding:3px 0">'+(x.fid===0?'<b>'+facOf(0).name+' (você)</b>':fgChipName(x.fid))+'</td><td>'+x.w+' voto'+(x.w>1?'s':'')+'</td><td style="text-align:right;color:'+(x.yes?'#7fdc7f':'#ff9a8a')+'">'+(x.yes?'A favor':'Contra')+'</td></tr>').join('')+'</table>'
    +'<p style="margin-top:8px"><b>'+yw+' de '+tot+' votos a favor: proposta '+(ok?'APROVADA':'REPROVADA')+'.</b></p><div class="card" style="padding:8px 10px;font-size:14px">'+(ok?'▲ '+MPD[pr.id].ok.buff(pr.a)+'<br>▼ '+MPD[pr.id].ok.debuff(pr.a):'▲ '+MPD[pr.id].no.buff(pr.a)+'<br>▼ '+MPD[pr.id].no.debuff(pr.a))+'</div>';
  r.foot.innerHTML='';r.foot.appendChild(UI.button('Continuar','gold',()=>{r.close();meetFinish()}));r.open();
}
function meetFinish(){
  const S=meetS(),R=MEETA.result;if(!R)return;
  // relações: quem votou como você sobe, quem votou contra desce (cai mais se a proposta o prejudica muito)
  const mine=R.rows[0].yes,yesFids=[];
  for(const x of R.rows){if(x.fid===0)continue;if(x.yes)yesFids.push(x.fid);let d=x.yes===mine?1:-1;if(mine&&MPD[R.pr.id].benefit(x.fid,R.pr.a)<=-1.5)d-=1;relChange(x.fid,d,'ela votou '+(x.yes===mine?'como você':'contra você')+' na reunião ('+meetName(R.pr)+')'+(d<-1?' e a proposta a prejudica muito':''),true)}
  meetApplyEffect(R.pr,R.ok?'ok':'no',yesFids);
  rdNow('🏛 Votação: '+R.yw+' de '+R.tot+' votos a favor. A favor: '+(R.rows.filter(x=>x.yes).map(x=>x.fid===0?'você':facChip(x.fid)).join(', ')||'ninguém')+'. Contra: '+(R.rows.filter(x=>!x.yes).map(x=>x.fid===0?'você':facChip(x.fid)).join(', ')||'ninguém')+'.');
  S.last=STATE.round;S.draw=null;S.theme=null;S.bought={};
  meetLeave();
}
// ---------- entrada e saída ----------
function meetEnter(){
  const S=meetS();
  if(!MH.ok||!OFFICE.ok){S.last=STATE.round;rdNow('🏛 Reunião: não foi possível montar a sala; nada foi votado.');return}
  if(!G.office)enterOffice(true);
  if(!G.office)return;
  S.draw=S.draw||meetDraw();S.theme=null;S.bought={};
  meetBuild();G.office.meet={};closePanel();
  P.x=MH.spawn.x;P.z=MH.spawn.z;P.y=MH.Y+0.05;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0;P.crouch=false;
  meetHintNow();
}
function meetLeave(){
  meetClear();if(G.office)G.office.meet=null;P.crouch=false;
  if(G.office&&OFFICE.spawn){P.x=OFFICE.spawn.x;P.z=OFFICE.spawn.z;P.y=OFFICE.Y+0.05;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0}
  const h=$('officehint');if(h){h.textContent='📖 Chegue perto da mesa e aperte E (ou clique) para abrir o livro';h.style.display='block'}
}
// ---------- interação ----------
const dxz=(x,z)=>Math.hypot(P.x-x,P.z-z);
function meetFocus(){
  const A=MEETA,S=meetS();if(A.seated)return null;let best=null;
  const cand=(d,lim,o)=>{if(d<lim&&(!best||d<best.d)){o.d=d;best=o}};
  cand(dxz(MH.desk.x,MH.desk.z),4.4,{t:'desk',txt:S.theme?'📖 [E] Rever o tema da votação':'📖 [E] Escolher o tema da votação (livro)'});
  for(const L of A.leaders)cand(dxz(L.x,L.z),3.2,{t:'leader',L,txt:'💬 [E] Falar com '+facOf(L.fid).name});
  const c0=meetChair0();if(c0)cand(dxz(c0.x+MH.ox,c0.z+MH.oz),2.6,{t:'chair',txt:S.theme?'🪑 [E] Sentar e iniciar a votação':'🪑 Escolha o tema antes (livro do canto)'});
  if(A.bookP)cand(dxz(A.bookP.x,A.bookP.z),3.6,{t:'book',txt:'📖 [E] Abrir o livro'});
  return best;
}
function meetHintNow(){const h=$('officehint'),f=meetFocus();if(h){h.style.display='block';h.textContent=f?f.txt:(MEETA.seated?'🪑 Aguarde: os líderes estão se sentando':'🏛 Escolha o tema no livro do canto, converse com os líderes e sente-se na sua cadeira')}}
function meetInteract(){
  const f=meetFocus();if(!f||G.panel)return;
  if(f.t==='desk')meetThemeUI();
  else if(f.t==='leader'){f.L.prev=f.L.mode==='talk'?f.L.prev:f.L.mode;f.L.mode='talk';f.L.pendingTalk=true;f.L.talkT=0}   // primeiro ele vira para você; o diálogo abre em updateLeaders
  else if(f.t==='book')openBook('book','resumo');
  else if(f.t==='chair'&&meetS().theme){   // senta: os líderes vão para as cadeiras; quando todos sentam, abre a votação
    const c=meetChair0();P.x=c.x+MH.ox;P.z=c.z+MH.oz;P.vx=P.vz=0;P.yaw=Math.atan2(-(MH.cx+MH.ox-P.x),-(MH.cz+MH.oz-P.z));P.pitch=0;P.crouch=false;
    MEETA.seated=true;MEETA.phase='seating';for(const L of MEETA.leaders){L.mode='toSeat'}
  }
}
function updateMeet(dt){
  const A=MEETA;if(!A.g)return;
  const allSat=updateLeaders(dt);
  for(const L of A.leaders)if(L.mode==='talk'&&!L.pendingTalk&&!(A.wins.talk&&A.wins.talk.isOpen()))L.mode=L.prev||'mingle';   // fechou a conversa: volta a andar
  if(A.phase==='seating'&&allSat)A.phase='vote';
  if(A.phase==='vote'&&!G.panel&&!A.result&&meetTheme())meetVoteUI();   // a votação reabre sozinha até você votar
  if(!A.seated)meetHintNow();else if(A.phase!=='vote')meetHintNow();else{const h=$('officehint');if(h)h.style.display='none'}
}
