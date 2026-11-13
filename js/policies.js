'use strict';
// ---------- Motor de decisões e Políticas locais (Fase 4B) ----------
// Uma "política" é um cartão sorteado no começo do turno do Líder (30% por rodada): narrativa + 3 opções (A, B, C).
// Cada opção tem um tipo (buff, debuff, buff+debuff, neutro), pode custar ouro, aplica efeitos na hora e/ou depois que o turno do Comandante começa (onStart).
// O mesmo motor servirá aos Eventos globais e às Reuniões (Fase 5): só muda quem sorteia os cartões.
// Textos e números aprovados: docs/politicas-locais.md.
//
// Como acrescentar uma política (tudo em dados, sem mexer no motor):
//   definePolicy({id,name,city:true|false,cityOk(c),cond(),cool:rodadas,weight,text(c),options:[{k:'A',label,type,eff(c),cost:{gold:n},can(ctx),preview(ctx),apply(ctx),onStart(ctx)}]})
//   cost: o jogador pode pagar mesmo sem ter o ouro; o saldo fica negativo (dívida) e ele sofre os efeitos dela (compras bloqueadas).
//   apply(ctx) roda na hora; onStart(ctx) roda quando o turno do Comandante começa (teleporte, combate, soldados). ctx.fx({t,c,p,left,txt}) cria um efeito temporário.
// Efeitos temporários (STATE.pol.fx, duram POL.dur rodadas): t = 'need' (p.mul, p.sel=recurso) • 'noTax' • 'noProd' • 'price' (p.mul, p.sel=tipo de preço) • 'gold' (p.add por rodada, no cofre) • outros nomes servem de bandeira (polFlag).
const POL={chance:0.30,dur:5,defs:[],byId:{}};
const POL_TYPE={buff:{n:'Buff',col:'#9fe89f'},debuff:{n:'Debuff',col:'#ff9a9a'},both:{n:'Buff + Debuff',col:'#ffd23a'},neutral:{n:'Neutro',col:'#c8c8c8'}};
function definePolicy(d){
  if(!d.options||d.options.length!==3)console.warn('política '+d.id+': precisa de 3 opções');
  else if(!d.options.some(o=>!o.cost))console.warn('política '+d.id+': ao menos uma opção deve ser gratuita (ou o jogador pode ficar preso)');
  POL.defs.push(d);POL.byId[d.id]=d;return d;
}
Hooks.on('resetState',()=>{STATE.pol={pending:null,fx:[],queue:[],cool:{},log:[]}});
function normalizePol(){const p=STATE.pol||(STATE.pol={});if(!p.fx)p.fx=[];if(!p.queue)p.queue=[];if(!p.cool)p.cool={};if(!p.log)p.log=[];if(p.pending===undefined)p.pending=null}

// ---------- efeitos temporários ----------
const polAll=(t,cid)=>(STATE.pol&&STATE.pol.fx||[]).filter(f=>f.t===t&&(f.c===undefined||f.c<0||cid===undefined||f.c===cid));
const polSel=(f,sel)=>f.p===undefined||f.p.sel===undefined||sel===undefined||f.p.sel===sel;
const polMul=(t,cid,sel)=>polAll(t,cid).filter(f=>polSel(f,sel)).reduce((m,f)=>m*((f.p&&f.p.mul)||1),1);
const polFlag=(t,cid)=>polAll(t,cid).length>0;
function polAddFx(spec){
  const f={pid:spec.pid||'',t:spec.t,c:spec.c===undefined?-1:spec.c,p:spec.p||{},left:spec.left||POL.dur,txt:spec.txt||spec.t};
  STATE.pol.fx.push(f);return f;
}
// preço: efeitos 'price' (ex.: lojas mais baratas). sel = tipo de preço (weapon, ammo, vest, upgrade, heal, buy, tavern, recruit, soldierup, repair) ou todos
addPriceMod('pol',(p,ctx)=>p*polMul('price',ctx.city?ctx.city.id:undefined,ctx.kind),80);

// ---------- fim de rodada: rendas por rodada e duração ----------
Hooks.on('round',()=>{
  const P=STATE.pol;if(!P||!STATE.rd)return;
  const rep=STATE.rd.report||(STATE.rd.report=[]);
  for(const f of P.fx){
    if(f.t==='routeProd')for(const id of[f.p.a,f.p.b]){const c=WORLD.cities[id];if(c&&c.owner==='player'&&!polFlag('noProd',id)){const g=prodAdd(c,focusOf(c),f.p.add);rep.push('📜 '+f.txt+': +'+g+' em '+c.name+'.')}}
    if(f.t==='gold'&&f.p.add){shOf().vault+=f.p.add;rep.push('📜 '+f.txt+': +◉'+f.p.add+' no cofre.')}
    f.left--;
  }
  for(const f of P.fx.filter(x=>x.left<=0))rep.push('📜 Terminou: '+f.txt+'.');
  P.fx=P.fx.filter(f=>f.left>0);
});

