'use strict';
// ---------- Geração procedural do mundo ----------
const T_NAT=0,T_ROAD=1,T_STREET=2,T_PLAZA=3,T_FLOOR=4,T_BRIDGE=5,T_GARDEN=6,T_SOIL=7,T_WHEAT=8;
const BIO_PLAINS=0,BIO_FOREST=1,BIO_DESERT=2,BIO_SNOW=3,BIO_ROCK=4;
const WORLD={cities:[],seed:0,home:null,chunkMeshes:[],mapCanvas:null,windmills:[]};
const CHUNKS=[];
function chunkOf(x,z){const cx=clamp(Math.floor(x/CHK),0,NCH-1),cz=clamp(Math.floor(z/CHK),0,NCH-1);return CHUNKS[cz*NCH+cx]}
// Caixa estática (malha + colisão opcional) em coordenadas de mundo
// captura: quando definida, as caixas vão para uma malha própria (removível) em vez da malha do chunk
let BX_CAP=null;
function Bx(x0,y0,z0,x1,y1,z1,color,col,o){
  if(BX_CAP){BX_CAP.batch.box(x0,y0,z0,x1,y1,z1,color,o);if(col){const b={x0,y0,z0,x1,y1,z1};Col.add(b);BX_CAP.cols.push(b)}return}
  chunkOf((x0+x1)/2,(z0+z1)/2).box(x0,y0,z0,x1,y1,z1,color,o);
  if(col)Col.add({x0,y0,z0,x1,y1,z1});
}
function setT(x,z,t){if(x>=0&&z>=0&&x<W&&z<W)T[z*W+x]=t}
function getT(x,z){return(x>=0&&z>=0&&x<W&&z<W)?T[z*W+x]:0}

function biomeAt(x,z,h,nt,nm,nj){
  const j=(nj.v(x/5,z/5)-0.5)*0.07;
  const t=nt.fbm(x/130+90,z/130+40,3)+j,m=nm.fbm(x/110-70,z/110+25,3)-j;
  if(h>=SEA+17)return BIO_ROCK;
  if(t>0.545&&m<0.52)return BIO_DESERT;
  if(t<0.45)return BIO_SNOW;
  if(m>0.54)return BIO_FOREST;
  return BIO_PLAINS;
}

const NAME_A=['Vila','Porto','Monte','Campo','Pedra','Rio','Forte','Vale','Santa','Alto'];
const NAME_B={
  0:['Alvorada','Trigal','Esperança','Aurora','Carvalho','Lírios','Sabiá','Ventura'],
  1:['Pinheiral','Corvo','Musgo','Lobo','Cedro','Bosque','Orvalho','Samambaia'],
  2:['Areia','Dourada','Oásis','Escorpião','Miragem','Sol Ardente','Cacto','Duna'],
  3:['Gelo','Neblina','Cristal','Geada','Urso Branco','Nevasca','Aurora Fria','Pingo'],
  4:['Ferro','Granito','Trovão','Águia','Brasa','Rocha Viva','Cinza','Cume']
};
function cityName(rng,biome,used){
  for(let k=0;k<30;k++){const n=rng.pick(NAME_A)+' '+rng.pick(NAME_B[biome]);if(!used.has(n)){used.add(n);return n}}
  return 'Povoado '+rng.int(1,99);
}

