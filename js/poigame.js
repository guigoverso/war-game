'use strict';
// ---------- Fase 6, POIs: bandidos, anexação, renda, moradores, serviços, binóculo e POIs de guerra ----------
// Os POIs nascem com bandidos (owner 'bandit') ou de uma facção. Limpar os bandidos deixa o POI 'free' (cinza); na rodada seguinte o líder decide (cartão
// "Terras livres"): anexar, doar à facção vizinha ou deixar para depois (na 2ª vez, os bandidos voltam). Os POIs seus rendem, e os distantes podem ser retomados.
// Números juntos aqui (como ECON, POL, RAID_WAVES). Ver docs/fase-6-guerra.md.
const POIX={
  reveal:80,         // a que distância (blocos) um POI aparece no mapa (fora do modo criativo, o mapa começa sem POIs)
  prod:3,            // unidades por rodada de fazenda (comida), mina (minério), serraria (madeira) e curtume (couro), no armazém
  toll:30,           // ◉ por rodada da ponte (pedágio)
  retake:{base:0.03,per:0.0015,far:150,max:0.75},   // chance por rodada de os bandidos retomarem um POI seu: base + (distância da sua cidade mais próxima − far) × per, teto de 75% (POI longe das suas cidades fica inviável)
  forgeDisc:0.15,forgeMax:2,   // ferraria: −15% no reparo de armas, até 2 ferrarias
  granaryNeed:0.95,granaryMax:3,   // celeiro: −5% nas necessidades de suprimento de todas as cidades suas, até 3 celeiros
  fortMax:3,         // forte: +1 soldado de batalha, até 3 fortes
  roomCost:20,       // ◉ do quarto da taverna
  vigilHours:4,      // "Fazer vigia" avança o relógio
  ruinRelic:0.10,    // chance de artefato (relíquia) no baú das ruínas
  garrison:{min:10,max:22,by:{fort:12,fortcamp:11},perDist:140,tierStep:200,hpDist:600},   // bandidos por POI: no mínimo 10 (forte 12) e +1 a cada 140 blocos da sua capital; a cada 200 blocos sobe o nível (brutamontes, robôs, franco-atiradores) e a vida cresce até +120%
  sellMin:3000,      // venda a uma facção: ver POI_PRICE
  binoc:{range:300,hours:1,max:3,w:{poi:10,ruins:15,chest:20,portal:25,camp:30}},   // alcance (blocos), horas por uso, usos por rodada e peso de cada achado (do mais raro ao mais comum)
  civDelay:1,   // moradores aparecem N rodadas depois da conquista (conquistou na rodada N, aparecem na N+1)
  guards:{fort:4,fortcamp:4,bridge:3,tower:2,def:2},   // soldados que moram no POI (a ponte tem só soldados)
  civ:{farm:3,mine:3,sawmill:3,tannery:2,granary:3,forge:1,fort:3,tavern:0,tower:0,bridge:0,fortcamp:0,trench:0},   // civis que andam pelo POI (fora os de serviço e os da taverna)
  anvil:[3,3,7,5,12,18],   // sucata para reparar 100% da durabilidade de cada arma na bigorna (proporcional ao que falta, no mínimo 1)
  vest:{base:180,leather:5}   // reparo do colete no curtume: 35% do preço de um colete novo (como as armas) em ◉, ou este tanto de couro para 100%
};
Hooks.on('resetState',()=>{STATE.poiX={clr:{},defer:{},vigil:-1,room:null,done:{},seen:{}}});
const poiX=()=>{const X=STATE.poiX||(STATE.poiX={clr:{},defer:{},vigil:-1,room:null,done:{},seen:{}});if(!X.done)X.done={};if(!X.seen)X.seen={};return X};
const poiVisible=p=>(p.show||G.creative||!!poiX().seen[p.id])&&poiLive(p);   // fora do modo criativo, o POI só aparece nos mapas depois que você chega perto
let POI_READY=false;
const poiMine=type=>(WORLD.pois||[]).filter(p=>!p.show&&p.owner==='player'&&poiLive(p)&&(!type||p.type===type));
const poiCount=type=>poiMine(type).length;
const poiNeedMul=(c,res)=>c&&c.owner==='player'?Math.pow(POIX.granaryNeed,Math.min(POIX.granaryMax,poiCount('granary'))):1;   // usado por needOf (econ.js)

