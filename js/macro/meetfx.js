'use strict';
// ---------- F5b: as 12 propostas das reuniões e os efeitos delas ----------
// Cada proposta tem um efeito se for APROVADA e outro se for REPROVADA (cada um com um buff e um debuff). O efeito vale para todos (você e as NPC) por
// MEET.dur rodadas, até a próxima reunião, e SOMA com os efeitos de políticas locais. Ficam em STATE.meet.eff = {pid,side,a,from,until,mods,npc}.
//  mods: números lidos pelos sistemas (preços, imposto, necessidades, caravanas...) — ver meetMods() e os ganchos no fim deste arquivo.
//  npc : [[recurso, delta]] somado à pontuação de suprimento de TODAS as facções NPC (facsupply.js).
//  benefit(f,a): quanto a proposta beneficia (+) ou prejudica (−) a facção f (−2..+2), usado no voto dela.
const MEET_DUR=5;
const MM_NONE={tax:1,goldProd:1,need:{},auto:{},buyRes:{},sellRes:{},price:{},shopPrice:1,shopStock:1,caravanCost:1,caravanProd:0,ambushMul:1,noCamps:false,campReward:1,upkeep:0,fee:0,cityFee:0,crisisNeed:1,pact:false};
const mmx=o=>Object.assign({},MM_NONE,o);
const mpRes=r=>resName(r).toLowerCase();
const mpProd=(f,r)=>{const cs=facCities(f);return cs.length?cs.filter(c=>focusOf(c)===r).length/cs.length:0};   // fração das cidades da facção que produz r
const mpShort=(f,r)=>fsupState(f,r)==='short',mpAbund=(f,r)=>fsupState(f,r)==='abund';
const mpTemp=f=>(facOf(f)||{}).temper||'neutra';
const mpRoutes=f=>fgRoutesOf(f).length;
const mpUpset=f=>facCities(f).filter(c=>ec(c)&&ec(c).mood==='upset').length;
const MPROPS=[
  {id:'livre',name:a=>'Livre-comércio de '+mpRes(a.res),par:1,
    ok:{buff:a=>'Comprar e vender '+mpRes(a.res)+' fica 20% mais barato',debuff:()=>'Imposto das suas cidades −15%',mods:a=>mmx({buyRes:{[a.res]:0.8},sellRes:{[a.res]:0.8},tax:0.85}),npc:a=>[[a.res,0.1]]},
    no:{buff:()=>'Imposto das suas cidades +10%',debuff:a=>'Comprar '+mpRes(a.res)+' fica 15% mais caro',mods:a=>mmx({tax:1.1,buyRes:{[a.res]:1.15}}),npc:a=>[[a.res,-0.05]]},
    benefit:(f,a)=>mpProd(f,a.res)>0.3?-1.5*mpProd(f,a.res)-0.5:(mpShort(f,a.res)?2:1)},
  {id:'valor',name:a=>'Valorização de '+mpRes(a.res),par:1,
    ok:{buff:a=>'Vender '+mpRes(a.res)+' rende 25% mais',debuff:a=>'Comprar '+mpRes(a.res)+' fica 25% mais caro',mods:a=>mmx({sellRes:{[a.res]:1.25},buyRes:{[a.res]:1.25}}),npc:a=>[[a.res,-0.08]]},
    no:{buff:a=>'Comprar '+mpRes(a.res)+' fica 10% mais barato',debuff:a=>'Vender '+mpRes(a.res)+' rende 10% menos',mods:a=>mmx({buyRes:{[a.res]:0.9},sellRes:{[a.res]:0.9}}),npc:a=>[[a.res,0.04]]},
    benefit:(f,a)=>mpProd(f,a.res)>0.3?1.5:(mpShort(f,a.res)?-2:-0.8)},
  {id:'guilda',name:a=>'Guilda Mercantil ('+mpRes(a.res)+' / '+mpRes(a.res2)+')',par:2,
    ok:{buff:a=>mpRes(a.res)+' é suprido automaticamente nas suas cidades',debuff:a=>'A necessidade de '+mpRes(a.res2)+' dobra',mods:a=>mmx({auto:{[a.res]:1},need:{[a.res2]:2}}),npc:a=>[[a.res,0.12],[a.res2,-0.12]]},
    no:{buff:()=>'Imposto das suas cidades +10%',debuff:()=>'Lojas 10% mais caras',mods:()=>mmx({tax:1.1,shopPrice:1.1}),npc:()=>[]},
    benefit:(f,a)=>(mpShort(f,a.res)?1.5:0)+(mpShort(f,a.res2)?-1.5:0)+(mpProd(f,a.res2)>0.3?-0.5:0)},
  {id:'guarda',name:()=>'Guarda Unificada',
    ok:{buff:()=>'Cada caravana sua gera +5 do produto transportado por rodada',debuff:()=>'Acampamentos de bandidos param de aparecer',mods:()=>mmx({caravanProd:5,noCamps:true}),npc:()=>[]},
    no:{buff:()=>'Recompensas de acampamentos e missões +25%',debuff:()=>'Mais ataques às caravanas',mods:()=>mmx({campReward:1.25,ambushMul:2}),npc:()=>[]},
    benefit:f=>(mpTemp(f)==='pacifica'?1.5:mpTemp(f)==='agressiva'?-1:0.3)+(mpRoutes(f)?1:0)},
  {id:'festival',name:()=>'Festival Continental',
    ok:{buff:()=>'Relação com todas as facções +1',debuff:()=>'Você paga ◉150 por rodada',mods:()=>mmx({fee:150}),npc:()=>[],once:'rel+1'},
    no:{buff:()=>'◉300 no seu cofre',debuff:()=>'Relação −1 com as facções que votaram a favor',mods:()=>mmx(),npc:()=>[],once:'cofre'},
    benefit:f=>mpTemp(f)==='pacifica'?1.5:mpTemp(f)==='agressiva'?-1:0.3},
  {id:'reforma',name:()=>'Reforma Agrária',
    ok:{buff:()=>'Necessidade de alimentos −25%',debuff:()=>'Produção de ouro das suas cidades −20%',mods:()=>mmx({need:{food:0.75},goldProd:0.8}),npc:()=>[['food',0.1]]},
    no:{buff:()=>'Imposto das suas cidades +15%',debuff:()=>'Necessidade de alimentos +15%',mods:()=>mmx({tax:1.15,need:{food:1.15}}),npc:()=>[['food',-0.05]]},
    benefit:f=>mpShort(f,'food')?2:mpProd(f,'food')>0.3?-1.2:0.2},
  {id:'armas',name:()=>'Regulamento de Armas',
    ok:{buff:()=>'Conserto 30% mais barato',debuff:()=>'Munição 30% mais cara',mods:()=>mmx({price:{repair:0.7,ammo:1.3}}),npc:()=>[]},
    no:{buff:()=>'Munição 15% mais barata',debuff:()=>'Conserto 20% mais caro',mods:()=>mmx({price:{ammo:0.85,repair:1.2}}),npc:()=>[]},
    benefit:f=>mpTemp(f)==='agressiva'?1.5:mpTemp(f)==='pacifica'?-1:0.2},
  {id:'fundo',name:()=>'Fundo de Reconstrução',
    ok:{buff:()=>'Cidades descontentes têm necessidades −25%',debuff:()=>'Taxa de ◉60 por cidade sua, por rodada',mods:()=>mmx({crisisNeed:0.75,cityFee:60}),npc:()=>[]},
    no:{buff:()=>'Imposto das suas cidades +10%',debuff:()=>'Cidades descontentes têm necessidades +20%',mods:()=>mmx({tax:1.1,crisisNeed:1.2}),npc:()=>[]},
    benefit:f=>mpUpset(f)>0?1.5:-0.6},
  {id:'estradas',name:()=>'Liga de Estradas',
    ok:{buff:()=>'Caravanas 30% mais baratas e +2 de produção do produto transportado',debuff:()=>'Mais ataques às caravanas',mods:()=>mmx({caravanCost:0.7,caravanProd:2,ambushMul:2}),npc:()=>[]},
    no:{buff:()=>'Ataques às caravanas ficam raros',debuff:()=>'Caravanas 25% mais caras',mods:()=>mmx({ambushMul:0.4,caravanCost:1.25}),npc:()=>[]},
    benefit:f=>mpRoutes(f)?1.5:-0.2},
  {id:'recrut',name:()=>'Convenção de Recrutamento',
    ok:{buff:()=>'Recrutar 30% mais barato e upgrades 20% mais baratos',debuff:()=>'Manutenção de ◉15 por soldado, por rodada',mods:()=>mmx({price:{recruit:0.7,soldierup:0.8},upkeep:15}),npc:()=>[]},
    no:{buff:()=>'Upgrades e coletes 10% mais baratos',debuff:()=>'Recrutar 25% mais caro',mods:()=>mmx({price:{soldierup:0.9,vest:0.9,recruit:1.25}}),npc:()=>[]},
    benefit:f=>mpTemp(f)==='agressiva'?1.2:mpTemp(f)==='pacifica'?-1:0},
  {id:'pacto',name:()=>'Pacto de Não Agressão',
    ok:{buff:()=>'Nenhuma facção declara guerra a você',debuff:()=>'Você não pode declarar guerra, invadir cidades nem apoiar rebeliões',mods:()=>mmx({pact:true}),npc:()=>[]},
    no:{buff:()=>'Recrutar 15% mais barato (corrida armamentista)',debuff:()=>'Relação −1 com as facções agressivas',mods:()=>mmx({price:{recruit:0.85}}),npc:()=>[],once:'agressivas'},
    benefit:f=>mpTemp(f)==='pacifica'?2:mpTemp(f)==='agressiva'?-2:0},
  {id:'feira',name:()=>'Feira das Nações',
    ok:{buff:()=>'Estoque das lojas +50%',debuff:()=>'Preços das lojas +50%',mods:()=>mmx({shopStock:1.5,shopPrice:1.5}),npc:()=>NEEDS.map(r=>[r,0.05])},
    no:{buff:()=>'Preços das lojas −50%',debuff:()=>'Estoque das lojas −50%',mods:()=>mmx({shopStock:0.5,shopPrice:0.5}),npc:()=>NEEDS.map(r=>[r,-0.05])},
    benefit:f=>NEEDS.some(r=>mpProd(f,r)>0.3)?0.6:-0.4},
];
const MPD={};for(const p of MPROPS)MPD[p.id]=p;
// três propostas sorteadas (semente + rodada, para recarregar não mudar); recursos sorteados junto
function meetDraw(){
  const rng=new RNG((WORLD.seed*131+STATE.round*17+7)>>>0),ids=MPROPS.map(p=>p.id),out=[];
  while(out.length<3&&ids.length){const i=rng.int(0,ids.length-1),id=ids.splice(i,1)[0],p=MPD[id],a={};
    if(p.par){const rs=NEEDS.slice();a.res=rs.splice(rng.int(0,rs.length-1),1)[0];if(p.par>1)a.res2=rs[rng.int(0,rs.length-1)]}
    out.push({id,a});
  }
  return out;
}
const meetName=pr=>MPD[pr.id||pr.pid].name(pr.a);
// ---------- efeito ativo ----------
const meetEff=()=>{const e=meetS().eff;return e&&STATE.round<e.until?e:null};
const meetMods=()=>{const e=meetEff();return e?Object.assign({},MM_NONE,e.mods):MM_NONE};
function meetApplyEffect(pr,side,yesFids){   // aprovou (ok) ou reprovou (no): grava o efeito e faz o que vale uma vez só
  const p=MPD[pr.id],e=p[side],S=meetS();
  S.eff={pid:pr.id,side,a:pr.a,from:STATE.round,until:STATE.round+MEET_DUR,mods:e.mods(pr.a),npc:e.npc(pr.a)};
  const fs=(WORLD.factions||[]).filter(f=>facCities(f.id).length);
  if(e.once==='rel+1')for(const f of fs)relChange(f.id,1,'você aprovou o Festival Continental',true);
  else if(e.once==='cofre')goldIn(300);
  else if(e.once==='agressivas')for(const f of fs)if(f.temper==='agressiva')relChange(f.id,-1,'você reprovou o Pacto de Não Agressão',true);
  if(pr.id==='festival'&&side==='no')for(const id of yesFids)relChange(id,-1,'ela votou a favor do Festival Continental, que você reprovou',true);
  rdNow('🏛 Reunião: '+meetName(pr)+' foi '+(side==='ok'?'APROVADA':'REPROVADA')+'. Ganho: '+e.buff(pr.a)+'. Custo: '+e.debuff(pr.a)+'. Vale por '+MEET_DUR+' rodadas.');
}
// ---------- ganhos e custos nos sistemas (cada função é chamada por um sistema existente) ----------
function meetPriceFx(ctx){
  const m=meetMods(),k=ctx.kind;let mul=1;
  if(m.price[k])mul*=m.price[k];
  if((k==='buy'||k==='tavern')&&m.shopPrice!==1)mul*=m.shopPrice;
  if(k==='buy'&&ctx.item){const d=itemDef(ctx.item),r=d&&d.supply&&d.supply.res;if(r&&m.buyRes[r])mul*=m.buyRes[r]}
  return mul!==1?[{txt:'Reunião: '+meetName(meetS().eff),mul}]:[];
}
addPriceFx('meet',ctx=>meetEff()?meetPriceFx(ctx):[],85);
function meetSellFx(id){   // vender um item que conta como recurso r
  const m=meetMods(),d=itemDef(id),r=d&&d.supply&&d.supply.res;if(!r||!m.sellRes[r])return null;
  return{txt:'Reunião: '+meetName(meetS().eff),mul:m.sellRes[r]};
}
const meetTaxMul=()=>meetMods().tax;
const meetGoldProd=()=>meetMods().goldProd;
function meetNeedMul(c,res){const m=meetMods();if(m.auto[res])return 0;return(m.need[res]||1)*(moodOf(c)==='upset'?m.crisisNeed:1)}
const meetStockMul=()=>meetMods().shopStock;
const meetCaravanCost=()=>Math.round(ECON.caravan*meetMods().caravanCost);
const meetAmbushMul=()=>meetMods().ambushMul;
const meetNoCamps=()=>meetMods().noCamps;
const meetCampReward=()=>meetMods().campReward;
const meetPact=()=>meetMods().pact;
function meetNpc(fid,r){const e=meetEff();if(!e)return 0;let d=0;for(const x of e.npc||[])if(x[0]===r)d+=x[1];return d}
// fim de cada rodada: produção das caravanas, taxas e manutenção (entram no relatório)
function meetRoundEnd(rep){
  const m=meetMods();if(m===MM_NONE)return;
  if(m.caravanProd){let t=0;for(const r of STATE.rd.routes)for(const[x,y]of[[r.a,r.b],[r.b,r.a]]){const X=WORLD.cities[x],Y=WORLD.cities[y];if(X.owner==='player'&&NEEDS.includes(focusOf(Y)))t+=prodAdd(X,focusOf(Y),m.caravanProd)}
    if(t)rep.push('🏛 Reunião: as caravanas trouxeram +'+t+' de produtos para os armazéns.')}
  const fee=m.fee+m.cityFee*playerCities().length+m.upkeep*allyCount();
  if(fee>0){Ledger.borrow({gold:fee});rep.push('🏛 Reunião: custos desta rodada ◉'+fee+(m.upkeep?' (inclui manutenção dos soldados)':'')+'.')}
}
Hooks.on('round',()=>{const e=meetS().eff;if(e&&STATE.round>=e.until){rdNow('🏛 O efeito da reunião ('+meetName(e)+') terminou.');meetS().eff=null}});
// livro (Resumo): efeito ativo da reunião
function meetBookHtml(){
  const e=meetEff();if(!e)return '';const p=MPD[e.pid],s=p[e.side];
  return '<h4>Reunião das facções</h4><p><b>'+meetName(e)+'</b> — '+(e.side==='ok'?'aprovada':'reprovada')+'<br><small>Ganho: '+s.buff(e.a)+'<br>Custo: '+s.debuff(e.a)+'<br>Até a rodada '+(e.until-1)+'.</small></p>';
}
// ---------- aba "Efeitos" do livro: buffs (esquerda) e debuffs (direita) ativos agora ----------
function buffsPages(){
  const good=[],bad=[],rd=STATE.rd,rl=n=>' <small>(mais '+n+' rodada'+(n>1?'s':'')+')</small>';
  const tb={leather:'coletes −20%',food:'soldados −20%',ore:'armas −20%',gold:'recrutar/curar −20%',wood:'obras −10%, missões +10%'};
  for(const r of Object.keys(rd.rbuf||{}))good.push(resIcon(r)+' Bônus de entrega: '+tb[r]+' <small>(até o fim desta rodada)</small>');
  for(const r of Object.keys(rd.debuff||{}))bad.push('⚠ '+resIcon(r)+' Faltou '+resName(r).toLowerCase()+': '+DEB_TXT[r]+' <small>(nesta rodada)</small>');
  for(const f of(STATE.pol&&STATE.pol.fx)||[]){const isBad=/^no/.test(f.t)||((f.t==='price'||f.t==='need')&&f.p&&f.p.mul>1);(isBad?bad:good).push('📜 '+f.txt+rl(f.left))}
  const e=meetEff();if(e){const s=MPD[e.pid][e.side];good.push('🏛 '+meetName(e)+': '+s.buff(e.a)+' <small>(até a rodada '+(e.until-1)+')</small>');bad.push('🏛 '+meetName(e)+': '+s.debuff(e.a)+' <small>(até a rodada '+(e.until-1)+')</small>')}
  for(const b of STATE.buffs||[]){const d=DATA.buffs[b.id];if(d)good.push(d.icon+' '+d.name+' <small>'+Math.ceil(b.left)+' s — '+d.desc+'</small>')}
  for(const c of playerCities()){const m=moodOf(c),en=ec(c);
    if(m==='rich')good.push('😄 '+c.name+' próspera: '+MOOD_TXT.rich);else if(m==='upset')bad.push('😠 '+c.name+' descontente: '+MOOD_TXT.upset);
    const g=cityLvlGain(c);if(g.lvl>1)good.push(txtCityLvlBuff(c,g));
    if(en&&en.press)bad.push('⚔ '+c.name+' sob repressão: necessidades +'+50*en.press.n+'%')}
  // caravanas (suas e das NPC)
  for(const r of rd.routes)good.push('🛒 Caravana '+routeName(r)+': a necessidade do produto da outra cidade cai (100% some, 150% vira 100%, 200% vira 150%) <small>(enquanto a rota existir)</small>');
  if(warActive())good.push(txtWarBuffLeader(WAR.leaderPointsBonus));   // guerra: +pontos de líder (econ.js maxActions)
  poiPostEffects(good,bad);
  const li=a=>a.length?'<ul class="ldul">'+a.map(t=>'<li>'+t+'</li>').join('')+'</ul>':'<p class="ldsm">Nenhum agora.</p>';
  return['<h3>✅ Buffs ativos</h3>'+li(good),'<h3>⚠ Debuffs ativos</h3>'+li(bad)];
}
// ---------- Resumo: "Eventos em andamento" (tudo o que dura mais de uma rodada, com a contagem; o mouse mostra o que afeta) ----------
const ONG_SRC={chuva:'Grande chuva',mina:'Desabamento na mina',peste:'Peste no gado',incêndio:'Incêndio',crise:'Crise interna',sabotagem:'Sabotagem','mercenários':'Sabotagem de mercenários',antigo:'Efeito antigo'};
function ongoingDesc(f){
  const k={weapon:'armas',ammo:'munição',vest:'coletes',upgrade:'melhorias',heal:'cura e curativos',buy:'compras nas lojas',tavern:'pratos da taverna',recruit:'recrutar soldados',soldierup:'melhorias dos soldados',repair:'conserto'};
  const sel=f.p&&f.p.sel;
  switch(f.t){
    case'price':return 'Muda o preço de '+(sel?(k[sel]||sel):'todos os serviços')+(f.p&&f.p.mul?' ('+(f.p.mul>1?'+':'')+Math.round((f.p.mul-1)*100)+'%)':'')+(f.c>=0?' em '+WORLD.cities[f.c].name:'')+'.';
    case'need':return 'Muda a necessidade de '+(sel?resName(sel).toLowerCase():'recursos')+(f.p&&f.p.mul?' ('+(f.p.mul>1?'+':'')+Math.round((f.p.mul-1)*100)+'%)':'')+(f.c>=0?' em '+WORLD.cities[f.c].name:' nas suas cidades')+'.';
    case'gold':return 'Rende +◉'+((f.p&&f.p.add)||0)+' por rodada no cofre.';
    case'noProd':return 'A produção da cidade fica suspensa.';
    case'noTax':return 'A cidade não paga imposto.';
    case'noRoute':return 'Não dá para criar caravanas na cidade.';
    case'noHeal':return 'Sem cura nem remédios na cidade.';
    case'noRecruit':return 'Não dá para recrutar soldados na cidade.';
    case'prosper':return 'A cidade fica mais próspera (humor melhor).';
    case'routeProd':return 'Produção extra nas cidades da rota.';
  }
  return f.txt;
}
function ongoingHtml(){
  const rows=[],rd=STATE.rd,t=(txt,left,desc)=>'<li title="'+String(desc).replace(/"/g,'&quot;')+'">⏳ '+txt+' <small>— restam <b>'+left+'</b> rodada'+(left>1?'s':'')+'</small></li>';
  for(const f of(STATE.pol&&STATE.pol.fx)||[])if((f.dur||f.left)>1&&f.left>=1)rows.push(t('📜 '+f.txt,f.left,ongoingDesc(f)));
  const e=meetEff();if(e)rows.push(t('🏛 Reunião: '+meetName(e),e.until-STATE.round,'Ganho: '+MPD[e.pid][e.side].buff(e.a)+'. Custo: '+MPD[e.pid][e.side].debuff(e.a)+'. Vale para todas as facções.'));
  return '<h4>⏳ Eventos em andamento</h4>'+(rows.length?'<ul class="ldul">'+rows.join('')+'</ul><p class="ldsm">Passe o mouse para ver o que cada um afeta.</p>':'<p class="ldsm">Nenhum evento de várias rodadas agora.</p>');
}
