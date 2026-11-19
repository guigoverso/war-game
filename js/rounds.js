'use strict';
// ---------- Rodadas (Fase 4): fim da rodada, turno do líder, HUD da rodada e rodada 0 ----------
// O resto foi separado em: econ.js, office.js, caravans.js, book.js (carregados antes deste arquivo).
// A partida começa na RODADA 0 (preparação): só o turno do comandante, sem decisões e sem cobrança. A contagem vale a partir da rodada 1.
// Rodada N>=1 = turno do LÍDER (decisões, num escritório onde o jogador anda a pé: caravanas, porto, capital) + turno do COMANDANTE (o jogo normal,
// em que ele busca suprimentos e os distribui às cidades pelo livro, que também guarda a bolsa — tecla B).
// O jogador encerra a rodada na prefeitura; o mundo avança (produção, cobrança das necessidades) e ele é levado ao escritório.
// Ao concluir as decisões, é teleportado para fora da prefeitura. Eventos ficam para depois.

// ---------- fim da rodada ----------
function endRound(city){
  if(STATE.phase==='leader'||G.office||P.dead)return false;
  if(typeof rebPending==='function'&&rebPending()){rebEndPopup();return false}   // rebelião a resolver: popup com 'Ok' e 'Ir para o local'
  const rd=STATE.rd,rep=[];
  computeBuffs();   // fecha os bônus do que foi entregue nesta rodada
  const pcs=playerCities(),debuf={};
  const prep=STATE.round<1;   // rodada 0: preparação, sem cobrança, imposto nem produção
  if(prep)rep.push('Rodada 0 (preparação): sem cobrança, imposto ou produção. A contagem começa agora, na rodada 1.');
  else{
    const rebels=[],officers=new Set(),taxMap={};   // taxMap: imposto de cada cidade nesta rodada (vai para o relatório)
    for(const c of pcs){
      const e=ec(c),carry2={};delete e.debt;   // recursos não geram dívida
      let short=false,over=false;const overRes=[];
      for(const r of NEEDS){
        const need=needOf(c,r),cover=G.alwaysSupplied?need:storedOf(c,r),sh=Math.max(0,need-cover);   // (modo criativo: sempre supridas)
        if(gotOf(c,r)>Math.max(0,need-carryOf(c,r))){over=true;overRes.push(r)}   // entregou acima da meta: gera bônus (cidade próspera)
        if(sh>0){short=true;debuf[r]=true;rep.push('⚠ '+c.name+': faltaram '+sh+' de '+resName(r).toLowerCase()+' (debuff nesta rodada; a necessidade continua a mesma).')}
        consumeSupply(c,r,Math.min(need,cover));   // o que a cidade precisa é consumido (destruído); a necessidade da rodada seguinte é a mesma        const left=storedOf(c,r);if(left>0)carry2[r]=left;
      }
      e.got={};e.carry=carry2;
      if(!short)rep.push('✔ '+c.name+': suprida corretamente'+(over?' e acima da meta — bônus de entrega ('+overRes.map(resIcon).join(' ')+') na próxima rodada':'')+'.');
      // humor: descontente se faltou algo; próspera se tudo foi atendido e algo ficou acima da meta; senão contente
      // políticas: festa (efeito 'prosper') e felicidade (e.joyAdj, ±1) empurram o humor entre Descontente(1) e Próspera(3), mas NÃO mudam a contagem de rebelião (e.ups)
      {const ORD=['upset','ok','rich'];e.mood=short?'upset':ORD[clamp((over?2:1)+(e.joyAdj||0)+(polFlag('prosper',c.id)?1:0),polFlag('prosper',c.id)?2:0,2)];e.joyAdj=0}
      e.ups=short?(e.ups||0)+1:0;
      // níveis: 1ª falta = Descontente (1); 2ª = (0); 3ª = (−1); 4ª = rebelião (os efeitos de 0 e −1 ainda são os do nível 1)
      if(short&&e.press){   // reprimida: não se rebela por falta, continua pagando imposto; as necessidades sobem 50% a cada rodada (até 300%)
        e.press.n++;
        const tax=Math.round((TAX_BASE+TAX_RANK*Math.max(1,c.rank||1)));if(tax>0){shOf().vault+=tax;taxMap[c.id]=tax;rep.push('⚔ '+c.name+' está sob repressão: faltou suprimento, mas pagou imposto de ◉'+tax+'. As necessidades subiram 50% (até 300%).')}
        const at300=NEEDS.filter(r=>(e.pct[r]||0)>0&&pctOf(c,r)>=300).length;
        if(at300>=2&&!c.home&&!(e.noReb>STATE.round)){rebels.push(c);officers.add(c.id)}
      }else if(short){
        if(e.ups>=ECON.rebelUps&&!c.home&&!(e.noReb>STATE.round))rebels.push(c);   // noReb: acabou de ser reconquistada (rebmine.js)
        else rep.push('😠 '+c.name+' está '+moodLbl(c)+': sem imposto e sem produção.'+(c.home?' (A capital não se rebela, mas sofre os mesmos efeitos.)':' Se continuar faltando, ela se rebela em '+(ECON.rebelUps-e.ups)+' rodada(s)!'));
      }else{
        if(e.press){delete e.press;rep.push('✔ '+c.name+' supriu tudo: a repressão acabou e as necessidades voltaram ao normal.')}   // supriu tudo: os recursos que subiram voltam ao valor anterior
        const gt=goldTradeOf(c);if(gt>0){shOf().vault+=gt;rep.push('🛒 '+c.name+': comércio com cidades de ouro rendeu ◉'+gt+' no cofre.')}
        const tax=taxOf(c);if(tax>0){shOf().vault+=tax;taxMap[c.id]=tax;rep.push(MOOD[e.mood].icon+' '+c.name+' está '+MOOD[e.mood].n.toLowerCase()+': imposto de ◉'+tax+' no cofre.')}
        const f=focusOf(c),amt=prodOf(c);
        if(amt<=0)rep.push('📜 '+c.name+': produção suspensa por uma política.');
        else if(hasRoute(c))rep.push('🛒 '+c.name+': a produção de '+resName(f).toLowerCase()+' ('+amt+') seguiu por caravana.');
        else{const got=prodAdd(c,f,amt);rep.push('✔ '+c.name+' produziu '+got+' de '+resName(f).toLowerCase()+(f==='gold'?' (no cofre).':' (na reserva do armazém).'))}
      }
    }
    rep.push('💰 Imposto: '+pcs.map(c=>c.name+' ◉'+(taxMap[c.id]||0)).join(', ')+'. Total: ◉'+pcs.reduce((s,c)=>s+(taxMap[c.id]||0),0)+'.');
    meetRoundEnd(rep);   // reunião: produção das caravanas, taxas e manutenção (meetfx.js)   // quanto cada cidade pagou e o total
    for(const c of rebels){if(typeof rebS==='function'&&rebS().cur){rep.push('⏳ '+c.name+' está à beira da rebelião, mas há outra em andamento: ela fica para a próxima rodada.');continue}rep.push(officers.has(c.id)?'🔥 '+c.name+': dois suprimentos chegaram a 300% e os oficiais se juntaram aos rebeldes! A cidade se rebelou. Reconquiste-a.':'🔥 '+c.name+' SE REBELOU depois de '+ECON.rebelUps+' rodadas sem suprimentos! Reconquiste-a.');rebelCity(c)}
  }
  for(const c of WORLD.cities)rerollNeeds(c);
  fsupRound();   // cidades de facção: sorteia o suprimento de cada facção e daí o humor das cidades (facsupply.js)
  rebRound(rep); // rebelião de cidade NPC: resolve a decidida e vê se outra começa (rebellion.js)
  refreshShops();   // novas necessidades (dado) e Lojas reabastecidas conforme a produção
  rd.debuff=prep?(rd.debuff||{}):debuf;   // debuffs valem na rodada que começa (a necessidade não muda)
  rd.rbuf=Object.assign({},rd.rnext||{});rd.rnext={};   // bônus do que foi entregue vale só na rodada que começa (a rodada 0 também)
  rd.hallCity=(city||WORLD.home).id;rd.report=rep;rd.now=[];   // o que fechou esta rodada vira o relatório da ANTERIOR; a nova começa vazia
  STATE.round++;Hooks.emit('round',STATE.round);
  beginLeaderTurn();
  return true;
}
// rebelião: a cidade deixa de ser sua, perde o armazém e ganha uma guarnição que você precisa derrotar
function rebelCity(c){
  const e=ec(c),mine=typeof rebmStart==='function'&&rebmStart(c);   // rebelião de verdade (rebmine.js): fogo, bandeira rebelde e cartão no turno do líder; sem guarnição aqui
  c.owner='enemy';c.state='idle';facSetFlag(c);facReskin();   // volta à facção de origem
  STATE.rd.routes=STATE.rd.routes.filter(r=>r.a!==c.id&&r.b!==c.id);rebuildCaravans();
  e.wh=null;whOf(c);e.got={};e.carry={};e.ups=0;e.mood='upset';delete e.press;if(mine){rebAnnounce();return}e.rebelled=true;   // rebelião sua: fogo, bandeira rebelde e ruínas já agora (não esperam o sorteio do turno do líder)   // perde os suprimentos e a produção da cidade (o armazenamento e o cofre são seus)
  const n=3+Math.max(1,c.rank||1),pts=(c.walk||[]).filter(p=>Math.hypot(p.x-c.cx,p.z-c.cz)>4);
  for(let i=0;i<n&&pts.length;i++){const p=pts[Math.floor(Math.random()*pts.length)];spawnEnemy(c,i===n-1&&(c.rank||1)>=2?'hound':'soldier',p.x,p.z)}
}function beginLeaderTurn(){
  STATE.phase='leader';STATE.rd.actions=maxActions();
  if(OFFICE.ok)enterOffice();else{toast('📖 Turno do líder: abra o livro de decisões na prefeitura.',4000);if(G.running)openBook()}
  Hooks.emit('leaderTurn');   // políticas: sorteia o cartão da rodada
}
function finishLeaderTurn(){
  if(typeof meetPending==='function'&&meetPending()&&!(STATE.pol&&STATE.pol.pending)){normalizePol();STATE.pol.pending=meetCard()}   // a reunião vem antes de encerrar o turno
  if(STATE.pol&&STATE.pol.pending){toast('📜 Decida a política desta rodada antes de encerrar o turno.',3500);showPolicy();return}
  for(const c of WORLD.cities){const e=ec(c);if(e.type==='port'&&e.nf){if(e.pf!==e.nf){const lost=moveProdToStore(c);if(lost&&c.owner==='player')toast('⚓ '+c.name+': a abundância mudou. '+lost+'.',4000)}e.pf=e.nf;e.ps=e.ns;e.pct=portPct(e.pf,e.ps)}delete e.nf;delete e.ns}   // a nova distribuição do porto só vale agora
  computeBuffs();STATE.phase='commander';
  {const tgt=8/24,dlt=((tgt-DN.t)%1+1)%1;DN.days+=dlt;DN.t=tgt}   // o turno do comandante sempre começa às 8 da manhã (nunca volta no tempo)
  const n=Object.keys(STATE.rd.rbuf).length;
  closePanel();leaveOffice();
  polRunQueue();   // o que as políticas deixaram para o começo do turno do Comandante (teleporte, combate, soldados...)
  toast('✔ Decisões tomadas. Turno do comandante!'+(n?' Bônus de entrega ativos: '+Object.keys(STATE.rd.rbuf).map(resIcon).join(' '):''),4500);
  refreshRoundHud();
}

