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
  const h=H[wz*W+wx];if(h<SEA+1||Math.abs(h-ref)>CITY_FOOT.maxDev*R.dev)return false;
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
// escolhe o melhor chão perto do ponto sorteado (move c.cx/c.cz) e monta c.foot. false = pegada não montada (usa o quadrado antigo)
function cityFootPlan(c,seed){
  c.foot=null;c.fdist=null;
  if(tileTestOn()||WORLD.showcaseMode)return false;
  c.half0=c.half0||c.half;c.half=c.half0;   // half0 = tamanho sorteado (a caixa cresce quando a praça sai do centro)
  const F=CITY_FOOT,x0=c.cx,z0=c.cz;let best=null,Hc=c.half;
  for(const R of F.relax){
    for(let oz=-F.nudge;oz<=F.nudge;oz+=F.nudgeStep)for(let ox=-F.nudge;ox<=F.nudge;ox+=F.nudgeStep){
      c.cx=x0+ox;c.cz=z0+oz;if(c.cx<80||c.cz<80||c.cx>W-80||c.cz>W-80)continue;
      const ref=cityFootCore(c,R);if(ref===null)continue;
      let n=0;for(let z=-Hc;z<=Hc;z+=3)for(let x=-Hc;x<=Hc;x+=3)if(cityFootCell(c,x,z,ref,R))n++;
      const sc=n-Math.hypot(ox,oz)*0.3;   // leve preferência pelo ponto original
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
  if(F.plazaOff>0){
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
  c.half=c.half0+Math.max(Math.abs(ox),Math.abs(oz));Hc=c.half;
  const N=2*Hc+1,idx=(x,z)=>(z+Hc)*N+x+Hc;
  const core=(x,z)=>Math.abs(x)<=F.coreX&&Math.abs(z)<=F.coreZ;
  const allow=new Uint8Array(N*N);
  for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
    const q=Math.pow(Math.pow(Math.abs(x-ox),4)+Math.pow(Math.abs(z-oz),4),0.25)/c.half0;
    const lim=clamp(F.shapeBase+F.shapeNoise*(nz.fbm(x/16+40,z/16+40,2)-0.5),F.shapeMin,1);
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
  for(let z=0;z<NM;z++)for(let x=0;x<NM;x++){
    const i=z*NM+x,d0=d[i],dd=Math.max(0,d0-apron);c.fdist[i]=Math.min(255,Math.round(d0));
    const wx=c.cx+x-M,wz=c.cz+z-M;if(wx<1||wz<1||wx>=W-1||wz>=W-1)continue;
    const hi=wz*W+wx;
    if(d0===0)H[hi]=c.y;
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
