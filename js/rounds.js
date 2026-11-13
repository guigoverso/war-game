'use strict';
// ---------- Rodadas, escritório do líder, livro de decisões e caravanas (Fase 4) ----------
// A partida começa na RODADA 0 (preparação): só o turno do comandante, sem decisões e sem cobrança. A contagem vale a partir da rodada 1.
// Rodada N>=1 = turno do LÍDER (decisões, num escritório onde o jogador anda a pé: caravanas, porto, capital) + turno do COMANDANTE (o jogo normal,
// em que ele busca suprimentos e os distribui às cidades pelo livro, que também guarda a bolsa — tecla B).
// O jogador encerra a rodada na prefeitura; o mundo avança (produção, cobrança das necessidades) e ele é levado ao escritório.
// Ao concluir as decisões, é teleportado para fora da prefeitura. Eventos ficam para depois.
const RES4=['food','ore','wood','gold'];
const CAP_MAX_LVL=4;
const TYPE_NAME={food:'Alimentos',ore:'Minérios',wood:'Madeira',gold:'Dinheiro',port:'Porto'};
const CITY_COLS=[0xe0402a,0x2aa04a,0xe8b820,0x8a3ac8,0x20b0c8,0xe87820,0xd0409a,0x8a8a8a];   // cor de identidade de cada cidade (faixa da bandeira)
const resIcon=k=>DATA.resources[k].icon,resName=k=>DATA.resources[k].name;

