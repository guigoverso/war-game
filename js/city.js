'use strict';
// ---------- Geração procedural de cidades ----------
const PAL={
  0:{walls:[0xd9c9a3,0xc9b48a,0xe8e0cc,0xb98b5e,0xa8573e,0xcfc0a0],roofs:[0x8b3a2b,0x6b4a2a,0x4a5a6a,0x9a5a2a,0x7a3030],base:0x7d7d7d,trim:0x5a3d22},
  1:{walls:[0x7a5a3a,0x8d6a42,0x6b4f33,0xb5a07a,0x5e4a30],roofs:[0x2f5a2f,0x4a3a2a,0x3a4a3a,0x5a3a22],base:0x6e6e66,trim:0x3d2a18},
  2:{walls:[0xe3d3a1,0xd9c28a,0xefe1b8,0xc9a96a,0xdcb98a],roofs:[0xc8793a,0xb5522f,0xe3d3a1,0x3f8a8a,0xa8452a],base:0xc2ad7a,trim:0x8a5a2a},
  3:{walls:[0x6b4a2e,0x7d5a38,0xd8dde2,0x55402a,0x8a8f96],roofs:[0xf2f6fa,0xdde6ee,0x4a5a6a,0xe8eef4],base:0x777777,trim:0x3d2a18},
};
const ovr=(a,b,m)=>a.x0-m<=b.x1&&a.x1+m>=b.x0&&a.z0-m<=b.z1&&a.z1+m>=b.z0;
function Bc(c,x0,y0,z0,x1,y1,z1,color,col,o){Bx(c.cx+x0,c.y+y0,c.cz+z0,c.cx+x1,c.y+y1,c.cz+z1,color,col,o)}
function setTL(c,lx,lz,t){setT(c.cx+lx,c.cz+lz,t)}
function fillT(c,r,t,fn){for(let z=r.z0;z<=r.z1;z++)for(let x=r.x0;x<=r.x1;x++)if(!fn||fn(x,z))setTL(c,x,z,t)}

// quadro de coordenadas de um prédio: u = ao longo da parede da porta, v = profundidade para dentro
function frameOf(r,D){
  const X0=r.x0,X1=r.x1+1,Z0=r.z0,Z1=r.z1+1,ns=(D==='N'||D==='S');
  const f={D,X0,X1,Z0,Z1,U:ns?X1-X0:Z1-Z0,V:ns?Z1-Z0:X1-X0};
  f.map=(u,v)=>{switch(D){case'N':return[X0+u,Z0+v];case'S':return[X0+u,Z1-v];case'W':return[X0+v,Z0+u];default:return[X1-v,Z0+u]}};
  return f;
}
function FB(c,f,u0,v0,u1,v1,y0,y1,color,col,o){
  const a=f.map(u0,v0),b=f.map(u1,v1);
  Bc(c,Math.min(a[0],b[0]),y0,Math.min(a[1],b[1]),Math.max(a[0],b[0]),y1,Math.max(a[1],b[1]),color,col,o);
}

function addFlag(c,lx,ly,lz,ph){
  Bc(c,lx-0.07,ly,lz-0.07,lx+0.07,ly+ph,lz+0.07,0x3a3a3a,false,{j:0});
  Bc(c,lx-0.4,ly,lz-0.4,lx+0.4,ly+0.25,lz+0.4,0x6a6a6a,false,{j:0.08});Bc(c,lx-0.2,ly+0.25,lz-0.2,lx+0.2,ly+0.45,lz+0.2,0x7a7a7a,false,{j:0.08});   // base de pedra
  Bc(c,lx-0.14,ly+ph,lz-0.14,lx+0.14,ly+ph+0.28,lz+0.14,0xe0b030,false,{j:0});                                                                    // ponteira
  const m=new THREE.Mesh(GEO_BOX,c.flagMat);m.scale.set(1.3,0.85,0.08);
  m.position.set(c.cx+lx+0.75,c.y+ly+ph-0.5,c.cz+lz);scene.add(m);c.flags.push(m);
  const t=new THREE.Mesh(GEO_BOX,c.flagMat);t.scale.set(0.5,0.35,0.08);t.position.set(c.cx+lx+1.65,c.y+ly+ph-0.35,c.cz+lz);scene.add(t);c.flags.push(t);   // ponta rasgada
}
function lamp(c,x,z){
  Bc(c,x-0.1,0,z-0.1,x+0.1,3.2,z+0.1,0x2a2a2a,true,{j:0});
  Bc(c,x-0.3,3.2,z-0.3,x+0.3,3.8,z+0.3,0xffe9a0,false,{j:0});
  Bc(c,x-0.4,3.8,z-0.4,x+0.4,3.95,z+0.4,0x2a2a2a,false,{j:0});
}
function crate(c,x,z,s,h){
  addCol(c.cx+x,c.y,c.cz+z,c.cx+x+s,c.y+h,c.cz+z+s);
  const n=Math.max(2,Math.round(h/0.33)),ph=h/n;                       // tábuas horizontais de tons alternados
  for(let i=0;i<n;i++)Bc(c,x,i*ph,z,x+s,(i+1)*ph,z+s,i%2?0x9a7a45:0x8a6c3a,false,{j:0.06});
  for(const [px,pz] of[[0,0],[s-0.12,0],[0,s-0.12],[s-0.12,s-0.12]])Bc(c,x+px-0.02,0,z+pz-0.02,x+px+0.14,h,z+pz+0.14,0x6a4f2a,false,{j:0.04});   // quinas
  Bc(c,x-0.02,h-0.1,z-0.02,x+s+0.02,h+0.02,z+s+0.02,0x6a4f2a,false,{j:0.04});
}
function barrel(c,x,z){
  addCol(c.cx+x,c.y,c.cz+z,c.cx+x+0.9,c.y+1.3,c.cz+z+0.9);
  const mx=x+0.45,mz=z+0.45;                                           // corpo octogonal com aros e tampa
  for(const [hw,hd,y0,y1] of[[0.45,0.28,0,1.3],[0.28,0.45,0,1.3],[0.4,0.4,0,1.3]])Bc(c,mx-hw,y0,mz-hd,mx+hw,y1,mz+hd,0x7a5a30,false,{j:0.07});
  for(const y of[0.2,0.95])for(const [hw,hd] of[[0.47,0.3],[0.3,0.47],[0.42,0.42]])Bc(c,mx-hw,y,mz-hd,mx+hw,y+0.1,mz+hd,0x333336,false,{j:0});
  Bc(c,mx-0.32,1.3,mz-0.32,mx+0.32,1.34,mz+0.32,0x8a6a3a,false,{j:0.04});
}
function sandbag(c,x,z,alongX){const L=3,w=0.9;
  if(alongX)Bc(c,x,0,z,x+L,1.3,z+w,0xb8a06a,true);else Bc(c,x,0,z,x+w,1.3,z+L,0xb8a06a,true);}
function hay(c,x,z){
  addCol(c.cx+x,c.y,c.cz+z,c.cx+x+1.3,c.y+1.3,c.cz+z+1.3);
  for(let i=0;i<5;i++)Bc(c,x-(i%2?0.03:0),i*0.26,z,x+1.3+(i%2?0.03:0.0),(i+1)*0.26,z+1.3,i%2?0xd8b84a:0xc8a83c,false,{j:0.1});   // camadas de palha
  for(const k of[0.3,0.9])Bc(c,x-0.04,0,z+k,x+1.34,1.3,z+k+0.07,0x6a5a2a,false,{j:0});                                     // cordas
}
function tinyTree(c,lx,lz,rng){
  const th=rng.int(3,4),cx=c.cx+lx+0.5,cz=c.cz+lz+0.5,y=c.y;
  const lc=c.biome===BIO_SNOW?0x1f4a2e:c.biome===BIO_DESERT?0x6b8a2a:0x2a6a24;
  Bx(cx-0.35,y,cz-0.35,cx+0.35,y+th,cz+0.35,0x6b4a2a,true);
  Bx(cx-1.5,y+th-1,cz-1.5,cx+1.5,y+th+0.5,cz+1.5,leafCol(rng,lc),false,{j:0.1,b:true});
  Bx(cx-0.8,y+th+0.5,cz-0.8,cx+0.8,y+th+1.3,cz+0.8,leafCol(rng,lc),false,{j:0.1,b:true});
}

