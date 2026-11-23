// node reserva/dump.js <semente> <x> <z> [raio]: alturas (relativas ao mínimo) e tipos em volta de um ponto
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..');
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
const [seed,x,z,R]=process.argv.slice(2).map(Number);const p=await b.newPage();await p.goto(base+'/index.html?auto=1&mute=1&reserva=1&seed='+seed);
await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
console.log((await p.evaluate(([x,z,R])=>{const rows=[];for(let q=z-R;q<=z+R;q++){let r=String(q).padStart(4)+' ';for(let w=x-R;w<=x+R;w++){const i=q*W+w;r+=(T[i]===1?'R':T[i]===5?'B':T[i]===2?'s':'.')+String(H[i]).padStart(3)+' '}rows.push(r)}return rows},[x,z,R||8])).join('\n'));
await b.close();srv.close()})();