const DOM_NAMES={plains:'Planícies',forest:'Florestas',mountain:'Montanhas',snow:'Neve',desert:'Deserto'};
async function genWorld(seed,status,dominant){
  // bioma dominante: escolhido pelo jogador ou sorteado pela semente
  if(!DOM_NAMES[dominant])dominant=['plains','forest','mountain','snow','desert'][new RNG(seed+999).int(0,4)];
  WORLD.dominant=dominant;WORLD.seed=seed;WORLD.cities=[];WORLD.chunkMeshes=[];WORLD.windmills=[];
  Col.map.clear();Col.all.length=0;for(const a of CRITTERS)scene.remove(a.g);CRITTERS.length=0;
  const rng=new RNG(seed);
  const nz=new Noise(seed),nt=new Noise(seed+11),nm=new Noise(seed+23),nr=new Noise(seed+37),nd=new Noise(seed+51),nj=new Noise(seed+77);TNOISE=new Noise(seed+303);
  H=new Int16Array(W*W);T=new Uint8Array(W*W);B=new Uint8Array(W*W);
  CHUNKS.length=0;for(let i=0;i<NCH*NCH;i++)CHUNKS.push(new BoxBatch());

  // 1) Relevo, rios e biomas
  // forma do mapa varia por semente
  const SHAPES=['Ilha irregular','Continente recortado','Anel com mar interno','Península com baía','Faixa de terra diagonal'];
  const shape=rng.int(0,4),wn=new Noise(seed+131),sAng=rng.range(0,6.283),bayA=rng.range(0,6.283);
  WORLD.shapeName=SHAPES[shape];
  const landMask=(x,z)=>{
    const u=(x-W/2)/(W/2),v=(z-W/2)/(W/2);
    const wx=wn.fbm(x/110,z/110,3)-0.5,wz=wn.fbm(x/110+50,z/110-30,3)-0.5;
    const box=(a,b)=>Math.pow(Math.pow(Math.abs(a),4)+Math.pow(Math.abs(b),4),0.25);
    switch(shape){
      case 0:return 1-smooth(0.7,1,box(u+wx*0.4,v+wz*0.4));
      case 1:return 1-smooth(0.6,0.95,Math.hypot(u+wx*0.9,v+wz*0.9)*0.95);
      case 2:{const a=u+wx*0.3,b=v+wz*0.3;return(1-smooth(0.74,1,box(a,b)))*smooth(0.14,0.32,Math.hypot(a,b))}
      case 3:{const a=u+wx*0.3,b=v+wz*0.3,db=Math.hypot(a-Math.cos(bayA)*0.5,b-Math.sin(bayA)*0.5);return(1-smooth(0.72,1,box(a,b)))*smooth(0.26,0.5,db)}
      default:{const a=u+wx*0.3,b=v+wz*0.3,ru=a*Math.cos(sAng)+b*Math.sin(sAng),rv=-a*Math.sin(sAng)+b*Math.cos(sAng);return 1-smooth(0.72,1,Math.hypot(ru/1.1,rv/0.72))}
    }
  };  status('Esculpindo montanhas, rios e lagos...');await tick();
  // relevo: fora do modo montanhas as serras são raras e baixas; planícies/desertos/florestas ficam suaves, com praias e margens de rio graduais
  const mtnW=dominant==='mountain'?[0.3,0.55]:[0.64,0.86],amp=dominant==='mountain'?[27,22]:[19,16];
  const HF=new Float32Array(W*W),MT=new Float32Array(W*W);
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const edge=1-landMask(x,z);
    const base=nz.fbm(x/100,z/100,4);
    const mtn=smooth(mtnW[0],mtnW[1],nm.fbm(x/140+5,z/140+9,3));
    const ridge=1-Math.abs(2*nr.fbm(x/55,z/55,3)-1);
    let h=SEA+6+(base-0.5)*amp[0]+mtn*(ridge*amp[1]+4)+(nd.fbm(x/10,z/10,2)-0.5)*(dominant==='mountain'?3.4:2);
    const rv=Math.abs(nr.fbm(x/80+200,z/80-120,3)-0.5);
    if(dominant!=='mountain')h=lerp(h,SEA+2,smooth(0.16,0.05,rv)*0.6*(1-mtn));       // vale aberto em volta do rio
    h=lerp(h,SEA-2.5,smooth(0.07,0.014,rv)*(1-mtn*0.85));                            // margem em declive suave
    h=lerp(h,SEA+1.2+(base-0.5)*3,smooth(0.02,0.5,edge)*(1-mtn*0.5));              // o relevo desce devagar até a praia
    h-=smooth(0.45,0.95,edge)*6;                                                      // e então afunda no mar
    HF[z*W+x]=h;MT[z*W+x]=mtn;
  }
  // suavização das áreas que não são serra (duas passadas de média 3x3)
  for(let pass=0;pass<1;pass++){
    const src=HF.slice();
    for(let z=1;z<W-1;z++)for(let x=1;x<W-1;x++){
      const i=z*W+x,k=1-Math.min(1,MT[i]*1.4);if(k<=0.02)continue;
      let s=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)s+=src[i+dz*W+dx];
      HF[i]=src[i]+(s/9-src[i])*k;
    }
  }
  for(let i=0;i<W*W;i++)H[i]=Math.max(SEA-3,Math.round(HF[i]));
  // biomas por percentil: garante variedade em qualquer semente
  const TT=new Float32Array(W*W),MM=new Float32Array(W*W),ts=[],ms=[];
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const i=z*W+x,j=(nj.v(x/5,z/5)-0.5)*0.07;
    TT[i]=nt.fbm(x/95+90,z/95+40,3)+j;MM[i]=nm.fbm(x/85-70,z/85+25,3)-j;
    if(H[i]>=SEA&&(x+z)%3===0){ts.push(TT[i]);ms.push(MM[i])}
  }
  ts.sort((a,b)=>a-b);ms.sort((a,b)=>a-b);
  // faixas de temperatura/umidade por bioma dominante. Deserto (quente) e neve (frio) ficam nas pontas opostas
  // da temperatura, sempre separados por uma faixa de planície/floresta.
  const q=(a,f)=>a[Math.min(a.length-1,Math.floor(a.length*f))];
  const CUT={plains:[0.08,0.92,0.85],forest:[0.08,0.92,0.34],mountain:[0.15,0.85,0.7],snow:[0.58,0.95,0.8],desert:[0.05,0.42,0.9]}[dominant];
  const tLo=q(ts,CUT[0]),tHi=q(ts,CUT[1]),mHi=q(ms,CUT[2]);
  // altura a partir da qual o relevo vira rocha; no modo montanhas ela desce para a rocha cobrir ~55% da terra
  let rockH=SEA+17;
  if(dominant==='mountain'){const hs=[];for(let i=0;i<W*W;i+=7)if(H[i]>=SEA)hs.push(H[i]);hs.sort((a,b)=>a-b);rockH=clamp(q(hs,0.45),SEA+8,SEA+17)}
  WORLD.rockH=rockH;
  for(let i=0;i<W*W;i++){
    const h=H[i];
    B[i]=h>=rockH?BIO_ROCK:TT[i]>tHi?BIO_DESERT:TT[i]<tLo?BIO_SNOW:MM[i]>mHi?BIO_FOREST:BIO_PLAINS;
  }
  // garante distância mínima entre deserto e neve: o bioma 'perdedor' (neve, ou deserto no modo neve) perto demais do outro vira planície
  { const GB=8,N=W/GB,dg=new Uint8Array(N*N),keep=new Uint8Array(N*N),win=dominant==='snow'?BIO_SNOW:BIO_DESERT,lose=dominant==='snow'?BIO_DESERT:BIO_SNOW;
    for(let i=0;i<W*W;i++)if(B[i]===win)dg[((i/W|0)>>3)*N+((i%W)>>3)]=1;
    const R=6;
    for(let bz=0;bz<N;bz++)for(let bx=0;bx<N;bx++)if(dg[bz*N+bx])for(let dz=-R;dz<=R;dz++)for(let dx=-R;dx<=R;dx++){const x=bx+dx,z=bz+dz;if(x>=0&&z>=0&&x<N&&z<N)keep[z*N+x]=1}
    for(let i=0;i<W*W;i++)if(B[i]===lose&&keep[((i/W|0)>>3)*N+((i%W)>>3)])B[i]=BIO_PLAINS;
  }
  // 2) Locais das cidades
  status('Escolhendo locais para as cidades...');await tick();
  // candidatos planos em terra; depois escolhe pontos o mais afastados possível entre si
  const cand=[];
  for(let relax=1;relax<=6&&cand.length<700;relax*=1.6){
    cand.length=0;
    for(let t=0;t<34000;t++){
      const x=rng.int(76,W-76),z=rng.int(76,W-76);
      let mn=99,mx=-99,wet=0;
      for(let dz=-40;dz<=40;dz+=8)for(let dx=-40;dx<=40;dx+=8){const h=H[(z+dz)*W+x+dx];if(h<SEA+1){wet++;continue}if(h<mn)mn=h;if(h>mx)mx=h}
      const ok=wet<=10&&H[z*W+x]>=SEA+1;
      if(ok&&mx-mn<=28*relax)cand.push({x,z,b:B[z*W+x],rough:mx-mn});
    }
  }
  const sites=[];
  if(cand.length)sites.push(cand[rng.int(0,cand.length-1)]);
  while(sites.length<7&&cand.length){
    let bestC=null,bs=-1e9;
    for(const c of cand){
      let md=1e9;for(const s of sites){const d=Math.hypot(s.x-c.x,s.z-c.z);if(d<md)md=d}
      const same=sites.filter(s=>s.b===c.b).length;
      const sc=md-(same>=3?10:0)-c.rough*0.35+rng.range(0,3);
      if(sc>bs){bs=sc;bestC=c}
    }
    sites.push(bestC);
  }
  while(sites.length<7){const x=rng.int(76,W-76),z=rng.int(76,W-76);if(sites.every(s=>Math.hypot(s.x-x,s.z-z)>90))sites.push({x,z,b:B[z*W+x]})}
  const used=new Set();
  const cities=sites.map((s,i)=>{
    const bio=B[s.z*W+s.x];
    return{id:i,cx:s.x,cz:s.z,half:rng.int(36,45),biome:bio,owner:'enemy',state:'idle',home:false,rank:0,
      enemies:[],npcs:[],walk:[],spawns:[],towers:[],gates:[],flags:[],props:[],aliveEnemies:0,totalEnemies:0};
  });
  // cidade inicial: a mais próxima do centro do mapa
  const home=cities[rng.int(0,cities.length-1)];home.home=true;home.owner='player';home.state='conquered';WORLD.home=home;
  const others=cities.filter(c=>c!==home).sort((a,b)=>Math.hypot(a.cx-home.cx,a.cz-home.cz)-Math.hypot(b.cx-home.cx,b.cz-home.cz));
  others.forEach((c,i)=>c.rank=i+1);
  for(const c of cities){c.name=cityName(rng,c.biome,used)}
  WORLD.cities=cities;
  // Regras por nível (rank): tier A = ordenada, B = mista, C = caótica
  //  1-2: sem muralha, caótica (10% mista) | 3-4: cerca, entre caótica e mista (mais mista no 4)
  //  5: muralha, qualquer tier (chances iguais) | 6: muralha, ordenada
  // a cidade inicial é 'cidade' de estilo misto (ruas largas o bastante para o início do jogo)
  for(const c of cities){
    const r=c.rank;
    c.type=r>=5?'fortaleza':'cidade';
    if(c.home)c.style='mista';
    else if(r<=2)c.style=rng.chance(0.1)?'mista':'caotica';
    else if(r===3)c.style=rng.chance(0.3)?'mista':'caotica';
    else if(r===4)c.style=rng.chance(0.7)?'mista':'caotica';
    else if(r===5)c.style=rng.pick(['caotica','mista','ordenada']);
    else c.style='ordenada';
  }
  // aplaina o terreno sob cada cidade
  for(const c of cities){
    let sum=0,n=0;
    for(let dz=-c.half;dz<=c.half;dz+=3)for(let dx=-c.half;dx<=c.half;dx+=3){sum+=H[(c.cz+dz)*W+c.cx+dx];n++}
    c.y=Math.max(SEA+2,Math.round(sum/n));
    const R=c.half+1,F=20;
    for(let dz=-(R+F);dz<=R+F;dz++)for(let dx=-(R+F);dx<=R+F;dx++){
      const x=c.cx+dx,z=c.cz+dz;if(x<1||z<1||x>=W-1||z>=W-1)continue;
      const d=Math.max(Math.abs(dx),Math.abs(dz)),i=z*W+x;
      if(d<=R){H[i]=c.y}else if(d<R+F)H[i]=Math.round(lerp(c.y,H[i],smooth(0,1,(d-R)/F)));
    }
  }

  // 3) Estradas ligando as cidades (MST + atalhos)
  status('Traçando estradas e pontes...');await tick();
  const edges=[],inT=new Set([0]);
  while(inT.size<cities.length){
    let best=null,bd=1e9;
    for(const a of inT)for(let j=0;j<cities.length;j++){if(inT.has(j))continue;
      const d=Math.hypot(cities[a].cx-cities[j].cx,cities[a].cz-cities[j].cz);if(d<bd){bd=d;best=[a,j]}}
    edges.push(best);inT.add(best[1]);
  }
  const extra=[];
  for(let i=0;i<cities.length;i++)for(let j=i+1;j<cities.length;j++){
    if(edges.some(e=>(e[0]===i&&e[1]===j)||(e[0]===j&&e[1]===i)))continue;
    extra.push([i,j,Math.hypot(cities[i].cx-cities[j].cx,cities[i].cz-cities[j].cz)]);
  }
  extra.sort((a,b)=>a[2]-b[2]);
  for(let k=0;k<2&&k<extra.length;k++)if(extra[k][2]<150)edges.push([extra[k][0],extra[k][1]]);
  for(const e of edges){carveRoad(cities[e[0]],cities[e[1]],cities);await tick()}

  // 4) Cidades
  for(const c of cities){
    status('Construindo '+c.name+'...');await tick();
    buildCity(c,new RNG(seed*31+c.id*977+5));
  }

  // 5) Natureza
  status('Escondendo baús, grutas e acampamentos...');await tick();
  WORLD.snap={H:H.slice(),T:T.slice(),B:B.slice()};
  genPOIs(rng,cities);
  status('Plantando árvores, pedras e flores...');await tick();
  genDecor(rng,nd,cities);

  // 6) Malha do terreno
  status('Montando blocos...');await tick();
  meshTerrain();
  makeMapCanvas();
  return WORLD;
}

