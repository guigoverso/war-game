'use strict';
// ---------- Missões (Fase 5): das cidades (prefeitura) e das facções (escolhidas pelo líder) ----------
// Tudo fica em STATE.ms (salvo com o jogo):
//   city[cityId] = {round, list}  quadro da prefeitura: nível da cidade × 2 missões por rodada; só renova na rodada seguinte
//   fac[fid]     = {round, m}     oferta da facção: 1 por rodada, nunca de facção em guerra
//   taken        = missões aceitas (várias ao mesmo tempo, as da cidade e as das facções separadas por m.src)
//   active       = id da missão ativa (marcador no mapa e no HUD); só uma. A primeira aceita é a ativa por padrão.
// Missão da cidade: ouro, recursos ou os dois; não expira. Missão de facção: ◉ + 1 ponto de relação (máx. MS.relCap por facção por rodada);
// se a rodada acabar sem cumprir, falha e a relação cai 1. Escolher uma missão de facção é uma ação do líder (ECON.act.mission).
// Tipos: camp (acabar com um bando), hostage (resgatar refém), delivery (entregar pacote numa cidade), pack (matilha num ponto do mapa),
//        resource (entregar recurso na prefeitura da facção) e relic (entregar relíquia de dungeon; vender a relíquia faz a missão falhar).
const MS={relGain:1,relFail:1,relCap:2,facGold:60,facGoldLvl:20,perLvl:2,resQty:[5,9]};   // números de balanceamento das missões
const MS_RT={packs:{}};   // execução: matilhas criadas pelas missões (não vão para o save)
const MS_ITEMS=['tora','minerio','couro','carne'],MS_RES=['wood','ore','leather','food'];
const MS_SPECIES_NAME={wolf:'lobos',bear:'ursos',spider:'aranhas',boar:'javalis',scorpion:'escorpiões'};

Hooks.on('resetState',()=>{STATE.ms={seq:1,city:{},fac:{},taken:[],active:null,done:0,gain:{}}});
function msNormalize(){const s=STATE.ms||(STATE.ms={});if(!s.seq)s.seq=1;s.city=s.city||{};s.fac=s.fac||{};s.taken=s.taken||[];if(s.active===undefined)s.active=null;s.done=s.done||0;s.gain=s.gain||{}}
const msById=id=>(STATE.ms.taken.find(m=>m.id===id))||null;
const msActive=()=>msById(STATE.ms.active);
function msFixActive(){const s=STATE.ms;if(!msById(s.active))s.active=s.taken.length?s.taken[0].id:null}
const msLevel=c=>c.home?STATE.rd.lvl:cityLvl(c);   // nível da cidade (capital: nível do líder)

// ---------- textos ----------
function msTitle(m){
  if(m.type==='camp')return 'Acabar com os '+m.gang;
  if(m.type==='hostage')return 'Resgatar um refém dos '+m.gang;
  if(m.type==='delivery')return 'Entregar '+m.cargo+' em '+WORLD.cities[m.destId].name;
  if(m.type==='pack')return 'Eliminar uma matilha de animais';
  if(m.type==='resource')return 'Entregar '+m.qty+' '+resIcon(m.res)+' '+resName(m.res).toLowerCase();
  return 'Entregar uma relíquia de dungeon';
}
function msText(m){
  const t=msText0(m);return m.src==='fac'&&(m.type==='camp'||m.type==='hostage'||m.type==='pack')?t+' Depois, reporte na prefeitura de '+WORLD.cities[m.cityId].name+' com [E].':t;
}
function msText0(m){
  const c=WORLD.cities[m.cityId];
  if(m.type==='camp')return 'O bando dos '+m.gang+' assalta viajantes perto de '+c.name+'. Encontre o acampamento (marcado no mapa) e elimine todos os bandidos.';
  if(m.type==='hostage')return 'Os '+m.gang+' mantêm um refém numa jaula. Elimine os bandidos e abra a grade.';
  if(m.type==='delivery')return 'Leve o pacote até a prefeitura de '+WORLD.cities[m.destId].name+' ('+m.dist+' m) e entregue com [E]. Bandidos podem emboscar você na estrada.';
  if(m.type==='pack')return 'Vá até o ponto marcado no mapa: uma matilha de animais selvagens vai aparecer. Elimine todos.';
  if(m.type==='resource')return 'Leve '+m.qty+' unidades de '+resName(m.res).toLowerCase()+' (da bolsa) à prefeitura de '+c.name+' e entregue com [E].';
  return 'Traga uma relíquia encontrada numa dungeon (o portal fica marcado no mapa) e entregue na prefeitura de '+c.name+'. Se você vender a relíquia, a missão falha.';
}
const msWho=m=>m.src==='fac'?facOf(m.fid).name:'Prefeitura de '+WORLD.cities[m.cityId].name;
function msRewardTxt(m){
  const r=m.reward,p=[];
  if(r.gold)p.push('◉'+(m.src==='city'?qPay({reward:r.gold}):r.gold));
  for(const [id,n] of r.items||[])p.push(n+'× '+itemDef(id).icon+' '+itemDef(id).name);
  if(m.src==='fac')p.push('🤝 relação +'+relPreview(m.fid,MS.relGain)+' com '+facOf(m.fid).name);
  return p.join(' • ');
}

