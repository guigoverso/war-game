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
function sfx(name,dist){
  if(!AC||AC.state==='suspended'&&AC.resume())return;
  const v=clamp(1-(dist||0)/120,0,1);if(v<0.03)return;
  if(v>0.35&&typeof AMB!=='undefined'&&/^(pistol|smg|rifle|shotgun|sniper|launcher|boom)$/.test(name))AMB.hush=AMB.clock+14;   // tiros calam pássaros, grilos e conversas
  switch(name){
    case'pistol':nzs(0.12,0.7*v,3500);tn(190,0.08,'square',0.2*v,60);break;
    case'smg':nzs(0.07,0.5*v,4500);tn(150,0.05,'square',0.12*v,70);break;
    case'rifle':nzs(0.1,0.7*v,2800);tn(120,0.1,'sawtooth',0.2*v,50);break;
    case'shotgun':nzs(0.3,1*v,1800);tn(90,0.2,'square',0.3*v,40);break;
    case'sniper':nzs(0.45,1*v,1400);tn(70,0.35,'sawtooth',0.4*v,30);break;
    case'launcher':nzs(0.35,0.8*v,900);tn(110,0.3,'sawtooth',0.3*v,40);break;
    case'boom':nzs(1.0,1*v,700);tn(60,0.8,'sine',0.7*v,22);break;
    case'kill':tn(660,0.08,'square',0.12,0);setTimeout(()=>AC&&tn(990,0.1,'square',0.12),70);break;
    case'hit':tn(1300,0.04,'square',0.1);break;
    case'coin':tn(1200,0.07,'square',0.15);setTimeout(()=>AC&&tn(1700,0.12,'square',0.15),70);break;
    case'reload':nzs(0.05,0.3,6000);setTimeout(()=>AC&&nzs(0.05,0.3,5000),180);break;
    case'empty':tn(220,0.05,'square',0.1);break;
    case'alarm':tn(520,0.35,'sawtooth',0.2,330);setTimeout(()=>AC&&tn(520,0.35,'sawtooth',0.2,330),400);break;
    case'beep':tn(1500,0.06,'square',0.15);break;
    case'beep1':tn(1100,0.14,'square',0.3);break;
    case'beep2':tn(1400,0.14,'square',0.34);break;
    case'beep3':tn(1800,0.18,'square',0.38);break;
    case'slam':nzs(0.3,0.8*v,500);break;
    case'hurt':tn(160,0.15,'sawtooth',0.3,70);break;
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
  MUS.calm.gain.setTargetAtTime(0.9*(1-MUS.mix),t,0.4);MUS.comb.gain.setTargetAtTime(0.9*MUS.mix,t,0.4);
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

function toast(msg,ms){
  const d=document.createElement('div');d.className='toast';d.textContent=msg;const box=$('toasts');box.appendChild(d);
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
  if(P.armor>0){const ab=Math.min(P.armor,dmg*0.6);P.armor-=ab;dmg-=ab}
  P.hp-=dmg;G.hurtT=0.45;sfx('hurt',0);
  const dx=fx-P.x,dz=fz-P.z,s=Math.sin(P.yaw),c=Math.cos(P.yaw);
  const dot=dx*(-s)+dz*(-c),rt=dx*c-dz*s,ang=Math.atan2(rt,dot);
  const id=Math.abs(ang)<Math.PI/4?'eT':Math.abs(ang)>3*Math.PI/4?'eB':ang>0?'eR':'eL';
  $(id).style.opacity=1;setTimeout(()=>$(id).style.opacity=0,350);
  if(P.hp<=0){P.hp=0;die()}
}
function die(){P.dead=true;G.fireHeld=false;G.aiming=false;openPanel('dead')}
function respawn(){
  if(G.dg)leaveDungeon(true);
  P.dead=false;P.hp=P.maxhp;P.armor=0;P.coins=P.coins>0?Math.floor(P.coins*0.9):P.coins;P.crouch=false;P.regen=null;fishClean();
  for(const c of WORLD.cities)if(c.state==='attacking'){c.state='idle';for(const e of c.enemies)if(e.alive){e.hp=e.maxhp;e.x=e.homeX;e.z=e.homeZ;e.y=tH(e.x,e.z)}}
  placePlayerHome();closePanel();
}
function placePlayerHome(){
  const c=WORLD.home;const cand=[[c.S+2.5,c.P-2],[-c.S-2.5,c.P-2],[c.S+2.5,-c.P+2],[0,c.P-1],[c.P-1,0],[-c.P+1,0]];
  for(const q of cand){const x=c.cx+q[0],z=c.cz+q[1];probe(x,z,0.5,tH(x,z),1.8,1.05);if(!GR.blocked){P.x=x;P.z=z;P.y=GR.g;P.yaw=Math.atan2(c.cx-x,c.cz-z)+Math.PI;P.pitch=0;P.vx=P.vz=0;P.camY=P.y;return}}
  P.x=c.cx+6;P.z=c.cz+6;P.y=tH(P.x,P.z)+1;P.camY=P.y;
}
function conquerCity(c){
  c.owner='player';c.state='conquered';c.flagMat.color.setHex(0x2a6aff);armyConquered(c);
  const reward=120+60*c.rank;addCoins(reward);
  const n=WORLD.cities.filter(x=>x.owner==='player').length;
  toast('🏴 '+c.name+' CONQUISTADA! +'+reward+' moedas  ('+n+'/7)',5000);sfx('coin',0);
  if(n>=7&&!G.won){G.won=true;sfx('win',0);setTimeout(()=>openPanel('victory'),3000)}
}

// ---------- Painéis ----------
const SCREENS=['start','shop','clinic','barracks','quests','pause','map','dead','victory','store','cook','raid','ldbook'];
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
  MP.on=false;updatePickBanner();
  SCREENS.forEach(s=>$(s).classList.add('hidden'));G.panel=null;
  try{const p=canvas.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(e){}
}
// ---------- preços por cidade ----------
// cidade inimiga: ×2 • cidade conquistada: desconto crescente com o nível • cidade inicial: o menor preço entre as conquistadas
const DISCOUNT=[0,0.10,0.15,0.20,0.25,0.30,0.35];
function cityMul(c){
  if(!c)return 1;
  if(c.owner==='enemy')return 2;
  if(c.home){let m=1;for(const k of WORLD.cities)if(k.owner==='player'&&!k.home)m=Math.min(m,1-DISCOUNT[k.rank]);return m}
  return 1-DISCOUNT[c.rank];
}
// o preço passa pela função única priceOf (state.js), que encadeia modificadores; a cidade é o primeiro deles
addPriceMod('city',(p,ctx)=>p*cityMul(ctx.city),10);
const pc=(base,c,kind)=>priceOf(base,{city:c,kind});
function priceLabel(c){const m=cityMul(c);return m>1?'Cidade inimiga: preços ×2':m<1?'Desconto de '+Math.round((1-m)*100)+'% nesta cidade':'Preço normal'}
function mulTag(c){const m=cityMul(c);return m>1?' (preço ×2)':m<1?' (−'+Math.round((1-m)*100)+'%)':''}
function openShop(c){G.shopCity=c;G.shopTab='weapons';openPanel('shop');renderShop()}
function renderShop(){
  const c=G.shopCity;
  $('shopcoins').textContent='◉ '+P.coins+' moedas  •  '+priceLabel(c);
  const weaponsHtml=WEAPONS.map((w,i)=>{
    const own=WS.owned[i],pr=pc(w.price,c,'weapon'),pk=pc(w.packCost,c,'ammo');
    return '<div class="card'+(own?'':' locked')+'"><b>'+(i+1)+'. '+w.name+'</b><div class="st">'+w.desc+'<br>Dano '+w.dmg+(w.pellets>1?' ×'+w.pellets:'')+' • '+w.rpm+' dpm • Pente '+w.mag+'</div>'+
      (own?'<div class="st">Munição reserva: '+WS.reserve[i]+'<br>Durabilidade: '+(weaponBroken(i)?'<b style="color:#ff6a6a">QUEBRADA</b>':Math.round(durOf(i))+'%')+'</div><button data-a="ammo" data-i="'+i+'" '+(P.coins<pk?'disabled':'')+'>+'+w.pack+' munição ◉'+pk+'</button>'+(durOf(i)<100?'<button data-a="repair" data-i="'+i+'">🔧 Consertar ◉'+repairCost(i,c)+(P.coins<repairCost(i,c)?' (gera dívida)':'')+'</button>':'')
          :'<button class="gold" data-a="buy" data-i="'+i+'" '+(P.coins<pr?'disabled':'')+'>Comprar ◉'+pr+'</button>')+'</div>';
  }).join('');
  const utilsHtml='<div class="card"><b>🛡 Colete à prova de bala</b><div class="st">Absorve 60% do dano recebido até acabar (100 de proteção).<br>Proteção atual: '+Math.ceil(P.armor)+'/100</div><button class="gold" data-a="vest" '+(P.coins<pc(180,c)||P.armor>=100?'disabled':'')+'>Comprar ◉'+pc(180,c)+'</button></div>'
    +'<div class="card"><b>🎒 Ampliar a bolsa</b><div class="st">+'+(INV_UPGRADED-INV_BASE)+' espaços ('+INV_BASE+' → '+INV_UPGRADED+'). Só pode ser feito uma vez.</div>'
    +(STATE.inv.upgraded?'<button disabled>Bolsa já ampliada ✔</button>':'<button class="gold" data-a="bag" '+(P.coins<pc(INV_UP_COST,c,'upgrade')||Ledger.anyDebt()?'disabled':'')+'>Ampliar ◉'+pc(INV_UP_COST,c,'upgrade')+'</button>')+'</div>';
  const tab=G.shopTab||'weapons';
  $('shoptabs').innerHTML=[['weapons','🔫 Armas'],['utils','🛠 Úteis']].map(t=>'<button class="'+(tab===t[0]?'gold':'alt')+'" data-tab="'+t[0]+'">'+t[1]+'</button>').join('');
  $('shopgrid').innerHTML=tab==='utils'?utilsHtml:weaponsHtml;
}
$('shoptabs').addEventListener('click',e=>{const b=e.target.closest('button');if(b&&b.dataset.tab){G.shopTab=b.dataset.tab;renderShop()}});
$('shopgrid').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;const c=G.shopCity;
  if(b.dataset.a==='repair'){repairWeapon(+b.dataset.i,c);renderShop();return}
  if(b.dataset.a==='bag'){invUpgrade(pc(INV_UP_COST,c,'upgrade'));renderShop();return}
  if(b.dataset.a==='vest'){const pr=pc(180,c);if(P.coins>=pr&&P.armor<100){P.coins-=pr;P.armor=100;sfx('coin',0);toast('Colete equipado!',1500)}renderShop();return}
  const i=+b.dataset.i,w=WEAPONS[i],pr=pc(w.price,c,'weapon'),pk=pc(w.packCost,c,'ammo');
  if(b.dataset.a==='buy'&&P.coins>=pr){if(giveWeapon(i,true)){P.coins-=pr;sfx('coin',0);toast(w.name+' adquirida!'+(slotOfWeapon(i)>=0?' (barra '+(slotOfWeapon(i)+1)+')':' Está na bolsa: coloque-a na barra 1–6.'),2500)}}
  else if(b.dataset.a==='ammo'&&P.coins>=pk){P.coins-=pk;WS.reserve[i]=Math.min(WS.reserve[i]+w.pack,w.pack*8);sfx('coin',0)}
  renderShop();
});
function openClinic(c){G.clinicCity=c;G.clinicMode='menu';openPanel('clinic');renderClinic()}
const clinicCost=(h,c)=>Math.max(1,Math.round(h*0.5*cityMul(c)*(rbufOn('gold')?0.8:1)));
function renderClinic(){
  const c=G.clinicCity,miss=Math.ceil(P.maxhp-P.hp),full=clinicCost(miss,c),q=Math.min(miss,25),qc=clinicCost(q,c);
  $('clinictxt').innerHTML='Vida: <b>'+Math.ceil(P.hp)+'/'+P.maxhp+'</b> • Moedas: <b>◉ '+P.coins+'</b><br>'+priceLabel(c)+'. Aqui a vida <b>não</b> volta sozinha: cada ponto custa ◉'+(0.5*cityMul(c)*(rbufOn('gold')?0.8:1)).toFixed(2).replace('.',',')+'.';
  const mode=G.clinicMode||'menu',back='<br><button class="alt" data-mode="menu" style="margin-top:8px">← Voltar</button>';
  if(mode==='menu')$('clinicbtns').innerHTML='<p>— Em que posso ajudar?</p><button class="gold" data-mode="heal">❤ Curar</button><button class="gold" data-mode="buy">🛍 Comprar</button>';
  else if(mode==='heal')$('clinicbtns').innerHTML=(miss<=0?'<p>Você está saudável!</p>':'<button class="gold" data-h="'+miss+'" '+(P.coins<full?'disabled':'')+'>Curar tudo (+'+miss+') ◉'+full+'</button><button data-h="'+q+'" '+(P.coins<qc?'disabled':'')+'>+'+q+' vida ◉'+qc+'</button>')+back;
  else $('clinicbtns').innerHTML='<p class="st">Itens de cura (ficam na bolsa; atalhos 7, 8, 9):</p>'
    +Object.values(DATA.items).filter(d=>d.shop==='clinic').map(d=>{const p=pc(d.price,c,'heal');return '<button data-buy="'+d.id+'" '+(P.coins<p||Ledger.anyDebt()?'disabled':'')+'>'+d.icon+' '+d.name+' ◉'+p+'</button>'}).join('')+back;
}
$('clinicbtns').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mode){G.clinicMode=b.dataset.mode;renderClinic();return}
  if(b.dataset.buy){
    const id=b.dataset.buy,d=itemDef(id),p=pc(d.price,G.clinicCity,'heal');
    if(invRoomFor(id)<1)toast('Bolsa cheia! Descarte algo antes de comprar.',2000);
    else if(Ledger.spend({gold:p})){invGive([[id,1]]);sfx('coin',0);toast(d.icon+' '+d.name+' comprada',1500)}
    renderClinic();return;
  }
  const h=+b.dataset.h,cost=clinicCost(h,G.clinicCity);
  if(P.coins>=cost){P.coins-=cost;P.hp=Math.min(P.maxhp,P.hp+h);sfx('coin',0)}renderClinic();
});$('bkclose').onclick=closePanel;$('qclose').onclick=closePanel;$('shopclose').onclick=closePanel;$('clinicclose').onclick=closePanel;$('mapclose').onclick=closePanel;$('vclose').onclick=closePanel;
$('resume').onclick=()=>{document.querySelector('#pause h2').textContent='⏸ PAUSA';if(AC&&AC.state==='suspended')AC.resume();G.introBook=false;closePanel()};$('respawn').onclick=respawn;
function toggleMute(){G.muted=!G.muted;if(master)master.gain.value=G.muted?0:0.35;refreshCheats();toast(G.muted?'Som desligado':'Som ligado',1000)}
function toggleInvis(){G.invis=!G.invis;if(G.invis){for(const e of ENEMIES)e.aggro=false}}
function refreshCheats(){$('cNoWear').textContent='Desgaste das armas: '+(G.noWear?'desligado':'LIGADO');$('ledgerline').textContent='Rodada '+STATE.round+'  •  '+Ledger.summary()+(Ledger.anyDebt()?'  •  ⚠ EM DÍVIDA: compras bloqueadas':'');$('cInvis').textContent='Invisível: '+(G.invis?'LIGADO':'desligado');$('cMute').textContent='Som: '+(G.muted?'desligado':'LIGADO');$('cGod').textContent='Invencível: '+(G.god?'LIGADO':'desligado');$('cAmmo').textContent='Munição infinita: '+(G.infAmmo?'LIGADA':'desligada');$('cMag').textContent='Pente infinito (sem recarregar): '+(G.noReload?'LIGADO':'desligado')}
$('cMute').onclick=toggleMute;
$('cSave').onclick=()=>SaveUI.open('game');
$('loadbtn').onclick=()=>SaveUI.open('load');
$('cRes').onclick=()=>{for(const k of['food','ore','wood'])Ledger.add(k,100);refreshCheats()};
$('cDebt').onclick=()=>{Ledger.borrow({gold:50});refreshCheats()};
$('cRound').onclick=()=>{endRound();refreshCheats();closePanel()};
$('cLeader').onclick=()=>{if(STATE.phase==='leader'||G.office){closePanel();return}STATE.rd.hallCity=WORLD.home.id;beginLeaderTurn();closePanel()};
$('cActions').onclick=()=>{STATE.rd.lvl=Math.min(CAP_MAX_LVL,STATE.rd.lvl+1);toast('Capital nível '+STATE.rd.lvl,1500)};
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
  if(!G.locked&&G.running&&!G.panel){refreshCheats();openPanel('pause')}
});
canvas.addEventListener('mousedown',e=>{
  if(!G.running)return;
  if(!G.locked&&!G.panel){try{canvas.requestPointerLock()}catch(_){}return}
  if(G.office){if(e.button===0&&!G.panel&&nearBook())openBook();return}   // no escritório, clicar diante da mesa abre o livro
  if(G.panel||G.frozen)return;
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
  if(e.code==='KeyM'){if(G.panel==='map')closePanel();else if(!G.panel){drawBigMap();openPanel('map')}return}
  if(G.panel==='shop'||G.panel==='clinic'||G.panel==='barracks'||G.panel==='quests'||G.panel==='store'||G.panel==='cook'||G.panel==='raid'){if(e.code==='KeyE'||e.code==='Escape')closePanel();return}
  if(G.panel==='uiwin'){if(e.code==='Escape'||e.code==='KeyE')UI.closeTop();return}   // janela de confirmação sobre o jogo
  if(G.panel==='ldbook'){if(e.code==='KeyE'||e.code==='Escape'||e.code==='KeyB'){if(!UI.closeTop())closePanel()}return}   // livro: bolsa + decisões
  if(G.panel)return;
  if(G.office){if(e.code==='KeyE'&&!e.repeat)doInteract();return}   // no escritório só se anda e se abre o livro
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
  else if(e.code==='Digit7'||e.code==='Digit8'||e.code==='Digit9')useBar(+e.code.slice(5)-7);
  else if(e.code.startsWith('Digit')){const i=+e.code.slice(5)-1;if(i>=0&&i<WBAR)selectSlot(i)}
});
window.addEventListener('keyup',e=>{G.keys[e.code]=false});
window.addEventListener('blur',()=>{G.keys={};G.fireHeld=false;G.aiming=false});

