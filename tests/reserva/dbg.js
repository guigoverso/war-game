const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&seed='+(process.argv[3]||3)+'&reserva=1'+(process.argv[2]||''));
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
console.log(JSON.stringify(await p.evaluate(CI=>{const c=WORLD.cities[CI],Hc=c.half,N=2*Hc+1,out=[];
 for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){const i=(c.cz+z)*W+c.cx+x;if(!c.foot[(z+Hc)*N+x+Hc])continue;for(const o of[1,W]){const d=Math.abs(H[i]-H[i+o]);if(d>1)out.push([x,z,o===1?'x':'z',d,T[i],T[i+o],c.foot[(z+Hc)*N+x+Hc],cityLv(c,x,z),cityLv(c,x+(o===1?1:0),z+(o===1?0:1)),c.lvLock&&c.lvLock[(z+Hc)*N+x+Hc],c.lvLock&&c.lvLock[(z+(o===1?0:1)+Hc)*N+x+(o===1?1:0)+Hc],c.lvEdge[(z+Hc)*N+x+Hc]])}}
 return {half:Hc,n:out.length,s:out.slice(0,25)}},+(process.argv[4]||1))));
await b.close();srv.close()})();
