'use strict';
// ---------- Teste da cidade enorme (sessão 4B; Node + Playwright, só para desenvolvimento) ----------
// Abre ?cenario=tile&tema=cidade para vários formatos/sementes, imprime tempo de geração, tamanho da pegada, casas, serviços, população e nav,
// e salva o minimapa (WORLD.mapCanvas) em tests/cidade-enorme-out/. Uso: cd tests && node cidade-enorme.js [semente:forma ...]   (ex.: 11:cruz 5:ele; sem forma = sorteio)
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..'),OUT=path.join(__dirname,'cidade-enorme-out');
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png'};
const serve=()=>new Promise(r=>{const s=http.createServer((q,res)=>{const f=path.join(ROOT,decodeURIComponent(q.url.split('?')[0]).replace(/^\/$/,'/index.html'));
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});res.end(d)})});s.listen(0,'127.0.0.1',()=>r(s))});
const args=process.argv.slice(2).length?process.argv.slice(2):['11:quadrado','11:circulo','11:cruz','11:ele','11:oval','11:flor','11:losango'];
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const srv=await serve(),base='http://127.0.0.1:'+srv.address().port,browser=await chromium.launch();
  for(const a of args){
    const [seed,forma,extra]=a.split(':'),page=await browser.newPage({viewport:{width:1280,height:800}}),errs=[];
    page.on('pageerror',e=>errs.push(e.message));page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    const t0=Date.now();
    await page.goto(base+'/index.html?cenario=tile&tema=cidade&auto=1&mute=1&seed='+seed+(forma?'&forma_cidade='+forma:'')+(extra?'&'+extra:''));
    let why='';
    try{await page.waitForFunction(()=>typeof G!=='undefined'&&G.running&&typeof WORLD!=='undefined'&&WORLD.win&&WORLD.cities.length&&WORLD.cities[0].buildMs!==undefined,null,{timeout:120000})}catch(e){why='não carregou: '+errs.slice(0,3).join(' | ')}
    const ms=Date.now()-t0;
    if(why){console.log(a,why);await page.close();continue}
    await page.waitForTimeout(800);
    const r=await page.evaluate(()=>{const c=WORLD.cities[0];let n=0,N=2*c.half+1;if(c.foot)for(let i=0;i<c.foot.length;i++)n+=c.foot[i];
      const st={};for(const k of['hall','store','tavern','warehouse','shop','clinic','chapel','barracks'])st[k]=c[k]?1:0;
      return{shape:c.shape,half:c.half,half0:c.half0,fill:+(n/(W*W)).toFixed(3),footArea:n,houses:(c.houses||[]).length,streets:(c.streets||[]).length,walk:c.walk.length,
        towers:c.towers.length,build:c.buildMs,reserve:WORLD.reserve,npcs:NPCS.length,enemies:ENEMIES.length,allies:ALLIES.length,cols:Col.all.length,svc:Object.values(st).join(''),rej:c.rej,
        gedge:c.gedge,gland:c.gland,wall:c.wallType,nan:isNaN(P.x+P.z+P.y)}});
    r.perf=await page.evaluate(async()=>{   // nav e quadros (Chromium sem placa de vídeo: vale só para comparar com ?cidade=1)
      const t=performance.now();buildNav();const nav=Math.round(performance.now()-t);
      const t0=performance.now();let n=0;await new Promise(res=>{const f=()=>{if(++n>=90)res();else requestAnimationFrame(f)};requestAnimationFrame(f)});
      G.panel=null;const tu=performance.now();for(let i=0;i<120;i++)update(1/60);const upd=+((performance.now()-tu)/120).toFixed(2);   // custo médio de um update (NPCs, aliados, IA)
      return{navMs:nav,updMs:upd,fps:+(n/((performance.now()-t0)/1000)).toFixed(1),calls:renderer.info.render.calls}});
    if(process.env.FULL)console.log(a,'→',ms+' ms (total), build '+r.build+' ms',JSON.stringify(r));
    else console.log(a.padEnd(26),ms+' ms | build '+r.build+' | caixa '+r.half+' | pegada '+(r.fill*100).toFixed(0)+'% | casas '+r.houses+' | torres '+r.towers+' | npcs '+r.npcs+' alia '+r.allies+' | serv '+r.svc+' | nav '+r.perf.navMs+' ms, update '+r.perf.updMs+' ms | '+r.perf.fps+' fps'+(r.nan?' | JOGADOR NAN':''));
    if(errs.length)console.log('  ERROS:',errs.slice(0,4));
    const url=await page.evaluate(()=>{   // minimapa + a pegada da cidade em vermelho translúcido (contorno mais forte) e as praças em amarelo
      const src=WORLD.mapCanvas,cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;const g=cv.getContext('2d');g.drawImage(src,0,0);
      const c=WORLD.cities[0],Hc=c.half,N=2*Hc+1,k=src.width/W;
      for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
        if(!c.foot[(z+Hc)*N+x+Hc])continue;
        const edge=[[1,0],[-1,0],[0,1],[0,-1]].some(d=>{const a=x+d[0],b=z+d[1];return a<-Hc||a>Hc||b<-Hc||b>Hc||!c.foot[(b+Hc)*N+a+Hc]});
        g.fillStyle=edge?'rgba(255,0,0,.95)':'rgba(255,0,0,.12)';g.fillRect((c.cx+x)*k,(c.cz+z)*k,k,k);
      }
      g.fillStyle='#ff0';g.fillRect((c.cx-2)*k,(c.cz-2)*k,5*k,5*k);
      return cv.toDataURL('image/png')});
    fs.writeFileSync(path.join(OUT,(forma||'sorteio')+'-'+seed+(extra?'-'+extra.replace(/[^a-z0-9]+/gi,'_'):'')+'.png'),Buffer.from(url.split(',')[1],'base64'));
    if(process.env.SHOT){   // foto aérea (noclip, olhando para baixo) da cidade
      await page.click('text=Continuar').catch(()=>{});await page.waitForTimeout(500);
      await page.evaluate(()=>{const c=WORLD.cities[0];G.noclip=true;P.x=c.cx;P.z=c.cz+95;P.y=c.y+75;P.camY=P.y;P.yaw=0;P.pitch=-0.55;P.vx=P.vz=P.vy=0});
      await page.waitForTimeout(1500);await page.screenshot({path:path.join(OUT,(forma||'sorteio')+'-'+seed+'-3d.png')});
    }
    await page.close();
  }
  await browser.close();srv.close();
})();
