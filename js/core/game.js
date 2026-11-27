'use strict';
// ---------- Jogo: jogador, entrada, HUD, loop ----------
const $=id=>document.getElementById(id);
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
renderer.setSize(innerWidth,innerHeight,false);
const camera=new THREE.PerspectiveCamera(75,innerWidth/innerHeight,0.15,330);
camera.rotation.order='YXZ';scene.add(camera);
const SKY=0x8fc4f2;
scene.background=new THREE.Color(SKY);scene.fog=new THREE.Fog(SKY,75,200);
const hemi=new THREE.HemisphereLight(0xcfe6ff,0x7a8a5a,0.58);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xfff3d8,0.58);sun.position.set(0.5,1,0.35);scene.add(sun);
window.addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix()});

const P={x:0,y:0,z:0,vx:0,vz:0,vy:0,ground:true,yaw:0,pitch:0,hp:100,maxhp:100,crouch:false,eye:1.62,camY:0,speed:0,dead:false,coins:100,armor:0,r:0.35,lift:0};
const G={running:false,panel:'start',creative:false,god:false,invis:false,infAmmo:false,noReload:false,frozen:false,aiming:false,fireHeld:false,firePressed:false,bob:0,keys:{},won:false,locked:false,target:null,attackCity:null,t:0,curCity:null,hurtT:0};