function carveRoad(a,b,cities){
  const C=4,N=W/C;
  const gate=(c,o)=>{const dx=o.cx-c.cx,dz=o.cz-c.cz;
    if(Math.abs(dx)>Math.abs(dz)){const s=Math.sign(dx);c.gates.push({dir:s>0?'E':'W'});return{x:c.cx+s*(c.half+3),z:c.cz}}
    const s=Math.sign(dz);c.gates.push({dir:s>0?'S':'N'});return{x:c.cx,z:c.cz+s*(c.half+3)}};
  const ga=gate(a,b),gb=gate(b,a);
  const cityPen=(x,z)=>{let p=0;for(const c of cities){const d=Math.max(Math.abs(x-c.cx),Math.abs(z-c.cz));
    if(c===a||c===b){if(d<c.half+2)p+=30}else if(d<c.half+9)p+=30}return p};
  const s=((ga.z/C)|0)*N+((ga.x/C)|0),goal=((gb.z/C)|0)*N+((gb.x/C)|0),gx=goal%N,gz=(goal/N)|0;
  const g=new Float32Array(N*N).fill(1e9),came=new Int32Array(N*N).fill(-1),closed=new Uint8Array(N*N);
  const hp=new Heap();g[s]=0;hp.push(0,s);
  while(hp.size){
    const u=hp.pop()[1];if(closed[u])continue;closed[u]=1;if(u===goal)break;
    const ux=u%N,uz=(u/N)|0;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dz)continue;const vx=ux+dx,vz=uz+dz;if(vx<1||vz<1||vx>=N-1||vz>=N-1)continue;
      const v=vz*N+vx;if(closed[v])continue;
      const hx=vx*C+2,hz=vz*C+2,hv=H[hz*W+hx],hu=H[(uz*C+2)*W+ux*C+2];
      let cost=(dx&&dz?1.414:1)*C;const dh=Math.abs(hv-hu);
      cost*=1+dh*dh*0.9+(hv<SEA?6:0)+cityPen(hx,hz);
      if(T[hz*W+hx]===T_ROAD)cost*=0.35;
      const ng=g[u]+cost;
      if(ng<g[v]){g[v]=ng;came[v]=u;hp.push(ng+Math.hypot(gx-vx,gz-vz)*C*0.35,v)}
    }
  }
  const cells=[];for(let u=goal;u!==-1&&u!==undefined;u=came[u])cells.push(u);cells.reverse();
  const pts=[ga];
  for(let k=1;k<cells.length-1;k++)pts.push({x:(cells[k]%N)*C+2,z:((cells[k]/N)|0)*C+2});
  pts.push(gb);
  const tiles=[];
  for(let k=0;k<pts.length-1;k++){
    let x0=Math.round(pts[k].x),z0=Math.round(pts[k].z);const x1=Math.round(pts[k+1].x),z1=Math.round(pts[k+1].z);
    const dx=Math.abs(x1-x0),dz=Math.abs(z1-z0),sx=x0<x1?1:-1,sz=z0<z1?1:-1;let err=dx-dz;
    for(;;){tiles.push({x:x0,z:z0});if(x0===x1&&z0===z1)break;const e2=2*err;if(e2>-dz){err-=dz;x0+=sx}if(e2<dx){err+=dx;z0+=sz}}
  }
  const n=tiles.length;
  const h0=tiles.map(t=>H[t.z*W+t.x]),bridge=h0.map(h=>h<SEA);
  let hs=h0.map(h=>Math.max(h,SEA+1));
  for(let pass=0;pass<3;pass++){const nx=hs.slice();for(let i=0;i<n;i++){let s2=0,c2=0;for(let k=-5;k<=5;k++){const j=i+k;if(j>=0&&j<n){s2+=hs[j];c2++}}nx[i]=s2/c2}hs=nx}
  hs=hs.map(Math.round);
  for(let i=0;i<n;i++)if(bridge[i])hs[i]=Math.max(hs[i],SEA+1);
  for(let i=1;i<n;i++)hs[i]=clamp(hs[i],hs[i-1]-1,hs[i-1]+1);
  for(let i=n-2;i>=0;i--)hs[i]=clamp(hs[i],hs[i+1]-1,hs[i+1]+1);
  for(let i=0;i<n;i++){
    const h=hs[i],px=tiles[i].x,pz=tiles[i].z;
    for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
      const x=px+dx,z=pz+dz;if(x<1||z<1||x>=W-1||z>=W-1)continue;
      const d=Math.hypot(dx,dz),k=z*W+x;
      if(d<=1.5){if(T[k]!==T_ROAD&&T[k]!==T_BRIDGE){H[k]=h;T[k]=bridge[i]?T_BRIDGE:T_ROAD}}
      else if(d<=2.6&&T[k]===T_NAT)H[k]=clamp(H[k],h-1,h+1);
    }
  }
}