// ---------- POIs de guerra: só existem durante a guerra ----------
// (acampamento fortificado e trincheira): sem guerra não contam, não rendem, não aparecem nos mapas nem têm guarnição. No mapa manual (?cenario=pois) ficam ligados para teste.
function poiWarOn(){
  if(new URLSearchParams(location.search).get('cenario')==='pois')return true;
  return (WORLD.factions||[]).some(f=>!f.player&&relOf(f.id).war);
}
function poiLive(p){return !POI_DEFS[p.type].war||poiWarOn()}

// ---------- bandidos nos POIs ----------
const poiHomeDist=p=>{const h=WORLD.home;return h?Math.hypot(p.cx-h.cx,p.cz-h.cz):0};
function poiGarrisonPlan(p){   // quanto mais longe da sua capital, mais bandidos e mais fortes (tipos e vida)
  const d=poiHomeDist(p),Q=POIX.garrison,tier=Math.min(4,1+Math.floor(d/Q.tierStep));
  return{n:Math.min(Q.max,(Q.by[p.type]||Q.min)+Math.floor(d/Q.perDist)),tier,hpMul:1+Math.min(1.2,d/Q.hpDist)};
}
function poiGarrisonPopulate(p){
  if(p.show||p.gar)return;
  if(p.type==='ruins'){if(poiX().done[p.id])return}else if(p.owner!=='bandit')return;
  const d=POI_DEFS[p.type],rng=new RNG((WORLD.seed*29+p.id*61+STATE.round*7+5)>>>0),ru=p.type==='ruins';
  const pl=ru?{n:5,tier:2,hpMul:1}:poiGarrisonPlan(p),n=pl.n,tier=pl.tier;
  const c=newArea('poi',1000+p.id,ru?'Guardiões das ruínas':'Bandidos — '+d.n,{x:p.cx,z:p.cz,y:p.y},rng,{rank:tier,hpMul:pl.hpMul,half:d.r,leash:d.r+12,poi:p});
  p.gar=c;(WORLD.garrisons=WORLD.garrisons||[]).push(c);WORLD.areas.push(c);
  const pick=i=>{
    if(ru)return i<3?'spider':'brute';   // ruínas: aranhas e guardiões
    if(i===0&&tier>=4)return 'warlord';   // nível 4: um chefe
    if(i===n-1)return 'hound';if(tier>=3&&i%7===3)return 'marksman';if(tier>=3&&i%5===2)return 'gunner';if(tier>=3&&i%9===6)return 'bot';if(tier>=2&&i%6===1)return 'brute';if(tier>=2&&i%4===2)return 'raider';return i%5===4?'hound':'soldier';
  };
  for(let i=0;i<n;i++){const a=rng.range(0,6.283),r=rng.range(d.r*0.2,d.r*0.75);spawnEnemy(c,pick(i),p.cx+Math.cos(a)*r,p.cz+Math.sin(a)*r)}
  if(ru&&p.chest)p.chest.lockedBy=c;   // o baú das ruínas só abre depois de eliminar os guardiões
}
function poiGarrisonRemove(p){
  const c=p.gar;if(!c)return;
  for(const e of c.enemies){e.alive=false;e.gone=true;scene.remove(e.group)}
  c.enemies=[];c.aliveEnemies=0;
  const i=WORLD.areas.indexOf(c);if(i>=0)WORLD.areas.splice(i,1);const j=(WORLD.garrisons||[]).indexOf(c);if(j>=0)WORLD.garrisons.splice(j,1);
  p.gar=null;
}
function poiGarrisonSync(p){   // POI de guerra fora da guerra fica sem bandidos
  if(!POI_READY)return;
  if(!p.show){const want=poiLive(p)&&(p.type==='ruins'?!poiX().done[p.id]:p.owner==='bandit');if(want)poiGarrisonPopulate(p);else poiGarrisonRemove(p)}
  poiCivSync(p);
}
function poiPopulateAll(){POI_READY=true;for(const p of WORLD.pois||[])poiGarrisonSync(p)}   // chamado por populateWild (poi.js) e depois de carregar um salvamento (poiApply)
function poiGarrisonCleared(c){
  const p=c.poi;c.state='cleared';if(!p)return;if(c._ally){c._ally=false;armyConquered(WORLD.home)}   // os soldados voltam para casa
  if(p.type==='ruins'){poiX().done[p.id]=true;poiGarrisonRemove(p);sfx('win',0);toast('🏛 As ruínas estão livres: o baú foi destrancado.',4000);return}
  if(p.owner!=='bandit')return;
  poiGarrisonRemove(p);poiSetOwner(p,'free');poiX().clr[p.id]=STATE.round;sfx('win',0);
  toast('🏴 '+POI_DEFS[p.type].n+' limpo! Na próxima rodada o líder decide o que fazer com ele.',4500);
}

