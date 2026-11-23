const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=require('path').resolve(__dirname,'../..');
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;
const b=await chromium.launch(),p=await b.newPage();p.on('pageerror',e=>console.log('PAGEERR',e.message,(e.stack||'').split('\n').slice(0,4).join(' | ')));
p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
await p.goto(base+'/index.html?auto=1&mute=1&seed=11');await p.waitForTimeout(20000);await b.close();srv.close()})();
