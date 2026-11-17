'use strict';
// ---------- Cenário controlado: caravanas (abra com ?cenario=caravanas) ----------
// Um mundo fixo (semente 11) já montado para testar caravanas, guardas e relações sem jogar rodadas:
//  • você tem 3 cidades (a capital e 2 conquistadas) e ◉20000, relíquias e 3 ações do líder por rodada;
//  • há 3 rotas de caravana, cada uma com uma facção NPC diferente: aliada (Relação 10), favorável (9) e neutra (5);
//  • o jogador começa de frente para uma caravana de NPC, de dia, no turno do comandante. Modo criativo ligado.
// Na pausa (Tab) → aba 🏴 Facções aparecem botões para ir até cada caravana. Nada daqui roda no jogo normal.
const SCN={on:false,routes:[]};
function scenarioApply(){
  if(new URLSearchParams(location.search).get('cenario')==='rebeliao'){rebScenario();return}   // cenário da rebelião de cidade NPC (rebellion.js)
  if(new URLSearchParams(location.search).get('cenario')!=='caravanas')return;
  SCN.on=true;G.introBook=false;STATE.phase='commander';STATE.round=1;P.coins=20000;
  facSetIdentity({name:'Cenário de caravanas'});
  // 2 cidades conquistadas: as de menor rank, de facções com 3 ou mais cidades (sobram as outras facções como parceiras)
  const npc=()=>WORLD.cities.filter(c=>c.owner==='enemy').sort((a,b)=>a.rank-b.rank),count=f=>npc().filter(c=>c.fid===f).length;
  const mine=[WORLD.home];
  for(let k=0;k<2;k++){
    const pool=npc(),c=pool.find(x=>count(x.fid)>=2)||pool[0];
    polTakeCity(c);mine.push(c);
  }
  // uma rota por cidade sua, cada uma com uma facção NPC diferente (e com recursos de foco diferentes, para a caravana fazer sentido)
  const used=new Set();STATE.rd.routes=[];SCN.routes=[];
  for(const A of mine){
    const B=npc().find(c=>!used.has(c.fid))||npc().find(c=>!STATE.rd.routes.some(r=>r.b===c.id));if(!B)break;
    used.add(B.fid);
    if(focusOf(A)===focusOf(B)){const nf=NEEDS.find(r=>r!==focusOf(A)),e=ec(B);e.type=nf;e.pf=nf;rerollNeeds(B)}
    STATE.rd.routes.push({a:A.id,b:B.id});SCN.routes.push({a:A.id,b:B.id});
  }
  // relações: aliada, favorável e neutra (nessa ordem)
  [[10,true],[9,false],[5,false]].forEach(([v,ally],i)=>{const r=SCN.routes[i];if(!r)return;const o=relOf(WORLD.cities[r.b].fid);Object.assign(o,{v,ally,war:false,debt:null,warAt:null,acts:null,seenV:v});o.lastRd=STATE.round});
  STATE.rd.lvl=3;STATE.rd.actions=maxActions();invGive([['reliquia',2]]);computeBuffs();   // capital nível 3: 3 ações do líder por rodada
}
// depois que as caravanas foram construídas: põe o jogador de frente para a primeira caravana de NPC
function scenarioAfter(){
  if(typeof REBSCN!=='undefined'&&REBSCN.on){rebScenarioAfter();return}
  if(!SCN.on)return;
  const i=CARAVANS.findIndex(c=>c.city.owner==='enemy');scenarioGo(i>=0?i:0,true);
  toast('🧪 Cenário de caravanas: 3 rotas (aliada, favorável e neutra). Pausa (Tab) → Facções → "Ir até a caravana". Atire nos guardas de uma caravana de NPC para ver o crime.',9000);
}
function scenarioGo(i,keep){
  const car=CARAVANS[i];if(!car)return;
  const f=freeSpot(car.x+Math.sin(car.yaw)*13,car.z+Math.cos(car.yaw)*13,0.5,1.8,0.45);
  P.x=f[0];P.z=f[1];P.y=tH(P.x,P.z)+0.1;P.vx=P.vz=P.vy=0;P.camY=P.y;P.yaw=Math.atan2(-(car.x-P.x),-(car.z-P.z));P.pitch=-0.05;
  if(!keep)closePanel();
}
// botões do cenário (aparecem no topo da aba Facções da pausa)
function scenarioHtml(){
  if(typeof REBSCN!=='undefined'&&REBSCN.on)return rebScenarioHtml();
  if(!SCN.on)return '';
  const rows=CARAVANS.map((car,i)=>{
    const mineC=car.city.owner==='player',f=facOf(car.city.fid),st=mineC?'sua':REL_ST[relStatus(car.city.fid)].n,col=hex6(FAC_COLORS[f.color].c);
    return '<div style="margin:4px 0"><i style="color:'+col+';font-style:normal">■</i> <b>'+car.city.name+'</b> <small>('+f.name+' • '+st+(car.guards.length?' • '+car.guards.length+' guardas':'')+')</small> <button class="alt" data-scn="'+i+'">Ir até a caravana</button></div>';
  }).join('');
  return '<p class="ptitle">🧪 Cenário de caravanas</p><p class="ldsm" style="margin:2px 0 4px">Caravanas do jogador (sua) e de NPCs. Atire nos guardas de uma caravana de NPC para testar o crime; a aliada (relação 10) cai para inimiga e o pedido de reparação aparece no turno do líder.</p>'+rows+'<button class="alt" data-scn="reload">↻ Recomeçar o cenário</button><hr style="border-color:#444">';
}
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-scn]');if(!b)return;
  if(b.dataset.scn==='reload')location.reload();else scenarioGo(+b.dataset.scn);
});
