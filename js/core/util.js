'use strict';
// ---------- Utilidades gerais ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
class RNG{
  constructor(seed){this.r=mulberry32(seed>>>0)}
  next(){return this.r()}
  range(a,b){return a+(b-a)*this.r()}
  int(a,b){return Math.floor(a+(b-a+1)*this.r())}
  pick(arr){return arr[Math.floor(this.r()*arr.length)]}
  chance(p){return this.r()<p}
  shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(this.r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
}
function hash2(x,z,s){let n=Math.imul(x|0,374761393)+Math.imul(z|0,668265263)+Math.imul((s|0)+1,1274126177);n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967295}
class Noise{
  constructor(seed){this.seed=seed|0}
  h(ix,iz){let n=Math.imul(ix,374761393)+Math.imul(iz,668265263)+Math.imul(this.seed,1442695041);n=Math.imul(n^(n>>>13),1274126177);n^=n>>>16;return(n>>>0)/4294967295}
  v(x,z){const x0=Math.floor(x),z0=Math.floor(z),fx=x-x0,fz=z-z0,u=fx*fx*(3-2*fx),w=fz*fz*(3-2*fz);
    const a=this.h(x0,z0),b=this.h(x0+1,z0),c=this.h(x0,z0+1),d=this.h(x0+1,z0+1);
    return a+(b-a)*u+(c-a)*w+(a-b-c+d)*u*w}
  fbm(x,z,oct){oct=oct||4;let a=1,f=1,s=0,n=0;for(let i=0;i<oct;i++){s+=this.v(x*f+i*17.3,z*f-i*9.1)*a;n+=a;a*=0.5;f*=2}return s/n}
}
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
function hex2rgb(c){return[(c>>16&255)/255,(c>>8&255)/255,(c&255)/255]}
function mixc(a,b,t){const ar=a>>16&255,ag=a>>8&255,ab=a&255,br=b>>16&255,bg=b>>8&255,bb=b&255;
  return(Math.round(ar+(br-ar)*t)<<16)|(Math.round(ag+(bg-ag)*t)<<8)|Math.round(ab+(bb-ab)*t)}
function shadec(c,f){const r=clamp(Math.round((c>>16&255)*f),0,255),g=clamp(Math.round((c>>8&255)*f),0,255),b=clamp(Math.round((c&255)*f),0,255);return(r<<16)|(g<<8)|b}
class Heap{
  constructor(){this.a=[]}
  get size(){return this.a.length}
  push(f,v){const a=this.a;a.push([f,v]);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(a[p][0]<=a[i][0])break;const t=a[p];a[p]=a[i];a[i]=t;i=p}}
  pop(){const a=this.a;const top=a[0];const last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l][0]<a[m][0])m=l;if(r<a.length&&a[r][0]<a[m][0])m=r;if(m===i)break;const t=a[m];a[m]=a[i];a[i]=t;i=m}}return top}
}
const tick=()=>new Promise(r=>setTimeout(r,0));