// ---------- cartão "Terras livres" (anexar, doar, vender ou deixar) ----------
const poiById=id=>(WORLD.pois||[]).find(p=>p.id===id);
function poiDueList(){
  const out=[],X=poiX();if(X.decided===STATE.round)return out;
  for(const p of WORLD.pois||[])if(!p.show&&!POI_DEFS[p.type].war&&p.owner==='free'&&(X.clr[p.id]===undefined||X.clr[p.id]<STATE.round))out.push({pid:'poianexar',city:-1,round:STATE.round,data:{poi:p.id}});
  return out;
}
const poiNearestMineDist=p=>{let bd=1e9;for(const c of playerCities()){const d=Math.hypot(c.cx-p.cx,c.cz-p.cz);if(d<bd)bd=d}return bd};
function poiFacList(p){   // facções com cidades e fora de guerra com você, da mais próxima do POI à mais distante (até 4): {fid,name,dist}
  const out=[];
  for(const f of WORLD.factions||[]){
    if(f.player||relStatus(f.id)==='war')continue;
    let bd=1e9;for(const c of facCities(f.id)){const d=Math.hypot(c.cx-p.cx,c.cz-p.cz);if(d<bd)bd=d}
    if(bd<1e9)out.push({fid:f.id,name:f.name,dist:Math.round(bd)});
  }
  return out.sort((a,b)=>a.dist-b.dist).slice(0,4);
}
const POI_PRICE={fort:4500,mine:4000,bridge:4000,farm:3500,sawmill:3500,tannery:3500,granary:3500,forge:3500,tavern:3500,tower:3200,fortcamp:3000,trench:3000};   // mínimo de ◉3000
const poiSellPrice=(p,dist)=>Math.round((POI_PRICE[p.type]||3000)*(1+Math.max(0,200-dist)/400)/100)*100;   // quem está perto paga até +50%
const poiDone=(x,p,msg)=>{   // anexar, doar ou vender: só um POI por rodada (os outros cartões somem e voltam na rodada seguinte)
  const X=poiX();delete X.clr[p.id];delete X.defer[p.id];G.poiFocus=null;X.decided=STATE.round;
  const P=STATE.pol;if(P&&P.extra)P.extra=P.extra.filter(e=>e.pid!=='poianexar');
  if(msg)x.toast(msg)};
