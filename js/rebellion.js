'use strict';
// ---------- Rebelião de cidades NPC (fase própria; etapa 1: núcleo sem batalha) ----------
// Desenho completo em docs/fase-5-rebeliao.md. Uma cidade NPC que fica descontente por rodadas seguidas (ups, ver facsupply.js) se rebela:
//  rodada X (turno do líder): cartão "Rebelião" com a decisão • turno do comandante: a decisão vale (etapa 2: batalhas) •
//  rodada X+1 (turno do líder): se os rebeldes venceram, cartão "Resultado" (reconhecer, anexar, ignorar...).
// Estado: STATE.reb = {cur, nfacs, cfid, last}. cur = a rebelião em andamento (só uma por vez): {cid, owner, round, stage, choice, sup, color, flag, win}
//  stage: 'queued' (na fila; o raid de bandidos tem prioridade) → 'decide' (cartão aberto) → 'wait' (decidido; resolve no fim da rodada) → 'result' (cartão de resultado).
//  nfacs: facções novas criadas por rebeliões (voltam a existir ao carregar) • cfid: {cidade: facção} de cidades que mudaram de facção.
const REB={
  minRound:3,cool:2,maxFacs:8,near:130,   // a partir da rodada 3; 2 rodadas de folga entre rebeliões; no máximo 8 facções (você incluída)
  ups:{pacifica:4,neutra:3,agressiva:3},   // rodadas seguidas descontente até a rebelião
  pSupNeutral:0.4,pSupRival:0.6,           // chance de uma facção apoiar os rebeldes: neutra com cidade perto / rival da dona
  base:0.5,buffFin:0.2,buffSup:0.1,        // sorteio do resultado: 50% base, ±20 pontos de apoio financeiro, +10 por facção que apoia os rebeldes
  fin:{gold:600,goldRank:200,res:6,resRank:2},   // apoio financeiro: ouro, comida e minério (por nível da cidade)
  join:{base:2000,perLvl:1000,perFac:1500,stay:2000},   // anexar: ◉2000 + ◉1000 por nível + ◉1500 por facção interessada (+◉2000 se você não se envolveu); a guerra vai subir isto (sabotagem)
  waves:3,startWait:10,extra:5,troop:10,troopAlly:2,   // troop: soldados que a facção envia ao ser combatida; troopAlly: mais por facção aliada dela
  centerR:8,nearR:35,leaveWarn:25,leaveLose:50,   // batalha de apoio: 3 ondas; aviso a 25 blocos da muralha e batalha perdida a 50
  rel:{finR:-2,finO:2,combat:3}            // mudança de relação com a dona (apoio financeiro aos rebeldes / à dona; reprimir na batalha); apoiar na batalha leva a "Inimiga"
};
Hooks.on('resetState',()=>{STATE.reb={cur:null,nfacs:[],cfid:{},last:-9}});
const REL_UNF=2;   // relação (Desfavorável) depois de apoiar os rebeldes e perder, se antes era neutra ou melhor
const rebS=()=>STATE.reb||(STATE.reb={cur:null,nfacs:[],cfid:{},last:-9});
const rebCity=()=>{const r=rebS().cur;return r?WORLD.cities[r.cid]:null};
const rebTotalFacs=()=>1+(WORLD.factions||[]).length;
const rebAtCap=()=>rebTotalFacs()>=REB.maxFacs;
const rebInvolved=()=>{const r=rebS().cur;return !!r&&(r.choice==='finR'||r.choice==='support')};
const rebDied=()=>{const r=rebS().cur;return !!r&&r.choice==='combat'};   // combateu a rebelião e caiu: os rebeldes venceram
const rebReinf=c=>REB.extra+(c.rank||1)+rebS().cur.sup.length;   // reforço do apoio: 5 + nível da cidade + 1 por facção que apoia
const rebFinCost=c=>({gold:REB.fin.gold+REB.fin.goldRank*(c.rank||1),food:REB.fin.res+REB.fin.resRank*(c.rank||1),ore:REB.fin.res+REB.fin.resRank*(c.rank||1)});
const rebCostTxt=k=>'◉'+k.gold+', '+k.food+' de comida e '+k.ore+' de minério';
const rebJoinCost=(c,r)=>({gold:REB.join.base+REB.join.perLvl*(c.rank||1)+REB.join.perFac*r.sup.length+(rebInvolved()?0:REB.join.stay)});
const rebNames=ids=>{const n=ids.map(i=>facOf(i).name);return n.length>1?n.slice(0,-1).join(', ')+' e '+n[n.length-1]:n.join('')};
// os dois lados: apoiam os rebeldes (r.sup) e ficam com a dona (ela mesma e as aliadas/amistosas dela no grafo)
function rebSides(r){return{pro:r.sup.slice(),con:[r.owner].concat(WORLD.factions.filter(f=>f.id!==r.owner&&!r.sup.includes(f.id)&&facCities(f.id).length&&fgV(r.owner,f.id)>=FG.allyMin).map(f=>f.id))}}
// tabela dos lados: rebeldes e quem os apoia à esquerda; a dona e quem fica com ela à direita (cada nome com a cor da facção)
function rebSidesTable(r){
  const s=rebSides(r),chip=col=>'<i style="color:'+col+';font-style:normal">■</i> ',fac=i=>chip(hex6(facColor(i)))+facOf(i).name;
  const L=[chip(hex6(FAC_COLORS[r.color].c))+'<b>Rebeldes</b>'].concat(s.pro.map(fac)),R=s.con.map((i,k)=>k?fac(i):'<b>'+fac(i)+'</b>');
  const me=chip(hex6(facColor(0)||0xffffff))+'<b>'+facOf(0).name+'</b> (você)';   // depois de escolher, a facção do jogador entra no lado em que ele ficou
  if(r.choice==='support'||r.choice==='finR')L.push(me);else if(r.choice==='combat'||r.choice==='finO')R.push(me);
  const n=Math.max(L.length,R.length);
  let h='<table style="width:100%;margin:8px 0;border-collapse:collapse;font-size:15px"><tr style="color:#c8b890;font-size:13px"><td style="width:45%">Lado dos rebeldes</td><td></td><td>Lado da facção</td></tr>';
  for(let i=0;i<n;i++)h+='<tr><td style="padding:2px 0">'+(L[i]||'')+'</td><td style="text-align:center;width:10%;color:#ff9a6a"><b>X</b></td><td>'+(R[i]||'')+'</td></tr>';
  return h+'</table>';
}
function rebSidesTxt(r){const s=rebSides(r);return 'Apoiam os rebeldes: '+(s.pro.length?rebNames(s.pro):'nenhuma facção')+'. Contra os rebeldes: '+rebNames(s.con)+'.'}

