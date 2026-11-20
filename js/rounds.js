'use strict';
// ---------- Rodadas (Fase 4): fim da rodada, turno do líder, HUD da rodada e rodada 0 ----------
// O resto foi separado em: econ.js, office.js, caravans.js, book.js, bookmap.js (carregados antes deste arquivo).
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
        consumeSupply(c,r,Math.min(need,cover));   // o que a cidade precisa é consumido (destruído); a necessidade da rodada seguinte é a mesma
        const left=storedOf(c,r);if(left>0)carry2[r]=left;   // o que sobrou nos slots conta como já entregue na rodada seguinte (bônus e "+N da rodada anterior")
      }
      e.got={};e.carry=carry2;
      if(!short)rep.push('✔ '+c.name+': suprida corretamente'+(over?' e acima da meta — bônus de entrega ('+overRes.map(resIcon).join(' ')+') na próxima rodada':'')+'.');
      // humor: descontente se faltou algo; próspera se tudo foi atendido e algo ficou acima da meta; senão contente
      // políticas: festa (efeito 'prosper') e felicidade (e.joyAdj, ±1) empurram o humor entre Descontente(1) e Próspera(3), mas NÃO mudam a contagem de rebelião (e.ups)
      {const ORD=['upset','ok','rich'];e.mood=short?'upset':ORD[clamp((over?2:1)+(e.joyAdj||0)+(polFlag('prosper',c.id)?1:0),polFlag('prosper',c.id)?2:0,2)];e.joyAdj=0}
      e.ups=short?(e.ups||0)+1:0;
      const peace=short&&!e.press&&poiSancPeace('player');if(peace)e.mood='ok';   // Santuário: 50% de a cidade não ficar Descontente (a contagem e.ups acima não muda)
      // níveis: 1ª falta = Descontente (1); 2ª = (0); 3ª = (−1); 4ª = rebelião (os efeitos de 0 e −1 ainda são os do nível 1)
      if(short&&e.press){   // reprimida: não se rebela por falta, continua pagando imposto; as necessidades sobem 50% a cada rodada (até 300%)
        e.press.n++;
        const tax=Math.round((TAX_BASE+TAX_RANK*Math.max(1,c.rank||1)));if(tax>0){shOf().vault+=tax;taxMap[c.id]=tax;rep.push('⚔ '+c.name+' está sob repressão: faltou suprimento, mas pagou imposto de ◉'+tax+'. As necessidades subiram 50% (até 300%).')}
        const at300=NEEDS.filter(r=>(e.pct[r]||0)>0&&pctOf(c,r)>=300).length;
        if(at300>=2&&!c.home&&!(e.noReb>STATE.round)){rebels.push(c);officers.add(c.id)}
      }else if(short){
        if(e.ups>=ECON.rebelUps&&!c.home&&!(e.noReb>STATE.round)){   // noReb: acabou de ser reconquistada (rebmine.js)
          if(poiSancDelay('player'))rep.push('⛪ '+c.name+' ia se rebelar, mas o Santuário acalmou os ânimos: a rebelião foi adiada para a próxima rodada.');
          else rebels.push(c);
        }else rep.push((peace?'⛪ '+c.name+': o Santuário manteve o povo calmo ('+MOOD.ok.n+'), mas sem suprimento não há imposto nem produção.':'😠 '+c.name+' está '+moodLbl(c)+': sem imposto e sem produção.')+(c.home?' (A capital não se rebela, mas sofre os mesmos efeitos.)':' Se continuar faltando, ela se rebela em '+(ECON.rebelUps-e.ups)+' rodada(s)!'));
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