// ---------- geração ----------
function msBase(src,o){return Object.assign({id:STATE.ms.seq++,src,round:STATE.round},o)}
function msGenCity(c){
  const n=msLevel(c)*MS.perLvl,rng=new RNG((WORLD.seed*91+c.id*37+STATE.round*131+7)>>>0),out=[];
  for(let i=0;i<n;i++){
    const type=rng.pick(['camp','hostage','delivery']),m=msBase('city',{type,cityId:c.id,tier:rng.int(1,2),gang:rng.pick(GANGS),cargo:rng.pick(CARGO)});
    let gold;
    if(type==='delivery'){
      const others=WORLD.cities.filter(k=>k!==c).sort((a,b)=>qDist(b,c)-qDist(a,c)),dest=rng.pick(others.slice(0,Math.max(2,Math.ceil(others.length*0.7))));
      m.destId=dest.id;m.dist=Math.round(qDist(dest,c));gold=70+Math.round(m.dist*1.2)+rng.int(0,40);
    }else gold=(type==='camp'?110:150)+m.tier*80+c.rank*10+rng.int(0,50);
    const roll=rng.next(),item=rng.pick(MS_ITEMS),qty=rng.int(4,7)+m.tier;   // nem toda missão paga em dinheiro: algumas dão recursos
    m.reward=roll<0.5?{gold}:roll<0.8?{items:[[item,qty]]}:{gold:Math.round(gold*0.5),items:[[item,Math.ceil(qty/2)]]};
    out.push(m);
  }
  return out;
}
function msBoard(c){
  if(prepOn()||c.rebel)return [];   // rodada 0: sem missões
  const s=STATE.ms;let b=s.city[c.id];
  if(!b||b.round!==STATE.round)b=s.city[c.id]={round:STATE.round,list:msGenCity(c)};   // renova só na rodada seguinte
  return b.list;
}
function msGenFac(f){
  if(relStatus(f.id)==='war'||!facCities(f.id).length)return null;
  const rng=new RNG((WORLD.seed*57+f.id*211+STATE.round*17+3)>>>0),st=relStatus(f.id),cs=facCities(f.id).filter(x=>!x.rebel);if(!cs.length)return null;   // cidade em rebelião não tem missões
  const outdoor=['camp','hostage','pack'],indoor=['delivery','resource'].concat(typeof DG!=='undefined'&&DG.ok?['relic']:[]);
  const type=rng.pick(st==='enemy'?outdoor:outdoor.concat(indoor));   // inimiga não deixa entrar nas cidades: só missões ao ar livre
  const c=rng.pick(cs),m=msBase('fac',{type,fid:f.id,cityId:c.id,tier:rng.int(1,2),gang:rng.pick(GANGS),cargo:rng.pick(CARGO)});
  if(type==='delivery'){const d=rng.pick(cs);m.destId=d.id;m.dist=Math.round(qDist(d,{cx:P.x,cz:P.z}))}
  if(type==='resource'){m.res=rng.pick(MS_RES);m.qty=rng.int(MS.resQty[0],MS.resQty[1])}
  m.reward={gold:MS.facGold+MS.facGoldLvl*Math.max(1,Math.ceil((c.rank||1)/2))};
  return m;
}
// no máximo 2 ofertas de facção a cada 3 rodadas: em cada bloco sorteia 2 das 3 rodadas e uma facção para cada
function msFacSlot(f){
  if(prepOn()||!WORLD.factions.length)return false;
  const g=Math.floor((STATE.round-1)/3),rr=STATE.round-1-g*3,rng=new RNG((WORLD.seed*73+g*1009+11)>>>0);
  const rounds=rng.shuffle([0,1,2]).slice(0,2),ids=rng.shuffle(WORLD.factions.map(x=>x.id));
  const i=rounds.indexOf(rr);return i>=0&&ids[i%ids.length]===f.id;
}
function msFacOffer(f){
  if(!msFacSlot(f))return null;
  const s=STATE.ms,o=s.fac[f.id];
  if(o&&o.round===STATE.round)return o.m;
  const m=msGenFac(f);s.fac[f.id]={round:STATE.round,m};return m;
}