// muros de parede com porta
const SH=3.6;   // altura de um andar
// parede com porta: base de pedra em blocos, reboco, vigas entre andares, beiral, janelas com moldura/peitoril/venezianas
function wallRun(c,ax,f,a0,a1,h,doorP,o,outSign){
  const n=o.floors||1,face=outSign<0?f:f+1;
  const seg=(s0,s1,ya,yb,color,col,oo)=>{if(s1<=s0||yb<=ya)return;if(ax==='x')Bc(c,s0,ya,f,s1,yb,f+1,color,col,oo);else Bc(c,f,ya,s0,f+1,yb,s1,color,col,oo)};
  // placa fina colada na face externa, saindo p para fora
  const plate=(s0,s1,ya,yb,color,p,oo)=>{
    if(s1<=s0||yb<=ya)return;
    const g0=outSign<0?face-p:face-0.02,g1=outSign<0?face+0.02:face+p;
    if(ax==='x')Bc(c,s0,ya,g0,s1,yb,g1,color,false,oo||{j:0});else Bc(c,g0,ya,s0,g1,yb,s1,color,false,oo||{j:0});
  };
  const bands=(s0,s1,y0)=>{
    for(let k=1;k<n;k++)if(k*SH-0.25>=y0)plate(s0,s1,k*SH-0.25,k*SH+0.25,o.trim,0.1);
    plate(s0,s1,h-0.3,h,shadec(o.wall,0.78),0.14);
  };
  const piece=(s0,s1)=>{
    seg(s0,s1,0,1,o.base,true,{j:0.03});
    if(h>1)seg(s0,s1,1,h,o.wall,true);
    for(let a=Math.floor(s0);a<s1;a++){const e0=Math.max(a,s0),e1=Math.min(a+1,s1);
      plate(e0,e1,0,0.5,shadec(o.base,0.86+Math.random()*0.26),0.05,{j:0.03});plate(e0,e1,0.5,1,shadec(o.base,0.86+Math.random()*0.26),0.05,{j:0.03})}
    plate(s0,s1,1,1.14,shadec(o.base,0.8),0.1);
    bands(s0,s1,0);
    if(o.timber)for(let a=a0+3.1;a<s1;a+=3)if(a-0.12>=s0&&a+0.12<=s1)plate(a-0.12,a+0.12,1.14,h-0.3,o.trim,0.08);
  };
  if(doorP===null)piece(a0,a1);
  else{
    if(doorP>a0)piece(a0,doorP);if(doorP+2<a1)piece(doorP+2,a1);
    seg(doorP,doorP+2,2.4,h,o.wall,true);bands(doorP,doorP+2,2.4);
    const t=(s0,s1,ya,yb)=>plate(s0,s1,ya,yb,o.trim,0.12);
    t(doorP-0.3,doorP,0,2.5);t(doorP+2,doorP+2.3,0,2.5);t(doorP-0.3,doorP+2.3,2.4,2.75);
    const sp=outSign<0?[f-0.9,f]:[f+1,f+1.9];                      // degrau de pedra na porta
    if(ax==='x')Bc(c,doorP-0.3,0,sp[0],doorP+2.3,0.2,sp[1],shadec(o.base,1.08),true,{j:0.04});else Bc(c,sp[0],0,doorP-0.3,sp[1],0.2,doorP+2.3,shadec(o.base,1.08),true,{j:0.04});
  }
  const wh=o.tall?2.2:1.3;
  for(let k=0;k<n;k++){const y=k*SH+1.4;
    for(let a=a0+1.6;a<=a1-1.6;a+=3){
      if(doorP!==null&&k===0&&a>doorP-1.5&&a<doorP+3.5)continue;
      const s0=a-0.5,s1=a+0.5,gl=Array.isArray(o.glass)?o.glass[Math.floor(Math.random()*o.glass.length)]:o.glass;
      plate(s0,s1,y,y+wh,gl,0.04);
      plate(s0-0.3,s0,y-0.05,y+wh+0.05,o.trim,0.1);plate(s1,s1+0.3,y-0.05,y+wh+0.05,o.trim,0.1);
      plate(s0-0.3,s1+0.3,y+wh,y+wh+0.2,o.trim,0.12);
      plate(s0-0.4,s1+0.4,y-0.22,y-0.02,shadec(o.base,1.12),0.22);
      plate(a-0.04,a+0.04,y,y+wh,o.trim,0.08);plate(s0,s1,y+wh*0.5-0.04,y+wh*0.5+0.04,o.trim,0.08);
      if(o.shut){plate(s0-0.75,s0-0.3,y,y+wh,o.shut,0.07);plate(s1+0.3,s1+0.75,y,y+wh,o.shut,0.07)}
      if(k===0&&Math.random()<0.2){
        plate(s0-0.1,s1+0.1,y-0.5,y-0.22,0x6b4a2a,0.32);
        for(let q=0;q<4;q++)plate(s0+q*0.25,s0+q*0.25+0.2,y-0.22,y-0.02+Math.random()*0.12,[0xe8454f,0xf2d13d,0xffffff,0xff8fb0][q],0.28);
      }
    }
  }
}
function roofOn(c,X0,Z0,X1,Z1,yTop,type,color,o){
  const ov=1;
  if(type==='flat'){
    Bc(c,X0-0.3,yTop,Z0-0.3,X1+0.3,yTop+0.4,Z1+0.3,color,true,{b:true});
    const pc=o.trim;
    Bc(c,X0-0.3,yTop+0.4,Z0-0.3,X1+0.3,yTop+1,Z0+0.1,pc,false);Bc(c,X0-0.3,yTop+0.4,Z1-0.1,X1+0.3,yTop+1,Z1+0.3,pc,false);
    Bc(c,X0-0.3,yTop+0.4,Z0+0.1,X0+0.1,yTop+1,Z1-0.1,pc,false);Bc(c,X1-0.1,yTop+0.4,Z0+0.1,X1+0.3,yTop+1,Z1-0.1,pc,false);
    return 0.4;
  }
  if(type==='hip'){
    let x0=X0-ov,x1=X1+ov,z0=Z0-ov,z1=Z1+ov,k=0;
    while(x1-x0>=1&&z1-z0>=1){Bc(c,x0,yTop+k,z0,x1,yTop+k+1,z1,k%2?shadec(color,0.93):color,true,{b:true});x0++;x1--;z0++;z1--;k++}
    return k;
  }
  const longX=(X1-X0)>=(Z1-Z0),s0=longX?Z0:X0,s1=longX?Z1:X1,r0=longX?X0:Z0,r1=longX?X1:Z1;
  let a=s0-ov,b=s1+ov,k=0;
  while(b-a>=1){
    const y=yTop+k,col=k%2?shadec(color,0.92):color;
    // colisão em uma caixa por degrau; visual em telhas de 1 bloco com tons ligeiramente diferentes
    if(longX)addCol(c.cx+r0-ov,c.y+y,c.cz+a,c.cx+r1+ov,c.y+y+1,c.cz+b);else addCol(c.cx+a,c.y+y,c.cz+r0-ov,c.cx+b,c.y+y+1,c.cz+r1+ov);
    for(let t=r0-ov;t<r1+ov;t++){const t1=Math.min(t+1,r1+ov),cc=shadec(col,0.93+Math.random()*0.14);
      if(longX)Bc(c,t,y,a,t1,y+1,b,cc,false,{b:true,j:0.03});else Bc(c,a,y,t,b,y+1,t1,cc,false,{b:true,j:0.03})}
    a++;b--;k++;
  }
  const mid=(s0+s1)/2;                                                  // cumeeira
  if(longX)Bc(c,r0-ov-0.1,yTop+k,mid-0.35,r1+ov+0.1,yTop+k+0.25,mid+0.35,shadec(color,0.7),false,{j:0});
  else Bc(c,mid-0.35,yTop+k,r0-ov-0.1,mid+0.35,yTop+k+0.25,r1+ov+0.1,shadec(color,0.7),false,{j:0});
  return k;
}
function furnishHouse(c,f,rng,D){
  const U=f.U,V=f.V;
  const n=rng.int(2,3);
  for(let k=0;k<n;k++){
    const t=rng.int(0,3);
    if(t===0){const u=rng.int(1,Math.max(1,U-4));FB(c,f,u+0.1,V-2.2,u+1.1,V-1.1,0,0.45,0x6b4a2a,true);FB(c,f,u+0.1,V-3.3,u+1.1,V-2.2,0,0.45,rng.pick([0xc03a3a,0x3a5ac0,0xe0e0e0,0x3aa05a]),true);FB(c,f,u+0.1,V-1.5,u+1.1,V-1.1,0.45,0.9,0x6b4a2a,false)}
    else if(t===1){const u=rng.int(2,Math.max(2,U-4));FB(c,f,u,V-3,u+1.6,V-2,0,0.85,0x8a6a3a,true);FB(c,f,u+0.1,V-2.9,u+0.5,V-2.5,0.85,1.1,0xd8d0c0,false)}
    else if(t===2){const u=rng.int(1,Math.max(1,U-3));FB(c,f,u,V-1.8,u+1.8,V-1.1,0,2,0x6b4a2a,true)}
    else{FB(c,f,1.2,V-2,2.2,V-1.1,0,1.1,0x6a6a6a,true);FB(c,f,1.3,V-1.9,2.1,V-1.6,0.1,0.5,0xff7a1a,false,{j:0})}
  }
}
// andares extras: lajes de madeira com buraco para a escada em espiral (anel 3x3 em torno de um pilar, degraus de 0,45)
function addFloors(c,f,o,rng){
  const n=o.floors,U=f.U,V=f.V,y0v=V-4;
  const stairs=[{u0:1,mir:false},{u0:U-4,mir:true}],ring=[[1,0],[0,0],[0,1],[0,2],[1,2],[2,2],[2,1],[2,0]];
  const wood=[0x8a6a3a,0x7d5e34];
  for(let k=1;k<n;k++){
    const st=stairs[k-1],y=k*SH;
    for(let v=1;v<V-1;v++){
      let run=null;
      for(let u=1;u<=U-1;u++){
        const hole=u<U-1&&u>=st.u0&&u<st.u0+3&&v>=y0v&&v<y0v+3,solid=u<U-1&&!hole;
        if(solid){if(run===null)run=u}else if(run!==null){FB(c,f,run,v,u,v+1,y-0.3,y,wood[(v+run)&1],true,{b:true,j:0.05});run=null}
      }
    }
    const base=(k-1)*SH;
    ring.forEach((p,i)=>{
      const a=st.mir?2-p[0]:p[0],u=st.u0+a,v=y0v+p[1],top=base+0.45*(i+1);
      FB(c,f,u,v,u+1,v+1,base,top,i%2?0x9a7a4a:0x7d5e34,true,{j:0.05});
      FB(c,f,u-0.01,v-0.01,u+1.01,v+1.01,top-0.07,top,0x5a3d22,false,{j:0});          // borda do degrau
    });
    FB(c,f,st.u0+1,y0v+1,st.u0+2,y0v+2,base,y,0x5a3d22,true,{j:0.03});                  // pilar central
    // mobília do andar: cama e baú junto à parede da porta (longe da escada)
    const ub=rng.int(1,Math.max(1,U-5)),yy=y;
    FB(c,f,ub,1,ub+2,2,yy,yy+0.45,0x6b4a2a,true);FB(c,f,ub,1,ub+1.2,2,yy+0.45,yy+0.6,rng.pick([0xc03a3a,0x3a5ac0,0xe0e0e0,0x3aa05a]),false,{j:0});
    const uc=ub>U/2?1:U-3;FB(c,f,uc,1,uc+1,2,yy,yy+0.7,0x7a4a22,true);
  }
}
function makeBuilding(c,r,D,doorU,o,rng){
  const f=frameOf(r,D);
  o.floors=o.floors||1;
  if(o.floors>1)o.h=o.floors*SH;
  const h=o.h;
  const doorP=(D==='N'||D==='S')?f.X0+doorU:f.Z0+doorU;
  o.base=o.base||c.pal.base;o.trim=o.trim||c.pal.trim;
  wallRun(c,'x',f.Z0,f.X0,f.X1,h,D==='N'?doorP:null,o,-1);
  wallRun(c,'x',f.Z1-1,f.X0,f.X1,h,D==='S'?doorP:null,o,1);
  wallRun(c,'z',f.X0,f.Z0+1,f.Z1-1,h,D==='W'?doorP:null,o,-1);
  wallRun(c,'z',f.X1-1,f.Z0+1,f.Z1-1,h,D==='E'?doorP:null,o,1);
  // pilares de canto
  const pc=o.timber?o.trim:shadec(o.wall,0.86);
  for(const [px,pz] of[[f.X0,f.Z0],[f.X1-1,f.Z0],[f.X0,f.Z1-1],[f.X1-1,f.Z1-1]]){
    const xa=px===f.X0?px-0.08:px+0.02,xb=px===f.X0?px+0.98:px+1.08,za=pz===f.Z0?pz-0.08:pz+0.02,zb=pz===f.Z0?pz+0.98:pz+1.08;
    Bc(c,xa,0,za,xb,h-0.02,zb,pc,false,{j:0.03});
  }
  fillT(c,r,T_FLOOR);
  if(o.floors>1)addFloors(c,f,o,rng);
  const layers=o.roofT==='none'?0:roofOn(c,f.X0,f.Z0,f.X1,f.Z1,h,o.roofT,o.roof,o);
  if(o.roofT==='gable'&&o.chimney){
    const cx0=f.X0+1.2,cz0=f.Z0+1.2,top=h+layers+1.3;
    Bc(c,cx0,h+0.5,cz0,cx0+1,top,cz0+1,0x7a6a62,false,{j:0.06});Bc(c,cx0-0.1,top,cz0-0.1,cx0+1.1,top+0.25,cz0+1.1,0x4a4a4a,false,{j:0});
    Bc(c,cx0+0.2,top+0.25,cz0+0.2,cx0+0.8,top+0.3,cz0+0.8,0x1a1a1a,false,{j:0});
  }
  f.layers=layers;
  return f;
}

function buildHall(c,f,D,doorU,rng){
  const wx=(u,v)=>{const m=f.map(u,v);return[c.cx+m[0],c.cz+m[1]]},mid=f.U/2;
  // quadro de missões na parede do fundo, com avisos, e uma mesa
  FB(c,f,mid-1.8,f.V-1.2,mid+1.8,f.V-1.05,0.9,2.7,0x6b4a2a,false,{j:0});
  for(let k=0;k<6;k++){const u=mid-1.5+(k%3)*1.1,y=1.15+Math.floor(k/3)*0.75;FB(c,f,u,f.V-1.27,u+0.7,f.V-1.2,y,y+0.55,rng.pick([0xf2ecd0,0xe8dcc0,0xf4f0e0]),false,{j:0})}
  FB(c,f,mid-1.5,f.V-3.6,mid+1.5,f.V-2.6,0,1.0,0x5a3d22,true);
  const p=wx(mid,f.V-4.6);c.hall={x:p[0],z:p[1]};
  const k=wx(mid,f.V-1.9);c.keepers=c.keepers||[];
  c.keepers.push({role:'clerk',x:k[0],z:k[1],yaw:(()=>{const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D];return Math.atan2(o[0],o[1])})()});
  const sp=wx(doorU+1,-0.07);makeSign('PREFEITURA',3.8,0.85,0x2a3a5a,0xf0e0a0,sp[0],c.y+3.5,sp[1],D);
}

// loja: balcão, prateleiras com mercadorias, caixotes e o mercador atrás do balcão
function buildStore(c,f,D,doorU,rng){
  const wx=(u,v)=>{const m=f.map(u,v);return[c.cx+m[0],c.cz+m[1]]},mid=f.U/2;
  FB(c,f,mid-3,f.V-3.4,mid+3,f.V-2.4,0,1.1,0x5a3d22,true);
  for(let k=0;k<5;k++){const u=1.4+k*(f.U-3)/5;FB(c,f,u,f.V-1.25,u+1.1,f.V-1.05,1.0,1.1,0x6b4a2a,false,{j:0});FB(c,f,u,f.V-1.25,u+1.1,f.V-1.05,1.9,2.0,0x6b4a2a,false,{j:0});
    for(let q=0;q<3;q++)FB(c,f,u+0.1+q*0.35,f.V-1.3,u+0.4+q*0.35,f.V-1.05,1.1,1.5,rng.pick([0xe8454f,0xf2a03d,0x5ab03d,0xe8d84f,0x6ab0e0,0xb06ae0]),false,{j:0.04});
    FB(c,f,u+0.2,f.V-1.3,u+0.9,f.V-1.05,2.0,2.4,rng.pick([0xc8a85a,0x8a6a3a,0xd8d0a8]),false,{j:0.04})}
  {const fu=doorU<f.U/2?f.U-2.4:1.2;FB(c,f,fu,1.2,fu+1.2,2.4,0,1.0,0x7a5a30,true);FB(c,f,fu+0.1,1.3,fu+0.6,1.9,1.0,1.4,0xc8a85a,false,{j:0.04})}   // caixotes e sacos
  {const fu=doorU<f.U/2?1.2:f.U-2.4;FB(c,f,fu,2.6,fu+1,3.4,0,0.9,0x6b4a2a,true)}
  const p=wx(mid,f.V-4.4);c.store={x:p[0],z:p[1]};
  const k=wx(mid,f.V-1.9);c.keepers=c.keepers||[];
  c.keepers.push({role:'merchant',x:k[0],z:k[1],yaw:(()=>{const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D];return Math.atan2(o[0],o[1])})()});
  const sp=wx(doorU+1,-0.07);makeSign('LOJA',2.6,0.85,0x2a5a3a,0xf2f0d0,sp[0],c.y+3.3,sp[1],D);
}
// taverna: balcão, mesas com bancos, lareira acesa e barris; o cozinheiro prepara pratos
function buildTavern(c,f,D,doorU,rng){
  const wx=(u,v)=>{const m=f.map(u,v);return[c.cx+m[0],c.cz+m[1]]},mid=f.U/2;
  FB(c,f,mid-3,f.V-3.4,mid+3,f.V-2.4,0,1.1,0x4a2f1a,true);
  for(let k=0;k<4;k++){const u=1.2+k*(f.U-3)/4;FB(c,f,u,f.V-1.4,u+0.9,f.V-1.05,0,1.0,0x6b4a2a,true);FB(c,f,u+0.05,f.V-1.4,u+0.85,f.V-1.05,1.0,1.1,0x3a2a18,false,{j:0})}
  for(const [tu,tv] of[[1.2,2.2],[f.U-3,2.2]]){if(Math.abs(tu-doorU)<2.5&&tv<3)continue;FB(c,f,tu,tv,tu+1.6,tv+1.2,0,0.85,0x6b4a2a,true);FB(c,f,tu-0.5,tv+0.2,tu-0.1,tv+0.6,0,0.5,0x5a3d22,false);FB(c,f,tu+1.7,tv+0.2,tu+2.1,tv+0.6,0,0.5,0x5a3d22,false)}
  // lareira com fogo
  {const lu=doorU<f.U/2?f.U-3.2:1.2;FB(c,f,lu,f.V-1.5,lu+2,f.V-1.05,0,1.6,0x7a7a74,true);FB(c,f,lu+0.4,f.V-1.5,lu+1.6,f.V-1.1,0.1,0.8,0x1a1a1a,false,{j:0});FB(c,f,lu+0.6,f.V-1.45,lu+1.4,f.V-1.2,0.1,0.7,0xff8a1a,false,{j:0.1})}
  const p=wx(mid,f.V-4.4);c.tavern={x:p[0],z:p[1]};
  const k=wx(mid,f.V-1.9);c.keepers=c.keepers||[];
  c.keepers.push({role:'cook',x:k[0],z:k[1],yaw:(()=>{const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D];return Math.atan2(o[0],o[1])})()});
  const sp=wx(doorU+1,-0.07);makeSign('TAVERNA',3.2,0.85,0x4a2f1a,0xf0d890,sp[0],c.y+3.3,sp[1],D);
}

