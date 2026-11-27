'use strict';
// Diagnóstico: onde ficam o armazém e a casa que pode tampar o caminho, nas cidades do cenário cidade-2 (seed 11). Uso: cd tests && node armazem-acesso.js
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png'};
const srv=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);fs.readFile(path.join(ROOT,u==='/'?'index.html':u),(e,d)=>{if(e){r.writeHead(404);return r.end()}r.writeHead(200,{'Content-Type':MIME[path.extname(u)]||'application/octet-stream'});r.end(d)})});
srv.listen(0,'127.0.0.1',async()=>{const base='http://127.0.0.1:'+srv.address().port,br=await chromium.launch();
const page=await br.newPage({viewport:{width:1100,height:700}});
await page.goto(base+'/index.html?mundo=1&auto=1&mute=1&seed=11&cidade=1&armazem=1&nivel=5');
await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&WM.open,null,{timeout:240000});await page.waitForTimeout(1500);
const info=()=>page.evaluate(()=>{const c=WORLD.home,BL=navGrid(false);
  // inundação (passos de 1 de altura) a partir do centro da cidade: o ponto do armazém é alcançável?
  const seen=new Uint8Array(W*W),o=c.hallOut||{x:c.cx,z:c.cz},q=[Math.floor(o.z)*W+Math.floor(o.x)];seen[q[0]]=1;
  for(let i=0;i<q.length;i++){const u=q[i],ux=u%W,uz=(u/W)|0;for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const x=ux+dx,z=uz+dz,v=z*W+x;if(x<2||z<2||x>W-3||z>W-3||seen[v]||BL[v])continue;if(Math.abs(navH(false,v)-navH(false,u))>1)continue;seen[v]=1;q.push(v)}}
  const w=c.warehouse,wk=w?Math.floor(w.z)*W+Math.floor(w.x):-1,near=[];if(w)for(let r=0;r<=2;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const k=(Math.floor(w.z)+dz)*W+Math.floor(w.x)+dx;if(seen[k])near.push(r)}
  const map=[];if(w)for(let dz=-20;dz<=14;dz++){let r='';for(let dx=-30;dx<=18;dx++){const k=(Math.floor(w.z)+dz)*W+Math.floor(w.x)+dx;r+=(dz===0&&dx===0)?'W':BL[k]?(T[k]===T_STREET||T[k]===T_PLAZA?'X':'#'):seen[k]?'.':T[k]===T_STREET?'S':T[k]===T_FLOOR?'f':'o'}map.push(r)}
  const bx=new Set();if(w)for(let dz=-20;dz<=14;dz++)for(let dx=-30;dx<=18;dx++){const x=Math.floor(w.x)+dx,z=Math.floor(w.z)+dz,k=z*W+x;if(BL[k]&&(T[k]===T_STREET||T[k]===T_PLAZA))for(const b of Col.all)if(b.x0-0.4<=x+0.5&&b.x1+0.4>=x+0.5&&b.z0-0.4<=z+0.5&&b.z1+0.4>=z+0.5&&b.y1>H[k]+0.45&&b.y0<H[k]+1.8)bx.add(JSON.stringify(Object.assign({},b,{s:undefined,H:H[k]})))}
  const dbg=[];for(const [x,z] of [[283,307],[284,308],[283,309]]){const k=z*W+x;dbg.push({x,z,bl:BL[k],t:T[k],h:H[k],boxes:Col.all.filter(b=>b.x0-1<=x&&b.x1+1>=x&&b.z0-1<=z&&b.z1+1>=z).map(b=>[b.x0,b.x1,b.z0,b.z1,b.y0,b.y1].map(v=>Math.round(v*10)/10).join(','))})}
  return{dbg,bx:[...bx],map,node:WORLD.win.node,wh:w&&{x:w.x,z:w.z},reach:near.length>0,flood:q.length,ctr:[c.cx,c.cz],half:c.half}});
{const i=await info();console.log(i.map.join(String.fromCharCode(10)));delete i.map;console.log(JSON.stringify(i.dbg));console.log(JSON.stringify(i))}
const o=await page.evaluate(()=>{const n=wtGraph().nodes.filter(n=>n.tema==='cidade'&&!n.home)[0].id;batMove(wtActive(),wtKey(n));wtX().inTile=n;wtX().turn='commander';mundoGo(n,-1,'x');return n});
await page.waitForFunction(id=>WORLD.win&&WORLD.win.node===id,o,{timeout:240000});await page.waitForTimeout(2000);{const i=await info();console.log(i.map.join(String.fromCharCode(10)));delete i.map;console.log(JSON.stringify(i))}
await br.close();srv.close();});
