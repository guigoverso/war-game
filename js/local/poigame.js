'use strict';
// ---------- Fase 6, POIs: bandidos, anexação, renda, moradores, serviços, binóculo e POIs de guerra ----------
// Os POIs nascem com bandidos (owner 'bandit') ou de uma facção. Limpar os bandidos deixa o POI 'free' (cinza); na rodada seguinte o líder decide (cartão
// "Terras livres"): anexar, doar, vender ou ignorar (ao encerrar o turno do líder, um POI livre sem decisão é retomado por bandidos ou pela facção mais perto; pesos em modifiers/). Os POIs seus rendem, e os distantes podem ser retomados.
// Números juntos aqui (como ECON, POL, RAID_WAVES). Ver docs/fase-6-guerra.md.
const POIX={
  reveal:80,         // a que distância (blocos) um POI aparece no mapa (fora do modo criativo, o mapa começa sem POIs)
  prod:{base:1,perLvl:1},   // unidades por rodada de fazenda (comida), mina (minério), serraria (madeira) e caçadores (couro), no armazém: base + perLvl × nível (poiLvl)
  toll:20,           // ◉ por rodada da ponte (pedágio) × nível (poiLvl)
  sanc:{peace:0.5,delay:0.3},   // santuário: chance de a cidade sem suprimento não ficar Descontente; chance de a rebelião ser adiada 1 rodada (sem acumular)
  post:{income:40,markup:0.10,reach:45},   // entreposto: ◉ por caravana sua que passa por ele × nível (poiLvl); preço da loja +10% (soma com a relação); até onde (blocos) da linha entre as duas cidades da rota ele conta como "no caminho"
  hunt:{pen:0.08,meat:[1,3]},   // caçadores: em guerra, −0,08 na pontuação de couro de cada facção inimiga por acampamento seu (facsupply.js); baú da conquista: 1 a 3 carnes
  retake:{base:0.03,per:0.0015,far:150,max:0.75},   // chance por rodada de os bandidos retomarem um POI seu: base + (distância da sua cidade mais próxima − far) × per, teto de 75% (POI longe das suas cidades fica inviável)
  fortMax:3,         // forte: +1 soldado de batalha, até 3 fortes
  roomMul:1.1,       // quarto da taverna = preço de curar toda a vida (clínica) × isto; em cidade NPC leva a relação
  vigilHours:4,      // "Fazer vigia" avança o relógio
  ruinRelic:0.30,    // chance de artefato (relíquia) no baú das ruínas (o baú não volta; os guardiões voltam a cada rodada)
  garrison:{min:10,max:22,by:{fort:12,fortcamp:11},perDist:140,tierStep:200,hpDist:600},   // bandidos por POI: no mínimo 10 (forte 12) e +1 a cada 140 blocos da sua capital; a cada 200 blocos sobe o nível (brutamontes, robôs, franco-atiradores) e a vida cresce até +120%
  sellMin:3000,      // venda a uma facção: ver POI_PRICE
  binoc:{range:300},   // alcance da vigia (blocos); ela marca o ponto não descoberto mais perto da torre
  civDelay:1,   // moradores aparecem N rodadas depois da conquista (conquistou na rodada N, aparecem na N+1)
  guards:{fort:4,fortcamp:4,bridge:3,tower:2,def:2},   // soldados que moram no POI (a ponte tem só soldados)
  civ:{farm:3,mine:3,sawmill:3,hunters:2,sanctuary:5,post:2,fort:3,inn:1,lodge:3,tavern:0,tower:0,bridge:0,fortcamp:0,trench:0},   // civis que andam pelo POI (fora os de serviço e os da taverna)
  anvil:[3,3,7,5,12,18],   // sucata para reparar 100% da durabilidade de cada arma no ferreiro (proporcional ao que falta, no mínimo 1)
  smith:{goldPct:0.6},     // pagando com sucata, o ferreiro ainda cobra esta fração do preço em ◉ (a sucata cobre o resto)
  vest:{base:180,leather:5,pct:0.35,goldPct:0.6}   // reparo do colete no Quartel (allies.js): 35% do preço de um colete novo em ◉; com couro (5 para 100%) cobra 60% disso em ◉
};
Hooks.on('resetState',()=>{STATE.poiX={clr:{},vigil:{},room:null,done:{},seen:{}}});
const poiX=()=>{const X=STATE.poiX||(STATE.poiX={clr:{},vigil:{},room:null,done:{},seen:{}});if(!X.vigil||typeof X.vigil!=='object')X.vigil={};if(!X.marks)X.marks=[];if(!X.conq)X.conq={};   // vigil: rodada do último uso por torre; marks: "?" da vigia; conq: rodada em que o POI foi limpado (salvos)
  if(!X.done)X.done={};if(!X.seen)X.seen={};return X};
const poiVisible=p=>(p.show||G.creative||!!poiX().seen[p.id])&&poiLive(p);   // fora do modo criativo, o POI só aparece nos mapas depois que você chega perto
let POI_READY=false;
const poiMine=type=>(WORLD.pois||[]).filter(p=>!p.show&&p.owner==='player'&&poiLive(p)&&(!type||p.type===type));
const poiCount=type=>poiMine(type).length;
// nível usado por produção, pedágio e Entreposto: jogador = nível do líder; facção NPC = maior nível entre as cidades dela (a regra muda só aqui)
const poiLvl=o=>{
  if(o==='player'||o===0)return STATE.rd.lvl||1;
  if(typeof o!=='number')return 1;
  let m=1;for(const c of WORLD.cities||[])if(c.fid===o)m=Math.max(m,Math.ceil((c.rank||1)/2));
  return m;
};   // (mesma conta de factions.js: nível da cidade NPC = ceil(rank/2))

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
  const armed=typeof warOpArmed==='function'&&warOpArmed(p);   // operação de ataque ativa (warops.js): guarnição de 10+ mesmo em POI de facção
  if(p.type==='ruins'){if(poiX().done[p.id])return}else if(p.owner!=='bandit'&&!(armed&&typeof p.owner==='number'))return;
  const d=Object.assign({},POI_DEFS[p.type],{r:poiR(p)}),rng=new RNG((WORLD.seed*29+p.id*61+STATE.round*7+5)>>>0),ru=p.type==='ruins';
  const pl=ru?{n:5,tier:2,hpMul:1}:poiGarrisonPlan(p);
  if(armed){pl.n=Math.max(pl.n,WAR.garrisonMin);if(typeof p.owner==='number')pl.tier=Math.min(4,Math.max(pl.tier,poiLvl(p.owner)))}   // tipos pelo nível da facção e pela distância
  const n=pl.n,tier=pl.tier;
  const c=newArea('poi',1000+p.id,ru?'Guardiões das ruínas':(typeof p.owner==='number'?'Soldados — ':'Bandidos — ')+d.n,{x:p.cx,z:p.cz,y:p.y},rng,{rank:tier,hpMul:pl.hpMul,half:d.r,leash:d.r+12,poi:p});
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
  if(!p.show){const want=poiLive(p)&&(p.type==='ruins'?!poiX().done[p.id]:p.owner==='bandit'||(typeof warOpArmed==='function'&&typeof p.owner==='number'&&warOpArmed(p)));if(want)poiGarrisonPopulate(p);else poiGarrisonRemove(p)}
  poiCivSync(p);
}
function poiPopulateAll(){POI_READY=true;dormBuildAll();for(const p of WORLD.pois||[]){poiGarrisonSync(p);poiHuntChest(p)}}   // chamado por populateWild (poi.js) e depois de carregar um salvamento (poiApply)
function poiGarrisonCleared(c){
  const p=c.poi;c.state='cleared';if(!p)return;if(c._ally){c._ally=false;armyConquered(WORLD.home)}   // os soldados voltam para casa
  if(p.type==='ruins'){poiX().done[p.id]=true;poiGarrisonRemove(p);sfx('win',0);toast('🏛 Guardiões das ruínas derrotados: o baú foi destrancado. Eles voltam na próxima rodada.',4500);return}
  if(typeof p.owner==='number'&&typeof warOpArmed==='function'&&warOpArmed(p)){   // POI de facção tomado por operação de ataque: vira seu na hora (a dependente fica ativa)
    poiGarrisonRemove(p);poiX().conq[p.id]=STATE.round;poiSetOwner(p,'player');sfx('win',0);toast(txtWarAutoAnnex(POI_DEFS[p.type].n),4500);return}
  if(p.owner!=='bandit')return;
  poiHuntLoot(p);
  poiGarrisonRemove(p);poiSetOwner(p,'free');poiX().clr[p.id]=poiX().conq[p.id]=STATE.round;sfx('win',0);   // conq: rodada N da conquista (os moradores vêm na N+1, mesmo anexando só na N+1)
  toast(p.owner==='player'?txtWarAutoAnnex(POI_DEFS[p.type].n):'🏴 '+POI_DEFS[p.type].n+' limpo! Na próxima rodada o líder decide o que fazer com ele.',4500);   // owner 'player': anexado na hora (POI da trilha, warops.js)
}

