'use strict';
// ---------- Fase 6, POIs fatia 3: binóculo, moradores, serviços (taverneiro, ferreiro, curtume) e POIs de guerra ----------
// Complementa js/poigame.js (carregado antes). Números juntos em POIX (acrescentados abaixo). Ver docs/fase-6-guerra.md.
Object.assign(POIX,{
  binoc:{range:300,hours:1,max:3,w:{poi:10,ruins:15,chest:20,portal:25,camp:30}},   // alcance (blocos), horas por uso, usos por rodada e peso de cada achado (do mais raro ao mais comum)
  civDelay:1,   // moradores aparecem N rodadas depois da conquista (conquistou na rodada N, aparecem na N+1)
  guards:{fort:4,fortcamp:4,bridge:3,tower:2,def:2},   // soldados que moram no POI (a ponte tem só soldados)
  civ:{farm:3,mine:3,sawmill:3,tannery:2,granary:3,forge:1,fort:3,tavern:0,tower:0,bridge:0,fortcamp:0,trench:0},   // civis que andam pelo POI (fora os de serviço e os da taverna)
  anvil:[3,3,7,5,12,18],   // sucata para reparar 100% da durabilidade de cada arma na bigorna (proporcional ao que falta, no mínimo 1)
  vest:{base:180,leather:5}   // reparo do colete no curtume: 35% do preço de um colete novo (como as armas) em ◉, ou este tanto de couro para 100%
});

// ---------- POIs de guerra: só existem durante a guerra ----------
// (acampamento fortificado e trincheira): sem guerra não contam, não rendem, não aparecem nos mapas nem têm guarnição. No mapa manual (?cenario=pois) ficam ligados para teste.
function poiWarOn(){
  if(new URLSearchParams(location.search).get('cenario')==='pois')return true;
  return (WORLD.factions||[]).some(f=>!f.player&&relOf(f.id).war);
}
function poiLive(p){return !POI_DEFS[p.type].war||poiWarOn()}
const _poiGarrisonSync=poiGarrisonSync;
poiGarrisonSync=function(p){
  if(!p.show&&!poiLive(p)){if(POI_READY)poiGarrisonRemove(p);poiCivSync(p);return}
  _poiGarrisonSync(p);
};

// ---------- moradores: soldados e civis (aparecem na rodada seguinte à conquista) ----------
function poiOwnerChanged(p,o){   // chamado por poiSetOwner (pois.js)
  if(!POI_READY||p.show)return;const X=poiX();if(!X.since)X.since={};
  if(o==='player'||typeof o==='number')X.since[p.id]=STATE.round;else delete X.since[p.id];
}
function poiCivRemove(p){if(!p.civ)return;for(const n of p.civ.npcs){n.alive=false;n.gone=true;scene.remove(n.group)}p.civ=null}
function poiCivSync(p){
  if(!POI_READY||p.type==='ruins')return;
  const o=p.owner,friendly=o==='player'||typeof o==='number',fid=o==='player'?0:o,X=poiX(),sn=X.since&&X.since[p.id];
  const ready=friendly&&poiLive(p)&&!(sn!==undefined&&STATE.round<sn+POIX.civDelay);
  if(p.civ&&(!ready||p.civ.fid!==fid))poiCivRemove(p);
  if(!ready||p.civ)return;
  const d=POI_DEFS[p.type],ring=(k,n,f)=>{const a=k*6.283/n+0.7,q=freeSpot(p.cx+Math.cos(a)*d.r*f,p.cz+Math.sin(a)*d.r*f,0.3,1.8,0.45);return{a,x:q[0],z:q[1]}};
  p.civ={id:2000+p.id,biome:p.biome,owner:o==='player'?'player':'enemy',fid,npcs:[],kind:'poiciv',cx:p.cx,cz:p.cz,half:12,enemies:[],state:'idle',walk:[]};
  for(let k=0;k<6;k++){const w=ring(k,6,0.5);p.civ.walk.push({x:w.x,z:w.z})}   // pontos por onde os civis caminham
  const ng=POIX.guards[p.type]||POIX.guards.def;
  for(let i=0;i<ng;i++){const w=ring(i,ng,0.45);spawnNpc(p.civ,{role:'guard',x:w.x,z:w.z,y:p.y,yaw:w.a,stationary:true})}
  for(let i=0;i<(POIX.civ[p.type]||0);i++){const w=ring(i*2+1,Math.max(6,(POIX.civ[p.type]||0)*2),0.3+0.15*(i%2));spawnNpc(p.civ,{role:'civ',x:w.x,z:w.z,y:p.y,yaw:w.a})}
  p.civ.svc={};
  for(const s of p.svcSpec||[])p.civ.svc[s.kind]=spawnNpc(p.civ,{role:s.role,x:s.x,z:s.z,y:p.y,yaw:s.yaw||0,stationary:true});
  if(p.type==='tavern')for(const k of p.keepers||[])spawnNpc(p.civ,{role:k.role,x:k.x,z:k.z,y:p.y,yaw:k.yaw,stationary:true,sit:k.sit});
}
Hooks.on('round',()=>{for(const p of WORLD.pois||[]){if(POI_DEFS[p.type].war)poiGarrisonSync(p);else poiCivSync(p)}});   // moradores novos aparecem no início da rodada

