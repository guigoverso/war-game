'use strict';
// Diagnóstico: o que separa o armazém da prefeitura (inundação da grade de navegação). Uso: cd tests && node armazem-corte.js [url extra] -> imprime o tile e os blocos que cortam
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);fs.readFile(path.join(ROOT,u==='/'?'index.html':u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});r.end(d)})});
const CX=+process.env.CX||312,CZ=+process.env.CZ||290;
const FN=`(()=>{const c=WORLD.home,rows=[],CX=280,CZ=304;
 for(let z=CZ-22;z<=CZ+22;z++){let r='';for(let x=CX-34;x<=CX+34;x++){const k=z*W+x,h=H[k];let bl=false,tall=0;
  for(const b of Col.near(x+0.3,z+0.3,x+0.7,z+0.7))if(b.x0<x+0.7&&b.x1>x+0.3&&b.z0<z+0.7&&b.z1>z+0.3&&b.y1>h+0.45&&b.y0<h+1.8){bl=true;tall=Math.max(tall,b.y1-b.y0)}
  r+=(x===CX&&z===CZ)?'P':bl?(tall>=5?'W':'#'):T[k]===T_STREET?'s':T[k]===T_PLAZA?'p':T[k]===T_FLOOR?'f':T[k]===T_ROAD?'r':'.'}rows.push(r)}
 return{node:WORLD.win.node,name:c.name,H:H[CZ*W+CX],wh:c.warehouse,hall:c.hall,rows}})()`;
srv.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+srv.address().port,br=await chromium.launch();
for(const q of process.argv.slice(2)){const page=await br.newPage({viewport:{width:900,height:600}});
await page.goto(base+'/index.html?'+q+'&auto=1&mute=1');
try{await page.waitForFunction(()=>typeof G!=='undefined'&&G.running,null,{timeout:120000});await page.waitForTimeout(1500);{const o=await page.evaluate(FN);console.log(q,o.node,o.name,o.H,JSON.stringify(o.wh),JSON.stringify(o.hall));console.log(o.rows.join(String.fromCharCode(10)))}}catch(e){console.log(q,'erro',e.message.slice(0,80))}await page.close()}
await br.close();srv.close();});
