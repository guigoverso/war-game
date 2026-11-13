'use strict';
// ---------- Som ambiente e passos ----------
// Substitui a música calma: vento, folhas, água, pássaros, grilos, vozes na cidade, sino, martelo, bichos de fazenda, fogueira, goteiras
// e passos que mudam conforme o chão. Tudo muda com bioma, hora do dia, lugar (cidade, caverna, dentro de casa) e com o combate.
const AMB={on:false,clock:0,envT:0,env:{wind:0,leaves:0,water:0,crick:0,rumble:0,indoor:0,biome:0,city:null,cave:false,camp:null,dayF:1,hour:12,nearCr:null},stepD:0,hush:0,next:{},lastHour:-1,wasAir:false,lastVy:0,bellQ:0,gustAt:3,gustEnd:0,leafAt:0,leafEnd:0};
// Mixer: um volume (0..200%) por tipo de som, salvo no navegador. 'steps' vai direto ao master; os demais passam pelo ambiente.
const SND=[
  ['wind','Vento'],['leaves','Folhas balançando'],['water','Ondas batendo (mar, rio, lago)'],['crick','Grilos'],['cave','Rumor de caverna'],['drip','Goteiras de caverna'],
  ['bird','Pássaros (piados, trinados, cuco, corvo)'],['eagle','Águias'],['gull','Gaivotas'],['owl','Coruja'],['wolf','Uivo de lobo'],
  ['voice','Conversas na cidade'],['hammer','Martelo do armeiro'],['bell','Sino da capela'],['cow','Vacas'],['sheep','Ovelhas'],['fire','Fogueira'],['steps','Passos']
];
const SNDKEY='fc_sndvol';
function loadSndVol(){const v={};for(const [k] of SND)v[k]=1;try{const s=JSON.parse(localStorage.getItem(SNDKEY)||'{}');for(const [k] of SND)if(typeof s[k]==='number'&&isFinite(s[k]))v[k]=Math.max(0,Math.min(2,s[k]))}catch(_){}return v}
AMB.vol=loadSndVol();AMB.bus={};
function saveSndVol(){try{localStorage.setItem(SNDKEY,JSON.stringify(AMB.vol))}catch(_){}}
function setSndVol(k,v){AMB.vol[k]=v;if(AMB.bus[k]&&AC)AMB.bus[k].gain.setTargetAtTime(v,AC.currentTime,0.05);saveSndVol()}
function sbus(k){return AMB.bus[k]||AMB.out}
const CHIRPCAT={tweet:'bird',trill:'bird',warble:'bird',cuckoo:'bird',crow:'bird',eagle:'eagle',gull:'gull',owl:'owl',wolf:'wolf',moo:'cow',baa:'sheep'};
const VOWELS=[[730,1090],[530,1840],[270,2290],[570,840],[300,870],[660,1720]];