function buildCity(c,rng){  const Hc=c.half;
  const ps=PAL[c.biome===BIO_ROCK?1:c.biome];
  c.pal={walls:[rng.pick(ps.walls),rng.pick(ps.walls),rng.pick(ps.walls)],roofs:[rng.pick(ps.roofs),rng.pick(ps.roofs)],base:ps.base,trim:ps.trim,all:ps.walls};
  const ord=c.style==='ordenada',cha=c.style==='caotica';
  if(ord){c.pal.walls=rng.shuffle(ps.walls.slice()).slice(0,4);c.pal.roofs=rng.shuffle(ps.roofs.slice()).slice(0,3)}
  const mix=!ord&&!cha;
  if(cha||mix){c.pal.walls=ps.walls.slice();c.pal.roofs=ps.roofs.slice()}
  const propMax=cha?90:ord?24:70,treeN=cha?140:ord?30:110;
  c.flagMat=new THREE.MeshLambertMaterial({color:c.home?0x2a6aff:(RANK_COL[c.rank]||0xcc2222)});
  const S=ord?2:cha?1:rng.int(1,3),P=rng.int(8,11);
  c.S=S;c.P=P;
  // áreas reservadas aos prédios especiais (cantos da praça): nenhuma rua nova pode atravessá-las
  const spRects=[];for(const sx of[-1,1])for(const sz of[-1,1])spRects.push({x0:sx>0?S+1:-(S+11),x1:sx>0?S+11:-(S+1),z0:sz>0?P+1:-(P+10),z1:sz>0?P+10:-(P+1)});
  const spHit=q=>spRects.some(s=>ovr(q,s,1));
  const streets=[{x0:-Hc,x1:Hc,z0:-S,z1:S},{x0:-S,x1:S,z0:-Hc,z1:Hc}];
  // estilo: ordenada (grade/anel regulares), mista, caótica (ruas orgânicas com desvios e becos)
  let layout=ord?rng.pick(['grid','grid','ring']):cha?rng.pick(['organic','organic','organic','cross']):rng.pick(['organic','organic','organic','cross','cross','double']);
  const stepO=rng.int(16,18),offs=[];
  for(let o=P+12;o<=Hc-4;o+=ord?stepO:rng.int(13,17))offs.push(o);
  if(layout==='ring'&&Hc-5<P+13)layout='grid';
  if(layout==='double'&&offs.length){
    const o=rng.pick(offs)*(rng.chance(0.5)?1:-1);
    if(rng.chance(0.5))streets.push({x0:-Hc,x1:Hc,z0:o-1,z1:o+1});else streets.push({x0:o-1,x1:o+1,z0:-Hc,z1:Hc});
  }else if(layout==='grid'){
    for(const o of offs)for(const sg of[-1,1]){
      if(ord||rng.chance(0.85))streets.push({x0:-Hc,x1:Hc,z0:sg*o-1,z1:sg*o+1});
      if(ord||rng.chance(0.85))streets.push({x0:sg*o-1,x1:sg*o+1,z0:-Hc,z1:Hc});
    }
  }else if(layout==='ring'){
    const ring=r=>streets.push({x0:-r,x1:r,z0:-r-1,z1:-r+1},{x0:-r,x1:r,z0:r-1,z1:r+1},{x0:-r-1,x1:-r+1,z0:-r,z1:r},{x0:r-1,x1:r+1,z0:-r,z1:r});
    const rr=Hc-5;ring(rr);
    const ro=Math.max(P+14,Math.round(Hc*0.58));if(ro<rr-9)ring(ro);
  }else if(layout==='organic'){
    streets.length=0;
    const arm=horiz=>{
      let zc=0;
      for(let pos=-Hc;pos<Hc;){
        const b=Math.min(Hc,pos+rng.int(6,12)),mid=(pos+b)/2;
        if(Math.abs(mid)<=P+4||Math.abs(mid)>=Hc-9)zc=0;else zc=clamp(zc+rng.int(-2,2),-6,6);
        let rc=horiz?{x0:pos,x1:b,z0:zc-S,z1:zc+S}:{x0:zc-S,x1:zc+S,z0:pos,z1:b};
        if(zc!==0&&spHit(rc)){zc=0;rc=horiz?{x0:pos,x1:b,z0:-S,z1:S}:{x0:-S,x1:S,z0:pos,z1:b}}
        streets.push(rc);
        pos=b;
      }
    };
    arm(true);arm(false);
    const arms=streets.slice();
    for(let k=0,n=rng.int(12,18);k<n;k++){
      const s=rng.pick(arms),horiz=(s.x1-s.x0)>=(s.z1-s.z0),L=rng.int(8,20),sg=rng.chance(0.5)?1:-1;
      const a=horiz?rng.int(s.x0+1,s.x1-1):rng.int(s.z0+1,s.z1-1);
      if(Math.abs(a)<P+5)continue;
      const br=horiz?(sg>0?{x0:a-1,x1:a+1,z0:s.z1+1,z1:Math.min(Hc-3,s.z1+L)}:{x0:a-1,x1:a+1,z0:Math.max(-Hc+3,s.z0-L),z1:s.z0-1})
                    :(sg>0?{x0:s.x1+1,x1:Math.min(Hc-3,s.x1+L),z0:a-1,z1:a+1}:{x0:Math.max(-Hc+3,s.x0-L),x1:s.x0-1,z0:a-1,z1:a+1});
      if(spHit(br))continue;
      streets.push(br);
    }
  }
  // garante que todas as ruas formem uma única rede ligada à praça: pedaços soltos são ligados ao pedaço principal por corredores em L
  {
    const N=2*Hc+1,idx=(x,z)=>(z+Hc)*N+(x+Hc),inb=(x,z)=>x>=-Hc&&x<=Hc&&z>=-Hc&&z<=Hc;
    const grid=new Uint8Array(N*N),mark=q=>{for(let z=Math.max(q.z0,-Hc);z<=Math.min(q.z1,Hc);z++)for(let x=Math.max(q.x0,-Hc);x<=Math.min(q.x1,Hc);x++)grid[idx(x,z)]=1};
    streets.forEach(mark);mark({x0:-P-1,x1:P+1,z0:-P-1,z1:P+1});
    for(let iter=0;iter<30;iter++){
      const comp=new Int16Array(N*N).fill(-1),lists=[];
      for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
        if(!grid[idx(x,z)]||comp[idx(x,z)]>=0)continue;
        const id=lists.length,l=[],st=[[x,z]];comp[idx(x,z)]=id;
        while(st.length){const [a,b]=st.pop();l.push([a,b]);for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,nz=b+dz;if(inb(nx,nz)&&grid[idx(nx,nz)]&&comp[idx(nx,nz)]<0){comp[idx(nx,nz)]=id;st.push([nx,nz])}}}
        lists.push(l);
      }
      if(lists.length<=1)break;
      const main=comp[idx(0,0)];let bestC=-1;
      // pedaço solto de maior tamanho primeiro
      for(let i=0;i<lists.length;i++)if(i!==main&&(bestC<0||lists[i].length>lists[bestC].length))bestC=i;
      let bd=1e9,pa=null,pb=null;
      for(const a of lists[bestC])for(const b of lists[main]){const d=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);if(d<bd){bd=d;pa=a;pb=b}}
      const cl=v=>clamp(v,-Hc+3,Hc-3);
      const hz=(x0,x1,z)=>({x0:cl(Math.min(x0,x1))-1,x1:cl(Math.max(x0,x1))+1,z0:cl(z)-1,z1:cl(z)+1}),vt=(z0,z1,x)=>({x0:cl(x)-1,x1:cl(x)+1,z0:cl(Math.min(z0,z1))-1,z1:cl(Math.max(z0,z1))+1});
      let opt=[hz(pa[0],pb[0],pa[1]),vt(pa[1],pb[1],pb[0])];
      if(opt.some(spHit))opt=[vt(pa[1],pb[1],pa[0]),hz(pa[0],pb[0],pb[1])];
      for(const q of opt){streets.push(q);mark(q)}
    }
  }
  c.streets=streets;
  for(const s of streets)fillT(c,s,T_STREET);
  // extremidades das estradas fora do muro
  for(let k=1;k<=4;k++)for(let w=-1;w<=1;w++){
    setTL(c,Hc+k,w,T_ROAD);setTL(c,-Hc-k,w,T_ROAD);setTL(c,w,Hc+k,T_ROAD);setTL(c,w,-Hc-k,T_ROAD);
  }
  // praça
  const plaza={x0:-P,x1:P,z0:-P,z1:P},round=rng.chance(0.4);
  fillT(c,plaza,T_PLAZA,(x,z)=>!round||Math.hypot(x,z)<=P+0.6);
  for(let i=-P-1;i<=P+1;i++){setTL(c,i,-P-1,T_STREET);setTL(c,i,P+1,T_STREET);setTL(c,-P-1,i,T_STREET);setTL(c,P+1,i,T_STREET)}
  const res=[];streets.forEach(s=>res.push({x0:s.x0-1,x1:s.x1+1,z0:s.z0-1,z1:s.z1+1}));
  res.push({x0:-P-1,x1:P+1,z0:-P-1,z1:P+1});
  const houses=[];

  // peça central da praça
  const feat=rng.pick(['fountain','fountain','statue','well','tree']);
  if(feat==='fountain'){
    Bc(c,-2.5,0,-2.5,2.5,0.7,2.5,0x8a8a8a,true);Bc(c,-2,0.7,-2,2,0.85,2,0x3a7ad8,false,{j:0.02});
    Bc(c,-0.5,0.85,-0.5,0.5,2.4,0.5,0x9a9a9a,true);Bc(c,-1.1,2.4,-1.1,1.1,2.7,1.1,0x9a9a9a,false);Bc(c,-0.9,2.7,-0.9,0.9,2.8,0.9,0x3a7ad8,false,{j:0.02});
  }else if(feat==='statue'){
    Bc(c,-1.2,0,-1.2,1.2,1.2,1.2,0x7a7a7a,true);Bc(c,-0.4,1.2,-0.3,-0.05,2.3,0.3,0xb8b8b8,true);Bc(c,0.05,1.2,-0.3,0.4,2.3,0.3,0xb8b8b8,false);
    Bc(c,-0.5,2.3,-0.3,0.5,3.4,0.3,0xb8b8b8,false);Bc(c,-0.35,3.4,-0.35,0.35,4.1,0.35,0xb8b8b8,false);Bc(c,0.6,2.5,-0.05,0.8,4.3,0.15,0xe0e0e0,false);
  }else if(feat==='well'){
    Bc(c,-1.5,0,-1.5,1.5,1,1.5,0x8a8a8a,true);Bc(c,-1,1,-1,1,1.05,1,0x1f4a8a,false,{j:0});
    Bc(c,-1.5,1,-1.5,-1.2,3,-1.2,0x6b4a2a,false);Bc(c,1.2,1,1.2,1.5,3,1.5,0x6b4a2a,false);Bc(c,-1.5,1,1.2,-1.2,3,1.5,0x6b4a2a,false);Bc(c,1.2,1,-1.5,1.5,3,-1.2,0x6b4a2a,false);
    const rl=roofOn(c,-1.5,-1.5,1.5,1.5,3,'hip',c.pal.roofs[0],{trim:c.pal.trim});
  }else{
    const th=6;Bx(c.cx-0.5,c.y,c.cz-0.5,c.cx+0.5,c.y+th,c.cz+0.5,0x6b4a2a,true);
    Bx(c.cx-3.5,c.y+th-2,c.cz-3.5,c.cx+3.5,c.y+th,c.cz+3.5,leafCol(rng,0x2a6a24),false,{j:0.1,b:true});
    Bx(c.cx-2.5,c.y+th,c.cz-2.5,c.cx+2.5,c.y+th+1.4,c.cz+2.5,leafCol(rng,0x2a6a24),false,{j:0.1,b:true});
    Bx(c.cx-1.2,c.y+th+1.4,c.cz-1.2,c.cx+1.2,c.y+th+2.4,c.cz+1.2,leafCol(rng,0x2a6a24),false,{j:0.1,b:true});
    Bc(c,-2.2,0,-2.2,2.2,0.5,2.2,0x7a7a7a,false);
  }
  // bancos, postes e canteiros da praça
  // bancos nas bordas da praça, longe das ruas e das portas dos prédios dos cantos
  const doors=[];for(const sx of[-1,1])for(const sz of[-1,1])doors.push([sx>0?S+4:-(S+3),sz>0?P+2:-(P+2)]);
  // bancos da praça: sorteados dentro da praça, voltados para o centro, sem se tocar e sem tapar as ruas, os canteiros ou as portas
  {
    const placedB=[];
    for(let at=0;at<260&&placedB.length<6;at++){
      const x=rng.range(-P+1,P-1),z=rng.range(-P+1,P-1),face=Math.abs(x)>Math.abs(z)?(x>0?'W':'E'):(z>0?'N':'S'),rc=benchRect(x,z,face);
      if(ovr(rc,{x0:-S-0.4,x1:S+1.4,z0:-P,z1:P},0)||ovr(rc,{x0:-P,x1:P,z0:-S-0.4,z1:S+1.4},0))continue;   // não tapa a entrada das ruas
      if(Math.hypot(x,z)<4.2)continue;
      if(round?Math.hypot(Math.abs(x)+1.2,Math.abs(z)+1.2)>P:Math.max(Math.abs(rc.x0),Math.abs(rc.x1),Math.abs(rc.z0),Math.abs(rc.z1))>P-0.7)continue;
      if([[-1,-1],[1,-1],[-1,1],[1,1]].some(q=>ovr(rc,{x0:q[0]*(P-2.5)-1.4,x1:q[0]*(P-2.5)+1.4,z0:q[1]*(P-2.5)-1.4,z1:q[1]*(P-2.5)+1.4},-0.3)))continue;
      if(doors.some(d=>Math.hypot(d[0]-x,d[1]-z)<6.5))continue;
      if(placedB.some(q=>ovr(rc,q,1.5)))continue;
      bench(c,x,z,face);placedB.push(rc);
    }
    c.plazaBenches=placedB.length;
  }
  for(const sx of[-1,1])for(const sz of[-1,1]){
    lamp(c,sx*(P-0.5),sz*(P-0.5));
    const px=sx*(P-2.5),pz=sz*(P-2.5);
    Bc(c,px-1,0,pz-1,px+1,0.5,pz+1,0x8a8a8a,true);Bc(c,px-0.9,0.5,pz-0.9,px+0.9,0.65,pz+0.9,0x4a3320,false,{j:0});
    for(let k=0;k<5;k++)Bc(c,px-0.8+rng.range(0,1.3),0.65,pz-0.8+rng.range(0,1.3),px-0.5+rng.range(0,1.3),1.1,pz-0.5+rng.range(0,1.3),rng.pick([0xe8454f,0xf2d13d,0xffffff,0xb06ae0,0xff8fb0]),false,{j:0});
  }
  // lampiões ao longo das ruas
  if(layout!=='organic')for(let t=P+4;t<Hc-2;t+=8){lamp(c,t,S+1.5);lamp(c,-t,-S-1.5);lamp(c,S+1.5,-t);lamp(c,-S-1.5,t)}

  // edifícios especiais nos cantos da praça
  const kinds=rng.shuffle(['shop','clinic','chapel','barracks']);
  const corners=[[1,1],[-1,1],[1,-1],[-1,-1]];
  const specials={};
  corners.forEach((cn,idx)=>{
    const sx=cn[0],sz=cn[1],kind=kinds[idx];
    const dims={shop:[9,7],clinic:[8,7],chapel:[7,8],barracks:[9,7]}[kind];
    const w=dims[0],d=dims[1];
    const r={x0:sx>0?S+2:-(S+1+w),x1:sx>0?S+1+w:-(S+2),z0:sz>0?P+2:-(P+1+d),z1:sz>0?P+1+d:-(P+2)};
    const D=sz>0?'N':'S';
    const doorP=sx>0?S+3:-(S+4);
    const doorU=doorP-(r.x0);
    res.push({x0:r.x0-1,x1:r.x1+1,z0:r.z0-1,z1:r.z1+1});
    specials[kind]={r,D,doorU};
    if(kind==='market'){
      fillT(c,r,T_STREET);
      for(let k=0;k<3;k++){
        const sxl=r.x0+1+k*3,szl=sz>0?r.z0+1:r.z1-1,ca=rng.pick([0xc03a3a,0x3a5ac0,0xe0c03a,0x3aa05a,0xe0e0e0]);
        const zz=sz>0?szl+1:szl-2;
        for(const [px,pz] of[[sxl,zz],[sxl+2.4,zz],[sxl,zz+1.6],[sxl+2.4,zz+1.6]])Bc(c,px,0,pz,px+0.2,2.4,pz+0.2,0x6b4a2a,false,{j:0});
        Bc(c,sxl-0.2,2.4,zz-0.2,sxl+2.8,2.7,zz+1.8,ca,false,{j:0.03});Bc(c,sxl-0.2,2.7,zz-0.2,sxl+2.8,2.9,zz+0.4,shadec(ca,0.85),false,{j:0});
        Bc(c,sxl,0,zz+0.2,sxl+2.4,0.9,zz+1.1,0x8a6a3a,true);
        for(let q=0;q<4;q++)Bc(c,sxl+0.2+q*0.55,0.9,zz+0.35,sxl+0.55+q*0.55,1.2,zz+0.75,rng.pick([0xe8454f,0xf2a03d,0x5ab03d,0xe8d84f]),false,{j:0});
      }
      barrel(c,sx>0?r.x1-1.5:r.x0+0.5,sz>0?r.z1-1.5:r.z0+0.5);
      return;
    }
    const wallC=kind==='barracks'?0x7a8268:kind==='clinic'?0xf0f0ee:kind==='chapel'?(c.biome===BIO_DESERT?0xefe1b8:0xe6e2d8):rng.pick(c.pal.walls);
    const o={h:kind==='chapel'?5:4,wall:wallC,roof:kind==='clinic'?0xd8d8d8:kind==='shop'?c.pal.roofs[0]:kind==='barracks'?0x3f4a3a:0x5a4a6a,roofT:kind==='clinic'?'flat':'gable',glass:kind==='chapel'?[0xd03a3a,0x3a5ad0,0xe0c03a,0x3aa05a]:0x9ed4ff,tall:kind==='chapel',chimney:kind==='shop',base:kind==='chapel'?0x888880:undefined};
    const f=makeBuilding(c,r,D,doorU,o,rng);houses.push(r);
    const wx=(u,v)=>{const m=f.map(u,v);return[c.cx+m[0],c.cz+m[1]]};
    if(kind==='shop'){
      const mid=f.U/2;
      FB(c,f,mid-3,f.V-3.3,mid+3,f.V-2.3,0,1.1,0x5a3d22,true);
      for(let k=0;k<5;k++){const u=1.5+k*1.4;FB(c,f,u,f.V-1.25,u+1.2,f.V-1.05,1.8,1.95,0x333333,false,{j:0});FB(c,f,u,f.V-1.25,u+0.4,f.V-1.05,1.55,1.8,0x6b4a2a,false,{j:0});FB(c,f,u+0.1,f.V-1.25,u+1.0,f.V-1.05,2.5,2.65,0x555555,false,{j:0})}
      {const fu=doorU<f.U/2?f.U-2.2:1.2;FB(c,f,fu,1.4,fu+1,2.4,0,1.2,0x4a4a2a,true);FB(c,f,fu,2.6,fu+1,3.4,0,1,0x7a5a30,true)}
      const p=wx(mid,f.V-4.4);c.shop={x:p[0],z:p[1]};
      const k=wx(mid,f.V-1.9);c.keepers=c.keepers||[];c.keepers.push({role:'shop',x:k[0],z:k[1],yaw:(()=>{const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D];return Math.atan2(o[0],o[1])})()});
      const sp=wx(doorU+1,-0.07);makeSign('ARMEIRO',3,0.85,0x6b1f1f,0xffe9a0,sp[0],c.y+3.25,sp[1],D);
    }else if(kind==='clinic'){
      for(let k=0;k<3;k++){const u=1.2+k*2.3;FB(c,f,u,f.V-2.4,u+1,f.V-1.1,0,0.5,0xf4f4f4,true);FB(c,f,u,f.V-2.4,u+1,f.V-1.8,0.5,0.7,0xd03a3a,false);FB(c,f,u,f.V-1.5,u+1,f.V-1.1,0.5,0.9,0xe8e8e8,false)}
      {const cu=doorU<f.U/2?f.U-3:1.2;FB(c,f,cu,2.2,cu+1.8,3.2,0,1,0xdadada,true)}
      const mid=f.U/2,p=wx(mid,3.2);c.clinic={x:p[0],z:p[1]};
      const k=wx(mid,2.0);c.keepers=c.keepers||[];c.keepers.push({role:'nurse',x:k[0],z:k[1],yaw:0});
      const sp=wx(doorU+1,-0.07);makeSign('CLÍNICA',3,0.85,0xeeeeee,0xc02020,sp[0],c.y+3.25,sp[1],D);
      // cruz vermelha no telhado
      const cm=f.map(f.U/2,f.V/2);
      Bc(c,cm[0]-0.5,4.4,cm[1]-1.6,cm[0]+0.5,5.2,cm[1]+1.6,0xd02020,false,{j:0});Bc(c,cm[0]-1.6,4.4,cm[1]-0.5,cm[0]+1.6,5.2,cm[1]+0.5,0xd02020,false,{j:0});
    }else if(kind==='barracks'){
      for(let k=0;k<2;k++){const v=2+k*2.2;
        for(const u of [1.2,f.U-2.4]){if(Math.abs(u-doorU)<2.5&&v<2.6)continue;FB(c,f,u,v,u+1.2,v+2,0,0.5,0x5a4a3a,true);FB(c,f,u,v,u+1.2,v+0.4,0.5,1.8,0x5a4a3a,false);FB(c,f,u+0.05,v+0.4,u+1.15,v+2,0.5,0.8,rng.pick([0x3a5a9a,0x9a3a3a,0x4a8a4a]),false)}}
      for(let k=0;k<5;k++){const u=1.4+k*1.3;FB(c,f,u,f.V-1.25,u+1.1,f.V-1.05,1.7,1.85,0x333333,false,{j:0});FB(c,f,u,f.V-1.25,u+0.4,f.V-1.05,1.45,1.7,0x6b4a2a,false,{j:0})}
      const mid=f.U/2,tu=doorU<f.U/2?f.U-3.4:1.4;FB(c,f,tu,f.V-3.2,tu+2,f.V-2.2,0,0.9,0x6b4a2a,true);FB(c,f,tu+0.2,f.V-3,tu+1.8,f.V-2.4,0.9,0.95,0xd8d0a8,false,{j:0});
      const p=wx(mid,3.2);c.barracks={x:p[0],z:p[1]};
      const k=wx(mid,2.0);c.keepers=c.keepers||[];c.keepers.push({role:'guard',x:k[0],z:k[1],yaw:(()=>{const o={N:[0,-1],S:[0,1],E:[1,0],W:[-1,0]}[D];return Math.atan2(o[0],o[1])})()});
      const sp=wx(doorU+1,-0.07);makeSign('QUARTEL',3,0.85,0x2a3a5a,0xe8e8e8,sp[0],c.y+3.25,sp[1],D);
      const cm=f.map(f.U/2,f.V/2);addFlag(c,cm[0],4.4,cm[1],3.2);
    }else{
      // capela: pews, altar, torre
      for(let k=0;k<3;k++){const v=2.2+k*1.5;FB(c,f,1.2,v,2.9,v+0.5,0,0.9,0x6b4a2a,true);FB(c,f,f.U-2.9,v,f.U-1.2,v+0.5,0,0.9,0x6b4a2a,true)}
      FB(c,f,f.U/2-1.2,f.V-2.3,f.U/2+1.2,f.V-1.2,0,1.1,0xf0f0f0,true);FB(c,f,f.U/2-0.15,f.V-1.3,f.U/2+0.15,f.V-1.1,1.1,3.2,0xe0c040,false,{j:0});FB(c,f,f.U/2-0.8,f.V-1.3,f.U/2+0.8,f.V-1.1,2.3,2.6,0xe0c040,false,{j:0});
      const tw=(a,b,y0,y1,col,cl)=>FB(c,f,a,0,b,3,y0,y1,col,cl);
      tw(f.U/2-1.5,f.U/2+1.5,5,10.5,0xd8d4c8,true);tw(f.U/2-1.6,f.U/2+1.6,10.5,10.8,0x888880,false);
      for(let q=0;q<4;q++){const a=[[f.U/2-0.5,f.U/2+0.5,-0.05,0.05],[f.U/2-0.5,f.U/2+0.5,2.95,3.05],[f.U/2-1.55,f.U/2-1.45,1,2],[f.U/2+1.45,f.U/2+1.55,1,2]][q];FB(c,f,a[0],a[2],a[1],a[3],8,9.8,0x2a2a2a,false,{j:0})}
      const tm=f.map(f.U/2,1.5);
      const hx=c.cx+tm[0],hz=c.cz+tm[1];
      let w=1.5;for(let k=0;k<4;k++,w-=0.45)Bx(hx-w,c.y+10.8+k,hz-w,hx+w,c.y+11.8+k,hz+w,0x4a3a5a,false,{b:true});
      Bx(hx-0.08,c.y+14.8,hz-0.08,hx+0.08,c.y+16.4,hz+0.08,0xe0c040,false,{j:0});Bx(hx-0.5,c.y+15.5,hz-0.08,hx+0.5,c.y+15.7,hz+0.08,0xe0c040,false,{j:0});
      c.chapel={x:hx,z:hz};
    }
    specials[kind].f=f;
  });

  // casas: ordenada = fileiras regulares; caótica = tamanhos, alturas, telhados e ruínas variados; mista = intermediário
  const target=Math.round(Hc*Hc/(cha?65:mix?62:60)),cityRoofT=c.biome===BIO_DESERT?'flat':'gable',maxBd=cha?9:mix?8:5.5;
  c.rej={};const rej=k=>{c.rej[k]=(c.rej[k]||0)+1;return false};
  const tryHouse=(r,sp)=>{
    const hallTurn=sp==='hall',sk=(sp&&sp!=='hall')?sp:null;   // sp: 'hall' (prefeitura), 'store' (loja), 'tavern' (taverna) ou falso (casa comum)
    if(Math.abs(r.x0)>Hc-3||Math.abs(r.x1)>Hc-3||Math.abs(r.z0)>Hc-3||Math.abs(r.z1)>Hc-3)return rej(1);
    if(res.some(q=>ovr(r,q,0)))return rej(2);
    if(houses.some(q=>ovr(r,q,3)))return rej(3);   // vão mínimo de 3 blocos entre prédios
    let best=null,bd=1e9;
    for(const s of streets){const dx=Math.max(s.x0-r.x1,r.x0-s.x1,0),dz=Math.max(s.z0-r.z1,r.z0-s.z1,0),dd=Math.hypot(dx,dz);if(dd<bd){bd=dd;best={s,dx,dz}}}
    if(bd>maxBd||bd<1)return rej(4);
    let D;
    if(best.dz>=best.dx)D=(best.s.z1<r.z0)?'N':'S';else D=(best.s.x1<r.x0)?'W':'E';
    const ns=(D==='N'||D==='S');
    const lo=ns?r.x0:r.z0,hi=ns?r.x1:r.z1;
    const sLo=ns?best.s.x0:best.s.z0,sHi=ns?best.s.x1:best.s.z1;
    let p=clamp(Math.round((Math.max(lo,sLo)+Math.min(hi,sHi))/2-1),lo+1,hi-2);
    if(!(Math.min(hi,sHi)>=Math.max(lo,sLo)))p=Math.floor((lo+hi)/2);
    // caminho da porta até a rua: avança até tocar um tile de rua; se não chegar, o lote é recusado (nada de trechos soltos)
    const path=[];let reach=false;
    for(let g=1;g<=Math.ceil(maxBd)+2;g++){
      const cells=[0,1].map(k=>({px:ns?p+k:(D==='W'?r.x0-g:r.x1+g),pz:ns?(D==='N'?r.z0-g:r.z1+g):p+k}));
      if(cells.some(q=>{const tt=getT(c.cx+q.px,c.cz+q.pz);return tt===T_STREET||tt===T_PLAZA})){reach=true;break}
      cells.forEach(q=>path.push({x0:q.px,x1:q.px,z0:q.pz,z1:q.pz}));
    }
    if(!reach)return rej(7);
    if(path.some(q=>houses.some(h=>ovr(q,h,0))))return rej(5);
    if(path.some(q=>Math.abs(q.x0)>Hc-2||Math.abs(q.z0)>Hc-2))return rej(6);
    const w=r.x1-r.x0+1,d=r.z1-r.z0+1,Uu=ns?w:d,Vv=ns?d:w;
    let h=(cha||mix)?rng.pick([3,4,4,5]):4;
    const ruin=false;   // toda casa tem telhado
    // andares (até 3): mais chance em cidades de rank alto; 3 andares exigem largura >= 8
    let floors=1;
    if(!hallTurn&&!sk&&!ruin&&Uu>=6&&Vv>=6){const p2=0.18+0.05*c.rank+(cha?0.05:0),p3=Uu>=8?Math.max(0,0.04*(c.rank-1)):0,q=rng.next();floors=q<p3?3:q<p3+p2?2:1}
    const roofT=ruin?'none':ord?cityRoofT:(cha||mix)?rng.pick(['gable','hip','flat','gable','hip']):cityRoofT;
    const wallC=ord?rng.pick(c.pal.walls):rng.pick(c.pal.all);
    const o={h,floors,wall:wallC,roof:rng.pick(c.pal.roofs),roofT,glass:0x9ed4ff,chimney:ord?rng.chance(0.8):rng.chance(0.5),timber:!hallTurn&&!sk&&rng.chance(0.35),shut:rng.chance(0.45)?rng.pick([0x3a5a3a,0x7a2a2a,0x2a4a7a,0x5a3d22]):null};
    if(hallTurn){o.h=5;o.wall=0xe6dcc0;o.roof=0x3f5a8a;o.roofT='hip';o.chimney=false}
    if(sk==='store'){o.h=4;o.wall=0xe8d8b0;o.roof=0x8a3a2a;o.roofT='gable';o.chimney=false;o.timber=false;o.shut=0x3a5a3a}
    if(sk==='tavern'){o.h=5;o.wall=0xc89a62;o.roof=0x5a3a24;o.roofT='gable';o.chimney=true;o.timber=true;o.shut=0x5a3d22}
    const f=makeBuilding(c,r,D,p-(ns?r.x0:r.z0),o,rng);(c.doors=c.doors||[]).push(f.map(p-(ns?r.x0:r.z0)+1,-0.5));if(floors>1)(c.multi=c.multi||[]).push({r,floors,D,f});
    if(hallTurn)buildHall(c,f,D,p-(ns?r.x0:r.z0),rng);else if(sk==='store')buildStore(c,f,D,p-(ns?r.x0:r.z0),rng);else if(sk==='tavern')buildTavern(c,f,D,p-(ns?r.x0:r.z0),rng);else if(floors>1){const ub=rng.int(1,Math.max(1,f.U-5));FB(c,f,ub,1,ub+1.6,2,0,0.85,0x8a6a3a,true);FB(c,f,ub+0.1,1.1,ub+0.5,1.5,0.85,1.1,0xd8d0c0,false)}else furnishHouse(c,f,rng,D);
    houses.push(r);path.forEach(q=>setTL(c,q.x0,q.z0,T_STREET));
    res.push({x0:r.x0-1,x1:r.x1+1,z0:r.z0-1,z1:r.z1+1});
    if(rng.chance(ord?0.6:0.4)){
      const sides=['N','S','W','E'].filter(s=>s!==D),sd=rng.pick(sides);
      const gr=sd==='N'?{x0:r.x0,x1:r.x1,z0:r.z0-3,z1:r.z0-2}:sd==='S'?{x0:r.x0,x1:r.x1,z0:r.z1+2,z1:r.z1+3}:sd==='W'?{x0:r.x0-3,x1:r.x0-2,z0:r.z0,z1:r.z1}:{x0:r.x1+2,x1:r.x1+3,z0:r.z0,z1:r.z1};
      if(Math.abs(gr.x0)<Hc-2&&Math.abs(gr.x1)<Hc-2&&Math.abs(gr.z0)<Hc-2&&Math.abs(gr.z1)<Hc-2&&!res.some(q=>ovr(gr,q,0))&&!houses.some(hh=>hh!==r&&ovr(gr,hh,0))){
        fillT(c,gr,T_GARDEN);res.push(gr);
        for(let z=gr.z0;z<=gr.z1;z+=1)for(let x=gr.x0;x<=gr.x1;x+=2)if(rng.chance(0.6))Bc(c,x+0.3,0,z+0.3,x+0.7,rng.range(0.3,0.5),z+0.7,rng.pick([0xe8454f,0xf2d13d,0xffffff,0xb06ae0]),false,{j:0});
      }
    }
    return true;
  };
  // a prefeitura é procurada primeiro, em posições aleatórias (garante uma em toda cidade)
  const hallCands=[];
  for(const [hw,hd] of[[9,7],[7,9],[8,6],[6,8]])for(let hx=-Hc+3;hx<=Hc-3-hw;hx++)for(let hz=-Hc+3;hz<=Hc-3-hd;hz++)hallCands.push([hx,hz,hw,hd]);
  rng.shuffle(hallCands);
  for(let i=0;i<hallCands.length&&!c.hall;i++){const q=hallCands[i];tryHouse({x0:q[0],x1:q[0]+q[2]-1,z0:q[1],z1:q[1]+q[3]-1},'hall')}
  // a loja (compra e venda de itens) e a taverna (cozinha) também são procuradas antes das casas comuns
  for(const sp of['store','tavern']){
    const cands=[];
    for(const [hw,hd] of[[8,6],[6,8],[7,6],[6,7]])for(let hx=-Hc+3;hx<=Hc-3-hw;hx++)for(let hz=-Hc+3;hz<=Hc-3-hd;hz++)cands.push([hx,hz,hw,hd]);
    rng.shuffle(cands);
    for(let i=0;i<cands.length&&!c[sp];i++){const q=cands[i];tryHouse({x0:q[0],x1:q[0]+q[2]-1,z0:q[1],z1:q[1]+q[3]-1},sp)}
  }
  if(ord){
    // fileiras regulares: mesma profundidade, largura e recuo em todas as ruas
    const rowD=rng.pick([6,7,7]),gap=3,setback=2,wB=rng.int(6,8);
    for(const s of streets){
      const horiz=(s.x1-s.x0)>=(s.z1-s.z0);
      for(const sg of[-1,1]){
        const end=horiz?s.x1:s.z1;
        for(let cur=(horiz?s.x0:s.z0)+1;cur+wB-1<=end-1;){
          let r;
          if(horiz)r=sg<0?{x0:cur,x1:cur+wB-1,z0:s.z0-setback-rowD,z1:s.z0-setback-1}:{x0:cur,x1:cur+wB-1,z0:s.z1+setback+1,z1:s.z1+setback+rowD};
          else r=sg<0?{x0:s.x0-setback-rowD,x1:s.x0-setback-1,z0:cur,z1:cur+wB-1}:{x0:s.x1+setback+1,x1:s.x1+setback+rowD,z0:cur,z1:cur+wB-1};
          cur+=tryHouse(r,false)?wB+gap:1;
        }
      }
    }
  }else{
    // 1) fachadas ao longo das ruas, com recuos, larguras e profundidades variados
    for(const s of streets){
      const horiz=(s.x1-s.x0)>=(s.z1-s.z0);
      for(const sg of[-1,1]){
        const end=horiz?s.x1:s.z1;
        for(let cur=(horiz?s.x0:s.z0)+rng.int(0,2);cur+4<=end;){
          if(rng.chance(cha?0.25:0.12)){cur+=rng.int(2,5);continue}
          const wB=rng.int(4,cha?10:8),dB=rng.int(5,cha?9:8),sb=rng.int(2,cha?4:3);let r;
          if(horiz)r=sg<0?{x0:cur,x1:cur+wB-1,z0:s.z0-sb-dB,z1:s.z0-sb-1}:{x0:cur,x1:cur+wB-1,z0:s.z1+sb+1,z1:s.z1+sb+dB};
          else r=sg<0?{x0:s.x0-sb-dB,x1:s.x0-sb-1,z0:cur,z1:cur+wB-1}:{x0:s.x1+sb+1,x1:s.x1+sb+dB,z0:cur,z1:cur+wB-1};
          cur+=tryHouse(r,false)?wB+rng.int(3,5):1;
        }
      }
    }
    // 2) preenchimento aleatório do que sobrou
    for(let at=0;at<(cha?2200:1100)&&houses.length<target+4;at++){
      const w=cha?rng.int(4,11):rng.int(5,8),d=cha?rng.int(4,10):rng.int(5,8);
      const x0=rng.int(-Hc+3,Hc-3-w),z0=rng.int(-Hc+3,Hc-3-d);
      tryHouse({x0,x1:x0+w-1,z0,z1:z0+d-1},false);
    }
  }
  if(ord)for(let at=0;at<900&&houses.length<target+4;at++){const w=rng.int(5,7),d=rng.int(5,7),x0=rng.int(-Hc+3,Hc-3-w),z0=rng.int(-Hc+3,Hc-3-d);tryHouse({x0,x1:x0+w-1,z0,z1:z0+d-1},false)}
  // última checagem: qualquer trecho de rua ainda solto é ligado à rede principal por um caminho em L (só por terreno livre)
  for(let iter=0;iter<12;iter++){
    const isSt=(x,z)=>{const tt=getT(c.cx+x,c.cz+z);return tt===T_STREET||tt===T_PLAZA},free=(x,z)=>{const tt=getT(c.cx+x,c.cz+z);return tt===T_NAT||tt===T_GARDEN||tt===T_STREET||tt===T_PLAZA};
    const comp=new Map(),lists=[];
    for(let z=-Hc;z<=Hc;z++)for(let x=-Hc;x<=Hc;x++){
      if(!isSt(x,z)||comp.has(x+','+z))continue;
      const id=lists.length,l=[],st=[[x,z]];comp.set(x+','+z,id);
      while(st.length){const [a,b]=st.pop();l.push([a,b]);for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a+dx,nz=b+dz;if(nx<-Hc||nx>Hc||nz<-Hc||nz>Hc||!isSt(nx,nz)||comp.has(nx+','+nz))continue;comp.set(nx+','+nz,id);st.push([nx,nz])}}
      lists.push(l);
    }
    if(lists.length<=1)break;
    const main=comp.get('0,0');let fixed=false;
    for(let i=0;i<lists.length&&!fixed;i++){
      if(i===main)continue;
      let bd=1e9,pa=null,pb=null;
      for(const a of lists[i])for(const b of lists[main]){const d=Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);if(d<bd){bd=d;pa=a;pb=b}}
      const L=(ax,az,bx,bz,hFirst)=>{const out=[];let x=ax,z=az;const stepX=()=>{while(x!==bx){x+=Math.sign(bx-x);out.push([x,z])}},stepZ=()=>{while(z!==bz){z+=Math.sign(bz-z);out.push([x,z])}};if(hFirst){stepX();stepZ()}else{stepZ();stepX()}return out};
      for(const hf of[true,false]){
        const cells=L(pa[0],pa[1],pb[0],pb[1],hf);
        if(cells.every(q=>free(q[0],q[1]))){for(const q of cells)if(!isSt(q[0],q[1]))setTL(c,q[0],q[1],T_STREET);fixed=true;break}
      }
      if(!fixed){   // caminho em L bloqueado por uma casa: busca em largura pelo terreno livre até a rede principal
        const key=(x,z)=>x+','+z,prev=new Map(),qu=[];
        for(const a of lists[i]){qu.push(a);prev.set(key(a[0],a[1]),null)}
        let found=null;
        for(let qi=0;qi<qu.length&&!found;qi++){
          const [a,b]=qu[qi];
          for(const [dx,dz] of[[1,0],[-1,0],[0,1],[0,-1]]){
            const nx=a+dx,nz=b+dz;if(nx<-Hc||nx>Hc||nz<-Hc||nz>Hc)continue;
            const k=key(nx,nz);if(prev.has(k))continue;
            if(comp.get(k)===main){prev.set(k,[a,b]);found=[nx,nz];break}
            if(!free(nx,nz))continue;
            prev.set(k,[a,b]);qu.push([nx,nz]);
          }
        }
        if(found){let cur=found;while(cur){if(!isSt(cur[0],cur[1]))setTL(c,cur[0],cur[1],T_STREET);cur=prev.get(key(cur[0],cur[1]))}fixed=true}
      }
    }
    if(!fixed)break;
  }
  // reserva: se não coube um prédio, a prefeitura vira um grande quadro de avisos na praça
  if(!c.hall){
    for(const [bx,bz] of[[0,-(P-1)],[0,P-1],[-(P-1),0],[P-1,0],[S+3,-(P-1)],[-(S+3),P-1],[P-2,S+3],[-(P-2),-(S+3)]]){
      if(Col.near(c.cx+bx-1.8,c.cz+bz-1.8,c.cx+bx+1.8,c.cz+bz+1.8).length)continue;
      Bc(c,bx-1.5,0,bz-0.12,bx+1.5,0.8,bz+0.12,0x5a3d22,true);Bc(c,bx-1.4,0.8,bz-0.14,bx+1.4,2.4,bz+0.14,0x6b4a2a,false,{j:0});
      for(const k of[-1.5,1.5])Bc(c,bx+k-0.1,0,bz-0.2,bx+k+0.1,2.6,bz+0.2,0x3a2a18,false,{j:0});
      for(let k=0;k<6;k++){const u=bx-1.1+(k%3)*0.8,y=1.0+Math.floor(k/3)*0.7;Bc(c,u,y,bz+0.14,u+0.6,y+0.5,bz+0.19,rng.pick([0xf2ecd0,0xe8dcc0,0xf4f0e0]),false,{j:0})}
      c.hall={x:c.cx+bx,z:c.cz+bz+1.6};break;
    }
  }
  // reserva: se a loja não coube num prédio, vira uma barraca de mercador na praça
  if(!c.store){
    for(const [bx,bz] of[[P-1,0],[-(P-1),0],[0,P-1],[0,-(P-1)],[S+4,P-2],[-(S+4),-(P-2)]]){
      if(Col.near(c.cx+bx-2.2,c.cz+bz-2.2,c.cx+bx+2.2,c.cz+bz+2.2).length)continue;
      const ca=0x8a3a2a;
      for(const [px,pz] of[[bx-1.8,bz-0.9],[bx+1.6,bz-0.9],[bx-1.8,bz+0.7],[bx+1.6,bz+0.7]])Bc(c,px,0,pz,px+0.2,2.5,pz+0.2,0x6b4a2a,false,{j:0});
      Bc(c,bx-2,2.5,bz-1.1,bx+2,2.8,bz+1.1,ca,false,{j:0.03});
      Bc(c,bx-1.8,0,bz-0.7,bx+1.8,1.0,bz+0.1,0x8a6a3a,true);
      for(let q=0;q<6;q++)Bc(c,bx-1.6+q*0.55,1.0,bz-0.55,bx-1.2+q*0.55,1.3,bz-0.15,rng.pick([0xe8454f,0xf2a03d,0x5ab03d,0xe8d84f,0x6ab0e0]),false,{j:0});
      c.store={x:c.cx+bx,z:c.cz+bz+1.6};c.keepers=c.keepers||[];c.keepers.push({role:'merchant',x:c.cx+bx,z:c.cz+bz-0.5+ (-0.0),yaw:0});
      break;
    }
  }
  c.houses=houses;  // moinho de vento para cidades de planície
  if(c.biome===BIO_PLAINS||c.biome===BIO_FOREST){
    for(let at=0;at<80;at++){
      const x0=rng.int(-Hc+3,Hc-8),z0=rng.int(-Hc+3,Hc-8),r={x0,x1:x0+3,z0,z1:z0+3};
      if(res.some(q=>ovr(r,q,0))||houses.some(q=>ovr(r,q,1)))continue;
      Bc(c,x0,0,z0,x0+4,5,z0+4,0xe8e0cc,true);Bc(c,x0+0.5,5,z0+0.5,x0+3.5,8,z0+3.5,0xe8e0cc,true);
      let w=2.6,k=0;for(;w>0.6;w-=0.7,k++)Bc(c,x0+2-w,8+k,z0+2-w,x0+2+w,9+k,z0+2+w,0x8b3a2b,true,{b:true});
      const g=new THREE.Group();g.position.set(c.cx+x0+2,c.y+6.5,c.cz+z0+4.3);
      for(let b=0;b<4;b++){const arm=new THREE.Group();arm.rotation.z=b*Math.PI/2;part(arm,GEO_BOX,0.4,4.2,0.12,0x6b4a2a,0,2.4,0);part(arm,GEO_BOX,1.1,3,0.06,0xf0e8d0,0.7,2.8,0);g.add(arm)}
      scene.add(g);WORLD.windmills.push(g);
      res.push({x0:x0-1,x1:x0+4,z0:z0-1,z1:z0+4});houses.push(r);break;
    }
  }

  // lavouras, cercados com animais, piquenique, lagoa, jardim, feira e outros cantinhos nos espaços livres
  cityDecor(c,rng,res,houses,Hc,S,P,(c.doors||[]).concat(doors));
  // cercas, muros e torres
  // rank 1-2: sem muralha | rank 3-4 (e cidade inicial): cerca | rank 5-6: muralha de pedra/paliçada com torres
  let wt;
  if(c.rank>=5)wt=c.biome===BIO_DESERT?'stone':c.biome===BIO_FOREST?'palisade':rng.pick(['stone','palisade']);
  else if(c.rank>=3||c.home)wt='fence';
  else wt='none';
  c.wallType=wt;
  if(wt!=='none'){
    const wc=wt==='stone'?(c.biome===BIO_DESERT?0xd2c08a:0x8a8a8a):0x6b4a2a;
    const lo=-Hc-1,hi=Hc+2;
    const seg=(ax,f,a0,a1)=>{
      for(let a=a0;a<a1;a++){
        if(wt==='palisade'&&!(cha&&rng.chance(0.1))){const hh=rng.range(2.8,3.7),pc=shadec(wc,rng.range(0.85,1.15));
          if(ax==='x'){Bc(c,a,-3,f,a+1,hh,f+1,pc,true,{j:0.08});Bc(c,a+0.25,hh,f+0.25,a+0.75,hh+0.45,f+0.75,pc,false,{j:0.08})}
          else{Bc(c,f,-3,a,f+1,hh,a+1,pc,true,{j:0.08});Bc(c,f+0.25,hh,a+0.25,f+0.75,hh+0.45,a+0.75,pc,false,{j:0.08})}}
      }
      if(wt==='stone'){
        // colisão numa caixa só; visual em blocos de 3 fiadas com tons variados, seteiras e ameias
        if(ax==='x')addCol(c.cx+a0,c.y-3,c.cz+f,c.cx+a1,c.y+3,c.cz+f+1);else addCol(c.cx+f,c.y-3,c.cz+a0,c.cx+f+1,c.y+3,c.cz+a1);
        const bk=(a,ya,yb,col)=>{if(ax==='x')Bc(c,a,ya,f,a+1,yb,f+1,col,false,{j:0.04});else Bc(c,f,ya,a,f+1,yb,a+1,col,false,{j:0.04})};
        for(let a=a0;a<a1;a++){
          bk(a,-3,0.6,shadec(wc,0.8+rng.range(0,0.2)));bk(a,0.6,1.8,shadec(wc,0.88+rng.range(0,0.22)));bk(a,1.8,3,shadec(wc,0.9+rng.range(0,0.22)));
          if(a%2===0)bk(a,3,3.7,shadec(wc,0.95+rng.range(0,0.15)));
        }
        for(let a=a0+3;a<a1-1;a+=7){if(ax==='x')Bc(c,a+0.4,1.7,f-0.03,a+0.6,2.6,f+1.03,0x1a1a1a,false,{j:0});else Bc(c,f-0.03,1.7,a+0.4,f+1.03,2.6,a+0.6,0x1a1a1a,false,{j:0})}
      }
      if(wt==='palisade'){for(const y of[0.8,2.0]){if(ax==='x')Bc(c,a0,y,f-0.1,a1,y+0.3,f+1.1,0x4a3320,false,{j:0.03});else Bc(c,f-0.1,y,a0,f+1.1,y+0.3,a1,0x4a3320,false,{j:0.03})}}
      if(wt==='fence'){
        if(ax==='x'){Bc(c,a0,0,f+0.35,a1,0.2,f+0.65,0x7a5a30,true);Bc(c,a0,0.5,f+0.35,a1,0.7,f+0.65,0x7a5a30,true)}else{Bc(c,f+0.35,0,a0,f+0.65,0.2,a1,0x7a5a30,true);Bc(c,f+0.35,0.5,a0,f+0.65,0.7,a1,0x7a5a30,true)}
        for(let a=a0;a<a1;a+=2){if(ax==='x')Bc(c,a,0,f+0.3,a+0.3,1.1,f+0.7,0x5a3d22,true);else Bc(c,f+0.3,0,a,f+0.7,1.1,a+0.3,0x5a3d22,true)}
        for(let a=a0+0.2;a<a1;a+=0.5){const hh=0.8+(Math.floor(a*2)%3)*0.06;if(ax==='x')Bc(c,a,0,f+0.4,a+0.16,hh,f+0.6,0x8a6a3a,false,{j:0.05});else Bc(c,f+0.4,0,a,f+0.6,hh,a+0.16,0x8a6a3a,false,{j:0.05})}
      }
    };
    // lados com abertura de portão
    seg('x',lo,lo,-S);seg('x',lo,S+1,hi);seg('x',Hc+1,lo,-S);seg('x',Hc+1,S+1,hi);
    seg('z',lo,lo,-S);seg('z',lo,S+1,hi);seg('z',Hc+1,lo,-S);seg('z',Hc+1,S+1,hi);
    if(wt!=='fence'){
      const gp=(x,z)=>{Bc(c,x,-3,z,x+1,5,z+1,wt==='stone'?shadec(wc,0.9):0x4a3320,true)};
      for(const e of[-Hc-1,Hc+1]){gp(e,-S-1);gp(e,S+1);gp(-S-1,e);gp(S+1,e)}
      for(const e of[-Hc-1,Hc+1]){
        Bc(c,e,4,-S-1,e+1,4.8,S+2,0x4a3320,false);Bc(c,-S-1,4,e,S+2,4.8,e+1,0x4a3320,false);
        addFlag(c,e+0.5,5,-S-0.5,2.2);addFlag(c,-S-0.5,5,e+0.5,2.2);
      }
      // torres de canto
      const tpos=[];
      for(const sx of[-1,1])for(const sz of[-1,1])tpos.push([sx>0?Hc:-Hc-2,sz>0?Hc:-Hc-2]);
      for(let a=S+16;a<Hc-6;a+=24)for(const sg of[-1,1]){const q=sg*a;tpos.push([q-1,-Hc-2],[q-1,Hc],[-Hc-2,q-1],[Hc,q-1])}
      for(const [tx,tz] of tpos){
        {const tc=wt==='stone'?shadec(wc,0.95):0x5a3d22;
         addCol(c.cx+tx,c.y-4,c.cz+tz,c.cx+tx+3,c.y+6.5,c.cz+tz+3);
         [[-4,0.5],[0.5,2],[2,3.5],[3.5,5],[5,6.5]].forEach((q,k)=>Bc(c,tx,q[0],tz,tx+3,q[1],tz+3,shadec(tc,k%2?1.08:0.92),false,{j:0.05}));
         Bc(c,tx-0.2,5.8,tz-0.2,tx+3.2,6.5,tz+3.2,shadec(tc,1.12),false,{j:0.04});
         for(const k of[0,1,2,3]){const sl=[[1.35,-0.04,1.65,0.02],[1.35,2.98,1.65,3.04],[-0.04,1.35,0.02,1.65],[2.98,1.35,3.04,1.65]][k];Bc(c,tx+sl[0],3,tz+sl[1],tx+sl[2],4.1,tz+sl[3],0x1a1a1a,false,{j:0})}}
        for(const [a,b] of[[0,0],[2,0],[0,2],[2,2],[1,0],[0,1],[2,1],[1,2]])Bc(c,tx+a,6.5,tz+b,tx+a+1,7.1,tz+b+1,wc,false);
        Bc(c,tx,6.4,tz,tx+3,6.5,tz+3,0x555555,false,{j:0});
        c.towers.push({x:c.cx+tx+1.5,z:c.cz+tz+1.5,y:c.y+6.5});
        addFlag(c,tx+1.5,7.1,tz+1.5,2.6);
      }
    }
  }
  // bandeiras na capela / praça
  // props de cobertura
  const cand=[];
  for(let t=P+3;t<Hc-2;t+=3){cand.push([t,S+1],[-t,-S-2],[S+1,-t],[-S-2,t],[t,-S-2],[-t,S+1],[-S-2,-t],[S+1,t]);}
  for(let k=0;k<10;k++){cand.push([rng.int(-P+2,P-2),rng.int(-P+2,P-2)])}
  rng.shuffle(cand);
  let placed=0;
  for(const [px,pz] of cand){
    if(placed>=propMax)break;
    if(Math.abs(px)<3&&Math.abs(pz)<3)continue;
    {let free=true;for(let dz=0;dz<2&&free;dz++)for(let dx=0;dx<3;dx++)if(getT(c.cx+Math.floor(px)+dx,c.cz+Math.floor(pz)+dz)!==T_NAT){free=false;break}
     if(!free)continue}   // nada de caixas, barris ou sacos em cima das ruas
    const near=Col.near(c.cx+px-1.5,c.cz+pz-1.5,c.cx+px+3.5,c.cz+pz+3.5);if(near.length)continue;
    const kind=rng.int(0,4),isXs=Math.abs(pz)<=S&&Math.abs(px)>S;
    if(kind===0){crate(c,px,pz,1,1.3);if(rng.chance(0.5))crate(c,px+1,pz,1,1.3);if(rng.chance(0.4))crate(c,px,pz,1,1.3)}
    else if(kind===1){barrel(c,px,pz);if(rng.chance(0.6))barrel(c,px+1,pz)}
    else if(kind===2)sandbag(c,px,pz,isXs||rng.chance(0.5));
    else if(kind===3)hay(c,px,pz);
    else {crate(c,px,pz,1.2,1.4);barrel(c,px+1.4,pz)}
    placed++;
  }
  // árvores e arbustos dentro da cidade
  for(let k=0;k<treeN;k++){
    const x=rng.int(-Hc+2,Hc-3),z=rng.int(-Hc+2,Hc-3),r={x0:x,x1:x,z0:z,z1:z};
    if(res.some(q=>ovr(r,q,0))||houses.some(q=>ovr(r,q,0)))continue;
    if(getT(c.cx+x,c.cz+z)!==T_NAT&&getT(c.cx+x,c.cz+z)!==T_GARDEN)continue;
    if(Col.near(c.cx+x-1,c.cz+z-1,c.cx+x+2,c.cz+z+2).length)continue;
    if(c.biome===BIO_DESERT){if(rng.chance(0.5))Bx(c.cx+x+0.3,c.y,c.cz+z+0.3,c.cx+x+0.7,c.y+rng.int(2,3),c.cz+z+0.7,0x3f8a3a,true);}
    else if(rng.chance(0.55))tinyTree(c,x,z,rng);else Bc(c,x+0.1,0,z+0.1,x+0.9,0.7,z+0.9,leafCol(rng,0x2a6a24),false,{j:0.1,b:true});
  }
  // campos de cultivo fora do muro
  if(c.biome===BIO_PLAINS||c.biome===BIO_FOREST){
    for(let n=0;n<4;n++){
      for(let at=0;at<20;at++){
        const side=rng.int(0,3),fw=rng.int(8,12),fd=rng.int(5,7),off=Hc+rng.int(7,9);
        let fx=side===0?off:side===1?-off-fw:rng.int(-Hc,Hc-fw),fz=side===2?off:side===3?-off-fd:rng.int(-Hc,Hc-fd);
        if(side<2)fz=rng.int(-Hc+2,Hc-fd-2);
        let ok=true;
        for(let z=fz-1;z<fz+fd+1&&ok;z++)for(let x=fx-1;x<fx+fw+1;x++){const wx=c.cx+x,wz=c.cz+z;if(wx<4||wz<4||wx>=W-4||wz>=W-4||getT(wx,wz)!==T_NAT||H[wz*W+wx]<SEA+1){ok=false;break}}
        if(!ok)continue;
        for(let z=fz;z<fz+fd;z++)for(let x=fx;x<fx+fw;x++){
          const wx=c.cx+x,wz=c.cz+z,i=wz*W+wx,row=(z-fz)%2===0;
          if(row){T[i]=T_SOIL}else{T[i]=T_WHEAT;Bx(wx+0.12,H[i],wz+0.12,wx+0.88,H[i]+0.8,wz+0.88,shadec(0xd8b64a,rng.range(0.85,1.1)),false,{j:0.05})}
        }
        const sx=c.cx+fx+fw/2,sz=c.cz+fz+fd/2,sy=H[Math.floor(sz)*W+Math.floor(sx)];
        Bx(sx-0.08,sy,sz-0.08,sx+0.08,sy+2.2,sz+0.08,0x6b4a2a,false);Bx(sx-0.7,sy+1.5,sz-0.06,sx+0.7,sy+1.7,sz+0.06,0x6b4a2a,false);Bx(sx-0.3,sy+2.2,sz-0.3,sx+0.3,sy+2.7,sz+0.3,0xc8a85a,false);
        break;
      }
    }
  }

  // pontos de passeio e de surgimento
  for(let z=-Hc+1;z<=Hc-1;z+=2)for(let x=-Hc+1;x<=Hc-1;x+=2){
    const t=getT(c.cx+x,c.cz+z);
    if(t===T_STREET||t===T_PLAZA){
      if(Col.near(c.cx+x-0.3,c.cz+z-0.3,c.cx+x+1.3,c.cz+z+1.3).length===0)c.walk.push({x:c.cx+x+0.5,z:c.cz+z+0.5});
    }
  }
  c.specials=specials;
  c.gateSpots=[[S+1,-Hc+1],[-S,Hc-1],[Hc-1,S+1],[-Hc+1,-S]].map(p=>({x:c.cx+p[0]+0.5,z:c.cz+p[1]+0.5}));
}



