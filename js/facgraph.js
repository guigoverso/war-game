'use strict';
// ---------- F3: relações entre as facções NPC ----------
// Cada par de facções NPC tem um valor de 0 a 10 (mesma escala das suas relações). O valor inicial vem da SEMENTE (temperamento + vizinhança);
// só o que mudou fica salvo em STATE.frel (ausente = valor inicial). Aqui também: propagação das suas ações, deriva por rodada,
// as caravanas entre cidades NPC e a aba "Diplomacia" do livro. Nada disso mexe em preços (decisão do jogador).
const FG={allyMin:8,rivalMax:3,propStep:1,propCap:2,driftEvery:2,logMax:40};   // aliada = valor ≥ 8 • rival = valor ≤ 3 • propagação fixa de 1, no máximo ±2 por facção por rodada
const FG_TP={pacifica:2,neutra:0,agressiva:-2};   // peso do temperamento no valor inicial
const FG_COL={ally:'#1a7aa8',fav:'#2a8a2a',neutral:'#6a5a3a',unfav:'#b86a10',enemy:'#b02a2a'};   // cores legíveis no papel do livro
const FG_NAME={ally:'Aliadas',fav:'Amistosas',neutral:'Neutras',unfav:'Rivais',enemy:'Inimigas'};
Hooks.on('resetState',()=>{STATE.frel={};STATE.flog=[]});
const fgKey=(a,b)=>a<b?a+'-'+b:b+'-'+a;
const fgSt=v=>v>=10?'ally':v>=8?'fav':v>=4?'neutral':v>=1?'unfav':'enemy';
// vizinhança: a facção mais próxima (pela menor distância entre cidades de origem) de cada uma; o par é "vizinho" se uma for a mais próxima da outra
let FG_CACHE=null;
function fgCache(){
  if(FG_CACHE&&FG_CACHE.w===WORLD&&FG_CACHE.n===WORLD.factions.length)return FG_CACHE;
  const fs=WORLD.factions,dm={},near={};
  for(const a of fs)for(const b of fs){if(a.id>=b.id)continue;let d=1e9;
    for(const x of WORLD.cities)if(x.ofid===a.id)for(const y of WORLD.cities)if(y.ofid===b.id)d=Math.min(d,Math.hypot(x.cx-y.cx,x.cz-y.cz));
    dm[fgKey(a.id,b.id)]=d}
  for(const a of fs){let best=null,bd=1e9;for(const b of fs){if(a===b)continue;const d=dm[fgKey(a.id,b.id)];if(d<bd){bd=d;best=b.id}}near[a.id]=best}
  return FG_CACHE={w:WORLD,n:fs.length,near,init:{}};
}
// valor-alvo do par (só temperamento e vizinhança): é para onde a deriva puxa
function fgTarget(a,b){
  const fa=facOf(a),fb=facOf(b),C=fgCache(),nb=C.near[a]===b||C.near[b]===a;
  let v=Math.round(5+(FG_TP[fa.temper]+FG_TP[fb.temper])*(nb?1.25:0.5));
  if(fa.temper==='agressiva'||fb.temper==='agressiva'){v=Math.min(v,7);if(nb)v=Math.min(v,3)}   // agressiva nunca é amistosa e é rival da vizinha
  return Math.max(1,Math.min(9,v));
}
function fgInit(a,b){
  const C=fgCache(),k=fgKey(a,b);if(C.init[k]!==undefined)return C.init[k];
  const rng=new RNG((WORLD.seed*97+Math.min(a,b)*31+Math.max(a,b)*17+5)>>>0);
  let v=fgTarget(a,b)+rng.int(-1,1);
  const fa=facOf(a),fb=facOf(b);if(fa.temper==='agressiva'||fb.temper==='agressiva')v=Math.min(v,7);
  return C.init[k]=Math.max(1,Math.min(9,v));   // começa sem guerra e sem aliança formal (0 e 10 só vêm depois)
}
function fgV(a,b){if(a===b)return 10;const o=(STATE.frel||{})[fgKey(a,b)];return o?o.v:fgInit(a,b)}
function fgSet(a,b,v,why){
  const k=fgKey(a,b),old=fgV(a,b);v=Math.max(0,Math.min(10,v));if(v===old)return;
  (STATE.frel||(STATE.frel={}))[k]={v,rd:STATE.round};
  fgLog(facOf(a).name+' × '+facOf(b).name+': '+old+' → '+v+(why?' ('+why+')':''));
}
function fgLog(txt){const L=STATE.flog||(STATE.flog=[]);L.push({round:STATE.round,txt});while(L.length>FG.logMax)L.shift()}
const fgPairs=()=>{const fs=WORLD.factions||[],out=[];for(let i=0;i<fs.length;i++)for(let j=i+1;j<fs.length;j++)out.push([fs[i],fs[j]]);return out};

