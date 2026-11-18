'use strict';
// ---------- F5c: eventos globais (cartões do turno do líder; o jogador pode intervir) ----------
// A cada rodada há GEV.chance de aparecer um evento que atinge uma ou mais facções; no mínimo GEV.gap rodadas entre dois, nunca na rodada de reunião.
// É um cartão de política (noRoll: só o sorteio daqui o cria) com respostas. Relação: uma decisão muda ±1, e as respostas marcadas como "(−2)" usam `fixed`.
// Os desastres tiram suprimento da facção por GEV.dur rodadas (fsupHit, que SOMA com caravanas, reuniões e outros efeitos); ajudar cancela o choque.
// Estado: STATE.gev = {last, embargo:[{a,b,until}], rescue:...}. Desenho e números em docs/fase-5-globais.md.
const GEV={chance:0.15,gap:4,dur:5,shock:0.35,cost:{base:300,lvl:100},give:15,sell:20,unit:{food:6,ore:6,wood:8,leather:7},buy:{n:30,price:3},tribute:100,merc:{gold:400,n:3},mercSab:300,sabShock:0.2,medical:1.15};
Hooks.on('resetState',()=>{STATE.gev={last:-99,embargo:[],rescue:null}});
const gevS=()=>STATE.gev||(STATE.gev={last:-99,embargo:[],rescue:null});
const gnm=f=>facOf(f).name,gchip=f=>fgChipName(f);
const glvl=f=>{const cs=facCities(f);return cs.length?Math.max(1,Math.min(3,Math.round(cs.reduce((s,c)=>s+(c.rank||1),0)/cs.length/2))):1};
const gcost=f=>GEV.cost.base+GEV.cost.lvl*glvl(f);
const gstock=r=>playerCities().reduce((s,c)=>s+storedOf(c,r),0);
function gtake(r,n){let left=n;for(const c of playerCities()){if(left<=0)break;left-=consumeSupply(c,r,left)}return n-left}
const gfacs=()=>(WORLD.factions||[]).filter(f=>facCities(f.id).length);
const gnews=t=>rdNow('🌍 '+t);
const gneed=(r,n)=>gstock(r)<n?'Faltam '+(n-gstock(r))+' de '+resName(r).toLowerCase()+' no armazém.':null;
function gevEmbargoed(a,b){return gevS().embargo.some(e=>STATE.round<e.until&&((e.a===a&&e.b===b)||(e.a===b&&e.b===a)))}
function gevEmbargo(a,b){gevS().embargo.push({a,b,until:STATE.round+GEV.dur});const R=STATE.rd.nroutes||[];for(let i=R.length-1;i>=0;i--){const A=WORLD.cities[R[i].a],B=WORLD.cities[R[i].b];if((A.fid===a&&B.fid===b)||(A.fid===b&&B.fid===a))R.splice(i,1)}if(typeof rebuildCaravans==='function')rebuildCaravans()}
// regra de relação: decisão = ±1 (relChange); "(−2)" = fixed
const gRel=(f,d,why)=>relChange(f,d,why,Math.abs(d)>1);
const gShock=(f,r,src)=>fsupHit(f,GEV.shock,GEV.dur,r,src);
const gOnly=ids=>ids.length>1?ids.map(gnm).join(' e '):gnm(ids[0]);

const GEV_EV=[];
function gdef(id,name,w,spec){
  GEV_EV.push({id,name,w,make:spec.make});
  definePolicy({id:'g_'+id,name,city:false,noRoll:true,flex:true,cool:0,cond:()=>!!spec.make(new RNG(7)),data:()=>spec.make(new RNG((Math.random()*1e9)|0)),text:(c,d)=>spec.text(d),options:spec.options});
}
const gpick=(rng,arr)=>arr[Math.floor(rng.next()*arr.length)];