// ---------- bichos de fazenda (ovelhas e vacas) que passeiam dentro dos cercados ----------
const CRITTERS=[];
function spawnCritter(kind,x,y,z,pen){
  const m=kind==='cow'?buildCowV():buildSheepV(),g=m.group;
  g.position.set(x,y,z);g.rotation.y=Math.random()*6.28;scene.add(g);
  const a={kind,m,g,x,y,z,yaw:g.rotation.y,pen,tx:x,tz:z,state:'idle',t:Math.random()*3,phase:Math.random()*6,graze:Math.random()<0.5};
  CRITTERS.push(a);return a;
}
function updateCritters(dt){
  for(const a of CRITTERS){
    if(Math.abs(a.x-P.x)>90||Math.abs(a.z-P.z)>90)continue;
    a.t-=dt;
    if(a.state==='idle'){
      a.m.head.rotation.x+=((a.graze?0.6:0)-a.m.head.rotation.x)*Math.min(1,dt*4);
      a.m.legs.forEach(l=>l.rotation.x*=0.85);
      if(a.t<=0){
        if(Math.random()<0.6){a.state='walk';a.graze=false;a.tx=lerp(a.pen.x0,a.pen.x1,Math.random());a.tz=lerp(a.pen.z0,a.pen.z1,Math.random());a.t=8}
        else{a.graze=!a.graze;a.t=1.5+Math.random()*3}
      }
    }else{
      a.m.head.rotation.x*=0.9;
      const dx=a.tx-a.x,dz=a.tz-a.z,d=Math.hypot(dx,dz);
      if(d<0.3||a.t<=0){a.state='idle';a.t=1+Math.random()*3;a.graze=Math.random()<0.5}
      else{
        let df=Math.atan2(dx,dz)-a.yaw;df=Math.atan2(Math.sin(df),Math.cos(df));a.yaw+=df*Math.min(1,dt*3);
        a.x+=Math.sin(a.yaw)*0.7*dt;a.z+=Math.cos(a.yaw)*0.7*dt;a.phase+=dt*5;animWalk(a.m,a.phase,0.55);
      }
    }
    a.x=clamp(a.x,a.pen.x0,a.pen.x1);a.z=clamp(a.z,a.pen.z0,a.pen.z1);
    a.g.position.set(a.x,a.y,a.z);a.g.rotation.y=a.yaw;
  }
}