function initAmbient(){
  if(!AC||AMB.on||!MUS.calm)return;AMB.on=true;
  AMB.lp=AC.createBiquadFilter();AMB.lp.type='lowpass';AMB.lp.frequency.value=18000;AMB.lp.connect(MUS.calm);
  AMB.out=AC.createGain();AMB.out.gain.value=1;AMB.out.connect(AMB.lp);
  for(const [k] of SND){const g=AC.createGain();g.gain.value=AMB.vol[k];g.connect(k==='steps'?master:AMB.out);AMB.bus[k]=g}
  const noise=()=>{const s=AC.createBufferSource();s.buffer=getNoiseBuf();s.loop=true;s.loopStart=Math.random();return s};
  const lfo=(f,depth,target)=>{const o=AC.createOscillator();o.frequency.value=f;const g=AC.createGain();g.gain.value=depth;o.connect(g);g.connect(target);o.start();return o};
  // vento
  AMB.windF=AC.createBiquadFilter();AMB.windF.type='bandpass';AMB.windF.frequency.value=420;AMB.windF.Q.value=0.7;
  AMB.windG=AC.createGain();AMB.windG.gain.value=0;
  const w=noise();w.connect(AMB.windF);AMB.windF.connect(AMB.windG);AMB.gustG=AC.createGain();AMB.gustG.gain.value=0.05;AMB.windG.connect(AMB.gustG);AMB.gustG.connect(AMB.bus.wind);w.start();
  lfo(0.09,0.18,AMB.windG.gain);lfo(0.31,0.1,AMB.windG.gain);lfo(0.07,120,AMB.windF.frequency);
  // folhas balançando: ruído agudo que pulsa com as rajadas
  const lh=AC.createBiquadFilter();lh.type='highpass';lh.frequency.value=700;
  const lb=AC.createBiquadFilter();lb.type='lowpass';lb.frequency.value=2400;lb.Q.value=0.3;
  AMB.leafG=AC.createGain();AMB.leafG.gain.value=0;
  const l=noise();l.connect(lh);lh.connect(lb);lb.connect(AMB.leafG);AMB.leafGate=AC.createGain();AMB.leafGate.gain.value=0;AMB.leafG.connect(AMB.leafGate);AMB.leafGate.connect(AMB.bus.leaves);l.start();
  lfo(0.23,0.35,AMB.leafG.gain);lfo(0.61,0.2,AMB.leafG.gain);
  // água batendo na margem
  const wl=AC.createBiquadFilter();wl.type='lowpass';wl.frequency.value=650;
  AMB.waterG=AC.createGain();AMB.waterG.gain.value=0;
  const wn=noise();wn.connect(wl);wl.connect(AMB.waterG);AMB.waterG.connect(AMB.bus.water);wn.start();
  lfo(0.17,0.4,AMB.waterG.gain);lfo(0.43,0.2,AMB.waterG.gain);
  // grilos: tom agudo em rajadas
  const co=AC.createOscillator();co.type='sine';co.frequency.value=4300;
  AMB.crickG=AC.createGain();AMB.crickG.gain.value=0;
  const cm=AC.createGain();cm.gain.value=0;co.connect(cm);cm.connect(AMB.crickG);AMB.crickG.connect(AMB.bus.crick);co.start();
  lfo(21,0.5,cm.gain);const cs=AC.createOscillator();cs.type='square';cs.frequency.value=2.3;const cg=AC.createGain();cg.gain.value=0.25;cs.connect(cg);cg.connect(cm.gain);cs.start();
  const cm2=AC.createOscillator();cm2.type='sine';cm2.frequency.value=3900;const cm2g=AC.createGain();cm2g.gain.value=0;cm2.connect(cm2g);cm2g.connect(AMB.crickG);cm2.start();
  lfo(17,0.4,cm2g.gain);
  // rumor grave de caverna
  const rl=AC.createBiquadFilter();rl.type='lowpass';rl.frequency.value=130;
  AMB.rumG=AC.createGain();AMB.rumG.gain.value=0;
  const rn=noise();rn.connect(rl);rl.connect(AMB.rumG);AMB.rumG.connect(AMB.bus.cave);rn.start();
}

