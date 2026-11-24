'use strict';
// ---------- Teste de fumaça (Node + Playwright; só para desenvolvimento, o jogo continua sem build) ----------
// Sobe um servidor estático na raiz do projeto, abre o jogo no Chromium sem janela e verifica por JS, no próprio jogo:
// carga sem erros, POIs gerados, serviços dos POIs, binóculo, moradores na rodada seguinte e as telas da Negociação.
// Uso: cd tests && npm install && npx playwright install chromium && node smoke.js   (imprime OK/FALHA por verificação; sai com 1 se algo falhar)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.svg':'image/svg+xml','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};

function serve(){   // servidor estático mínimo (como python -m http.server), numa porta livre
  const srv=http.createServer((req,res)=>{
    const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
    if(!f.startsWith(ROOT)){res.writeHead(403);return res.end()}
    fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)});
  });
  return new Promise(r=>srv.listen(0,'127.0.0.1',()=>r(srv)));
}

let fails=0;
const report=(ok,name,why)=>{if(!ok)fails++;console.log((ok?'OK    ':'FALHA ')+name+(why?' — '+why:''))};

// abre uma URL e espera o jogo rodar; devolve a página e a lista de erros (exceções e console.error)
async function openGame(browser,base,qs){
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto(base+'/index.html?'+qs);
  await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&Array.isArray(WORLD.pois),null,{timeout:180000});
  await page.waitForTimeout(2000);   // alguns quadros do laço principal
  return{page,errs};
}
// roda fn no jogo; falha se ela lançar, devolver texto (motivo) ou se surgirem erros novos no console
async function check(g,name,fn,arg){
  const n0=g.errs.length;let why='';
  try{const r=await g.page.evaluate(fn,arg);if(typeof r==='string'&&r)why=r}catch(e){why=e.message.split('\n')[0]}
  await g.page.waitForTimeout(300);
  if(!why&&g.errs.length>n0)why='erro no console: '+g.errs.slice(n0).join(' | ').slice(0,300);
  report(!why,name,why);
}

