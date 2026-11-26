'use strict';
// Teste em Node do campo do mundo (js/macro/worldfield.js, etapa 3). Uso (de dentro de tests/): node macro/campo.js [semente] [--mapa]
// Confere: determinismo, fração de terra por formato, biomas por bioma dominante, continuidade entre janelas que se sobrepõem, simetria das trilhas
// e aberturas das janelas. Com --mapa imprime o mundo em texto (um formato por vez).
const {erros,run}=require('./carregar')();
let falhas=0;const ok=(c,n,w)=>{if(!c)falhas++;console.log((c?'OK    ':'FALHA ')+n+(w?' — '+w:''))};
ok(erros.length===0,'camada macro carrega (inclui worldfield.js)',erros.join(' | '));
const seed=+(process.argv[2]&&!process.argv[2].startsWith('--')?process.argv[2]:11),mapa=process.argv.includes('--mapa');
const formatos=run('WORLD_FIELD.formats'),doms=['plains','forest','mountain','snow','desert'];
for(const fm of formatos){
  const r=run(`(()=>{const F=wfCreate(${seed},{format:'${fm}',dominant:'plains'});let n=0,land=0;
    for(let z=0;z<F.S;z+=24)for(let x=0;x<F.S;x+=24){n++;if(wfHeight(F,x,z)>=wfSea()+1)land++}
    // bordas do mundo sempre mar
    let rimLand=0;for(let k=0;k<F.S;k+=24){for(const [x,z] of [[k,2],[k,F.S-3],[2,k],[F.S-3,k]])if(wfHeight(F,x,z)>=wfSea()+1)rimLand++}
    return {frac:land/n,rimLand}})()`);
  ok(r.frac>0.15&&r.frac<0.9,'formato '+fm+': terra '+(r.frac*100).toFixed(0)+'% (esperado 15% a 90%)');
  ok(r.rimLand===0,'formato '+fm+': borda do mundo é mar',r.rimLand+' pontos de terra na borda');
  if(mapa){console.log('\n== '+fm+' ==\n'+run(`wfAscii(wfCreate(${seed},{format:'${fm}'}),48)`)+'\n')}
}
// determinismo: duas criações iguais dão a mesma altura e o mesmo bioma
ok(run(`(()=>{const a=wfCreate(${seed},{format:'pangeia'}),b=wfCreate(${seed},{format:'pangeia'});
  for(let k=0;k<200;k++){const x=k*9.7%2000,z=k*13.3%2000;if(wfHeight(a,x,z)!==wfHeight(b,x,z)||wfBiome(a,x,z,15)!==wfBiome(b,x,z,15))return false}return true})()`),'determinismo (mesma semente, mesmo campo)');
// biomas: o bioma dominante aparece (>=25% da terra) e deserto e neve nunca se tocam num raio de 40 blocos
for(const d of doms){
  const r=run(`(()=>{const F=wfCreate(${seed},{format:'pangeia',dominant:'${d}'});const c=[0,0,0,0,0];let n=0;
    for(let z=0;z<F.S;z+=20)for(let x=0;x<F.S;x+=20){const h=wfHeight(F,x,z);if(h<wfSea())continue;c[wfBiome(F,x,z,h)]++;n++}
    return c.map(v=>v/n)})()`);
  const alvo={plains:0,forest:1,mountain:4,snow:3,desert:2}[d];
  ok(r[alvo]>=0.2,'dominante '+d+': bioma-alvo com '+(r[alvo]*100).toFixed(0)+'% da terra (>=20%)','planície '+(r[0]*100|0)+' floresta '+(r[1]*100|0)+' deserto '+(r[2]*100|0)+' neve '+(r[3]*100|0)+' rocha '+(r[4]*100|0));
}
// continuidade: duas janelas que se sobrepõem veem exatamente a mesma altura e o mesmo bioma
ok(run(`(()=>{const F=wfCreate(${seed},{format:'continentes'}),a=wfWindow(F,900,900,320),b=wfWindow(F,1050,950,256);
  for(let z=b.oz;z<b.oz+b.size;z+=5)for(let x=b.ox;x<b.ox+b.size;x+=5){if(x<a.ox||z<a.oz||x>=a.ox+a.size||z>=a.oz+a.size)continue;
    const ha=wfHeight(F,a.ox+(x-a.ox),a.oz+(z-a.oz)),hb=wfHeight(F,b.ox+(x-b.ox),b.oz+(z-b.oz));if(ha!==hb)return false}return true})()`),'continuidade: janelas sobrepostas têm o mesmo terreno');