// destino com pan estéreo (para sons com posição)
function ambPan(pan,cat){
  const o=sbus(cat);
  if(!AC.createStereoPanner)return o;
  const p=AC.createStereoPanner();p.pan.value=clamp(pan,-1,1);p.connect(o);return p;
}
function panTo(x,z){   // -1 (esquerda) .. 1 (direita) em relação ao olhar do jogador
  const dx=x-P.x,dz=z-P.z,d=Math.hypot(dx,dz)||1,rx=Math.cos(P.yaw),rz=-Math.sin(P.yaw);
  return clamp((dx*rx+dz*rz)/d,-1,1)*Math.min(1,d/6);
}
// ---------- vozes dos bichos e das pessoas ----------
function chirp(kind,vol,pan){
  const d=ambPan(pan,CHIRPCAT[kind]);
  if(kind==='tweet'){const b=2300+Math.random()*1500,n=2+Math.floor(Math.random()*3);for(let k=0;k<n;k++)setTimeout(()=>AC&&tn(b+k*180*(Math.random()<0.5?1:-1),0.07,'sine',0.07*vol,b+450,d),k*105)}
  else if(kind==='trill'){const b=3000+Math.random()*900,n=8+Math.floor(Math.random()*6);for(let k=0;k<n;k++)setTimeout(()=>AC&&tn(b+(k%2?220:-120),0.035,'sine',0.05*vol,0,d),k*55)}
  else if(kind==='warble'){const n=5+Math.floor(Math.random()*3);for(let k=0;k<n;k++){const f=2400+Math.random()*2000;setTimeout(()=>AC&&tn(f,0.09,'sine',0.06*vol,f*(0.8+Math.random()*0.5),d),k*115)}}
  else if(kind==='cuckoo'){tn(720,0.28,'sine',0.1*vol,640,d);setTimeout(()=>AC&&tn(560,0.34,'sine',0.1*vol,520,d),360)}
  else if(kind==='crow'){const n=1+Math.floor(Math.random()*3);for(let k=0;k<n;k++)setTimeout(()=>{if(!AC)return;const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter(),t=AC.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(430,t);o.frequency.exponentialRampToValueAtTime(290,t+0.3);f.type='bandpass';f.frequency.value=900;f.Q.value=1.2;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.1*vol,t+0.03);g.gain.exponentialRampToValueAtTime(0.001,t+0.34);o.connect(f);f.connect(g);g.connect(d);o.start(t);o.stop(t+0.36)},k*430)}
  else if(kind==='gull'){for(let k=0;k<2;k++)setTimeout(()=>AC&&tn(1500,0.45,'triangle',0.08*vol,950,d),k*520)}
  else if(kind==='owl'){tn(360,0.5,'sine',0.11*vol,330,d);setTimeout(()=>AC&&tn(330,0.7,'sine',0.11*vol,300,d),700)}
  else if(kind==='eagle'){tn(2700,0.9,'sawtooth',0.04*vol,1700,d)}
  else if(kind==='wolf'){const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter(),vb=AC.createOscillator(),vg=AC.createGain(),t=AC.currentTime;
    o.type='sine';o.frequency.setValueAtTime(330,t);o.frequency.linearRampToValueAtTime(560,t+1.2);o.frequency.linearRampToValueAtTime(430,t+3.6);
    vb.frequency.value=5;vg.gain.value=9;vb.connect(vg);vg.connect(o.frequency);f.type='lowpass';f.frequency.value=1300;
    g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.1*vol,t+0.8);g.gain.linearRampToValueAtTime(0.08*vol,t+2.8);g.gain.exponentialRampToValueAtTime(0.001,t+3.8);
    o.connect(f);f.connect(g);g.connect(d);o.start(t);vb.start(t);o.stop(t+3.9);vb.stop(t+3.9)}
  else if(kind==='moo'){const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter(),t=AC.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(125,t);o.frequency.linearRampToValueAtTime(100,t+1.1);
    f.type='bandpass';f.frequency.value=480;f.Q.value=2.2;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.2*vol,t+0.15);g.gain.linearRampToValueAtTime(0.14*vol,t+0.8);g.gain.exponentialRampToValueAtTime(0.001,t+1.3);
    o.connect(f);f.connect(g);g.connect(d);o.start(t);o.stop(t+1.4)}
  else if(kind==='baa'){const o=AC.createOscillator(),g=AC.createGain(),f=AC.createBiquadFilter(),vb=AC.createOscillator(),vg=AC.createGain(),t=AC.currentTime;o.type='sawtooth';o.frequency.value=340;vb.frequency.value=28;vg.gain.value=22;vb.connect(vg);vg.connect(o.frequency);
    f.type='bandpass';f.frequency.value=1000;f.Q.value=3;g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.14*vol,t+0.08);g.gain.exponentialRampToValueAtTime(0.001,t+0.75);
    o.connect(f);f.connect(g);g.connect(d);o.start(t);vb.start(t);o.stop(t+0.8);vb.stop(t+0.8)}
}
function voice(vol,pan){   // conversa abafada: sílabas com formantes de vogais
  const d=ambPan(pan,'voice'),syl=2+Math.floor(Math.random()*5),f0=(Math.random()<0.5?105:205)*(0.9+Math.random()*0.3);let t=AC.currentTime;
  for(let s=0;s<syl;s++){
    const dur=0.09+Math.random()*0.13,v=VOWELS[Math.floor(Math.random()*VOWELS.length)];
    const o=AC.createOscillator(),env=AC.createGain();o.type='sawtooth';o.frequency.setValueAtTime(f0*(1+0.06*Math.sin(s*1.7)),t);o.frequency.linearRampToValueAtTime(f0*(0.93+Math.random()*0.14),t+dur);
    for(const [i,fq] of v.entries()){const b=AC.createBiquadFilter();b.type='bandpass';b.frequency.value=fq;b.Q.value=7+i*3;const bg=AC.createGain();bg.gain.value=i?0.5:1;o.connect(b);b.connect(bg);bg.connect(env)}
    env.gain.setValueAtTime(0.0001,t);env.gain.linearRampToValueAtTime(0.05*vol,t+0.025);env.gain.exponentialRampToValueAtTime(0.001,t+dur);
    env.connect(d);o.start(t);o.stop(t+dur+0.02);t+=dur+0.035+Math.random()*0.06;
  }
}
function hammer(vol,pan){const d=ambPan(pan,'hammer');for(let k=0;k<3;k++)setTimeout(()=>{if(!AC)return;nzs(0.04,0.08*vol,3500,d,'bandpass');tn(1750+Math.random()*250,0.18,'triangle',0.05*vol,1500,d)},k*(260+Math.random()*60))}
function bell(vol,pan){const d=ambPan(pan,'bell');for(const [f,m] of[[392,1],[784,0.5],[1176,0.25],[1568,0.12]])tn(f,2.6,'triangle',0.06*vol*m,f*0.998,d)}
// onda batendo: ruído grave que cresce, quebra e se desfaz em espuma suave
function wave(vol,pan){
  const d=ambPan(pan,'water'),t=AC.currentTime,len=5.4;
  const src=AC.createBufferSource();src.buffer=getNoiseBuf();src.loop=true;src.loopStart=Math.random();
  const f=AC.createBiquadFilter();f.type='lowpass';f.Q.value=0.5;f.frequency.setValueAtTime(260,t);f.frequency.linearRampToValueAtTime(900,t+1.9);f.frequency.linearRampToValueAtTime(320,t+len);
  const g=AC.createGain();g.gain.setValueAtTime(0.0001,t);g.gain.linearRampToValueAtTime(0.5*vol,t+1.8);g.gain.exponentialRampToValueAtTime(0.001,t+len);
  src.connect(f);f.connect(g);g.connect(d);src.start(t);src.stop(t+len+0.1);
  const s2=AC.createBufferSource();s2.buffer=getNoiseBuf();s2.loop=true;s2.loopStart=Math.random();
  const h=AC.createBiquadFilter();h.type='bandpass';h.frequency.value=1600;h.Q.value=0.4;
  const l2=AC.createBiquadFilter();l2.type='lowpass';l2.frequency.value=3000;
  const g2=AC.createGain();g2.gain.setValueAtTime(0.0001,t+1.2);g2.gain.linearRampToValueAtTime(0.09*vol,t+2.3);g2.gain.exponentialRampToValueAtTime(0.001,t+len);
  s2.connect(h);h.connect(l2);l2.connect(g2);g2.connect(d);s2.start(t);s2.stop(t+len+0.1);
}
function drip(vol){const d=sbus('drip');tn(1700+Math.random()*500,0.08,'sine',0.07*vol,900,d);setTimeout(()=>AC&&tn(900,0.2,'sine',0.02*vol,700,d),90)}

