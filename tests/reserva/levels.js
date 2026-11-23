// Fase 6: mede as cidades multiníveis. node reserva/levels.js <semente...>  (RES=0 para o gerador antigo)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),seeds=process.argv.slice(2),q=process.env.RES==='0'?'':process.env.RES==='n'?'&reserva=1&niveis=0':'&reserva=1';
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const seed of seeds){const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(String(e)));
await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed+q);
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
const r=await p.evaluate(()=>WORLD.cities.map(c=>{
  let lo=0,hi=0,steps2=0,stepsStreet=0,n=0;const Hc=c.half,N=2*Hc+1;
  if(c.lv)for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){const k=(z+Hc)*N+x+Hc;if(!c.foot[k])continue;n++;lo=Math.min(lo,c.lv[k]);hi=Math.max(hi,c.lv[k]);
    const i=(c.cz+z)*W+c.cx+x;for(const o of[1,W,W+1,W-1]){const j=i+o,d=Math.abs(H[i]-H[j]);if(d>1&&cityLv&&c.foot[k]){steps2++;if(T[i]===2||T[j]===2||T[i]===3)stepsStreet++}}}
  // casas: a base da primeira caixa de colisão sob o prédio deve estar no chão
  let off=0,nh=0,nonflat=0,sunk=0;for(const h of (c.houses||[])){if(h.bh===undefined)continue;nh++;
    let hmin=1e9,hmax=-1e9;for(let z=h.z0;z<=h.z1;z++)for(let x=h.x0;x<=h.x1;x++){const v=H[(c.cz+z)*W+c.cx+x];hmin=Math.min(hmin,v);hmax=Math.max(hmax,v)}
    if(hmax!==hmin)nonflat++;
    const bs=Col.near(c.cx+h.x0,c.cz+h.z0,c.cx+h.x1+1,c.cz+h.z1+1).filter(b=>b.y1>hmin&&b.y0<hmax+8);
    if(!bs.length)continue;const lo=Math.min(...bs.map(b=>b.y0));if(lo>hmax+0.2)off++;if(lo<hmin-5)sunk++}
  // conexão: BFS na grade de navegação (NAV.blocked e degrau <= 1) a partir da praça; fração dos pontos de passeio alcançados
  let reach=0;{const seen=new Uint8Array(W*W),w0=c.walk[0],st=[[Math.floor(w0.x),Math.floor(w0.z)]];seen[Math.floor(w0.z)*W+Math.floor(w0.x)]=1;const lim=c.half+8;
    while(st.length){const [x,z]=st.pop();for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const a=x+dx,b=z+dz,k=b*W+a;if(Math.abs(a-c.cx)>lim||Math.abs(b-c.cz)>lim||seen[k]||NAV.blocked[k]||Math.abs(H[k]-H[z*W+x])>1)continue;seen[k]=1;st.push([a,b])}}
    for(const w of c.walk)if(seen[Math.floor(w.z)*W+Math.floor(w.x)])reach++;reach=Math.round(100*reach/Math.max(1,c.walk.length))}
  return{reach,id:c.id,lv:c.lv?[lo,hi]:null,steps2,stepsStreet,houses:nh,floating:off,nonflat,sunk,y:c.y}}));
console.log(seed,errs.length?'ERROS '+errs[0]:'ok',JSON.stringify(r));await p.close()}
await b.close();srv.close()})();