// ---------- bancos ----------
// face = para onde quem senta olha ('N' = -z, 'S' = +z, 'E' = +x, 'W' = -x)
function benchRect(x,z,face){const ew=face==='E'||face==='W',al=2.4,dp=1.0;return ew?{x0:x-dp/2,x1:x+dp/2,z0:z-al/2,z1:z+al/2}:{x0:x-al/2,x1:x+al/2,z0:z-dp/2,z1:z+dp/2}}
function bench(c,x,z,face){
  const ew=face==='E'||face==='W',sg=(face==='S'||face==='E')?1:-1;
  // a = ao longo do banco, b = profundidade (positivo = frente)
  const B=(a0,a1,b0,b1,y0,y1,col,o)=>{
    const p0=sg>0?b0:-b1,p1=sg>0?b1:-b0;
    if(ew)Bc(c,x+p0,y0,z+a0,x+p1,y1,z+a1,col,false,o);else Bc(c,x+a0,y0,z+p0,x+a1,y1,z+p1,col,false,o);
  };
  const wd=[0x8a6a3a,0x7d5e34,0x96743f],dk=0x3a3a3e;
  for(let k=0;k<3;k++)B(-1.1,1.1,-0.4+k*0.28,-0.16+k*0.28,0.46,0.56,wd[k],{j:0.05});          // ripas do assento
  for(const a of[-0.85,0.85])B(a-0.08,a+0.08,-0.36,0.36,0,0.46,dk,{j:0});                       // pés
  B(-1.1,1.1,-0.44,-0.36,0.72,0.88,wd[1],{j:0.05});B(-1.1,1.1,-0.44,-0.36,0.94,1.1,wd[2],{j:0.05});   // encosto
  for(const a of[-1.0,1.0])B(a-0.07,a+0.07,-0.46,-0.34,0.46,1.12,dk,{j:0});
  for(const a of[-1.12,1.12])B(a-0.06,a+0.06,-0.3,0.4,0.72,0.8,dk,{j:0});                       // apoios de braço
  const rc=benchRect(x,z,face);addCol(c.cx+rc.x0,c.y,c.cz+rc.z0,c.cx+rc.x1,c.y+0.6,c.cz+rc.z1);
}