// ---------- verificações (rodam dentro da página) ----------
const T={
  bridges:()=>{   // pontes: registro, no máximo POI_GEN.bridgeToll com pedágio, pedágio só em ponte registrada, tabuleiro em T_BRIDGE
    if(!Array.isArray(WORLD.bridges))return 'sem WORLD.bridges';
    const tolls=WORLD.pois.filter(p=>p.type==='bridge');
    if(tolls.length>POI_GEN.bridgeToll)return tolls.length+' pedágios (máximo '+POI_GEN.bridgeToll+')';
    if(WORLD.bridges.filter(b=>b.toll!==null).length!==tolls.length)return 'pedágios e registros não batem';
    for(const b of WORLD.bridges)if(!b.tiles.length||!b.tiles.some(t=>T[t.z*W+t.x]===T_BRIDGE))return 'ponte '+b.id+' sem tile T_BRIDGE';
    return '';
  },
  war:()=>{   // estado de guerra (STATE.war) e números de WAR: padrão, marcos de fadiga e save antigo
    const W=warX();if(W.fat!==0||warActive())return 'estado inicial errado';
    if(warFatigueMark(4)!==0||warFatigueMark(5)!==1||warFatigueMark(20)!==3)return 'marcos errados';
    if(warSupplyBonus(10)!==WAR.fatigue.supplyBonus[1])return 'acréscimo de suprimento errado';
    delete STATE.war;if(warX().camps===undefined)return 'warX não recriou o estado';
    const r=JSON.parse(JSON.stringify(collectSave()));if(r.v<22||!r.state.war)return 'save sem state.war';
    warApply(undefined);return warX().ops.length?'warApply não zerou':'';
  },
  warScn:()=>{   // cenário ?cenario=guerra: guerra declarada, POIs divididos (NPC com a maioria se ímpar), botão Conquistar POI
    if(!WARSCN.on)return 'cenário desligado';
    const f=WARSCN.fid,L=warPois(),a=()=>L.filter(p=>p.owner==='player').length,b=()=>L.filter(p=>p.owner===f).length;
    if(!relOf(f).war)return 'sem guerra declarada';
    if(!warActive())return 'sem campanha';
    warSplitPois(f);   // o cenário já não divide os POIs por padrão (WAR.scenario.splitPois=false): o teste divide
    if(a()!==Math.floor(L.length/2)||b()<a())return 'divisão errada: '+a()+' x '+b()+' de '+L.length;
    const a0=a(),b0=b();if(!b0)return 'inimigo sem POI';
    // frente montada pelo cenário (alvo = cidade inimiga mais perto): conquista só em ordem, a partir da sua cidade
    const ln=warFrontLine(f);if(!ln)return 'cenário não montou a frente: '+WARSCN.noFront;
    if(ln.kind!=='city'||!ln.target||ln.target.fid!==f)return 'alvo da frente não é cidade do inimigo';
    for(const p of ln.pois)poiSetOwner(p,f);
    const n=ln.pois.length,click=()=>{renderFacCheats();document.querySelector('[data-wsn="conq"]').click()};
    if(!n)return 'cadeia vazia';
    if(warFrontReleased(ln))return 'liberada sem controlar a cadeia';
    if(n>1){P.x=ln.pois[n-1].cx;P.z=ln.pois[n-1].cz;click();   // perto do último: não é adjacente, recusa
      if(ln.pois[n-1].owner==='player')return 'conquistou POI não adjacente';}
    for(let i=0;i<n;i++){
      P.x=ln.pois[i].cx;P.z=ln.pois[i].cz;click();
      if(ln.pois[i].owner!=='player')return 'não conquistou o POI '+i+' da cadeia';
      if(warFrontReleased(ln)!==(i===n-1))return 'liberação errada após '+(i+1)+' POIs';
    }
    if(!document.body.innerHTML.includes('liberada'))return 'painel não mostra a Conquista liberada';
    const wb=warBookPages().join('');   // aba Guerra do caderno
    if(!wb.includes('Guerra contra')||!wb.includes('liberada'))return 'aba Guerra não mostra a frente';
    LB.tab='guerra';renderBook();if(!document.querySelector('#ldsub [data-tab="guerra"]'))return 'aba Guerra ausente';LB.tab='resumo';
    // guerra por POI: o POI-alvo ocupa o lugar da cidade; só se conquista com a frente liberada
    const tp=warPois().find(p=>warCanTarget(f,'poi',p));
    if(tp){const r=warFrontCheck(f,'poi',tp);
      if(r.plan){warFrontBuild(r.plan);const l2=warFrontLine(f);
        if(l2.kind!=='poi'||l2.target!==tp)return 'frente por POI sem o POI-alvo';
        if(l2.pois.length&&!warFrontReleased(l2)&&warFrontCanConquer(l2,tp))return 'POI-alvo conquistável com a frente bloqueada';}}
    warFrontClear(f);   // deixa o cenário limpo para os testes seguintes
    return '';
  },
  warFront:()=>{   // frente da guerra: rota (origem, cadeia ordenada, desvio), POIs de guerra, ida e volta do estado, dormentes e reversão na paz
    const f=WARSCN.fid,en=WORLD.cities.filter(c=>c.owner==='enemy'&&c.fid===f&&!c.rebel).sort((a,b)=>b.cx-a.cx)[0];
    if(!en)return 'sem cidade inimiga';
    const other=WORLD.cities.find(c=>c.owner==='enemy'&&c.fid!==f);if(other&&warCanTarget(f,'city',other))return 'cidade de terceiro virou alvo';
    if(!warCanTarget(f,'city',en))return 'cidade inimiga não é alvo';
    if(!(WORLD.dormant||[]).length)return 'sem dormentes';
    for(const c of WORLD.cities)if(!(WORLD.dormant||[]).some(d=>d.ring===c.id))return 'cidade '+c.name+' sem dormente no anel';
    const r=warFrontCheck(f,'city',en);if(!r.plan)return 'sem rota: '+String(r.erro).replace(/<[^>]*>/g,'');
    const pl=r.plan;
    if(pl.origin.owner!=='player')return 'origem não é cidade sua';
    if(pl.ts.some((t,i)=>i&&t<pl.ts[i-1]))return 'cadeia fora de ordem';
    const a=pl.path[0],b=pl.path[pl.path.length-1];
    if(Math.hypot(a.x-pl.origin.cx,a.z-pl.origin.cz)>1||Math.hypot(b.x-en.cx,b.z-en.cz)>1)return 'rota não liga origem e alvo';
    for(const c of WORLD.cities){
      if(c===pl.origin||c===en||c.owner==='player'||(c.owner==='enemy'&&c.fid===f))continue;
      if(pl.path.some(q=>Math.max(Math.abs(q.x-c.cx),Math.abs(q.z-c.cz))<c.half))return 'rota atravessa a cidade '+c.name;
    }
    const n0=WORLD.pois.length,nw=warFrontBuild(pl);
    if(nw!==pl.war.length||WORLD.pois.length!==n0+nw)return 'POIs de guerra não foram construídos';
    const fr=warX().camps[f].front;if(!fr||fr.war.length!==nw||fr.chain.length!==pl.chain.length)return 'frente não salva';
    for(const e of fr.war)if(e.id<700||!WORLD.pois.some(p=>p.id===e.id))return 'POI de guerra sem id 700+';
    if(nw){   // ida e volta: remove um POI de guerra do mundo e restaura pelo estado salvo
      const e=fr.war[0],p=WORLD.pois.find(q=>q.id===e.id);wfUnmake(p);
      if(WORLD.pois.some(q=>q.id===e.id))return 'wfUnmake não removeu';
      warFrontRestore();if(!WORLD.pois.some(q=>q.id===e.id))return 'warFrontRestore não reconstruiu';
    }
    const rev=fr.war.filter(e=>WAR.front.revert[e.type]),keep=fr.war.filter(e=>!WAR.front.revert[e.type]);
    const dorm=fr.war.filter(e=>e.dorm!==undefined);
    for(const e of dorm)if(!WORLD.dormant[e.dorm].off)return 'dormente usado não ficou desligado';
    facPeace(f);
    if(warX().camps[f]&&warX().camps[f].front)return 'frente não apagada na paz';
    for(const e of rev)if(WORLD.pois.some(p=>p.id===e.id))return 'POI de guerra revertido continua no mundo';
    for(const e of rev)if(e.dorm!==undefined&&WORLD.dormant[e.dorm].off)return 'dormente não voltou na paz';
    for(const e of keep){const p=WORLD.pois.find(q=>q.id===e.id);if(!p||p.owner!=='none')return 'rastro da guerra sem dono none';}
    return '';
  },
  warPick:()=>{   // declaração com o mapa: escolher alvo, previsão, edição da rota (obrigatórios) e confirmar
    const f=WARSCN.fid,en=WORLD.cities.find(c=>c.owner==='enemy'&&c.fid===f&&!c.rebel);
    STATE.phase='leader';STATE.round=Math.max(STATE.round,1);
    if(relOf(f).war)return 'ainda em guerra antes da declaração';
    wfPickStart(f);if(!mapOpen()||!WF.pick)return 'mapa não abriu';
    if(!$('lddone').disabled)return 'Encerrar turno não foi desligado na escolha';
    const ev=o=>{const cv=$('bigmap'),rc=cv.getBoundingClientRect(),sc=cv.width/W;   // o mapa é redesenhado (e muda de tamanho) a cada passo
      return{clientX:rc.left+o.cx*sc*rc.width/cv.width,clientY:rc.top+o.cz*sc*rc.height/cv.height}};
    wfPickClick(ev(WORLD.home));if(WF.pick.plan)return 'cidade sua virou alvo';
    wfPickClick(ev(en));if(!WF.pick.plan)return 'sem previsão do alvo';
    if(!$('wfok')||!$('wfedit')||!$('wfretry'))return 'faltam botões da previsão';
    $('wfedit').click();const ed=WF.pick.edit;if(!ed)return 'edição não abriu';
    if(ed.left!==ed.must.length)return 'obrigatórios já marcados';
    if(ed.must.length){wfEditFinish();if(!WF.pick.edit)return 'concluiu sem os obrigatórios';}
    for(const m of ed.must.slice())wfEditClick(ev(m));
    if(WF.pick.edit.left)return 'obrigatórios não marcados';
    wfEditFinish();if(WF.pick.edit||!WF.pick.plan)return 'edição não concluiu';
    const pl=WF.pick.plan;if(ed.must.some(o=>o.spot?!pl.war.some(e=>e.cx===o.cx&&e.cz===o.cz):!pl.chain.includes(o)))return 'obrigatório fora do plano';
    $('wfok').click();
    if(!relOf(f).war)return 'guerra não declarada';
    if(!warX().camps[f].front)return 'frente não montada';
    if(WF.pick)return 'escolha não foi encerrada';
    if(!wfShown()||!wfShown().saved)return 'frente salva não aparece no mapa';
    facPeace(f);if(wfShown())return 'marcas não sumiram na paz';
    return '';
  },
  lvl:()=>{   // níveis da facção e das cidades (LVL): capital herda rd.lvl, limites por rodada, requisitos de POIs e cidades
    const rd=STATE.rd,h=WORLD.home,npc=WORLD.cities.find(c=>c.owner!=='player'),keep=[rd.lvl,rd.clv[h.id],rd.facUpR,rd.cityUpR,STATE.phase,rd.actions,P.coins];
    try{
      delete rd.clv[h.id];rd.lvl=3;if(cityLvl(h)!==3)return 'capital deveria herdar rd.lvl=3, veio '+cityLvl(h);
      if(npc&&cityLvl(npc)!==1)return 'cidade NPC deveria ser nível 1';
      STATE.phase='leader';rd.actions=2;P.coins=99999;rd.facUpR=rd.cityUpR=undefined;
      for(const k of['food','ore','wood'])STATE.res[k]=999;if(!invGive)return 'sem invGive';invGive([['couro',99]]);
      rd.lvl=2;if(facReqState().every(r=>r.ok)&&poiMine().length<2)return 'requisito de POIs não bloqueia';
      rd.lvl=1;if(!canFacUp())return 'facção 1→2 deveria poder: '+facUpWhy();
      rd.facUpR=STATE.round;if(canFacUp())return 'limite de 1 facção por rodada falhou';
      rd.cityUpR=undefined;if(!canCityUp(h))return 'capital 1→2 deveria poder: '+cityUpWhy(h);
      rd.cityUpR=STATE.round;if(canCityUp(h))return 'limite de 1 cidade por rodada falhou';
      rd.cityUpR=undefined;rd.clv[h.id]=LVL.cityMax;if(canCityUp(h))return 'nível máximo da cidade não bloqueia';
      if(npc&&canCityUp(npc))return 'NPC não pode evoluir';
      rd.lvl=LVL.facMax;if(canFacUp())return 'nível máximo da facção não bloqueia';
      return '';
    }finally{rd.lvl=keep[0];rd.clv[h.id]=keep[1];rd.facUpR=keep[2];rd.cityUpR=keep[3];STATE.phase=keep[4];rd.actions=keep[5];P.coins=keep[6]}
  },
  cityUp:()=>{   // tela e botão de evoluir a cidade (capital): paga, sobe o nível, refaz o muro, 1 por rodada
    const rd=STATE.rd,h=WORLD.home,keep=[rd.clv[h.id],rd.cityUpR,STATE.phase,rd.actions,P.coins,rd.now&&rd.now.length];
    try{
      STATE.phase='leader';rd.actions=2;P.coins=99999;rd.cityUpR=undefined;rd.clv[h.id]=1;
      const clickUp=()=>{const b=document.createElement('button');b.dataset.a='cityup';$('ldbook').appendChild(b);bookClick({target:b});b.remove()};
      for(const k of['food','ore','wood'])STATE.res[k]=999;LB.tab='cidades';LB.city=h.id;
      if(!bookPages().join('').includes('data-a="cityup"'))return 'tela da capital sem o botão Evoluir';
      clickUp();
      if(cityLvl(h)!==2)return 'capital deveria ir ao nível 2, ficou '+cityLvl(h);
      if(h.wallType!=='fence')return 'muro do nível 2 deveria ser cerca, é '+h.wallType;
      if(rd.cityUpR!==STATE.round)return 'cityUpR não gravado';
      clickUp();
      if(cityLvl(h)!==2)return 'segunda evolução na mesma rodada não foi bloqueada';
      if(!(rd.now||[]).some(t=>t.includes('evoluiu')))return 'relatório da rodada sem a evolução';
      return '';
    }finally{rd.clv[h.id]=keep[0];rd.cityUpR=keep[1];STATE.phase=keep[2];rd.actions=keep[3];P.coins=keep[4];cityWallRebuild(h,cityLvl(h));if(rd.now)rd.now.length=keep[5]||0}
  },
  facUp:()=>{   // tela e botão de evoluir a facção: requisitos de POIs, 1 por rodada, relatório
    const rd=STATE.rd,keep=[rd.lvl,rd.facUpR,STATE.phase,rd.actions,P.coins,rd.now&&rd.now.length];
    const click=()=>{const b=document.createElement('button');b.dataset.a='cap';$('ldbook').appendChild(b);bookClick({target:b});b.remove()};
    try{
      STATE.phase='leader';rd.actions=3;P.coins=99999;rd.facUpR=undefined;rd.lvl=1;LB.tab='capital';
      for(const k of['food','ore','wood'])STATE.res[k]=999;invGive([['couro',99]]);
      if(!bookPages().join('').includes('data-a="cap"'))return 'tela da facção sem o botão';
      click();if(rd.lvl!==2)return 'facção deveria ir ao nível 2, ficou '+rd.lvl;
      click();if(rd.lvl!==2)return 'segunda evolução na mesma rodada não foi bloqueada';
      if(!(rd.now||[]).some(t=>t.includes('facção chegou')))return 'relatório sem a evolução da facção';
      rd.facUpR=undefined;if(poiMine().length<2&&canFacUp())return 'nível 2→3 sem 2 POIs deveria bloquear';
      return '';
    }finally{rd.lvl=keep[0];rd.facUpR=keep[1];STATE.phase=keep[2];rd.actions=keep[3];P.coins=keep[4];if(rd.now)rd.now.length=keep[5]||0}
  },
  lvlFx:()=>{   // efeito do nível da cidade: produção, imposto e estoque da loja sobem só nas cidades do jogador; NPC não muda
    const rd=STATE.rd,h=WORLD.home,npc=WORLD.cities.find(c=>c.owner!=='player'),k=rd.clv[h.id];
    try{
      rd.clv[h.id]=1;const p1=prodOf(h),t1=taxOf(h),s1=shopFull(h),pn=npc&&prodOf(npc),tn=npc&&taxOf(npc);
      rd.clv[h.id]=3;const p3=prodOf(h),t3=taxOf(h),g=cityLvlGain(h);
      if(focusOf(h)!=='gold'&&p3-p1!==2*LVL.cityProd)return 'produção: '+p1+' -> '+p3;
      if(!(t3>t1))return 'imposto não subiu: '+t1+' -> '+t3;
      if(g.lvl!==3)return 'ganho errado '+JSON.stringify(g);
      if(!(Object.keys(s1).some(i=>shopFull(h)[i]>s1[i])))return 'estoque da loja não subiu';
      if(npc&&(prodOf(npc)!==pn||taxOf(npc)!==tn))return 'NPC mudou';
      return '';
    }finally{rd.clv[h.id]=k}
  },
  cityWall:()=>{   // visual da cidade por nível: muro, torres, atiradores e colisões; refazer não deixa lixo; NPC intacta
    const h=WORLD.home,rd=STATE.rd,k=rd.clv[h.id],npc=WORLD.cities.find(c=>c.owner!=='player'&&c.wallType==='stone'||c.wallType==='palisade');
    const want={1:'none',2:'fence',3:'palisade',4:'palisade',5:'stone'},sc=scene.children.length,nc=Col.all.length;
    try{
      let prev=-1;
      for(let n=1;n<=5;n++){
        rd.clv[h.id]=n;const t0=performance.now();cityWallRebuild(h);const ms=performance.now()-t0;
        if(h.wallType!==want[n])return 'nível '+n+': muro '+h.wallType;
        if(n>=3&&!h.towers.length)return 'nível '+n+': sem torres';
        if(n<3&&h.towers.length)return 'nível '+n+': torres demais';
        const ns=CITY_SENTRIES.filter(s=>s.city===h).length,esp=Math.min(h.towers.length,citySentriesAt(n));
        if(ns!==esp)return 'nível '+n+': '+ns+' atiradores (esperado '+esp+')';
        if(n===5&&!(ns>prev))return 'nível 5 sem mais atiradores que o 4';
        prev=ns;if(ms>1500)return 'refazer o muro levou '+Math.round(ms)+' ms';
      }
      rd.clv[h.id]=1;cityWallRebuild(h);
      if(h.wall.cols.length||CITY_SENTRIES.some(s=>s.city===h))return 'nível 1 deixou colisão ou atirador';
      if(Col.all.length!==nc)return 'colisões vazaram: '+nc+' -> '+Col.all.length;
      if(scene.children.length!==sc)return 'objetos de cena vazaram: '+sc+' -> '+scene.children.length;
      if(npc&&(!npc.wall.mesh))return 'cidade NPC sem muro';
      return '';
    }finally{rd.clv[h.id]=k;cityWallRebuild(h)}
  },
  pois:()=>{const n=WORLD.pois.length;return n>0?'':'nenhum POI em WORLD.pois'},
  svc:([type,fn])=>{   // abre o serviço num POI do tipo pedido (seu, para o preço sair da capital)
    const p=WORLD.pois.find(q=>q.type===type);if(!p)return 'sem POI do tipo '+type;
    if(p.owner!=='player')poiSetOwner(p,'player');
    window[fn](p);
    const ok=G.panel==='svc'&&SVC&&document.getElementById('svcbody');
    const title=document.getElementById('svctitle').textContent;SVC=null;closePanel();
    return ok?(title?'':'painel sem título'):'o painel de serviço não abriu (G.panel='+G.panel+')';
  },
  rest:()=>{   // 4D: pousada e alojamento (cama, serviço 'inn', quarto e compra) e vila em escombros (anexável, sem moradores)
    for(const type of ['inn','lodge']){
      const p=WORLD.pois.find(q=>q.type===type);if(!p)return 'sem POI '+type;
      if(!p.bed)return type+' sem cama';if(!(p.svcSpec||[]).some(s=>s.kind==='inn'))return type+' sem serviço inn';
      poiSetOwner(p,'player');if(!p.civ)return type+' sem moradores ao virar seu (poiCivSync)';
      P.coins=5000;svcInn(p);if(G.panel!=='svc')return type+': svcInn não abriu';
      let btns=[...document.querySelectorAll('#svcbody button:not(.qmark)')];if(btns.length!==2)return type+': o menu Comprar/Vender não veio primeiro ('+btns.length+' botões)';btns[0].click();btns=[...document.querySelectorAll('#svcbody button:not(.qmark)')];if(btns.length<6)return type+': loja sem abas/itens ('+btns.length+')';btns[2].click();btns=[...document.querySelectorAll('#svcbody button:not(.qmark)')];
      btns[3].click();if(!(poiX().room&&poiX().room.poi===p.id))return type+': quarto não reservado';
      SVC=null;closePanel();poiX().room=null;
    }
    {const L=WORLD.pois.find(q=>q.type==='lodge');L.owner='bandit';P.x=L.firePos.x;P.z=L.firePos.z+2.5;P.y=tH(P.x,P.z)+1;G.target=null;poiScan([]);
      if(!G.target||G.target.type!=='fire')return 'fogueira do alojamento sem [E] (dono bandido)';if(innCash(L)<POI_REST.lodge.cash)return 'caixa do comerciante abaixo do inicial após uma compra'}
    const r=WORLD.pois.find(q=>q.type==='ruinvil');if(!r)return 'sem vila em escombros';
    poiSetOwner(r,'player');if(r.civ)return 'vila em escombros ganhou moradores';
    return '';
  },
  hunters:()=>{   // caçadores: baú de carne (1 a 3, uma vez só) e nível do jogador
    const p=WORLD.pois.find(q=>q.type==='hunters');if(!p)return 'sem POI de caçadores';
    if(!p.chestPos)return 'sem posição do baú';
    p.owner='bandit';poiHuntLoot(p);const ch=p.huntChest;
    if(!ch||!WORLD.chests.includes(ch))return 'o baú não nasceu';
    const n=ch.fixedLoot[0][1];if(n<1||n>3)return 'carne fora de 1 a 3: '+n;
    const k=WORLD.chests.length;poiHuntLoot(p);if(WORLD.chests.length!==k)return 'o baú nasceu duas vezes';
    STATE.rd.lvl=3;return poiLvl('player')===3?'':'poiLvl do jogador errado';
  },
  sanctuary:()=>{   // santuário: peregrinos só com dono amigo; paz e adiamento só com Santuário do dono
    const p=WORLD.pois.find(q=>q.type==='sanctuary');if(!p)return 'sem santuário';
    const X=poiX(),go=o=>{poiSetOwner(p,o);if(X.since)delete X.since[p.id];poiCivSync(p)};
    go('bandit');if(p.civ)return 'santuário de bandidos não pode ter moradores';
    go('player');if(!p.civ||!p.civ.npcs.some(n=>n.role==='civ')||!p.civ.npcs.some(n=>n.role==='guard'))return 'faltaram civis ou guardas';
    const old=Math.random,sh=p.show;p.show=false;Math.random=()=>0;const a=poiSancPeace('player')&&poiSancDelay('player');
    Math.random=()=>0.99;const b=poiSancPeace('player')||poiSancDelay('player');Math.random=old;
    if(!a||b)return 'sorteio de paz/adiamento errado';
    go('bandit');Math.random=()=>0;const c=poiSancPeace('player');Math.random=old;p.show=sh;
    return c?'sem Santuário do dono não pode haver paz':'';
  },
  ruins:()=>{   // ruínas: guardiões derrotados voltam na rodada seguinte; o baú abre uma vez e não volta
    const p=WORLD.pois.find(q=>q.type==='ruins');if(!p||p.show)return 'sem ruínas de mapa (só no cenário manual)';
    poiGarrisonSync(p);if(!p.gar)return 'sem guardiões';
    poiGarrisonCleared(p.gar);if(p.gar)return 'guardiões não saíram';
    Hooks.emit('round',STATE.round);if(!p.gar)return 'guardiões não voltaram na rodada';
    return p.chest&&p.chest.lockedBy===p.gar?'':'o baú devia trancar de novo enquanto não foi aberto';
  },
  tavernNpcs:()=>{   // taverna: ferreiro em qualquer dono amigo; mercenário só na do jogador; bandidos sem moradores
    const p=WORLD.pois.find(q=>q.type==='tavern');if(!p)return 'sem taverna';
    const X=poiX(),go=o=>{poiSetOwner(p,o);if(X.since)delete X.since[p.id];poiCivSync(p)};
    go('player');if(!(p.civ&&p.civ.svc.smith&&p.civ.svc.merc))return 'na taverna do jogador faltou o ferreiro ou o mercenário';
    const f=(WORLD.factions||[]).find(q=>!q.player);
    if(f){go(f.id);if(!(p.civ&&p.civ.svc.smith))return 'na taverna de facção faltou o ferreiro';if(p.civ.svc.merc)return 'a taverna de facção não pode ter mercenário'}
    go('bandit');if(p.civ)return 'taverna de bandidos com moradores';
    return '';
  },
  post:()=>{   // entreposto: lojista só com dono amigo; renda por caravana sua; bloqueio só em guerra
    const p=WORLD.pois.find(q=>q.type==='post');if(!p)return 'sem entreposto';
    const X=poiX(),go=o=>{poiSetOwner(p,o);if(X.since)delete X.since[p.id];poiCivSync(p)};
    go('bandit');if(p.civ)return 'entreposto de bandidos com lojista';
    go('player');if(!(p.civ&&p.civ.svc.shop))return 'sem lojista no entreposto do jogador';
    const A=WORLD.home,B=WORLD.cities.find(c=>c.owner!=='player'&&c.fid);if(!B)return 'sem cidade de facção';
    const sv={cx:p.cx,cz:p.cz,show:p.show,routes:STATE.rd.routes.slice()},rl=relOf(B.fid),war0=rl.war;let why='';
    try{
      p.show=false;p.cx=(A.cx+B.cx)/2;p.cz=(A.cz+B.cz)/2;STATE.rd.routes=[{a:A.id,b:B.id}];rl.war=false;
      const inc=poiPostIncome();
      if(inc.length!==1||inc[0].gold!==POIX.post.income*poiLvl('player'))why='renda errada: '+JSON.stringify(inc.map(i=>i.gold));
      else if(poiRouteBlocked({a:A.id,b:B.id}))why='rota bloqueada sem guerra';
      else{rl.war=true;
        if(!poiRouteBlocked({a:A.id,b:B.id}))why='entreposto seu não bloqueou a facção em guerra';
        else{go(B.fid);if(!poiRouteBlocked({a:A.id,b:B.id}))why='entreposto inimigo não bloqueou a rota do jogador';
          else{go('bandit');if(poiRouteBlocked({a:A.id,b:B.id}))why='entreposto de bandidos não deve bloquear'}}}
    }finally{rl.war=war0;Object.assign(p,{cx:sv.cx,cz:sv.cz,show:sv.show});STATE.rd.routes=sv.routes}
    return why;
  },
  postStock:()=>{   // entreposto: materiais com estoque (fração da loja), esgota e volta na rodada seguinte; comida sem limite
    const p=WORLD.pois.find(q=>q.type==='post');if(!p)return 'sem entreposto';
    const X=poiX(),full=shopFull(poiPriceCity(p)),id='carne',want=Math.floor(full[id]*POST_STOCK_MULTIPLIER);
    delete X.postStock;if(postStockLeft(p,id)!==want)return 'estoque inicial '+postStockLeft(p,id)+' (esperado '+want+')';
    X.postStock[p.id].s[id]=0;if(postStockLeft(p,id)!==0)return 'estoque zerado não ficou';
    const r=STATE.round;STATE.round=r+1;const back=postStockLeft(p,id);STATE.round=r;X.postStock[p.id].r=r;
    if(back!==want)return 'estoque não voltou na rodada seguinte ('+back+')';
    return postStockLeft(p,'pao_inexistente')===null?'':'item sem limite ganhou estoque';
  },
  postTabs:()=>{   // entreposto: todas as abas abrem, têm "?" e a venda paga o valor da cidade de referência
    const p=WORLD.pois.find(q=>q.type==='post');if(!p)return 'sem entreposto';
    svcPost(p);const bad=[];
    for(const [k] of POST_TABS){G.postTab=k;G.postSel=null;svcRender();if(k!=='sell'&&k!=='ammo'&&!$('svcbody').querySelector('.qmark'))bad.push(k)}
    if(bad.length)return 'sem "?" nas abas: '+bad;
    const c=poiPriceCity(p),id='carne';invGive([[id,3]]);G.postTab='sell';G.postSel=STATE.inv.slots.findIndex(s=>s&&s.id===id);
    svcRender();if(!$('svcbody').textContent.includes('Preço agora'))return 'aba Venda sem preço';
    const g0=P.coins,n0=invCount(id),exp=sellUnitPrice(id,c),r=sellItem(c,id,1);closePanel();
    return r.sold===1&&P.coins-g0===exp&&n0-invCount(id)===1?'':'venda no entreposto errada';
  },
  vest:()=>{   // quartel: reparo do colete com ouro e com couro (qualquer cidade sua)
    const c=WORLD.home;openBarracks(c);if(G.panel!=='barracks')return 'o quartel não abriu';
    P.coins=5000;P.armor=40;const q=vestRepairQuote(),g0=P.coins;
    if(!document.getElementById('bkbody').textContent.includes('Reparar o seu colete'))return 'sem o cartão de reparo';
    if(!vestRepair(false)||P.armor!==100||g0-P.coins!==q.gold)return 'reparo em ouro errado';
    P.armor=40;invGive([['couro',q.lea]]);const g1=P.coins,l0=invCount('couro');
    if(!vestRepair(true)||P.armor!==100||g1-P.coins!==q.goldLea||l0-invCount('couro')!==q.lea)return 'reparo com couro errado';
    closePanel();return '';
  },
  binoc:()=>{   // "Fazer vigia": 1 uso por torre por rodada; duas torres = dois "?"; sem candidatos = aviso
    const towers=WORLD.pois.filter(q=>q.type==='tower'),p=towers[0]||WORLD.pois[0],X=poiX(),ph=STATE.phase,old=Math.random;
    let why='';
    try{
      STATE.phase='commander';X.marks=[];X.bin=null;delete X.vigil[p.id];
      const m0=X.marks.length,t0=DN.t+DN.days;poiVigil(p);
      if(X.vigil[p.id]!==STATE.round)why='o uso da vigia não foi contado';
      else if(DN.t+DN.days<=t0)why='a vigia não avançou o relógio';
      const n1=X.marks.length;poiVigil(p);
      if(!why&&X.marks.length!==n1)why='a mesma torre usou duas vezes na rodada';
      if(!why&&towers[1]){delete X.vigil[towers[1].id];poiVigil(towers[1]);if(X.marks.length>m0+2)why='mais "?" do que usos'}
    }finally{Math.random=old;STATE.phase=ph;X.marks=[]}
    return why;
  },
  freeRetake:()=>{   // POI livre sem decisão: ao encerrar o turno do líder, sempre retomado (50% bandidos, 50% facção mais perto)
    const p=WORLD.pois.find(q=>!q.show&&!POI_DEFS[q.type].war&&q.type!=='ruins'&&q.owner==='bandit');if(!p)return 'sem POI de bandidos';
    const X=poiX(),old=Math.random,n0=STATE.rd.now.length,free=()=>{poiGarrisonRemove(p);poiSetOwner(p,'free');X.clr[p.id]=STATE.round-1};
    let why='';
    try{
      const seq=a=>{let i=0;Math.random=()=>a[Math.min(i++,a.length-1)]};
      const f=poiNearestFac(p);   // os pesos vêm de modifiers/: só testa o que está ligado
      if(BANDIT_RETAKE_FREE_POI>0){free();seq([0]);Hooks.emit('leaderEnd');if(p.owner!=='bandit'||!p.gar)why='sorteio 0 devia trazer os bandidos de volta'}
      if(!why&&FACTION_TAKE_FREE_POI>0&&f){free();seq([0.99]);Hooks.emit('leaderEnd');if(p.owner!==f.id)why='a facção mais perto devia assumir (dono: '+p.owner+')'}
      if(!why&&!STATE.rd.now.slice(n0).some(t=>t.includes('que estava livre')))why='sem aviso no relatório';
    }finally{Math.random=old;poiSetOwner(p,'bandit');poiGarrisonSync(p);delete X.clr[p.id];STATE.rd.now.length=n0}
    return why;
  },
  warRetake:()=>{   // em guerra a chance de retomada dos POIs seus é multiplicada por WAR_RETAKE_MULTIPLIER
    const p=WORLD.pois.find(q=>!q.show&&!POI_DEFS[q.type].war&&q.type!=='ruins'&&q.owner==='bandit');if(!p)return 'sem POI de bandidos';
    const owner=p.owner,rel=(WORLD.factions||[]).filter(f=>!f.player).map(f=>[relOf(f.id),relOf(f.id).war]);let why='';
    try{
      poiSetOwner(p,'player');for(const [r] of rel)r.war=false;
      const base=poiRetakeChance(p);if(!(base>0))return 'chance base zerada';
      const f0=(WORLD.factions||[]).find(f=>!f.player);if(!f0)return 'sem facções';
      relOf(f0.id).war=true;const w=poiRetakeChance(p);
      if(Math.abs(w-base*WAR_RETAKE_MULTIPLIER)>1e-9)why='em guerra devia ser '+base*WAR_RETAKE_MULTIPLIER+', veio '+w;
    }finally{for(const [r,w] of rel)r.war=w;poiSetOwner(p,owner);poiGarrisonSync(p)}
    return why;
  },
  civStart:()=>{   // conquista um POI de bandidos (fora do mapa manual) na rodada N: ainda sem moradores
    const p=WORLD.pois.find(q=>!q.show&&!POI_DEFS[q.type].war&&q.type!=='ruins'&&POIX.civ[q.type]>0&&q.owner==='bandit');if(!p)return 'sem POI de bandidos para conquistar';
    if(p.gar)for(const e of p.gar.enemies||[])e.alive=false;
    poiSetOwner(p,'player');window.__civ={id:p.id,round:STATE.round};
    return p.civ?'moradores apareceram já na rodada da conquista ('+STATE.round+')':'';
  },
  civAnnex:()=>{   // limpado na rodada N e anexado na N+1: os moradores já estão lá ao anexar (não na N+2)
    const p=WORLD.pois.find(q=>!q.show&&!POI_DEFS[q.type].war&&q.type!=='ruins'&&POIX.civ[q.type]>0&&q.owner==='bandit');
    if(!p)return 'sem POI de bandidos';
    for(const e of (p.gar&&p.gar.enemies)||[])e.alive=false;
    const r=STATE.round;poiGarrisonCleared(p.gar);   // limpado na rodada N
    if(p.owner!=='free')return 'POI não ficou livre';
    STATE.round=r+1;try{poiSetOwner(p,'player');   // anexado na N+1 (o cartão do líder faz isso)
      return p.civ&&p.civ.npcs.length?'':'sem moradores ao anexar na rodada N+1 (POI '+p.type+' '+p.id+')'}
    finally{STATE.round=r;poiSetOwner(p,'bandit');poiX().conq={}}
  },
  civNext:()=>{   // fecha a rodada: na N+1 os moradores aparecem
    const s=window.__civ;if(!s)return 'conquista não feita';const p=WORLD.pois.find(q=>q.id===s.id);
    if(STATE.phase==='leader')finishLeaderTurn();
    const old=Math.random;Math.random=()=>0.99;let ok;   // sem sorteio de retomada: POI longe das cidades seria retomado pelos bandidos (teto 75%)
    try{ok=endRound(WORLD.home)}finally{Math.random=old}
    if(!ok)return 'endRound recusou fechar a rodada';
    if(STATE.round!==s.round+1)return 'rodada '+STATE.round+', esperada '+(s.round+1);
    return p.civ&&p.civ.npcs.length?'':'sem moradores na rodada '+STATE.round+' (POI '+p.type+' '+p.id+', dono '+p.owner+', vivo '+poiLive(p)+', since '+poiX().since[p.id]+', civ '+(p.civ?p.civ.npcs.length:'null')+')';
  },
  neg:()=>{   // abre o livro na aba Facções e percorre todas as telas da Negociação (sem fechar acordo nem declarar guerra)
    const f=(WORLD.factions||[]).find(x=>!x.player);if(!f)return 'sem facções';
    closePanel();openBook('book','facs');
    const L=()=>document.getElementById('ldbook'),   // na aba Facções a lista fica à esquerda e o resumo à direita: busca no livro todo
    click=sel=>{const b=L().querySelector(sel);if(!b)throw new Error('botão não achado: '+sel);b.click()};
    const fb=L().querySelector('button[data-a="fac"][data-id="'+f.id+'"]');
    if(!fb)return 'facção '+f.name+' não está na lista';fb.click();
    click('button[data-a="negopen"]');
    const title=()=>{const b=L().querySelector('.negbar b');return b?b.textContent:''};
    if(title()!=='Negociação com '+f.name)return 'tela inicial errada: "'+title()+'"';
    const seen=[];
    const walk=depth=>{   // entra em cada botão de navegação, confere o título e volta
      const tos=[...L().querySelectorAll('button[data-a="negnav"]')].map(b=>b.dataset.to);
      for(const to of tos){
        click('button[data-a="negnav"][data-to="'+to+'"]');
        if(title()!==NEG_TITLE[to])throw new Error('tela '+to+' com título "'+title()+'"');
        seen.push(to);if(depth<3)walk(depth+1);
        click('button[data-a="negback"]');
      }
    };
    walk(0);
    click('button[data-a="negback"]');   // volta do menu para o resumo da facção
    if(L().querySelector('.negpage'))return 'o ⬅ do menu não voltou ao resumo';
    closePanel();
    const want=['ally','gift','gold','relic','route','war'].filter(k=>!seen.includes(k));
    return want.length?'telas não visitadas: '+want.join(', '):'';
  }
};