// ---------- sorteio ----------
function polCooling(key){return((STATE.pol.cool[key])||0)>STATE.round}
function polCandidates(){
  const out=[];
  for(const d of POL.defs){
    if(d.off||(d.cond&&!d.cond()))continue;
    if(!d.city){if(!polCooling(d.id))out.push({d,city:null});continue}
    for(const c of playerCities())if((!d.cityOk||d.cityOk(c))&&!polCooling(d.id+':'+c.id))out.push({d,city:c});
  }
  return out;
}
// sorteio determinístico pela semente e pela rodada (recarregar o jogo não "rerrola" a política)
// a política NÃO abre sozinha: surge uma notificação no canto superior direito e o jogador abre o cartão quando quiser (livro, na mesa)
function rollPolicy(force){
  normalizePol();
  const P=STATE.pol;if(P.pending){polNoteUpdate();return}
  if(!force&&STATE.round<1)return;
  const rng=new RNG((WORLD.seed*131+STATE.round*7919+17)>>>0);
  if(!force&&!rng.chance(POL.chance))return;
  let cand=polCandidates();if(!cand.length)return;
  const last=P.log.length?P.log[P.log.length-1].pid:null,alt=cand.filter(x=>x.d.id!==last);if(alt.length)cand=alt;   // evita repetir a política da rodada anterior
  const tot=cand.reduce((a,x)=>a+(x.d.weight||1),0);let r=rng.next()*tot,pick=cand[0];
  for(const x of cand){r-=(x.d.weight||1);if(r<=0){pick=x;break}}
  P.pending={pid:pick.d.id,city:pick.city?pick.city.id:-1,round:STATE.round};
  if(pick.d.data)P.pending.data=pick.d.data(rng);   // dados extras sorteados (ex.: qual rota de caravana)
  toast('📜 Há uma política a decidir. Abra o livro na mesa (E).',4500);polNoteUpdate();
}
// modo criativo: "Disparar evento na próxima rodada" força o sorteio no próximo turno do Líder
Hooks.on('leaderTurn',()=>{const f=POL.forceNext;POL.forceNext=false;rollPolicy(f)});

// ---------- notificação no canto superior direito ----------
function polNoteUpdate(){
  let el=document.getElementById('polnote');
  if(!el){
    el=document.createElement('div');el.id='polnote';
    el.style.cssText='position:fixed;top:14px;right:14px;z-index:45;max-width:290px;background:#4a2a12;border:3px solid #1e1006;color:#ffe9b0;padding:10px 14px;font-size:15px;line-height:1.4;box-shadow:0 4px 0 rgba(0,0,0,.4);cursor:pointer;display:none';
    el.onclick=()=>{if(STATE.pol&&STATE.pol.pending)showPolicy()};
    document.body.appendChild(el);
  }
  const pd=STATE.pol&&STATE.pol.pending,d=pd&&POL.byId[pd.pid];
  const show=!!d&&STATE.phase==='leader'&&!G.panel&&!(polWin&&polWin.isOpen());   // com algum painel aberto (livro, pausa...) a notificação some; o livro tem o botão "Abrir"
  el.style.display=show?'block':'none';
  if(show)el.innerHTML='📜 <b>Política a decidir</b><br><small>'+d.name+' — abra o livro na mesa (E) para decidir. Você só encerra o turno depois.</small>';
}