// pontos de serviço: o ferreiro e a bigorna na ferraria, o curtidor no curtume (posições locais do desenho; yaw: para onde olha)
const _bForge=POI_BUILD.forge,_bTan=POI_BUILD.tannery;
POI_BUILD.forge=function(c,rng,p){_bForge(c,rng,p);p.anvil={x:c.cx+2.55,y:c.y+0.8,z:c.cz+2.1};p.svcSpec=[{kind:'smith',role:'smith',label:'Ferreiro: pagar conserto de arma',x:c.cx+2.8,z:c.cz+4.3,yaw:Math.PI}]};
POI_BUILD.tannery=function(c,rng,p){_bTan(c,rng,p);p.svcSpec=[{kind:'tanner',role:'tanner',label:'Curtidor: reparar o colete',x:c.cx+4.0,z:c.cz+4.8,yaw:0}]};

// ---------- cidade de referência para preços e serviço disponível ----------
function poiPriceCity(p){
  if(p.owner==='player')return WORLD.home;
  let best=null,bd=1e9;for(const c of facCities(p.owner)){const d=Math.hypot(c.cx-p.cx,c.cz-p.cz);if(d<bd){bd=d;best=c}}
  return best||WORLD.home;
}
function poiSvcOk(p){   // serviços: POI seu ou de uma facção que não é inimiga nem está em guerra com você, e só com os moradores já presentes
  if(!p.civ)return false;
  if(p.owner==='player')return true;
  return typeof p.owner==='number'&&relStatus(p.owner)!=='war'&&relStatus(p.owner)!=='enemy';
}
const poiRoomCost=p=>Math.max(1,Math.round(priceOf(POIX.roomCost,{city:poiPriceCity(p),kind:'tavern'})));

// ---------- painel de serviço (tela simples, como a clínica) ----------
let SVC=null;
function svcOpen(title,render){SVC={title,render};openPanel('svc');svcRender()}
function svcRender(){
  if(!SVC)return;$('svctitle').textContent=SVC.title;$('svctxt').innerHTML='';$('svcbody').innerHTML='';
  SVC.render($('svctxt'),$('svcbody'));
}
document.getElementById('svcclose').onclick=()=>{SVC=null;closePanel()};
const svcWeaponRows=(body,extra)=>{   // uma carta por arma que você tem
  WEAPONS.forEach((w,i)=>{
    if(!WS.owned[i])return;
    const card=document.createElement('div');card.className='card';
    card.innerHTML='<b>'+(i+1)+'. '+wName(i)+'</b><div class="st">Durabilidade: '+(weaponBroken(i)?'<b style="color:#ff6a6a">QUEBRADA</b>':Math.round(durOf(i))+'%')+'</div>';
    extra(card,i);body.appendChild(card);
  });
};

