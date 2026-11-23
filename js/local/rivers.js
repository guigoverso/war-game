'use strict';
// ---------- Rios desenhados (feature 7, fase 5; só com ?reserva=1) ----------
// Em vez da curva de nível do ruído, cada rio nasce em terra alta e desce até o mar. A rota vem de uma "inundação por prioridade" numa grade grossa
// do relevo sem rios: toda célula de terra ganha um caminho até o mar (depressões são enchidas), então nenhum rio acaba em beco sem saída.
// Poço enchido por mais de RIVER.lake vira lago onde o rio passa. Devolve campos de leito (RCH) e vale (RVAL) que genRelief aplica na altura.
function genRivers(P,preH){
  const G=4,N=Math.ceil(W/G),NN=N*N,rng=new RNG((P.seed*53+17)>>>0),R=RIVER;
  const gh=new Float32Array(NN);
  for(let z=0;z<N;z++)for(let x=0;x<N;x++)gh[z*N+x]=preH(Math.min(W-1,x*G+2),Math.min(W-1,z*G+2));
  // inundação por prioridade a partir do mar e da borda: par[i] = célula de onde a água de i escorre; fill = nível já enchido
  const fill=new Float32Array(NN),par=new Int32Array(NN).fill(-1),done=new Uint8Array(NN),order=[];
  const hp=[];   // heap binário de [chave, célula]
  const push=(k,i)=>{hp.push([k,i]);let c=hp.length-1;while(c>0){const p=(c-1)>>1;if(hp[p][0]<=hp[c][0])break;[hp[p],hp[c]]=[hp[c],hp[p]];c=p}};
  const pop=()=>{const t=hp[0],l=hp.pop();if(hp.length){hp[0]=l;let c=0;for(;;){let a=c*2+1,b=a+1,m=c;if(a<hp.length&&hp[a][0]<hp[m][0])m=a;if(b<hp.length&&hp[b][0]<hp[m][0])m=b;if(m===c)break;[hp[m],hp[c]]=[hp[c],hp[m]];c=m}}return t};
  for(let z=0;z<N;z++)for(let x=0;x<N;x++){const i=z*N+x;if(gh[i]<SEA||x===0||z===0||x===N-1||z===N-1){fill[i]=gh[i];done[i]=1;push(gh[i],i)}}
  const D8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  while(hp.length){
    const [,i]=pop(),x=i%N,z=i/N|0;order.push(i);
    for(const [dx,dz] of D8){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N)continue;const j=nz*N+nx;if(done[j])continue;
      done[j]=1;par[j]=i;fill[j]=Math.max(gh[j],fill[i]+0.001);push(fill[j],j)}
  }
  // distância ao mar (em células, chanfro simples) para afastar as nascentes da costa
  const sd=new Float32Array(NN).fill(1e9);
  for(let i=0;i<NN;i++)if(gh[i]<SEA)sd[i]=0;
  const relax=(x,z)=>{const i=z*N+x;
    for(const [dx,dz] of D8){const nx=x+dx,nz=z+dz;if(nx<0||nz<0||nx>=N||nz>=N)continue;const d=sd[nz*N+nx]+(dx&&dz?1.41:1);if(d<sd[i])sd[i]=d}};
  for(let z=0;z<N;z++)for(let x=0;x<N;x++)relax(x,z);
  for(let z=N-1;z>=0;z--)for(let x=N-1;x>=0;x--)relax(x,z);
  // nascentes: terra alta e longe do mar, espaçadas
  const cands=[];
  for(let z=3;z<N-3;z++)for(let x=3;x<N-3;x++){const i=z*N+x;if(gh[i]>=SEA+R.srcRise&&sd[i]*G>=R.srcSea)cands.push({i,x:x*G+2,z:z*G+2,sc:gh[i]+rng.range(0,10)})}
  cands.sort((a,b)=>b.sc-a.sc);
  const want=rng.int(R.count[0],R.count[1]),rivers=[],srcs=[];
  for(const c of cands){
    if(rivers.length>=want)break;
    if(srcs.some(s=>Math.hypot(s.x-c.x,s.z-c.z)<R.spacing))continue;
    const path=[];let i=c.i,guard=0;
    while(i>=0&&gh[i]>=SEA&&guard++<NN){path.push(i);i=par[i]}
    if(i>=0)path.push(i);   // primeira célula de mar
    if(path.length*G<R.minLen)continue;
    srcs.push(c);rivers.push(path);
  }
  // polilinha suavizada (Chaikin) de cada rio, com o poço enchido de cada ponto (para os lagos)
  const cnt=new Uint8Array(NN);for(const p of rivers)for(const i of p)if(cnt[i]<255)cnt[i]++;
  const RCH=new Float32Array(W*W),RVAL=new Float32Array(W*W),paths=[];
  for(const path of rivers){
    let pts=path.map(i=>({x:(i%N)*G+2,z:(i/N|0)*G+2,c:cnt[i],f:Math.max(0,fill[i]-gh[i])}));
    {   // a foz entra mais alguns blocos no mar (a primeira célula de mar fica atrás da praia e o leito não a alcançaria)
      const a=pts[pts.length-2]||pts[0],e=pts[pts.length-1],dd=Math.hypot(e.x-a.x,e.z-a.z)||1;
      for(let k=1;k<=3;k++)pts.push({x:e.x+(e.x-a.x)/dd*G*k,z:e.z+(e.z-a.z)/dd*G*k,c:e.c,f:0});
    }
    for(let it=0;it<2;it++){const q=[pts[0]];
      for(let k=0;k<pts.length-1;k++){const a=pts[k],b=pts[k+1];
        q.push({x:a.x*0.75+b.x*0.25,z:a.z*0.75+b.z*0.25,c:a.c,f:a.f},{x:a.x*0.25+b.x*0.75,z:a.z*0.25+b.z*0.75,c:b.c,f:b.f})}
      q.push(pts[pts.length-1]);pts=q}
    paths.push(pts);
    let s=0;
    for(let k=0;k<pts.length;k++){
      const p=pts[k];if(k)s+=Math.hypot(p.x-pts[k-1].x,p.z-pts[k-1].z);
      const fade=smooth(0,R.spring,s);   // nascente: leito raso que vai ficando fundo
      let hw=Math.min(R.wMax,R.wMin+R.wGrow*s)*(1+R.mergeBoost*(p.c-1));
      if(p.f>=R.lake)hw=Math.max(hw,Math.min(R.lakeMax,3+p.f*1.5));   // depressão enchida: lago
      const ext=Math.ceil(hw+R.valley+1);
      for(let z=Math.max(0,Math.floor(p.z)-ext);z<=Math.min(W-1,Math.ceil(p.z)+ext);z++)for(let x=Math.max(0,Math.floor(p.x)-ext);x<=Math.min(W-1,Math.ceil(p.x)+ext);x++){
        const d=Math.hypot(x-p.x,z-p.z),i=z*W+x;
        const ch=(1-smooth(hw*0.5,hw+R.bank,d))*fade,va=(1-smooth(hw*0.5,hw+R.valley,d))*Math.max(fade,0.3);
        if(ch>RCH[i])RCH[i]=ch;if(va>RVAL[i])RVAL[i]=va;
      }
    }
  }
  return{RCH,RVAL,paths};
}
