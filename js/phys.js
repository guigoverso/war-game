'use strict';
// ---------- Colisão, raycast e movimento ----------
const W=640,SEA=10,CHK=32,NCH=W/CHK;
// Mundo de baixo: as dungeons e o escritório ficam bem abaixo do mapa, nas mesmas posições (x,z). Abaixo de UNDER_Y o terreno é ignorado.
// A barreira separa os dois mundos: o que cruza o plano de UNDER_Y (de cima ou de baixo) é bloqueado/removido, e quem chega perto (40 blocos) some antes.
const UNDER_Y=-100,BAR_UP=UNDER_Y+40,BAR_DOWN=UNDER_Y-80;   // BAR_UP: limite inferior do mundo de cima; BAR_DOWN: limite superior do mundo de baixo
const isUnder=y=>y<UNDER_Y;
let H=null,T=null,B=null;               // mapas do mundo (alturas, tipos de tile, bioma)
function tH(x,z){x=Math.floor(x);z=Math.floor(z);if(x<0||z<0||x>=W||z>=W)return SEA-3;return H[z*W+x]}

const Col={
  map:new Map(),stamp:0,all:[],
  add(b){
    b.s=0;this.all.push(b);
    const x0=Math.floor(b.x0/8),x1=Math.floor((b.x1-1e-6)/8),z0=Math.floor(b.z0/8),z1=Math.floor((b.z1-1e-6)/8);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const k=x*4096+z;let l=this.map.get(k);if(!l){l=[];this.map.set(k,l)}l.push(b)}
  },
  remove(b){
    const i=this.all.indexOf(b);if(i>=0)this.all.splice(i,1);
    const x0=Math.floor(b.x0/8),x1=Math.floor((b.x1-1e-6)/8),z0=Math.floor(b.z0/8),z1=Math.floor((b.z1-1e-6)/8);
    for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){const l=this.map.get(x*4096+z);if(l){const k=l.indexOf(b);if(k>=0)l.splice(k,1)}}
  },
  near(x0,z0,x1,z1){
    const out=[],s=++this.stamp;
    const cx0=Math.floor(x0/8),cx1=Math.floor(x1/8),cz0=Math.floor(z0/8),cz1=Math.floor(z1/8);
    for(let x=cx0;x<=cx1;x++)for(let z=cz0;z<=cz1;z++){
      const l=this.map.get(x*4096+z);if(!l)continue;
      for(const b of l){if(b.s===s)continue;b.s=s;if(b.x1>x0&&b.x0<x1&&b.z1>z0&&b.z0<z1)out.push(b)}
    }
    return out;
  }
};

function rayBox(ox,oy,oz,dx,dy,dz,b,maxT){
  let tmin=0,tmax=maxT;
  const o=[ox,oy,oz],d=[dx,dy,dz],mn=[b.x0,b.y0,b.z0],mx=[b.x1,b.y1,b.z1];
  for(let a=0;a<3;a++){
    if(Math.abs(d[a])<1e-9){if(o[a]<mn[a]||o[a]>mx[a])return -1}
    else{let t1=(mn[a]-o[a])/d[a],t2=(mx[a]-o[a])/d[a];if(t1>t2){const t=t1;t1=t2;t2=t}
      if(t1>tmin)tmin=t1;if(t2<tmax)tmax=t2;if(tmin>tmax)return -1}
  }
  return tmin;
}
const RAY={t:0,kind:0};  // kind: 0 nada, 1 terreno, 2 bloco
function rayWorld(ox,oy,oz,dx,dy,dz,maxT){
  let best=maxT,kind=0;const step=0.4,over=oy>UNDER_Y;
  for(let t=step;t<best;t+=step){
    const x=ox+dx*t,y=oy+dy*t,z=oz+dz*t;
    if(over?y<UNDER_Y:y>UNDER_Y){best=Math.max(0,t-step*0.5);kind=2;break}   // barreira entre os dois mundos
    if(over&&y<tH(x,z)){best=Math.max(0,t-step*0.5);kind=1;break}
    if(y>90&&dy>0)break;
  }
  const n=Math.ceil(best/3),s=++Col.stamp;
  for(let i=0;i<=n;i++){
    const t=Math.min(best,i*3),px=ox+dx*t,pz=oz+dz*t,cx=Math.floor(px/8),cz=Math.floor(pz/8);
    for(let a=-1;a<=1;a++)for(let c=-1;c<=1;c++){
      const l=Col.map.get((cx+a)*4096+(cz+c));if(!l)continue;
      for(const b of l){if(b.s===s)continue;b.s=s;const t2=rayBox(ox,oy,oz,dx,dy,dz,b,best);if(t2>=0&&t2<best){best=t2;kind=2}}
    }
  }
  RAY.t=best;RAY.kind=kind;return RAY;
}
function losClear(ax,ay,az,bx,by,bz){
  let dx=bx-ax,dy=by-ay,dz=bz-az;const L=Math.hypot(dx,dy,dz);if(L<0.01)return true;
  dx/=L;dy/=L;dz/=L;rayWorld(ax,ay,az,dx,dy,dz,L-0.1);return RAY.kind===0;
}

// Sonda de chão: devolve altura do chão em (x,z) e se algo bloqueia
const GR={g:0,blocked:false};
function probe(x,z,r,y,hgt,stepH,boxS){
  const bst=boxS===undefined?stepH:boxS;
  let g=y<UNDER_Y?-1e9:Math.max(tH(x,z),tH(x+r,z),tH(x-r,z),tH(x,z+r),tH(x,z-r));   // no mundo de baixo o terreno não conta (só os blocos)
  GR.blocked=false;
  const bs=Col.near(x-r,z-r,x+r,z+r);
  for(let i=0;i<bs.length;i++){
    const b=bs[i];
    const cx=clamp(x,b.x0,b.x1),cz=clamp(z,b.z0,b.z1),dx=x-cx,dz=z-cz;
    if(dx*dx+dz*dz>=r*r)continue;
    if(b.y1<=y+bst+1e-3){if(b.y1>g)g=b.y1}
    else if(b.y0<y+hgt)GR.blocked=true;
  }
  GR.g=g;
}
// Move entidade {x,y,z,vy,ground} em XZ com deslizamento. r=raio, hgt=altura, stepH=degrau máximo
function moveXZ(e,dx,dz,r,hgt,stepH){
  let moved=0;
  if(dx!==0){const nx=clamp(e.x+dx,2,W-2);probe(nx,e.z,r,e.y,hgt,stepH,e.boxStep);if(!GR.blocked&&GR.g-e.y<=stepH+1e-3){e.x=nx;moved+=Math.abs(dx)}}
  if(dz!==0){const nz=clamp(e.z+dz,2,W-2);probe(e.x,nz,r,e.y,hgt,stepH,e.boxStep);if(!GR.blocked&&GR.g-e.y<=stepH+1e-3){e.z=nz;moved+=Math.abs(dz)}}
  return moved;
}
const GRAV=24;
function moveY(e,dt,r,hgt,stepH){
  probe(e.x,e.z,r,e.y,hgt,stepH,e.boxStep);
  const g=GR.g;
  if(e.ground&&e.vy<=0&&e.y-g<=stepH+0.02){e.y=g;e.vy=0;return}
  e.vy-=GRAV*dt;e.y+=e.vy*dt;
  if(e.y<=g&&e.vy<=0){e.y=g;e.vy=0;e.ground=true}else e.ground=false;
}