// ---------- janela do cartão ----------
let polWin=null;
const polCityOf=pd=>pd&&pd.city>=0?WORLD.cities[pd.city]:null;
function polCtx(d,op,c,data){
  return{def:d,op,city:c,data,
    fx:spec=>polAddFx(Object.assign({pid:d.id,c:c?c.id:-1},spec)),
    gold:n=>Ledger.add('gold',n),vault:n=>{shOf().vault+=n},
    toast:(m,ms)=>toast(m,ms||3500)};
}
function showPolicy(){
  const pd=STATE.pol&&STATE.pol.pending;if(!pd)return;
  const d=POL.byId[pd.pid];if(!d){STATE.pol.pending=null;return}
  const c=polCityOf(pd);
  if(!polWin)polWin=UI.window({title:'',width:600,z:50});
  polWin.setTitle('📜 '+d.name+(c?' — '+c.name:''));
  const b=polWin.body;b.innerHTML='';
  const nar=document.createElement('p');nar.style.cssText='font-style:italic;line-height:1.5';nar.textContent='“'+d.text(c,pd.data)+'”';b.appendChild(nar);
  for(const op of d.options){
    const ty=POL_TYPE[op.type]||POL_TYPE.neutral,ctx=polCtx(d,op,c,pd.data);
    const why=op.can?op.can(ctx):null;   // pagar sem ter o ouro é permitido: gera dívida (ver polChoose)
    const debt=op.cost&&!Ledger.canAfford(op.cost);
    const row=document.createElement('div');row.className='card';row.style.cssText='margin:6px 0;padding:8px 10px';
    row.innerHTML='<b>'+op.k+'. '+op.label+'</b> <span style="color:'+ty.col+';font-size:13px">['+ty.n+']</span><br><span style="font-size:14px;line-height:1.5">'+op.eff(c,pd.data)+(op.onStart?' <b>⏱</b>':'')+'</span>';
    const btn=UI.button('Escolher '+op.k,why?'alt':'gold',()=>polChoose(op.k));btn.style.marginTop='6px';
    if(why){btn.disabled=true;const w=document.createElement('small');w.style.cssText='margin-left:8px;color:#ff9a9a';w.textContent=why;row.append(btn,w)}
    else{row.appendChild(btn);if(debt){const w=document.createElement('small');w.style.cssText='margin-left:8px;color:#ffb060';w.textContent='💳 você não tem o ouro: o valor vira dívida (compras bloqueadas até pagar)';row.appendChild(w)}}
    b.appendChild(row);
  }
  const hint=document.createElement('p');hint.className='ldsm';hint.textContent='⏱ = tem efeito quando o turno do Comandante começar. Você precisa decidir antes de encerrar o turno do Líder.';b.appendChild(hint);
  polWin.foot.innerHTML='';polWin.foot.appendChild(UI.button('Decidir depois','alt',()=>polWin.close()));
  polWin.open();
}
function polChoose(k){
  const pd=STATE.pol.pending;if(!pd)return;
  const d=POL.byId[pd.pid],op=d&&d.options.find(o=>o.k===k),c=polCityOf(pd);if(!op)return;
  const ctx=polCtx(d,op,c,pd.data);
  const go=()=>{
    if(op.cost){const dv=!Ledger.canAfford(op.cost);Ledger.borrow(op.cost);if(dv)toast('💳 Sem ouro suficiente: o saldo ficou em dívida.',3500)}   // pagar é sempre possível; sem saldo, vira dívida
    if(op.apply)op.apply(ctx);
    if(op.onStart)STATE.pol.queue.push({pid:d.id,k,city:pd.city,data:pd.data});
    const cd=op.cool!==undefined?op.cool:d.cool;   // recarga (rodadas) para a mesma política na mesma cidade; a opção pode ter a sua
    if(cd)STATE.pol.cool[d.id+(c?':'+c.id:'')]=STATE.round+cd;
    STATE.pol.log.push({round:STATE.round,pid:d.id,k,city:pd.city});if(STATE.pol.log.length>20)STATE.pol.log.shift();
    STATE.pol.pending=null;
    const line='📜 '+d.name+(c?' ('+c.name+')':'')+': '+op.k+'. '+op.label+'.';
    (STATE.rd.report||(STATE.rd.report=[])).push(line);
    polWin.close();sfx('win',0);toast(line,3500);polNoteUpdate();
    if(typeof renderBook==='function'&&G.panel==='ldbook')renderBook();
    refreshRoundHud();
  };
  if(op.preview){   // resumo antes de confirmar (ex.: resultado da batalha calculado no turno do Líder)
    const w=UI.window({title:'📋 Resumo — '+op.label,width:480,z:60});
    w.body.innerHTML=op.preview(ctx);
    w.foot.append(UI.button('Confirmar','gold',()=>{w.close();w.el.remove();go()}),UI.button('Voltar','alt',()=>{w.close();w.el.remove()}));
    w.open();
  }else go();
}
// no começo do turno do Comandante: executa o que as opções escolhidas deixaram para depois
function polRunQueue(){
  const q=STATE.pol&&STATE.pol.queue.splice(0)||[];
  for(const e of q){
    const d=POL.byId[e.pid],op=d&&d.options.find(o=>o.k===e.k);if(!op||!op.onStart)continue;
    try{op.onStart(polCtx(d,op,e.city>=0?WORLD.cities[e.city]:null,e.data))}catch(err){console.error('política '+e.pid,err)}
  }
}
// bloco do livro (Resumo): política pendente e efeitos ativos
// invoca uma política específica (modo criativo, só no turno do Líder); devolve uma mensagem de erro ou null
function polSummon(id){
  normalizePol();const P=STATE.pol;
  if(STATE.phase!=='leader')return 'Só no turno do líder.';
  if(P.pending)return 'Já há uma política pendente: decida primeiro.';
  const d=POL.byId[id];if(!d)return 'Política desconhecida.';
  if(d.cond&&!d.cond())return 'Condição não atendida agora (ex.: precisa de rota ativa, soldados ou espaço para a dungeon).';
  let city=null;
  if(d.city){const cs=playerCities().filter(c=>!d.cityOk||d.cityOk(c));if(!cs.length)return 'Nenhuma cidade sua atende à condição desta política (ex.: Rebelião exige uma cidade descontente).';city=cs[Math.floor(Math.random()*cs.length)]}
  P.pending={pid:id,city:city?city.id:-1,round:STATE.round};
  if(d.data)P.pending.data=d.data(new RNG((Math.random()*1e9)|0));
  toast('📜 Há uma política a decidir. Abra o livro na mesa (E).',4500);polNoteUpdate();return null;
}
// informação da política atual: a da rodada (pendente ou já decidida) e os efeitos ativos com a rodada em que terminam
function polInfoHtml(){
  normalizePol();const P=STATE.pol;let h='';
  const last=P.log.length?P.log[P.log.length-1]:null;
  if(P.pending){const d=POL.byId[P.pending.pid],c=polCityOf(P.pending);h+='<p><b>📜 Política desta rodada:</b> '+(d?d.name:'?')+(c?' ('+c.name+')':'')+' — <i>a decidir</i></p>'}
  else if(last&&last.round===STATE.round){const d=POL.byId[last.pid],op=d&&d.options.find(o=>o.k===last.k),c=last.city>=0?WORLD.cities[last.city]:null;
    h+='<p><b>📜 Política desta rodada:</b> '+(d?d.name:'?')+(c?' ('+c.name+')':'')+'<br><small>Escolha: '+last.k+'. '+(op?op.label:'')+(op?' — '+op.eff(c,last.data):'')+'</small></p>'}
  else h+='<p><b>📜 Política desta rodada:</b> nenhuma.</p>';
  return h;
}
function polBookHtml(){
  normalizePol();const P=STATE.pol;let h=polInfoHtml();
  if(P.pending)h+='<p class="ldwarn"><button data-a="polopen">Abrir a política a decidir</button></p>';
  const pr=playerCities().filter(c=>ec(c).press);
  if(pr.length)h+='<h4>Cidades sob repressão</h4><ul class="ldul">'+pr.map(c=>'<li>'+c.name+': necessidades +'+50*ec(c).press.n+'% (máx. 300%). Supra tudo numa rodada para acabar.</li>').join('')+'</ul>';
  if(P.fx.length)h+='<h4>Efeitos ativos</h4><ul class="ldul">'+P.fx.map(f=>'<li>'+f.txt+'<br><small>até o fim da rodada '+(STATE.round+f.left-1)+' (mais '+f.left+' rodada'+(f.left>1?'s':'')+')</small></li>').join('')+'</ul>';
  else h+='<p class="ldsm">Nenhum efeito temporário ativo.</p>';
  return h;
}