// ---------- propagação: o que você faz com uma facção chega às aliadas e rivais dela ----------
// Valores fixos: quando sua relação com X muda, as aliadas de X mudam no mesmo sentido e as rivais de X no sentido oposto (1 ponto), sem multiplicador de temperamento.
const FGP={busy:false};
function fgPropagate(fid,d,why){
  if(FGP.busy||!d||!fid||!WORLD.factions||WORLD.factions.length<2)return;
  const s=Math.sign(d),parts=[];FGP.busy=true;
  try{
    for(const o of WORLD.factions){
      if(o.id===fid)continue;
      const v=fgV(fid,o.id),delta=(v>=FG.allyMin?s:v<=FG.rivalMax?-s:0)*FG.propStep;if(!delta)continue;
      const r=relOf(o.id);if(r.war)continue;
      const g=r.prop&&r.prop.round===STATE.round?r.prop:(r.prop={round:STATE.round,n:0});
      if(Math.abs(g.n+delta)>FG.propCap){parts.push(o.name+' (limite da rodada)');continue}
      const before=relStatus(o.id);r.v=Math.max(0,Math.min(REL_MAX,r.v+delta));if(r.ally&&r.v<REL_MAX)r.ally=false;g.n+=delta;
      relEffects(o.id,before,relStatus(o.id));
      parts.push(o.name+' ('+(v>=FG.allyMin?'aliada':'rival')+' de '+facOf(fid).name+') '+(delta>0?'+':'')+delta+' → '+r.v+'/10');
    }
  }finally{FGP.busy=false}
  if(parts.length)fgLog('Você '+(d>0?'+':'')+d+' com '+facOf(fid).name+' ['+(why||'ação')+'] ⇒ '+parts.join('; '));
}

// ---------- por rodada: deriva e caravanas entre NPC ----------
Hooks.on('round',()=>{
  if(!WORLD.factions||!WORLD.factions.length)return;
  if(STATE.round%FG.driftEvery===0)for(const [a,b] of fgPairs()){const v=fgV(a.id,b.id),t=fgTarget(a.id,b.id);if(v!==t&&v>0&&v<10)fgSet(a.id,b.id,v+Math.sign(t-v),'deriva')}
  fgNpcRoutes();
});
const fgRoutes=()=>{const rd=STATE.rd;return rd.nroutes||(rd.nroutes=[])};
const fgSameRoute=(r,A,B)=>(r.a===A.id&&r.b===B.id)||(r.a===B.id&&r.b===A.id);
const fgTrade=(A,B)=>A.fid===B.fid||fgV(A.fid,B.fid)>=1;   // facções inimigas entre si não comerciam
// uma caravana NPC nova por rodada. Pesos, nesta ordem: necessidades -> aliança -> relações
const fgGt=(a,b)=>{for(let k=0;k<a.length;k++)if(a[k]!==b[k])return a[k]>b[k];return false};   // comparação em ordem de prioridade
function fgPickRoute(){
  const npc=WORLD.cities.filter(c=>c.owner!=='player'&&c.fid&&!hasRoute(c)&&ec(c)),res=c=>NEEDS.includes(focusOf(c))?focusOf(c):null;
  let best=null,bk=null;
  for(let i=0;i<npc.length;i++)for(let j=i+1;j<npc.length;j++){
    const A=npc[i],B=npc[j];
    if(focusOf(A)===focusOf(B)||!fgTrade(A,B)||polFlag('noRoute',A.id)||polFlag('noRoute',B.id))continue;
    const need=(res(B)?needOf(A,res(B)):0)+(res(A)?needOf(B,res(A)):0);   // 1) necessidades: quanto cada uma precisa do que a outra produz
    const v=A.fid===B.fid?10:fgV(A.fid,B.fid),ali=A.fid===B.fid?3:v>=10?2:v>=FG.allyMin?1:0;   // 2) aliança (mesma facção > aliadas > amistosas)  3) relação
    const key=[need,ali,v,-(A.id+B.id)];
    if(!bk||fgGt(key,bk)){best=[A,B];bk=key}
  }
  return best;
}
function fgNpcRoutes(){
  const rd=STATE.rd,R=fgRoutes();let changed=false;
  for(let i=R.length-1;i>=0;i--){const A=WORLD.cities[R[i].a],B=WORLD.cities[R[i].b];if(A.owner==='player'||B.owner==='player'||!fgTrade(A,B)){R.splice(i,1);changed=true}}   // cidade tomada ou facções inimigas: a rota acaba
  if(STATE.round>=1){
    const p=fgPickRoute();
    if(p){R.push({a:p[0].id,b:p[1].id,npc:true});changed=true;rd.report&&rd.report.push('🛒 Uma caravana saiu entre '+p[0].name+' ('+facOf(p[0].fid).name+') e '+p[1].name+' ('+facOf(p[1].fid).name+').')}
  }
  if(changed&&typeof rebuildCaravans==='function')rebuildCaravans();
}

