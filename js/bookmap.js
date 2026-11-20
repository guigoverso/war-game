'use strict';
// ---------- Aba Mapa do caderno: escolha de caravana no mapa e dicas do mouse sobre cidades e POIs ----------
// Separado de rounds.js.
// ---------- caravana: origem e destino escolhidos no mapa ----------
const MP={on:false,step:0,a:null};
const freeCityForRoute=()=>playerCities().some(c=>!hasRoute(c));   // para criar uma caravana, ao menos uma cidade sua precisa estar sem caravana
function startCaravanPick(){
  MP.on=true;MP.step=1;MP.a=null;
  openBook('map');   // a escolha de origem e destino acontece no mapa do caderno
}
function pickBannerText(){return MP.step===1?'🛒 <b>Caravana</b> — clique no mapa na cidade de <b>ORIGEM</b> (uma das suas). Feche o caderno (M ou E) para cancelar.':'🛒 Origem: <b>'+WORLD.cities[MP.a].name+'</b>. Agora clique na cidade de <b>DESTINO</b>. (clique de novo na origem para trocá-la)'}
function updatePickBanner(){if(mapOpen())renderBook()}   // o aviso da escolha de caravana fica na página do mapa
// página do caderno para a aba Mapa: o mapa ocupa as duas páginas (sem legenda); na escolha de caravana o aviso fica em cima
function mapPages(){
  const h=Math.min(620,innerHeight*0.84),sz=Math.max(260,Math.floor(Math.min(h-72-(MP.on?52:0),Math.min(960,innerWidth*0.86)-70)));
  return[(MP.on?'<div class="mpick">'+pickBannerText()+'</div>':'')+'<canvas id="bigmap" width="'+sz+'" height="'+sz+'"></canvas><div style="text-align:right;margin-top:4px">'+(G.poiFocus!=null&&STATE.pol&&STATE.pol.pending?'<button class="gold" id="mapback" style="float:left">↩ Voltar ao evento</button>':'')+'<button class="alt" id="mapnames">🏷 Nomes dos POIs: '+(G.poiNames?'ligado':'desligado')+'</button></div>',''];
}
function drawPickOverlay(g,s){
  if(!MP.on)return;
  for(const c of WORLD.cities){
    const ok=!c.rebel&&(MP.step===1?(c.owner==='player'&&!hasRoute(c)):(c.id!==MP.a&&!hasRoute(c)&&(c.owner==='player'||facTradeOK(c.fid))&&!poiRouteBlocked({a:MP.a,b:c.id})));
    g.strokeStyle=c.id===MP.a?'#5aff7a':ok?'#ffd23a':'#555';g.lineWidth=c.id===MP.a?5:3;
    g.beginPath();g.arc(c.cx*s,c.cz*s,16,0,6.283);g.stroke();
    if(c.rebel){const x=c.cx*s,y=c.cz*s;g.strokeStyle='#ff2a2a';g.lineWidth=4;g.beginPath();g.arc(x,y,16,0,6.283);g.moveTo(x-8,y-8);g.lineTo(x+8,y+8);g.moveTo(x+8,y-8);g.lineTo(x-8,y+8);g.stroke()}   // cidade em rebelião: círculo vermelho com X (sem caravana)
  }
  if(MP.a!==null){const A=WORLD.cities[MP.a];g.strokeStyle='#5aff7a';g.setLineDash([6,5]);g.lineWidth=2;g.beginPath();g.moveTo(A.cx*s,A.cz*s);if(MP.hover!==undefined){const B=WORLD.cities[MP.hover];g.lineTo(B.cx*s,B.cz*s)}g.stroke();g.setLineDash([])}
}
// o mouse sobre uma cidade do mapa grande mostra a facção dona
(function(){
  let tip=null;const hide=()=>{if(tip)tip.style.display='none'};
  document.addEventListener('mousemove',e=>{
    const c=mapOpen()&&e.target&&e.target.id==='bigmap'?pickCityAt(e):null;
    if(!c){   // sem cidade sob o mouse: talvez um POI (nome e dono)
      const q=mapOpen()&&e.target&&e.target.id==='bigmap'?pickPoiAt(e):null;if(!q){hide();return}
      if(!tip){tip=document.createElement('div');tip.className='uitip';document.body.appendChild(tip)}
      tip.textContent=POI_DEFS[q.type].ic+' '+POI_DEFS[q.type].n+'\nDomínio: '+poiOwnerName(q.owner);tip.style.display='block';tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';return;
    }
    const f=facOf(c.fid);if(!tip){tip=document.createElement('div');tip.className='uitip';document.body.appendChild(tip)}
    tip.textContent=c.rebel?c.name+'\nProdução: '+typeLabel(c)+'\nFacção: Rebeldes (em rebelião)'+(G.creative&&rebS().cur?'\n'+rebSidesTxt(rebS().cur):''):c.name+'\nProdução: '+typeLabel(c)+'\nFacção: '+(f?f.name:'—')+(G.creative&&f&&f.temper?' ('+facTemperName(f)+')':'')+(f&&!f.player?'\nRelação: '+REL_ST[relStatus(c.fid)].n+' ('+relOf(c.fid).v+'/10)':'');
    tip.style.display='block';tip.style.left=(e.clientX+14)+'px';tip.style.top=(e.clientY+14)+'px';
  });
  document.addEventListener('keydown',hide);document.addEventListener('click',hide);
})();
function pickPoiAt(e){
  const cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W;
  const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
  let best=null,bd=14;for(const p of WORLD.pois||[]){if(p.type==='ruins'||!poiVisible(p))continue;const d=Math.hypot(p.cx*s-x,p.cz*s-y);if(d<bd){bd=d;best=p}}
  return best;
}
document.addEventListener('click',e=>{if(e.target&&e.target.id==='mapnames'){G.poiNames=!G.poiNames;renderBook()}});   // botão: nomes dos POIs no mapa (desligado por padrão)
function pickCityAt(e){
  const cv=document.getElementById('bigmap'),r=cv.getBoundingClientRect(),s=cv.width/W;
  const x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;
  let best=null,bd=26;for(const c of WORLD.cities){const d=Math.hypot(c.cx*s-x,c.cz*s-y);if(d<bd){bd=d;best=c}}
  return best;
}
document.addEventListener('click',e=>{
  if(!MP.on||!mapOpen()||e.target.id!=='bigmap')return;
  const c=pickCityAt(e);if(!c)return;
  if(MP.step===1){
    if(c.owner!=='player'){toast('A origem precisa ser uma cidade sua.',2000);return}
    if(hasRoute(c)){toast(c.name+' já tem uma caravana ativa (uma por cidade).',2500);return}
    MP.a=c.id;MP.step=2;drawBigMap();updatePickBanner();return;
  }
  if(c.id===MP.a){MP.a=null;MP.step=1;drawBigMap();updatePickBanner();return}
  const A=WORLD.cities[MP.a];
  if(hasRoute(c)){toast(c.name+' já tem uma caravana ativa (uma por cidade).',2500);return}
  if(c.rebel){toast(c.name+' está em rebelião: não há caravana para lá.',3000);return}
  if(c.owner!=='player'&&!facTradeOK(c.fid)){toast('Sem comércio com '+facOf(c.fid).name+': ela é inimiga ou está em guerra com você.',3000);return}
  if(poiRouteBlocked({a:A.id,b:c.id})){toast('Um Entreposto inimigo (ou seu, contra o inimigo) impede essa rota.',3000);return}
  dealSummary(A,c,()=>{MP.on=false;updatePickBanner();buyCaravan(A,c);openBook('book','caravanas')});
});
document.addEventListener('mousemove',e=>{
  if(!MP.on||MP.step!==2||!mapOpen()||e.target.id!=='bigmap')return;
  const c=pickCityAt(e),h=c&&c.id!==MP.a?c.id:undefined;if(h!==MP.hover){MP.hover=h;drawBigMap()}
});
