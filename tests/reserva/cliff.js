const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=require('path').resolve(__dirname,'../..'),seeds=process.argv.slice(2);
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const seed of seeds){const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed);
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
const r=await p.evaluate(()=>{let cliffs=0;
 for(const c of WORLD.cities){const R=c.half+22;for(let z=-R;z<R;z++)for(let x=-R;x<R;x++){const i=(c.cz+z)*W+c.cx+x,h=H[i];
  if(h>=SEA+1&&H[i+1]>=SEA+1&&Math.abs(h-H[i+1])>=3)cliffs++;if(h>=SEA+1&&H[i+W]>=SEA+1&&Math.abs(h-H[i+W])>=3)cliffs++;
  // paredão na água: terra alta ao lado de água
  if(h>=SEA+4&&(H[i+1]<SEA||H[i-1]<SEA||H[i+W]<SEA||H[i-W]<SEA))cliffs+=1}}
 let gap=0,nb=0;for(const br of WORLD.bridges){nb++;for(const t of [br.tiles[0],br.tiles[br.tiles.length-1]]){const k=t.z*W+t.x;
  for(const [dx,dz] of[[3,0],[-3,0],[0,3],[0,-3]]){const k2=(t.z+dz)*W+t.x+dx;if(T[k2]===0&&H[k2]>=SEA+1&&Math.abs(H[k2]-H[k])>=3)gap++}}}
 return{cliffs,bridges:nb,bridgeEndGaps:gap,cities:WORLD.cities.length}});
console.log(seed,JSON.stringify(r));await p.close()}
await b.close();srv.close()})();
