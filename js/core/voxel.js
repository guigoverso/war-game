'use strict';
// ---------- Personagens em voxels (estilo anime) ----------
// Cada parte do corpo (perna, braço, tronco, cabeça) é uma malha única de voxels com faces fundidas (greedy meshing),
// guardada em cache por "receita" para ser reaproveitada entre personagens iguais. O rosto é uma textura 32x32 pintada
// sobre a frente da cabeça. buildHuman(o) mantém a mesma interface do modelo antigo (legs, arms, head, s, height).
const VS=0.052;                                    // tamanho de um voxel (m)
const VOX_MAT=new THREE.MeshLambertMaterial({vertexColors:true});
const VFACE_K={'0+':0.86,'0-':0.80,'1+':1.0,'1-':0.62,'2+':0.93,'2-':0.74};

class VB{
  constructor(){this.m=new Map()}
  set(x,y,z,c){this.m.set(x+','+y+','+z,[x,y,z,c])}
  box(x0,y0,z0,x1,y1,z1,c){for(let x=x0;x<x1;x++)for(let y=y0;y<y1;y++)for(let z=z0;z<z1;z++)this.set(x,y,z,typeof c==='function'?c(x,y,z):c)}
  // geometria com faces coplanares da mesma cor fundidas; origem no pivô (em voxels)
  geo(px,py,pz){
    const lo=[1e9,1e9,1e9],hi=[-1e9,-1e9,-1e9];
    for(const v of this.m.values())for(let a=0;a<3;a++){if(v[a]<lo[a])lo[a]=v[a];if(v[a]>hi[a])hi[a]=v[a]}
    const D=[hi[0]-lo[0]+1,hi[1]-lo[1]+1,hi[2]-lo[2]+1],grid=new Int32Array(D[0]*D[1]*D[2]).fill(-1);
    const at=(a,b,c)=>(a<0||b<0||c<0||a>=D[0]||b>=D[1]||c>=D[2])?-1:grid[a+(b+c*D[1])*D[0]];
    for(const v of this.m.values())grid[(v[0]-lo[0])+((v[1]-lo[1])+(v[2]-lo[2])*D[1])*D[0]]=v[3];
    const pos=[],col=[],nor=[],idx=[],P=[px,py,pz],tc=new THREE.Color();let vi=0;
    for(let a=0;a<3;a++)for(const sg of[1,-1]){
      const u=(a+1)%3,w=(a+2)%3,du=D[u],dw=D[w],k=VFACE_K[a+(sg>0?'+':'-')],n=[0,0,0];n[a]=sg;
      for(let l=0;l<D[a];l++){
        const mask=new Int32Array(du*dw).fill(-1),c=[0,0,0];
        for(let j=0;j<dw;j++)for(let i=0;i<du;i++){
          c[a]=l;c[u]=i;c[w]=j;const cc=at(c[0],c[1],c[2]);if(cc<0)continue;
          c[a]=l+sg;if(at(c[0],c[1],c[2])>=0)continue;mask[i+j*du]=cc;
        }
        for(let j=0;j<dw;j++)for(let i=0;i<du;i++){
          const c0=mask[i+j*du];if(c0<0)continue;
          let wd=1;while(i+wd<du&&mask[i+wd+j*du]===c0)wd++;
          let hg=1;for(;j+hg<dw;hg++){let ok=true;for(let q=0;q<wd;q++)if(mask[i+q+(j+hg)*du]!==c0){ok=false;break}if(!ok)break}
          for(let q=0;q<hg;q++)for(let r=0;r<wd;r++)mask[i+r+(j+q)*du]=-1;
          const pl=lo[a]+l+(sg>0?1:0),u0=lo[u]+i,u1=u0+wd,w0=lo[w]+j,w1=w0+hg;
          const cs=[[u0,w0],[u1,w0],[u1,w1],[u0,w1]];if(sg<0)cs.reverse();
          tc.setHex(c0);
          for(const q of cs){const p=[0,0,0];p[a]=pl;p[u]=q[0];p[w]=q[1];pos.push((p[0]-P[0])*VS,(p[1]-P[1])*VS,(p[2]-P[2])*VS);col.push(tc.r*k,tc.g*k,tc.b*k);nor.push(n[0],n[1],n[2])}
          idx.push(vi,vi+1,vi+2,vi,vi+2,vi+3);vi+=4;
        }
      }
    }
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
    g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));
    g.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));
    g.setIndex(idx);return g;
  }
}
const VGEO=new Map();
// peça articulada: grupo no pivô (voxels) + malha em cache
function vpart(parent,key,px,py,pz,build){
  let g=VGEO.get(key);
  if(!g){const vb=new VB();build(vb);g=vb.geo(px,py,pz);VGEO.set(key,g)}
  const grp=new THREE.Group();grp.position.set(px*VS,py*VS,pz*VS);grp.add(new THREE.Mesh(g,VOX_MAT));parent.add(grp);return grp;
}