// ---------- políticas ----------
// retira n unidades de suprimentos dos armazéns das suas cidades (começa pelo recurso mais abundante); devolve quanto conseguiu tirar
function polTakeSupplies(n){
  let left=n;
  for(const c of playerCities())for(const r of NEEDS.slice().sort((a,b)=>storedOf(c,b)-storedOf(c,a))){if(left<=0)break;left-=consumeSupply(c,r,left)}
  return n-left;
}
const polStock=()=>playerCities().reduce((a,c)=>a+NEEDS.reduce((s,r)=>s+storedOf(c,r),0),0);

definePolicy({id:'comerciantes',name:'Comerciantes estrangeiros',city:false,
  text:()=>'Uma caravana de terras distantes monta tendas na praça. Há tecidos, especiarias e ferramentas que ninguém aqui jamais viu. Seus comerciantes aceitam negociar, mas não ficam muito tempo.',
  options:[
    {k:'A',label:'Negociar acordos favoráveis',type:'buff',eff:()=>'Todas as lojas ficam 15% mais baratas por '+POL.dur+' rodadas.',
      apply:x=>x.fx({t:'price',p:{mul:0.85},txt:'Lojas 15% mais baratas (comerciantes estrangeiros)'})},
    {k:'B',label:'Vender seus excedentes pelo dobro',type:'both',eff:()=>'+◉100. Perde 5 unidades de suprimentos dos armazéns.',
      can:()=>polStock()<5?'você tem menos de 5 unidades guardadas nos armazéns':null,
      apply:x=>{const t=polTakeSupplies(5);x.gold(100);x.toast('Vendeu '+t+' unidades por ◉100.')}},
    {k:'C',label:'Recusar a visita',type:'neutral',eff:()=>'Nada muda.'}
  ]});

// ---------- Etapa 1 da 4C: colheita, festival, refugiados, epidemia ----------
const polFoodReserve=c=>{const w=whOf(c);return w.prod&&supplyOf(w.prod.id)&&supplyOf(w.prod.id).res==='food'?w.prod.n:0};

