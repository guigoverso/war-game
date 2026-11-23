'use strict';
// ---------- Pegada da cidade: a cidade se adapta ao terreno (feature 6, tarefa 1B) ----------
// c.foot = grade (2*half+1)² de 0/1 em coordenadas locais (centro da cidade = 0,0); null = quadrado cheio (mapas de teste).
// A caixa `half` continua sendo o raio máximo (POIs, raids e missões seguem usando-a); a pegada só diz onde há cidade.
// Números em CITY_FOOT (js/modifiers/city-modifiers.js).

// o ponto local (x,z) está dentro da pegada?
function cityIn(c,x,z){
  if(!c.foot)return true;
  const n=c.half;if(x<-n||x>n||z<-n||z>n)return false;
  return c.foot[(z+n)*(2*n+1)+x+n]===1;
}
// o bloco local (x,z) serve para cidade? terra, perto da altura de referência e longe da água
function cityFootCell(c,x,z,ref,R){
  const wx=c.cx+x,wz=c.cz+z;if(wx<4||wz<4||wx>=W-4||wz>=W-4)return false;
  const h=H[wz*W+wx];if(h<SEA+1||Math.abs(h-ref)>CITY_FOOT.maxDev*R.dev*(c.huge?CITY_HUGE.devMul:1))return false;
  const b=R.beach;
  for(const [dx,dz] of[[b,0],[-b,0],[0,b],[0,-b],[b,b],[-b,-b],[b,-b],[-b,b]]){
    const xx=wx+dx,zz=wz+dz;if(xx<0||zz<0||xx>=W||zz>=W||H[zz*W+xx]<SEA+1)return false;
  }
  return true;
}
// altura média do núcleo (praça e prédios dos cantos), ou null se algum ponto dele não serve
function cityFootCore(c,R){
  const F=CITY_FOOT;let sum=0,n=0;
  for(let z=-F.coreZ;z<=F.coreZ;z+=2)for(let x=-F.coreX;x<=F.coreX;x+=2){
    const wx=c.cx+x,wz=c.cz+z;if(wx<4||wz<4||wx>=W-4||wz>=W-4)return null;
    const h=H[wz*W+wx];if(h<SEA+1)return null;sum+=h;n++;
  }
  const ref=sum/n;
  for(let z=-F.coreZ;z<=F.coreZ;z+=2)for(let x=-F.coreX;x<=F.coreX;x+=2)if(!cityFootCell(c,x,z,ref,R))return null;
  return ref;
}
// Formatos da pegada da cidade enorme (4B). (u,v) = ponto relativo ao centro do formato, em unidades do raio do formato (1 = borda da caixa do formato),
// já girado por c.shapeRot. Devolve o raio relativo: <= 1 está dentro (o contorno ainda é recortado por ruído em cityFootPlan). 9 = fora.
// `plaza` = onde fica a praça em relação ao centro do formato (u,v; antes de girar), `fill` = fração da caixa que o formato ocupa (para dimensionar a caixa).
const CITY_SHAPES = {
  quadrado: { plaza: [0, 0], fill: 0.80, q: (u, v) => Math.pow(Math.pow(Math.abs(u), 4) + Math.pow(Math.abs(v), 4), 0.25) },
  circulo: { plaza: [0, 0], fill: 0.66, q: (u, v) => Math.hypot(u, v) },
  losango: { plaza: [0, 0], fill: 0.50, q: (u, v) => Math.pow(Math.pow(Math.abs(u), 1.3) + Math.pow(Math.abs(v), 1.3), 1 / 1.3) },
  oval: { plaza: [0, 0], fill: 0.55, q: (u, v, rot) => Math.hypot(u / (rot < 2 ? 1 : 1.25), v / 0.66) },   // rot 0/1: eixo longo em x/z; 2/3: na diagonal
  cruz: { plaza: [0, 0], fill: 0.64, q: (u, v) => Math.min(Math.abs(u), Math.abs(v)) <= 0.4 ? Math.max(Math.abs(u), Math.abs(v)) : 9 },
  ele: { plaza: [-0.45, 0.45], fill: 0.40, q: (u, v) => (u <= 0.1 || v >= -0.1) ? Math.max(Math.abs(u), Math.abs(v)) : 9 },   // braços à esquerda e embaixo; a praça fica no cotovelo
  flor: { plaza: [0, 0], fill: 0.45, q: (u, v, rot) => Math.hypot(u, v) / (0.72 + 0.28 * Math.cos(6 * Math.atan2(v, u) + rot)) }
};
// raio relativo do ponto local (x,z) da pegada da cidade enorme c (centro do formato em c.shapeO, raio c.shapeR, giro c.shapeRot)
function cityShapeQ(c, x, z) {
  let u = (x - c.shapeO[0]) / c.shapeR, v = (z - c.shapeO[1]) / c.shapeR;
  const s = c.shape, r = c.shapeRot;
  if (s === 'oval' && r >= 2) { const a = (r === 2 ? 1 : -1) * Math.PI / 4, cs = Math.cos(a), sn = Math.sin(a); [u, v] = [u * cs + v * sn, -u * sn + v * cs] }
  else if (s === 'ele') for (let k = 0; k < r; k++) [u, v] = [-v, u];   // giro de 90° por passo
  return CITY_SHAPES[s].q(u, v, r);
}
// escolhe o melhor chão perto do ponto sorteado (move c.cx/c.cz) e monta c.foot. false = pegada não montada (usa o quadrado antigo)
// Cidade enorme (c.huge): a caixa `half` é fixa (cabe no tile) e o formato (c.shape) fica dentro dela, com a praça deslocada em relação ao centro dele.
function cityFootPlan(c,seed){
  c.foot=null;c.fdist=null;
  if(tileTestOn()||WORLD.showcaseMode)return false;
  c.half0=c.half0||c.half;c.half=c.half0;   // half0 = tamanho sorteado (a caixa cresce quando a praça sai do centro)
  const F=CITY_FOOT,x0=c.cx,z0=c.cz,hg=!!c.huge,st=hg?8:3,nudge=hg?CITY_HUGE.nudge:F.nudge,nstep=hg?8:F.nudgeStep;let best=null,Hc=c.half;
  for(const R of F.relax){
    for(let oz=-nudge;oz<=nudge;oz+=nstep)for(let ox=-nudge;ox<=nudge;ox+=nstep){
      c.cx=x0+ox;c.cz=z0+oz;
      if(hg){const m=CITY_HUGE.margin+Hc;if(c.cx<m||c.cz<m||c.cx>W-1-m||c.cz>W-1-m)continue}   // cidade enorme: a caixa inteira cabe no tile
      else if(c.cx<80||c.cz<80||c.cx>W-80||c.cz>W-80)continue;
      const ref=cityFootCore(c,R);if(ref===null)continue;
      let n=0;for(let z=-Hc;z<=Hc;z+=st)for(let x=-Hc;x<=Hc;x+=st)if(cityFootCell(c,x,z,ref,R))n++;
      const sc=n*(9/(st*st))-Math.hypot(ox,oz)*0.3;   // leve preferência pelo ponto original (n em amostras de 3x3)
      if(!best||sc>best.sc)best={sc,cx:c.cx,cz:c.cz,ref,R};
    }
    if(best)break;
  }
  c.cx=x0;c.cz=z0;
  if(!best)return false;
  c.cx=best.cx;c.cz=best.cz;c.biome=B[c.cz*W+c.cx];
  const nz=new Noise(seed*7+c.id*131+17);
  // a praça (origem) pode ficar fora do centro da cidade: o contorno é centrado num ponto deslocado (ox,oz) e a caixa cresce para caber
  let ox=0,oz=0;
  if(hg){   // cidade enorme: opções de giro/deslocamento do formato; vence uma das que sobram mais terra (sorteio pela semente entre as boas)
    const sh=CITY_SHAPES[c.shape],opts=[];
    const rots=c.shape==='ele'||c.shape==='oval'?[0,1,2,3]:c.shape==='flor'?[0,1,2]:[0];
    const dirs=c.shape==='cruz'||sh.plaza[0]?[[0,0]]:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
    for(const rot of rots)for(const [dx,dz] of dirs){
      let px=sh.plaza[0],pz=sh.plaza[1];   // praça no sistema do formato; o giro de 'ele' gira o ponto também
      if(c.shape==='ele')for(let k=0;k<rot;k++)[px,pz]=[pz,-px];
      const off=Math.round(c.half0*CITY_HUGE.plazaOff*(dx||dz?1:0));
      const hs=Math.round(c.half0/(1+Math.max(Math.abs(px),Math.abs(pz))+(dx||dz?CITY_HUGE.plazaOff:0)));
      opts.push({rot,hs,o:[-Math.round(px*hs)+dx*off,-Math.round(pz*hs)+dz*off]});
    }
    const score=q=>{c.shapeRot=q.rot;c.shapeR=q.hs;c.shapeO=q.o;let n=0;
      for(let z=-Hc;z<=Hc;z+=st)for(let x=-Hc;x<=Hc;x+=st)if(cityShapeQ(c,x,z)<=0.95&&cityFootCell(c,x,z,best.ref,best.R))n++;
      return n};
    const sc=opts.map(score),mx=Math.max(...sc),good=opts.filter((_,i)=>sc[i]>=mx*0.88);
    const pr=new RNG((seed*131+c.id*977+5)>>>0);for(let k=0;k<4;k++)pr.next();
    const q=pr.pick(good);c.shapeRot=q.rot;c.shapeR=q.hs;c.shapeO=q.o;[ox,oz]=q.o;
  }else if(F.plazaOff>0){
    const opts=[[0,0]];
    for(const f of[1,0.6])for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1]])opts.push([Math.round(dx*c.half0*F.plazaOff*f),Math.round(dz*c.half0*F.plazaOff*f)]);
    const sc=opts.map(([ax,az])=>{let n=0;
      for(let z=-c.half0;z<=c.half0;z+=3)for(let x=-c.half0;x<=c.half0;x+=3)if(cityFootCell(c,ax+x,az+z,best.ref,best.R))n++;
      return n});
    const mx=Math.max(...sc),good=i=>i>0&&sc[i]>=mx*0.85;
    let pick=opts.filter((_,i)=>good(i)&&i<=8);   // prefere o deslocamento forte; se a terra não deixar, o fraco
    if(!pick.length)pick=opts.filter((_,i)=>good(i));
    if(!pick.length)pick=[opts[sc.indexOf(Math.max(...sc.slice(1)),1)]];
    const pr=new RNG((seed*131+c.id*977+5)>>>0);for(let k=0;k<4;k++)pr.next();   // (descarta as primeiras: sementes vizinhas dão sorteios parecidos)
    [ox,oz]=pr.pick(pick);
  }
  c.poff=[ox,oz];
  c.half=hg?c.half0:c.half0+Math.max(Math.abs(ox),Math.abs(oz));Hc=c.half;
  const N=2*Hc+1,idx=(x,z)=>(z+Hc)*N+x+Hc;
  const core=(x,z)=>Math.abs(x)<=F.coreX&&Math.abs(z)<=F.coreZ;
  const allow=new Uint8Array(N*N),EG=hg?CITY_HUGE.edge:{base:F.shapeBase,noise:F.shapeNoise,min:F.shapeMin};   // contorno: recorte por ruído (a cidade enorme usa pouco, para o formato aparecer)
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
    const q=hg?cityShapeQ(c,x,z):Math.pow(Math.pow(Math.abs(x-ox),4)+Math.pow(Math.abs(z-oz),4),0.25)/c.half0;
    const lim=clamp(EG.base+EG.noise*(nz.fbm(x/16+40,z/16+40,2)-0.5),EG.min,1);
    allow[idx(x,z)]=(core(x,z)||(q<=lim&&cityFootCell(c,x,z,best.ref,best.R)))?1:0;
  }
  const D4=[[1,0],[-1,0],[0,1],[0,-1]];
  const flood=src=>{   // só o pedaço ligado ao centro
    const out=new Uint8Array(N*N),st=[[0,0]];out[idx(0,0)]=1;
    while(st.length){const [x,z]=st.pop();for(const [dx,dz] of D4){
      const a=x+dx,b=z+dz;if(a<-Hc||a>Hc||b<-Hc||b>Hc)continue;
      const i=idx(a,b);if(src[i]&&!out[i]){out[i]=1;st.push([a,b])}}}
    return out;
  };
  const m=flood(allow),er=new Uint8Array(N*N);
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){   // abertura: tira pontas e fios finos
    if(!m[idx(x,z)])continue;
    er[idx(x,z)]=(core(x,z)||D4.every(d=>{const a=x+d[0],b=z+d[1];return a>=-Hc&&a<=Hc&&b>=-Hc&&b<=Hc&&m[idx(a,b)]}))?1:0;
  }
  const m2=flood(er),out=m2.slice();
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){   // ...e devolve uma camada nas células permitidas
    const i=idx(x,z);if(m2[i]||!allow[i])continue;
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      const a=x+dx,b=z+dz;if(a>=-Hc&&a<=Hc&&b>=-Hc&&b<=Hc&&m2[idx(a,b)]){out[i]=1;dz=2;break}
    }
  }
  c.foot=out;
  return true;
}
// a cidade não achou chão onde foi sorteada: tenta outros pontos candidatos (planos e em terra), longe das outras cidades
function cityFootRelocate(c,cities,cand,seed){
  const x0=c.cx,z0=c.cz;
  for(let i=0,n=0;i<cand.length&&n<CITY_FOOT.relocateTries;i++){
    const q=cand[i];
    if(cities.some(o=>o!==c&&Math.hypot(o.cx-q.x,o.cz-q.z)<CITY_FOOT.relocateGap))continue;
    n++;c.cx=q.x;c.cz=q.z;
    if(cityFootPlan(c,seed))return true;
  }
  c.cx=x0;c.cz=z0;console.warn('cidade '+c.id+': sem chão para a pegada, usando o quadrado');return false;
}
// aplaina só a pegada e liga ao relevo por uma rampa medida a partir da borda dela. A água nunca é levantada, e a altura da cidade e da rampa
// é limitada pela distância até a margem (CITY_FOOT.shoreSlope blocos de altura por bloco): sem paredão na água e as pontes casam com o chão
// apron (modo reserva): faixa plana de `apron` blocos além da pegada, onde o muro assenta; a rampa começa depois dela. 0 = como antes
function cityFootFlatten(c,apron){
  apron=apron||0;
  const F=CITY_FOOT,Hc=c.half,N=2*Hc+1,M=Hc+F.ramp+apron,NM=2*M+1;
  // chanfro: distância aproximada de cada bloco da grade até o valor 0 (fontes)
  const chamfer=d=>{
    for(let z=0;z<NM;z++)for(let x=0;x<NM;x++){
      const i=z*NM+x;let v=d[i];
      if(x>0)v=Math.min(v,d[i-1]+1);
      if(z>0){v=Math.min(v,d[i-NM]+1);if(x>0)v=Math.min(v,d[i-NM-1]+1.414);if(x<NM-1)v=Math.min(v,d[i-NM+1]+1.414)}
      d[i]=v;
    }
    for(let z=NM-1;z>=0;z--)for(let x=NM-1;x>=0;x--){
      const i=z*NM+x;let v=d[i];
      if(x<NM-1)v=Math.min(v,d[i+1]+1);
      if(z<NM-1){v=Math.min(v,d[i+NM]+1);if(x<NM-1)v=Math.min(v,d[i+NM+1]+1.414);if(x>0)v=Math.min(v,d[i+NM-1]+1.414)}
      d[i]=v;
    }
  };
  const d=new Float32Array(NM*NM).fill(1e9),dw=new Float32Array(NM*NM).fill(1e9);
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++)if(c.foot[(z+Hc)*N+x+Hc])d[(z+M)*NM+x+M]=0;
  for(let z=0;z<NM;z++)for(let x=0;x<NM;x++){
    const wx=c.cx+x-M,wz=c.cz+z-M;if(wx>=0&&wz>=0&&wx<W&&wz<W&&H[wz*W+wx]<SEA+1)dw[z*NM+x]=0;   // água (e margem)
  }
  chamfer(d);chamfer(dw);
  let sum=0,n=0,dmin=1e9;
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++)if(c.foot[(z+Hc)*N+x+Hc]){
    sum+=H[(c.cz+z)*W+c.cx+x];n++;dmin=Math.min(dmin,dw[(z+M)*NM+x+M]);
  }
  const cap=dist=>Math.floor(SEA+1+dist*F.shoreSlope);   // altura máxima a `dist` blocos da água
  c.y=Math.max(SEA+2,Math.min(Math.round(sum/n),cap(dmin)));
  c.fM=M;c.fdist=new Uint8Array(NM*NM);
  c.lv=null;c.lvLock=null;
  if(reserveOn()&&CITY_MULTI.on){   // multiníveis (fase 6): elevações e depressões suaves dentro da pegada
    const di=new Float32Array(NM*NM);
    for(let z=0;z<NM;z++)for(let x=0;x<NM;x++){const lx=x-M,lz=z-M;di[z*NM+x]=(Math.abs(lx)<=Hc&&Math.abs(lz)<=Hc&&c.foot[(lz+Hc)*N+lx+Hc])?1e9:0}
    chamfer(di);
    c.lv=cityHeightMap(c,di,dw,NM,M,cap);
  }
  for(let z=0;z<NM;z++)for(let x=0;x<NM;x++){
    const i=z*NM+x,d0=d[i],dd=Math.max(0,d0-apron);c.fdist[i]=Math.min(255,Math.round(d0));
    const wx=c.cx+x-M,wz=c.cz+z-M;if(wx<1||wz<1||wx>=W-1||wz>=W-1)continue;
    const hi=wz*W+wx;
    if(d0===0)H[hi]=c.y+(c.lv?c.lv[(z-M+Hc)*N+x-M+Hc]:0);
    else if(dd===0){if(H[hi]>=SEA+1)H[hi]=c.y>H[hi]?Math.max(H[hi],Math.min(c.y,cap(dw[i]))):c.y}   // faixa plana: terra só (água fica)
    else if(c.mtn&&c.mtn[Math.abs(x-M)>Math.abs(z-M)?(x>M?'E':'W'):(z>M?'S':'N')]&&H[hi]>=c.y){H[hi]=Math.min(H[hi],c.y+Math.ceil(dd*RESERVE.mtnSlope))}   // lado de montanha (reserve.js): encosta que sobe `mtnSlope` blocos por bloco até o terreno natural (sem corte)
    else if(dd<F.ramp&&H[hi]>=SEA+1){
      let nh=Math.round(lerp(c.y,H[hi],smooth(0,1,dd/F.ramp)));
      if(nh>H[hi])nh=Math.max(H[hi],Math.min(nh,cap(dw[i])));   // só levanta até onde a margem permite
      H[hi]=nh;
    }
  }
}
// quadrado antigo (cidade sem pegada: mapas de teste ou sem chão): média da altura, platô de c.half+1 blocos e rampa de 20
function citySquareFlatten(c){
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
// distância (blocos) do ponto de mundo (x,z) até a pegada da cidade; 255 se longe
function cityFootDist(c,x,z){
  const M=c.fM,lx=Math.floor(x)-c.cx+M,lz=Math.floor(z)-c.cz+M,NM=2*M+1;
  if(lx<0||lz<0||lx>=NM||lz>=NM)return 255;
  return c.fdist[lz*NM+lx];
}
// marca (T_OUT) os blocos livres fora da pegada para nada ser construído ali; cityUnmarkOut desfaz no fim da construção
function cityMarkOut(c){
  if(!c.foot)return;const Hc=c.half;
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++)if(!cityIn(c,x,z)&&getT(c.cx+x,c.cz+z)===T_NAT)setT(c.cx+x,c.cz+z,T_OUT);
}
function cityUnmarkOut(c){
  if(!c.foot)return;const Hc=c.half;
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++)if(getT(c.cx+x,c.cz+z)===T_OUT)setT(c.cx+x,c.cz+z,T_NAT);
}
// distância (blocos) do centro (praça) até a borda da pegada em cada eixo: c.gedge.{E,W,S,N}. É onde ficam os portões, as pontas das estradas e
// os pontos de entrada dos raids. Sem pegada (mapas de teste), é a própria caixa `half`.
function cityFootGates(c){
  const Hc=c.half,e={E:Hc,W:Hc,S:Hc,N:Hc};
  if(c.foot)for(const [d,dx,dz] of[['E',1,0],['W',-1,0],['S',0,1],['N',0,-1]]){
    let k=0;while(k<Hc&&cityIn(c,(k+1)*dx,(k+1)*dz))k++;e[d]=k;
  }
  c.gedge=e;
  // portão com terra do lado de fora? (os 8 blocos além da borda no eixo são todos terra); portões para o mar ficam fechados. Sempre sobra 1 aberto
  const run=d=>{
    let k=0;
    for(;k<12;k++){const [x,z]=cityGatePos(c,d,k+1);if(x<1||z<1||x>=W-1||z>=W-1||H[Math.floor(z)*W+Math.floor(x)]<SEA+1)break}
    return k;
  };
  const runs={E:run('E'),W:run('W'),S:run('S'),N:run('N')};
  c.gland={E:runs.E>=8&&!(c.mtn&&c.mtn.E),W:runs.W>=8&&!(c.mtn&&c.mtn.W),S:runs.S>=8&&!(c.mtn&&c.mtn.S),N:runs.N>=8&&!(c.mtn&&c.mtn.N)};   // lado de montanha: portão fechado
  if(!c.foot)c.gland={E:true,W:true,S:true,N:true};
  else if(!Object.values(c.gland).some(Boolean)){const b=Object.keys(runs).sort((p,q)=>(runs[q]-(c.mtn&&c.mtn[q]?99:0))-(runs[p]-(c.mtn&&c.mtn[p]?99:0)))[0];c.gland[b]=true}
}
// ponto de mundo `off` blocos além da borda da pegada no portão d ('E','W','S','N')
function cityGatePos(c,d,off){
  const k=(c.gedge?c.gedge[d]:c.half)+off;
  return d==='E'?[c.cx+k,c.cz]:d==='W'?[c.cx-k,c.cz]:d==='S'?[c.cx,c.cz+k]:[c.cx,c.cz-k];
}
// o ponto de mundo (x,z) está a até m blocos da cidade? (pela pegada, ou pela caixa quando não há pegada)
function cityNear(c,x,z,m){
  if(Math.max(Math.abs(x-c.cx),Math.abs(z-c.cz))>=c.half+m)return false;
  return !c.fdist||cityFootDist(c,x,z)<m+1;
}

