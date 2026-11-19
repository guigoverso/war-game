'use strict';
// ---------- Fase 6: Negociação com uma facção (navegação estilo app de celular, dentro da página do livro) ----------
// No resumo da facção (aba 🏴 Facções) os botões de decisão deram lugar a um só: "Negociação". Ele abre um menu de botões na própria página
// (sem popup); cada escolha mostra o que é pertinente e o botão ⬅ do topo volta uma tela. "Guerra" tem as cores invertidas dos outros botões.
// LB.neg={fid,path:[]}: path é a pilha de telas (vazia = menu principal). LB.negAnim liga a animação de deslize só quando a tela muda.
const NEG_TITLE={root:'Negociação',ally:'Aliança',gift:'Melhorar a relação',gold:'Doar ouro',relic:'Doar relíquia',route:'Rota comercial',peace:'Pedir paz',war:'Declarar guerra'};
const negOpen=f=>!!(LB.neg&&LB.neg.fid===f.id);
const negTop=()=>LB.neg.path.length?LB.neg.path[LB.neg.path.length-1]:'root';
const negBtn=(to,txt,sub,cls)=>'<button class="negbtn'+(cls?' '+cls:'')+'" data-a="negnav" data-to="'+to+'">'+txt+(sub?'<small>'+sub+'</small>':'')+'<i>›</i></button>';
const negAct=(a,id,txt,dis,why,extra,cls)=>'<button class="negbtn'+(cls?' '+cls:'')+'" data-a="'+a+'" data-id="'+id+'" '+(extra||'')+(dis?' disabled':'')+(why?' title="'+why+'"':'')+'>'+txt+'</button>'+(dis&&why?'<p class="ldsm">'+why+'</p>':'');

// botão que fica no resumo da facção
function negEntryHtml(f){
  return '<h4>Diplomacia</h4><button class="negbtn" data-a="negopen" data-id="'+f.id+'">🤝 Negociação<small>Aliança, presentes, paz e guerra</small><i>›</i></button>'
    +(isLeader()?'':'<p class="ldsm">🔒 As decisões só valem no turno do líder.</p>');
}

