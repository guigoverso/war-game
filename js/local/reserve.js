'use strict';
// ---------- Reserva: decidir antes onde ficam as cidades, esculpir o terreno depois (feature 7, fase 1) ----------
// Só com ?reserva=1 (reserveOn, js/modifiers/reserve-modifiers.js). Fluxo em genWorld: terreno rascunho -> locais -> reserveCities (laço de
// verificação no rascunho) -> genRelief(final, reservas como `stamps`): a pegada e a faixa plana viram chão da cidade, com rampa até o relevo.

// fração da pegada + faixa plana (Chebyshev <= RESERVE.apron) que era água no rascunho (H ainda é o rascunho); 1 se não há pegada
function reserveInvented(c){
  if(!c.foot)return 1;
  const Hc=c.half,N=2*Hc+1,A=RESERVE.apron;let tot=0,wet=0;
  const near=(x,z)=>{for(let dz=-A;dz<=A;dz++)for(let dx=-A;dx<=A;dx++)if(cityIn(c,x+dx,z+dz))return true;return false};
  for(let z=-Hc-A;z<=Hc+A;z++)for(let x=-Hc-A;x<=Hc+A;x++){
    if(!near(x,z))continue;tot++;
    const wx=c.cx+x,wz=c.cz+z;if(wx<0||wz<0||wx>=W||wz>=W||H[wz*W+wx]<SEA+1)wet++;
  }
  return tot?wet/tot:1;
}
const reserveOK=c=>c.foot&&reserveInvented(c)<=RESERVE.maxInvented;
// laço no rascunho: quem falha é movido de ponto, encolhido até minHalf, troca de candidato; sem solução (e acima do mínimo) é removido.
// Devolve o número de voltas usadas (WORLD.reserve guarda o resumo para os testes).
function reserveCities(cities,cand,seed,minCities){
  let round=0,removed=0;
  for(const c of cities)cityFootPlan(c,seed);
  for(;round<RESERVE.maxRounds;round++){
    const bad=cities.filter(c=>!reserveOK(c));if(!bad.length)break;
    for(const c of bad){
      while(!reserveOK(c)&&(c.half0||c.half)>RESERVE.minHalf){   // encolhe de 4 em 4
        c.half0=Math.max(RESERVE.minHalf,(c.half0||c.half)-4);cityFootPlan(c,seed);
      }
      if(!reserveOK(c)&&cityFootRelocate(c,cities,cand,seed)&&reserveOK(c))continue;
    }
  }
  for(let i=cities.length-1;i>=0;i--){   // o que sobrou ruim: remove, se ainda sobra o mínimo de cidades
    if(!reserveOK(cities[i])&&cities.length>minCities){cities.splice(i,1);removed++}
  }
  WORLD.reserve={rounds:round,removed};
  return round;
}
// lados da cidade que ficam com a montanha natural: onde o terreno além da borda é bem mais alto que a pegada (H ainda é o rascunho).
// c.mtn = {E,W,S,N} (ou null). Sorteio pela semente, até RESERVE.mtnMax lados. cityFootFlatten não faz rampa nesses lados e cityFootGates fecha o portão.
function reserveMountains(c,seed){
  c.mtn=null;if(!c.foot)return;
  const Hc=c.half;let sum=0,n=0;
  for(let z=-Hc;z<=Hc;z+=2)for(let x=-Hc;x<=Hc;x+=2)if(cityIn(c,x,z)){sum+=H[(c.cz+z)*W+c.cx+x];n++}
  const ref=sum/n,opts=[];
  for(const [d,dx,dz] of[['E',1,0],['W',-1,0],['S',0,1],['N',0,-1]]){
    let k=0;while(k<Hc&&cityIn(c,(k+1)*dx,(k+1)*dz))k++;
    let s=0,m=0;   // altura média de 5 a 18 blocos além da borda, em 5 fileiras laterais
    for(let t=RESERVE.apron+2;t<=RESERVE.apron+16;t+=2)for(let l=-10;l<=10;l+=5){
      const x=c.cx+(k+t)*dx+l*dz,z=c.cz+(k+t)*dz+l*dx;
      if(x>=0&&z>=0&&x<W&&z<W){s+=H[z*W+x];m++}
    }
    if(m&&s/m>=ref+RESERVE.mtnRise)opts.push([d,s/m]);
  }
  const rg=new RNG((seed*53+c.id*31+7)>>>0);for(let i=0;i<3;i++)rg.next();
  opts.sort((a,b)=>b[1]-a[1]);const m={E:false,W:false,S:false,N:false};let cnt=0;
  for(const [d] of opts)if(cnt<RESERVE.mtnMax&&rg.chance(RESERVE.mtnChance)){m[d]=true;cnt++}
  if(cnt)c.mtn=m;
}