// a capital de uma facção NPC (a cidade de maior nível; empate: a de menor id) nunca se rebela
function rebCapital(fid){let b=null;for(const c of facCities(fid))if(!b||(c.rank||1)>(b.rank||1))b=c;return b}
function rebEligible(){
  return WORLD.cities.filter(c=>{
    if(c.owner!=='enemy'||!c.fid||c.rebel||!ec(c))return false;
    const f=facOf(c.fid);if(!f||facCities(c.fid).length<2||rebCapital(c.fid)===c)return false;   // facção de uma cidade só não se rebela (seria destruída)
    return true;
  });
}
const rebLimit=c=>REB.ups[(facOf(c.fid).temper)||'neutra']||3;
// facções que apoiam os rebeldes: neutras com cidade perto (40%) e rivais da dona (60%); aliadas e amistosas da dona nunca. No limite de facções, sempre há uma (a mais próxima)
function rebSupporters(c,owner){
  const out=[],dist=g=>Math.min(...facCities(g).map(x=>Math.hypot(x.cx-c.cx,x.cz-c.cz)));
  for(const f of WORLD.factions){
    if(f.id===owner||!facCities(f.id).length)continue;
    const v=fgV(owner,f.id);if(v>=8)continue;
    const p=v<=FG.rivalMax?REB.pSupRival:dist(f.id)<REB.near?REB.pSupNeutral:0;
    if(Math.random()<p)out.push(f.id);
  }
  if(rebAtCap()&&!out.length){let b=null,bd=1e9;for(const f of WORLD.factions){if(f.id===owner||!facCities(f.id).length)continue;const d=dist(f.id);if(d<bd){bd=d;b=f.id}}if(b!==null)out.push(b)}
  return out;
}
function rebNearest(c,ids){let b=null,bd=1e9;for(const g of ids){const d=Math.min(...facCities(g).map(x=>Math.hypot(x.cx-c.cx,x.cz-c.cz)));if(d<bd){bd=d;b=g}}return b}
// cor e bandeira ainda não usadas por nenhuma facção (a cor dos rebeldes é a que a facção nova adota)
function rebFreeColor(){const used=new Set([facOf(0).color].concat(WORLD.factions.map(f=>f.color)));for(let i=0;i<FAC_COLORS.length;i++)if(!used.has(i))return i;return 0}
function rebFreeFlag(){const used=new Set([facOf(0).flag].concat(WORLD.factions.map(f=>f.flag)));const free=FAC_FLAGS.map((_,i)=>i).filter(i=>!used.has(i));return free.length?free[Math.floor(Math.random()*free.length)]:0}
function rebName(){
  const have=[facOf(0).name].concat(WORLD.factions.map(f=>f.name)).join(' ').toLowerCase(),pool=[];
  for(const [n,r] of FAC_FIXED)if(!have.includes(r.toLowerCase()))pool.push(n);
  for(const [p,r] of FAC_EPITH)if(!have.includes(r.toLowerCase()))pool.push(FAC_KINDS[Math.floor(Math.random()*FAC_KINDS.length)]+' '+p+' '+r);
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:'Rebeldes';
}

// ---------- começo: fila → cartão ----------
function rebStart(c,force){   // põe a rebelião na fila (aparece no próximo turno do líder)
  const S=rebS();if(S.cur)return false;
  const owner=c.fid;
  S.cur={cid:c.id,owner,round:STATE.round+1,stage:'queued',choice:null,sup:rebSupporters(c,owner),color:rebFreeColor(),flag:rebFreeFlag(),win:null};
  return true;
}
function rebCheck(){   // chamado no fim da rodada (rebRound)
  const S=rebS();if(S.cur||STATE.round+1<REB.minRound||STATE.round-S.last<REB.cool)return;
  const cand=rebEligible().filter(c=>(ec(c).ups||0)>=rebLimit(c));if(!cand.length)return;
  cand.sort((a,b)=>(ec(b).ups||0)-(ec(a).ups||0)||Math.random()-0.5);
  rebStart(cand[0]);
}
// efeitos na cidade assim que a rebelião é anunciada: em chamas, bandeira dos rebeldes, sem serviços, sem caravanas nem missões
function rebAnnounce(){
  const r=rebS().cur,c=WORLD.cities[r.cid];r.stage='decide';
  c.rebel={color:r.color,flag:r.flag};facSetFlag(c);rebGarrisonRemove(c);   // a guarnição foi expulsa (volta como rebelde, tropa da dona ou da facção nova)
  if(typeof igniteCity==='function')igniteCity(c);
  rebRuinsEnsure(c);   // prédios queimados, crateras e corpos (etapa 3)
  const cut=x=>x.a===c.id||x.b===c.id,rd=STATE.rd,gone=rd.routes.filter(cut).concat((rd.nroutes||[]).filter(cut));
  if(gone.length){
    rd.routes=rd.routes.filter(x=>!cut(x));rd.nroutes=(rd.nroutes||[]).filter(x=>!cut(x));
    if(typeof CARAVANS!=='undefined')for(const k of CARAVANS)if(gone.includes(k.r))k.doomed=true;
    if(typeof computeBuffs==='function')computeBuffs();
  }
  for(const m of STATE.ms.taken.slice())if(m.cityId===c.id||m.destId===c.id){msDrop(m);msLine('❌ A cidade '+c.name+' se rebelou: missão cancelada ('+msTitle(m)+').')}
  for(const k in STATE.ms.fac){const o=STATE.ms.fac[k];if(o&&o.m&&(o.m.cityId===c.id||o.m.destId===c.id))o.m=null}
  facNote('🔥 '+c.name+' se rebelou contra '+facOf(r.owner).name+'.',6000);   // um só aviso, curto (os lados estão na tabela do cartão)
  return rebCard();
}
// o cartão da rebelião (ou do resultado) que está devido; 'q' = na fila; null = nada
function rebCard(){
  const r=rebS().cur;if(!r)return null;
  if(r.stage==='queued')return 'q';
  if(r.stage==='decide')return{pid:'rebnpc',city:r.cid,round:STATE.round,data:{}};
  if(r.stage==='result')return{pid:'rebresult',city:r.cid,round:STATE.round,data:{}};
  return null;
}
// fim da rodada: resolve a rebelião decidida e vê se outra começa
function rebRound(rep){
  const S=rebS(),r=S.cur;
  if(r&&r.stage==='wait'){
    const c=WORLD.cities[r.cid];
    const p=Math.max(0.1,Math.min(0.9,REB.base+(r.choice==='finR'?REB.buffFin:0)-(r.choice==='finO'?REB.buffFin:0)+REB.buffSup*r.sup.length));
    rebBattleReset();
    if(r.win===null||r.win===undefined)r.win=Math.random()<p;   // com batalha, o resultado veio dela; sem batalha (ou sem lutar), sorteio
    if(typeof igniteCity==='function')igniteCity(c);
    if(r.win){r.stage='result';rep.push('🔥 Os rebeldes de '+c.name+' venceram. Há uma decisão no turno do líder.')}
    else{rep.push('🛡 A rebelião de '+c.name+' foi esmagada: a cidade voltou a '+facOf(r.owner).name+'.');
      if(r.choice==='support'&&r.prevRel!==undefined){const v=r.prevRel>=REL_START-1?REL_UNF:r.prevRel;relSet(r.owner,v);rep.push('🕊 '+facOf(r.owner).name+' deixou de ser inimiga: a relação ficou "'+REL_ST[relStatus(r.owner)].n+'".')}   // apoiou e perdeu: neutra ou melhor antes → Desfavorável; pior antes → como estava
      rebClear(c);rebGarrisonRestore(c,r);ec(c).ups=0;S.cur=null;S.last=STATE.round}
  }
  rebCheck();
}
function rebClear(c){rebRuinsClear(c);c.rebel=null;delete STATE.burnt[c.id];if(typeof clearSmoke==='function')clearSmoke(c);facSetFlag(c)}

// ---------- facção nova e anexações ----------
function rebNewFaction(c,v,why){
  const S=rebS(),r=S.cur,id=Math.max(0,...WORLD.factions.map(f=>f.id))+1;
  const temps=['pacifica','neutra','neutra','agressiva'],f={id,name:rebName(),color:r.color,flag:r.flag,temper:temps[Math.floor(Math.random()*temps.length)],seed:c.id,rebel:true};
  S.nfacs.push(Object.assign({},f));WORLD.factions.push(f);S.cfid[c.id]=id;c.ofid=id;
  relOf(id).v=v;
  // relações com as outras NPC: rival da dona; aliada das rivais da dona; neutra com o resto
  fgSet(r.owner,id,2,'rebelião');
  for(const g of WORLD.factions){if(g.id===id||g.id===r.owner)continue;fgSet(g.id,id,fgV(r.owner,g.id)<=FG.rivalMax?8:5,'rebelião')}
  rebClear(c);rebGarrisonRestore(c,r);const e=ec(c);e.ups=0;e.mood='ok';refreshFactionLook();
  facNote('🏴 Nasce uma nova facção: '+f.name+' ('+why+').',5000);
  return f;
}
function rebAnnexBy(c,fid){   // outra facção fica com a cidade
  const S=rebS();S.cfid[c.id]=fid;c.ofid=fid;rebClear(c);rebGarrisonRestore(c,S.cur);const e=ec(c);e.ups=0;e.mood='ok';refreshFactionLook();
  facNote('🏴 '+c.name+' passou a '+facOf(fid).name+'.',5000);
}
function rebJoinPlayer(c){
  rebClear(c);polTakeCity(c);if(typeof armyConquered==='function')armyConquered(c);
  const e=ec(c);e.ups=0;e.mood='ok';e.got={};e.carry={};
  facNote('🏴 '+c.name+' se juntou à sua facção!',5000);
}
function rebEnd(){const S=rebS();S.cur=null;S.last=STATE.round}