// ---------- Áudio ----------
let AC=null,master=null,noiseBuf=null;
function initAudio(){if(AC)return;try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();const qs=new URLSearchParams(location.search);G.muted=!!(qs.get('mute')||qs.get('auto'));master.gain.value=G.muted?0:0.35;master.connect(AC.destination)}catch(e){AC=null}}
function nzs(dur,vol,freq,dest,ftype){if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const s=AC.createBufferSource();s.buffer=noiseBuf;const f=AC.createBiquadFilter();f.type=ftype||'lowpass';f.frequency.value=freq;const g=AC.createGain();const t=AC.currentTime;
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);s.connect(f);f.connect(g);g.connect(dest||master);s.start(t);s.stop(t+dur)}
function tn(freq,dur,type,vol,to,dest){const o=AC.createOscillator(),g=AC.createGain(),t=AC.currentTime;o.type=type;o.frequency.setValueAtTime(freq,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(0.001,t+dur);o.connect(g);g.connect(dest||master);o.start(t);o.stop(t+dur)}
function sfx(name,dist,x,z){   // x,z (opcionais): onde o som nasce; o som sai mais para o lado em que está (estéreo)
  if(!AC||AC.state==='suspended'&&AC.resume())return;
  const v=Math.pow(clamp(1-(dist||0)/90,0,1),2);if(v<0.03)return;
  let D=master;if(x!==undefined&&AC.createStereoPanner){D=AC.createStereoPanner();D.pan.value=panTo(x,z);D.connect(master)}   // queda rápida com a distância: longe quase não se ouve
  if(v>0.35&&typeof AMB!=='undefined'&&/^(pistol|smg|rifle|shotgun|sniper|launcher|boom)$/.test(name))AMB.hush=AMB.clock+14;   // tiros calam pássaros, grilos e conversas
  switch(name){
    case'pistol':nzs(0.12,0.7*v,3500,D);tn(190,0.08,'square',0.2*v,60,D);break;
    case'smg':nzs(0.07,0.5*v,4500,D);tn(150,0.05,'square',0.12*v,70,D);break;
    case'rifle':nzs(0.1,0.7*v,2800,D);tn(120,0.1,'sawtooth',0.2*v,50,D);break;
    case'shotgun':nzs(0.3,1*v,1800,D);tn(90,0.2,'square',0.3*v,40,D);break;
    case'sniper':nzs(0.45,1*v,1400,D);tn(70,0.35,'sawtooth',0.4*v,30,D);break;
    case'launcher':nzs(0.35,0.8*v,900,D);tn(110,0.3,'sawtooth',0.3*v,40,D);break;
    case'boom':nzs(1.0,1*v,700,D);tn(60,0.8,'sine',0.7*v,22,D);break;
    case'kill':tn(660,0.08,'square',0.12,0);setTimeout(()=>AC&&tn(990,0.1,'square',0.12),70);break;
    case'hit':tn(1300,0.04,'square',0.1);break;
    case'coin':tn(1200,0.07,'square',0.15);setTimeout(()=>AC&&tn(1700,0.12,'square',0.15),70);break;
    case'reload':nzs(0.05,0.3,6000);setTimeout(()=>AC&&nzs(0.05,0.3,5000),180);break;
    case'empty':tn(220,0.05,'square',0.1);break;
    case'alarm':tn(520,0.35,'sawtooth',0.2,330);setTimeout(()=>AC&&tn(520,0.35,'sawtooth',0.2,330),400);break;
    case'beep':tn(1500,0.06,'square',0.15);break;
    case'beep1':tn(1100,0.14,'square',0.3*v,0,D);break;
    case'beep2':tn(1400,0.14,'square',0.34*v,0,D);break;
    case'beep3':tn(1800,0.18,'square',0.38*v,0,D);break;
    case'slam':nzs(0.3,0.8*v,500,D);break;
    case'hurt':tn(160,0.15,'sawtooth',0.3,70);break;
    case'choir':[[262,0],[330,0.25],[392,0.5],[523,0.75],[659,1.0]].forEach(([f,d])=>setTimeout(()=>{if(!AC)return;tn(f,2.6,'sine',0.07,0);tn(f*1.005,2.6,'triangle',0.035,0);tn(f/2,2.6,'sine',0.04,0)},d*500));break;   // coral de igreja (dízimo do santuário)
    case'win':[523,659,784,1046].forEach((f,i)=>setTimeout(()=>AC&&tn(f,0.25,'square',0.18),i*160));break;
  }
}

// ---------- Música ambiente (gerada por código) ----------
const MUS={on:false,mix:0,clock:0,chord:0,nextChord:6,nextBird:3,step:0,stepT:0,pads:[]};
const CHORDS=[[220,261.63,329.63],[174.61,220,261.63],[196,246.94,293.66],[164.81,196,246.94]];
function getNoiseBuf(){if(!noiseBuf){noiseBuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}return noiseBuf}
function initMusic(){
  if(!AC||MUS.on)return;MUS.on=true;
  MUS.bus=AC.createGain();MUS.bus.gain.value=0.6;MUS.bus.connect(master);
  MUS.calm=AC.createGain();MUS.calm.gain.value=0;MUS.calm.connect(MUS.bus);
  MUS.comb=AC.createGain();MUS.comb.gain.value=0;MUS.comb.connect(MUS.bus);
  // batalha: zumbido grave tenso
  const clp=AC.createBiquadFilter();clp.type='lowpass';clp.frequency.value=420;clp.connect(MUS.comb);
  [55,58.3,82.4].forEach(f=>{const o=AC.createOscillator();o.type='sawtooth';o.frequency.value=f;const g=AC.createGain();g.gain.value=0.1;o.connect(g);g.connect(clp);o.start()});
  initAmbient();   // a parte calma agora é som ambiente (ambient.js), não música
}
function inBattle(){
  if(P.dead||G.invis)return false;
  for(const c of WORLD.areas)if(c.state==='attacking'&&c.aliveEnemies>0&&Math.hypot(c.cx-P.x,c.cz-P.z)<c.half+70)return true;
  return false;
}
function updateMusic(dt){
  if(!MUS.on||!AC)return;
  const battle=G.running&&inBattle();
  MUS.mix+=((battle?1:0)-MUS.mix)*Math.min(1,dt*(battle?1.4:0.35));
  const t=AC.currentTime;
  MUS.fade=Math.min(1,(MUS.fade||0)+(G.running?dt/6:0));   // o som entra devagar (6 s) quando o jogo começa, em vez de abrir de uma vez
  MUS.calm.gain.setTargetAtTime(0.9*(1-MUS.mix)*MUS.fade,t,0.4);MUS.comb.gain.setTargetAtTime(0.9*MUS.mix*MUS.fade,t,0.4);
  if(G.panel&&G.panel!=='freeze')return;
  MUS.clock+=dt;
  if(G.running)updateAmbient(dt);
  if(MUS.mix>0.2){
    MUS.stepT-=dt;
    while(MUS.stepT<=0){
      MUS.stepT+=0.19;const s=(MUS.step++)%16;
      if(s%4===0)tn(140,0.16,'sine',0.55,38,MUS.comb);
      if(s%2===0)nzs(0.03,0.09,9000,MUS.comb,'highpass');
      if(s===4||s===12)nzs(0.13,0.22,2600,MUS.comb);
      if(s===0||s===3||s===6||s===10)tn(s===6?73:55,0.17,'square',0.07,0,MUS.comb);
      if(s===14)tn(466,0.12,'sawtooth',0.03,440,MUS.comb);
    }
  }
}

// iconHtml (opcional): ícone em HTML antes do texto (foto da arma)
function toast(msg,ms,iconHtml){
  const d=document.createElement('div');d.className='toast';if(iconHtml){d.innerHTML=iconHtml+' ';d.appendChild(document.createTextNode(msg))}else d.textContent=msg;const box=$('toasts');box.appendChild(d);
  while(box.children.length>4)box.removeChild(box.firstChild);
  setTimeout(()=>{if(d.parentNode)d.parentNode.removeChild(d)},ms||2500);
}
function addCoins(n){P.coins+=n}
let subT=0;
function showSubtitle(text,ms){const d=$('subtitle');d.textContent=text;d.style.opacity=1;clearTimeout(subT);subT=setTimeout(()=>d.style.opacity=0,ms||3500)}
let hmT=0;
function hitMarker(kill,head){
  const c=$('crosshair');c.className=kill?'kill':'hit';clearTimeout(hmT);hmT=setTimeout(()=>c.className='',140);sfx(kill?'kill':'hit',0);
  if(head)toast('HEADSHOT!',700);
}
function damagePlayer(dmg,fx,fz){
  if(P.dead||G.god)return;
  dmg*=buffMul('resist');   // bônus de comida: Resistência
  if(facInCrime())dmg*=3;   // crime numa cidade: 3× de dano
  if(P.armor>0){const ab=Math.min(P.armor,dmg*0.6);P.armor-=ab;dmg-=ab}
  P.hp-=dmg;G.hurtT=0.45;sfx('hurt',0);
  const dx=fx-P.x,dz=fz-P.z,s=Math.sin(P.yaw),c=Math.cos(P.yaw);
  const dot=dx*(-s)+dz*(-c),rt=dx*c-dz*s,ang=Math.atan2(rt,dot);
  const id=Math.abs(ang)<Math.PI/4?'eT':Math.abs(ang)>3*Math.PI/4?'eB':ang>0?'eR':'eL';
  $(id).style.opacity=1;setTimeout(()=>$(id).style.opacity=0,350);
  if(P.hp<=0){P.hp=0;die()}
}
function die(){P.dead=true;G.fireHeld=false;G.aiming=false;if(battleOn()){battleDefeat();return}if(typeof mundoDie==='function'&&mundoDie())return;openPanel('dead');if(RAID.active&&RAID.engaged)raidFailed('morte');if(CVB.active)cvbEnd(false);if(typeof rebCombatDied==='function')rebCombatDied()}   // morrer defendendo a cidade: o raid é perdido (saque)
function respawn(){
  if(G.dg)leaveDungeon(true);
  P.dead=false;P.hp=P.maxhp;P.armor=0;P.coins=P.coins>0?Math.floor(P.coins*0.9):P.coins;P.crouch=false;P.regen=null;fishClean();
  for(const c of WORLD.cities)if(c.state==='attacking'){c.state='idle';c.crime=false;for(const e of c.enemies)if(e.alive){e.hp=e.maxhp;e.x=e.homeX;e.z=e.homeZ;e.y=tH(e.x,e.z)}}
  placePlayerHome();closePanel();
  if(STATE.phase==='commander'&&STATE.round>=1&&!(typeof rebCur==='function'&&rebCur()&&rebCur().endNow)&&typeof endRound==='function'){toast('☠ Você caiu: o turno do comandante termina.',3500);endRound(WORLD.home)}   // morrer encerra o turno (a rebelião já tem o seu próprio fim, abaixo)
  if(typeof rebAfterRespawn==='function')rebAfterRespawn();   // morreu numa batalha de rebelião: a rodada acaba (rebellion.js)
}
function placePlayerHome(){
  const c=WORLD.home;const cand=[[c.S+2.5,c.P-2],[-c.S-2.5,c.P-2],[c.S+2.5,-c.P+2],[0,c.P-1],[c.P-1,0],[-c.P+1,0]];
  for(const q of cand){const x=c.cx+q[0],z=c.cz+q[1];probe(x,z,0.5,tH(x,z),1.8,1.05);if(!GR.blocked){P.x=x;P.z=z;P.y=GR.g;P.yaw=Math.atan2(c.cx-x,c.cz-z)+Math.PI;P.pitch=0;P.vx=P.vz=0;P.camY=P.y;return}}
  P.x=c.cx+6;P.z=c.cz+6;P.y=tH(P.x,P.z)+1;P.camY=P.y;
}
function conquerCity(c){
  if(mapMundoOn()&&WORLD.win&&typeof WORLD.win.node==='number'){wtAnnex(wtGraph(),WORLD.win.node);WM.key=null}   // mundo novo: o tile volta a ser seu
  c.owner='player';c.state='conquered';facSetFlag(c);facReskin();armyConquered(c);citySentrySync(c);if(typeof facReap==='function')facReap();
  {const e=ec(c);if(e&&e.rebelled){e.rebelled=false;e.noReb=STATE.round+(typeof REBM!=='undefined'?REBM.cool:5);e.ups=0;e.mood='ok'}}   // reconquistada de uma rebelião: 5 rodadas sem se rebelar (rebmine.js)
  const reward=120+60*c.rank;addCoins(reward);
  const n=WORLD.cities.filter(x=>x.owner==='player').length;
  toast('🏴 '+c.name+' CONQUISTADA! +'+reward+' moedas  ('+n+'/7)',5000);sfx('coin',0);
  if(n>=7&&!G.won){G.won=true;sfx('win',0);setTimeout(()=>openPanel('victory'),3000)}
}

// ---------- Painéis ----------
const SCREENS=['start','shop','clinic','svc','barracks','quests','pause','dead','victory','store','cook','raid','ldbook','warehouse'];
function openPanel(name){
  if(G.frozen)setFrozen(false);
  SCREENS.forEach(s=>$(s).classList.add('hidden'));$(name).classList.remove('hidden');
  G.panel=name;G.fireHeld=false;G.aiming=false;
  if(document.pointerLockElement)document.exitPointerLock();
}
// Congelar (tecla P): para o mundo, esconde HUD e arma; o mouse ainda gira a câmera para enquadrar prints
function setFrozen(v){
  G.frozen=v;hud.classList.toggle('hidden',v);
  if(v)WS.vm.forEach(x=>x.visible=false);else ensureEquipped();
  if(v){G.fireHeld=false;G.aiming=false}
}
// modo invencível liga/desliga a munição infinita junto
function setGod(v){G.god=v;G.infAmmo=v}
function closePanel(){
  MP.on=false;WF.pick=null;   // fechar o caderno cancela a escolha de caravana e a do alvo da guerra
  SCREENS.forEach(s=>$(s).classList.add('hidden'));G.panel=null;
  try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(e){}
}
// ---------- preços por cidade ----------
// cidade inimiga: ×2 • cidade conquistada: desconto crescente com o nível • cidade inicial: o menor preço entre as conquistadas
const DISCOUNT=[0,0.10,0.15,0.20,0.25,0.30,0.35];
function cityMul(c){
  if(!c)return 1;
  if(c.owner==='enemy')return 1;   // cidades de facções: o preço vem da relação com a facção (factions.js)
  if(c.home){let m=1;for(const k of WORLD.cities)if(k.owner==='player'&&!k.home)m=Math.min(m,1-DISCOUNT[k.rank]);return m}
  return 1-DISCOUNT[c.rank];
}
// o preço passa pela função única priceOf (state.js), que encadeia modificadores; a cidade é o primeiro deles
addPriceFx('city',ctx=>{const c=ctx.city,m=cityMul(c);return m===1?[]:[{txt:m>1?'Cidade inimiga':c.home?'Desconto das cidades conquistadas (vale o melhor)':'Cidade conquistada (nível '+c.rank+')',mul:m}]},10);
const pc=(base,c,kind)=>priceOf(base,{city:c,kind});
// selo de preço (HTML): total em % de desconto/acréscimo + botão "?" com a lista do que afeta. kinds = tipos de preço que o serviço vende
const PRICE_KINDS={weapon:'Armas',ammo:'Munição',vest:'Colete',upgrade:'Ampliar a bolsa',heal:'Itens de cura',healhp:'Cura de vida',buy:'Loja',tavern:'Taverna',recruit:'Recrutar soldado',soldierup:'Evoluir soldados',repair:'Conserto'};
const pricePct=m=>{const v=Math.round((m-1)*100);return v>0?'+'+v+'%':v<0?'−'+(-v)+'%':'0%'};
function priceReport(c,kinds){
  const rows=new Map(),tot=[];
  for(const k of kinds){
    const ex=priceExplain({city:c,kind:k});tot.push(priceMulOf(ex));
    for(const e of ex){const key=e.txt+'|'+e.mul;if(!rows.has(key))rows.set(key,{txt:e.txt,mul:e.mul,ks:[]});rows.get(key).ks.push(k)}
  }
  return{lo:Math.min(...tot),hi:Math.max(...tot),rows:[...rows.values()].sort((a,b)=>b.ks.length-a.ks.length)};
}
// indicador DENTRO da caixa do item: "+90%" (vermelho se encarece, verde se barateia) + "?" com a explicação daquele item.
// Some quando nada afeta o valor. Os efeitos se somam em %. Botões "?" dentro de grades precisam ser ignorados pelos cliques dos botões da grade.
const tagLine=s=>s?'<div class="st">'+s+'</div>':'';
function whyTag(m,label,attrs,goodUp){
  const cls=m===1?'':((m>1)===!!goodUp?'good':'bad');
  return '<span class="ptag '+cls+'">'+(label?label+': ':'')+pricePct(m)+'</span><button class="qmark" '+attrs+' title="O que afeta este valor">?</button>';
}
function priceTag(c,kind,label){const ex=priceExplain({city:c,kind});return ex.length?whyTag(priceMulOf(ex),label,'data-why="price" data-c="'+c.id+'" data-k="'+kind+'"',false):''}
const rewardTag=()=>{const ex=rewardFx();return ex.length?whyTag(priceMulOf(ex),'','data-why="reward"',true):''};
let priceWin=null;
function openPriceWhy(btn){
  const d=btn.dataset,isR=d.why==='reward',isS=d.why==='sell',cty=WORLD.cities.find(x=>x.id===+d.c),rep=isR?rewardReport():isS?sellReport(cty,d.i):priceReport(cty,[d.k]),a=pricePct(rep.lo);
  if(!priceWin)priceWin=UI.window({title:'',width:Math.min(460,innerWidth-30),z:60,buttons:[{label:'Fechar',cls:'gold'}]});
  if(d.post&&!isR&&!isS){rep.rows=rep.rows.concat([{txt:'Entreposto',mul:1+POIX.post.markup,ks:[d.k]}]);rep.lo*=1+POIX.post.markup}
  if(d.xl&&!isR&&!isS){rep.rows=rep.rows.concat([{txt:d.xl,mul:+d.xm,ks:[d.k]}]);rep.lo*=+d.xm}   // acréscimo de um POI (pousada, alojamento): nome em data-xl, multiplicador em data-xm   // entreposto: +10% sobre a cidade de referência
  priceWin.setTitle('❔ '+(isR?'O que afeta a recompensa':isS?'O que afeta o valor de venda — '+itemDef(d.i).name:'O que afeta o preço'+(PRICE_KINDS[d.k]?' — '+PRICE_KINDS[d.k]:'')));
  priceWin.body.innerHTML='<p class="st">Os efeitos se somam sobre '+(isR?'a recompensa':isS?'o valor':'o preço')+' base'+(isS?' (◉'+itemDef(d.i).value+')':'')+':</p>'
    +(rep.rows.length?rep.rows.map(x=>'<div class="st">• '+x.txt+' — <b>'+pricePct(x.mul)+'</b></div>').join(''):'<div class="st">• Nenhum efeito agora: vale o valor base.</div>')
    +'<p class="st">Total: <b>'+pricePct(rep.lo)+'</b></p>';
  priceWin.open();
}
document.addEventListener('click',e=>{const b=e.target.closest('.qmark');if(b)openPriceWhy(b)});
function openShop(c){G.shopCity=c;G.shopTab='weapons';openPanel('shop');renderShop()}
function renderShop(){
  const c=G.shopCity;
  const weaponsHtml=WEAPONS.map((w,i)=>{
    const own=WS.owned[i],pr=pc(w.price,c,'weapon'),pk=pc(w.packCost,c,'ammo');
    return '<div class="card'+(own?'':' locked')+'"><b>'+itemIconHtml(itemDef(wItemId(i)))+' '+(i+1)+'. '+w.name+'</b><div class="st">'+w.desc+'<br>Dano '+w.dmg+(w.pellets>1?' ×'+w.pellets:'')+' • '+w.rpm+' dpm • Pente '+w.mag+'</div>'+
      (own?'<div class="st">Munição reserva: '+WS.reserve[i]+'<br>Durabilidade: '+(weaponBroken(i)?'<b style="color:#ff6a6a">QUEBRADA</b>':Math.round(durOf(i))+'%')+'</div>'+tagLine(priceTag(c,'ammo','Munição')+(durOf(i)<100?' '+priceTag(c,'repair','Conserto'):''))+'<button data-a="ammo" data-i="'+i+'" '+(P.coins<pk&&!pistolDebtOk(i,pk)?'disabled':'')+'>+'+w.pack+' munição ◉'+pk+'</button>'+(durOf(i)<100?'<button data-a="repair" data-i="'+i+'">🔧 Consertar ◉'+repairCost(i,c)+(P.coins<repairCost(i,c)?' (gera dívida)':'')+'</button>':'')
          :tagLine(priceTag(c,'weapon'))+'<button class="gold" data-a="buy" data-i="'+i+'" '+(P.coins<pr?'disabled':'')+'>Comprar ◉'+pr+'</button>')+'</div>';
  }).join('');
  const utilsHtml='<div class="card"><b>🛡 Colete à prova de bala</b><div class="st">Absorve 60% do dano recebido até acabar (100 de proteção).<br>Proteção atual: '+Math.ceil(P.armor)+'/100</div>'+tagLine(priceTag(c,'vest'))+'<button class="gold" data-a="vest" '+(P.coins<pc(180,c,'vest')||P.armor>=100?'disabled':'')+'>Comprar ◉'+pc(180,c,'vest')+'</button></div>'
    +'<div class="card"><b>🎒 Ampliar a bolsa</b><div class="st">+'+(INV_UPGRADED-INV_BASE)+' espaços ('+INV_BASE+' → '+INV_UPGRADED+'). Só pode ser feito uma vez.</div>'
    +(STATE.inv.upgraded?'<button disabled>Bolsa já ampliada ✔</button>':tagLine(priceTag(c,'upgrade'))+'<button class="gold" data-a="bag" '+(P.coins<pc(INV_UP_COST,c,'upgrade')||Ledger.anyDebt()?'disabled':'')+'>Ampliar ◉'+pc(INV_UP_COST,c,'upgrade')+'</button>')+'</div>';
  const tab=G.shopTab||'weapons';
  $('shopcoins').textContent='◉ '+P.coins+' moedas';
  $('shoptabs').innerHTML=[['weapons','🔫 Armas'],['utils','🛠 Úteis']].map(t=>'<button class="'+(tab===t[0]?'gold':'alt')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('');
  $('shopgrid').innerHTML=tab==='utils'?utilsHtml:weaponsHtml;
}
$('shoptabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.tab){G.shopTab=b.dataset.tab;renderShop()}});
$('shopgrid').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.classList.contains('qmark'))return;const c=G.shopCity;
  if(b.dataset.a==='repair'){repairWeapon(+b.dataset.i,c);renderShop();return}
  if(b.dataset.a==='bag'){invUpgrade(pc(INV_UP_COST,c,'upgrade'));renderShop();return}
  if(b.dataset.a==='vest'){const pr=pc(180,c,'vest');if(P.coins>=pr&&P.armor<100){P.coins-=pr;P.armor=100;sfx('coin',0);toast('Colete equipado!',1500)}renderShop();return}
  const i=+b.dataset.i,w=WEAPONS[i],pr=pc(w.price,c,'weapon'),pk=pc(w.packCost,c,'ammo');
  if(b.dataset.a==='buy'&&P.coins>=pr){if(giveWeapon(i,true)){P.coins-=pr;sfx('coin',0);toast(w.name+' adquirida!'+(slotOfWeapon(i)>=0?' (barra '+(slotOfWeapon(i)+1)+')':' Está na bolsa: coloque-a na barra 1–6.'),2500)}}
  else if(b.dataset.a==='ammo'&&(P.coins>=pk||pistolDebtOk(i,pk))){P.coins-=pk;WS.reserve[i]=Math.min(WS.reserve[i]+w.pack,w.pack*8);sfx('coin',0)}
  renderShop();
});
function openClinic(c){G.clinicCity=c;G.clinicMode='menu';openPanel('clinic');renderClinic()}
const clinicCost=(h,c)=>priceOf(h*0.5,{city:c,kind:'healhp'});   // vida: 0,5 por ponto × todos os modificadores (kind 'healhp')
function renderClinic(){
  if(polFlag('noHeal',G.clinicCity.id)){$('clinictxt').innerHTML='';$('clinicbtns').innerHTML='<p>— A clínica está fechada: há uma epidemia na cidade e não há como curar nem vender remédios.</p>';return}
  const c=G.clinicCity,miss=Math.ceil(P.maxhp-P.hp),full=clinicCost(miss,c),q=Math.min(miss,25),qc=clinicCost(q,c);
  $('clinictxt').innerHTML='Vida: <b>'+Math.ceil(P.hp)+'/'+P.maxhp+'</b> • Moedas: <b>◉ '+P.coins+'</b><br>Aqui a vida <b>não</b> volta sozinha: cada ponto custa ◉'+(0.5*priceMul({city:c,kind:'healhp'})).toFixed(2).replace('.',',')+'.';
  const mode=G.clinicMode||'menu',back='<br><button class="alt" data-mode="menu" style="margin-top:8px">← Voltar</button>';
  if(mode==='menu')$('clinicbtns').innerHTML='<p>— Em que posso ajudar?</p><button class="gold" data-mode="heal">❤ Curar</button><button class="gold" data-mode="buy">🛍 Comprar</button>';
  else if(mode==='heal')$('clinicbtns').innerHTML=(miss<=0?'<p>Você está saudável!</p>':tagLine(priceTag(c,'healhp'))+'<button class="gold" data-h="'+miss+'" '+(P.coins<full?'disabled':'')+'>Curar tudo (+'+miss+') ◉'+full+'</button><button data-h="'+q+'" '+(P.coins<qc?'disabled':'')+'>+'+q+' vida ◉'+qc+'</button>')+back;
  else $('clinicbtns').innerHTML='<p class="st">Itens de cura (ficam na bolsa; atalhos 7, 8, 9):</p>'+tagLine(priceTag(c,'heal'))
    +Object.values(DATA.items).filter(d=>d.shop==='clinic').map(d=>{const p=pc(d.price,c,'heal');return '<button data-buy="'+d.id+'" '+(P.coins<p||Ledger.anyDebt()?'disabled':'')+'>'+d.icon+' '+d.name+' ◉'+p+'</button>'}).join('')+back;
}
$('clinicbtns').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b||b.classList.contains('qmark'))return;
  if(b.dataset.mode){G.clinicMode=b.dataset.mode;renderClinic();return}
  if(b.dataset.buy){
    const id=b.dataset.buy,d=itemDef(id),p=pc(d.price,G.clinicCity,'heal');
    if(invRoomFor(id)<1)toast('Bolsa cheia! Descarte algo antes de comprar.',2000);
    else if(Ledger.spend({gold:p})){invGive([[id,1]]);sfx('coin',0);toast(d.icon+' '+d.name+' comprada',1500)}
    renderClinic();return;
  }
  const h=+b.dataset.h,cost=clinicCost(h,G.clinicCity);
  if(P.coins>=cost){P.coins-=cost;P.hp=Math.min(P.maxhp,P.hp+h);sfx('coin',0)}renderClinic();
});$('bkclose').onclick=closePanel;$('qclose').onclick=closePanel;$('shopclose').onclick=closePanel;$('clinicclose').onclick=closePanel;$('vclose').onclick=closePanel;
$('resume').onclick=()=>{document.querySelector('#pause h2').textContent='⏸ PAUSA';if(AC&&AC.state==='suspended')AC.resume();G.introBook=false;closePanel()};$('respawn').onclick=respawn;
function toggleMute(){G.muted=!G.muted;if(master)master.gain.value=G.muted?0:0.35;refreshCheats();toast(G.muted?'Som desligado':'Som ligado',1000)}
function toggleInvis(){G.invis=!G.invis;if(G.invis){for(const e of ENEMIES)e.aggro=false}}
function refreshCheats(){
  refreshPolicyCheats();
  {const ps=$('posshow');if(ps)ps.textContent=txtPlayerPos(P)}   // coordenadas do jogador (aba Geral da pausa)
  {const ss=$('seedshow');if(ss&&typeof WORLD!=='undefined'&&WORLD.seed!==undefined)ss.textContent=WORLD.seed}
  $('cPolicyNext').textContent='Disparar evento na próxima rodada: '+(POL.forceNext?'SIM':'não');
  $('cSupplied').textContent='Cidades sempre supridas: '+(G.alwaysSupplied?'LIGADO':'desligado');
  $('cNoWear').textContent='Desgaste das armas: '+(G.noWear?'desligado':'LIGADO');$('ledgerline').textContent='Rodada '+STATE.round+'  •  '+Ledger.summary()+(Ledger.anyDebt()?'  •  ⚠ EM DÍVIDA: compras bloqueadas':'');$('cInvis').textContent='Invisível: '+(G.invis?'LIGADO':'desligado');$('cMute').textContent='Som: '+(G.muted?'desligado':'LIGADO');{const bt=$('cToll');if(bt){bt.classList.toggle('hidden',!mapMundoOn());bt.textContent=txtTollSetting(mundoTollShow())}}$('cGod').textContent='Invencível: '+(G.god?'LIGADO':'desligado');$('cAmmo').textContent='Munição infinita: '+(G.infAmmo?'LIGADA':'desligada');$('cMag').textContent='Pente infinito (sem recarregar): '+(G.noReload?'LIGADO':'desligado')}