// ---------- rosto pintado ----------
const FACE_CACHE=new Map();
const IRIS=[[0x4a2a14,0x6a3e1e,0x9a6a3a],[0x2a4a8a,0x3a7ad0,0x7ac0f0],[0x2a6a3a,0x3a9a52,0x7ad08a],[0x5a2a8a,0x8a4ad0,0xc08af0],[0x4a5058,0x6a7480,0xa0acb8],[0x5a3a1a,0x8a5a2a,0xc08a4a]];
function faceMaterial(o){
  const key=[o.skin,o.hair,o.iris,o.mouth||0,o.detailed?1:0,o.blush?1:0].join('|');let m=FACE_CACHE.get(key);if(m)return m;
  const css=c=>'#'+c.toString(16).padStart(6,'0'),cv=document.createElement('canvas');cv.width=cv.height=32;const g=cv.getContext('2d');
  const px=(x,y,c)=>{g.fillStyle=css(c);g.fillRect(x,y,1,1)},ir=IRIS[o.iris%IRIS.length],lash=shadec(o.hair,0.35),brow=shadec(o.hair,0.7);
  g.fillStyle=css(o.skin);g.fillRect(0,0,32,32);
  if(!o.detailed){
    // rosto simples: olhos retangulares com um brilho, boca pequena; bochechas só se pedido (crianças e algumas mulheres)
    const eyeS=(x0)=>{
      for(let y=13;y<=18;y++)for(let i=0;i<3;i++)px(x0+i,y,y===13?shadec(ir[0],0.5):y>=17?ir[2]:ir[1]);
      px(x0,13,0xffffff);
    };
    eyeS(7);eyeS(22);
    for(const x of[14,15,16,17])px(x,23,shadec(o.mouth||0xb86050,1.0));
    if(o.blush)for(const [bx,by] of[[4,20],[5,20],[4,21],[5,21],[26,20],[27,20],[26,21],[27,21]])px(bx,by,0xf2a090);
    const t0=new THREE.CanvasTexture(cv);t0.magFilter=THREE.NearestFilter;t0.minFilter=THREE.NearestFilter;t0.generateMipmaps=false;
    m=new THREE.MeshLambertMaterial({map:t0,emissive:0x555555,emissiveMap:t0});FACE_CACHE.set(key,m);return m;
  }
  const eye=(x0,mir)=>{
    const X=i=>mir?x0+6-i:x0+i;
    for(let i=0;i<7;i++)px(X(i),12,lash);px(X(0),11,lash);
    for(let y=13;y<=18;y++){
      px(X(0),y,y<16?0xf6f2ee:0xe8dcd4);px(X(6),y,y<16?0xf6f2ee:0xe8dcd4);
      for(let i=1;i<=5;i++){const t=(y-13)/5;px(X(i),y,t<0.35?ir[0]:t<0.7?ir[1]:ir[2])}
    }
    for(let y=14;y<=17;y++)for(let i=2;i<=4;i++)px(X(i),y,shadec(ir[0],0.45));
    px(X(1),14,0xffffff);px(X(2),14,0xffffff);px(X(1),15,0xffffff);px(X(4),17,0xffffff);
    for(let i=1;i<=5;i++)px(X(i),19,shadec(lash,1.4));
    for(let i=0;i<6;i++)px(X(i),i<3?9:8,brow);
  };
  eye(5,false);eye(20,true);
  px(16,21,shadec(o.skin,0.82));px(15,21,shadec(o.skin,0.9));
  const mc=o.mouth||0xb86050;for(const x of[14,15,16,17])px(x,24,mc);px(13,23,shadec(mc,1.2));px(18,23,shadec(mc,1.2));
  for(const [bx,by] of[[3,21],[4,21],[3,22],[4,22],[5,22],[27,21],[28,21],[27,22],[28,22],[26,22]])px(bx,by,0xf2a090);
  const t=new THREE.CanvasTexture(cv);t.magFilter=THREE.NearestFilter;t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;
  m=new THREE.MeshLambertMaterial({map:t,emissive:0x555555,emissiveMap:t});FACE_CACHE.set(key,m);return m;
}
const FACE_GEO=new THREE.PlaneGeometry(8*VS,8*VS);

