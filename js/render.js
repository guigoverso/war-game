'use strict';
// ---------- Renderização em blocos ----------
const scene=new THREE.Scene();
const matCache=new Map();
function mat(c){let m=matCache.get(c);if(!m){m=new THREE.MeshLambertMaterial({color:c});matCache.set(c,m)}return m}
const MAT_TERRAIN=new THREE.MeshLambertMaterial({vertexColors:true});
const GEO_BOX=new THREE.BoxGeometry(1,1,1);
const GEO_TOP=new THREE.BoxGeometry(1,1,1);GEO_TOP.translate(0,-0.5,0);
function part(parent,geo,w,h,d,color,x,y,z){const m=new THREE.Mesh(geo,mat(color));m.scale.set(w,h,d);m.position.set(x,y,z);parent.add(m);return m}

const NRM=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
class BoxBatch{
  constructor(){this.p=[];this.n=[];this.c=[];this.i=[];this.vc=0}
  face(d,x0,y0,z0,x1,y1,z1,r,g,b){
    const p=this.p,n=NRM[d],vi=this.vc;
    switch(d){
      case 0:p.push(x1,y0,z1,x1,y0,z0,x1,y1,z0,x1,y1,z1);break;
      case 1:p.push(x0,y0,z0,x0,y0,z1,x0,y1,z1,x0,y1,z0);break;
      case 2:p.push(x0,y1,z1,x1,y1,z1,x1,y1,z0,x0,y1,z0);break;
      case 3:p.push(x0,y0,z0,x1,y0,z0,x1,y0,z1,x0,y0,z1);break;
      case 4:p.push(x0,y0,z1,x1,y0,z1,x1,y1,z1,x0,y1,z1);break;
      default:p.push(x1,y0,z0,x0,y0,z0,x0,y1,z0,x1,y1,z0);
    }
    for(let k=0;k<4;k++){this.n.push(n[0],n[1],n[2]);this.c.push(r,g,b)}
    this.i.push(vi,vi+1,vi+2,vi,vi+2,vi+3);this.vc+=4;
  }
  box(x0,y0,z0,x1,y1,z1,color,o){
    const rgb=hex2rgb(color),j=(o&&o.j!==undefined)?o.j:0.07;
    for(let d=0;d<6;d++){
      if(d===3&&!(o&&o.b))continue;
      const f=1+(Math.random()-0.5)*j*2;
      this.face(d,x0,y0,z0,x1,y1,z1,rgb[0]*f,rgb[1]*f,rgb[2]*f);
    }
  }
  toMesh(material){
    if(!this.vc)return null;
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(this.p),3));
    g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(this.n),3));
    g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(this.c),3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(this.i),1));
    g.computeBoundingSphere();
    const m=new THREE.Mesh(g,material||MAT_TERRAIN);
    this.p=this.n=this.c=this.i=null;
    return m;
  }
}

function makeSign(text,w,h,bg,fg,x,y,z,dir){
  const cv=document.createElement('canvas');cv.width=256;cv.height=Math.max(32,Math.round(256*h/w));
  const g=cv.getContext('2d');
  g.fillStyle='#'+bg.toString(16).padStart(6,'0');g.fillRect(0,0,cv.width,cv.height);
  g.strokeStyle='rgba(0,0,0,.5)';g.lineWidth=6;g.strokeRect(0,0,cv.width,cv.height);
  g.fillStyle='#'+fg.toString(16).padStart(6,'0');g.font='bold '+Math.round(cv.height*0.55)+'px monospace';
  g.textAlign='center';g.textBaseline='middle';g.fillText(text,cv.width/2,cv.height/2+2);
  const tex=new THREE.CanvasTexture(cv);tex.magFilter=THREE.NearestFilter;
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex}));
  m.position.set(x,y,z);
  m.rotation.y={S:0,N:Math.PI,E:Math.PI/2,W:-Math.PI/2}[dir];
  scene.add(m);return m;
}