// ferreiro: paga o conserto (mesmo preço e efeitos do armeiro)
function svcSmith(p){
  const c=poiPriceCity(p);
  svcOpen('⚒ FERREIRO',(txt,body)=>{
    txt.innerHTML='— Traga a arma que eu devolvo como nova. Moedas: <b>◉ '+P.coins+'</b>'+(p.owner==='player'?'<br><small>Dica: a bigorna da sua ferraria conserta de graça com sucata.</small>':'');
    svcWeaponRows(body,(card,i)=>{
      const cost=repairCost(i,c),dmg=durOf(i)<100;
      if(dmg)card.insertAdjacentHTML('beforeend',tagLine(priceTag(c,'repair','Conserto')));
      const b=UI.button(dmg?'🔧 Consertar ◉'+cost+(P.coins<cost?' (gera dívida)':''):'Em perfeito estado','gold',()=>{repairWeapon(i,c);svcRender()});
      b.disabled=!dmg;card.appendChild(b);
    });
  });
}
// bigorna da ferraria sua: conserta gastando sucata
const anvilParts=i=>Math.max(1,Math.ceil((POIX.anvil[i]||6)*(100-durOf(i))/100));
function svcAnvil(p){
  svcOpen('🔨 BIGORNA',(txt,body)=>{
    txt.innerHTML='Martele a arma com peças de metal. Sucata na bolsa: <b>🔩 '+invCount('sucata')+'</b>';
    svcWeaponRows(body,(card,i)=>{
      const n=anvilParts(i),dmg=durOf(i)<100;
      card.insertAdjacentHTML('beforeend','<div class="st">Custo para consertar tudo: '+(dmg?'<b>🔩 '+n+'</b>':'—')+' (100% = '+(POIX.anvil[i]||6)+')</div>');
      const b=UI.button(dmg?'🔨 Reparar com '+n+' sucata'+(n>1?'s':''):'Em perfeito estado','gold',()=>{
        if(invCount('sucata')<n){toast('Sucata insuficiente: faltam '+(n-invCount('sucata'))+'.',2500);return}
        invRemove('sucata',n);STATE.dur[i]=100;sfx('coin',0);toast('🔨 '+wName(i)+' reparada na bigorna (−'+n+' sucata).',2500);svcRender();
      });
      b.disabled=!dmg||invCount('sucata')<n;card.appendChild(b);
    });
  });
}
// curtume: repara o colete (em ◉ ou em couro)
function svcTanner(p){
  const c=poiPriceCity(p);
  svcOpen('🟤 CURTIDOR',(txt,body)=>{
    const miss=Math.max(0,Math.ceil(100-P.armor)),gold=Math.max(5,Math.round(priceOf(Math.max(5,Math.round(POIX.vest.base*0.35*miss/100)),{city:c,kind:'vest'}))),lea=Math.max(1,Math.ceil(POIX.vest.leather*miss/100));
    txt.innerHTML='— Couro bom aguenta muito tiro. Colete: <b>'+Math.ceil(P.armor)+'/100</b> • Moedas: <b>◉ '+P.coins+'</b> • Couro na bolsa: <b>🟤 '+invCount('couro')+'</b>';
    if(miss<=0){body.innerHTML='<p>O seu colete está inteiro (ou você não tem um: compre no armeiro).</p>';return}
    body.insertAdjacentHTML('beforeend',tagLine(priceTag(c,'vest','Colete')));
    const b1=UI.button('🛡 Reparar com ouro ◉'+gold,'gold',()=>{if(!Ledger.spend({gold})){toast('Ouro insuficiente.',2000);return}P.armor=100;sfx('coin',0);toast('🛡 Colete reparado (−◉'+gold+').',2500);svcRender()});
    b1.disabled=P.coins<gold||Ledger.anyDebt();body.appendChild(b1);
    const b2=UI.button('🟤 Reparar com '+lea+' couro','gold',()=>{if(invCount('couro')<lea){toast('Couro insuficiente.',2000);return}invRemove('couro',lea);P.armor=100;sfx('coin',0);toast('🛡 Colete reparado (−'+lea+' couro).',2500);svcRender()});
    b2.disabled=invCount('couro')<lea;body.appendChild(b2);
  });
}
// taverneiro: comida e quarto
function svcTavern(p){
  const c=poiPriceCity(p);
  svcOpen('🍺 TAVERNEIRO',(txt,body)=>{
    const X=poiX(),r=X.room,has=r&&r.poi===p.id&&r.round===STATE.round,cost=poiRoomCost(p);
    txt.innerHTML='— Sente-se! Comida quente ou uma cama? Moedas: <b>◉ '+P.coins+'</b>';
    body.appendChild(UI.button('🍲 Comprar comida','gold',()=>openStore(c,'tavern')));
    const b=UI.button(has?'🛏 Quarto reservado (porta aberta, andar de cima)':'🛏 Alugar quarto ◉'+cost,'gold',()=>{
      if(!Ledger.spend({gold:cost})){toast('Ouro insuficiente para o quarto (◉'+cost+').',2500);return}
      X.room={poi:p.id,round:STATE.round};sfx('coin',0);toast('🛏 Quarto reservado (−◉'+cost+'). É o da porta aberta, no andar de cima.',4500);svcRender();
    });
    b.disabled=has;body.appendChild(b);
    if(!has)body.insertAdjacentHTML('beforeend','<p class="st">No quarto, a cama faz a noite virar manhã (ou o dia virar noite) e recupera a vida.</p>');
  });
}

