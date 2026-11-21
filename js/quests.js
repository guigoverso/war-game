'use strict';
// ---------- Missões: peças compartilhadas (a lógica das missões está em missions.js) ----------
// Aqui ficam o que as missões usam do mundo: nomes de bandos, cargas, escolha/respawn de acampamentos e as emboscadas de entrega.
const QUEST={ambushes:[],ambT:0,ambCount:0,ambSeq:0};   // só estado de execução (emboscadas durante entregas); as missões ficam em STATE.ms
const GANGS=['Corvos Negros','Lobos Cinzentos','Víboras do Vale','Salteadores da Estrada','Punhos de Ferro','Sombras da Mata','Chacais','Abutres','Lâminas Rubras','Cães Selvagens'];
const CARGO=['uma carta lacrada','uma caixa de remédios','uma encomenda de ferramentas','um saco de sementes raras','uma relíquia da capela','um baú de documentos','um barril de vinho'];

function qDist(a,b){return Math.hypot(a.cx-b.cx,a.cz-b.cz)}
function drawStar(ctx,x,y,r,col){
  ctx.save();ctx.translate(x,y);ctx.beginPath();
  for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*0.45:r;ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr)}
  ctx.closePath();ctx.fillStyle=col||'#ffd23a';ctx.fill();ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.stroke();ctx.restore();
}

// "?" laranja: ponto de interesse marcado pela vigia da torre (minimapa e mapa grande)
function drawQuery(ctx,x,y,r){
  ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fillStyle='#ff9a2a';ctx.fill();
  ctx.strokeStyle='#000';ctx.lineWidth=2;ctx.stroke();
  ctx.fillStyle='#000';ctx.font='bold '+Math.round(r*1.4)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('?',0,1);ctx.restore();
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

// ---------- emboscadas durante entregas ----------
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
// guardas das cidades abatem os bandidos de emboscada quando o jogador corre para uma cidade (chamado por updateQuests em missions.js)
function updateAmbushes(dt){
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