function doInteract(){
  const t=G.target;if(!t)return;
  if(t.type==='hall')openQuests(t.c);else if(t.type==='barracks')openBarracks(t.c);else if(t.type==='shop')openShop(t.c);else if(t.type==='clinic')openClinic(t.c);else if(t.type==='portal'){if(RAID.active&&!RAID.engaged)toast('Há um ataque em andamento! Defenda a cidade antes.',2500);else enterDungeon(t.p)}else if(t.type==='dgexit')leaveDungeon();else if(t.type==='store')openStore(t.c,'store');else if(t.type==='tavern')openStore(t.c,'tavern');else if(t.type==='stove')openCooking('tavern');else if(t.type==='fire')openCooking('fire');else if(t.type==='npc')npcTalk(t.n);else if(t.type==='chest')openChest(t.ch);else if(t.type==='cage')openCage(t.c);else if(t.type==='book')openBook();else if(t.type==='leader')hallRoundAction(t.c);
}
function updateInteract(){
  G.target=null;G.attackCity=null;G.curCity=null;const lines=[];
  let bestD=1e9;
  for(const c of WORLD.cities){
    const d=Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz));
    if(d<c.half+8&&d<bestD){bestD=d;G.curCity=c}
    if(d>c.half+25)continue;
    if(c.shop){const ds=Math.hypot(P.x-c.shop.x,P.z-c.shop.z);if(ds<4.5){G.target={type:'shop',c};lines.push('[E] Comprar armas e munição'+mulTag(c))}}
    if(c.barracks){const ds=Math.hypot(P.x-c.barracks.x,P.z-c.barracks.z);if(ds<4.5){G.target={type:'barracks',c};lines.push('[E] Quartel: recrutar e equipar soldados'+mulTag(c))}}
    if(c.clinic){const ds=Math.hypot(P.x-c.clinic.x,P.z-c.clinic.z);if(ds<4.5){G.target={type:'clinic',c};lines.push('[E] Clínica: curar ferimentos'+mulTag(c))}}
    if(c.store){const ds=Math.hypot(P.x-c.store.x,P.z-c.store.z);if(ds<4.5){G.target={type:'store',c};lines.push('[E] Loja: vender e comprar itens')}}
    if(c.tavern){const ds=Math.hypot(P.x-c.tavern.x,P.z-c.tavern.z);if(ds<3.2){G.target={type:'tavern',c};lines.push('[E] Taverneiro: comprar comida pronta')}}
    if(c.stove){const ds=Math.hypot(P.x-c.stove.x,P.z-c.stove.z);if(ds<3.0){G.target={type:'stove',c};lines.push('[E] Fogão: cozinhar')}}
    if(c.hall){const ds=Math.hypot(P.x-c.hall.x,P.z-c.hall.z);if(ds<4.5&&Math.abs(P.y-c.y)<2.6){if(c.owner==='player'){G.target={type:'hall',c};lines.push('[E] Prefeitura: quadro de missões')}else lines.push('🔒 Prefeitura fechada — conquiste a cidade')}}
    if(c.owner==='enemy'&&c.state==='idle'&&d<c.half+10){G.attackCity=c;lines.push('[F] ATACAR '+c.name.toUpperCase())}
  }
  for(const c of WORLD.camps){if(c.gone)continue;const d=Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz));if(d<c.half+8&&d<bestD){bestD=d;G.curCity=c}
    if(c.firePos&&Math.hypot(P.x-c.firePos.x,P.z-c.firePos.z)<3.4){G.target={type:'fire',c};lines.push('[E] Fogueira: cozinhar')}
    if(c.cage&&!c.cage.opened&&Math.hypot(P.x-c.cage.dp.x,P.z-c.cage.dp.z)<2.8){G.target={type:'cage',c};lines.push(c.state==='cleared'?'[E] Abrir a grade e libertar o refém':'🔒 Grade trancada — elimine os bandidos')}}
  for(const c of WORLD.cities)if(c.leader&&c.owner==='player'&&Math.hypot(P.x-c.leader.x,P.z-c.leader.z)<4.8&&Math.abs(P.y-c.leader.y)<2.6){G.target={type:'leader',c};lines.push('[E] Falar com o líder: encerrar o turno do comandante')}
  if(nearBook()){G.target={type:'book'};lines.push('[E] Abrir o livro de decisões')}
  {const pp=portalNear();if(pp){G.target={type:'portal',p:pp};lines.push('[E] Entrar no portal — dungeon nível '+pp.tier+' • recompensa: '+rewardText(pp))}}
  if(G.dg&&G.dgPad&&Math.hypot(P.x-G.dgPad.x,P.z-G.dgPad.z)<2.6){G.target={type:'dgexit'};lines.push('[E] Sair da dungeon (volta ao portal)')}
  for(const ch of WORLD.chests){if(ch.opened)continue;const d=Math.hypot(ch.x-P.x,ch.z-P.z);if(d<2.8&&Math.abs(ch.y-P.y)<2){G.target={type:'chest',ch};lines.push(ch.lockedBy&&ch.lockedBy.state!=='cleared'?'🔒 Baú trancado — elimine os bandidos':'[E] Abrir baú')}}
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
function updatePlayer(dt){
  const k=G.keys;
  const fw=(k.KeyW?1:0)-(k.KeyS?1:0),st=(k.KeyD?1:0)-(k.KeyA?1:0);
  const sprint=k.ShiftLeft&&fw>0&&!P.crouch&&!G.aiming;
  let spd=P.crouch?2.4:sprint?8.2:5;if(G.aiming)spd*=0.65;spd*=buffMul('speed');
  const water=P.y<SEA-0.3&&tH(P.x,P.z)<SEA&&!inDungeonRegion();if(water)spd*=0.6;
  const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw);
  let wx=-sy*fw+cy*st,wz=-cy*fw-sy*st;const l=Math.hypot(wx,wz);if(l>0){wx/=l;wz/=l}
  const acc=P.ground?14:3.5;
  P.vx+=(wx*spd-P.vx)*Math.min(1,acc*dt);P.vz+=(wz*spd-P.vz)*Math.min(1,acc*dt);
  const hgt=P.crouch?1.2:1.8;
  if(G.noclip)noclipMove(dt,fw,st);else moveXZ(P,P.vx*dt,P.vz*dt,P.r,hgt,1.05);
  P.speed=Math.hypot(P.vx,P.vz);
  if(k.Space&&P.ground&&!P.crouch&&!G.noclip){P.vy=7.8;P.ground=false}
  if(!G.noclip)moveY(P,dt,P.r,hgt,1.05);
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
  STATE.inv.wbar.forEach((id,i)=>{const d=id&&itemDef(id);$('ws'+i).className='ws'+(id?' own':'')+(i===eq?' cur':'');$('ws'+i).textContent=d?d.icon:(i+1)});
  $('god').classList.toggle('hidden',!G.god);$('invis').classList.toggle('hidden',!G.invis);
  $('crouchtag').classList.toggle('hidden',!P.crouch);
  let inCover=false;
  if(P.crouch&&!G.peek){let any=false,seen=false;for(const e of ENEMIES)if(e.alive&&e.city.state==='attacking'&&Math.hypot(e.x-P.x,e.z-P.z)<90){any=true;if(e.sees)seen=true}inCover=any&&!seen}
  $('cover').classList.toggle('hidden',!inCover);
  G.hurtT=Math.max(0,G.hurtT-dt);$('flash').style.opacity=Math.min(1,G.hurtT*2.2+(P.hp<30&&!P.dead?0.25+Math.sin(G.t*6)*0.1:0));
  const c=G.curCity;
  if(c){
    if(c.state==='attacking')$('cityinfo').innerHTML='⚔ '+c.name+' — inimigos: <b style="color:#ff8a8a">'+c.aliveEnemies+'</b>/'+c.totalEnemies;
    else $('cityinfo').innerHTML=c.name+' <small>'+(c.home?'(sua cidade)':c.owner==='player'?'(conquistada)':(c.kind==='camp'?(c.state==='cleared'?'(limpo)':'(bandidos)'):(c.type==='fortaleza'?'(fortaleza inimiga)':'(cidade inimiga)')))+'</small>';
  }else $('cityinfo').textContent='';
  // objetivo
  const n=WORLD.cities.filter(x=>x.owner==='player').length;
  let best=null,bd=1e9;for(const x of WORLD.cities)if(x.owner==='enemy'){const d=Math.hypot(x.cx-P.x,x.cz-P.z);if(d<bd){bd=d;best=x}}
  if(best){
    const dx=best.cx-P.x,dz=best.cz-P.z,s=Math.sin(P.yaw),cy=Math.cos(P.yaw);
    const ang=Math.atan2(dx*cy-dz*s,dx*(-s)+dz*(-cy));
    $('obj').innerHTML='Soldados: <b>'+allyCount()+'/'+ARMY.max+'</b><br>Cidades: <b>'+n+'/7</b><br>Alvo: '+best.name+'<br><span id="arrow" style="transform:rotate('+ang+'rad)">▲</span> '+Math.round(bd)+' m';
  }else $('obj').innerHTML='Cidades: <b>'+n+'/7</b><br>Todas conquistadas!';
  $('obj').innerHTML+=questLine();drawMinimap();
}
function cityCol(c){if(RAID.active&&RAID.city===c)return Math.floor(G.t*4)%2?'#ff3030':'#ffffff';if(c.owner==='player')return '#3a8aff';return(c.state==='attacking'&&Math.floor(G.t*4)%2)?'#ffffff':'#'+RANK_COL[c.rank].toString(16).padStart(6,'0')}
const mm=$('mm'),mmc=mm.getContext('2d');
function drawMinimap(){
  const s=1.5,R=88;
  mmc.imageSmoothingEnabled=false;mmc.fillStyle='#123';mmc.fillRect(0,0,176,176);
  mmc.save();mmc.translate(R,R);mmc.rotate(P.yaw);
  if(G.dg)drawDungeonMinimap();   // dentro da dungeon, o minimapa mostra a planta da ala (sem marcar inimigos)
  else mmc.drawImage(WORLD.mapCanvas,-P.x*s,-P.z*s,W*s,W*s);
  for(const c of G.dg?[]:WORLD.cities){
    const x=(c.cx-P.x)*s,y=(c.cz-P.z)*s;
    mmc.fillStyle=cityCol(c);
    mmc.strokeStyle='#fff';mmc.lineWidth=2;mmc.beginPath();mmc.rect(x-6,y-6,12,12);mmc.fill();mmc.stroke();
  }
  {const qt=G.dg?null:questTarget();if(qt){let x=(qt.x-P.x)*s,y=(qt.z-P.z)*s;const L=Math.hypot(x,y),maxL=62;if(L>maxL){x*=maxL/L;y*=maxL/L}drawStar(mmc,x,y,7)}}
  if(!G.dg)for(const a of ALLIES)if(a.alive){mmc.fillStyle='#4aa0ff';mmc.fillRect((a.x-P.x)*s-2,(a.z-P.z)*s-2,4,4)}
  if(!G.dg)for(const e of ENEMIES)if(e.alive&&e.city.state==='attacking'){mmc.fillStyle='#ff2a2a';mmc.fillRect((e.x-P.x)*s-1.5,(e.z-P.z)*s-1.5,3,3)}
  mmc.restore();drawCompassRim(mmc,88,88,77,P.yaw);
  {const cs=Math.cos(P.yaw),sn=Math.sin(P.yaw);
    for(const c of WORLD.cities){if(Math.max(Math.abs(P.x-c.cx),Math.abs(P.z-c.cz))>c.half+40)continue;
      for(const ic of cityIcons(c)){const dx=(ic.x-P.x)*s,dz=(ic.z-P.z)*s,rx=dx*cs-dz*sn,ry=dx*sn+dz*cs;if(Math.hypot(rx,ry)>R-16)continue;drawIcon(mmc,R+rx,R+ry,ic,7)}}}
  mmc.fillStyle='#fff';mmc.strokeStyle='#000';mmc.lineWidth=2;mmc.beginPath();mmc.moveTo(R,R-8);mmc.lineTo(R+6,R+6);mmc.lineTo(R,R+3);mmc.lineTo(R-6,R+6);mmc.closePath();mmc.fill();mmc.stroke();
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
  if(c.hall)l.push({x:c.hall.x,z:c.hall.z,t:'P',col:'#ffd23a'});
  if(c.chapel)l.push({x:c.chapel.x,z:c.chapel.z,t:'†',col:'#c8a0ff'});
  return l;
}
function drawIcon(ctx,x,y,ic,r){
  ctx.fillStyle='rgba(0,0,0,.75)';ctx.beginPath();ctx.arc(x,y,r,0,6.283);ctx.fill();
  ctx.strokeStyle=ic.col;ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle=ic.col;ctx.font='bold '+Math.round(r*1.3)+'px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(ic.t,x,y+1);
}
function drawBigMap(){
  const cv=$('bigmap'),g=cv.getContext('2d'),s=cv.width/W;
  g.imageSmoothingEnabled=false;g.drawImage(WORLD.mapCanvas,0,0,cv.width,cv.height);
  g.font='bold 14px monospace';g.textAlign='center';
  for(const c of WORLD.cities){
    const x=c.cx*s,y=c.cz*s;g.fillStyle=cityCol(c);g.strokeStyle='#fff';g.lineWidth=2;
    g.beginPath();g.rect(x-7,y-7,14,14);g.fill();g.stroke();
    g.fillStyle='#fff';g.strokeStyle='#000';g.lineWidth=3;g.strokeText(c.name,x,y-12);g.fillText(c.name,x,y-12);
  }
  drawRose(g,cv.width-64,64,30);
  drawPickOverlay(g,s);   // modo de escolha de caravana (rounds.js)
  {const qt=questTarget();if(qt){drawStar(g,qt.x*s,qt.z*s,10);g.fillStyle='#ffe680';g.strokeStyle='#000';g.lineWidth=3;g.strokeText('Missão',qt.x*s,qt.z*s-16);g.fillText('Missão',qt.x*s,qt.z*s-16)}}
  g.save();g.translate(P.x*s,P.z*s);g.rotate(-P.yaw);g.fillStyle='#fff';g.strokeStyle='#000';g.beginPath();g.moveTo(0,-9);g.lineTo(7,8);g.lineTo(0,4);g.lineTo(-7,8);g.closePath();g.fill();g.stroke();g.restore();
}