// ---------- carregar ----------
function rebApply(){   // depois de gerar o mundo/carregar um save: devolve as facções novas, as cidades trocadas e a cidade em rebelião
  const S=rebS();
  for(const nf of S.nfacs)if(!WORLD.factions.find(f=>f.id===nf.id))WORLD.factions.push(Object.assign({},nf));
  for(const id in S.cfid){const c=WORLD.cities[id];if(c)c.ofid=S.cfid[id]}
  const r=S.cur;if(r&&r.stage!=='queued'){const c=WORLD.cities[r.cid];if(c){c.rebel={color:r.color,flag:r.flag};rebGarrisonRemove(c);if(typeof ensureSmoke==='function')ensureSmoke(c);rebRuinsEnsure(c)}}
}

// ---------- cartão 1: a decisão ----------
const rebCur=()=>rebS().cur;
const rebOwnerName=()=>facOf(rebCur().owner).name;
const rebAfter=(x,line)=>{rebCur().stage='wait';x.toast(line,4500);rdNow(line)};
const rebWithSnap=(s,f)=>{const S=rebS(),old=S.cur;S.cur=s;try{return f()}finally{S.cur=old}};   // rever o cartão depois de a rebelião sumir do estado
definePolicy({id:'rebnpc',name:'Rebelião',city:true,noRoll:true,flex:true,cool:0,snapRef:()=>rebS().cur,withSnap:rebWithSnap,
  cond:()=>!!rebCur(),
  text:(c)=>{const r=rebCur();return 'Cansados da escassez, os moradores de '+c.name+' tomaram as ruas contra '+facOf(r.owner).name+'. A guarnição foi expulsa, a cidade arde e uma bandeira nova foi hasteada. Os dois lados esperam a sua palavra.'},
  extra:(c)=>rebSidesTable(rebCur()),
  options:[
    {k:'A',label:'Apoiar os rebeldes',type:'both',eff:c=>'No turno do Comandante, vá até o centro da cidade (marcado no mapa): a batalha começa quando você chegar. Você luta ao lado dos rebeldes contra '+REB.waves+' ondas de '+rebOwnerName()+' (soldados, brutamontes, drones e golems; cada onda é mais difícil). Você vira inimigo de '+rebOwnerName()+'. Ganha '+rebReinf(c)+' soldados rebeldes ('+REB.extra+' fixos + '+(c.rank||1)+' pelo nível da cidade'+(rebCur().sup.length?' + '+rebCur().sup.length+' por facção que apoia':'')+'). Se você cair ou fugir, os rebeldes perdem.',
      apply:x=>{const r=rebCur();r.choice='support';r.prevRel=relOf(r.owner).v;relSet(r.owner,0);rebAfter(x,'⚔ Você apoia os rebeldes de '+x.city.name+': '+rebOwnerName()+' é sua inimiga.')}},
    {k:'B',label:'Combater a rebelião',type:'both',hide:()=>relStatus(rebCur().owner)==='war',eff:c=>'No turno do Comandante, vá até a cidade (marcada no mapa): a invasão começa quando você chegar perto. Os soldados dela são os rebeldes'+(rebCur().sup.length?' (mais soldados de '+rebNames(rebCur().sup)+')':'')+'. A facção envia '+(REB.troop+REB.troopAlly*(rebSides(rebCur()).con.length-1))+' soldados de vários tipos (normal, pesado, atirador, metralhador): '+REB.troop+' dela e '+REB.troopAlly+' de cada aliada, em torno da cidade. Seus soldados seguem com você. Vencendo, a relação com ela sobe (+'+REB.rel.combat+'). Se você cair, os rebeldes vencem.',
      apply:x=>{rebCur().choice='combat';rebAfter(x,'⚔ Você vai combater a rebelião de '+x.city.name+'.')}},
    {k:'C',label:'Não me envolver',type:'neutral',eff:c=>'A cidade fica em chamas e sem serviços durante o turno do Comandante. O resultado é sorteado no fim da rodada ('+Math.round(100*(1-Math.min(0.9,REB.base+REB.buffSup*rebCur().sup.length)))+'% de a rebelião ser esmagada).',
      apply:x=>{rebCur().choice='stay';rebAfter(x,'🔥 Você não se envolveu na rebelião de '+x.city.name+'.')}},
    {k:'D',label:'Apoiar financeiramente os rebeldes',type:'both',cost:x=>rebFinCost(x.city),
      eff:c=>'Paga '+rebCostTxt(rebFinCost(c))+'. Os rebeldes ganham um bônus no sorteio (+'+Math.round(REB.buffFin*100)+' pontos), mas ainda podem perder. A relação com '+rebOwnerName()+' cai ('+REB.rel.finR+'). A cidade fica em chamas e sem serviços.',
      apply:x=>{rebCur().choice='finR';relChange(rebCur().owner,REB.rel.finR);rebAfter(x,'💰 Você financiou os rebeldes de '+x.city.name+'.')}},
    {k:'E',label:'Apoiar financeiramente a facção',type:'both',cost:x=>rebFinCost(x.city),
      eff:c=>'Paga '+rebCostTxt(rebFinCost(c))+' a '+rebOwnerName()+'. Ela ganha um bônus no sorteio (+'+Math.round(REB.buffFin*100)+' pontos), mas os rebeldes ainda podem vencer. A relação com ela sobe (+'+REB.rel.finO+'). A cidade fica em chamas e sem serviços.',
      apply:x=>{rebCur().choice='finO';relChange(rebCur().owner,REB.rel.finO);rebAfter(x,'💰 Você financiou '+rebOwnerName()+' contra os rebeldes de '+x.city.name+'.')}}
  ]});