// ---------- Natureza ----------
function nearCity(x,z,m,cities){for(const c of cities){if(Math.max(Math.abs(x-c.cx),Math.abs(z-c.cz))<c.half+m)return true}return false}
function clearAround(x,z){for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++)if(getT(x+dx,z+dz)!==T_NAT)return false;return true}
function leafCol(rng,base){return shadec(base,rng.range(0.85,1.12))}
// copa em blobs: cubos de tamanhos e posições irregulares, mais escuros embaixo e claros em cima
function canopy(rng,cx,cz,ty,base,n,spread,smin,smax,up){
  for(let k=0;k<n;k++){
    const a=rng.range(0,6.283),r=Math.sqrt(rng.next())*spread,ox=Math.cos(a)*r,oz=Math.sin(a)*r;
    const oy=rng.range(-0.9,up)*(1-r/(spread*1.6)),s=rng.range(smin,smax),sy=s*rng.range(0.7,0.95);
    const f=0.82+clamp((oy+0.9)/(up+0.9),0,1)*0.3;
    Bx(cx+ox-s/2,ty+oy-sy/2,cz+oz-s/2,cx+ox+s/2,ty+oy+sy/2,cz+oz+s/2,shadec(leafCol(rng,base),f),false,{j:0.1,b:true});
  }
  // folhas soltas nas bordas
  for(let k=0;k<3;k++){const a=rng.range(0,6.283),r=spread*rng.range(0.9,1.3),s=rng.range(0.4,0.7);
    Bx(cx+Math.cos(a)*r-s/2,ty+rng.range(-1.3,0.3),cz+Math.sin(a)*r-s/2,cx+Math.cos(a)*r+s/2,ty+rng.range(-1.3,0.3)+s,cz+Math.sin(a)*r+s/2,leafCol(rng,base),false,{j:0.12,b:true})}
}
function addTree(x,z,y,type,rng){
  const cx=x+0.5,cz=z+0.5,jw=rng.range(-0.14,0.14);
  if(type==='oak'||type==='birch'){
    const bi=type==='birch',th=bi?rng.int(5,7):rng.int(4,6),tw=bi?0.3:0.4,tc=bi?0xd8d4c8:0x6b4a2a,lc=bi?(rng.chance(0.5)?0x93b83a:0xb5c845):(rng.chance(0.25)?0x3a7a24:0x2a6a24);
    Bx(cx-tw,y,cz-tw,cx+tw,y+th,cz+tw,tc,true,{j:0.05});
    if(!bi){   // base alargada, casca com listras e galho
      Bx(cx-0.55,y,cz-0.55,cx+0.55,y+0.7,cz+0.55,shadec(tc,0.85),false,{j:0.06});
      for(const s of[[1,0],[-1,0],[0,1],[0,-1]])if(rng.chance(0.6)){
        const q=rng.range(0.4,th*0.7),ex=cx+s[0]*0.43,ez=cz+s[1]*0.43,wx=s[0]?0.03:0.12,wz=s[1]?0.03:0.12;
        Bx(ex-wx,y+q,ez-wz,ex+wx,y+q+rng.range(0.8,1.6),ez+wz,shadec(tc,0.72),false,{j:0.04})}
      const bs=rng.chance(0.5)?1:-1;Bx(cx+(bs>0?0.35:-1.2),y+th-1.3,cz-0.2,cx+(bs>0?1.2:-0.35),y+th-0.8,cz+0.2,tc,false,{j:0.05});
    }else{
      for(let k=0;k<4;k++){const q=rng.range(0.5,th-0.6),sd=rng.pick([-1,1]);Bx(cx+(sd>0?0.3:-0.35),y+q,cz-0.12,cx+(sd>0?0.35:-0.3),y+q+0.25,cz+0.12,0x2a2a28,false,{j:0.02})}
    }
    const t=y+th+rng.range(0,0.1);
    canopy(rng,cx,cz,t+0.2,lc,bi?rng.int(6,8):rng.int(9,12),bi?1.3+jw:1.9+jw,bi?1.1:1.4,bi?1.7:2.2,bi?2:1.8);
  }else if(type==='bigoak'){
    const th=rng.int(7,10),t=y+th;
    Bx(cx-0.55,y,cz-0.55,cx+0.55,y+th,cz+0.55,0x5a3d22,true,{j:0.05});
    Bx(cx-0.8,y,cz-0.8,cx+0.8,y+0.9,cz+0.8,0x4a3320,false,{j:0.06});
    for(const s of[[1,0],[-1,0],[0,1],[0,-1]])if(rng.chance(0.7)){const q=rng.range(0.6,th*0.7),ex=cx+s[0]*0.58,ez=cz+s[1]*0.58,wx=s[0]?0.03:0.14,wz=s[1]?0.03:0.14;Bx(ex-wx,y+q,ez-wz,ex+wx,y+q+rng.range(1,2.2),ez+wz,0x3a2a1a,false,{j:0.04})}
    canopy(rng,cx,cz,t+0.3,rng.chance(0.3)?0x3a7a24:0x2f6a22,rng.int(14,17),2.7,1.7,2.7,2.6);
  }else if(type==='spruce'){
    const th=rng.int(5,8),lc=0x1f4a2e,t=y+th,snow=B[z*W+x]===BIO_SNOW;
    Bx(cx-0.35,y,cz-0.35,cx+0.35,y+th,cz+0.35,0x4a3320,true,{j:0.05});
    const n=rng.int(5,6);
    for(let k=0;k<n;k++){
      const w=2.5-k*0.38+jw,yy=y+1.2+k*((th+0.6)/n)*0.95;
      Bx(cx-w,yy,cz-w,cx+w,yy+0.8,cz+w,leafCol(rng,k%2?0x2a5a3a:lc),false,{j:0.08,b:true});
      Bx(cx-w*0.68,yy+0.8,cz-w*0.68,cx+w*0.68,yy+1.4,cz+w*0.68,leafCol(rng,lc),false,{j:0.08});
      if(snow)Bx(cx-w*0.95,yy+0.8,cz-w*0.95,cx+w*0.95,yy+0.95,cz+w*0.95,0xf4f8fb,false,{j:0.03});
    }
    Bx(cx-0.3,t+0.6,cz-0.3,cx+0.3,t+2.0,cz+0.3,0x1f4a2e,false,{b:true});
  }else if(type==='cactus'){
    const th=rng.int(2,4),g=0x3f8a3a,g2=0x2f7030;
    Bx(cx-0.4,y,cz-0.4,cx+0.4,y+th,cz+0.4,g,true,{j:0.08});
    for(const s of[[0.4,0],[-0.4,0],[0,0.4],[0,-0.4]])Bx(cx+s[0]*1.0-(s[0]?0.03:0.12),y+0.2,cz+s[1]*1.0-(s[1]?0.03:0.12),cx+s[0]*1.0+(s[0]?0.03:0.12),y+th-0.1,cz+s[1]*1.0+(s[1]?0.03:0.12),g2,false,{j:0.02});
    if(th>2&&rng.chance(0.7)){Bx(cx+0.4,y+1.2,cz-0.25,cx+1.2,y+1.9,cz+0.25,g,false);Bx(cx+0.9,y+1.9,cz-0.25,cx+1.3,y+2.8,cz+0.25,g,false)}
    if(th>2&&rng.chance(0.5)){Bx(cx-1.2,y+0.9,cz-0.25,cx-0.4,y+1.5,cz+0.25,g,false);Bx(cx-1.2,y+1.5,cz-0.25,cx-0.8,y+2.3,cz+0.25,g,false)}
    if(rng.chance(0.4))Bx(cx-0.18,y+th,cz-0.18,cx+0.18,y+th+0.3,cz+0.18,rng.pick([0xf06aa0,0xf2d13d]),false,{j:0});
  }
}
// pedras: aglomerado de blocos, com musgo/neve no topo
function addRock(x,z,y,rng,snow,biome){
  const cx=x+0.5+rng.range(-0.3,0.3),cz=z+0.5+rng.range(-0.3,0.3);
  const pal=biome===BIO_DESERT?[0xb89a68,0xa88a58,0xc8aa78]:[0x8a8a8a,0x7a7a7a,0x9a9890,0x6f6f6f];
  const w=rng.range(0.9,1.7),d=rng.range(0.9,1.7),h=rng.range(0.7,1.5),c=shadec(rng.pick(pal),rng.range(0.9,1.1));
  Bx(cx-w/2,y,cz-d/2,cx+w/2,y+h,cz+d/2,c,true,{j:0.1});
  Bx(cx-w/2-0.06,y,cz-d/2-0.06,cx+w/2+0.06,y+0.35,cz+d/2+0.06,shadec(c,0.88),false,{j:0.06});   // base mais larga
  if(rng.chance(0.55)){const w2=w*0.55,d2=d*0.55,h2=rng.range(0.4,0.9),ox=rng.range(-0.2,0.2);Bx(cx-w2/2+ox,y+h,cz-d2/2,cx+w2/2+ox,y+h+h2,cz+d2/2,shadec(c,1.07),true,{j:0.1})}
  if(rng.chance(0.6)){const s=rng.range(0.45,0.8),sh=s*rng.range(0.5,0.9),a=rng.range(0,6.283);
    Bx(cx+Math.cos(a)*(w/2+s*0.2)-s/2,y,cz+Math.sin(a)*(d/2+s*0.2)-s/2,cx+Math.cos(a)*(w/2+s*0.2)+s/2,y+sh,cz+Math.sin(a)*(d/2+s*0.2)+s/2,shadec(c,rng.range(0.9,1.1)),true,{j:0.1})}
  if(snow)Bx(cx-w/2,y+h,cz-d/2,cx+w/2,y+h+0.15,cz+d/2,0xf4f8fb,false);
  else if(biome!==BIO_DESERT&&biome!==BIO_ROCK&&rng.chance(0.5))Bx(cx-w/2+0.1,y+h,cz-d/2+0.1,cx+w/2-0.3,y+h+0.1,cz+d/2-0.2,0x4a8a2e,false,{j:0.1});   // musgo
}
function addBush(x,z,y,rng,col){
  const n=rng.int(2,3);
  for(let k=0;k<n;k++){const s=rng.range(0.55,0.95),ox=rng.range(0,0.5),oz=rng.range(0,0.5),sy=s*rng.range(0.6,0.9);
    Bx(x+0.1+ox,y,z+0.1+oz,x+0.1+ox+s,y+sy,z+0.1+oz+s,leafCol(rng,col),false,{j:0.1,b:true})}
  if(rng.chance(0.25)){const a=rng.pick([0xd8344a,0x8a3ad0,0xe8a020]);Bx(x+0.3,y+0.6,z+0.2,x+0.42,y+0.72,z+0.32,a,false,{j:0});Bx(x+0.7,y+0.4,z+0.6,x+0.82,y+0.52,z+0.72,a,false,{j:0})}
}
function addGrass(x,z,y,rng,col){   // tufo: 3 lâminas finas de alturas diferentes
  for(let k=0;k<3;k++){const ox=rng.range(0.1,0.8),oz=rng.range(0.1,0.8),hh=rng.range(0.3,0.75);
    Bx(x+ox,y,z+oz,x+ox+0.09,y+hh,z+oz+0.09,leafCol(rng,col),false,{j:0.12})}
}
function addFlower(x,z,y,rng){
  const fc=rng.pick([0xe8454f,0xf2d13d,0xffffff,0xb06ae0,0xff8fb0]),ox=rng.range(0.2,0.6),oz=rng.range(0.2,0.6),hh=rng.range(0.4,0.7);
  Bx(x+ox,y,z+oz,x+ox+0.09,y+hh,z+oz+0.09,0x3f8a2a,false);
  Bx(x+ox-0.09,y+hh,z+oz-0.09,x+ox+0.18,y+hh+0.14,z+oz+0.18,fc,false,{j:0});
  Bx(x+ox-0.01,y+hh+0.14,z+oz-0.01,x+ox+0.1,y+hh+0.22,z+oz+0.1,0xf2c030,false,{j:0});
  if(rng.chance(0.5))Bx(x+ox+0.09,y+0.12,z+oz,x+ox+0.3,y+0.2,z+oz+0.09,0x3f8a2a,false);
}
function addFern(x,z,y,rng){
  for(let k=0;k<5;k++){const a=k*1.26+rng.range(-0.3,0.3),dx=Math.cos(a),dz=Math.sin(a),cx=x+0.5,cz=z+0.5,col=leafCol(rng,0x3a8a30);
    Bx(cx+dx*0.15-0.05,y,cz+dz*0.15-0.05,cx+dx*0.15+0.05,y+0.35,cz+dz*0.15+0.05,col,false,{j:0.08});
    Bx(cx+dx*0.4-0.05,y+0.3,cz+dz*0.4-0.05,cx+dx*0.4+0.05,y+0.5,cz+dz*0.4+0.05,col,false,{j:0.08});
    Bx(cx+dx*0.65-0.05,y+0.2,cz+dz*0.65-0.05,cx+dx*0.65+0.05,y+0.38,cz+dz*0.65+0.05,col,false,{j:0.08})}
}
function addPebbles(x,z,y,rng,col){for(let k=0;k<rng.int(2,4);k++){const ox=rng.range(0,0.8),oz=rng.range(0,0.8),s=rng.range(0.12,0.25);Bx(x+ox,y,z+oz,x+ox+s,y+s*0.7,z+oz+s,shadec(col,rng.range(0.85,1.1)),false,{j:0.05})}}
function addMushroom(x,z,y,rng){const ox=rng.range(0.2,0.6),oz=rng.range(0.2,0.6);Bx(x+ox,y,z+oz,x+ox+0.1,y+0.22,z+oz+0.1,0xeeeadc,false,{j:0});Bx(x+ox-0.08,y+0.22,z+oz-0.08,x+ox+0.18,y+0.32,z+oz+0.18,rng.chance(0.5)?0xd8344a:0xb07a3a,false,{j:0})}
function addLog(x,z,y,rng){const al=rng.chance(0.5),L=rng.range(1.6,2.6);
  if(al)Bx(x+0.2,y,z+0.4,x+0.2+L,y+0.5,z+0.9,0x5a3d22,true,{j:0.06});else Bx(x+0.4,y,z+0.2,x+0.9,y+0.5,z+0.2+L,0x5a3d22,true,{j:0.06});
  if(al)Bx(x+0.2+L,y+0.04,z+0.44,x+0.26+L,y+0.46,z+0.86,0xb08a58,false,{j:0.02});else Bx(x+0.44,y+0.04,z+0.2+L,x+0.86,y+0.46,z+0.26+L,0xb08a58,false,{j:0.02})}