// ---------- Noclip e destravar ----------
function noclipMove(dt,fw,st){
  const k=G.keys,sp=k.ShiftLeft?26:11,sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),cp=Math.cos(P.pitch),sPt=Math.sin(P.pitch);
  P.x=clamp(P.x+((-sy*cp)*fw+cy*st)*sp*dt,2,W-2);P.z=clamp(P.z+((-cy*cp)*fw-sy*st)*sp*dt,2,W-2);
  P.y=Math.max(SEA-3,P.y+(sPt*fw+((k.Space?1:0)-(k.KeyQ?1:0)))*sp*dt);
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
  if(G.noclip||P.dead)return;
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
  updateFx(dt);checkStuck(dt);updateInventory(dt);updateFishing(dt);updateVendors();updatePortals(dt);updateRaids(dt);updateRounds(dt);
  updateInteract();
  // recuo: cidade em ataque se o jogador se afastou demais
  for(const c of WORLD.cities)if(c.state==='attacking'&&Math.hypot(c.cx-P.x,c.cz-P.z)>170){c.state='idle';toast('Você recuou. Os inimigos voltam aos postos.',2500);for(const e of c.enemies)if(e.alive){e.hp=e.maxhp}}
  for(const w of WORLD.windmills)w.rotation.z+=dt*0.9;
  for(const c of WORLD.cities)c.flags.forEach((f,i)=>{f.rotation.y=Math.sin(G.t*3+i)*0.18});
  for(const cl of clouds){cl.position.x+=dt*1.5;if(cl.position.x>W+80)cl.position.x=-80}
  const cx=camera.position.x,cz=camera.position.z;
  for(const m of WORLD.chunkMeshes){const dx=m.userData.cx-cx,dz=m.userData.cz-cz;m.visible=dx*dx+dz*dz<245*245}
  updateHUD(dt);
}
function frame(){
  requestAnimationFrame(frame);
  const dt=Math.min(0.05,clock.getDelta());
  updateMusic(dt);
  if(G.running&&!G.panel){if(G.frozen)camera.rotation.set(P.pitch,P.yaw,0);else update(dt)}
  renderer.render(scene,camera);
}