// dica do escritório e linha da rodada no HUD
let rdT=0;
function updateRounds(dt){
  if(OFFICE.halo)OFFICE.halo.material.opacity=0.28+0.14*Math.sin(G.t*3);
  if(G.office&&G.office.meet)updateMeet(dt);   // reunião das facções (meeting.js)
  else if(G.office){
    const near=nearBook();
    $('officehint').textContent=near?'📖 [E] ou clique: abrir o livro':'📖 Chegue perto da mesa e aperte E (ou clique) para abrir o livro';
  }
  rdT-=dt;if(rdT<=0){rdT=0.5;refreshRoundHud()}
  for(const m of CARAVANS)m.group.visible=Math.hypot(m.x-P.x,m.z-P.z)<250;
  updateCaravanGuards(dt);
}

function refreshRoundHud(){
  polNoteUpdate();   // notificação "política a decidir"
  const el=$('rdline');if(!el||!STATE.rd)return;
  const b=STATE.rd.rbuf||{},t={leather:'coletes −20%',food:'soldados −20%',ore:'armas −20%',gold:'recrutar/curar −20%',wood:'obras −10%, missões +10%'};
  const deb=Object.keys(STATE.rd.debuff||{});
  el.innerHTML='📖 Rodada '+STATE.round+(STATE.round<1?' • preparação':STATE.phase==='leader'?' • turno do líder':' • turno do comandante')+Object.keys(b).map(r=>'<br><small>'+resIcon(r)+' '+t[r]+'</small>').join('')+deb.map(r=>'<br><small style="color:#ff9a9a">⚠ '+resIcon(r)+' '+DEB_TXT[r]+'</small>').join('')+polHud();
}