// ---------- cartão 2: o resultado (rebeldes venceram) ----------
const rebDone=()=>{rebEnd()};
definePolicy({id:'rebresult',name:'Rebelião: resultado',city:true,noRoll:true,flex:true,cool:0,snapRef:()=>rebS().cur,withSnap:rebWithSnap,
  cond:()=>!!rebCur(),
  text:(c)=>{const r=rebCur();return (rebDied()?'Você caiu na batalha e ':'')+'os rebeldes de '+c.name+' venceram e expulsaram os homens de '+facOf(r.owner).name+'. '+(rebInvolved()?'Eles lembram do seu apoio e esperam a sua resposta. ':'Eles seguem sozinhos e esperam ver o que você fará. ')+(r.sup.length?'Têm o interesse de '+rebNames(r.sup)+'. ':'')+(rebAtCap()?'Não há espaço no mundo para outra facção: a cidade vai se juntar a alguma delas.':'')},
  extra:(c)=>rebSidesTable(rebCur()),
  options:[
    {k:'A',label:'Reconhecer a nova facção',type:'buff',hide:()=>!(rebInvolved()||rebDied())||rebAtCap(),
      eff:()=>rebDied()?'Nasce uma nova facção na cor dos rebeldes. A relação com ela começa em "Neutro" e você perde relação com '+rebOwnerName()+' (−'+Math.abs(REB.rel.finR)+').':'Nasce uma nova facção na cor dos rebeldes. A relação com ela começa em "Favorável".',
      apply:x=>{if(rebDied()){rebNewFaction(x.city,5,'reconhecida por você');relChange(rebCur().owner,REB.rel.finR)}else rebNewFaction(x.city,8,'reconhecida por você');rebDone()}},
    {k:'B',label:'Propor que se junte à sua facção',type:'buff',hide:()=>rebDied(),
      eff:c=>'Paga '+rebCostTxt2(rebJoinCost(c,rebCur()))+' e a cidade passa a ser sua. Sem esse ouro, a proposta é recusada: sorteia-se se nasce uma facção neutra ou se uma facção interessada anexa a cidade.',
      apply:x=>{const k=rebJoinCost(x.city,rebCur());
        if(Ledger.spend(k)){rebJoinPlayer(x.city)}
        else{const sup=rebCur().sup,pick=sup.length&&Math.random()<0.5||rebAtCap()&&sup.length;
          if(pick)rebAnnexBy(x.city,rebNearest(x.city,sup));else if(!rebAtCap())rebNewFaction(x.city,5,'a proposta foi recusada');else rebAnnexBy(x.city,rebNearest(x.city,WORLD.factions.map(f=>f.id).filter(i=>i!==rebCur().owner)));
          x.toast('Você não tinha o ouro: a proposta foi recusada.',4000)}
        rebDone()}},
    {k:'B2',label:'Anexar a crédito (gera dívida)',type:'both',hide:c=>rebDied()||Ledger.canAfford(rebJoinCost(rebCity(),rebCur())),cost:x=>rebJoinCost(x.city,rebCur()),
      eff:c=>'Você não tem o ouro: paga ◉'+rebJoinCost(c,rebCur()).gold+' a crédito. O saldo fica negativo e as compras ficam bloqueadas até pagar. A cidade passa a ser sua.',
      apply:x=>{rebJoinPlayer(x.city);rebDone()}},
    {k:'C',label:'Ignorar',type:'neutral',hide:()=>rebInvolved()&&!rebAtCap(),
      eff:c=>rebAtCap()?'A cidade se junta a '+facOf(rebNearest(c,rebCur().sup.length?rebCur().sup:WORLD.factions.map(f=>f.id).filter(i=>i!==rebCur().owner))).name+', a facção interessada mais próxima.':'Nasce uma facção nova, mas os rebeldes ficam descontentes com você (relação "Desfavorável").',
      apply:x=>{const r=rebCur();if(rebAtCap())rebAnnexBy(x.city,rebNearest(x.city,r.sup.length?r.sup:WORLD.factions.map(f=>f.id).filter(i=>i!==r.owner)));else rebNewFaction(x.city,2,'você ignorou os rebeldes');rebDone()}},
    {k:'D',label:'Não reconhecer',type:'debuff',hide:()=>rebInvolved()||rebAtCap(),
      eff:()=>'Nasce uma facção nova, que passa a ser sua inimiga.',
      apply:x=>{rebNewFaction(x.city,0,'você não a reconheceu');rebDone()}}
  ]});
function rebCostTxt2(k){return '◉'+k.gold}

// ---------- modo criativo: forçar uma rebelião ----------
function rebForce(){
  const S=rebS();if(S.cur)return 'Já há uma rebelião em andamento.';
  const c=rebEligible().sort((a,b)=>(b.rank||1)-(a.rank||1))[0];if(!c)return 'Nenhuma cidade NPC pode se rebelar agora (cada facção precisa de 2 cidades ou mais; a capital dela nunca se rebela).';
  rebStart(c);
  if(STATE.phase==='leader'&&!(STATE.pol&&STATE.pol.pending)){
    normalizePol();STATE.pol.pending=rebAnnounce();polNoteUpdate();
  }
  return null;
}
function rebCheatHtml(){
  const r=rebS().cur,c=r?WORLD.cities[r.cid]:null;
  const st=r?{queued:'na fila (vem no próximo turno do líder)',decide:'aguardando a sua decisão',wait:'decidida; resolve no fim da rodada',result:'aguardando o resultado'}[r.stage]:'nenhuma';
  const lim=rebEligible().slice(0,6).map(x=>x.name+' ('+(ec(x).ups||0)+'/'+rebLimit(x)+')').join(', ')||'—';
  return '<h4 style="margin:12px 0 4px">Rebelião de cidades NPC</h4><small>Em andamento: <b>'+(r?c.name+' — '+st:st)+'</b><br>'+(r?rebSidesTxt(r)+'<br>':'')+'Descontentes seguidas (limite): '+lim+'</small><br><button class="alt" data-reb="force">🔥 Forçar uma rebelião</button>';
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-reb]');if(!b)return;
  const msg=rebForce();if(msg)toast(msg,3500);else toast('🔥 Rebelião preparada.',2500);
  if(typeof renderFacCheats==='function')renderFacCheats();
});

// ---------- cenário controlado (?cenario=rebeliao) ----------
// Mundo da semente 11, rodada 3 no turno do comandante, ◉20000, comida e minério 40, 5 soldados e modo criativo. Uma rebelião já está na fila:
// encerre a rodada e o cartão aparece no turno do líder. Pausa (Tab) → aba Facções tem o painel do cenário (REBSCN): ir até a cidade, encerrar a rodada,
// escolher quantas facções apoiam os rebeldes, forçar o sorteio, limpar inimigos, zerar o ouro, simular o limite de facções, nova rebelião.
const REBSCN={on:false};
function rebScenario(){
  REBSCN.on=true;
  STATE.phase='commander';STATE.round=3;P.coins=20000;STATE.res.food=40;STATE.res.ore=40;G.introBook=false;
  facSetIdentity({name:'Cenário de rebelião'});
  STATE.rd.lvl=2;STATE.rd.actions=maxActions();
  for(let i=0;i<5;i++)spawnAlly(P.x+(i-2)*2,P.z+2,WORLD.home);   // exército para ver que os reforços temporários não entram no limite
  const c=rebEligible().sort((a,b)=>(b.rank||1)-(a.rank||1))[0];
  if(c){ec(c).ups=rebLimit(c);rebStart(c)}
  // outras cidades NPC descontentes, para ver humor e preço (livro → lista de cidades)
  for(const x of rebEligible())if(x!==c)ec(x).ups=1;
}
function rebScenarioAfter(){
  const c=rebCity();
  toast('🧪 Cenário de rebelião: '+(c?c.name+' vai se rebelar quando você encerrar a rodada.':'nenhuma cidade elegível.')+' Pausa (Tab) → Facções tem o painel de testes.',9000);
}
function rebScnGo(c,center){   // você, fora da muralha (ou no centro) e de frente para a cidade
  const f=center?[c.cx+3,c.cz+3]:freeSpot(c.cx,c.cz+c.half+REB.nearR-10,0.5,1.8,0.45);
  P.x=f[0];P.z=f[1];P.y=tH(P.x,P.z)+0.1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(c.cx-P.x),-(c.cz-P.z));P.pitch=-0.05;
}
function rebScenarioHtml(){
  const r=rebS().cur,c=r?WORLD.cities[r.cid]:null,B=(k,t)=>'<button class="alt" data-rbs="'+k+'" style="margin:2px">'+t+'</button>';
  const st=r?c.name+' — '+{queued:'na fila',decide:'cartão aberto',wait:'decidida',result:'resultado pendente'}[r.stage]+(r.choice?' ('+r.choice+')':'')+(r.sup.length?' • apoiam: '+rebNames(r.sup):' • sem apoiadoras'):'nenhuma';
  return '<p class="ptitle">🧪 Cenário de rebelião</p><p class="ldsm" style="margin:2px 0 4px">Rebelião: <b>'+st+'</b>. Fluxo: Encerrar a rodada → cartão no turno do líder (livro na mesa, E) → escolha A–E → turno do comandante (batalha) → Encerrar a rodada → resultado no turno do líder.</p>'
   +B('go','📍 Perto da cidade (inicia a invasão)')+B('center','📍 Centro da cidade (inicia o apoio)')+B('end','⏭ Encerrar a rodada')+B('new','🔥 Nova rebelião')
   +'<br><small>Facções que apoiam os rebeldes (rebelião atual):</small> '+B('sup0','0')+B('sup1','1')+B('sup2','2')
   +'<br><small>Sorteio (escolha C/D/E, sem batalha):</small> '+B('win1','Rebeldes vencem')+B('win0','Rebeldes perdem')+B('winN','Aleatório')
   +'<br><small>Batalha:</small> '+B('kill','☠ Matar os inimigos')+B('heal','♥ Curar tudo')+B('sold','+5 soldados')
   +'<br><small>Ouro e limites:</small> '+B('gold0','Ouro 0 (dívida)')+B('gold1','Ouro 20000')+B('cap','Limite de facções (8)')+B('uncap','Tirar o limite')
   +'<br><button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-rbs]');if(!b)return;
  const k=b.dataset.rbs,r=rebS().cur,c=rebCity(),say=m=>toast(m,3500);
  if(k==='go'){const x=c||rebEligible()[0];if(!x)return say('Nenhuma cidade.');closePanel();rebScnGo(x)}
  else if(k==='center'){const x=c||rebEligible()[0];if(!x)return say('Nenhuma cidade.');closePanel();rebScnGo(x,true)}
  else if(k==='end'){closePanel();endRound(WORLD.home)}
  else if(k==='new'){const m=rebForce();say(m||'🔥 Rebelião preparada.')}
  else if(k.startsWith('sup')){if(!r)return say('Sem rebelião.');const ids=WORLD.factions.filter(f=>f.id!==r.owner&&facCities(f.id).length).map(f=>f.id);r.sup=ids.slice(0,+k[3]);say('Apoiam os rebeldes: '+(r.sup.length?rebNames(r.sup):'ninguém'))}
  else if(k.startsWith('win')){if(!r)return say('Sem rebelião.');r.win=k==='win1'?true:k==='win0'?false:null;say('Sorteio: '+(r.win===null?'aleatório':r.win?'rebeldes vencem':'rebeldes perdem')+'. Vale só sem batalha.')}
  else if(k==='kill'){const L=RAID.active?RAID.area.enemies:c?c.enemies:[];let n=0;for(const x of L.slice())if(x.alive){damageEnemy(x,99999,false,true);n++}say('☠ '+n+' inimigos eliminados.')}
  else if(k==='heal'){P.hp=P.maxhp;say('♥ Vida cheia.')}
  else if(k==='sold'){for(let i=0;i<5;i++)spawnAlly(P.x+(i-2)*2,P.z+2,WORLD.home);say('+5 soldados.')}
  else if(k==='gold0'){P.coins=0;say('Ouro: 0.')}
  else if(k==='gold1'){P.coins=20000;STATE.res.food=40;STATE.res.ore=40;say('Ouro 20000, comida e minério 40.')}
  else if(k==='cap'){REB.maxFacs=rebTotalFacs();say('Limite de facções: '+REB.maxFacs+' (já cheio).')}
  else if(k==='uncap'){REB.maxFacs=8;say('Limite de facções: 8.')}
  if(typeof renderFacCheats==='function')renderFacCheats();
});