$('cMute').onclick=toggleMute;
$('cToll').onclick=()=>{mundoTollSet(!mundoTollShow());refreshCheats()};   // opção do aviso do pedágio (mundo novo; ui/mundoturno.js)
$('seedcopy').onclick=()=>{const s=String(WORLD.seed),done=()=>toast('Semente '+s+' copiada!',1800);
  const fb=()=>{const ta=document.createElement('textarea');ta.value=s;ta.style.cssText='position:fixed;left:-999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){toast('Não foi possível copiar. A semente é '+s,3000)}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(done,fb);else fb()};
// copia a posição do jogador (sem toast: o botão mostra o resultado por um instante)
$('poscopy').onclick=()=>{const s=txtPlayerPos(P),b=$('poscopy'),done=()=>{b.textContent=TXT_POS_COPIED;setTimeout(()=>{b.textContent=TXT_POS_COPY},1500)};
  const fb=()=>{const ta=document.createElement('textarea');ta.value=s;ta.style.cssText='position:fixed;left:-999px';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}catch(e){b.textContent=TXT_POS_FAIL}ta.remove()};
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(s).then(done,fb);else fb()};
$('cSave').onclick=()=>SaveUI.open('game');
$('loadbtn').onclick=()=>SaveUI.open('load');
$('cRes').onclick=()=>{toast('Itens: '+(invGive([['tora',20],['minerio',20],['couro',20],['carne',20],['tilapia',10]])||'(bolsa cheia)'),2500);refreshCheats()};
$('cDebt').onclick=()=>{Ledger.borrow({gold:50});refreshCheats()};
$('cRound').onclick=()=>{endRound();refreshCheats();closePanel()};
$('cLeader').onclick=()=>{if(STATE.phase==='leader'||G.office){closePanel();return}STATE.rd.hallCity=WORLD.home.id;beginLeaderTurn();closePanel()};
$('cPolicyNext').onclick=()=>{POL.forceNext=!POL.forceNext;refreshCheats();toast(POL.forceNext?'Uma política será sorteada no próximo turno do Líder.':'Sorteio normal (30%) de volta.',2500)};
$('cSupplied').onclick=()=>{G.alwaysSupplied=!G.alwaysSupplied;refreshCheats();toast(G.alwaysSupplied?'Cidades sempre supridas: as rodadas passam sem faltar suprimentos.':'Cidades voltam a precisar de suprimentos.',2500)};
$('cPolicy').onclick=()=>{
  if(STATE.phase!=='leader'){toast('Eventos só no turno do líder: vá ao escritório antes.',2500);return}
  const id=$('polsel').value,err=id?polSummon(id):(rollPolicy(true),STATE.pol.pending?null:'Nenhuma política disponível agora.');
  if(err){toast(err,3500);return}
  closePanel();
};
$('cActions').onclick=()=>{STATE.rd.lvl=Math.min(LVL.facMax,STATE.rd.lvl+1);toast('Facção nível '+STATE.rd.lvl,1500)};
$('cItems').onclick=()=>{toast('Itens de teste: '+(invGive(Object.keys(DATA.items).map(id=>[id,1]))||'(bolsa cheia)'),2500)};
$('cFill').onclick=()=>{const sl=STATE.inv.slots;for(let i=0;i<sl.length;i++)if(!sl[i])sl[i]={id:'sucata',n:20};invChanged();toast('Bolsa cheia de sucata. Dê um item novo para testar o descarte.',3000)};
$('cWear').onclick=()=>{STATE.dur[WS.cur]=Math.max(0,STATE.dur[WS.cur]-40);toast('Durabilidade de '+WEAPONS[WS.cur].name+': '+Math.round(STATE.dur[WS.cur])+'%',1800)};
$('cFix').onclick=()=>{STATE.dur=WEAPONS.map(()=>100);toast('Todas as armas consertadas',1500)};
$('cNoWear').onclick=()=>{G.noWear=!G.noWear;refreshCheats()};
$('storeclose').onclick=closePanel;$('cookclose').onclick=closePanel;
$('cookbody').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.r){cook(b.dataset.r);renderCooking()}});
$('cPortals').onclick=()=>{const n=spawnPortals();toast(DG.ok?'Portais criados: '+n+' (siga a coluna de luz roxa)':'Sem espaço para a região das dungeons neste mapa (todos os cantos têm cidade). Gere outro mundo.',3500)};
$('cGoPortal').onclick=()=>{
  let best=null,bd=1e9;for(const pt of STATE.portals){const d=Math.hypot(pt.x-P.x,pt.z-P.z);if(d<bd){bd=d;best=pt}}
  if(!best){toast('Nenhum portal ativo.',1500);return}
  P.x=best.x+4;P.z=best.z;P.y=tH(P.x,P.z)+0.3;P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(best.x-P.x),-(best.z-P.z));closePanel();
};
$('cRaid').onclick=()=>{closePanel();if(!startRaid())toast('Não foi possível iniciar o raid agora.',2000)};
$('cLegend').onclick=()=>{const i=rollLegendary();if(i<0){toast('Todas já são lendárias.',1500);return}STATE.legend[i]=true;if(!weaponHere(i))giveWeapon(i,true);invChanged();toast('★ '+WEAPONS[i].name+' lendária!',2500)};
$('cKit').onclick=()=>{toast('Kit de cozinha: '+(invGive([['lambari',3],['tilapia',2],['truta',1],['sardinha',2],['peixe_dourado',1],['carne',6],['ervas',5]])||'(bolsa cheia)'),3000)};
$('cVend').onclick=()=>{const c=G.curCity&&!G.curCity.kind?G.curCity:WORLD.home;getVendor(c).gold=0;toast('Vendedor de '+c.name+' sem ouro (teste)',2200)};
$('cBuffs').onclick=()=>{for(const id of Object.keys(DATA.buffs))applyBuff(id);toast('Todos os bônus aplicados',1800)};

