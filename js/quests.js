'use strict';
// ---------- Missões: quadro da prefeitura (geradas proceduralmente) ----------
const QUEST={active:null,counter:{},boards:{},done:0,ambushes:[],ambT:0,ambCount:0,ambSeq:0,campSeq:0};
const GANGS=['Corvos Negros','Lobos Cinzentos','Víboras do Vale','Salteadores da Estrada','Punhos de Ferro','Sombras da Mata','Chacais','Abutres','Lâminas Rubras','Cães Selvagens'];
const CARGO=['uma carta lacrada','uma caixa de remédios','uma encomenda de ferramentas','um saco de sementes raras','uma relíquia da capela','um baú de documentos','um barril de vinho'];

function qDist(a,b){return Math.hypot(a.cx-b.cx,a.cz-b.cz)}
function genBoard(c){
  const n=QUEST.counter[c.id]||0,rng=new RNG((WORLD.seed*91+c.id*37+n*13+7)>>>0),list=[];
  const types=rng.shuffle(['camp','hostage','delivery']);types.push(rng.pick(['camp','hostage','delivery']));
  types.forEach((type,i)=>{
    const q={id:c.id*1000+n*10+i,type,cityId:c.id,tier:rng.int(1,2),gang:rng.pick(GANGS),cargo:rng.pick(CARGO)};
    if(type==='delivery'){
      const others=WORLD.cities.filter(k=>k!==c).sort((a,b)=>qDist(b,c)-qDist(a,c));
      const dest=rng.pick(others.slice(0,Math.max(2,Math.ceil(others.length*0.7))));
      q.destId=dest.id;q.dist=Math.round(qDist(dest,c));q.reward=70+Math.round(q.dist*1.2)+rng.int(0,40);
    }else q.reward=(type==='camp'?110:150)+q.tier*80+c.rank*10+rng.int(0,50);
    list.push(q);
  });
  QUEST.boards[c.id]=list;return list;
}
function qTitle(q){
  return q.type==='camp'?'Acabar com os '+q.gang:q.type==='hostage'?'Resgatar um refém dos '+q.gang:'Entregar '+q.cargo+' em '+WORLD.cities[q.destId].name;
}
function qText(q,c){
  if(q.type==='camp')return 'O bando dos '+q.gang+' assalta viajantes perto de '+c.name+'. Encontre o acampamento (será marcado no mapa) e elimine todos os bandidos.';
  if(q.type==='hostage')return 'Os '+q.gang+' mantêm um refém numa jaula. Elimine os bandidos e abra a grade. Em vez de um soldado, você recebe a recompensa em ouro.';
  return 'Leve o pacote até '+WORLD.cities[q.destId].name+' ('+q.dist+' m). Bandidos podem emboscar você na estrada; dentro das cidades os guardas te protegem.';
}

// ---------- alvo da missão (para o mapa e o HUD) ----------
function questTarget(){
  const q=QUEST.active;if(!q)return null;
  if(q.type==='delivery'){const d=WORLD.cities[q.destId];return{x:d.cx,z:d.cz}}
  return q.camp?{x:q.camp.cx,z:q.camp.cz}:null;
}
function questLine(){
  const q=QUEST.active;if(!q)return '';
  const t=questTarget(),d=t?Math.round(Math.hypot(t.x-P.x,t.z-P.z)):0;
  let s='📜 '+(q.type==='delivery'?'Entrega → '+WORLD.cities[q.destId].name+' 📦':q.type==='camp'?'Bandidos dos '+q.gang+(q.camp?' ('+q.camp.aliveEnemies+')':''):'Refém dos '+q.gang);
  return '<br><span style="color:#ffe680">'+s+'<br>★ '+d+' m</span>';
}
function drawStar(ctx,x,y,r){
  ctx.save();ctx.translate(x,y);ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
  ctx.closePath();ctx.fillStyle='#ffd23a';ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}