// botão "Encerrar a rodada" no quadro da prefeitura
function hallRoundAction(c){
  if(STATE.phase==='leader'){closePanel();openBook('book','resumo');return}
  if(RAID.active||CVB.active){toast('Há um ataque em andamento! Defenda a cidade antes de encerrar a rodada.',3000);return}
  const rnd=STATE.round<1?'rodada 0, preparação':'rodada '+STATE.round;
  UI.confirm('Encerrar o turno do comandante ('+rnd+')? '+(STATE.round<1?'Nada é cobrado. ':'As cidades produzem e cobram as necessidades (o que faltar deixa a cidade descontente e liga debuffs). ')+'Depois você decide no escritório.',()=>{closePanel();endRound(c)},'Encerrar');
}

// ---------- caravana: origem e destino escolhidos no mapa ----------
const MP={on:false,step:0,a:null};
const freeCityForRoute=()=>playerCities().some(c=>!hasRoute(c));   // para criar uma caravana, ao menos uma cidade sua precisa estar sem caravana
function startCaravanPick(){
  MP.on=true;MP.step=1;MP.a=null;
  openBook('map');   // a escolha de origem e destino acontece no mapa do caderno
}
function pickBannerText(){return MP.step===1?'🛒 <b>Caravana</b> — clique no mapa na cidade de <b>ORIGEM</b> (uma das suas). Feche o caderno (M ou E) para cancelar.':'🛒 Origem: <b>'+WORLD.cities[MP.a].name+'</b>. Agora clique na cidade de <b>DESTINO</b>. (clique de novo na origem para trocá-la)'}
function updatePickBanner(){if(mapOpen())renderBook()}   // o aviso da escolha de caravana fica na página do mapa
// página do caderno para a aba Mapa: o mapa ocupa as duas páginas (sem legenda); na escolha de caravana o aviso fica em cima
function mapPages(){
  const h=Math.min(620,innerHeight*0.84),sz=Math.max(260,Math.floor(Math.min(h-72-(MP.on?52:0),Math.min(960,innerWidth*0.86)-70)));
  return[(MP.on?'<div class="mpick">'+pickBannerText()+'</div>':'')+'<canvas id="bigmap" width="'+sz+'" height="'+sz+'"></canvas><div style="text-align:right;margin-top:4px">'+(G.poiFocus!=null&&STATE.pol&&STATE.pol.pending?'<button class="gold" id="mapback" style="float:left">↩ Voltar ao evento</button>':'')+'<button class="alt" id="mapnames">🏷 Nomes dos POIs: '+(G.poiNames?'ligado':'desligado')+'</button></div>',''];
}
function drawPickOverlay(g,s){
  if(!MP.on)return;
  for(const c of WORLD.cities){
    const ok=!c.rebel&&(MP.step===1?(c.owner==='player'&&!hasRoute(c)):(c.id!==MP.a&&!hasRoute(c)&&(c.owner==='player'||facTradeOK(c.fid))));
    g.strokeStyle=c.id===MP.a?'#5aff7a':ok?'#ffd23a':'#555';g.lineWidth=c.id===MP.a?5:3;
    g.beginPath();g.arc(c.cx*s,c.cz*s,16,0,6.283);g.stroke();
    if(c.rebel){const x=c.cx*s,y=c.cz*s;g.strokeStyle='#ff2a2a';g.lineWidth=4;g.beginPath();g.arc(x,y,16,0,6.283);g.moveTo(x-8,y-8);g.lineTo(x+8,y+8);g.moveTo(x+8,y-8);g.lineTo(x-8,y+8);g.stroke()}   // cidade em rebelião: círculo vermelho com X (sem caravana)
  }
  if(MP.a!==null){const A=WORLD.cities[MP.a];g.strokeStyle='#5aff7a';g.setLineDash([6,5]);g.lineWidth=2;g.beginPath();g.moveTo(A.cx*s,A.cz*s);if(MP.hover!==undefined){const B=WORLD.cities[MP.hover];g.lineTo(B.cx*s,B.cz*s)}g.stroke();g.setLineDash([])}
}
// o mouse sobre uma cidade do mapa grande mostra a facção dona
(function(){
  let tip=null;const hide=()=>{if(tip)tip.style.display='none'};
  document.addEventListener('mousemove',e=>{
    const c=mapOpen()&&e.target&&e.target.id==='bigmap'?pickCityAt(e):null;
    if(!c){   // sem cidade sob o mouse: talvez um POI (nome e dono)
      const q=mapOpen()&&e.target&&e.target.id==='bigmap'?pickPoiAt(e):null;if(!q){hide();return}
      if(!tip){tip=document.createElement('div');tip.className='uitip';document.body.appendChild(tip)}
      tip.textContent=POI_DEFS[q.type].ic+' '+POI_DEFS[q.type].n+'\nDomínio: '+poiOwnerName(q.owner);tip.style.display='block';tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';return;
    }
    const f=facOf(c.fid);if(!tip){tip=document.createElement('div');tip.className='uitip';document.body.appendChild(tip)}
    tip.textContent=c.rebel?c.name+'\nProdução: '+typeLabel(c)+'\nFacção: Rebeldes (em rebelião)'+(G.creative&&rebS().cur?'\n'+rebSidesTxt(rebS().cur):''):c.name+'\nProdução: '+typeLabel(c)+'\nFacção: '+(f?f.name:'—')+(G.creative&&f&&f.temper?' ('+facTemperName(f)+')':'')+(f&&!f.player?'\nRelação: '+REL_ST[relStatus(c.fid)].n+' ('+relOf(c.fid).v+'/10)':'');
    tip.style.display='block';tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';
  });
  document.addEventListener('keydown',hide);document.addEventListener('click',hide);
})();
function pickPoiAt(e){
  const cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W;
  const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
  let best=null,bd=14;for(const p of WORLD.pois||[]){if(p.type==='ruins'||!poiVisible(p))continue;const d=Math.hypot(p.cx*s-x,p.cz*s-y);if(d<bd){bd=d;best=p}}
  return best;
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='mapnames'){G.poiNames=!G.poiNames;renderBook()}});   // botão: nomes dos POIs no mapa (desligado por padrão)
function pickCityAt(e){
  const cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W;
  const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
  let best=null,bd=26;for(const c of WORLD.cities){const d=Math.hypot(c.cx*s-x,c.cz*s-y);if(d<bd){bd=d;best=c}}
  return best;
}
document.addEventListener('click',e=>{
  if(!MP.on||!mapOpen()||e.target.id!=='bigmap')return;
  const c=pickCityAt(e);if(!c)return;
  if(MP.step===1){
    if(c.owner!=='player'){toast('A origem precisa ser uma cidade sua.',2000);return}
    if(hasRoute(c)){toast(c.name+' já tem uma caravana ativa (uma por cidade).',2500);return}
    MP.a=c.id;MP.step=2;drawBigMap();updatePickBanner();return;
  }
  if(c.id===MP.a){MP.a=null;MP.step=1;drawBigMap();updatePickBanner();return}
  const A=WORLD.cities[MP.a];
  if(hasRoute(c)){toast(c.name+' já tem uma caravana ativa (uma por cidade).',2500);return}
  if(c.rebel){toast(c.name+' está em rebelião: não há caravana para lá.',3000);return}
  if(c.owner!=='player'&&!facTradeOK(c.fid)){toast('Sem comércio com '+facOf(c.fid).name+': ela é inimiga ou está em guerra com você.',3000);return}
  dealSummary(A,c,()=>{MP.on=false;updatePickBanner();buyCaravan(A,c);openBook('book','caravanas')});
});
document.addEventListener('mousemove',e=>{
  if(!MP.on||MP.step!==2||!mapOpen()||e.target.id!=='bigmap')return;
  const c=pickCityAt(e),h=c&&c.id!==MP.a?c.id:undefined;if(h!==MP.hover){MP.hover=h;drawBigMap()}
});

