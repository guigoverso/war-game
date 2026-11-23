'use strict';
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=require('path').resolve(__dirname,'../..'),OUT=process.argv[2],seed=process.argv[3],ids=process.argv.slice(4).map(Number);
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});
(async()=>{
  await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;
  const browser=await chromium.launch(),page=await browser.newPage();
  await page.goto(base+'/index.html?auto=1&mute=1&seed='+seed);
  await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&Array.isArray(WORLD.pois),null,{timeout:180000});
  for(const id of ids){
    const url=await page.evaluate(id=>{
      const c=WORLD.cities[id],Hc=c.half+6,N=2*Hc+1,k=5,cv=document.createElement('canvas');cv.width=cv.height=N*k;const g=cv.getContext('2d');
      const col={5:'#7a4a22',0:'#6fa45a',1:'#d8c080',2:'#999',3:'#ccc',4:'#a85a3a',6:'#8fcf6a',7:'#8a6a3a',8:'#d8b64a'};
      for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
        const wx=c.cx+x,wz=c.cz+z,h=H[wz*W+wx];let f=h<SEA+1?(T[wz*W+wx]===5?'#7a4a22':'#2f6fb5'):(col[T[wz*W+wx]]||'#f0f');
        if(!cityIn(c,x,z)&&h>=SEA+1)f=T[wz*W+wx]===0?'#4f7f3f':f;
        g.fillStyle=f;g.fillRect((x+Hc)*k,(z+Hc)*k,k,k)}
      g.fillStyle='rgba(20,20,20,0.85)';for(const b of (c.wall&&c.wall.cols)||[]){g.fillRect((b.x0-c.cx+Hc)*k,(b.z0-c.cz+Hc)*k,Math.max(k,(b.x1-b.x0)*k),Math.max(k,(b.z1-b.z0)*k))}g.fillStyle='#e8c040';for(const t of c.towers||[])g.fillRect((t.x-c.cx+Hc)*k-3,(t.z-c.cz+Hc)*k-3,7,7);g.fillStyle='#7a3a22';for(const r of c.houses||[])g.fillRect((r.x0+Hc)*k,(r.z0+Hc)*k,(r.x1-r.x0+1)*k,(r.z1-r.z0+1)*k);
      return cv.toDataURL('image/png')+'|'+JSON.stringify({wall:c.wallType,nt:(c.towers||[]).length,ge:c.gedge,po:c.poff,half:c.half,h0:c.half0,y:c.y,sea:SEA,ids:WORLD.cities.length})},id);
    const [u,info]=url.split('|');console.log(id,info);fs.writeFileSync(path.join(OUT,'plan-'+seed+'-'+id+'.png'),Buffer.from(u.split(',')[1],'base64'));
  }
  await browser.close();srv.close();
})();