// popup para escolher a facção (bandeira, nome e distância da cidade mais próxima dela ao POI); verb: 'give' ou 'sell'
function poiPickFaction(ctx,verb,done){
  const p=poiById(ctx.data.poi),list=poiFacList(p),sell=verb==='sell';
  const w=UI.window({title:(sell?'💰 Vender ':'🕊 Doar ')+POI_DEFS[p.type].n,width:520,z:60}),b=w.body;b.innerHTML='';
  const intro=document.createElement('p');intro.className='ldsm';intro.textContent=sell?'Escolha o comprador. Quem está mais perto do POI paga mais (mínimo ◉3000).':'Escolha quem recebe o POI: a relação com ela sobe +3.';b.appendChild(intro);
  for(const o of list){
    const row=document.createElement('div');row.className='card';row.style.cssText='display:flex;align-items:center;gap:10px;margin:6px 0;padding:8px 10px';
    const fl=facFlagCanvas(o.fid,2);fl.style.cssText='width:64px;height:40px;border:2px solid #000;image-rendering:pixelated;flex:none';row.appendChild(fl);
    const tx=document.createElement('div');tx.style.cssText='flex:1;line-height:1.4';tx.innerHTML='<b>'+o.name+'</b><br><small>A cidade mais próxima dela fica a '+o.dist+' blocos do POI'+(sell?' • paga ◉'+poiSellPrice(p,o.dist):'')+'</small>';row.appendChild(tx);
    row.appendChild(UI.button('Escolher','gold',()=>{w.close();w.el.remove();done(o.fid)}));
    b.appendChild(row);
  }
  w.foot.append(UI.button('Voltar','alt',()=>{w.close();w.el.remove()}));w.open();
}
const poiOpts=[
  {k:'A',label:'Anexar ao seu domínio',type:'buff',
    eff:(c,data)=>{const p=poiById(data.poi);return 'O POI passa a ser seu e rende a cada rodada. Chance de os bandidos o retomarem por rodada: '+Math.round(poiRetakeChance(p)*100)+'%.'},
    apply:x=>{const p=poiById(x.data.poi);poiSetOwner(p,'player');poiGarrisonSync(p);poiDone(x,p,'🏴 '+POI_DEFS[p.type].n+' anexado ao seu domínio.')}},
  {k:'D',label:'Doar a uma facção',type:'neutral',
    can:x=>poiFacList(poiById(x.data.poi)).length?null:'Nenhuma facção, fora de guerra com você, pode recebê-lo.',
    eff:()=>'Você escolhe a facção na próxima janela (com a distância da cidade mais próxima dela ao POI). O POI passa para ela e a relação sobe +3.',
    pick:(ctx,cb)=>poiPickFaction(ctx,'give',cb),
    apply:x=>{const p=poiById(x.data.poi),o=poiFacList(p).find(q=>q.fid===x.sel);poiSetOwner(p,x.sel);relChange(x.sel,3,'você doou '+POI_DEFS[p.type].n,true);poiDone(x,p,'🕊 '+POI_DEFS[p.type].n+' doado a '+(o?o.name:'uma facção')+' (relação +3).')}},
  {k:'V',label:'Vender a uma facção',type:'buff',
    can:x=>poiFacList(poiById(x.data.poi)).length?null:'Nenhuma facção, fora de guerra com você, pode comprá-lo.',
    eff:()=>'Você escolhe o comprador na próxima janela. Recebe no mínimo ◉3000 (quem está mais perto do POI paga até 50% a mais) e o POI passa para ela.',
    pick:(ctx,cb)=>poiPickFaction(ctx,'sell',cb),
    apply:x=>{const p=poiById(x.data.poi),o=poiFacList(p).find(q=>q.fid===x.sel),v=poiSellPrice(p,o?o.dist:999);poiSetOwner(p,x.sel);x.gold(v);poiDone(x,p,'💰 '+POI_DEFS[p.type].n+' vendido a '+(o?o.name:'uma facção')+' por ◉'+v+'.')}}
];
poiOpts.push({k:'Z',label:'Deixar para depois',type:'debuff',
  eff:(c,data)=>(poiX().defer[data.poi]||0)?'Pela 2ª vez: os bandidos voltam a ocupá-lo.':'Ele continua livre e o cartão volta na próxima rodada. Se você adiar de novo, os bandidos voltam.',
  apply:x=>{const p=poiById(x.data.poi),X=poiX();X.defer[p.id]=(X.defer[p.id]||0)+1;G.poiFocus=null;
    if(X.defer[p.id]>=2){delete X.clr[p.id];delete X.defer[p.id];poiSetOwner(p,'bandit');poiGarrisonSync(p);x.toast('🏴 Os bandidos voltaram a ocupar '+POI_DEFS[p.type].n+'.')}
    else x.toast('O POI continua livre.')}});