// ---- 1. Grande chuva (comida) ----
gdef('chuva','Grande chuva',3,{
  make:rng=>{const fs=gfacs();if(!fs.length)return null;const a=gpick(rng,fs).id,b=fs.length>1&&rng.chance(0.4)?gpick(rng,fs.filter(f=>f.id!==a)).id:null;return{f:b===null?[a]:[a,b]}},
  text:d=>'Uma grande chuva destruiu as plantações de '+gOnly(d.f)+'. O povo teme a fome: sem ajuda, a comida dela ficará em falta por '+GEV.dur+' rodadas.',
  options:[
    {k:'A',label:'Oferecer alimento',type:'buff',can:x=>gneed('food',GEV.give*x.data.f.length),eff:(c,d)=>'Gasta '+GEV.give*d.f.length+' de comida do armazém. A relação sobe +1 e a crise não acontece.',
      apply:x=>{gtake('food',GEV.give*x.data.f.length);for(const f of x.data.f)gRel(f,1,'você mandou comida na grande chuva');gnews('Grande chuva: você mandou comida a '+gOnly(x.data.f).replace(/ e /g,' e a ')+'; a fome foi evitada.')}},
    {k:'B',label:'Vender comida pelo dobro',type:'both',can:x=>gneed('food',GEV.sell),eff:(c,d)=>'Vende '+GEV.sell+' de comida pelo dobro do preço (◉'+GEV.sell*GEV.unit.food*2+'). A relação cai −2 e a crise acontece.',
      apply:x=>{gtake('food',GEV.sell);Ledger.add('gold',GEV.sell*GEV.unit.food*2);for(const f of x.data.f){gRel(f,-2,'você vendeu comida pelo dobro na grande chuva');gShock(f,'food','chuva')}gnews('Grande chuva: você vendeu comida pelo dobro e lucrou; '+gOnly(x.data.f)+(x.data.f.length>1?' passam':' passa')+' fome.')}},
    {k:'C',label:'Ignorar',type:'debuff',eff:()=>'A relação cai −1 e a crise acontece.',
      apply:x=>{for(const f of x.data.f){gRel(f,-1,'você ignorou a grande chuva');gShock(f,'food','chuva')}gnews('Grande chuva: você ignorou o pedido; '+gOnly(x.data.f)+(x.data.f.length>1?' passam':' passa')+' fome.')}},
  ]});
// ---- 2. Colheita farta ----
gdef('colheita','Colheita farta',2,{
  make:rng=>{const fs=gfacs();return fs.length?{f:gpick(rng,fs).id}:null},
  text:d=>gnm(d.f)+' teve uma colheita farta e tem comida de sobra para negociar.',
  options:[
    {k:'A',label:'Comprar o excedente',type:'buff',cost:()=>({gold:GEV.buy.n*GEV.buy.price}),eff:()=>'Paga ◉'+GEV.buy.n*GEV.buy.price+' por '+GEV.buy.n+' de comida (metade do preço) para o seu armazém. A relação sobe +1.',
      apply:x=>{prodAdd(WORLD.home,'food',GEV.buy.n);gRel(x.data.f,1,'você comprou o excedente da colheita');gnews('Colheita farta: você comprou '+GEV.buy.n+' de comida de '+gnm(x.data.f)+' por um bom preço.')}},
    {k:'B',label:'Propor uma caravana de comida',type:'buff',can:x=>gevRoutePair(x.data.f)?null:'Não há cidades livres para uma caravana.',eff:()=>'Cria uma caravana sem custo entre uma cidade sua e uma dela, para trazer a comida de sobra. A relação sobe +1.',
      apply:x=>{const p=gevRoutePair(x.data.f);if(p){STATE.rd.routes.push({a:p[0].id,b:p[1].id});rebuildCaravans();computeBuffs()}gRel(x.data.f,1,'você propôs uma caravana para escoar a colheita');gnews('Colheita farta: nasceu uma caravana entre '+(p?p[0].name+' e '+p[1].name:'as duas facções')+' para escoar a comida de '+gnm(x.data.f)+'.')}},
    {k:'C',label:'Ignorar',type:'neutral',eff:()=>'Nada muda.',apply:x=>{gnews('Colheita farta em '+gnm(x.data.f)+': você não se envolveu.')}},
  ]});
