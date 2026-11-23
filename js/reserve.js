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
