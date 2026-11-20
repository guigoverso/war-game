'use strict';
// ---------- Caravanas e rotas (Fase 4): carroças na estrada, guardas, saque, compra e resumo da negociação ----------
// Separado de rounds.js. O custo e o saque ficam em ECON (econ.js).
// guardas das caravanas: atiram em bandidos e animais selvagens que chegam perto; se morrem (fora dos ataques de política), ressurgem quando saem da vista do jogador
const GUARD_RANGE=26,GUARD_DMG=13;
const guardFoe=(e,includeCity)=>e.alive&&!e.gone&&e.city&&e.city.kind&&e.city.kind!=='dungeon';   // bandidos, disputas e animais (nunca soldados de cidade nem a dungeon)
function nearGuard(e,r){let best=null,bd=r;for(const car of CARAVANS)for(const g of car.guards||[]){if(!g.alive)continue;const d=Math.hypot(g.x-e.x,g.z-e.z);if(d<bd){bd=d;best=g}}return best}
function damageGuard(g,dmg){if(!g.alive)return;g.hp-=dmg;burst(g.x,g.y+1,g.z,0x2a5ac0,5,4,0.1);if(g.hp<=0){g.alive=false;g.deadT=0}}
// ---------- guardas de caravana: ronda, reação, tiro ----------
// Os guardas ficam num CÍRCULO com a caravana no centro (GUARD_PATROL_R): dão pequenos passos, fazem rondas e olham para quem chega perto ou fala com eles.
// Se o jogador atira em guardas de uma caravana que não é dele, TODOS os guardas dela viram hostis: vão atrás do jogador (até GUARD_CHASE_R do centro) e atiram.
// Guardas mortos pelo jogador não ressurgem (a caravana fica `hit`); só ressurgem os que morreram para bandidos e animais.
const GUARD_PATROL_R=7,GUARD_CHASE_R=38,GUARD_PLAYER_DMG=8;
function guardPatrolPoint(g,car){
  for(let t=0;t<8;t++){
    let x,z;
    if(Math.random()<0.55){const a=Math.random()*6.283,s=1+Math.random()*0.9;x=g.x+Math.cos(a)*s;z=g.z+Math.sin(a)*s}   // pequeno passo em volta de onde está
    else{const a=Math.random()*6.283,rr=3.6+Math.random()*(GUARD_PATROL_R-3.6);x=car.x+Math.cos(a)*rr;z=car.z+Math.sin(a)*rr}   // ronda pelo círculo
    if(Math.hypot(x-car.x,z-car.z)>GUARD_PATROL_R)continue;
    if(tH(x,z)<SEA+0.5||Math.abs(tH(x,z)-tH(car.x,car.z))>1.6||Col.near(x-0.5,z-0.5,x+0.5,z+0.5).length)continue;   // nada de água, barranco, pedra ou a própria carroça
    return[x,z];
  }
  return null;
}
const guardPose=g=>{g.model.arms[1].rotation.x=-1.2;g.model.arms[0].rotation.x=-1.0};   // arma erguida (o andar mexe nos braços)
const guardFace=(g,tx,tz,dt,k)=>{g.yaw+=((Math.atan2(tx-g.x,tz-g.z)-g.yaw+Math.PI*3)%(Math.PI*2)-Math.PI)*Math.min(1,dt*(k||6))};
function updateCaravanGuards(dt){
  for(const car of CARAVANS){
    const dcar=Math.hypot(car.x-P.x,car.z-P.z);
    if(dcar>150)continue;   // só perto do jogador
    if(car.hostile&&(P.dead||dcar>GUARD_CHASE_R+30))car.hostile=false;   // jogador morreu ou fugiu: acalmam
    for(const g of car.guards||[]){
      if(!g.alive){
        g.deadT+=dt;g.group.rotation.z=Math.min(1,g.deadT*3)*1.5;
        const seen=Math.hypot(g.x-P.x,g.z-P.z)<85&&losClear(camera.position.x,camera.position.y,camera.position.z,g.x,g.y+0.8,g.z);
        if(!car.ambush&&!car.hit&&!g.byPlayer&&g.deadT>6&&!seen){g.alive=true;g.hp=g.maxhp;g.x=g.homeX;g.z=g.homeZ;g.y=tH(g.x,g.z);g.yaw=g.yaw0;g.state='idle';g.group.rotation.z=0;g.group.rotation.y=g.yaw0;g.group.position.set(g.x,g.y,g.z)}   // ressurge fora da vista (só se não foi o jogador)
        continue;
      }
      g.cool-=dt;const px0=g.x,pz0=g.z;let moving=false;
      let foe=null,bd=GUARD_RANGE;
      for(const e of ENEMIES){if(!guardFoe(e))continue;const d=Math.hypot(e.x-g.x,e.z-g.z);if(d<bd&&losClear(g.x,g.y+1.5,g.z,e.x,e.y+(e.def.h||1.6)*0.6,e.z)){bd=d;foe=e}}
      const dpl=Math.hypot(P.x-g.x,P.z-g.z);
      if(car.hostile&&!P.dead&&!G.invis){   // reação: vai para cima do jogador e atira
        guardFace(g,P.x,P.z,dt,10);
        if(dpl>12&&Math.hypot(g.x-car.x,g.z-car.z)<GUARD_CHASE_R){steer(g,P.x,P.z,3.4,dt,0.3,1.8,1.05);faceMove(g,px0,pz0,dt);moving=true;g.phase+=dt*12}
        if(dpl<30&&g.cool<=0&&losClear(g.x,g.y+1.5,g.z,P.x,P.y+1.2,P.z)){
          g.cool=1.1+Math.random()*0.6;
          const ox=g.x+Math.sin(g.yaw)*0.5,oy=g.y+1.35,oz=g.z+Math.cos(g.yaw)*0.5;
          tracer(ox,oy,oz,P.x,P.y+1.2,P.z,0xffaa66);sfx('rifle',dpl);
          if(Math.random()<0.6)damagePlayer(GUARD_PLAYER_DMG,g.x,g.z);
        }
      }else if(foe){   // atira em bandidos e animais que chegam perto
        guardFace(g,foe.x,foe.z,dt,12);
        if(g.cool<=0){g.cool=0.7+Math.random()*0.5;
          const ox=g.x+Math.sin(g.yaw)*0.5,oy=g.y+1.35,oz=g.z+Math.cos(g.yaw)*0.5;
          tracer(ox,oy,oz,foe.x,foe.y+(foe.def.h||1.6)*0.6,foe.z,0x88ccff);sfx('rifle',dpl);
          if(Math.random()<0.75)damageEnemy(foe,GUARD_DMG,false,true,g);
        }
      }else if(g.lookT>0){g.lookT-=dt;guardFace(g,P.x,P.z,dt,8)}   // o jogador está falando com ele: olha para o jogador e para
      else{
        // ronda: ora parado (olhando para quem chega perto), ora caminhando devagar até um ponto do círculo
        if(g.state==='walk'){
          g.walkT-=dt;const dd=steer(g,g.tx,g.tz,0.9,dt,0.3,1.8,1.05);faceMove(g,px0,pz0,dt);moving=true;g.phase+=dt*5;
          if(dd<0.4||g.walkT<=0){g.state='idle';g.timer=2+Math.random()*6}
        }else{
          g.timer=(g.timer===undefined?Math.random()*4:g.timer)-dt;
          if(dpl<6)guardFace(g,P.x,P.z,dt,3);
          else if(Math.hypot(g.x-car.x,g.z-car.z)>GUARD_PATROL_R){g.tx=car.x;g.tz=car.z;g.state='walk';g.walkT=10}   // saiu do círculo (empurrado): volta
          if(g.timer<=0){const p=guardPatrolPoint(g,car);if(p){g.tx=p[0];g.tz=p[1];g.state='walk';g.walkT=9}else g.timer=3}
        }
      }
      if(moving)animWalk(g.model,g.phase,0.55);else g.model.legs.forEach(l=>l.rotation.x*=0.8);
      guardPose(g);moveY(g,dt,0.3,1.8,1.05);rescueStuck(g,dt,0.3,1.8);
      g.group.position.set(g.x,g.y,g.z);g.group.rotation.y=g.yaw;
    }
  }
}
// ---------- saque, rota destruída e carroças que ficam até o fim do turno ----------
function destroyRoute(r){   // a rota acaba na hora; as carroças ficam na estrada até o turno acabar
  const rd=STATE.rd,i=rd.routes.indexOf(r);if(i>=0)rd.routes.splice(i,1);
  const j=(rd.nroutes||[]).indexOf(r);if(j>=0)rd.nroutes.splice(j,1);   // rota entre NPC saqueada
  for(const c of CARAVANS)if(c.r===r)c.doomed=true;
  computeBuffs();
}
function lootCaravan(car){
  if(!car||car.looted||car.city.owner==='player'||car.guards.some(g=>g.alive))return;
  const r=car.r,goods=r?[focusOf(WORLD.cities[r.a]),focusOf(WORLD.cities[r.b])]:[focusOf(car.city)],L=ECON.loot;
  const res=goods[Math.floor(Math.random()*goods.length)],coins=L.coins+L.perRank*Math.max(1,car.city.rank||1);let txt;
  if(res==='gold'){addCoins(coins*2);txt='◉'+coins*2}   // o produto é ouro: só moedas
  else{const id=res==='food'?FOOD_TYPES[Math.floor(Math.random()*FOOD_TYPES.length)]:RES_ITEM[res];invGive([[id,L.items]]);addCoins(coins);txt=L.items+'× '+itemDef(id).icon+' '+itemDef(id).name+' e ◉'+coins}
  car.looted=true;car.doomed=true;facCaravanCrime(car);   // saquear também é crime contra a facção
  if(r)destroyRoute(r);
  sfx('coin',0);toast('🏴 Caravana saqueada: '+txt+'. Ela está destruída e some quando o turno acabar.',5500);
}
function caravanAttacked(g){   // o jogador feriu um guarda de caravana
  const car=g.caravan;g.byPlayer=true;car.hit=true;
  if(car.city.owner!=='player')car.hostile=true;   // os guardas de uma caravana de outra facção reagem
  facCaravanCrime(car);
}
function removeCaravan(m){
  scene.remove(m.group);for(const b of m.cols||[])Col.remove(b);
  for(const g of m.guards||[]){g.alive=false;g.gone=true;scene.remove(g.group);const i=NPCS.indexOf(g);if(i>=0)NPCS.splice(i,1);const j=g.city&&g.city.npcs?g.city.npcs.indexOf(g):-1;if(j>=0)g.city.npcs.splice(j,1)}   // os guardas são NPCs reais: saem junto
}
// reconstruir as caravanas preserva as "condenadas" (rota desfeita ou saqueada): elas só somem quando o turno do comandante acaba
function clearCaravans(){
  const keep=CARAVANS.filter(m=>m.doomed);
  for(const m of CARAVANS)if(!m.doomed)removeCaravan(m);
  CARAVANS.length=0;CARAVANS.push(...keep);
}
function purgeDoomedCaravans(){
  for(const m of CARAVANS.filter(c=>c.doomed))removeCaravan(m);
  const keep=CARAVANS.filter(c=>!c.doomed);CARAVANS.length=0;CARAVANS.push(...keep);
}
Hooks.on('round',purgeDoomedCaravans);
// ---------- caravanas decorativas (paradas na estrada entre as cidades de uma rota) ----------
const CARAVANS=[];
// ponto NA ESTRADA, longe das cidades, em terreno plano e livre de blocos (árvores, pedras, casas); devolve também a direção da estrada (yaw)
function roadSpot(ax,az,bx,bz,t){
  const x0=ax+(bx-ax)*t,z0=az+(bz-az)*t,toB=Math.atan2(bx-ax,bz-az);
  const nearCity=(x,z)=>WORLD.cities.some(c=>Math.max(Math.abs(c.cx-x),Math.abs(c.cz-z))<c.half+12);
  const isRoad=(x,z)=>{x=Math.floor(x);z=Math.floor(z);return x>=0&&z>=0&&x<W&&z<W&&T[z*W+x]===T_ROAD};   // só estrada de terra: caravana não para em ponte (por enquanto)
  const dirAt=(x,z)=>{   // direção da estrada: a que tem mais trechos de estrada à frente e atrás
    let best=0,bc=-1;
    for(let k=0;k<8;k++){const a=k*Math.PI/8;let n=0;for(let s=-7;s<=7;s++)if(s&&isRoad(x+Math.sin(a)*s,z+Math.cos(a)*s))n++;if(n>bc){bc=n;best=a}}
    return Math.cos(best-toB)>=0?best:best+Math.PI;   // aponta para a outra cidade
  };
  const clear=(x,z,yaw,lat,tol,blocks)=>{   // carroça + cavalo (≈2×9) ao longo da estrada: terreno plano e (opcional) sem blocos
    const cy=tH(x,z),sy=Math.sin(yaw),cyw=Math.cos(yaw);
    for(let s=-3.5;s<=5;s+=1.5)for(let l=-lat;l<=lat;l+=lat||1){
      const px=x+sy*s+cyw*l,pz=z+cyw*s-sy*l;
      if(px<4||pz<4||px>=W-4||pz>=W-4)return false;
      const h=tH(px,pz);if(h<SEA+0.5||Math.abs(h-cy)>tol)return false;
      if(blocks&&Col.near(px-0.6,pz-0.6,px+0.6,pz+0.6).length)return false;
    }
    return true;
  };  const cands=[];
  for(let z=Math.round(z0)-220;z<=Math.round(z0)+220;z++)for(let x=Math.round(x0)-220;x<=Math.round(x0)+220;x++){
    if(!isRoad(x,z)||nearCity(x,z))continue;cands.push([(x-x0)*(x-x0)+(z-z0)*(z-z0),x+0.5,z+0.5]);
  }
  cands.sort((a,b)=>a[0]-b[0]);
  for(const [lat,tol,blocks] of[[1.2,1.0,true],[0.8,1.4,true],[0.8,2.0,false]])   // da exigência maior para a menor, sempre NA estrada
    for(let i=0;i<cands.length&&i<2500;i+=1){const [,x,z]=cands[i],yaw=dirAt(x,z);if(clear(x,z,yaw,lat,tol,blocks))return{x,z,yaw}}
  if(cands.length){   // estrada em terreno difícil: fica com o trecho de estrada mais plano que houver (nunca fora da estrada)
    let bs=1e9,bp=null;
    for(let i=0;i<cands.length&&i<2500;i+=1){const [d,x,z]=cands[i],yaw=dirAt(x,z),sy=Math.sin(yaw),cyw=Math.cos(yaw);let lo=1e9,hi=-1e9;
      for(let s=-3.5;s<=5;s+=1.5){const h=tH(x+sy*s,z+cyw*s);lo=Math.min(lo,h);hi=Math.max(hi,h)}
      const sc=(hi-lo)+Math.sqrt(d)*0.03+(lo<SEA+0.5?50:0);if(sc<bs){bs=sc;bp={x,z,yaw}}}
    if(bp)return bp;
  }
  for(let r=0;r<=30;r++)for(let k=0;k<(r?16:1);k++){   // sem estrada livre por perto: ponto plano e livre perto da linha
    const a=k*0.3927,x=x0+Math.cos(a)*r,z=z0+Math.sin(a)*r;
    if(!nearCity(x,z)&&clear(x,z,toB,0.8,1.4,true))return{x,z,yaw:toB};
  }
  return{x:x0,z:z0,yaw:toB};
}function makeCaravan(c,x,z,yaw){
  const g=new THREE.Group();
  const bx=(col,sx,sy,sz,px,py,pz)=>{const o=new THREE.Mesh(GEO_BOX,mat(col));o.scale.set(sx,sy,sz);o.position.set(px,py,pz);g.add(o);return o};
  const W1=0x7a5632,W2=0x5a3d22,CV=0xe8dcc0,HR=0x8a5a3a;
  bx(W1,1.7,0.3,3.0,0,0.85,0);                                   // chassi
  bx(W2,1.7,0.55,0.12,0,1.3,1.44);bx(W2,1.7,0.55,0.12,0,1.3,-1.44);bx(W2,0.12,0.55,3,0.79,1.3,0);bx(W2,0.12,0.55,3,-0.79,1.3,0);   // laterais
  bx(CV,1.5,0.95,2.7,0,2.05,0);bx(0xd8caa8,1.6,0.1,2.8,0,2.55,0);bx(W2,1.7,1.0,0.1,0,2.0,1.4);bx(0x2a1a10,1.1,0.8,0.12,0,1.95,1.48);   // lona e boca do toldo
  for(const sx of[-0.95,0.95])for(const sz of[-0.95,0.95])bx(0x2a2a2a,0.14,0.85,0.85,sx,0.45,sz);   // rodas
  bx(W2,0.1,0.1,1.9,0.35,0.9,2.3);bx(W2,0.1,0.1,1.9,-0.35,0.9,2.3);   // varais
  bx(HR,0.7,0.8,1.5,0,1.15,3.0);bx(HR,0.4,0.7,0.5,0,1.65,3.9);bx(0x2a1a10,0.42,0.2,0.2,0,1.5,4.2);   // cavalo (corpo, cabeça, focinho)
  for(const sx of[-0.22,0.22])for(const sz of[2.5,3.5])bx(0x5a3a22,0.16,0.8,0.16,sx,0.4,sz);
  bx(0x2a1a10,0.06,2.8,0.06,0.9,2.3,-1.4);                        // mastro da bandeira
  bx(facColor(c.fid)||0x2a6aff,1.1,0.4,0.05,1.45,3.5,-1.4);bx(CITY_COLS[c.id%CITY_COLS.length],1.1,0.35,0.05,1.45,3.1,-1.4);   // bandeira da cidade (azul) com a faixa de identidade
  let gy=tH(x,z);for(let s=-3.5;s<=5;s+=1.5)gy=Math.max(gy,tH(x+Math.sin(yaw)*s,z+Math.cos(yaw)*s));   // não fica enterrada em declives
  g.position.set(x,gy,z);g.rotation.y=yaw;
  const root=new THREE.Group();root.add(g);
  const car={group:root,x,z,yaw,guards:[],city:c,cols:[]};
  // colisão: carroça e cavalo são sólidos (caixas alinhadas aos eixos que cobrem o retângulo girado)
  {const sn=Math.sin(yaw),cs=Math.cos(yaw);
   const seg=(lz,hw,hl,h)=>{const wx=x+lz*sn,wz=z+lz*cs,rx=Math.abs(hw*cs)+Math.abs(hl*sn),rz=Math.abs(hw*sn)+Math.abs(hl*cs),b={x0:wx-rx,y0:gy,z0:wz-rz,x1:wx+rx,y1:gy+h,z1:wz+rz};Col.add(b);car.cols.push(b)};
   seg(0,0.9,1.5,2.7);seg(3.1,0.4,1.1,1.5)}
  // 3 guardas da cidade/facção em volta da caravana: NPCs reais (dá para atirar neles), parados, olhando para fora
  for(const [ox,oz] of[[-3.1,1.2],[3.1,1.2],[0,-3.6]]){
    const gx=x+ox*Math.cos(yaw)+oz*Math.sin(yaw),gz=z-ox*Math.sin(yaw)+oz*Math.cos(yaw);
    if(Math.abs(tH(gx,gz)-tH(x,z))>1.4||tH(gx,gz)<SEA+0.5||Col.near(gx-0.5,gz-0.5,gx+0.5,gz+0.5).length)continue;   // não põe guarda dentro de pedra/árvore
    const n=spawnNpc(c,{role:'guard',x:gx,z:gz,y:tH(gx,gz),yaw:Math.atan2(gx-x,gz-z),stationary:true});
    root.add(n.group);   // a caravana inteira some e aparece junto
    n.group.position.set(gx,n.y,gz);n.group.rotation.y=n.yaw;   // updateNpc não roda para guarda de caravana, então a posição é dada aqui
    Object.assign(n,{caravan:car,hp:70,maxhp:70,homeX:gx,homeZ:gz,yaw0:n.group.rotation.y,cool:Math.random()*1.5,deadT:0});
    car.guards.push(n);
  }
  scene.add(root);CARAVANS.push(car);return car;
}
function rebuildCaravans(){
  clearCaravans();
  if(STATE.round<1)return;   // rodada 0: sem caravanas
  for(const r of STATE.rd.routes.concat(STATE.rd.nroutes||[])){
    const A=WORLD.cities[r.a],B=WORLD.cities[r.b];if(!A||!B)continue;
    // duas caravanas no meio da estrada: a da cidade A um pouco antes do meio, a da B um pouco depois, cada uma voltada para a outra cidade
    const s1=roadSpot(A.cx,A.cz,B.cx,B.cz,0.40),s2=roadSpot(B.cx,B.cz,A.cx,A.cz,0.40);
    makeCaravan(A,s1.x,s1.z,s1.yaw).r=r;makeCaravan(B,s2.x,s2.z,s2.yaw).r=r;   // .r = a rota da caravana (política Ataque às caravanas)
  }
}
function buyCaravan(A,B){
  const rd=STATE.rd;
  if(!isLeader())toast('Caravanas só no turno do líder.',2000);
  else if(!A||!B||A===B)toast('Escolha duas cidades diferentes.',2000);
  else if(rd.routes.some(r=>(r.a===A.id&&r.b===B.id)||(r.a===B.id&&r.b===A.id)))toast('Já existe uma caravana entre elas.',2500);
  else if(A.rebel||B.rebel)toast((A.rebel?A.name:B.name)+' está em rebelião: não há caravana para lá.',3000);
  else if(focusOf(A)===focusOf(B))toast('As duas cidades produzem o mesmo recurso: a caravana seria inútil.',3000);
  else if(hasRoute(A)||hasRoute(B))toast('Cada cidade só pode ter uma caravana ativa por vez: '+(hasRoute(A)?A.name:B.name)+' já tem uma.',3500);
  else if(polFlag('noRoute',A.id)||polFlag('noRoute',B.id))toast('Uma epidemia impede novas caravanas para essa cidade.',3000);
  else if(B.owner!=='player'&&!facTradeOK(B.fid))toast('Sem comércio com '+facOf(B.fid).name+': só com relação desfavorável ou melhor.',3500);
  else if(poiRouteBlocked({a:A.id,b:B.id}))toast('Um Entreposto inimigo (ou seu, contra o inimigo) impede essa rota.',3000);
  else if(!canAct('caravan'))toast('Sem ações do líder nesta rodada.',2500);
  else if(!Ledger.spend({gold:meetCaravanCost()}))toast('Ouro insuficiente (ou você está em dívida).',2500);
  else{spendAct('caravan');rd.routes.push({a:A.id,b:B.id});rebuildCaravans();computeBuffs();facRouteGain(B);sfx('win',0);toast('🛒 Duas caravanas partiram entre '+A.name+' e '+B.name+'. (−◉'+CARAVAN_COST+')',3500)}
}
// resumo da negociação: o que cada cidade dá e recebe, antes de fechar o acordo
function dealSummary(A,B,onYes){
  const fa=focusOf(A),fb=focusOf(B),ic=r=>resIcon(r)+' '+resName(r).toLowerCase();
  const line=(X,give,get,mine)=>'<tr><td><b>'+X.name+'</b> <small>(sua)</small></td><td>recebe: <b>'+ic(get)+'</b></td></tr>';   // só as cidades suas: o que a outra cidade ganha não interessa
  // efeito de cada lado: recurso físico → regra do percentual (150% some, 200% cai para 100%, 100% não muda); ouro → bônus por rodada
  const effects=[];
  const side=(X,get,from,mineX)=>{
    if(NEEDS.includes(get)){
      const cur=ec(X).pct[get]||0,u=p=>Math.round(p*ECON.baseNeed/100);
      effects.push((mineX?'✔ ':'ℹ ')+'<b>'+X.name+'</b> recebe '+ic(get)+(cur?' (necessidade de hoje: <b>'+cur+'%</b> → <b>'+(tradePct(cur)?tradePct(cur)+'%':'some')+'</b>)':' (hoje ela já não precisa)')+':'
        +'<table class="ldt" style="width:100%;color:#ddd;margin:4px 0"><tr><td><b>Necessidade</b></td><td><b>com a caravana</b></td><td><b>unidades por rodada</b></td></tr>'
        +[100,150,200].map(p=>{const np=tradePct(p);return '<tr'+(p===cur?' style="background:rgba(255,210,58,.2)"':'')+'><td>'+p+'%'+(p===cur?' ◀ hoje':'')+'</td><td>'+(np?np+'%':'<b>some</b>')+'</td><td>'+u(p)+' → '+u(np)+'</td></tr>'}).join('')+'</table>');    }else if(get==='gold'){
      const g=Math.round(prodOf(from)*ECON.tradeGold);
      if(mineX&&focusOf(X)!=='gold')effects.push('💰 '+X.name+' recebe <b>ouro</b>: +◉'+g+' por rodada no cofre (metade da produção de ouro de '+from.name+').');
      else if(mineX)effects.push('ℹ '+X.name+' também produz ouro: sem bônus nessa direção.');
    }
  };
  side(A,fb,B,true);
  if(B.owner==='player')side(B,fa,A,true);
  if(focusOf(A)==='gold')effects.push('⚠ '+A.name+' produz ouro: com acordo, ela <b>deixa de render imposto</b> e a produção segue pela caravana.');
  else effects.push('ℹ A produção de '+ic(fa)+' de '+A.name+' segue pela caravana (não vai ao armazém).');
  if(B.owner!=='player'&&B.fid)effects.push('🤝 Relação com <b>'+facOf(B.fid).name+'</b>: '+(facActUsed(B.fid,'route')||relOf(B.fid).war?'sem ganho (já houve rota nesta rodada)':'<b>+'+relPreview(B.fid,FAC_ROUTE_GAIN)+'</b> (hoje '+relOf(B.fid).v+'/10)')+'.');
  const w=UI.window({title:'🛒 Resumo da negociação',width:Math.min(520,innerWidth-30),z:60});
  w.body.innerHTML='<table class="ldt" style="width:100%;color:#ddd">'+line(A,fa,fb,true)+(B.owner==='player'?line(B,fb,fa,true):'')+'</table><p style="font-size:13px;line-height:1.6">'+effects.join('<br>')+'</p><p>Preço do acordo: <b style="color:#ffd23a">◉ '+CARAVAN_COST+'</b>'+(actCost('caravan')?' + '+actCost('caravan')+' ação do líder':'')+' • Duas caravanas (uma de cada cidade) vão para a estrada, com guardas.</p>';
  w.foot.append(UI.button('Fechar acordo (◉'+CARAVAN_COST+')','gold',()=>{w.close();w.el.remove();onYes()}),UI.button('Voltar ao mapa','alt',()=>{w.close();w.el.remove()}));
  w.open();return w;
}
