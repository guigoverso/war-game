// Métricas dos POIs (fase 3): contagem por tipo, POIs no mar, plataforma desnivelada, dropados. RES=1 liga o modo reserva. Uso: RES=1 node reserva/pois.js <sementes>
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),seeds=process.argv.slice(2);
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const seed of seeds){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed+(process.env.RES?'&reserva=1':''));
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:240000});
const r=await p.evaluate(()=>{const cnt={};let sea=0,uneven=0,onRoad=0;const bad=[];
 for(const q of WORLD.pois){cnt[q.type]=(cnt[q.type]||0)+1;if(q.type==='bridge')continue;const r=POI_DEFS[q.type].r;
  if(H[q.cz*W+q.cx]<SEA+1)sea++;
  let mn=99,mx=-99;for(let dz=-r+2;dz<=r-2;dz+=2)for(let dx=-r+2;dx<=r-2;dx+=2){const h=H[(q.cz+dz)*W+q.cx+dx];if(h<mn)mn=h;if(h>mx)mx=h}
  if(mx-mn>6){uneven++;bad.push(q.type+'@'+q.cx+','+q.cz)}}
 return{n:WORLD.pois.length,cnt,sea,uneven,bad,res:WORLD.reserve||null}});
console.log(seed,JSON.stringify(r),errs.length?'ERROS: '+errs.join('|'):'');await p.close()}
await b.close();srv.close()})();