// ---------- preparar o alvo, aceitar, ativar ----------
const msRelicPortal=()=>(STATE.portals||[]).find(p=>p.reward&&p.reward.type==='relic'&&!p.claimed)||null;
function msEnsureRelicPortal(){   // sem portal de relíquia, o jogo transforma um portal em um (ou gera as dungeons primeiro)
  let p=msRelicPortal();if(p)return p;
  if(!(STATE.portals||[]).length&&typeof spawnPortals==='function'&&DG.ok)spawnPortals();
  p=(STATE.portals||[]).find(q=>!q.claimed&&!q.golden);if(p){p.reward={type:'relic'};return p}
  return null;
}
function msPackPoint(c){
  for(let t=0;t<40;t++){
    const a=Math.random()*6.283,d=c.half+60+Math.random()*80,x=c.cx+Math.cos(a)*d,z=c.cz+Math.sin(a)*d;
    if(x<20||z<20||x>W-20||z>W-20||tH(x,z)<SEA+1.5)continue;
    if(WORLD.cities.some(k=>Math.max(Math.abs(x-k.cx),Math.abs(z-k.cz))<k.half+20))continue;
    if(WORLD.camps.some(k=>Math.hypot(k.cx-x,k.cz-z)<25))continue;
    return{x:Math.floor(x),z:Math.floor(z)};
  }
  return null;
}
function msPrepare(m){   // devolve false (com aviso) se não deu para montar a missão
  const c=WORLD.cities[m.cityId];
  if(m.type==='camp'||m.type==='hostage'){
    let camp=WORLD.camps.find(k=>okQuestCamp(k,c,m.type));if(!camp)camp=respawnQuestCamp(c,m);if(!camp)camp=WORLD.camps.find(k=>okQuestCamp(k,c,m.type,true));
    if(!camp){toast('Nenhum local adequado para o acampamento foi encontrado. Tente outra missão.',3000);return false}
    camp.questTarget=true;camp.name='Acampamento dos '+m.gang;m.campId=camp.id;
  }else if(m.type==='pack'){
    const p=msPackPoint(c);if(!p){toast('Não achei um ponto livre para a matilha. Tente outra missão.',3000);return false}
    m.pack=p;m.spawned=false;
  }else if(m.type==='relic'){
    if(!msEnsureRelicPortal()){toast('Não foi possível gerar uma dungeon agora. Tente outra missão.',3000);return false}
  }
  return true;
}
function msAdd(m){const s=STATE.ms;m.state='taken';s.taken.push(m);if(s.active===null)s.active=m.id;sfx('coin',0)}   // a primeira aceita vira a ativa
function msTakeCity(c,m){
  const list=msBoard(c),i=list.indexOf(m);if(i<0||!msPrepare(m))return false;
  list.splice(i,1);msAdd(m);toast('📜 Missão aceita: '+msTitle(m),3500);return true;
}
function msFacBlock(f){   // por que o líder não pode aceitar a oferta agora (ou null)
  if(!isLeader())return 'Só no turno do líder.';
  if(!canAct('mission'))return 'Sem ações do líder nesta rodada.';
  return null;
}
function msTakeFac(fid){
  const f=facOf(fid),m=f&&msFacOffer(f);if(!m||msFacBlock(f))return false;
  if(!msPrepare(m))return false;
  spendAct('mission');STATE.ms.fac[fid].m=null;msAdd(m);
  facNote('📜 Missão de '+f.name+' aceita: '+msTitle(m)+'. O comandante a cumpre ainda nesta rodada.');return true;
}
function msSetActive(id){if(msById(id)){STATE.ms.active=id;toast('⭐ Missão ativa: '+msTitle(msById(id)),2500)}}

