// Fase 4: quantas cidades têm água perto (distância da borda da cidade até a água). RES=1 node reserva/water.js <sementes>
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),seeds=process.argv.slice(2);
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port,b=await chromium.launch();
let tot=0,near=0,want=0;
for(const seed of seeds){const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed+(process.env.RES?'&reserva=1':''));
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:240000});
const r=await p.evaluate(()=>WORLD.cities.map(c=>{let best=999;const R=c.half+60;for(let dz=-R;dz<=R;dz+=2)for(let dx=-R;dx<=R;dx+=2){
 const x=c.cx+dx,z=c.cz+dz;if(x<0||z<0||x>=W||z>=W||H[z*W+x]>=SEA)continue;let e=c.fdist?cityFootDist(c,x,z):255;if(e>=255)e=Math.max(0,Math.max(Math.abs(dx),Math.abs(dz))-c.half);if(e<best)best=e}
 return{want:!!c.wantWater,d:best}}));
console.log(seed,r.map(c=>(c.want?'A':'-')+c.d).join(' '));for(const c of r){tot++;if(c.d<=20)near++;if(c.want)want++}await p.close()}
console.log('cidades',tot,'com água a até 20 blocos da borda',near,'queriam água',want);await b.close();srv.close()})();