// ---------- Cidades multiníveis (fase 6) ----------
// c.lv: nível de cada ponto da pegada em relação a c.y (a praça), em blocos inteiros, mesma indexação de c.foot (grade (2*half+1)^2).
// Ondulação suave (ruído de valores) com a praça e a faixa junto ao muro sempre em 0, centro mais alto que o resto (bowl), bairro baixo perto da
// água (lowShore) e inclinação limitada (slope), de modo que as ruas subam no máximo 1 bloco a cada 1/slope blocos. di/dw: distância (chanfro) até
// fora da pegada / até a água na grade NM (centro M); cap: altura máxima por distância da água (cityFootFlatten).
function cityHeightMap(c,di,dw,NM,M,cap){
  const K=CITY_MULTI,Hc=c.half,N=2*Hc+1,sd=((WORLD.seed||0)*7919+c.id*104729)|0;
  const hh=(i,j)=>{let h=(Math.imul(i,374761393)+Math.imul(j,668265263)+sd)|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295};
  const vn=(x,z)=>{   // ruído de valores bilinear suave, [0,1]
    const i=Math.floor(x),j=Math.floor(z),fx=smooth(0,1,x-i),fz=smooth(0,1,z-j);
    return lerp(lerp(hh(i,j),hh(i+1,j),fx),lerp(hh(i,j+1),hh(i+1,j+1),fx),fz);
  };
  // cidade encostada em serra (c.mtn): ondulação maior e o terreno sobe em direção ao lado da montanha
  const sides=c.mtn?Object.keys(c.mtn).filter(d=>c.mtn[d]):[],amp=K.amp*(sides.length?K.mtnAmp:1);
  const mt=(x,z)=>{let v=0;for(const d of sides){const a=d==='E'?x:d==='W'?-x:d==='S'?z:-z;v+=K.mtnRise*smooth(0,1,clamp(a/Hc,0,1))}return v};
  const f=new Float32Array(N*N),pin=new Uint8Array(N*N);
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
    const k=(z+Hc)*N+x+Hc;if(!c.foot[k])continue;
    const nk=(z+M)*NM+x+M,r=Math.max(Math.abs(x),Math.abs(z));
    const w=smooth(0,1,clamp((r-K.plazaFlat)/K.plazaRamp,0,1))*smooth(0,1,clamp((di[nk]-2)/K.edge,0,1));
    if(w<=0){pin[k]=1;continue}
    let v=amp*(2*vn(x/K.scale+50,z/K.scale+50)-1)-K.bowl*smooth(0,1,clamp((r-K.plazaFlat)/(Hc-K.plazaFlat),0,1))
         -K.lowShore*clamp(1-dw[nk]/K.shoreReach,0,1)+mt(x,z);
    f[k]=v*w;
  }
  // limita a inclinação (real): duas voltas de varredura nos dois sentidos, com os pontos fixos (0) como âncora
  const sl=K.slope*(sides.length?K.mtnAmp:1),s1=sl,s2=sl*1.414;
  const lim=(i,j,sl)=>{if(pin[i]||!c.foot[j])return;f[i]=Math.min(f[j]+sl,Math.max(f[j]-sl,f[i]))};
  for(let rd=0;rd<8;rd++){
    for(let z=1;z<N-1;z++)for(let x=1;x<N-1;x++){const i=z*N+x;if(!c.foot[i])continue;lim(i,i-1,s1);lim(i,i-N,s1);lim(i,i-N-1,s2);lim(i,i-N+1,s2)}
    for(let z=N-2;z>0;z--)for(let x=N-2;x>0;x--){const i=z*N+x;if(!c.foot[i])continue;lim(i,i+1,s1);lim(i,i+N,s1);lim(i,i+N+1,s2);lim(i,i+N-1,s2)}
  }
  const lv=new Int8Array(N*N);c.lvEdge=new Uint8Array(N*N);c.lvCap=new Int8Array(N*N);   // lvEdge: distância (blocos) até fora da pegada
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
    const k=(z+Hc)*N+x+Hc;if(!c.foot[k])continue;
    c.lvEdge[k]=Math.min(255,Math.round(di[(z+M)*NM+x+M]));
    let v=Math.round(f[k]);const mx=cap(dw[(z+M)*NM+x+M]);
    c.lvCap[k]=clamp(mx-c.y,-100,100);
    if(c.y+v>mx)v=mx-c.y;if(c.y+v<SEA+1)v=SEA+1-c.y;lv[k]=v;
  }
  // o corte pela distância da água (cap) pode abrir degraus de 2: só abaixa o vizinho mais alto até a diferença ser 1 (nunca passa do teto)
  for(let pass=0,ch=1;ch&&pass<30;pass++){
    ch=0;
    for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
      const k=(z+Hc)*N+x+Hc;if(!c.foot[k])continue;
      for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
        if(!dx&&!dz)continue;const a=x+dx,b=z+dz;if(a<-Hc||b<-Hc||a>Hc||b>Hc)continue;
        const j=(b+Hc)*N+a+Hc;if(c.foot[j]&&lv[k]>lv[j]+1){lv[k]=lv[j]+1;ch=1}
      }
    }
  }
  return lv;
}
// nível (blocos acima de c.y) no ponto local (lx,lz); 0 fora da pegada ou em cidades sem mapa de altura
function cityLv(c,lx,lz){
  if(!c.lv)return 0;
  const Hc=c.half,x=Math.floor(lx),z=Math.floor(lz);
  if(x<-Hc||z<-Hc||x>Hc||z>Hc)return 0;
  return c.lv[(z+Hc)*(2*Hc+1)+x+Hc];
}
// altura do chão da cidade no ponto de mundo (wx,wz) (c.y + nível)
const cityYat=(c,wx,wz)=>c.y+cityLv(c,wx-c.cx,wz-c.cz);
// plataforma plana do lote r (coordenadas locais; os cantos do beiral entram com 1 bloco de folga): o nível vira a média do lote,
// path/D: caminho da porta e lado da porta; ele e mais 1 bloco além dele ficam no nível da plataforma (o degrau nasce depois da entrada).
// o terreno (H) acompanha e a faixa em volta (CITY_MULTI.lotRing) fica a no máximo 1 bloco da plataforma. Devolve o nível. Sem mapa de altura: 0.
function cityLot(c,r,path,D){
  if(!c.lv)return 0;
  const Hc=c.half,N=2*Hc+1,at=(x,z)=>(z+Hc)*N+x+Hc,ok=(x,z)=>x>=-Hc&&z>=-Hc&&x<=Hc&&z<=Hc&&c.foot[at(x,z)];
  const body={x0:r.x0-1,x1:r.x1+1,z0:r.z0-1,z1:r.z1+1},parts=[body];   // partes da plataforma: o lote (com 1 bloco de folga) e a entrada
  if(path&&path.length){   // entrada: caminho da porta + 1 bloco além, no mesmo nível (o degrau fica depois)
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9;
    for(const q of path){x0=Math.min(x0,q.x0);x1=Math.max(x1,q.x1);z0=Math.min(z0,q.z0);z1=Math.max(z1,q.z1)}
    if(D==='N')z0--;else if(D==='S')z1++;else if(D==='W')x0--;else x1++;
    parts.push({x0,x1,z0,z1});
  }
  const inP=(x,z)=>parts.some(q=>x>=q.x0&&x<=q.x1&&z>=q.z0&&z<=q.z1);
  const dist=(x,z)=>Math.min(...parts.map(q=>Math.max(q.x0-x,x-q.x1,q.z0-z,z-q.z1)));   // distância (Chebyshev) até a plataforma
  const bx0=Math.min(...parts.map(q=>q.x0)),bx1=Math.max(...parts.map(q=>q.x1)),bz0=Math.min(...parts.map(q=>q.z0)),bz1=Math.max(...parts.map(q=>q.z1));
  let sum=0,n=0,dmin=255;
  for(let z=body.z0;z<=body.z1;z++)for(let x=body.x0;x<=body.x1;x++)if(ok(x,z)){sum+=c.lv[at(x,z)];n++;dmin=Math.min(dmin,c.lvEdge[at(x,z)])}
  if(!n)return 0;
  c.lvLock=c.lvLock||new Uint8Array(N*N);
  let h=clamp(Math.round(sum/n),-(dmin-1),dmin-1);   // junto à borda da pegada o nível volta a 0 (muro, torres e portões)
  const R=CITY_MULTI.lotRing;
  {   // plataformas vizinhas já travadas: a diferença de nível não passa de 1 bloco por bloco de distância
    let lo=-99,hi=99;
    for(let z=bz0-R-1;z<=bz1+R+1;z++)for(let x=bx0-R-1;x<=bx1+R+1;x++){
      if(!ok(x,z)||!c.lvLock[at(x,z)]||inP(x,z))continue;
      const d=dist(x,z);if(d>R+1)continue;
      lo=Math.max(lo,c.lv[at(x,z)]-d);hi=Math.min(hi,c.lv[at(x,z)]+d);
    }
    if(lo<=hi)h=clamp(h,lo,hi);else if(lo<99&&hi>-99)h=Math.round((lo+hi)/2);   // vizinhas em conflito: o meio
  }
  const setH=(x,z,v)=>{const wx=c.cx+x,wz=c.cz+z;if(wx>=1&&wz>=1&&wx<W-1&&wz<W-1)H[wz*W+wx]=c.y+v};
  for(let z=bz0;z<=bz1;z++)for(let x=bx0;x<=bx1;x++){
    if(!ok(x,z)||!inP(x,z))continue;
    const inR=x>=r.x0&&x<=r.x1&&z>=r.z0&&z<=r.z1;
    if(!inR&&(c.lvLock[at(x,z)]||c.lvEdge[at(x,z)]-1<Math.abs(h)))continue;   // folga e entrada não sobrescrevem outra plataforma nem a borda
    c.lv[at(x,z)]=h;c.lvLock[at(x,z)]=1;setH(x,z,h);
  }
  cityLvRing(c,bx0-R,bz0-R,bx1+R,bz1+R,R);
  return h;
}

