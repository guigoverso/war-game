'use strict';
// Abre várias sementes, imprime estatísticas das pegadas e salva o minimapa de cada uma.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=require('path').resolve(__dirname,'../..'),OUT=process.argv[2];
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.ogg':'audio/ogg','.mp3':'audio/mpeg','.wav':'audio/wav'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;
  const browser=await chromium.launch();
  for(const seed of process.argv.slice(3)){
    const page=await browser.newPage({viewport:{width:1280,height:800}}),errs=[];
    page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.text())});
    await page.goto(base+'/index.html?auto=1&mute=1&seed='+seed);
    await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&Array.isArray(WORLD.pois),null,{timeout:180000});
    const info=await page.evaluate(()=>WORLD.cities.map(c=>{
      let n=0,wet=0;const N=2*c.half+1;
      if(c.foot)for(let z=-c.half;z<=c.half;z++)for(let x=-c.half;x<=c.half;x++)if(c.foot[(z+c.half)*N+x+c.half]){n++;if(H[(c.cz+z)*W+c.cx+x]<SEA+1)wet++}
      return{id:c.id,half:c.half,h0:c.half0,houses:(c.houses||[]).length,svc:['hall','store','tavern','warehouse','shop','clinic','chapel','barracks'].map(k=>c[k]?1:(c.specials&&c.specials[k]?1:0)).join('')}}));
    console.log('seed',seed,JSON.stringify(info));
    if(errs.length)console.log('  erros/avisos:',errs.slice(0,5));
    const url=await page.evaluate(()=>WORLD.mapCanvas.toDataURL('image/png'));
    fs.writeFileSync(path.join(OUT,'mapa-'+seed+'.png'),Buffer.from(url.split(',')[1],'base64'));
    await page.close();
  }
  await browser.close();srv.close();
})();