// ---------- alvo, mapa e HUD ----------
function msTarget(m){
  const city=i=>{const c=WORLD.cities[i],h=c.hall;return{x:h?h.x:c.cx,z:h?h.z:c.cz}};   // o indicador vai para a prefeitura
  if(m.ready)return city(m.cityId);   // objetivo cumprido: falta reportar na prefeitura
  if(m.type==='delivery')return city(m.destId);
  if(m.type==='camp'||m.type==='hostage'){const k=WORLD.camps.find(x=>x.id===m.campId);return k?{x:k.cx,z:k.cz}:null}
  if(m.type==='pack')return m.pack?{x:m.pack.x,z:m.pack.z}:null;
  if(m.type==='resource')return city(m.cityId);
  if(m.type==='relic'){if(invCount('reliquia')>0)return city(m.cityId);const p=msRelicPortal();return p?{x:p.x,z:p.z}:city(m.cityId)}
  return null;
}
function questTarget(){const m=msActive();return m?msTarget(m):null}   // estrela do minimapa e do mapa
function questLine(){
  const m=msActive();if(!m)return '';
  const t=msTarget(m),d=t?Math.round(Math.hypot(t.x-P.x,t.z-P.z)):0,more=STATE.ms.taken.length-1;
  return '<br><span style="color:#ffe680">📜 '+msTitle(m)+(more>0?' (+'+more+')':'')+'<br>★ '+d+' m</span>';
}
let msWin=null;
function msShowMap(m){   // o mapa aparece num popup (não abre a aba Mapa do caderno)
  const t=msTarget(m);if(!t){toast('Esta missão ainda não tem um local marcado.',2000);return}
  if(!msWin)msWin=UI.window({title:'',width:Math.min(540,innerWidth-30),z:70,buttons:[{label:'Fechar',cls:'gold'}]});
  msWin.setTitle('📍 '+msTitle(m));
  const sz=Math.max(260,Math.min(480,innerWidth-80,innerHeight-210));
  msWin.body.innerHTML='<canvas id="msmapcv" width="'+sz+'" height="'+sz+'" style="display:block;margin:0 auto;border:3px solid #111"></canvas><p class="st" style="text-align:center">'+msText(m)+'</p>';
  msWin.open();const isAct=m.id===STATE.ms.active;drawBigMap(document.getElementById('msmapcv'),isAct?{x:t.x,z:t.z,label:'Missão ativa'}:{x:t.x,z:t.z,label:'Missão',col:'#4adcff',lcol:'#a8ecff'});   // a ativa usa o símbolo da ativa; as outras, a estrela azul
}