function buildMixer(){
  const box=$('mixrows');box.innerHTML='';
  for(const [k,label] of SND){
    if(k==='leaves'||k==='water')continue;
    const row=document.createElement('div');row.className='mixrow';
    const nm=document.createElement('span');nm.textContent=label;
    const sl=document.createElement('input');sl.type='range';sl.min=0;sl.max=200;sl.step=5;sl.value=Math.round(AMB.vol[k]*100);
    const pc=document.createElement('b');pc.textContent=sl.value+'%';
    sl.oninput=()=>{pc.textContent=sl.value+'%';setSndVol(k,sl.value/100)};
    row.append(nm,sl,pc);box.appendChild(row);
  }
}
$('cPack').onclick=()=>{closePanel();summonPack($('packsel').value||null)};
$('cMixer').onclick=()=>{buildMixer();$('mixer').classList.remove('hidden')};
$('mixclose').onclick=()=>$('mixer').classList.add('hidden');
$('mixreset').onclick=()=>{for(const [k] of SND)setSndVol(k,1);buildMixer()};
$('cInvis').onclick=()=>{toggleInvis();refreshCheats()};
$('cGod').onclick=()=>{setGod(!G.god);refreshCheats()};
$('cMag').onclick=()=>{G.noReload=!G.noReload;refreshCheats()};
$('cAmmo').onclick=()=>{G.infAmmo=!G.infAmmo;refreshCheats()};
$('cCoins').onclick=()=>{P.coins+=1000;toast('+1000 moedas',1000)};
$('cWeap').onclick=()=>{WEAPONS.forEach((w,i)=>{giveWeapon(i,true);WS.reserve[i]=Math.max(WS.reserve[i]||0,w.pack*3)});toast('Todas as armas liberadas',1200)};
$('cTp').onclick=()=>{
  let best=null,bd=1e9;for(const c of WORLD.cities)if(c.owner==='enemy'){const d=Math.hypot(c.cx-P.x,c.cz-P.z);if(d<bd){bd=d;best=c}}
  if(!best){toast('Todas as cidades já são suas!',1500);return}
  let tx=best.cx+best.half+7,tz=best.cz;if(tx>W-8)tx=best.cx-best.half-7;
  P.x=tx;P.z=tz;P.y=Math.max(tH(tx,tz),SEA)+0.5;P.vy=0;P.camY=P.y;closePanel();
};
$('cKill').onclick=()=>{
  let n=0;for(const c of WORLD.cities){if(Math.hypot(c.cx-P.x,c.cz-P.z)<c.half+25&&c.owner==='enemy'){if(c.state!=='attacking')c.state='attacking';for(const e of c.enemies)if(e.alive)damageEnemy(e,99999,false),n++}}
  toast(n+' inimigos eliminados',1500);closePanel();
};
$('cNoclip').onclick=()=>{toggleNoclip();closePanel()};$('cStuck').onclick=()=>{unstuck(true);closePanel()};
$('cTime').onclick=()=>{DN.t=(DN.t+0.5)%1;closePanel()};
$('cNew').onclick=()=>{location.href=location.pathname+'?seed='+Math.floor(Math.random()*1e9)+(G.god?'&god=1':'')+(G.noReload?'&mag=1':'')+($('biosel').value?'&bio='+$('biosel').value:'')};

// ---------- Entrada ----------
document.addEventListener('pointerlockchange',()=>{
  G.locked=document.pointerLockElement===canvas;
  if(!G.locked&&G.running&&!G.panel&&!(G.noPauseUntil>performance.now())){refreshCheats();openPanel('pause')}   // noPauseUntil: a janela de confirmação que acabou de fechar solta o mouse; isso não deve abrir a pausa ao entrar na sala do líder
});
canvas.addEventListener('mousedown',e=>{
  if(!G.running)return;
  if(!G.locked&&!G.panel){try{canvas.requestPointerLock()}catch(_){}return}
  if(G.office){if(e.button===0&&!G.panel){if(G.office.meet)meetInteract();else if(nearBook())openBook()}return}   // no escritório, clicar diante da mesa abre o livro
  if(G.panel||G.frozen)return;
  if(e.button===ORDER_MOUSE_BUTTON){e.preventDefault();orderGo();return}   // botão do meio: ordem aos soldados (allies.js)
  if(e.button===0){if(WS.rod)fishLeft(true);else{G.fireHeld=true;G.firePressed=true}}   // com a vara, o botão esquerdo é o minigame
  else if(e.button===2){if(WS.rod)fishRight(true);else G.aiming=true}                  // e o botão direito lança/recolhe a linha
});
window.addEventListener('mouseup',e=>{if(e.button===0){G.fireHeld=false;fishLeft(false)}else if(e.button===2){G.aiming=false}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('mousemove',e=>{
  if(!G.locked||G.panel)return;
  const sens=0.0022*(G.aiming?1/Math.sqrt(WEAPONS[WS.cur].zoom):1);
  P.yaw-=e.movementX*sens;P.pitch=clamp(P.pitch-e.movementY*sens,-1.5,1.5);
});
window.addEventListener('wheel',e=>{
  if(!G.running||G.panel||G.frozen||G.office)return;
  const dir=e.deltaY>0?1:-1,bar=STATE.inv.wbar;let i=equippedSlot();if(i<0)i=0;
  for(let k=0;k<WBAR;k++){i=(i+dir+WBAR)%WBAR;if(bar[i]){selectSlot(i);break}}
});
window.addEventListener('keydown',e=>{
  if(e.target&&e.target.tagName==='INPUT')return;
  G.keys[e.code]=true;
  if(e.code==='Space')e.preventDefault();
  if(!G.running)return;
  if(e.code==='KeyP'&&G.creative&&!G.panel&&!e.repeat){setFrozen(!G.frozen);return}
  if(G.frozen)return;
  if(e.code==='Tab'||e.code==='KeyO'){   // abre/fecha as configurações sem usar o Esc
    e.preventDefault();if(e.repeat)return;
    if(UI.closeTop())return;
    if(!$('mixer').classList.contains('hidden')){$('mixer').classList.add('hidden');return}
    if(G.panel==='pause'){document.querySelector('#pause h2').textContent='⏸ PAUSA';closePanel()}
    else if(!G.panel){refreshCheats();openPanel('pause')}
    return;
  }
  if(e.code==='KeyL'){   // L abre o caderno direto no Livro (com o caderno aberto, troca para o Livro; no Livro, fecha)
    if(G.panel==='ldbook'){if(LB.top==='book')closePanel();else{LB.top='book';renderBook()}}
    else if(!G.panel)openBook('book');
    return;
  }
  if(e.code==='KeyJ'&&!G.panel&&!e.repeat){wm3Open();return}   // J abre o mapa mundi em 3D (ui/mundo3d.js)
  if(e.code==='KeyM'&&(G.office||STATE.phase==='leader')&&mapMundoOn()&&!e.repeat&&(!G.panel||G.panel==='ldbook')){if(G.panel)closePanel();wm3Open();return}   // mundo novo, no escritório: M abre o mapa mundi em modo Líder (etapa 8.2)
  if(e.code==='KeyM'){   // M abre o caderno na aba Mapa (com o caderno aberto, troca para o mapa; no mapa, fecha)
    if(G.panel==='ldbook'){if(LB.top==='map')closePanel();else{LB.top='map';renderBook()}}
    else if(!G.panel)openBook('map');
    return;
  }
  if(G.panel==='shop'||G.panel==='clinic'||G.panel==='svc'||G.panel==='barracks'||G.panel==='quests'||G.panel==='store'||G.panel==='cook'||G.panel==='raid'||G.panel==='warehouse'){if(e.code==='KeyE'||e.code==='Escape'){if(!UI.closeTop())closePanel()}return}
  if(G.panel==='uiwin'){if(e.code==='Escape'||e.code==='KeyE')UI.closeTop();return}   // janela de confirmação sobre o jogo
  if(G.panel==='ldbook'){if(e.code==='KeyE'||e.code==='Escape'||e.code==='KeyB'){if(!UI.closeTop())closePanel()}return}   // livro: bolsa + decisões
  if(G.panel)return;
  if(G.office){if(e.code==='KeyE'&&!e.repeat){if(G.office.meet)meetInteract();else doInteract()}return}   // no escritório só se anda e se abre o livro
  if(e.repeat)return;
  if(e.code==='KeyC')P.crouch=!P.crouch;
  else if(e.code==='KeyR')startReload();
  else if(e.code==='KeyK')toggleMute();
  else if(e.code==='KeyN'&&G.creative)toggleNoclip();
  else if(e.code==='KeyU')unstuck(true);
  else if(e.code==='KeyI'&&G.creative){toggleInvis();toast(G.invis?'👻 Modo invisível LIGADO':'Modo invisível desligado',1200)}
  else if(e.code==='KeyG'&&G.creative){setGod(!G.god);toast(G.god?'Modo invencível LIGADO (munição infinita)':'Modo invencível desligado',1200)}
  else if(e.code==='KeyE')doInteract();
  else if(e.code==='KeyF'){if(G.attackCity)startAttack(G.attackCity)}
  else if(e.code==='KeyB')openInventory();
  else if(e.code===ORDER_KEY_GO)orderGo();          // ordem: soldados vão ao ponto mirado (allies.js)
  else if(e.code===ORDER_KEY_CANCEL)orderCancel();
  else if(e.code===ORDER_KEY_HUNT)orderHunt();   // libera os soldados para caçar inimigos
  else if(e.code==='Digit7'||e.code==='Digit8'||e.code==='Digit9')useBar(+e.code.slice(5)-7);
  else if(e.code.startsWith('Digit')){const i=+e.code.slice(5)-1;if(i>=0&&i<WBAR)selectSlot(i)}
});
window.addEventListener('keyup',e=>{G.keys[e.code]=false});
window.addEventListener('blur',()=>{G.keys={};G.fireHeld=false;G.aiming=false});

function doInteract(){
  const t=G.target;if(!t)return;
  if(t.c&&raidLocked(t.c))return;
  if(t.type==='dgcage')gevCageOpen();else if(t.type==='hall')openQuests(t.c);else if(t.type==='barracks')openBarracks(t.c);else if(t.type==='recruit')svcRecruit(t.c);else if(t.type==='shop')openShop(t.c);else if(t.type==='clinic')openClinic(t.c);else if(t.type==='portal'){if(RAID.active&&!RAID.engaged)toast('Há um ataque em andamento! Defenda a cidade antes.',2500);else if(t.p.golden&&CONTEST.active)toast('⚔ A batalha pelo portal dourado ainda não terminou!',2500);else enterDungeon(t.p)}else if(t.type==='dgexit')leaveDungeon();else if(t.type==='store')openStore(t.c,'store');else if(t.type==='tavern')openStore(t.c,'tavern');else if(t.type==='stove')openCooking('tavern');else if(t.type==='fire')openCooking('fire');else if(t.type==='npc')npcTalk(t.n);else if(t.type==='chest')openChest(t.ch);else if(t.type==='vein')mineVein();else if(t.type==='cage')openCage(t.c);else if(t.type==='book')openBook();else if(t.type==='leader')hallRoundAction(t.c);else if(t.type==='warehouse')openWarehouse(t.c);else if(t.type==='loot')lootCaravan(t.car);else if(t.type==='msdeliver')msDeliver(t.m);else if(String(t.type).indexOf('poi')===0)poiAct(t);
}
function updateInteract(){
  G.target=null;G.attackCity=null;G.curCity=null;const lines=[];
  let bestD=1e9;
  for(const c of WORLD.cities){
    const d=Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz));
    if(d<c.half+8&&d<bestD){bestD=d;G.curCity=c}
    if(d>c.half+25)continue;
    if(raidLocked(c)||facClosed(c)){   // cidade em combate de raid ou hostil (inimiga, em guerra, em crime): sem serviços (nem a opção aparece)
      const st=c.owner==='enemy'?relStatus(c.fid):'';
      if(st==='war'&&c.state==='idle'&&d<c.half+10&&!meetPact()){G.attackCity=c;lines.push('[F] ATACAR '+c.name.toUpperCase())}
      else if(st==='enemy'&&!c.rebel&&c.state==='idle'&&d<c.half+14)lines.push('🚫 Território de '+facOf(c.fid).name+': não entre ou os guardas atiram');
      else if(c.crime&&c.state==='attacking'&&d<c.half+8)lines.push('🔒 Serviços fechados: cidade hostil');
      continue;
    }
    if(c.shop){const ds=Math.hypot(P.x-c.shop.x,P.z-c.shop.z);if(ds<4.5){G.target={type:'shop',c};lines.push('[E] Comprar armas e munição')}}
    if(c.barracks){const ds=Math.hypot(P.x-c.barracks.x,P.z-c.barracks.z);if(ds<4.5){G.target={type:'barracks',c};lines.push('[E] Quartel: recrutar e equipar soldados')}}
    if(c.recruit&&recruitPlace(c)){const ds=Math.hypot(P.x-c.recruit.x,P.z-c.recruit.z);if(ds<4.5){G.target={type:'recruit',c};lines.push(TXT_RECRUIT_PROMPT)}}   // alistamento da vila: só vila sua ou neutra
    if(c.clinic){const ds=Math.hypot(P.x-c.clinic.x,P.z-c.clinic.z);if(ds<4.5){G.target={type:'clinic',c};lines.push('[E] Clínica: curar ferimentos')}}
    if(c.store){const ds=Math.hypot(P.x-c.store.x,P.z-c.store.z);if(ds<4.5){G.target={type:'store',c};lines.push('[E] Loja: vender e comprar itens')}}
    if(c.tavern){const ds=Math.hypot(P.x-c.tavern.x,P.z-c.tavern.z);if(ds<3.2){G.target={type:'tavern',c};lines.push('[E] Taverneiro: comprar comida pronta')}}
    if(c.stove){const ds=Math.hypot(P.x-c.stove.x,P.z-c.stove.z);if(ds<3.0){G.target={type:'stove',c};lines.push('[E] Fogão: cozinhar')}}
    if(c.warehouse){const ds=Math.hypot(P.x-c.warehouse.x,P.z-c.warehouse.z);if(ds<4.5&&Math.abs(P.y-cityYat(c,c.warehouse.x,c.warehouse.z))<2.6){if(c.owner==='player'){G.target={type:'warehouse',c};lines.push('[E] Armazém: guardar itens, entregar suprimentos e recolher a produção')}else lines.push('🔒 Armazém fechado — conquiste a cidade')}}
    if(c.hall){const ds=Math.hypot(P.x-c.hall.x,P.z-c.hall.z);if(ds<4.5&&Math.abs(P.y-cityYat(c,c.hall.x,c.hall.z))<2.6){if(c.owner==='player'){G.target={type:'hall',c};lines.push('[E] Prefeitura: quadro de missões'+(msDeliverFor(c)?' • há entrega aqui':''))}else{const dm=msDeliverFor(c);if(dm){G.target={type:'msdeliver',c,m:dm};lines.push('[E] Entregar '+msDeliverTxt(dm)+' (missão)')}else lines.push('🔒 Prefeitura fechada — conquiste a cidade')}}}
    if(c.owner==='enemy'&&c.state==='idle'&&d<c.half+10&&relStatus(c.fid)==='war'){G.attackCity=c;lines.push('[F] ATACAR '+c.name.toUpperCase())}   // invasão só em guerra
  }
  for(const c of WORLD.camps){if(c.gone)continue;const d=Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz));if(d<c.half+8&&d<bestD){bestD=d;G.curCity=c}
    if(c.firePos&&Math.hypot(P.x-c.firePos.x,P.z-c.firePos.z)<3.4){G.target={type:'fire',c};lines.push('[E] Fogueira: cozinhar')}
    if(c.cage&&!c.cage.opened&&Math.hypot(P.x-c.cage.dp.x,P.z-c.cage.dp.z)<2.8){G.target={type:'cage',c};lines.push(c.state==='cleared'?'[E] Abrir a grade e libertar o refém':'🔒 Grade trancada — elimine os bandidos')}}
  for(const c of WORLD.cities)if(c.leader&&c.owner==='player'&&Math.hypot(P.x-c.leader.x,P.z-c.leader.z)<4.8&&Math.abs(P.y-c.leader.y)<2.6){G.target={type:'leader',c};lines.push('[E] Falar com o líder: encerrar o turno do comandante')}
  for(const car of CARAVANS){   // caravana de outra facção sem guardas vivos: dá para saquear
    if(car.city.owner==='player'||car.looted||car.ambush||car.guards.some(g=>g.alive))continue;
    if(Math.hypot(P.x-car.x,P.z-car.z)<5){G.target={type:'loot',car};lines.push('[E] Saquear a caravana de '+car.city.name)}
  }
  if(nearBook()){G.target={type:'book'};lines.push('[E] Abrir o livro de decisões')}
  {const pp=portalNear();if(pp){G.target={type:'portal',p:pp};lines.push('[E] Entrar no portal — dungeon nível '+pp.tier+' • recompensa: '+rewardText(pp))}}
  if(G.dg&&G.dgPad&&Math.hypot(P.x-G.dgPad.x,P.z-G.dgPad.z)<2.6){G.target={type:'dgexit'};lines.push('[E] Sair da dungeon (volta ao portal)')}
  if(G.dg&&G.dg.cage&&!G.dg.cage.opened&&Math.hypot(G.dg.cage.x-P.x,G.dg.cage.z-P.z)<3.6){G.target={type:'dgcage'};lines.push(G.dg.area.state==='cleared'?'[E] Abrir a jaula e libertar o refém':'🔒 Jaula trancada — elimine os inimigos')}
  if(G.dg&&G.dg.vein&&!G.dg.vein.mined&&Math.hypot(G.dg.vein.x-P.x,G.dg.vein.z-P.z)<3.4&&Math.abs(G.dg.vein.y-P.y)<2.5){G.target={type:'vein'};lines.push(G.dg.area.state==='cleared'?'[E] Minerar o veio de ouro':'🔒 Veio de ouro — elimine os inimigos')}
  if(typeof poiScan==='function'){poiScan(lines);poiMarkCheck();dormScan(lines)}   // POIs seus: vigia, binóculo, balcão e cama (poigame.js)
  for(const ch of WORLD.chests){if(ch.opened||ch.hold)continue;const d=Math.hypot(ch.x-P.x,ch.z-P.z);if(d<2.8&&Math.abs(ch.y-P.y)<2){G.target={type:'chest',ch};lines.push(ch.lockedBy&&ch.lockedBy.state!=='cleared'?'🔒 Baú trancado — elimine os bandidos':'[E] Abrir baú')}}
  if(!G.target){
    camera.getWorldDirection(_d);let bd=3.4;
    for(const n of NPCS){if(!n.alive||!n.group.visible)continue;const dx=n.x-P.x,dz=n.z-P.z,d=Math.hypot(dx,dz);
      if(d<bd&&(dx*_d.x+dz*_d.z)/(d||1)>0.75*Math.hypot(_d.x,_d.z)){bd=d;G.target={type:'npc',n}}}
    if(G.target)lines.unshift('[E] Falar');
  }
  if(!lines.length&&FISH.state==='idle'&&WS.rod&&!P.dead){const sp=findFishSpot();lines.push(sp?'[Botão direito] Lançar a linha neste cardume':'🎣 Procure um cardume (peixes nadando em círculo) e mire nele')}
  $('prompt').innerHTML=lines.join('<br>');
}

