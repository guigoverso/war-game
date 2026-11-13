'use strict';
// ---------- Rodadas, escritório do líder, livro de decisões e caravanas (Fase 4) ----------
// Uma rodada = turno do LÍDER (decisões, num escritório onde o jogador anda a pé) + turno do COMANDANTE (o jogo normal).
// O jogador encerra a rodada na prefeitura; o mundo avança (produção, cobrança das necessidades) e ele é levado ao escritório.
// Lá, na mesa, um livro reúne as decisões: distribuir o estoque entre as cidades, mandar caravanas, ajustar o porto e evoluir a capital.
// Ao concluir, o jogador é teleportado para fora da prefeitura e volta a jogar. Eventos ficam para depois.
const RES4=['food','ore','wood','gold'];
const CAP_MAX_LVL=4;
const TYPE_NAME={food:'Alimentos',ore:'Minérios',wood:'Madeira',gold:'Dinheiro',port:'Porto'};
const CITY_COLS=[0xe0402a,0x2aa04a,0xe8b820,0x8a3ac8,0x20b0c8,0xe87820,0xd0409a,0x8a8a8a];   // cor de identidade de cada cidade (faixa da bandeira)
const resIcon=k=>DATA.resources[k].icon,resName=k=>DATA.resources[k].name;

Hooks.on('resetState',()=>{STATE.phase='commander';STATE.rd={lvl:1,actions:1,cities:{},routes:[],rbuf:{},report:[],hallCity:0,grace:true}});
const rbufOn=r=>!!(STATE.rd&&STATE.rd.rbuf&&STATE.rd.rbuf[r]);
// bônus de entrega: valor fixo, vale até o fim da rodada (ver seção 14 do design)
addPriceMod('rbuf',(p,ctx)=>{
  const k=ctx.kind;
  if(rbufOn('ore')&&(k==='weapon'||k==='ammo'||k==='repair'))return p*0.8;
  if(rbufOn('gold')&&(k==='recruit'||k==='heal'))return p*0.8;
  if(rbufOn('food')&&k==='soldierup')return p*0.8;
  return p;
},60);
const qPay=q=>Math.round(q.reward*(rbufOn('wood')?1.1:1));   // madeira entregue: missões pagam 10% a mais

