'use strict';
// ---------- F5a: eventos entre as facções NPC (independentes do jogador) e a mediação ----------
// A cada rodada há FEV.chance de acontecer UM evento entre facções NPC (disputa, ajuda, incidente, acordo, festival, casamento, espião/crise, sabotagem,
// expedição, suborno de caravana). Cada evento mexe na relação do par (grafo da F3, fgSet) e, às vezes, no suprimento, nas caravanas ou no mundo.
// Cada evento vira uma linha no relatório da rodada atual (Resumo do livro, STATE.rd.now), sem notificação na tela. A mediação é a exceção: vira um cartão de política no turno do líder.
// Regras: relação NPC–NPC vai de 0 a 9 (10 = aliança formal, que os eventos não criam); o mesmo par só muda de novo depois de FEV.pairCool rodadas;
// casamento trava a relação do par (sem quedas) por FEV.lock rodadas. Desenho em docs/fase-5-eventos.md.
const FEV={chance:0.35,pairCool:3,max:9,lock:4,crisis:0.5,
  hit:{sab:0.25,crisis:0.35,left:2},   // sabotagem e crise tiram suprimento da vítima por 2 rodadas (fsupHit)
  campR:170,                           // expedição: acampamento de bandidos a até 170 blocos das facções
  medChance:0.2,med:{gold:600,up:3,rel:1,side:1}};   // mediação: chance por rodada de aparecer, custo, ganho do par, ganho/perda sua com cada lado
Hooks.on('resetState',()=>{STATE.fev={pair:{},lock:{},med:null}});
const fevS=()=>STATE.fev||(STATE.fev={pair:{},lock:{},med:null});
const fevOk=(a,b)=>{const r=fevS().pair[fgKey(a,b)];return r===undefined||STATE.round-r>=FEV.pairCool};
const fevLocked=(a,b)=>(fevS().lock[fgKey(a,b)]||-1)>=STATE.round;
function fevNews(t){rdNow(t);STATE.rd.fevLast=t}   // vai para o relatório da rodada atual (sem notificação na tela)
function fevRel(a,b,d,why){   // muda a relação do par (0 a 9) e marca o intervalo; quedas não valem para um par travado (casamento)
  if(d<0&&fevLocked(a,b))return 0;
  const old=fgV(a,b),v=Math.max(0,Math.min(FEV.max,old+d));fgSet(a,b,v,why);fevS().pair[fgKey(a,b)]=STATE.round;return v-old;
}
const fevFacs=()=>(WORLD.factions||[]).filter(f=>facCities(f.id).length);
const fevNb=(a,b)=>{const C=fgCache();return C.near[a]===b||C.near[b]===a};
const fevPick=l=>l[Math.floor(Math.random()*l.length)];
const fevTxt=(arr,...a)=>fevPick(arr)(...a);
const fevName=id=>fgChipName(id);
const fevRes=r=>resName(r).toLowerCase();
const fevShort=id=>NEEDS.filter(r=>fsupState(id,r)==='short'),fevAbund=id=>NEEDS.filter(r=>fsupState(id,r)==='abund');
const fevAggr=id=>facOf(id).temper==='agressiva';
function fevPairs(fn){const fs=fevFacs(),out=[];for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++){const a=fs[i].id,b=fs[j].id;if(fevOk(a,b)){const c=fn(a,b);if(c)out.push(c)}}return out}
const fevSetSup=(id,r,st)=>{const f=STATE.rd.fsup||(STATE.rd.fsup={});(f[id]||(f[id]={}))[r]=st};   // (modo criativo) força o estado de suprimento
const fevRoutes=()=>fgRoutes();   // rotas entre NPC (cria a lista se não existir)
const fevFreeCity=f=>facCities(f).filter(c=>c.owner!=='player'&&!c.rebel&&ec(c)&&!hasRoute(c)&&!polFlag('noRoute',c.id));
const fevPos=f=>{const cs=facCities(f);return[cs.reduce((s,c)=>s+c.cx,0)/cs.length,cs.reduce((s,c)=>s+c.cz,0)/cs.length]};

