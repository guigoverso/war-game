'use strict';
// ---------- Exército: soldados recrutados no Quartel ----------
const ALLIES=[];
const VEST_HP=40;
const ARMY={vest:false,dmg:0,hp:0,weapon:0,owned:[true,false,false,false,false,false],max:ARMY_MAX_SOLDIERS,maxLvl:8,recruitCost:100,city:null,recr:null};   // max: teto único (army-modifiers.js); recr: recrutados por lugar na rodada (recruitLeft)
const allyMaxHp=()=>45+12*ARMY.hp;
const allyDmgMul=()=>1+0.25*ARMY.dmg;
const allyCount=()=>ALLIES.filter(a=>a.alive&&!a.temp).length;
const armyTotal=allyCount;   // o que o contador mostra (a.temp: reforços de batalha de rebelião não contam nem são salvos)
const upCost=l=>120+80*l;
const bp=(b,k)=>pc(b,ARMY.city,k);   // preço ajustado pela cidade do quartel

function giveAllyVest(a){
  a.armor=VEST_HP;if(a.vested)return;a.vested=true;
  part(a.group,GEO_BOX,0.56,0.55,0.3,0x4f5a66,0,1.2,0);part(a.model.head,GEO_BOX,0.62,0.12,0.62,0x9ab0c8,0,0.42,0);
}
// Força dos animais (do mais fraco ao mais forte): lobo < aranha < escorpião < javali < urso.
// in: multiplicador do dano que soldados/bandidos causam no animal (lobo 3x, vai caindo até 1x no urso)
// out: multiplicador do dano que o animal causa em soldados/bandidos (lobo e aranha 1x; sobe a partir do escorpião até 1,6x no urso)
// Só vale nas brigas entre eles; o dano em você e nos seus soldados não muda.
const WILD_TIER={wolf:{in:3,out:1},spider:{in:2.5,out:1},scorpion:{in:2,out:1.2},boar:{in:1.5,out:1.4},bear:{in:1,out:1.6}};
function hurtTarget(tg,dmg,fx,fz,src){
  if(tg===P){if(src&&typeof warBlindado==='function'&&warBlindado(src.city))dmg*=WAR.forbiddenFactor;damagePlayer(dmg,fx,fz)}   // guardas de território proibido: ×10 (warops.js)
  else if(tg.kind==='enemy'){
    if(src){const sp=src.city.kind==='pack',tp=tg.city.kind==='pack';
      if(!sp&&tp)dmg*=(WILD_TIER[tg.type]||{in:1}).in;else if(sp&&!tp)dmg*=(WILD_TIER[src.type]||{out:1}).out}
    damageEnemy(tg,dmg,false,true,src);
  }else if(tg.kind==='npc')damageNpc(tg,dmg,src);
  else if(tg.kind==='guard')damageGuard(tg,dmg);
  else damageAlly(tg,dmg);
}
// alvo de briga: animal x soldado/bandido, só quando o jogador está vendo o animal
function wildFoe(e){
  const pk=e.city.kind==='pack',lim=pk?24:28;let best=null,bd=lim;
  for(const o of ENEMIES){
    if(o===e||!o.alive||(o.city.kind==='pack')===pk||o.def.bomb)continue;
    if(!(pk?e.watched:o.watched))continue;
    const d=Math.hypot(o.x-e.x,o.z-e.z);if(d<bd){bd=d;best=o}
  }
  return best;
}
function wildCiv(e){   // animais preferem perseguir civis (vistos pelo jogador)
  if(!e.watched&&e.city.kind!=='raid')return null;let best=null,bd=45;
  for(const n of NPCS){if(!n.alive||n.gone||n.role==='hostage'||n.role==='guard')continue;const d=Math.hypot(n.x-e.x,n.z-e.z);if(d<bd){bd=d;best=n}}
  return best;
}
function pickTarget(e){
  if(e.revengeT>0&&e.revenge&&(e.revenge===P?!P.dead:e.revenge.alive))return e.revenge;
  if(e.city.kind&&e.city.kind!=='dungeon'){const gd=nearGuard(e,20);if(gd&&!(e.aggro&&Math.hypot(P.x-e.x,P.z-e.z)<14))return gd}   // bandidos e animais atacam os guardas de caravana que estiverem perto
  if(CONTEST.active&&CONTEST.areas.includes(e.city)){   // disputa do portal dourado: cada tropa luta com a mais próxima de outro grupo; sem ninguém por perto, ataca você
    let best=null,bd=32;for(const o of ENEMIES){if(o===e||!o.alive||o.city===e.city||!CONTEST.areas.includes(o.city))continue;const d=Math.hypot(o.x-e.x,o.z-e.z);if(d<bd){bd=d;best=o}}
    if(best)return best;
  }
  if(e.city.kind==='pack'){const dp=Math.hypot(P.x-e.x,P.z-e.z);if(!(e.aggro&&dp<14)){const cv=wildCiv(e);if(cv)return cv}}
  const wf=wildFoe(e);
  if(wf){
    const dp=Math.hypot(P.x-e.x,P.z-e.z),df=Math.hypot(wf.x-e.x,wf.z-e.z);
    if(e.city.kind==='pack'){if(!(e.aggro&&dp<14))return wf}
    else if(e.city.state!=='attacking'||df<10)return wf;
  }
  let best=null,bd=1e9;
  for(const a of ALLIES){if(!a.alive)continue;const d=Math.hypot(a.x-e.x,a.z-e.z);if(d<bd){bd=d;best=a}}
  const dp=Math.hypot(P.x-e.x,P.z-e.z);
  if(best&&(P.dead||(bd<30&&bd<dp*0.8)))return best;
  return P;
}
// tipos de soldado das tropas de batalha (rebelião): o normal, o pesado (mais vida e colete), o atirador (tiro forte e lento, de longe) e o metralhador (tiro fraco e rápido)
const ALLY_KINDS={soldier:{},heavy:{hp:2.2,armor:40,scale:1.12,hat:0x3a3a44},sniper:{dmg:2,cd:1.6,hold:1.9,gun:1.1,scarf:0x2a8a3a},gunner:{dmg:0.7,cd:0.5,hat:0x8a5a2a}};
function spawnAlly(x,z,city,col,kind){
  const rng=new RNG((Math.random()*1e9)|0),K=ALLY_KINDS[kind]||{};
  const look={skin:rng.pick(SKINS),shirt:col||facColor(0)||0x2a4a9a,pants:0x2a2a3a,hairStyle:'helmet',hat:K.hat||0x8a9ab0,gun:{len:K.gun||0.75},scarf:K.scarf||0xe0e0e0};if(K.scale)look.scale=K.scale;   // todos os soldados do jogador usam a cor da facção dele (só a pele varia)
  const m=buildHuman(look);
  m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;
  const a={kind:'ally',isAlly:true,look,alive:true,x,z,y:tH(x,z),vy:0,ground:true,yaw:rng.range(0,6.28),hp:allyMaxHp(),maxhp:allyMaxHp(),eye:1.6,crouch:false,speed:1,
    model:m,group:m.group,r:0.35,cool:rng.range(0,1),scanT:0,sees:false,tgtE:null,seekE:null,phase:0,stuck:0,detour:0,detourT:0,
    state:'patrol',patrolCity:city,assaultCity:null,ang:0,slot:0,holdMul:0.75+rng.range(0,0.6),form:null,deadT:0,gone:false};
  const used=new Set(ALLIES.filter(q=>q.alive).map(q=>q.slot));let sl=0;while(used.has(sl))sl++;a.slot=sl;a.ang=sl*6.283/5+rng.range(0,0.4);
  a.armor=0;if(ARMY.vest)giveAllyVest(a);
  a.kindT=kind||'soldier';a.dmgM=K.dmg||1;a.cdM=K.cd||1;a.holdM=K.hold||1;a.hpM=K.hp||1;   // fatores do tipo (usados em updateAlly e applyArmyStats)
  if(K.hp){a.maxhp*=K.hp;a.hp=a.maxhp}if(K.armor)giveAllyVest(a);
  scene.add(a.group);ALLIES.push(a);return a;
}
// ganhar soldados (reféns, mercenários, refugiados...): as vagas livres viram soldados no quartel; o EXCESSO se perde (4B-4: sem reserva do exército).
function armyGain(n){
  let spawned=0,lost=0;const hm=WORLD.home,bk=hm.barracks||{x:hm.cx,z:hm.cz};
  for(let i=0;i<n;i++){
    if(allyCount()<ARMY.max){const a=spawnAlly(bk.x+(Math.random()-0.5)*1.5,bk.z+(Math.random()-0.5)*1.5,hm);if(ARMY.vest)giveAllyVest(a);spawned++}
    else lost++;
  }
  return{spawned,lost};
}
function recruitAlly(c){
  if(c&&polFlag('noRecruit',c.id)){toast('Não é possível recrutar em '+c.name+' agora (política em vigor).',2500);return false}
  if(!recruitPlace(c)||recruitLeft(c)<=0||armyFull()||P.coins<bp(ARMY.recruitCost,'recruit'))return false;   // 4B-19: cidade sua ou vila sua/neutra, com limite por rodada
  P.coins-=bp(ARMY.recruitCost,'recruit');recruitCount(c);armyGainBat();
  const bk=c.barracks||{x:c.cx,z:c.cz};
  spawnAlly(bk.x+(Math.random()-0.5)*1.5,bk.z+(Math.random()-0.5)*1.5,c);
  sfx('coin',0);return true;
}
function damageAlly(a,dmg){
  if(!a.alive)return;if(a.armor>0){const ab=Math.min(a.armor,dmg*0.6);a.armor-=ab;dmg-=ab}
  a.hp-=dmg;burst(a.x,a.y+1,a.z,0x2a5ac0,6,4,0.1);
  if(a.hp<=0){a.alive=false;a.deadT=0;if(!a.temp&&!BATTLE.on&&!(typeof REBB!=='undefined'&&REBB.active))toast('☠ Um soldado seu caiu! Recrute outro no Quartel.',3000)}   // sem aviso nas batalhas de rebelião (o contador de aliados mostra)
}
function armyAssault(c,msg,only){   // only: filtro opcional (quais soldados)
  let n=0;const sy=Math.sin(P.yaw),cy=Math.cos(P.yaw),tot=allyCount();
  for(const a of ALLIES){if(!a.alive||(only&&!only(a)))continue;
    // quem já está perto de você ou cumprindo a ordem V não é teleportado (antes voltava para trás de você sempre que a batalha recomeçava)
    const dp=Math.hypot(a.x-P.x,a.z-P.z),ordered=ORDER.on&&!a.post;
    if(a.state==='assault'||dp<ALLY_SUMMON_DIST||ordered){a.state='assault';a.assaultCity=c;continue}
    // aparecem atrás do jogador, em formação escalonada
    let back=5+Math.floor(n/2)*2.4+Math.random(),x=0,z=0;const side=(n%2?1:-1)*(1.8+(n>>1)*1.7);
    for(let k=0;k<6;k++){
      x=P.x+sy*back+cy*side;z=P.z+cy*back-sy*side;
      probe(x,z,0.5,tH(x,z),1.8,1.05);if(!GR.blocked&&GR.g-P.y<1.5)break;back=Math.max(1.5,back-1);
    }
    a.x=x;a.z=z;a.y=tH(x,z);a.vy=0;a.state='assault';a.assaultCity=c;a.tgtE=null;a.path=null;
    a.form={ang:n/Math.max(1,tot)*6.283+Math.random()*0.5,r:5+Math.random()*5};a.holdMul=0.75+Math.random()*0.6;n++}
  if(n&&msg!=='')toast(msg||('★ Seus '+n+' soldados avançam para o centro de '+c.name+'!'),3000);
}
function armyConquered(c){for(const a of ALLIES)if(a.alive){a.state='patrol';a.patrolCity=c;a.assaultCity=null}}
function allyFindTarget(a,w){
  const ey=a.y+1.6;let best=null,bd=1e9,seek=null,sd=1e9;
  for(const e of ENEMIES){
    if(!e.alive)continue;
    const raidish=e.city.state==='attacking'&&(!e.city.kind||e.city.kind==='raid'||e.city.kind==='contest');   // aliados também combatem os bandidos de raid
    // numa batalha de rebelião, lobos, bandidos e outros que entrem no meio e ataquem você ou seus soldados também são alvo
    const intruder=!raidish&&e.aggro&&!e.def.bomb&&Math.hypot(e.x-a.x,e.z-a.z)<ALLY_THREAT_RANGE;   // POI, acampamento, matilha e intrusos em combate (também na rebelião)
    const hunted=ORDER.hunt&&!e.def.bomb&&(e.city.kind||e.city.state==='attacking')&&Math.hypot(e.x-a.x,e.z-a.z)<ALLY_HUNT_RANGE;   // caça: qualquer inimigo (não de cidade em paz)
    if(!raidish&&!intruder&&!hunted)continue;
    const d=Math.hypot(e.x-a.x,e.z-a.z);
    if(d<sd){sd=d;seek=e}
    if(d<Math.min(w.range,60)&&d<bd&&losClear(a.x,ey,a.z,e.x,e.y+e.lift+e.def.h*0.6,e.z)){bd=d;best=e}
  }
  a.tgtE=best;a.seekE=seek;
}
// ---------- ordem de movimento (temporária, não é salva; números em modifiers/army-modifiers.js) ----------
// Com a ordem ativa, todos os soldados soltos vão ao ponto, formam em volta e atiram; só perseguem inimigos perto dele.
const ORDER={on:false,x:0,z:0,mark:null,t:0,hunt:false};   // hunt: soldados liberados para caçar (tecla ORDER_KEY_HUNT)
function orderMarker(){   // anel azul no chão, criado na primeira ordem
  if(!ORDER.mark){
    const g=new THREE.Mesh(new THREE.RingGeometry(0.9,1.3,24),new THREE.MeshBasicMaterial({color:ORDER_MARK_COLOR,transparent:true,opacity:0.8,side:THREE.DoubleSide,depthWrite:false}));
    g.rotation.x=-Math.PI/2;scene.add(g);ORDER.mark=g;
  }
  return ORDER.mark;
}
function orderGo(){   // mira do jogador -> ponto do chão
  if(!canOrderAllies())return;   // sem avisos: notificação nova só com aprovação do usuário (CLAUDE.md)
  const d=new THREE.Vector3(),o=new THREE.Vector3();camera.getWorldDirection(d);camera.getWorldPosition(o);
  rayWorld(o.x,o.y,o.z,d.x,d.y,d.z,ORDER_MAX_DIST);
  if(RAY.kind===0&&d.y>-0.02)return;   // mirando o céu: nada a ordenar; olhando para baixo sem acertar nada (além do alcance), vale o ponto no limite do alcance
  ORDER.x=o.x+d.x*RAY.t;ORDER.z=o.z+d.z*RAY.t;battleClampOrder(ORDER);ORDER.on=true;ORDER.hunt=false;   // na Defesa o ponto fica dentro da área
  const m=orderMarker();m.position.set(ORDER.x,tH(ORDER.x,ORDER.z)+0.15,ORDER.z);
  for(const a of ALLIES)if(a.alive)a.path=null;   // recalcula o caminho já no destino novo
  if(orderInBattle())sfx('coin',0);
}
// Libera os soldados: a ordem cai e eles saem atrás do inimigo vivo mais perto (allyFindTarget/updateAlly), em vez de ficar parados no ponto.
function orderHunt(){
  if(!canOrderAllies())return;
  orderCancel();ORDER.hunt=true;
}
function orderCancel(){
  ORDER.hunt=false;if(!ORDER.on)return;ORDER.on=false;if(ORDER.mark)ORDER.mark.visible=false;
  for(const a of ALLIES)a.path=null;
}
function orderInBattle(){return ALLIES.some(a=>a.alive&&a.state==='assault')}   // em batalha, com os soldados invocados: só então há marcador e som
function updateOrderMarker(dt){
  if(ORDER.mark)ORDER.mark.visible=ORDER.on&&orderInBattle();
  if(ORDER.on&&ORDER.mark){ORDER.t+=dt;const s=1+Math.sin(ORDER.t*4)*0.12;ORDER.mark.scale.set(s,s,s)}}