// ---- 3. Desabamento na mina ----
gdef('mina','Desabamento na mina',2,{
  make:rng=>{const fs=gfacs();return fs.length?{f:gpick(rng,fs).id}:null},
  text:d=>'Uma mina de '+gnm(d.f)+' desabou. Sem ajuda, o minério dela ficará em falta por '+GEV.dur+' rodadas.',
  options:[
    {k:'A',label:'Mandar ajuda',type:'buff',cost:x=>({gold:gcost(x.data.f)}),eff:(c,d)=>'Paga ◉'+gcost(d.f)+'. A relação sobe +1 e a crise não acontece.',
      apply:x=>{gRel(x.data.f,1,'você ajudou na mina que desabou');gnews('Mina de '+gnm(x.data.f)+': sua ajuda evitou a falta de minério.')}},
    {k:'B',label:'Vender minério pelo dobro',type:'both',can:x=>gneed('ore',GEV.sell),eff:()=>'Vende '+GEV.sell+' de minério pelo dobro (◉'+GEV.sell*GEV.unit.ore*2+'). A relação cai −2 e a crise acontece.',
      apply:x=>{gtake('ore',GEV.sell);Ledger.add('gold',GEV.sell*GEV.unit.ore*2);gRel(x.data.f,-2,'você vendeu minério pelo dobro depois do desabamento');gShock(x.data.f,'ore','mina');gnews('Mina de '+gnm(x.data.f)+': você vendeu minério pelo dobro; a falta de minério vai durar.')}},
    {k:'C',label:'Ignorar',type:'debuff',eff:()=>'A relação cai −1 e a crise acontece.',
      apply:x=>{gRel(x.data.f,-1,'você ignorou o desabamento da mina');gShock(x.data.f,'ore','mina');gnews('Mina de '+gnm(x.data.f)+': você ignorou o pedido; falta minério por um tempo.')}},
  ]});
// ---- 4. Peste no gado ----
gdef('peste','Peste no gado',2,{
  make:rng=>{const fs=gfacs();return fs.length?{f:gpick(rng,fs).id}:null},
  text:d=>'Uma peste atingiu o gado de '+gnm(d.f)+'. Sem ajuda, o couro dela ficará em falta por '+GEV.dur+' rodadas.',
  options:[
    {k:'A',label:'Enviar ajuda médica',type:'both',eff:()=>'A relação sobe +1 e a crise não acontece. Nesta rodada, cura e produtos de cura ficam 15% mais caros.',
      apply:x=>{x.fx({t:'price',p:{sel:'heal',mul:GEV.medical},left:1,txt:'Ajuda médica enviada: cura e curativos +15% nesta rodada'});gRel(x.data.f,1,'você enviou ajuda médica na peste');gnews('Peste em '+gnm(x.data.f)+': você enviou ajuda médica (cura mais cara por uma rodada).')}},
    {k:'B',label:'Fechar a fronteira',type:'debuff',eff:()=>'As caravanas suas com ela acabam. A relação cai −1 e a crise acontece.',
      apply:x=>{facCutCaravans(x.data.f);gRel(x.data.f,-1,'você fechou a fronteira por causa da peste');gShock(x.data.f,'leather','peste');gnews('Peste em '+gnm(x.data.f)+': você fechou a fronteira.')}},
    {k:'C',label:'Ignorar',type:'debuff',eff:()=>'A relação cai −1 e a crise acontece.',
      apply:x=>{gRel(x.data.f,-1,'você ignorou a peste');gShock(x.data.f,'leather','peste');gnews('Peste em '+gnm(x.data.f)+': você ignorou o pedido; falta couro por um tempo.')}},
  ]});
// ---- 5. Sequestro de uma pessoa importante ----
gdef('sequestro','Sequestro',2,{
  make:rng=>{const fs=gfacs();return fs.length&&!gevS().rescue?{f:gpick(rng,fs).id}:null},
  text:d=>'Bandidos sequestraram uma pessoa importante de '+gnm(d.f)+' e a levaram para uma dungeon. Ela pede a sua ajuda.',
  options:[
    {k:'A',label:'Resgatar o refém',type:'buff',eff:(c,d)=>'Aparece um portal de resgate no mapa, aberto só nesta rodada. Limpe a dungeon e abra a jaula no turno do comandante: a relação sobe +1 e você ganha ouro. Se a rodada acabar, o refém morre (−1).',
      apply:x=>{if(!gevRescueStart(x.data.f))x.toast('Não foi possível criar o resgate agora; o refém ficou para outro dia.',3500)}},
    {k:'B',label:'Pagar o resgate',type:'buff',cost:x=>({gold:2*gcost(x.data.f)}),eff:(c,d)=>'Paga ◉'+2*gcost(d.f)+'. A relação sobe +1.',
      apply:x=>{gRel(x.data.f,1,'você pagou o resgate de um refém');gnews('Sequestro em '+gnm(x.data.f)+': você pagou o resgate.')}},
    {k:'C',label:'Ignorar',type:'debuff',eff:()=>'A relação cai −1.',apply:x=>{gRel(x.data.f,-1,'você ignorou o sequestro');gnews('Sequestro em '+gnm(x.data.f)+': você ignorou o pedido de ajuda.')}},
  ]});
