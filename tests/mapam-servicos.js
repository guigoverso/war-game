'use strict';
// Foto do Mapa M com os serviços (cidade grande do tile): cd tests && node mapam-servicos.js -> tests/mapam-servicos.png
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);fs.readFile(path.join(ROOT,u==='/'?'index.html':u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});r.end(d)})});
srv.listen(0,'127.0.0.1',async()=>{const br=await chromium.launch(),errs=[];const page=await br.newPage({viewport:{width:1100,height:800}});
page.on('pageerror',e=>errs.push(e.message));
await page.goto('http://127.0.0.1:'+srv.address().port+'/index.html?cenario=tile&tema=cidade&seed=11&auto=1&mute=1');
await page.waitForFunction(()=>typeof G!=='undefined'&&G.running,null,{timeout:120000});await page.waitForTimeout(1500);
await page.evaluate(()=>{closePanel();STATE.phase='commander'});
await page.keyboard.press('KeyM');await page.waitForTimeout(800);
const ok=await page.evaluate(()=>!!document.getElementById('bigmap'));
console.log('mapa aberto:',ok,'erros:',errs.join('|')||'nenhum');
await page.screenshot({path:path.join(__dirname,'mapam-servicos.png')});await br.close();srv.close();});