definePolicy({id:'colheita',name:'Colheita farta',city:true,cool:4,
  text:c=>'O verão foi generoso. Os campos de '+c.name+' amarelaram antes do tempo e os celeiros mal fecham. Há grãos sobrando como não se via há anos, e os mercadores já rondam a cidade com bolsas cheias.',
  options:[
    {k:'A',label:'Estocar para os meses difíceis',type:'buff',eff:c=>'+6 de comida na reserva do armazém de '+c.name+'.',
      apply:x=>{const g=prodAdd(x.city,'food',6);x.toast('+'+g+' de comida na reserva de '+x.city.name+'.')}},
    {k:'B',label:'Exportar tudo',type:'both',eff:c=>'Vende toda a comida do armazém e da reserva de '+c.name+': +◉150. A necessidade de comida da cidade sobe 50% por '+POL.dur+' rodadas.',
      apply:x=>{consumeSupply(x.city,'food',99999);if(polFoodReserve(x.city))whOf(x.city).prod=null;x.gold(150);
        x.fx({t:'need',p:{mul:1.5,sel:'food'},txt:'Necessidade de comida +50% em '+x.city.name+' (exportou a colheita)'})}},
    {k:'C',label:'Distribuir ao povo',type:'buff',eff:c=>'A felicidade de '+c.name+' sobe 1.',
      apply:x=>{joyShift(x.city,1);x.toast('😊 '+x.city.name+' ficou mais feliz.')}}
  ]});

definePolicy({id:'festival',name:'Festival',city:true,cool:4,
  text:c=>'As ruas de '+c.name+' amanheceram cheias de fitas. A tradição pede um festival no fim da colheita, com música, banquete e competições. O povo espera que o governante conceda a festa, ou ao menos não a proíba.',
  options:[
    {k:'A',label:'Financiar um grande festival',type:'both',cost:{gold:200},eff:c=>'−◉200. '+c.name+' fica Próspera por '+POL.dur+' rodadas (imposto ×1,5, +1 de produção, 10% de desconto nas lojas), se tiver os suprimentos.',
      apply:x=>{const e=ec(x.city);e.mood='rich';x.fx({t:'prosper',txt:x.city.name+' em festa (Próspera)'})}},
    {k:'B',label:'Permitir um festival modesto',type:'neutral',eff:()=>'Nada muda.'},
    {k:'C',label:'Cancelar a festa',type:'debuff',eff:c=>'O descontentamento de '+c.name+' sobe 1 (a felicidade cai 1; não afeta a contagem de rebelião).',
      apply:x=>{joyShift(x.city,-1);x.toast('😠 '+x.city.name+' ficou mais descontente.')}}
  ]});

definePolicy({id:'refugiados',name:'Refugiados',city:true,cool:4,
  text:c=>'Famílias cansadas, com trouxas nas costas, se amontoam diante dos portões de '+c.name+'. Fogem de saques e de fome em terras vizinhas. Entre eles há homens fortes dispostos a pegar em armas, mas também muitas bocas para alimentar.',
  options:[
    {k:'A',label:'Acolher os refugiados',type:'both',eff:c=>'+2 soldados grátis no quartel de '+c.name+' (se couber no seu exército) quando o turno do Comandante começar. A necessidade de comida da cidade sobe 50% por '+POL.dur+' rodadas.',
      apply:x=>x.fx({t:'need',p:{mul:1.5,sel:'food'},txt:'Necessidade de comida +50% em '+x.city.name+' (refugiados)'}),
      onStart:x=>{
        const c=x.city,bk=c.barracks||{x:c.cx,z:c.cz};let n=0;
        for(let i=0;i<2&&allyCount()<ARMY.max;i++){spawnAlly(bk.x+(Math.random()-0.5)*1.5,bk.z+(Math.random()-0.5)*1.5,c);n++}
        x.toast(n?'🪖 '+n+' refugiado(s) se alistaram em '+c.name+'.':'Seu exército já está completo: ninguém se alistou.',4000);
      }},
    {k:'B',label:'Recusar a entrada',type:'neutral',eff:()=>'Nada muda.'},
    {k:'C',label:'Encaminhá-los a outra cidade',type:'debuff',cost:{gold:60},eff:()=>'−◉60.'}
  ]});