// ---------- Início ----------
async function startGame(creative,loadData){
  G.creative=creative===true;$('creativeBox').classList.toggle('hidden',!G.creative);
  resetState();G.startBio=$('biosel').value;
  initAudio();if(AC){AC.resume();initMusic()}
  const q=new URLSearchParams(location.search);
  const sv=$('seed').value.trim();
  const seed=sv?(/^\d+$/.test(sv)?(+sv>>>0):hashStr(sv)):((Math.random()*4294967296)>>>0);
  if(G.creative){setGod(true);G.noReload=true}   // modo criativo: invencível, munição infinita e disparo infinito por padrão (dá para desligar na pausa)
  $('playbtn').disabled=true;$('createbtn').disabled=true;
  const msg=m=>{$('loadmsg').textContent=m};
  try{
    await genWorld(seed,msg,$('biosel').value);
    msg('Populando cidades...');await tick();
    msg('Calculando rotas...');await tick();buildNav();initWeapons();buildViewmodels(camera);initFx();initSky();initDayNight();populateCities();populateWild();placePlayerHome();
    syncOwned();ensureEquipped();genFishSpots();
    if(loadData){applySave(loadData);applyFishGone();rebuildPortals();rebuildSmoke()}
    else{spawnPortals();RAID.active=false;RAID.area=null;STATE.rd.hallCity=WORLD.home.id;G.introBook=true}   // partida nova: começa dentro da prefeitura (rodada 0) com o livro aberto no resumo
    refreshHotbar();refreshBuffs();fishClean();
    G.running=true;$('hud').classList.remove('hidden');initEconomy();rebuildCaravans();refreshRoundHud();if(STATE.phase==='leader'||G.introBook){if(OFFICE.ok)enterOffice(true);else if(G.introBook)placeAtHall()}
    refreshCheats();
    $('seed').value=String(seed);
    document.querySelector('#pause h2').textContent=(loadData?'✔ JOGO CARREGADO — semente ':'✔ MUNDO PRONTO — semente ')+seed;
    openPanel('pause');
    toast('Mapa: '+WORLD.shapeName+' ('+DOM_NAMES[WORLD.dominant]+' predominante).  Bem-vindo a '+WORLD.home.name+'! Visite o armeiro e a clínica; depois ataque as cidades vizinhas.',6000);
  }catch(err){
    console.error(err);msg('Erro: '+err.message);$('playbtn').disabled=false;$('createbtn').disabled=false;
  }
}
$('playbtn').onclick=()=>startGame(false);$('createbtn').onclick=()=>startGame(true);
(function(){
  const q=new URLSearchParams(location.search);
  if(q.get('seed'))$('seed').value=q.get('seed');
  if(q.get('bio'))$('biosel').value=q.get('bio');
  let ls=null;try{ls=sessionStorage.getItem('fc_loadslot');sessionStorage.removeItem('fc_loadslot')}catch(e){}
  if(ls)setTimeout(()=>startFromSave(+ls),200);          // carregar de dentro do jogo: a página recarregou e inicia direto do salvamento
  else if(q.get('load'))setTimeout(()=>startFromSave(+q.get('load')),200);   // ?load=1 carrega o espaço 1 (testes)
  else if(q.get('auto'))setTimeout(()=>startGame(q.get('auto')!=='normal'),200);   // ?auto=1 inicia no modo criativo (testes); ?auto=normal inicia o normal
})();
frame();