// ---------- santuário: paz e rebelião adiada (rounds.js, facsupply.js, rebellion.js) ----------
// vale para o dono do Santuário (você ou uma facção); com bandidos ou livre, nada. Um sorteio só, não importa quantos santuários o dono tenha.
const poiHasSanc=o=>(WORLD.pois||[]).some(p=>!p.show&&p.type==='sanctuary'&&p.owner===o);
const poiSancPeace=o=>poiHasSanc(o)&&Math.random()<POIX.sanc.peace;   // cidade sem suprimento: o humor não fica em Descontente
const poiSancDelay=o=>poiHasSanc(o)&&Math.random()<POIX.sanc.delay;   // cidade que ia se rebelar: adia 1 rodada (a contagem de rodadas sem suprimento não muda)

// ---------- caçadores: baú com carne ao limpar os bandidos (uma vez só) ----------
function poiHuntChest(p){   // cria o baú pendente (também depois de carregar um salvamento, em que o baú ainda não foi aberto)
  const n=poiX().hunt&&poiX().hunt[p.id];if(!n||p.huntChest||!p.chestPos)return;
  const q=p.chestPos,ch=addChest(q.x,q.y,q.z,0,0,null);ch.fixedLoot=[['carne',n]];p.huntChest=ch;
  ch.onOpen=()=>{delete poiX().hunt[p.id];p.huntChest=null};
}
function poiHuntLoot(p){
  const X=poiX();if(p.type!=='hunters'||X.done[p.id])return;
  const M=POIX.hunt.meat;X.done[p.id]=true;(X.hunt||(X.hunt={}))[p.id]=M[0]+Math.floor(Math.random()*(M[1]-M[0]+1));
  poiHuntChest(p);toast('🥩 Os caçadores deixaram um baú com carne no acampamento.',4000);
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
const POI_PRICE={fort:4500,mine:4000,bridge:4000,farm:3500,sawmill:3500,hunters:3500,sanctuary:3500,post:4500,tavern:3500,inn:3000,lodge:3000,ruinvil:3000,tower:3200,fortcamp:3000,trench:3000,hospital:3000,depot:3000,lookout:3000,barricade:3000};   // mínimo de ◉3000
const poiSellPrice=(p,dist)=>Math.round((POI_PRICE[p.type]||3000)*(1+Math.max(0,200-dist)/400)/100)*100;   // quem está perto paga até +50%
const poiDone=(x,p,msg)=>{   // anexar, doar ou vender: só um POI por rodada (os outros cartões somem e voltam na rodada seguinte)
  const X=poiX();delete X.clr[p.id];G.poiFocus=null;X.decided=STATE.round;
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
poiOpts.push({k:'Z',label:'Ignorar',type:'debuff',
  eff:()=>'Ele continua livre só até você encerrar o turno: então é retomado, por bandidos ou pela facção mais próxima.',
  apply:x=>{G.poiFocus=null;x.toast('O POI continua livre.')}});
definePolicy({id:'poianexar',name:'Terras livres',city:false,noRoll:true,cool:0,flex:true,
  cond:()=>poiDueList().length>0,
  listLabel:(c,data)=>{const p=poiById(data.poi),d=POI_DEFS[p.type];return d.ic+' '+d.n+' — limpo, a '+Math.round(poiNearestMineDist(p))+' blocos da sua cidade mais próxima. Só um POI por rodada: ao decidir um, os outros ficam para a próxima.'},
  text:(c,data)=>{const p=poiById(data.poi),d=POI_DEFS[p.type],dist=Math.round(poiNearestMineDist(p));
    return 'Seus soldados expulsaram os bandidos de '+d.ic+' '+d.n+'. O lugar está livre, a '+dist+' blocos da sua cidade mais próxima. Quem o ocupar ganha os seus benefícios, mas POIs distantes das suas cidades são alvo constante dos bandidos: a chance de retomada sobe com a distância (até 75%). Você também pode doá-lo a uma facção ou vendê-lo. Se ignorá-lo, ao encerrar o turno ele é retomado por bandidos ou pela facção mais próxima.';},
  extra:(c,data)=>'<div style="margin:6px 0"><button class="alt" data-poimap="'+data.poi+'">🗺 Ver o POI no mapa</button></div>',
  options:poiOpts});
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-poimap]');if(b){G.poiFocus=+b.dataset.poimap;if(polWin&&polWin.isOpen())polWin.close();openBook('map')}});   // abre o mapa com o POI do cartão em destaque (game.js, drawBigMap)

// ---------- POI livre sem decisão: ao encerrar o turno do líder, é retomado (sorteio: bandidos ou facção) (bandidos ou a facção mais perto) ----------
function poiNearestFac(p){   // facção (qualquer uma, até em guerra com você) com a cidade mais perto do POI; null se nenhuma tem cidades
  let bf=null,bd=1e9;
  for(const f of WORLD.factions||[]){if(f.player)continue;for(const c of facCities(f.id)){const d=Math.hypot(c.cx-p.cx,c.cz-p.cz);if(d<bd){bd=d;bf=f}}}
  return bf;
}
function poiFreeRetake(){
  const X=poiX();
  for(const p of WORLD.pois||[]){
    if(p.show||POI_DEFS[p.type].war||p.owner!=='free'||X.clr[p.id]===undefined||X.clr[p.id]>=STATE.round)continue;
    const nf=poiNearestFac(p),who=freePoiTaker(!!nf),n=POI_DEFS[p.type].n,f=who==='faction'?nf:null;   // pesos em modifiers/
    if(!who)continue;   // modificadores zerados: continua livre
    delete X.clr[p.id];
    if(f){poiSetOwner(p,f.id);rdNow('🏳 '+f.name+' assumiu '+n+' que estava livre.')}
    else{poiSetOwner(p,'bandit');poiGarrisonSync(p);rdNow('🏴 Bandidos retomaram '+n+' que estava livre.')}
  }
}
Hooks.on('leaderEnd',poiFreeRetake);

// ---------- renda, retomada pelos bandidos e fim dos efeitos temporários (início de cada rodada) ----------
function poiRetakeChance(p){   // POI seu: base + distância, teto; em guerra vezes WAR_RETAKE_MULTIPLIER (modifiers/)
  const R=POIX.retake,c=Math.min(R.max,R.base+Math.max(0,poiNearestMineDist(p)-R.far)*R.per);
  return poiWarOn()?c*WAR_RETAKE_MULTIPLIER:c;
}
Hooks.on('round',()=>{
  if(!WORLD.pois||STATE.round<1)return;
  poiX().marks=[];
  for(const a of ALLIES)if(a.poiFort&&a.alive){a.alive=false;a.gone=true;scene.remove(a.group)}   // soldados extras dos fortes valem só numa batalha da rodada
  const home=playerCities()[0],gain={};
  for(const p of poiMine()){
    const res={farm:'food',mine:'ore',sawmill:'wood',hunters:'leather'}[p.type];
    if(res&&home){const g=prodAdd(home,res,POIX.prod.base+POIX.prod.perLvl*poiLvl('player'));if(g>0)gain[res]=(gain[res]||0)+g}
    if(p.type==='bridge'){const t=POIX.toll*poiLvl('player');shOf().vault+=t;rdNow('🌉 Pedágio da ponte: +◉'+t+' no cofre.')}
    if(Math.random()<poiRetakeChance(p)){poiSetOwner(p,'bandit');poiGarrisonSync(p);rdNow('🏴 Bandidos retomaram '+POI_DEFS[p.type].n+', longe demais das suas cidades.')}
  }
  for(const r in gain)rdNow('⛏ POIs: +'+gain[r]+' de '+resName(r).toLowerCase()+' na reserva do armazém.');
});

// ---------- entreposto comercial: renda das caravanas que passam por ele e bloqueio em guerra ----------
// "Passa por ele" = o entreposto fica perto da linha entre as duas cidades da rota (p.road = [idA, idB], se a geração gravar a estrada em que ele nasceu, vale no lugar da distância).
// Dono bandido: sem lojista (poiCivSync) e sem renda. Só há guerra entre você e uma facção: o entreposto de um lado impede as caravanas do outro que passariam por ele.
const poiPosts=()=>(WORLD.pois||[]).filter(p=>!p.show&&p.type==='post'&&poiLive(p));
function poiOnRoute(p,A,B){
  if(p.road)return (p.road[0]===A.id&&p.road[1]===B.id)||(p.road[0]===B.id&&p.road[1]===A.id);
  const dx=B.cx-A.cx,dz=B.cz-A.cz,t=Math.max(0,Math.min(1,((p.cx-A.cx)*dx+(p.cz-A.cz)*dz)/(dx*dx+dz*dz||1)));
  return Math.hypot(p.cx-(A.cx+dx*t),p.cz-(A.cz+dz*t))<=POIX.post.reach;
}
function poiRouteBlocked(r){   // a rota {a,b} (ids de cidades) passa por um entreposto do lado inimigo, com guerra declarada?
  const A=WORLD.cities[r.a],B=WORLD.cities[r.b];if(!A||!B)return false;
  const mine=A.owner==='player'||B.owner==='player',others=[A,B].filter(c=>c.owner!=='player'&&c.fid).map(c=>c.fid);
  for(const p of poiPosts()){
    const o=p.owner;if(!poiOnRoute(p,A,B))continue;
    if(o==='player'?others.some(f=>relOf(f).war):(typeof o==='number'&&mine&&relOf(o).war))return true;
  }
  return false;
}
const poiPostIncome=()=>{   // renda por rodada de um entreposto seu: ◉ por caravana sua que passa por ele × nível
  const rd=STATE.rd,out=[];
  for(const p of poiMine('post')){
    let n=0;for(const r of rd.routes.concat(rd.nroutes||[])){const A=WORLD.cities[r.a],B=WORLD.cities[r.b];if(A&&B&&poiOnRoute(p,A,B))n+=(A.owner==='player')+(B.owner==='player')}
    if(n)out.push({p,n,gold:POIX.post.income*poiLvl('player')*n});
  }
  return out;
};
Hooks.on('round',()=>{
  if(!WORLD.pois||STATE.round<1)return;
  const rd=STATE.rd,n0=rd.routes.length+(rd.nroutes||[]).length;   // a guerra ou a conquista de um entreposto desfaz as rotas que ele impede
  rd.routes=rd.routes.filter(r=>!poiRouteBlocked(r));if(rd.nroutes)rd.nroutes=rd.nroutes.filter(r=>!poiRouteBlocked(r));
  if(rd.routes.length+(rd.nroutes||[]).length!==n0){rebuildCaravans();computeBuffs()}
  for(const i of poiPostIncome())shOf().vault+=i.gold;
});
// aba Efeitos do livro (meetfx.js): o que os entrepostos dão e tiram agora
function poiPostEffects(good,bad){
  const inc=poiPostIncome(),tot=inc.reduce((s,i)=>s+i.gold,0),n=inc.reduce((s,i)=>s+i.n,0);
  if(tot)good.push('🏪 Entreposto comercial: +◉'+tot+' por rodada no cofre ('+n+' caravana'+(n>1?'s':'')+' sua'+(n>1?'s':'')+' passa'+(n>1?'m':'')+' por ele)');
  const war=(WORLD.factions||[]).filter(f=>!f.player&&relOf(f.id).war);
  if(war.length&&poiCount('post'))good.push('🏪 Entreposto comercial: impede as caravanas de '+war.map(f=>f.name).join(', ')+' que passariam por ele');
  for(const f of war)if(poiPosts().some(p=>p.owner===f.id))bad.push('🏪 Entreposto de '+f.name+': impede as suas caravanas que passariam por ele');
}

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

// ---------- ruínas: baú com chance de artefato ----------
function poiRuinLoot(p){if(Math.random()<POIX.ruinRelic){const t=invGive([['reliquia',1]]);toast('🏺 Entre os destroços havia um artefato! '+(t||''),4500)}}

// ---------- moradores: soldados e civis (aparecem na rodada seguinte à conquista) ----------
function poiOwnerChanged(p,o){   // chamado por poiSetOwner (pois.js)
  if(!POI_READY||p.show)return;const X=poiX();if(!X.since)X.since={};
  if(o==='player'||typeof o==='number'){X.since[p.id]=X.conq[p.id]!==undefined?X.conq[p.id]:STATE.round;delete X.conq[p.id]}
  else delete X.since[p.id];
}
function poiCivRemove(p){if(!p.civ)return;for(const n of p.civ.npcs){n.alive=false;n.gone=true;scene.remove(n.group)}p.civ=null}
// Hospital de campanha: pacientes deitados e médicos andando, sempre que a guerra está ligada (qualquer dono, menos ruínas); só visual
function poiMedSync(p){
  const o=p.owner,key=String(o),want=poiLive(p)&&o!=='none',friendly=o==='player'||typeof o==='number',fid=o==='player'?0:o;
  if(p.civ&&(!want||p.civ.key!==key))poiCivRemove(p);
  if(!want||p.civ||!p.beds)return;
  p.civ={id:2000+p.id,biome:p.biome,owner:o==='player'?'player':'enemy',key,fid:friendly?fid:undefined,npcs:[],kind:'poiciv',cx:p.cx,cz:p.cz,half:12,enemies:[],state:'idle',walk:p.medWalk||[]};
  const H=WAR_POI.hospital;
  // yaw minúsculo (não 0): com 0 o spawnNpc sortearia uma direção; o paciente deita com a cabeça para o fundo da maca
  for(let i=0;i<Math.min(H.patients,p.beds.length);i++){const b=p.beds[i];spawnNpc(p.civ,{role:'civ',x:b.x,z:b.z,y:b.y,yaw:0.0001,stationary:true,lie:true})}
  for(let i=0;i<H.medics;i++){const w=p.medWalk[i%p.medWalk.length];spawnNpc(p.civ,{role:'medic',x:w.x,z:w.z,y:p.y})}   // médicos levam tiro e morrem
  if(friendly)for(let i=0;i<H.guards;i++){const a=i*6.283/H.guards+0.7,q=freeSpot(p.cx+Math.cos(a)*5,p.cz+9+Math.sin(a)*1.5,0.3,1.8,0.45);spawnNpc(p.civ,{role:'guard',x:q[0],z:q[1],y:p.y,yaw:a,stationary:true})}   // soldados do dono (de bandidos: a guarnição normal)
}
function poiCivSync(p){
  if(!POI_READY||p.type==='ruins'||p.type==='ruinvil')return;   // ruínas e vila em escombros: nunca ganham moradores (não se reconstroem)
  if(p.type==='hospital')return poiMedSync(p);
  const o=p.owner,friendly=o==='player'||typeof o==='number',fid=o==='player'?0:o,X=poiX(),sn=X.since&&X.since[p.id];
  const ready=friendly&&poiLive(p)&&!(sn!==undefined&&STATE.round<sn+POIX.civDelay);
  if(p.civ&&(!ready||p.civ.fid!==fid))poiCivRemove(p);
  if(!ready||p.civ)return;
  const d=Object.assign({},POI_DEFS[p.type],{r:poiR(p)}),ring=(k,n,f)=>{const a=k*6.283/n+0.7,q=freeSpot(p.cx+Math.cos(a)*d.r*f,p.cz+Math.sin(a)*d.r*f,0.3,1.8,0.45);return{a,x:q[0],z:q[1]}};
  p.civ={id:2000+p.id,biome:p.biome,owner:o==='player'?'player':'enemy',fid,npcs:[],kind:'poiciv',cx:p.cx,cz:p.cz,half:12,enemies:[],state:'idle',walk:[]};
  for(let k=0;k<6;k++){const w=ring(k,6,0.5);p.civ.walk.push({x:w.x,z:w.z})}   // pontos por onde os civis caminham
  const ng=POIX.guards[p.type]||POIX.guards.def;
  for(let i=0;i<ng;i++){const w=ring(i,ng,0.45);spawnNpc(p.civ,{role:'guard',x:w.x,z:w.z,y:p.y,yaw:w.a,stationary:true})}
  for(let i=0;i<(POIX.civ[p.type]||0);i++){const w=ring(i*2+1,Math.max(6,(POIX.civ[p.type]||0)*2),0.3+0.15*(i%2));spawnNpc(p.civ,{role:'civ',x:w.x,z:w.z,y:p.y,yaw:w.a})}
  p.civ.svc={};
  for(const s of p.svcSpec||[]){if(s.seat)continue;p.civ.svc[s.kind]=spawnNpc(p.civ,{role:s.role,x:s.x,z:s.z,y:p.y,yaw:s.yaw||0,stationary:true})}
  if(p.type==='tavern')for(const k of p.keepers||[]){
    const merc=k.merc&&o==='player',n=spawnNpc(p.civ,{role:merc?'merc':k.role,x:k.x,z:k.z,y:p.y,yaw:k.yaw,stationary:true,sit:k.sit});
    if(merc)p.civ.svc.merc=n;   // o mercenário é o freguês sentado da mesa
  }
}
Hooks.on('round',()=>{for(const p of WORLD.pois||[]){if(p.type==='ruins'&&poiX().done[p.id]){delete poiX().done[p.id];poiGarrisonSync(p)}   // ruínas: os guardiões voltam a cada rodada (done = guarnição derrotada nesta rodada); o baú não volta
    if(POI_DEFS[p.type].war)poiGarrisonSync(p);else poiCivSync(p)}});   // moradores novos aparecem no início da rodada

// pontos de serviço: p.svcSpec = [{kind, role, label, x, z, yaw, only}] (só:'player' = só quando o POI é seu). A taverna traz o ferreiro e o mercenário

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
const poiRoomCost=p=>Math.max(1,Math.round(clinicCost(P.maxhp,poiPriceCity(p))*POIX.roomMul));   // preço da cura completa + 10% (clinicCost: game.js)

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

// ferreiro da taverna: conserta em ouro (preço normal) ou com sucata + 60% do preço em ouro; em taverna de facção o preço leva a relação (poiPriceCity)
const anvilParts=i=>Math.max(1,Math.ceil((POIX.anvil[i]||6)*(100-durOf(i))/100));
function repairWeaponScrap(i,c){   // como repairWeapon: sem saldo o ouro vira dívida
  const cost=repairCost(i,c);if(cost<=0)return false;
  const n=anvilParts(i),gold=Math.max(1,Math.round(cost*POIX.smith.goldPct));
  if(invCount('sucata')<n){toast('Sucata insuficiente: faltam '+(n-invCount('sucata'))+'.',2500);return false}
  invRemove('sucata',n);let debt=false;
  if(!Ledger.spend({gold})){Ledger.borrow({gold});debt=true}
  STATE.dur[i]=100;sfx('coin',0);toast('🔧 '+wName(i)+' consertada (−'+n+' sucata, −◉'+gold+')'+(debt?' — ⚠ você ficou em dívida!':'.'),3000);return true;
}
function svcSmith(p){
  const c=poiPriceCity(p);
  svcOpen('⚒ FERREIRO',(txt,body)=>{
    txt.innerHTML='— Traga a arma que eu devolvo como nova. Moedas: <b>◉ '+P.coins+'</b> • Sucata: <b>🔩 '+invCount('sucata')+'</b>';
    svcWeaponRows(body,(card,i)=>{
      const cost=repairCost(i,c),dmg=durOf(i)<100,n=anvilParts(i),gold=Math.max(1,Math.round(cost*POIX.smith.goldPct));
      if(dmg)card.insertAdjacentHTML('beforeend',tagLine(priceTag(c,'repair','Conserto')));
      const b=UI.button(dmg?'🔧 Consertar ◉'+cost+(P.coins<cost?' (gera dívida)':''):'Em perfeito estado','gold',()=>{repairWeapon(i,c);svcRender()});
      b.disabled=!dmg;card.appendChild(b);
      const b2=UI.button(dmg?'🔩 '+n+' sucata + ◉'+gold:'—','gold',()=>{repairWeaponScrap(i,c);svcRender()});
      b2.disabled=!dmg||invCount('sucata')<n;card.appendChild(b2);
    });
  });
}
// mercenário (só na taverna do jogador): recruta soldados como o Quartel, pelo preço da capital
function svcMerc(p){
  const c=WORLD.home;ARMY.city=c;
  svcOpen('⚔ MERCENÁRIO',(txt,body)=>{
    const cost=bp(ARMY.recruitCost,'recruit'),full=armyTotal()>=ARMY.max,left=recruitLeft(c);
    txt.innerHTML='— Espada de aluguel, a seu serviço. Soldados: <b>'+armyTotal()+'/'+ARMY.max+'</b> • Moedas: <b>◉ '+P.coins+'</b>';
    body.insertAdjacentHTML('beforeend','<div class="st">'+txtRecruitQueue(left)+'</div>'+tagLine(priceTag(c,'recruit')));
    const b=UI.button(txtRecruitBtn(cost,full,left),'gold',()=>{
      if(recruitAlly(c))toast('⚔ Um mercenário se juntou ao seu exército.',2500);else toast('Não foi possível recrutar.',2000);svcRender();
    });
    b.disabled=full||left<=0||P.coins<cost;body.appendChild(b);
  });
}
// edifício de alistamento da vila (4B-19f): só recruta (upgrades só no Quartel das cidades). Vila sua: gente leal à facção; vila neutra: gente atrás de emprego.
// Embaixo, um quadrado com o rosto de cada recruta que sobra; ao recrutar, o último some.
function recruitFace(c,i){
  const h=((c.id+1)*2654435761+i*40503)>>>0,sk='#'+SKINS[h%SKINS.length].toString(16).padStart(6,'0'),hr='#'+HAIRS[(h>>>3)%HAIRS.length].toString(16).padStart(6,'0');
  return '<div style="display:inline-block;position:relative;width:44px;height:44px;margin:3px;background:#3a3f48;border:2px solid #666;box-sizing:border-box;overflow:hidden">'
    +'<div style="position:absolute;left:9px;top:8px;width:22px;height:26px;background:'+sk+'"></div><div style="position:absolute;left:8px;top:6px;width:24px;height:9px;background:'+hr+'"></div>'
    +'<div style="position:absolute;left:13px;top:20px;width:4px;height:4px;background:#111"></div><div style="position:absolute;left:23px;top:20px;width:4px;height:4px;background:#111"></div>'
    +'<div style="position:absolute;left:15px;top:29px;width:10px;height:2px;background:#6a3a2a"></div></div>';
}
function svcRecruit(c){
  ARMY.city=c;
  svcOpen(TXT_RECRUIT_TITLE,(txt,body)=>{
    const cost=bp(ARMY.recruitCost,'recruit'),full=armyTotal()>=ARMY.max,left=recruitLeft(c);
    txt.innerHTML=txtRecruitGreeting(recruitPlace(c),facOf(0).name,left);
    if(left>0){
      body.insertAdjacentHTML('beforeend','<div class="st">'+txtRecruitQueue(left)+'</div>'+tagLine(priceTag(c,'recruit')));
      const b=UI.button(txtRecruitBtn(cost,full,left),'gold',()=>{recruitAlly(c);svcRender()});
      b.disabled=full||P.coins<cost;body.appendChild(b);
      let h='<div>';for(let k=0;k<left;k++)h+=recruitFace(c,k);body.insertAdjacentHTML('beforeend',h+'</div>');
    }
  });
}
// lojista do entreposto: comida, munição, remédios e materiais, 10% acima (soma com a relação da cidade de referência, se o dono for outra facção)
const postPrice=(base,c,kind)=>Math.max(1,Math.round(base*priceMulOf(priceExplain({city:c,kind}).concat([{txt:'Entreposto',mul:1+POIX.post.markup}]))));
// estoque de materiais do entreposto nesta rodada: fração da loja da cidade de referência, recriado a cada rodada
function postStockLeft(p,id){
  const X=poiX();if(!X.postStock)X.postStock={};
  let e=X.postStock[p.id];
  if(!e||e.r!==STATE.round){
    const full=shopFull(poiPriceCity(p)),s={};
    for(const k in full)s[k]=Math.floor(full[k]*POST_STOCK_MULTIPLIER);
    e=X.postStock[p.id]={r:STATE.round,s};
  }
  return e.s[id]===undefined?null:e.s[id];   // null = item sem limite
}
// "?" do entreposto: mesma lista da loja da cidade de referência + o acréscimo do entreposto (game.js, openPriceWhy: data-post)
function postPriceTag(c,kind){
  const ex=priceExplain({city:c,kind}).concat([{txt:'Entreposto',mul:1+POIX.post.markup}]);
  return whyTag(priceMulOf(ex),'','data-why="price" data-post="1" data-c="'+c.id+'" data-k="'+kind+'"',false);
}
function svcPost(p){
  const c=poiPriceCity(p);G.postTab='food';G.postSel=null;
  svcOpen('🏪 ENTREPOSTO',(txt,body)=>{
    const tab=G.postTab,debt=Ledger.anyDebt();
    txt.innerHTML=txtPostIntro(Math.round(POIX.post.markup*100),P.coins);
    const bar=document.createElement('div');bar.style.marginBottom='6px';   // abas como as do armeiro
    for(const [k,label] of POST_TABS)bar.appendChild(UI.button(label,tab===k?'gold':'alt',()=>{G.postTab=k;G.postSel=null;svcRender()}));
    body.appendChild(bar);
    const row=(btn,tag)=>{body.appendChild(btn);if(tag)body.insertAdjacentHTML('beforeend',tagLine(tag))};
    const item=(d,kind)=>{   // um item da bolsa por clique
      const left=d.supply&&d.shop==='store'?postStockLeft(p,d.id):null;   // só materiais têm estoque
      const pr=postPrice(d.price,c,kind),b=UI.button(d.icon+' '+d.name+' ◉'+pr+(left!==null?txtPostStock(left):''),'gold',()=>{
        if(invRoomFor(d.id)<1)toast('Bolsa cheia! Descarte algo antes de comprar.',2000);
        else if(Ledger.spend({gold:pr})){invGive([[d.id,1]]);if(left!==null)poiX().postStock[p.id].s[d.id]--;sfx('coin',0)}
        svcRender();
      });
      b.disabled=debt||P.coins<pr||(left!==null&&left<=0);b.title=d.desc;row(b,postPriceTag(c,kind));
    };
    const items=shop=>Object.values(DATA.items).filter(d=>d.shop===shop&&!d.rod);
    if(tab==='food')items('tavern').forEach(d=>item(d,'tavern'));
    else if(tab==='heal')items('clinic').forEach(d=>item(d,'heal'));
    else if(tab==='mat')items('store').forEach(d=>item(d,'buy'));
    else if(tab==='ammo')WEAPONS.forEach((w,i)=>{
      if(!WS.owned[i])return;
      const pk=postPrice(w.packCost,c,'ammo'),full=WS.reserve[i]>=w.pack*8;
      const b=UI.button('+'+w.pack+' '+w.name+' ◉'+pk+' ('+WS.reserve[i]+')','gold',()=>{
        if(pistolDebtOk(i,pk)&&P.coins<pk)Ledger.borrow({gold:pk}),WS.reserve[i]=Math.min(WS.reserve[i]+w.pack,w.pack*8),sfx('coin',0);
        else if(Ledger.spend({gold:pk})){WS.reserve[i]=Math.min(WS.reserve[i]+w.pack,w.pack*8);sfx('coin',0)}svcRender();
      });
      b.disabled=full||(!pistolDebtOk(i,pk)&&(debt||P.coins<pk));row(b,postPriceTag(c,'ammo'));
    });
    else postSellTab(p,c,body);
  });
}
// aba Venda: o entreposto compra o que está na bolsa pelo mesmo valor das lojas da cidade de referência (relação, facção, reunião)
function postSellTab(p,c,body){
  const inv=STATE.inv,wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:18px;flex-wrap:wrap';
  const left=document.createElement('div'),right=document.createElement('div');right.style.cssText='min-width:240px;max-width:300px';
  wrap.append(left,right);body.appendChild(wrap);
  UI.slotGrid(left,{cols:5,slots:inv.slots.slice(0,inv.size),
    render:(s,i)=>{const d=s&&itemDef(s.id);return{label:d?d.icon:'',count:s?s.n:0,
      title:d?d.name+(s.n>1?' ×'+s.n:'')+(d.noSell?' (não vendável)':' — ◉'+sellUnitPrice(s.id,c)+' cada'):'Vazio',
      cls:(G.postSel===i?'sel':'')+(s?' '+itemSlotCls(s.id):'')}},
    onClick:(s,i)=>{G.postSel=i;svcRender()}});
  const s=G.postSel!==null&&G.postSel!==undefined?inv.slots[G.postSel]:null;
  if(!s){right.innerHTML='<p class="st">'+TXT_POST_SELL_HINT+'</p>';return}
  const d=itemDef(s.id),n=s.n,ex=sellEffects(s.id,c);
  right.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+d.name+'</b> ×'+n+'<p class="st">'+d.desc+'<br>'
    +(d.noSell?TXT_POST_NO_SELL:txtPostSellPrice(sellUnitPrice(s.id,c),d.value)+' '
      +(ex.length?whyTag(priceMulOf(ex),'','data-why="sell" data-c="'+c.id+'" data-i="'+s.id+'"',true):''))+'</p>';
  if(d.noSell)return;
  const sell=q=>{
    const r=sellItem(c,s.id,q);
    if(r.sold>0){sfx('coin',0);toast('Vendido: '+r.sold+'× '+d.name+'  +◉'+r.earned+(r.broke?'  •  '+TXT_POST_BROKE:''),2200)}
    else if(r.broke)toast(TXT_POST_BROKE_FULL,2200);
    svcRender();
  };
  right.appendChild(UI.button('Vender 1','gold',()=>sell(1)));
  if(n>1)right.appendChild(UI.button('Vender tudo ('+n+')','alt',()=>sell(n)));
}
// pousadeiro (pousada) e cozinheiro (alojamento): comida, remédios e quarto; preços com o acréscimo de POI_REST (poi-modifiers.js).
// A produção do tile entra na loja na etapa 8 (o tile ainda não tem economia).
function svcInn(p){
  const c=poiPriceCity(p),K=POI_REST[p.type]||POI_REST.inn,mark=1+K.markup,name=POI_DEFS[p.type].n;
  const price=(base,kind)=>Math.max(1,Math.round(base*priceMulOf(priceExplain({city:c,kind}).concat([{txt:name,mul:mark}]))));
  const tag=kind=>whyTag(priceMulOf(priceExplain({city:c,kind}).concat([{txt:name,mul:mark}])),'',   // "%" + "?": explica o preço (acréscimo do POI em data-xl/xm)
    'data-why="price" data-c="'+c.id+'" data-k="'+kind+'" data-xl="'+name+'" data-xm="'+mark+'"',false);
  G.innMode='menu';G.innTab='food';G.innSel=null;
  svcOpen(txtRestTitle(p.type),(txt,body)=>{
    const mode=G.innMode,gold=innCash(p),back=()=>{G.innMode='menu';G.innSel=null;svcRender()};
    if(mode==='menu'){   // regra dos comerciantes: antes de tudo, Comprar ou Vender (como na Loja)
      svcShopHeader(txt,gold);
      body.insertAdjacentHTML('beforeend','<p>'+txtRestGreeting(p.type,Math.round(K.markup*100))+'</p>');
      body.appendChild(UI.button('🛍 Comprar','gold',()=>{G.innMode='buy';svcRender()}));
      body.appendChild(UI.button('🎒 Vender itens','gold',()=>{G.innMode='sell';G.innSel=null;svcRender()}));
      return;
    }
    if(mode==='sell'){svcShopHeader(txt,gold);innSellTab(p,c,body);svcShopBack(body,back);return}
    const X=poiX(),r=X.room,has=r&&r.poi===p.id&&r.round===STATE.round,debt=Ledger.anyDebt(),cards=[];
    if(G.innTab==='room'){
      const cost=Math.max(1,Math.round(clinicCost(P.maxhp,c)*K.room));
      cards.push({icon:'🛏',name:'Quarto',desc:txtRestRoomDesc(p.type),tag:tag('healhp'),label:has?txtRestRoomHeld(p.type):txtRestRoomRent(cost),disabled:has||debt||P.coins<cost,
        onBuy:()=>{if(!Ledger.spend({gold:cost}))return;innCashAdd(p,cost);X.room={poi:p.id,round:STATE.round};sfx('coin',0);svcRender()}});
    }else{
      const shop=G.innTab==='heal'?'clinic':'tavern',kind=G.innTab==='heal'?'heal':'tavern';
      for(const d of Object.values(DATA.items).filter(d=>d.shop===shop&&!d.rod)){
        const pr=price(d.price,kind);
        cards.push({icon:d.icon,name:d.name,desc:d.desc,tag:tag(kind),label:'Comprar ◉'+pr,disabled:debt||P.coins<pr,onBuy:()=>{
          if(invRoomFor(d.id)<1)toast('Bolsa cheia! Descarte algo antes de comprar.',2000);
          else if(Ledger.spend({gold:pr})){invGive([[d.id,1]]);innCashAdd(p,pr);sfx('coin',0)}
          svcRender()}});
      }
    }
    svcShopView(txt,body,{gold,tabs:REST_TABS,tab:G.innTab,onTab:k=>{G.innTab=k;svcRender()},cards,onBack:back});
  });
}
// ouro do comerciante da pousada: começa em POI_REST.cash a cada rodada, cai quando ele compra de você e sobe quando você compra dele
function innCash(p){
  const X=poiX();if(!X.innCash)X.innCash={};
  let e=X.innCash[p.id];if(!e||e.r!==STATE.round)e=X.innCash[p.id]={r:STATE.round,left:(POI_REST[p.type]||POI_REST.inn).cash};
  return e.left;
}
const innCashAdd=(p,n)=>{innCash(p);poiX().innCash[p.id].left+=n};
// aba Vender: a mochila aparece, clique no item para ver o preço (o da loja da cidade de referência, com "?" explicando); ele só paga até o ouro que tem
function innSellTab(p,c,body){
  const inv=STATE.inv,wrap=document.createElement('div');wrap.style.cssText='display:flex;gap:18px;flex-wrap:wrap';
  const lf=document.createElement('div'),right=document.createElement('div');right.style.cssText='min-width:240px;max-width:300px';
  wrap.append(lf,right);body.appendChild(wrap);
  UI.slotGrid(lf,{cols:5,slots:inv.slots.slice(0,inv.size),
    render:(s,i)=>{const d=s&&itemDef(s.id);return{label:d?d.icon:'',count:s?s.n:0,
      title:d?d.name+(s.n>1?' ×'+s.n:'')+(d.noSell?' (não vendável)':' — ◉'+sellUnitPrice(s.id,c)+' cada'):'Vazio',
      cls:(G.innSel===i?'sel':'')+(s?' '+itemSlotCls(s.id):'')}},
    onClick:(s,i)=>{G.innSel=i;svcRender()}});
  const s=G.innSel!==null&&G.innSel!==undefined?inv.slots[G.innSel]:null;
  if(!s){right.innerHTML='<p class="st">'+TXT_POST_SELL_HINT+'</p>';return}
  const d=itemDef(s.id),n=s.n,pr=sellUnitPrice(s.id,c);
  right.innerHTML='<div style="font-size:30px">'+d.icon+'</div><b>'+d.name+'</b> ×'+n+'<p class="st">'+d.desc+'<br>'
    +(d.noSell?TXT_POST_NO_SELL:txtPostSellPrice(pr,d.value)+' '+whyTag(priceMulOf(sellEffects(s.id,c)),'','data-why="sell" data-c="'+c.id+'" data-i="'+s.id+'"',true))+'</p>';
  if(d.noSell)return;
  const sell=q=>{
    let sold=0,earned=0,broke=false;
    for(let i=0;i<q;i++){
      if(d.weapon!==undefined&&weaponsOwnedCount()<=1){toast('Você precisa ficar com pelo menos uma arma.',2200);break}
      if(innCash(p)<pr){broke=true;break}
      if(invRemove(s.id,1)<1)break;
      innCashAdd(p,-pr);Ledger.add('gold',pr);sold++;earned+=pr;
    }
    if(s.id==='reliquia'&&sold>0&&typeof msRelicSold==='function')msRelicSold();
    if(sold>0){sfx('coin',0);toast('Vendido: '+sold+'× '+d.name+'  +◉'+earned+(broke?'  •  '+TXT_POST_BROKE:''),2200)}
    else if(broke)toast(TXT_POST_BROKE_FULL,2200);
    svcRender();
  };
  right.appendChild(UI.button('Vender 1','gold',()=>sell(1)));
  if(n>1)right.appendChild(UI.button('Vender tudo ('+n+')','alt',()=>sell(n)));
}
// taverneiro: comida e quarto
function svcTavern(p){
  const c=poiPriceCity(p);
  svcOpen('🍺 TAVERNEIRO',(txt,body)=>{
    const X=poiX(),r=X.room,has=r&&r.poi===p.id&&r.round===STATE.round,cost=poiRoomCost(p);
    txt.innerHTML='— Sente-se! Comida quente ou uma cama? (o quarto custa a cura completa + 10%) Moedas: <b>◉ '+P.coins+'</b>';
    body.appendChild(UI.button('🍲 Comprar comida','gold',()=>openStore(c,'tavern')));
    body.insertAdjacentHTML('beforeend',tagLine(priceTag(c,'healhp','Quarto')));
    const b=UI.button(has?'🛏 Quarto reservado (porta aberta, andar de cima)':'🛏 Alugar quarto ◉'+cost,'gold',()=>{
      if(!Ledger.spend({gold:cost})){toast('Ouro insuficiente para o quarto (◉'+cost+').',2500);return}
      X.room={poi:p.id,round:STATE.round};sfx('coin',0);toast('🛏 Quarto reservado (−◉'+cost+'). É o da porta aberta, no andar de cima.',4500);svcRender();
    });
    b.disabled=has;body.appendChild(b);
    if(!has)body.insertAdjacentHTML('beforeend','<p class="st">No quarto, a cama faz a noite virar manhã (ou o dia virar noite) e recupera a vida.</p>');
  });
}

// ---------- interações: vigia e binóculo da torre, balcão e cama da taverna, ferreiro e lojista ----------
function poiScan(lines){
  for(const p of WORLD.pois||[]){
    const own=p.owner==='player',svc=poiSvcOk(p);if(!own&&!svc)continue;   // vigia e binóculo só nos seus; taverneiro e cama também nos de facções amigas
    const atVigil=(p.vigilPos&&Math.hypot(P.x-p.vigilPos.x,P.z-p.vigilPos.z)<2.6&&Math.abs(P.y-p.y)<2.6)
      ||(p.binoc&&Math.hypot(P.x-p.binoc.x,P.z-p.binoc.z)<1.8&&Math.abs(P.y-p.binoc.y)<3);   // base da torre ou binóculo no tripé
    if(own&&atVigil){G.target={type:'poivigil',p};lines.push(TXT_VIGIL_HINT)}
    if(svc&&p.tavern&&Math.hypot(P.x-p.tavern.x,P.z-p.tavern.z)<3.2&&Math.abs(P.y-p.y)<2.6){G.target={type:'poibar',p};lines.push('[E] Taverneiro: comida e quarto')}
    if(own&&p.stove&&Math.hypot(P.x-p.stove.x,P.z-p.stove.z)<3.0&&Math.abs(P.y-p.y)<2.6){G.target={type:'stove',p};lines.push('[E] Fogão: cozinhar')}   // igual ao da taverna da cidade (game.js: openCooking), só na taverna sua
    if(svc&&p.bed&&Math.hypot(P.x-p.bed.x,P.z-p.bed.z)<2.4&&Math.abs(P.y-p.bed.y)<2.6){G.target={type:'poibed',p};const r=poiX().room;lines.push(r&&r.poi===p.id&&r.round===STATE.round?'[E] Dormir (noite vira manhã; dia vira noite)':txtBedLocked(p.type))}
  }
  for(const p of WORLD.pois||[])if(p.firePos&&poiLive(p)&&Math.hypot(P.x-p.firePos.x,P.z-p.firePos.z)<3.4&&Math.abs(P.y-p.y)<3){G.target={type:'fire'};lines.push('[E] Fogueira: cozinhar')}   // fogueira do POI (alojamento): a do acampamento de bandidos, sempre funcional, de qualquer dono
  let best=null;   // o serviço mais perto de você (o ferreiro e a bigorna ficam próximos)
  const cand=(p,x,z,tg,txt,r)=>{const d=Math.hypot(P.x-x,P.z-z);if(d<r&&Math.abs(P.y-p.y)<2.6&&(!best||d<best.d))best={d,tg,txt}};
  for(const p of WORLD.pois||[]){
    for(const s of p.svcSpec||[])if(poiSvcOk(p)&&p.civ.svc&&p.civ.svc[s.kind]&&p.civ.svc[s.kind].alive)cand(p,s.x,s.z,{type:'poisvc',p,s},s.label,s.r||2.4);
  }
  if(best){G.target=best.tg;lines.push('[E] '+best.txt)}
}
function poiAct(t){
  const p=t.p,X=poiX();
  if(t.type==='poibar')return svcTavern(p);
  if(t.type==='poisvc')return t.s.kind==='smith'?svcSmith(p):t.s.kind==='merc'?svcMerc(p):t.s.kind==='inn'?svcInn(p):svcPost(p);
  if(t.type==='poivigil')return poiVigil(p);
  if(t.type==='poibed'){
    if(!(X.room&&X.room.poi===p.id&&X.room.round===STATE.round))return toast(txtBedNeedRoom(p.type),2500);
    X.room=null;const night=DN.t<0.25||DN.t>0.75;
    if(night){if(DN.t>0.75)DN.days++;DN.t=0.3}else DN.t=0.85;   // noite vira manhã (7h12); dia vira noite (20h24)
    P.hp=P.maxhp;toast(night?'😴 Você dormiu até de manhã. Vida recuperada.':'😴 Você descansou até anoitecer. Vida recuperada.',4000);
  }
}
// marcas "?" da vigia nos mapas (STATE.poiX.marks, salvas com o jogo); cada uma some perto dela (15 blocos) ou na rodada seguinte
function poiMarkCheck(){
  const ms=poiX().marks;if(!ms.length)return;
  const left=ms.filter(m=>Math.hypot(P.x-m.x,P.z-m.z)>=15);
  if(left.length!==ms.length){poiX().marks=left;toast(TXT_VIGIL_ARRIVED,2500)}
}

// ---------- "Fazer vigia" (única ação da torre): avança horas e marca o ponto mais perto no raio ----------
function poiVigil(p){
  const X=poiX(),rg=POIX.binoc.range;
  if(STATE.phase!=='commander')return toast(TXT_VIGIL_WRONG_PHASE,2500);
  if(X.vigil[p.id]===STATE.round)return toast(TXT_VIGIL_USED,2500);
  if(!X.bin||X.bin.r!==STATE.round)X.bin={r:STATE.round,f:{}};   // achados da rodada, compartilhados por todas as torres
  const near=(x,z)=>Math.hypot(x-p.cx,z-p.cz)<rg,fresh=k=>!X.bin.f[k],pool={poi:[],ruins:[],chest:[],portal:[],camp:[]};
  for(const q of WORLD.pois||[]){
    if(q.show||q===p||!poiLive(q)||!near(q.cx,q.cz))continue;
    if(q.type==='ruins'){if(fresh('r'+q.id))pool.ruins.push({k:'r'+q.id,x:q.cx,z:q.cz})}
    else if(!X.seen[q.id]&&fresh('p'+q.id))pool.poi.push({k:'p'+q.id,x:q.cx,z:q.cz,q});
  }
  WORLD.chests.forEach((ch,i)=>{if(ch.lost&&!ch.opened&&near(ch.x,ch.z)&&fresh('c'+i))pool.chest.push({k:'c'+i,x:ch.x,z:ch.z})});
  for(const pt of STATE.portals||[])if(!pt.claimed&&near(pt.x,pt.z)&&fresh('g'+pt.id))pool.portal.push({k:'g'+pt.id,x:pt.x,z:pt.z});
  for(const k of WORLD.camps)if(!k.gone&&k.state!=='cleared'&&near(k.cx,k.cz)&&fresh('k'+k.id))pool.camp.push({k:'k'+k.id,x:k.cx,z:k.cz});
  for(const k of WORLD.caves)if(!k.gone&&k.state!=='cleared'&&near(k.cx,k.cz)&&fresh('v'+k.id))pool.camp.push({k:'v'+k.id,x:k.cx,z:k.cz});
  X.vigil[p.id]=STATE.round;{const dt=POIX.vigilHours/24;DN.t+=dt;if(DN.t>=1){DN.t-=1;DN.days++}}
  const all=Object.values(pool).flat();   // acha o ponto ainda não descoberto/limpado mais perto da torre
  if(!all.length)return toast(TXT_VIGIL_NOTHING,3500);
  const f=all.reduce((m,c)=>Math.hypot(c.x-p.cx,c.z-p.cz)<Math.hypot(m.x-p.cx,m.z-p.cz)?c:m);
  X.bin.f[f.k]=true;X.marks.push({x:f.x,z:f.z});
  if(f.q)X.seen[f.q.id]=true;   // POI achado passa a aparecer no mapa
  toast(TXT_VIGIL_FOUND,4000);
}

// ---------- batalha no POI: seus soldados aparecem; o POI surge no mapa quando você chega perto ----------
function poiBattleStart(c){if(c._ally)return;c._ally=true;if(ALLIES.some(a=>a.alive)||poiCount('fort'))armyAssault(c,'')}
let POI_T=0;
function poiTick(dt){
  POI_T-=dt;if(POI_T>0)return;POI_T=0.5;
  for(const c of WORLD.garrisons||[])if(c._ally&&c.state!=='attacking'){c._ally=false;armyConquered(WORLD.home)}   // acabou (ou você recuou): de volta ao posto
  const X=poiX();
  for(const p of WORLD.pois||[])if(!p.show&&!X.seen[p.id]&&poiLive(p)&&Math.hypot(P.x-p.cx,P.z-p.cz)<POIX.reveal+poiR(p)){X.seen[p.id]=true;if(p.type!=='ruins'&&!G.creative)toast('📍 Você avistou: '+POI_DEFS[p.type].ic+' '+POI_DEFS[p.type].n+' (marcado no mapa).',3500)}
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='mapback'){closePanel();showPolicy()}});   // do mapa de volta ao cartão do evento