(async()=>{
  const srv=await serve(),base='http://127.0.0.1:'+srv.address().port;
  const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']});
  try{
    console.log('— index.html?auto=1&mute=1&seed=11');
    let g=await openGame(browser,base,'auto=1&mute=1&seed=11');
    report(!g.errs.length,'seed 11: sem erros ao carregar',g.errs.join(' | ').slice(0,300));
    await check(g,'seed 11: POIs gerados',T.pois);
    await check(g,'seed 11: pontes (registro e pedágios no máximo 3)',T.bridges);
    await check(g,'seed 11: estado de guerra (WAR e STATE.war)',T.war);
    await check(g,'seed 11: níveis da facção e das cidades (LVL)',T.lvl);
    await check(g,'seed 11: efeito do nível da cidade (produção, imposto, loja)',T.lvlFx);
    await check(g,'seed 11: evoluir facção pela tela (requisitos, 1 por rodada)',T.facUp);
    await check(g,'seed 11: evoluir cidade pela tela (1 por rodada, muro novo)',T.cityUp);
    await check(g,'seed 11: visual da cidade por nível (muros e atiradores)',T.cityWall);
    await check(g,'seed 11: vigia da torre (poiVigil)',T.binoc);
    await check(g,'seed 11: POI livre sem decisão (retomada ao encerrar o líder)',T.freeRetake);
    await check(g,'seed 11: retomada dos POIs seus em guerra (redutor)',T.warRetake);
    await check(g,'seed 11: ruínas (guardiões voltam, baú não)',T.ruins);
    await check(g,'seed 11: limpado na N e anexado na N+1 já com moradores',T.civAnnex);
    await check(g,'seed 11: conquista na rodada N sem moradores',T.civStart);
    await check(g,'seed 11: moradores na rodada N+1',T.civNext);
    await check(g,'seed 11: Negociação (livro na aba facs, todas as telas)',T.neg);
    await g.page.close();

    console.log('— index.html?cenario=pois&auto=1&mute=1');
    g=await openGame(browser,base,'cenario=pois&auto=1&mute=1');
    report(!g.errs.length,'pois: sem erros ao carregar',g.errs.join(' | ').slice(0,300));
    await check(g,'pois: POIs gerados',T.pois);
    for(const [type,fn] of [['tavern','svcSmith'],['tavern','svcMerc'],['tavern','svcTavern'],['post','svcPost']])
      await check(g,'pois: '+fn+' abre sem erro',T.svc,[type,fn]);
    await check(g,'pois: pousada, alojamento e vila em escombros',T.rest);
    await check(g,'quartel: reparo do colete (ouro e couro)',T.vest);
    await check(g,'pois: entreposto (lojista, renda, bloqueio em guerra)',T.post);
    await check(g,'pois: entreposto (estoque limitado)',T.postStock);
    await check(g,'pois: entreposto (abas, "?" e venda)',T.postTabs);
    await check(g,'pois: taverna (ferreiro, mercenário, bandidos)',T.tavernNpcs);
    await check(g,'pois: caçadores (baú de carne e nível)',T.hunters);
    await check(g,'pois: santuário (peregrinos, paz, adiamento)',T.sanctuary);
    await check(g,'pois: vigia da torre (poiVigil)',T.binoc);
    await check(g,'pois: Negociação (livro na aba facs, todas as telas)',T.neg);
    await g.page.close();

    console.log('— index.html?cenario=guerra');
    g=await openGame(browser,base,'cenario=guerra&mute=1');
    report(!g.errs.length,'guerra: sem erros ao carregar',g.errs.join(' | ').slice(0,300));
    await check(g,'guerra: cenário (guerra, divisão de POIs, Conquistar POI)',T.warScn);
    await check(g,'guerra: frente (rota, POIs de guerra, save, dormentes e reversão na paz)',T.warFront);
    await check(g,'guerra: declaração com o mapa (alvo, previsão, edição da rota, confirmar)',T.warPick);
    await g.page.close();
  }catch(e){report(false,'execução',e.message.split('\n')[0])}
  await browser.close();srv.close();
  console.log(fails?fails+' verificação(ões) falharam.':'Tudo OK.');
  process.exit(fails?1:0);
})();