// ---------- concluir e falhar ----------
const msLine=t=>{rdNow(t)};
function msDrop(m){const s=STATE.ms,i=s.taken.indexOf(m);if(i>=0)s.taken.splice(i,1);if(m.campId!==undefined){const k=WORLD.camps.find(x=>x.id===m.campId);if(k)k.questTarget=false}msFixActive()}
function msComplete(m){
  if(!m||STATE.ms.taken.indexOf(m)<0)return;
  msDrop(m);STATE.ms.done++;const r=m.reward,t=[];
  if(m.src==='city'){
    if(r.gold){const g=qPay({reward:r.gold});addCoins(g);t.push('◉'+g)}
    if(r.items){invGive(r.items);r.items.forEach(([id,n])=>t.push(n+'× '+itemDef(id).name))}
  }else{
    addCoins(r.gold);t.push('◉'+r.gold);
    const g=STATE.ms.gain[m.fid]&&STATE.ms.gain[m.fid].round===STATE.round?STATE.ms.gain[m.fid]:(STATE.ms.gain[m.fid]={round:STATE.round,n:0});
    if(g.n<MS.relCap){const d=relChange(m.fid,MS.relGain,'você cumpriu uma missão dela');g.n+=Math.max(0,d);t.push('relação +'+d+' com '+facOf(m.fid).name)}
    else t.push('limite de relação da rodada com '+facOf(m.fid).name)
  }
  const line='✅ Missão cumprida: '+msTitle(m)+' ('+t.join(', ')+')';toast(line,5000);msLine(line);sfx('win',0);
}
function msFail(m,msg){
  if(!m||STATE.ms.taken.indexOf(m)<0)return;
  msDrop(m);let extra='';
  if(m.src==='fac'&&relStatus(m.fid)!=='war'){const d=relChange(m.fid,-MS.relFail,'você não cumpriu a missão a tempo');extra=' Relação '+d+' com '+facOf(m.fid).name+'.'}
  const line='❌ '+(msg||'Missão falhou')+': '+msTitle(m)+'.'+extra;toast(line,4500);msLine(line);
}
function msFailByCamp(c,msg){for(const m of STATE.ms.taken.slice())if((m.type==='hostage'||m.type==='camp')&&m.campId===c.id&&!m.ready)msFail(m,msg)}
// objetivo de campo cumprido: missão de facção ainda precisa ser reportada na prefeitura; missão de cidade conclui na hora
function msObjective(m){
  if(!m||m.ready)return;
  if(m.src!=='fac'){msComplete(m);return}
  m.ready=true;if(m.campId!==undefined){const k=WORLD.camps.find(x=>x.id===m.campId);if(k)k.questTarget=false}
  toast('✔ Objetivo cumprido! Reporte na prefeitura de '+WORLD.cities[m.cityId].name+'.',4500);sfx('win',0);
}
function questCampCleared(c){for(const m of STATE.ms.taken.slice())if(m.type==='camp'&&m.campId===c.id)msObjective(m)}
function questHostageFreed(c){const m=STATE.ms.taken.find(x=>x.type==='hostage'&&x.campId===c.id);return m?m.id:0}   // o refém libertado conta para a missão (poi.js)
function msRelicSold(){for(const m of STATE.ms.taken.filter(x=>x.type==='relic'))msFail(m,'Você vendeu a relíquia')}
// fim da rodada: missões de facção não cumpridas falham (-1 de relação)
function msRoundEnd(){for(const m of STATE.ms.taken.filter(x=>x.src==='fac'))msFail(m,'O prazo acabou')}
Hooks.on('round',msRoundEnd);
// depois de carregar um save: religa os acampamentos das missões e recomeça as matilhas
function msAfterLoad(){
  msNormalize();
  for(const m of STATE.ms.taken.slice()){
    if(m.type==='camp'||m.type==='hostage'){
      const k=WORLD.camps.find(x=>x.id===m.campId);
      if(m.ready)continue;
      if(!k||k.gone||k.state==='cleared'&&m.type==='camp'){STATE.ms.taken.splice(STATE.ms.taken.indexOf(m),1);continue}
      k.questTarget=true;k.name='Acampamento dos '+m.gang;
    }
    if(m.type==='pack'&&!m.ready)m.spawned=false;
  }
  msFixActive();
}