Hooks.on('resetState',()=>{STATE.phase='commander';STATE.rd={lvl:1,actions:1,cities:{},routes:[],rbuf:{},debuff:{},report:[],hallCity:0}});
const rbufOn=r=>!!(STATE.rd&&STATE.rd.rbuf&&STATE.rd.rbuf[r]);
const debOn=r=>!!(STATE.rd&&STATE.rd.debuff&&STATE.rd.debuff[r]);   // debuff: faltou suprimento na rodada anterior
// dívida em itens (o que faltou e ainda não foi pago) das cidades do jogador
function cityItemDebt(){if(!STATE.rd||!STATE.rd.cities||typeof WORLD==='undefined')return false;return WORLD.cities.some(c=>c.owner==='player'&&STATE.rd.cities[c.id]&&STATE.rd.cities[c.id].debt&&Object.keys(STATE.rd.cities[c.id].debt).some(k=>STATE.rd.cities[c.id].debt[k]>0))}
const DEB_TXT={food:'soldados e pratos da taverna custam o dobro',ore:'armas, munição e conserto custam o dobro',wood:'missões pagam 80% menos; a loja cobra o dobro e compra por 50%',gold:'curar e itens de cura custam o dobro'};
// bônus de entrega: valor fixo, vale até o fim da rodada (ver seção 14 do design)
addPriceMod('rbuf',(p,ctx)=>{
  const k=ctx.kind;
  if(rbufOn('ore')&&(k==='weapon'||k==='ammo'||k==='repair'))return p*0.8;
  if(rbufOn('gold')&&(k==='recruit'||k==='heal'))return p*0.8;
  if(rbufOn('food')&&k==='soldierup')return p*0.8;
  // debuffs (faltou suprimento): preços sobem; a quantidade a suprir não muda
  if(debOn('food')&&(k==='recruit'||k==='soldierup'))p*=2;
  if(debOn('ore')&&(k==='weapon'||k==='ammo'||k==='repair'))p*=2;
  if(debOn('food')&&k==='tavern')p*=2;                 // pratos da taverna
  if(debOn('wood')&&k==='buy')p*=2;                     // Loja
  if(debOn('gold')&&k==='heal')p*=2;                    // itens de cura
  return p;
},60);
const qPay=q=>Math.round(q.reward*(rbufOn('wood')?1.1:1)*(debOn('wood')?0.2:1));   // madeira entregue: missões pagam 10% a mais

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
    const e={type,pct:{},pf:type==='port'?rng.pick(RES4):type,ps:'',got:{},carry:{}};
    if(type==='port'){do{e.ps=rng.pick(RES4)}while(e.ps===e.pf);e.pct=portPct(e.pf,e.ps)}
    else{   // foco = 0%; as outras três necessidades sorteiam 200/150/100
      const others=RES4.filter(r=>r!==type),lv=[200,150,100];
      for(let i=lv.length-1;i>0;i--){const j=rng.int(0,i);const t=lv[i];lv[i]=lv[j];lv[j]=t}
      e.pct[type]=0;others.forEach((r,i)=>e.pct[r]=lv[i]);
    }
    rd.cities[c.id]=e;
  }
  for(const c of WORLD.cities)whOf(c);   // cada cidade tem o seu armazém (salvamentos antigos ganham um vazio)
  if(!rd.routes)rd.routes=[];if(!rd.rbuf)rd.rbuf={};if(!rd.report)rd.report=[];if(!rd.lvl)rd.lvl=1;if(rd.actions===undefined)rd.actions=maxActions();
}
// necessidade (em unidades) de um recurso numa cidade; uma caravana que traz o foco do parceiro zera a necessidade dele
function pctOf(c,res){
  const e=ec(c);let pct=e.pct[res]||0;
  for(const r of STATE.rd.routes){
    if(r.a!==c.id&&r.b!==c.id)continue;
    const o=WORLD.cities[r.a===c.id?r.b:r.a];if(focusOf(o)===res)pct=0;
  }
  return pct;
}
const needOf=(c,res)=>Math.round(pctOf(c,res)*(res==='gold'?1:0.1));   // recursos 1 para 1: 100% = 10 (ou 100 de ouro)
// recursos do mais abundante (necessidade 0) ao menos abundante (necessidade 200%) nesta rodada
const abundOf=c=>RES4.slice().sort((a,b)=>pctOf(c,a)-pctOf(c,b)||RES4.indexOf(a)-RES4.indexOf(b));
const abundHtml=c=>abundOf(c).map((r,i)=>'<span title="'+resName(r)+': necessidade '+pctOf(c,r)+'%">'+resIcon(r)+'</span>').join(' › ');
const gotOf=(c,r)=>ec(c).got[r]||0,carryOf=(c,r)=>ec(c).carry[r]||0;   // got = entregue nesta rodada; carry = o que já estava nos slots no início dela
const missingOf=(c,r)=>Math.max(0,needOf(c,r)-storedOf(c,r));
const cityMet=c=>RES4.every(r=>missingOf(c,r)===0);
const hasRoute=c=>STATE.rd.routes.some(r=>r.a===c.id||r.b===c.id);
const prodOf=c=>(5+Math.max(1,c.rank||1))*(focusOf(c)==='gold'?10:1);
const deliverAndRefresh=()=>{computeBuffs();refreshRoundHud()};function computeBuffs(){
  const b={};
  for(const c of playerCities())for(const r of RES4)if(gotOf(c,r)>Math.max(0,needOf(c,r)-carryOf(c,r)))b[r]=true;
  STATE.rd.rbuf=b;
}
function playerPort(){return playerCities().find(c=>ec(c).type==='port')}