definePolicy({id:'epidemia',name:'Epidemia',city:true,
  text:c=>'Uma febre desconhecida passa de casa em casa em '+c.name+'. Os mercados estão vazios, os curandeiros não dão conta e os doentes são levados para fora dos muros. O povo olha para a prefeitura esperando uma decisão.',
  options:[
    {k:'A',label:'Pagar curandeiros e remédios',type:'debuff',cost:{gold:120},cool:10,eff:c=>'−◉120 e a necessidade de comida de '+c.name+' sobe 50% por '+POL.dur+' rodadas. Sem outra epidemia nela por 10 rodadas.',
      apply:x=>x.fx({t:'need',p:{mul:1.5,sel:'food'},txt:'Necessidade de comida +50% em '+x.city.name+' (epidemia)'})},
    {k:'B',label:'Decretar quarentena',type:'debuff',cool:10,eff:c=>c.name+' fica sem produção e sem impostos por '+POL.dur+' rodadas; não é possível recrutar nela; curas e remédios ficam 50% mais caros. Sem outra epidemia por 10 rodadas.',
      apply:x=>{x.fx({t:'noProd',txt:x.city.name+': sem produção (quarentena)'});x.fx({t:'noTax',txt:x.city.name+': sem imposto (quarentena)'});
        x.fx({t:'noRecruit',txt:x.city.name+': sem recrutamento (quarentena)'});x.fx({t:'price',p:{mul:1.5,sel:'heal'},txt:x.city.name+': curas e remédios +50% (quarentena)'})}},
    {k:'C',label:'Esperar que passe',type:'debuff',cool:5,eff:c=>'Por '+POL.dur+' rodadas, só em '+c.name+': caravanas dela destruídas e sem novas; sem curar nem comprar remédios; os soldados que você recrutou morrem e não se recruta mais; humor Descontente (um passo na direção da rebelião); sem produção nem imposto; se for porto, ele para.',
      apply:x=>{
        const c=x.city,rd=STATE.rd,e=ec(c);
        if(rd.routes.some(r=>r.a===c.id||r.b===c.id)){rd.routes=rd.routes.filter(r=>r.a!==c.id&&r.b!==c.id);rebuildCaravans();computeBuffs()}
        let dead=0;for(const a of ALLIES)if(a.alive){a.alive=false;a.deadT=0;dead++}
        for(const t of['noRoute','noHeal','noRecruit','noProd','noTax'])x.fx({t,txt:c.name+': '+({noRoute:'sem caravanas',noHeal:'sem cura nem remédios',noRecruit:'sem recrutamento',noProd:'sem produção'+(e.type==='port'?' (porto parado)':''),noTax:'sem imposto'})[t]+' (epidemia)'});
        e.mood='upset';e.ups=(e.ups||0)+1;
        if(dead)x.toast('☠ '+dead+' soldado(s) seu(s) morreram na epidemia.',4500);
        if(e.ups>=ECON.rebelUps&&!c.home){STATE.rd.report.push('🔥 '+c.name+' SE REBELOU por causa da epidemia!');rebelCity(c)}
      }}
  ]});

// ---------- Etapa 2 da 4C: rebelião e traição de um oficial ----------
definePolicy({id:'rebeliao',name:'Rebelião',city:true,cool:2,
  cityOk:c=>!c.home&&((ec(c).ups||0)>=1)&&!ec(c).press,   // cidade sua (menos a capital) que já está descontente por falta de suprimentos
  text:c=>'Nas ruas de '+c.name+', o descontentamento virou fúria. Panelas batem, portas são trancadas e uma multidão cerca a prefeitura exigindo pão e respostas. Se nada for feito, a revolta vai tomar a cidade inteira.',
  options:[
    {k:'A',label:'Importar suprimentos e suspender os impostos',type:'debuff',cost:{gold:150},eff:c=>'−◉150. '+c.name+' fica sem imposto por '+POL.dur+' rodadas. O descontentamento zera.',
      apply:x=>{const e=ec(x.city);e.ups=0;e.mood='ok';e.joyAdj=0;x.fx({t:'noTax',txt:x.city.name+': sem imposto (anistia)'})}},
    {k:'B',label:'Reprimir com os soldados',type:'both',eff:c=>c.name+' não se rebela e não perde os impostos. Em compensação, as necessidades sobem 50% a cada rodada (sem sorteio de necessidades), até 300%. Se dois recursos chegarem a 300%, os oficiais se juntam aos rebeldes e a cidade se rebela. Suprindo tudo numa rodada, a repressão acaba e as necessidades voltam ao valor anterior.',
      apply:x=>{ec(x.city).press={n:0}}},
    {k:'C',label:'Esperar que o povo se acalme',type:'neutral',eff:()=>'Nada muda. A contagem de descontentamento continua.'}
  ]});

definePolicy({id:'traicao',name:'Traição de um oficial',city:true,cool:4,
  cond:()=>allyCount()>=1,
  text:c=>'Na guarnição de '+c.name+', um oficial foi pego desviando soldos e vendendo informações. A tropa está dividida: uns pedem justiça, outros dizem que ele tem mais amigos do que parece. Todo o seu exército espera para ver como o governante vai agir, e o povo de '+c.name+' acompanha cada passo.',
  options:[
    {k:'A',label:'Punir o oficial',type:'both',eff:c=>'Perde metade dos soldados que recrutou, mas a felicidade de '+c.name+' sobe 1.',
      apply:x=>{const live=ALLIES.filter(a=>a.alive),n=Math.ceil(live.length/2);for(let i=0;i<n;i++){live[i].alive=false;live[i].deadT=0}
        joyShift(x.city,1);x.toast('⚖ '+n+' soldado(s) foram expulsos; '+x.city.name+' ficou mais feliz.')}},
    {k:'B',label:'Perdoar publicamente',type:'both',eff:c=>'Melhorar soldados custa 20% menos e recrutar custa 20% mais por '+POL.dur+' rodadas. O descontentamento de '+c.name+' sobe 1 (não afeta a contagem de rebelião).',
      apply:x=>{x.fx({c:-1,t:'price',p:{mul:0.8,sel:'soldierup'},txt:'Melhorar soldados −20% (perdão ao oficial)'});x.fx({c:-1,t:'price',p:{mul:1.2,sel:'recruit'},txt:'Recrutar soldados +20% (perdão ao oficial)'});joyShift(x.city,-1)}},
    {k:'C',label:'Fingir que nada aconteceu',type:'debuff',eff:c=>'Perde 30% do ouro armazenado (cofre dos armazéns) e o descontentamento de '+c.name+' sobe 1 (não afeta a contagem de rebelião).',
      apply:x=>{const sh=shOf(),l=Math.floor(sh.vault*0.3);sh.vault-=l;joyShift(x.city,-1);x.toast('💸 O oficial levou ◉'+l+' do cofre.')}}
  ]});