// ---------- peças do corpo humano ----------
function legPart(parent,sx,pants,shoes,extra){
  const x0=sx<0?-5:1;
  return vpart(parent,'leg|'+x0+'|'+pants+'|'+shoes+'|'+(extra||''),x0+2,16,0.5,v=>{
    v.box(x0,0,-2,x0+4,1,4,shadec(shoes,0.6));v.box(x0,1,-2,x0+4,5,4,shoes);v.box(x0,4,-2,x0+4,5,3,shadec(shoes,1.25));
    v.box(x0,5,-2,x0+4,16,3,pants);v.box(x0,10,-2,x0+4,11,3,shadec(pants,0.86));
  });
}
function armPart(parent,sx,sleeve,skin){
  const x0=sx<0?-8:5;
  return vpart(parent,'arm|'+x0+'|'+sleeve+'|'+skin,sx*6.5,26,0.5,v=>{
    v.box(x0,14,-1,x0+3,19,2,skin);v.box(x0,19,-1,x0+3,26,2,sleeve);v.box(x0,19,-1,x0+3,20,2,shadec(sleeve,0.85));
  });
}
function torsoPart(parent,o){
  const key='torso|'+[o.shirt,o.pants,o.apron,o.vest,o.pack,o.scarf,o.robe].join('|');
  return vpart(parent,key,0,16,0,v=>{
    v.box(-5,16,-3,5,28,3,o.shirt);v.box(-5,16,-3,5,18,3,shadec(o.pants,1.1));v.box(-5,27,-3,5,28,3,shadec(o.shirt,1.15));
    if(o.robe)v.box(-6,9,-4,6,17,4,o.robe);
    if(o.apron){v.box(-3,17,3,3,26,4,o.apron);v.box(-3,25,3,3,26,4,shadec(o.apron,0.85))}
    if(o.vest){v.box(-6,18,-4,6,27,4,0x4f5a66);v.box(-1,18,4,1,27,5,0x3a444e)}
    if(o.pack)v.box(-3,18,-6,3,26,-3,o.pack);
    if(o.scarf)v.box(-6,26,-4,6,29,4,o.scarf);
  });
}
// cabelo e chapéus: 'short','long','cap','hat','helmet','turban','bandana','none'
function headPart(parent,o){
  const key='head|'+[o.skin,o.hair,o.hairStyle,o.hat,o.beard].join('|');
  const hair=o.hair,hat=o.hat||0x6a6a6a,st=o.hairStyle||'none';
  return vpart(parent,key,0,28,0,v=>{
    v.box(-5,28,-4,5,37,5,o.skin);
    for(let x=-5;x<5;x++)for(let y=28;y<37;y++)for(let z=-4;z<5;z++){
      let n=0;if(x===-5||x===4)n++;if(y===28||y===36)n++;if(z===-4||z===4)n++;if(n>=2)v.m.delete(x+','+y+','+z);
    }
    const hc=(x,y,z)=>(y>=36?(z>>1):(x>>1))&1?shadec(hair,0.9):hair;
    const shell=(y0)=>{v.box(-6,y0,-5,6,37,-4,hc);v.box(-6,y0,-4,-5,37,5,hc);v.box(5,y0,-4,6,37,5,hc)};
    const top=(c)=>{v.box(-6,37,-5,6,38,6,c);v.box(-5,38,-4,5,39,5,c)};
    const fringe=(c)=>{const d=[1,2,1,0,0,0,0,1,2,1];for(let i=0;i<10;i++)v.box(-5+i,36-d[i],5,-4+i,37,6,c)};
    if(st==='short'){shell(30);top(hc);fringe(hc);v.box(-6,32,0,-5,37,6,hc);v.box(5,32,0,6,37,6,hc)}
    else if(st==='long'){shell(24);top(hc);fringe(hc);v.box(-6,25,0,-5,37,6,hc);v.box(5,25,0,6,37,6,hc);v.box(-6,24,-6,6,37,-5,hc)}
    else if(st==='cap'){shell(30);top(hat);v.box(-6,36,5,6,37,6,hat);v.box(-5,36,6,5,37,9,shadec(hat,0.85))}
    else if(st==='hat'){shell(31);v.box(-9,36,-8,9,37,9,hat);v.box(-5,37,-4,5,41,5,hat);v.box(-5,37,-4,5,38,5,shadec(hat,0.6))}
    else if(st==='helmet'){v.box(-6,30,-5,6,35,-4,hat);v.box(-6,35,-5,6,39,6,hat);v.box(-5,39,-4,5,40,5,hat);v.box(-6,35,6,6,36,7,shadec(hat,0.8));v.box(-6,30,-4,-5,35,2,hat);v.box(5,30,-4,6,35,2,hat)}
    else if(st==='turban'){shell(31);v.box(-6,35,-5,6,40,6,hat);v.box(-4,40,-4,4,42,4,hat);v.box(-6,37,-5,6,38,6,shadec(hat,0.82))}
    else if(st==='bandana'){shell(31);top(hc);fringe(hc);v.box(-6,34,-5,6,36,6,hat);v.box(-1,31,-7,1,36,-5,hat)}
    if(o.beard)v.box(-3,28,5,3,30,6,o.beard);
  });
}

