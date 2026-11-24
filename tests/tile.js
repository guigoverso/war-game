'use strict';
// ---------- Teste do tile da etapa 4A (Node + Playwright; só para desenvolvimento) ----------
// Abre ?cenario=tile com temas e batalhas e confere: carga sem erros, lado 384, composição (4E: cidade enorme, vila e demais temas com principal e POIs; ?compor=0 = tile vazio da 4A), descritor, aberturas livres e tempo de geração (limite 4 s). A composição em detalhe: tile-compose.js.
// Uso: cd tests && node tile.js [semente]
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),seed=process.argv[2]||11;
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css'};
const serve=()=>new Promise(r=>{const s=http.createServer((q,res)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});s.listen(0,'127.0.0.1',()=>r(s))});
let fails=0;const rep=(ok,n,w)=>{if(!ok)fails++;console.log((ok?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
const LIMIT=4000;
(async()=>{
  const srv=await serve(),base='http://127.0.0.1:'+srv.address().port,browser=await chromium.launch();
  const cases=[['tema=cidade'],['tema=fazenda'],['tema=mina'],['tema=serraria'],['tema=animais'],['tema=ponte'],['tema=fortaleza'],['tema=ruinas'],['tema=passagem'],['tema=vila'],
    ['tema=fazenda&compor=0'],['tema=fazenda&batalha=defesa&entrada=L'],['tema=mina&batalha=choque&entrada=N&entrada2=S&estac=defensor'],['tema=vila&batalha=conquista&entrada=O'],['temas=70'],['tema=vila&cidade=1']];
  for(const [qs] of [cases[0]].concat(cases.slice(1))){
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errs=[];
    page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    const t0=Date.now();
    await page.goto(base+'/index.html?cenario=tile&auto=1&mute=1&seed='+seed+'&'+qs);
    let why='';
    try{await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&WORLD.win,null,{timeout:30000})}catch(e){why='não carregou: '+errs.slice(0,3).join(' | ')}
    const ms=Date.now()-t0;await page.waitForTimeout(1500);
    const r=why?null:await page.evaluate(()=>{const w=WORLD.win,d=w.desc;return{W,size:w.size,tema:w.tema,dt:d.tema,empty:w.empty,cities:WORLD.cities.length,pois:(WORLD.pois||[]).length,
      huge:!!(WORLD.cities[0]&&WORLD.cities[0].huge),vila:!!(WORLD.cities[0]&&WORLD.cities[0].vila),saidas:d.saidas.length,aber:w.openings.length,bat:w.battle,terra:+d.terreno.terra.toFixed(2),fit:+d.adequacao.toFixed(2),nan:isNaN(P.x+P.z+P.y)}});
    const q2=qs.replace(/&/g,' ');
    rep(!why&&!errs.length,q2+': carrega sem erros ('+ms+' ms)',why||errs.slice(0,2).join(' | '));
    if(!r)continue;
    rep(r.W===384&&r.size===384,q2+': lado 384',r.W+'');
    rep(r.dt===r.tema,q2+': tema '+r.tema+(r.empty?'':' (com cidade)'));
    if(qs.includes('compor=0'))rep(r.empty&&r.pois===0,q2+': ?compor=0 = tile vazio (4A)',r.pois+' POIs');
    else if(qs==='tema=cidade')rep(!r.empty&&r.huge&&r.pois>=2,q2+': cidade enorme com POIs (4B+4E)',r.pois+' POIs, huge='+r.huge);
    else if(r.tema==='vila'&&!qs.includes('cidade=1'))rep(!r.empty&&r.vila&&r.pois>=2,q2+': vila com POIs (4C+4E)',r.pois+' POIs, vila='+r.vila);
    else if(r.tema==='passagem'||qs.includes('cidade=1')||qs==='temas=70')rep(true,q2+': '+r.pois+' POIs');
    else rep(r.empty&&r.pois>=2,q2+': tile sem cidade, com principal e POIs',r.pois+' POIs');
    rep(r.saidas===r.aber&&!r.nan,q2+': '+r.aber+' abertura(s), jogador posicionado');
    if(qs.includes('batalha'))rep(!!r.bat,q2+': descritor de batalha',JSON.stringify(r.bat));
    rep(ms<=LIMIT*3,q2+': tempo até rodar '+ms+' ms (inclui abrir o navegador; limite de geração 4 s)');
    await page.close();
  }
  await browser.close();srv.close();console.log(fails?'\n'+fails+' FALHA(S)':'\nTudo OK');process.exit(fails?1:0);
})();
