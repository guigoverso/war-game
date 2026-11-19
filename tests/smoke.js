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
  pois:()=>{const n=WORLD.pois.length;return n>0?'':'nenhum POI em WORLD.pois'},
  svc:([type,fn])=>{   // abre o serviço num POI do tipo pedido (seu, para o preço sair da capital)
    const p=WORLD.pois.find(q=>q.type===type);if(!p)return 'sem POI do tipo '+type;
    if(p.owner!=='player')poiSetOwner(p,'player');
    window[fn](p);
    const ok=G.panel==='svc'&&SVC&&document.getElementById('svcbody');
    const title=document.getElementById('svctitle').textContent;SVC=null;closePanel();
    return ok?(title?'':'painel sem título'):'o painel de serviço não abriu (G.panel='+G.panel+')';
  },
  binoc:()=>{   // usa o binóculo de uma torre (ou de qualquer POI, se não houver torre)
    const p=WORLD.pois.find(q=>q.type==='tower')||WORLD.pois[0],X=poiX();
    const n0=X.bin&&X.bin.r===STATE.round?X.bin.n:0;poiBinoc(p);
    return X.bin&&X.bin.r===STATE.round&&X.bin.n===n0+1?'':'o uso do binóculo não foi contado';
  },
  civStart:()=>{   // conquista um POI de bandidos (fora do mapa manual) na rodada N: ainda sem moradores
    const p=WORLD.pois.find(q=>!q.show&&!POI_DEFS[q.type].war&&q.type!=='ruins'&&q.owner==='bandit');if(!p)return 'sem POI de bandidos para conquistar';
    if(p.gar)for(const e of p.gar.enemies||[])e.alive=false;
    poiSetOwner(p,'player');window.__civ={id:p.id,round:STATE.round};
    return p.civ?'moradores apareceram já na rodada da conquista ('+STATE.round+')':'';
  },
  civNext:()=>{   // fecha a rodada: na N+1 os moradores aparecem
    const s=window.__civ;if(!s)return 'conquista não feita';const p=WORLD.pois.find(q=>q.id===s.id);
    if(STATE.phase==='leader')finishLeaderTurn();
    if(!endRound(WORLD.home))return 'endRound recusou fechar a rodada';
    if(STATE.round!==s.round+1)return 'rodada '+STATE.round+', esperada '+(s.round+1);
    return p.civ&&p.civ.npcs.length?'':'sem moradores na rodada '+STATE.round;
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
    await check(g,'seed 11: binóculo (poiBinoc)',T.binoc);
    await check(g,'seed 11: conquista na rodada N sem moradores',T.civStart);
    await check(g,'seed 11: moradores na rodada N+1',T.civNext);
    await check(g,'seed 11: Negociação (livro na aba facs, todas as telas)',T.neg);
    await g.page.close();

    console.log('— index.html?cenario=pois&auto=1&mute=1');
    g=await openGame(browser,base,'cenario=pois&auto=1&mute=1');
    report(!g.errs.length,'pois: sem erros ao carregar',g.errs.join(' | ').slice(0,300));
    await check(g,'pois: POIs gerados',T.pois);
    for(const [type,fn] of [['forge','svcSmith'],['forge','svcAnvil'],['tannery','svcTanner'],['tavern','svcTavern']])
      await check(g,'pois: '+fn+' abre sem erro',T.svc,[type,fn]);
    await check(g,'pois: binóculo (poiBinoc)',T.binoc);
    await check(g,'pois: Negociação (livro na aba facs, todas as telas)',T.neg);
    await g.page.close();
  }catch(e){report(false,'execução',e.message.split('\n')[0])}
  await browser.close();srv.close();
  console.log(fails?fails+' verificação(ões) falharam.':'Tudo OK.');
  process.exit(fails?1:0);
})();