function buildHuman(o){
  if(o.miku)return buildMiku(o);
  const s=o.scale||1,root=new THREE.Group(),g=new THREE.Group();g.scale.setScalar(s);root.add(g);
  const skin=o.skin,shirt=o.shirt,pants=o.pants,hair=o.hair||0x333333,shoes=o.shoes||0x2a2a2a;
  const legs=[legPart(g,-1,pants,shoes),legPart(g,1,pants,shoes)];
  torsoPart(g,{shirt,pants,apron:o.apron,vest:o.vest,pack:o.pack,scarf:o.scarf,robe:o.robe});
  const arms=[armPart(g,-1,o.sleeve||shirt,skin),armPart(g,1,o.sleeve||shirt,skin)];
  const head=headPart(g,{skin,hair,hairStyle:o.hairStyle,hat:o.hat,beard:o.beard});
  const fm=faceMaterial({skin,hair,iris:((skin>>4)+(shirt>>3)+(pants>>5))%IRIS.length,blush:!!o.blush});
  const fp=new THREE.Mesh(FACE_GEO,fm);fp.position.set(0,5*VS,5.03*VS);head.add(fp);
  if(o.gun){const gl=o.gun.len||0.7;part(g,GEO_BOX,0.1,0.14,gl,0x222222,0.30,1.12,0.2+gl/2);part(g,GEO_BOX,0.1,0.2,0.14,0x5a3d22,0.30,1.0,0.18)}
  return{group:root,legs,arms,head,s,height:1.95*s,lift:0,quad:false};
}

