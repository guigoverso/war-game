// Mede pontes e estradas (fase 2 da feature 7). Uso (de dentro de tests/): [RES=1] [DETAIL=1] node reserva/bridges.js <semente...>
// Por semente: pontes; pontes que dividem tabuleiro com outra; degraus no tabuleiro (vizinhos de ponte com altura diferente);
// buracos (água cercada de tabuleiro); trocas de tipo ao longo da ponte (terra, pedra, terra...); pontas no ar (cabeceira que não encosta em chão);
// cidades sem estrada até um portão aberto.
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('../node_modules/playwright');
const ROOT=path.resolve(__dirname,'../..'),seeds=process.argv.slice(2);
const srv=http.createServer((req,res)=>{const u=decodeURIComponent(req.url.split('?')[0]),f=path.join(ROOT,u==='/'?'index.html':u);
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':path.extname(f)==='.js'?'text/javascript':path.extname(f)==='.html'?'text/html':'application/octet-stream'});res.end(d)})});
(async()=>{await new Promise(r=>srv.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+srv.address().port;const b=await chromium.launch();
for(const seed of seeds){const p=await b.newPage();p.on('pageerror',e=>console.log('ERRO',e.message));
  await p.goto(base+'/index.html?auto=1&mute=1&seed='+seed+(process.env.RES?'&reserva=1':''));
  await p.waitForFunction(()=>typeof G!=='undefined'&&G.running&&Array.isArray(WORLD.pois),null,{timeout:180000});
  const r=await p.evaluate(detail=>{
    const sH=WORLD.snap.H,sT=WORLD.snap.T,BT=WORLD.bt,isB=k=>sT[k]===T_BRIDGE,isWB=k=>isB(k)&&BT.has(k)&&BT.get(k).h0<SEA;
    let steps=0,holes=0,alt=0,air=0,shared=0;const det=[];
    const seen=new Map();
    for(const br of WORLD.bridges){for(const t of br.tiles){const k=t.z*W+t.x;if(seen.has(k)&&seen.get(k)!==br.id){shared++;break}seen.set(k,br.id)}}
    for(let z=2;z<W-2;z++)for(let x=2;x<W-2;x++){const k=z*W+x;
      if(isWB(k)){
        for(const d of[1,W]){const k2=k+d;if(isB(k2)&&Math.abs(sH[k]-sH[k2])>=1){steps++;if(detail)det.push(['step',x,z,sH[k],sH[k2]])}}
        for(const d of[1,-1,W,-W]){const k2=k+d;if(!isB(k2)&&sT[k2]!==T_ROAD&&sH[k2]>=SEA&&Math.abs(sH[k2]-sH[k])>=2&&BT.has(k)&&false)air++}
      }else if(sH[k]<SEA&&!isB(k)){
        const n=(isWB(k-1)?1:0)+(isWB(k+1)?1:0)+(isWB(k-W)?1:0)+(isWB(k+W)?1:0);
        if(n>=3||(isWB(k-1)&&isWB(k+1))||(isWB(k-W)&&isWB(k+W))){holes++;if(detail)det.push(['hole',x,z])}
      }
    }
    for(const br of WORLD.bridges){   // trocas de tipo ao longo da ponte: esperado terra... água... terra (cabeceira nas pontas)
      let prev=null,ch=0;const tl=br.tiles.slice();while(tl.length&&sT[tl[0].z*W+tl[0].x]!==T_BRIDGE)tl.shift();while(tl.length&&sT[tl[tl.length-1].z*W+tl[tl.length-1].x]!==T_BRIDGE)tl.pop();for(const t of tl){const k=t.z*W+t.x,ty=sT[k]===T_BRIDGE?(sH[k]<SEA||BT.has(k)&&BT.get(k).h0<SEA?'w':'h'):'o';if(ty!==prev)ch++;prev=ty}
      if(ch>3){alt++;if(detail)det.push(['alt',br.id,br.tiles[0].x,br.tiles[0].z,ch])}
      // ponta no ar: primeira/última cabeceira com altura distante do chão natural ao lado
      for(const t of[br.tiles[0],br.tiles[br.tiles.length-1]]){const k=t.z*W+t.x;
        let ok=false;for(const [dx,dz] of[[4,0],[-4,0],[0,4],[0,-4]]){const k2=(t.z+dz)*W+t.x+dx;if(sH[k2]>=SEA+1&&Math.abs(sH[k2]-sH[k])<=2)ok=true}
        if(!ok){air++;if(detail)det.push(['ar',t.x,t.z])}}
    }
    // cada cidade precisa de estrada até um portão aberto: T_ROAD ou T_BRIDGE a até 6 blocos da borda no eixo do portão
    let noRoad=0;for(const c of WORLD.cities){let any=false;
      for(const g of c.gates){const [x,z]=cityGatePos(c,g.dir,3);if(sT[z*W+x]===T_ROAD||sT[z*W+x]===T_BRIDGE)any=true}
      if(!any)noRoad++}
    return{bridges:WORLD.bridges.length,shared,steps,holes,alt,air,noRoad,cities:WORLD.cities.length,det:det.slice(0,12)}
  },!!process.env.DETAIL);
  console.log(seed,JSON.stringify(r));await p.close()}
await b.close();srv.close()})();