// ---------- etapa 3: a cidade destruída (só visual; nada disso tem colisão) ----------
// Enquanto a cidade está em rebelião: prédios chamuscados com telhado quebrado e brasas, crateras no chão e corpos de soldados e civis nas ruas.
// Tudo sai da id da cidade (hash2), então volta igual ao carregar um save; some quando a rebelião acaba (rebClear). Números em RUIN.
const RUIN={burn:0.75,craters:[3,1],bodies:[7,3],fires:2};   // casas queimadas (fração); crateras e corpos: [base, por nível]
const RUINS=[];
// topo de um ponto: a caixa de colisão mais alta (telhado, parede) sobre ele, perto da cidade; null se não há nada
function rebTopAt(x,z,y0){
  const l=Col.map.get(Math.floor(x/8)*4096+Math.floor(z/8));let t=-1e9;
  if(l)for(const b of l)if(x>=b.x0&&x<=b.x1&&z>=b.z0&&z<=b.z1&&b.y1>t&&b.y1<y0+24&&b.y1>y0)t=b.y1;
  return t>-1e8?t:null;
}
// buraco DE VERDADE no chão: baixa a altura do terreno (a física e os tiros usam essa altura) e ajusta a malha do chunk: a face de cima de cada ladrilho desce
// e entram paredes de terra em volta. Forma irregular (5 a ~20 ladrilhos): o miolo desce PIT.core e a borda PIT.ring (blocos inteiros: dá para sair andando, o degrau é 1).
// Guarda o que mudou para desfazer (rebPitUndo) quando a rebelião acaba.
const PIT={core:2,ring:1};
function rebTerrainMesh(x,z){
  const ccx=(Math.floor(x/CHK)+0.5)*CHK,ccz=(Math.floor(z/CHK)+0.5)*CHK;
  return WORLD.chunkMeshes.find(m=>m.material===MAT_TERRAIN&&m.userData.cx===ccx&&m.userData.cz===ccz)||null;
}
function rebPitDig(tx,tz){
  // forma irregular: parte do ladrilho central e vai crescendo para os vizinhos (mais perto = mais provável), sempre ligada; só em rua ou praça plana e livre
  const h0=H[tz*W+tx],ok=(x,z)=>{const i=z*W+x,ty=T[i];if(H[i]!==h0||!(ty===T_STREET||ty===T_PLAZA||ty===T_ROAD))return false;probe(x+0.5,z+0.5,0.45,H[i],1.8,1.05);return !GR.blocked};
  if(!ok(tx,tz))return null;
  const inS=new Set([tx+','+tz]),tiles=[{x:tx,z:tz}],cand=[];
  for(let dz=-3;dz<=3;dz++)for(let dx=-3;dx<=3;dx++){const d=Math.hypot(dx,dz);if(d>0&&d<=3.1)cand.push({dx,dz,d})}
  cand.sort((a,b)=>a.d-b.d);
  for(let pass=0;pass<2;pass++)for(const q of cand){   // duas passadas: a segunda pega o que ficou sem vizinho na primeira
    const x=tx+q.dx,z=tz+q.dz,k=x+','+z;if(inS.has(k))continue;
    const near=inS.has((x+1)+','+z)||inS.has((x-1)+','+z)||inS.has(x+','+(z+1))||inS.has(x+','+(z-1));
    if(near&&hash2(x*7+tz,z*5+tx,41+pass)<1.05-q.d*0.3&&ok(x,z)){inS.add(k);tiles.push({x,z})}
  }
  for(const t of tiles){   // profundo (PIT.core) só onde os 8 vizinhos também estão no buraco; senão rasa (PIT.ring): nunca há degrau maior que 1
    let full=true;for(let dz=-1;dz<=1&&full;dz++)for(let dx=-1;dx<=1;dx++)if(!inS.has((t.x+dx)+','+(t.z+dz))){full=false;break}
    t.d=full?PIT.core:PIT.ring;
  }
  const rec={tiles,quads:[],wall:null},idx=new Map();
  for(const t of tiles){const i=t.z*W+t.x;t.old=H[i];t.nh=t.old-t.d;idx.set(t.x+','+t.z,t)}
  for(const t of tiles){   // a face de cima do ladrilho, na malha do chunk
    const m=rebTerrainMesh(t.x,t.z);if(!m)continue;
    const a=m.geometry.attributes.position.array,col=m.geometry.attributes.color;
    for(let q=0;q<a.length;q+=12){
      if(a[q]!==t.x||a[q+2]!==t.z+1||a[q+3]!==t.x+1||a[q+5]!==t.z+1||a[q+6]!==t.x+1||a[q+8]!==t.z||a[q+9]!==t.x||a[q+11]!==t.z)continue;
      if(a[q+1]!==t.old||a[q+4]!==t.old||a[q+7]!==t.old||a[q+10]!==t.old)continue;
      const c0=(q/3)*3,old=[];for(let k=0;k<12;k++)old.push(col.array[c0+k]);
      rec.quads.push({m,q,c0,old});
      for(const k of[1,4,7,10])a[q+k]=t.nh;
      const sh=t.d===PIT.core?0.16:0.3;for(let k=0;k<4;k++){col.array[c0+k*3]=0.36*sh*3;col.array[c0+k*3+1]=0.27*sh*3;col.array[c0+k*3+2]=0.2*sh*3}   // terra queimada
      m.geometry.attributes.position.needsUpdate=true;col.needsUpdate=true;
    }
  }
  // paredes de terra: para cada vizinho mais alto, a face do lado dele voltada para o buraco
  const bt=new BoxBatch(),NB=[[1,0,0],[-1,0,1],[0,1,4],[0,-1,5]];
  for(const t of tiles)for(const [ox,oz] of[[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=t.x+ox,nz=t.z+oz,nt=idx.get(nx+','+nz),hn=nt?nt.nh:H[nz*W+nx];if(hn<=t.nh)continue;
    const d=ox===1?1:ox===-1?0:oz===1?5:4,sh=0.34;   // face do vizinho que olha para este ladrilho
    bt.face(d,nx,t.nh,nz,nx+1,hn,nz+1,0.34*sh*2.2,0.25*sh*2.2,0.18*sh*2.2);
  }
  rec.wall=bt.toMesh(MAT_TERRAIN);if(rec.wall)scene.add(rec.wall);
  for(const t of tiles)H[t.z*W+t.x]=t.nh;
  return rec;
}
function rebPitUndo(rec){
  for(const t of rec.tiles)H[t.z*W+t.x]=t.old;
  for(const q of rec.quads){const a=q.m.geometry.attributes.position.array,col=q.m.geometry.attributes.color;const y=rec.tiles.find(t=>a[q.q]===t.x&&a[q.q+2]===t.z+1).old;for(const k of[1,4,7,10])a[q.q+k]=y;for(let k=0;k<12;k++)col.array[q.c0+k]=q.old[k];q.m.geometry.attributes.position.needsUpdate=true;col.needsUpdate=true}
  if(rec.wall){scene.remove(rec.wall);rec.wall.geometry.dispose()}
}
function rebRuinsEnsure(c){
  if(!c||RUINS.find(x=>x.c===c))return;
  const g=new THREE.Group(),fires=[],rk=Math.max(1,c.rank||1),rn=(a,b,k)=>hash2(c.id*131+a,b,k);
  const dark=op=>new THREE.MeshLambertMaterial({color:0x17110d,transparent:true,opacity:op,depthWrite:false});
  const box=(w,h,d,x,y,z,mt)=>{const m=new THREE.Mesh(GEO_BOX,mt);m.scale.set(w,h,d);m.position.set(x,y,z);g.add(m);return m};
  // prédios queimados: fuligem sobre as paredes, telhado chamuscado e entulho/brasas sobre o telhado de verdade (a altura vem das caixas de colisão)
  (c.houses||[]).forEach((h,i)=>{
    if(rn(i,1,3)>RUIN.burn)return;
    const w=h.x1-h.x0+1,d=h.z1-h.z0+1,x=c.cx+h.x0+w/2,z=c.cz+h.z0+d/2,hb=h.bh||4,hh=hb+0.3;
    box(w+1.1,hh,d+1.1,x,c.y+hh/2,z,dark(0.5));   // fuligem nas paredes (maior que o prédio por causa do beiral)
    const at=(u,v)=>{const px=x+(u-0.5)*(w-1),pz=z+(v-0.5)*(d-1);return{px,pz,y:rebTopAt(px,pz,c.y+hb-0.5)}};   // ponto sobre o telhado, ou null se não há telhado ali
    const mid=at(0.5,0.5);if(mid.y!==null)box(w*0.55,0.12,d*0.55,mid.px,mid.y+0.07,mid.pz,dark(0.7));   // telhado chamuscado
    for(let k=0;k<4;k++){const q=at(rn(i,k,8),rn(i,k,9));if(q.y===null)continue;const s1=0.6+rn(i,k,5)*0.9,s2=0.4+rn(i,k,6)*0.7;box(s1,s2,s1,q.px,q.y+s2/2,q.pz,new THREE.MeshLambertMaterial({color:0x241a14}))}
    if(rn(i,2,4)<0.7)for(let f=0;f<RUIN.fires;f++){const q=at(rn(i,f,11),rn(i,f,12));if(q.y===null)continue;const m=box(0.7,0.7,0.7,q.px,q.y+0.35,q.pz,new THREE.MeshBasicMaterial({color:0xff7a1a}));fires.push({m,ph:rn(i,f,13)*6.28,y:q.y})}
  });
  const pts=(c.walk||[]).filter(p=>Math.hypot(p.x-c.cx,p.z-c.cz)>3),pick=(n,seed)=>{const o=[];for(let i=0;i<n&&pts.length;i++)o.push(pts[Math.floor(rn(i,seed,13)*pts.length)]);return o};
  // buracos de verdade (3×3 ladrilhos) em ruas e praças livres, com entulho em volta
  const pits=[],want=RUIN.craters[0]+RUIN.craters[1]*rk;
  for(let t=0,ok=0;t<want*8&&ok<want&&pts.length;t++){
    const p=pts[Math.floor(rn(t,20,13)*pts.length)],rec=rebPitDig(Math.floor(p.x),Math.floor(p.z));if(!rec)continue;
    ok++;pits.push(rec);const px=Math.floor(p.x)+0.5,pz=Math.floor(p.z)+0.5;
    for(let k=0;k<8;k++){const a=k/8*6.28+rn(t,k,15),rr=2.2+rn(t,k,16)*1.2,qx=px+Math.cos(a)*rr,qz=pz+Math.sin(a)*rr,sz=0.3+rn(t,k,17)*0.4;box(sz,sz*0.8,sz,qx,tH(qx,qz)+sz*0.4,qz,new THREE.MeshLambertMaterial({color:rn(t,k,22)<0.5?0x6a5a4a:0x4a4038}))}
  }
  // corpos: soldados dos dois lados e civis, caídos com uma poça de sangue
  const r=rebS().cur,rc=r?FAC_COLORS[r.color].c:0xb02a2a,oc=r&&facColor(r.owner)||0x2a4a9a,civ=[0x8a6a4a,0x6a7a8a,0x9a8a5a,0x7a4a4a];
  pick(RUIN.bodies[0]+RUIN.bodies[1]*rk,30).forEach((p,i)=>{
    const kind=rn(i,31,23),shirt=kind<0.35?rc:kind<0.7?oc:civ[i%civ.length],soldier=kind<0.7;
    const look={skin:SKINS[i%SKINS.length],shirt,pants:0x2a2a3a,hairStyle:soldier?'helmet':'none',hat:0x8a9ab0,gun:{len:0.75},scarf:0xe0e0e0};
    const m=buildHuman(look);m.group.position.set(p.x,tH(p.x,p.z)+0.25,p.z);m.group.rotation.set(0,rn(i,32,24)*6.28,1.5);g.add(m.group);
    box(1.5,0.03,1.0,p.x,tH(p.x,p.z)+0.04,p.z,new THREE.MeshLambertMaterial({color:0x5a0f0f}));
  });
  scene.add(g);RUINS.push({c,g,fires,pits});
}
function rebRuinsClear(c){const i=RUINS.findIndex(x=>x.c===c);if(i>=0){scene.remove(RUINS[i].g);for(const r of RUINS[i].pits)rebPitUndo(r);RUINS.splice(i,1)}}
function rebRuinsUpdate(){
  for(const R of RUINS){
    const near=Math.hypot(R.c.cx-P.x,R.c.cz-P.z)<R.c.half+120;R.g.visible=near;if(!near)continue;
    for(const f of R.fires){const k=0.7+0.5*Math.sin(G.t*9+f.ph)*Math.sin(G.t*5.3+f.ph*2);f.m.scale.set(0.7*k,0.9*k,0.7*k);f.m.position.y=f.y+0.45*k}
  }
}

// ---------- etapa 2: batalhas ----------
// Guarnição: ao estourar a rebelião os soldados da cidade somem (expulsos); voltam como rebeldes (batalha de repressão), como tropa da dona (rebelião esmagada)
// ou da facção nova. c.uniform é a cor de uniforme própria (entities.js, buildEnemyModel); sem ela vale a cor da facção da cidade.
const REBB={active:false,mode:null,c:null,allies:[],total:0};
// contador de aliados durante a batalha da rebelião, apoiando os rebeldes ou combatendo (os seus soldados e os reforços/tropas)
const rebAlliesNow=()=>ALLIES.filter(a=>a.alive).length;
const rebAlliesLine=()=>REBB.active?'<br>Aliados: <b style="color:#8ac8ff">'+rebAlliesNow()+'/'+Math.max(REBB.total,rebAlliesNow())+'</b>':'';   // linha sob 'Soldados' (game.js), nas duas batalhas da rebelião
function rebGarrisonRemove(c){
  const r=rebS().cur,n=c.enemies.filter(e=>e.alive).length;
  if(r&&!r.garrison)r.garrison=Math.max(n,6+2*(c.rank||1));
  for(const e of c.enemies){e.alive=false;e.gone=true;scene.remove(e.group)}c.enemies=[];c.aliveEnemies=0;c.totalEnemies=0;
}
// postos DENTRO da muralha, perto das entradas e repartidos entre elas (rebeldes na invasão; aliados na batalha de apoio)
function rebGatePosts(c,n){
  const dirs=[...new Set((c.gates||[]).map(g=>g.dir))];if(!dirs.length)dirs.push('S');
  const hx=c.hx||c.half,hz=c.hz||c.half,out=[];
  for(let i=0;i<n;i++){
    const d=dirs[i%dirs.length],k=Math.floor(i/dirs.length),s=(k%2?1:-1)*(1+Math.floor(k/2))*3.2;
    const x=d==='E'?c.cx+hx-8:d==='W'?c.cx-hx+8:c.cx+s,z=d==='S'?c.cz+hz-8:d==='N'?c.cz-hz+8:c.cz+s,f=freeSpot(x,z,0.4,1.8,0.45)||[x,z];
    out.push({x:f[0],z:f[1]});
  }
  return out;
}
function rebGarrisonSpawn(c,n,uniform,types,atGates){
  c.uniform=uniform;const rank=c.rank||1,pts=atGates?rebGatePosts(c,n):(c.walk||[]).filter(p=>Math.hypot(p.x-c.cx,p.z-c.cz)>4).sort(()=>Math.random()-0.5);
  for(let i=0;i<n;i++){
    const t=types?types[i%types.length]:(i%6===5&&rank>=3?'brute':i%4===3&&rank>=2?'hound':'soldier'),p=pts.length?pts[i%pts.length]:{x:c.cx+(i%5-2)*2,z:c.cz+Math.floor(i/5)*2};
    spawnEnemy(c,t,p.x,p.z);
  }
  c.uniform=undefined;
}
function rebGarrisonRestore(c,r){   // depois da rebelião: guarnição na cor da facção que ficou com a cidade
  if(!r)return;c.uniform=undefined;if(!c.enemies.some(e=>e.alive))rebGarrisonSpawn(c,r.garrison||(6+2*(c.rank||1)),undefined);
  c.state='idle';c.crime=false;
}
// reforços da batalha: soldados comuns que lutam por você (não contam no exército, somem no fim)
function rebTempAllies(n,col){
  const c=rebCity();
  for(let i=0;i<n;i++){const a=i/Math.max(1,n)*6.283,x=P.x+Math.cos(a)*3,z=P.z+Math.sin(a)*3,al=spawnAlly(x,z,c,col);al.temp=true;REBB.allies.push(al)}
}
function rebPostAllies(c){
  const L=ALLIES.filter(a=>a.alive&&a.temp),ps=rebGatePosts(c,L.length);   // só os rebeldes; os seus soldados chegam quando a 1ª onda começa (rebSpawnWave)
  L.forEach((a,i)=>{a.post=ps[i];a.x=ps[i].x;a.z=ps[i].z;a.y=tH(a.x,a.z);a.vy=0;a.path=null;a.state='patrol';a.patrolCity=c;a.assaultCity=null});
}
function rebTempClear(){
  for(const a of REBB.allies){a.alive=false;a.gone=true;scene.remove(a.group)}REBB.allies=[];
  for(const a of ALLIES){a.post=null;if(!a.temp&&a.alive){a.state='patrol';a.patrolCity=WORLD.home;a.assaultCity=null}}
}
function rebBattleReset(){if(REBB.active||REBB.allies.length){rebTempClear();REBB.active=false;REBB.mode=null;if(RAID.reb){RAID.reb=null;if(RAID.active)endRaid()}}}
const rebBusy=()=>RAID.active||CVB.active||G.dg||G.office||P.dead;

// --- apoiar os rebeldes: ondas de soldados da dona (raid adaptado) ---
function rebWaveSpec(i,rank){
  if(i===0)return[{t:'soldier',n:4+rank}];
  if(i===1)return[{t:'soldier',n:3+rank},{t:'bot',n:2+Math.ceil(rank/2)},{t:'brute',n:1+(rank>=3?1:0)}];
  return[{t:'soldier',n:3+rank},{t:'brute',n:2},{t:'bot',n:3},{t:'golem',n:rank>=5?2:1}];
}
function rebSupportStart(){
  const r=rebCur(),c=rebCity();if(!r||!c)return;
  const rank=Math.max(1,c.rank||1);
  const area={kind:'raid',id:600+(STATE.raidSeq=(STATE.raidSeq||0)+1),name:'Rebelião em '+c.name,cx:c.cx,cz:c.cz,y:c.y,half:c.half,biome:c.biome,rank,state:'attacking',owner:'enemy',home:false,
    enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:999,city:c,uniform:facColor(r.owner)};
  WORLD.areas.push(area);
  RAID.active=true;RAID.area=area;RAID.city=c;RAID.t=0;RAID.engaged=true;RAID.alliesCalled=true;RAID.seeT=0;RAID.waves={i:0,gapT:REB.startWait};RAID.reb={};RAID.warnT=0;   // a 1ª onda vem depois de REB.startWait segundos (o raid conta o intervalo)
  REBB.active=true;REBB.mode='support';REBB.c=c;
  rebTempAllies(rebReinf(c),FAC_COLORS[r.color].c);   // você já está no centro: os rebeldes aparecem em volta
  rebPostAllies(c);   // e todos (rebeldes e seus soldados) vão para os postos, dentro da muralha, perto das entradas
  REBB.total=rebAlliesNow();
}
function rebSpawnWave(){
  const W=RAID.waves,c=RAID.city,a=RAID.area,rank=Math.max(1,c.rank||1),spec=rebWaveSpec(W.i,rank),sides=raidSides(c,Math.min(3,W.i+1));
  if(W.i===0){   // a batalha começa: seus soldados aparecem atrás de você e entram na luta (como na invasão de cidades); depois voltam aos postos dentro da cidade
    armyAssault(a,'',x=>!x.temp);
    const mine=ALLIES.filter(x=>x.alive&&!x.temp),ps=rebGatePosts(c,mine.length);mine.forEach((x,i)=>{x.post=ps[i]});
  }
  let k=0,total=0;
  for(const s of spec)for(let i=0;i<s.n;i++){
    const [bx,bz]=raidSidePos(c,sides[k++%sides.length]),e=spawnEnemy(a,s.t,bx+(Math.random()-0.5)*6,bz+(Math.random()-0.5)*6);
    e.aggro=true;e.unseenT=99;e.reactT=0.5;total++;
  }
  W.i++;W.gapT=null;
  if(['shop','clinic','barracks','quests','store','cook','warehouse'].includes(G.panel))closePanel();
  sfx('alarm',0);toast('⚔ Onda '+W.i+'/'+REB.waves+': '+total+' soldados de '+rebOwnerName()+'!',4000);
}
function rebSupportWatch(dt){   // sair do raio da cidade: aviso e, mais longe, batalha perdida
  const c=RAID.city;if(P.dead||!c)return false;
  const d=Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))-c.half;
  if(d>REB.leaveLose){rebSupportEnd(false,'saiu');return true}
  if(d>REB.leaveWarn){RAID.warnT=(RAID.warnT||0)-dt;if(RAID.warnT<=0){RAID.warnT=4;toast('⚠ Volte à cidade! Se você seguir adiante, a batalha será perdida.',3000)}}
  return false;
}
function rebSupportEnd(win,why){
  const r=rebCur();if(!r)return;
  RAID.reb=null;if(RAID.active)endRaid();rebTempClear();REBB.active=false;REBB.mode=null;
  r.win=!!win;
  if(win){sfx('win',0);facNote('🏴 Os rebeldes de '+rebCity().name+' venceram a batalha!',5000)}
  else{
    if(why==='morte')r.endNow=true;
    facNote('☠ A batalha por '+rebCity().name+' foi perdida'+(why==='saiu'?' (você abandonou a cidade)':why==='morte'?' (você caiu)':'')+'. '+rebOwnerName()+' esmagará os rebeldes.',5000);
  }
}