// ---------- Hatsune Miku (voxel, estilo anime) — prisioneira ----------
function buildMiku(o){
  const root=new THREE.Group(),g=new THREE.Group();g.scale.setScalar(o.scale||1);root.add(g);
  const skin=0xf6d8bc,teal=0x2ab8c0,tealD=0x1a8a96,black=0x1e1e26,grey=0xa4a8ae,mag=0xd02a88;
  const mkLeg=sx=>{const x0=sx<0?-5:1;
    return vpart(g,'miku-leg|'+x0,x0+2,16,0.5,v=>{
      v.box(x0,0,-2,x0+4,1,4,teal);v.box(x0,1,-2,x0+4,5,4,black);v.box(x0,2,4,x0+4,3,5,black);
      v.box(x0,5,-2,x0+4,13,3,black);v.box(x0,12,-2,x0+4,13,3,teal);v.box(x0,13,-2,x0+4,16,3,skin);
    })};
  const legs=[mkLeg(-1),mkLeg(1)];
  vpart(g,'miku-torso',0,16,0,v=>{
    v.box(-5,18,-2,5,28,3,grey);v.box(-5,27,-2,5,28,3,shadec(grey,1.1));
    v.box(-1,19,3,1,27,4,teal);v.box(-2,26,3,2,27,4,teal);                       // gravata
    v.box(-6,13,-4,6,19,5,black);v.box(-6,13,-4,6,14,5,teal);                    // saia
    v.box(-5,16,-3,5,18,4,black);
  });
  const mkArm=sx=>{const x0=sx<0?-8:5;
    return vpart(g,'miku-arm|'+x0,sx*6.5,26,0.5,v=>{
      v.box(x0,14,-1,x0+3,16,2,skin);v.box(x0,16,-1,x0+3,17,2,teal);v.box(x0,17,-1,x0+3,24,2,black);
      v.box(x0,23,-1,x0+3,24,2,teal);v.box(x0,24,-1,x0+3,27,2,skin);
    })};
  const arms=[mkArm(-1),mkArm(1)];
  const head=vpart(g,'miku-head',0,28,0,v=>{
    v.box(-5,28,-4,5,37,5,skin);
    for(let x=-5;x<5;x++)for(let y=28;y<37;y++)for(let z=-4;z<5;z++){let n=0;if(x===-5||x===4)n++;if(y===28||y===36)n++;if(z===-4||z===4)n++;if(n>=2)v.m.delete(x+','+y+','+z)}
    const hc=(x,y,z)=>(y>=36?(z>>1):(x>>1))&1?tealD:teal;
    v.box(-6,24,-6,6,37,-4,hc);v.box(-6,28,-4,-5,37,5,hc);v.box(5,28,-4,6,37,5,hc);        // costas e laterais
    v.box(-6,37,-5,6,38,6,hc);v.box(-5,38,-4,5,39,5,hc);v.box(-4,39,-3,4,40,4,hc);        // topo
    const d=[3,3,2,1,0,1,2,2,3,3];for(let i=0;i<10;i++)v.box(-5+i,36-d[i],5,-4+i,37,6,hc);  // franja
    v.box(-6,27,0,-5,37,6,hc);v.box(5,27,0,6,37,6,hc);                                      // mechas na frente das orelhas
    v.box(-8,32,-1,-6,36,3,black);v.box(6,32,-1,8,36,3,black);v.box(-8,33,0,-7,35,2,mag);v.box(7,33,0,8,35,2,mag); // fones
    v.box(-7,35,-1,7,36,0,black);                                                           // arco do fone
  });
  const fm=faceMaterial({skin,hair:teal,iris:1,mouth:0xc07060,detailed:true,blush:true});
  const fp=new THREE.Mesh(FACE_GEO,fm);fp.position.set(0,5*VS,5.03*VS);head.add(fp);
  // tranças longas: cadeia de segmentos que balança
  const chains=[];
  const SEG=[[3,2,5],[3,2,5],[2,2,5],[2,1,5],[1,1,5]];
  for(const sx of[-1,1]){
    const base=new THREE.Group();base.position.set(sx*8.2*VS,(35-28)*VS,-1*VS);head.add(base);
    let parent=base;const list=[];
    SEG.forEach((sg,i)=>{
      const grp=vpart(parent,'miku-tail|'+i,0,0,0,v=>{const [hw,zt,L]=sg;v.box(-hw,-L,-zt,hw,0,zt,(x,y,z)=>(i%2?tealD:teal));v.box(-hw,-L,-zt,hw,-L+1,zt,tealD)});
      if(i>0)grp.position.set(0,-SEG[i-1][2]*VS,0);list.push(grp);parent=grp;
    });
    chains.push({list,side:sx});
  }
  const sway=(ph,moving,t)=>{
    for(const c of chains){
      const amp=moving?0.17:0.05;
      c.list.forEach((grp,i)=>{grp.rotation.x=Math.sin((moving?ph:t*1.4)-i*0.7+(c.side>0?0:0.8))*amp*(0.5+i*0.2)+(moving?0.08:0.02);grp.rotation.z=Math.sin((moving?ph*0.5:t*0.9)-i*0.6)*amp*0.4+c.side*0.04});
    }
  };
  return{group:root,legs,arms,head,s:o.scale||1,height:1.95*(o.scale||1),lift:0,quad:false,sway};
}