// ---- 6. Visita diplomática ----
function gevRoutePair(f){   // uma cidade sua livre e uma dela livre, com produtos diferentes
  const mine=playerCities().filter(c=>!hasRoute(c)&&!polFlag('noRoute',c.id)),hers=facCities(f).filter(c=>c.owner!=='player'&&!c.rebel&&ec(c)&&!hasRoute(c));
  for(const A of mine)for(const B of hers)if(focusOf(A)!==focusOf(B))return[A,B];return null;
}
gdef('visita','Visita diplomática',2,{
  make:rng=>{const fs=gfacs();return fs.length?{f:gpick(rng,fs).id}:null},
  text:d=>'Uma delegação de '+gnm(d.f)+' chegou à sua capital em visita diplomática.',
  options:[
    {k:'A',label:'Recepção com festa',type:'buff',cost:x=>({gold:gcost(x.data.f)}),eff:(c,d)=>'Paga ◉'+gcost(d.f)+'. A relação sobe +1.',apply:x=>{gRel(x.data.f,1,'você recebeu a delegação com uma festa');gnews('Visita de '+gnm(x.data.f)+': a recepção foi um sucesso.')}},
    {k:'B',label:'Propor um acordo comercial',type:'buff',can:x=>gevRoutePair(x.data.f)?null:'Não há cidades livres para uma caravana.',eff:()=>'Cria uma caravana sem custo entre uma cidade sua e uma dela. A relação sobe +1.',
      apply:x=>{const p=gevRoutePair(x.data.f);if(p){STATE.rd.routes.push({a:p[0].id,b:p[1].id});rebuildCaravans();computeBuffs()}gRel(x.data.f,1,'você firmou um acordo comercial na visita');gnews('Visita de '+gnm(x.data.f)+': nasceu uma caravana entre '+(p?p[0].name+' e '+p[1].name:'as duas facções')+'.')}},
    {k:'C',label:'Recusar a visita',type:'debuff',eff:()=>'A relação cai −1.',apply:x=>{gRel(x.data.f,-1,'você recusou a visita da delegação');gnews('Visita de '+gnm(x.data.f)+': você recusou a delegação.')}},
  ]});
// ---- 7. Incêndio numa cidade ----
gdef('incendio','Incêndio numa cidade',2,{
  make:rng=>{const cs=WORLD.cities.filter(c=>c.owner!=='player'&&c.fid!==undefined&&!c.rebel&&ec(c));if(!cs.length)return null;const c=gpick(rng,cs);return{f:c.fid,c:c.id}},
  text:d=>'Um incêndio atingiu '+WORLD.cities[d.c].name+', de '+gnm(d.f)+'. Sem ajuda, a madeira da facção ficará em falta por '+GEV.dur+' rodadas.',
  options:[
    {k:'A',label:'Enviar ajuda',type:'buff',cost:x=>({gold:gcost(x.data.f)}),eff:(c,d)=>'Paga ◉'+gcost(d.f)+'. A relação sobe +1 e a crise não acontece.',
      apply:x=>{gRel(x.data.f,1,'você ajudou depois do incêndio');gnews('Incêndio em '+WORLD.cities[x.data.c].name+': sua ajuda salvou a cidade.')}},
    {k:'B',label:'Ignorar',type:'neutral',eff:()=>'A crise acontece, sem mudança de relação.',apply:x=>{gShock(x.data.f,'wood','incêndio');gnews('Incêndio em '+WORLD.cities[x.data.c].name+': você não se envolveu; falta madeira por um tempo.')}},
    {k:'C',label:'Aproveitar a crise',type:'debuff',eff:()=>'A relação cai −1, a cidade fica descontente e a crise acontece.',
      apply:x=>{const c=WORLD.cities[x.data.c],e=ec(c);gRel(x.data.f,-1,'você se aproveitou do incêndio');gShock(x.data.f,'wood','incêndio');if(e){e.mood='upset';e.ups=(e.ups||0)+1}gnews('Incêndio em '+c.name+': você se aproveitou da crise; a cidade está inquieta.')}},
  ]});