// ---------- economia das cidades ----------
const ec=c=>STATE.rd.cities[c.id];
const focusOf=c=>{const e=ec(c);return e.type==='port'?e.pf:e.type};
const maxActions=()=>STATE.rd.lvl;
function portPct(pf,ps){   // porto: o jogador escolhe o que produz (0%) e o que falta (200%); os outros dois ficam em 150% e 100% (na ordem dos recursos)
  const p={},rest=RES4.filter(r=>r!==pf&&r!==ps);p[pf]=0;p[ps]=200;p[rest[0]]=150;p[rest[1]]=100;return p;
}
function initEconomy(){
  const rd=STATE.rd;if(!rd.cities)rd.cities={};
  const hasPort=Object.values(rd.cities).some(e=>e.type==='port');
  // o porto é a cidade mais forte que não é a capital
  const cand=WORLD.cities.filter(c=>!c.home).sort((a,b)=>(b.rank||0)-(a.rank||0)||a.id-b.id)[0];
  for(const c of WORLD.cities){
    if(rd.cities[c.id])continue;
    const rng=new RNG((WORLD.seed*31+c.id*977+5)>>>0);
    const isPort=!hasPort&&cand&&cand.id===c.id;
    const type=isPort?'port':rng.pick(['food','ore','wood','gold']);
    const e={type,pct:{},pf:type==='port'?rng.pick(RES4):type,ps:'',got:{},carry:{},pch:false};
    if(type==='port'){do{e.ps=rng.pick(RES4)}while(e.ps===e.pf);e.pct=portPct(e.pf,e.ps)}
    else{   // foco = 0%; as outras três necessidades sorteiam 200/150/100
      const others=RES4.filter(r=>r!==type),lv=[200,150,100];
      for(let i=lv.length-1;i>0;i--){const j=rng.int(0,i);const t=lv[i];lv[i]=lv[j];lv[j]=t}
      e.pct[type]=0;others.forEach((r,i)=>e.pct[r]=lv[i]);
    }
    rd.cities[c.id]=e;
  }
  if(!rd.routes)rd.routes=[];if(!rd.rbuf)rd.rbuf={};if(!rd.report)rd.report=[];if(!rd.lvl)rd.lvl=1;if(rd.actions===undefined)rd.actions=maxActions();
}
// necessidade (em unidades) de um recurso numa cidade; uma caravana que traz o foco do parceiro zera a necessidade dele
function needOf(c,res){
  const e=ec(c);let pct=e.pct[res]||0;
  for(const r of STATE.rd.routes){
    if(r.a!==c.id&&r.b!==c.id)continue;
    const o=WORLD.cities[r.a===c.id?r.b:r.a];if(focusOf(o)===res)pct=0;
  }
  return Math.round(pct*(res==='gold'?1:0.1));
}
const gotOf=(c,r)=>ec(c).got[r]||0,carryOf=(c,r)=>ec(c).carry[r]||0;
const missingOf=(c,r)=>Math.max(0,needOf(c,r)-gotOf(c,r)-carryOf(c,r));
const cityMet=c=>RES4.every(r=>missingOf(c,r)===0);
const hasRoute=c=>STATE.rd.routes.some(r=>r.a===c.id||r.b===c.id);
const prodOf=c=>(5+Math.max(1,c.rank||1))*(focusOf(c)==='gold'?10:1);
// entrega (delta>0) ou devolução (delta<0) do estoque geral para uma cidade
function deliver(c,res,delta){
  const e=ec(c);
  if(delta>0){const amt=Math.min(delta,Math.max(0,Math.floor(Ledger.get(res))));if(amt<=0)return 0;Ledger.add(res,-amt);e.got[res]=(e.got[res]||0)+amt;return amt}
  const back=Math.min(-delta,e.got[res]||0);if(back<=0)return 0;Ledger.add(res,back);e.got[res]-=back;return -back;
}
function computeBuffs(){
  const b={};
  for(const c of playerCities())for(const r of RES4)if(gotOf(c,r)>Math.max(0,needOf(c,r)-carryOf(c,r)))b[r]=true;
  STATE.rd.rbuf=b;
}
function playerPort(){return playerCities().find(c=>ec(c).type==='port')}