// ---------- Estradas e pontes por reserva (feature 7, fase 2) ----------
// Com a pegada das cidades já aplainada (genRelief com `stamps`), cada estrada é traçada SEM pintar nada (roadTiles) e vira um corredor:
// altura suavizada ao longo da rota, ponte com tabuleiro reto na altura das margens e cabeceira de BRIDGE_HEAD blocos no mesmo nível.
// O corredor entra no terreno final (reserveRoadsRelief, dentro de genRelief) e só depois T/WORLD.bt/WORLD.bridges são pintados (reservePaintRoads).
// plan = {own: Map(célula -> {h, h0, t:'r'|'b', w}), sh: Map(célula -> altura do ombro), bridges: [...], bad}
function reservePlanRoads(cities,edges){
  const own=new Map(),sh=new Map(),plan={own,sh,bridges:[],bad:0},hd=BRIDGE_HEAD;
  // reserva uma estrada (a lista de tiles já traçada por roadTiles). noBridge: desiste (false) se precisar de ponte
  const lay=(a,b,tiles,noBridge)=>{
    const n=tiles.length;
    const ki=i=>tiles[i].z*W+tiles[i].x,base=tiles.map((t,i)=>H[ki(i)]),wet=base.map(h=>h<SEA);
    // trechos curtos de água viram aterro de estrada comum; os outros viram ponte (trechos de ponte muito próximos viram uma só)
    const segs=[];
    for(let i=0;i<n;){
      if(!wet[i]){i++;continue}
      let f=i;while(f+1<n&&wet[f+1])f++;
      if(f-i+1>ROAD_FILL_MAX){
        const q=segs[segs.length-1];
        if(q&&i-q[1]-1<=2*hd)q[1]=f;else segs.push([i,f]);
      }
      i=f+1;
    }
    if(noBridge&&segs.length)return false;
    const bridge=new Uint8Array(n),head=new Uint8Array(n),pin=new Array(n).fill(null);
    for(const [i,f] of segs){
      for(let j=i;j<=f;j++)bridge[j]=1;
      // altura do tabuleiro: a das margens (média das duas); se um tile já é tabuleiro de outra estrada, usa a dele
      let dk=null;
      for(let j=Math.max(0,i-hd);j<=Math.min(n-1,f+hd)&&dk===null;j++)for(let dz=-5;dz<=5&&dk===null;dz++)for(let dx=-5;dx<=5;dx++){   // (5 blocos: tabuleiros vizinhos se encostam e precisam da mesma altura)
        const o=own.get((tiles[j].z+dz)*W+tiles[j].x+dx);if(o&&o.t==='b'){dk=o.h;break}}   // cabeceira ou tabuleiro de outra estrada por perto
      if(dk===null){const hl=base[Math.max(0,i-1)],hr=base[Math.min(n-1,f+1)];dk=Math.max(SEA+1,Math.round((hl+hr)/2))}
      for(let j=Math.max(0,i-hd);j<=Math.min(n-1,f+hd);j++){pin[j]=dk;if(!bridge[j])head[j]=1}
    }
    // altura ao longo da rota: média móvel (janela de 11) sobre a terra, depois os pontos fixos (ponte, cabeceira, portões, cruzamentos), depois limite de 1 por bloco
    let hs=base.map(h=>Math.max(h,SEA+1));
    for(let pass=0;pass<3;pass++){const nx=hs.slice();for(let i=0;i<n;i++){let s2=0,c2=0;for(let k=-5;k<=5;k++){const j=i+k;if(j>=0&&j<n){s2+=hs[j];c2++}}nx[i]=s2/c2}hs=nx}
    hs=hs.map(Math.round);
    for(let i=0;i<n;i++){const o=own.get(ki(i));if(o&&pin[i]===null)pin[i]=o.h}   // cruzamento (ou ponta de ligação) com estrada já planejada
    pin[0]=pin[0]??base[0];pin[n-1]=pin[n-1]??base[n-1];   // os portões ficam na altura da faixa plana da cidade
    for(let i=0;i<n;i++)if(pin[i]!==null)hs[i]=pin[i];
    for(let i=1;i<n;i++)if(pin[i]===null)hs[i]=clamp(hs[i],hs[i-1]-1,hs[i-1]+1);
    for(let i=n-2;i>=0;i--)if(pin[i]===null)hs[i]=clamp(hs[i],hs[i+1]-1,hs[i+1]+1);
    // ponte já existente (outra estrada passou antes pelos mesmos tiles): não registra de novo
    const dup=segs.map(([i,f])=>{for(let j=i;j<=f;j++){const o=own.get(ki(j));if(!o||o.t!=='b')return false}return true});
    // carimba o corredor: a primeira estrada a reservar a célula fica com ela; dentro da mesma estrada a altura é a do ponto da rota mais próximo
    const near=new Map();
    for(let i=0;i<n;i++){
      const wide=bridge[i]||head[i],R=wide?BRIDGE_R:1.5;
      for(let dz=-2;dz<=2;dz++)for(let dx=-2;dx<=2;dx++){
        const x=tiles[i].x+dx,z=tiles[i].z+dz;if(x<1||z<1||x>=W-1||z>=W-1)continue;
        const d=Math.hypot(dx,dz),k=z*W+x;
        if(d<=R){
          const o=own.get(k);
          if(!o){own.set(k,{h:hs[i],h0:H[k],t:wide?'b':'r'});near.set(k,d)}
          else if(near.has(k)&&d<near.get(k)-1e-6){o.h=hs[i];near.set(k,d)}   // a altura vem do ponto da rota MAIS PERTO (a faixa inteira fica no mesmo nível, sem degraus ao lado)
        }
        else if(d<=2.6&&!wide&&!sh.has(k))sh.set(k,hs[i]);
      }
    }
    segs.forEach(([i,f],q)=>{
      if(dup[q])return;
      const s0=Math.max(0,i-hd),e0=Math.min(n-1,f+hd);
      plan.bridges.push({tiles:tiles.slice(s0,e0+1).map(t=>({x:t.x,z:t.z})),len:f-i+1,wi:i-s0,we:f-s0,road:[a.id,b.id]});
    });
    let span=0,run=0;for(let i=0;i<n;i++){if(wet[i]){run++;span=Math.max(span,run)}else run=0}
    if(span>ROAD_SPAN_MAX)plan.bad++;
    return true;
  };
  for(const e of edges){
    const a=cities[e[0]],b=cities[e[1]];
    lay(a,b,roadTiles(a,b,cities,{water:RESERVE.roadWater,isRoad:k=>own.has(k)}),false);
  }
  // portões abertos sem estrada: ligam-se à estrada planejada mais próxima (até RESERVE.gateLinkMax blocos, sem ponte); sem estrada por perto ficam como estão
  let links=0;
  for(const c of cities)for(const d of['E','W','S','N']){
    if(!c.gland||!c.gland[d]||c.gates.some(g=>g.dir===d))continue;
    const [gx,gz]=cityGatePos(c,d,3);
    if(own.has(Math.floor(gz)*W+Math.floor(gx))){c.gates.push({dir:d});continue}   // a estrada de outro portão já passa em cima
    let best=-1,bd=1e9;
    for(const [k,o] of own){if(o.t!=='r')continue;const q=Math.hypot(k%W-gx,((k/W)|0)-gz);if(q<bd){bd=q;best=k}}
    if(best<0||bd>RESERVE.gateLinkMax)continue;
    const tgt={cx:best%W,cz:(best/W)|0,half:-3,gates:[]};   // alvo: a célula de estrada (mesmo truque das estradas de POI)
    const tiles=roadTiles(c,tgt,cities,{water:RESERVE.roadWater,isRoad:k=>own.has(k),dirA:d});
    if(lay(c,tgt,tiles,true))links++;else c.gates.pop();   // (roadTiles já registrou o portão; sem ponte ele volta a ficar sem estrada)
  }
  WORLD.reserve=Object.assign(WORLD.reserve||{},{gateLinks:links,roads:edges.length,bridges:plan.bridges.length,roadsBad:plan.bad});
  WORLD.roadPlan=plan;   // (para as ferramentas de teste)
  return plan;
}
// dentro de genRelief: terra do corredor na altura planejada (também sob o aterro); ombros limitados a 1 bloco de diferença; a água sob o tabuleiro fica
function reserveRoadsRelief(plan){
  for(const [k,o] of plan.own)if(!(o.t==='b'&&o.h0<SEA))H[k]=o.h;
  for(const [k,h] of plan.sh)if(!plan.own.has(k)&&H[k]>=SEA)H[k]=clamp(H[k],h-1,h+1);
}
// depois do terreno final: pinta T_ROAD/T_BRIDGE, o leito das pontes (WORLD.bt) e o registro WORLD.bridges
function reservePaintRoads(plan){
  const BT=WORLD.bt;
  for(const [k,o] of plan.own){
    if(o.t==='r'){T[k]=T_ROAD;continue}
    BT.set(k,{h0:o.h0});H[k]=o.h;T[k]=T_BRIDGE;
  }
  for(const br of plan.bridges)WORLD.bridges.push(Object.assign({id:WORLD.bridges.length,toll:null},br));
}
// Depois das estradas de POI (genPOIs): portão aberto ainda sem estrada liga-se ao T_ROAD mais próximo (inclui as estradas de POI, que só existem agora).
// Usa o carveRoad antigo (pinta na hora, sem ponte) e desenha o toco de 4 blocos além da borda, como buildCity faz nos portões com estrada.
function reserveGateLinks(cities){
  let n=0;
  for(const c of cities)for(const d of['E','W','S','N']){
    if(!c.gland||!c.gland[d]||c.gates.some(g=>g.dir===d))continue;
    const [gx,gz]=cityGatePos(c,d,3);let best=null,bd=1e9;
    for(let z=6;z<W-6;z+=3)for(let x=6;x<W-6;x+=3){
      if(T[z*W+x]!==T_ROAD||cityNear(c,x,z,8))continue;
      const q=Math.hypot(x-gx,z-gz);if(q<bd){bd=q;best=[x,z]}
    }
    if(!best||bd>RESERVE.gateLinkMax)continue;
    if(!carveRoad(c,{cx:best[0],cz:best[1],half:-3,gates:[]},cities,{water:ROAD_WATER_OLD,noBridge:true,dirA:d,pinEnds:true})){c.gates.pop();continue}
    const E=c.gedge[d];
    for(let k=1;k<=4;k++)for(let w=-1;w<=1;w++){
      const lx=d==='E'?E+k:d==='W'?-E-k:w,lz=d==='S'?E+k:d==='N'?-E-k:w;
      if(getT(c.cx+lx,c.cz+lz)===T_NAT)setTL(c,lx,lz,T_ROAD);
    }
    n++;
  }
  if(WORLD.reserve)WORLD.reserve.gateLinksLate=n;
}