// ---------- Animais e criaturas (voxel) ----------
// coordenadas absolutas em voxels: x = direita, y = cima (chão em 0), z = frente do bicho
const vfur=(c,k)=>(x,y,z)=>shadec(c,0.9+0.2*hash2(x+y*31,z,k||5));
function buildQuad(o){
  const key='Q'+JSON.stringify(o),g=new THREE.Group(),legs=[];
  // cores por espécie: vaca com manchas, ovelha com lã clara e cabeça escura
  const FC=(base,k)=>o.kind==='cow'?(base===o.fur?((x,y,z)=>hash2(Math.floor(x/4)+Math.floor(y/4)*7,Math.floor(z/4),11)>0.6?0x2a2a2a:shadec(0xf2f0ea,0.94+0.08*hash2(x+y*13,z,k))):vfur(base,k)):o.kind==='sheep'?(base===o.fur?(k===6?vfur(0x3a3330,k):((x,y,z)=>shadec(0xeeeae0,0.88+0.16*hash2(x+y*13,z,k)))):vfur(base,k)):vfur(base,k);
  const bw=o.bw,bl=o.bl,bh=o.bh,lh=o.lh,lw=o.lw,hs=o.hs,hl=o.hl,top=lh+bh,hy=top-2-(o.hdrop||0),hz=bl-1;
  vpart(g,key+'b',0,0,0,vb=>{
    vb.box(-bw,lh,-bl,bw,top,bl,FC(o.fur,1));
    vb.box(-bw+1,lh,-bl,bw-1,lh+1,bl,o.belly);                      // barriga clara
    if(!o.kind)vb.box(-1,top-1,-bl,1,top,bl,o.dark);                           // listra escura no dorso
    if(!o.kind)vb.box(-bw,lh+bh-3,bl-5,bw,top,bl,FC(o.dark,2));              // ombros/juba mais escuros
    if(o.hump)vb.box(-bw+2,top,bl-9,bw-2,top+o.hump,bl-2,FC(o.fur,3));
    const tl=o.tail,t0=top-2;
    for(let i=0;i<tl;i++){const up=o.tailUp?(i>>1):0;vb.box(-1,t0+up,-bl-1-i,1,t0+up+2,-bl-i,i>=tl-2?o.belly:o.fur)}
  });
  const head=vpart(g,key+'h',0,hy,hz,vb=>{
    vb.box(-hs+1,hy-hs-1,hz-3,hs-1,hy+hs-1,hz+1,FC(o.fur,4));    // pescoço
    vb.box(-hs,hy-hs,hz,hs,hy+hs,hz+2*hs,FC(o.fur,6));            // crânio
    const sw=Math.max(1,hs-2),zf=hz+2*hs;
    vb.box(-sw,hy-hs,zf,sw,hy+1,zf+hl,o.muzzle);                    // focinho
    vb.box(-sw,hy-hs,zf,sw,hy-hs+1,zf+hl,o.dark);                   // mandíbula
    vb.box(-1,hy,zf+hl-1,1,hy+1,zf+hl,0x111111);                    // nariz
    vb.set(-hs+1,hy,zf-1,o.eye);vb.set(hs-2,hy,zf-1,o.eye);vb.set(-hs+1,hy+1,zf-1,o.eye);vb.set(hs-2,hy+1,zf-1,o.eye);
    if(o.tusks)for(const sd of[-1,1]){const x0=sd>0?sw:-sw-1;vb.box(x0,hy-hs,zf+hl-3,x0+1,hy-hs+2,zf+hl-1,0xf0ecd8);vb.box(x0,hy-hs+2,zf+hl-3,x0+1,hy-hs+3,zf+hl,0xf0ecd8)}   // presas de javali
    if(o.fangs){vb.box(-sw,hy-hs-1,zf+hl-2,-sw+1,hy-hs,zf+hl-1,0xf0f0e8);vb.box(sw-1,hy-hs-1,zf+hl-2,sw,hy-hs,zf+hl-1,0xf0f0e8)}
    if(o.horns)for(const sd of[-1,1]){const x0=sd>0?hs:-hs-1;vb.box(x0,hy+hs-2,hz+1,x0+1,hy+hs-1,hz+3,0xe8e0c8);vb.box(x0,hy+hs-1,hz+1,x0+1,hy+hs+2,hz+2,0xe8e0c8)}
    for(const sd of[-1,1]){
      if(o.ears==='round'){const x0=sd>0?hs-3:-hs;vb.box(x0,hy+hs,hz+1,x0+3,hy+hs+2,hz+4,o.dark);vb.box(x0+1,hy+hs,hz+2,x0+2,hy+hs+2,hz+3,0xb08a7a)}
      else{const x0=sd>0?hs-2:-hs;vb.box(x0,hy+hs,hz+1,x0+2,hy+hs+3,hz+3,o.dark);vb.box(x0+(sd>0?0:1),hy+hs+3,hz+1,x0+(sd>0?1:2),hy+hs+5,hz+2,o.dark)}
    }
  });
  for(const [sx,sz] of[[-1,1],[1,1],[-1,-1],[1,-1]]){
    const x0=sx<0?-bw:bw-lw,z0=sz>0?bl-lw-1:-bl+1;
    legs.push(vpart(g,key+'l'+sx+sz,x0,lh,z0,vb=>{
      vb.box(x0,lh/2|0,z0,x0+lw,lh,z0+lw,FC(o.fur,7));vb.box(x0,0,z0,x0+lw,lh/2|0,z0+lw,FC(o.dark,8));
      vb.box(x0,0,z0+lw,x0+lw,1,z0+lw+1,o.paw||o.dark);
    }));
  }
  return{group:g,legs,arms:[],head,s:o.s||1,height:o.height,lift:0,quad:true};
}
function buildHoundV(fur,dark){
  fur=fur||0x7a5a3a;dark=dark||0x4a3320;
  return buildQuad({fur,dark,belly:shadec(fur,1.25),muzzle:0xb89a70,eye:0xff2a2a,bw:4,bl:9,bh:8,lh:8,lw:3,hs:3,hl:4,tail:7,tailUp:1,ears:'point',fangs:1,height:1,s:1});
}
function buildBearV(){
  return buildQuad({fur:0x5a3a22,dark:0x3a2514,belly:0x6e4a2e,muzzle:0x8a6a4a,eye:0xff3a2a,bw:10,bl:16,bh:19,lh:14,lw:7,hs:7,hl:6,hump:4,tail:2,ears:'round',fangs:1,paw:0xd8d0c0,hdrop:3,height:1.7,s:1.2});
}
function buildBoarV(){
  return buildQuad({fur:0x4a3a2e,dark:0x2a1f18,belly:0x5a4a3a,muzzle:0x6a5444,eye:0xff4a2a,bw:6,bl:11,bh:11,lh:6,lw:3,hs:5,hl:4,hump:3,tail:3,ears:'point',tusks:1,paw:0x1a1410,hdrop:2,height:0.95,s:1.1});
}
function buildScorpionV(){
  const key='SC',g=new THREE.Group(),sh=0x9a6a2e,dk=0x5e3c1a,legs=[];
  vpart(g,key+'b',0,0,0,vb=>{
    vb.box(-6,4,-6,6,9,9,vfur(sh,1));vb.box(-4,9,-2,4,10,6,vfur(dk,2));                    // carapaça
    vb.box(-5,4,-19,5,8,-6,vfur(dk,3));for(let i=0;i<4;i++)vb.box(-5,8,-18+i*3,5,9,-16+i*3,vfur(sh,4+i));   // abdômen em placas
    vb.set(-3,9,7,0x111111);vb.set(3,9,7,0x111111);vb.set(-1,10,4,0xff3a2a);vb.set(1,10,4,0xff3a2a);          // olhos
  });
  const tail=vpart(g,key+'t',0,6,-19,vb=>{
    const c=vfur(sh,9);
    vb.box(-2,5,-23,2,9,-17,c);vb.box(-2,8,-26,2,13,-22,c);vb.box(-2,12,-27,2,17,-23,c);vb.box(-2,16,-26,2,20,-21,c);vb.box(-2,19,-23,2,22,-15,c);
    vb.box(-1,15,-17,1,20,-14,0xb02a2a);vb.box(0,13,-16,1,15,-15,0xb02a2a);   // ferrão
  });
  for(const sd of[-1,1]){
    vpart(g,key+'c'+sd,0,4,9,vb=>{
      const x0=sd>0?5:-8;
      vb.box(x0,4,6,x0+3,7,15,vfur(sh,10));                                  // braço
      const px=sd>0?5:-11;vb.box(px,4,15,px+6,8,21,vfur(dk,11));vb.box(px+(sd>0?3:2),5,19,px+(sd>0?4:3),7,22,0x222222);   // pinça
    });
  }
  for(const side of[-1,1])for(let i=0;i<4;i++){
    const z0=7-5*i;
    const lg=vpart(g,key+'l'+side,side*6,5,z0,vb=>{
      const xa=side>0?6:-16,xb=side>0?16:-6;
      vb.box(xa,4,-1,xb,6,1,vfur(dk,4));
      const tx=side>0?15:-17;vb.box(tx,0,-1,tx+2,6,1,vfur(dk,5));
    });
    lg.position.z=z0*VS;lg.rotation.z=-side*0.45;lg.userData.base=(i-1.5)*0.3*side;lg.rotation.y=lg.userData.base;legs.push(lg);
  }
  return{group:g,legs,arms:[],head:g,s:1.2,height:0.75,lift:0,quad:true,spider:true,tail};
}
function buildSpiderV(){
  const key='SP',g=new THREE.Group(),dark=0x2a1f1f,legs=[];
  vpart(g,key+'b',0,0,0,vb=>{
    vb.box(-8,9,-10,8,18,9,vfur(dark,1));                                   // tórax
    vb.box(-9,9,-27,9,21,-5,vfur(0x3a2a2a,2));                               // abdômen
    vb.box(-3,21,-20,3,22,-10,0xb02a2a);vb.box(-2,22,-18,2,22,-14,0xb02a2a);vb.box(-1,21,-24,1,22,-20,0xb02a2a);   // marca vermelha
  });
  const head=vpart(g,key+'h',0,14,13,vb=>{
    vb.box(-4,10,7,4,17,13,vfur(dark,3));vb.box(-5,10,13,5,18,21,vfur(0x3a2a2a,3));
    for(const [x,y] of[[-3,16],[2,16],[-1,15],[0,15],[-4,14],[3,14]])vb.set(x,y,20,0xff3a2a);
    vb.box(-4,6,18,-2,11,20,0x222222);vb.box(2,6,18,4,11,20,0x222222);vb.box(-4,5,19,-3,7,20,0xe8e8d8);vb.box(3,5,19,4,7,20,0xe8e8d8);   // presas
  });
  for(const side of[-1,1])for(let i=0;i<4;i++){
    const z0=10-8*i,px=side*7;
    const lg=vpart(g,key+'l'+side,px,13,z0,vb=>{
      const xa=side>0?7:-26,xb=side>0?26:-7;
      vb.box(xa,12,-1,xb,14,1,vfur(dark,4));                               // fêmur
      const tx=side>0?25:-27;
      vb.box(tx,0,-1,tx+2,14,1,vfur(dark,5));vb.set(tx,12,0,0x6a4a3a);vb.set(tx+1,12,0,0x6a4a3a);
    });
    lg.position.z=z0*VS;lg.rotation.z=-side*0.5;lg.userData.base=(i-1.5)*0.35*side;lg.rotation.y=lg.userData.base;legs.push(lg);
  }
  return{group:g,legs,arms:[],head,s:1.1,height:1.2,lift:0,quad:true,spider:true};
}
function buildGolemV(){
  const key='GL',g=new THREE.Group(),st=0x7a7a74,sd=0x5a5a54,mo=0x4a7a3a;
  const stone=c=>(x,y,z)=>{const r=hash2(x+y*17,z,9);return shadec(c,0.88+0.22*r)};
  const legs=[];
  for(const sx of[-1,1]){const x0=sx<0?-14:3;legs.push(vpart(g,key+'l'+sx,x0,25,0,vb=>{vb.box(x0,6,-5,x0+11,25,6,stone(st));vb.box(x0-1,0,-6,x0+12,6,7,stone(sd));vb.box(x0+2,14,6,x0+7,18,7,mo)}))}
  vpart(g,key+'b',0,0,0,vb=>{
    vb.box(-15,25,-10,16,54,10,stone(st));
    vb.box(-8,38,10,0,46,11,mo);vb.box(1,28,10,8,35,11,mo);vb.box(-13,48,10,-9,52,11,mo);vb.box(-15,50,-10,16,54,-9,mo);   // musgo
    vb.box(-6,54,-8,6,56,8,stone(sd));                                                      // pescoço
  });
  const arms=[];
  for(const sx of[-1,1]){const x0=sx<0?-28:17;arms.push(vpart(g,key+'a'+sx,sx*22,52,0,vb=>{vb.box(x0,18,-5,x0+11,52,6,stone(st));vb.box(x0-2,8,-7,x0+13,22,8,stone(sd));vb.box(x0+1,45,6,x0+6,49,7,mo)}))}
  const head=vpart(g,key+'h',0,54,0,vb=>{
    vb.box(-7,54,-7,7,67,7,stone(0x8a8a84));vb.box(-8,66,-8,8,68,8,stone(sd));
    vb.box(-5,60,7,-2,63,8,0xff8a1a);vb.box(2,60,7,5,63,8,0xff8a1a);vb.box(-3,56,7,3,58,8,0x3a3a36);
  });
  return{group:g,legs,arms,head,s:1.2,height:3.6,lift:0,quad:false,golem:true};
}

function buildSheepV(){return buildQuad({kind:'sheep',fur:0xeeeae0,dark:0x3a3330,belly:0xe0dcd0,muzzle:0x4a403a,eye:0x111111,bw:5,bl:7,bh:8,lh:6,lw:2,hs:2,hl:2,tail:2,tailUp:0,ears:'round',height:0.9,s:1})}
function buildCowV(){return buildQuad({kind:'cow',fur:0xf2f0ea,dark:0x2a2a2a,belly:0xe8e4dc,muzzle:0xe8a8a8,eye:0x111111,bw:6,bl:11,bh:10,lh:9,lw:3,hs:4,hl:3,tail:4,tailUp:0,ears:'round',horns:1,height:1.5,s:1})}