// ---------- Etapa 3 da 4C: raid de bandidos em ondas ----------
// poder dos seus soldados (3 por soldado, × melhorias de dano e vida, × colete) contra o das 3 ondas somadas (5+10+15 = 30 bandidos, +10% por nível da cidade acima de 1)
function polRaidCalc(c){
  const n=allyCount(),dm=1+0.25*ARMY.dmg,hm=1+0.15*ARMY.hp,vm=ARMY.vest?1.15:1;
  const sp=Math.round(n*3*dm*hm*vm*10)/10,bp=Math.round(30*(1+0.1*(Math.max(1,c.rank||1)-1))*10)/10;
  return{n,dm,hm,vm,sp,bp,win:sp>=bp};
}
definePolicy({id:'raid',name:'Raid de bandidos',city:true,cool:3,
  text:c=>'Vigias acenderam os fogos de alarme: uma horda de bandidos avança sobre '+c.name+'. Eles chegam por vários portões, em ondas, querendo os celeiros, o cofre e o que mais conseguirem carregar.',
  options:[
    {k:'A',label:'Liderar a defesa',type:'both',eff:c=>'No início do turno do Comandante você é levado a '+c.name+' e enfrenta 3 ondas (5, 10 e 15 bandidos, por 1, 2 e 3 entradas) com 30 s de intervalo. Vencendo: ◉'+(40+30*Math.max(1,c.rank||1))+'. Perdendo (morrer): −◉120 e −15% dos suprimentos do armazém, e a cidade pega fogo.',
      onStart:x=>{if(!startRaid(x.city,{teleport:true}))x.toast('Não foi possível iniciar a defesa agora.',3000)}},
    {k:'B',label:'Pagar tributo aos bandidos',type:'debuff',cost:{gold:100},eff:()=>'−◉100. O ataque não acontece.'},
    {k:'C',label:'Confiar nos soldados',type:'neutral',eff:c=>'Mostra o resumo da batalha antes de confirmar. Se os soldados vencerem, nada muda; se perderem: −15% dos suprimentos do armazém e fumaça por '+SMOKE_DAYS+' dias.',
      preview:x=>{const r=polRaidCalc(x.city);
        return '<p>Seus soldados: <b>'+r.n+'</b> (poder <b>'+r.sp+'</b>) — dano ×'+r.dm.toFixed(2)+', vida ×'+r.hm.toFixed(2)+(r.vm>1?', colete ×1,15':'')+'<br>Bandidos: <b>30</b> em 3 ondas (poder <b>'+r.bp+'</b>)</p>'
          +'<p style="font-size:18px;color:'+(r.win?'#9fe89f':'#ff8a8a')+'"><b>'+(r.win?'✔ Seus soldados vencem a batalha. Nada muda.':'✖ Seus soldados perdem: a cidade será saqueada (−15% dos suprimentos e fumaça).')+'</b></p>'
          +'<p class="ldsm">Cálculo feito agora: recrutar ou melhorar soldados antes de confirmar muda o resultado.</p>'},
      apply:x=>{const r=polRaidCalc(x.city);
        if(r.win)x.toast('🛡 Seus soldados repeliram o ataque a '+x.city.name+'.',4500);
        else{const lost=raidLoss(x.city);igniteCity(x.city);x.toast('🔥 Os soldados perderam: '+x.city.name+' foi saqueada'+(lost.length?' ('+lost.join(', ')+')':'')+' e pegou fogo.',6000)}}}
  ]});

