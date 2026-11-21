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
      const f=poiNearestFac(p);   // os pesos vêm de modifiers.js: só testa o que está ligado
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
    await check(g,'seed 11: níveis da facção e das cidades (LVL)',T.lvl);
    await check(g,'seed 11: efeito do nível da cidade (produção, imposto, loja)',T.lvlFx);
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
  }catch(e){report(false,'execução',e.message.split('\n')[0])}
  await browser.close();srv.close();
  console.log(fails?fails+' verificação(ões) falharam.':'Tudo OK.');
  process.exit(fails?1:0);
})();