// ---------- os eventos ----------
// cand(): lista de contextos possíveis agora • run(ctx): aplica e escreve a notícia • fix(): (modo criativo) arruma o mundo para o evento poder acontecer
const FEV_DEFS=[
  {id:'disputa',name:'Disputa por recurso',w:3,
    cand:()=>fevPairs((a,b)=>{if(!fevNb(a,b)||fevLocked(a,b)||fgV(a,b)<1)return null;for(const r of NEEDS){if(fevShort(a).includes(r)&&fevAbund(b).includes(r))return{a,b,r};if(fevShort(b).includes(r)&&fevAbund(a).includes(r))return{a:b,b:a,r}}return null}),
    run:c=>{fevRel(c.a,c.b,-2,'disputa por '+fevRes(c.r));const R=fevRes(c.r);
      fevNews(fevTxt([(A,B)=>A+' acusa '+B+' de guardar '+R+' enquanto o seu povo passa necessidade. A relação entre as duas esfriou.',(A,B)=>'Embaixadores de '+A+' deixaram a mesa de '+B+' depois de uma discussão sobre '+R+'.',(A,B)=>'Faltou '+R+' em '+A+'; sobrou em '+B+'. A recusa em dividir azedou a vizinhança.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const p=fevPairs((a,b)=>fevNb(a,b)?{a,b}:null)[0]||fevPairs((a,b)=>({a,b}))[0];if(!p)return;fevSetSup(p.a,'food','short');fevSetSup(p.b,'food','abund');if(fgV(p.a,p.b)<3)fgSet(p.a,p.b,4,'criativo')}},
  {id:'ajuda',name:'Ajuda em desastre',w:2,
    cand:()=>{const out=[];for(const x of fevFacs())for(const y of fevFacs()){if(x===y||!fevOk(x.id,y.id)||fgV(x.id,y.id)<=FG.rivalMax)continue;const sh=fevShort(x.id);if(sh.length<2)continue;const r=sh.find(q=>fevAbund(y.id).includes(q));if(r)out.push({a:x.id,b:y.id,r})}return out},
    run:c=>{fevRel(c.a,c.b,2,'ajuda em desastre');const R=fevRes(c.r);
      fevNews(fevTxt([(A,B)=>B+' enviou carroças de '+R+' a '+A+', que atravessava dias difíceis. Os dois povos ficaram mais próximos.',(A,B)=>A+' agradeceu publicamente a '+B+' pelo '+R+' que chegou a tempo.',(A,B)=>'Com os celeiros vazios, '+A+' recebeu socorro de '+B+': '+R+' sem cobrança.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const fs=fevFacs();if(fs.length<2)return;const a=fs[0].id,b=fs[1].id;fevSetSup(a,'food','short');fevSetSup(a,'ore','short');fevSetSup(b,'food','abund');if(fgV(a,b)<=FG.rivalMax)fgSet(a,b,5,'criativo');delete fevS().pair[fgKey(a,b)]}},
  {id:'incidente',name:'Incidente de fronteira',w:2,
    cand:()=>fevPairs((a,b)=>fevNb(a,b)&&(fevAggr(a)||fevAggr(b))&&!fevLocked(a,b)&&fgV(a,b)>=1?{a:fevAggr(a)?a:b,b:fevAggr(a)?b:a}:null),
    run:c=>{fevRel(c.a,c.b,-(1+Math.floor(Math.random()*2)),'incidente de fronteira');
      fevNews(fevTxt([(A,B)=>'Soldados de '+A+' cruzaram a divisa de '+B+' e houve troca de tiros. Ninguém declarou guerra, mas o clima azedou.',(A,B)=>'Uma patrulha de '+A+' foi flagrada em terras de '+B+'. Protestos dos dois lados.',(A,B)=>'Escaramuça na estrada entre '+A+' e '+B+': cada uma culpa a outra.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const p=fevPairs((a,b)=>fevNb(a,b)?{a,b}:null)[0];if(!p)return;facOf(p.a).temper='agressiva'}},
  {id:'acordo',name:'Acordo comercial',w:2,
    cand:()=>{const rs=fevRoutes().filter(r=>WORLD.cities[r.a].fid!==WORLD.cities[r.b].fid),out=[];for(const r of rs){const a=WORLD.cities[r.a].fid,b=WORLD.cities[r.b].fid,v=fgV(a,b);if(fevOk(a,b)&&v>=4&&v<FEV.max)out.push({a,b})}return out},
    run:c=>{fevRel(c.a,c.b,1,'acordo comercial');
      fevNews(fevTxt([(A,B)=>'Os mercadores de '+A+' e '+B+' fecharam um acordo que facilita as caravanas entre as duas.',(A,B)=>A+' e '+B+' assinaram um tratado de comércio: menos taxas, mais carroças.',(A,B)=>'A rota entre '+A+' e '+B+' rendeu bem e os dois governos decidiram firmar a parceria.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const fs=fevFacs();if(fs.length<2)return;const A=fevFreeCity(fs[0].id)[0],B=fevFreeCity(fs[1].id)[0];if(!A||!B)return;fevRoutes().push({a:A.id,b:B.id,npc:true});if(typeof rebuildCaravans==='function')rebuildCaravans();const v=fgV(fs[0].id,fs[1].id);if(v<4||v>=FEV.max)fgSet(fs[0].id,fs[1].id,5,'criativo');delete fevS().pair[fgKey(fs[0].id,fs[1].id)]}},
  {id:'festival',name:'Festival',w:2,
    cand:()=>fevPairs((a,b)=>fevNb(a,b)&&fgV(a,b)>=4&&fgV(a,b)<FEV.max?{a,b}:null),
    run:c=>{fevRel(c.a,c.b,1,'festival');
      fevNews(fevTxt([(A,B)=>'Um festival de colheita reuniu gente de '+A+' e '+B+' na fronteira: música, comida e promessas de amizade.',(A,B)=>'Feira e torneio entre '+A+' e '+B+' terminaram em brindes.',(A,B)=>'As cidades de '+A+' e '+B+' celebraram juntas o fim do inverno.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const p=fevPairs((a,b)=>fevNb(a,b)?{a,b}:null)[0];if(p&&(fgV(p.a,p.b)<4||fgV(p.a,p.b)>=FEV.max))fgSet(p.a,p.b,5,'criativo')}},
  {id:'casamento',name:'Casamento',w:0.6,
    cand:()=>fevPairs((a,b)=>fgV(a,b)>=8&&fgV(a,b)<FEV.max?{a,b}:null),
    run:c=>{fevRel(c.a,c.b,2,'casamento');fevS().lock[fgKey(c.a,c.b)]=STATE.round+FEV.lock;
      fevNews(fevTxt([(A,B)=>'Casamento entre as casas de '+A+' e '+B+': as duas facções juram amizade e prometem não brigar tão cedo.',(A,B)=>'O filho do governante de '+A+' casou-se com uma nobre de '+B+'. Festa de três dias.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const fs=fevFacs();if(fs.length<2)return;fgSet(fs[0].id,fs[1].id,8,'criativo');delete fevS().pair[fgKey(fs[0].id,fs[1].id)]}},
  {id:'espiao',name:'Espião (descoberto ou crise)',w:2,
    cand:()=>fevPairs((a,b)=>(fgV(a,b)<=5||fevAggr(a)||fevAggr(b))&&!fevLocked(a,b)?{a:fevAggr(b)&&!fevAggr(a)?b:a,b:fevAggr(b)&&!fevAggr(a)?a:b}:null),
    run:c=>{
      if(Math.random()<FEV.crisis){   // o espião provoca uma crise interna na vítima: mais descontentamento e menos suprimento por 2 rodadas (pode virar rebelião)
        let n=0;for(const x of facCities(c.b))if(x.owner!=='player'&&!x.rebel&&ec(x)){ec(x).ups=(ec(x).ups||0)+1;n++}
        fsupHit(c.b,FEV.hit.crisis,FEV.hit.left);fevS().pair[fgKey(c.a,c.b)]=STATE.round;
        fevNews(fevTxt([(A,B)=>'Boatos e panfletos tomaram as ruas de '+B+': dizem que um agente de '+A+' semeou a discórdia. A população está inquieta.',(A,B)=>'Uma crise política abalou '+B+' depois que um espião de '+A+' espalhou denúncias de corrupção.'],fevName(c.a),fevName(c.b)));
      }else{
        fevRel(c.a,c.b,-2,'espião descoberto');
        fevNews(fevTxt([(A,B)=>'A guarda de '+B+' prendeu um espião de '+A+'. O escândalo esfriou as relações.',(A,B)=>'Um agente de '+A+' foi flagrado nos arquivos de '+B+'. '+A+' nega tudo.'],fevName(c.a),fevName(c.b)));
      }},
    fix:()=>{const p=fevPairs((a,b)=>({a,b}))[0];if(p&&fgV(p.a,p.b)>5)fgSet(p.a,p.b,4,'criativo')}},
  {id:'sabotagem',name:'Sabotagem de suprimento',w:1.5,
    cand:()=>{const out=[];for(const x of fevFacs())for(const y of fevFacs()){if(x===y||!fevAggr(x.id)||!fevOk(x.id,y.id)||fevLocked(x.id,y.id)||!fevNb(x.id,y.id)||fgV(x.id,y.id)<1)continue;const r=fevAbund(y.id)[0];if(r)out.push({a:x.id,b:y.id,r})}return out},
    run:c=>{fevRel(c.a,c.b,-2,'sabotagem');fsupHit(c.b,FEV.hit.sab,FEV.hit.left);const R=fevRes(c.r);
      fevNews(fevTxt([(A,B)=>'Os armazéns de '+R+' de '+B+' pegaram fogo numa noite suspeita. '+B+' aponta o dedo para '+A+'.',(A,B)=>'Saqueadores sem bandeira destruíram a colheita de '+B+'. Todos suspeitam de '+A+'.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const a=fevFacs().find(f=>f.temper!=='agressiva')||fevFacs()[0];if(!a)return;a.temper='agressiva';const p=fevFacs().find(f=>f!==a&&fevNb(a.id,f.id))||fevFacs().find(f=>f!==a);if(!p)return;fevSetSup(p.id,'food','abund');if(fgV(a.id,p.id)<2)fgSet(a.id,p.id,4,'criativo');delete fevS().pair[fgKey(a.id,p.id)]}},
  {id:'expedicao',name:'Expedição contra bandidos',w:1,
    cand:()=>fevPairs((a,b)=>{if(!fevNb(a,b)||fgV(a,b)<4||fgV(a,b)>=FEV.max)return null;const pa=fevPos(a),pb=fevPos(b),mx=(pa[0]+pb[0])/2,mz=(pa[1]+pb[1])/2;let best=null,bd=FEV.campR;for(const k of WORLD.camps)if(!k.gone&&!k.questTarget){const d=Math.hypot(k.cx-mx,k.cz-mz);if(d<bd){bd=d;best=k}}return best?{a,b,camp:best}:null}),
    run:c=>{fevRel(c.a,c.b,1,'expedição conjunta');despawnCamp(c.camp);
      fevNews(fevTxt([(A,B)=>'Soldados de '+A+' e '+B+' marcharam juntos contra um bando de bandidos e limparam a região. Um acampamento deixou de existir.',(A,B)=>A+' e '+B+' uniram forças para caçar salteadores: a estrada ficou mais segura.'],fevName(c.a),fevName(c.b)))},
    fix:()=>{const p=fevPairs((a,b)=>fevNb(a,b)?{a,b}:null)[0];if(p&&(fgV(p.a,p.b)<4||fgV(p.a,p.b)>=FEV.max))fgSet(p.a,p.b,5,'criativo')}},
  {id:'suborno',name:'Suborno de caravana',w:1.5,
    cand:()=>{const out=[];for(const r of fevRoutes()){const A=WORLD.cities[r.a],B=WORLD.cities[r.b];if(!A||!B||A.fid===B.fid||A.owner==='player'||B.owner==='player')continue;
      for(const [Cx,Cy] of[[A,B],[B,A]])for(const z of fevFacs()){if(z.id===Cx.fid||z.id===Cy.fid)continue;
        const Cz=fevFreeCity(z.id).find(q=>focusOf(q)!==focusOf(Cx));if(!Cz||fgV(z.id,Cx.fid)<1||!fevOk(Cx.fid,Cy.fid)||!fevOk(z.id,Cx.fid))continue;   // Z precisa de uma cidade livre, com foco diferente, e relação possível com X
        out.push({r,X:Cx.fid,Y:Cy.fid,Z:z.id,Cx,Cz})}}return out},
    run:c=>{
      const R=fevRoutes(),i=R.indexOf(c.r);if(i>=0)R.splice(i,1);R.push({a:c.Cx.id,b:c.Cz.id,npc:true});if(typeof rebuildCaravans==='function')rebuildCaravans();
      fevRel(c.Z,c.X,2,'suborno de caravana');fevRel(c.X,c.Y,-2,'caravana desfeita');fevRel(c.Z,c.Y,-2,'suborno de caravana');
      fevNews(fevTxt([(X,Y,Z)=>Z+' pagou uma pequena fortuna a '+X+' para romper o acordo de caravanas com '+Y+' e abrir uma rota própria. '+Y+' não esqueceu a afronta.',(X,Y,Z)=>'Ouro de '+Z+' mudou o rumo das carroças de '+X+': a rota com '+Y+' acabou e uma nova com '+Z+' começou.'],fevName(c.X),fevName(c.Y),fevName(c.Z)));},
    fix:()=>{
      const fs=fevFacs();if(fs.length<3)return;const[X,Y,Z]=fs;
      const A=fevFreeCity(X.id)[0],B=fevFreeCity(Y.id)[0];if(!A||!B)return;
      const R=fevRoutes();if(!R.some(r=>(r.a===A.id&&r.b===B.id)||(r.a===B.id&&r.b===A.id)))R.push({a:A.id,b:B.id,npc:true});
      if(!fevFreeCity(Z.id).length){const k=facCities(Z.id).find(c=>c.owner!=='player');for(let i=R.length-1;i>=0;i--)if(R[i].a===k.id||R[i].b===k.id)R.splice(i,1)}
      if(typeof rebuildCaravans==='function')rebuildCaravans();for(const[a,b]of[[X,Y],[Z,X],[Z,Y]])delete fevS().pair[fgKey(a.id,b.id)]}},
];
// ---------- por rodada ----------
function fevRound(){
  if(STATE.round<1||!WORLD.factions||WORLD.factions.length<2)return;
  if(Math.random()<FEV.chance){
    const opts=FEV_DEFS.map(d=>({d,c:d.cand()})).filter(x=>x.c.length);
    if(opts.length){const tot=opts.reduce((s,x)=>s+x.d.w,0);let r=Math.random()*tot,pick=opts[0];for(const x of opts){r-=x.d.w;if(r<=0){pick=x;break}}pick.d.run(fevPick(pick.c))}
  }
  fevMedRoll();
}
Hooks.on('round',fevRound);
// modo criativo: força um evento (se as condições faltam, o jogo as arruma) ou o sorteio normal
function fevForce(id){
  const d=FEV_DEFS.find(x=>x.id===id);if(!d)return 'Evento desconhecido.';
  if(!WORLD.factions||WORLD.factions.length<2)return 'São precisas ao menos 2 facções NPC.';
  fevS().pair={};
  let c=d.cand();if(!c.length&&d.fix){d.fix();c=d.cand()}
  if(!c.length)return id==='expedicao'?'Não há acampamento de bandidos perto das facções.':'Não deu para montar as condições deste evento.';
  d.run(fevPick(c));return null;
}

// ---------- mediação: cartão do líder ----------
// Duas facções NPC rivais (relação ≤ 3) podem pedir a sua mediação. O cartão aparece no turno do líder (rollPolicy → fevMedCard) e precisa ser decidido.
function fevMedRoll(){
  const S=fevS();if(S.med||Math.random()>=FEV.medChance)return;
  const rv=fevPairs((a,b)=>fgV(a,b)<=FG.rivalMax&&fgV(a,b)>=1?{a,b}:null);   // rivais, mas ainda sem guerra
  if(rv.length){const p=fevPick(rv);S.med={a:p.a,b:p.b,round:STATE.round}}
}
function fevMedCard(){
  const m=fevS().med;if(!m)return null;
  if(fgV(m.a,m.b)>FG.rivalMax||!facCities(m.a).length||!facCities(m.b).length){fevS().med=null;return null}   // já não são rivais (ou uma acabou)
  return{pid:'mediacao',city:-1,round:STATE.round,data:{a:m.a,b:m.b}};
}
const fevMedDone=(x,line)=>{fevS().med=null;fevNews(line);};   // sem toast extra: o cartão já mostra a notificação padrão de política
definePolicy({id:'mediacao',name:'Mediação',city:false,noRoll:true,flex:true,cool:0,cond:()=>false,
  text:(c,d)=>facOf(d.a).name+' e '+facOf(d.b).name+' estão à beira de romper de vez. Embaixadores dos dois lados pedem que você interfira antes que a briga vire guerra.',
  options:[
    {k:'A',label:'Mediar o conflito',type:'buff',cost:{gold:FEV.med.gold},
      eff:(c,d)=>'Paga ◉'+FEV.med.gold+'. A relação entre as duas sobe +'+FEV.med.up+' e a sua relação com cada uma sobe +'+FEV.med.rel+'.',
      apply:x=>{const d=x.data;fevRel(d.a,d.b,FEV.med.up,'mediação sua');relChange(d.a,FEV.med.rel);relChange(d.b,FEV.med.rel);
        fevMedDone(x,'Você mediou o conflito entre '+fevName(d.a)+' e '+fevName(d.b)+': as duas voltaram a conversar.')}},
    {k:'B',label:(c,d)=>'Tomar o partido de '+facOf(d.a).name,type:'both',
      eff:(c,d)=>'Sua relação com '+facOf(d.a).name+' sobe +'+FEV.med.side+' e com '+facOf(d.b).name+' cai '+FEV.med.side+'. A rivalidade das duas aumenta (−1).',
      apply:x=>{const d=x.data;relChange(d.a,FEV.med.side);relChange(d.b,-FEV.med.side);fevRel(d.a,d.b,-1,'você apoiou '+facOf(d.a).name);
        fevMedDone(x,'Você tomou o partido de '+fevName(d.a)+' contra '+fevName(d.b)+'.')}},
    {k:'C',label:(c,d)=>'Tomar o partido de '+facOf(d.b).name,type:'both',
      eff:(c,d)=>'Sua relação com '+facOf(d.b).name+' sobe +'+FEV.med.side+' e com '+facOf(d.a).name+' cai '+FEV.med.side+'. A rivalidade das duas aumenta (−1).',
      apply:x=>{const d=x.data;relChange(d.b,FEV.med.side);relChange(d.a,-FEV.med.side);fevRel(d.a,d.b,-1,'você apoiou '+facOf(d.b).name);
        fevMedDone(x,'Você tomou o partido de '+fevName(d.b)+' contra '+fevName(d.a)+'.')}},
    {k:'D',label:'Não me meter',type:'neutral',eff:()=>'Nada muda: o conflito segue o rumo natural.',
      apply:x=>{fevS().med=null}},
  ]});

// ---------- modo criativo ----------
function fevCheatHtml(){
  const m=fevS().med,last=STATE.rd.fevLast;
  return '<h4 style="margin:12px 0 4px">Eventos entre facções NPC</h4><small>Chance por rodada: '+Math.round(FEV.chance*100)+'% • último evento: '+(last?last.replace(/<[^>]+>/g,''):'—')+(m?' • mediação na fila: '+facOf(m.a).name+' × '+facOf(m.b).name:'')+'</small><br>'
    +FEV_DEFS.map(d=>'<button class="alt" data-fev="'+d.id+'" style="margin:2px">'+d.name+'</button>').join('')
    +'<br><button class="alt" data-fev="_roll" style="margin:2px">🎲 Sortear agora (normal)</button><button class="alt" data-fev="_med" style="margin:2px">🤝 Mediação no próximo turno do líder</button>';
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-fev]');if(!b)return;
  const k=b.dataset.fev;let msg=null;
  if(k==='_roll'){const n=(STATE.rd.now||[]).length,ch=FEV.chance;FEV.chance=1;fevRound();FEV.chance=ch;msg=(STATE.rd.now||[]).length>n?null:'Nenhum evento possível agora.'}
  else if(k==='_med'){const rv=fevPairs((a,b)=>({a,b}));if(!rv.length)msg='Sem par disponível.';else{const p=fevPick(rv);if(fgV(p.a,p.b)>FG.rivalMax)fgSet(p.a,p.b,2,'criativo');fevS().med={a:p.a,b:p.b,round:STATE.round};msg=null;toast('🤝 Mediação na fila: aparece no turno do líder.',3500)}}
  else msg=fevForce(k);
  if(msg)toast(msg,3500);   // sem notificação de evento: o resultado aparece no relatório (livro, Resumo) e no painel
  if(typeof renderFacCheats==='function')renderFacCheats();
});