// ---------- Etapa 3 da 4C: ataque às caravanas ----------
// fx 'routeProd' (+2 por rodada para cada cidade sua da rota) é pago no gancho de fim de rodada, no início deste arquivo
const polRouteOf=d=>d&&STATE.rd.routes.find(r=>(r.a===d.a&&r.b===d.b)||(r.a===d.b&&r.b===d.a));
const polRouteName=d=>WORLD.cities[d.a].name+' e '+WORLD.cities[d.b].name;
definePolicy({id:'caravanas',name:'Ataque às caravanas',city:false,
  cond:()=>STATE.rd.routes.length>0&&typeof CARAVANS!=='undefined'&&CARAVANS.length>0,
  data:rng=>{const r=rng.pick(STATE.rd.routes);return{a:r.a,b:r.b}},
  text:(c,d)=>'Os guardas da estrada voltaram feridos, sem carga e sem metade dos homens. Bandidos emboscaram uma de suas caravanas entre '+polRouteName(d)+', e os comerciantes juram que não voltam à estrada sem proteção.',
  options:[
    {k:'A',label:'Pagar o resgate da carga',type:'debuff',cost:{gold:100},eff:()=>'−◉100. A rota continua funcionando.'},
    {k:'B',label:'Limpar a estrada',type:'both',cost:{gold:120},eff:()=>'−◉120. No início do turno do Comandante você é levado à caravana: os bandidos saem dela em 3 ondas de 3, 6 e 9. Vencendo, a rota rende +2 unidades do produto por rodada por '+POL.dur+' rodadas. Se você morrer, a rota é desfeita.',
      onStart:x=>{
        const d=x.data,route=polRouteOf(d);if(!route){x.toast('A rota já não existe.',3000);return}
        const ok=startCaravanBattle(route,{
          onWin:()=>{x.fx({t:'routeProd',c:-1,p:{a:d.a,b:d.b,add:2},txt:'Rota '+polRouteName(d)+': +2 do produto por rodada (estrada limpa)'});x.toast('🛡 Estrada limpa! A rota vai render mais por '+POL.dur+' rodadas.',5000)},
          onLose:()=>{const rt=polRouteOf(d);if(rt){STATE.rd.routes.splice(STATE.rd.routes.indexOf(rt),1);rebuildCaravans();computeBuffs()}x.toast('☠ A caravana foi perdida: a rota entre '+polRouteName(d)+' foi desfeita.',5000)}});
        if(!ok)x.toast('Não foi possível iniciar a emboscada agora.',3000);
      }},
    {k:'C',label:'Desfazer a rota',type:'debuff',eff:(c,d)=>'A rota entre '+polRouteName(d)+' é desfeita, sem reembolso. Nada mais é cobrado.',
      apply:x=>{const rt=polRouteOf(x.data);if(rt){STATE.rd.routes.splice(STATE.rd.routes.indexOf(rt),1);rebuildCaravans();computeBuffs()}}}
  ]});

// ---------- Etapa 3 da 4C: dungeon dourada ----------
definePolicy({id:'dourada',name:'Dungeon dourada',city:true,cool:6,
  cond:()=>DG.ok&&goldenPortals().length===0,
  text:c=>'Um brilho dourado surgiu num portal de pedra perto de '+c.name+'. Dizem que lá dentro o chão sangra ouro. A notícia correu mais rápido que o vento, e tropas de várias cidades e bandos de bandidos já se encaminham para disputar a entrada.',
  options:[
    {k:'A',label:'Explorar a dungeon',type:'buff',eff:c=>'Um portal dourado aparece no mapa perto de '+c.name+' e fica lá até você pegar o tesouro (+◉'+GOLD_PORTAL_AMT+', sem itens). Vá quando quiser no turno do Comandante. Ao chegar perto, 10 tropas (bandidos e soldados de duas cidades) lutam pelo portal contra você e entre si; isso não é guerra.',
      apply:x=>{const p=spawnGoldenPortal(x.city);
        if(p)x.toast('✨ Um portal dourado surgiu perto de '+x.city.name+'. Siga a coluna de luz dourada!',5000);
        else{x.gold(150);x.toast('Não havia espaço para o portal dourado: os aventureiros pagaram ◉150 pelo mapa.',5000)}}},
    {k:'B',label:'Contratar mineradores e soldados',type:'both',cost:{gold:150},eff:c=>'−◉150. +◉50 por rodada durante '+POL.dur+' rodadas. A necessidade de comida de '+c.name+' sobe 100% no mesmo período.',
      apply:x=>{x.fx({t:'gold',c:-1,p:{add:50},txt:'Mineradores contratados (dungeon dourada)'});x.fx({t:'need',p:{mul:2,sel:'food'},txt:'Necessidade de comida +100% em '+x.city.name+' (mineradores e soldados)'})}},
    {k:'C',label:'Deixar para depois',type:'neutral',eff:()=>'Nada muda.'}
  ]});

// linha curta no HUD: política da rodada e efeitos ativos (com a rodada em que terminam)
function polHud(){
  const P=STATE.pol;if(!P||!P.log)return '';
  const last=P.log[P.log.length-1];let t='';
  if(P.pending){const d=POL.byId[P.pending.pid];t='📜 Política a decidir: '+(d?d.name:'')}
  else if(last&&last.round===STATE.round&&POL.byId[last.pid])t='📜 '+POL.byId[last.pid].name+' ('+last.k+')';
  const n=P.fx.length;
  if(n)t+=(t?' • ':'📜 ')+n+' efeito'+(n>1?'s':'')+' ativo'+(n>1?'s':'')+' (até a rodada '+Math.max(...P.fx.map(f=>STATE.round+f.left-1))+'; detalhes no livro, B)';
  return t?'<br><small>'+t+'</small>':'';
}