// anda até o seu lugar na formação em volta do ponto da ordem; devolve se está andando
function orderStep(a,dt,faceYaw){   // faceYaw: se dado, continua olhando para o alvo enquanto anda
  const r=ORDER_RING*(1+(a.slot%3)*0.6),tx=ORDER.x+Math.cos(a.ang)*r,tz=ORDER.z+Math.sin(a.ang)*r;
  const d=Math.hypot(tx-a.x,tz-a.z);if(d<1.2)return false;
  navMove(a,tx,tz,d>25?6:3.4,dt,a.r,1.8,1.05);if(faceYaw===undefined)a.yaw=Math.atan2(tx-a.x,tz-a.z);return true;
}
// Cobertura dos soldados do jogador (passo 6, 4B-15; ALLYAI em enemyai-modifiers.js; a busca é a dos inimigos, entities.js). Devolve 'walk' (indo ao
// abrigo), 'hold' (abrigado, parado) ou '' (sem abrigo: a lógica normal de movimento segue).
function allyCoverStep(a,t,d,hold,w,dt){
  const A=ALLYAI;a.covT=(a.covT||0)-dt;
  const def={eye:1.6,pref:A.minDist/0.6,range:Math.min(w.range,60)*A.rangeMul};
  if(d>hold*A.engageMul){a.cov=null;return ''}   // alvo longe: avança em vez de se abrigar
  if(!a.cov&&a.covT<=0)enemyCoverPick(a,t,def,A,ALLIES);
  if(!a.cov)return '';
  a.covRe-=dt;
  if(a.covRe<=0){a.covRe=A.recheck;if(!coverOk(t,a.cov.x,tH(a.cov.x,a.cov.z),a.cov.z,def)){a.cov=null;a.covT=0;return ''}}
  if(Math.hypot(a.cov.x-a.x,a.cov.z-a.z)<1.1){a.covWalk=0;return 'hold'}
  a.covWalk+=dt;if(a.covWalk>A.walkMax){a.cov=null;a.covT=A.retry;return ''}
  navMove(a,a.cov.x,a.cov.z,3.8,dt,a.r,1.8,1.05);return 'walk';
}
const allyMagNew=w=>clamp(w.mag||ALLYAI.magRange[1],ALLYAI.magRange[0],ALLYAI.magRange[1]);   // carregador simples: o da arma, limitado
function updateAlly(a,dt){
  const w=WEAPONS[ARMY.weapon],ord=ORDER.on&&!a.post;
  if(!a.alive){a.deadT+=dt;a.group.rotation.z=Math.min(1,a.deadT*3)*1.5;if(a.deadT>5){scene.remove(a.group);a.gone=true}return}
  if(waterEscapeStep(a,dt,5))return;   // na água: só sai dela
  a.cool-=dt;a.scanT-=dt;a.reloadT=(a.reloadT||0)-dt;
  if(a.mag===undefined)a.mag=allyMagNew(w);
  if(a.state==='assault'){const c=a.assaultCity;if(!c||c.state!=='attacking'||(c.aliveEnemies<=0&&!c.btl)){a.state='patrol';a.patrolCity=c||WORLD.home}}
  if(a.scanT<=0){a.scanT=0.25+Math.random()*0.1;allyFindTarget(a,w)}
  let moving=false;
  const t=a.tgtE&&a.tgtE.alive?a.tgtE:null;
  if(!t)a.cov=null;   // sem alvo: sai do abrigo
  if(t){
    const dx=t.x-a.x,dz=t.z-a.z,d=Math.hypot(dx,dz),face=Math.atan2(dx,dz);
    a.yaw+=((face-a.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*10);
    const hold=(w.range>100?35:w.id==='shotgun'?8:18)*(a.holdMul||1)*(a.holdM||1);
    const cv=ALLYAI.cover&&!ord&&!a.post&&!(typeof REBB!=='undefined'&&REBB.active)?allyCoverStep(a,t,d,hold,w,dt):'';
    if(ord)a.cov=null;
    if(cv){moving=cv==='walk'}   // abrigando-se: anda até o abrigo (atira no caminho) ou fica parado nele
    else if(ord){   // a ordem tem prioridade: vai ao ponto atirando; só depois de chegar persegue inimigos perto dele
      moving=orderStep(a,dt,face);
      if(!moving&&d>hold&&Math.hypot(t.x-ORDER.x,t.z-ORDER.z)<=ORDER_CHASE){navMove(a,t.x,t.z,3.8,dt,a.r,1.8,1.05);moving=true}
    }
    else if(d>hold){navMove(a,t.x,t.z,3.8,dt,a.r,1.8,1.05);moving=true}
    else if(typeof REBB!=='undefined'&&REBB.active){   // batalha de rebelião: não fica plantado ao atirar; anda de lado (como os inimigos) e recua se o alvo chega perto demais
      a.strafeT=(a.strafeT||0)-dt;if(a.strafeT<=0){a.strafe=(a.strafe||1)*-1;a.strafeT=0.8+Math.random()*2}
      moveXZ(a,-dz/(d||1)*a.strafe*2.4*dt,dx/(d||1)*a.strafe*2.4*dt,a.r,1.8,1.05);
      if(d<hold*0.45)moveXZ(a,-dx/(d||1)*2*dt,-dz/(d||1)*2*dt,a.r,1.8,1.05);
      moving=true;
    }
    if(a.cool<=0&&!(a.reloadT>0)){
      a.cool=clamp(60/w.rpm*6,0.5,2.2)*(1+Math.random()*0.4)*(a.cdM||1);
      if(ALLYAI.magazine&&--a.mag<=0){a.mag=allyMagNew(w);a.reloadT=enemyAiRand(ALLYAI.reload)}   // acabou o carregador: recarrega
      const ox=a.x,oy=a.y+1.4,oz=a.z,ty=t.y+t.lift+t.def.h*0.6;
      const hit=Math.random()<clamp(0.38-d/(w.range*2),0.12,0.3);
      const ex=t.x+(hit?0:(Math.random()-0.5)*3),ez=t.z+(hit?0:(Math.random()-0.5)*3);
      tracer(ox,oy,oz,ex,ty+(hit?0:(Math.random()-0.5)),ez,0x9ad0ff);sfx(w.sfx,Math.hypot(a.x-P.x,a.z-P.z)*1.2,a.x,a.z);
      if(hit){
        if(w.rocket)explode(t.x,ty,t.z,5,w.dmg*allyDmgMul()*(a.dmgM||1)*0.22,true,true);
        else damageEnemy(t,w.dmg*(w.pellets>1?w.pellets*0.55:1)*allyDmgMul()*(a.dmgM||1)*0.22,false,true);
      }
    }
  }else if(ord){a.cov=null;moving=orderStep(a,dt)
  }else if(ORDER.hunt&&a.seekE&&a.seekE.alive&&!a.post){   // caça: vai atrás do inimigo mais perto
    navMove(a,a.seekE.x,a.seekE.z,4.2,dt,a.r,1.8,1.05);a.yaw=Math.atan2(a.seekE.x-a.x,a.seekE.z-a.z);moving=true;
  }else if(a.state==='assault'){
    const c=a.assaultCity,dc=Math.hypot(c.cx-a.x,c.cz-a.z);
    const fm=a.form||{ang:0,r:0};let tx=c.cx+Math.cos(fm.ang)*fm.r,tz=c.cz+Math.sin(fm.ang)*fm.r;
    if(dc<7&&a.seekE){tx=a.seekE.x;tz=a.seekE.z}
    const d=navMove(a,tx,tz,dc>40?6:4,dt,a.r,1.8,1.05);a.yaw=Math.atan2(tx-a.x,tz-a.z);moving=true;
  }else{
    const c=a.patrolCity||WORLD.home;
    if(a.post){   // posto fixo dentro da cidade (batalha de rebelião): anda até ele, para e olha para fora (sem rodar em volta)
      const dp=Math.hypot(a.post.x-a.x,a.post.z-a.z);
      const sk=a.seekE&&a.seekE.alive?a.seekE:null,ds=sk?Math.hypot(sk.x-a.x,sk.z-a.z):1e9;
      if(sk&&ds<45&&Math.hypot(sk.x-a.post.x,sk.z-a.post.z)<45){navMove(a,sk.x,sk.z,4.2,dt,a.r,1.8,1.05);a.yaw=Math.atan2(sk.x-a.x,sk.z-a.z);moving=true}   // inimigo por perto: vai atrás dele (sem se afastar muito do posto)
      else if(dp>2.2){navMove(a,a.post.x,a.post.z,dp>25?6:2.4,dt,a.r,1.8,1.05);a.yaw=Math.atan2(a.post.x-a.x,a.post.z-a.z);moving=true}
      else{const fy=Math.atan2(a.post.x-c.cx,a.post.z-c.cz);a.yaw+=((fy-a.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*4)}
    }else{
    const R=c.half+5+(a.slot%3)*2;
    const tx=c.cx+Math.cos(a.ang)*R,tz=c.cz+Math.sin(a.ang)*R;
    const d=navMove(a,tx,tz,Math.hypot(tx-a.x,tz-a.z)>25?6:2.4,dt,a.r,1.8,1.05);
    a.yaw=Math.atan2(tx-a.x,tz-a.z);moving=true;
    if(d<2.5||a.stuck>0.3&&Math.random()<0.02)a.ang+=0.4;
    }
  }
  for(const o of ALLIES){if(o===a||!o.alive)continue;const dx=a.x-o.x,dz=a.z-o.z,d=Math.hypot(dx,dz);if(d<2.6&&d>0.01)moveXZ(a,dx/d*2.6*dt,dz/d*2.6*dt,a.r,1.8,1.05)}
  if(moving)a.phase+=dt*9;
  moveY(a,dt,a.r,1.8,1.05);rescueStuck(a,dt,a.r,1.8);
  a.group.position.set(a.x,a.y,a.z);a.group.rotation.y=a.yaw;
  if(moving)animWalk(a.model,a.phase,0.7);else a.model.legs.forEach(l=>l.rotation.x*=0.8);
}
// ---------- atiradores nas torres das cidades do jogador (nível 4 e 5; números em modifiers/) ----------
// Não são salvos: citySentrySync os refaz ao carregar, ao evoluir a cidade e ao conquistá-la. Ficam parados na torre e atiram nos bandidos de raid ao alcance.
const CITY_SENTRIES=[];
function citySentrySync(c){
  for(let i=CITY_SENTRIES.length-1;i>=0;i--)if(CITY_SENTRIES[i].city===c){scene.remove(CITY_SENTRIES[i].group);CITY_SENTRIES.splice(i,1)}
  if(c.owner!=='player'||!c.towers)return;
  const n=Math.min(c.towers.length,citySentriesAt(cityLvl(c)));
  for(let i=0;i<n;i++){
    const tw=c.towers[i],m=buildHuman({skin:0xd9a577,shirt:facColor(0)||0x2a4a9a,pants:0x2a2a3a,hairStyle:'helmet',hat:0x8a9ab0,gun:{len:1.1},scarf:0x2a8a3a});
    m.arms[1].rotation.x=-1.2;m.arms[0].rotation.x=-1.0;m.group.position.set(tw.x,tw.y,tw.z);scene.add(m.group);
    CITY_SENTRIES.push({city:c,x:tw.x,y:tw.y,z:tw.z,group:m.group,cool:Math.random()*CITY_SENTRY_COOLDOWN,scanT:0,tgt:null});
  }
}
function updateCitySentries(dt){
  for(const s of CITY_SENTRIES){
    s.group.visible=(s.x-P.x)**2+(s.z-P.z)**2<150*150;
    s.cool-=dt;s.scanT-=dt;
    if(s.scanT<=0){   // procura o bandido de raid mais perto, com linha de tiro
      s.scanT=0.4+Math.random()*0.2;s.tgt=null;let bd=CITY_SENTRY_RANGE;
      for(const e of ENEMIES){
        if(!e.alive||e.city.kind!=='raid'||e.city.state!=='attacking')continue;
        const d=Math.hypot(e.x-s.x,e.z-s.z);
        if(d<bd&&losClear(s.x,s.y+1.6,s.z,e.x,e.y+e.lift+e.def.h*0.6,e.z)){bd=d;s.tgt=e}
      }
    }
    const t=s.tgt;if(!t||!t.alive)continue;
    s.group.rotation.y=Math.atan2(t.x-s.x,t.z-s.z);
    if(s.cool>0)continue;
    s.cool=CITY_SENTRY_COOLDOWN*(1+Math.random()*0.3);
    const ty=t.y+t.lift+t.def.h*0.6,hit=Math.random()<CITY_SENTRY_HIT;
    tracer(s.x,s.y+1.4,s.z,t.x+(hit?0:(Math.random()-0.5)*3),ty,t.z+(hit?0:(Math.random()-0.5)*3),0x9ad0ff);
    sfx(WEAPONS[ARMY.weapon].sfx,Math.hypot(s.x-P.x,s.z-P.z)*1.2,s.x,s.z);
    if(hit)damageEnemy(t,CITY_SENTRY_DAMAGE,false,true);
  }
}
function updateAllies(dt){
  updateCitySentries(dt);updateOrderMarker(dt);
  for(let i=ALLIES.length-1;i>=0;i--){const a=ALLIES[i];if(a.gone){ALLIES.splice(i,1);continue}updateAlly(a,dt)}
}
function applyArmyStats(){
  for(const a of ALLIES)if(a.alive){const f=a.hp/a.maxhp;a.maxhp=allyMaxHp()*(a.hpM||1);a.hp=Math.min(a.maxhp,Math.max(a.hp,a.maxhp*f)+10)}
}

// ---------- Interface do Quartel ----------
function openBarracks(c){ARMY.city=c;openPanel('barracks');renderBarracks()}
function renderBarracks(){
  const n=allyCount();
  $('bkinfo').innerHTML=txtBarracksInfo(P.coins,n,ARMY.max);
  let h='<div class="grid">';
  if(recruitPlace(ARMY.city)){const left=recruitLeft(ARMY.city),full=armyFull();   // só cidade sua recruta no Quartel (4B-19)
    h+='<div class="card"><b>Recrutar soldado</b><div class="st">'+txtRecruitQueue(left)+'</div>'+tagLine(priceTag(ARMY.city,'recruit'))+'<button class="gold" data-a="rec" '+(full||left<=0||P.coins<bp(ARMY.recruitCost,'recruit')?'disabled':'')+'>'+txtRecruitBtn(bp(ARMY.recruitCost,'recruit'),full,left)+'</button></div>'}
  const dl=ARMY.dmg,hl=ARMY.hp;
  h+='<div class="card"><b>Dano dos soldados</b><div class="st">Nível '+dl+'/'+ARMY.maxLvl+' • +25% de dano por nível (atual ×'+allyDmgMul().toFixed(2)+')</div>'+tagLine(priceTag(ARMY.city,'soldierup'))+'<button data-a="dmg" '+(dl>=ARMY.maxLvl||P.coins<bp(upCost(dl),'soldierup')?'disabled':'')+'>'+(dl>=ARMY.maxLvl?'Máximo':'Evoluir ◉'+bp(upCost(dl),'soldierup'))+'</button></div>';
  h+='<div class="card"><b>Vida dos soldados</b><div class="st">Nível '+hl+'/'+ARMY.maxLvl+' • +12 de vida por nível (atual '+allyMaxHp()+')</div>'+tagLine(priceTag(ARMY.city,'soldierup'))+'<button data-a="hp" '+(hl>=ARMY.maxLvl||P.coins<bp(upCost(hl),'soldierup')?'disabled':'')+'>'+(hl>=ARMY.maxLvl?'Máximo':'Evoluir ◉'+bp(upCost(hl),'soldierup'))+'</button></div>';
  h+='<div class="card"><b>🛡 Colete dos soldados</b><div class="st">Soldados com colete (e capacete de aço) absorvem 60% do dano até esgotar '+VEST_HP+' pontos.</div>'+tagLine(priceTag(ARMY.city,'vest'))+(ARMY.vest?'<button data-a="refill" '+(P.coins<bp(60,'vest')?'disabled':'')+'>Repor coletes ◉'+bp(60,'vest')+'</button>':'<button class="gold" data-a="vest" '+(P.coins<bp(220,'vest')?'disabled':'')+'>Comprar ◉'+bp(220,'vest')+'</button>')+'</div>';
  if(ARMY.city&&ARMY.city.owner==='player'&&P.armor<100){const q=vestRepairQuote();   // reparo do SEU colete, em qualquer cidade sua
    h+='<div class="card"><b>🛡 Reparar o seu colete</b><div class="st">Colete: '+Math.ceil(P.armor)+'/100</div>'+tagLine(priceTag(ARMY.city,'vest'))
      +'<button class="gold" data-a="vgold" '+(P.coins<q.gold||Ledger.anyDebt()?'disabled':'')+'>Com ouro ◉'+q.gold+'</button>'
      +'<button class="gold" data-a="vleather" '+(invCount('couro')<q.lea||P.coins<q.goldLea||Ledger.anyDebt()?'disabled':'')+'>🟤 '+q.lea+' couro + ◉'+q.goldLea+'</button></div>'}
  WEAPONS.forEach((w,i)=>{
    const own=ARMY.owned[i],cur=ARMY.weapon===i;
    h+='<div class="card'+(cur?'':own?'':' locked')+'"><b>'+w.name+(cur?' ✔ (em uso)':'')+'</b><div class="st">Dano '+w.dmg+(w.pellets>1?' ×'+w.pellets:'')+' • '+w.rpm+' dpm</div>'+
      (cur?'':own?'<button data-a="eq" data-i="'+i+'">Equipar</button>':tagLine(priceTag(ARMY.city,'weapon'))+'<button class="gold" data-a="buy" data-i="'+i+'" '+(P.coins<bp(w.price,'weapon')?'disabled':'')+'>Comprar ◉'+bp(w.price,'weapon')+'</button>')+'</div>';
  });
  $('bkbody').innerHTML=h+'</div>';
}
function vestRepairQuote(){   // proporcional ao que falta: ouro = 35% do preço de um colete novo; com couro: couro + 60% desse ouro
  const miss=Math.max(0,100-P.armor)/100,V=POIX.vest,gold=Math.max(1,Math.round(bp(V.base*V.pct*miss,'vest')));
  return{gold,lea:Math.max(1,Math.ceil(V.leather*miss)),goldLea:Math.max(1,Math.round(gold*V.goldPct))};
}
function vestRepair(withLeather){
  const q=vestRepairQuote();if(P.armor>=100||Ledger.anyDebt())return false;
  if(withLeather){if(invCount('couro')<q.lea||!Ledger.spend({gold:q.goldLea}))return false;invRemove('couro',q.lea)}
  else if(!Ledger.spend({gold:q.gold}))return false;
  P.armor=100;sfx('coin',0);return true;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#bkbody button');if(!b||b.classList.contains('qmark'))return;
  const a=b.dataset.a,i=+b.dataset.i;
  if(a==='rec')recruitAlly(ARMY.city);
  else if(a==='dmg'&&P.coins>=bp(upCost(ARMY.dmg),'soldierup')&&ARMY.dmg<ARMY.maxLvl){P.coins-=bp(upCost(ARMY.dmg),'soldierup');ARMY.dmg++;sfx('coin',0)}
  else if(a==='hp'&&P.coins>=bp(upCost(ARMY.hp),'soldierup')&&ARMY.hp<ARMY.maxLvl){P.coins-=bp(upCost(ARMY.hp),'soldierup');ARMY.hp++;applyArmyStats();sfx('coin',0)}
  else if(a==='buy'&&P.coins>=bp(WEAPONS[i].price,'weapon')){P.coins-=bp(WEAPONS[i].price,'weapon');ARMY.owned[i]=true;ARMY.weapon=i;sfx('coin',0)}
  else if(a==='eq'){ARMY.weapon=i}
  else if(a==='vest'&&!ARMY.vest&&P.coins>=bp(220,'vest')){P.coins-=bp(220,'vest');ARMY.vest=true;for(const x of ALLIES)if(x.alive)giveAllyVest(x);sfx('coin',0)}
  else if(a==='refill'&&P.coins>=bp(60,'vest')){P.coins-=bp(60,'vest');for(const x of ALLIES)if(x.alive)x.armor=VEST_HP;sfx('coin',0)}
  else if(a==='vgold')vestRepair(false);
  else if(a==='vleather')vestRepair(true);
  renderBarracks();
});