// células livres (sem plataforma travada) da área [x0..x1]x[z0..z1] (coordenadas locais) seguem as travadas por perto: no máximo 1 bloco de diferença por
// bloco de distância (até R+1), dentro do teto da margem e da borda da pegada; sem solução, no meio dos dois limites. Atualiza c.lv e o terreno H.
function cityLvRing(c,x0,z0,x1,z1,R){
  const Hc=c.half,N=2*Hc+1,at=(x,z)=>(z+Hc)*N+x+Hc,ok=(x,z)=>x>=-Hc&&z>=-Hc&&x<=Hc&&z<=Hc&&c.foot[at(x,z)];
  for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){
    if(!ok(x,z)||c.lvLock[at(x,z)])continue;
    let lo=-99,hi=99;
    for(let dz=-R-1;dz<=R+1;dz++)for(let dx=-R-1;dx<=R+1;dx++){
      if(!ok(x+dx,z+dz)||!c.lvLock[at(x+dx,z+dz)])continue;
      const d=Math.max(Math.abs(dx),Math.abs(dz)),L=c.lv[at(x+dx,z+dz)];lo=Math.max(lo,L-d);hi=Math.min(hi,L+d);
    }
    const e=Math.max(0,c.lvEdge[at(x,z)]-1),cur=c.lv[at(x,z)];
    let v=lo<=hi?clamp(clamp(cur,lo,hi),-e,e):(lo<99&&hi>-99?Math.round((lo+hi)/2):cur);   // sem solução: no meio dos dois limites
    v=Math.max(Math.min(v,c.lvCap[at(x,z)]),SEA+1-c.y);
    if(v!==cur){c.lv[at(x,z)]=v;const wx=c.cx+x,wz=c.cz+z;if(wx>=1&&wz>=1&&wx<W-1&&wz<W-1)H[wz*W+wx]=c.y+v}
  }
}
// ruas niveladas: em cada ponto ao longo de uma rua, a largura inteira fica no mesmo nível (média da seção), então a rua só tem degraus ao
// comprimento (não pedaços altos e baixos lado a lado). Os cruzamentos são alisados (diferença máxima de 1) e as ruas ficam travadas (lvLock),
// de modo que as plataformas das casas se ajustam a elas. Chamada em buildCity depois de todas as ruas estarem definidas.
function cityStreetLevels(c,streets){
  if(!c.lv)return;
  const Hc=c.half,N=2*Hc+1,at=(x,z)=>(z+Hc)*N+x+Hc,ok=(x,z)=>x>=-Hc&&z>=-Hc&&x<=Hc&&z<=Hc&&c.foot[at(x,z)];
  c.lvLock=c.lvLock||new Uint8Array(N*N);
  const st=new Uint8Array(N*N),lim=k=>Math.min(Math.max(0,c.lvEdge[k]-1),c.lvCap[k]>=0?99:99);
  for(const s of streets){
    const horiz=(s.x1-s.x0)>=(s.z1-s.z0),a0=horiz?s.x0:s.z0,a1=horiz?s.x1:s.z1,b0=horiz?s.z0:s.x0,b1=horiz?s.z1:s.x1;
    for(let a=Math.max(a0,-Hc);a<=Math.min(a1,Hc);a++){
      const cs=[];let sum=0;
      for(let b=b0;b<=b1;b++){const x=horiz?a:b,z=horiz?b:a;if(ok(x,z)){cs.push(at(x,z));sum+=c.lv[at(x,z)]}}
      if(!cs.length)continue;
      const m=Math.round(sum/cs.length);
      for(const k of cs){c.lv[k]=clamp(m,-lim(k),lim(k));st[k]=1}
    }
  }
  const nbr=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  for(let it=0,ch=1;ch&&it<20;it++){   // cruzamentos e ruas que se tocam: no máximo 1 bloco de diferença entre vizinhas
    ch=0;
    for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
      const k=at(x,z);if(!st[k])continue;
      let lo=-99,hi=99;
      for(const [dx,dz] of nbr){if(!ok(x+dx,z+dz)||!st[at(x+dx,z+dz)])continue;const L=c.lv[at(x+dx,z+dz)];lo=Math.max(lo,L-1);hi=Math.min(hi,L+1)}
      if(lo>hi)continue;
      const v=clamp(clamp(c.lv[k],lo,hi),-lim(k),lim(k));if(v!==c.lv[k]){c.lv[k]=v;ch=1}
    }
  }
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
    const k=at(x,z);if(!st[k])continue;
    c.lvLock[k]=1;const wx=c.cx+x,wz=c.cz+z;if(wx>=1&&wz>=1&&wx<W-1&&wz<W-1)H[wz*W+wx]=c.y+c.lv[k];
  }
  cityLvRing(c,-Hc,-Hc,Hc,Hc,CITY_MULTI.lotRing);   // o terreno em volta acompanha as ruas
}