// ---------- acampamento da missão ----------
function okQuestCamp(k,c,type,anyDist){
  if(k.ambush||k.gone||k.state==='cleared'||k.questTarget)return false;
  const d=qDist(k,c);if(d<c.half+20||(!anyDist&&d>c.half+110))return false;
  if(Math.hypot(k.cx-P.x,k.cz-P.z)<50)return false;
  if(type==='hostage'&&!(k.reward==='hostage'&&k.cage&&!k.cage.opened&&k.hostage&&k.hostage.alive))return false;
  return true;
}
// acampamento que sumiu (concluído) pode reaparecer antes de dois dias se uma missão precisar dele
function respawnQuestCamp(c,q){
  let best=null,bd=1e9;
  for(const k of WORLD.camps){
    if(!k.gone)continue;const d=qDist(k,c);
    if(d<c.half+20||Math.hypot(k.cx-P.x,k.cz-P.z)<60)continue;
    const sc=d>c.half+110?d+1000:d;if(sc<bd){bd=sc;best=k}
  }
  if(!best)return null;
  respawnCamp(best,{rank:q.tier,reward:q.type==='hostage'?'hostage':undefined});
  return best;
}
// ---------- aceitar / abandonar / concluir ----------
function acceptQuest(c,q){
  if(QUEST.active){toast('Você já tem uma missão ativa. Conclua ou abandone antes.',2500);return false}
  if(q.type==='camp'||q.type==='hostage'){
    let camp=WORLD.camps.find(k=>okQuestCamp(k,c,q.type));
    if(!camp)camp=respawnQuestCamp(c,q);
    if(!camp)camp=WORLD.camps.find(k=>okQuestCamp(k,c,q.type,true));
    if(!camp){toast('Nenhum local adequado para o acampamento foi encontrado. Tente outra missão.',3000);return false}
    camp.questTarget=true;camp.name='Acampamento dos '+q.gang;
    QUEST.active=Object.assign({},q,{camp,campId:camp.id});
  }else{
    QUEST.active=Object.assign({},q);QUEST.ambT=18+Math.random()*12;QUEST.ambCount=0;
  }
  const list=QUEST.boards[c.id];const i=list.findIndex(x=>x.id===q.id);if(i>=0)list.splice(i,1);
  if(!list.length){QUEST.counter[c.id]=(QUEST.counter[c.id]||0)+1;QUEST.boards[c.id]=null}
  toast('📜 Missão aceita: '+qTitle(q),4000);sfx('coin',0);return true;
}
function abandonQuest(){
  const q=QUEST.active;if(!q)return;
  if(q.camp)q.camp.questTarget=false;
  QUEST.active=null;toast('Missão abandonada.',2000);
}
function completeQuest(){
  const q=QUEST.active;if(!q)return;
  addCoins(q.reward);QUEST.done++;
  if(q.camp)q.camp.questTarget=false;
  QUEST.counter[q.cityId]=(QUEST.counter[q.cityId]||0)+1;QUEST.boards[q.cityId]=null;
  QUEST.active=null;sfx('win',0);toast('✅ Missão cumprida! +'+q.reward+' moedas',5000);
}
function failQuest(msg){
  const q=QUEST.active;if(!q)return;if(q.camp)q.camp.questTarget=false;
  QUEST.active=null;toast('❌ '+(msg||'Missão falhou.'),4000);
}
function questCampCleared(c){
  const q=QUEST.active;if(q&&q.type==='camp'&&q.campId===c.id)completeQuest();
}
function questHostageFreed(c){
  const q=QUEST.active;return !!(q&&q.type==='hostage'&&q.campId===c.id);
}