// ---------- interações ----------
const _poiScan=poiScan;
poiScan=function(lines){
  _poiScan(lines);   // vigia, binóculo, balcão e cama (poigame.js)
  let best=null;   // o serviço mais perto de você (o ferreiro e a bigorna ficam próximos)
  const cand=(p,x,z,tg,txt,r)=>{const d=Math.hypot(P.x-x,P.z-z);if(d<r&&Math.abs(P.y-p.y)<2.6&&(!best||d<best.d))best={d,tg,txt}};
  for(const p of WORLD.pois||[]){
    for(const s of p.svcSpec||[])if(poiSvcOk(p)&&p.civ.svc&&p.civ.svc[s.kind]&&p.civ.svc[s.kind].alive)cand(p,s.x,s.z,{type:'poisvc',p,s},s.label,2.4);
    if(p.anvil&&p.owner==='player')cand(p,p.anvil.x,p.anvil.z,{type:'poianvil',p},'Bigorna: reparar arma gastando sucata',2.0);
  }
  if(best){G.target=best.tg;lines.push('[E] '+best.txt)}
};
const _poiAct=poiAct;
poiAct=function(t){
  if(t.type==='poibinoc')return poiBinoc(t.p);
  if(t.type==='poibar')return svcTavern(t.p);
  if(t.type==='poisvc')return t.s.kind==='smith'?svcSmith(t.p):svcTanner(t.p);
  if(t.type==='poianvil')return svcAnvil(t.p);
  return _poiAct(t);
};

// ---------- binóculo da torre: acha coisas num raio; quanto mais raro, menor a chance ----------
// peso (chance): POI < ruínas < baú escondido < portal de dungeon < acampamento de bandidos / caverna de animais
function poiBinoc(p){
  const X=poiX(),B=POIX.binoc,rg=B.range;
  if(!X.bin||X.bin.r!==STATE.round)X.bin={r:STATE.round,n:0,f:{}};
  if(X.bin.n>=B.max)return toast('🔭 Seus olhos cansaram: o binóculo só pode ser usado '+B.max+' vezes por rodada.',3500);
  const near=(x,z)=>Math.hypot(x-p.cx,z-p.cz)<rg,fresh=k=>!X.bin.f[k],pool={poi:[],ruins:[],chest:[],portal:[],camp:[]};
  for(const q of WORLD.pois||[]){
    if(q.show||q===p||!poiLive(q)||!near(q.cx,q.cz))continue;
    if(q.type==='ruins'){if(fresh('r'+q.id))pool.ruins.push({k:'r'+q.id,x:q.cx,z:q.cz,label:'Ruínas antigas'})}
    else if(!X.seen[q.id]&&fresh('p'+q.id))pool.poi.push({k:'p'+q.id,x:q.cx,z:q.cz,q,label:POI_DEFS[q.type].ic+' '+POI_DEFS[q.type].n});
  }
  WORLD.chests.forEach((ch,i)=>{if(ch.lost&&!ch.opened&&near(ch.x,ch.z)&&fresh('c'+i))pool.chest.push({k:'c'+i,x:ch.x,z:ch.z,label:'Baú escondido'})});
  for(const pt of STATE.portals||[])if(!pt.claimed&&near(pt.x,pt.z)&&fresh('g'+pt.id))pool.portal.push({k:'g'+pt.id,x:pt.x,z:pt.z,label:'Portal de dungeon'});
  for(const k of WORLD.camps)if(!k.gone&&k.state!=='cleared'&&near(k.cx,k.cz)&&fresh('k'+k.id))pool.camp.push({k:'k'+k.id,x:k.cx,z:k.cz,label:'Acampamento de bandidos'});
  for(const k of WORLD.caves)if(!k.gone&&k.state!=='cleared'&&near(k.cx,k.cz)&&fresh('v'+k.id))pool.camp.push({k:'v'+k.id,x:k.cx,z:k.cz,label:'Caverna de animais'});
  X.bin.n++;{const dt=B.hours/24;DN.t+=dt;if(DN.t>=1){DN.t-=1;DN.days++}}
  const kinds=Object.keys(pool).filter(k=>pool[k].length);
  if(!kinds.length)return toast('🔭 Você varre o horizonte ('+B.hours+' h) e não vê nada de novo.',3500);
  let r=Math.random()*kinds.reduce((s,k)=>s+B.w[k],0),kind=kinds[0];
  for(const k of kinds){r-=B.w[k];if(r<=0){kind=k;break}}
  const arr=pool[kind],f=arr[Math.floor(Math.random()*arr.length)];
  X.bin.f[f.k]=true;G.poiMark={x:f.x,z:f.z,label:f.label};
  if(f.q){X.seen[f.q.id]=true}   // POI achado passa a aparecer no mapa
  toast('🔭 Pelo binóculo você avistou: '+f.label+' (marcado no mapa).',5000);
}