// ---------- fim da rodada ----------
function endRound(city){
  if(STATE.phase==='leader'||G.office||P.dead)return false;
  const rd=STATE.rd,rep=[];
  const pcs=playerCities(),debuf={};
  const prep=STATE.round<1;   // rodada 0: preparação, sem cobrança nem produção
  if(prep)rep.push('Rodada 0 (preparação): sem cobrança e sem produção. A contagem começa agora, na rodada 1.');
  else for(const c of pcs){
    const e=ec(c),carry2={};if(!e.debt)e.debt={};
    for(const r of RES4){
      const need=needOf(c,r),cover=storedOf(c,r),short=Math.max(0,need-cover);
      if(short>0){e.debt[r]=(e.debt[r]||0)+short;debuf[r]=true;rep.push('⚠ '+c.name+': faltaram '+short+' de '+resName(r).toLowerCase()+(r==='gold'?' (dívida de ouro; debuff nesta rodada).':' (dívida em itens; debuff nesta rodada).'))}
      consumeSupply(c,r,Math.min(need,cover));   // o que a cidade precisa é consumido (destruído); a necessidade da rodada seguinte é a mesma
      const extra=storedOf(c,r);   // o que sobrar paga a dívida em itens e, se ainda sobrar, adianta a próxima rodada
      if(extra>0&&e.debt[r]>0){const pay=Math.min(extra,e.debt[r]);consumeSupply(c,r,pay);e.debt[r]-=pay;if(e.debt[r]<=0)delete e.debt[r];rep.push('✔ '+c.name+' pagou '+pay+' de '+resName(r).toLowerCase()+' da dívida.')}
      const left=storedOf(c,r);if(left>0)carry2[r]=left;    }
    e.got={};e.carry=carry2;
    const f=focusOf(c),amt=prodOf(c);
    if(hasRoute(c))rep.push('🛒 '+c.name+': a produção de '+resName(f).toLowerCase()+' ('+amt+') seguiu por caravana.');
    else{const got=prodAdd(c,f,amt);rep.push('✔ '+c.name+' produziu '+got+' de '+resName(f).toLowerCase()+(f==='gold'?' (no cofre do armazém).':' (na reserva do armazém).'))}
  }
  rd.debuff=prep?(rd.debuff||{}):debuf;   // debuffs valem na rodada que começa (a necessidade não muda)
  rd.rbuf={};if(prep)computeBuffs();   // o que foi entregue na rodada 0 já vale para a rodada 1
  rd.hallCity=(city||WORLD.home).id;rd.report=rep;
  STATE.round++;Hooks.emit('round',STATE.round);
  beginLeaderTurn();
  return true;
}
function beginLeaderTurn(){
  STATE.phase='leader';STATE.rd.actions=maxActions();
  if(OFFICE.ok)enterOffice();else{toast('📖 Turno do líder: abra o livro de decisões na prefeitura.',4000);if(G.running)openBook()}
}
function finishLeaderTurn(){
  for(const c of WORLD.cities){const e=ec(c);if(e.type==='port'&&e.nf){if(e.pf!==e.nf){const lost=moveProdToStore(c);if(lost&&c.owner==='player')toast('⚓ '+c.name+': a abundância mudou. '+lost+'.',4000)}e.pf=e.nf;e.ps=e.ns;e.pct=portPct(e.pf,e.ps)}delete e.nf;delete e.ns}   // a nova distribuição do porto só vale agora
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
  OFFICE.desk={x:ox+mx,z:oz+3.1};OFFICE.spawn={x:ox+mx,z:oz+Dp-4.2};OFFICE.ok=true;
}
const nearBook=()=>!!(G.office&&OFFICE.desk&&Math.hypot(P.x-OFFICE.desk.x,P.z-OFFICE.desk.z)<5.5);   // alcance generoso: basta estar diante da mesa
function inOfficeRoom(){return OFFICE.ok&&P.y<UNDER_Y&&P.x>=OFFICE.ox-1&&P.x<=OFFICE.ox+OFFICE.Wd+1&&P.z>=OFFICE.oz-1&&P.z<=OFFICE.oz+OFFICE.Dp+1}
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
function enterOffice(silent){
  if(G.office||!OFFICE.ok)return;
  initOffice();
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
    const near=nearBook();
    $('officehint').textContent=near?'📖 [E] ou clique: abrir o livro':'📖 Chegue perto da mesa e aperte E (ou clique) para abrir o livro';
  }
  rdT-=dt;if(rdT<=0){rdT=0.5;refreshRoundHud()}
  for(const m of CARAVANS)m.group.visible=Math.hypot(m.x-P.x,m.z-P.z)<250;
}
function refreshRoundHud(){
  const el=$('rdline');if(!el||!STATE.rd)return;
  const b=STATE.rd.rbuf||{},t={food:'soldados −20%',ore:'armas −20%',gold:'recrutar/curar −20%',wood:'obras −10%, missões +10%'};
  const deb=Object.keys(STATE.rd.debuff||{});
  el.innerHTML='📖 Rodada '+STATE.round+(STATE.round<1?' • preparação':STATE.phase==='leader'?' • turno do líder':' • turno do comandante')+Object.keys(b).map(r=>'<br><small>'+resIcon(r)+' '+t[r]+'</small>').join('')+deb.map(r=>'<br><small style="color:#ff9a9a">⚠ '+resIcon(r)+' '+DEB_TXT[r]+'</small>').join('');
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

function renderDeposit(){const el=document.getElementById('invdeposit');if(el)el.innerHTML='<p class="st">Madeira, minério e comida são itens: entregue-os à cidade no <b>armazém</b>.</p>'}
// ---------- livro: bolsa + livro do prefeito (tecla B) ----------
const LB={top:'book',tab:'resumo',city:null,ra:null,rb:null};
const LSUBS=[['resumo','📜 Resumo'],['cidades','🏘 Cidades'],['caravanas','🛒 Caravanas'],['capital','🏛 Capital']];
const INV_L='<h3>🎒 Bolsa</h3><div id="invinfo" class="ldsm"></div><b class="st">Armas e vara — teclas 1–6</b><div id="invwbar"></div><b class="st" style="display:block;margin-top:8px">Curas — teclas 7–9</b><div id="invcbar"></div><b class="st" style="display:block;margin-top:8px">Bolsa</b><div id="invgrid"></div>';
const INV_R='<div id="invdetail"></div><div id="invpending"></div><div id="invdeposit"></div>';
function openBook(top,tab){
  if(G.office)top='book';
  if(top)LB.top=top;if(tab)LB.tab=tab;
  if(LB.city===null||!WORLD.cities[LB.city]||WORLD.cities[LB.city].owner!=='player')LB.city=WORLD.home.id;
  if(LB.top==='inv'){G.invSel=null;G.pendSel=null}
  openPanel('ldbook');renderBook();
}
const isLeader=()=>STATE.phase==='leader';
const actionsHtml=()=>'<span style="color:#8a4a10;letter-spacing:2px">'+'◆'.repeat(STATE.rd.actions)+'◇'.repeat(Math.max(0,maxActions()-STATE.rd.actions))+'</span> ('+STATE.rd.actions+'/'+maxActions()+')';
function stockHtml(){return '<p>'+resIcon('gold')+' Ouro com você: <b>'+P.coins+'</b></p>'}
function typeLabel(c){const e=ec(c);return e.type==='port'?'⚓ Porto (produz '+resIcon(e.pf)+' '+resName(e.pf).toLowerCase()+')':resIcon(e.type)+' '+TYPE_NAME[e.type]}
const needsLine=c=>RES4.map(r=>resIcon(r)+needOf(c,r)).join(' ');
const routeName=r=>WORLD.cities[r.a].name+' ⇄ '+WORLD.cities[r.b].name;
const leaderOnly=()=>isLeader()?'':'<p class="ldsm">🔒 Esta decisão só pode ser tomada no <b>turno do líder</b> (no escritório).</p>';
function bookPages(){
  const rd=STATE.rd,pcs=playerCities();
  if(LB.tab==='resumo'){
    const turn=STATE.round<1?'Preparação (nenhuma decisão necessária)':isLeader()?'Turno do líder':'Turno do comandante';
    const port=playerPort(),hasWorldPort=WORLD.cities.some(c=>ec(c).type==='port');
    const L='<h3>Rodada '+STATE.round+'</h3><p>'+turn+'</p>'+(isLeader()?'<p>Ações do líder: '+actionsHtml()+'</p>':'')
      +'<h4>Seu ouro</h4>'+stockHtml()
      +'<h4>Cidades dominadas</h4>'+pcs.map(c=>'<p style="margin:3px 0"><b>'+(c.home?'🏛 ':'')+c.name+'</b> — '+typeLabel(c)+'<br><small>abundância: '+abundHtml(c)+'<br>precisa: '+needsLine(c)+'<br>no armazém: '+RES4.map(r=>resIcon(r)+storedOf(c,r)).join(' ')+' • '+(cityMet(c)?'<span class="ldok">✔ suprida</span>':'<span class="ldbad">⚠ faltam recursos</span>')+'</small></p>').join('');
    const R='<h3>Caravanas ativas</h3>'+(rd.routes.length?'<ul class="ldul">'+rd.routes.map(r=>'<li>'+routeName(r)+'</li>').join('')+'</ul>':'<p>Nenhuma caravana.</p>')
      +(STATE.round<1?'<h4>Rodada 0</h4><p class="ldsm">Não há decisões agora e nada é cobrado: a contagem começa na rodada 1. Veja de que suprimentos cada cidade precisa (aba <b>Cidades</b>) e comece a juntá-los: compre na loja ou ache na natureza (caça, pesca, baús) e entregue no <b>armazém</b> de cada cidade. Quando estiver pronto, encerre a rodada no quadro da prefeitura.</p>'
        :'<h4>Relatório da rodada anterior</h4>'+(rd.report.length?'<ul class="ldul">'+rd.report.map(t=>'<li>'+t+'</li>').join('')+'</ul>':'<p>Nada a relatar.</p>'))
      +(port||!hasWorldPort?'':'<p class="ldwarn">⚓ Você ainda não tem um porto. Ele fica na cidade mais forte do mapa.</p>');
    return[L,R];
  }
  if(LB.tab==='cidades'){
    const L='<h3>Suas cidades</h3>'+pcs.map(c=>'<button class="ldcity'+(c.id===LB.city?' sel':'')+'" data-a="city" data-id="'+c.id+'"><span>'+(c.home?'🏛 ':'')+c.name+'</span><small>'+typeLabel(c)+'</small><em>'+(cityMet(c)?'✔ suprida':'⚠ faltam recursos')+'</em></button>').join('');
    const c=WORLD.cities[LB.city];let R='';
    if(c&&c.owner==='player'){
      const e=ec(c);
      const w=whOf(c);
      R='<h3>'+c.name+'</h3><p>'+typeLabel(c)+'</p><table class="ldt">'+RES4.map(r=>{
        const need=needOf(c,r),st=storedOf(c,r),g=gotOf(c,r),cy=carryOf(c,r),miss=missingOf(c,r);
        const state=need===0&&st===0?'<span class="ldok">não precisa</span>':miss>0?'<span class="ldbad">falta '+miss+'</span>':(g>Math.max(0,need-cy)?'<span class="ldok">★ bônus</span>':'<span class="ldok">✔</span>');
        return '<tr><td>'+resIcon(r)+' <b>'+resName(r)+'</b><br><small>precisa '+need+' • no armazém '+st+(cy?' (+'+cy+' da rodada anterior)':'')+(((e.debt||{})[r])?' • <b class="ldbad">dívida '+e.debt[r]+'</b>':'')+'</small></td><td>'+state+'</td></tr>';
      }).join('')+'</table><p class="ldsm">Para suprir a cidade, entregue os itens no <b>armazém</b> (edifício da cidade). Entregar acima da necessidade dá o bônus da rodada; o excedente fica para a próxima.</p>'
        +'<p class="ldsm">Reserva de produção: '+(w.prod?itemDef(w.prod.id).icon+' '+itemDef(w.prod.id).name+' ×'+w.prod.n:'vazia')+' • Cofre: ◉ '+w.vault+'</p>';
      R+='<p class="ldsm">Abundância (do mais ao menos abundante nesta rodada):<br><b>'+abundHtml(c)+'</b></p>';
      if(e.type==='port'){
        if(isLeader()){
          const cf=e.nf||e.pf,cs=e.ns||e.ps,chg=(cf!==e.pf||cs!==e.ps);
          R+='<h4>Distribuição do porto</h4><p class="ldsm">Escolha livremente o que o porto produz e o que lhe falta. A mudança só vale quando você encerrar o turno.'+(chg?'<br><b>Pendente:</b> produz '+resIcon(cf)+', falta '+resIcon(cs)+'.':'')+'</p>'
            +'<div>Produz: '+RES4.map(r=>'<button class="ldmini'+(cf===r?' sel':'')+'" data-a="pf" data-r="'+r+'">'+resIcon(r)+'</button>').join('')+'</div>'
            +'<div>Falta: '+RES4.map(r=>'<button class="ldmini'+(cs===r?' sel':'')+'" data-a="ps" data-r="'+r+'">'+resIcon(r)+'</button>').join('')+'</div>';
        }else R+='<p class="ldsm">⚓ O porto produz '+resIcon(e.pf)+' e lhe falta '+resIcon(e.ps)+'. Essa distribuição só muda no turno do líder.</p>';
      }
    }    return[L,R];
  }
  if(LB.tab==='caravanas'){
    const L='<h3>Caravanas ativas</h3>'+(rd.routes.length?rd.routes.map((r,i)=>{const A=WORLD.cities[r.a],B=WORLD.cities[r.b];
      return '<div class="ldroute"><b>'+routeName(r)+'</b><br><small>'+A.name+' recebe '+resIcon(focusOf(B))+' • '+B.name+' recebe '+resIcon(focusOf(A))+'</small><br><button data-a="unroute" data-i="'+i+'" '+(isLeader()?'':'disabled')+'>Desfazer</button></div>'}).join(''):'<p>Nenhuma caravana ainda.</p>')
      +'<p class="ldsm">A cidade que recebe o produto da outra passa a ter necessidade 0 dele. A produção levada pela caravana não vai para o armazém.</p>';
    const R='<h3>Nova caravana</h3><p>Escolha no <b>mapa</b> a cidade de <b>origem</b> (uma das suas) e a de <b>destino</b> (sua, aliada ou neutra). A sua cidade passa a receber o produto do destino por caravana (necessidade 0 dele).</p>'
      +'<p>Preço: <b>◉ '+CARAVAN_COST+'</b></p><button data-a="route" class="gold" '+(isLeader()&&Ledger.canAfford({gold:CARAVAN_COST})?'':'disabled')+'>🗺 Escolher no mapa</button>'+leaderOnly()+(Ledger.anyDebt()?'<p class="ldwarn">Com dívida não é possível comprar.</p>':'');    return[L,R];
  }
  const lvl=rd.lvl,cost=capCost(),can=isLeader()&&lvl<CAP_MAX_LVL&&rd.actions>=1;
  const L='<h3>'+WORLD.home.name+' — a capital</h3><p>Nível do líder: <b>'+lvl+'</b> / '+CAP_MAX_LVL+'</p><p>Ações por rodada: <b>'+maxActions()+'</b></p><p class="ldsm">A capital evolui até virar uma cidade fortificada. Cada nível aumenta o número de ações do líder por rodada.</p>';
  const R='<h3>Evoluir a capital</h3>'+(lvl>=CAP_MAX_LVL?'<p>A capital já é uma cidade fortificada.</p>':'<p>Próximo nível: <b>'+(lvl+1)+'</b> (+1 ação por rodada, a partir da próxima rodada).</p><p>Custo: <b>◉ '+cost.gold+'</b> + 1 ação</p><button data-a="cap" '+(can&&Ledger.canAfford(cost)?'':'disabled')+'>Evoluir</button>'+leaderOnly()+(Ledger.anyDebt()?'<p class="ldwarn">Com dívida não é possível comprar.</p>':''));
  return[L,R];
}
const CARAVAN_COST=200;
const capCost=()=>({gold:300*STATE.rd.lvl});
function renderBook(){
  const inv=LB.top==='inv'&&!G.office;if(!inv&&LB.top==='inv')LB.top='book';
  $('ldsub').style.display=inv?'none':'flex';
  $('ldsub').innerHTML=LSUBS.map(t=>'<button class="'+(LB.tab===t[0]?'sel':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('');
  if(inv){$('ldL').innerHTML=INV_L;$('ldR').innerHTML=INV_R;renderInventory()}
  else{const [L,R]=bookPages();$('ldL').innerHTML=L;$('ldR').innerHTML=R}
  $('ldtabs').innerHTML=G.office?'':[['inv','🎒','Bolsa'],['book','📖','Livro']].map(t=>'<button class="'+((inv?'inv':'book')===t[0]?'sel':'')+'" data-top="'+t[0]+'">'+t[1]+'<br><small>'+t[2]+'</small></button>').join('');
  $('lddone').style.display=(isLeader()||G.office)?'':'none';$('lddone').textContent='✔ Encerrar turno';
}
function bookClick(e){
  const t=e.target.closest('button');if(!t||!$('ldbook').contains(t))return;
  const rd=STATE.rd,a=t.dataset.a;
  if(t.dataset.top){LB.top=t.dataset.top;G.invSel=null;G.pendSel=null;renderBook();return}
  if(t.dataset.tab){LB.tab=t.dataset.tab;LB.top='book';renderBook();return}
  if(t.id==='lddone'){if(isLeader())finishLeaderTurn();else{closePanel();leaveOffice()}return}
  if(t.id==='ldclose'){closePanel();return}
  if(LB.top==='inv')return;   // botões da bolsa têm seus próprios tratadores
  const c=WORLD.cities[LB.city];
  if(a==='city'){LB.city=+t.dataset.id}
  else if(a==='pf'||a==='ps'){const en=ec(c);if(isLeader()&&en.type==='port'){let cf=en.nf||en.pf,cs=en.ns||en.ps;const r=t.dataset.r;if(a==='pf'){if(r===cs)cs=cf;cf=r}else{if(r===cf)cf=cs;cs=r}en.nf=cf;en.ns=cs}}
  else if(a==='unroute'){if(isLeader()){rd.routes.splice(+t.dataset.i,1);rebuildCaravans();computeBuffs()}}
  else if(a==='route'){if(!isLeader())toast('Caravanas só no turno do líder.',2000);else{startCaravanPick();return}}
  else if(a==='cap'){
    const cost=capCost();
    if(isLeader()&&rd.lvl<CAP_MAX_LVL&&rd.actions>=1&&Ledger.spend(cost)){rd.actions--;rd.lvl++;sfx('win',0);toast('🏛 A capital evoluiu! Nível '+rd.lvl+': mais ações a partir da próxima rodada.',3500)}
  }
  renderBook();
}
document.addEventListener('click',e=>{if(e.target.closest('#ldbook'))bookClick(e)});


// botão "Encerrar a rodada" no quadro da prefeitura
function hallRoundAction(c){
  if(STATE.phase==='leader'){closePanel();openBook('book','resumo');return}
  if(RAID.active){toast('Há um ataque em andamento! Defenda a cidade antes de encerrar a rodada.',3000);return}
  const rnd=STATE.round<1?'rodada 0, preparação':'rodada '+STATE.round;
  UI.confirm('Encerrar o turno do comandante ('+rnd+')? '+(STATE.round<1?'Nada é cobrado. ':'As cidades produzem e cobram as necessidades (o que faltar vira dívida). ')+'Depois você decide no escritório.',()=>{closePanel();endRound(c)},'Encerrar');
}

// início da partida: o jogador começa dentro da prefeitura da capital, de frente para o quadro
function placeAtHall(){
  const c=WORLD.home,o=c.hall;if(!o)return;
  for(const d of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
    const x=o.x+d[0],z=o.z+d[1];probe(x,z,0.5,tH(x,z)+0.05,1.8,1.05);
    if(!GR.blocked){const out=c.hallOut||{x:o.x,z:o.z+3};P.x=x;P.z=z;P.y=GR.g;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(o.x-out.x),-(o.z-out.z));P.pitch=0;return}
  }
}

// ---------- caravana: origem e destino escolhidos no mapa ----------
const MP={on:false,step:0,a:null};
function startCaravanPick(){
  MP.on=true;MP.step=1;MP.a=null;
  openPanel('map');drawBigMap();updatePickBanner();
}
function updatePickBanner(){
  let el=document.getElementById('mappick');
  if(!el){el=document.createElement('div');el.id='mappick';el.style.cssText='margin:6px 0;padding:8px 12px;background:#4a2a12;border:3px solid #1e1006;color:#ffe9b0;font-size:16px';const cv=document.getElementById('bigmap');cv.parentNode.insertBefore(el,cv)}
  el.style.display=MP.on?'block':'none';
  if(MP.on)el.innerHTML=MP.step===1?'🛒 <b>Caravana</b> — clique no mapa na cidade de <b>ORIGEM</b> (uma das suas). Feche o mapa (M) para cancelar.':'🛒 Origem: <b>'+WORLD.cities[MP.a].name+'</b>. Agora clique na cidade de <b>DESTINO</b>. (clique de novo na origem para trocá-la)';
}
function drawPickOverlay(g,s){
  if(!MP.on)return;
  for(const c of WORLD.cities){
    const ok=MP.step===1?c.owner==='player':c.id!==MP.a;
    g.strokeStyle=c.id===MP.a?'#5aff7a':ok?'#ffd23a':'#555';g.lineWidth=c.id===MP.a?5:3;
    g.beginPath();g.arc(c.cx*s,c.cz*s,16,0,6.283);g.stroke();
  }
  if(MP.a!==null){const A=WORLD.cities[MP.a];g.strokeStyle='#5aff7a';g.setLineDash([6,5]);g.lineWidth=2;g.beginPath();g.moveTo(A.cx*s,A.cz*s);if(MP.hover!==undefined){const B=WORLD.cities[MP.hover];g.lineTo(B.cx*s,B.cz*s)}g.stroke();g.setLineDash([])}
}
function pickCityAt(e){
  const cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W;
  const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
  let best=null,bd=26;for(const c of WORLD.cities){const d=Math.hypot(c.cx*s-x,c.cz*s-y);if(d<bd){bd=d;best=c}}
  return best;
}
function buyCaravan(A,B){
  const rd=STATE.rd;
  if(!isLeader())toast('Caravanas só no turno do líder.',2000);
  else if(!A||!B||A===B)toast('Escolha duas cidades diferentes.',2000);
  else if(rd.routes.some(r=>(r.a===A.id&&r.b===B.id)||(r.a===B.id&&r.b===A.id)))toast('Já existe uma caravana entre elas.',2500);
  else if(focusOf(A)===focusOf(B))toast('As duas produzem o mesmo recurso: a caravana seria inútil.',2800);
  else if(!Ledger.spend({gold:CARAVAN_COST}))toast('Ouro insuficiente (ou você está em dívida).',2500);
  else{rd.routes.push({a:A.id,b:B.id});rebuildCaravans();computeBuffs();sfx('win',0);toast('🛒 Duas caravanas partiram entre '+A.name+' e '+B.name+'. (−◉'+CARAVAN_COST+')',3500)}
}
document.addEventListener('click',e=>{
  if(!MP.on||G.panel!=='map'||e.target.id!=='bigmap')return;
  const c=pickCityAt(e);if(!c)return;
  if(MP.step===1){
    if(c.owner!=='player'){toast('A origem precisa ser uma cidade sua.',2000);return}
    MP.a=c.id;MP.step=2;drawBigMap();updatePickBanner();return;
  }
  if(c.id===MP.a){MP.a=null;MP.step=1;drawBigMap();updatePickBanner();return}
  const A=WORLD.cities[MP.a];
  UI.confirm('Montar uma caravana de '+A.name+' para '+c.name+' por ◉'+CARAVAN_COST+'? '+A.name+' passará a receber '+resName(focusOf(c)).toLowerCase()+' por ela.',()=>{
    MP.on=false;updatePickBanner();buyCaravan(A,c);openBook('book','caravanas');
  },'Comprar');
});
document.addEventListener('mousemove',e=>{
  if(!MP.on||MP.step!==2||G.panel!=='map'||e.target.id!=='bigmap')return;
  const c=pickCityAt(e),h=c&&c.id!==MP.a?c.id:undefined;if(h!==MP.hover){MP.hover=h;drawBigMap()}
});