// ---------- Atualização do jogador ----------
const STAM={max:100,drain:16,regen:12,unlock:25};   // stamina: gasto por segundo correndo, recarga por segundo, e o mínimo para voltar a correr depois de esgotar
const FALL={safe:3,perBlock:8};   // dano de queda: nada até 3 blocos; depois 8 de vida por bloco a mais
function fallHit(drop){
  if(drop<=FALL.safe||P.dead||G.god)return;
  const dmg=Math.round((drop-FALL.safe)*FALL.perBlock);
  P.hp-=dmg;G.hurtT=0.45;sfx('hurt',0);if(P.hp<=0){P.hp=0;die()}
}
function updatePlayer(dt){
  const k=G.keys;
  const seated=!!(G.office&&G.office.meet&&MEETA.seated);   // sentado na reunião: não anda
  const fw=seated?0:(k.KeyW?1:0)-(k.KeyS?1:0),st=seated?0:(k.KeyD?1:0)-(k.KeyA?1:0);
  // stamina: correr gasta, esgotou = não corre até recuperar STAM.unlock; recarrega com o tempo
  if(P.stam===undefined){P.stam=STAM.max;P.stamLock=false}
  const wantSprint=k.ShiftLeft&&fw>0&&!P.crouch&&!G.aiming,sprint=wantSprint&&!P.stamLock&&P.stam>0;
  if(G.god){P.stam=STAM.max;P.stamLock=false}   // invencível: correr não gasta estamina
  else if(sprint)P.stam=Math.max(0,P.stam-STAM.drain*dt);else P.stam=Math.min(STAM.max,P.stam+STAM.regen*dt);
  if(P.stam<=0)P.stamLock=true;else if(P.stamLock&&P.stam>=STAM.unlock)P.stamLock=false;
  let spd=P.crouch?2.4:sprint?8.2:5;if(G.aiming)spd*=0.65;spd*=buffMul('speed');
  const water=P.y<SEA-0.3&&tH(P.x,P.z)<SEA&&!inDungeonRegion();if(water)spd*=0.6;
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);
  let wx=-sy*fw+cy*st,wz=-cy*fw-sy*st;const l=Math.hypot(wx,wz);if(l>0){wx/=l;wz/=l}
  const acc=P.ground?14:3.5;
  P.vx+=(wx*spd-P.vx)*Math.min(1,acc*dt);P.vz+=(wz*spd-P.vz)*Math.min(1,acc*dt);
  const hgt=P.crouch?1.2:1.8;
  if(G.noclip)noclipMove(dt,fw,st);else moveXZ(P,P.vx*dt,P.vz*dt,P.r,hgt,P.ground?1.05:0.3);   // no ar só sobe degraus pequenos: um pulo vence 1 bloco, não 2
  P.speed=Math.hypot(P.vx,P.vz);
  if(k.Space&&P.ground&&!P.crouch&&!G.noclip&&!seated){P.vy=7.2;P.ground=false}
  const vy0=P.vy;
  if(!G.noclip)moveY(P,dt,P.r,hgt,1.05);
  // dano de queda: mede a altura da queda e aplica ao pousar (a água anula)
  if(!G.noclip){
    if(!P.ground)P.peakY=Math.max(P.peakY===undefined?P.y:P.peakY,P.y);
    else{if(P.wasGround===false&&P.peakY!==undefined&&vy0<-4){const inW=P.y<SEA-0.3&&tH(P.x,P.z)<SEA&&!inDungeonRegion();if(!inW)fallHit(P.peakY-P.y)}P.peakY=P.y}
    P.wasGround=P.ground;
  }
  const peek=P.crouch&&(G.fireHeld||G.aiming);
  const tgt=P.crouch?(peek?1.52:1.05):1.62;
  P.eye+=(tgt-P.eye)*Math.min(1,dt*(peek?18:10));
  if(P.ground)P.camY+=(P.y-P.camY)*Math.min(1,dt*20);else P.camY=P.y;
  if(P.ground&&P.speed>0.5)G.bob+=P.speed*dt*1.7;
  const bobY=Math.sin(G.bob*2)*0.035*Math.min(1,P.speed/5);
  camera.position.set(P.x,P.camY+P.eye+bobY,P.z);
  camera.rotation.set(P.pitch,P.yaw,0);
  const zoom=G.aiming?WEAPONS[WS.cur].zoom:1,tf=75/zoom+(sprint?5:0);
  camera.fov+=(tf-camera.fov)*Math.min(1,dt*12);camera.updateProjectionMatrix();
  const uw=camera.position.y<SEA-0.15&&tH(P.x,P.z)<SEA&&!inDungeonRegion();
  $('under').classList.toggle('hidden',!uw);
  $('scope').classList.toggle('hidden',!(G.aiming&&WS.cur===4&&!WS.rod&&!WS.none));
  $('crosshair').style.display=(G.aiming&&WS.cur===4&&!WS.rod&&!WS.none)?'none':'block';
  G.peek=peek;
}