// ---------- rodada 0 (preparação): mundo mais calmo, sem facções, sem portais, sem missões ----------
// Nada disso mexe na geração do mundo (a semente e os saves continuam iguais): é um "esconder" em tempo de execução que a rodada 1 desfaz.
const prepOn=()=>STATE.round<1;
const PREP={camps:5,chests:5};   // rodada 0: no máximo 5 acampamentos de bandidos e 5 baús soltos (os mais perto da capital)
function prepThin(){
  if(!prepOn())return;
  const hm=WORLD.home,near=(a,b)=>Math.hypot(a.cx-hm.cx,a.cz-hm.cz)-Math.hypot(b.cx-hm.cx,b.cz-hm.cz);
  const live=WORLD.camps.filter(c=>!c.gone&&!c.questTarget).sort(near);
  live.slice(PREP.camps).forEach(c=>{despawnCamp(c);c.prepHold=true});   // guardados até a rodada 1 (updateCamps não os recria)
  for(const c of WORLD.camps)if(c.gone)c.prepHold=true;
  for(const c of WORLD.packs){if(c.temp||c.prepHold||c.id%2===0)continue;c.prepHold=true;for(const e of c.enemies)if(e.alive){e.alive=false;e.gone=true;scene.remove(e.group)}c.aliveEnemies=0}   // metade dos bandos de animais
  const loose=WORLD.chests.filter(ch=>!ch.lockedBy&&!ch.dg&&!ch.fixedLoot&&!ch.onOpen).sort((a,b)=>Math.hypot(a.x-hm.cx,a.z-hm.cz)-Math.hypot(b.x-hm.cx,b.z-hm.cz));
  loose.slice(PREP.chests).forEach(ch=>{if(!ch.opened){ch.hold=true;ch.g.visible=false}});
}
function prepRestore(){   // a rodada 1 devolve o que a preparação guardou
  for(const c of WORLD.camps)if(c.prepHold){c.prepHold=false;if(c.gone)respawnCamp(c)}
  for(const c of WORLD.packs)if(c.prepHold){c.prepHold=false;populatePack(c)}
  for(const ch of WORLD.chests)if(ch.hold){ch.hold=false;ch.g.visible=true}
}
Hooks.on('round',prepRestore);
