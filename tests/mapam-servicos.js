'use strict';
// Foto do Mapa M com os serviços (cidade grande do tile): cd tests && node mapam-servicos.js -> tests/mapam-servicos.png
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);fs.readFile(path.join(ROOT,u==='/'?'index.html':u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});r.end(d)})});
srv.listen(0,'127.0.0.1',async()=>{const br=await chromium.launch(),errs=[];const page=await br.newPage({viewport:{width:1100,height:800}});
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html?mundo=1&seed=11&auto=1&mute=1&nivel=3');
await page.waitForFunction(()=>typeof G!=='undefined'&&G.running,null,{timeout:120000});await page.waitForTimeout(1500);
await page.evaluate(()=>{if(WM.open)wm3Close();closePanel();});await page.waitForTimeout(500);
await page.evaluate(()=>{STATE.phase='commander';G.office=null;wtX().turn='commander';wtX().inTile=WORLD.win.node;closePanel()});await page.keyboard.press('KeyM');await page.waitForTimeout(800);
const ok=await page.evaluate(()=>!!document.getElementById('bigmap'));
console.log('mapa aberto:',ok,JSON.stringify(await page.evaluate(()=>({p:G.panel,tab:typeof LB!=='undefined'&&LB.top,wm:WM.open,cities:WORLD.cities.map(c=>[!!cityBig(c),!!c.hall,!!c.warehouse,!!c.clinic])}))),'erros:',errs.join('|')||'nenhum');
const pos=await page.evaluate(()=>{const c=WORLD.home,cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W,p=c.warehouse;return{x:r.left+p.x*s*r.width/cv.width,z:r.top+p.z*s*r.height/cv.height}});
await page.mouse.move(pos.x,pos.z);await page.waitForTimeout(300);
console.log('dica:',JSON.stringify(await page.evaluate(()=>{const t=document.querySelector('.uitip');return t&&t.style.display!=='none'?t.textContent:null})));
await page.screenshot({path:path.join(__dirname,'mapam-servicos.png')});await br.close();srv.close();});
