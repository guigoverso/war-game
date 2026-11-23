'use strict';
// Impressão digital do mundo gerado (H, T, B, cidades, POIs) para provar que uma refatoração não mudou a geração.
// Uso (de dentro de tests/): node mundo-hash.js [raiz do projeto] [query...]   ex.: node mundo-hash.js .. "seed=11" "seed=5&reserva=0"
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {chromium}=require('playwright');
const ROOT=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const QS=process.argv.slice(3).length?process.argv.slice(3):['seed=11','seed=5&reserva=0'];
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
(async()=>{
  const srv=http.createServer((req,res)=>{const f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0])==='/'?'index.html':decodeURIComponent(req.url.split('?')[0]));
    fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+srv.address().port,br=await chromium.launch();
  for(const qs of QS){
    const page=await br.newPage();
    await page.goto(base+'/index.html?auto=1&mute=1&'+qs);
    await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&Array.isArray(WORLD.pois),null,{timeout:180000});
    const d=await page.evaluate(()=>({H:Array.from(new Uint8Array(H.buffer)),T:Array.from(T),B:Array.from(B),
      c:WORLD.cities.map(c=>[c.cx,c.cz,c.half,c.name,c.biome]),p:(WORLD.pois||[]).map(p=>[p.type,p.x,p.z])}));
    const h=k=>crypto.createHash('md5').update(JSON.stringify(d[k])).digest('hex').slice(0,10);
    console.log(qs.padEnd(22),'H',h('H'),'T',h('T'),'B',h('B'),'cidades',h('c'),'pois',h('p'));
    await page.close();
  }
  await br.close();srv.close();
})();