definePolicy({id:'poianexar',name:'Terras livres',city:false,noRoll:true,cool:0,flex:true,
  cond:()=>poiDueList().length>0,
  listLabel:(c,data)=>{const p=poiById(data.poi),d=POI_DEFS[p.type];return d.ic+' '+d.n+' — limpo, a '+Math.round(poiNearestMineDist(p))+' blocos da sua cidade mais próxima. Só um POI por rodada: ao decidir um, os outros ficam para a próxima.'},
  text:(c,data)=>{const p=poiById(data.poi),d=POI_DEFS[p.type],dist=Math.round(poiNearestMineDist(p));
    return 'Seus soldados expulsaram os bandidos de '+d.ic+' '+d.n+'. O lugar está livre, a '+dist+' blocos da sua cidade mais próxima. Quem o ocupar ganha os seus benefícios, mas POIs distantes das suas cidades são alvo constante dos bandidos: a chance de retomada sobe com a distância (até 75%). Você também pode doá-lo a uma facção ou vendê-lo.';},
  extra:(c,data)=>'<div style="margin:6px 0"><button class="alt" data-poimap="'+data.poi+'">🗺 Ver o POI no mapa</button></div>',
  options:poiOpts});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-poimap]');if(b){G.poiFocus=+b.dataset.poimap;if(polWin&&polWin.isOpen())polWin.close();openBook('map')}});   // abre o mapa com o POI do cartão em destaque (game.js, drawBigMap)

// ---------- renda, retomada pelos bandidos e fim dos efeitos temporários (início de cada rodada) ----------
function poiRetakeChance(p){const R=POIX.retake;return Math.min(R.max,R.base+Math.max(0,poiNearestMineDist(p)-R.far)*R.per)}
Hooks.on('round',()=>{
  if(!WORLD.pois||STATE.round<1)return;
  G.poiMark=null;
  for(const a of ALLIES)if(a.poiFort&&a.alive){a.alive=false;a.gone=true;scene.remove(a.group)}   // soldados extras dos fortes valem só numa batalha da rodada
  const home=playerCities()[0],gain={};
  for(const p of poiMine()){
    const res={farm:'food',mine:'ore',sawmill:'wood',tannery:'leather'}[p.type];
    if(res&&home){const g=prodAdd(home,res,POIX.prod);if(g>0)gain[res]=(gain[res]||0)+g}
    if(p.type==='bridge'){shOf().vault+=POIX.toll;rdNow('🌉 Pedágio da ponte: +◉'+POIX.toll+' no cofre.')}
    if(Math.random()<poiRetakeChance(p)){poiSetOwner(p,'bandit');poiGarrisonSync(p);rdNow('🏴 Bandidos retomaram '+POI_DEFS[p.type].n+', longe demais das suas cidades.')}
  }
  for(const r in gain)rdNow('⛏ POIs: +'+gain[r]+' de '+resName(r).toLowerCase()+' na reserva do armazém.');
});

// ---------- fortes: +1 soldado (temporário) por forte em cada batalha ----------
const _armyAssault=armyAssault;
armyAssault=function(c,msg,only){
  const n=Math.min(POIX.fortMax,poiCount('fort'));
  if(n&&!only&&c._fortRound!==STATE.round){
    c._fortRound=STATE.round;const hm=WORLD.home,bk=hm.barracks||{x:hm.cx,z:hm.cz};
    for(let i=0;i<n;i++){const a=spawnAlly(bk.x+(Math.random()-0.5)*1.5,bk.z+(Math.random()-0.5)*1.5,hm);a.temp=true;a.poiFort=true}
    toast('🏰 '+(n>1?n+' fortes mandam':'O forte manda')+' reforços para a batalha.',3000);
  }
  return _armyAssault(c,msg,only);
};

