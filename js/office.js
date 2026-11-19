'use strict';
// ---------- Escritório do Líder (Fase 4): sala, livro sobre a mesa, entrar/sair e saída na prefeitura ----------
// Separado de rounds.js.
// ---------- escritório do líder (sala fechada no canto da região das dungeons) ----------
const OFFICE={ok:false,ox:0,oz:0,Wd:20,Dp:14,H:5,Y:0,desk:null,spawn:null,soldier:null,book:null};
function genOffice(){
  OFFICE.ok=false;if(!DG.ok)return;
  const Wd=OFFICE.Wd,Dp=OFFICE.Dp,H=OFFICE.H,ox=DG.rx+58,oz=DG.rz+58,Y=DG.Y;
  Object.assign(OFFICE,{ox,oz,Y});
  const ob=(a,b,c,d,e,f,col,solid,o)=>Bx(ox+a,Y+b,oz+c,ox+d,Y+e,oz+f,col,!!solid,o);
  const PL=0xdccfa8,WD=0x7a5632,DK=0x4a2f1a,TOP=0x8a6234;
  // chão de tábuas
  for(let z=0;z<Dp;z++)for(let x=0;x<Wd;x+=5)ob(x,0,z,x+5,0.05,z+1,shadec(0x9a7448,0.86+0.2*hash2(x,z,41)),false,{j:0.03});
  // paredes (norte, sul com a porta, oeste, leste), rodapé de madeira e teto com vigas
  const gx0=Wd/2-1.2,gx1=Wd/2+1.2;
  ob(-1,0,-1,Wd+1,H,0,PL,true);ob(0,0,0,Wd,1.2,0.1,WD,false);
  ob(-1,0,Dp,gx0,H,Dp+1,PL,true);ob(gx1,0,Dp,Wd+1,H,Dp+1,PL,true);ob(gx0,2.7,Dp,gx1,H,Dp+1,PL,true);
  ob(0,0,Dp-0.1,gx0,1.2,Dp,WD,false);ob(gx1,0,Dp-0.1,Wd,1.2,Dp,WD,false);
  ob(gx0,0,Dp+0.3,gx1,2.7,Dp+0.7,0x5a3a1c,true);ob(gx1-0.45,1.2,Dp-0.05,gx1-0.25,1.4,Dp+0.3,0xe0b030,false);   // porta fechada com maçaneta
  ob(-1,0,0,0,H,Dp,PL,true);ob(0,0,0.1,0.1,1.2,Dp-0.1,WD,false);
  ob(Wd,0,0,Wd+1,H,Dp,PL,true);ob(Wd-0.1,0,0.1,Wd,1.2,Dp-0.1,WD,false);
  ob(-1,H,-1,Wd+1,H+0.5,Dp+1,DK,true,{b:true});
  for(let z=1;z<Dp;z+=3.5)ob(0,H-0.35,z,Wd,H,z+0.4,DK,false,{b:true});
  // tapete
  ob(4,0.05,4.5,Wd-4,0.09,Dp-2.5,0x7a2a2a,false,{j:0});ob(4.5,0.09,5,Wd-4.5,0.11,Dp-3,0x9a3a3a,false,{j:0});
  // mesa do líder (norte, no centro) com gavetas, cadeira atrás e duas cadeiras de visita
  const mx=Wd/2;
  ob(mx-3,0,2.2,mx+3,1.0,4.0,TOP,true,{j:0.02});ob(mx-3.05,0.95,2.15,mx+3.05,1.05,4.05,0x9a7040,false,{j:0});
  ob(mx-2.9,0.1,3.9,mx-1.2,0.9,4.02,DK,false,{j:0});ob(mx+1.2,0.1,3.9,mx+2.9,0.9,4.02,DK,false,{j:0});
  ob(mx-0.5,0.15,0.9,mx+0.5,0.6,1.8,0x5a3a1c,false);ob(mx-0.5,0.6,0.9,mx+0.5,1.9,1.1,0x5a3a1c,false);
  for(const dx of[-2.4,1.6]){ob(mx+dx,0,6,mx+dx+0.8,0.5,6.8,0x6a4a2a,false);ob(mx+dx,0.5,6.7,mx+dx+0.8,1.3,6.9,0x6a4a2a,false)}
  // estantes de livros nas paredes leste e oeste
  for(const side of[0,1]){
    const x0=side?Wd-1.1:0,x1=side?Wd:1.1,face=side?x0-0.04:x1+0.04;
    for(const z0 of[3,8.6]){
      ob(x0,0,z0,x1,3.3,z0+4.4,DK,true,{j:0.02});
      for(let row=0;row<3;row++)for(let k=0;k<14;k++){
        const z=z0+0.1+k*0.3,h=0.45+0.12*hash2(k,row,z0+side*7);
        ob(side?face-0.12:face,0.35+row*1.05,z,side?face:face+0.12,0.35+row*1.05+h,z+0.24,[0xa02a2a,0x2a5aa0,0x2a8a4a,0xc8a020,0x6a2a8a,0xe0d8c0][Math.floor(hash2(k,row,z0+side*13)*6)],false,{j:0});
      }
    }
  }
  // quadro grande atrás da mesa (as bandeiras da facção são objetos separados: initOffice/officeLook, para mudar de cor)
  ob(mx-1.9,2.1,0.1,mx+1.9,3.9,0.2,DK,false,{j:0});ob(mx-1.7,2.3,0.2,mx+1.7,3.7,0.24,0x7ab4e8,false,{j:0});
  ob(mx-1.7,2.3,0.24,mx+1.7,2.95,0.28,0x4a8a3a,false,{j:0});ob(mx-0.3,2.95,0.24,mx+0.3,3.4,0.3,0xd03a3a,false,{j:0});
  // janelas na parede sul (dos dois lados da porta) e lâmpadas de pé junto da mesa
  for(const wx0 of[3,Wd-6]){ob(wx0-0.1,1.7,Dp-0.12,wx0+3.1,3.9,Dp,DK,false,{j:0});ob(wx0,1.8,Dp-0.16,wx0+3,3.8,Dp-0.1,0xcfe8ff,false,{j:0});ob(wx0+1.45,1.8,Dp-0.2,wx0+1.55,3.8,Dp-0.14,DK,false,{j:0})}
  for(const lx of[3.2,Wd-3.8]){ob(lx,0,2.6,lx+0.6,0.2,3.2,DK,false);ob(lx+0.25,0.2,2.85,lx+0.35,2.0,2.95,DK,false);ob(lx-0.1,2.0,2.5,lx+0.7,2.7,3.3,0xffc060,false,{j:0})}
  // marca o chão (som de piso interno) e guarda os pontos de interesse
  OFFICE.desk={x:ox+mx,z:oz+3.1};OFFICE.spawn={x:ox+mx,z:oz+Dp-4.2};OFFICE.ok=true;
}
const nearBook=()=>!!(G.office&&OFFICE.desk&&Math.hypot(P.x-OFFICE.desk.x,P.z-OFFICE.desk.z)<5.5);   // alcance generoso: basta estar diante da mesa
function inOfficeRoom(){return OFFICE.ok&&P.y<UNDER_Y&&P.x>=OFFICE.ox-1&&P.x<=OFFICE.ox+OFFICE.Wd+1&&P.z>=OFFICE.oz-1&&P.z<=OFFICE.oz+OFFICE.Dp+1}
// objetos de cena do escritório: o soldado-comandante na porta e o livro sobre a mesa
function initOffice(){
  if(!OFFICE.ok||OFFICE.soldier)return;
  const ox=OFFICE.ox,oz=OFFICE.oz,Y=OFFICE.Y;
  Col.add({x0:ox+OFFICE.Wd/2-0.5,y0:Y,z0:oz+OFFICE.Dp-1.6,x1:ox+OFFICE.Wd/2+0.5,y1:Y+2,z1:oz+OFFICE.Dp-0.6});
  OFFICE.soldier=true;officeLook();
  // bandeiras da facção do jogador (a textura e a cor vêm de officeLook): duas na parede do fundo, uma grande ao lado da mesa e um mastro de pé
  const fm=OFFICE.flagMat=new THREE.MeshLambertMaterial({color:0xffffff,side:THREE.DoubleSide}),mx=OFFICE.Wd/2,fl=(w,h,x,y,z,ry)=>{const m=new THREE.Mesh(GEO_BOX,fm);m.scale.set(w,h,0.06);m.position.set(ox+x,Y+y,oz+z);if(ry)m.rotation.y=ry;scene.add(m);return m};
  for(const dx of[-4.6,4.0])fl(1.5,2.4,mx+dx+0.3,2.6,0.2);
  {const px=ox+mx+4.6,pz=oz+2.6,pole=new THREE.Mesh(GEO_BOX,mat(0x3a3a3a));pole.scale.set(0.1,3.8,0.1);pole.position.set(px,Y+1.9,pz);scene.add(pole);const tip=new THREE.Mesh(GEO_BOX,mat(0xe0b030));tip.scale.set(0.2,0.2,0.2);tip.position.set(px,Y+3.9,pz);scene.add(tip);const base=new THREE.Mesh(GEO_BOX,mat(0x6a6a6a));base.scale.set(0.7,0.2,0.7);base.position.set(px,Y+0.1,pz);scene.add(base);const f=new THREE.Mesh(GEO_BOX,fm);f.scale.set(1.5,1.0,0.06);f.position.set(px+0.8,Y+3.3,pz);scene.add(f)}
  officeLook();
  // livro aberto em cima da mesa (capa, páginas) com um brilho dourado para chamar atenção
  const g=new THREE.Group(),bx=(c,sx,sy,sz,px,py,pz,rz)=>{const o=new THREE.Mesh(GEO_BOX,mat(c));o.scale.set(sx,sy,sz);o.position.set(px,py,pz);if(rz)o.rotation.z=rz;g.add(o);return o};
  bx(0x5a2a10,1.5,0.06,0.95,0,0,0);bx(0xf2e8c8,0.68,0.07,0.85,-0.36,0.06,0,0.08);bx(0xf2e8c8,0.68,0.07,0.85,0.36,0.06,0,-0.08);bx(0x3a2a14,0.05,0.12,0.9,0,0.05,0);
  const halo=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:0.35,depthWrite:false}));halo.scale.set(1.8,0.05,1.2);halo.position.y=-0.03;g.add(halo);
  g.position.set(OFFICE.desk.x,Y+1.07,oz+3.1);scene.add(g);OFFICE.book=g;OFFICE.halo=halo;
}
// cor da facção do jogador no escritório: bandeiras (textura) e uniforme do soldado
function officeLook(){
  if(!OFFICE.ok||!OFFICE.soldier)return;
  const col=facColor(0);
  if(OFFICE.flagMat){OFFICE.flagMat.map=facFlagTex(0);OFFICE.flagMat.color.setHex(0xffffff);OFFICE.flagMat.needsUpdate=true}
  if(OFFICE.soldierCol===col&&OFFICE.soldierM)return;
  const ox=OFFICE.ox,oz=OFFICE.oz,Y=OFFICE.Y;
  if(OFFICE.soldierM)scene.remove(OFFICE.soldierM.group);
  const m=buildHuman({skin:SKINS[1],shirt:col,pants:0x2a2a3a,hairStyle:'helmet',hat:0x8a9ab0,gun:{len:0.75},scarf:0xe0e0e0,scale:1.04});
  m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;
  m.group.position.set(ox+OFFICE.Wd/2,Y,oz+OFFICE.Dp-1.1);m.group.rotation.y=Math.PI;scene.add(m.group);
  OFFICE.soldierM=m;OFFICE.soldierCol=col;
}
function enterOffice(silent){
  if(G.office||!OFFICE.ok)return;
  initOffice();officeLook();G.noPauseUntil=performance.now()+2000;
  G.office={ret:{x:P.x,y:P.y,z:P.z,yaw:P.yaw}};
  G.fireHeld=false;G.aiming=false;P.crouch=false;fishClean();
  P.x=OFFICE.spawn.x;P.z=OFFICE.spawn.z;P.y=OFFICE.Y+0.05;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0;
  $('hud').classList.add('hidden');WS.vm.forEach(v=>v.visible=false);
  if(!silent)closePanel();   // no início da partida o painel de configurações abre em seguida: não pedir o cursor travado
  const hint=$('officehint');hint.textContent='📖 Chegue perto da mesa e aperte E (ou clique) para abrir o livro';hint.style.display='block';
}
function leaveOffice(){
  const had=G.office;G.office=null;
  const hint=$('officehint');if(hint)hint.style.display='none';
  if(!had){return}
  $('hud').classList.remove('hidden');ensureEquipped();
  let c=WORLD.cities[STATE.rd.hallCity]||WORLD.home;
  if(c.owner!=='player'){   // a cidade onde ele encerrou o turno se rebelou: vai para a cidade sua mais próxima
    let best=WORLD.home,bd=1e9;for(const o of playerCities()){const d=Math.hypot(o.cx-c.cx,o.cz-c.cz);if(d<bd){bd=d;best=o}}
    c=best;STATE.rd.hallCity=c.id;toast('A cidade se rebelou! Você foi levado para '+c.name+'.',4000);
  }
  hallExit(c);
}
// ponto livre do lado de fora da prefeitura, de frente para a porta
function hallExit(c){
  const o=c.hallOut||(c.hall?{x:c.hall.x,z:c.hall.z+2}:{x:c.cx,z:c.cz+c.half-2});
  const q=[[0,0],[1.5,0],[-1.5,0],[0,1.5],[0,-1.5],[2.5,2.5],[-2.5,2.5],[2.5,-2.5],[-2.5,-2.5]];
  let px=o.x,pz=o.z,found=false;
  for(const d of q){const x=o.x+d[0],z=o.z+d[1];probe(x,z,0.5,tH(x,z),1.8,1.05);if(!GR.blocked){px=x;pz=z;found=true;break}}
  if(!found){const f=freeSpot(o.x,o.z,0.5,1.8,0.45);px=f[0];pz=f[1]}
  P.x=px;P.z=pz;P.y=tH(px,pz)+0.1;P.vx=P.vz=P.vy=0;P.camY=P.y;
  const tx=c.hall?c.hall.x:c.cx,tz=c.hall?c.hall.z:c.cz;P.yaw=Math.atan2(-(tx-px),-(tz-pz));P.pitch=0;
}
// início da partida: o jogador começa dentro da prefeitura da capital, de frente para o quadro
function placeAtHall(){
  const c=WORLD.home,o=c.hall;if(!o)return;
  for(const d of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
    const x=o.x+d[0],z=o.z+d[1];probe(x,z,0.5,tH(x,z)+0.05,1.8,1.05);
    if(!GR.blocked){const out=c.hallOut||{x:o.x,z:o.z+3};P.x=x;P.z=z;P.y=GR.g;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(o.x-out.x),-(o.z-out.z));P.pitch=0;return}
  }
}