// --- combater a rebelião: invasão da cidade, com os soldados dela como rebeldes ---
function rebCombatStart(){
  const r=rebCur(),c=rebCity();if(!r||!c)return;
  rebGarrisonSpawn(c,r.garrison||(6+2*(c.rank||1)),FAC_COLORS[r.color].c,undefined,true);   // rebeldes, dentro da cidade, perto das entradas
  for(const g of r.sup){const col=facColor(g);rebGarrisonSpawn(c,2,col,['soldier'],true)}   // soldados das facções que apoiam os rebeldes
  REBB.active=true;REBB.mode='combat';REBB.c=c;
  startAttack(c);rebArmyAround();rebTroops(c,r);   // seus soldados em volta de você; a tropa da facção em torno da cidade
  REBB.total=rebAlliesNow();
}
// combater a rebelião: seus soldados aparecem em volta de você e seguem para a cidade; a tropa da facção (e a das aliadas dela) cerca a cidade por fora
function rebArmyAround(){
  let i=0;const L=ALLIES.filter(a=>a.alive&&!a.temp),n=Math.max(1,L.length);
  for(const a of L){const g=i++/n*6.283,f=freeSpot(P.x+Math.cos(g)*3,P.z+Math.sin(g)*3,0.35,1.8,0.45)||[P.x,P.z];a.x=f[0];a.z=f[1];a.y=tH(a.x,a.z);a.vy=0;a.path=null}
}
function rebTroops(c,r){
  const owner=r.owner,allies=rebSides(r).con.filter(g=>g!==owner),list=[];
  for(let i=0;i<REB.troop;i++)list.push(owner);                       // a facção: REB.troop soldados
  for(const g of allies)for(let i=0;i<REB.troopAlly;i++)list.push(g);   // e cada aliada dela manda mais REB.troopAlly (você não conta)
  const kinds=['soldier','heavy','soldier','sniper','gunner','soldier'];
  list.forEach((g,k)=>{
    const ang=k/list.length*6.283+Math.random()*0.15,rad=c.half+10,f=freeSpot(c.cx+Math.cos(ang)*rad,c.cz+Math.sin(ang)*rad,0.35,1.8,0.45)||[c.cx+Math.cos(ang)*rad,c.cz+Math.sin(ang)*rad];
    const a=spawnAlly(f[0],f[1],c,facColor(g),kinds[k%kinds.length]);a.temp=true;REBB.allies.push(a);
    a.state='assault';a.assaultCity=c;a.form={ang:Math.random()*6.283,r:4+Math.random()*6};
  });
  return list.length;
}
// gatilho: apoiando os rebeldes a batalha começa quando você chega ao centro da cidade; combatendo, quando chega perto dela (invasão). Chamado a cada quadro
function rebPending(){const r=rebS().cur;return !!r&&r.stage==='wait'&&(r.choice==='support'||r.choice==='combat')&&(r.win===null||r.win===undefined)}   // decidiu lutar e ainda não resolveu
function rebMarker(){const c=rebPending()?rebCity():null;return c?{x:c.cx,z:c.cz,label:'Rebelião'}:null}   // marcador no mapa e no minimapa
// tentou encerrar a rodada com a rebelião por resolver: popup (Ok / Ir para o local). Apoiando os rebeldes vai ao centro da cidade; combatendo, ao entorno dela
let rebWin=null;
function rebTravel(){
  const r=rebS().cur,c=rebCity();if(!r||!c)return;
  const center=r.choice==='support',f=center?[c.cx+3,c.cz+3]:freeSpot(c.cx,c.cz+c.half+REB.nearR+10,0.5,1.8,0.45)||[c.cx,c.cz+c.half+REB.nearR+10];
  closePanel();P.x=f[0];P.z=f[1];P.y=tH(P.x,P.z)+0.1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(c.cx-P.x),-(c.cz-P.z));P.pitch=-0.05;
}
function rebEndPopup(){
  const r=rebS().cur,c=rebCity();if(!r||!c)return;
  if(!rebWin)rebWin=UI.window({title:'⚔ Rebelião pendente',width:460,z:70});
  rebWin.body.innerHTML='<p style="line-height:1.5">Você precisa resolver a rebelião de <b>'+c.name+'</b> antes de terminar o turno. '+(r.choice==='support'?'Vá até o centro da cidade e lute ao lado dos rebeldes.':'Vá até a cidade e combata a rebelião.')+'</p>';
  rebWin.foot.innerHTML='';
  rebWin.foot.append(UI.button('Ok','alt',()=>rebWin.close()),UI.button('Ir para o local da rebelião','gold',()=>{rebWin.close();rebTravel()}));
  rebWin.open();
  // a janela de confirmação que acabou de fechar pediu o mouse de volta (assíncrono): solta de novo para o cursor aparecer
  for(const ms of[60,200,500])setTimeout(()=>{if(rebWin.isOpen()&&document.pointerLockElement)document.exitPointerLock()},ms);
}
function rebHud(){   // combater: o contador de rebeldes e aliados no HUD do raid (no apoio quem desenha é raids.js)
  const el=document.getElementById('raidhud');if(!el)return;
  if(REBB.active&&REBB.mode==='combat'&&REBB.c){el.style.display='block';el.innerHTML='⚔ Rebelião em <b>'+REBB.c.name+'</b> • rebeldes: <b>'+REBB.c.aliveEnemies+'</b>';REBB.hudOn=true}
  else if(REBB.hudOn){REBB.hudOn=false;el.style.display='none'}
}
function rebWatch(){
  rebHud();rebRuinsUpdate();
  if(!rebPending()||REBB.active||STATE.phase!=='commander'||rebBusy())return;
  const r=rebS().cur,c=rebCity(),dx=P.x-c.cx,dz=P.z-c.cz;
  if(r.choice==='support'){if(Math.hypot(dx,dz)<REB.centerR)rebSupportStart()}
  else if(Math.max(Math.abs(dx),Math.abs(dz))-c.half<REB.nearR)rebCombatStart();
}
function rebCombatWon(c){   // chamado por checkConquest: os rebeldes foram eliminados
  const r=rebCur();if(!r||!REBB.active||REBB.mode!=='combat')return;
  c.state='idle';REBB.active=false;REBB.mode=null;rebTempClear();r.win=false;
  const d=relChange(r.owner,REB.rel.combat);
  sfx('win',0);facNote('🛡 Você esmagou a rebelião de '+c.name+'! '+rebOwnerName()+' agradece (relação '+(d>=0?'+':'')+d+').',5000);
}
function rebCombatDied(){   // chamado por die()
  const r=rebCur();if(!r||!REBB.active||REBB.mode!=='combat')return;
  REBB.active=false;REBB.mode=null;rebTempClear();r.win=true;r.endNow=true;
  facNote('☠ Você caiu combatendo a rebelião de '+rebCity().name+': os rebeldes vencem.',5000);
}
function rebAfterRespawn(){   // depois de morrer numa batalha: a rodada acaba e volta o turno do líder
  const r=rebCur();if(!r||!r.endNow)return;r.endNow=false;
  toast('☠ Você caiu: a rodada termina.',3500);
  endRound(WORLD.home);
}