// ---------- fim da rodada ----------
function endRound(city){
  if(STATE.phase==='leader'||G.office||P.dead)return false;
  const rd=STATE.rd,rep=[];
  const pcs=playerCities();
  if(rd.grace)rep.push('Primeira rodada: sem cobrança de necessidades.');
  for(const c of pcs){
    const e=ec(c),carry2={};
    for(const r of RES4){
      const need=needOf(c,r),cover=gotOf(c,r)+carryOf(c,r),short=Math.max(0,need-cover);
      if(!rd.grace&&short>0){Ledger.add(r,-short);rep.push('⚠ '+c.name+': faltaram '+short+' de '+resName(r).toLowerCase()+' (virou dívida).')}
      if(need>0&&cover>need)carry2[r]=Math.min(cover-need,need);   // o excedente adianta a meta da próxima rodada
    }
    e.got={};e.carry=carry2;e.pch=false;
    const f=focusOf(c),amt=prodOf(c);
    if(hasRoute(c))rep.push('🛒 '+c.name+': a produção de '+resName(f).toLowerCase()+' ('+amt+') seguiu por caravana.');
    else{Ledger.add(f,amt);rep.push('✔ '+c.name+' produziu '+amt+' de '+resName(f).toLowerCase()+' para o estoque.')}
  }
  rd.rbuf={};rd.grace=false;rd.hallCity=(city||WORLD.home).id;rd.report=rep;
  STATE.round++;Hooks.emit('round',STATE.round);
  beginLeaderTurn();
  return true;
}
function beginLeaderTurn(){
  STATE.phase='leader';STATE.rd.actions=maxActions();
  if(OFFICE.ok)enterOffice();else{toast('📖 Turno do líder: abra o livro de decisões na prefeitura.',4000);if(G.running)openBook()}
}
function finishLeaderTurn(){
  computeBuffs();STATE.phase='commander';
  const n=Object.keys(STATE.rd.rbuf).length;
  closePanel();leaveOffice();
  toast('✔ Decisões tomadas. Turno do comandante!'+(n?' Bônus de entrega ativos: '+Object.keys(STATE.rd.rbuf).map(resIcon).join(' '):''),4500);
  refreshRoundHud();
}

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
  // quadro grande atrás da mesa e duas bandeiras azuis
  ob(mx-1.9,2.1,0.1,mx+1.9,3.9,0.2,DK,false,{j:0});ob(mx-1.7,2.3,0.2,mx+1.7,3.7,0.24,0x7ab4e8,false,{j:0});
  ob(mx-1.7,2.3,0.24,mx+1.7,2.95,0.28,0x4a8a3a,false,{j:0});ob(mx-0.3,2.95,0.24,mx+0.3,3.4,0.3,0xd03a3a,false,{j:0});
  for(const dx of[-4.6,4.0]){ob(mx+dx,1.2,0.12,mx+dx+0.6,3.9,0.2,0x2a6aff,false,{j:0});ob(mx+dx,1.2,0.2,mx+dx+0.6,1.5,0.24,0xf0d040,false,{j:0})}
  // janelas na parede sul (dos dois lados da porta) e lâmpadas de pé junto da mesa
  for(const wx0 of[3,Wd-6]){ob(wx0-0.1,1.7,Dp-0.12,wx0+3.1,3.9,Dp,DK,false,{j:0});ob(wx0,1.8,Dp-0.16,wx0+3,3.8,Dp-0.1,0xcfe8ff,false,{j:0});ob(wx0+1.45,1.8,Dp-0.2,wx0+1.55,3.8,Dp-0.14,DK,false,{j:0})}
  for(const lx of[3.2,Wd-3.8]){ob(lx,0,2.6,lx+0.6,0.2,3.2,DK,false);ob(lx+0.25,0.2,2.85,lx+0.35,2.0,2.95,DK,false);ob(lx-0.1,2.0,2.5,lx+0.7,2.7,3.3,0xffc060,false,{j:0})}
  // marca o chão (som de piso interno) e guarda os pontos de interesse
  for(let z=0;z<Dp;z++)for(let x=0;x<Wd;x++)T[(oz+z)*W+ox+x]=T_FLOOR;
  OFFICE.desk={x:ox+mx,z:oz+4.9};OFFICE.spawn={x:ox+mx,z:oz+Dp-4.2};OFFICE.ok=true;
}
function inOfficeRoom(){return OFFICE.ok&&P.x>=OFFICE.ox-1&&P.x<=OFFICE.ox+OFFICE.Wd+1&&P.z>=OFFICE.oz-1&&P.z<=OFFICE.oz+OFFICE.Dp+1}
// objetos de cena do escritório: o soldado-comandante na porta e o livro sobre a mesa
function initOffice(){
  if(!OFFICE.ok||OFFICE.soldier)return;
  const ox=OFFICE.ox,oz=OFFICE.oz,Y=OFFICE.Y;
  const m=buildHuman({skin:SKINS[1],shirt:0x2a4a9a,pants:0x2a2a3a,hairStyle:'helmet',hat:0x8a9ab0,gun:{len:0.75},scarf:0xe0e0e0,scale:1.04});
  m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;
  m.group.position.set(ox+OFFICE.Wd/2,Y,oz+OFFICE.Dp-1.1);m.group.rotation.y=Math.PI;scene.add(m.group);
  Col.add({x0:ox+OFFICE.Wd/2-0.5,y0:Y,z0:oz+OFFICE.Dp-1.6,x1:ox+OFFICE.Wd/2+0.5,y1:Y+2,z1:oz+OFFICE.Dp-0.6});
  OFFICE.soldier=m;
  // livro aberto em cima da mesa (capa, páginas) com um brilho dourado para chamar atenção
  const g=new THREE.Group(),bx=(c,sx,sy,sz,px,py,pz,rz)=>{const o=new THREE.Mesh(GEO_BOX,mat(c));o.scale.set(sx,sy,sz);o.position.set(px,py,pz);if(rz)o.rotation.z=rz;g.add(o);return o};
  bx(0x5a2a10,1.5,0.06,0.95,0,0,0);bx(0xf2e8c8,0.68,0.07,0.85,-0.36,0.06,0,0.08);bx(0xf2e8c8,0.68,0.07,0.85,0.36,0.06,0,-0.08);bx(0x3a2a14,0.05,0.12,0.9,0,0.05,0);
  const halo=new THREE.Mesh(GEO_BOX,new THREE.MeshBasicMaterial({color:0xffd060,transparent:true,opacity:0.35,depthWrite:false}));halo.scale.set(1.8,0.05,1.2);halo.position.y=-0.03;g.add(halo);
  g.position.set(OFFICE.desk.x,Y+1.07,oz+3.1);scene.add(g);OFFICE.book=g;OFFICE.halo=halo;
}
function enterOffice(){
  if(G.office||!OFFICE.ok)return;
  initOffice();
  G.office={ret:{x:P.x,y:P.y,z:P.z,yaw:P.yaw}};
  G.fireHeld=false;G.aiming=false;P.crouch=false;fishClean();
  P.x=OFFICE.spawn.x;P.z=OFFICE.spawn.z;P.y=OFFICE.Y+0.05;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=0;P.pitch=0;
  $('hud').classList.add('hidden');WS.vm.forEach(v=>v.visible=false);
  closePanel();
  const hint=$('officehint');hint.textContent='📖 Vá até a mesa e aperte E para abrir o livro de decisões';hint.style.display='block';
}
function leaveOffice(){
  const had=G.office;G.office=null;
  const hint=$('officehint');if(hint)hint.style.display='none';
  if(!had){return}
  $('hud').classList.remove('hidden');ensureEquipped();
  const c=WORLD.cities[STATE.rd.hallCity]||WORLD.home;
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
// dica do escritório e linha da rodada no HUD
let rdT=0;
function updateRounds(dt){
  if(OFFICE.halo)OFFICE.halo.material.opacity=0.28+0.14*Math.sin(G.t*3);
  if(G.office){
    const near=Math.hypot(P.x-OFFICE.desk.x,P.z-OFFICE.desk.z)<2.8;
    $('officehint').textContent=near?'📖 [E] Abrir o livro de decisões':'📖 Vá até a mesa e aperte E para abrir o livro de decisões';
  }
  rdT-=dt;if(rdT<=0){rdT=0.5;refreshRoundHud()}
  for(const m of CARAVANS)m.group.visible=Math.hypot(m.x-P.x,m.z-P.z)<250;
}
function refreshRoundHud(){
  const el=$('rdline');if(!el||!STATE.rd)return;
  const b=STATE.rd.rbuf||{},t={food:'soldados −20%',ore:'armas −20%',gold:'recrutar/curar −20%',wood:'obras −10%, missões +10%'};
  el.innerHTML='📖 Rodada '+STATE.round+(STATE.phase==='leader'?' • turno do líder':' • turno do comandante')+Object.keys(b).map(r=>'<br><small>'+resIcon(r)+' '+t[r]+'</small>').join('');
}

// ---------- caravanas decorativas (paradas na estrada entre as cidades de uma rota) ----------
const CARAVANS=[];
function clearCaravans(){for(const m of CARAVANS)scene.remove(m.group);CARAVANS.length=0}
function roadSpot(ax,az,bx,bz,t){
  const x0=ax+(bx-ax)*t,z0=az+(bz-az)*t;
  const ok=(x,z,road)=>{
    if(x<4||z<4||x>=W-4||z>=W-4)return false;const i=z*W+x;
    if(H[i]<SEA+0.5||(road&&T[i]!==T_ROAD))return false;
    if(WORLD.cities.some(c=>Math.max(Math.abs(c.cx-x),Math.abs(c.cz-z))<c.half+7))return false;
    if(DG.ok&&x>DG.rx-6&&x<DG.rx+DG.S+6&&z>DG.rz-6&&z<DG.rz+DG.S+6)return false;
    return true;
  };
  // a estrada de verdade serpenteia: procura o trecho de estrada mais perto do ponto da linha reta
  let best=null,bd=1e9;
  for(let z=Math.round(z0)-48;z<=Math.round(z0)+48;z++)for(let x=Math.round(x0)-48;x<=Math.round(x0)+48;x++){
    const d=(x-x0)*(x-x0)+(z-z0)*(z-z0);if(d>=bd||!ok(x,z,true))continue;bd=d;best=[x,z];
  }
  if(best)return{x:best[0]+0.5,z:best[1]+0.5};
  for(let r=0;r<=16;r++)for(let k=0;k<(r?14:1);k++){   // sem estrada por perto: um ponto em terra firme perto da linha
    const a=k*0.4488,x=Math.round(x0+Math.cos(a)*r),z=Math.round(z0+Math.sin(a)*r);
    if(ok(x,z,false))return{x:x+0.5,z:z+0.5};
  }
  return{x:x0,z:z0};
}
function makeCaravan(c,x,z,yaw){
  const g=new THREE.Group();
  const bx=(col,sx,sy,sz,px,py,pz)=>{const o=new THREE.Mesh(GEO_BOX,mat(col));o.scale.set(sx,sy,sz);o.position.set(px,py,pz);g.add(o);return o};
  const W1=0x7a5632,W2=0x5a3d22,CV=0xe8dcc0,HR=0x8a5a3a;
  bx(W1,1.7,0.3,3.0,0,0.85,0);                                   // chassi
  bx(W2,1.7,0.55,0.12,0,1.3,1.44);bx(W2,1.7,0.55,0.12,0,1.3,-1.44);bx(W2,0.12,0.55,3,0.79,1.3,0);bx(W2,0.12,0.55,3,-0.79,1.3,0);   // laterais
  bx(CV,1.5,0.95,2.7,0,2.05,0);bx(0xd8caa8,1.6,0.1,2.8,0,2.55,0);bx(W2,1.7,1.0,0.1,0,2.0,1.4);bx(0x2a1a10,1.1,0.8,0.12,0,1.95,1.48);   // lona e boca do toldo
  for(const sx of[-0.95,0.95])for(const sz of[-0.95,0.95])bx(0x2a2a2a,0.14,0.85,0.85,sx,0.45,sz);   // rodas
  bx(W2,0.1,0.1,1.9,0.35,0.9,2.3);bx(W2,0.1,0.1,1.9,-0.35,0.9,2.3);   // varais
  bx(HR,0.7,0.8,1.5,0,1.15,3.0);bx(HR,0.4,0.7,0.5,0,1.65,3.9);bx(0x2a1a10,0.42,0.2,0.2,0,1.5,4.2);   // cavalo (corpo, cabeça, focinho)
  for(const sx of[-0.22,0.22])for(const sz of[2.5,3.5])bx(0x5a3a22,0.16,0.8,0.16,sx,0.4,sz);
  bx(0x2a1a10,0.06,2.8,0.06,0.9,2.3,-1.4);                        // mastro da bandeira
  bx(c.flagMat?c.flagMat.color.getHex():0x2a6aff,1.1,0.4,0.05,1.45,3.5,-1.4);bx(CITY_COLS[c.id%CITY_COLS.length],1.1,0.35,0.05,1.45,3.1,-1.4);   // bandeira da cidade (azul) com a faixa de identidade
  g.position.set(x,tH(x,z),z);g.rotation.y=yaw;scene.add(g);
  const m={group:g,x,z};CARAVANS.push(m);return m;
}
function rebuildCaravans(){
  clearCaravans();
  for(const r of STATE.rd.routes){
    const A=WORLD.cities[r.a],B=WORLD.cities[r.b];if(!A||!B)continue;
    const yAB=Math.atan2(B.cx-A.cx,B.cz-A.cz);
    const s1=roadSpot(A.cx,A.cz,B.cx,B.cz,0.36),s2=roadSpot(A.cx,A.cz,B.cx,B.cz,0.64);
    makeCaravan(A,s1.x,s1.z,yAB);makeCaravan(B,s2.x,s2.z,yAB+Math.PI);
  }
}

// ---------- livro de decisões ----------
const LB={tab:'resumo',city:null,ra:null,rb:null};
const LTABS=[['resumo','📜','Resumo'],['cidades','🏘','Cidades'],['caravanas','🛒','Caravanas'],['capital','🏛','Capital']];
function openBook(){
  if(LB.city===null||!WORLD.cities[LB.city]||WORLD.cities[LB.city].owner!=='player')LB.city=WORLD.home.id;
  openPanel('ldbook');renderBook();
}
function closeBookUI(){$('ldbook').classList.add('hidden');if(G.panel==='ldbook')G.panel=null}
const actionsHtml=()=>'<span style="color:#8a4a10;letter-spacing:2px">'+'◆'.repeat(STATE.rd.actions)+'◇'.repeat(Math.max(0,maxActions()-STATE.rd.actions))+'</span> ('+STATE.rd.actions+'/'+maxActions()+')';
function stockHtml(){
  return '<table class="ldt">'+RES4.map(r=>{const v=Ledger.get(r);return '<tr><td>'+resIcon(r)+' '+resName(r)+'</td><td style="text-align:right"><b'+(v<0?' style="color:#a01818"':'')+'>'+v+'</b>'+(v<0?' (dívida)':'')+'</td></tr>'}).join('')+'</table>';
}
function typeLabel(c){const e=ec(c);return e.type==='port'?'⚓ Porto (produz '+resIcon(e.pf)+' '+resName(e.pf).toLowerCase()+')':resIcon(e.type)+' '+TYPE_NAME[e.type]}
function bookPages(){
  const rd=STATE.rd,pcs=playerCities();
  if(LB.tab==='resumo'){
    const port=playerPort(),hasWorldPort=WORLD.cities.some(c=>ec(c).type==='port');
    const L='<h3>Rodada '+STATE.round+'</h3><p>Ações do líder: '+actionsHtml()+'</p><h4>Estoque geral</h4>'+stockHtml()
      +'<p style="margin-top:10px">Cidades suas: <b>'+pcs.length+'</b> • Rotas de caravana: <b>'+rd.routes.length+'</b></p>'
      +(port?'':(hasWorldPort?'<p class="ldwarn">⚓ Você ainda não tem um porto. O porto fica na cidade mais forte do mapa; conquiste-a.</p>':''));
    const R='<h3>Relatório da rodada anterior</h3>'+(rd.report.length?'<ul class="ldul">'+rd.report.map(t=>'<li>'+t+'</li>').join('')+'</ul>':'<p>Ainda não há o que relatar.</p>')
      +'<h4>Como funciona</h4><p class="ldsm">Cada cidade precisa de recursos para passar a rodada; a cidade-foco produz o seu e não precisa dele. Distribua o estoque na aba <b>Cidades</b>. Entregar <b>mais</b> que a necessidade dá um bônus até o fim da rodada. O que faltar vira dívida e bloqueia compras.</p>';
    return[L,R];
  }
  if(LB.tab==='cidades'){
    const L='<h3>Suas cidades</h3>'+pcs.map(c=>'<button class="ldcity'+(c.id===LB.city?' sel':'')+'" data-a="city" data-id="'+c.id+'"><span>'+(c.home?'🏛 ':'')+c.name+'</span><small>'+typeLabel(c)+'</small><em>'+(cityMet(c)?'✔ suprida':'⚠ faltam recursos')+'</em></button>').join('');
    const c=WORLD.cities[LB.city];let R='';
    if(c&&c.owner==='player'){
      const e=ec(c);
      R='<h3>'+c.name+'</h3><p>'+typeLabel(c)+'</p><table class="ldt">'+RES4.map(r=>{
        const need=needOf(c,r),g=gotOf(c,r),cy=carryOf(c,r),miss=missingOf(c,r),step=r==='gold'?10:1;
        const state=need===0&&g===0?'<span class="ldok">não precisa</span>':miss>0?'<span class="ldbad">falta '+miss+'</span>':(g>Math.max(0,need-cy)?'<span class="ldok">★ bônus</span>':'<span class="ldok">✔</span>');
        return '<tr><td>'+resIcon(r)+' <b>'+resName(r)+'</b><br><small>precisa '+need+' • entregue '+g+(cy?' (+'+cy+' adiantado)':'')+'</small></td><td>'+state+'</td>'
          +'<td class="ldb"><button data-a="dm" data-r="'+r+'" '+(g<=0?'disabled':'')+'>−'+step+'</button><button data-a="dp" data-r="'+r+'" '+(Ledger.get(r)<=0?'disabled':'')+'>+'+step+'</button>'+(miss>0?'<button data-a="sup" data-r="'+r+'" '+(Ledger.get(r)<=0?'disabled':'')+'>Suprir</button>':'')+'</td></tr>';
      }).join('')+'</table><p class="ldsm">Entregar acima da necessidade dá o bônus da rodada; o excedente adianta a meta da próxima.</p>';
      if(e.type==='port'){
        R+='<h4>Distribuição do porto</h4><p class="ldsm">'+(e.pch?'Já alterada nesta rodada.':'Uma troca por rodada. Escolha o que o porto produz e o que lhe falta.')+'</p>'
          +'<div>Produz: '+RES4.map(r=>'<button class="ldmini'+(e.pf===r?' sel':'')+'" data-a="pf" data-r="'+r+'" '+(e.pch||e.ps===r?'disabled':'')+'>'+resIcon(r)+'</button>').join('')+'</div>'
          +'<div>Falta: '+RES4.map(r=>'<button class="ldmini'+(e.ps===r?' sel':'')+'" data-a="ps" data-r="'+r+'" '+(e.pch||e.pf===r?'disabled':'')+'>'+resIcon(r)+'</button>').join('')+'</div>';
      }
    }
    return[L,R];
  }
  if(LB.tab==='caravanas'){
    const L='<h3>Rotas de caravana</h3>'+(rd.routes.length?rd.routes.map((r,i)=>{const A=WORLD.cities[r.a],B=WORLD.cities[r.b];
      return '<div class="ldroute"><b>'+A.name+' ⇄ '+B.name+'</b><br><small>'+A.name+' recebe '+resIcon(focusOf(B))+' • '+B.name+' recebe '+resIcon(focusOf(A))+'</small><br><button data-a="unroute" data-i="'+i+'">Desfazer rota</button></div>'}).join(''):'<p>Nenhuma rota ainda.</p>')
      +'<p class="ldsm">Quem recebe o produto da outra cidade passa a ter necessidade 0 dele. A produção levada pela caravana não vai para o estoque geral.</p>';
    const opts=sel=>pcs.map(c=>'<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+c.name+' ('+TYPE_NAME[ec(c).type]+')</option>').join('');
    if(LB.ra===null||!pcs.find(c=>c.id===LB.ra))LB.ra=pcs[0]?pcs[0].id:null;
    if(LB.rb===null||!pcs.find(c=>c.id===LB.rb)||LB.rb===LB.ra)LB.rb=(pcs.find(c=>c.id!==LB.ra)||{}).id??null;
    const R='<h3>Nova rota</h3>'+(pcs.length<2?'<p>Você precisa de pelo menos duas cidades.</p>':'<p>Cidade A<br><select data-s="ra">'+opts(LB.ra)+'</select></p><p>Cidade B<br><select data-s="rb">'+opts(LB.rb)+'</select></p><p>Custo: <b>1 ação</b> ('+STATE.rd.actions+' restante'+(STATE.rd.actions===1?'':'s')+')</p><button data-a="route" '+(STATE.rd.actions<1?'disabled':'')+'>Enviar caravanas</button>');
    return[L,R];
  }
  const lvl=rd.lvl,cost=capCost(),can=lvl<CAP_MAX_LVL&&STATE.rd.actions>=1;
  const L='<h3>'+WORLD.home.name+' — a capital</h3><p>Nível do líder: <b>'+lvl+'</b> / '+CAP_MAX_LVL+'</p><p>Ações por rodada: <b>'+maxActions()+'</b></p><p class="ldsm">A capital evolui até virar uma cidade fortificada. Cada nível aumenta o número de ações do líder por rodada.</p>';
  const R='<h3>Evoluir a capital</h3>'+(lvl>=CAP_MAX_LVL?'<p>A capital já é uma cidade fortificada.</p>':'<p>Próximo nível: <b>'+(lvl+1)+'</b> (+1 ação por rodada, a partir da próxima rodada).</p><p>Custo: <b>◉ '+cost.gold+'</b> e <b>'+resIcon('wood')+' '+cost.wood+'</b> + 1 ação</p><button data-a="cap" '+(can&&Ledger.canAfford(cost)?'':'disabled')+'>Evoluir</button>'+(Ledger.anyDebt()?'<p class="ldwarn">Com dívida não é possível comprar.</p>':''));
  return[L,R];
}
const capCost=()=>({gold:200*STATE.rd.lvl,wood:10*STATE.rd.lvl});
function renderBook(){
  const [L,R]=bookPages();
  $('ldL').innerHTML=L;$('ldR').innerHTML=R;
  $('ldtabs').innerHTML=LTABS.map(t=>'<button class="'+(LB.tab===t[0]?'sel':'')+'" data-tab="'+t[0]+'">'+t[1]+'<br><small>'+t[2]+'</small></button>').join('');
  $('lddone').textContent=STATE.phase==='leader'?'✔ Concluir decisões':'Fechar';
}
function bookClick(e){
  const t=e.target.closest('button');if(!t)return;
  const rd=STATE.rd,a=t.dataset.a;
  if(t.dataset.tab){LB.tab=t.dataset.tab;renderBook();return}
  if(t.id==='lddone'){
    if(STATE.phase!=='leader'){closePanel();return}
    const open=playerCities().some(c=>!cityMet(c));
    if(open)UI.confirm('Há cidades com necessidades sem suprir. O que faltar vira dívida no fim da rodada. Concluir mesmo assim?',finishLeaderTurn,'Concluir');else finishLeaderTurn();
    return;
  }
  if(t.id==='ldclose'){closePanel();return}
  const c=WORLD.cities[LB.city];
  if(a==='city'){LB.city=+t.dataset.id}
  else if(a==='dp'){deliver(c,t.dataset.r,t.dataset.r==='gold'?10:1);sfx('coin',0)}
  else if(a==='dm')deliver(c,t.dataset.r,-(t.dataset.r==='gold'?10:1));
  else if(a==='sup'){deliver(c,t.dataset.r,missingOf(c,t.dataset.r));sfx('coin',0)}
  else if(a==='pf'||a==='ps'){const en=ec(c);if(!en.pch){en[a]=t.dataset.r;en.pct=portPct(en.pf,en.ps);en.pch=true}}
  else if(a==='unroute'){rd.routes.splice(+t.dataset.i,1);rebuildCaravans()}
  else if(a==='route'){
    const A=WORLD.cities[LB.ra],B=WORLD.cities[LB.rb];
    if(!A||!B||A===B)toast('Escolha duas cidades diferentes.',2000);
    else if(rd.routes.some(r=>(r.a===A.id&&r.b===B.id)||(r.a===B.id&&r.b===A.id)))toast('Já existe uma rota entre elas.',2000);
    else if(focusOf(A)===focusOf(B))toast('As duas produzem o mesmo recurso: a rota seria inútil.',2500);
    else if(rd.actions<1)toast('Sem ações de líder.',2000);
    else{rd.actions--;rd.routes.push({a:A.id,b:B.id});rebuildCaravans();sfx('win',0);toast('🛒 Duas caravanas partiram entre '+A.name+' e '+B.name+'.',3000)}
  }
  else if(a==='cap'){
    const cost=capCost();
    if(rd.lvl<CAP_MAX_LVL&&rd.actions>=1&&Ledger.spend(cost)){rd.actions--;rd.lvl++;sfx('win',0);toast('🏛 A capital evoluiu! Nível '+rd.lvl+': mais ações a partir da próxima rodada.',3500)}
  }
  renderBook();
}
document.addEventListener('click',e=>{if(e.target.closest('#ldbook'))bookClick(e)});
document.addEventListener('change',e=>{const s=e.target.closest('#ldbook select');if(!s)return;LB[s.dataset.s]=+s.value;renderBook()});

// botão "Encerrar a rodada" no quadro da prefeitura
function hallRoundAction(){
  const c=G.questCity;
  if(STATE.phase==='leader'){closePanel();openBook();return}
  if(RAID.active){toast('Há um ataque em andamento! Defenda a cidade antes de encerrar a rodada.',3000);return}
  UI.confirm('Encerrar a rodada '+STATE.round+'? As cidades produzem e cobram as necessidades; depois você decide no escritório.',()=>{closePanel();endRound(c)},'Encerrar');
}
document.getElementById('qround').onclick=hallRoundAction;