// ---------- decoração das cidades ----------
function fenceRun(c,ax,f,a0,a1,g0,g1){   // linha de cerca (com vão opcional [g0,g1]); colisão alta para ninguém pular
  const seg=(s0,s1)=>{
    if(s1-s0<0.2)return;
    const BB=(a,b,y0,y1,w,cl)=>ax==='x'?Bc(c,a,y0,f-w,b,y1,f+w,cl,false,{j:0.04}):Bc(c,f-w,y0,a,f+w,y1,b,cl,false,{j:0.04});
    BB(s0,s1,0.25,0.42,0.06,0x7a5a30);BB(s0,s1,0.62,0.78,0.06,0x7a5a30);
    for(let a=s0;a<=s1+0.01;a+=1.5)BB(a-0.1,a+0.1,0,1.0,0.1,0x5a3d22);
    if(ax==='x')addCol(c.cx+s0,c.y,c.cz+f-0.1,c.cx+s1,c.y+1.4,c.cz+f+0.1);else addCol(c.cx+f-0.1,c.y,c.cz+s0,c.cx+f+0.1,c.y+1.4,c.cz+s1);
  };
  if(g0===null||g0===undefined)seg(a0,a1);else{seg(a0,g0);seg(g1,a1)}
}
// cerca em volta de um lote (O); gate = lado do portão ('N','S','E','W') ou null
function fenceLot(c,O,gate){
  const x0=O.x0+0.5,x1=O.x1+0.5,z0=O.z0+0.5,z1=O.z1+0.5,mx=(x0+x1)/2,mz=(z0+z1)/2;
  fenceRun(c,'x',z0,x0,x1,gate==='N'?mx-1:null,gate==='N'?mx+1:null);
  fenceRun(c,'x',z1,x0,x1,gate==='S'?mx-1:null,gate==='S'?mx+1:null);
  fenceRun(c,'z',x0,z0,z1,gate==='W'?mz-1:null,gate==='W'?mz+1:null);
  fenceRun(c,'z',x1,z0,z1,gate==='E'?mz-1:null,gate==='E'?mz+1:null);
}
function cityLotFinder(c,rng,res,houses,Hc,w,d,tries){
  for(let t=0;t<tries;t++){
    const x0=rng.int(-Hc+4,Hc-4-w),z0=rng.int(-Hc+4,Hc-4-d),r={x0,x1:x0+w-1,z0,z1:z0+d-1};
    if(res.some(q=>ovr(r,q,1))||houses.some(q=>ovr(r,q,2)))continue;
    let ok=true;
    for(let z=z0-1;z<=r.z1+1&&ok;z++)for(let x=x0-1;x<=r.x1+1;x++)if(getT(c.cx+x,c.cz+z)!==T_NAT){ok=false;break}
    if(!ok||Col.near(c.cx+x0-1,c.cz+z0-1,c.cx+r.x1+2,c.cz+r.z1+2).length)continue;
    return r;
  }
  return null;
}
function nearestStreetSide(c,O){   // lado do lote voltado para a rua mais próxima (para o portão)
  let best='S',bd=1e9;
  const mx=(O.x0+O.x1)/2,mz=(O.z0+O.z1)/2;
  for(const s of c.streets){
    const dx=Math.max(s.x0-O.x1,O.x0-s.x1,0),dz=Math.max(s.z0-O.z1,O.z0-s.z1,0),d=Math.hypot(dx,dz);
    if(d<bd){bd=d;best=dz>=dx?((s.z1<O.z0)?'N':'S'):((s.x1<O.x0)?'W':'E')}
  }
  return best;
}
function featFarm(c,O,rng){
  const r={x0:O.x0+1,x1:O.x1-1,z0:O.z0+1,z1:O.z1-1},type=rng.pick(['wheat','cabbage','carrot','pumpkin']);
  for(let z=r.z0;z<=r.z1;z++)for(let x=r.x0;x<=r.x1;x++){
    const row=(z-r.z0)%2===0;
    setTL(c,x,z,row?T_SOIL:(type==='wheat'?T_WHEAT:T_SOIL));
    if(row)continue;
    if(type==='wheat')Bc(c,x+0.12,0,z+0.12,x+0.88,0.8,z+0.88,shadec(0xd8b64a,rng.range(0.85,1.1)),false,{j:0.05});
    else if(type==='cabbage'){Bc(c,x+0.2,0,z+0.2,x+0.8,0.45,z+0.8,shadec(0x4f9a3a,rng.range(0.9,1.1)),false,{j:0.06});Bc(c,x+0.32,0.45,z+0.32,x+0.68,0.58,z+0.68,0x8ad06a,false,{j:0.05})}
    else if(type==='carrot'){Bc(c,x+0.2,0,z+0.2,x+0.8,0.4,z+0.8,0x4fa83a,false,{j:0.08});Bc(c,x+0.4,0,z+0.4,x+0.6,0.12,z+0.6,0xe8761a,false,{j:0})}
    else{Bc(c,x+0.15,0,z+0.15,x+0.85,0.55,z+0.85,shadec(0xe8761a,rng.range(0.9,1.1)),false,{j:0.06});Bc(c,x+0.45,0.55,x*0+z+0.45,x+0.55,0.72,z+0.55,0x3a7a2a,false,{j:0})}
  }
  // espantalho no meio
  const sx=Math.floor((r.x0+r.x1)/2),sz=r.z0+1;setTL(c,sx,sz,T_SOIL);
  Bc(c,sx+0.45,0,sz+0.45,sx+0.55,2.0,sz+0.55,0x6b4a2a,false,{j:0});Bc(c,sx-0.3,1.3,sz+0.45,sx+1.3,1.4,sz+0.55,0x6b4a2a,false,{j:0});
  Bc(c,sx+0.2,1.0,sz+0.35,sx+0.8,1.5,sz+0.65,0x4a6a9a,false,{j:0.03});Bc(c,sx+0.3,2.0,sz+0.3,sx+0.7,2.4,sz+0.7,0xe8d49a,false,{j:0.03});Bc(c,sx+0.15,2.4,sz+0.15,sx+0.85,2.5,sz+0.85,0x6b4a2a,false,{j:0});Bc(c,sx+0.3,2.5,sz+0.3,sx+0.7,2.85,sz+0.7,0x6b4a2a,false,{j:0});
  fenceLot(c,O,nearestStreetSide(c,O));
}
function featPen(c,O,rng){
  const gate=nearestStreetSide(c,O),I={x0:O.x0+1,x1:O.x1-1,z0:O.z0+1,z1:O.z1-1};
  fenceLot(c,O,gate);
  // cocho com água e fardos de feno junto à cerca do lado oposto ao portão
  const north=gate!=='N',zt=north?I.z0:I.z1,mx=(I.x0+I.x1)/2;
  const tz=north?zt:zt;
  Bc(c,mx-1.2,0,tz+(north?0.2:0.1),mx+1.2,0.55,tz+(north?0.9:0.8),0x6b4a2a,false,{j:0.05});Bc(c,mx-1.1,0.45,tz+(north?0.3:0.2),mx+1.1,0.58,tz+(north?0.8:0.7),0x3a7ad8,false,{j:0.02});
  addCol(c.cx+mx-1.2,c.y,c.cz+tz+(north?0.2:0.1),c.cx+mx+1.2,c.y+0.55,c.cz+tz+(north?0.9:0.8));
  const hx=I.x1-1.2;for(let i=0;i<4;i++)Bc(c,hx,i*0.26,tz+(north?0.2:-0.3),hx+1.2,(i+1)*0.26,tz+(north?1.4:0.9),i%2?0xd8b84a:0xc8a83c,false,{j:0.08});
  addCol(c.cx+hx,c.y,c.cz+tz+(north?0.2:-0.3),c.cx+hx+1.2,c.y+1,c.cz+tz+(north?1.4:0.9));
  const cows=rng.chance(0.45),n=cows?rng.int(2,3):rng.int(3,5);
  const bounds={x0:c.cx+I.x0+0.9,x1:c.cx+I.x1+0.1,z0:c.cz+I.z0+(north?2.4:0.9),z1:c.cz+I.z1+(north?0.1:-1.6)+1};
  for(let k=0;k<n;k++){
    const kind=cows?'cow':(rng.chance(0.2)?'cow':'sheep');
    spawnCritter(kind,lerp(bounds.x0,bounds.x1,rng.next()),c.y,lerp(bounds.z0,bounds.z1,rng.next()),bounds);
  }
}
function featPicnic(c,O,rng){
  const cx=(O.x0+O.x1)/2+0.5,cz=(O.z0+O.z1)/2+0.5;
  for(let i=0;i<5;i++)for(let j=0;j<5;j++)Bc(c,cx-2+i*0.8,0,cz-2+j*0.8,cx-2+(i+1)*0.8,0.05,cz-2+(j+1)*0.8,(i+j)&1?0xd03a3a:0xf4f0e8,false,{j:0.02});
  Bc(c,cx-0.9,0.05,cz-0.5,cx-0.3,0.38,cz+0.1,0x8a5a2a,false,{j:0.05});Bc(c,cx-0.95,0.38,cz-0.55,cx-0.25,0.44,cz+0.15,0xa87a3a,false,{j:0.05});Bc(c,cx-0.7,0.44,cz-0.35,cx-0.5,0.6,cz-0.15,0xe8454f,false,{j:0});
  for(const [x,z,col] of[[0.5,-0.4,0xf2f2f2],[0.9,0.5,0xf2d13d],[-0.2,0.8,0xffffff]])Bc(c,cx+x-0.15,0.05,cz+z-0.15,cx+x+0.15,0.1,cz+z+0.15,col,false,{j:0});
  Bc(c,cx+0.6,0.05,cz-0.1,cx+0.78,0.4,cz+0.08,0x3a8a4a,false,{j:0});Bc(c,cx+0.64,0.4,cz-0.06,cx+0.74,0.52,cz+0.04,0xc8a850,false,{j:0});
  for(const [x,z] of[[-1.8,-1.8],[1.8,1.7]])Bc(c,cx+x-0.35,0,cz+z-0.35,cx+x+0.35,0.3,cz+z+0.35,0x4a6ad0,false,{j:0.04});    // almofadas
  // guarda-sol
  const px=cx+2.4,pz=cz-2.2;
  Bc(c,px-0.05,0,pz-0.05,px+0.05,2.4,pz+0.05,0xd8d0c0,false,{j:0});
  for(let k=0;k<3;k++){const w=1.5-k*0.45;Bc(c,px-w,2.2+k*0.2,pz-w,px+w,2.4+k*0.2,pz+w,k%2?0xf4f0e8:0xd03a3a,false,{j:0.03,b:true})}
  bench(c,cx-3.2,cz-0.5,'E');
}
function featPond(c,O,rng){
  const cx=(O.x0+O.x1)/2+0.5,cz=(O.z0+O.z1)/2+0.5,rx=(O.x1-O.x0)/2-0.3,rz=(O.z1-O.z0)/2-0.3;
  for(let z=O.z0;z<=O.z1;z++)for(let x=O.x0;x<=O.x1;x++){
    const d=Math.hypot((x+0.5-cx)/rx,(z+0.5-cz)/rz);
    if(d<0.86)Bc(c,x,0,z,x+1,0.1,z+1,shadec(0x3a7ad8,rng.range(0.92,1.08)),false,{j:0.02});
    else if(d<1.08){const h=rng.range(0.15,0.4);Bc(c,x+0.05,0,z+0.05,x+0.95,h,z+0.95,shadec(rng.pick([0x8a8a8a,0x7a7a7a,0x9a9890]),rng.range(0.9,1.1)),false,{j:0.08})}
    else if(d<1.35&&rng.chance(0.3))Bc(c,x+0.4,0,z+0.4,x+0.5,rng.range(0.5,1.1),z+0.5,0x4a8a3a,false,{j:0.05});   // juncos
  }
  for(let k=0;k<4;k++){const x=cx+rng.range(-rx*0.6,rx*0.6),z=cz+rng.range(-rz*0.6,rz*0.6);Bc(c,x-0.3,0.1,z-0.3,x+0.3,0.14,z+0.3,0x3a8a3a,false,{j:0.04});if(rng.chance(0.5))Bc(c,x-0.08,0.14,z-0.08,x+0.08,0.24,z+0.08,0xff8fb0,false,{j:0})}
  bench(c,cx,O.z1+1.6,'N');
}
function featGarden(c,O,rng){
  const r={x0:O.x0+1,x1:O.x1-1,z0:O.z0+1,z1:O.z1-1};
  for(let z=r.z0;z<=r.z1;z++)for(let x=r.x0;x<=r.x1;x++){
    setTL(c,x,z,T_GARDEN);
    const edge=x===r.x0||x===r.x1||z===r.z0||z===r.z1;
    if(edge){Bc(c,x,0,z,x+1,0.25,z+1,shadec(0x8a8a8a,rng.range(0.9,1.1)),false,{j:0.06});continue}
    const col=rng.pick([0xe8454f,0xf2d13d,0xffffff,0xb06ae0,0xff8fb0,0xff9a3a]);
    for(const [a,b] of[[0.2,0.2],[0.6,0.3],[0.35,0.65],[0.7,0.7]])Bc(c,x+a-0.06,0,z+b-0.06,x+a+0.06,0.3,z+b+0.06,0x3f8a2a,false,{j:0}),Bc(c,x+a-0.14,0.3,z+b-0.14,x+a+0.14,0.45,z+b+0.14,col,false,{j:0.05});
  }
  const mx=(r.x0+r.x1)/2+0.5,mz=(r.z0+r.z1)/2+0.5;
  Bc(c,mx-0.15,0.25,mz-0.15,mx+0.15,0.9,mz+0.15,0x9a9a9a,false,{j:0});Bc(c,mx-0.5,0.9,mz-0.5,mx+0.5,1.05,mz+0.5,0xaaaaaa,false,{j:0});Bc(c,mx-0.4,1.05,mz-0.4,mx+0.4,1.12,mz+0.4,0x3a7ad8,false,{j:0});
  for(const [x,z] of[[O.x1+0.2,O.z0],[O.x1+0.2,O.z0+1.4]]){Bc(c,x,0,z,x+0.8,0.4,z+0.8,0x6b4a2a,false,{j:0});Bc(c,x+0.05,0.4,z+0.05,x+0.75,1.0,z+0.75,0xf2d070,false,{j:0.05});Bc(c,x-0.05,1.0,z-0.05,x+0.85,1.12,z+0.85,0xd8d0c0,false,{j:0});Bc(c,x+0.3,0.55,z+0.74,x+0.5,0.7,z+0.8,0x1a1a1a,false,{j:0})}   // colmeias
}
function featStalls(c,O,rng){
  const n=Math.max(2,Math.floor((O.x1-O.x0+1)/3.6));
  for(let k=0;k<n;k++){
    const sx=O.x0+0.3+k*3.6,sz=O.z0+0.8,ca=rng.pick([0xc03a3a,0x3a5ac0,0xe0c03a,0x3aa05a,0xe0e0e0]);
    for(const [px,pz] of[[sx,sz],[sx+2.6,sz],[sx,sz+1.8],[sx+2.6,sz+1.8]])Bc(c,px,0,pz,px+0.2,2.5,pz+0.2,0x6b4a2a,false,{j:0});
    Bc(c,sx-0.2,2.5,sz-0.2,sx+3.0,2.75,sz+0.6,ca,false,{j:0.03});Bc(c,sx-0.2,2.7,sz+0.6,sx+3.0,2.95,sz+2.2,shadec(ca,0.85),false,{j:0.03});
    for(let q=0;q<6;q++)Bc(c,sx-0.1+q*0.5,2.35,sz-0.2,sx+0.3+q*0.5,2.5,sz-0.15,q&1?0xf4f0e8:ca,false,{j:0});
    Bc(c,sx,0,sz+0.3,sx+2.8,0.9,sz+1.2,0x8a6a3a,false,{j:0.04});addCol(c.cx+sx,c.y,c.cz+sz+0.3,c.cx+sx+2.8,c.y+0.9,c.cz+sz+1.2);
    for(let q=0;q<5;q++)Bc(c,sx+0.2+q*0.52,0.9,sz+0.45,sx+0.6+q*0.52,1.2,sz+0.95,rng.pick([0xe8454f,0xf2a03d,0x5ab03d,0xe8d84f,0x9a3ad0]),false,{j:0.05});
  }
}
function featWood(c,O,rng){
  const x=O.x0+0.4,z=O.z0+0.4;
  for(let r=0;r<3;r++)for(let q=0;q<4-r;q++)Bc(c,x+q*0.5+r*0.25,r*0.45,z,x+q*0.5+r*0.25+0.45,r*0.45+0.45,z+1.8,shadec(0x6b4a2a,rng.range(0.85,1.15)),false,{j:0.06});
  addCol(c.cx+x,c.y,c.cz+z,c.cx+x+2,c.y+1.3,c.cz+z+1.8);
  const bx=x+2.6,bz=z+0.4;Bc(c,bx,0,bz,bx+0.8,0.6,bz+0.8,0x7a5632,true,{j:0.05});Bc(c,bx+0.35,0.6,bz+0.1,bx+0.45,1.2,bz+0.2,0x5a3d22,false,{j:0});Bc(c,bx+0.2,1.0,bz+0.05,bx+0.65,1.25,bz+0.25,0x9a9aa0,false,{j:0});
}
function featCart(c,O,rng){
  const x=O.x0+0.8,z=O.z0+0.8;
  Bc(c,x,0.5,z,x+2.6,0.7,z+1.5,0x7a5632,false,{j:0.05});
  for(const zz of[z,z+1.4])Bc(c,x,0.7,zz,x+2.6,1.2,zz+0.1,0x6b4a2a,false,{j:0.05});
  for(const xx of[x,x+2.5])Bc(c,xx,0.7,z,xx+0.1,1.2,z+1.5,0x6b4a2a,false,{j:0.05});
  for(const zz of[z-0.1,z+1.5])for(const xx of[x+0.4,x+2.0]){Bc(c,xx-0.05,0.1,zz,xx+0.05,1.0,zz+0.1,0x4a3320,false,{j:0});Bc(c,xx-0.5,0.5,zz,xx+0.5,0.6,zz+0.1,0x4a3320,false,{j:0});Bc(c,xx-0.4,0.15,zz,xx+0.4,0.25,zz+0.1,0x3a2a18,false,{j:0});Bc(c,xx-0.4,0.85,zz,xx+0.4,0.95,zz+0.1,0x3a2a18,false,{j:0})}
  Bc(c,x-1.4,0.4,z+0.55,x,0.5,z+0.65,0x5a3d22,false,{j:0});                  // timão
  for(let i=0;i<3;i++)Bc(c,x+0.2+i*0.05,0.7+i*0.3,z+0.1,x+2.4-i*0.3,1.0+i*0.3,z+1.4,i%2?0xd8b84a:0xc8a83c,false,{j:0.1});   // carga de feno
  addCol(c.cx+x,c.y,c.cz+z,c.cx+x+2.6,c.y+1.6,c.cz+z+1.5);
}
function featLaundry(c,O,rng){
  const x0=O.x0+0.5,x1=O.x1-0.5,z=(O.z0+O.z1)/2+0.5;
  for(const x of[x0,x1])Bc(c,x-0.06,0,z-0.06,x+0.06,2.3,z+0.06,0x5a3d22,false,{j:0});
  Bc(c,x0,2.1,z-0.02,x1,2.15,z+0.02,0xd8d0c0,false,{j:0});
  for(let k=0;k<4;k++){const x=x0+0.6+k*((x1-x0-1.2)/3),h=rng.range(0.7,1.1);Bc(c,x-0.3,2.1-h,z-0.03,x+0.3,2.1,z+0.03,rng.pick([0xf4f0e8,0xc03a3a,0x3a5ac0,0xe8d84f,0x3aa05a]),false,{j:0.03})}
  barrel(c,x0+0.8-0.45,z+0.9);
}
function cityDecor(c,rng,res,houses,Hc,S,P,doors){
  const plan=['pen','farm','picnic','pond','garden','stalls','pen','farm','cart','wood','laundry','picnic','garden','wood','cart','laundry','pen','farm'],dims={pen:[11,9],farm:[9,7],picnic:[7,7],pond:[8,7],garden:[7,6],stalls:[12,5],cart:[6,5],wood:[6,4],laundry:[7,3]};
  const n=Math.max(6,Math.round(Hc/3.2)),list=plan.slice(0,2).concat(rng.shuffle(plan.slice(2))).slice(0,n);
  const feats={pen:featPen,farm:featFarm,picnic:featPicnic,pond:featPond,garden:featGarden,stalls:featStalls,cart:featCart,wood:featWood,laundry:featLaundry};
  for(const k of list){
    const O=cityLotFinder(c,rng,res,houses,Hc,dims[k][0],dims[k][1],260);
    if(!O)continue;
    feats[k](c,O,rng);
    res.push({x0:O.x0-1,x1:O.x1+1,z0:O.z0-1,z1:O.z1+1});houses.push(O);
  }
  // bancos soltos junto às ruas, longe das portas
  const placed=[];let nb=0;
  const tryB=(x,z,face)=>{
    const rc=benchRect(x,z,face);
    if(placed.some(q=>ovr(rc,q,1.2)))return false;
    if((doors||[]).some(d=>Math.hypot(d[0]-x,d[1]-z)<7))return false;
    for(let zz=Math.floor(rc.z0);zz<=Math.floor(rc.z1);zz++)for(let xx=Math.floor(rc.x0);xx<=Math.floor(rc.x1);xx++)if(getT(c.cx+xx,c.cz+zz)!==T_NAT)return false;
    if(Col.near(c.cx+rc.x0-0.5,c.cz+rc.z0-0.5,c.cx+rc.x1+0.5,c.cz+rc.z1+0.5).length)return false;
    bench(c,x,z,face);placed.push(rc);return true;
  };
  const sts=rng.shuffle(c.streets.slice());
  for(const s of sts){
    if(nb>=8)break;
    const horiz=(s.x1-s.x0)>=(s.z1-s.z0);
    const a0=horiz?s.x0:s.z0,a1=horiz?s.x1:s.z1;
    for(let a=a0+3;a<a1-2&&nb<8;a+=rng.int(7,11)){
      const sg=rng.chance(0.5)?1:-1;
      let ok;
      if(horiz)ok=tryB(a+0.5,sg>0?s.z1+1.9:s.z0-0.9,sg>0?'N':'S');else ok=tryB(sg>0?s.x1+1.9:s.x0-0.9,a+0.5,sg>0?'W':'E');
      if(ok)nb++;
    }
  }
}