// ---------- HUD por frame ----------
let wlistBuilt=false;
function updateHUD(dt){
  $('stfill').style.width=((P.stam===undefined?STAM.max:P.stam)/STAM.max*100)+'%';$('stbar').classList.toggle('low',!!P.stamLock);
  $('hpfill').style.width=(P.hp/P.maxhp*100)+'%';$('hptext').textContent='VIDA '+Math.ceil(P.hp)+' / '+P.maxhp;$('arfill').style.width=P.armor+'%';$('arbox').style.display=P.armor>0?'block':'none';
  $('coins').textContent='◉ '+P.coins+(P.coins<0?'  (dívida)':'');$('coins').classList.toggle('debt',P.coins<0);
  const w=WEAPONS[WS.cur];
  if(WS.rod){$('wname').textContent='🎣 Vara de pescar';$('ammo').innerHTML='<small>direito: lançar • esquerdo: puxar</small>'}
  else if(WS.none){$('wname').textContent='Sem arma';$('ammo').innerHTML='<small>coloque uma arma na barra 1–6 (B)</small>'}
  else{
    $('wname').textContent=wName(WS.cur)+(weaponBroken()?'  💥 QUEBRADA':'  •  '+Math.round(durOf(WS.cur))+'%')+(WS.reload>0?'  (recarregando...)':'');
    $('ammo').innerHTML=(G.noReload?'∞':WS.mag[WS.cur])+' <small>/ '+(G.infAmmo?'∞':WS.reserve[WS.cur])+'</small>';
  }
  if(!wlistBuilt){$('wlist').innerHTML=[0,1,2,3,4,5].map(i=>'<div class="ws" id="ws'+i+'">'+(i+1)+'</div>').join('');wlistBuilt=true}
  const eq=equippedSlot();
  STATE.inv.wbar.forEach((id,i)=>{const d=id&&itemDef(id);$('ws'+i).className='ws'+(id?' own':'')+(i===eq?' cur':'');$('ws'+i).innerHTML=d?itemIconHtml(d):(i+1)});
  $('god').classList.toggle('hidden',!G.god);$('invis').classList.toggle('hidden',!G.invis);
  $('crouchtag').classList.toggle('hidden',!P.crouch);
  let inCover=false;
  if(P.crouch&&!G.peek){let any=false,seen=false;for(const e of ENEMIES)if(e.alive&&e.city.state==='attacking'&&Math.hypot(e.x-P.x,e.z-P.z)<90){any=true;if(e.sees)seen=true}inCover=any&&!seen}
  $('cover').classList.toggle('hidden',!inCover);
  G.hurtT=Math.max(0,G.hurtT-dt);$('flash').style.opacity=Math.min(1,G.hurtT*2.2+(P.hp<30&&!P.dead?0.25+Math.sin(G.t*6)*0.1:0));
  const c=G.curCity;
  if(c){
    if(c.state==='attacking')$('cityinfo').innerHTML='⚔ '+c.name+' — inimigos: <b style="color:#ff8a8a">'+c.aliveEnemies+'</b>/'+c.totalEnemies;
    else $('cityinfo').innerHTML=c.name+' <small>'+(c.home?'(sua cidade)':c.owner==='player'?'(conquistada)':(c.kind==='camp'?(c.state==='cleared'?'(limpo)':'(bandidos)'):(c.type==='fortaleza'?'(fortaleza ':'(cidade ')+'— '+(c.rebel?'Rebeldes · em rebelião':(facOf(c.fid)||{name:'inimiga'}).name+' · '+REL_ST[relStatus(c.fid)].n)+')'))+'</small>';
  }else $('cityinfo').textContent='';
  // objetivo
  const n=WORLD.cities.filter(x=>x.owner==='player').length;
  let best=null,bd=1e9;for(const x of WORLD.cities)if(x.owner==='enemy'){const d=Math.hypot(x.cx-P.x,x.cz-P.z);if(d<bd){bd=d;best=x}}
  if(best){
    const dx=best.cx-P.x,dz=best.cz-P.z,s=Math.sin(P.yaw),cy=Math.cos(P.yaw);
    const ang=Math.atan2(dx*cy-dz*s,dx*(-s)+dz*(-cy));
    $('obj').innerHTML='Soldados: <b>'+armyTotal()+'/'+ARMY.max+'</b>'+rebAlliesLine()+'<br>Cidades: <b>'+n+'/7</b><br>Alvo: '+best.name+'<br><span id="arrow" style="transform:rotate('+ang+'rad)">▲</span> '+Math.round(bd)+' m';
  }else $('obj').innerHTML='Cidades: <b>'+n+'/7</b><br>Todas conquistadas!';
  $('obj').innerHTML+=questLine();drawMinimap();
}
function cityCol(c){if(RAID.active&&RAID.city===c)return Math.floor(G.t*4)%2?'#ff3030':'#ffffff';return(c.state==='attacking'&&c.owner!=='player'&&Math.floor(G.t*4)%2)?'#ffffff':'#'+((c.rebel?FAC_COLORS[c.rebel.color].c:facColor(c.fid))||0x888888).toString(16).padStart(6,'0')}   // cor da facção dona (piscando em ataque)
// Mundo novo: o marcador da cidade/vila só existe se o tile TEM uma (a âncora de tile sem cidade tem half 1). Cor = a da facção dona, escura se for de bandidos, neutra se for neutra.
const mundoCityMark=c=>!mapMundoOn()||c.half>1;
const mundoCityCol=c=>mapMundoOn()&&c.owner!=='player'&&tileOwner(mundoTileKey(),null)==='bandit'?'#2a2a2a':cityCol(c);
const mm=$('mm'),mmc=mm.getContext('2d');
function drawMinimap(){
  const s=1.5,R=88;
  mmc.imageSmoothingEnabled=false;mmc.fillStyle='#123';mmc.fillRect(0,0,176,176);
  mmc.save();mmc.translate(R,R);mmc.rotate(P.yaw);
  if(G.dg)drawDungeonMinimap();   // dentro da dungeon, o minimapa mostra a planta da ala (sem marcar inimigos)
  else mmc.drawImage(WORLD.mapCanvas,-P.x*s,-P.z*s,W*s,W*s);
  for(const c of G.dg?[]:WORLD.cities.filter(mundoCityMark)){
    const x=(c.cx-P.x)*s,y=(c.cz-P.z)*s;
    mmc.fillStyle=mundoCityCol(c);
    mmc.strokeStyle='#fff';mmc.lineWidth=2;mmc.beginPath();mmc.rect(x-6,y-6,12,12);mmc.fill();mmc.stroke();
  }
  if(!G.dg)for(const p of WORLD.pois||[]){if(p.type==='ruins'||!poiVisible(p))continue;const x=(p.cx-P.x)*s,y=(p.cz-P.z)*s;mmc.fillStyle=poiCss(p.owner);mmc.strokeStyle=POI_BORDER;mmc.lineWidth=1.3;mmc.beginPath();mmc.rect(x-4.5,y-4.5,9,9);mmc.fill();mmc.stroke()}   // POIs (cor do dono)
  if(!G.dg&&WORLD.tileCompose&&G.creative)tileMarkDraw(mmc,(wx,wz)=>[(wx-P.x)*s,(wz-P.z)*s],TILE_MARK.mini,1);   // círculos do principal (ciano) e dos donos (azul/vermelho) no cenário de tile (tilecompose.js)
  if(!G.dg)battleMarks(mmc,(wx,wz)=>[(wx-P.x)*s,(wz-P.z)*s],s,1,false);   // raios e geradores da batalha (battle.js)
  if(!G.dg)warFrontDrawMini(mmc,s);   // rota da frente da guerra (warfront.js; liga/desliga em WAR.front.minimap)
  {const ct=G.dg?null:cvbTarget();if(ct){let x=(ct.x-P.x)*s,y=(ct.z-P.z)*s;const L=Math.hypot(x,y),maxL=62;if(L>maxL){x*=maxL/L;y*=maxL/L}drawStar(mmc,x,y,7)}}   // caravana sendo saqueada
  if(!G.dg)for(const a of ALLIES)if(a.alive){mmc.fillStyle='#4aa0ff';mmc.fillRect((a.x-P.x)*s-2,(a.z-P.z)*s-2,4,4)}
  if(!G.dg)for(const e of ENEMIES)if(e.alive&&e.city.state==='attacking'){mmc.fillStyle='#ff2a2a';mmc.fillRect((e.x-P.x)*s-1.5,(e.z-P.z)*s-1.5,3,3)}
  mmc.restore();drawCompassRim(mmc,88,88,77,P.yaw);
  {const cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);
    for(const c of WORLD.cities){if(Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))>c.half+40)continue;
      for(const ic of cityIcons(c)){const dx=(ic.x-P.x)*s,dz=(ic.z-P.z)*s,rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;if(Math.hypot(rx,ry)>R-16)continue;drawIcon(mmc,R+rx,R+ry,ic,7)}}}
  mmc.fillStyle='#fff';mmc.strokeStyle='#000';mmc.lineWidth=2;mmc.beginPath();mmc.moveTo(R,R-8);mmc.lineTo(R+6,R+6);mmc.lineTo(R,R+3);mmc.lineTo(R-6,R+6);mmc.closePath();mmc.fill();mmc.stroke();
  {const rm=G.dg?null:rebMarker();if(rm){const dx=(rm.x-P.x)*s,dz=(rm.z-P.z)*s,cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);let rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;const L=Math.hypot(rx,ry);if(L>77){rx*=77/L;ry*=77/L}drawStar(mmc,R+rx,R+ry,8,'#ff3a2a')}}   // marcador da rebelião a resolver (vermelho; no aro quando longe)
  for(const pm of G.dg?[]:poiX().marks){{const dx=(pm.x-P.x)*s,dz=(pm.z-P.z)*s,cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);let rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;const L=Math.hypot(rx,ry);if(L>77){rx*=77/L;ry*=77/L}drawQuery(mmc,R+rx,R+ry,7)}}   // pontos de interesse da vigia ("?")
  {const qt=G.dg?null:questTarget();if(qt){const dx=(qt.x-P.x)*s,dz=(qt.z-P.z)*s,cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);let rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;const L=Math.hypot(rx,ry);if(L>77){rx*=77/L;ry*=77/L}drawStar(mmc,R+rx,R+ry,7)}}   // fora do alcance a estrela fica no aro, como a rosa dos ventos; perto, fica no local da missão. Sempre por cima de tudo
  if(!G.dg)for(const p of markedPortals()){   // portal dourado: losango que se comporta como a estrela de missão (no aro quando longe, no local quando perto; por cima de tudo)
    const dx=(p.x-P.x)*s,dz=(p.z-P.z)*s,cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);let rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;const L=Math.hypot(rx,ry);if(L>77){rx*=77/L;ry*=77/L}
    drawGoldDiamond(mmc,R+rx,R+ry,7,p.rescue?'#5ad0ff':undefined);
  }
}
function drawCompassRim(ctx,cx,cy,r,yaw){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  ctx.font='bold 12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
  for(const [t,x,y,col] of[['N',0,-1,'#ff6a6a'],['L',1,0,'#ffffff'],['S',0,1,'#ffffff'],['O',-1,0,'#ffffff']]){
    const rx=x*c-y*s,ry=x*s+y*c,px=cx+rx*r,py=cy+ry*r;
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.beginPath();ctx.arc(px,py,8,0,6.283);ctx.fill();
    ctx.fillStyle=col;ctx.fillText(t,px,py+1);
  }
}
function drawRose(g,cx,cy,R){
  g.save();g.translate(cx,cy);
  g.fillStyle='rgba(0,0,0,.55)';g.beginPath();g.arc(0,0,R+22,0,6.283);g.fill();
  g.strokeStyle='rgba(255,255,255,.45)';g.lineWidth=1;g.beginPath();g.arc(0,0,R*0.55,0,6.283);g.stroke();
  // pontas: norte em vermelho, demais em branco
  for(const [x,y,col] of[[0,-1,'#ff4a4a'],[1,0,'#ffffff'],[0,1,'#ffffff'],[-1,0,'#ffffff']]){
    g.fillStyle=col;g.strokeStyle='#000';g.lineWidth=1.5;g.beginPath();g.moveTo(x*R,y*R);g.lineTo(-y*R*0.2,x*R*0.2);g.lineTo(y*R*0.2,-x*R*0.2);g.closePath();g.fill();g.stroke();
  }
  g.font='bold 13px monospace';g.textAlign='center';g.textBaseline='middle';g.lineWidth=3;g.strokeStyle='#000';
  for(const [t,x,y,col] of[['N',0,-1,'#ff6a6a'],['L',1,0,'#fff'],['S',0,1,'#fff'],['O',-1,0,'#fff']]){const px=x*(R+13),py=y*(R+13)+1;g.strokeText(t,px,py);g.fillStyle=col;g.fillText(t,px,py)}
  g.restore();
}
// ---------- marcações dos edifícios principais nos mapas ----------
function cityIcons(c){
  const l=[];
  if(c.shop)l.push({x:c.shop.x,z:c.shop.z,t:'A',col:'#d8503a'});
  if(c.store)l.push({x:c.store.x,z:c.store.z,t:'L',col:'#3aa05a'});
  if(c.tavern)l.push({x:c.tavern.x,z:c.tavern.z,t:'T',col:'#c8873a'});
  if(c.clinic)l.push({x:c.clinic.x,z:c.clinic.z,t:'+',col:'#4ac05a'});
  if(c.barracks)l.push({x:c.barracks.x,z:c.barracks.z,t:'Q',col:'#3a8aff'});
  if(c.recruit)l.push({x:c.recruit.x,z:c.recruit.z,t:'R',col:'#3a8aff'});
  if(c.hall)l.push({x:c.hall.x,z:c.hall.z,t:'P',col:'#ffd23a'});
  if(c.warehouse)l.push({x:c.warehouse.x,z:c.warehouse.z,t:'Z',col:'#d8a85a'});
  if(c.chapel)l.push({x:c.chapel.x,z:c.chapel.z,t:'†',col:'#c8a0ff'});
  return l;
}
function drawIcon(ctx,x,y,ic,r){
  ctx.fillStyle='rgba(0,0,0,.75)';ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();
  ctx.strokeStyle=ic.col;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=ic.col;ctx.font='bold '+Math.round(r*1.3)+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ic.t,x,y+1);
}
// Mapa M: onde ficam os serviços de cada cidade ou vila grande (prefeitura, armazém, armeiro, clínica...): um ícone sobre o mapa; o nome aparece ao passar o mouse (bookmap.js).
// Só nas cidades grandes (cityBig: tile do mundo novo e cenários de tile); o mapa antigo de cidades pequenas fica como era.
function mapServicesDraw(g,s,k){
  for(const c of WORLD.cities){
    if(!cityBig(c))continue;
    for(const key of Object.keys(TXT_MAP_SERVICES)){
      const p=c[key];if(!p||typeof p.x!=='number')continue;
      const x=p.x*s,y=p.z*s,r=6.5*k;g.fillStyle='rgba(20,14,8,0.85)';g.strokeStyle='#e8d6a0';g.lineWidth=1.2;g.beginPath();g.arc(x,y,r,0,6.283);g.fill();g.stroke();
      g.font=Math.round(9*k)+'px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(TXT_MAP_SERVICES[key][0],x,y+0.5);g.textBaseline='alphabetic';
    }
  }
}
function drawBigMap(cvArg,mk){   // cvArg: outro canvas (popup de missão); mk: {x,z,label} marca extra
  const cv=cvArg||$('bigmap');if(!cv)return;
  const g=cv.getContext('2d'),s=cv.width/W,k=Math.max(0.6,Math.min(1,cv.width/640));   // k: o mapa do caderno é menor, então letras e marcas encolhem
  g.imageSmoothingEnabled=false;g.drawImage(WORLD.mapCanvas,0,0,cv.width,cv.height);
  g.font='bold '+Math.round(14*k)+'px monospace';g.textAlign='center';
  for(const c of WORLD.cities){
    if(!mundoCityMark(c))continue;   // mundo novo: tile sem cidade nem vila, sem marcador
    const x=c.cx*s,y=c.cz*s,h=7*k;g.fillStyle=mundoCityCol(c);g.strokeStyle='#fff';g.lineWidth=2;
    g.beginPath();g.rect(x-h,y-h,2*h,2*h);g.fill();g.stroke();
    g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=3;const lbl=c.name+(MP.on?'  '+resIcon(focusOf(c)):'');g.strokeText(lbl,x,y-12*k);g.fillText(lbl,x,y-12*k);   // na escolha de caravana, o ícone do que a cidade troca
  }
  mapServicesDraw(g,s,k);   // serviços das cidades e vilas grandes (ícones e legenda; map-texts.js)
  for(const p of WORLD.pois||[]){if(p.type==='ruins'||!poiVisible(p))continue;const x=p.cx*s,y=p.cz*s,h=5*k;g.fillStyle=poiCss(p.owner);g.strokeStyle=POI_BORDER;g.lineWidth=1.6;g.beginPath();g.rect(x-h,y-h,2*h,2*h);g.fill();g.stroke();
    if(G.poiNames&&p.id!==G.poiFocus){g.font='bold '+Math.round(10*k)+'px monospace';g.fillStyle='#ffe9b0';g.strokeStyle='#000';g.lineWidth=3;g.strokeText(POI_DEFS[p.type].n,x,y-8*k);g.fillText(POI_DEFS[p.type].n,x,y-8*k);g.font='bold '+Math.round(14*k)+'px monospace'}}   // POIs no mapa grande, como as cidades (menores); o nome só aparece se o botão estiver ligado (e, sempre, ao passar o mouse)
  {const pf=(WORLD.pois||[]).find(q=>q.id===G.poiFocus);if(pf){const x=pf.cx*s,y=pf.cz*s;g.strokeStyle='#ffd23a';g.lineWidth=4*k;g.beginPath();g.arc(x,y,(16+3*Math.sin(Date.now()/250))*k,0,6.283);g.stroke();g.fillStyle='#ffe9a0';g.strokeStyle='#000';g.lineWidth=3;g.font='bold '+Math.round(13*k)+'px monospace';g.strokeText(POI_DEFS[pf.type].n,x,y-22*k);g.fillText(POI_DEFS[pf.type].n,x,y-22*k);g.font='bold '+Math.round(14*k)+'px monospace'}}   // POI do cartão "Terras livres" em destaque
  {const cf=WORLD.cities.find(q=>q.id===G.cityFocus);if(cf){const x=cf.cx*s,y=cf.cz*s;g.strokeStyle='#ffd23a';g.lineWidth=4*k;g.beginPath();g.arc(x,y,(20+3*Math.sin(Date.now()/250))*k,0,6.283);g.stroke()}}   // cidade escolhida na aba Guerra do livro (warbook.js)
  if(WORLD.tileCompose&&G.creative)tileMarkDraw(g,(wx,wz)=>[wx*s,wz*s],TILE_MARK.big,k);   // círculos de depuração: só no modo criativo   // idem, no mapa grande (tilecompose.js)
  drawGoldPortals(g,s,0,0,0,true);   // portais dourados no mapa grande
  {const ct=cvbTarget();if(ct){drawStar(g,ct.x*s,ct.z*s,10*k);g.fillStyle='#ffe680';g.strokeStyle='#000';g.lineWidth=3;g.strokeText('Caravana',ct.x*s,ct.z*s-16*k);g.fillText('Caravana',ct.x*s,ct.z*s-16*k)}}
  drawRose(g,cv.width-64*k,64*k,30*k);
  drawPickOverlay(g,s);   // modo de escolha de caravana (bookmap.js)
  warFrontDraw(g,s,k);   // rota e cadeia da frente da guerra (warfront.js)
  {const rm=rebMarker();if(rm){drawStar(g,rm.x*s,rm.z*s,13*k,'#ff3a2a');g.fillStyle='#ff9a8a';g.strokeStyle='#000';g.lineWidth=3;g.strokeText(rm.label,rm.x*s,rm.z*s-18*k);g.fillText(rm.label,rm.x*s,rm.z*s-18*k)}}
  for(const pm of poiX().marks)drawQuery(g,pm.x*s,pm.z*s,11*k)   // "?" da vigia, sem rótulo
  {const qt=questTarget();if(qt){drawStar(g,qt.x*s,qt.z*s,10*k);g.fillStyle='#ffe680';g.strokeStyle='#000';g.lineWidth=3;g.strokeText('Missão ativa',qt.x*s,qt.z*s-16*k);g.fillText('Missão ativa',qt.x*s,qt.z*s-16*k)}}
  battleMarks(g,(wx,wz)=>[wx*s,wz*s],s,k,true);   // raios, geradores e soldados da batalha no Mapa M (battle.js)
  if(mk){drawStar(g,mk.x*s,mk.z*s,13*k,mk.col);g.fillStyle=mk.lcol||'#ffe680';g.strokeStyle='#000';g.lineWidth=3;g.strokeText(mk.label,mk.x*s,mk.z*s-18*k);g.fillText(mk.label,mk.x*s,mk.z*s-18*k)}
  if(!(G.dg||G.office||P.y<UNDER_Y)){g.save();g.translate(P.x*s,P.z*s);g.rotate(-P.yaw);g.scale(k,k);g.fillStyle='#fff';g.strokeStyle='#000';g.beginPath();g.moveTo(0,-9);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();}   // fora do mapa (dungeon, sala do líder, sala de reuniões): sem o indicador do jogador
}