function genDecor(rng,dn,cities){
  const dens=new Noise(WORLD.seed+91);
  for(let z=3;z<W-3;z+=2)for(let x=3;x<W-3;x+=2){
    const px=x+rng.int(0,1),pz=z+rng.int(0,1),i=pz*W+px;
    if(T[i]!==T_NAT)continue;const h=H[i];if(h<SEA+1)continue;
    if(nearCity(px,pz,4,cities))continue;
    if(WORLD.camps.some(k=>Math.hypot(px-k.cx,pz-k.cz)<13.5))continue;   // acampamentos ficam sem árvores, pedras e plantas ao redor
    if(!clearAround(px,pz))continue;
    const b=B[i],cl=dens.fbm(px/22,pz/22,2);
    let r=rng.next();
    if(b===BIO_FOREST){
      const p=clamp((cl-0.3)*1.2,0.08,0.75)*0.62*(WORLD.dominant==='forest'?1.3:1);
      if(r<p)addTree(px,pz,h,rng.pick(['oak','oak','oak','birch','spruce','bigoak']),rng);
      else if(r<p+0.03)addRock(px,pz,h,rng,false,b);
      else if(r<p+0.1)addBush(px,pz,h,rng,0x25601f);
      else if(r<p+0.112)addLog(px,pz,h,rng);
      else if(r<p+0.125)addMushroom(px,pz,h,rng);
      else if(rng.chance(0.18))addGrass(px,pz,h,rng,0x3f8a2a);
      else if(rng.chance(0.22))addFern(px,pz,h,rng);
    }else if(b===BIO_PLAINS){
      const p=cl>0.58?0.2:0.012;
      if(r<p)addTree(px,pz,h,'oak',rng);
      else if(r<p+0.012)addRock(px,pz,h,rng,false,b);
      else if(r<p+0.03)addBush(px,pz,h,rng,0x3f8a2a);
      else if(rng.chance(0.4))addGrass(px,pz,h,rng,0x4f9a30);
      if(rng.chance(0.08))addFlower(px,pz,h,rng);
    }else if(b===BIO_SNOW){
      const p=cl>0.5?0.22:0.035;
      if(r<p)addTree(px,pz,h,'spruce',rng);
      else if(r<p+0.025)addRock(px,pz,h,rng,true,b);
      else if(r<p+0.04)addPebbles(px,pz,h,rng,0x8a8a8a);
    }else if(b===BIO_DESERT){
      if(r<0.016)addTree(px,pz,h,'cactus',rng);
      else if(r<0.03)addRock(px,pz,h,rng,false,b);
      else if(r<0.05)addPebbles(px,pz,h,rng,0xb89a68);
      else if(rng.chance(0.03))Bx(px+0.2,h,pz+0.2,px+0.8,h+0.4,pz+0.8,0x8a6a3a,false);
    }else{
      if(r<0.1)addRock(px,pz,h,rng,h>SEA+24,b);
      else if(r<0.13&&h<SEA+24)addTree(px,pz,h,'spruce',rng);
    }
  }
}