// ---------- entrega de recursos e relíquia na prefeitura da facção ----------
const msHas=(res)=>[...STATE.inv.slots,...STATE.inv.bar].filter(s=>s&&supplyOf(s.id)&&supplyOf(s.id).res===res).reduce((a,s)=>a+s.n,0);
function msTake(res,n){let left=n;for(const s of[...STATE.inv.slots,...STATE.inv.bar]){if(left<=0)break;if(s&&supplyOf(s.id)&&supplyOf(s.id).res===res)left-=invRemove(s.id,Math.min(left,s.n))}return n-left}
// onde a missão termina: entregas, recursos, relíquias e o relatório das missões de facção (acampamento/refém/matilha)
function msHallId(m){
  if(m.type==='delivery')return m.destId;
  if(m.type==='resource'||m.type==='relic')return m.cityId;
  return m.src==='fac'&&m.ready?m.cityId:-1;
}
function msDeliverFor(c){return STATE.ms.taken.find(m=>msHallId(m)===c.id)||null}
const msDeliverTxt=m=>m.type==='resource'?m.qty+' '+resName(m.res).toLowerCase():m.type==='relic'?'a relíquia':m.type==='delivery'?'o pacote':'o relatório';
function msDeliver(m){
  if(m.type==='delivery'){toast('📦 Pacote entregue em '+WORLD.cities[m.destId].name+'!',3000);msComplete(m)}
  else if(m.ready){toast('📜 Missão reportada em '+WORLD.cities[m.cityId].name+'.',2500);msComplete(m)}
  else if(m.type==='resource'){
    if(msHas(m.res)<m.qty){toast('Faltam itens: você tem '+msHas(m.res)+' de '+m.qty+' ('+resName(m.res).toLowerCase()+' na bolsa).',3000);return}
    msTake(m.res,m.qty);toast('📦 Entregue na prefeitura de '+WORLD.cities[m.cityId].name+'.',2500);msComplete(m);
  }else{
    if(invCount('reliquia')<1){toast('Você não tem a relíquia (bolsa).',2500);return}
    invRemove('reliquia',1);toast('🏺 Relíquia entregue em '+WORLD.cities[m.cityId].name+'.',2500);msComplete(m);
  }
}

// ---------- por frame: entregas, matilhas e emboscadas ----------
function msSpawnPack(m){
  const x=m.pack.x,z=m.pack.z,s={x,z,y:Math.max(tH(x,z),SEA)},rng=new RNG((Math.random()*1e9)|0),species=packSpecies(rng,B[z*W+x]);
  const c=newArea('pack',900+WORLD.packs.length,'Animais selvagens',s,rng,{rank:2,owner:'wild',leash:50,species,ax:x,az:z,tx:x,tz:z,rt:10,temp:true});
  WORLD.packs.push(c);WORLD.areas.push(c);populatePack(c);MS_RT.packs[m.id]=c;m.spawned=true;
  toast('🐾 Uma matilha de '+(MS_SPECIES_NAME[species]||'animais')+' apareceu! Elimine todos ('+c.enemies.length+').',4000);sfx('alarm',0);
}
function updateQuests(dt){
  const s=STATE.ms;if(!s)return;let delivery=false;
  for(const m of s.taken.slice()){
    if(m.type==='delivery'){
      delivery=true;   // a entrega é feita na prefeitura do destino ([E])
    }else if(m.type==='pack'&&m.pack){
      if(!m.spawned){if(!P.dead&&Math.hypot(P.x-m.pack.x,P.z-m.pack.z)<55)msSpawnPack(m)}
      else{const a=MS_RT.packs[m.id];if(!a||!a.enemies.some(e=>e.alive)){toast('🐾 Matilha eliminada!',3000);msObjective(m)}}
    }
  }
  if(delivery){
    QUEST.ambT-=dt;
    const zone=WORLD.cities.find(k=>Math.max(Math.abs(P.x-k.cx),Math.abs(P.z-k.cz))<k.half+10);
    if(QUEST.ambT<=0){QUEST.ambT=22+Math.random()*20;if(!zone&&!P.dead&&QUEST.ambCount<4&&Math.random()<0.55&&spawnAmbush())QUEST.ambCount++}
  }else QUEST.ambCount=0;
  updateAmbushes(dt);
}