// ---------- Noclip e destravar ----------
function noclipMove(dt,fw,st){
  const k=G.keys,sp=k.ShiftLeft?26:11,sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),cp=Math.cos(P.pitch),sPt=Math.sin(P.pitch);
  P.x=clamp(P.x+((-sy*cp)*fw+cy*st)*sp*dt,2,W-2);P.z=clamp(P.z+((-cy*cp)*fw-sy*st)*sp*dt,2,W-2);
  P.y=Math.max(-900,P.y+(sPt*fw+((k.Space?1:0)-(k.KeyQ?1:0)))*sp*dt);   // noclip: nenhuma colisão, inclusive abaixo do mapa (mundo de baixo)
  P.vx=P.vz=P.vy=0;P.ground=false;
}
function toggleNoclip(){
  G.noclip=!G.noclip;
  toast(G.noclip?'NOCLIP ligado: voe com WASD, Espaço sobe, Q desce, Shift acelera. N para sair.':'Noclip desligado',2500);
  if(!G.noclip){probe(P.x,P.z,P.r,P.y,1.8,1.05);if(GR.blocked)unstuck(false);else{P.vy=0;P.ground=false}}
}
function unstuck(manual){
  let best=null,bd=1e9;
  for(const c of WORLD.cities){if(Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))>c.half+20)continue;
    for(const w of c.walk){const d=Math.hypot(w.x-P.x,w.z-P.z);if(d<bd&&d>0.5){bd=d;best=w}}}
  if(best){P.x=best.x;P.z=best.z;P.y=tH(best.x,best.z)+0.2}
  else{
    let ok=false;
    for(let r=1;r<=30&&!ok;r++)for(let a=0;a<24;a++){const x=P.x+Math.cos(a/24*6.283)*r,z=P.z+Math.sin(a/24*6.283)*r;
      probe(x,z,P.r+0.2,tH(x,z),1.8,1.05);if(!GR.blocked){P.x=x;P.z=z;P.y=GR.g+0.2;ok=true;break}}
  }
  P.vx=P.vz=P.vy=0;P.ground=false;P.camY=P.y;G.noclip=false;
  toast('Você foi reposicionado em um local livre.',2000);
}
let stuckT=0;
function checkStuck(dt){
  if(G.noclip||P.dead||P.y<UNDER_Y)return;   // no mundo de baixo não há "destravar" (usa o terreno de cima)
  probe(P.x,P.z,P.r*0.6,P.y,1.8,1.05);
  if(GR.blocked){stuckT+=dt;if(stuckT>1.5){stuckT=0;unstuck(false)}}else stuckT=0;
}
// ---------- Nuvens e ambientação ----------
const clouds=[];
function initSky(){
  const wm=new THREE.Mesh(new THREE.PlaneGeometry(W*3,W*3),new THREE.MeshLambertMaterial({color:0x2f6fd0,transparent:true,opacity:0.72}));
  wm.rotation.x=-Math.PI/2;wm.position.set(W/2,SEA-0.2,W/2);scene.add(wm);
  const rng=new RNG(WORLD.seed+5);
  for(let i=0;i<46;i++){
    const g=new THREE.Group();
    for(let k=0;k<rng.int(3,6);k++)part(g,GEO_BOX,rng.range(6,14),2,rng.range(5,9),0xffffff,rng.range(-8,8),rng.range(-0.4,0.4),rng.range(-5,5)).material=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.88});
    g.position.set(rng.range(-60,W+60),rng.range(70,95),rng.range(-60,W+60));scene.add(g);clouds.push(g);
  }
}

// ---------- Loop principal ----------
const clock=new THREE.Clock();
function update(dt){
  G.t+=dt;NAV.budget=3;
  if(!P.dead)updatePlayer(dt);
  updateWeapons(dt);
  updateActors(dt);updateAllies(dt);updateCritters(dt);updateWild(dt);updateChests(dt);updateDayNight(dt);updateQuests(dt);
  updateFx(dt);checkStuck(dt);updateInventory(dt);updateFishing(dt);updateVendors();updatePortals(dt);updateRaids(dt);updateBattle(dt);updateRounds(dt);
  updateInteract();facPatrol();rebWatch();gevTick(dt);
  // recuo: cidade em ataque se o jogador se afastou demais
  for(const c of WORLD.cities)if(c.state==='attacking'&&Math.hypot(c.cx-P.x,c.cz-P.z)>170){c.state='idle';c.crime=false;toast('Você recuou. Os inimigos voltam aos postos.',2500);for(const e of c.enemies)if(e.alive){e.hp=e.maxhp}}
  for(const w of WORLD.windmills)w.rotation.z+=dt*0.9;
  for(const c of WORLD.cities)c.flags.forEach((f,i)=>{f.rotation.y=Math.sin(G.t*3+i)*0.18});
  for(const cl of clouds){cl.position.x+=dt*1.5;if(cl.position.x>W+80)cl.position.x=-80}
  const cx=camera.position.x,cz=camera.position.z;
  for(const m of WORLD.chunkMeshes){const dx=m.userData.cx-cx,dz=m.userData.cz-cz;m.visible=dx*dx+dz*dz<245*245}
  updateLeafFade();
  updateHUD(dt);
}
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,clock.getDelta());
  updateMusic(dt);
  const t0=performance.now();
  if(G.running&&!G.panel&&!(typeof WM!=='undefined'&&WM.open)){if(G.frozen)camera.rotation.set(P.pitch,P.yaw,0);else update(dt)}
  const t1=performance.now();
  if(typeof wm3Frame==='function')wm3Frame(dt);   // mapa mundi 3D (ui/mundo3d.js): câmera e seleção quando aberto
  renderer.render(scene,camera);
  if(typeof tileTestSample==='function')tileTestSample(t1-t0,performance.now()-t1,G.running&&!G.panel);   // tempos do quadro (só mede no cenário ?cenario=batalha)
}

