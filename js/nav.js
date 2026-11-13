'use strict';
// ---------- Navegação: grade de obstáculos + A* para NPCs, aliados e inimigos ----------
const NAV={blocked:null,g:null,stamp:null,cur:0,came:null,budget:3,heap:new Heap()};
function buildNav(){
  const bl=new Uint8Array(W*W);
  for(let i=0;i<W;i++){for(const k of[0,1,2,W-1,W-2,W-3]){bl[k*W+i]=1;bl[i*W+k]=1}}
  const bu=new Uint8Array(W*W).fill(1);if(DG.ok)for(let z=DG.rz;z<DG.rz+DG.S;z++)for(let x=DG.rx;x<DG.rx+DG.S;x++)bu[z*W+x]=0;   // grade do mundo de baixo (dungeons): chão plano em DG.Y
  for(const b of Col.all){
    if(b.y0<UNDER_Y){const x0=Math.max(0,Math.floor(b.x0-0.35)),x1=Math.min(W-1,Math.floor(b.x1+0.35)),z0=Math.max(0,Math.floor(b.z0-0.35)),z1=Math.min(W-1,Math.floor(b.z1+0.35));for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)if(b.y1>DG.Y+0.45&&b.y0<DG.Y+1.8)bu[z*W+x]=1;continue}
    const x0=Math.max(0,Math.floor(b.x0-0.35)),x1=Math.min(W-1,Math.floor(b.x1+0.35)),z0=Math.max(0,Math.floor(b.z0-0.35)),z1=Math.min(W-1,Math.floor(b.z1+0.35));
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++){const h=H[z*W+x];if(b.y1>h+0.45&&b.y0<h+1.8)bl[z*W+x]=1}
  }
  NAV.blockedU=bu;NAV.blocked=bl;NAV.g=new Float32Array(W*W);NAV.stamp=new Uint32Array(W*W);NAV.came=new Int32Array(W*W);NAV.cur=0;
}
function navFree(x,z){x=Math.floor(x);z=Math.floor(z);return x>=0&&z>=0&&x<W&&z<W&&!NAV.blocked[z*W+x]}
const navGrid=u=>u?NAV.blockedU:NAV.blocked,navH=(u,i)=>u?0:H[i];   // u = verdadeiro no mundo de baixo
// linha de visão na grade (sem paredes e sem degraus altos)
function gridLos(x0,z0,x1,z1,u){
  const BL=navGrid(u);
  const d=Math.hypot(x1-x0,z1-z0),n=Math.ceil(d/0.5);let px=Math.floor(x0),pz=Math.floor(z0);
  for(let i=1;i<=n;i++){
    const t=i/n,cx=Math.floor(x0+(x1-x0)*t),cz=Math.floor(z0+(z1-z0)*t);
    if(cx===px&&cz===pz)continue;
    if(cx<0||cz<0||cx>=W||cz>=W)return false;
    const k=cz*W+cx;if(BL[k])return false;
    if(Math.abs(navH(u,k)-navH(u,pz*W+px))>1)return false;
    if(cx!==px&&cz!==pz&&(BL[pz*W+cx]||BL[cz*W+px]))return false;
    px=cx;pz=cz;
  }
  return true;
}
function findPath(sx,sz,gx,gz,u){
  const BL=navGrid(u);
  let six=Math.floor(sx),siz=Math.floor(sz),gix=Math.floor(gx),giz=Math.floor(gz);
  six=clamp(six,3,W-4);siz=clamp(siz,3,W-4);gix=clamp(gix,3,W-4);giz=clamp(giz,3,W-4);
  if(BL[giz*W+gix]){
    let found=false;
    for(let r=1;r<=5&&!found;r++)for(let dz=-r;dz<=r&&!found;dz++)for(let dx=-r;dx<=r;dx++){
      const x=gix+dx,z=giz+dz;if(x>2&&z>2&&x<W-3&&z<W-3&&!BL[z*W+x]){gix=x;giz=z;found=true;break}}
  }
  const u0=!!u,st=++NAV.cur,g=NAV.g,sp=NAV.stamp,came=NAV.came,bl=BL,hp=NAV.heap;hp.a.length=0;
  const s=siz*W+six,goal=giz*W+gix;
  sp[s]=st;g[s]=0;came[s]=-1;hp.push(0,s);
  let best=s,bh=1e9,exp=0;
  const heur=(x,z)=>{const dx=Math.abs(x-gix),dz=Math.abs(z-giz);return Math.max(dx,dz)+0.414*Math.min(dx,dz)};
  while(hp.size&&exp<5500){
    const u=hp.pop()[1];exp++;
    if(u===goal){best=u;break}
    const ux=u%W,uz=(u/W)|0,uh=heur(ux,uz);if(uh<bh){bh=uh;best=u}
    for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dz)continue;const vx=ux+dx,vz=uz+dz,v=vz*W+vx;
      if(bl[v])continue;if(Math.abs(navH(u0,v)-navH(u0,u))>1)continue;
      if(dx&&dz&&(bl[uz*W+vx]||bl[vz*W+ux]))continue;
      const ng=g[u]+(dx&&dz?1.414:1)*(!u0&&H[v]<SEA?3:1);
      if(sp[v]!==st||ng<g[v]){sp[v]=st;g[v]=ng;came[v]=u;hp.push(ng+heur(vx,vz),v)}
    }
  }
  const pts=[];for(let u=best;u!==-1;u=came[u])pts.push([(u%W)+0.5,((u/W)|0)+0.5]);
  pts.reverse();
  // suaviza com visão direta (alcance limitado)
  const out=[];let i=0;
  while(i<pts.length-1){let j=Math.min(pts.length-1,i+14);while(j>i+1&&!gridLos(pts[i][0],pts[i][1],pts[j][0],pts[j][1],u0))j--;out.push(pts[j]);i=j}
  return out;
}
// Move em direção ao alvo contornando paredes. Mesma assinatura de steer().
function navMove(e,gx,gz,speed,dt,r,hgt,stepH){
  const d=Math.hypot(gx-e.x,gz-e.z),u=e.y<UNDER_Y;
  if(d<2.5||!NAV.blocked||gridLos(e.x,e.z,gx,gz,u)){e.path=null;return steer(e,gx,gz,speed,dt,r,hgt,stepH)}
  e.navT=(e.navT||0)-dt;
  if(!e.path||e.navT<=0||Math.hypot(e.pg[0]-gx,e.pg[1]-gz)>5){
    if(NAV.budget>0||!e.path){NAV.budget--;e.path=findPath(e.x,e.z,gx,gz,u);e.pi=0;e.pg=[gx,gz];e.navT=0.8+Math.random()*0.6}
  }
  if(!e.path||!e.path.length)return steer(e,gx,gz,speed,dt,r,hgt,stepH);
  let wp=e.path[e.pi];
  while(wp&&e.pi<e.path.length-1&&Math.hypot(wp[0]-e.x,wp[1]-e.z)<0.9){e.pi++;wp=e.path[e.pi]}
  steer(e,wp[0],wp[1],speed,dt,r,hgt,stepH);
  return d;
}