// ---- 8. Embargo comercial ----
gdef('embargo','Embargo comercial',2,{
  make:rng=>{const fs=gfacs();if(fs.length<2)return null;const a=gpick(rng,fs).id,b=gpick(rng,fs.filter(f=>f.id!==a)).id;return gevEmbargoed(a,b)?null:{a,b}},
  text:d=>gnm(d.a)+' impôs um embargo comercial a '+gnm(d.b)+'. Se ninguém intervir, as caravanas entre as duas param por '+GEV.dur+' rodadas.',
  options:[
    {k:'A',label:'Mediar o embargo',type:'buff',cost:x=>({gold:gcost(x.data.a)}),eff:(c,d)=>'Paga ◉'+gcost(d.a)+'. As duas relações sobem +1 e o embargo acaba.',
      apply:x=>{gRel(x.data.a,1,'você mediou o embargo');gRel(x.data.b,1,'você mediou o embargo');gnews('Embargo: você mediou e '+gnm(x.data.a)+' e '+gnm(x.data.b)+' voltaram a comerciar.')}},
    {k:'B',label:(c,d)=>'Apoiar '+gnm(d.a)+' (quem embargou)',type:'both',eff:(c,d)=>'Relação com '+gnm(d.a)+' +1 e com '+gnm(d.b)+' −1. O embargo continua.',
      apply:x=>{gRel(x.data.a,1,'você apoiou o embargo dela');gRel(x.data.b,-1,'você apoiou o embargo contra ela');gevEmbargo(x.data.a,x.data.b);gnews('Embargo: você apoiou '+gnm(x.data.a)+'; as caravanas entre as duas pararam.')}},
    {k:'C',label:(c,d)=>'Apoiar '+gnm(d.b)+' (o embargado)',type:'both',eff:(c,d)=>'Relação com '+gnm(d.b)+' +1 e com '+gnm(d.a)+' −1. O embargo acaba.',
      apply:x=>{gRel(x.data.b,1,'você apoiou o embargado');gRel(x.data.a,-1,'você se opôs ao embargo dela');gnews('Embargo: você apoiou '+gnm(x.data.b)+' e o embargo caiu.')}},
    {k:'D',label:'Ignorar',type:'neutral',eff:()=>'Nada muda por você: o embargo vale por '+GEV.dur+' rodadas.',apply:x=>{gevEmbargo(x.data.a,x.data.b);gnews('Embargo: você não se envolveu; as caravanas entre '+gnm(x.data.a)+' e '+gnm(x.data.b)+' pararam.')}},
  ]});
// ---- 9. Mercenários sem contrato ----
function gevPickCity(then){   // janela para escolher a facção alvo e uma cidade dela (a sabotagem dos mercenários)
  const w=UI.window({title:'🗡 Escolha o alvo dos mercenários',width:560,z:60});
  w.body.innerHTML='<p>Escolha a cidade que será sabotada. A relação com a facção dela cai −2, a cidade fica mais descontente e a facção perde suprimento.</p>';
  for(const f of gfacs()){const cs=facCities(f.id).filter(c=>c.owner!=='player'&&!c.rebel&&ec(c));if(!cs.length)continue;
    const row=document.createElement('div');row.style.margin='6px 0';row.innerHTML=gchip(f.id)+' ';
    for(const c of cs){const b=UI.button(c.name,'alt',()=>{w.close();w.el.remove();then(c)});b.style.margin='2px';row.appendChild(b)}
    w.body.appendChild(row)}
  w.open();
}
gdef('mercenarios','Mercenários sem contrato',2,{
  make:rng=>({}),
  text:()=>'Um bando de mercenários sem contrato oferece seus serviços a quem pagar.',
  options:[
    {k:'A',label:'Contratar os mercenários',type:'buff',cost:()=>({gold:GEV.merc.gold}),eff:()=>'Paga ◉'+GEV.merc.gold+'. Você ganha +'+GEV.merc.n+' soldados (o que passar do limite vai para a reserva).',
      apply:x=>{const g=armyGain(GEV.merc.n);gnews('Mercenários: você contratou '+GEV.merc.n+' soldados'+(g.res?' ('+g.res+' na reserva)':'')+'.')}},
    {k:'B',label:'Recusar',type:'neutral',eff:()=>'Nada muda.',apply:x=>{gnews('Mercenários: você recusou a oferta.')}},
    {k:'C',label:'Contratar para sabotar outra facção',type:'both',cost:()=>({gold:GEV.mercSab}),can:()=>gfacs().length?null:'Não há alvo.',eff:()=>'Paga ◉'+GEV.mercSab+'. Você escolhe uma cidade de outra facção: a relação cai −2, a cidade perde humor e a facção perde suprimento por '+GEV.dur+' rodadas.',
      apply:x=>{gevPickCity(c=>{const e=ec(c);gRel(c.fid,-2,'seus mercenários sabotaram '+c.name);if(typeof joyShift==='function')joyShift(c,-1);if(e)e.ups=(e.ups||0)+1;fsupHit(c.fid,GEV.sabShock,GEV.dur,null,'mercenários');gnews('Mercenários: seus homens sabotaram '+c.name+' ('+gnm(c.fid)+').')})}},
  ]});
