const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const q of['','&niveis=0']){const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&seed=3&reserva=1'+q);
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
console.log(q,JSON.stringify(await p.evaluate(()=>{const c=WORLD.cities[0];const row=[];for(let x=-30;x<=-14;x++)row.push(H[(c.cz-54)*W+c.cx+x]-c.y);const r2=[];for(let x=-30;x<=-14;x++)r2.push(H[(c.cz-53)*W+c.cx+x]-c.y);return{y:c.y,mtn:c.mtn,row,r2}})));await p.close()}
await b.close();srv.close()})();