// ---------- POIs grandes por reserva (feature 7, fase 3) ----------
// Depois das estradas planejadas e antes do terreno final: roda a escolha de lugares de genWorldPois em modo `dry` sobre o rascunho (as células das
// estradas planejadas valem T_ROAD/T_BRIDGE só durante a escolha) e devolve a lista de POIs. Os tipos de RESERVE.poiTypes viram plataforma + rampa
// no terreno final (genRelief); os outros são aplainados depois (genWorldPois com WORLD.poiPlan). A região das dungeons também é decidida aqui.
function reservePois(cities,roadPlan){
  if(!RESERVE.poiOn||WORLD.showcaseMode)return null;
  const t0=performance.now(),marked=[];
  for(const [k,o] of roadPlan.own){marked.push(k);T[k]=o.t==='b'?T_BRIDGE:T_ROAD}
  const taken=cities.map(c=>({x:c.cx,z:c.cz,r:c.half+8}));
  WORLD.dgSite=dgSite(cities);if(WORLD.dgSite)taken.push({x:WORLD.dgSite[0]+DG.S/2,z:WORLD.dgSite[1]+DG.S/2,r:DG.S*0.75});
  const list=genWorldPois(cities,taken,true);
  for(const k of marked)T[k]=T_NAT;
  WORLD.reserve=Object.assign(WORLD.reserve||{},{poiPlanned:list.length,poiReserved:list.filter(p=>poiReserved(p.type)).length,msPois:Math.round(performance.now()-t0)});
  return list;
}
// dentro de genRelief (depois das cidades, antes dos corredores de estrada): plataforma plana de raio r e rampa suave em volta (circular). A rampa limita a
// diferença para o relevo original a RESERVE.poiSlope blocos de altura por bloco de distância (aterro e corte); onde o relevo já é mais suave que isso nada muda. Não mexe no chão das cidades.
function reservePoisRelief(list){
  const S=RESERVE.poiSlope,R=RESERVE.poiRamp,cs=WORLD.cities||[];
  for(const p of list){
    if(!poiReserved(p.type))continue;
    const r=Math.round(POI_DEFS[p.type].r*RESERVE.poiDisc),y=p.y,E=r+R;   // plataforma redonda: raio r*poiDisc (os cantos do quadrado do prédio ainda cabem)
    for(let dz=-E;dz<=E;dz++)for(let dx=-E;dx<=E;dx++){
      const x=p.cx+dx,z=p.cz+dz;if(x<2||z<2||x>=W-2||z>=W-2)continue;
      const d=Math.max(Math.hypot(dx,dz)-r,0),i=z*W+x;
      if(d>R)continue;
      if(WORLD.rivers&&H[i]<SEA)continue;   // rio desenhado: a rampa não aterra a água
      if(d>0&&cs.some(c=>Math.abs(c.cx-x)<=c.half+RESERVE.apron+8&&Math.abs(c.cz-z)<=c.half+RESERVE.apron+8))continue;
      const k=d*S;H[i]=d===0?y:Math.round(clamp(H[i],y-k,y+k));
    }
  }
}
// Disco plano de raio r (só o enfeite do dormente: fogueira, jardim, poço, marco) com rampa circular suave em volta; o resto do lugar reservado
// (RESERVE.dormFlat < raio do dormente) fica com o relevo natural. Mesma regra de inclinação dos POIs grandes (RESERVE.poiSlope).
function reserveFlatDisc(x,z,r,y,ramp){   // ramp: alcance da rampa (padrão RESERVE.dormRamp)
  const E=r+(ramp||RESERVE.dormRamp);
  for(let dz=-E;dz<=E;dz++)for(let dx=-E;dx<=E;dx++){
    const px=x+dx,pz=z+dz,d=Math.hypot(dx,dz);if(px<2||pz<2||px>=W-2||pz>=W-2||d>E)continue;
    const k=Math.max(0,d-r)*RESERVE.poiSlope,i=pz*W+px;if(WORLD.rivers&&H[i]<SEA)continue;H[i]=d<=r?y:Math.round(clamp(H[i],y-k,y+k));
  }
}

// ---------- Preferência por água (feature 7, fase 4) ----------
// No rascunho, mede a distância de cada candidato de cidade até a água (rio, lago ou mar; H < SEA) e guarda em c.wd (RESERVE.waterMax se não há água por perto).
// Cidade que "prefere água" (sorteio com RESERVE.waterBias em genWorld) ganha pontos em pickSites (reserveWaterScore) perto da distância ideal:
// a borda da cidade (cerca de 42 blocos do centro) a RESERVE.waterNear blocos da margem. As demais ficam indiferentes (nem bônus nem castigo).
function reserveWaterDist(cand){
  const R=RESERVE.waterMax;
  for(const c of cand){
    let best=R;
    for(let dz=-R;dz<=R;dz+=4)for(let dx=-R;dx<=R;dx+=4){
      const x=c.x+dx,z=c.z+dz;if(x<0||z<0||x>=W||z>=W)continue;
      const d=Math.hypot(dx,dz);if(d<best&&H[z*W+x]<SEA)best=d;
    }
    c.wd=best;
  }
}
const reserveWaterScore=c=>RESERVE.waterBonus*(1-clamp(Math.abs(c.wd-RESERVE.waterNear-42)/RESERVE.waterTol,0,1));