// ---- 10. Golpe de oficiais ----
gdef('golpe','Golpe de oficiais',1,{
  make:rng=>{const cs=(typeof rebEligible==='function'?rebEligible():[]);if(!cs.length)return null;const c=gpick(rng,cs);return{f:c.fid,c:c.id}},
  text:d=>'Oficiais de '+gnm(d.f)+' conspiram para derrubar o governo a partir de '+WORLD.cities[d.c].name+'. Todos esperam saber de que lado você ficará.',
  options:[
    {k:'A',label:'Apoiar o governo',type:'buff',cost:x=>({gold:gcost(x.data.f)}),eff:(c,d)=>'Paga ◉'+gcost(d.f)+'. A relação sobe +1 e o descontentamento das cidades dela zera.',
      apply:x=>{gRel(x.data.f,1,'você apoiou o governo contra o golpe');for(const c of facCities(x.data.f)){const e=ec(c);if(e)e.ups=0}fsupCancel(x.data.f);gnews('Golpe em '+gnm(x.data.f)+': você apoiou o governo e a conspiração foi contida.')}},
    {k:'B',label:'Apoiar os conspiradores',type:'debuff',cost:x=>({gold:Math.round(gcost(x.data.f)/2)}),eff:(c,d)=>'Paga ◉'+Math.round(gcost(d.f)/2)+'. A relação cai −1 e uma rebelião em '+WORLD.cities[d.c].name+' começa antes (o apoio e a batalha são os da rebelião).',
      apply:x=>{const c=WORLD.cities[x.data.c];gRel(x.data.f,-1,'você apoiou os conspiradores');if(typeof rebS==='function'&&!rebS().cur&&rebEligible().includes(c)){ec(c).ups=rebLimit(c);rebStart(c)}else{const e=ec(c);if(e)e.ups=(e.ups||0)+2}gnews('Golpe em '+gnm(x.data.f)+': você apoiou os conspiradores; '+c.name+' vai se rebelar.')}},
    {k:'C',label:'Ficar de fora',type:'neutral',eff:()=>'Nada muda por você.',apply:x=>{gnews('Golpe em '+gnm(x.data.f)+': você não se envolveu.')}},
  ]});