function negPage(f){
  const id=f.id,rl=relOf(id),st=relStatus(id),S=REL_ST[st],lead=isLeader(),scr=negTop(),dv=rl.debt;
  const lock=lead?'':'Só no turno do líder.';
  let b='';
  if(scr==='root'){
    const ac=facAllyCost(id),amt=dv?dv.amt:REL_REP.neutral;
    b='<p><b style="color:'+S.col+'">'+S.n+'</b> • '+rl.v+'/10</p><p class="ldsm">O que você quer tratar com '+f.name+'?</p>'
      +negBtn('ally','🤝 Aliança',rl.ally?'Vocês são aliados':'Preço ◉'+ac.cost+' + '+actCost('ally')+' ação')
      +negBtn('gift','💰 Melhorar a relação','Ouro, relíquia e rota comercial')
      +(rl.war?negBtn('peace','🕊 Pedir paz','◉'+amt):'')
      +negBtn('war','⚔ Guerra',rl.war?'Vocês já estão em guerra':'Declarar guerra','neg-war');
  }else if(scr==='ally'){
    const ac=facAllyCost(id),why=lock||(rl.ally?'Vocês já são aliados.':rl.war?'Em guerra: só a paz resolve.':rl.v<REL_MAX?'A aliança exige relação '+REL_MAX+'/10 (agora '+rl.v+').':!canAct('ally')?'Sem ações do líder nesta rodada.':!Ledger.canAfford({gold:ac.cost})?'Ouro insuficiente.':'');
    b='<p class="ldsm">Aliada, ela luta nas suas guerras e você nas dela, e suas lojas ficam 20% mais baratas.</p>'
      +'<p>Preço: <b>◉'+ac.cost+'</b> + '+actCost('ally')+' ação</p>'
      +'<p class="ldsm">Preço da aliança = ◉'+ECON.ally.base+' × (poder deles ÷ o seu), entre '+ECON.ally.min+'× e '+ECON.ally.max+'×. Seu poder: <b>'+ac.me+'</b> • deles: <b>'+ac.them+'</b> (cada cidade vale 1 + o nível dela).</p>'
      +negAct('fally',id,'🤝 Fechar aliança (◉'+ac.cost+')',!!why,why);
  }else if(scr==='gift'){
    b='<p class="ldsm">Cada ação gasta 1 ação ◆ e vale uma vez por rodada por facção.</p>'
      +negBtn('gold','💰 Doar ouro','+ relação')+negBtn('relic','🏺 Doar relíquia','+ relação')+negBtn('route','🛒 Rota comercial','+ relação');
  }else if(scr==='gold'){
    b='<p class="ldsm">Doar ouro melhora a relação.'+(rl.v>=REL_MAX?' (Já no máximo.)':'')+'</p>'
      +[500,1000].filter(g=>!facGoldHidden(id,g)).map(g=>{const w=facActBlock(id,'gold',g);return negAct('fgive',id,'💰 Doar ◉'+g+' (+'+Math.min(relPreview(id,FAC_GOLD[g]),REL_MAX-rl.v)+')',!!w,w,'data-g="'+g+'"')}).join('');
  }else if(scr==='relic'){
    const w=facActBlock(id,'relic');
    b='<p class="ldsm">Relíquias: '+invCount('reliquia')+' na bolsa, '+facRelicStore()+' no armazém.</p>'
      +negAct('frelic',id,'🏺 Doar relíquia (+'+Math.min(relPreview(id,FAC_RELIC_GAIN),REL_MAX-rl.v)+')',!!w,w);
  }else if(scr==='route'){
    b='<p class="ldsm">Crie uma caravana entre uma cidade sua e uma cidade dela, na aba 🛒 Caravanas: a relação sobe +'+relPreview(id,FAC_ROUTE_GAIN)+' (exige relação desfavorável ou melhor).</p>'
      +'<button class="negbtn" data-a="negtab" data-tab="caravanas">🛒 Ir para Caravanas<i>›</i></button>';
  }else if(scr==='peace'){
    const amt=dv?dv.amt:REL_REP.neutral,why=!rl.war?'Não há guerra com ela.':lock||(!Ledger.canAfford({gold:amt})?'Ouro insuficiente.':'');
    b='<p class="ldsm">A paz custa o valor da reparação registrada. A relação volta a 5 (neutro).</p><p>Preço: <b>◉'+amt+'</b></p>'
      +negAct('fask',id,'🕊 Pedir paz (◉'+amt+')',!!why,why);
  }else if(scr==='war'){
    const why=rl.war?'Vocês já estão em guerra.':lock||(STATE.round<1?'Não há guerra na rodada 0.':meetPact()?'Um pacto da reunião impede guerras.':'');
    b='<p class="ldsm">Ao declarar guerra: a relação vai a 0, a aliança e as caravanas com '+f.name+' acabam, e você só entra nas cidades dela atacando.</p>'
      +(rl.warAt!=null&&!rl.war?'<p class="ldbad">⚔ Uma declaração já está a caminho (rodada '+rl.warAt+').</p>':'')
      +negAct('negwar',id,'⚔ Declarar guerra a '+f.name,!!why,why,'','neg-war');
  }
  return '<div class="negpage'+(LB.negAnim?' negslide':'')+'"><div class="negbar"><button class="negback" data-a="negback" title="Voltar">⬅</button><b>'+(scr==='root'?'Negociação com '+f.name:NEG_TITLE[scr])+'</b></div>'+b+'</div>';
}

function negClick(t){
  const a=t.dataset.a;LB.negAnim=false;
  if(a==='negopen'){LB.neg={fid:+t.dataset.id,path:[]};LB.negAnim=true}
  else if(!LB.neg)return;
  else if(a==='negnav'){LB.neg.path.push(t.dataset.to);LB.negAnim=true}
  else if(a==='negback'){if(LB.neg.path.length)LB.neg.path.pop();else LB.neg=null;LB.negAnim=true}
  else if(a==='negtab'){LB.neg=null;LB.tab=t.dataset.tab}
  else if(a==='negwar'){const id=+t.dataset.id;if(isLeader()&&STATE.round>=1&&!meetPact()&&!relOf(id).war){facDeclareWar(id);LB.neg.path=['war']}}
}