// ---------- ferraria: reparo mais barato ----------
addPriceFx('poi',ctx=>{const n=Math.min(POIX.forgeMax,poiCount('forge'));return ctx.kind==='repair'&&n?[{txt:'Ferraria sua (−'+Math.round(POIX.forgeDisc*n*100)+'%)',mul:1-POIX.forgeDisc*n}]:[]},81);

// ---------- ruínas: baú com chance de artefato ----------
function poiRuinLoot(p){if(Math.random()<POIX.ruinRelic){const t=invGive([['reliquia',1]]);toast('🏺 Entre os destroços havia um artefato! '+(t||''),4500)}}

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

// ---------- interações: vigia e binóculo da torre, balcão e cama da taverna, ferreiro, bigorna e curtidor ----------
function poiScan(lines){
  for(const p of WORLD.pois||[]){
    const own=p.owner==='player',svc=poiSvcOk(p);if(!own&&!svc)continue;   // vigia e binóculo só nos seus; taverneiro e cama também nos de facções amigas
    if(own&&p.vigilPos&&Math.hypot(P.x-p.vigilPos.x,P.z-p.vigilPos.z)<2.6&&Math.abs(P.y-p.y)<2.6){G.target={type:'poivigil',p};lines.push('[E] Fazer vigia (avança '+POIX.vigilHours+' h e marca um ponto de interesse)'+(poiX().vigil===STATE.round?' — já feito nesta rodada':''))}
    if(own&&p.binoc&&Math.hypot(P.x-p.binoc.x,P.z-p.binoc.z)<1.8&&Math.abs(P.y-p.binoc.y)<3){G.target={type:'poibinoc',p};lines.push('[E] Usar o binóculo (acha POIs, ruínas, baús, portais e acampamentos num raio de '+POIX.binoc.range+' blocos)')}
    if(svc&&p.tavern&&Math.hypot(P.x-p.tavern.x,P.z-p.tavern.z)<3.2&&Math.abs(P.y-p.y)<2.6){G.target={type:'poibar',p};lines.push('[E] Taverneiro: comida e quarto')}
    if(svc&&p.bed&&Math.hypot(P.x-p.bed.x,P.z-p.bed.z)<2.4&&Math.abs(P.y-p.bed.y)<2.6){G.target={type:'poibed',p};const r=poiX().room;lines.push(r&&r.poi===p.id&&r.round===STATE.round?'[E] Dormir (noite vira manhã; dia vira noite)':'🔒 Cama: reserve o quarto com o taverneiro')}
  }
  let best=null;   // o serviço mais perto de você (o ferreiro e a bigorna ficam próximos)
  const cand=(p,x,z,tg,txt,r)=>{const d=Math.hypot(P.x-x,P.z-z);if(d<r&&Math.abs(P.y-p.y)<2.6&&(!best||d<best.d))best={d,tg,txt}};
  for(const p of WORLD.pois||[]){
    for(const s of p.svcSpec||[])if(poiSvcOk(p)&&p.civ.svc&&p.civ.svc[s.kind]&&p.civ.svc[s.kind].alive)cand(p,s.x,s.z,{type:'poisvc',p,s},s.label,2.4);
    if(p.anvil&&p.owner==='player')cand(p,p.anvil.x,p.anvil.z,{type:'poianvil',p},'Bigorna: reparar arma gastando sucata',2.0);
  }
  if(best){G.target=best.tg;lines.push('[E] '+best.txt)}
}
function poiAct(t){
  const p=t.p,X=poiX();
  if(t.type==='poibinoc')return poiBinoc(p);
  if(t.type==='poibar')return svcTavern(p);
  if(t.type==='poisvc')return t.s.kind==='smith'?svcSmith(p):svcTanner(p);
  if(t.type==='poianvil')return svcAnvil(p);
  if(t.type==='poivigil'){
    if(STATE.phase!=='commander')return toast('A vigia é feita no turno do comandante.',2500);
    if(X.vigil===STATE.round)return toast('Você já fez a vigia nesta rodada.',2500);
    X.vigil=STATE.round;
    {const dt=POIX.vigilHours/24;DN.t+=dt;if(DN.t>=1){DN.t-=1;DN.days++}}
    const cand=[];
    for(const k of WORLD.camps)if(!k.gone&&k.state!=='cleared'&&Math.hypot(k.cx-p.cx,k.cz-p.cz)<400)cand.push({x:k.cx,z:k.cz,label:'Acampamento de bandidos'});
    for(const q of WORLD.pois)if(!q.show&&q!==p&&q.type!=='ruins'&&q.owner==='bandit'&&Math.hypot(q.cx-p.cx,q.cz-p.cz)<400)cand.push({x:q.cx,z:q.cz,label:'Bandidos em '+POI_DEFS[q.type].n});
    for(const q of WORLD.pois)if(!q.show&&q.type==='ruins'&&Math.hypot(q.cx-p.cx,q.cz-p.cz)<400)cand.push({x:q.cx,z:q.cz,label:'Ruínas antigas'});
    if(cand.length){const m=cand[Math.floor(Math.random()*cand.length)];G.poiMark=m;toast('🔭 Vigia feita ('+POIX.vigilHours+' h). Ponto de interesse marcado no mapa: '+m.label+'.',5000)}
    else toast('🔭 Vigia feita ('+POIX.vigilHours+' h). Nada de novo no horizonte.',4000);
  }else if(t.type==='poibed'){
    if(!(X.room&&X.room.poi===p.id&&X.room.round===STATE.round))return toast('Reserve o quarto com o taverneiro primeiro.',2500);
    X.room=null;const night=DN.t<0.25||DN.t>0.75;
    if(night){if(DN.t>0.75)DN.days++;DN.t=0.3}else DN.t=0.85;   // noite vira manhã (7h12); dia vira noite (20h24)
    P.hp=P.maxhp;toast(night?'😴 Você dormiu até de manhã. Vida recuperada.':'😴 Você descansou até anoitecer. Vida recuperada.',4000);
  }
}
// marca de interesse da vigia nos mapas (estrela laranja); some perto dela ou na rodada seguinte
function poiMarkCheck(){const m=G.poiMark;if(m&&Math.hypot(P.x-m.x,P.z-m.z)<15){G.poiMark=null;toast('🔭 Você chegou ao ponto de interesse.',2500)}}

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

// ---------- batalha no POI: seus soldados aparecem; o POI surge no mapa quando você chega perto ----------
function poiBattleStart(c){if(c._ally)return;c._ally=true;if(ALLIES.some(a=>a.alive)||poiCount('fort'))armyAssault(c,'')}
let POI_T=0;
function poiTick(dt){
  POI_T-=dt;if(POI_T>0)return;POI_T=0.5;
  for(const c of WORLD.garrisons||[])if(c._ally&&c.state!=='attacking'){c._ally=false;armyConquered(WORLD.home)}   // acabou (ou você recuou): de volta ao posto
  const X=poiX();
  for(const p of WORLD.pois||[])if(!p.show&&!X.seen[p.id]&&poiLive(p)&&Math.hypot(P.x-p.cx,P.z-p.cz)<POIX.reveal+POI_DEFS[p.type].r){X.seen[p.id]=true;if(p.type!=='ruins'&&!G.creative)toast('📍 Você avistou: '+POI_DEFS[p.type].ic+' '+POI_DEFS[p.type].n+' (marcado no mapa).',3500)}
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='mapback'){closePanel();showPolicy()}});   // do mapa de volta ao cartão do evento
