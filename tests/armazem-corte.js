'use strict';
// Diagnóstico: o que separa o armazém da prefeitura (inundação da grade de navegação). Uso: cd tests && node armazem-corte.js [url extra] -> imprime o tile e os blocos que cortam
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);fs.readFile(path.join(ROOT,u==='/'?'index.html':u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});r.end(d)})});
const CX=+process.env.CX||312,CZ=+process.env.CZ||290;
const FN=`(()=>{const c=WORLD.home,BL=navGrid(false);
 const flood=(sx,sz)=>{const seen=new Uint8Array(W*W),q=[sz*W+sx];seen[q[0]]=1;for(let i=0;i<q.length;i++){const u=q[i],ux=u%W,uz=(u/W)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=ux+dx,z=uz+dz,v=z*W+x;if(x<2||z<2||x>W-3||z>W-3||seen[v]||BL[v])continue;if(Math.abs(H[v]-H[u])>1)continue;seen[v]=1;q.push(v)}}return seen};
 const o=c.hallOut,A=flood(Math.floor(o.x),Math.floor(o.z));let tot=0,inA=0;const bad=[];
 for(let z=3;z<W-3;z++)for(let x=3;x<W-3;x++){const k=z*W+x;if((T[k]===T_STREET)&&!BL[k]){tot++;if(A[k])inA++;else bad.push([x,z])}}
 return{node:WORLD.win.node,tot,inA,bad:bad.length,first:bad.slice(0,3),wh:c.warehouse&&[c.warehouse.x,c.warehouse.z]}})()`;
srv.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+srv.address().port,br=await chromium.launch();
const page=await br.newPage({viewport:{width:1100,height:700}});
await page.goto(base+'/index.html?mundo=1&auto=1&mute=1&seed=11&cidade=1&armazem=1&nivel=5');
await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&WM.open,null,{timeout:240000});await page.waitForTimeout(1500);
console.log(JSON.stringify(await page.evaluate(FN),null,0));
const o=await page.evaluate(()=>{const n=wtGraph().nodes.filter(n=>n.tema==='cidade'&&!n.home)[0].id;batMove(wtActive(),wtKey(n));wtX().inTile=n;wtX().turn='commander';mundoGo(n,-1,'x');return n});
await page.waitForFunction(id=>WORLD.win&&WORLD.win.node===id,o,{timeout:240000});await page.waitForTimeout(2000);console.log(JSON.stringify(await page.evaluate(FN),null,0));
await br.close();srv.close();});