// ---------- sorteio do cartão (chamado por rollPolicy) ----------
function gevCard(){
  const S=gevS();
  if(STATE.round<2||STATE.round-S.last<GEV.gap||(typeof meetDue==='function'&&meetDue()))return null;
  const rng=new RNG((WORLD.seed*977+STATE.round*31+5)>>>0);if(!rng.chance(GEV.chance))return null;   // sorteio pela semente e pela rodada: recarregar não rerrola
  const opts=GEV_EV.map(d=>({d,data:d.make(rng)})).filter(x=>x.data);if(!opts.length)return null;
  const tot=opts.reduce((s,x)=>s+x.d.w,0);let r=rng.next()*tot,pick=opts[0];for(const x of opts){r-=x.d.w;if(r<=0){pick=x;break}}
  S.last=STATE.round;return{pid:'g_'+pick.d.id,city:-1,round:STATE.round,data:pick.data};
}
// ---------- modo criativo ----------
function gevCheatHtml(){
  const S=gevS();
  return '<h4 style="margin:12px 0 4px">Eventos globais (F5c)</h4><small>Chance por rodada: '+Math.round(GEV.chance*100)+'% • mínimo '+GEV.gap+' rodadas entre eles • último: rodada '+(S.last<0?'—':S.last)+(S.embargo.filter(e=>STATE.round<e.until).length?' • embargos: '+S.embargo.filter(e=>STATE.round<e.until).map(e=>gnm(e.a)+' × '+gnm(e.b)).join(', '):'')+'</small><br>'
    +GEV_EV.map(d=>'<button class="alt" data-gev="'+d.id+'" style="margin:2px">'+d.name+'</button>').join('');
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-gev]');if(!b)return;
  const msg=polSummon('g_'+b.dataset.gev);toast(msg||'🌍 Evento no turno do líder: abra o livro (E).',3500);
  if(typeof renderFacCheats==='function')renderFacCheats();
});
// ---------- sequestro: portal de resgate, dungeon com baú de acampamento e o refém numa jaula ----------
// O portal de resgate é um portal comum convertido (mesmo lugar, outra cor e marcador azul no mapa). Dentro: bandidos, o baú comum de acampamento e o refém
// (NPC nas cores da facção que pediu ajuda) preso numa jaula que só abre depois de limpar a dungeon. Passado o prazo, o refém morre (relação −1).
function gevRescueStart(fid){
  const S=gevS();if(S.rescue||!DG.ok)return false;
  if(!(STATE.portals||[]).length)spawnPortals();
  const p=(STATE.portals||[]).find(q=>!q.claimed&&!q.golden&&!q.rescue&&!(G.dg&&G.dg.p===q));if(!p)return false;
  p.rescue={fid,until:STATE.round+1};p.reward={type:'rescue',fid};p.dead=[];   // o portal fica aberto só nesta rodada
  const i=PORTALS.findIndex(m=>m.id===p.id);if(i>=0){scene.remove(PORTALS[i].group);PORTALS.splice(i,1)}
  makePortalMesh(p);S.rescue={pid:p.id,fid,until:p.rescue.until};
  gnews('Sequestro em '+gnm(fid)+': um portal de resgate se abriu (marcador azul no mapa). Ele fica aberto só nesta rodada: vá até ele no turno do comandante.');
  return true;
}
function gevRescueEnter(p,w,area,cx,cz,ang){   // chamado por enterDungeon
  const d=G.dg,fid=p.rescue.fid,Y=DG.Y;
  // baú comum de acampamento (trancado até a dungeon ser limpa)
  d.chest=addChest(cx,Y,cz,ang,150+Math.floor(Math.random()*150),area);
  // jaula num ponto livre perto do chefe, com a porta virada para a entrada
  const f=dgFreeSpot(w,w.boss.x+4,w.boss.z+4,1.6,2.6),wx=f[0],wz=f[1],S=1.3,PH=2.4,bar=0x4a4a52,gold=0xe0b030,g=new THREE.Group();g.position.set(wx,Y,wz);
  const box=(col,sx,sy,sz,px,py,pz,par)=>{const m=new THREE.Mesh(GEO_BOX,mat(col));m.scale.set(sx,sy,sz);m.position.set(px,py,pz);(par||g).add(m);return m};
  box(0x3a3a40,2*S+0.2,0.12,2*S+0.2,0,0.06,0);box(0x3a3a40,2*S+0.2,0.12,2*S+0.2,0,PH,0);   // piso e teto
  const dir=Math.atan2(w.entrance.x-wx,w.entrance.z-wz),sides=[[0,1],[0,-1],[1,0],[-1,0]];   // a porta fica no lado mais voltado para a entrada
  let door=0,best=-9;sides.forEach((sd,i)=>{const dot=sd[0]*Math.sin(dir)+sd[1]*Math.cos(dir);if(dot>best){best=dot;door=i}});
  const cols=[],addC=(x0,z0,x1,z1)=>{const b={x0:x0,y0:Y,z0:z0,x1:x1,y1:Y+PH,z1:z1};Col.add(b);cols.push(b);return b};
  let doorG=null,doorCol=null,th=0;
  sides.forEach((sd,i)=>{
    const isDoor=i===door;let par=g,ox=0,oz=0;
    if(isDoor){   // a porta é um grupo articulado: a dobradiça fica numa ponta da grade e o grupo gira ao abrir
      par=doorG=new THREE.Group();
      if(sd[0]===0){doorG.position.set(-S,0,sd[1]*S);th=sd[1]>0?-1.7:1.7}else{doorG.position.set(sd[0]*S,0,-S);th=sd[0]>0?1.7:-1.7}
      g.add(doorG);
    }
    for(let k=-4;k<=4;k++){const lat=k*S/4;
      if(isDoor){if(sd[0]===0)box(bar,0.08,PH-0.1,0.08,lat+S,PH/2,0,par);else box(bar,0.08,PH-0.1,0.08,0,PH/2,lat+S,par)}
      else if(sd[0]===0)box(bar,0.08,PH-0.1,0.08,lat,PH/2,sd[1]*S);else box(bar,0.08,PH-0.1,0.08,sd[0]*S,PH/2,lat)}
    if(isDoor){if(sd[0]===0){box(bar,2*S,0.1,0.1,S,PH-0.15,0,par);box(bar,2*S,0.1,0.1,S,0.2,0,par);box(gold,0.2,0.3,0.2,S+0.4,1.1,0,par)}else{box(bar,0.1,0.1,2*S,0,PH-0.15,S,par);box(bar,0.1,0.1,2*S,0,0.2,S,par);box(gold,0.2,0.3,0.2,0,1.1,S+0.4,par)}}
    else if(sd[0]===0){box(bar,2*S,0.1,0.1,0,PH-0.15,sd[1]*S);box(bar,2*S,0.1,0.1,0,0.2,sd[1]*S)}else{box(bar,0.1,0.1,2*S,sd[0]*S,PH-0.15,0);box(bar,0.1,0.1,2*S,sd[0]*S,0.2,0)}
    const c=sd[0]===0?addC(wx-S,wz+sd[1]*S-0.06,wx+S,wz+sd[1]*S+0.06):addC(wx+sd[0]*S-0.06,wz-S,wx+sd[0]*S+0.06,wz+S);
    if(isDoor)doorCol=c;
  });
  scene.add(g);
  const h=spawnNpc(area,{role:'hostage',x:wx,z:wz,y:Y,stationary:true,yaw:dir,fid});h.y=Y;
  d.cage={x:wx,z:wz,g,cols,doorCol,doorG,th,opened:false,t:0,h,leaveT:0};
}
function gevCageOpen(){
  const d=G.dg,cg=d&&d.cage;if(!cg||cg.opened)return;
  if(d.area.state!=='cleared'){toast('🔒 A jaula está trancada — elimine os inimigos primeiro.',2200);return}
  cg.opened=true;if(cg.doorCol){Col.remove(cg.doorCol);cg.cols=cg.cols.filter(b=>b!==cg.doorCol)}sfx('coin',0);
  const h=cg.h;if(h&&h.alive){showSubtitle('— Obrigado por me libertar! Que Deus lhe pague!',2800);cg.leaveT=2.4}
  else{toast('A jaula está aberta, mas o refém não sobreviveu.',3500);gevRescueFail(d.p,'o refém não sobreviveu')}
}
function gevRescueDone(p){
  const S=gevS(),fid=p.rescue.fid,gold=150+100*glvl(fid);
  Ledger.add('gold',gold);gRel(fid,1,'você libertou o refém');p.claimed=true;S.rescue=null;
  gnews('Sequestro em '+gnm(fid)+': você libertou o refém e recebeu ◉'+gold+'.');toast('🪢 Refém libertado! +◉'+gold+' e a gratidão de '+gnm(fid)+'.',4500);
}
function gevRescueFail(p,why){
  const S=gevS();if(!p.rescue)return;const fid=p.rescue.fid;gRel(fid,-1,why);p.rescue=null;p.claimed=true;S.rescue=null;
  gnews('Sequestro em '+gnm(fid)+': '+why+'.');
}
function gevRescueLeave(d){   // ao sair da dungeon: some a jaula e o refém
  const cg=d.cage;if(!cg)return;
  scene.remove(cg.g);for(const b of cg.cols)Col.remove(b);
  if(cg.h){cg.h.alive=false;cg.h.gone=true;scene.remove(cg.h.group)}
  d.cage=null;
}
function gevTick(dt){   // chamado a cada quadro: a porta gira, o refém sai andando e o resgate é concluído
  const d=G.dg,cg=d&&d.cage;if(!cg||!cg.opened)return;
  if(cg.t<1&&cg.doorG){cg.t=Math.min(1,cg.t+dt*1.6);cg.doorG.rotation.y=cg.th*cg.t}   // animação da porta abrindo
  if(cg.leaveT<=0)return;
  cg.leaveT-=dt;if(cg.leaveT<=0){const h=cg.h;if(h){h.alive=false;h.gone=true;scene.remove(h.group)}gevRescueDone(d.p)}
}
Hooks.on('round',()=>{   // prazo do resgate
  const S=gevS(),r=S.rescue;if(!r||STATE.round<r.until)return;
  const p=(STATE.portals||[]).find(x=>x.id===r.pid);
  if(p&&!p.claimed){gevRescueFail(p,'o refém morreu: você não o resgatou a tempo');if(!(G.dg&&G.dg.p===p))removePortal(p)}
  S.rescue=null;
});