// ---------- Início ----------
async function startGame(creative,loadData){
  G.creative=creative===true;$('creativeBox').classList.toggle('hidden',!G.creative);$('ptabsC').classList.toggle('hidden',!G.creative);pauseTab('geral');
  resetState();G.startBio=$('biosel').value;
  initAudio();if(AC){AC.resume();initMusic()}
  const q=new URLSearchParams(location.search);
  const sv=$('seed').value.trim();
  const seed=sv?(/^\d+$/.test(sv)?(+sv>>>0):hashStr(sv)):((Math.random()*4294967296)>>>0);
  if(G.creative){setGod(true);G.noReload=true}   // modo criativo: invencível, munição infinita e disparo infinito por padrão (dá para desligar na pausa)
  $('playbtn').disabled=true;$('createbtn').disabled=true;
  if(loadData){if(loadData.state&&loadData.state.fac)STATE.fac=Object.assign(STATE.fac||{},loadData.state.fac)   // save: identidade do jogador e cores das NPC já valem na geração do mundo
    if(loadData.state&&mapMundoOn()){   // mundo novo: o grafo e o tile carregado (STATE.wt.local) também
      if(loadData.state.wg)STATE.wg=loadData.state.wg;wtApply(loadData.state.wt);STATE.tiles=loadData.state.tiles||{}}}   // (o dono de cada tile já vale na geração: STATE.tiles)
  else if((!q.get('auto')&&!q.get('cenario'))||q.get('fac'))await facCreateScreen();   // partida nova: tela de criação da facção antes de gerar o mundo (?auto=1 pula; ?fac=1 força)
  const msg=m=>{$('loadmsg').textContent=m};
  try{
    await genWorld(seed,msg,$('biosel').value);
    msg('Populando cidades...');await tick();
    msg('Calculando rotas...');await tick();buildNav();initWeapons();buildViewmodels(camera);initFx();initSky();initDayNight();populateCities();populateWild();placePlayerHome();
    syncOwned();ensureEquipped();genFishSpots();
    if(loadData){applySave(loadData);if(mapMundoOn())mundoCityRestore();applyFishGone();rebuildPortals();rebuildSmoke()}
    else{RAID.active=false;RAID.area=null;STATE.rd.hallCity=WORLD.home.id;G.introBook=true}   // partida nova: começa dentro da prefeitura (rodada 0) com o livro aberto no resumo
    prepThin();refreshHotbar();refreshBuffs();fishClean();
    G.running=true;$('hud').classList.remove('hidden');initEconomy();scenarioApply();cityWallSync();rebuildCaravans();refreshRoundHud();   // scenarioApply: só com ?cenario=caravanas (scenario.js)
    if(!loadData&&G.introBook){STATE.phase='leader';STATE.rd.actions=maxActions();refreshRoundHud()}   // partida nova: começa no turno do líder (rodada 0, sem decisões)
    if(STATE.phase==='leader'||G.introBook){if(OFFICE.ok)enterOffice(true);else if(G.introBook)placeAtHall()}
    refreshCheats();scenarioAfter();
    $('seed').value=String(seed);
    document.querySelector('#pause h2').textContent=(loadData?'✔ JOGO CARREGADO — semente ':'✔ MUNDO PRONTO — semente ')+seed;
    const ent=G.tileEnter;G.tileEnter=null;if(mundoAfterStart(ent))return;   // mundo novo: entrou num tile ou o turno está no mapa mundi (ui/mundoturno.js)
    openPanel('pause');
    toast('Mapa: '+WORLD.shapeName+' ('+DOM_NAMES[WORLD.dominant]+' predominante).  Bem-vindo a '+WORLD.home.name+'! Visite o armeiro e a clínica; depois ataque as cidades vizinhas.',6000);
  }catch(err){
    console.error(err);msg('Erro: '+err.message);$('playbtn').disabled=false;$('createbtn').disabled=false;mundoLoadHide();
  }
}
$('playbtn').onclick=()=>startGame(false);$('createbtn').onclick=()=>startGame(true);
(function(){
  const q=new URLSearchParams(location.search);
  if(q.get('seed'))$('seed').value=q.get('seed');else if(q.get('cenario'))$('seed').value='11';   // o cenário usa a semente 11
  if(q.get('bio'))$('biosel').value=q.get('bio');
  let ls=null;try{ls=sessionStorage.getItem('fc_loadslot');sessionStorage.removeItem('fc_loadslot')}catch(e){}
  const ent=mundoEnterTake(),ed=ent&&migrateSave(ent.d);   // mundo novo: a página recarregou para gerar o tile em que o jogador entrou (ui/mundoturno.js mundoGo)
  if(ed){mundoLoadShow(ent.nome,ent.col);G.tileEnter=true;$('seed').value=String(ed.seed);$('biosel').value=ed.bio||'';setTimeout(()=>startGame(!!ed.creative,ed),50)}
  else if(ls)setTimeout(()=>startFromSave(+ls),200);          // carregar de dentro do jogo: a página recarregou e inicia direto do salvamento
  else if(q.get('load'))setTimeout(()=>startFromSave(+q.get('load')),200);   // ?load=1 carrega o espaço 1 (testes)
  else if(q.get('cenario')&&q.get('cenario')!=='mundo3d')setTimeout(()=>startGame(true),200);   // ?cenario=caravanas: modo criativo, sem tela de criação
  else if(q.get('auto'))setTimeout(()=>startGame(q.get('auto')!=='normal'),200);   // ?auto=1 inicia no modo criativo (testes); ?auto=normal inicia o normal
})();
frame();



// ---------- abas da tela de opções (pausa) ----------
let pauseTabName='geral';
function pauseTab(name){
  if(!G.creative&&name!=='geral')name='geral';
  pauseTabName=name;
  document.querySelectorAll('#pause .ppage').forEach(p=>p.classList.toggle('hidden',p.dataset.pp!==name));
  document.querySelectorAll('#ptabs button').forEach(b=>b.classList.toggle('sel',b.dataset.pt===name));
  if(name==='rod')refreshPolicyCheats();
  if(name==='facs')renderFacCheats();
  if(name==='locs')renderLocs();
}
// aba Locais (modo criativo): botões de teleporte para os edifícios de tipo das cidades, as cidades e os POIs do mapa
function renderLocs(){
  const box=$('locscheat');if(!box)return;
  if(!WORLD.cities){box.textContent='Gere o mundo primeiro.';return}
  const b=(k,t)=>'<button class="alt" data-loc="'+k+'">'+t+'</button> ',h=t=>'<p class="ldsm" style="margin:10px 0 4px"><b>'+t+'</b></p>';
  const nm=c=>c.name+(c.home?' (capital)':'');
  let s=h('🏭 Edifício de tipo (por dentro)');
  for(const c of WORLD.cities)if(c.works)s+=b('w'+c.id,(WORKS[c.works.type]||{n:c.works.type}).n+' — '+nm(c));
  s+=h('🏘 Cidades')+WORLD.cities.map(c=>b('c'+c.id,nm(c))).join('');
  s+=h('⛺ Acampamentos de bandidos')+WORLD.camps.filter(k=>!k.gone).map((k,i)=>b('k'+k.id,'#'+(i+1)+(k.state==='cleared'?' (limpo)':''))).join('');
  s+=h('🕳 Grutas')+WORLD.caves.map((k,i)=>b('g'+k.id,'#'+(i+1))).join('');
  s+=h('🏗 POIs')+(WORLD.pois||[]).map(p=>b('o'+p.id,POI_DEFS[p.type].ic+' '+POI_DEFS[p.type].n+' — '+poiOwnerName(p.owner))).join('');
  s+=h('🌀 Portais')+(STATE.portals&&STATE.portals.length?STATE.portals.map((p,i)=>b('p'+i,'#'+(i+1))).join(''):'<small>Nenhum ativo (aba Mundo → "Criar portais agora").</small>');
  s+='<p class="ldsm" style="margin-top:10px">Os POIs novos da guerra (fazenda, mina, ponte, forte...) ainda não existem no jogo.</p>';
  box.innerHTML=s;
}
document.addEventListener('click',e=>{
  const bt=e.target.closest('#locscheat button');if(!bt||!bt.dataset.loc)return;
  const k=bt.dataset.loc,t=k[0],id=+k.slice(1);let x,z,y;
  if(t==='w'){const c=WORLD.cities.find(q=>q.id===id);if(!c||!c.works)return;x=c.works.x;z=c.works.z;y=tH(x,z)+0.3}
  else if(t==='c'){const c=WORLD.cities.find(q=>q.id===id);if(!c)return;x=c.cx+c.S+2.5;z=c.cz+c.P-2;y=tH(x,z)+0.3}
  else if(t==='o'){const o=WORLD.pois.find(q=>q.id===id);if(!o)return;x=o.cx;z=o.cz+poiR(o)+4;y=tH(x,z)+0.3}
  else if(t==='p'){const p=STATE.portals[id];if(!p)return;x=p.x+4;z=p.z;y=tH(x,z)+0.3}
  else{const a=(t==='k'?WORLD.camps:WORLD.caves).find(q=>q.id===id);if(!a)return;x=a.cx+6;z=a.cz;y=tH(x,z)+0.3}
  if(G.office)leaveOffice();   // no turno do Líder o jogador está no escritório: sai primeiro (o mundo só aparece fora dele)
  P.x=x;P.z=z;P.y=y;P.vx=P.vz=P.vy=0;P.camY=P.y;closePanel();
});
document.addEventListener('click',e=>{const b=e.target.closest('#ptabs button');if(b&&b.dataset.pt)pauseTab(b.dataset.pt)});
// aba Rodadas: lista de eventos para invocar (só no turno do Líder) e o resumo da política atual
function refreshPolicyCheats(){
  const sel=$('polsel');if(!sel||typeof POL==='undefined')return;
  if(!sel.options.length){const o=document.createElement('option');o.value='';o.textContent='🎲 Sortear (aleatório)';sel.appendChild(o);for(const d of POL.defs){const x=document.createElement('option');x.value=d.id;x.textContent=d.name;sel.appendChild(x)}}
  const lead=STATE.phase==='leader';
  $('polbox').classList.toggle('hidden',!lead);$('polhint').style.display=lead?'none':'block';
  $('polstatus').innerHTML=typeof polInfoHtml==='function'?polInfoHtml():'';
}

// marcador do portal dourado (política Dungeon dourada): losango dourado no minimapa e no mapa grande (com o nome)
function drawGoldDiamond(ctx,x,y,r,col){ctx.fillStyle=col||'#ffd23a';ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();ctx.stroke()}
function drawGoldPortals(ctx,s,px,pz,maxL,big){
  for(const p of markedPortals()){
    let x,y;
    if(big){x=p.x*s;y=p.z*s}else{x=(p.x-px)*s;y=(p.z-pz)*s;const L=Math.hypot(x,y);if(L>maxL){x*=maxL/L;y*=maxL/L}}
    const r=big?10:6;
    ctx.fillStyle=p.rescue?'#5ad0ff':'#ffd23a';ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y-r);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();ctx.stroke();
    if(big){const lb=p.rescue?'Portal de resgate':'Portal dourado';ctx.font='bold 14px monospace';ctx.textAlign='center';ctx.fillStyle=p.rescue?'#b0f0ff':'#ffe680';ctx.lineWidth=3;ctx.strokeText(lb,x,y-r-5);ctx.fillText(lb,x,y-r-5)}
  }
}
