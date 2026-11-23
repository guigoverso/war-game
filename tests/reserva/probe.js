// Sonda: node reserva/probe.js <semente> <x> <z> (RES=1): o que há ao redor do ponto (T, bioma, POIs, clareiras, dormentes)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),[seed,x0,z0]=process.argv.slice(2).map(Number);
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const b=await chromium.launch(),p=await b.newPage();
await p.goto('http://127.0.0.1:'+srv.address().port+'/index.html?auto=1&mute=1&seed='+seed+(process.env.RES?'&reserva=1':''));
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:240000});
console.log(JSON.stringify(await p.evaluate(([x0,z0])=>{const near=(a,r)=>(a||[]).filter(q=>Math.hypot((q.cx??q.x)-x0,(q.cz??q.z)-z0)<r).map(q=>(q.type||q.kind||q.name||'?')+'@'+(q.cx??q.x)+','+(q.cz??q.z)+' r'+(q.r||q.half||''));
 const row=[];for(let dz=-20;dz<=20;dz+=5){let s='';for(let dx=-20;dx<=20;dx+=5){const i=(z0+dz)*W+x0+dx;s+=H[i]+'/'+T[i]+'/'+B[i]+' '}row.push(s)}
 return{pois:near(WORLD.pois,60),sites:near(WORLD.warSites,60),dorm:near(WORLD.dormant,60),camps:near(WORLD.camps,60),caves:near(WORLD.caves,60),grid:row}},[x0,z0])));
await b.close();srv.close()})();