// ---------- Malha do terreno ----------
function natCol(h,b){
  if(h<SEA)return h>=SEA-1?0xcdbf8a:0x8d8a7e;
  if(h<=SEA+1&&b!==BIO_SNOW)return 0xdccf96;
  if(b===BIO_FOREST)return 0x468f30;
  if(b===BIO_DESERT)return 0xe0cf90;
  if(b===BIO_SNOW)return 0xf3f7fb;
  if(b===BIO_ROCK)return h>SEA+26?0xf0f4f8:0x8c8c8c;
  return 0x68b043;
}
// variação natural do terreno: manchas de duas tonalidades por bioma, ondulações na areia e pontinhos
const NAT_ALT={[BIO_PLAINS]:[0x5ea63c,0x7cc050],[BIO_FOREST]:[0x3f8a2c,0x5aa23a],[BIO_DESERT]:[0xd6c27c,0xeadba0],[BIO_SNOW]:[0xe2edf7,0xffffff],[BIO_ROCK]:[0x7c7c82,0x9a9a92]};
let TNOISE=null;
function natVar(x,z,h,b,r){
  const c0=natCol(h,b);
  if(!TNOISE||h<=SEA+1||(b===BIO_ROCK&&h>SEA+26))return c0;
  const alt=NAT_ALT[b];if(!alt)return c0;
  const pn=TNOISE.fbm(x/7,z/7,2),pm=TNOISE.fbm(x/23+40,z/23-17,2);
  let c=mixc(c0,alt[pn>0.5?1:0],Math.min(1,Math.abs(pn-0.5)*3.2));
  if(b===BIO_DESERT)c=shadec(c,1+0.045*Math.sin((x*0.8+z*0.5)*0.9+pm*9));
  else c=shadec(c,0.94+pm*0.12);
  if(r>0.93)c=shadec(c,r>0.97?1.1:0.9);
  return c;
}
function mixc(a,b,t){const ar=a>>16&255,ag=a>>8&255,ab=a&255;return((ar+((b>>16&255)-ar)*t)<<16)|((ag+((b>>8&255)-ag)*t)<<8)|(ab+((b&255)-ab)*t)|0}
function tileColor(x,z,i){
  const h=H[i],t=T[i],b=B[i],r=hash2(x,z,7),v=0.93+r*0.14;
  let c;
  switch(t){
    case T_ROAD:c=((x*5+z*3)%4===0)?0x8c6f48:0x9b7d52;break;
    case T_STREET:c=((x*7+z*13)%3===0)?0x777777:0x8f8f8f;break;
    case T_PLAZA:c=((x+z)&1)?0xb99f7a:0xa88e6a;break;
    case T_FLOOR:c=(x&1)?0xa07a48:0x946f3f;break;
    case T_BRIDGE:c=(z&1)?0x7b5a33:0x6d4f2c;break;
    case T_GARDEN:c=r>0.88?(b===BIO_SNOW?0x6a9ad8:0xe8454f):r>0.8?(b===BIO_DESERT?0xc87a3a:0xf2d13d):shadec(natCol(h,b),0.9);break;
    case T_SOIL:c=0x5a3b22;break;
    case T_WHEAT:c=(x+z)%2?0xd8b64a:0xcfa93c;break;
    case T_CAVE:c=0x55555a;break;
    case T_WILD:c=shadec(natCol(h,b),0.8);break;
    default:c=natVar(x,z,h,b,r);
  }
  return shadec(c,v);
}function subColor(x,z,i){
  const t=T[i],b=B[i],r=hash2(x,z,3),v=0.9+r*0.2;
  let c;
  if(t===T_STREET||t===T_PLAZA||t===T_FLOOR||t===T_CAVE)c=0x777777;
  else if(t===T_BRIDGE)c=0x5e4326;
  else if(b===BIO_DESERT)c=0xc9b777;
  else if(b===BIO_ROCK)c=0x777777;
  else c=0x7a5636;
  return shadec(c,v);
}
function meshTerrain(){
  for(let cz=0;cz<NCH;cz++)for(let cx=0;cx<NCH;cx++){
    const bt=CHUNKS[cz*NCH+cx];
    for(let z=cz*CHK;z<(cz+1)*CHK;z++)for(let x=cx*CHK;x<(cx+1)*CHK;x++){
      const i=z*W+x,h=H[i],tc=hex2rgb(tileColor(x,z,i));
      bt.face(2,x,h,z,x+1,h,z+1,tc[0],tc[1],tc[2]);
      const dirs=[[1,0,0],[-1,0,1],[0,1,4],[0,-1,5]];
      for(const dd of dirs){
        const nx=x+dd[0],nz=z+dd[1];if(nx<0||nz<0||nx>=W||nz>=W)continue;
        const nh=H[nz*W+nx];if(nh>=h)continue;
        const sc=hex2rgb(subColor(x,z,i)),gf=(T[i]===T_NAT&&B[i]!==BIO_ROCK&&h>=SEA)?0.82:1;
        const top=Math.min(0.3,h-nh);
        if(T[i]===T_NAT&&h>=SEA&&B[i]!==BIO_ROCK&&B[i]!==BIO_DESERT)bt.face(dd[2],x,h-top,z,x+1,h,z+1,tc[0]*gf,tc[1]*gf,tc[2]*gf);
        else bt.face(dd[2],x,h-top,z,x+1,h,z+1,sc[0],sc[1],sc[2]);
        if(h-nh>top)bt.face(dd[2],x,nh,z,x+1,h-top,z+1,sc[0],sc[1],sc[2]);
      }
    }
    const m=bt.toMesh(MAT_TERRAIN);
    if(m){m.userData.cx=(cx+0.5)*CHK;m.userData.cz=(cz+0.5)*CHK;scene.add(m);WORLD.chunkMeshes.push(m)}
  }
}
function mapColorAt(x,z){
  const i=z*W+x,h=H[i];let c;
  if(h<SEA)return h>=SEA-1?0x4a86d8:0x2f63b8;
  c=tileColor(x,z,i);if(T[i]===T_ROAD||T[i]===T_BRIDGE)c=0xd8c08a;if(T[i]>=T_STREET&&T[i]<=T_FLOOR)c=0xbdbdbd;
  return shadec(c,0.8+Math.min(1,(h-SEA)/30)*0.35);
}
function makeMapCanvas(){
  // o mapa usa uma cópia do terreno de antes de acampamentos, cavernas e baús, então eles não deixam marcas
  const sH=H,sT=T,sB=B;
  if(WORLD.snap){H=WORLD.snap.H;T=WORLD.snap.T;B=WORLD.snap.B}
  const cv=document.createElement('canvas');cv.width=W;cv.height=W;
  const g=cv.getContext('2d'),img=g.createImageData(W,W);
  for(let z=0;z<W;z++)for(let x=0;x<W;x++){
    const c=mapColorAt(x,z),o=(z*W+x)*4;img.data[o]=c>>16&255;img.data[o+1]=c>>8&255;img.data[o+2]=c&255;img.data[o+3]=255;
  }
  g.putImageData(img,0,0);WORLD.mapCanvas=cv;
  H=sH;T=sT;B=sB;
}