// ---------- livro: aba Diplomacia (diagrama de cordas) ----------
// Todas as facções (você incluída) num círculo; cada corda é a relação do par (cor = status). Passar o mouse numa facção apaga as outras cordas;
// clicar mostra, na página da direita, as relações dela com cada facção e as caravanas dela.
const FGUI={sel:null,hov:null,nodes:[]};
const FG_LINE={ally:'#3a8aff',fav:'#35b035',neutral:'#e0b82a',unfav:'#e8802a',enemy:'#d02a2a'};
const fgChip=id=>{const c=facColor(id);return '<i style="color:'+(c!=null?hex6(c):'#888')+';font-style:normal">■</i>'};
const fgChipName=id=>fgChip(id)+' <b>'+facOf(id).name+'</b>';
// status entre duas facções (0 = você): com você vale a relação do jogo; entre NPC, o grafo
function fgPairSt(a,b){
  if(a===0||b===0){const s=relStatus(a===0?b:a);return s==='war'?'enemy':s}
  return fgSt(fgV(a,b));
}
const fgPairV=(a,b)=>a===0||b===0?relOf(a===0?b:a).v:fgV(a,b);
function fgIds(){return [0].concat((WORLD.factions||[]).map(f=>f.id))}
function fgRoutesOf(id){   // rotas com cidades da facção (a sua inclui as rotas do jogador)
  const all=STATE.rd.routes.concat(STATE.rd.nroutes||[]);
  return id===null?all:all.filter(r=>WORLD.cities[r.a].fid===id||WORLD.cities[r.b].fid===id);
}
// [cor] Cidade [produto] <-> [produto] Cidade [cor]
function fgRouteTxt(r){
  const A=WORLD.cities[r.a],B=WORLD.cities[r.b],ic=c=>NEEDS.includes(focusOf(c))||focusOf(c)==='gold'?resIcon(focusOf(c)):'';
  return fgChip(A.fid)+' '+A.name+' '+ic(A)+' &lt;-&gt; '+ic(B)+' '+B.name+' '+fgChip(B.fid);
}
function fgDetailHtml(){
  const id=FGUI.sel;
  if(id===null||id===undefined){
    const rows=fgRoutesOf(null).map(r=>'<li>'+fgRouteTxt(r)+'</li>').join('');
    return '<h3>Caravanas</h3><p class="ldsm">Clique numa facção para ver as relações e as caravanas dela. Uma caravana nova entre facções por rodada: necessidades, depois aliança, depois relação.</p>'+(rows?'<ul class="ldul">'+rows+'</ul>':'<p class="ldsm">Nenhuma caravana.</p>');
  }
  const f=facOf(id),rel=fgIds().filter(x=>x!==id).map(g=>{const st=fgPairSt(id,g);
    return '<li>'+fgChipName(g)+(g===0?' (você)':'')+' — <span style="color:'+FG_COL[st]+'">'+FG_NAME[st]+'</span>'+(G.creative?' <small>('+fgPairV(id,g)+'/10)</small>':'')+'</li>'}).join('');
  const rt=fgRoutesOf(id).map(r=>'<li>'+fgRouteTxt(r)+'</li>').join('');
  return '<h3>'+fgChipName(id)+'</h3><p class="ldsm">'+(id===0?'Sua facção':facCities(id).length+' cidade(s)'+(G.creative&&f.temper?' • '+facTemperName(f):''))+'</p>'
    +'<h4>Relações</h4><ul class="ldul">'+rows0(rel)+'</ul><h4>Caravanas</h4>'+(rt?'<ul class="ldul">'+rt+'</ul>':'<p class="ldsm">Nenhuma.</p>');
}
const rows0=s=>s||'<li>—</li>';
function fgBookPages(){
  const leg=Object.keys(FG_LINE).map(k=>'<span style="color:'+FG_LINE[k]+'">■</span> '+FG_NAME[k]).join(' &nbsp; ');
  const L='<h3>Diplomacia</h3><p class="ldsm">Passe o mouse sobre uma facção para destacar as relações dela; clique para ver os detalhes ao lado.</p>'
    +'<canvas id="fgcv" width="300" height="300" style="width:100%;max-width:300px;display:block;margin:0 auto;cursor:pointer"></canvas>'
    +'<p id="fgname" class="ldsm" style="text-align:center;min-height:20px"></p><p class="ldsm" style="text-align:center">'+leg+'</p>';
  return[L,fgDetailHtml()];
}
function fgDraw(){
  const cv=document.getElementById('fgcv');if(!cv)return;
  const g=cv.getContext('2d'),S=cv.width,C=S/2,R=C-34,ids=fgIds(),n=ids.length,focus=FGUI.hov!==null?FGUI.hov:FGUI.sel;
  FGUI.nodes=ids.map((id,i)=>{const a=-Math.PI/2+i/n*Math.PI*2;return{id,x:C+Math.cos(a)*R,y:C+Math.sin(a)*R}});
  g.clearRect(0,0,S,S);g.imageSmoothingEnabled=false;
  const pos=id=>FGUI.nodes.find(p=>p.id===id);
  for(const pass of[0,1]){   // primeiro as cordas apagadas, depois as em foco
    for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){
      const a=ids[i],b=ids[j],on=focus===null||focus===undefined||a===focus||b===focus;if((pass===1)!==on)continue;
      const p=pos(a),q=pos(b);g.globalAlpha=on?1:0.1;g.strokeStyle=FG_LINE[fgPairSt(a,b)];g.lineWidth=on&&focus!=null?3:2;
      g.beginPath();g.moveTo(p.x,p.y);g.lineTo(q.x,q.y);g.stroke();
    }
  }
  g.globalAlpha=1;
  for(const p of FGUI.nodes){
    const hot=p.id===FGUI.hov||p.id===FGUI.sel;
    g.fillStyle='#2a2018';g.strokeStyle=hot?'#fff':'#000';g.lineWidth=hot?4:2;g.beginPath();g.arc(p.x,p.y,21,0,6.283);g.fill();g.stroke();
    g.save();g.beginPath();g.arc(p.x,p.y,19,0,6.283);g.clip();
    g.fillStyle=hex6(facColor(p.id)||0x888888);g.fillRect(p.x-20,p.y-20,40,40);
    g.drawImage(facFlagCanvas(p.id,1),p.x-16,p.y-10,32,20);g.restore();
  }
  const nm=document.getElementById('fgname');if(nm){const id=FGUI.hov!==null?FGUI.hov:FGUI.sel;nm.innerHTML=id===null||id===undefined?'':fgChipName(id)+(id===0?' (você)':'')}
}
function fgSetup(){   // chamado por renderBook quando a aba Diplomacia aparece
  const cv=document.getElementById('fgcv');if(!cv)return;
  const at=e=>{const r=cv.getBoundingClientRect(),x=(e.clientX-r.left)*cv.width/r.width,y=(e.clientY-r.top)*cv.height/r.height;const p=FGUI.nodes.find(q=>Math.hypot(q.x-x,q.y-y)<23);return p?p.id:null};
  cv.onmousemove=e=>{const id=at(e);if(id!==FGUI.hov){FGUI.hov=id;fgDraw()}};
  cv.onmouseleave=()=>{FGUI.hov=null;fgDraw()};
  cv.onclick=e=>{const id=at(e);FGUI.sel=id===null?FGUI.sel:(FGUI.sel===id?null:id);$('ldR').innerHTML=fgDetailHtml();fgDraw()};
  fgDraw();
}
// ---------- modo criativo: relatório da propagação ----------
function fgCheatHtml(){
  const fs=WORLD.factions||[];if(fs.length<2)return '';
  const grid=fgPairs().map(([a,b])=>a.name+' × '+b.name+': <b>'+fgV(a.id,b.id)+'/10</b> ('+FG_NAME[fgSt(fgV(a.id,b.id))].toLowerCase()+')').join('<br>');
  const log=(STATE.flog||[]).slice(-12).reverse().map(e=>'r'+e.round+': '+e.txt).join('<br>');
  return '<h4 style="margin:12px 0 4px">Relações entre as facções NPC</h4><small>'+grid+'</small><h4 style="margin:12px 0 4px">Relatório de propagação</h4><small>'+(log||'Nada ainda.')+'</small>'+(typeof fsupCheatHtml==='function'?fsupCheatHtml():'');
}
