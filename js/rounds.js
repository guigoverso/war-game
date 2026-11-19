'use strict';
// ---------- Rodadas (Fase 4): fim da rodada, turno do líder, HUD da rodada e rodada 0 ----------
// O resto foi separado em: econ.js, office.js, caravans.js (carregados antes deste arquivo).
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

function renderDeposit(){const el=document.getElementById('invdeposit');if(el)el.innerHTML='<p class="st">Madeira, minério e comida são itens: entregue-os à cidade no <b>armazém</b>.</p>'}
// ---------- livro: bolsa + livro do prefeito (tecla B) ----------
const LB={top:'book',tab:'resumo',city:null,ra:null,rb:null,fac:0};
const mapOpen=()=>G.panel==='ldbook'&&LB.top==='map';   // o mapa agora é uma aba do caderno (tecla M)
const LSUBS=[['resumo','📜 Resumo'],['cidades','🏘 Cidades'],['capital','🏛 Capital'],['missoes','📋 Missões'],['caravanas','🛒 Caravanas'],['facs','🏴 Facções'],['diplo','🕊 Diplomacia'],['buffs','✨ Efeitos']];
const INV_L='<h3>🎒 Bolsa</h3><div id="invinfo" class="ldsm"></div><b class="st">Armas e vara — teclas 1–6</b><div id="invwbar"></div><b class="st" style="display:block;margin-top:8px">Curas — teclas 7–9</b><div id="invcbar"></div><b class="st" style="display:block;margin-top:8px">Bolsa</b><div id="invgrid"></div>';
const INV_R='<div id="invdetail"></div><div id="invpending"></div><div id="invdeposit"></div>';
function openBook(top,tab){
  if(G.office&&top==='inv')top='book';   // no escritório não há bolsa (o mapa e o livro sim)
  LB.top=top||'book';if(tab)LB.tab=tab;   // sem pedido explícito abre no Livro (mesmo que tenha sido fechado no Mapa)
  if(LB.city===null||!WORLD.cities[LB.city]||WORLD.cities[LB.city].owner!=='player')LB.city=WORLD.home.id;
  if(LB.top==='inv'){G.invSel=null;G.pendSel=null}
  openPanel('ldbook');renderBook();
}
const actionsHtml=()=>'<span style="color:#8a4a10;letter-spacing:2px">'+'◆'.repeat(STATE.rd.actions)+'◇'.repeat(Math.max(0,maxActions()-STATE.rd.actions))+'</span> ('+STATE.rd.actions+'/'+maxActions()+')';
function stockHtml(){return '<p>'+resIcon('gold')+' Ouro com você: <b>'+P.coins+'</b></p>'}
const moodHtml=c=>{const m=MOOD[moodOf(c)];return '<b style="color:'+m.col+'">'+m.icon+' '+moodLbl(c)+'</b>'};
const MOOD_TXT={rich:'imposto ×1,5, +1 de produção e 10% de desconto nas lojas daqui',ok:'imposto normal',upset:'sem imposto e sem produção; curar e itens de cura custam o dobro aqui'};
function typeLabel(c){const e=ec(c);return e.type==='port'?'⚓ Porto (produz '+resIcon(e.pf)+' '+resName(e.pf).toLowerCase()+')':resIcon(e.type)+' '+TYPE_NAME[e.type]}
const needsLine=c=>NEEDS.map(r=>resIcon(r)+needOf(c,r)).join(' ');
const routeName=r=>WORLD.cities[r.a].name+' ⇄ '+WORLD.cities[r.b].name;
// texto do mouse sobre o 🛒 de uma cidade na aba Facções: de onde sai, para onde vai e o efeito
function routeTip(r){
  if(!r)return '';
  const A=WORLD.cities[r.a],B=WORLD.cities[r.b],ic=x=>resIcon(x)+' '+resName(x).toLowerCase();
  const eff=(X,Y)=>{const get=focusOf(Y);
    if(NEEDS.includes(get)){const cur=ec(X).pct[get]||0;return '• '+X.name+' recebe '+ic(get)+(cur?': necessidade de hoje '+cur+'% → '+(tradePct(cur)?tradePct(cur)+'%':'some'):' (hoje ela já não precisa)')}
    if(get==='gold'&&focusOf(X)!=='gold')return '• '+X.name+' recebe ouro: +◉'+Math.round(prodOf(Y)*ECON.tradeGold)+' por rodada no cofre';
    return '• '+X.name+' não ganha nada com o produto de '+Y.name};
  return '🛒 Caravana: '+A.name+' → '+B.name+'\n'+eff(A,B)+(B.owner==='player'?'\n'+eff(B,A):'');
}
const leaderOnly=()=>isLeader()?'':'<p class="ldsm">🔒 Esta decisão só pode ser tomada no <b>turno do líder</b> (no escritório).</p>';
function bookPages(){
  const rd=STATE.rd,pcs=playerCities();
  if(LB.tab==='resumo'){
    const turn=STATE.round<1?'Preparação (nenhuma decisão necessária)':isLeader()?'Turno do líder':'Turno do comandante';
    const port=playerPort(),hasWorldPort=WORLD.cities.some(c=>ec(c).type==='port');
    const L='<h3>Rodada '+STATE.round+'</h3><p>'+turn+'</p>'+(isLeader()?'<p>Ações do líder: '+actionsHtml()+'</p>':'')+polBookHtml()
      +'<h4>Seu ouro</h4>'+stockHtml()
      +'<h4>Cidades dominadas</h4>'+pcs.map(c=>'<p style="margin:3px 0"><b>'+(c.home?'🏛 ':'')+c.name+'</b> — '+typeLabel(c)+'<br><small>abundância: '+abundHtml(c)+'<br>precisa: '+needsLine(c)+'<br>humor: '+moodHtml(c)+' • no armazém: '+NEEDS.map(r=>resIcon(r)+storedOf(c,r)).join(' ')+' • '+(cityMet(c)?'<span class="ldok">✔ suprida</span>':'<span class="ldbad">⚠ faltam recursos</span>')+'</small></p>').join('');
    const R='<h3>Caravanas ativas</h3>'+(rd.routes.length?'<ul class="ldul">'+rd.routes.map(r=>'<li>'+routeName(r)+'</li>').join('')+'</ul>':'<p>Nenhuma caravana.</p>')
      +(STATE.round<1?'<h4>Rodada 0</h4><p class="ldsm">Não há decisões agora e nada é cobrado: a contagem começa na rodada 1. Veja de que suprimentos cada cidade precisa (aba <b>Cidades</b>) e comece a juntá-los: compre na loja ou ache na natureza (caça, pesca, baús) e entregue no <b>armazém</b> de cada cidade. Quando estiver pronto, encerre a rodada no quadro da prefeitura.</p>'
        :'<h4>Relatório da rodada</h4><h5>Rodada anterior</h5>'+(rd.report.length?'<ul class="ldul">'+rd.report.map(t=>'<li>'+t+'</li>').join('')+'</ul>':'<p class="ldsm">Nada a relatar.</p>')
          +'<h5>Rodada atual</h5>'+((rd.now||[]).length?'<ul class="ldul">'+rd.now.map(t=>'<li>'+t+'</li>').join('')+'</ul>':'<p class="ldsm">Nada a relatar até agora.</p>'))
      +'<h4>Humor das outras cidades</h4><p class="ldsm">'+WORLD.cities.filter(c=>c.owner!=='player').map(c=>c.name+': '+MOOD[moodOf(c)].icon+' '+MOOD[moodOf(c)].n).join('<br>')+'</p>'
      +(port||!hasWorldPort?'':'<p class="ldwarn">⚓ Você ainda não tem um porto. Ele fica na cidade litorânea mais forte do mapa.</p>');
    return[L,R];
  }
  if(LB.tab==='cidades'){
    const L='<h3>Suas cidades</h3>'+pcs.map(c=>'<button class="ldcity'+(c.id===LB.city?' sel':'')+'" data-a="city" data-id="'+c.id+'"><span>'+(c.home?'🏛 ':'')+c.name+'</span><small>'+typeLabel(c)+'</small><em>'+MOOD[moodOf(c)].icon+' '+MOOD[moodOf(c)].n+' • '+(cityMet(c)?'✔ suprida':'⚠ faltam recursos')+'</em></button>').join('');
    const c=WORLD.cities[LB.city];let R='';
    if(c&&c.owner==='player'){
      const e=ec(c);
      const w=whOf(c);
      R='<h3>'+c.name+'</h3><p>'+typeLabel(c)+'<br>Humor: '+moodHtml(c)+'<br><small>'+MOOD_TXT[moodOf(c)]+(e.ups?' • rodadas seguidas em falta: '+e.ups+'/'+ECON.rebelUps:'')+'</small></p><table class="ldt">'+NEEDS.map(r=>{
        const need=needOf(c,r),st=storedOf(c,r),g=gotOf(c,r),cy=carryOf(c,r),miss=missingOf(c,r);
        const state=need===0&&st===0?'<span class="ldok">não precisa</span>':miss>0?'<span class="ldbad">falta '+miss+'</span>':(g>Math.max(0,need-cy)?'<span class="ldok">★ bônus</span>':'<span class="ldok">✔</span>');
        return '<tr><td>'+resIcon(r)+' <b>'+resName(r)+'</b><br><small>precisa '+need+' • no armazém '+st+(cy?' (+'+cy+' da rodada anterior)':'')+''+'</small></td><td>'+state+'</td></tr>';
      }).join('')+'</table><p class="ldsm">Para suprir a cidade, entregue os itens no <b>armazém</b> (edifício da cidade). Entregar acima da necessidade dá o bônus de entrega na <b>próxima</b> rodada; o excedente também fica para ela.</p>'
        +'<p class="ldsm">Reserva de produção: '+(w.prod?itemDef(w.prod.id).icon+' '+itemDef(w.prod.id).name+' ×'+w.prod.n:'vazia')+' • Cofre: ◉ '+w.vault+'</p>';
      R+='<p class="ldsm">Abundância (do mais ao menos abundante nesta rodada):<br><b>'+abundHtml(c)+'</b></p>';
      if(e.type==='port'){
        if(isLeader()){
          const cf=e.nf||e.pf,cs=e.ns||e.ps,chg=(cf!==e.pf||cs!==e.ps);
          R+='<h4>Distribuição do porto</h4><p class="ldsm">Escolha livremente o que o porto produz e o que lhe falta. A mudança só vale quando você encerrar o turno.'+(chg?'<br><b>Pendente:</b> produz '+resIcon(cf)+', falta '+resIcon(cs)+'.':'')+'</p>'
            +'<div>Produz: '+RES4.map(r=>'<button class="ldmini'+(cf===r?' sel':'')+'" data-a="pf" data-r="'+r+'">'+resIcon(r)+'</button>').join('')+'</div>'
            +'<div>Falta: '+NEEDS.map(r=>'<button class="ldmini'+(cs===r?' sel':'')+'" data-a="ps" data-r="'+r+'">'+resIcon(r)+'</button>').join('')+'</div>';
        }else R+='<p class="ldsm">⚓ O porto produz '+resIcon(e.pf)+' e lhe falta '+resIcon(e.ps)+'. Essa distribuição só muda no turno do líder.</p>';
      }
      if(!c.home){   // evoluir uma cidade que não é a capital: gasta ação e ouro; dá desconto nas lojas dela (não sobe o nível do líder)
        const lv=cityLvl(c),cc=cityUpCost(c),ok=isLeader()&&lv<CITY_MAX_LVL&&canAct('city')&&Ledger.canAfford(cc);
        R+='<h4>Evoluir a cidade</h4><p class="ldsm">Nível <b>'+lv+'</b> / '+CITY_MAX_LVL+' • lojas '+Math.round(ECON.cityDisc*(lv-1)*100)+'% mais baratas. Não aumenta o nível do líder (só a capital faz isso).</p>'
          +(lv>=CITY_MAX_LVL?'<p>Nível máximo.</p>':'<p>Custo: <b>◉ '+cc.gold+'</b> + '+actCost('city')+' ação</p><button data-a="cityup" '+(ok?'':'disabled')+'>Evoluir '+c.name+'</button>'+leaderOnly()+(isLeader()&&!canAct('city')?'<p class="ldwarn">Sem ações do líder nesta rodada.</p>':''));
      }
    }    return[L,R];
  }
  if(LB.tab==='buffs')return buffsPages();   // aba Efeitos: buffs e debuffs ativos (meetfx.js)
  if(LB.tab==='diplo')return fgBookPages();   // aba Diplomacia (facgraph.js)
  if(LB.tab==='missoes')return msBookPages();   // aba Missões (missions.js)
  if(LB.tab==='facs'){   // lista de facções à direita; resumo da escolhida à esquerda
    const fl=[facOf(0)].concat(WORLD.factions||[]),f=facOf(LB.fac)||fl[0],cs=facCities(f.id);
    const rt=c=>rd.routes.find(r=>r.a===c.id||r.b===c.id);
    let relH='';
    if(!f.player){
      const rl=relOf(f.id),st=relStatus(f.id),S=REL_ST[st],id=f.id,lead=isLeader();
      const ac=facAllyCost(id),dv=rl.debt;
      relH='<h4>Relação</h4><p><b style="color:'+S.col+'">'+S.n+'</b> • '+rl.v+'/10 <span style="letter-spacing:1px;color:'+S.col+'">'+'■'.repeat(rl.v)+'<span style="color:#9a8a6a">'+'□'.repeat(10-rl.v)+'</span></span></p><p class="ldsm">'+S.txt+'</p>'
        +(dv?'<p class="ldbad">💰 Reparação registrada: <b>◉'+dv.amt+'</b> — '+(rl.war?'é o valor cobrado para pedir paz.':(st==='enemy'&&rl.warAt==null?'um pedido de reparação aparece no turno do líder. ':'')+'É o valor da paz se houver guerra.')+'</p>':'')
        +(rl.warAt!=null&&!rl.war?'<p class="ldbad">⚔ Declaração de guerra a caminho (rodada '+rl.warAt+'): vira uma política no turno do líder, com a chance de pagar reparação (a agressiva recusa).</p>':'')
        +negEntryHtml(f)
        +(!rl.war&&rl.v!==REL_START&&!rl.ally&&!(st==='enemy'&&rl.debt)?'<p class="ldsm">⏳ Sem novas ações, a relação esfria 1 ponto em direção a 5 a cada '+FAC_DECAY[f.temper||'neutra']+' rodadas.</p>':'');
      if(G.creative)relH+='<h4>Modo criativo</h4><div>Relação: <button class="ldmini" data-a="frel" data-id="'+id+'" data-d="-1">−1</button><button class="ldmini" data-a="frel" data-id="'+id+'" data-d="1">+1</button> '+[0,2,5,8,10].map(v=>'<button class="ldmini" data-a="frelset" data-id="'+id+'" data-v="'+v+'">'+v+'</button>').join('')+(rl.war?' <button class="ldmini" data-a="fpeace" data-id="'+id+'">🕊 Paz</button>':'')+'</div>';
    }
    const L=(!f.player&&negOpen(f))?negPage(f):'<h3>'+f.name+(f.player?' <small>(você)</small>':'')+'</h3><img class="fe-img" src="'+facFlagURL(f.id,4)+'" width="128" height="80">'
      +(G.creative&&!f.player?'<p>Personalidade: <b>'+facTemperName(f)+'</b> <small>(só no modo criativo)</small></p>':'')
      +relH
      +'<h4>Cidades</h4>'+(cs.length?'<ul class="ldul">'+cs.map(c=>{const r=rt(c);const e=ec(c),cr=G.creative&&c.owner!=='player'&&e,px=cr?priceExplain({city:c,kind:'buy'}):[];   // modo criativo: humor e, se o preço varia, o "?" com as variações
        return '<li>'+(c.home?'🏛 ':'')+c.name+' '+resIcon(focusOf(c))+(c.rebel?' <b style="color:#b02a2a">🔥 Rebeldes</b>':'')+(cr?' <small>'+MOOD[moodOf(c)].icon+' '+MOOD[moodOf(c)].n+'</small>'+(px.length?' <button class="qmark" data-why="price" data-c="'+c.id+'" data-k="buy" title="Variações de preço dos serviços">?</button>':''):'')+(r?' <span class="cvb" data-ri="'+rd.routes.indexOf(r)+'">🛒</span>':'')+'</li>'}).join('')+'</ul>':'<p>Sem cidades: a facção foi destruída.</p>')
      +(f.player?'<button data-a="editfac">✏ Editar nome, cor e bandeira</button>'+(isLeader()?'':'<p class="ldsm">Fora do turno do líder só o nome pode ser mudado.</p>'):'');
    const R='<h3>Facções</h3>'+fl.map(x=>{const sx=x.player?null:REL_ST[relStatus(x.id)];return '<button class="ldcity'+(x.id===f.id?' sel':'')+'" data-a="fac" data-id="'+x.id+'"><span><i style="color:'+hex6(FAC_COLORS[x.color].c)+';font-style:normal">■</i> '+x.name+(x.player?' (você)':'')+'</span><small>'+facCities(x.id).length+' cidade(s)</small>'+(sx?'<em style="color:'+sx.col+'">'+sx.n+' • '+relOf(x.id).v+'/10</em>':'')+'</button>'}).join('');
    return[R,L];   // a lista de facções à esquerda e os detalhes à direita
  }
  if(LB.tab==='caravanas'){
    const L='<h3>Caravanas ativas</h3>'+(rd.routes.length?rd.routes.map((r,i)=>{const A=WORLD.cities[r.a],B=WORLD.cities[r.b];
      return '<div class="ldroute"><b>'+routeName(r)+'</b><br><small>'+A.name+': envia '+resIcon(focusOf(A))+' → recebe '+resIcon(focusOf(B))+'<br>'+B.name+': envia '+resIcon(focusOf(B))+' → recebe '+resIcon(focusOf(A))+'</small><br><button data-a="unroute" data-i="'+i+'" '+(isLeader()?'':'disabled')+'>Desfazer</button></div>'}).join(''):'<p>Nenhuma caravana ainda.</p>')
      +'<p class="ldsm">Quem recebe o produto da outra cidade: a necessidade dele <b>100% some</b>, <b>150% cai para 100%</b> e <b>200% cai para 150%</b> (mostrado numa tabela antes de fechar o acordo). Negociar com uma cidade de <b>ouro</b> rende ouro por rodada (e uma cidade de ouro com acordo não rende imposto). A produção levada pela caravana não vai para o armazém.</p>';
    const R='<h3>Nova caravana</h3><p>Escolha no <b>mapa</b> a cidade de <b>origem</b> (uma das suas) e a de <b>destino</b> (sua, aliada ou neutra). A sua cidade passa a receber o produto do destino por caravana (reduz a necessidade dele ou rende ouro).</p>'
      +'<p>Preço: <b>◉ '+meetCaravanCost()+'</b>'+(actCost('caravan')?' + '+actCost('caravan')+' ação':'')+'</p><button data-a="route" class="gold" '+(canAct('caravan')&&Ledger.canAfford({gold:meetCaravanCost()})&&freeCityForRoute()?'':'disabled')+'>🗺 Escolher no mapa</button>'+(freeCityForRoute()?'':'<p class="ldwarn">Todas as suas cidades já têm uma caravana ativa (cada cidade só pode ter uma por vez). Desfaça uma para criar outra.</p>')+leaderOnly()+(Ledger.anyDebt()?'<p class="ldwarn">Com dívida não é possível comprar.</p>':'');    return[L,R];
  }
  const lvl=rd.lvl,cost=capCost(),can=isLeader()&&lvl<CAP_MAX_LVL&&canAct('capital');
  const L='<h3>'+WORLD.home.name+' — a capital</h3><p>Nível do líder: <b>'+lvl+'</b> / '+CAP_MAX_LVL+'</p><p>Ações por rodada: <b>'+maxActions()+'</b></p><p class="ldsm">A capital evolui até virar uma cidade fortificada. Cada nível aumenta o número de ações do líder por rodada.</p>';
  const R='<h3>Evoluir a capital</h3>'+(lvl>=CAP_MAX_LVL?'<p>A capital já é uma cidade fortificada.</p>':'<p>Próximo nível: <b>'+(lvl+1)+'</b> (+1 ação por rodada, a partir da próxima rodada).</p><p>Custo: <b>◉ '+cost.gold+'</b> + '+actCost('capital')+' ação</p><button data-a="cap" '+(can&&Ledger.canAfford(cost)?'':'disabled')+'>Evoluir</button>'+leaderOnly()+(Ledger.anyDebt()?'<p class="ldwarn">Com dívida não é possível comprar.</p>':''));
  return[L,R];
}
function renderBook(){
  const inv=LB.top==='inv'&&!G.office;if(!inv&&LB.top==='inv')LB.top='book';
  const mp=LB.top==='map';
  $('ldsub').style.display=(inv||mp)?'none':'flex';
  $('ldsub').innerHTML=LSUBS.map(t=>'<button class="'+(LB.tab===t[0]?'sel':'')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('');
  if(inv){$('ldL').innerHTML=INV_L;$('ldR').innerHTML=INV_R;renderInventory()}
  else if(mp){const [L,R]=mapPages();$('ldL').innerHTML=L;$('ldR').innerHTML=R;drawBigMap()}
  else{const [L,R]=bookPages();$('ldL').innerHTML=(isLeader()&&LB.tab!=='resumo'?'<p class="ldsm">Ações do líder: '+actionsHtml()+'</p>':'')+L;$('ldR').innerHTML=R}   // as ações restantes aparecem em todas as abas
  if(!inv&&!mp&&LB.tab==='diplo')fgSetup();   // diagrama de cordas (facgraph.js)
  if(!inv&&!mp&&LB.tab==='facs')$('ldL').querySelectorAll('.cvb').forEach(el=>UI.tip(el,()=>routeTip(STATE.rd.routes[+el.dataset.ri])));   // o mouse sobre o 🛒 mostra a caravana
  $('ldtabs').innerHTML=[['inv','🎒','Bolsa'],['book','📖','Livro'],['map','🗺','Mapa']].filter(t=>!(G.office&&t[0]==='inv')).map(t=>'<button class="'+((inv?'inv':mp?'map':'book')===t[0]?'sel':'')+'" data-top="'+t[0]+'">'+t[1]+'<br><small>'+t[2]+'</small></button>').join('');
  $('ldL').parentNode.classList.toggle('ldmap',mp);   // no mapa o livro vira uma página só, mais alta
  $('lddone').style.display=(isLeader()||G.office)?'':'none';$('lddone').textContent='✔ Encerrar turno';
  {const inMeet=!!(G.office&&G.office.meet);$('lddone').disabled=inMeet;$('lddone').title=inMeet?'Termine a reunião antes de encerrar o turno':''}   // na sala de reuniões não dá para encerrar o turno
}
function bookClick(e){
  const t=e.target.closest('button');if(!t||!$('ldbook').contains(t))return;
  const rd=STATE.rd,a=t.dataset.a;
  if(t.dataset.top){LB.top=t.dataset.top;G.invSel=null;G.pendSel=null;renderBook();return}
  if(t.dataset.tab){LB.tab=t.dataset.tab;LB.top='book';renderBook();return}
  if(t.id==='lddone'){if(G.office&&G.office.meet)return;if(isLeader())finishLeaderTurn();else{closePanel();leaveOffice()}return}
  if(t.id==='ldclose'){closePanel();return}
  if(LB.top==='inv'||LB.top==='map')return;   // botões da bolsa têm seus próprios tratadores; o mapa só tem o canvas
  const c=WORLD.cities[LB.city];
  if(a==='polopen'){showPolicy();return}
  if(a==='polview'){const lg=STATE.pol.log[STATE.pol.log.length-1];if(lg)showPolicy(lg);return}
  else if(a==='city'){LB.city=+t.dataset.id}
  else if(a==='fac'){LB.fac=+t.dataset.id;LB.neg=null}else if(a&&a.indexOf('neg')===0){negClick(t)}
  else if(a==='fally'){if(isLeader())facAlly(+t.dataset.id)}
  else if(a==='fask'){if(isLeader())facAskPeace(+t.dataset.id)}
  else if(a==='fgive'){facGiveGold(+t.dataset.id,+t.dataset.g)}
  else if(a==='frelic'){facGiveRelic(+t.dataset.id)}
  else if(a==='msmap'){const m=msById(+t.dataset.id);if(m)msShowMap(m)}
  else if(a==='msact'){msSetActive(+t.dataset.id)}
  else if(a==='msdrop'){const m=msById(+t.dataset.id);if(m){if(m.src==='fac')msFail(m,'Você abandonou a missão');else{msDrop(m);toast('Missão abandonada.',2000)}}}
  else if(a==='mstakef'){msTakeFac(+t.dataset.fid)}
  else if(G.creative&&a==='frel'){relChange(+t.dataset.id,+t.dataset.d,'ajuste do modo criativo')}
  else if(G.creative&&a==='frelset'){relSet(+t.dataset.id,+t.dataset.v,'ajuste do modo criativo')}
  else if(G.creative&&a==='fpeace'){facPeace(+t.dataset.id)}
  else if(a==='editfac'){facEditIdentity().then(ok=>{if(ok)renderBook()});return}
  else if(a==='pf'||a==='ps'){const en=ec(c);if(isLeader()&&en.type==='port'){let cf=en.nf||en.pf,cs=en.ns||en.ps;const r=t.dataset.r;if(a==='pf'){if(r===cs)cs=NEEDS.includes(cf)?cf:NEEDS.find(x=>x!==r);cf=r}else{if(r===cf)cf=cs;cs=r}en.nf=cf;en.ns=cs}}
  else if(a==='unroute'){if(isLeader()){rd.routes.splice(+t.dataset.i,1);rebuildCaravans();computeBuffs()}}
  else if(a==='route'){if(!isLeader())toast('Caravanas só no turno do líder.',2000);else{startCaravanPick();return}}
  else if(a==='cap'){
    const cost=capCost();
    if(isLeader()&&rd.lvl<CAP_MAX_LVL&&canAct('capital')&&Ledger.spend(cost)){spendAct('capital');rd.lvl++;sfx('win',0);toast('🏛 A capital evoluiu! Nível '+rd.lvl+': mais ações a partir da próxima rodada.',3500)}
  }
  else if(a==='cityup'){
    const cost=cityUpCost(c);
    if(isLeader()&&c.owner==='player'&&!c.home&&cityLvl(c)<CITY_MAX_LVL&&canAct('city')&&Ledger.spend(cost)){spendAct('city');rd.clv[c.id]=cityLvl(c)+1;sfx('win',0);toast('🏘 '+c.name+' evoluiu para o nível '+cityLvl(c)+': lojas '+Math.round(ECON.cityDisc*(cityLvl(c)-1)*100)+'% mais baratas.',3500)}
  }
  renderBook();
}
document.addEventListener('click',e=>{if(e.target.closest('#ldbook'))bookClick(e)});

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