// ---------- passos ----------
function stepSurface(px,pz,py){
  if(px===undefined){px=P.x;pz=P.z;py=P.y}
  const x=Math.floor(px),z=Math.floor(pz);if(x<0||z<0||x>=W||z>=W)return'grass';
  const i=z*W+x,t=T[i],b=B[i],h=H[i];
  if(py<UNDER_Y)return G.office?'wood':'stone';   // dungeon ou escritório
  if(py<SEA-0.3&&tH(px,pz)<SEA)return'splash';
  if(t===T_FLOOR||t===T_BRIDGE)return'wood';
  if(t===T_STREET||t===T_PLAZA||t===T_CAVE)return'stone';
  if(t===T_ROAD||t===T_SOIL)return'dirt';
  if(t===T_WHEAT||t===T_GARDEN)return'grass';
  if(h<=SEA+1&&b!==BIO_SNOW)return'sand';
  if(b===BIO_DESERT)return'sand';if(b===BIO_SNOW)return'snow';if(b===BIO_ROCK)return'rock';
  return'grass';
}
function footstep(kind,vol,pan){
  const r=0.85+Math.random()*0.3,D=pan===undefined?sbus('steps'):ambPan(pan,'steps');
  switch(kind){
    case'grass':nzs(0.1,0.2*vol,1800*r,D,'bandpass');tn(130*r,0.07,'sine',0.14*vol,70,D);break;
    case'dirt':nzs(0.08,0.22*vol,1100*r,D);tn(110*r,0.07,'sine',0.14*vol,60,D);break;
    case'stone':nzs(0.06,0.3*vol,900*r,D,'bandpass');tn(150*r,0.07,'sine',0.16*vol,90,D);break;
    case'wood':tn(170*r,0.1,'triangle',0.26*vol,90,D);nzs(0.06,0.16*vol,800*r,D,'bandpass');break;
    case'sand':nzs(0.15,0.2*vol,850*r,D,'bandpass');tn(95*r,0.07,'sine',0.1*vol,60,D);break;
    case'snow':nzs(0.07,0.2*vol,1300*r,D,'bandpass');setTimeout(()=>AC&&nzs(0.08,0.16*vol,1000*r,D,'bandpass'),50);break;
    case'rock':nzs(0.05,0.24*vol,2300*r,D,'bandpass');tn(300*r,0.05,'triangle',0.1*vol,200,D);break;
    case'splash':nzs(0.22,0.3*vol,900*r,D);nzs(0.1,0.12*vol,3500,D,'highpass');break;
  }
}