// ---------- prefeitura: quadro da cidade ----------
function openQuests(c){G.questCity=c;openPanel('quests');renderQuests()}
function renderQuests(){
  const c=G.questCity,list=msBoard(c),cap=msLevel(c)*MS.perLvl,mine=STATE.ms.taken.filter(m=>m.src==='city').length;
  if(prepOn()){$('qinfo').textContent='Missões de '+c.name;$('qbody').innerHTML='<p class="st">Rodada 0 (preparação): ainda não há missões. Elas começam na rodada 1.</p>';return}
  const dl=STATE.ms.taken.filter(m=>msHallId(m)===c.id);
  $('qinfo').textContent='Missões de '+c.name+' • nível '+msLevel(c)+' • restam '+list.length+' de '+cap+' (renovam na próxima rodada)';
  $('qbody').innerHTML=(dl.length?'<div class="grid">'+dl.map(m=>'<div class="card"><b>'+msTitle(m)+'</b><div class="st">Entrega aqui.</div><button class="gold" data-d="'+m.id+'">Entregar '+msDeliverTxt(m)+'</button></div>').join('')+'</div>':'')+(list.length?'<div class="grid">'+list.map(m=>'<div class="card"><b>'+msTitle(m)+'</b><div class="st">'+msText(m)+'<br>Recompensa: <b style="color:#ffd23a">'+msRewardTxt(m)+'</b> '+(m.reward.gold?rewardTag():'')+'</div><button class="gold" data-q="'+m.id+'">Aceitar</button></div>').join('')+'</div>':'<p class="st">Todas as missões desta rodada já foram aceitas. Novas surgem na próxima rodada.</p>')
    +'<p class="st">Você tem '+mine+' missão(ões) de cidade aceita(s). Veja, ative e acompanhe no livro, aba 📋 Missões.</p>';
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#qbody button');if(!b||b.classList.contains('qmark'))return;
  if(b.dataset.d){const d=msById(+b.dataset.d);if(d)msDeliver(d);renderQuests();return}
  const c=G.questCity,m=msBoard(c).find(x=>String(x.id)===b.dataset.q);
  if(m)msTakeCity(c,m);
  renderQuests();
});

// ---------- livro: aba Missões (esquerda: cidades • direita: facções) ----------
function msCard(m,extra){
  const act=m.id===STATE.ms.active;
  return '<div class="ldroute"><b>'+(act?'⭐ ':'')+msTitle(m)+'</b><br><small>'+msWho(m)+' • '+msRewardTxt(m)+'</small><br><small>'+msText(m)+'</small><br>'
    +'<button data-a="msmap" data-id="'+m.id+'">📍 Ver no mapa</button><button data-a="msact" data-id="'+m.id+'" '+(act?'disabled':'')+'>⭐ '+(act?'Ativa':'Ativar')+'</button><button class="red" data-a="msdrop" data-id="'+m.id+'">Abandonar</button></div>';
}
function msBookPages(){
  const s=STATE.ms,city=s.taken.filter(m=>m.src==='city'),fac=s.taken.filter(m=>m.src==='fac');
  const boards=playerCities().map(c=>'<li>'+c.name+': '+msBoard(c).length+' de '+msLevel(c)*MS.perLvl+' disponíveis</li>').join('');
  const L='<h3>Missões das cidades</h3><p class="ldsm">Pegue na prefeitura de uma cidade sua ([E]). Renovam a cada rodada; as aceitas não expiram.</p><h4>Nas prefeituras</h4><ul class="ldul">'+boards+'</ul>'
    +'<h4>Aceitas ('+city.length+')</h4>'+(city.length?city.map(m=>msCard(m)).join(''):'<p class="ldsm">Nenhuma.</p>');
  const offers=WORLD.factions.map(f=>{
    const m=msFacOffer(f),block=msFacBlock(f);
    if(!m)return '<div class="ldroute"><b>'+f.name+'</b><br><small>'+(prepOn()?'Rodada 0: sem interações com facções.':relStatus(f.id)==='war'?'Em guerra: sem missões.':(msFacSlot(f)?'Oferta já aceita nesta rodada.':'Sem oferta nesta rodada.'))+'</small></div>';
    return '<div class="ldroute"><b>'+f.name+'</b>: '+msTitle(m)+'<br><small>'+msRewardTxt(m)+'</small><br><small>'+msText(m)+'</small><br><button data-a="mstakef" data-fid="'+f.id+'" '+(block?'disabled':'')+' title="'+(block||'')+'">✔ Aceitar (1 ação)</button>'+(block?' <small>'+block+'</small>':'')+'</div>';
  }).join('');
  const R='<h3>Missões das facções</h3><p class="ldsm">No máximo 2 ofertas de facção a cada 3 rodadas (sorteadas). O líder escolhe (1 ação); o comandante cumpre nesta rodada ou a missão falha (−1 de relação).</p><h4>Ofertas desta rodada</h4>'+offers
    +'<h4>Aceitas ('+fac.length+')</h4>'+(fac.length?fac.map(m=>msCard(m)).join(''):'<p class="ldsm">Nenhuma.</p>');
  return[L,R];
}