// ---------- atualização por frame ----------
function spawnAmbush(){
  const rng=new RNG((Math.random()*1e9)|0);
  for(let tries=0;tries<25;tries++){
    const a=rng.range(0,6.283),d=rng.range(26,36),x=P.x+Math.cos(a)*d,z=P.z+Math.sin(a)*d;
    if(x<12||z<12||x>W-12||z>W-12||tH(x,z)<SEA+0.5)continue;
    if(WORLD.cities.some(c=>Math.max(Math.abs(x-c.cx),Math.abs(z-c.cz))<c.half+14))continue;   // nunca dentro de cidades
    const area={kind:'camp',ambush:true,id:300+QUEST.ambSeq++,name:'Emboscada',cx:x,cz:z,y:tH(x,z),half:0,biome:B[Math.floor(z)*W+Math.floor(x)],rank:1,hpMul:1,state:'attacking',owner:'enemy',home:false,
      enemies:[],npcs:[],walk:[],flags:[],aliveEnemies:0,totalEnemies:0,leash:999};
    const n=rng.int(2,3);
    for(let i=0;i<n;i++){
      const e=spawnEnemy(area,(i===n-1&&rng.chance(0.4))?'hound':'soldier',x+rng.range(-3,3),z+rng.range(-3,3));
      e.def.reward=Math.round(e.def.reward*0.6);e.aggro=true;e.unseenT=99;e.reactT=0.9;
    }
    QUEST.ambushes.push(area);toast('⚠ Emboscada! Bandidos na estrada.',3000);sfx('alarm',0);return true;
  }
  return false;
}
function updateQuests(dt){
  const q=QUEST.active;
  if(q&&q.type==='delivery'){
    const d=WORLD.cities[q.destId];
    if(Math.max(Math.abs(P.x-d.cx),Math.abs(P.z-d.cz))<d.half+2&&!P.dead){toast('📦 Pacote entregue em '+d.name+'!',3000);completeQuest()}
    else{
      QUEST.ambT-=dt;
      const zone=WORLD.cities.find(k=>Math.max(Math.abs(P.x-k.cx),Math.abs(P.z-k.cz))<k.half+10);
      if(QUEST.ambT<=0){
        QUEST.ambT=22+Math.random()*20;
        if(!zone&&!P.dead&&QUEST.ambCount<4&&Math.random()<0.55&&spawnAmbush())QUEST.ambCount++;
      }
    }
  }
  // guardas das cidades abatem os bandidos de emboscada quando o jogador corre para uma cidade
  const zone=WORLD.cities.find(k=>Math.max(Math.abs(P.x-k.cx),Math.abs(P.z-k.cz))<k.half+10);
  for(let i=QUEST.ambushes.length-1;i>=0;i--){
    const area=QUEST.ambushes[i];let alive=0;
    for(const e of area.enemies){
      if(!e.alive)continue;alive++;
      const dp=Math.hypot(e.x-P.x,e.z-P.z);
      if(dp>130){e.alive=false;e.gone=true;scene.remove(e.group);area.aliveEnemies--;continue}
      if(zone&&dp<70){
        e.guardT=(e.guardT||0)+dt;
        if(e.guardT>0.9){
          const dx=e.x-zone.cx,dz=e.z-zone.cz,L=Math.hypot(dx,dz)||1;
          tracer(zone.cx+dx/L*zone.half,zone.y+3,zone.cz+dz/L*zone.half,e.x,e.y+1,e.z,0x9ad0ff);sfx('rifle',dp);
          e.def.reward=0;damageEnemy(e,9999,false,true);
          if(!QUEST.guardToast||G.t-QUEST.guardToast>6){toast('🛡 Os guardas da cidade abatem os bandidos!',2500);QUEST.guardToast=G.t}
        }
      }else e.guardT=0;
    }
    if(!alive&&!area.enemies.some(e=>e.alive))QUEST.ambushes.splice(i,1);
  }
}

// ---------- interface do quadro ----------
function openQuests(c){G.questCity=c;if(!QUEST.boards[c.id])genBoard(c);openPanel('quests');renderQuests()}
function renderQuests(){
  const c=G.questCity,list=QUEST.boards[c.id]||genBoard(c),a=QUEST.active;
  $('qinfo').textContent='Quadro de missões de '+c.name+'  •  missões cumpridas: '+QUEST.done;
  let h='';
  if(a)h+='<div class="card" style="border-color:#ffd23a;margin-bottom:10px"><b>📜 Missão ativa: '+qTitle(a)+'</b><div class="st">Recompensa ◉'+a.reward+'</div><button class="red" data-q="abandon">Abandonar</button></div>';
  h+='<div class="grid">'+list.map(q=>'<div class="card"><b>'+qTitle(q)+'</b><div class="st">'+qText(q,c)+'<br>Recompensa: <b style="color:#ffd23a">◉'+q.reward+'</b></div><button class="gold" data-q="'+q.id+'" '+(a?'disabled':'')+'>Aceitar</button></div>').join('')+'</div>';
  $('qbody').innerHTML=h;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('#qbody button');if(!b)return;
  if(b.dataset.q==='abandon')abandonQuest();
  else{const c=G.questCity,q=(QUEST.boards[c.id]||[]).find(x=>String(x.id)===b.dataset.q);if(q&&acceptQuest(c,q)){closePanel();return}}
  if(QUEST.boards[G.questCity.id]===null)genBoard(G.questCity);
  renderQuests();
});