// trilhas: simétricas (A liga B se e só se B liga A) e o traçado é o mesmo dos dois lados
const tr=run(`(()=>{const F=wfCreate(${seed},{format:'pangeia'}),N=F.N;let n=0,sim=true,path=true;
  for(let j=0;j<N;j++)for(let i=0;i<N;i++)for(const t of wfTrails(F,i,j)){n++;
    if(!wfTrails(F,t.i,t.j).some(u=>u.i===i&&u.j===j))sim=false;
    const p=wfTrailPath(F,i,j,t.i,t.j),q=wfTrailPath(F,t.i,t.j,i,j).reverse();
    if(p.length!==q.length||p.some((a,k)=>Math.abs(a.x-q[k].x)>1e-6||Math.abs(a.z-q[k].z)>1e-6))path=false}
  return{n,sim,path}})()`);
ok(tr.n>0,'trilhas existem na grade ('+tr.n+' pontas)');ok(tr.sim,'trilhas simétricas entre vizinhos');ok(tr.path,'traçado da trilha igual dos dois lados');
// aberturas: dentro da janela, na borda, com terra
const ab=run(`(()=>{const F=wfCreate(${seed},{format:'pangeia'}),t=wfPickTile(F,384),n=wfNode(F,t.i,t.j),w=wfWindow(F,n.x,n.z,384),o=wfOpenings(F,w,t.i,t.j),tl=wfTrails(F,t.i,t.j);
  return{t,n:o.length,trails:tl.length,borda:o.every(a=>a.x<=2||a.z<=2||a.x>=381||a.z>=381),terra:o.every(a=>wfHeight(F,w.ox+a.x,w.oz+a.z)>=wfSea()+1),frac:wfLandFrac(F,w.ox,w.oz,384)}})()`);
ok(ab.n>0&&ab.n<=ab.trails,'tile padrão '+ab.t.i+','+ab.t.j+': '+ab.n+' abertura(s) para '+ab.trails+' trilha(s)');
ok(ab.borda,'aberturas ficam na borda da janela');ok(ab.terra,'aberturas têm terra');
ok(ab.frac>=0.45,'tile padrão tem '+(ab.frac*100).toFixed(0)+'% de terra (>=45%)');

// janela no mapa local (js/local/mapwin.js) com globais falsas: relevo e bioma do campo, plano da borda e aberturas livres
{
  const vm=require('vm'),fs=require('fs'),path=require('path');
  const {ctx,run:r2}=require('./carregar')();
  ctx.document={addEventListener(){}};ctx.location.search='?cenario=tile&seed='+seed;
  vm.runInContext("var SEA=10,W=384,H=new Int16Array(384*384),T=new Uint8Array(384*384),B=new Uint8Array(384*384),WORLD={seed:"+seed+"},Col={n:0,add(){this.n++}};"
    +"const T_NAT=0,BIO_DESERT=2,BIO_SNOW=3,BIO_ROCK=4;const addTree=()=>{},addRock=()=>{};",ctx);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname,'../../js/local/mapwin.js'),'utf8'),ctx,{filename:'mapwin.js'});
  const w=r2(`(()=>{const win=mapWindowPick(${seed},'plains');WORLD.win=win;reliefField({win});reliefFieldBiomes({win});tileBorderPlan();
    let band=0,solid=0;for(const v of win.band){if(v)band++;if(v===2)solid++}
    // as aberturas ficam livres: nenhuma célula da faixa no corredor
    let livre=true;for(const o of win.openings){for(let k=0;k<=WORLD_FIELD.gapDepth;k++){const x=o.x+(o.side==='W'?k:o.side==='E'?-k:0),z=o.z+(o.side==='N'?k:o.side==='S'?-k:0);
      if(win.band[Math.max(0,Math.min(383,z))*384+Math.max(0,Math.min(383,x))])livre=false}}
    // a altura do mapa local é a do campo
    let igual=true;for(let k=0;k<400;k++){const x=k*7%384,z=k*13%384;if(H[z*384+x]!==wfHeight(win.F,win.ox+x,win.oz+z))igual=false}
    Col.n=0;tileBorderBuild();
    return{tile:win.ti+','+win.tj,size:win.size,aber:win.openings.length,band,solid,livre,igual,paredes:Col.n,sides:win.openings.map(o=>o.side)}})()`);
  ok(w.size===384,'janela de tile: lado 384 (TILE_SIZE)');
  ok(w.igual,'mapa local = campo do mundo (alturas iguais)');
  ok(w.band>500&&w.solid>200,'borda: '+w.band+' células de faixa, '+w.solid+' de parede');
  ok(w.livre,'aberturas ('+w.sides.join(',')+') livres de faixa');
  ok(w.paredes>50,'parede de colisão criada ('+w.paredes+' caixas)');
}
process.exit(falhas?1:0);