// ---------- ambiente ----------
function ambSample(){
  const e=AMB.env,x=Math.floor(P.x),z=Math.floor(P.z);
  if(x<2||z<2||x>=W-2||z>=W-2)return;
  const i=z*W+x,t=T[i],b=B[i];
  e.biome=b;e.dayF=DN.dayF;e.hour=DN.t*24;
  e.cave=t===T_CAVE;e.indoor=t===T_FLOOR?1:0;
  const cc=G.curCity;e.city=(cc&&!cc.kind)?cc:null;
  // água por perto (mar, rio ou lago)
  let wd=99;
  for(const r of[2,4,7,11])for(let k=0;k<8;k++){const a=k*0.785,xx=Math.floor(P.x+Math.cos(a)*r),zz=Math.floor(P.z+Math.sin(a)*r);if(xx>=0&&zz>=0&&xx<W&&zz<W&&H[zz*W+xx]<SEA){wd=Math.min(wd,r);break}}
  if(tH(P.x,P.z)<SEA&&P.y>UNDER_Y)wd=0;
  if(P.y<UNDER_Y){wd=99;e.cave=!G.office;e.indoor=G.office?1:0}   // mundo de baixo: caverna (dungeon) ou ambiente fechado (escritório), sem água por perto
  e.water=clamp(1-wd/12,0,1);
  const alt=Math.max(0,(P.y-SEA)/60);
  const wb={[BIO_PLAINS]:0.35,[BIO_FOREST]:0.18,[BIO_DESERT]:0.6,[BIO_SNOW]:0.7,[BIO_ROCK]:0.75}[b]||0.3;
  e.wind=(wb+Math.min(0.3,alt))*(e.city?0.6:1)*(e.indoor?0.12:1)*(e.cave?0.05:1);
  e.windFq={[BIO_SNOW]:650,[BIO_ROCK]:540,[BIO_DESERT]:430}[b]||380;
  const leaf={[BIO_FOREST]:0.9,[BIO_PLAINS]:0.35,[BIO_SNOW]:0.12}[b]||0;
  e.leaves=Math.min(1,leaf+(e.city?0.25:0))*(e.indoor?0.1:1)*(e.cave?0:1);
  const night=1-smooth(0.2,0.45,DN.dayF);
  const cr={[BIO_FOREST]:1,[BIO_PLAINS]:1,[BIO_DESERT]:0.35}[b]||0;
  e.crick=night*(e.city?Math.max(cr,0.5)*0.5:cr)*(e.indoor?0.15:1)*(e.cave?0:1)*(e.water>0.6?0.5:1);
  e.rumble=e.cave?1:0;
  // camp próximo
  e.camp=null;for(const c of WORLD.camps){if(c.gone)continue;if(Math.hypot(c.cx-P.x,c.cz-P.z)<22){e.camp=c;break}}
  // bicho de fazenda mais próximo
  let bd=30,nc=null;for(const a of CRITTERS){const d=Math.hypot(a.x-P.x,a.z-P.z);if(d<bd){bd=d;nc=a}}
  e.nearCr=nc;e.nearCrD=bd;
}
function updateAmbient(dt){
  if(!AMB.on||!AC||P.dead||G.frozen)return;
  AMB.clock+=dt;AMB.envT-=dt;
  if(AMB.envT<=0){AMB.envT=0.3;ambSample()}
  const e=AMB.env,t=AC.currentTime,calm=AMB.clock>AMB.hush,nx0=AMB.next;
  // vento em rajadas com silêncio entre elas (intervalo menor perto do mar)
  if(AMB.clock>AMB.gustAt){const sea=e.water>0.45,dur=3+Math.random()*4;AMB.gustEnd=AMB.clock+dur;AMB.gustAt=AMB.clock+dur+(sea?3+Math.random()*5:12+Math.random()*20)}
  const gust=AMB.clock<AMB.gustEnd?1:0;
  AMB.windG.gain.setTargetAtTime(0.4*e.wind,t,0.8);AMB.windF.frequency.setTargetAtTime(e.windFq,t,1.5);
  AMB.gustG.gain.setTargetAtTime(gust?1:0.04,t,gust?1.3:2.2);
  // folhas: farfalhar suave e baixo, em ondas curtas com silêncio entre elas
  if(!(AMB.leafAt>0))AMB.leafAt=AMB.clock+2;
  if(AMB.clock>AMB.leafAt){const dur=3+Math.random()*3;AMB.leafEnd=AMB.clock+dur;AMB.leafAt=AMB.clock+dur+5+Math.random()*10}
  const rustle=AMB.clock<AMB.leafEnd;
  AMB.leafG.gain.setTargetAtTime(0,t,0.3);   // farfalhar removido a pedido
  AMB.leafGate.gain.setTargetAtTime(0,t,0.3);
  AMB.waterG.gain.setTargetAtTime(0,t,0.6);
  // ondas batendo de tempos em tempos (mais seguidas perto do mar aberto)
  if(false&&e.water>0.08&&!e.cave){   // ondas removidas a pedido
    if(!(nx0.wave>0))nx0.wave=AMB.clock+1.5;
    if(AMB.clock>nx0.wave){wave((0.25+0.75*e.water)*(e.indoor?0.2:1),Math.random()*1.2-0.6);nx0.wave=AMB.clock+(e.water>0.6?6:9)+Math.random()*8}
  }else nx0.wave=0;
  AMB.crickG.gain.setTargetAtTime(calm?0.045*e.crick:0,t,1.0);
  AMB.rumG.gain.setTargetAtTime(0.5*e.rumble,t,1.0);
  AMB.lp.frequency.setTargetAtTime(e.indoor?1100:e.cave?2500:18000,t,0.3);       // dentro de casa ou caverna o som fica abafado
  AMB.out.gain.setTargetAtTime(e.indoor?0.55:1,t,0.3);
  // eventos sonoros esporádicos
  const nx=AMB.next,fire=(k,delay)=>{nx[k]=AMB.clock+delay};
  const day=e.dayF>0.5,dawn=e.hour>4.5&&e.hour<8.5;
  if(calm&&!e.indoor&&!e.cave){
    // pássaros: só de dia, em lugares com árvores/campo; no deserto e nas montanhas, aves grandes e raras
    if(!(nx.bird>0))fire('bird',2+Math.random()*4);
    if(AMB.clock>nx.bird){
      const b=e.biome,pan=Math.random()*2-1,rate=(dawn?0.55:1);
      if(day){
        if(b===BIO_FOREST){chirp(['tweet','trill','warble','cuckoo','tweet','warble'][Math.floor(Math.random()*6)],1,pan);fire('bird',(1.5+Math.random()*4)*rate)}
        else if(b===BIO_PLAINS){chirp(['tweet','warble','trill','crow'][Math.floor(Math.random()*4)],0.9,pan);fire('bird',(3+Math.random()*7)*rate)}
        else if(b===BIO_DESERT){if(Math.random()<0.5)chirp('eagle',0.6,pan);fire('bird',14+Math.random()*20)}
        else if(b===BIO_ROCK){if(Math.random()<0.6)chirp('eagle',0.9,pan);fire('bird',12+Math.random()*18)}
        else if(b===BIO_SNOW){if(Math.random()<0.4)chirp('crow',0.6,pan);fire('bird',15+Math.random()*25)}
        else fire('bird',8);
        if(e.city&&Math.random()<0.4)chirp(Math.random()<0.5?'tweet':'warble',0.7,pan);
      }else{
        if(b===BIO_FOREST&&Math.random()<0.6)chirp('owl',0.9,pan);
        fire('bird',10+Math.random()*16);
      }
    }
    // gaivota perto do mar, de dia
    if(day&&e.water>0.45){if(!(nx.gull>0))fire('gull',6);if(AMB.clock>nx.gull){chirp('gull',0.9,Math.random()*2-1);fire('gull',8+Math.random()*14)}}
    // uivo de lobo ao longe, à noite, fora das cidades, em floresta ou neve
    if(!day&&!e.city&&(e.biome===BIO_FOREST||e.biome===BIO_SNOW||e.biome===BIO_ROCK)){
      if(!(nx.wolf>0))fire('wolf',30+Math.random()*40);
      if(AMB.clock>nx.wolf){chirp('wolf',0.5,Math.random()*2-1);fire('wolf',60+Math.random()*80)}
    }
  }
  if(e.cave){if(!(nx.drip>0))fire('drip',1);if(AMB.clock>nx.drip){drip(0.8);fire('drip',1.2+Math.random()*3.5)}}
  // cidade: conversas conforme a quantidade de gente por perto, martelo do armeiro, sino da capela
  const c=e.city;
  if(c&&!e.cave){
    let near=0,pick=null,pd=1e9;
    for(const n of NPCS){if(!n.alive||!n.group.visible)continue;const d=Math.hypot(n.x-P.x,n.z-P.z);if(d<28){near++;if(d<pd&&d>2){pd=d;pick=n}}}
    if(!(nx.voice>0))fire('voice',2);
    if(calm&&AMB.clock>nx.voice){
      if(pick&&day){voice(clamp(1-pd/30,0.15,1)*(e.indoor?0.5:1),panTo(pick.x,pick.z))}
      fire('voice',Math.max(1.2,(9-near*1.1))*(0.6+Math.random()*0.9));
    }
    if(c.shop&&day&&!e.indoor){const d=Math.hypot(c.shop.x-P.x,c.shop.z-P.z);
      if(d<45){if(!(nx.hammer>0))fire('hammer',3);if(AMB.clock>nx.hammer){hammer(clamp(1-d/45,0.15,1),panTo(c.shop.x,c.shop.z));fire('hammer',5+Math.random()*9)}}}
    if(c.chapel){const hh=Math.floor(e.hour);
      if(AMB.lastHour<0)AMB.lastHour=hh;
      if(hh!==AMB.lastHour){AMB.lastHour=hh;if((hh===8||hh===12||hh===18)&&Math.hypot(c.chapel.x-P.x,c.chapel.z-P.z)<80){AMB.bellQ=hh===12?3:2;AMB.bellT=0}}   // o sino toca de manhã, ao meio-dia e ao entardecer
    }
  }
  if(AMB.bellQ>0){AMB.bellT-=dt;if(AMB.bellT<=0){const cc=e.city||G.curCity,d=cc&&cc.chapel?Math.hypot(cc.chapel.x-P.x,cc.chapel.z-P.z):40;bell(clamp(1-d/90,0.2,1),cc&&cc.chapel?panTo(cc.chapel.x,cc.chapel.z):0);AMB.bellQ--;AMB.bellT=2.2}}
  // bichos de fazenda
  if(e.nearCr&&calm&&!e.indoor){
    if(!(nx.farm>0))fire('farm',3+Math.random()*6);
    if(AMB.clock>nx.farm){const a=e.nearCr;chirp(a.kind==='cow'?'moo':'baa',clamp(1-e.nearCrD/30,0.2,1),panTo(a.x,a.z));fire('farm',7+Math.random()*14)}
  }
  // fogueira estalando
  if(e.camp){
    if(!(nx.fire>0))fire('fire',0.2);
    if(AMB.clock>nx.fire){const v=clamp(1-Math.hypot(e.camp.cx-P.x,e.camp.cz-P.z)/22,0.15,1);nzs(0.02+Math.random()*0.04,0.18*v,3500+Math.random()*2500,sbus('fire'),'highpass');if(Math.random()<0.3)nzs(0.12,0.1*v,350,sbus('fire'));fire('fire',0.08+Math.random()*0.5)}
  }
  // passos dos inimigos por perto
  for(const en of ENEMIES){
    if(!en.alive||!en.group.visible){en._sx=undefined;continue}
    const dx=en.x-P.x,dz=en.z-P.z;
    if(Math.abs(dx)>34||Math.abs(dz)>34){en._sx=undefined;continue}
    if(en._sx===undefined){en._sx=en.x;en._sz=en.z;en._sd=0;continue}
    const mv=Math.hypot(en.x-en._sx,en.z-en._sz);en._sx=en.x;en._sz=en.z;
    if(mv>1||!en.ground){continue}
    en._sd+=mv;
    if(en._sd>=2.3){en._sd=0;const d=Math.hypot(dx,dz);
      footstep(stepSurface(en.x,en.z,en.y),clamp(1-d/34,0.1,1)*0.7*((en.def&&en.def.r>0.5)?1.3:1),panTo(en.x,en.z))}
  }
  // passos
  if(!G.noclip){
    const air=!P.ground;
    if(AMB.wasAir&&!air&&AMB.lastVy<-2){footstep(stepSurface(),clamp(-AMB.lastVy/8,0.6,1.5));AMB.stepD=0}   // pouso: toca o som de passo do chão
    else if(AMB.wasAir&&!air){footstep(stepSurface(),0.6);AMB.stepD=0}
    if(!AMB.wasAir&&air&&P.vy>2){footstep(stepSurface(),0.55)}   // impulso do pulo
    AMB.wasAir=air;AMB.lastVy=P.vy;
    if(P.ground&&P.speed>0.8){
      AMB.stepD+=P.speed*dt;
      if(AMB.stepD>=2.5){AMB.stepD=0;footstep(stepSurface(),P.crouch?0.45:P.speed>6.5?1.2:0.85)}
    }else if(P.speed<=0.8)AMB.stepD=Math.min(AMB.stepD,1.6);
  }
}
