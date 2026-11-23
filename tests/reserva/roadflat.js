// mede desníveis dentro da faixa da estrada: pares de blocos T_ROAD vizinhos com altura diferente. node reserva/roadflat.js <sementes>
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const seed of process.argv.slice(2)){const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&reserva=1&seed='+seed);
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
console.log(seed,JSON.stringify(await p.evaluate(()=>{let cells=0,diff=0,big=0;
 for(let z=2;z<W-2;z++)for(let x=2;x<W-2;x++){const i=z*W+x;if(T[i]!==1)continue;cells++;for(const o of[1,W]){if(T[i+o]!==1)continue;const d=Math.abs(H[i]-H[i+o]);if(d)diff++;if(d>1)big++}}
 return{cells,diff,big,ratio:+(diff/cells).toFixed(3)}})));await p.close()}
await b.close();srv.close()})();
