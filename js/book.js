'use strict';
// ---------- Caderno (painel ldbook): bolsa, livro do prefeito e suas abas ----------
// Separado de rounds.js. A aba Mapa e a escolha de caravana ficam em bookmap.js.
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
