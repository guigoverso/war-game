// Fase 5: rios desenhados. RES=1 node reserva/rivers.js <pastaSaida> <sementes>  (imprime por rio: comprimento, buracos no leito, se chega ao mar; salva mapa-rio-<semente>.png)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),out=process.argv[2],seeds=process.argv.slice(3);fs.mkdirSync(out,{recursive:true});
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port,b=await chromium.launch();
for(const seed of seeds){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
const t0=Date.now();await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed+(process.env.RES?'&reserva=1':''));
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:240000});
const r=await p.evaluate(()=>{const R=WORLD.rivers||[];return R.map(pts=>{let gaps=0,len=0,dry=0;
 for(let k=0;k<pts.length;k++){const q=pts[k];if(k)len+=Math.hypot(q.x-pts[k-1].x,q.z-pts[k-1].z);
  if(len>45&&T[(q.z|0)*W+(q.x|0)]!==T_BRIDGE){const h=H[(q.z|0)*W+(q.x|0)];if(h>=SEA){gaps++;}}}
 const e=pts[pts.length-1];return{len:Math.round(len),gaps,mouthWater:H[(e.z|0)*W+(e.x|0)]<SEA,cross:WORLD.cities.filter(c=>pts.some(q=>cityIn&&cityIn(c,q.x|0,q.z|0))).length}})});
console.log(seed,'dom',await p.evaluate(()=>WORLD.dominant),'rios',JSON.stringify(r),'seg',((Date.now()-t0)/1000).toFixed(0),errs.length?'ERROS '+errs[0]:'');
await p.evaluate(()=>{});const d=await p.evaluate(()=>document.getElementById('map-canvas')?1:0);
const png=await p.evaluate(()=>{try{return WORLD.mapCanvas.toDataURL('image/png')}catch(e){return null}});
if(png&&png.length>100)fs.writeFileSync(path.join(out,'mapa-rio-'+seed+'.png'),Buffer.from(png.split(',')[1],'base64'));
await p.close()}
await b.close();srv.close()})();
